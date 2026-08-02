# Competitive landscape — Day 8 full (capture date 2026-08-02)

**Scope:** Confluence Cloud alternatives a buyer can use instead of Mini Sites.  
**Rule:** Marketplace **installs / ratings / review counts are dated signals**, not paid active-user counts.  
**Subject product:** Mini Sites (Embed HTML & Prototypes) — **1 install, 0 reviews**, v4.0.0, Paid via Atlassian (E001).

---

## 1. Competitor classes

| Class | What buyers compare | Mini Site implication |
|---|---|---|
| **A. Direct capability apps** | How HTML/JS is supplied, hosted, sandboxed, updated, governed, priced | Must differentiate input model + trust, not “another HTML macro” |
| **B. Outcome-specific apps** | Dashboards, reports, observability, tables | Avoid head-on live-data; complement static interactive artifacts |
| **C. Native / adjacent Confluence** | iframe, Smart Links, Databases, Figma embeds, Analytics | Define when native is good enough |
| **D. Build or host alternatives** | Forge, external static hosting, CodePen/GH Pages, links | Compete on governance + context, not raw flexibility |

---

## 2. Inventory (15+ alternatives)

| ID | Product / alternative | Class | Dated metrics / notes (2026-08-02 unless noted) | Evidence |
|---|---|---|---|---|
| C01 | **Mini Sites** (P&D VISION) | Subject | 1 install; 0 reviews; v4.0.0 (26 Jul 2026); folder upload; `connect-src 'self'`; no outbound network | E001, E013, E029 |
| C02 | **HTML Macro for Confluence Cloud** (Appfire) | A Direct | **1,780** installs; **3.6★ / 36** reviews; Cloud Fortified; Bug Bounty; v8.0.0 (15 Jul 2026); snippet HTML/JS + site embeds | E007, E035–E037, E082–E083, E123 |
| C03 | **HTML Macro for Confluence** (Narva) | A Direct | **~2,345–2,348** installs; **5★ / 31** reviews; Cloud Fortified; SOC 2; Forge/RoA; v3.12.0 (31 Jul 2026); **files/attachments + AI (ChatGPT/Claude) + domain allowlist egress**; DC→Cloud migration messaging | E008, E034, E041–E044, E070, E095–E097 |
| C04 | **HTML Macro Pro** (OST Labs) | A Direct | **~1,795** installs; ~23 reviews; free tier; “vibe code → live wiki in 30s”; **snippet paste, no relative-path folders** | E055, E061–E064, E074 |
| C05 | **HTML by Mosaic** (Kolekti / Adaptavist family) | A Direct | **12** installs (listing E102); AI prompt workflow; JS gated by edition; file import docs | E030, E060, E102, E118 |
| C06 | **HTML Macro Plus** | A Direct | **5** installs; **5★ / 1** review; live preview editor | E046, E103 |
| C07 | **Aura / Content Formatting — HTML (iframe) macro** | A Direct | Bundle-with-suite embedding; YouTube overview content | E116, E117 |
| C08 | **Framer for Confluence / Framer+** (CollabSoft) | A/B | Historical **ZIP-upload HTML prototype** model (2020); now dormant (**~8** installs / 0 reviews) — validates job, not active threat | E079 |
| C09 | **Tableau for Confluence** | B Outcome | **~226–227** installs; **4.4★ / 6** | E009, E017 |
| C10 | **Dashboard Hub for Confluence** | B Outcome | **371** installs; **5★ / 10**; Jira→Confluence dashboards | E011, E056 |
| C11 | **GrafanaSight for Confluence** | B Outcome | **3** installs — niche | E010, E025 |
| C12 | **Table Filter, Charts & Spreadsheets** | B Outcome/data | **~15,017** installs; **4.9★ / 442** — owns live table/report job | E012, E052 |
| C13 | **Native iframe macro / Smart Links** | C Native | Good-enough for many external embeds; admin iframe hack | E005, E019, E078, E119, E124, E125 |
| C14 | **Confluence Databases** | C Native | Partial Notion-like job | E004, E026 |
| C15 | **Figma Live Embeds / Smart Links** | C Adjacent | Clickable prototypes when viewers have Figma access | E021, E033, E068, E069 |
| C16 | **Atlassian Analytics / native charts** | C Native | Pushes DOM/analytics seekers away from HTML macros | E002, E040 |
| C17 | **Forge Custom UI / full-page app** | D Build | High effort; legitimized dashboards/internal tools | E006 |
| C18 | **External static host + iframe** (S3/Azure/GH Pages) | D Host | Allure/Azure pattern; works when public/auth URL OK | E022, E073 |
| C19 | **CodePen / external sandboxes + link** | D Host | Fast AI demos; weak Confluence permissions inheritance | (discovery; pattern in AI workflows) |
| C20 | **Wombats User Macro — HTML** | A Direct | Cloud user-macro style HTML path (vendor site) | E126 |
| C21 | **ServiceRocket-style CSS/JS injection guidance** | D/Admin | Admin-controlled injection narrative (trust education) | E120 |

