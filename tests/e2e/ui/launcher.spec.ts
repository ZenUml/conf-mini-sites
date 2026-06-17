import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { openMacro } from '../helpers/forge';

// Template UI spec — creates a real page with the macro, drives the Custom UI iframe. Other ui/*.spec.ts reuse
// helpers/forge.ts (openMacro/openPublisher/selectFiles/publishAndAwait/gotoPreview).
test('fresh macro renders the empty launcher', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e launcher empty' });
  try {
    const launcher = await openMacro(page, p.url);
    await expect(launcher.locator('#btn-add')).toBeVisible({ timeout: 30000 });
    await expect(launcher.locator('text=Host a mini-site here.')).toBeVisible();
  } finally {
    await deletePage(p.pageId);
  }
});
