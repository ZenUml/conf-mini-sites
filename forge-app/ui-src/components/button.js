// Buttons — Bold Editorial design system. Pure render functions returning HTML strings (Storybook html-vite
// renders the string; the app reuses the same markup). TEMPLATE for the other component files: one file per
// component under ui-src/components/, faithful to design/upload-ui/final.html + the Tailwind tokens, with a
// paired <name>.stories.js. Keep markup class-based (Forge CSP blocks parsed inline styles — use CSSOM/classes).
const ICONS = {
  arrow: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
};

/** Primary brand CTA — the design's full-width/inline blue action (e.g. "Validate & publish", "Done"). */
export const primaryButton = ({ label = 'Continue', icon = 'arrow', full = false } = {}) =>
  `<button type="button" class="group ${full ? 'w-full' : ''} h-11 px-5 rounded-lg bg-brand-blue hover:bg-brand-hover active:scale-[.99] text-white text-lead font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-btn">` +
  `${icon === 'check' ? ICONS.check : icon === 'plus' ? ICONS.plus : ''}${label}` +
  `${icon === 'arrow' ? `<span class="transition-transform group-hover:translate-x-0.5">${ICONS.arrow}</span>` : ''}</button>`;

/** Secondary action — the design's `.action-2` (e.g. "Open fullscreen", "Replace bundle", "Copy link"). */
export const secondaryButton = ({ label = 'Action' } = {}) =>
  `<button type="button" class="action-2">${label}</button>`;
