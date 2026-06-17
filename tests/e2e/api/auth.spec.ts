import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, sampleFiles, freshInstanceId } from '../helpers/workers';

// Shared-secret auth gate — the control Worker authorizes via x-mini-sites-secret (or a Forge token), and the
// check runs BEFORE instance-id validation / provisioning (src/worker/index.ts authorize()). With no matching
// secret and no Forge token, authorize() falls through to verifyForgeToken(null) → reason 'no-token' → 401
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
