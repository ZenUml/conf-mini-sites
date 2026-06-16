// The auth gateway request handler — the dispatch Worker's core (DESIGN §1.4, §2). Composes the verified
// primitives into the fail-closed flow: extract → verify JWT → bind instance→content→tenant → permission/check
// → mint signed-path grant → serve with <base> + CSP. Sub-resources re-validate the grant + re-check
// permission before serving. Everything not on a known serving route is denied by default (INV-GW-09).
//
// This is pure composition over injected deps, so it unit-tests with fakes (no Worker runtime, no cloud).
// src/dispatch/index.ts is the thin Worker entry that builds GatewayDeps from `env` and calls handleGatewayRequest.

import { extractToken, verifyConnectJwt } from '../gateway/connectJwt';
import type { SecretLookup, ConnectJwtPayload } from '../gateway/connectJwt';
import { mintGrant, verifyGrant } from '../gateway/grant';
import { PermissionGate } from '../gateway/permissionCache';
import type { InstanceStore } from '../db/InstanceStore';
import type { HostingProvider, InstanceHandle, ServeAuthContext } from '../hosting/HostingProvider';

export interface GatewayDeps {
  readonly store: InstanceStore;
  readonly lookupSecret: SecretLookup;
  readonly gate: PermissionGate;
  readonly provider: HostingProvider;
  /** Raw bytes of K_grant (envelope-decrypted above this layer; never logged). */
  readonly grantKey: Uint8Array;
  /** This app's descriptor key — the `(clientKey, key)` variant selector for secret lookup (DESIGN §2.4). */
  readonly appKey: string;
  /** Injected clock, epoch ms. */
  readonly now: () => number;
  /** Grant TTL ms (≤ the permission-cache TTL). Default 60s. */
  readonly grantTtlMs?: number;
  /** CSP frame-ancestors value (the Confluence embed origin). */
  readonly embedAncestors?: string;
}

type Route =
  | { kind: 'entrypoint'; instanceId: string }
  | { kind: 'subresource'; instanceId: string; grant: string; filePath: string };

/** Routes: `/v/<instanceId>` (entrypoint) and `/v/<instanceId>/g/<grant>/<path...>` (sub-resource).
 *  Anything else returns null → deny-by-default (INV-GW-09: the allowlist is these two shapes only). */
export function parseRoute(pathname: string): Route | null {
  const segs = pathname.split('/').filter((s) => s.length > 0);
  if (segs.length >= 2 && segs[0] === 'v') {
    const instanceId = decodeURIComponent(segs[1]!);
    if (segs.length === 2) return { kind: 'entrypoint', instanceId };
    if (segs.length >= 4 && segs[2] === 'g') {
      const grant = segs[3]!;
      const filePath = segs.slice(4).map(decodeURIComponent).join('/') || 'index.html';
      return { kind: 'subresource', instanceId, grant, filePath };
    }
  }
  return null;
}

export async function handleGatewayRequest(request: Request, deps: GatewayDeps): Promise<Response> {
  const route = parseRoute(new URL(request.url).pathname);
  if (!route) return deny(404); // deny-by-default
  return route.kind === 'entrypoint'
    ? handleEntrypoint(request, route.instanceId, deps)
    : handleSubresource(route.instanceId, route.grant, route.filePath, deps);
}

async function handleEntrypoint(request: Request, instanceId: string, deps: GatewayDeps): Promise<Response> {
  // 1. Authenticate (DESIGN §2.3–§2.4).
  const extracted = extractToken({ method: request.method, url: request.url, headers: request.headers });
  if (!extracted.ok) return deny(401);
  const verified = await verifyConnectJwt(extracted.token, deps.appKey, deps.lookupSecret, deps.now);
  if (!verified.ok) return deny(401);

  const ctx = readContext(verified.payload);
  if (!ctx) return deny(401);

  // 2. Bind instance → content → tenant via the DB-level composite key (INV-GW-06). A row for another tenant
  //    is unreachable (composite-key get returns null → 404, no existence oracle).
  const row = await deps.store.get({ clientKey: ctx.clientKey, cloudId: ctx.cloudId, instanceId });
  if (!row) return deny(404);
  if (row.contentId !== ctx.contentId) return deny(403); // bind mismatch
  if (row.status !== 'active') return deny(404); // only 'active' is servable (DESIGN §3.4)

  // 3. Authorize: per-request permission/check for the verified sub (fail-closed in the gate).
  const allowed = await deps.gate.allowServe({
    clientKey: ctx.clientKey, cloudId: ctx.cloudId, accountId: ctx.accountId, contentId: ctx.contentId,
  });
  if (!allowed) return deny(403);

  // 4. Mint the signed-path grant (§2.7) and serve the entrypoint with <base> + CSP.
  const ttl = deps.grantTtlMs ?? 60_000;
  const grant = await mintGrant(
    { i: instanceId, ck: ctx.clientKey, c: ctx.contentId, a: ctx.accountId, cl: ctx.cloudId, exp: deps.now() + ttl },
    deps.grantKey, deps.now,
  );
  const handle: InstanceHandle = { id: instanceId, providerRef: row.workerName };
  const auth: ServeAuthContext = { cloudId: ctx.cloudId, contentId: ctx.contentId, accountId: ctx.accountId, grantedAt: deps.now() };

  const served = await deps.provider.serve(handle, 'index.html', auth);
  if (served.status !== 200) return served; // provider 404 etc. — pass through
  const html = injectBase(await served.text(), `/v/${encodeURIComponent(instanceId)}/g/${grant}/`);
  return withSecurityHeaders(new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }), deps);
}

