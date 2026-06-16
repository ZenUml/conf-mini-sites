# Design: Conf Mini-Sites — host a multi-file static bundle, embedded in Confluence

> **Status: DESIGN ONLY — BUILD GATED.** No production code until all four blocking gates in `CONTEXT.md`
> pass (admin+security sign-off incl. **residency-vs-access**; demand-to-pay from ≥3 prospects beyond the
> n=1 anchor team; signed pre-implementation lifecycle/security acceptance criteria; EV-vs-next-ZenUML-feature
> + kill criterion). This document **is** gate-#3 work: it turns the lifecycle/security constraints into
> testable invariants + threat models. Companion plan: `IMPLEMENTATION_PLAN.md`. Source of truth for product
> definition, decisions, constraints, and gates: `CONTEXT.md` (not duplicated here).

> **Adversarial review applied (2026-06-16).** Every security-critical section below was red-teamed by
> independent agents (authorization/IDOR lens, JWT/token lens, invariant-completeness critic, Forge-pivot
> stress test) against the real `conf-app` source. Findings are folded in inline and tagged
> **[hardened]** where a claim was corrected or an invariant added. The most load-bearing correction:
> **conf-app's request auth is Forge-only (RS256/JWKS via `jose`); there is no classic-Connect HS256/qsh/
> sharedSecret path in it today** — so the auth gateway (§2) is **greenfield security-critical code**, not
> "adapted from conf-app." Do not let any "modeled on / mirroring" language imply otherwise.

---

## 0. What this design commits to (and what it does not)

The settled decisions (Cloudflare Workers for Platforms; Atlassian Connect on the Confluence side;
wedge-is-execution-not-moat; no ADRs yet) live in `CONTEXT.md §Architecture` and are **not relitigated** here.
This document specifies the **mechanics, threat models, and acceptance invariants** those decisions imply, at
the altitude conf-app's own `RENDERING_PERF_DESIGN.md` uses: decision-first, evidence-grounded (real
`conf-app` `file:line` citations, marked `[verified]` where an adversarial agent confirmed against source),
chosen-vs-rejected alternatives named, and a **Verification** path for every claim.

**Global constraints (stated once; every section inherits them):**

- Files live on **Cloudflare**, not inside Atlassian. This is **NOT "Runs on Atlassian", NOT no-egress, NOT
  in-boundary.** Permissions are **app-enforced ACL code**, not inherited from Confluence. Consequence: the
  app must **pass** (not skip) a Cloud Fortified security review, and the auth gateway is self-built ACL of the
  **CVE-2021-26073 / CVSS-9.1 class** — threat-modeled and pen-tested before any production traffic.
- Plain Workers (500/account) and Pages (100/account) script caps make per-instance isolation impossible at
  scale → **Workers for Platforms (WfP) is REQUIRED, not optional.**
- The Cloudflare→Forge pivot must be a **provider swap, not a rewrite** (§6). If gate #1's residency review
  forbids an external processor, Cloudflare is **disqualified**; the design must survive that flip without a
  catastrophic rewrite. **[hardened]** §6 corrects an over-optimistic reuse estimate — the pivot is *bounded*,
  not free.
- Everything below is **gated**. Items that depend on an unresolved external answer are tagged **[GATED]**;
  items that add recurring cost/ops beyond the "~$25/mo solo-buildable" premise are tagged **[COST]**.

---

## 1. Hosting / serving architecture

### 1.1 The WfP model: one dispatch namespace, one user Worker per macro instance

```
                Confluence page (viewer)
                        │  Connect macro iframe loads (sandboxed, isolated origin)
                        ▼
        ┌───────────────────────────────────────────────┐
        │  DISPATCH WORKER  (the auth gateway, §2)         │
        │  - verifies Atlassian Connect JWT (alg/iss+key/  │
        │    sig/exp/qsh)                                   │
        │  - binds instanceId → contentId → tenant (D1)    │
        │  - Confluence permission/check(read) per request │
        │  - mints/validates signed-path grant token (§2.7)│
        │  - sets CSP/sandbox headers on every served byte │
        │  - dispatch.get(workerName).fetch(req)           │
        └───────────────┬─────────────────────────────────┘
                        │  (in-namespace dispatch — NOT a public route)
                        ▼
        ┌───────────────────────────────────────────────┐
        │  USER WORKER  ms-<instanceId>                    │
        │  in dispatch namespace "mini-sites-<env>"        │
        │  - Workers Static Assets serves the bundle bytes │
        │    (index.html + relative-path JS/CSS/asset)     │
        └───────────────────────────────────────────────┘
```

**One dispatch namespace per environment** (`mini-sites-dev|stg|prod`), mirroring conf-app's per-env split in
`wrangler-dev.toml` / `wrangler-stg.toml` / `wrangler-prod.toml` [verified]. The dispatch Worker holds the
namespace binding:

```toml
# wrangler-prod.toml (dispatch worker) — mirrors conf-app per-env binding style
[[ env.production.dispatch_namespaces ]]
binding   = "MINISITES"
namespace = "mini-sites-prod"
```

**One user Worker per macro instance**, whose only job is to serve its own static bundle via **Workers Static
Assets** — `index.html` plus sibling `app.js`, `style.css`, `assets/*` resolve exactly as on a normal static
host. *This native relative-path serving is the property that distinguishes a multi-file bundle from the
single-file `.html` the existing HTML macros already handle, and it is the product's core capability.*

**Non-routability is the security primitive — and it is ENFORCED, not assumed [hardened].** User Workers in a
dispatch namespace have **no public route, no `*.workers.dev` subdomain, and no custom domain**, and are
unreachable by cross-tenant Worker-to-Worker `fetch`. They are reachable *only* via
`env.MINISITES.get(workerName).fetch()` from the dispatch Worker. The red team correctly flagged that the
whole ACL rests on this; therefore it is a **config policy + a pen-test obligation**, not a platform
assumption: deployment config asserts no route/subdomain/domain on dispatched scripts, and the pen-test
**must include an unauthenticated direct probe of a user Worker URL** (INV-GW-14, §2.6).

### 1.2 Naming / identity scheme

- **`instanceId`** = stable primary key for one mini-site on one page: `sha256(cloudId + ":" +
  macroLocalId)` truncated to a Worker-name-safe slug. The Connect per-macro `localId` + `cloudId` is
  globally unique and survives page reload (but **not** page copy — owned by the Lifecycle model, §5.1/I2).
- **`workerName`** = `ms-<instanceId>` — the script name inside the dispatch namespace. **Never exposed to the
  client.** The client iframe URL only ever targets the dispatch Worker; the `instanceId → workerName` mapping
  is server-side only. Guessing a `workerName` buys an attacker nothing (no public route resolves it).

### 1.3 Tenant lifecycle CRUD + where mapping/metadata lives

State lives in **D1**, mirroring conf-app's usage: D1 binding `DB` declared per-env in `wrangler-*.toml`
(`conf-app/wrangler-prod.toml:23-27`, `wrangler-dev.toml:32-42`) [verified], accessed through
prepared-statement helpers (`conf-app/functions/utils/dbUtils.ts`) and idempotent upserts
(`conf-app/functions/forge-custom-content.ts:44-93`). Migrations live in `functions/migrations/NNNN_*.sql`.

```sql
-- functions/migrations/0001_add_mini_site_instance.sql
CREATE TABLE IF NOT EXISTS MiniSiteInstance (
  instanceId  TEXT NOT NULL,             -- sha256(cloudId:macroLocalId) slug
  clientKey   TEXT NOT NULL,             -- Connect tenant identity (iss)
  cloudId     TEXT NOT NULL,             -- tenant isolation key
  contentId   TEXT NOT NULL,             -- the Confluence page/content this instance is bound to
  spaceKey    TEXT,
  macroLocalId TEXT NOT NULL,
  workerName  TEXT NOT NULL,             -- ms-<instanceId>; never client-visible
  bundleHash  TEXT NOT NULL,             -- content hash of current bundle (change detection)
  status      TEXT NOT NULL,             -- 'staging' | 'active' | 'orphan_candidate' | 'deleted'
  scanStatus  TEXT,                      -- secret-scan / CSP verdict at publish time
  missingPasses INTEGER NOT NULL DEFAULT 0, -- reconciliation counter (§5.1/I1)
  createdAt   TEXT NOT NULL DEFAULT current_timestamp,
  updatedAt   TEXT NOT NULL DEFAULT current_timestamp,
  lastSeenAt  TEXT,                      -- updated on each authenticated view (orphan-GC input)
  -- [hardened] tenant-binding is a DB-LEVEL composite key, not an app-layer WHERE (INV-GW-06):
  PRIMARY KEY (clientKey, cloudId, instanceId)
);
CREATE INDEX IF NOT EXISTS idx_minisite_cloud  ON MiniSiteInstance(cloudId);
CREATE INDEX IF NOT EXISTS idx_minisite_orphan ON MiniSiteInstance(status, lastSeenAt);
```

- **CREATE (first publish):** validate → upload the user Worker into the dispatch namespace via the WfP
  script-upload API (multipart `PUT`, static-asset manifest + files) → `INSERT` the row, mirroring conf-app's
  race-safe `INSERT ... ON CONFLICT DO UPDATE` idiom (`forge-custom-content.ts:62`).
