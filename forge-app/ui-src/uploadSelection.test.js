import { describe, expect, it } from 'vitest';
import { selectUploadFiles } from './uploadSelection';
const file = (name, webkitRelativePath = '') => ({ name, webkitRelativePath, size: 17 });
describe('upload selection', () => {
  it.each(['report.html', 'my prototype.HTML', 'tool.HTM'])('preserves direct %s and its file bytes', (name) => {
    const original = file(name);
    expect(selectUploadFiles([original], 'html')).toEqual({ ok: true, files: [{ file: original, path: name, size: 17 }] });
  });
  it.each([{ files: [] }, { files: [file('a.js')] }, { files: [file('one.html'), file('two.html')] }])('rejects invalid direct selections', ({ files }) => {
    expect(selectUploadFiles(files, 'html').ok).toBe(false);
  });
  it('accepts a folder containing only index.html', () => {
    expect(selectUploadFiles([file('index.html', 'site/index.html')]).files[0].path).toBe('index.html');
  });
  it.each(['dashboard.html', 'INDEX.HTML', 'tool.HTM'])('accepts a sole root %s in a folder without renaming it', (name) => {
    expect(selectUploadFiles([file(name, 'site/' + name), file('app.js', 'site/assets/app.js')]).files.map((f) => f.path)).toEqual([name, 'assets/app.js']);
  });
  it('rejects ambiguous root HTML files without index.html', () => {
    expect(selectUploadFiles([file('one.html'), file('two.htm')]).ok).toBe(false);
  });
  it('preserves nested asset paths', () => {
    expect(selectUploadFiles([file('index.html', 'site/index.html'), file('app.js', 'site/assets/app.js')]).files.map((f) => f.path)).toEqual(['index.html', 'assets/app.js']);
  });
  it.each(['site/nested/index.html', 'site/app.js'])('rejects folders without a root HTML entrypoint: %s', (path) => {
    expect(selectUploadFiles([file(path.split('/').pop(), path)]).ok).toBe(false);
  });
});
