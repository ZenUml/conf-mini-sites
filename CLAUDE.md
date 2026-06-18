# CLAUDE.md — Conf Mini-Sites

Guidance for Claude Code working in this project. The workspace-level `../../CLAUDE.md` and the user's global
instructions also apply. The settled architecture, live-verification state, and release process live in
**`CONTEXT.md`**; design invariants + threat models in **`DESIGN.md`** / **`BACKEND_DESIGN.md`**. Read those for
depth — this file is the operational orientation.

## What this is

A **Forge Confluence Cloud app** that embeds a **live, multi-file mini-site** (a clickable prototype, dashboard,
or small tool) inline on a Confluence page. The Forge app is a thin shell; the bundle bytes are hosted on
**Cloudflare Workers for Platforms (WfP)**, not in Forge. Marketplace listing: *Mini Site for Confluence*
(app key `com.zenuml.confluence.minisite`, vendor P&D VISION) — currently a **private draft**.

## Architecture (one screen)

```
Confluence page (Mini-Site macro, Custom UI)
   │  getServeUrl / publish  (Forge resolver = forge-app/src/index.js)
   ▼
Control Worker  (src/worker/index.ts · wrangler-remote.toml · conf-mini-sites-remote-*)
   - verify Forge token OR x-mini-sites-secret → validate + secret-scan bundle
   - provision per-instance Worker via WfP REST  → /publish
   - mint short-lived HMAC signed-path grant      → /serve-url
   - tombstone on uninstall (D1)                  → /uninstall   (+ scheduled 30-day GC sweep)
   ▼
Dispatch Worker (src/dispatch/index.ts · wrangler-dispatch.toml · conf-mini-sites-dispatch-*)
   - verify grant → route to ms-<instanceId> via dispatch-namespace binding → serve bytes (+ <base>, CSP)
   ▼
Per-instance Workers  ms-<instanceId>  (WfP namespace mini-sites-{dev,staging,prod}) — non-routable
```

`K_GRANT` is the HMAC key the control Worker **mints** with and the dispatch Worker **verifies** with.
Confluence permissions are inherited via Forge (no permission checker of our own).

## Repo layout

- `src/worker/` — control Worker · `src/dispatch/` — dispatch Worker · `src/hosting/`, `src/pipeline/`,
  `src/gateway/`, `src/db/`, `src/lifecycle/` — provider seam, bundle validation/secret-scan, grant/token, D1
  stores, uninstall GC.
- `forge-app/` — the Forge app (**separate pnpm package**): `manifest.yml`, `src/index.js` (resolver),
  `static/` (Custom UI), `build-ui.mjs`.
- `tests/e2e/` — Playwright (`api`, `setup`, `ui` projects) + fixtures + helpers.
- `migrations/` — D1 SQL · `wrangler-*.toml` — Worker configs (top-level = dev; `[env.staging]`/`[env.production]`).
- `.github/workflows/` — `ci.yml`, `e2e.yml`, `deploy.yml`, `release.yml`, `smoke-test.yml`, `block-external-prs.yml`.

## Commands

Package manager is **pnpm** (root *and* `forge-app/` — two separate packages).

```bash
# Root (Workers + shared lib)
pnpm test            # vitest run (unit; src/**/*.test.ts)
pnpm typecheck       # tsc --noEmit

# Workers — deploy/dev via wrangler directly (no npm script). Top-level config = dev; add --env for others.
npx wrangler deploy --config wrangler-remote.toml   [--env staging|production]
npx wrangler deploy --config wrangler-dispatch.toml [--env staging|production]
npx wrangler dev    --config wrangler-remote.toml                       # local dev
npx wrangler d1 migrations apply <db> --config wrangler-remote.toml [--env …]   # apply migrations/

# Forge app  (cd forge-app)
pnpm -C forge-app build:ui            # build the Custom UI bundle (required before forge deploy)
pnpm -C forge-app forge:deploy        # deploy to the default (dev) env
pnpm -C forge-app forge:deploy:prod   # forge deploy -e production --non-interactive

# E2E (Playwright) — needs tests/e2e/.env (see tests/e2e/.env.example; api uses CONTROL_SHARED_SECRET,
# ui uses the cached login in tests/e2e/.auth/state.json). API-only run needs no browser/login:
pnpm exec playwright test --project=api
pnpm exec playwright test            # all (api + setup + ui)
```

