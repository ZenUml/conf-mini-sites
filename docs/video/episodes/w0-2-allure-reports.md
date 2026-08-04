# W0-2 — Allure Reports on Confluence

Prepared: 2026-08-04

Status: fixture rejected on 2026-08-04; Owner gate ① remains blocked pending an unmodified exporter that passes current CSP, or a separately approved CSP compatibility change

Series basis: `docs/research/market-opportunity-2026-08/12_youtube_series_plan.md` at approved commit `57e863b`

This episode tests the QA-report wedge with a real generated artifact. It is about sharing one captured test run, not turning Confluence into a live test-management dashboard.

Execution finding: `docs/fixtures/` does not yet exist, and no W0-2 fixture has been accepted or checked in. A real Allure 2.43 multi-file export passed generic offline, bundle, and secret-scan checks but failed the current product-shaped CSP check. The disposable proof at `/private/tmp/w02` is evidence for this decision only; it is not a distributable fixture or recording asset.

## 1. Content cluster

- Cluster ID: **S06**.
- Primary query: **Allure report Confluence**.
- Working title: **Allure Reports on Confluence**.
- Search intent: a QA engineer has a generated Allure report and needs stakeholders to browse that static result in the Confluence page where release status is discussed.
- Outcome framing: open on the release decision and its test evidence, then explain that the input is an offline report folder.

## 2. Audience

Primary viewer: a QA engineer or test lead who owns a repeatable test run and needs to hand a readable test snapshot to developers, release managers, or non-QA stakeholders.

The fit viewer:

- can generate an Allure report from a real automated test run;
- is comfortable publishing a snapshot when the run changes;
- needs filters, suites, test details, and local attachments to work without a separate report host;
- does not require TestRail/Testomat to remain the live source of truth inside the page.

## 3. Truthful promise

Canonical spoken/on-screen claim, conditional on the fixture acceptance below:

> Publish a generated, offline Allure report folder on a Confluence page so teammates can browse that captured test run in context.

Required qualifiers:

- Say **generated**, **offline**, **folder**, and **captured test run**.
- “Offline” means all report runtime assets required by the recorded journey are local and the report works without outbound internet access. It does not require `file://`; a local same-origin HTTP server is a valid pre-upload verification because Mini Sites also serves the bundle over HTTP.
- Do not say “live report,” “sync,” “automatic updates,” “CI publishing,” “test-management integration,” or “dashboard connector.”
- Do not use the post-T01 target promise in any public script before T01 online verification.
- If the accepted Allure generator produces only a single file, this wave-0 episode is blocked until T01 is online-verified or a real multi-file export is selected; do not add a dummy asset to evade the current contract.

## 4. Required proof

The fixture must pass every row before the script can enter Owner gate ①.

| Proof beat | Real source/action | Claim it supports | Acceptance condition |
|---|---|---|---|
| Provenance | Run a small checked-in automated test suite with at least one passing and one intentionally failing test | The report is generated from a real run, not hand-authored for the video | Commands, source revision, runner versions, and raw `allure-results` directory are recorded |
| Static generation | Generate the report using the exact commands confirmed by mini-sites-dev | The input is a reproducible Allure artifact | Output has a root `index.html`, more than one genuine file, only relative bundle paths, and no secrets |
| Offline acceptance | Serve the generated folder locally, block outbound network, and exercise the exact journey planned for the video | The recorded journey does not depend on a CDN, API, or hosted Allure service | Initial load, overview, suite/filter navigation, one passed test, one failed test, trace/attachment view, and back navigation work with zero outbound requests, failed local requests, or console errors |
| Result integrity | Compare visible totals/statuses and the selected failure message with the raw test result | The report shown is the output of that run | Counts and failure evidence match; no edited success state or fabricated test history |
| Continuous publish path | Record selecting the whole generated folder → Publish → the report rendering in the Confluence page | The accepted offline folder works through Mini Sites | Same accepted fixture and same run ID/checksum are used; no reconstructed result frame |
| In-page interaction | Exercise the same accepted overview/detail journey in the published report | The report remains browsable after publication | The recorded controls work without console errors or outbound requests |

The final fixture location is `docs/fixtures/w0-2-allure/`. Its package must include a short README, reproducible source/config/lockfile, raw `allure-results/`, generated `allure-report/`, verification script, generation commands, tool versions, expected pass/fail counts, known exclusions, redistribution/licence review, and final SHA-256. It must be usable for the video, the S06 guide download, and discovery outreach without modification.

### Read-only compatibility result — 2026-08-04 AEST

The disposable reproduction used:

- Node 24.18.0;
- pnpm 10.33.2;
- Playwright 1.61.0;
- `allure-playwright` 3.10.2;
- Allure CLI 2.43.0;
- Java 17.0.5.

Generation recipe:

```sh
cd /private/tmp/w02
pnpm install --frozen-lockfile
pnpm run clean
pnpm run test:allure
# Expected exit: 1. Accept only when the raw output is exactly 1 passed + 1 deliberate failure.
pnpm run report:generate
python3 -m http.server 4174 --bind 127.0.0.1 --directory allure-report
```

