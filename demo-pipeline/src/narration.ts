// VoiceProvider boundary, Kokoro subprocess adapter, narration caching, and ffprobe-based audio probing
// (design doc, "Data flow and timing", step 2: "Generate all narration WAV files before touching the
// product; probe their exact durations"; "Contracts": "NarrationManifest: provider/model/voice, script, WAV
// path, measured duration, and hash").
//
// This is the only TS module that knows about Kokoro or ffprobe specifically — `process.ts` is a generic
// subprocess runner with no domain knowledge, and `voice/kokoro.py` is a thin synthesis script this module
// invokes as a subprocess (see that file's own doc comment for the stdout/exit-code protocol between them).
//
// `plan.ts` is this module's direct downstream consumer: it takes a `NarrationDurationsMs` map
// (sceneId -> milliseconds) as an external input and never synthesizes or measures audio itself. A caller
// (Task 7's CLI orchestration) is expected to call `synthesizeNarration` once per scene's narration script,
// then convert each returned `NarrationManifest.durationSeconds` to milliseconds when building that map —
// this module itself stays scene-agnostic; it only ever deals in (text, model, voice) tuples, never scene
// ids, so it can be tested and reasoned about independently of `StorySpec`/`DemoPlan`.
//
// Local TTS output is cached (design doc's runtime-gate requirement that "a rerender does not change
// narration"): `synthesizeNarration` checks for a previously-written WAV + sidecar manifest keyed by a hash
// of (provider, model, voice, text) before calling into a `VoiceProvider` at all, and only trusts that cache
// when the sidecar's recorded hash still matches the WAV file's actual on-disk bytes — guarding against a
// truncated, corrupted, or hand-edited cache entry being silently reused.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { canonicalJSONStringify, sha256Hex, sha256OfCanonicalJSON } from './contracts';
import { runProcess } from './process';
import { repoRoot } from './story';

/** Raised for every narration-generation failure: a failed Kokoro subprocess, a failed ffprobe subprocess,
 *  or invalid/non-positive ffprobe output. Mirrors this pipeline's one-error-type-per-module convention
 *  (`StoryValidationError`, `PlanValidationError`, `CaptionValidationError`). */
export class NarrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NarrationError';
  }
}

// ---------------------------------------------------------------------------------------------------------
// VoiceProvider boundary.
// ---------------------------------------------------------------------------------------------------------

/** What a `VoiceProvider` needs to synthesize one clip: which preset voice, which model identifier (recorded
 *  in the resulting manifest and folded into the cache key — see `computeNarrationCacheKey`), and exactly
 *  where to write the WAV file. */
export interface VoiceSynthesisOptions {
  readonly voice: string;
  readonly model: string;
  readonly outputPath: string;
}

/** What a `VoiceProvider` reports back after synthesizing one clip: the WAV it wrote, that WAV's *measured*
 *  duration and sample rate (never an estimate — a real provider probes the file it just wrote via ffprobe),
 *  and a content hash of the WAV bytes. */
export interface VoiceSynthesisResult {
  readonly wavPath: string;
  readonly durationSeconds: number;
  readonly sampleRate: number;
  readonly sha256: string;
}

/** The seam between narration generation and any concrete TTS backend. The PoC has exactly one real
 *  implementation (`KokoroVoiceProvider`, a local subprocess adapter), but `test/narration.test.ts` exercises
 *  the caching logic in `synthesizeNarration` against a fake/stub implementation, so "an existing WAV with a
 *  matching hash is reused" never needs a real subprocess (or the ~1GB local venv) to verify. */
