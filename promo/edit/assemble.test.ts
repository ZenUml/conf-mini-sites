import { describe, expect, it } from 'vitest';
import { FILM_DURATION, SHOTS, requiredSources, validateShots, type Shot } from './shots';
import { CUES_15, CUT15_DURATION, SHOTS_15 } from './cut15';
import { validateCues } from './captions';
import { FPS, buildMarkMap, focusCentre, frameCount, markTime, parseBlackdetect, shotArgs, shotFilters, zoomFilter } from './assemble';

const shot = (over: Partial<Shot> = {}): Shot => ({
  id: 'x', t: 0, dur: 1, src: 'act1', at: ['m', 0], evidence: 'proves something', ...over,
});

describe('beat sheet', () => {
  it('is structurally sound and exactly 35 seconds', () => {
    expect(validateShots()).toEqual([]);
    const total = SHOTS.reduce((n, s) => n + s.dur, 0);
    expect(total).toBeCloseTo(FILM_DURATION, 6);
  });

  it('is gapless — every shot starts where the last one ended', () => {
    let t = 0;
    for (const s of SHOTS) {
      expect(s.t).toBeCloseTo(t, 6);
      t += s.dur;
    }
  });

  it('honours the two non-negotiable holds', () => {
    expect(SHOTS.find((s) => s.id === 'it-runs')!.dur).toBeGreaterThanOrEqual(1.0);
    const nowWhat = SHOTS.find((s) => s.id === 'now-what')!;
    expect(nowWhat.dur).toBeGreaterThanOrEqual(1.5);
    expect(nowWhat.dim).toBeGreaterThan(0);
  });

  it('never clicks during the magic beat — it-runs is anchored to the reveal, not to an interaction', () => {
    // a2_live is the frame where the mini-site first renders after publishing. Anchoring the magic
    // beat to any *_click mark would put a cursor action inside the one shot that must be untouched.
    const magic = SHOTS.find((s) => s.id === 'it-runs')!;
    expect(magic.at![0]).toBe('a2_live');
    expect(magic.at![0]).not.toMatch(/click/);
  });

  it('every shot declares what it proves', () => {
    for (const s of SHOTS) expect(s.evidence.length).toBeGreaterThan(7);
  });

  it('rounds to a whole number of frames at 30fps for the whole film', () => {
    const frames = SHOTS.reduce((n, s) => n + frameCount(s), 0);
    expect(frames).toBe(Math.round(FILM_DURATION * FPS));
  });

  it('names the sources it needs', () => {
    expect(requiredSources().sort()).toEqual(['act1', 'act2', 'act3', 'endcard']);
  });

  it('rejects a beat sheet with a gap', () => {
    const problems = validateShots([shot({ id: 'a', t: 0, dur: 1 }), shot({ id: 'b', t: 2, dur: 1 })], 3);
    expect(problems.some((p) => p.problem.includes('gap or overlap'))).toBe(true);
  });

  it('rejects a shot with no evidence claim', () => {
    const problems = validateShots([shot({ id: 'a', t: 0, dur: 1, evidence: '' })], 1);
    expect(problems.some((p) => p.problem.includes('evidence'))).toBe(true);
  });
});

 describe('the :15 cut', () => {
  it('is a valid, gapless beat sheet of exactly 15 seconds', () => {
    expect(validateShots(SHOTS_15, CUT15_DURATION, { magic: 1.0, nowWhat: 1.0 })).toEqual([]);
    expect(SHOTS_15.reduce((n, s) => n + s.dur, 0)).toBeCloseTo(CUT15_DURATION, 6);
  });

  it('lands on a whole number of frames', () => {
    expect(SHOTS_15.reduce((n, s) => n + frameCount(s), 0)).toBe(Math.round(CUT15_DURATION * FPS));
  });

  it('still refuses a :15 that trims the magic beat below one second', () => {
    const trimmed = SHOTS_15.map((s) => (s.id === 'it-runs' ? { ...s, dur: 0.6 } : s));
    const problems = validateShots(trimmed, CUT15_DURATION - 0.7, { magic: 1.0, nowWhat: 1.0 });
    expect(problems.some((p) => p.id === 'it-runs')).toBe(true);
  });

  it('keeps the magic hold at >= 1.0s even at a third of the runtime', () => {
    const magic = SHOTS_15.find((s) => s.id === 'it-runs')!;
    expect(magic.dur).toBeGreaterThanOrEqual(1.0);
    expect(magic.at![0]).toBe('a2_live');
  });

  it('still obeys the caption rules', () => {
    expect(validateCues(CUES_15, CUT15_DURATION)).toEqual([]);
  });

  it('reuses the same captures — it introduces no new source', () => {
    const sources = new Set(SHOTS_15.map((s) => s.src));
    for (const src of sources) expect(['act1', 'act2', 'act3', 'endcard']).toContain(src);
  });
});

