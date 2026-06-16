import { describe, it, expect } from 'vitest';
import {
  extractToken,
  computeQsh,
  verifyConnectJwt,
  type SecretLookup,
  type RequestParts,
} from './connectJwt';

// ───────────────────────────── test crypto helpers (mint real HS256 tokens with crypto.subtle) ──────────

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlJson(obj: unknown): string {
  return b64url(enc.encode(JSON.stringify(obj)));
}

/** Mint a signed HS256 JWT. If `forceAlg` is given, the header alg differs from how we sign — used to
 *  prove alg-pinning rejects alg=none / RS256 regardless of how the bytes were produced. */
async function mintHs256(
  secret: string,
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' },
): Promise<string> {
  const headerB64 = b64urlJson(header);
  const payloadB64 = b64urlJson(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(signingInput)));
  return `${signingInput}.${b64url(sig)}`;
}

const headers = (h: Record<string, string> = {}): Headers => new Headers(h);
const SECRET = 'shared-secret-tenant-A';
const KEY = 'com.minisites.app';
const ISS = 'clientKey-A';

/** Fixed clock just after a token's iat; tokens use exp far in the future unless a test overrides. */
const FIXED_NOW_MS = 1_700_000_000_000;
const nowFixed = (): number => FIXED_NOW_MS;
const nowSec = Math.floor(FIXED_NOW_MS / 1000);

/** Secret resolver keyed on (clientKey, key) — proves §2.4 step 2: clientKey alone is not enough. */
const makeLookup = (rows: Record<string, string>): SecretLookup => {
  return async (clientKey: string, key: string) => rows[`${clientKey}|${key}`] ?? null;
};
const lookup = makeLookup({ [`${ISS}|${KEY}`]: SECRET });

// ───────────────────────────── (a) extractToken ─────────────────────────────────────────────────────────

