// Cloudflare Workers API client for e2e — talks to the deployed control + dispatch Workers exactly as the
// Forge resolver does (shared-secret auth). Lets API specs exercise publish / serve-url / instance / dispatch
// without a browser.
import { E2E } from './env';

export interface PublishFile { path: string; b64: string }
export interface JsonResult { status: number; body: any }

function authHeaders(): Record<string, string> {
  return { 'content-type': 'application/json', 'x-mini-sites-secret': E2E.controlSecret };
}
async function asJson(res: Response): Promise<JsonResult> {
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/** POST /publish — validate + secret-scan + provision the per-instance Worker. */
export async function publish(instanceId: string, files: PublishFile[], opts: { secret?: string } = {}): Promise<JsonResult> {
  const headers = opts.secret !== undefined ? { 'content-type': 'application/json', 'x-mini-sites-secret': opts.secret } : authHeaders();
  const res = await fetch(`${E2E.controlUrl}/publish?instanceId=${encodeURIComponent(instanceId)}`, { method: 'POST', headers, body: JSON.stringify({ files }) });
  return asJson(res);
}

/** POST /serve-url — mint a grant + return the dispatch serve URL (or NOT_PUBLISHED). */
export async function serveUrl(instanceId: string, cloudId = E2E.cloudId, opts: { secret?: string } = {}): Promise<JsonResult> {
  const headers = opts.secret !== undefined ? { 'content-type': 'application/json', 'x-mini-sites-secret': opts.secret } : authHeaders();
  const res = await fetch(`${E2E.controlUrl}/serve-url?instanceId=${encodeURIComponent(instanceId)}&cloudId=${encodeURIComponent(cloudId)}`, { method: 'POST', headers });
  return asJson(res);
}

/** DELETE /instance — tear down the per-instance Worker (idempotent). */
export async function deleteInstance(instanceId: string, opts: { secret?: string } = {}): Promise<JsonResult> {
  const headers = opts.secret !== undefined ? { 'x-mini-sites-secret': opts.secret } : { 'x-mini-sites-secret': E2E.controlSecret };
  const res = await fetch(`${E2E.controlUrl}/instance?instanceId=${encodeURIComponent(instanceId)}`, { method: 'DELETE', headers });
  return asJson(res);
}

export async function healthz(): Promise<JsonResult> {
  return asJson(await fetch(`${E2E.controlUrl}/healthz`));
}

/** Raw GET against the dispatch Worker (e.g. a full serve URL path). Returns status + content-type + text. */
export async function dispatchGet(pathOrUrl: string): Promise<{ status: number; contentType: string | null; text: string }> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${E2E.dispatchUrl}${pathOrUrl}`;
  const res = await fetch(url);
  return { status: res.status, contentType: res.headers.get('content-type'), text: await res.text() };
}

/** Encode raw text → base64 (for building PublishFile bundles in specs). */
export function b64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

/** A unique, valid instanceId for an API test (matches the control Worker's INSTANCE_ID_RE
 *  /^[a-z0-9][a-z0-9_-]{0,55}$/). Use a fresh one per test + deleteInstance() in teardown. */
export function freshInstanceId(prefix = 'iet'): string {
  return prefix + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

/** A minimal valid two-file bundle (index.html + app.js) as PublishFiles. */
export function sampleFiles(): PublishFile[] {
  return [
    { path: 'index.html', b64: b64('<!doctype html><title>t</title><h1>e2e</h1><script src="app.js"></script>') },
    { path: 'app.js', b64: b64('document.body.dataset.ok="1"') },
  ];
}

/** POST /upload-grant — mint the short-lived grant that lets the BROWSER POST a bundle straight to the
 *  control Worker (Forge caps a front-end invoke payload at ~5 MB). Returns { url, ttlMs }. */
export async function uploadGrant(instanceId: string, cloudId = E2E.cloudId, opts: { secret?: string } = {}): Promise<JsonResult> {
  const headers = opts.secret !== undefined ? { 'content-type': 'application/json', 'x-mini-sites-secret': opts.secret } : authHeaders();
  const res = await fetch(`${E2E.controlUrl}/upload-grant?instanceId=${encodeURIComponent(instanceId)}&cloudId=${encodeURIComponent(cloudId)}`, { method: 'POST', headers });
  return asJson(res);
}

/** POST an upload URL returned by /upload-grant — the direct-upload publish. Deliberately sends NO
 *  shared-secret header: the grant in the URL is the only credential, exactly as the browser does it. */
export async function uploadBundle(url: string, files: PublishFile[]): Promise<JsonResult> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files }) });
  return asJson(res);
}