In a second terminal:

```sh
cd /private/tmp/w02
node scripts/verify-offline.mjs http://127.0.0.1:4174/
```

`report:generate` is pinned to:

```sh
ALLURE_NO_ANALYTICS=true allure generate ./allure-results --clean --output ./allure-report
```

The literal boolean `true` is load-bearing for this Allure 2.43 candidate; without analytics opt-out, the generator injects a Google Tag Manager URL.

Verified candidate facts:

| Check | Result |
|---|---|
| Real run | Exactly one passing test and one intentional assertion failure; each has a JSON attachment |
| Bundle shape | One root `index.html`; 38 genuine files; 1,959,623 bytes |
| Current repository validator | Pass; content hash `sha256-4a0a87342c7d1d66abb4ef3de6aa24036bd9c698ba40f7b50389e613d9d2c481` |
| Current repository secret scan | Pass with zero hits when generated in the short sanitized workspace |
| Generic offline journey | Pass: overview, counts, suite navigation, passed detail/attachment, failed detail/attachment, back navigation; 0 outbound requests, 0 failed local requests, 0 console errors |
| Current product-shaped `<base>` + CSP | **Reject:** the same journey emits four CSP console errors because Allure embeds `data:font/woff*` while the current CSP has no `font-src`, so `default-src 'self'` blocks them |

The hash above identifies this disposable run only. A final candidate must be generated again from checked-in source and frozen under the final library path.

Additional compatibility observations:

- A longer generation path previously caused a high-entropy secret-scan false positive through an absolute stack path. The final recipe must enforce a short sanitized workspace or separately fix the scanner false positive; it must never suppress the scan.
- Allure 3.14.3 produces local font files but retains a Google Tag Manager request even with `ALLURE_NO_ANALYTICS=true`; it is not an offline candidate as generated.
- Allure 2.29 still embeds data fonts and therefore does not avoid the current CSP boundary.
- The generated report must not be edited after generation to remove analytics, rewrite fonts, or add a dummy asset.

### Gate and dependency decision

W0-2 does **not** depend on T01 when using this genuinely multi-file export. It remains fixture-gated because no unmodified Allure export has passed every current-product check.

W0-2 may enter Owner gate ① only after one of these paths succeeds:

1. A separately approved engineering change—candidate: `font-src 'self' data:`—passes security review plus unit, API/E2E, product-CSP, and same-checksum dev publish/render verification; or
2. A different unmodified real Allure exporter passes the complete matrix under the existing CSP.

The first option is the smallest compatibility hypothesis because it keeps runtime fonts local and does not add an outbound origin, but it is a CSP/security product decision, not authorized by this brief. The second preserves the existing CSP but no passing exporter is known yet.

## 5. CTA

Primary CTA:

> Run the sample tests, generate the same offline report, and try that Allure bundle on a test page.

CTA rules:

- Link to the reproducible fixture and S06 guide, not a generic blank upload.
- State the tested Allure generator/version next to the download; do not imply all Allure variants are compatible.
- The Marketplace link appears only after the offline/static suitability check.

## Mandatory “What doesn’t work” segment (at least 15 seconds)

| Need | Honest route |
|---|---|
| Live TestRail or Testomat charts that refresh automatically | Use their supported integration or a frameable hosted view; a static snapshot does not satisfy live status (E094, E100) |
| CI-triggered automatic publication | Keep it out of this episode; CI/API publishing is a later evidence-gated roadmap question |
| Authenticated external APIs or drill-down into a live service | Use a specialist app or a purpose-built Forge integration; the artifact cannot fetch authenticated external data (E029) |
| Shared annotations, test edits, or source-of-truth management | Keep those in the test-management system; this episode publishes a read-only captured result |

Also state the ordinary update path without overclaiming: a new run requires regenerating the snapshot and publishing the new folder. Do not claim version history, rollback, or diff.

## Producer handoff constraints

- W0-2 script production is paused. mini-sites-dev owns fixture generation and compatibility confirmation; the producer must not invent commands or repair generated source to make it pass.
- Record the generator and report versions in the slate/QC package; only audience-relevant details need appear in the final cut.
- Script, Picture Lock, and upload each require their separate Owner gate.
- Capture only on the approved production recording site; no dev/staging labels or internal test pages may appear.
- If offline verification, result integrity, or in-product rendering fails, stop and return bounded evidence to mini-sites-dev. Editing around the failure is prohibited.

## Evidence anchors

- **E022:** direct relative-asset failure when sharing an Allure report; likely Server/Data Center and already externally hosted, so it supports the problem shape rather than current Cloud prevalence.
- **E083:** historical Cloud adoption evidence for internally generated QA reports; artifact shape unverified.
- **E094, E100:** current counterevidence showing why live TestRail/Testomat needs must be routed away from a static snapshot.
- **E029:** no authenticated external-data promise under the current CSP/network boundary.
- Compatibility criteria: `src/pipeline/bundleValidation.ts`, `src/pipeline/secretScan.ts`, and `src/dispatch/forgeGateway.ts`.
