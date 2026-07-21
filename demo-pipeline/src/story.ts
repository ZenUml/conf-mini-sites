// StorySpec loading, validation, and evidence resolution (design doc: "Data flow and timing", step 1 —
// "Load and validate StorySpec; record the product Git SHA and evidence file hashes").
//
// This module owns disk access. `contracts.ts` stays pure (schema + hash/serialization helpers only); this
// file is the only place that reads story JSON off disk, resolves evidence paths against the repository root,
// and hashes evidence file contents. Evidence existence is verified here, synchronously, before the caller
// gets a loaded story back — so a missing file fails BEFORE any browser/external operation would run (design
// doc, "Runtime validation rejects ... missing evidence ... before browser execution").
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256Hex, StorySpecSchema, type EvidenceReference, type StorySpec } from './contracts';

/** Raised for every story-loading failure: schema violations (formatted from the underlying ZodError),
 *  path-traversal attempts, and missing evidence files. One error type keeps `story.test.ts` assertions
 *  (`expect(() => ...).toThrow(StoryValidationError)`) uniform regardless of which check failed. */
export class StoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryValidationError';
  }
}

/** An evidence reference resolved against the repository root, with its file bytes hashed. */
export interface ResolvedEvidence {
  readonly id: string;
  readonly description: string;
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly sha256: string;
}

export interface LoadedStory {
  readonly story: StorySpec;
  readonly evidence: readonly ResolvedEvidence[];
}

/** The repository root, derived from this module's own location (demo-pipeline/src/story.ts is always two
 *  directories below the root) rather than `process.cwd()` — so evidence resolution is stable no matter where
 *  `pnpm demo:*` is invoked from. */
export function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', '..');
}

/** Parse and validate raw JSON against `StorySpecSchema`. Throws `StoryValidationError` with the formatted
 *  Zod issues on any schema violation: unknown schema version, unknown operation type, duplicate scene/
 *  evidence ids, narration/scene mismatches, unknown evidence references, or an empty observable claim. */
export function parseStory(json: unknown): StorySpec {
  const result = StorySpecSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - [${issue.path.join('.')}] ${issue.message}`).join('\n');
    throw new StoryValidationError(`invalid StorySpec:\n${issues}`);
  }
  return result.data;
}

/** Resolve `relativePath` against `root`, rejecting absolute paths and any traversal that would escape the
 *  repository root (e.g. `../../etc/passwd`). Resolution — not string matching on `..` — is what actually
 *  proves containment: `resolve()` collapses the path and the result is checked against `root` by prefix. */
function resolveWithinRoot(root: string, relativePath: string): string {
  if (relativePath.startsWith('/') || relativePath.startsWith('~') || /^[A-Za-z]:[\\/]/.test(relativePath)) {
    throw new StoryValidationError(`evidence path must be relative to the repository root, got: ${relativePath}`);
  }
  const resolved = resolve(root, relativePath);
  const rootPrefix = root.endsWith(sep) ? root : root + sep;
  if (resolved !== root && !resolved.startsWith(rootPrefix)) {
    throw new StoryValidationError(`evidence path escapes the repository root: ${relativePath}`);
  }
  return resolved;
}

/** Resolve every evidence reference against `root`, verifying each file exists on disk and hashing its
 *  contents. Throws `StoryValidationError` on the first missing file or traversal attempt — evidence is fully
 *  verified before the caller can go on to plan or run anything against the product. */
export function resolveEvidence(story: StorySpec, root: string = repoRoot()): ResolvedEvidence[] {
  return story.evidence.map((ref: EvidenceReference) => {
    const absolutePath = resolveWithinRoot(root, ref.path);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new StoryValidationError(`evidence file not found: ${ref.path} (evidence id: ${ref.id})`);
    }
    const bytes = readFileSync(absolutePath);
    return {
      id: ref.id,
      description: ref.description,
      relativePath: ref.path,
      absolutePath,
      sha256: sha256Hex(bytes),
    };
  });
}

/** Load a StorySpec JSON file from `storyPath`, validate it, and resolve+hash all of its evidence. This is the
 *  single entry point later tasks (plan.ts, confluenceRunner.ts) use to get a trustworthy StorySpec. */
export function loadStory(storyPath: string, root: string = repoRoot()): LoadedStory {
  const raw = readFileSync(storyPath, 'utf-8');
  const json: unknown = JSON.parse(raw);
  const story = parseStory(json);
  const evidence = resolveEvidence(story, root);
  return { story, evidence };
}
