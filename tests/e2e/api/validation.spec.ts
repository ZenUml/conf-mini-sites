import { test, expect } from '@playwright/test';
import { publish, deleteInstance, b64, freshInstanceId, sampleFiles } from '../helpers/workers';

// Bundle validation codes from src/pipeline/bundleValidation.ts, surfaced by POST /publish (src/worker/index.ts).
// These three exercise the load-bearing rule order: multi-file → root index.html → valid. The first two reject
// before provisioning (no instance created); only the valid case provisions, so only it needs deleteInstance.

test('single-file bundle is rejected as BUNDLE_NOT_MULTIFILE (422)', async () => {
  // files.length <= 1 → validateBundle fails the multi-file rule before any provisioning.
  const r = await publish(freshInstanceId(), [{ path: 'index.html', b64: b64('x') }]);
  expect(r.status).toBe(422);
  expect(r.body.code).toBe('BUNDLE_NOT_MULTIFILE');
});

test('two-file bundle with no root index.html is rejected as MISSING_INDEX_HTML (422)', async () => {
  // Multi-file passes, but no file path === "index.html" → the missing-entrypoint rule fires.
  const r = await publish(freshInstanceId(), [
    { path: 'page.html', b64: b64('<h1>no root index</h1>') },
    { path: 'app.js', b64: b64('void 0') },
  ]);
  expect(r.status).toBe(422);
  expect(r.body.code).toBe('MISSING_INDEX_HTML');
});

test('valid multi-file bundle publishes ok (200)', async () => {
  // A clean index.html + app.js bundle passes validation + secret-scan and provisions the per-instance Worker.
  const instanceId = freshInstanceId();
  try {
    const r = await publish(instanceId, sampleFiles());
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.entrypoint).toBe('index.html');
    expect(r.body.files).toBe(2);
  } finally {
    await deleteInstance(instanceId);
  }
});
