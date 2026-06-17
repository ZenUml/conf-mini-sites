# ADR 0001 — Hosting substrate for mini-site bundles: Workers-for-Platforms vs R2 binding

- **Status:** Proposed (recommendation: **R2**). Supersedes the earlier "each macro = a paired Worker" directive *iff* accepted.
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
Worker to provision per-instance Workers. The only token we can supply today is the rotating wrangler OAuth
token, which **expires within hours → every publish then fails** (a production-breaking blocker). The question
raised: *can Workers trust each other via bindings instead of a token?*

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

1. Remove the production-breaking dependency on a rotating/externally-created API token.
2. Operational simplicity (fewer moving parts, no per-account caps, deterministic deletes).
3. Honest assessment of WfP's claimed benefits **for static bundles** (not in the abstract).
4. Keep the door open for per-bundle **server-side compute** if it ever becomes a requirement.

## WfP's claimed benefits, evaluated for *static* bundles

| Claim | Verdict for our use case |
|---|---|
| **Free version control + rollback** | **Real, weak differentiator — but only vs. a *correctly-built* R2 path.** WfP creates an implicit version + deployment per upload and supports rollback (wrangler/dashboard/API). It's ops-level — an end-user "restore previous version" UX is build-it-ourselves either way, and triggering rollback still uses the WfP API (**token**). R2 *can* match it token-free, but **the currently-built `R2HostingProvider` does NOT**: it overwrites in place (`deletePrefix` then sequential `put`, [R2HostingProvider.ts:57-61](../../src/hosting/R2HostingProvider.ts)), so there is no pointer to roll back to and a republish is non-atomic. Pointer-based versioning is a **to-build requirement** (see "Required R2 design"). |
| **Better isolation** | **Real but bounded availability benefit — not purely theoretical (revised after review).** The browser sandbox + CSP + grant are the *security* boundary and are identical under R2. But WfP runs each tenant's byte-serving in its **own isolate**, whereas R2 funnels *all* tenants through the **one** dispatch Worker — which today even buffers each whole object into memory (`new Response(obj.bytes)`, [R2HostingProvider.ts:53](../../src/hosting/R2HostingProvider.ts) / `arrayBuffer()` in R2BundleObjectStore). So a tenant with large assets or abusive traffic stresses the *shared* serving path more directly under R2. WfP's per-tenant resource isolation + limits are a genuine availability edge. R2 mitigations are required (stream bodies, publish-time caps, rate limits — below). |
| **Better performance** | **A wash *if the cache contract is content-addressed* (revised).** WfP: per-tenant isolate (~ms cold start) + in-isolate base64 decode per request. R2: one always-warm dispatch Worker (no per-tenant cold-start fan-out) + an R2 GET. The Cache API helps repeat-serve latency **but must be keyed by content hash, not the mutable live path** — otherwise it reintroduces exactly the stale-serving the ADR criticizes WfP for (R2 object delete does NOT purge Worker Cache API entries). No per-account script-count (~1000) or size caps, no $25/mo base. |

Additional WfP costs for us: the API token, provisioning complexity, and a measured **>2-min edge-delete lag**
(a deleted instance kept serving from the dispatch edge cache; see CONTEXT "Live findings") — so deletion is
*not* a prompt revocation mechanism under WfP (the grant TTL is). R2 deletes are immediate.

## The criterion that actually decides it

**Will a mini-site ever need server-side execution (per-bundle compute), or is it always static files?**

- **Always static** (current design, DESIGN.md §0) → **R2**. WfP's three benefits are matchable token-free,
  theoretical, or a wash; the token + provisioning + delete-lag are not bought back by real value.
- **Future per-bundle server logic** → **WfP**. Its isolation + per-tenant limits + first-class versioning
  then justify the token.

## Decision

For the static-bundle product as specified: **adopt R2 as the hosting substrate — conditional on building the
R2 design below.** This is *not* a drop-in swap to the current `R2HostingProvider`: that provider overwrites in
place (non-atomic) and buffers whole objects, which (per the adversarial review) would reintroduce stale/mixed
serving and shared-Worker memory pressure. The token-elimination + simplicity case for R2 holds **only with**
the content-addressed, atomic, cache-correct design below. Retain `CloudflareWfPProvider` behind the seam as the
alternative substrate should server-side compute ever be required.

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

**Positive:** eliminates `WFP_API_TOKEN` entirely (resolves the production-breaking blocker — no durable token,
no dashboard step); drops the WfP dependency + ~$25/mo base + the ~1000-script cap; immediate deletes; one
always-warm serving Worker; grant/CSP/iframe unchanged.

**Negative / trade-offs:** reverses the earlier "each macro must have a paired Worker" decision and does not use
the purchased WfP entitlement; forgoes WfP's **per-tenant serving-resource isolation** — a real availability
edge (all tenants share one dispatch Worker), mitigated by streaming + publish caps + rate limits + platform
DoS protection (Required R2 design §4–5); forgoes WfP's first-class versioning (mitigated: content-addressed
versions + grant-bound hash give atomic publish + pointer rollback token-free, §1–2). **The current
`R2HostingProvider` is not adoption-ready** — it overwrites in place and buffers whole objects; it must be
reworked to the Required R2 design (atomic, content-addressed, streamed, cache-correct) *before* the swap. So
"R2 is already built behind the seam" means the *seam + contract* are built, **not** a production-grade provider.

**Revisit if:** mini-sites gain server-side execution, per-tenant resource isolation/limits become a
requirement, or a security review specifically requires per-tenant compute isolation.

## References

- WfP binding surface: `@cloudflare/workers-types` `interface DispatchNamespace` (verified in repo).
- [Versions & Deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/) ·
  [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) ·
  [How Workers for Platforms works](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/how-workers-for-platforms-works/)
- Already built: `src/hosting/R2HostingProvider.ts`, `src/hosting/R2BundleObjectStore.ts` (contract-tested via `providerContract.ts`).
- CONTEXT.md "Live findings" (WfP edge-delete lag; non-routability; provisioning verified).
