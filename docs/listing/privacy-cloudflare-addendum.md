# Privacy addendum — external processing on Cloudflare (Mini Site for Confluence)

This addendum supplements ZenUML's base privacy policy
(<https://github.com/ZenGPT/confluence-gpt/wiki/Privacy-Policy>) for the **Mini Site for Confluence**
app specifically. It exists because this app — unlike a "Runs on Atlassian" app — stores customer
content on an external processor (Cloudflare). Surface this in the Marketplace listing's
privacy/security section and link it from the base policy.

## What data leaves Atlassian, and where it goes
- **Uploaded bundles.** When an editor publishes a mini-site, the multi-file bundle (HTML/CSS/JS and
  any assets they include) is sent to a Cloudflare Worker and stored as a per-page, per-instance
  Worker (Cloudflare Workers for Platforms). The bytes are served back into the page from Cloudflare,
  not from Atlassian.
- **No Atlassian user PII is intentionally collected.** The app does not copy account IDs, emails, or
  Confluence content other than the bundle the editor chooses to upload. If an editor puts personal
  data *inside* a bundle, that data is stored on Cloudflare as part of the bundle.
- **Sub-processor:** Cloudflare, Inc. (Workers for Platforms). Region: Cloudflare's global edge.

## Why "Stores personal data? = Yes"
The app caches uploaded bundle content on Cloudflare for longer than 24 hours (it must persist to keep
the embed live), which is the threshold Atlassian uses for the personal-data declaration — so the
declaration is **Yes** even though no Atlassian-account PII is deliberately collected.

## Retention & deletion (DSAR / GDPR erasure)
- A bundle persists for the life of the macro instance.
- **Deletion path:** removing the macro / page tombstones the instance; the per-instance Worker is
  garbage-collected after a grace window (see `DESIGN.md` lifecycle invariants). A data-subject or
  admin erasure request for a specific bundle is fulfilled by deleting the instance via the
  control Worker, which removes the bundle from Cloudflare.
- **Contact for requests:** support@zenuml.com.

## Access controls
- Bundles are not independently routable. They are served only via the dispatch Worker after a
  short-lived (≤60s), content-bound, HMAC-signed grant minted by the Forge resolver for a viewer the
  app has already authorized (Confluence permissions are inherited via Forge). See `DESIGN.md` §2.

> TODO before final Submit: have ZenUML legal confirm this addendum is linked from / merged into the
> base privacy policy URL used in the listing.