## Conventions & gotchas (these have bitten us)

- **The Forge app package MUST be CommonJS** — no `"type":"module"` in `forge-app/package.json`. With ESM,
  Forge's bundler mis-applies interop and `new Resolver()` throws "not a constructor". Use default imports
  (`import Resolver from '@forge/resolver'`). See the header comment in `forge-app/src/index.js`.
- **`K_GRANT` must be byte-identical** between the control and dispatch Workers for the *same env*, or every
  serve grant fails closed with a 401. Rotate it in BOTH `wrangler-remote.toml` and `wrangler-dispatch.toml`.
- **GitHub Actions: `secrets.*` is NOT readable in a step `if:`.** Gate on a guard-job/guard-step output
  instead (see `release.yml` / `e2e.yml`). Deploy steps self-skip (green no-op) when their prod secrets are
  absent — a green run may have shipped nothing; verify there's no `::notice:: … skipping`.
- **`instanceId` is derived**, not stored client-side: `i + sha256(`cloudId:localId`)[:31]`, computed in both
  `forge-app/src/index.js` and `tests/e2e/helpers/confluence.ts` — keep them in sync.
- **Uninstall GC (30-day) is implemented but dormant** until a D1 DB is provisioned and the binding + cron in
  `wrangler-remote.toml` are uncommented (see `src/lifecycle/uninstallGc.ts`, migration `0004`).
- Don't let vitest collect Playwright specs — unit tests are `src/**/*.test.ts` (scoped in `vitest.config.ts`).

## Testing

- **Unit:** vitest, colocated `*.test.ts` under `src/`. `pnpm test` / `pnpm typecheck` must be green before any
  commit. Keep logic pure + injectable (clock/store/deleteWorker) so it's testable without Miniflare — e.g.
  `reconcile.ts`, `uninstallGc.ts`.
- **E2E:** Playwright in `tests/e2e/`. `api` hits the deployed Workers (shared-secret); `ui` drives the Forge
  macro on a real Confluence page (`lite-dev.atlassian.net`, space `SD`) using `setInputFiles` (no native
  picker) — the publish flow lives in `tests/e2e/helpers/forge.ts`.

## Releasing to production

A release deploys **the Forge app AND both Cloudflare Workers to production together** — automated by
`release.yml`, fired by **publishing a `vX.Y.Z` GitHub Release** (created manually; there's no draft workflow).
**Use the `release-app` skill.** Full detail: the "Releasing to production" section of `CONTEXT.md`. Releasing
the pipeline is separate from making the Marketplace listing public (a paid app must enforce licensing —
EAG-92 — before Submit-for-review).

## Project skills (`.claude/skills/`)

`release-app` (prod release), `check-version` (what's live per env), `spot-check` (targeted post-deploy
coverage), `submit-branch` / `ready-pr` / `babysit-pr` / `land-pr` / `ship-branch` / `validate-branch` (PR
lifecycle), `forge-tunnel` / `local-dev` / `forge-installs` / `create-test-page` / `repro` (dev loop).

## Safety (in addition to the workspace rules)

- **Never push to a remote without explicit permission.** Commit locally; the default branch here is
  **`master`** (there is no `main`).
- **Never modify cloud resources** (Cloudflare, Forge prod, D1) without confirmation. Reading/listing is fine.
- **Never use production for tests** — E2E targets the dev stack (`lite-dev`, `*-dev` Workers).
- A production release is irreversible/externally visible — **confirm with the user before publishing** one.
