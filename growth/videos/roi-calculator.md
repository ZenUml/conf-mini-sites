# Script — ROI Calculator on Confluence

**Status:** Canonical script draft. Not approved for capture, rendering, or publication.
**Target duration:** 40 seconds.
**Audience:** Authors and reviewers of cloud-migration business cases.
**Hook (0–5s):** “If the ROI lives in a spreadsheet link, most readers never test the assumptions.”
**CTA:** “See Mini Sites on the Atlassian Marketplace and make the calculation runnable on the proposal page.”

## Source of truth and claim boundary

- Positioning: [`growth/README.md`](../README.md).
- Audience/problem/CTA: [`growth/landing/roi-calculator.md`](../landing/roi-calculator.md).
- Hypothesis: [`growth/hypotheses/roi-calculator.md`](../hypotheses/roi-calculator.md). No landing traffic, interaction rate, or attributed installs have been observed; all named signals remain future instrumentation.
- Demo source: [`growth/demos/roi-calculator/`](../demos/roi-calculator/).

**Important implementation truth:** the present calculation uses **migration cost** and **expected annual savings** for payback and three-year ROI. `currentCost` is displayed and editable but is not used by `recalculate()`. It may appear as proposal context, but it must not be changed in a shot that claims it changed the result.

## Replayable demo sequence

1. Load `growth/demos/roi-calculator/index.html`; show the three line items and the output panel.
2. Leave current infrastructure cost visible as context.
3. Change migration cost from **150,000** to **240,000** and expected annual savings from **180,000** to **300,000** using the number inputs or paired sliders.
4. Hold on the computed outputs: **10 months** payback, **$300,000** annual savings, and **+275%** three-year ROI, plus the explanatory footnote.

## Shot list

| Time | Narration | Visual action | Evidence claim | Recording environment | Masking / guardrail |
|---|---|---|---|---|---|
| 0:00–0:05 | “If the ROI lives in a spreadsheet link, most readers never test the assumptions.” | Show a proposal-style heading and the calculator’s input/output layout. | Frames the landing-page problem; does not claim a measured reader behavior. | Planning: local demo. Production: approved P-1 tenant only. | Use generic migration figures only. |
| 0:05–0:11 | “Put the assumptions on the same page: current context, migration cost, and annual savings.” | Show all three line items; do not edit current infrastructure cost. | The three displayed inputs exist in the demo. | Same as above. | Do not say current cost feeds the current formula. |
| 0:11–0:20 | “Raise the one-time migration cost to two-forty.” | Enter **240000** for Migration cost. | The cost input is linked to its slider and triggers recalculation. | Same as above. | No customer pricing or financial advice. |
| 0:20–0:28 | “Set expected annual savings to three-hundred.” | Enter **300000** for Expected annual savings. | This input updates annual-savings output, payback, ROI, and footnote. | Same as above. | Keep a visible “illustrative” label in the recording setup. |
| 0:28–0:35 | “The same assumptions now show ten months, three-hundred-thousand in annual savings, and a two-hundred-seventy-five percent three-year ROI.” | Hold on **10 months**, **$300,000**, **+275%**, and the footnote. | These values follow from the shipped formula: 240,000 ÷ 300,000; (3×300,000 − 240,000) ÷ 240,000. | Same as above. | Narrate as this demo’s calculation, not a promised business outcome. |
| 0:35–0:40 | “Make the calculation runnable where the proposal is reviewed. See Mini Sites on the Marketplace.” | Live output to neutral end card. | Supported positioning only. | End card after video approval. | No claim that spreadsheet links are universally unused. |

## Recording gate before Owner Gate ①

Before product capture, verify the exact multi-file calculator bundle through the real upload → publish → Confluence render path in an approved P-1 tenant. The existing local demo contains external Google Fonts references; the recordable fixture must be checked against the product’s outbound-resource policy before capture. This script does not authorize a workaround or a CDN claim.

## Owner confirmation points

- Approve the illustrative figures and their financial-disclaimer treatment.
- Decide whether to remove or replace external-font dependencies in the recording fixture if policy validation rejects them.
- Approve the script before narration, capture planning, rendering, or publication.
