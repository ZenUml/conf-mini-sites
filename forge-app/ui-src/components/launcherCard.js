// Launcher Card — Bold Editorial design system. The inline macro launcher card from the live macro view
// (forge-app/static/view/index.html): the card the reader sees embedded on a Confluence page. Two states:
//   EMPTY     — no bundle published yet: brand logo + "Mini-Site" header, then an editorial body
//               (kicker "MULTI-FILE BUNDLE", Fraunces "Host a mini-site here.", helper text, brand CTA).
//   PUBLISHED — compact browser-chrome header (traffic lights + mono ref + green "live" pip + Edit action)
//               wrapping a preview body slot (the rendered mini-site iframe / preview HTML).
// Pure render functions returning HTML strings (Storybook html-vite renders the string; the app reuses the
// same markup). Markup/classes/SVGs copied verbatim from static/view/index.html (EMPTY ~14-35, PUBLISHED
// ~38-55). See button.js for the template conventions; the published preview is injected via a {bodyHTML} slot.

const ICONS = {
  // Mini-Sites mark: a relative-link / anchor motif (the chain link the product is built on — self-contained
  // bundles, all paths relative) so the identity reads as "linked site", not a default browser-window glyph.
  logo:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10.4 13.6a3.2 3.2 0 0 0 4.5 0l2.4-2.4a3.2 3.2 0 1 0-4.5-4.5l-1 1"/><path d="M13.6 10.4a3.2 3.2 0 0 0-4.5 0l-2.4 2.4a3.2 3.2 0 1 0 4.5 4.5l1-1"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  // lock glyph that fronts the mono ref in the published chrome (green = served over the page's own ACL)
  lock:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#216E4E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  edit:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
};

// The live "pip": a pulsing green dot (.pulse) + a label, the shared liveness cue. Sized for the chrome row.
const livePip =
  `<span class="ml-auto inline-flex items-center gap-1 text-micro text-ok-deep shrink-0">` +
  `<span class="relative inline-grid place-items-center w-1.5 h-1.5"><span class="pulse absolute inset-0 rounded-full"></span><span class="w-1.5 h-1.5 rounded-full bg-ok-base"></span></span> live</span>`;

/** EMPTY launcher card — no bundle yet: brand logo + "Mini-Site" header, then the editorial invite body
 *  (kicker, Fraunces headline, helper copy, brand "Add mini-site" CTA). Self-contained, no params. */
export const launcherEmpty = () =>
  `<div class="bg-surf-card rounded-xl shadow-panel ring-1 ring-black/[0.06] overflow-hidden">` +
  // header — brand logo mark + title + "no bundle yet" subtitle
  `<div class="flex items-center gap-3 px-5 pt-4 pb-3.5 border-b border-surf-line2">` +
    `<span class="grid place-items-center w-8 h-8 rounded-lg bg-brand-blue text-white shrink-0" aria-hidden="true">${ICONS.logo}</span>` +
    `<div class="min-w-0 flex-1">` +
      `<h1 class="text-h2 font-semibold text-ink-800 leading-tight">Mini-Site</h1>` +
      `<p class="text-meta text-ink-500 leading-tight mt-0.5">No bundle published yet</p>` +
    `</div>` +
  `</div>` +
  // body — editorial invite: kicker rule, Fraunces headline, helper copy, brand CTA
  `<div class="px-5 py-6 text-center">` +
    `<p class="kicker-rule text-kick font-semibold uppercase text-brand-blue mb-2 inline-block">Multi-file bundle</p>` +
    `<h2 class="display opsz-small text-[26px] font-semibold text-ink-900 leading-tight">Host a mini-site here.</h2>` +
    `<p class="mt-1.5 text-meta text-ink-500 max-w-[42ch] mx-auto">Upload a folder (index.html + JS/CSS/assets) and it renders live, embedded on this page.</p>` +
    `<button id="btn-add" type="button" class="group mt-4 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-brand-blue hover:bg-brand-hover active:scale-[.99] text-white text-lead font-semibold transition-all shadow-btn">${ICONS.plus}Add mini-site</button>` +
    `<p id="dbg" class="mt-3 text-meta text-stop-deep"></p>` +
  `</div>` +
  `</div>`;

/** PUBLISHED launcher card — compact browser-chrome header (traffic lights + mono ref + green live pip +
 *  Edit action) over a live preview body slot.
 *  @param ref      the mono instance ref shown in the address pill (e.g. "mini-site:rel-dashboard-7f3a").
 *  @param bodyHTML the preview slot — the rendered mini-site (an iframe in the app; any HTML in stories). */
export const launcherPublished = ({ ref = 'mini-site', bodyHTML = '' } = {}) =>
  `<div class="bg-surf-card rounded-xl shadow-panel ring-1 ring-black/[0.06] overflow-hidden">` +
  // compact browser-chrome header — traffic lights, mono address pill, Edit action
  `<div class="flex items-center gap-3 px-4 pt-3 pb-2.5 border-b border-surf-line2">` +
    `<span class="flex items-center gap-1.5 shrink-0" aria-hidden="true">` +
      `<span class="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></span><span class="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></span><span class="w-2.5 h-2.5 rounded-full bg-[#28C840]"></span>` +
    `</span>` +
    `<div class="flex-1 flex items-center gap-2 h-6 px-2.5 rounded-md bg-surf-sunk min-w-0">` +
      `${ICONS.lock}` +
      `<span id="v-ref" class="font-mono text-micro text-ink-600 truncate">${ref}</span>` +
      `${livePip}` +
    `</div>` +
    `<button id="btn-edit" type="button" class="action-2 !h-8 !px-3 shrink-0">${ICONS.edit}Edit</button>` +
  `</div>` +
  // preview body slot — the rendered mini-site
  `${bodyHTML}` +
  `</div>`;
