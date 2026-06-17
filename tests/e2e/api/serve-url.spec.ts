import { test, expect } from '@playwright/test';
import { serveUrl, publish, deleteInstance, freshInstanceId, sampleFiles } from '../helpers/workers';

// API spec — exercises POST /serve-url on the control Worker (no browser). Codes asserted against
// src/worker/index.ts: NOT_PUBLISHED (200, no script provisioned), BAD_INSTANCE_ID (400, fails
// INSTANCE_ID_RE), and ok:true + url after a real publish provisions ms-<instanceId>.

test('serve-url for an unpublished instance returns ok:false + NOT_PUBLISHED', async () => {
  // A fresh, never-published instance has no per-instance Worker → workerExists()=false → NOT_PUBLISHED (200).
  const r = await serveUrl(freshInstanceId());
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(false);
  expect(r.body.code).toBe('NOT_PUBLISHED');
});

test('serve-url for an invalid instanceId returns 400 + BAD_INSTANCE_ID', async () => {
  // "BAD ID!" violates INSTANCE_ID_RE (space + "!") → rejected before any provider call (400).
  const r = await serveUrl('BAD ID!');
  expect(r.status).toBe(400);
  expect(r.body.ok).toBe(false);
  expect(r.body.code).toBe('BAD_INSTANCE_ID');
});

test('serve-url after publish returns ok + dispatch url', async () => {
  // Publish a fresh instance, then serve-url must mint a grant and return a dispatch URL; tear down after.
  const instanceId = freshInstanceId();
  try {
    const pub = await publish(instanceId, sampleFiles());
    expect(pub.status).toBe(200);
    expect(pub.body.ok).toBe(true);

    const r = await serveUrl(instanceId);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.instanceId).toBe(instanceId);
    expect(typeof r.body.url).toBe('string');
    expect(r.body.url).toContain(`/v/${instanceId}/g/`);
  } finally {
    await deleteInstance(instanceId);
  }
});
