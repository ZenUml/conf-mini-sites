---
name: forge-ps-questionnaire
description: >
  Fill, correct, submit, and audit the Atlassian Marketplace Privacy & Security
  questionnaire ("Edit responses") for Mini Sites for Confluence
  (`com.zenuml.confluence.minisite`), and verify the result via the Marketplace REST API.
  Use when updating or correcting the P&S declaration (e.g. when uninstall-driven deletion
  goes live and "retained indefinitely" must change), when a customer security review
  exposes P&S answers that don't match actual data practices, or when auditing what the
  app currently declares. Encodes the field-name map, the native-setter-vs-keystroke rule
  (the sub-processor entity block needs real keystrokes or submit fails validation), the
  document.body screenshot workaround, and REST verification (formStatus SUBMITTED vs
  APPROVED). Triggers on "privacy and security questionnaire", "P&S form",
  "Edit responses", "data security declaration", "sub-processor list", "CCPA/GDPR
  questionnaire", "marketplace privacy form", "audit P&S".
---

# Forge Marketplace Privacy & Security questionnaire

Console form at `marketplace.atlassian.com/manage/apps/<appId>/privacy-and-security` →
**Edit responses**. There is **no write REST API** — edits happen only in the console
(browser). But the READ endpoint is public and is your verification backbone.

## App

| App | appKey | listing | sub-processors |
|---|---|---|---|
| Mini Sites (Embed HTML & Prototypes) for Confluence | `com.zenuml.confluence.minisite` | Marketplace listing id 4169123443, vendor P&D VISION (1215266) | **1 — Cloudflare, Inc. (US)**: hosts and serves the uploaded bundles (Workers for Platforms). Mixpanel receives only event metadata (counts, sizes, codes), never bundle content — it is not declared as a sub-processor. |

One app, one form — there is no cross-variant replication here. The historical answers and the
reasoning behind the legal-judgment fields are in the memory note
`listing-privacy-questionnaire-answers` and in `CONTEXT.md` (listing section).

## Workflow

1. **Audit current state (read-only, no browser):**
   `scripts/verify-ps.sh` — prints every field and flags `!!` deviations from the
   canonical target. Run this FIRST to see what actually needs changing.
2. **Establish the answers.** The authoritative template is **the live APPROVED REST JSON**
   (`scripts/verify-ps.sh --json`) — the owner has already reviewed those answers. Change only
   the field the task is about, and only with the owner's explicit decision.
3. **Fill in the console** (browser). Delegate to a subagent and hand it
   `references/fill-mechanics.md` verbatim — that file holds the field-name map and the
   quirks that will otherwise cost hours (see "Non-negotiables" below).
4. **Submit** — click "Save and preview" → complete the flow. On the preview page, eyeball
   the fields the owner cares about (CCPA rows, sub-processors) before publishing.
5. **Verify it landed:** re-run `scripts/verify-ps.sh`. `formStatus` must flip
   to `SUBMITTED`; if it still shows `APPROVED` with old values, the submission did NOT
   land — say so, don't claim success.

## Non-negotiables (each was a real, expensive failure)

- **The sub-processor entity subform accepts ONLY real keystrokes** (`browser_type`,
  `slowly:true`). Programmatic values pass the DOM but fail "mandatory field" on submit.
  Everything else takes programmatic `browser_evaluate` writes. See fill-mechanics.md.
- **One unsaved form at a time.** Any navigation/reload/relay-drop discards the whole
  unsaved form. Do not open a second app's form (or run a PVT, or any other browser task)
  while an unsaved P&S form is in play. Finish → submit → then the next.
- **Verify the precondition, not a verbal state.** Before touching the browser, run
  `verify-ps.sh` to confirm whether the form is already submitted — don't act on "it's
  free" / "I submitted it" without the `formStatus` check. (Two forms' worth of work were
  lost to skipping this.)
- **Prefer fill-then-submit in one session over fill-then-stop-for-review.** Review the
  *decision* before opening the browser; leaving a form unsaved for review just exposes it to
  loss. Only stop-before-submit when the owner explicitly wants to eyeball the form.
- **The listing JSON's `endUserLicenseAgreementUrl` is dormant/stale** — it keeps an old
  custom URL even when the app is on the Standard Agreement. Never judge the EULA from it;
  check the version's Links tab or the rendered listing page. (Mis-diagnosed 3 of 4 "EULA
  defects" from that field once.)

## Canonical target (approved 2026-07; listing public since 2026-07-22)

stores/process EUD outside Atlassian = Yes/Yes · residency = *App does not support DR* ·
retention = **indefinite**, custom period disallowed · sub-processor = Cloudflare only · GDPR
controller = No, processor = Yes (EUD type: "Uploaded site-bundle files (HTML/CSS/JS and assets)
posted by end-users") · CCPA business = No, service provider = Yes (same EUD type) · disk
encryption = Yes · EEA transfer = Yes, SCCs via Cloudflare's DPA · DPA = No · security contact
`support@zenuml.com` · PETs = Yes (TLS + at-rest encryption, SHA-256-derived storage keys).
`verify-ps.sh` flags anything off this. Not set today (informational): a public security-policy
URL and the permissions justification ("Data not provided").

**Retention is the field most likely to change.** Uninstall-driven deletion (`preUninstall` →
control `/uninstall` tombstone → 30-day D1 sweep) is implemented but dormant until D1 and the cron
are enabled in `wrangler-remote.toml`. Until it is live on production, the form must keep saying
"indefinitely"; the day it goes live, change retention to 30 days and re-verify.

**Legal-judgment fields** (don't silently flip; they are the owner's call): GDPR controller No,
CCPA business No, CCPA service-provider Yes, DPA No. Mixpanel analytics is the one arguable
"we're a controller" edge — flagged, deferred to counsel, same as for the ZenUML apps.

See [references/fill-mechanics.md](references/fill-mechanics.md) for the field-name map,
native-setter/keystroke snippets, chip-list handling, and the screenshot workaround.
