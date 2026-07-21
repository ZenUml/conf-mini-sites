// Audio for the promo, synthesized from scratch in JS.
//
// Why not ffmpeg's aevalsrc: the score is structural — a bed that must fall completely silent for the
// "Now what?" hold and then bloom at the magic beat, plus ~25 individually-placed SFX. Expressing that
// as nested ffmpeg eval strings is write-only; here it's ordinary code that can be unit-tested and
// re-timed when the edit moves. ffmpeg is left to do what it's good at: muxing.
//
// Licensing note: every sample below is generated from oscillators and noise in this file, so the bed is
// royalty-free by construction. A licensed track can be dropped in later — `final_nomusic.mp4` and the
// separate stems exist precisely so that swap costs one ffmpeg command, not a re-edit.

export const SAMPLE_RATE = 48000;
export const CHANNELS = 2;
export const DURATION_S = 35;

// ── tiny synth kit ──────────────────────────────────────────────────────────
export class Buf {
  readonly left: Float32Array;
  readonly right: Float32Array;
  constructor(readonly seconds: number, readonly rate = SAMPLE_RATE) {
    const n = Math.ceil(seconds * rate);
    this.left = new Float32Array(n);
    this.right = new Float32Array(n);
  }
  get length(): number {
    return this.left.length;
  }
  addAt(t: number, sample: number, pan = 0): void {
    const i = Math.round(t * this.rate);
    if (i < 0 || i >= this.length) return;
    const l = Math.min(1, 1 - pan) * sample;
    const r = Math.min(1, 1 + pan) * sample;
    this.left[i] += l;
    this.right[i] += r;
  }
  mixIn(other: Buf, gain = 1): void {
    const n = Math.min(this.length, other.length);
    for (let i = 0; i < n; i++) {
      this.left[i] += other.left[i] * gain;
      this.right[i] += other.right[i] * gain;
    }
  }
  /** Peak-normalize to `peak`, then soft-clip. Keeps the bed from ever clipping after SFX land on it. */
  normalize(peak = 0.89): void {
    let max = 0;
    for (let i = 0; i < this.length; i++) {
      max = Math.max(max, Math.abs(this.left[i]), Math.abs(this.right[i]));
    }
    if (max <= 0) return;
    const g = peak / max;
    for (let i = 0; i < this.length; i++) {
      this.left[i] = softClip(this.left[i] * g);
      this.right[i] = softClip(this.right[i] * g);
    }
  }
}

const softClip = (x: number): number => Math.tanh(x * 1.12) * 0.94;

/** Deterministic PRNG — the audio must be byte-identical between runs, so no Math.random(). */
export function makeRng(seed = 0x5eed1234): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

export interface ToneOptions {
  freq: number;
  start: number;
  dur: number;
  gain?: number;
  /** exponential decay constant; higher = shorter */
  decay?: number;
  attack?: number;
  release?: number;
  pan?: number;
  wave?: 'sine' | 'triangle' | 'square';
  /** slight detune partner for width, in cents */
  detune?: number;
  harmonic?: number;
}

function wave(kind: 'sine' | 'triangle' | 'square', phase: number): number {
  if (kind === 'sine') return Math.sin(phase);
  const t = (phase / (2 * Math.PI)) % 1;
  if (kind === 'triangle') return 4 * Math.abs(t - 0.5) - 1;
  return t < 0.5 ? 1 : -1;
}

export function tone(buf: Buf, o: ToneOptions): void {
  const {
    freq, start, dur, gain = 0.2, decay = 0, attack = 0.004, release = 0.02,
    pan = 0, wave: kind = 'sine', detune = 0, harmonic = 0,
  } = o;
  const rate = buf.rate;
  const n = Math.ceil(dur * rate);
  const f2 = freq * Math.pow(2, detune / 1200);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let env = 1;
    if (t < attack) env = t / attack;
    else if (t > dur - release) env = Math.max(0, (dur - t) / release);
    if (decay > 0) env *= Math.exp(-t * decay);
    let s = wave(kind, 2 * Math.PI * freq * t);
    if (detune) s = 0.5 * s + 0.5 * wave(kind, 2 * Math.PI * f2 * t);
    if (harmonic) s += harmonic * Math.sin(2 * Math.PI * freq * 2 * t);
    buf.addAt(start + t, s * env * gain, pan);
  }
}

