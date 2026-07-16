import { describe, it, expect } from 'vitest';
import { authorizeControlCall } from './authorize';
import type { AuthorizeDeps } from './authorize';
import type { VerifyForgeResult } from './forgeToken';

const FIT_CONTEXT = { appId: 'app-1', cloudId: 'cloud-1', payload: {} } as const;

const verifyOk = async (): Promise<VerifyForgeResult> => ({ ok: true, context: FIT_CONTEXT });
const verifyBad = async (): Promise<VerifyForgeResult> => ({ ok: false, reason: 'bad-token' });

const deps = (over: Partial<AuthorizeDeps> = {}): AuthorizeDeps => ({
  sharedSecret: 's3cret',
  verifyToken: verifyOk,
  ...over,
});

describe('authorizeControlCall', () => {
  it('authorizes via FIT when a valid bearer token is present', async () => {
    const d = await authorizeControlCall({ authorization: 'Bearer a.b.c', sharedSecret: null }, deps());
    expect(d).toMatchObject({ ok: true, via: 'fit', context: { appId: 'app-1', cloudId: 'cloud-1' } });
  });

  it('passes the EXTRACTED token (not the raw header) to the verifier', async () => {
    let seen: string | null = null;
    const d = deps({
      verifyToken: async (t) => {
        seen = t;
        return { ok: true, context: FIT_CONTEXT };
      },
    });
    await authorizeControlCall({ authorization: 'Bearer a.b.c', sharedSecret: null }, d);
    expect(seen).toBe('a.b.c');
  });

  it('a bearer token is BINDING: an invalid FIT rejects even alongside a valid secret', async () => {
    const d = await authorizeControlCall(
      { authorization: 'Bearer forged.tok.en', sharedSecret: 's3cret' },
      deps({ verifyToken: verifyBad }),
    );
    expect(d).toMatchObject({ ok: false, reason: 'bad-token' });
  });

  it('prefers FIT over the secret when both are valid (via reports fit)', async () => {
    const d = await authorizeControlCall({ authorization: 'Bearer a.b.c', sharedSecret: 's3cret' }, deps());
    expect(d).toMatchObject({ ok: true, via: 'fit' });
  });

  it('falls back to the shared secret when no bearer token is present', async () => {
    const d = await authorizeControlCall({ authorization: null, sharedSecret: 's3cret' }, deps());
    expect(d).toMatchObject({ ok: true, via: 'shared-secret', context: { appId: 'shared-secret' } });
  });

  it('a non-Bearer authorization header does not block the secret path', async () => {
    const d = await authorizeControlCall({ authorization: 'Basic dXNlcjpwdw==', sharedSecret: 's3cret' }, deps());
    expect(d).toMatchObject({ ok: true, via: 'shared-secret' });
  });

  it('rejects a wrong secret (bad-secret)', async () => {
    const d = await authorizeControlCall({ authorization: null, sharedSecret: 'nope' }, deps());
    expect(d).toMatchObject({ ok: false, reason: 'bad-secret' });
  });

  it('rejects the secret path when no secret is configured (bad-secret)', async () => {
    const d = await authorizeControlCall(
      { authorization: null, sharedSecret: 's3cret' },
      deps({ sharedSecret: undefined }),
    );
    expect(d).toMatchObject({ ok: false, reason: 'bad-secret' });
  });

  it('rejects when neither credential is present (no-credentials)', async () => {
    const d = await authorizeControlCall({ authorization: null, sharedSecret: null }, deps());
    expect(d).toMatchObject({ ok: false, reason: 'no-credentials' });
  });
});
