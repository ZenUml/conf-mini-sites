# G1 — Security & residency confirmation (the gate that picks the platform)

**What G1 actually asks:** will the anchor team's security accept a Marketplace app that stores and serves
their page content on an **external processor (Cloudflare)** — *not* inside Atlassian, with permissions
**enforced by the app**, not inherited? The answer is a single load-bearing bit:

- **Yes (external processor OK)** → build on **Cloudflare WfP** (the decided architecture; DESIGN.md §1–§2).
- **No / residency-bound** → **Cloudflare is disqualified**; build the **Forge-native fallback** (DESIGN §6).

So this is not "do we think it's fine" — it's "find out which architecture we're allowed to build" before
writing Stages 2–5. It is the cheapest possible de-risking: ~1 email, ~1 day.

---

## The data-flow one-pager (attach this so security can answer fast)

> **Conf Mini-Sites — data handling summary (for security review)**
> - **What it does:** lets an author embed a multi-file static "mini-site" bundle (HTML/JS/CSS/assets) on a
>   Confluence page.
> - **What leaves Atlassian:** the **uploaded bundle bytes** are stored on **Cloudflare** (sub-processor), and
>   each view triggers a server-side **Confluence `permission/check` (read)** call. Page *content* is not
>   copied; only the user-uploaded bundle + the minimal metadata to serve it.
> - **Where it is stored:** Cloudflare (Workers for Platforms + R2/D1), region: **<to confirm — see Q2>**.
> - **Access control:** every request is authenticated (signed Atlassian Connect JWT) and authorized
>   (per-request Confluence read-permission check) by the app's gateway; the hosted bundle is **not publicly
>   routable**. Permissions are **app-enforced, not inherited** from Confluence.
> - **Deletion:** bundles are erasable on request/uninstall (DSAR), incl. caches; backup-retention window
>   **<to confirm with Cloudflare — see Q3>**.
> - **Security posture:** the app will undergo a **Cloud Fortified** security review + a third-party
>   penetration test of the auth gateway before GA.

## The decisive questions (paste into the email — each is yes/no or one line)

1. **External processor:** Does your security policy permit a Confluence Marketplace app that **stores and
   serves your page content on an external host (Cloudflare)**, with access enforced by the app? **(Yes / No)**
   — *this single answer decides the whole architecture.*
2. **Residency:** Any **data-residency** requirement (must content stay in a region, or never leave Atlassian's
   boundary)? If yes, which region(s)?
3. **DPA / sub-processor:** Do you require a signed **DPA** naming Cloudflare as sub-processor? Any sub-processor
   allow-list constraints?
4. **Review path:** Will this go through your **vendor security assessment / procurement** (and do you require
   Cloud Fortified)? Who is the approver, and what's their timeline?
5. **Consumers' accounts (the original open Q):** do the non-technical people who'd *view* these mini-sites
   have the accounts/permissions assumed, or is view-access broader than page-permission?

## Ready-to-send email

> **To:** <anchor team security / IT admin>
> **Subject:** Quick security check — can we host an embedded app artifact on an external processor?
>
> Hi <name>,
>
> Before we build, I need a yes/no from your side on one architecture question. We're adding a Confluence app
> that lets your team embed a multi-file interactive "mini-site" on a page. To serve it, the uploaded bundle
> would live on **Cloudflare** (an external processor), with access gated by the app on every request
> (verified Atlassian token + a per-request Confluence read-permission check) — i.e. **permissions are
> enforced by the app, not inherited**, and the content sits outside Atlassian's boundary.
>
> One-page data-flow summary attached. Could you confirm:
> 1. Does your policy **permit an external processor** holding/serving this content? (the deciding question)
> 2. Any **data-residency** requirement?
> 3. Do you need a signed **DPA** naming Cloudflare as sub-processor?
> 4. Does this need to clear your **vendor security review / procurement**, and who approves?
>
> If an external processor is a no-go, we'll instead host it **natively inside Atlassian (Forge)** — so your
> answer just tells us which way to build. Happy to hop on 15 min if easier.
>
> Thanks, <founder>

---

## Why "I don't think there's a problem" isn't enough here

- It predicts **their security team's** answer. If you're right, this email comes back "yes" in a day and
  you've lost nothing. If you're wrong, you've built the Cloudflare auth gateway + WfP + pipeline for an
  architecture the customer rejects.
- **GDPR/DSAR + DPA** are obligations that exist whether or not it "feels" fine — and they're a hard gate for
  any enterprise/Cloud-Fortified sale.
- The answer is **free to get and decides the platform.** That makes it the first thing to do, not the thing
  to skip.

**The only irreducibly-human part:** sending this to a real security contact and getting the reply. Everything
else is above (the questions, the framing, the data-flow summary). The moment #1 comes back **Yes**, G1 is
clear and the Cloudflare build is unblocked; if **No**, we pivot the plan to Forge before a line is written.
