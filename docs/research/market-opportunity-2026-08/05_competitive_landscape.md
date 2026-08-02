# Competitive landscape — DRAFT

## Competitor classes (brief)
1. Direct capability apps — HTML/JS macros
2. Outcome-specific apps — dashboards/reports/observability
3. Native / adjacent Confluence
4. Build or host alternatives — Forge, external static hosting, CodePen, links

## Inventory (expanding; capture date 2026-08-02 unless noted)

| ID | Product | Class | Dated metrics / notes |
|---|---|---|---|
| C01 | Mini Sites (Embed HTML & Prototypes) | Subject | **1 install**, 0 reviews, v4.0.0 (26 Jul 2026), Paid via Atlassian. Multi-file folder; `connect-src 'self'`; no outbound network |
| C02 | HTML Macro for Confluence Cloud (Appfire) | Direct | **1,780 installs**, 3.6★ (36 reviews), Cloud Fortified, Bug Bounty, v8.0.0 (15 Jul 2026). Snippet HTML/JS + embed-from-sites |
| C03 | HTML Macro for Confluence (Narva) | Direct | **2,345 installs**, 5★ (31 reviews), Cloud Fortified, SOC 2, Forge/RoA, v3.12.0 (31 Jul 2026). **Closest rival:** HTML from files/attachments; AI (ChatGPT/Claude) copy; external embeds + domain allowlist; DC→Cloud migration |
| C04 | Tableau for Confluence | Outcome | **226 installs**, 4.4★ (6 reviews) Cloud — 2026-08-02 |
| C05 | GrafanaSight | Outcome | **3 installs** Cloud — 2026-08-02 (niche) |
| C06 | Dashboard Hub | Outcome | **371 installs**, 5★ (10 reviews) Cloud — 2026-08-02 |
| C07 | Table Filter, Charts & Spreadsheets | Outcome / data | **15,017 installs**, 4.9★ (442 reviews) — 2026-08-02. Dominates live table/report job |
| C08 | Native iframe / Smart Links | Native | Good-enough for many external embeds (counterevidence E019, E025) |
| C09 | Confluence databases | Native | Partial Notion-like job |
| C10 | Forge Custom UI / full-page | Build | High effort; legitimized by S6 |
| C11 | External static host + iframe | Build/host | Allure/Azure pattern E022 — works when public URL OK |
| C12 | HTML Macro Plus | Direct | **5 installs**, 5★ (1 review) — 2026-08-02 |
| C13 | HTML by Mosaic (Kolekti) | Direct | Forge; AI prompt workflow (vendor) — metrics TBD |
| C14 | Aura HTML (iframe) macro | Direct | Bundle-with-suite embedding — metrics TBD |
| C15 | Figma Smart Link / Figma apps | Native/adjacent | Prototype alternative to static export |
| C16 | HTML Macro Pro (OST Labs) | Direct | Vendor AI→paste widgets; claimed ~1,400 installs — Marketplace recheck pending (E055) |
| C17 | Framer for Confluence / Framer+ (CollabSoft) | Direct / outcome | Historical ZIP-upload HTML prototype model (E079); now dormant (~8 installs / 0 reviews) — validates job, not active threat |

### Early differentiation hypothesis (unverified)
Mini Sites should **not** claim “HTML macro” whitespace — Narva/Appfire own that category with 1.7k–2.3k installs. Defendable wedge may be: **multi-file relative-path bundle hosting with inherited page permissions and no public URL / no egress**, for artifacts that are already folders (prototypes, static reports, AI-exported apps) rather than snippets or third-party iframes.

## Maps / teardown
Pending Day 8.
