import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, freshInstanceId, sampleFiles } from '../helpers/workers';

// API spec — no browser, no Atlassian login. Drives the control Worker directly via workers.ts (shared-secret
// auth), exactly as the Forge resolver does. Other api/*.spec.ts use the same client.

test('publish provisions, then orphan-delete revokes via the control plane', async () => {
  // Intent: provision a fresh instance (publish ok → serve-url ok), then orphan-delete it and prove revocation
  // is observable through the CONTROL plane (serve-url → NOT_PUBLISHED), which is authoritative.
  const id = freshInstanceId();
  let provisioned = false;
  try {
    // Publish a fresh instance → control plane provisions the per-instance Worker.
    const pub = await publish(id, sampleFiles());
    expect(pub.status).toBe(200);
    expect(pub.body.ok).toBe(true);
    expect(pub.body.instanceId).toBe(id);
    provisioned = true;

    // serve-url succeeds while the instance is live (worker exists → grant minted).
    const live = await serveUrl(id);
    expect(live.status).toBe(200);
    expect(live.body.ok).toBe(true);
    expect(typeof live.body.url).toBe('string');

    // Orphan-delete the instance (macro/page gone) → control plane tears down the per-instance Worker.
    const del = await deleteInstance(id);
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);
    expect(del.body.deleted).toBe(true);
    provisioned = false;

    // Revocation is authoritative at the CONTROL plane: serve-url now returns NOT_PUBLISHED (no worker to grant
    // for). IMPORTANT: do NOT assert the dispatch EDGE stops serving immediately — WfP script deletion is
    // eventually-consistent at the dispatch edge (the namespace script cache served a deleted worker for >2min;
    // see CONTEXT.md "Live findings"). serve-url NOT_PUBLISHED is the authoritative revocation signal.
    const gone = await serveUrl(id);
    expect(gone.status).toBe(200);
    expect(gone.body.ok).toBe(false);
    expect(gone.body.code).toBe('NOT_PUBLISHED');
  } finally {
    // Idempotent cleanup — also covers the path where an assertion failed before the in-test delete ran.
    if (provisioned) await deleteInstance(id);
  }
});
