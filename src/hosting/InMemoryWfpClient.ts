// InMemoryWfpClient — a fake WfpClient backed by a Map<workerName, files>. It lets CloudflareWfPProvider
// run the full HostingProvider contract with no Cloudflare account: uploadWorker stores the bundle's files
// indexed by normalized relative path, deleteWorker drops the entry (idempotent), and dispatchFetch returns
// the file bytes or a 404 Response. This mirrors what the real WfP dispatch namespace + Static Assets do
// (DESIGN §1.1), so the provider's behavior is exercised identically under the fake and (Stage 2) the live
// client.

import type { WfpClient } from './WfpClient';
import type { ValidatedBundle, BundleFile } from './HostingProvider';

const norm = (p: string): string => p.replace(/^\/+/, '');

function index(bundle: ValidatedBundle): Map<string, BundleFile> {
  const m = new Map<string, BundleFile>();
  for (const f of bundle.files) m.set(norm(f.path), f);
  return m;
}

export class InMemoryWfpClient implements WfpClient {
  private workers = new Map<string, Map<string, BundleFile>>();

  async uploadWorker(workerName: string, bundle: ValidatedBundle): Promise<void> {
    this.workers.set(workerName, index(bundle)); // last write wins
  }

  async deleteWorker(workerName: string): Promise<void> {
    this.workers.delete(workerName); // idempotent: no-op if absent
  }

  async dispatchFetch(workerName: string, filePath: string): Promise<Response> {
    const files = this.workers.get(workerName);
    const file = files?.get(norm(filePath));
    if (!file) return new Response('not found', { status: 404 });
    return new Response(file.bytes, { status: 200, headers: { 'content-type': file.contentType } });
  }
}
