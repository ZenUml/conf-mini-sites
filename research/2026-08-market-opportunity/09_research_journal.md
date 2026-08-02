# Research journal — method record

Execution date: **2026-08-02** (single-session agent execution of the 10-day brief; the day-by-day plan
in the brief §15 was compressed into phased parallel collection + synthesis in one session).
Executor: Claude Code session on the `conf-mini-sites` repo, branch `claude/read-and-execute-7bd7by`.

## Session 0 — Protocol and product truth (brief §15 "Day 1")

**Targets:** parse the brief; verify product truth against authoritative sources; define
inclusion/exclusion rules; establish taxonomy v0; test source access.

### Decisions and observations

- **Brief ingestion.** The brief arrived as an Apple Pages file; body + table text was extracted
  programmatically (raw-snappy IWA decoding) and transcribed to `99_source_brief.md`. Tables (minimum
  bars, scoring rubric, day plan, seed sources, taxonomy) recovered intact.
- **Product truth source upgrade.** Unlike the brief's assumed "Desktop Agent" (public listing only),
  this session runs inside the product's own repository. Product capability claims were verified
  against **source code and internal design docs**, which outrank listing copy for capability facts:
  - CSP served with every bundle (`src/dispatch/gateway.ts:146`, `src/dispatch/forgeGateway.ts:165`):
    `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
    img-src 'self' data:; connect-src 'self'; frame-ancestors <atlassian>; base-uri 'self';
    form-action 'none'`.
    Consequences: **no external API calls from bundles (connect-src 'self'), no CDN scripts/fonts, no
    external images (data: URIs OK), no form POST anywhere (form-action 'none')**. "Live data" today
    means data shipped inside the bundle or same-origin fetch of bundled files only.
  - Bundle limits (`src/pipeline/bundleValidation.ts:26-28`): ≤2000 files, ≤25 MiB/file, ≤50 MiB
    total. Secret scan at publish. No server-side runtime, no persistent storage, no write-back.
  - Isolation: per-instance Workers on Cloudflare WfP, non-routable, served via a grant-verifying
    dispatch Worker; sandboxed iframe in the page (no host-page DOM access). Permissions inherited via
    Forge (`CLAUDE.md`, `DESIGN.md`).
  - Naming note: repo/listing use "Mini **Sites** for Confluence" (app key
    `com.zenuml.confluence.minisite`, listing 4169123443, public since 2026-07-22); the brief says
    "Mini Site for Confluence". Treated as the same product; deliverables follow the brief's singular.
- **Prior internal research audit.** `docs/research/2026-06-27-mom-test-static-site-hosting.md` (an
  interview guide) and `validation/G2-demand-validation.md` (a demand-to-pay rubric) exist but contain
  **no recorded interview results** — demand beyond the n=1 anchor team was framed but never validated.
  This research is therefore the first systematic demand pass, consistent with the brief's premise.
- **Access constraints (recorded per brief §15 rhythm — "do not spend >20 min on a blocked source"):**
  - The sandbox's network policy **blocks direct page fetches** of marketplace.atlassian.com,
    community.atlassian.com, stackoverflow.com, reddit.com, developer.atlassian.com (HTTP 403 at the
    proxy). **WebSearch works** and returns titles, URLs, dates, and content snippets, including
    `site:` queries.
  - Consequence: evidence capture is **search-snippet-grade**: canonical URLs, titles, visible dates
    and excerpt text are captured; full-thread detail (complete comment chains, exact view counts) is
    frequently `unknown`. Every artifact records what was actually observed; nothing is inferred.
    This is disclosed in `00_executive_readout.md` and `08_open_questions.md` as a fidelity limit.
  - No keyword-volume tool is available → per brief §7, all volume fields are `unknown`; intent is
    inferred from SERP composition only.
- **Inclusion/exclusion rules (v0):** include user-authored artifacts expressing a job/constraint
  relevant to embedding/publishing interactive content in Confluence (Cloud preferred); exclude
  vendor-authored copy from demand counts (retained, flagged `vendor_authored`); exclude pure how-to
  answers with no expressed need; historical (>36 months) retained only with `historical` flag;
  duplicates grouped by underlying request.
- **Taxonomy v0** adopted from brief Appendix B verbatim (artifact / core job / creator / interaction /
  alternative / constraint / outcome signal) with the rule that clusters are built bottom-up and a
  category requires ≥3 artifacts sharing a core job.

### Orchestration record

- Evidence collection fanned out as 17 parallel research agents in one workflow
  (`mini-site-market-research-sweep`): 10 demand collectors by channel/angle (Atlassian Community ×3
  angles, Reddit, Stack Overflow/dev community, YouTube, Marketplace reviews ×2 classes, AI-generated
  apps angle, dedicated counterevidence collector), 4 competitor-class inventory agents, 3 SERP
  observers running the brief §12 query starters.
