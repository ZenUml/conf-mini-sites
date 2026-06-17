import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, b64, freshInstanceId } from '../helpers/workers';
import type { PublishFile } from '../helpers/workers';

// AKIA + 16 uppercase-alnum chars → secretScan.ts AWS_ACCESS_KEY_ID pattern → kind 'aws-access-key-id'.
const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';

// A structurally VALID multi-file bundle (passes validateBundle: >1 file + root index.html) whose app.js
// embeds a detectable AWS access key id — so the request reaches the secret scanner, not bundle validation.
function bundleWithSecret(): PublishFile[] {
  return [
    { path: 'index.html', b64: b64('<!doctype html><title>t</title><h1>e2e</h1><script src="app.js"></script>') },
    { path: 'app.js', b64: b64(`const awsKey = "${AWS_KEY}";\ndocument.body.dataset.ok = "1";`) },
    { path: 'style.css', b64: b64('body{font-family:sans-serif}') },
  ];
}

// Publishing a valid bundle that contains a secret is rejected with SECRET_DETECTED (422) and nothing is provisioned.
test('publish rejects a bundle containing an AWS access key with SECRET_DETECTED (422), provisioning nothing', async () => {
  const instanceId = freshInstanceId('iesec');
  try {
    const pub = await publish(instanceId, bundleWithSecret());
    expect(pub.status).toBe(422);
    expect(pub.body.ok).toBe(false);
    expect(pub.body.code).toBe('SECRET_DETECTED');

    // No per-instance Worker should exist — serve-url must report NOT_PUBLISHED.
    const serve = await serveUrl(instanceId);
    expect(serve.body.ok).toBe(false);
    expect(serve.body.code).toBe('NOT_PUBLISHED');
  } finally {
    await deleteInstance(instanceId);
  }
});
