// In-memory HostingProvider for tests and local upper-layer development (no Cloudflare needed).
import type {
  HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext, BundleFile, HostingCapabilities,
} from './HostingProvider';

const norm = (p: string): string => p.replace(/^\/+/, '');

function index(bundle: ValidatedBundle): Map<string, BundleFile> {
  const m = new Map<string, BundleFile>();
  for (const f of bundle.files) m.set(norm(f.path), f);
  return m;
}

export class FakeHostingProvider implements HostingProvider {
  readonly permissionModel = 'app-enforced' as const;
  readonly capabilities: HostingCapabilities = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 2000, supportsServerSideServe: true };

  private store = new Map<string, Map<string, BundleFile>>();

  async createInstance(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    this.store.set(handle.id, index(bundle)); // idempotent on id
  }

  async updateBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    this.store.set(handle.id, index(bundle));
  }

  async deleteInstance(handle: InstanceHandle): Promise<void> {
    this.store.delete(handle.id); // idempotent: no-op if absent
  }

  async serve(handle: InstanceHandle, filePath: string, _auth: ServeAuthContext): Promise<Response> {
    const files = this.store.get(handle.id);
    const file = files?.get(norm(filePath));
    if (!file) return new Response('not found', { status: 404 });
    return new Response(file.bytes, { status: 200, headers: { 'content-type': file.contentType } });
  }
}
