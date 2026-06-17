import { test, expect } from '@playwright/test';
import { publish, serveUrl, deleteInstance, dispatchGet, sampleFiles, freshInstanceId } from '../helpers/workers';
import { E2E } from '../helpers/env';

// Grant-gated dispatch serving. Publish a fresh instance, mint a serve URL, then prove the dispatch Worker
// (forgeGateway.ts) honors a valid grant, rejects a tampered grant (deny 401), and denies a non-grant path
// (deny 404). Dispatch responses are opaque (no JSON body), so these assert status codes only; the control
// Worker's JSON body.code is asserted on the publish/serve-url legs.
test('grant-gated dispatch: valid serve URL serves the entrypoint, tampered grant is rejected, non-grant path is not found', async () => {
  const instanceId = freshInstanceId();
  try {
    // Provision the per-instance Worker with a minimal valid bundle.
    const pub = await publish(instanceId, sampleFiles());
    expect(pub.status).toBe(200);
    expect(pub.body.ok).toBe(true);

    // Mint a short-lived signed-path grant → the dispatch serve URL (.../v/<id>/g/<grant>/).
    const su = await serveUrl(instanceId);
    expect(su.status).toBe(200);
    expect(su.body.ok).toBe(true);
    const url: string = su.body.url;
    expect(typeof url).toBe('string');

    // A valid grant serves the bundle entrypoint (index.html → 200).
    const ok = await dispatchGet(url);
    expect(ok.status).toBe(200);

    // Tamper the grant: flip the last char before the trailing slash → signature verify fails → 401.
    const tampered = tamperGrant(url);
    expect(tampered).not.toBe(url);
    const bad = await dispatchGet(tampered);
    expect(bad.status).toBe(401);

    // A non-grant path /v/<id>/ has no /g/<grant>/ segment → deny-by-default → 404.
    const noGrant = await dispatchGet(`${E2E.dispatchUrl}/v/${encodeURIComponent(instanceId)}/`);
    expect(noGrant.status).toBe(404);
  } finally {
    await deleteInstance(instanceId);
  }
});

/** Flip the last grant character before the trailing slash (corrupts the HMAC signature). */
function tamperGrant(url: string): string {
  const m = url.match(/^(.*\/g\/)([^/]+)(\/.*)$/);
  if (!m) throw new Error(`unexpected serve URL shape: ${url}`);
  const [, prefix, grant, suffix] = m;
  const last = grant.slice(-1);
  const flipped = last === 'A' ? 'B' : 'A';
  return prefix + grant.slice(0, -1) + flipped + suffix;
}