export interface NoiseOptions {
  start: number;
  dur: number;
  gain?: number;
  decay?: number;
  /** one-pole highpass coefficient 0..1; higher = brighter/thinner */
  hp?: number;
  /** one-pole lowpass coefficient 0..1; higher = darker */
  lp?: number;
  pan?: number;
  rng?: () => number;
}

export function noise(buf: Buf, o: NoiseOptions): void {
  const { start, dur, gain = 0.2, decay = 40, hp = 0, lp = 0, pan = 0, rng = makeRng() } = o;
  const rate = buf.rate;
  const n = Math.ceil(dur * rate);
  let prevIn = 0;
  let prevOut = 0;
  let lpState = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let s = rng() * 2 - 1;
    if (hp > 0) {
      const out = hp * (prevOut + s - prevIn);
      prevIn = s;
      prevOut = out;
      s = out;
    }
    if (lp > 0) {
      lpState = lpState + (1 - lp) * (s - lpState);
      s = lpState;
    }
    buf.addAt(start + t, s * Math.exp(-t * decay) * gain, pan);
  }
}

/** Linear ramp between keyframes — the score's master dynamics. */
export function envelopeAt(points: Array<[number, number]>, t: number): number {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    if (t <= t1) {
      const [t0, v0] = points[i - 1];
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * p;
    }
  }
  return points[points.length - 1][1];
}

