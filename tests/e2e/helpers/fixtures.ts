// Absolute paths to e2e bundle fixtures (Playwright runs from the repo root).
import { join } from 'node:path';

const dir = join(process.cwd(), 'tests/e2e/fixtures/sample-bundle');

/** A valid multi-file bundle (index.html + app.js + style.css) for upload specs. */
export const SAMPLE_BUNDLE = ['index.html', 'app.js', 'style.css'].map((f) => join(dir, f));

/** Just index.html — a single-file bundle (should be rejected as BUNDLE_NOT_MULTIFILE). */
export const SINGLE_FILE = [join(dir, 'index.html')];
