// Project-aware rehearsal/capture adapter (design doc, "Approaches considered", A: "Reuse the existing
// Confluence E2E helpers for nested Forge frames, directory upload, publish, preview, assertions, and
// cleanup. Add Playwright Screencast, an event timeline, ..."; "Data flow and timing", steps 4–6; "Error
// handling and recovery"; "Contracts": CaptureManifest).
//
// This is the ONLY module in demo-pipeline/ that touches a real browser and the real product, and the ONLY
// one that imports from `tests/e2e/helpers/*` (the code-organization boundary the task brief fixes). It does
// not reimplement any browser automation — every real-product step goes through the existing, already-proven
// e2e helpers (nested Forge frame discovery, setInputFiles upload, publish, preview, cleanup). What this
// module adds on top is: a CLOSED operation-to-helper map that threads state (launcher → modal → outcome →
// site) exactly as `tests/e2e/ui/full-flow.spec.ts` does, a rehearse/capture state machine with a
// cleanup-always-in-`finally` guarantee, ActionEvent lifecycle recording, and CaptureManifest assembly.
//
// Testability boundary (see `test/confluenceRunner.test.ts`): the STATE MACHINE (`dispatchOperation`,
// `executeScenes`, `runSession`, `buildCaptureManifest`) is driven entirely through two injected seams — a
// `RunnerHelpers` (the six Forge ops + the observable assertion) and a `RunnerSession` (browser/page/instance)
// — so its logic is unit-tested against fakes with no real Chromium, no auth state, no network. The
// real-browser glue (`rehearse`/`capture`, `createRealSession`, `realRunnerHelpers`) constructs the real seam
// from Playwright + the e2e helpers and is deliberately NOT unit-tested here (that is Task 9's live proof
// against lite-dev). Runtime Playwright imports (`chromium`, `expect`) are done via dynamic `import()` inside
// those real-only functions so that merely loading this module under vitest never loads the Playwright test
// runtime — only type-only imports of `Page`/`Frame` appear at the top level, and those are erased.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import type { Frame, Page } from '@playwright/test';
import { canonicalJSONStringify, sha256Hex, type SceneOperation } from './contracts';
import type { DemoPlan } from './plan';
import { repoRoot, type ResolvedEvidence } from './story';
import { ActionEventTimelineWriter, type MonotonicClock } from './timeline';
// The one project-boundary crossing (task brief: "confluenceRunner.ts is the only module that imports from
// tests/e2e/helpers/*"). These are values imported at runtime; forge.ts's own only external import is a
// type-only `@playwright/test` import (erased), and confluence/workers/env import no test runtime, so pulling
// these in does NOT load the Playwright test runner into a vitest process.
import { createMacroPage, type MacroPage } from '../../tests/e2e/helpers/confluence';
import { openMacro, openPublisher, selectFiles, selectFolder, publishAndAwait, gotoPreview } from '../../tests/e2e/helpers/forge';
import { deleteInstance } from '../../tests/e2e/helpers/workers';
import { AUTH_STATE, E2E } from '../../tests/e2e/helpers/env';

/** Raised for every runner-level failure: an operation prerequisite missing (out-of-order plan), an
 *  unresolved evidence id, a publish that did not reach the "handoff" outcome, a missing preview frame for the
 *  observable claim, or a wrapped primary/cleanup error pair. Mirrors this pipeline's one-error-type-per-module
 *  convention (`StoryValidationError`, `PlanValidationError`, `NarrationError`, `RenderError`). `primaryError`
 *  and `cleanupError` are the DISTINGUISHED fields the design doc's "cleanup failure is recorded without hiding
 *  the primary error" rule requires — a caller (Task 7's CLI) can always tell the two apart. */
