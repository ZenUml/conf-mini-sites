## Hero

Turn a decision document into a decision tool.

Your vendor-selection or architecture-choice doc has a comparison table — options down the side, criteria across the top, maybe a "winner" bolded at the bottom. Nobody trusts it, because nobody can see how it was produced. Embed a live decision tool on the Confluence page instead — readers set their own weights for Cost, Impact, Risk, and Effort, and watch the ranking recompute in front of them.

## Problem

A static comparison table asks the reader to accept your weighting on faith. Maybe you cared more about cost than risk when you built it; maybe the reviewer cares more about risk than cost. There's no way for them to find out without asking you to redo the table with different assumptions — and most people don't ask, they just quietly discount a recommendation they can't verify. The table becomes decoration: a thing that looks like analysis but functions as an opinion with a border around it. This is not the same failure as a static Decision Matrix screenshot — the fix isn't a nicer table, it's making the weighting itself something the reader can operate.

## Demo

Try the working tool: [`growth/demos/decision-tool/index.html`](../demos/decision-tool/index.html)

Drag the weight sliders for Cost, Impact, Risk, and Effort — the ranking of the three options and their weighted scores recompute live. Edit any per-option criterion score and the ranking updates the same way. No page reload, no re-requesting the analysis.

## How it works

1. **Create** — Build (or generate, see the Prompt section) a small self-contained HTML/CSS/JS bundle like the one in the demo above.
2. **Upload** — Add the bundle's files to the Mini Sites macro on your Confluence page.
3. **Publish** — The macro serves the bundle live, inline, on the page — readers set their own weights right where the decision doc lives.

## Prompt

Want to generate your own weighted decision tool for a real choice you're making? See the prompt file: [`growth/prompts/decision-tool.md`](../prompts/decision-tool.md)

## Video

No walkthrough video exists yet for this scenario. Placeholder — record a 30-60s screen capture of the demo (drag a weight slider → ranking reorders live) and link it here once available.

## CTA

Stop asking readers to trust a table they can't verify. Install Mini Sites for Confluence and publish a decision tool your stakeholders can actually weigh in on — right inside the doc where the decision gets made.

[Get Mini Sites on the Atlassian Marketplace →](https://marketplace.atlassian.com/apps/com.zenuml.confluence.minisite)

## SEO

**title**: Interactive Decision Tool on Confluence | Mini Sites

**meta description**: Replace a static comparison table with a live, weighted decision tool embedded right in your Confluence doc — readers set the weights, see the ranking.
