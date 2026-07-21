# demo-pipeline

An isolated developer/agent tool that produces one 30-45 second launch video for Mini Site for
Confluence, non-interactively: load a `StorySpec` → synthesize narration → compile a `DemoPlan` →
rehearse and capture the real product in a real Confluence browser session → render a captioned
MP4 → verify every artifact. Full design: `docs/superpowers/specs/2026-07-19-agent-first-demo-video-poc-design.md`.

This tool is not imported by the Cloudflare Worker or Forge app bundles. It is invoked directly via
`pnpm demo:video` / `pnpm demo:render`, both of which resolve to `demo-pipeline/src/cli.ts`.

## How this fits together

```text
story.ts          load + validate StorySpec, hash evidence
  -> narration.ts   synthesize narration WAVs (Kokoro), probe duration via ffprobe (cached)
  -> plan.ts        StorySpec + narration durations(ms) -> DemoPlan (scene timing)
  -> confluenceRunner.ts   rehearse (no video) then capture (Screencast) the plan against real
                            Confluence, via the existing tests/e2e/helpers/* — the only module that
                            imports them, and the only one that launches a browser
  -> captions.ts    DemoPlan -> caption cues (pure)
  -> render.ts      EDL -> FFmpeg argv -> final.mp4 + RenderManifest (also supports rerender)
  -> artifacts.ts   run directory + atomic job-phase-state bookkeeping (no orchestration logic)
  -> cli.ts         argument parsing + orchestration + top-level error handling/redaction
```

`cli.ts` is the composition root: it is the only module that imports everything else. `artifacts.ts`
knows nothing about StorySpecs, DemoPlans, or Confluence — it only deals in run ids, phase names, and
caller-supplied `(name -> sha256)` hash maps; `cli.ts` is what gives those hashes meaning.

## Environment prerequisites

Three one-time local setup steps, in addition to this repo's normal `pnpm install` (root
`devDependencies` already include `tsx`, `zod`, and `@playwright/test`; no demo-pipeline-specific
`package.json` exists).

### 1. Python venv for local Kokoro TTS (Task 4)

The system `python3` on a typical dev machine may be too new for `kokoro`/`misaki` (verified: 3.13.5
fails to resolve `kokoro` at all) — use Homebrew's `python3.12` explicitly:

```bash
python3.12 -m venv demo-pipeline/.venv
demo-pipeline/.venv/bin/pip install --no-cache-dir -r demo-pipeline/voice/requirements.txt
```

Takes roughly 30s and ~1GB of disk (`kokoro==0.9.4`, `soundfile`, and their dependency closure,
pinned in `requirements.txt`, including a spaCy model wheel `kokoro`'s own first run otherwise
side-effect-installs). The venv and the narration cache are both gitignored
(`demo-pipeline/.venv/`, `demo-pipeline/.demo-cache/`).

A **cold** cache costs roughly 17-20s per narration line just for Python import + model/voice-pack
load, on top of 1-3s of actual inference (three lines in the shipped story ≈ a minute, once). Every
later run reuses the cache (`demo-pipeline/.demo-cache/narration/`, keyed by a hash of
provider/model/voice/text) and is near-instant — `synthesizeNarration` (`src/narration.ts`) checks it
before ever spawning `kokoro.py`.

### 2. `ffmpeg-full` for caption burn-in (Task 5)

The default Homebrew `ffmpeg` formula (already used for `ffprobe` duration measurement) is not built
with `libass`, so it cannot burn captions via the `subtitles` filter this pipeline relies on:

```bash
brew install ffmpeg-full
```

`render.ts` resolves this keg-only formula's binaries directly (`/opt/homebrew/opt/ffmpeg-full/bin` on
Apple Silicon, `/usr/local/opt/ffmpeg-full/bin` on Intel) rather than trusting a bare `ffmpeg`/`ffprobe`
on `PATH` — override the directory with `DEMO_PIPELINE_FFMPEG_DIR` if your build lives somewhere else
(e.g. CI, or a machine where `ffmpeg-full` is linked directly onto `PATH`).

### 3. `tests/e2e/.env` for the real Confluence dev stack (Task 6)

`rehearse`/`capture` reuse the project's existing Playwright E2E helpers and credentials — copy
`tests/e2e/.env.example` to `tests/e2e/.env`, fill in real values, and source it before running the
full pipeline or `--rehearse-only`:

```bash
set -a; source tests/e2e/.env; set +a
```

Everything is read lazily (`tests/e2e/helpers/env.ts`), so `--status` and `demo:render` (rerender)
never need these — only `rehearse`/`capture` (which touch the real product) do. See
`tests/e2e/.env.example` for the full variable list; `FORGE_EMAIL`/`FORGE_API_TOKEN` and
`CONTROL_SHARED_SECRET` are the ones `rehearse`/`capture` themselves need
(`createMacroPage`/`deletePage`/`deleteInstance`).

