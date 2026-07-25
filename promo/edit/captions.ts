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
  { text: 'Bring it to your team', start: 8.5, end: 10.2 },
  { text: 'Insert Mini Sites', start: 10.4, end: 12.2 },
  { text: 'Upload the folder', start: 12.4, end: 14.4 },
  { text: 'No screenshots', start: 15.1, end: 16.1 },
  { text: 'No extra links', start: 16.3, end: 17.2 },
  { text: 'Publish', start: 17.4, end: 18.5 },
  { text: 'It runs', start: 19.0, end: 20.1 },
  // Ends at 21.7, before the Vote click at 21.80: at 22.4 the plate covered the button by 11px at
  // the exact frame it was pressed. Re-timing the cue is cleaner than fighting the crop geometry.
  { text: 'Right inside Confluence', start: 20.3, end: 21.7 },
  { text: 'Not a screenshot', start: 23.1, end: 24.9 },
  { text: 'Where the work happens', start: 25.1, end: 26.3 },
  { text: 'Let your team try it', start: 26.7, end: 29.3 },
  { text: 'Let the idea run', start: 29.6, end: 31.2 },
  // Each closing line now gets a full second to be read, instead of ~0.85s.
  { text: 'Bring AI-built interactive websites\\Ninto Confluence', start: 31.55, end: 32.65, pos: 'end' },
  // "Install Mini Sites." was cut (2026-07-22): the lockup already names the product and the
  // Marketplace line already says where — a third end cue restated both and earned nothing. The
  // Marketplace line takes the reclaimed time; the last beat holds the clean brand card.
  { text: 'Available on the Atlassian Marketplace', start: 32.80, end: 34.80, pos: 'end' },
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
  // Helvetica Neue, regular weight (2026-07-22): subtitle standards are unanimous on plain
  // sans-serif — YouTube burns Roboto, Netflix specs regular-weight sans over a semi-transparent
  // box, BBC mandates Tiresias. Avenir Next Heavy read as display type shouting over the film.
  // Helvetica Neue is the closest installed face to the Arial/Helvetica/Roboto shortlist.
  const fontName = opts.fontName ?? 'Helvetica Neue';
  const fontSize = opts.fontSize ?? 56;

  // &HAABBGGRR — ASS colours are BGR with an INVERTED alpha byte (00 = opaque, FF = transparent).
  //
  // Lower-third treatment (2026-07-22, third iteration): a FULL-BLEED parchment band — the icon's
  // own ground (#F4ECDD) — with ink type on it. BorderStyle 3 can only box the text's own width, so
  // the band is not a style at all: each banded cue emits a layer-0 drawing event (a screen-wide
  // rectangle in \p1 vector mode) under its layer-1 text, both on the same fade so they move as one.
  // The band's vertical extent reuses the calibrated plate geometry (rows 792-879 at 1080p), which
  // is exactly what safezone.captionRect already models — full width, same rows — so the caption/
  // action collision arithmetic is untouched.
  // Netflix-style placement: low in the frame (12% bottom margin, was 20%) with a semi-transparent
  // band (~67% opaque, was 92%) so the film stays visible through it.
  const textH = Math.round(fontSize * 1.286);
  const marginV = Math.round(height * 0.12);
  const bandY = height - marginV - textH;
  const bandH = textH + 15;
  const BAND = '&H55DDECF4'; // parchment #F4ECDD, ~67% opaque
  const INK = '&H003E2315'; // ink #15233E
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
    // Lower is bare ink type at REGULAR weight (Bold off — subtitles are text, not display).
    `Style: Lower,${fontName},${fontSize},${INK},${INK},&H00000000,&H00000000,0,0,0,0,100,100,0.4,0,1,0,0,2,180,180,${marginV},1`,
    `Style: Band,Arial,20,${BAND},${BAND},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1`,
    // "Now what?" gets NO plate (2026-07-22): the shot under it is already dimmed to 55%, and a
    // solid box in the quietest moment of the film read as a loud sticker. Bare white type with a
    // soft shadow sits IN the dimmed frame instead of on top of it.
    `Style: Center,${fontName},${Math.round(fontSize * 1.18)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,2.0,0,1,0,4,5,180,180,0,1`,
    // The closing cues sit BELOW centre: the end card's own lockup occupies the middle of the frame, and
    // a centred cue printed straight across the "Mini Sites" wordmark on all three closing stills.
    // No plate here — since the end card went parchment (2026-07-22) these are INK text on light
    // ground, bare: no outline, no shadow. A box would look like a sticker on a clean brand frame.
    `Style: End,${fontName},${Math.round(fontSize * 1.06)},&H003E2315,&H003E2315,&H00000000,&H00000000,-1,0,0,0,100,100,2.0,0,1,0,0,2,180,180,${Math.round(height * 0.09)},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ].join('\n');

  const events = cues.flatMap((cue) => {
    const style = cue.pos === 'center' ? 'Center' : cue.pos === 'end' ? 'End' : 'Lower';
    // Whole-sentence fade, 220ms in / 220ms out. Never a per-character reveal.
    const body = `{\\fad(220,220)}${cue.text}`;
    const text = `Dialogue: 1,${assTime(cue.start)},${assTime(cue.end)},${style},,0,0,0,,${body}`;
    if (style !== 'Lower') return [text];
    // The full-bleed parchment band under this cue, fading with it. No edge rule: at ~67% opacity
    // the band reads as a wash, and a drawn edge on a wash looked like a ruled form.
    const rect = `m 0 0 l ${width} 0 l ${width} ${bandH} l 0 ${bandH}`;
    const band = `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Band,,0,0,0,,{\\an7\\pos(0,${bandY})\\fad(220,220)\\p1}${rect}{\\p0}`;
    return [band, text];
  });

  return `${header}\n${events.join('\n')}\n`;
}
