// EDL/FFmpeg argv/render/rerender tests (design doc, "Testing and evidence gates": "build FFmpeg argument
// arrays without shell interpolation; hash and validate rerender inputs"; Task 5 brief's five red tests).
//
// Pure tests (EDL building, argv compilation, path normalization, ffprobe/ffmpeg-banner parsing) run without
// any subprocess. A few tests spawn real `ffmpeg`/`ffprobe` — mirroring `narration.test.ts`'s own precedent
// (real ffprobe against generated fixtures, no mocks) — including one full real end-to-end render/rerender
// pass with a synthesized stand-in "captured" video and synthesized narration WAVs (no browser, no Kokoro; see
// the module doc comment in `render.ts` section 3 for why these tests deliberately resolve `ffmpeg-full`
// rather than the bare `ffmpeg` already on PATH).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildCaptionCues } from '../src/captions';
import { sha256Hex } from '../src/contracts';
import { compileDemoPlan, SCENE_LEAD_IN_MS, type DemoPlan, type NarrationDurationsMs } from '../src/plan';
import type { NarrationManifest } from '../src/narration';
import { runProcess } from '../src/process';
import { loadStory, repoRoot } from '../src/story';
import {
  buildEditDecisionList,
  buildRenderManifest,
  checkRerenderInputs,
  compileFfmpegArgs,
  defaultFfmpegPath,
  detectFfmpegBuildInfo,
  EDL_FILENAME,
  parseFfmpegVersionBanner,
  parseMediaProbeOutput,
  RENDER_MANIFEST_FILENAME,
  RENDER_OUTPUT_FILENAME,
  RenderError,
  renderVideo,
  rerender,
  type EditDecisionList,
  type RenderManifest,
} from '../src/render';

const STORY_PATH = `${repoRoot()}/demo-pipeline/stories/mini-site-launch.story.json`;

const FIXED_DURATIONS_MS: NarrationDurationsMs = {
  'start-in-confluence': 1_500,
  'upload-and-publish': 2_000,
  'prove-the-outcome': 1_200,
};

function realPlan(): DemoPlan {
  const { story } = loadStory(STORY_PATH);
  return compileDemoPlan(story, FIXED_DURATIONS_MS);
}

/** Fake `NarrationManifest`s for a plan's scenes, matched by script (as `buildEditDecisionList` requires) —
 *  no real WAV bytes needed for the pure EDL/argv tests in this file, since neither function touches disk. */
function fakeNarrationManifests(plan: DemoPlan, wavDir: string): NarrationManifest[] {
  return plan.scenes.map((scene, i) => ({
    schemaVersion: 1 as const,
    provider: 'fixture-provider',
    model: 'fixture-model',
    voice: 'fixture-voice',
    script: scene.narration.script,
    wavPath: join(wavDir, `${scene.id}.wav`),
    durationSeconds: scene.narration.durationMs / 1000,
    sampleRate: 24000,
    sha256: `fixture-hash-${i}`.padEnd(64, '0'),
  }));
}

function fixtureEdl(overrides: Partial<EditDecisionList> = {}): EditDecisionList {
  return {
    schemaVersion: 1,
    sourceVideoPath: '/repo/.demo-runs/run-1/capture.webm',
    totalDurationMs: 6_000,
    narration: [
      { sceneId: 'scene-a', wavPath: '/repo/demo-pipeline/.demo-cache/narration/aaa.wav', startMs: 500, durationSeconds: 1.2 },
      { sceneId: 'scene-b', wavPath: '/repo/demo-pipeline/.demo-cache/narration/bbb.wav', startMs: 2_500, durationSeconds: 1.0 },
    ],
    captions: [],
    outputProfile: { width: 1920, height: 1080, fps: 30, videoCodec: 'libx264', audioCodec: 'aac', audioSampleRate: 44100 },
    ...overrides,
  };
}

function argValueAfter(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) throw new Error(`flag ${flag} not found in argv: ${JSON.stringify(args)}`);
  return args[index + 1];
}

// -------------------------------------------------------------------------------------------------------
// buildEditDecisionList — pure.
// -------------------------------------------------------------------------------------------------------

