# Market investment HTML report design

**Status:** Approved in conversation on 2026-08-03  
**Research cut:** 2026-08-02  
**Planned output:** `docs/research/market-opportunity-2026-08/market-investment-report.html`

## Goal

Create a single-file Chinese HTML report that answers two decisions:

1. Which product capabilities should Mini Sites build next?
2. Which SEO assets should receive investment now, after product proof, or not at all?

The report serves both a five-minute executive read and a deeper team review. It must preserve the research conclusion: broad demand is real, but the current multi-file-only wedge is not validated by recent exact Cloud evidence.

## Approved direction

- **Information model:** parallel operating board. Product and SEO investment remain visible side by side, with explicit dependencies between them.
- **Visual direction:** product blueprint. The page uses an engineering-grid surface, revision marks, monospace utility labels, and safety orange for risks and gates.
- **Signature element:** a dependency bus connecting each product capability to the SEO claim or asset it unlocks. This prevents marketing from running ahead of shipped behavior.

## Source material and claim rules

The report is a frozen presentation of these existing research artifacts:

- `00_executive_readout.md`
- `01_evidence_log.csv`
- `02_jtbd_top20.md`
- `03_seo_content_map.csv`
- `05_competitive_landscape.md`
- `06_positioning_recommendation.md`
- `07_source_bibliography.md`
- `08_open_questions.md`

The executive readout and audited evidence CSV control aggregate counts. The report will use 110 raw artifacts, 70 qualified artifacts, 0 recent exact current-contract matches, 4 historical or deployment-unverified exact shapes, 39 adjacent opportunities, and 27 not-current-fit/native-good-enough cases. Any stale count in a supporting narrative file will not override the audited aggregate.

Every substantive market claim carries one or more evidence IDs or is explicitly labelled as a recommendation. Marketplace installs and reviews remain market signals, not users, customers, paid licences, or willingness-to-pay evidence. The post-unlock positioning promise must not appear as a current product capability.

## Information architecture

The fixed navigation contains seven anchors:

1. **结论 / Verdict** — the decision, the evidence counts, and the recommended initial investment bias.
2. **市场信号 / Evidence** — validated category, strongest adjacent jobs, exact-fit gap, and rejected jobs.
3. **双轨投入 / Build × Grow** — paired product and SEO investments with dependencies and proof gates.
4. **90 天顺序 / Sequence** — what to do in days 0–30, 31–60, and 61–90.
5. **验证门槛 / Gates** — proceed, retain-current-wedge, and pause thresholds.
6. **不做什么 / Boundaries** — live dashboards, host-DOM widgets, authenticated external data, live design tools, and other rejected positioning.
7. **证据索引 / Sources** — key evidence IDs, source links, methodology, and limitations.

The opening thesis is: **“需求是真的。当前入口错了。”** The supporting decision is: **reposition and test before scaling**.

## Product investment lane

The report recommends this order without authorizing implementation:

1. **P0: accept one self-contained root `index.html`.** Preserve folder validation, secret scanning, CSP, and limits.
2. **P0: make compatibility and validation understandable.** Add paste-first or a deliberate one-file path only after the core acceptance contract is settled; name causes and next actions for unsupported structures.
3. **P0: add a safe large-view path.** Test capped sizing plus an explicit keyboard-accessible large view; do not promise unconstrained auto-height.
4. **P0: build three proof fixtures.** Use a redacted recurring report, a clickable prototype, and a local-only simulator.
5. **P0: make activation attributable.** Separate Forge UI, E2E, CI/smoke, and shared-secret traffic before judging growth.
6. **P1 validation only:** CI/API publishing, version history, and comments remain discovery items until recurring update or review failures are demonstrated.

## SEO investment lane

Assets are divided by claim readiness:

### Build or refresh now, using only current truth

- Refresh P01, the honest HTML-in-Confluence chooser, rather than create a second overlapping generic pillar.
- Publish or prepare S14, the sandbox/security/limits page.
- Keep iframe-versus-uploaded-artifact guidance inside P01 unless search evidence later justifies a separate page.
- Improve the current multi-file folder page with fixtures and exact compatibility language, but keep promotion organic until current Cloud recurrence is validated.

### Prepare now; publish only after capability and proof

- P02: AI-generated HTML in Confluence.
- P03: recurring interactive HTML reports.
- S03: single self-contained HTML file.
- S01/S02: Claude- and ChatGPT-generated artifact workflows.
- S06/S07/S08/S09/S10: Allure, offline Plotly, exported prototypes, local-only simulators, and branded reports.

