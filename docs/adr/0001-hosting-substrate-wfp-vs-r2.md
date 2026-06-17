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
| **Free version control + rollback** | **Real, weak differentiator.** WfP creates an implicit version + deployment per upload and supports rollback (wrangler/dashboard/API). But it's ops-level — an end-user "restore previous version" UX is build-it-ourselves either way, and triggering rollback still uses the WfP API (**token**). R2 matches it token-free: hash/version-keyed objects + a live-version pointer (rollback = flip the pointer), or R2 object versioning. |
| **Better isolation** | **Mostly theoretical here.** The per-instance Worker never *executes* the bundle — it's a generated base64 byte-server. The bundle's JS runs in the **viewer's browser**, sandboxed by the iframe + CSP + grant — the real security boundary, **identical under R2**. WfP isolation (own isolate, per-tenant CPU/mem limits, egress controls) only pays off if tenants run **server-side** code. |
| **Better performance** | **A wash; R2 + Cache API ≥.** WfP: per-tenant isolate (~ms cold start) + in-isolate base64 decode per request. R2: one always-warm dispatch Worker (no per-tenant cold-start fan-out) + an R2 GET, with the **Cache API** in front for near-zero repeat-serve latency. No per-account script-count (~1000) or size caps, no $25/mo base. |

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

For the static-bundle product as specified: **adopt R2 as the hosting substrate.** Swap the control Worker to
`R2HostingProvider` (write via `env.BUNDLES`) and the dispatch Worker to serve from `env.BUNDLES` (+ Cache API),
add the `BUNDLES` R2 bucket + bindings, redeploy, and re-verify the e2e suite. Retain `CloudflareWfPProvider`
behind the seam as the alternative substrate should server-side compute ever be required.

## Consequences

**Positive:** eliminates `WFP_API_TOKEN` entirely (resolves the production-breaking blocker — no durable token,
no dashboard step); drops the WfP dependency + ~$25/mo base + the ~1000-script cap; immediate deletes; one
always-warm serving Worker; grant/CSP/iframe unchanged.

**Negative / trade-offs:** reverses the earlier "each macro must have a paired Worker" decision and does not use
the purchased WfP entitlement; forgoes WfP's per-tenant isolate + first-class versioning (mitigated: not needed
for static bytes; versioning achievable token-free in R2); the dispatch Worker becomes a shared serving path (a
bug there affects all instances — mitigated: it is small, our own, and tested, vs trivial per-tenant byte-servers).

**Revisit if:** mini-sites gain server-side execution, per-tenant resource isolation/limits become a
requirement, or a security review specifically requires per-tenant compute isolation.

## References

- WfP binding surface: `@cloudflare/workers-types` `interface DispatchNamespace` (verified in repo).
- [Versions & Deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/) ·
  [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) ·
  [How Workers for Platforms works](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/how-workers-for-platforms-works/)
- Already built: `src/hosting/R2HostingProvider.ts`, `src/hosting/R2BundleObjectStore.ts` (contract-tested via `providerContract.ts`).
- CONTEXT.md "Live findings" (WfP edge-delete lag; non-routability; provisioning verified).
