// Optional voiceover track.
//
// The script as written is captions-only, and that version stays the master (`final.mp4`). This produces
// a SEPARATE cut (`final_vo.mp4`) so the two can be compared rather than one silently replacing the other.
//
// Two rules the VO must obey, both inherited from the film it sits on:
//
//  1. **Voice and print never compete.** Early cuts burned the full caption track under the narration;
//     reading one sentence while hearing a different one was the single most-reported distraction
//     (user note, 2026-07-22). So the VO cut carries CUES_VO — only the cues that play where the voice
//     is silent, plus "Now what?", the one deliberate voice=text moment. The captions-only master
//     (`final.mp4`) keeps the full track; the two versions serve different placements, not the same one.
//  2. **It never speaks between 6.35s and 8.40s**, and it never speaks across the reveal at 19.0-21.5s.
//     The hold is the film's hinge and is silent by design; the reveal belongs to the picture and the
//     score. Both are enforced by tests, because the temptation to fill them with words is exactly the
//     mistake this file could most easily make.
//
// Synthesis is Kokoro-82M through the venv that already exists at demo-pipeline/.venv — a preset English
// voice, no cloning. Output is cached by content hash so a re-render costs nothing.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { Buf, DURATION_S, PLAN_35, renderMusic, renderSfx, toWav } from './audio';
import { CUES, toAss, type Cue } from './captions';
import { FFMPEG, FFPROBE } from './assemble';

const exec = promisify(execFile);

const PY = resolve('demo-pipeline/.venv/bin/python');
const KOKORO = resolve('demo-pipeline/voice/kokoro.py');
const CACHE = resolve('promo/out/.vo-cache');
export const VOICE = 'af_heart';

export interface VoLine {
  /** film time this line starts speaking */
  t: number;
  text: string;
  /** what it adds that the captions do not */
  why: string;
  /** override the default voice for this line */
  voice?: string;
  /** 1.0 = as synthesized; >1 stretches the line out (slower, more deliberate) */
  stretch?: number;
  /** 1.0 = as synthesized; <1 lowers the pitch */
  pitch?: number;
  /** linear gain; the intimate lines sit lower than the explanatory ones */
  gain?: number;
}

/**
 * Timed against the beat sheet, not the caption list. Every line lands in a gap where the captions are
 * either absent or saying something shorter, and nothing speaks across the hold.
 */
export const VO_LINES: VoLine[] = [
  { t: 0.55, text: 'You built something real with AI.', why: 'states the premise the captions only ask as a question' },
  { t: 3.45, text: 'It works. On your machine.', why: 'sets up the problem before the hold lands' },
  // THE ONE LINE INSIDE THE HOLD. The script asks for "near-complete silence", not absolute silence —
  // and a single quiet line landing in an otherwise empty gap is stronger than the gap alone: the
  // silence makes the line land, the line gives the silence its meaning. It is the only place the voice
  // and the caption deliberately say the same words.
  //
  // SAME narrator as every other line. A different voice here reads as a different character, which is
  // the opposite of the intended effect — this is the narrator's own moment of deflation, not someone
  // else's comment on it. The delivery comes from treatment instead: 8% slower, pitch down 2%, and well
  // under the level of the explanatory lines. Chosen by ear over heavier reads (1.16/0.95 and 1.24/0.92
  // were rendered into the real hold and compared) — past a point the processing stops sounding
  // deflated and starts sounding processed. Ends inside the score's silence window; the test measures
  // that rather than trusting it.
  { t: 6.72, text: 'Now what?', why: 'the hinge, spoken once, into the silence', stretch: 1.08, pitch: 0.98, gain: 0.72 },
  // Names the platform out loud (user note 2026-07-22): the product runs ONLY in Confluence, so
  // "where your team already works" must not stay generic.
  { t: 8.70, text: 'So put it in Confluence, where your team already works.', why: 'the turn, and it names the platform' },
  { t: 12.40, text: 'Drop in the whole folder. No build step, no hosting.', why: 'the two objections, answered' },
  { t: 16.60, text: 'One click to publish.', why: 'names the action the caption only labels' },
  // NOTHING is spoken across the reveal (19.0-21.5). A line here ducked the score's bloom by 6dB —
  // the film's biggest musical moment — to say what the caption "It runs." already says. The director's
  // note is explicit that the viewer must be left to register the reveal before being told about it.
  { t: 22.60, text: 'Your team can click it, filter it, explore it themselves.', why: 'the shareability argument the captions compress' },
  { t: 26.90, text: 'The prototype and the conversation, finally in one place.', why: 'closes the narrative the film opened' },
  { t: 31.70, text: 'Mini Sites for Confluence.', why: 'the lockup, spoken once, matching the printed name' },
];

