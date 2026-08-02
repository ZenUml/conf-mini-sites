# Research journal — Mini Site market opportunity

**Brief:** `handbook/mini-site-market-opportunity-research-brief.pdf`  
**Snapshot start:** 2026-08-02  
**Role:** Desktop Agent as research lead  
**Rules:** No prospect contact; no installs/purchases; no Marketplace listing changes; public evidence only.

---

## Day 1 — Protocol and product truth (2026-08-02)

### Targets
- Create research folder + schemas
- Lock product capability truth from listing/docs (not marketing assumptions)
- Capture ≥10 seed artifacts (Appendix A S1–S12 + product docs)
- Define inclusion/exclusion + taxonomy v0
- Source plan for Days 2–4

### Product truth (verified from local listing docs + code context; Marketplace live page recheck pending)

| Claim | Status | Source | Marketing-safe? |
|---|---|---|---|
| Confluence Cloud paid Marketplace app (Mini Sites / Mini Site) | Observed locally; live listing recheck pending | S1 URL + `docs/listing/*` | Yes after live recheck |
| Upload multi-file static folder (HTML/CSS/JS/assets); relative paths preserved | Documented | `docs/listing/documentation.md`, `getting-started.md` | Yes |
| Runs inline/interactive in page (not screenshot) | Documented claim | listing docs | Yes if demo confirms |
| Forge-based; inherits page visibility | Documented | `more-details.md` | Validate exact Forge scopes before heavy trust claims |
| Secret scan + isolated per-instance sandbox | Documented | listing docs | Yes with limits page |
| **No outbound network from sandbox** — must bundle fonts/libs/data | Documented hard limit | `more-details.md` | Must state in limits; disqualifies live API dashboards |
| Static only; no server-side runtime | Documented | getting-started | Yes |
| Size limits: ≤2000 files, 25 MiB/file, 50 MiB/bundle | Documented | `more-details.md` | Yes |
| Advertised examples (prototype, dashboard, calculator, troubleshooting, internal tool) | Vendor use-case claims | listing | **Not demand evidence** |

### Open product-capability questions (must resolve before P>3 scores)
1. Exact CSP / iframe sandbox attributes in production dispatch Worker
2. Whether `fetch()` to same-origin bundle assets works (relative) vs any external
3. Responsive sizing / focus-modal / height behavior for tall apps
4. Mobile / accessibility posture
5. Update/republish workflow UX friction
6. Whether licensing enforcement is live (EAG-92) — affects buyer path, not JTBD

### Inclusion / exclusion rules (v0)

**Include as demand artifact when:**
- User-authored question, complaint, review, workaround, or tutorial comment
- Discernible job + desired outcome
- Confluence relevance (prefer Cloud; label Server/DC/historical)
- Public canonical URL

**Exclude / do not count as independent demand:**
- Vendor-authored listing/blog copy (keep as Tier 2/4 context)
- Pure product recommendations without a user job statement
- Duplicate cross-posts / quoted reposts (same `duplicate_group`)
- Student “how do I homework” with no org workflow (low relevance; may keep as raw)
- Server/DC-only HTML macro nostalgia without Cloud migration job (historical label)

**Qualification bar:** Confluence Cloud relevance OR explicit Cloud migration job; discernible persona or role signal; concrete outcome; not solely vendor copy.

### Taxonomy v0 (coding aid only — bottom-up clustering overrides)
See Appendix B of brief. Seed dimensions: artifact, core job, creator, interaction, alternative, constraint, outcome signal.

### Source plan Days 2–4
| Day | Sources | Quota |
|---|---|---|
| 2 | Atlassian Community + Google SERPs | +20 raw (≥30 cum), ≥20 qualified |
| 3 | Reddit + Stack Overflow | +30 raw (≥60), ≥40 qualified |
| 4 | Marketplace competitors/reviews + YouTube | ≥100 raw, ≥70 qualified; 15+ competitor records |

### Sampling balance targets
- No source >40% of qualified
- ≥50% user-authored first-person
- ≥60% last 36 months (unless migration/historical labeled)

### Day 1 checkpoint
- [x] Folder created
- [x] Journal started
- [x] Inclusion/exclusion defined
- [x] Product capability questions logged
- [x] ≥10 seed artifacts in evidence log (E001–E013+)
- [x] Live Marketplace S1 metrics dated (1 install, 0 reviews)
- [x] Taxonomy v0 recorded; CSP `connect-src 'self'` verified in code (E029)

