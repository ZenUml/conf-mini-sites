// Forge resolver — the app shell's server-side glue (CONTEXT.md 2026-06-17). Two responsibilities, both thin
// authenticated proxies to the Cloudflare CONTROL Worker (declared as the `control` remote):
//
//   getServeUrl — derive the per-instance id from THIS macro's context (server-side, so a client cannot ask
//     for another instance's grant), ask the control Worker to mint a short-lived grant, return the dispatch
//     serve URL. The Custom UI drops that URL into an <iframe>.
//   publish     — forward the uploaded multi-file bundle to the control Worker, which validates + secret-scans
//     it and provisions the per-instance Worker.
//
// Auth: Forge attaches a Forge Invocation Token (FIT) to invocations routed through a DECLARED REMOTE via
// invokeRemote() — NOT to plain api.fetch(url), which is external egress and carries no token (observed live
// 2026-07-16: the control Worker logged via:"shared-secret" until the switch). The control Worker validates
// the FIT (RS256/JWKS + iss/aud) as the PRIMARY, binding credential; the shared secret (x-mini-sites-secret)
// this resolver also sends is the CI/E2E credential for calls that don't transit Forge. Confluence
// permissions are INHERITED:
// Forge only invokes this resolver for a user it has already authorized for the macro, so there is no
// permission check here (DESIGN §6 insight).

// Default imports — the working Forge-resolver pattern (Planning-Poker, ui-kit-2-page-approver). This requires
// the app package to be CommonJS (no "type":"module" in package.json); with type:module Forge's bundler
// mis-applies ESM interop and `new Resolver()` throws "not a constructor" (caught live on first render).
import Resolver from '@forge/resolver';
import { invokeRemote } from '@forge/api';
import { sendMixpanelEvent, CLIENT_TRACKABLE_EVENT_NAMES } from './analytics';

// The manifest declares one remote per control-Worker env (a remote's baseUrl is static), so the existing
// per-env CONTROL_BASE_URL Forge variable stays the single source of truth and selects the remote KEY.
const CONTROL_BASE = process.env.CONTROL_BASE_URL;
const CONTROL_REMOTE = (CONTROL_BASE ?? '').includes('-production')
  ? 'control-prod'
  : (CONTROL_BASE ?? '').includes('-staging')
    ? 'control-stg'
    : 'control';
const CONTROL_SECRET = process.env.CONTROL_SHARED_SECRET; // CI/E2E-twin secret, still sent; the FIT is primary

const authHeaders = () => ({ 'content-type': 'application/json', 'x-mini-sites-secret': CONTROL_SECRET ?? '' });

// EAG-92 — paid-licensing gate. Forge injects `context.license` ONLY for PRODUCTION installs of a
// Marketplace-listed app; it is `undefined` for free apps, unlisted apps, and dev/staging/custom envs. To
// VERIFY the gate off-Marketplace (its acceptance criterion: active vs simulated-inactive on lite-dev), the
// resolver honors a `LICENSE_OVERRIDE` Forge variable that wins over real context:
//   forge variables set -e <env> LICENSE_OVERRIDE inactive   # force the blocked state (publish → 402)
//   forge variables set -e <env> LICENSE_OVERRIDE active     # force the licensed state
//   forge variables unset -e <env> LICENSE_OVERRIDE          # fall back to the real `context.license`
// `license.active` is true only for a valid paid/evaluation license. Policy (see docs/listing privacy addendum
// + DESIGN): block NEW publishes when the license is inactive; NEVER gate serving — getServeUrl stays open so
// already-published embeds keep rendering for viewers even if the license lapses.
const licenseInactive = (context) => {
  const override = process.env.LICENSE_OVERRIDE; // operator/test knob; wins over context when set
  if (override === 'inactive') return true;
  if (override === 'active') return false;
  return context?.license != null && context.license.active === false;
};

const resolver = new Resolver();

/** Stable per-macro-instance id derived from the macro's localId (server-side context). Sanitised to a valid
 *  Cloudflare script-name component: lowercase hex-ish, ≤ the control Worker's INSTANCE_ID_RE bound. */
