# promo — the 35-second launch film

Produces `promo/out/final.mp4`: 35.000s, 1920×1080, 30fps, H.264 + AAC, captions burned in.

Everything on screen is a real capture of the real product against the **dev** stack
(`lite-dev.atlassian.net`, space `SD`). Nothing is mocked, re-created, or animated after the fact — the
one exception is the browser window in Act 1, which is drawn in HTML *around* a real page (see below).

```bash
pnpm promo:test          # unit tests (beat sheet, captions, score, ffmpeg argv) — no browser, no network
pnpm promo:typecheck
pnpm promo:audio         # render the score -> promo/out/audio/{master.wav,stems/*}

set -a; source tests/e2e/.env; set +a          # Confluence + Forge credentials
npx tsx promo/capture/act1.ts    promo/out/captures   # localhost prototype        (~15s of footage)
npx tsx promo/capture/act2.ts    promo/out/captures   # Confluence: insert -> publish -> live (~80s)
npx tsx promo/capture/act3.ts    promo/out/captures   # the teammate using it       (~55s)
npx tsx promo/capture/endcard.ts promo/out/captures   # three closing stills
pnpm promo:assemble                                    # -> promo/out/final.mp4
pnpm promo:variants                                    # -> final_square.mp4, final_vertical.mp4
pnpm promo:cut15                                       # -> final_15s.mp4
```

`promo/out/` is gitignored; every artifact is reproducible from the commands above.

## Layout

| path | what it is |
|---|---|
| `site/` | the **Feature Prioritisation** prototype. The hero asset — served on `localhost:3000` in Act 1, uploaded as a folder in Act 2, running inside Confluence in Act 3. Same bytes all three times. |
| `capture/harness.ts` | recording browser, synthetic cursor, beat marks, the alignment clap |
| `capture/cursor.ts` | the drawn pointer (Playwright records no mouse) |
| `capture/chrome-shell.html` | a browser window in HTML, wrapping a real iframe of `127.0.0.1:3000` |
| `capture/confluence.ts` | PRD page builder, the teammate's comment, privacy mask, macro centring |
| `capture/act{1,2,3}.ts` | the three takes |
| `capture/endcard.{html,ts}` | closing brand card |
| `edit/shots.ts` | **the beat sheet** — 30 shots, each anchored to a capture mark, each declaring what it proves |
| `edit/captions.ts` | 19 cues → ASS, with the director's rules asserted in code |
| `edit/audio.ts` | the score, synthesized from oscillators in JS |
| `edit/assemble.ts` | marks + beat sheet → per-shot clips → concat → captions + audio |
| `edit/cut15.ts` | the :15 cut — its own beat sheet, cue list and score plan, same captures |
| `edit/variants.ts` | 1:1 and 9:16, letterboxed with captions re-burned for the canvas |
| `verify-site.mjs` | standalone check that the prototype really is interactive |

## Six things here that are not obvious

**1. The cursor is drawn, and it must be shipped as a string.**
Playwright's recorded video contains no mouse pointer. `cursor.ts` draws one and eases it between
targets. It is injected as a *string*, not a function: handing Playwright a TypeScript arrow function
ships whatever the transpiler emitted, and esbuild rewrites named functions through a `__name()` helper
that does not exist in the page. That threw on injection, `window.__promoCursor` was never defined, and
every glide silently no-opped — the capture still "succeeded", it just had no cursor in it.
`Capture.clap()` now asserts the cursor is installed so that failure can never be silent again.

**2. Marks resolve through a clap, not a subtraction.**
Playwright starts recording at context creation and gives you no wall-clock→video mapping. Each capture
therefore opens with a ~140ms full-frame black flash; `ffmpeg blackdetect` finds it, and the midpoints of
the detected interval and of the clap's two marks are paired (midpoints, so render latency cancels). The
scan window is derived from the log — Act 2's page can take 30s+ to settle, and a fixed 4s scan reported
"was clap() called?" when it had been.

**3. The edit aims at measured coordinates.**
Shots never carry source timecodes; they carry `at: ['a3_vote_click', -0.35]`. Close-ups likewise carry
`focus: 'target' | 'embed'` rather than crop fractions, and every filmed click records the bounding box
of what it clicked. The first cut hand-tuned those fractions and aimed a 2.2× zoom at body text instead
of the button.

**4. The edit must never run the source backwards.**
Two shots covering one continuous action are anchored to marks that can be milliseconds apart, so a
negative offset on the second easily starts it *before* the first one ended. The finished film had this
in three places: the upload percentage climbed to 100% and dropped back to 41%, and the vote counter
flickered 5 → 4 → 5 twice. Shots that continue an action now say `continues: true` (chain onto the
previous out-point, ignore the mark); deliberate revisits say `flashback: true`; anything else is
rejected by `checkContinuity` before a frame is rendered.

**5. Frames come from boundaries, not durations.**
Half the beat sheet lands on `0.x5` seconds — 1.5 frames at 30fps. Rounding each duration independently
pushed the film to 35.3s. `frameCount` subtracts rounded *boundaries* so the errors cancel and the total
is exactly 1050 frames.

