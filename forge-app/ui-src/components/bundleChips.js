// Bundle summary chips — Bold Editorial design system. Pure render functions returning HTML strings (Storybook
// html-vite renders the string; the app reuses the same markup). The "receipt" row after a bundle upload:
// files chip (file glyph + "N files"), size chip (mono num-tab), an ok "No secrets found" shield-check chip,
// and a "Sandboxed" chip. Faithful to design/upload-ui/final.html (lines ~469-484) + the Tailwind tokens.
const ICONS = {
  file: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  shield: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
  sandbox: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6v6H9z"/></svg>',
};

/** Files chip — file glyph + the count (singular/plural aware). */
export const filesChip = ({ files = 5 } = {}) =>
  `<span class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-surf-sunk text-ink-600 text-meta font-medium">` +
  `${ICONS.file}${files} file${files === 1 ? '' : 's'}</span>`;

/** Size chip — mono, tabular figures. */
export const sizeChip = ({ size = '412 KB' } = {}) =>
  `<span class="inline-flex items-center h-7 px-2.5 rounded-md bg-surf-sunk text-ink-600 text-meta font-medium font-mono num-tab">${size}</span>`;

/** "No secrets found" chip — the ok (green) shield-check assurance. */
export const secretsChip = ({ label = 'No secrets found' } = {}) =>
  `<span class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-ok-soft text-ok-deep text-meta font-semibold">` +
  `${ICONS.shield}${label}</span>`;

/** "Sandboxed" chip — the isolation assurance. */
export const sandboxChip = ({ label = 'Sandboxed' } = {}) =>
  `<span class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-surf-sunk text-ink-600 text-meta font-medium">` +
  `${ICONS.sandbox}${label}</span>`;

/** The full bundle summary chips row — the receipt of a validated upload. */
export const bundleChips = ({ files = 5, size = '412 KB' } = {}) =>
  `<div class="mt-5 flex flex-wrap items-center gap-2">` +
  `${filesChip({ files })}${sizeChip({ size })}${secretsChip()}${sandboxChip()}</div>`;
