// Checklist row — Bold Editorial design system. Validation/security row from the upload pipeline: leading
// status icon, label + mono note, right-side status text. Pure render functions returning HTML strings (Storybook
// html-vite renders the string; the app reuses the same markup). Faithful to design/upload-ui/final.html
// (buildChecklist/renderCheckRow/shieldGlyph). Security ("shield") rows get a brand-tint bg + brand left border;
// a stopped shield row flips to the stop-soft red variant. SVGs copied verbatim from the design.

// Plain pending spinner (non-shield row, in progress).
const pendingDot = () =>
  '<svg class="spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#626F86" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>';

// Green check pill (non-shield row, passed).
const greenCheck = () =>
  '<span class="pop inline-grid place-items-center w-4 h-4 rounded-full bg-ok-base"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg></span>';

// Shield glyph: green shield-check when passed, blue/grey spinner-in-circle while pending.
const shieldGlyph = (green) =>
  '<span class="status inline-grid place-items-center w-5 h-5 rounded-full ' + (green ? 'bg-ok-base' : 'bg-surf-sunk') + '">' +
  (green
    ? '<svg class="pop" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
    : '<svg class="spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#44546F" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>') +
  '</span>';

// Red triangle-alert pill (shield row, stopped).
const stopGlyph = () =>
  '<span class="status inline-grid place-items-center w-5 h-5 rounded-full bg-stop-base"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg></span>';

/** A validation/security checklist row. `state`: 'pending' | 'passed' | 'stop'. `shield` promotes it to a
 *  security row (accent bg + brand left border; stop flips to the stop-soft red variant). */
export const checklistRow = ({ label = 'Check', note = '', state = 'pending', shield = false } = {}) => {
  const stopped = state === 'stop';
  const done = state === 'passed';

  // Row container: shield rows carry more weight (brand tint + left border); a stopped row flips to stop-soft.
  let rowCls = 'flex items-center gap-3 px-3.5 py-2.5';
  if (shield && stopped) rowCls += ' bg-stop-soft border-l-2 border-stop-base';
  else if (shield) rowCls += ' bg-brand-tintBg/40 border-l-2 border-brand-blue/60';

  // Leading status icon.
  let lead;
  if (shield) lead = stopped ? stopGlyph() : shieldGlyph(done);
  else lead = '<span class="status inline-grid place-items-center w-5 h-5">' + (done ? greenCheck() : pendingDot()) + '</span>';

  // Label colour: shield always ink-800/semibold; non-shield darkens once passed.
  const labelCls = shield
    ? 'text-body font-semibold text-ink-800'
    : 'text-body font-medium ' + (done ? 'text-ink-800' : 'text-ink-600');
  const noteCls = stopped
    ? 'block text-meta text-stop-deep leading-tight mt-0.5 font-mono num-tab'
    : 'block text-meta text-ink-600 leading-tight mt-0.5 font-mono num-tab';

  // Right-side status text.
  let status = '';
  if (stopped) status = '<span class="shrink-0 text-micro font-semibold text-stop-deep">Stopped</span>';
  else if (shield && !done) status = '<span class="shrink-0 text-micro font-medium text-ink-500">in progress</span>';
  else if (done) status = '<span class="shrink-0 text-micro font-semibold text-ok-deep">' + (shield ? 'No secrets' : 'Passed') + '</span>';

  return `<li class="${rowCls}">` +
    lead +
    '<span class="flex-1 min-w-0">' +
      '<span class="block ' + labelCls + ' leading-tight">' + label + '</span>' +
      (note ? '<span class="' + noteCls + '">' + note + '</span>' : '') +
    '</span>' +
    status +
    '</li>';
};
