# Research journal — Mini Site market opportunity

**Brief:** `handbook/mini-site-market-opportunity-research-brief.pages` (converted read-only to PDF for extraction)  
**Snapshot start:** 2026-08-02  
**Rules:** No prospect contact; no installs/purchases; no Marketplace listing changes; public evidence only.

---

## Classification audit and interim decision (2026-08-02)

### What changed

- Applied an explicit three-layer boundary: broad HTML/JS category demand, exact current multi-file fit, and adjacent/not-fit demand.
- Hand-checked an exact example (E082), a native-substitute counterexample (E078), and an ambiguous prototype review (E041) before scaling the rule.
- Corrected E016, E038, E041, E043, E044, and E047. Several had been labelled `multi-file_static_bundle` even though the source showed a single HTML file or did not disclose packaging.
- Added E082: generated GC-analysis folder with `index.html`, PNG, and CSS; 46,219 views and a Jenkins/Cucumber follow-up. It is exact artifact-shape evidence but historical and not Cloud-specific.
- Normalized the CSV to LF after the pre-existing file used CRLF and the inserted row used LF; verified 65 rows / 65 unique IDs / 32 columns per row.

### Revised counts and source risk

- **65 raw / 47 qualified** (`qualified` + `qualified_historical`).
- Atlassian Community contributes **28/47 (~60%)**, above the 40% ceiling.
- To reach 70 qualified without exceeding 40%, the next 23 qualifying artifacts must all come from non-Community sources.

### Marketplace and first-party signals

- Public direct-category snapshots: Narva ~2.35k active installs; Appfire HTML Macro Cloud ~1.8k; Appfire HTML for Confluence ~2.5k; OST free ~1.8k; Yamuno free ~160. These are overlapping active-install signals, not unique paid customers.
- Mini Sites: 1 active install, 0 reviews. At 100 users, Marketplace annual `amount` is USD 1,010 versus Narva USD 400.
- Mixpanel client events through 2026-08-02 were DEVELOPMENT/STAGING only. Backend traffic is test-shaped: 145/147 `bundle_validated` events had `unknown_cloud_id`, with a repeating daily 9 validations / 6 successes / 3 failures pattern. This traffic is not counted as user activation.
- Workers production environments have `MIXPANEL_TOKEN`; the Forge production variable remains unverified because the local Forge CLI is not authenticated.

### Interim decision

**Reposition and test.** Broad HTML/JS demand is real; the exact multi-file Cloud wedge and its willingness to pay are not yet proven. The strongest recent adjacent evidence is single-file AI-generated tools, which the current product intentionally rejects.

Deliverables added: `00_executive_readout.md`, expanded `05_competitive_landscape.md`, and `08_open_questions.md` with 30-day gates.

---

## Recovery note (2026-08-02)

