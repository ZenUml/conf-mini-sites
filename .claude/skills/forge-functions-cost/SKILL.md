---
name: forge-functions-cost
description: Diagnose an Atlassian "Forge Functions usage" alert (free tier 100,000 GB-seconds/month per app) — find which function or trigger is burning compute, using the Developer console's own metrics. Use when a Forge usage alert fires, when asked why GB-seconds are high, which tenant is heavy, or whether a trigger/resolver is billable. Triggers on "Forge Functions usage", "GB-seconds", "usage alert", "why is compute high", "Forge billing".
---

# Forge Functions usage & cost (GB-seconds)

When an Atlassian "Forge Functions usage" alert fires (free tier: **100,000 GB-seconds/month per app**), **find where the compute goes from the Developer console's own metrics — do NOT infer it from the manifest or from billing-label reasoning.** (We wasted several rounds in June 2026 guessing `exportMacro`, then "sync resolvers", before the console settled it.)

## Ground-truth path

`developer.atlassian.com/console/myapps/<appId>/`:

- **Metrics → Invocation → Invocation count, "Group by: Source"** — per-function/per-trigger invocation counts. This is the dispositive view.
- **Metrics → Invocation → response time, "Group by: Function"** — per-function duration. GB-seconds = invocations × duration × memory, so the driver is the source that's high on **both** count and duration.
- **Usage and charges → Functions → Site breakdown** — per-tenant GB-seconds (find the heavy tenants).

## Billing subtleties that burned us — get these right

- **A product-event `trigger` that forwards to a `remote` endpoint is billed as SYNC compute, not waived async.** The "Async (WAIVED)" bucket on the usage page is only function-based async (e.g. `pageCaptureFn`, `scheduledTrigger`) — do not assume a trigger is "async therefore free".
- In this app the macro **resolver runs on Forge** (`forge-app/src/index.js`) and is billable; the work it forwards through `invokeRemote()` to the control Worker, and everything the dispatch Worker serves, runs on **Cloudflare** and does **not** bill Forge GB-seconds. The browser-direct `/upload` path never touches a Forge function at all.
- A tenant can show GB-seconds yet **zero** browser-side Mixpanel events (`publisher_opened`, `folder_selected`) because the tenant blocks client-side Mixpanel; the server-side events (`publish_succeeded`, `publish_failed`, `render_*`, `app_installed`) still arrive from the Workers and the lifecycle trigger. Absence of browser events is **not** evidence of zero usage.

## What this app runs on Forge Functions

Only three sources exist (`forge-app/manifest.yml`): the macro **resolver** (one invocation per macro render for `/serve-url`, plus the publish handoff), the **`avi:forge:installed:app`** lifecycle trigger (`app_installed` heartbeat, once per install; added in #14), and **`preUninstall`** (once per uninstall). A usage alert therefore means resolver volume — i.e. page views of pages carrying the macro — and the Developer console's Site breakdown names the tenant. No tenant-wide page-view trigger exists here; do not add one (the conf-app lesson: such a trigger was ~98% of its GB-seconds).
