# ADR 0001 — Hosting substrate for mini-site bundles: Workers-for-Platforms vs R2 binding

- **Status:** Proposed. **Recommendation is conditional** (see Decision): **finish WfP** if a durable, scoped `WFP_API_TOKEN` is available; **R2** if not (or if R2's token-independent properties are required). Supersedes the earlier "each macro = a paired Worker" directive *iff* R2 is accepted.
- **Date:** 2026-06-17
- **Deciders:** project owner (final call) + implementer
- **Context docs:** [CONTEXT.md](../../CONTEXT.md), [DESIGN.md](../../DESIGN.md)

## Context

Conf Mini-Sites hosts a **multi-file *static* bundle** (`index.html` + relative JS/CSS/assets) per macro
instance and serves it, grant-gated, into a sandboxed iframe on a Confluence page. Two substrates implement the
same `HostingProvider` seam ([src/hosting/HostingProvider.ts](../../src/hosting/HostingProvider.ts)):

- **WfP** (currently deployed) — `CloudflareWfPProvider` provisions one **per-instance user Worker**
  (`ms-<instanceId>`) into a dispatch namespace via the WfP **script-upload REST API**; the dispatch Worker
  reaches it through the dispatch-namespace **binding** `env.MINISITES.get(name).fetch()`.
- **R2** (built + contract-tested, not wired/deployed) — `R2HostingProvider` + `R2BundleObjectStore` store the
  bundle's bytes in an **R2 bucket binding** (`env.BUNDLES.put/get`) and the dispatch Worker serves from it.

The trigger for this ADR: the WfP path requires a Cloudflare **API token** (`WFP_API_TOKEN`) on the control
Worker to provision per-instance Workers. The token *in use today* is the rotating wrangler OAuth token, which
**expires within hours → every publish then fails**. This is **fixable, not fundamental** (revised): a
dedicated, durable API token scoped to *Workers Scripts: Edit* on the dispatch namespace removes the expiry
failure mode entirely — at the cost of a **standing high-privilege credential** to scope/rotate/protect (see
Decision, Branch A). The original framing of this as a flat "production-breaking blocker" overstated it: it
blocks WfP only *until a durable token is minted*. The question that prompted the ADR — *can Workers trust each
other via bindings instead of a token?* — still has a hard answer (no, below); but token-free is **one** escape
from the expiry problem, not the **only** one.

## The decisive technical constraint

**Bindings are data-plane (invoke) only; creating a Worker is control-plane (token) only.** Verified against
`@cloudflare/workers-types` v4.20260616.1 — the WfP binding exposes exactly one method:

```ts
interface DispatchNamespace { get(name, args?, options?): Fetcher; } // invoke an EXISTING script; throws if absent
```

There is **no `put`/`upload`/`create`** on the dispatch-namespace binding (nor any other binding). Provisioning
a script is exclusively the REST API (token) or wrangler (OAuth — cannot run inside a Worker). Therefore:

> **"per-macro Worker (WfP)" and "token-free" are mutually exclusive.** Creating the Worker is the one thing no
> binding can do. Token-free ⟹ no provisioning ⟹ serve bytes from a data-plane binding (R2/KV).

What is *not* affected by the substrate choice, and stays either way: the **signed-path grant** (`K_GRANT`,
guards the browser→dispatch hop — the browser is not a Worker, so no binding can replace it), the injected
`<base>`, the sandbox **CSP**, the iframe, and the resolver→control auth. These are self-minted secrets, not
external API tokens.

## Decision drivers

1. Remove the *rotating-token expiry* failure mode — either by minting a durable scoped token, or by going token-free.
2. Operational simplicity (fewer moving parts, no per-account caps, deterministic deletes).
3. Honest assessment of WfP's claimed benefits **for static bundles** (not in the abstract).
4. Keep the door open for per-bundle **server-side compute** if it ever becomes a requirement.

## WfP's claimed benefits, evaluated for *static* bundles

| Claim | Verdict for our use case |
|---|---|
| **Free version control + rollback** | **Real, weak differentiator — but only vs. a *correctly-built* R2 path.** WfP creates an implicit version + deployment per upload and supports rollback (wrangler/dashboard/API). It's ops-level — an end-user "restore previous version" UX is build-it-ourselves either way, and triggering rollback still uses the WfP API (**token**). R2 *can* match it token-free, but **the currently-built `R2HostingProvider` does NOT**: it overwrites in place (`deletePrefix` then sequential `put`, [R2HostingProvider.ts:57-61](../../src/hosting/R2HostingProvider.ts)), so there is no pointer to roll back to and a republish is non-atomic. Pointer-based versioning is a **to-build requirement** (see "Required R2 design"). **Sharpened by the rollback-feature analysis:** with a *durable token*, WfP's native ~100-version retention gives a future end-user rollback feature **byte-retention for free** (R2 must build keep-last-N + GC), while the *user-facing labeled list* (author/label/timestamp) needs a **D1 version index on either substrate** (native version IDs aren't user-meaningful and aren't listable from the invoke-only binding), so that part is a wash. Net: WfP rollback is a cheap native "activate prior version" call but **always token-gated**; R2 rollback is a token-free D1 pointer flip but **must build retention/GC**. |
| **Better isolation** | **Real but bounded availability benefit — not purely theoretical (revised after review).** The browser sandbox + CSP + grant are the *security* boundary and are identical under R2. But WfP runs each tenant's byte-serving in its **own isolate**, whereas R2 funnels *all* tenants through the **one** dispatch Worker — which today even buffers each whole object into memory (`new Response(obj.bytes)`, [R2HostingProvider.ts:53](../../src/hosting/R2HostingProvider.ts) / `arrayBuffer()` in R2BundleObjectStore). So a tenant with large assets or abusive traffic stresses the *shared* serving path more directly under R2. WfP's per-tenant resource isolation + limits are a genuine availability edge. R2 mitigations are required (stream bodies, publish-time caps, rate limits — below). |
| **Better performance** | **A wash *if the cache contract is content-addressed* (revised).** WfP: per-tenant isolate (~ms cold start) + in-isolate base64 decode per request. R2: one always-warm dispatch Worker (no per-tenant cold-start fan-out) + an R2 GET. The Cache API helps repeat-serve latency **but must be keyed by content hash, not the mutable live path** — otherwise it reintroduces exactly the stale-serving the ADR criticizes WfP for (R2 object delete does NOT purge Worker Cache API entries). No per-account script-count (~1000) or size caps, no $25/mo base. |

Additional WfP costs for us: the API token, provisioning complexity, and a measured **>2-min edge-delete lag**
(a deleted instance kept serving from the dispatch edge cache; see CONTEXT "Live findings") — so deletion is
*not* a prompt revocation mechanism under WfP (the grant TTL is). R2 deletes are immediate.

## The criteria that actually decide it

Two questions, in order:

**1. Is a durable, scoped `WFP_API_TOKEN` available?** WfP is already built, **deployed, and verified live**; R2
is *not wired into any Worker* and has never run against a real bucket. So if a durable token can be minted, the
lowest-effort path to a shipping product is to **finish WfP** — the token was the only thing between the
as-built system and production. Token-free R2 is a from-the-seam-up build by comparison.

**2. Will a mini-site ever need server-side execution (per-bundle compute), or is it always static files?**

- **Always static** (current design, DESIGN.md §0) **and no durable token** → **R2**. WfP's three benefits are
  matchable, bounded, or a wash; the rotating token + provisioning + delete-lag aren't bought back by real value.
- **Durable token available, always static** → **finish WfP** *unless* its token-independent costs
  (immediate-delete need, ~1000-script cap, portability, standing-secret risk) outweigh R2's migration cost.
- **Future per-bundle server logic** → **WfP** regardless. Its isolation + per-tenant limits + first-class
  versioning justify the standing token (R2 serves bytes, not code).

## Decision

**Conditional, on token availability.**

**Branch A — a durable, scoped `WFP_API_TOKEN` is available → finish WfP (the deployed, built path).** WfP is
already provisioning, serving, and deleting per-instance Workers in production; R2 is unwired. A durable token
scoped to *Workers Scripts: Edit* on the dispatch namespace removes the expiry failure mode that was the only
real blocker, so the lowest-risk path to ship is to **complete WfP rather than build R2 from the seam up**.
Accept the residual costs: a **standing high-privilege credential** (scope it narrowly, rotate it, never log
it); the measured **>2-min edge-delete lag** (mitigate via the grant TTL — the real revocation mechanism under
WfP, *not* deletion); and the **~1000-script per-account cap + ~$25/mo base** (revisit if instance count
approaches the cap). Keep `R2HostingProvider` behind the seam as the fallback.

**Branch B — no durable token, or R2's token-independent properties are required → adopt R2, conditional on
building the Required R2 design below.** Choose R2 even when a token *could* be minted if any of: a hard
requirement for **immediate delete/revocation** (DSAR, secret-leak takedown — R2 deletes are immediate, WfP's
edge lag is >2 min); expected instance counts near the **~1000-script cap**; **avoiding a standing high-privilege
secret** entirely; or **substrate portability** (R2 cutover is above the `HostingProvider` seam; WfP couples to
Cloudflare). This is *not* a drop-in swap to the current `R2HostingProvider`: that provider overwrites in place
(non-atomic) and buffers whole objects, which (per the adversarial review) would reintroduce stale/mixed serving
and shared-Worker memory pressure. The simplicity case for R2 holds **only with** the content-addressed, atomic,
cache-correct design below.

**Either branch:** if mini-sites ever need per-bundle **server-side compute**, WfP is the only option (R2 serves
bytes, not code) — keep `CloudflareWfPProvider` behind the seam regardless.

### Required R2 design (acceptance criteria — must ship with the swap)

1. **Content-addressed, immutable versions.** Write each file under `b/<contentHash>/<path>` (hash of the
   validated bundle). Versions are immutable; a republish writes a *new* hash, never mutating the live one.
2. **Atomic cutover via the grant, not in-place overwrite.** `serve-url` resolves the instance's *current*
   version + **incarnation** and **binds both `contentHash` and the instance `incarnation` into the signed
   grant** (alongside `instanceId`). The dispatch Worker serves strictly from the grant's hash. Result:
   republish is atomic (new grants → new version; in-flight old grants serve the old, immutable version for ≤
   the grant TTL); rollback = point the instance at a prior hash (a pointer flip), no data copy. No reader ever
   sees a mixed/half-written bundle. Replace the misleading "atomic from a viewer's POV" comment on the in-place
   provider.
3. **Cache correctness + liveness/incarnation gate.** Verify the grant **before** any Cache API lookup, **then a
   per-request instance check before cache/R2: `row.live && grant.incarnation === row.incarnation`** — a
   content-bound grant is self-contained, so it cannot self-revoke on delete; a boolean tombstone alone is *not
   enough* because `instanceId` is stable (hash of `cloudId:localId`) and rows upsert in place, so a
   `delete → recreate same id` would flip "live" back on and re-validate old grants. The incarnation match
   closes that resurrection hole. Key cached bytes by `<cloudId>/<contentHash>/<path>` (content-addressed,
   never a mutable live path), so a republish resolves a new hash (old cache entry simply unreferenced — no
   stale serve).
4. **Stream, don't buffer.** Serve via the R2 object's `body` (`ReadableStream`) and pass `Range`/`ETag`
   through — never `arrayBuffer()` the whole file into the shared Worker. Requires widening `BundleObjectStore`
   to return a stream.
5. **Per-tenant blast-radius mitigations** (the WfP-isolation gap): keep the publish-time size/file caps
   (`validateBundle`: ≤25 MB/file, ≤2000 files), rely on Cloudflare platform DoS protection on the dispatch
   Worker, and add per-instance rate limiting + per-instance serve observability.
6. **Lifecycle invariants — republish ≠ delete (resolves the grant/GC race).**
   - **Republish / rollback:** the instance stays live; only its current-version pointer changes. **Retain
     prior version objects through a grace window of `max(grant TTL + cache TTL)`** so in-flight old grants keep
     serving the old *immutable* version until they expire (no 404 mid-publish).
   - **Delete:** write a **tombstone** AND **monotonically bump the instance `incarnation`** (step 3's gate
     rejects every existing grant → 404 immediately, no replay), *then* the version objects become GC-eligible.
     A later recreate of the same `instanceId` gets the new incarnation, so pre-delete grants never re-validate
     (closes the same-id resurrection hole).
   - **GC:** sweep a `b/<hash>/…` version only once it has **no live references AND the grace window has
     elapsed** — never delete a hash a still-valid grant could reference (except a tombstoned instance, which is
     already 404 via the liveness gate).

### Tests gating adoption

- Atomic republish: a concurrent reader during `updateBundle` sees the old *or* new bundle, never a 404 or a mix.
- **Old grant after republish** still serves the old version until its TTL (grace window honored).
- **Old grant after delete** returns 404 immediately (tombstone/liveness gate — no replay of deleted content).
- **Delete → recreate same `instanceId`**: pre-delete grants 404 (incarnation mismatch) while new grants serve
  (no resurrection replay).
- **GC** does not delete a version while a still-valid grant could reference it (grace window honored).
- Failed write mid-publish leaves the previously-live version fully intact (no partial destruction).
- Cache: populate → delete ⇒ unreachable; populate → republish ⇒ new bytes (old entry unreferenced).
- Large file streams without buffering the whole object in the Worker.

## Consequences

**Branch A (finish WfP) — positive:** ships the already-built, already-deployed path with **no migration**;
first-class native versioning + ~100-version retention (a future rollback feature gets byte-retention for free);
keeps the door open to per-bundle server-side compute. **Negative:** a **standing high-privilege `WFP_API_TOKEN`**
to scope/rotate/protect; the measured **>2-min edge-delete lag** (deletion is not prompt revocation — the grant
TTL is); **~$25/mo base + ~1000-script per-account cap**; more provisioning moving parts than serving bytes.

**Branch B (R2) — positive:** **no standing control-plane token**; immediate deletes; no per-account script cap
or $25/mo base; one always-warm serving Worker; **substrate portability** (cutover above the seam); grant/CSP/
iframe unchanged. **Negative:** reverses the earlier "each macro = a paired Worker" decision and doesn't use the
WfP entitlement; forgoes WfP's **per-tenant serving-resource isolation** (mitigated by streaming + publish caps
+ rate limits + platform DoS protection, Required R2 design §4–5); **the current `R2HostingProvider` is not
adoption-ready** — it overwrites in place and buffers whole objects, and must be reworked to the Required R2
design (atomic, content-addressed, streamed, cache-correct, retention/GC) *before* the swap. So "R2 is already
built behind the seam" means the *seam + contract* are built, **not** a production-grade provider — R2 is
currently **unwired and has never run against a real bucket**.

**Revisit if:** a durable token becomes available/unavailable; mini-sites gain server-side execution; the
delete-lag or ~1000-script cap starts to bite; or a security review weighs the standing-token risk against the
immediate-delete benefit.

## References

- WfP binding surface: `@cloudflare/workers-types` `interface DispatchNamespace` (verified in repo).
- [Versions & Deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/) ·
  [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) ·
  [How Workers for Platforms works](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/how-workers-for-platforms-works/)
- Already built: `src/hosting/R2HostingProvider.ts`, `src/hosting/R2BundleObjectStore.ts` (contract-tested via `providerContract.ts`).
- CONTEXT.md "Live findings" (WfP edge-delete lag; non-routability; provisioning verified).
