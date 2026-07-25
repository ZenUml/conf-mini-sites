// The dispatch Worker entry (DESIGN §1.4, §2; Forge-model — CONTEXT.md 2026-06-17). The SINGLE network entry
// point to the non-routable per-instance Workers. Thin by design: build ForgeGatewayDeps from `env`, delegate
// to the composed handler (forgeGateway.ts).
//
// Under Forge the dispatch Worker needs only TWO things — no DB, no Connect shared-secret lookup, no
// Confluence permission checker (Forge inherits permissions; the resolver already authorized the viewer and
// minted the grant):
//   1. K_GRANT — the HMAC key shared with the Forge resolver, to verify the signed-path grant.
//   2. MINISITES — the dispatch-namespace binding, to route to the per-instance Worker.
// An unwired deployment (missing/empty K_GRANT) fails closed: every grant fails signature verification → 401.
//
// The Connect-era gateway (gateway.ts, connectJwt.ts, permissionCache.ts, the D1 install-secret lookup) is
// retained-but-shelved as the seam's alternative substrate; it is not on this path.

import { handleForgeServe } from './forgeGateway';
import type { ForgeGatewayDeps } from './forgeGateway';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { DispatchBindingWfpClient } from '../hosting/DispatchBindingWfpClient';
import type { DispatchNamespaceBinding } from '../hosting/DispatchBindingWfpClient';
import { sendMiniSiteEvents } from '../analytics/mixpanelClient';

export interface Env {
  /** WfP dispatch-namespace binding — env.MINISITES.get('ms-<id>').fetch(). */
  MINISITES: DispatchNamespaceBinding;
  /** K_grant raw key material (a Cloudflare secret) — the HMAC key shared with the Forge resolver (§2.7). */
  K_GRANT: string;
  /** CSP frame-ancestors (the Confluence/Forge embed origin), e.g. "https://*.atlassian.net". */
  EMBED_ANCESTORS?: string;
  /** Mixpanel project token (a Cloudflare secret) — mini_site_render_succeeded/failed for the entrypoint-
   *  document serve outcome. Optional: sendMiniSiteEvents no-ops silently when unset. */
  MIXPANEL_TOKEN?: string;
  [binding: string]: unknown;
}

const enc = new TextEncoder();

/** The parts of ForgeGatewayDeps that are stateless per isolate (worth memoizing — avoids re-importing
 *  the HMAC key every request). `track` is deliberately NOT here: it closes over this request's
 *  ExecutionContext (ctx.waitUntil), which is per-invocation, not per-isolate. */
type StaticDeps = Pick<ForgeGatewayDeps, 'provider' | 'grantKey' | 'embedAncestors'>;

function buildStaticDeps(env: Env): StaticDeps {
  return {
    provider: new CloudflareWfPProvider(new DispatchBindingWfpClient(env.MINISITES)),
    grantKey: enc.encode(env.K_GRANT ?? ''), // empty key ⇒ all grants fail signature ⇒ fail-closed 401
    embedAncestors: env.EMBED_ANCESTORS,
  };
}

// Memoize per isolate — see StaticDeps.
let cachedStatic: StaticDeps | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    cachedStatic ??= buildStaticDeps(env);
    const deps: ForgeGatewayDeps = {
      ...cachedStatic,
      now: () => Date.now(),
      // Fire-and-forget: handleForgeServe never awaits this, so a Mixpanel outage adds no latency to a
      // real viewer's page load. ctx.waitUntil keeps the isolate alive long enough for the send to land.
      track: (event) => ctx.waitUntil(sendMiniSiteEvents([event], { token: env.MIXPANEL_TOKEN })),
    };
    return handleForgeServe(request, deps);
  },
};
