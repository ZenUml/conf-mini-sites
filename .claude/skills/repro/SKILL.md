---
name: repro
description: >
  Reproduce a bug in Conf Mini-Sites. Extract the bug from the current conversation
  or user prompt, then reproduce it in the SIMPLEST environment that exercises the
  affected code path. Use when the user says "repro", "reproduce", "can you repro this",
  "reproduce the bug", "verify this bug", or describes a bug they want confirmed.
  Try environments in strict order: a unit/integration test first, then local
  `wrangler dev`, then the deployed dev Workers via curl, then a real Confluence page
  as last resort.
---

# Repro Skill

Reproduce a bug by gathering context from the conversation and exercising the *cheapest* environment that can trigger it. The whole point is to capture the failure signal at the lowest layer possible — a millisecond unit test beats a multi-minute browser run.

## Step 1 — Extract the Bug

Read the conversation and/or the user's prompt to identify:

- **Trigger** — the exact action(s) that cause the bug (which endpoint, which bundle shape, which macro state, which grant)
- **Observed** — what actually happens (wrong status, wrong header, blank render, leaked secret, wrong file served)
- **Expected** — what should happen instead
- **Component** — which part of the stack: bundle validation / secret scan / provisioning / grant mint or verify / dispatch serve / `<base>` injection / CSP / resolver / Custom UI

If key details are missing, ask one focused question before proceeding.

## Step 2 — Choose the Right Environment

Pick the simplest environment that exercises the affected code path:

| Bug area | First try |
|---|---|
| Bundle validation, secret scan, grant mint/verify, `<base>` injection, route parsing, CSP header construction, instance store | **Unit/integration test** (`vitest`) — these are pure functions over injected deps |
| Control/dispatch Worker request handling end-to-end (auth, routing, status codes) | **Local `wrangler dev`** against the relevant Worker |
| Provision → serve → lifecycle against real Cloudflare (WfP namespace, real grant) | **Deployed dev Workers** via `curl` / the E2E api helpers |
| The rendered macro on a page, the Forge Custom UI, the nested dispatch iframe, CSP-in-Forge embedding | **Real Confluence page** (forge-tunnel or deployed) |

When in doubt, start at the top of the table. Most CMS logic is pure and unit-testable — if you can repro a bug as a failing `vitest` case, that IS the regression test (see the **equivalent-low-cost-test** skill).

## Step 3 — Environment Priority Order

### A. Unit / integration test (`vitest`) — cheapest, try first

Most of the backend is composition over injected deps (a fake `HostingProvider`, a real HMAC key, an injected clock) — no Worker runtime, no cloud. The existing `src/**/*.test.ts` files are the template: `grant.test.ts`, `gateway.test.ts` / `forgeGateway.test.ts`, `bundleValidation.test.ts`, `secretScan.test.ts`, `provision.test.ts`, `reconcile.test.ts`, the store contract tests.

```bash
pnpm test            # full run (vitest run)
pnpm test:watch      # iterate on one file
```

Write a failing test that encodes the trigger (the bad bundle, the tampered grant, the unknown instance, the wrong route). If it goes red, the bug is reproduced at the cheapest layer — fix it, watch it go green, keep the test.

### B. Local `wrangler dev`

For request-handling bugs that need the real Worker fetch path (status codes, headers, routing) but not real Cloudflare provisioning. Run the relevant Worker locally:

```bash
npx wrangler dev --config wrangler-dispatch.toml   # dispatch (serve gateway)
# or
npx wrangler dev --config wrangler-remote.toml     # control (provisioner)
```

Then `curl` the local URL. For the dispatch Worker, only a valid `/v/<id>/g/<grant>/…` serve URL is routable (everything else 404s by design) — mint a grant against the same `K_GRANT` to exercise the serve path. **`K_GRANT` must match between the two Workers** (control mints, dispatch verifies); a skew fails closed to 401 and is itself a common "bug" to rule out.

### C. Deployed dev Workers (curl / E2E api helpers)

