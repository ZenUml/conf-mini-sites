// Mixpanel event catalog + pure payload builder for Conf Mini-Sites.
//
// Conventions copied from conf-app (verified live 2026-07-26 — see conf-app's .claude/skills/mixpanel
// SKILL.md + src/utils/analytics/catalog.ts + functions/service/mixpanelService.ts):
//   - event names are snake_case `<noun>_<verb, past-tense/gerund>` — e.g. conf-app's macro_viewed,
//     macro_save_failed, upgrade_modal_shown, paywall_gate_evaluated, attachment_upload_async_succeeded.
//     This is the DOMINANT/current convention: conf-app renamed its whole catalog to this shape in
//     2026-04 (view_macro -> macro_viewed, create_macro_end -> macro_create_succeeded, etc.) precisely
//     to standardize on it, so new products should start here rather than the pre-rename verb-first form.
//   - a wide outcome (…_succeeded/…_failed) is paired with narrower stage-level breadcrumb events for
//     the same funnel (conf-app: macro_publish_completed is wider than macro_save_succeeded;
//     attachment_upload_async_succeeded/failed sit alongside the queued event). We mirror that shape:
//     publish_succeeded/failed is the terminal outcome; bundle_validated and
//     secret_scan_rejected are the stage breadcrumbs inside it.
//   - backend/service events with no live user session (conf-app's mixpanelImportServiceEvents) skip
//     mixpanel.identify() and post straight to the Import API with an explicit distinct_id + insert_id
//     + time (seconds) — see mixpanelClient.ts, which mirrors that function almost verbatim.
//
// Event names are UNPREFIXED, exactly as conf-app names its own (`macro_viewed`, not
// `zenuml_macro_viewed`). Conf Mini-Sites is a separate Forge app, so `macro_viewed` here and
// conf-app's `macro_viewed` can co-exist in one project only because every event carries
// `product_type: 'mini-sites'` — the same discriminator conf-app uses for lite/full/diagramly.
// Read the two apps' `macro_viewed` as different events: ours has no `macro_type`.
//
// PRIVACY (task constraint): never send Confluence page content, file contents, file names, or any
// other user-authored text — only counts, byte sizes, durations, bounded outcome/reason enums, and the
// tenant/user identifiers conf-app already sends. There is no client_domain-equivalent hostname
// available server-side here (conf-app's is resolved by a Custom-UI-only bridge helper,
// ContextParameters.getClientDomain()), so we send the Confluence cloud id instead — named accurately
// (`cloud_id`) rather than borrowing conf-app's `client_domain` key for a value that isn't a domain.
//
// Pure module: buildMiniSiteEvent does no I/O and reads no ambient clock — `now`/`insertId` are
// injected (same style as src/gateway/grant.ts's mintGrant/verifyGrant) so it is deterministic and
// unit-testable without mocking Date/crypto globals.

export const MINI_SITE_EVENT_NAMES = [
  'macro_viewed',
  'publisher_opened',
  'folder_selected',
  'bundle_validated',
  'secret_scan_rejected',
  'publish_succeeded',
  'publish_failed',
  'license_blocked_publish',
  'render_succeeded',
  'render_failed',
] as const;

export type MiniSiteEventName = (typeof MINI_SITE_EVENT_NAMES)[number];

export type MixpanelScalar = string | number | boolean | null | undefined;

/** Common dimensions attached to every event — the mini-sites analog of conf-app's client_domain /
 *  user_account_id / macro_uuid / environment_type enrichment in trackAnalyticsEvent.ts. Any field can
 *  be absent (e.g. a grant-verification failure has no verified accountId yet) — buildMiniSiteEvent
 *  fills a conf-app-style `unknown_*` sentinel rather than omitting the property, so downstream
 *  group-by queries never have to special-case a missing dimension. */
export interface MiniSiteEventContext {
  readonly cloudId?: string;
  readonly accountId?: string;
  readonly instanceId?: string;
  readonly environmentType?: string;
}

