# Interactive Architecture Diagram on Confluence

## Hero

**Make architecture diagrams explorable.**

Turn your static architecture image into a live diagram your team can click through — right inside the
Confluence page where the docs already live.

## Problem

A static diagram can only be looked at. The viewer sees boxes and arrows, but not who owns each service,
what protocol connects them, what depends on what, or where the known risks sit. Every one of those
questions today means pinging the author in Slack, hunting through a wiki page, or opening a separate
tool — and the answer usually isn't attached to the diagram at all, so it drifts out of date without
anyone noticing.

## Demo

Try the live demo: [`growth/demos/interactive-diagram/index.html`](../demos/interactive-diagram/index.html)

Click any service box (Confluence Page, Control Worker, Dispatch Worker, the per-instance Worker, D1) or
any data-flow arrow between them. A detail panel opens inline showing owner, API/protocol, dependencies,
and risk — no page navigation, no separate tool.

## How it works

1. **Create** — build (or ask an AI to build) a self-contained HTML/CSS/JS site: your diagram plus the
   click-to-expand detail panels, using your own architecture as the source of truth.
2. **Upload** — drag the folder into the Mini Sites publisher on your Confluence page. No build step, no
   deploy pipeline — it's a static bundle.
3. **Publish** — the mini-site renders inline on the page immediately. Anyone who can view the page can
   click through it; permissions are inherited from Confluence.

## Prompt

Don't want to build it by hand? See the prompt file: [`growth/prompts/interactive-diagram.md`](../prompts/interactive-diagram.md).
Paste your own architecture description in and get a ready-to-upload bundle back.

## Video

No walkthrough video exists yet for this scenario. Placeholder — replace with a recorded demo before
using this landing page in outbound campaigns.

## CTA

Have an architecture diagram sitting in Confluence as a flat image right now? Turn it into something your
team can click through. [Try Mini Sites on the Atlassian Marketplace →](https://marketplace.atlassian.com/apps/1237219/mini-sites-for-confluence)

## SEO

**title**: Interactive Architecture Diagrams in Confluence | Mini Sites

**meta description**: Turn static architecture diagrams into clickable, explorable diagrams inline on your Confluence page. No build step — just upload.