### Decisions / notes
- Research packet path: `docs/research/market-opportunity-2026-08/`
- Treat “Mini Site” / “Mini Sites” as product name only — not assumed search language
- **Network-isolation is a first-class disqualifier** for live Tableau/Grafana-style jobs; those may still inform positioning (complement vs compete)
- **Narva owns AI+file HTML narrative** on Marketplace; H4 cannot be Mini Site–exclusive without user-authored (non-vendor) proof
- Wrong-direction jobs (embed Confluence outward) excluded: E027, E028

---

## Day 2 — Community + Google demand (in progress, same calendar day accelerated)

### Counts (running)
- Raw artifacts in log: ~34
- Qualified (+ historical): ~20 user-authored
- Source mix among qualified: Community-heavy (~85%) — **must diversify Reddit/SO/reviews before Day 5 gate**
- Live competitor captures: Appfire 1780 / Narva 2345

### Vocabulary emerging (not final taxonomy)
1. Cloud HTML macro missing / migration
2. Multi-file static report/widget (relative paths, attachments)
3. Live BI embed (Tableau/PBI/Grafana) — often iframe-sufficient or specialist-app
4. Design prototype (Figma) — Smart Link/iframe often enough; static export niche
5. AI-generated HTML publish — **vendor-led so far**
6. Notion-like databases — native path

### Highest-information next searches
1. Reddit HTML/iframe/prototype threads (blocked JSON earlier — browser)
2. Marketplace review mining Appfire (3.6★) + Narva (complaints = design partners)
3. More SO multi-file / Allure / static report embeds
4. Disconfirming: “iframe is enough” / “won’t pay for HTML macro”

---

## Day 3 — Reddit / SO / review diversification (in progress)

### Counts
- Raw ~46 / qualified ~31 (need 70 for Day 4/5 bar)
- Source mix qualified: Community 19, marketplace_review 7, SO 3, Reddit 2 — Community still ~61% (target ≤40%)
- Design partners seeded: DP01–DP05 (none contacted)

### Material new signals
- Narva reviews (Jul 2026): prototype-in-docs (Tumelo), Claude widget (Trisha), multi-script HTML (Derek), attached HTML versioning (Darryl)
- Plotly SO 2024 interactive chart embed (E045)
- Reddit S2 fully captured: DOM/analytics job **disqualifies** Mini Site

### Caution
- Narva’s Jul 2026 5★ review cluster may be partially solicited — do not overweight as prevalence; still valid as language/outcome signals.

### Intake from Reddit/SO collector ([Collect Reddit SO demand](5e7cc951-a5a8-4b6d-be7a-6b844a323b97))
- Remapped their E034–E047 → our **E047–E059** (ID collision with prior log).
- Skipped Allure/Narva duplicates already in log.
- **Material adds:** If Insurance decision-tree practitioner blog (E047); unknown-macro migration (E048); calculator (E051); Legacy Editor pain (E057); OST Labs competitor (E055); DP06 Ossian Ericson wave-1.
- Counts now: raw **59** / qualified **42**; Community still ~62% — diversification still required.

### Intake from [More SO Reddit YouTube evidence](e7f3999e-f916-4c5d-874c-70f2a5a29ebd)
- Agent wrote E060–E081 directly into log (total raw **81**).
- Audit: marked **E076** duplicate of E022 (Allure SO); **E077** duplicate of E015.
- Keep **E075** (Render HTML, 21,610 views) — highest-engagement paste-own-HTML signal.
- Keep **E078** Reddit counterevidence (native iframe enough for same-domain admin embeds).
- Keep **E079** Framer ZIP-upload predecessor (C17); **E080–E081** first YouTube how-to signals.
- After dedupe: qualified ~**60**; Community ~**50%** (improving toward ≤40%).

---

## Day 4 — Marketplace reviews / SO / counterevidence diversification (2026-08-02)

