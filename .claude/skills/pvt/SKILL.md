---
name: pvt
description: >
  Production Validation Testing (PVT) — the quick "is it alive?" check immediately after a
  production release of Mini Sites for Confluence. Confirms the released build is what is live
  (Forge app + both Workers), that an already-published mini-site still renders on our own
  production Confluence site, and that a fresh publish goes through the Publisher on the new
  build. Not a full smoke test — release.yml already runs the prod api smoke. Use after
  /release-app completes. Triggers on "pvt", "production validation", "validate release",
  "validate production".
---

# Production Validation Testing (PVT)

One site, one page, one publish, immediate confirmation that the release actually landed. Full
regression runs before the release (CI + E2E), the prod `api` smoke runs inside `release.yml`
after it; PVT is the human-executed complement on a **real production Confluence page**.

## Where

| What | Value |
|---|---|
| Site | `minisites-prod.atlassian.net` (our own production install; never a customer site) |
| Space / page | `MSVD`, page 5505026 — carries a published macro (instance `ie28ad180e2eb7d3fdf986542bb67f59`, a 7.2 MB single-line bundle kept from the v0.4.1 verification) |
| Browser | Playwright MCP on the real Chrome profile (run the `connect-playwright-profile` preflight first); it is the only tool that reaches inside the Forge iframe **and** the nested dispatch iframe |
| Workers | `conf-mini-sites-remote-production`, `conf-mini-sites-dispatch-production` |

`create-test-page --bundle` is a dev-stack tool (its `CONTROL_SHARED_SECRET` is the dev one); do not
point it at production. The publish step below goes through the Publisher modal, the same path a
customer uses.

## Steps

1. **Build identity** — run the `check-version` skill for production: the Forge app version
   (`forge install list` production rows read `Up-to-date` on the expected major), and the latest
   deployment ids of both Workers match the `release.yml` run's "Current Version ID" lines.
2. **Existing render** — open page 5505026. In the launcher frame `#v-ref` reads
   `mini-site:ie28ad180…`; `page.frames()` contains a frame whose URL includes
   `conf-mini-sites-dispatch-production`; inside it the bundle's `<h1>` ("Long line prod") is visible.
   A blank macro here with a green release means a grant failure: suspect `K_GRANT` skew between the
   two prod Workers before anything else.
3. **Fresh publish on the new build** — create a new page in `MSVD` (title `PVT vX.Y.Z <date>`),
   insert the `Mini-Site` macro, open the Publisher, select a small fixture folder
   (`.claude/skills/create-test-page/fixtures/sample-bundle`), publish, wait for "It's live", and
   confirm the preview renders inside the nested iframe. This exercises `/upload-grant` → `/upload`
   → provisioning → `/serve-url` → dispatch on the released code.
4. **Clean up** — delete the PVT page (`deletePage` helper or the page menu) and its instance
   (`DELETE /instance?instanceId=…` on the control Worker, or leave it for the 30-day GC once that
   is live). Page 5505026 stays.

## Report

```
PVT vX.Y.Z (production, minisites-prod)
- Build: Forge <ver> · control <deployment id> · dispatch <deployment id>   ✓ / ✗
- Existing render (page 5505026): PASS | FAIL (<what was seen>)
- Fresh publish + render: PASS | FAIL (<step, error code, screenshot path>)
- Cleanup: page <id> deleted · instance <id> deleted | left for GC
```

A FAIL is a production incident: report it, do not auto-rollback, and open the incident with the
`bug-report-framing` skill (user journey → runtime evidence → code path).
