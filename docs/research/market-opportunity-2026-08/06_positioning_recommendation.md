# Positioning recommendation — Day 8–10 (2026-08-02)

**Decision input:** JTBD Adjusted scores in `02_jtbd_top20.md`; competitive maps in `05_competitive_landscape.md`; evidence IDs from `01_evidence_log.csv`.  
**Gate:** Proceed-candidate on JTBD-01 (Adjusted **86.60**, Validated); co-wedge test JTBD-02 (**57.75**); supporting JTBD-03 (**50.32**).

---

## 1. Category choice

**Own this category:**  
**Multi-file static interactive hosting for Confluence Cloud** — upload a folder of HTML/CSS/JS/assets and run it live on a page under Forge page permissions, without a public URL and without sandbox egress.

**Do not own:** “HTML Macro” (Narva / Appfire / OST crowded — E007, E008, E074).  
**Do not own:** Live BI / Notion databases / host-DOM analytics (product unfit — E029, E002, E004, E012).

**Secondary categories for acquisition only:** Cloud HTML-macro migration (SEO), AI-built static tools (co-wedge test), exported prototypes (supporting).

| Option considered | Verdict |
|---|---|
| Generic HTML/JS capability | Reject as lead — crowded, low differentiation |
| Interactive-app platform (broad) | Premature — overclaims vs no egress / no server |
| Narrow scenario solution only (e.g. Allure-only) | Too narrow as brand; use as vertical under multi-file |
| **Multi-file static hosting + outcome samples** | **Selected** |

---

## 2. One-line promise

> **Publish a live, multi-file HTML/CSS/JS mini-site on a Confluence page — relative paths intact, page permissions inherited, no public URL required.**

Alternate test lines (same meaning):
- “Turn a static folder into an interactive Confluence experience.”
- “Host interactive reports, tools, and prototypes on the page — without standing up a server.”

---

## 3. Proof pillars (must be demonstrable)

| Pillar | Proof asset | Evidence why it matters |
|---|---|---|
| **1. Folder fidelity** | Sample zip (index.html + css/ + js/ + data/) that loads without 404; contrast with HTML-include path rewrite | E022, E031, E075, E110 |
| **2. Trust / isolation** | Limits page: Forge permissions, per-instance isolation, secret scan, `connect-src 'self'` (no outbound network), no host-page DOM | E001, E013, E029, E070, E123 |
| **3. Outcome demos** | Three short demos: (a) static QA/Allure-style report, (b) AI-built self-contained tool, (c) exported HTML prototype | E022/E073; E047/E095; E041/E068–E069 |

If a claim cannot be shown in a 60-second demo or a limits doc, it does not enter Marketplace copy.

---

## 4. Anti-positioning (what NOT to claim)

1. **Not** “the HTML macro for Confluence Cloud” / “replace Narva or Appfire for every snippet.”  
2. **Not** “live Tableau / Power BI / Grafana / Jira dashboards” (egress/auth — E017–E019, E029).  
3. **Not** “interact with the Confluence page DOM / data layer” (E002, E067, E094).  
4. **Not** “Notion-like databases” or spreadsheet formulas (E004, E012, E052).  
5. **Not** “Forge replacement” without caveats (E006; JTBD-20 unverified).  
6. **Not** “installs prove product-market fit” — Mini Sites has **1** install and **0** reviews as of 2026-08-02 (E001); competitor installs are not paid actives.  
7. **Not** “AI-only” exclusivity — Narva/OST already market AI paste (E034, E074).  
8. **Not** “replace Figma” — native Live Embeds often suffice (E068); own non-Figma / exported HTML only.

---

## 5. Marketplace title / tagline recommendation

**Current (observed 2026-08-02):** “Mini Sites (Embed HTML & Prototypes) for Confluence” (E001).

| Element | Recommendation | Rationale |
|---|---|---|
| **Title** | **Mini Sites — Multi-file HTML & Interactive Pages for Confluence** | Keeps discoverable “HTML” token; inserts **multi-file** differentiator; “Prototypes” alone overweights JTBD-03 |
| **Tagline / first sentence** | Upload a folder of HTML, CSS, and JavaScript and run it live on a Confluence page — relative paths preserved, isolated sandbox, no public URL required. | Mirrors validated JTBD-01 language (E016, E022, E075) |
| **Highlight 1** | Multi-file bundles with working relative assets (reports, tools, exports) | vs snippet macros (E074, E022) |
| **Highlight 2** | Inherits Confluence page permissions; secret scanning; no sandbox egress | Trust pillar (E013, E029) |
| **Highlight 3** | Built for interactive static experiences — prototypes, self-contained tools, QA reports — not live BI | Anti-positioning baked in |
| **Screenshot story** | (1) Folder select → (2) live interactive page → (3) limits/trust callout | H11 demo bridge |
| **Video** | 45–60s: Allure-or-Plotly folder → publish → click interaction → “no outbound network” card | Proof pillars 1+3 |
| **Use-case order** | 1 Multi-file reports/tools · 2 AI-built static tools · 3 Exported prototypes · 4 Calculator as minor example | Matches Adjusted scores |
| **Trust proof** | Link to security/limits; state iframe isolation honestly | Avoid Appfire-style iframe surprise (E082) |

