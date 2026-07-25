import { describe, expect, it } from 'vitest';
import {
  DURATION_S, PLAN_15, PLAN_35, SAMPLE_RATE, SFX_CUES, envelopeAt, makeRng, renderMaster, renderMusic,
  renderSfx, rmsDb, silenceHoldIsClean, toWav,
} from './audio';

const short = (seconds: number) => ({ ...PLAN_35, duration: seconds });
import { CUES, cueStory, toAss, validateCues, assTime } from './captions';

describe('score', () => {
  it('is deterministic — two renders are byte-identical (a re-render must not change the film)', () => {
    expect(toWav(renderSfx(short(2))).equals(toWav(renderSfx(short(2))))).toBe(true);
  });

  it('makeRng is seeded and repeatable', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('holds ABSOLUTE silence across "Now what?" — the script\'s single loudest instruction', () => {
    const { master } = renderMaster();
    // no SFX cue may be scheduled inside the hold
    expect(SFX_CUES.filter((c) => c.t >= 6.35 && c.t < 8.4)).toEqual([]);
    expect(silenceHoldIsClean(renderMusic())).toBe(true);
    // and the mixed master is far under the magic beat
    const hold = rmsDb(master, 6.6, 8.25);
    const magic = rmsDb(master, 19.0, 20.0);
    expect(magic - hold).toBeGreaterThan(25);
  });

  it('blooms at the magic beat — 19-20s is the loudest sustained second of the BED', () => {
    // Measured on the music bed, not the master: a single percussive SFX (the folder 'drop' at 13.45s)
    // out-peaks any sustained musical second in RMS, so asserting on the master would test the wrong
    // claim. The script's instruction is about the score swelling, and that is what this measures.
    // Compared bar-to-bar (2s windows aligned to the grid), not second-to-second: the bed puts its
    // sub-bass on the bar line, so any per-second comparison just measures which side of a downbeat
    // the window fell on.
    const music = renderMusic();
    const magic = rmsDb(music, 19.0, 21.0);
    for (const [from, to] of [[1, 3], [9, 11], [13, 15], [25, 27], [33, 35]] as const) {
      expect(magic).toBeGreaterThan(rmsDb(music, from, to));
    }
  });

  it('music envelope ramps rather than jumps at the silence boundaries', () => {
    expect(envelopeAt([[0, 0], [1, 1]], 0.5)).toBeCloseTo(0.5, 6);
    expect(envelopeAt([[0, 0], [1, 1]], -5)).toBe(0);
    expect(envelopeAt([[0, 0], [1, 1]], 99)).toBe(1);
  });

  it('never clips', () => {
    const { master } = renderMaster();
    let peak = 0;
    for (let i = 0; i < master.length; i++) peak = Math.max(peak, Math.abs(master.left[i]), Math.abs(master.right[i]));
    expect(peak).toBeLessThanOrEqual(0.95);
    expect(peak).toBeGreaterThan(0.5);
  });

  it('emits a well-formed 48k stereo 16-bit WAV of the right length', () => {
    const wav = toWav(renderSfx(short(1)));
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(SAMPLE_RATE * 2 * 2);
  });

  it('the :15 cut keeps the shape: silence, then a bloom on a downbeat', () => {
    const music = renderMusic(PLAN_15);
    expect(silenceHoldIsClean(music, PLAN_15.silence[0] + 0.15, PLAN_15.silence[1] - 0.05)).toBe(true);
    // the bloom bar beats every other bar-length window in the cut
    const magic = rmsDb(music, PLAN_15.magicAt, PLAN_15.magicAt + 2);
    for (const from of [1, 5.5, 12.5]) expect(magic).toBeGreaterThan(rmsDb(music, from, from + 2));
    expect(PLAN_15.sfx.every((c) => c.t < PLAN_15.duration)).toBe(true);
    // nothing may sound inside the :15 hold either
    expect(PLAN_15.sfx.filter((c) => c.t >= PLAN_15.silence[0] && c.t < PLAN_15.silence[1])).toEqual([]);
  });

  it('the :15 bloom lands on the same offset bar grid as the 35s cut', () => {
    // bars start at 1.0 + k*2.0, so a downbeat is any odd second
    for (const plan of [PLAN_35, PLAN_15]) expect((plan.magicAt - 1.0) % 2).toBeCloseTo(0, 6);
  });

  it('every SFX cue lands inside the film', () => {
    for (const c of SFX_CUES) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThan(DURATION_S);
      expect(c.why.length).toBeGreaterThan(3); // each hit must justify itself
    }
  });
});

