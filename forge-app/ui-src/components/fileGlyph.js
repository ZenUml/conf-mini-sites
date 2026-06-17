// FileGlyph — Bold Editorial design system. The small file-type glyph chip rendered before each path in the
// upload manifest (design/upload-ui/final.html → GLYPH map + buildManifest). Pure render function returning an
// HTML string. Per-kind color is applied inline (matches the design's own buildManifest inline style; Storybook
// has no CSP). One file per component under ui-src/components/, paired with <name>.stories.js.
const GLYPH = {
  html: { c: '#0C66E4', t: '<>' },
  js: { c: '#B07B00', t: 'JS' },
  css: { c: '#7F56D9', t: '{}' },
  svg: { c: '#216E4E', t: '▱' },
  json: { c: '#44546F', t: '{·}' },
  img: { c: '#22A06B', t: '▦' },
};

/** File-type glyph chip — faint tinted bg + colored mono mark (e.g. `<>` html, `JS` js, `{}` css, `▱` svg). */
export const fileGlyph = ({ kind = 'html' } = {}) => {
  const g = GLYPH[kind] || GLYPH.html;
  return `<span class="shrink-0 grid place-items-center w-6 h-6 rounded-md font-mono text-[10px] font-semibold" style="background:${g.c}1A;color:${g.c}">${g.t}</span>`;
};
