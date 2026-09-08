// Tests for the UPLOAD grant (src/gateway/uploadGrant.ts). Deterministic: fixed key + injected clock.
//
// The security property under test is DOMAIN SEPARATION: an upload grant authorizes a bundle POST to the
// CONTROL Worker, a serve grant authorizes byte reads from the DISPATCH Worker. Neither may be accepted
// where the other is expected, even though both are minted from the same K_GRANT material.
import { describe, it, expect } from 'vitest';
import { mintGrant, verifyGrant } from './grant';
import {
  mintUploadGrant,
  verifyUploadGrant,
  UPLOAD_GRANT_TTL_MS,
  type UploadGrantPayload,
} from './uploadGrant';

const KEY = new TextEncoder().encode('test-K_grant-32-bytes-or-whatever!');
const OTHER_KEY = new TextEncoder().encode('a-completely-different-K_grant---');
const FIXED_NOW = 1_700_000_000_000;
const now = () => FIXED_NOW;

const basePayload: UploadGrantPayload = {
  i: 'inst-1',
  cl: 'cloud-1',
  a: 'acct-1',
  exp: FIXED_NOW + UPLOAD_GRANT_TTL_MS,
};

describe('upload grant', () => {
  it('has a short TTL (bounded replay window for a direct browser→control POST)', () => {
    expect(UPLOAD_GRANT_TTL_MS).toBe(120_000);
  });

  it('round-trips: mint then verify returns ok with the same payload', async () => {
    const token = await mintUploadGrant(basePayload, KEY, now);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const res = await verifyUploadGrant(token, KEY, now, 'inst-1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload).toEqual(basePayload);
  });

  it('a grant minted with a different K_GRANT → bad-signature', async () => {
    const token = await mintUploadGrant(basePayload, OTHER_KEY, now);
    const res = await verifyUploadGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('a SERVE grant (grant.ts, raw K_GRANT) is not accepted as an upload grant → bad-signature', async () => {
    const serve = await mintGrant(
      { i: 'inst-1', ck: 'app-1', c: '', a: 'acct-1', cl: 'cloud-1', exp: FIXED_NOW + 60_000 },
      KEY,
      now,
    );
    const res = await verifyUploadGrant(serve, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('an UPLOAD grant is not accepted as a serve grant by the dispatch Worker → bad-signature', async () => {
    const token = await mintUploadGrant(basePayload, KEY, now);
    const res = await verifyGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('tampered payload segment → bad-signature', async () => {
    const token = await mintUploadGrant(basePayload, KEY, now);
    const sigSeg = token.slice(token.indexOf('.') + 1);
    const forged = { i: 'inst-1', ck: 'upload', c: '', a: 'acct-EVIL', cl: 'cloud-1', exp: basePayload.exp };
    const bytes = new TextEncoder().encode(JSON.stringify(forged));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const seg = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await verifyUploadGrant(`${seg}.${sigSeg}`, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('expired (exp <= now) → expired', async () => {
    const token = await mintUploadGrant({ ...basePayload, exp: FIXED_NOW - 1 }, KEY, now);
    const res = await verifyUploadGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'expired' });
  });

  it('wrong expectedInstanceId → instance-mismatch', async () => {
    const token = await mintUploadGrant(basePayload, KEY, now);
    const res = await verifyUploadGrant(token, KEY, now, 'inst-OTHER');
    expect(res).toEqual({ ok: false, reason: 'instance-mismatch' });
  });

  it('garbage / empty token → bad-format', async () => {
    for (const t of ['', 'not-a-token', 'a.b.c', '.abc', 'abc.']) {
      expect(await verifyUploadGrant(t, KEY, now, 'inst-1')).toEqual({ ok: false, reason: 'bad-format' });
    }
  });
});
