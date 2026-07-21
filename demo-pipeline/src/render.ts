// EDL building, FFmpeg argv compilation, render execution, and the rerender path (design doc, "Contracts":
// "EditDecisionList: source video, narration placements, captions, title/end-card instructions, and output
// profile." / "RenderManifest: input/output hashes, FFmpeg version/configuration, command arguments with
// local paths normalized, warnings, and media probe results."; "Data flow and timing", step 7: "Build the EDL
// and render the captured WebM into a 1920×1080 MP4 with mixed narration and burned-in captions."; step 8:
// "Probe the final media, hash every artifact, and write RenderManifest last."; "Error handling and
// recovery": "FFmpeg receives an argument array rather than a shell string." / "Rerender accepts a completed
// run directory and never launches a browser." / "--render-only <run-dir> verifies artifact hashes before
// rendering.").
//
// This is the only module that knows about FFmpeg specifically — mirrors how `narration.ts` is the only
// module that knows about Kokoro/ffprobe. `process.ts` (generic subprocess runner, argument arrays only,
// never a shell string) and `contracts.ts` (canonical JSON + SHA-256 helpers) are reused, not reimplemented.
//
// Kept as one file (matching the two files the task brief lists: `render.ts` + `test/render.test.ts`) but
// organized into clearly separated sections mirroring `narration.ts`'s own size/complexity precedent:
//   1. EditDecisionList — pure data shape + pure builder (no fs/subprocess).
//   2. FFmpeg argv compiler — pure: EditDecisionList -> deterministic string[] for `process.ts`.
//   3. FFmpeg/ffprobe executable resolution — see the long comment below; this local machine's default
//      Homebrew `ffmpeg` build lacks libass/subtitles support, so this pipeline resolves a specific,
//      overridable binary rather than trusting bare "ffmpeg" on PATH.
//   4. FFmpeg version/configuration banner parsing (pure) + real-subprocess wrapper.
//   5. ffprobe media-probe parsing (pure) + real-subprocess wrapper.
//   6. RenderManifest — pure data shape + pure builder (path normalization only, no fs/subprocess).
//   7. Render execution — the one function in this file that touches fs/subprocess: writes the run-local SRT,
//      invokes FFmpeg, ffprobes the output, hashes every artifact, writes edl.json/render-manifest.json.
//   8. Rerender path — verifies recorded input hashes against the files actually on disk, then re-renders
//      from stored artifacts alone. Never launches a browser (this module has no browser code to launch one
//      with, and never imports anything that would).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { canonicalJSONStringify, sha256Hex } from './contracts';
import { toSRT, type CaptionCue } from './captions';
import { SCENE_LEAD_IN_MS, type DemoPlan } from './plan';
import type { NarrationManifest } from './narration';
import { runProcess } from './process';
import { repoRoot } from './story';

/** Raised for every render-pipeline failure: EDL construction (a narration manifest that doesn't correspond
 *  to any scene), a failed FFmpeg/ffprobe subprocess, malformed persisted run artifacts, or a rerender input
 *  that is missing or hash-mismatched. Mirrors this pipeline's one-error-type-per-module convention
 *  (`StoryValidationError`, `PlanValidationError`, `CaptionValidationError`, `NarrationError`). */
export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
  }
}

