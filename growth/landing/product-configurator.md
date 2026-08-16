## Hero

Stop explaining every configuration. Let people explore it themselves.

Your solution-architecture or sales-engineering docs already answer "if you pick region X + plan Y + N users, here's what you get" — just as a wall of bullet lists, one per combination. Embed a live Product Configurator directly on the Confluence page instead: readers pick region, plan, user count, storage, and integrations, and the recommended architecture, estimated cost, and feature availability update instantly, in front of them.

## Problem

Solution architects and sales engineers maintain the same answer over and over: a matrix of region × plan × user-count × storage × integration combinations, each written out as its own bullet list or table row because a static doc can't compute anything. Every new combination a prospect asks about means another paragraph to write, another row to keep in sync, another chance for the doc to drift out of date with what the product actually offers. Readers, meanwhile, have to find the row that matches their situation in a list built for every situation — or just ask you directly, which is the conversation the doc was supposed to prevent.

## Demo

Try the working configurator: [`growth/demos/product-configurator/index.html`](../demos/product-configurator/index.html)

Change the region, drag the users slider, switch plan tier or storage, toggle an integration — the recommended architecture, estimated monthly cost, and feature availability list all recompute live, with no page reload and no separate spreadsheet.

## How it works

1. **Create** — Build (or generate, see the Prompt section) a small self-contained HTML/CSS/JS bundle like the one in the demo above.
2. **Upload** — Add the bundle's files to the Mini Sites macro on your Confluence page.
3. **Publish** — The macro serves the bundle live, inline, on the page — readers configure it right where the solution doc lives.

## Prompt

Want to generate your own configurator (or adapt this one to your product's plans, regions, and features)? See the prompt file: [`growth/prompts/product-configurator.md`](../prompts/product-configurator.md)

## Video

No walkthrough video exists yet for this scenario. Placeholder — record a 30-60s screen capture of the demo (adjusting inputs → architecture/cost/features updating live) and link it here once available.

## CTA

Stop maintaining a bullet list per configuration. Install Mini Sites for Confluence and publish a configurator your prospects and reviewers can actually explore — right inside the solution doc they're already reading.

[Get Mini Sites on the Atlassian Marketplace →](https://marketplace.atlassian.com/apps/com.zenuml.confluence.minisite)

## SEO

**title**: Product Configurator on Confluence | Mini Sites

**meta description**: Embed a live product configurator in your Confluence solution docs — readers pick options, architecture and cost update instantly.