Research packet was lost from disk mid-overnight run. Rebuilt `01_evidence_log.csv` from `/tmp/initial_evidence.csv` + parent replay scripts + subagent E075 and E078–E081. Two provisional records were merged into existing E022/E015 as URL duplicates. **Phantom numeric gap 060–074** — never persisted; re-collection needed. Current verified counts: **64 raw / 46 qualified** (not the subagent's 81/58).

---

## Day 5 — Community high-signal, Reddit, YouTube (subagent [More SO Reddit YouTube evidence](e7f3999e-f916-4c5d-874c-70f2a5a29ebd))

### Net-new records integrated
| ID | Source | Signal |
|---|---|---|
| E075 | Community — **21,610 views** | Paste own HTML+CSS+JS; told impossible without external hosting |
| E078 | Reddit r/atlassian (12 votes) | **Counterevidence** — native iframe sufficient for same-domain admin pages |
| E079 | Framer for Confluence (CollabSoft 2020) | Historical ZIP-upload competitor; Framer+ dormant (~8 installs) |
| E080–E081 | YouTube tutorials (2025–2026) | Practitioner demand for how-to HTML embed content |

### Merged (not double-counted)
- Provisional duplicate A → E022 (SO 78167387 Allure relative-path 404)
- Provisional duplicate B → E015 (Community HTML macro removed May 2026)

### Source mix (qualified, post-recovery)
- Community **~59%** — still above ≤40% target
- Reddit 3, SO 4, marketplace_review 7, youtube 2, practitioner_blog 1

### Remaining gaps
- Re-collect the 15-record numeric gap 060–074 (marketplace review mining, etc.)
- 2–3 more non-Community sources to push Community below 40%
- YouTube comments still uncaptured
- Day 4 quota: ≥100 raw / ≥70 qualified

---

## Final completion and superseding state (2026-08-02)

This section supersedes all earlier interim counts and “remaining gaps” in this journal.

### Final audited counts

- **110 raw artifacts / 70 qualified** (`qualified` plus `qualified_historical`).
- Qualified source mix: Atlassian Community 27; Marketplace reviews 18; Stack Overflow 8; Reddit 7; GitHub issues 6; YouTube 2; practitioner article 1; Atlassian JAC 1.
- Largest source share: **27/70 = 38.6%**.
- User-authored: **70/70**.
- Conservative last-36-month count: **42/70 = 60.0%**. Approximate dates were counted only when the year/month clearly fell after 2023-08-02; `unknown_recent` was not counted.
- 110 unique evidence IDs; 32 fields per row; allowed qualification statuses only; all context/excluded rows have exclusion reasons; every excerpt is 25 words or fewer.

### Deduplication and data repair

- Excluded E040 because it is a clarification from the same underlying Reddit request as E002.
- Excluded E032 from the independent count because it is a comment in the same underlying E014 request; retained it as willingness-to-pay counterevidence.
- A newly captured Mihaela Tache review initially duplicated E036; it was replaced with the independent Nicolas Bolivar simulator review E085.
- Reassigned E058 to a distinct duplicate key because it is a separate commenter and URL from E021, not a repost of the same request.
- Corrected shifted audit fields in E007–E012; `vendor_authored`, duplicate key, qualification status, exclusion reason, relevance, and confidence now occupy the correct columns.
- Added exact public pricing snapshots E126 and E127 rather than leaving USD 1,010 / USD 400 as uncited narrative memory.

### Classification rule and spot check

Four mutually exclusive audit classes were used for all 70 qualified artifacts:

1. `exact_current_fit`: recent Cloud request explicitly states a local multi-file bundle, root `index.html`, relative assets, and no required network/auth/DOM/persistence/write-back.
2. `exact_historical_or_deployment_unverified`: exact shape, but recency or Cloud deployment fails.
3. `adjacent_near_term`: real job with single-file/snippet/unknown shape, build step, API, sizing, diagnostics, or another contained gap.
4. `not_current_fit_or_native_good_enough`: live service, authenticated external data, host DOM, shared persistence, purpose-built integration, or satisfactory native path.

Manual checks before scaling the rule:

- E084: explicit local help-system file set → exact shape, but 2015 → historical exact.
- E088: explicitly self-contained single-file exam app → adjacent; E120 proves the current validator rejects it.
- E043: “multiple scripts/stylesheets” → adjacent; the source does not establish uploaded files rather than inline/external references.
- E096: external HTTP API plus organization-wide UI → not current fit; E029 confirms no external network.
- E078: native iframe already solved the stated admin job → native-good-enough.

Final fit distribution: **0 exact current; 4 exact historical/deployment-unverified; 39 adjacent; 27 not current fit/native-good-enough.** The complete ID lists are in `02_jtbd_top20.md`.

### Net-new source work

- Marketplace review mining added specific outcomes and failures for internally generated QA reports, a local multi-file help system, learning simulators, migration test campaigns, Claude mockups, a complex one-file exam app, AI reports, externally hosted JavaScript, Plotly regressions, private Bitbucket assets, and monthly managed-services reports (E083–E092, E119).
- Stack Exchange API added dbt docs, TestRail, iframe sizing, and external API/widget jobs with exact dates and bodies (E093–E096).
- GitHub search/API added generated report, automated traceability publishing, PivotTable, live test-chart, and Blueprint documentation issues (E097–E101).
- Reddit searches added team artifact discovery, coworker KPI-dashboard sharing, mobile HTML sharing, HTML-as-work-document review gaps, and a page-task progress widget (E102–E105, E118).
- Competitor and workaround context added AI artifact hosts, Slack integration, browser publishing, Tiiny Host, Cloudflare Pages, GitHub Pages, native iframe, and Data Center static-content documentation (E106–E117).
- Current product truth was recaptured from source: one-file rejection, fixed 360px viewer, and last-write-wins per-instance replacement (E120–E122).
- Current Marketplace snapshots were added for Appfire HTML for Confluence, OST, Yamuno, and both 51–100-user prices (E123–E127).

### Disconfirming searches

Disconfirming work was run before ranking the top jobs:

| Hypothesis/job challenged | Search or comparison | Result |
|---|---|---|
| Exact current multi-file Cloud wedge | Recent Marketplace reviews, Stack Overflow, GitHub issues, Reddit, and practitioner searches for folders, assets, static reports, Allure, and dbt | No independently verified recent Cloud request states the whole current contract; four exact shapes are historical/deployment-unverified (E082, E022, E031, E084). |
| AI-generated artifact wedge | Searched Claude/ChatGPT HTML sharing, coworker dashboards, artifact hosts, and competitor AI reviews | Demand is current, but the dominant observed shape is one-file/paste-first and the external artifact-host category is already active (E087–E110, E120). |
| Recurring HTML reports | Searched QA, dbt, traceability, Plotly, TestRail/Testomat, and managed-services reports | Static reports are promising; live dashboards, XML parsers, and shared trackers are incompatible and must not be averaged together (E083, E093, E098, E100, E119). |
| Simulator/decision-aid wedge | Compared exam, training, test-plan, calculator, and database cases | Local-only tools fit; shared state, learner analytics, and Notion-like persistence do not (E085, E086, E088, E004, E052). |
| Prototype wedge | Searched Figma, Balsamiq, Proto.io, Axure, BlueprintUE, and HTML mockups | Live-design embeds are already served by source-specific tools; only exported tool-independent artifacts remain relevant (E058, E087, E101). |
| Private/internal sharing advantage | Compared GitHub Pages, Cloudflare Pages, Tiiny Host, display.dev, PageCrate, and Confluence context | External alternatives are credible; Confluence placement and audience reuse remain hypotheses requiring interviews (E089, E093, E102, E108, E110, E113–E115). |
| Generic HTML macro position | Compared Appfire, Narva, OST, Yamuno, current reviews, prices, and native iframe | Crowded, increasingly free, and not a defensible primary position (E007, E008, E124–E127, E116). |

### JTBD and decision

- Scored 20 jobs using F/U/V/P/D/R/W/X plus confidence.
- Highest horizontal requirements: private/discoverable sharing (78) and stable update/review continuity (74).
- Highest distinct wedges: AI-generated artifacts (77), recurring HTML reports (77), and local-only simulators/decision aids (73).
- Exact multi-file report-folder job: raw 85, confidence-adjusted **63.75** because the exact evidence is not current verified Cloud.
- Final decision: **reposition and test**. Do not scale the current folder-only message; do not lead with generic HTML or live dashboards.

### Deliverables completed

- `00_executive_readout.md` — final decision, evidence, gates, limits.
- `01_evidence_log.csv` — 110 raw / 70 qualified source of truth.
- `02_jtbd_top20.md` — 20 cards, scores, counterevidence, full fit audit.
- `03_seo_content_map.csv` — 4 pillars + 16 supporting clusters.
- `04_design_partner_candidates.csv` — 27 public candidates, all `DISCOVERY ONLY — DO NOT CONTACT`.
- `05_competitive_landscape.md` — 28 alternatives, map, messages, reviews, objections, price pressure.
- `06_positioning_recommendation.md` — category, promises, proof pillars, anti-positioning, gates.
- `07_source_bibliography.md` — complete generated bibliography for E001–E127 IDs present in the CSV.
- `08_open_questions.md` — completed research checklist, 15-task execution backlog, decision gates, uncertainties.
- `09_research_journal.md` — method, corrections, disconfirming searches, and limitations.

### Safety and external state

- No prospects were contacted.
- No competitor apps were installed or purchased.
- No Marketplace listing, price, production deployment, Cloudflare, Forge, D1, or other cloud resource was modified.
- Read-only public web, Marketplace REST/page state, GitHub API, Stack Exchange API, local source, local DuckDB/Mixpanel context, and secret-name listing were used.