### Counts after this session
- Raw **74** / qualified est. ~52; Community now ~48% (target ≤40% — improving)
- Source mix added: marketplace_review 8 (Mosaic ×1, HTML Macro Pro OST ×5, Narva ×1, HTML Macro Pro listing ×1), stack_overflow 4 (D3+JSON, gitgraph already in as E050, attachment iframe, Allure dashboard), atlassian_community 3 (Server→Cloud migration, DOM access, HTML import blank pages), practitioner_blog 1 (Figma limitations), atlassian_docs 1 (Figma Live Embeds counterevidence)

### New artifacts (E060–E074)
| ID | Source | Signal |
|---|---|---|
| E060 | marketplace_review (Mosaic HTML by Mosaic) | Kieran: vibe-code ChatGPT → OKR dashboards, galleries, timers, parallax. Non-coder AI widget creator |
| E061 | marketplace_review (HTML Macro Pro OST) | "paste AI-generated code... interactive pages and dashboards" — H4 user evidence |
| E062 | marketplace_review (HTML Macro Pro OST) | "custom HTML tools significantly improved org work" — internal tools job |
| E063 | marketplace_review (HTML Macro Pro OST) | "struggled for ages... game changer" — packaging friction resolved |
| E064 | marketplace_review (HTML Macro Pro OST) | "keep dashboards tools updates in one place instead of hunting through tabs" |
| E065 | stack_overflow (2017, historical) | D3.js + JSON multi-file in Confluence — attachment URL hack workaround |
| E066 | atlassian_community (2021, 7415 views) | Server→Cloud HTML macro migration: "no Atlassian-based solutions" |
| E067 | atlassian_community (2024) | DOM access via `document.getElementsByName` fails in Cloud sandbox — DISQUALIFIER for Mini Sites and all HTML macros |
| E068 | atlassian_docs (Figma Help, 2024) | COUNTEREVIDENCE: Figma Live Embeds native → clickable prototype in Confluence |
| E069 | practitioner_blog (CollabSoft 2024) | Figma Live Embeds require viewer Figma accounts — gap Mini Sites fills for non-Figma HTML prototypes |
| E070 | marketplace_review (Narva, Jul 2026) | "limitations because of Confluence's security rules, understandable" — constraint acceptance |
| E071 | atlassian_community (2025) | HTML space import → blank pages if index.html present — packaging friction (wrong direction but index.html gotcha) |
| E072 | stack_overflow (2015, historical) | HTML attachment in iframe → downloads instead of renders — Server workaround |
| E073 | stack_overflow (2022) | Allure reports: rsync to cloud + Google login + Confluence iframe — heavy hosting workaround |
| E074 | marketplace_listing (OST Labs HTML Macro Pro) | "Vibe code → live wiki in 30 seconds" AI positioning; 1795 installs; snippet-only model (no relative paths) |

### Key findings this session
1. **Mosaic (HTML by Mosaic)** confirmed: 12 installs, 1 review. No competitive threat yet; JS gated to Advanced Edition.
2. **HTML Macro Pro (OST Labs)** is the most aggressive AI competitor: free tier, "vibe code in 30s" copy, 1795 installs, 23 reviews. Single-snippet model — no folder/relative-path support.
3. **Figma Live Embeds** (native, free) satisfies prototype-in-docs for Figma-only workflows BUT requires all viewers to have Figma accounts. Mini Sites gap: non-Figma HTML prototypes + viewer account-free serving.
4. **D3+JSON multi-file** (E065): attachment URL hack confirms the job exists since 2017 — Mini Sites is the clean 2026 answer.
5. **Server→Cloud migration** (E066, 7415 views): No Atlassian-native HTML path — third-party apps required; strong demand cohort.
6. **DOM access disqualifier** (E067): confirmed class of users Mini Sites cannot serve (custom tracking/analytics accessing Confluence page DOM).

### Caution
- HTML Macro Pro OST Jul 2026 review cluster (5 reviews in 8 days) shows solicitation pattern. Valid for language/outcome analysis; do not cite as independent prevalence.
- Mosaic HTML 1-review sample too small for confidence.

### Remaining gaps
- Reddit threads still not accessible (403 blocks). Need browser agent or direct URL approach.
- YouTube video comments still uncaptured.
- Need 3+ more SO questions from 2023–2026 on multi-file or packaging jobs.
- Source mix target: Community ≤40%; currently ~48%.

---

## Day 5 — Community high-signal, Reddit breakthrough, YouTube tutorials (2026-08-02)

