// The beat sheet: 35 seconds of film, one entry per shot.
//
// Shots do NOT carry source timecodes. They carry a MARK NAME plus an offset — `at: ['a1_vote_click',
// -0.35]` means "start 0.35s before the frame where the Vote click happened in Act 1". The capture
// harness emits those marks; blackdetect on the opening clap converts them to exact video time. So a
// re-shoot that runs half a second slower still cuts on the same moments, and nobody has to re-time the
// edit by hand. That indirection is the whole reason this file is short enough to read.
//
// Act boundaries follow the PRODUCT, not the clock. Act 2 runs unbroken from the PRD page through
// publishing and does not stop until the mini-site has actually appeared, so the magic beat at 19.0s is
// the real post-publish handoff rather than a fresh page load edited to look like one. Act 3 is a
// separate session on the already-published page: the teammate's experience, not the author's.

export type Src = 'act1' | 'act2' | 'act3' | 'endcard';

export interface Shot {
  id: string;
  /** start time in the finished film (s) */
  t: number;
  /** duration in the finished film (s) */
  dur: number;
  src: Src;
  /** [markName, offsetSeconds] — where in the source clip this shot begins */
  at?: [string, number];
  /** source playback rate; >1 compresses (used to squeeze the publish wait under a second) */
  speed?: number;
  /** push-in / pull-back. 1 = untouched, >1 zooms in, <1 shows more (letterboxed by scale-then-crop) */
  zoom?: number;
  /** zoom centre as a fraction of frame (0..1). Defaults to the middle. Ignored when `focus` is set. */
  cx?: number;
  cy?: number;
  /**
   * Aim the crop using geometry the CAPTURE measured, rather than hand-tuned fractions:
   *  - 'target' centres on the element this shot's mark recorded clicking;
   *  - 'embed'  centres on the macro iframe's recorded rect, optionally offset within it by fx/fy.
   * Falls back to cx/cy if the capture recorded no box.
   */
  focus?: 'target' | 'embed';
  /** take 'target' geometry from a DIFFERENT mark than the one this shot is timed on */
  focusMark?: string;
  fx?: number;
  fy?: number;
  /** 0..1 darkening — the frame dips before "Now what?" */
  dim?: number;
  /** fade in from black at the very top of the film */
  fadeIn?: number;
  /** what this shot proves — the fifth column of the director's table. Every shot must answer it. */
  evidence: string;
}

export const FILM_DURATION = 35.0;

