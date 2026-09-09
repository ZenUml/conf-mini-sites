---
name: bug-report-framing
description: Structure a Conf Mini-Sites bug report or incident write-up with User-First Trace — user journey first, then runtime evidence, then code path. Use when writing up a customer-reported bug, a production incident, a regression report, or a postmortem for the Mini Sites for Confluence app. Triggers on "write up this bug", "incident report", "bug report", "postmortem", "how should I frame this issue".
---

# Bug reports: User-First Trace

Frame bug reports and incident write-ups with **User-First Trace**:

1. **User journey** — start with what the user did, what they saw, what changed, and what outcome they experienced. Keep the end user as the skeleton of the report and the highest priority.
2. **Runtime evidence** — layer in console errors, network calls, API responses, analytics events, timing, retries, page/draft state, and environment details.
3. **Code path** — only after the user journey and runtime evidence are clear, explain the source code paths that produced the behavior.

## State-Surface Framing

Use lower-level techniques such as State-Surface Framing inside this structure when relevant: identify where the data truth is held (the Confluence page and its macro `localId`, the derived `instanceId`, the per-instance Worker `ms-<instanceId>` in the WfP namespace, the D1 instance/install stores, the signed serve grant) and which surface is reading or writing it (the Forge Custom UI launcher, the Publisher modal, the resolver, the control Worker `/publish` `/upload` `/serve-url`, the dispatch Worker, the nested mini-site iframe). Name tenants only by cloud id or by a profile under `private/`, never by hostname (see `docs/policies/client-privacy.md`).
