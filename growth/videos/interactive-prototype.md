# Script — Interactive Prototype on Confluence

**Status:** Canonical script draft. Not approved for capture, rendering, or publication.
**Target duration:** 45 seconds.
**Audience:** PMs, designers, and developers reviewing an AI-built prototype in a PRD.
**Hook (0–5s):** “A screenshot cannot answer: what happens when I click it?”
**CTA:** “See Mini Sites on the Atlassian Marketplace, then bring one self-contained prototype folder to the page where the review happens.”

## Source of truth and claim boundary

- Positioning: [`growth/README.md`](../README.md): Mini Sites lets an otherwise-static Confluence page run an interactive prototype inline, without leaving the page.
- Audience/problem/CTA: [`growth/landing/interactive-prototype.md`](../landing/interactive-prototype.md).
- Hypothesis: [`growth/hypotheses/interactive-prototype.md`](../hypotheses/interactive-prototype.md). Its landing, prompt, interaction, and install signals are proposed measurements, not results; do not narrate them as observed demand.
- Demo source: [`growth/demos/interactive-prototype/`](../demos/interactive-prototype/). The script only names the implemented add, drag, vote, and ranked-list behavior.

## Replayable demo sequence

1. Load `growth/demos/interactive-prototype/index.html`; show the existing Impact-vs.-Effort board and ranked list.
2. Type **“Research repository”** in the idea field, set Impact to **6** and Effort to **6**, then select **Add idea**. The new item appears on the matrix and in the list.
3. Drag the new dot toward the high-impact / low-effort quadrant until it reads **Impact 8 / Effort 2**; release it and show the quadrant update.
4. Select that item’s **▲ vote** control once. Show the count increase and the list re-rank by votes, then score.

## Shot list

| Time | Narration | Visual action | Evidence claim | Recording environment | Masking / guardrail |
|---|---|---|---|---|---|
| 0:00–0:05 | “A screenshot cannot answer: what happens when I click it?” | Open on a static-looking PRD section, then cut to the live board. | Contrasts a static artifact with the real interactive demo; it does not claim a Confluence capture yet. | Planning: local demo. Production: approved P-1 tenant only. | No real page tree, account control, tenant name, or customer content. |
| 0:05–0:11 | “This feature-prioritisation prototype runs: ideas, scores, a board, and a ranked list.” | Show the existing five seeded ideas, matrix quadrants, and ranking panel. | These elements exist in the checked-in demo. | Same as above. | Do not say the ideas are customer roadmap data. |
| 0:11–0:19 | “Add the next idea, give it impact and effort, and it becomes part of the review.” | Type **Research repository**, set 6 / 6, click **Add idea**. | `addIdea()` appends an item and renders both board and list. | Same as above. | Keep the input text generic; no internal roadmap names. |
| 0:19–0:28 | “Drag it to reflect the team’s judgment.” | Drag the new dot until it reads **Impact 8 / Effort 2** in the Quick win area, then release. | The demo updates the item’s Impact/Effort, dot position, quadrant, and rank metadata. | Same as above. | Do not claim collaborative editing, persistence, or real-time sync. |
| 0:28–0:35 | “Then vote. The list sorts by votes, with the score as the tie-breaker.” | Click **▲ vote** once and hold on the updated count/list. | The vote button increments the item count and re-renders the ranked list. | Same as above. | Do not imply consensus, identity, or stored votes. |
| 0:35–0:45 | “Instead of explaining a prototype in another tab, let the page run it where the PRD is discussed. See Mini Sites on the Marketplace.” | Freeze only on the live demo result, then a neutral end card. | Restates the supported positioning; it does not assert a completed upload/publish journey. | End card only after production-video approval. | No Atlassian logo asset; no price, timing, or unverified product promise. |

## Recording gate before Owner Gate ①

The source demo is locally runnable, but a public-product claim requires a recordable, verified path through the exact self-contained folder: select/upload → publish → rendered Mini Site on an approved production recording tenant. P-1 provisioning and capture are not authorized by this script. Re-check that the selected product path supports this multi-file folder and that all relative assets load locally before capture.

## Owner confirmation points

- Approve the 45-second argument and CTA wording before any formal narration or capture planning.
- Confirm the neutral recording page and masking plan once P-1 is separately provisioned.
- If the actual publish/render behavior differs from this script, revise and re-approve rather than editing around the discrepancy.
