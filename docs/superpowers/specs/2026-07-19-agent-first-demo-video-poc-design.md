# Agent-First Demo Video — Phase 1 PoC Design

**Status:** Approved through the 2026-07-19 RFC and the user's “Go” instruction  
**Parent RFC:** [`docs/research/2026-07-19-agent-first-product-demo-video-pipeline-rfc.md`](../../research/2026-07-19-agent-first-product-demo-video-pipeline-rfc.md)  
**Scope:** One 30–45 second English launch video for Mini Site for Confluence

## Goal

Prove a complete unattended chain:

```text
Product evidence -> StorySpec -> DemoPlan -> rehearsal -> capture
                 -> narration/captions -> EDL -> final video + manifest
```

After one-time authentication and local dependency setup, one command must perform the workflow without manual recording, timeline editing, subtitle placement, or export.

## Approaches considered

### A. Project-native Playwright + FFmpeg — selected

Reuse the existing Confluence E2E helpers for nested Forge frames, directory upload, publish, preview, assertions, and cleanup. Add Playwright Screencast, an event timeline, local TTS, captions, and an FFmpeg renderer in an isolated `demo-pipeline/` tool.

This is selected because it exercises the real product workflow, works with the repository's existing Playwright 1.61 dependency, and keeps every stage callable from a CLI.

### B. aidemo end to end — deferred benchmark

Translate the story directly to aidemo's storyboard and let aidemo execute and render it. This owns less media code, but the current product workflow needs operations beyond aidemo's verified action vocabulary, including directory upload, dynamic nested-frame discovery, and outcome assertions. Its project maturity is also too low for an unwrapped dependency.

### C. Highlight Studio or OBS — optional later adapter

Use an OS recorder/editor controlled through a local API. This may improve polish or capture browser chrome, but introduces macOS permissions, a running GUI process, portability constraints, and licensing questions. It is outside the smallest browser-only PoC.

## Isolation and file layout

The PoC lives in `demo-pipeline/`. It is a local developer/agent tool and is not imported by the Cloudflare Worker or Forge app bundles.

```text
demo-pipeline/
  stories/mini-site-launch.story.json
  src/
    contracts.ts        versioned contracts and runtime validation
    story.ts            StorySpec loading and evidence checks
    plan.ts             StorySpec -> deterministic DemoPlan
    timeline.ts         monotonic ActionEvent writer
    narration.ts        VoiceProvider boundary and audio probing
    captions.ts         known-script SRT/VTT timing
    confluenceRunner.ts project-aware rehearsal/capture adapter
    render.ts           EDL -> FFmpeg command and RenderManifest
    cli.ts              run/rehearse/render/status entry point
  voice/kokoro.py       pinned local Kokoro adapter
  test/                 pure contract/timing/render-command tests
  tsconfig.json
  vitest.config.ts
```

Generated artifacts go under the ignored `.demo-runs/<run-id>/` directory. No credentials or authentication state are copied into a run.

## Contracts

The PoC implements only the fields required for the single story, but every artifact has `schemaVersion: 1` and is written as JSON.

- `StorySpec`: product/build, objective, audience, evidence references, scenes, narration, observable claim.
- `DemoPlan`: ordered scenes with project-aware operations, expected outcome, narration reference, and timing bounds.
- `ActionEvent` JSONL: monotonic timestamp, scene, operation, lifecycle (`start`, `success`, `failure`), and non-secret metadata.
- `CaptureManifest`: source video, dimensions, time base, capture/tool versions, and hashes.
- `NarrationManifest`: provider/model/voice, script, WAV path, measured duration, and hash.
- `EditDecisionList`: source video, narration placements, captions, title/end-card instructions, and output profile.
- `RenderManifest`: input/output hashes, FFmpeg version/configuration, command arguments with local paths normalized, warnings, and media probe results.

Runtime validation rejects unknown schema versions, missing evidence, duplicate scene IDs, non-positive timing, path traversal, and narration/scene mismatches before browser execution.

## Story and demo flow

The fixed PoC story has three scenes:

