---
title: Fix broken HTML embeds in Confluence — relative paths, iframes, downloads
description: 'Why Confluence HTML include rewrites relative paths to 404, why attached HTML downloads instead of rendering, and how publishing a folder with Mini Sites fixes multi-file embeds.'
keywords:
  [
    confluence html include relative path 404,
    confluence iframe macro html file,
    confluence attachment iframe downloads,
    embed html without public url confluence,
    confluence local html file,
  ]
unlisted: false
---

# Fix broken HTML embeds in Confluence

You have a working `index.html` locally. On Confluence Cloud it is blank, downloads, or loses its CSS/JS.
Here is the short diagnostic.

## Symptom → cause → fix

### Relative CSS/JS 404 after HTML include

**Cause:** Include-style macros rewrite relative URLs into Confluence’s page URL space. `styles.css` no longer
points at your file.

**Fix:** Stop including a single HTML file into the page DOM. Publish the **whole folder** with
[Mini Sites](/mini-sites) so assets are served from the mini-site origin with paths preserved.

### Attached `.html` downloads instead of rendering

**Cause:** Confluence serves attachments as downloads; an iframe pointed at the attachment URL does not give
you an interactive document with sibling assets.

**Fix:** Use Mini Sites folder publish, or host the tree somewhere reachable and iframe that URL (with the
access-list cost that implies).

### Iframe is empty / blocked

**Cause:** The remote site sends `X-Frame-Options` / CSP `frame-ancestors` denying Confluence, or the URL
requires login the reader does not have.

**Fix:** For third-party live apps, use their Confluence integration. For **your** static tree, publish with
Mini Sites (no public URL required).

### “It works in the HTML macro until it gets complex”

**Cause:** Snippet macros are one field. Multi-script apps, large simulators and nested assets outgrow paste.

**Fix:** Move to folder publish. See [Best HTML Macro alternative](/best-html-macro-alternative-for-confluence).

## Prove relative paths in three steps

1. Grab the sample: [static-qa-report](https://github.com/ZenUml/conf-mini-sites/tree/master/samples/static-qa-report)
2. Publish the folder with Mini Sites.
3. Confirm the on-page badge reads **paths OK** (CSS, `widgets/chart.js`, and `data/*.json` all loaded).

## Related

- [Embed an Allure / static QA report](/embed-allure-report-in-confluence)
- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Mini Sites security and limits](/mini-sites-security-and-limits)
- [Mini Sites for Confluence](/mini-sites)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
