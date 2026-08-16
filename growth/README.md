# Growth experiments — scenario landing pages

North Star (from the strategy brief): don't ask "what HTML template could we build?" — ask "what
does a Confluence reader currently only get by screenshot, external link, or another tool?" Each
scenario below is a bet on one such gap. `One use case → one landing page → one demo → one
prompt → one video.`

Mini Sites is not "upload HTML to Confluence." It's making an otherwise-static Confluence page
run: a prototype someone can click, a calculator someone can feed real numbers, a diagram someone
can interrogate — inline, without leaving the page.

## Phase 1 experiments (this batch)

| Scenario | Demo | Landing | Prompt | LinkedIn | Hypothesis |
|---|---|---|---|---|---|
| Interactive Prototype | `demos/interactive-prototype/` | `landing/interactive-prototype.md` | `prompts/interactive-prototype.md` | `social/interactive-prototype-linkedin.md` | `hypotheses/interactive-prototype.md` |
| ROI Calculator | `demos/roi-calculator/` | `landing/roi-calculator.md` | `prompts/roi-calculator.md` | `social/roi-calculator-linkedin.md` | `hypotheses/roi-calculator.md` |
| Interactive Architecture Diagram | `demos/interactive-diagram/` | `landing/interactive-diagram.md` | `prompts/interactive-diagram.md` | `social/interactive-diagram-linkedin.md` | `hypotheses/interactive-diagram.md` |
| Product Configurator | `demos/product-configurator/` | `landing/product-configurator.md` | `prompts/product-configurator.md` | `social/product-configurator-linkedin.md` | `hypotheses/product-configurator.md` |

Deliberately **not** built this batch, per the strategy brief's screening criteria: Interactive
Database and Kanban/Task Management (Atlassian is actively closing these gaps — Confluence
Databases, Jira — don't compete with a platform investment), Polls and Forms (crowded Marketplace
categories, no differentiated angle yet).

## What's real vs. not, this batch

- **Real**: all 3 demo mini-sites are genuinely interactive (client-side state, verified by
  Playwright spot-check — vote/drag on the prototype, live recompute on the calculator, click-to-
  reveal on the diagram), all serve clean via a plain static file server, no build step, no
  external dependency.
- **Real**: a 35s video already exists for the Interactive Prototype scenario
  (`promo/out/final.mp4`), a genuine capture against `lite-dev.atlassian.net` — see
  `promo/README.md`. ROI Calculator and Interactive Diagram have no video yet (their landing
  pages say so explicitly).
- **Not real yet**: there is no marketing-site repo these landing pages are published to, no
  analytics wiring for "leading signal" instrumentation (landing views, prompt-copy clicks, demo
  interaction), and no Marketplace-listing changes. Every `hypotheses/*.md` names this gap
  explicitly rather than inventing a number.

## Phase 2 (not started)

Once any scenario gets real distribution, the highest-value data isn't page traffic — it's what
users who install actually upload. The strategy brief's taxonomy (Prototype / Calculator /
Dashboard / Diagram / Form / Internal tool / Other) needs an anonymized classification step on
publish; that's unbuilt. Track it as a follow-up, not part of this batch.
