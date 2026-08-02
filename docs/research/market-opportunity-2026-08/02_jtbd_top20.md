# Top 20 Jobs-to-be-Done — Day 6 scored (2026-08-02)

**Status:** Full Day 6 synthesis. Scores use unrounded F…X inputs; Raw and Adjusted shown.  
**Formula:** `Raw = 20 × [0.20F + 0.15U + 0.15V + 0.15P + 0.10D + 0.10R + 0.10W + 0.05X]`  
`Adjusted = Raw × confidence` (Validated **1.00** / Strong hypothesis **0.75** / Unverified **0.45** / Rejected **0.00–0.30**).  
**Evidence base:** `01_evidence_log.csv` (126 rows; 78 qualified + 15 qualified_historical). Marketplace installs are **not** treated as paid active users.

**Product fit lock:** Multi-file static HTML/CSS/JS folder; relative paths; Forge page permissions; secret scan; per-instance isolation; CSP `connect-src 'self'` → **no outbound network**; **no host-page DOM**; **no server runtime** (E001, E013, E029).

---

## Recommendation — top three wedges

| Rank | JTBD | Status | Confidence | Raw | Adjusted | Decision |
|---:|---|---|---:|---:|---:|---|
| 1 | **JTBD-01** Publish multi-file static interactive artifact | **Validated finding** | 1.00 | 86.60 | **86.60** | **Own now — Proceed-candidate** |
| 2 | **JTBD-02** Publish AI-generated HTML/JS tool on a page | Strong hypothesis | 0.75 | 77.00 | **57.75** | **Test next — co-wedge** |
| 3 | **JTBD-03** Embed clickable exported / non-Figma prototype | Strong hypothesis | 0.75 | 67.10 | **50.32** | **Supporting scenario** |

**Primary category to own:** *Multi-file static hosting on Confluence Cloud* (folder-native relative paths, no public URL required, sandbox with no egress).  
**Co-wedge test (30 days):** AI → self-contained folder → publish (not “vibe-code paste” category owned by Narva/OST).  
**Supporting:** Exported HTML prototypes / Claude mockups where Figma Live Embed is insufficient (viewer account / non-Figma).

**Note:** JTBD-04 (CI/static QA reports) scores Adjusted **59.85** — slightly above AI — but is treated as the **first vertical under JTBD-01**, not a separate category wedge, to avoid fragmenting the platform story.

---

## Scoreboard (all 20, by Adjusted descending)