// Discriminated per-event property shapes — keeps call sites honest about what each event carries, and
// keeps the "never file names/contents" rule enforced at the type level (there is no `path` field).
export type MiniSiteAnalyticsEvent =
  | {
      readonly name: 'macro_viewed';
      readonly properties: { readonly has_published_site: boolean; readonly license_active?: boolean };
    }
  | {
      readonly name: 'publisher_opened';
      readonly properties: { readonly has_published_site: boolean };
    }
  | {
      readonly name: 'folder_selected';
      readonly properties: {
        readonly outcome: 'accepted' | 'rejected';
        readonly reject_reason?: 'too_few_files' | 'missing_index_html';
        readonly file_count: number;
        readonly total_bytes: number;
      };
    }
  | {
      readonly name: 'bundle_validated';
      readonly properties: {
        readonly outcome: 'pass' | 'fail';
        /** A BundleErrorCode (src/pipeline/bundleValidation.ts) when outcome === 'fail'. Kept as a plain
         *  string here rather than importing that union, so the analytics layer doesn't couple to the
         *  pipeline's error-code type — the call site is where the strongly-typed value flows in. */
        readonly reason?: string;
        readonly file_count: number;
        readonly total_bytes: number;
      };
    }
  | {
      readonly name: 'secret_scan_rejected';
      readonly properties: {
        readonly hit_count: number;
        /** SecretHit.kind (src/pipeline/secretScan.ts) — a bounded pattern-name enum, never the match text. */
        readonly first_hit_kind: string;
        readonly file_count: number;
        readonly total_bytes: number;
      };
    }
  | {
      readonly name: 'publish_succeeded';
      readonly properties: { readonly file_count: number; readonly total_bytes: number; readonly duration_ms: number };
    }
  | {
      readonly name: 'publish_failed';
      readonly properties: {
        readonly reason: string;
        readonly http_status: number;
        readonly file_count?: number;
        readonly total_bytes?: number;
        readonly duration_ms: number;
      };
    }
  | {
      readonly name: 'license_blocked_publish';
      readonly properties: Record<string, never>;
    }
  | {
      readonly name: 'render_succeeded';
      readonly properties: { readonly duration_ms: number };
    }
  | {
      readonly name: 'render_failed';
      readonly properties: { readonly reason: string; readonly duration_ms: number; readonly http_status?: number };
    };

/** One backend-owned event for Mixpanel's Import API — mirrors conf-app's
 *  functions/service/mixpanelService.ts MixpanelServiceEvent shape exactly (event/properties/distinctId/
 *  insertId/time), since neither Worker nor the Forge resolver has a live browser session to
 *  mixpanel.identify() against. */
export interface MixpanelServiceEvent {
  readonly event: MiniSiteEventName;
  readonly properties: Record<string, MixpanelScalar>;
  readonly distinctId: string;
  readonly insertId: string;
  /** Unix epoch SECONDS — conf-app's mixpanelService.ts documents this unit for the service-event path
   *  (mixpanelImportServiceEvents), distinct from its browser-tracker path which uses milliseconds. We
   *  follow the service-event convention since these are all backend-originated events. */
  readonly time: number;
}

export interface BuildMiniSiteEventOptions {
  /** Injected clock, epoch ms (converted to seconds internally — see MixpanelServiceEvent.time). */
  readonly now: () => number;
  /** Injected id generator for Mixpanel's $insert_id (dedup key). Callers pass crypto.randomUUID(). */
  readonly insertId: () => string;
}

const PRODUCT_TYPE = 'mini-sites';
const UNKNOWN_CLOUD_ID = 'unknown_cloud_id';
const UNKNOWN_ACCOUNT_ID = 'unknown_account_id';
const UNKNOWN_INSTANCE_ID = 'unknown_instance_id';
const UNKNOWN_ENVIRONMENT_TYPE = 'unknown_environment_type';

/** Build one Mixpanel Import-API event from a typed event + common context. Pure — no I/O, no ambient
 *  clock/id-gen (both injected via opts), so this is unit-testable without mocking globals. */
export function buildMiniSiteEvent(
  event: MiniSiteAnalyticsEvent,
  context: MiniSiteEventContext,
  opts: BuildMiniSiteEventOptions,
): MixpanelServiceEvent {
  const distinctId = context.accountId || context.cloudId || context.instanceId || UNKNOWN_ACCOUNT_ID;
  const properties: Record<string, MixpanelScalar> = {
    ...event.properties,
    cloud_id: context.cloudId ?? UNKNOWN_CLOUD_ID,
    account_id: context.accountId ?? UNKNOWN_ACCOUNT_ID,
    instance_id: context.instanceId ?? UNKNOWN_INSTANCE_ID,
    environment_type: context.environmentType ?? UNKNOWN_ENVIRONMENT_TYPE,
    // Disambiguates this app from conf-app's lite/full/diagramly in a shared project — the same
    // mechanism conf-app uses (src/utils/analytics/types.ts: product_type), which is why the event
    // names here carry no prefix of their own.
    product_type: PRODUCT_TYPE,
  };
  return {
    event: event.name,
    properties,
    distinctId,
    insertId: opts.insertId(),
    time: Math.floor(opts.now() / 1000),
  };
}
