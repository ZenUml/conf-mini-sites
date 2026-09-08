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
