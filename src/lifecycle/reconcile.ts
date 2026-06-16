// Orphan-GC reconciliation decision logic (DESIGN §5.1 I1, §5.5).
//
// A stored bundle is retained IFF a reachability probe confirms its owning contentId still exists and still
// references that bundle. The reconcile state machine is a PURE function over (probe, missingPasses, grace):
//
//   - present  → reset the counter and retain (the owner is reachable; I1).
//   - absent   → increment the counter; once it reaches grace consecutive passes, delete once. Below grace,
//                retain (eventually-consistent: a bundle survives up to GRACE × interval).
//   - error    → the owner can be confirmed NEITHER present NOR absent (Confluence/API outage). Leave the
//                counter UNCHANGED and retain — fail-safe-retain. We never decrement and never delete on
//                error, so a transient outage can never look like a delete (I1's primary threat (b)).
//
// planReconcileBatch applies the decision across rows and ENFORCES the I1d blast-radius cap: a single pass
// never emits more than maxDeletesPerPass deletes. Excess deletions are downgraded to retain (with the
// counter at/over grace preserved) so the NEXT pass picks them up — a leaked x-cron-secret cannot drive
// mass deletion in one pass.

export type Probe = 'present' | 'absent' | 'error';

export interface ReconcileDecision {
  action: 'retain' | 'delete';
  missingPasses: number;
}

/**
 * Pure reconcile state transition for one bundle.
 * @param probe          reachability result for the owning contentId this pass
 * @param missingPasses  consecutive-absent counter carried from the prior pass
 * @param grace          GRACE_PERIOD — consecutive absent passes required before deletion
 */
export function reconcileDecision(probe: Probe, missingPasses: number, grace: number): ReconcileDecision {
  switch (probe) {
    case 'present':
      // Owner reachable → reset the counter, keep the bundle (I1).
      return { action: 'retain', missingPasses: 0 };
    case 'absent': {
      const next = missingPasses + 1;
      // Delete only once the counter reaches the grace threshold.
      if (next >= grace) {
        return { action: 'delete', missingPasses: next };
      }
      return { action: 'retain', missingPasses: next };
    }
    case 'error':
      // Cannot confirm present OR absent → fail-safe-retain, counter untouched (no decrement, no delete).
      return { action: 'retain', missingPasses };
  }
}

export interface ReconcileRow {
  /** Stable identifier echoed back on the plan entry so the caller can act on it. */
  id: string;
  /** Consecutive-absent counter carried from the prior pass. */
  missingPasses: number;
}

export interface ReconcilePlanEntry {
  id: string;
  action: 'retain' | 'delete';
  /** Updated counter to persist for this row. */
  missingPasses: number;
}

/**
 * Apply reconcileDecision across a batch of rows and enforce the I1d blast-radius cap.
 *
 * @param rows               rows to reconcile (carry the prior missingPasses counter)
 * @param probeResults       probe outcome per row id; a row with no entry is treated as 'error' (fail-safe)
 * @param grace              GRACE_PERIOD threshold passed through to reconcileDecision
 * @param maxDeletesPerPass  I1d cap — at most this many deletes returned per pass; excess → retain (next pass)
 *
 * Counters are still advanced for capped rows (their missingPasses stays at/over grace), so a subsequent
 * pass re-evaluates them and deletes within the cap. Order is preserved; the first maxDeletesPerPass
 * delete-eligible rows (in input order) are the ones deleted this pass.
 */
export function planReconcileBatch(
  rows: readonly ReconcileRow[],
  probeResults: Readonly<Record<string, Probe>>,
  grace: number,
  maxDeletesPerPass: number,
): ReconcilePlanEntry[] {
  let deletesEmitted = 0;
  return rows.map((row) => {
    // A missing probe result means we could not confirm the owner this pass → treat as error (fail-safe-retain).
    const probe: Probe = probeResults[row.id] ?? 'error';
    const decision = reconcileDecision(probe, row.missingPasses, grace);

    if (decision.action === 'delete') {
      if (deletesEmitted < maxDeletesPerPass) {
        deletesEmitted += 1;
        return { id: row.id, action: 'delete', missingPasses: decision.missingPasses };
      }
      // Blast-radius cap hit (I1d): downgrade to retain but keep the at-threshold counter for the next pass.
      return { id: row.id, action: 'retain', missingPasses: decision.missingPasses };
    }
    return { id: row.id, action: decision.action, missingPasses: decision.missingPasses };
  });
}
