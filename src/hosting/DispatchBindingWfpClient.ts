// DispatchBindingWfpClient — the LIVE, serving-side WfpClient (DESIGN §1.1, §2). It reaches a per-instance
// user Worker through the dispatch-namespace BINDING: env.MINISITES.get(workerName).fetch(req). This is the
// half CloudflareWfPProvider uses on the DISPATCH Worker (serving an already-grant-verified viewer).
//
// Provisioning is the OTHER half (CloudflareWfpClient, REST). uploadWorker/deleteWorker throw here: the
// dispatch Worker has no control-plane credentials and must never mutate scripts. The per-instance Worker is
// non-routable (no public URL) — this binding is the ONLY way to reach it (the WfP isolation guarantee).

import type { WfpClient } from './WfpClient';
import type { ValidatedBundle } from './HostingProvider';

/** The subset of the Workers-for-Platforms dispatch-namespace binding we use. Declared locally to avoid a
 *  hard dependency on @cloudflare/workers-types in this seam (the dispatch Worker supplies the real binding). */
export interface DispatchNamespaceBinding {
  get(workerName: string): { fetch(request: Request): Promise<Response> };
}

export class DispatchBindingWfpClient implements WfpClient {
  constructor(private readonly ns: DispatchNamespaceBinding) {}

  async uploadWorker(_workerName: string, _bundle: ValidatedBundle): Promise<void> {
    throw new Error('DispatchBindingWfpClient.uploadWorker: provisioning is the control plane (CloudflareWfpClient)');
  }

  async deleteWorker(_workerName: string): Promise<void> {
    throw new Error('DispatchBindingWfpClient.deleteWorker: provisioning is the control plane (CloudflareWfpClient)');
  }

  /** Route one file request to the per-instance Worker via the binding. The user Worker serves bytes by the
   *  request's pathname (buildInstanceWorkerSource), so we rewrite the path to the bundle-relative file. A
   *  missing worker/file surfaces as the user Worker's own 404. */
  async dispatchFetch(workerName: string, filePath: string): Promise<Response> {
    const stub = this.ns.get(workerName);
    const rewritten = new Request(`https://instance/${encodeURI(filePath.replace(/^\/+/, ''))}`, { method: 'GET' });
    return stub.fetch(rewritten);
  }
}
