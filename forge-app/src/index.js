// Forge resolver — the app shell's server-side glue (CONTEXT.md 2026-06-17). Two responsibilities, both thin
// authenticated proxies to the Cloudflare CONTROL Worker (declared as the `control` remote):
//
//   getServeUrl — derive the per-instance id from THIS macro's context (server-side, so a client cannot ask
//     for another instance's grant), ask the control Worker to mint a short-lived grant, return the dispatch
//     serve URL. The Custom UI drops that URL into an <iframe>.
//   publish     — forward the uploaded multi-file bundle to the control Worker, which validates + secret-scans
//     it and provisions the per-instance Worker.
//
// Auth: a shared secret (x-mini-sites-secret) proves the call is our app — no OAuth scopes (the control Worker
// also accepts a verified Forge invocation token as an upgrade path). Confluence permissions are INHERITED:
// Forge only invokes this resolver for a user it has already authorized for the macro, so there is no
// permission check here (DESIGN §6 insight).

// Default imports — the working Forge-resolver pattern (Planning-Poker, ui-kit-2-page-approver). This requires
// the app package to be CommonJS (no "type":"module" in package.json); with type:module Forge's bundler
// mis-applies ESM interop and `new Resolver()` throws "not a constructor" (caught live on first render).
import Resolver from '@forge/resolver';
import api from '@forge/api';

const CONTROL_BASE = process.env.CONTROL_BASE_URL; // the control Worker origin (declared as the `control` remote)
const CONTROL_SECRET = process.env.CONTROL_SHARED_SECRET; // shared secret proving this call is our app

const authHeaders = () => ({ 'content-type': 'application/json', 'x-mini-sites-secret': CONTROL_SECRET ?? '' });

// EAG-92 — paid-licensing gate. Forge injects `context.license` ONLY for PRODUCTION installs of a
// Marketplace-listed app; it is `undefined` for free apps, unlisted apps, and dev/staging/custom envs
// (there, simulate with `forge variables set -e <env> LICENSE_OVERRIDE active|inactive`). `license.active`
// is true only for a valid paid/evaluation license. Policy (see docs/listing privacy addendum + DESIGN):
// block NEW publishes when a license is present AND inactive; NEVER gate serving — getServeUrl stays open
// so already-published embeds keep rendering for viewers even if the license lapses.
const licenseInactive = (context) => context?.license != null && context.license.active === false;

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

resolver.define('getServeUrl', async (req) => {
  const { instanceId, cloudId } = await instanceIdFromContext(req.context);
  const url = `${CONTROL_BASE}/serve-url?instanceId=${encodeURIComponent(instanceId)}&cloudId=${encodeURIComponent(cloudId)}`;
  const res = await api.fetch(url, { method: 'POST', headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) return { ok: false, code: data.code ?? `HTTP_${res.status}`, instanceId };
  // Serving is never license-gated (live embeds must keep working); surface the state so the UI can show a
  // non-blocking "license inactive — renew to keep editing" hint without breaking the view.
  return { ok: true, url: data.url, instanceId, licenseActive: !licenseInactive(req.context) };
});

resolver.define('publish', async (req) => {
  const { instanceId } = await instanceIdFromContext(req.context);
  // Gate the WRITE path: refuse new publishes on an inactive license and signal the UI to show an upgrade
  // CTA (402 Payment Required). Existing embeds keep serving via getServeUrl — only new publishing is blocked.
  if (licenseInactive(req.context)) {
    return { ok: false, code: 'LICENSE_INACTIVE', httpStatus: 402, instanceId };
  }
  const files = Array.isArray(req.payload?.files) ? req.payload.files : [];
  const res = await api.fetch(`${CONTROL_BASE}/publish?instanceId=${encodeURIComponent(instanceId)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ files }),
  });
  const data = await res.json().catch(() => ({}));
  return { ...data, httpStatus: res.status, instanceId };
});

export const handler = resolver.getDefinitions();