function truncateForError(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

// ---------------------------------------------------------------------------------------------------------
// 1. EditDecisionList — pure data shape + pure builder.
// ---------------------------------------------------------------------------------------------------------

/** The only EditDecisionList schema version this PoC understands (design doc, "every artifact ... is written
 *  as JSON" with `schemaVersion: 1`). */
export const EDL_SCHEMA_VERSION = 1 as const;

/** Fixed Phase 1 output profile (design doc, "Data flow and timing", step 7: "render the captured WebM into a
 *  1920×1080 MP4 ... No music and no cinematic auto-zoom in Phase 1."). Exported so tests and the argv
 *  compiler can reference the same values without duplicating them. */
export const RENDER_WIDTH = 1920;
export const RENDER_HEIGHT = 1080;
export const RENDER_FPS = 30;
export const RENDER_AUDIO_SAMPLE_RATE = 44100;
export const RENDER_VIDEO_CODEC = 'libx264';
export const RENDER_AUDIO_CODEC = 'aac';

/** One narration clip's placement in the timeline: which scene it belongs to, where on disk its WAV lives,
 *  and the millisecond offset (from the start of the whole plan) at which it must start playing. `startMs`
 *  matches `captions.ts`'s `buildCaptionCues` convention exactly — `scene.startMs + SCENE_LEAD_IN_MS` — so
 *  narration audio and its caption always begin at the same instant. */
export interface EditDecisionListNarrationPlacement {
  readonly sceneId: string;
  readonly wavPath: string;
  readonly startMs: number;
  readonly durationSeconds: number;
}

/** The fixed Phase 1 output profile as EDL data (not a compiler-side constant) — the argv compiler reads
 *  these fields rather than hardcoding them, so the EDL genuinely carries "output profile" as the design doc
 *  describes, even though this PoC only ever populates it from the one fixed profile above. */
export interface EditDecisionListOutputProfile {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly videoCodec: string;
  readonly audioCodec: string;
  readonly audioSampleRate: number;
}

/** The compiled edit decision list (design doc, "Contracts": "EditDecisionList: source video, narration
 *  placements, captions, title/end-card instructions, and output profile."). Title/end-card instructions are
 *  deliberately NOT included: Task 5's brief lists only scale/pad, delayed-narration mixing, caption burn-in,
 *  and H.264/AAC encoding as this PoC's Green implementation, and the design doc's Phase 1 scope note ("No
 *  music and no cinematic auto-zoom in Phase 1") does not mention a title/end card either — there is no fixed
 *  story content for one yet. Left as a documented gap rather than invented scope; see the render.ts
 *  "concerns" note in the task-5 report for anything Task 6/7 should know. */
export interface EditDecisionList {
  readonly schemaVersion: typeof EDL_SCHEMA_VERSION;
  readonly sourceVideoPath: string;
  readonly totalDurationMs: number;
  readonly narration: readonly EditDecisionListNarrationPlacement[];
  readonly captions: readonly CaptionCue[];
  readonly outputProfile: EditDecisionListOutputProfile;
}

/** Compile a `DemoPlan` + its caption cues + its narration manifests + the captured source video's path into
 *  a deterministic `EditDecisionList`. Pure: no filesystem or subprocess access — a byte-identical `DemoPlan`/
 *  `captionCues`/`narrationManifests`/`sourceVideoPath` always compiles to a byte-identical EDL (verified by
 *  `test/render.test.ts`'s "same inputs -> byte-identical argv" case, one level up the pipeline from here).
 *
 *  `narrationManifests` deliberately carries no scene id (see `narration.ts`'s module doc comment — it stays
 *  scene-agnostic by design), so each scene's narration manifest is matched by exact `script` text equality
 *  against `DemoPlan`'s own `narration.script` per scene — the same script string both sides already carry.
 *  Throws `RenderError` if a scene has no matching manifest, if two manifests share the same script (an
 *  unresolvable ambiguity for this matching scheme), or if the manifest count doesn't match the scene count. */
export function buildEditDecisionList(
  plan: Pick<DemoPlan, 'scenes' | 'totalDurationMs'>,
  captionCues: readonly CaptionCue[],
  narrationManifests: readonly NarrationManifest[],
  sourceVideoPath: string,
): EditDecisionList {
  const manifestsByScript = new Map<string, NarrationManifest>();
  for (const manifest of narrationManifests) {
    if (manifestsByScript.has(manifest.script)) {
      throw new RenderError(`duplicate narration manifest for script: "${truncateForError(manifest.script)}"`);
    }
    manifestsByScript.set(manifest.script, manifest);
  }
  if (manifestsByScript.size !== plan.scenes.length) {
    throw new RenderError(
      `narrationManifests count (${narrationManifests.length}) does not match plan scene count (${plan.scenes.length})`,
    );
  }

  const narration: EditDecisionListNarrationPlacement[] = plan.scenes.map((scene) => {
    const manifest = manifestsByScript.get(scene.narration.script);
    if (!manifest) {
      throw new RenderError(`no narration manifest found for scene "${scene.id}" (script: "${truncateForError(scene.narration.script)}")`);
    }
    return {
      sceneId: scene.id,
      wavPath: manifest.wavPath,
      startMs: scene.startMs + SCENE_LEAD_IN_MS,
      durationSeconds: manifest.durationSeconds,
    };
  });

  return {
    schemaVersion: EDL_SCHEMA_VERSION,
    sourceVideoPath,
    totalDurationMs: plan.totalDurationMs,
    narration,
    captions: captionCues,
    outputProfile: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      fps: RENDER_FPS,
      videoCodec: RENDER_VIDEO_CODEC,
      audioCodec: RENDER_AUDIO_CODEC,
      audioSampleRate: RENDER_AUDIO_SAMPLE_RATE,
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// 2. FFmpeg argv compiler — pure: EditDecisionList -> deterministic string[].
//
// Filter graph (one -filter_complex, video and audio chains joined by ";"):
//   [0:v] scale+pad to the output profile's resolution, then burn captions via the "subtitles" filter using a
//         fixed force_style, producing [outv].
//   [1:a] a silence-safe audio bed spanning the whole plan duration (an "anullsrc" lavfi source bounded by an
//         input-side "-t", empirically verified below to bound ONLY that input, not the whole graph).
//   [2:a]..[N+1:a] one narration WAV per scene (scene order), each "aformat"-normalized to the output
//         profile's sample rate/stereo layout, then "adelay"-shifted to start at its scene's computed start
//         time (all=1, so the delay applies uniformly regardless of a WAV's own channel count).
//   All audio branches are combined with "amix", the silence bed listed FIRST so "duration=first" makes the
//   mixed output end exactly at the plan's total duration regardless of how short/long individual narration
//   clips are; "normalize=0" because narration clips don't overlap each other in a valid DemoPlan (captions.ts
//   enforces non-overlapping cues) — amix's default loudness normalization would otherwise quietly attenuate
//   narration every time relative to how many inputs happen to be mixed.
//
// Every path argument is compiled relative to `options.baseDir` (never left absolute) — `renderVideo` spawns
// FFmpeg with that same directory as its `cwd`, so the relative paths resolve identically for real execution
// AND are exactly what gets recorded in the RenderManifest's `command.args` — one code path produces both,
// so there is no separate "normalize before recording" step to keep in sync.
// ---------------------------------------------------------------------------------------------------------

const CAPTION_FORCE_STYLE =
  'FontName=Arial,FontSize=26,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,Alignment=2,MarginV=48';

export interface CompileFfmpegArgsOptions {
  /** Every path argument in the produced argv is expressed relative to this directory. The caller (typically
   *  `renderVideo`) must spawn FFmpeg with this same directory as its `cwd` for the relative paths to resolve
   *  correctly. Passing `repoRoot()` (this module's default elsewhere) keeps the argv portable/shareable
   *  across machines without leaking any one machine's home directory. */
  readonly baseDir: string;
  /** Absolute path to the run-local SRT file this argv will reference via the subtitles filter. Not read from
   *  disk here — `compileFfmpegArgs` stays pure; `renderVideo` is responsible for actually writing it first. */
  readonly srtPath: string;
  /** Absolute path FFmpeg should write the final MP4 to. */
  readonly outputPath: string;
}

function toRelativePosix(baseDir: string, absolutePath: string): string {
  // Split on the platform separator and rejoin with "/" (mirrors story.ts's listFilesRecursive convention)
  // so the produced argv — and therefore the recorded RenderManifest — is identical on every OS, not just
  // whichever one a given run happened to execute on.
  return relative(baseDir, absolutePath).split(sep).join('/');
}

/** Escape a path for use as an FFmpeg filtergraph option value (e.g. the subtitles filter's `filename=`/
 *  `force_style=`). FFmpeg's filtergraph parser treats ":" as an option separator and "," as a filter
 *  separator, so any value containing either must be single-quoted; backslashes and literal single quotes
 *  inside the value must themselves be escaped so the quoting can't be broken out of. This is unrelated to
 *  shell escaping (the value never passes through a shell — see process.ts) — it is FFmpeg's own filtergraph
 *  mini-language. */
function escapeForFilterGraphValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

/** Format a millisecond duration as FFmpeg's decimal-seconds argument form (e.g. `12.345`). Fixed to 3 decimal
 *  places (millisecond precision, matching this pipeline's own time unit) so the same millisecond value
 *  always formats to the same string — no floating-point representation drift between two calls. */
function msToSecondsArg(ms: number): string {
  return (ms / 1000).toFixed(3);
}

/** Compile an `EditDecisionList` into the exact FFmpeg argument array `process.ts`'s `runProcess` should
 *  invoke — deterministic (same `edl`/`options` always produce a byte-identical array) and pure (no filesystem
 *  or subprocess access of its own). Every value FFmpeg needs is a separate `string[]` element; nothing is
 *  ever concatenated into one shell-style string (design doc: "FFmpeg receives an argument array rather than
 *  a shell string"). */
export function compileFfmpegArgs(edl: EditDecisionList, options: CompileFfmpegArgsOptions): string[] {
  const sourceVideoRel = toRelativePosix(options.baseDir, edl.sourceVideoPath);
  const srtRel = toRelativePosix(options.baseDir, options.srtPath);
  const outputRel = toRelativePosix(options.baseDir, options.outputPath);
  const narrationRels = edl.narration.map((placement) => toRelativePosix(options.baseDir, placement.wavPath));

  const { width, height, fps, videoCodec, audioCodec, audioSampleRate } = edl.outputProfile;

  const args: string[] = ['-y'];

  // Input 0: the captured source video.
  args.push('-i', sourceVideoRel);
  // Input 1: a silence-safe audio bed spanning the whole plan duration (see the section doc comment above for
  // why the "-t" must precede this specific "-i" to bound only this input).
  args.push('-f', 'lavfi', '-t', msToSecondsArg(edl.totalDurationMs), '-i', `anullsrc=r=${audioSampleRate}:cl=stereo`);
  // Inputs 2..N+1: one narration WAV per scene, in scene order.
  for (const rel of narrationRels) {
    args.push('-i', rel);
  }

  const videoChain =
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,` +
    `subtitles=filename=${escapeForFilterGraphValue(srtRel)}:force_style=${escapeForFilterGraphValue(CAPTION_FORCE_STYLE)}[outv]`;

  const delayedLabels: string[] = [];
  const audioChains: string[] = [];
  edl.narration.forEach((placement, i) => {
    const inputIndex = i + 2; // 0 = video, 1 = silence bed, 2.. = narration.
    const label = `a${inputIndex}`;
    delayedLabels.push(label);
    audioChains.push(
      `[${inputIndex}:a]aformat=sample_rates=${audioSampleRate}:channel_layouts=stereo,adelay=${Math.round(placement.startMs)}:all=1[${label}]`,
    );
  });

  const mixInputs = ['[1:a]', ...delayedLabels.map((label) => `[${label}]`)].join('');
  const mixChain = `${mixInputs}amix=inputs=${delayedLabels.length + 1}:normalize=0:duration=first[outa]`;

  const filterComplex = [videoChain, ...audioChains, mixChain].join(';');

  args.push('-filter_complex', filterComplex);
  args.push('-map', '[outv]', '-map', '[outa]');
  // "veryfast" trades a little compression efficiency for much faster encodes — this PoC is a developer/agent
  // tool re-rendering short (tens of seconds) clips repeatedly, not a production encode where file size is the
  // priority. Only meaningful for libx264/libx265; this PoC's one fixed `videoCodec` is always libx264.
  args.push('-c:v', videoCodec, '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', String(fps));
  args.push('-c:a', audioCodec, '-b:a', '192k', '-ar', String(audioSampleRate));
  args.push('-movflags', '+faststart');
  args.push(outputRel);

  return args;
}

// ---------------------------------------------------------------------------------------------------------
// 3. FFmpeg/ffprobe executable resolution.
//
// This machine's default Homebrew "ffmpeg" formula (already relied on by narration.ts for ffprobe duration
// measurement) is deliberately minimal and is NOT built with libass/freetype — verified empirically:
// `ffmpeg -filters` lists no "subtitles", "ass", or "drawtext" filter at all, and `ffmpeg -version`'s
// configuration line has no "--enable-libass". The design doc's Green implementation requires burning
// captions via the subtitles filter, which hard-requires libass. Homebrew's separate "ffmpeg-full" formula
// (keg-only — it does NOT get symlinked into PATH, so it can't disturb narration.ts's existing bare "ffmpeg"/
// "ffprobe" PATH usage) does include "--enable-libass" alongside the same "--enable-gpl --enable-libx264" this
// PoC already relies on. Installed for this task: `brew install ffmpeg-full` (local, reversible dev-machine
// package install — see the task-5 report for the full "over your head" writeup).
//
// render.ts therefore resolves its OWN ffmpeg/ffprobe executables rather than trusting bare "ffmpeg"/
// "ffprobe" on PATH, defaulting to the Homebrew ffmpeg-full keg's known install locations (Apple Silicon and
// Intel), overridable via `DEMO_PIPELINE_FFMPEG_DIR` (e.g. for a CI runner or a machine that links
// ffmpeg-full directly onto PATH) or an explicit per-call path. Falls back to the bare command name (PATH
// lookup) if no known location exists on disk, so this still works on a machine where a libass-enabled
// ffmpeg happens to already be first on PATH.
// ---------------------------------------------------------------------------------------------------------

/** Environment variable naming the directory containing libass-enabled `ffmpeg`/`ffprobe` binaries — an
 *  override for machines where Homebrew's `ffmpeg-full` keg isn't at one of the default locations below (or
 *  isn't installed via Homebrew at all). */
export const FFMPEG_DIR_ENV_VAR = 'DEMO_PIPELINE_FFMPEG_DIR';

const HOMEBREW_FFMPEG_FULL_DIRS = [
  '/opt/homebrew/opt/ffmpeg-full/bin', // Homebrew on Apple Silicon
  '/usr/local/opt/ffmpeg-full/bin', // Homebrew on Intel macOS
];

function resolveFfmpegExecutable(name: 'ffmpeg' | 'ffprobe'): string {
  const envDir = process.env[FFMPEG_DIR_ENV_VAR];
  const candidateDirs = envDir ? [envDir, ...HOMEBREW_FFMPEG_FULL_DIRS] : HOMEBREW_FFMPEG_FULL_DIRS;
  for (const dir of candidateDirs) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return name; // Fall back to a bare PATH lookup.
}

/** Resolve the libass-enabled `ffmpeg` executable this module should invoke — see the section doc comment
 *  above. Re-resolved on every call (not cached at module load) so a test can set/unset
 *  `DEMO_PIPELINE_FFMPEG_DIR` and see the change take effect immediately. */
export function defaultFfmpegPath(): string {
  return resolveFfmpegExecutable('ffmpeg');
}

/** Resolve the matching `ffprobe` executable from the same libass-enabled build as `defaultFfmpegPath()`. */
export function defaultFfprobePath(): string {
  return resolveFfmpegExecutable('ffprobe');
}

// ---------------------------------------------------------------------------------------------------------
// 4. FFmpeg version/configuration banner parsing (pure) + real-subprocess wrapper.
// ---------------------------------------------------------------------------------------------------------

/** FFmpeg's own build fingerprint, as recorded in `RenderManifest.ffmpeg` (design doc: "FFmpeg version/
 *  configuration" and "the PoC records this fact in the manifest and does not claim an LGPL-only distribution
 *  path"). `configuration` is every `--enable-*`/`--disable-*`/... flag from the banner's "configuration:"
 *  line, in the order FFmpeg printed them. `gplLibx264` is computed, not asserted — `true` only when both
 *  `--enable-gpl` and some `--enable-libx264*` flag are actually present in that parsed list. */
export interface FfmpegBuildInfo {
  readonly version: string;
  readonly configuration: readonly string[];
  readonly gplLibx264: boolean;
}

/** Parse `ffmpeg -version`'s banner text into an `FfmpegBuildInfo`. Pure and synchronous — kept separate from
 *  `detectFfmpegBuildInfo` (which spawns the real subprocess) so the parsing/validation rules are unit-
 *  testable against captured banner text without depending on FFmpeg actually being installed. */
export function parseFfmpegVersionBanner(stdout: string): FfmpegBuildInfo {
  const versionMatch = stdout.match(/^ffmpeg version (\S+)/m);
  if (!versionMatch) {
    throw new RenderError(`could not parse ffmpeg version from banner: ${truncateForError(stdout)}`);
  }
  const configMatch = stdout.match(/^\s*configuration:\s*(.*)$/m);
  const configuration = configMatch
    ? configMatch[1]
        .trim()
        .split(/\s+/)
        .filter((token) => token.startsWith('--'))
    : [];
  const gplLibx264 = configuration.includes('--enable-gpl') && configuration.some((token) => token.startsWith('--enable-libx264'));
  return { version: versionMatch[1], configuration, gplLibx264 };
}

/** Spawn the resolved `ffmpeg -version` and parse its banner via `parseFfmpegVersionBanner`. Throws
 *  `RenderError` if the subprocess itself exits non-zero. */
export async function detectFfmpegBuildInfo(ffmpegPath: string = defaultFfmpegPath()): Promise<FfmpegBuildInfo> {
  const result = await runProcess(ffmpegPath, ['-version']);
  if (result.exitCode !== 0) {
    throw new RenderError(`ffmpeg -version failed (exit ${result.exitCode}): ${result.stderr.trim() || '(no stderr)'}`);
  }
  return parseFfmpegVersionBanner(result.stdout);
}

// ---------------------------------------------------------------------------------------------------------
// 5. ffprobe media-probe parsing (pure) + real-subprocess wrapper.
// ---------------------------------------------------------------------------------------------------------

export interface MediaProbeStream {
  readonly codecType: string;
  readonly codecName: string;
}

/** What this pipeline needs out of probing the final rendered MP4 (design doc: "Probe the final media" /
 *  Task 5 brief: "ffprobe final resolution, duration, stream types"). `width`/`height` are `undefined` only if
 *  no video stream was found at all — a defensive case, not one a successful render should ever reach. */
export interface MediaProbe {
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly durationSeconds: number;
  readonly streams: readonly MediaProbeStream[];
}

interface FfprobeMediaJsonOutput {
  readonly format?: { readonly duration?: string };
  readonly streams?: readonly { readonly codec_type?: string; readonly codec_name?: string; readonly width?: number; readonly height?: number }[];
}

/** Parse ffprobe's `-of json -show_entries format=duration -show_entries stream=codec_type,codec_name,width,
 *  height` output into a `MediaProbe`. Pure and synchronous, mirroring `narration.ts`'s `parseFfprobeOutput`
 *  split (parsing kept separate from the subprocess call so it's unit-testable against hand-crafted output). */
export function parseMediaProbeOutput(stdout: string): MediaProbe {
  let parsed: FfprobeMediaJsonOutput;
  try {
    parsed = JSON.parse(stdout) as FfprobeMediaJsonOutput;
  } catch {
    throw new RenderError(`ffprobe output is not valid JSON: ${truncateForError(stdout)}`);
  }

  const durationRaw = parsed.format?.duration;
  const durationSeconds = durationRaw === undefined ? NaN : Number(durationRaw);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RenderError(`ffprobe reported an invalid or non-positive duration: ${JSON.stringify(durationRaw)}`);
  }

  const rawStreams = parsed.streams ?? [];
  const streams = rawStreams.map((s) => ({ codecType: s.codec_type ?? 'unknown', codecName: s.codec_name ?? 'unknown' }));
  const videoStream = rawStreams.find((s) => s.codec_type === 'video');

  return { width: videoStream?.width, height: videoStream?.height, durationSeconds, streams };
}

/** Spawn the resolved `ffprobe` against `mediaPath` and parse its output via `parseMediaProbeOutput`. Throws
 *  `RenderError` if ffprobe itself exits non-zero. */
export async function probeMediaFile(mediaPath: string, ffprobePath: string = defaultFfprobePath()): Promise<MediaProbe> {
  const result = await runProcess(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-show_entries',
    'stream=codec_type,codec_name,width,height',
    '-of',
    'json',
    mediaPath,
  ]);
  if (result.exitCode !== 0) {
    throw new RenderError(`ffprobe failed (exit ${result.exitCode}) for ${mediaPath}: ${result.stderr.trim() || '(no stderr)'}`);
  }
  return parseMediaProbeOutput(result.stdout);
}

// ---------------------------------------------------------------------------------------------------------
// 6. RenderManifest — pure data shape + pure builder.
// ---------------------------------------------------------------------------------------------------------

export const RENDER_MANIFEST_SCHEMA_VERSION = 1 as const;

export interface RenderManifestHashedInput {
  /** Path normalized relative to the manifest's base directory (never a raw absolute machine path — see
   *  `normalizeManifestPath`). */
  readonly path: string;
  readonly sha256: string;
}

export interface RenderManifestNarrationInput extends RenderManifestHashedInput {
  readonly sceneId: string;
}

/** design doc, "Contracts": "RenderManifest: input/output hashes, FFmpeg version/configuration, command
 *  arguments with local paths normalized, warnings, and media probe results." `command.executable` is
 *  deliberately the logical program name ("ffmpeg"), not whichever absolute path was actually resolved and
 *  invoked on this machine (see section 3) — that resolved path is a local package-manager implementation
 *  detail, while `ffmpeg` (version + configuration) already fully fingerprints which real build ran. */
export interface RenderManifest {
  readonly schemaVersion: typeof RENDER_MANIFEST_SCHEMA_VERSION;
  readonly ffmpeg: FfmpegBuildInfo;
  readonly inputs: {
    readonly sourceVideo: RenderManifestHashedInput;
    readonly narration: readonly RenderManifestNarrationInput[];
  };
  readonly output: {
    readonly path: string;
    readonly sha256: string;
    readonly probe: MediaProbe;
  };
  readonly command: {
    readonly executable: string;
    readonly args: readonly string[];
  };
  readonly warnings: readonly string[];
}

/** Normalize an absolute path to one relative to `baseDir`, using "/" as the separator on every OS (mirrors
 *  `toRelativePosix` above / `story.ts`'s directory-hashing convention). This is the ONLY place a path is
 *  allowed to leak into a `RenderManifest` — every hashed-input/output field below is normalized through it,
 *  so a manifest never contains one machine's raw absolute path (e.g. `/Users/<name>/...`), only a path
 *  relative to `baseDir` (this pipeline's convention: `repoRoot()`, so the manifest stays portable/shareable
 *  across checkouts of the same repository). A file outside `baseDir` (e.g. the stable narration cache
 *  directory, which deliberately lives outside any one run directory — see `narration.ts`) still normalizes
 *  to a relative path (with leading `../` segments); it never falls back to an absolute path. */
export function normalizeManifestPath(absolutePath: string, baseDir: string): string {
  return relative(baseDir, absolutePath).split(sep).join('/');
}

export interface HashedFileRef {
  readonly absolutePath: string;
  readonly sha256: string;
}

export interface BuildRenderManifestInput {
  readonly baseDir: string;
  readonly ffmpeg: FfmpegBuildInfo;
  readonly sourceVideo: HashedFileRef;
  readonly narration: readonly (HashedFileRef & { readonly sceneId: string })[];
  readonly output: HashedFileRef & { readonly probe: MediaProbe };
  /** The exact argv actually passed to FFmpeg — expected to already be `baseDir`-relative (as
   *  `compileFfmpegArgs` produces), so it is recorded verbatim rather than re-normalized here. */
  readonly command: { readonly executable: string; readonly args: readonly string[] };
  readonly warnings: readonly string[];
}

/** Pure: builds a `RenderManifest` from already-computed hashes/probe/build-info, normalizing every absolute
 *  input/output path relative to `baseDir`. Split out from `renderVideo` specifically so the path-
 *  normalization behavior (Task 5 red test: "Render manifest normalizes absolute run paths") is unit-testable
 *  without invoking FFmpeg at all. */
export function buildRenderManifest(input: BuildRenderManifestInput): RenderManifest {
  return {
    schemaVersion: RENDER_MANIFEST_SCHEMA_VERSION,
    ffmpeg: input.ffmpeg,
    inputs: {
      sourceVideo: {
        path: normalizeManifestPath(input.sourceVideo.absolutePath, input.baseDir),
        sha256: input.sourceVideo.sha256,
      },
      narration: input.narration.map((n) => ({
        sceneId: n.sceneId,
        path: normalizeManifestPath(n.absolutePath, input.baseDir),
        sha256: n.sha256,
      })),
    },
    output: {
      path: normalizeManifestPath(input.output.absolutePath, input.baseDir),
      sha256: input.output.sha256,
      probe: input.output.probe,
    },
    command: input.command,
    warnings: input.warnings,
  };
}

// ---------------------------------------------------------------------------------------------------------
// 7. Render execution — writes the SRT, invokes FFmpeg, ffprobes the output, hashes everything, persists
//    edl.json + render-manifest.json into the run directory.
// ---------------------------------------------------------------------------------------------------------

export const CAPTIONS_SRT_FILENAME = 'captions.srt';
export const RENDER_OUTPUT_FILENAME = 'final.mp4';
export const EDL_FILENAME = 'edl.json';
export const RENDER_MANIFEST_FILENAME = 'render-manifest.json';

export interface RenderVideoOptions {
  /** Directory this render writes `captions.srt`, `final.mp4`, `edl.json`, and `render-manifest.json` into.
   *  Created (recursively) if it doesn't already exist. */
  readonly runDir: string;
  /** Base directory every path recorded in the manifest (and every path in the compiled FFmpeg argv) is made
   *  relative to. Defaults to `repoRoot()` — both the run directory and the stable narration cache directory
   *  live under it, so this one base normalizes both uniformly. FFmpeg is spawned with this as its `cwd`. */
  readonly baseDir?: string;
  readonly ffmpegPath?: string;
  readonly ffprobePath?: string;
}

function hashFileOrThrow(absolutePath: string, label: string): string {
  try {
    return sha256Hex(readFileSync(absolutePath));
  } catch (error) {
    throw new RenderError(`failed to hash ${label} at ${absolutePath}: ${(error as Error).message}`);
  }
}

/** Render `edl` into a real MP4 inside `options.runDir`: writes the run-local SRT, compiles and runs the
 *  FFmpeg argv, ffprobes the result, hashes every input/output, and persists `edl.json` +
 *  `render-manifest.json` next to the output (so a later `rerender` can run from stored artifacts alone).
 *  Returns the `RenderManifest`. Throws `RenderError` if FFmpeg itself exits non-zero (its captured stderr,
 *  tailed to the last 20 lines, is included rather than discarded) or if hashing any input/output fails. */
export async function renderVideo(edl: EditDecisionList, options: RenderVideoOptions): Promise<RenderManifest> {
  const baseDir = options.baseDir ?? repoRoot();
  const ffmpegPath = options.ffmpegPath ?? defaultFfmpegPath();
  const ffprobePath = options.ffprobePath ?? defaultFfprobePath();

  mkdirSync(options.runDir, { recursive: true });

  const srtPath = join(options.runDir, CAPTIONS_SRT_FILENAME);
  const outputPath = join(options.runDir, RENDER_OUTPUT_FILENAME);
  writeFileSync(srtPath, toSRT(edl.captions), 'utf-8');

  const args = compileFfmpegArgs(edl, { baseDir, srtPath, outputPath });

  const result = await runProcess(ffmpegPath, args, { cwd: baseDir });
  if (result.exitCode !== 0) {
    const tail = result.stderr.trim().split('\n').slice(-20).join('\n');
    throw new RenderError(`ffmpeg render failed (exit ${result.exitCode}):\n${tail || '(no stderr)'}`);
  }

  const [ffmpegBuildInfo, probe] = await Promise.all([detectFfmpegBuildInfo(ffmpegPath), probeMediaFile(outputPath, ffprobePath)]);

  const warnings: string[] = [];
  if (probe.width !== edl.outputProfile.width || probe.height !== edl.outputProfile.height) {
    warnings.push(
      `expected output resolution ${edl.outputProfile.width}x${edl.outputProfile.height}, ffprobe reported ${probe.width}x${probe.height}`,
    );
  }
  if (!ffmpegBuildInfo.gplLibx264) {
    warnings.push('resolved ffmpeg build does not report both --enable-gpl and --enable-libx264 — GPL/libx264 distribution claim may not hold');
  }
  // The mixed audio track is always exactly `edl.totalDurationMs` long (amix's "duration=first" ties it to
  // the silence bed — see compileFfmpegArgs), but the video track's length is whatever the source video
  // actually is. For this task's synthesized fixtures the two always match; a real Task 6 capture may run
  // slightly long/short of the DemoPlan's computed duration (real browser/network timing), in which case the
  // shorter stream ends before the longer one within the same output file. This is surfaced as a warning
  // rather than silently reconciled (e.g. via "-shortest", which would risk truncating trailing narration) —
  // deciding the right reconciliation policy is Task 6/7's call once a real capture's actual duration
  // characteristics are known.
  const totalDurationSeconds = edl.totalDurationMs / 1000;
  if (Math.abs(probe.durationSeconds - totalDurationSeconds) > 0.5) {
    warnings.push(
      `output duration ${probe.durationSeconds.toFixed(3)}s differs from the DemoPlan's computed total duration ${totalDurationSeconds.toFixed(3)}s by more than 0.5s — the source video's actual length likely diverged from the plan`,
    );
  }

  const manifest = buildRenderManifest({
    baseDir,
    ffmpeg: ffmpegBuildInfo,
    sourceVideo: { absolutePath: edl.sourceVideoPath, sha256: hashFileOrThrow(edl.sourceVideoPath, 'source video') },
    narration: edl.narration.map((placement) => ({
      sceneId: placement.sceneId,
      absolutePath: placement.wavPath,
      sha256: hashFileOrThrow(placement.wavPath, `narration WAV for scene "${placement.sceneId}"`),
    })),
    output: { absolutePath: outputPath, sha256: hashFileOrThrow(outputPath, 'rendered output'), probe },
    command: { executable: 'ffmpeg', args },
    warnings,
  });

  writeFileSync(join(options.runDir, EDL_FILENAME), canonicalJSONStringify(edl), 'utf-8');
  writeFileSync(join(options.runDir, RENDER_MANIFEST_FILENAME), canonicalJSONStringify(manifest), 'utf-8');

  return manifest;
}

// ---------------------------------------------------------------------------------------------------------
// 8. Rerender path — verify recorded input hashes against disk BEFORE invoking FFmpeg, then re-render from
//    stored artifacts alone. Never launches a browser (no browser code exists in this module to launch one
//    with).
// ---------------------------------------------------------------------------------------------------------

export interface RerenderInputCheck {
  /** The path exactly as recorded in the prior `RenderManifest` (baseDir-relative). */
  readonly path: string;
  readonly reason: 'missing' | 'hash-mismatch';
}

/** Verify every hashed input recorded in `manifest` (source video + narration WAVs — deliberately NOT the
 *  SRT, which is cheap/deterministic to regenerate fresh from the EDL on every render rather than needing
 *  integrity-checking as a stored artifact) still exists at its recorded (`baseDir`-relative) location and
 *  still hashes to the recorded value. Returns every failure found (not just the first), so a caller can
 *  report the complete picture in one error rather than making the user re-run repeatedly to discover each
 *  problem one at a time. */
export function checkRerenderInputs(manifest: Pick<RenderManifest, 'inputs'>, baseDir: string): RerenderInputCheck[] {
  const failures: RerenderInputCheck[] = [];
  const entries: readonly RenderManifestHashedInput[] = [manifest.inputs.sourceVideo, ...manifest.inputs.narration];
  for (const entry of entries) {
    const absolutePath = resolve(baseDir, entry.path);
    if (!existsSync(absolutePath)) {
      failures.push({ path: entry.path, reason: 'missing' });
      continue;
    }
    const actualHash = sha256Hex(readFileSync(absolutePath));
    if (actualHash !== entry.sha256) {
      failures.push({ path: entry.path, reason: 'hash-mismatch' });
    }
  }
  return failures;
}

function readJsonOrThrow<T>(absolutePath: string, filename: string, runDir: string): T {
  if (!existsSync(absolutePath)) {
    throw new RenderError(`cannot rerender: missing ${filename} in run directory ${runDir}`);
  }
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf-8')) as T;
  } catch (error) {
    throw new RenderError(`cannot rerender: ${filename} in ${runDir} is not valid JSON: ${(error as Error).message}`);
  }
}

/** `edl.json` is written by `buildEditDecisionList`, which never normalizes paths (it's pure passthrough) —
 *  so `edl.sourceVideoPath`/`narration[].wavPath` are whatever machine-absolute paths were current at the
 *  time the EDL was originally built. If the run directory (and the stable narration cache alongside it) is
 *  later copied or moved to a different `baseDir` — the exact scenario a portable, hash-verified
 *  `render-manifest.json` exists to support — those stale absolute paths would no longer resolve, even though
 *  `checkRerenderInputs` (which resolves the manifest's `baseDir`-relative paths against the CURRENT
 *  `baseDir`) would correctly report success. This re-bases the EDL onto the manifest's verified, relative-
 *  to-the-current-`baseDir` paths (matched by `sceneId`) before rendering, so `rerender` is honest about which
 *  paths it actually just verified. */
function rebaseEdlFromManifest(edl: EditDecisionList, manifest: RenderManifest, baseDir: string): EditDecisionList {
  const narrationPathBySceneId = new Map(manifest.inputs.narration.map((n) => [n.sceneId, resolve(baseDir, n.path)]));
  return {
    ...edl,
    sourceVideoPath: resolve(baseDir, manifest.inputs.sourceVideo.path),
    narration: edl.narration.map((placement) => {
      const wavPath = narrationPathBySceneId.get(placement.sceneId);
      if (!wavPath) {
        throw new RenderError(`render-manifest.json has no recorded input for scene "${placement.sceneId}", which edl.json's narration expects`);
      }
      return { ...placement, wavPath };
    }),
  };
}

