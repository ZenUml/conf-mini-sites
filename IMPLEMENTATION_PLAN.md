# Implementation Plan: Conf Mini-Sites

## Overview

Host a user-uploaded **multi-file static bundle** as a live, embedded object on a Confluence page.
Atlassian Connect on the Confluence side; **Cloudflare Workers for Platforms** hosting, with the dispatch
Worker acting as the auth gateway. Companion design (decisions, threat models, invariants):
[`DESIGN.md`](DESIGN.md). Product definition, gates, positioning: [`CONTEXT.md`](CONTEXT.md).

> **Companion design:** `DESIGN.md`. Every stage references its `§`/invariant ids. Acceptance invariants are
> `INV-GW-*` (auth gateway, DESIGN §2) and `I1–I10` + `INV-SEAM-*` (DESIGN §5/§6).

### Architecture Decision: seam-first, provider-swappable, build-gated

**Default (this plan)**: Cloudflare WfP behind a `HostingProvider` interface, built **seam-first** so the
Cloudflare→Forge pivot (DESIGN §6) is a provider implementation, not a rewrite. **Fallback (Stage 6, gated)**:
`ForgeProvider`, written only if a customer's security rejects the external processor *and* a feasibility spike
passes. The auth gateway (Stage 3) is **greenfield** — conf-app has no classic-Connect HS256/qsh path — and is
the CVSS-9.1 component; it does not ship without an external pen-test.

> **Superseded ordering note (2026-06-16):** none yet. This is the initial plan, authored as gate-#3 work.
> **STATUS GLOBAL: all stages `Not Started — GATED`** on the four blocking gates in `CONTEXT.md` / DESIGN §7.
> Writing this plan is a non-build activity; **no production code is written until the gates pass.**

---

