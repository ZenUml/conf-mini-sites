// Square (1:1) and vertical (9:16) cuts for social placements.
//
// These are NOT centre-crops of the 16:9 master. A centre-crop would slice the captions — the widest
// cue ("Bring AI-built interactive websites") is far wider than 1080px — and would also cut the
// Confluence page furniture that makes the "right inside Confluence" claim legible. Instead the full
// 16:9 frame is scaled to the target width and placed in a branded field, with the captions re-burned
// underneath it at a size and position computed for that canvas.
//
// It re-burns from `final_nocaptions.mp4` rather than scaling the captioned master, so caption text is
// rendered once at final resolution instead of being resampled.
import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { CUES, toAss, type Cue } from './captions';
import { FFMPEG, FFPROBE } from './assemble';

const exec = promisify(execFile);

export interface Format {
  name: string;
  width: number;
  height: number;
  /** y of the video band's top edge, in output pixels */
  bandY: number;
  fontSize: number;
  /** distance from the bottom of the canvas to the caption baseline block */
  marginV: number;
}

/** Video band is always full-width 16:9 (1080x608); only the field around it changes. */
export const FORMATS: Format[] = [
  { name: 'square', width: 1080, height: 1080, bandY: 150, fontSize: 46, marginV: 190 },
  { name: 'vertical', width: 1080, height: 1920, bandY: 620, fontSize: 50, marginV: 620 },
];

/** In a tall canvas the end-card cues no longer need their own band — the lockup is elsewhere. */
function cuesFor(_f: Format): Cue[] {
  return CUES.map((c) => (c.pos === 'end' ? { ...c, pos: 'lower' as const } : c));
}

export function bandHeight(width: number): number {
  return Math.round((width * 9) / 16 / 2) * 2;
}

export function filterFor(f: Format): string {
  const bh = bandHeight(f.width);
  return [
    `[0:v]scale=${f.width}:${bh}:flags=lanczos,setsar=1[v]`,
    // d=40, not d=1: `overlay=shortest=1` ends the output with the SHORTEST input, so a one-second
    // background silently truncated the whole film to one second. It must outlast the footage.
    // r=30 is not optional: `color` defaults to 25fps and, being the FIRST input to overlay, its rate
    // wins — the variants silently rendered at 25fps (875 frames) while the master ran 30 (1050).
    `color=c=0x15233E:s=${f.width}x${f.height}:d=40:r=30[bg]`,
    `[bg][v]overlay=0:${f.bandY}:shortest=1[out]`,
  ].join(';');
}

export async function renderVariants(outDir: string): Promise<Array<{ name: string; path: string; duration: number }>> {
  const dir = resolve(outDir);
  const src = join(dir, 'final_nocaptions.mp4');
  const audio = join(dir, 'audio', 'master.wav');
  if (!existsSync(src)) throw new Error(`${src} not found — run the assemble step first`);

  const results: Array<{ name: string; path: string; duration: number }> = [];
  for (const f of FORMATS) {
    const ass = join(dir, `captions_${f.name}.ass`);
    writeFileSync(
      ass,
      toAss(cuesFor(f), { width: f.width, height: f.height, fontSize: f.fontSize }).replace(
        // the Lower style's MarginV is authored as a fraction of a 1080-tall canvas; retarget it
        /(Style: Lower,[^\n]*,)(\d+)(,1)/,
        (_m, head: string, _v: string, tail: string) => `${head}${f.marginV}${tail}`,
      ),
    );
    const out = join(dir, `final_${f.name}.mp4`);
    await exec(
      FFMPEG,
      [
        '-hide_banner', '-nostats', '-y',
        '-i', src, '-i', audio,
        '-filter_complex', `${filterFor(f)};[out]subtitles=${ass.replace(/[\\:]/g, '\\$&')}[v2]`,
        '-map', '[v2]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out,
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    const { stdout } = await exec(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', out]);
    const probe = JSON.parse(stdout);
    results.push({ name: f.name, path: out, duration: +probe.format.duration });
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  renderVariants(process.argv[2] || 'promo/out')
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error('variant render failed:', e.message);
      process.exit(1);
    });
}
