---
name: create-test-page
description: Create a Confluence page carrying the Conf Mini-Sites Forge macro (key `mini-site`) entirely via REST API — no browser, no editor UI. Use whenever you need a real page that renders a mini-site (to validate a serve/dispatch change, a CSP tweak, or a relative-path resolution fix) without driving the Publisher modal. Optionally pre-publishes a multi-file bundle to the page's instance so it renders live on first load. Triggers on "create test page", "render test", "API test page", "skip the editor", "stand up a mini-site page", or when validating a dispatch/serve fix.
---

# Create Test Page (API-only)

Stand up a real Confluence page carrying the **`mini-site`** macro in one `Bash` call. No Playwright snapshots, no slash menu, no Publish button. Optionally pre-publishes a bundle so the page renders a live mini-site the instant it loads. Outputs the page URL + the derived `instanceId`.

## When to use

You're testing the **serve / render** path — "does the dispatch Worker serve this bundle correctly inside the macro iframe?" Examples:

- A `<base>`-injection or relative-path change: does `style.css` / `app.js` resolve under the signed `/g/<grant>/` path?
- A CSP / `frame-ancestors` tweak: does the nested mini-site iframe still embed under the Forge Custom UI?
- A dispatch-routing change: does a freshly-provisioned per-instance Worker serve `index.html` + sub-resources?

Do NOT use for testing the **upload/insertion** path itself (the drop-zone, the validation checklist, the Publisher modal) — drive that through the real UI (see **spot-check**, or the `ui/*` E2E specs). This skill bypasses the editor entirely; it exercises serve, not publish-via-UI.

## Why this exists

Driving the Publisher modal through Playwright is ~20+ tool calls per page (open launcher frame, click Add, find modal frame, setInputFiles, dispatch change, wait for "selected", click publish, wait for handoff…) and brittle (cross-origin Forge frames, the setInputFiles→change race). When the only thing you need is "a page that renders this bundle," the REST API does it in a single invocation, and the bundle bytes are read from local files (never inlined into a tool argument).

| Approach | Tool calls per page |
|---|---|
| Playwright editor/Publisher flow | ~20 |
| **This skill** | 1 Bash |

## One-time setup

Create an Atlassian API token at https://id.atlassian.com/manage-profile/security/api-tokens and put it in `.env.forge.local` (same env-var names the Forge CLI and the E2E suite use — see `tests/e2e/README.md`):

```
FORGE_EMAIL=
FORGE_API_TOKEN=
```

For the optional `--bundle` pre-publish, also export the resolver↔control shared secret (the same value set as the Forge `CONTROL_SHARED_SECRET` variable and the `CONTROL_SHARED_SECRET` secret on the control Worker):

```
CONTROL_SHARED_SECRET=
```

> Never commit real values. These placeholders stay empty in the repo.

## Usage

```bash
set -a; source .env.forge.local; set +a
node .claude/skills/create-test-page/scripts/create-test-page.mjs \
  --site lite-dev \
  --space SD \
  --title "mini-site render test" \
  --bundle .claude/skills/create-test-page/fixtures/sample-bundle
```

Output (two lines): the page URL, then `instanceId=<id>`. Hand the URL to Playwright (or `open` it); use the instanceId to query the control Worker (`/serve-url`, `DELETE /instance`) or to find the per-instance Worker `ms-<instanceId>` in the dispatch namespace.

### Args

| Flag | Required | Notes |
|---|---|---|
| `--site` | no | `lite-dev` (default). Add a row to the `SITES` table for another Confluence site (find its env id with `forge environments list`). |
| `--space` | yes | Space key (e.g. `SD`). Resolved to a numeric spaceId via the v2 API. |
| `--title` | no | Defaults to `mini-site test <timestamp>`. |
| `--parent` | no | Parent page id for placement. |
| `--bundle` | no | Directory of a multi-file bundle to pre-publish to this page's instance (needs `CONTROL_SHARED_SECRET`). Without it, the page renders the macro's empty "Add mini-site" state. |

## What it does internally

1. Generate a macro `localId` and derive `instanceId = "i" + sha256(`${cloudId}:${localId}`).hex[0..31]` — byte-identical to the resolver (`forge-app/src/index.js`) and `tests/e2e/helpers/confluence.ts`. The `cloudId` comes from the `SITES` row (lite-dev = `bc8bb5b3-09d2-4932-b68c-9b56fab8e34a`) and **must** match the site, or a pre-published bundle lands on a different instance than the page resolves.
2. *(if `--bundle`)* Read the dir into the control Worker's `PublishFile[]` shape (`{ path, b64 }`, recursing so `data/`+`assets/` keep relative paths) and `POST /publish?instanceId=…` with `x-mini-sites-secret` — the exact call the resolver's `publish` makes. This validates + secret-scans + provisions the per-instance Worker.
3. `POST /wiki/api/v2/pages` with an `atlas_doc_format` body containing one Forge `extension` ADF node whose `extensionKey = <appId>/<envId>/static/mini-site` and whose `parameters.localId` is the id from step 1.

Auth: Basic with `FORGE_EMAIL` + `FORGE_API_TOKEN` (one Atlassian token works for any site you're a member of). The pre-publish leg authenticates to the control Worker with the shared secret instead.

## Fixtures shipped

- `fixtures/sample-bundle/` — a minimal **multi-file** mini-site: `index.html` + `style.css` + `app.js`, all relative paths, with a clickable counter so a spot-check can confirm the bundle's JS actually runs inside the served iframe (not just that HTML/CSS rendered). This is the canonical synthetic bundle for serve-path validation. The repo also ships `samples/release-dashboard/` (a nested `data/`+`assets/` bundle) for exercising relative-path resolution at depth.

Add more fixtures here when a serve/render bug reappears — keep them small and synthetic so they describe the trigger condition clearly.

## Caveats

- **Single app, one variant.** The macro key (`mini-site`), app id, and dispatch namespace are fixed — there is no lite/full/diagramly fan-out. To target another Confluence site, add a `SITES` row (host + cloudId + appId + envId), not a new variant.
- **Pages are not auto-cleaned.** They sit in the space until deleted. Tag throwaways via `--title 'Throwaway …'` and clean up periodically. Pre-published instances also linger — tear them down with `DELETE /instance?instanceId=<id>` on the control Worker (or the `deleteInstance` helper in `tests/e2e/helpers/workers.ts`).
- **Bundle must be multi-file with an `index.html`.** The control Worker rejects a single-file bundle as `BUNDLE_NOT_MULTIFILE` and a bundle without `index.html` as `MISSING_INDEX_HTML`; the script pre-checks both so you fail locally with a clear message instead of a 422 from the Worker.
- **No retry / backoff.** A single transient 5xx fails the whole run. Re-run.
- **cloudId/site coupling.** If you add a site but copy the wrong cloudId, the page will create fine but a pre-published bundle resolves to the wrong instance and the macro renders empty. The instanceId printed by the script is your check — it must match what `/serve-url` was called with.

## Related skills

| Skill | When |
|---|---|
| **spot-check** | Visually verify the rendered mini-site iframe on the page this skill creates |
| **forge-tunnel** | Test local resolver/manifest changes against a live site before relying on the deployed app |
| **repro** | Reproduce a serve/render bug — this skill is the fastest way to stand up the trigger page |
