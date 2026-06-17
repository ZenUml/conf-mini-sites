// Absolute paths to e2e bundle fixtures (Playwright runs from the repo root).
import { join } from 'node:path';

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
