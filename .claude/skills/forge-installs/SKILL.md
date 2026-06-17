---
name: forge-installs
description: >
  Count Conf Mini-Sites Forge app installs per environment (production / staging /
  development) plus the delta vs prior snapshots from 1 day and 7 days ago (which
  sites were added / removed since the last check). Use whenever the user asks
  "how many installs", "how many tenants", "how many sites have the mini-sites app",
  "install count", "any new installs", "did anyone uninstall", "active sites",
  "where is mini-sites installed", "list installs", "show installed sites".
  Source-of-truth is Atlassian's Forge platform via `forge install list` — there
  is one app id (no lite/full/diagramly variants), so the skill takes no variant
  argument.
---

# Forge App Install Counts + Deltas

Answers "how many installs does Conf Mini-Sites have?" *and* "what changed since last time?". Hits Atlassian's Forge API directly via the `forge` CLI. **Single app — one app id, no variant fan-out.**

## App identity

| App name (Atlassian-side) | `APP_ID` |
|---|---|
| Conf Mini-Sites | `2efdb7d9-ee5a-4294-b56a-b514e36e1a98` |

If this ever looks wrong, verify against `forge-app/manifest.yml` (`app.id`, the trailing UUID of the `ari:cloud:ecosystem::app/…`).

## Usage

```bash
python3 .claude/skills/forge-installs/scripts/check.py
```

No arguments — there is exactly one app.

The script:
1. Calls `forge install list` with `FORGE_APP_ID=<app-id>` set.
2. Strips ANSI colour codes, parses the box-drawing-char table, filters to data rows (env ∈ {production, staging, development}).
3. Counts rows per environment and prints the totals.
4. Saves a TSV snapshot under `~/.claude/cache/forge-installs-cms/<iso-timestamp>.tsv`.
5. Compares against the most recent snapshot from at least 1 day ago and from at least 7 days ago — prints added / removed sites and the net delta for each window.

## Output shape

```
Snapshot dir: /Users/<you>/.claude/cache/forge-installs-cms

=== Conf Mini-Sites  (appId=2efdb7d9-ee5a-4294-b56a-b514e36e1a98) ===
  Current installs:
    production        0
    staging           0
    development       1
    Total             1
  Δ past 1 day  (vs snapshot from 2026-06-16 08:00:00, net +1):
    Added (+1):
      + development   lite-dev.atlassian.net
  Δ past 7 days: no baseline yet — snapshot saved, rerun in 7d for a delta
```

If there's no usable prior snapshot (first run, or no snapshot older than the window), the script prints `no baseline yet — snapshot saved, rerun in <N>d for a delta` for that window. Don't surprise the user with a confusing "0 added, 0 removed" when the reality is "we don't know yet" — the script's wording handles this.

## Reporting it back to the user

Present the count + the two deltas. Sites in the added/removed lists are the most actionable info — surface the domain names verbatim. Example:

```
## Conf Mini-Sites installs  (0 prod / 0 stg / 1 dev — total 1)
Past 1 day:  +1 (lite-dev.atlassian.net)
Past 7 days: no baseline yet
```

When both deltas are 0 / `no baseline yet`, condense to a single line — don't pad with empty "Added: 0 / Removed: 0" bullets.

## Why snapshot-and-diff (not query a DB)

The CMS backend tracks **per-instance Workers** (one per embedded macro), not Forge **installs** (one per Confluence site). So there is no install mirror to query for "new installs in the past N days" — `forge install list` IS the source of truth. We snapshot its output ourselves and diff across runs: robust and deterministic. The trade-off: deltas only work once you've run this skill at least once per window — there's no historical backfill, and the first run correctly reports "no baseline yet" rather than fabricating a number.

> Note: the control Worker's instance store (`InstanceStore` / `D1InstanceStore`) answers a *different* question — "how many mini-sites are provisioned" — which can exceed the install count (one install hosts many macros). Don't conflate the two. Use this skill for installs; query the instance store for provisioned-mini-site counts.

## Auth troubleshooting

If `forge install list` fails with "Not logged in" or keychain errors, the underlying CLI call is dead and no snapshot-diffing helps:

1. `forge login` from a real Terminal (the prompts need a TTY).
2. Or set `FORGE_EMAIL` + `FORGE_API_TOKEN` env vars as the non-interactive path (the fastest unblock).

## Caveats

- **Output format is Atlassian-controlled.** The table column separator is `│` (a box-drawing character, not pipe `|`). If Atlassian changes the format, the parser silently skips all rows and reports 0 installs — that's the symptom. If you see it, run bare `forge install list` to inspect the new format. The script prints an explicit hint when the total is 0.
- **Snapshots are per-machine.** Stored under `~/.claude/cache/forge-installs-cms/` — so on a different laptop or after a reset, deltas restart from "no baseline yet". Intentional (no syncing personal cache across machines).
- **Snapshots accumulate.** One small TSV per run. Clean old ones with `find ~/.claude/cache/forge-installs-cms -name '*.tsv' -mtime +30 -delete`.
- **Status column ("Up-to-date" vs "App update available") is informational only.** A site that hasn't auto-upgraded yet is not broken.

## Related skills

- **check-version** — confirm *which build* of the app a given install is running (this skill counts installs; check-version reads the deployed version).
- **forge-tunnel** — test local app changes against a live site before they affect the install list.