describe('clap-anchored mark resolution', () => {
  it('parses a blackdetect line', () => {
    expect(parseBlackdetect('[blackdetect @ 0x1] black_start:0.400 black_end:0.540 black_duration:0.14'))
      .toEqual({ start: 0.4, end: 0.54 });
    expect(parseBlackdetect('nothing here')).toBeNull();
  });

  it('maps wall-clock marks onto video time using the clap midpoints', () => {
    // clap spans 300-440ms wall (mid 370ms) and 0.40-0.54s video (mid 0.47s) => +0.10s offset
    const map = buildMarkMap(
      [
        { mark: 'clap_on', t: 300 },
        { mark: 'clap_off', t: 440 },
        { mark: 'a1_vote_click', t: 3370 },
      ],
      { start: 0.4, end: 0.54 },
    );
    expect(map.get('a1_vote_click')).toBeCloseTo(3.47, 6);
  });

  it('applies the shot offset and never seeks before zero', () => {
    const map = new Map([['m', 3.0]]);
    expect(markTime(map, shot({ at: ['m', -0.35] }))).toBeCloseTo(2.65, 6);
    expect(markTime(map, shot({ at: ['m', -99] }))).toBe(0);
  });

  it('fails loudly, and usefully, when a capture never emitted the mark the edit wants', () => {
    const map = new Map([['a1_vote_click', 1]]);
    expect(() => markTime(map, shot({ id: 'oops', at: ['a1_nope', 0] })))
      .toThrow(/never emitted mark "a1_nope".*a1_vote_click/s);
  });

  it('rejects a log with no clap', () => {
    expect(() => buildMarkMap([{ mark: 'a', t: 1 }], { start: 0, end: 1 })).toThrow(/clap_on/);
  });
});

describe('shot filters', () => {
  it('is a no-op at zoom 1', () => {
    expect(zoomFilter(1)).toEqual([]);
  });

  it('crops around the requested centre and scales back to frame', () => {
    expect(zoomFilter(2, 0.5, 0.5)).toEqual(['crop=960:540:480:270', 'scale=1920:1080:flags=lanczos']);
  });

  it('clamps the crop window inside the frame instead of letting ffmpeg fail mid-render', () => {
    const [crop] = zoomFilter(2, 0.0, 0.0);
    expect(crop).toBe('crop=960:540:0:0');
    const [cropMax] = zoomFilter(2, 1.0, 1.0);
    expect(cropMax).toBe('crop=960:540:960:540');
  });

  it('refuses zoom < 1 with an explanation of how pull-backs are actually staged', () => {
    expect(() => zoomFilter(0.8)).toThrow(/pull-backs are staged/);
  });

  it('orders speed before zoom and always normalises fps/sar last', () => {
    const f = shotFilters(shot({ speed: 3, zoom: 2 }));
    expect(f[0]).toBe('setpts=PTS/3');
    expect(f[1]).toContain('crop=');
    expect(f.slice(-3)).toEqual(['fps=30', 'scale=1920:1080', 'setsar=1']);
  });

  it('dims and desaturates together for the "Now what?" beat', () => {
    const f = shotFilters(shot({ dim: 0.55 }));
    expect(f).toContain('eq=brightness=-0.413:saturation=0.615');
  });

  it('fades in only where the beat sheet asks for it', () => {
    expect(shotFilters(shot({ fadeIn: 0.35 })).some((x) => x.startsWith('fade='))).toBe(true);
    expect(shotFilters(shot()).some((x) => x.startsWith('fade='))).toBe(false);
  });
});

