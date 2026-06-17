// Uninstall-driven garbage collection: a site's mini-site bundles are deleted a fixed retention window AFTER
// the Forge app is uninstalled — NOT retained indefinitely (the Marketplace "stores data after uninstall"
// answer is "Yes, 30 days"). The Forge preUninstall trigger stamps uninstalledAt on every ProvisionedInstance
// of the site (via the control Worker's /uninstall); this sweep, run from the control Worker's scheduled()
// handler on a daily cron, deletes ms-<instanceId> + the row once uninstalledAt <= now - RETENTION_MS.
//
// Reinstall is safe: /publish and /serve-url call recordActive, which clears the tombstone, so a site that is
// reinstalled (and viewed or republished) within the window is never collected.
//
// Kept as a pure-ish unit (store + injected deleteWorker + injected clock) — like reconcile.ts — so the whole
// policy is testable without D1 or Miniflare.

import type { ProvisionedInstanceStore } from '../db/ProvisionedInstanceStore';

/** Retention after uninstall before a bundle is deleted. 30 days — matches the Marketplace listing's declared
 *  post-uninstall data-storage period. */
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Blast-radius cap: at most this many deletes per sweep, so a bug or misfire can't mass-delete in one pass —
 *  the next scheduled pass picks up the remainder (same safety stance as reconcile.ts's maxDeletesPerPass). */
export const MAX_DELETES_PER_SWEEP = 100;

export interface UninstallSweepResult {
  /** instanceIds whose Worker + row were deleted this pass. */
  deleted: string[];
  /** instanceIds that were due but whose Worker delete threw — left for the next pass (row NOT removed). */
  failed: string[];
}

export interface RunUninstallSweepArgs {
  store: ProvisionedInstanceStore;
  /** Tear down the per-instance Worker. MUST be idempotent (deleting an absent Worker succeeds). */
  deleteWorker: (workerName: string) => Promise<void>;
  /** Current time (ms). Injected so the sweep is deterministic under test. */
  nowMs: number;
  retentionMs?: number;
  maxDeletes?: number;
}

/**
 * Delete every instance uninstalled at least `retentionMs` ago, capped at `maxDeletes`. Per item: delete the
 * Worker FIRST, then the row — if the Worker delete throws, the row is KEPT so the next sweep retries (we never
 * drop a row whose bytes might still exist). Returns what was deleted vs. deferred.
 */
export async function runUninstallSweep(args: RunUninstallSweepArgs): Promise<UninstallSweepResult> {
  const retentionMs = args.retentionMs ?? RETENTION_MS;
  const maxDeletes = args.maxDeletes ?? MAX_DELETES_PER_SWEEP;
  const cutoffIso = new Date(args.nowMs - retentionMs).toISOString();

  const due = await args.store.listDeletable(cutoffIso, maxDeletes);
  const result: UninstallSweepResult = { deleted: [], failed: [] };

  for (const row of due) {
    try {
      await args.deleteWorker(`ms-${row.instanceId}`);
    } catch {
      result.failed.push(row.instanceId); // leave the row; retry next pass
      continue;
    }
    await args.store.delete(row.instanceId);
    result.deleted.push(row.instanceId);
  }
  return result;
}
