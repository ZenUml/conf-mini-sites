// Assembles the film: capture logs + beat sheet -> per-shot clips -> concat -> captions + audio.
//
// Two deliberate engineering choices:
//
// 1. Marks resolve through the CLAP, not through wall-clock subtraction. Playwright starts recording at
//    context creation and exposes no wall-clock->video mapping, so every capture opens with a ~140ms
//    full-frame black flash. `ffmpeg blackdetect` finds that flash to the frame; the midpoint of the
//    detected interval is paired with the midpoint of the clap's own two marks, which cancels the
//    render latency that a start-to-start pairing would bake in.
//
// 2. Shots render to intermediate files and are then concat-copied, rather than one giant
//    filter_complex. It costs one extra generation of h264 at crf 12 (visually free) and buys something
//    worth much more at 3am: when a shot is wrong you can open that one shot.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { SHOTS, FILM_DURATION, validateShots, type Shot } from './shots';
import { CUES, toAss, validateCues } from './captions';

const exec = promisify(execFile);

// ffmpeg-full is the keg-only build that carries libass; the default Homebrew formula cannot burn
// captions at all. Resolved explicitly rather than trusting whatever `ffmpeg` is first on PATH.
const FFDIR = process.env.PROMO_FFMPEG_DIR || '/opt/homebrew/opt/ffmpeg-full/bin';
export const FFMPEG = join(FFDIR, 'ffmpeg');
export const FFPROBE = join(FFDIR, 'ffprobe');

export const FPS = 30;
export const W = 1920;
export const H = 1080;

// ── mark resolution ─────────────────────────────────────────────────────────
export interface ClapWindow {
  start: number;
  end: number;
}

/** Parse `ffmpeg -vf blackdetect` stderr for the first detected black interval. */
export function parseBlackdetect(stderr: string): ClapWindow | null {
  const m = /black_start:([\d.]+)\s+black_end:([\d.]+)/.exec(stderr);
  if (!m) return null;
  return { start: parseFloat(m[1]), end: parseFloat(m[2]) };
}

export async function detectClap(videoPath: string): Promise<ClapWindow> {
  // Only the first ~4s can contain the clap; limiting the scan keeps this fast and avoids matching a
  // genuinely dark frame later in the film.
  const { stderr } = await exec(FFMPEG, [
    '-hide_banner', '-nostats', '-t', '4', '-i', videoPath,
    '-vf', 'blackdetect=d=0.05:pic_th=0.98:pix_th=0.10', '-an', '-f', 'null', '-',
  ]).catch((e: { stderr?: string }) => ({ stderr: e.stderr || '' }));
  const win = parseBlackdetect(stderr);
  if (!win) throw new Error(`no clap found in ${basename(videoPath)} — was Capture.clap() called?`);
  return win;
}

export interface LogEntry {
  mark: string;
  t: number;
}

export function readLog(logPath: string): LogEntry[] {
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as LogEntry);
}

/**
 * wall-clock (ms since context start) -> video time (s), anchored on the clap.
 * Exported separately from any file I/O so the arithmetic is unit-testable.
 */
export function buildMarkMap(entries: LogEntry[], clap: ClapWindow): Map<string, number> {
  const on = entries.find((e) => e.mark === 'clap_on');
  const off = entries.find((e) => e.mark === 'clap_off');
  if (!on || !off) throw new Error('capture log has no clap_on/clap_off marks');
  const anchorWallS = (on.t + off.t) / 2000;
  const anchorVideoS = (clap.start + clap.end) / 2;
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.mark, anchorVideoS + (e.t / 1000 - anchorWallS));
  return map;
}

export function markTime(map: Map<string, number>, shot: Shot): number {
  if (!shot.at) throw new Error(`shot ${shot.id} has no mark anchor`);
  const [name, offset] = shot.at;
  const base = map.get(name);
  if (base === undefined) {
    throw new Error(`shot ${shot.id}: capture never emitted mark "${name}" (available: ${[...map.keys()].join(', ')})`);
  }
  return Math.max(0, base + offset);
}

// ── per-shot video filter ───────────────────────────────────────────────────
/**
 * Zoom is scale-then-crop around a normalised centre, clamped so the crop window can never run off the
 * edge of the frame (which ffmpeg would reject at runtime, mid-render).
 */
