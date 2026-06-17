---
name: spot-check
description: >
  Ad hoc, AI-driven verification of a specific Conf Mini-Sites behavior — not a checked-in
  E2E test. Use after developing a feature, fixing a bug, validating a branch, or post-deploy.
  Drives Playwright MCP for the Forge Custom UI + the nested dispatch-served mini-site iframe,
  or CLI (curl / wrangler / forge) for backend signals (provision, grant, serve, lifecycle).
  Triggers on "spot check", "run a spot check on X", "spot check this fix", "spot check on
  lite-dev", "verify the render", "verify on the dev site".
---

# Spot Check

A **spot check** is an ad hoc, AI-driven, ephemeral verification of a specific behavior. It is not a pre-written test case and not meant for long-term use.

**What it is NOT:** a `.spec.ts` file, a comprehensive regression test, or a repeatable automated test. (For those, write/extend the `tests/e2e` suite — the `api/*` project is the always-on CI gate.)

## Key principles

- **Lightweight** — reuse what already exists. If a page already carries a published mini-site macro, use it. To stand up a fresh one in a single call, use **create-test-page** (optionally `--bundle` to pre-publish, so the page renders live with no UI driving).
- **AI-driven** — use Playwright MCP (`mcp__playwright__*`) to improvise steps. It is the only browser tool that reliably reaches inside Forge cross-origin iframes — AND inside the **nested** dispatch-served mini-site iframe one level deeper. No script is checked in.
- **Ephemeral** — test steps are not saved for future use.
- **Targeted** — verify the specific behavior being checked, not a full regression.
- **Real world** — verify on a real Confluence site, not a local fixture or unit test.
- **Default site** — `lite-dev.atlassian.net` (the E2E default). Use **forge-tunnel** to point a live macro at local resolver/manifest code.

## The thing you're looking at: a doubly-nested iframe

The render you're spot-checking is two iframes deep:

```
Confluence page
  └─ Forge Custom UI iframe (the launcher / publisher — *.atlassian-dev.net, our Forge app)
       └─ mini-site iframe  (src = the dispatch Worker serve URL: conf-mini-sites-dispatch-dev…/v/<id>/g/<grant>/)
            └─ the user's bundle HTML/CSS/JS  (served by the non-routable per-instance Worker)
```

So a visual check must cross **both** boundaries. With Playwright, `page.frames()` enumerates every frame including the nested dispatch frame; find the mini-site frame by `f.url().includes('conf-mini-sites-dispatch-dev')`, then inspect/screenshot inside it. The launcher writes the instance reference to `#v-ref` (`mini-site:<instanceId>`) once the resolver returns a serve URL.

## Write the plan first

**STOP.** Do not open the browser or run queries until the plan is written.

Each planned check must name:

1. **Behavior** — what changed or what you are verifying
2. **Observable signal** — a DOM element in the served iframe, a serve-URL HTTP status, a Worker log line, an instance-store row, a CSP header, etc.
3. **Method** — Playwright step, `curl` against the control/dispatch Worker, `wrangler tail`, `forge logs`, etc.

Each item must be independently pass/fail checkable before you run it.

```
Spot check plan: <short title>

Target: <site / page URL / control or dispatch Worker path>
  - [ ] <specific observable assertion>  [method]
  - [ ] <specific observable assertion>  [method]

Skipped: <anything out of scope> — <reason>
```

For **branch validation** before push, see the **validate-branch** skill after writing the plan here.

## Choosing the environment

| Situation | Target |
|---|---|
| New feature not yet deployed (resolver/manifest/UI) | **forge-tunnel** → `lite-dev.atlassian.net` |
| Worker change not yet deployed | local `wrangler dev` against the dispatch/control Worker, or deploy to dev and hit the URL |
| Deployed to the dev stack | `lite-dev.atlassian.net` + the `-dev` Workers (`conf-mini-sites-remote-dev`, `-dispatch-dev`) |
| Backend-only (provision / grant / serve / lifecycle) | `curl` / `wrangler` against the deployed control + dispatch Workers |
| Validating the workflow itself | Any appropriate env |

Credentials + endpoints live in `tests/e2e/helpers/env.ts` and `.env.forge.local` (FORGE_EMAIL/FORGE_API_TOKEN, CONTROL_SHARED_SECRET — all empty in the repo; fill locally).

## Verification methods

Mix freely — drive the browser, then `curl` the control Worker, then tail the dispatch Worker.

