# Research journal — method record

Execution date: **2026-08-02** (single-session agent execution of the 10-day brief; the day-by-day plan
in the brief §15 was compressed into phased parallel collection + synthesis in one session).
Executor: Claude Code session on the `conf-mini-sites` repo, branch `claude/read-and-execute-7bd7by`.

## Session 0 — Protocol and product truth (brief §15 "Day 1")

**Targets:** parse the brief; verify product truth against authoritative sources; define
inclusion/exclusion rules; establish taxonomy v0; test source access.

### Decisions and observations

- **Brief ingestion.** The brief arrived as an Apple Pages file; body + table text was extracted
  programmatically (raw-snappy IWA decoding) and transcribed to `99_source_brief.md`. Tables (minimum
  bars, scoring rubric, day plan, seed sources, taxonomy) recovered intact.
- **Product truth source upgrade.** Unlike the brief's assumed "Desktop Agent" (public listing only),
  this session runs inside the product's own repository. Product capability claims were verified
  against **source code and internal design docs**, which outrank listing copy for capability facts:
  - CSP served with every bundle (`src/dispatch/gateway.ts:146`, `src/dispatch/forgeGateway.ts:165`):
    `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
    img-src 'self' data:; connect-src 'self'; frame-ancestors <atlassian>; base-uri 'self';
    form-action 'none'`.
    Consequences: **no external API calls from bundles (connect-src 'self'), no CDN scripts/fonts, no
    external images (data: URIs OK), no form POST anywhere (form-action 'none')**. "Live data" today
    means data shipped inside the bundle or same-origin fetch of bundled files only.
  - Bundle limits (`src/pipeline/bundleValidation.ts:26-28`): ≤2000 files, ≤25 MiB/file, ≤50 MiB
    total. Secret scan at publish. No server-side runtime, no persistent storage, no write-back.
  - Isolation: per-instance Workers on Cloudflare WfP, non-routable, served via a grant-verifying
    dispatch Worker; sandboxed iframe in the page (no host-page DOM access). Permissions inherited via
    Forge (`CLAUDE.md`, `DESIGN.md`).
  - Naming note: repo/listing use "Mini **Sites** for Confluence" (app key
    `com.zenuml.confluence.minisite`, listing 4169123443, public since 2026-07-22); the brief says
    "Mini Site for Confluence". Treated as the same product; deliverables follow the brief's singular.
- **Prior internal research audit.** `docs/research/2026-06-27-mom-test-static-site-hosting.md` (an
  interview guide) and `validation/G2-demand-validation.md` (a demand-to-pay rubric) exist but contain
  **no recorded interview results** — demand beyond the n=1 anchor team was framed but never validated.
  This research is therefore the first systematic demand pass, consistent with the brief's premise.
- **Access constraints (recorded per brief §15 rhythm — "do not spend >20 min on a blocked source"):**
  - The sandbox's network policy **blocks direct page fetches** of marketplace.atlassian.com,
    community.atlassian.com, stackoverflow.com, reddit.com, developer.atlassian.com (HTTP 403 at the
    proxy). **WebSearch works** and returns titles, URLs, dates, and content snippets, including
    `site:` queries.
  - Consequence: evidence capture is **search-snippet-grade**: canonical URLs, titles, visible dates
    and excerpt text are captured; full-thread detail (complete comment chains, exact view counts) is
    frequently `unknown`. Every artifact records what was actually observed; nothing is inferred.
    This is disclosed in `00_executive_readout.md` and `08_open_questions.md` as a fidelity limit.
  - No keyword-volume tool is available → per brief §7, all volume fields are `unknown`; intent is
    inferred from SERP composition only.
- **Inclusion/exclusion rules (v0):** include user-authored artifacts expressing a job/constraint
  relevant to embedding/publishing interactive content in Confluence (Cloud preferred); exclude
  vendor-authored copy from demand counts (retained, flagged `vendor_authored`); exclude pure how-to
  answers with no expressed need; historical (>36 months) retained only with `historical` flag;
  duplicates grouped by underlying request.
- **Taxonomy v0** adopted from brief Appendix B verbatim (artifact / core job / creator / interaction /
  alternative / constraint / outcome signal) with the rule that clusters are built bottom-up and a
  category requires ≥3 artifacts sharing a core job.

### Orchestration record

- Evidence collection fanned out as 17 parallel research agents in one workflow
  (`mini-site-market-research-sweep`): 10 demand collectors by channel/angle (Atlassian Community ×3
  angles, Reddit, Stack Overflow/dev community, YouTube, Marketplace reviews ×2 classes, AI-generated
  apps angle, dedicated counterevidence collector), 4 competitor-class inventory agents, 3 SERP
  observers running the brief §12 query starters.
- Per operator instruction, collection agents ran on Opus (collectors/inventory) and Sonnet (SERP
  observers); synthesis, scoring, deduplication and all final writing were done in the main session.
- Integrity rules baked into every collector prompt: only record artifacts actually observed; never
  fabricate URLs/quotes/metrics; `unknown` when not visible; ≤25-word verbatim excerpts; counterevidence
  recorded with the same care; no posting, no contact, read-only.

*(Later sessions appended below as synthesis progressed.)*
