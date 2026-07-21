// Standalone Playwright verification for the Feature Prioritisation promo prototype.
//
// Run with the site served locally:
//   cd promo/site && python3 -m http.server 3000 &
//   node verify.mjs
//
// Deviation from the brief: `import { chromium } from 'playwright'` does not resolve in this repo —
// pnpm only hoists direct dependencies, and `playwright` (unlike `@playwright/test`) is not one of
// them (only `@playwright/test` is a devDependency at the repo root). `@playwright/test` re-exports
// the same `chromium` launcher, so that's what this script imports instead.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000/';
const EVIDENCE_DIR = '/Users/pengxiao/.overnight-runs/conf-mini-sites/2026-07-21-2330/evidence';
const DUR_MS = 300; // matches --dur in styles.css; wait a bit longer to be safe against CI jitter
const SETTLE_MS = DUR_MS + 150;

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const shot = (name) => path.join(EVIDENCE_DIR, name);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForSelector('.card', { timeout: 10_000 });
  await page.waitForTimeout(150);

  // --- 1. Initial state ---------------------------------------------------------------------------
  await page.screenshot({ path: shot('site-01-initial.png') });

  const countBefore = await page.locator('[data-feature-id="a"] [data-vote-count]').textContent();
  const barBefore = await page.locator('[data-bar-feature="a"] [data-bar-fill]').boundingBox();
  assert.equal(countBefore.trim(), '4', `expected A's vote count to start at 4, got "${countBefore}"`);

  await page.click('[data-feature-id="a"] [data-vote-btn]');
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: shot('site-02-voted.png') });

  const countAfter = await page.locator('[data-feature-id="a"] [data-vote-count]').textContent();
  const barAfter = await page.locator('[data-bar-feature="a"] [data-bar-fill]').boundingBox();
  assert.equal(countAfter.trim(), '5', `expected A's vote count to be 5 after voting, got "${countAfter}"`);
  assert.ok(
    barAfter.height > barBefore.height,
    `expected A's bar to grow: before height=${barBefore.height}px, after height=${barAfter.height}px`,
  );

  // --- 2. Impact / Effort reorder ------------------------------------------------------------------
  const orderOf = async () =>
    (await page.locator('.card').evaluateAll((els) => els.map((e) => e.dataset.featureId))).join(',');

  const orderDefault = await orderOf();

  await page.click('.segmented__btn[data-sort="impact"]');
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: shot('site-03-impact.png') });
  const orderImpact = await orderOf();

  await page.click('.segmented__btn[data-sort="effort"]');
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: shot('site-04-effort.png') });
  const orderEffort = await orderOf();

  assert.notEqual(orderImpact, orderDefault, `impact order "${orderImpact}" must differ from default "${orderDefault}"`);
  assert.notEqual(orderEffort, orderDefault, `effort order "${orderEffort}" must differ from default "${orderDefault}"`);
  assert.notEqual(orderEffort, orderImpact, `effort order "${orderEffort}" must differ from impact order "${orderImpact}"`);

  // --- 3. Detail panel for B ------------------------------------------------------------------------
  await page.click('[data-feature-id="b"] [data-open-target]');
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: shot('site-05-detail-b.png') });

  const panelAriaHidden = await page.locator('#detail-panel').getAttribute('aria-hidden');
  assert.equal(panelAriaHidden, 'false', 'expected #detail-panel aria-hidden="false" once opened');

  const panelBox = await page.locator('#detail-panel').boundingBox();
  assert.ok(panelBox.width > 0 && panelBox.height > 0, 'expected the detail panel to have a non-zero visible box');
  assert.ok(
    panelBox.x >= 0 && panelBox.x + panelBox.width <= 1440 + 1,
    `expected the detail panel to be on-screen, got x=${panelBox.x} width=${panelBox.width}`,
  );

  // textContent (not innerText) so the check reflects authored copy, not CSS text-transform: uppercase
  // rendering of the Problem/Solution/Expected Impact labels.
  const panelText = await page.locator('#detail-panel').evaluate((el) => el.textContent);
  assert.ok(panelText.includes('Interactive product tour'), 'expected the panel to show B\'s title');
  assert.ok(panelText.includes('Problem'), 'expected the panel to include the word "Problem"');
  assert.ok(panelText.includes('Solution'), 'expected the panel to include the word "Solution"');
  assert.ok(panelText.includes('Impact'), 'expected the panel to include the word "Impact"');

  await page.click('#detail-close');
  await page.waitForTimeout(SETTLE_MS);
  const panelAriaHiddenAfterClose = await page.locator('#detail-panel').getAttribute('aria-hidden');
  assert.equal(panelAriaHiddenAfterClose, 'true', 'expected #detail-panel aria-hidden="true" after closing');

  // --- 4. Narrow viewport (Confluence macro iframe width) -------------------------------------------
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: shot('site-06-narrow.png') });

  const overflowInfo = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    overflowInfo.scrollWidth <= overflowInfo.clientWidth,
    `expected no horizontal overflow at 1000px: scrollWidth=${overflowInfo.scrollWidth} clientWidth=${overflowInfo.clientWidth}`,
  );

  assert.equal(pageErrors.length, 0, `expected zero console/page errors, got: ${JSON.stringify(pageErrors)}`);

  await browser.close();

  console.log('ALL ASSERTIONS PASSED');
  console.log(
    JSON.stringify(
      {
        voteCount: { before: countBefore.trim(), after: countAfter.trim() },
        barHeightPx: { before: barBefore.height, after: barAfter.height },
        cardOrder: { default: orderDefault, impact: orderImpact, effort: orderEffort },
        overflowAt1000: overflowInfo,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err.message);
  process.exit(1);
});
