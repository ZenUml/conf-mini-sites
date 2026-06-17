// Manifest row — Bold Editorial design system. Pure render functions returning HTML strings (Storybook
// html-vite renders the string; the app reuses the same markup). Sourced from design/upload-ui/final.html
// buildManifest()/pendingDot()/greenCheck() + the halted-dash freeze. A file-manifest <li>: glyph chip +
// middle-ellipsis mono path (.path-mid p-head/p-tail) + tabular mono size + a status slot keyed on `status`:
// "pending" (spinner) | "uploaded" (green check) | "halted" (neutral dash). Classes/SVGs copied verbatim.

// File-kind glyph map (color + monogram), verbatim from the design's GLYPH object.
const GLYPH = {
  html: { c: '#0C66E4', t: '<>' },
  js:   { c: '#B07B00', t: 'JS' },
  css:  { c: '#7F56D9', t: '{}' },
  svg:  { c: '#216E4E', t: '▱' },
  json: { c: '#44546F', t: '{·}' },
};

/** Glyph chip for a file kind — the design's manifest 24px monogram tile (8% bg tint + solid fg). */
export const fileGlyph = (kind = 'json') => {
  const g = GLYPH[kind] || GLYPH.json;
  return `<span class="shrink-0 grid place-items-center w-6 h-6 rounded-md font-mono text-[10px] font-semibold" style="background:${g.c}1A;color:${g.c}">${g.t}</span>`;
};

// Split a path into head + tail so the middle ellipses while the extension (.tail) stays pinned — design's splitPath().
const splitPath = (p) => {
  const i = p.lastIndexOf('/');
  if (i === -1) { const dot = p.lastIndexOf('.'); return { head: p.slice(0, dot), tail: p.slice(dot) }; }
  const file = p.slice(i + 1), dot2 = file.lastIndexOf('.');
  return { head: p.slice(0, i + 1 + dot2), tail: file.slice(dot2) };
};

// Pending — the design's pendingDot() spinner.
const pendingDot = () =>
  '<svg class="spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#626F86" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>';

// Uploaded — the design's greenCheck() badge.
const greenCheck = () =>
  '<span class="pop inline-grid place-items-center w-4 h-4 rounded-full bg-ok-base"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg></span>';

// Halted — the design's neutral "halted" dash that freezes a still-pending spinner after a hard-stop.
const haltedDash = () =>
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#8993A4" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>';

const STATUS = { pending: pendingDot, uploaded: greenCheck, halted: haltedDash };

/** A file-manifest list row: glyph chip + middle-ellipsis mono path + tabular size + status slot. */
export const manifestRow = ({ path = 'index.html', size = '6.4 KB', kind = 'html', status = 'pending' } = {}) => {
  const sp = splitPath(path);
  const marker = (STATUS[status] || pendingDot)();
  return `<li class="settle flex items-center gap-3 px-3.5 py-2.5">` +
    fileGlyph(kind) +
    `<span class="path-mid font-mono text-mono text-ink-800 flex-1 min-w-0"><span class="p-head">${sp.head}</span><span class="p-tail">${sp.tail}</span></span>` +
    `<span class="shrink-0 font-mono text-micro text-ink-600 num-tab">${size}</span>` +
    `<span class="status shrink-0 w-4 h-4 grid place-items-center"${status === 'halted' ? ' data-up="halt"' : ''}>${marker}</span>` +
    `</li>`;
};
