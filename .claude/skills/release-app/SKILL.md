---
name: release-app
description: >
  Release Conf Mini-Sites to PRODUCTION — deploy the Forge app to its production environment AND both
  Cloudflare Workers (control + dispatch) to their production environment, via the GitHub-Release →
  release.yml pipeline. Single app, no variants (the collapse of conf-app's lite/full/diagramly canary).
  Pre-flight (on master, pushed, CI green, prod prerequisites present) → compose delta-derived release notes
  → create + publish a vX.Y.Z GitHub Release (which fires the deploy) → wait for the workflow → verify the
  live build (built-in prod smoke + check-version + a targeted spot check of what shipped). Use when the user
  wants to release, deploy, ship, cut a release, or promote Conf Mini-Sites to production. Triggers on
  "release app", "release to prod", "deploy to production", "ship the mini-site app", "cut a release",
  "release conf-mini-sites", "push to production".
---

# Release Conf Mini-Sites to Production

## What "release" means here

Conf Mini-Sites is **ONE Forge app + TWO Cloudflare Workers**. A production release promotes **all of them**
to their production environments — this is the whole point of the release:

| Component | Production target | How (in `release.yml`) |
|---|---|---|
| **Forge app** | production env on the Marketplace-listed app | `pnpm forge:deploy:prod` (`forge deploy -e production`) + `forge variables set CONTROL_SHARED_SECRET --encrypt -e production` |
| **Cloudflare control Worker** | `conf-mini-sites-remote-production` | `wrangler deploy --config wrangler-remote.toml --env production` |
| **Cloudflare dispatch Worker** | `conf-mini-sites-dispatch-production` | `wrangler deploy --config wrangler-dispatch.toml --env production` |

You do **not** run these deploys by hand. `.github/workflows/release.yml` runs all of them automatically when a
**GitHub Release is published**, then runs a prod happy-path smoke (`smoke` job → `e2e.yml` pointed at the prod
Workers). So a release = *publish a GitHub Release at the right tag* and let the pipeline deploy Forge + both
Workers together.

## How releases are created here (differs from conf-app)

conf-app auto-drafts releases from a build workflow and you reuse the fresh draft. **conf-mini-sites has NO
draft-creating workflow** — you create the release **manually** with `gh release create`, which fires
`release.yml`. Tags are **`vX.Y.Z`** (no `-lite`/`-full` variant suffix; there is only one app). The repo
`package.json` version stays `0.0.0` — the **tag** is the version of record.

## Prerequisites — the pipeline is a NO-OP until these exist

`release.yml` gates every deploy step on its credentials being present, so a release with missing secrets
**"succeeds" green without actually deploying**. Before relying on a release to ship, confirm:

- **Repo secrets:** `CLOUDFLARE_API_TOKEN_DEPLOY`, `CLOUDFLARE_ACCOUNT_ID` (Worker deploys); `FORGE_EMAIL`,
  `FORGE_API_TOKEN` (Forge deploy + variable set); `CONTROL_SHARED_SECRET` (the prod control-Worker shared
  secret — also fed to the Forge variable and the smoke job).
- **Per-env Worker secrets** set out-of-band (`wrangler secret put NAME --config <toml> --env production`):
  `K_GRANT` in **both** Workers (INVARIANT: byte-identical across both, or every serve grant fails closed with
  a 401), and `WFP_API_TOKEN_PROVISIONING` + `CONTROL_SHARED_SECRET` in the control Worker.
- A **production Forge environment** exists (`forge environments create production` once).
- The repo is pushed to its GitHub remote (`ZenUml/conf-mini-sites`).

If a prerequisite is missing, **say so and stop** — don't cut a release that silently no-ops the deploy.

## Pipeline Steps

Execute sequentially. Stop and report if any step fails.

### Step 1: Pre-flight

1. On **master**, tree clean: `git rev-parse --abbrev-ref HEAD`, `git status -sb`.
2. The commits you intend to ship are **pushed to `origin/master`** — `release.yml` checks out the **tag**, so
   the tag must point at a pushed commit that includes them. `git log origin/master..HEAD --oneline` should be
   empty (or push first, with the user's OK).
3. **CI green** on the release commit: `gh run list --workflow=ci.yml --branch=master -L 1`.
4. Confirm the **prerequisites** above. In particular, if Cloudflare/Forge prod secrets are absent, flag that
   the release would no-op the deploy.

### Step 2: Determine the next version

```bash
gh release list -L 5            # last published tag, e.g. v0.1.3
```

Bump to the next `vX.Y.Z` (patch for fixes, minor for features). Confirm the chosen version with the user.

### Step 3: Compose release notes from the delta

```bash
git fetch --tags
git log <prev-published-tag>..HEAD --oneline      # e.g. v0.1.3..HEAD
```

Turn the log into **user-facing notes**, not a commit dump:
- Lead with **behavioral / user-visible** changes (what a Confluence user or macro author notices).
- Then **fixes**.
- Fold `infra/test/docs` and pure-instrumentation commits into a short trailing `_Internal:_` line (or omit).
- Group by theme/surface (publish flow, licensing, lifecycle/GC, dispatch, CI), not one bullet per commit.

Write to `release-notes.md`:

```markdown
## vX.Y.Z

### Changes
- <user-facing change grouped by theme>

### Fixes
- <bug fix>

_Internal: <infra/test/docs/instrumentation one-liner, or omit>_
```

If there are no product commits since the last tag, say `- Maintenance release; no user-facing changes.` —
never ship empty/placeholder notes.

### Step 4: Create + publish the release (this fires the deploy)

**Always confirm version + notes with the user before publishing.** Then:

```bash
gh release create vX.Y.Z --target master --title "vX.Y.Z — <one-line>" --notes-file release-notes.md
```

(Or create with `--draft`, show it, then `gh release edit vX.Y.Z --draft=false` to publish.) Publishing fires
`release.yml`.

### Step 5: Wait for the Release workflow

```bash
gh run list --workflow=release.yml -L 1
gh run watch <run-id> --exit-status        # run_in_background for a single completion notification
```

- **`release` job** — builds root + Forge UI, deploys **dispatch Worker** + **control Worker** to production,
  Forge deploys to production, sets `CONTROL_SHARED_SECRET` in Forge prod.
- **`smoke` job** (`needs: release`) — prod happy-path via `e2e.yml` against the prod Workers.

**Verify it ACTUALLY deployed**, not just that it went green: open the run and confirm there is **no**
`::notice:: … skipping (no-op)` for the Cloudflare or Forge steps. A self-skipped deploy is a green run that
shipped nothing.

### Step 6: Verify the live build (MANDATORY — do not skip, do not ask)

1. **Built-in smoke** — confirm the `smoke` job ran the prod happy-path (and didn't self-skip on empty secrets).
2. **check-version** skill — confirm the **prod Forge app version** and **both prod Worker versions** are the
   build you just shipped.
3. **spot-check** skill — targeted coverage of **what shipped this release** (reuse the Step 3 prev→new delta;
   exercise the changed surfaces, not keyword→skill matching). Triage every commit `behavioral` /
   `instrumentation` / `infra-test-docs`; only declare `N/A` if every commit is `infra/test/docs`.

### Step 7: Report

```
## Release Report: vX.Y.Z (production)
- Release notes set (not placeholder): ✓
- Release published → release.yml: ✓ (run <id>)
- Deployed: Forge prod ✓ · control Worker prod ✓ · dispatch Worker prod ✓ · Forge var set ✓
  (or: SKIPPED — <which> creds absent → no-op; deploy did NOT happen)
- Prod smoke (e2e happy-path): PASS | FAIL | self-skipped
- check-version: Forge <ver> · control <ver> · dispatch <ver>
- Spot check (this delta): <check>: PASS|FAIL|SKIPPED  (or N/A — <justification>)
```

Then flip any related tracker tickets (e.g. mark Multica issues as done if they shipped in this tag).

## Error Handling

- **release.yml fails** — report which job/step (Cloudflare deploy, Forge deploy, var-set, or smoke), link the
  run, stop. The Release was already published, so a partial deploy may need manual follow-up.
- **Deploy self-skipped (green but no-op)** — the prod secrets are missing. The release shipped nothing; treat
  as NOT released. Fix the prerequisites, then re-run `release.yml` (re-publish or `gh run rerun <id>`).
- **Smoke fails** — a post-deploy production issue; report and investigate. Do not auto-rollback.
- **check-version mismatch** — the live build isn't the expected tag; investigate before declaring success.

## Important Notes

- A release deploys **Forge prod AND both Cloudflare prod Workers together** — that is what "release" means
  here. Don't call it released until all three are confirmed live (Step 6).
- **Confirm with the user before publishing any release** (irreversible, externally visible, fires prod deploy).
- **Never ship placeholder / empty notes.**
- **`K_GRANT` must be byte-identical** between the control and dispatch Workers for the same env, or every serve
  grant fails closed (401). When rotating it, set it in BOTH `wrangler-remote.toml` and `wrangler-dispatch.toml`
  for production.
- A paid Marketplace app must enforce licensing **before Submit-for-review** (see EAG-92). Releasing the deploy
  pipeline is separate from making the Marketplace listing public.