1. **Start in Confluence:** show an empty Mini-Site macro and frame the promise: turn a normal site folder into a live Confluence experience.
2. **Upload and publish:** open the Publisher, upload the repository's multi-file sample bundle through `setInputFiles`, and publish it.
3. **Prove the outcome:** open the dispatched preview and assert that the mini-site body contains `Mini-Site is live`.

The compiler maps semantic scene operations to the existing project helpers. It does not expose arbitrary JavaScript execution in `StorySpec`.

## Data flow and timing

1. Load and validate `StorySpec`; record the product Git SHA and evidence file hashes.
2. Generate all narration WAV files before touching the product; probe their exact durations.
3. Compile a `DemoPlan` whose minimum scene duration is narration duration plus fixed lead-in/lead-out padding.
4. Rehearse the plan without Screencast. All selectors, auth, upload, publish, preview, and outcome assertions must pass. Cleanup always runs.
5. Reset by creating a fresh Confluence page/instance, then execute the same plan with Screencast enabled.
6. Write `ActionEvent` timestamps against one monotonic run clock. Scene start times become the narration and caption placements.
7. Build the EDL and render the captured WebM into a 1920×1080 MP4 with mixed narration and burned-in captions. No music and no cinematic auto-zoom in Phase 1.
8. Probe the final media, hash every artifact, and write `RenderManifest` last.

Rerender accepts a completed run directory and never launches a browser.

## Error handling and recovery

- The CLI uses explicit job phases: `planned`, `narrated`, `rehearsed`, `captured`, `rendered`, `verified`, `failed`.
- A phase writes its manifest atomically only after success. Existing completed phases are reusable when their input hashes still match.
- Rehearsal failure blocks capture and render.
- Browser/page/instance cleanup runs in `finally`; cleanup failure is recorded without hiding the primary error.
- FFmpeg receives an argument array rather than a shell string.
- Logs redact values of known credential environment variables and never serialize browser storage state.
- `--render-only <run-dir>` verifies artifact hashes before rendering.

## Dependencies

- Existing root Playwright 1.61 and Node 22.
- `tsx` and `zod` as root development-only dependencies for the isolated CLI and runtime schemas.
- Existing local FFmpeg/ffprobe 8.1.1. The detected Homebrew binary is GPL-enabled and includes libx264; the PoC records this fact in the manifest and does not claim an LGPL-only distribution path.
- **Correction (Task 5):** that default Homebrew `ffmpeg` formula does not include libass, so it cannot burn captions via the subtitles filter this PoC relies on. Task 5 instead resolves Homebrew's keg-only `ffmpeg-full` formula (`brew install ffmpeg-full`; overridable via the `DEMO_PIPELINE_FFMPEG_DIR` env var), which does include libass alongside the same GPL/libx264 build already recorded in the manifest — see `demo-pipeline/src/render.ts`'s executable-resolution section for the verified details.
- A project-local Python virtual environment for pinned Kokoro and audio dependencies. The PoC uses an English preset voice and does not clone a person's voice.

## Testing and evidence gates

Pure tests run without network or credentials:

- accept the canonical StorySpec and reject invalid versions/evidence/scenes;
- compile stable scene order and timing from fixed narration durations;
- generate valid non-overlapping SRT/VTT cues;
- build FFmpeg argument arrays without shell interpolation;
- hash and validate rerender inputs;
- redact credential values from manifests/errors.

Integration gates:

1. `pnpm demo:test` and `pnpm demo:typecheck` pass.
2. Rehearsal passes against the dev Confluence stack and leaves no page/worker instance behind.
3. One real capture/render passes media probes and product outcome assertions.
4. Three complete runs preserve story/scene order and stay within the approved per-scene timing tolerance.
5. Stored capture/audio/EDL rerenders without contacting Confluence.

## Non-goals

- generalized product exploration or automatic story ranking;
- arbitrary user-authored browser actions;
- native desktop capture;
- automatic cinematic zoom or cursor-path synthesis;
- music selection, avatar video, voice cloning, or Mandarin narration;
- cloud job orchestration, UI editor, publishing, or production deployment;
- aidemo/Highlight/OBS integration beyond a documented post-PoC benchmark.

## Acceptance boundary

The PoC is complete only when the real Mini Site workflow produces a verified final video and manifests through a non-interactive command. Passing unit tests without a real captured artifact is not completion.
