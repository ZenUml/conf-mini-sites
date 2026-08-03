---
title: Mini Sites security and limits — sandbox, permissions, no outbound network
description: 'What Mini Sites for Confluence allows and refuses: Forge page permissions, per-instance isolation, secret scanning, CSP with no outbound network, and jobs you should not use it for.'
keywords:
  [
    confluence html macro security,
    confluence cloud html sandbox,
    forge html macro isolation,
    safe embed javascript confluence,
    confluence csp html macro,
  ]
unlisted: false
---

# Mini Sites security and limits

Admins evaluating a JavaScript-capable Confluence app need the limits in writing. Here they are.

## What Mini Sites does

- Runs on **Atlassian Forge**. Access follows the **Confluence page** — no second sharing model.
- Requests **no Confluence API scopes**. It does not read your page content.
- Provisions **one isolated, non-routable sandbox per macro instance**. There is **no public URL** for the
  mini site.
- **Validates** every upload (`index.html` at the folder root, relative paths only, no `../` traversal).
- **Secret-scans** the bundle before serve (common cloud keys and tokens).

## What the sandbox refuses

| Constraint | Implication |
|---|---|
| **No outbound network** (`connect-src 'self'`) | No CDN fonts, no `fetch('https://…')`, no live API dashboards. Bundle assets and data. |
| **No host-page DOM** | Your JS cannot read or restyle the surrounding Confluence page. |
| **Static only** | No server-side runtime inside the bundle. |
| **Size caps** | ≤ 2,000 files · 25 MiB/file · 50 MiB/bundle |

These limits are deliberate. They are what make user-supplied HTML/JS acceptable inside a wiki.

## Admin checklist before approval

1. Confirm creators understand **CDN dependencies must be vendored** into the folder.
2. Confirm no use-case requires **page DOM** or **live authenticated APIs**.
3. Confirm page permissions match who should see the interactive content.
4. Point publishers at the [getting-started sample](https://github.com/ZenUml/conf-mini-sites/tree/master/samples/static-qa-report) and the Marketplace docs.

## When Mini Sites is the wrong tool

- Live Tableau / Power BI / Grafana with session auth → specialist apps or iframe.
- Notion-like databases / spreadsheet formulas → Confluence Databases or Table Filter & Charts.
- Injecting CSS/JS into the Confluence chrome → not supported on Cloud sandboxes.
- Embedding Confluence *into* an external site → wrong direction; Mini Sites embeds *into* Confluence.

## Related

- [Mini Sites for Confluence](/mini-sites)
- [How to embed HTML in a Confluence page](/embed-html-in-confluence)
- [Confluence Cloud HTML macro migration](/confluence-cloud-html-macro)
- Product docs: [Mini Sites for Confluence](/docs/products/mini-sites-for-confluence)

[Install Mini Sites for Confluence →](https://marketplace.atlassian.com/apps/4169123443/mini-sites-embed-html-prototypes-for-confluence)
