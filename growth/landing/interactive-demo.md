## Hero

# Interactive Demo on Confluence

If it runs in a browser, let it run where the discussion happens.

CTA: **Try Mini Sites**

## Problem

Every team already has interactive things — internal tools, UI demos, SDK demos, product
experiments, AI-generated mini apps — and none of them live where the conversation about them
happens. They live in a repo, a Vercel preview, a Figma prototype link, a local `npm run dev`
only the author can reach. Confluence gets the writeup. The thing itself never shows up.

## Demo

This is the entry page for the scenario family, not a single product demo. It links out to the
concrete, testable scenarios this batch shipped:

- [Interactive Prototype](interactive-prototype.md) — a clickable prototype embedded in a PRD
- [ROI Calculator](roi-calculator.md) — a formula readers can actually run
- [Interactive Architecture Diagram](interactive-diagram.md) — a diagram readers can interrogate
- [Product Configurator](product-configurator.md) — configuration options readers can explore
- [Interactive Decision Tool](decision-tool.md) — a weighted comparison readers can re-weight

Each has its own real demo mini-site under `growth/demos/`. This page's job is routing, not
proving — see `growth/README.md` for the North Star framing that ties them together.

## How it works

### 1. Create

Use AI or your preferred development tool to build something that runs in a browser.

### 2. Upload

Upload the website folder to Mini Sites.

### 3. Publish

Run it directly inside Confluence, on the page where people are already discussing it.

## Prompt

No single prompt fits "anything that runs in a browser" — see each scenario's own
`growth/prompts/*.md` for a prompt scoped to that use case.

## Video

No video exists for this entry page. `promo/out/final.mp4` (referenced from
`landing/interactive-prototype.md`) is the closest existing asset — it demonstrates the general
mechanism (build → upload → publish → live in Confluence) using the prototype scenario as the
concrete example.

## CTA

Install Mini Sites from the Atlassian Marketplace.

## SEO

- title: Interactive Demo on Confluence | Mini Sites
- meta description: Run your AI-built prototype, tool, or demo live inside Confluence — no screenshots, no external links. See 5 real scenarios.