- **UPDATE (re-publish):** same `workerName`, new bundle: re-upload script + assets, bump `bundleHash`. The
  upload API is idempotent on script name → a single overwrite, no second Worker.
- **DELETE (cleanup):** Connect has **no reliable per-macro delete webhook** (Design Constraint #1), so
  deletion is two-tier: (a) the `uninstalled` lifecycle hook tears down a whole tenant
  (analogue of `conf-app/functions/uninstalled.ts`); (b) a **scheduled cron Worker** — the orphan reaper —
  reconciles per-instance. The reaper's skeleton (the `scheduled()` handler + per-env cron wiring) is
  reusable from `conf-app/workers/cron-aggregate/` [verified], but **its reconciliation/external-delete logic
  is net-new** [hardened] (cron-aggregate is a pure D1 purge; it never calls Confluence and never deletes a
  per-instance resource). The full orphan/copy/export policy is the Lifecycle model, §5.1.

### 1.4 Request flow, end to end

1. Viewer opens a Confluence page; the Connect macro renders a sandboxed iframe pointing at the dispatch
   Worker: `GET /v/<instanceId>?jwt=<connect-jwt>`. **This is the single network entry point.**
2. **Auth gateway (§2):** verify the Connect JWT; bind `instanceId → contentId → tenant`; call Confluence
   `permission/check(read)` for the verified `accountId` against `contentId`.
3. On allow: mint a **signed-path grant token** (§2.7), serve `index.html` with an injected
   `<base href="/v/<instanceId>/g/<grant>/">` and the CSP/sandbox headers (§5.3/I6).
4. The browser resolves every relative sub-resource under `/v/<instanceId>/g/<grant>/…` — each request
   re-enters the gateway, which **re-validates the grant + re-checks the permission cache** before
   `await env.MINISITES.get(workerName).fetch(request)` into the user Worker.
5. The user Worker serves the requested static asset with relative paths intact; the gateway attaches CSP and
   updates `lastSeenAt` out of band (`ctx.waitUntil`).

On deny / token-or-grant expiry mid-view: the gateway returns 401/403; the embed re-auths (§2.7 step 5). The
user Worker is **never** reached, so on the Cloudflare path revoked content cannot leak even for a half-second.
*(This byte-level guarantee is a property of the WfP choke point; it does **not** hold on the Forge path — see
§6, where the failure mode relocates.)*

### 1.5 Honest re-costing — does "~$25/mo, solo-buildable" survive?

**The raw-hosting figure holds:** ~$25/mo WfP base (incl. 1,000 scripts) → ~$205–230/mo at 10k instances for
the WfP/compute line. But that prices **only the hosting**. The acceptance criteria add a per-view + per-publish
variable layer the premise ignored:

| Line item | Driver | Direction / magnitude (was $0 in the premise) |
|---|---|---|
| **D1 reads/writes** | Every protected view: instance lookup + `lastSeenAt`; audit + GC scans | Grows with **views**. Tens → low-hundreds $/mo. |
| **permission/check egress + cache** | Read-check per protected request (cached, §2.5) | KV cache + Worker CPU per view; grows with **views**. |
| **Audit storage [COST]** | Durable audit of every serve/deny/publish/delete (R2 + D1, §5.6/I9) | R2 storage + Class-A writes; unbounded if retention loose. |
| **Secret-scan compute [COST]** | Scan every uploaded bundle (§4 step 5, §5.4/I7) | CPU-heavy, spiky; grows with **publish volume**. |
| **Sandbox/CSP serving** | Per-bundle isolated origin + header enforcement (§5.3/I6) | Compute per serve; possibly a second domain. |

**Conclusion: the premise does not survive intact.** Cheap to *host*, **expensive to make *safe and
compliant*.** A realistic loaded run-rate at 10k active instances under real traffic is order **~$500–700/mo**
(audit retention + secret-scan dominate), and the *engineering* cost dwarfs the infra: the greenfield auth
gateway (CVSS-9.1 class), a recurring **Cloud Fortified review + external pen-test** (a four-figure recurring
item, not a rounding error), orphan GC, and provable DSAR erasure are each multi-week security-critical
workstreams. **This belongs in the EV-vs-kill-criterion gate (#4).**

---

## 2. Auth gateway (dispatch Worker) + threat model — the highest-risk component

> The CVE-2021-26073 / CVSS-9.1 class. A single logic error here is a **cross-tenant content-disclosure
> breach**, not a degraded feature. This section is the artifact the security gate signs off against.

### 2.1 The gateway's job, on every protected request, in order — fail-closed at each step

1. **Authenticate** — verify the Atlassian Connect JWT (token-extraction → `alg`-pin → key selection →
   signature → `exp` → `qsh`).
2. **Bind** — resolve the requested resource to a server-verified context (`macroInstanceId → contentId →
   tenant`), never trusting a client-supplied id.
3. **Authorize** — `permission/check(read)` for the verified user against the specific Confluence content.
4. **Route** — dispatch to the non-routable per-instance user Worker.

A miss, an outage, an unparseable token, or a cache-cold lookup for revoked content all resolve to **deny**.

### 2.2 Grounding: conf-app does NOT have this path [hardened]

conf-app's production request auth is the **Forge context-token** path: `functions/utils/authenticate.ts:6-35`
verifies the invocation JWT with **RS256 against Atlassian's remote JWKS** (`jose.createRemoteJWKSet`) and
checks an app-id allowlist [verified]. There is **no `qsh`, no per-install `sharedSecret`, no `atlassian-jwt`/
`atlassian-connect` dependency anywhere in conf-app** [verified by red team]. The classic-Connect verification
path is therefore **net-new, greenfield, security-critical code** — the single biggest reason a Cloud
Fortified review is required, not skipped. What we genuinely reuse is *shape, not implementation*:

- **verify-before-serve middleware ordering** from `functions/_middleware.ts` — but **INVERTED to
  deny-by-default** (conf-app runs auth only for an `AUTHENTICATED_PATHS` allowlist and skips everything else —
  fail-open [verified]; INV-GW-09 inverts this).
- **per-install secret storage** keyed by install identity (`CLIENT_INSTALLATION_KV`,
  migration `0005_add_client_installation.sql`) — but with two corrections below.

### 2.3 Token extraction (new — was a gap) [hardened]

conf-app's `getAuthorizationHeader` does a scheme-blind `authHeader.split(' ')[1]` [verified] — it accepts
`Bearer x`/`Foo x` identically. **Do not inherit it.** Define exactly one canonical extractor:

- **Entrypoint iframe GET** → token from the `jwt` query parameter only.
- **XHR/asset requests** → token from `Authorization: JWT <token>`; the scheme **must equal `JWT`** (reject
  `Bearer`/other).
- If both `?jwt=` and `Authorization` are present with **different** values → **reject** (parameter pollution).
- A token with an empty/absent signature segment → reject as malformed *before* any verify call.

### 2.4 JWT verification (authentication) — exact order, fail-closed on first failure

1. **Decode header without trusting it** (raw base64url split, not a library decode that auto-selects keys).
   **Reject any `alg ≠ HS256`** before key selection (closes `alg=none` / RS↔HS confusion — INV-GW-03).
   `kid` is **ignored** for request-token verification (only `iss` selects the key) — stated so a future impl
   cannot resurrect kid-driven key selection.
2. **Resolve the per-install secret by `(clientKey, key)` — NOT `clientKey` alone [hardened/critical].**
   `iss` is the tenant `clientKey`. conf-app migration `0008_fix_client_installation_unique_constraint.sql`
   **dropped `UNIQUE(clientKey)` and replaced it with `UNIQUE(clientKey, key)`** [verified] — the *same*
   clientKey has multiple rows (Lite/Full app variants) with **different `sharedSecret`s**. A lookup
   `WHERE clientKey = ?` is non-deterministic. Secret selection **must** key on `(clientKey, key)` where the
   app-variant `key`/`aud` is bound to a **verified** claim; a clientKey with multiple rows must never
   silently pick `row[0]`. Unknown `iss`/no matching row ⇒ reject (INV-GW-04).
3. **Verify HMAC** with that install's `sharedSecret` — selected by `(iss, key)`, never a global secret and
   never one the token names (INV-GW-01).
4. **Verify `exp`** (and `nbf`/`iat` if present) with bounded skew. **Skew composes with the permission-cache
   TTL [hardened]:** worst-case revocation window = `exp-skew + positive-cache-TTL`. With ≤60s + ≤60s that is
   **~120s, not 60s** — either sign off on ~120s explicitly, or set the `exp` skew to **0/one-sided** so the
   signed-off figure is true (INV-GW-05).
5. **Verify `qsh`** with the **exact Atlassian canonical-request algorithm [hardened]** — not a loose
   `SHA-256(method+&+path+&+query)`. Required: **exclude the `jwt` query parameter**, **lowercase the HTTP
   method**, **strip the `baseUrl`/`contextPath` prefix**, apply Atlassian's percent-encoding + duplicate-key
   sort order, then constant-time compare. The literal value **`context-qsh` is accepted ONLY for the
   macro-entrypoint iframe GET** (a server-determined classification, not inferred from the token); every
   XHR/asset request must present a computed `qsh` bound to its method+path. A missing `qsh` on a protected
   path is a rejection (INV-GW-02). *This canonicalization is exactly where Connect qsh CVEs historically
   live — it requires differential test vectors against Atlassian's reference, not a code review.*

**`installed`/`uninstalled` lifecycle (the secret's origin):** the Connect `installed` webhook receives
`{clientKey, key, sharedSecret, baseUrl, ...}`. The handler **must verify the install callback itself** —
asymmetric JWT signed by Atlassian's published Connect install keys (`iss = connect-install-keys.atlassian.com`,
RS256 against Atlassian's CDN JWKS) — **and pin `aud` to this app's own baseUrl/identity [hardened]** (else a
valid Atlassian-signed install JWT minted for a *different* app could seed/overwrite an install record).
**First install is gated solely on the verified asymmetric signature — never "no record yet ⇒ trust"
[hardened].** Reinstall overwrites the secret **atomically**; tokens under the old secret fail closed during
rotation (acceptable, stated). conf-app's `uninstalled.ts:24-26` tolerates a missing auth header as a "Connect
migration bridge" [verified] — the mini-sites gateway **must NOT copy that tolerance to the `installed` path**;
an unverified `installed` that writes a `sharedSecret` is an **account-takeover primitive** (INV-GW-10).

### 2.5 Authorization (the IDOR class — CVE-2021-26073 territory)

Authentication proves *who is calling and from which tenant*. It does not prove the caller may read *this*
bundle. **Critically, this single per-request check is now the only thing standing between an authenticated
user and any bundle's bytes** (unlike conf-app, where Confluence itself authorizes content fetched with the
user's own OAuth token — a missing check there cannot leak). On the gateway, **one skipped check = disclosure**,
so it must be provably non-bypassable on 100% of asset paths.

**The binding chain — each link server-side:**

```
verified JWT ─► clientKey (iss)             [from signature / install record]
verified JWT ─► cloudId                      [cross-checked against the install record — see below]
verified JWT ─► contentId                    [from a SIGNED claim, never query/body/iframe URL — see below]
(clientKey,cloudId,instanceId) ─► contentId  [DB-level composite key in MiniSiteInstance]
contentId + accountId ─► permission          [Confluence permission/check(read)]
```

- **`cloudId` must be cross-checked against the install record [hardened].** The HMAC signature proves
  `clientKey` only; `cloudId` is otherwise an unauthenticated claim. The verified token's `cloudId` must equal
  the `cloudId` stored on the install record for that `clientKey`, or a tenant with a valid install could
  present context claims for a `cloudId` it does not own (INV-GW-04b).
- **`contentId` must come from a SIGNED claim [hardened].** Classic Connect context JWTs do not universally
  sign `contentId`; the design must **name the exact signed claim** (and require it be HMAC/`qsh`-covered). If
  no such claim exists for this iframe type, re-derive the bind from a value that *is* signed (e.g. the macro
  `localId` carried in `qsh`). **Never** source `contentId` from the iframe URL, `AP.context`, query, or body
  (INV-GW-06b).
- **`macroInstanceId` is never authoritative on its own.** The `MiniSiteInstance` lookup is a **DB-level
  composite constraint `(clientKey, cloudId, instanceId)` [hardened]**, not an application-layer `WHERE` — so
  instance X of tenant A cannot be queried under tenant B's valid token, and the defense cannot regress
  silently (INV-GW-06).
- **Per-request permission check (closes the core CVE class):** `GET /wiki/rest/api/content/{contentId}/
  permission/check` (or v2) with operation `read` for the **verified `accountId`** (the JWT `sub`, **after**
  full authentication completes — authorization is strictly ordered after authentication [hardened]).
  `true` ⇒ proceed; `false`/non-200/timeout ⇒ **deny** (INV-GW-07).
- The check runs for **every protected byte, including sub-resources** — see §2.7 for the mechanism that makes
  this implementable.

### 2.6 Permission caching, fail-closed posture, non-routability, rate limiting, audit

- **Cache key = `hash(clientKey:cloudId:accountId:contentId:read)`** with `accountId` = the **verified `sub`**;
  the lookup happens **after** full verification, never on a header-supplied id (INV-GW-08).
- **Only positive `allow` decisions cached, TTL ≤ 60s (configurable to 0).** Cache miss ⇒ live check, never
  default-allow.
- **Fail-closed on outage:** unreachable/5xx/timeout ⇒ **deny even if a cached `allow` exists** — an outage
  does not extend the trust window (INV-GW-11). **The circuit-breaker's default/error state is DENY
  [hardened]** (a breaker bug that trips *open* would be a disclosure; it gets its own test).
- **Revocation window** = `exp-skew + cache-TTL` (§2.4 step 4). Documented and signed off, or skew set to 0.
  Stronger posture (if AVI permission-change events are reliable): event-driven invalidation → window → 0
  **[GATED]** on AVI reliability.
- **Non-routability ENFORCED (INV-GW-14) [hardened]:** dispatched user Workers have no route/subdomain/custom
  domain and are not reachable by cross-tenant Worker-to-Worker fetch — a config policy + a pen-test probe,
  not a platform assumption.
- **Rate limiting (INV-GW-15):** per-tenant + per-IP token buckets on `permission/check` and on serving
  requests. Note the **401-refresh-loop interaction [hardened]**: a 401 (auth failure) occurs *before* the
  permission check, so a buggy/malicious embed looping `401→refresh→401` is bounded only by the serving-request
  limit — make that interaction an explicit invariant.
- **Audit (INV-GW-13):** structured per-decision log `{ts, clientKey, cloudId, accountId, instanceId,
  contentId, decision, reason, ruleId, jwtExp, latencyMs}`. **Secrets and full tokens are NEVER logged
  [hardened, lint+test-enforced]** — conf-app's `authenticate.ts:28` logs the decoded token and
  `forge-installed.ts:34` logs the full lifecycle body [verified]; for classic Connect that body *contains the
  sharedSecret*. "Never log secrets" must be a structurally enforced invariant (lint rule + test), because the
  reused code violates it.
- **Secret at rest must be app-layer encrypted [hardened].** conf-app's `ClientInstallation.sharedSecret` is
  **plaintext `TEXT`** (migration 0005) [verified]; Cloudflare's default at-rest encryption is not enough (a
  D1 read or a logged row discloses it). INV-GW-10 requires **application-layer envelope/KMS-wrapped
  encryption** of `sharedSecret` and the grant-signing key (§2.7).

### 2.7 Sub-resource authorization: signed-path grant tokens (resolves the #1 open blocker) [new design]

**The problem the red team (and the auth design's own I4 residual) named as the single most important
unresolved gateway mechanic:** a mini-site is multi-file. The entrypoint `index.html` carries a Connect JWT,
but the browser then auto-loads relative sub-resources (`app.js`, `style.css`, `assets/*`) as **sub-resource
requests that carry no `Authorization` header and no `jwt` param**. Serve those unchecked and the entire ACL is
bypassed (authorize the entry doc, leak everything else). Worse, the bundle must be served from an **isolated
origin in a sandbox without `allow-same-origin` (§5.3/I6)** → the iframe has an **opaque origin** → cookies
scoped to the bundle origin are **not sent**, so a signed-cookie scheme is incompatible with the required
isolation. Neither "JWT on every sub-request" nor "auth cookie" works natively.

**Chosen mechanism — signed-path grant + `<base>` rewrite:**

1. The viewer's iframe loads the entrypoint: `GET /v/<instanceId>?jwt=<connect-jwt>`.
2. The gateway runs §2.4 + §2.5 (verify + bind + `permission/check`). **On allow**, it mints a **grant token**
   `G = base64url(payload).HMAC(payload, K_grant)` where
   `payload = {i: instanceId, c: contentId, a: accountId, cl: cloudId, exp: now + TTL}`, `TTL` = the
   permission-cache TTL (≤60s), `K_grant` = a gateway-internal, rotated, envelope-encrypted signing key.
3. The gateway serves `index.html` with an injected `<base href="/v/<instanceId>/g/<G>/">` (and the CSP/sandbox
   headers). The browser now resolves **every relative sub-resource** under `/v/<instanceId>/g/<G>/…` —
   **native relative-path resolution (the WfP Static-Assets selling point) is preserved.**
4. Every sub-resource request `GET /v/<instanceId>/g/<G>/app.js` re-enters the gateway, which:
   (a) validates `G`'s HMAC + `exp` (fail-closed on bad/expired); (b) checks the path's `<instanceId>` equals
   `G.i` (unforgeable — the client cannot mint a `G` for another `contentId`/`accountId`); (c) **re-checks the
   permission cache** for `(G.a, G.c, read)` (fail-closed on revoke/expiry/outage); then dispatches to the
   user Worker. This makes **INV-GW-07 ("every protected byte authorized") implementable**, not aspirational.
5. **Grant expiry mid-view** (TTL elapses while the tab is open): the next sub-resource 401s; the embed's
   loader re-requests the entrypoint with a fresh Connect JWT (`AP.context.getToken()`), gets a new grant, and
   the new `<base>` carries it. This *is* the concrete token-expiry-mid-view re-auth path (I4).

**Properties:** closes the sub-resource bypass; compatible with the opaque-origin sandbox (grant is in the URL
path, sent on same-document sub-resource loads regardless of origin opacity — no cookies); unforgeable
(HMAC-signed by the gateway; path `instanceId` cross-checked against `G.i`); replay-bounded (short TTL **and**
per-request permission re-check, optional IP/UA pin). **Residual:** a grant URL leaked (referrer, proxy log)
within its TTL replays for content the victim could already read — the same bounded-replay residual as the JWT
itself; mitigated by short TTL + per-request re-check; documented, not hidden. `K_grant` compromise =
forgeable grants → treat exactly like `sharedSecret` (envelope-encrypted, rotated, never logged).

**Rejected alternatives:** (a) *JWT on every sub-resource* — browsers don't attach it to relative loads;
would require rewriting every asset to an XHR-fetch+blob shim, destroying the native-relative-path property.
(b) *Signed cookie scoped to the bundle origin* — suppressed by the opaque-origin sandbox required for I6.

### 2.8 STRIDE table

| # | STRIDE | Threat | Control | Invariant |
|---|--------|--------|---------|-----------|
| 1 | Spoofing | Forged JWT | HS256 verified vs per-`(clientKey,key)` secret | INV-GW-01 |
| 2 | Spoofing | `alg=none` / RS↔HS confusion | Hard-pin `alg=HS256` before key selection; `kid` ignored | INV-GW-03 |
| 3 | Tampering | `qsh` strip/replay across method/path | Exact Atlassian canonical recompute; `context-qsh` entrypoint-only | INV-GW-02 |
| 4 | Tampering | `instanceId`/`contentId` tamper → other page's bundle | DB-level `(clientKey,cloudId,instanceId)` bind; `contentId` from signed claim | INV-GW-06/06b |
| 5 | Repudiation | Abusive access leaves no trace | Append-only audit of allow/deny; no secrets logged | INV-GW-13 |
| 6 | Info-disc | Cross-tenant via clientKey/cloudId confusion | `(clientKey,key)` secret; `cloudId`↔install cross-check | INV-GW-04/04b |
| 7 | Info-disc | IDOR — read content lacking `read` | Per-request `permission/check(read)` for verified `sub` | INV-GW-07 |
| 8 | Info-disc | Sub-resource bypass (assets unchecked) | Signed-path grant + per-asset re-check (§2.7) | INV-GW-07 |
| 9 | Info-disc | Direct hit on a user Worker | Non-routable, dispatch-only, **enforced + pen-tested** | INV-GW-14 |
| 10 | Info-disc | Serve revoked content from stale cache / outage | Fail-closed; positive cache ≤60s; breaker default = deny | INV-GW-08/11 |
| 11 | Info-disc | Expired token keeps serving | Re-verify every request; grant TTL; refresh-and-retry | INV-GW-05/12 |
| 12 | Info-disc | `sharedSecret`/`K_grant` leak | Verify+`aud`-pin install; app-layer encrypt; never log; delete on uninstall | INV-GW-10 |
| 13 | DoS | `permission/check` flood; 401-refresh loop | Per-tenant/IP rate limit; cache positives; breaker→fail-closed | INV-GW-15 |
| 14 | EoP | Unlisted/new route served unauthed | Deny-by-default routing (inverts conf-app `_middleware.ts`) | INV-GW-09 |

### 2.9 Attack tree — root: **serve a bundle to an unauthorized viewer**

```
ROOT: Unauthorized viewer obtains bundle bytes
├─ A. Defeat authentication
│  ├─ A1 Forge token            ── HS256 + per-(clientKey,key) secret (INV-GW-01)
│  ├─ A2 alg=none/confusion     ── alg pinned, kid ignored (INV-GW-03)
│  ├─ A3 reuse token cross-path ── exact qsh recompute+compare (INV-GW-02)
│  ├─ A4 replay expired token   ── exp + re-verify every req; bounded-replay residual stated (INV-GW-05)
│  ├─ A5 steal a secret         ── verified+aud-pinned installed, app-encrypt, no-log, delete (INV-GW-10)
│  └─ A6 token-extraction abuse ── single canonical extractor, 'JWT' scheme, reject jwt≠Authorization (§2.3)
├─ B. Pass auth, read another's content (the CVE class)
│  ├─ B1 tamper instanceId/contentId ── DB-level bind + signed-claim contentId (INV-GW-06/06b)
│  ├─ B2 clientKey/cloudId confusion ── (clientKey,key) secret + cloudId↔install cross-check (INV-GW-04/04b)
│  ├─ B3 skip permission/check        ── mandatory per-request, ALL assets via grant (INV-GW-07, §2.7)
│  └─ B4 win the revocation race      ── bounded: cache ≤60s, deny-on-outage, breaker default deny (INV-GW-08/11)
├─ C. Bypass the gateway
│  ├─ C1 hit a user Worker directly  ── non-routable, enforced + pen-tested (INV-GW-14)
│  ├─ C2 hit an unguarded route      ── deny-by-default routing; new-route returns 401 test (INV-GW-09)
│  └─ C3 forge/replay a grant token  ── HMAC-signed grant, short TTL, path-instanceId cross-check (§2.7)
└─ D. Poison the decision cache
   └─ D1 serve A's allow to B        ── cache key binds verified sub+content+perm (INV-GW-08)
```

Every leaf maps to a closing invariant; an uncovered leaf is a release blocker.

---

## 3. Publish / upload flows

Both entry points funnel into **one shared upload pipeline** ending at the `HostingProvider` seam (§6). The
CLI, the widget, and the pivot all call the same `provider.createInstance()` / `updateBundle()` — so a
Cloudflare→Forge pivot is a provider swap, not a publish-path rewrite. The pipeline is the security choke
point: **there is no second door.**

```
 FLOW A (dev)                       FLOW B (non-dev)
 CLI / MCP                          Connect macro editor (iframe)
   │ zips static dir, auth: token→user │ drag-drop zip/folder, auth: in-iframe Connect JWT (viewer=uploader)
   └──────────────┬──────────────────┘
                  ▼
   SHARED UPLOAD PIPELINE (Worker)  — ordering is load-bearing
   1 authn (JWT verify, §2)   2 authz (write-check for uploader)   3 bundle validation (multi-file/index.html/
   relative paths/zip-bomb guard)   4 size/file-count/MIME caps   5 SECRET-LEAK scan (I7)   6 malicious-JS
   posture → serving CSP/sandbox handoff (I6)   7 idempotent staging + atomic commit (I10)
                  │ provider.createInstance() / updateBundle()
                  ▼  HostingProvider  ── CloudflareWfPProvider (now) | ForgeProvider [GATED]
```

### 3.1 Flow A — developer publish (the friction differentiator)

AI-generated mini-sites are produced *in a terminal / build dir*. The wedge: publish straight from where the
bundle was generated — no zip-download-drag dance. Two transports over **one publish library**:
`mini-sites publish ./dist` (CLI) and an MCP tool `mini_sites.publish` (so the agent that just generated the
bundle publishes it directly).

**Auth for headless publish:** a terminal has no browser session, so we need a long-lived credential mapped to
a real Confluence user + a space/page binding.
1. **OAuth 2.0 (3LO) device grant is the default** — `mini-sites login` → Atlassian consent → refresh token in
   the OS keychain → short-lived access token per publish. Content is **attributable to a real account**
   (required for audit, I9) and enforces the same confused-deputy rule conf-app's
   `forge-upload-attachment.ts:117-134` already applies [verified] (never write where the owner can't).
2. **Scoped API token (PAT-style) is the CI fallback** — bound at creation to `(cloudId, spaceKey)` + scopes,
   minted from the app's in-Confluence settings page (so minting is itself a Connect-JWT-authenticated, audited
   action). Not account-wide.

> **[GATED] OAuth client registration** — whether we can register a public OAuth client with the device grant
> and the exact scopes (`write:confluence-content`, `read:confluence-content.permission`, custom-content
> write) is a vendor capability to confirm before building Flow A. Until confirmed, Flow A ships token-only.

**Space/page binding (two-phase, so the CLI never models Confluence page structure):**
`mini-sites publish ./dist --space ENG --name "Release Dashboard"` creates/updates a `MiniSiteInstance` and
returns an **instance handle** (`mini-site:<instanceId>` macro snippet + smart-link). The user drops the macro
on a page (or pastes the smart-link). **The macro body stores only the `instanceId`, never the bundle** —
mirroring conf-app, where the macro body carries a content reference and the heavy artifact lives elsewhere.

### 3.2 Flow B — non-developer publish (drag-and-drop in the macro editor)

Auth is the **in-iframe Connect JWT of the viewing user** (the uploader *is* the authenticated user). Frontend
follows the project's container/presentational split (Vue 3, per `conf-app/src` patterns):

- **`UploadContainer.vue`** (smart): owns the upload state machine, injects an `uploadClient` (DI) so it is
  testable without a network and works unchanged against `CloudflareWfPProvider` or `ForgeProvider`.
- **`UploadDropzone.vue`** (dumb): renders idle/drag-over/progress/done/error; emits `files-selected`,
  `retry`, `cancel`. No fetch, no business logic.
- **`BundleValidationReport.vue`** (dumb): renders per-file validation/scan results.

```
idle ─files-selected─▶ validating ─ok─▶ uploading ─commit-ok─▶ done
  ▲                        │              │                       │
  └──────retry──────── error ◀─fail───────┘──────reset───────────┘
```

Client-side `validating` is **UX only** (instant rejection of a single `.html` → "use the existing HTML
macro"); the server re-runs every check authoritatively. **Error surfaces must be distinct and actionable:**
`BUNDLE_NOT_MULTIFILE`, `MISSING_INDEX_HTML`, `ABSOLUTE_PATH_REJECTED`, `PATH_TRAVERSAL_REJECTED`,
`TOO_MANY_FILES`, `BUNDLE_TOO_LARGE`, `SECRET_DETECTED`, `COMMIT_FAILED_ROLLED_BACK` — each maps to one
analytics label so we can measure where authors bounce.

### 3.3 Shared upload pipeline — `pipeline/uploadPipeline.ts` (both flows, identical)

Ordering is load-bearing: **authn → authz → validate → secret-scan → posture → atomic commit.** A bundle that
fails any step **never reaches `status=live`.**

- **1 Authn** (auth-gateway code, §2): `cloudId`/`apiBaseUrl` come from the **verified token**, never the body
  (reuse conf-app's verified-token-as-source-of-truth rule from `forge-upload-attachment.ts` [verified]).
- **2 Authz (confused-deputy guard):** confirm the uploader can **write** the target space/page using *their*
  token (the v2 permission pattern in `forge-upload-attachment.ts:117-134`, generalized read→write).
- **3 Bundle validation:** require multi-file with a root `index.html`; **every path relative** (no
  `http(s)://`, no leading `/`, no `..` — same constraint shape as `ATTACHMENT_NAME_RE`, extended to a full
  manifest); reject single-file `.html` as out of scope; **zip-bomb guard** (cap decompressed total + ratio).
- **4 Size/count caps** — per-bundle, per-file, max file count, allowed MIME list; server-authoritative
  (mirrors `MAX_PNG_BYTES` + magic-byte checks, generalized to N files).
- **5 Secret-leak scan (I7) [GATED ruleset]:** high-signal patterns (cloud keys, bearer tokens, PEM headers,
  `.env` assignments) + entropy + allow-list; a confirmed hit ⇒ **hard fail**, no bytes persisted.
- **6 Malicious-JS posture handoff (I6):** the pipeline does not try to prove JS safe (undecidable); it
  **records the serving contract** (per-instance strict CSP, isolated per-bundle origin, `sandbox` framing, no
  ambient app credentials) and attaches it to the committed instance metadata. The serving layer (§5.3)
  enforces it.
- **7 Idempotency + partial-failure recovery (I10):** content-addressed `bundleHash` + `Idempotency-Key`;
  **stage** (`status=staging`) and flip to `live`/`latestVersion=N` only in a **single atomic commit** after
  3–6 pass (reuses conf-app's `INSERT OR IGNORE` version-row idiom + "version exists → skip"
  `forge-custom-content.ts:44-67`). A crash mid-upload leaves a `staging` row that is never served and is GC'd.

### 3.4 Provisioning is an async JOB, not a request [hardened — gap closed after review]

Spinning up a user Worker (WfP script-upload + Static-Assets upload of many/large files + a reachability
smoke-check) **can take minutes** and can exceed a single Worker request's wall-clock budget. So the publish
HTTP request **must not block on provisioning** — it validates + stages + **enqueues a provisioning job and
returns `202`**; the actual `provider.createInstance/updateBundle` runs asynchronously.

- **Substrate (chosen): Cloudflare Workflows** (durable execution). A `ProvisionInstance` workflow runs the
  multi-step provision — `upload script → upload static assets → smoke-verify reachable via dispatch → flip
  MiniSiteInstance to active` — with **per-step durability, automatic retries + backoff, and survival across
  minutes/restarts**. *Rejected alternatives:* a plain **Cloudflare Queue + consumer Worker** (works, but you
  hand-roll the step-state/retry/status that Workflows gives natively) — keep as the fallback if Workflows
  isn't available in an env; a **Durable Object** coordinator (overkill unless we need fan-in across steps).
- **Job model:** a `ProvisioningJob` row — `{ jobId, instanceId, version, state ['queued'|'provisioning'|
  'active'|'failed'], step, attempts, lastError, startedAt, updatedAt }` — decoupled from `MiniSiteInstance`
  so retries/history don't muddy the instance row. The instance stays `staging` and **un-servable** until the
  workflow's final atomic step flips it to `active` (the gateway never serves `staging`/`provisioning`; INV I10).
- **Contract:** `POST` publish → validate+stage → **`202 { jobId, statusUrl }`**; `GET /api/jobs/{jobId}` →
  `{ state, step, progress, error }`. The CLI and the macro-editor widget **poll** this. *This is exactly what
  the Upload UI's `uploading` state already models* — the ticking file manifest and the progress numeral are
  the front-end of this job; the backend just exposes it. (See the Upload UI prototype.)
- **Invariant ties:** the job is **idempotent** (`Idempotency-Key` + `bundleHash` → a retried publish resumes
  the same job, never a duplicate Worker — I10); a **failed** job leaves no servable bytes; the **orphan reaper**
  reaps instances/jobs stuck in `provisioning`/`staging` past a TTL (ties I1 ↔ I10); per-step **backoff /
  circuit-break** avoids amplifying a Cloudflare/WfP outage (I10 retry-storm note).
- **Forge-pivot:** `ForgeProvider` provisioning (custom-content + ~100MB/file attachment chunking + reassembly)
  is *also* long-running, so the **same job model lives ABOVE the `HostingProvider` seam** — the job orchestrates
  `provider.createInstance` regardless of substrate, so the async manager survives the pivot unchanged.

---

## 4. Serving & CSP enforcement (where the bytes leave the edge)

This consolidates the serving-time contract that §2.7 (grants) and §5.3 (I6) each touch; there is no separate
serving subsystem — **the dispatch Worker is in-path for every byte**, so enforcement happens there, and the
user Worker only returns raw asset bytes.

- **Every byte passes the gateway.** Because relative sub-resources resolve under the signed `/g/<grant>/`
  path (§2.7), there is no asset request that reaches the user Worker without a grant + permission re-check.
  The user Worker has no auth logic and is non-routable (§1.1, INV-GW-14).
- **The gateway sets response security headers** on the way out — it does **not** trust the user Worker to set
  them: per-bundle CSP (pinned baseline in §5.3/I6 — `frame-ancestors` = embed origin only; `script-src` self
  + bundle origin; restricted `connect-src`/`form-action`), `X-Content-Type-Options: nosniff`, and the correct
  per-asset `Content-Type`. The bundle is framed `sandbox` without `allow-same-origin` relative to the control
  plane.
- **Per-bundle origin isolation** (§5.3/I6 part 1) is the host-level control that makes the CSP meaningful:
  the bundle origin never holds the gateway's auth state or `K_grant`, and same-tenant bundle A cannot reach
  bundle B.
- **Caching:** the permission decision cache (§2.6) is keyed by verified `(clientKey:cloudId:accountId:
  contentId:read)`; any edge/Cache-API entry for bundle bytes **must include `cloudId` in its key** (I8
  `[hardened]`) so a cache entry can never be replayed cross-tenant.

The serving path is therefore fully specified by §1.4 (flow), §2.5–§2.7 (authz + grants), and §5.3 (CSP/
sandbox/origin); this section only states the single rule that ties them together: **enforce at the gateway,
never at the user Worker.**

---

## 5. Testable invariants & threat models (gate-#3 deliverable)

> Each constraint → a falsifiable invariant, the threat it guards, the concrete test (named layer + assertion),
> and honest residual risk. The auth-gateway invariants `INV-GW-*` (§2) are the detailed expansion of the
> access invariants below. **[hardened]** items were added/strengthened after the completeness critic's review.

### 5.1 Sub-model A — LIFECYCLE (constraints 1 & 2)

Shared structure: a `BundleRegistry`/`MiniSiteInstance` row keyed by `(clientKey, cloudId, instanceId)` with
the immutable `bundleId` storage handle and the owning `contentId` (mirrors conf-app `CustomContent` keyed by
`(contentId, appId)`, migration `0004` [verified]).

**I1 — Orphan GC reconciliation correctness.** *Invariant:* a stored bundle is retained **iff** a reachability
check confirms its owning `contentId` still exists and still references that `bundleId`; a bundle
confirmed-absent for `≥ GRACE_PERIOD` consecutive passes is deleted; a bundle whose owner **cannot be confirmed
present or absent** (API error/outage) is **never deleted** (fail-safe-retain) and **never served** beyond the
permission gate (fail-closed-serve, I3). *Threat:* (a) storage leak/cost from no delete webhook; (b) worse —
**wrong deletion** of a live bundle because a transient outage looked like "deleted." *Why reconciliation:*
Connect emits no reliable per-macro delete event; the repo's `aggregate-events.ts` (`x-cron-secret` →
`purgeOldEvents`) [verified] is the shape, but the external-reachability probe is net-new.
*Test:* unit table over the state machine (`present→retained`; `absent×(GRACE-1)→retained`; `absent×GRACE→
deleted once`; `apiError→counter unchanged, retained`); integration over local D1 + in-memory provider; E2E
(`tests/e2e-tests/tests/lifecycle/orphan-gc.spec.ts`) create→delete page→reconcile→assert 404 + row gone.
**[hardened] added invariants:**
- **I1a — owner-identity stability:** reachability must survive page **move/rename/space-relocation**, and a
  **restore-from-trash that returns a NEW `contentId` must re-bind, not orphan** (the single probe on `exists`
  is insufficient). Default: treat trash as present (retain) until purge.
- **I1b — registry-store outage:** if `BundleRegistry`/D1 is itself unreadable, **serve = 403** (cannot confirm
  ownership ⇒ deny) — distinct from the permission-outage case (I3).
- **I1c — inbound copy-pointer retention:** a bundle with any inbound un-forked copy-pointer (I2) is retained
  (else GC deletes a source an un-rendered copy still depends on, making the copy permanently un-forkable).
- **I1d — reconcile blast-radius cap:** the reconcile endpoint is triggered by a shared secret (`x-cron-secret`
  pattern); a leaked secret = attacker-driven mass deletion. The reaper **cannot delete > N bundles/pass
  without a second control**.
*Residual:* eventually-consistent (bundle survives up to `GRACE × interval`); unbounded leak during a sustained
Confluence outage (correct by design).

**I2 — Copy/duplicate/template/space-export semantics.** *Invariant:* a copied macro instance **never shares a
mutable bundle with its source and never overwrites it**. On first authenticated render or save of a macro
whose Confluence identity differs from the `bundleId`'s recorded owner, the gateway **forks**
(copy-on-access snapshot → new `bundleId`, rebind new `contentId`); the source binding is byte-for-byte
unchanged. *Threat:* silent shared mutable state — proven real in the repo: on copy "the Forge context still
points at the source customContent … the save creates a fresh record with a different id" + `diagram.isCopy`
(`src/model/ContentProvider/Persistence.ts ~62-69`, conf-app#170). For a hosted bundle, two pages on one
mutable bundle = editing one silently rewrites the other; a template instantiated 50× must yield 50 independent
bundles. *Test:* unit (`forkOnCopy.spec.ts`) fork-on-foreign-access + idempotent (no re-fork); integration
(10 distinct `contentId`s → 10 distinct `bundleId`s, source byte-identical); E2E reusing
`tests/e2e-tests/helpers/macroDuplication.ts` (`duplicateMacroSamePage`, `copyMacroToNewPage`) — mutate the
copy, assert source unchanged (UI evidence). *Residual:* a never-rendered/never-saved copy keeps a dangling
pointer (covered by I1c). Bulk space-export captures the macro body but not the external bundle → importing
site renders a "bundle not available in this site" placeholder (cross-tenant, I8). Eager fork on a copy/export
AVI event is **[GATED]** on whether `avi:confluence:*` copy/export events fire reliably.

### 5.2 Sub-model B — ACCESS / AUTH GATEWAY (constraints 3, 4, 8) — primary pen-test targets

**I3 — Permission-cache staleness / fail-closed serving.** *Invariant:* a protected request is served **only
if** a decision for `(viewerAccountId, contentId, "read")` is currently affirmative under a cache entry younger
than `PERM_CACHE_TTL`; absent/expired/erroring ⇒ **403, never the bundle**; revocation invalidates within
`≤ TTL`. *Threat:* serving revoked content (direct disclosure, since permissions are app-enforced). conf-app's
`src/model/page/CheckPermission.ts` posts to `/permission/check` and **returns `false` on any error**
[verified] — that fail-closed default is the load-bearing pattern. *Test:* unit
(`allow+fresh→serve`; `allow+expired→re-check`; **`recheck throws→403`** — the most important assertion;
`deny→403`; `revoke→403`); integration flip allow→deny; E2E revoke-no-serve + **pen-test rider** (direct
user-Worker probe must fail, INV-GW-14). *Residual:* ≤`TTL` window for a just-revoked user (shrink to 0 = a
synchronous Confluence call per asset → latency/rate-limit/cost **[COST]**); event-driven invalidation
**[GATED]** on AVI reliability. Confluence's effective permission (page restrictions vs space perms vs
inherited) is subtle — the pen-test must probe restriction-inheritance edge cases.

**I4 — Token expiry mid-view.** *Invariant:* every protected request carries a currently-valid grant derived
from a currently-valid Atlassian JWT (§2.7); expired/malformed ⇒ **401 with a re-auth signal**, never
cached-as-allow, never served; a view outliving token lifetime degrades to a re-auth prompt, not open access.
*Threat:* a long-open embed whose initial token expires, naively kept serving (bypass) or crashing. *Mechanism:*
resolved by §2.7 (signed-path grant + refresh-and-retry) — **this closes the previously-unimplementable gap.**
*Test:* unit (`valid→pass`; `exp past→401`; `bad sig→401`; `qsh mismatch→401`; `wrong aud/app→401`, fixed
clock); integration (token `exp=now+2s`: 200 at T+0, 401 at T+3s, no bytes); E2E hold-open→asset-fetch→re-auth
(UI evidence). *Residual:* clock skew needs `clockTolerance` leeway but it composes with cache TTL (~120s, see
§2.4) — sign off or set to 0. Re-auth inside a sandboxed iframe relies on messaging the parent; if the parent
is evicted the view fails closed (acceptable) — **add an E2E for the eviction path, not just the happy path
[hardened]**.

**I8 — Tenant isolation (cross-install / cross-space / cross-instance).** *Invariant:* no request authenticated
for `cloudId=A` can read/list/enumerate/provision any `bundleId` owned by `cloudId=B`; every storage key,
registry row, permission check, dispatch route, **and edge-cache key** is namespaced by `cloudId` (taken from
the verified token, never the URL); a `cloudId` mismatch ⇒ 404 (preferred over 403 to avoid an existence
oracle). *Threat:* cross-tenant exposure — the highest-severity failure and a guaranteed Cloud-Fortified
blocker. conf-app already namespaces by `cloudId` everywhere (`license:${cloudId}:${spaceKey}` KV,
`page-snapshots/${cloudId}/...` R2) [verified]. *Test:* unit (A-token → B-resource → 404; key-builder cannot
produce a B key from an A context); integration (exhaustive A→B combinations: direct id, guessed id,
enumeration — **all three of cross-install / cross-space / cross-instance asserted distinctly**, honoring
scope); E2E two-tenant deny + audit entry. **[hardened]:** move the **edge-cache-key-includes-`cloudId`**
property from manual-pen-test-only to an **automated unit assertion on the cache-key builder** (identical to
the storage-key builder test) — a Cache API key omitting `cloudId` is a cross-tenant cache poison. *Residual
[PROVIDER-SPECIFIC]:* a WfP namespace-isolation platform bug is vendor risk (disclose in the review).

### 5.3 Sub-model C — UPLOADED-CONTENT SECURITY (constraints 6, 7)

**I6 — Malicious uploaded JS: sandboxing / CSP / origin isolation.** *Invariant (all must hold):*
1. **Per-bundle origin isolation [hardened — HARD, not "ideally"]:** every bundle is served from an origin
   distinct from the control-plane origin **and distinct per bundle** (not merely per tenant). Same-tenant
   bundle A must not be able to script bundle B, fetch B's assets, read B via a co-framed DOM, or poison a
   shared-origin edge-cache key. Uploaded JS never executes on the origin holding the gateway's
   auth state.
2. **Iframe sandbox:** `<iframe sandbox="allow-scripts allow-forms allow-popups-to-escape-sandbox">` — **no
   `allow-same-origin`** relative to the control plane (opaque origin; this is why §2.7 uses path grants, not
   cookies).
3. **CSP [GATED baseline — but pinned now]:** the bundle response carries a restrictive CSP. **Pin the baseline
   directives now so I6 is falsifiable [hardened]** (the critic noted a fully-GATED CSP makes the invariant
   untestable): `frame-ancestors` = the Confluence/app embed origin only (anti-clickjacking); `script-src`
   self + bundle origin (no inline unless hashed); `connect-src`/`form-action` restricted to prevent the
   bundle exfiltrating to or phishing via the trusted origin; never `frame-ancestors *`. Security review may
   tighten, not loosen.
4. **No trusted-origin authority leak:** a bundle response never sets or exposes the gateway's session
   state/`K_grant` to bundle-origin script.
*Threat:* attacker JS from a trusted-looking domain → XSS, credential phishing, malware, clickjacking. We host
*active* bundles (the product), so we cannot sanitize JS away — we **contain** it. Least precedent in conf-app
(it renders its own diagram output, not arbitrary uploaded JS) → highest-novelty risk, named Cloud-Fortified
focus. *Test:* unit (every response has the CSP, `nosniff`, correct `Content-Type`, bundle-origin ≠
control-plane); integration with a hostile fixture attempting `top.location`, `document.cookie`, exfil `fetch`
→ all blocked; **add the four same-tenant fixtures [hardened]:** A-scripts-B, A-fetches-B-assets,
shared-origin-cache-poison, B-readable-via-co-framed-DOM; E2E in a real embed (console/UI evidence). *Residual
[PROVIDER-SPECIFIC]:* containment ≠ content-safety (a cryptominer/phish *within* its own sandbox needs I7 +
abuse policy, not CSP). Forge-equivalent: platform CSP/sandbox shifts much of this to Atlassian — a genuine
posture advantage *if* the pivot is forced (but reassembly re-expands in-iframe surface, §6).

**I7 — Secret-leak detection.** *Invariant:* every upload is scanned before it is servable; a detected secret
**blocks go-live** (or quarantines), notifies the uploader, and is audit-logged (I9); "made servable" never
precedes "scan completed." **[hardened] I7↔I10 coupling:** a **scanner-version bump must re-quarantine
already-live bundles** until re-scan. *Threat:* an AI-generated bundle with a baked-in key/token/PEM becomes
readable by everyone with page access and persists externally — a customer incident + a processor liability.
*Test:* unit fixture table (AWS/Google/JWT/PEM/`password=` detected; UUID/hex-color/base64-image not flagged);
integration (secret bundle → `quarantined`, not servable); E2E blocked-with-reason. *Residual:* scanning is
best-effort (novel/obfuscated/encrypted secrets evade; false positives frustrate) — **state to customers as
best-effort, not a guarantee**; we notify, we do not rotate/revoke the leaked secret. Per-upload CPU **[COST]**.

### 5.4 Sub-model D — OPERATIONS & COMPLIANCE (constraints 5, 9, 10)

**I5 — GDPR/DSAR erasure on the external host.** *Invariant:* a DSAR/erasure request results, within SLA, in
**provable deletion** of all copies of the affected bundle bytes + metadata across **every** store (primary
object store, derived caches, backups) such that a post-deletion fetch of any prior `bundleId` returns 404 and
an auditable deletion record exists. No soft delete satisfies it for the bytes. **[hardened] fork-lineage
transitivity:** erasure must **transitively erase every I2 fork descended from the target**, not just the
named `bundleId` (`listStoresHolding` is per-bundleId and would miss forks). *Threat:* inability to honor
erasure because data lives externally with caches/backups we don't account for — a GDPR/DPA blocker. *Test:*
unit (enumerate `listStoresHolding(bundleId)` + assert a delete per store, none skipped + a deletion
certificate); integration (write→populate edge cache→erase→object-store 404 + cache purge + row gone +
record); E2E full-tenant erasure → every prior URL 404. *Residual (significant):* **backups** — true "bytes
exist nowhere" may be achievable only after backup-retention expiry (GDPR permits documented, bounded
backup-rotation delays — must be verified with Cloudflare and stated in the DPA, **[COST] + [GATED]**); edge
purge is async ("purge issued" ≠ "globally complete" — set a served-bytes-after-erasure bound); **I9 audit logs
contain the DSAR subject's `actorAccountId`** — resolve the retention basis (pseudonymize vs legitimate-interest)
rather than deferring (**OPEN — legal**).

**I9 — Audit logs.** *Invariant:* every security-relevant event (auth decision, permission re-check, upload/
scan, fork-on-copy, GC deletion, DSAR erasure, cross-tenant denial) is written to an **append-only,
tamper-evident** log `(timestamp, cloudId, actorAccountId, action, resourceId, outcome)`, retained, and
queryable; no code path updates/deletes an existing row before retention expiry. *Threat:* inability to
investigate/prove an incident; an attacker (or bug) erasing tracks. conf-app has the substrate (insert-only D1
fact tables + immutable R2 archival) [verified] but **not** hash-chaining. *Test:* unit (API exposes only
`append`+`query`; each record has required fields + a prior-record hash); integration (tamper a middle record
→ verifier detects); E2E (a denied cross-tenant access + a GC deletion both appear). **[hardened] tail-
truncation:** a hash chain in mutable D1 detects **middle edits but not deletion of the most recent records** —
an attacker with DB creds can truncate the tail undetectably. Pin the chain **HEAD/length to an external
append-only anchor** (R2 Object Lock or a periodic external checkpoint) to make tail-truncation detectable
**[COST]**. *Residual:* tamper-*proof* (vs evident) needs WORM/Object-Lock/external SIEM **[COST]**; log volume
at 10k instances is non-trivial.

**I10 — Partial-failure recovery (no half-state serves).** *Invariant:* a bundle is servable **iff** its
provisioning completed atomically (bytes fully written **and** registry committed **and** scan passed); any
mid-way failure leaves it **not servable**, and the transaction is idempotently resumable or cleanly rolled
back — never a half-deployed Worker serving a truncated bundle. *Threat:* WfP Worker-create + asset-upload +
registry-write + scan has no native cross-system transaction; a gap could leave a Worker serving partial
assets, a registry row pointing at nothing, or a "live" bundle that was never scanned (bypassing I7). conf-app
documents exactly this idempotent-resume discipline (`forge-custom-content.ts:44-67`, "recover from prior
requests that inserted the version but failed before completing the write") [verified]. *Test:* unit (inject
failure after each step → `isServable=false` in every partial state; re-run is idempotent); integration
(provider throws mid-write → "not ready", cleanup/retry reconciles, ties to I1 GC); E2E kill-mid-deploy →
"deploying/failed" not a broken half-render → retry succeeds. **[hardened] additions:** (a) a **serve-time
content-hash** integrity check for the **committed-but-corrupt** case (write succeeded, bytes wrong — not
caught by transaction logic) **[COST]**; (b) **retry-storm backoff/circuit-breaking** as an invariant (avoid
amplifying a Cloudflare outage); (c) the I7 re-scan-on-version-bump tie-in.

### 5.5 New cross-cutting invariant — abuse / DoS bounds [hardened]

*Invariant (was missing entirely):* the system bounds **upload size/count**, **fork amplification** (a template
instantiated N× = N `copyBundle` calls — cap per pass/tenant), **reconcile-endpoint abuse** (I1d blast-radius
cap), and **bundle-serve bandwidth** per tenant. Compromise of any control secret (`x-cron-secret`, `K_grant`,
PAT) must not enable mass deletion or forged grants — secrets are rotated, envelope-encrypted, never logged,
and the reconcile path requires a second control beyond the shared secret.

### 5.6 Cross-cutting notes

- **Cost honesty:** I3 (tight TTL + invalidation infra), I5 (cross-store provable erasure + backup bound), I6
  (per-bundle origin + pen-test), I9 (tamper-evident store + volume), I1 (standing reconciliation cron) each
  add recurring cost/ops **[COST]**, plus a periodic external pen-test. The "solo-buildable" premise survives
  the *happy path* but not the *full invariant set* — a finding, not a blocker.
- **Provider seam:** I6 and I8 are the invariants whose *threat surface* changes most under Forge (§6); I1, I2,
  I5, I7, I9, I10 are provider-agnostic and port unchanged.

---

## 6. Forge-pivot insulation (gated fallback)

> If gate #1's residency review **rejects an external processor**, Cloudflare is **disqualified** and we pivot
> to a Forge-native fallback — but **only** after a Forge feasibility spike passes (client-side reassembly,
> ~100MB/file cap, Object Store EAP). This section exists so that flip is **bounded**, not a rewrite. **None of
> the gates are assumed resolved.**

### 6.1 The seam: two distinct host abstractions

| Seam | Abstracts | conf-app analog | Mini-Sites name |
|------|-----------|-----------------|-----------------|
| **Confluence side** | macro render, content reads, permission checks, metadata storage | `IApWrapper`/`ApWrapper2` (`src/model/IApWrapper.ts`) [verified] | `IConfluenceHost` (reuse `IApWrapper` shape) |
| **Hosting side** | where bundle **bytes** live, how served, how a viewer is authorized | **none** — conf-app stores only diagram DSL; no large-asset hosting substrate | `HostingProvider` (new, load-bearing) |

```ts
// src/hosting/HostingProvider.ts — the seam contract. NO module above src/hosting/ imports a
// Cloudflare or Forge SDK. (See §6.4: this boundary is NEW and CI-enforced — conf-app does NOT
// actually confine its host SDK, so we cannot inherit the discipline; we must build + gate it.)
export type InstanceHandle = { readonly id: string; readonly providerRef: string }; // opaque to upper layers

export interface ValidatedBundle {                 // produced ABOVE the seam (scan/CSP/secret-leak/manifest)
  readonly files: ReadonlyArray<{ path: string; bytes: Uint8Array; contentType: string }>;
  readonly entrypoint: string; readonly contentHash: string; readonly totalBytes: number;
}
export interface ServeAuthContext {                // decided ABOVE the seam by the auth gateway
  readonly cloudId: string; readonly pageId: string; readonly accountId: string; readonly grantedAt: number;
}
export interface HostingProvider {
  createInstance(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void>;   // idempotent on id
  updateBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void>;     // atomic from viewer POV
  deleteInstance(handle: InstanceHandle): Promise<void>;                            // idempotent (GC calls blind)
  serve(handle: InstanceHandle, filePath: string, auth: ServeAuthContext): Promise<Response>;
  verifyHostToken(rawToken: string): Promise<HostIdentity>; // WfP: Connect HS256/qsh; Forge: invocation JWKS
  readonly permissionModel: 'app-enforced' | 'inherited';   // drives which invariants apply
  readonly capabilities: HostingCapabilities;                // maxFileBytes, supportsServerSideServe, ...
}
```

**Above the seam (provider-agnostic, reused on pivot):** macro registration & render; the upload pipeline
(unzip, manifest, CSP rewrite, secret-scan, sandbox policy); the auth-gateway *orchestration* (verify +
`permission/check`); lifecycle reconciliation (orphan/copy/export/DSAR/partial-failure); the **invariant test
suite** (runs against the interface via a fake + a contract-test pack each provider must pass).
**Below the seam (rewritten on pivot):** `CloudflareWfPProvider` (dispatch namespace, user Workers, Static
Assets, D1 mapping, `wrangler-*.toml`); `ForgeProvider` (gated).

### 6.2 Forge fallback reality check — NOT free [hardened: corrected estimate]

| Forge constraint | Consequence below the seam |
|---|---|
| **No server-side static serving** | `serve()` cannot stream files; the bundle must be **reassembled client-side** in the iframe (fetch all files + blob-URL/service-worker relative-path rewrite). |
| **~100MB/file + custom-content body limits** | large bundles rejected/chunked across attachments. |
| **Object Store EAP-only** | fallback storage = custom-content + attachments (proven path: `forge-upload-attachment.ts` handles ONE PNG with magic-byte + size cap [verified] — the **multi-file pipeline is net-new**). |
| **No dispatch-namespace equivalent** | per-instance isolation becomes **logical** (app-scoped), not physical. |

**`serve()` is NOT a no-op behind a flag [critical correction].** Under Forge it **relocates the entire serving
mechanism into a new client-side reassembly engine on the security-critical render path** — fetch-all-files +
relative-path rewriting (script `src`, CSS `url()`) via blob:/service-worker + CSP-on-blob-origin handling.
That is **net-new, security-critical code that the ≥80%-reuse figure must exclude** — not a one-line
`supportsServerSideServe=false`.

**Which invariants change MEANING (not "shrink") under Forge [corrected]:**

| # | Cloudflare | Forge | Honest delta |
|---|---|---|---|
| 4 | byte-level no-leak: user Worker never reached on revoke | files are fetched **into the iframe** to reassemble; once shipped they cannot be un-shipped | **The strongest clause becomes FALSE** — not a shrink. |
| 6 | served from a trusted-looking origin → XSS HIGH | platform CSP/sandbox lowers origin risk, **but client-side reassembly EXPANDS in-iframe attack surface** | **Mixed/net-new**, not a clean shrink. |
| 8 | physical isolation (separate Workers + namespace) | **logical** isolation by app-code id-filtering of one app-scoped store | The failure mode **relocates** from gateway to storage-scoping app code — i.e. it re-introduces an app-enforced-ACL (CVE-class) risk; it does not disappear. |
| 3 | app-enforced ACL (HIGH) | permissions inherited; gateway check = defense-in-depth | Genuinely shrinks. |
| 5 | external-processor erasure (the residency objection) | data in-boundary; erasure via custom-content delete | Shrinks — this is *why* a customer would force the pivot. |
| 1,2 | reconcile by deleting Workers | reconcile by deleting custom content; **same** no-reliable-delete-webhook problem | Reused; storage caps make stale-bundle bloat costlier. |
| 7,9,10 | above the seam | above the seam | No delta — the payoff of the seam. |

**Bottom line:** Forge does not make the security problem disappear — it **relocates** it (gateway CVE-risk
down; client-reassembly + hard storage caps up). The feasibility spike must prove reassembly + relative-path
rewriting + ~100MB/file chunking + CSP-on-blob viability **on real bundles before a single `ForgeProvider`
line is written**.

**Monetization / tiering (another quiet Forge advantage).** Two-tier pricing (e.g. Standard + Advanced) is
supported on the Marketplace via **app editions** — but **only for Paid-via-Atlassian (PvA)** apps. On the
**Forge path** this is clean: set `licensing.editionsEnabled: true` in the manifest and gate features off
`getAppContext().license.capabilitySet` (`"capabilityadvanced"` vs Standard/`null`). On the **Cloudflare
path**, the dispatch Worker runs *outside* the Forge runtime, so there is no `capabilitySet` — tiering means
either (a) the auth gateway (§2) fetches+caches the Marketplace/Connect license per `cloudId` as one more
server-side check, or (b) you bill outside Atlassian (your own metering keyed by `cloudId`). Natural tier
split maps onto the cost-drivers in §1.5: put audit-log access (I9), larger bundle/instance limits,
configurable secret-scan policy (I7), CLI/MCP publish (Flow A), and SLA support in **Advanced**, so the
expensive invariants sit behind the paid tier. (`capabilitySet`/`editionsEnabled` verified against
developer.atlassian.com 2026-06.)

### 6.3 Blast radius if forced to pivot — re-estimated honestly

- **Survives unchanged:** macro components; upload pipeline; auth-gateway *orchestration*; lifecycle
  reconciliation; the entire invariant test suite; `IConfluenceHost`/`IApWrapper`-derived access.
- **Rewritten/new (must be excluded from the reuse figure):** `CloudflareWfPProvider`→`ForgeProvider`; **the
  client-side reassembly engine + relative-path rewriter + CSP-on-blob** (security-critical render-path, net-new);
  storage mapping (D1↔Forge is **unproven** — `workerName` join keys are meaningless on Forge; Forge SQL is
  EAP/limited; conf-app has **two unrelated** storage systems, no dual-substrate abstraction to copy); deploy
  config.
- **Greenfield regardless of pivot:** the **Connect symmetric auth gateway** (qsh/sharedSecret/iss→tenant) has
  **zero precedent in conf-app** (Forge-only) — it is net-new on the *primary* path, the CVSS-9.1 component.
- **Effort:** the "2–4 weeks, ≥80% reuse" figure is **only credible if** the reassembly engine and the
  greenfield Connect auth gateway are scoped *separately* and the seam-boundary CI gate (§6.4) actually holds.
  Treat 2–4 weeks as the *provider-impl + spike* slice, **not** the all-in pivot.

### 6.4 The seam contract is NEW and must be machine-enforced [hardened — conf-app does NOT do this]

The original design claimed the boundary is enforced "exactly as conf-app keeps `@forge/bridge` confined to
`forgeGlobal.ts`." **That is false** [verified by red team]: conf-app imports `@forge/bridge` from **15+
non-test modules** (`requestUtil.ts`, `draftStore.ts`, `ApWrapper2.ts`, multiple `.vue`, …), has **no
`no-restricted-imports`/boundary lint rule** (`.eslintrc.js` `rules:{}`), and `eslint.config.mjs` **ignores
`functions/`** (the entire backend). conf-app is therefore **live evidence the discipline rots without a
gate.** So:

- **INV-SEAM-01:** a CI-enforced architectural-boundary check (`eslint no-restricted-imports` or
  `dependency-cruiser`) **fails the build** on any `@cloudflare/*` or `@forge/*` import **above `src/hosting/`**,
  and **must lint `functions/`** (do not inherit conf-app's ignore). Built from day one — the ≥80% reuse number
  is unprotected without it.
- **INV-SEAM-02:** the auth decision and bundle validation are made **once, above the seam**, and merely
  *enforced* below it; storage-layout decisions below the seam may not require re-reading bundle semantics
  (guards the Forge chunking↔manifest coupling).
- **INV-SEAM-03:** a per-provider **contract-test pack** asserts each capability — including **native
  relative-path resolution** (provider-native on WfP, provider-absent on Forge) so a `ForgeProvider` that
  silently degrades the product's core capability fails CI, and the **as-served CSP/sandbox posture** (on Forge
  the blob/service-worker reassembly is a new effective origin — assert posture against the *as-served* form,
  not only the validated source).

---

## 7. Open questions & what is GATED (nothing below is assumed resolved)

1. **[GATE #1 — residency-vs-access]** If the anchor team's security requires **no external processor**,
   Cloudflare is disqualified → §6 pivot. Until written confirmation, the whole architecture is conditional.
2. **[GATE #2 — demand-to-pay]** ≥3 prospects beyond the n=1 anchor team, each approving the **actual
   external-processor architecture** (residency + DPA + auth-gateway threat model). Demand from a prospect
   whose security would veto the external host does not count.
3. **[GATE #3 — acceptance criteria signed off]** This document (§2, §5) is that artifact; it needs sign-off.
4. **[GATE #4 — EV vs next ZenUML feature + kill criterion]** Stronger than "cheap to build" — re-cost (§1.5)
   shows it is *not* cheap to make safe/compliant.
5. **`contentId` signed-claim** — name the exact HMAC/`qsh`-covered claim that yields `contentId` for the §2.5
   bind; if none exists for this iframe type, re-derive from the macro `localId` in `qsh`.
6. **OAuth client registration + scopes** for Flow A device grant (§3.1).
7. **AVI event reliability** for copy/export eager-fork (I2) and permission-change cache invalidation (I3).
8. **CSP baseline** final directive set (I6) — pinned provisionally in §5.3; security review may tighten.
9. **DSAR vs audit retention** — legal basis for `actorAccountId` of an erased subject in I9.
10. **Backup-retention bound** with Cloudflare for provable I5 erasure → DPA language.
11. **Forge feasibility spike** (gate-adjacent) — reassembly + relative-path rewrite + 100MB chunking +
    CSP-on-blob on real bundles, **before** any `ForgeProvider` line.
12. **Tiering / billing mechanism** — if two-tier pricing is wanted, decide between Marketplace **app editions**
    (PvA; clean on Forge via `capabilitySet`, but on Cloudflare requires a gateway license-check per `cloudId`)
    vs **own billing** outside Atlassian. Note conf-app today tiers via **two separate listings** (Lite/Full,
    `UNIQUE(clientKey,key)`), not editions. See §6.2 Monetization.

If the gates do not pass → **ship the next ZenUML feature instead** (`CONTEXT.md`).