| ID | Job (short) | F | U | V | P | D | R | W | X | Raw | Conf | Adj | Rec |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | Multi-file static artifact | 4.8 | 3.8 | 4.2 | 5.0 | 4.6 | 3.7 | 3.8 | 4.2 | 86.60 | 1.00 | **86.60** | Own now |
| 04 | CI / static QA report folder | 3.8 | 3.6 | 4.0 | 4.8 | 4.4 | 3.4 | 4.0 | 3.8 | 79.80 | 0.75 | **59.85** | Own under 01 |
| 02 | AI-generated tool publish | 3.6 | 3.8 | 4.0 | 4.5 | 4.0 | 4.2 | 2.4 | 4.5 | 77.00 | 0.75 | **57.75** | Test next |
| 10 | Complex multi-asset HTML fidelity | 3.5 | 3.2 | 3.5 | 5.0 | 4.0 | 3.2 | 3.2 | 3.0 | 72.90 | 0.75 | **54.68** | Support 01 |
| 05 | Cloud HTML macro migration | 4.2 | 3.5 | 3.5 | 3.5 | 3.8 | 4.5 | 1.8 | 3.0 | 71.50 | 0.75 | **53.62** | Acquire via SEO |
| 06 | Interactive Plotly/D3 viz | 3.2 | 3.0 | 3.4 | 4.5 | 3.8 | 3.0 | 3.5 | 3.5 | 69.60 | 0.75 | **52.20** | Support 01 |
| 09 | Internal static tools on wiki | 3.2 | 3.2 | 3.8 | 4.2 | 3.5 | 3.0 | 2.8 | 4.0 | 69.00 | 0.75 | **51.75** | Support 01/02 |
| 03 | Exported clickable prototype | 3.0 | 3.0 | 3.5 | 4.8 | 2.8 | 3.6 | 2.6 | 3.2 | 67.10 | 0.75 | **50.32** | Supporting |
| 13 | Sandbox / admin trust clarity | 2.5 | 3.5 | 3.8 | 4.5 | 3.0 | 3.0 | 3.0 | 2.5 | 65.90 | 0.75 | **49.42** | Trust pillar |
| 12 | Packaging / activation simplicity | 3.0 | 3.5 | 3.0 | 4.0 | 4.2 | 2.8 | 2.5 | 3.0 | 65.50 | 0.75 | **49.12** | Activation risk |
| 11 | Versioned attached HTML render | 2.8 | 2.8 | 3.0 | 4.5 | 3.5 | 2.5 | 3.0 | 3.5 | 63.60 | 0.75 | **47.70** | Monitor |
| 07 | Simple calculator widget | 2.2 | 2.0 | 2.2 | 5.0 | 2.8 | 3.0 | 2.0 | 3.2 | 55.20 | 0.75 | **41.40** | Long-tail example |
| 14 | Custom layout / CSS beyond native | 2.8 | 2.5 | 2.5 | 4.0 | 2.5 | 3.0 | 1.5 | 2.5 | 54.70 | 0.75 | **41.02** | Monitor |
| 08 | Training / interactive simulator | 2.0 | 3.0 | 3.5 | 4.5 | 3.0 | 2.5 | 3.5 | 3.5 | 62.50 | 0.45 | **28.12** | Unverified |
| 20 | Avoid Forge for small tools | 2.0 | 3.0 | 4.0 | 3.5 | 3.0 | 2.0 | 3.5 | 3.5 | 60.00 | 0.45 | **27.00** | Unverified |
| 15 | Live BI (Tableau/PBI/Grafana) | 3.5 | 3.5 | 4.5 | 1.0 | 2.5 | 4.0 | 1.0 | 3.0 | 59.00 | 0.20 | **11.80** | Reject wedge |
| 17 | Notion-like databases | 2.5 | 3.0 | 3.5 | 1.5 | 2.0 | 3.5 | 0.5 | 2.0 | 48.00 | 0.20 | **9.60** | Reject |
| 18 | Egress widgets (chatbot/forms) | 2.0 | 2.5 | 2.5 | 0.5 | 2.0 | 2.5 | 1.0 | 2.0 | 37.50 | 0.25 | **9.38** | Reject |
| 16 | Host-page DOM / analytics | 2.8 | 4.0 | 3.5 | 0.5 | 3.5 | 2.5 | 1.0 | 2.0 | 51.20 | 0.15 | **7.68** | Reject / disqualify |
| 19 | Embed Confluence → external site | 1.5 | 2.0 | 2.0 | 0.0 | 1.5 | 1.5 | 0.5 | 1.0 | 26.00 | 0.10 | **2.60** | Reject |

---

## JTBD cards

### JTBD-01 — Publish multi-file static interactive artifact on a Confluence page
**When** I have an HTML/CSS/JS folder (report, widget, tool, exported UI)  
**I want to** host it with relative paths intact on a Confluence page  
**So I can** let teammates use the live artifact in context without separate hosting or path-rewrite hacks.

| Role | Typical |
|---|---|
| Creator | Developer, QA/devops, analyst |
| Viewer | PMs, stakeholders, broader team on the page |
| Admin | Enables Marketplace app; security review |
| Buyer | Admin / team lead (sensitive to “another paid HTML app” — E032) |

**Artifact:** Multi-file static bundle (HTML + CSS + JS + assets).  
**Current workarounds:** Attachments + iframe (downloads/404) · HTML include path rewrite · Azure/S3/public host + iframe · paste into snippet macros · Forge custom app.  
**Critical interaction:** Client-side interactivity within bundle; relative asset loads. **No** host DOM; **no** outbound API unless pre-bundled.  
**Why options fail:** Relative URLs break under Confluence hosting (E022); attachments download instead of render (E072, E110); snippet macros struggle with multi-script pages (E043, E084); external hosting forces public URL / auth friction (E073).  
**Why options are sometimes good enough:** Single-file paste into Narva/Appfire/OST; native iframe when a public URL already exists (E078).

