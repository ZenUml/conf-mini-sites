# Hypothesis: Product Configurator on Confluence

## Hypothesis

Solution architects and sales engineers currently express "region × plan × user-count × storage × integration" answers as a static wall of bullet lists or tables, which readers have to search through to find their own case and which drift out of date as the product changes. If we show prospects a concrete example — an embedded, live-recomputing product configurator on the page — a meaningful fraction will recognize the same maintenance burden in their own solution docs and install Mini Sites to build one. The scenario is a wedge: it targets a specific, recognizable authoring pain (a combinatorial bullet-list wall that can't compute anything) rather than a generic "interactive content" pitch.

## Leading signal

- **Landing page views** — page views on `growth/landing/product-configurator.md` (once published as a real hosted page) attributed via a dedicated UTM parameter (e.g. `utm_content=product-configurator`) on every link driving to it (LinkedIn post, marketplace listing "use cases" section, any paid placement). Instrumented with standard pageview analytics (e.g. Plausible/GA/Mixpanel `page_viewed` event scoped to this URL path) once the landing copy is hosted. No instrumentation exists yet — the page is currently a markdown file in this repo, not a hosted page.
- **Prompt-copy clicks** — a click/copy event fired from a "Copy prompt" button wrapping the code block in `growth/prompts/product-configurator.md` once that page is hosted with interactive chrome (plain markdown in the repo has no such affordance yet). Track as a discrete event, e.g. `prompt_copied` with `scenario: product-configurator`.
- **Demo interaction rate** — of visitors who load `growth/demos/product-configurator/index.html`, what fraction change at least two of the five inputs away from their defaults (region, users, plan, storage, or any integration checkbox). Instrumented via `input`/`change` event listeners already wired to every control in `app.js` for the live recalculation, extended with a single deduped `demo_interacted` event per session — currently absent by design (self-contained, no network deps) and would need to be added before this can be measured on a hosted copy.

## Lagging signal

- **Marketplace installs attributable to this scenario** — installs where the referring session's first touch carries `utm_content=product-configurator` (or equivalent last-non-direct-click attribution), measured against total installs in the same window as a share, not an absolute count, since baseline install volume is low.
- **Configurator-shaped uploads** — once Mini Sites ships upload-content classification (per the growth strategy doc's Phase 2 taxonomy), what fraction of new mini-site uploads classify as "configurator" or "sizing/pricing tool" shaped, among tenants that arrived via this scenario's funnel versus tenants that arrived via other scenarios. This signal does not exist yet — it depends on the Phase 2 classifier shipping first.

## Kill criteria

- Landing page draws negligible traffic (fewer than ~20 sessions) after being live and linked from at least one real distribution channel (LinkedIn post + marketplace listing) for 2 weeks — the wedge isn't reaching anyone, regardless of content quality.
- Landing page draws traffic but demo interaction rate stays below 10% of visitors who load it — the configurator itself isn't compelling enough to prompt engagement, meaning the format (not just the channel) needs rework.
- Traffic and interaction are both healthy but zero attributable installs after 4 weeks — the scenario generates interest but doesn't convert to product adoption, meaning the CTA or onboarding friction (not the scenario) is the blocker to fix next.
