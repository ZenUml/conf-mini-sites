# Open Design Video Production Workspace

**Date:** 2026-08-17

**Status:** Approved design

**Application foundation:** [`nexu-io/open-design`](https://github.com/nexu-io/open-design), Apache-2.0

**First workflow:** Mini Sites product-demo video production

**First migration fixture:** `demo-pipeline/.demo-runs/task9-run1` plus `demo-pipeline/stories/mini-site-launch.story.json`

## 1. Objective

Build a local video-production workspace on Open Design. The workspace must let one owner design, produce, review, revise, verify, and master one finished video per project. It must invoke the locally installed Codex CLI directly, stream progress back into the application, and preserve creative work as readable project files.

The first complete workflow is the existing Mini Sites ten-stage production process. The architecture must permit later workflows without turning the first release into a generic workflow builder.

Completion requires a real local run. The application must import the existing `mini-site-launch` artifacts, invoke Codex from the UI, move through all ten stages and four approval gates, produce and probe a local MP4 master, survive a daemon restart, and leave the Confluence development stack clean. Unit tests alone are insufficient.

## 2. Product decisions

1. Open Design is the application foundation. This is an upstream-trackable fork, not a selective copy of its modules.
2. One project produces one finished video.
3. The first workflow is Mini Sites-specific. Its stages, dependencies, prompts, evidence policy, and QC rules are plugin-defined.
4. The product is local-only and single-user. There is no public reviewer server, expiring public link, or remote-review permission model.
5. The main workspace is a workflow control room. Stage state, dependencies, gates, and artifacts dominate the screen. Codex remains visible in a side panel.
6. Codex can advance automatically within an authorized production segment. It must stop at four explicit owner approval gates.
7. Approving a gate automatically starts the next authorized segment.
8. “Request changes” records the feedback, reopens the owning stage, and immediately starts a fresh stage-scoped Codex revision run.
9. One visible project conversation spans the workspace. Each stage uses a fresh Codex thread. Approved upstream files provide cross-stage context.
10. Project files are the creative source of truth. SQLite stores operational state, indexes, runs, and approval history.
11. Manual edits and Codex edits change the same canonical files and create visible Open Design file versions.
12. Open Design media providers remain available for optional supporting assets. Generated media cannot satisfy a real product-evidence requirement.
13. Mastering writes local deliverables only. The application never uploads or publishes a video.
14. The fork presents a dedicated video-design product surface. Home, project creation, artifact navigation, and the project workspace use video equivalents. Unrelated page-design galleries and entry points are hidden, while their reusable internal systems remain available for upstream merges.

## 3. Non-goals

- A generic visual workflow builder.
- Multi-user collaboration or remote review.
- Campaign containers or multi-video projects.
- A full non-linear video editor with unrestricted tracks, effects, transitions, and mixing.
- Replacing Open Design's agent runtime, SSE transport, file-version system, plugin registry, media dispatcher, or desktop-compatible process model.
- Production Confluence capture or any production test activity.
- Automatic video publication.
- Migrating the current review console's event log or approval history.

## 4. Repository boundary

### 4.1 Open Design application fork

`/Users/pengxiao/workspaces/labs/open-design` is the upstream-tracking application fork. It owns:

- Open Design web UI changes;
- shared contracts;
- daemon video-production modules and routes;
- SQLite migrations for video job and approval state;
- stage-native editors and viewers;
- Codex, SSE, file-version, media, and desktop-compatible integration;
- application-level tests.

It also owns the runtime Mini Sites capture adapter used by the first workflow. That adapter is isolated behind a generic video capture interface. The fork must not import executable TypeScript modules directly from the Conf Mini-Sites repository at runtime.

The implementation must preserve the upstream repository structure. It must retain the Apache-2.0 license, attribution notices, and required modified-file notices. Upstream changes must remain mergeable; video-specific behavior must live in focused modules rather than broad rewrites of shared files.

### 4.2 Conf Mini-Sites workflow source

`/Users/pengxiao/workspaces/mini-sites/conf-mini-sites` owns:

- the Mini Sites video workflow plugin;
- ten-stage configuration and dependency rules;
- Mini Sites evidence and redaction policy;
- capture helpers for the development stack;
- migration inputs from the existing demo pipeline;
- the `mini-site-launch` acceptance fixture.

The Mini Sites workflow is packaged as a standard Open Design plugin folder. Development setup installs it from an absolute local path through Open Design's existing local-folder plugin installation API and snapshots the applied plugin into each project. The application must not depend on undocumented relative working directories after installation.

The existing Conf Mini-Sites capture helpers are migration sources and acceptance references. Runtime orchestration and the maintained capture adapter move into the Open Design daemon. This preserves the decision to replace the separate demo-pipeline CLI without making the daemon import another repository's private modules.

## 5. Alignment with Open Design

Video production extends the current Open Design architecture. It does not create a parallel application architecture.

### 5.1 Existing systems retained

- `apps/web` remains the browser application.
- `apps/daemon` remains the privileged local service and composition root.
- `packages/contracts` remains the shared API and event-contract boundary.
- The existing project directory model remains the storage location for creative artifacts.
- The existing SQLite database remains the operational store.
- The existing runtime registry and Codex adapter continue to detect, launch, resume, cancel, and parse Codex CLI processes.
- Existing chat and project SSE channels carry run progress and file invalidations.
- Existing file watching and file-version history cover both manual and agent writes.
- Existing plugin pipelines define workflow behavior.
- Existing media provider and export infrastructure remains available.
- Existing local web launcher and Electron-compatible architecture remain intact.

### 5.2 Focused extensions

- Add `video-production` to the task-kind contract.
- Add typed video artifact, stage job, gate snapshot, QC finding, and dependency contracts.
- Add daemon modules for video project state, production jobs, approvals, invalidation, and reconciliation.
- Add typed adapters for real capture, local voice synthesis, rendering, QC, and mastering.
- Add a video workspace branch to the existing project UI.
- Add stage-native editors and viewers.

These modules use the existing Open Design process manager, event stream, project store, version store, plugin registry, and media dispatcher. They do not duplicate them.

## 6. Runtime architecture

```text
Open Design web application
  └─ Video workflow control room
       ├─ stage rail + dependencies + blockers
       ├─ stage-native artifact editor/viewer
       ├─ gate approval / request-changes actions
       └─ Codex project conversation
            │ typed HTTP APIs + existing project/chat SSE
            ▼
Open Design daemon
  ├─ existing project, run, SSE, file-version, plugin, and media systems
  ├─ video project service
  ├─ video workflow service
  ├─ gate approval + dependency invalidation service
  ├─ production job coordinator
  └─ typed execution adapters
       ├─ Codex CLI
       ├─ Playwright Confluence development capture
       ├─ local voice synthesis
       ├─ FFmpeg render
       ├─ QC probes
       └─ optional Open Design media providers
            │
            ├─ canonical project files: creative truth
            └─ SQLite: operational truth
```

Only one production job may run for a project at a time. The daemon can run supporting probes concurrently when they are read-only and their results join one parent job.

## 7. Workflow and gates

### 7.1 Stage sequence

| Stage | Owner output | Execution |
|---|---|---|
| 1. Outline | Purpose, audience, channel, factual boundary | Codex and structured editor |
| 2. Script breakdown | Claims, screen actions, evidence, redaction | Codex and structured editor |
| 3. Storyboard | Shots, order, media references, timing intent | Codex and direct ordering/editor |
| 4. Verbatim narration | Exact words, scene mapping, timing target | Codex and structured editor |
| 5. Capture | Rehearsal, raw footage, action events, capture manifest | Typed Playwright development job |
| 6. Dailies | Review proxies, shot findings, retake decisions | Daemon processing, Codex analysis, owner review |
| 7. Voiceover | Audio clips, timing manifest, captions | Local TTS by default; optional supported provider |
| 8. Fine cut + motion | Timeline, masks, motion assets, preview render | Codex, lightweight direct editing, FFmpeg |
| 9. QC | Technical, content, evidence, privacy findings | Typed checks plus Codex-readable report |
| 10. Mastering | Final MP4, hashes, delivery manifest | Typed local job |

### 7.2 Authorized segments

1. **Plan segment:** Outline → Script breakdown → Storyboard → Verbatim narration.
2. **Evidence segment:** Capture → Dailies.
3. **Edit segment:** Voiceover → Fine cut + motion.
4. **Verify segment:** QC.
5. **Deliver segment:** Mastering.

Codex and typed jobs advance automatically inside an authorized segment. A segment ends at its gate.

### 7.3 Approval gates

| Gate | Required bundle | Approval effect |
|---|---|---|
| Plan approval | Current revisions of stages 1–4 | Starts Capture |
| Evidence approval | Current revisions of stages 5–6 | Starts Voiceover and editing |
| Fine-cut approval | Current revisions of stages 7–8 | Starts QC |
| QC approval | Current revision of stage 9 plus warning acknowledgments | Starts Mastering |

A gate approval is one immutable snapshot of the exact required artifact revisions. The owner can inspect individual artifacts, but approval acts on the bundle.

## 8. Canonical project files

```text
<video-project>/
  project.json
  plan/
    outline.md
    script.json
    storyboard.json
    narration.json
  capture/
    raw.webm
    actions.jsonl
    capture-manifest.json
    dailies.json
    proxies/
  audio/
    clips/
    timing-manifest.json
    captions.srt
  edit/
    timeline.json
    assets/
    preview.mp4
    render-manifest.json
  qc/
    report.json
  master/
    final.mp4
    delivery-manifest.json
  .file-versions/
```

Schemas must carry explicit versions. Paths stored inside canonical JSON files are project-relative. Media hashes use SHA-256. Temporary and partial outputs must stay outside canonical paths until validation succeeds.

`timeline.json` is the first-version edit-decision contract. It represents ordered clips, source ranges, audio placement, captions, masks, and supported motion instructions. It remains intentionally smaller than a general NLE project format. An OpenTimelineIO export can be added later without making it the first-version source of truth.

## 9. Revision and dependency semantics

Each workflow artifact declares upstream dependencies. The workflow plugin provides the default dependency graph; the daemon validates it as acyclic.

When an approved upstream artifact changes:

1. Keep every downstream file and version.
2. Mark each dependent artifact stale with the upstream file and revision that caused the change.
3. Mark affected gate snapshots stale.
4. Block downstream execution and mastering until the stale chain is regenerated or explicitly revalidated through the owning stage.
5. Show the reason in the stage rail, artifact header, and dependency view.

The system must never silently delete downstream work or preserve an approval against different input bytes.

External file changes use the same rules. The daemon watches canonical files, creates or reconciles file versions, recomputes content revisions, and applies dependency invalidation.

## 10. Codex interaction model

The existing Open Design Codex adapter remains authoritative for detection, model selection, environment construction, sandboxing, stdin prompt delivery, structured stream parsing, cancellation, and process cleanup.

The UI shows one project conversation. The daemon starts a fresh Codex thread for each stage run. A stage prompt contains:

- the active Mini Sites workflow plugin instructions;
- the stage objective and output contract;
- exact approved upstream artifact revisions;
- current-stage files and feedback;
- evidence, redaction, and environment constraints;
- available typed tools;
- required completion and validation signals.

The daemon does not depend on conversation memory to carry approved creative facts between stages. Canonical files carry those facts.

“Request changes” creates a durable feedback record, reopens the artifact owner stage, invalidates affected downstream approvals, and starts a fresh revision run. A Codex failure preserves streamed activity and diagnostics. Retry starts another fresh stage thread with the same approved input bundle.

## 11. Editing model

The workspace follows Open Design's artifact-first and direct-manipulation principles.

- Outline, script, storyboard, and narration use structured editors backed by canonical files.
- Storyboard cards support direct ordering and field edits.
- Capture and dailies show job progress, players, contact sheets, findings, and retake actions.
- Voiceover shows clip players, waveform/timing information, script alignment, captions, and provider settings.
- Fine cut shows a player and a lightweight timeline. The owner can reorder clips, trim ranges, mute clips, and inspect properties. Complex changes go through Codex.
- QC shows blocking errors, warnings, acknowledgments, probes, and evidence links.
- Mastering shows the local deliverables, hashes, manifest, and media probe.

Every manual gesture produces a validated patch to a canonical file and one visible file version. Codex writes the same files. Existing SSE file-change events refresh the selected artifact. Optimistic writes include the expected file revision; stale writes are rejected and shown as conflicts.

Locked stages remain readable. They cannot start jobs or accept state-changing edits that imply an unauthorized downstream revision.

## 12. Job lifecycle

Every production job follows this lifecycle:

```text
authorized → queued → running → materializing → reviewable
                       ├─ cancelled
                       ├─ retryable_failure
                       └─ blocked_failure
```

1. A project creation or gate snapshot authorizes a segment.
2. The workflow service selects the next runnable stage.
3. The job coordinator records the run before spawning processes.
4. Codex and typed adapters emit persisted progress events through the existing event infrastructure.
5. Outputs write to job-scoped temporary paths.
6. The daemon validates schemas, hashes, and media probes.
7. Valid outputs atomically replace canonical files and create file versions.
8. The stage records exact output revisions.
9. The workflow starts the next stage or stops at a gate.

Cancellation terminates the Codex process and child tools, marks the run cancelled, and leaves the last valid canonical artifacts unchanged.

## 13. Failure and recovery rules

### 13.1 Process and artifact failures

- **Codex exit or timeout:** preserve activity and diagnostics; do not promote outputs; permit a fresh retry.
- **Capture failure:** run mandatory development page and instance cleanup; do not create dailies; write a secret-redacted failure record.
- **TTS or render failure:** retain successful inputs and caches whose content hashes still match; retry only the failed operation.
- **Invalid artifact:** reject atomic promotion; preserve the last valid canonical file; show validation details.
- **Revision conflict:** reject the stale write; load the current file revision; show both revisions for reconciliation.
- **QC error:** block approval.
- **QC warning:** require a durable owner acknowledgment before approval.
- **Incomplete cleanup:** record the exact development resource and block the stage until cleanup succeeds or the owner explicitly acknowledges the residual resource.

### 13.2 Restart recovery

- Persist run state, stage state, event cursors, and gate snapshots in SQLite.
- Treat jobs left in `running` or `materializing` during daemon restart as interrupted and retryable.
- Reconcile SQLite stage records against canonical artifact manifests before permitting new work.
- Resume SSE clients from their last event ID and replay persisted progress without duplicating terminal state.
- Fail closed when canonical files and operational state disagree in a way that cannot be resolved automatically. Produce a reconciliation report; never guess which approval remains valid.
- Never overwrite an existing master silently. A new master receives a new file revision and delivery manifest.

## 14. Security, provenance, and environment boundaries

- Bind the application and daemon locally according to Open Design's existing local-first rules.
- Remove the current console's public origin and public review window features.
- Capture targets only the Conf Mini-Sites development stack. Production is prohibited.
- Use typed capture operations rather than arbitrary browser shell instructions.
- Retain existing credential redaction for logs and failure artifacts.
- Never place credentials, browser state, grants, or secrets in project artifacts.
- Preserve evidence provenance from source claim through capture, edit, QC, and master manifest.
- Generated media is marked as generated. It cannot satisfy a real product-evidence rule.
- Mastering creates local files only. Upload and publication remain separate, explicit workflows outside this application.

## 15. Migration

The current review console is not the runtime foundation. Its source projection and tests disagree, its full test suite is currently failing, and its local review-console media directory has no captured assets. Therefore:

1. Do not migrate its event log, projection state, or approvals.
2. Import reusable stage descriptions, evidence rules, redaction rules, and source artifacts.
3. Import `mini-site-launch.story.json` and one complete run, initially `task9-run1`.
4. Map the existing story, raw capture, actions, narration, edit decision list, render manifest, and final MP4 into the new canonical paths.
5. Compute fresh content revisions and begin with a clean approval history.
6. Preserve imported provenance and original hashes in a migration manifest.

The two other completed runs remain comparison fixtures and are not separate projects in the first migration.

## 16. UI behavior

The control room has three persistent regions:

1. **Stage rail:** ten stages, completion state, stale state, locks, blockers, and gate position.
2. **Stage workspace:** the selected stage's native artifact editor or viewer, revision history, and dependency information.
3. **Codex panel:** stage-scoped activity inside one visible project conversation.

The selected artifact remains primary. Conversation supports the artifact and never becomes the only durable record.

Approval actions show the exact artifact revisions in the proposed bundle. Request-changes actions require a note. Gate approval is unavailable when a required artifact is missing, stale, invalid, or has unresolved QC errors or warnings.

## 17. Verification strategy

### 17.1 Pure domain tests

- ten-stage ordering and legal transitions;
- four approval bundle definitions;
- automatic segment advancement;
- dependency graph validation;
- stale cascades;
- request-changes reopening;
- QC error and warning policy;
- deterministic content revisions.

### 17.2 Daemon integration tests

- shared contracts and route validation;
- SQLite migrations and restart reconstruction;
- job creation, cancellation, retry, and one-active-job enforcement;
- Codex stage context composition with fake runtimes;
- atomic artifact promotion and conflict rejection;
- file versions for manual and agent writes;
- SSE event replay and terminal-event idempotency;
- capture cleanup behavior with fakes;
- secret-redacted failure records.

### 17.3 Web tests

- control-room navigation and stage locking;
- stage-native editors patch canonical files;
- Codex progress and file updates appear through existing SSE;
- approval bundles show exact revisions;
- request changes starts a new stage run;
- stale dependencies and conflicts are actionable;
- QC blocks and acknowledgments;
- local master presentation.

### 17.4 Real acceptance run

1. Start the Open Design fork through its existing local launcher.
2. Import the `mini-site-launch` fixture.
3. Verify imported hashes and file mappings.
4. Invoke Codex from the application and observe structured progress in the UI.
5. Exercise all ten stages and four gates.
6. Run real capture only against the Conf Mini-Sites development stack.
7. Verify cleanup of created development resources.
8. Produce `master/final.mp4` and validate resolution, streams, duration, captions, audible audio, and hashes.
9. Restart the daemon during a controlled run and verify interrupted-run recovery plus SSE replay.
10. Change an approved upstream artifact and verify the complete downstream stale cascade.

## 18. Delivery boundary

The first delivery is complete when the local web application meets the real acceptance run above. Dedicated desktop installers, campaign management, remote review, generic workflow authoring, full NLE editing, and publication remain later work.
