# Open questions — uncertainty register

Each entry: what we don't know, why it matters, and the cheapest next test (per brief §13/§14B).

## OQ-1 — Is there Confluence-specific demand for AI-generated-artifact publishing (JTBD-15)?

All five user-authored H4 artifacts (E-107, E-109–E-112) are platform-generic or Box-centric; zero
mention Confluence. The wedge rests on transferring a validated generic need into the Confluence
context. **Cheapest test:** C05 landing page + demo targeting "share AI-generated tool with team";
threshold: ≥3 qualified conversations or ≥50 engaged visits in 30 days. If it fails, JTBD-15 demotes
to monitor and wedge-3 becomes JTBD-05 (pending OQ-2).

## OQ-2 — Do JTBD-05 (decision trees) and JTBD-03 (migration) exist outside Atlassian Community?

Both failed the two-source-type gate only because Reddit/Stack Overflow were crawler-blocked this
session. **Cheapest test:** re-run the reddit/SO sweeps from an unrestricted network (est. 1–2h);
threshold: ≥2 independent artifacts per job on a second channel promotes either to wedge.

## OQ-3 — How much does Cloudflare hosting cost us in security review outcomes?

E-129–E-131 show "no egress / runs on Atlassian" is an active enterprise criterion; our bytes live on
Cloudflare (repo gate G1 concern, `validation/G1-security-residency.md`). Unknown: what fraction of
target buyers hard-fail on it. **Cheapest test:** put the honest hosting disclosure on the C11 trust
page and track admin-persona interview reactions (DP-23/DP-24 candidates); threshold: if >1/3 of
admin conversations veto on residency, prioritize the Forge-hosted-storage hedge (`docs/adr/0001`).

## OQ-4 — Does Narva's attachment mode actually resolve multi-file relative paths?

Their docs claim file rendering with JS+CSS (wave-2 competitor data) and document breakage modes
(E-104), but we could not test (no installs allowed by brief). If it works well, JTBD-01
differentiation narrows. **Cheapest test:** 30-min hands-on eval in a sandbox site **after
approval** (brief forbids installing competitor apps without it); threshold: if reliable, sharpen
positioning to isolation+permissions+workflow.

## OQ-5 — What is RFC-136 staticView macro's actual scope?

Thread unreadable in this environment (403). Assessment (macro-body rendering, not bundle hosting)
is inference from the title + Connect staticContentMacro docs. **Cheapest test:** read the RFC from
an unrestricted network; 15 minutes; threshold: if it hosts user-supplied multi-file content,
escalate platform risk in `05_competitive_landscape.md` §5 from low-medium to high.

## OQ-6 — Keyword volumes are entirely unknown.

No keyword tool was available (per brief §7 volumes are marked unknown, intent inferred from SERP
composition only). C01/C05/C11 priorities rest on qualitative intent. **Cheapest test:** one month of
Search Console data after the pillars ship — let real impressions replace guesses.

## OQ-7 — Willingness to pay is unobserved.

No artifact contains a price acceptance; H8 is supported only indirectly (build-cost complaints
D-07/E-071-072; Appfire's paid tiers existing at 1.9k installs, S7). **Cheapest test:** the design
partner program's would-renew/price question (04a guide, Part "Product test") — the same G2 gate the
repo already defines (`validation/G2-demand-validation.md`).

## OQ-8 — Are macro-instance bundle updates a friction point (H7)?

Review mining showed incumbent editability pain (E-091), but we have no evidence about our own
update/versioning flow's friction in real use. **Cheapest test:** watch 3 design partners perform an
update cycle; threshold: if update friction appears, prioritize re-publish UX before new capability.

## OQ-9 — Community author handles (design-partner reachability).

Handles for community-thread candidates are visible on the thread pages but unretrievable in this
environment (proxy 403). Before any outreach approval, someone with normal browser access must fill
the `public_name_or_handle` column of `04_design_partner_candidates.csv` (est. 30 min).

## OQ-10 — Non-English demand.

Brief scope was English-first. The evidence base gives no signal either way about DE/FR/JP
Confluence markets (large Atlassian territories). Revisit only after an English wedge converts
(brief §2 language rule).

## Unverified ideas parked (excluded from all validated counts)

- Interactive API-docs bundles as a category (JTBD-11 — one vendor artifact only).
- SaaS-vendor cross-tenant embedding as a sellable motion (JTBD-18).
- Storybook/Docusaurus publishing as a distinct funnel (JTBD-20).
- Single-file "quick paste" mode to serve JTBD-15 with less friction than folder upload (product
  idea arising from E-110/E-115 — no direct user ask observed for it in Confluence).
- A migration-assessment tool for JTBD-03 (scan DC HTML-macro bodies for self-containedness) —
  plausible, zero direct evidence.