async function instanceIdFromContext(context) {
  const localId = context?.extension?.localId ?? context?.localId ?? '';
  const cloudId = context?.cloudId ?? context?.extension?.cloudId ?? '';
  const seed = `${cloudId}:${localId}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return { instanceId: `i${hex.slice(0, 31)}`, cloudId }; // 'i'+31 hex = 32 chars, matches /^[a-z0-9][a-z0-9_-]{0,55}$/
}

/** Common analytics dimensions from a resolver invocation's context — the mini-sites analog of
 *  trackAnalyticsEvent.ts's enrichment step in conf-app. `accountId`/`environmentType` are read
 *  best-effort (Forge's resolver Context is an untyped bag — `{[key: string]: any}` — so absence is a
 *  normal, non-error case, not a crash: sendMixpanelEvent falls back to an `unknown_*` sentinel). */
function analyticsContext(context, instanceId, cloudId) {
  return {
    instanceId,
    cloudId,
    accountId: typeof context?.accountId === 'string' ? context.accountId : undefined,
    environmentType: typeof context?.environmentType === 'string' ? context.environmentType : undefined,
  };
}

// Single generic endpoint the Custom UI invokes for the funnel steps that only happen client-side (the
// macro rendering, the Publisher modal opening, a folder pick) — mirrors conf-app's single functions/
// track.ts endpoint for all frontend-originated events, rather than one resolver function per event.
// Every other event in the catalog (validation/secret-scan/publish/render outcomes, license-blocked
// publish) is tracked server-side, in the handler that actually knows the outcome — never trusted from
// the client. Fire-and-forget from the Custom UI's POV (view.js/publisher.js call invoke('trackEvent',
// ...) without awaiting), but awaited HERE because a Forge resolver invocation's background work is not
// guaranteed to run once the function returns (no ctx.waitUntil equivalent) — see mixpanelClient.ts's
// dispatch-Worker counterpart for the ctx.waitUntil version of this same "never block the caller" rule.
resolver.define('trackEvent', async (req) => {
  const name = req.payload?.name;
  if (typeof name !== 'string' || !CLIENT_TRACKABLE_EVENT_NAMES.has(name)) return { ok: false, code: 'UNKNOWN_EVENT' };
  const { instanceId, cloudId } = await instanceIdFromContext(req.context);
  const properties = req.payload?.properties && typeof req.payload.properties === 'object' ? req.payload.properties : {};
  await sendMixpanelEvent(name, properties, analyticsContext(req.context, instanceId, cloudId));
  return { ok: true };
});

resolver.define('getServeUrl', async (req) => {
  const { instanceId, cloudId } = await instanceIdFromContext(req.context);
  const path = `/serve-url?instanceId=${encodeURIComponent(instanceId)}&cloudId=${encodeURIComponent(cloudId)}`;
  const res = await invokeRemote(CONTROL_REMOTE, { path, method: 'POST', headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) return { ok: false, code: data.code ?? `HTTP_${res.status}`, instanceId };
  // Serving is never license-gated (live embeds must keep working); surface the state so the UI can show a
  // non-blocking "license inactive — renew to keep editing" hint without breaking the view.
  return { ok: true, url: data.url, instanceId, licenseActive: !licenseInactive(req.context) };
});

resolver.define('publish', async (req) => {
  const { instanceId, cloudId } = await instanceIdFromContext(req.context);
  // Gate the WRITE path: refuse new publishes on an inactive license and signal the UI to show an upgrade
  // CTA (402 Payment Required). Existing embeds keep serving via getServeUrl — only new publishing is blocked.
  if (licenseInactive(req.context)) {
    await sendMixpanelEvent('license_blocked_publish', {}, analyticsContext(req.context, instanceId, cloudId));
    return { ok: false, code: 'LICENSE_INACTIVE', httpStatus: 402, instanceId };
  }
  const files = Array.isArray(req.payload?.files) ? req.payload.files : [];
  // Pass cloudId so the control Worker records (instanceId → cloudId) for uninstall-driven GC: on uninstall it
  // tombstones by cloudId, then deletes the bundle 30 days later (DESIGN: no indefinite post-uninstall retention).
  const res = await invokeRemote(CONTROL_REMOTE, {
    path: `/publish?instanceId=${encodeURIComponent(instanceId)}&cloudId=${encodeURIComponent(cloudId)}`,
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ files }),
  });
  const data = await res.json().catch(() => ({}));
  return { ...data, httpStatus: res.status, instanceId };
});

export const handler = resolver.getDefinitions();

/** Extract the bare Confluence site cloudId from a trigger context. Mirrors instanceIdFromContext's cloudId
 *  source (context.cloudId), with a fallback to parsing the trailing segment of installContext
 *  (ari:cloud:confluence::site/<cloudId>) since lifecycle-trigger contexts can carry the ARI instead. */
function cloudIdFromContext(context) {
  const direct = context?.cloudId ?? context?.extension?.cloudId;
  if (direct) return direct;
  const ari = context?.installContext ?? context?.contextToken ?? '';
  const m = /\/([^/]+)$/.exec(String(ari)); // last path segment of the site ARI
  return m ? m[1] : '';
}

// preUninstall — invoked when the app is uninstalled (manifest `preUninstall` module). Tell the control Worker
// to tombstone every mini-site this site provisioned; the control Worker's scheduled sweep then deletes the
// Cloudflare-hosted bundles 30 days later (no indefinite retention). Best-effort: if the site reinstalls and
// re-views/republishes before the window elapses, the control Worker clears the tombstone (recordActive).
export async function preUninstall(_payload, context) {
  const cloudId = cloudIdFromContext(context);
  if (!cloudId) {
    console.warn('preUninstall: no cloudId in context; cannot schedule bundle deletion');
    return;
  }
  try {
    const res = await invokeRemote(CONTROL_REMOTE, {
      path: `/uninstall?cloudId=${encodeURIComponent(cloudId)}`,
      method: 'POST',
      headers: authHeaders(),
    });
    console.log(`preUninstall: control /uninstall for cloudId=${cloudId} → ${res.status}`);
  } catch (e) {
    console.error('preUninstall: failed to notify control Worker', e);
  }
}
