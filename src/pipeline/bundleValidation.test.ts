// Tests for the shared upload pipeline's bundle-validation step (DESIGN.md §3.3 steps 3-4, §5.3).
// validateBundle is a single pure async function (no future implementations), so a plain *.test.ts is the
// house style here — there is no reusable contract to factor out. Determinism: validateBundle reads no clock.
import { describe, it, expect } from 'vitest';
import { validateBundle } from './bundleValidation';
import type { BundleError } from './bundleValidation';

const enc = new TextEncoder();
const file = (path: string, body: string | number) => ({
  path,
  bytes: typeof body === 'number' ? new Uint8Array(body) : enc.encode(body),
});

// A minimal valid multi-file bundle: a root index.html + one relative sub-resource.
const validFiles = () => [file('index.html', '<h1>hi</h1>'), file('assets/app.js', 'console.log(1)')];

// Narrow the union to the failing branch and assert the code in one place.
function expectError(
  r: Awaited<ReturnType<typeof validateBundle>>,
  code: BundleError['code'],
): BundleError {
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error('expected validation failure');
  expect(r.error.code).toBe(code);
  return r.error;
}

describe('validateBundle', () => {
  it('accepts a valid multi-file bundle with a root index.html', async () => {
    const r = await validateBundle(validFiles());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.bundle.entrypoint).toBe('index.html');
    expect(r.bundle.files).toHaveLength(2);
    expect(r.bundle.totalBytes).toBe(enc.encode('<h1>hi</h1>').byteLength + enc.encode('console.log(1)').byteLength);
  });

  it('computes content-type by extension', async () => {
    const r = await validateBundle([
      file('index.html', '<h1>hi</h1>'),
      file('assets/app.js', 'x'),
      file('assets/site.css', 'y'),
      file('data/info.json', '{}'),
      file('img/logo.svg', '<svg/>'),
    ]);
    if (!r.ok) throw new Error('expected ok');
    const byPath = Object.fromEntries(r.bundle.files.map((f) => [f.path, f.contentType]));
    expect(byPath['index.html']).toContain('text/html');
    expect(byPath['assets/app.js']).toContain('javascript');
    expect(byPath['assets/site.css']).toContain('text/css');
    expect(byPath['data/info.json']).toContain('application/json');
    expect(byPath['img/logo.svg']).toContain('image/svg');
  });

  it('computes a stable SHA-256 content hash over the concatenated bytes', async () => {
    const a = await validateBundle(validFiles());
    const b = await validateBundle(validFiles());
    if (!a.ok || !b.ok) throw new Error('expected ok');
    expect(a.bundle.contentHash).toMatch(/^sha256-[0-9a-f]{64}$/);
    expect(a.bundle.contentHash).toBe(b.bundle.contentHash); // deterministic, content-addressed
  });

  it('content hash changes when any byte changes', async () => {
    const a = await validateBundle(validFiles());
    const b = await validateBundle([file('index.html', '<h1>hi</h1>'), file('assets/app.js', 'console.log(2)')]);
    if (!a.ok || !b.ok) throw new Error('expected ok');
    expect(a.bundle.contentHash).not.toBe(b.bundle.contentHash);
  });

  // §3.3 step 3 — reject single-file .html as out of scope ("use the existing HTML macro").
  it('rejects a single .html file as BUNDLE_NOT_MULTIFILE', async () => {
    const r = await validateBundle([file('index.html', '<h1>solo</h1>')]);
    expectError(r, 'BUNDLE_NOT_MULTIFILE');
  });

  it('rejects an empty file list as BUNDLE_NOT_MULTIFILE', async () => {
    const r = await validateBundle([]);
    expectError(r, 'BUNDLE_NOT_MULTIFILE');
  });

  // §3.3 step 3 — must have a *root* index.html entrypoint.
  it('rejects a multi-file bundle with no root index.html as MISSING_INDEX_HTML', async () => {
    const r = await validateBundle([file('assets/app.js', 'x'), file('page/index.html', 'y')]);
    expectError(r, 'MISSING_INDEX_HTML');
  });

  // §3.3 step 3 — relative-only: no http(s):// and no leading /.
  it('rejects an http(s):// path as ABSOLUTE_PATH_REJECTED', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('https://evil.example/app.js', 'y')]);
    expectError(r, 'ABSOLUTE_PATH_REJECTED');
  });

  it('rejects a protocol-relative //host path as ABSOLUTE_PATH_REJECTED', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('//evil.example/app.js', 'y')]);
    expectError(r, 'ABSOLUTE_PATH_REJECTED');
  });

  it('rejects a leading-slash absolute path as ABSOLUTE_PATH_REJECTED', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('/etc/passwd', 'y')]);
    expectError(r, 'ABSOLUTE_PATH_REJECTED');
  });

  // §3.3 step 3 — no `..` traversal (same shape as ATTACHMENT_NAME_RE, generalized to a manifest).
  it('rejects a .. traversal path as PATH_TRAVERSAL_REJECTED', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('../secrets.env', 'y')]);
    expectError(r, 'PATH_TRAVERSAL_REJECTED');
  });

  it('rejects an embedded .. segment as PATH_TRAVERSAL_REJECTED', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('assets/../../escape.js', 'y')]);
    expectError(r, 'PATH_TRAVERSAL_REJECTED');
  });

  // §3.3 step 4 — server-authoritative caps.
  it('rejects too many files as TOO_MANY_FILES', async () => {
    const files = [file('index.html', 'x'), file('a.js', 'y'), file('b.js', 'z')];
    const r = await validateBundle(files, { maxFiles: 2 });
    expectError(r, 'TOO_MANY_FILES');
  });

  it('rejects a single oversized file as BUNDLE_TOO_LARGE', async () => {
    const r = await validateBundle([file('index.html', 'x'), file('big.js', 5000)], { maxFileBytes: 1000 });
    expectError(r, 'BUNDLE_TOO_LARGE');
  });

  it('rejects an oversized total as BUNDLE_TOO_LARGE', async () => {
    // Each file is under maxFileBytes, but the sum exceeds maxTotalBytes (zip-bomb-style total guard).
    const r = await validateBundle(
      [file('index.html', 600), file('a.js', 600), file('b.js', 600)],
      { maxFileBytes: 1000, maxTotalBytes: 1000 },
    );
    expectError(r, 'BUNDLE_TOO_LARGE');
  });

  it('accepts a bundle exactly at the caps (boundaries are inclusive)', async () => {
    const r = await validateBundle([file('index.html', 500), file('a.js', 500)], {
      maxFiles: 2,
      maxFileBytes: 500,
      maxTotalBytes: 1000,
    });
    expect(r.ok).toBe(true);
  });

  // Ordering: structural rejections (multi-file / index) are checked before path rules, which are checked
  // before caps — the first failing rule wins so the surfaced code is deterministic.
  it('reports BUNDLE_NOT_MULTIFILE before any path/size rule when only one file is present', async () => {
    const r = await validateBundle([file('../solo.html', 'x')], { maxFiles: 0 });
    expectError(r, 'BUNDLE_NOT_MULTIFILE');
  });
});
