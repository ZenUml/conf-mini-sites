// Project-aware rehearsal/capture runner tests (design doc, "Data flow and timing", steps 4–6; "Error
// handling and recovery": "Rehearsal failure blocks capture and render"; "Browser/page/instance cleanup runs
// in finally; cleanup failure is recorded without hiding the primary error"; "Contracts": "CaptureManifest:
// source video, dimensions, time base, capture/tool versions, and hashes").
//
// EVERY test in this file runs the runner's STATE MACHINE (operation dispatch, event recording, the
// cleanup-always-in-finally guarantee, error/cleanup-error surfacing, CaptureManifest construction) against
// INJECTED FAKES — a fake `RunnerHelpers` (the six Forge operations + the observable assertion) and a fake
// `RunnerSession` (the browser/page/instance seam). No real Chromium is ever launched, no auth state is read,
// no network or live credentials are touched. The real-browser glue (`rehearse`/`capture`, which launch
// Chromium and wire the actual e2e helpers) is deliberately NOT exercised here — that is Task 9's live proof.
//
// The one non-fake dependency used here is `timeline.ts`'s real `ActionEventTimelineWriter`, driven by an
// INJECTED FAKE CLOCK (it is already pure/deterministic when given one — see timeline.test.ts), so event
// ordering assertions never depend on real wall-clock time.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Frame, Page } from '@playwright/test';
import { sha256Hex } from '../src/contracts';
import { compileDemoPlan, type DemoPlan, type NarrationDurationsMs } from '../src/plan';
import { loadStory, repoRoot, type ResolvedEvidence } from '../src/story';
import { ActionEventTimelineWriter, type ActionEvent } from '../src/timeline';
import {
  assertCleanupDeletesConfirmed,
  buildCaptureManifest,
  CAPTURE_HEIGHT,
  CAPTURE_MANIFEST_SCHEMA_VERSION,
  CAPTURE_WIDTH,
  ConfluenceRunnerError,
  dispatchOperation,
  evidencePathsFromResolved,
  executeScenes,
  runSession,
  type RunnerContext,
  type RunnerHelpers,
  type RunnerSession,
} from '../src/confluenceRunner';

const STORY_PATH = `${repoRoot()}/demo-pipeline/stories/mini-site-launch.story.json`;

const FIXED_DURATIONS_MS: NarrationDurationsMs = {
  'start-in-confluence': 1_500,
  'upload-and-publish': 2_000,
  'prove-the-outcome': 1_200,
};

function loadRealPlan(): { plan: DemoPlan; evidence: readonly ResolvedEvidence[] } {
  const { story, evidence } = loadStory(STORY_PATH);
  return { plan: compileDemoPlan(story, FIXED_DURATIONS_MS), evidence };
}

// --- Fakes -----------------------------------------------------------------------------------------------

/** Opaque sentinel tokens standing in for the Playwright Page/Frame objects the runner threads between
 *  helpers. The state machine treats them as opaque handles (it only hands them to the injected helpers), so a
 *  plain object cast to the Playwright type is enough — no real browser object is ever constructed. */
const FAKE_PAGE = { __fake: 'page' } as unknown as Page;
const FAKE_LAUNCHER = { __fake: 'launcher' } as unknown as Frame;
const FAKE_MODAL = { __fake: 'modal' } as unknown as Frame;
const FAKE_SITE = { __fake: 'site' } as unknown as Frame;

function makeFakeHelpers(overrides: Partial<RunnerHelpers> = {}): RunnerHelpers {
  return {
    openMacro: vi.fn(async () => FAKE_LAUNCHER),
    openPublisher: vi.fn(async () => FAKE_MODAL),
    selectFiles: vi.fn(async () => {}),
    selectFolder: vi.fn(async () => {}),
    publishAndAwait: vi.fn(async () => 'handoff' as const),
    gotoPreview: vi.fn(async () => FAKE_SITE),
    assertObservable: vi.fn(async () => {}),
    ...overrides,
  };
}

interface FakeSessionParts {
  session: RunnerSession;
  cleanup: ReturnType<typeof vi.fn>;
  stopScreencast: ReturnType<typeof vi.fn>;
  saveFailureDiagnostics: ReturnType<typeof vi.fn>;
}

