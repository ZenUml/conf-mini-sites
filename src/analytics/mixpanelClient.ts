// Mixpanel Import-API sender — mirrors conf-app's functions/service/mixpanelService.ts
// (mixpanelImportServiceEvents / toMixpanelImportEvent) almost verbatim: raw fetch, Basic auth over the
// project token, no SDK. Deliberately NOT the `mixpanel-browser` package conf-app's frontend uses (that
// path needs a live DOM + CSP script-src + client-side egress permission for session-replay/autocapture
// conf-mini-sites has no use for) — the raw-fetch service path is the zero-dependency, Worker-native
// choice, and it's the one already proven for backend/service events with no live user session.

import type { MixpanelServiceEvent } from './miniSiteEvents';

const IMPORT_ENDPOINT = 'https://api.mixpanel.com/import';

export interface SendMiniSiteEventsOptions {
  /** Mixpanel project token. Undefined/empty ⇒ silent no-op (analytics not configured yet — this must
   *  never be a reason publish/serve/render fails). */
  readonly token: string | undefined;
  /** Injected fetch — a fake in tests, the Worker/Node global in production. */
  readonly fetchImpl?: typeof fetch;
  /** Override for tests; defaults to the real Import API endpoint. */
  readonly endpoint?: string;
}

function toImportPayload(event: MixpanelServiceEvent, token: string): Record<string, unknown> {
  return {
    event: event.event,
    properties: {
      ...event.properties,
      token,
      time: event.time,
      $insert_id: event.insertId,
      distinct_id: event.distinctId,
    },
  };
}

/**
 * Best-effort send of one or more Mixpanel service events. NEVER throws or rejects: a Mixpanel outage,
 * a missing token, or a malformed response must not affect the publish/serve/render request it rides
 * alongside, so every failure is caught and logged here rather than surfaced to the caller. Callers can
 * hand this straight to `ctx.waitUntil(...)` without an extra `.catch()` of their own.
 */
export async function sendMiniSiteEvents(
  events: readonly MixpanelServiceEvent[],
  opts: SendMiniSiteEventsOptions,
): Promise<void> {
  if (events.length === 0) return;
  if (!opts.token) return; // not configured yet — silent no-op, never blocks the caller
  const doFetch = opts.fetchImpl ?? fetch;
  const endpoint = opts.endpoint ?? IMPORT_ENDPOINT;
  const token = opts.token;
  const body = events.map((e) => toImportPayload(e, token));

  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${btoa(`${token}:`)}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`mini-sites: mixpanel import failed with status ${res.status}`);
    }
  } catch (e) {
    console.error('mini-sites: mixpanel import threw', e instanceof Error ? e.message : String(e));
  }
}
