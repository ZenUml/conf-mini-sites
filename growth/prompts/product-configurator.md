# Prompt: Generate a Product Configurator Mini Site

Copy the block below into ChatGPT, Claude, or a similar AI assistant. Fill in the bracketed details for your own product before sending. No coding experience required — just describe your plans, regions, and pricing, and paste the result into Mini Sites.

---

```
I want you to build me a small, self-contained interactive product configurator
as a single-page web app. I will upload the files it produces directly into a
Confluence page using an app called "Mini Sites," so it must follow these
hard constraints:

1. Output exactly three files: index.html, styles.css, and app.js.
2. No external dependencies of any kind — no CDN links, no npm packages, no
   Google Fonts, no icon libraries, no build step. Everything must run by
   double-clicking index.html or serving the folder with a plain static
   file server.
3. All JavaScript must be vanilla (no frameworks). All CSS must be plain CSS
   (no preprocessors).
4. The page must work fully offline and never make a network request.
5. Every output value must recompute live, on every input change — no submit
   button, no page reload.

Here is the configurator I need:

- Product / context: [e.g. "Enterprise SaaS deployment configurator" —
  describe what decision this supports, e.g. sizing a deployment for a
  prospect during a sales-engineering or solution-architecture conversation]
- Inputs (mix of dropdowns, a slider, and checkboxes): [list 4-6 inputs,
  e.g. "Deployment region (US / EU / APAC)", "Number of users (1-1000,
  slider)", "Plan tier (Starter / Business / Enterprise)", "Storage tier
  (Standard / Extended / Unlimited)", "Integrations (SSO, API access, audit
  log export, data residency controls — checkboxes)"]
- Outputs (recalculated live on every input change):
  - Recommended architecture: [describe the rules, e.g. "under 25 users on
    Starter = single-region shared cluster; over 200 users or Enterprise
    plan = multi-region active-active cluster; Enterprise + data residency
    checked = deployment pinned to the selected region"]
  - Estimated cost: [describe the formula, e.g. "per-user monthly rate by
    plan tier × user count × regional cost multiplier, plus flat or metered
    add-ons for storage tier and enabled integrations"]
  - Feature availability: [list which integrations/features are included,
    optional, or unavailable per plan tier, and show that clearly — e.g. a
    checklist with a distinct visual state for "included", "available but
    not enabled", and "not offered on this plan"]
- Reasonable default values pre-selected so the configurator shows a
  sensible result before anyone touches it.
- Format currency values with thousands separators, a $ sign, and a
  "/ mo" suffix. Handle edge cases gracefully (e.g. zero users, no plan
  selected) without erroring.

Design requirements:

- Clean, professional, modern look — this represents our company to
  prospects and clients evaluating a technical proposal. Use a light theme,
  generous whitespace, clear typography, and a two-column layout: inputs on
  one side, live outputs (architecture, cost, feature list) on the other.
- Make the cost output visually emphasized — larger text and/or a distinct
  accent color — since it is usually the number a reader scans for first.
- Responsive: usable on a laptop screen inside a Confluence page and on a
  narrower viewport (stack to a single column below ~720px).

Please output the full contents of all three files, ready to save and
upload as-is.
```

---

## After generating

1. Save the three files locally with the exact names above.
2. Open `index.html` directly in a browser and change every input to confirm architecture, cost, and feature availability all update correctly.
3. In Confluence, add the Mini Sites macro to your page and upload all three files.
4. Publish — the configurator now renders live, inline, on the page.
