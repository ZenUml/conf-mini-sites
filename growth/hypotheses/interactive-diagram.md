# Hypothesis: Interactive Architecture Diagram on Confluence

## Hypothesis

Architects and developers who currently ship a static architecture diagram (PNG/JPG export from
draw.io, Lucidchart, Excalidraw, etc.) on a Confluence page will install and use Mini Sites to make
that diagram clickable — because a static image forces every "who owns this / what protocol / what
depends on this / what's the risk" question into a side channel (Slack, a separate wiki page, tribal
knowledge), and an inline detail panel answers it on the spot without leaving the page.

## Leading signal

Instrument the following before or immediately after this scenario's landing page and demo go live:

- **Landing page views** — `growth/landing/interactive-diagram.md` content, once published as a real
  page, tracked via a page-view event scoped to that URL/slug (`scenario=interactive-diagram`).
- **Prompt-copy clicks** — a click/copy event on the "copy prompt" action wherever
  `growth/prompts/interactive-diagram.md` is surfaced (landing page CTA, docs site). This is the
  strongest early-funnel signal because it's the moment someone commits to trying the pattern.
- **Demo interaction rate** — within `growth/demos/interactive-diagram/index.html`, fire a client-side
  event on first node/edge click per session (e.g. `demo_diagram_node_click`), and compute
  interaction rate = sessions with ≥1 click / sessions that loaded the demo. A high load count with a
  low click rate means the demo isn't visually signaling "this is clickable."

None of these three exist yet — they require adding lightweight event firing (or, at minimum, log-based
page-view/referrer tracking) to wherever this content gets hosted; this doc does not assume that
instrumentation is already in place.

## Lagging signal

- **Marketplace installs attributable to this scenario** — track via install-time referrer/UTM param on
  the Marketplace CTA link in the landing page, cross-referenced against the `forge-installs` skill's
  install snapshots to see if new installs cluster in the days following any promotion of this scenario
  (LinkedIn post, landing page share).
- **Fraction of uploads that are diagram-shaped** — once shipped, classify uploaded bundles against the
  Phase 2 content taxonomy in the growth strategy doc and measure what fraction fall into the
  "architecture/diagram" category, as a proxy for whether this specific pitch is what's driving usage
  versus other scenarios (dashboards, prototypes, tools).

## Kill criteria

- Landing page views exceed 200 in the first two weeks after promotion but prompt-copy clicks stay
  below 2% of viewers — the pitch attracts attention but the "build one yourself" path doesn't convert;
  revisit whether the prompt is too technical or the demo undersells the effort required.
- Demo interaction rate stays below 15% after the first 100 sessions — the interactivity isn't
  discoverable, and the fix is a UX problem (affordance, hover states, an explicit "click me" hint),
  not a positioning problem, so don't kill the scenario on this signal alone without first trying an
  affordance fix.
- Zero attributable Marketplace installs after 4 weeks of active promotion (landing page + LinkedIn +
  at least one direct outreach channel) — the scenario doesn't convert intent into installs; deprioritize
  in favor of a different Phase 1 scenario rather than continuing to invest in this pitch.
