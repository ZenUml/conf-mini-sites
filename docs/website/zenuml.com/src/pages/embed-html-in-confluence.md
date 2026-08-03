---
title: How to embed HTML in a Confluence page
description: 'Four ways to embed HTML in a Confluence Cloud page — iframe macro, HTML macro apps, attachments, and publishing a whole folder of HTML/CSS/JS with Mini Sites. What each one can and cannot do.'
keywords:
  [
    embed html in confluence,
    confluence html macro,
    run javascript in confluence,
    confluence iframe macro,
    embed web page in confluence,
    confluence cloud custom html,
  ]
unlisted: false
---

# How to embed HTML in a Confluence page

Confluence Cloud removed the built-in HTML macro that Server and Data Center users remember, so "embed some
HTML" now means picking one of four options. Here is what each one actually does, and where each one breaks.

![Interactive mini-site running inside a Confluence Cloud page next to the written decision](/img/mini-sites/live-on-confluence-page.jpg)

*Goal state: multi-file HTML/CSS/JS running **on** the Confluence page — not downloaded, not hosted elsewhere.*


| Approach | Multi-file? | JavaScript runs? | Needs external hosting? | Access control |
|---|---|---|---|---|
| Iframe / embed macro | No — points at a URL | Yes, on the remote site | **Yes** | Whatever the remote site does |
| HTML macro app | Snippet only | Yes | No, for a snippet | Page permissions |
| Attach a `.html` file | No — one file, downloads | No | No | Page permissions |
| **Publish a folder ([Mini Sites](/mini-sites))** | **Yes — up to 2,000 files** | **Yes** | **No** | **Page permissions** |

## 1. The iframe / embed macro

Confluence's built-in embed macro takes a URL and shows that page in an iframe.

**Use it when** the thing you want to show already lives at a stable URL that your readers can reach — a
Grafana board, a public demo, a Figma prototype.

**It breaks when** the content does not have a URL yet. You have to host it somewhere first, keep that host
alive, and give every reader access to it. For an internal prototype, that is three problems you did not
have before.

## 2. An HTML macro app from the Marketplace

Several apps restore a snippet-level HTML macro to Confluence Cloud. You paste markup, it renders.

**Use it when** you need a small piece of markup — a styled callout, a script tag, a third-party embed code.

**It breaks when** the thing you want to embed is a *project*: an `index.html` plus a stylesheet plus a
JavaScript bundle plus an `assets/` folder. A snippet field has nowhere to put the other files, so you end up
inlining everything into one enormous blob, or pointing at a CDN and accepting the external dependency.

## 3. Attaching the HTML file to the page

You can attach `index.html` to a page. Readers download it and open it locally.

**It breaks immediately**: the download is not rendered inline, relative assets are missing, and by the time
someone opens it the file is a copy that no longer matches the page.

## 4. Publish the whole folder onto the page

This is what [Mini Sites for Confluence](/mini-sites) does. You select the folder that contains your
`index.html`; the app validates it, scans it for accidentally included credentials, provisions it into an
isolated sandbox, and renders it inline on the page.

- **Multi-file**: up to 2,000 files, 25 MiB per file, 50 MiB per bundle. Nested paths are preserved, so
  `assets/data.json` and `images/logo.png` resolve exactly as they do locally.
- **JavaScript runs**: the bundle behaves in the page as it does on your laptop.
- **No hosting to arrange**: there is no URL to create, no server to keep alive, no access list to maintain.
- **Confluence permissions are inherited** — the app is built on Atlassian Forge, so anyone who can view the
  page can use the mini site, and nobody else can.
- **No outbound network access from the sandbox** — external fonts, CDNs and API calls do not work. Bundle
  what you need. This is the trade that makes the whole thing safe to run inside a wiki.

### Step by step

1. Edit a Confluence page and type `/Mini-Site`.
2. Click **Upload**, then **Browse files…**, and select the folder that directly contains `index.html`.
3. Wait for the file list to appear, then click **Validate & publish**.
4. Publish the Confluence page.

## Which one should you use?

- Embedding something that already has a URL and is already reachable → **iframe macro**.
- Pasting a snippet or a third-party embed code → **HTML macro app**.
- Putting a real, multi-file, interactive thing on the page → **publish the folder**
  ([Mini Sites](/mini-sites)).

## Questions people ask

**Can I run JavaScript in a Confluence Cloud page?**
Yes — through an app. Confluence will not execute raw `<script>` tags you type into the editor; an app that
renders your code in a sandboxed frame will. Mini Sites does exactly that.

**Why did my CSS not load?**
Almost always an absolute path. Use `href="style.css"`, not `/style.css` or a full URL. Absolute paths and
`../` traversal are rejected at validation time.

**Can the embedded page call our internal API?**
Not from the Mini Sites sandbox — it has no outbound network access. If you need live data, ship it as a JSON
file in the bundle and re-publish when it changes.

**Is the content private?**
It follows the page. The sandbox is non-routable and has no public URL of its own.

## Related

- [Mini Sites for Confluence](/mini-sites)
- [Best HTML Macro alternative for Confluence](/best-html-macro-alternative-for-confluence)
- [Confluence Cloud HTML macro migration](/confluence-cloud-html-macro)
- [Fix broken HTML embeds (relative paths & iframes)](/fix-broken-html-embed-in-confluence)
- [Embed an Allure / static QA report](/embed-allure-report-in-confluence)
- [Security and limits](/mini-sites-security-and-limits)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
