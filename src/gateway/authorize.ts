// Control-call authorization (2026-07-16, ECOHELP-145889). Forge attaches a Forge Invocation Token (FIT) to
// EVERY api.fetch call to a declared remote — no `auth:` manifest block required (that block only adds OAuth
// tokens in separate x-forge-oauth-* headers). So the FIT is the PRIMARY credential, and it is BINDING: a
// request that presents a bearer token is authorized by FIT verification alone — an invalid FIT rejects even
// if a valid shared secret rides alongside (anything else would let a forged token hide behind the secret,
// and would make our "remote validates the FIT" questionnaire answer hollow). Requests with no bearer token
// fall back to the x-mini-sites-secret shared secret — the CI/E2E/smoke credential, which never transits
// Forge. This is app authentication only, not a Confluence permission check (Forge enforced that before
// invoking the resolver) — DESIGN §2.

import type { ForgeTokenContext, VerifyForgeResult } from './forgeToken';
import { extractBearer } from './forgeToken';

export type AuthorizeVia = 'fit' | 'shared-secret';

export type AuthorizeDecision =
  | { readonly ok: true; readonly via: AuthorizeVia; readonly context: ForgeTokenContext }
  | { readonly ok: false; readonly reason: 'bad-token' | 'app-mismatch' | 'bad-secret' | 'no-credentials' };

export interface AuthorizeHeaders {
  /** Raw `authorization` header value (may carry the Forge invocation token as a Bearer). */
  readonly authorization: string | null;
  /** Raw `x-mini-sites-secret` header value. */
  readonly sharedSecret: string | null;
}

export interface AuthorizeDeps {
  /** The configured CONTROL_SHARED_SECRET (undefined/empty disables the secret path). */
  readonly sharedSecret: string | undefined;
  /** FIT verifier — verifyForgeToken bound to JWKS + allowlist in prod, a stub in tests. */
  readonly verifyToken: (token: string) => Promise<VerifyForgeResult>;
}

/** Constant-time string compare (avoids leaking the secret via timing). Unequal lengths → false. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function authorizeControlCall(
  headers: AuthorizeHeaders,
  deps: AuthorizeDeps,
): Promise<AuthorizeDecision> {
  const token = extractBearer(headers.authorization);
  if (token) {
    const result = await deps.verifyToken(token);
    if (!result.ok) {
      // 'no-token' can't occur (token is non-null here); collapse it to bad-token for the type's sake.
      return { ok: false, reason: result.reason === 'no-token' ? 'bad-token' : result.reason };
    }
    return { ok: true, via: 'fit', context: result.context };
  }

  if (headers.sharedSecret) {
    if (deps.sharedSecret && timingSafeEqual(headers.sharedSecret, deps.sharedSecret)) {
      return { ok: true, via: 'shared-secret', context: { appId: 'shared-secret', payload: {} } };
    }
    return { ok: false, reason: 'bad-secret' };
  }

  return { ok: false, reason: 'no-credentials' };
}