**Pricing narrative:** Compare to external hosting + eng time / Forge — not to “free iframe” alone (H8 still hypothesis; E032 shows paid resistance).

---

## 6. Messaging architecture (site + content)

| Layer | Owns | Primary CTA |
|---|---|---|
| Pillar: Multi-file hosting (SEO C01) | Category | Sample bundle |
| Pillar: AI publish (C02) | Co-wedge test | AI-ready sample + CDN checklist |
| Pillar: Migration (C03) | Acquisition | Decision tree → fit check |
| Vertical: Static QA reports (C04) | JTBD-04 under 01 | Report sample |
| Trust (C07) | Admin approval | Limits checklist |
| Fair comparison (C06) | Evaluators | Matrix → folder demo |
| Supporting: prototype / Plotly / calculator | Long-tail | Samples only |

---

## 7. 30-day messaging test

**Objective:** Validate that multi-file + trust messaging converts better than generic “HTML macro / prototypes” framing, and that AI co-wedge adds incremental intent without bad-fit installs.

### Week 1 — Foundation
- Update Marketplace first paragraph + three highlights per §5 (after human approval — research agent does not change listing).  
- Publish limits/security page draft copy (C07).  
- Ship **one** public sample bundle: multi-file interactive report or Plotly.

### Week 2 — Co-wedge
- Publish Claude/ChatGPT → **folder** publish guide with CDN-self checklist (C02).  
- Record 60s demo video (report + AI tool chapters).

### Week 3 — Acquisition surfaces
- Migration decision-tree article (C03) with explicit DOM/BI “don’t use us” exits.  
- Fair Narva/Appfire/OST comparison matrix dated 2026-08-02 (C06) — capability fit, not attack copy.

### Week 4 — Learning
- Design-partner interviews (wave 1 from `04_design_partner_candidates.csv`) — discovery only until outreach approved.  
- Spot-check: sample loads; no egress; relative assets OK.

### Pass / fail thresholds (30 days)

| Signal | Pass | Fail / pivot |
|---|---|---|
| Qualifying conversations (DP or inbound) describing **multi-file / local HTML / report folder** | ≥3 | <2 → revisit category language |
| Prospects who needed **host DOM or live API** and were correctly screened out | Documented ≥2 screen-outs | Screen-outs absent + bad-fit trials → strengthen anti-positioning |
| Preference vs paste macro in DP tests | ≥3/5 prefer folder+no public URL for their artifact | ≥3/5 say paste is enough → narrow to CI-report vertical only |
| AI co-wedge | ≥2 users bring AI-built artifacts that package without CDN | AI traffic wants paste-only → keep AI as example, not co-lead |
| Marketplace | Any review or repeated trial activation with multi-file success | Only snippet seekers bounce → listing still reads as HTML macro |

**Overall gate:** Keep **Proceed** on JTBD-01 unless DP evidence shows folder publish is systematically worse than Narva attachment for the same artifacts; keep AI as **Test** until non-solicited prevalence + packaging acceptance clear.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Read as “HTML macro #4” | Multi-file in title; samples; comparison matrix |
| Activation friction (H7) | Sample zips, preview, CDN checklist |
| Trust skepticism (E032) | Limits honesty; Forge permissions; no egress as feature |
| Solicited-review noise in competitor AI proof | Discount prevalence; rely on E047 + DP tests |
| Zero-review Marketplace social proof | Demos + samples substitute until reviews exist |

---

## 9. Summary recommendation

**Proceed** with **multi-file static interactive hosting** as the owned category and Marketplace lead.  
**Test** AI-publish as a co-wedge with packaging discipline.  
**Support** exported prototypes without fighting Figma.  
**Promise:** *Publish a live, multi-file HTML/CSS/JS mini-site on a Confluence page — relative paths intact, page permissions inherited, no public URL required.*
