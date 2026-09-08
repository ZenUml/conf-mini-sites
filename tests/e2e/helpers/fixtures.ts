// Absolute paths to e2e bundle fixtures (Playwright runs from the repo root).
import { join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const dir = join(process.cwd(), 'tests/e2e/fixtures/sample-bundle');

/** A valid multi-file bundle (index.html + app.js + style.css) for upload specs (flat file list). */
export const SAMPLE_BUNDLE = ['index.html', 'app.js', 'style.css'].map((f) => join(dir, f));

/** The sample-bundle as a DIRECTORY — for folder uploads that preserve webkitRelativePath. */
export const SAMPLE_BUNDLE_DIR = dir;

/** A NESTED bundle (index.html + styles.css + app.js + data/metrics.json + assets/logo.svg) — the canonical
 *  sample under samples/. Used to verify folder uploads preserve subdirectories + relative fetch/img paths. */
export const NESTED_BUNDLE_DIR = join(process.cwd(), 'samples/release-dashboard');

/** Just index.html — a single-file bundle (should be rejected as BUNDLE_NOT_MULTIFILE). */
export const SINGLE_FILE = [join(dir, 'index.html')];

/**
 * Generate a bundle whose base64 form exceeds the invoke payload cap Forge actually enforces (5 MB; the docs at
 * developer.atlassian.com/platform/forge/limits-invocation/ also quote 500 KB for front-end requests, not observed). base64 inflates 4/3, so 4200 KB raw ≈ 5.6 MB on
 * the wire — just past the cap (4.0 MB base64 was measured to pass), and still quick through CDP. Random bytes
 * so no layer can shrink it. Written under os.tmpdir(); the caller removes it in `finally`.
 */
export function makeLargeBundleDir(rawBytes = 4200 * 1024): string {
  const dir = mkdtempSync(join(tmpdir(), 'mini-sites-large-bundle-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>large bundle</title><h1>Large bundle</h1><img src="assets/photo.bin" alt="">');
  writeFileSync(join(dir, 'assets/photo.bin'), randomBytes(rawBytes));
  return dir;
}

/**
 * A bundle whose asset is ONE text-like line of `rawBytes` — the shape that broke production on
 * 2026-09-08. `makeLargeBundleDir` fills its asset with `randomBytes`, which carries NUL and control
 * bytes, so `isTextLike` classifies it binary and the secret scanner skips the file: that fixture
 * could not reach `scanLine` at any size. Minified JS and inline `data:` URIs are text with no
 * newline for megabytes, which is what this generates. Default size is the reported case (7.2 MB),
 * not the smallest size that clears Forge's invoke cap.
 */
export function makeLongLineBundleDir(rawBytes = 7200 * 1024): string {
  const dir = mkdtempSync(join(tmpdir(), 'mini-sites-long-line-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>long line</title><h1>Long line</h1><script src="assets/app.min.js"></script>');
  // One line, no newline, printable ASCII: text-like to isTextLike, and a single match target for the
  // scanner's base64-run regex.
  writeFileSync(join(dir, 'assets/app.min.js'), 'a'.repeat(rawBytes));
  return dir;
}