export const SHOTS: Shot[] = [
  // ── Beat 1 · Satisfaction — "I built a real thing" ───────────────────────
  { id: 'open',          t: 0.00, dur: 1.20, src: 'act1', at: ['a1_idle', -0.60], fadeIn: 0.35,
    evidence: 'A designed, interactive site is already running at localhost:3000 — not a mockup image.' },
  { id: 'vote-click',    t: 1.20, dur: 1.10, src: 'act1', at: ['a1_vote_click', -0.35],
    evidence: 'The site responds to a real click.' },
  { id: 'vote-result',   t: 2.30, dur: 1.10, src: 'act1', at: ['a1_vote_settled', -0.25],
    evidence: 'State actually changed: 4 becomes 5 and the bar grows with it.' },
  { id: 'impact-filter', t: 3.40, dur: 1.05, src: 'act1', at: ['a1_impact_click', -0.30],
    evidence: 'Not a one-button toy — filtering re-ranks the whole list.' },
  { id: 'detail-panel',  t: 4.45, dur: 1.10, src: 'act1', at: ['a1_cardb_click', -0.30],
    evidence: 'Deep enough for a real product review: problem, solution, expected impact.' },

  // ── Beat 2 · Pause — the hinge of the film ───────────────────────────────
  { id: 'address-bar',   t: 5.55, dur: 0.85, src: 'act1', at: ['a1_omnibox_focus', -0.20], zoom: 1.55, cx: 0.30, cy: 0.06,
    evidence: 'It says localhost. This exists on exactly one machine.' },
  { id: 'now-what',      t: 6.40, dur: 2.00, src: 'act1', at: ['a1_still', 0.10], dim: 0.55,
    evidence: 'Nothing is wrong with the site — the problem is that nobody else can reach it.' },

  // ── Beat 3 · Discovery — take it where the team already is ───────────────
  { id: 'prd-page',      t: 8.40, dur: 1.00, src: 'act2', at: ['a2_page_view', -0.30],
    evidence: 'The destination is a real Confluence PRD, where the decision actually gets made.' },
  { id: 'edit-page',     t: 9.40, dur: 0.95, src: 'act2', at: ['a2_edit_click', -0.35],
    evidence: 'A normal Confluence edit — no admin console, no separate tool.' },
  { id: 'slash-mini',    t: 10.35, dur: 1.25, src: 'act2', at: ['a2_slash_typed', -0.70], zoom: 1.7, focus: 'target', focusMark: 'a2_macro_picked', fy: 0.2,
    evidence: 'The product is reachable from the editor the way every other macro is: type /mini.' },
  { id: 'publisher',     t: 11.60, dur: 0.85, src: 'act2', at: ['a2_publisher_open', -0.50],
    evidence: 'One panel, no configuration screen.' },
  { id: 'pick-folder',   t: 12.45, dur: 1.10, src: 'act2', at: ['a2_files_selected', -0.80],
    evidence: 'A whole project folder goes in — not a screenshot, not a single file.' },
  { id: 'file-list',     t: 13.55, dur: 1.00, src: 'act2', at: ['a2_filelist_shown', -0.25],
    evidence: 'index.html, styles.css, app.js, assets/ — it really is the multi-file site.' },
  { id: 'ready',         t: 14.55, dur: 1.05, src: 'act2', at: ['a2_ready_state', -0.35],
    evidence: 'Validated and ready, with no build step in between.' },
  { id: 'to-publish',    t: 15.60, dur: 1.85, src: 'act2', at: ['a2_publish_hover', -0.40],
    evidence: 'One decisive action is all that remains.' },
  { id: 'publish',       t: 17.45, dur: 1.00, src: 'act2', at: ['a2_publish_click', -0.15],
    evidence: 'The click that ships it.' },
  { id: 'publishing',    t: 18.45, dur: 0.55, src: 'act2', at: ['a2_publishing', 0.00], speed: 3.0,
    evidence: 'The wait is short — compressed here, but it is a real wait, not a cut.' },

  // ── Beat 4 · Magic — hold. do not click. ─────────────────────────────────
  { id: 'it-runs',       t: 19.00, dur: 1.30, src: 'act2', at: ['a2_live', -0.10],
    evidence: 'THE shot: the same site, running inside the Confluence page. Untouched for 1.3s so the viewer registers it before being told.' },
  { id: 'push-in',       t: 20.30, dur: 1.15, src: 'act2', at: ['a2_live', 1.20], zoom: 1.22, focus: 'embed',
    evidence: 'Still inside Confluence — the surrounding page never leaves frame.' },

  // ── Beat 5 · Relief — the team can just use it ───────────────────────────
  { id: 'vote-inside',   t: 21.45, dur: 1.05, src: 'act3', at: ['a3_vote_click', -0.35], zoom: 1.15, focus: 'embed',
    evidence: 'Live interaction in the embed. This is not a recorded animation.' },
  { id: 'chart-inside',  t: 22.50, dur: 1.05, src: 'act3', at: ['a3_vote_settled', -0.25], zoom: 1.15, focus: 'embed',
    evidence: 'Same state change as at 2.3s — the prototype kept all of its behaviour.' },
  { id: 'effort-filter', t: 23.55, dur: 1.05, src: 'act3', at: ['a3_effort_click', -0.30], zoom: 1.15, focus: 'embed',
    evidence: 'Filtering works in the embed too. A screenshot could not do this.' },
  { id: 'panel-inside',  t: 24.60, dur: 1.00, src: 'act3', at: ['a3_cardb_click', -0.30], zoom: 1.15, focus: 'embed',
    evidence: 'A teammate can explore it themselves, without a handover call.' },
  { id: 'pull-back',     t: 25.60, dur: 0.95, src: 'act3', at: ['a3_pullback', -0.20], zoom: 1.0,
    evidence: 'Pull-back (1.15 -> 1.0): it lives among the requirements and the decision notes — not on a separate link.' },
  { id: 'comment',       t: 26.55, dur: 1.05, src: 'act3', at: ['a3_comment_visible', -0.30],
    evidence: 'The discussion is already in the same place (a real Confluence comment).' },
  { id: 'option-b',      t: 27.60, dur: 1.40, src: 'act3', at: ['a3_optionb_click', -0.40],
    evidence: 'A comment turns into an action on the prototype in one move.' },

  // ── Recap — three fast proofs, cut to the beat ───────────────────────────
  { id: 'recap-vote',    t: 29.00, dur: 0.35, src: 'act3', at: ['a3_vote_click', 0.15], zoom: 2.1, focus: 'embed', fx: 0.42, fy: 0.62,
    evidence: 'Recap 1/3 — one click changes the number. This is the whole product in a third of a second.' },
  { id: 'recap-filter',  t: 29.35, dur: 0.35, src: 'act3', at: ['a3_effort_click', 0.10], zoom: 2.1, focus: 'embed', fx: 0.74, fy: 0.12,
    evidence: 'Recap 2/3 — filtering re-ranks the list, live.' },
  { id: 'recap-chart',   t: 29.70, dur: 0.35, src: 'act3', at: ['a3_vote_settled', 0.20], zoom: 2.1, focus: 'embed', fx: 0.80, fy: 0.55,
    evidence: 'Recap 3/3 — the chart follows the votes.' },
  { id: 'recap-publish', t: 30.05, dur: 1.00, src: 'act2', at: ['a2_publish_click', -0.20], zoom: 1.9, focus: 'target',
    evidence: 'Step two, restated: publish the page.' },
  { id: 'last-run',      t: 31.05, dur: 1.30, src: 'act3', at: ['a3_final_filter', -0.30],
    evidence: 'Closing on the idea running, in the hands of someone who is not its author.' },

  // ── End card ─────────────────────────────────────────────────────────────
  { id: 'card-logo',     t: 32.35, dur: 1.05, src: 'endcard', at: ['card1', 0], evidence: 'Product identity — who this is from.' },
  { id: 'card-market',   t: 33.40, dur: 0.90, src: 'endcard', at: ['card2', 0], evidence: 'Where to get it: a listing verified public at export time.' },
  { id: 'card-cta',      t: 34.30, dur: 0.70, src: 'endcard', at: ['card3', 0], evidence: 'The single conversion goal is install — one CTA, held long enough to read.' },
];

