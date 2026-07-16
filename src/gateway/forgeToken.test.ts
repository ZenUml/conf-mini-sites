import { describe, it, expect, beforeAll } from 'vitest';
import * as jose from 'jose';
import { verifyForgeToken, extractBearer } from './forgeToken';
import type { VerifyForgeOptions } from './forgeToken';

const OUR_APP = '2efdb7d9-ee5a-4294-b56a-b514e36e1a98';
const APP_ARI = `ari:cloud:ecosystem::app/${OUR_APP}`;

let priv: jose.CryptoKey;
let getKey: jose.JWTVerifyGetKey; // local JWKS bound to `priv`'s public key
let otherPriv: jose.CryptoKey; // a key NOT in the JWKS (forged-signer case)

beforeAll(async () => {
  const kp = await jose.generateKeyPair('RS256', { extractable: true });
  priv = kp.privateKey;
  const pubJwk = await jose.exportJWK(kp.publicKey);
  pubJwk.kid = 'test-key-1';
  pubJwk.alg = 'RS256';
  getKey = jose.createLocalJWKSet({ keys: [pubJwk] });
  otherPriv = (await jose.generateKeyPair('RS256', { extractable: true })).privateKey;
});

async function sign(
  signer: jose.CryptoKey,
  payload: Record<string, unknown>,
  opts: { exp?: string | number; iss?: string | null; aud?: string | null } = {},
): Promise<string> {
  const jwt = new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuedAt();
  jwt.setExpirationTime(opts.exp ?? '5m');
  // Real FITs always carry iss "forge/invocation-token" and aud = the app ARI. Valid by default so every
  // fixture models a real token; pass null to omit a claim, a string to override.
  const iss = opts.iss === undefined ? 'forge/invocation-token' : opts.iss;
  const aud = opts.aud === undefined ? APP_ARI : opts.aud;
  if (iss !== null) jwt.setIssuer(iss);
  if (aud !== null) jwt.setAudience(aud);
  return jwt.sign(signer);
}

const opts = (): VerifyForgeOptions => ({ getKey, allowedAppIds: [OUR_APP] });

describe('extractBearer', () => {
  it('reads "Bearer <token>"', () => expect(extractBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi'));
  it('accepts a bare single-segment token', () => expect(extractBearer('abc.def.ghi')).toBe('abc.def.ghi'));
  it('returns null for absent/garbage', () => {
    expect(extractBearer(null)).toBeNull();
    expect(extractBearer('')).toBeNull();
    expect(extractBearer('Basic foo bar')).toBeNull();
  });
});

describe('verifyForgeToken', () => {
  it('accepts a valid token from our app and returns context', async () => {
    const token = await sign(priv, {
      app: { id: APP_ARI },
      context: { cloudId: 'cloud-123', siteUrl: 'https://acme.atlassian.net' },
    });
    const res = await verifyForgeToken(token, opts());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.context.appId).toBe(OUR_APP);
      expect(res.context.cloudId).toBe('cloud-123');
      expect(res.context.siteUrl).toBe('https://acme.atlassian.net');
    }
  });

  it('rejects a missing token (no-token)', async () => {
    expect(await verifyForgeToken(null, opts())).toMatchObject({ ok: false, reason: 'no-token' });
  });

  it('rejects a token signed by a key not in the JWKS (bad-token)', async () => {
    const token = await sign(otherPriv, { app: { id: APP_ARI } });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('rejects an expired token (bad-token)', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } }, { exp: Math.floor(Date.now() / 1000) - 60 });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('rejects a token from a different app (app-mismatch)', async () => {
    const token = await sign(priv, { app: { id: 'ari:cloud:ecosystem::app/some-other-app' } });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'app-mismatch' });
  });

  it('rejects a token with no app claim (app-mismatch)', async () => {
    const token = await sign(priv, { context: { cloudId: 'c' } });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'app-mismatch' });
  });

  it('rejects a token with the wrong issuer (bad-token)', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } }, { iss: 'connect/session-token' });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('rejects a token with no issuer (bad-token)', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } }, { iss: null });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('rejects a token whose audience is another app (bad-token)', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } }, { aud: 'ari:cloud:ecosystem::app/some-other-app' });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('rejects a token with no audience (bad-token)', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } }, { aud: null });
    expect(await verifyForgeToken(token, opts())).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('honours a multi-id allowlist', async () => {
    const token = await sign(priv, { app: { id: APP_ARI } });
    const res = await verifyForgeToken(token, { getKey, allowedAppIds: ['other-app', OUR_APP] });
    expect(res.ok).toBe(true);
  });
});
