// Publish a bundle to a Confluence page's Mini-Site macro and capture the live render — for Marketplace listing
// screenshots. Standalone (NOT a test; touches no test asset). Reuses the cached Playwright login session
// (tests/e2e/.auth/state.json) and the same setInputFiles publish flow the e2e helpers use, so it needs no
// secrets and creates no page (so no Confluence REST creds). It reimplements the brittle frame steps inline
// rather than importing the TS helpers so it runs under plain `node`.
//
// Usage (from repo root, after `tests/e2e/.auth/state.json` is fresh and the dev WfP token is valid):
//   node scripts/capture-listing-shot.mjs
// Overridable via env: SHOT_PAGE_URL, SHOT_BUNDLE_DIR, SHOT_OUT_DIR, SHOT_STATE.
// Output: <SHOT_OUT_DIR>/demo-live-1840x900.png and demo-live-fullpage.png (or publish-error.png on failure).
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE_URL = process.env.SHOT_PAGE_URL
  || 'https://lite-dev.atlassian.net/wiki/spaces/SD/pages/33488897/Mini-Site+render+test+2026-06-17T00+03+10';
const STATE = process.env.SHOT_STATE || path.join(REPO, 'tests/e2e/.auth/state.json');
const BUNDLE = process.env.SHOT_BUNDLE_DIR || path.join(REPO, 'docs/listing/demo-bundle');
const OUT = process.env.SHOT_OUT_DIR || '/tmp/mini-sites-shots';
const FILES = ['index.html', 'style.css', 'app.js'].map((f) => path.join(BUNDLE, f));

const log = (...a) => console.log('[capture]', ...a);

async function frameWith(page, selector, tries = 50) {
  for (let i = 0; i < tries; i++) {
    for (const f of page.frames()) { try { if (await f.locator(selector).count()) return f; } catch {} }
    await page.waitForTimeout(1000);
  }
  return null;
}

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 1840, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  log('opening macro page…');
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.mouse.wheel(0, 500).catch(() => {});
  const launcher = await frameWith(page, '#btn-add, #btn-edit', 50);
  if (!launcher) {
    const wall = await page.locator('input[name=username], input[name=password]').count();
    log('NO_LAUNCHER (session likely expired — refresh tests/e2e/.auth/state.json). loginWall=' + wall + ' url=' + page.url());
    await browser.close(); process.exit(2);
  }
  log('launcher found; opening publisher…');
  const btn = (await launcher.locator('#btn-add').count()) ? '#btn-add' : '#btn-edit';
  await launcher.locator(btn).evaluate((el) => el.click());
  const modal = await frameWith(page, '#file-input', 40);
  if (!modal) { log('NO_MODAL'); await browser.close(); process.exit(3); }

  log('selecting bundle files…');
  await modal.locator('#file-input').evaluate((el) => el.removeAttribute('webkitdirectory'));
  let shown = false;
  for (let i = 0; i < 15 && !shown; i++) {
    await modal.locator('#file-input').setInputFiles(FILES);
    await modal.locator('#file-input').dispatchEvent('change');
    await page.waitForTimeout(700);
    shown = await modal.evaluate(() => !document.getElementById('selected').hidden);
  }
  if (!shown) { log('NOT_SELECTED'); await browser.close(); process.exit(4); }

  log('publishing…');
  await modal.locator('#btn-publish').evaluate((el) => el.click());
  let result = null; const t0 = Date.now();
  while (Date.now() - t0 < 70000) {
    if (await modal.locator('#go-preview').isVisible().catch(() => false)) { result = 'handoff'; break; }
    if (await modal.locator('#secret-notice').isVisible().catch(() => false)) { result = 'error'; break; }
    await page.waitForTimeout(1000);
  }
  log('publish result = ' + result);
  if (result !== 'handoff') {
    const notice = await modal.locator('#secret-notice').innerText().catch(() => '');
    log('NOTICE: ' + (notice || '(empty)').replace(/\s+/g, ' ').slice(0, 400));
    await page.screenshot({ path: `${OUT}/publish-error.png` }).catch(() => {});
    await browser.close(); process.exit(5);
  }

  log('reloading to render the published bundle inline…');
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.mouse.wheel(0, 180).catch(() => {});
  let dispatch = null;
  for (let i = 0; i < 30 && !dispatch; i++) {
    await page.waitForTimeout(1500);
    dispatch = page.frames().find((f) => f.url().includes('conf-mini-sites-dispatch')) || null;
  }
  log('dispatch frame = ' + (dispatch ? dispatch.url().slice(0, 90) : 'NONE'));
  await page.waitForTimeout(3000); // let the dashboard settle/animate

  await page.screenshot({ path: `${OUT}/demo-live-1840x900.png` });
  await page.screenshot({ path: `${OUT}/demo-live-fullpage.png`, fullPage: true });
  log('DONE — wrote demo-live-1840x900.png + demo-live-fullpage.png to ' + OUT);
  await browser.close();
};
run().catch((e) => { console.log('[capture] ERR ' + (e && e.stack || e)); process.exit(1); });
