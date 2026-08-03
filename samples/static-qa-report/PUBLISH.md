# Publish this demo in ≤3 steps

Proves the research wedge (**JTBD-01 / JTBD-04**): multi-file static QA report with nested relative paths (`styles.css`, `app.js`, `data/*.json`, `widgets/chart.js`, `assets/mark.svg`).

Same failure mode users hit under Confluence HTML-include (assets 404) — Mini Sites preserves paths from its own origin.

## 3 steps (Confluence Cloud + Mini Sites installed)

1. **Insert** the Mini-Site macro on a page (`/Mini-Site`).
2. **Choose folder** → select `samples/static-qa-report` (the folder, not a single file).
3. **Publish** → open the page and confirm:
   - Badge reads **paths OK** (relative `fetch('data/summary.json')` succeeded)
   - Chart + suite list render (proves `widgets/chart.js` + CSS loaded)
   - Filters (All / Failed / Passed) respond (JS live, not a screenshot)

That is the activation bar from the research 30-day plan: demo completes without path rewrite / attachment download; ≤3 user steps to live.

## API shortcut (no editor UI)

If `FORGE_EMAIL`, `FORGE_API_TOKEN`, and `CONTROL_SHARED_SECRET` are set in `.env.forge.local`:

```bash
set -a; source .env.forge.local; set +a
node .claude/skills/create-test-page/scripts/create-test-page.mjs \
  --site lite-dev \
  --space SD \
  --title "Static QA report — relative-path demo" \
  --bundle samples/static-qa-report
```

## Local path check (no Confluence)

```bash
cd samples/static-qa-report && python3 -m http.server 8766
# open http://127.0.0.1:8766/ — badge should say "paths OK"
```

Opening via `file://` will show **offline fallback** because browsers block `fetch` of local JSON — that is expected and not a Mini Sites failure.
