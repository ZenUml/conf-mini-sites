// Renders the three closing stills. Not a video capture — the end card is static, so it is screenshotted
// at three backdrop scales to give the ending a slow push instead of a frozen frame.
import { execFile } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from '@playwright/test';
import { startStatic, stopStatic } from './serve';
import { buildMarkMap, detectClap, readLog, FFMPEG } from '../edit/assemble';

const exec = promisify(execFile);
const PORT = 3932;

/** Pull a real frame of the running mini-site out of Act 2 to use as the (blurred) backdrop. */
async function extractBackdrop(capturesDir: string, out: string): Promise<void> {
  const video = join(capturesDir, 'act2.webm');
  const entries = readLog(join(capturesDir, 'act2.actions.jsonl'));
  const clapOn = entries.find((e) => e.mark === 'clap_on');
  const clap = await detectClap(video, (clapOn?.t ?? 0) / 1000);
  const map = buildMarkMap(entries, clap);
  const t = (map.get('a2_live') ?? 0) + 1.4;
  await exec(FFMPEG, ['-hide_banner', '-nostats', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', out]);
}

export async function renderEndCards(capturesDir: string): Promise<string[]> {
  const captures = resolve(capturesDir);
  const dir = resolve('promo/capture');
  const backdrop = join(dir, '.backdrop.png');
  await extractBackdrop(captures, backdrop);

  // The product's own listing logo, not the prototype's chart glyph.
  const logo = join(dir, '.logo.svg');
  const src = resolve('docs/listing/logo.svg');
  if (!existsSync(src)) throw new Error(`product logo not found at ${src}`);
  copyFileSync(src, logo);

  const server = await startStatic(dir, PORT);
  const browser = await chromium.launch();
  const written: string[] = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const scales = [1.0, 1.035, 1.07];
    for (const [i, scale] of scales.entries()) {
      const url = `http://127.0.0.1:${PORT}/endcard.html?bg=.backdrop.png&mark=.logo.svg&scale=${scale}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const out = join(captures, `card${i + 1}.png`);
      await page.screenshot({ path: out });
      written.push(out);
    }
  } finally {
    await browser.close();
    await stopStatic(server);
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  renderEndCards(process.argv[2] || 'promo/out/captures')
    .then((f) => console.log('end cards:', f.join(', ')))
    .catch((e) => {
      console.error('end card render failed:', e.message);
      process.exit(1);
    });
}