**Coverage check:** Classes A–D all represented; **21** rows (≥15 required).

---

## 3. Review-mining themes (user reviews ≠ vendor replies)

### Appfire HTML Macro Cloud (3.6★ / 36) — themes
| Theme | Polarity | Implication for Mini Site | Evidence |
|---|---|---|---|
| Custom HTML/CSS beyond native | + | Confirms capability demand | E035 |
| Unexpected iframe / DOM surprises | − | Isolation expectations mismanaged | E082, E083 |
| Auto-resize / fit | − | Height UX is table stakes | E036 |
| External share / viewer errors | − | Permissions + embedding edge cases | E037 |

### Narva HTML Macro (5★ / 31) — themes
| Theme | Polarity | Implication | Evidence |
|---|---|---|---|
| Prototype / checkout widget in docs | + | Prototype language works | E041 |
| AI-generated widgets / Claude mockups | + | AI co-wedge vocabulary | E042, E095 |
| Complex multi-script pages | + | Fidelity bar | E043, E084 |
| Attached HTML versioning | + | File/attachment workflow overlap | E044 |
| Training simulators / mini-apps | + | Outcome examples | E096, E097 |
| Sandbox limits “understandable” | ± | Buyers accept constraints if clear | E070 |
| Jul 2026 dense 5★ cluster | caution | Possible solicitation — language OK, prevalence discount | Journal Day 3–4 |

### OST HTML Macro Pro — themes
| Theme | Polarity | Implication | Evidence |
|---|---|---|---|
| Paste AI code → interactive pages | + | Activation simplicity wins mindshare | E061 |
| Custom HTML tools improved org work | + | Internal-tools outcome | E062 |
| “Struggled for ages… game changer” | + | Packaging pain is real | E063 |
| Keep tools in one place vs tabs | + | Outcome vs tabs | E064 |
| Snippet-only / no folder relative paths | structural | Whitespace for Mini Site | E074 |

### Mosaic — themes
| Theme | Polarity | Implication | Evidence |
|---|---|---|---|
| Vibe-code ChatGPT → OKR dashboards / galleries | + | Non-coder AI creator | E060 |
| Tiny install base | context | Not a threat yet | E102 |

**Vendor replies:** Treat as Tier 4 for demand; useful for claimed roadmaps only.

---

## 4. Message teardowns

### Narva — HTML Macro for Confluence
| Element | Observation (2026-08-02) |
|---|---|
| Category | “HTML Macro” — owns search language |
| First promise | Flexible HTML/JS including **from files/attachments**; AI assist; embeds with allowlist |
| Proof | Cloud Fortified, SOC 2, Forge/RoA, high star rating |
| Use cases | Migration, AI widgets, files, external embeds |
| Trust | Allowlisted egress (contrast Mini Site **no egress**) |
| CTA | Marketplace install |
| Search language | HTML macro, AI, migration |
| **Gap Mini Site can own** | Folder-native relative paths + **no public URL / no egress** for already-built multi-file artifacts |

### Appfire — HTML Macro for Confluence Cloud
| Element | Observation |
|---|---|
| Category | Enterprise HTML/JS macro |
| First promise | Snippet + embed-from-sites; Fortified / Bug Bounty |
| Proof | Longevity, security programs; weaker star rating |
| Pain in reviews | iframe/DOM confusion, resize |
| **Gap** | Multi-file folder story + clearer isolation messaging |

### OST Labs — HTML Macro Pro
| Element | Observation |
|---|---|
| Category | AI → paste widgets |
| First promise | “Vibe code → live wiki in 30 seconds” |
| Proof | Speed / free tier / review language |
| Limit | Snippet model — **no relative-path folders** |
| **Gap** | Serious multi-file reports/tools; no-egress governance story |

### Tableau / Dashboard Hub / Table Filter (outcome class)
| Element | Observation |
|---|---|
| Promise | Live / connected data in Confluence |
| Proof | Large install bases (esp. Table Filter) |
| **Mini Site stance** | Complement: static interactive ≠ live BI; do not compete head-on |

### Native iframe + Figma
| Element | Observation |
|---|---|
| Promise | Embed what already has a URL / Figma file |
| **When they win** | Public/auth URL exists; Figma viewers available (E068, E078) |
| **When they lose** | Local folder, relative assets, no public URL, non-Figma HTML (E022, E069, E110) |

---

## 5. Buyer tradeoff matrix

Scores are relative judgments from public evidence (1=weak for buyer need, 5=strong). Not lab benchmarks.

