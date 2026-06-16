// Signed-path grant token — the mechanism that makes "every protected byte authorized" (INV-GW-07)
// implementable for a multi-file bundle whose sub-resources carry no Authorization header. See DESIGN.md §2.7.
//
// A grant is minted ONLY after the gateway has run §2.4 verify + §2.5 bind + permission/check on the
// entrypoint. It is then embedded in `<base href="/v/<instanceId>/g/<token>/">` so the browser resolves
// every relative sub-resource under a path the gateway can re-validate. The grant is HMAC-SHA-256 signed by a
// gateway-internal key (K_grant) so the client cannot forge one for another contentId/accountId, and the
// path's instanceId is cross-checked against the signed `i` claim (unforgeable — §2.7 step 4b).
//
// This file is the pure crypto/codec core: mint + verify. Key provision, rotation, envelope-encryption of
// K_grant, the permission re-check, and the path-instanceId extraction live in the caller (the gateway
// request handler). K_grant compromise = forgeable grants → treat like sharedSecret (never logged).

/** The grant payload. Field names are single-letter to keep the token short (it rides in every asset URL). */
export interface GrantPayload {
  /** instanceId — the path's `<instanceId>` MUST equal this (§2.7 step 4b, unforgeable bind). */
  readonly i: string;
  /** contentId — the Confluence content the grant authorizes (from a signed claim, never a header). */
  readonly c: string;
  /** accountId — the verified `sub` the permission re-check runs for. */
  readonly a: string;
  /** cloudId — the tenant the grant is scoped to. */
  readonly cl: string;
  /** exp — absolute expiry in epoch ms. TTL = permission-cache TTL (≤60s); short by design. */
  readonly exp: number;
}

export type VerifyGrantResult =
  | { readonly ok: true; readonly payload: GrantPayload }
  | { readonly ok: false; readonly reason: VerifyGrantFailure };

export type VerifyGrantFailure = 'bad-format' | 'bad-signature' | 'expired' | 'instance-mismatch';

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Import a raw HMAC key once per call. `keyRaw` is K_grant's raw bytes (kept out of logs by the caller). */
async function importKey(keyRaw: Uint8Array, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  // `crypto.subtle.importKey` types `keyData` as BufferSource; pass the underlying ArrayBuffer view.
  return crypto.subtle.importKey(
    'raw',
    keyRaw as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

/** base64url-encode bytes (no padding, URL-safe alphabet) — the token rides in a URL path segment. */
function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url-decode to bytes. Throws on malformed input (the caller maps that to 'bad-format'). */
function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64); // throws if `s` is not valid base64url
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Mint a grant token: `base64url(JSON(payload)) + "." + base64url(HMAC-SHA-256(payload-bytes, keyRaw))`.
 * The HMAC is computed over the EXACT payload bytes that are encoded in the first segment, so verify
 * re-uses those same bytes — there is no canonical-JSON ambiguity to exploit.
 *
 * @param payload the grant claims (caller fills `exp = now() + TTL`)
 * @param keyRaw  raw bytes of K_grant
 * @param now     injected clock (epoch ms) — present for symmetry/determinism; mint does not branch on it.
 */
export async function mintGrant(
  payload: GrantPayload,
  keyRaw: Uint8Array,
  now: () => number,
): Promise<string> {
  void now; // mint is time-independent; the clock is injected for a uniform signature with verifyGrant.
  const payloadBytes = enc.encode(JSON.stringify(payload));
  const key = await importKey(keyRaw, 'sign');
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes as unknown as BufferSource));
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

/**
 * Verify a grant token. Order of checks is security-significant:
 *   1. structural parse (two base64url segments, decodable, payload is valid JSON with the required shape)
 *      → 'bad-format'
 *   2. HMAC verify over the decoded payload bytes → 'bad-signature' (closes tamper/forge — §2.7 "unforgeable")
 *   3. `exp > now` → 'expired' (short TTL bounds replay — INV-GW-07 / I4)
 *   4. `payload.i === expectedInstanceId` → 'instance-mismatch' (the path's instanceId MUST match the signed
 *      claim; a client cannot mint a grant for another instance — §2.7 step 4b)
 *
 * Signature is checked BEFORE exp/instance so an attacker learns nothing about a forged token beyond
 * "bad-signature"; the time/instance checks only run on bytes we have already proven we signed.
 *
 * @param expectedInstanceId the `<instanceId>` taken from the request PATH (not from the token).
 */
export async function verifyGrant(
  token: string,
  keyRaw: Uint8Array,
  now: () => number,
  expectedInstanceId: string,
): Promise<VerifyGrantResult> {
  // 1. Structure: exactly two non-empty segments separated by a single '.'.
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1 || token.indexOf('.', dot + 1) !== -1) {
    return { ok: false, reason: 'bad-format' };
  }
  const payloadSeg = token.slice(0, dot);
  const sigSeg = token.slice(dot + 1);

  let payloadBytes: Uint8Array;
  let sig: Uint8Array;
  try {
    payloadBytes = b64urlDecode(payloadSeg);
    sig = b64urlDecode(sigSeg);
  } catch {
    return { ok: false, reason: 'bad-format' };
  }

  let payload: GrantPayload;
  try {
    payload = JSON.parse(dec.decode(payloadBytes)) as GrantPayload;
  } catch {
    return { ok: false, reason: 'bad-format' };
  }
  if (!isGrantPayload(payload)) {
    return { ok: false, reason: 'bad-format' };
  }

  // 2. Signature over the exact decoded payload bytes (fail-closed on tamper/forge).
  const key = await importKey(keyRaw, 'verify');
  const sigOk = await crypto.subtle.verify(
    'HMAC',
    key,
    sig as unknown as BufferSource,
    payloadBytes as unknown as BufferSource,
  );
  if (!sigOk) {
    return { ok: false, reason: 'bad-signature' };
  }

  // 3. Expiry (epoch ms). exp must be strictly in the future relative to the injected clock.
  if (!(payload.exp > now())) {
    return { ok: false, reason: 'expired' };
  }

  // 4. Unforgeable instance bind: the path's instanceId must equal the signed claim.
  if (payload.i !== expectedInstanceId) {
    return { ok: false, reason: 'instance-mismatch' };
  }

  return { ok: true, payload };
}

/** Structural guard: every claim present with the right primitive type and `exp` a finite number. */
function isGrantPayload(p: unknown): p is GrantPayload {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.i === 'string' &&
    typeof o.c === 'string' &&
    typeof o.a === 'string' &&
    typeof o.cl === 'string' &&
    typeof o.exp === 'number' &&
    Number.isFinite(o.exp)
  );
}