describe('extractToken', () => {
  const TOKEN = 'aaa.bbb.ccc';

  it('entrypoint iframe GET → token from the ?jwt= query param', () => {
    const req: RequestParts = { method: 'GET', url: `/v/inst-1?jwt=${TOKEN}`, headers: headers() };
    expect(extractToken(req)).toEqual({ ok: true, token: TOKEN });
  });

  it('XHR → token from Authorization: JWT <token> (scheme JWT accepted)', () => {
    const req: RequestParts = {
      method: 'GET',
      url: '/v/inst-1/g/G/app.js',
      headers: headers({ authorization: `JWT ${TOKEN}` }),
    };
    expect(extractToken(req)).toEqual({ ok: true, token: TOKEN });
  });

  it('rejects the Bearer scheme (must equal JWT)', () => {
    const req: RequestParts = {
      method: 'GET',
      url: '/v/inst-1/g/G/app.js',
      headers: headers({ authorization: `Bearer ${TOKEN}` }),
    };
    const r = extractToken(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('authorization_scheme_invalid');
  });

  it('rejects an unknown/other scheme', () => {
    const req: RequestParts = {
      method: 'GET',
      url: '/x',
      headers: headers({ authorization: `Foo ${TOKEN}` }),
    };
    expect(extractToken(req).ok).toBe(false);
  });

  it('rejects when ?jwt= and Authorization disagree (parameter pollution)', () => {
    const req: RequestParts = {
      method: 'GET',
      url: `/v/inst-1?jwt=${TOKEN}`,
      headers: headers({ authorization: 'JWT ddd.eee.fff' }),
    };
    const r = extractToken(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_mismatch_query_vs_header');
  });

  it('accepts when ?jwt= and Authorization carry the SAME token', () => {
    const req: RequestParts = {
      method: 'GET',
      url: `/v/inst-1?jwt=${TOKEN}`,
      headers: headers({ authorization: `JWT ${TOKEN}` }),
    };
    expect(extractToken(req)).toEqual({ ok: true, token: TOKEN });
  });

  it('rejects when neither channel carries a token', () => {
    expect(extractToken({ method: 'GET', url: '/v/inst-1', headers: headers() }).ok).toBe(false);
  });

  it('rejects an empty ?jwt= value', () => {
    expect(extractToken({ method: 'GET', url: '/v/inst-1?jwt=', headers: headers() }).ok).toBe(false);
  });

  it('rejects a structurally incomplete token (missing signature segment)', () => {
    const req: RequestParts = { method: 'GET', url: '/v/inst-1?jwt=aaa.bbb', headers: headers() };
    const r = extractToken(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_malformed');
  });

  it('rejects an Authorization header with the JWT scheme but an empty token', () => {
    const req: RequestParts = { method: 'GET', url: '/x', headers: headers({ authorization: 'JWT ' }) };
    expect(extractToken(req).ok).toBe(false);
  });
});

// ───────────────────────────── (b) computeQsh ───────────────────────────────────────────────────────────

describe('computeQsh', () => {
  it('EXCLUDES the jwt param — present/absent jwt yields the same qsh', async () => {
    const withJwt = await computeQsh('GET', '/rest/api/content', { foo: 'bar', jwt: 'token-value' });
    const without = await computeQsh('GET', '/rest/api/content', { foo: 'bar' });
    expect(withJwt).toBe(without);
  });

  it('matches an asserted vector for the canonical request', async () => {
    // canonicalRequest = "GET&/rest/api/content&expand=body%2Cversion&foo=bar"
    //   - method upper-cased
    //   - params sorted by key (expand < foo); the jwt param excluded
    //   - value "body,version" percent-encoded → "body%2Cversion"
    // The expected hex is the SHA-256 of that exact string, computed here via an independent path.
    const canonical = 'GET&/rest/api/content&expand=body%2Cversion&foo=bar';
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(canonical));
    const expected = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

    const qsh = await computeQsh('GET', '/rest/api/content', {
      foo: 'bar',
      expand: 'body,version',
      jwt: 'ignored',
    });
    expect(qsh).toBe(expected);
    // 64 hex chars = SHA-256
    expect(qsh).toMatch(/^[0-9a-f]{64}$/);
  });

  it('upper-cases the method and is case-sensitive to it', async () => {
    const lower = await computeQsh('get', '/p', { a: '1' });
    const upper = await computeQsh('GET', '/p', { a: '1' });
    expect(lower).toBe(upper);
    const post = await computeQsh('POST', '/p', { a: '1' });
    expect(post).not.toBe(upper);
  });

  it('accepts URLSearchParams and excludes jwt there too', async () => {
    const sp = new URLSearchParams();
    sp.set('foo', 'bar');
    sp.set('jwt', 'tok');
    const fromSp = await computeQsh('GET', '/rest/api/content', sp);
    const fromObj = await computeQsh('GET', '/rest/api/content', { foo: 'bar' });
    expect(fromSp).toBe(fromObj);
  });
});

// ───────────────────────────── (c) verifyConnectJwt ─────────────────────────────────────────────────────

describe('verifyConnectJwt', () => {
  const validPayload = { iss: ISS, sub: 'account-1', exp: nowSec + 300, iat: nowSec - 10 };

  it('accepts a valid HS256 token', async () => {
    const token = await mintHs256(SECRET, validPayload);
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.iss).toBe(ISS);
      expect(r.payload.sub).toBe('account-1');
    }
  });

  it('rejects alg=none', async () => {
    // alg=none token: header says none, signature segment present but unverifiable.
    const token = await mintHs256(SECRET, validPayload, { alg: 'none', typ: 'JWT' });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('alg_not_hs256');
  });

  it('rejects alg=RS256 (RS↔HS confusion / alg-pin)', async () => {
    const token = await mintHs256(SECRET, validPayload, { alg: 'RS256', typ: 'JWT' });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('alg_not_hs256');
  });

  it('rejects a bad signature (signed with the wrong secret)', async () => {
    const token = await mintHs256('the-wrong-secret', validPayload);
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const token = await mintHs256(SECRET, validPayload);
    const [h, , s] = token.split('.');
    const forged = `${h}.${b64urlJson({ ...validPayload, sub: 'attacker' })}.${s}`;
    const r = await verifyConnectJwt(forged, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });

  it('rejects an expired token (beyond skew)', async () => {
    const token = await mintHs256(SECRET, { ...validPayload, exp: nowSec - 120 });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed, 60);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_expired');
  });

  it('accepts a token expired by less than the skew', async () => {
    const token = await mintHs256(SECRET, { ...validPayload, exp: nowSec - 30 });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed, 60);
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown iss (no matching install row)', async () => {
    const token = await mintHs256(SECRET, { ...validPayload, iss: 'unknown-tenant' });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown_install');
  });

  it('rejects when the (clientKey, key) pair has no row even though clientKey is known', async () => {
    // Same clientKey, different app-variant key → different/absent secret row (DESIGN §2.4 step 2).
    const token = await mintHs256(SECRET, validPayload);
    const r = await verifyConnectJwt(token, 'a-different-variant-key', lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown_install');
  });

  it('selects the correct secret per (clientKey, key) — Lite vs Full variant', async () => {
    const liteSecret = 'secret-lite';
    const fullSecret = 'secret-full';
    const twoVariants = makeLookup({
      [`${ISS}|lite`]: liteSecret,
      [`${ISS}|full`]: fullSecret,
    });
    const liteToken = await mintHs256(liteSecret, validPayload);
    const fullToken = await mintHs256(fullSecret, validPayload);

    expect((await verifyConnectJwt(liteToken, 'lite', twoVariants, nowFixed)).ok).toBe(true);
    expect((await verifyConnectJwt(fullToken, 'full', twoVariants, nowFixed)).ok).toBe(true);
    // A token minted with the lite secret must NOT verify under the full variant's secret.
    const crossed = await verifyConnectJwt(liteToken, 'full', twoVariants, nowFixed);
    expect(crossed.ok).toBe(false);
    if (!crossed.ok) expect(crossed.reason).toBe('bad_signature');
  });

  it('rejects a malformed token (not three segments)', async () => {
    const r = await verifyConnectJwt('only.two', KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token_malformed');
  });

  it('rejects a token whose iss claim is absent', async () => {
    const token = await mintHs256(SECRET, { sub: 'x', exp: nowSec + 300 });
    const r = await verifyConnectJwt(token, KEY, lookup, nowFixed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('iss_absent');
  });
});
