# Prompt: Generate a Decision Tool Mini Site

Copy the block below into ChatGPT, Claude, or a similar AI assistant. Fill in the bracketed details for your own decision before sending. No coding experience required — just describe your options and criteria, and paste the result into Mini Sites.

---

```
I want you to build me a small, self-contained interactive weighted decision
tool as a single-page web app. I will upload the files it produces directly
into a Confluence page using an app called "Mini Sites," so it must follow
these hard constraints:

1. Output exactly three files: index.html, styles.css, and app.js.
2. No external dependencies of any kind — no CDN links, no npm packages, no
   Google Fonts, no icon libraries, no build step. Everything must run by
   double-clicking index.html or serving the folder with a plain static
   file server.
3. All JavaScript must be vanilla (no frameworks). All CSS must be plain CSS
   (no preprocessors).
4. The page must work fully offline and never make a network request.

Here is the decision tool I need:

- Title / context: [e.g. "Vendor Selection Decision" — describe the choice
  this doc is helping make]
- Options: [list 3-4 options being compared, e.g. "Vendor A", "Vendor B",
  "Vendor C"]
- Criteria (each with an adjustable weight slider, 0-5 or 0-10 range):
  [list 3-5 criteria, e.g. "Cost", "Impact", "Risk", "Effort" — note that
  every criterion's per-option score should mean "higher is better" so the
  weighting math stays consistent; if a criterion is naturally "lower is
  better" like Cost or Risk, score it as an inverted 1-10 rating instead of
  a raw number]
- Per-option scores for each criterion, on a 1-10 scale (1 = worst, 10 =
  best), editable by the reader via small number inputs next to each score.
- Live recomputation: as soon as any weight slider or score changes,
  recalculate each option's weighted total (weighted average, i.e. sum of
  weight * score divided by sum of weights) and re-render the ranking from
  highest to lowest — no submit button, no page reload.
- Show the ranking as a clear ordered list with position (#1, #2, #3), the
  option name, the numeric weighted score, and a simple bar visualizing
  relative score so the reader can see the gap between options, not just
  the order.
- Handle the all-weights-zero edge case gracefully (no crash, no NaN —
  show a message asking the reader to set at least one weight above zero).

Design requirements:

- Clean, professional, modern look — this represents a real decision being
  made, not a toy. Use a light theme, generous whitespace, clear typography,
  and a card-based layout separating the weight/score inputs from the
  ranking output.
- Visually highlight the current #1-ranked option (distinct accent color or
  background) so the recommendation is legible at a glance.
- Responsive: usable on a laptop screen inside a Confluence page and on a
  narrower viewport.

Please output the full contents of all three files, ready to save and
upload as-is.
```

---

## After generating

1. Save the three files locally with the exact names above.
2. Open `index.html` directly in a browser and drag a weight slider to confirm the ranking recomputes live.
3. In Confluence, add the Mini Sites macro to your page and upload all three files.
4. Publish — the decision tool now renders live, inline, on the page.
