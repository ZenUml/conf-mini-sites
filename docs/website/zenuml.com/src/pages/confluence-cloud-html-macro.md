---
title: Confluence Cloud HTML macro — what replaced it, and what to use instead
description: 'Confluence Cloud removed the native HTML macro. Here is the migration decision tree: iframe, snippet HTML macro apps, or publishing a multi-file folder with Mini Sites — including when not to use Mini Sites.'
keywords:
  [
    confluence cloud html macro,
    enable html macro confluence cloud,
    html macro server to cloud migration,
    confluence cloud embed html alternative,
    unknown macro html confluence,
  ]
unlisted: false
---

# Confluence Cloud HTML macro — what replaced it

On Confluence **Server / Data Center**, many spaces used a built-in HTML macro. On **Cloud**, that native path
is gone for security reasons. Searching “enable HTML macro Confluence Cloud” usually lands you on Marketplace
snippet apps — which solve a different job than “host my multi-file interactive folder.”

## Decision tree

Ask what you actually need on the page:

1. **A URL that already exists** (Grafana, Figma, public demo) that every reader can open  
   → use Confluence’s **iframe / embed** macro.

2. **A small pasted snippet** (badge, third-party embed code, a few lines of markup)  
   → use a Marketplace **HTML macro** (snippet) app.

3. **A project on disk** — `index.html` + CSS + JS + assets / data — that should run **inline** without a
   public host  
   → publish the **folder** with [Mini Sites for Confluence](/mini-sites).

![What “folder on the page” looks like in Confluence — interactive dashboard with relative assets](/img/mini-sites/release-dashboard-on-confluence.jpg)


4. **Access to the Confluence page DOM** (custom analytics, restyling the wiki chrome, reading other macros)  
   → **none** of the sandboxed HTML apps will do this on Cloud — including Mini Sites. That requirement is a
   disqualifier; look at Forge Custom UI or accept the limit.

5. **Live authenticated BI** (Tableau / Power BI / Grafana with session cookies)  
   → use the specialist Confluence app or iframe to that product. Mini Sites has **no outbound network**.

## Server → Cloud migration tips

- Inventory pages that still show **unknown macro** after migration — those were often HTML macros.
- For each, classify with the tree above. Do not assume every old HTML macro should become Mini Sites.
- Multi-file reports, prototypes and self-contained tools are the best Mini Sites fits.
- Snippet-only content can stay on a snippet HTML macro if you are happy with that shape.

## Why “another HTML macro” is the wrong category name

Snippet macros and folder-hosting apps compete in Marketplace search under “HTML,” but they solve different
jobs. Mini Sites is intentionally **not** “HTML macro #4.” It is multi-file static hosting with page
permissions, secret scanning, and no sandbox egress.

Fair comparison of shapes: [Best HTML Macro alternative for Confluence Cloud](/best-html-macro-alternative-for-confluence).

## Related

- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Mini Sites for Confluence](/mini-sites)
- [Mini Sites security and limits](/mini-sites-security-and-limits)
- [Publish ChatGPT / Claude HTML to Confluence](/publish-chatgpt-html-to-confluence)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
