# Source bibliography — audit trail

Access date for every entry: **2026-08-02**. Access method: WebSearch result snippets/summaries
(direct page fetches of marketplace.atlassian.com, community.atlassian.com, reddit.com,
stackoverflow.com, youtube.com, developer.atlassian.com are blocked by this environment's network
policy — HTTP 403 at the egress proxy; reddit.com and stackoverflow.com are additionally excluded
from the search crawler). Entries marked [snippet-grade] were characterized from search results, not
from a rendered page. Every evidence ID in the deliverables resolves to a row here or in
`01_evidence_log.csv` (which carries the same canonical URLs).

## Brief seed sources (S1-S12), rechecked on execution

| ID | Source | URL | Recheck note (2026-08-02) |
|---|---|---|---|
| S1 | Mini Site(s) for Confluence — Marketplace listing | https://marketplace.atlassian.com/apps/4169123443/ | listing NOT indexed in organic search; only zenuml.com/mini-sites surfaces; plural name only |
| S2 | Confluence Cloud HTML Macros — Reddit r/atlassian | https://www.reddit.com/r/atlassian/comments/1ctdazp | UNVERIFIABLE this session (reddit excluded from crawler); carried as brief-supplied historical evidence |
| S3 | html emdedding into confluence? — Atlassian Community | https://community.atlassian.com/forums/Confluence-questions/html-emdedding-into-confluence/qaq-p/2631694 | exists; /t5/ path retired -> /forums/ |
| S4 | Interactive database in Confluence — Atlassian Community | https://community.atlassian.com/forums/Confluence-questions/Interactive-database-in-Confluence/qaq-p/1626231 | exists; dated 2022-01-06 (medium confidence) |
| S5 | How to embed an iframe in Confluence page — Stack Overflow | https://stackoverflow.com/questions/43676723/how-to-embed-an-iframe-in-confluence-page | UNVERIFIABLE this session (SO excluded from crawler) |
| S6 | Forge full-page dashboard tutorial — Atlassian Developer | https://developer.atlassian.com/platform/forge/build-a-dashboard-app-with-the-confluence-full-page-module/ | exists, confirmed verbatim |
| S7 | HTML Macro for Confluence Cloud — Appfire (1212279) | https://marketplace.atlassian.com/apps/1212279/html-macro-for-confluence-cloud | ~1.9k installs, 2.9/4, 36 reviews [snippet-grade, single obs.]; pricing effective 2025-07-01 via appfire.com/pricing-updates/html-macro-confluence-cloud |
| S8 | HTML Macro for Confluence — Narva (1221472) | https://marketplace.atlassian.com/apps/1221472/html-macro-for-confluence | exists; metrics not visible this session; vendor renamed (ex-Bitwelt); security docs at help.narva.net |
| S9 | Tableau for Confluence (1217497) | https://marketplace.atlassian.com/apps/1217497/tableau-for-confluence | ~240 installs, no reviews [snippet-grade]; vendor attributed Modus Create |
| S10 | GrafanaSight for Confluence — Flowdence | https://flowdence.io/products/grafanasight | product exists; Marketplace app id 2643908494 unverified in search |
| S11 | Dashboard Hub for Confluence (1224619) | https://marketplace.atlassian.com/apps/1224619/dashboard-hub-for-confluence-reports-dashboards-from-jira | ~371 installs, no reviews [snippet-grade]; title drift across two slugs |
| S12 | Table Filter, Charts & Spreadsheets — Stiltsoft (27447) | https://marketplace.atlassian.com/apps/27447/table-filter-charts-spreadsheets-for-confluence | ~15,055 installs [snippet-grade, single non-reproducible obs., LOW confidence]; canonical slug changed |

## Internal authoritative sources (Tier 2 — product capability truth)

