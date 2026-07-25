import { describe, it, expect, beforeEach } from 'vitest';
import { handleForgeServe, parseServeRoute } from './forgeGateway';
import type { ForgeGatewayDeps } from './forgeGateway';
import { mintGrant } from '../gateway/grant';
import type { GrantPayload } from '../gateway/grant';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { InMemoryWfpClient } from '../hosting/InMemoryWfpClient';
import { bundleOf } from '../hosting/providerContract';
import type { MixpanelServiceEvent } from '../analytics/miniSiteEvents';

const NOW = 1_700_000_000_000;
const TTL = 300_000;
const enc = new TextEncoder();
const GRANT_KEY = enc.encode('test-grant-key-0123456789abcdef'); // 31 bytes — fine for HMAC

let provider: CloudflareWfPProvider;
let deps: ForgeGatewayDeps;

beforeEach(async () => {
  provider = new CloudflareWfPProvider(new InMemoryWfpClient());
  // Provision instance "inst-1" (provider derives worker name ms-inst-1).
  await provider.createInstance(
    { id: 'inst-1', providerRef: 'ms-inst-1' },
    bundleOf('index.html', {
      'index.html': '<head><title>x</title></head><body><script src="app.js"></script></body>',
      'app.js': 'console.log(1)',
    }),
  );
  deps = { provider, grantKey: GRANT_KEY, now: () => NOW };
});

function grantFor(instanceId: string, expMs: number): Promise<string> {
  const payload: GrantPayload = { i: instanceId, ck: 'ck', c: 'page-1', a: 'acct-1', cl: 'cloud-1', exp: expMs };
  return mintGrant(payload, GRANT_KEY, () => NOW);
}

const req = (path: string, method = 'GET'): Request => new Request(`https://dispatch${path}`, { method });

describe('parseServeRoute', () => {
  it('parses entrypoint (empty path ⇒ index.html)', () => {
    expect(parseServeRoute('/v/inst-1/g/TOKEN/')).toEqual({ instanceId: 'inst-1', grant: 'TOKEN', filePath: 'index.html' });
  });
  it('parses a sub-resource path', () => {
    expect(parseServeRoute('/v/inst-1/g/TOKEN/assets/app.js')).toEqual({
      instanceId: 'inst-1', grant: 'TOKEN', filePath: 'assets/app.js',
    });
  });
  it('rejects non-grant shapes (deny-by-default)', () => {
    expect(parseServeRoute('/v/inst-1')).toBeNull();
    expect(parseServeRoute('/v/inst-1/app.js')).toBeNull();
    expect(parseServeRoute('/healthz')).toBeNull();
    expect(parseServeRoute('/')).toBeNull();
  });
});

describe('handleForgeServe — authorization', () => {
  it('serves the entrypoint with a valid grant, injects <base> + CSP', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    const res = await handleForgeServe(req(`/v/inst-1/g/${grant}/`), deps);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`<base href="/v/inst-1/g/${grant}/">`);
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors https://*.atlassian.net");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves a sub-resource (no base injection, correct content-type, still hardened)', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    const res = await handleForgeServe(req(`/v/inst-1/g/${grant}/app.js`), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(await res.text()).not.toContain('<base');
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('denies (401) an expired grant', async () => {
    const grant = await grantFor('inst-1', NOW - 1);
    expect((await handleForgeServe(req(`/v/inst-1/g/${grant}/`), deps)).status).toBe(401);
  });

  it('denies (401) a tampered grant signature', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    const tampered = grant.slice(0, -2) + (grant.endsWith('A') ? 'B' : 'A');
    expect((await handleForgeServe(req(`/v/inst-1/g/${tampered}/`), deps)).status).toBe(401);
  });

  it('denies (401) a grant minted for another instance (path↔claim mismatch)', async () => {
    const grant = await grantFor('inst-OTHER', NOW + TTL);
    expect((await handleForgeServe(req(`/v/inst-1/g/${grant}/`), deps)).status).toBe(401);
  });

  it('denies (401) a grant signed with a different key', async () => {
    const otherKey = enc.encode('a-totally-different-grant-key!!!');
    const forged = await mintGrant(
      { i: 'inst-1', ck: 'ck', c: 'c', a: 'a', cl: 'cl', exp: NOW + TTL },
      otherKey,
      () => NOW,
    );
    expect((await handleForgeServe(req(`/v/inst-1/g/${forged}/`), deps)).status).toBe(401);
  });

  it('denies (404) a non-grant route shape', async () => {
    expect((await handleForgeServe(req('/v/inst-1'), deps)).status).toBe(404);
    expect((await handleForgeServe(req('/healthz'), deps)).status).toBe(404);
  });

  it('denies (405) a non-GET method', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    expect((await handleForgeServe(req(`/v/inst-1/g/${grant}/`, 'POST'), deps)).status).toBe(405);
  });

  it('passes through a 404 for a missing file (valid grant) but still hardens it', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    const res = await handleForgeServe(req(`/v/inst-1/g/${grant}/missing.css`), deps);
    expect(res.status).toBe(404);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('an empty grant key fails closed (every grant 401) — unwired deployment denies', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    const unwired: ForgeGatewayDeps = { ...deps, grantKey: enc.encode('') };
    expect((await handleForgeServe(req(`/v/inst-1/g/${grant}/`), unwired)).status).toBe(401);
  });
});