describe('buildEditDecisionList', () => {
  it('places each scene\'s narration at scene.startMs + SCENE_LEAD_IN_MS, in scene order', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration');
    const edl = buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm');

    expect(edl.narration).toHaveLength(3);
    edl.narration.forEach((placement, i) => {
      expect(placement.sceneId).toBe(plan.scenes[i].id);
      expect(placement.startMs).toBe(plan.scenes[i].startMs + SCENE_LEAD_IN_MS);
    });
  });

  it('carries the source video path, total duration, captions, and a fixed 1920x1080/libx264/aac output profile through unchanged', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration');
    const edl = buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm');

    expect(edl.sourceVideoPath).toBe('/fake/capture.webm');
    expect(edl.totalDurationMs).toBe(plan.totalDurationMs);
    expect(edl.captions).toBe(cues);
    expect(edl.outputProfile).toEqual({ width: 1920, height: 1080, fps: 30, videoCodec: 'libx264', audioCodec: 'aac', audioSampleRate: 44100 });
  });

  it('is deterministic across two calls with the same inputs', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration');
    const first = buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm');
    const second = buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('throws RenderError when a scene has no matching narration manifest', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration').filter((m) => m.script !== plan.scenes[1].narration.script);
    expect(() => buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm')).toThrow(RenderError);
  });

  it('throws RenderError when two manifests share the same script (unresolvable ambiguity for script-based matching)', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration');
    const duplicated = [...manifests, { ...manifests[0] }];
    expect(() => buildEditDecisionList(plan, cues, duplicated, '/fake/capture.webm')).toThrow(/duplicate narration manifest/);
  });

  it('throws RenderError when the manifest count does not match the scene count', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration').slice(0, 2);
    expect(() => buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm')).toThrow(/does not match plan scene count/);
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 1: EDL produces deterministic FFmpeg argument arrays with no shell interpolation.
// -------------------------------------------------------------------------------------------------------

describe('compileFfmpegArgs: deterministic, no shell interpolation', () => {
  const options = { baseDir: '/repo', srtPath: '/repo/.demo-runs/run-1/captions.srt', outputPath: '/repo/.demo-runs/run-1/final.mp4' };

  it('produces a byte-identical argv array across two calls with the same inputs', () => {
    const edl = fixtureEdl();
    const first = compileFfmpegArgs(edl, options);
    const second = compileFfmpegArgs(edl, options);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('returns a flat array of plain strings — never a single joined shell-command string', () => {
    const args = compileFfmpegArgs(fixtureEdl(), options);
    expect(Array.isArray(args)).toBe(true);
    for (const arg of args) expect(typeof arg).toBe('string');
    // The whole argv joined would obviously contain "-y -i ..." — the point is that's never how it's actually
    // passed: process.ts's runProcess takes this as `args: readonly string[]`, spawned with `shell: false`,
    // so no element is ever re-parsed as a shell command line (see process.test.ts's own proof of that).
  });

  it('preserves a shell-metacharacter-laden source path as one literal, unsplit argv element', () => {
    // If this path were ever concatenated into a shell string, ";", "&&", "$(...)" would each be interpreted
    // rather than treated as literal path characters — mirrors process.test.ts's "dangerous arg" proof, one
    // level up at the EDL/argv-compiler boundary.
    const dangerousPath = "/repo/.demo-runs/run-1/cap;ture && echo pwned $(whoami).webm";
    const edl = fixtureEdl({ sourceVideoPath: dangerousPath });
    const args = compileFfmpegArgs(edl, options);

    const inputIndex = args.indexOf('-i');
    expect(args[inputIndex + 1]).toBe('.demo-runs/run-1/cap;ture && echo pwned $(whoami).webm');
    // The dangerous string appears in exactly this one element — not split across several array entries.
    expect(args.filter((a) => a.includes(';ture'))).toHaveLength(1);
  });

  it('never emits an empty or shell-string-joined argument', () => {
    const args = compileFfmpegArgs(fixtureEdl(), options);
    for (const arg of args) expect(arg.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 2: three narration clips are delayed/mixed at scene starts.
// -------------------------------------------------------------------------------------------------------

describe('compileFfmpegArgs: delays and mixes narration at each scene\'s computed start', () => {
  it('emits one input + one adelay/aformat audio chain per fixture narration placement, using its exact startMs', () => {
    const edl = fixtureEdl();
    const options = { baseDir: '/repo', srtPath: '/repo/.demo-runs/run-1/captions.srt', outputPath: '/repo/.demo-runs/run-1/final.mp4' };
    const args = compileFfmpegArgs(edl, options);
    const filterComplex = argValueAfter(args, '-filter_complex');

    expect(filterComplex).toContain('adelay=500:all=1');
    expect(filterComplex).toContain('adelay=2500:all=1');
    // Two narration inputs (index 2 and 3, after video=0 and silence bed=1) plus the silence bed => amix of 3.
    expect(filterComplex).toContain('amix=inputs=3:normalize=0:duration=first');
    // Every narration WAV path appears as its own -i input.
    expect(args).toContain('demo-pipeline/.demo-cache/narration/aaa.wav');
    expect(args).toContain('demo-pipeline/.demo-cache/narration/bbb.wav');
  });

  it('delays all three of the real story\'s scenes at their exact plan.scene.startMs + SCENE_LEAD_IN_MS, with three distinct values', () => {
    const plan = realPlan();
    const cues = buildCaptionCues(plan);
    const manifests = fakeNarrationManifests(plan, '/fake/narration');
    const edl = buildEditDecisionList(plan, cues, manifests, '/fake/capture.webm');
    const args = compileFfmpegArgs(edl, {
      baseDir: '/fake',
      srtPath: '/fake/run/captions.srt',
      outputPath: '/fake/run/final.mp4',
    });
    const filterComplex = argValueAfter(args, '-filter_complex');

    expect(plan.scenes).toHaveLength(3); // sanity: this is genuinely the 3-scene story the brief references.
    const expectedDelays = plan.scenes.map((scene) => scene.startMs + SCENE_LEAD_IN_MS);
    expect(new Set(expectedDelays).size).toBe(3); // three distinct delays — guards against a swapped/hardcoded value.
    for (const delayMs of expectedDelays) {
      expect(filterComplex).toContain(`adelay=${delayMs}:all=1`);
    }
    expect(filterComplex).toContain('amix=inputs=4:normalize=0:duration=first'); // 3 narration + 1 silence bed.
  });

  it('is silence-safe with zero narration clips: the silence bed alone feeds a valid single-input amix', () => {
    const edl = fixtureEdl({ narration: [] });
    const args = compileFfmpegArgs(edl, { baseDir: '/repo', srtPath: '/repo/captions.srt', outputPath: '/repo/final.mp4' });
    const filterComplex = argValueAfter(args, '-filter_complex');
    expect(filterComplex).toContain('amix=inputs=1:normalize=0:duration=first');
    expect(filterComplex).not.toContain('adelay');
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 3: captions are burned from the run-local SRT.
// -------------------------------------------------------------------------------------------------------

describe('compileFfmpegArgs: burns captions from the run-local SRT via the subtitles filter', () => {
  it('references the compiled, baseDir-relative SRT path inside a subtitles filter, with a fixed force_style', () => {
    const edl = fixtureEdl();
    const args = compileFfmpegArgs(edl, { baseDir: '/repo', srtPath: '/repo/.demo-runs/run-1/captions.srt', outputPath: '/repo/.demo-runs/run-1/final.mp4' });
    const filterComplex = argValueAfter(args, '-filter_complex');

    expect(filterComplex).toContain("subtitles=filename='.demo-runs/run-1/captions.srt'");
    expect(filterComplex).toContain('force_style=');
    expect(filterComplex).toContain('[outv]');
    expect(args).toEqual(expect.arrayContaining(['-map', '[outv]', '-map', '[outa]']));
  });

  it('escapes a colon in the SRT path so the filtergraph parser cannot mistake it for an option separator', () => {
    const edl = fixtureEdl();
    const args = compileFfmpegArgs(edl, {
      baseDir: '/repo',
      srtPath: "/repo/.demo-runs/run-1/wei:rd.srt",
      outputPath: '/repo/.demo-runs/run-1/final.mp4',
    });
    const filterComplex = argValueAfter(args, '-filter_complex');
    expect(filterComplex).toContain("subtitles=filename='.demo-runs/run-1/wei\\:rd.srt'");
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 5 (first half): render manifest normalizes absolute run paths. Pure — buildRenderManifest never
// touches fs or a subprocess.
// -------------------------------------------------------------------------------------------------------

describe('buildRenderManifest: normalizes absolute paths', () => {
  it('never records a raw absolute path for source video, narration, or output — even for a narration file outside baseDir', () => {
    const baseDir = '/Users/exampleuser/workspaces/conf-mini-sites';
    const sourceVideoAbs = `${baseDir}/.demo-runs/run-1/capture.webm`;
    const narrationInsideAbs = `${baseDir}/demo-pipeline/.demo-cache/narration/aaa.wav`;
    const narrationOutsideAbs = '/private/var/folders/zz/some-tmp/narration-outside-repo.wav'; // NOT under baseDir at all.
    const outputAbs = `${baseDir}/.demo-runs/run-1/final.mp4`;

    const manifest = buildRenderManifest({
      baseDir,
      ffmpeg: { version: '8.1.2', configuration: ['--enable-gpl', '--enable-libx264', '--enable-libass'], gplLibx264: true },
      sourceVideo: { absolutePath: sourceVideoAbs, sha256: 'a'.repeat(64) },
      narration: [
        { sceneId: 'scene-a', absolutePath: narrationInsideAbs, sha256: 'b'.repeat(64) },
        { sceneId: 'scene-b', absolutePath: narrationOutsideAbs, sha256: 'c'.repeat(64) },
      ],
      output: { absolutePath: outputAbs, sha256: 'd'.repeat(64), probe: { width: 1920, height: 1080, durationSeconds: 6, streams: [] } },
      command: { executable: 'ffmpeg', args: ['-y', '-i', '.demo-runs/run-1/capture.webm'] },
      warnings: [],
    });

    expect(manifest.inputs.sourceVideo.path).toBe('.demo-runs/run-1/capture.webm');
    expect(manifest.inputs.sourceVideo.path.startsWith('/')).toBe(false);

    expect(manifest.inputs.narration[0].path).toBe('demo-pipeline/.demo-cache/narration/aaa.wav');
    expect(manifest.inputs.narration[1].path.startsWith('/')).toBe(false);

    expect(manifest.output.path).toBe('.demo-runs/run-1/final.mp4');

    // The whole serialized manifest never leaks the machine-specific baseDir (e.g. a home directory) anywhere.
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain(baseDir);
    expect(serialized).not.toContain('/Users/');
  });

  it('records command args verbatim (already baseDir-relative by construction — see compileFfmpegArgs)', () => {
    const manifest = buildRenderManifest({
      baseDir: '/repo',
      ffmpeg: { version: '8.1.2', configuration: [], gplLibx264: true },
      sourceVideo: { absolutePath: '/repo/capture.webm', sha256: 'a'.repeat(64) },
      narration: [],
      output: { absolutePath: '/repo/final.mp4', sha256: 'b'.repeat(64), probe: { width: 1920, height: 1080, durationSeconds: 1, streams: [] } },
      command: { executable: 'ffmpeg', args: ['-y', '-i', 'capture.webm', 'final.mp4'] },
      warnings: ['example warning'],
    });
    expect(manifest.command).toEqual({ executable: 'ffmpeg', args: ['-y', '-i', 'capture.webm', 'final.mp4'] });
    expect(manifest.warnings).toEqual(['example warning']);
    expect(manifest.schemaVersion).toBe(1);
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 5 (second half): render manifest records real FFmpeg configure flags.
// -------------------------------------------------------------------------------------------------------

describe('parseFfmpegVersionBanner', () => {
  it('parses version and configuration flags from a hand-crafted banner', () => {
    const banner = [
      'ffmpeg version 8.1.2 Copyright (c) 2000-2026 the FFmpeg developers',
      'built with Apple clang version 21.0.0',
      'configuration: --prefix=/opt/homebrew --enable-gpl --enable-libx264 --enable-libass',
      'libavutil      60. 26.102 / 60. 26.102',
    ].join('\n');
    const info = parseFfmpegVersionBanner(banner);
    expect(info.version).toBe('8.1.2');
    expect(info.configuration).toEqual(['--prefix=/opt/homebrew', '--enable-gpl', '--enable-libx264', '--enable-libass']);
    expect(info.gplLibx264).toBe(true);
  });

  it('computes gplLibx264=false when --enable-libx264 is absent even if --enable-gpl is present', () => {
    const banner = 'ffmpeg version 1.0\nconfiguration: --enable-gpl --enable-libvpx';
    expect(parseFfmpegVersionBanner(banner).gplLibx264).toBe(false);
  });

  it('computes gplLibx264=false when --enable-gpl is absent even if --enable-libx264 is present', () => {
    const banner = 'ffmpeg version 1.0\nconfiguration: --enable-libx264';
    expect(parseFfmpegVersionBanner(banner).gplLibx264).toBe(false);
  });

  it('throws RenderError when no "ffmpeg version" line is present', () => {
    expect(() => parseFfmpegVersionBanner('not an ffmpeg banner at all')).toThrow(RenderError);
  });

  it('tolerates a missing configuration line by recording an empty flags array', () => {
    const info = parseFfmpegVersionBanner('ffmpeg version 1.0\nsome other line');
    expect(info.configuration).toEqual([]);
    expect(info.gplLibx264).toBe(false);
  });
});

describe('detectFfmpegBuildInfo: real local ffmpeg build fingerprint', () => {
  it('records the real resolved ffmpeg build\'s actual configure flags: GPL + libx264 (+ libass, load-bearing for caption burn-in)', async () => {
    const info = await detectFfmpegBuildInfo();
    expect(info.version).toMatch(/^\d+\.\d+/);
    expect(info.configuration.length).toBeGreaterThan(0);
    expect(info.configuration).toContain('--enable-gpl');
    expect(info.configuration.some((flag) => flag.startsWith('--enable-libx264'))).toBe(true);
    expect(info.gplLibx264).toBe(true);
    // Not itself part of RenderManifest's schema (only gpl/libx264 is, per the design doc), but every other
    // test in this file that renders real captions depends on this being true for the resolved binary.
    expect(info.configuration).toContain('--enable-libass');
  }, 15_000);
});

// -------------------------------------------------------------------------------------------------------
// parseMediaProbeOutput — pure ffprobe-JSON parsing (mirrors narration.ts's parseFfprobeOutput coverage).
// -------------------------------------------------------------------------------------------------------

describe('parseMediaProbeOutput', () => {
  it('parses width/height/duration/stream types from a valid ffprobe payload', () => {
    const stdout = JSON.stringify({
      format: { duration: '7.700000' },
      streams: [
        { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080 },
        { codec_type: 'audio', codec_name: 'aac' },
      ],
    });
    const probe = parseMediaProbeOutput(stdout);
    expect(probe).toEqual({
      width: 1920,
      height: 1080,
      durationSeconds: 7.7,
      streams: [
        { codecType: 'video', codecName: 'h264' },
        { codecType: 'audio', codecName: 'aac' },
      ],
    });
  });

  it('throws RenderError on malformed JSON', () => {
    expect(() => parseMediaProbeOutput('not json')).toThrow(RenderError);
  });

  it('throws RenderError when duration is missing or non-positive', () => {
    expect(() => parseMediaProbeOutput(JSON.stringify({ format: {}, streams: [] }))).toThrow(RenderError);
    expect(() => parseMediaProbeOutput(JSON.stringify({ format: { duration: '0' }, streams: [] }))).toThrow(RenderError);
  });

  it('leaves width/height undefined when there is no video stream, without throwing', () => {
    const probe = parseMediaProbeOutput(JSON.stringify({ format: { duration: '1.0' }, streams: [{ codec_type: 'audio', codec_name: 'aac' }] }));
    expect(probe.width).toBeUndefined();
    expect(probe.height).toBeUndefined();
  });
});

// -------------------------------------------------------------------------------------------------------
// Red test 4: rerender rejects a missing or hash-mismatched capture/audio input. Real fixture files on disk,
// tampered/deleted — no network, no real capture.
// -------------------------------------------------------------------------------------------------------

describe('checkRerenderInputs + rerender: rejects missing or hash-mismatched inputs (real fixture files)', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-render-rerender-test-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function writeFixture(relPath: string, contents: string): string {
    const abs = join(workDir, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, contents);
    return abs;
  }

  it('passes verification when every recorded input still matches its recorded hash', () => {
    const videoAbs = writeFixture('capture.webm', 'video-bytes');
    const narrationAbs = writeFixture('narration/scene-a.wav', 'wav-bytes');
    const manifest: Pick<RenderManifest, 'inputs'> = {
      inputs: {
        sourceVideo: { path: 'capture.webm', sha256: sha256Hex(readFileSync(videoAbs)) },
        narration: [{ sceneId: 'scene-a', path: 'narration/scene-a.wav', sha256: sha256Hex(readFileSync(narrationAbs)) }],
      },
    };
    expect(checkRerenderInputs(manifest, workDir)).toEqual([]);
  });

  it('reports "missing" for a recorded input file that no longer exists on disk', () => {
    const narrationAbs = writeFixture('narration/scene-a.wav', 'wav-bytes');
    const manifest: Pick<RenderManifest, 'inputs'> = {
      inputs: {
        sourceVideo: { path: 'capture.webm', sha256: 'deadbeef'.repeat(8) }, // never written to disk.
        narration: [{ sceneId: 'scene-a', path: 'narration/scene-a.wav', sha256: sha256Hex(readFileSync(narrationAbs)) }],
      },
    };
    expect(checkRerenderInputs(manifest, workDir)).toEqual([{ path: 'capture.webm', reason: 'missing' }]);
  });

  it('reports "hash-mismatch" for a recorded input file whose bytes were tampered with', () => {
    const videoAbs = writeFixture('capture.webm', 'original-video-bytes');
    const originalHash = sha256Hex(readFileSync(videoAbs));
    writeFileSync(videoAbs, 'TAMPERED-bytes-that-do-not-match-the-recorded-hash');

    const manifest: Pick<RenderManifest, 'inputs'> = { inputs: { sourceVideo: { path: 'capture.webm', sha256: originalHash }, narration: [] } };
    expect(checkRerenderInputs(manifest, workDir)).toEqual([{ path: 'capture.webm', reason: 'hash-mismatch' }]);
  });

  it('reports every failing input, not just the first', () => {
    const narrationAbs = writeFixture('narration/scene-a.wav', 'good-bytes');
    const goodHash = sha256Hex(readFileSync(narrationAbs));
    writeFileSync(narrationAbs, 'tampered-bytes');

    const manifest: Pick<RenderManifest, 'inputs'> = {
      inputs: {
        sourceVideo: { path: 'capture.webm', sha256: 'x'.repeat(64) }, // missing.
        narration: [{ sceneId: 'scene-a', path: 'narration/scene-a.wav', sha256: goodHash }], // hash-mismatch.
      },
    };
    const failures = checkRerenderInputs(manifest, workDir);
    expect(failures).toHaveLength(2);
    expect(failures).toContainEqual({ path: 'capture.webm', reason: 'missing' });
    expect(failures).toContainEqual({ path: 'narration/scene-a.wav', reason: 'hash-mismatch' });
  });

  it('rerender() throws RenderError naming the hash-mismatched input, without ever invoking ffmpeg', async () => {
    const runDir = join(workDir, 'run-1');
    mkdirSync(runDir, { recursive: true });
    writeFixture('capture.webm', 'video-bytes');

    const fakeEdl: EditDecisionList = fixtureEdl({ sourceVideoPath: join(workDir, 'capture.webm'), narration: [] });
    const fakeManifest: RenderManifest = {
      schemaVersion: 1,
      ffmpeg: { version: 'x', configuration: [], gplLibx264: false },
      inputs: { sourceVideo: { path: 'capture.webm', sha256: 'wrong-hash-'.padEnd(64, '0') }, narration: [] },
      output: { path: 'final.mp4', sha256: 'y'.repeat(64), probe: { width: 1920, height: 1080, durationSeconds: 1, streams: [] } },
      command: { executable: 'ffmpeg', args: [] },
      warnings: [],
    };
    writeFileSync(join(runDir, EDL_FILENAME), JSON.stringify(fakeEdl));
    writeFileSync(join(runDir, RENDER_MANIFEST_FILENAME), JSON.stringify(fakeManifest));

    await expect(rerender(runDir, workDir)).rejects.toThrow(RenderError);
    await expect(rerender(runDir, workDir)).rejects.toThrow(/hash-mismatch/);
    // Proof ffmpeg was never invoked: renderVideo's first act on success is writing the output file, and it's
    // never reached because checkRerenderInputs throws before renderVideo is called at all.
    expect(existsSync(join(runDir, RENDER_OUTPUT_FILENAME))).toBe(false);
  });

  it('rerender() throws RenderError when edl.json is missing from the run directory entirely', async () => {
    const runDir = join(workDir, 'run-2');
    mkdirSync(runDir, { recursive: true });
    await expect(rerender(runDir, workDir)).rejects.toThrow(/missing edl\.json/);
  });

  it('rerender() throws RenderError when render-manifest.json is missing from the run directory entirely', async () => {
    const runDir = join(workDir, 'run-3');
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, EDL_FILENAME), JSON.stringify(fixtureEdl()));
    await expect(rerender(runDir, workDir)).rejects.toThrow(/missing render-manifest\.json/);
  });
});

// -------------------------------------------------------------------------------------------------------
// Real end-to-end proof (Task 5's own acceptance bar, not just unit tests — design doc: "Passing unit tests
// without a real captured artifact is not completion"). No browser, no Kokoro: a synthesized stand-in
// "captured" video (ffmpeg lavfi testsrc) + synthesized narration WAVs (ffmpeg lavfi sine tones at each
// scene's exact narration duration) stand in for Task 6's real Confluence capture and Task 4's real Kokoro
// output — chosen over real Kokoro specifically to keep this test independent of the ~1GB local venv and to
// make the audio's presence/timing independently verifiable via silencedetect (a pure tone has an
// unambiguous, easy-to-threshold energy signature; real speech would work too but is harder to assert about
// precisely).
// -------------------------------------------------------------------------------------------------------

describe('renderVideo + rerender: real end-to-end render (no mocks)', () => {
  let workDir: string;
  let runDir: string;
  let plan: DemoPlan;
  let totalSeconds: number;
  let captionStartsMs: number[];
  let manifest: RenderManifest;

  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-render-e2e-test-'));
    const ffmpegPath = defaultFfmpegPath();

    plan = realPlan();
    totalSeconds = plan.totalDurationMs / 1000;
    const captionCues = buildCaptionCues(plan);
    captionStartsMs = captionCues.map((c) => c.startMs);

    // Synthesize one narration WAV per scene: a distinct-frequency sine tone at that scene's exact narration
    // duration, so silencedetect against the final mix can unambiguously locate each clip's start.
    const narrationDir = join(workDir, 'narration');
    mkdirSync(narrationDir, { recursive: true });
    const frequencies = [440, 660, 880];
    const narrationManifests: NarrationManifest[] = [];
    for (const [i, scene] of plan.scenes.entries()) {
      const wavPath = join(narrationDir, `${scene.id}.wav`);
      const durationSeconds = scene.narration.durationMs / 1000;
      const gen = await runProcess(ffmpegPath, [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `sine=frequency=${frequencies[i]}:duration=${durationSeconds}`,
        '-ar',
        '24000',
        '-ac',
        '1',
        '-loglevel',
        'error',
        wavPath,
      ]);
      if (gen.exitCode !== 0) throw new Error(`fixture narration synthesis failed: ${gen.stderr}`);
      narrationManifests.push({
        schemaVersion: 1,
        provider: 'fixture-sine-tone',
        model: 'sine-tone',
        voice: 'n/a',
        script: scene.narration.script,
        wavPath,
        durationSeconds,
        sampleRate: 24000,
        sha256: sha256Hex(readFileSync(wavPath)),
      });
    }

    // Synthesize a stand-in "captured" video: a test pattern for the plan's exact total duration, at a modest
    // resolution/framerate (the render pipeline itself is responsible for scaling/padding up to 1920x1080).
    const sourceVideoPath = join(workDir, 'capture.webm');
    const genVideo = await runProcess(ffmpegPath, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=15',
      '-t',
      totalSeconds.toFixed(3),
      '-c:v',
      'libvpx',
      '-loglevel',
      'error',
      sourceVideoPath,
    ]);
    if (genVideo.exitCode !== 0) throw new Error(`fixture capture synthesis failed: ${genVideo.stderr}`);

    const edl = buildEditDecisionList(plan, captionCues, narrationManifests, sourceVideoPath);
    runDir = join(workDir, 'run-1');
    manifest = await renderVideo(edl, { runDir, baseDir: workDir });
  }, 60_000);

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('produces a real playable 1920x1080 H.264/AAC MP4 matching the plan\'s total duration', () => {
    expect(manifest.output.probe.width).toBe(1920);
    expect(manifest.output.probe.height).toBe(1080);
    expect(Math.abs(manifest.output.probe.durationSeconds - totalSeconds)).toBeLessThan(0.5);

    const codecTypes = manifest.output.probe.streams.map((s) => s.codecType).sort();
    expect(codecTypes).toEqual(['audio', 'video']);
    expect(manifest.output.probe.streams.find((s) => s.codecType === 'video')?.codecName).toBe('h264');
    expect(manifest.output.probe.streams.find((s) => s.codecType === 'audio')?.codecName).toBe('aac');

    expect(existsSync(join(runDir, RENDER_OUTPUT_FILENAME))).toBe(true);
  });

  it('records a GPL/libx264 ffmpeg build in the manifest and reports no warnings for a clean render', () => {
    expect(manifest.ffmpeg.gplLibx264).toBe(true);
    expect(manifest.ffmpeg.configuration).toContain('--enable-gpl');
    expect(manifest.warnings).toEqual([]);
  });

  it('never leaks the local absolute workDir/baseDir path anywhere in the manifest', () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain(workDir);
    for (const arg of manifest.command.args) {
      if (arg.includes('.wav') || arg.includes('.webm') || arg.includes('.srt') || arg.includes('.mp4')) {
        expect(arg.startsWith('/')).toBe(false);
      }
    }
  });

  it('persists edl.json and render-manifest.json into the run directory (so rerender can run from stored artifacts alone)', () => {
    expect(existsSync(join(runDir, EDL_FILENAME))).toBe(true);
    expect(existsSync(join(runDir, RENDER_MANIFEST_FILENAME))).toBe(true);
  });

  it('actually burns caption text into the video frames (pixel-verifiable, not just an untouched test pattern)', async () => {
    const ffmpegPath = defaultFfmpegPath();
    const outputPath = join(runDir, RENDER_OUTPUT_FILENAME);
    const captionTimeSeconds = ((captionStartsMs[0] + 500) / 1000).toFixed(3); // safely inside caption 1's window.
    const noCaptionTimeSeconds = Math.max(0, (captionStartsMs[0] - 200) / 1000).toFixed(3); // scene 1's lead-in, before any caption.

    const captionFrame = join(workDir, 'frame-caption.png');
    const noCaptionFrame = join(workDir, 'frame-nocaption.png');
    const a = await runProcess(ffmpegPath, ['-y', '-ss', captionTimeSeconds, '-i', outputPath, '-frames:v', '1', '-loglevel', 'error', captionFrame]);
    const b = await runProcess(ffmpegPath, ['-y', '-ss', noCaptionTimeSeconds, '-i', outputPath, '-frames:v', '1', '-loglevel', 'error', noCaptionFrame]);
    expect(a.exitCode).toBe(0);
    expect(b.exitCode).toBe(0);

    const captionBytes = readFileSync(captionFrame);
    const noCaptionBytes = readFileSync(noCaptionFrame);
    expect(captionBytes.equals(noCaptionBytes)).toBe(false);
    // A frame with burned caption text differs by a non-trivial number of bytes from the same moment's test
    // pattern without it — guards against a near-zero, potentially-flaky/noise-only difference.
    expect(Math.abs(captionBytes.length - noCaptionBytes.length)).toBeGreaterThan(200);
  }, 20_000);

  it('mixes narration audio delayed to each scene\'s start, silent everywhere else (silencedetect-verifiable)', async () => {
    const ffmpegPath = defaultFfmpegPath();
    const outputPath = join(runDir, RENDER_OUTPUT_FILENAME);
    const silence = await runProcess(ffmpegPath, ['-i', outputPath, '-af', 'silencedetect=noise=-30dB:d=0.2', '-f', 'null', '-']);
    const silenceStarts = [...silence.stderr.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));

    expect(silenceStarts.length).toBeGreaterThanOrEqual(2); // at least the two inter-scene gaps.
    // The gap between narration clip 1 ending and clip 2 starting must be detected as silence, at the plan's
    // computed boundary (scene 2's caption/narration start minus its own clip already having ended).
    const secondCaptionEndSeconds = (captionStartsMs[0] + plan.scenes[0].narration.durationMs) / 1000;
    expect(silenceStarts.some((s) => Math.abs(s - secondCaptionEndSeconds) < 0.3)).toBe(true);
  }, 20_000);

  it('rerenders successfully from stored artifacts alone (edl.json + render-manifest.json + files on disk), reproducing the same media probe results', async () => {
    const rerendered = await rerender(runDir, workDir);
    expect(rerendered.output.probe.width).toBe(1920);
    expect(rerendered.output.probe.height).toBe(1080);
    expect(Math.abs(rerendered.output.probe.durationSeconds - manifest.output.probe.durationSeconds)).toBeLessThan(0.2);
    expect(rerendered.inputs.sourceVideo.sha256).toBe(manifest.inputs.sourceVideo.sha256);
  }, 60_000);

  it('rerenders correctly after the whole run directory + narration cache is copied to a new baseDir (edl.json\'s original absolute paths are stale; render-manifest.json\'s relative paths are not)', async () => {
    // Copy the entire fixture tree (narration/, capture.webm, and the run directory) to a brand-new location —
    // simulates moving/copying a completed run to another machine or checkout path, which is exactly the
    // scenario a portable, baseDir-relative render-manifest.json exists to support.
    const movedBaseDir = mkdtempSync(join(tmpdir(), 'demo-pipeline-render-e2e-moved-'));
    await runProcess('/bin/cp', ['-R', join(workDir, 'narration'), join(movedBaseDir, 'narration')]);
    await runProcess('/bin/cp', [join(workDir, 'capture.webm'), join(movedBaseDir, 'capture.webm')]);
    await runProcess('/bin/cp', ['-R', runDir, join(movedBaseDir, 'run-1')]);

    try {
      const movedRunDir = join(movedBaseDir, 'run-1');
      const rerendered = await rerender(movedRunDir, movedBaseDir);
      expect(rerendered.output.probe.width).toBe(1920);
      expect(rerendered.output.probe.height).toBe(1080);
      expect(JSON.stringify(rerendered)).not.toContain(workDir);
      expect(JSON.stringify(rerendered)).not.toContain(movedBaseDir);
    } finally {
      rmSync(movedBaseDir, { recursive: true, force: true });
    }
  }, 60_000);
});
