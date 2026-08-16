# AI Prompt — Interactive Prototype for Mini Sites

Copy the prompt below into Claude, ChatGPT, v0, Lovable, or any AI coding assistant. Fill in the bracketed
details first. The output is a self-contained bundle you can upload directly to a Mini Sites macro on a
Confluence page.

---

```
I want you to build a small, fully interactive clickable prototype as a self-contained web bundle.

CONTEXT
- What it's for: [describe your idea, e.g. "a feature-prioritization tool for my product team" /
  "an onboarding flow mockup" / "a pricing calculator"]
- Who will use it: [e.g. "PMs and engineers reviewing a PRD"]
- The one core interaction it must demonstrate: [e.g. "users add items, score them, and see a ranked list
  update live"]

HARD REQUIREMENTS
1. Output plain HTML, CSS, and JavaScript only. No React, no build step, no npm install, no bundler.
2. No external dependencies of any kind: no CDN scripts, no Google Fonts, no external images, no fetch/XHR
   calls to any network address. Everything must work opening index.html directly in a browser or via
   `python3 -m http.server`, with no internet connection.
3. It must have REAL client-side state and interactivity — not a static image or a series of unlinked
   screens. Use actual JavaScript event handlers (click, drag, input) that visibly change the DOM: update
   a counter, re-sort a list, move an element, toggle a view. I should be able to interact with it and see
   the state change, not just look at it.
4. Keep it to a small number of files: an index.html, and optionally one style.css and one app.js. Inline
   is fine too if that's simpler — just keep the whole thing self-contained in one folder.
5. Make it visually polished and professional — this will be shown to real stakeholders inside a
   Confluence page. Use a clean, modern layout, readable typography, consistent spacing, and a coherent
   color palette. Avoid placeholder "Lorem ipsum" — use realistic example content relevant to the context
   above.
6. Make sure it's responsive enough to look reasonable in a Confluence page's content column width
   (roughly 700–900px wide) — avoid fixed pixel widths that overflow.
7. Do not require any login, backend, database, or account system. State lives in memory (plain JS
   variables) only. Do NOT use localStorage, sessionStorage, IndexedDB, or cookies — Mini Sites serves
   the bundle in a sandboxed iframe with an opaque origin, where all of those throw or silently no-op.
   It's fine if state resets on reload; it does not need to persist across users or devices.

DELIVERABLE
Give me the complete contents of each file (index.html, and any .css/.js files), ready to save directly
to disk and upload as a Mini Sites bundle on Confluence. After the code, add a 2-3 sentence note on what
interaction to try first when I open it.
```

---

**Tip:** if the first result feels static, follow up with: *"Show me exactly which lines of JavaScript
handle the click/drag interaction, and make sure clicking or dragging actually changes visible state on
the page — not just console.log."*
