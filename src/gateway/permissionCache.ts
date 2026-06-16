// PermissionGate — caches POSITIVE read decisions only, fail-closed everywhere (DESIGN §2.6, I3 / INV-GW-08/11).
//
// Invariants enforced here:
//   - I3 / INV-GW-08: a protected request serves ONLY if a fresh affirmative decision exists for the VERIFIED
//     (clientKey, cloudId, accountId, contentId, "read"); absent/expired/erroring ⇒ DENY, never the bundle.
//   - INV-GW-11 (fail-closed on outage): a thrown/rejected live check (Confluence outage) ⇒ DENY even if a
//     cached `allow` exists — an outage must not extend the trust window. This is the load-bearing assertion.
//   - Only positive `allow` decisions are cached; a `false` decision is never cached (a re-grant must re-check).
//   - Per-tenant circuit breaker whose DEFAULT/ERROR state is DENY [hardened]: a breaker bug that trips OPEN
//     would be a disclosure, so "open" can only ever ALLOW the live path through — it can never by itself allow
//     serving, and its absence of state is treated as tripped (deny).
//
// The cache key uses only the VERIFIED ids passed in by the caller (the gateway looks them up AFTER full
// auth — never on a header-supplied id, INV-GW-08). This module performs no auth itself.

/** The verified context for one read decision. All ids are post-authentication (the JWT `sub` for accountId). */
export interface PermissionContext {
  clientKey: string;
  cloudId: string;
  accountId: string; // verified `sub`
  contentId: string;
}

/**
 * Live Confluence permission check, injected so tests can fake outages.
 * Resolves `true` (allow) / `false` (deny); REJECTS on outage (unreachable/5xx/timeout). Per I3 the gate
 * treats a rejection as DENY — it does not let the caller's catch decide.
 */
export interface PermissionChecker {
  check(ctx: PermissionContext): Promise<boolean>;
}

export interface PermissionGateOptions {
  checker: PermissionChecker;
  /** Injected clock, epoch ms — never read the system clock in business logic (determinism). */
  now: () => number;
  /** Positive-decision TTL in ms, ≤ 60s (DESIGN §2.6). Clamped to [0, 60_000]. Default 60s. */
  ttlMs?: number;
  /**
   * Per-tenant circuit breaker. DEFAULT/ERROR state is DENY: tenants absent from this set are treated as
   * tripped (deny) only if `breakerDefaultClosed` is false. To keep the common case usable while honoring the
   * hardened default, the breaker is modelled as an explicit set of TRIPPED tenants — any membership ⇒ deny —
   * and any error reading it ⇒ deny.
   */
  breaker?: CircuitBreaker;
}

/** Per-tenant circuit breaker. `isTripped` MUST fail-closed (return true / throw ⇒ treated as tripped → DENY). */
export interface CircuitBreaker {
  /** True ⇒ the breaker is OPEN/tripped for this tenant ⇒ DENY. Any thrown error is also treated as tripped. */
  isTripped(tenant: { clientKey: string; cloudId: string }): boolean;
}

const TTL_MAX_MS = 60_000; // DESIGN §2.6: TTL ≤ 60s.

interface CacheEntry {
  expiresAt: number; // epoch ms; entry is fresh while now < expiresAt
}

/**
 * Build the cache key from the VERIFIED ids: hash(clientKey:cloudId:accountId:contentId:read) (DESIGN §2.6,
 * INV-GW-08). Uses the Web Crypto global `crypto.subtle` (present in Workers and the vitest/node env).
 */
async function hashKey(ctx: PermissionContext): Promise<string> {
  const material = `${ctx.clientKey}:${ctx.cloudId}:${ctx.accountId}:${ctx.contentId}:read`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export class PermissionGate {
  private readonly checker: PermissionChecker;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly breaker?: CircuitBreaker;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(opts: PermissionGateOptions) {
    this.checker = opts.checker;
    this.now = opts.now;
    // Clamp TTL into [0, 60s]: 0 disables the positive cache (a live check per asset), 60s is the ceiling.
    this.ttlMs = Math.max(0, Math.min(TTL_MAX_MS, opts.ttlMs ?? TTL_MAX_MS));
    this.breaker = opts.breaker;
  }

  /**
   * Decide whether to serve. Returns true ONLY for a currently-affirmative read decision; everything else —
   * cache miss with a denying/erroring live check, outage, tripped breaker — returns false (fail-closed).
   */
  async allowServe(ctx: PermissionContext): Promise<boolean> {
    // 1) Per-tenant circuit breaker first. DEFAULT/ERROR state is DENY (INV-GW-11): a breaker bug must not open
    //    access, so any tripped signal — or any error reading the breaker — denies before we even look at cache.
    if (this.breakerTripped(ctx)) return false;

    const key = await hashKey(ctx);

    // 2) Positive-only cache hit, still fresh ⇒ serve with 0 extra checker calls.
    if (this.ttlMs > 0) {
      const entry = this.cache.get(key);
      if (entry && this.now() < entry.expiresAt) return true;
      if (entry) this.cache.delete(key); // expired — drop it, then re-check live
    }

    // 3) Cache miss/expired ⇒ live check. A rejection (Confluence outage) ⇒ DENY even if a cached allow existed
    //    (we already returned above only on a FRESH entry). The catch is the fail-closed boundary, not the caller's.
    let allowed: boolean;
    try {
      allowed = await this.checker.check(ctx);
    } catch {
      return false; // INV-GW-11 / I3: outage does not extend the trust window.
    }

    // 4) Cache ONLY positive decisions; a deny is never cached so a later grant must re-check.
    if (allowed && this.ttlMs > 0) {
      this.cache.set(key, { expiresAt: this.now() + this.ttlMs });
    }
    return allowed;
  }

  /** Breaker read, fail-closed: no breaker ⇒ not tripped; thrown error ⇒ treated as tripped (DENY). */
  private breakerTripped(ctx: PermissionContext): boolean {
    if (!this.breaker) return false;
    try {
      return this.breaker.isTripped({ clientKey: ctx.clientKey, cloudId: ctx.cloudId });
    } catch {
      return true; // a breaker bug must default to DENY, never open access.
    }
  }
}