function makeFakeSession(overrides: Partial<RunnerSession> = {}): FakeSessionParts {
  const cleanup = vi.fn(async () => {});
  const stopScreencast = vi.fn(async () => {});
  const saveFailureDiagnostics = vi.fn(async () => ({ screenshotPath: 'failure.png', tracePath: 'trace.zip' }));
  const session: RunnerSession = {
    page: FAKE_PAGE,
    macroPage: { pageId: 'PAGE-1', url: 'https://lite-dev.atlassian.net/wiki/spaces/SD/pages/PAGE-1', localId: 'LOCAL-1', instanceId: 'iInstance1' },
    playwrightVersion: '1.61.0',
    browserName: 'chromium',
    browserVersion: '141.0.7390.54',
    videoPath: undefined,
    captureStartedAtMs: undefined,
    stopScreencast,
    saveFailureDiagnostics,
    cleanup,
    ...overrides,
  };
  return { session, cleanup, stopScreencast, saveFailureDiagnostics };
}

function readEvents(path: string): ActionEvent[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ActionEvent);
}

/** A monotonic fake clock: each call returns a strictly larger integer, so event timestamps are deterministic
 *  and strictly increasing without any dependency on real time. */
function makeFakeClock(): () => number {
  let tick = 0;
  return () => (tick += 10);
}

/** Await a promise that is expected to REJECT and return the rejection value, typed as ConfluenceRunnerError.
 *  Fails the test if the promise unexpectedly resolves. Keeps the `.primaryError`/`.cleanupError` assertions
 *  below strongly typed (a bare `.catch(e => e)` would widen the result to `Result | Error`). */
async function expectRejection(promise: Promise<unknown>): Promise<ConfluenceRunnerError> {
  try {
    await promise;
  } catch (error) {
    return error as ConfluenceRunnerError;
  }
  throw new Error('expected the promise to reject, but it resolved');
}

let workDir: string;
beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-runner-test-'));
});
afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// -------------------------------------------------------------------------------------------------------
// dispatchOperation — the closed operation-to-helper map: each of the 6 SceneOperation variants dispatches to
// exactly one helper, threading return values (launcher → modal → outcome → site) across the context.
// -------------------------------------------------------------------------------------------------------

