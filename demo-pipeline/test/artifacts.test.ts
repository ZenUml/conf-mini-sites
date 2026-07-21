// Run-directory + job-phase-state bookkeeping tests (design doc, "Error handling and recovery": "The CLI uses
// explicit job phases ... A phase writes its manifest atomically only after success. Existing completed
// phases are reusable when their input hashes still match."). Pure/fs-local — no real browser, FFmpeg, or
// Kokoro anywhere in this file; every fixture is a tiny hand-written file in a tmp directory.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/contracts';
import {
  ArtifactsError,
  ensureRunDir,
  evaluatePhaseReuse,
  FAILURE_FILENAME,
  generateRunId,
  hashFile,
  JOB_PHASES,
  listRunIds,
  readAllPhases,
  readFailure,
  readJobStatus,
  readPhase,
  runDirPath,
  runsDir,
  validateRunId,
  writeFailure,
  writePhase,
  type FailureRecord,
} from '../src/artifacts';

let root: string;

beforeEach(() => {
  // A throwaway "repo root" — artifacts.ts's own functions all accept an explicit `root`, so no test here
  // ever touches the real repository's demo-pipeline/.demo-runs directory.
  root = mkdtempSync(join(tmpdir(), 'demo-pipeline-artifacts-test-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('JOB_PHASES: execution order', () => {
  it('lists narration before plan compilation (plan.ts requires narration durations as an input)', () => {
    expect(JOB_PHASES.indexOf('narrated')).toBeLessThan(JOB_PHASES.indexOf('planned'));
  });

  it('is the full six-phase sequence, in dependency order', () => {
    expect(JOB_PHASES).toEqual(['narrated', 'planned', 'rehearsed', 'captured', 'rendered', 'verified']);
  });
});

describe('generateRunId', () => {
  it('is deterministic for a fixed clock and random suffix', () => {
    const now = new Date(Date.UTC(2026, 6, 21, 9, 5, 3)); // 2026-07-21T09:05:03Z
    expect(generateRunId(now, 'ab12')).toBe('20260721-090503-ab12');
  });

  it('pads single-digit month/day/hour/minute/second components to two digits', () => {
    const now = new Date(Date.UTC(2026, 0, 2, 3, 4, 5)); // 2026-01-02T03:04:05Z
    expect(generateRunId(now, 'ffff')).toBe('20260102-030405-ffff');
  });

  it('never contains a colon (defense-in-depth against the protocol-misparsing issue render.ts had to patch around)', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRunId()).not.toContain(':');
    }
  });

  it('generates a different id on successive calls (random suffix, no arguments)', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateRunId()));
    expect(ids.size).toBe(50);
  });
});

describe('validateRunId', () => {
  it('accepts a normal generated run id', () => {
    expect(() => validateRunId('20260721-090503-ab12')).not.toThrow();
  });

  it('accepts a simple hand-picked id', () => {
    expect(() => validateRunId('manual-e2e-proof')).not.toThrow();
  });

  it.each(['', '../escape', 'a/b', 'a\\b', '/etc/passwd', '..', 'a..b/c'])('rejects unsafe run id %j', (bad) => {
    expect(() => validateRunId(bad)).toThrow(ArtifactsError);
  });

  it('rejects a run id starting with a dot (would create a hidden/relative-looking segment)', () => {
    expect(() => validateRunId('.hidden')).toThrow(ArtifactsError);
  });
});

describe('runsDir / runDirPath', () => {
  it('places runs under demo-pipeline/.demo-runs relative to root', () => {
    expect(runsDir(root)).toBe(join(root, 'demo-pipeline', '.demo-runs'));
  });

  it('joins a validated run id onto runsDir', () => {
    expect(runDirPath('my-run', root)).toBe(join(runsDir(root), 'my-run'));
  });

  it('propagates validateRunId rejections (never resolves a path-traversal run id anywhere, let alone outside runsDir)', () => {
    expect(() => runDirPath('../../escape', root)).toThrow(ArtifactsError);
  });
});

describe('ensureRunDir', () => {
  it('creates the run directory and its phases/ subdirectory', () => {
    const runDir = runDirPath('run-a', root);
    expect(existsSync(runDir)).toBe(false);
    ensureRunDir(runDir);
    expect(existsSync(runDir)).toBe(true);
    expect(existsSync(join(runDir, 'phases'))).toBe(true);
  });

  it('is idempotent — calling it twice does not throw', () => {
    const runDir = runDirPath('run-b', root);
    ensureRunDir(runDir);
    expect(() => ensureRunDir(runDir)).not.toThrow();
  });
});

