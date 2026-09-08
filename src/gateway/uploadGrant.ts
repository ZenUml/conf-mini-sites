// UPLOAD grant — the credential that lets the BROWSER POST a bundle straight to the control Worker.
//
// WHY this exists: Forge caps a front-end `invoke()` request payload at ~5 MB, so the Custom UI's single
// `invoke('publish', { files })` 413s on any real prototype. The fix splits the flow: the resolver (which
// IS authorized, by FIT) asks the control Worker for a short-lived upload grant, and the browser then POSTs
// the bytes directly to the control Worker carrying that grant — bypassing the Forge payload cap entirely.
// The grant is therefore the ONLY authorization on `POST /upload`, so it must be unforgeable and short-lived.
//
// WHY it is domain-separated from the serve grant (src/gateway/grant.ts): both are HMAC'd from the same
// K_GRANT material, but they authorize opposite things — a serve grant lets a viewer READ an instance's
// bytes from the dispatch Worker, an upload grant lets a caller OVERWRITE that instance's bundle on the
// control Worker. Signing both with the raw key would make every viewer's serve grant a publish credential.
// So the upload signing key is SHA-256(K_GRANT || ":upload"): a serve grant never verifies as an upload
// grant, and vice versa (both fail closed as 'bad-signature'). See uploadGrant.test.ts.
//
// Pure crypto/codec, no I/O: the clock is injected, the key bytes are passed in (never logged).

import { mintGrant, verifyGrant } from './grant';

/** Upload-grant claims. Short field names for symmetry with GrantPayload (this token rides in a query string). */
export interface UploadGrantPayload {
  /** instanceId — the request's `?instanceId=` MUST equal this (unforgeable bind, same rule as the serve grant). */
  readonly i: string;
  /** cloudId — the tenant; carried so `/upload` can do the GC bookkeeping `/publish` does from its token context. */
  readonly cl: string;
  /** accountId — the publishing user, for analytics attribution. */
  readonly a: string;
  /** exp — absolute expiry in epoch ms. */
  readonly exp: number;
}

export type VerifyUploadGrantFailure = 'bad-format' | 'bad-signature' | 'expired' | 'instance-mismatch';

export type VerifyUploadGrantResult =
  | { readonly ok: true; readonly payload: UploadGrantPayload }
  | { readonly ok: false; readonly reason: VerifyUploadGrantFailure };

/** TTL: long enough for the resolver round-trip plus a large multipart upload on a slow link, short enough
 *  that a leaked grant (it appears in a URL) is a narrow window. */
export const UPLOAD_GRANT_TTL_MS = 120_000;

/** Marker claim in the reused GrantPayload envelope. Not a security control on its own — the derived key is —
 *  but it makes the token self-describing and is re-checked on verify. */
const UPLOAD_CK = 'upload';

const enc = new TextEncoder();

/** SHA-256(K_GRANT || ":upload") — the domain-separated signing key (see the file header). */
async function deriveUploadKey(kGrantRaw: Uint8Array): Promise<Uint8Array> {
  const suffix = enc.encode(':upload');
  const material = new Uint8Array(kGrantRaw.length + suffix.length);
  material.set(kGrantRaw, 0);
  material.set(suffix, kGrantRaw.length);
  const digest = await crypto.subtle.digest('SHA-256', material as unknown as BufferSource);
  return new Uint8Array(digest);
}

/** Mint an upload grant: same token format as a serve grant, different (derived) key. */
export async function mintUploadGrant(
  payload: UploadGrantPayload,
  kGrantRaw: Uint8Array,
  now: () => number,
): Promise<string> {
  const key = await deriveUploadKey(kGrantRaw);
  return mintGrant(
    { i: payload.i, ck: UPLOAD_CK, c: '', a: payload.a, cl: payload.cl, exp: payload.exp },
    key,
    now,
  );
}

/**
 * Verify an upload grant. Check order (and its rationale) is grant.ts's: structure → signature → expiry →
 * instance bind, so a forger learns nothing beyond 'bad-signature'.
 *
 * @param expectedInstanceId the instanceId taken from the REQUEST (query string), not from the token.
 */
export async function verifyUploadGrant(
  token: string,
  kGrantRaw: Uint8Array,
  now: () => number,
  expectedInstanceId: string,
): Promise<VerifyUploadGrantResult> {
  const key = await deriveUploadKey(kGrantRaw);
  const res = await verifyGrant(token, key, now, expectedInstanceId);
  if (!res.ok) return { ok: false, reason: res.reason };
  // Belt-and-braces: only a token minted as an upload grant carries this marker. The derived key already
  // makes a cross-domain token unverifiable; this catches a future payload reuse under the same key.
  if (res.payload.ck !== UPLOAD_CK) return { ok: false, reason: 'bad-format' };
  const { i, cl, a, exp } = res.payload;
  return { ok: true, payload: { i, cl, a, exp } };
}
