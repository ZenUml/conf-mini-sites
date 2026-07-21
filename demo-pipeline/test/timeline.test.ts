// ActionEvent JSONL writer tests (design doc, "Testing and evidence gates": "redact credential values from
// manifests/errors"; "Contracts": "ActionEvent JSONL: monotonic timestamp, scene, operation, lifecycle
// (start, success, failure), and non-secret metadata"). The writer's clock is injected — never `Date.now()`
// called directly inside `timeline.ts` — so these tests use fully deterministic fake clocks and never depend
// on real time.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ActionEventTimelineWriter,
  REDACTION_MARKER,
  resolveSecretEnvVarValues,
  type ActionEvent,
} from '../src/timeline';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-timeline-test-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function readEvents(path: string): ActionEvent[] {
  const raw = readFileSync(path, 'utf-8');
  return raw
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ActionEvent);
}

describe('ActionEventTimelineWriter: injected monotonic clock', () => {
  it('stamps every event with whatever the injected clock returns, in call order', () => {
    const outputPath = join(workDir, 'events.jsonl');
    let tick = 0;
    const clock = () => (tick += 100);
    const writer = new ActionEventTimelineWriter(outputPath, clock);

    writer.append('start-in-confluence', 'openMacro', 'start', {});
    writer.append('start-in-confluence', 'openMacro', 'success', {});
    writer.close();

    const events = readEvents(outputPath);
    expect(events.map((e) => e.timestampMs)).toEqual([100, 200]);
  });

  it('two writers with two different injected clocks produce different, predictable timestamps', () => {
    const pathA = join(workDir, 'a.jsonl');
    const pathB = join(workDir, 'b.jsonl');

    let tickA = 1_000;
    const clockA = () => (tickA += 10);
    const writerA = new ActionEventTimelineWriter(pathA, clockA);
    writerA.append('scene', 'op', 'start', {});
    writerA.append('scene', 'op', 'success', {});
    writerA.close();

    let tickB = 5;
    const clockB = () => (tickB *= 2);
    const writerB = new ActionEventTimelineWriter(pathB, clockB);
    writerB.append('scene', 'op', 'start', {});
    writerB.append('scene', 'op', 'success', {});
    writerB.close();

    expect(readEvents(pathA).map((e) => e.timestampMs)).toEqual([1_010, 1_020]);
    expect(readEvents(pathB).map((e) => e.timestampMs)).toEqual([10, 20]);
  });

  it('records scene id, operation, and lifecycle exactly as passed', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.append('upload-and-publish', 'publishAndAwait', 'failure', { reason: 'timeout' });
    writer.close();

    const [event] = readEvents(outputPath);
    expect(event.sceneId).toBe('upload-and-publish');
    expect(event.operation).toBe('publishAndAwait');
    expect(event.lifecycle).toBe('failure');
    expect(event.schemaVersion).toBe(1);
  });
});

describe('ActionEventTimelineWriter: secret redaction', () => {
  it('replaces a metadata value that matches a configured secret with the redaction marker', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1, ['super-secret-token']);
    writer.append('scene', 'op', 'start', { token: 'super-secret-token' });
    writer.close();

    const raw = readFileSync(outputPath, 'utf-8');
    expect(raw).not.toContain('super-secret-token');

    const [event] = readEvents(outputPath);
    expect(event.metadata.token).toBe(REDACTION_MARKER);
  });

  it('redacts a secret embedded inside a longer metadata string', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1, ['abc123']);
    writer.append('scene', 'op', 'failure', { error: 'auth failed: Bearer abc123 rejected' });
    writer.close();

    const raw = readFileSync(outputPath, 'utf-8');
    expect(raw).not.toContain('abc123');
    const [event] = readEvents(outputPath);
    expect(event.metadata.error).toBe(`auth failed: Bearer ${REDACTION_MARKER} rejected`);
  });

  it('redacts secrets nested inside objects and arrays in metadata', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1, ['nested-secret']);
    writer.append('scene', 'op', 'start', {
      request: { headers: { authorization: 'nested-secret' } },
      list: ['ok', 'nested-secret', 'also-ok'],
    });
    writer.close();

    const raw = readFileSync(outputPath, 'utf-8');
    expect(raw).not.toContain('nested-secret');
    const [event] = readEvents(outputPath);
    const metadata = event.metadata as { request: { headers: { authorization: string } }; list: string[] };
    expect(metadata.request.headers.authorization).toBe(REDACTION_MARKER);
    expect(metadata.list).toEqual(['ok', REDACTION_MARKER, 'also-ok']);
  });

  it('leaves non-secret metadata untouched', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1, ['a-real-secret']);
    writer.append('scene', 'op', 'success', { durationMs: 42, ok: true, note: 'nothing sensitive here' });
    writer.close();

    const [event] = readEvents(outputPath);
    expect(event.metadata).toEqual({ durationMs: 42, ok: true, note: 'nothing sensitive here' });
  });
});

describe('ActionEventTimelineWriter: append-only, atomic close', () => {
  it('produces no output file until close() is called', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.append('scene', 'op', 'start', {});
    expect(existsSync(outputPath)).toBe(false);
    writer.close();
    expect(existsSync(outputPath)).toBe(true);
  });

  it('leaves no stray temp file behind after a successful close()', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.append('scene', 'op', 'start', {});
    writer.close();

    const entries = readdirSync(workDir);
    expect(entries).toEqual(['events.jsonl']);
  });

  it('throws if append() is called after close()', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.close();
    expect(() => writer.append('scene', 'op', 'start', {})).toThrow();
  });

  it('writes each event on its own line as valid, independently-parseable JSON (JSONL)', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.append('scene-a', 'openMacro', 'start', {});
    writer.append('scene-a', 'openMacro', 'success', {});
    writer.append('scene-b', 'gotoPreview', 'start', {});
    writer.close();

    const raw = readFileSync(outputPath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('calling close() twice does not throw and does not corrupt the file', () => {
    const outputPath = join(workDir, 'events.jsonl');
    const writer = new ActionEventTimelineWriter(outputPath, () => 1);
    writer.append('scene', 'op', 'start', {});
    writer.close();
    expect(() => writer.close()).not.toThrow();
    expect(readEvents(outputPath)).toHaveLength(1);
  });
});

describe('resolveSecretEnvVarValues', () => {
  it('resolves configured env var names to their current values, skipping unset ones', () => {
    const originalToken = process.env.DEMO_PIPELINE_TEST_SECRET;
    process.env.DEMO_PIPELINE_TEST_SECRET = 'env-secret-value';
    try {
      const values = resolveSecretEnvVarValues(['DEMO_PIPELINE_TEST_SECRET', 'DEMO_PIPELINE_TEST_UNSET_VAR']);
      expect(values).toEqual(['env-secret-value']);
    } finally {
      if (originalToken === undefined) delete process.env.DEMO_PIPELINE_TEST_SECRET;
      else process.env.DEMO_PIPELINE_TEST_SECRET = originalToken;
    }
  });
});
