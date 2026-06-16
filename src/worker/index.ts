// Cloudflare Worker — the Forge app's REMOTE backend (Forge `remotes` model; see CONTEXT.md). Forge fronts
// the app (install, distribution, user auth); this Worker hosts + serves the multi-file bundle from R2 and
// runs the publish pipeline. WfP is unavailable, so hosting is R2 via the HostingProvider seam (R2HostingProvider).
//
// Auth (next step): verify the Forge invocation token (RS256/JWKS, conf-app authenticate.ts pattern) — Forge
// sends it on every requestRemote call (appUserToken), and Forge has already enforced the user's Confluence
// permissions, so there is NO self-built ACL here (the CVSS-9.1 gateway is gone). This MVP wires the routes +
// R2 hosting; the token verifier is added + enforced before the Forge UI is pointed at it.
import { R2HostingProvider } from '../hosting/R2HostingProvider';
import { R2BundleObjectStore } from '../hosting/R2BundleObjectStore';
import { validateBundle } from '../pipeline/bundleValidation';
import type { RawBundleFile } from '../pipeline/bundleValidation';
import { scanForSecrets } from '../pipeline/secretScan';
import type { InstanceHandle, ServeAuthContext } from '../hosting/HostingProvider';

export interface Env {
  BUNDLES: R2Bucket;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const cors = (res: Response): Response => {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*'); // tightened to the Forge egress origin once the UI is wired
  h.set('access-control-allow-headers', 'authorization, content-type');
  h.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  return new Response(res.body, { status: res.status, headers: h });
};

// Forge has already authorized the viewer; the served bytes are static. (Token verification lands next.)
const SERVE_AUTH: ServeAuthContext = { cloudId: '', contentId: '', accountId: '', grantedAt: 0 };

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    const provider = new R2HostingProvider(new R2BundleObjectStore(env.BUNDLES));

    if (url.pathname === '/healthz') return cors(json({ ok: true, service: 'conf-mini-sites-remote' }));

    // POST /publish?instanceId=ID  body: { files: [{ path, b64 }] }  → validate + secret-scan + store in R2.
    if (request.method === 'POST' && url.pathname === '/publish') {
      const instanceId = url.searchParams.get('instanceId');
      if (!instanceId) return cors(json({ ok: false, code: 'MISSING_INSTANCE_ID' }, 400));
      let body: { files?: Array<{ path: string; b64: string }> };
      try { body = await request.json(); } catch { return cors(json({ ok: false, code: 'BAD_JSON' }, 400)); }
      const files: RawBundleFile[] = (body.files ?? []).map((f) => ({ path: f.path, bytes: b64ToBytes(f.b64) }));

      const validated = await validateBundle(files);
      if (!validated.ok) return cors(json({ ok: false, code: validated.error.code, message: validated.error.message }, validated.error.status));
      const scan = scanForSecrets(files);
      if (scan.hits.length > 0) {
        const hit = scan.hits[0]!;
        return cors(json({ ok: false, code: 'SECRET_DETECTED', message: `secret in ${hit.file}:${hit.line} (${hit.kind})` }, 422));
      }
      const handle: InstanceHandle = { id: instanceId, providerRef: '' };
      await provider.createInstance(handle, validated.bundle);
      return cors(json({ ok: true, instanceId, entrypoint: validated.bundle.entrypoint, files: validated.bundle.files.length }));
    }

    // GET /v/<instanceId>/<path...>  → serve a bundle file from R2.
    const m = url.pathname.match(/^\/v\/([^/]+)\/(.+)$/);
    if (request.method === 'GET' && m) {
      const handle: InstanceHandle = { id: decodeURIComponent(m[1]!), providerRef: '' };
      const res = await provider.serve(handle, decodeURIComponent(m[2]!), SERVE_AUTH);
      const h = new Headers(res.headers);
      h.set('x-content-type-options', 'nosniff');
      return cors(new Response(res.body, { status: res.status, headers: h }));
    }
    // GET /v/<instanceId>  → entrypoint (index.html)
    const e = url.pathname.match(/^\/v\/([^/]+)\/?$/);
    if (request.method === 'GET' && e) {
      const handle: InstanceHandle = { id: decodeURIComponent(e[1]!), providerRef: '' };
      return cors(await provider.serve(handle, 'index.html', SERVE_AUTH));
    }

    return cors(json({ ok: false, code: 'NOT_FOUND' }, 404));
  },
};