/** Re-render a previously-completed run directory (design doc: "Rerender accepts a completed run directory
 *  and never launches a browser." / "--render-only <run-dir> verifies artifact hashes before rendering.").
 *  Reads back the persisted `edl.json` and prior `render-manifest.json` `renderVideo` wrote, verifies every
 *  recorded input hash against the actual files on disk via `checkRerenderInputs` — BEFORE invoking FFmpeg —
 *  and throws `RenderError` (listing every failure, not just the first) on any missing or hash-mismatched
 *  input. Only once verification passes does it re-base the EDL onto the just-verified paths
 *  (`rebaseEdlFromManifest`) and call `renderVideo` again: no `DemoPlan`, caption cues, or narration manifests
 *  are re-derived, and no browser is ever launched (this module has no browser-related import to launch one
 *  with). */
export async function rerender(runDir: string, baseDir: string = repoRoot()): Promise<RenderManifest> {
  const edl = readJsonOrThrow<EditDecisionList>(join(runDir, EDL_FILENAME), EDL_FILENAME, runDir);
  const priorManifest = readJsonOrThrow<RenderManifest>(join(runDir, RENDER_MANIFEST_FILENAME), RENDER_MANIFEST_FILENAME, runDir);

  const failures = checkRerenderInputs(priorManifest, baseDir);
  if (failures.length > 0) {
    const detail = failures.map((f) => `  - ${f.path}: ${f.reason}`).join('\n');
    throw new RenderError(`cannot rerender: ${failures.length} input(s) failed verification against recorded hashes:\n${detail}`);
  }

  const rebasedEdl = rebaseEdlFromManifest(edl, priorManifest, baseDir);
  return renderVideo(rebasedEdl, { runDir, baseDir });
}
