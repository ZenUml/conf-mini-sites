# Positioning recommendation

Research cut: 2026-08-02. Decision: **reposition and test**.

## Recommended category

**Confluence-native interactive work-artifact publisher**

Use “HTML artifact” as the technical bridge and lead with the work outcome: an AI-generated report, prototype, or self-contained tool that teammates can open in the Confluence page where the work is discussed. Do not lead with “mini-site” or “HTML macro”; user language is outcome-first, while generic HTML macro intent is crowded and price-sensitive (E003, E075, E085–E089, E097, E119, E007, E008, E124, E125).

## One-line promise

### Target promise, after the P0 input unlock

> Put an AI-generated report, prototype, or local-only tool directly on a Confluence page—sandboxed, private to the page context, and easy to update—without setting up a repository or separate host.

### Truthful promise for the product today

> Publish a built HTML/CSS/JS folder directly on a Confluence page, preserving its relative files without a separate host.

Do not use the target promise while the validator rejects single-file artifacts (E120). Recent AI workflows are commonly one-file, paste-first, or JSX-before-build rather than verified multi-file folders (E042, E047, E087–E089, E097, E103–E105).

## Primary market

**Creator/champion:** a technical knowledge worker who can obtain or generate browser-native output but does not want to operate a web deployment: QA or data engineer, analyst, product/design practitioner, technical support/training owner, or managed-services report author (E022, E045, E047, E085, E088, E093, E119).

**Viewer:** colleagues, managers, clients, or cross-functional stakeholders already reading the relevant Confluence page (E083, E085, E087, E103, E119).

**Admin/buyer:** Confluence site or app admin who cares about permission inheritance, isolation, support, price, and avoiding a new external publishing system (E014, E032, E089, E093, E126, E127).

The creator is the reachable champion; the admin is the approval gate. Do not assume they are the same person.

## Three wedge candidates

1. **AI-generated interactive artifacts — adjusted score 77.** Current evidence spans Marketplace reviews, a practitioner account, GitHub, and Reddit; the near-term blocker is single-file/paste-first input (J01; E042, E047, E087–E089, E097, E102–E105, E120).
2. **Polished recurring reports — adjusted score 77.** Evidence includes QA, AI, generated reports, and an explicit monthly managed-services workflow; package shape and viewer sizing remain gaps (J05; E083, E089, E097, E119, E121).
3. **Local-only simulators and decision aids — adjusted score 73.** The job is real for training, test planning, and guided decisions, but shared persistence must be excluded (J03; E047, E051, E085, E086, E088).

The current exact multi-file folder job is an important falsification test, not a validated wedge: its raw fit is high, but the evidence-adjusted score is 63.75 because explicit matches are historical or deployment-unverified (J02; E082, E022, E031, E084).

## Proof pillars

### 1. Work stays in the team's documentation context

The proposed advantage over static and AI artifact hosts is the existing Confluence audience and page location, not hosting technology by itself. Users explicitly dislike public-repository concerns, separate hosts, raw-file sharing, and direct-link discovery (E075, E089, E093, E102, E104). Validate permission expectations rather than claiming universal privacy behavior.

### 2. Self-contained and deliberately isolated

The product permits local scripts and assets while blocking external network access, host-page DOM access, and server-side secrets (E013, E029). Turn this boundary into a compatibility promise, not a hidden limitation. It is valuable for self-contained work artifacts and disqualifying for live dashboards, authenticated APIs, and page-aware widgets (E002, E018, E096, E118).

### 3. Publish an artifact, not an application deployment

Users want a report, mockup, explainer, or simulator link without creating a repository, CI project, or separate hosting account (E089, E097, E103, E104). External artifact hosts use the same distinction, so Confluence placement must remain explicit (E106–E110).

### 4. Update the same place

The provider already replaces a per-instance worker last-write-wins (E122). Position this as stable republishing only. Do not claim version history, rollback, diff, or inline review until implemented and verified; those are explicit adjacent needs and competitor strengths (E044, E053, E098, E105–E110).

