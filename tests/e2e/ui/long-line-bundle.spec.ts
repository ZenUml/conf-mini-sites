import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { deleteInstance } from '../helpers/workers';
import { openMacro, openPublisher, selectFolder, publishAndAwait, gotoPreview } from '../helpers/forge';
import { makeLongLineBundleDir } from '../helpers/fixtures';

// Browser-level regression for the production incident of 2026-09-08 (v0.4.0). `large-bundle.spec.ts`
// proves the bundle gets past Forge's ~5 MB invoke cap, but its asset is `randomBytes` — NUL and control
// bytes make `isTextLike` classify it binary, so the secret scanner skips the file and `scanLine` never
// runs. A minified JS bundle is the opposite: text with no newline for megabytes. That shape made the
// scanner's base64-run regex exhaust the call stack, the control Worker answered 500 without CORS
// headers, and the Publisher reported it as the old 413. Default size is the reported case (7.2 MB).
test('publishing a bundle whose file is one 7.2 MB text line reaches the live preview', async ({ page }) => {
  test.setTimeout(600_000); // 7.2 MB: the browser base64-encodes it before the POST, which is CPU-bound
  const t0 = Date.now();
  const mark = (s: string) => console.log('LONG-LINE %ss %s', ((Date.now() - t0) / 1000).toFixed(1), s);

  const rawKb = Number(process.env.LONG_LINE_RAW_KB || 7200);
  const dir = makeLongLineBundleDir(rawKb * 1024);
  mark(`raw=${rawKb} KB base64≈${Math.round((rawKb * 4) / 3)} KB, one line`);
  const p = await createMacroPage({ title: `e2e long-line ${Date.now()}` });
  try {
    mark('page created');
    const launcher = await openMacro(page, p.url);
    mark('macro rendered');
    const modal = await openPublisher(page, launcher);
    mark('publisher open');
    await selectFolder(page, modal, dir);
    mark('folder selected');

    const outcome = await publishAndAwait(modal, 120_000);
    const narrator = await modal.locator('#narrator').innerText().catch(() => '');
    const message = await modal.locator('#secret-msg').innerText().catch(() => '');
    mark(`outcome=${outcome} narrator=${JSON.stringify(narrator)} message=${JSON.stringify(message)}`);
    expect(outcome, `publish did not hand off: ${narrator} / ${message}`).toBe('handoff');

    const site = await gotoPreview(page, modal);
    await expect(site.locator('h1')).toHaveText('Long line');
    mark('preview rendered');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await deletePage(p.pageId);
    await deleteInstance(p.instanceId);
  }
});
