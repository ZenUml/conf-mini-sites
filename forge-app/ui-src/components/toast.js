// Toast — Bold Editorial design system. Pure render function returning an HTML string (Storybook html-vite
// renders the string; the app reuses the same markup). Faithful to design/upload-ui/final.html (lines ~540-546):
// the ink-900 pill with a green check glyph + message. The live app toggles opacity/translate on #toast to
// show/hide; here we render the resting pill (no fixed positioning) so it's visible in the Storybook canvas.
const CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7EE2B8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>';

/** Confirmation toast — the design's ink-900 pill (e.g. "Copied", "Link copied"). */
export const toast = ({ message = 'Copied' } = {}) =>
  `<div role="status" aria-live="polite">` +
  `<div class="flex items-center gap-2 px-3.5 py-2 rounded-md bg-ink-900 text-white text-meta font-medium shadow-raise">` +
  `${CHECK}<span>${message}</span></div></div>`;
