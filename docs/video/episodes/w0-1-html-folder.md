# W0-1 — Publish an HTML Folder on Confluence

Prepared: 2026-08-04

Status: brief ready for script drafting; script, capture, Picture Lock, and upload are not approved

Series basis: `docs/research/market-opportunity-2026-08/12_youtube_series_plan.md` at approved commit `57e863b`

This is the opening episode of “XXX on Confluence.” It must make the current folder workflow concrete without implying that the exact multi-file wedge is already market-validated.

## 1. Content cluster

- Cluster IDs: **S04 / P04**.
- Primary query: **upload HTML folder to Confluence**.
- Working title: **Publish an HTML Folder on Confluence**.
- Search intent: a creator already has a built folder with a root `index.html` and supporting files and needs a place to publish the result, not a tutorial on writing HTML.
- Outcome framing: lead with the working Feature Prioritisation artifact; “HTML folder” is the bridge to the workflow, not the product category.

## 2. Audience

Primary viewer: a developer, QA engineer, or technical writer who can produce a browser-ready folder but does not want to create a repository, public URL, or separate hosting project.

Their starting state is specific:

- the artifact has a root `index.html`;
- CSS, JavaScript, JSON, images, and fonts use relative paths;
- the artifact is useful as a self-contained snapshot or local interaction;
- the creator wants teammates to use it where the related Confluence work is discussed.

Do not broaden this viewer into someone who needs live APIs, a server-side application, host-page automation, or shared persistence.

## 3. Truthful promise

Canonical spoken/on-screen claim:

> Publish a built HTML/CSS/JS folder directly on a Confluence page, preserving its relative files without a separate host.

The opening and thumbnail may shorten this to “Publish an HTML folder on Confluence,” but the episode must establish “built,” “folder,” and “relative files” before the first product CTA.

Version guardrails:

- Use only the folder promise above until T01 has shipped and been verified online.
- Do not use the target promise about AI-generated reports, prototypes, or local-only tools.
- Do not say the exact folder job is proven or prevalent. The research found exact-shape evidence, but it is historical or deployment-unverified (E082, E022, E031, E084).
- Do not claim universal privacy or permission behavior. This episode does not include a two-account permission test.

## 4. Required proof

The producer may choose the scene order, but every published capability claim must point to a real recorded action below.

| Proof beat | Real source/action | Claim it supports | Acceptance condition |
|---|---|---|---|
| Artifact identity | Show the exact `promo/site/` tree: root `index.html`, `styles.css`, `app.js`, `assets/features.json`, and `assets/logo.svg` | This is a real multi-file folder, not a recreated result frame | The uploaded bytes are the same fixture bytes shown before upload |
| Continuous publish path | Record folder selection → manifest/checks → Publish → rendered macro on the Confluence page | A built folder can be published in the page | No simulated progress, reconstructed success screen, or cut to a different fixture |
| Relative CSS and image proof | The published page visibly uses `styles.css` and renders the local logo | Supporting files resolve after publication | Capture and QC show the requests resolving from the published bundle |
| Relative data and JavaScript proof | In the published artifact, vote once, switch Impact/Effort sorting, and open/close the detail panel | Local JavaScript and a relative JSON fetch remain interactive | Vote changes 4 → 5; three sort orders differ; the panel opens and closes without console/page errors |
| Narrow-view sanity | Show the published artifact at the actual macro width | The example is usable in its recorded Confluence view | No horizontal overflow in the recorded viewport; do not imply a general large-view fix |

Fixture facts rechecked locally on 2026-08-04 with `node promo/verify-site.mjs`: all assertions passed; the vote changed 4 → 5, the three sort orders differed, the detail panel worked, and the 1000 px viewport had no horizontal overflow. That local result validates the fixture itself, not the production publish path; the latter must still be captured on the approved recording site.

## 5. CTA

Primary CTA:

> Download this exact sample folder and publish it to a test page.

CTA rules:

- The download must be the same version of `promo/site/` used in the recording, copied into the approved fixture library with a checksum before metadata lock.
- Link first to the S04/P04 guide and sample. The Marketplace install link appears only after the viewer has selected the folder/artifact path.
- Use “Try a sample folder,” not “Try an AI artifact,” until the T01 public-claim gate opens.

## Mandatory “What doesn’t work” segment (at least 15 seconds)

State the boundary as routing guidance, not fine-print:

| Need | Honest route |
|---|---|
| An already-hosted, frameable URL | Use Confluence’s native iFrame macro; a second upload is unnecessary (E116) |
| Live or authenticated external data | Use the source product’s integration, an authenticated iframe where appropriate, or a purpose-built Forge app; the bundle CSP keeps `connect-src` on the served origin (E029) |
| Reading or changing the surrounding Confluence page | Build a Forge app; an isolated artifact cannot use the host-page DOM |
| Shared votes, database state, or cross-viewer progress | Use an application with a backend; this fixture’s vote state resets and is not shared |

Do not turn the last item into a failure demonstration that appears to lose real user data. Show it with the disposable demo fixture and say what the alternative is.

## Producer handoff constraints

- This brief is not the canonical script. The producer owns the scene script and storyboard under `docs/video/workflow.md`.
- The script must use the five scene columns: narration, visual action, evidence claim, recording environment, and masking note.
- Production capture waits for an Owner-approved P-1 recording site and a fresh production-version check.
- The three gates remain independent: Owner script approval, Owner Picture Lock, and Owner upload authorization.
- Follow `docs/video/safety.md`; do not expose dev/staging labels, internal page trees, account email, avatars, signed serve URLs, or credentials.

## Evidence anchors

- **E082, E031, E084:** exact or near-exact folder/relative-file jobs, with historical and deployment limitations.
- **E022:** an Allure report whose relative JavaScript path broke under another inclusion path; useful proof of the relative-assets problem, not current Cloud prevalence.
- **E113, E114:** mature external static-host substitutes; why Confluence placement, not generic hosting, must be the value.
- **E116:** native iFrame substitute for an already-hosted URL.
- **E029:** current CSP/network boundary.
- Current artifact and product facts: `promo/site/`, `promo/verify-site.mjs`, `src/pipeline/bundleValidation.ts`, and `src/dispatch/forgeGateway.ts`.
