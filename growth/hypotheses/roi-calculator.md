# Hypothesis: ROI Calculator on Confluence

## Hypothesis

Teams writing Cloud Migration Proposals or other business-case documents currently express ROI math as static prose or a linked spreadsheet, which readers rarely open or interact with. If we show prospects a concrete example — an embedded, live-recalculating ROI calculator on the page — a meaningful fraction will recognize the same pattern in their own docs and install Mini Sites to build one. The scenario is a wedge: it targets a specific, recognizable authoring pain (buried formula, dead spreadsheet link) rather than a generic "interactive content" pitch.

## Leading signal

- **Landing page views** — page views on `growth/landing/roi-calculator.md` (once published as a real hosted page) attributed via a dedicated UTM parameter (e.g. `utm_content=roi-calculator`) on every link driving to it (LinkedIn post, marketplace listing "use cases" section, any paid placement). Instrumented with standard pageview analytics (e.g. Plausible/GA/Mixpanel `page_viewed` event scoped to this URL path) once the landing copy is hosted.
- **Prompt-copy clicks** — a click/copy event fired from a "Copy prompt" button wrapping the code block in `growth/prompts/roi-calculator.md` once that page is hosted with interactive chrome (plain markdown in the repo has no such affordance yet; this requires the page to be rendered through whatever site host serves `growth/landing/`). Track as a discrete event, e.g. `prompt_copied` with `scenario: roi-calculator`.
- **Demo interaction rate** — of visitors who load `growth/demos/roi-calculator/index.html`, what fraction change at least one input away from its default. Instrumented via a lightweight `input` event listener on the three fields firing a single `demo_interacted` event (deduped per session) — currently absent from `calculator.js` and would need to be added before this can be measured on a hosted copy; the local file as shipped has no analytics calls by design (self-contained, no network deps).

## Lagging signal

- **Marketplace installs attributable to this scenario** — installs where the referring session's first touch carries `utm_content=roi-calculator` (or equivalent last-non-direct-click attribution), measured against total installs in the same window as a share, not an absolute count, since baseline install volume is low.
- **Calculator-shaped uploads** — once Mini Sites ships upload-content classification (per the growth strategy doc's Phase 2 taxonomy), what fraction of new mini-site uploads classify as "calculator" or "ROI/business-case tool" shaped, among tenants that arrived via this scenario's funnel versus tenants that arrived via other scenarios. This signal does not exist yet — it depends on the Phase 2 classifier shipping first.

## Kill criteria

- Landing page draws negligible traffic (fewer than ~20 sessions) after being live and linked from at least one real distribution channel (LinkedIn post + marketplace listing) for 2 weeks — the wedge isn't reaching anyone, regardless of content quality.
- Landing page draws traffic but demo interaction rate stays below 10% of visitors who load it — the calculator itself isn't compelling enough to prompt engagement, meaning the format (not just the channel) needs rework.
- Traffic and interaction are both healthy but zero attributable installs after 4 weeks — the scenario generates interest but doesn't convert to product adoption, meaning the CTA or onboarding friction (not the scenario) is the blocker to fix next.