**Auth-state freshness — not checked by this CLI.** `rehearse`/`capture` load the cached Playwright
storage state at `tests/e2e/.auth/state.json` directly; they do **not** run the self-healing
`setup/auth.setup.ts` login. Before a live run, either run the `setup` Playwright project once
(`npx playwright test --project=setup`) or otherwise confirm that file holds a live session. A stale
state fails at the first `openMacro` frame-discovery step with a login-wall diagnostic, not silently.

## Commands

```bash
# Full pipeline: load -> narrate -> plan -> rehearse -> capture -> render -> verify.
pnpm demo:video -- --story demo-pipeline/stories/mini-site-launch.story.json [--run-id <id>]

# Steps 1-4 only (load -> narrate -> plan -> rehearse). Never captures or renders.
pnpm demo:video -- --rehearse-only --story demo-pipeline/stories/mini-site-launch.story.json

# Re-render a completed run directory from stored artifacts alone. Verifies every recorded input
# hash against disk before invoking FFmpeg. Never launches a browser.
pnpm demo:render -- --run-dir demo-pipeline/.demo-runs/<run-id>

# Read-only job-phase report for a run directory. Runs nothing, launches nothing.
pnpm demo:video -- --status --run-dir demo-pipeline/.demo-runs/<run-id>
```

`--run-id` is optional on the first two commands; when omitted, a fresh id is generated in
`YYYYMMDD-HHMMSS-xxxx` form (UTC, no colons — colons in a run-id used to break FFmpeg's argument
parsing before Task 5 patched around it; the generator avoids the character entirely as cheap
defense-in-depth). Passing an existing `--run-id` resumes that run directory: any phase whose
recorded input hashes still match the current story/narration/plan is **reused** (skipped) rather
than redone — most usefully, this means re-running `demo:video` after a capture or render failure
does not repeat a rehearsal or capture that already passed.

`pnpm demo:video`/`pnpm demo:render` are root `package.json` scripts wrapping
`tsx demo-pipeline/src/cli.ts run`/`... cli.ts render`; everything after `--` is forwarded as CLI
flags.

## Job phases and artifacts

The CLI tracks explicit job phases, written atomically (write to a temp file, then `rename()`) only
after each phase's real work genuinely succeeds: `narrated`, `planned`, `rehearsed`, `captured`,
`rendered`, `verified` — plus a terminal `failed` state. (This execution order intentionally differs
from the design doc's own phase *listing* order — narration must be synthesized before the plan can
be compiled, since `plan.ts`'s `compileDemoPlan` takes narration durations as an input.)

A run's artifacts live under `demo-pipeline/.demo-runs/<run-id>/` (gitignored):

```text
.demo-runs/<run-id>/
  phases/{narrated,planned,rehearsed,captured,rendered,verified}.json   phase state (this run's own)
  failure.json            present only if the run failed; normalized, secret-redacted error record
  actions.jsonl           ActionEvent timeline (capture mode only), monotonic timestamps
  raw.webm                captured screencast (capture mode only)
  capture-manifest.json   source video hash/dimensions/time-base/tool versions
  captions.srt            burned-in caption track
  edl.json                EditDecisionList (source video, narration placements, captions, profile)
  render-manifest.json    input/output hashes, FFmpeg version/config, command args, media probe
  final.mp4               the finished 1920x1080 H.264/AAC video
```

Narration WAVs are **not** per-run — they live in the stable, cross-run
`demo-pipeline/.demo-cache/narration/` cache (also gitignored) so identical narration text is never
re-synthesized across separate runs.

`failure.json` and every console log line have all known credential env var **values**
(`CONTROL_SHARED_SECRET`, `FORGE_EMAIL`, `FORGE_API_TOKEN`, `ZENUML_STAGE_USERNAME`,
`ZENUML_STAGE_PASSWORD`, `ATLASSIAN_OTP` — the full `tests/e2e/.env.example` "Secrets / credentials"
list) replaced with `[REDACTED]` before being written or printed. Nothing in this pipeline ever reads
`tests/e2e/.auth/state.json`'s contents into memory (only its path is handed to Playwright's
`storageState` option), so no artifact this CLI writes can ever contain browser storage state.

## Tests

```bash
pnpm demo:test        # vitest — 202 tests, all pure/fs-local or against real local ffmpeg/ffprobe/Kokoro
pnpm demo:typecheck   # tsc --noEmit -p demo-pipeline/tsconfig.json
```

`demo-pipeline/test/artifacts.test.ts` covers run-directory/job-phase bookkeeping (atomic writes,
hash-based reuse-vs-redo, `--status` reporting) with tiny fixture files — no browser, FFmpeg, or Kokoro
involved. `confluenceRunner.test.ts` covers the rehearse/capture state machine entirely against
injected fakes (no real browser). The only thing this repository's test suite does **not** prove is a
real end-to-end run through a real Confluence browser session — that is Task 9's job, run against the
live dev stack with `tests/e2e/.env` sourced.
