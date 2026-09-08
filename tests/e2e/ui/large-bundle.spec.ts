import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { createMacroPage, deletePage } from '../helpers/confluence';
import { deleteInstance } from '../helpers/workers';
import { openMacro, openPublisher, selectFolder, publishAndAwait, gotoPreview } from '../helpers/forge';
import { makeLargeBundleDir } from '../helpers/fixtures';

// Regression for the nulirum trial (2026-09-03): a 2-file, 7.2 MB folder was accepted at selection but publish
// never reached the control Worker. The Custom UI sends the whole base64 bundle in one invoke('publish'); Forge
// rejects it with 413 from xen_invocation_service and the modal shows only "Stopped — NETWORK". The docs
// (platform/forge/limits-invocation/) quote 500 KB for a front-end invoke request and 5 MB for an invocation;
// measured on lite-dev 2026-09-08 the enforced cap is the 5 MB one: 4.0 MB base64 publishes, 5.6 MB gets 413.
// Every other UI spec publishes < 25 KB, so the cap was never exercised. Default raw size 4200 KB (≈ 5.6 MB
// base64) sits just past the cap; LARGE_BUNDLE_RAW_KB overrides it for bisecting. The spec requires the real
// handoff + render, i.e. it fails until publishing no longer rides a single front-end invoke.
test('publishing a bundle over Forge’s 5 MB invoke cap still reaches the live preview', async ({ page }) => {
  test.setTimeout(180_000); // cold macro render ≈ 30 s + folder push + publish wait
  const t0 = Date.now();
  const mark = (s: string) => console.log('LARGE-BUNDLE %ss %s', ((Date.now() - t0) / 1000).toFixed(1), s);

  const rawKb = Number(process.env.LARGE_BUNDLE_RAW_KB || 4200);
  const dir = makeLargeBundleDir(rawKb * 1024);
  mark(`raw=${rawKb} KB base64≈${Math.round((rawKb * 4) / 3)} KB`);
  const p = await createMacroPage({ title: `e2e large-bundle ${Date.now()}` });
  try {
    const launcher = await openMacro(page, p.url);
    const modal = await openPublisher(page, launcher);
    await selectFolder(page, modal, dir);
    mark('folder selected');

    const outcome = await publishAndAwait(modal, 90_000);
    const narrator = await modal.locator('#narrator').innerText().catch(() => '');
    const upState = await modal.locator('#up-state').innerText().catch(() => '');
    const message = await modal.locator('#secret-msg').innerText().catch(() => '');
    mark(`outcome=${outcome} narrator=${JSON.stringify(narrator)} up-state=${JSON.stringify(upState)} message=${JSON.stringify(message)}`);
    expect(outcome, `publish did not hand off: ${narrator} / ${message}`).toBe('handoff');

    const site = await gotoPreview(page, modal);
    await expect(site.locator('h1')).toHaveText('Large bundle');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    await deletePage(p.pageId);
    await deleteInstance(p.instanceId);
  }
});
