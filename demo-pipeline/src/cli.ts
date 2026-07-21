// CLI orchestration — the composition root (design doc, "Isolation and file layout": "cli.ts run/rehearse/
// render/status entry point"; "Data flow and timing", the full 8-step pipeline; "Error handling and
// recovery").
//
// Code-organization boundary (task brief): this file owns argument parsing, orchestration (calling every
// other demo-pipeline module in sequence), and top-level error handling/redaction. It is the one module
// allowed to import everything else. `artifacts.ts` stays a pure bookkeeping layer with no knowledge of
// StorySpecs/DemoPlans/Confluence/FFmpeg; this file is what gives its (name -> hash) maps their meaning.
//
// The four commands (task brief's exact list):
//   pnpm demo:video -- --story <path> [--run-id <id>]        (full pipeline: cmdRun, rehearseOnly=false)
//   pnpm demo:video -- --rehearse-only --story <path>          (cmdRun, rehearseOnly=true — stops after rehearsal)
//   pnpm demo:render -- --run-dir <path>                       (cmdRender — rerender path, never launches a browser)
//   pnpm demo:video -- --status --run-dir <path>                (cmdStatus — read-only, runs nothing)
// Root package.json's Task-1-provisional scripts ("demo:video" -> "cli.ts run", "demo:render" -> "cli.ts
// render") matched this shape exactly — no correction needed; see the task-7 report.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ArtifactsError,
  ensureRunDir,
  evaluatePhaseReuse,
  generateRunId,
  hashFile,
  JOB_PHASES,
  readJobStatus,
  runDirPath,
  writeFailure,
  writePhase,
  type FailurePhase,
  type FailureRecord,
  type JobPhase,
} from './artifacts';
import { buildCaptionCues } from './captions';
import { sha256OfCanonicalJSON } from './contracts';
import { capture, CAPTURE_MANIFEST_FILENAME, ConfluenceRunnerError, rehearse, RAW_VIDEO_FILENAME, type CaptureManifest } from './confluenceRunner';
import { defaultNarrationCacheDir, KokoroVoiceProvider, NarrationError, synthesizeNarration, type NarrationManifest } from './narration';
import { compileDemoPlan, PlanValidationError, type DemoPlan, type NarrationDurationsMs } from './plan';
import {
  buildEditDecisionList,
  checkRerenderInputs,
  RENDER_MANIFEST_FILENAME,
  RENDER_OUTPUT_FILENAME,
  RenderError,
  renderVideo,
  rerender,
  type RenderManifest,
} from './render';
import { loadStory, repoRoot, StoryValidationError } from './story';
import { REDACTION_MARKER, resolveSecretEnvVarValues } from './timeline';

// ---------------------------------------------------------------------------------------------------------
// Known credential env var names (task brief: "check tests/e2e/.env.example for the full list of names to
// treat as sensitive"). All six names from that file's "Secrets / credentials" section are treated as
// sensitive here — including FORGE_EMAIL/ZENUML_STAGE_USERNAME, which are account identifiers rather than
// classic secrets, but redacting them costs nothing and errs toward never leaking an account identity into a
// committed-adjacent artifact like failure.json.
// ---------------------------------------------------------------------------------------------------------
const KNOWN_SECRET_ENV_VARS = [
  'CONTROL_SHARED_SECRET',
  'FORGE_EMAIL',
  'FORGE_API_TOKEN',
  'ZENUML_STAGE_USERNAME',
  'ZENUML_STAGE_PASSWORD',
  'ATLASSIAN_OTP',
] as const;

const KOKORO_VOICE = 'af_heart';
const KOKORO_MODEL = 'kokoro-82m';

