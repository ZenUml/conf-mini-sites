# T01 engineering handoff — single root `index.html` bundle

**Decision status:** Approved by Owner on 2026-08-03

**Implementation owner:** `mini-sites-dev`

**This document's owner:** `mini-sites-growth`

**Scope boundary:** Contract and acceptance specification only. No implementation, deployment, release, Marketplace change, or external claim is authorized here.

## 1. Decision

Mini Sites MUST accept a bundle containing exactly one file when that file's manifest path is exactly the lowercase root path `index.html`.

This changes the minimum file count from two to one. It does not create a paste editor, a plain-file picker, or a second upload transport. The existing folder picker may accept a selected folder that contains only `index.html`; T02 still owns any future paste-first or deliberate one-file chooser.

## 2. Why this decision exists

| Evidence | Decision relevance |
|---|---|
| E088 | A current Cloud user describes a self-contained, single-file certification simulator and specifically asks for better handling plus actionable diagnostics. |
| E097 | A 2026 GitHub requirement specifies one clean HTML report for Confluence, with accordions and sticky headers. |
| E104 | A 2026 user describes the sharing friction of a single AI-generated HTML artifact across devices. This is adjacent rather than direct Confluence proof, so it supports input-shape testing, not market-size claims. |
| E120 | Verified product fact: the present validator rejects `files.length <= 1` as `BUNDLE_NOT_MULTIFILE`, creating the exact contract mismatch T01 removes. |
| E075, E089 | Supporting evidence for avoiding external hosting and making creators' own HTML easy to place in Confluence. These support the workflow, not the exact file-count rule. |
| E029 | Verified product fact: the serving CSP blocks outbound network access. Single-file acceptance does not weaken that boundary. |

The decision validates an input hypothesis; it does not prove recurrence, admin approval, conversion, or willingness to pay.

## 3. Verified current state

These are observations from the repository before implementation:

| Current fact | Verified location |
|---|---|
| `BundleErrorCode` includes `BUNDLE_NOT_MULTIFILE`. | `src/pipeline/bundleValidation.ts:30-38` |
| The authoritative validator rejects `files.length <= 1` before checking the root entrypoint. | `src/pipeline/bundleValidation.ts:131-152` |
| Root entrypoint matching is exact and case-sensitive: `path === "index.html"`. | `src/pipeline/bundleValidation.ts:51,149-151` |
| Path checks reject URL/protocol-relative/leading-slash paths and `..` segments. | `src/pipeline/bundleValidation.ts:91-113,154-158` |
| Defaults are 2,000 files, 25 MiB per file, and 50 MiB total; boundaries are inclusive. | `src/pipeline/bundleValidation.ts:26-28,160-173`; `src/pipeline/bundleValidation.test.ts:135-142` |
| Content type is derived from the path extension; `index.html` becomes `text/html; charset=utf-8`. | `src/pipeline/bundleValidation.ts:53-84,175-185` |
| The publish pipeline runs validation, then secret scan, then staging/job creation; a scan hit returns before persistence. | `src/pipeline/uploadPipeline.ts:30-58` |
| The current Forge picker independently rejects fewer than two files and emits `too_few_files`. | `forge-app/ui-src/publisher.js:94-115`; `src/analytics/miniSiteEvents.ts:77-83` |
| The UI failure mapper handles legacy `BUNDLE_NO_INDEX` and `BUNDLE_NOT_MULTIFILE`, but not canonical `MISSING_INDEX_HTML` explicitly. | `forge-app/ui-src/publisher.js:232-252` |
| API, pipeline, and UI E2E tests currently assert that one file fails. | `src/pipeline/bundleValidation.test.ts:70-78`; `src/pipeline/uploadPipeline.test.ts:35-42`; `tests/e2e/api/validation.spec.ts:4-13`; `tests/e2e/ui/validation-ui.spec.ts:6-23` |
| The existing `SINGLE_FILE` E2E fixture points at an HTML file that still references `style.css` and `app.js`; it is not self-contained. | `tests/e2e/helpers/fixtures.ts:16-17`; `tests/e2e/fixtures/sample-bundle/index.html` |
| The dispatch CSP keeps scripts/styles on self or inline, images on self/data, network connections on self, and forms disabled. | `src/dispatch/forgeGateway.ts:162-172` (E029) |

