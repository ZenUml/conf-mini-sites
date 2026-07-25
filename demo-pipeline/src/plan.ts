// Pure StorySpec + NarrationDurations -> DemoPlan compiler (design doc, "Data flow and timing", step 3:
// "Compile a DemoPlan whose minimum scene duration is narration duration plus fixed lead-in/lead-out
// padding").
//
// This module is deliberately pure: it imports only types from `contracts.ts`, does no filesystem or
// network I/O, and never reads the wall clock or generates randomness. The same `StorySpec` plus the same
// narration-durations map always compiles to a byte-identical `DemoPlan` (verified by
// `test/plan.test.ts`'s "byte-identical across two compilations" case). Narration audio itself doesn't exist
// yet at this point in the pipeline (design doc, step 2, is Task 4's job) — this compiler only *consumes*
// externally-measured clip durations, passed in by the caller, and never synthesizes or measures audio.
//
// Time unit: milliseconds everywhere in this pipeline (matches `contracts.ts`'s `PublishAndAwaitOperation
// .timeoutMs` and the monotonic clock `timeline.ts` reads from) — `captions.ts` and `timeline.ts` both build
// on `DemoPlan` and must stay in the same unit.
import type { ObservableClaim, SceneOperation, StorySpec } from './contracts';

/** The only DemoPlan schema version this PoC understands (design doc, "every artifact ... is written as
 *  JSON" with `schemaVersion: 1`). */
export const DEMO_PLAN_SCHEMA_VERSION = 1 as const;

/** Fixed padding added on top of a scene's narration clip length to get its minimum on-screen duration
 *  (design doc, "Data flow and timing": "minimum scene duration is narration duration plus fixed
 *  lead-in/lead-out padding"). Lead-in gives the capture a moment to visually settle — frame loaded, any
 *  transition finished — before narration starts; lead-out keeps the final state on screen for a beat after
 *  narration ends, before the next scene's operations begin. Exported as named constants (not inlined) so
 *  `captions.ts` can derive each cue's placement inside its scene without duplicating the value, and so
 *  later tasks (Task 5's EDL builder) can reason about the same padding without recomputing it. Milliseconds.
 */
export const SCENE_LEAD_IN_MS = 500;
export const SCENE_LEAD_OUT_MS = 500;

/** Raised for every DemoPlan compilation failure: non-positive narration duration, a durations map missing
 *  an entry for a scene, or a durations map with an entry for a scene id the StorySpec doesn't have. Mirrors
 *  `story.ts`'s `StoryValidationError` — one error type keeps assertions uniform regardless of which check
 *  failed. */
export class PlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

/** sceneId -> measured narration clip duration, in milliseconds. Durations are measured externally (Task 4
 *  synthesizes narration audio and probes its exact length); this compiler only consumes them as input — it
 *  never synthesizes or measures audio itself. Every scene id in the StorySpec must have exactly one entry
 *  here, and every entry here must reference a real scene id — see `compileDemoPlan`'s validation. */
export type NarrationDurationsMs = Readonly<Record<string, number>>;

/** One compiled scene: the StorySpec scene's operations and narration carried through unchanged, plus this
 *  compiler's computed timing. `startMs`/`endMs` are offsets from the start of the whole plan (0 for the
 *  first scene), not wall-clock timestamps — `timeline.ts`'s `ActionEvent`s carry the actual wall/monotonic
 *  timestamps when a run executes this plan. */
export interface DemoPlanScene {
  readonly id: string;
  readonly title: string;
  readonly operations: readonly SceneOperation[];
  readonly narration: {
    readonly script: string;
    readonly durationMs: number;
  };
  readonly startMs: number;
  readonly endMs: number;
  readonly durationMs: number;
}

/** The compiled plan: ordered scenes with project-aware operations, expected outcome, narration reference,
 *  and timing bounds (design doc, "Contracts": "DemoPlan: ordered scenes with project-aware operations,
 *  expected outcome, narration reference, and timing bounds"). `observableClaim` is carried at the top level
 *  (not duplicated per-scene) since it names the outcome the *final* scene proves — see
 *  `confluenceRunner.ts` (Task 6), which will assert it after the last scene's operations run. */
export interface DemoPlan {
  readonly schemaVersion: typeof DEMO_PLAN_SCHEMA_VERSION;
  readonly product: StorySpec['product'];
  readonly objective: string;
  readonly observableClaim: ObservableClaim;
  readonly scenes: readonly DemoPlanScene[];
  readonly totalDurationMs: number;
}

/** Compile a validated `StorySpec` (from `story.ts`/`contracts.ts`) plus externally-measured narration clip
 *  durations into a deterministic `DemoPlan`. Scenes keep the StorySpec's own order. Each scene's duration is
 *  `SCENE_LEAD_IN_MS + narrationDurationMs + SCENE_LEAD_OUT_MS`; scenes are packed back-to-back starting at 0
 *  with no gaps and no overlap.
 *
 *  Throws `PlanValidationError` if `narrationDurationsMs` has an entry for a scene id the story doesn't have,
 *  is missing an entry for a scene id the story does have, or has a non-positive (zero or negative) duration
 *  for any scene. */
export function compileDemoPlan(story: StorySpec, narrationDurationsMs: NarrationDurationsMs): DemoPlan {
  const sceneIds = new Set(story.scenes.map((scene) => scene.id));
  for (const key of Object.keys(narrationDurationsMs)) {
    if (!sceneIds.has(key)) {
      throw new PlanValidationError(`narration durations map references unknown scene id: ${key}`);
    }
  }

  const narrationByScene = new Map(story.narration.map((entry) => [entry.sceneId, entry]));

  let cursorMs = 0;
  const scenes: DemoPlanScene[] = story.scenes.map((scene) => {
    const narrationDurationMs = narrationDurationsMs[scene.id];
    if (narrationDurationMs === undefined) {
      throw new PlanValidationError(`missing narration duration for scene id: ${scene.id}`);
    }
    if (!Number.isFinite(narrationDurationMs) || narrationDurationMs <= 0) {
      throw new PlanValidationError(`narration duration for scene id "${scene.id}" must be positive, got: ${narrationDurationMs}`);
    }

    // Guaranteed present by StorySpecSchema's superRefine (every scene has exactly one narration entry) —
    // this is a defensive check, not a reachable path for a StorySpec that has already passed `parseStory`.
    const narrationEntry = narrationByScene.get(scene.id);
    if (!narrationEntry) {
      throw new PlanValidationError(`scene id "${scene.id}" has no narration entry in the StorySpec`);
    }

    const durationMs = SCENE_LEAD_IN_MS + narrationDurationMs + SCENE_LEAD_OUT_MS;
    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    cursorMs = endMs;

    return {
      id: scene.id,
      title: scene.title,
      operations: scene.operations,
      narration: { script: narrationEntry.script, durationMs: narrationDurationMs },
      startMs,
      endMs,
      durationMs,
    };
  });

  return {
    schemaVersion: DEMO_PLAN_SCHEMA_VERSION,
    product: story.product,
    objective: story.objective,
    observableClaim: story.observableClaim,
    scenes,
    totalDurationMs: cursorMs,
  };
}
