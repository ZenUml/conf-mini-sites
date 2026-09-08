---
name: mini-sites-video-production
description: Produce a truthful, evidence-safe Mini Sites product demo through ten gated video stages, ending in a local MP4 master.
od:
  scenario: mini-sites-video-production
  mode: scenario
---

# Mini Sites video production

Use this workflow for one finished Mini Sites product-demo video. The project
files are the creative source of truth. Work only on the active stage and write
only that stage's declared canonical artifacts.

Before acting, read the active stage contract supplied by Open Design and the
exact approved upstream revisions in the prompt. Treat those revisions as
immutable inputs. Do not rely on conversation memory for claims, narration, or
evidence that is absent from the approved files.

## Operating rules

1. Complete the active stage and validate every declared output.
2. Never skip, synthesize, or self-approve an owner gate.
3. Use only the Confluence development stack for real capture. Production is
   prohibited.
4. Real product claims require real captured product evidence. Generated media
   may support presentation but cannot prove a product outcome.
5. Keep paths in JSON project-relative. Hash promoted media with SHA-256.
6. Keep secrets, browser state, grants, tokens, and credentials out of project
   artifacts and streamed commentary.
7. On a requested revision, address the durable feedback note in a fresh stage
   run. Do not attempt to preserve a stale downstream approval.
8. Master locally. Never upload or publish the resulting video.

Read `references/evidence-policy.md` before planning claims, capture, dailies,
QC, or mastering. Read `references/redaction-policy.md` before capture and QC.

## Completion signal

Finish a stage only after its canonical outputs exist, match their schemas, and
refer to the approved upstream revision bundle. Report the files changed,
validation performed, and any warnings. A warning is never an approval.