## 4. Normative validation contract

The words MUST, MUST NOT, SHOULD, and MAY are normative.

### 4.1 Legal single-file shape

A single-file publish candidate can complete the shared pipeline only when all of the following are true:

1. The input array contains exactly one `RawBundleFile`.
2. That file's manifest path is exactly `index.html`.
3. Its path passes the existing relative-path rules.
4. Its byte length is at or below both the configured per-file and total caps.
5. After structural validation, it passes the existing secret scan before anything is staged or provisioned.

Items 1–4 define validator acceptance. Item 5 is the unchanged next pipeline gate.

On success, the resulting `ValidatedBundle` MUST have:

- `entrypoint: "index.html"`;
- one file with server-derived `text/html; charset=utf-8` content type;
- `totalBytes` equal to that file's byte length;
- a content hash produced by the existing byte-order algorithm.

The validator does not require a non-empty document today. A zero-byte root `index.html` therefore remains structurally valid if the configured caps allow it. T01 MUST NOT add HTML semantic validation, DOM parsing, a doctype requirement, or a minimum byte size.

### 4.2 Legal multi-file shape

Existing multi-file behavior MUST remain valid. A bundle with root `index.html` plus any number of permitted relative files, up to the existing caps, continues through the same MIME derivation, hashing, secret scan, staging, provisioning, and serving pipeline.

T01 MUST NOT make local assets optional for a bundle that references them. It only permits a genuinely self-contained file to omit them. Missing relative runtime assets remain a compatibility problem visible at render time, not a reason to fabricate dummy files.

### 4.3 Structural rule and error-code transition

The authoritative structural rule becomes:

> At least one file is required, and one file at the exact root path `index.html` is required. There is no separate multi-file minimum.

Consequences:

- The validator MUST NOT emit `BUNDLE_NOT_MULTIFILE` for a one-file root `index.html` bundle.
- An empty array MUST fail as `MISSING_INDEX_HTML` with HTTP 422 and an empty-selection-specific message.
- Any non-empty array without exact root `index.html` MUST fail as `MISSING_INDEX_HTML` with HTTP 422.
- `BUNDLE_NOT_MULTIFILE` SHOULD be removed from the authoritative validator union and backend error tables once no server code emits it.
- The Forge UI SHOULD continue recognizing `BUNDLE_NOT_MULTIFILE` temporarily as a legacy response during version drift. It MUST NOT present it as the new contract or emit `too_few_files` for a valid one-file selection.
- The Forge UI MUST explicitly map canonical `MISSING_INDEX_HTML`; it MAY retain the older `BUNDLE_NO_INDEX` alias for compatibility.

Historical analytics values such as `folder_selected.reject_reason = "too_few_files"` MUST remain readable. New clients stop emitting that reason; no historical event rewrite is required.

### 4.4 Rule order

The first failing rule remains deterministic:

1. exact root `index.html` exists;
2. every manifest path is relative and contains no `..` segment;
3. file-count cap;
4. per-file byte cap;
5. total byte cap;
6. derive MIME/hash and return a validated bundle;
7. secret scan in the publish pipeline;
8. only then stage/provision.

Because root entrypoint detection remains first, a one-file path `/index.html`, `../index.html`, or `page/index.html` reports `MISSING_INDEX_HTML`; it is not an exact root entrypoint. A multi-file bundle containing a valid root plus a bad secondary path still reports `ABSOLUTE_PATH_REJECTED` or `PATH_TRAVERSAL_REJECTED` as it does today.

### 4.5 Exact-name boundary

- `index.html` at the manifest root: valid entrypoint.
- `Index.html`, `INDEX.HTML`, `index.htm`, `index.html/`, `./index.html`, or `page/index.html`: not the entrypoint.
- T01 does not introduce path normalization or case folding.

This exactness preserves the current contract (E120) and avoids different behavior across case-sensitive and case-insensitive development environments.

## 5. Boundary decision table

