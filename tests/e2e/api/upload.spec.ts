import { test, expect } from '@playwright/test';
import { E2E } from '../helpers/env';
import { uploadGrant, uploadBundle, serveUrl, deleteInstance, dispatchGet, freshInstanceId, sampleFiles } from '../helpers/workers';

// Direct-upload publish (the ~5 MB Forge invoke cap workaround): /upload-grant mints a short-lived grant for
// an authorized caller, and /upload accepts the bundle carrying ONLY that grant — no FIT, no shared secret.
// Same caveat as provision.spec.ts: provisioning needs a valid WFP_API_TOKEN_PROVISIONING on the dev Worker.

let instanceId: string;

test.afterEach(async () => {
  if (instanceId) await deleteInstance(instanceId);
});

test('upload-grant then a grant-only POST publishes the bundle and it serves', async () => {
  instanceId = freshInstanceId();

  const g = await uploadGrant(instanceId);
  expect(g.status).toBe(200);
  expect(g.body.ok).toBe(true);
  expect(g.body.instanceId).toBe(instanceId);
  expect(typeof g.body.url).toBe('string');
  // Pin the origin: the Custom UI can only POST to hosts listed in manifest.yml
  // permissions.external.fetch.client — a different origin here is a silent CSP block in the browser.
  expect(g.body.url.startsWith(E2E.controlUrl)).toBe(true);
  expect(g.body.url).toContain('/upload?');
  expect(g.body.url).toContain('grant=');
  expect(typeof g.body.ttlMs).toBe('number');

  const up = await uploadBundle(g.body.url, sampleFiles());
  expect(up.status).toBe(200);
  expect(up.body.ok).toBe(true);
  expect(up.body.instanceId).toBe(instanceId);
  expect(up.body.entrypoint).toBe('index.html');
  expect(up.body.files).toBe(2);

  // The uploaded bundle is a real published mini-site: serve-url mints a grant and dispatch serves the bytes.
  const serve = await serveUrl(instanceId);
  expect(serve.status).toBe(200);
  expect(serve.body.ok).toBe(true);
  const index = await dispatchGet(serve.body.url);
  expect(index.status).toBe(200);
  expect(index.text).toContain('<h1>e2e</h1>');
});

test('a tampered grant signature is rejected with 401 UNAUTHORIZED', async () => {
  instanceId = freshInstanceId();
  const g = await uploadGrant(instanceId);
  expect(g.body.ok).toBe(true);

  const url = new URL(g.body.url);
  const grant: string = url.searchParams.get('grant')!;
  const dot = grant.indexOf('.');
  const sig = grant.slice(dot + 1);
  // Flip a char in the MIDDLE of the signature segment — the final base64url char of a 32-byte HMAC carries
  // padding bits, so tampering there can decode to identical bytes and still verify.
  const flipped = sig.slice(0, 5) + (sig[5] === 'A' ? 'B' : 'A') + sig.slice(6);
  url.searchParams.set('grant', `${grant.slice(0, dot)}.${flipped}`);

  const up = await uploadBundle(url.toString(), sampleFiles());
  expect(up.status).toBe(401);
  expect(up.body.ok).toBe(false);
  expect(up.body.code).toBe('UNAUTHORIZED');
  expect(up.body.reason).toBe('bad-signature');
});

test('a grant minted for instance A cannot publish to instance B', async () => {
  instanceId = freshInstanceId();
  const g = await uploadGrant(instanceId);
  expect(g.body.ok).toBe(true);

  const url = new URL(g.body.url);
  url.searchParams.set('instanceId', freshInstanceId());

  const up = await uploadBundle(url.toString(), sampleFiles());
  expect(up.status).toBe(401);
  expect(up.body.ok).toBe(false);
  expect(up.body.code).toBe('UNAUTHORIZED');
  expect(up.body.reason).toBe('instance-mismatch');
});
