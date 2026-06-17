#!/usr/bin/env python3
"""Count Conf Mini-Sites Forge app installs per environment, with 1d / 7d deltas.

Source of truth is Atlassian's Forge platform via `forge install list` — there is no D1 mirror to second-guess
here (the CMS control Worker tracks per-instance Workers, not Forge installs). One app, ONE app id (no
lite/full/diagramly fan-out), so this script takes no variant argument.

It:
  1. Runs `forge install list` with FORGE_APP_ID set to the CMS app id.
  2. Strips ANSI colour, parses the box-drawing-char table, keeps rows whose env is production/staging/development.
  3. Counts rows per environment and prints totals.
  4. Saves a TSV snapshot under ~/.claude/cache/forge-installs-cms/<iso-timestamp>.tsv.
  5. Diffs against the most recent snapshot >=1 day old and >=7 days old, printing added/removed sites + net delta.
"""
import os
import re
import sys
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

# The Conf Mini-Sites Forge app. Single app, single id — verify against `manifest.yml` (app.id) if it ever
# looks wrong.
APP_ID = "2efdb7d9-ee5a-4294-b56a-b514e36e1a98"
APP_NAME = "Conf Mini-Sites"

CACHE = Path.home() / ".claude" / "cache" / "forge-installs-cms"
ENVS = ("production", "staging", "development")
ANSI = re.compile(r"\x1b\[[0-9;]*m")


def run_forge_list() -> str:
    env = {**os.environ, "FORGE_APP_ID": APP_ID}
    try:
        out = subprocess.run(
            ["forge", "install", "list"],
            env=env, capture_output=True, text=True, timeout=300,
        )
    except FileNotFoundError:
        sys.exit("`forge` CLI not found on PATH. Install it or run from a shell where `forge` works.")
    except subprocess.TimeoutExpired:
        sys.exit("timeout — `forge install list` took >5min. Bump timeout in the script if the install list is large.")
    text = ANSI.sub("", out.stdout)
    if "not logged in" in text.lower() or "forge login" in text.lower():
        sys.exit("Not logged in to Forge. Run `forge login` in a real terminal, or set FORGE_EMAIL + FORGE_API_TOKEN.")
    return text


def parse_rows(text: str):
    """Yield (env, site) for each data row. Column separator is the box-drawing char U+2502 (│), not pipe `|`.
    If Atlassian changes the table format this silently yields nothing → 0 installs everywhere (the symptom)."""
    rows = []
    for line in text.splitlines():
        if "│" not in line:
            continue
        cells = [c.strip() for c in line.split("│")]
        cells = [c for c in cells if c]
        if len(cells) < 2:
            continue
        env_cell = next((c for c in cells if c.lower() in ENVS), None)
        if not env_cell:
            continue
        # the site column is the first cell that looks like a domain
        site = next((c for c in cells if "." in c and " " not in c), None)
        if site:
            rows.append((env_cell.lower(), site))
    return rows


def save_snapshot(rows) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    path = CACHE / f"{stamp}.tsv"
    path.write_text("".join(f"{env}\t{site}\n" for env, site in sorted(rows)))
    return path


def load_snapshot(path: Path):
    out = set()
    for line in path.read_text().splitlines():
        if "\t" in line:
            env, site = line.split("\t", 1)
            out.add((env, site))
    return out


def baseline_at_least(days: int):
    """Most recent snapshot whose mtime is >= `days` ago (excluding the one we just wrote)."""
    cutoff = datetime.now() - timedelta(days=days)
    cands = sorted(CACHE.glob("*.tsv"), key=lambda p: p.stat().st_mtime, reverse=True)
    for p in cands[1:]:  # skip the snapshot we just saved (index 0)
        if datetime.fromtimestamp(p.stat().st_mtime) <= cutoff:
            return p
    return None


def print_delta(label, days, current):
    base = baseline_at_least(days)
    if not base:
        print(f"  {label}: no baseline yet — snapshot saved, rerun in {days}d for a delta")
        return
    prev = load_snapshot(base)
    added = sorted(current - prev)
    removed = sorted(prev - current)
    when = datetime.fromtimestamp(base.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
    net = len(added) - len(removed)
    print(f"  {label} (vs snapshot from {when}, net {net:+d}):")
    if added:
        print(f"    Added (+{len(added)}):")
        for env, site in added:
            print(f"      + {env:<12} {site}")
    if removed:
        print(f"    Removed (-{len(removed)}):")
        for env, site in removed:
            print(f"      - {env:<12} {site}")
    if not added and not removed:
        print("    no change")


def main():
    text = run_forge_list()
    rows = parse_rows(text)
    current = set(rows)
    save_snapshot(rows)

    counts = {e: 0 for e in ENVS}
    for env, _ in rows:
        counts[env] = counts.get(env, 0) + 1
    total = sum(counts.values())

    print(f"Snapshot dir: {CACHE}\n")
    print(f"=== {APP_NAME}  (appId={APP_ID}) ===")
    print("  Current installs:")
    for e in ENVS:
        print(f"    {e:<14} {counts[e]:>4}")
    print(f"    {'Total':<14} {total:>4}")
    if total == 0:
        print("  (0 installs — if you expected some, the table format may have changed; run bare `forge install list`)")
    print_delta("Δ past 1 day ", 1, current)
    print_delta("Δ past 7 days", 7, current)


if __name__ == "__main__":
    main()
