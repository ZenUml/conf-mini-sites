# Competitive landscape — inventory, review themes, teardowns, maps

Capture date 2026-08-02. **Metric caveat (applies to every number here):** Marketplace pages are
fetch-blocked in this environment; every install/rating figure came from a search-engine summary
attributed to the listing, each a single observation on the capture date, several non-reproducible
across queries. Treat all metrics as indicative, dated, and *not* active-paid-user counts (brief §10).
Evidence IDs resolve in `01_evidence_log.csv`; seed-source rows (S1–S12) in `07_source_bibliography.md`.

## 1. Inventory — 24 products/alternatives across four classes

### Class 1 — Direct capability apps (HTML/JS/iframe embedding)

| # | Product | Vendor | Content model | Metrics (as of 2026-08-02, search-summary grade) | Notable |
|---|---------|--------|--------------|--------------------------------------------------|---------|
| 1 | HTML Macro for Confluence Cloud (1212279) | Appfire | Paste snippet (single body) | ~1.9k installs · **2.9/4, 36 reviews** · $0 ≤10 users, $220@25 … tiers to $64,895@100k (pricing page dated 2025-07-01) | Owns the "HTML macro" search term; weak rating; markets "paste ChatGPT-generated code"; Cloud Fortified; double-iframe sandbox |
| 2 | HTML Macro for Confluence (1221472) | Narva (ex-Bitwelt) | **Three modes: paste / iframe embed / render from page attachment (JS+CSS files)** | unknown installs/rating now (brief's earlier capture: ~2,352); vendor claims "#1 top-rated HTML app", SOC 2, 10k+ customers | **Closest head-to-head.** Admin trusted-domain allowlist; attachment mode is the nearest thing to multi-file — but documented as unreliable and admin-fragile (E-104) |
| 3 | HTML Macro Pro (1235901) | OST Labs | Paste + iframe | unknown; free and paid variants observed | Most security-forward messaging: sandbox, CSP, admin governance — **already occupies "the secure one" positioning** |
| 4 | Mosaic HTML macro (suite) | Kolekti (Adaptavist) | Paste, JS gated to Advanced edition | suite pricing, unknown | Distribution threat via suite bundling; deliberately restricts full iframes (E-014, E-060) |
| 5 | Aura HTML (iframe) macro (suite) | Seibert/appanvil | URL or code; ships disabled, admin opt-in | unknown | Admin-gate model; suite bundling |
| 6 | Just Add+ HTML Macro | Atlas Authority | Direct entry / **page attachment** / remote URL | unknown | Positions on native-looking fidelity ("as if you had written it"); iframe-borders limitation documented |
| 7 | HTML Macro (Forge-native, free) | Yamuno | Inline editor w/ live preview | free | **Pricing-floor risk**; Forge-native trust story same as ours |
| 8 | Iframes for Confluence (1215813) | unknown | external URL (low evidence) | unknown | The free "just iframe it" substitute |
| 9 | HTML Macro (1231085) | unknown | unknown (low evidence) | unknown | Name-collision commoditization: multiple listings share the generic name |
| 10 | HTML for Confluence (252) | Appfire | Server/DC ancestor (host-page access) | unknown | Defines migration-cohort expectations no Cloud app can meet (E-092) |

**Class read:** crowded, commoditized on "paste a snippet", with free entrants — but review mining
(§2) shows systematic quality failures, and **no observed product serves a multi-file folder with
relative paths as a first-class live unit**. Attachment modes (Narva, Just Add+) are the closest
substitutes and are documented-fragile. The "secure sandbox" message alone is already taken (OST);
differentiation must be *real files, whole folders, live and permissioned*.

### Class 2 — Outcome-specific apps

| # | Product | Metrics (dated, search-summary grade) | Job owned | Relevance |
|---|---------|----------------------------------------|-----------|-----------|
| 11 | Table Filter, Charts & Spreadsheets (27447, Stiltsoft) | ~15,055 installs (single obs., LOW confidence); vendor claims 3M+ users | tables/formulas/charts over Confluence data | Owns "calculator-as-table-formulas" and data-in-Confluence; do not fight |
| 12 | Dashboard Hub for Confluence (1224619, Appfire) | ~371 installs, no reviews | Jira/external-source dashboards | JTBD-08 route; small install base |
| 13 | Tableau for Confluence (1217497, Modus Create attr.) | ~240 installs, no reviews | Tableau embeds | JTBD-08 route; much smaller than brand suggests |
| 14 | GrafanaSight (Flowdence) | unknown (app id 2643908494 unverified in search) | Grafana panels/alerts snapshots | JTBD-08 route; snapshot-based (cache-first) approach sidesteps live-embed pain |
| 15 | Power BI for Confluence | unknown | Power BI embeds | JTBD-08 route (E-087) |
| 16 | Guided Pathways (Kolekti) | unknown | decision-tree/guided navigation | **Direct JTBD-05 competitor — validates the job; W set to 3 accordingly** (E-045) |
| 17 | Elements Spreadsheet | unknown | spreadsheets in pages | JTBD-06 adjacent (E-036) |
| 18 | Markdown Macro / content-render apps (e.g. the Just Add+ suite) | unknown | dev-format rendering | adjacent content-rendering demand (E-080) |
| 19 | Figma for Confluence (first-party) | unknown | design-prototype embeds | serves JTBD-10's tool-hosted slice natively (E-088) |
| 20 | Capable OpenAPI/Swagger Macro | unknown | interactive API docs | JTBD-11 exists as a category (E-086) |

### Class 3 — Native and adjacent Confluence

| # | Capability | Good enough when | Fails when (evidence) |
|---|-----------|------------------|------------------------|
| 21 | iframe macro (native) | content is at a public embeddable URL | X-Frame-Options refusals, sizing, auth walls (E-011, E-096, E-023) |
| 22 | Smart Links embed | source is a supported SaaS (Figma, Jira, Analytics) | breaks on edit/revert (E-025); interactivity limits vary (E-054); permission mapping confusion |
| 23 | Confluence Databases + charts | structured/typed team data | no formulas/timeline/chart-of-database yet (E-018–020, CONFCLOUD-78459/79584) — closing over time |
| 24 | Native HTML zip importer | one-time content migration to wiki pages | **converts; kills liveness, scripts, layout** (E-074, D-02) |
| — | Whiteboards / Expand nesting | shallow visual flows / simple branching | no real logic; deep nesting unusable (E-043, E-034) |
| — | Atlassian Analytics | Atlassian-source dashboards | not custom HTML (E-029) |

### Class 4 — Build or host alternatives

| # | Route | Cost/limit (evidence) |
|---|-------|------------------------|
| — | Forge Custom UI DIY | real dev effort; CSP `form-action` pain (E-063), 403 asset issues (E-071), ~50 MB/resource (E-072), rate limits (SERP `Forge app too much work`) — the buy-vs-build seam H8 |
| — | External static hosting (GH Pages/Netlify/S3) + link or iframe | permissions not inherited; public-by-default exposure (E-005, E-050, E-112); orgs build bespoke internal hosts to fix this (E-107) |
| — | Server filesystem hosting (historical) | Server-era only (D-10) |
| — | Screenshot/PDF/manual | stale, non-interactive (E-012, E-024) |
| — | 2026 AI-HTML publishers (Handoff, Pagedrop, Vibeshare) | public-URL-centric; no org permissions (E-115, E-116) |
| — | Box native HTML rendering; Claude artifact org-sharing | platform-native absorption of JTBD-15 outside Atlassian (E-117, E-120) |

## 2. Review-mining themes (user-authored vs vendor-authored separated)

**Negative themes — user-authored:** macro body uneditable in new editor, remedy "delete and
recreate" (E-091 vendor KB documenting user pain); valid HTML must be hand-mangled before it runs
(E-094); iframe height/double-scrollbar breakage, height silently overridden (E-096, E-097);
attachment rendering unreliable + silently broken by an admin setting (E-104); embeds refuse to
connect / X-Frame-Options (E-098, E-011); DC-parity disappointment — "all the HTML macros provided
by vendors cannot offer the same functionality as an HTML macro on DC" (E-092); sandbox surprises
developers (E-099); price increases (E-106 context).
**Positive themes — user-attributed (thin; review volume is sparse per brief's caution):** "does
what it says" for simple snippets; Solved threads indicate the app route resolves the immediate ask
(D-01, E-094).
**Vendor-authored claims (labeled, not outcomes):** "#1 top rated", SOC 2, sandbox/CSP hardening,
trusted-domain allowlists, admin opt-in gates (E-105, OST/Narva/Aura positioning).

## 3. Message teardown — top five competitors

| | Appfire HTML Macro Cloud | Narva HTML Macro | OST HTML Macro Pro | Mosaic/Aura (suites) | Table Filter (Stiltsoft) |
|---|---|---|---|---|---|
| Title/category | "HTML Macro" — the category name | "HTML Macro" + files/embeds/security | "HTML Macro Pro … FREE — Embed HTML and iframes" | HTML macro inside a formatting suite | Table Filter, Charts & Spreadsheets |
| First promise | add HTML/JS "directly and safely" | render "complex files with JavaScript and CSS" | secure sandboxed embedding + admin governance | "secure way to use HTML and CSS", fills Atlassian's gap | data views/formulas/charts over page data |
| Proof | Cloud Fortified, install base | SOC 2, "#1 top rated", 10k+ customers (self-claims) | sandbox/CSP/Cloud-Fortified language | suite adoption | huge install base, vendor case numbers |
| Use cases | snippets, AI-pasted code | snippets, attachments, embeds | snippets + iframes | formatting-adjacent HTML | reporting/calculations |
| Trust story | double-iframe sandbox | domain allowlist, security page | strongest governance framing | admin opt-in, no full iframes | data stays in Confluence |
| CTA | trial via Marketplace | trial via Marketplace | free tier | suite trial | trial |
| Search language owned | "html macro confluence (cloud)" | same + "html file attachment" | "secure html macro" | suite brand terms | "table filter", "confluence formulas", "calculator" rewrites |
| Exploitable gap | 2.9/4 rating; editor-compat pain; snippet-only | attachment mode fragile (E-104); no folder/multi-file unit | snippet-only; no files at all | JS gated/absent; no files | not an app-hosting product at all |

## 4. Positioning maps

### Map A — generality × liveness

```
                        live interactive application
                                   ▲
        Forge DIY ●                │            ● Mini Site (multi-file bundle, live)
   (per-app build)                 │        ● Narva (attachment mode, fragile)
                                   │   ● HTML macros (snippet, iframe-boxed)
                                   │   ● Dashboard/BI apps (narrow, live data)
 generic platform ◄────────────────┼────────────────► specialized solution
                                   │   ● Guided Pathways (flows only)
        zip importer ●             │   ● Table Filter (tables/charts only)
   (converts to pages)             │   ● Figma embed (design tool only)
                                   │
                        static / linked content
```

### Map B — creator skill × hosting locus

```
                     external hosting / vendor-controlled
                                   ▲
     GH Pages/Netlify + iframe ●   │   ● AI-HTML publishers (public URL)
                                   │   ● Mini Site bytes on Cloudflare, access
                                   │     governed via Forge grant  ← the contested cell
 developer-built ◄─────────────────┼────────────────► end-user configured
                                   │
          Forge DIY ●              │   ● HTML macros (paste in editor)
                                   │   ● Native iframe/Smart Links/Databases
                                   ▼
                     Atlassian-hosted / Atlassian-governed
```

**Map B is the strategic tension:** competitors marketing "Runs on Atlassian / no egress" (E-130,
E-131) attack the lower-right as the safe cell. Mini Site's bytes live on Cloudflare — permission
*enforcement* inherits from Confluence, but *residency* does not. This is simultaneously the
product's scaling architecture and its most attackable trust surface (echoes the repo's own G1 gate).

### Map C — buyer tradeoff matrix

| Option | Flexibility | Activation effort | External data | Trust/admin control | Repeatability | Price |
|---|---|---|---|---|---|---|
| Mini Site | high (any static bundle) | medium (prepare folder) | **none (CSP)** | inherit page perms; bytes off-Atlassian; secret-scan | high (re-upload) | paid |
| HTML-macro apps | medium (snippet) | low (paste) — but editor/sizing breakage | some via iframe | sandbox varies; admin allowlists | medium | free–paid |
| Native iframe/Smart Links | low (URL only) | lowest | n/a (external page) | Atlassian-native | high | included |
| Outcome apps (BI/flows) | low (one job) | low–medium | yes (their point) | vendor-specific | high | paid per source |
| Forge DIY | highest | highest | configurable | org-owned | low | eng time |
| External host + link | high | medium | yes | **permissions lost** | medium | infra + risk |

## 5. Platform risk (Atlassian absorbing the category)

- **RFC-136 "Forge staticView Macro"** (thread title confirmed; content unreadable in this
  environment — assessment is inference and flagged as such): by title and adjacent evidence
  (E-073, E-003) it targets Connect `staticContentMacro` migration — i.e., macro-body rendering
  fidelity, **not** hosting arbitrary user-uploaded multi-file bundles. Risk to Mini Site: low-medium
  short-term; watch for scope creep toward user-supplied HTML.
- **Track record of absorption:** whiteboards (E-132), Databases (JTBD-09), richer Smart-Link embeds
  (E-134), Rovo "turn a page into an app" marketing (E-118). The durable moat is the *workflow*
  (validate → secret-scan → provision → permission-inherit → serve at scale), not "HTML renders on a
  page."
- **Adjacent-platform absorption of JTBD-15:** Box native HTML render (E-117), Claude artifacts
  org-sharing (E-120) — the wedge window is real but not indefinite.

## 6. Threat ranking (per brief §11 overlay: job overlap · installs/review evidence · trust · activation · distribution · switching cost)

1. **Narva HTML Macro** — job overlap on files/attachments; credible trust story; must win the
   "real folder vs fragile attachment" comparison.
2. **Appfire HTML Macro Cloud** — owns the search term + AI-paste message; weak rating is the
   opening; highest distribution (Appfire portfolio).
3. **Native features** (iframe/Smart Links/Databases/importer) — free, improving, default; they cap
   the price and define "good enough" for small jobs.
4. **Free/cheap entrants** (Yamuno, OST free tier) — pricing floor pressure on the snippet job.
5. **Atlassian platform moves** (staticView, Rovo) — low probability of full overlap near-term,
   existential if it lands.
