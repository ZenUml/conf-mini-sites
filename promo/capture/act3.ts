// Act 3 (21.45–32.35s): the teammate's experience. A fresh session on the page Act 2 published — nobody
// is uploading anything now, they are just using the thing.
//
// This is a SEPARATE capture from Act 2 on purpose. Act 2 is the author's session and ends the moment the
// site appears; Act 3 loads the same page cold, which is exactly what a colleague following a link gets.
// Every interaction happens inside the macro's cross-origin iframe, which is the point: if the embed
// were a screenshot none of it would respond.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Capture } from './harness';
import { addComment, centreMacro, PRIVACY_CSS } from './confluence';
import { AUTH_STATE } from '../../tests/e2e/helpers/env';
import { frameWith } from '../../tests/e2e/helpers/forge';

const EV = process.env.PROMO_EVIDENCE_DIR || '.';
export const TEAM_COMMENT = 'Option B feels clearer.';

/** Act 2 records which page it published to; Act 3 films that same page rather than making a new one. */
export function pageFromAct2(outDir: string): { pageId: string; url: string } {
  const m = JSON.parse(readFileSync(join(outDir, 'act2.manifest.json'), 'utf8')) as { pageId?: string; url?: string };
  if (!m.pageId || !m.url) throw new Error('act2.manifest.json has no pageId/url — run act2 first');
  return { pageId: m.pageId, url: m.url };
}

export async function captureAct3(outDir: string): Promise<void> {
  const target = pageFromAct2(outDir);

  // Posted before the take so it is a genuine, persisted Confluence comment by the time the camera
  // reaches it — the script explicitly forbids faking realtime collaboration the product doesn't have.
  await addComment(target.pageId, TEAM_COMMENT).catch((e) => console.warn('comment not added:', e.message));

  const cap = await Capture.start({ outDir, name: 'act3', storageState: AUTH_STATE });
  const page = cap.page;
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await cap.injectCss(PRIVACY_CSS).catch(() => {});

    // The mini-site is TWO frames deep: Confluence hosts the Forge Custom UI iframe, and that hosts the
    // dispatch iframe serving the bundle. So there is no top-level `iframe[src*=dispatch]` to select —
    // an earlier take waited 60s for one that cannot exist. Walk the frame tree instead; locators from
    // the resulting Frame still report main-frame coordinates, so the synthetic cursor aims correctly.
    const site = await frameWith(page, '.card[data-feature-id="a"]', 60);
    if (!site) throw new Error(`mini-site frame not found. frames=${JSON.stringify(page.frames().map((f) => f.url()).filter(Boolean))}`);
    const cardA = site.locator('.card[data-feature-id="a"]');
    const cardB = site.locator('.card[data-feature-id="b"]');
    await cardA.waitFor({ state: 'visible', timeout: 45000 });

    const centreEmbed = async () => { await centreMacro(page); await page.waitForTimeout(500); };
    await centreEmbed();
    const box3 = await centreMacro(page); // second pass: the macro reports final height only after layout
    await page.waitForTimeout(600);

    await cap.clap();
    cap.mark('a3_embed_box', { box: box3 });
    await cap.beat('a3_ready', 900);

    // ── 21.45s · it responds, inside Confluence ───────────────────────────
    await cap.clickTarget(cardA.locator('[data-vote-btn]'), { markName: 'a3_vote_click' });
    await site.locator('.card[data-feature-id="a"] [data-vote-count]:text-is("5")').waitFor({ timeout: 8000 });
    await cap.beat('a3_vote_settled', 1300);

    // ── 23.55s · filtering works too ──────────────────────────────────────
    await cap.clickTarget(site.locator('.segmented__btn[data-sort="effort"]'), { markName: 'a3_effort_click' });
    await page.waitForTimeout(420);
    await cap.beat('a3_effort_settled', 900);

    // ── 24.60s · a teammate can explore it themselves ─────────────────────
    await cap.clickTarget(cardB.locator('[data-open-target]'), { markName: 'a3_cardb_click' });
    await site.locator('#detail-panel.is-open').waitFor({ timeout: 8000 });
    await cap.beat('a3_panel_open', 1200);

    // ── 25.60s · pull back: it lives among the requirements ───────────────
    // 'end' parks the embed low in frame so the PRD's headings and body sit above it.
    await centreMacro(page, 'end');
    await cap.beat('a3_pullback', 1300);

    // ── 26.55s · the discussion is already here ───────────────────────────
    const comment = page.getByText(TEAM_COMMENT, { exact: false }).first();
    await comment.waitFor({ timeout: 20000 });
    await comment.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    await cap.moveToTarget(comment, { duration: 800 }).catch(() => {});
    await cap.beat('a3_comment_visible', 1400);

    // ── 27.60s · the comment becomes an action on the prototype ───────────
    await centreEmbed();
    await cap.clickTarget(cardB.locator('[data-open-target]'), { markName: 'a3_optionb_click' });
    await site.locator('#detail-panel.is-open').waitFor({ timeout: 8000 });
    await cap.beat('a3_optionb_settled', 1400);

    // ── 31.05s · the last real interaction ────────────────────────────────
    await cap.clickTarget(site.locator('.segmented__btn[data-sort="impact"]'), { markName: 'a3_final_filter' });
    await page.waitForTimeout(420);
    await cap.beat('a3_final_settled', 2200);

    await cap.finish({ act: 3, pageId: target.pageId, url: target.url, comment: TEAM_COMMENT });
  } catch (e) {
    await page.screenshot({ path: `${EV}/act3-failure.png` }).catch(() => {});
    await cap.finish({ act: 3, failed: String(e) }).catch(() => {});
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  captureAct3(process.argv[2] || 'promo/out/captures')
    .then(() => console.log('act3 captured'))
    .catch((e) => {
      console.error('act3 capture failed:', e.message);
      process.exit(1);
    });
}
