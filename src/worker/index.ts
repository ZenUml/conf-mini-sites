// Cloudflare CONTROL Worker — the Forge app's provisioning backend (a Forge `remote`; CONTEXT.md 2026-06-17).
// Publish flows resolver → here over a Forge remote carrying the Forge invocation token. This Worker:
//   1. verifies the Forge invocation token (RS256/JWKS + app-id allowlist) so ONLY our Forge app can provision;
//   2. validates + secret-scans the uploaded multi-file bundle (reused pipeline);
//   3. provisions the per-instance user Worker into the dispatch namespace via the WfP REST API
//      (CloudflareWfPProvider + CloudflareWfpClient).
// It does NOT serve viewer bytes — the dispatch Worker (src/dispatch) does, gated by the resolver-minted grant.
//
// Forge already enforced the user's Confluence page permission before invoking the resolver, so there is no
// Confluence permission check here — the token check is provisioning authorization only (DESIGN §2).

import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { CloudflareWfpClient } from '../hosting/CloudflareWfpClient';
import { validateBundle } from '../pipeline/bundleValidation';
import type { RawBundleFile } from '../pipeline/bundleValidation';
import { scanForSecrets } from '../pipeline/secretScan';
import { verifyForgeToken, forgeJwks, extractBearer } from '../gateway/forgeToken';
import type { InstanceHandle } from '../hosting/HostingProvider';

export interface Env {
  /** Comma-separated Forge app ids allowed to provision (last ARI segment). */
  ALLOWED_FORGE_APP_IDS: string;
  /** Cloudflare account id owning the dispatch namespace. */
  WFP_ACCOUNT_ID: string;
  /** Dispatch namespace name, e.g. "mini-sites-dev". */
  WFP_NAMESPACE: string;
  /** Cloudflare API token (Workers Scripts:Edit) — a Worker secret. Never logged. */
  WFP_API_TOKEN: string;
  /** Optional Forge JWKS URL override (tests/staging). */
  FORGE_JWKS_URL?: string;
  [binding: string]: unknown;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Forge calls this remote server-to-server; no browser CORS preflight. Lock the allowed origin to the Forge
// egress and reflect only the methods we expose.
const cors = (res: Response): Response => {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*'); // Forge remote is server-side; no credentialed browser origin
  h.set('access-control-allow-headers', 'authorization, content-type');
  h.set('access-control-allow-methods', 'POST, DELETE, OPTIONS');
  return new Response(res.body, { status: res.status, headers: h });
};

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// A per-instance Worker script name is `ms-<instanceId>`; the Worker name must be a valid Cloudflare script
// name. Constrain instanceId so `ms-<id>` stays ≤63 chars of [a-z0-9_-] (a uuid or nanoid qualifies).
const INSTANCE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,55}$/;

function makeProvider(env: Env): CloudflareWfPProvider {
  return new CloudflareWfPProvider(
    new CloudflareWfpClient({ accountId: env.WFP_ACCOUNT_ID, namespace: env.WFP_NAMESPACE, apiToken: env.WFP_API_TOKEN }),
  );
}

async function authorize(request: Request, env: Env): Promise<{ ok: true } | { ok: false; res: Response }> {
  const token = extractBearer(request.headers.get('authorization'));
  const result = await verifyForgeToken(token, {
    getKey: forgeJwks(env.FORGE_JWKS_URL),
    allowedAppIds: (env.ALLOWED_FORGE_APP_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  if (!result.ok) return { ok: false, res: cors(json({ ok: false, code: 'UNAUTHORIZED', reason: result.reason }, 401)) };
  return { ok: true };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (url.pathname === '/healthz') return cors(json({ ok: true, service: 'conf-mini-sites-control' }));

    // POST /publish?instanceId=ID  body: { files: [{ path, b64 }] } → validate + scan + provision per-instance Worker.
    if (request.method === 'POST' && url.pathname === '/publish') {
      const auth = await authorize(request, env);
      if (!auth.ok) return auth.res;

      const instanceId = url.searchParams.get('instanceId') ?? '';
      if (!INSTANCE_ID_RE.test(instanceId)) return cors(json({ ok: false, code: 'BAD_INSTANCE_ID' }, 400));

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

      const handle: InstanceHandle = { id: instanceId, providerRef: `ms-${instanceId}` };
      await makeProvider(env).createInstance(handle, validated.bundle);
      return cors(json({ ok: true, instanceId, entrypoint: validated.bundle.entrypoint, files: validated.bundle.files.length }));
    }

    // DELETE /instance?instanceId=ID → tear down the per-instance Worker (macro/page deleted — orphan cleanup).
    if (request.method === 'DELETE' && url.pathname === '/instance') {
      const auth = await authorize(request, env);
      if (!auth.ok) return auth.res;
      const instanceId = url.searchParams.get('instanceId') ?? '';
      if (!INSTANCE_ID_RE.test(instanceId)) return cors(json({ ok: false, code: 'BAD_INSTANCE_ID' }, 400));
      await makeProvider(env).deleteInstance({ id: instanceId, providerRef: `ms-${instanceId}` });
      return cors(json({ ok: true, instanceId, deleted: true }));
    }

    return cors(json({ ok: false, code: 'NOT_FOUND' }, 404));
  },
};
