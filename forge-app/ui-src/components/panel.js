// Panel — Bold Editorial design system. The Confluence macro panel shell: corner registration marks +
// rounded card (shadow-panel + hairline ring) wrapping a header (8x8 brand-blue logo with the relative-link
// anchor mark, h1 title, meta subtitle, close X) and a footer ("Mini-Sites Publisher" + validated shield).
// Pure render functions returning HTML strings (Storybook html-vite renders the string; the app reuses the
// same markup). Markup/classes/SVGs copied verbatim from design/upload-ui/final.html (header ~232-266, footer
// ~529-536). See button.js for the template conventions. Body content is injected via a {bodyHTML} slot.

const ICONS = {
  // Mini-Sites mark: a relative-link / anchor motif (the chain link the product is built on — self-contained
  // bundles, all paths relative) so the identity reads as "linked site", not a default browser-window glyph.
  logo:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10.4 13.6a3.2 3.2 0 0 0 4.5 0l2.4-2.4a3.2 3.2 0 1 0-4.5-4.5l-1 1"/>' +
    '<path d="M13.6 10.4a3.2 3.2 0 0 0-4.5 0l-2.4 2.4a3.2 3.2 0 1 0 4.5 4.5l1-1"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
};

/** Panel header — brand logo mark, title (h1), meta subtitle (verb + mono filename), and a close X button. */
export const header = ({ title = 'Add mini-site', subtitle = 'Upload a multi-file bundle' } = {}) =>
  `<header class="flex items-center gap-3 px-5 sm:px-7 pt-4 pb-3.5 border-b border-surf-line2">` +
  `<span class="grid place-items-center w-8 h-8 rounded-lg bg-brand-blue text-white shrink-0" aria-hidden="true">${ICONS.logo}</span>` +
  `<div class="min-w-0 flex-1">` +
  `<h1 class="text-h2 font-semibold text-ink-800 leading-tight">${title}</h1>` +
  `<p class="text-meta text-ink-500 leading-tight mt-0.5 flex items-center gap-1.5 min-w-0">${subtitle}</p>` +
  `</div>` +
  `<button type="button" aria-label="Close and return to editor" class="grid place-items-center w-8 h-8 rounded-lg text-ink-500 hover:bg-surf-sunk hover:text-ink-800 transition-colors shrink-0">${ICONS.close}</button>` +
  `</header>`;

/** Panel footer — "Mini-Sites Publisher" left, validated/secret-scanned shield right. */
export const footer = () =>
  `<footer class="flex items-center justify-between gap-3 px-5 sm:px-7 py-2.5 border-t border-surf-line2 bg-surf-page/60">` +
  `<span class="text-micro font-semibold uppercase text-ink-500 tracking-[0.07em]">Mini-Sites Publisher</span>` +
  `<span class="text-meta text-ink-500 flex items-center gap-1.5">${ICONS.shield}Validated &amp; secret-scanned</span>` +
  `</footer>`;

/** The full macro panel shell: corner registration marks + card wrapping header + body slot + footer. */
export const panel = ({ title = 'Add mini-site', subtitle = 'Upload a multi-file bundle', bodyHTML = '' } = {}) =>
  `<main class="relative w-full max-w-[720px]" aria-label="${title}">` +
  `<span class="reg-mark reg-tl" aria-hidden="true"></span>` +
  `<span class="reg-mark reg-tr" aria-hidden="true"></span>` +
  `<span class="reg-mark reg-bl" aria-hidden="true"></span>` +
  `<span class="reg-mark reg-br" aria-hidden="true"></span>` +
  `<div class="bg-surf-card rounded-xl shadow-panel ring-1 ring-black/[0.06] overflow-hidden">` +
  `${header({ title, subtitle })}` +
  `${bodyHTML}` +
  `${footer()}` +
  `</div>` +
  `</main>`;
