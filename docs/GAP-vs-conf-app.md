# Parity Gap List: conf-mini-sites → conf-app

- **Date:** 2026-06-17
- **Reference (mature sibling):** `conf-app` (`/Users/pengxiao/workspaces/zenuml/conf-app`)
- **Target (this project):** `conf-mini-sites`
- **Method:** 5-agent comparison across CI/CD, Claude skills, E2E tests, and env/config; verified against the real filesystem.

## Headline

conf-mini-sites is **"scaffold complete, automation zero"** while conf-app is a fully-industrialized sibling. The single largest gap dwarfs the others: **conf-mini-sites has no `.github` directory at all** — no CI, no deploy, no release, no smoke tests — despite already owning every runnable ingredient (20 vitest unit tests, a `tsc --noEmit` typecheck script, a 20-block Playwright E2E suite with OTP auth, two Cloudflare Workers, and a Forge app). conf-app ships 8 workflows + a composite action, ~42 Claude skills + a `settings.local.json`, a 133-test E2E rig with sharding/page-objects/self-healing auth, and committed env templates.

The good news: conf-mini-sites is **single-variant**, so the bulk of conf-app's complexity (lite/full/diagramly fan-out, `yq` manifest surgery, 4-way sharding) does **not** need porting — the parity target is far smaller than conf-app's raw size suggests. No committed secrets in either repo.

Legend: 🔴 high · 🟡 medium · 🟢 low · — skip.

---

## 1. CI/CD (GitHub Actions) — zero today; every row is net-new

