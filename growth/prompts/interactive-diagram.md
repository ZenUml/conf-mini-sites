# Prompt: Generate an Interactive Architecture Diagram (Mini Sites-ready)

Copy the prompt below into ChatGPT, Claude, or a similar assistant. Fill in the `<YOUR ARCHITECTURE HERE>`
section with your own system description (a list of services, a rough diagram, or even a paragraph
description is enough). The output is a self-contained bundle you can upload directly to Mini Sites.

---

```
You are building a small, self-contained, interactive architecture diagram as a static website.
It will be uploaded as-is to a Confluence page via an app called Mini Sites, so it must run with
zero build step and zero external network dependencies.

HARD REQUIREMENTS
- Output exactly three files: index.html, style.css, app.js. No other files, no package.json,
  no bundler, no framework.
- No CDN links, no Google Fonts, no external images, no analytics scripts, no fetch() calls to
  any external URL. Everything (including any icons) must be inline SVG, inline CSS, or plain text.
- The diagram itself must be inline SVG (not a static image, not <canvas> unless you also wire up
  click hit-testing) so each service box and each data-flow arrow can be a real clickable element.
- Clicking a service box OR a data-flow arrow must open/update a detail panel on the same page
  (no navigation, no alert()) showing, at minimum:
  - Owner (team or person responsible)
  - API / protocol (how it talks to other services)
  - Dependencies (other services or data stores it relies on)
  - Risk (what's fragile, unmitigated, or worth flagging about this piece)
- Must work when opened as a plain file (file://) or served via `python3 -m http.server` — so use
  relative paths only (no leading slash) for style.css and app.js.
- Keyboard-accessible: each clickable node should be reachable by Tab and activatable with Enter/Space.
- Visually polished: clear typography, consistent spacing, a real color system (not default browser
  styles), hover/focus/active states on clickable elements, and a responsive layout that doesn't
  break under ~900px width.

CONTENT
Base the diagram on this architecture:

<YOUR ARCHITECTURE HERE — paste a list of services/components, how they connect, and (if you have it)
who owns each one, what protocol/API is used between them, key dependencies, and known risks or gaps.
If you don't have all four details for every node, invent reasonable placeholders and mark them
clearly as "TBD — confirm with [likely owner]" rather than inventing false specifics.>

DELIVERABLE
Return the full contents of index.html, style.css, and app.js, each in its own labeled code block,
ready to save as three files in one folder and upload directly.
```
