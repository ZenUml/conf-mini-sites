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

export interface Env {
  /** WfP dispatch-namespace binding — env.MINISITES.get('ms-<id>').fetch(). */
  MINISITES: DispatchNamespaceBinding;
  /** K_grant raw key material (a Cloudflare secret) — the HMAC key shared with the Forge resolver (§2.7). */
  K_GRANT: string;
  /** CSP frame-ancestors (the Confluence/Forge embed origin), e.g. "https://*.atlassian.net". */
  EMBED_ANCESTORS?: string;
  [binding: string]: unknown;
}

const enc = new TextEncoder();

function buildDeps(env: Env): ForgeGatewayDeps {
  return {
    provider: new CloudflareWfPProvider(new DispatchBindingWfpClient(env.MINISITES)),
    grantKey: enc.encode(env.K_GRANT ?? ''), // empty key ⇒ all grants fail signature ⇒ fail-closed 401
    now: () => Date.now(),
    embedAncestors: env.EMBED_ANCESTORS,
  };
}

// Memoize per isolate — the deps are stateless here, but reuse avoids re-importing the HMAC key each request.
let cachedDeps: ForgeGatewayDeps | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    cachedDeps ??= buildDeps(env);
    return handleForgeServe(request, cachedDeps);
  },
};