| Source | Fact used |
|---|---|
| `src/dispatch/gateway.ts:146` / `src/dispatch/forgeGateway.ts:165` | shipped CSP: `default-src 'self'; connect-src 'self'; form-action 'none'` etc. |
| `src/pipeline/bundleValidation.ts:26-28` | limits: 2000 files / 25 MiB file / 50 MiB bundle |
| `CLAUDE.md`, `DESIGN.md`, `BACKEND_DESIGN.md` | architecture: WfP per-instance workers, non-routable, grant-verified dispatch, Forge permission inheritance |
| `docs/listing/getting-started.md`, `docs/listing/documentation.md` | current listing copy audited for WS2 |
| `validation/G1-security-residency.md`, `validation/G2-demand-validation.md` | prior gates: residency concern; demand framework (unexecuted) |
| `docs/research/2026-06-27-mom-test-static-site-hosting.md` | interview method baseline (no recorded results) |
| `docs/adr/0001`, `docs/adr/0002` | hosting-substrate and storage-primitive decisions (hedge options) |

## Evidence artifacts (E-001 … E-137)

Canonical URLs, titles, capture dates and per-artifact metadata are normative in
`01_evidence_log.csv` (one row per artifact; this file does not duplicate them). Unique canonical
URLs below for quick access audit:

**110 unique canonical URLs across 137 artifact rows.**

