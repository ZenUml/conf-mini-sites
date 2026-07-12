# ADR 0002 — Stateful primitives (polls, forms, counters): Forge storage, not Cloudflare-side state

- **Status:** Accepted (direction). **Not yet implemented — v2 scope.** One action item lands *before* the
  public listing regardless of implementation timing (see Decision §3).
- **Date:** 2026-07-12
- **Deciders:** project owner (final call) + implementer
- **Context docs:** [CONTEXT.md](../../CONTEXT.md), [DESIGN.md](../../DESIGN.md), [ADR 0001](0001-hosting-substrate-wfp-vs-r2.md)

## Context

Scenario analysis (2026-07-12) identified stateful micro-tools — polls, RSVPs, small forms, counters, retro
boards — as a high-value extension: it lifts the "AI-generated micro-tool" scenario from toys to tools, and it
drops the app into a proven Marketplace category (polls/forms apps have paying incumbents). The product today is
static-only by choice, not architecture:

- The dispatch CSP already carries `connect-src 'self'` ([gateway.ts](../../src/dispatch/gateway.ts)), so served
  bundles can `fetch()` their own serve origin with **zero CSP change**.
- Per-instance sites are real Workers in a dispatch namespace — Cloudflare-side state is one binding away.

Two substrates were considered for the state itself:

**A. Cloudflare-side** — a `/_api` route on the dispatch Worker backed by a Durable Object (or D1/KV) per
`instanceId`. Architecturally cheapest (same origin, maps 1:1 onto `ms-<instanceId>` isolation), but: identity
must be *self-asserted* (extend the signed grant with `accountId` minted by the control Worker); user-generated
data (votes → PII) lands on Cloudflare, changing the privacy policy, data-residency posture, and the uninstall
GC obligations; and per-instance quotas + rate limits must be built to stop free-database abuse.

**B. Forge storage (KVS)** — the mini-site iframe is nested inside the Custom UI on the dispatch origin, so it
cannot use `@forge/bridge` directly; the path is bundle JS → `postMessage` to parent → Custom UI → `invoke()` →
resolver → `@forge/kvs`. Identity (`accountId`) and page-view permission checks come from the Forge runtime
itself; data stays inside the Atlassian boundary.

## Decision drivers

1. **Trustworthy identity for free** — "one vote per person" should be a dictionary key, not an auth design.
2. **Data posture** — keep the enterprise pitch clean: *published artifact bytes on Cloudflare; user data never
   leaves Atlassian.* Votes/form entries are the PII-shaped part.
3. **Lifecycle** — user data must die with the install without extending our tombstone/GC pipeline.
4. **Abuse containment** — state capacity should be bounded by someone else's quota system, not new code.
5. Contained risk surface — no user-authored server code.

## Decision

**Forge storage (KVS), reached via a postMessage relay, exposing primitives — not compute.**

1. **Verb set, generic and small:** `get / set / increment / vote / submit`. Resolver-side, namespaced per
   instance. No user-authored server code — a poll needs a vote endpoint with identity dedup, not compute. If
   real server-side code is ever justified, that is a *separate future decision* (and per ADR 0001, a point for
   WfP — the substrates compose: bytes/compute on Cloudflare, user data in Forge).
2. **Relay SDK injected at serve time** by the dispatch Worker, so bundle authors (and AI generators) call
   `MiniSites.state.vote('option-a')` and never see the relay. The SDK is part of the prompt-able API surface.
3. **Add the `storage:app` scope to the manifest BEFORE the listing goes public.** `manifest.yml` currently has
   `scopes: []`; KVS requires `storage:app` (high confidence — verify against current Forge docs at
   implementation time), and a scope addition forces existing installs through an admin-consent upgrade. Today
   that is a few dev tenants (free); after launch it is every customer (a consent campaign). Ship the scope
   early even though the feature ships later.
4. **State keys are namespaced by `instanceId`** (same derivation as hosting: `i + sha256(cloudId:localId)[:31]`).
5. **Republish preserves state** — fixing a typo in the HTML must not lose the poll's votes. The publisher gets
   an explicit **"reset data"** action for when a clean slate is wanted. (Decided now because it is breaking to
   change later.)
6. **Start with KVS, not Forge SQL.** SQL adds per-installation provisioning; escalate only if forms/lists
   outgrow KVS limits.

**Rejected: Cloudflare-side state (option A)** — not on engineering cost (it is cheap) but on identity trust,
data posture, lifecycle, and abuse surface (drivers 1–4 all favor Forge). Keep it as the documented fallback for
state that is anonymous, high-frequency, or too large for KVS quotas, if that ever materializes.

## Consequences

**Positive:** identity and permission checks native and authoritative; privacy policy barely moves; app storage
is deleted by Atlassian on uninstall (no GC extension); Atlassian per-installation quotas bound abuse; unlocks
the poll/forms/retro Marketplace category and upgrades the AI-micro-tool scenario.

**Negative / accepted costs:** resolver round-trips are hundreds of ms — fine for votes and submits, rules out
real-time (polls refresh on an interval; say so in docs). The Forge app stops being a pure thin shell and grows
a verb set — keep the verbs few and generic so product iteration stays in the Workers/SDK layer and Forge
deploys stay rare. Storage works only when embedded in Confluence (no standalone serving — already true of
serving generally, since grants are Confluence-gated).

**Revisit if:** KVS quotas/limits bite (→ Forge SQL); a real-time requirement appears (→ option A fallback for
that feature); or a demand for user-authored server-side code is validated (→ new ADR; WfP per ADR 0001).

## References

- CSP with `connect-src 'self'`: `src/dispatch/gateway.ts` / `src/dispatch/forgeGateway.ts` (verified in repo).
- Current empty scopes: `forge-app/manifest.yml` `permissions.scopes: []` (verified in repo).
- Forge KVS (`@forge/kvs`), Forge SQL, and the `storage:app` scope: verify current requirements in Atlassian
  Forge docs at implementation time.
- `instanceId` derivation: `forge-app/src/index.js` · `tests/e2e/helpers/confluence.ts` (must stay in sync).
