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

## Phase 1 evidence (Task 9, 2026-07-21)

Three consecutive full runs (`task9-run1`/`task9-run2`/`task9-run3`) against the real dev stack
(`lite-dev.atlassian.net`, space `SD`), each a fresh `pnpm demo:video -- --story
demo-pipeline/stories/mini-site-launch.story.json --run-id task9-runN`. All results below were
independently re-verified against the actual artifacts on disk (`ffprobe`, `grep`, and a live CQL
query against `lite-dev`), not taken on a report's word alone.

| Run | `final.mp4` duration | Resolution | Codecs | Scene order | Product assertion | Cleanup |
|---|---|---|---|---|---|---|
| task9-run1 | 38.433s | 1920x1080 | h264/aac | ✅ | ✅ "Mini-Site is live" | ✅ page+instance deleted |
| task9-run2 | 37.833s | 1920x1080 | h264/aac | ✅ | ✅ "Mini-Site is live" | ✅ page+instance deleted |
| task9-run3 | 37.567s | 1920x1080 | h264/aac | ✅ | ✅ "Mini-Site is live" | ✅ page+instance deleted |

Spread: 0.866s over a ~38s video (≈2.2%) — within the design doc's ±5%/±500ms (whichever is larger)
per-run tolerance, since 5% of ~38s (≈1.9s) is the operative (larger) bound. Per-scene narration
placement was **byte-identical** across all three runs (`start-in-confluence` at 500ms/5.75s,
`upload-and-publish` at 7250ms/7.7s, `prove-the-outcome` at 15950ms/4.75s) — expected, since narration
is deterministic and cache-keyed by (text, model, voice); only the captured video's real browser/product
interaction timing varies run to run, and that variance is what the table above bounds.

**Rerender-without-credentials**: `pnpm demo:render -- --run-dir .../task9-run1` succeeded with all six
credential env vars unset — no network or browser access, matching `render.ts`'s design (`rerender`
never imports anything that could launch one). The re-encoded MP4's hash differs run-to-run (expected:
`libx264`'s encoder is not byte-deterministic across invocations even with identical input), but the
media probe (resolution/duration/streams) matches, and every recorded input hash was verified against
disk before FFmpeg ran.

**Secret scan**: all 39 artifact files across the three run directories (manifests, `edl.json`,
`actions.jsonl`, `captions.srt`) were grepped for all six known credential values plus a broad
64+-hex-char scan — every hex string found is a `sha256` content hash referenced consistently across a
run's own manifests (e.g. the same evidence-file hash appears in `narrated.json` and
`render-manifest.json`), never a credential.

**Cleanup verification**: `curl`-queried `lite-dev`'s Confluence REST API directly for each run's
specific page id — all three now 404 (deleted). A broader CQL sweep of space `SD` found **nine**
pre-existing orphaned pages titled `Mini-Site render test 2026-06-16/17...` and `Mini Site reviewer
flow 2026-07-15` — all predate this session (none dated 2026-07-21) and are not a Task 9 regression;
they match this project's already-known dormant-GC debt (see `CONTEXT.md` / the progress ledger) and
were left untouched pending an explicit cleanup decision, not deleted unprompted.

### Acceptance criteria (RFC Phase 1, `docs/research/2026-07-19-agent-first-product-demo-video-pipeline-rfc.md`)

| Criterion | Status |
|---|---|
| One non-interactive command after one-time auth/OS setup | ✅ `pnpm demo:video -- --story <path>` |
| Zero manual clicking/trimming/subtitle-placement/export during a run | ✅ |
| A failed rehearsal produces no publishable video and identifies the broken action | ⚠️ structurally guaranteed (rehearsal blocks capture/render unconditionally, reviewed in Task 6/7) and unit-tested via fakes, but never exercised by a *real* rehearsal failure — none occurred in Task 9's three live runs |
| Three consecutive runs preserve scene order/narration; outcome assertions pass; per-scene timing within tolerance | ✅ see table above |
| Final file is 1080p, 30-45s, audible narration, readable captions, no clipped frames, no secrets | ✅ 1920x1080, 37.6-38.4s, captions burned-in (visually verified in Task 5's proof), secret scan clean |
| Every marketing claim maps to repository/product evidence | ✅ `mini-site-launch.story.json`'s evidence array (Task 2) |
| Rerender from stored capture/audio/EDL without operating the product again | ✅ see above |

### Runtime findings

- **Playwright Screencast**: reliable on this real product's nested Forge frames — three real
  captures, zero flakes, zero manual retries. `openMacro`'s cross-origin frame discovery (already
  proven by the existing `full-flow.spec.ts`) held up unchanged under `confluenceRunner.ts`'s
  rehearse-then-fresh-capture flow.
- **Kokoro-82M**: ~17-20s cold cost per narration line (Python import + model/voice load), then
  effectively free once cached by (text, model, voice) hash — a full 3-scene story never re-synthesizes
  audio across runs unless the story text changes.
- **FFmpeg**: the default Homebrew `ffmpeg` (no `libass`) cannot burn captions; `ffmpeg-full` resolves
  this. Encoding is fast (well under narration/capture time) but not byte-deterministic across runs —
  rerender-from-stored-artifacts is verified by media probe, not by MP4 hash equality.

### Remaining gaps and the aidemo benchmark decision

- The captured video (~37.6-38.4s) runs longer than the 21.2s narration plan, leaving a ~16-17s
  narration-free tail (real product/network wait time not covered by narration pacing) — still inside
  the 30-45s target, but a candidate for tighter scene-duration tuning in a future pass, not a defect.
- Nine pre-existing orphaned dev pages (see above) should get an explicit manual-sweep decision
  independent of this pipeline.
- **aidemo benchmark**: per the RFC's own gate ("Adopt aidemo... only if it passes those tests and
  reduces owned code. Otherwise retain it as a reference and keep FFmpeg as the stable renderer
  primitive"), the native Playwright+FFmpeg path reached every Phase 1 acceptance criterion above
  without needing it. Recommend **deferring** the aidemo parallel benchmark — there is no unmet
  capability gap it would currently close, and its maturity concerns (RFC §1.1: one human maintainer,
  unexecuted CI smoke test) are unchanged since the RFC was written. Revisit only if Phase 3's visual
  quality bar (cinematic zoom, cursor-path smoothing) becomes a stated priority.

**Phase 1 status: complete.** A real final video, a real rerender, and real three-run evidence all
exist (this section), satisfying the design doc's acceptance boundary: "Passing unit tests without a
real captured artifact is not completion."
