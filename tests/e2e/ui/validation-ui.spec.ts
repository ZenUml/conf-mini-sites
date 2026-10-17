import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { openMacro, openPublisher } from '../helpers/forge';

test('direct HTML picker accepts an arbitrary filename', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e single HTML file' });
  try {
    const launcher = await openMacro(page, p.url);
    const modal = await openPublisher(page, launcher);
    await modal.locator('#html-file-input').setInputFiles({
      name: 'My prototype.HTML', mimeType: 'text/html', buffer: Buffer.from('<h1>Solo</h1>'),
    });
    await expect(modal.locator('#selected')).toBeVisible({ timeout: 15000 });
    await expect(modal.locator('#sel-count')).toHaveText('1');
    await expect(modal.locator('#picker-error')).toBeHidden();
  } finally {
    await deletePage(p.pageId);
  }
});
