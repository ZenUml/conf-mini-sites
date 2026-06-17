import { test, expect } from '@playwright/test';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { openMacro, openPublisher } from '../helpers/forge';
import { SINGLE_FILE } from '../helpers/fixtures';

// Client-side picker validation: a single-file pick is rejected in the modal before any /publish call, so the
// user sees #picker-error (must mention needing at least two files: index.html + assets) instead of a server
// round-trip. Mirrors the server's BUNDLE_NOT_MULTIFILE rule at the UI layer (publisher.js onFilesPicked).
test('single-file pick surfaces the "at least two files" picker error in the modal', async ({ page }) => {
  const p = await createMacroPage({ title: 'e2e validation-ui single file' });
  try {
    const launcher = await openMacro(page, p.url);
    const modal = await openPublisher(page, launcher);
    // Drop webkitdirectory so setInputFiles accepts a plain file (no native folder picker in headless).
    await modal.locator('#file-input').evaluate((el: HTMLInputElement) => el.removeAttribute('webkitdirectory'));
    await modal.locator('#file-input').setInputFiles(SINGLE_FILE);
    await modal.locator('#file-input').dispatchEvent('change');
    const err = modal.locator('#picker-error');
    await expect(err).toBeVisible({ timeout: 15000 });
    await expect(err).toContainText('at least two files');
    await expect(err).toContainText('index.html');
    await expect(err).toContainText('assets');
  } finally {
    await deletePage(p.pageId);
  }
});
