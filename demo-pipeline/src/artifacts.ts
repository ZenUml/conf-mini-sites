// Run-directory + job-phase-state bookkeeping (design doc, "Error handling and recovery": "The CLI uses
// explicit job phases: planned, narrated, rehearsed, captured, rendered, verified, failed." / "A phase writes
// its manifest atomically only after success. Existing completed phases are reusable when their input hashes
// still match.").
//
// Code-organization boundary (task brief): this module owns ONLY run-directory + phase-state bookkeeping — no
// orchestration logic, no calls to story.ts/narration.ts/plan.ts/confluenceRunner.ts/render.ts. It knows
// nothing about StorySpecs, DemoPlans, or Confluence; it only ever deals in run ids, phase names, and
// caller-supplied (name -> sha256) hash maps. `cli.ts` (the composition root) computes what those hashes
// actually mean and decides what to do with a reuse verdict.
//
// Execution order note: the design doc's own phase list is written "planned, narrated, rehearsed, captured,
// rendered, verified, failed" — but the "Data flow and timing" section (steps 2-3) is unambiguous that
// narration is synthesized BEFORE the DemoPlan is compiled (plan.ts's compileDemoPlan takes narration
// durations as an input; it cannot run first). JOB_PHASES below reflects the real, load-bearing execution
// order (narrated before planned); the design doc's list is read as naming vocabulary, not a literal sequence
// — see the task-7 report for the full reasoning.
//
// Atomic-write note: this module duplicates timeline.ts's small "write to a sibling temp file, then rename()"
// pattern (`writeAtomicJson` below) rather than importing it — timeline.ts doesn't export that logic (it's
// folded into `ActionEventTimelineWriter.close()`, which also owns JSONL-specific buffering this module has
// no use for), and extracting a shared helper for ~6 lines would add cross-module coupling for no real
// reduction in duplication. Both this module's and timeline.ts's temp files are suffixed with a random UUID
// (not a timestamp) so concurrent writers targeting the same directory never collide.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { canonicalJSONStringify, sha256Hex } from './contracts';
import { repoRoot } from './story';

/** Raised for every run-directory/job-state failure: an unsafe run id, a corrupt phase/failure file that
 *  cannot be parsed, or a missing run directory where one is required. Mirrors this pipeline's
 *  one-error-type-per-module convention (`StoryValidationError`, `PlanValidationError`, ...). */
export class ArtifactsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactsError';
  }
}

// ---------------------------------------------------------------------------------------------------------
// Job phases.
// ---------------------------------------------------------------------------------------------------------

/** The pipeline's job phases, in real execution order (see the module doc comment above for why "narrated"
 *  precedes "planned" despite the design doc listing them the other way round). `'failed'` is deliberately
 *  NOT a member of this tuple — it is a terminal, out-of-band state (see `FailureRecord`/`writeFailure`)
 *  rather than a step in the normal sequence, and it never has hash-based "reusability" semantics (a failed
 *  run is always redone, never resumed from its point of failure by hash comparison alone). */
export const JOB_PHASES = ['narrated', 'planned', 'rehearsed', 'captured', 'rendered', 'verified'] as const;

export type JobPhase = (typeof JOB_PHASES)[number];

/** `JobPhase`, plus `'unknown'` for a failure that occurred before any phase-scoped work began (e.g. StorySpec
 *  loading itself threw) — used only by `FailureRecord.phase`, never by `writePhase`/`evaluatePhaseReuse`. */
export type FailurePhase = JobPhase | 'unknown';

// ---------------------------------------------------------------------------------------------------------
// Run id + run directory.
// ---------------------------------------------------------------------------------------------------------

/** Only letters, digits, `.`, `_`, `-` — no path separators, no leading dot-segment, no `..` anywhere. A run
 *  id becomes a single path segment under `.demo-runs/`; this is the same "resolve, then check containment"
 *  discipline `story.ts`'s `resolveWithinRoot` applies to evidence paths, applied here to a value that (unlike
 *  evidence paths) is expected to come from a CLI flag (`--run-id`), so it is untrusted input by construction. */
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Reject any run id that isn't a single safe path segment. Throws `ArtifactsError` rather than silently
 *  sanitizing — an invalid `--run-id` is a usage error the caller should see, not a value quietly mangled into
 *  something else. */