describe('hashFile', () => {
  it('matches sha256Hex of the file contents', () => {
    const filePath = join(root, 'sample.txt');
    writeFileSync(filePath, 'hello world');
    expect(hashFile(filePath)).toBe(sha256Hex('hello world'));
  });
});

describe('writePhase / readPhase: atomic write, round-trip', () => {
  let runDir: string;

  beforeEach(() => {
    runDir = runDirPath('run-phase', root);
    ensureRunDir(runDir);
  });

  it('produces no phase file until writePhase is called', () => {
    expect(readPhase(runDir, 'narrated')).toBeUndefined();
  });

  it('round-trips schemaVersion, phase, inputHashes, and outputs exactly', () => {
    const outputs = [{ path: 'demo-pipeline/.demo-cache/narration/abc.wav', sha256: 'deadbeef' }];
    const written = writePhase(runDir, 'narrated', { storyHash: 'story-hash-1' }, outputs, '2026-07-21T09:00:00.000Z');
    expect(written).toEqual({
      schemaVersion: 1,
      phase: 'narrated',
      completedAt: '2026-07-21T09:00:00.000Z',
      inputHashes: { storyHash: 'story-hash-1' },
      outputs,
    });

    const read = readPhase(runDir, 'narrated');
    expect(read).toEqual(written);
  });

  it('leaves no stray temp file behind after a successful write', () => {
    writePhase(runDir, 'planned', { storyHash: 'x' });
    const entries = readdirSync(join(runDir, 'phases'));
    expect(entries).toEqual(['planned.json']);
  });

  it('defaults outputs to an empty array and completedAt to an ISO timestamp when omitted', () => {
    const before = Date.now();
    const written = writePhase(runDir, 'rehearsed', { planHash: 'p1' });
    const after = Date.now();
    expect(written.outputs).toEqual([]);
    const completedAtMs = Date.parse(written.completedAt);
    expect(completedAtMs).toBeGreaterThanOrEqual(before);
    expect(completedAtMs).toBeLessThanOrEqual(after);
  });

  it('overwrites a prior write for the same phase (a re-run replaces, not appends)', () => {
    writePhase(runDir, 'planned', { storyHash: 'old' });
    writePhase(runDir, 'planned', { storyHash: 'new' });
    expect(readPhase(runDir, 'planned')?.inputHashes).toEqual({ storyHash: 'new' });
  });

  it('readPhase returns undefined (not a throw) for a corrupted phase file', () => {
    const filePath = join(runDir, 'phases', 'captured.json');
    writeFileSync(filePath, '{ not valid json');
    expect(readPhase(runDir, 'captured')).toBeUndefined();
  });

  it('readPhase returns undefined for a run directory that was never created', () => {
    const freshRunDir = runDirPath('never-created', root);
    expect(readPhase(freshRunDir, 'narrated')).toBeUndefined();
  });
});

describe('readAllPhases', () => {
  it('returns only the phases actually recorded, in no particular guaranteed key order but complete/correct membership', () => {
    const runDir = runDirPath('run-partial', root);
    ensureRunDir(runDir);
    writePhase(runDir, 'narrated', { storyHash: 'a' });
    writePhase(runDir, 'planned', { storyHash: 'a', narrationHash: 'b' });

    const all = readAllPhases(runDir);
    expect(Object.keys(all).sort()).toEqual(['narrated', 'planned']);
    expect(all.narrated?.inputHashes).toEqual({ storyHash: 'a' });
    expect(all.rehearsed).toBeUndefined();
  });

  it('returns an empty object for a run directory with no phases yet', () => {
    const runDir = runDirPath('run-empty', root);
    ensureRunDir(runDir);
    expect(readAllPhases(runDir)).toEqual({});
  });
});

