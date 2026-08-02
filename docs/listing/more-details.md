# Listing "More details" — drafted 2026-07-25, NOT yet saved

Paste into Marketplace → Versions → 3.4.0 (build 3002020) → Details → **More details**.
The `**bold**` markers autoformat in Atlaskit's editor. Written for Google and AI crawlers: the field is
crawlable text on the listing page but is NOT part of Marketplace's own search index, so it carries the
question-shaped phrasings buyers actually type. Live copy still says "Mini Site" (singular) and predates
the rename.

---

Mini Sites turns a Confluence page into a host for a live, interactive mini site: a clickable prototype, a filterable dashboard, a calculator, or a small internal tool. Upload the folder of HTML, CSS and JavaScript you already have — the bundle is validated, secret-scanned and provisioned into its own isolated sandbox, then embedded inline on the page. The real thing running, not a screenshot of it.

**How do I embed HTML in a Confluence page?** Insert the Mini-Site macro (type /Mini-Site), click Upload, and choose the folder that contains your index.html. Mini Sites publishes the whole folder — up to 2,000 files, 25 MiB per file, 50 MiB per bundle — with nested relative paths preserved, so style.css, app.js, images/logo.png and assets/data.json resolve exactly as they do locally.

**Can I run JavaScript in a Confluence page?** Yes. The bundle runs in the browser as it does on your laptop: event handlers, state, canvas, charts. What it cannot do is call out to the internet — the sandbox has no outbound network access, so bundle your fonts, libraries and data instead of loading them from a CDN.

**How is this different from an HTML macro?** An HTML macro takes a snippet you paste into a field, or an iframe pointing at a URL you have to host yourself. Mini Sites takes a folder — many files, relative paths intact — and hosts it for you. If all you need is a third-party embed code, a snippet macro is the simpler tool.

**Who can see it?** Whoever can see the page. Built on Atlassian Forge, so Confluence page permissions are inherited. The app requests no Confluence API scopes, and each macro instance is served from its own non-routable sandbox with no public URL.

**What gets checked before it goes live?** An index.html at the folder root, relative paths only (absolute paths and ../ traversal are rejected), size and file-count limits, and a scan for leaked credentials such as AWS and GCP keys and tokens.

Typical uses: design prototypes and clickable demos, interactive dashboards and reports, troubleshooting flows, and self-contained internal tools — embedded where the team already works. Confluence Cloud only.