describe('dispatchOperation: closed operation-to-helper map + state threading', () => {
  it('openMacro → openMacro(page, macroPageUrl), storing the launcher on the context', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'https://site/wiki/x' };
    await dispatchOperation(ctx, { type: 'openMacro' }, helpers, new Map());
    expect(helpers.openMacro).toHaveBeenCalledWith(FAKE_PAGE, 'https://site/wiki/x');
    expect(ctx.launcher).toBe(FAKE_LAUNCHER);
  });

  it('openPublisher → openPublisher(page, launcher) using the exact launcher openMacro produced, storing the modal', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u' };
    await dispatchOperation(ctx, { type: 'openMacro' }, helpers, new Map());
    await dispatchOperation(ctx, { type: 'openPublisher' }, helpers, new Map());
    expect(helpers.openPublisher).toHaveBeenCalledWith(FAKE_PAGE, FAKE_LAUNCHER);
    expect(ctx.modal).toBe(FAKE_MODAL);
  });

  it('selectFiles → resolves each evidenceId to its absolute path (in order) and calls selectFiles(page, modal, paths)', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    const paths = new Map([
      ['idx', '/abs/index.html'],
      ['app', '/abs/app.js'],
      ['css', '/abs/style.css'],
    ]);
    await dispatchOperation(ctx, { type: 'selectFiles', evidenceIds: ['idx', 'app', 'css'] }, helpers, paths);
    expect(helpers.selectFiles).toHaveBeenCalledWith(FAKE_PAGE, FAKE_MODAL, ['/abs/index.html', '/abs/app.js', '/abs/style.css']);
  });

  it('selectFolder → resolves the single directory evidenceId and calls selectFolder(page, modal, dir)', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    const paths = new Map([['bundle', '/abs/bundle']]);
    await dispatchOperation(ctx, { type: 'selectFolder', evidenceId: 'bundle' }, helpers, paths);
    expect(helpers.selectFolder).toHaveBeenCalledWith(FAKE_PAGE, FAKE_MODAL, '/abs/bundle');
  });

  it('publishAndAwait → forwards the optional timeout, stores the outcome, and resolves on "handoff"', async () => {
    const publishAndAwait = vi.fn(async () => 'handoff' as const);
    const helpers = makeFakeHelpers({ publishAndAwait });
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    await dispatchOperation(ctx, { type: 'publishAndAwait', timeoutMs: 12_345 }, helpers, new Map());
    expect(publishAndAwait).toHaveBeenCalledWith(FAKE_MODAL, 12_345);
    expect(ctx.publishOutcome).toBe('handoff');
  });

  it('publishAndAwait resolving to "error" throws ConfluenceRunnerError (the bundle was rejected before handoff)', async () => {
    const helpers = makeFakeHelpers({ publishAndAwait: vi.fn(async () => 'error' as const) });
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    await expect(dispatchOperation(ctx, { type: 'publishAndAwait' }, helpers, new Map())).rejects.toThrow(ConfluenceRunnerError);
  });

  it('gotoPreview → gotoPreview(page, modal), storing the dispatched site frame', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    await dispatchOperation(ctx, { type: 'gotoPreview' }, helpers, new Map());
    expect(helpers.gotoPreview).toHaveBeenCalledWith(FAKE_PAGE, FAKE_MODAL);
    expect(ctx.site).toBe(FAKE_SITE);
  });

  it('an out-of-order operation (openPublisher before any openMacro) throws ConfluenceRunnerError, not a cryptic crash', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u' };
    await expect(dispatchOperation(ctx, { type: 'openPublisher' }, helpers, new Map())).rejects.toThrow(ConfluenceRunnerError);
    expect(helpers.openPublisher).not.toHaveBeenCalled();
  });

  it('selectFiles referencing an unresolved evidence id throws ConfluenceRunnerError before touching the helper', async () => {
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u', modal: FAKE_MODAL };
    await expect(dispatchOperation(ctx, { type: 'selectFiles', evidenceIds: ['missing'] }, helpers, new Map())).rejects.toThrow(ConfluenceRunnerError);
    expect(helpers.selectFiles).not.toHaveBeenCalled();
  });

  it('threads the whole real-story sequence launcher→modal→outcome→site through one context', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'https://site/wiki/p' };
    const paths = evidencePathsFromResolved(evidence);
    for (const scene of plan.scenes) {
      for (const op of scene.operations) {
        await dispatchOperation(ctx, op, helpers, paths);
      }
    }
    expect(ctx.launcher).toBe(FAKE_LAUNCHER);
    expect(ctx.modal).toBe(FAKE_MODAL);
    expect(ctx.publishOutcome).toBe('handoff');
    expect(ctx.site).toBe(FAKE_SITE);
    // selectFiles got exactly the three resolved sample-bundle absolute paths, in story order.
    const selectFilesArgs = (helpers.selectFiles as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(selectFilesArgs[2]).toHaveLength(3);
    for (const p of selectFilesArgs[2] as string[]) expect(p.endsWith('.html') || p.endsWith('.js') || p.endsWith('.css')).toBe(true);
  });
});

// -------------------------------------------------------------------------------------------------------
// executeScenes — ActionEvent lifecycle recording (start/success/failure) in plan order, plus the final
// outcome-assertion event. Uses the real ActionEventTimelineWriter with an injected fake clock.
// -------------------------------------------------------------------------------------------------------

