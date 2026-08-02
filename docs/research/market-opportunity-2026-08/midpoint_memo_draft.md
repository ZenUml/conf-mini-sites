# Midpoint memo — Day 5 gate (2026-08-02)

**Status:** Gate **PASSED** — continue to JTBD scoring and final packet.  
**Counts after dedupe:** **126 raw** / **93 qualified+historical** (48+11 early; grown via Day 4) / 29 context_only / 4 excluded.  
**Source mix (qualified+historical):** Community **35.5%**, marketplace_review **32.3%**, Stack Overflow **14.0%**, YouTube **5.4%**, Reddit **3.2%**, other **~10%**. No single source >40%.

## Product truth (locked)
- Multi-file static HTML/CSS/JS folder upload; relative paths preserved; Forge page permissions; secret scan; per-instance isolation.
- CSP `connect-src 'self'` → **no outbound network** from sandbox (code + listing).
- Live Marketplace (2026-08-02): Mini Sites **1 install, 0 reviews**, v4.0.0; title “Embed HTML & Prototypes”.

## Competitor snapshot (dated 2026-08-02)
| App | Installs | Rating | Role |
|---|---:|---|---|
| Narva HTML Macro | ~2,345–2,348 | 5★ / 31 | Closest rival: files/attachments + AI copy + allowlist egress |
| Appfire HTML Macro Cloud | 1,780 | 3.6★ / 36 | Snippet/JS; Cloud Fortified; iframe/DOM complaints |
| HTML Macro Pro (OST Labs) | ~1,795 | — / ~23 | Aggressive “vibe code” paste; **no relative-path folders** |
| Table Filter & Charts | ~15,000 | 4.9★ / 442 | Owns live table/report job |
| Dashboard Hub | 371 | 5★ / 10 | Jira→Confluence dashboards |
| Tableau for Confluence | ~226–227 | 4.4★ / 6 | Live BI |
| GrafanaSight | 3 | — | Niche |
| Mosaic HTML | 12 | — | AI prompt; JS gated |
| HTML Macro Plus | 5 | 5★ / 1 | Live preview editor |
| Framer+ (CollabSoft) | ~8 | 0 | Historical ZIP-upload prototype model; dormant |

**Implication:** No empty “HTML macro” category. Defendable whitespace ≈ **folder-native relative-path hosting + isolation / no public URL / no egress**, for artifacts that are already multi-file (reports, tools, exports, AI apps)—not generic snippet paste.

## Taxonomy v1 (evidence-driven)
| Cluster | Fit today | Direction |
|---|---|---|
| A. Multi-file static interactive artifact (reports, widgets, tools, Allure/Plotly/D3 folders) | **High** | **Primary wedge** |
| B. AI-generated HTML/JS tool publish (Claude/ChatGPT → page) | **High–Medium** | Co-wedge / test-next |
| C. Clickable prototype in docs (exported HTML / non-Figma) | Medium | Supporting scenario; not “replace Figma” |
| D. Cloud HTML macro migration (snippet) | Medium | Crowded; acquire via migration content, don’t lead category |
| E. Training / interactive simulator | Emerging | Example under A/B (E096/E097) |
| F. Simple calculator / formula widget | Low as solo | Supporting example |
| G. Live BI (Tableau/PBI/Grafana) | **Low / reject as wedge** | Needs egress/auth; specialists |
| H. Page-DOM analytics / host DOM | **Disqualified** | iframe isolation |
| I. Notion-like databases | Reject | Native / Table Filter |
| J. Embed Confluence → external | Reject | Wrong direction |

## Hypotheses (Day 5 status)
| ID | Status | Notes |
|---|---|---|
| H1 | **Strong / leaning validated** | Users say HTML macro / embed / report / local HTML — not “Mini Site” |
| H2 | **Strong** | Multi-file + AI-tool clusters beat generic container |
| H3 | Partial | Technical intent converts, but DOM seekers are a trap (E002/E040/E067) |
| H4 | **Strong hypothesis** | User reviews + If Insurance blog (E047) + Claude mockups (E095); discount Jul 2026 solicitation clusters |
| H5 | Strong | Creator ≠ viewer repeatedly |
| H6 | Plausible | Isolation valued; Narva also Forge/RoA — differentiate no-public-URL + folder |
| H7 | **Validated pattern** | Path rewrite (E022/E076), attachment download (E072/E110), paste Rendering error (E096), resize (E036) |
| H8 | Hypothesis | Hosting/Forge replacement language present; paid-app resistance also present (E032) |
| H9 | **Validated** | DOM + live API jobs disqualify |
| H10–H12 | Proceed to Days 7–9 | Use-case content + demos + DP queue (30 candidates ready) |

## Go / no-go branches
- **Continue:** A multi-file; B AI publish; C exported prototype; migration SEO as acquisition.
- **Pause as launch wedge:** live BI, host-DOM analytics, Notion DBs, Confluence→external embed, generic “HTML macro #4”.
- **Incident note:** Evidence log was wiped to 0 bytes mid-sprint; recovered from transcript (E001–E081) then expanded. Prefer append-only edits.

## Day 6+ plan
Score top 20 JTBD; lock three wedges; SEO map; competitive maps + positioning; DP interview guide (done); adversarial QA; executive Proceed / Reposition / Pause.
