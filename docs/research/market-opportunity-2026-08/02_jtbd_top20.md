# Mini Sites for Confluence — Top 20 JTBD opportunity map

Research cut: 2026-08-02. Source of truth: `01_evidence_log.csv`.

## Decision before the cards

The broad job is real, but the current product contract is not the dominant contract in recent evidence.

- 102 raw artifacts and 70 qualified, independent demand artifacts remain after exclusions and deduplication.
- The largest qualified source is Atlassian Community at 27/70 (38.6%). All 70 qualified records are user-authored. A conservative 42/70 (60.0%) fall within the last 36 months.
- Strict fit review found **0 independently verified, recent Confluence Cloud requests that explicitly require the current “more than one local file + root `index.html` + no outbound network” contract**. Four artifacts describe that exact bundle shape, but they are historical or likely Server/Data Center: E082, E022, E031, E084.
- Thirty-nine qualified artifacts are adjacent and potentially unlockable; 27 require live services, host-page DOM, authenticated external data, native features, or another capability outside the current product boundary.
- Recent AI demand is unusually consistent about self-contained or paste-first output. The current validator rejects a one-file bundle (E088, E097, E104, E105, E120).

This supports **reposition-and-test**, not “the existing folder-upload proposition is already validated.”

## Scoring method

`Raw = 20 × (0.20F + 0.15U + 0.15V + 0.15P + 0.10D + 0.10R + 0.10W + 0.05X)`.

F = frequency, U = urgency, V = organizational value, P = current product fit, D = workaround dissatisfaction, R = reachability, W = whitespace, X = repeatability. Confidence is 1.00 for five or more independent artifacts across at least two channels, 0.75 for a strong hypothesis, and 0.45 for an unverified idea. A hard capability disqualifier overrides a high numerical score.

## Ranked summary

| Rank | ID | Job | F/U/V/P/D/R/W/X | Raw | Confidence | Adjusted | Decision |
|---:|---|---|---|---:|---:|---:|---|
| 1 | J08 | Keep an HTML artifact private and discoverable inside the company workspace | 4/4/4/4/4/4/3/4 | 78.00 | 1.00 | 78.00 | Product pillar, not a standalone wedge |
| 2 | J01 | Publish an AI-generated interactive HTML artifact for team review | 5/4/4/2/4/5/2/5 | 77.00 | 1.00 | 77.00 | Own after single-file unlock |
| 3 | J05 | Publish a polished recurring HTML report in Confluence | 4/4/5/3/4/3/3/5 | 77.00 | 1.00 | 77.00 | Wedge candidate |
| 4 | J20 | Republish under a stable location with versions and review continuity | 4/4/4/3/4/3/3/5 | 74.00 | 1.00 | 74.00 | Product pillar |
| 5 | J03 | Run a self-contained learning simulator or decision aid in the knowledge base | 4/4/4/2/4/4/3/5 | 73.00 | 1.00 | 73.00 | Wedge candidate after input unlock |
| 6 | J04 | Review a clickable HTML prototype or mockup in the project page | 4/3/4/3/3/4/2/4 | 68.00 | 1.00 | 68.00 | Test next |
| 7 | J06 | Share an interactive chart or data snapshot without a live BI service | 4/3/4/3/3/4/2/4 | 68.00 | 1.00 | 68.00 | Test next |
| 8 | J09 | Render custom HTML/CSS/JS that native macros cannot express | 5/3/3/2/4/5/1/4 | 68.00 | 1.00 | 68.00 | Acquisition cluster, crowded product job |
| 9 | J13 | Embed a live external dashboard | 5/4/5/0/3/5/0/5 | 68.00 | 1.00 | 68.00 | Reject |
| 10 | J18 | Migrate legacy HTML content from Server/DC or the legacy editor | 4/4/4/2/4/4/2/2 | 68.00 | 1.00 | 68.00 | Monitor; time-boxed segment |
| 11 | J02 | Publish a generated multi-file engineering or QA report bundle | 4/4/5/5/4/4/3/5 | 85.00 | 0.75 | 63.75 | Exact product-fit hypothesis; validate now |
| 12 | J10 | Make the embedded experience responsive, tall enough, or full-screen | 4/3/3/1/4/3/3/4 | 61.00 | 1.00 | 61.00 | Required capability |
| 13 | J16 | Embed an already-hosted web page by URL | 5/3/3/0/2/5/0/4 | 56.00 | 1.00 | 56.00 | Reject; native iframe is often enough |
| 14 | J07 | Publish and refresh generated reports automatically from CI | 3/5/5/1/5/3/4/5 | 74.00 | 0.75 | 55.50 | Test after manual wedge |
| 15 | J19 | Put test results in Confluence without converting them manually | 4/4/4/2/4/3/2/5 | 69.00 | 0.75 | 51.75 | Split HTML export from XML/live feeds |
| 16 | J17 | Render private authenticated external assets or API data | 3/5/5/0/4/3/2/4 | 64.00 | 0.75 | 48.00 | Reject under current security boundary |
| 17 | J14 | Build a widget that reads the surrounding Confluence page | 3/4/4/0/4/3/3/4 | 60.00 | 0.75 | 45.00 | Reject |
| 18 | J15 | Embed a live Figma/Blueprint design surface | 3/3/4/0/2/4/0/4 | 49.00 | 0.75 | 36.75 | Reject; retain static-export subcase in J04 |
| 19 | J11 | Add a custom calculator or formula tool | 2/3/3/2/2/4/1/4 | 50.00 | 0.45 | 22.50 | Unverified; do not lead with it |
| 20 | J12 | Recreate a Notion-like live database view | 2/3/3/0/2/3/0/4 | 40.00 | 0.45 | 18.00 | Reject |