export interface VoiceProvider {
  /** A short, stable identifier folded into the cache key and the `provider` field of every
   *  `NarrationManifest` this provider produces — e.g. `'kokoro-local'`. */
  readonly name: string;
  synthesize(text: string, options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult>;
}

// ---------------------------------------------------------------------------------------------------------
// NarrationManifest + caching.
// ---------------------------------------------------------------------------------------------------------

/** The only NarrationManifest schema version this PoC understands (design doc, "every artifact ... is
 *  written as JSON" with `schemaVersion: 1`). */
export const NARRATION_MANIFEST_SCHEMA_VERSION = 1 as const;

/** One synthesized narration clip's full record (design doc, "Contracts": "NarrationManifest:
 *  provider/model/voice, script, WAV path, measured duration, and hash"). This is both the return value of
 *  `synthesizeNarration` and the exact JSON shape persisted as each cache entry's sidecar file. */
export interface NarrationManifest {
  readonly schemaVersion: typeof NARRATION_MANIFEST_SCHEMA_VERSION;
  readonly provider: string;
  readonly model: string;
  readonly voice: string;
  readonly script: string;
  readonly wavPath: string;
  readonly durationSeconds: number;
  readonly sampleRate: number;
  readonly sha256: string;
}

/** A request to synthesize one narration clip: the script text plus the (model, voice) pair that, together
 *  with `provider.name`, determines the cache key — see `computeNarrationCacheKey`. Deliberately carries no
 *  scene id (see module doc comment); a caller maps StorySpec scenes to requests. */
export interface NarrationRequest {
  readonly text: string;
  readonly model: string;
  readonly voice: string;
}

/** Compute the cache key for one (provider, model, voice, text) tuple: a SHA-256 over the canonical JSON form
 *  of the four inputs. Changing any one of them changes the key — exactly what makes the cache invalidate
 *  correctly on a script edit, a voice change, a model change, or a provider swap. */
export function computeNarrationCacheKey(input: {
  readonly provider: string;
  readonly model: string;
  readonly voice: string;
  readonly text: string;
}): string {
  return sha256OfCanonicalJSON(input);
}

/** Read a previously-cached `NarrationManifest` for the WAV/sidecar pair at `manifestPath`/`wavPath`, but
 *  only if BOTH files exist, the sidecar parses as JSON, AND the sidecar's recorded `sha256` still matches a
 *  fresh hash of the WAV file's actual on-disk bytes. Returns `undefined` on any cache miss — including a
 *  corrupted, truncated, or hand-edited cache entry — so the caller re-synthesizes rather than trusting a
 *  cache entry whose integrity can't be verified. */
function readCachedManifest(manifestPath: string, wavPath: string): NarrationManifest | undefined {
  if (!existsSync(manifestPath) || !existsSync(wavPath)) return undefined;

  let manifest: NarrationManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as NarrationManifest;
  } catch {
    return undefined;
  }

  const actualHash = sha256Hex(readFileSync(wavPath));
  if (actualHash !== manifest.sha256) return undefined;

  return manifest;
}

/** Synthesize one narration clip through `provider`, reusing a previously-cached WAV when one exists for the
 *  same (provider, model, voice, text) tuple and its recorded hash still matches the file on disk (design
 *  doc requirement: "a rerender does not change narration"). `cacheDir` is created if it doesn't exist yet;
 *  it is deliberately NOT a per-run directory — callers should point it at a stable location so the cache
 *  survives across separate runs. This repo's convention: `defaultNarrationCacheDir()`
 *  (`demo-pipeline/.demo-cache/narration/`, gitignored) — a sibling of the per-run `.demo-runs/<run-id>/`
 *  convention, not nested inside it, since a fresh run id would otherwise defeat caching entirely. */
export async function synthesizeNarration(provider: VoiceProvider, request: NarrationRequest, cacheDir: string): Promise<NarrationManifest> {
  const cacheKey = computeNarrationCacheKey({ provider: provider.name, model: request.model, voice: request.voice, text: request.text });
  const wavPath = join(cacheDir, `${cacheKey}.wav`);
  const manifestPath = join(cacheDir, `${cacheKey}.json`);

  const cached = readCachedManifest(manifestPath, wavPath);
  if (cached) return cached;

  mkdirSync(cacheDir, { recursive: true });
  const result = await provider.synthesize(request.text, { voice: request.voice, model: request.model, outputPath: wavPath });

  const manifest: NarrationManifest = {
    schemaVersion: NARRATION_MANIFEST_SCHEMA_VERSION,
    provider: provider.name,
    model: request.model,
    voice: request.voice,
    script: request.text,
    wavPath: result.wavPath,
    durationSeconds: result.durationSeconds,
    sampleRate: result.sampleRate,
    sha256: result.sha256,
  };
  writeFileSync(manifestPath, canonicalJSONStringify(manifest));
  return manifest;
}

