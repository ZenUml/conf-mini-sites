// WfpClient — the ONLY Cloudflare-facing surface CloudflareWfPProvider touches. It models exactly the two
// WfP operations the provider needs (DESIGN.md §1.1, §6.1): the script-upload/delete API (manage a user
// Worker per macro instance) and dispatch-fetch (env.MINISITES.get(workerName).fetch()). Keeping this seam
// tiny is what lets CloudflareWfPProvider pass the full HostingProvider contract under a fake — no cloud,
// no HTTP, no Miniflare needed at Stage 1. The live HTTP/dispatch implementation lands in Stage 2
// (CloudflareWfpClient.ts) once the cloud account exists.
//
// A "bundle" here is the same ValidatedBundle the provider receives — the client is responsible only for
// persisting its bytes under the worker name and serving them back by relative path. It NEVER inspects
// auth or makes a permission decision: that lives ABOVE the provider seam (DESIGN §2, INV-GW: gateway owns
// authorization; the provider/client only refuse paths that arrive without it).

import type { ValidatedBundle } from './HostingProvider';

/**
 * The minimal cloud surface. `workerName` is always the provider-internal `ms-<instanceId>` and is never
 * client-visible (DESIGN §6.1: InstanceHandle.providerRef is opaque above the seam).
 */
export interface WfpClient {
  /** Upload (create or replace) the user Worker `workerName` serving `bundle`. Last write wins. */
  uploadWorker(workerName: string, bundle: ValidatedBundle): Promise<void>;

  /** Delete the user Worker `workerName`. MUST be idempotent: deleting an absent worker succeeds
   *  (orphan reconciliation calls this blindly — DESIGN §6.1 deleteInstance). */
  deleteWorker(workerName: string): Promise<void>;

  /** Fetch one file of `workerName`'s bundle by relative path — models
   *  `env.MINISITES.get(workerName).fetch(req)`. Returns the file bytes (200) or a 404 Response if the
   *  worker or file is absent. Never throws for a missing file. */
  dispatchFetch(workerName: string, filePath: string): Promise<Response>;
}
