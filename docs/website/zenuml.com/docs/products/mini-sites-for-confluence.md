---
sidebar_position: 7
title: Mini Sites For Confluence
description: Run a folder of HTML, CSS and JavaScript live inside a Confluence page
keywords:
  - Mini Sites for Confluence
  - embed HTML in Confluence
  - run JavaScript in Confluence page
  - clickable prototype Confluence
  - Confluence dashboard macro
  - Atlassian Forge app
---

# Mini Sites For Confluence

Mini Sites embeds a **folder** of HTML, CSS, JavaScript and assets live on a Confluence page. A clickable
prototype, a filterable dashboard, a calculator or a small internal tool runs inline — the real thing, not a
screenshot of it.

Marketplace listing:
[Mini Sites (Embed HTML & Prototypes) for Confluence](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
· [35-second demo](https://youtu.be/vQfuQDDDXs8)

## How to use

### Installation

1. Click **Settings** on your Confluence Cloud instance
2. Click **Find new apps**
3. Search for **Mini Sites**
4. Click **Try it free** to install

### Publish a mini site

1. Edit any Confluence page and type `/Mini-Site` to insert the macro.
2. Click **Upload**, then **Browse files…**, and select the folder that directly contains your `index.html`.
3. The app validates the bundle, scans it for accidentally included credentials, and provisions it into an
   isolated sandbox.
4. Click **Validate & publish**, then publish the Confluence page.

Nested folders and relative paths are preserved: `style.css`, `app.js`, `images/logo.png` and
`assets/data.json` all resolve exactly as they do locally.

## What it is good for

- **Clickable prototypes** — put the UI you are asking people to approve on the same page as the PRD.
- **Filterable dashboards** — a chart plus filters over a JSON file shipped in the bundle.
- **Small internal tools** — pricing calculators, checklist generators, troubleshooting decision trees.
- **Design-system demos** — components rendered from the CSS the product actually ships.

## Permissions and isolation

- Built on **Atlassian Forge**: Confluence page permissions are inherited. Anyone who can view the page can
  use the mini site; nobody else can.
- The app requests **no Confluence API scopes** — it does not read your page content.
- Each macro instance is served from its own **isolated, non-routable sandbox**; there is no public URL.
- Every bundle is **validated and secret-scanned** before it is served.

## Limits

| Limit | Value |
|---|---:|
| Files per bundle | 2,000 |
| Maximum file size | 25 MiB |
| Maximum bundle size | 50 MiB |
| Required file | `index.html` at the folder root |

The sandbox is static-only and has **no outbound network access** — external fonts, CDNs and API calls are
unavailable, so bundle the assets you need. Absolute paths and `../` traversal are rejected at validation
time.

## Troubleshooting

| Problem | Fix |
|---|---|
| `index.html` is not found | Select the folder that *directly* contains `index.html`, not its parent or a nested subfolder. |
| CSS or JavaScript does not load | Use relative paths (`style.css`, `app.js`), not absolute ones. |
| The upload is rejected as too large | Stay within the limits above. |
| The upload panel is still showing | No bundle has been published for that macro instance yet. |
| Viewing works but publishing is blocked | The Atlassian licence is inactive. Existing mini sites keep rendering. |

## Learn more

- [Mini Sites product page](/mini-sites)
- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Best HTML Macro alternative for Confluence](/best-html-macro-alternative-for-confluence)
- [Embed an Allure / static QA report](/embed-allure-report-in-confluence)
- [Confluence Cloud HTML macro migration](/confluence-cloud-html-macro)
- [Publish ChatGPT / Claude HTML](/publish-chatgpt-html-to-confluence)
- [Fix broken HTML embeds](/fix-broken-html-embed-in-confluence)
- [Security and limits](/mini-sites-security-and-limits)
- Sample folder: [static-qa-report](https://github.com/ZenUml/conf-mini-sites/tree/master/samples/static-qa-report)
