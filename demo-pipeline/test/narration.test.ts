// Narration provider + caching + ffprobe-probing tests (design doc, "Contracts": "NarrationManifest:
// provider/model/voice, script, WAV path, measured duration, and hash"; "Data flow and timing", step 2:
// "probe their exact durations"). No real Kokoro subprocess runs in this file — the caching tests use a
// fake/stub `VoiceProvider`, and the ffprobe tests use real `ffprobe`/`ffmpeg` (already a pipeline
// dependency; see the design doc's "Dependencies" section) against tiny generated fixtures, never Kokoro
// itself. The real Kokoro subprocess adapter is proven separately by Task 4's runtime gate (see
// .superpowers/sdd/task-4-report.md), not by this unit-test file.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/contracts';
import {
  computeNarrationCacheKey,
  NarrationError,
  parseFfprobeOutput,
  probeWavFile,
  synthesizeNarration,
  type VoiceProvider,
  type VoiceSynthesisOptions,
  type VoiceSynthesisResult,
} from '../src/narration';
import { runProcess } from '../src/process';

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-narration-test-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('computeNarrationCacheKey', () => {
  const base = { provider: 'kokoro-local', model: 'kokoro-82m', voice: 'af_heart', text: 'Hello there.' };

  it('changes when the text changes', () => {
    expect(computeNarrationCacheKey(base)).not.toBe(computeNarrationCacheKey({ ...base, text: 'Something else entirely.' }));
  });

  it('changes when the model changes', () => {
    expect(computeNarrationCacheKey(base)).not.toBe(computeNarrationCacheKey({ ...base, model: 'kokoro-v2' }));
  });

  it('changes when the voice changes', () => {
    expect(computeNarrationCacheKey(base)).not.toBe(computeNarrationCacheKey({ ...base, voice: 'af_bella' }));
  });

  it('changes when the provider changes', () => {
    expect(computeNarrationCacheKey(base)).not.toBe(computeNarrationCacheKey({ ...base, provider: 'some-other-provider' }));
  });

  it('is stable for identical inputs', () => {
    expect(computeNarrationCacheKey(base)).toBe(computeNarrationCacheKey({ ...base }));
  });
});

/** A fake VoiceProvider for exercising `synthesizeNarration`'s caching logic without spawning any real
 *  subprocess. `writeWav` decides what bytes land at the requested output path, so tests can simulate a
 *  "different" clip per call by writing different bytes. */
class FakeVoiceProvider implements VoiceProvider {
  readonly name = 'fake-provider';
  callCount = 0;

  constructor(private readonly writeWav: (outputPath: string) => void) {}

