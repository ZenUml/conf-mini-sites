---
title: Publish ChatGPT or Claude HTML to a Confluence page
description: 'Turn AI-generated HTML/CSS/JS into a live Confluence experience. When a paste macro is enough, when you need a folder, and how to package CDN-free bundles for Mini Sites.'
keywords:
  [
    publish chatgpt html to confluence,
    claude html confluence,
    ai generated dashboard confluence,
    vibe code confluence,
    paste ai html confluence,
  ]
unlisted: false
---

# Publish ChatGPT or Claude HTML to a Confluence page

AI assistants are good at emitting small interactive tools — decision trees, calculators, mockups, widgets.
The awkward part is **sharing** them where the team already works: Confluence.

## Two packaging shapes

| Shape | Use when | Tool |
|---|---|---|
| **Single-file paste** | One HTML blob, no separate assets, happy with a snippet field | Marketplace HTML macro (snippet) |
| **Folder publish** | Multiple files, relative CSS/JS/data, or the paste macro errors on complexity | [Mini Sites](/mini-sites) |

If Claude or ChatGPT gave you a zip or a project tree — or a “simple” page that secretly needs fonts and
charts from a CDN — treat it as a **folder**, not a paste.

## Checklist: make AI output Mini Sites–ready

The Mini Sites sandbox has **no outbound network**. Before you publish:

1. Save the main file as `index.html` at the **root** of a folder.
2. Put CSS/JS next to it (`styles.css`, `app.js`) or in subfolders — use **relative** links only.
3. Download any CDN scripts/fonts the model referenced and place them in the folder; rewrite `<script src>` /
   `<link href>` to local paths.
4. Put data in `data/*.json` and `fetch('data/…')` relatively — do not call external APIs at runtime.
5. Remove secrets. Mini Sites secret-scans the bundle; do not paste API keys into the page “just for demo.”

## Three steps to publish

1. `/Mini-Site` on a Confluence Cloud page.
2. Choose the folder (not a single file).
3. Validate & publish.

![GIF: AI or hand-built folder published to a live Confluence mini-site](/img/mini-sites/publish-to-live.gif)

Sample multi-file demo (filters + nested JSON):  
[samples/static-qa-report](https://github.com/ZenUml/conf-mini-sites/tree/master/samples/static-qa-report)


## When not to use Mini Sites for AI output

- The tool must call a live internal API or OpenAI from the browser → needs egress; use a hosted app or Forge.
- The tool must read other macros or the Confluence DOM → sandboxed apps cannot.
- You only need a third-party embed snippet → a snippet HTML macro is simpler.

## Related

- [Mini Sites for Confluence](/mini-sites)
- [Mini Sites security and limits](/mini-sites-security-and-limits)
- [Best HTML Macro alternative for Confluence Cloud](/best-html-macro-alternative-for-confluence)
- [How to embed HTML in a Confluence page](/embed-html-in-confluence)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