| Signal | How |
|---|---|
| Rendered mini-site (UI behavior) | Playwright MCP — `page.frames()` to reach the nested dispatch iframe; screenshot inside it |
| Resolver wiring | `#v-ref` text = `mini-site:<instanceId>` in the launcher frame (the resolver returned a serve URL) |
| Provision (publish) | `curl -X POST <control>/publish?instanceId=…` with `x-mini-sites-secret` → expect `{ok:true}` (or `BUNDLE_NOT_MULTIFILE`/`MISSING_INDEX_HTML`/`SECRET_DETECTED`) |
| Grant mint | `curl -X POST <control>/serve-url?instanceId=…&cloudId=…` → expect a `/v/<id>/g/<grant>/` URL (or `NOT_PUBLISHED`) |
| Serve (dispatch) | `curl <dispatch>/v/<id>/g/<grant>/` → 200 + `<base>` injected; sub-resource (e.g. `/…/style.css`) → 200; bad/expired grant → 401; unknown instance → 404 |
| Lifecycle delete | `curl -X DELETE <control>/instance?instanceId=…` → 200 (then serve-url → `NOT_PUBLISHED`) |
| Control Worker logs | `npx wrangler tail --config wrangler-remote.toml` |
| Dispatch Worker logs | `npx wrangler tail --config wrangler-dispatch.toml` |
| Forge resolver/UI logs | `forge logs -e development` (or `-e production`) |
| Instance store state | query the control Worker's D1 (`D1InstanceStore`) for the per-instance row |
| CSP / security headers | inspect the `content-security-policy` / `x-content-type-options` headers on a dispatch serve response |

The deployed-Worker helpers in `tests/e2e/helpers/workers.ts` (`publish`, `serveUrl`, `deleteInstance`, `dispatchGet`, `sampleFiles`) wrap these exact calls — reuse them from a quick node script rather than hand-rolling fetch.

## Workflow

1. **Plan** — behavior, target page/instance or data path, expected signal per assertion (see above).
2. **Navigate / target** — open the Confluence page (reuse the logged-in session), or point `curl`/`wrangler` at the deployed Workers.
3. **Reuse fixtures** — prefer an existing published macro. Stand one up with **create-test-page** only if none exists.
4. **Execute** — run each planned check. Screenshot or capture evidence after key steps. Report pass / fail / skipped per assertion.

## Forge + nested-iframe tooling

Forge Custom UI renders in sandboxed cross-origin iframes (OOPIFs), and the mini-site is a **further** cross-origin iframe inside that. Only Playwright reliably crosses those boundaries.

| Tool | Forge iframe + nested dispatch iframe |
|---|---|
| **Playwright MCP** | ✅ Yes — `page.frames()` enumerates all; screenshot inside the dispatch frame |
| **chrome-devtools-mcp** | ❌ No |
| **claude-in-chrome** | ❌ Confluence page chrome only — not inside the Forge/dispatch iframes |

**Common gotchas:**

- Selectors from the top frame miss everything inside the Forge UI — scope to the frame (`page.frames().find(...)`).
- `.contentFrame()` returns a `FrameLocator`, which has no `.evaluate()`. Use the real `Frame` from `page.frames()` when you need `evaluate`.
- The nested mini-site frame only exists once a bundle is published AND the grant verified. No frame = empty state (`NOT_PUBLISHED`) or a 401 grant failure — not necessarily a render bug.
- **K_GRANT skew is the #1 cause of a blank render.** If the macro shows the empty/add state but `/publish` clearly succeeded, suspect a `K_GRANT` mismatch between the control and dispatch Workers (mint vs verify) before debugging the bundle. See **check-version**.

**Before testing — pre-flight:**

1. **Confirm the build** — verify the deployed Forge app + Worker versions match what you expect (**check-version**). A tunnel serves your local branch; a deployed install serves the last `forge deploy`.
2. **Confirm something is published** — the render path only lights up for a published instance. Pre-publish via **create-test-page** `--bundle`, or upload through the Publisher, before asserting on the rendered output.

## Related skills

| Skill | When |
|---|---|
| **repro** | Confirm a bug exists before fixing |
| **validate-branch** | Local checks (typecheck + unit tests) before push |
| **forge-tunnel** | Point a live macro at local resolver/manifest/UI code |
| **create-test-page** | API-only page setup (optionally pre-published) when you need a specific bundle without the editor |
| **check-version** | Confirm which Forge-app / Worker build is live |