J08 and J20 score highly because privacy, stable location, and repeated updates recur across several jobs. They are horizontal requirements, so they are not counted as separate acquisition wedges. The three distinct wedge candidates are J01, J05, and J03; J02 is the highest-priority falsification test for the product's current exact contract.

## JTBD cards

### J01 — AI-generated interactive artifact

**JTBD.** When Claude, ChatGPT, or a coding agent creates an HTML report, widget, dashboard, or mockup, I want to publish it in the project documentation in one step, so colleagues can open and review it without AI accounts or hosting work.

- Creator/viewer/admin/buyer: analyst, product or technical creator → colleagues/managers → Confluence admin → team or site owner. Artifact: usually self-contained HTML, a snippet, or an unbuilt JSX artifact.
- Current workflow: paste into an HTML macro; try GitHub Pages; send raw files or links; fall back to screenshots or Slack. Failures include public-repository concern, complex single-file rendering errors, broken discovery, and lost interactivity (E042, E047, E087, E088, E089, E097, E102, E103, E104, E105).
- Evidence: 10 independent artifacts, four channels, 10 recent. Paid-app adoption and explicit team workflows exist, but installs or ratings are not treated as outcomes beyond each review (E042, E087, E088, E089).
- Product fit/counterevidence: isolation and Confluence context fit, but one-file HTML is rejected and the inline viewer is fixed-height (E120, E121). Narva/OST and a fast-growing class of generic artifact hosts already support paste-first or single-file publishing (E008, E055, E106–E113).
- Recommendation/next test: **Own after a P0 single-file/paste unlock.** Test five real artifacts from five public candidates. Pass if at least four publish without manual file surgery and at least three prefer the Confluence result to their current sharing path.

### J02 — Generated multi-file engineering or QA report bundle

**JTBD.** When an engineering tool generates a folder containing `index.html`, JavaScript, CSS, images, or report data, I want to publish the intact folder in Confluence so the team can navigate it without rebuilding the report.