| Input or condition | Expected result | Error/status or output | Evidence / reason |
|---|---|---|---|
| One `index.html` with ordinary HTML bytes | Accept | one-file `ValidatedBundle` | Core T01; E088/E097/E104/E120 |
| One zero-byte `index.html` | Accept structurally | `totalBytes = 0`; later renders blank | No new semantic validator in T01 |
| One `index.html` exactly at configured per-file and total caps | Accept | inclusive boundary | Preserve current cap semantics |
| Empty file array | Reject | `MISSING_INDEX_HTML`, 422 | No entrypoint; do not reuse misleading multi-file code |
| One `page.html` | Reject | `MISSING_INDEX_HTML`, 422 | No exact root entrypoint |
| One `page/index.html` | Reject | `MISSING_INDEX_HTML`, 422 | Nested is not root |
| One `Index.html` or `index.htm` | Reject | `MISSING_INDEX_HTML`, 422 | Exact, lowercase entrypoint contract |
| One `/index.html` or `../index.html` | Reject | `MISSING_INDEX_HTML`, 422 | Root check wins before path classification |
| One valid root with `maxFiles = 0` in a unit test | Reject | `TOO_MANY_FILES`, 422 | File-count cap remains authoritative |
| One root over per-file cap | Reject | `BUNDLE_TOO_LARGE`, 413, path=`index.html` | Existing cap unchanged |
| One root under per-file cap but over a lower test total cap | Reject | `BUNDLE_TOO_LARGE`, 413 | Existing total cap unchanged |
| One root containing a detected secret | Reject after validation | `SECRET_DETECTED`, 422; no stage/job | Secret scan remains mandatory; E088 calls for diagnostics |
| One root containing external `<script>`, `<img>`, or `fetch()` URLs | Accept upload if other rules pass | Network behavior is constrained at serve time | T01 does not parse HTML; CSP remains unchanged (E029) |
| Valid root plus relative `app.js` | Accept | normal two-file bundle | Folder regression |
| Valid root plus `/app.js` | Reject | `ABSOLUTE_PATH_REJECTED`, 422 | Existing relative-path rule |
| Valid root plus `assets/../app.js` | Reject | `PATH_TRAVERSAL_REJECTED`, 422 | Existing `..`-segment rule |
| Valid nested multi-file fixture | Accept | all relative paths preserved | Existing folder contract regression |
| Duplicate paths in a multi-file manifest | Existing behavior unchanged | No new T01 decision | Duplicate-path validation is a separate contract question |

## 6. Constraints that MUST remain unchanged

### 6.1 Folder and path validation

- Exact root `index.html` remains mandatory for every accepted bundle.
- All manifest paths remain relative.
- URL/protocol-relative/leading-slash manifest paths remain rejected.
- A `..` path segment remains rejected.
- Existing nested relative directories remain supported.

### 6.2 Size, count, MIME, and hash

- Default max file count remains 2,000.
- Default per-file size remains 25 MiB.
- Default total size remains 50 MiB.
- Limits remain server-authoritative and inclusive at the boundary.
- MIME remains derived from the extension; client-supplied MIME is not trusted.
- Content hash derivation remains unchanged.

### 6.3 Secret scan and persistence

- Every accepted structural shape, including a single `index.html`, passes through `scanForSecrets`.
- A hit remains a hard fail before staging or job creation.
- Error output names file, line, and rule kind but MUST NOT echo the matched secret bytes.
- T01 does not claim the heuristic scanner proves the absence of all secrets.

### 6.4 Serving isolation and CSP

- Dispatch still sets the serving headers; the uploaded document cannot weaken them.
- `connect-src 'self'`, `form-action 'none'`, the current frame-ancestor policy, `nosniff`, and sandbox behavior remain unchanged (E029).
- Inline scripts and styles remain governed by the current CSP. T01 does not add external network access, host-page DOM access, shared persistence, server-side secrets, or write-back.

## 7. Existing Forge publisher behavior to align

T01 uses the current folder transport:

- Remove the client-side `FILES.length < 2` rejection.
- Keep exact root `index.html` pre-validation for instant feedback.
- A selected folder containing only `index.html` reaches the selected state with `file_count = 1`.
- Replace “Upload a multi-file bundle” with “Upload an HTML bundle.”
- Suggested helper copy: **“Choose a folder containing a root index.html. It may be one self-contained file or include relative JS, CSS, images, and data.”**
- The selected/preview chips may say “1 file”; the fallback copy SHOULD say “HTML bundle,” not “multi-file.”
- Do not add a paste field, drop-a-single-file path, build step, or format converter. Those belong to T02.

