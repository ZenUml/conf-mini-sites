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
import type { VerifyForgeResult } from '../gateway/forgeToken';
import { mintGrant } from '../gateway/grant';
import type { InstanceHandle } from '../hosting/HostingProvider';
import { D1ProvisionedInstanceStore } from '../db/D1ProvisionedInstanceStore';
import { runUninstallSweep } from '../lifecycle/uninstallGc';

/** Serve-grant TTL — long enough for an iframe to load all of a bundle's assets at render, short enough to
 *  bound replay. Under Forge there is no permission-cache to couple to; this is purely the replay bound. */
const SERVE_GRANT_TTL_MS = 300_000;

export interface Env {
  /** Comma-separated Forge app ids allowed to provision (last ARI segment). */
  ALLOWED_FORGE_APP_IDS: string;
  /** Cloudflare account id owning the dispatch namespace. */
  WFP_ACCOUNT_ID: string;
  /** Dispatch namespace name, e.g. "mini-sites-dev". */
  WFP_NAMESPACE: string;
  /** Cloudflare API token (Workers Scripts:Edit) — a Worker secret. Never logged. */
  WFP_API_TOKEN_PROVISIONING: string;
  /** K_grant raw key material — the HMAC key shared with the dispatch Worker, to MINT serve grants. Secret. */
  K_GRANT: string;
  /** Public base URL of the dispatch Worker, e.g. https://conf-mini-sites-dispatch-dev.zenuml.workers.dev */
  DISPATCH_BASE_URL: string;
  /** Shared secret proving the caller is our Forge resolver (sent as x-mini-sites-secret). A Worker secret;
   *  its twin is the Forge variable the resolver reads. The primary resolver→control auth (no OAuth scopes). */
  CONTROL_SHARED_SECRET: string;
  /** Optional Forge JWKS URL override (tests/staging). */
  FORGE_JWKS_URL?: string;
  /** D1 database for uninstall-driven GC bookkeeping (ProvisionedInstance). Optional: when unbound (dev not yet
   *  provisioned), all GC bookkeeping is a graceful no-op and the Worker behaves exactly as before. */
  DB?: D1Database;
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

function makeClient(env: Env): CloudflareWfpClient {
  return new CloudflareWfpClient({ accountId: env.WFP_ACCOUNT_ID, namespace: env.WFP_NAMESPACE, apiToken: env.WFP_API_TOKEN_PROVISIONING });
}

function makeProvider(env: Env): CloudflareWfPProvider {
  return new CloudflareWfPProvider(makeClient(env));
}

/** The uninstall-GC store, or null when no D1 is bound (graceful no-op — see Env.DB). */
function makeInstanceStore(env: Env): D1ProvisionedInstanceStore | null {
  return env.DB ? new D1ProvisionedInstanceStore(env.DB) : null;
}

/** Constant-time string compare (avoids leaking the secret via timing). Unequal lengths → false. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type AuthCtx = Extract<VerifyForgeResult, { ok: true }>['context'];
type AuthOk = { ok: true; context: AuthCtx };

// Authorize a control call. PRIMARY: the shared secret our resolver sends (x-mini-sites-secret) — no OAuth
// scopes, the secret lives only in the resolver's Forge variable + this Worker. FALLBACK/UPGRADE: a verified
// Forge invocation token (when the remote is later configured with appUserToken + scopes — forgeToken.ts).
// Both prove "this is our app"; either suffices.
async function authorize(request: Request, env: Env): Promise<AuthOk | { ok: false; res: Response }> {
  const provided = request.headers.get('x-mini-sites-secret');
  if (env.CONTROL_SHARED_SECRET && provided && timingSafeEqual(provided, env.CONTROL_SHARED_SECRET)) {
    return { ok: true, context: { appId: 'shared-secret', payload: {} } };
  }
  const token = extractBearer(request.headers.get('authorization'));
  const result = await verifyForgeToken(token, {
    getKey: forgeJwks(env.FORGE_JWKS_URL),
    allowedAppIds: (env.ALLOWED_FORGE_APP_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  });
  if (!result.ok) return { ok: false, res: cors(json({ ok: false, code: 'UNAUTHORIZED', reason: result.reason }, 401)) };
  return { ok: true, context: result.context };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      try {
        await makeProvider(env).createInstance(handle, validated.bundle);
      } catch (e) {
        return cors(json({ ok: false, code: 'PROVISION_FAILED', message: e instanceof Error ? e.message : String(e) }, 502));
      }
      // Track the provisioned instance for uninstall-driven GC, clearing any prior tombstone (a publish proves
      // the site is live). Best-effort + off the response path: provisioning already succeeded; failing to
      // record only means this instance won't be auto-collected, never that publish fails.
      const pubCloudId = url.searchParams.get('cloudId') ?? '';
      const pubStore = makeInstanceStore(env);
      if (pubStore && pubCloudId) ctx.waitUntil(pubStore.recordActive(instanceId, pubCloudId).catch(() => {}));
      return cors(json({ ok: true, instanceId, entrypoint: validated.bundle.entrypoint, files: validated.bundle.files.length }));
    }

    // POST /serve-url?instanceId=ID → verify Forge token, mint a short-lived grant, return the dispatch URL.
    // The resolver derives instanceId from its (server-side) macro context, so a client can't request a grant
    // for an instance it isn't bound to; this Worker holds K_GRANT and mints — keeping the grant key and the
    // grant format (shared with the dispatch Worker's verify) in one place.
    if (request.method === 'POST' && url.pathname === '/serve-url') {
      const auth = await authorize(request, env);
      if (!auth.ok) return auth.res;
      const instanceId = url.searchParams.get('instanceId') ?? '';
      if (!INSTANCE_ID_RE.test(instanceId)) return cors(json({ ok: false, code: 'BAD_INSTANCE_ID' }, 400));
      if (!env.K_GRANT || !env.DISPATCH_BASE_URL) return cors(json({ ok: false, code: 'NOT_CONFIGURED' }, 500));

      // Only mint a serve grant if this instance actually has a published bundle. Otherwise the Custom UI would
      // embed an iframe to a non-existent per-instance Worker (blank 404); returning NOT_PUBLISHED makes it show
      // the upload panel instead.
      let exists: boolean;
      try {
        exists = await makeClient(env).workerExists(`ms-${instanceId}`);
      } catch (e) {
        return cors(json({ ok: false, code: 'CHECK_FAILED', message: e instanceof Error ? e.message : String(e) }, 502));
      }
      if (!exists) return cors(json({ ok: false, code: 'NOT_PUBLISHED', instanceId }));

      const now = Date.now();
      // Audit-only grant fields (the dispatch Worker verifies i + exp + sig; cl/a/c are for logs). Prefer the
      // verified token context; fall back to values the resolver passes (shared-secret auth has no token).
      const cloudId = auth.context.cloudId ?? url.searchParams.get('cloudId') ?? '';
      // A live view proves the site is installed and in use → clear any uninstall tombstone so a reinstalled
      // embed is never collected by the sweep. Best-effort + off the response path (never delays the render).
      const serveStore = makeInstanceStore(env);
      if (serveStore && cloudId) ctx.waitUntil(serveStore.recordActive(instanceId, cloudId).catch(() => {}));
      const ctxAccount = (auth.context.payload as Record<string, any>)?.context?.accountId;
      const accountId = (typeof ctxAccount === 'string' ? ctxAccount : null) ?? url.searchParams.get('accountId') ?? '';
      const grant = await mintGrant(
        { i: instanceId, ck: auth.context.appId, c: '', a: accountId, cl: cloudId, exp: now + SERVE_GRANT_TTL_MS },
        new TextEncoder().encode(env.K_GRANT),
        () => now,
      );
      const base = env.DISPATCH_BASE_URL.replace(/\/+$/, '');
      return cors(json({ ok: true, instanceId, url: `${base}/v/${encodeURIComponent(instanceId)}/g/${grant}/`, ttlMs: SERVE_GRANT_TTL_MS }));
    }

    // DELETE /instance?instanceId=ID → tear down the per-instance Worker (macro/page deleted — orphan cleanup).
    if (request.method === 'DELETE' && url.pathname === '/instance') {
      const auth = await authorize(request, env);
      if (!auth.ok) return auth.res;
      const instanceId = url.searchParams.get('instanceId') ?? '';
      if (!INSTANCE_ID_RE.test(instanceId)) return cors(json({ ok: false, code: 'BAD_INSTANCE_ID' }, 400));
      try {
        await makeProvider(env).deleteInstance({ id: instanceId, providerRef: `ms-${instanceId}` });
      } catch (e) {
        return cors(json({ ok: false, code: 'DELETE_FAILED', message: e instanceof Error ? e.message : String(e) }, 502));
      }
      return cors(json({ ok: true, instanceId, deleted: true }));
    }

    // POST /uninstall?cloudId=ID → Forge preUninstall trigger: tombstone every still-active instance of this
    // site. The scheduled() sweep then deletes their bundles RETENTION_MS (30 days) later. Idempotent: a repeat
    // won't reset the clock (markUninstalledByCloudId only stamps NULL rows).
    if (request.method === 'POST' && url.pathname === '/uninstall') {
      const auth = await authorize(request, env);
      if (!auth.ok) return auth.res;
      const cloudId = url.searchParams.get('cloudId') ?? '';
      if (!cloudId) return cors(json({ ok: false, code: 'BAD_CLOUD_ID' }, 400));
      const store = makeInstanceStore(env);
      if (!store) return cors(json({ ok: true, cloudId, tombstoned: 0, note: 'no DB bound' }));
      try {
        const tombstoned = await store.markUninstalledByCloudId(cloudId, new Date().toISOString());
        return cors(json({ ok: true, cloudId, tombstoned }));
      } catch (e) {
        return cors(json({ ok: false, code: 'UNINSTALL_FAILED', message: e instanceof Error ? e.message : String(e) }, 502));
      }
    }

    return cors(json({ ok: false, code: 'NOT_FOUND' }, 404));
  },

  // Cron sweep (wrangler [triggers] crons): delete the bundles of sites uninstalled more than RETENTION_MS ago.
  // No-op when no D1 is bound. The per-instance Worker is torn down first, then the row — a failed Worker delete
  // leaves the row for the next pass (runUninstallSweep), and the blast-radius cap bounds deletes per pass.
  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const store = makeInstanceStore(env);
    if (!store) return;
    const client = makeClient(env);
    await runUninstallSweep({
      store,
      deleteWorker: (workerName) => client.deleteWorker(workerName),
      nowMs: Date.now(),
    });
  },
};
