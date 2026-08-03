# T13 admin/buyer and price interview script — draft only

**Prepared:** 2026-08-03

**Status:** Preparation unlocked / Interviews contact-blocked

**Authorization boundary:** Do not recruit, send, contact, register, log in, offer discounts, or make pricing commitments. This script remains local until the Owner separately authorizes named participants and channels.

## Research objective

Public Marketplace prices show supply-side pressure, not willingness to pay:

- Mini Sites: USD 1,010 annually for 51–100 users at the 2026-08-02 capture (E126).
- Narva HTML Macro: USD 400 annually for the same band at the capture (E127).
- OST and Yamuno: free alternatives (E124, E125).

T13 must establish:

1. What outcome and current cost a buyer compares with Mini Sites.
2. Who approves an app and which security/procurement steps apply.
3. Whether any differentiated outcome could justify a paid threshold above free or lower-priced macros.
4. Whether the respondent is a creator/champion, administrator, budget owner, or only an observer.

The completion gate remains five comparison discussions, at least two credible paid thresholds, and a named approval or procurement path. A numerical answer without a real workflow, budget context, and decision role is not a credible threshold.

## Participant screener

Use before scheduling a future authorized interview:

1. Have you installed, approved, purchased, or requested a Confluence Cloud app in the last 24 months?
2. Do you create or support HTML reports, prototypes, training tools, generated documentation, or similar browser-native artifacts?
3. Who would use the artifact and how often would it be updated?
4. Are you involved in security review, Marketplace approval, procurement, or budget decisions?

Preferred mix across five interviews:

- two Confluence admins or app approvers;
- two creator/champions with a recurring compatible artifact;
- one budget/procurement owner or managed-services owner;
- at least two respondents who have compared a paid app with a free macro or external host.

Do not count a respondent with no recent workflow and no role in the decision as a price interview; record it as exploratory context.

## Interview structure — 30 to 35 minutes

| Minutes | Section | Purpose |
|---:|---|---|
| 0–3 | Permission and role | Establish scope, recording/notes permission, and decision role |
| 3–10 | Last real workflow | Ground the discussion in a recent artifact and workaround |
| 10–16 | Cost and value | Identify time, tools, risk, audience, and recurrence before mentioning price |
| 16–22 | Approval path | Map admin, security, Marketplace, procurement, and budget owner |
| 22–29 | Concept and price | Test comparison set and thresholds without leading with current Mini Sites price |
| 29–33 | Benchmark reaction | Only now disclose public alternatives/prices and test what would justify a difference |
| 33–35 | Close | Capture next evidence, counterevidence, and any permitted follow-up |

## Moderator opening

> Thank you for speaking with me. I am researching how teams place self-contained interactive work artifacts—such as generated reports, prototypes, or local-only tools—inside Confluence. This is not a sales call, and I will not ask you to buy or install anything today.
>
> I would like to understand a recent workflow, how app approval works in your organization, and how you compare costs. Please avoid confidential customer data, credentials, or proprietary source code. May I take notes? [Ask separately before recording, if recording is ever approved.]

## Section A — role and last real workflow

1. What is your role in creating, approving, buying, or supporting Confluence apps?
2. Tell me about the most recent time your team needed to share an interactive HTML report, prototype, generated documentation site, or small tool.
3. What triggered the work? Who requested it?
4. What artifact actually existed at publish time: one HTML file, a folder, a URL, unbuilt source, or something else?
5. Who needed to view or interact with it?
6. When did this workflow last happen? How many times did it happen in the previous three months?
7. What did you use instead—PDF, attachment, HTML macro, iframe, static host, custom Forge app, screenshot, or another tool?
8. What was unsatisfactory about that path? What was already good enough?

Probe for observed behavior, not forecasts. “We plan to do this monthly” is not recurrence until the respondent can name completed cycles.

## Section B — value and current cost

1. Walk me through the effort from artifact creation to a teammate successfully using it.
2. Which people spend time on setup, hosting, permissions, troubleshooting, or updates?
3. What happens when the artifact is late, stale, inaccessible, or rendered incorrectly?
4. Is the value mainly saved engineering time, faster review, better client presentation, governance, reduced hosting overhead, or something else?
5. What does the current approach cost in app fees, hosting fees, and staff time? Ranges are fine.
6. If nothing changed, would the team continue with the current path? Why?
7. What would make this problem important enough to fund this quarter rather than later?

Do not convert a claimed number of hours into money unless the respondent supplies an applicable internal rate or budget convention.

## Section C — approval and procurement path

1. Who can install a Confluence Marketplace app on this site?
2. Who requests it, who reviews it, who owns the budget, and who can veto it?
3. Which evidence is required: security questionnaire, privacy policy, data-flow diagram, Cloud Fortified status, legal terms, vendor review, or proof of use?
4. Does the organization prefer free apps, centrally approved vendors, or apps under an annual threshold?
5. At what spend level does procurement or additional approval begin?
6. Is pricing evaluated against total site users, active creators, viewers, a project budget, or staff time saved?
7. How long did the last comparable app approval take? What delayed it?
8. Would Cloudflare-hosted bundle bytes or the current isolation model require a separate review? What exact question would the reviewer ask?