describe('evaluatePhaseReuse', () => {
  let runDir: string;

  beforeEach(() => {
    runDir = runDirPath('run-reuse', root);
    ensureRunDir(runDir);
  });

  it('reports no-recorded-phase when the phase was never written', () => {
    const result = evaluatePhaseReuse(runDir, 'rehearsed', { planHash: 'p1' }, root);
    expect(result).toEqual({ reusable: false, reason: 'no-recorded-phase' });
  });

  it('reports ok/reusable when input hashes match and there are no outputs to verify', () => {
    writePhase(runDir, 'rehearsed', { planHash: 'p1', storyHash: 's1' });
    const result = evaluatePhaseReuse(runDir, 'rehearsed', { planHash: 'p1', storyHash: 's1' }, root);
    expect(result.reusable).toBe(true);
    expect(result.reason).toBe('ok');
    expect(result.recorded?.phase).toBe('rehearsed');
  });

  it('is insensitive to key order in the input hash map (canonical comparison, not object identity)', () => {
    writePhase(runDir, 'planned', { storyHash: 's1', narrationHash: 'n1' });
    const result = evaluatePhaseReuse(runDir, 'planned', { narrationHash: 'n1', storyHash: 's1' }, root);
    expect(result.reusable).toBe(true);
  });

  it('reports input-hash-mismatch when any input hash differs', () => {
    writePhase(runDir, 'planned', { storyHash: 's1', narrationHash: 'n1' });
    const result = evaluatePhaseReuse(runDir, 'planned', { storyHash: 's1', narrationHash: 'DIFFERENT' }, root);
    expect(result.reason).toBe('input-hash-mismatch');
    expect(result.reusable).toBe(false);
  });

  it('reports input-hash-mismatch when a key is missing entirely from the current map', () => {
    writePhase(runDir, 'planned', { storyHash: 's1', narrationHash: 'n1' });
    const result = evaluatePhaseReuse(runDir, 'planned', { storyHash: 's1' }, root);
    expect(result.reason).toBe('input-hash-mismatch');
  });

  it('reports output-missing when a recorded output file no longer exists on disk', () => {
    const artifactPath = join(root, 'demo-pipeline', '.demo-runs', 'run-reuse', 'capture-manifest.json');
    mkdirSync(join(root, 'demo-pipeline', '.demo-runs', 'run-reuse'), { recursive: true });
    writeFileSync(artifactPath, 'capture-manifest-bytes');
    const sha256 = hashFile(artifactPath);
    writePhase(runDir, 'captured', { planHash: 'p1' }, [
      { path: 'demo-pipeline/.demo-runs/run-reuse/capture-manifest.json', sha256 },
    ]);

    rmSync(artifactPath);
    const result = evaluatePhaseReuse(runDir, 'captured', { planHash: 'p1' }, root);
    expect(result.reason).toBe('output-missing');
    expect(result.reusable).toBe(false);
  });

  it('reports output-hash-mismatch when a recorded output file was modified out from under the phase', () => {
    const artifactPath = join(root, 'demo-pipeline', '.demo-runs', 'run-reuse', 'raw.webm');
    mkdirSync(join(root, 'demo-pipeline', '.demo-runs', 'run-reuse'), { recursive: true });
    writeFileSync(artifactPath, 'original-bytes');
    const originalHash = hashFile(artifactPath);
    writePhase(runDir, 'captured', { planHash: 'p1' }, [
      { path: 'demo-pipeline/.demo-runs/run-reuse/raw.webm', sha256: originalHash },
    ]);

    writeFileSync(artifactPath, 'tampered-bytes');
    const result = evaluatePhaseReuse(runDir, 'captured', { planHash: 'p1' }, root);
    expect(result.reason).toBe('output-hash-mismatch');
    expect(result.reusable).toBe(false);
  });

  it('reports ok/reusable when every recorded output still exists and still hashes correctly', () => {
    const artifactPath = join(root, 'demo-pipeline', '.demo-runs', 'run-reuse', 'raw.webm');
    mkdirSync(join(root, 'demo-pipeline', '.demo-runs', 'run-reuse'), { recursive: true });
    writeFileSync(artifactPath, 'stable-bytes');
    const sha256 = hashFile(artifactPath);
    writePhase(runDir, 'captured', { planHash: 'p1' }, [
      { path: 'demo-pipeline/.demo-runs/run-reuse/raw.webm', sha256 },
    ]);

    const result = evaluatePhaseReuse(runDir, 'captured', { planHash: 'p1' }, root);
    expect(result).toEqual({
      reusable: true,
      reason: 'ok',
      recorded: expect.objectContaining({ phase: 'captured' }),
    });
  });

  it('checks EVERY recorded output, not just the first (a second, later output missing still fails reuse)', () => {
    const dir = join(root, 'demo-pipeline', '.demo-runs', 'run-reuse');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'a.json'), 'a');
    writeFileSync(join(dir, 'b.json'), 'b');
    writePhase(runDir, 'rendered', { captureManifestHash: 'c1' }, [
      { path: 'demo-pipeline/.demo-runs/run-reuse/a.json', sha256: hashFile(join(dir, 'a.json')) },
      { path: 'demo-pipeline/.demo-runs/run-reuse/b.json', sha256: hashFile(join(dir, 'b.json')) },
    ]);
    rmSync(join(dir, 'b.json'));

    const result = evaluatePhaseReuse(runDir, 'rendered', { captureManifestHash: 'c1' }, root);
    expect(result.reason).toBe('output-missing');
  });
});