- E-001: [Solved: Adding HTML Directly in Confluence Pages](https://community.atlassian.com/forums/Confluence-questions/Adding-HTML-Directly-in-Confluence-Pages/qaq-p/3240107)
- E-002: [unknown macro 'html' - Confluence](https://community.atlassian.com/forums/Confluence-questions/unknown-macro-html/qaq-p/2955052)
- E-003: [Forge migration gap: No equivalent for Connect's staticContentMacro rendering qu](https://community.atlassian.com/forums/Confluence-questions/Forge-migration-gap-No-equivalent-for-Connect-s/qaq-p/3201049)
- E-004: [How to upload a HTML files project folder with sub pages and supporting images t](https://community.atlassian.com/forums/Confluence-questions/How-to-upload-a-HTML-files-project-folder-with-sub-pages-and/qaq-p/2806119)
- E-005: [Render HTML - Confluence](https://community.atlassian.com/forums/Confluence-questions/Render-HTML/qaq-p/2421345)
- E-006: [Solved: Migrating Confluence DC to Cloud - HTML macro](https://community.atlassian.com/forums/Confluence-questions/Migrating-Confluence-DC-to-Cloud-HTML-macro/qaq-p/2245372)
- E-007: [HTML macro (Confluence Server) to iFrame macro (Confluence Cloud) - migration pl](https://community.atlassian.com/forums/Confluence-questions/HTML-macro-Confluence-Server-to-iFrame-macro-Confluence-Cloud/qaq-p/1881224)
- E-008: [Solved: embed html into a confluence page](https://community.atlassian.com/forums/Confluence-questions/embed-html-into-a-confluence-page/qaq-p/2054733)
- E-009: [Solved: HTML macro on Confluence Cloud?](https://community.atlassian.com/forums/Confluence-questions/HTML-macro-on-Confluence-Cloud/qaq-p/1318974)
- E-010: [Atlassian Cloud - how to add custom javascript or html for an embedded iframe](https://community.atlassian.com/forums/Confluence-questions/Atlassian-Cloud-how-to-add-custom-javascript-or-html-for-an/qaq-p/941069)
- E-011: [Refused to connect error in iFrame](https://community.atlassian.com/forums/Confluence-questions/Refused-to-connect-error-in-iFrame/qaq-p/2195947)
- E-012: [Solved: How to embed custom code](https://community.atlassian.com/forums/Confluence-questions/How-to-embed-custom-code/qaq-p/1776003)
- E-013: [How to embed Interactive Google Charts into Confluence Page using html macro](https://community.atlassian.com/forums/Confluence-questions/How-to-embed-Interactive-Google-Charts-into-Confluence-Page/qaq-p/618934)
- E-014: [Introducing HTML by Mosaic, for Confluence](https://community.atlassian.com/forums/App-Central-articles/Introducing-HTML-by-Mosaic-for-Confluence/ba-p/3249485)
- E-015: [Using customUI to show HTML & run javascript with forge UI (Atlassian Developer ](https://community.developer.atlassian.com/t/using-customui-to-show-html-run-javascript-with-forge-ui/54047)
- E-016: [Interactive Jira Dashboard in Confluence](https://community.atlassian.com/forums/Confluence-questions/Interactive-Jira-Dashboard-in-Confluence/qaq-p/2951248)
- E-017: [Can a table auto-update when its attachment is replaced in Confluence?](https://community.atlassian.com/forums/Confluence-questions/Can-a-table-auto-update-when-its-attachment-is-replaced-in-Confluence/qaq-p/3092670)
- E-018: [Visualisation of Confluence Database content](https://community.atlassian.com/forums/Confluence-Databases-discussions/Visualisation-of-Confluence-Database-content/td-p/2745784)
- E-019: [Feature Request: Formulas in Confluence Databases](https://community.atlassian.com/forums/Confluence-Databases-discussions/Feature-Request-Formulas-in-Confluence-Databases/td-p/2694711)
- E-020: [Will there be a Timeline view for Database ?](https://community.atlassian.com/forums/Confluence-questions/Will-there-be-a-Timeline-view-for-Database/qaq-p/2980754)
- E-021: [Solved: Confluence Cloud - Static HTML Content](https://community.atlassian.com/forums/Confluence-questions/Confluence-Cloud-Static-HTML-Content/qaq-p/2619230)
- E-022: [Display the graphs in confluence page without html macro](https://community.atlassian.com/forums/Confluence-questions/Display-the-graphs-in-confluence-page-without-html-macro/qaq-p/2258050)
- E-023: [Solved: Using iframe macro for grafana dashboard](https://community.atlassian.com/forums/Confluence-questions/Using-iframe-macro-for-grafana-dashboard/qaq-p/2542828)
- E-024: [Embed a Power BI report into using iframe, it's not embedding, it's inert - just](https://community.atlassian.com/forums/Confluence-questions/Embed-a-Power-BI-report-into-using-iframe-it-s-not-embedding-it-s-inert-just-a-screenshot/qaq-p/2044442)
- E-025: [How to fix iFrame and smart links that stop working](https://community.atlassian.com/forums/Confluence-questions/How-to-fix-iFrame-and-smart-links-that-stop-working/qaq-p/2972642)
- E-026: [Can I build a confluence page with dynamic content](https://community.atlassian.com/forums/Confluence-questions/Can-I-build-a-confluence-page-with-dynamic-content/qaq-p/2908039)
- E-029: [Embed Jira dashboards & gadgets in Confluence with Smart Links](https://community.atlassian.com/forums/Confluence-articles/Embed-Jira-dashboards-amp-gadgets-in-Confluence-with-Smart-Links/ba-p/2717630)
- E-030: [How to embed Tableau dashboard in Confluence without prompting to sign in to Tab](https://community.atlassian.com/forums/Confluence-questions/How-to-embed-Tableau-dashboard-in-Confluence-without-prompting-to-sign-in-to-Tableau-Server/qaq-p/1876135)
- E-033: [Confluence & Customer Service Decision Tree](https://community.atlassian.com/forums/Confluence-questions/Confluence-amp-Customer-Service-Decision-Tree/qaq-p/2151445)
- E-034: [How do I create a question decision tree documentation?](https://community.atlassian.com/forums/Confluence-questions/How-do-I-create-a-question-decision-tree-documentation/qaq-p/2709998)
- E-035: [Add Decision Tree functionality to a page | Confluence Cloud](https://jira.atlassian.com/browse/CONFCLOUD-75473)
- E-036: [Add simple interactive formula - Confluence](https://community.atlassian.com/forums/Confluence-questions/Add-simple-interactive-formula/qaq-p/2539196)
- E-037: [Calculations/formulas in confluence page that changes dynamically](https://community.atlassian.com/forums/Confluence-questions/Calculations-formulas-in-confluence-page-that-changes/qaq-p/2166226)
- E-038: [Does confluence support if/then logic on data fields?](https://community.atlassian.com/forums/Confluence-questions/Does-confluence-support-if-then-logic-on-data-fields/qaq-p/2097047)
- E-041: [Host the website(html pages) in confluence](https://community.atlassian.com/forums/Confluence-questions/Host-the-website-html-pages-in-confluence/qaq-p/1086022)
- E-042: [How to Render User Inputted HTML in Confluence Macro Using Forge for Cloud Devel](https://community.developer.atlassian.com/t/how-to-render-user-inputted-html-in-confluence-macro-using-forge-for-cloud-development/68509)
- E-043: [Dynamic decision trees](https://community.atlassian.com/forums/Confluence-questions/Dynamic-decision-trees/qaq-p/384000)
- E-044: [HTML Macro Pro for Confluence FREE - Embed HTML and iframes](https://marketplace.atlassian.com/apps/1235901/html-macro-pro-for-confluence-free-embed-html-and-iframes)
- E-045: [Decision tree-driven content: A fresh approach to Confluence navigation!](https://community.atlassian.com/t5/App-Central/Decision-tree-driven-content-A-fresh-approach-to-Confluence/m-p/2633521)
- E-050: [is it possible to render a html document page in Confluence that generated using](https://community.atlassian.com/forums/Confluence-questions/is-it-possible-to-render-a-html-document-page-in-Confluence-that/qaq-p/2380173)
- E-052: [Grafana dashboard integration - Confluence Cloud - The Atlassian Developer Commu](https://community.developer.atlassian.com/t/grafana-dashboard-integration/41842)
- E-054: [Conf. was able to show an embedded frame for Figma links, why now it looks like ](https://community.atlassian.com/forums/Confluence-questions/Conf-was-able-to-show-an-embedded-frame-for-Figma-links-why-now/qaq-p/3144500)
- E-055: [Support simple user macros in Confluence Cloud](https://jira.atlassian.com/browse/CONFCLOUD-27141)
- E-057: [Solved: Can i upload a bulk of html files to Confluence?](https://community.atlassian.com/forums/Confluence-questions/Can-i-upload-a-bulk-of-html-files-to-Confluence/qaq-p/1432673)
- E-060: [Why isn't there a native HTML macro in Confluence Cloud?](https://www.kolekti.com/resources/blog/why-confluence-cloud-has-no-native-html-macro)
- E-062: [Confluence Forge Custom UI: Handling iframe Embedding for Different Content Type](https://community.developer.atlassian.com/t/confluence-forge-custom-ui-handling-iframe-embedding-for-different-content-types-whiteboards-databases-and-smart-links-fail-due-to-csp/98249)
- E-063: [Why does Forge block form submission to external domains when wildcard egress is](https://community.developer.atlassian.com/t/why-does-forge-block-form-submission-to-external-domains-when-wildcard-egress-is-allowed/100451)
- E-067: [Solved: HTML Macro with css and JS not working.](https://community.atlassian.com/forums/Confluence-questions/HTML-Macro-with-css-and-JS-not-working/qaq-p/1730184)
- E-071: [Forge Custom UI - Confluence - 403 when requesting static assets](https://community.developer.atlassian.com/t/forge-custom-ui-confluence-403-when-requesting-static-assets/60655)
- E-072: [Forge deploy gives size related error](https://community.developer.atlassian.com/t/forge-deploy-gives-size-related-error/83364)
- E-073: [RFC-136: Forge staticView Macro for Confluence, Connect Migration & Feedback](https://community.developer.atlassian.com/t/rfc-136-forge-staticview-macro-for-confluence-connect-migration-feedback/100892)
- E-074: [Say Hello to HTML Importer: Bulk Import Your HTML Content into Confluence!](https://community.atlassian.com/forums/Confluence-articles/Say-Hello-to-HTML-Importer-Bulk-Import-Your-HTML-Content-into/ba-p/2896851)
- E-075: [how to embed xd prototypes in confluence cloud page (Adobe XD community)](https://community.adobe.com/t5/adobe-xd/how-to-embed-xd-prototypes-in-confluence-cloud-page/m-p/11048185)
- E-076: [How To Embed HTML In Confluence [How To Guide 2026]](https://www.youtube.com/watch?v=4eDjed5IO0o)
- E-077: [How To Add Html To Confluence Pages (2026 Easy Guide)](https://www.youtube.com/watch?v=dDfpMi8-2xg)
- E-078: [How to Add Custom HTML to Confluence Pages (Capable HTML Macro)](https://www.youtube.com/watch?v=-gqqjSsvBgc)
- E-079: [How to Embed & Render HTML in Confluence - Just Add+](https://www.youtube.com/watch?v=sd3rRcW_HuQ)
- E-080: [How to embed markdown, HTML, PlantUML, LaTex and more in Confluence | Markdown M](https://www.youtube.com/watch?v=cgfHdETvoRM)
- E-081: [How To Create Dynamic Confluence Forms Using HTML / JS](https://www.youtube.com/watch?v=3ZFf1SREMpE)
- E-082: [JavaScript? In MY Confluence? - Atlassian Summit 2012](https://www.youtube.com/watch?v=1-uaC3p35LA)
- E-083: [Enhance Your Pages with Custom Macros | Forge Dev Den](https://www.youtube.com/watch?v=hnucVI0Ol-o)
- E-084: [How to Embed an Iframe in a Confluence Page (2026 Iframe Basics)](https://www.youtube.com/watch?v=lT8QBrJXvS0)
- E-085: [How to embed an iframe in Confluence page?](https://www.youtube.com/watch?v=yfBKOUrVP9A)
- E-086: [Embed API Documentation into Confluence with OpenAPI/Swagger](https://www.youtube.com/watch?v=whQ4-2rC1hU)
- E-087: [Microsoft Power BI for Confluence - How to embed Power BI report in Atlassian Co](https://www.youtube.com/watch?v=jJ_Nkz4tnCU)
- E-088: [How To Embed Figma Files In Confluence [Design Guide]](https://www.youtube.com/watch?v=6I9I8Z5cW_A)
- E-089: [Bulk import HTML pages in Confluence](https://www.youtube.com/watch?v=gWvcYA42iGk)
- E-090: [How To Use Smart Links In Confluence [Productivity Tip]](https://www.youtube.com/watch?v=QtZn3k0Nyq0)
- E-091: [HTML Macro for Confluence error: Using the new editor template](https://appfire.atlassian.net/wiki/spaces/HTMLM/pages/358318258/Issue+using+new+editor+template+-+HTML+macro+error)
- E-095: [Using attached data as src for CSS and JS inside HTML Macro?](https://community.atlassian.com/forums/Confluence-questions/Using-attached-data-as-src-for-CSS-and-JS-inside-HTML-Macro/qaq-p/1522260)
- E-096: [height of an iframe in a Confluence app expands infinitely when the html/body se](https://community.atlassian.com/forums/Confluence-questions/height-of-an-iframe-in-a-Confluence-app-expands-infinitely-when/qaq-p/2760401)
- E-097: [Unable to auto detect variable height in HTML Macro with Zingtree](https://appfire.atlassian.net/wiki/spaces/HTMLM/pages/358121504/Unable+to+auto+detect+variable+height+in+HTML+Macro+-+Zingtree)
- E-098: [How to resolve the page not rendering properly for HTML macro](https://appfire.atlassian.net/wiki/spaces/SUPPORT/pages/89133538/How+to+resolve+the+page+not+rendering+properly+for+HTML+macro)
- E-099: [FAQs: HTML Macro for Confluence Cloud App](https://appfire.atlassian.net/wiki/spaces/SUPPORT/pages/555155533/FAQs+HTML+Macro+for+Confluence+Cloud+App)
- E-100: [HTML Macro can's work properly](https://community.atlassian.com/forums/Confluence-questions/HTML-Macro-can-s-work-properly/qaq-p/2998224)
- E-101: [HTML macro alternatives for adding custom CSS to a Confluence Cloud page](https://community.atlassian.com/forums/Confluence-questions/HTML-macro-alternatives-for-adding-custom-CSS-to-a-Confluence/qaq-p/2264970)
- E-103: [Solved: How to enable HTML Macro on Confluence cloud](https://community.atlassian.com/forums/Confluence-questions/How-to-enable-HTML-Macro-on-Confluence-cloud/qaq-p/1068527)
- E-104: [Common Issues and Limitations — HTML Macro for Confluence (Narva)](https://help.narva.net/html-macro-for-confluence/common-issues-and-limitations)
- E-105: [HTML Macro Security (Narva)](https://help.narva.net/html-macro-for-confluence/html-macro-security)
- E-106: [2025 app pricing: HTML Macro for Confluence Cloud](https://appfire.com/pricing-updates/html-macro-confluence-cloud)
- E-107: [Building an Internal App to Host and Share AI-Generated HTML Artifacts - InterWo](https://interworks.com/blog/2026/06/26/building-an-internal-app-to-host-and-share-ai-generated-html-artifacts/)
- E-108: [HTML Share: A Story of Solving a Problem with a Simple App - InterWorks](https://interworks.com/blog/2026/05/20/html-share-a-story-of-solving-a-problem-with-a-simple-app)
- E-109: [Why can't anyone build a decent deployment platform for plain HTML?](https://news.ycombinator.com/item?id=48275936)
- E-110: [HN comment: "Really annoying but I can't figure out how to share a link from Cla](https://news.ycombinator.com/item?id=47810597)
- E-111: [Show HN: MCP server that turns local files into a shareable link instantly](https://news.ycombinator.com/item?id=47413781)
- E-112: [Om Patel on X — Claude shared artifacts indexed publicly](https://x.com/om_patel5/status/2081494782396747779)
- E-113: [Claude lacks knowledge of claude.ai artifact sharing — gives incorrect alternati](https://github.com/anthropics/claude-code/issues/71290)
- E-114: [I vibe-coded an internal tool that slashed my content workflow by 4 hours - DEV ](https://dev.to/dumebii/i-vibe-coded-an-internal-tool-that-slashed-my-content-workflow-by-4-hours-310f)
- E-115: [Handoff - Share AI-Generated HTML Artifacts with Instant URLs](https://handoff.host/)
- E-116: [PageDrop.io vs Handoff vs VibeShare: HTML Sharing Compared (2026) - Handoff Blog](https://handoff.host/blog/pagedrop-vs-handoff-vs-vibeshare/)
- E-117: [Create, edit, and render HTML files natively in Box – Box Support](https://support.box.com/hc/en-us/articles/52424402391443-Create-edit-and-render-HTML-files-natively-in-Box)
- E-118: [Rovo makes AI-native teamwork real for the enterprise - Inside Atlassian](https://www.atlassian.com/blog/company-news/rovo-team-26)
- E-119: [Enterprise vibe coding: how to deploy AI-generated apps safely | Blog — Northfla](https://northflank.com/blog/enterprise-vibe-coding-how-to-deploy-ai-generated-apps-safely)
- E-120: [Publish and share artifacts | Claude Help Center](https://support.claude.com/en/articles/9547008-publish-and-share-artifacts)
- E-121: [Html macro - Secuirty Considerations](https://community.atlassian.com/forums/Confluence-questions/Html-macro-Secuirty-Considerations/qaq-p/1690180)
- E-122: [How to disable HTML Macros](https://community.atlassian.com/forums/Confluence-questions/How-to-disable-HTML-Macros/qaq-p/1280613)
- E-123: [Solved: Disabling HTML macros on specific spaces.](https://community.atlassian.com/t5/Confluence-questions/Disabling-HTML-macros-on-specific-spaces/qaq-p/1071464)
- E-124: [Enable XSS protection in HTML or HTML include Macro](https://community.atlassian.com/forums/Confluence-questions/Enable-XSS-protection-in-HTML-or-HTML-include-Macro/qaq-p/1576950)
- E-125: [Solved: HTML Macro without JS and CSS capability](https://community.atlassian.com/forums/Confluence-questions/HTML-Macro-without-JS-and-CSS-capability/qaq-p/685013)
- E-127: [Marketplace and custom app access control coverage summary for Confluence Cloud ](https://support.atlassian.com/security-and-access-policies/docs/app-access-rule-coverage-summary-for-confluence-cloud/)
- E-128: [Control app access to content in Jira and Confluence with a new app access rule ](https://community.atlassian.com/forums/Trust-Security-articles/Control-app-access-to-content-in-Jira-and-Confluence-with-a-new/ba-p/2712247)
- E-129: [Data residency - Forge](https://developer.atlassian.com/platform/forge/data-residency/)
- E-130: [Meeting enterprise requirements effortlessly: Tips for avoiding app data egress ](https://www.atlassian.com/blog/developer/no-egress-on-forge)
- E-131: [Your current Jira apps are possibly transferring data to third parties](https://www.forge-apps.com/blog/jira-forge-apps-runs-on-atlassian-security-data-protection)
- E-132: [Confluence Whiteboards vs. Marketplace Diagram Apps - What's Your…](https://community.atlassian.com/forums/Confluence-Whiteboards/Confluence-Whiteboards-vs-Marketplace-Diagram-Apps-What-s-Your/td-p/2844834)
- E-133: [Solved: How do I add an iframe to a confluence page?](https://community.atlassian.com/forums/Confluence-questions/How-do-I-add-an-iframe-to-a-confluence-page/qaq-p/2313391)
- E-134: [Embed a Confluence page to any product using Smart Links](https://community.atlassian.com/forums/Confluence-articles/Full-speed-embed-Introducing-a-new-way-to-Smart-Link/ba-p/1911946)
- E-135: [What's the best practice around Cloud User-Installed Apps?](https://community.atlassian.com/forums/Jira-questions/What-s-the-best-practice-around-Cloud-User-Installed-Apps/qaq-p/3194543)
- E-136: [Understanding Third-Party App Security in the Atlassian Ecosystem](https://community.atlassian.com/forums/Trust-Security-discussions/Understanding-Third-Party-App-Security-in-the-Atlassian/td-p/2710242)
- E-137: [Solved: Admin approval of marketplace app purchase not wor…](https://community.atlassian.com/forums/Confluence-questions/Admin-approval-of-marketplace-app-purchase-not-working/qaq-p/2562841)

## Additional wave-2 competitor/SERP sources (not in the evidence log)

- OST Labs HTML Macro Pro (1235901) — https://marketplace.atlassian.com/apps/1235901/html-macro-pro-for-confluence
- Mosaic HTML macro announcement (Kolekti) — https://www.kolekti.com/resources/blog/mosaic-html-macro-announcement
- Aura HTML (iframe) macro docs — https://appanvil.atlassian.net/wiki/spaces/AC/pages/2763718708
- Just Add+ HTML Macro docs (Atlas Authority) — https://atlasauthority.atlassian.net/wiki/spaces/MARKDOWNCLOUD/pages/2970320897/HTML+Macro
- Yamuno HTML Macro launch — https://yamuno.com/blogs/html-macro-for-confluence-launch
- Iframes for Confluence (1215813) — https://marketplace.atlassian.com/apps/1215813/iframes-for-confluence [low evidence]
- HTML Macro (1231085) — https://marketplace.atlassian.com/apps/1231085/html-macro [low evidence]
- HTML for Confluence, Server/DC lineage (252) — https://marketplace.atlassian.com/apps/252/html-for-confluence
- RFC-136 Forge staticView Macro thread — https://community.developer.atlassian.com/t/rfc-136-forge-staticview-macro-for-confluence-connect-migration-feedback/100892 [title confirmed; content unreadable this session]
- SERP observations: 13 queries recorded 2026-08-02 (composition documented in `03_seo_content_map.csv`); locale US (search tool default); result counts not used as demand evidence per brief.