describe('captions', () => {
  it('obeys every caption rule in the director notes', () => {
    expect(validateCues()).toEqual([]);
  });

  it('tells the whole story with the sound off', () => {
    const story = cueStory();
    for (const beat of ['Built something with AI?', 'Now what?', 'Upload the folder', 'Publish', 'It runs', 'Available on the Atlassian Marketplace']) {
      expect(story).toContain(beat);
    }
  });

  it('holds "Now what?" long enough to land, and delays "It runs." until after the reveal', () => {
    const nowWhat = CUES.find((c) => c.text === 'Now what?')!;
    expect(nowWhat.end - nowWhat.start).toBeGreaterThanOrEqual(1.5);
    expect(CUES.find((c) => c.text === 'It runs')!.start).toBeGreaterThanOrEqual(19.0);
  });

  it('formats ASS timestamps', () => {
    expect(assTime(0)).toBe('0:00:00.00');
    expect(assTime(6.45)).toBe('0:00:06.45');
    expect(assTime(75.5)).toBe('0:01:15.50');
  });

  it('renders ASS with a fade on every cue and no typewriter effect', () => {
    const ass = toAss();
    const lines = ass.split('\n').filter((l) => l.startsWith('Dialogue:'));
    // Every cue is one text event; every LOWER cue additionally carries its full-bleed band event.
    expect(lines).toHaveLength(CUES.length + CUES.filter((c) => !c.pos).length);
    for (const l of lines) expect(l).toContain('\\fad(220,220)');
    expect(ass).not.toContain('\\k'); // \k = karaoke/per-syllable reveal
    expect(ass).toContain('PlayResX: 1920');
  });

  it('renders lower cues as ink type on a full-bleed parchment band', () => {
    // The band is a layer-0 drawing event spanning the full frame width (BorderStyle 3 can only box
    // the text's own width), in the icon's ground colour; the text rides layer 1 in ink.
    const ass = toAss();
    const lower = ass.split('\n').find((l) => l.startsWith('Style: Lower'))!;
    const f = lower.replace('Style: ', '').split(',');
    expect(f[3]).toBe('&H003E2315'); // ink text on the light band
    expect(f[15]).toBe('1');          // no per-text box — the band carries the ground
    const band = ass.split('\n').find((l) => l.startsWith('Style: Band'))!;
    expect(band.split(',')[3]).toBe('&H55DDECF4'); // parchment #F4ECDD, ~67% opaque
    const draw = ass.split('\n').filter((l) => l.startsWith('Dialogue: 0,') && l.includes('\\p1'));
    expect(draw.length).toBe(CUES.filter((c) => !c.pos).length); // one band per lower cue
    for (const d of draw) expect(d).toContain('l 1920 0'); // full-bleed, not text-width
    expect(ass.split('\n').find((l) => l.startsWith('Style: Band'))!.split(',')[3]).toBe('&H55DDECF4'); // semi-transparent parchment
  });

  it('gives the end-card cues no plate — bare ink type on the parchment brand frame', () => {
    const end = toAss().split('\n').find((l) => l.startsWith('Style: End'))!;
    const f = end.replace('Style: ', '').split(',');
    expect(f[3]).toBe('&H003E2315'); // ink text, not white — the card is light now
    expect(f[15]).toBe('1');  // BorderStyle 1, no box
    expect(f[16]).toBe('0');  // no outline
    expect(f[17]).toBe('0');  // no shadow either — ink on parchment needs nothing
  });

  it('rejects a cue that breaks the six-word rule', () => {
    const bad = validateCues([{ text: 'one two three four five six seven', start: 0, end: 1 }]);
    expect(bad[0].problem).toContain('max 6');
  });

  it('rejects overlapping cues', () => {
    const bad = validateCues([
      { text: 'a', start: 0, end: 2 },
      { text: 'b', start: 1, end: 3 },
    ]);
    expect(bad.some((p) => p.problem.includes('overlaps'))).toBe(true);
  });
});
