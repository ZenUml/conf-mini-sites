---
name: forge-tunnel
description: >
  Run a Forge tunnel to test local conf-mini-sites Forge app changes on a live
  Confluence instance. Use when the user wants to test the mini-site macro
  locally, run forge tunnel, debug the Forge Custom UI on a live site, or verify
  manifest/resolver changes before deploying. Triggers on "forge tunnel",
  "tunnel to confluence", "test the mini-site locally", "run tunnel",
  "test on lite-dev", or any request to proxy local Forge app code to a live
  Atlassian site.
model: haiku
---

# Forge Tunnel (conf-mini-sites)

Run `forge tunnel` to proxy a live Confluence site to your local Forge Custom UI + resolver code. This lets you test manifest changes, the inline launcher / publisher modal, and resolver glue without deploying to a shared environment.

This app is single-variant: ONE Forge app (`mini-site` macro), ONE dev environment. There is no lite/full/dia fan-out — every command below is unconditional.

The Forge app lives in its own pnpm package at `forge-app/`. All `forge` commands run from inside `forge-app/`; the build command runs from repo root and targets that package.

## Happy path (everything already configured)

```bash
pnpm -C forge-app install --frozen-lockfile   # first time / after lockfile change
pnpm -C forge-app build:ui                     # build static/view + static/publisher from ui-src/
cd forge-app
forge deploy -e development                     # uploads bundled Custom UI + manifest to the dev env
forge install --upgrade                         # upgrades the install on the test site
forge tunnel                                    # starts the tunnel — leave running (separate terminal)
```

Open the test site (`lite-dev.atlassian.net`, account `eagle.xiao@gmail.com`) in a browser, go to a page, and insert the **Mini-Site** macro. Done.

If `forge install --upgrade` errors with "Could not find an installation", the app isn't installed on that site yet — see [First-time install](#first-time-install).

If `forge deploy` succeeds but `forge install --upgrade` errors with "scopes differ", just retry once — the deploy needs to settle.

## Key constraints

- **Tunnel only works with the DEVELOPMENT environment** — `-e staging` / `-e production` fail with "Cannot create tunnels outside of the development environment". This app only has a `development` env anyway (app id `2efdb7d9-ee5a-4294-b56a-b514e36e1a98`, dev env id `f69f8404-376e-4a05-9d34-c8d53785db66`).
- **`forge deploy` packages whatever is in `static/view` + `static/publisher`** — those are the build outputs of `pnpm -C forge-app build:ui` (which compiles Tailwind, copies the self-hosted fonts, and esbuild-bundles `ui-src/<name>.js` → `main.js`). Always run `build:ui` before `forge deploy`, or you'll ship stale Custom UI assets.
- **`forge install` (fresh, no `--upgrade`) requires a real TTY** for the scope-confirmation prompt. Run with `!` so it executes in the user's terminal.
- **The resolver reaches the CONTROL Worker over the network, NOT through the tunnel.** The tunnel proxies the macro's frontend Custom UI iframe to your local `static/` assets and runs the resolver (`forge-app/src/index.js`) locally — but `api.fetch(CONTROL_BASE)` still goes to the deployed `conf-mini-sites-remote-dev` Worker. To exercise local control/dispatch Worker code you run those Workers yourself with `wrangler dev` (see the `local-dev` skill) and point `CONTROL_BASE_URL` at them.
- **The resolver reads `CONTROL_BASE_URL` and `CONTROL_SHARED_SECRET` from Forge variables, not from a local file.** Set them with the Forge CLI (the secret with `--encrypt`):
  ```bash
  cd forge-app
  forge variables set CONTROL_BASE_URL https://conf-mini-sites-remote-dev.zenuml.workers.dev
  forge variables set --encrypt CONTROL_SHARED_SECRET <value>   # never paste a real secret into a file
  ```
  `CONTROL_SHARED_SECRET` here MUST match the CONTROL Worker's `CONTROL_SHARED_SECRET` secret, or every grant fails closed with 401.

