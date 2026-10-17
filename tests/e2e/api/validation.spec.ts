import { test, expect } from '@playwright/test';
import { publish, deleteInstance, b64, freshInstanceId, sampleFiles, serveUrl, dispatchGet } from '../helpers/workers';

// Bundle validation codes from src/pipeline/bundleValidation.ts, surfaced by POST /publish (src/worker/index.ts).
// Covers both self-contained HTML and folder bundles, with explicit or inferred root entrypoints.
test('single arbitrary HTML filename publishes with an index.html alias (200)', async () => {
  const instanceId = freshInstanceId();
  try {
    const r = await publish(instanceId, [{ path: 'dashboard.html', b64: b64('<h1>Solo</h1>') }]);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.entrypoint).toBe('index.html');
    expect(r.body.files).toBe(1);
    const grant = await serveUrl(instanceId);
    expect(grant.status).toBe(200);
    const base = grant.body.url.replace(/index\.html$/, '');
    const alias = await dispatchGet(base + 'index.html');
    const original = await dispatchGet(base + 'dashboard.html');
    expect(alias.status).toBe(200);
    expect(original.status).toBe(200);
    expect(alias.contentType).toBe(original.contentType);
    expect(alias.text).toBe(original.text);

  } finally {
    await deleteInstance(instanceId);
  }
});

test('ambiguous HTML bundle with no root index.html is rejected as MISSING_INDEX_HTML (422)', async () => {
  // Without explicit index.html, two root HTML candidates are ambiguous.
  const r = await publish(freshInstanceId(), [
    { path: 'page.html', b64: b64('<h1>no root index</h1>') },
    { path: 'second.html', b64: b64('<h1>ambiguous</h1>') },
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
