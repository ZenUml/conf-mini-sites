---
name: babysit-pr
description: Monitor and fix failing GitHub Actions CI checks on PRs for ZenUml/conf-mini-sites. Use when the user says "babysit PR", "check PR status", "fix CI", "PR is failing", "watch this PR", "why is CI red", or when used with /loop to continuously monitor a PR. Also use when E2E test flakiness, typecheck issues, or unit test failures block merging. Triggers on any PR monitoring, CI failure diagnosis, or automated fix-and-retry workflow.
---

# Babysit PR

Monitor a GitHub Actions PR, diagnose failures, attempt fixes, and retry — up to 3 times total.

## Scope

This skill targets **ZenUml/conf-mini-sites**. All commands run from the repo's root directory. (Replace `OWNER` with the real GitHub org/user once the remote is configured.)

## CI Pipeline Overview

The CI workflow runs on every push and does:

1. **Typecheck + unit tests** — `pnpm typecheck` + `pnpm test`
2. **Forge UI build** — `pnpm -C forge-app install --frozen-lockfile` + `pnpm -C forge-app build:ui`
3. **E2E** — Playwright `api` project hits the deployed Workers with the shared secret (no browser/login). Gated to run on non-Draft PRs.

## Step 1: Find the PR

Resolve which PR to babysit, in this priority order:

1. **Explicit PR number** — if the user provided one (e.g., `#123`), use it
2. **Current branch PR** — run `gh pr view --json number,title,headRefName,state,isDraft,statusCheckRollup`
   > **WARNING**: Do NOT add `--repo` to this command. `gh pr view` without `--repo` infers the repo from the current directory's git remote, which is correct. Adding `--repo` requires an explicit PR number/branch argument and breaks branch inference, causing "argument required when using the --repo flag".
3. **Recently failed PR** — if no PR on current branch, find the most recent failed PR:
   ```bash
   gh run list --repo ZenUml/conf-mini-sites --status failure --limit 5 --json databaseId,headBranch,event,createdAt,conclusion,name
   ```
   Filter to runs created within the last 10 minutes. If multiple, pick the most recent.

If no PR is found, tell the user and stop.

### Note the PR's draft state

After finding the PR, check `isDraft`. This affects which jobs are expected to run:

