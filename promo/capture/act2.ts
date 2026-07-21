// Act 2 (8.4–20.3s): the real product, on the real dev stack, doing the whole job in one unbroken take —
// PRD page → Edit → /mini → insert the macro → upload the folder → Publish → the site appears.
//
// It runs to the reveal rather than stopping at the click, because the beat sheet's magic shot pulls
// from `a2_live`: the frame where the mini-site actually renders after publishing. Cutting to a
// separately-loaded page there would be a lie, and it is the one shot in the film that has to be true.
//
// Selector notes, all established by rehearsal against the live editor (promo/tmp/rehearse-editor.ts):
//  - the page-level action is labelled "Update", not "Publish" (the page already exists);
//  - the quick-insert menu lists BOTH installed environments and highlights "Mini-Site (Staging)"
//    first, so pressing Enter would silently film the wrong stack — Development is clicked by name;
//  - the editor is a plain `.ProseMirror`, and the PRD template contains exactly one empty paragraph,
//    which is the insertion point.
import { resolve } from 'node:path';
import type { Frame } from '@playwright/test';
import { Capture } from './harness';
import { centreMacro, createPrdPage, deletePage, PRIVACY_CSS, type PrdPage } from './confluence';
import { AUTH_STATE } from '../../tests/e2e/helpers/env';
import { frameWith, selectFolder } from '../../tests/e2e/helpers/forge';

const EV = process.env.PROMO_EVIDENCE_DIR || '.';

export interface Act2Result {
  page: PrdPage;
  instanceLive: boolean;
}

