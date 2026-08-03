---
title: Embed an Allure (or static QA) HTML report in Confluence
description: 'How to put a multi-file Allure, JUnit, or TestRail HTML report on a Confluence Cloud page without relative-path 404s or a separate host. Publish the report folder with Mini Sites.'
keywords:
  [
    allure report confluence,
    embed allure html confluence,
    junit html report confluence,
    testrail report confluence,
    ci html report confluence,
    static test report confluence,
  ]
unlisted: false
---

# Embed an Allure (or static QA) HTML report in Confluence

CI tools often emit a **folder** of HTML, CSS, JavaScript and data files — Allure, many JUnit HTML
reporters, TestRail exports, custom static dashboards. Getting that folder onto a Confluence Cloud page is
where teams lose hours.

## Why the usual tricks fail

| Workaround | What breaks |
|---|---|
| Confluence **HTML include** / paste macros | Relative URLs (`styles.css`, `app.js`, `data/…`) are rewritten into Confluence’s own page space → **404** on assets |
| Attach `index.html` and iframe it | The browser **downloads** the file instead of rendering it; nested assets never load |
| `rsync` the report to Azure/S3 + iframe | Works only if every reader has access to that host, and you now own a second ACL |
| Snippet HTML macro | Fine for one file of markup — not for a multi-file report tree |

This is the same pain Stack Overflow threads describe for Allure and similar exporters: the report is fine
locally; Confluence’s include path is what breaks it.

## The fix: publish the report folder

[Mini Sites for Confluence](/mini-sites) takes the folder you already have, validates it, secret-scans it,
provisions an isolated sandbox, and renders it **inline** on the page. Nested relative paths stay intact —
including relative `fetch()` calls to JSON under `data/`.

### Three steps

1. Insert the Mini-Site macro (`/Mini-Site`).
2. Choose the report folder that **directly** contains `index.html`.
3. Validate & publish, then publish the Confluence page.

That’s it. No public URL. Access follows the Confluence page.

### Sample bundle

A ready-made Allure-style multi-file demo (nested `data/`, `widgets/`, `assets/`) lives in the product repo:

[samples/static-qa-report](https://github.com/ZenUml/conf-mini-sites/tree/master/samples/static-qa-report)

Download or clone that folder and publish it with Mini Sites. If the badge in the demo reads **paths OK**,
relative CSS, JS and JSON all resolved.

## Limits you must know (before you promise live data)

The Mini Sites sandbox has **no outbound network**. That is intentional.

- Bundle fonts, chart libraries and JSON **inside** the folder.
- Do **not** expect the report to call your CI API at view time.
- When results change, re-export the static folder and re-publish the mini site.

If you need a live Grafana/Tableau board, use those products’ Confluence apps or an iframe to a URL your
readers can already reach — Mini Sites is for **static interactive** report folders.

## Related

- [Mini Sites for Confluence](/mini-sites)
- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Fix broken HTML embeds (relative paths & iframes)](/fix-broken-html-embed-in-confluence)
- [Mini Sites security and limits](/mini-sites-security-and-limits)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
