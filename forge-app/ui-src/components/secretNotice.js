// Secret-detected stop banner — Bold Editorial design system. Pure render fn returning an HTML string (Storybook
// html-vite renders the string; the app reuses the same markup). Source: design/upload-ui/final.html (#secret-notice)
// + forge-app/static/publisher/index.html. The only error variant in the upload flow: a red alert on stop-soft,
// "Publish stopped" title, a mono file:line · message line, and a "Fix & re-upload" action. SVGs copied verbatim.

const ALERT_ICON =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';

const RETRY_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';

/** The secret-detected stop banner. `message` is the mono file:line · explanation line under the title. */
export const secretNotice = ({ message = 'config.js:14 · AWS access key (AKIA…7H2Q) found in source. Nothing was published.' } = {}) =>
  `<div class="rounded-lg border border-stop-line bg-stop-soft px-4 py-3" role="status">` +
  `<div class="flex items-start gap-2.5">` +
  `<span class="grid place-items-center w-5 h-5 rounded-full bg-stop-base text-white shrink-0 mt-0.5" aria-hidden="true">${ALERT_ICON}</span>` +
  `<div class="min-w-0 flex-1">` +
  `<p class="text-body font-semibold text-stop-deep leading-tight">Publish stopped</p>` +
  `<p class="mt-1 text-meta text-stop-deep font-mono">${message}</p>` +
  `<button type="button" class="mt-2.5 inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-stop-base hover:bg-stop-deep text-white text-meta font-semibold transition-colors">` +
  `${RETRY_ICON}Fix &amp; re-upload</button>` +
  `</div></div></div>`;