- Per operator instruction, collection agents ran on Opus (collectors/inventory) and Sonnet (SERP
  observers); synthesis, scoring, deduplication and all final writing were done in the main session.
- Integrity rules baked into every collector prompt: only record artifacts actually observed; never
  fabricate URLs/quotes/metrics; `unknown` when not visible; ≤25-word verbatim excerpts; counterevidence
  recorded with the same care; no posting, no contact, read-only.

## Session 1 — Collection wave 1 + midpoint review (brief §15 "Days 2–5")

### Wave-1 results (17-agent sweep)

- 17/17 agents returned; **0 fabricated results** (integrity rule held: starved agents returned empty
  sets with explicit blockage notes rather than invented evidence).
- **90 raw demand artifacts** collected across 6 collectors (community ×3 angles, reddit-focus,
  stackoverflow-focus, youtube). 12 duplicate groups identified (same underlying request found by
  multiple collectors) → **68 unique underlying artifacts**.
- Funnel: 90 raw → 15 excluded (vendor-authored context or no discernible job) → 12 excluded as
  duplicates (first of each group retained) → **48 qualified demand + 7 qualified counterevidence = 55**.
- **Channel-starvation events (recorded, not compensated by fabrication):**
  - reddit.com and stackoverflow.com are excluded from the search crawler (hard API 400) — the brief's
    S2/S5 channels are structurally unreachable this session. Collectors fell back to
    community/developer-community sources.
  - A shared WebSearch session budget (200 calls) was exhausted mid-sweep: both Marketplace
    review-mining agents, the AI-generated-apps agent, the dedicated counterevidence agent, 3 of 4
    competitor inventory agents, and all 3 SERP agents were starved (zero or near-zero results).
- Seed-source verification (S1–S12) completed separately: notable — **the Mini Site listing itself has
  zero organic search footprint** (only zenuml.com/mini-sites is indexed; plural "Mini Sites" is the
  only name that surfaces); Appfire's HTML Macro shows ~1.9k installs but a **2.9/4 rating (36
  reviews)**; Tableau for Confluence ~240 installs; Dashboard Hub ~371; Table Filter ~15k (low
  confidence, single observation). All Marketplace metrics are search-summary-grade, dated 2026-08-02.

### Midpoint gate (brief §15: "≥50 qualified artifacts, source mix not dominated by historical")

- Qualified count: **55 ≥ 50 → PASS**, but two flags:
  1. **Source balance violation:** Atlassian Community = 75% of qualified (cap: 40%). Cause:
     reddit/stackoverflow structurally blocked + Marketplace reviews starved. Wave 2 targets
     non-community channels (reviews, blogs/HN, YouTube handles); the residual imbalance is disclosed
     rather than papered over.
  2. Historical share is material in two clusters (J06 calculators — all historical; J07 charts) and
     those clusters' confidence multipliers are reduced accordingly.
- Taxonomy v1: 15 bottom-up clusters (J01–J15) built from artifact-level jobs, not from the listing's
  example list; the listing's "calculator/prototype/dashboard" examples map to clusters whose evidence
  varies from strong (bundle publishing) to weak-historical (calculators) to disqualified-now
  (live external BI dashboards) — an explicit check against confirmation bias.
- Decision: **continue to wave 2** (sequential, budget-capped agents, priority order: review mining →
  AI angle → SERP → direct competitors + staticView platform risk → security counterevidence →
  partner handle surfacing), then score and write deliverables.

## Session 2 — Wave 2 (gap-filling) + synthesis (brief §15 "Days 6–9")

### Wave-2 design and results

Six sequential, budget-capped agents (priority-ordered so the most decision-critical slices completed
first if the search budget died again; it did not — 6/6 completed, 0 errors):

1. `reviews:direct-apps` (14 searches) → 16 artifacts (E-091–E-106). Key: incumbent quality gaps are
   systematic — uneditable macro bodies, markup mangling, sizing breakage, attachment fragility.
2. `ai:generated-apps` (14) → 14 artifacts (E-107–E-120). H4 verdict: sharing gap is real and
   2026-current; zero Confluence-specific artifacts; public-URL publishers + platform-native features
   serve the rest; permission-inherited slice open.
3. `serp:outcome-dissat` (13) → 13 observations. Highest-signal query: `upload html folder to
   confluence` (literal match to product, conversion-only answers). `database view` resolves to
   native Databases; `calculator` rewrites to table formulas; `interactive dashboard` owned by
   live-data BI vendors.
4. `competitors:direct+platform` (16) → 10 direct-class products + RFC-136 platform-risk note
   (thread title confirmed; content unreadable → assessment flagged as inference).
5. `counterevidence:security-admin` (12) → 17 artifacts (E-121–E-137): admin HTML-off demand,
   app-approval friction, data-residency/no-egress objections, native-sufficiency cases.
