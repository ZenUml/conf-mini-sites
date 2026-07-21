// Act 1 (0–8s): the prototype running on the developer's own machine, and the moment that stops being
// enough.
//
// Filmed through chrome-shell.html — a browser window drawn in HTML wrapping a real iframe of the real
// server on :3000 — because Playwright records the viewport only and the script opens on an address bar.
//
// Every hold below is deliberate. The edit cuts shots of ~1.1s anchored at these marks with offsets as
// early as -0.6s, so each mark needs roughly 0.8s of footage before it and 1.4s after; the cursor glide
// supplies the "before", the explicit waits supply the "after". Shortening them silently starves the cut.
import { resolve } from 'node:path';
import { Capture } from './harness';
import { startStatic, stopStatic } from './serve';

const SITE_PORT = 3000;
const SHELL_PORT = 3931; // deliberately obscure: 3100 collided with an unrelated dev server

export async function captureAct1(outDir: string): Promise<void> {
  const siteServer = await startStatic(resolve('promo/site'), SITE_PORT);
  const shellServer = await startStatic(resolve('promo/capture'), SHELL_PORT);
  const cap = await Capture.start({ outDir, name: 'act1' });
  try {
    const page = cap.page;
    await page.goto(
      `http://127.0.0.1:${SHELL_PORT}/chrome-shell.html?site=${encodeURIComponent(`http://127.0.0.1:${SITE_PORT}/`)}`,
      { waitUntil: 'load' },
    );

    // Scale the prototype up inside the shell. The site lays out for ~800px of content, which left the
    // bottom quarter of a 1080 frame empty on the film's opening shot — the one that has to earn the
    // next 34 seconds. Zoom (not a viewport change) keeps the layout identical to what Act 3 shows
    // inside Confluence; only the rendered size differs, which is what a real browser zoom does too.
    const siteFrame = page.frames().find((f) => f.url().includes(`:${SITE_PORT}`));
    if (!siteFrame) throw new Error('site frame not found inside the chrome shell');
    await siteFrame.addStyleTag({ content: 'html { zoom: 1.22; }' });
    await page.waitForTimeout(400);

    const site = page.frameLocator('#site');
    const cardA = site.locator('.card[data-feature-id="a"]');
    const cardB = site.locator('.card[data-feature-id="b"]');
    await cardA.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(600); // let the entry render settle before the clap

    await cap.clap();

    // ── the site is simply there, already alive ────────────────────────────
    const voteA = cardA.locator('[data-vote-btn]');
    const countA = cardA.locator('[data-vote-count]');
    const box = await cardA.boundingBox();
    if (!box) throw new Error('card A has no bounding box');
    await cap.place(box.x + 90, box.y + box.height + 46); // parked just below the first card
    await cap.beat('a1_idle', 950);

    // ── it responds to a real click ────────────────────────────────────────
    if ((await countA.innerText()).trim() !== '4') {
      throw new Error(`Act 1 expects Feature A to start at 4 votes, found "${await countA.innerText()}"`);
    }
    await cap.clickTarget(voteA, { markName: 'a1_vote_click' });
    // :text-is is an exact match — hasText would also accept "15" or "5 votes"
    await site.locator('.card[data-feature-id="a"] [data-vote-count]:text-is("5")').waitFor({ timeout: 5000 });
    await cap.beat('a1_vote_settled', 1250);

    // ── it is a real tool, not a one-button demo ───────────────────────────
    await cap.clickTarget(site.locator('.segmented__btn[data-sort="impact"]'), { markName: 'a1_impact_click' });
    await page.waitForTimeout(420); // the reorder transition
    await cap.beat('a1_impact_settled', 900);

    // ── deep enough for a real product review ──────────────────────────────
    await cap.clickTarget(cardB.locator('[data-open-target]'), { markName: 'a1_cardb_click' });
    await site.locator('#detail-panel.is-open').waitFor({ timeout: 5000 });
    await cap.beat('a1_panel_open', 1250);

    // ── and it lives at localhost, where nobody else can reach it ──────────
    await cap.moveToTarget(page.locator('#omnibox'), { duration: 900 });
    await cap.beat('a1_omnibox_focus', 1100);

    // ── the hinge: the cursor stops and nothing else happens ───────────────
    await cap.beat('a1_still', 3000);

    await cap.finish({ act: 1, siteUrl: `http://localhost:${SITE_PORT}/` });
  } finally {
    await stopStatic(siteServer);
    await stopStatic(shellServer);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  captureAct1(process.argv[2] || 'promo/out/captures')
    .then(() => console.log('act1 captured'))
    .catch((e) => {
      console.error('act1 capture failed:', e);
      process.exit(1);
    });
}
