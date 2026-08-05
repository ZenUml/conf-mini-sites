# W0-5 — Four Ways to Put HTML on Confluence

Prepared: 2026-08-04

Status: brief ready for script drafting; the single-file row must be re-verified against production at script lock

Series basis: `docs/research/market-opportunity-2026-08/12_youtube_series_plan.md` at approved commit `57e863b`

This is the compatibility-chooser episode. Its success criterion is fewer wrong-path installs, not making Mini Sites win all four branches.

## 1. Content cluster

- Cluster IDs: **P01 / S12**.
- Primary queries: **embed HTML in Confluence Cloud** and **Confluence iframe alternative**.
- Working title: **Four Ways to Put HTML on Confluence**.
- Search intent: an admin or creator has “HTML,” but has not yet separated a pasteable snippet, an already-hosted URL, a self-contained file, and a local folder.
- SEO placement: this episode belongs in the existing P01 pillar. Do not create a second overlapping “HTML macro” pillar.

## 2. Audience

Primary viewer: a Confluence admin, technical creator, or developer selecting an implementation path before installing an app.

They need a fast answer to two questions:

1. What input do I actually have?
2. Does it need a live external source, or is it a self-contained artifact?

The episode should reward choosing a native or competing path when that path is a better fit. It is not a four-way feature comparison in which Mini Sites must win.

## 3. Truthful promise

Canonical spoken/on-screen claim for the pre-T01 production state:

> Start with the input you have: a snippet, a hosted URL, a self-contained file, or a local folder. Each needs a different Confluence path; Mini Sites is for the built folder path today.

The decision matrix at script lock is:

| Input | Pre-T01 truthful route | Evidence/condition |
|---|---|---|
| Pasteable HTML/CSS/JS snippet | Use a security-reviewed Marketplace HTML macro, or build a Forge macro when page-aware behavior is required | Mini Sites has no paste input; user demand distinguishes pasted code from external URL embedding (E014, E075) |
| Already-hosted, frameable URL | Use Confluence’s native iFrame macro | Native path is simpler when the target URL allows framing (E116) |
| One self-contained `index.html` file | Do not promise Mini Sites support before T01 online verification; route to an appropriate HTML macro or a host + iFrame path | The approved fix is not a public capability until shipped and verified; authoring-branch code at `57e863b` still rejects one file (E120) |
| Built folder with root `index.html` and relative assets | Use Mini Sites | This is the current wave-0 promise; prove it with the W0-1 fixture |

Freshness rule: immediately before Owner script gate ①, mini-sites-dev must report the verified production behavior of the one-file row. If T01 is online-verified first, growth revises this brief and the canonical script may use the target input promise. Do not record or publish a stale matrix, and do not show both states as if they coexist.

Forbidden shortcuts:

- Do not add a dummy CSS/JS file to make a one-file artifact look supported.
- Do not call a URL embed “uploading HTML.”
- Do not call a static artifact a live dashboard.
- Do not recommend bypassing `X-Frame-Options`, authentication, or site policy.

## 4. Required proof

| Proof beat | Real source/action | Claim it supports | Acceptance condition |
|---|---|---|---|
| Input-shape reveal | Show four real inputs side by side: a code snippet, a public URL, a one-file `index.html`, and the multi-file `promo/site/` tree | “HTML” describes materially different jobs | Each input is labelled by shape and update model, not by vendor |
| Snippet branch | Put the snippet in a native Confluence code block to establish that it is code, then route to a vetted HTML-macro category or Forge | Mini Sites is not a paste-snippet product | Do not fabricate a rendered result; installing or recording a third-party macro requires a separate Owner-approved cloud change |
| URL branch | Embed an Owner-approved, public, non-authenticated, frameable demo URL with the native iFrame macro | An existing URL often needs no uploaded-artifact app | The real URL renders; its framing headers and permission implications are checked before recording |
| One-file branch | Record the actual production behavior at script lock | The chooser reflects the version viewers can install | Pre-T01: show and name the real rejection plus the next action. Post-T01: use only an online-verified success flow after growth revises the brief |
| Folder branch | Publish the exact W0-1 `promo/site/` folder and interact with it | A local multi-file artifact is the Mini Sites fit | Real folder selection → Publish → page render; relative CSS, JS, JSON, and image requests succeed |
| End-state chooser | Return to one four-row matrix with the chosen tool category and boundary for each | The viewer can select a path before installing | The row labels, spoken guidance, and captured product behavior agree exactly |

The title can remain “Four Ways,” but a real working result is required only for paths available on the approved recording site. Unsupported or separately governed paths must be shown as honest routing decisions, never mocked as product output.

## 5. CTA

Primary CTA:

> Choose the sample that matches your input. Install Mini Sites only if you have a compatible artifact path.

CTA package:

- P01 four-row compatibility table with a recorded-as-of product version/date.
- One safe sample per input shape; only the folder sample has a Mini Sites install CTA before T01 verification.
- Official native iFrame documentation for the URL path.
- A limits link before the Marketplace link.

## Mandatory “What doesn’t work” segment (at least 15 seconds)

The chooser itself reduces wrong-fit installs, but it still needs a named limits segment:

| Failure/boundary | Next action |
|---|---|
| Target URL blocks framing with browser/security headers | Use the source product’s supported Confluence integration, or obtain an exportable artifact; do not bypass the header (E116) |
| Content needs live/authenticated data | Use a specialist integration or Forge app; an isolated static artifact is the wrong architecture (E029, E094, E100) |
| Content must read or change the surrounding Confluence page | Use Forge; neither a native iFrame nor an isolated uploaded artifact supplies host-page DOM access |
| One-file input is rejected in the verified production version | Name the unsupported shape and link to the compatible alternative; never ask the viewer to add a meaningless second file (E120) |

## Producer handoff constraints

- This episode is version-sensitive. Include the production app version/date in the QC evidence and recheck it on the day of capture.
- Do not install a competitor, create an external host, or change the P-1 tenant under this brief. Any such cloud action needs Owner authorization.
- A vendor/documentation screen is supporting evidence, not a substitute for a product result. Keep excerpts short and source-labelled.
- Script, Picture Lock, and upload remain three separate Owner gates.
- The public cut must not contain the post-T01 target promise before T01 has been verified online.

## Evidence anchors

- **E003, E014, E075:** Cloud users seek HTML rendering and distinguish pasted code from embedding an external site.
- **E116:** official native iFrame capability and the framing-header limitation.
- **E120:** single-file rejection in the authoring baseline; recheck production before relying on it.
- **E029:** current network boundary for uploaded artifacts.
- **E094, E100:** live test dashboards are real jobs but outside a static artifact path.
- Current UI/validator facts at the approved plan commit: `forge-app/ui-src/publisher.js` and `src/pipeline/bundleValidation.ts`.
