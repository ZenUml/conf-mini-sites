# Design partner program — interview guide + program proposal (WS3 deliverables)

> Companion to `04_design_partner_candidates.csv`. Authorization status of the entire workstream:
> **DISCOVERY ONLY — DO NOT CONTACT.** Nothing in this file has been sent to anyone.

## 1. 30-minute discovery interview guide

Method: [Mom Test](https://momtestbook.com/) discipline, consistent with the team's existing guide
(`docs/research/2026-06-27-mom-test-static-site-hosting.md`) — talk about their life, not the idea;
past specifics, not future hypotheticals; commitment in currency (time/reputation), not compliments.
The guide below adapts it to the candidate pool this research produced (people with a *known public
statement* about a relevant job), so it opens from their artifact, not from a cold screener.

### Opening (2 min)

- "I found your [post/review/video] about [specific job]. I'm researching how teams handle that kind of
  thing — not selling. Can I ask you about what was going on when you wrote it?"

### Trigger and job (8 min)

1. "What was happening right before you [posted/reviewed/built] that? What did you need to exist?"
2. "What exactly was the artifact — files, data, who made it?"
3. "Who needed to see or use it, and where do those people already work/read?"
4. "Walk me through what you actually did, step by step, from 'built' to 'people using it'."

### Workaround and friction (8 min)

5. "Where does it live today? How do people get to it?"
6. "How do you make sure only the right people see it?" *(access control pain must come from them —
   never lead with permissions.)*
7. "When it changed, what did updating it involve? Did anyone ever see a stale version?"
8. "What's the most annoying part of the whole flow — the thing you'd not miss?"

### Approval, security, value (7 min)

9. "Has your team ever tried a Marketplace app for this? What happened — who approved it, or what
   blocked it?"
10. "If an app hosted the files outside Atlassian (on an isolated CDN sandbox), what would your
    security folks say?" *(only after they raise apps/security themselves, else move on)*
11. "Have you spent time or money making this easier — scripts, templates, a paid tool, IT asks?"

### Product test + commitment (5 min)

12. "How often does this come up — how many of these have you stood up in the last quarter?"
13. If fit is real: "Would you try publishing one of your *actual* artifacts this week if I set you up
    with early access? Which one?" *(yes-with-an-artifact-and-date = signal; "send me a link" = polite
    no.)*
14. "Who else do you know who runs into this?" → ask for the intro.

**Never ask:** "Would you use a tool that…?", "How much would you pay?", "Don't you hate…?" — every
form of these manufactures false positives (see the Mom Test traps table in the 2026-06-27 guide).

## 2. Design partner program proposal

| Element | Proposal |
|---|---|
| Size | 5–8 active partners at any time, drawn from wave 1 (8–10 invited, expect ~50–70% acceptance decay) |
| Entry criteria | A real, current artifact to publish; a recurring need (≥1 publish/update per month); an install-approval path they can describe; explicitly no direct competitors |
| Cadence | 20-min problem interview → guided first publish (their artifact, not a demo) → async check-in at 2 weeks → 30-min retro at 6 weeks |
| Feedback artifacts | Publish-flow session notes; a "what broke" log per partner; one JTBD card update per partner per cycle; permission/security objections recorded verbatim |
| Response expectations | We answer within 2 business days; partners are told upfront their feedback is advisory, not a roadmap commitment |
| Early-access boundaries | Partners get pre-release features behind their own install only; no production data commitments; no SLA; clearly labeled beta |
| Confidentiality | We do not publish partner names/artifacts without written OK; partners are asked not to share pre-release builds; no NDA required for the discovery interview (public-context conversation) |
| Success criteria (per partner) | Published ≥2 real bundles; ≥1 update cycle completed; would-renew answer captured; one referral asked |
| Exit criteria | Partner inactive 6 weeks → thank + archive; needs are dominated by unsupported capabilities (host-page DOM, authenticated external APIs, write-back) → document as negative evidence and release them |
| Program success | ≥3 partners complete two publish cycles and state a price they would accept (echoes gate G2 in `validation/G2-demand-validation.md`: 3 prospects beyond the anchor team) |

## 3. Outreach principles (pre-approved template lives in the brief)

The outreach template in the source brief (§8, "Draft outreach template — do not send") is the approved
baseline. Personalization rules:

- One hook per candidate, drawn from their own public statement (the `personalized_hook` column in
  `04_design_partner_candidates.csv`); never quote sensitive or personal material back at them.
- One neutral ask: 20-minute conversation OR artifact walkthrough — not a demo pitch.
- No mass-mail: candidates are contacted individually, only after explicit approval of the wave.
