// Versioned contracts for the agent-first demo pipeline (design doc: "Contracts" section).
//
// This module owns ONLY schema definitions and pure serialization/hash helpers — no file-system access, no
// story loading. `story.ts` imports from here (not the other way around) and does the disk-touching work of
// loading a StorySpec, resolving evidence paths, and hashing evidence file contents.
//
// Every artifact in the pipeline carries `schemaVersion: 1` (design doc, "every artifact ... is written as
// JSON" with a schema version). Unknown versions must fail validation rather than being silently coerced.
import { createHash } from 'node:crypto';
import { z } from 'zod';

/** The only StorySpec schema version this PoC understands. A story with any other value is rejected — see
 *  `StorySpecSchema`'s `schemaVersion: z.literal(1)` field below. */
export const STORY_SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------------------------------------
// Semantic scene operations — a CLOSED, discriminated vocabulary.
//
// StorySpec must never expose arbitrary JavaScript execution (design doc, "Story and demo flow": "It does not
// expose arbitrary JavaScript execution in StorySpec"). Every operation below maps 1:1 to an existing,
// already-proven helper in tests/e2e/helpers/forge.ts (openMacro, openPublisher, selectFiles, selectFolder,
// publishAndAwait, gotoPreview). A compiler (plan.ts, Task 3) turns these into a DemoPlan; a runner
// (confluenceRunner.ts, Task 6) turns a DemoPlan into real Playwright calls against those exact helpers.
// Adding a new capability means adding a new literal variant here, not loosening this union.
// ---------------------------------------------------------------------------------------------------------

/** Open the fixed macro page and wait for the launcher (Add/Edit) frame — tests/e2e/helpers/forge.ts#openMacro. */
export const OpenMacroOperationSchema = z
  .object({
    type: z.literal('openMacro'),
  })
  .strict();

/** Click the launcher's Add/Edit button and wait for the Publisher modal frame — #openPublisher. */
export const OpenPublisherOperationSchema = z
  .object({
    type: z.literal('openPublisher'),
  })
  .strict();

/** Upload a flat file list via `setInputFiles` (no native picker) — #selectFiles. `evidenceIds` references
 *  entries in the StorySpec's top-level `evidence` array by id; the loader resolves them to real file paths. */
export const SelectFilesOperationSchema = z
  .object({
    type: z.literal('selectFiles'),
    evidenceIds: z.array(z.string().min(1)).min(1),
  })
  .strict();

/** Upload a directory, preserving nested paths (webkitRelativePath) — #selectFolder. `evidenceId` references a
 *  single directory entry in the top-level `evidence` array. */
export const SelectFolderOperationSchema = z
  .object({
    type: z.literal('selectFolder'),
    evidenceId: z.string().min(1),
  })
  .strict();

/** Click "Validate & publish" and wait for the handoff ("See it live") or error notice — #publishAndAwait. */
export const PublishAndAwaitOperationSchema = z
  .object({
    type: z.literal('publishAndAwait'),
    timeoutMs: z.number().int().positive().optional(),
  })
  .strict();

/** Click "See it live" and wait for the dispatched mini-site frame to load — #gotoPreview. */
export const GotoPreviewOperationSchema = z
  .object({
    type: z.literal('gotoPreview'),
  })
  .strict();

export const SceneOperationSchema = z.discriminatedUnion('type', [
  OpenMacroOperationSchema,
  OpenPublisherOperationSchema,
  SelectFilesOperationSchema,
  SelectFolderOperationSchema,
  PublishAndAwaitOperationSchema,
  GotoPreviewOperationSchema,
]);

export type SceneOperation = z.infer<typeof SceneOperationSchema>;

// ---------------------------------------------------------------------------------------------------------
// Evidence, scenes, narration, and the overall StorySpec.
// ---------------------------------------------------------------------------------------------------------

/** A reference to a real file (or directory, for `selectFolder`) in this repository. `path` is relative to the
 *  repository root; `story.ts` is the only place that touches the filesystem to resolve/hash it. */
export const EvidenceReferenceSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    path: z.string().min(1),
  })
  .strict();

export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const SceneSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    operations: z.array(SceneOperationSchema).min(1),
  })
  .strict();

export type Scene = z.infer<typeof SceneSchema>;

/** One narration script per scene, kept as a separate top-level collection (design doc lists "scenes,
 *  narration" as sibling StorySpec fields) so `plan.ts` can validate narration/scene correspondence — every
 *  scene must have exactly one narration entry, and vice versa — independent of scene authoring. */
