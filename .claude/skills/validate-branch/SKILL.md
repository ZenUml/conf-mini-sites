---
name: validate-branch
description: Run local validation checks on the current branch before shipping. Use when the user says "validate", "check branch", "am I good", "run tests", "preflight", "is this ready", or wants to verify their branch passes all checks before pushing or creating a PR. Also use as a precondition check before invoking submit-branch or ship-branch.
---

# Validate Branch

Verify the current branch passes all local checks. Run anytime before shipping, or just to check your work.

> **No git remote yet.** This repo has no `origin` configured. Validation runs entirely locally and needs no remote, but the push/PR steps in `submit-branch` / `ship-branch` will fail until you add one:
> ```bash
> git remote add origin git@github.com:ZenUml/conf-mini-sites.git
> ```

## Steps

Run from the repo's root directory. Stop on first failure.

### 1. Typecheck, unit tests, and Forge UI build

Run the following in order.

**Typecheck + unit tests**

```bash
pnpm typecheck && pnpm test
```

`pnpm typecheck` is `tsc --noEmit` over the whole tree; `pnpm test` is `vitest run`. If either fails, report the errors (failing test names for tests) and stop.

**Forge UI build**

Build the Forge UI to catch bundling and import errors in the separate `forge-app` package:

```bash
pnpm -C forge-app install --frozen-lockfile && pnpm -C forge-app build:ui
```

`forge-app` is a SEPARATE pnpm package with its own lockfile, so it must be installed before its `build:ui` script (`node build-ui.mjs`) can run. If typecheck and tests passed but this fails, it's usually a missing import or a build-ui.mjs config issue.

### 2. Feature smoke test

After Step 1 passes, exercise the feature against a real Confluence site. This is the only step that proves the user-visible behavior actually works.

**When to skip:** docs-only, build/CI config.

#### 2a. Write a spot check plan first

Write the plan (behavior, target site/page, assertions, expected outcomes) **before** touching the browser.

#### 2b. Choose how to test

**Option A — Forge tunnel (for unreleased frontend changes)**

Use when your changes have not been deployed to any dev site yet.

1. Build the Forge UI (`pnpm -C forge-app build:ui`), deploy with `forge deploy`, install/upgrade on the dev site, then `forge tunnel`. Wait until the tunnel logs `Listening for requests on local port`.
2. Target `lite-dev.atlassian.net` (the E2E default site) or another pre-connected dev site. Do **not** test on production.
3. Verify the macro renders the current branch's build, not a stale public deploy.

**Option B — Direct dev site (for already-deployed dev builds)**

Use when the Workers + Forge app have already been deployed to dev. No tunnel needed.

1. Navigate directly to `lite-dev.atlassian.net` (or the relevant dev site) in Playwright.
2. Confirm the macro reflects the expected build.

#### 2c. Execute the test plan

Use Playwright MCP (`mcp__playwright__*`) — ad-hoc only; do not write spec files.

For each `[ ]` assertion in your plan:
1. Perform the interaction
2. Take a screenshot
3. Assert the actual outcome matches the expected outcome

If every interaction matches: Step 2 **PASS**.
If any diverges: Step 2 **FAIL** — include the screenshot path + which assertion failed. Fix the underlying code, then re-run from Step 1.

**Common gotchas (Forge iframes, version labels):**

- *Tunnel serves stale code.* Re-run `pnpm -C forge-app build:ui` and hard-refresh (Cmd+Shift+R).
- *Wrong site.* Confirm you're on the dev site, not production.
- *Grant 401.* `K_GRANT` must be byte-identical in BOTH Workers (remote mints serve grants, dispatch verifies them) and `CONTROL_SHARED_SECRET` must be set — a mismatch fails closed with a 401 on every grant. If the macro 401s, check the secrets first.

## Output

Report one of:

- **PASS** — Step 1 (typecheck, unit tests, Forge UI build) and Step 2 passed; branch is ready to push
- **FAIL** — which part failed (typecheck vs unit tests vs Forge UI build vs Step 2), the error output (or failing interaction + screenshot for Step 2), and a one-line suggestion

If Step 2 was skipped, say so explicitly: "Step 2 skipped — docs-only or build/CI config (per **When to skip** above)."

## What CI does beyond this

After you push, CI runs typecheck/test/build plus E2E `api` tests against the deployed Workers (no browser/login). The smoke step in Step 2 catches Confluence-integration regressions earlier — before they burn CI time.
