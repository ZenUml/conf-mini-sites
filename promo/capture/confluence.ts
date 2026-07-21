// Builds the Confluence page the film is shot on.
//
// Unlike tests/e2e/helpers/confluence.ts (which plants the macro via REST because the specs only care
// about the macro's behaviour), this creates a page with NO macro on it. The whole point of Act 2 is to
// film a person inserting it, so the insertion has to happen in the editor, on camera.
//
// The page is a plausible PRD rather than a test fixture: the "Where the work happens" shot only proves
// anything if there is real surrounding context — requirements above the embed, decisions below it.
import { E2E } from '../../tests/e2e/helpers/env';

function auth(): string {
  return 'Basic ' + Buffer.from(`${E2E.forgeEmail}:${E2E.forgeApiToken}`).toString('base64');
}

const h = (level: number, text: string) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});
const p = (text?: string) => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });
const bullets = (items: string[]) => ({
  type: 'bulletList',
  content: items.map((t) => ({ type: 'listItem', content: [p(t)] })),
});

/**
 * The empty paragraph under "Candidate features" is the insertion point — it is deliberately the ONLY
 * empty paragraph in the document so the capture can find it unambiguously.
 */
export const PRD_ADF = {
  type: 'doc',
  version: 1,
  content: [
    h(2, 'Context'),
    p('Activation has been flat for two quarters. Roughly a third of new workspaces never complete setup, and most of those never return after the first session.'),
    h(2, 'Problem'),
    bullets([
      'New users land in an empty workspace with no indication of what to do first.',
      'Our documentation describes the product; it does not get anyone through it.',
      'We have three competing proposals and no shared way to compare them.',
    ]),
    h(2, 'Candidate features'),
    p(), // ← the mini-site goes here, inserted on camera
    h(2, 'Decision'),
    p('We will ship one of the three below for the next release. Vote in the prototype above, then we will confirm at Thursday review.'),
    h(2, 'Open questions'),
    bullets([
      'Does the guided checklist need to survive a page refresh in v1?',
      'Who owns the copy for the tour steps?',
    ]),
  ],
};

export interface PrdPage {
  pageId: string;
  url: string;
  editUrl: string;
  title: string;
}

/** Confluence enforces unique titles per space, so a re-shoot would 400 on the previous take's page. */
export async function deletePagesTitled(title: string): Promise<number> {
  const res = await fetch(
    `${E2E.baseUrl()}/wiki/api/v2/spaces/${E2E.spaceId}/pages?title=${encodeURIComponent(title)}&limit=25`,
    { headers: { authorization: auth() } },
  );
  if (!res.ok) return 0;
  const { results = [] } = (await res.json()) as { results?: Array<{ id: string }> };
  for (const r of results) await deletePage(r.id);
  return results.length;
}