export const NarrationEntrySchema = z
  .object({
    sceneId: z.string().min(1),
    script: z.string().min(1),
  })
  .strict();

export type NarrationEntry = z.infer<typeof NarrationEntrySchema>;

/** The single observable claim a viewer (and the runner's own assertion) can check against the final preview
 *  — e.g. "the mini-site body contains this text". Must be non-empty and non-whitespace. */
export const ObservableClaimSchema = z
  .object({
    text: z.string().trim().min(1),
  })
  .strict();

export type ObservableClaim = z.infer<typeof ObservableClaimSchema>;

export const StorySpecSchema = z
  .object({
    schemaVersion: z.literal(STORY_SCHEMA_VERSION),
    product: z
      .object({
        name: z.string().min(1),
        build: z.string().min(1),
      })
      .strict(),
    objective: z.string().min(1),
    audience: z.string().min(1),
    evidence: z.array(EvidenceReferenceSchema).min(1),
    scenes: z.array(SceneSchema).min(1),
    narration: z.array(NarrationEntrySchema).min(1),
    observableClaim: ObservableClaimSchema,
  })
  .strict()
  .superRefine((story, ctx) => {
    // Duplicate scene IDs.
    const sceneIds = story.scenes.map((s) => s.id);
    for (const dup of duplicates(sceneIds)) {
      ctx.addIssue({ code: 'custom', message: `duplicate scene id: ${dup}`, path: ['scenes'] });
    }
    const sceneIdSet = new Set(sceneIds);

    // Duplicate evidence IDs.
    const evidenceIds = story.evidence.map((e) => e.id);
    for (const dup of duplicates(evidenceIds)) {
      ctx.addIssue({ code: 'custom', message: `duplicate evidence id: ${dup}`, path: ['evidence'] });
    }
    const evidenceIdSet = new Set(evidenceIds);

    // Narration/scene correspondence: every scene has exactly one narration entry, and every narration entry
    // refers to a real scene (design doc, "Runtime validation rejects ... narration/scene mismatches").
    const narrationSceneIds = story.narration.map((n) => n.sceneId);
    for (const dup of duplicates(narrationSceneIds)) {
      ctx.addIssue({ code: 'custom', message: `duplicate narration entry for scene id: ${dup}`, path: ['narration'] });
    }
    const narrationSceneIdSet = new Set(narrationSceneIds);
    for (const sceneId of sceneIdSet) {
      if (!narrationSceneIdSet.has(sceneId)) {
        ctx.addIssue({ code: 'custom', message: `scene "${sceneId}" has no narration entry`, path: ['narration'] });
      }
    }
    for (const sceneId of narrationSceneIdSet) {
      if (!sceneIdSet.has(sceneId)) {
        ctx.addIssue({ code: 'custom', message: `narration entry references unknown scene id: ${sceneId}`, path: ['narration'] });
      }
    }

    // Every evidenceId referenced by a selectFiles/selectFolder operation must be declared in `evidence`.
    for (const [sceneIndex, scene] of story.scenes.entries()) {
      for (const [opIndex, op] of scene.operations.entries()) {
        const referenced = op.type === 'selectFiles' ? op.evidenceIds : op.type === 'selectFolder' ? [op.evidenceId] : [];
        for (const evidenceId of referenced) {
          if (!evidenceIdSet.has(evidenceId)) {
            ctx.addIssue({
              code: 'custom',
              message: `scene "${scene.id}" operation ${opIndex} references unknown evidence id: ${evidenceId}`,
              path: ['scenes', sceneIndex, 'operations', opIndex],
            });
          }
        }
      }
    }
  });

export type StorySpec = z.infer<typeof StorySpecSchema>;

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dups.add(v);
    seen.add(v);
  }
  return [...dups];
}

// ---------------------------------------------------------------------------------------------------------
// Canonical JSON serialization + SHA-256 helpers.
//
// Canonicalization sorts object keys recursively (arrays keep their order) so the same logical value always
// serializes to the same bytes, regardless of the order keys were constructed in — a prerequisite for stable
// content hashes across runs, machines, and JS engines.
// ---------------------------------------------------------------------------------------------------------

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) result[key] = canonicalize(val);
    return result;
  }
  return value;
}

/** Deterministic JSON serialization: object keys sorted recursively, array order preserved. */
export function canonicalJSONStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** SHA-256 of raw bytes/text, hex-encoded. */
export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/** SHA-256 of a value's canonical JSON form — the hash two independently-constructed but logically identical
 *  objects will agree on. */
export function sha256OfCanonicalJSON(value: unknown): string {
  return sha256Hex(canonicalJSONStringify(value));
}
