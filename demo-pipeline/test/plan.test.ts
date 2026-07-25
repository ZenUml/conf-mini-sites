// DemoPlan compiler tests (design doc, "Testing and evidence gates": "compile stable scene order and timing
// from fixed narration durations"). Pure — no network, no credentials, no browser, no filesystem beyond what
// `loadStory` (already covered by story.test.ts) touches to load the real fixed PoC story.
import { describe, expect, it } from 'vitest';
import { loadStory, repoRoot } from '../src/story';
import { compileDemoPlan, PlanValidationError, SCENE_LEAD_IN_MS, SCENE_LEAD_OUT_MS, type NarrationDurationsMs } from '../src/plan';

const STORY_PATH = `${repoRoot()}/demo-pipeline/stories/mini-site-launch.story.json`;

/** Fixed, made-up narration durations for the real 3-scene story, keyed by the real scene ids. Values are
 *  deliberately distinct per scene so a test bug that swaps two scenes' timing would be caught. */
const FIXED_DURATIONS_MS: NarrationDurationsMs = {
  'start-in-confluence': 3_000,
  'upload-and-publish': 4_500,
  'prove-the-outcome': 2_200,
};

describe('compileDemoPlan: deterministic scene order and timing', () => {
  it('produces scenes in the same order as the StorySpec', () => {
    const { story } = loadStory(STORY_PATH);
    const plan = compileDemoPlan(story, FIXED_DURATIONS_MS);
    expect(plan.scenes.map((s) => s.id)).toEqual(['start-in-confluence', 'upload-and-publish', 'prove-the-outcome']);
  });

  it('is byte-identical (via JSON) across two compilations of the same inputs', () => {
    const { story } = loadStory(STORY_PATH);
    const first = compileDemoPlan(story, FIXED_DURATIONS_MS);
    const second = compileDemoPlan(story, FIXED_DURATIONS_MS);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('computes exact start/end/duration per scene as leadIn + narrationDuration + leadOut, back to back', () => {
    const { story } = loadStory(STORY_PATH);
    const plan = compileDemoPlan(story, FIXED_DURATIONS_MS);

    const expectedDurations = [
      SCENE_LEAD_IN_MS + 3_000 + SCENE_LEAD_OUT_MS,
      SCENE_LEAD_IN_MS + 4_500 + SCENE_LEAD_OUT_MS,
      SCENE_LEAD_IN_MS + 2_200 + SCENE_LEAD_OUT_MS,
    ];

    let cursor = 0;
    plan.scenes.forEach((scene, i) => {
      expect(scene.durationMs).toBe(expectedDurations[i]);
      expect(scene.startMs).toBe(cursor);
      expect(scene.endMs).toBe(cursor + expectedDurations[i]);
      cursor += expectedDurations[i];
    });
    expect(plan.totalDurationMs).toBe(cursor);
  });

  it('carries each scene\'s operations and narration script through unchanged', () => {
    const { story } = loadStory(STORY_PATH);
    const plan = compileDemoPlan(story, FIXED_DURATIONS_MS);

    const uploadScene = plan.scenes.find((s) => s.id === 'upload-and-publish');
    expect(uploadScene?.operations.map((op) => op.type)).toEqual(['openPublisher', 'selectFiles', 'publishAndAwait']);
    expect(uploadScene?.narration.script).toBe(
      'Open the publisher, select a multi-file bundle, and publish it — no build step, no separate hosting to configure.',
    );
    expect(uploadScene?.narration.durationMs).toBe(4_500);
  });

  it('carries the observable claim and product metadata through from the StorySpec', () => {
    const { story } = loadStory(STORY_PATH);
    const plan = compileDemoPlan(story, FIXED_DURATIONS_MS);
    expect(plan.observableClaim.text).toBe('Mini-Site is live');
    expect(plan.product).toEqual({ name: 'Mini Site for Confluence', build: 'dev' });
    expect(plan.schemaVersion).toBe(1);
  });
});

describe('compileDemoPlan: rejects invalid narration durations', () => {
  it('rejects a zero narration duration', () => {
    const { story } = loadStory(STORY_PATH);
    const durations = { ...FIXED_DURATIONS_MS, 'start-in-confluence': 0 };
    expect(() => compileDemoPlan(story, durations)).toThrow(PlanValidationError);
    expect(() => compileDemoPlan(story, durations)).toThrow(/positive/);
  });

  it('rejects a negative narration duration', () => {
    const { story } = loadStory(STORY_PATH);
    const durations = { ...FIXED_DURATIONS_MS, 'upload-and-publish': -100 };
    expect(() => compileDemoPlan(story, durations)).toThrow(PlanValidationError);
  });

  it('rejects a durations map missing an entry for a scene', () => {
    const { story } = loadStory(STORY_PATH);
    const { 'prove-the-outcome': _omit, ...durations } = FIXED_DURATIONS_MS;
    expect(() => compileDemoPlan(story, durations)).toThrow(/missing narration duration/);
  });

  it('rejects a durations map with an entry for an unknown scene id', () => {
    const { story } = loadStory(STORY_PATH);
    const durations = { ...FIXED_DURATIONS_MS, 'scene-does-not-exist': 1_000 };
    expect(() => compileDemoPlan(story, durations)).toThrow(/unknown scene id/);
  });
});
