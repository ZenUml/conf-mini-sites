# Script — Interactive Decision Tool on Confluence

**Status:** Canonical script draft. Not approved for capture, rendering, or publication.
**Target duration:** 45 seconds.
**Audience:** Authors and reviewers of vendor-selection and architecture-choice documents.
**Hook (0–5s):** “A bolded winner in a comparison table is still just an opinion if readers cannot change the weighting.”
**CTA:** “See Mini Sites on the Atlassian Marketplace and make the weighting visible in the decision document.”

## Source of truth and claim boundary

- Positioning: [`growth/README.md`](../README.md).
- Audience/problem/CTA: [`growth/landing/decision-tool.md`](../landing/decision-tool.md).
- Hypothesis: [`growth/hypotheses/decision-tool.md`](../hypotheses/decision-tool.md). The leading and lagging signals are future instrumentation, not evidence of adoption.
- Demo source: [`growth/demos/decision-tool/`](../demos/decision-tool/). It contains local illustrative Option A/B/C scores and four weights; it does not persist data, identify reviewers, or support collaborative consensus.

## Replayable demo sequence

1. Load `growth/demos/decision-tool/index.html`; show the four weights, the per-option score table, and ranking.
2. Raise **Impact** to **5** first.
3. Set **Cost**, **Risk**, and **Effort** to **0**, leaving Impact as the only non-zero criterion. The demo’s weighted ranking places **Option B — Vendor B** first because it has the highest Impact score (9).
4. Change one per-option numeric score, for example **Option A — Vendor A / Impact** from **6** to **10**, and show all weighted scores recompute. Do not claim a particular winner after this final edit unless the actual capture confirms it.

## Shot list

| Time | Narration | Visual action | Evidence claim | Recording environment | Masking / guardrail |
|---|---|---|---|---|---|
| 0:00–0:05 | “A bolded winner in a comparison table is still just an opinion if readers cannot change the weighting.” | Open on options, scores, weights, and ranking. | Frames the hypothesis’s trust problem; no claim that every decision table is untrusted. | Planning: local demo. Production: approved P-1 tenant only. | Use the demo’s illustrative Vendor A/B/C labels. |
| 0:05–0:12 | “Make the criteria visible: Cost, Impact, Risk, and Effort.” | Show the four weight sliders and the generated score table. | All four criteria and the editable per-option scores exist in the demo. | Same as above. | Do not imply reviewer identities, votes, or stored rationale. |
| 0:12–0:22 | “Make Impact the only priority for this pass.” | Raise Impact to 5, then set Cost, Risk, and Effort to 0. | The weights can be set independently from 0 to 5 and trigger recalculation. | Same as above. | Keep the transition ordered so the all-zero warning state is not presented as a recommendation. |
| 0:22–0:29 | “With those weights, Option B leads because its Impact score is nine.” | Hold on the ranking with Option B first and its weighted score. | The shipped score data makes B the first-ranked option under Impact-only weighting. | Same as above. | Say “in this illustrative demo,” not “the correct vendor.” |
| 0:29–0:37 | “Change a score, and the calculation is exposed rather than hidden behind a bold cell.” | Edit Option A’s Impact score from 6 to 10; show ranking and scores recompute. | Per-option number inputs update the model and invoke the same recalculation. | Same as above. | Do not promise audit trail, persistence, collaboration, or approval workflow. |
| 0:37–0:45 | “Let readers inspect the weighting where the decision is made. See Mini Sites on the Marketplace.” | Live tool to neutral end card. | Supported positioning only. | End card after video approval. | No claim of shared decision-making or price/installation outcome. |

## Recording gate before Owner Gate ①

Before capture, verify the exact multi-file folder through the real product upload → publish → inline-render path in the approved P-1 tenant. Confirm the captured UI preserves all score and slider interactions with no external-resource or console errors. This local demo is not evidence that the live product path has already been recorded.

## Owner confirmation points

- Approve the Impact-only example and explicit illustrative-vendor language.
- Confirm that no viewer might interpret the scenario as a real procurement recommendation.
- Approve this script before narration, capture planning, rendering, or publication.
