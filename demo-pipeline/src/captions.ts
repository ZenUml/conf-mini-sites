// Scene-level caption cue generation (design doc, "Contracts" / "Testing and evidence gates": "generate valid
// non-overlapping SRT/VTT cues").
//
// This module builds on `DemoPlan` (not raw narration text + duration separately) — a compiled `DemoPlan`
// already carries each scene's narration script, its measured duration, and the scene's computed
// `startMs`/lead-in padding, so deriving cue placement from it avoids re-deriving (and risking drift from)
// `plan.ts`'s timing rules. It returns structured cue data, not files: this task must stay pure and testable
// without a filesystem (design doc, "Testing and evidence gates": "Pure tests run without network or
// credentials") — a later render task (Task 5) is expected to write `toSRT`/`toVTT`'s output to disk.
//
// No filesystem, no browser — only pure functions over `DemoPlan` data.
import type { DemoPlan } from './plan';
import { SCENE_LEAD_IN_MS } from './plan';

/** Raised when cue placement derived from a `DemoPlan` would violate the monotonic/non-overlapping invariant
 *  (design doc: "generate valid non-overlapping SRT/VTT cues"). `compileDemoPlan` always produces plans that
 *  satisfy this — a scene's lead-out plus the next scene's lead-in separate consecutive cues by at least
 *  `SCENE_LEAD_IN_MS + SCENE_LEAD_OUT_MS` — so this is a defensive check against a hand-built or corrupted
 *  `DemoPlan`, not a reachable path for the compiler's own output. */
export class CaptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptionValidationError';
  }
}

/** One caption cue: a 1-based display index (SRT/VTT convention) and a millisecond time window, matching
 *  `DemoPlan`'s time unit. `text` is the raw, unescaped narration script — `toSRT`/`toVTT` apply
 *  format-specific escaping when serializing. */
export interface CaptionCue {
  readonly index: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

/** Derive one caption cue per scene from a compiled `DemoPlan`, in scene order. Each cue starts
 *  `SCENE_LEAD_IN_MS` after its scene begins (matching when narration audio starts, per `plan.ts`'s timing
 *  rule) and spans exactly the scene's narration duration — it deliberately excludes the lead-in/lead-out
 *  padding, which has no narration or caption text of its own. */
export function buildCaptionCues(plan: Pick<DemoPlan, 'scenes'>): CaptionCue[] {
  const cues: CaptionCue[] = [];
  let previousEndMs = 0;
  plan.scenes.forEach((scene, i) => {
    const startMs = scene.startMs + SCENE_LEAD_IN_MS;
    const endMs = startMs + scene.narration.durationMs;
    if (startMs < previousEndMs) {
      throw new CaptionValidationError(
        `caption cue for scene "${scene.id}" would start (${startMs}ms) before the previous cue ends (${previousEndMs}ms)`,
      );
    }
    if (endMs <= startMs) {
      throw new CaptionValidationError(`caption cue for scene "${scene.id}" has non-positive duration`);
    }
    cues.push({ index: i + 1, startMs, endMs, text: scene.narration.script });
    previousEndMs = endMs;
  });
  return cues;
}

// ---------------------------------------------------------------------------------------------------------
// SRT / VTT serialization.
//
// Both formats are line-based: each cue is an index line, a timestamp line, one or more text lines, and a
// blank line separating cues. Narration text is authored prose, not markup — it can contain the literal
// substring "-->" (which would collide with the timestamp line's arrow if a lenient parser scanned cue text
// for it) or, for VTT specifically, characters ("&", "<", ">") that WebVTT's cue-text grammar treats as the
// start of markup/entities. Both escaping functions below normalize newlines first so a cue's text lines are
// always plain "\n"-separated (SRT/VTT do not use "\r").
// ---------------------------------------------------------------------------------------------------------

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/** Break any literal "-->" inside cue text with an invisible zero-width space (U+200B) so the exact 3-byte
 *  sequence a cue-timing arrow parser scans for never appears in text content, while the text still reads
 *  identically to a human or a screen reader. */
function breakArrowSequence(text: string): string {
  return text.replace(/-->/g, '--​>');
}

function escapeSrtText(text: string): string {
  // Classic SRT has no entity/markup-escaping convention — some players interpret a few inline tags
  // (<b>, <i>) literally, but blindly HTML-escaping "&"/"<"/">" here would corrupt plain prose that
  // legitimately contains them (a player displays "&amp;" literally, not "&"). Only the timing-arrow
  // collision is neutralized.
  return breakArrowSequence(normalizeNewlines(text));
}

function escapeVttText(text: string): string {
  // WebVTT cue text IS markup-aware (a bare "<" can start a tag span), so "&", "<", ">" must be entity-
  // escaped to guarantee narration text is always rendered as literal text, never interpreted as markup.
  // Escaping ">" already turns any "-->" into "--&gt;", but breakArrowSequence runs anyway as an explicit,
  // format-symmetric defense that doesn't depend on entity-escaping order.
  const entityEscaped = normalizeNewlines(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return breakArrowSequence(entityEscaped);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Format a millisecond offset as SRT's `HH:MM:SS,mmm`. */
function formatSrtTimestamp(ms: number): string {
  const totalMs = Math.round(ms);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const millis = totalMs % 1_000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/** Format a millisecond offset as WebVTT's `HH:MM:SS.mmm` — identical to SRT but with a period instead of a
 *  comma before the milliseconds. */
function formatVttTimestamp(ms: number): string {
  return formatSrtTimestamp(ms).replace(',', '.');
}

/** Serialize cues as SubRip (.srt). Cues must already be sorted and non-overlapping (as `buildCaptionCues`
 *  guarantees) — this function does not re-validate or reorder them. */
export function toSRT(cues: readonly CaptionCue[]): string {
  return cues
    .map((cue) => `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${escapeSrtText(cue.text)}\n`)
    .join('\n');
}

/** Serialize cues as WebVTT (.vtt), including the required `WEBVTT` file header. */
export function toVTT(cues: readonly CaptionCue[]): string {
  const body = cues
    .map((cue) => `${cue.index}\n${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}\n${escapeVttText(cue.text)}\n`)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}