export function zoomFilter(zoom: number, cx = 0.5, cy = 0.5): string[] {
  if (!zoom || Math.abs(zoom - 1) < 1e-6) return [];
  if (zoom < 1) throw new Error(`zoom < 1 is not supported (shot asked for ${zoom}); pull-backs are staged by zooming the PRECEDING shots in`);
  const cw = Math.round(W / zoom / 2) * 2;
  const ch = Math.round(H / zoom / 2) * 2;
  const x = Math.max(0, Math.min(W - cw, Math.round(cx * W - cw / 2)));
  const y = Math.max(0, Math.min(H - ch, Math.round(cy * H - ch / 2)));
  return [`crop=${cw}:${ch}:${x}:${y}`, `scale=${W}:${H}:flags=lanczos`];
}

export function shotFilters(shot: Shot): string[] {
  const f: string[] = [];
  const speed = shot.speed ?? 1;
  if (speed !== 1) f.push(`setpts=PTS/${speed}`);
  f.push(...zoomFilter(shot.zoom ?? 1, shot.cx, shot.cy));
  if (shot.dim) {
    // brightness down + a little desaturation: the frame "cools" rather than merely dimming
    f.push(`eq=brightness=${(-0.5 * shot.dim).toFixed(3)}:saturation=${(1 - 0.45 * shot.dim).toFixed(3)}`);
  }
  if (shot.fadeIn) f.push(`fade=t=in:st=0:d=${shot.fadeIn}`);
  f.push(`fps=${FPS}`, `scale=${W}:${H}`, 'setsar=1');
  return f;
}

/**
 * Frames are derived from the shot's cumulative BOUNDARIES, not from its duration in isolation.
 *
 * Half the beat sheet lands on 0.x5 seconds, which is 1.5 frames at 30fps. Rounding each duration
 * independently rounded most of those up and pushed the film to 35.3s — a third of a second of drift
 * that would have desynced every caption and SFX cue after the first minute of edit work. Rounding the
 * boundaries instead makes the errors cancel: the total is exactly round(35 * 30) = 1050 frames, and no
 * individual cut moves by more than half a frame.
 */
/**
 * Snap a time to its frame index on one canonical grid.
 *
 * The toFixed(6) is not cosmetic. Shot boundaries are computed as `t + dur` in floating point, so
 * `12.45 + 1.10` is 13.549999999999999 while the next shot authors its start as 13.55. Multiplied by
 * 30 those straddle 406.5 and round to DIFFERENT frames — one shot ends at 406, the next starts at 407,
 * and the film silently loses a frame. Quantising to microseconds first makes both spellings of the
 * same instant agree.
 */
export function frameAt(t: number): number {
  return Math.round(Number(t.toFixed(6)) * FPS);
}

export function frameCount(shot: Shot): number {
  return frameAt(shot.t + shot.dur) - frameAt(shot.t);
}

/** argv for one shot. `-frames:v` (not -t) is what makes the concatenated total land exactly on 35.000s. */
export function shotArgs(shot: Shot, srcPath: string, inSeconds: number, outPath: string): string[] {
  const isStill = shot.src === 'endcard';
  const pre = isStill ? ['-loop', '1', '-i', srcPath] : ['-ss', inSeconds.toFixed(3), '-i', srcPath];
  return [
    '-hide_banner', '-nostats', '-y',
    ...pre,
    '-vf', shotFilters(shot).join(','),
    '-frames:v', String(frameCount(shot)),
    '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p',
    outPath,
  ];
}

// ── orchestration ───────────────────────────────────────────────────────────
export interface AssembleOptions {
  capturesDir: string;
  outDir: string;
  audioDir: string;
  /** skip caption burn-in (produces the localisation master) */
  noCaptions?: boolean;
}

async function ffprobeJson(path: string): Promise<any> {
  const { stdout } = await exec(FFPROBE, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path,
  ]);
  return JSON.parse(stdout);
}

