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

## Build + deploy state (2026-06-17)

**Built, deployed, and verified live (backend end-to-end):**
- **Control Worker** `conf-mini-sites-remote-dev` — Forge-token verify (jose JWKS) OR shared-secret auth →
  validate + secret-scan → provision per-instance Worker via WfP REST (`/publish`); mint serve grant
  (`/serve-url`); orphan delete (`/instance`). Secrets: `WFP_API_TOKEN`, `K_GRANT`, `CONTROL_SHARED_SECRET`.
- **Dispatch Worker** `conf-mini-sites-dispatch-dev` — verify HMAC grant → route via dispatch-namespace
  binding → `<base>` + CSP; fail-closed (404 on missing instance, 401 on bad grant). Secret: `K_GRANT`.
- **Per-instance Workers** — `ms-<instanceId>` in dispatch namespace `mini-sites-dev`, non-routable.
- **Forge app** `Conf Mini-Sites` (v3.0.0, development env) — macro + resolver (`getServeUrl`, `publish`) +
  Custom UI (upload + iframe preview), in `forge-app/`. `forge lint`: no issues. Forge vars: `CONTROL_BASE_URL`,
  `CONTROL_SHARED_SECRET` (encrypted).
- **Live-verified chain** (public HTTP, the exact calls the resolver makes): `/publish` (2-file bundle) → 200;
  `/serve-url` → grant URL; dispatch serve of entrypoint (200, `<base>` injected) + relative sub-resource
  (200); `/instance` delete → 200. Single-file bundle → 422; bad/expired/wrong-instance grant → 401; no/garbage
  auth → 401. 196 unit tests pass; typecheck clean.

**END-TO-END VERIFIED ON A REAL CONFLUENCE PAGE (lite-dev, 2026-06-17):** installed the Forge app on
lite-dev.atlassian.net, created a page with the Mini-Site macro, and confirmed the **full chain renders**:
Forge macro → Custom UI (`getServeUrl`) → resolver → control Worker (shared-secret) → grant mint → nested
iframe → dispatch Worker (grant verify) → per-instance Worker serving the multi-file bundle. The page shows the
live mini-site with its HTML **and** `style.css` applied (relative path resolved via injected `<base>` + grant
path). The broadened CSP `frame-ancestors` correctly allows the Forge Custom-UI embedding. Two bugs were caught
**only** by this live render and fixed: (a) `@forge/resolver` "not a constructor" — the Forge app package must
be **CommonJS** (no `type:module`) with default imports; (b) the precomputed instanceId matched, confirming
Forge's `extension.localId` equals the ADF node `localId`.

## Releasing to production

A **release promotes all three deployables to their production environments at once** — the Forge app AND both
Cloudflare Workers:

- **Forge app** → production env (`pnpm forge:deploy:prod` = `forge deploy -e production`) + `CONTROL_SHARED_SECRET`
  set as an encrypted Forge prod variable.
- **Control Worker** → `conf-mini-sites-remote-production` (`wrangler deploy --config wrangler-remote.toml --env production`).
- **Dispatch Worker** → `conf-mini-sites-dispatch-production` (`wrangler deploy --config wrangler-dispatch.toml --env production`).

This is automated by `.github/workflows/release.yml`, which fires when a **GitHub Release is published** (`release`
job deploys all three + sets the Forge var; `smoke` job runs a prod happy-path via `e2e.yml` against the prod
Workers). There is **no draft-creating workflow** (unlike conf-app) — you create the release manually:
`gh release create vX.Y.Z` (tags are `vX.Y.Z`, no variant suffix; the tag is the version of record — `package.json`
stays `0.0.0`).

Every deploy step in `release.yml` is **gated on its prod secrets being present**, so a release with missing
secrets goes green while deploying nothing — always confirm the run actually deployed (no `::notice:: … skipping`).
Prerequisites (no-op until set): repo secrets `CLOUDFLARE_API_TOKEN_DEPLOY`, `CLOUDFLARE_ACCOUNT_ID`, `FORGE_EMAIL`,
`FORGE_API_TOKEN`, `CONTROL_SHARED_SECRET`; per-env Worker secrets `K_GRANT` (byte-identical across BOTH Workers,
else serve grants 401), `WFP_API_TOKEN_PROVISIONING`; a `production` Forge environment.

**Use the `release-app` skill** (`.claude/skills/release-app/`) to run the full sequence: pre-flight → delta-derived
release notes → publish the `vX.Y.Z` release → wait for `release.yml` → verify the live build (prod smoke +
`check-version` + a targeted `spot-check` of the delta) → report. Releasing the pipeline is **separate** from making
the Marketplace listing public; a paid app must enforce licensing (EAG-92) before Submit-for-review.

## UI — faithfully implements the design (2026-06-17)

The Custom UI now implements **`design/upload-ui/final.html`** (the fireworks-design "Bold Editorial" winner),
not a bare-DOM placeholder. Built in `forge-app/`:
- **Asset pipeline** (`build-ui.mjs` + `tailwind.config.js` + `ui-src/input.css`): compiles the design's
  Tailwind config to a static CSS and self-hosts Inter / Fraunces (full opsz+wght) / JetBrains Mono variable
  woff2 (`@fontsource-variable`). **No runtime CDN / external egress.**
- **Inline launcher** (`static/view`, resource `view`): compact; published → live preview + Edit, else an "Add
  mini-site" CTA. Opens the Publisher via `@forge/bridge` `Modal({resource:'publisher', size:'max'})`.
