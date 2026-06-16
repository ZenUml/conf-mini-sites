// Unit table over the orphan-GC reconcile state machine (DESIGN §5.1 I1) + the I1d blast-radius cap (§5.5).
import { describe, it, expect } from 'vitest';
import { reconcileDecision, planReconcileBatch } from './reconcile';
import type { Probe, ReconcileRow, ReconcilePlanEntry, ReconcileDecision } from './reconcile';

const GRACE = 3;

describe('reconcileDecision — single-row state machine (I1)', () => {
  // [probe, missingPassesIn, grace, expectedAction, expectedMissingPassesOut, label]
  const cases: Array<[Probe, number, number, ReconcileDecision['action'], number, string]> = [
    // present → retain, counter reset to 0 (regardless of prior count)
    ['present', 0, GRACE, 'retain', 0, 'present from 0 → retain/0'],
    ['present', 2, GRACE, 'retain', 0, 'present resets a partial counter → retain/0'],
    // absent below grace → retain, counter incremented (absent×(GRACE-1) → retained)
    ['absent', 0, GRACE, 'retain', 1, 'first absent → retain/1'],
    ['absent', 1, GRACE, 'retain', 2, 'absent at GRACE-1 → retain/2'],
    // absent reaching grace → delete once
    ['absent', 2, GRACE, 'delete', 3, 'absent×GRACE → delete once/3'],
    // error → fail-safe-retain, counter UNCHANGED (never decrement, never delete)
    ['error', 0, GRACE, 'retain', 0, 'error at 0 → retain/0 unchanged'],
    ['error', 2, GRACE, 'retain', 2, 'error mid-grace → retain/2 unchanged'],
    ['error', 5, GRACE, 'retain', 5, 'error past grace → retain/5 (no delete on error)'],
  ];

  for (const [probe, missingIn, grace, action, missingOut, label] of cases) {
    it(label, () => {
      expect(reconcileDecision(probe, missingIn, grace)).toEqual({ action, missingPasses: missingOut });
    });
  }

  it('absent×grace consecutive passes deletes exactly once (walk the counter to threshold)', () => {
    let missing = 0;
    const trail: ReconcileDecision['action'][] = [];
    for (let pass = 0; pass < GRACE; pass++) {
      const d = reconcileDecision('absent', missing, GRACE);
      trail.push(d.action);
      missing = d.missingPasses;
    }
    // GRACE-1 retains, then a single delete on the GRACE-th pass.
    expect(trail).toEqual(['retain', 'retain', 'delete']);
  });

  it('grace of 1 deletes on the first absent pass', () => {
    expect(reconcileDecision('absent', 0, 1)).toEqual({ action: 'delete', missingPasses: 1 });
  });
});

describe('planReconcileBatch — blast-radius cap (I1d)', () => {
  // All rows are at GRACE-1 so a single absent pass makes every one delete-eligible.
  const rowsAtThreshold = (n: number): ReconcileRow[] =>
    Array.from({ length: n }, (_, i) => ({ id: `r${i}`, missingPasses: GRACE - 1 }));

  const allAbsent = (n: number): Record<string, Probe> =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [`r${i}`, 'absent' as Probe]));

  const deletes = (plan: ReconcilePlanEntry[]) => plan.filter((e) => e.action === 'delete');

  it('never returns more than maxDeletesPerPass deletes (5 eligible, cap 2 → 2 deletes)', () => {
    const plan = planReconcileBatch(rowsAtThreshold(5), allAbsent(5), GRACE, 2);
    expect(deletes(plan)).toHaveLength(2);
  });

  it('caps to the first rows in input order; excess is downgraded to retain', () => {
    const plan = planReconcileBatch(rowsAtThreshold(5), allAbsent(5), GRACE, 2);
    expect(plan.map((e) => `${e.id}:${e.action}`)).toEqual([
      'r0:delete',
      'r1:delete',
      'r2:retain',
      'r3:retain',
      'r4:retain',
    ]);
  });

  it('capped (downgraded) rows keep the at-threshold counter so the next pass picks them up', () => {
    const plan = planReconcileBatch(rowsAtThreshold(5), allAbsent(5), GRACE, 2);
    // r2..r4 were downgraded to retain but their counter is at GRACE, ready to delete next pass.
    for (const id of ['r2', 'r3', 'r4']) {
      expect(plan.find((e) => e.id === id)?.missingPasses).toBe(GRACE);
    }
  });

  it('a follow-up pass deletes the previously-capped rows within the cap', () => {
    const first = planReconcileBatch(rowsAtThreshold(5), allAbsent(5), GRACE, 2);
    // Carry forward the retained rows (the deleted ones are gone from the store).
    const survivors: ReconcileRow[] = first
      .filter((e) => e.action === 'retain')
      .map((e) => ({ id: e.id, missingPasses: e.missingPasses }));
    const second = planReconcileBatch(survivors, allAbsent(5), GRACE, 2);
    expect(second.map((e) => `${e.id}:${e.action}`)).toEqual(['r2:delete', 'r3:delete', 'r4:retain']);
  });

  it('a missing probe result is treated as error → fail-safe-retain, counter unchanged', () => {
    const rows: ReconcileRow[] = [{ id: 'r0', missingPasses: GRACE - 1 }];
    const plan = planReconcileBatch(rows, {}, GRACE, 10);
    expect(plan).toEqual([{ id: 'r0', action: 'retain', missingPasses: GRACE - 1 }]);
  });

  it('mixed batch: present resets, error holds, absent advances — only eligible & uncapped delete', () => {
    const rows: ReconcileRow[] = [
      { id: 'present-row', missingPasses: 2 },
      { id: 'error-row', missingPasses: 2 },
      { id: 'absent-eligible', missingPasses: GRACE - 1 },
      { id: 'absent-young', missingPasses: 0 },
    ];
    const probes: Record<string, Probe> = {
      'present-row': 'present',
      'error-row': 'error',
      'absent-eligible': 'absent',
      'absent-young': 'absent',
    };
    const plan = planReconcileBatch(rows, probes, GRACE, 10);
    expect(plan).toEqual([
      { id: 'present-row', action: 'retain', missingPasses: 0 },
      { id: 'error-row', action: 'retain', missingPasses: 2 },
      { id: 'absent-eligible', action: 'delete', missingPasses: GRACE },
      { id: 'absent-young', action: 'retain', missingPasses: 1 },
    ]);
  });

  it('maxDeletesPerPass of 0 disables all deletion this pass (hard freeze)', () => {
    const plan = planReconcileBatch(rowsAtThreshold(3), allAbsent(3), GRACE, 0);
    expect(deletes(plan)).toHaveLength(0);
    expect(plan.every((e) => e.action === 'retain' && e.missingPasses === GRACE)).toBe(true);
  });
});
