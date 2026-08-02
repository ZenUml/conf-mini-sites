# Positioning recommendation — messaging decision

Derived from `02_jtbd_top20.md` (wedges) and `05_competitive_landscape.md` (occupied positions).
Everything here is a recommendation grounded in cited evidence; nothing has been changed on the
listing or site (per brief authorization boundary).

## Category statement

**"Publish real files as a live mini-site on a Confluence page."** Category: *mini-site / static
bundle publishing for Confluence* — deliberately NOT "another HTML macro" (commoditized, weak-rated
incumbents own the term — S7, E-091–E-106) and NOT "app platform" (Forge owns that) and NOT
"dashboards" (capability-disqualified for live data, JTBD-08).

## One-sentence value proposition

> Upload a folder of HTML, CSS and JavaScript and it runs live, interactive and permission-inherited
> on your Confluence page — the real thing, not a screenshot, not a converted wiki page, not a
> public link.

(Every clause is evidence-anchored: folder = D-02/E-095; live vs converted = E-074/SERP `upload html
folder`; permission-inherited vs public link = E-005/E-112; not a screenshot = E-012/E-024.)

## Three proof pillars

1. **Real files, whole folders.** Relative paths and nested assets preserved — no `<body>`-tag
   mangling (E-094), no single-snippet box (Appfire model), no fragile attachment mode (E-104).
   Proof: live demo bundle + 60-second publish video.
2. **Safe by architecture, honest about hosting.** Isolated non-routable sandbox per macro instance,
   strict CSP, secret scanning at publish, access inherited from page permissions. Stated limits
   published (no external API calls, no forms, no host-page access — E-063/E-093 boundary). Proof:
   security-model page (content cluster C11). **Honesty requirement:** bundle bytes are hosted on
   Cloudflare, not Atlassian — say it before the security reviewer discovers it (E-129–E-131 shows
   "runs on Atlassian / no egress" is an active evaluation criterion).
3. **Where your team already reads.** The artifact runs inside the page that carries its context —
   no second login, no stale exports, no "who has the link" (E-107, E-110, E-112).

## Three anti-positioning statements (what we do NOT claim)

1. **Not a live-data dashboard tool.** No external API calls from bundles today; Grafana/Tableau/
   Power BI embedding is served by outcome-specific apps (JTBD-08 rejected; C09 do-not-create).
2. **Not a page-DOM/theming tool.** Content cannot read or modify the host page — by design, same as
   every Cloud app (E-092/E-093); migration buyers must hear this before purchase (JTBD-03 guide).
3. **Not a database/forms tool.** Confluence Databases and form apps own structured data and input
   collection (JTBD-09/JTBD-14 rejected; `form-action 'none'`).

## Lead order (H2/H3 resolution)

Lead with the **scenario wedges** backed by a capability page — not capability-first:
1. JTBD-01 "publish a folder live" (pillar C01) — the owned category;
2. JTBD-15 "publish what your AI built — org-only" (pillar C05) — the growth wedge;
3. JTBD-02 capability/comparison page (C03) — captures existing category search without leading the
   brand with it.

## Marketplace listing recommendation (recommendation only — no changes made)

- **Name consistency:** the discoverable name is the plural "**Mini Sites for Confluence**" (S1
  verification: singular surfaces nothing); use the plural everywhere and align internal docs.
- **Title/tagline:** "Mini Sites for Confluence — publish a folder of HTML/CSS/JS as a live,
  permission-inherited mini-site on your page."
- **First sentence:** the one-sentence value proposition above (folder → live → permissioned).
- **Three highlights:** (1) Real files, whole folders — relative paths intact; (2) Isolated sandbox +
  secret scan + inherited page permissions; (3) From AI artifact or build output to a working page in
  under a minute.
- **Screenshot story (5):** upload panel with folder → validation/secret-scan step → live interactive
  render inline → same page viewed by a permitted teammate → limits/security panel. (Current media
  already follows a similar arc — `docs/listing/marketplace/README.md`; add the limits/trust frame.)
- **Demo video concept:** 35–45s: real folder on desktop → drag in → publish → click through the live
  mini-site inline → permission denied view for an outsider. First 15 seconds must show the live
  render (H11).
- **Use-case ordering on the listing:** generated/AI artifact → prototype/tool folder → decision-tree
  sample → (only then) "HTML on Cloud" capability framing. Calculator demoted to an example row
  (JTBD-06 evidence historical).
- **Trust proof:** link the C11 security-model page; state the Cloudflare hosting fact plainly with
  the isolation/permissions explanation; keep the "requests no Confluence API scopes / does not read
  page content" language already indexed on the vendor page (S1 verification) — it is differentiating
  and true.
- **SEO note:** the listing itself is currently invisible in organic search (S1) — Marketplace SEO
  fields (title/summary keywords) should carry "publish HTML folder", "static site", "mini-site"
  language, and the product site pillars (C01/C05/C11) must carry organic acquisition until the
  listing indexes.

## Risks to this position

1. **Narva's attachment mode** already gestures at files; if they ship reliable multi-file rendering
   the differentiation narrows to isolation+permissions+workflow (watch: threat #1 in
   `05_competitive_landscape.md` §6).
2. **"Runs on Atlassian" attack** on Cloudflare hosting (E-129–E-131) — mitigation: proactive
   disclosure + (roadmap question) Forge-hosted storage option (`docs/adr/0001` discussed WfP vs R2;
   a Forge-native storage mode is the strategic hedge — open question OQ-3).
3. **Platform absorption** (staticView macro, Rovo — E-073/E-118): moat is the publish workflow +
   governance, not rendering; keep shipping workflow depth (versioning, preview, API publish).
4. **Free-floor pressure** (Yamuno, OST free tier) on the snippet job — do not price-anchor against
   snippet macros; anchor against engineering time and external hosting (H8 evidence: D-07/E-071-072).

## Appendix — community participation queue drafts (DO NOT POST; per brief, drafts only)

**Draft for D-01 (qaq-p/3240107, "Adding HTML Directly in Confluence Pages"):** factual answer
explaining why the native macro was removed (XSS), that sandboxed-iframe Marketplace apps are the
sanctioned route, the difference between paste-a-snippet apps and folder/bundle publishing, with no
product pitch unless the thread asks for options — then a single neutral mention alongside
competitors.

**Draft for D-02 (qaq-p/2806119, "upload a HTML files project folder"):** factual answer
distinguishing (a) the native HTML importer (converts files to wiki pages — links/scripts lost) from
(b) live-serving approaches (external hosting + iframe; bundle-hosting apps), with an honest list of
options across vendors.
