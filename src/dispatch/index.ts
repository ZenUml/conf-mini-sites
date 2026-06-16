// The dispatch Worker entry (DESIGN §1.4, §2) — the SINGLE network entry point and the auth gateway. Thin by
// design: build GatewayDeps from `env`, delegate to the composed handler (gateway.ts). User Workers are
// reachable only via the dispatch binding, never publicly (INV-GW-14).
//
// Live wiring still pending the Cloudflare account (Stage 2/3): the WfP HTTP/dispatch client, the D1-backed
// install-secret lookup (envelope-decrypt, INV-GW-10), and the Confluence permission checker. Until they land
// their stubs THROW — and because both the permission gate and the provider are fail-closed, an unwired
// gateway DENIES every request rather than leaking. That is the correct default for a not-yet-provisioned
// deployment, and it is exactly why these are stubs and not silent allows.

import { handleGatewayRequest } from './gateway';
import type { GatewayDeps } from './gateway';
import type { SecretLookup } from '../gateway/connectJwt';
import { PermissionGate } from '../gateway/permissionCache';
import type { PermissionChecker, PermissionContext } from '../gateway/permissionCache';
import { D1InstanceStore } from '../db/D1InstanceStore';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { CloudflareWfpClient } from '../hosting/CloudflareWfpClient';

export interface Env {
  DB: D1Database;
  // MINISITES: DispatchNamespace;  // WfP dispatch namespace — wired in Stage 2 via CloudflareWfpClient
  K_GRANT: string; // K_grant raw key material (a Cloudflare secret) — DESIGN §2.7
  APP_KEY: string; // this app's descriptor key — the (clientKey, key) variant selector for secret lookup
  [binding: string]: unknown;
}

const enc = new TextEncoder();

/** Stage-3 live: read ClientInstallation by (clientKey, key) from D1, envelope-decrypt the sharedSecret
 *  (INV-GW-10). Throws until wired → the JWT verify fails closed (401). */
function installSecretLookup(_env: Env): SecretLookup {
  return async (_clientKey, _key) => {
    throw new Error('installSecretLookup: Stage 3 live wiring (D1 ClientInstallation + envelope-decrypt)');
  };
}

/** Stage-3 live: call Confluence permission/check(read) with the install credentials; REJECT on outage so the
 *  gate treats it as DENY. Throws until wired → the gate denies (fail-closed). */
function confluencePermissionChecker(_env: Env): PermissionChecker {
  return {
    check: async (_ctx: PermissionContext): Promise<boolean> => {
      throw new Error('confluencePermissionChecker: Stage 3 live wiring (Confluence permission/check)');
    },
  };
}

function buildDeps(env: Env): GatewayDeps {
  return {
    store: new D1InstanceStore(env.DB),
    lookupSecret: installSecretLookup(env),
    gate: new PermissionGate({ checker: confluencePermissionChecker(env), now: () => Date.now() }),
    provider: new CloudflareWfPProvider(new CloudflareWfpClient(env)),
    grantKey: enc.encode(env.K_GRANT),
    appKey: env.APP_KEY,
    now: () => Date.now(),
  };
}

// Memoize per isolate so the permission-cache (in PermissionGate) survives across requests, not just one fetch.
let cachedDeps: GatewayDeps | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    cachedDeps ??= buildDeps(env);
    return handleGatewayRequest(request, cachedDeps);
  },
};
