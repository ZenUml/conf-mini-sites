# Conf Mini-Sites

Host a multi-file static bundle — an AI-generated interactive mini-site (clickable prototype, filterable
dashboard, troubleshooting tool) — embedded live on a Confluence page.

**Stack:** Atlassian Connect (JWT) + **Cloudflare Workers for Platforms** (one dispatch namespace; one
non-routable user Worker per macro instance via Static Assets; the dispatch Worker is the auth gateway).

**Status: GO — building for the Atlassian Marketplace** (decided 2026-06-16; see [`CONTEXT.md`](CONTEXT.md)).
Shipping on Cloudflare, targeting the residency-agnostic segment, with paid installs as the demand signal.

## Design of record

| Doc | What |
|-----|------|
| [`CONTEXT.md`](CONTEXT.md) | Product, decision, positioning |
| [`DESIGN.md`](DESIGN.md) | Architecture, the auth-gateway threat model, the 10 invariants, async provisioning (§3.4) |
| [`BACKEND_DESIGN.md`](BACKEND_DESIGN.md) | Concrete blueprint — data model, API surface, topology, flows |
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Staged plan |
| [`handbook/`](handbook/index.html) | The design rendered as a browsable site (open `handbook/index.html`) |

## Build order (lean, to a live listing)

1. **Hosting seam** ✅ *(this scaffold)* — `HostingProvider` + fake + Cloudflare skeleton + contract test.
2. **Hosting** — `CloudflareWfPProvider` (WfP script-upload/dispatch) + `MiniSiteInstance` schema.
3. **Auth gateway** *(build carefully — CVSS-9.1 class; DESIGN §2)* — token verify, per-request `permission/check`, signed-path grants.
4. **Upload pipeline + async provisioning job** (CLI/MCP + drag-drop widget).
5. **Lifecycle reconcile + listing hygiene** → submit to Marketplace.

## Develop

```sh
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run — runs the HostingProvider contract against the fake
```

## Environment and secrets

Three deployables, each with its own variable surface and its own way of setting values. Templates:
[`.dev.vars.example`](.dev.vars.example) (Workers secrets) and
[`tests/e2e/.env.example`](tests/e2e/.env.example) (E2E suite). Real values are never committed —
`.dev.vars`, `.env`, and `tests/e2e/.auth/` are gitignored.

> **⚠️ The single most likely operational failure.** `K_GRANT` MUST be **byte-identical** in BOTH
> Workers (and within the same named env): the **remote/control** Worker *mints* the HMAC signed-path
> serve grant, the **dispatch** Worker *verifies* it. A mismatched `K_GRANT` — or an unset
> `CONTROL_SHARED_SECRET` — fails **closed** with a **401 on every grant**. When you rotate `K_GRANT`,
> set it in both `wrangler-dispatch.toml` and `wrangler-remote.toml` for that env.

### remote/control Worker — `wrangler-remote.toml` (`src/worker/index.ts`)

The provisioner: verifies the call, validates + secret-scans the bundle, uploads the per-instance
Worker via the WfP REST API, and mints serve grants. Set secrets with
`npx wrangler secret put <NAME> --config wrangler-remote.toml [--env staging|production]`.

| Variable | Kind | Purpose |
|----------|------|---------|
| `WFP_API_TOKEN` | secret | Cloudflare API token with **Workers Scripts:Edit** — uploads/deletes per-instance Workers in the dispatch namespace. |
| `K_GRANT` | secret | HMAC key used to **mint** the signed-path serve grant. **Byte-identical to the dispatch Worker's** `K_GRANT` (see callout). |
| `CONTROL_SHARED_SECRET` | secret | The `x-mini-sites-secret` the Forge resolver must present to authorize `/serve-url` and `/publish`. Unset ⇒ provisioning fails closed (401). |
| `ALLOWED_FORGE_APP_IDS` | `[vars]` | Comma-separated Forge app ids permitted to provision (last ARI segment). |
| `WFP_ACCOUNT_ID` | `[vars]` | Cloudflare account id the per-instance Workers are uploaded into. |
| `WFP_NAMESPACE` | `[vars]` | The dispatch namespace name (e.g. `mini-sites-dev`). |
| `DISPATCH_BASE_URL` | `[vars]` | Origin of the grant-signed serve URLs returned by `/serve-url` (the dispatch Worker). |
| `FORGE_JWKS_URL` | `[vars]` (optional) | Override for the Forge invocation-token JWKS endpoint. **Documented nowhere else.** Default hardcoded in `src/gateway/forgeToken.ts` (`https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json`); set only to point the verifier at a non-prod JWKS. |

### dispatch Worker — `wrangler-dispatch.toml` (`src/dispatch/index.ts`)

The serve gateway: the single network entry to the non-routable per-instance Workers. Verifies the
grant, then routes via the dispatch-namespace binding. Set secrets with
`npx wrangler secret put <NAME> --config wrangler-dispatch.toml [--env staging|production]`.

| Variable | Kind | Purpose |
|----------|------|---------|
| `K_GRANT` | secret | HMAC key used to **verify** the serve grant. **Byte-identical to the remote Worker's** `K_GRANT` (see callout). |
| `EMBED_ANCESTORS` | `[vars]` | CSP `frame-ancestors` allow-list for the nested mini-site iframe. |

### Forge resolver — `forge-app/` (`src/index.js`)

Set with `forge variables set <NAME> [VALUE] [--encrypt]` (the secret with `--encrypt`).

| Variable | Kind | Purpose |
|----------|------|---------|
| `CONTROL_BASE_URL` | forge variable | Origin of the control Worker (the `control` remote). Read as `process.env.CONTROL_BASE_URL`. |
| `CONTROL_SHARED_SECRET` | forge variable (`--encrypt`) | Sent to the control Worker as `x-mini-sites-secret`. **Must equal** the control Worker's `CONTROL_SHARED_SECRET`. |