## Setup (one-time per worktree)

If you create a new worktree for this repo, the Forge app's local toolchain needs its own install before any `forge` or `build:ui` command:

```bash
pnpm -C forge-app install --frozen-lockfile
```

Forge auth (`~/.config/forge` / `FORGE_API_TOKEN` / `FORGE_EMAIL`) is per-machine, not per-worktree, so it carries over. But Forge **variables** (`CONTROL_BASE_URL`, `CONTROL_SHARED_SECRET`) are per-app-environment, not per-worktree — set once per env, they persist across worktrees.

### Per-worktree env trap (transfers directly from conf-app)

> When `using-git-worktrees` creates a new worktree, redo any env-file / install setup **before** running any `forge` script. If you skip it and a `{{VAR}}` placeholder or env value is missing, forge can't substitute it, the placeholder passes through to `forge` as an empty string, forge then prompts for the missing value, and you get the misleading error `Prompts can not be meaningfully rendered in non-TTY environments`. Re-run with `--verbose` to see the real prompt and remember: **that error usually means env/config is missing, not that you need a TTY.**

## Step-by-step

### 1. Install + build the Custom UI

```bash
pnpm -C forge-app install --frozen-lockfile   # first time / after lockfile change
pnpm -C forge-app build:ui
```

`build:ui` runs `forge-app/build-ui.mjs`: compiles `ui-src/input.css` via Tailwind, copies the 3 self-hosted variable fonts, and esbuild-bundles each `ui-src/<name>.js` into `static/<name>/main.js`. `forge deploy` packages `static/` — skip this and you deploy stale assets.

### 2. Deploy to the dev environment

```bash
cd forge-app
forge deploy -e development
```

Run this whenever `manifest.yml` changed, or you're not sure. Resolver-only changes (`src/index.js`) are picked up live by the tunnel, but the manifest must match what the install expects.

### 3. Install or upgrade on the Confluence site

Default path:
```bash
cd forge-app
forge install --upgrade
```

#### First-time install

If upgrade errors "Could not find an installation", the app isn't on that site yet. Fresh install needs a TTY (the scope-confirmation prompt):

```bash
! cd forge-app && forge install --site lite-dev.atlassian.net --product confluence -e development
```

The `!` runs it in the user's terminal. Forge prints the scope list and prompts for confirmation — press Enter/Y to accept. (This app's `permissions.scopes` is empty and it uses a shared-secret remote, so there is no OAuth admin-consent step — but the fresh-install prompt is still interactive.)

### 4. Start the tunnel

```bash
cd forge-app
forge tunnel
```

The tunnel is long-lived. If Claude is running it: use `run_in_background: true` and tail the output for `Listening for requests on local port XXXXX...`. If a human is running it: dedicated terminal tab, leave it open while testing.

To stop: Ctrl+C, or `kill <pid>` for a backgrounded one. No server-side cleanup needed.

### 5. Verify the tunnel is hitting your code

Open `lite-dev.atlassian.net` in a browser as `eagle.xiao@gmail.com`. On a Confluence page, type `/Mini-Site` (or `/mini-site`) and insert the macro. It renders inside a Forge Custom UI iframe served by your tunnel.

Once the macro renders:

- The tunnel terminal should print incoming proxied requests as the iframe loads. No requests = the tunnel isn't connected (wrong env, wrong site, or app not installed there — `forge install list -e development` to verify).
- If you don't see your code changes, hard-refresh (Cmd+Shift+R) — Confluence aggressively caches macro assets.
- If still stale, check you're logged in as the same user the tunnel is associated with. The tunnel only intercepts YOUR authenticated session.

### During development

Custom UI changes (`ui-src/`, `static/`):
```bash
pnpm -C forge-app build:ui   # rebuild the static/ bundle
# tunnel auto-serves the new static/ — no restart needed for asset changes
```

Resolver changes (`src/index.js`): the tunnel auto-detects and reloads.