// ---------------------------------------------------------------------------------------------------------
// ffprobe-based duration/sample-rate measurement.
// ---------------------------------------------------------------------------------------------------------

/** The two fields this pipeline actually needs out of ffprobe: a positive, finite duration in seconds and a
 *  positive integer sample rate. */
export interface AudioProbe {
  readonly durationSeconds: number;
  readonly sampleRate: number;
}

interface FfprobeJsonOutput {
  readonly format?: { readonly duration?: string };
  readonly streams?: readonly { readonly sample_rate?: string }[];
}

/** Parse ffprobe's `-of json -show_entries format=duration -show_entries stream=sample_rate` output into an
 *  `AudioProbe`, or throw `NarrationError` if the JSON is malformed, the duration is missing/non-numeric/
 *  non-positive, or the sample rate is missing/non-numeric/non-positive/non-integer.
 *
 *  Pure and synchronous — kept separate from `probeWavFile` (which actually spawns ffprobe) so the parsing
 *  and validation rules are unit-testable against hand-crafted ffprobe output without a real subprocess. */
export function parseFfprobeOutput(stdout: string): AudioProbe {
  let parsed: FfprobeJsonOutput;
  try {
    parsed = JSON.parse(stdout) as FfprobeJsonOutput;
  } catch {
    throw new NarrationError(`ffprobe output is not valid JSON: ${stdout}`);
  }

  const durationRaw = parsed.format?.duration;
  const durationSeconds = durationRaw === undefined ? NaN : Number(durationRaw);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new NarrationError(`ffprobe reported an invalid or non-positive duration: ${JSON.stringify(durationRaw)}`);
  }

  const sampleRateRaw = parsed.streams?.[0]?.sample_rate;
  const sampleRate = sampleRateRaw === undefined ? NaN : Number(sampleRateRaw);
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new NarrationError(`ffprobe reported an invalid or non-positive sample rate: ${JSON.stringify(sampleRateRaw)}`);
  }

  return { durationSeconds, sampleRate };
}

/** Spawn real `ffprobe` against `wavPath` and parse its output via `parseFfprobeOutput`. Throws
 *  `NarrationError` if ffprobe itself exits non-zero (e.g. the file is missing, empty, or not valid audio) —
 *  its captured stderr is included in the thrown message rather than discarded. */
export async function probeWavFile(wavPath: string): Promise<AudioProbe> {
  const result = await runProcess('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-show_entries',
    'stream=sample_rate',
    '-of',
    'json',
    wavPath,
  ]);
  if (result.exitCode !== 0) {
    throw new NarrationError(`ffprobe failed (exit ${result.exitCode}) for ${wavPath}: ${result.stderr.trim() || '(no stderr)'}`);
  }
  return parseFfprobeOutput(result.stdout);
}

// ---------------------------------------------------------------------------------------------------------
// Kokoro subprocess adapter.
// ---------------------------------------------------------------------------------------------------------

const KOKORO_PROVIDER_NAME = 'kokoro-local';

/** kokoro.py's one JSON line on stdout — see that file's module doc comment for the exact protocol. */
interface KokoroStdoutResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly wavPath?: string;
  readonly sampleRate?: number;
}

/** Extract the last line of `stdout` that parses as JSON with a boolean `ok` field. `kokoro.py` always prints
 *  exactly one such line, but scanning from the end (rather than assuming line 1) tolerates stray warning
 *  output a misbehaving dependency might print to stdout before it. Returns `undefined` if no such line
 *  exists at all (e.g. the interpreter crashed before printing anything, or was never invoked). */
function parseKokoroStdout(stdout: string): KokoroStdoutResult | undefined {
  const lines = stdout.split('\n').reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as Partial<KokoroStdoutResult>;
      if (typeof parsed.ok === 'boolean') return parsed as KokoroStdoutResult;
    } catch {
      // Not a JSON line (e.g. a library warning printed to stdout) — keep scanning backwards.
    }
  }
  return undefined;
}