- Creator/viewer/admin/buyer: developer, QA engineer, data engineer, technical writer → engineering and business readers → Confluence admin → engineering/documentation owner.
- Workflow and requirements: generated report folder, relative paths, private access, and sometimes recurring updates. Workarounds include server filesystem access, attachments, external hosting, and HTML macro support (E082, E016, E022, E031, E084, E093).
- Evidence: six artifacts, three channels, three recent. The four explicit multi-file cases are E082, E022, E031, E084; none is a verified recent Cloud case.
- Product fit/counterevidence: the current product is technically well matched to a local multi-file folder (E001, E120), but current recurrence is unvalidated. Tiiny Host and Cloudflare Pages already accept ZIPs or folders for users willing to host outside Confluence (E113, E114).
- Recommendation/next test: **Validate now, do not scale messaging yet.** Pass only if five current Confluence Cloud teams can show an actual local multi-file report folder and at least three update such a report monthly or more often.

### J03 — Self-contained simulator, learning tool, or decision aid

**JTBD.** When static documentation is insufficient for practice or guided decisions, I want a self-contained interactive tool in the knowledge base so users can learn or decide without leaving the page.

- Artifacts include a decision tree, formula tool, question simulator, migration test campaign, and 150-question exam simulator (E047, E051, E085, E086, E088).
- Evidence: five artifacts, three channels, four recent. The strongest outcomes are team-wide learning access and moving a test campaign out of offline spreadsheets (E085, E086).
- Critical requirements: HTML/CSS/JS, forms, local state, clear validation errors; shared persistence must be separated from local-only interaction (E086, E088).
- Product fit/counterevidence: most recent examples have unknown or single-file packaging; multi-user persistence is not supported. Table/spreadsheet apps are good enough for some calculation jobs (E052, E012).
- Recommendation/next test: **Own the local-only subsegment after single-file support.** Pass if three of five candidate simulators run entirely client-side and their owners accept reset-on-browser/no shared write-back.

### J04 — Clickable prototype or mockup review

**JTBD.** When a design or code prototype is ready for review, I want it clickable inside the project page so reviewers can experience the flow in context rather than inspect screenshots.

- Evidence: seven artifacts, four channels, five recent (E021, E041, E042, E047, E058, E087, E101).
- Workarounds: PNG exports, Figma Smart Links, external embeds, HTML widgets, or AI-generated mockups pasted into an HTML macro. Pain centers on stale screenshots, small frames, permissions, and context switching (E021, E058, E101).
- Fit: exported static HTML may fit, but live Figma/Blueprint surfaces and package shapes do not. Current 360-pixel viewer height weakens prototype review (E121).
- Counterevidence: native Smart Links or a purpose-built Figma/Blueprint integration can be better for live source-of-truth designs (E058, E101, E116).
- Recommendation/next test: **Test exported, tool-independent prototypes only.** Pass if four of six designers already possess a static HTML export and three prefer it to a live-tool embed for the targeted review.

### J05 — Polished recurring HTML report

**JTBD.** When a recurring technical, QA, analysis, or client report must be delivered, I want a branded, navigable HTML report in Confluence so readers avoid PDFs, external tools, and flat native layouts.

- Evidence: six artifacts, four channels, four recent (E082, E083, E089, E097, E119, E047).
- Value/urgency: QA reports were called essential; current users report monthly client deliverables and a switch away from PDFs or external tools (E083, E119).
- Requirements: repeatable template, side navigation, CSS/JS, responsive height, private access, and update-in-place. Package shape is usually unknown or single-file (E089, E097, E119).
- Fit/counterevidence: current hosting and replacement model help, but single-file rejection and fixed height create activation and presentation gaps (E120–E122). PDFs remain good enough when interaction and layout control do not matter.
- Recommendation/next test: **Primary wedge candidate.** Pass if five recurring-report owners provide an artifact, four publish successfully after the input unlock, and three report monthly-or-more recurrence plus a named stakeholder audience.

### J06 — Interactive chart or static data snapshot

**JTBD.** When analysis produces an interactive chart or static dashboard, I want the browser-native export in Confluence so readers can hover, filter, and inspect it without a BI service.

