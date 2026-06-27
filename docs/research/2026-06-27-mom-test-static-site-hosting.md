# Mom Test interview guide — people who host static sites for their team

**Date:** 2026-06-27
**For:** Conf Mini-Sites demand validation (the listing decision)
**Method:** [The Mom Test](https://momtestbook.com/) — Rob Fitzpatrick. Spoken interviews, not a survey.

---

## Why this exists

Conf Mini-Sites is a paid Forge/Marketplace app whose demand is, in the team's own words,
**n=1 (the anchor team), unvalidated beyond.** We've chosen "list first, validate with real installs" —
but installs are a lagging signal that takes months. These interviews are the leading signal: do people
*other than the anchor team* actually have this problem, and is it bad enough to change their behavior?

**The segment we're validating** (from the founder's framing): people who already **host simple static
sites — on AWS S3, GitHub Pages, Netlify, Vercel, or an internal server — to share with their internal
team.** They already make and host these artifacts. So we are *not* testing "do people make static sites."
We are testing the next two things down:

> **Primary question (weight the interview here): is their current hosting-and-sharing workflow painful
> enough that they'd change behavior?**
> Secondary: how often it happens · who else has it · what they'd pay/approve · which artifact type leads.

If most interviewees host rarely, shrug at the workaround, and have done nothing to fix it — that is a
**kill signal** for the list-first bet, and it's cheaper to learn it here than after a Marketplace launch.

---

## The three rules (read before every interview)

The Mom Test is a set of rules for talking to customers so that *even people who like you can't lie to
you*. The product is never the subject — **their life is.**

1. **Talk about their life, not your idea.** You never mention Confluence, embedding, or this product.
   If you describe the idea, they'll be polite, and politeness is noise.
2. **Ask about specifics in the past, not generics or the future.** Not "would you…" / "do you usually…"
   — but "tell me about the *last time* you…". The future is where people lie; the past is where the
   facts are.
3. **Talk less, listen more.** Your job is to shut up and let them narrate. Silence is a tool — let it
   pull the next sentence out of them.

**The tell that you're doing it wrong:** if you're talking about your idea, or they're complimenting it,
or you're discussing the future — stop and steer back to a concrete past event.

---

## Part 0 — Screener (how to recruit the right people)

Use these to *find* interviewees (in a DM, a community post, a hallway). Two questions. Don't interview
on the basis of these — just qualify.

- **S1.** "In the last few months, have you put together a small web page, prototype, dashboard, or little
  tool and shared it with people on your team?"
- **S2.** "Where did it end up — did you host it somewhere (S3, GitHub Pages, Netlify, an internal box…)
  or just send a file/screenshot?"

**Qualify** if S1 = yes **and** S2 = they hosted it somewhere. **Discard (different segment)** if they only
ever send screenshots, slide decks, or a raw file — note them, but they're not who we're validating.
**Gold** if they say "I do this all the time" or name a specific host without hesitating.

---

## Part 1 — Warm-up (2 min, build rapport, get context)

> Keep these light. You're learning their world, not interrogating.

- **1.** "What's your role, and what does your team actually work on?"
- **2.** "What kinds of things do you build that end up needing other people to look at?"

---

## Part 2 — The last-time story (the spine of the interview)

> This is the most important part. One concrete, recent event. Get them narrating and then **get out of
> the way.** Everything after this just deepens what they tell you here.

- **3.** "Tell me about the **last time** you built something — a page, a prototype, a dashboard, a little
  tool — that you needed other people to see. What was it?"
- **4.** "Walk me through what you did, **step by step**, from 'it's done on my machine' to 'my teammate
  is actually looking at it.'"
  - *Probes (only to keep them going):* "…and then what?" · "how long did that part take?" · "was that
    the first time you'd set that up, or did you already have it wired?"

---

## Part 3 — Hosting & sharing today (the facts of the workaround)

> Capture facts, not opinions. Where it lives, how people reach it, who's allowed.

- **5.** "Where did it end up living — what did you host it on?" *(record: S3 / GH Pages / Netlify /
  Vercel / internal / other)*
- **6.** "How did people actually get to it — what did you send them?"
- **7.** "Who was it supposed to be visible to — just your team, the whole company, or anyone with the
  link?"
- **8.** "How did you make sure the **right people — and only the right people** — could see it?"
  - *This is where "internal-only on a public-by-default host" tends to bite. Do NOT lead. If they say
    "honestly, anyone with the link can see it" or "I had to set up a whole auth thing" — that's a
    finding. Let it come from them.*

---

## Part 4 — Pain probe (the weighted core — past tense, specific)

> The whole interview leans here. Every question is about a thing that *already happened*, not a feeling
> about the future.

- **9.** "What was the most annoying part of that whole process?"
- **10.** "Was there anything you had to look up, wait on, or ask someone else for?" *(account access, a
  bucket, IT, a permission, a domain…)*
- **11.** "When you needed to **update** it later, what did you have to do? Did people ever end up looking
  at a stale version?"
