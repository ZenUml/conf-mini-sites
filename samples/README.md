# Sample mini-site bundles (for testing upload)

Pick one of these **folders** in the macro's "Add mini-site → Choose a folder" dialog.

## `release-dashboard/`
An interactive "Release readiness" dashboard — deliberately exercises the hard parts of the host:

- `index.html` at the root (the required entry point)
- `styles.css`, `app.js` — relative CSS/JS
- `data/metrics.json` — loaded by a **relative `fetch()`** (tests the grant `<base>` + the sandbox CSP `connect-src 'self'`)
- `assets/logo.svg` — a nested `<img>` (tests `img-src 'self'`)

Click the Q3 / Q2 / All-time chips to re-render the chart from the JSON.

Verified end-to-end (publish → serve): all five files serve under the grant with correct content-types, including the nested `data/` and `assets/` paths. Self-contained — no CDN/external requests (which the sandbox CSP would block anyway).
