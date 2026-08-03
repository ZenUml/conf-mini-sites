# Sample mini-site bundles (for testing upload)

Pick one of these **folders** in the macro's "Add mini-site → Choose a folder" dialog.

## `static-qa-report/` *(research wedge demo — JTBD-01 / JTBD-04)*
Allure-style **multi-file static QA report** used as the packaging-activation proof from the Aug 2026 market-opportunity packet.

- Nested tree: `index.html`, `styles.css`, `app.js`, `data/*.json`, `widgets/chart.js`, `assets/mark.svg`
- Relative `fetch()` of JSON + relative `<script>` / `<link>` / `<img>`
- Interactive suite filters (proves JS ran inside the served iframe)

**Publish in ≤3 steps:** see [`static-qa-report/PUBLISH.md`](static-qa-report/PUBLISH.md).

## `release-dashboard/`
An interactive "Release readiness" dashboard — deliberately exercises the hard parts of the host:

- `index.html` at the root (the required entry point)
- `styles.css`, `app.js` — relative CSS/JS
- `data/metrics.json` — loaded by a **relative `fetch()`** (tests the grant `<base>` + the sandbox CSP `connect-src 'self'`)
- `assets/logo.svg` — a nested `<img>` (tests `img-src 'self'`)

Click the Q3 / Q2 / All-time chips to re-render the chart from the JSON.

Verified end-to-end (publish → serve): all five files serve under the grant with correct content-types, including the nested `data/` and `assets/` paths. Self-contained — no CDN/external requests (which the sandbox CSP would block anyway).
