// R2HostingProvider — the real substrate now that Workers for Platforms is NOT entitled on the account
// (DESIGN §6.1 substrate swap). Implements HostingProvider against an object store: each instance's bundle
// files live under the key prefix `${instanceId}/`, and serve() streams a file's bytes back. Those bytes are
// served through the single gateway Worker, so the gateway stays the sole entry point — server-side this is
// byte-equivalent to the WfP path; viewer-side sandbox/CSP is unchanged.
//
// The provider is thin by design: it owns the key scheme (instanceId prefix) and the idempotency contract,
// and delegates the ONE cloud surface to an injected BundleObjectStore. That seam lets it pass the full
// HostingProvider contract under InMemoryBundleObjectStore — no cloud account needed (R2BundleObjectStore is
// the live impl, exercised under Miniflare).
//
// Authorization is asserted ABOVE this seam (DESIGN §2, INV-GW): the gateway verifies the Connect JWT and
// calls Confluence permission/check, then hands serve() a ServeAuthContext. The provider trusts that context
// and never makes its own permission decision; the object store never sees auth at all.

import type {
  HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext, HostingCapabilities,
} from './HostingProvider';
import type { BundleObjectStore } from './BundleObjectStore';

const norm = (p: string): string => p.replace(/^\/+/, '');

/** Key prefix for one instance's files — `${instanceId}/`. The trailing slash makes deletePrefix exact: it
 *  can never match a sibling instance whose id shares a prefix (e.g. "inst-1" vs "inst-10"). */
const prefixFor = (handle: InstanceHandle): string => `${handle.id}/`;

/** Object key for one file of an instance — `${instanceId}/${relativePath}`. */
const keyFor = (handle: InstanceHandle, relativePath: string): string => `${prefixFor(handle)}${norm(relativePath)}`;

export class R2HostingProvider implements HostingProvider {
  readonly permissionModel = 'app-enforced' as const;
  readonly capabilities: HostingCapabilities = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 2000, supportsServerSideServe: true };

  constructor(private readonly store: BundleObjectStore) {}

  async createInstance(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    await this.writeBundle(handle, bundle); // idempotent on id: clear-then-write is last-write-wins
  }

  async updateBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    await this.writeBundle(handle, bundle); // atomic from a viewer's POV (clear the prefix, then write the new set)
  }

  async deleteInstance(handle: InstanceHandle): Promise<void> {
    await this.store.deletePrefix(prefixFor(handle)); // idempotent: orphan reconciliation calls this blindly
  }

  async serve(handle: InstanceHandle, filePath: string, _auth: ServeAuthContext): Promise<Response> {
    // _auth presence is the contract above the seam (DESIGN §2). The provider trusts it and reads the object;
    // it makes no permission decision of its own. A missing instance/file is a 404.
    const obj = await this.store.get(keyFor(handle, filePath));
    if (!obj) return new Response('not found', { status: 404 });
    return new Response(obj.bytes, { status: 200, headers: { 'content-type': obj.contentType } });
  }

  /** Replace the whole instance: drop every existing file under the prefix, then write the new bundle. */
  private async writeBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    await this.store.deletePrefix(prefixFor(handle)); // remove files the new bundle no longer contains
    for (const file of bundle.files) {
      await this.store.put(keyFor(handle, file.path), file.bytes, file.contentType);
    }
  }
}
