// Progress Hero — Bold Editorial design system. The publishing-progress beat from STATE 1 of
// design/upload-ui/final.html (~lines 295-325): editorial kicker, the giant % numeral (#pct-num),
// the determinate bar (.bar-fill .stripe + .bar-shimmer), and the one-line status narrator.
// Pure render fn returning an HTML string (Storybook html-vite renders the string; the app reuses
// the same markup). Markup/classes/SVGs copied verbatim from the design. Inline width on the bar
// fill is intentional — the design sets it the same way (style="width:0%").

// narrator glyph is a pure function of state: blue spinner while running, green check at done.
// (mirrors NARR_SPIN / NARR_DONE in the design's script.)
const NARR_SPIN =
  '<svg class="spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0C66E4" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>';
const NARR_DONE =
  '<span class="pop inline-grid place-items-center w-3.5 h-3.5 rounded-full bg-ok-base"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg></span>';

/** Publishing progress hero — kicker + giant % numeral + determinate bar + narrator line.
 *  @param pct      0-100 progress; drives the numeral and the bar fill width.
 *  @param narrator one-line status text (aria-live).
 *  @param done     terminal "published" state: kills bar motion (.bar-done) + green check glyph. */
export const progressHero = ({ pct = 0, narrator = 'Uploading 5 files…', done = false } = {}) =>
  `<div class="lift">` +
  `<p class="kicker-rule text-kick font-semibold uppercase text-brand-blue mb-2.5">Streaming bundle</p>` +

  `<div class="flex items-end justify-between gap-4">` +
    `<div id="pct-wrap" class="flex items-baseline gap-0.5 leading-none">` +
      `<span id="pct-num" class="text-[76px] sm:text-disp-lg text-ink-900">${pct}</span>` +
      `<span class="text-[30px] sm:text-[34px] font-bold text-ink-500 -translate-y-1 tracking-tight">%</span>` +
    `</div>` +
    `<button id="btn-cancel" type="button" class="mb-3 inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-meta font-medium text-ink-600 hover:text-stop-deep hover:bg-stop-soft transition-colors">` +
      `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>` +
      `Cancel` +
    `</button>` +
  `</div>` +

  // determinate bar with shimmer + stripe; .bar-done kills the looping motion at the terminal state.
  `<div id="bar-root" class="relative mt-1 h-2.5 w-full rounded-full bg-surf-line2 overflow-hidden${done ? ' bar-done' : ''}" role="progressbar" aria-label="Overall upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">` +
    `<div id="bar-fill" class="bar-fill stripe relative h-full rounded-full bg-brand-blue" style="width:${pct}%">` +
      `<span class="bar-shimmer" aria-hidden="true"></span>` +
    `</div>` +
  `</div>` +

  // one-line status narrator
  `<p class="mt-3 flex items-center gap-2 text-body text-ink-600">` +
    `<span id="narr-spin" class="shrink-0 inline-grid place-items-center w-3.5 h-3.5">${done ? NARR_DONE : NARR_SPIN}</span>` +
    `<span id="narrator" aria-live="polite">${narrator}</span>` +
  `</p>` +
  `</div>`;
