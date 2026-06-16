// uploadPipeline.publish — the shared publish orchestrator both entry points (CLI/MCP + drag-drop widget)
// funnel through (DESIGN §3.3). Ordering is load-bearing: validate → secret-scan → stage → enqueue job →
// return 202 {jobId}. A bundle that fails any step never reaches a servable instance; provisioning itself runs
// async (DESIGN §3.4) via runProvision. Authn/authz happen ABOVE this (the gateway/publish handler); this
// orchestrates the content pipeline over the already-verified PublishContext.
import { validateBundle } from './bundleValidation';
import type { RawBundleFile } from './bundleValidation';
import { scanForSecrets } from './secretScan';
import type { InstanceStore } from '../db/InstanceStore';
import type { ProvisioningJobStore } from '../provision/ProvisioningJob';

export interface PublishContext {
  readonly clientKey: string;
  readonly cloudId: string;
  readonly instanceId: string;
  readonly contentId: string;
  readonly spaceKey?: string | null;
  readonly macroLocalId: string;
  readonly idempotencyKey: string; // from the Idempotency-Key header (I10)
}

export interface PublishDeps {
  readonly instanceStore: InstanceStore;
  readonly jobStore: ProvisioningJobStore;
  /** Injected job-id generator (crypto.randomUUID in prod; a counter in tests) — no randomness in logic. */
  readonly genJobId: () => string;
}

export type PublishResult =
  | { readonly ok: true; readonly jobId: string; readonly statusUrl: string }
  | { readonly ok: false; readonly code: string; readonly status: number; readonly message: string };

export async function publish(files: RawBundleFile[], ctx: PublishContext, deps: PublishDeps): Promise<PublishResult> {
  // 1. Validate the bundle shape (multi-file, root index.html, relative paths, caps).
  const validated = await validateBundle(files);
  if (!validated.ok) {
    return { ok: false, code: validated.error.code, status: validated.error.status, message: validated.error.message };
  }
  const bundle = validated.bundle;

  // 2. Secret-leak scan — a hit is a HARD fail; nothing is staged or enqueued (I7).
  const scan = scanForSecrets(files);
  if (scan.hits.length > 0) {
    const h = scan.hits[0]!;
    return { ok: false, code: 'SECRET_DETECTED', status: 422, message: `secret detected in ${h.file}:${h.line} (${h.kind})` };
  }

  // 3. Stage the instance — registered but un-servable (status 'staging') until the job flips it active (I10).
  await deps.instanceStore.upsert({
    clientKey: ctx.clientKey, cloudId: ctx.cloudId, instanceId: ctx.instanceId,
    workerName: `ms-${ctx.instanceId}`, contentId: ctx.contentId, spaceKey: ctx.spaceKey ?? null,
    macroLocalId: ctx.macroLocalId, bundleHash: bundle.contentHash, status: 'staging',
  });

  // 4. Enqueue the provisioning job (idempotent on (cloudId, idempotencyKey, bundleHash) — I10 / §3.4).
  const version = 1; // first publish; BundleVersion bumping is a later concern.
  const { row, conflict } = await deps.jobStore.create({
    jobId: deps.genJobId(), instanceId: ctx.instanceId, clientKey: ctx.clientKey, cloudId: ctx.cloudId,
    version, bundleHash: bundle.contentHash, idempotencyKey: ctx.idempotencyKey,
  });
  if (conflict) {
    return { ok: false, code: 'IDEMPOTENCY_CONFLICT', status: 409, message: 'same Idempotency-Key, different bundle' };
  }

  // 5. 202 {jobId}: publish does not block on provisioning — the client polls statusUrl (DESIGN §3.4).
  return { ok: true, jobId: row.jobId, statusUrl: `/api/jobs/${row.jobId}` };
}