// ── the score ───────────────────────────────────────────────────────────────
const N = {
  F2: 87.31, G2: 98.0, A2: 110.0, C3: 130.81, E3: 164.81, F3: 174.61, A3: 220.0,
  C4: 261.63, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

const BEAT = 0.5; // 120 BPM
const BAR = BEAT * 4;

/**
 * The bar grid is deliberately offset by one second so that **19.0s is a downbeat**.
 *
 * That is the magic beat — the frame where the mini-site appears inside Confluence. Profiling an
 * earlier cut showed 19.0s landing mid-bar: the master gain jumped but no musical event happened
 * underneath it, so the "release" read as a volume change rather than an arrival. With this offset the
 * reveal lands on a bar line, and `chordIndexFor` is rotated so that bar is the tonic (Am) — the
 * progression comes home exactly when the product does.
 */
const BAR_OFFSET = 1.0;
/** bar k spans [BAR_OFFSET + k*BAR, +BAR). k=9 -> 19.0s, and must be PROG[0] (Am). */
const chordIndexFor = (k: number): number => (((k + 3) % 4) + 4) % 4;

/** Am – F – C – G, the loop the whole bed rides on. */
const PROG = [
  { root: N.A2, arp: [N.A4, N.C5, N.E5, N.C5], pad: [N.A3, N.C4, N.E4] },
  { root: N.F2, arp: [N.F4, N.A4, N.C5, N.A4], pad: [N.F3, N.A3, N.C4] },
  { root: N.C3, arp: [N.C5, N.E5, N.G5, N.E5], pad: [N.C4, N.E4, N.G4] },
  { root: N.G2, arp: [N.G4, N.B4, N.D5, N.B4], pad: [N.G2 * 2, N.B4, N.D5] },
];

/**
 * A score is DATA, so a second cut of the film does not mean a second synthesizer.
 *
 * Everything time-dependent — the master envelope, the silence window, where the bloom starts, when the
 * riser and the arrival stab land, and every SFX hit — lives in a ScorePlan. The 35s film uses PLAN_35;
 * the :15 cut uses PLAN_15 with the same instrument.
 */
export interface ScorePlan {
  duration: number;
  /** master gain keyframes: [seconds, gain] */
  env: Array<[number, number]>;
  /** the hard-silence window (the "Now what?" hold) */
  silence: [number, number];
  /** from this time the arp gains its octave-up sparkle */
  bright: [number, number];
  /** the tonic downbeat where the product appears */
  magicAt: number;
  /** riser start (it runs for 0.9s into the magic beat) */
  riserAt: number;
  /** where the closing chord is struck */
  resolveAt: number;
  sfx: Array<{ t: number; kind: SfxKind; why: string }>;
}

/**
 * Master dynamics, straight from the director's notes:
 *  - enters simply, ducks from 5.2s,
 *  - **hard silence 6.35–8.40** for "Now what?" (the single most important instruction in the script),
 *  - returns with more drive, builds under Publish,
 *  - blooms at 19.0s (the magic beat) and stays bright through the interaction,
 *  - settles, then resolves into a clean end chord.
 */
export const MUSIC_ENV: Array<[number, number]> = [
  [0.0, 0.0], [0.45, 0.5], [5.2, 0.52], [6.35, 0.0], [8.38, 0.0], [8.75, 0.46],
  [16.9, 0.6], [18.5, 0.68], [18.95, 0.5], [19.05, 0.88], [24.9, 0.8], [25.1, 0.68],
  [31.4, 0.62], [32.4, 0.5], [34.2, 0.42], [35.0, 0.0],
];

export function renderMusic(plan: ScorePlan = PLAN_35): Buf {
  const seconds = plan.duration;
  const isSilent = (t: number): boolean => t >= plan.silence[0] && t < plan.silence[1];
  const isBright = (t: number): boolean => t >= plan.bright[0] && t < plan.bright[1];
  const buf = new Buf(seconds);
  const rng = makeRng(0xa11ce);

  const bars = Math.ceil(seconds / BAR) + 1;
  for (let bar = -1; bar < bars; bar++) {
    const barStart = BAR_OFFSET + bar * BAR;
    const chord = PROG[chordIndexFor(bar)];
    if (!isSilent(barStart + BAR / 2)) {
      // sub bass — one note per bar, plus a push on beat 3
      tone(buf, { freq: chord.root, start: barStart, dur: BAR * 0.92, gain: 0.34, decay: 1.1, wave: 'sine', harmonic: 0.12 });
      tone(buf, { freq: chord.root, start: barStart + BEAT * 2, dur: BEAT * 1.8, gain: 0.2, decay: 2.2, wave: 'sine' });
      // pad — slow, wide, quiet
      for (const [k, f] of chord.pad.entries()) {
        tone(buf, { freq: f, start: barStart, dur: BAR, gain: 0.048, attack: 0.35, release: 0.3, wave: 'triangle', detune: k === 1 ? 7 : -5, pan: k === 0 ? -0.35 : k === 2 ? 0.35 : 0 });
      }
    }
    // eighth-note arp + offbeat hats
    for (let e = 0; e < 8; e++) {
      const t = barStart + e * (BEAT / 2);
      if (t >= seconds || isSilent(t)) continue;
      const note = chord.arp[e % chord.arp.length];
      const accent = e % 2 === 0 ? 1 : 0.62;
      tone(buf, { freq: note, start: t, dur: 0.42, gain: 0.075 * accent, decay: 7.5, wave: 'triangle', pan: e % 4 === 1 ? -0.25 : e % 4 === 3 ? 0.25 : 0 });
      if (isBright(t)) {
        tone(buf, { freq: note * 2, start: t, dur: 0.3, gain: 0.036 * accent, decay: 11, wave: 'sine', pan: e % 2 ? 0.3 : -0.3 });
      }
      if (e % 2 === 1) noise(buf, { start: t, dur: 0.06, gain: 0.03, decay: 90, hp: 0.93, rng });
    }
  }

  // The arrival itself: a tonic stab + an inverted-cymbal swell that peaks exactly on 19.0. Without a
  // musical event here the gain jump alone does not read as release.
  for (const [k, f] of [N.A3, N.E4, N.A4, N.C5, N.E5].entries()) {
    tone(buf, { freq: f, start: plan.magicAt, dur: 1.6, gain: 0.085, attack: 0.006, decay: 2.4, wave: 'triangle', detune: k % 2 ? 5 : -5, pan: (k - 2) * 0.16 });
  }
  noise(buf, { start: plan.magicAt - 0.02, dur: 0.9, gain: 0.06, decay: 5.5, hp: 0.9, rng });

  // the riser under Publish -> the magic beat
  for (let i = 0; i < Math.ceil(0.9 * SAMPLE_RATE); i++) {
    const t = i / SAMPLE_RATE;
    const p = t / 0.9;
    const f = 220 + 900 * p * p;
    const s = Math.sin(2 * Math.PI * f * t) * 0.11 * p;
    buf.addAt(plan.riserAt + t, s, 0);
  }
  noise(buf, { start: plan.riserAt + 0.25, dur: 0.65, gain: 0.09, decay: 2.0, hp: 0.86, rng });

  // final resolve: sustained Am, arp already thinned by the envelope
  for (const [k, f] of [N.A3, N.C4, N.E4, N.A4].entries()) {
    tone(buf, { freq: f, start: plan.resolveAt, dur: Math.max(0.6, seconds - plan.resolveAt - 0.2), gain: 0.09, attack: 0.12, release: 0.9, wave: 'triangle', detune: k % 2 ? 6 : -6, pan: (k - 1.5) * 0.22 });
  }

  // apply master dynamics
  for (let i = 0; i < buf.length; i++) {
    const t = i / buf.rate;
    const g = envelopeAt(plan.env, t);
    buf.left[i] *= g;
    buf.right[i] *= g;
  }
  return buf;
}

// ── SFX ─────────────────────────────────────────────────────────────────────
export type SfxKind =
  | 'startup' | 'click' | 'clickSoft' | 'clickHeavy' | 'tick' | 'panel'
  | 'type' | 'drop' | 'load' | 'chime' | 'sweep' | 'push' | 'notify' | 'confirm';

/** One SFX rendered into `buf` at `t`. Kept small and dry; the bed carries the emotion. */
export function sfx(buf: Buf, kind: SfxKind, t: number, rng = makeRng(0xbeef)): void {
  switch (kind) {
    case 'startup':
      tone(buf, { freq: N.A4, start: t, dur: 0.16, gain: 0.10, decay: 16, wave: 'sine' });
      tone(buf, { freq: N.E5, start: t + 0.055, dur: 0.22, gain: 0.085, decay: 12, wave: 'sine' });
      break;
    case 'click': // restrained UI click: a tiny noise transient with a short tonal body
      noise(buf, { start: t, dur: 0.03, gain: 0.16, decay: 260, hp: 0.9, rng });
      tone(buf, { freq: 2100, start: t, dur: 0.05, gain: 0.06, decay: 95, wave: 'sine' });
      break;
    case 'clickSoft':
      noise(buf, { start: t, dur: 0.025, gain: 0.09, decay: 300, hp: 0.92, rng });
      tone(buf, { freq: 1700, start: t, dur: 0.04, gain: 0.035, decay: 110, wave: 'sine' });
      break;
    case 'clickHeavy': // the Publish click — this one has weight
      noise(buf, { start: t, dur: 0.05, gain: 0.2, decay: 120, hp: 0.7, rng });
      tone(buf, { freq: 180, start: t, dur: 0.2, gain: 0.18, decay: 26, wave: 'sine' });
      tone(buf, { freq: 1400, start: t, dur: 0.07, gain: 0.07, decay: 70, wave: 'sine' });
      break;
    case 'tick': // a value changed
      tone(buf, { freq: N.C5, start: t, dur: 0.1, gain: 0.07, decay: 34, wave: 'sine' });
      tone(buf, { freq: N.G5, start: t + 0.03, dur: 0.11, gain: 0.045, decay: 30, wave: 'sine' });
      break;
    case 'panel': // a surface slides open
      noise(buf, { start: t, dur: 0.26, gain: 0.075, decay: 13, hp: 0.8, lp: 0.25, rng });
      tone(buf, { freq: N.E4, start: t + 0.02, dur: 0.2, gain: 0.04, decay: 16, wave: 'triangle' });
      break;
    case 'type': // a short keyboard burst, five strokes
      for (let k = 0; k < 5; k++) {
        noise(buf, { start: t + k * 0.078, dur: 0.02, gain: 0.085, decay: 340, hp: 0.9, rng });
        tone(buf, { freq: 1500 + k * 90, start: t + k * 0.078, dur: 0.03, gain: 0.028, decay: 140, wave: 'sine' });
      }
      break;
    case 'drop': // folder lands in the drop zone
      noise(buf, { start: t, dur: 0.12, gain: 0.14, decay: 42, lp: 0.5, rng });
      tone(buf, { freq: 130, start: t, dur: 0.18, gain: 0.13, decay: 30, wave: 'sine' });
      break;
    case 'load': // one of the little file-arrival ticks
      tone(buf, { freq: N.A5, start: t, dur: 0.06, gain: 0.045, decay: 55, wave: 'sine' });
      break;
    case 'chime': // ready / brand
      tone(buf, { freq: N.E5, start: t, dur: 0.5, gain: 0.075, decay: 5.5, wave: 'sine' });
      tone(buf, { freq: N.A5, start: t + 0.075, dur: 0.6, gain: 0.055, decay: 4.5, wave: 'sine' });
      tone(buf, { freq: N.C5, start: t + 0.15, dur: 0.7, gain: 0.04, decay: 4, wave: 'triangle' });
      break;
    case 'sweep': // short rise into the reveal
      for (let i = 0; i < Math.ceil(0.42 * SAMPLE_RATE); i++) {
        const dt = i / SAMPLE_RATE;
        const p = dt / 0.42;
        const f = 320 + 1500 * p * p;
        buf.addAt(t + dt, Math.sin(2 * Math.PI * f * dt) * 0.07 * Math.sin(Math.PI * p), 0);
      }
      break;
    case 'push': // camera move
      noise(buf, { start: t, dur: 0.5, gain: 0.05, decay: 6.5, hp: 0.72, lp: 0.35, rng });
      break;
    case 'notify':
      tone(buf, { freq: N.G4, start: t, dur: 0.14, gain: 0.06, decay: 22, wave: 'sine' });
      tone(buf, { freq: N.D5, start: t + 0.085, dur: 0.2, gain: 0.055, decay: 16, wave: 'sine' });
      break;
    case 'confirm':
      tone(buf, { freq: N.A4, start: t, dur: 0.2, gain: 0.07, decay: 11, wave: 'sine' });
      tone(buf, { freq: N.E5, start: t + 0.09, dur: 0.45, gain: 0.06, decay: 6, wave: 'sine' });
      break;
  }
}

/**
 * Every SFX hit, timed against the beat sheet. Each entry is a shot in the script:
 * the click that proves the site is live, the tick that proves the number changed, the weighted
 * Publish, the three recap clicks that land on the music's eighth notes.
 */
export const SFX_CUES: Array<{ t: number; kind: SfxKind; why: string }> = [
  { t: 0.10, kind: 'startup', why: 'digital start — film opens' },
  { t: 1.30, kind: 'click', why: 'Vote on Feature A' },
  { t: 2.45, kind: 'tick', why: 'count 4 -> 5, bar grows' },
  { t: 3.55, kind: 'clickSoft', why: 'Impact filter' },
  { t: 4.55, kind: 'panel', why: 'Feature B detail panel opens' },
  // 6.35-8.40: deliberate silence. "Now what?" — nothing may sound here.
  { t: 9.45, kind: 'click', why: 'Confluence Edit' },
  { t: 10.60, kind: 'type', why: 'typing /mini' },
  { t: 11.55, kind: 'panel', why: 'upload panel opens' },
  { t: 13.45, kind: 'drop', why: 'folder dropped in' },
  { t: 14.45, kind: 'load', why: 'index.html arrives' },
  { t: 14.62, kind: 'load', why: 'styles.css arrives' },
  { t: 14.80, kind: 'load', why: 'app.js + assets arrive' },
  { t: 15.55, kind: 'chime', why: 'Ready' },
  { t: 17.45, kind: 'clickHeavy', why: 'PUBLISH — the decisive action' },
  { t: 18.55, kind: 'sweep', why: 'short rise, builds expectation' },
  { t: 20.35, kind: 'push', why: 'camera pushes into the embed' },
  { t: 21.55, kind: 'click', why: 'Vote, now inside Confluence' },
  { t: 22.45, kind: 'tick', why: 'count changes — same as at 2.45s, deliberately' },
  { t: 23.55, kind: 'clickSoft', why: 'Effort filter' },
  { t: 24.55, kind: 'panel', why: 'detail panel, inside Confluence' },
  { t: 26.45, kind: 'notify', why: 'a teammate comments' },
  { t: 27.55, kind: 'click', why: 'comment turns into a click on Option B' },
  { t: 29.10, kind: 'clickSoft', why: 'recap 1/3 — on the beat' },
  { t: 29.42, kind: 'clickSoft', why: 'recap 2/3' },
  { t: 29.74, kind: 'clickSoft', why: 'recap 3/3' },
  { t: 30.35, kind: 'click', why: 'Publish, recapped' },
  { t: 31.55, kind: 'click', why: 'the last real interaction' },
  { t: 33.50, kind: 'chime', why: 'brand' },
  { t: 34.45, kind: 'confirm', why: 'CTA — install' },
];

export const PLAN_35: ScorePlan = {
  duration: DURATION_S,
  env: MUSIC_ENV,
  silence: [6.3, 8.42],
  bright: [19.0, 25.1],
  magicAt: 19.0,
  riserAt: 18.1,
  resolveAt: 32.45,
  sfx: SFX_CUES,
};

/**
 * The :15 cut. Same story, same instrument, a third of the runtime: the pause is shorter (0.9s rather
 * than 2s — at this length a 2s hold is an eighth of the film), and the bloom lands at 9.6s, still on a
 * bar line of the same offset grid.
 */
export const SFX_CUES_15: Array<{ t: number; kind: SfxKind; why: string }> = [
  { t: 0.10, kind: 'startup', why: 'film opens' },
  { t: 1.30, kind: 'click', why: 'Vote' },
  { t: 2.45, kind: 'tick', why: '4 -> 5, bar grows' },
  // 4.05-5.15: the hold. nothing sounds.
  { t: 5.30, kind: 'click', why: 'into Confluence' },
  { t: 6.25, kind: 'type', why: 'typing /mini' },
  { t: 7.20, kind: 'drop', why: 'the folder goes in' },
  { t: 8.15, kind: 'clickHeavy', why: 'PUBLISH' },
  { t: 8.55, kind: 'sweep', why: 'rise into the reveal' },
  { t: 10.45, kind: 'click', why: 'Vote, inside Confluence' },
  { t: 11.10, kind: 'tick', why: 'it changed — same tick as at 2.45s' },
  { t: 11.55, kind: 'clickSoft', why: 'filter' },
  { t: 12.55, kind: 'chime', why: 'brand' },
  { t: 14.35, kind: 'confirm', why: 'CTA' },
];

export const MUSIC_ENV_15: Array<[number, number]> = [
  [0.0, 0.0], [0.45, 0.52], [3.3, 0.52], [4.0, 0.0], [5.16, 0.0], [5.45, 0.5],
  [8.0, 0.66], [8.9, 0.52], [9.02, 0.88], [12.3, 0.78], [12.5, 0.6], [14.9, 0.42], [15.0, 0.0],
];

export const PLAN_15: ScorePlan = {
  duration: 15,
  env: MUSIC_ENV_15,
  silence: [4.02, 5.17],
  // 9.0, not 9.6: the bar grid starts at 1.0 and steps every 2s, so only an ODD second is a downbeat.
  // A test caught the first draft placing the bloom at 9.6 — mid-bar, exactly the defect the 35s cut's
  // one-second grid offset exists to prevent.
  bright: [9.0, 12.4],
  magicAt: 9.0,
  riserAt: 8.1,
  resolveAt: 12.45,
  sfx: SFX_CUES_15,
};

export function renderSfx(plan: ScorePlan = PLAN_35): Buf {
  const buf = new Buf(plan.duration);
  const rng = makeRng(0xf00d);
  for (const cue of plan.sfx) sfx(buf, cue.kind, cue.t, rng);
  return buf;
}

/** True iff nothing at all sounds during the "Now what?" hold — asserted by the tests. */
export function silenceHoldIsClean(buf: Buf, from = 6.5, to = 8.3): boolean {
  const a = Math.floor(from * buf.rate);
  const b = Math.min(buf.length, Math.ceil(to * buf.rate));
  for (let i = a; i < b; i++) if (Math.abs(buf.left[i]) > 1e-4 || Math.abs(buf.right[i]) > 1e-4) return false;
  return true;
}

/** RMS in dBFS over a window — used to prove the silence beat really is ~25dB under the magic beat. */
export function rmsDb(buf: Buf, from: number, to: number): number {
  const a = Math.max(0, Math.floor(from * buf.rate));
  const b = Math.min(buf.length, Math.ceil(to * buf.rate));
  let sum = 0;
  for (let i = a; i < b; i++) sum += buf.left[i] * buf.left[i] + buf.right[i] * buf.right[i];
  const rms = Math.sqrt(sum / Math.max(1, (b - a) * 2));
  return rms <= 0 ? -Infinity : 20 * Math.log10(rms);
}

// ── WAV ─────────────────────────────────────────────────────────────────────
export function toWav(buf: Buf): Buffer {
  const n = buf.length;
  const bytes = n * CHANNELS * 2;
  const out = Buffer.alloc(44 + bytes);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + bytes, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(CHANNELS, 22);
  out.writeUInt32LE(buf.rate, 24);
  out.writeUInt32LE(buf.rate * CHANNELS * 2, 28);
  out.writeUInt16LE(CHANNELS * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf.left[i] * 32767))), o);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf.right[i] * 32767))), o + 2);
    o += 4;
  }
  return out;
}

/** music + sfx, gain-staged so SFX read clearly over the bed without ducking it. */
export function renderMaster(plan: ScorePlan = PLAN_35): { master: Buf; music: Buf; sfxBuf: Buf } {
  const music = renderMusic(plan);
  const sfxBuf = renderSfx(plan);
  const master = new Buf(plan.duration);
  master.mixIn(music, 0.82);
  master.mixIn(sfxBuf, 1.0);
  master.normalize(0.89);
  return { master, music, sfxBuf };
}
