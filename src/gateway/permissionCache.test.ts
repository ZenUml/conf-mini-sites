// Tests for the fail-closed PermissionGate (DESIGN §2.6, I3 / INV-GW-08/11). Single implementation, so a plain
// .test.ts (no shared contract). Fixed clock + injected checker/breaker keep every case deterministic.
import { describe, it, expect, vi } from 'vitest';
import { PermissionGate } from './permissionCache';
import type { PermissionContext, PermissionChecker, CircuitBreaker } from './permissionCache';

const ctx: PermissionContext = {
  clientKey: 'ck-A',
  cloudId: 'cloud-A',
  accountId: 'acct-1', // verified sub
  contentId: 'page-1',
};

/** A checker whose verdict and call count the test controls. */
function checkerOf(impl: (c: PermissionContext) => Promise<boolean>): PermissionChecker {
  return { check: vi.fn(impl) };
}

/** A mutable fake clock in epoch ms. */
function clockAt(start: number): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('PermissionGate — fail-closed positive cache (I3 / INV-GW-08/11)', () => {
  it('allow + fresh → serve; a 2nd call within TTL makes 0 extra checker calls', async () => {
    const clock = clockAt(1_000_000);
    const checker = checkerOf(async () => true);
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000 });

    expect(await gate.allowServe(ctx)).toBe(true);
    clock.advance(59_000); // still inside the 60s TTL
    expect(await gate.allowServe(ctx)).toBe(true);

    expect(checker.check).toHaveBeenCalledTimes(1); // 2nd serve hit the cache
  });

  it('allow + expired → re-check (cache entry past TTL triggers a fresh live check)', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => true);
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000 });

    expect(await gate.allowServe(ctx)).toBe(true);
    clock.advance(60_001); // just past TTL
    expect(await gate.allowServe(ctx)).toBe(true);

    expect(checker.check).toHaveBeenCalledTimes(2); // expiry forced a re-check
  });

  it('checker THROWS → DENY, even when a cached allow exists (the key assertion, INV-GW-11)', async () => {
    const clock = clockAt(0);
    // First call allows (populates cache); after the TTL the live check throws (Confluence outage).
    let calls = 0;
    const checker = checkerOf(async () => {
      calls += 1;
      if (calls === 1) return true;
      throw new Error('confluence outage');
    });
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000 });

    expect(await gate.allowServe(ctx)).toBe(true); // cached allow now exists
    clock.advance(60_001); // expire it so the next call re-checks and the checker throws
    expect(await gate.allowServe(ctx)).toBe(false); // outage ⇒ DENY, never served from the stale allow
  });

  it('explicit deny (checker → false) → DENY, and a deny is never cached', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => false);
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000 });

    expect(await gate.allowServe(ctx)).toBe(false);
    expect(await gate.allowServe(ctx)).toBe(false);
    expect(checker.check).toHaveBeenCalledTimes(2); // each call re-checks (no negative caching)
  });

  it('breaker tripped → DENY by default, without ever calling the checker', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => true);
    const breaker: CircuitBreaker = { isTripped: () => true };
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000, breaker });

    expect(await gate.allowServe(ctx)).toBe(false);
    expect(checker.check).not.toHaveBeenCalled(); // breaker short-circuits before the live check
  });

  it('breaker error → DENY (a breaker bug must fail closed, never open access)', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => true);
    const breaker: CircuitBreaker = { isTripped: () => { throw new Error('breaker bug'); } };
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000, breaker });

    expect(await gate.allowServe(ctx)).toBe(false);
    expect(checker.check).not.toHaveBeenCalled();
  });

  it('cache key isolates VERIFIED ids: a different accountId is a distinct decision', async () => {
    const clock = clockAt(0);
    // Allow acct-1, deny everyone else — proves the key includes accountId (no cross-account reuse).
    const checker = checkerOf(async (c) => c.accountId === 'acct-1');
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 60_000 });

    expect(await gate.allowServe(ctx)).toBe(true);
    expect(await gate.allowServe({ ...ctx, accountId: 'acct-2' })).toBe(false);
  });

  it('TTL clamped: ttlMs above 60s never extends the trust window past the 60s ceiling', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => true);
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 10 * 60_000 }); // ask for 10 min

    expect(await gate.allowServe(ctx)).toBe(true);
    clock.advance(60_001); // just past the clamped 60s ceiling
    expect(await gate.allowServe(ctx)).toBe(true);
    expect(checker.check).toHaveBeenCalledTimes(2); // re-checked ⇒ the cap held
  });

  it('ttlMs=0 disables the positive cache: every serve re-checks live', async () => {
    const clock = clockAt(0);
    const checker = checkerOf(async () => true);
    const gate = new PermissionGate({ checker, now: clock.now, ttlMs: 0 });

    expect(await gate.allowServe(ctx)).toBe(true);
    expect(await gate.allowServe(ctx)).toBe(true);
    expect(checker.check).toHaveBeenCalledTimes(2);
  });
});
