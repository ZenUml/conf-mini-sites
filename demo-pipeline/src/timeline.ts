// Append-only ActionEvent JSONL writer (design doc, "Contracts": "ActionEvent JSONL: monotonic timestamp,
// scene, operation, lifecycle (start, success, failure), and non-secret metadata"; "Data flow and timing",
// step 6: "Write ActionEvent timestamps against one monotonic run clock"; "Error handling and recovery":
// "Logs redact values of known credential environment variables").
//
// This is the only one of plan.ts/captions.ts/timeline.ts that touches the filesystem — kept fs-boundary-
// isolated the same way `story.ts` isolates evidence-file I/O from the pure `contracts.ts`. Everything else
// in this module (redaction, JSON-line formatting) is a pure function; the writer class is a thin stateful
// shell around them.
//
// The clock is always an injected parameter (`MonotonicClock`), never read from `Date.now()` or any other
// global directly inside this module — a real run wires a genuine monotonic clock (e.g.
// `() => Date.now()` or `process.hrtime`-derived) at the CLI boundary (Task 7); tests inject deterministic
// fake clocks instead, so `timeline.test.ts` never depends on real wall-clock time.
import { renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { canonicalJSONStringify } from './contracts';

/** The only ActionEvent schema version this PoC understands (design doc, "every artifact ... is written as
 *  JSON" with `schemaVersion: 1`). */
export const ACTION_EVENT_SCHEMA_VERSION = 1 as const;

/** An action's lifecycle stage, matching the design doc's "lifecycle (start, success, failure)". */
export type ActionEventLifecycle = 'start' | 'success' | 'failure';

/** One line of the JSONL timeline. `timestampMs` comes from the writer's injected `MonotonicClock`, never
 *  from a global clock read inside this module. `metadata` is free-form but redacted (see
 *  `ActionEventTimelineWriter`'s `secretValues` constructor argument) before it is ever written to disk. */
export interface ActionEvent {
  readonly schemaVersion: typeof ACTION_EVENT_SCHEMA_VERSION;
  readonly timestampMs: number;
  readonly sceneId: string;
  readonly operation: string;
  readonly lifecycle: ActionEventLifecycle;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Returns the current instant as a number, in whatever unit the caller's run considers monotonic
 *  (milliseconds is the convention this whole pipeline uses elsewhere). Always supplied by the caller —
 *  `ActionEventTimelineWriter` never calls `Date.now()` or any other global clock itself, so its output is
 *  fully determined by the clock it's given. */
export type MonotonicClock = () => number;

/** The value every redacted secret is replaced with in written metadata. Chosen to be unambiguous in a JSONL
 *  diff/grep and to never collide with a real metadata value. */
export const REDACTION_MARKER = '[REDACTED]';

/** Resolve a list of environment variable *names* (design doc: "known credential environment variables") to
 *  their current values in `process.env`, dropping any that are unset/empty. This is a convenience for
 *  callers (Task 7's CLI) that want to configure redaction by env var name rather than by literal value —
 *  `ActionEventTimelineWriter` itself only ever deals in literal secret values, never env var names, so it
 *  stays agnostic to where a "secret" actually lives. */
export function resolveSecretEnvVarValues(envVarNames: readonly string[]): string[] {
  const values: string[] = [];
  for (const name of envVarNames) {
    const value = process.env[name];
    if (value) values.push(value);
  }
  return values;
}

/** Recursively replace any string in `value` that contains one of `secrets` as a substring with
 *  `REDACTION_MARKER` in place of every matching occurrence. Walks plain objects and arrays; leaves numbers,
 *  booleans, null, and undefined untouched. Substring (not just exact-match) replacement so a secret embedded
 *  inside a longer message (e.g. an error string like "Bearer <token>") is still fully redacted, not just a
 *  metadata value that equals the secret verbatim. */
function redactValue(value: unknown, secrets: readonly string[]): unknown {
  if (typeof value === 'string') {
    let redacted = value;
    for (const secret of secrets) {
      if (secret.length === 0) continue;
      redacted = redacted.split(secret).join(REDACTION_MARKER);
    }
    return redacted;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, secrets));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = redactValue(entry, secrets);
    }
    return result;
  }
  return value;
}

/** Append-only writer for one run's `ActionEvent` timeline.
 *
 *  Events are buffered in memory as `append()` is called and only written to `outputPath` when `close()`
 *  runs. `close()` writes the complete JSONL contents to a sibling temp file and then `rename()`s it into
 *  place — `rename` is atomic on the same filesystem (POSIX and Windows both guarantee this for a rename
 *  within one volume) — so a crash between `writeFileSync` and `renameSync`, or any crash before `close()` is
 *  called at all, can never leave a partially-written or corrupt file at `outputPath`: a reader only ever
 *  observes the complete file or no file. This trades "events are durable the instant `append()` is called"
 *  (which a real per-line `appendFileSync` stream would give, at the cost of a torn last line on a mid-write
 *  crash) for "the output file is never partially written" — the right tradeoff for a short-lived CLI run
 *  where losing the whole in-memory timeline on a hard crash is no worse than losing the run itself. */
export class ActionEventTimelineWriter {
  private readonly events: ActionEvent[] = [];
  private closed = false;

  constructor(
    private readonly outputPath: string,
    private readonly clock: MonotonicClock,
    private readonly secretValues: readonly string[] = [],
  ) {}

  /** Record one event, stamped with `this.clock()`. Metadata is redacted against the writer's configured
   *  secret values before being stored — the unredacted value is never held past this call. Throws if the
   *  writer has already been closed. */
  append(sceneId: string, operation: string, lifecycle: ActionEventLifecycle, metadata: Readonly<Record<string, unknown>> = {}): ActionEvent {
    if (this.closed) {
      throw new Error('cannot append to a closed ActionEventTimelineWriter');
    }
    const event: ActionEvent = {
      schemaVersion: ACTION_EVENT_SCHEMA_VERSION,
      timestampMs: this.clock(),
      sceneId,
      operation,
      lifecycle,
      metadata: redactValue(metadata, this.secretValues) as Readonly<Record<string, unknown>>,
    };
    this.events.push(event);
    return event;
  }

  /** Flush every appended event to `outputPath` as newline-delimited canonical JSON and mark the writer
   *  closed. Idempotent ONLY on success: a repeated call after a *successful* close is a no-op rather than
   *  re-writing the file or throwing, so callers don't need to track whether they already closed it (e.g. a
   *  `finally` block after an earlier explicit close on the success path). If the write or rename throws
   *  (disk full, permission error, output directory doesn't exist yet), the writer is NOT marked closed — the
   *  exception propagates, the buffered events are retained, and a caller that retries `close()` re-attempts
   *  the write rather than silently no-op'ing. This matches the design doc's own invariant for this module:
   *  "A phase writes its manifest atomically only after success." */
  close(): void {
    if (this.closed) return;

    const contents = this.events.map((event) => canonicalJSONStringify(event)).join('\n') + (this.events.length > 0 ? '\n' : '');
    // Suffixed with a random UUID (not a timestamp) so concurrent runs targeting the same output directory
    // never collide on the temp filename, without this fs-boundary module ever reading a wall clock itself.
    const tempPath = `${this.outputPath}.tmp-${randomUUID()}`;
    writeFileSync(tempPath, contents, 'utf-8');
    renameSync(tempPath, this.outputPath);

    // Only reached once the write+rename have both actually succeeded — see the doc comment above.
    this.closed = true;
  }
}
