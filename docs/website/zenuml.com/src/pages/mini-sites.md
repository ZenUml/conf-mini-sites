---
title: Mini Sites for Confluence — embed a live HTML prototype
description: 'Mini Sites for Confluence embeds a folder of HTML, CSS and JavaScript live on a Confluence page. A clickable prototype, a filterable dashboard or a small internal tool runs inline — the real thing, not a screenshot.'
keywords:
  [
    mini sites for confluence,
    confluence html app,
    embed prototype in confluence,
    interactive confluence page,
    confluence dashboard macro,
    clickable prototype confluence,
  ]
unlisted: false
---

# Mini Sites for Confluence

**Mini Sites** is a Confluence Cloud app that takes a folder of HTML, CSS and JavaScript and runs it **live
and interactive inside a Confluence page**. A clickable prototype, a filterable dashboard, a calculator or a
small internal tool — the real thing running on the page, not a screenshot of it.

[Install Mini Sites from the Atlassian Marketplace](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)

![A Confluence page with a live interactive mini-site embedded under the Candidate features heading — Feature Prioritisation prototype with votes and a results chart](/img/mini-sites/live-on-confluence-page.jpg)

*Real Confluence page: the mini-site runs inline under the PRD — clickable, not a screenshot.*

<iframe width="560" height="315" src="https://www.youtube.com/embed/vQfuQDDDXs8" title="Embed a live HTML prototype in a Confluence page" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

![GIF: choose a folder in the publisher, validate & publish, then the interactive mini-site live on the Confluence page](/img/mini-sites/publish-to-live.gif)

*Folder → Validate & publish → live on the page (about 6 seconds).*


## The problem it solves

A prototype that only runs on your laptop cannot be reviewed by the people who decide on it. The usual
workarounds all lose something:

- **Screenshots** — the interaction is gone; reviewers argue about what a click would have done.
- **A link to a dev server or a hosting service** — one more system to keep alive, one more access list to
  manage, and it breaks the moment the laptop sleeps.
- **A pasted HTML snippet** — fine for a badge or an embed code, not for a multi-file app with its own CSS,
  JavaScript and assets.

Mini Sites removes the hosting step entirely: the folder you already have goes onto the page where the
decision is being made.

## How it works

1. Edit any Confluence page and insert the **Mini-Site** macro (type `/Mini-Site`).
2. Choose the folder that contains your `index.html`.
3. The bundle is validated, scanned for accidentally committed credentials, and provisioned into its own
   isolated sandbox.
4. Publish the page. The mini site renders inline, and anyone who can view the page can use it.

Nested folders and relative paths are preserved exactly as you built them — `style.css`, `app.js`,
`images/logo.png`, `assets/data.json` all resolve.

## What you can put on a page

- **Clickable prototypes** — the UI you are asking the team to approve, running, on the page with the PRD.
- **Filterable dashboards** — a chart and a set of filters over a JSON file you ship in the bundle.
- **Small internal tools** — a pricing calculator, a checklist generator, a troubleshooting decision tree.
- **Design system demos** — components rendered from the same CSS the app ships.

## Permissions and security

- **Confluence permissions are inherited.** The app is built on Atlassian Forge; access follows the page.
  There is no second sharing model to keep in sync.
- **The app requests no Confluence API scopes.** It does not read your page content.
- **Each macro instance runs in its own isolated, non-routable sandbox** — there is no public URL to leak.
- **Every bundle is validated and secret-scanned** before it is served: an `index.html` at the root, relative
  paths only, no `../` traversal, and a scan for AWS/GCP keys and tokens.

## Limits

| Limit | Value |
|---|---:|
| Files per bundle | 2,000 |
| Maximum file size | 25 MiB |
| Maximum bundle size | 50 MiB |
| Required file | `index.html` at the folder root |

The sandbox is static-only and has **no outbound network access** — external fonts, CDNs and API calls are
not available, so bundle the assets you need. That constraint is deliberate: it is what makes the mini site
safe to run inside your wiki.

## Questions people ask

**Does JavaScript actually run?**
Yes. The bundle runs in the browser exactly as it would locally — event handlers, state, canvas, the lot.
What it cannot do is call out to the internet from the sandbox.

**Is this an HTML macro?**
No. An HTML macro takes a snippet or an iframe URL. Mini Sites takes a *folder* — many files, relative paths
intact — and hosts it for you. See
[Best HTML Macro alternative for Confluence](/best-html-macro-alternative-for-confluence).

**Where are the files stored?**
On Cloudflare infrastructure operated by us, one isolated sandbox per macro instance. No Confluence page
content or personal data is sent there — only the bundle and the identifiers needed to serve it.

**What happens if my licence lapses?**
Already-published mini sites keep rendering; publishing new bundles is what stops.

**Does it work on Confluence Data Center?**
No. Mini Sites is Confluence **Cloud** only.

## Related

- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Best HTML Macro alternative for Confluence](/best-html-macro-alternative-for-confluence)
- [Embed an Allure / static QA report](/embed-allure-report-in-confluence)
- [Confluence Cloud HTML macro migration](/confluence-cloud-html-macro)
- [Publish ChatGPT / Claude HTML to Confluence](/publish-chatgpt-html-to-confluence)
- [Fix broken HTML embeds](/fix-broken-html-embed-in-confluence)
- [Security and limits](/mini-sites-security-and-limits)
- [ZenUML Diagrams for Confluence](/docs/products/zenuml-diagrams-for-confluence) — sequence diagrams from
  text, from the same team.

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