describe('writeFailure / readFailure', () => {
  it('round-trips a failure record', () => {
    const runDir = runDirPath('run-fail', root);
    ensureRunDir(runDir);
    const record: FailureRecord = {
      schemaVersion: 1,
      phase: 'rehearsed',
      occurredAt: '2026-07-21T09:10:00.000Z',
      code: 'confluence_runner_failed',
      message: 'publish did not reach the "handoff" outcome',
    };
    writeFailure(runDir, record);
    expect(readFailure(runDir)).toEqual(record);
    expect(existsSync(join(runDir, FAILURE_FILENAME))).toBe(true);
  });

  it('a later writeFailure call fully replaces the earlier one (no merge/append)', () => {
    const runDir = runDirPath('run-fail-2', root);
    ensureRunDir(runDir);
    writeFailure(runDir, { schemaVersion: 1, phase: 'unknown', occurredAt: 't1', code: 'a', message: 'first' });
    writeFailure(runDir, { schemaVersion: 1, phase: 'rendered', occurredAt: 't2', code: 'b', message: 'second' });
    expect(readFailure(runDir)?.message).toBe('second');
  });

  it('readFailure returns undefined when no failure was ever recorded', () => {
    const runDir = runDirPath('run-no-fail', root);
    ensureRunDir(runDir);
    expect(readFailure(runDir)).toBeUndefined();
  });

  it('leaves no stray temp file behind after a successful write', () => {
    const runDir = runDirPath('run-fail-temp', root);
    ensureRunDir(runDir);
    writeFailure(runDir, { schemaVersion: 1, phase: 'unknown', occurredAt: 't', code: 'x', message: 'm' });
    const entries = readdirSync(runDir).filter((e) => !e.startsWith('phases'));
    expect(entries).toEqual(['failure.json']);
  });
});

describe('readJobStatus', () => {
  it('reports exists: false for a run directory that was never created', () => {
    const runDir = runDirPath('never-existed', root);
    expect(readJobStatus(runDir)).toEqual({ runDir, exists: false, phases: {} });
  });

  it('reports the latest completed phase in execution order, not write order', () => {
    const runDir = runDirPath('run-status', root);
    ensureRunDir(runDir);
    // Written out of order on purpose — latestCompletedPhase must reflect JOB_PHASES order, not call order.
    writePhase(runDir, 'planned', { storyHash: 's' });
    writePhase(runDir, 'narrated', { storyHash: 's' });
    writePhase(runDir, 'rehearsed', { planHash: 'p' });

    const status = readJobStatus(runDir);
    expect(status.exists).toBe(true);
    expect(status.latestCompletedPhase).toBe('rehearsed');
    expect(Object.keys(status.phases).sort()).toEqual(['narrated', 'planned', 'rehearsed']);
  });

  it('includes a failure record when one is present, without it disturbing latestCompletedPhase', () => {
    const runDir = runDirPath('run-status-fail', root);
    ensureRunDir(runDir);
    writePhase(runDir, 'narrated', { storyHash: 's' });
    writeFailure(runDir, { schemaVersion: 1, phase: 'planned', occurredAt: 't', code: 'plan_validation_failed', message: 'bad plan' });

    const status = readJobStatus(runDir);
    expect(status.latestCompletedPhase).toBe('narrated');
    expect(status.failure?.code).toBe('plan_validation_failed');
  });

  it('reports no latestCompletedPhase for an existing but empty run directory', () => {
    const runDir = runDirPath('run-status-empty', root);
    ensureRunDir(runDir);
    const status = readJobStatus(runDir);
    expect(status.exists).toBe(true);
    expect(status.latestCompletedPhase).toBeUndefined();
    expect(status.failure).toBeUndefined();
  });
});

describe('listRunIds', () => {
  it('returns [] when the runs directory does not exist yet', () => {
    expect(listRunIds(root)).toEqual([]);
  });

  it('lists only directories under runsDir, sorted', () => {
    ensureRunDir(runDirPath('20260721-090000-aaaa', root));
    ensureRunDir(runDirPath('20260101-000000-zzzz', root));
    writeFileSync(join(runsDir(root), 'not-a-run-dir.txt'), 'stray file');

    expect(listRunIds(root)).toEqual(['20260101-000000-zzzz', '20260721-090000-aaaa']);
  });
});
