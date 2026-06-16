# Conf Mini-Sites

A Confluence-embedded app that lets a user **upload a multi-file static bundle** (an AI-generated interactive mini-site: clickable prototype, filterable dashboard, troubleshooting tool) and host it as a live, embedded object on a Confluence page.

**Status: GO — Forge shell + Cloudflare Workers-for-Platforms backend (settled 2026-06-17).** This is the
final architecture, reached through the user's sequential directives: use **Forge** (not Connect); **keep
Cloudflare Workers** ("Forge + Workers, that's fundamental"); **each macro instance is paired with its own
Worker**; **Workers for Platforms is now purchased** (the earlier 10121 not-entitled blocker is gone — a
`dispatch-namespace list` now succeeds, namespace `mini-sites-dev` is live).

**Split of responsibilities:**
- **Forge** owns the app shell: the macro module, install/distribution via the Marketplace, and **user auth —
  Forge inherits Confluence permissions**, so there is NO self-built Confluence ACL (the CVE-2021-26073 /
  CVSS-9.1 permission-gateway class evaporates). The Forge **resolver** runs server-side as the authorized
  viewer; it mints a short-lived **HMAC signed-path grant** and hands the Custom UI a serve URL. Publish goes
  resolver → control Worker over a Forge **remote** carrying the Forge invocation token (RS256/JWKS).
- **Cloudflare WfP** owns hosting + serving: a **control Worker** (verifies the Forge token, validates +
  secret-scans the bundle, provisions the per-instance Worker via the WfP script API) and a **dispatch Worker**
  (verifies the grant, routes to the per-instance Worker via the dispatch-namespace binding, injects `<base>` +
  CSP). Each macro instance = one **per-instance user Worker** in the dispatch namespace, **non-routable** (no
  public URL — verified live), serving its bundle.

**What this keeps vs. drops from the earlier Connect build:** KEEPS (above the seam, all tested) — bundle
validation, secret scan, bundle types, the **HMAC signed-path grant** (now minted by the Forge resolver, not a
Connect JWT flow), the HostingProvider seam + CloudflareWfPProvider, InstanceStore. DROPS under Forge —
`connectJwt.ts` (Connect JWT/qsh verify) and `permissionCache.ts` (Confluence permission/check): Forge inherits
permissions, so these are retained-but-shelved in the tree, not on the live path. R2HostingProvider stays as
the seam's large-bundle / residency substrate. Gates: G1 (residency) is largely moot for the Atlassian-shell
half; bundle bytes do live on Cloudflare, so the external-processor disclosure still applies for that segment.

## Glossary

- **Mini-site / Static bundle** — a self-contained multi-file static web artifact (`index.html` + separate JS/CSS/asset files with **relative paths**). The thing we host. _Distinct from_ a **single-file artifact** (one self-contained `.html`), which existing HTML macros already handle — out of scope.
- **Macro instance** — one embedded mini-site on one Confluence page.
- **Auth gateway** — the request path that authenticates the viewer and enforces the Confluence page's permissions before serving a bundle.

## Architecture (settled — Forge shell + Cloudflare WfP backend)

```
Confluence page
  └─ Forge macro (Custom UI iframe)
       │  invoke('getServeUrl')                 invoke('publish', files)
       ▼                                            │
     Forge resolver  ── mints HMAC grant ──┐        │  Forge remote (invocation token, RS256)
       │ returns  /v/<instanceId>/g/<grant>/│        ▼
       ▼                                    │   Cloudflare CONTROL Worker
   browser loads iframe src ───────────────▼    (verify Forge token → validate+scan
                                     Cloudflare DISPATCH Worker          → WfP script API)
                                     (verify grant → env.MINISITES        │ provisions
                                      .get('ms-<id>').fetch())            ▼
                                            └────────────────────► per-instance user Worker
                                                                   (in dispatch namespace,
                                                                    non-routable, serves bundle)
```

- **Hosting:** Cloudflare **Workers for Platforms** (purchased) — dispatch namespace `mini-sites-dev`; each
  macro instance = one **per-instance user Worker** `ms-<instanceId>`, **non-routable** (only reachable through
  the dispatch Worker — verified live). Small bundles are served from the per-instance Worker directly;
  R2HostingProvider remains the seam's large-bundle substrate.
- **Auth (two distinct checks, neither is a Confluence ACL):** (1) **publish** — the control Worker verifies the
  **Forge invocation token** (RS256/JWKS, app-id allowlist) so only our Forge app can provision. (2) **serve** —
  the dispatch Worker verifies the **HMAC signed-path grant** minted by the Forge resolver. The resolver only
  runs for a user Forge has already authorized to view the page, so **Confluence permissions are inherited** —
  there is no `permission/check` call and no self-built ACL.
- **Trade-off (accepted):** bundle bytes live on Cloudflare → for that data path it is **not "Runs on
  Atlassian" / not no-egress**; the external-processor disclosure + secret-scan + CSP sandboxing still apply.
  What's gone vs. the Connect design is the *permission* gateway, not the *hosting* disclosure.

## Design constraints (acceptance criteria — each needs a testable invariant + threat model BEFORE code)

- Orphan cleanup when a macro/page is deleted (Connect has no reliable per-macro delete webhook).
- Page copy / duplicate / template / space-export semantics (cloned macro bodies).
- Permission-cache staleness on ACL change / Confluence outage (no serving revoked content).
- Token expiry mid-view.
- GDPR/DSAR erasure of user-uploaded bundles on the external host.
- Malicious uploaded JS served from a trusted origin → sandboxing / CSP (XSS, phishing, malware).
- Secret-leak detection in uploaded bundles; tenant isolation; audit logs; partial-failure recovery.

These erode the "~$25/mo, solo-buildable" premise — re-cost honestly.

## Blocking gates (no code until ALL pass)

1. **Written** admin+security confirmation from the anchor team: GitLab Pages config (access-controlled / requires a GitLab account), whether the non-technical consumers actually lack GitLab accounts, and **residency-vs-access** — if they require *no external processor*, Cloudflare is disqualified.
2. **Demand-to-pay:** ≥3 prospects **beyond the anchor team**, each with a real existing mini-site, a failed alternative, recurring publish frequency, a named approver **who approved the actual external-processor architecture** (residency + DPA + auth-gateway threat model), and a concrete commitment (paid pilot / LOI / install approval). Demand from a prospect whose security would veto the external host does not count.
3. Pre-implementation lifecycle/security acceptance criteria signed off (ADR + threat model + the invariants above).
4. EV comparison vs shipping the next ZenUML feature + a kill criterion stronger than "cheap to build."

If the gates don't pass → ship the next ZenUML feature instead.

## Positioning (one line)

The only Confluence-native way to upload + host a multi-file bundle — a **first-mover execution wedge with no durable moat** (Forge Custom UI and 4.5k–8.7k-install incumbents could copy it; governance is table stakes). Demand is **n=1 (the anchor team), unvalidated beyond** — hence the gates.
