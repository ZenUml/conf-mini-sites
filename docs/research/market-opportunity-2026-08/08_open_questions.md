# Open questions / uncertainty register

**Updated:** 2026-08-02 (Day 10 packet)  
**Rule:** Unverified ideas stay here — they do not inflate validated JTBD counts.

| ID | Question | Why it matters | Cheapest next test | Status |
|---|---|---|---|---|
| Q1 | Do high-intent HTML embedders require **host-page DOM**, or is an isolated interactive bundle enough? | Gates technical wedge vs disqualifier class | Already partially answered: DOM seekers are a **distinct reject segment** (E002, E040, E067, E094). Count self-contained vs DOM language in next 10 Community/SO hits | **Mostly closed** — isolate as reject; keep monitoring share of DOM asks in acquisition channels |
| Q2 | Is “publish AI-generated HTML tool to Confluence” a real user job or vendor fantasy (H4)? | Co-wedge vs supporting example | 3 non-vendor artifacts outside Jul-2026 review clusters **or** 2 DP interviews (DP06, DP11/DP12) with pass if they describe recurring AI→Confluence publish | **Strong hypothesis** — E042, E047 production blog, E095–E097; still need independent recurrence beyond solicited reviews |
| Q3 | Live Marketplace metrics drift for Mini Sites + HTML-macro competitors | Competitive W scores; buyer perception | Recheck installs/rating/price dated before any external readout refresh (E001, C02–C03, E074, E098–E102) | **Open** — 2026-08-02 snapshot locked; recheck on next packet |
| Q4 | Exact production CSP / sandbox / same-origin asset fetch behavior | Ceiling on P scores; marketing limits copy | Code: E029 (`connect-src 'self'`). Spot-check served headers on **dev** only (read-only). Confirm relative `fetch()` to bundle assets | **Mostly closed** for outbound deny; open for edge cases (fonts, workers, blob URLs) |
| Q5 | Willingness to pay vs free iframe / native / corp addon bans | H8; buyer path for paid app with 1 install | Mine E032-class threads + DP security questions; threshold: ≥2/5 wave-1 DPs say paid OK if isolation/folder value clear | **Open** — paid resistance evidenced (E032); magnitude unknown |
| Q6 | Which outcome language wins SERPs: dashboard vs HTML macro vs internal tool vs prototype vs multi-file/report | Content architecture; avoid Narva head-on | Day-7 style SERP captures for top phrases from E075/E022/E047; map to `03_seo_content_map.csv` | **Open** — SEO map file still empty shell |
| Q7 | Are Community “interactive database” seekers satisfied by Confluence databases / Table Filter now? | Avoid Notion-parity distraction | Recency check on E004/E026-class threads + Table Filter metrics (E101) | **Mostly closed as reject wedge**; monitor only |
| Q8 | Does **folder upload** beat Narva **attachment/file** model enough to switch? | Highest-risk Proceed assumption | 5 DP interviews Action 1 (exec readout); pass ≥3 prefer folder+no public URL | **Open** — critical 30-day falsifier |
| Q9 | How often do AI/export bundles **require CDN/egress** (and thus fail Mini Sites CSP)? | Activation failure mode; support load | Inspect 10 public ChatGPT/Claude HTML samples + DP artifacts for external script/font URLs; estimate % self-contained | **Open** |
| Q10 | Update/republish UX friction vs attachment versioning (E044) | Retention after first publish | DP cadence questions + one internal republish spot-check on dev | **Open** |
| Q11 | Responsive height / auto-resize bar vs Appfire complaints | H7 packaging; churn | Reproduce E036-class sizing on Mini Sites; fix or document | **Open** |
| Q12 | Reddit / informal admin channel under-sample (403) | May miss “iframe is enough” or paid-rejection intensity | Browser capture ≥5 threads; record exhaustion if still blocked (E121, E129) | **Open** — known gap |
| Q13 | Partial recovery rows (E060–E074, E078–E080 thin fields) — do quotes/URLs still match live pages? | Audit integrity of Jul-2026 AI/review cluster | Re-fetch canonical URLs for PARTIAL_RECOVERY IDs; refresh verbatim excerpts | **Open** — flagged in adversarial QA |
| Q14 | Licensing enforcement (EAG-92) effect on buyer path | Paid conversion, not JTBD existence | Product/ops check outside this research packet | **Out of scope / open** |
| Q15 | ISV / API publish path (E016, E115) — macro enough or need programmatic publish? | Adjacent wedge vs distraction | One interview with DP05-class / automation authors; defer build unless ≥2 ask for API | **Monitor** |

## Capability unknowns (product)

| Topic | Implication | Next check |
|---|---|---|
| Same-origin relative `fetch` / ES modules inside sandbox | Multi-file SPA reports (Allure, Plotly) | Dev spot-check |
| Max practical bundle UX at 50 MiB / 2000 files | Large CI reports | Limits page + one large fixture |
| Mobile / a11y of nested iframe mini-sites | Viewer persona quality | Manual check on one demo page |
| Focus/modal/scroll inside iframe | Training sims / tools (E096, E097) | DP repro |

## Missing data (research)

- YouTube **comment** mining still thin (videos E080, E081, E104, E106 captured; comments not).
- Appfire negative-review depth improved (E082–E086) but older Server reviews remain historical-labeled.
- `03_seo_content_map.csv` and `06_positioning_recommendation.md` not fully populated — exec one-liner is authoritative for 30 days; finish SEO map before content production.
- No prospect contact performed (by design).

## Cheapest tests ranked

1. Five wave-1 DP interviews (Q8, Q5, Q2, Q10) — **highest information per hour**  
2. One Allure/Plotly folder demo on lite-dev (Q4 edge cases, Q11)  
3. Re-verify PARTIAL_RECOVERY URLs (Q13)  
4. Browser Reddit capture (Q12)  
5. SERP pass for multi-file / embed HTML / AI tool phrases (Q6)