**Demand evidence (independent):** E016, E022, E031*, E038*, E043, E044, E045, E049*, E050*, E053, E065*, E073, E075 (21.6k views), E084, E085*, E086*, E096, E110, E115 (*historical labeled). Channels: Community, Stack Overflow, Marketplace reviews, GitHub.  
**Willingness / urgency:** Recurring CI/report and SaaS-export friction; “impossible without external hosting” language (E075); paid apps already considered as path (E003, E014).  
**Product fit:** **P=5** — core product today (folder upload, relative paths, isolation). Gaps: publish UX friction (H7); height/resize (E036); outbound CDN/fonts if not bundled.  
**Counterevidence:** Native iframe suffices for same-domain/admin embeds (E078); Narva file/attachment + AI positioning overlaps (E034, E041–E044); paid-app resistance (E032); users seeking page-DOM still bounce (E002).  
**Status:** **Validated finding** (≫5 independent artifacts, ≥2 channels, counterevidence checked).

| Dim | Score | Anchor |
|---|---:|---|
| F | 4.8 | Repeated Cloud + migration + SO + reviews |
| U | 3.8 | Blocks sharing / forces hosting hacks |
| V | 4.2 | Replaces hosting + rewrite + Forge for static |
| P | 5.0 | Demonstrable today |
| D | 4.6 | Repeated path/attachment failures |
| R | 3.7 | “embed HTML”, “static HTML”, Allure, local HTML |
| W | 3.8 | Folder-native + no egress thinner than snippet incumbents |
| X | 4.2 | Reports, tools, AI exports, prototypes adjacent |
| **Raw** | **86.60** | |
| Conf | **1.00** | Validated |
| **Adjusted** | **86.60** | |

**Recommendation:** **Own now — Proceed-candidate.**  
**Next test:** 5 design-partner walkthroughs of a real multi-file folder (Allure or Plotly or internal tool). Pass if ≥3 prefer folder+no public URL over Narva attachment/paste; fail if ≥3 say single-file paste is enough.

---

### JTBD-02 — Publish an AI-generated HTML/JS tool on a Confluence page
**When** Claude/ChatGPT produces a small interactive tool (decision tree, calculator, widget, mockup)  
**I want to** publish it on a Confluence page quickly  
**So** the team can use it without engineering a Forge app or standing up external hosting.

| Role | Typical |
|---|---|
| Creator | Non-coder ops/PM + AI; sometimes developer |
| Viewer | Colleagues self-serving expertise |
| Admin / Buyer | Same as JTBD-01; trust of user-supplied JS |

**Artifact:** Often multi-file or large single HTML; may reference CDNs (disqualifier unless bundled).  
**Workarounds:** Paste into OST/Narva/Mosaic · attachment · external host · don’t ship.  
**Fit:** High if self-contained; **CDN/API breaks** under `connect-src 'self'` (E001, E029).  
**Evidence:** E042, E047 (If Insurance practitioner — production governance), E060, E061, E089, E090, E095; vendor context E030, E034, E055 (not demand). Channels: Marketplace reviews, practitioner blog.  
**Counterevidence:** Jul 2026 review clusters may be solicited (journal caution) — do not treat as prevalence; Narva/OST already own “AI paste” messaging (E034, E074); packaging friction remains (E063, E096); users may prefer external sandboxes.  
**Status:** **Strong hypothesis** (converging signals; WTP + non-solicited prevalence still open).

| Dim | Score |
|---|---:|
| F 3.6 · U 3.8 · V 4.0 · P 4.5 · D 4.0 · R 4.2 · W 2.4 · X 4.5 |
| Raw **77.00** · Conf **0.75** · **Adjusted 57.75** |

