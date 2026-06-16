// Reusable contract every HostingProvider implementation must satisfy. The fake runs it now (Stage 1);
// CloudflareWfPProvider runs it against a Miniflare/integration harness in Stage 2.
import { describe, it, expect } from 'vitest';
import type { HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext } from './HostingProvider';

const enc = new TextEncoder();

/** Build a tiny multi-file bundle for tests. */
export function bundleOf(entrypoint: string, files: Record<string, string>): ValidatedBundle {
  const list = Object.entries(files).map(([path, body]) => ({
    path,
    bytes: enc.encode(body),
    contentType: path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html',
  }));
  const totalBytes = list.reduce((n, f) => n + f.bytes.byteLength, 0);
  return { files: list, entrypoint, contentHash: `sha256-${totalBytes}`, totalBytes };
}

export function runHostingProviderContract(label: string, make: () => HostingProvider): void {
  const handle: InstanceHandle = { id: 'inst-1', providerRef: 'ms-inst-1' };
  const auth: ServeAuthContext = { cloudId: 'c1', contentId: 'page-1', accountId: 'acct-1', grantedAt: 1_700_000_000_000 };

  describe(`HostingProvider contract — ${label}`, () => {
    it('creates an instance and serves its entrypoint', async () => {
      const p = make();
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': '<h1>hi</h1>', 'app.js': 'console.log(1)' }));
      const res = await p.serve(handle, 'index.html', auth);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('hi');
    });

    it('serves a relative sub-resource with the right content-type', async () => {
      const p = make();
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': 'x', 'app.js': 'console.log(1)' }));
      const res = await p.serve(handle, 'app.js', auth);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('javascript');
    });

    it('updateBundle replaces the served content', async () => {
      const p = make();
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': 'v1' }));
      await p.updateBundle(handle, bundleOf('index.html', { 'index.html': 'v2' }));
      expect(await (await p.serve(handle, 'index.html', auth)).text()).toBe('v2');
    });

    it('deleteInstance is idempotent and stops serving', async () => {
      const p = make();
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': 'x' }));
      await p.deleteInstance(handle);
      await p.deleteInstance(handle); // second delete must not throw
      expect((await p.serve(handle, 'index.html', auth)).status).toBe(404);
    });

    it('createInstance is idempotent on handle id (no duplicate, last write wins)', async () => {
      const p = make();
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': 'a' }));
      await p.createInstance(handle, bundleOf('index.html', { 'index.html': 'b' }));
      expect(await (await p.serve(handle, 'index.html', auth)).text()).toBe('b');
    });
  });
}