- **12.** "Did anyone ever fail to open it, lose the link, or land on the wrong version? What happened?"
- **13.** "That thing you built — is it still up six months later? Do you know who can still get to it?"
  *(orphaned-site / governance pain — only if it flows naturally; don't force it.)*

---

## Part 5 — Evidence of REAL pain (the filter that separates polite from real)

> Anyone will *say* something is annoying. The Mom Test test for real pain is **past action**: have they
> spent time or money on it? Frequency and effort are the truth serum.

- **14.** "How often does this come up — roughly how many of these have you stood up in the last few
  months?" *(record a number.)*
- **15.** "Have you tried to make this easier — a template, a script, a different host, asking IT for
  something?" *(effort already spent = real pain.)*
- **16.** "Did you or your team ever **pay for anything**, or spend real engineering time building tooling,
  to smooth this out?" *(money/time already spent = the strongest signal there is.)*
- **17.** "If you *couldn't* host it at all, what would you have done instead?" *(reveals the true
  alternative and how essential it really is — screenshots? a meeting? give up?)*

---

## Part 6 — Commitment & referral (currency, still no pitch)

> The Mom Test measures interest in **currency that costs them something**: time, reputation, money. A
> "that's cool" costs nothing and means nothing. An intro or a calendar hold is real.

- **18.** "Who else on your team or company runs into this same thing?" → if they name someone:
  "**Could you introduce me?**" *(reputation currency — the strongest non-cash signal.)*
- **19.** "Would it be OK if I came back to you once I've dug into this more?" *(time currency.)*
- **If — and only if — they ask "wait, are you building something?"** then you may describe it in one
  sentence, and immediately test commitment, not enthusiasm:
  - "Would you want to try it on a **real** artifact you actually need to share **this week**?"
  - A yes-with-a-date is signal. "Sounds cool, send me a link sometime" is a polite no — record it as a no.

---

## Part 7 — Wrap

- **20.** "Is there anything about this I should have asked you but didn't?"
- Thank them. Send the intro-request follow-up the same day while it's warm.

---

## NEVER ASK (the traps — each one manufactures a false positive)

| Don't ask | Why it's poison | Ask instead |
|-----------|-----------------|-------------|
| "Would you use a tool that hosts your site and shares it with your team?" | Hypothetical + leading. They'll say yes to be nice. | "Walk me through the last time you did that." (Part 2) |
| "Do you think hosting static sites for your team is a pain?" | Fishing for a compliment; invites agreement. | "What was the most annoying part of that process?" (Q9) |
| "How much would you pay for something that fixed this?" | Future pricing is fiction. | "Have you ever paid for anything to fix this?" (Q16) |
| "Don't you hate setting up S3 buckets / GitHub Pages auth?" | You wrote their answer for them. | "How did you make sure only the right people could see it?" (Q8) |
| "Would it help if it lived right next to your docs?" | Pitches the product; biases everything after. | Say nothing about the product. Let them name where things should live. |
| Anything mentioning Confluence, embedding, or this app before Q18's trigger. | The moment they know what you want to hear, the data is contaminated. | Keep the idea in your pocket. |

---

## Post-interview signal scorecard (fill out immediately, while it's fresh)

Record **facts**, not impressions. One row per interview.

| Field | Capture |
|-------|---------|
| Role / team | |
| Do they actually do this? | freq in last 90 days: **___** |
| Where they host | S3 / GH Pages / Netlify / Vercel / internal / other: ___ |
| How they share | link in Slack / email / wiki / … |
| Stated #1 pain (their words) | "___" |
| Access-control friction surfaced? | Y / N — detail: ___ |
| Update / stale-version pain surfaced? | Y / N — detail: ___ |
| **Already spent time fixing it?** (script/template/IT ask) | Y / N — what: ___ |
| **Already spent money fixing it?** | Y / N — what: ___ |
| Their true fallback if hosting vanished | ___ |
| Commitments given | intro? ___ · follow-up? ___ · would-try-this-week? ___ |
| **Verdict** | real pain / mild annoyance / non-problem |

---

## How to read the results (the decision rubric)

**Validated pain** (a green light to keep pushing the listing) looks like:
- They do this **frequently** (several times a quarter+), **and**
- They've **already spent time or money** trying to make it easier, **and**
- They gave a **real commitment** — an intro, a follow-up, or "yes, this week."

**Noise to discard** — these feel good but mean nothing:
- "That's a cool idea." / "I'd totally use that." (compliment, future tense, zero cost)
- Enthusiasm with no past action behind it.
- Agreement that only appeared *after* you described the idea.

**Kill signal** (the list-first bet is weak — say so honestly and reconsider before sinking more in):
- Most interviewees host **rarely**, the workaround is a **shrug**, and they've **done nothing** to fix it.
- Their true fallback (Q17) is "eh, I'd just send a screenshot" — i.e. the pain has a free, acceptable
  substitute.

**Target before you trust the result:** ~8–10 qualified interviews. One or two enthusiastic anecdotes is
still n≈1; you're looking for a *repeated* pattern of past action across strangers.

---

## A note on segments

If access-control / "internal-only on a public host" pain shows up repeatedly and unprompted in Q8, that's
the sharpest wedge this product has (permissions inherited from Confluence) — but it only counts **if they
raise it themselves.** If you have to lead them to it, you've learned nothing. Likewise, watch which
artifact type (clickable prototype vs. dashboard vs. tool) recurs in Q3 — that's your leading use case for
the listing copy, derived from what they actually build, not what you hoped they'd build.
