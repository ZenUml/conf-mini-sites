---
name: land-pr
description: Merge a green PR to master and verify CI succeeds. Use when the user says "merge", "land", "land PR", "merge this", or when a PR has passed CI and is ready to merge. This does NOT deploy to production — that is a separate release step.
---

# Land PR

Merge a green PR to `master` and verify CI succeeds. Merge to `master` triggers the post-merge CI run — it does NOT deploy to production. Production release is a separate manual step.

## What happens on merge to master

1. Build + typecheck + unit tests
2. E2E `api` tests run against the deployed Workers

Production deployment is a separate, manual step (deploy the Workers and the Forge app), not triggered by merge.

## Preconditions

```bash
gh pr view <PR_NUMBER> --json state,isDraft,mergeable,statusCheckRollup,reviewDecision
```

Verify ALL of these:

1. **PR is the right one** — confirm PR number with the user if ambiguous
2. **No pending reviews** — no requested changes outstanding
3. **Branch is up to date** — no merge conflicts with master
4. **CI is green AFTER the Draft gate is lifted** — see Step 1 below

If a precondition fails (other than Draft), report which one and stop.

## Steps

### 1. Lift the Draft gate if needed

If `isDraft === true`, this PR may not have been E2E-verified (the Draft gate can skip the E2E job). `/land-pr` means "I want this merged" — so flip it Ready, wait for the resulting CI run with E2E to go green, then merge. Don't refuse and don't merge without verification.

```bash
gh pr ready <PR_NUMBER> --repo ZenUml/conf-mini-sites
```

Tell the user: "PR is Draft → marking Ready and waiting for CI to verify E2E before merge."

Then delegate to `/babysit-pr <PR>` (or watch inline). If the new CI run fails, stop and report — do not merge.

If `isDraft === false` already, skip this step.

### 2. Verify CI green

Confirm CI is green and the E2E job is among the passed checks (not skipped). Re-run the precondition checks. If anything is not green, stop and report.

### 3. Merge

Fetch the repo's enabled merge strategies and pick the right flag (GitHub requires one when multiple strategies are enabled):

```bash
MERGE_FLAG=$(gh api repos/ZenUml/conf-mini-sites \
  --jq 'if .allow_squash_merge and (.allow_merge_commit | not) and (.allow_rebase_merge | not) then "--squash"
        elif .allow_rebase_merge and (.allow_merge_commit | not) and (.allow_squash_merge | not) then "--rebase"
        else "--merge" end')

gh pr merge <PR_NUMBER> --auto --delete-branch $MERGE_FLAG
```

Logic: use `--squash` if only squash is enabled, `--rebase` if only rebase is enabled, otherwise `--merge` (GitHub's default when multiple strategies are on). Do not override with `--squash` or `--rebase` unless the user explicitly requests it.

Using `--auto` arms auto-merge so GitHub merges when all checks pass.

### 4. Wait for merge

```bash
gh pr view <PR_NUMBER> --json state
```

Poll until state is `MERGED`. Timeout after 5 minutes.

### 5. Monitor CI on master

After merge, the CI workflow runs on master. Watch it:

```bash
gh run list --repo ZenUml/conf-mini-sites --branch master --limit 1 --json databaseId,status,conclusion
gh run watch <RUN_ID> --repo ZenUml/conf-mini-sites
```

## Output

Report one of:

- **LANDED** — merged, CI green on master
- **MERGE BLOCKED** — which precondition failed
- **CI FAILED** — merged but CI failed on master, with error details

## On CI failure on master

**Do NOT auto-rollback.** Report:

1. The merge commit SHA
2. The failing workflow run URL
3. Which job failed (build, typecheck, unit tests, or E2E)
4. The error output

The user decides whether to hotfix or revert.

## Does NOT

- Deploy to production (separate manual release step)
- Fix CI failures
- Create PRs (use `/submit-branch`)
- Run local tests (use `/validate-branch`)
