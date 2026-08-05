# Executive readout — real market demand for Mini Sites

**Research cut:** 2026-08-02  
**Decision:** **Reposition and test. Do not scale the current multi-file-only proposition yet.**  
**Completed sample:** 110 raw artifacts; 70 qualified after exclusions and deduplication.

## Bottom line

There is a real market for putting custom interactive HTML work inside Confluence. The evidence does **not** validate the current narrow product contract as the best wedge.

The current product requires more than one local file, a root `index.html`, relative assets, no outbound network, and an isolated fixed-height viewer (E029, E120, E121). After strict review:

- **0** qualified artifacts are independently verified as recent, Confluence Cloud, and an exact match for that whole contract.
- **4** have the exact multi-file shape but are historical or likely Server/Data Center: E082, E022, E031, E084.
- **39** are adjacent and potentially unlockable.
- **27** require live services, authenticated external data, host-page DOM, shared persistence, or a sufficient native/specialist alternative.

The strongest recent demand is for self-contained or paste-first AI-generated artifacts: reports, mockups, widgets, dashboards, decision aids, and simulators (E042, E047, E085, E087–E089, E097, E103–E105). The current validator rejects a one-file artifact (E120).

Therefore the honest conclusion is:

> **Validated category, validated adjacent jobs, unvalidated current input wedge.** The next product decision should be based on real artifacts and a single-file activation test—not on more generic HTML/dashboard marketing.

## Sample quality

- 110 raw; 70 qualified, independent user-authored artifacts.
- Largest qualified source: Atlassian Community, 27/70 (38.6%), below the 40% ceiling.
- Marketplace reviews: 18/70; Stack Overflow: 8/70; Reddit: 7/70; GitHub issues: 6/70; two YouTube artifacts; one practitioner article; one Atlassian JAC request.
- All 70 qualified artifacts are user-authored. A conservative 42/70 (60.0%) are from the last 36 months.
- Every excerpt is 25 words or fewer; excluded comments from the same underlying request are not counted independently (E032, E040).

## Top opportunities

The full scoring model and 20 JTBD cards are in `02_jtbd_top20.md`.

| Opportunity | Adjusted score | Evidence-backed interpretation | Decision |
|---|---:|---|---|
| Private, discoverable internal artifact sharing | 78 | Repeated horizontal requirement, not an acquisition wedge (E075, E084, E089, E093, E102, E104) | Proof pillar |
| AI-generated interactive artifact | 77 | Ten recent artifacts across four channels; dominant format is not the current folder contract (E042, E047, E087–E089, E097, E102–E105) | Own after single-file unlock |
| Polished recurring HTML report | 77 | QA, generated-report, AI-report, and explicit monthly client-report outcomes (E083, E089, E097, E119) | Primary wedge candidate |
| Stable republish and review continuity | 74 | Recurring update need; current last-write-wins replacement helps but versions/comments are not evidenced (E044, E053, E093, E098, E102, E105, E122) | Proof pillar |
| Local-only simulator or decision aid | 73 | Training, exam, test-plan, decision-tree, and calculator artifacts; shared persistence must be excluded (E047, E051, E085, E086, E088) | Wedge candidate |
| Exact multi-file engineering/QA bundle | 63.75 | Technical fit is clean, but confidence is discounted because exact evidence is old or deployment-unverified (E082, E022, E031, E084) | Validate now |

The three distinct acquisition wedges are: **AI-generated artifacts, recurring HTML reports, and local-only simulators**. Privacy and stable republishing are common proof pillars rather than separate segments.

## What not to pursue

- **Live dashboards:** real demand, wrong product. Tableau, Power BI, Grafana, Jira, TestRail, and Testomat cases require auth, refresh, APIs, or external services blocked by the current network boundary (E017–E019, E054, E056, E094, E100, E029).
- **Host-page analytics or task widgets:** users explicitly need the surrounding Confluence DOM or API state; isolation is disqualifying (E002, E096, E118).
- **Already-hosted pages:** native iFrame is usually the simpler answer when the target permits framing (E078, E116).
- **Live Figma/Blueprint content:** Smart Links and dedicated integrations preserve live source semantics better; only a tool-independent static export belongs in the prototype wedge (E058, E101).
- **Generic spreadsheet/calculator positioning:** evidence is weak and native/table apps are often good enough (E051, E052, E012).

