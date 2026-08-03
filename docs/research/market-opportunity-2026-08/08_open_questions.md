# Open questions and recommended task list

**Research cut:** 2026-08-02  
**Authorization boundary:** Research and prepare only. Do not contact candidates, change the Marketplace listing or price, install competitors, or modify production/cloud resources without explicit approval.

## Owner decisions after the research cut

- **T01 — Approved (2026-08-03).** A bundle containing exactly one root `index.html` is an approved legal input shape. Engineering implementation is not part of this research thread; the handoff contract is in [`docs/specs/2026-08-03-t01-single-root-index-bundle-handoff.md`](../../specs/2026-08-03-t01-single-root-index-bundle-handoff.md).
- **T06 — Draft-approved / Contact-blocked (2026-08-03).** Candidate selection, invitation drafts, channel sequencing, and the T13 price-interview script may be prepared locally. Sending, contacting, registering, or logging in to any external platform remains prohibited. T07 and T13 preparation is unlocked; execution remains blocked pending a separate Owner contact authorization.

## Research completion checklist

- [x] 110 raw artifacts collected; 70 qualified after exclusions and deduplication.
- [x] Source balance met: largest source 27/70 (38.6%); all qualified artifacts user-authored; conservative recency 42/70 (60.0%).
- [x] Every excerpt is at most 25 words; every excluded/context row has an exclusion reason.
- [x] All 70 qualified artifacts reviewed under exact / adjacent / not-fit rules.
- [x] Twenty bottom-up JTBD cards scored with evidence, counterevidence, product fit, confidence, and next tests.
- [x] Four SEO pillars and 16 supporting-page clusters mapped.
- [x] Twenty-seven public design-partner candidates prepared; no one contacted.
- [x] Twenty-eight direct, native, hosted, build, and outcome-specific alternatives mapped.
- [x] Positioning and anti-positioning recommendation completed.

## Recommended execution backlog

These tasks are recommendations, not authorization to implement or publish.

| ID | Priority | Task | Why now | Acceptance test | Dependency / status |
|---|---|---|---|---|---|
| T01 | P0 | Accept a single root `index.html` bundle | Recent AI/report evidence is frequently one-file; current validator rejects it (E088, E097, E104, E120) | Unit and E2E tests accept exactly one `index.html` while preserving folder validation, limits, secret scan, and CSP | **Approved 2026-08-03; implementation not started.** Engineering contract: [`docs/specs/2026-08-03-t01-single-root-index-bundle-handoff.md`](../../specs/2026-08-03-t01-single-root-index-bundle-handoff.md) |
| T02 | P0 | Add paste-first HTML input or a deliberate one-file chooser | Competitors and users describe paste-first activation (E075, E087, E089, E097, E124) | A creator can paste/download one self-contained artifact and reach preview without adding a dummy asset | **Design unlocked by T01 approval; implementation waits for T01 to ship and be verified.** Not started |
| T03 | P0 | Publish a compatibility contract and actionable errors | Complex one-file apps fail opaquely elsewhere; current limits are easy to misunderstand (E088, E029, E120) | Every structural, size, secret, network, and unsupported-input failure names cause and next action; public limits page matches behavior | Can start before T01; not started |
| T04 | P0 | Add safe large-view and sizing behavior | Current inline viewer is fixed at 360px; users report clipping, scroll failure, and resize loops (E036, E094, E095, E101, E121) | Canonical fixtures remain usable on desktop/mobile; no infinite growth; explicit large-view control is keyboard accessible | Design/prototype needed; not started |
| T05 | P0 | Build three proof fixtures | Top wedges need demonstrable outcomes, not category claims | Redacted recurring report, clickable mockup, and local-only simulator pass validation with no external network; input shape is disclosed | **Fixture preparation unlocked; full acceptance waits for T01 + T04.** Not started |
| T06 | P0 | Approve or reject wave-1 discovery outreach | Public evidence cannot establish recurrence, admin route, or price | Human explicitly authorizes a named subset and channel; otherwise no messages are sent | **Draft-approved / Contact-blocked (Owner 2026-08-03).** Local candidate, invitation, and channel drafts allowed; no send/contact/account action. Draft pack: [`10_wave1_discovery_draft_pack.md`](10_wave1_discovery_draft_pack.md) |
| T07 | P0 | Run eight artifact walkthroughs after approval | Exact current Cloud shape remains unvalidated | At least five real artifacts, three recurring update workflows, three admin paths, and two price comparisons captured | **Preparation unlocked under T06; execution blocked on separate contact authorization.** Not started |
| T08 | P0 | Run a 10-artifact compatibility matrix | Prevent feature and positioning decisions from inferred file shapes | Record file count, build output, local/external assets, auth/network/storage, errors, viewer behavior, and successful republish for 10 real artifacts | Depends on T06 or attached samples; not started |
| T09 | P0 | Make production activation attributable | Current telemetry cannot cleanly separate UI creators from test/API traffic | Source tags distinguish Forge UI, E2E, CI/smoke, and shared-secret API; production funnel excludes internal/test traffic | Requires separate implementation approval; not started |
| T10 | P1 | Validate a CI/API publisher before building it | Report owners ask for update-in-place automation (E053, E093, E098) | Three owners update weekly; two agree to run a scoped authenticated prototype; failure/retry and tenancy requirements documented | Depends on T07; not started |
| T11 | P1 | Validate version history/comments | Stable update matters, but competitors already offer versions/review (E044, E105–E110, E122) | Three of five recurring-report owners show a recent wrong-version or review-context failure | Depends on T07; not started |
| T12 | P1 | Publish P01/P02/P03/P04 and high-priority support pages | Search results are fragmented and outcome-specific coverage is weak | Pages contain working proof, limits, native/specialist routing, one CTA, and no claim beyond shipped capability | **Drafting unlocked; publication remains gated on T01/T03/T05 plus explicit external-publication approval.** Draft map only |
| T13 | P1 | Run five admin/buyer and price interviews | Public price is USD 1,010 vs Narva USD 400 and free options, but willingness is unknown (E124–E127) | Five comparison discussions; two credible paid thresholds; named approval or procurement path | **Script/preparation unlocked; interviews blocked on separate contact authorization.** Script: [`11_t13_pricing_interview_script.md`](11_t13_pricing_interview_script.md) |
| T14 | P2 | Test Marketplace repositioning | Generic HTML is crowded; target artifact position needs proof | Only after wedge gates pass: controlled title/description change with qualified visit → artifact publish measurement | External change; requires explicit approval |
| T15 | P2 | Decide the future of multi-file-only differentiation | Technical fit is strong, current demand proof is weak (E082, E022, E031, E084) | Retain only if five current Cloud teams show folders, three update monthly, and two admins accept a paid route | Depends on T07/T08/T13 |

