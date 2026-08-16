# Script — Interactive Architecture Diagram on Confluence

**Status:** Canonical script draft. Not approved for capture, rendering, or publication.
**Target duration:** 45 seconds.
**Audience:** Architects and developers whose Confluence pages currently contain static diagrams.
**Hook (0–5s):** “A diagram with boxes and arrows still leaves the important questions somewhere else.”
**CTA:** “See Mini Sites on the Atlassian Marketplace and let the architecture page answer questions in place.”

## Source of truth and claim boundary

- Positioning: [`growth/README.md`](../README.md).
- Audience/problem/CTA: [`growth/landing/interactive-diagram.md`](../landing/interactive-diagram.md).
- Hypothesis: [`growth/hypotheses/interactive-diagram.md`](../hypotheses/interactive-diagram.md). Click-rate, prompt-copy, and install signals are instrumentation proposals, not collected results.
- Demo source and labels: [`growth/demos/interactive-diagram/`](../demos/interactive-diagram/). The script uses only clickable nodes and data-flow edges implemented in the SVG and `app.js`.

## Replayable demo sequence

1. Load `growth/demos/interactive-diagram/index.html`; show the diagram and closed detail panel.
2. Click **Control Worker**. The inline panel shows title, owner, API/protocol, dependencies, and risk.
3. Click the **Dispatch Worker → ms-<instanceId>** data-flow edge. The inline panel changes to that edge’s data-flow details.
4. Return to the diagram overview with the current selection visible; do not navigate to another page or service.

## Shot list

| Time | Narration | Visual action | Evidence claim | Recording environment | Masking / guardrail |
|---|---|---|---|---|---|
| 0:00–0:05 | “A diagram with boxes and arrows still leaves the important questions somewhere else.” | Open on the complete diagram before selection. | Frames the static-diagram problem from the landing/hypothesis; not a measured support-ticket claim. | Planning: local demo. Production: approved P-1 tenant only. | Use the generic demo architecture, never a customer diagram. |
| 0:05–0:12 | “Make the diagram itself the place to inspect the system.” | Pan only across the visible nodes and edges; show the in-page detail area. | The SVG and inline detail panel are real local UI. | Same as above. | No tenant URL, employee identity, or live secret. |
| 0:12–0:22 | “Select Control Worker for its owner, protocol, dependencies, and risk context.” | Click **Control Worker**; scroll only enough to show those labelled fields. | The selected-node handler renders that node’s defined detail payload. | Same as above. | Do not read out HMAC keys or imply a security guarantee beyond the visible demo. |
| 0:22–0:32 | “Then select the path from Dispatch Worker to the per-instance worker.” | Click the **Dispatch Worker → ms-<instanceId>** edge hit area; show the changed panel. | `selectEdge('dispatch-instance')` renders the edge’s defined protocol/dependency/risk content. | Same as above. | Keep `ms-<instanceId>` as generic notation; never show a live instance ID or signed URL. |
| 0:32–0:39 | “The reader stays in the page, but can ask a more useful question of every box and arrow.” | Return to the full diagram with one selection highlighted. | The selection state and panel update happen inline; no page navigation is used. | Same as above. | Do not claim source-of-truth sync, real-time updates, or permissions beyond the recording environment. |
| 0:39–0:45 | “Turn the architecture page into something people can interrogate. See Mini Sites on the Marketplace.” | Neutral end card after the live panel state. | Supported positioning only. | End card after video approval. | No Atlassian brand asset or unverified capability claim. |

## Recording gate before Owner Gate ①

The demo’s detail text deliberately includes product-internal architecture and risk descriptions. Before capture, review each visible panel against the current approved disclosure level, use an approved generic fixture, and verify upload → publish → inline render with the exact folder. The script cannot substitute a static reconstruction if that path fails.

## Owner confirmation points

- Approve the selected node/edge and the extent of security-detail disclosure.
- Confirm the generic architecture fixture is acceptable for an external video.
- Approve the script before formal narration, capture planning, rendering, or publication.
