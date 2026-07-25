// Capture harness: launches a recording browser, draws a synthetic cursor, and — critically — makes the
// recorded video frame-addressable from the action log.
//
// The alignment problem: Playwright starts recording at CONTEXT creation, and gives you no mapping from
// wall-clock to video timestamp. Naively subtracting Date.now()s drifts by a few hundred ms, which is
// fatal when the edit cuts on 1-second beats. So every capture opens with a CLAP: a full-viewport black
// flash of ~120ms. In post, `ffmpeg -f lavfi blackdetect` finds that flash to the frame, giving an exact
// wall-clock -> video-time anchor. Every mark after it is anchor + (mark - clap).
import { chromium, type Browser, type BrowserContext, type Frame, type Locator, type Page } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CURSOR_INIT, assertCursorInstalled, cursorTo, cursorClickFeedback, cursorPlace } from './cursor';

export interface CaptureOptions {
  /** Directory that receives <name>.webm, <name>.actions.jsonl, <name>.manifest.json */
  outDir: string;
  name: string;
  /** Playwright storageState path (the Confluence login). Omit for anonymous captures. */
  storageState?: string;
  width?: number;
  height?: number;
}

export class Capture {
  readonly page: Page;
  private constructor(
    private readonly browser: Browser,
    private readonly context: BrowserContext,
    page: Page,
    private readonly opts: Required<Pick<CaptureOptions, 'outDir' | 'name' | 'width' | 'height'>>,
    private readonly t0: number,
    private readonly logPath: string,
  ) {
    this.page = page;
  }