// ---------------------------------------------------------------------------------------------------------
// Argument parsing — a small, fixed set of flags; hand-rolled rather than pulling in a CLI framework
// dependency (task brief: "no new dependency needed for this"). Kept as pure functions (no process.exit, no
// I/O) so the parsing SHAPE is easy to reason about independently of the impure `main()` shell around it.
// ---------------------------------------------------------------------------------------------------------

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export interface RunArgs {
  readonly kind: 'run';
  readonly story: string;
  readonly runId?: string;
}
export interface RehearseOnlyArgs {
  readonly kind: 'rehearse-only';
  readonly story: string;
  readonly runId?: string;
}
export interface StatusArgs {
  readonly kind: 'status';
  readonly runDir: string;
}
export interface RenderArgs {
  readonly kind: 'render';
  readonly runDir: string;
}
export type CliArgs = RunArgs | RehearseOnlyArgs | StatusArgs | RenderArgs;

const VALUE_FLAGS = new Set(['--story', '--run-id', '--run-dir']);
const BOOLEAN_FLAGS = new Set(['--rehearse-only', '--status']);

interface ParsedFlags {
  readonly values: Partial<Record<'story' | 'run-id' | 'run-dir', string>>;
  readonly booleans: Partial<Record<'rehearse-only' | 'status', true>>;
}

function parseFlags(tokens: readonly string[]): ParsedFlags {
  const values: ParsedFlags['values'] = {};
  const booleans: ParsedFlags['booleans'] = {};
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (BOOLEAN_FLAGS.has(token)) {
      booleans[token.slice(2) as 'rehearse-only' | 'status'] = true;
      continue;
    }
    if (VALUE_FLAGS.has(token)) {
      const value = tokens[i + 1];
      // A missing value (end of argv) or a value that is itself a recognized flag name (e.g. `--story
      // --run-id`, where `--story` was given no value at all) is a usage error, not "the value is
      // '--run-id'". An arbitrary path that happens to start with "--" but isn't a recognized flag name is
      // still accepted as a value — flags are recognized by exact name, not by a leading-dash heuristic.
      if (value === undefined || VALUE_FLAGS.has(value) || BOOLEAN_FLAGS.has(value)) {
        throw new CliUsageError(`flag ${token} requires a value`);
      }
      values[token.slice(2) as 'story' | 'run-id' | 'run-dir'] = value;
      i++;
      continue;
    }
    throw new CliUsageError(`unrecognized argument: ${token}`);
  }
  return { values, booleans };
}

/** Parse `process.argv.slice(2)` into one of the four commands. Pure — no filesystem access, no process
 *  exit; throws `CliUsageError` with a human-readable message on any malformed invocation.
 *
 *  Strips every literal `--` token before parsing flags. npm strips the conventional `npm run <script> --
 *  <args>` separator itself before the script ever sees argv, but pnpm 10 (this repo's package manager) does
 *  NOT — `pnpm demo:video -- --story <path>` (the task brief's own documented command form) hands this
 *  function `['run', '--', '--story', '<path>']`, and without this filter `--` would fail as an unrecognized
 *  argument. Verified directly against `pnpm@10.33.2`, not assumed. */
export function parseArgs(argv: readonly string[]): CliArgs {
  const [subcommand, ...rest] = argv;
  if (subcommand !== 'run' && subcommand !== 'render') {
    throw new CliUsageError(`unknown subcommand ${JSON.stringify(subcommand ?? '')} — expected "run" or "render"`);
  }
  const { values, booleans } = parseFlags(rest.filter((token) => token !== '--'));

  if (subcommand === 'render') {
    if (!values['run-dir']) throw new CliUsageError('render requires --run-dir <path>');
    return { kind: 'render', runDir: values['run-dir'] };
  }

  // subcommand === 'run'
  if (booleans.status) {
    if (!values['run-dir']) throw new CliUsageError('--status requires --run-dir <path>');
    return { kind: 'status', runDir: values['run-dir'] };
  }
  if (!values.story) throw new CliUsageError('run requires --story <path>');
  if (booleans['rehearse-only']) {
    return { kind: 'rehearse-only', story: values.story, runId: values['run-id'] };
  }
  return { kind: 'run', story: values.story, runId: values['run-id'] };
}

