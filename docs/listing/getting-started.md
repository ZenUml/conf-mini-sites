# Getting started with Mini Site for Confluence

Embed a live, multi-file mini-site — a clickable prototype, an interactive dashboard, or a small tool —
directly on a Confluence page. This is the user-facing doc to host (e.g. on the ZenUML site or a GitHub
wiki) and link as the **Documentation** URL in the Marketplace listing.

## 1. Install
Install **Mini Site for Confluence** from the Atlassian Marketplace onto your Confluence Cloud site
(site admin required). A 30-day free trial is included.

## 2. Add the macro
1. Edit any Confluence page.
2. Type `/Mini-Site` (or pick **Mini-Site** from the macro browser) and insert it.
3. You'll see the launcher — an empty mini-site placeholder.

## 3. Upload your bundle
1. Click **Upload** in the launcher to open the publisher.
2. Drag in a **folder** of static files — `index.html` plus its CSS/JS/assets. Nested paths and
   relative `fetch()`/`src` references are preserved exactly as built.
3. Click **Publish**. The bundle is validated and secret-scanned, then provisioned to an isolated
   per-page sandbox.

## 4. View it live
Publish the page. Anyone who can view the page sees the mini-site running **inline and interactive** —
not a screenshot. Access is inherited from Confluence page permissions, so nothing leaks to people who
can't see the page.

## What can I embed?
- Clickable prototypes (e.g. a static export from a design tool)
- Filterable dashboards / reports (HTML + JS + a bundled data file)
- Small internal tools, calculators, troubleshooting flows

## Limits & notes
- Files must be **static** (HTML/CSS/JS). No server-side runtime inside the bundle.
- Each macro instance is isolated and served from a sandbox separate from your Confluence content.
- Bundles are hosted on Cloudflare — see the privacy/security details in the listing.

## Support
Questions or issues: **support@zenuml.com**.