/**
 * The caption cues that survive into the VO cut: exactly one. The narrated version trusts the voice
 * and the picture everywhere — including the reveal and the end card (user note 2026-07-22: any
 * second-half text under narration read as leftover subtitles). "Now what?" stays because it is the
 * film's one deliberate voice=text moment, printed into a silent, dimmed frame.
 */
export const VO_CAPTION_KEEP = new Set(['Now what?']);
export const CUES_VO: Cue[] = CUES.filter((c) => VO_CAPTION_KEEP.has(c.text));

/** Windows where the bed should step back so the voice stays intelligible. */
export function duckWindows(lines: VoLine[], durations: Map<string, number>): Array<[number, number]> {
  return lines.map((l) => [l.t - 0.25, l.t + (durations.get(l.text) ?? 2) + 0.35] as [number, number]);
}

const key = (text: string, voice: string, stretch: number, pitch: number) =>
  createHash('sha256').update(`${voice}::${stretch}::${pitch}::${text}`).digest('hex').slice(0, 24);

/**
 * Pitch and tempo, kept independent.
 *
 * `asetrate` alone shifts pitch AND duration together (it is just playing the samples faster or
 * slower), so it is followed by `atempo` to put the duration back and then apply the stretch that was
 * actually asked for. Doing it in one step would make "lower the voice" silently also mean "say it
 * slower", which is not the same instruction.
 */
export function toneFilter(rate: number, stretch: number, pitch: number): string {
  const tempo = 1 / (pitch * stretch);
  return `asetrate=${Math.round(rate * pitch)},aresample=${rate},atempo=${tempo.toFixed(6)}`;
}

export async function synthesize(
  text: string,
  opts: { voice?: string; stretch?: number; pitch?: number } = {},
): Promise<{ wav: string; seconds: number }> {
  const voice = opts.voice ?? VOICE;
  const stretch = opts.stretch ?? 1;
  const pitch = opts.pitch ?? 1;
  mkdirSync(CACHE, { recursive: true });
  const wav = join(CACHE, `${key(text, voice, stretch, pitch)}.wav`);
  const meta = `${wav}.json`;
  if (existsSync(wav) && existsSync(meta)) {
    return { wav, seconds: JSON.parse(readFileSync(meta, 'utf8')).seconds };
  }
  if (!existsSync(PY)) throw new Error(`Kokoro venv not found at ${PY} — see demo-pipeline/README.md`);
  const raw = stretch === 1 && pitch === 1 ? wav : `${wav}.raw.wav`;
  await exec(PY, [KOKORO, '--text', text, '--voice', voice, '--out', raw], { maxBuffer: 8 * 1024 * 1024 });
  if (raw !== wav) {
    await exec(FFMPEG, ['-hide_banner', '-nostats', '-y', '-i', raw, '-af', toneFilter(24000, stretch, pitch), wav]);
  }
  // Duration is MEASURED, never taken from the synthesizer's word.
  const { stdout } = await exec(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', wav]);
  const seconds = parseFloat(stdout.trim());
  if (!(seconds > 0)) throw new Error(`synthesized WAV for ${JSON.stringify(text)} has no duration`);
  writeFileSync(meta, JSON.stringify({ text, voice, stretch, pitch, seconds }));
  return { wav, seconds };
}

/** Decode a 24kHz mono WAV into the 48kHz stereo Buf the mixer works in. */
export function loadWavResampled(path: string, target = DURATION_S): { data: Float32Array; rate: number } {
  const b = readFileSync(path);
  let off = 12;
  let dataOff = -1;
  let dataLen = 0;
  let rate = 24000;
  let bits = 16;
  let channels = 1;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      channels = b.readUInt16LE(off + 10);
      rate = b.readUInt32LE(off + 12);
      bits = b.readUInt16LE(off + 22);
    } else if (id === 'data') {
      dataOff = off + 8;
      dataLen = size;
    }
    off += 8 + size + (size % 2);
  }
  if (dataOff < 0 || bits !== 16) throw new Error(`unsupported WAV: ${path} (bits=${bits})`);
  const n = Math.floor(dataLen / 2 / channels);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(dataOff + i * 2 * channels) / 32768;
  void target;
  return { data: out, rate };
}