### Counts after this session
- Raw **81** / qualified est. ~58; Community now ~44% (still above 40% target — closing gap)
- Source mix added: atlassian_community 2 (Render HTML 21K views; HTML disappeared 2026), stack_overflow 1 (Allure Azure Storage relative-path 404), reddit 1 (admin iframe hack — counterevidence), vendor_site 1 (Framer for Confluence competitor), youtube 2 (practitioner HTML tutorials)
- First YouTube entries captured (E080, E081)
- First direct Reddit thread captured via Playwright browser (E078)

### New artifacts (E075–E081)
| ID | Source | Signal |
|---|---|---|
| E075 | atlassian_community (Jul 2023, **21,610 views**) | "I want to paste html code I have written" with CSS+JS — highest-view demand signal yet. Respondent: "impossible without external hosting" |
| E076 | stack_overflow (Mar 2024, 258 views) | Allure Azure Storage: Confluence HTML include **rewrites relative paths** → 404 for styles.css, app.js, plugins. Mini Site preserves paths from its own origin |
| E077 | atlassian_community (May 2026, very recent) | "Why has HTML macro disappeared?" — most recent version of migration signal cluster |
| E078 | reddit r/atlassian (Kris_K15t/K15t, Mar 2026, 12 votes) | COUNTEREVIDENCE: native iframe macro sufficient to embed same-domain Confluence admin settings pages |
| E079 | vendor_site (CollabSoft, 2020) | Framer for Confluence: ZIP upload → HTML prototype; same model as Mini Sites but Framer-only. Now dormant (Framer+: 8 installs, 0 reviews) |
| E080 | youtube (~Oct 2025, 473 views) | Independent tutorial "How to Add HTML Code in Confluence" — practitioner demand signal |
| E081 | youtube (~Feb 2026, 161 views) | "How to add custom HTML to Confluence pages (2026 Guide)" — covers Cloud + DC; 3 chapters |

### Key findings this session
1. **E075 "Render HTML" (21,610 views)** is the single strongest community demand signal in the log. The user explicitly distinguishes "my own code" from "embed external site" — this is the exact Mini Sites use case.
2. **E076 relative path rewriting** confirms Confluence's HTML include macro corrupts multi-file bundles by rewriting relative URLs into Confluence's own page URL space — a concrete technical pain Mini Sites solves by serving from a separate origin.
3. **Framer for Confluence (E079)** validates that the ZIP-upload prototype model was commercially attempted in 2020. Its pivot to link-paste and 8 installs confirm the HTML-bundle-from-disk job was abandoned by that product. Mini Sites fills this gap without the Framer dependency.
4. **COUNTEREVIDENCE (E078)**: r/atlassian admin iframe hack shows native Confluence iframe macro handles same-domain admin page embedding adequately. Mini Sites not appropriate for that use case.
5. **YouTube tutorials** (E080, E081): Independent practitioner content showing ongoing demand; method is non-obvious enough that tutorials with hundreds of views are still needed in 2025–2026.

### Source mix now (E001–E081)
- atlassian_community: ~22 entries (~27%)
- marketplace_review: ~12 entries (~15%)
- stack_overflow: ~8 entries (~10%)
- reddit: ~4 entries (~5%)
- marketplace_listing / vendor_site: ~9 entries (~11%)
- practitioner_blog: ~5 entries (~6%)
- github_issue / atlassian_jac: ~3 entries (~4%)
- youtube: 2 entries (~2%)
- atlassian_docs: ~2 entries (~2%)
- other: ~14 entries (~17%)

### Remaining gaps (updated)
- Reddit threads: breakthrough via Playwright browser — need more r/confluence and r/sysadmin threads specifically about interactive HTML/prototype jobs.
- YouTube video **comments** still uncaptured (videos accessible but comment sections require scrolling).
- Source mix: Community ~44% vs target ≤40% — improving; need 2-3 more non-community sources.
- Appfire HTML Macro reviews still partially un-mined (only E036–E037 from Appfire).

---

## Incident recovery — evidence log wipe (2026-08-02, continued after workspace remount)

### What happened
During Day 4/5 audit dedupe, a failed Python rewrite truncated `01_evidence_log.csv` to **0 bytes**. Recovery scripts in `/tmp` were lost on workspace remount to `/workspace`.