Each page requires a working fixture, disclosed input shape, current compatibility statement, one honest CTA, and a link to the limits page.

### Do not target as product-acquisition promises

- Live or authenticated dashboards.
- Host-page DOM or page-aware widgets.
- Already-hosted URLs when native iframe is sufficient.
- Live Figma or Blueprint content.
- Shared persistence, write-back, secret-backed APIs, or generic spreadsheet/calculator positioning.

## Build × Grow dependency pairs

| Product proof | SEO asset unlocked | Gate |
|---|---|---|
| Current compatibility contract and actionable limits | P01 chooser and S14 trust/limits | Content matches current production behavior |
| One-file E2E plus complex self-contained fixture | P02, S01, S02, S03 | Single file publishes without dummy assets or source surgery |
| Safe large-view fixtures on desktop and mobile | P03, S08, S10, S16 | No clipping, runaway growth, or keyboard trap |
| Three outcome fixtures and stable republish | Report/prototype/simulator gallery and supporting use-case pages | Every example states file shape, local state, and network boundary |
| Attributable production funnel | SEO and Marketplace experiments | Internal/test traffic excluded from activation and retention |

## 30/60/90-day presentation

The sequence is conditional rather than a promise of calendar delivery:

- **Days 0–30:** settle and build the one-file contract; improve compatibility language and errors; prepare P01/S14; recruit approved artifact walkthroughs; define attribution.
- **Days 31–60:** ship only after verification; exercise ten real artifacts; complete large view and three proof fixtures; publish proven P02/P03/S03 assets; capture publish and viewer outcomes.
- **Days 61–90:** expand only the clusters whose artifact tests and search intent both hold; run controlled Marketplace positioning after explicit approval; keep CI, versions, and comments in validation unless their gates pass.

The report will recommend an initial effort bias, clearly labelled as judgement rather than measured market data: **55% capability and compatibility, 25% proof fixtures and artifact validation, 20% SEO foundation and measurement**. The allocation is intended for the first validation cycle and should be revised after the gates are measured.

## Interaction and responsive behaviour

- The desktop page uses a fixed left navigation and a main content sheet; mobile collapses to a sticky horizontal section index.
- Anchor links work without JavaScript. A small inline script may highlight the active section and provide optional filters for priority and claim readiness.
- Evidence detail uses native `details`/`summary` elements so it remains accessible without script.
- Tables become stacked cards below tablet width. Paired Build/Grow cards retain their relationship and order.
- Visible keyboard focus, semantic headings, adequate contrast, and `prefers-reduced-motion` are required.
- No external fonts, frameworks, images, analytics, or network requests are allowed. The final file opens directly from disk.

## Visual tokens

- Blueprint ink: `#202936`
- Paper: `#F7F8FA`
- Grid: `#E5E8ED`
- Safety orange: `#FF6B35`
- Build blue: `#284EAA`
- Grow green: `#13755F`
- Muted text: `#5C6571`
- Body type: `"PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif`
- Utility and data type: `ui-monospace, "SFMono-Regular", Consolas, monospace`

Orange is reserved for risks, unmet dependencies, and decision gates. Blue identifies product work; green identifies SEO/content work. Decoration that does not encode one of those meanings is omitted.

## Data flow and failure behaviour

All facts are embedded at authoring time. The page performs no runtime fetch and is not a live dashboard. Source URLs are ordinary outbound links opened only by the reader.

If JavaScript is disabled, navigation, reading order, evidence disclosures, and source links still work. The report shows unknowns as unknowns; it does not replace missing keyword volume, interviews, admin review, attribution, or willingness-to-pay evidence with synthetic estimates.

## Validation

Before delivery:

1. Parse the HTML and verify that every navigation anchor resolves exactly once.
2. Verify aggregate counts and top opportunity scores against the research files.
3. Verify referenced evidence IDs exist and linked source URLs are non-empty.
4. Open the file from `file://` and confirm it makes no required network requests.
5. Test at desktop, tablet, and mobile widths; inspect the full-page screenshots.
6. Check keyboard navigation, focus visibility, active-section behaviour, native disclosures, and reduced motion.
7. Check browser console errors and broken links.
8. Confirm that no production, Marketplace, outreach, pricing, or cloud action occurred.

## Non-goals

- No product implementation, deployment, Marketplace change, outreach, or pricing change.
- No live analytics dashboard or automatic research refresh.
- No claim that SEO volume, conversion, willingness to pay, or exact current Cloud demand has already been measured.
- No reproduction of all 110 artifacts in the main reading flow; the evidence index remains an audit path, not the report's primary narrative.
