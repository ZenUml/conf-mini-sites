---
name: local-dev
description: Start the conf-mini-sites Cloudflare Workers locally — the dispatch (serve gateway) and remote (control/provisioner) Workers, each with its own wrangler config. Use when setting up local dev for the Workers, running them with wrangler dev, or debugging grant minting / verification locally.
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Local Development for the conf-mini-sites Workers

This app's backend is **two** Cloudflare Workers at the repo root, each with an **explicit** wrangler config (there is no `wrangler.toml` symlink to set up — you always pass `--config`):

| Worker | Role | Config | Entry | Default local port |
|--------|------|--------|-------|--------------------|
| dispatch | serve gateway — verifies the HMAC grant, routes to the per-instance Worker | `wrangler-dispatch.toml` | `src/dispatch/index.ts` | 8787 |
| remote (control) | provisioner — verifies the Forge token, validates/secret-scans bundles, mints grants, provisions per-instance Workers via the WfP REST API | `wrangler-remote.toml` | `src/worker/index.ts` | 8788 (pass `--port`) |

The Forge resolver and Custom UI are a **separate** package (`forge-app/`) — see the `forge-tunnel` skill. This skill is only the Workers.

## Step 1: Check ports are free

```bash
lsof -i :8787 -i :8788
```

`wrangler dev` defaults to **8787**. Run the two Workers on different ports (give the second one `--port 8788`). If either is occupied — often a `wrangler dev` from another worktree — stop the existing process first (`kill <pid>`). Two `wrangler dev` on the same port silently collide.

## Step 2: Provide secrets via `.dev.vars` (per config)

`wrangler dev` reads local secrets from a `.dev.vars` file next to the config (gitignored — `.dev.vars` is in `.gitignore`, so it does NOT exist in a fresh checkout/worktree). Each Worker needs its own values:

- **dispatch** (`wrangler-dispatch.toml`) needs: `K_GRANT`
- **remote** (`wrangler-remote.toml`) needs: `WFP_API_TOKEN_PROVISIONING`, `K_GRANT`, `CONTROL_SHARED_SECRET`

> **INVARIANT — `K_GRANT` MUST be byte-identical in both Workers.** The remote Worker MINTS serve grants with `K_GRANT`; the dispatch Worker VERIFIES them with `K_GRANT`. A mismatch (or an unset `CONTROL_SHARED_SECRET`) fails closed with a 401 on every grant — the single most likely operational failure. Wrangler keeps a separate `.dev.vars` per config; copy the same `K_GRANT` value into both.

Wrangler picks up a single root `.dev.vars` by default. To keep the two Workers' secrets separate, use per-config files and point each run at its own:

```bash
# create the templates (NEVER write a real secret value — leave placeholders empty)
printf 'K_GRANT=\n' > .dev.vars.dispatch
printf 'WFP_API_TOKEN_PROVISIONING=\nK_GRANT=\nCONTROL_SHARED_SECRET=\n' > .dev.vars.remote
```

Then pass the matching env file on each `wrangler dev` (`--env-file`). Fill in real values out-of-band (your shell, a password manager) — never commit them.

The non-secret **vars** (`EMBED_ANCESTORS`; `ALLOWED_FORGE_APP_IDS`, `WFP_ACCOUNT_ID`, `WFP_NAMESPACE`, `DISPATCH_BASE_URL`, optional `FORGE_JWKS_URL`) already live in the `[vars]` blocks of the toml files — you don't need to set those locally. `FORGE_JWKS_URL` is an optional override; the default is hardcoded in `src/gateway/forgeToken.ts`.

## Step 3: Start each Worker with its explicit config

Two terminals (or two backgrounded processes):

```bash
# Terminal 1 — dispatch (serve gateway) on :8787
npx wrangler dev --config wrangler-dispatch.toml --env-file .dev.vars.dispatch

# Terminal 2 — remote (control / provisioner) on :8788
npx wrangler dev --config wrangler-remote.toml --env-file .dev.vars.remote --port 8788
```

Leave both running. The remote Worker is the one the Forge resolver's `CONTROL_BASE_URL` points at; the dispatch Worker is the origin of the grant-signed serve URLs the remote returns from `/serve-url`.

## Step 4: Understand the Workers-for-Platforms gap (local limitation)

> **The local dispatch Worker cannot reach real per-instance Workers without the dispatch namespace.** In production, per-instance Workers (`ms-<instanceId>`) live in the WfP dispatch namespace and are reachable ONLY via the `env.MINISITES.get(name).fetch()` binding (`[[dispatch_namespaces]]` in `wrangler-dispatch.toml`, binding `MINISITES`, namespace `mini-sites-dev`). They are not independently routable.
>
> `wrangler dev` does NOT run a local dispatch namespace, and you cannot provision real per-instance Workers into a remote namespace from local dev without the `WFP_API_TOKEN_PROVISIONING`-scoped REST path that the remote Worker uses. So:
> - The HMAC grant mint/verify handshake between the two Workers (the K_GRANT path) DOES work locally end-to-end.
> - But `env.MINISITES.get(...).fetch(...)` against a real per-instance Worker will not resolve locally — the dispatch Worker has no namespace to look in.
>
> To exercise the dispatch→per-instance routing you need either `wrangler dev --remote` against the real namespace (needs the WfP token + account) or a fake/stub in the dispatch tests (`src/dispatch/*.test.ts`, `src/hosting/InMemoryWfpClient.ts`). For pure grant/auth iteration, local `wrangler dev` is enough.

## Step 5: This app does NOT use D1 — no local DB migrate step

Unlike conf-app, neither wrangler config has a `d1_databases` binding, so there is **no** `db:migrate:local` / `wrangler d1 migrations apply` step here. Skip any D1 setup.

> The repo does contain a `migrations/` directory (`0001_mini_site_instance.sql`, `0002_provisioning_job.sql`, `0003_client_installation.sql`), but those are NOT wired into wrangler as a D1 binding — they are schema artifacts, not a `wrangler dev` D1 setup. Do not run them through wrangler. If/when D1 is added, a `d1_databases` binding must appear in a toml first.

## Step 6: Verify

```bash
# dispatch is up
curl -s http://localhost:8787/ -o /dev/null -w '%{http_code}\n'   # expect a fail-closed 4xx without a valid grant — that's correct

# remote is up (control endpoints; expect 401 without the shared secret — auth working)
curl -s http://localhost:8788/serve-url -X POST -o /dev/null -w '%{http_code}\n'
```

A 401 without credentials is the **expected** healthy signal — it proves the auth gate is wired. To drive a real end-to-end serve, point the Forge resolver's `CONTROL_BASE_URL` at `http://localhost:8788` (via `forge variables set`, see the `forge-tunnel` skill) and use a tunnel so the live macro hits your local remote Worker.

## Reference

See [REFERENCE.md](REFERENCE.md) for the architecture diagram, config/secret matrix, and troubleshooting.