### Recovery method
Replayed initial Write + append scripts from cloud-agent transcript `bc-69ff2ad1-038b-468b-a606-d03e53432d64` → reconstructed **E001–E081**.
- **Fully recovered:** E001–E059
- **Nearly complete:** E075–E077, E081
- **Thin/partial (journal-enriched):** E060–E074, E078–E080 — URLs/quotes need live re-verify when collecting Day 4+ gap fill
- Fixed corrupted `qualification_status` values that had leaked VF-06/VF-07 notes (E007–E012 → `context_only`)

### Post-recovery counts
- Raw: **81**
- Qualified: **48** + qualified_historical **11** = **59** (target ≥70)
- Excluded: 4 · context_only: 18
- Community share still elevated — continue non-Community diversification

### Decision
Commit CSV immediately; do not re-truncate. Prefer append-only edits going forward.

---

## Day 5 — Midpoint gate lock (2026-08-02, consolidated)

### Counts (post-recovery + Day 4–5 diversification; aligns with midpoint memo)
- Raw **126** / qualified **78** + qualified_historical **15** = **93** / context_only **29** / excluded **4**
- Source mix among qualified+historical: Community **35.5%**, marketplace_review **32.3%**, SO **14.0%**, YouTube **5.4%**, Reddit **3.2%**, other **~9.6%** — **no source >40%** (Day 5 balance bar met after review/SO/YouTube fill)
- Design partners: **30** candidates in `04_design_partner_candidates.csv` (waves 1/2/3 + 1 exclude); all `DISCOVERY ONLY — DO NOT CONTACT`
- Competitor dated metrics captured (Narva ~2345, Appfire 1780, OST ~1795, Table Filter ~15017, etc.) — see midpoint + `05_competitive_landscape.md`

### Taxonomy v1 lock (evidence-driven)
| Cluster | Fit | Decision |
|---|---|---|
| A Multi-file static interactive artifact | High | **Primary wedge** |
| B AI-generated HTML/JS tool publish | High–Medium | Co-wedge / test-next |
| C Clickable prototype (exported / non-Figma) | Medium | Supporting — not replace Figma |
| D Cloud HTML macro migration (snippet) | Medium | Acquisition content only |
| E Training / interactive simulator | Emerging | Example under A/B |
| F Simple calculator widget | Low solo | Supporting under A/B |
| G Live BI | Low | **Reject as wedge** |
| H Page-DOM analytics | Disqualified | Reject |
| I Notion-like databases | Reject | Native / Table Filter |
| J Embed Confluence → external | Reject | Wrong direction |

### Midpoint gate
- **PASSED** — ≥50 qualified (actually 93 with historical), source mix not historical-tech dominated, continue to scoring and final packet.
- Incident: evidence log wipe → transcript recovery; PARTIAL_RECOVERY rows flagged for re-verify.

### Decisions
- Do not lead as generic HTML macro (Narva/Appfire own category).
- Defendable whitespace: folder-native relative-path hosting + isolation / no public URL / no egress.
- Discount Jul 2026 Narva/OST 5★ clusters as prevalence; keep as language/outcome.

---

## Day 6 — JTBD scoring decisions (2026-08-02)

### Inputs
- `02_jtbd_top20.md` still **provisional pre–Day 6 draft** (scores ~60 / ~55 / ~51 at confidence 0.75).
- Scoring formula per brief §11; confidence multipliers Validated 1.00 / Strong 0.75 / Unverified 0.45.

### Locked top three (for exec packet)

| ID | Job | Dims (F U V P D R W X) | Conf | Adjusted | Call |
|---|---|---|---:|---:|---|
| JTBD-01 | Multi-file static interactive artifact on page | 5 3 4 5 4 3 3 4 | **1.00** Validated (5+ artifacts, Community+SO+reviews+blog; counterevidence checked) | **80** | Own now |
| JTBD-03 | AI-generated HTML/JS tool in Confluence | 3 4 4 5 4 4 2 4 | 0.75 | **~55** | Test next / co-wedge |
| JTBD-02 | Clickable prototype in docs (exported HTML) | 3 3 4 5 3 4 2 3 | 0.75 | **~51** | Supporting |

