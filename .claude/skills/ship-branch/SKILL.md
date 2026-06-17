---
name: ship-branch
description: Create a branch, run local validation, create a PR and **merge** on master.
  Use when the user says "ship", "ship it", "ship this branch",
  "merge this", or wants to go from local branch to merged in one command. Stops at the first failure.
  Does NOT deploy to production — that is a separate release step after shipping.
---

# Ship Branch

Orchestrate the full path from local branch to merged on master. This skill composes sub-skills in sequence, stopping at the first failure.

**Note:** This gets your code to master with CI green. Production deployment is a separate manual step (deploy the Workers and the Forge app).

**Markdown-only exception:** If the entire PR diff is Markdown files only, the CI workflow may be intentionally skipped by `paths-ignore`. In that case, do not wait for green CI and do not require `/land-pr`'s E2E precondition. Run local validation, submit the PR as Ready, verify the PR is mergeable, merge it directly, and report CI as skipped by path filters.

## Flow

```
validate-branch → FAIL → stop, report
     | PASS
submit-branch (as Ready, not Draft) → FAIL → stop, report
     | single CI run with E2E included
babysit-pr → EXHAUSTED → stop, "CI blocked"
     | GREEN (incl. E2E)
land-pr → BLOCKED → stop, report
     | MERGED
     done
```

Markdown-only flow:

```
validate-branch → FAIL → stop, report
     | PASS
submit-branch (as Ready, not Draft) → FAIL → stop, report
     | PR mergeable
merge directly → MERGED
     done → report CI skipped by path filters
```

## Steps

### Step 0: Create branch

If the current branch is master, create a new branch from it.

> **No git remote yet.** This repo has no `origin` configured. Add one before the push/PR steps can succeed:
> ```bash
> git remote add origin git@github.com:ZenUml/conf-mini-sites.git
> ```

### Step 1: Validate locally

Invoke `/validate-branch`. If it reports FAIL, stop and show the failure. Fix locally before shipping.

### Step 2: Submit as PR — Ready, not Draft

Push the branch and create the PR as **Ready for Review** (omit `--draft`). Ship-branch means immediate landing intent — there's no iterative phase, so Draft would only generate a redundant `ready_for_review` event when we flip it, triggering two CI runs unnecessarily.

```bash
git push -u origin <branch>
gh pr create --base master --title "<title>" --body "..."
```

Note: `/submit-branch` defaults to Draft. Override it here by running `gh pr create` directly without `--draft`. If a PR already exists for the branch, check its draft state — if Draft, flip it Ready now (`gh pr ready <PR>`), then proceed.

On success, note the PR number and URL.

### Step 3: Get CI green

Before invoking `/babysit-pr`, check whether the PR is Markdown-only:

```bash
gh pr diff <PR_NUMBER> --name-only
```

If every changed file ends in `.md`, skip `/babysit-pr`. The workflow has `paths-ignore` for Markdown docs, so there is no green CI to wait for. Record `CI: SKIPPED — markdown-only path filters`.

Invoke `/babysit-pr` with the PR number from Step 2. It will monitor CI (E2E runs because the PR is Ready from the start), diagnose failures, attempt fixes (up to 3 retries), and report back.

If babysit-pr exhausts all 3 retry attempts, stop and report "CI blocked" with the babysit report.

### Step 4: Land and verify

**Confirm with the user before merging** unless they explicitly said "ship it".

For non-Markdown changes, invoke `/land-pr` with the PR number. If merge is blocked, stop and report.

For Markdown-only changes, do not invoke `/land-pr`; its E2E precondition cannot be satisfied because CI is intentionally skipped. Instead:

1. Verify the PR is Ready, mergeable, and has no requested-changes review:
   ```bash
   gh pr view <PR_NUMBER> --json state,isDraft,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup
   ```
2. Fetch the repo's enabled merge strategies and merge directly:
   ```bash
   MERGE_FLAG=$(gh api repos/ZenUml/conf-mini-sites \
     --jq 'if .allow_squash_merge and (.allow_merge_commit | not) and (.allow_rebase_merge | not) then "--squash"
           elif .allow_rebase_merge and (.allow_merge_commit | not) and (.allow_squash_merge | not) then "--rebase"
           else "--merge" end')

   gh pr merge <PR_NUMBER> --delete-branch $MERGE_FLAG
   ```
3. Verify the PR state is `MERGED`.
4. Report `CI` as `SKIPPED — markdown-only path filters`.

On success, report the merge and note that production deployment is a separate manual step.

## Rules

- **Each step is a hard boundary.** No step reaches back to retry a previous step.
- **No auto-rollback.** Stop and report on any failure. The developer decides next steps.
- **Confirm before merge.** Pause and confirm with the user before the land-pr step unless they explicitly said "ship it".

## Output

Final report:

```
## Ship Report: <branch-name>
- Validation: PASS
- PR: #<number> (<url>)
- CI: GREEN
- Merge: SQUASHED into master (<sha>)
- Production: Not yet — deploy the Workers + Forge app to go to production
```

Markdown-only report:

```
## Ship Report: <branch-name>
- Validation: PASS
- PR: #<number> (<url>)
- CI: SKIPPED — markdown-only path filters
- Merge: MERGED into master (<sha>)
- Production: Not needed for docs-only changes
```

Or on failure:

```
## Ship Report: <branch-name>
- Validation: PASS
- PR: #<number>
- CI: FAILED — <job name>
- Stopped at: <step name>
- Details: <failure summary>
```
