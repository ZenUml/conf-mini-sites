// Regression (production incident 2026-09-08, v0.4.0): a bundle whose file was one multi-megabyte line
// made the publish pipeline throw, and an UNCAUGHT throw in the fetch handler is answered by Cloudflare
// with a bare 500 that carries none of `cors()`'s headers. The browser therefore reported a CORS
// failure rather than a server error, the Publisher's TypeError branch fell back to `invoke('publish')`,
// and the user saw the pre-fix "413" message — the server fault was invisible. Any throw on a
// browser-facing route must come back as a CORS-wrapped 500 so the client can report it truthfully.
import { describe, it, expect } from 'vitest';
import worker from './index';
import { mintUploadGrant, UPLOAD_GRANT_TTL_MS } from '../gateway/uploadGrant';

const K_GRANT = 'test-k-grant-value-for-upload-envelope';
const INSTANCE = 'itestinstance0000000000000000000';

function ctx(): ExecutionContext {
  return { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
}

describe('POST /upload error envelope', () => {
  it('answers a thrown pipeline error with a CORS-wrapped 500, not an uncaught throw', async () => {
    const now = Date.now();
    const grant = await mintUploadGrant(
      { i: INSTANCE, cl: 'cloud-1', a: 'acct-1', exp: now + UPLOAD_GRANT_TTL_MS },
      new TextEncoder().encode(K_GRANT),
      () => now,
    );
    // `!!!` is not valid base64 — decoding throws inside the publish path, standing in for any
    // unexpected pipeline failure (the incident's was a stack overflow in the secret scanner).
    const req = new Request(
      `https://control.example/upload?instanceId=${INSTANCE}&cloudId=cloud-1&grant=${encodeURIComponent(grant)}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files: [{ path: 'index.html', b64: '!!!' }] }) },
    );

    const res = await worker.fetch(req, { K_GRANT } as never, ctx());

    expect(res.status).toBe(500);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, code: 'INTERNAL' });
  });
});
