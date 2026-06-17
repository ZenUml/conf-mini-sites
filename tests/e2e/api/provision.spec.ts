import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, dispatchGet, freshInstanceId, sampleFiles } from '../helpers/workers';

// Full provision → serve → delete via the deployed control + dispatch Workers (shared-secret auth, no browser).
// NOTE: provisioning needs the control Worker's WFP_API_TOKEN to be valid. If publish/serve return
// PROVISION_FAILED / CHECK_FAILED, the dev token has expired (see tests/e2e/README.md) — the happy-path
// assertions below are still the contract; refresh the token and re-run. Each test cleans up its instance.

let instanceId: string;

test.afterEach(async () => {
  // Tear down the per-instance Worker even if the test failed mid-flight (deleteInstance is idempotent).
  if (instanceId) await deleteInstance(instanceId);
});

test('publish provisions a 2-file bundle with the index.html entrypoint', async () => {
  // POST /publish validates + secret-scans + provisions; success echoes entrypoint + file count.
  instanceId = freshInstanceId();
  const r = await publish(instanceId, sampleFiles());
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(true);
  expect(r.body.instanceId).toBe(instanceId);
  expect(r.body.entrypoint).toBe('index.html');
  expect(r.body.files).toBe(2);
});

test('serve-url mints a dispatch URL and the mini-site serves its bytes', async () => {
  // End-to-end: publish, then serve-url returns a grant URL, and the dispatch Worker serves the html + app.js.
  instanceId = freshInstanceId();
  const pub = await publish(instanceId, sampleFiles());
  expect(pub.status).toBe(200);
  expect(pub.body.ok).toBe(true);

  const serve = await serveUrl(instanceId);
  expect(serve.status).toBe(200);
  expect(serve.body.ok).toBe(true);
  expect(typeof serve.body.url).toBe('string');
  expect(serve.body.url).toContain(`/v/${instanceId}/g/`);

  const url: string = serve.body.url;
  const index = await dispatchGet(url);
  expect(index.status).toBe(200);
  expect(index.text).toContain('<h1>e2e</h1>');

  const appjs = await dispatchGet(url + 'app.js');
  expect(appjs.status).toBe(200);
  expect(appjs.contentType).toContain('javascript');
});