describe('handleForgeServe — render analytics (mini_site_render_succeeded/failed)', () => {
  function withTrack(): { deps: ForgeGatewayDeps; events: MixpanelServiceEvent[] } {
    const events: MixpanelServiceEvent[] = [];
    return { deps: { ...deps, track: (e) => events.push(e) }, events };
  }

  it('tracks mini_site_render_succeeded once for a valid entrypoint request', async () => {
    const { deps: tracked, events } = withTrack();
    const grant = await grantFor('inst-1', NOW + TTL);
    await handleForgeServe(req(`/v/inst-1/g/${grant}/`), tracked);
    expect(events.length).toBe(1);
    expect(events[0]!.event).toBe('mini_site_render_succeeded');
    expect(events[0]!.properties.instance_id).toBe('inst-1');
    expect(events[0]!.properties.cloud_id).toBe('cloud-1');
    expect(events[0]!.properties.account_id).toBe('acct-1');
    expect(typeof events[0]!.properties.duration_ms).toBe('number');
  });

  it('does NOT track sub-resource requests (only the entrypoint document)', async () => {
    const { deps: tracked, events } = withTrack();
    const grant = await grantFor('inst-1', NOW + TTL);
    await handleForgeServe(req(`/v/inst-1/g/${grant}/app.js`), tracked);
    expect(events.length).toBe(0);
  });

  it('tracks mini_site_render_failed with the grant-verify reason for an expired grant on the entrypoint', async () => {
    const { deps: tracked, events } = withTrack();
    const grant = await grantFor('inst-1', NOW - 1);
    await handleForgeServe(req(`/v/inst-1/g/${grant}/`), tracked);
    expect(events.length).toBe(1);
    expect(events[0]!.event).toBe('mini_site_render_failed');
    expect(events[0]!.properties.reason).toBe('grant_expired');
  });

  it('tracks mini_site_render_failed (http_404) for a valid grant to an entrypoint the provider 404s', async () => {
    // Re-provision without index.html so the entrypoint itself 404s from the provider.
    const emptyProvider = new CloudflareWfPProvider(new InMemoryWfpClient());
    await emptyProvider.createInstance({ id: 'inst-empty', providerRef: 'ms-inst-empty' }, bundleOf('index.html', { 'other.txt': 'x' }));
    const events: MixpanelServiceEvent[] = [];
    const tracked: ForgeGatewayDeps = { ...deps, provider: emptyProvider, track: (e) => events.push(e) };
    const grant = await mintGrant({ i: 'inst-empty', ck: 'ck', c: 'page-1', a: 'acct-1', cl: 'cloud-1', exp: NOW + TTL }, GRANT_KEY, () => NOW);
    await handleForgeServe(req(`/v/inst-empty/g/${grant}/`), tracked);
    expect(events.length).toBe(1);
    expect(events[0]!.event).toBe('mini_site_render_failed');
    expect(events[0]!.properties.reason).toBe('http_404');
    expect(events[0]!.properties.http_status).toBe(404);
  });

  it('is a no-op (no throw) when track is not supplied', async () => {
    const grant = await grantFor('inst-1', NOW + TTL);
    await expect(handleForgeServe(req(`/v/inst-1/g/${grant}/`), deps)).resolves.toBeDefined();
  });
});
