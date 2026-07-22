import { describe, expect, it } from 'vitest';
import { captionRect, cuesDuring, findCollisions, overlaps, projectBox, projectPoint } from './safezone';
import { SHOTS, type Shot } from './shots';
import { CUES } from './captions';
import { focusCentre } from './assemble';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const shot = (o: Partial<Shot> = {}): Shot => ({ id: 'x', t: 0, dur: 1, src: 'act1', at: ['m', 0], evidence: 'proves a thing', ...o });

describe('caption placement geometry', () => {
  it('reproduces the band measured on the rendered film (rows 792-879)', () => {
    const r = captionRect('lower');
    expect(r.y).toBe(792);
    expect(r.y + r.h).toBe(879);
  });

  it('puts the end-card cues lower than the in-film ones, clear of the lockup', () => {
    expect(captionRect('end').y).toBeGreaterThan(captionRect('lower').y);
  });

  it('projects a point through a shot\'s crop and rescale', () => {
    // zoom 2 centred: crop 960x540 at (480,270); the crop centre maps to the frame centre
    expect(projectPoint(960, 540, shot({ zoom: 2 }), { cx: 0.5, cy: 0.5 })).toEqual({ x: 960, y: 540 });
    // a point at the crop's top-left maps to the frame's top-left
    expect(projectPoint(480, 270, shot({ zoom: 2 }), { cx: 0.5, cy: 0.5 })).toEqual({ x: 0, y: 0 });
  });

  it('is identity at zoom 1', () => {
    expect(projectBox({ x: 10, y: 20, width: 30, height: 40 }, shot(), { cx: 0.5, cy: 0.5 }))
      .toEqual({ x: 10, y: 20, w: 30, h: 40 });
  });

  it('a 2x zoom doubles the on-screen size of the clicked control', () => {
    const r = projectBox({ x: 900, y: 500, width: 80, height: 34 }, shot({ zoom: 2 }), { cx: 0.5, cy: 0.5 });
    expect(r.w).toBe(160);
    expect(r.h).toBe(68);
  });

  it('detects overlap only when rectangles actually intersect', () => {
    expect(overlaps({ x: 0, y: 700, w: 100, h: 100 }, { x: 0, y: 792, w: 1920, h: 87 })).toBe(true);
    expect(overlaps({ x: 0, y: 600, w: 100, h: 100 }, { x: 0, y: 792, w: 1920, h: 87 })).toBe(false);
  });

  it('finds the cues on screen during a shot', () => {
    const during = cuesDuring(shot({ t: 19.0, dur: 1.3 }), CUES).map((c) => c.text);
    expect(during).toContain('It runs.');
  });

  it('flags a caption sitting on the control the shot is about', () => {
    const hits = findCollisions(
      () => ({ x: 800, y: 800, width: 120, height: 40 }), // a button inside the caption band
      () => ({ cx: 0.5, cy: 0.5 }),
      [shot({ id: 'bad', at: ['a1_vote_click', 0], t: 1.2, dur: 1.1 })],
      CUES,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].shot).toBe('bad');
  });

  it('THE RULE: no caption covers the control its shot is about, in the shipped film', () => {
    const logs = ['act1', 'act2', 'act3']
      .map((a) => `promo/out/captures/${a}.actions.jsonl`)
      .filter(existsSync)
      .flatMap((p) => readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
    if (!logs.length) return; // captures not present (CI) — the pure geometry tests above still ran
    const boxOf = (mark: string) => logs.find((e) => e.mark === mark)?.box ?? null;
    const collisions = findCollisions(boxOf, (s) => focusCentre(s, logs), SHOTS, CUES);
    expect(collisions).toEqual([]);
  });
});

import { VO_LINES, duckWindows } from './narration';
import { PLAN_35, renderMusic, silenceHoldIsClean } from './audio';

describe('voiceover', () => {
  // Measured durations when the synthesis cache is present, else a conservative word-rate estimate.
  // Kokoro runs ~2.3-2.5 words/sec on these lines, so words/2.2 always over-estimates.
  const lineSeconds = (text: string): number => {
    const dir = 'promo/out/.vo-cache';
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const m = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
        if (m.text === text) return m.seconds;
      }
    }
    return text.trim().split(/\s+/).length / 2.2;
  };

  it('lets ONLY "Now what?" speak inside the hold, and nothing else', () => {
    const [a, b] = [6.30, 8.42];
    for (const l of VO_LINES) {
      const end = l.t + lineSeconds(l.text);
      const inside = l.t < b && end > a;
      if (inside) expect(l.text).toBe('Now what?');
    }
    const hinge = VO_LINES.find((l) => l.text === 'Now what?')!;
    expect(hinge.t).toBeGreaterThanOrEqual(a);
    expect(hinge.t + lineSeconds(hinge.text)).toBeLessThanOrEqual(b);
  });

  it('keeps the BED silent under that line — the voice is the only thing there', () => {
    expect(silenceHoldIsClean(renderMusic(), 6.5, 8.3)).toBe(true);
    expect(PLAN_35.sfx.filter((c) => c.t >= 6.35 && c.t < 8.4)).toEqual([]);
  });

  it('gives the hinge line a delivery, not the default read', () => {
    const hinge = VO_LINES.find((l) => l.text === 'Now what?')!;
    expect(hinge.voice).toBeDefined();
    expect(hinge.stretch).toBeGreaterThan(1);   // slower
    expect(hinge.pitch).toBeLessThan(1);        // lower
    expect(hinge.gain).toBeLessThan(0.92);      // quieter than the explanatory lines
  });

  it('lines never overlap each other', () => {
    for (let i = 1; i < VO_LINES.length; i++) {
      expect(VO_LINES[i].t).toBeGreaterThan(VO_LINES[i - 1].t + lineSeconds(VO_LINES[i - 1].text));
    }
  });

  it('leaves the whole reveal to the picture and the score', () => {
    // 19.0-21.5 is the bloom. A line here ducked it by 6dB to restate the caption.
    const [a, b] = [19.0, 21.5];
    for (const l of VO_LINES) {
      const end = l.t + lineSeconds(l.text);
      expect(l.t >= b || end <= a).toBe(true);
      expect(end).toBeLessThanOrEqual(35.0);
    }
  });

  it('does not read the captions aloud — except the hinge, deliberately', () => {
    const captions = CUES.map((c) => c.text.replace(/\\N/g, ' ').toLowerCase().replace(/[.?]/g, '').trim());
    for (const l of VO_LINES) {
      const norm = l.text.toLowerCase().replace(/[.?]/g, '').trim();
      if (norm === 'now what') continue; // the one intended doubling, in the silence
      expect(captions).not.toContain(norm);
    }
  });

  it('every line justifies what it adds', () => {
    for (const l of VO_LINES) expect(l.why.length).toBeGreaterThan(10);
  });

  it('lines are monotonic and inside the film', () => {
    let prev = -1;
    for (const l of VO_LINES) {
      expect(l.t).toBeGreaterThan(prev);
      expect(l.t).toBeLessThan(35);
      prev = l.t;
    }
  });

  it('ducks the bed around each line, with lead-in and tail', () => {
    const d = duckWindows([{ t: 10, text: 'x', why: 'because' }], new Map([['x', 2]]));
    expect(d[0][0]).toBeLessThan(10);
    expect(d[0][1]).toBeGreaterThan(12);
  });
});