describe('executeScenes: ActionEvent lifecycle recording', () => {
  it('records start→success per operation in plan order, then the outcome assertion, stamped by the injected clock', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers();
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u' };
    const timelinePath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(timelinePath, makeFakeClock());

    await executeScenes(ctx, plan, helpers, evidencePathsFromResolved(evidence), writer);
    writer.close();

    const events = readEvents(timelinePath);
    expect(events.map((e) => `${e.operation}:${e.lifecycle}`)).toEqual([
      'openMacro:start',
      'openMacro:success',
      'openPublisher:start',
      'openPublisher:success',
      'selectFiles:start',
      'selectFiles:success',
      'publishAndAwait:start',
      'publishAndAwait:success',
      'gotoPreview:start',
      'gotoPreview:success',
      'assertObservable:start',
      'assertObservable:success',
    ]);
    // Timestamps come straight from the injected clock — strictly increasing, no real-time dependency.
    const timestamps = events.map((e) => e.timestampMs);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
    // Scene ids are carried through: the first op belongs to the first scene, the assertion to the last scene.
    expect(events[0].sceneId).toBe(plan.scenes[0].id);
    expect(events[events.length - 1].sceneId).toBe(plan.scenes[plan.scenes.length - 1].id);
  });

  it('records a failure event for the operation that throws and stops there — no later operations run', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers({ publishAndAwait: vi.fn(async () => 'error' as const) });
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u' };
    const timelinePath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(timelinePath, makeFakeClock());

    await expect(executeScenes(ctx, plan, helpers, evidencePathsFromResolved(evidence), writer)).rejects.toThrow(ConfluenceRunnerError);
    writer.close();

    const seq = readEvents(timelinePath).map((e) => `${e.operation}:${e.lifecycle}`);
    expect(seq).toContain('publishAndAwait:failure');
    // gotoPreview and the outcome assertion are never reached once publish fails.
    expect(seq.some((s) => s.startsWith('gotoPreview'))).toBe(false);
    expect(seq.some((s) => s.startsWith('assertObservable'))).toBe(false);
    expect(helpers.gotoPreview).not.toHaveBeenCalled();
  });

  it('records an outcome-assertion failure when the observable claim is not satisfied', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers({ assertObservable: vi.fn(async () => { throw new Error('claim text not found in body'); }) });
    const ctx: RunnerContext = { page: FAKE_PAGE, macroPageUrl: 'u' };
    const timelinePath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(timelinePath, makeFakeClock());

    await expect(executeScenes(ctx, plan, helpers, evidencePathsFromResolved(evidence), writer)).rejects.toThrow(/claim text not found/);
    writer.close();

    const seq = readEvents(timelinePath).map((e) => `${e.operation}:${e.lifecycle}`);
    expect(seq).toContain('assertObservable:start');
    expect(seq).toContain('assertObservable:failure');
    expect(seq).not.toContain('assertObservable:success');
  });
});

// -------------------------------------------------------------------------------------------------------
// runSession — cleanup ALWAYS runs in finally (success + failure); rehearsal failure is an unambiguous
// thrown signal that never runs capture logic; a cleanup failure never masks the primary error.
// -------------------------------------------------------------------------------------------------------

