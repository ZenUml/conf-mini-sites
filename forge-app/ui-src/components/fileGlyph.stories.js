import { fileGlyph } from './fileGlyph.js';

export default { title: 'Atoms/FileGlyph' };

export const Html = { render: () => fileGlyph({ kind: 'html' }) };
export const Js = { render: () => fileGlyph({ kind: 'js' }) };
export const Css = { render: () => fileGlyph({ kind: 'css' }) };
export const Svg = { render: () => fileGlyph({ kind: 'svg' }) };
export const Json = { render: () => fileGlyph({ kind: 'json' }) };
export const Img = { render: () => fileGlyph({ kind: 'img' }) };
