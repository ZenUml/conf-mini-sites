import { test, expect } from '@playwright/test';
import { healthz } from '../helpers/workers';

// Template API spec — no browser, no Atlassian login. Other api/*.spec.ts use the same workers.ts client.
test('control Worker /healthz is ok', async () => {
  const r = await healthz();
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(true);
});
