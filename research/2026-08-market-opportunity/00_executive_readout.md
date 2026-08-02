# Executive readout — Mini Site(s) for Confluence market opportunity

Research executed 2026-08-02 per the agent execution brief (`99_source_brief.md`). Evidence base:
**137 raw artifacts → 83 qualified after deduplication** (63 demand + 20 counterevidence), 24
competitor/alternative records across four classes, 13 dated SERP observations, 28 scored design-
partner candidates. Every claim traces to evidence IDs in `01_evidence_log.csv` /
`07_source_bibliography.md`.

## Decision: **Proceed with wedge** (brief §15 final gate)

The gate requires one job scoring 70+ after confidence adjustment, two source types, current
capability fit, and a reachable persona. **JTBD-01 — "publish a multi-file static bundle live on a
Confluence page" — scores 74 evidence-adjusted (validated pattern: 6 independent artifacts, ≥2
channels, counterevidence checked), fits the shipped product exactly (P=5, verified against the
code), and its persona (developers/technical writers) is reachable through named search queries and
community threads.** No other job clears 70; two clear 45–48 as strong hypotheses.

## Recommended owned category

**Mini-site / static-bundle publishing for Confluence** — "publish real files as a live mini-site on
a Confluence page." Not "another HTML macro" (commoditized, 8+ incumbent apps, category leader rated
2.9/4), not a dashboard tool (capability-disqualified), not an app platform.

## Top three jobs (evidence-adjusted scores)

1. **JTBD-01 · 74 · Own now** — upload a folder (site export, project docs, coded prototype, built
   tool) and it runs live with relative paths intact. Every observed workaround fails structurally:
   the native importer converts files into wiki pages and kills the live site, external hosting
   breaks permission inheritance, snippet macros force hand-mangled markup, attachment modes are
   documented-fragile.
2. **JTBD-02 · 68 · Own as doorway** — "HTML on Confluence Cloud" is where the search demand already
   is (9+ independent asks, recurring 2025–2026 tutorials). Serve it with a capability + comparison
   page exploiting incumbents' documented failures (uneditable macro bodies, sizing breakage, price
   complaints) — but do not brand the product as an HTML macro (whitespace = 1/5).
3. **JTBD-15 · 47.6 · Own now (early wedge)** — publish AI-generated tools for team use,
   permission-controlled. Five independent 2026-era artifacts show the sharing gap; the incumbent
   answers are public-URL publishers (no org permissions) and platform-native features; Appfire
   already markets "paste your ChatGPT code." The permission-inherited, secret-scanned slice is
   unclaimed. Caveat: none of the evidence is Confluence-specific yet (open question OQ-1).

**Test-next (blocked from wedge status only by a source-diversity gate):** JTBD-05 interactive
decision-trees/troubleshooting flows (47.6) and JTBD-03 DC→Cloud HTML-macro migration (45.5) — both
Community-only evidence this session because Reddit/Stack Overflow were structurally unreachable
(OQ-2).

## Primary personas

Creator: **developer / technical writer** (JTBD-01), broadening to any AI-assisted knowledge worker
(JTBD-15). Viewer: their team, inside the page. Admin: Confluence site admin (install + app-access
rules). Economic buyer: team/space owner via Atlassian billing. Gatekeeper: security review — the
decisive influencer (20 counterevidence artifacts document admin/security veto power).

## One-sentence value proposition

> Upload a folder of HTML, CSS and JavaScript and it runs live, interactive and permission-inherited
> on your Confluence page — the real thing, not a screenshot, not a converted wiki page, not a
> public link.

## Biggest risks (with mitigations in `06_positioning_recommendation.md`)

1. **Residency objection:** bundle bytes live on Cloudflare while competitors market "runs on
   Atlassian / no egress" — an active enterprise evaluation criterion (E-129–E-131; echoes the
   repo's own G1 gate). Mitigate by proactive disclosure; hedge = Forge-hosted storage option (OQ-3).
2. **Nearest substitute:** Narva's attachment-rendering mode gestures at multi-file; if it becomes
   reliable, differentiation narrows to isolation + permissions + workflow (OQ-4).
3. **Platform absorption:** Atlassian staticView macro (RFC-136), Rovo, and native-feature history
   (whiteboards, Databases, embeds). Moat = the publish workflow (validate → secret-scan → provision
   → permission-inherit), not rendering (OQ-5).
4. **Admin trust ceiling:** a real segment wants HTML/JS embedding off entirely (E-121–E-125);
   security framing must lead, not follow.
5. **Willingness to pay is still unobserved** — no artifact contains a price acceptance; the design
   partner program carries that question (OQ-7, mirrors the repo's G2 gate).

## What NOT to pursue or market yet (negative evidence, stated per brief)

- **Live external BI dashboards** (Grafana/Tableau/Power BI): real demand, hard CSP disqualifier —
  routing this demand in would create failed installs and bad reviews (JTBD-08).
- **Database-like/auto-updating views**: native Confluence Databases owns it (JTBD-09).
- **Forms/input collection**: `form-action 'none'`, no storage (JTBD-14).
- **Host-page DOM/theming uses**: permanently out of scope; say so loudly to disqualify fast
  (JTBD-19 — includes the brief's own Reddit seed S2).
- **Calculator-led marketing**: evidence is entirely historical; keep as an example, not a pillar
  (JTBD-06 — confirming the brief's suspicion about this illustrative case).

## What remains unknown (full register: `08_open_questions.md`)

Confluence-specific AI-artifact demand (OQ-1); JTBD-05/03 second-channel confirmation (OQ-2);
residency veto rate (OQ-3); Narva attachment-mode quality (OQ-4); RFC-136 scope (OQ-5); all keyword
volumes (OQ-6); willingness to pay (OQ-7). Also: all Marketplace metrics herein are search-summary-
grade single observations, and community author handles for partner outreach need a normal browser
session to retrieve (OQ-9).

## 30-day action plan with thresholds

| Week | Action | Threshold / gate |
|---|---|---|
| 1 | Ship pillar C01 ("upload a folder → live mini-site") + live demo + sample bundle; fix listing naming to plural; add Marketplace SEO fields | pages live; Search Console verified |
| 1–2 | Ship trust page C11 (security model incl. honest Cloudflare disclosure) | published; linked from listing |
| 2 | Ship pillar C05 (AI-artifact publishing) + demo | published |
| 2–3 | Human retrieves community handles (OQ-9); **seek approval** for design-partner wave 1 (8 candidates in `04_design_partner_candidates.csv`); on approval send personalized outreach | ≥3 conversations booked |
| 3–4 | Run OQ-2 re-sweep (Reddit/SO) from unrestricted network; read RFC-136 (OQ-5); hands-on Narva eval **after approval** (OQ-4) | gates in 08_open_questions.md |
| 4 | Review: organic signals on C01/C05, partner conversations, residency reactions | **Success = ≥5 organic installs or ≥10 sample downloads or ≥3 partner conversations confirming JTBD-01/15; else reposition per test-next jobs** |

Nothing external was changed during this research: no contact, no installs, no purchases, no listing
edits. Deliverables 00–09 constitute the complete decision packet.