`manifest.yml` changes: full cycle — `forge deploy -e development` + `forge install --upgrade` + tunnel restart.

## Stale Vite / dev-server from another worktree (transfers directly from conf-app)

> This bites HARD in multi-worktree setups. The general failure: a dev server (Vite, or a `wrangler dev` from the `local-dev` skill) from **another worktree** is squatting on the port your tunnel/iframe expects, so the wrong worktree's code answers — and hard-refreshing or restarting the tunnel doesn't help, because the tunnel is faithfully proxying to whatever process owns that port.
>
> Symptom: the iframe loads and renders, but you see the *wrong branch* in the dev bar (e.g. `feat/old-thing:abc1234` instead of your current branch), or behaviour from code you didn't write. The deploy was successful and `forge install list` shows the install is up-to-date.
>
> What's happening: `forge tunnel` proxies HTTP requests to a local port; it does **not** own that port. If a dev server from another worktree is already listening there (e.g. you ran a local dev server in a sibling worktree earlier this week and forgot), THAT process answers — its cwd is the other worktree, so it serves *that* branch's files. The tunnel is doing exactly what it was told.
>
> Diagnose:
> ```bash
> lsof -iTCP:<port> -sTCP:LISTEN          # find the squatter (e.g. :8080 Vite, :8787/:8788 wrangler)
> pgrep -lf "vite/bin/vite.js"            # or, for Vite specifically
> ps -p <pid> -o pid,command             # the binary path's parent dir is the cwd the server reads from
> ```
> The path will be inside `<some-worktree>/node_modules/...`. If that worktree isn't yours, that's the bug.
>
> Fix:
> ```bash
> kill <pid>                              # kill the stale server
> cd <your-worktree>                      # then restart the right one from the right cwd, then re-run forge tunnel
> ```
>
> Trust the dev bar's git branch/hash (`VITE_APP_GIT_BRANCH` / equivalent) as ground truth for "which worktree is serving" — not your assumption.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Cannot create tunnels outside of the development environment" | Using `-e staging` / `-e production` | Use `-e development` (the only env this app has) |
| "The scopes or egress URLs differ from most recent deployment" | `manifest.yml` changed since last deploy to this env | Run `forge deploy -e development` first |
| "Could not find an installation" on `--upgrade` | App not installed on that site yet | Fresh-install path (`! cd forge-app && forge install --site lite-dev.atlassian.net ...`) |
| "Prompts can not be meaningfully rendered in non-TTY environments" on a fresh `forge install` | Fresh install prompts for scope confirmation | Run with `!` prefix in the user's terminal |
| Same error from `forge deploy` / `forge install` in a fresh worktree | Forge variables / `pnpm -C forge-app install` not done in this worktree → forge prompts | Do the per-worktree setup first; NOT a real TTY problem despite the message |
| Tunnel listening but no incoming requests when you load the macro | Wrong env, wrong site, or app not installed there | `forge install list -e development` to verify |
| Macro renders but resolver calls fail with 401 | `CONTROL_SHARED_SECRET` Forge variable ≠ CONTROL Worker's `CONTROL_SHARED_SECRET` secret | Re-set the Forge variable (`forge variables set --encrypt CONTROL_SHARED_SECRET <value>`) to match |
| Iframe shows OLD code / wrong git branch in the dev bar | Stale dev server from another worktree squatting on the port | See [Stale Vite / dev-server from another worktree](#stale-vite--dev-server-from-another-worktree-transfers-directly-from-conf-app) |
| Macro shows old description/title | Confluence cached the old assets | Hard-refresh (Cmd+Shift+R) |
| Forge appends "(Development)" to the macro name | Normal for dev environments | Won't appear in staging/production |

## Tips

- The tunnel terminal output is the canonical signal that it's working — keep an eye on it.
- `forge install list -e development` answers "which sites have this version installed".
- The tunnel only proxies your authenticated session — share-tested features need a real deploy.
- The dev bar's git branch/hash = ground truth for "which worktree is serving." Trust it, not your assumption.