## Stage 0: Blocking gates (no code until ALL pass)
**Goal**: Convert the four `CONTEXT.md` gates into explicit, signed entry criteria for Stages 1–6.
**Status**: In Progress (gate #3 = `DESIGN.md`, drafted; awaiting sign-off. Gates #1/#2/#4 open.)

### Entry criteria (each must be a recorded, dated sign-off)
- **G1 — Written admin+security confirmation, incl. residency-vs-access.** If the anchor team requires *no
  external processor*, Cloudflare is **disqualified** → skip Stages 2–5, go to Stage 6 (Forge). DESIGN §7.1.
- **G2 — Demand-to-pay from ≥3 prospects beyond the n=1 anchor team**, each approving the **actual
  external-processor architecture** (residency + DPA + auth-gateway threat model). DESIGN §7.2.
- **G3 — Pre-implementation lifecycle/security acceptance criteria signed off** = `DESIGN.md` §2 + §5 reviewed
  and approved (threat model + the `INV-*` set). DESIGN §7.3.
- **G4 — EV vs next ZenUML feature + a kill criterion** stronger than "cheap to build". Use the honest re-cost
  in DESIGN §1.5 (cheap to host, expensive to make safe/compliant). DESIGN §7.4.

### Success Criteria
- A dated record exists for G1–G4; G1 explicitly resolves the residency-vs-access question.
- If any gate fails → **ship the next ZenUML feature instead** (no code in this repo).

### Implementation Notes
- This stage produces **no code**. Its only artifact is the sign-off record. Stages 1–6 inherit
  `Status: Not Started — GATED on Stage 0` until G1–G4 are all green.

---

## Stage 1: The `HostingProvider` seam + CI boundary gate + contract tests
**Goal**: The DI seam (DESIGN §6.1) exists with a fake implementation, a per-provider contract-test pack, and a
CI-enforced import boundary — *before* any Cloudflare code, so the pivot stays a provider swap.
**Status**: Not Started — GATED on Stage 0.

### Files to create
- `src/hosting/HostingProvider.ts` — the interface (`createInstance/updateBundle/deleteInstance/serve/
  verifyHostToken/permissionModel/capabilities`), `InstanceHandle`, `ValidatedBundle`, `ServeAuthContext`,
  `HostingCapabilities`. (DESIGN §6.1.)
- `src/hosting/FakeHostingProvider.ts` — in-memory provider for upper-layer + invariant tests.
- `src/hosting/contract/providerContract.ts` — the contract-test pack every real provider must pass
  (INV-SEAM-03: asserts `capabilities`, **native relative-path resolution**, and **as-served CSP/sandbox
  posture**).
- `.dependency-cruiser.cjs` (or `eslint` `no-restricted-imports` config) — INV-SEAM-01 boundary rule.
- `.github/workflows/boundary.yml` — CI gate running the boundary check, **including `functions/`** (do NOT
  inherit conf-app's `eslint.config.mjs` ignore of `functions/`).

### Success Criteria
- No module above `src/hosting/` can import `@cloudflare/*` or `@forge/*` — a deliberate violating import
  **fails CI** (INV-SEAM-01).
- `FakeHostingProvider` passes the contract pack; the pack asserts relative-path resolution + as-served CSP
  posture as distinct capabilities (INV-SEAM-03).
- Upper-layer code (upload pipeline, lifecycle, gateway orchestration) compiles against the interface only.

### Tests
- `src/hosting/contract/providerContract.spec.ts` (vitest) — runs the pack against `FakeHostingProvider`.
- `tests/boundary/import-boundary.spec.ts` — asserts the dependency-cruiser/eslint rule reports a violation on
  a fixture import above the seam (guards INV-SEAM-01 from silently regressing).

### Implementation Notes
- conf-app is **evidence the boundary rots without a gate** (15+ `@forge/bridge` importers, no lint rule —
  DESIGN §6.4). Build the gate first; everything else depends on it holding.
- `InstanceHandle.providerRef` is **opaque** to upper layers (INV-SEAM-02): may encode a WfP script name or a
  Forge custom-content+attachment set — callers never inspect it.

---

## Stage 2: `CloudflareWfPProvider` — dispatch namespace, user Workers, D1 mapping
**Goal**: Implement `HostingProvider` on WfP: per-instance user Worker via Static Assets, the dispatch
namespace, and the `MiniSiteInstance` D1 mapping + lifecycle CRUD mechanics. (DESIGN §1.)
**Status**: Not Started — GATED on Stage 0 (and on G1 NOT disqualifying Cloudflare).

### Files to create
- `src/hosting/cloudflare/CloudflareWfPProvider.ts` — `createInstance`/`updateBundle`/`deleteInstance`/`serve`
  via the WfP script-upload/delete API + `env.MINISITES.get(workerName).fetch()`.
- `functions/migrations/0001_add_mini_site_instance.sql` — the table with the **DB-level composite key
  `(clientKey, cloudId, instanceId)`** (DESIGN §1.3, INV-GW-06) + indexes.
- `functions/utils/instanceStore.ts` — prepared-statement CRUD (mirror `conf-app/functions/utils/dbUtils.ts`),
  race-safe `INSERT ... ON CONFLICT DO UPDATE` (mirror `forge-custom-content.ts:62`).
- `wrangler-dev.toml` / `wrangler-stg.toml` / `wrangler-prod.toml` — per-env dispatch-namespace + D1 bindings;
  **config policy: dispatched user Workers carry no route / no `workers.dev` / no custom domain** (INV-GW-14).

### Success Criteria
- `createInstance` uploads a user Worker serving a multi-file bundle with **relative paths intact**
  (`index.html` + `app.js` + `assets/*` resolve natively); `updateBundle` overwrites in place (same
  `workerName`, no second Worker); `deleteInstance` is idempotent (no-op if absent).
- A user Worker is reachable **only** via the dispatch binding — an attempted direct/`workers.dev` hit fails
  (INV-GW-14; full proof is the Stage 3 pen-test rider).
- Instance lookups are tenant-scoped by the composite key; an `(A)`-context lookup cannot return a `(B)` row.

### Tests
- `src/hosting/cloudflare/CloudflareWfPProvider.spec.ts` — against the contract pack (Stage 1) + WfP-API mocks.
- `functions/utils/instanceStore.spec.ts` — composite-key isolation (A cannot read B), idempotent upsert
  (mirror `space-status.spec.ts` mock style).
- `tests/e2e-tests/tests/hosting/relative-paths.spec.ts` — a real multi-file bundle renders with sibling assets
  resolving (Playwright; UI/network evidence).

### Implementation Notes
- The cron/reaper **skeleton** is reusable from `conf-app/workers/cron-aggregate/` but its reconciliation logic
  is net-new (Stage 5). Here, only the *delete-the-Worker* mechanic the reaper calls is built.
- D1↔Forge storage portability is **unproven** (DESIGN §6.3) — do not design the schema assuming Forge reuse;
  keep all WfP specifics (e.g. `workerName`) below the seam.

---

## Stage 3: The Connect auth gateway (greenfield, CVSS-9.1) — verify → bind → authorize → serve
**Goal**: The dispatch Worker authenticates the Connect JWT, binds the resource server-side, authorizes per
request, mints/validates signed-path grants for sub-resources, and serves fail-closed. (DESIGN §2.)
**Status**: Not Started — GATED on Stage 0. **Does not ship without an external pen-test (DESIGN §1.5).**

### Files to create
- `functions/gateway/tokenExtractor.ts` — single canonical extractor; validates the `JWT` scheme; rejects when
  `?jwt=` and `Authorization` disagree (DESIGN §2.3).
- `functions/gateway/connectJwt.ts` — `alg=HS256` pin (`kid` ignored); secret resolution by **`(clientKey,
  key)`** (DESIGN §2.4, migration-0008 reality); HMAC; `exp` w/ bounded-and-composed skew; **exact Atlassian
  `qsh` canonicalization** (exclude `jwt` param, lowercase method, strip baseUrl/contextPath, Atlassian
  encoding+sort); `context-qsh` entrypoint-only.
- `functions/gateway/install.ts` — Connect `installed`/`uninstalled` handlers: RS256 verify vs
  `connect-install-keys` JWKS **+ `aud` pinning**; first-install trusted solely on the asymmetric signature;
  atomic secret rotation; **app-layer envelope-encrypted** secret at rest (DESIGN §2.4/§2.6).
- `functions/gateway/authorize.ts` — `cloudId`↔install cross-check; `contentId` from a **signed claim**;
  DB-level instance bind; `permission/check(read)` for the verified `sub`, **ordered after** authn (DESIGN §2.5).
- `functions/gateway/permissionCache.ts` — key `hash(clientKey:cloudId:accountId:contentId:read)`; positive-only,
  TTL ≤60s; **fail-closed on outage; circuit-breaker default = deny** (DESIGN §2.6).
- `functions/gateway/grant.ts` — signed-path grant mint/validate; `<base>` injection; per-asset re-check
  (DESIGN §2.7).
- `functions/gateway/responseHeaders.ts` — per-bundle CSP/sandbox/`nosniff` enforcement (DESIGN §5.3/I6).
- `functions/gateway/router.ts` — **deny-by-default** routing (exemption allowlist only; inverts conf-app
  `_middleware.ts`).
- `functions/gateway/auditLog.ts` — append-only decision log; **no secrets/tokens logged** (lint+test enforced).

### Success Criteria (each maps to an INV-GW invariant)
- Auth: forged/`alg=none`/qsh-stripped/expired/scheme-abused tokens all **rejected** (INV-GW-01/02/03/05; §2.3).
- Secret resolution is deterministic under `UNIQUE(clientKey, key)` and never picks `row[0]` (INV-GW-04).
- Authz: `contentId` from a signed claim only; DB-level tenant bind; `cloudId`↔install cross-check;
  per-request `permission/check`; **every sub-resource** re-checked via grant (INV-GW-04b/06/06b/07; §2.7).
- Fail-closed: outage/miss/breaker-error all **deny**; revoked content not served beyond the composed
  ≤120s (or 0) window (INV-GW-08/11).
- A brand-new/unlisted serving route returns **401**, not 200 (INV-GW-09).
- A direct/`workers.dev` hit on a user Worker fails — **proven by the pen-test rider** (INV-GW-14).
- No code path logs a decoded token, a lifecycle body, or a `sharedSecret`-bearing row (INV-GW-10/13).

### Tests
- `functions/gateway/connectJwt.spec.ts` — **differential `qsh` vectors against Atlassian's reference** (not a
  code review); alg/exp/sig/scheme cases on a fixed clock.
- `functions/gateway/authorize.spec.ts` — header-supplied `accountId` cannot influence the decision;
  authz-after-authn ordering; signed-claim `contentId`; cross-tenant deny (INV-GW-04/04b/06/06b/07).
- `functions/gateway/permissionCache.spec.ts` — `allow+fresh→serve`; `allow+expired→re-check`; **`recheck
  throws→403`**; `revoke→403`; **breaker-tripped-open → still deny** (DESIGN §2.6).
- `functions/gateway/grant.spec.ts` — forged/expired grant rejected; path-`instanceId` ≠ `G.i` rejected;
  sub-resource re-check on revoke → 403 (DESIGN §2.7, INV-GW-07).
- `functions/gateway/router.spec.ts` — unlisted route → 401 (INV-GW-09).
- `tests/secrets/no-secret-logs.spec.ts` — lint/test that no log statement emits a token/body/secret row.
- **External pen-test (recorded in the security review):** direct user-Worker probe; qsh-canonicalization
  fuzzing; restriction-inheritance permission edge cases; cross-tenant cache-key probe (INV-GW-14, I3, I8).

### Implementation Notes
- conf-app's `authenticate.ts` (RS256/JWKS) is **not** reused for serving traffic — different shape entirely
  (DESIGN §2.2). Reuse only: the fail-closed `CheckPermission.ts` default and the per-install-secret storage
  *shape* (not its plaintext column — DESIGN §2.6).
- Name the exact signed `contentId` claim during build; if none exists for this iframe type, re-derive from the
  macro `localId` carried in `qsh` (DESIGN §7.5) — do **not** source it from `AP.context`/URL.

---

## Stage 4: Shared upload pipeline + both publish flows
**Goal**: One pipeline (authn→authz→validate→secret-scan→posture→atomic commit) behind two entry points —
developer CLI/MCP and the non-developer drag-and-drop widget. (DESIGN §3.)
**Status**: Not Started — GATED on Stage 0.

### Files to create
- `functions/pipeline/uploadPipeline.ts` — the ordered pipeline; produces a `ValidatedBundle`; **provider never
  re-validates** (INV-SEAM-02).
- `functions/pipeline/bundleValidation.ts` — multi-file + root `index.html`; relative-paths-only (extend
  `ATTACHMENT_NAME_RE` to a full manifest); reject single-file `.html`; **zip-bomb guard**; size/count/MIME caps.
- `functions/pipeline/secretScan.ts` — high-signal patterns + entropy + allow-list (I7); **[GATED]** ruleset.
- `functions/pipeline/commit.ts` — `Idempotency-Key` + `bundleHash`; `status=staging` → atomic flip to `live`
  (reuse `forge-custom-content.ts:44-67` idiom) (I10).
- `src/cli/publish.ts` + `src/cli/index.ts` — the `mini-sites publish ./dist` library + CLI.
- `src/mcp/publishTool.ts` — `mini_sites.publish` MCP wrapper over the same library.
- `src/auth/oauthDeviceGrant.ts` — OAuth 3LO device grant + keychain refresh token; PAT fallback (DESIGN §3.1).
  **[GATED]** on OAuth client registration.
- `src/components/upload/UploadContainer.vue` / `UploadDropzone.vue` / `BundleValidationReport.vue` —
  container/presentational split, DI `uploadClient` (DESIGN §3.2).

### Success Criteria
- Both flows funnel through the identical pipeline; a bundle failing any step never reaches `status=live`.
- Distinct, actionable error codes surface (`BUNDLE_NOT_MULTIFILE` … `COMMIT_FAILED_ROLLED_BACK`).
- A secret-bearing bundle is **blocked** with file+line; no bytes persisted (I7).
- A retried/duplicated publish is a no-op (idempotent), never a double-write or half-state (I10).
- The widget container is testable with no network (DI) and works unchanged against `FakeHostingProvider`.

### Tests
- `functions/pipeline/bundleValidation.spec.ts` — single-file reject, absolute-path/traversal reject, zip-bomb
  guard, caps.
- `functions/pipeline/secretScan.spec.ts` — true-positives (AWS/Google/JWT/PEM/`password=`) + false-positive
  guards (UUID/hex/base64-image).
- `functions/pipeline/commit.spec.ts` — inject failure after each step → `isServable=false`; re-run idempotent.
- `tests/e2e-tests/tests/publish/drag-drop.spec.ts` + `tests/e2e-tests/tests/publish/cli-publish.spec.ts` —
  end-to-end publish via each flow (UI/network evidence).

### Implementation Notes
- Confused-deputy guard (step 2) generalizes `forge-upload-attachment.ts:117-134` from read→write/space-scope.
- The macro body stores **only** the `instanceId`, never the bundle (DESIGN §3.1).

---

## Stage 5: Lifecycle reconciliation, compliance, audit
**Goal**: Keep stored bundles in exact correspondence with live macro instances without a delete webhook;
honor DSAR erasure; tamper-evident audit; partial-failure + abuse bounds. (DESIGN §5.)
**Status**: Not Started — GATED on Stage 0.

### Files to create
- `workers/reconcile/` (own `wrangler.toml` + `scheduled()` handler; skeleton from `conf-app/workers/
  cron-aggregate/`) — the orphan reaper.
- `functions/lifecycle/reconcile.ts` — reachability probe + `missingPasses` GC state machine; **move/rename/
  space-relocation/restore-with-new-id robustness (I1a); registry-outage → 403 (I1b); inbound-copy-pointer
  retention (I1c); blast-radius cap (I1d)**.
- `functions/lifecycle/forkOnCopy.ts` — copy-on-access fork; idempotent; source byte-unchanged (I2).
- `functions/compliance/erasure.ts` — enumerate `listStoresHolding(bundleId)` + **fork-lineage transitivity**;
  deletion certificate; cache purge; backup-bound disclosure (I5).
- `functions/audit/auditLog.ts` — append-only, hash-chained, **HEAD/length pinned to an external append-only
  anchor (R2 Object Lock) against tail-truncation** (I9).
- `functions/lifecycle/integrity.ts` — serve-time content-hash for committed-but-corrupt; re-scan-on-scanner-
  bump re-quarantine; retry backoff/circuit-break (I10, I7↔I10).
- `functions/lifecycle/abuseBounds.ts` — upload/fork-amplification/reconcile/bandwidth bounds (DESIGN §5.5).

### Success Criteria
- GC deletes a confirmed-absent owner after `GRACE`, **never** a live/unconfirmable one (I1 + I1a–I1d).
- A copied page never shares/overwrites the source bundle; a template ×N yields N independent bundles (I2).
- A DSAR erases the target **and all descendant forks** across stores; prior URLs 404; deletion record exists
  (I5).
- Audit detects a middle edit **and** a tail truncation (I9).
- Abuse/secret-compromise cannot drive mass deletion or forged grants (§5.5; second control on reconcile).

### Tests
- `functions/lifecycle/reconcile.spec.ts` — state-machine table incl. move/rename/restore/registry-outage rows.
- `functions/lifecycle/forkOnCopy.spec.ts` + `tests/e2e-tests/tests/lifecycle/copy-semantics.spec.ts`
  (reuse `helpers/macroDuplication.ts`).
- `functions/compliance/erasure.spec.ts` — no store skipped; fork-lineage enumerated.
- `functions/audit/auditLog.spec.ts` — middle-edit + **tail-truncation** detection.
- `tests/e2e-tests/tests/lifecycle/orphan-gc.spec.ts`, `.../compliance/dsar-erasure.spec.ts`,
  `.../lifecycle/partial-deploy-recovery.spec.ts`.

### Implementation Notes
- Reconciliation, not webhooks (Connect has no reliable per-macro delete event). Eager fork on a copy/export
  AVI event is **[GATED]** on AVI reliability (DESIGN §5.1/I2).
- DSAR-vs-audit retention of `actorAccountId` is an **OPEN legal question** (DESIGN §7.9) — resolve before GA.

---

## Stage 6 (contingency — GATED): `ForgeProvider` + feasibility spike
**Goal**: If G1's residency review forbids the external processor, implement `HostingProvider` on Forge — a
provider swap, not a rewrite. (DESIGN §6.)
**Status**: Not Started — GATED on G1 disqualifying Cloudflare **AND** the feasibility spike passing first.

### Tasks
- **Feasibility spike (hard blocker):** prove client-side multi-file **reassembly** + **relative-path
  rewriting** (blob/service-worker) + **~100MB/file chunking** + **CSP-on-blob-origin** on *real* bundles.
- `src/hosting/forge/ForgeProvider.ts` — custom-content + attachments storage; resolver serving; the
  **client-side reassembly engine** lives in the viewer above the seam, gated behind
  `capabilities.supportsServerSideServe=false`.
- Re-validate which invariants change meaning (DESIGN §6.2): #4 byte-level no-leak becomes **false**; #6
  in-iframe surface **grows**; #8 isolation becomes **logical** (app-enforced again).

### Success Criteria
- `ForgeProvider` passes the **same** Stage-1 contract pack (incl. relative-path resolution + as-served CSP).
- The reassembly engine renders a real multi-file bundle with relative assets inside the Forge iframe.
- The upper layers (Stages 1, 3-orchestration, 4, 5) are reused unchanged (the seam held).

### Tests
- `src/hosting/forge/ForgeProvider.spec.ts` (contract pack) + a reassembly E2E in a real Forge embed.

### Implementation Notes
- The reassembly engine + relative-path rewriter are **net-new, security-critical** — exclude them from the
  "≥80% reuse" figure (DESIGN §6.3). The Connect auth gateway (Stage 3) is greenfield on the *primary* path
  regardless of pivot.

---

## Execution Order

1. **Stage 0** — gates (no code; G1 decides Cloudflare vs Forge path).
2. **Stage 1** — seam + CI boundary + contract pack (everything depends on the boundary holding).
3. **Stage 2** — `CloudflareWfPProvider` (hosting mechanics).
4. **Stage 3** — auth gateway (greenfield; pen-test before ship).
5. **Stage 4** — upload pipeline + publish flows.
6. **Stage 5** — lifecycle/compliance/audit.
7. **Stage 6** — Forge contingency, only if G1 forces it (spike first).

---

## Definition of Done (mirrors the gates + invariants; checked at GA)

- [ ] Stage 0: G1–G4 signed off and dated; residency-vs-access resolved.
- [ ] INV-SEAM-01 CI gate fails on any host-SDK import above `src/hosting/` (incl. `functions/`).
- [ ] Contract pack passes for `CloudflareWfPProvider` (and `ForgeProvider` if built), incl. relative-path +
      as-served CSP.
- [ ] Auth gateway: INV-GW-01..15 each have a passing test; **external pen-test recorded** (direct user-Worker
      probe, qsh fuzzing, restriction-inheritance, cross-tenant cache key).
- [ ] Invariants I1–I10 (+ I1a–I1d, §5.5 abuse bounds) each have a passing unit/integration/E2E test as named
      in `DESIGN.md`.
- [ ] No-secret-in-logs lint/test green; `sharedSecret` + `K_grant` app-layer-encrypted at rest.
- [ ] DSAR erasure proven across stores incl. fork lineage; backup-retention bound stated in the DPA.
- [ ] Honest re-cost (DESIGN §1.5) reflected in the EV/kill-criterion record.
