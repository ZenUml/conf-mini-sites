# Top 20 Jobs-to-be-Done — opportunity map

Capture date 2026-08-02. Scoring per brief §11: raw (0–100) = 20 × [0.20F + 0.15U + 0.15V + 0.15P +
0.10D + 0.10R + 0.10W + 0.05X]; adjusted = raw × confidence multiplier (validated 1.0 / strong
hypothesis 0.7 / unverified 0.4 / rejected 0.0). Evidence IDs resolve in `01_evidence_log.csv`;
duplicate groups (D-xx) count as ONE independent artifact. Product-fit (P) scores were verified against
the product's own code (CSP `connect-src 'self'`, `form-action 'none'`, no storage/write-back, bundle
limits 2000 files / 25 MiB file / 50 MiB total — `src/dispatch/gateway.ts:146`,
`src/pipeline/bundleValidation.ts:26-28`), per the brief's gate "no product-fit above 3 until
capability requirements are checked."

**Ranking summary (evidence-adjusted):**

| # | ID | Job (short name) | F/U/V/P/D/R/W/X | Raw | Conf. | Adjusted | Verdict |
|---|----|------------------|-----------------|-----|-------|----------|---------|
| 1 | JTBD-01 | Publish a multi-file static bundle live on a page | 3/3/4/5/4/4/3/4 | 74 | 1.0 | **74** | **Own now** |
| 2 | JTBD-02 | Put custom HTML/JS on a Cloud page (snippet-level) | 5/3/3/3/3/5/1/3 | 68 | 1.0 | **68** | **Own as category doorway** |
| 3 | JTBD-15 | Share an AI-generated tool with the team, permission-controlled | 3/3/4/4/3/3/3/5 | 68 | 0.7 | **47.6** | **Own now (early wedge)** |
| 4 | JTBD-05 | Interactive decision trees / troubleshooting flows | 2/3/4/5/3/4/3/4 | 68 | 0.7 | 47.6 | Test next (gate: 1 source type) |
| 5 | JTBD-03 | Survive DC/Server→Cloud migration of HTML-macro content | 3/4/4/2/4/4/2/3 | 65 | 0.7 | 45.5 | Test next (gate: 1 source type) |
| 6 | JTBD-04 | Auto-publish machine-generated report/app output | 2/3/5/3/3/3/4/5 | 66 | 0.4 | 26.4 | Test next |
| 7 | JTBD-20 | Publish docs-site/build output beside project docs | 2/2/4/4/3/3/3/4 | 60 | 0.4 | 24.0 | Test next |
| 8 | JTBD-17 | Render HTML file attachments reliably | 2/3/3/4/4/3/2/3 | 59 | 0.4 | 23.6 | Monitor (subsumes into #1) |
| 9 | JTBD-10 | Embed coded/HTML design prototypes next to specs | 2/2/3/5/2/3/3/3 | 57 | 0.4 | 22.8 | Monitor |
| 10 | JTBD-06 | Self-contained calculators / computed inputs | 2/2/3/5/2/3/2/4 | 56 | 0.4 | 22.4 | Monitor |
| 11 | JTBD-18 | SaaS vendor embeds its output in customers' Confluence | 1/3/4/2/3/2/4/5 | 54 | 0.4 | 21.6 | Monitor |
| 12 | JTBD-11 | Interactive API docs (Swagger/OpenAPI bundle) | 1/2/3/5/2/2/3/4 | 52 | 0.4 | 20.8 | Monitor |
| 13 | JTBD-07 | Code-authored interactive charts (bundled data) | 2/2/3/4/2/2/2/3 | 50 | 0.4 | 20.0 | Monitor |
| 14 | JTBD-13 | Conditional/adaptive page content | 1/2/2/4/2/2/2/3 | 43 | 0.4 | 17.2 | Monitor |
| 15 | JTBD-12 | Reusable custom widgets (user-macro replacement) | 1/2/2/3/2/2/2/4 | 41 | 0.4 | 16.4 | Monitor |
| 16 | JTBD-08 | Live external BI dashboards (Grafana/Tableau/Power BI) | 4/3/4/0/3/4/1/3 | 56 | 0.0 | **0** | **Reject now (disqualified)** |
| 17 | JTBD-09 | Auto-updating database-like views (Notion-style) | 3/2/3/1/2/3/1/3 | 45 | 0.0 | **0** | **Reject now (native owns)** |
| 18 | JTBD-14 | Collect input via forms on a page | 2/2/3/0/2/2/2/3 | — | 0.0 | **0** | **Reject now (disqualified)** |
| 19 | JTBD-19 | Scripts that style/manipulate the host page | 2/3/3/0/3/2/1/2 | — | 0.0 | **0** | **Reject permanently** |
| 20 | JTBD-16 | Frame an externally-hosted page (iframe suffices) | 3/2/2/2/1/3/0/2 | — | 0.0 | **0** | **Reject (native owns)** |

Priority-gate notes: JTBD-05 and JTBD-03 outscore JTBD-15 on raw but **fail the top-three gate**
("no job enters the top-three without evidence from at least two source types") — their qualified
evidence is Atlassian-Community-only this session (Reddit/Stack Overflow were crawler-blocked; see
`09_research_journal.md`). They are the designated next-test candidates, not launch wedges.

---

## JTBD-01 — Publish a multi-file static bundle (site / project folder / tool) live on a page — OWN NOW

- **When** I have a working multi-file HTML/CSS/JS artifact (exported site, project folder with
  sub-pages and images, generated docs, coded prototype), **I want to** upload the whole folder to a
  Confluence page and have it run live with internal links and relative assets intact, **so I can**
  share the real thing where my team already works instead of standing up external hosting.
- Creator: developer / technical writer / analyst. Viewer: their team. Admin: Confluence site admin.
  Buyer: team/space owner (app request → admin approval).
- Artifact being shared: multi-file static bundle (the product's exact input model).
- Current workflow and workarounds: Confluence zip **import converts files into wiki pages and
  destroys the live site** (E-004/D-02, E-074, SERP `upload html folder to confluence`); external
  hosting + iframe/link breaks permission inheritance (E-005/D-03); attachment-rendering modes in
  HTML-macro apps are unreliable and admin-fragile (E-104, E-095); hand-mangling markup to fit
  snippet macros (E-094).
- Critical interaction/data requirements: client-side interactivity only; relative-path resolution;
  no external APIs needed. **Fits the shipped CSP cleanly.** P=5.
- Why current options fail: every observed workaround either kills liveness (import), breaks
  permissions (external host), or degrades the artifact (snippet mangling, attachment fragility).
- Independent demand artifacts: **6** — D-02 (E-004), D-12 (E-057 hist), D-10 (E-041 hist,
  Server-era), E-050*, E-095, E-109 (HN, general web-deploy frustration) — channels: Atlassian
  Community, developer community, Hacker News. (*E-050 is primary-assigned to JTBD-04; counted here
  only as corroboration.) Counterevidence checked: E-089 (native import is fine when wiki-pages
  conversion is acceptable), E-074.
- Willingness/urgency signals: users repeatedly try multiple failed routes in sequence (D-02 thread
  lists three workarounds); Server-era users hacked the filesystem to get this (D-10).
- Mini Site fit and gaps: exact input model; gaps = no bulk/API publish (UI only) and 50 MiB cap
  (adequate for observed cases).
- Counterevidence / reasons not to pursue: none structural; the job's language ("upload html folder")
  is low-volume-looking in SERP but has zero incumbent serving liveness.
- Scores: F3 U3 V4 P5 D4 R4 W3 X4 · raw 74 · confidence 1.0 (validated: ≥5 independent, ≥2 channels,
  counterevidence checked) · **adjusted 74**.
- Recommendation: **Own now — primary wedge.**
- Next test and threshold: ship a pillar page + demo targeting `upload html folder to confluence` and
  `publish generated HTML to Confluence`; threshold = ≥5 organic installs or 10 demo-page
  sample-bundle downloads in 30 days.

## JTBD-02 — Put custom HTML/JS on a Confluence Cloud page (snippet-level) — OWN AS CATEGORY DOORWAY

- **When** the Cloud editor can't express the layout/content I need (and the native HTML macro no
  longer exists), **I want to** add custom HTML/CSS/JS to the page, **so I can** show working custom
  content inline.
- Creator: page author (mixed technical level). Viewer: page readers. Buyer: space/team owner.
- Independent demand artifacts: **9+** — D-01 (E-001, recent), D-03, D-05, D-06, E-008, E-067,
  E-012 (hist), E-076, E-077 (YouTube tutorials of 2025-2026 = ongoing demand), plus wave-2 review
  cluster (E-100, E-101, E-103). Channels: community, YouTube. Confidence 1.0.
- Why current options fail (from review mining — this is the incumbent-quality gap): macro body
  becomes uneditable in the new editor, vendor remedy is "delete and recreate" (E-091); valid HTML
  must be hand-mangled — strip `<body>`/`<head>` — before it renders (E-094); iframe height breaks /
  double scrollbars / height silently overridden (E-096, E-097); X-Frame-Options failures the vendor
  disclaims (E-098); sandbox surprises developers (E-099); price increases on a utility app (E-106).
- Mini Site fit: P=3 — works, but our folder-first flow is heavier than paste-a-snippet for tiny
  fragments; incumbents (8+ apps, some free — E-044, Yamuno) own the term. W=1.
- Counterevidence: admins want HTML/JS embedding off or restricted (E-121–E-125); Atlassian removed
  the native macro deliberately for XSS risk (E-001, E-126).
- Scores: F5 U3 V3 P3 D3 R5 W1 X3 · raw 68 · confidence 1.0 · **adjusted 68**.
- Recommendation: **Own as doorway, not as identity** — the search language ("html macro",
  "embed html confluence") is where buyers already are; capture it with a capability page +
  comparison content that routes to the multi-file/real-files difference. Do not lead the product's
  identity with "another HTML macro."
- Next test: comparison page "(HTML macro apps) vs publishing real files"; threshold = ranking on one
  incumbent-comparison query in 60 days + assisted installs.

## JTBD-15 — Share an AI-generated tool with the team, permission-controlled — OWN NOW (EARLY WEDGE)

- **When** an AI assistant generates a working HTML artifact (dashboard, mockup, utility, report),
  **I want to** hand my team a link/page where it runs — visible to the right people only, **so I
  can** get value from the artifact without begging for hosting or leaking it on a public URL.
- Creator: any AI-assisted knowledge worker (broader than developers). Viewer: their team. Buyer:
  team lead; Admin gate applies.
- Independent demand artifacts: **5** user-authored — E-107 (consultancy built a bespoke internal
  host for AI-generated HTML, 2026-06), E-110 (HN: "really annoying" can't hand a colleague a link),
  E-111 (HN: agent output → shareable link tooling), E-112 (X: team-only visibility need after a
  public-link exposure), E-109 (HN: plain-HTML deploy friction). Channels: blogs, HN, X. **Zero of
  them mention Confluence** — that is the material gap in this evidence.
- Ecosystem corroboration (not demand): a 2026 cottage industry of "publish your AI HTML file"
  services exists (E-115, E-116 — all public-URL-centric); Box shipped native HTML rendering
  (E-117); Claude artifacts support org-internal sharing (E-120); **Appfire already markets its HTML
  Macro for pasting ChatGPT-generated code** (SERP `ChatGPT HTML app Confluence`) — competitor
  validation of the wedge.
- Why current options fail: public-URL publishers can't do org permissions (E-112 is the failure
  mode); generic hosting requires setup/auth work (E-107 built an app to solve exactly this).
- Mini Site fit: P=4 — permission inheritance + sandbox + secret-scan is precisely the un-served
  enterprise slice; gap: multi-step upload vs "paste one file" (single-file quick path would lower
  friction); CSP blocks artifacts that call external APIs.
- Counterevidence: platform absorption risk — Claude/Box/Atlassian Rovo (E-118, E-120, E-117) are
  all moving toward native artifact sharing.
- Scores: F3 U3 V4 P4 D3 R3 W3 X5 · raw 68 · confidence 0.7 (strong hypothesis: ≥4 independent
  across ≥2 channels; missing link = Confluence-specific demand) · **adjusted 47.6**.
- Recommendation: **Own now as the forward wedge** (fresh, growing, weak incumbent claim, matches
  the permission story). Messaging must be honest about CSP limits (self-contained artifacts only).
- Next test: demo + landing page "publish what your AI built — inside Confluence"; threshold = CTR
  and ≥3 design-partner conversations referencing AI-generated artifacts in 30 days.

## JTBD-05 — Interactive decision trees / troubleshooting flows — TEST NEXT

- **When** a reader must navigate a branching procedure (support call, triage, SOP), **I want** the
  page to ask questions and reveal only the relevant branch, **so** the reader reaches the right
  answer without reading everything.
- Independent artifacts: E-033 (hist), E-034 (hist), E-035 (recent native-feature ask) — all
  Atlassian Community → **fails the two-source-type gate**. SERP (`"troubleshooting flow" OR
  "decision tree" Confluence`) shows an acknowledged native gap with recurring questions — the
  strongest SERP signal outside JTBD-01.
- Workarounds: nested Expand macros (E-043 — also counterevidence: good enough for shallow trees),
  hand-linked page chains (described in-thread as painful), Guided Pathways app (E-045 — a
  purpose-built competitor validating the demand).
- Fit: P=5 (pure client-side logic). Persona: support/KB manager — a *non-developer*; needs a
  template/sample to create bundles → activation gap.
- Scores: F2 U3 V4 P5 D3 R4 W3 X4 · raw 68 · conf 0.7 · adjusted 47.6.
- Recommendation: **Test next.** Cheapest test: publish a decision-tree sample bundle + tutorial;
  threshold = 2nd independent source type (YouTube comments, blog, review) within 60 days, then
  promote to wedge.

## JTBD-03 — Survive DC/Server→Cloud migration of HTML-macro content — TEST NEXT

- **When** my org migrates to Cloud and pages render "unknown macro: html", **I want** a Cloud-side
  way to keep that content working, **so** the migration doesn't ship broken pages.
- Independent artifacts: E-002 (+E-102 dup), D-04 (E-006/E-069), E-007, E-092/E-093 (thread
  2245372), E-022, E-055 — ~5 independent but **all Atlassian Community** → gate failure.
- Urgency: highest of any cluster (deadline + budget attached to migration projects); buyers arrive
  with DC-parity expectations that **no sandboxed Cloud app can meet** (E-092: "all the HTML macros
  provided by vendors cannot offer the same functionality") — expectation management is part of the
  product story.
- Fit: P=2 — no bulk conversion/migration tooling; self-contained macro bodies only; page-DOM uses
  (E-093) are unservable. Scores: F3 U4 V4 P2 D4 R4 W2 X3 · raw 65 · conf 0.7 · adjusted 45.5.
- Recommendation: **Test next.** Cheapest test: "HTML macro after migration" content page mapping
  which macro uses survive (self-contained) vs not (page-DOM), measuring migration-cohort traffic.
  Building bulk-migration tooling is not justified by current evidence.

## JTBD-04 — Auto-publish machine-generated report/app output — TEST NEXT

- **When** my pipeline/product regenerates an HTML report, **I want** the Confluence page to show
  the new version automatically, **so** readers always see current output without manual re-publish.
- Independent: D-08 (SaaS wants to push React-rendered reports into customers' Confluence), E-050
  (docs generated to S3, wants auto-render in Confluence) → **2** independent → unverified (0.4)
  despite high V. SERP `publish generated HTML to Confluence` confirms the language exists and
  native tooling only does static conversion.
- Fit: P=3 — a shared-secret publish endpoint already exists for CI internally; productizing an API
  publish path is a small, evidenced roadmap item. Scores: F2 U3 V5 P3 D3 R3 W4 X5 · raw 66 ·
  conf 0.4 · adjusted 26.4.
- Next test: expose the existing CI publish path to 1–2 design partners; threshold = weekly
  automated publishes sustained for a month.

## JTBD-20 — Publish docs-site/build output beside project docs — TEST NEXT

Subcase of 01/04 worth tracking separately (Storybook/Docusaurus/coverage/API reports). Independent:
E-050, D-02-adjacent → 2. F2 U2 V4 P4 D3 R3 W3 X4 · raw 60 · conf 0.4 · adjusted 24. Cheapest test:
sample bundle + tutorial "publish your Storybook build to Confluence".

## JTBD-17 — Render HTML file attachments reliably — MONITOR

The attachment-mode failure cluster in incumbents (E-104 vendor-documented unreliability; E-095
multi-file asset ask; E-050 attachment rendering route). 2 independent user artifacts. F2 U3 V3 P4
D4 R3 W2 X3 · raw 59 · conf 0.4 · adjusted 23.6. Not a standalone wedge — it is the *failure mode*
that JTBD-01's folder model replaces; use in comparison content.

## JTBD-10 — Embed coded/HTML design prototypes — MONITOR

E-075 (XD), E-088 (Figma), E-054 (counter: Smart Links serve tool-hosted prototypes). Design-tool
incumbents own SERP (`prototype Confluence embed`). The *coded/HTML-export* slice folds into
JTBD-01's page story. F2 U2 V3 P5 D2 R3 W3 X3 · raw 57 · conf 0.4 · adjusted 22.8. Do not build a
"prototype" pillar until an HTML-export-specific artifact cluster appears.

## JTBD-06 — Self-contained calculators — MONITOR

E-036, E-037, E-038, E-081 — **all historical (2020–2022 era)**; SERP rewrites "calculator" to
table-formulas (Stiltsoft territory). The brief explicitly warns this was an illustrative example;
evidence agrees: keep as a supporting example only. F2 U2 V3 P5 D2 R3 W2 X4 · raw 56 · conf 0.4 ·
adjusted 22.4.

## JTBD-18 — SaaS vendor embeds output in customers' Confluence — MONITOR

D-08's B2B variant: distinct buyer (the SaaS vendor), needs cross-tenant/API publishing and likely
authenticated data (disqualifier risk). F1 U3 V4 P2 D3 R2 W4 X5 · raw 54 · conf 0.4 · adjusted 21.6.

## JTBD-11 — Interactive API docs bundle — MONITOR

E-086 (vendor-authored only). Technically ideal (static swagger-ui bundle) but zero user-authored
demand observed. F1 U2 V3 P5 D2 R2 W3 X4 · raw 52 · conf 0.4 · adjusted 20.8. Cheapest test: sample
bundle page; promote only on organic pull.

## JTBD-07 — Code-authored interactive charts — MONITOR

E-012, E-013, E-022 (mostly historical). Native chart macro + Table Filter own the easy cases;
self-authored Chart.js pages fold into JTBD-01/02. Raw 50 · conf 0.4 · adjusted 20.

## JTBD-13 — Conditional/adaptive page content — MONITOR

E-026 (+overlaps with JTBD-05). Merge risk with decision trees; do not split content. Raw 43 ·
conf 0.4 · adjusted 17.2.

## JTBD-12 — Reusable custom widgets (user-macro replacement) — MONITOR

E-055 (historical). Requires cross-page reuse we don't offer (per-instance bundles). Raw 41 ·
conf 0.4 · adjusted 16.4.

---

## Rejected / disqualified (stated prominently per brief §11 gates)

## JTBD-08 — Live external BI dashboards — REJECT NOW (capability-disqualified)

4+ independent artifacts (D-09, E-024, E-030, E-016, E-052 OAuth per-viewer authorization) — real,
recurring demand — **but the shipped CSP (`connect-src 'self'`) prohibits external data fetch, and
per-viewer auth/live external data are architecturally out of scope today.** Outcome-specific apps
(Dashboard Hub, Tableau for Confluence, GrafanaSight, Power BI app) own this. Verdict: 0. Route this
demand away in marketing; revisit only if allowlisted-egress ships (see `08_open_questions.md`).

## JTBD-09 — Auto-updating database-like views — REJECT NOW (native owns)

S4, E-017–E-020: native Confluence Databases closed most of the gap (SERP `database view Confluence
Notion` resolves to the native feature); remaining asks need Confluence-data read/formulas/write-back
(CONFCLOUD-78459/79584) — Atlassian's roadmap, not ours. Verdict: 0.

## JTBD-14 — Forms / collect input — REJECT NOW (capability-disqualified)

`form-action 'none'` + no storage/write-back. E-081 (hist), E-063 (CSP form-action pain is real even
for Forge developers). Verdict: 0 until a storage/write primitive exists (`docs/adr/0002` discusses
Forge storage — a deliberate future decision, not current capability).

## JTBD-19 — Scripts that style/manipulate the host page — REJECT PERMANENTLY

S2 (the brief's Reddit seed: needed code *without* an iframe for page interaction), E-093, E-010
(partial): sandboxed isolation is the product's core security property; host-page DOM access will
never be offered (same boundary applies to every Cloud app — E-092). State this limit loudly in
docs/marketing to disqualify fast.

## JTBD-16 — Frame an externally-hosted page — REJECT (native owns)

E-084, E-085, E-011, E-133, E-134: the native iframe macro and Smart Links serve this free;
"specify a URL" is also table stakes in every competitor app. No differentiation available.

---

## Persona map (per brief WS1 deliverable)

| Role | Who the evidence shows | Key evidence |
|---|---|---|
| Creator | Developer / technical writer (JTBD-01/04/20); page author (JTBD-02); KB/support manager (JTBD-05); AI-assisted knowledge worker (JTBD-15); analyst (JTBD-06/07) | D-02, D-08, E-033–035, E-107–112 |
| Viewer / beneficiary | Team members reading the page; support agents on calls; SaaS end-customers (JTBD-18) | E-033, D-08 |
| Administrator | Confluence site admin — controls install, app access rules, per-space blocks | E-127, E-135–137 |
| Economic buyer | Team/space owner via Atlassian billing; migration budget owner (JTBD-03) | E-002, E-106 (price sensitivity) |
| Influencer (gatekeeper) | Security review / IT governance — can veto on XSS or data-residency grounds | E-121–E-131 |

## Workaround map (per brief WS1 deliverable)

| Route | Where observed | Failure mode |
|---|---|---|
| Native Confluence (iframe macro, Smart Links, Databases, charts, whiteboards, Expand nesting, zip import) | E-084, E-090, E-029, E-018–020, E-043, E-074 | import kills liveness; iframe = external URL only + sizing/X-Frame-Options breakage (E-011, E-096); Expands don't branch deeply (E-034) |
| HTML-macro apps (paste/attachment) | E-001, E-008, E-094–E-104 | uneditable macro bodies, markup mangling, attachment fragility, sizing, sandbox surprise, price (E-091, E-094, E-096–097, E-104, E-106) |
| Purpose-built outcome apps | E-016, E-045, E-087 | narrow; per-source pricing; needs live-data auth |
| External hosting + link/iframe | E-005, E-050, E-107 | permissions not inherited; public-by-default risk (E-112) |
| Forge/custom development | D-07, D-11, E-062–063, E-071–072 | real engineering cost; CSP/size/publishing friction — the "buy vs build" seam (H8) |
| Screenshot / PDF / manual | E-012, E-024, E-033 | stale, non-interactive, manual burden |
| Do nothing / accept | E-043, E-133 | acceptable for shallow/simple cases — the true competitor for small jobs |

## Three recommended wedges + two rejected-but-plausible (per brief WS1 deliverable)

**Wedges: (1) JTBD-01** multi-file bundle publishing — the only job where every observed workaround
fails and fit is 5/5; **(2) JTBD-02-as-doorway** — capture the existing HTML-macro search category
with comparison content exploiting incumbents' documented quality gaps; **(3) JTBD-15** AI-generated
tool sharing — fresh 2026 demand, permission-inherited slice unserved, competitor already validating.

**Rejected-but-plausible: (a) JTBD-08** live BI dashboards — strong demand, hard capability
disqualifier (CSP); pursuing it would promise what the product cannot do. **(b) JTBD-09**
database-like views — native feature owns it; any effort would fight Atlassian's own roadmap.