export interface ShotProblem {
  id: string;
  problem: string;
}

/**
 * Structural rules the director called out explicitly. These are asserted, not trusted, because the
 * failure mode ("the magic beat got trimmed to 0.6s during a re-time") is invisible until someone
 * watches the export and can't say why it feels wrong.
 */
export function validateShots(shots: Shot[] = SHOTS, duration = FILM_DURATION): ShotProblem[] {
  const problems: ShotProblem[] = [];
  let expected = 0;
  for (const s of shots) {
    if (Math.abs(s.t - expected) > 1e-6) {
      problems.push({ id: s.id, problem: `starts at ${s.t}s but previous shot ends at ${expected.toFixed(2)}s (gap or overlap)` });
    }
    if (s.dur <= 0) problems.push({ id: s.id, problem: 'non-positive duration' });
    if (!s.evidence || s.evidence.length < 8) problems.push({ id: s.id, problem: 'no evidence claim — every shot must prove something' });
    if (s.src !== 'endcard' && !s.at) problems.push({ id: s.id, problem: 'captured shot has no mark anchor' });
    expected = +(s.t + s.dur).toFixed(6);
  }
  if (Math.abs(expected - duration) > 1e-6) {
    problems.push({ id: '<film>', problem: `shots total ${expected}s, expected ${duration}s` });
  }

  const byId = (id: string) => shots.find((s) => s.id === id);
  const magic = byId('it-runs');
  if (!magic || magic.dur < 1.0) problems.push({ id: 'it-runs', problem: 'the magic beat must hold >= 1.0s untouched' });
  const nowWhat = byId('now-what');
  if (!nowWhat || nowWhat.dur < 1.5) problems.push({ id: 'now-what', problem: 'the "Now what?" hold must be >= 1.5s' });
  if (nowWhat && !nowWhat.dim) problems.push({ id: 'now-what', problem: 'the "Now what?" beat must dim the frame' });
  return problems;
}

/** Which source clips the edit actually needs — used to fail fast before ffmpeg runs. */
export function requiredSources(shots: Shot[] = SHOTS): Src[] {
  return [...new Set(shots.map((s) => s.src))];
}