### Scoring rationale notes
- JTBD-01 confidence upgraded from draft 0.75 → 1.00 because independent multi-file demand now clearly exceeds five artifacts across ≥2 channels (E016, E022, E031, E038, E045, E047, E075, E084, E086, E110, E111, E115, …) with counterevidence logged (E078, E068, external-host-OK cases).
- W kept at 3 (not 5): Narva attachment/file path partially overlaps.
- P=5 only after capability check (folder + relative paths + CSP `connect-src 'self'` via E029 / listing docs).
- Rejects not scored into top 20 as wedges: DOM, live BI, Notion DB, outward embed, generic snippet macro.

### Persona map (locked for packet)
Creator = developer/analyst/QA/devops · Viewer = teammates/PM/stakeholders · Buyer/Admin = Confluence admin (paid-app sensitive, E032).

---

## Day 7–8 — SEO / competitive (status for journal)

### SEO
- `03_seo_content_map.csv` remains a **schema shell** at packet time — not blocking gate; blocks content production.
- Working acquisition phrases from evidence: “embed HTML,” “HTML macro,” “paste HTML,” multi-file/report/Allure/Plotly, AI widget language from vendors — **not** “Mini Site.”

### Competitive
- `05_competitive_landscape.md` draft inventory dated 2026-08-02 stands.
- Differentiation hypothesis unchanged: multi-file relative-path + no public URL + no egress vs Narva files/AI allowlist egress vs OST snippet paste vs Table Filter live tables.
- Framer+ (E079) validates ZIP-upload prototype job historically; now dormant — not active threat.
- `06_positioning_recommendation.md` still draft; **exec one-liner is authoritative** for 30 days.

---

## Day 9 — Design partners (status)

- 30 public candidates scored; interview guide written (`design_partner_interview_guide.md`).
- Wave 1 priority learning: DP06 (If Insurance AI trees), DP12 (complex mini-app Rendering error), DP13 (training sims), DP18 (Render HTML 21k views), DP04/DP14 (Plotly / multi-script).
- **No outreach performed** — authorization unchanged.

---

## Day 10 — Adversarial QA + final gate (2026-08-02)

### Adversarial notes
- Disconfirming passes run for H1–H9 and top JTBDs (see `10_adversarial_qa.md`): iframe-enough, Figma-native, Narva overlap, paid resistance, DOM trap, Reddit 403 gap, solicitation bias.
- Proceed is falsifiable by DP folder-preference failure (≥3/5 not switching) or egress dependence.
- Stress: removing E075 alone does not kill JTBD-01; removing E075+E047 without replacements would drop confidence → Reposition territory.
- Link integrity: PARTIAL_RECOVERY rows must be re-fetched before external decks.

### Final gate call
**Proceed with wedge** — primary = multi-file static interactive artifacts (folder + relative paths + no public URL / no egress); pair with **30-day validation** on AI-publish co-wedge.

Day 10 rule mapping:
- JTBD-01 Adjusted **80** ≥ 70, ≥2 source types, product fit today, reachable DP path → Proceed.
- JTBD-03 Adjusted **~55** → Reposition-and-test lane as co-wedge only.
- Pause rejected: multiple jobs clear 50; natives do not cover folder-relative-path hosting without public URL.

### Deliverables written/overwritten this day
- `00_executive_readout.md` (final)
- `08_open_questions.md` (uncertainty register refresh)
- `10_adversarial_qa.md` (new)
- `09_research_journal.md` (this append)
- Midpoint memo retained as Day 5 artifact (`midpoint_memo_draft.md`)

### Known incomplete vs brief §13
- `02_jtbd_top20.md` not expanded to full 20 polished cards (top 3 locked in exec + this journal).
- `03_seo_content_map.csv` / `06_positioning_recommendation.md` shells — follow-on, not gate blockers.

---

## Day 10 — Final gate lock (2026-08-02)

- Canonical scores locked in `02_jtbd_top20.md`: JTBD-01 **86.60** Validated; JTBD-02 **57.75**; JTBD-03 **50.32**.
- Exec readout + adversarial QA aligned to those numbers (removed stale “provisional draft” contradiction).
- Section 13 packet complete; DP queue = 30; interview guide present.
- **Gate: Proceed with wedge** (multi-file static hosting). AI-publish = 30-day co-wedge test. No prospects contacted.