- **Publisher modal** (`static/publisher`, resource `publisher`): the full two-state design wired to REAL data —
  drop-zone picker → real file manifest (glyph + path + size) + validation/security checklist → striped progress
  driven by `invoke('publish')` (SECRET_DETECTED → secret-stop state) → "It's live." preview with the **real
  mini-site** in the browser-chrome frame (`getServeUrl`) + real bundle summary + Done/Replace/Copy.
- **Verified live end-to-end via Playwright** (launcher → modal → pick folder → publish → progress → preview of
  the real mini-site with its interactive counter running).
- **Forge CSP gotcha (fixed):** Custom UI `style-src` has no `unsafe-inline`, so PARSED inline styles
  (`style="…"` in HTML or innerHTML) are blocked; CSSOM (`el.style.x=`) is allowed. Inline styles were converted
  to Tailwind classes / CSSOM. Also `[hidden]{display:none!important}` is needed so the attribute beats Tailwind
  display utilities.

**Polish / follow-ups (non-blocking — the pipeline + UI work end-to-end):**
1. **Upload permission** — the Publisher (upload/replace) is reachable from the macro view; consider gating
   upload to editors (macro **config**, or a Forge permission check) so viewers can only view.
2. **CSP tighten** — `EMBED_ANCESTORS` is broadened to Atlassian+Forge domains; tighten to the exact Forge
   Custom-UI origin now that it's observable.
3. **Auth hardening** — resolver→control uses a shared secret; upgrade to the Forge invocation token
   (`forgeToken.ts` is built + tested) by adding `auth.appUserToken` + scopes to the `control` remote.
4. **CF API token** — the control Worker's `WFP_API_TOKEN` is currently the wrangler OAuth token (expires);
   mint a dedicated Cloudflare API token (Workers Scripts:Edit) for durable runtime provisioning.
5. **Launcher debug line** — `view.js` has a tiny `#dbg` status line (aids modal-open debugging); drop it for production.

## Testing + design catalog (2026-06-17)

- **Unit/integration** — `src/**/*.test.ts` (vitest), 200 tests; `npm test`. Typecheck: `npm run typecheck`.
- **E2E** — Playwright at `tests/e2e` (`playwright.config.ts`), 21 tests, ALL passing live:
  - `api/*` (15) — hit the deployed control + dispatch Workers (shared-secret): provision, auth gates,
    validation (BUNDLE_NOT_MULTIFILE / MISSING_INDEX_HTML), secret-detected, serve-url (NOT_PUBLISHED /
    BAD_INSTANCE_ID), grant-gated dispatch (valid/tampered/non-grant), lifecycle revocation.
  - `ui/*` (5) — drive the real Forge macro on Confluence (TOTP login → storageState): launcher empty state,
    full upload→publish→preview, published-state, validation-ui, and **nested-upload** (folder upload preserving
    `data/`+`assets/`, asserting the relative `fetch` resolves). Helpers in `tests/e2e/helpers`; env in
    `tests/e2e/README.md`. Run: `npx playwright test [--project=api|ui]`.
- **Storybook** — `forge-app` (`@storybook/html-vite`): 15 components / 34 stories of the Bold Editorial design
  system (compiled Tailwind + self-hosted fonts, no CDN). `pnpm build:storybook` / `pnpm storybook`.
- **Sample bundles** — `samples/release-dashboard/` (nested multi-file mini-site) for manual upload testing;
  verified end-to-end (folder upload → live render).

## Live findings (verified against the purchased WfP account, 2026-06-17)

- **Programmatic per-instance provisioning works.** The real `CloudflareWfpClient` uploaded `ms-test2` into
  `mini-sites-dev` via the WfP REST API, the dispatch Worker served its `index.html` + `assets/app.js` (200,
  correct content-types), and `deleteWorker` removed it from the namespace (control-plane script list confirms).
- **Per-instance Workers are non-routable.** `https://ms-test1.zenuml.workers.dev/` → `error code 1042`; the
  ONLY way in is the dispatch Worker. This is the WfP isolation guarantee, proven.
- **Deletion is eventually-consistent at the dispatch EDGE.** After `deleteWorker` (script gone at the control
  plane, confirmed by the API), the dispatch binding kept serving the compiled Worker for **>2 minutes**
  (cache-buster query + POST both still 200; no `cf-cache-status`/`cache-control` → it is the dispatch
  namespace's edge script cache, not HTTP caching, and not our code — the dispatch Worker is a clean
  pass-through). **Consequence:** script deletion is NOT a prompt-revocation mechanism. Prompt revocation MUST
  come from the **short-lived signed-path grant** (≤60s TTL, minted only by the Forge resolver for an
  authorized viewer of a live instance). This is exactly why the grant survives the Forge pivot — it is the
  serve-path's revocation primitive; `deleteInstance` is only eventual cleanup.

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
2. Pre-implementation lifecycle/security acceptance criteria signed off (ADR + threat model + the invariants above).
3. EV comparison vs shipping the next ZenUML feature + a kill criterion stronger than "cheap to build."

> **2026-06-17 — demand-to-pay gate REMOVED by decision.** The former gate 2 ("≥3 paying prospects beyond the anchor team who pre-approved the external-processor architecture") is **waived**. We are listing on the Marketplace as the demand-validation instrument itself (list-first, validate with real installs) rather than gating the listing on pre-secured paid commitments. Privacy / residency / DPA disclosures are still required *within* the listing, but they no longer block publishing.

If the gates don't pass → ship the next ZenUML feature instead.

## Positioning (one line)

The only Confluence-native way to upload + host a multi-file bundle — a **first-mover execution wedge with no durable moat** (Forge Custom UI and 4.5k–8.7k-install incumbents could copy it; governance is table stakes). Demand is **n=1 (the anchor team), unvalidated beyond** — hence the gates.
