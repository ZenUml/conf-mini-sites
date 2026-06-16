// Flow tests for the auth gateway composition (DESIGN §1.4, §2). Exercises the happy path end-to-end and
// every fail-closed branch, with real module impls behind injected fakes (no Worker runtime, no cloud).
import { describe, it, expect } from 'vitest';
import { handleGatewayRequest, parseRoute } from './gateway';
import type { GatewayDeps } from './gateway';
import { InMemoryInstanceStore } from '../db/InMemoryInstanceStore';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { InMemoryWfpClient } from '../hosting/InMemoryWfpClient';
import { bundleOf } from '../hosting/providerContract';
import { PermissionGate } from '../gateway/permissionCache';
import type { SecretLookup } from '../gateway/connectJwt';

const te = new TextEncoder();
const APP_KEY = 'com.confmini.app';
const SECRET = 'shhh-shared-secret-for-ck1';
const GRANT_KEY = te.encode('grant-key-32-bytes-or-whatever!!');
const FIXED_NOW = 1_700_000_000_000;
const now = (): number => FIXED_NOW;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function mintConnectJwt(secret: string, claims: Record<string, unknown>): Promise<string> {
  const signingInput = `${b64url(te.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))}.${b64url(te.encode(JSON.stringify(claims)))}`;
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(signingInput)));
  return `${signingInput}.${b64url(sig)}`;
}
const validClaims = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  iss: 'ck-1', sub: 'acct-1', cloudId: 'cloud-1', contentId: 'page-1',
  exp: Math.floor(FIXED_NOW / 1000) + 300, qsh: 'context-qsh', ...over,
});

async function makeDeps(allow = true): Promise<GatewayDeps> {
  const store = new InMemoryInstanceStore();
  await store.upsert({
    clientKey: 'ck-1', cloudId: 'cloud-1', instanceId: 'inst-1', workerName: 'ms-inst-1',
    contentId: 'page-1', macroLocalId: 'm1', bundleHash: 'h', status: 'active',
  });
  const provider = new CloudflareWfPProvider(new InMemoryWfpClient());
  await provider.createInstance(
    { id: 'inst-1', providerRef: 'ms-inst-1' },
    bundleOf('index.html', { 'index.html': '<!doctype html><head></head><body><h1>hi</h1></body>', 'app.js': 'console.log(1)' }),
  );
  const gate = new PermissionGate({ checker: { check: async () => allow }, now });
  const lookupSecret: SecretLookup = async (ck, key) => (ck === 'ck-1' && key === APP_KEY ? SECRET : null);
  return { store, lookupSecret, gate, provider, grantKey: GRANT_KEY, appKey: APP_KEY, now };
}

const get = (path: string): Request => new Request(`https://gw.example${path}`);

describe('auth gateway flow', () => {
  it('entrypoint: valid JWT + allow → 200 with injected <base> + CSP + nosniff', async () => {
    const deps = await makeDeps(true);
    const token = await mintConnectJwt(SECRET, validClaims());
    const res = await handleGatewayRequest(get(`/v/inst-1?jwt=${token}`), deps);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/<base href="\/v\/inst-1\/g\/[^"]+\/">/);
    expect(body).toContain('<h1>hi</h1>');
    expect(res.headers.get('content-security-policy')).toContain('frame-ancestors');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('sub-resource: the minted grant serves app.js (200)', async () => {
    const deps = await makeDeps(true);
    const token = await mintConnectJwt(SECRET, validClaims());
    const entry = await handleGatewayRequest(get(`/v/inst-1?jwt=${token}`), deps);
    const grant = (await entry.text()).match(/\/v\/inst-1\/g\/([^/]+)\//)![1];
    const res = await handleGatewayRequest(get(`/v/inst-1/g/${grant}/app.js`), deps);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('console.log');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('entrypoint: no token → 401', async () => {
    expect((await handleGatewayRequest(get('/v/inst-1'), await makeDeps())).status).toBe(401);
  });

  it('entrypoint: permission denied → 403', async () => {
    const deps = await makeDeps(false);
    const token = await mintConnectJwt(SECRET, validClaims());
    expect((await handleGatewayRequest(get(`/v/inst-1?jwt=${token}`), deps)).status).toBe(403);
  });

  it('entrypoint: unknown instance → 404 (composite-key get, no existence oracle)', async () => {
    const deps = await makeDeps();
    const token = await mintConnectJwt(SECRET, validClaims());
    expect((await handleGatewayRequest(get(`/v/missing?jwt=${token}`), deps)).status).toBe(404);
  });

  it('entrypoint: contentId bind mismatch → 403 (INV-GW-06)', async () => {
    const deps = await makeDeps();
    const token = await mintConnectJwt(SECRET, validClaims({ contentId: 'page-OTHER' }));
    expect((await handleGatewayRequest(get(`/v/inst-1?jwt=${token}`), deps)).status).toBe(403);
  });

  it('entrypoint: token signed with the wrong secret → 401', async () => {
    const deps = await makeDeps();
    const token = await mintConnectJwt('wrong-secret', validClaims());
    expect((await handleGatewayRequest(get(`/v/inst-1?jwt=${token}`), deps)).status).toBe(401);
  });

  it('sub-resource: forged/garbage grant → 401', async () => {
    const deps = await makeDeps();
    expect((await handleGatewayRequest(get('/v/inst-1/g/not-a-real-grant/app.js'), deps)).status).toBe(401);
  });

  it('deny-by-default: unknown routes → 404', async () => {
    const deps = await makeDeps();
    expect((await handleGatewayRequest(get('/random'), deps)).status).toBe(404);
    expect((await handleGatewayRequest(get('/v/inst-1/notg/x'), deps)).status).toBe(404);
  });
});

describe('parseRoute', () => {
  it('classifies entrypoint vs sub-resource vs deny', () => {
    expect(parseRoute('/v/inst-1')).toEqual({ kind: 'entrypoint', instanceId: 'inst-1' });
    expect(parseRoute('/v/inst-1/g/GRANT/assets/app.js')).toEqual({ kind: 'subresource', instanceId: 'inst-1', grant: 'GRANT', filePath: 'assets/app.js' });
    expect(parseRoute('/v/inst-1/g/GRANT/')).toEqual({ kind: 'subresource', instanceId: 'inst-1', grant: 'GRANT', filePath: 'index.html' });
    expect(parseRoute('/health')).toBeNull();
    expect(parseRoute('/')).toBeNull();
  });
});
