import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { openMacro } from '../helpers/forge';
import { publish, sampleFiles, deleteInstance } from '../helpers/workers';

// Pre-publish a bundle to the macro's derived instance, then assert the launcher renders its PUBLISHED state
// (#btn-edit + the #v-frame preview iframe) instead of the empty add panel.
test('published macro renders the launcher in the published state', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e launcher published' });
  try {
    // Provision the per-instance Worker the macro will resolve to (publish returns 200 ok on success).
    const pub = await publish(p.instanceId, sampleFiles());
    expect(pub.status).toBe(200);
    expect(pub.body.ok).toBe(true);

    const launcher = await openMacro(page, p.url);
    await expect(launcher.locator('#btn-edit')).toBeVisible({ timeout: 30000 });
    await expect(launcher.locator('#v-frame')).toBeAttached();
  } finally {
    await deleteInstance(p.instanceId);
    await deletePage(p.pageId);
  }
});
