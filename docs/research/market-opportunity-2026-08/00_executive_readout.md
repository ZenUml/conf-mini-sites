# Executive readout — Mini Sites market opportunity

**Packet date:** 2026-08-02  
**Evidence base:** `01_evidence_log.csv` — **126 raw** / **93 qualified+historical** (78 + 15) / 29 context_only / 4 excluded  
**Source mix (qualified+historical):** Community 35.5% · marketplace_review 32.3% · Stack Overflow 14.0% · YouTube 5.4% · Reddit 3.2% · other ~9.6% (no source >40%)  
**JTBD scores:** Canonical in `02_jtbd_top20.md` (Day 6 full scoreboard). Top three Adjusted: **86.60 / 57.75 / 50.32**.

---

## Gate call (Day 10 rules)

| Option | Rule | Status |
|---|---|---|
| **Proceed with wedge** | ≥1 job Adjusted **≥70**, ≥2 source types, current/near-term fit, reachable creator/buyer | **SELECTED** |
| Reposition and test | Promising job 50–69 or one material uncertainty | Used for AI co-wedge (JTBD-02) only |
| Pause | No job ≥50, natives/competitors good enough, or critical product gaps dominate | Rejected as primary call |

### Recommended call

**Proceed with wedge**

- **Primary wedge:** Multi-file static interactive artifacts on Confluence pages — **folder upload + relative paths preserved + Forge page permissions + no public URL + no outbound network** (`connect-src 'self'`).
- **Co-wedge (30-day validation, not launch lead):** AI-generated HTML/JS tool publish (Claude/ChatGPT → Confluence), especially when outputs are multi-file or complex enough that paste macros fail.
- **First vertical under primary:** CI / static QA report folders (Allure, etc.) — Adjusted **59.85**; demo + SEO, not a separate brand.

**Why Proceed (not Reposition/Pause):** JTBD-01 evidence-adjusted score **86.60** (≥70 gate); Validated confidence (1.00); demand spans Community + SO + Marketplace reviews + practitioner blog; product already ships the folder/isolation model (E001, E029, L1–L3); 30 design-partner candidates queued (no contact yet).

---

## Top 3 jobs (evidence-adjusted)

Scoring: `Raw = 20 × [0.20F + 0.15U + 0.15V + 0.15P + 0.10D + 0.10R + 0.10W + 0.05X]`; `Adjusted = Raw × confidence`. Full unrounded inputs in `02_jtbd_top20.md`.

| Rank | Job | Conf | Raw → Adj | Recommendation |
|---:|---|---:|---:|---|
| 1 | **JTBD-01** Publish multi-file static interactive artifact on a Confluence page | **1.00** Validated | **86.60 → 86.60** | **Own now** |
| 2 | **JTBD-02** Publish AI-generated HTML/JS tool on a page | **0.75** Strong hyp. | **77.00 → 57.75** | **Test next** (co-wedge) |
| 3 | **JTBD-03** Embed clickable exported / non-Figma prototype | **0.75** Strong hyp. | **67.10 → 50.32** | Supporting — do **not** “replace Figma” |

### JTBD-01 support (non-exhaustive)

E016, E022, E031, E038, E043, E044, E045, E047, E049, E053, E065, E073, E075 (21,610 views), E084, E086, E090, E096, E110, E111, E115 · packaging failure modes E072 · counterevidence: native iframe enough for some embeds (E078, E019, E025); external host OK when public URL acceptable (E022 workaround, E073); Narva file/attachment overlap (E043, E044).

### JTBD-02 support / caution

E042, E047 (If Insurance production blog), E060, E061, E089, E095, E096, E097 · vendor SEO Narva/OST (E055, E074) · **discount Jul 2026 review solicitation clusters** as prevalence (still valid for language).

### JTBD-03 support / caution

E021, E033, E041, E069 · **counterevidence:** Figma Live Embeds native (E068); own exported-static / account-free / AI-built slice only.

---

## Personas

| Role | Primary for wedge | Evidence |
|---|---|---|
| **Creator** | Developer, analyst, QA/devops, designer-adjacent — builds or exports HTML/CSS/JS folders (reports, tools, sims) | E016, E022, E045, E047, E075, E090, E096, E097 |
| **Viewer** | Teammates, PMs, stakeholders who consume the live artifact on the page (not the publishers) | E041, E047, E085, E097; H5 validated pattern |
| **Admin / Buyer** | Confluence admin / team lead who installs Marketplace apps and runs security review; sensitive to “another paid HTML app” | E032, E001 (paid listing); competitor installs Narva/Appfire (E074 / C02–C03) |

---

## Positioning one-liner

**Publish a live, multi-file HTML/CSS/JS mini-site on a Confluence page — relative paths intact, page permissions inherited, no public URL required.**

Not: “HTML macro #4.” Not: “live BI dashboard.” Not: “replace Figma.”

Proof pillars (claim → evidence):
1. **Folder-native relative paths** beat attachment URL hacks and HTML-include path rewrite — E022, E031, E065, E110.
2. **Isolation + no public URL** for artifacts that must stay inside Confluence — E038, E047, E029, E001.
3. **Complex / AI-built mini-apps** outgrow paste macros (Rendering errors, multi-script friction) — E043, E084, E096, E097.

---

## Biggest risks