- Evidence: five artifacts, four channels, four recent (E016, E022, E045, E091, E099).
- Requirements: bundled chart library, CSS/JS, responsive sizing, and deterministic relative assets. CDN-dependent Plotly exports conflict with the no-outbound CSP unless dependencies are bundled (E045, E029).
- Fit: plausible for fully bundled exports, but current package shapes and library compatibility are unverified; viewer height is fixed (E121).
- Counterevidence: native Table Filter/Charts wins for Confluence table data; live BI dashboards are a different rejected job (E012, E013).
- Recommendation/next test: **Test with five exported artifacts across Plotly, PivotTable, and one report generator.** Pass if four run offline with bundled dependencies and three owners need interaction beyond an image.

### J07 — CI/API publishing

**JTBD.** When a generated report changes, I want CI to republish it to the same Confluence location so documentation stays current without manual copy or link churn.

- Evidence: six artifacts, four channels, all recent (E044, E053, E093, E098, E102, E105).
- Workarounds: attached-file versioning, direct links, manual copy, or a proposed REST publisher. Staleness and broken discovery are the central pains (E053, E093, E098, E102).
- Fit: current code replaces a per-instance worker, but the observed product surface is manual and no public version-history workflow is evidenced (E122).
- Counterevidence: BinHTML, display.dev, and Handoff already advertise API, CLI, agent publishing, or versions outside Confluence (E107–E109).
- Recommendation/next test: **Defer implementation until manual recurrence is proven.** Pass discovery if at least three report owners update weekly and two will run a scoped API prototype from CI.

### J08 — Private, discoverable internal sharing

**JTBD.** When an HTML artifact contains internal work, I want it discoverable under existing company permissions so I do not need a public repository, a separate audience system, or transient Slack links.

- Evidence: six artifacts, four channels, four recent (E075, E084, E089, E093, E102, E104).
- Current pain: external hosting setup, perceived public-repository requirements, raw-file friction, and artifacts discoverable only through direct links (E089, E102, E104).
- Fit: inherited Confluence context is a credible differentiator, but the dominant recent single-file shape still fails validation (E001, E120).
- Counterevidence: GitHub Pages supports private repositories on paid plans, while display.dev and PageCrate offer explicit access controls outside Confluence (E108, E110, E115).
- Recommendation/next test: **Treat as a proof pillar for J01/J02/J05, not a separate landing-page promise.** Ask every design partner who must view the artifact and whether Confluence permission inheritance changes the decision.

### J09 — Custom HTML/CSS/JS beyond native macros

**JTBD.** When native Confluence formatting cannot express the desired layout or behavior, I want to render my HTML/CSS/JS so the page supports the experience I designed.

- Evidence: 10 artifacts, three channels, seven recent (E003, E014, E015, E035, E048, E057, E075, E080, E081, E119).
- Reachability is high because users search the technical phrase directly; dissatisfaction includes missing Cloud macros, frozen legacy content, and layout limits (E014, E048, E057, E075).
- Fit: the demand is mostly snippet/paste-first, while Mini Sites requires a folder with more than one file (E120).
- Counterevidence: Appfire, Narva, and OST already own this category language and some admins reject paying for basic HTML capability (E007, E008, E032, E055).
- Recommendation/next test: **Use as SEO/category capture, not the differentiated product position.** CTA should route to an AI artifact/report demo, not a generic HTML editor claim.

### J10 — Responsive or full-screen viewing

**JTBD.** When an embedded artifact is taller or more complex than a card, I want automatic height, scrolling, or full-screen viewing so users can complete the task without clipping or runaway frames.

- Evidence: five artifacts, three channels, four recent (E036, E050, E094, E095, E101).
- Failures include lost auto-resize, inability to scroll, an endlessly expanding frame, and embeds too small for full-screen inspection (E036, E094, E095, E101).
- Fit: the current inline viewer is fixed at 360 pixels (E121).
- Counterevidence: fixed-height native iframe controls can be adequate for simple content, and automatic resize implementations can loop (E116, E095).
- Recommendation/next test: **Required activation work.** Test auto-height with a hard cap plus an explicit “open large view” control. Pass if all five canonical artifact fixtures remain usable on desktop and mobile without growth loops.

