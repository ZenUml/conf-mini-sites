# Git Workflow Policy

Adapted from conf-app's `docs/policies/git-workflow.md` (decision 5 in `CONTEXT.md`). Differences from
conf-app: the default branch is **`master`**, and this repo keeps its own stricter rule that **nothing is
pushed to any remote without the user's explicit permission** (`CLAUDE.md`, Safety) — the direct-to-master
exceptions below govern *where a commit may land*, not whether it may be pushed.

## Never commit directly to `master`

Always create a feature branch for new work.

**Exceptions** — these may be committed directly to `master`:

1. **`.md`-only changes** (docs, CLAUDE.md, CONTEXT.md, README, ADRs).
2. **Agent-skill changes confined to `.claude/skills/**`** — any file type, including the helper scripts
   (`.mjs`, `.sh`, `.py`) beside a `SKILL.md`. A skill is agent tooling, not shipped product code: it cannot
   break a build or reach a customer, and `ci.yml` ignores `**.md`, `docs/**` and `.claude/**` on both
   triggers, so a branch + PR buys **zero** verification signal. Validate the same way you would on a branch
   (`bash -n`, `python3 -m py_compile`, `node --check`, a `--help` run) and commit.

Both exceptions require the change to be **confined** to those paths. The moment a commit also touches
`src/`, `forge-app/`, `tests/`, `wrangler-*.toml`, `migrations/` or `.github/`, it is a normal code change →
feature branch.

Note that `deploy.yml` has no path filter: **every push to `master`, docs included, redeploys the staging
Workers.** That is a no-op for docs-only pushes but it does spend a deploy run; it is the reason the
exceptions are for small, self-contained commits, not for batching.

## The primary checkout stays on `master`

`/Users/pengxiao/workspaces/mini-sites/conf-mini-sites` — the primary checkout — stays on `master`. Feature
work goes in a worktree beside it (`../conf-mini-sites-<feature>`), never in the primary directory.

**Why:** a branch can only be checked out in one worktree at a time. When the primary directory sits on a
feature branch, `git switch master` fails with `fatal: 'master' is already checked out at …` the moment any
worktree holds it, and the two direct-to-`master` exceptions above become awkward. Pinning `master` to the
primary checkout removes that class of failure.

**Setup cost per new worktree** (nothing here is automated yet):

1. `pnpm install` at the root and `pnpm -C forge-app install` — cheap on real disk: pnpm imports from the
   store with APFS clonefile, so `du` overstates it. Read real usage from `df`, never from `du`.
2. `git submodule update --init private` for the shared private handbook.
3. Copy the git-ignored config, which git does not carry into a worktree:
   `tests/e2e/.env` (api project secrets), `tests/e2e/.auth/state.json` (cached Confluence login for the
   `ui` project), `.playwright-mcp/profile.toml`, `.mcp.json`, `.claude/settings.local.json`.
   Forge CLI credentials come from `FORGE_EMAIL` / `FORGE_API_TOKEN` in the environment (sourced from
   `../../zenuml/conf-app/.env.forge.local`), not from a file in this repo.

Worktrees accumulate. Run the global `worktree-cleanup` skill periodically; it removes the ones whose PR is
merged. Never remove a worktree that shows uncommitted changes you did not make.

## When you do NOT need a worktree (or a branch)

A worktree is only ever needed to keep two *working trees* from colliding:

- **`.md`-only and `.claude/skills/**`-only changes** go straight to `master` (per the exceptions above). If
  the primary tree is clean, `git switch master && git pull`, commit. Spin up a worktree only if that tree
  holds **another session's** uncommitted changes that block a clean switch.
- **Git-ignored files only** (`.env`, auth state, local `node_modules`, scratch screenshots): nothing to
  commit — no branch, no worktree, no PR.

## Starting work on an issue

**If on `master`** (the normal state of the primary checkout):

```bash
git worktree add ../conf-mini-sites-<feature> -b <feature-branch> master
```

**If on a different feature branch** (a worktree, or a primary checkout that drifted):

1. `git status`.
2. **If clean** — `git switch master && git pull`, then create the worktree as above.
3. **If dirty** — stop and offer: (a) commit the current changes first, then create the worktree; (b) leave
   this tree untouched and create the worktree straight from `master`.

## Collaboration ground rules — never disrupt another session's working tree

The working tree is shared state. Another Claude session, or the user, may have **uncommitted in-flight
changes** on the current branch.

**The rule:** if `git status` shows uncommitted changes you did not make, you MUST NOT:

- `git switch` / `git checkout <other-branch>` — it drags those changes onto the other branch.
- `git reset --hard`, `git restore --staged --worktree`, `git clean -fd` — they destroy the other session's work.
- `git stash` someone else's changes — the owner does not know to look there.

**Instead:** create a NEW worktree from `master` and work there. Stage only your own paths (`git add <path>`,
never `git add -A`) when you commit from a tree that carries someone else's edits.

**Detection signal:** files that show as `M` / `A` / `??` in `git status` and do not appear in your own
conversation history. When in doubt, ask before any destructive or branch-switching operation.

**Why this rule exists:** in conf-app a prior session wiped hours of in-flight work by checking out a new
branch on top of uncommitted edits and later resetting — two legitimate-looking git operations that
together silently destroyed another session's work. On 2026-09-09 this checkout carried another session's
`tests/e2e/helpers/forge.ts` and `docs/video/workflow.md` edits for a full day; the skill-port PR was built
in a worktree for exactly this reason.