  static async start(opts: CaptureOptions): Promise<Capture> {
    const width = opts.width ?? 1920;
    const height = opts.height ?? 1080;
    const outDir = resolve(opts.outDir);
    mkdirSync(outDir, { recursive: true });
    const videoDir = join(outDir, `.raw-${opts.name}`);
    mkdirSync(videoDir, { recursive: true });

    const browser = await chromium.launch({
      args: [
        '--force-device-scale-factor=1',
        '--hide-scrollbars',
        '--disable-features=IsolateOrigins', // keeps nested Forge frames addressable
        '--font-render-hinting=none',        // steadier glyph weight between frames
      ],
    });
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: 'en-AU',
      timezoneId: 'Australia/Sydney',
      reducedMotion: 'reduce', // suppress platform chrome animation; the site's own transitions still play
      storageState: opts.storageState,
      recordVideo: { dir: videoDir, size: { width, height } },
    });
    const t0 = Date.now();
    await context.addInitScript(CURSOR_INIT);
    const page = await context.newPage();
    const logPath = join(outDir, `${opts.name}.actions.jsonl`);
    writeFileSync(logPath, '');
    const cap = new Capture(browser, context, page, { outDir, name: opts.name, width, height }, t0, logPath);
    cap.mark('context_start');
    return cap;
  }

  /** ms since context creation — the same clock every mark shares. */
  private now(): number {
    return Date.now() - this.t0;
  }

  mark(name: string, extra: Record<string, unknown> = {}): void {
    appendFileSync(this.logPath, JSON.stringify({ mark: name, t: this.now(), ...extra }) + '\n');
  }

  /** The alignment clap. Call once, on a loaded page, before any footage that matters.
   *  Doubles as the gate that proves the synthetic cursor survived injection — a capture without a
   *  cursor still "succeeds" and is worthless, so it must fail here rather than in the edit. */
  async clap(): Promise<void> {
    await assertCursorInstalled(this.page);
    this.mark('clap_begin');
    await this.page.evaluate(() => {
      const d = document.createElement('div');
      d.id = '__promo_clap';
      d.style.cssText =
        'position:fixed;inset:0;background:#000;z-index:2147483646;pointer-events:none;';
      document.documentElement.appendChild(d);
    });
    this.mark('clap_on');
    await this.page.waitForTimeout(140);
    await this.page.evaluate(() => document.getElementById('__promo_clap')?.remove());
    this.mark('clap_off');
    await this.page.waitForTimeout(240);
  }

  /** Beat boundary. `hold` is the deliberate stillness the director asked for between shots. */
  async beat(name: string, hold = 0): Promise<void> {
    this.mark(name);
    if (hold > 0) await this.page.waitForTimeout(hold);
  }

  async place(x: number, y: number): Promise<void> {
    await cursorPlace(this.page, x, y);
  }

  /** Glide the drawn cursor (and the real mouse) to the centre of `target`. Works for elements inside
   *  cross-origin iframes: boundingBox() is main-frame relative. */
  async moveToTarget(target: Locator, opts: { duration?: number; dx?: number; dy?: number } = {}): Promise<{ x: number; y: number }> {
    const box = await target.boundingBox({ timeout: 15000 });
    if (!box) throw new Error('moveToTarget: target has no bounding box (not visible?)');
    const x = box.x + box.width / 2 + (opts.dx ?? 0);
    const y = box.y + box.height / 2 + (opts.dy ?? 0);
    await cursorTo(this.page, x, y, opts.duration ?? 620);
    return { x, y };
  }

  /**
   * The filmed click: glide → dwell → ripple → actual click.
   * `via: 'dom'` dispatches el.click() instead of a real mouse click — required for the Forge Custom UI
   * frames, where a synthetic mouse event on a cross-origin iframe can be swallowed (this is why the
   * project's own e2e helpers use evaluate-clicks).
   */
  async clickTarget(
    target: Locator,
    opts: { markName?: string; via?: 'mouse' | 'dom'; duration?: number; dwell?: number; settle?: number } = {},
  ): Promise<void> {
    await this.moveToTarget(target, { duration: opts.duration });
    await cursorClickFeedback(this.page, opts.dwell ?? 260);
    // Record WHAT was clicked, in main-frame pixels. The edit's close-ups then crop around measured
    // coordinates instead of guessed ones — the first cut aimed a 2.2x zoom at hardcoded fractions and
    // landed on body text instead of the button.
    const clickedBox = await target.boundingBox().catch(() => null);
    if (opts.markName) this.mark(opts.markName, clickedBox ? { box: clickedBox } : {});
    if ((opts.via ?? 'mouse') === 'dom') {
      await target.evaluate((el: HTMLElement) => el.click());
    } else {
      await target.click({ timeout: 15000 });
    }
    if (opts.settle) await this.page.waitForTimeout(opts.settle);
  }

  /** Apply a stylesheet to the top frame — used for privacy masking on Confluence. */
  async injectCss(css: string): Promise<void> {
    await this.page.addStyleTag({ content: css });
  }

  /** Same, for a nested frame. */
  static async injectCssIntoFrame(frame: Frame, css: string): Promise<void> {
    await frame.addStyleTag({ content: css });
  }

  /** Close the context (flushes the video), move it to <name>.webm, write the manifest. */
  async finish(extra: Record<string, unknown> = {}): Promise<{ video: string; log: string; manifest: string }> {
    this.mark('capture_end');
    const video = this.page.video();
    const rawPath = video ? await video.path() : null;
    await this.context.close();
    await this.browser.close();
    const finalVideo = join(this.opts.outDir, `${this.opts.name}.webm`);
    if (rawPath && existsSync(rawPath)) renameSync(rawPath, finalVideo);
    else throw new Error('capture produced no video file');
    const manifestPath = join(this.opts.outDir, `${this.opts.name}.manifest.json`);
    writeFileSync(
      manifestPath,
      JSON.stringify(
        { name: this.opts.name, width: this.opts.width, height: this.opts.height, video: finalVideo, log: this.logPath, ...extra },
        null,
        2,
      ),
    );
    return { video: finalVideo, log: this.logPath, manifest: manifestPath };
  }
}