export async function createPrdPage(title = 'New Onboarding Experience'): Promise<PrdPage> {
  await deletePagesTitled(title);
  const res = await fetch(`${E2E.baseUrl()}/wiki/api/v2/pages`, {
    method: 'POST',
    headers: { authorization: auth(), 'content-type': 'application/json' },
    body: JSON.stringify({
      spaceId: E2E.spaceId,
      status: 'current',
      title,
      body: { representation: 'atlas_doc_format', value: JSON.stringify(PRD_ADF) },
    }),
  });
  if (!res.ok) throw new Error(`createPrdPage failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { id: string };
  const base = `${E2E.baseUrl()}/wiki/spaces/${E2E.spaceKey}/pages/${data.id}`;
  return { pageId: data.id, url: base, editUrl: `${base}/edit-v2`, title };
}

export async function deletePage(pageId: string): Promise<void> {
  await fetch(`${E2E.baseUrl()}/wiki/api/v2/pages/${pageId}`, {
    method: 'DELETE',
    headers: { authorization: auth() },
  }).catch(() => {});
}

/** Adds the teammate's comment the film shows at 26.5s. A real Confluence footer comment, not an overlay. */
export async function addComment(pageId: string, text: string): Promise<void> {
  const res = await fetch(`${E2E.baseUrl()}/wiki/api/v2/footer-comments`, {
    method: 'POST',
    headers: { authorization: auth(), 'content-type': 'application/json' },
    body: JSON.stringify({
      pageId,
      body: { representation: 'atlas_doc_format', value: JSON.stringify({ type: 'doc', version: 1, content: [p(text)] }) },
    }),
  });
  if (!res.ok) throw new Error(`addComment failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

/**
 * Privacy mask for anything filmed on the dev tenant. The promo script forbids showing tenant
 * identifiers, avatars, or email addresses; this is applied to every Confluence capture rather than
 * being remembered per-shot.
 */
export const PRIVACY_CSS = `
  /* Selectors below are not guesses — each was read off the live page by promo/tmp/probe-selectors.ts.
     An earlier set was invented and matched nothing, so a whole take filmed the tenant's page tree.
     Note the sidebar is nav#side-navigation — an id, not a data-testid. */

  /* The space sidebar lists every page in the tenant: on the dev site that is a wall of internal
     titles ("Smoke Test ...", "Throwaway - coles repro ..."). The script forbids showing internal
     content, and dropping the column also gives the embed a much wider, cleaner frame. */
  nav#side-navigation, [data-layout-slot][aria-label="Sidebar"] { display: none !important; }

  /* Identities. The account trigger's aria-label is literally the tenant user's email address, and the
     byline carries a real person's name. */
  [data-testid="confluence-account-menu--trigger"],
  [data-testid="team-presence-avatar-0--inner"],
  [data-testid="owner-with-contributors-dropdown-trigger"] { visibility: hidden !important; }
  img[alt*="@"], img[data-testid*="avatar"], [data-testid*="avatar"] img { filter: blur(10px) !important; }

  /* Another vendor's app badge and Atlassian's own AI upsell: neither belongs in this product's film. */
  [data-testid="byline-forge-app-button"] { display: none !important; }
  [data-testid="rovo-non-mau-chat-cta-link"], [data-testid="post-office-ad-controls-dropdown--trigger"] { display: none !important; }
`;

/**
 * Scroll so the macro's iframe sits dead centre, and return its rect.
 *
 * Framing used to be left to `scrollIntoView` on `iframe[src*="dispatch"]`, which matches nothing:
 * the dispatch iframe is nested INSIDE the Forge Custom UI iframe, so the call silently did nothing and
 * the embed was filmed wherever the page happened to be — low, half out of frame, on the single most
 * important shot in the film. The macro is instead identified as the largest iframe in the top
 * document, and the returned rect is recorded into the action log so the edit can aim its close-ups at
 * measured coordinates instead of guessed ones.
 */
export async function centreMacro(
  page: import('@playwright/test').Page,
  block: 'center' | 'end' | 'start' = 'center',
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  // Find the macro (largest iframe in the top document) and scroll it via the ELEMENT, not the window.
  // Confluence scrolls its content inside a container, so window.scrollBy/scrollTo are no-ops here: an
  // earlier take "centred" the embed at y=819 of a 1080 frame and clicked a Vote button at y=1103 —
  // below the fold, with the drawn cursor off-screen. Element.scrollIntoView walks whatever ancestor
  // actually scrolls, which is the only thing that works on this page.
  const idx = await page.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('iframe'));
    let bestIdx = -1;
    let bestArea = 40000;
    frames.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) { bestArea = area; bestIdx = i; }
    });
    return bestIdx;
  });
  if (idx < 0) return null;

  const macro = page.locator('iframe').nth(idx);
  for (let pass = 0; pass < 2; pass++) {
    // two passes: the macro reports its final height only after its own content has laid out
    await macro.evaluate((el, b) => el.scrollIntoView({ block: b as ScrollLogicalPosition, behavior: 'instant' as ScrollBehavior }), block);
    await page.waitForTimeout(550);
  }
  const box = await macro.boundingBox();
  return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
}
