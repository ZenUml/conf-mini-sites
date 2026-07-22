// Caption track for the 35s promo, emitted as ASS (not SRT) because the director's notes require things
// SRT cannot express: per-cue fade-in of a whole sentence (never a typewriter), per-cue vertical
// placement so a caption never sits on top of the control being clicked, and a translucent plate so
// white text stays legible over Confluence's near-white page.
//
// Placement rule: LinkedIn overlays chrome across roughly the bottom 15% and the video is watched muted,
// so cues live at ~78% height by default — low enough to stay out of the product action, high enough to
// survive the platform's own UI. `center` is reserved for the two moments the frame IS the message
// ("Now what?" and the end card).

export type CuePos = 'lower' | 'center' | 'end';

export interface Cue {
  text: string;
  /** seconds */
  start: number;
  end: number;
  pos?: CuePos;
}

/**
 * 17 cues. The script's two recap lines ("Upload the folder." / "Publish the page." at 29-31s) were cut
 * with the recap section they captioned: the first repeated cue #5 verbatim over footage of the product
 * being USED rather than uploaded, which made a caption assert what its frame did not show.
 *
 * In order. Timings are keyed to the beat sheet in shots.json.
 *
 * Two director constraints are encoded here and asserted by validateCues():
 *  - "Now what?" holds ~1.9s in near-silence — it is the emotional hinge of the film.
 *  - "It runs." lands at 19.0s, one full second AFTER the mini-site appears in Confluence, so the
 *    viewer registers the magic before being told what it is.
 */
export const CUES: Cue[] = [
  { text: 'Built something with AI?', start: 0.35, end: 3.2 },
  { text: 'Now what?', start: 6.45, end: 8.3, pos: 'center' },
  { text: 'Bring it to your team.', start: 8.5, end: 10.2 },
  { text: 'Insert Mini Sites.', start: 10.4, end: 12.2 },
  { text: 'Upload the folder.', start: 12.4, end: 14.4 },
  { text: 'No screenshots.', start: 15.1, end: 16.1 },
  { text: 'No extra links.', start: 16.3, end: 17.2 },
  { text: 'Publish.', start: 17.4, end: 18.5 },
  { text: 'It runs.', start: 19.0, end: 20.1 },
  { text: 'Right inside Confluence.', start: 20.3, end: 22.4 },
  { text: 'Not a screenshot.', start: 23.1, end: 24.9 },
  { text: 'Where the work happens.', start: 25.1, end: 26.3 },
  { text: 'Let your team try it.', start: 26.7, end: 29.3 },
  { text: 'Let the idea run.', start: 29.6, end: 31.2 },
  // Each closing line now gets a full second to be read, instead of ~0.85s.
  { text: 'Bring AI-built interactive websites\\Ninto Confluence.', start: 31.55, end: 32.65, pos: 'end' },
  { text: 'Available on the Atlassian Marketplace.', start: 32.80, end: 33.80, pos: 'end' },
  { text: 'Install Mini Sites.', start: 33.95, end: 35.0, pos: 'end' },
];

/** ASS wants H:MM:SS.cc (centiseconds). */
export function assTime(seconds: number): string {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

export interface CueProblem {
  index: number;
  text: string;
  problem: string;
}

/**
 * Enforce the director's caption rules mechanically, so a late edit can't quietly break them:
 * ≤6 words per screen, monotonic, non-overlapping, and inside the film's duration.
 */
export function validateCues(cues: Cue[] = CUES, durationS = 35): CueProblem[] {
  const problems: CueProblem[] = [];
  cues.forEach((cue, i) => {
    const words = cue.text.replace(/\\N/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (words.length > 6) problems.push({ index: i, text: cue.text, problem: `${words.length} words (max 6)` });
    if (cue.end <= cue.start) problems.push({ index: i, text: cue.text, problem: 'end <= start' });
    if (cue.start < 0 || cue.end > durationS)
      problems.push({ index: i, text: cue.text, problem: `outside 0..${durationS}s` });
    if (i > 0) {
      const prev = cues[i - 1];
      if (cue.start < prev.end) problems.push({ index: i, text: cue.text, problem: `overlaps previous (${prev.text})` });
    }
  });
  return problems;
}

/** The muted-viewing check: the cue text alone has to carry the whole story. */
export function cueStory(cues: Cue[] = CUES): string {
  return cues.map((c) => c.text.replace(/\\N/g, ' ')).join(' ');
}

export interface AssOptions {
  width?: number;
  height?: number;
  fontName?: string;
  fontSize?: number;
}

export function toAss(cues: Cue[] = CUES, opts: AssOptions = {}): string {
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  const fontName = opts.fontName ?? 'Helvetica Neue';
  const fontSize = opts.fontSize ?? 62;

  // &HAABBGGRR — ASS colours are BGR with an INVERTED alpha byte (00 = opaque, FF = transparent).
  // BorderStyle 3 + a translucent BackColour gives the legibility plate; Outline is its padding.
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    // Alignment 2 = bottom-centre, 5 = middle-centre (with \an overrides per cue anyway).
    `Style: Lower,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0140A0A,-1,0,0,0,100,100,0.6,0,3,18,0,2,180,180,${Math.round(height * 0.2)},1`,
    `Style: Center,${fontName},${Math.round(fontSize * 1.18)},&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0140A0A,-1,0,0,0,100,100,1.2,0,3,22,0,5,180,180,0,1`,
    // The closing cues sit BELOW centre. The end card's own lockup occupies the middle of the frame, and
    // a centred cue printed straight across the "Mini Site" wordmark on all three closing stills.
    `Style: End,${fontName},${Math.round(fontSize * 1.02)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80140A0A,-1,0,0,0,100,100,0.8,0,3,16,0,2,180,180,${Math.round(height * 0.13)},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');

  const events = cues.map((cue) => {
    const style = cue.pos === 'center' ? 'Center' : cue.pos === 'end' ? 'End' : 'Lower';
    // Whole-sentence fade, 220ms in / 220ms out. Never a per-character reveal.
    const body = `{\\fad(220,220)}${cue.text}`;
    return `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},${style},,0,0,0,,${body}`;
  });

  return `${header}\n${events.join('\n')}\n`;
}
