import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { openMacro, openPublisher, selectFiles, publishAndAwait, gotoPreview } from '../helpers/forge';
import { deleteInstance } from '../helpers/workers';
import { SAMPLE_BUNDLE } from '../helpers/fixtures';

// Full UI journey: create a macro page, select+publish SAMPLE_BUNDLE through the Publisher modal, then open the
// live preview and assert the dispatch frame actually serves the bundle's index.html ("Mini-Site is live").
test('publish a bundle end-to-end and see the mini-site live', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e full flow publish' });
  try {
    const launcher = await openMacro(page, p.url);
    const modal = await openPublisher(page, launcher);
    await selectFiles(page, modal, SAMPLE_BUNDLE);
    expect(await publishAndAwait(modal)).toBe('handoff');
    const site = await gotoPreview(page, modal);
    await expect(site.locator('body')).toContainText('Mini-Site is live', { timeout: 30000 });
  } finally {
    await deletePage(p.pageId);
    await deleteInstance(p.instanceId);
  }
});