export async function assemble(opts: AssembleOptions): Promise<{ final: string; report: any }> {
  const shotProblems = validateShots();
  const cueProblems = validateCues();
  if (shotProblems.length) throw new Error(`beat sheet invalid: ${JSON.stringify(shotProblems)}`);
  if (cueProblems.length) throw new Error(`captions invalid: ${JSON.stringify(cueProblems)}`);

  const captures = resolve(opts.capturesDir);
  const outDir = resolve(opts.outDir);
  const shotsDir = join(outDir, 'shots');
  mkdirSync(shotsDir, { recursive: true });

  // resolve every act's marks once
  const markMaps = new Map<string, Map<string, number>>();
  for (const act of ['act1', 'act2', 'act3']) {
    const video = join(captures, `${act}.webm`);
    const log = join(captures, `${act}.actions.jsonl`);
    if (!existsSync(video) || !existsSync(log)) continue;
    const clap = await detectClap(video);
    markMaps.set(act, buildMarkMap(readLog(log), clap));
  }

  const rendered: string[] = [];
  const shotReport: any[] = [];
  for (const [i, shot] of SHOTS.entries()) {
    const out = join(shotsDir, `${String(i).padStart(2, '0')}-${shot.id}.mp4`);
    let src: string;
    let inS = 0;
    if (shot.src === 'endcard') {
      src = join(captures, `${shot.at![0]}.png`);
      if (!existsSync(src)) throw new Error(`end card still missing: ${src}`);
    } else {
      src = join(captures, `${shot.src}.webm`);
      const map = markMaps.get(shot.src);
      if (!map) throw new Error(`shot ${shot.id} needs ${shot.src}.webm, which was not captured`);
      inS = markTime(map, shot);
    }
    await exec(FFMPEG, shotArgs(shot, src, inS, out));
    rendered.push(out);
    shotReport.push({ id: shot.id, t: shot.t, dur: shot.dur, src: shot.src, srcIn: +inS.toFixed(3), frames: frameCount(shot), evidence: shot.evidence });
  }

  // concat (stream copy — no generation loss beyond the per-shot encode)
  const listPath = join(outDir, 'concat.txt');
  writeFileSync(listPath, rendered.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const silent = join(outDir, 'silent.mp4');
  await exec(FFMPEG, ['-hide_banner', '-nostats', '-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', silent]);

  // captions + audio
  const assPath = join(outDir, 'captions.ass');
  writeFileSync(assPath, toAss(CUES));

  const master = join(resolve(opts.audioDir), 'master.wav');
  const sfxOnly = join(resolve(opts.audioDir), 'stems', 'sfx.wav');

  const mux = async (audio: string, burn: boolean, outName: string): Promise<string> => {
    const out = join(outDir, outName);
    const args = ['-hide_banner', '-nostats', '-y', '-i', silent, '-i', audio];
    if (burn) args.push('-vf', `subtitles=${assPath.replace(/[\\:]/g, '\\$&')}`);
    args.push(
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out,
    );
    await exec(FFMPEG, args, { maxBuffer: 32 * 1024 * 1024 });
    return out;
  };

  const final = await mux(master, !opts.noCaptions, 'final.mp4');
  const noMusic = existsSync(sfxOnly) ? await mux(sfxOnly, true, 'final_nomusic.mp4') : null;
  const noCaptions = await mux(master, false, 'final_nocaptions.mp4');

  const probe = await ffprobeJson(final);
  const v = probe.streams.find((s: any) => s.codec_type === 'video');
  const a = probe.streams.find((s: any) => s.codec_type === 'audio');
  const report = {
    final,
    noMusic,
    noCaptions,
    duration: +probe.format.duration,
    expectedDuration: FILM_DURATION,
    width: v?.width,
    height: v?.height,
    fps: v?.r_frame_rate,
    videoCodec: v?.codec_name,
    audioCodec: a?.codec_name,
    shots: shotReport,
  };
  writeFileSync(join(outDir, 'render-report.json'), JSON.stringify(report, null, 2));
  return { final, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const capturesDir = process.argv[2] || 'promo/out/captures';
  const outDir = process.argv[3] || 'promo/out';
  assemble({ capturesDir, outDir, audioDir: 'promo/out/audio' })
    .then(({ report }) => {
      console.log(JSON.stringify({ ...report, shots: `${report.shots.length} shots` }, null, 2));
    })
    .catch((e) => {
      console.error('assemble failed:', e.message);
      process.exit(1);
    });
}