export function validateRunId(runId: string): void {
  if (!runId || !RUN_ID_PATTERN.test(runId) || runId.includes('..')) {
    throw new ArtifactsError(
      `invalid run id: ${JSON.stringify(runId)} — must be a non-empty path-safe segment (letters, digits, '.', '_', '-'; no path separators, no '..')`,
    );
  }
}

/** Generate a default run id with NO colons (design doc/task brief: Task 5 had to patch `render.ts`'s FFmpeg
 *  argv compiler to survive a colon-containing relative path — e.g. a raw `new Date().toISOString()` run id —
 *  because FFmpeg's libavformat misreads a colon before the first "/" as a URL scheme; render.ts now handles
 *  that defensively, but generating an id that never contains the problem character in the first place is
 *  cheap defense-in-depth). Format: `YYYYMMDD-HHMMSS-xxxx`, UTC (matches confluenceRunner.ts's fixed
 *  `DEMO_TIMEZONE = 'UTC'` capture convention), with a 4-hex-character random suffix so two runs started
 *  within the same second never collide. `now`/`randomSuffix` are injectable for deterministic tests. */
export function generateRunId(now: Date = new Date(), randomSuffix: string = randomBytes(2).toString('hex')): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const timePart = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${datePart}-${timePart}-${randomSuffix}`;
}

/** The parent directory every run lives under: `<root>/demo-pipeline/.demo-runs` (gitignored — see the task-1
 *  `.gitignore` entry). */
export function runsDir(root: string = repoRoot()): string {
  return resolve(root, 'demo-pipeline', '.demo-runs');
}

/** Resolve `runId` to its run directory under `runsDir(root)`. Validates `runId` first (see `validateRunId`)
 *  so a malicious/malformed id can never resolve outside `runsDir`. */
export function runDirPath(runId: string, root: string = repoRoot()): string {
  validateRunId(runId);
  return join(runsDir(root), runId);
}

/** Create the run directory (and its `phases/` subdirectory) if they don't already exist. Idempotent —
 *  `mkdirSync(..., { recursive: true })` is a no-op on an existing directory. */
export function ensureRunDir(runDir: string): void {
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(runDir, PHASES_SUBDIR), { recursive: true });
}

// ---------------------------------------------------------------------------------------------------------
// Atomic JSON writer — shared by phase files and failure.json (see the module doc comment for why this is a
// small local duplicate of timeline.ts's close() pattern rather than an import).
// ---------------------------------------------------------------------------------------------------------

function writeAtomicJson(path: string, value: unknown): void {
  const tempPath = `${path}.tmp-${randomUUID()}`;
  writeFileSync(tempPath, canonicalJSONStringify(value), 'utf-8');
  renameSync(tempPath, path);
}

function readJsonIfValid<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return undefined;
  }
}

/** SHA-256 of a file's raw bytes. A thin, exported convenience over `contracts.ts`'s `sha256Hex` so callers
 *  (cli.ts) don't need their own `readFileSync` + hash boilerplate for every artifact they want to record in a
 *  phase's `inputHashes`/outputs. */
export function hashFile(absolutePath: string): string {
  return sha256Hex(readFileSync(absolutePath));
}

// ---------------------------------------------------------------------------------------------------------
// Phase state files.
// ---------------------------------------------------------------------------------------------------------

export const PHASE_STATE_SCHEMA_VERSION = 1 as const;
const PHASES_SUBDIR = 'phases';

/** One artifact a completed phase is responsible for, so a later `evaluatePhaseReuse` call can detect the
 *  artifact having been deleted or modified out from under a recorded phase (not just an upstream input
 *  change). `path` is relative to `root` (repoRoot) — deliberately NOT relative to `runDir`, since some phases
 *  (narration) produce artifacts in the stable cross-run cache directory, not inside any one run directory —
 *  mirrors render.ts's/confluenceRunner.ts's own "every persisted path is root-relative" convention. */
export interface PhaseOutputRef {
  readonly path: string;
  readonly sha256: string;
}

/** The persisted record of one completed job phase (design doc: "A phase writes its manifest atomically only
 *  after success"). `inputHashes` is a caller-defined (name -> sha256) map — this module never interprets the
 *  names, it only compares maps for equality (`evaluatePhaseReuse`) and persists/reads them back verbatim.
 *  `completedAt` is wall-clock ISO-8601, informational only (never used for reuse decisions — hashes are the
 *  only thing that determines reusability). */
export interface PhaseStateFile {
  readonly schemaVersion: typeof PHASE_STATE_SCHEMA_VERSION;
  readonly phase: JobPhase;
  readonly completedAt: string;
  readonly inputHashes: Readonly<Record<string, string>>;
  readonly outputs: readonly PhaseOutputRef[];
}

function phaseFilePath(runDir: string, phase: JobPhase): string {
  return join(runDir, PHASES_SUBDIR, `${phase}.json`);
}

/** Persist `phase` as complete, atomically (write-then-rename — see `writeAtomicJson`), with the exact
 *  `inputHashes`/`outputs` the caller supplies. Callers (cli.ts) are expected to call this ONLY after the
 *  phase's real work has actually succeeded — this function itself does no validation of "did the work really
 *  happen"; it is pure bookkeeping. Returns the written record. */
export function writePhase(
  runDir: string,
  phase: JobPhase,
  inputHashes: Readonly<Record<string, string>>,
  outputs: readonly PhaseOutputRef[] = [],
  completedAt: string = new Date().toISOString(),
): PhaseStateFile {
  const record: PhaseStateFile = { schemaVersion: PHASE_STATE_SCHEMA_VERSION, phase, completedAt, inputHashes, outputs };
  writeAtomicJson(phaseFilePath(runDir, phase), record);
  return record;
}

/** Read back a previously-written phase record, or `undefined` if it doesn't exist or fails to parse as JSON
 *  (a corrupt/truncated phase file is treated as "not completed", the same way `narration.ts`'s cache read
 *  treats a corrupt sidecar — never trusted, never thrown over). */
export function readPhase(runDir: string, phase: JobPhase): PhaseStateFile | undefined {
  return readJsonIfValid<PhaseStateFile>(phaseFilePath(runDir, phase));
}

/** Read every phase record present in `runDir`, in `JOB_PHASES` execution order. Missing/corrupt phases are
 *  simply absent from the result — this never throws for an incomplete or fresh run directory. */
export function readAllPhases(runDir: string): Partial<Record<JobPhase, PhaseStateFile>> {
  const result: Partial<Record<JobPhase, PhaseStateFile>> = {};
  for (const phase of JOB_PHASES) {
    const record = readPhase(runDir, phase);
    if (record) result[phase] = record;
  }
  return result;
}

// ---------------------------------------------------------------------------------------------------------
// Reuse evaluation — "is a previously-recorded phase still valid given the CURRENT input hashes and the
// artifacts actually on disk right now?" (design doc: "Existing completed phases are reusable when their
// input hashes still match").
// ---------------------------------------------------------------------------------------------------------

export type PhaseReuseReason = 'no-recorded-phase' | 'input-hash-mismatch' | 'output-missing' | 'output-hash-mismatch' | 'ok';

export interface PhaseReuseResult {
  readonly reusable: boolean;
  readonly reason: PhaseReuseReason;
  readonly recorded?: PhaseStateFile;
}

/** Decide whether a previously-recorded `phase` can be REUSED (skipped) given `currentInputHashes` — the
 *  caller's freshly-computed values for whatever this phase actually depends on. A phase is reusable only if
 *  ALL of the following hold:
 *    1. a phase record exists at all;
 *    2. its recorded `inputHashes` are EXACTLY `currentInputHashes` (compared via canonical JSON — order-
 *       independent, but every key/value must match);
 *    3. every one of its recorded `outputs` still exists on disk at its (root-relative) path AND still hashes
 *       to the recorded value — catching a deleted or externally-modified artifact that hash equality on
 *       `inputHashes` alone would miss.
 *
 *  Downstream cascading ("a hash mismatch means that phase and everything after it must redo" — design doc)
 *  falls out of this by construction, not as a separate rule: cli.ts is expected to compute each phase's
 *  `currentInputHashes` so that it transitively includes a hash of everything upstream (e.g. "rendered"'s
 *  inputs include a hash derived from the capture manifest, which itself only exists/matches if "captured" was
 *  reusable or was freshly redone) — so an upstream change naturally changes every downstream phase's
 *  currentInputHashes too, without this function needing to know about phase ORDER at all. */
export function evaluatePhaseReuse(
  runDir: string,
  phase: JobPhase,
  currentInputHashes: Readonly<Record<string, string>>,
  root: string = repoRoot(),
): PhaseReuseResult {
  const recorded = readPhase(runDir, phase);
  if (!recorded) return { reusable: false, reason: 'no-recorded-phase' };

  if (canonicalJSONStringify(recorded.inputHashes) !== canonicalJSONStringify(currentInputHashes)) {
    return { reusable: false, reason: 'input-hash-mismatch', recorded };
  }

  for (const output of recorded.outputs) {
    const absolutePath = resolve(root, output.path);
    if (!existsSync(absolutePath)) {
      return { reusable: false, reason: 'output-missing', recorded };
    }
    if (hashFile(absolutePath) !== output.sha256) {
      return { reusable: false, reason: 'output-hash-mismatch', recorded };
    }
  }

  return { reusable: true, reason: 'ok', recorded };
}

// ---------------------------------------------------------------------------------------------------------
// failure.json — the terminal 'failed' state's artifact.
// ---------------------------------------------------------------------------------------------------------

export const FAILURE_SCHEMA_VERSION = 1 as const;
export const FAILURE_FILENAME = 'failure.json';

/** A normalized, redacted error record (design doc: "Normalize errors into a structured `failure.json`
 *  without secrets" — task brief). `code` is a stable machine-readable identifier; `message`/`detail` are
 *  expected to have ALREADY been redacted by the caller (cli.ts owns redaction — see Code Organization) before
 *  this module ever writes them to disk; this module does not itself know what a "secret" looks like. */
export interface FailureRecord {
  readonly schemaVersion: typeof FAILURE_SCHEMA_VERSION;
  readonly phase: FailurePhase;
  readonly occurredAt: string;
  readonly code: string;
  readonly message: string;
  readonly detail?: unknown;
}

/** Persist `record` atomically as `<runDir>/failure.json`. Never merges with or reads a prior failure — a new
 *  failure fully replaces the old one (a run directory only ever describes its MOST RECENT attempt). */
export function writeFailure(runDir: string, record: FailureRecord): void {
  writeAtomicJson(join(runDir, FAILURE_FILENAME), record);
}

/** Read back `<runDir>/failure.json`, or `undefined` if absent or unparseable. */
export function readFailure(runDir: string): FailureRecord | undefined {
  return readJsonIfValid<FailureRecord>(join(runDir, FAILURE_FILENAME));
}

// ---------------------------------------------------------------------------------------------------------
// --status
// ---------------------------------------------------------------------------------------------------------

export interface JobStatusReport {
  readonly runDir: string;
  readonly exists: boolean;
  readonly phases: Partial<Record<JobPhase, PhaseStateFile>>;
  readonly latestCompletedPhase?: JobPhase;
  readonly failure?: FailureRecord;
}

/** Assemble a full status report for `runDir`: every recorded phase (in execution order), the latest one
 *  completed, and the most recent failure record, if any. `exists: false` (with everything else empty) for a
 *  run directory that hasn't been created yet — this never throws for a not-yet-existing or empty run
 *  directory, since `--status` against a run id that simply hasn't started anything yet is a normal case, not
 *  an error. */
export function readJobStatus(runDir: string): JobStatusReport {
  if (!existsSync(runDir)) {
    return { runDir, exists: false, phases: {} };
  }
  const phases = readAllPhases(runDir);
  let latestCompletedPhase: JobPhase | undefined;
  for (const phase of JOB_PHASES) {
    if (phases[phase]) latestCompletedPhase = phase;
  }
  const failure = readFailure(runDir);
  return { runDir, exists: true, phases, latestCompletedPhase, failure };
}

/** List every run id currently present under `runsDir(root)` (directories only), sorted lexicographically —
 *  `generateRunId`'s `YYYYMMDD-HHMMSS-xxxx` format sorts chronologically as a side effect. Returns `[]` if the
 *  runs directory doesn't exist yet (no run has ever been created). Not currently used by the CLI's `--status`
 *  (which targets one `--run-dir`), but exported as a small, obviously-useful piece of run-directory
 *  bookkeeping a future `--list` or Task 9 script would otherwise have to reimplement. */
export function listRunIds(root: string = repoRoot()): string[] {
  const dir = runsDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