6. `partners:handles` (15) → 14 candidates; community author handles structurally unretrievable
   (proxy 403 even via curl) — recorded as OQ-9 rather than guessed.

### Funnel (final)

137 raw → 34 excluded (vendor-authored context / no discernible job) → 20 duplicate-group exclusions
(first member retained) → **83 qualified (63 demand + 20 counterevidence)**. Source balance:
community-family 75% of qualified (cap 40% — **violation disclosed**; root cause: Reddit/SO
crawler-blocked, so alternate channels could not compensate fully; wave 2 added HN, X, blogs,
vendor-KB and review sources). Recency: ≥60% of qualified artifacts are ≤36 months except clusters
J06/J07 (flagged historical, confidence-reduced).

### Taxonomy changes (v1 → v2)

Added bottom-up during synthesis: JTBD-15 (AI-artifact publishing — emerged from wave-2 evidence),
JTBD-17 (attachment-rendering reliability — emerged from review mining), JTBD-19 (host-page DOM —
split out as a permanently-rejected segment per the split-don't-average gate), JTBD-20 (docs-site
output subcase). Nothing was forced into the listing's example categories; "calculator" and
"prototype" survive only at the evidence level they earned (monitor).

### Scoring and gates

Scores per brief §11 with product-fit verified against shipped code (CSP/limits) — see
`02_jtbd_top20.md`. Priority gates enforced: two-source-type gate demoted JTBD-05 and JTBD-03 from
wedge to test-next; capability gates zeroed JTBD-08/09/14/19/16 despite real demand volume in 08.

### Disconfirming searches run (brief acceptance criterion)

- H1/H2: SERP set incl. category-term queries (`Confluence HTML macro review`) — product-name search
  language absent; outcome/technical language dominant → H1 supported.
- H4 disconfirm: dedicated searches for "prefer external hosting/sandboxes" — found (E-115/E-116
  public-URL cottage industry; E-117/E-120 platform-native absorption) and recorded.
- H6 disconfirm: dedicated counterevidence agent (E-121–E-131) — admin refusal and residency
  objections found and folded into risks (H6 verdict: partial, not confirmed).
- JTBD-01 disconfirm: native-importer-sufficiency cases (E-074, E-089) recorded as counterevidence.
- JTBD-05 disconfirm: nested-Expands-good-enough (E-043) recorded.
- JTBD-02 disconfirm: free-app availability (E-044, Yamuno) recorded; whitespace scored 1/5.

## Session 3 — Deliverables and acceptance (brief §15 "Day 10")

All ten required files produced (plus `04a_design_partner_program.md` for the WS3 guide/program and
`99_source_brief.md` for auditability). Acceptance checklist (brief Appendix C):

- ☑ All required files exist and share evidence IDs (E-xxx / D-xx / S-xx / JTBD-xx / C-xx / DP-xx / OQ-x).
- ☑ Canonical URLs recorded; inaccessible sources marked with access date + alternative
  (07_source_bibliography.md; S2/S5 marked unverifiable).
- ☑ Quotes ≤25 words, from observed text only (enforced in collector prompts + CSV trimming).
- ☑ Source type, author type, deployment, recency, duplicate groups captured per artifact.
- ☑ ≥70 qualified after exclusions/dedup: **83**.
- ☒ **No source >40% of qualified: VIOLATED (community 75%)** — disclosed with root cause (channel
  blocks) in this journal, 00 and 08; per brief §16 the gap is documented rather than silently
  compensated.
- ☑ Every top-three job: two source types (JTBD-01: community+HN; JTBD-02: community+YouTube;
  JTBD-15: blogs+HN+X), counterevidence, code-verified product fit, reachable persona.
- ☑ Calculator/prototype/dashboard/internal-tool appear only at evidenced strength (JTBD-06/10
  monitor; JTBD-08 rejected; internal-tool as positioning frame over JTBD-01/15).
- ☑ Marketplace metrics dated, flagged search-summary-grade, never treated as active-paid-user counts.
- ☑ Native, iframe, direct HTML apps, scenario apps, external hosting, custom Forge all inventoried.
- ☑ Validated / strong-hypothesis / unverified / rejected statuses used and separated throughout.
- ☑ Final decision includes a 30-day plan with explicit pass/fail thresholds (00_executive_readout.md).
- ☑ No prospect contacted; no installs/purchases; no listing or external state changed.

### Method honesty (read this before trusting any single number)

This session's evidence is **search-snippet-grade**: the network policy blocked direct page fetches
of every primary platform, so excerpts, dates and metrics were captured from search-result snippets
and search-backend summaries. Engagement metadata is mostly `unknown`; some author-type labels are
best-effort. The compensating disciplines: no fabrication (starved agents returned empty sets),
single-observation metrics flagged, duplicate grouping, counterevidence quotas, and a bibliography
that lets a reviewer with normal browser access re-verify every URL (est. 2–3 hours to spot-check
the top-50).