For bugs that need real Cloudflare — actual WfP provisioning, a real per-instance Worker, the real dispatch-namespace binding, edge behavior (e.g. the >2min delete-lag at the dispatch edge). Hit the deployed dev stack the same way the resolver does (shared-secret auth):

```bash
set -a; source .env.forge.local; set +a   # CONTROL_SHARED_SECRET, etc. (empty in repo — fill locally)
# publish:
curl -s -X POST "https://conf-mini-sites-remote-dev.zenuml.workers.dev/publish?instanceId=$ID" \
  -H "content-type: application/json" -H "x-mini-sites-secret: $CONTROL_SHARED_SECRET" \
  -d '{"files":[...]}'
# mint a grant → serve URL:
curl -s -X POST "https://conf-mini-sites-remote-dev.zenuml.workers.dev/serve-url?instanceId=$ID&cloudId=bc8bb5b3-09d2-4932-b68c-9b56fab8e34a" \
  -H "x-mini-sites-secret: $CONTROL_SHARED_SECRET"
# serve it:
curl -s "https://conf-mini-sites-dispatch-dev.zenuml.workers.dev/v/$ID/g/<grant>/"
```

The helpers in `tests/e2e/helpers/workers.ts` (`publish`, `serveUrl`, `deleteInstance`, `dispatchGet`, `sampleFiles`, `freshInstanceId`) wrap these — reuse them from a quick node script. **Clean up:** `DELETE /instance?instanceId=$ID` (or `deleteInstance`) so you don't leave orphan per-instance Workers.

### D. Real Confluence page (last resort)

Only for bugs that genuinely need the rendered macro: the Forge Custom UI, the doubly-nested iframe, CSP-in-Forge embedding, the resolver's context-derived instanceId, the Publisher upload flow. Use **create-test-page** to stand up a page in one call (optionally `--bundle` to pre-publish), then drive it with Playwright MCP — see **spot-check** for the nested-iframe playbook. For local resolver/manifest changes, use **forge-tunnel**. Suitable site: `lite-dev.atlassian.net`.

## Step 4 — Reproduce and Document

Walk through the trigger one step at a time. After each step, capture evidence (test output, `curl` status + headers + body, a screenshot inside the served iframe).

At the end, state clearly:

- **Reproduced** — Yes / No
- **Environment used** — which layer triggered it (and note if a cheaper layer *failed* to trigger it — that's a clue about where the bug actually lives)
- **Exact steps** — numbered list
- **Evidence** — what you saw (test diff, HTTP status/headers, console output, screenshot)

If the bug is NOT reproduced, explain what you tried and why you believe it didn't trigger, then suggest the next environment up the ladder or ask the user for more context.

## CMS repro tips

- **Status codes are the contract.** The Workers fail closed and speak in HTTP codes: 401 (bad/expired/wrong-instance grant, or unset secret), 404 (unknown instance / non-grant route — deny-by-default), 422 (`BUNDLE_NOT_MULTIFILE` / `MISSING_INDEX_HTML`), a secret-detected stop (`SECRET_DETECTED`). Assert on the exact code, not just "it failed."
- **A blank render is usually auth, not rendering.** Empty macro + a successful `/publish` ⇒ suspect a `K_GRANT` skew (mint vs verify) or an unset `CONTROL_SHARED_SECRET` before debugging the bundle.
- **Relative paths only resolve via injected `<base>`.** If a sub-resource 404s in the browser but the file is in the bundle, check that the served HTML got `<base href="/v/<id>/g/<grant>/">` injected (dispatch only injects into `text/html`).
- **Delete is eventually-consistent at the dispatch edge.** After `DELETE /instance`, the dispatch binding can keep serving the compiled per-instance Worker for >2 min — that lag is expected (it's the WfP edge script cache), not a bug. Prompt revocation comes from the short-lived grant TTL, not script deletion.

## Related skills

- **equivalent-low-cost-test** — turn a slow browser/E2E repro into a fast unit/integration test that catches the regression.
- **spot-check** — the nested-iframe Playwright playbook for the Confluence-page layer.
- **create-test-page** — stand up the trigger page (optionally pre-published) in one call.
- **forge-tunnel** — repro a resolver/manifest/UI bug against local code on a live site.
