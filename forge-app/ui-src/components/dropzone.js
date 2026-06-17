// Dropzone — Bold Editorial design system. The file-picker drop zone (the design's #picker / #dropzone block):
// dashed-border label, upload-arrow SVG in a brand-tint square, prompt + helper text, and a "Browse files…" pill.
// Pure render function returning an HTML string (Storybook html-vite renders the string; the app reuses the same
// markup). Source: forge-app/static/publisher/index.html. Classes/SVG copied verbatim from the design.
const ICONS = {
  upload: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/><path d="M5 21h14"/></svg>',
};

/** The idle folder-picker drop zone — kicker + dashed label with upload glyph, prompt, helper text, browse pill. */
export const dropzone = ({
  kicker = 'Multi-file bundle',
  title = 'Choose a folder to publish',
  helper = 'It must contain <span class="font-mono text-ink-600">index.html</span> and its relative assets (JS, CSS, images).',
  browseLabel = 'Browse files…',
} = {}) =>
  `<div id="picker" class="lift">` +
  `<p class="kicker-rule text-kick font-semibold uppercase text-brand-blue mb-2.5">${kicker}</p>` +
  `<label id="dropzone" for="file-input" class="group flex flex-col items-center justify-center gap-2.5 w-full rounded-xl border-2 border-dashed border-surf-line bg-surf-page hover:border-brand-blue hover:bg-brand-tintBg/40 transition-colors cursor-pointer px-6 py-10 text-center">` +
  `<span class="grid place-items-center w-12 h-12 rounded-xl bg-brand-tintBg text-brand-blue" aria-hidden="true">${ICONS.upload}</span>` +
  `<span class="text-lead font-semibold text-ink-800">${title}</span>` +
  `<span class="text-meta text-ink-500">${helper}</span>` +
  `<span class="mt-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-blue group-hover:bg-brand-hover text-white text-meta font-semibold transition-colors">${browseLabel}</span>` +
  `</label>` +
  `<input id="file-input" type="file" webkitdirectory multiple class="sr-only" />` +
  `<p id="picker-error" hidden class="mt-3 text-meta text-stop-deep"></p>` +
  `</div>`;