| State | Jobs that run | Jobs that are `skipped` (and that's fine) |
|---|---|---|
| **Draft** | Build / typecheck / unit tests | E2E |
| **Ready for Review** | Build / typecheck / unit tests, E2E | — |

When watching a Draft PR, do NOT wait for the E2E job — it will be `skipped`, which is the designed behaviour, not a failure. If the user expected E2E to run, suggest marking the PR Ready for Review (`gh pr ready <PR>`) or running `/ship-branch`.

## Step 2: Check CI Status

```bash
gh pr checks <PR_NUMBER> --repo ZenUml/conf-mini-sites
```

### Build the expected-jobs set FIRST, based on draft state

This is the most important step — your evaluation of "did CI pass?" depends on it.

- **`isDraft === true`**: expected jobs = build / typecheck / unit tests. The E2E job is **expected to be `skipped`** — treat that as success, not failure, and never wait for it.
- **`isDraft === false` (Ready)**: expected jobs = build / typecheck / unit tests, E2E. All must reach success.

### Evaluate

- **All expected jobs passed** (and skipped jobs are the right ones): report success and stop.
- **Some expected jobs still pending/in_progress**: wait. Use `gh run watch <RUN_ID> --repo ZenUml/conf-mini-sites` (10-minute timeout). Then re-evaluate.
- **An expected job failed**: proceed to Step 3.
- **An expected job was unexpectedly `skipped`** (e.g. E2E skipped on a Ready PR): this is a configuration bug, not a normal failure. Report it: "Expected the E2E job to run on this Ready PR but it was skipped — check the workflow `if:` condition or the PR's draft state."

## Step 3: Diagnose Failures

For each failed check, pull the logs:

```bash
gh run view <RUN_ID> --repo ZenUml/conf-mini-sites --log-failed
```

Categorize the failure:

| Category | Indicators |
|----------|-----------|
| **Unit test failure** | Failures in `pnpm test`, vitest output |
| **Typecheck failure** | `tsc --noEmit` / TypeScript errors |
| **Forge UI build failure** | `build-ui.mjs` / esbuild errors, missing imports |
| **E2E test failure** | Playwright `api` failures against the deployed Workers — non-2xx responses, assertion errors |
| **E2E flaky / infra** | Intermittent network issues, `net::ERR_` errors, transient Worker 5xx |
| **Grant 401** | Every grant request returns 401 — `K_GRANT` mismatch between Workers or unset `CONTROL_SHARED_SECRET` |
| **Merge conflict** | `CONFLICT`, `merge conflict`, cannot rebase cleanly |
| **Infra/runner** | Network timeouts, runner issues, npm/pnpm cache failures |

## Step 4: Attempt Fix

**Important**: Before fixing, make sure the local branch is up to date with the PR branch:
```bash
git fetch origin && git checkout <PR_BRANCH> && git pull origin <PR_BRANCH>
```

### Fix by Category

#### Unit Test Failure

1. **Reproduce locally**:
   ```bash
   pnpm test
   ```
2. **Fix the code or test**
3. **Verify**: `pnpm test`
4. **Commit and push**

#### Typecheck Failure

1. **Reproduce locally**:
   ```bash
   pnpm typecheck
   ```
2. **Fix the type error** — usually a bad signature, missing import, or stale type
3. **Verify**: `pnpm typecheck`
4. **Commit and push**

#### Forge UI Build Failure

1. **Reproduce locally**:
   ```bash
   pnpm -C forge-app install --frozen-lockfile && pnpm -C forge-app build:ui
   ```
2. **Read the error** — usually a missing import or a `build-ui.mjs` config issue. A `--frozen-lockfile` failure means `forge-app/pnpm-lock.yaml` is out of sync with its `package.json`; update the lockfile.
3. **Fix, verify locally, commit and push**

#### E2E Test Failure

The E2E `api` project hits the deployed Workers with the shared secret (no browser). Distinguish between:

- **Deterministic failure** (same test fails consistently, error points to a code bug): Fix the code, not the test.
- **Flaky failure** (test passed before, no code changes in test area): Re-run the failed jobs:
  ```bash
  gh run rerun <RUN_ID> --repo ZenUml/conf-mini-sites --failed
  ```

Common E2E failure patterns:
- **401 on every grant** — `K_GRANT` must be byte-identical in BOTH Workers (remote mints serve grants, dispatch verifies them) and `CONTROL_SHARED_SECRET` must be set. A mismatch fails closed. This is the single most likely operational failure; check the secrets first.
- **Worker 5xx / timeout** — the deployed Worker may be down or mid-deploy; re-run after confirming the Workers are deployed.
- **Assertion mismatch** — a behavior change in the dispatch or control Worker.

#### E2E Flaky / Infra

1. **Re-run the failed jobs**:
   ```bash
   gh run rerun <RUN_ID> --repo ZenUml/conf-mini-sites --failed
   ```
2. If it fails again with the same infra error, report to user — this is outside our control.

#### Merge Conflict

1. **Report to user** — do NOT auto-resolve merge conflicts. Show what's conflicting and ask for guidance.

#### Infra/Runner

1. **Re-run the failed job**:
   ```bash
   gh run rerun <RUN_ID> --repo ZenUml/conf-mini-sites --failed
   ```
2. If it fails again with the same infra error, report to user.

## Step 5: Push and Monitor

After applying a fix:

1. **Run local validation** before pushing (when the failure category allows local reproduction):
   ```bash
   pnpm typecheck                                                   # typecheck
   pnpm test                                                        # unit tests
   pnpm -C forge-app install --frozen-lockfile && pnpm -C forge-app build:ui   # Forge UI build
   ```
2. **Commit with a clear message**:
   ```bash
   git add <specific files>
   git commit -m "fix: <what was fixed> to pass CI"
   ```
3. **Push**:
   ```bash
   git push origin <PR_BRANCH>
   ```
4. **Wait for CI** — use `gh run watch` on the new run
5. **Evaluate result** — go back to Step 2

## Step 6: Retry Budget

Track attempts. Each "attempt" is one push-and-wait cycle (or one re-run for flaky failures).

- **Maximum 3 attempts total**
- After each failed attempt, re-diagnose from scratch (Step 3) — the failure mode may have changed
- **If a test passes on retry without code changes**, flag it as potentially flaky:
  > "Test `<name>` passed on retry without changes — likely flaky. Consider investigating stability."
- **After 3 failed attempts**, stop and report:
  - What was tried
  - What the current failure is
  - Your best theory for root cause
  - Suggested next steps for the user

## Step 7: Summary Report

After babysitting completes (success or exhausted retries), produce a brief report:

```
## PR #<number> Babysit Report
- **Status**: [PASSED | FAILED after N attempts]
- **Failures found**: <list of categories>
- **Fixes applied**: <list of commits pushed>
- **Flaky tests**: <any tests that passed on retry without changes>
- **Manual attention needed**: <anything unresolved>
```

## Safety Rules

- **Never force-push** — always regular `git push`
- **Never resolve merge conflicts automatically** — report and ask
- **Never push while CI is still running** from a previous attempt — wait for it to finish first
- **Always verify fixes locally** before pushing (except E2E which requires deployed Workers)
- **Check for in-progress CI** before pushing — avoid wasting CI minutes on runs that will be superseded
