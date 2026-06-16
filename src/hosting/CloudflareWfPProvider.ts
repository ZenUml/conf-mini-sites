// CloudflareWfPProvider — the real substrate (DESIGN.md §1.1, §6.1). Implements HostingProvider against
// Workers for Platforms: each macro instance is a user Worker `ms-<instanceId>` in a dispatch namespace,
// serving its bundle via Workers Static Assets; the dispatch Worker (auth gateway, §2) is the only way to
// reach it.
//
// The provider is thin by design: it owns the worker-naming convention and the idempotency contract, and
// delegates the ONE cloud surface to an injected WfpClient (script-upload/delete + dispatch-fetch). That
// seam is what lets the provider pass the full HostingProvider contract under InMemoryWfpClient — no cloud
// account needed at Stage 1. The live HTTP/dispatch WfpClient (CloudflareWfpClient) lands in Stage 2.
//
// Authorization is asserted ABOVE this seam (DESIGN §2, INV-GW): the gateway verifies the Connect JWT and
// calls Confluence permission/check, then hands serve() a ServeAuthContext. The provider trusts that
// context and never makes its own permission decision; the WfpClient never sees auth at all.

import type {
  HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext, HostingCapabilities,
} from './HostingProvider';
import type { WfpClient } from './WfpClient';

/** The user-Worker name for an instance. `ms-<instanceId>` — provider-internal, never client-visible
 *  (DESIGN §6.1: InstanceHandle.providerRef is opaque above the seam). */
const workerNameFor = (handle: InstanceHandle): string => `ms-${handle.id}`;

export class CloudflareWfPProvider implements HostingProvider {
  readonly permissionModel = 'app-enforced' as const;
  readonly capabilities: HostingCapabilities = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 2000, supportsServerSideServe: true };

  constructor(private readonly wfp: WfpClient) {}

  async createInstance(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    await this.wfp.uploadWorker(workerNameFor(handle), bundle); // idempotent on id: upload is last-write-wins
  }

  async updateBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void> {
    await this.wfp.uploadWorker(workerNameFor(handle), bundle); // atomic from a viewer's POV (single replace)
  }

  async deleteInstance(handle: InstanceHandle): Promise<void> {
    await this.wfp.deleteWorker(workerNameFor(handle)); // idempotent: orphan reconciliation calls this blindly
  }

  async serve(handle: InstanceHandle, filePath: string, _auth: ServeAuthContext): Promise<Response> {
    // _auth presence is the contract above the seam (DESIGN §2). The provider trusts it and dispatches;
    // it makes no permission decision of its own. dispatchFetch returns 404 when the worker/file is absent.
    return this.wfp.dispatchFetch(workerNameFor(handle), filePath);
  }
}
