# Hypothesis — Interactive Prototype on Confluence

## Hypothesis

We believe PMs, designers, and developers who already use AI tools (Claude, ChatGPT, v0, Lovable) to
build clickable prototypes are currently forced to degrade that prototype into a screenshot or an
external link when they document it in a PRD — because Confluence has no native way to embed a live,
interactive multi-file bundle. Mini Sites removes that degradation: the prototype runs live, inline, in
the page. We believe this specific scenario — "AI-built interactive prototype, published live" — is a
higher-intent entry point than our other scenarios because it targets a workflow (PRD review) that
already exists inside Confluence today, rather than asking users to invent a new use case from scratch.

## Leading signal

Signals we can measure now, before any product analytics are wired into the app itself:

- **Landing page views** on `growth/landing/interactive-prototype.md` once published as a real page —
  instrumented via whatever analytics the marketing site uses (e.g. a pageview event tagged with
  `scenario:interactive-prototype`, or UTM-tagged traffic in the referring channel's own analytics if the
  landing page lives outside our own domain).
- **Prompt-copy clicks** — instrument the "copy prompt" action on the prompt file's rendered page (once
  it's rendered as an actual page with a copy button) as a discrete click event; this is a strong signal
  of intent to actually try building something, not just reading.
- **Demo interaction rate** — once the demo HTML is embedded on a real landing page (not just linked),
  instrument `index.html`/`app.js` itself with lightweight client-side events (e.g. `postMessage` to the
  parent frame, or a simple analytics snippet added at embed time — NOT present in the checked-in
  self-contained bundle today) for: idea added, dot dragged, vote cast. A visitor who drags a dot or casts
  a vote is meaningfully more convinced than one who only scrolls past a static screenshot of it.
- **LinkedIn post engagement** — likes/comments/shares and click-through rate on the Marketplace CTA link,
  tracked via a UTM parameter (`utm_campaign=interactive-prototype`) on the CTA URL.

## Lagging signal

- **Marketplace installs attributable to this scenario** — installs arriving via the
  `utm_campaign=interactive-prototype` link (LinkedIn post, landing page CTA), or self-reported in an
  optional "how did you hear about us" install-time prompt if one exists.
- **What users actually upload, once shipped** — per the growth strategy doc's Phase 2 content taxonomy,
  we'd want to see uploaded-bundle classification skew toward "interactive prototype / clickable demo"
  rather than static dashboards or one-off tools, as evidence that the acquisition channel matches the
  actual usage pattern it promised. This requires the taxonomy classification work to exist first — it is
  not built yet.

## Kill criteria

- If the landing page draws traffic but prompt-copy clicks stay near zero (e.g. under 2% of visitors) after
  a reasonable sample size (order of a few hundred visits), the prompt itself is likely the friction point
  worth revisiting before concluding the scenario is dead — retest with a revised prompt before killing.
- If prompt-copy clicks are healthy but Marketplace installs attributable to this campaign stay flat over
  4-6 weeks of active promotion (LinkedIn + landing page live), that indicates the "build a prototype and
  publish it" workflow doesn't convert into actual product adoption, and this scenario should be deprioritized
  in favor of a different growth scenario.
- If uploaded-bundle classification (once available) shows installs from this channel are not actually
  uploading interactive prototypes — i.e., they installed for an unrelated reason — the messaging is
  attracting the wrong audience and the positioning, not just the channel, needs rework.