// ---------------------------------------------------------------------------------------------------------
// Redaction — the same known-secret VALUES are stripped from every console log line and from failure.json
// (design doc: "Logs redact values of known credential environment variables"; task brief: "REDACT any value
// that looks like a credential ... before writing failure.json" and "the same known-credential env var VALUES
// from any console output too"). Mirrors timeline.ts's private `redactValue` — duplicated here (not exported
// there) since it is a small, generic recursive-substring-replace with no dependency on ActionEvent shapes.
// ---------------------------------------------------------------------------------------------------------

function redactValue(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === 'string') {
    let redacted = value;
    for (const secret of secrets) {
      if (secret.length === 0) continue;
      redacted = redacted.split(secret).join(REDACTION_MARKER);
    }
    return redacted;
  }
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, secrets));
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) result[key] = redactValue(entry, secrets);
    return result;
  }
  return value;
}

function redactText(text: string, secrets: readonly string[]): string {
  return redactValue(text, secrets) as string;
}

function log(message: string, secrets: readonly string[]): void {
  console.log(redactText(message, secrets));
}

function logError(message: string, secrets: readonly string[]): void {
  console.error(redactText(message, secrets));
}

// ---------------------------------------------------------------------------------------------------------
// Error normalization — every error this CLI can encounter, collapsed into one FailureRecord shape (task
// brief: "normalize whatever error occurred (Zod validation error, ConfluenceRunnerError with its primary/
// cleanup split, FFmpeg RenderError, etc.) into one consistent shape"). NEVER serializes
// tests/e2e/.auth/state.json or any browser storage-state object — nothing in this pipeline ever reads that
// file's contents into memory in the first place (confluenceRunner.ts only passes its PATH to Playwright's
// `storageState` option), so there is no value in scope here that could ever BE one.
// ---------------------------------------------------------------------------------------------------------

/** Reduce an unknown thrown value to a plain, redacted `{ name, message }` (and, for `ConfluenceRunnerError`,
 *  its nested primary/cleanup errors) — safe to embed as `FailureRecord.detail`. */
function describeError(error: unknown, secrets: readonly string[]): unknown {
  if (error instanceof ConfluenceRunnerError) {
    return {
      name: error.name,
      message: redactText(error.message, secrets),
      primaryError: error.primaryError === undefined ? undefined : describeError(error.primaryError, secrets),
      cleanupError: error.cleanupError === undefined ? undefined : describeError(error.cleanupError, secrets),
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: redactText(error.message, secrets) };
  }
  return { value: redactText(String(error), secrets) };
}

function errorCode(error: unknown): string {
  if (error instanceof StoryValidationError) return 'story_validation_failed';
  if (error instanceof PlanValidationError) return 'plan_validation_failed';
  if (error instanceof NarrationError) return 'narration_failed';
  if (error instanceof ConfluenceRunnerError) return 'confluence_runner_failed';
  if (error instanceof RenderError) return 'render_failed';
  if (error instanceof ArtifactsError) return 'artifacts_failed';
  if (error instanceof CliUsageError) return 'usage_error';
  return 'unknown_error';
}

