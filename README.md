# Conf Mini-Sites

Host a multi-file static bundle — an AI-generated interactive mini-site (clickable prototype, filterable
dashboard, troubleshooting tool) — embedded live on a Confluence page.

**Stack:** Atlassian Connect (JWT) + **Cloudflare Workers for Platforms** (one dispatch namespace; one
non-routable user Worker per macro instance via Static Assets; the dispatch Worker is the auth gateway).

**Status: GO — building for the Atlassian Marketplace** (decided 2026-06-16; see [`CONTEXT.md`](CONTEXT.md)).
Shipping on Cloudflare, targeting the residency-agnostic segment, with paid installs as the demand signal.

## Design of record

| Doc | What |
|-----|------|
| [`CONTEXT.md`](CONTEXT.md) | Product, decision, positioning |
| [`DESIGN.md`](DESIGN.md) | Architecture, the auth-gateway threat model, the 10 invariants, async provisioning (§3.4) |
| [`BACKEND_DESIGN.md`](BACKEND_DESIGN.md) | Concrete blueprint — data model, API surface, topology, flows |
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Staged plan |
| [`handbook/`](handbook/index.html) | The design rendered as a browsable site (open `handbook/index.html`) |

## Build order (lean, to a live listing)

1. **Hosting seam** ✅ *(this scaffold)* — `HostingProvider` + fake + Cloudflare skeleton + contract test.
2. **Hosting** — `CloudflareWfPProvider` (WfP script-upload/dispatch) + `MiniSiteInstance` schema.
3. **Auth gateway** *(build carefully — CVSS-9.1 class; DESIGN §2)* — token verify, per-request `permission/check`, signed-path grants.
4. **Upload pipeline + async provisioning job** (CLI/MCP + drag-drop widget).
5. **Lifecycle reconcile + listing hygiene** → submit to Marketplace.

## Develop

```sh
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run — runs the HostingProvider contract against the fake
```
