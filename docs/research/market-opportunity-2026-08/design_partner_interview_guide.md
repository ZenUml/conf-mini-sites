# Design partner interview guide (draft)

**Length:** ~20 minutes  
**Status:** Discovery script only — **do not contact** candidates until authorization is explicitly lifted per row in `04_design_partner_candidates.csv`.  
**Goal:** Test whether folder-upload multi-file mini-sites beat paste/attachment/iframe workarounds for real recurring jobs (packaging, security, update cadence, willingness).

---

## Before the call (2 min prep)

- Skim the candidate’s public artifact (Marketplace review / Community / SO / blog) and one evidence ID.
- Prepare one concrete example from *their* language (e.g. “exam simulator,” “Plotly figure,” “Allure report”).
- Confirm authorization is still `DISCOVERY ONLY — DO NOT CONTACT` unless a later program unlocks outreach.

---

## Opening (2 min)

1. Thank them; state purpose: learning how teams get interactive HTML into Confluence today — not a sales pitch.
2. Consent: recording optional; notes only if preferred; they can skip any question.
3. Context check: role, Confluence Cloud vs DC, who publishes vs who views.

**Ask:** “Walk me through the last time you put interactive HTML (or a prototype / report / tool) on a Confluence page.”

---

## Job & artifact (4 min)

1. What was the artifact? (prototype, chart, calculator, training sim, QA report, help system, other)
2. Who is the audience? How often do they open it?
3. What “done” looked like for you that day?

**Listen for:** multi-file vs single paste; external host; attachment download; AI-generated code.

---

## Folder vs paste (5 min) — primary test

1. How do you get bytes onto the page today? (paste macro / attachment+iframe / zip import / external URL / other)
2. If the artifact has CSS/JS/JSON/images as separate files, what breaks?
3. Reaction prompt: “If you could upload a folder and have relative paths just work inside the page, when would that help — and when would paste still be enough?”

**Pass signal:** prefers folder for multi-asset or complex AI/export bundles.  
**Fail / boundary:** single snippet is enough; or needs host-page DOM / live external APIs.

---

## Security & trust (3 min)

1. What does your org require before HTML/JS can run in Confluence? (admin allowlist, sandbox, no outbound, vendor review)
2. Have you hit iframe isolation, CSP, or “Rendering error” limits? What did you do next?
3. Reaction prompt: “Would a sandboxed mini-site with no outbound network be acceptable for your artifact — or a deal-breaker?”

**Listen for:** paid-app resentment vs willingness to pay for isolation; corp bans on addons; secret/CDN concerns.

---

## Update cadence (3 min)

1. How often does the artifact change? Who updates it?
2. What’s the painful part of a refresh? (re-paste, re-zip, re-host, broken paths, height/resize)
3. Reaction prompt: “What would a good republish flow look like for you in under five minutes?”

---

## Willingness & wrap (3 min)

1. If a product solved your packaging path, who would need to approve install?
2. Rough willingness: ignore price — would you trial on a real page in the next month? Why / why not?
3. Who else on your team lives this pain? (role only — no contact requests in discovery phase)
4. Anything we didn’t ask that matters?

**Close:** Thank them; no commitment; optional follow-up only if they offer.

---

## Note-taking checklist (post-call)

| Lens | One-line finding |
|------|------------------|
| JTBD / artifact class | |
| Folder vs paste preference | |
| Security constraints | |
| Update cadence | |
| Willingness / blockers | |
| Mini Site fit (high / medium / poor) | |
| Evidence ID(s) to link | |

---

## Do not include in this phase

- Outreach emails, InMails, or Community DMs
- Requests for private data, tenant IDs, or unpublished bundles
- Production installs or paid trials without a separate authorized program