## 8. Unit acceptance tests

### 8.1 `bundleValidation.test.ts`

1. **Accept minimal one-file bundle.** Assert `ok`, entrypoint, one file, HTML content type, exact byte total, and SHA-256 shape.
2. **Accept zero-byte root.** Assert structural success and `totalBytes = 0`.
3. **Accept one root exactly at configured caps.** Assert inclusive max-file/max-total behavior.
4. **Reject empty list.** Assert `MISSING_INDEX_HTML`, status 422, and no `BUNDLE_NOT_MULTIFILE`.
5. **Reject wrong single path.** Cover `page.html`, `page/index.html`, `Index.html`, and `index.htm` as `MISSING_INDEX_HTML`.
6. **Preserve path ordering.** A lone `/index.html` or `../index.html` reports missing root; a valid root plus an absolute/traversal secondary file reports the existing path code.
7. **Apply count cap to one file.** With `maxFiles = 0`, assert `TOO_MANY_FILES`.
8. **Apply per-file cap to root.** Assert `BUNDLE_TOO_LARGE`, 413, and path `index.html`.
9. **Apply total cap to root.** Configure total below per-file cap and assert total-size failure.
10. **Preserve multi-file success and nested paths.** Keep existing folder tests green.
11. **Preserve deterministic hashing.** Equal one-file bytes produce equal hashes; one changed byte changes the hash.

### 8.2 `uploadPipeline.test.ts`

1. One clean root `index.html` proceeds through validation, stages the instance, and enqueues exactly one job.
2. One root containing a known test secret returns `SECRET_DETECTED`; no instance or job is created.
3. Same idempotency key plus identical one-file bytes returns the same job.
4. Same idempotency key plus changed one-file bytes returns `IDEMPOTENCY_CONFLICT`.
5. Existing multi-file and secret-scan tests remain green.

### 8.3 UI/analytics unit coverage

1. A one-file selection with exact root reaches selected state and emits `folder_selected { outcome: "accepted", file_count: 1 }`.
2. A one-file selection without exact root shows the missing-root message and emits `missing_index_html`.
3. New code does not emit `too_few_files`; the analytics type may retain the historical value for old events.
4. `MISSING_INDEX_HTML` maps to the root checklist row; legacy `BUNDLE_NOT_MULTIFILE` remains understandable during version drift.

## 9. E2E acceptance tests

### 9.1 API project

1. Replace the current “single file rejected” case with **one self-contained root `index.html` publishes successfully**. Expect HTTP 200 under the current `/publish` contract, `ok: true`, `entrypoint: "index.html"`, and `files: 1`; always delete the created instance.
2. Add an empty-array request expecting 422 `MISSING_INDEX_HTML` and no provisioned instance.
3. Add a one-file non-root/nested-entrypoint request expecting 422 `MISSING_INDEX_HTML`.
4. Keep the valid multi-file publish test and missing-root multi-file test as regressions.
5. Fetch the published one-file entrypoint or open its serve URL and assert the expected marker plus current CSP headers. The test MUST make no external request.

### 9.2 UI project

1. Replace the current “at least two files” modal failure test with a successful one-file flow: select, see count `1`, publish, open preview, and interact with inline JavaScript.
2. Create a dedicated self-contained fixture with inline CSS and inline JS. Do not reuse the current `SINGLE_FILE`, whose HTML references missing `style.css` and `app.js` when uploaded alone.
3. The fixture SHOULD contain a deterministic control such as a counter button so the test proves scripts execute, not merely that HTML text appears.
4. Add a wrong-name fixture or synthetic file selection and assert the missing-root copy names both the cause and the corrective action.
5. Keep `nested-upload.spec.ts` and the existing full multi-file flow green.

No production environment is used for these tests.

## 10. Rejection-message drafts

All messages follow T03's pattern: name the cause, then state the next action.

