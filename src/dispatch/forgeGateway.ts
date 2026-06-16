// The Forge-model dispatch Worker handler (DESIGN §2, re-pivoted for Forge — CONTEXT.md 2026-06-17). The
// dispatch Worker is the single network entry point to the non-routable per-instance Workers. Under Forge,
// Confluence permissions are INHERITED: the Forge resolver runs server-side as an already-authorized viewer
// and mints a short-lived HMAC signed-path grant, embedding it in the serve URL. So this handler does NOT
// verify a Connect JWT and does NOT call Confluence permission/check (that whole gateway — connectJwt.ts,
// permissionCache.ts — is shelved). It does exactly two things, fail-closed:
//
//   1. verify the grant (signature + exp + path↔signed-instanceId bind) — the serve-path authorization +
//      revocation primitive. The grant TTL (not script deletion) is what promptly stops serving revoked
//      content: WfP script deletion is eventually-consistent at the dispatch edge (measured >2min live —
//      CONTEXT "Live findings"), so once the resolver stops minting, serving stops within one TTL regardless.
//   2. route to the per-instance Worker via the dispatch-namespace binding (provider.serve →
//      env.MINISITES.get('ms-<instanceId>').fetch()), injecting <base> + CSP.
//
// Everything off the single grant-bearing route shape is denied by default. Pure composition over injected
// deps → unit-testable with a fake provider + a real HMAC key, no Worker runtime, no cloud.

import { verifyGrant } from '../gateway/grant';
import type { HostingProvider, InstanceHandle, ServeAuthContext } from '../hosting/HostingProvider';

export interface ForgeGatewayDeps {
  /** Serve substrate — CloudflareWfPProvider over DispatchBindingWfpClient in production. */
  readonly provider: HostingProvider;
  /** Raw bytes of K_grant — the HMAC key shared with the Forge resolver (envelope-decrypted above; never logged). */
  readonly grantKey: Uint8Array;
  /** Injected clock, epoch ms. */
  readonly now: () => number;
  /** CSP frame-ancestors value (the Confluence/Forge embed origin). */
  readonly embedAncestors?: string;
}

/** The one valid route shape: `/v/<instanceId>/g/<grant>/<path...>`. Empty path ⇒ the bundle entrypoint.
 *  Anything else ⇒ null ⇒ deny-by-default. */
export interface ServeRoute {
  readonly instanceId: string;
  readonly grant: string;
  readonly filePath: string;
}

export function parseServeRoute(pathname: string): ServeRoute | null {
  const segs = pathname.split('/').filter((s) => s.length > 0);
  if (segs.length >= 4 && segs[0] === 'v' && segs[2] === 'g') {
    const instanceId = decodeURIComponent(segs[1]!);
    const grant = segs[3]!;
    const filePath = segs.slice(4).map(decodeURIComponent).join('/') || 'index.html';
    if (instanceId && grant) return { instanceId, grant, filePath };
  }
  return null;
}

export async function handleForgeServe(request: Request, deps: ForgeGatewayDeps): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return deny(405);

  const route = parseServeRoute(new URL(request.url).pathname);
  if (!route) return deny(404); // deny-by-default: only grant-bearing serve URLs are routable

  // Authorize the byte: the grant is the only credential a sub-resource request carries. verifyGrant checks
  // signature, expiry, and that the PATH's instanceId equals the signed claim (unforgeable bind — §2.7). Any
  // throw (e.g. an unwired/empty K_GRANT makes importKey reject) is caught and denied — the handler must never
  // 500 on a bad or unwired grant; fail closed to 401.
  let g: Awaited<ReturnType<typeof verifyGrant>>;
  try {
    g = await verifyGrant(route.grant, deps.grantKey, deps.now, route.instanceId);
  } catch {
    return deny(401);
  }
  if (!g.ok) return deny(401);

  const handle: InstanceHandle = { id: route.instanceId, providerRef: '' }; // provider derives ms-<id>
  const auth: ServeAuthContext = {
    cloudId: g.payload.cl,
    contentId: g.payload.c,
    accountId: g.payload.a,
    grantedAt: deps.now(),
  };

  // The dispatch-namespace binding THROWS for a missing/unreachable per-instance Worker (an un-provisioned or
  // deleted instance) rather than returning 404. Catch it and serve a clean 404 — never a 1101 — so a viewer
  // hitting a torn-down instance gets a normal not-found, not a Worker crash.
  let served: Response;
  try {
    served = await deps.provider.serve(handle, route.filePath, auth);
  } catch {
    return withSecurityHeaders(deny(404), deps);
  }
  if (served.status !== 200) return withSecurityHeaders(served, deps); // pass through 404 etc. (still hardened)

  // Inject <base> into HTML so relative sub-resources resolve under the same signed /g/<grant>/ path.
  const ct = served.headers.get('content-type') ?? '';
  if (ct.includes('text/html')) {
    const baseHref = `/v/${encodeURIComponent(route.instanceId)}/g/${route.grant}/`;
    const html = injectBase(await served.text(), baseHref);
    return withSecurityHeaders(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
      deps,
    );
  }
  return withSecurityHeaders(served, deps);
}

/** Inject `<base href>` right after <head> (or prepend) so the browser resolves relative sub-resources under
 *  the signed grant path. */
function injectBase(html: string, baseHref: string): string {
  const tag = `<base href="${baseHref}">`;
  const headOpen = html.match(/<head[^>]*>/i);
  if (headOpen) {
    const at = headOpen.index! + headOpen[0].length;
    return html.slice(0, at) + tag + html.slice(at);
  }
  return tag + html;
}

/** The gateway (not the user Worker) sets the security headers on every served byte (DESIGN §4 / §5.3, I6). */
function withSecurityHeaders(res: Response, deps: ForgeGatewayDeps): Response {
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