**6. The film is shot on the dev stack, and that is visible in one shot.**
The `/mini` quick-insert menu lists every installed environment, so the macro reads
**Mini-Site (Development)**. A customer sees plain "Mini-Site". Act 2 clicks the Development row *by
name* — pressing Enter would take the highlighted first row, which is Staging. See "Known gaps".

## The recap that was cut

The script called for a recap at 29–31s: three prototype close-ups captioned "Upload the folder.", then
a Publish close-up captioned "Publish the page." It was built, shipped, and then removed. Three reasons,
in order of weight:

1. **It ran the story backwards.** The five beats resolve on a colleague using the thing. Re-opening the
   mechanics chapter after that reads as the flow restarting — which is exactly how it played: the
   re-appearing upload panel looked like a second upload.
2. **A caption asserted what its frame did not show.** "Upload the folder." played over Vote / Filter /
   Chart — the product being *used*, not uploaded. By the script's own fifth column that shot proved
   "restate step one", and restatement is not evidence. It was also a verbatim repeat of cue #5.
3. **The budget was inverted.** Mechanics already held 30% of the film; the magic beat held 7% and each
   closing CTA line under 0.9s.

The 2.05s went to the two beats carrying the argument: the colleague using it (+1.05s) and the end card
(+1.00s, so each CTA line now gets a full second). What was genuinely lost is the score's best rhythmic
moment — three clicks landing on the beat. SFX with no action on screen is worse than a quieter bar.

## Honesty rules this pipeline enforces

- The magic beat (19.0s) is anchored to `a2_live`, the frame where the site actually renders **on the
  page** after publishing. An earlier cut anchored it to the publisher dialog's own preview pane; that
  would have illustrated "right inside Confluence" with something that is not the page. A test asserts
  the anchor is not a `*_click` mark.
- The teammate's comment is a real Confluence footer comment posted through the API before the take, not
  an overlay — the script forbids simulating realtime features the product does not have.
- Every shot in `shots.ts` must state what it proves; `validateShots()` fails the build otherwise.
- Privacy: the space sidebar (a wall of internal test-page titles), avatars, the account trigger — whose
  aria-label is literally a user's email address — and other vendors' app badges are all masked. Every
  selector was read off the live page by `promo/tmp/probe-selectors.ts`, because an earlier invented set
  matched nothing and a whole take filmed the tenant's page tree.
- The comment beat (26.5–28.4s) shows a **real** Confluence comment with a **blurred** avatar and a
  legible author name. The name is left visible on purpose: replacing it with an invented teammate
  would be a fabricated persona. `[data-testid="comment-author"]` in `PRIVACY_CSS` is a one-line
  uncomment if you'd rather hide it.
- The end card uses no Atlassian brand asset. We hold no licence to their mark, so the Marketplace is
  referenced in words by the caption track only.

## Audio

Synthesized from oscillators in `edit/audio.ts` — royalty-free by construction, deterministic, and
re-timed by editing data rather than a DAW. The score's one non-negotiable instruction is enforced by a
test: **absolute silence from 6.35s to 8.40s**, under "Now what?". Measured, and independently confirmed
with `ffmpeg astats`:

| window | RMS |
|---|---|
| "Now what?" hold, 6.6–8.25s | `-inf dBFS` (true digital silence) |
| magic beat, 19.0–21.0s | −12.31 dBFS |
| opening, 1.0–3.0s | −16.83 dBFS |

The bar grid is offset by one second so **19.0s is a downbeat** and the progression comes home to the
tonic exactly when the product appears; profiling an earlier cut showed the gain rising mid-bar with no
musical event under it, which read as a volume change rather than an arrival.

To use a licensed track instead: `final_nomusic.mp4` (SFX only) and `out/audio/stems/*.wav` exist so the
swap is one ffmpeg command, not a re-edit.

## The :15 cut

`pnpm promo:cut15` → `promo/out/final_15s.mp4` (15.000s, 450 frames). It is not a trim: the five beats
survive with one shot each, and the pause shortens to 1.1s because two seconds of stillness in a :15 is
a seventh of the film. Two rules are enforced across both runtimes by `validateShots(..., holds)`:

- the **magic hold never scales down** — 1.0s minimum at any runtime;
- the **bloom must land on a bar line**. The bar grid starts at 1.0s and steps every 2s, so only an odd
  second is a downbeat. A test caught the first draft placing the :15 bloom at 9.6s — mid-bar, which is
  exactly the defect the 35s cut's grid offset exists to prevent. It is at 9.0s.

The score is a `ScorePlan` (envelope, silence window, bloom window, riser, resolve, SFX cues), so a new
runtime reuses the instrument instead of duplicating it: `PLAN_35` and `PLAN_15`.

## Known gaps

- **`Mini-Site (Development)` is visible** in the quick-insert shot (10.35–11.60s). Re-shooting Act 2
  against a production install would show the clean "Mini-Site" a customer sees.
- The music bed is synthesized, not composed. It is deliberately minimal.
- Captions are English-only; `final_nocaptions.mp4` is the master for a localised pass.