| Code / condition | Draft user-facing message |
|---|---|
| Empty selection → `MISSING_INDEX_HTML` | **No files were received.** Choose a folder containing a lowercase root `index.html`, then try again. |
| Non-empty but no exact root → `MISSING_INDEX_HTML` | **No root `index.html` was found.** Move a lowercase `index.html` to the top level of the selected folder—not inside a subfolder—then choose the folder again. |
| Absolute URL path → `ABSOLUTE_PATH_REJECTED` | **`{path}` is an absolute URL.** Keep every uploaded file inside the selected folder and use relative file paths, then try again. |
| Leading-slash path → `ABSOLUTE_PATH_REJECTED` | **`{path}` starts at the server root.** Remove the leading slash so the path is relative to `index.html`, then try again. |
| Traversal path → `PATH_TRAVERSAL_REJECTED` | **`{path}` leaves the selected folder.** Remove every `..` path segment and keep the file inside the bundle, then try again. |
| File count → `TOO_MANY_FILES` | **This bundle has `{count}` files; the limit is `{max}`.** Remove generated caches or unnecessary files, then choose the folder again. |
| Per-file size → `BUNDLE_TOO_LARGE` | **`{path}` is larger than the `{max}` per-file limit.** Compress or remove that file, then try again. |
| Total size → `BUNDLE_TOO_LARGE` | **This bundle is `{total}`; the total limit is `{max}`.** Compress or remove local assets, then try again. |
| Secret scan → `SECRET_DETECTED` | **A possible `{kind}` secret was found in `{path}` at line `{line}`.** Remove or revoke it, then upload again. The detected value is not displayed or stored. |
| Legacy `BUNDLE_NOT_MULTIFILE` | **An older bundle rule rejected this one-file site.** Reopen the publisher after the app update and try again. If it persists, report code `BUNDLE_NOT_MULTIFILE`. |

The publisher SHOULD show the server's sanitized message in the error notice and use the stable code only for analytics/support diagnostics.

## 11. Implementation touchpoints

The implementation owner should inspect at least:

- `src/pipeline/bundleValidation.ts`
- `src/pipeline/bundleValidation.test.ts`
- `src/pipeline/uploadPipeline.ts` and test
- `forge-app/ui-src/publisher.js`
- `forge-app/static/publisher/index.html` and reusable component defaults
- `src/analytics/miniSiteEvents.ts` and tests
- `tests/e2e/helpers/fixtures.ts` plus a new self-contained fixture
- `tests/e2e/api/validation.spec.ts`
- `tests/e2e/ui/validation-ui.spec.ts`
- `DESIGN.md`, `BACKEND_DESIGN.md`, listing/getting-started copy, and comments that still define Mini Sites as multi-file-only

Generated `forge-app/static/**/bundle.js` output must be produced through the existing UI build, not hand-edited.

## 12. Pre-implementation classification spot-check

**Phenomenon:** a bundle is a legal Mini Sites input when it has the exact root entrypoint and still satisfies all existing safety/cap rules, regardless of whether it has one file or many.

**Rule:** exact root `index.html` present → path checks → caps → secret scan.

Predicted cases before applying the matrix:

1. `[{ path: "index.html", ordinary bytes }]` → legal.
2. `[{ path: "page/index.html", ordinary bytes }]` → illegal, missing root.
3. `[{ path: "index.html", zero bytes }]` → structurally legal edge case because T01 does not add semantic HTML validation.

The boundary table matches all three predictions. Marginal checks also preserve both extremes (exact cap passes; cap + 1 fails), keep multi-file/nested-folder behavior, and separate structural acceptance from later secret/CSP enforcement. No rule in this specification classifies “uploaded successfully” as “rendered successfully” or “user obtained value.”

## 13. Definition of done for T01 implementation

T01 is implemented only when all of the following are true:

1. Server, pipeline, and current folder UI accept one exact root `index.html`.
2. All unit and API/UI E2E cases above pass, including a genuinely self-contained interactive fixture.
3. Existing multi-file and nested-directory tests remain green.
4. Size/count/path/secret/CSP behavior is unchanged and verified.
5. Current UI and public compatibility copy no longer claim that more than one file is required.
6. No paste-first, external-network, shared-state, or large-view capability is silently bundled into T01.
7. The shipped behavior is verified before T12 publishes single-file or AI-artifact product claims.