/** Place every line into a full-length stereo bed at the mixer's sample rate (linear resample). */
export async function renderVoiceTrack(lines: VoLine[] = VO_LINES): Promise<{ track: Buf; durations: Map<string, number> }> {
  const track = new Buf(DURATION_S);
  const durations = new Map<string, number>();
  for (const line of lines) {
    const { wav, seconds } = await synthesize(line.text, line);
    durations.set(line.text, seconds);
    const { data, rate } = loadWavResampled(wav);
    const ratio = rate / track.rate;
    const n = Math.floor(data.length / ratio);
    for (let i = 0; i < n; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const frac = src - i0;
      const s = (data[i0] ?? 0) * (1 - frac) + (data[i0 + 1] ?? 0) * frac;
      track.addAt(line.t + i / track.rate, s * (line.gain ?? 0.92), 0);
    }
  }
  return { track, durations };
}

/** music + sfx + voice, with the bed ducked under speech. */
export async function renderVoiceMaster(): Promise<{ master: Buf; voice: Buf; ducks: Array<[number, number]> }> {
  const { track: voice, durations } = await renderVoiceTrack();
  const ducks = duckWindows(VO_LINES, durations);
  const music = renderMusic(PLAN_35);
  const sfxBuf = renderSfx(PLAN_35);

  // -7.5dB under speech, ramped over 180ms so the duck is not audible as a step.
  const DUCK = Math.pow(10, -7.5 / 20);
  const RAMP = 0.18;
  for (let i = 0; i < music.length; i++) {
    const t = i / music.rate;
    let g = 1;
    for (const [a, b] of ducks) {
      if (t < a - RAMP || t > b + RAMP) continue;
      const into = Math.min(1, Math.max(0, (t - (a - RAMP)) / RAMP));
      const out = Math.min(1, Math.max(0, (b + RAMP - t) / RAMP));
      g = Math.min(g, 1 - (1 - DUCK) * Math.min(into, out));
    }
    music.left[i] *= g;
    music.right[i] *= g;
  }

  const master = new Buf(DURATION_S);
  master.mixIn(music, 0.82);
  master.mixIn(sfxBuf, 0.85);
  master.mixIn(voice, 1.0);
  master.normalize(0.89);
  return { master, voice, ducks };
}

export async function buildVoiceCut(outDir = 'promo/out'): Promise<{ path: string; duration: number; lines: number }> {
  const dir = resolve(outDir);
  const { master } = await renderVoiceMaster();
  const wav = join(dir, 'audio', 'master_vo.wav');
  writeFileSync(wav, toWav(master));

  const silent = join(dir, 'silent.mp4');
  // The VO cut burns its own reduced caption track — never the full one (see header rule 1).
  const ass = join(dir, 'captions_vo.ass');
  writeFileSync(ass, toAss(CUES_VO));
  if (!existsSync(silent)) throw new Error('run pnpm promo:assemble first');
  const out = join(dir, 'final_vo.mp4');
  await exec(
    FFMPEG,
    [
      '-hide_banner', '-nostats', '-y', '-i', silent, '-i', wav,
      '-vf', `subtitles=${ass.replace(/[\\:]/g, '\\$&')}`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const { stdout } = await exec(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out]);
  return { path: out, duration: +parseFloat(stdout.trim()).toFixed(3), lines: VO_LINES.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildVoiceCut(process.argv[2] || 'promo/out')
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error('voiceover cut failed:', e.message);
      process.exit(1);
    });
}
