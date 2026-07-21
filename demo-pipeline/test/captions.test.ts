// Caption cue generation tests (design doc, "Testing and evidence gates": "generate valid non-overlapping
// SRT/VTT cues"). Pure — no network, no credentials, no browser, no filesystem beyond what `loadStory`
// (already covered by story.test.ts) touches to load the real fixed PoC story.
import { describe, expect, it } from 'vitest';
import { compileDemoPlan, SCENE_LEAD_IN_MS, type NarrationDurationsMs } from '../src/plan';
import { loadStory, repoRoot } from '../src/story';
import { buildCaptionCues, CaptionValidationError, toSRT, toVTT, type CaptionCue } from '../src/captions';

const STORY_PATH = `${repoRoot()}/demo-pipeline/stories/mini-site-launch.story.json`;

const FIXED_DURATIONS_MS: NarrationDurationsMs = {
  'start-in-confluence': 3_000,
  'upload-and-publish': 4_500,
  'prove-the-outcome': 2_200,
};

function realPlan() {
  const { story } = loadStory(STORY_PATH);
  return compileDemoPlan(story, FIXED_DURATIONS_MS);
}

describe('buildCaptionCues', () => {
  it('produces one cue per scene, in scene order, with the narration text', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    expect(cues).toHaveLength(3);
    expect(cues.map((c) => c.text)).toEqual(plan.scenes.map((s) => s.narration.script));
    expect(cues.map((c) => c.index)).toEqual([1, 2, 3]);
  });

  it('places each cue starting SCENE_LEAD_IN_MS after its scene start and spanning the narration duration', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    plan.scenes.forEach((scene, i) => {
      expect(cues[i].startMs).toBe(scene.startMs + SCENE_LEAD_IN_MS);
      expect(cues[i].endMs).toBe(cues[i].startMs + scene.narration.durationMs);
    });
  });

  it('is monotonic and non-overlapping: every cue starts at or after the previous cue ends', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].startMs).toBeGreaterThanOrEqual(cues[i - 1].endMs);
    }
  });

  it('is deterministic across two calls with the same plan', () => {
    const plan = realPlan();
    expect(JSON.stringify(buildCaptionCues(plan))).toBe(JSON.stringify(buildCaptionCues(plan)));
  });
});

describe('toSRT', () => {
  it('formats a single cue with a 1-based index and SRT comma-millisecond timestamps', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 500, endMs: 3_500, text: 'Hello world' }];
    const srt = toSRT(cues);
    expect(srt).toBe('1\n00:00:00,500 --> 00:00:03,500\nHello world\n');
  });

  it('formats multiple cues separated by a blank line, in order', () => {
    const cues: CaptionCue[] = [
      { index: 1, startMs: 0, endMs: 1_000, text: 'First' },
      { index: 2, startMs: 2_000, endMs: 3_000, text: 'Second' },
    ];
    const srt = toSRT(cues);
    expect(srt).toBe('1\n00:00:00,000 --> 00:00:01,000\nFirst\n\n2\n00:00:02,000 --> 00:00:03,000\nSecond\n');
  });

  it('renders the real 3-scene story\'s narration and timing into monotonic, non-overlapping SRT cue blocks', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const srt = toSRT(cues);
    const blocks = srt.trim().split('\n\n');
    expect(blocks).toHaveLength(3);
    // Every timestamp line matches SRT's HH:MM:SS,mmm --> HH:MM:SS,mmm format.
    const timestampLines = blocks.map((b) => b.split('\n')[1]);
    for (const line of timestampLines) {
      expect(line).toMatch(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/);
    }
  });

  it('escapes a literal "-->" inside narration text so it cannot be mistaken for a cue timing arrow', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 0, endMs: 1_000, text: 'before --> after' }];
    const srt = toSRT(cues);
    const textLine = srt.split('\n')[2];
    expect(textLine).not.toContain('-->');
    // The visible text is unchanged apart from an invisible zero-width-space break character (U+200B).
    expect(textLine.replace(/​/g, '')).toBe('before --> after');
  });

  it('normalizes CRLF newlines inside narration text to a single safe form', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 0, endMs: 1_000, text: 'line one\r\nline two' }];
    const srt = toSRT(cues);
    expect(srt).toContain('line one\nline two');
    expect(srt).not.toContain('\r');
  });
});

describe('toVTT', () => {
  it('starts with the WEBVTT header followed by a blank line', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 0, endMs: 1_000, text: 'Hello' }];
    const vtt = toVTT(cues);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
  });

  it('formats timestamps with a period millisecond separator (not SRT\'s comma)', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 500, endMs: 3_500, text: 'Hello world' }];
    const vtt = toVTT(cues);
    expect(vtt).toContain('00:00:00.500 --> 00:00:03.500');
    expect(vtt).not.toContain(',');
  });

  it('HTML-escapes reserved characters so narration text can never inject VTT markup', () => {
    const cues: CaptionCue[] = [{ index: 1, startMs: 0, endMs: 1_000, text: 'Tom & Jerry <b>bold</b>' }];
    const vtt = toVTT(cues);
    expect(vtt).toContain('Tom &amp; Jerry &lt;b&gt;bold&lt;/b&gt;');
    expect(vtt).not.toContain('<b>');
  });

  it('renders the real 3-scene story\'s narration and timing into monotonic, non-overlapping VTT cue blocks', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const vtt = toVTT(cues);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    const body = vtt.slice('WEBVTT\n\n'.length).trim();
    const blocks = body.split('\n\n');
    expect(blocks).toHaveLength(3);
    const timestampLines = blocks.map((b) => b.split('\n')[1]);
    for (const line of timestampLines) {
      expect(line).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}$/);
    }
  });
});

describe('buildCaptionCues: rejects a construction that would produce overlapping cues', () => {
  it('throws CaptionValidationError given a hand-built plan whose scenes overlap', () => {
    const overlappingPlan = {
      schemaVersion: 1 as const,
      product: { name: 'x', build: 'dev' },
      objective: 'x',
      observableClaim: { text: 'x' },
      totalDurationMs: 1_000,
      scenes: [
        {
          id: 'a',
          title: 'A',
          operations: [{ type: 'openMacro' as const }],
          narration: { script: 'first', durationMs: 1_000 },
          startMs: 0,
          endMs: 2_000,
          durationMs: 2_000,
        },
        {
          id: 'b',
          title: 'B',
          operations: [{ type: 'gotoPreview' as const }],
          // Second scene starts before the first scene's cue (startMs 500 + durationMs 1000 = ends at 1500)
          // finishes — an impossible plan that only a hand-built fixture (not compileDemoPlan) can produce.
          narration: { script: 'second', durationMs: 1_000 },
          startMs: 500,
          endMs: 2_000,
          durationMs: 1_500,
        },
      ],
    };
    expect(() => buildCaptionCues(overlappingPlan)).toThrow(CaptionValidationError);
  });
});
