// It's Live header — Bold Editorial design system. The published-confirmation headline block from
// design/upload-ui/final.html (#reveal-head, lines ~386-399): an ok-deep kicker, the Fraunces serif
// "It's live." display headline, and a green pulsing "Live" badge. Pure render fn returning an HTML
// string (Storybook html-vite renders the string; the app reuses the same markup). Classes/SVGs copied
// verbatim from the design — see button.js for the template conventions.

/** Published confirmation headline — the design's `#reveal-head` editorial block. */
export const itsLiveHeader = ({
  kicker = 'Published · live on this page',
  headline = 'It’s live.',
  badge = 'Live',
} = {}) =>
  `<div id="reveal-head" class="lift">` +
  `<p class="kicker-rule text-kick font-semibold uppercase text-ok-deep mb-2.5">${kicker}</p>` +
  `<div class="flex items-end justify-between gap-3">` +
  `<h2 class="display opsz-head text-[44px] sm:text-disp font-semibold text-ink-900 leading-[0.95]">${headline}</h2>` +
  `<span class="relative inline-flex items-center gap-1.5 mb-2 px-2.5 h-7 rounded-full bg-ok-soft text-ok-deep text-meta font-semibold">` +
  `<span class="relative inline-grid place-items-center w-2 h-2">` +
  `<span class="pulse absolute inset-0 rounded-full"></span>` +
  `<span class="w-2 h-2 rounded-full bg-ok-base"></span>` +
  `</span>` +
  `${badge}` +
  `</span>` +
  `</div>` +
  `</div>`;