## Wave-1 candidate recommendation

No messages have been sent. T06 permits draft preparation only; contact remains blocked. The review-ready shortlist, channel sequence, and individualized drafts are in [`10_wave1_discovery_draft_pack.md`](10_wave1_discovery_draft_pack.md). If contact is later approved, start with a balanced learning set rather than only high-fit advocates:

- AI/single-file: DP06, DP12, DP13, DP14.
- Recurring report and generated site: DP16, DP17, DP26.
- Boundary/falsification: DP08 for package shape; optionally DP15 or DP21 only as a non-sales negative-case interview.

The queue and neutral hooks are in `04_design_partner_candidates.csv`. Candidates marked `exclude` must not receive a product-test pitch.

## Decision gates

### Proceed with the repositioned artifact wedge

All must pass:

1. Five current Confluence Cloud creators provide real artifacts; four publish without source surgery.
2. Three have a named monthly-or-more workflow.
3. Three prefer the Confluence result to their current path for an explicit reason.
4. Two admins accept the hosting/isolation/permission model.
5. Two buyer conversations support a credible paid threshold.

### Retain the current exact multi-file wedge

All must pass:

1. Five current Cloud teams show actual folders with root `index.html` and local relative assets.
2. Three republish monthly or more often.
3. Two publish successfully without developer help.
4. Two admins accept a paid route.

### Pause or narrow

Pause broad investment if fewer than three interviews reveal a recurring compatible job, or if native/free alternatives are good enough in at least five of eight walkthroughs.

## Open uncertainty register

| Question | Current status | Cheapest closing evidence |
|---|---|---|
| What fraction of current AI/report artifacts are one-file, folder, or unbuilt JSX? | Unknown; public evidence leans one-file but is not a population sample | Ten real artifacts from T08 |
| Does Confluence placement beat a dedicated artifact host? | Plausible through context/discovery/privacy evidence | Five direct current-path comparisons in T07 |
| Will creators accept local-only state for simulators? | Unknown; test-plan evidence may imply shared state | Five simulator walkthroughs; three explicit local-only acceptances |
| Will admins accept Cloudflare-hosted bundle bytes and the isolation model? | Unknown | Two admin/security reviews with the actual architecture |
| Is fixed-height viewing an activation blocker or a nuisance? | Repeated pain exists, severity unknown | Usability test with five canonical artifacts |
| Is CI/API publishing a wedge or a later retention feature? | Strong hypothesis; current UI fit is low | Three weekly update workflows and two prototype commitments |
| Will buyers pay a premium over Narva/free macros? | Unknown | T13: five comparisons and two thresholds |
| Is external production activation happening? | Telemetry not attributable enough to conclude | T09 plus one controlled production marker and automation exclusion |

## Explicit non-goals

- Do not weaken CSP or isolation to chase live dashboards, host DOM, authenticated external APIs, or shared databases without a separate approved product/architecture decision (E002, E029, E096, E118).
- Do not treat Marketplace installs, review counts, views, or tutorial views as paid customers or user outcomes.
- Do not publish AI-artifact or single-file claims until the product actually accepts and demonstrates them.
