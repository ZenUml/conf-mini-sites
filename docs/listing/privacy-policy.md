# Privacy Policy — Mini Site for Confluence

**Vendor:** P&D VISION
**App:** Mini Site for Confluence (app key `com.zenuml.confluence.minisite`)
**Contact:** support@zenuml.com

This policy explains what data Mini Site for Confluence processes, where it is stored, and how it can
be deleted. It applies to all versions of the app listed on the Atlassian Marketplace.

## What the app does

Mini Site for Confluence lets an editor upload a multi-file static bundle (HTML/CSS/JS and assets) and
embeds it, live, inline on a Confluence page. Unlike a "Runs on Atlassian" app, the bundle is not stored
inside Atlassian's infrastructure — it is provisioned to an external processor (Cloudflare) and served
from there back into the page.

## What data leaves Atlassian, and where it goes

- **Uploaded bundles.** When an editor publishes a mini-site, the multi-file bundle they upload is sent
  to a Cloudflare Worker and stored as a per-page, per-instance Worker (Cloudflare Workers for
  Platforms). The bytes are served back into the page from Cloudflare, not from Atlassian.
- **No Atlassian user PII is intentionally collected.** The app does not copy account IDs, emails, or
  Confluence content other than the bundle the editor chooses to upload. If an editor puts personal
  data *inside* a bundle, that data is stored on Cloudflare as part of the bundle — the editor controls
  what a bundle contains.
- **Sub-processor:** Cloudflare, Inc. (Workers for Platforms). Region: Cloudflare's global edge network.

## Why this app declares "Stores personal data? = Yes"

The app caches uploaded bundle content on Cloudflare for longer than 24 hours (it must persist to keep
the embed live), which is the threshold Atlassian uses for the personal-data declaration — so the
declaration is **Yes** even though no Atlassian-account PII is deliberately collected by the app itself.

## Retention & deletion (DSAR / GDPR erasure)

- A bundle persists for the life of the macro instance.
- **Deletion path:** removing the macro or page tombstones the instance; the per-instance Worker is
  garbage-collected after a grace window. A data-subject or admin erasure request for a specific bundle
  is fulfilled by deleting the instance via the control Worker, which removes the bundle from
  Cloudflare.
- **Contact for privacy or erasure requests:** support@zenuml.com.

## Access controls

Bundles are not independently routable or publicly addressable. They are served only via the dispatch
Worker after a short-lived (≤60s), content-bound, HMAC-signed grant minted for a viewer the app has
already authorized — Confluence page permissions are inherited via Forge, so only people who could
already view the page can view the mini-site embedded on it.

## Changes to this policy

Material changes to this policy will be reflected in this document's git history in the app's public
repository, [ZenUml/conf-mini-sites](https://github.com/ZenUml/conf-mini-sites).