### J11 — Calculator or formula tool

**JTBD.** When a page needs a small bespoke calculation, I want an interactive calculator in Confluence so users get an answer without a spreadsheet or separate application.

- Direct evidence is only two same-channel artifacts and neither is recent enough for the validated threshold (E051, E052).
- Fit is plausible for a self-contained tool, but likely single-file; shared state is unnecessary for the narrow case.
- Counterevidence: Table Filter/Charts and spreadsheet-style macros are good enough for table-based formulas (E052, E012).
- Recommendation: **Unverified; do not lead with calculators.** Revisit only after three independent current Cloud artifacts from two channels.

### J12 — Notion-like live database view

**JTBD.** When records have several dimensions, I want live, filterable database views in Confluence so pages update automatically by topic, person, or project.

- Only two direct artifacts were found, both in Atlassian Community (E004, E026).
- The job requires live data and persistence; current Confluence Databases or specialist table/database apps address it (E004, E026, E012).
- Recommendation: **Reject.** Static bundled data is a different J06 subcase; do not describe Mini Sites as a Notion database alternative.

### J13 — Live external dashboard

**JTBD.** When operational or BI data changes, I want the live dashboard embedded in Confluence so stakeholders see current status without screenshots or manual consolidation.

- Evidence is abundant: 11 artifacts, four channels, four recent (E017, E018, E019, E023, E024, E025, E039, E054, E056, E094, E100).
- Requirements repeatedly include external URLs, authentication, refresh, Jira/BI APIs, and scrolling (E018, E054, E056, E094, E100).
- Hard disqualifier: Mini Sites permits only self-origin network connections; it cannot satisfy live authenticated dashboards (E029).
- Counterevidence: native iframe plus Tableau, Grafana, Dashboard Hub, and Jira/table products already own these jobs (E009–E012, E116).
- Recommendation: **Reject despite a 68 score.** Publish a clear limits page to prevent wrong-fit installs.

### J14 — Page-aware widget

**JTBD.** When the surrounding Confluence page contains tasks or analytics data, I want custom code to read that page context and render an interactive summary.

- Evidence: three artifacts, two channels, all recent (E002, E096, E118).
- Requirements include host-page DOM access, Confluence APIs, organization-wide injection, live reads, and possibly secrets (E002, E096, E118).
- Hard disqualifier: the product is intentionally isolated and does not provide the requested host-DOM/global-extension behavior (E029, E121).
- Recommendation: **Reject.** A purpose-built Forge app is the appropriate path.

### J15 — Live Figma or Blueprint surface

**JTBD.** When the design source changes, I want its live interactive surface embedded in Confluence so reviewers always see the latest version.

- Evidence: four artifacts, two channels, one recent (E021, E033, E058, E101).
- The live job depends on Figma or BlueprintUE services, permissions, and external embeds; Smart Links and dedicated integrations are better aligned (E058, E101).
- Recommendation: **Reject the live-service job.** Keep tool-independent static HTML exports in J04.

### J16 — Already-hosted webpage by URL

**JTBD.** When a useful webpage already exists, I want its URL shown inside Confluence so readers do not leave the page.

- Evidence: seven artifacts, four channels, three recent (E005, E019, E023, E025, E078, E094, E100).
- Native iFrame is sufficient when the target permits framing; failures are usually target headers, authentication, sizing, or refresh (E078, E094, E116).
- Mini Sites would add a redundant upload step and cannot repair an external site's framing policy.
- Recommendation: **Reject as a target wedge.** Mention native iframe as the honest alternative.

### J17 — Authenticated external assets or API data

**JTBD.** When an artifact depends on private dashboards, repositories, scripts, or APIs, I want it to authenticate without exposing sources or credentials.

