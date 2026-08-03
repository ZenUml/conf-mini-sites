---
title: Embed Plotly or D3 interactive charts in Confluence
description: 'Publish a self-contained Plotly or D3 HTML folder on a Confluence Cloud page. Bundle data and libraries locally — Mini Sites has no outbound CDN access.'
keywords:
  [
    embed plotly confluence,
    d3.js confluence embed,
    interactive chart html confluence,
    plotly confluence,
  ]
unlisted: false
---

# Embed Plotly or D3 interactive charts in Confluence

Analysts often export an interactive chart as HTML. On Confluence Cloud, pasting that file usually fails once
the export expects sibling assets or a CDN.

## What works

1. Export or save a **folder**: `index.html` + bundled Plotly/D3 JS + your data file.
2. Rewrite any `https://cdn…` script tags to **local** copies inside the folder.
3. Publish the folder with [Mini Sites](/mini-sites).

![Interactive multi-file chart dashboard live on a Confluence page](/img/mini-sites/release-dashboard-on-confluence.jpg)

Relative `fetch('data/…')` works inside the sandbox because it is same-origin to the mini site.


## What does not work

- Live refresh from a database or Plotly Dash server (no outbound network).
- Table-only charts that Table Filter & Charts already covers natively — use that if you only need
  Confluence tables.

## Related

- [Embed an Allure / static QA report](/embed-allure-report-in-confluence)
- [Fix broken HTML embeds](/fix-broken-html-embed-in-confluence)
- [Mini Sites security and limits](/mini-sites-security-and-limits)
- [Mini Sites for Confluence](/mini-sites)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
