import { describe, it, expect } from 'vitest';
import { DispatchBindingWfpClient } from './DispatchBindingWfpClient';
import type { DispatchNamespaceBinding } from './DispatchBindingWfpClient';
import { CloudflareWfPProvider } from './CloudflareWfPProvider';
import { bundleOf } from './providerContract';

const enc = new TextEncoder();

/** A fake dispatch namespace backed by a Map<workerName, Map<path, {bytes, ct}>>. get(name).fetch(req) serves
 *  by the request pathname, mirroring the real per-instance Worker (buildInstanceWorkerSource). */
function fakeNamespace(): DispatchNamespaceBinding & {
  put(name: string, files: Record<string, { body: string; ct: string }>): void;
} {
  const workers = new Map<string, Map<string, { body: string; ct: string }>>();
  return {
    put(name, files) {
      const m = new Map<string, { body: string; ct: string }>();
      for (const [p, v] of Object.entries(files)) m.set(p, v);
      workers.set(name, m);
    },
    get(name: string) {
      return {
        async fetch(request: Request): Promise<Response> {
          const files = workers.get(name);
          let p = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '');
          if (p === '') p = 'index.html';
          const f = files?.get(p);
          if (!f) return new Response('not found', { status: 404 });
          return new Response(enc.encode(f.body), { status: 200, headers: { 'content-type': f.ct } });
        },
      };
    },
  };
}

describe('DispatchBindingWfpClient', () => {
  it('routes a file request to the per-instance Worker via the binding (rewriting the path)', async () => {
    const ns = fakeNamespace();
    ns.put('ms-inst-1', { 'assets/app.js': { body: 'console.log(1)', ct: 'text/javascript' } });
    const client = new DispatchBindingWfpClient(ns);
    const res = await client.dispatchFetch('ms-inst-1', 'assets/app.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(await res.text()).toContain('console.log');
  });

  it('surfaces the per-instance Worker 404 for a missing file', async () => {
    const ns = fakeNamespace();
    ns.put('ms-inst-1', { 'index.html': { body: 'x', ct: 'text/html' } });
    const client = new DispatchBindingWfpClient(ns);
    expect((await client.dispatchFetch('ms-inst-1', 'nope.js')).status).toBe(404);
  });

  it('refuses provisioning — that is the control plane (CloudflareWfpClient)', async () => {
    const client = new DispatchBindingWfpClient(fakeNamespace());
    await expect(client.uploadWorker('ms-x', bundleOf('index.html', { 'index.html': 'x' }))).rejects.toThrow(/control plane/);
    await expect(client.deleteWorker('ms-x')).rejects.toThrow(/control plane/);
  });
});

// The serving half must satisfy the read-path of the HostingProvider contract. createInstance pre-loads the
// fake namespace (provisioning is the control plane), then serve() must route correctly through the binding.
describe('CloudflareWfPProvider + DispatchBindingWfpClient (serve path)', () => {
  it('serves entrypoint and sub-resource through the binding', async () => {
    const ns = fakeNamespace();
    const provider = new CloudflareWfPProvider(new DispatchBindingWfpClient(ns));
    // provider.createInstance would throw (binding client can't provision); pre-load the namespace directly.
    ns.put('ms-inst-1', {
      'index.html': { body: '<h1>hi</h1>', ct: 'text/html' },
      'app.js': { body: 'console.log(1)', ct: 'text/javascript' },
    });
    const handle = { id: 'inst-1', providerRef: 'ms-inst-1' };
    const auth = { cloudId: 'c', contentId: 'p', accountId: 'a', grantedAt: 0 };
    expect(await (await provider.serve(handle, 'index.html', auth)).text()).toContain('hi');
    expect((await provider.serve(handle, 'app.js', auth)).headers.get('content-type')).toContain('javascript');
  });
});