Record the named sequence, not just “security would approve it.”

## Neutral concept card — show only after Sections A–C

> A Confluence-native publisher for self-contained interactive work artifacts. A creator publishes a root `index.html`, either alone or with local relative assets. Teammates use it from the relevant Confluence page. The artifact is sandboxed: it cannot read the surrounding page, call external APIs under the current network policy, use server-side secrets, or write to a shared database. It can be updated in the same page location.

Do not say that single-file support is shipped until T01 is implemented and verified. Before that point, introduce the concept as a proposed workflow.

Ask:

1. What part, if any, addresses the workflow you described?
2. What would make it unusable or unapprovable?
3. Which alternative would you compare first?
4. What proof would you need before considering installation?
5. Who else must agree?

## Section D — unaided price discovery

Ask these before revealing current Marketplace prices:

1. How does your organization normally budget for a Confluence app like this?
2. What is the closest paid comparison, and what does it cost?
3. At what annual site price would this feel so inexpensive that you would question support or security?
4. At what annual site price would it feel reasonable for the workflow you described?
5. At what annual site price would it feel expensive but still worth a serious approval discussion?
6. At what annual site price would it be too expensive to consider?
7. What outcome or evidence drove each threshold?

If the participant cannot name any range, use a price ladder without arguing:

> Would your decision or approval path differ at approximately USD 0, 400, 1,000, and 2,000 per year for a 51–100-user site? Please explain what changes at each level.

The ladder is a fallback, not the first question. Always record whether a value was volunteered or prompted.

## Section E — public benchmark reaction

Only after unaided thresholds, present the dated supply-side context:

> At the 2026-08-02 Marketplace capture, a 51–100-user annual tier was USD 1,010 for Mini Sites and USD 400 for Narva; OST and Yamuno offered free HTML macros. These figures do not tell us what buyers will pay.

Then ask:

1. Which option would enter your real comparison set, and why?
2. What concrete difference would justify paying above a free HTML macro?
3. What concrete difference would justify paying materially above the USD 400 comparison?
4. Does a multi-file folder, a single-file workflow, Confluence placement, security isolation, support, or stable updating change the decision? Which one has proven value in your workflow?
5. Would you fund this from an app budget, a project budget, avoided hosting cost, or staff time? Who owns that budget?
6. What would you do at USD 1,010 today: reject, investigate, trial, request approval, or purchase? What specific next step makes that answer credible?

Do not treat “sounds fair” as willingness to pay. A credible threshold includes a real workflow, comparison, decision role, budget source, and next approval action.

## Close

1. What is the strongest reason not to use this approach?
2. Which assumption in the concept is wrong for your organization?
3. What evidence would change your mind?
4. Is there another admin, buyer, or creator whose perspective differs? Do not request an introduction unless future outreach authorization permits it.
5. May we retain the notes and a sanitized artifact description for this research? State the retention scope.

Thank the participant without offering discounts, roadmap promises, priority support, or delivery dates.

## Capture sheet

| Field | Value |
|---|---|
| Candidate / participant ID | |
| Interview date and authorized channel | |
| Creator / viewer / admin / buyer role | |
| Last real workflow and date | |
| Artifact shape | |
| Completed recurrence in last three months | |
| Named viewers and outcome | |
| Current workaround | |
| Current app/hosting/staff cost | |
| Approval sequence and veto owner | |
| Security/procurement requirements | |
| Closest comparison | |
| Volunteered reasonable threshold | |
| Volunteered expensive-but-considered threshold | |
| Volunteered too-expensive threshold | |
| Prompted ladder reactions | |
| Budget source | |
| Concrete next approval action | |
| Counterevidence / disqualifier | |
| Follow-up or retention permission | |

## Analysis rules

Classify evidence after each interview:

- **Credible paid threshold:** recent compatible workflow + respondent has decision/budget knowledge + comparison named + threshold tied to an outcome + approval path identified.
- **Directional price opinion:** some workflow context, but no budget role, comparison, or next action.
- **Not price evidence:** generic preference, Marketplace click/install, “sounds reasonable,” desire for a discount, or a number produced only after heavy prompting.
- **Admin acceptance:** an actual reviewer states what passes or fails; a creator guessing what security “should” approve is not admin acceptance.
- **Outcome:** the participant has published and named viewers used the artifact in a real workflow. Agreeing to an interview, sharing a file, or opening a demo is only a research signal.

After five interviews, report the full distribution and counterevidence. Do not average heterogeneous price answers into one recommended price. Segment by workflow, role, site band, and comparison set; make a pricing decision only through a separate Owner approval.

## Interview stop conditions

End or redirect the session if:

- the participant is being asked for confidential data, credentials, or an unredacted client artifact;
- they require a promise about shipping, security approval, pricing, discount, or support;
- the workflow requires live external authentication, host-page DOM, shared write-back, or another known hard boundary and no static subcase exists;
- the respondent has no relevant workflow and no decision role;
- recording or retention permission is unclear.

The interviewer may still capture the boundary as counterevidence, but must not steer it into a product-fit claim.
