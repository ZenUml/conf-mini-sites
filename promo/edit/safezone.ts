// Enforces the director's placement rule — "字幕不得遮挡产品关键操作": a caption may never cover the
// control the shot is about.
//
// This used to be checked by eye on contact sheets, which is exactly as reliable as it sounds: a review
// pass claimed "It runs." was sitting on the embed when it in fact cleared it by 20px. Every filmed
// click already records the bounding box of what it clicked, and every shot records its zoom and crop
// centre, so the question is arithmetic, not judgement.
import { CUES, type Cue, type CuePos } from './captions';
import { SHOTS, type Shot } from './shots';
import { H, W, type Box, type LogEntry } from './assemble';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where a caption's band actually lands, in output pixels. Since the band became an explicit
 * full-width drawing event (2026-07-22) its geometry is DERIVED, not calibrated: toAss draws
 * y = H - marginV - textH with h = textH + 15, marginV = 0.12*H — rows 878-965 at 1080p.
 */
export function captionRect(pos: CuePos | undefined, fontSize = 56, height = H): Rect {
  // Keep these formulas in lockstep with toAss()'s band maths — they are the same numbers.
  const textH = Math.round(fontSize * 1.286);
  const plateH = textH + 15;
  const band = (marginV: number, fs: number): Rect => {
    const t = Math.round(fs * 1.286);
    return { x: 0, y: height - marginV - t, w: W, h: t + 15 };
  };
  if (pos === 'center') {
    const fs = Math.round(fontSize * 1.18);
    const h = Math.round(fs * 1.286) + 15;
    return { x: 0, y: Math.round(height / 2 - h / 2), w: W, h };
  }
  // End cues moved to 0.09*H when the Lower band went down to 0.12*H — they stay the lowest thing.
  if (pos === 'end') return band(Math.round(height * 0.09), Math.round(fontSize * 1.06));
  void plateH;
  void textH;
  return band(Math.round(height * 0.12), fontSize);
}

/** Map a point from source-capture space into the shot's cropped-and-rescaled output frame. */
export function projectPoint(px: number, py: number, shot: Shot, centre: { cx: number; cy: number }): { x: number; y: number } {
  const z = shot.zoom ?? 1;
  if (z === 1) return { x: px, y: py };
  const cw = Math.round(W / z / 2) * 2;
  const ch = Math.round(H / z / 2) * 2;
  const x0 = Math.max(0, Math.min(W - cw, Math.round(centre.cx * W - cw / 2)));
  const y0 = Math.max(0, Math.min(H - ch, Math.round(centre.cy * H - ch / 2)));
  return { x: (px - x0) * z, y: (py - y0) * z };
}

export function projectBox(box: Box, shot: Shot, centre: { cx: number; cy: number }): Rect {
  const a = projectPoint(box.x, box.y, shot, centre);
  const b = projectPoint(box.x + box.width, box.y + box.height, shot, centre);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Cues whose on-screen time intersects this shot. */
export function cuesDuring(shot: Shot, cues: Cue[] = CUES): Cue[] {
  const end = shot.t + shot.dur;
  return cues.filter((c) => c.start < end && c.end > shot.t);
}

/**
 * When the shot's anchor mark occurs, in FILM time. A shot anchored `['a3_vote_click', -0.35]` starts
 * 0.35s before the click, so the click lands 0.35s into the shot.
 */
export function markFilmTime(shot: Shot): number {
  return shot.t - (shot.at?.[1] ?? 0);
}

/** Cues on screen at the instant of the click, which is the only instant the rule is about. */
export function cuesAtClick(shot: Shot, cues: Cue[] = CUES): Cue[] {
  const t = markFilmTime(shot);
  return cues.filter((c) => c.start <= t && c.end >= t);
}

export interface Collision {
  shot: string;
  cue: string;
  overlapPx: number;
}

/**
 * Every shot anchored to a click, checked against every caption on screen while it plays.
 * `boxOf` supplies the recorded geometry for a mark (the capture writes it into actions.jsonl).
 */
export function findCollisions(
  boxOf: (mark: string) => Box | null,
  centreOf: (shot: Shot) => { cx: number; cy: number },
  shots: Shot[] = SHOTS,
  cues: Cue[] = CUES,
): Collision[] {
  const out: Collision[] = [];
  for (const shot of shots) {
    const mark = shot.at?.[0];
    if (!mark || !/click/.test(mark)) continue; // only shots whose subject IS an action
    const box = boxOf(mark);
    if (!box) continue;
    const target = projectBox(box, shot, centreOf(shot));
    // Only the click instant counts. A caption that covers a button 0.4s AFTER it was pressed, while
    // the panel it opened is the actual subject, is not what the rule is guarding against.
    for (const cue of cuesAtClick(shot, cues)) {
      const cap = captionRect(cue.pos);
      if (overlaps(target, cap)) {
        const dy = Math.min(target.y + target.h, cap.y + cap.h) - Math.max(target.y, cap.y);
        out.push({ shot: shot.id, cue: cue.text.replace(/\\N/g, ' '), overlapPx: Math.round(dy) });
      }
    }
  }
  return out;
}

/** Convenience for the CLI/report path: pull boxes straight out of a capture's action log. */
export function boxLookup(entries: LogEntry[]): (mark: string) => Box | null {
  return (mark: string) => entries.find((e) => e.mark === mark)?.box ?? null;
}
