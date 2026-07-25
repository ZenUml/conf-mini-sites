import { describe, expect, it } from 'vitest';
import { CUES, validateCues } from './captions';
import { CUES_VO, VO_CAPTION_KEEP, VO_LINES } from './narration';

// Guards the voice/print separation rule (user note 2026-07-22): in the VO cut, a viewer must never
// read one sentence while hearing a different one.
describe('VO caption track', () => {
  it('is a subset of the master cues with timings untouched', () => {
    for (const cue of CUES_VO) expect(CUES).toContain(cue);
  });

  it('keeps exactly the cues on the keep-list, in master order', () => {
    expect(CUES_VO.map((c) => c.text)).toEqual(CUES.filter((c) => VO_CAPTION_KEEP.has(c.text)).map((c) => c.text));
    expect(CUES_VO.length).toBe(VO_CAPTION_KEEP.size);
  });

  it('still validates as a standalone cue list', () => {
    expect(validateCues(CUES_VO, 35)).toEqual([]);
  });

  it('prints no spoken sentence except the deliberate voice=text hinge', () => {
    const spoken = new Set(VO_LINES.map((l) => l.text));
    for (const cue of CUES_VO) {
      if (cue.text === 'Now what?') continue;
      expect(spoken.has(cue.text.replace(/\\N/g, ' '))).toBe(false);
    }
  });

  it('keeps the hinge: "Now what?" is printed AND spoken', () => {
    expect(CUES_VO.some((c) => c.text === 'Now what?')).toBe(true);
    expect(VO_LINES.some((l) => l.text === 'Now what?')).toBe(true);
  });
});