  async synthesize(_text: string, options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult> {
    this.callCount += 1;
    this.writeWav(options.outputPath);
    const bytes = readFileSync(options.outputPath);
    return { wavPath: options.outputPath, durationSeconds: 1.23, sampleRate: 24000, sha256: sha256Hex(bytes) };
  }
}

describe('synthesizeNarration: caching', () => {
  it('calls the provider on a cache miss and persists a sidecar manifest alongside the WAV', async () => {
    const provider = new FakeVoiceProvider((outputPath) => writeFileSync(outputPath, 'fake-wav-bytes-1'));
    const request = { text: 'Cache miss line.', model: 'kokoro-82m', voice: 'af_heart' };

    const manifest = await synthesizeNarration(provider, request, workDir);

    expect(provider.callCount).toBe(1);
    expect(manifest.script).toBe(request.text);
    expect(manifest.provider).toBe('fake-provider');
    expect(manifest.model).toBe(request.model);
    expect(manifest.voice).toBe(request.voice);
    expect(manifest.durationSeconds).toBe(1.23);
    expect(manifest.sampleRate).toBe(24000);
    expect(existsSync(manifest.wavPath)).toBe(true);
  });

  it('reuses an existing WAV whose recorded hash matches the file on disk, without calling the provider again', async () => {
    const provider = new FakeVoiceProvider((outputPath) => writeFileSync(outputPath, 'fake-wav-bytes-2'));
    const request = { text: 'Cache hit line.', model: 'kokoro-82m', voice: 'af_heart' };

    const first = await synthesizeNarration(provider, request, workDir);
    expect(provider.callCount).toBe(1);

    const second = await synthesizeNarration(provider, request, workDir);
    expect(provider.callCount).toBe(1); // not called a second time
    expect(second).toEqual(first);
  });

  it('re-synthesizes when the cached WAV bytes no longer match the sidecar-recorded hash', async () => {
    const provider = new FakeVoiceProvider((outputPath) => writeFileSync(outputPath, 'fake-wav-bytes-3'));
    const request = { text: 'Tampered cache line.', model: 'kokoro-82m', voice: 'af_heart' };

    const first = await synthesizeNarration(provider, request, workDir);
    expect(provider.callCount).toBe(1);

    // Simulate a corrupted/tampered/truncated cache entry: overwrite the WAV bytes without touching the
    // sidecar JSON, so the sidecar's recorded hash no longer matches the file on disk.
    writeFileSync(first.wavPath, 'corrupted-bytes-that-do-not-match-the-recorded-hash');

    await synthesizeNarration(provider, request, workDir);
    expect(provider.callCount).toBe(2); // re-synthesized rather than silently trusting a mismatched cache
  });

  it('treats requests that differ only in voice as separate cache entries', async () => {
    const provider = new FakeVoiceProvider((outputPath) => writeFileSync(outputPath, 'fake-wav-bytes-4'));

    await synthesizeNarration(provider, { text: 'Same text.', model: 'kokoro-82m', voice: 'af_heart' }, workDir);
    await synthesizeNarration(provider, { text: 'Same text.', model: 'kokoro-82m', voice: 'af_bella' }, workDir);

    expect(provider.callCount).toBe(2);
  });
});

describe('parseFfprobeOutput: pure parsing and validation', () => {
  it('parses a valid ffprobe JSON payload', () => {
    const stdout = JSON.stringify({ format: { duration: '5.750000' }, streams: [{ sample_rate: '24000' }] });
    expect(parseFfprobeOutput(stdout)).toEqual({ durationSeconds: 5.75, sampleRate: 24000 });
  });

  it('throws NarrationError on malformed JSON', () => {
    expect(() => parseFfprobeOutput('not json at all')).toThrow(NarrationError);
  });

  it('throws when duration is missing', () => {
    const stdout = JSON.stringify({ format: {}, streams: [{ sample_rate: '24000' }] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });

  it('throws when duration is zero', () => {
    const stdout = JSON.stringify({ format: { duration: '0' }, streams: [{ sample_rate: '24000' }] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });

  it('throws when duration is negative', () => {
    const stdout = JSON.stringify({ format: { duration: '-1.5' }, streams: [{ sample_rate: '24000' }] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });

  it('throws when sample rate is missing', () => {
    const stdout = JSON.stringify({ format: { duration: '5.75' }, streams: [{}] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });

  it('throws when there are no audio streams at all', () => {
    const stdout = JSON.stringify({ format: { duration: '5.75' }, streams: [] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });

  it('throws when sample rate is not an integer', () => {
    const stdout = JSON.stringify({ format: { duration: '5.75' }, streams: [{ sample_rate: '24000.5' }] });
    expect(() => parseFfprobeOutput(stdout)).toThrow(NarrationError);
  });
});

describe('probeWavFile: real ffprobe against real files', () => {
  it('measures the duration and sample rate of a real generated WAV fixture', async () => {
    const fixturePath = join(workDir, 'fixture.wav');
    // A trivial silent WAV, generated on the fly (no Kokoro, no committed binary fixture) — mirrors the
    // approach the task brief suggests for exercising real ffprobe without a real TTS subprocess.
    const gen = await runProcess('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.5', '-loglevel', 'error', fixturePath]);
    expect(gen.exitCode).toBe(0);

    const probe = await probeWavFile(fixturePath);
    expect(probe.sampleRate).toBe(24000);
    expect(probe.durationSeconds).toBeCloseTo(0.5, 1);
  });

  it('rejects with NarrationError for an empty/invalid file', async () => {
    const badPath = join(workDir, 'not-actually-audio.wav');
    writeFileSync(badPath, 'this is not a wav file, just some text bytes');

    await expect(probeWavFile(badPath)).rejects.toThrow(NarrationError);
  });

  it('rejects with NarrationError for a file that does not exist at all', async () => {
    await expect(probeWavFile(join(workDir, 'does-not-exist.wav'))).rejects.toThrow(NarrationError);
  });
});