describe('runSession: cleanup always runs in finally', () => {
  it('runs cleanup exactly once on a successful rehearsal', async () => {
    const { plan, evidence } = loadRealPlan();
    const { session, cleanup, stopScreencast } = makeFakeSession();
    const result = await runSession({ mode: 'rehearse', plan, evidence, session, helpers: makeFakeHelpers(), clock: makeFakeClock(), runDir: workDir });
    expect(cleanup).toHaveBeenCalledTimes(1);
    // Rehearsal never engages any capture machinery.
    expect(stopScreencast).not.toHaveBeenCalled();
    expect(result.captureManifest).toBeUndefined();
    expect(result.timelinePath).toBeUndefined();
  });

  it('runs cleanup even when run-directory setup fails before any operation (session already owns a live browser + page/instance)', async () => {
    const { plan, evidence } = loadRealPlan();
    // Force `mkdirSync(runDir)` to throw: point runDir at a path UNDER a regular file, so creating it is
    // ENOTDIR. The session was already provisioned (a real run would already hold a browser + Confluence page
    // + Worker instance at this point), so cleanup must still run despite the setup failure.
    const filePath = join(workDir, 'not-a-directory');
    writeFileSync(filePath, 'x');
    const badRunDir = join(filePath, 'sub');
    const { session, cleanup } = makeFakeSession();
    await expect(runSession({ mode: 'rehearse', plan, evidence, session, helpers: makeFakeHelpers(), clock: makeFakeClock(), runDir: badRunDir })).rejects.toThrow();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('runs cleanup exactly once even when an operation fails, and rethrows the primary error unchanged', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers({ openMacro: vi.fn(async () => { throw new Error('BOOM_PRIMARY'); }) });
    const { session, cleanup, saveFailureDiagnostics } = makeFakeSession();
    await expect(runSession({ mode: 'rehearse', plan, evidence, session, helpers, clock: makeFakeClock(), runDir: workDir })).rejects.toThrow('BOOM_PRIMARY');
    expect(cleanup).toHaveBeenCalledTimes(1);
    // A failure — even in rehearsal — still tries to save diagnostics for debugging.
    expect(saveFailureDiagnostics).toHaveBeenCalledTimes(1);
  });
});

describe('runSession: rehearsal failure is an unambiguous blocking signal', () => {
  it('throws (does not resolve) when the observable claim cannot be proven, so a caller cannot proceed to capture', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers({ assertObservable: vi.fn(async () => { throw new Error('Mini-Site is live NOT found'); }) });
    const { session, cleanup } = makeFakeSession();
    await expect(runSession({ mode: 'rehearse', plan, evidence, session, helpers, clock: makeFakeClock(), runDir: workDir })).rejects.toThrow(/NOT found/);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('runSession: a cleanup failure never hides the primary error', () => {
  it('surfaces BOTH the primary operation error and the cleanup error, with the primary preserved', async () => {
    const { plan, evidence } = loadRealPlan();
    const helpers = makeFakeHelpers({ publishAndAwait: vi.fn(async () => 'error' as const) });
    const cleanup = vi.fn(async () => { throw new Error('CLEANUP_BOOM'); });
    const { session } = makeFakeSession({ cleanup });
    const error = await expectRejection(runSession({ mode: 'rehearse', plan, evidence, session, helpers, clock: makeFakeClock(), runDir: workDir }));

    expect(error).toBeInstanceOf(ConfluenceRunnerError);
    // The primary error (the publish 'error' outcome) is preserved, not replaced by the cleanup error.
    expect(error.primaryError).toBeInstanceOf(ConfluenceRunnerError);
    expect(String((error.primaryError as Error).message)).toMatch(/handoff/);
    // The cleanup error is still surfaced alongside it.
    expect(String(error.cleanupError)).toContain('CLEANUP_BOOM');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('on a SUCCESSFUL run whose cleanup fails, throws a cleanup error naming the possible orphan', async () => {
    const { plan, evidence } = loadRealPlan();
    const cleanup = vi.fn(async () => { throw new Error('CLEANUP_BOOM'); });
    const { session } = makeFakeSession({ cleanup });
    const error = await expectRejection(runSession({ mode: 'rehearse', plan, evidence, session, helpers: makeFakeHelpers(), clock: makeFakeClock(), runDir: workDir }));
    expect(error).toBeInstanceOf(ConfluenceRunnerError);
    expect(error.primaryError).toBeUndefined();
    expect(String(error.cleanupError)).toContain('CLEANUP_BOOM');
    expect(String(error.message)).toMatch(/orphan/i);
  });
});

// -------------------------------------------------------------------------------------------------------
// Cleanup resource-teardown verification — a FAILED page delete (not just a failed instance delete) must
// become a cleanupError, never a silently-orphaned page. assertCleanupDeletesConfirmed is the pure decision
// the real cleanup hands its observed page + instance DELETE responses to.
// -------------------------------------------------------------------------------------------------------

describe('assertCleanupDeletesConfirmed: both page and instance deletes must be confirmed', () => {
  it('passes when the page delete is 204 and the instance delete is 200 { ok: true }', () => {
    expect(() =>
      assertCleanupDeletesConfirmed([
        { kind: 'page', id: 'PAGE-1', status: 204 },
        { kind: 'instance', id: 'iInstance1', status: 200, bodyOk: true },
      ]),
    ).not.toThrow();
  });

  it('treats a 404 page delete as confirmed (idempotent — the page is already gone)', () => {
    expect(() => assertCleanupDeletesConfirmed([{ kind: 'page', id: 'PAGE-1', status: 404 }])).not.toThrow();
  });

  it('throws ConfluenceRunnerError naming the page when its delete returns a non-2xx/non-404 status (e.g. 401 auth)', () => {
    expect(() => assertCleanupDeletesConfirmed([{ kind: 'page', id: 'PAGE-1', status: 401 }])).toThrow(ConfluenceRunnerError);
    expect(() => assertCleanupDeletesConfirmed([{ kind: 'page', id: 'PAGE-1', status: 401 }])).toThrow(/page "PAGE-1"/);
  });

  it('throws when a page delete never completed (network failure reported as status 0)', () => {
    expect(() => assertCleanupDeletesConfirmed([{ kind: 'page', id: 'PAGE-1', status: 0 }])).toThrow(/page "PAGE-1"/);
  });

  it('throws when the instance delete is 2xx but body.ok is not true (the same guard, now for the instance side)', () => {
    expect(() => assertCleanupDeletesConfirmed([{ kind: 'instance', id: 'iInstance1', status: 200, bodyOk: false }])).toThrow(ConfluenceRunnerError);
  });

  it('reports EVERY failed delete, not just the first (page AND instance both named)', () => {
    let message = '';
    try {
      assertCleanupDeletesConfirmed([
        { kind: 'page', id: 'PAGE-1', status: 500 },
        { kind: 'instance', id: 'iInstance1', status: 502 },
      ]);
    } catch (error) {
      message = (error as ConfluenceRunnerError).message;
    }
    expect(message).toContain('page "PAGE-1"');
    expect(message).toContain('instance "iInstance1"');
  });
});

describe('runSession: a failed page delete surfaces as a cleanupError (fake-session harness)', () => {
  it('on an otherwise-successful run, a page-orphan cleanup error is surfaced without masking anything', async () => {
    const { plan, evidence } = loadRealPlan();
    // The real cleanup builds this exact error via assertCleanupDeletesConfirmed on a failed page delete; the
    // fake session throws the same shape so runSession's cleanupError plumbing is exercised end to end.
    const cleanup = vi.fn(async () => {
      throw new ConfluenceRunnerError('cleanup could not confirm teardown of: page "PAGE-1" (status 401) — the resource(s) may be orphaned');
    });
    const { session } = makeFakeSession({ cleanup });
    const error = await expectRejection(runSession({ mode: 'rehearse', plan, evidence, session, helpers: makeFakeHelpers(), clock: makeFakeClock(), runDir: workDir }));
    expect(error).toBeInstanceOf(ConfluenceRunnerError);
    expect(error.primaryError).toBeUndefined();
    expect(String(error.cleanupError)).toContain('page "PAGE-1"');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

// -------------------------------------------------------------------------------------------------------
// runSession (capture mode) — writes the ActionEvent timeline + CaptureManifest on success, saves diagnostics
// on failure. Still fully faked: a real temp file stands in for the Screencast WebM so the manifest's hash is
// genuinely computed, but no browser produced it.
// -------------------------------------------------------------------------------------------------------

describe('runSession: capture mode produces timeline + CaptureManifest and cleans up', () => {
  it('on success: stops screencast, writes the timeline JSONL, builds a CaptureManifest hashing the real WebM, and cleans up', async () => {
    const { plan, evidence } = loadRealPlan();
    const videoPath = join(workDir, 'raw.webm');
    writeFileSync(videoPath, 'FAKE-WEBM-CONTENTS-standing-in-for-a-real-screencast');
    const { session, cleanup, stopScreencast } = makeFakeSession({ videoPath, captureStartedAtMs: 1_000 });

    const result = await runSession({ mode: 'capture', plan, evidence, session, helpers: makeFakeHelpers(), clock: makeFakeClock(), runDir: workDir, baseDir: workDir });

    expect(stopScreencast).toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);

    // Timeline JSONL exists and captured the operation lifecycle + cleanup.
    expect(existsSync(result.timelinePath!)).toBe(true);
    const ops = readEvents(result.timelinePath!).map((e) => `${e.operation}:${e.lifecycle}`);
    expect(ops).toContain('openMacro:start');
    expect(ops).toContain('assertObservable:success');
    expect(ops).toContain('cleanup:success');

    // CaptureManifest is on disk and correct.
    const manifest = result.captureManifest!;
    expect(existsSync(result.captureManifestPath!)).toBe(true);
    expect(manifest.schemaVersion).toBe(CAPTURE_MANIFEST_SCHEMA_VERSION);
    expect(manifest.sourceVideo.path).toBe('raw.webm'); // normalized relative to baseDir (workDir).
    expect(manifest.sourceVideo.sha256).toBe(sha256Hex(readFileSync(videoPath)));
    expect(manifest.dimensions).toEqual({ width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT });
    expect(manifest.timeBase).toEqual({ unit: 'ms', captureStartMs: 1_000 });
    expect(manifest.tool).toEqual({ playwrightVersion: '1.61.0', browserName: 'chromium', browserVersion: '141.0.7390.54' });
  });

  it('on failure: stops screencast, saves diagnostics, runs cleanup, and throws the primary error', async () => {
    const { plan, evidence } = loadRealPlan();
    const videoPath = join(workDir, 'raw.webm');
    writeFileSync(videoPath, 'partial');
    const helpers = makeFakeHelpers({ gotoPreview: vi.fn(async () => { throw new Error('PREVIEW_BOOM'); }) });
    const { session, cleanup, stopScreencast, saveFailureDiagnostics } = makeFakeSession({ videoPath, captureStartedAtMs: 0 });

    const result = await runSession({ mode: 'capture', plan, evidence, session, helpers, clock: makeFakeClock(), runDir: workDir, baseDir: workDir }).catch((e) => e);

    expect(result).toBeInstanceOf(Error);
    expect(String((result as Error).message)).toContain('PREVIEW_BOOM');
    expect(stopScreencast).toHaveBeenCalled();
    expect(saveFailureDiagnostics).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    // No capture manifest was written for a failed capture.
    expect(existsSync(join(workDir, 'capture-manifest.json'))).toBe(false);
  });
});

// -------------------------------------------------------------------------------------------------------
// buildCaptureManifest — pure builder (design doc, "Contracts": CaptureManifest = source video, dimensions,
// time base, capture/tool versions, and hashes). Mirrors render.ts's buildRenderManifest pure-builder test.
// -------------------------------------------------------------------------------------------------------

describe('buildCaptureManifest: normalized, portable, correct hashes/versions', () => {
  it('normalizes the video path relative to baseDir and carries hash, dimensions, time base, and tool versions', () => {
    const baseDir = '/Users/exampleuser/workspaces/conf-mini-sites';
    const manifest = buildCaptureManifest({
      baseDir,
      sourceVideo: { absolutePath: `${baseDir}/.demo-runs/run-1/raw.webm`, sha256: 'a'.repeat(64) },
      dimensions: { width: 1920, height: 1080 },
      captureStartMs: 1_723_000_000_000,
      tool: { playwrightVersion: '1.61.0', browserName: 'chromium', browserVersion: '141.0.7390.54' },
    });

    expect(manifest.schemaVersion).toBe(CAPTURE_MANIFEST_SCHEMA_VERSION);
    expect(manifest.sourceVideo.path).toBe('.demo-runs/run-1/raw.webm');
    expect(manifest.sourceVideo.path.startsWith('/')).toBe(false);
    expect(manifest.sourceVideo.sha256).toBe('a'.repeat(64));
    expect(manifest.dimensions).toEqual({ width: 1920, height: 1080 });
    expect(manifest.timeBase).toEqual({ unit: 'ms', captureStartMs: 1_723_000_000_000 });
    expect(manifest.tool.playwrightVersion).toBe('1.61.0');
    expect(manifest.tool.browserVersion).toBe('141.0.7390.54');
    // The manifest never leaks the machine-specific baseDir (e.g. a home directory).
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain(baseDir);
    expect(serialized).not.toContain('/Users/');
  });
});

// -------------------------------------------------------------------------------------------------------
// evidencePathsFromResolved — resolved-evidence → (id → absolute path) map used to turn selectFiles/
// selectFolder evidence ids into real upload paths.
// -------------------------------------------------------------------------------------------------------

describe('evidencePathsFromResolved', () => {
  it('maps every resolved evidence id to its absolute path', () => {
    const { evidence } = loadRealPlan();
    const map = evidencePathsFromResolved(evidence);
    for (const e of evidence) {
      expect(map.get(e.id)).toBe(e.absolutePath);
    }
    expect(map.get('sample-bundle-index')).toMatch(/tests\/e2e\/fixtures\/sample-bundle\/index\.html$/);
  });
});
