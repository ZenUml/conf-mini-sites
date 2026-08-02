# Top 20 JTBD — working draft (pre–Day 6)

**Status:** Provisional clusters from Days 1–3. Scores are **illustrative** until ≥70 qualified artifacts and full counterevidence passes. Do not treat as launch decision.

Scoring: `Raw = 20 × [0.20F + 0.15U + 0.15V + 0.15P + 0.10D + 0.10R + 0.10W + 0.05X]`  
`Adjusted = Raw × confidence` (1.00 / 0.75 / 0.45 / 0–0.30)

---

## Provisional top candidates

### JTBD-01 — Publish multi-file static interactive artifact on a Confluence page
**When** I have an HTML/CSS/JS folder (report, widget, tool, exported UI)  
**I want to** host it with relative paths intact on a Confluence page  
**So I can** let teammates use the live artifact in context without separate hosting.

| | Score | Notes |
|---|---:|---|
| F | 4–5 | E016, E022, E031, E038, E043–E045, **E075 (21.6k views)**, E047, E049, E053 |
| U | 3 | Blocks sharing / forces hacks |
| V | 4 | Replaces hosting + path-rewrite pain |
| P | 5 | Core product today |
| D | 4 | Attachment hacks, HTML include path rewrite, external host |
| R | 3 | Search via HTML macro / embed HTML / static report |
| W | 3 | Narva file/attachment overlaps; folder-native still thinner |
| X | 4 | Templates, CI reports, AI exports adjacent |
| Confidence | 0.75 | Strong hypothesis (need more non-Community) |
| **Adjusted** | **~60** | Test-next / possible proceed after more evidence |

**Creator:** developer / analyst / devops · **Viewer:** broader team · **Buyer:** Confluence admin  
**Disqualifiers:** outbound CDN/API unless bundled  
**Next test:** 5 design-partner interviews on folder vs paste/attachment; pass if ≥3 prefer folder+no public URL.

---

### JTBD-02 — Put a clickable prototype in the PRD/docs page
**When** I need design/dev review in Confluence  
**I want** a clickable prototype inline  
**So** reviewers test the flow instead of reading screenshots.

| | Score | Notes |
|---|---:|---|
| F | 3 | E021, E033, E041 (+ listing claims excluded) |
| U | 3 | Screenshot staleness / review friction |
| V | 4 | Faster decisions (listing claim — partially user-backed by E041) |
| P | 5 | Static export fits |
| D | 3 | Figma Smart Link often good enough |
| R | 4 | Prototype / embed Figma / live demo language |
| W | 2 | Figma native + Narva overlap |
| X | 3 | Design-system demos adjacent |
| Confidence | 0.75 | |
| **Adjusted** | **~51** | Reposition-and-test |

**Counterevidence:** Figma Smart Link/iframe often sufficient (E021/E033). Own the **exported static / non-Figma / AI-built** slice, not “replace Figma.”

---

### JTBD-03 — Run AI-generated HTML/JS tool in Confluence
**When** Claude/ChatGPT produces a small tool (decision tree, calculator, widget)  
**I want to** publish it on a Confluence page quickly  
**So** the team can use it without engineering a Forge app or external host.

| | Score | Notes |
|---|---:|---|
| F | 3 | E042, E047 (+ vendor E030/E034/E055) |
| U | 4 | E047 production governance workaround |
| V | 4 | Enterprise self-serve tools |
| P | 4–5 | High if self-contained folder; CDN breaks |
| D | 4 | Attachment+iframe / single-file paste friction |
| R | 4 | Vendors already SEO this |
| W | 2 | Narva/OST own snippet; folder/isolation thinner |
| X | 4 | |
| Confidence | 0.75 | Upgraded by E047 practitioner blog |
| **Adjusted** | **~55** | Test-next; possible co-wedge with JTBD-01 |

### JTBD-04 — Simple interactive calculator / formula widget on a page
**When** readers need to compute a simple formula  
**I want** input fields on the Confluence page  
**So** they get results without Excel or leaving the page.

| | Score | Notes |
|---|---:|---|
| F | 2–3 | E051; E052 is spreadsheet (reject overlap) |
| U | 2 | |
| V | 2 | |
| P | 5 | Trivial static HTML/JS |
| D | 3 | Spreadsheet apps overkill / good-enough |
| R | 3 | |
| W | 2 | Table Filter owns tabular formulas |
| X | 3 | AI-generated calculators |
| Confidence | 0.75 | |
| **Adjusted** | **~40** | Supporting example under JTBD-01/03; not solo wedge |

---

## Rejected / do-not-pursue now

| ID | Job | Why |
|---|---|---|
| R1 | Page-DOM interactive HTML / custom analytics | E002/E040 — Mini Site iframe-isolated; same limit as incumbents |
| R2 | Live Tableau/Power BI/Grafana | Needs egress/auth; specialists + iframe; Table Filter owns table reports (15k installs) |
| R3 | Notion-like databases | Native Databases / Table Filter |
| R4 | Embed Confluence into external sites | Wrong direction (E027/E028) |
| R5 | Generic HTML snippet macro | Narva/Appfire category with 1.7k–2.3k installs |

## Persona map (draft)
| Role | Typical for top jobs |
|---|---|
| Creator | Developer, analyst, designer-adjacent |
| Viewer | PM, stakeholders, teammates on the page |
| Admin | Enables Marketplace app; security review |
| Buyer | Admin / team lead; sensitive to “another paid HTML app” (E032) |

## Workaround map (draft)
Native iframe/Smart Link · HTML macro (Narva/Appfire) · Table Filter · external host+iframe · Forge custom app · screenshots · do nothing

---

*Full 20 cards after Day 5–6 evidence quota.*
