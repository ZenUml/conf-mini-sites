# Adversarial QA — Day 10

**Purpose:** Disconfirm the Proceed recommendation; sanity-check scores; document link/recovery integrity; accept against brief Section 13.

**Gate under test:** Proceed with primary wedge = multi-file static interactive artifacts (folder + relative paths + no public URL); AI-publish as 30-day co-wedge validation.

---

## 1. Disconfirming searches performed

| Target hypothesis / JTBD | Disconfirming query / inspection | Result | Implication |
|---|---|---|---|
| H1 — Users search “HTML macro / embed,” not “Mini Site” | Community + YouTube how-tos (E075, E080, E081, E104, E106); Marketplace competitor titles | Confirmed — acquisition language is HTML/embed/macro | Proceed OK; naming/SEO must not lead with “Mini Site” alone |
| H2 — Multi-file cluster beats generic container | Search for single-snippet satisfaction; Narva/OST install scale | Snippet macros have large install bases (C02/C03/E074) — **category not empty** | Proceed only with **folder-native** differentiation, not “HTML macro whitespace” |
| H3 — Technical intent converts | DOM / analytics threads (E002, E040, E067, E094) | Large trap segment wants host-page DOM | Do not market to DOM seekers; filter in content |
| H4 — AI publish is real | Vendor listings vs practitioner sources; Jul 2026 review timing | E047 independent production blog supports; Jul 2026 Narva/OST clusters look solicited | Co-wedge = **test**, not primary launch claim |
| H6 — Isolation / no public URL valued | “iframe is enough” / admin iframe hack (E078, E122); external host patterns (E022, E073) | Native iframe **is** enough for same-domain/admin and many external embeds | Whitespace is multi-file **without** public URL — not all embeds |
| H7 — Packaging friction | Appfire resize/complex (E036, E084); OST Rendering error (E096); path rewrite (E022) | Validated pain | Must win on publish UX or Proceed fails in market |
| H8 — Willing to pay | Paid rejection (E032); Mini Sites 1 install (E001) | Material buyer risk | Trust/limits + DP willingness questions required |
| H9 — DOM + live API disqualify | CSP code (E029); live BI threads (E017–E025) | Validated reject | Correctly excluded from wedge |
| JTBD-02 Figma | Figma Live Embeds docs (E068); account gap (E069) | Native often wins for Figma-only | Supporting scenario only |
| JTBD-01 vs attachment model | Narva file/attachment reviews (E043, E044, E070) | Narva partially covers files | Folder-relative-path + no-egress still thinner — **must prove switch in DPs** |
| Reddit informal counterevidence | r/atlassian, r/sysadmin search | **403 blocked** (E121, E129); partial Community mirror for admin iframe (E078) | Residual unknown; do not pretend Reddit was fully sampled |

---

## 2. What would falsify the recommendation

| Falsifier | Threshold | If true → |
|---|---|---|
| Design partners prefer Narva paste/attachment or external host over folder+isolation | ≥3/5 wave-1 say folder not worth switching | **Reposition** (message) or **Pause** wedge |
| Majority of “multi-file” demand actually needs allowlisted egress / live data | ≥3/5 DPs blocked by `connect-src 'self'` | Reposition to different artifact class or Pause |
| AI co-wedge collapses to vendor fantasy | 30-day search finds no new independent non-vendor artifacts **and** DPs only use single-file paste | Demote JTBD-02 to supporting example (Proceed on JTBD-01 can still hold) |
| Paid-app ban / procurement blocks installs | Wave-1 buyers uniformly refuse paid HTML apps with no trust path | Pause go-to-market; revisit packaging as free tier / Fortified narrative |
| Score integrity | Removing E075 + E047 drops JTBD-01 below Adjusted 50 with no replacements | Pause — recommendation over-fit to two artifacts |
| Competitor ships true folder-relative-path + no-public-URL hosting | Narva/OST/Mosaic launch equivalent | Reposition on trust, update UX, or niche vertical (training sims / CI reports) |

**Stress test:** Remove highest-engagement Community post (E075, 21,610 views) — remaining SO multi-file cluster (E022, E045, E065, E073, E111, E115) + Appfire help-system/QA reports (E085, E086) + E047 still support JTBD-01 ≥ Strong hypothesis. Confidence might fall from 1.00 → 0.75 (Adjusted ~60) → gate would become **Reposition and test**. Proceed is **sensitive to continued multi-source multi-file evidence**, not to E075 alone.

---

## 3. Score sanity checks

