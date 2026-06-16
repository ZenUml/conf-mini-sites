# Conf Mini-Sites

A Confluence-embedded app that lets a user **upload a multi-file static bundle** (an AI-generated interactive mini-site: clickable prototype, filterable dashboard, troubleshooting tool) and host it as a live, embedded object on a Confluence page.

**Status: GO — build for Marketplace (decided 2026-06-16).** Ship the real app to the Atlassian Marketplace on
**Cloudflare**, **target the residency-agnostic segment**, and let **paid installs be the demand signal**. The
gates below are **reframed, not abandoned**: G1 (residency) → a listing/targeting choice + listing-hygiene
(privacy policy, DSAR-delete, a DPA on request), not a build blocker; G2 (demand) → the live listing is the
test; G4 (EV) → near-zero cost makes shipping plainly +EV. **The one item retained as build-discipline (not a
gate):** the auth gateway is a self-built ACL serving multi-tenant content from a public edge (CVE-2021-26073 /
CVSS-9.1 class) — an IDOR bug there is cross-tenant disclosure → Marketplace delisting risk, independent of
segment or cost; so Stage 3 is built and pen-tested against the threat model (DESIGN §2). Forge fallback (§6) is
**shelved** unless a future enterprise deal demands no external processor.

## Glossary

- **Mini-site / Static bundle** — a self-contained multi-file static web artifact (`index.html` + separate JS/CSS/asset files with **relative paths**). The thing we host. _Distinct from_ a **single-file artifact** (one self-contained `.html`), which existing HTML macros already handle — out of scope.
- **Macro instance** — one embedded mini-site on one Confluence page.
- **Auth gateway** — the request path that authenticates the viewer and enforces the Confluence page's permissions before serving a bundle.

## Architecture (current decision — Cloudflare; conditional)

- **Hosting:** Cloudflare **Workers for Platforms** — one dispatch namespace; each macro instance = one user Worker serving its bundle via **Workers Static Assets** (native relative-path serving). Plain Workers/Pages are capped (500 / 100 per account), so WfP is required. Cost ≈ $25/mo base (incl. 1,000 scripts) → ~$205–230/mo at 10k instances.
- **Access:** the **dispatch Worker is the auth gateway** — verify the Atlassian JWT (`qsh`/`iss`/`exp`), call Confluence `permission/check` (read), then route to the tenant Worker. User Workers are not independently routable → no public-URL bypass.
- **Trade-off (accepted):** files live on Cloudflare → **NOT "Runs on Atlassian", NOT no-egress, permissions are app-enforced not inherited.** Consequence: must *pass* a Cloud Fortified security review (not skip it), and the auth gateway is self-built ACL code (CVE-2021-26073 / CVSS-9.1 class — must be threat-modeled and pen-tested).
- **Forge fallback:** only if a customer's security **rejects the external processor** — and only if a Forge feasibility spike first passes (Forge needs a client-side-reassembly hack, ~100 MB/file cap; Object Store is EAP-only). Not the default path.

## Design constraints (acceptance criteria — each needs a testable invariant + threat model BEFORE code)

- Orphan cleanup when a macro/page is deleted (Connect has no reliable per-macro delete webhook).
- Page copy / duplicate / template / space-export semantics (cloned macro bodies).
- Permission-cache staleness on ACL change / Confluence outage (no serving revoked content).
- Token expiry mid-view.
- GDPR/DSAR erasure of user-uploaded bundles on the external host.
- Malicious uploaded JS served from a trusted origin → sandboxing / CSP (XSS, phishing, malware).
- Secret-leak detection in uploaded bundles; tenant isolation; audit logs; partial-failure recovery.

These erode the "~$25/mo, solo-buildable" premise — re-cost honestly.

## Blocking gates (no code until ALL pass)

1. **Written** admin+security confirmation from the anchor team: GitLab Pages config (access-controlled / requires a GitLab account), whether the non-technical consumers actually lack GitLab accounts, and **residency-vs-access** — if they require *no external processor*, Cloudflare is disqualified.
2. **Demand-to-pay:** ≥3 prospects **beyond the anchor team**, each with a real existing mini-site, a failed alternative, recurring publish frequency, a named approver **who approved the actual external-processor architecture** (residency + DPA + auth-gateway threat model), and a concrete commitment (paid pilot / LOI / install approval). Demand from a prospect whose security would veto the external host does not count.
3. Pre-implementation lifecycle/security acceptance criteria signed off (ADR + threat model + the invariants above).
4. EV comparison vs shipping the next ZenUML feature + a kill criterion stronger than "cheap to build."

If the gates don't pass → ship the next ZenUML feature instead.

## Positioning (one line)

The only Confluence-native way to upload + host a multi-file bundle — a **first-mover execution wedge with no durable moat** (Forge Custom UI and 4.5k–8.7k-install incumbents could copy it; governance is table stakes). Demand is **n=1 (the anchor team), unvalidated beyond** — hence the gates.
