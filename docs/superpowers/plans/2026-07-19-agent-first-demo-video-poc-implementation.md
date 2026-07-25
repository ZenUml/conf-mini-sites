# Agent-First Demo Video PoC — Implementation Plan

**Design:** [`../specs/2026-07-19-agent-first-demo-video-poc-design.md`](../specs/2026-07-19-agent-first-demo-video-poc-design.md)  
**Branch:** `codex/agent-first-demo-poc`

## Evidence rule

No browser, media, or TTS behavior is implemented from assumption. Each step starts with either an existing repository behavior, an official API contract, or a failing focused test. Logic changes follow red → green → focused refactor.

## Task 1 — Isolated tool shell

Files:

- modify `package.json`, `pnpm-lock.yaml`, `.gitignore`;
- add `demo-pipeline/tsconfig.json`, `demo-pipeline/vitest.config.ts`.

Actions:

1. Add root scripts `demo:test`, `demo:typecheck`, `demo:video`, and `demo:render`.
2. Add development-only `tsx` and `zod` dependencies.
3. Ignore `.demo-runs/` and `demo-pipeline/.venv/`.
4. Prove the empty tool shell typechecks and does not change the existing Worker `typecheck` or unit-test collection.

## Task 2 — Versioned contracts and story validation

Files:

- add `demo-pipeline/src/contracts.ts`;
- add `demo-pipeline/src/story.ts`;
- add `demo-pipeline/test/story.test.ts`;
- add `demo-pipeline/stories/mini-site-launch.story.json`.

Red tests:

1. Valid three-scene story parses.
2. Unknown schema version, duplicate scene IDs, missing evidence, unknown operation, invalid relative path, and empty observable claim fail.
3. Evidence paths resolve inside the repository and their SHA-256 hashes are stable.

Green implementation:

- Zod schemas with strict objects and discriminated semantic operations;
- canonical JSON serialization and SHA-256 helpers;
- story loader that verifies evidence before any external operation.

## Task 3 — Narration timing, DemoPlan, captions, and event log

Files:

- add `demo-pipeline/src/plan.ts`;
- add `demo-pipeline/src/captions.ts`;
- add `demo-pipeline/src/timeline.ts`;
- add `demo-pipeline/test/plan.test.ts`;
- add `demo-pipeline/test/captions.test.ts`;
- add `demo-pipeline/test/timeline.test.ts`.

Red tests:

1. Given fixed narration durations, scene order/start/end are deterministic.
2. Minimum scene duration is narration duration plus lead-in/lead-out padding.
3. SRT and VTT cues are monotonic, non-overlapping, and properly escaped.
4. Timeline events use one injected monotonic clock and redact configured secrets.

Green implementation:

- pure `StorySpec + NarrationDurations -> DemoPlan` compiler;
- scene-level caption generators;
- append-only JSONL writer with injected clock and atomic close.

## Task 4 — Narration provider and audio manifests

Files:

- add `demo-pipeline/src/process.ts`;
- add `demo-pipeline/src/narration.ts`;
- add `demo-pipeline/voice/kokoro.py`;
- add `demo-pipeline/voice/requirements.txt`;
- add `demo-pipeline/test/narration.test.ts`;
- add `demo-pipeline/test/process.test.ts`.

Red tests:

1. Process runner passes argument arrays without a shell and preserves structured failures.
2. Narration cache key changes for text/model/voice changes.
3. Existing WAV with a matching hash is reused.
4. ffprobe duration is parsed and invalid/non-positive audio fails.

Green implementation:

- `VoiceProvider` interface and Kokoro subprocess adapter;
- pinned Python requirements and an English preset voice;
- WAV/audio manifest hashing and ffprobe probing.

Runtime gate:

- create the project-local virtual environment;
- synthesize one short fixture;
- confirm duration, sample rate, and manifest fields.

## Task 5 — FFmpeg EDL and rerender path

Files:

- add `demo-pipeline/src/render.ts`;
- add `demo-pipeline/test/render.test.ts`.

Red tests:

1. EDL produces deterministic FFmpeg argument arrays with no shell interpolation.
2. Three narration clips are delayed/mixed at scene starts.
3. Captions are burned from the run-local SRT.
4. Rerender rejects a missing or hash-mismatched capture/audio input.
5. Render manifest normalizes absolute run paths and records FFmpeg configure flags.

Green implementation:

- scale/pad to 1920×1080;
- mix delayed narration with silence-safe audio graph;
- burn captions using a fixed style;
- encode H.264/AAC for this local PoC and explicitly record the GPL/libx264 build;
- ffprobe final resolution, duration, stream types, and hashes.

## Task 6 — Project-aware Playwright rehearsal and capture

Files:

- add `demo-pipeline/src/confluenceRunner.ts`;
- add `demo-pipeline/test/confluenceRunner.test.ts` with injected fakes where logic is pure;
- reuse, without weakening, `tests/e2e/helpers/confluence.ts`, `forge.ts`, `workers.ts`, and `env.ts`.

Implementation evidence:

- `createMacroPage` and cleanup are established by current UI E2E tests;
- nested frame discovery and directory `setInputFiles` are established in `forge.ts`;
- Playwright 1.61 types establish `page.screencast.start/stop` and pointer/action decoration.

Actions:

1. Launch Chromium with existing saved auth state, fixed 1920×1080 viewport, locale, timezone, and reduced motion.
2. Run semantic operations through a closed operation-to-helper map.
3. Rehearse without capture; cleanup in `finally`; block subsequent phases on failure.
4. Create a fresh page/instance and rerun the same plan with Screencast.
5. Record scene/action lifecycle and outcome assertion events.
6. Save raw WebM, trace, screenshots on failure, CaptureManifest, and cleanup outcome.

## Task 7 — CLI orchestration and job state

Files:

- add `demo-pipeline/src/artifacts.ts`;
- add `demo-pipeline/src/cli.ts`;
- add `demo-pipeline/test/artifacts.test.ts`;
- add `demo-pipeline/README.md`.

Commands:

- `pnpm demo:video -- --story <path> [--run-id <id>]`;
- `pnpm demo:video -- --rehearse-only --story <path>`;
- `pnpm demo:render -- --run-dir <path>`;
- `pnpm demo:video -- --status --run-dir <path>`.

Actions:

1. Create a run directory and write atomic phase state.
2. Orchestrate validate → narrate → plan → rehearse → capture → captions/EDL → render → verify.
3. Normalize errors into a structured `failure.json` without secrets.
4. Preserve successful artifacts for rerender; never serialize credentials or storage state.

## Task 8 — Pure validation

Run:

```bash
pnpm demo:test
pnpm demo:typecheck
pnpm test
pnpm typecheck
npx playwright test --list
```

All must pass before any real Confluence recording.

## Task 9 — Real dev-stack proof

1. Verify required environment variables exist without printing their values.
2. Run `--rehearse-only`; confirm product assertion and cleanup.
3. Run one complete capture/render.
4. Inspect manifests with ffprobe and visually inspect the final MP4.
5. Run `demo:render` from the completed run with network credentials removed.
6. Run two more complete captures; compare story order, scene timing, output dimensions, product assertions, and secret scans.

## Task 10 — Final evidence report

Update `demo-pipeline/README.md` and the RFC with:

- exact commands and environment prerequisites;
- produced artifact paths;
- repeated-run timing table;
- acceptance criteria pass/fail status;
- runtime findings for Playwright Screencast, Kokoro, and FFmpeg;
- remaining gaps and whether aidemo should enter the next benchmark.

Do not claim Phase 1 complete unless a real final video, rerender, and three-run evidence exist.

