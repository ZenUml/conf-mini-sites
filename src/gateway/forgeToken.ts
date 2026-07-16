// Forge invocation-token verification (CONTEXT.md 2026-06-17). Under Forge, publish goes resolver → control
// Worker over a Forge `remote`, carrying the Forge invocation token (RS256, signed by Atlassian, keys at the
// Forge JWKS endpoint). The control Worker verifies it so ONLY our Forge app can provision a per-instance
// Worker. Mirrors conf-app functions/utils/authenticate.ts (validateContextToken): verify against the JWKS,
// then check the token's app id is on our allowlist.
//
// This is NOT a Confluence permission check — Forge already enforced the user's page permission before invoking
// the resolver. This only proves the call came from our app (provisioning authorization), DESIGN §2.
//
// The JWKS resolver is injected (jose.JWTVerifyGetKey) so the verifier unit-tests with a LOCAL keypair + local
// JWKS (no network); production builds it from the remote Forge JWKS URL via forgeJwks().

import * as jose from 'jose';

/** Atlassian's Forge invocation-token JWKS (same endpoint conf-app uses). */
export const FORGE_JWKS_URL = 'https://forge.cdn.prod.atlassian-dev.net/.well-known/jwks.json';

/** The `iss` every FIT carries (Forge Remote security requirements). */
export const FORGE_ISSUER = 'forge/invocation-token';

/** A FIT's `aud` is the full app ARI, not the bare app id. */
export const appAri = (appId: string): string => `ari:cloud:ecosystem::app/${appId}`;

// FIT verification is on the hot path (every control call), so the remote JWKS resolver must be reused —
// jose's key cache lives per createRemoteJWKSet instance; a fresh instance per request would refetch the JWKS.
const remoteJwksCache = new Map<string, jose.JWTVerifyGetKey>();

/** Build (once per isolate per URL) the remote JWKS resolver. jose caches keys, honouring Cache-Control. */
export function forgeJwks(jwksUrl: string = FORGE_JWKS_URL): jose.JWTVerifyGetKey {
  let getKey = remoteJwksCache.get(jwksUrl);
  if (!getKey) {
    getKey = jose.createRemoteJWKSet(new URL(jwksUrl));
    remoteJwksCache.set(jwksUrl, getKey);
  }
  return getKey;
}

export interface ForgeTokenContext {
  /** The Forge app id — the last segment of the `app.id` ARI (`ari:cloud:ecosystem::app/<id>`). */
  readonly appId: string;
  /** Tenant cloud id, when present in the token context. */
  readonly cloudId?: string;
  /** Site URL, when present (used by callers to derive the tenant domain). */
  readonly siteUrl?: string;
  /** The verified raw JWT payload — for audit / further extraction by the caller. */
  readonly payload: jose.JWTPayload;
}

export type VerifyForgeResult =
  | { readonly ok: true; readonly context: ForgeTokenContext }
  | { readonly ok: false; readonly reason: 'no-token' | 'bad-token' | 'app-mismatch' };

export interface VerifyForgeOptions {
  /** JWKS resolver — forgeJwks() in prod, a local set in tests. */
  readonly getKey: jose.JWTVerifyGetKey;
  /** Allowed Forge app ids (last ARI segment). A token whose app id is not listed is rejected. */
  readonly allowedAppIds: ReadonlyArray<string>;
}

/** Extract the Bearer token from an Authorization header value (or raw token). Returns null if absent. */
export function extractBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (m) return m[1]!.trim();
  // Forge sometimes sends the bare token; accept a non-empty single-segment value too.
  return authorization.includes(' ') ? null : authorization.trim() || null;
}

/** Verify a Forge invocation token and enforce the app-id allowlist. Never throws — returns a tagged result. */
export async function verifyForgeToken(
  token: string | null,
  opts: VerifyForgeOptions,
): Promise<VerifyForgeResult> {
  if (!token) return { ok: false, reason: 'no-token' };

  const allowed = opts.allowedAppIds.map((a) => a.trim()).filter(Boolean);

  let payload: jose.JWTPayload;
  try {
    // iss + aud are enforced here (Atlassian's stated FIT requirements): aud must be one of OUR app ARIs.
    // exp/nbf are enforced by jose itself.
    ({ payload } = await jose.jwtVerify(token, opts.getKey, {
      issuer: FORGE_ISSUER,
      audience: allowed.map(appAri),
    }));
  } catch {
    return { ok: false, reason: 'bad-token' };
  }

  // Belt-and-braces: aud already pins the app, but the payload's app.id must agree (it is also what we report).
  const payloadAppAri = (payload as Record<string, any>)?.app?.id;
  const appId = typeof payloadAppAri === 'string' ? payloadAppAri.split('/').pop() ?? '' : '';
  if (!appId || !allowed.includes(appId)) {
    return { ok: false, reason: 'app-mismatch' };
  }

  const context = (payload as Record<string, any>)?.context ?? {};
  return {
    ok: true,
    context: {
      appId,
      cloudId: typeof context.cloudId === 'string' ? context.cloudId : undefined,
      siteUrl: typeof context.siteUrl === 'string' ? context.siteUrl : undefined,
      payload,
    },
  };
}
