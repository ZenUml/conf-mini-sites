// Segmented switcher — Bold Editorial design system. Pure render function returning an HTML string (Storybook
// html-vite renders the string; the app reuses the same markup). The Upload|Preview tablist with the sliding
// white `.seg-thumb`: `data-on="1"` parks the thumb left (Upload), `data-on="2"` slides it right (Preview) — the
// `.seg[data-on="2"] .seg-thumb` rule in the compiled CSS drives the translate. Markup copied verbatim from
// design/upload-ui/final.html (the STATE SWITCHER block); the only parameter is which tab reads as selected.

/** Upload|Preview segmented tablist. `on` is 1 (Upload active) or 2 (Preview active). */
export const segmentedSwitcher = ({ on = 1 } = {}) => {
  const upActive = on === 1;
  return (
    `<div id="switcher" data-on="${on}" role="tablist" aria-label="Publish state" ` +
    `class="seg relative grid grid-cols-2 w-full p-1 bg-surf-sunk rounded-lg select-none">` +
      `<span class="seg-thumb" aria-hidden="true"></span>` +
      `<button id="tab-1" role="tab" aria-selected="${upActive ? 'true' : 'false'}" aria-controls="state-uploading" tabindex="${upActive ? '0' : '-1'}" ` +
        `class="relative z-10 h-8 rounded-md text-meta font-semibold ${upActive ? 'text-ink-800' : 'text-ink-500'} inline-flex items-center justify-center gap-1.5 transition-colors">` +
        `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>` +
        `Uploading` +
      `</button>` +
      `<button id="tab-2" role="tab" aria-selected="${upActive ? 'false' : 'true'}" aria-controls="state-preview" tabindex="${upActive ? '-1' : '0'}" ` +
        `class="relative z-10 h-8 rounded-md text-meta font-semibold ${upActive ? 'text-ink-500' : 'text-ink-800'} inline-flex items-center justify-center gap-1.5 transition-colors">` +
        `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/></svg>` +
        `Preview` +
      `</button>` +
    `</div>`
  );
};
