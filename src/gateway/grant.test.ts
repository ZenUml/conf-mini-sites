// Tests for the signed-path grant token (DESIGN.md §2.7, INV-GW-07). Single concrete implementation, so a
// plain test file (no contract harness). Deterministic: the clock is an injected fixed function.
import { describe, it, expect } from 'vitest';
import { mintGrant, verifyGrant, type GrantPayload } from './grant';

// Fixed K_grant + clock so every assertion is deterministic (no system-clock reads in business logic).
const KEY = new TextEncoder().encode('test-K_grant-32-bytes-or-whatever!');
const FIXED_NOW = 1_700_000_000_000; // epoch ms
const now = () => FIXED_NOW;

const basePayload: GrantPayload = {
  i: 'inst-1',
  c: 'page-1',
  a: 'acct-1',
  cl: 'cloud-1',
  exp: FIXED_NOW + 60_000, // +60s TTL, the §2.7 cap
};

describe('grant token (§2.7)', () => {
  it('round-trips: mint then verify returns ok with the same payload', async () => {
    const token = await mintGrant(basePayload, KEY, now);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); // base64url . base64url, no padding
    const res = await verifyGrant(token, KEY, now, 'inst-1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload).toEqual(basePayload);
  });

  it('tampered payload → bad-signature', async () => {
    const token = await mintGrant(basePayload, KEY, now);
    // Re-sign nothing: just swap the payload segment for one that decodes to a different contentId.
    const sigSeg = token.slice(token.indexOf('.') + 1);
    const forged: GrantPayload = { ...basePayload, c: 'page-EVIL' };
    const forgedPayloadSeg = b64url(new TextEncoder().encode(JSON.stringify(forged)));
    const tampered = `${forgedPayloadSeg}.${sigSeg}`;
    const res = await verifyGrant(tampered, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('a grant signed with a different key → bad-signature', async () => {
    const token = await mintGrant(basePayload, new TextEncoder().encode('attacker-key'), now);
    const res = await verifyGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('expired (exp <= now) → expired', async () => {
    const expired: GrantPayload = { ...basePayload, exp: FIXED_NOW - 1 };
    const token = await mintGrant(expired, KEY, now);
    const res = await verifyGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'expired' });
  });

  it('exp exactly equal to now → expired (strictly-future required)', async () => {
    const atBoundary: GrantPayload = { ...basePayload, exp: FIXED_NOW };
    const token = await mintGrant(atBoundary, KEY, now);
    const res = await verifyGrant(token, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'expired' });
  });

  it('wrong expectedInstanceId → instance-mismatch (path bind, §2.7 step 4b)', async () => {
    const token = await mintGrant(basePayload, KEY, now);
    const res = await verifyGrant(token, KEY, now, 'inst-OTHER');
    expect(res).toEqual({ ok: false, reason: 'instance-mismatch' });
  });

  it('signature is checked before exp/instance — a forged token for another instance still reads bad-signature', async () => {
    // Attacker hand-crafts a payload for a different instance, but cannot sign it.
    const evil: GrantPayload = { ...basePayload, i: 'inst-OTHER', exp: FIXED_NOW - 999 };
    const payloadSeg = b64url(new TextEncoder().encode(JSON.stringify(evil)));
    const forged = `${payloadSeg}.${b64url(new Uint8Array([1, 2, 3, 4]))}`;
    const res = await verifyGrant(forged, KEY, now, 'inst-1');
    expect(res).toEqual({ ok: false, reason: 'bad-signature' });
  });

  describe('malformed token → bad-format', () => {
    const cases: Array<[string, string]> = [
      ['empty string', ''],
      ['no dot', 'abcdef'],
      ['leading dot (empty payload seg)', '.abc'],
      ['trailing dot (empty sig seg)', 'abc.'],
      ['three segments', 'a.b.c'],
      ['payload not valid base64url', '!!!.@@@'],
      ['payload not JSON', `${b64url(new TextEncoder().encode('not json'))}.${b64url(new Uint8Array([1]))}`],
      [
        'JSON missing a required claim',
        `${b64url(new TextEncoder().encode(JSON.stringify({ i: 'inst-1', c: 'p', a: 'a' })))}.${b64url(new Uint8Array([1]))}`,
      ],
      [
        'JSON with non-numeric exp',
        `${b64url(new TextEncoder().encode(JSON.stringify({ ...basePayload, exp: 'soon' })))}.${b64url(new Uint8Array([1]))}`,
      ],
    ];
    for (const [name, token] of cases) {
      it(name, async () => {
        const res = await verifyGrant(token, KEY, now, 'inst-1');
        expect(res).toEqual({ ok: false, reason: 'bad-format' });
      });
    }
  });
});

/** Local base64url encoder for crafting adversarial tokens in tests (mirrors grant.ts's private encoder). */
function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