| Option | Flexibility | Activation ease | External data | Trust / admin control | Repeatability | Price friction |
|---|---:|---:|---:|---:|---:|---:|
| Mini Sites | 4 (static apps) | 3 (folder publish) | 1 (no egress) | 5 (Forge perms, no public URL, no egress, secret scan) | 4 | 3 (paid; 0 reviews yet) |
| Narva | 4 | 4 | 4 (allowlist) | 4 (Forge/RoA/SOC2) | 4 | 3 |
| Appfire | 3 | 3 | 3 | 4 (Fortified) | 3 | 3 |
| OST Pro | 2 (snippet) | **5** | 2–3 | 2–3 | 3 | **5** (free tier) |
| Mosaic | 2–3 | 3 (AI prompt) | gated | 3 | 2 | 3 |
| Native iframe | 2 | **5** | 5 (if URL) | 3 | 3 | **5** (free) |
| Figma embed | 2 (Figma-only) | 4 | n/a | 3 | 3 | 5 |
| Table Filter | 3 (tables) | 4 | 4 | 4 | **5** | 3 |
| Tableau / DH | 3 | 3 | **5** | 4 | 4 | 3 |
| External host+iframe | **5** | 2 | **5** | 2 | 3 | 2–4 |
| Forge custom | **5** | 1 | **5** | 5 | 4 | 1 (eng cost) |

**Reading:** Mini Site’s defendable corner is **high trust + multi-file static flexibility** with **low external data** — buyers who need live APIs should be routed away (anti-positioning).

---

## 6. Positioning maps

### Map A — Capability vs specialization

```
                    STATIC / LINKED                         LIVE INTERACTIVE APP
                    content                                 (data-connected)
  GENERIC           Native iframe, Smart Link               Forge full-page,
  PLATFORM          Aura HTML iframe                        Atlassian Analytics
                    Appfire / OST snippet macros
                    Narva (snippet+file+egress)
                         ★ Mini Sites (folder static,
                           no egress) ——→
  SPECIALIZED       Framer+ (dormant ZIP)                   Tableau, GrafanaSight,
  SOLUTION          Figma embed (design-only)               Dashboard Hub,
                                                            Table Filter
```

**Whitespace (evidence-backed):** folder-native static interactive apps **without** requiring public URL or egress — not empty “HTML macro” space (Narva/Appfire/OST occupied).

### Map B — Outcome vs technical skill

```
                    END-USER CONFIGURED              DEVELOPER / BUILDER BUILT
  EXTERNAL HOST     CodePen link, GH Pages           Custom portal + iframe
  / CONTROL         Figma (viewer accounts)          S3/Azure report hosts (E073)

  ATLASSIAN         Table Filter, Dashboard Hub      ★ Mini Sites (bring folder)
  HOSTED/GOVERNED   Mosaic AI prompt (light)         Narva file/AI + allowlist
                    OST paste                        Forge Custom UI
```

**Whitespace:** Builder-supplied **multi-file** artifacts with **Atlassian-hosted governance** and stricter network isolation than allowlist-egress macros.

### Map C — Trust vs capability (summary)

| | Lower network power | Higher network power |
|---|---|---|
| **Higher trust narrative** | **★ Mini Sites (no egress)**; clear sandbox docs | Narva allowlist; Appfire Fortified embeds |
| **Lower / unclear trust** | Paste macros without limits education | Arbitrary external script embeds; ungoverned hosts |

---

## 7. Competitive threat ranking (job overlap × distribution × activation)

| Rank | Threat | Why | Mini Site response |
|---:|---|---|---|
| 1 | Narva | Closest: files + AI + trust badges + installs | Differentiate folder + **no egress** + report/prototype samples |
| 2 | OST Pro | AI activation + free tier | Win multi-file; don’t race “30 second paste” |
| 3 | Appfire | Enterprise distribution + Fortified | Win fidelity/folder; clearer iframe expectations |
| 4 | Native iframe / Figma | Free good-enough | Content: when local/multi-file needed |
| 5 | Table Filter / BI apps | Own live report budgets | Complement messaging |
| 6 | External hosting | Flexible for CI reports | Beat on permissions + no public URL |
| 7 | Mosaic / HTML Macro Plus / Aura | Niche | Monitor |
| 8 | Framer+ | Historical proof of ZIP job | Cite as abandoned category proof, not rival |

---

## 8. Implications for positioning

1. **Do not claim HTML-macro category whitespace** — dated installs show a crowded field (E007, E008, E074).  
2. **Own multi-file static hosting** as the primary wedge (JTBD-01 Adjusted 86.60).  
3. **Treat AI as co-wedge language**, not exclusive claim (Narva/OST already there).  
4. **Publish trust limits aggressively** — isolation is a feature for admins and a disqualifier for DOM/live-API seekers (E002, E029).  
5. **Use outcome samples** (Allure, Plotly, decision tree, exported prototype) as acquisition surfaces (H10/H11).

*Capture date for all Marketplace metrics: 2026-08-02. Recheck before executive/external use.*
