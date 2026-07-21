// StorySpec loading, validation, and evidence resolution (design doc: "Data flow and timing", step 1 —
// "Load and validate StorySpec; record the product Git SHA and evidence file hashes").
//
// This module owns disk access. `contracts.ts` stays pure (schema + hash/serialization helpers only); this
// file is the only place that reads story JSON off disk, resolves evidence paths against the repository root,
// and hashes evidence file contents. Evidence existence is verified here, synchronously, before the caller
// gets a loaded story back — so a missing file fails BEFORE any browser/external operation would run (design
// doc, "Runtime validation rejects ... missing evidence ... before browser execution").
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJSONStringify, sha256Hex, StorySpecSchema, type EvidenceReference, type StorySpec } from './contracts';

/** Raised for every story-loading failure: schema violations (formatted from the underlying ZodError),
 *  path-traversal attempts, and missing evidence files. One error type keeps `story.test.ts` assertions
 *  (`expect(() => ...).toThrow(StoryValidationError)`) uniform regardless of which check failed. */
export class StoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryValidationError';
  }
}

/** An evidence reference resolved against the repository root, with its content hashed — a single file's
 *  bytes for `kind: 'file'`, or a deterministic hash over every file inside the tree for `kind: 'directory'`. */
export interface ResolvedEvidence {
  readonly id: string;
  readonly description: string;
  readonly kind: 'file' | 'directory';
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

/** List every regular file inside `absoluteDir`, recursively, as paths relative to `absoluteDir` using `/` as
 *  the separator (not `path.sep`) so the listing — and therefore the hash built from it — is identical on
 *  every OS. Symlinks are skipped rather than followed, so evidence hashing can never escape the directory or
 *  loop forever on a cyclic link. Sorted so hashing is independent of directory-listing order. */
function listFilesRecursive(absoluteDir: string, relativeDir = ''): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(absoluteDir, relativeDir), { withFileTypes: true })) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(absoluteDir, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files.sort();
}

/** A stable content hash for a directory: every contained file's relative path paired with its own SHA-256,
 *  sorted by path, then hashed as one canonical JSON value. Two directories hash the same only if they contain
 *  the same files with the same contents at the same relative paths — renaming, adding, removing, or editing
 *  any file inside changes the hash. This is deliberately a hash of file CONTENT, not directory metadata
 *  (mtimes, inode numbers, raw listing order) — metadata varies across checkouts/CI runners for reasons
 *  unrelated to what a file actually contains, which would make the hash both spuriously unstable (same
 *  content, different mtime) and spuriously stable (touched content, coincidentally same directory listing). */
function hashDirectory(absoluteDir: string): string {
  const manifest = listFilesRecursive(absoluteDir).map((relativePath) => [relativePath, sha256Hex(readFileSync(join(absoluteDir, relativePath)))] as const);
  return sha256Hex(canonicalJSONStringify(manifest));
}

/** Resolve every evidence reference against `root`, verifying it exists on disk as the declared `kind` and
 *  hashing its content. Throws `StoryValidationError` on the first missing/traversing/kind-mismatched entry —
 *  evidence is fully verified before the caller can go on to plan or run anything against the product. */
export function resolveEvidence(story: StorySpec, root: string = repoRoot()): ResolvedEvidence[] {
  return story.evidence.map((ref: EvidenceReference) => {
    const absolutePath = resolveWithinRoot(root, ref.path);
    if (!existsSync(absolutePath)) {
      throw new StoryValidationError(`evidence ${ref.kind} not found: ${ref.path} (evidence id: ${ref.id})`);
    }
    const stats = statSync(absolutePath);
    const sha256 = (() => {
      if (ref.kind === 'file') {
        if (!stats.isFile()) {
          throw new StoryValidationError(`evidence id "${ref.id}" declares kind "file" but ${ref.path} is not a file`);
        }
        return sha256Hex(readFileSync(absolutePath));
      }
      if (!stats.isDirectory()) {
        throw new StoryValidationError(`evidence id "${ref.id}" declares kind "directory" but ${ref.path} is not a directory`);
      }
      return hashDirectory(absolutePath);
    })();
    return {
      id: ref.id,
      description: ref.description,
      kind: ref.kind,
      relativePath: ref.path,
      absolutePath,
      sha256,
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
