# Local Dev Reference (conf-mini-sites Workers)

## The two Workers

| Worker | Config | Entry | Name (dev) | Secrets | Vars |
|--------|--------|-------|------------|---------|------|
| dispatch (serve gateway) | `wrangler-dispatch.toml` | `src/dispatch/index.ts` | `conf-mini-sites-dispatch-dev` | `K_GRANT` | `EMBED_ANCESTORS` |
| remote (control / provisioner) | `wrangler-remote.toml` | `src/worker/index.ts` | `conf-mini-sites-remote-dev` | `WFP_API_TOKEN`, `K_GRANT`, `CONTROL_SHARED_SECRET` | `ALLOWED_FORGE_APP_IDS`, `WFP_ACCOUNT_ID`, `WFP_NAMESPACE`, `DISPATCH_BASE_URL`, `FORGE_JWKS_URL` (optional override) |

Both are currently `-dev` named with NO `[env.*]` sections. You always run them with an explicit `--config` (there is no `wrangler.toml` symlink convention in this repo).

`FORGE_JWKS_URL` is an optional override only — its default is hardcoded in `src/gateway/forgeToken.ts` (`https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json`, the same JWKS conf-app uses).

## Secret matrix (per `.dev.vars`)

`wrangler dev` reads local secrets from a `.dev.vars` file (gitignored). Keep one per config so the two Workers' secrets stay separate, and pass it with `--env-file`.

| Secret | dispatch | remote | Notes |
|--------|:--------:|:------:|-------|
| `K_GRANT` | ✅ | ✅ | **MUST be byte-identical in both** — remote mints grants, dispatch verifies. Mismatch → 401 on every grant. |
| `WFP_API_TOKEN` | — | ✅ | Cloudflare API token (Workers Scripts:Edit) for provisioning per-instance Workers into the namespace. |
| `CONTROL_SHARED_SECRET` | — | ✅ | Shared secret the Forge resolver sends as `x-mini-sites-secret`; unset → control calls fail closed (401). |

NEVER write a real secret value into any file. All placeholders stay empty:
```bash
printf 'K_GRANT=\n' > .dev.vars.dispatch
printf 'WFP_API_TOKEN=\nK_GRANT=\nCONTROL_SHARED_SECRET=\n' > .dev.vars.remote
```

## No D1

Neither toml declares a `d1_databases` binding, so there is no local D1 / `db:migrate:local` step. The `migrations/*.sql` files in the repo are schema artifacts, not a wrangler D1 setup — do not apply them through wrangler.

## Architecture

```
Confluence page
  └─ Forge Custom UI iframe (forge-app/, served by Forge tunnel or deploy)
        │  resolver: api.fetch(CONTROL_BASE_URL)/serve-url  +  /publish
        ▼
  remote Worker  (wrangler-remote.toml, src/worker/index.ts, :8788 local)
        │  verifies Forge token / shared secret, validates+secret-scans bundle,
        │  provisions per-instance Worker via WfP REST API (WFP_API_TOKEN),
        │  MINTS HMAC grant (K_GRANT), returns DISPATCH_BASE_URL serve URL
        ▼
  nested iframe → dispatch Worker  (wrangler-dispatch.toml, src/dispatch/index.ts, :8787 local)
        │  VERIFIES the HMAC grant (K_GRANT — must match remote)
        ▼
  env.MINISITES.get("ms-<instanceId>").fetch(...)   ← dispatch-namespace binding (WfP)
        │  (NOT routable locally — see the WfP gap below)
        ▼
  per-instance Worker (ms-<instanceId>) serves the mini-site bytes
```

## Workers-for-Platforms gap (why local dev can't serve a real instance)

Per-instance Workers live in the **dispatch namespace** `mini-sites-dev` (binding `MINISITES`, `[[dispatch_namespaces]]` in `wrangler-dispatch.toml`) and are reachable ONLY through `env.MINISITES.get(name).fetch()`. `wrangler dev` runs no local dispatch namespace, so:

- ✅ The K_GRANT mint (remote) → verify (dispatch) handshake works locally.
- ❌ `env.MINISITES.get(...).fetch(...)` to a real per-instance Worker does NOT resolve in plain local dev — there is no namespace to look in.

Options to bridge it:
1. `wrangler dev --remote` against the real namespace (needs `WFP_ACCOUNT_ID` + a valid `WFP_API_TOKEN`).
2. Stub/fake the WfP path in tests — `src/dispatch/*.test.ts`, `src/hosting/InMemoryWfpClient.ts`, `src/hosting/FakeHostingProvider.ts`.

For pure grant/auth iteration, plain local `wrangler dev` on both Workers is enough.

## Troubleshooting

### Every grant returns 401
`K_GRANT` differs between the two Workers, or `CONTROL_SHARED_SECRET` is unset on the remote Worker. Make `K_GRANT` byte-identical in both `.dev.vars` files; set `CONTROL_SHARED_SECRET` on the remote.

### `env.MINISITES` is undefined / dispatch can't route to an instance
Expected in plain local dev — no local dispatch namespace. Use `wrangler dev --remote` or a fake (see the WfP gap above).

### Port already in use
```bash
lsof -i :8787   # or :8788 — find the process (often a wrangler dev from another worktree)
kill <PID>
```

### `wrangler dev` ignores my secret
You pointed it at the wrong `.dev.vars`, or didn't pass `--env-file`. Each Worker run needs its own env file matching its config.

### A 401 on `curl` with no credentials
That's the healthy signal — the auth gate is wired. Provide a valid grant / shared secret to get past it.