### 5. Compatibility is understandable before install

The strongest negative current review describes an opaque failure for a complex single-file app (E088). Publish exact limits, no-network rules, supported input shapes, and actionable errors. The fixed 360-pixel viewer also needs an explicit large-view or safe-sizing story (E036, E094, E095, E101, E121).

## Anti-positioning

Mini Sites should explicitly say what it is not:

- **Not a live BI or operational-dashboard connector.** Use Tableau, Grafana, Jira/report apps, or an authenticated iframe when data must refresh (E009–E012, E017–E019, E054, E056, E094, E100).
- **Not a host-page customization or analytics injector.** Isolated content cannot read the surrounding Confluence DOM (E002, E118).
- **Not a server-side app platform.** No secrets, authenticated outbound API calls, shared database, or write-back are promised (E029, E096).
- **Not the best answer for an already-hosted, frameable URL.** The native iFrame macro is simpler and free (E078, E116).
- **Not a live Figma/Blueprint integration.** Smart Links and dedicated products preserve the source of truth better (E058, E101).
- **Not yet the best one-file HTML macro.** OST, Narva, Appfire, or Yamuno have simpler input today (E007, E008, E124, E125, E120).

Honest routing should reduce wrong-fit installs and make the narrow promise more credible.

## Message hierarchy

1. **Hero:** “Put an interactive work artifact on the Confluence page.”
2. **Subhead:** “Publish an AI-generated report, prototype, or local-only tool without a repo or separate host.”
3. **Primary CTA after P0:** “Try a sample HTML artifact.” Before P0, use “Try a sample folder.”
4. **Three proof blocks:** existing team context; sandboxed/self-contained; update the same place.
5. **Outcome gallery:** recurring report, clickable mockup, training simulator. Each demo must state whether it is one file or a folder and whether state is local.
6. **Compatibility chooser:** already hosted URL → native iframe; snippet/one file → supported only after P0; local folder → Mini Sites; live/authenticated data → specialist app or Forge.
7. **Trust and limits:** no outbound network, no host DOM, no secrets, fixed limits, page/admin considerations (E013, E029, E120, E121).
8. **Marketplace CTA:** only after the visitor has selected a compatible artifact path.

## Marketplace-title direction

Do not change the live listing before capability and proof exist. After single-file support and artifact tests pass, test:

> **Interactive HTML Artifacts for Confluence — AI Reports, Prototypes & Mini Tools**

Keep “Mini Sites” as the brand or secondary phrase. The title must not say “live dashboard” without a qualifier such as “self-contained snapshot.”

## Required evidence before scaling

Proceed with the repositioned wedge only when all are true:

- Five current Confluence Cloud creators provide real artifacts; at least four publish without manual source surgery.
- At least three have a named recurring workflow monthly or more often.
- At least three prefer the Confluence result to their current host/file/macro path for a stated reason.
- Two admins review the isolation, hosting, and permission story without a disqualifying objection.
- Two price conversations establish a credible comparison or willingness threshold; Marketplace prices alone are not willingness evidence (E126, E127).

No candidate has been contacted. `04_design_partner_candidates.csv` is an approval-ready discovery queue only.

## Measurement plan

Keep signals separate from outcomes:

| Stage | Signal metric | Required user outcome |
|---|---|---|
| Search | Qualified organic visit to an artifact/report page | Visitor selects a compatible artifact path |
| Proof | Demo/sample opened | Visitor interacts with the report/prototype/simulator and understands limits |
| Marketplace | Marketplace click or install | Creator publishes their own artifact successfully |
| Activation | Validation started / publish succeeded | Named viewers use the artifact in a real page workflow |
| Retention | Republish event | Artifact owner updates it for a second real cycle |
| Validation | Design-partner call completed | Trigger, workaround, approval path, value, and fit are evidenced |

The current production analytics gap means absence of observed client events cannot be interpreted as zero use. Instrumentation must distinguish environment and successful user outcomes before acquisition experiments are evaluated.