async function handleSubresource(instanceId: string, grant: string, filePath: string, deps: GatewayDeps): Promise<Response> {
  // 1. Re-validate the grant (sig + exp + path-instanceId == signed claim). 401 ⇒ loader re-requests entrypoint.
  const g = await verifyGrant(grant, deps.grantKey, deps.now, instanceId);
  if (!g.ok) return deny(401);

  // 2. Re-check permission on EVERY sub-resource — no cached-allow bypass beyond the gate's TTL (INV-GW-07).
  const allowed = await deps.gate.allowServe({
    clientKey: g.payload.ck, cloudId: g.payload.cl, accountId: g.payload.a, contentId: g.payload.c,
  });
  if (!allowed) return deny(403);

  const handle: InstanceHandle = { id: instanceId, providerRef: '' };
  const auth: ServeAuthContext = { cloudId: g.payload.cl, contentId: g.payload.c, accountId: g.payload.a, grantedAt: deps.now() };
  const served = await deps.provider.serve(handle, filePath, auth);
  return withSecurityHeaders(served, deps);
}

interface VerifiedContext { clientKey: string; cloudId: string; contentId: string; accountId: string; }

/** Read the binding context from the VERIFIED payload (signed claims only — DESIGN §2.5).
 *  OPEN QUESTION (DESIGN §7.5): pin the exact signed claim paths for cloudId/contentId against Atlassian's
 *  context token. They MUST be HMAC-covered claims, never the iframe URL or AP.context. Placeholdered here. */
function readContext(payload: ConnectJwtPayload): VerifiedContext | null {
  const clientKey = payload.iss;
  const accountId = typeof payload.sub === 'string' ? payload.sub : null;
  const cloudId = typeof payload['cloudId'] === 'string' ? (payload['cloudId'] as string) : null;
  const contentId = typeof payload['contentId'] === 'string' ? (payload['contentId'] as string) : null;
  if (!clientKey || !accountId || !cloudId || !contentId) return null;
  return { clientKey, cloudId, contentId, accountId };
}

/** Inject `<base href>` so the browser resolves relative sub-resources under the signed `/g/<grant>/` path. */
function injectBase(html: string, baseHref: string): string {
  const tag = `<base href="${baseHref}">`;
  const headOpen = html.match(/<head[^>]*>/i);
  if (headOpen) {
    const at = headOpen.index! + headOpen[0].length;
    return html.slice(0, at) + tag + html.slice(at);
  }
  return tag + html; // no <head> — prepend (still resolves relative URLs)
}

/** The gateway (not the user Worker) sets the security headers on every served byte (DESIGN §4 / §5.3, I6). */
function withSecurityHeaders(res: Response, deps: GatewayDeps): Response {
  const headers = new Headers(res.headers);
  const frameAncestors = deps.embedAncestors ?? 'https://*.atlassian.net';
  headers.set(
    'content-security-policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ` +
      `img-src 'self' data:; connect-src 'self'; frame-ancestors ${frameAncestors}; base-uri 'self'; form-action 'none'`,
  );
  headers.set('x-content-type-options', 'nosniff');
  return new Response(res.body, { status: res.status, headers });
}

/** Opaque deny — the failed-check reason goes only to the audit log, never to the viewer (DESIGN §2.9). */
function deny(status: number): Response {
  return new Response(null, { status });
}
