// PreviewChrome — Bold Editorial design system. The "wow" live-preview frame: a browser-chrome bar
// (traffic-light dots + a url bar with lock glyph, mono url text, and a green "live" pip + a reload
// button) wrapping a body slot. The real body is a cross-origin iframe in the app; the {bodyHTML} slot
// lets stories pass a placeholder. Pure render functions returning HTML strings (Storybook html-vite
// renders the string; the app reuses the same markup). Markup/classes/SVGs copied verbatim from
// design/upload-ui/final.html (preview pane + chrome bar ~402-422). See button.js for the conventions.

const ICONS = {
  lock:
    '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#216E4E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  reload:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
};

/** The browser-chrome bar — traffic-light dots, a url bar (lock + mono url + green "live" pip), reload. */
export const chromeBar = ({ url = 'mini-site:rel-dashboard-7f3a · live preview' } = {}) =>
  `<div id="chrome-bar" class="chrome-sweep flex items-center gap-2.5 px-3.5 h-10 bg-surf-sunk border-b border-surf-line2">` +
  `<span class="flex items-center gap-1.5" aria-hidden="true">` +
  `<span class="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></span>` +
  `<span class="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></span>` +
  `<span class="w-2.5 h-2.5 rounded-full bg-[#28C840]"></span>` +
  `</span>` +
  `<div class="flex-1 flex items-center gap-2 h-6 px-2.5 rounded-md bg-white border border-surf-line2 min-w-0">` +
  `${ICONS.lock}` +
  `<span class="font-mono text-micro text-ink-600 truncate">${url}</span>` +
  `<span class="ml-auto inline-flex items-center gap-1 text-micro text-ok-deep shrink-0">` +
  `<span class="relative inline-grid place-items-center w-1.5 h-1.5">` +
  `<span class="pulse absolute inset-0 rounded-full"></span><span class="w-1.5 h-1.5 rounded-full bg-ok-base"></span>` +
  `</span> live` +
  `</span>` +
  `</div>` +
  `<button type="button" aria-label="Reload preview" class="grid place-items-center w-6 h-6 rounded text-ink-500 hover:text-ink-800 hover:bg-white transition-colors">${ICONS.reload}</button>` +
  `</div>`;

/** The full live-preview pane: rounded card with the chrome bar above the body slot (a cross-origin iframe in the app). */
export const previewChrome = ({ url = 'mini-site:rel-dashboard-7f3a · live preview', bodyHTML = '' } = {}) =>
  `<div id="preview-pane" class="mt-5 rounded-xl overflow-hidden border border-surf-line bg-white">` +
  `${chromeBar({ url })}` +
  `${bodyHTML}` +
  `</div>`;
