// Instance reference + permission trust line — Bold Editorial design system. Pure render functions returning
// HTML strings (Storybook html-vite renders the string; the app reuses the same markup). Faithful to
// design/upload-ui/final.html (lines ~511-526). The ref uses .path-mid (middle-ellipsis): the .p-head
// truncates while the .p-tail — the unique suffix, e.g. "-7f3a" — always stays visible.
const ICONS = {
  copy: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  users: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="shrink-0" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3-1.5-1.5"/></svg>',
};

// Split a ref into [head, tail] so the unique trailing segment (last "-xxxx") is the always-visible .p-tail.
const splitRef = (ref) => {
  const i = ref.lastIndexOf('-');
  return i > 0 ? [ref.slice(0, i), ref.slice(i)] : [ref, ''];
};

/** The copyable instance-reference row: "REF" label, mono code (middle-ellipsis), and a copy button. */
export const instanceRef = ({ ref = 'mini-site:rel-dashboard-7f3a' } = {}) => {
  const [head, tail] = splitRef(ref);
  return (
    `<div class="mt-4 flex items-center gap-2 rounded-lg border border-surf-line2 bg-surf-page px-3 py-2">` +
    `<span class="text-micro font-semibold uppercase text-ink-600 tracking-[0.07em] shrink-0">Ref</span>` +
    `<code id="instance-ref" class="path-mid font-mono text-mono text-ink-800 flex-1 min-w-0 select-all"><span class="p-head">${head}</span><span class="p-tail">${tail}</span></code>` +
    `<button id="btn-copy-ref" type="button" aria-label="Copy instance reference" class="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-surf-line text-meta font-medium text-ink-600 bg-white hover:bg-surf-sunk transition-colors">` +
    `${ICONS.copy}<span id="copy-ref-label">Copy</span></button>` +
    `</div>`
  );
};

/** Permission-gated trust line — the users SVG + "Only people who can view this page can open this mini-site." */
export const permissionLine = ({ text = 'Only people who can view this page can open this mini-site.' } = {}) =>
  `<p class="mt-3 flex items-center gap-2 text-meta text-ink-500">${ICONS.users}${text}</p>`;