describe('measured framing', () => {
  const entries = [
    { mark: 'a3_vote_click', t: 1000, box: { x: 760, y: 480, width: 100, height: 40 } },
    { mark: 'a3_embed_box', t: 900, box: { x: 300, y: 200, width: 1200, height: 600 } },
  ];

  it('centres a close-up on the element the capture recorded clicking', () => {
    const c = focusCentre({ id: 'r', t: 0, dur: 1, src: 'act3', at: ['a3_vote_click', 0], zoom: 2.6, focus: 'target', evidence: 'x'.repeat(9) }, entries);
    expect(c.cx).toBeCloseTo(810 / 1920, 5);
    expect(c.cy).toBeCloseTo(500 / 1080, 5);
  });

  it('centres on the macro rect for embed-focused shots, honouring fx/fy', () => {
    const mid = focusCentre({ id: 'e', t: 0, dur: 1, src: 'act3', at: ['a3_vote_click', 0], zoom: 1.15, focus: 'embed', evidence: 'x'.repeat(9) }, entries);
    expect(mid.cx).toBeCloseTo(900 / 1920, 5);
    expect(mid.cy).toBeCloseTo(500 / 1080, 5);
    const right = focusCentre({ id: 'e', t: 0, dur: 1, src: 'act3', at: ['a3_vote_click', 0], zoom: 2.2, focus: 'embed', fx: 0.8, fy: 0.45, evidence: 'x'.repeat(9) }, entries);
    expect(right.cx).toBeCloseTo((300 + 1200 * 0.8) / 1920, 5);
  });

  it('can borrow another mark\'s geometry via focusMark', () => {
    const c = focusCentre({ id: 'q', t: 0, dur: 1, src: 'act3', at: ['some_beat', 0], zoom: 1.7, focus: 'target', focusMark: 'a3_vote_click', evidence: 'x'.repeat(9) }, entries);
    expect(c.cx).toBeCloseTo(810 / 1920, 5);
  });

  it('falls back to the authored centre when the capture recorded no box', () => {
    const c = focusCentre({ id: 'r', t: 0, dur: 1, src: 'act3', at: ['nope', 0], zoom: 2, focus: 'target', cx: 0.25, cy: 0.75, evidence: 'x'.repeat(9) }, []);
    expect(c).toEqual({ cx: 0.25, cy: 0.75 });
  });

  it('ignores focus entirely for shots that authored no zoom', () => {
    const c = focusCentre({ id: 'p', t: 0, dur: 1, src: 'act3', at: ['a3_vote_click', 0], evidence: 'x'.repeat(9) }, entries);
    expect(c).toEqual({ cx: 0.5, cy: 0.5 });
  });
});

describe('ffmpeg argv', () => {
  it('cuts a moving shot with -ss before -i and a hard frame count', () => {
    const args = shotArgs(shot({ dur: 1.1 }), '/tmp/act1.webm', 2.65, '/tmp/out.mp4');
    expect(args.join(' ')).toContain('-ss 2.650 -i /tmp/act1.webm');
    expect(args[args.indexOf('-frames:v') + 1]).toBe('33'); // 1.1s * 30fps
    expect(args).toContain('-an');
  });

  it('loops a still for end-card shots instead of seeking into a video', () => {
    const args = shotArgs(shot({ src: 'endcard', at: ['card1', 0], dur: 1.05 }), '/tmp/card1.png', 0, '/tmp/o.mp4');
    expect(args.join(' ')).toContain('-loop 1 -i /tmp/card1.png');
    expect(args).not.toContain('-ss');
  });

  it('passes arguments as an array — nothing is shell-interpolated', () => {
    for (const a of shotArgs(shot(), '/tmp/a b.webm', 0, '/tmp/o.mp4')) expect(typeof a).toBe('string');
  });
});