| Risk | Why it matters | Evidence / mitigation |
|---|---|---|
| **Narva / OST overlap** | Narva ~2,345 installs (files/attachments + AI); OST HTML Macro Pro ~1,795 (“vibe code” paste). Crowded “HTML macro” SERP and buyer mental model. | E001 vs C03/C16 (E055, E074); differentiate folder + no-egress + no public URL; never lead as generic snippet macro |
| **Jul 2026 solicitation bias** | Dense 5★ review clusters on Narva/OST inflate AI/prototype language prevalence. | Journal Day 3–4 caution; treat as language/outcome only, not install forecast |
| **Packaging UX** | Paste macros fail on complex content (resize, Rendering error, multi-macro slowdown); Mini Sites must make folder publish/update obviously easier. | E036, E063, E084, E096, H7 |
| **Paid-app resistance** | Some admins reject paid HTML macros on principle; Mini Sites is paid with **1 install / 0 reviews** today. | E032, E001; need trust/limits content + migration SEO, not feature spam |
| **Reddit 403 gap** | r/atlassian / r/sysadmin JSON/search blocked; Reddit share only 3.2% of qualified. Under-samples informal admin/creator talk. | E121, E129; E078 recovered via Community mirror; browser follow-up still open |

---

## What NOT to pursue (now)

| Reject | Reason | Evidence |
|---|---|---|
| Host-page DOM / custom page analytics | iframe isolation disqualifies Mini Sites and all Cloud HTML macros | E002, E040, E067, E094 |
| Live Tableau / Power BI / Grafana / Splunk as wedge | Needs egress/auth; specialists + native iframe; Table Filter owns table reports (~15k installs) | E017–E025, E098–E101, E112 |
| Notion-like interactive databases | Native Databases / Table Filter | E004, E026, E052 |
| Embed Confluence → external sites | Wrong direction | E027, E028 |
| Generic “HTML macro” category leadership | Narva/Appfire already own 1.7k–2.3k installs | C02, C03, E074 |
| “Replace Figma” prototype positioning | Smart Link / Live Embeds often good enough | E068, E021, E033 |

---

## Next 30 days — actions and pass/fail

| # | Action | Pass | Fail |
|---|---|---|---|
| 1 | **Authorize + run 5 wave-1 design-partner interviews** (folder vs paste/attachment; isolation; update cadence) using `design_partner_interview_guide.md` — priority DP06, DP12, DP13, DP18, DP04/DP14 | ≥3/5 prefer folder + no public URL for their real artifact; ≥2 name a recurring publish cadence | <2 prefer folder, or majority need host-DOM / live APIs |
| 2 | **AI co-wedge validation** — 3 independent non-vendor artifacts or interview confirms outside Jul-2026 review clusters; one end-to-end Claude/ChatGPT → folder → Mini Sites demo | JTBD-03 confidence → Validated **or** clear kill (AI users happy with single-file paste) | Still only vendor/solicited reviews; no independent recurrence |
| 3 | **Packaging activation** — ship/spot-check folder publish + republish UX; one public demo (Allure or Plotly multi-file) proving relative paths | Demo completes without path rewrite / attachment download; ≤3 user steps to live | Users still default to paste; path failures in demo |
| 4 | **Positioning lock** — Marketplace title/subtitle + first content pillar: “multi-file HTML in Confluence” / migration / relative paths — **not** “HTML macro” | Listing/docs language matches JTBD-01; anti-positioning list published | Copy collapses back to generic HTML macro |
| 5 | **Trust & limits** — publish CSP/no-egress/page-permissions limits page; address paid-app objections in FAQ | Security reviewers can cite limits without sales call; no surprise CDN failures in DP tests | DP blockers = surprise network deny or unclear permissions |
| 6 | **Close Reddit gap** — browser capture ≥5 additional r/confluence or r/atlassian threads on HTML/iframe/prototype | Reddit ≥8% of qualified **or** documented exhaustion | Still blocked with no alternative primary sources |

**30-day program pass (keep Proceed):** Actions 1 and 3 pass; Action 2 either validates co-wedge or cleanly demotes it to “supporting example.”  
**30-day program fail (downgrade to Reposition or Pause):** Action 1 fails **or** Narva/OST shown to fully satisfy folder+isolation jobs in interviews **or** paid resistance blocks all wave-1 buyers with no trust path.

---

## Highest-risk assumption

Creators with multi-file artifacts will **switch from Narva attachment/paste or external host** to Mini Sites for relative-path + no-public-URL value — not treat Mini Sites as a redundant paid HTML macro (E032, C03, E074).

**Cheapest falsifier:** 5 DP interviews (Action 1). If ≥3 say “Narva/attachments already good enough” or “I need allowlisted egress,” revisit gate.

---

## Decision summary (one screen)

| Field | Value |
|---|---|
| **Gate** | **Proceed with wedge** |
| **Owned job** | Multi-file static interactive artifacts on Confluence pages |
| **Test job** | AI-publish co-wedge (30 days) |
| **One-liner** | Folder + relative paths + page permissions + no public URL + no egress |
| **Do not** | Generic HTML macro, live BI, host-DOM, Notion DB, Confluence→external, replace Figma |
| **First move** | Authorize wave-1 DPs; ship multi-file demo; lock positioning away from “HTML macro #4” |
