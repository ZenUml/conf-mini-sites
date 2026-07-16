import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, sampleFiles, freshInstanceId } from '../helpers/workers';

// Shared-secret auth gate — the control Worker authorizes via the FIT (binding when a bearer is present) or
// x-mini-sites-secret, and the check runs BEFORE instance-id validation / provisioning (gateway/authorize.ts).
// These calls carry no bearer token, so a missing/wrong secret → reason 'no-credentials'/'bad-secret' → 401
// UNAUTHORIZED. No real provisioning happens since auth fails first, so no teardown is needed.

test('publish with an empty secret is rejected 401 UNAUTHORIZED (before any provisioning)', async () => {
  const id = freshInstanceId();
  const r = await publish(id, sampleFiles(), { secret: '' });
  expect(r.status).toBe(401);
  expect(r.body.code).toBe('UNAUTHORIZED');
});

test('serve-url with a wrong secret is rejected 401 UNAUTHORIZED', async () => {
  const id = freshInstanceId();
  const r = await serveUrl(id, undefined, { secret: 'wrong' });
  expect(r.status).toBe(401);
  expect(r.body.code).toBe('UNAUTHORIZED');
});

test('delete instance with an empty secret is rejected 401 UNAUTHORIZED', async () => {
  const id = freshInstanceId();
  const r = await deleteInstance(id, { secret: '' });
  expect(r.status).toBe(401);
  expect(r.body.code).toBe('UNAUTHORIZED');
});