| Gap | Sev | What conf-app has | What to add to conf-mini-sites |
|---|---|---|---|
| **PR/push gate (test + typecheck)** | 🔴 | `build-test-deploy.yml` `build` job: `pnpm install --frozen-lockfile --ignore-scripts` + `pnpm test:unit`, paths-ignore + cancel-superseded concurrency | New `.github/workflows/ci.yml` adapting that job. Run **both** `pnpm test` (vitest) **and** `pnpm typecheck` (CMS uniquely has a typecheck script worth gating that conf-app doesn't even run). Trigger on push + PR. Highest ROI — scripts + 20 tests already exist. |
| **E2E Playwright workflow** | 🔴 | `e2e-test.yml` (reusable): one TOTP auth job, daily session cache, `storageState` artifact, 4-way `--shard` matrix | New `e2e.yml` adapting it. Start simpler: single job, `--project=api` (no login) always-on as the gate, `ui` behind it when Forge/Confluence secrets present. `otp.ts`/`login.ts` helpers already match conf-app's shape. **No sharding** at 20 tests. |
| **Cloudflare Workers deploy** | 🔴 | `deploy-cron-worker` job: `npx wrangler deploy --env stg\|production`, gated on `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` | Deploy **both** `wrangler-dispatch.toml` + `wrangler-remote.toml`. **PREREQ:** both tomls are `-dev`-named with no `[env.*]` sections — add `[env.staging]`/`[env.production]` (distinct worker names) first, else every deploy clobbers the same dev worker. |
| **Forge prod deploy on release** | 🔴 | `release.yml`: `pnpm forge:deploy:*:prod` + `forge variables set` on GitHub release, per-variant `yq` surgery | New `release.yml` modeled on conf-app's, **minus** all lite/full/diagramly branching. **PREREQ:** `forge-app/package.json` has **no** `forge:deploy`/`forge:install` scripts — add those first. Collapses to one build + one `forge deploy -e production`. |
| **Scheduled prod smoke** | 🟡 | `smoke-test.yml`: cron `0 2 * * *` chaining lite→full→diagramly prod E2E | `smoke-test.yml` with `schedule` + `workflow_dispatch`, single job calling the reusable e2e happy-path. Defer until a prod env exists. |
| **Post-release smoke gate** | 🟡 | `release.yml` `smoke-test` job: prod E2E immediately after deploy | `needs: [release]` smoke job — direct single-variant port. |
| **Block external fork PRs** | 🟢 | `block-external-prs.yml`: `pull_request_target` auto-closes fork PRs before untrusted code runs | Port ~verbatim (~25 lines, repo-agnostic) once any workflow handles secrets. |
| Composite `wrangler-publish` action · `e2e-test-ruixiang.yml` | — | reused publish action · magic-branch on-demand E2E | **Skip** — born of the 3-variant matrix; inline steps / fold a `workflow_dispatch` input into `e2e.yml` instead. |

---

## 2. Claude Skills + Settings (`.claude/`) — none today; ~12 of conf-app's 42 worth porting

CMS `.claude/` holds only `worktrees/` + `.DS_Store`. conf-app has ~42 skill dirs + `settings.local.json`.

| Gap | Sev | What conf-app has | What to add to conf-mini-sites |
|---|---|---|---|
| **`settings.local.json`** | 🔴 | permissions allowlist (git/pnpm/forge/gh/wrangler/Read), PreToolUse hook, `enabledMcpjsonServers:[playwright]` | Adapt: keep generic allows, swap in CMS's real scripts (`pnpm typecheck`, `vitest run`, wrangler), enable Playwright MCP. **SECURITY: do NOT copy conf-app's inlined `FORGE_API_TOKEN` Bash() allow entry — it's a live secret** (and should be rotated out of conf-app too). |
| **PR/branch skills** (`validate-branch`, `submit-branch`, `land-pr`, `ready-pr`, `ship-branch`, `babysit-pr`) | 🔴 | 6 near-project-agnostic git+gh+CI lifecycle skills | Port all six. Edit repo slug → CMS remote, `main` → `master`, and validate cmd → `pnpm typecheck && pnpm test` (+ forge-app `build:ui`). Lowest-effort/highest-value. |
| **`forge-tunnel`** | 🔴 | build→deploy:dev→upgrade:dev→Vite→tunnel; documents per-worktree env trap, stale-Vite-port | Adapt to CMS's `forge-app/build-ui.mjs` + manifest. Worktree-env + stale-port caveats transfer verbatim. |
| **`local-dev`** | 🟡 | Workers + Vite port checks, D1 migrate local | Adapt: swap to CMS's explicit `--config wrangler-dispatch.toml`/`wrangler-remote.toml`; note the WfP dispatch layer. |
| **Verification** (`spot-check`, `repro`, `create-test-page`, `forge-installs`, `check-version`) | 🟡 | AI Playwright-MCP check, bug-repro, REST page builder, install count, version label | Port; generalize macro-insertion → CMS upload/provision flow. |
| **PVT family · macro-ops · business/analytics** (`paywall`, `pvt-*`, `edit-macro`, `copy-macro`, `metrics`, `client-profile`, `diagramly-admin`, …) | — | ZenUML/Mixpanel/Marketplace-specific | **Skip** — write CMS-specific PVTs (`pvt-upload`, `pvt-provision`) later instead. |

---

## 3. E2E Tests — sound design, two real gaps (both login resilience)

CMS = 13 specs / 20 blocks / 7 helpers / 0 config-dir / 0 page-objects / 0 CI. conf-app = 41 specs / 133 blocks / 9 helpers / 5 config files / 2 page-objects / 6 e2e-wired workflows.

| Gap | Sev | What conf-app has | What to add to conf-mini-sites |
|---|---|---|---|
| **No CI wiring for e2e** | 🔴 | `e2e-test.yml` + 5 e2e-wired workflows; dedup'd auth, artifact reuse, shard matrix | (= §1 e2e row.) CMS's no-login `api` suite is the ideal first deterministic gate. |
| **`auth.setup` has no liveness/self-heal** | 🔴 | `isCachedSessionLive()`: opens cached `storageState`, probes `/overview`, re-logs-in only if bounced | Adapt into `tests/e2e/setup/auth.setup.ts`: probe `baseUrl+'/wiki'` in a throwaway context, skip login if authed, else `rm` + re-login. Prerequisite for safely caching auth in CI. Biggest single stability win. |
| No spec-level parallelism/sharding | 🟡 | `--shard=N/4` + suites-as-projects | Mirror once CI exists; api shards cleanly. Low priority at 20 tests. |
| No page-object model | 🟡 | `pages/MacroPage.ts`, `pages/EditorPage.ts` | Optional: wrap `helpers/forge.ts` into a `PublisherPage`. Low urgency — helpers already isolate frame brittleness. |
| Single hardcoded `storageState` path · no cross-worker API lock | 🟢 | `config/auth-state.ts` per-domain · `utils/api-lock.ts` | Not needed at single-site / `workers:1`. Parameterize only when a 2nd env / parallel workers arrive. |
| No regression bucket | 🟢 | `regression.spec.ts` + `cross-cutting.spec.ts` | Adopt the habit: add `tests/e2e/{ui,api}/regression.spec.ts` as bugs surface. |
| No `tests/e2e/.env.example` + no dotenv autoload | 🟢 | `.env.example` + `import 'dotenv/config'` | Add `.env.example` with key NAMES from `helpers/env.ts` + `import 'dotenv/config'`. Trivial. |

> ✅ CMS's `tests/e2e/.auth/state.json` (~74KB session state) is gitignored, **not** committed. No leak.

---

## 4. Env / Config Files — clean on security; gaps are documentation/onboarding

No committed secrets in **either** project. CMS `.gitignore` correctly covers `.env`/`.env.*`/`.dev.vars`. Comparison by key NAMES only.

| Gap | Sev | What conf-app has | What to add to conf-mini-sites |
|---|---|---|---|
| **No `.dev.vars.example` / required-vars manifest** | 🔴 | env templates as the onboarding contract | Add `.dev.vars.example` (`WFP_API_TOKEN=`, `K_GRANT=`, `CONTROL_SHARED_SECRET=`) + a forge-app env template. **Enumerate every name code reads — including `FORGE_JWKS_URL`, which appears in no config file or comment today.** |
| **Secrets not documented as a coherent set** | 🔴 | provisioning + invariants across scripts/CI | Add an "Environment & secrets" section to `README.md` (or `docs/ENV.md`) listing, per deployable (remote Worker / dispatch Worker / Forge resolver): each var name, `[vars]` vs secret, and the **`K_GRANT` "must be byte-identical in both Workers" invariant** (currently only in a `wrangler-remote.toml` comment). Mismatched `K_GRANT` / unset `CONTROL_SHARED_SECRET` is this app's single most likely operational failure (fail-closed 401 on every grant). |
| No scripted secret provisioning | 🟡 | `forge variables set` + `wrangler ... secret put` reproducibly in CI | Add npm scripts (`secrets:remote`, `secrets:dispatch`) wrapping `wrangler secret put … --config …` + a `forge variables set CONTROL_SHARED_SECRET --encrypt` step. Defer until a deploy pipeline exists. |
| No per-environment config split | 🟡 | `wrangler-{dev,stg,prod}.toml` + `[env.production.*]` | Add `[env.staging]`/`[env.production]` with prod namespace + URLs. **Also the prereq blocking the §1 Workers-deploy workflow.** |
| No active-config selection helper · no `.node-version`/`.npmrc` | 🟢 | `forge:use`/`wrangler:link` symlinks · pinned toolchain | Largely skip (explicit `--config` is clearer). Optionally copy `.node-version`/`.npmrc` for contributor consistency. |

---

## Recommended order of attack

The first four are cheap and unblock everything else.

1. **`ci.yml` — push/PR gate running `pnpm test` + `pnpm typecheck`.** Highest ROI: both scripts + 20 unit tests already exist; adapt conf-app's `build` job. Nothing guards regressions/type errors on master today.
2. **`.dev.vars.example` + README "Environment & secrets" section.** Trivial, and the only artifact capturing the `K_GRANT`-identical-across-both-Workers invariant + the otherwise-undocumented `FORGE_JWKS_URL`. Prevents the app's most likely fail-closed failure.
3. **De-secreted `.claude/settings.local.json`** (adapt conf-app's, swap in CMS scripts, enable Playwright MCP, **omit the `FORGE_API_TOKEN` allow line**). Kills permission-prompt friction for all later work.
4. **Port the 6 PR/branch skills** (`validate-branch`, `submit-branch`, `land-pr`, `ready-pr`, `ship-branch`, `babysit-pr`) — edit repo slug + branch + validate command.
5. **Add session-liveness self-heal to `tests/e2e/setup/auth.setup.ts`** (port `isCachedSessionLive()`). Stabilizes the flakiest E2E step; prereq for CI auth-cache.
6. **`e2e.yml` — reusable Playwright workflow**, `--project=api` (no login) as the always-on gate, `ui` behind it. Depends on #5.
7. **Deploy path — prereqs first, then workflows.** Prereq A: `[env.staging]`/`[env.production]` in both tomls (currently `-dev` only). Prereq B: `forge:deploy`/`forge:install` scripts in `forge-app/package.json` (none exist). *Then* `wrangler deploy` (both Workers) + single-variant `release.yml` for Forge prod.
8. **Security + smoke hardening once secrets are live**: port `block-external-prs.yml` verbatim, then `smoke-test.yml` (cron) + a post-release smoke gate once a prod env exists.

## Explicitly NOT worth porting

The PVT family, all macro-ops skills (`edit-macro`/`copy-macro`/`graph-macro`/…), all business/analytics skills (`paywall`/`metrics`/`client-profile`/…), the `e2e-test-ruixiang.yml` workflow, the `wrangler-publish` composite action, 4-way sharding, the `api-lock`, per-domain auth-state files, and all lite/full/diagramly variant fan-out + `yq` manifest surgery — these exist only to serve conf-app's 3-variant ZenUML/Mixpanel/Marketplace reality, which conf-mini-sites does not have.