function normalizeError(error: unknown, phase: FailurePhase, secrets: readonly string[]): FailureRecord {
  const message = error instanceof Error ? error.message : String(error);
  return {
    schemaVersion: 1,
    phase,
    occurredAt: new Date().toISOString(),
    code: errorCode(error),
    message: redactText(message, secrets),
    detail: describeError(error, secrets),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Shared hashing helpers — turn pipeline objects into the (name -> sha256) maps artifacts.ts's
// writePhase/evaluatePhaseReuse deal in. Kept local to cli.ts (not artifacts.ts) since they know about
// StorySpec/DemoPlan/NarrationManifest/RenderManifest shapes, which artifacts.ts is deliberately ignorant of.
// ---------------------------------------------------------------------------------------------------------

export function computeStoryHash(story: unknown, evidence: readonly { readonly id: string; readonly sha256: string }[]): string {
  return sha256OfCanonicalJSON({ story, evidence: evidence.map((e) => ({ id: e.id, sha256: e.sha256 })) });
}

export function computeNarrationHash(manifestsBySceneId: Readonly<Record<string, NarrationManifest>>): string {
  const bySceneId: Record<string, string> = {};
  for (const [sceneId, manifest] of Object.entries(manifestsBySceneId)) bySceneId[sceneId] = manifest.sha256;
  return sha256OfCanonicalJSON(bySceneId);
}

export function computePlanHash(plan: DemoPlan): string {
  return sha256OfCanonicalJSON(plan);
}

/** The (captureManifestHash, narrationHash) pair used as the "rendered" phase's inputHashes, computed the SAME
 *  way whether this run just captured for real (cmdRun) or is re-rendering from stored artifacts alone
 *  (cmdRender) — see the task-7 report for why keeping this one shared function is worth the small extra
 *  indirection: it keeps a `demo:render` afterward and a later `demo:video run` on the same run id comparable
 *  by the SAME hash shape, so a plain re-run of `run` correctly recognizes a manual rerender as still valid
 *  (no redundant re-encode) instead of just safely-but-wastefully redoing it. */
export function computeRenderedInputHashes(runDir: string, root: string, renderManifest: RenderManifest): Record<string, string> {
  const captureManifestPath = join(runDir, CAPTURE_MANIFEST_FILENAME);
  const captureManifestHash = existsSync(captureManifestPath)
    ? hashFile(captureManifestPath)
    : sha256OfCanonicalJSON(renderManifest.inputs.sourceVideo);
  const narrationHash = sha256OfCanonicalJSON(
    Object.fromEntries(renderManifest.inputs.narration.map((n) => [n.sceneId, n.sha256])),
  );
  return { captureManifestHash, narrationHash };
}

/** Normalize an absolute path to one relative to `root`, "/"-joined on every OS — the same convention
 *  render.ts's `normalizeManifestPath` and confluenceRunner.ts's `normalizeCapturePath` already use for every
 *  path a manifest persists, applied here to the paths this module records in phase `outputs`. */
export function toRootRelative(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split(sep).join('/');
}

// ---------------------------------------------------------------------------------------------------------
// Verify — the CLI's own post-render integrity check (design doc, step 8: "Probe the final media, hash every
// artifact, and write RenderManifest last" — renderVideo() already does the probing/hashing/manifest-writing
// itself as ITS OWN last step; this is an ADDITIONAL confirmation, run by the CLI, that the artifacts
// renderVideo() just produced (or that rerender() re-verified) are genuinely self-consistent on disk right
// now — reusing render.ts's own `checkRerenderInputs` for the input side, plus an explicit re-hash of the
// final MP4 output, which `checkRerenderInputs` deliberately does not cover (it only checks INPUTS).
// ---------------------------------------------------------------------------------------------------------

export function verifyRender(root: string, renderManifest: RenderManifest): void {
  const failures = checkRerenderInputs(renderManifest, root);
  if (failures.length > 0) {
    const detail = failures.map((f) => `${f.path} (${f.reason})`).join('; ');
    throw new RenderError(`verify failed: ${failures.length} input(s) no longer match their recorded hashes: ${detail}`);
  }
  const outputAbsolutePath = resolve(root, renderManifest.output.path);
  if (!existsSync(outputAbsolutePath)) {
    throw new RenderError(`verify failed: rendered output missing at ${renderManifest.output.path}`);
  }
  if (hashFile(outputAbsolutePath) !== renderManifest.output.sha256) {
    throw new RenderError(`verify failed: rendered output at ${renderManifest.output.path} no longer matches its recorded hash`);
  }
}

// ---------------------------------------------------------------------------------------------------------
// cmdRun — the full pipeline (design doc, "Data flow and timing", the 8-step flow) and the --rehearse-only
// variant (steps 1-4 only). Both share this one function; `rehearseOnly` decides where it stops.
// ---------------------------------------------------------------------------------------------------------

async function cmdRun(storyPath: string, runIdOpt: string | undefined, rehearseOnly: boolean): Promise<void> {
  const root = repoRoot();
  const secretValues = resolveSecretEnvVarValues(KNOWN_SECRET_ENV_VARS);
  const runId = runIdOpt ?? generateRunId();
  const runDir = runDirPath(runId, root);
  ensureRunDir(runDir);

  let currentPhase: FailurePhase = 'unknown';
  try {
    // --- Step 1: load and validate the StorySpec; evidence is hashed as part of loading (story.ts). ---
    const { story, evidence } = loadStory(resolve(process.cwd(), storyPath), root);
    const storyHash = computeStoryHash(story, evidence);

    // --- Step 2: synthesize ALL narration before touching the product (design doc, step 2). ---
    currentPhase = 'narrated';
    const provider = new KokoroVoiceProvider();
    const cacheDir = defaultNarrationCacheDir(root);
    const manifests: Record<string, NarrationManifest> = {};
    for (const entry of story.narration) {
      manifests[entry.sceneId] = await synthesizeNarration(provider, { text: entry.script, model: KOKORO_MODEL, voice: KOKORO_VOICE }, cacheDir);
    }
    const narrationHash = computeNarrationHash(manifests);
    writePhase(
      runDir,
      'narrated',
      { storyHash },
      Object.values(manifests).map((m) => ({ path: toRootRelative(root, m.wavPath), sha256: m.sha256 })),
    );
    log(`narrated: synthesized ${Object.keys(manifests).length} scene(s) of narration`, secretValues);

    // --- Step 3: compile the DemoPlan (narration durationSeconds -> plan.ts's milliseconds). ---
    currentPhase = 'planned';
    const narrationDurationsMs: NarrationDurationsMs = Object.fromEntries(
      Object.entries(manifests).map(([sceneId, m]) => [sceneId, m.durationSeconds * 1000]),
    );
    const plan = compileDemoPlan(story, narrationDurationsMs);
    const planHash = computePlanHash(plan);
    writePhase(runDir, 'planned', { storyHash, narrationHash }, []);
    log(`planned: compiled a ${plan.scenes.length}-scene plan (${plan.totalDurationMs}ms total)`, secretValues);

    // --- Step 4: rehearse without Screencast. Blocks capture/render on failure (design doc, step 4). ---
    currentPhase = 'rehearsed';
    const rehearsedInputs = { planHash, storyHash };
    const rehearsedReuse = evaluatePhaseReuse(runDir, 'rehearsed', rehearsedInputs, root);
    if (rehearsedReuse.reusable) {
      log('rehearsed: reused (inputs unchanged since the last successful rehearsal in this run directory)', secretValues);
    } else {
      await rehearse({ plan, evidence, runDir, baseDir: root, secretValues, macroPageTitle: `mini-site demo rehearse ${runId}` });
      writePhase(runDir, 'rehearsed', rehearsedInputs, []);
      log('rehearsed: passed', secretValues);
    }

    if (rehearseOnly) {
      log(`--rehearse-only: stopping after rehearsal. Run directory: ${runDir}`, secretValues);
      return;
    }

    // --- Step 5: reset (fresh page/instance) and capture WITH Screencast (design doc, step 5). ---
    currentPhase = 'captured';
    const capturedInputs = { planHash, storyHash };
    const capturedReuse = evaluatePhaseReuse(runDir, 'captured', capturedInputs, root);
    let captureManifest: CaptureManifest;
    if (capturedReuse.reusable) {
      captureManifest = JSON.parse(readFileSync(join(runDir, CAPTURE_MANIFEST_FILENAME), 'utf-8')) as CaptureManifest;
      log('captured: reused (inputs unchanged since the last successful capture in this run directory)', secretValues);
    } else {
      const result = await capture({ plan, evidence, runDir, baseDir: root, secretValues, macroPageTitle: `mini-site demo capture ${runId}` });
      if (!result.captureManifest) {
        throw new ConfluenceRunnerError('capture reported success but produced no CaptureManifest');
      }
      captureManifest = result.captureManifest;
      writePhase(runDir, 'captured', capturedInputs, [
        { path: toRootRelative(root, join(runDir, CAPTURE_MANIFEST_FILENAME)), sha256: hashFile(join(runDir, CAPTURE_MANIFEST_FILENAME)) },
        { path: toRootRelative(root, join(runDir, RAW_VIDEO_FILENAME)), sha256: captureManifest.sourceVideo.sha256 },
      ]);
      log('captured: passed', secretValues);
    }

    // --- Steps 6-7: build captions/EDL and render (design doc, step 7). ---
    currentPhase = 'rendered';
    const captionCues = buildCaptionCues(plan);
    const sourceVideoAbsolutePath = resolve(root, captureManifest.sourceVideo.path);
    const edl = buildEditDecisionList(plan, captionCues, Object.values(manifests), sourceVideoAbsolutePath);

    // Provisional inputHashes to check reuse BEFORE rendering — the real hashes recorded after a fresh render
    // come straight from the RenderManifest render.ts writes; a reuse HIT reads the prior manifest back
    // instead, so both branches end up with the same inputHashes shape (see computeRenderedInputHashes).
    const renderedInputsProbe = { captureManifestHash: hashFile(join(runDir, CAPTURE_MANIFEST_FILENAME)), narrationHash };
    const renderedReuse = evaluatePhaseReuse(runDir, 'rendered', renderedInputsProbe, root);
    let renderManifest: RenderManifest;
    if (renderedReuse.reusable) {
      renderManifest = JSON.parse(readFileSync(join(runDir, RENDER_MANIFEST_FILENAME), 'utf-8')) as RenderManifest;
      log('rendered: reused (inputs unchanged since the last successful render in this run directory)', secretValues);
    } else {
      renderManifest = await renderVideo(edl, { runDir, baseDir: root });
      writePhase(runDir, 'rendered', computeRenderedInputHashes(runDir, root, renderManifest), [
        { path: toRootRelative(root, join(runDir, RENDER_MANIFEST_FILENAME)), sha256: hashFile(join(runDir, RENDER_MANIFEST_FILENAME)) },
        { path: toRootRelative(root, join(runDir, RENDER_OUTPUT_FILENAME)), sha256: renderManifest.output.sha256 },
      ]);
      log('rendered: passed', secretValues);
    }

    // --- Step 8: verify (probe/hash already done by renderVideo(); this is the CLI's own confirmation). ---
    currentPhase = 'verified';
    verifyRender(root, renderManifest);
    writePhase(runDir, 'verified', { renderManifestHash: hashFile(join(runDir, RENDER_MANIFEST_FILENAME)) }, []);
    log(`verified: run complete. Final video: ${resolve(root, renderManifest.output.path)}`, secretValues);
  } catch (error) {
    const failure = normalizeError(error, currentPhase, secretValues);
    writeFailure(runDir, failure);
    logError(`demo:video failed at phase "${failure.phase}" (${failure.code}): ${failure.message}`, secretValues);
    logError(`failure detail written to ${join(runDir, 'failure.json')}`, secretValues);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------------------------------------
// cmdRender — the rerender path (design doc: "Rerender accepts a completed run directory and never launches a
// browser." / "--render-only <run-dir> verifies artifact hashes before rendering.").
// ---------------------------------------------------------------------------------------------------------

async function cmdRender(runDirArg: string): Promise<void> {
  const root = repoRoot();
  const secretValues = resolveSecretEnvVarValues(KNOWN_SECRET_ENV_VARS);
  const runDir = resolve(process.cwd(), runDirArg);

  if (!existsSync(runDir)) {
    logError(`error: run directory does not exist: ${runDir}`, secretValues);
    process.exitCode = 1;
    return;
  }

  let currentPhase: FailurePhase = 'rendered';
  try {
    // rerender() itself verifies every recorded input hash against disk BEFORE invoking FFmpeg, and never
    // imports anything that could launch a browser (render.ts's own module doc comment; no browser code
    // exists in that module to launch one with).
    const renderManifest = await rerender(runDir, root);
    writePhase(runDir, 'rendered', computeRenderedInputHashes(runDir, root, renderManifest), [
      { path: toRootRelative(root, join(runDir, RENDER_MANIFEST_FILENAME)), sha256: hashFile(join(runDir, RENDER_MANIFEST_FILENAME)) },
      { path: toRootRelative(root, join(runDir, RENDER_OUTPUT_FILENAME)), sha256: renderManifest.output.sha256 },
    ]);
    log('rendered: passed (rerender)', secretValues);

    currentPhase = 'verified';
    verifyRender(root, renderManifest);
    writePhase(runDir, 'verified', { renderManifestHash: hashFile(join(runDir, RENDER_MANIFEST_FILENAME)) }, []);
    log(`verified: rerender complete. Final video: ${resolve(root, renderManifest.output.path)}`, secretValues);
  } catch (error) {
    const failure = normalizeError(error, currentPhase, secretValues);
    writeFailure(runDir, failure);
    logError(`demo:render failed at phase "${failure.phase}" (${failure.code}): ${failure.message}`, secretValues);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------------------------------------
// cmdStatus — read-only; runs nothing, launches nothing.
// ---------------------------------------------------------------------------------------------------------

function cmdStatus(runDirArg: string): void {
  const runDir = resolve(process.cwd(), runDirArg);
  const status = readJobStatus(runDir);
  if (!status.exists) {
    console.log(JSON.stringify({ runDir, exists: false }, null, 2));
    return;
  }
  console.log(
    JSON.stringify(
      {
        runDir,
        exists: true,
        latestCompletedPhase: status.latestCompletedPhase ?? null,
        phases: Object.fromEntries(
          JOB_PHASES.map((phase) => [phase, status.phases[phase] ? { completedAt: status.phases[phase]!.completedAt } : null] as const),
        ) as Partial<Record<JobPhase, { completedAt: string } | null>>,
        failure: status.failure ?? null,
      },
      null,
      2,
    ),
  );
}

// ---------------------------------------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('usage:');
    console.error('  tsx demo-pipeline/src/cli.ts run --story <path> [--run-id <id>]');
    console.error('  tsx demo-pipeline/src/cli.ts run --rehearse-only --story <path> [--run-id <id>]');
    console.error('  tsx demo-pipeline/src/cli.ts run --status --run-dir <path>');
    console.error('  tsx demo-pipeline/src/cli.ts render --run-dir <path>');
    process.exitCode = 2;
    return;
  }

  switch (args.kind) {
    case 'status':
      cmdStatus(args.runDir);
      return;
    case 'render':
      await cmdRender(args.runDir);
      return;
    case 'rehearse-only':
      await cmdRun(args.story, args.runId, true);
      return;
    case 'run':
      await cmdRun(args.story, args.runId, false);
      return;
  }
}

// Only self-invoke when this module is actually the process entry point (`tsx demo-pipeline/src/cli.ts ...`)
// — NOT merely when it is imported. cli.ts exports several pure helpers (computeStoryHash, verifyRender, ...)
// specifically so other code (a future test, a proof/tooling script) can call the exact same logic `cmdRun`
// uses without duplicating it; without this guard, any such import would immediately run `main()` against
// whatever `process.argv` the IMPORTING script happens to have, printing a spurious usage error and setting
// `process.exitCode` — reproduced while building this file's own manual orchestration proof script.
const isEntryPoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
