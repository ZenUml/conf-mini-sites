---
name: check-version
description: >
  Confirm which build of Conf Mini-Sites is live — the deployed Forge app version
  per environment, the live control + dispatch Worker versions, and (on a real
  page) that the macro resolved its per-instance reference. Use after a deploy, in
  a spot check, or in PVT to confirm the expected build is running. Triggers on
  "check version", "what version is live", "confirm the deploy", "which build is
  on lite-dev", "is my deploy live".
---

# Check Version

Confirms which build of Conf Mini-Sites is running. Unlike a single-page SPA, the CMS deployable is split across **three** artifacts, each with its own version signal — there is no single in-iframe version label, because the mini-site iframe is arbitrary *user* HTML (it carries no app build string). So "what version is live" means checking the three things the app actually ships:

1. **Forge app** — the macro + resolver + Custom UI. Version is reported by the Forge platform per environment.
2. **Control Worker** (`conf-mini-sites-remote-dev`) — provisioner. Version = the latest deployment id.
3. **Dispatch Worker** (`conf-mini-sites-dispatch-dev`) — serve gateway. Version = the latest deployment id.

On a real Confluence page you can *additionally* confirm the resolver wired up by reading the macro's instance reference (`mini-site:<instanceId>`), but that confirms wiring, not build identity.

## 1. Forge app version (the usual "is my deploy live?")

The deployed Forge app version per environment comes from the Forge CLI — there is no version string baked into the macro iframe to read.

```bash
# Which version is installed where:
FORGE_APP_ID=2efdb7d9-ee5a-4294-b56a-b514e36e1a98 forge install list
# Per-environment deployment history (the version + upload time of the latest deploy):
forge deployments list -e development   # or -e production
```

Match the latest deployment's version/time against the build you expect (the commit/PR you just deployed). After `forge deploy`, the development environment updates immediately; an installed site picks it up on the next load (or after `forge install --upgrade`).

## 2. Control + dispatch Worker versions

The two Cloudflare Workers are deployed independently of the Forge app. Confirm each is the build you expect via Wrangler (reading only — never deploy here):

```bash
npx wrangler deployments list --config wrangler-remote.toml      # control Worker
npx wrangler deployments list --config wrangler-dispatch.toml    # dispatch Worker
```

The top entry is the live version — match its `Created` timestamp / message against your last `wrangler deploy`. A liveness smoke for the deployed pair:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://conf-mini-sites-remote-dev.zenuml.workers.dev/healthz
# 200 ⇒ the control Worker is up. The dispatch Worker has no public health route (deny-by-default): any path
# that isn't a valid grant-bearing /v/<id>/g/<grant>/… serve URL returns 404 by design — a 404 on the root
# means it's deployed and failing closed, which is correct.
```

> **K_GRANT invariant (the #1 operational failure).** `K_GRANT` must be byte-identical in BOTH Workers — the control Worker mints serve grants, the dispatch Worker verifies them. A mismatch (or an unset `CONTROL_SHARED_SECRET`) fails closed: every grant 401s. If serve URLs work in isolation but the page won't render, suspect a `K_GRANT` skew between the two Worker deploys before anything else.

## 3. Confirm the resolver wired up on a real page (Playwright)

This does **not** read a build version — it confirms the *deployed* macro reached the resolver and got a per-instance serve URL back. The inline launcher writes the instance reference into `#v-ref` as `mini-site:<instanceId>` once `getServeUrl` succeeds, and loads the served mini-site into `#v-frame` (whose `src` points at the dispatch Worker).

The launcher Custom UI renders in a cross-origin Forge iframe, so use `page.frames()` to reach inside it (a `FrameLocator` from `.contentFrame()` does **not** expose `.evaluate()`):

```js
async (page) => {
  // 1. Navigate to a page carrying the mini-site macro (use create-test-page to stand one up).
  // await page.goto('https://lite-dev.atlassian.net/wiki/spaces/SD/pages/<id>');
  // await page.waitForTimeout(3000);

  // 2. The launcher frame contains #v-ref / #v-frame. Find the actual Frame object.
  const launcher = page.frames().find((f) => f.url() && f.url() !== 'about:blank' &&
    f.locator);
  // Poll for #v-ref across frames (the macro renders lazily):
  let ref = null, served = null;
  for (let i = 0; i < 20 && !ref; i++) {
    for (const f of page.frames()) {
      try {
        const t = await f.evaluate(() => document.getElementById('v-ref')?.textContent || null);
        if (t && t.startsWith('mini-site:')) { ref = t; break; }
      } catch { /* detached / cross-origin-not-ours frame */ }
    }
    if (!ref) await page.waitForTimeout(1500);
  }

  // 3. The served mini-site loads in a nested dispatch-Worker iframe. Confirm its origin.
  served = page.frames().map((f) => f.url()).find((u) => u.includes('conf-mini-sites-dispatch-dev')) || null;

  return { instanceRef: ref, servedFrom: served };
}
```

### What to verify

- `instanceRef` is `mini-site:i…` (32-char id) — the resolver computed an instance id and `getServeUrl` returned `ok`. An empty/absent ref means the macro rendered the **empty** state: either nothing is published to this instance (`NOT_PUBLISHED`), or the resolver→control call failed (check `CONTROL_SHARED_SECRET` and the control Worker health).
- `servedFrom` includes `conf-mini-sites-dispatch-dev` — the nested iframe is being served by the dispatch Worker, i.e. the grant verified and a per-instance Worker is serving the bundle.

## Diagnosing a blank result

If no `#v-ref` frame is found:

1. **Navigated before the macro rendered** — add more `waitForTimeout` after `goto`; cold Forge macro renders are slow, especially on a freshly-created page (`tests/e2e/helpers/forge.ts` polls up to 50 tries).
2. **Login wall** — the page needs an authenticated session; if `page.frames()` only shows the Confluence login, restore the E2E `storageState` (`tests/e2e/.auth/state.json`).
3. **Empty state, not an error** — `#v-ref` is only populated when a bundle is published to this instance. Pre-publish with `create-test-page --bundle`, or upload via the Publisher, then re-check.

## Related skills

- **spot-check** — general post-deploy verification harness; check-version is the "confirm the build" sub-step.
- **create-test-page** — stand up a page (optionally pre-published) so the resolver-wiring check has a target.
- **forge-installs** — counts installs (how many sites); this skill confirms which build those installs run.
