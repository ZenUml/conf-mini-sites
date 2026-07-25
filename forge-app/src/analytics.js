// Mixpanel forwarder for the Forge resolver side of the funnel — mirrors the raw-fetch Import API style
// of the root Workers' src/analytics/mixpanelClient.ts (itself copied from conf-app's
// functions/service/mixpanelService.ts): no SDK, one POST, Basic auth over the project token,
// best-effort (never throws, never blocks a resolver response).
//
// Duplicated here rather than imported from src/analytics/ because forge-app is a SEPARATE pnpm package
// with its OWN Forge bundler (CLAUDE.md: "forge-app/ — the Forge app (separate pnpm package)") that only
// resolves files inside forge-app/ — it cannot reach the root src/ tree. Keep the event catalog in sync
// by hand with src/analytics/miniSiteEvents.ts's header comment (naming convention, privacy rules,
// common dimensions); this file only forwards the THREE events that can only originate in the Custom UI
// (no server-side signal for them): the macro rendering, the Publisher modal opening, and a folder pick.
//
// Egress: Forge Custom UI / resolver code cannot use the platform `fetch` global for external hosts —
// only requests routed through `@forge/api`'s `fetch` (or a declared `remote` via invokeRemote) actually
// leave the Forge sandbox, and only to hosts listed under manifest.yml's `permissions.external.fetch.
// backend` (api.mixpanel.com is declared there). See index.js's header comment for the invokeRemote/FIT
// vs api.fetch distinction — this path is the latter (no FIT, doesn't need one: Mixpanel isn't the
// control Worker, there's nothing to authorize here beyond the project token itself).
import { fetch as forgeFetch } from '@forge/api';

const IMPORT_ENDPOINT = 'https://api.mixpanel.com/import';

/** Event names the Custom UI is allowed to originate via trackEvent — everything else in the catalog
 *  (validation/secret-scan/publish/render outcomes, license-blocked-publish) is tracked server-side
 *  where the real outcome is known, never trusted from the client. */
export const CLIENT_TRACKABLE_EVENT_NAMES = new Set([
  'mini_site_macro_viewed',
  'mini_site_publisher_opened',
  'mini_site_folder_selected',
]);

const UNKNOWN_CLOUD_ID = 'unknown_cloud_id';
const UNKNOWN_ACCOUNT_ID = 'unknown_account_id';
const UNKNOWN_INSTANCE_ID = 'unknown_instance_id';
const UNKNOWN_ENVIRONMENT_TYPE = 'unknown_environment_type';

/**
 * Send one Mixpanel event via the Import API. Best-effort: any failure (missing token, network,
 * non-2xx) is caught and logged, never thrown — analytics must never break a resolver call.
 *
 * @param {string} name one of the MINI_SITE_EVENT_NAMES catalog (src/analytics/miniSiteEvents.ts)
 * @param {Record<string, string|number|boolean|null|undefined>} properties event-specific properties —
 *   counts/sizes/durations/outcome enums only, never file names/contents/page content (see the header
 *   comment on src/analytics/miniSiteEvents.ts for the full privacy rule this mirrors).
 * @param {{ cloudId?: string, accountId?: string, instanceId?: string, environmentType?: string }} context
 */
export async function sendMixpanelEvent(name, properties, context) {
  const token = process.env.MIXPANEL_TOKEN;
  if (!token) return; // not configured yet — silent no-op, never blocks the caller

  const ctx = context || {};
  const distinctId = ctx.accountId || ctx.cloudId || ctx.instanceId || UNKNOWN_ACCOUNT_ID;
  const payload = [
    {
      event: name,
      properties: {
        ...properties,
        cloud_id: ctx.cloudId || UNKNOWN_CLOUD_ID,
        account_id: ctx.accountId || UNKNOWN_ACCOUNT_ID,
        instance_id: ctx.instanceId || UNKNOWN_INSTANCE_ID,
        environment_type: ctx.environmentType || UNKNOWN_ENVIRONMENT_TYPE,
        token,
        // Unix epoch SECONDS — matches src/analytics/miniSiteEvents.ts / conf-app's documented
        // mixpanelImportServiceEvents convention for backend/service-originated events.
        time: Math.floor(Date.now() / 1000),
        $insert_id: crypto.randomUUID(),
        distinct_id: distinctId,
      },
    },
  ];

  try {
    const res = await forgeFetch(IMPORT_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${btoa(`${token}:`)}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn(`mini-sites: mixpanel import failed with status ${res.status}`);
  } catch (e) {
    console.warn('mini-sites: mixpanel import threw', e);
  }
}
