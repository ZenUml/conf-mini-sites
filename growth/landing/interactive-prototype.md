# Interactive Prototype on Confluence — Landing Page

## Hero

**Headline:** Don't explain the prototype. Let your team try it.

**Subhead:** Build a clickable prototype with AI (Claude, ChatGPT, v0, Lovable) and publish it live inside your Confluence page — no screenshots, no external links, no "open this in a new tab."

**CTA:** Try Mini Sites free on the Atlassian Marketplace

## Problem

Today, when a PM or designer wants to show a prototype in a PRD, they have two bad options:

1. **Paste a screenshot.** It's static. Reviewers can't click anything, can't test the actual flow, and end up asking questions the prototype already answers — "what happens when I click X?"
2. **Paste an external link** (Figma, Vercel, Netlify, CodeSandbox). It works, but it takes readers *out* of Confluence, breaks the reading flow, often needs a separate login or permission grant, and rots — links die, previews expire, and six months later the PRD points at a 404.

Either way, the prototype and the decision document about the prototype live in two different places. Reviewers lose context switching between them, and feedback ends up scattered across a design tool's comments and a Confluence comment thread that don't talk to each other.

## Demo

Below is a real, working example: a feature-prioritization tool where you add ideas, score them on Impact vs. Effort, drag them around a matrix, and vote — built as a self-contained HTML/CSS/JS bundle. It runs exactly the way it would after being published as a Mini Site: no iframe to an external host, no screenshot, just the live app on the page. See the source at `growth/demos/interactive-prototype/index.html`.

## How it works

1. **Create** — Build your prototype with any AI tool you already use (Claude, ChatGPT, v0, Lovable, or hand-write it). Keep it self-contained: HTML, CSS, and JS, no external network calls.
2. **Upload** — Zip the files (or point at the folder) and upload them through the Mini Sites macro on your Confluence page.
3. **Publish** — Mini Sites hosts the bundle and serves it inline, live, right where your team is already reading and commenting.

## Prompt

See the prompt file: `growth/prompts/interactive-prototype.md` — a copy-pasteable prompt for generating a similar interactive prototype with any AI assistant.

## Video

`promo/out/final.mp4` (35.000s, 1920×1080, real capture against `lite-dev.atlassian.net`) already
covers this exact scenario end to end: a Feature Prioritisation prototype built with AI, uploaded,
published, and used live inside a Confluence page — see `promo/README.md` for the full pipeline.
It is gitignored (reproducible from `promo/capture/*` + `promo/edit/assemble.ts`), so it ships
alongside this PR as a build artifact rather than a repo file. A 15s cut
(`promo/out/final_15s.mp4`) and square/vertical crops exist for social use. Before wide
distribution: re-shoot Act 2 against a production Forge install — the current capture visibly
reads "Mini-Site (Development)" in the quick-insert menu (documented gap in `promo/README.md`).

## CTA

Ready to stop pasting screenshots? Install Mini Sites from the Atlassian Marketplace and publish your first interactive prototype in under five minutes.

## SEO

**title:** Interactive Prototypes in Confluence — Mini Sites

**meta description:** Publish clickable AI-built prototypes live inside Confluence pages. No screenshots, no external links — just a working demo your team can try.