- Evidence: five artifacts, three channels, two recent (E017, E018, E020, E092, E096).
- The workaround can force public repositories or require tokens and server-side secret handling (E018, E092, E096).
- Hard disqualifier: current CSP and security design prohibit the required outbound connections (E029).
- Recommendation: **Reject under the present trust model.** Do not weaken isolation before a separately approved architecture and demand study.

### J18 — Legacy HTML migration

**JTBD.** When Cloud migration or editor deprecation freezes existing HTML content, I want a maintainable Cloud replacement so important pages keep working and can be edited.

- Evidence: eight artifacts, three channels, only one conservatively recent (E014, E031, E038, E049, E050, E057, E084, E092).
- The segment mixes snippets, single files, XML, multi-file help systems, and authenticated assets; it cannot be treated as one import path.
- Fit is partial: compatible static folders can work, but one-file, XML, and external-auth cases do not (E120, E029).
- Recommendation: **Monitor and publish a migration compatibility matrix.** Pursue only the self-contained static subset after five real export samples.

### J19 — Test-result publishing

**JTBD.** When testing produces results, I want them visible and usable in Confluence so stakeholders can review status without opening the test system or parsing raw output.

- Evidence: seven artifacts, four channels, four recent (E022, E049, E083, E086, E091, E094, E100).
- The artifacts are incompatible: static Allure/HTML, JUnit XML, interactive campaigns, Plotly output, and live TestRail/Testomat dashboards.
- Fit: only a fully generated, self-contained HTML export belongs in Mini Sites; XML parsing, shared campaign state, and live services do not (E029, E120).
- Recommendation: **Split before testing.** Pass the static-export subcase if three current Cloud QA teams provide folders that run with no network; reject XML/live variants.

### J20 — Stable update and review continuity

**JTBD.** When an artifact is revised, I want the same location to show the new version while preserving review context so readers do not chase files or broken links.

- Evidence: seven artifacts, four channels, all recent (E044, E053, E093, E098, E102, E105, E119).
- Current product truth: republishing replaces the per-instance worker last-write-wins, which supports update-in-place; version history, rollback, diff, and inline review were not evidenced in the inspected surface (E122).
- External artifact hosts explicitly compete on versions, stable links, and comments (E106–E110).
- Recommendation: **Own stable republish now; test versions/comments later.** Pass a version-history investment only if three of five recurring-report partners have experienced a wrong-version or review-context failure in the last quarter.

## Per-artifact fit audit

Classification rule used after spot checks:

- **Exact current fit:** recent Cloud need explicitly states a local multi-file bundle with root `index.html` and relative assets, without external network/auth, host DOM, shared persistence, or write-back.
- **Exact shape but historical/deployment-unverified:** the artifact shape matches, but recency or Cloud deployment does not.
- **Adjacent/near-term:** the job is genuine, but input is single-file/snippet/unknown, requires a build step, API, responsive viewer, diagnostics, or another contained product decision.
- **Not current fit/native-good-enough:** the outcome requires live external services, authentication, host DOM, shared persistence, a purpose-built integration, or a sufficient native feature.

Spot checks prevented optimistic promotion: E084 remained historical exact; E088 remained adjacent because it is explicitly one file and E120 rejects it; E043 remained adjacent because “multiple scripts/stylesheets” does not prove a multi-file upload; E096 remained not-fit because it requires an external API; E078 remained not-fit because native iframe already solved the stated job.

- Exact current fit: **none**.
- Exact shape but historical/deployment-unverified (4): E082, E022, E031, E084.
- Adjacent/near-term (39): E003, E014, E015, E016, E035, E036, E037, E038, E041, E042, E043, E044, E045, E047, E048, E050, E051, E053, E057, E075, E080, E081, E083, E085, E086, E087, E088, E089, E091, E093, E097, E098, E099, E101, E102, E103, E104, E105, E119.
- Not current fit/native-good-enough (27): E002, E004, E005, E017, E018, E019, E020, E021, E023, E024, E025, E026, E033, E039, E049, E052, E054, E056, E058, E078, E090, E092, E094, E095, E096, E100, E118.

The four lists cover all 70 qualified IDs exactly once.