export async function captureAct2(outDir: string, opts: { keepPage?: boolean } = {}): Promise<Act2Result> {
  const prd = await createPrdPage(`New Onboarding Experience`);
  const cap = await Capture.start({ outDir, name: 'act2', storageState: AUTH_STATE });
  const page = cap.page;
  const mask = async () => cap.injectCss(PRIVACY_CSS).catch(() => {});

  try {
    await page.goto(prd.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await mask();
    await page.waitForTimeout(900);

    await cap.clap();

    // ── 8.4s · a real PRD, mid-decision ───────────────────────────────────
    await cap.beat('a2_page_view', 1300);

    // ── 9.4s · a normal Confluence edit ───────────────────────────────────
    // #editPageLink, not a button: the page's Edit affordance is an anchor to /edit-v2. An earlier
    // take used button[aria-label*="Edit"], which matched "Edit space details" in the sidebar and
    // opened the space-icon dialog instead.
    const editBtn = page.locator('#editPageLink').first();
    await cap.clickTarget(editBtn, { markName: 'a2_edit_click' });
    const editor = page.locator('.ProseMirror').first();
    await editor.waitFor({ timeout: 45000 });
    await page.waitForTimeout(1500);
    await mask(); // the editor route re-renders chrome

    // ── 10.35s · /mini, like any other macro ──────────────────────────────
    const paras = page.locator('.ProseMirror > p');
    const count = await paras.count();
    const texts = await Promise.all(Array.from({ length: count }, (_, i) => paras.nth(i).innerText()));
    const slot = texts.findIndex((t) => t.trim() === '');
    if (slot < 0) throw new Error(`no empty paragraph to insert into; paragraphs = ${JSON.stringify(texts.map((t) => t.slice(0, 30)))}`);
    await cap.clickTarget(paras.nth(slot), { duration: 700 });
    await page.waitForTimeout(400);
    await page.keyboard.type('/mini', { delay: 130 });
    await cap.beat('a2_slash_typed', 1400);

    // Click Development by name. Enter would take the highlighted first row, which is Staging.
    const devItem = page.getByText('Mini-Site (Development)', { exact: true }).first();
    await devItem.waitFor({ timeout: 15000 });
    await cap.clickTarget(devItem, { markName: 'a2_macro_picked', duration: 520 });
    await page.waitForTimeout(2500);
    await cap.beat('a2_macro_inserted', 600);

    // ── page-level save. Not anchored by any shot; the edit cuts around it ─
    const updateBtn = page.locator('button:has-text("Update"), button:has-text("Publish")').first();
    await updateBtn.click({ timeout: 20000 });
    await page.waitForURL((u) => !u.pathname.includes('/edit-v2'), { timeout: 60000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await mask();
    await cap.beat('a2_page_updated', 800);

    // ── the macro's own launcher ──────────────────────────────────────────
    await page.mouse.wheel(0, 320); // Forge macros render lazily on scroll
    await page.waitForTimeout(800);
    const launcher = await frameWith(page, '#btn-add, #btn-edit', 60);
    if (!launcher) throw new Error(`launcher frame never appeared. frames=${JSON.stringify(page.frames().map((f) => f.url()).filter(Boolean))}`);
    await cap.beat('a2_launcher_ready', 700);

    const addSel = (await launcher.locator('#btn-add').count()) ? '#btn-add' : '#btn-edit';
    await cap.clickTarget(launcher.locator(addSel), { markName: 'a2_add_click', via: 'dom' });

    // ── 11.6s · the publisher panel ───────────────────────────────────────
    const modal = await frameWith(page, '#file-input');
    if (!modal) throw new Error('publisher modal frame never appeared');
    await page.waitForTimeout(900);
    await cap.beat('a2_publisher_open', 1000);

    // ── 12.45s · a whole folder goes in ───────────────────────────────────
    await cap.moveToTarget(modal.locator('#file-input, label[for="file-input"], #drop-zone').first(), { duration: 760 }).catch(() => {});
    await cap.beat('a2_files_selected', 200);
    await selectFolder(page, modal as Frame, resolve('promo/site'));
    await cap.beat('a2_filelist_shown', 1400);
    await cap.beat('a2_ready_state', 1300);

    // ── 15.6s · the one decisive action ───────────────────────────────────
    const publishBtn = modal.locator('#btn-publish');
    await cap.moveToTarget(publishBtn, { duration: 900 });
    await cap.beat('a2_publish_hover', 700);
    await cap.clickTarget(publishBtn, { markName: 'a2_publish_click', via: 'dom', duration: 180, dwell: 320 });
    await cap.beat('a2_publishing', 0);

    const handoff = modal.locator('#go-preview');
    const notice = modal.locator('#secret-notice');
    const t0 = Date.now();
    let outcome: 'handoff' | 'error' | null = null;
    while (Date.now() - t0 < 60000 && !outcome) {
      if (await handoff.isVisible().catch(() => false)) outcome = 'handoff';
      else if (await notice.isVisible().catch(() => false)) outcome = 'error';
      else await page.waitForTimeout(500);
    }
    if (outcome !== 'handoff') {
      await page.screenshot({ path: `${EV}/act2-publish-failure.png` });
      throw new Error(`publish did not reach the handoff (outcome=${outcome})`);
    }

    // ── close the publisher and let the PAGE render it ────────────────────
    // The modal's own "live preview" pane also renders the site, and an earlier take marked a2_live on
    // it. That would have been a lie: the film claims "right inside Confluence", and a preview panel
    // inside an upload dialog is not the page. Dismiss the dialog, then film the macro rendering inline
    // between the PRD's own headings — which is the actual claim.
    // "See it live" (#go-preview) is what reveals the published state; #btn-done only exists inside
    // that state, so skipping this step leaves Done permanently invisible.
    await cap.clickTarget(handoff, { markName: 'a2_go_live', via: 'dom', duration: 520 });
    const doneBtn = modal.locator('#btn-done');
    await doneBtn.waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(700);
    await cap.clickTarget(doneBtn, { markName: 'a2_done_click', via: 'dom', duration: 620 });
    for (let i = 0; i < 20 && (await frameWith(page, '#file-input', 1)); i++) await page.waitForTimeout(500);

    let live: Frame | null = null;
    for (let i = 0; i < 40 && !live; i++) {
      await page.waitForTimeout(750);
      live = page.frames().find((f) => f.url().includes('conf-mini-sites-dispatch-dev')) || null;
    }
    if (!live) throw new Error('mini-site never rendered inline on the page after publish');
    await live.locator('.card[data-feature-id="a"]').waitFor({ timeout: 30000 });

    // Frame it the way the beat sheet wants: the embed centred, with PRD text still visible above and
    // below, so "Where the work happens" is provable from a single frame. The rect is recorded so the
    // edit's close-ups aim at measured coordinates.
    const box2 = await centreMacro(page);
    await page.waitForTimeout(900);
    cap.mark('a2_embed_box', { box: box2 });
    await cap.beat('a2_live', 4200); // holds the 1.3s magic shot AND the 1.15s push-in

    await cap.finish({ act: 2, pageId: prd.pageId, url: prd.url });
    return { page: prd, instanceLive: true };
  } catch (e) {
    await page.screenshot({ path: `${EV}/act2-failure.png` }).catch(() => {});
    await cap.finish({ act: 2, failed: String(e) }).catch(() => {});
    if (!opts.keepPage) await deletePage(prd.pageId);
    throw e;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  captureAct2(process.argv[2] || 'promo/out/captures', { keepPage: true })
    .then((r) => console.log(JSON.stringify({ ok: true, pageId: r.page.pageId, url: r.page.url })))
    .catch((e) => {
      console.error('act2 capture failed:', e.message);
      process.exit(1);
    });
}
