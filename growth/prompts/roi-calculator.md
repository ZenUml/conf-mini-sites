# Prompt: Generate an ROI Calculator Mini Site

Copy the block below into ChatGPT, Claude, or a similar AI assistant. Fill in the bracketed details for your own scenario before sending. No coding experience required — just describe your numbers and paste the result into Mini Sites.

---

```
I want you to build me a small, self-contained interactive ROI calculator as a
single-page web app. I will upload the files it produces directly into a
Confluence page using an app called "Mini Sites," so it must follow these
hard constraints:

1. Output exactly three files: index.html, styles.css, and calculator.js.
2. No external dependencies of any kind — no CDN links, no npm packages, no
   Google Fonts, no icon libraries, no build step. Everything must run by
   double-clicking index.html or serving the folder with a plain static
   file server.
3. All JavaScript must be vanilla (no frameworks). All CSS must be plain CSS
   (no preprocessors).
4. The page must work fully offline and never make a network request.
5. Do NOT use localStorage, sessionStorage, IndexedDB, or cookies — Mini Sites serves the bundle
   in a sandboxed iframe with an opaque origin, where all of those throw or silently no-op. Keep
   all state in plain JS variables; it's fine if it resets on reload.

Here is the calculator I need:

- Title / context: [e.g. "Cloud Migration ROI Calculator" — describe what
  business decision this supports]
- Inputs (as number fields AND matching sliders, kept in sync with each
  other): [list 2-4 inputs, e.g. "Current infrastructure cost per year",
  "Migration cost (one-time)", "Expected annual savings"]
- Outputs (recalculated live on every input change, no submit button):
  [list the outputs and their formulas, e.g. "Payback period = migration
  cost / annual savings", "3-year ROI % = ((annual savings * 3 - migration
  cost) / migration cost) * 100"]
- Reasonable default values pre-filled in each input so the calculator shows
  a sensible result before anyone touches it.
- Format currency values with thousands separators and a $ sign. Format
  percentages with a % sign. Handle divide-by-zero and empty inputs
  gracefully (show "N/A" instead of erroring).

Design requirements:

- Clean, professional, modern look — this represents our company to
  prospects and clients reading a business proposal. Use a light theme,
  generous whitespace, clear typography, and a card-based layout for inputs
  vs. outputs.
- Make the primary output (the number that matters most for the decision)
  visually emphasized — larger text and/or a distinct accent color.
- Responsive: usable on a laptop screen inside a Confluence page and on a
  narrower viewport.

Please output the full contents of all three files, ready to save and
upload as-is.
```

---

## After generating

1. Save the three files locally with the exact names above.
2. Open `index.html` directly in a browser to confirm the numbers update as you type.
3. In Confluence, add the Mini Sites macro to your page and upload all three files.
4. Publish — the calculator now renders live, inline, on the page.
