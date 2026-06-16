import { describe, it, expect } from 'vitest';
import { CloudflareWfpClient } from './CloudflareWfpClient';
import type { CloudflareWfpEnv } from './CloudflareWfpClient';
import { bundleOf } from './providerContract';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function recordingFetch(responder: (call: Call) => Response): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const call: Call = { url: String(input), method: init?.method ?? 'GET', headers, body: init?.body };
    calls.push(call);
    return responder(call);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const baseEnv = (fetchImpl: typeof fetch): CloudflareWfpEnv => ({
  accountId: 'acct123',
  namespace: 'mini-sites-dev',
  apiToken: 'secret-token',
  apiBase: 'https://api.example.test/client/v4',
  fetchImpl,
});

describe('CloudflareWfpClient.uploadWorker', () => {
  it('PUTs a multipart script to the dispatch-namespace URL with bearer auth', async () => {
    const { fetchImpl, calls } = recordingFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await client.uploadWorker('ms-inst-1', bundleOf('index.html', { 'index.html': '<h1>hi</h1>' }));

    expect(calls).toHaveLength(1);
    const c = calls[0]!;
    expect(c.method).toBe('PUT');
    expect(c.url).toBe(
      'https://api.example.test/client/v4/accounts/acct123/workers/dispatch/namespaces/mini-sites-dev/scripts/ms-inst-1',
    );
    expect(c.headers['authorization']).toBe('Bearer secret-token');
    // We must NOT hand-set content-type; fetch derives the multipart boundary from the FormData body.
    expect(c.headers['content-type']).toBeUndefined();
    expect(c.body).toBeInstanceOf(FormData);

    const form = c.body as FormData;
    const metadataBlob = form.get('metadata') as unknown as Blob;
    const metadata = JSON.parse(await metadataBlob.text());
    expect(metadata.main_module).toBe('worker.js');
    const moduleBlob = form.get('worker.js') as unknown as Blob;
    expect(await moduleBlob.text()).toContain('export default');
    expect(moduleBlob.type).toBe('application/javascript+module');
  });

  it('throws with the API status + body on a non-2xx response', async () => {
    const { fetchImpl } = recordingFetch(() => new Response('{"errors":[{"code":10121}]}', { status: 403 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await expect(client.uploadWorker('ms-x', bundleOf('index.html', { 'index.html': 'x' }))).rejects.toThrow(/403/);
  });
});

describe('CloudflareWfpClient.deleteWorker', () => {
  it('DELETEs with force=true and succeeds on 200', async () => {
    const { fetchImpl, calls } = recordingFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await client.deleteWorker('ms-inst-1');
    expect(calls[0]!.method).toBe('DELETE');
    expect(calls[0]!.url).toContain('/scripts/ms-inst-1?force=true');
  });

  it('treats 404 (already gone) as success — idempotent for orphan reconciliation', async () => {
    const { fetchImpl } = recordingFetch(() => new Response('not found', { status: 404 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await expect(client.deleteWorker('ms-gone')).resolves.toBeUndefined();
  });

  it('throws on a non-404 error', async () => {
    const { fetchImpl } = recordingFetch(() => new Response('boom', { status: 500 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await expect(client.deleteWorker('ms-x')).rejects.toThrow(/500/);
  });
});

describe('CloudflareWfpClient.dispatchFetch', () => {
  it('throws — serving routes through the dispatch-namespace binding, not the REST control client', async () => {
    const { fetchImpl } = recordingFetch(() => new Response(null, { status: 200 }));
    const client = new CloudflareWfpClient(baseEnv(fetchImpl));
    await expect(client.dispatchFetch('ms-x', 'index.html')).rejects.toThrow(/binding/);
  });
});
