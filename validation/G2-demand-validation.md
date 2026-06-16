# G2 — Demand-to-pay validation kit (≥3 prospects beyond the anchor team)

**What G2 actually asks:** is there demand beyond the n=1 anchor team — **≥3 prospects**, each with a *real*
existing need, a *named approver*, a *concrete commitment*, **and** whose security would accept the
external-processor architecture (so it ties back to G1)? Demand from a prospect whose security would veto the
external host **does not count** — it's a Cloudflare build with no buyer.

This one you can *choose* to partially front-run on conviction (it's your bet). But the validation is cheap, so
here's the kit to do it in parallel with G1.

---

## Qualifying rubric — a prospect "counts" only if ALL hold

| # | Criterion | Counts only if… |
|---|-----------|-----------------|
| 1 | **Real existing artifact** | they already have a multi-file mini-site (prototype/dashboard/tool) they want embedded — not a hypothetical |
| 2 | **Failed alternative** | they tried something (single-file HTML macro, screenshots, an external link, Forge Custom UI) and it fell short |
| 3 | **Recurring need** | they'd publish/update **repeatedly**, not once |
| 4 | **Named approver** | a specific person who can approve install + the **external-processor architecture** (= G1 for *their* org) |
| 5 | **Concrete commitment** | paid pilot / LOI / signed install-approval / "yes at $X/mo" — not "cool idea" |

3 prospects clearing all 5 (the anchor team excluded) = G2 green.

## Cheapest ways to generate the conversations (no build required first)

1. **Warm intros from the anchor team** — "who else have you seen want to embed an interactive thing on a
   page?" Their network is the highest-signal source.
2. **Fake-door landing page** — a one-pager describing the product + a "request early access" form; measure
   intent. (I can build this from the existing handbook design system + the upload-UI prototype — say the
   word and it's done.)
3. **Loom demo of the prototype** (`design/upload-ui/final.html`) → send to 8–10 target teams → "would you pay
   $X/mo for this on your space?"

## Outreach message (short, send-as-is)

> Subject: embedding interactive mini-sites on Confluence pages — would this help your team?
>
> Hi <name> — we're building a Confluence app that lets you drop a full **multi-file interactive page**
> (clickable prototype, filterable dashboard, troubleshooting tool) live onto a Confluence page — not a
> screenshot or a single static file. I saw <signal that they have this need>. Do you have something like that
> today, and how are you sharing it now? 15 min to show you a prototype?

## Discovery-call script (the questions that separate "nice" from "demand-to-pay")

1. "Show me the last interactive thing you wanted to put on a page. How did you end up sharing it?" → **(1) artifact + (2) failed alternative**
2. "How often would you publish/update something like this?" → **(3) recurring**
3. "If this existed, who signs off on installing a new app — and on it storing the bundle on an external host (Cloudflare)?" → **(4) named approver + the G1 question for their org**
4. "What would it be worth to you per month? Would you join a paid pilot?" → **(5) commitment**
5. "Anything about the data leaving Atlassian that would block it for you?" → **the G1-coupling: disqualifies non-starters early**

Log each prospect against the 5-criterion rubric; stop at 3 clean yeses (or learn it's not there — which is
itself the cheapest possible answer before a multi-week build).

---

**The irreducibly-human part:** the intros, calls, and asks — those are yours. The collateral above (rubric,
outreach, script, and the offer of a fake-door page) is the push. Tell me to build the landing page and I'll
do it now from the existing design system.