| Check | Result |
|---|---|
| Brief formula applied | Yes — Raw = 20 × weighted dims; Adjusted = Raw × confidence |
| JTBD-01 P≤5 only after capability check | P=5 justified: folder upload + relative paths documented (L1–L3, E001); CSP deny documented (E029). Edge cases (resize, large bundles) do not drop below “works today” |
| No top-3 without ≥2 source types | JTBD-01: Community + SO + reviews + blog ✓ · JTBD-02: reviews + blog ✓ · JTBD-03: Community + docs ✓ |
| Confidence multipliers used consistently | Validated 1.00 / Strong 0.75 / Unverified 0.45 — JTBD-02/03 held at 0.75 despite vendor noise |
| `02_jtbd_top20.md` vs exec scores | **Aligned** — JTBD-01 **86.60** (Validated) / JTBD-02 **57.75** / JTBD-03 **50.32**. Stress: dropping E075 alone → may fall to Strong hyp. ~0.75 (Adjusted ~65) → Reposition; multi-source cluster still holds |
| Disqualifiers not averaged away | DOM/live BI/Notion/outward-embed split into reject table — not blended into JTBD-01 |
| W (whitespace) not overstated | W≈3.8 for JTBD-01 (Narva file overlap acknowledged); AI/prototype lower W — no W=5 fantasy |
| Historical labeled | qualified_historical used (e.g. E065, E085, E086, E111); not counted as Cloud-only prevalence |

---

## 4. Link integrity & partial recovery

### Incident
Evidence log truncated to 0 bytes mid-sprint; reconstructed from cloud-agent transcript (see journal). Prefer append-only edits going forward.

### Recovery classes

| Class | IDs | Integrity note |
|---|---|---|
| Fully recovered | E001–E059 (approx.) | Prefer these for hard claims |
| Partially full recovery | E075, E081 | Core fields present; spot-check live URL before external citation |
| Thin / PARTIAL_RECOVERY | E060–E074, E078–E080, E074 listing | Journal-enriched; **re-fetch before using as sole support for a score dimension** |
| Duplicate excluded | E076 (=E022), E077 (=E015) | Do not double-count frequency |
| URL enriched / corrected | E067, E068, E071, E078, E079 | Use enriched canonical URLs in bibliography |
| Access blocked | E121, E129 (Reddit 403) | Gap recorded; not silent |

### Citation hygiene for Proceed claims
- Multi-file path pain: prefer **E022, E031, E038, E045, E110** over thin PARTIAL rows.
- AI co-wedge: lead with **E047**; treat E060–E064, E095–E097 as language signals with solicitation discount.
- Competitor installs: dated 2026-08-02 captures in midpoint / E001 / E098–E102 — recheck before press/board decks.

---

## 5. Acceptance checklist vs brief Section 13

| Criterion | Status |
|---|---|
| Every factual claim in exec readout has evidence IDs | **Pass** — claims ID-tagged |
| Evidence IDs resolve to canonical URLs (or documented local/code URI) | **Pass with notes** — PARTIAL_RECOVERY and Reddit 403 rows flagged; E029 is `file://` code reference |
| Three evidence statuses used; unverified excluded from validated counts | **Pass** — JTBD-01 Validated; JTBD-02/03 Strong; rejects explicit |
| Top jobs bottom-up (not listing example list) | **Pass** — taxonomy from evidence; listing examples treated as vendor claims |
| ≥1 disconfirming search per top hypotheses / top JTBDs | **Pass** — Section 1 table |
| Cloud / DC / Server separated; historical labeled | **Pass** |
| Competitor metrics dated; not equated to paid actives | **Pass** — “installs” as Marketplace metric only |
| Design partner file: no sensitive PII beyond public handles; **no contact** | **Pass** — 30 candidates, all DISCOVERY ONLY |
| Exec readout states what **not** to pursue and what remains unknown | **Pass** — plus `08_open_questions.md` |
| Reviewer can reproduce recommendation from evidence log | **Pass** — evidence log + `02_jtbd_top20.md` scoreboard + this QA |
| Complete Section 13 folder files present | **Pass** — `00`–`09` plus midpoint memo, interview guide, `10_adversarial_qa.md` |
| Explicit 30-day next step with thresholds | **Pass** — in `00_executive_readout.md` |

---

## 6. Final adversarial verdict

**Proceed with wedge stands**, contingent on:
1. Messaging stays on **multi-file / relative paths / no public URL** — not generic HTML macro.
2. 30-day DP folder-preference test is executed (falsifier armed).
3. AI-publish remains a **validation track**, not the primary Marketplace promise until Q2 closes.
4. PARTIAL_RECOVERY rows are re-verified before any external narrative beyond this packet.

If DP Action 1 fails or multi-file evidence were reduced to Community-only anecdotes, flip to **Reposition and test** without waiting for a full new research sprint.