function truncateForError(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export interface KokoroVoiceProviderOptions {
  /** Path to the project-local venv's Python interpreter. Defaults to `demo-pipeline/.venv/bin/python3`
   *  resolved against the repository root. */
  readonly pythonPath?: string;
  /** Path to the adapter script. Defaults to `demo-pipeline/voice/kokoro.py`. */
  readonly scriptPath?: string;
  /** Language code passed to Kokoro's pipeline (`KPipeline(lang_code=...)`). Defaults to `'a'` (American
   *  English) — the PoC's one supported English preset-voice family. */
  readonly langCode?: string;
}

/** `VoiceProvider` backed by a subprocess call into `demo-pipeline/voice/kokoro.py`, which runs the pinned
 *  local Kokoro-82M model inside the project-local venv.
 *
 *  Never invokes a shell (via `process.ts`'s `runProcess`) — narration text is passed as a single argv
 *  element, so it can contain arbitrary punctuation (quotes, semicolons, `$()`, em dashes, ...) without any
 *  escaping concern.
 *
 *  After the subprocess reports success, this adapter independently probes the WAV it wrote via ffprobe — it
 *  never trusts a duration or sample rate the Python side might claim (kokoro.py in fact doesn't claim a
 *  duration at all; see its module doc comment), since ffprobe is this pipeline's one source of truth for
 *  measured audio properties (design doc, "Data flow and timing", step 2: "probe their exact durations"). */
export class KokoroVoiceProvider implements VoiceProvider {
  readonly name = KOKORO_PROVIDER_NAME;

  constructor(private readonly options: KokoroVoiceProviderOptions = {}) {}

  async synthesize(text: string, options: VoiceSynthesisOptions): Promise<VoiceSynthesisResult> {
    // `options.model` is intentionally NOT forwarded to kokoro.py: this adapter always runs the one pinned
    // Kokoro-82M build declared in voice/requirements.txt, so there is nothing for a `--model` flag to
    // select. `model` still flows into the returned manifest (via `synthesizeNarration`, the caller) and the
    // cache key, purely as a caller-facing identifier/version label for that pinned build.
    const pythonPath = this.options.pythonPath ?? defaultKokoroPythonPath();
    const scriptPath = this.options.scriptPath ?? defaultKokoroScriptPath();
    const langCode = this.options.langCode ?? 'a';

    const result = await runProcess(pythonPath, [
      scriptPath,
      '--text',
      text,
      '--voice',
      options.voice,
      '--lang-code',
      langCode,
      '--out',
      options.outputPath,
    ]);

    const parsedStdout = parseKokoroStdout(result.stdout);

    if (result.exitCode !== 0 || !parsedStdout?.ok) {
      const detail = parsedStdout?.error ?? result.stderr.trim() ?? '(no output)';
      throw new NarrationError(
        `kokoro synthesis failed (exit ${result.exitCode}) for text "${truncateForError(text)}": ${detail}`,
      );
    }

    const probe = await probeWavFile(options.outputPath);
    return {
      wavPath: options.outputPath,
      durationSeconds: probe.durationSeconds,
      sampleRate: probe.sampleRate,
      sha256: sha256Hex(readFileSync(options.outputPath)),
    };
  }
}

/** Resolve the project-local venv's Python interpreter against the repository root, mirroring `story.ts`'s
 *  `repoRoot()` convention so this default works no matter where `pnpm demo:*` is invoked from. */
export function defaultKokoroPythonPath(root: string = repoRoot()): string {
  return resolve(root, 'demo-pipeline', '.venv', 'bin', 'python3');
}

/** Resolve `demo-pipeline/voice/kokoro.py` against the repository root. */
export function defaultKokoroScriptPath(root: string = repoRoot()): string {
  return resolve(root, 'demo-pipeline', 'voice', 'kokoro.py');
}

/** Default, stable narration cache directory. Deliberately NOT inside a per-run `.demo-runs/<run-id>/`
 *  directory — the cache must survive across separate runs to satisfy "a rerender does not change
 *  narration". Gitignored via `demo-pipeline/.demo-cache/`. */
export function defaultNarrationCacheDir(root: string = repoRoot()): string {
  return resolve(root, 'demo-pipeline', '.demo-cache', 'narration');
}