**Recommendation:** **Test next — co-wedge** with JTBD-01 (message: “AI built it → folder → live on the page,” not “HTML macro #4”).  
**Next test:** Ship one sample Claude→folder publish guide + demo. Pass if ≥10 Marketplace/demo engagements in 30 days *and* ≥2 DPs confirm CDN-free packaging is acceptable.

---

### JTBD-03 — Embed a clickable prototype (exported / non-Figma) in docs
**When** I need design/dev review inside Confluence  
**I want** a clickable prototype inline  
**So** reviewers test the flow instead of reading screenshots.

**Evidence:** E021, E033, E041, E058*, E079 (Framer ZIP predecessor — validates job, dormant threat), E095.  
**Counterevidence:** Figma Live Embeds / Smart Links often sufficient (E068, E021, E033); CollabSoft notes viewer Figma-account friction (E069) — niche for Mini Site, not “replace Figma.”  
**Status:** Strong hypothesis.

| Dim | Score |
|---|---:|
| F 3.0 · U 3.0 · V 3.5 · P 4.8 · D 2.8 · R 3.6 · W 2.6 · X 3.2 |
| Raw **67.10** · Conf **0.75** · **Adjusted 50.32** |

**Recommendation:** **Supporting scenario** under multi-file + AI mockups. Do not lead Marketplace category as “prototype app.”  
**Next test:** One exported HTML prototype sample vs Figma Smart Link comparison page; pass if DPs without Figma viewer seats prefer Mini Site.

---

### JTBD-04 — Publish CI / static QA report folders (Allure, JUnit, TestRail HTML)
**When** CI or a test tool outputs a multi-file HTML report  
**I want** it live on a Confluence page with assets resolving  
**So** stakeholders explore results without hunting external hosts.

**Evidence:** E022, E049*, E053, E073, E085*, E111*, E113, E115.  
**Counterevidence:** Public Azure/S3 + iframe works when org allows public/auth URLs (E073 pattern); TestRail may already have embed paths (E113).  
**Status:** Strong hypothesis (SO+Community+GitHub; slightly thin on recent Cloud-only reviews).

| Dim | Score |
|---|---:|
| F 3.8 · U 3.6 · V 4.0 · P 4.8 · D 4.4 · R 3.4 · W 4.0 · X 3.8 |
| Raw **79.80** · Conf **0.75** · **Adjusted 59.85** |

**Recommendation:** **Own as first vertical of JTBD-01** (demo + SEO pillar), not a separate brand category.  
**Next test:** Publish Allure sample bundle on lite-dev; pass if relative CSS/JS load without 404 (contrast E022).

---

### JTBD-05 — Restore HTML after Server/DC → Cloud migration
**When** Cloud migration removes or breaks the HTML macro  
**I want** custom HTML/JS content rendering again  
**So** pages and workflows keep working without hunting unknown-macro debt.

**Evidence:** E014, E048, E057, E066 (7.4k views), E077-related migration language, E093.  
**Counterevidence:** Crowded incumbent path (Narva migration messaging E034); paid-app pushback framed as security theater (E032); many migrations only need iframe of an external URL.  
**Status:** Strong hypothesis for **acquisition intent**; weak as owned category (W low).

| Dim | Score |
|---|---:|
| F 4.2 · U 3.5 · V 3.5 · P 3.5 · D 3.8 · R 4.5 · W 1.8 · X 3.0 |
| Raw **71.50** · Conf **0.75** · **Adjusted 53.62** |

**Recommendation:** **Acquire via SEO/migration content**; convert multi-file survivors to JTBD-01; do not lead as “HTML Macro for Cloud.”

---

### JTBD-06 — Embed interactive Plotly / D3 (or similar) visualizations
**When** I generate interactive charts that are HTML/JS (+ data files)  
**I want** them embedded in Confluence  
**So** stakeholders can explore without leaving the page.

**Evidence:** E045, E065*, E127.  
**Counterevidence:** Table Filter owns tabular charts at scale (E012 ~15k installs — not paid-user count); live data APIs need egress.  
**Status:** Strong hypothesis (thin count; fits multi-file).

| Dim | Score |
|---|---:|
| F 3.2 · U 3.0 · V 3.4 · P 4.5 · D 3.8 · R 3.0 · W 3.5 · X 3.5 |
| Raw **69.60** · Conf **0.75** · **Adjusted 52.20** |

**Recommendation:** Supporting example under JTBD-01; sample Plotly bundle as proof.

---

### JTBD-07 — Simple interactive calculator / formula widget
**When** readers need to compute a simple formula  
**I want** inputs on the Confluence page  
**So** they get results without Excel.

**Evidence:** E051; spreadsheet-overlap E052 (Table Filter territory).  
**Counterevidence:** Table Filter / Spreadsheets dominate tabular formulas (E012, E052); calculator was listing illustration — not validated demand segment.  
**Status:** Strong hypothesis as **long-tail example only**.

| Dim | Score |
|---|---:|
| F 2.2 · U 2.0 · V 2.2 · P 5.0 · D 2.8 · R 3.0 · W 2.0 · X 3.2 |
| Raw **55.20** · Conf **0.75** · **Adjusted 41.40** |

**Recommendation:** Supporting long-tail / AI-generated example — **not a solo wedge**.

---

### JTBD-08 — Interactive training / product simulator on a page
**When** I train teams on a product or process  
**I want** an interactive simulator on the Confluence page  
**So** learners practice in context.

**Evidence:** E097; related decision-tree self-serve E047.  
**Counterevidence:** Single-review language risk; LMS/external tools often preferred; unverified recurrence.  
**Status:** **Unverified idea**.

| Dim | Score |
|---|---:|
| F 2.0 · U 3.0 · V 3.5 · P 4.5 · D 3.0 · R 2.5 · W 3.5 · X 3.5 |
| Raw **62.50** · Conf **0.45** · **Adjusted 28.12** |

**Recommendation:** Monitor; use as JTBD-01/02 example if a DP appears.

---

### JTBD-09 — Keep internal static tools / small dashboards in Confluence
**When** the team hunts across tabs for small tools and status UIs  
**I want** those tools on Confluence pages  
**So** work stays in one place.

**Evidence:** E062, E064, E090, E097; admin iframe counter-pattern E078.  
**Counterevidence:** Live data tools need Dashboard Hub / Tableau / Grafana (E009–E011); native iframe enough for same-domain admin (E078).  
**Status:** Strong hypothesis (outcome language; static-only slice).

| Dim | Score |
|---|---:|
| F 3.2 · U 3.2 · V 3.8 · P 4.2 · D 3.5 · R 3.0 · W 2.8 · X 4.0 |
| Raw **69.00** · Conf **0.75** · **Adjusted 51.75** |

**Recommendation:** Outcome language on pages under JTBD-01/02; do not compete with live BI apps.

---

### JTBD-10 — Faithful render of complex multi-script / multi-stylesheet HTML
**When** I have a complex HTML page with multiple scripts and stylesheets  
**I want** it to render correctly and performantly in Confluence  
**So** the interactive result matches local behavior.

**Evidence:** E043, E084, E096, E075.  
**Counterevidence:** Snippet macros claim success for many users; resize/sandbox surprises remain (E036, E082, E083).  
**Status:** Strong hypothesis — largely a quality bar of JTBD-01.

| Dim | Score |
|---|---:|
| F 3.5 · U 3.2 · V 3.5 · P 5.0 · D 4.0 · R 3.2 · W 3.2 · X 3.0 |
| Raw **72.90** · Conf **0.75** · **Adjusted 54.68** |

**Recommendation:** Proof pillar (before/after vs path rewrite), not separate category.

---

### JTBD-11 — Render versioned HTML attachments with the page
**When** HTML artifacts change over time  
**I want** attached/versioned HTML rendered on the page  
**So** documentation stays in sync with the artifact.

**Evidence:** E044, E053, E110, E115.  
**Counterevidence:** Attachment+iframe historically fails (E072); users may prefer git/external host for true versioning.  
**Status:** Strong hypothesis.

| Dim | Score |
|---|---:|
| F 2.8 · U 2.8 · V 3.0 · P 4.5 · D 3.5 · R 2.5 · W 3.0 · X 3.5 |
| Raw **63.60** · Conf **0.75** · **Adjusted 47.70** |

**Recommendation:** Monitor; emphasize republish workflow in product UX (H7).

---

### JTBD-12 — Reduce packaging friction to ship HTML into Confluence
**When** I struggle to package HTML for Confluence  
**I want** a simple, predictable publish path  
**So** content finally ships.

**Evidence:** E063, E071, E096, E110; H7 validated pattern (E022/E076 path rewrite, E072 downloads).  
**Counterevidence:** OST “paste in 30s” wins activation mindshare (E074); folder upload may feel heavier than paste for single-file users.  
**Status:** Strong hypothesis (activation risk, not demand job alone).

| Dim | Score |
|---|---:|
| F 3.0 · U 3.5 · V 3.0 · P 4.0 · D 4.2 · R 2.8 · W 2.5 · X 3.0 |
| Raw **65.50** · Conf **0.75** · **Adjusted 49.12** |

**Recommendation:** Product + onboarding priority (preview, sample zips, CDN checklist) — not a marketing category.

---

### JTBD-13 — Run user HTML under clear sandbox / admin-trustable limits
**When** Cloud sandboxes HTML for security  
**I want** clear, trustworthy limits (isolation, permissions, no surprise egress)  
**So** I can plan and get admin approval.

**Evidence:** E032 (skepticism), E070 (limits accepted), E120, E123; product isolation E001/E013/E029.  
**Counterevidence:** Admins may reject user-supplied JS regardless; Narva also Forge/RoA/SOC2 — trust not exclusive.  
**Status:** Strong hypothesis (buyer overlay).

| Dim | Score |
|---|---:|
| F 2.5 · U 3.5 · V 3.8 · P 4.5 · D 3.0 · R 3.0 · W 3.0 · X 2.5 |
| Raw **65.90** · Conf **0.75** · **Adjusted 49.42** |

**Recommendation:** Mandatory **trust pillar** in listing/docs (no public URL, no egress, secret scan, page permissions) — not the lead job.

---

### JTBD-14 — Customize page layout / CSS beyond native Confluence
**When** native layout is insufficient  
**I want** custom HTML/CSS  
**So** pages become more flexible.

**Evidence:** E035, E015, E075.  
**Counterevidence:** Aura/formatting suites; security objections to chrome modification (E094 is DOM — disqualified).  
**Status:** Strong hypothesis (commodity HTML).

| Dim | Score |
|---|---:|
| F 2.8 · U 2.5 · V 2.5 · P 4.0 · D 2.5 · R 3.0 · W 1.5 · X 2.5 |
| Raw **54.70** · Conf **0.75** · **Adjusted 41.02** |

**Recommendation:** Monitor; do not position as “page builder.”

---

### JTBD-15 — Live interactive BI (Tableau / Power BI / Grafana) in page — REJECT as wedge
**When** I need live metrics in Confluence  
**I want** interactive BI embeds  
**So** stakeholders see current data in context.

**Evidence:** E017–E019, E025, E054, E112; specialists E009–E011.  
**Disqualifier:** Needs egress/auth; Mini Site `connect-src 'self'` (E029). Native iframe / specialist apps better.  
**Status:** **Rejected / contradicted** as Mini Site wedge (demand real; product unfit).

| Dim | Score |
|---|---:|
| F 3.5 · U 3.5 · V 4.5 · P 1.0 · D 2.5 · R 4.0 · W 1.0 · X 3.0 |
| Raw **59.00** · Conf **0.20** · **Adjusted 11.80** |

**Recommendation:** **Do not pursue.** Complement positioning only (“static reports ≠ live BI”).

---

### JTBD-16 — Host-page DOM interactive HTML / custom analytics — REJECT / DISQUALIFY
**When** my script must read the Confluence page data layer or DOM  
**I want** non-iframe HTML  
**So** code can interact with the host page.

**Evidence:** E002, E040, E067, E094.  
**Disqualifier:** Mini Site is iframe-isolated — same class as Marketplace HTML macros (E002, E123).  
**Status:** Rejected for Mini Site.

| Dim | Score |
|---|---:|
| F 2.8 · U 4.0 · V 3.5 · P 0.5 · D 3.5 · R 2.5 · W 1.0 · X 2.0 |
| Raw **51.20** · Conf **0.15** · **Adjusted 7.68** |

**Recommendation:** **Explicit anti-positioning** — state isolation limits early to avoid bad-fit installs.

---

### JTBD-17 — Notion-like interactive databases — REJECT
**Evidence:** E004, E026. Counter: native Databases; Table Filter.  
**Status:** Rejected.

| Dim | Score |
|---|---:|
| F 2.5 · U 3.0 · V 3.5 · P 1.5 · D 2.0 · R 3.5 · W 0.5 · X 2.0 |
| Raw **48.00** · Conf **0.20** · **Adjusted 9.60** |

**Recommendation:** Do not pursue.

---

### JTBD-18 — Third-party chatbot / forms needing external network — REJECT
**Evidence:** E091, E092. Disqualifier: egress. Prefer iframe of vendor URL when allowed.  
**Status:** Rejected for Mini Site sandbox.

| Dim | Score |
|---|---:|
| F 2.0 · U 2.5 · V 2.5 · P 0.5 · D 2.0 · R 2.5 · W 1.0 · X 2.0 |
| Raw **37.50** · Conf **0.25** · **Adjusted 9.38** |

**Recommendation:** Do not pursue.

---

### JTBD-19 — Embed Confluence pages into external websites — REJECT
**Evidence:** E027, E028 (excluded as wrong direction).  
**Status:** Rejected.

| Dim | Score |
|---|---:|
| F 1.5 · U 2.0 · V 2.0 · P 0.0 · D 1.5 · R 1.5 · W 0.5 · X 1.0 |
| Raw **26.00** · Conf **0.10** · **Adjusted 2.60** |

**Recommendation:** Do not pursue.

---

### JTBD-20 — Avoid building a Forge app for a small internal tool — UNVERIFIED
**When** the org needs a small custom tool in Confluence  
**I want** to ship a static bundle instead of a Forge app  
**So** we avoid engineering overhead.

**Evidence:** E006 (platform legitimizes dashboards/tools — context), E047 (production AI tools on wiki). Thin direct “Forge is too much” user language.  
**Counterevidence:** Forge is correct for authenticated APIs, storage, write-back.  
**Status:** Unverified idea.

| Dim | Score |
|---|---:|
| F 2.0 · U 3.0 · V 4.0 · P 3.5 · D 3.0 · R 2.0 · W 3.5 · X 3.5 |
| Raw **60.00** · Conf **0.45** · **Adjusted 27.00** |

**Recommendation:** Interview probe only; do not claim “Forge replacement” in marketing.

---

## Persona map (locked for top jobs)

| Role | JTBD-01 / 04 | JTBD-02 | JTBD-03 |
|---|---|---|---|
| Creator | Dev / QA / analyst | AI-assisted PM/ops (+ builder) | Designer / PM / eng |
| Viewer | Stakeholders on page | Team self-serve | Reviewers |
| Admin | Marketplace + security | Same; JS trust | Same |
| Buyer | Admin / lead | Same | Same |

## Workaround map

| Path | When good enough | When fails for Mini Site jobs |
|---|---|---|
| Native iframe / Smart Link | Public/auth URL exists; Figma | Local folders; relative assets; no public URL |
| Narva / Appfire / OST HTML macros | Snippets; AI paste | Multi-file relative paths; no-egress folder story |
| Table Filter / Dashboard Hub / Tableau | Live tables / Jira / BI | Arbitrary static apps |
| External host + iframe | Org accepts hosting | Auth, governance, context switching |
| Forge custom app | APIs, secrets, write-back | Overkill for static bundles |
| Screenshots / PDF | Static communication | Loses interactivity |
| Do nothing | Low urgency | Recurring report/tool pain |

## Negative evidence — do not pursue now

1. **Host-page DOM / analytics** — disqualified (E002, E067, E094).  
2. **Live BI** — egress/auth; specialists own (E017–E019, E009–E012).  
3. **Notion databases** — native + Table Filter (E004, E026).  
4. **Confluence → external embed** — wrong product direction (E027, E028).  
5. **Generic “HTML macro #4”** — Narva ~2.3k / Appfire ~1.8k / OST ~1.8k installs (dated 2026-08-02; not paid-user counts) (E007, E008, E074).  
6. **Egress chatbots/forms** — sandbox blocks (E091, E092, E029).

## Decision gate (brief §15)

- **Proceed with wedge:** JTBD-01 Adjusted **86.60** ≥ 70, Validated, ≥2 source types, fits current capabilities, reachable creators → **YES**.  
- **Reposition and test:** JTBD-02 Adjusted **57.75** (50–69 band) → 30-day co-wedge validation.  
- **Supporting:** JTBD-03 Adjusted **50.32**.  
- **Pause overall:** Not indicated.

*End Day 6 JTBD packet — 2026-08-02.*
