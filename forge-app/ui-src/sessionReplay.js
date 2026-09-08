// Mixpanel Session Replay for the Custom UI surfaces (the inline launcher and the Publisher modal).
//
// Why the browser SDK here when every other event goes through the resolver: replay is a recorder that
// has to run in the page. The Import-API path in forge-app/src/analytics.js has no equivalent — it posts
// finished events from the Forge function, where there is no DOM to record. So this is the one analytics
// path that talks to Mixpanel directly from the iframe, which is why it needs its own egress entries in
// manifest.yml (*.mixpanel.com for ingestion, cdn.mxpnl.com for the SDK and the recorder bundle).
//
// It answers the question the funnel events cannot: WHY a step was abandoned. Two of this product's
// first external trials ended without a published site — one selected a folder three times and stopped,
// the other never opened a macro at all — and the event stream said only that they stopped.
//
// The SDK is fetched from the CDN at call time rather than bundled, which is also what conf-app does.
// Bundling `mixpanel-browser` was measured first and rejected: it took static/view/main.js from 95,711
// to 531,073 bytes, and that bundle is parsed on every inline macro render, including the great majority
// of sessions that are never sampled for recording. Loaded this way, an unsampled session pays nothing —
// the script tag is only injected after the sampling check passes.
//
// Failure is always silent. A missing token, a blocked request, an SDK that will not load: none of them
// may break the Publisher. The mini-site itself is the product; recording it is not.

const SDK_URL = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';

let started = false;
let sdkPromise = null;

/** Inject the SDK once per iframe and resolve with `window.mixpanel`. Rejects if the script fails. */
function loadSdk() {
  if (window.mixpanel && typeof window.mixpanel.init === 'function') return Promise.resolve(window.mixpanel);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => {
      if (window.mixpanel && typeof window.mixpanel.init === 'function') resolve(window.mixpanel);
      else reject(new Error('mixpanel loaded without init()'));
    };
    s.onerror = () => reject(new Error('mixpanel SDK failed to load — check the cdn.mxpnl.com CSP entry'));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/**
 * Start recording, once per iframe.
 *
 * @param {{ token?: string, recordSessionsPercent?: number, cloudId?: string, accountId?: string,
 *           environmentType?: string, surface?: string }} config
 *   `token` and `recordSessionsPercent` come from the `getAnalyticsConfig` resolver, which reads them
 *   from Forge environment variables — so sampling changes with `forge variables set`, no redeploy.
 * @param {{ loader?: () => Promise<any> }} [deps] test seam for the SDK loader.
 * @returns {Promise<'started' | 'skipped_no_token' | 'skipped_sampled' | 'skipped_already_started' | 'failed'>}
 *   Returned rather than logged so a caller (or a test) can assert which branch ran.
 */
export async function startSessionReplay(config, deps = {}) {
  if (started) return 'skipped_already_started';
  const token = config && config.token;
  if (!token) return 'skipped_no_token';

  const percent = Number(config.recordSessionsPercent) || 0;
  if (percent <= 0) return 'skipped_sampled';

  try {
    const mixpanel = await (deps.loader || loadSdk)();
    mixpanel.init(token, {
      // The events themselves keep going through the resolver (server-side, authoritative). This SDK
      // instance exists for the recorder, so it must not also start autocapturing page interactions.
      autocapture: false,
      track_pageview: false,
      persistence: 'localStorage',
      record_sessions_percent: percent,
      // The iframe origin is a per-install CDN host, not a domain we own; cross-subdomain cookie
      // handling has nothing to attach to here.
      cross_subdomain_cookie: false,
    });

    // Same identity the resolver-side events use, so a replay joins its own funnel rather than
    // stranding the recording under an anonymous id.
    if (config.accountId) mixpanel.identify(config.accountId);
    mixpanel.register({
      product_type: 'mini-sites',
      cloud_id: config.cloudId || 'unknown_cloud_id',
      environment_type: config.environmentType || 'unknown_environment_type',
      surface: config.surface || 'unknown_surface',
    });

    mixpanel.start_session_recording();
    started = true;
    return 'started';
  } catch (e) {
    console.warn('session replay unavailable (non-fatal):', (e && e.message) || e);
    return 'failed';
  }
}

/** Test seam: the module-level latches would otherwise leak between cases. */
export function __resetSessionReplayForTests() {
  started = false;
  sdkPromise = null;
}
