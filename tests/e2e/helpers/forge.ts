// Playwright drivers for the Forge macro UI (cross-origin Custom UI iframes). The macro + modal render in
// nested Forge iframes, so we locate frames by a selector and use setInputFiles (no native picker). These
// encapsulate the brittle bits (frame discovery, the setInputFiles→change race, evaluate-clicks).
import type { Page, Frame } from '@playwright/test';

/** Find the first frame that contains `selector`, polling while the Custom UI iframe loads. */
export async function frameWith(page: Page, selector: string, tries = 20): Promise<Frame | null> {
  for (let i = 0; i < tries; i++) {
    for (const f of page.frames()) {
      try { if (await f.locator(selector).count()) return f; } catch { /* detached frame */ }
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

/** Open the page and return the launcher frame (the inline macro Custom UI) once it has rendered. Cold Forge
 *  macro renders (esp. a freshly-created page, headless) can take a while, so poll generously + nudge the lazy
 *  macro into view. */
export async function openMacro(page: Page, pageUrl: string): Promise<Frame> {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.mouse.wheel(0, 500).catch(() => {}); // some Forge macros render lazily on scroll
  // launcher shows either #btn-add (empty) or #btn-edit (published)
  const f = await frameWith(page, '#btn-add, #btn-edit', 50);
  if (!f) {
    const loginWall = await page.locator('input[name=username], input[name=password]').count();
    const frames = page.frames().map((fr) => fr.url()).filter((u) => u && u !== 'about:blank');
    throw new Error(`launcher frame not found. url=${page.url()} loginWall=${loginWall} frames=${JSON.stringify(frames)}`);
  }
  return f;
}

/** Click the launcher's Add/Edit button → open the Publisher modal; return the modal frame (#file-input). */
export async function openPublisher(page: Page, launcher: Frame): Promise<Frame> {
  const btn = (await launcher.locator('#btn-add').count()) ? '#btn-add' : '#btn-edit';
  await launcher.locator(btn).evaluate((el: HTMLElement) => el.click());
  const modal = await frameWith(page, '#file-input');
  if (!modal) throw new Error('publisher modal frame not found');
  return modal;
}

/** Set bundle files on the modal's input (bypassing the native picker) and wait until the "selected" state
 *  appears — retrying to absorb the race between setInputFiles and the modal JS attaching its change listener. */
export async function selectFiles(page: Page, modal: Frame, filePaths: string[]): Promise<void> {
  await modal.locator('#file-input').evaluate((el: HTMLInputElement) => el.removeAttribute('webkitdirectory'));
  let shown = false;
  for (let i = 0; i < 15 && !shown; i++) {
    await modal.locator('#file-input').setInputFiles(filePaths);
    await modal.locator('#file-input').dispatchEvent('change');
    await page.waitForTimeout(700);
    shown = await modal.evaluate(() => !document.getElementById('selected')!.hidden);
  }
  if (!shown) throw new Error('publisher did not reach the "selected" state after setInputFiles');
}

/** Folder upload that PRESERVES nesting (data/x.json, assets/y.svg). Unlike selectFiles, this keeps the
 *  webkitdirectory attribute and passes the DIRECTORY, so Playwright sets webkitRelativePath the same way the
 *  real folder picker does. Use for nested bundles. Retries to absorb the modal-JS load race. */
export async function selectFolder(page: Page, modal: Frame, dir: string): Promise<void> {
  let shown = false;
  for (let i = 0; i < 15 && !shown; i++) {
    await modal.locator('#file-input').setInputFiles(dir);
    await modal.locator('#file-input').dispatchEvent('change');
    await page.waitForTimeout(700);
    shown = await modal.evaluate(() => !document.getElementById('selected')!.hidden);
  }
  if (!shown) throw new Error('publisher did not reach the "selected" state after folder upload');
}

/** Click "Validate & publish" and wait for the "See it live" handoff (or the secret/error notice). */
export async function publishAndAwait(modal: Frame, timeout = 45000): Promise<'handoff' | 'error'> {
  await modal.locator('#btn-publish').evaluate((el: HTMLElement) => el.click());
  const handoff = modal.locator('#go-preview');
  const notice = modal.locator('#secret-notice');
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await handoff.isVisible().catch(() => false)) return 'handoff';
    if (await notice.isVisible().catch(() => false)) return 'error';
    await modal.page().waitForTimeout(1000);
  }
  throw new Error('publish did not resolve to handoff or error');
}

/** Click "See it live" → return the nested dispatch (mini-site) frame once it loads. */
export async function gotoPreview(page: Page, modal: Frame): Promise<Frame> {
  await modal.locator('#go-preview').evaluate((el: HTMLElement) => el.click());
  let frame: Frame | null = null;
  for (let i = 0; i < 20 && !frame; i++) {
    await page.waitForTimeout(1500);
    frame = page.frames().find((f) => f.url().includes('conf-mini-sites-dispatch-dev')) || null;
  }
  if (!frame) throw new Error('mini-site dispatch frame did not load');
  return frame;
}
