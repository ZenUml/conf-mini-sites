# Script — Product Configurator on Confluence

**Status:** Canonical script draft. Not approved for capture, rendering, or publication.
**Target duration:** 45 seconds.
**Audience:** Solution architects and sales engineers maintaining combination-heavy solution documentation.
**Hook (0–5s):** “A table cannot answer every region, plan, and user-count question without another row.”
**CTA:** “See Mini Sites on the Atlassian Marketplace and let readers explore the configuration in the solution document.”

## Source of truth and claim boundary

- Positioning: [`growth/README.md`](../README.md).
- Audience/problem/CTA: [`growth/landing/product-configurator.md`](../landing/product-configurator.md).
- Hypothesis: [`growth/hypotheses/product-configurator.md`](../hypotheses/product-configurator.md). No traffic, interaction, or install result has been observed; these remain planned measures.
- Demo source: [`growth/demos/product-configurator/`](../demos/product-configurator/). Values are illustrative demo outputs, not Mini Sites pricing, a commercial quote, or an architecture recommendation for a real customer.

## Replayable demo sequence

1. Load `growth/demos/product-configurator/index.html`; show the default inputs and Live summary.
2. Set **Deployment region** to **European Union**, move **Users** to **300**, choose **Enterprise**, choose **Unlimited (metered)** storage, and enable **Data residency controls**.
3. Hold on the new Recommended architecture, Estimated cost, and Feature availability list.
4. Read only the category-level change: the demo has recomputed all three output areas from the selected inputs. Do not narrate its dollar figure as a quote.

## Shot list

| Time | Narration | Visual action | Evidence claim | Recording environment | Masking / guardrail |
|---|---|---|---|---|---|
| 0:00–0:05 | “A table cannot answer every region, plan, and user-count question without another row.” | Open on input controls alongside the live-summary panel. | Frames the combination-heavy documentation problem; no claim about a particular customer. | Planning: local demo. Production: approved P-1 tenant only. | Use illustrative labels and values only. |
| 0:05–0:13 | “This page lets the reader set the region, users, plan, storage, and integrations.” | Briefly show all five input groups. | These five input categories exist in the demo. | Same as above. | Avoid calling this a quotation or a live product catalogue. |
| 0:13–0:23 | “Set Europe, three hundred users, Enterprise, and unlimited storage.” | Change region, users, plan, and storage in that order. | Input and change events invoke the implementation’s recalculation. | Same as above. | Do not disclose a real prospect, region commitment, or commercial terms. |
| 0:23–0:30 | “Turn on data residency controls for the configuration that needs them.” | Enable **Data residency controls** after Enterprise is selected. | The option becomes active for Enterprise and contributes to the demo architecture/output path. | Same as above. | State “illustrative configuration,” never “recommended for your company.” |
| 0:30–0:38 | “The architecture, estimate, and feature availability all recompute in the same view.” | Hold on the three output blocks and the explanatory footnote. | `recalculate()` updates architecture text, estimated cost, feature list, and footnote. | Same as above. | Do not read the numeric estimate as Mini Sites price or a binding quote. |
| 0:38–0:45 | “Replace a wall of combinations with a page people can explore. See Mini Sites on the Marketplace.” | Live output to neutral end card. | Supported positioning only. | End card after video approval. | No unverified analytics, conversion, or persistence claims. |

## Recording gate before Owner Gate ①

Validate the exact configurator folder against the product’s bundle, secret-scan, CSP, and relative-asset rules, then record only the real upload → publish → inline-render journey in the approved P-1 tenant. The demo currently uses external Google Fonts, so the recording fixture needs compatibility confirmation; do not alter the visual story to hide a failed network policy.

## Owner confirmation points

- Approve the illustrative configuration and explicit non-quote treatment.
- Confirm that the data-residency wording is suitable for external video.
- Approve this script before narration, capture planning, rendering, or publication.