export class ConfluenceRunnerError extends Error {
  readonly primaryError?: unknown;
  readonly cleanupError?: unknown;
  constructor(message: string, opts: { primaryError?: unknown; cleanupError?: unknown } = {}) {
    super(message);
    this.name = 'ConfluenceRunnerError';
    this.primaryError = opts.primaryError;
    this.cleanupError = opts.cleanupError;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Fixed capture geometry + demo browser environment (action list item 1: "fixed 1920×1080 viewport, locale,
// timezone, and reduced motion"). 1920×1080 matches render.ts's RENDER_WIDTH/HEIGHT so the captured WebM
// never needs upscaling before the final MP4.
// ---------------------------------------------------------------------------------------------------------

export const CAPTURE_WIDTH = 1920;
export const CAPTURE_HEIGHT = 1080;
/** Fixed locale + timezone so the captured product chrome renders identically across machines/runs. UTC keeps
 *  any rendered timestamp deterministic (this pipeline stores/reasons in UTC everywhere else too). */
export const DEMO_LOCALE = 'en-US';
export const DEMO_TIMEZONE = 'UTC';
/** Default budget for the final observable-claim assertion against the dispatched mini-site body. Matches
 *  `tests/e2e/ui/full-flow.spec.ts`'s own 30s `toContainText` timeout for the exact same assertion. */
export const DEFAULT_OBSERVABLE_TIMEOUT_MS = 30_000;

export const CAPTURE_MANIFEST_SCHEMA_VERSION = 1 as const;

/** Run-directory artifact filenames. The raw WebM + timeline + manifest all land under the ignored
 *  `.demo-runs/<run-id>/` directory the caller passes as `runDir`. */
export const RAW_VIDEO_FILENAME = 'raw.webm';
export const CAPTURE_TIMELINE_FILENAME = 'actions.jsonl';
export const CAPTURE_MANIFEST_FILENAME = 'capture-manifest.json';

/** Synthetic scene ids for the non-scene lifecycle events the runner records (cleanup, diagnostics) so they
 *  never collide with a real StorySpec scene id. */
const CLEANUP_SCENE_ID = '(cleanup)';
const DIAGNOSTICS_SCENE_ID = '(diagnostics)';
/** Operation name recorded for the plan-level outcome assertion (design doc: "outcome assertion events"). */
const OUTCOME_ASSERTION_OP = 'assertObservable';

// ---------------------------------------------------------------------------------------------------------
// Injected seams — the two boundaries the state machine is tested through.
// ---------------------------------------------------------------------------------------------------------

/** The six real-product Forge operations plus the observable-claim assertion, as a closed seam. Each method's
 *  signature is identical to the corresponding `tests/e2e/helpers/forge.ts` export so `realRunnerHelpers` can
 *  wire them straight through with no adaptation. Unit tests inject fakes to drive the dispatch/state-machine
 *  logic without a browser. */
export interface RunnerHelpers {
  /** tests/e2e/helpers/forge.ts#openMacro — open the page, return the launcher (Add/Edit) frame. */
  openMacro(page: Page, url: string): Promise<Frame>;
  /** #openPublisher — click Add/Edit, return the Publisher modal frame. */
  openPublisher(page: Page, launcher: Frame): Promise<Frame>;
  /** #selectFiles — upload a flat file list via setInputFiles. */
  selectFiles(page: Page, modal: Frame, filePaths: string[]): Promise<void>;
  /** #selectFolder — upload a directory preserving webkitRelativePath. */
  selectFolder(page: Page, modal: Frame, dir: string): Promise<void>;
  /** #publishAndAwait — publish, resolve to 'handoff' (success) or 'error'. */
  publishAndAwait(modal: Frame, timeoutMs?: number): Promise<'handoff' | 'error'>;
  /** #gotoPreview — click "See it live", return the dispatched mini-site frame. */
  gotoPreview(page: Page, modal: Frame): Promise<Frame>;
  /** Assert the dispatched site's body contains the observable claim text (mirrors full-flow.spec.ts's
   *  `expect(site.locator('body')).toContainText(text, { timeout })`). Not a forge.ts helper — the spec makes
   *  this assertion inline; the runner factors it into the seam so it is fakeable in unit tests. */
  assertObservable(site: Frame, text: string, timeoutMs: number): Promise<void>;
}

/** Best-effort artifacts saved when a run fails (design doc, "Data flow and timing", step 6: "Save raw WebM,
 *  trace, screenshots on failure"). Any field may be absent if that particular artifact could not be saved. */
export interface CaptureDiagnostics {
  readonly screenshotPath?: string;
  readonly tracePath?: string;
  readonly videoPath?: string;
}

/** A provisioned browser session: the Playwright page the operations drive, the fresh Confluence page +
 *  derived instance created for THIS run (cleanup targets these ids), the tool/browser versions the
 *  CaptureManifest records, and the lifecycle hooks (`stopScreencast`, `saveFailureDiagnostics`, `cleanup`).
 *  The real implementation (`createRealSession`) launches Chromium and wires the e2e helpers; unit tests
 *  inject a fake so the whole `runSession` orchestration is exercised without a browser. */
export interface RunnerSession {
  /** The Playwright page the operations drive (opaque to the state machine — only handed to helpers). */
  readonly page: Page;
  /** The fresh Confluence page + derived instance id created for this run; cleanup deletes both. */
  readonly macroPage: MacroPage;
  readonly playwrightVersion: string;
  readonly browserName: string;
  readonly browserVersion: string;
  /** Absolute path the Screencast WebM is written to, or undefined when screencast is disabled (rehearsal). */
  readonly videoPath?: string;
  /** The run-clock reading at the exact instant recording began (video t=0). Set only for capture mode; the
   *  CaptureManifest's `timeBase.captureStartMs` ties ActionEvent timestamps to video time via this origin. */
  readonly captureStartedAtMs?: number;
  /** Stop the Screencast and flush the WebM to `videoPath`. Idempotent no-op if never started/already stopped. */
  stopScreencast(): Promise<void>;
  /** Best-effort failure diagnostics under `dir`. Must never throw — a diagnostics failure must not mask the
   *  primary error; it returns whatever it managed to save. */
  saveFailureDiagnostics(dir: string): Promise<CaptureDiagnostics>;
  /** Tear down: delete the Confluence page + Worker instance, then close the browser context/browser. */
  cleanup(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------
// Execution context + the closed operation-to-helper map.
// ---------------------------------------------------------------------------------------------------------

/** State threaded across the operations of one plan run, mirroring the local variables
 *  `tests/e2e/ui/full-flow.spec.ts` carries between calls (`launcher`, `modal`, publish outcome, `site`).
 *  `page` + `macroPageUrl` are the fixed inputs; the rest are filled in as operations execute. */
export interface RunnerContext {
  readonly page: Page;
  readonly macroPageUrl: string;
  launcher?: Frame;
  modal?: Frame;
  publishOutcome?: 'handoff' | 'error';
  site?: Frame;
}

function requireLauncher(ctx: RunnerContext): Frame {
  if (!ctx.launcher) throw new ConfluenceRunnerError('openPublisher requires a launcher frame from a prior openMacro operation, but none is present (operations out of order)');
  return ctx.launcher;
}

function requireModal(ctx: RunnerContext): Frame {
  if (!ctx.modal) throw new ConfluenceRunnerError('this operation requires the Publisher modal frame from a prior openPublisher operation, but none is present (operations out of order)');
  return ctx.modal;
}

function requireEvidencePath(evidencePaths: ReadonlyMap<string, string>, id: string): string {
  const path = evidencePaths.get(id);
  if (!path) throw new ConfluenceRunnerError(`operation references evidence id "${id}", which was not resolved to a file path`);
  return path;
}

function assertNever(op: never): never {
  throw new ConfluenceRunnerError(`unhandled scene operation: ${JSON.stringify(op)}`);
}

/** Execute ONE semantic scene operation by dispatching it, through a CLOSED switch (the discriminated
 *  `SceneOperation` union — adding a variant is a compile error here until it is handled), to exactly one
 *  helper call, threading the helper's return value onto `ctx` for the next operation. This is the runner's
 *  half of the 1:1 operation→helper mapping `contracts.ts` guarantees on the schema side. Mutates `ctx`.
 *
 *  publishAndAwait is the one operation with a semantic success condition: it must resolve to 'handoff'
 *  (matching full-flow.spec.ts's `expect(await publishAndAwait(modal)).toBe('handoff')`); an 'error' outcome
 *  is a run failure, thrown here so the caller's failure path (diagnostics + cleanup) engages. */
export async function dispatchOperation(
  ctx: RunnerContext,
  op: SceneOperation,
  helpers: RunnerHelpers,
  evidencePaths: ReadonlyMap<string, string>,
): Promise<void> {
  switch (op.type) {
    case 'openMacro':
      ctx.launcher = await helpers.openMacro(ctx.page, ctx.macroPageUrl);
      return;
    case 'openPublisher':
      ctx.modal = await helpers.openPublisher(ctx.page, requireLauncher(ctx));
      return;
    case 'selectFiles': {
      const filePaths = op.evidenceIds.map((id) => requireEvidencePath(evidencePaths, id));
      await helpers.selectFiles(ctx.page, requireModal(ctx), filePaths);
      return;
    }
    case 'selectFolder': {
      const dir = requireEvidencePath(evidencePaths, op.evidenceId);
      await helpers.selectFolder(ctx.page, requireModal(ctx), dir);
      return;
    }
    case 'publishAndAwait': {
      const outcome = await helpers.publishAndAwait(requireModal(ctx), op.timeoutMs);
      ctx.publishOutcome = outcome;
      if (outcome !== 'handoff') {
        throw new ConfluenceRunnerError(`publish did not reach the "handoff" outcome (got "${outcome}") — the bundle was rejected or errored before the "See it live" handoff`);
      }
      return;
    }
    case 'gotoPreview':
      ctx.site = await helpers.gotoPreview(ctx.page, requireModal(ctx));
      return;
    default:
      return assertNever(op);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Scene execution + ActionEvent lifecycle recording.
// ---------------------------------------------------------------------------------------------------------

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Non-secret metadata for an operation's `success` event. Deliberately minimal (counts + outcomes, never
 *  full absolute upload paths or request internals) — the timeline is redacted for known secret values, but
 *  the smaller the surface the less there is to leak in the first place. */
function successMetadata(op: SceneOperation, ctx: RunnerContext): Record<string, unknown> {
  switch (op.type) {
    case 'openMacro':
      return { url: ctx.macroPageUrl };
    case 'selectFiles':
      return { fileCount: op.evidenceIds.length };
    case 'selectFolder':
      return { evidenceId: op.evidenceId };
    case 'publishAndAwait':
      return { outcome: ctx.publishOutcome };
    default:
      return {};
  }
}

/** Run every scene's operations in plan order, then perform the plan-level outcome assertion (the observable
 *  claim, against the dispatched site frame the last `gotoPreview` produced). When a `timeline` writer is
 *  supplied (capture mode), every operation and the outcome assertion get `start`/`success`/`failure` events
 *  stamped by the writer's injected clock (design doc, step 6: "Write ActionEvent timestamps against one
 *  monotonic run clock"). Throws (after recording a `failure` event) on the first operation or assertion that
 *  fails — later operations never run. */
export async function executeScenes(
  ctx: RunnerContext,
  plan: DemoPlan,
  helpers: RunnerHelpers,
  evidencePaths: ReadonlyMap<string, string>,
  timeline?: ActionEventTimelineWriter,
  observableTimeoutMs: number = DEFAULT_OBSERVABLE_TIMEOUT_MS,
): Promise<void> {
  for (const scene of plan.scenes) {
    for (const op of scene.operations) {
      timeline?.append(scene.id, op.type, 'start');
      try {
        await dispatchOperation(ctx, op, helpers, evidencePaths);
      } catch (error) {
        timeline?.append(scene.id, op.type, 'failure', { error: errorMessage(error) });
        throw error;
      }
      timeline?.append(scene.id, op.type, 'success', successMetadata(op, ctx));
    }
  }

  // Plan-level outcome assertion — the observable claim the final scene proves (design doc, "Story and demo
  // flow", scene 3: "assert that the mini-site body contains 'Mini-Site is live'"). Recorded against the last
  // scene's id, since that is the scene whose operations produced the preview being asserted.
  const lastScene = plan.scenes[plan.scenes.length - 1];
  const claim = plan.observableClaim.text;
  timeline?.append(lastScene.id, OUTCOME_ASSERTION_OP, 'start', { claim });
  try {
    if (!ctx.site) {
      throw new ConfluenceRunnerError('cannot verify the observable claim: no preview frame was produced (the plan ran no gotoPreview operation, or it failed before producing one)');
    }
    await helpers.assertObservable(ctx.site, claim, observableTimeoutMs);
  } catch (error) {
    timeline?.append(lastScene.id, OUTCOME_ASSERTION_OP, 'failure', { error: errorMessage(error) });
    throw error;
  }
  timeline?.append(lastScene.id, OUTCOME_ASSERTION_OP, 'success', { claim });
}

// ---------------------------------------------------------------------------------------------------------
// Evidence resolution + CaptureManifest.
// ---------------------------------------------------------------------------------------------------------

/** Build the (evidence id → absolute path) map the operation dispatch uses to turn `selectFiles`/
 *  `selectFolder` evidence references into real upload paths. `story.ts` already validated that every
 *  referenced id exists and has the right kind before this point; this is a straight projection of the
 *  resolved evidence. */
export function evidencePathsFromResolved(evidence: readonly ResolvedEvidence[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of evidence) map.set(entry.id, entry.absolutePath);
  return map;
}

/** design doc, "Contracts": "CaptureManifest: source video, dimensions, time base, capture/tool versions, and
 *  hashes." The source video path is normalized relative to `baseDir` (repoRoot() by convention — same as
 *  render.ts's RenderManifest) so the manifest is portable across checkouts/machines and never leaks a home
 *  directory. `timeBase.captureStartMs` is the run-clock origin that maps ActionEvent timestamps to video
 *  time. */
export interface CaptureManifest {
  readonly schemaVersion: typeof CAPTURE_MANIFEST_SCHEMA_VERSION;
  readonly sourceVideo: {
    readonly path: string;
    readonly sha256: string;
  };
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly timeBase: {
    readonly unit: 'ms';
    readonly captureStartMs: number;
  };
  readonly tool: {
    readonly playwrightVersion: string;
    readonly browserName: string;
    readonly browserVersion: string;
  };
}

export interface BuildCaptureManifestInput {
  readonly baseDir: string;
  readonly sourceVideo: {
    readonly absolutePath: string;
    readonly sha256: string;
  };
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
  };
  readonly captureStartMs: number;
  readonly tool: {
    readonly playwrightVersion: string;
    readonly browserName: string;
    readonly browserVersion: string;
  };
}

/** Normalize an absolute path to one relative to `baseDir`, "/"-joined on every OS — identical convention to
 *  render.ts's `normalizeManifestPath` (kept as a tiny local copy rather than importing render.ts, whose
 *  module load pulls in the whole FFmpeg layer this capture-side module has no use for). */
function normalizeCapturePath(absolutePath: string, baseDir: string): string {
  return relative(baseDir, absolutePath).split(sep).join('/');
}

/** Pure: assemble a `CaptureManifest` from an already-hashed source video + dimensions/time-base/versions,
 *  normalizing the video path relative to `baseDir`. Split from `runSession` (which does the hashing/fs) so
 *  the manifest shape + path normalization is unit-testable without a browser — mirrors render.ts's
 *  `buildRenderManifest` pure/`renderVideo` impure split. */
export function buildCaptureManifest(input: BuildCaptureManifestInput): CaptureManifest {
  return {
    schemaVersion: CAPTURE_MANIFEST_SCHEMA_VERSION,
    sourceVideo: {
      path: normalizeCapturePath(input.sourceVideo.absolutePath, input.baseDir),
      sha256: input.sourceVideo.sha256,
    },
    dimensions: input.dimensions,
    timeBase: { unit: 'ms', captureStartMs: input.captureStartMs },
    tool: input.tool,
  };
}

// ---------------------------------------------------------------------------------------------------------
// runSession — the rehearse/capture state machine. Provision is done by the caller (real functions launch a
// browser; unit tests inject a fake session); this function owns everything from "session ready" onward: run
// the plan, record events, (capture) build + persist the manifest, save diagnostics on failure, and ALWAYS
// clean up in a `finally`, surfacing a cleanup failure without ever masking the primary error.
// ---------------------------------------------------------------------------------------------------------

export interface RunSessionInput {
  readonly mode: 'rehearse' | 'capture';
  readonly plan: DemoPlan;
  readonly evidence: readonly ResolvedEvidence[];
  readonly session: RunnerSession;
  readonly helpers: RunnerHelpers;
  /** Run clock for the ActionEvent timeline (real run: `() => Date.now()`; tests: an injected fake). */
  readonly clock: MonotonicClock;
  /** Directory the raw WebM, timeline JSONL, capture manifest, and failure diagnostics are written into. */
  readonly runDir: string;
  /** Base directory the manifest's source-video path is made relative to. Defaults to `repoRoot()`. */
  readonly baseDir?: string;
  /** Literal secret VALUES redacted from every ActionEvent metadata field (never env var names). */
  readonly secretValues?: readonly string[];
  readonly observableTimeoutMs?: number;
}

export interface RunSessionResult {
  readonly mode: 'rehearse' | 'capture';
  readonly macroPage: MacroPage;
  /** The ActionEvent JSONL path (capture mode only). */
  readonly timelinePath?: string;
  /** The CaptureManifest + its on-disk path (capture mode, success only). */
  readonly captureManifest?: CaptureManifest;
  readonly captureManifestPath?: string;
  /** Diagnostics saved on failure (present only when the run failed and diagnostics were saved). */
  readonly diagnostics?: CaptureDiagnostics;
}

// ---------------------------------------------------------------------------------------------------------
// Resource-teardown verification (pure). Both product-side deletes a cleanup performs — the Confluence page
// and the per-instance Worker — must be CONFIRMED, not fire-and-forget: a swallowed delete failure would
// silently orphan a real page on lite-dev / a real Worker instance on Cloudflare (the exact blast radius this
// module exists to guard against). The real cleanup issues each delete, observes its HTTP response, and hands
// the outcomes here; this pure decision function turns any unconfirmed delete into a thrown error that
// `runSession` records as a `cleanupError` — so it is unit-testable without a browser or network.
// ---------------------------------------------------------------------------------------------------------

/** One resource-teardown outcome, as observed from its delete call's HTTP response. `status` is the HTTP
 *  status, or `0` when the request never completed (network error) — treated as a failure. `bodyOk` is the
 *  control Worker's `body.ok` for an instance delete (the Worker returns `{ ok: true }` only on real success);
 *  it is undefined for a page delete, which returns no JSON body. */
export interface ResourceDeleteOutcome {
  readonly kind: 'page' | 'instance';
  readonly id: string;
  readonly status: number;
  readonly bodyOk?: boolean;
}

/** Whether a single delete outcome counts as a CONFIRMED teardown. A Confluence page `DELETE /wiki/api/v2/
 *  pages/{id}` returns 204 (2xx) on success and 404 when the page is already gone — 404 is idempotent success
 *  (the page is not there, which is the goal); anything else (401/403 auth, 5xx server, or a status-0 network
 *  failure) is a real failure. A control-Worker instance `DELETE /instance` returns 2xx with `{ ok: true }`
 *  on success (src/worker/index.ts) — both must hold. */
function isDeleteConfirmed(outcome: ResourceDeleteOutcome): boolean {
  const twoXX = outcome.status >= 200 && outcome.status < 300;
  if (outcome.kind === 'page') return twoXX || outcome.status === 404;
  return twoXX && outcome.bodyOk === true;
}

/** Throw a `ConfluenceRunnerError` naming EVERY resource whose delete could not be confirmed (not just the
 *  first), or return cleanly when all were confirmed. Pure — it takes the already-collected outcomes so the
 *  real cleanup can ATTEMPT every delete (never short-circuiting on the first failure) and this only decides
 *  pass/fail. The thrown error becomes `runSession`'s `cleanupError`, which is surfaced without ever masking a
 *  primary error. */
export function assertCleanupDeletesConfirmed(outcomes: readonly ResourceDeleteOutcome[]): void {
  const failures = outcomes.filter((outcome) => !isDeleteConfirmed(outcome));
  if (failures.length === 0) return;
  const detail = failures.map((f) => `${f.kind} "${f.id}" (status ${f.status})`).join('; ');
  throw new ConfluenceRunnerError(`cleanup could not confirm teardown of: ${detail} — the resource(s) may be orphaned`);
}

/** Execute a provided `session` through the whole plan and always clean it up. The distinction between
 *  rehearsal and capture is exactly: capture records an ActionEvent timeline, starts/stops a Screencast (via
 *  the session), and builds+persists a CaptureManifest; rehearsal does none of that — it only proves every
 *  selector/upload/publish/preview/outcome step passes (design doc, step 4: "Rehearse the plan without
 *  Screencast. All selectors, auth, upload, publish, preview, and outcome assertions must pass. Cleanup always
 *  runs.").
 *
 *  Failure handling (design doc, "Error handling and recovery"): on ANY primary failure the run stops the
 *  screencast (so a partial WebM is still flushed for debugging), saves best-effort diagnostics, then ALWAYS
 *  runs cleanup. The primary error is then rethrown UNCHANGED (so a caller — Task 7's CLI — gets an
 *  unambiguous blocking signal and can decide not to proceed to capture/render). If cleanup ALSO fails, a
 *  `ConfluenceRunnerError` carrying BOTH `primaryError` and `cleanupError` is thrown — the primary is never
 *  masked. A successful run whose cleanup fails throws a `ConfluenceRunnerError` naming the possible orphan. */
export async function runSession(input: RunSessionInput): Promise<RunSessionResult> {
  const { mode, plan, evidence, session, helpers, clock, runDir } = input;
  const baseDir = input.baseDir ?? repoRoot();
  const observableTimeoutMs = input.observableTimeoutMs ?? DEFAULT_OBSERVABLE_TIMEOUT_MS;
  const capture = mode === 'capture';
  const evidencePaths = evidencePathsFromResolved(evidence);
  const ctx: RunnerContext = { page: session.page, macroPageUrl: session.macroPage.url };

  // `runDir` creation and the timeline writer are set up INSIDE the try below (not before it): by the time
  // runSession is called, `session` already owns a live browser + a provisioned Confluence page/Worker
  // instance, so a failure in run-directory setup (ENOSPC, a stale file at the path, EACCES) must be captured
  // as the primary error and still reach the always-run cleanup — nothing between "session provided" and
  // "cleanup" may throw past the cleanup guarantee. Declared here (as `let`) so the cleanup/return code below
  // can still see them.
  let timelinePath: string | undefined;
  let timeline: ActionEventTimelineWriter | undefined;

  let primaryError: unknown;
  let manifest: CaptureManifest | undefined;
  let manifestPath: string | undefined;
  let diagnostics: CaptureDiagnostics | undefined;

  try {
    mkdirSync(runDir, { recursive: true });
    timelinePath = capture ? join(runDir, CAPTURE_TIMELINE_FILENAME) : undefined;
    timeline = timelinePath ? new ActionEventTimelineWriter(timelinePath, clock, input.secretValues) : undefined;
    await executeScenes(ctx, plan, helpers, evidencePaths, timeline, observableTimeoutMs);
    if (capture) {
      // Stop recording BEFORE hashing so the WebM is fully flushed to disk.
      await session.stopScreencast();
      if (!session.videoPath) {
        throw new ConfluenceRunnerError('capture completed but the session produced no video path — Screencast was not started');
      }
      manifest = buildCaptureManifest({
        baseDir,
        sourceVideo: { absolutePath: session.videoPath, sha256: sha256Hex(readFileSync(session.videoPath)) },
        dimensions: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
        captureStartMs: session.captureStartedAtMs ?? clock(),
        tool: { playwrightVersion: session.playwrightVersion, browserName: session.browserName, browserVersion: session.browserVersion },
      });
      manifestPath = join(runDir, CAPTURE_MANIFEST_FILENAME);
      writeFileSync(manifestPath, canonicalJSONStringify(manifest), 'utf-8');
    }
  } catch (error) {
    primaryError = error;
    // Best-effort: flush a partial WebM (so a failed capture still leaves something to inspect), then save
    // diagnostics. Neither may throw past this point — a diagnostics failure must not replace the real error.
    if (capture) {
      try {
        await session.stopScreencast();
      } catch {
        /* best-effort */
      }
    }
    try {
      timeline?.append(DIAGNOSTICS_SCENE_ID, 'saveFailureDiagnostics', 'start');
      diagnostics = await session.saveFailureDiagnostics(runDir);
      timeline?.append(DIAGNOSTICS_SCENE_ID, 'saveFailureDiagnostics', 'success', {
        screenshot: Boolean(diagnostics.screenshotPath),
        trace: Boolean(diagnostics.tracePath),
        video: Boolean(diagnostics.videoPath),
      });
    } catch (diagError) {
      timeline?.append(DIAGNOSTICS_SCENE_ID, 'saveFailureDiagnostics', 'failure', { error: errorMessage(diagError) });
    }
  }

  // Cleanup ALWAYS runs, on both the success and failure paths (design doc: "Browser/page/instance cleanup
  // runs in finally").
  let cleanupError: unknown;
  try {
    timeline?.append(CLEANUP_SCENE_ID, 'cleanup', 'start');
    await session.cleanup();
    timeline?.append(CLEANUP_SCENE_ID, 'cleanup', 'success');
  } catch (error) {
    cleanupError = error;
    timeline?.append(CLEANUP_SCENE_ID, 'cleanup', 'failure', { error: errorMessage(error) });
  }

  // Flush the timeline last. A close() failure (disk full, etc.) must not itself mask a primary/cleanup error.
  if (timeline) {
    try {
      timeline.close();
    } catch {
      /* best-effort */
    }
  }

  if (primaryError !== undefined) {
    if (cleanupError !== undefined) {
      throw new ConfluenceRunnerError(`${mode} failed and cleanup ALSO failed — see .primaryError and .cleanupError`, { primaryError, cleanupError });
    }
    throw primaryError;
  }
  if (cleanupError !== undefined) {
    throw new ConfluenceRunnerError(`${mode} succeeded but cleanup failed — a Confluence page or Worker instance may be orphaned (see .cleanupError)`, { cleanupError });
  }

  return {
    mode,
    macroPage: session.macroPage,
    timelinePath,
    captureManifest: manifest,
    captureManifestPath: manifestPath,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Real-browser glue. Everything below constructs the real `RunnerHelpers`/`RunnerSession` seam from Playwright
// + the e2e helpers. It is exercised for real only in Task 9 (live dev-stack proof) — NOT by the unit tests,
// which inject fakes for everything above. Runtime Playwright imports are dynamic so loading this module under
// vitest never loads the Playwright test runtime.
// ---------------------------------------------------------------------------------------------------------

/** Resolve the installed Playwright version for the CaptureManifest's tool fingerprint. Reads it from
 *  `@playwright/test`'s own package.json (the driver package's `./package.json` subpath is export-gated and
 *  not directly requireable, but `@playwright/test/package.json` is). Falls back to `'unknown'` rather than
 *  failing a capture over a missing version string. */
function detectPlaywrightVersion(): string {
  try {
    const req = createRequire(import.meta.url);
    const pkg = req('@playwright/test/package.json') as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Basic auth header identical to `tests/e2e/helpers/confluence.ts`'s own (module-private) `auth()` — the
 *  same Forge email + API token, base64-encoded — reconstructed from env.ts's exported `E2E` config so this
 *  module can issue an OBSERVED page delete without modifying the shared helper. */
function confluenceBasicAuth(): string {
  return 'Basic ' + Buffer.from(`${E2E.forgeEmail}:${E2E.forgeApiToken}`).toString('base64');
}

/** Issue `DELETE /wiki/api/v2/pages/{id}` (the exact endpoint + auth confluence.ts's `deletePage` uses) and
 *  report the observed HTTP status — never throwing, so cleanup can attempt both deletes and decide afterward.
 *  A request that never completes (network error) is reported as `status: 0` (an unconfirmed teardown). */
async function deletePageObserved(pageId: string): Promise<ResourceDeleteOutcome> {
  try {
    const res = await fetch(`${E2E.baseUrl()}/wiki/api/v2/pages/${pageId}`, { method: 'DELETE', headers: { authorization: confluenceBasicAuth() } });
    return { kind: 'page', id: pageId, status: res.status };
  } catch {
    return { kind: 'page', id: pageId, status: 0 };
  }
}

/** Call the existing `deleteInstance` helper and report the observed status + the control Worker's `body.ok`,
 *  never throwing (a network error → `status: 0`). */
async function deleteInstanceObserved(instanceId: string): Promise<ResourceDeleteOutcome> {
  try {
    const res = await deleteInstance(instanceId);
    return { kind: 'instance', id: instanceId, status: res.status, bodyOk: res.body?.ok === true };
  } catch {
    return { kind: 'instance', id: instanceId, status: 0 };
  }
}

/** The real `RunnerHelpers`: the six forge.ts operations wired straight through (their signatures already
 *  match the seam), plus an `assertObservable` that reproduces full-flow.spec.ts's own body-text assertion via
 *  Playwright's web-first `expect` (dynamically imported so this module never loads the test runtime unless a
 *  real run actually reaches this assertion). */
export const realRunnerHelpers: RunnerHelpers = {
  openMacro,
  openPublisher,
  selectFiles,
  selectFolder,
  publishAndAwait,
  gotoPreview,
  async assertObservable(site, text, timeoutMs) {
    const { expect } = await import('@playwright/test');
    await expect(site.locator('body')).toContainText(text, { timeout: timeoutMs });
  },
};

interface CreateRealSessionOptions {
  readonly authStatePath: string;
  readonly macroPageTitle: string;
  readonly runDir: string;
  readonly clock: MonotonicClock;
}

/** Launch a real Chromium session with the saved auth state, fixed 1920×1080 viewport, locale, timezone, and
 *  reduced motion (action list item 1), start tracing (for failure diagnostics), optionally start the
 *  Screencast (capture mode), and create a FRESH Confluence macro page/instance (design doc, step 5: "Reset by
 *  creating a fresh Confluence page/instance"). Ordered so that no external Confluence page is created until
 *  the browser is fully up: if any step before `createMacroPage` fails, the browser is closed and no orphaned
 *  page can exist; if `createMacroPage` itself fails, the browser is closed before rethrowing. */
async function createRealSession(mode: 'rehearse' | 'capture', options: CreateRealSessionOptions): Promise<RunnerSession> {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      storageState: options.authStatePath,
      viewport: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
      locale: DEMO_LOCALE,
      timezoneId: DEMO_TIMEZONE,
      reducedMotion: 'reduce',
    });
    await context.tracing.start({ screenshots: true, snapshots: true, title: `mini-site demo ${mode}` });
    const page = await context.newPage();

    let videoPath: string | undefined;
    let captureStartedAtMs: number | undefined;
    if (mode === 'capture') {
      mkdirSync(options.runDir, { recursive: true });
      videoPath = join(options.runDir, RAW_VIDEO_FILENAME);
      await page.screencast.start({ path: videoPath, size: { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT } });
      captureStartedAtMs = options.clock();
    }

    // Created LAST so a browser-setup failure above can never leave an orphaned Confluence page.
    const macroPage = await createMacroPage({ title: options.macroPageTitle });

    let screencastStopped = false;
    return {
      page,
      macroPage,
      playwrightVersion: detectPlaywrightVersion(),
      browserName: 'chromium',
      browserVersion: browser.version(),
      videoPath,
      captureStartedAtMs,
      async stopScreencast() {
        if (mode !== 'capture' || screencastStopped) return;
        screencastStopped = true;
        await page.screencast.stop();
      },
      async saveFailureDiagnostics(dir) {
        mkdirSync(dir, { recursive: true });
        const result: { screenshotPath?: string; tracePath?: string; videoPath?: string } = { videoPath };
        try {
          const screenshotPath = join(dir, 'failure.png');
          await page.screenshot({ path: screenshotPath, fullPage: false });
          result.screenshotPath = screenshotPath;
        } catch {
          /* best-effort */
        }
        try {
          const tracePath = join(dir, 'trace.zip');
          await context.tracing.stop({ path: tracePath });
          result.tracePath = tracePath;
        } catch {
          /* best-effort */
        }
        return result;
      },
      async cleanup() {
        // Stop the screencast first so its WebM is flushed even when cleanup is the only thing that runs.
        if (mode === 'capture' && !screencastStopped) {
          screencastStopped = true;
          await page.screencast.stop().catch(() => {});
        }
        // Product-side teardown FIRST (delete the page + Worker instance), then the browser — a browser-close
        // failure must not prevent the external resource cleanup.
        try {
          // BOTH product-side deletes are CONFIRMED, not fire-and-forget. We deliberately do NOT route the page
          // delete through confluence.ts's `deletePage` helper: that helper swallows every error by its own
          // contract (full-flow.spec.ts's `finally` relies on it not throwing), which would silently orphan a
          // real page on lite-dev. Instead this module issues the same `DELETE /wiki/api/v2/pages/{id}` with the
          // same Basic auth `deletePage` uses internally (reconstructed from env.ts's exported `E2E`, so no
          // change to the shared helper) and OBSERVES the response — mirroring how the Worker-instance delete
          // is already checked. Both outcomes are attempted (never short-circuiting on the first failure) and
          // handed to `assertCleanupDeletesConfirmed`, whose thrown error `runSession` records as a
          // `cleanupError` without masking any primary error.
          const outcomes = [
            await deletePageObserved(macroPage.pageId),
            await deleteInstanceObserved(macroPage.instanceId),
          ];
          assertCleanupDeletesConfirmed(outcomes);
        } finally {
          await context.close().catch(() => {});
          await browser.close().catch(() => {});
        }
      },
    };
  } catch (error) {
    // Partial provisioning (before or during createMacroPage): close the browser so nothing leaks. No
    // Confluence page can be orphaned here — createMacroPage is the last step and either fully succeeded
    // (in which case we don't reach this catch) or failed (no page created).
    await browser.close().catch(() => {});
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Top-level entry points (Task 7's CLI calls these). Thin: build the real session + real helpers, delegate to
// `runSession`. `rehearse` blocks the pipeline on failure by throwing; `capture` produces the CaptureManifest.
// ---------------------------------------------------------------------------------------------------------

export interface RunOptions {
  readonly plan: DemoPlan;
  readonly evidence: readonly ResolvedEvidence[];
  readonly runDir: string;
  readonly baseDir?: string;
  /** Absolute path to the saved Playwright auth state. Defaults to `tests/e2e/.auth/state.json` under the
   *  repo root (the same cached state the `ui` e2e project reuses). */
  readonly authStatePath?: string;
  readonly macroPageTitle?: string;
  /** Run clock (defaults to `() => Date.now()` — a real capture, not a determinism-testing context). */
  readonly clock?: MonotonicClock;
  readonly secretValues?: readonly string[];
  readonly observableTimeoutMs?: number;
  /** Override the helpers seam (defaults to `realRunnerHelpers`). Present so an integration harness can wrap
   *  the real helpers; unit tests bypass this function entirely and call `runSession` with a fake session. */
  readonly helpers?: RunnerHelpers;
}

/** Rehearse the plan against the real dev stack WITHOUT Screencast (design doc, step 4). Throws on any
 *  failure — an unambiguous signal Task 7's CLI uses to block capture/render. Always cleans up. */
export async function rehearse(options: RunOptions): Promise<RunSessionResult> {
  return runReal('rehearse', options);
}

/** Capture the plan against the real dev stack WITH Screencast on a FRESH page/instance (design doc, step 5),
 *  recording the ActionEvent timeline and producing a CaptureManifest. Always cleans up. */
export async function capture(options: RunOptions): Promise<RunSessionResult> {
  return runReal('capture', options);
}

async function runReal(mode: 'rehearse' | 'capture', options: RunOptions): Promise<RunSessionResult> {
  const clock = options.clock ?? (() => Date.now());
  const authStatePath = options.authStatePath ?? resolve(repoRoot(), AUTH_STATE);
  const session = await createRealSession(mode, {
    authStatePath,
    macroPageTitle: options.macroPageTitle ?? `mini-site demo ${mode} ${new Date().toISOString()}`,
    runDir: options.runDir,
    clock,
  });
  return runSession({
    mode,
    plan: options.plan,
    evidence: options.evidence,
    session,
    helpers: options.helpers ?? realRunnerHelpers,
    clock,
    runDir: options.runDir,
    baseDir: options.baseDir,
    secretValues: options.secretValues,
    observableTimeoutMs: options.observableTimeoutMs,
  });
}
