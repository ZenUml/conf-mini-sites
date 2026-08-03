# Competitive landscape — final research snapshot

**Captured:** 2026-08-02. Marketplace metrics change continuously and may include evaluations; they are active-install signals, not unique paying customers. Do not add install counts across products because sites can install multiple alternatives.

## Inventory

| ID | Product / alternative | Class | Input model | Approx. active installs | Evidence-backed implication |
|---|---|---|---|---:|---|
| C01 | [Mini Sites for Confluence](https://marketplace.atlassian.com/apps/4169123443) | Subject | Multi-file folder, root `index.html` | 1 | Exact wedge is public but has no external traction proof yet. |
| C02 | [HTML Macro for Confluence Cloud — Appfire](https://marketplace.atlassian.com/apps/1212279) | Direct | HTML/JS snippet; external embed | 1,780 | Established paid Cloud category. |
| C03 | [HTML Macro for Confluence — Narva](https://marketplace.atlassian.com/apps/1221472) | Direct | Snippet, external URL, HTML attachment/file | 2,348 | Closest broad incumbent; recent reviews name prototypes, AI widgets, complex pages, and versioning. |
| C04 | [HTML for Confluence — Appfire](https://marketplace.atlassian.com/apps/252) | Direct / legacy | Body, attachment, file system, URL, XML/XSLT | 2,482 | Paid multi-host incumbent with broad import sources and long history. |
| C05 | [HTML Macro Pro — OST](https://marketplace.atlassian.com/apps/1235901) | Direct | Snippet or URL | ~1,795–1,799 | Free, Cloud Fortified, and explicitly owns “AI-generated mini apps” (E124). The narrow range preserves same-day Marketplace API cache variance. |
| C06 | [HTML Macro for Confluence — Yamuno](https://marketplace.atlassian.com/apps/1670180315) | Direct | HTML/CSS/JS editor; iframe | 160 | Free Forge alternative with CSP and editor permissions. |
| C07 | [HTML by Mosaic](https://marketplace.atlassian.com/search?hosting=cloud&product=confluence&query=html) / Mosaic suite | Direct / suite | HTML/CSS/JS macro | ~11 standalone; ~4.5k suite | Suite distribution can copy or bundle the capability; standalone count is small. |
| C08 | [HTML Content Macro — Tech Labs](https://marketplace.atlassian.com/apps/1222886) | Direct | HTML/CSS/JS snippet | 102 | Small paid long-tail competitor; search API captured 2026-08-02. |
| C09 | [HTML and Markdown include macros — Vertuna](https://marketplace.atlassian.com/apps/1221983) | Direct | HTML/Markdown/JS include | 75 | Small paid include-oriented alternative; search API captured 2026-08-02. |
| C10 | Native iframe / Smart Links | Native | Existing URL | n/a | Good enough when content already has a reachable URL; E078 is explicit counterevidence. |
| C11 | Native HTML ZIP import | Native / migration | HTML ZIP converted into pages/space | n/a | Solves migration, not preservation of an interactive static app; 2025–2026 reports show import limitations. |
| C12 | Native page attachment | Native | File or ZIP | n/a | Stores and versions files but usually downloads/previews rather than running the bundle inline. |
| C13 | Static hosting + iframe | Build / host | Folder deployed to Azure/GitHub/GitLab/Cloudflare | n/a | Technically reliable and supports full bundles/networking, but adds hosting, access, and upkeep. E022 adopted this route. |
| C14 | Custom Forge app | Build | Source code / Custom UI | n/a | Maximum Confluence integration and governance; high engineering and release overhead. |
| C15 | Table Filter, Charts & Spreadsheets | Outcome-specific | Native tables/data | ~15k | Owns spreadsheet, filter, and table-report jobs; avoid generic calculator/dashboard competition. |
| C16 | Dashboard Hub | Outcome-specific | Jira/Confluence and external dashboards | ~371 | Better fit for live Jira reporting and drilldown. |
| C17 | [Framer+ for Confluence](https://marketplace.atlassian.com/apps/1225889) | Outcome-specific / historical exact | Current: Framer link; historical: exported ZIP | 8 | Historical product used the same ZIP-upload prototype model, then pivoted to link embed; weak evidence for a large exact-prototype market. |
| C18 | Tableau for Confluence | Outcome-specific | Authenticated live Tableau content | ~226 | Better fit for live BI; requires networking/auth that Mini Sites deliberately lacks. |
| C19 | [Markup](https://sproutmarkup.com/) | AI artifact host | Single self-contained HTML | not captured | Adds access control, comments, versions, and sandboxed rendering outside Confluence (E106). |
| C20 | [BinHTML](https://binhtml.com/) | AI artifact host | Single HTML via UI/API/MCP | not captured | Agent/API publishing is materially simpler than Mini Sites' manual folder picker (E107). |
| C21 | [display.dev](https://display.dev/ai-reports) | Internal artifact host | Single HTML via CLI | not captured | Competes on permanent links and company authentication rather than Confluence context (E108). |
| C22 | [Handoff](https://handoff.host/) | Work-artifact host | Single HTML/Markdown | not captured | Competes on stable versioned links and explicitly frames artifacts as work, not deployments (E109). |
| C23 | [PageCrate](https://app.pagecrate.app/ai-document-hosting) | AI document host | Single or file-tree artifact | not captured | Closest newly found external alternative for organized multi-file artifacts (E110). |
| C24 | [HTML in Slack](https://htmlinslack.com/) | Collaboration integration | HTML/Markdown file in Slack | not captured | Shows that integration into the team's existing destination can beat a generic hosting workflow (E111). |
| C25 | [Tiiny Host](https://tiiny.host/host-html-file/) | Simple static host | HTML file or ZIP | vendor claims 500k+ users | Mature drag-and-drop substitute for prototypes and bundles; vendor usage claim is not independently verified (E113). |
| C26 | [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) | Developer static host | Folder or ZIP | n/a | Direct upload, CI, preview deployments, and broad file limits; lacks inherited Confluence context by default (E114). |
| C27 | [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | Repository static host | Repository-backed HTML/CSS/JS | n/a | Familiar developer substitute; private repositories require an eligible paid plan (E115). |
| C28 | [Quick Publish](https://chromewebstore.google.com/detail/quick-publish-ai-generate/iedokmfkofbdlmpinedngabpkicmlple) | Browser artifact publisher | Single HTML | 413 extension users; 2 ratings | Small but measurable signal for one-file AI publishing; not Confluence demand (E112). |

## Competitive map

The market is easier to understand on two axes: where the artifact lives and what input the creator already has.

| | Snippet / one file | Multi-file folder / repository |
|---|---|---|
| **Inside Confluence** | Appfire Cloud, Narva, OST, Yamuno; crowded and increasingly free (E007, E008, E124, E125) | Mini Sites; Narva partially overlaps through files/attachments (E001, E008, E120) |
| **Outside Confluence** | Markup, BinHTML, display.dev, Handoff, Quick Publish, Tiiny Host (E106–E109, E112, E113) | PageCrate, Tiiny Host, Cloudflare Pages, GitHub Pages (E110, E113–E115) |

The apparently sparse “Confluence + folder” cell is not automatically attractive. Strict demand review found no independently verified recent Cloud request that explicitly needs that exact contract; its four clearest artifacts are historical or deployment-unverified (E082, E022, E031, E084).

## Message and activation teardown

| Alternative | First promise / activation | What it wins | Where it leaves room |
|---|---|---|---|
| Mini Sites | Choose a folder containing root `index.html` and more than one file | Relative assets, no separate host, Confluence page context, replacement under the same instance (E001, E120, E122) | Rejects the dominant recent one-file shape; fixed 360px viewer; one install and no reviews at capture (E001, E120, E121) |
| Narva | Broad HTML, files/attachments, URLs, allowlists, and AI-widget language | Input breadth, existing trust, current prototype/AI/versioning reviews (E008, E041–E044) | Broad category rather than a narrow report/artifact outcome; paid |
| OST HTML Macro Pro | Paste HTML/CSS/JS or a URL; free and Cloud Fortified | Price, low learning curve, current simulator/report/AI outcomes (E085–E090, E119, E124) | A complex self-contained app produced an opaque rendering error (E088) |
| Appfire Cloud / HTML for Confluence | Established HTML/JS or multi-source HTML/XML/XSLT macros | Long history, support, auto-resize, QA/help-system outcomes (E007, E036, E083, E084, E123) | Higher setup/price pressure; current AI-specific position is weaker than OST/Narva |
| AI artifact hosts | “One file → one link,” often with versions, access, comments, API, CLI, or MCP | Fastest AI-native activation and collaboration features (E106–E110) | Artifact is outside Confluence; audience and discovery may become a second workspace |
| Developer static hosts | Folder/repository deploy, CI, previews, custom domains | Mature bundle hosting and automation (E113–E115) | Repository/account/access setup; no inherited Confluence placement by default |
| Native iframe / Smart Links | Paste an existing URL | Free and immediate when the content is already hosted and frameable (E078, E116) | Cannot host local files; target security headers, authentication, and sizing can fail |
| Outcome-specific apps | Connect live Tableau, Grafana, Jira, tables, or design tools | Own data auth, refresh, drill-down, and source-of-truth semantics (E009–E012) | Poor fit for arbitrary static AI/report artifacts |

## Review themes

Positive outcomes cluster around presentation control, embedding prototypes and AI widgets, keeping attached HTML versioned, running training/test tools, and avoiding PDFs or external hosts (E035, E041, E042, E044, E085–E089, E119). Negative evidence clusters around opaque limits for complex single-file apps, upgrade regressions, fixed or broken sizing, and authenticated external assets (E036, E088, E091, E092, E094, E095).

The OST review cohort is unusually dense in 2026 and may be solicited. Each specific workflow is retained as one outcome artifact, but the cohort is not treated as prevalence, organic acquisition, or independent willingness-to-pay evidence (E085–E090, E119, E124).

## Buyer objection map

| Objection | Evidence-backed answer |
|---|---|
| “Why not use the native iframe?” | Use it when a stable reachable URL already exists. Mini Sites should be considered only for local self-contained artifacts; native iframe already solved E078 and is documented in E116. |
| “Why not use a free HTML macro?” | For one-file or paste-first work, OST or Yamuno may be the better choice today (E124, E125). Mini Sites needs a report/artifact outcome and folder support—not generic HTML—to justify itself. |
| “Why not Narva or Appfire?” | They have broader inputs and far more active-install/review signals (E007, E008, E123). Mini Sites can win only with a simpler, safer artifact workflow and proof for a narrow job. |
| “Why not Tiiny, Cloudflare, or GitHub Pages?” | Those are strong hosts (E113–E115). Confluence placement, existing audience, and fewer access-management steps are the proposed differentiators and still require interviews (E089, E093, E102). |
| “Why not build a Forge app?” | Forge is appropriate for live APIs, host integration, or write-back (E006, E096, E118). Mini Sites should serve static work artifacts whose creators do not want an app project. |
| “Why not a dashboard/table/design app?” | Use the purpose-built product when live source data matters (E009–E012, E058, E100). A static snapshot is not an equivalent outcome. |

## Competitive threat priority

1. **Narva and OST:** highest immediate threat because they combine Confluence distribution, simpler inputs, current AI language, and materially larger adoption signals (E008, E124).
2. **Appfire Cloud / HTML for Confluence:** high trust and switching-cost threat, especially for existing installations and migration workflows (E007, E123).
3. **AI artifact hosts:** high product-direction threat. They move faster on the dominant one-file format, versions, comments, and agent publishing (E106–E110).
4. **Cloudflare Pages, GitHub Pages, and Tiiny Host:** strong substitutes for technical creators, but weaker on Confluence-native discovery and permissions (E113–E115).
5. **Live dashboard and design apps:** low direct overlap after the product boundary is stated honestly; they should receive wrong-fit traffic rather than be challenged head-on (E009–E012, E058).

## Current price pressure

The Marketplace public pricing state reports these 51–100-user annual `amount` values on the capture date (E126, E127):

| Product | Amount | Caveat |
|---|---:|---|
| Mini Sites | USD 1,010 | Multi-file hosting may replace separate infrastructure, but willingness to pay for that premium is unverified (E126). |
| Narva HTML Macro | USD 400 | Broader input model and established trust/review base (E127). |
| OST / Yamuno | Free | Strong pressure on any generic HTML/AI-widget positioning. |

## Positioning implications

1. **Do not lead as another generic HTML macro.** That category is established but crowded, trusted incumbents are larger, and free options exist.
2. **Do not lead with live dashboards.** The best-known dashboard jobs frequently require refresh, authentication, APIs, or write-back; purpose-built apps and hosted iframes win there.
3. **The best growth wedge is an outcome:** put an AI-generated interactive report, mockup, or local-only tool in the team's Confluence context. That wedge requires single-file support and clearer sizing/errors (E087–E089, E097, E120, E121).
4. **The current exact folder contract is a validation test, not a proven market.** It fits the product cleanly but lacks recent explicit Cloud evidence (E082, E022, E031, E084).
5. **The proof pillars should be private Confluence context, safe isolation, stable republish, and honest limits—not file count.** Those are the reasons to choose Mini Sites over an artifact host or static host (E029, E089, E093, E102, E122).
6. **There is no durable packaging moat.** Direct incumbents can add folder input, and external hosts already support it (E008, E110, E113, E114).

## Review-quality caution

Narva's July 2026 review burst and OST's 2026 cohort contain useful, specific outcomes, but their tight timing raises solicitation risk. Treat each specific artifact/workflow statement as medium-confidence adoption evidence; do not infer prevalence, organic acquisition, paid status, or unique customers from review/install counts (E041–E044, E085–E090, E119, E124).