## Competitive reality

The generic HTML category is established and crowded:

| Product | Capture signal | Implication |
|---|---:|---|
| Appfire HTML for Confluence | 2,482 installs; 22 reviews | Broad paid multi-source incumbent (E123) |
| Narva HTML Macro | ~2,348 installs; 31 reviews | Closest Confluence-native breadth and current AI/file language (E008) |
| Appfire HTML Macro Cloud | 1,780 installs; 36 reviews | Established paid snippet/JS category (E007) |
| OST HTML Macro Pro | ~1,795–1,799 installs; 23 reviews; free | Strong price and AI-artifact pressure (E124) |
| Yamuno HTML Macro | 160 installs; 0 reviews; free | Free long-tail pressure (E125) |
| Mini Sites | 1 install; 0 reviews | No public traction proof yet (E001) |

These are overlapping active-install signals, not unique users, customers, or paid licenses.

Outside Confluence, a new artifact-host category already offers one-file activation, API/MCP publishing, company auth, stable links, versions, and comments (E106–E110). Static hosts already accept folders, ZIPs, repositories, and CI (E113–E115). Mini Sites cannot win on “we host HTML” alone.

## Pricing risk

The public Marketplace annual 51–100-user tier is USD 1,010 for Mini Sites versus USD 400 for Narva (E126, E127); OST and Yamuno are free (E124, E125). This does not prove Mini Sites is overpriced, but there is no user evidence yet that the current multi-file distinction justifies the premium.

## Recommended position

**Category:** Confluence-native interactive work-artifact publisher.

**Target promise after the input unlock:**

> Put an AI-generated report, prototype, or local-only tool directly on a Confluence page—sandboxed, private to the page context, and easy to update—without setting up a repository or separate host.

**Truthful promise today:**

> Publish a built HTML/CSS/JS folder directly on a Confluence page, preserving its relative files without a separate host.

Do not use the target promise until one-file HTML is accepted and verified. Full messaging and anti-positioning are in `06_positioning_recommendation.md`.

## Product and research priorities

1. **P0 — accept a single self-contained `index.html` and optionally pasted HTML.** Keep root entrypoint validation for folders; remove the artificial “more than one file” requirement (E088, E097, E104, E120).
2. **P0 — add a safe large-view/height path and actionable validation errors.** The current 360px frame and opaque competitor failure patterns are material activation risks (E036, E088, E094, E095, E101, E121).
3. **P0 — test real artifacts before changing the live listing.** Start from the 27-candidate discovery queue; no one has been contacted.
4. **P1 — preserve stable republish and measure recurrence.** Add version history only after wrong-version/review failures are demonstrated (E044, E053, E098, E105, E122).
5. **P1 — test CI/API publishing only after manual report recurrence is proven.** Automation has high value but weak current product fit (E053, E093, E098).
6. **P1 — publish an honest compatibility chooser and limits page.** Route existing URLs to native iframe and live/authenticated jobs to specialist apps or Forge (E029, E116).

## Decision gates

Proceed with the repositioned wedge only if:

- Five current Confluence Cloud creators provide real artifacts and four publish without source surgery.
- Three artifacts belong to a named workflow recurring monthly or more often.
- Three creators prefer the Confluence result to their current host/file/macro path for a stated reason.
- Two admins accept the hosting, isolation, and permission story.
- Two price conversations establish a credible comparison or willingness threshold.

Retain the multi-file-only position only if five current Cloud teams show real folders, at least three update them monthly, and at least two admins accept a paid route. Pause the wedge if native/free alternatives are good enough in five of eight artifact walkthroughs.

## Limitations

- Public posts and reviews reveal problems and outcomes, not market size.
- Review cohorts may be solicited; no review volume is treated as prevalence (E041–E044, E085–E090, E119).
- Exact recent Cloud bundle evidence remains absent.
- No buyer interview, admin approval, install experiment, or willingness-to-pay interview has occurred.
- First-party production telemetry remains insufficiently attributable; absence of clean client events is not evidence of zero production use.

## Final recommendation

Keep the product available as a validation instrument, but stop treating “multi-file mini-site” as the proven demand. Make the smallest input and viewing changes needed to test the evidenced artifact jobs, run approved artifact walkthroughs, and scale only after the outcome gates pass.
