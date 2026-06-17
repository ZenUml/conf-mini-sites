import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { deleteInstance } from '../helpers/workers';
import { openMacro, openPublisher, selectFolder, publishAndAwait, gotoPreview } from '../helpers/forge';
import { NESTED_BUNDLE_DIR } from '../helpers/fixtures';

// Folder upload preserving subdirectories. Uploads samples/release-dashboard (index.html + styles.css + app.js
// + data/metrics.json + assets/logo.svg) as a FOLDER, then proves nesting survived end-to-end: the dashboard's
// app.js fetches data/metrics.json over a relative path and only shows "updated just now" when that nested
// fetch resolves (under the grant <base> + sandbox CSP). A flattened upload would 404 → "sample data".
test('folder upload preserves nested paths + relative fetch resolves', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e nested-upload' });
  try {
    const launcher = await openMacro(page, p.url);
    const modal = await openPublisher(page, launcher);
    await selectFolder(page, modal, NESTED_BUNDLE_DIR);
    expect(await publishAndAwait(modal)).toBe('handoff');

    const site = await gotoPreview(page, modal);
    await expect(site.locator('h1')).toContainText('Release readiness');
    await expect(site.locator('#updated')).toHaveText(/updated just now/); // nested data/metrics.json fetched
    await expect(site.locator('.bar')).not.toHaveCount(0); // chart rendered from the JSON
  } finally {
    await deletePage(p.pageId);
    await deleteInstance(p.instanceId);
  }
});
