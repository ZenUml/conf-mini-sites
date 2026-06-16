// InstanceStore — the persistence boundary for MiniSiteInstance (migrations/0001_mini_site_instance.sql).
// Every method is keyed by the FULL composite (clientKey, cloudId, instanceId) so a lookup cannot cross
// tenants — the store-layer expression of INV-GW-06 (DESIGN §2.5). The auth gateway (Stage 3) and the
// provider (Stage 2) depend on this interface, not on D1 directly.

export type InstanceStatus =
  | 'staging' | 'provisioning' | 'active' | 'orphan_candidate' | 'quarantined' | 'deleted';

/** The composite tenant-scoped key. All reads/writes require all three parts. */
export interface InstanceKey {
  readonly clientKey: string;
  readonly cloudId: string;
  readonly instanceId: string;
}

export interface MiniSiteInstanceRow extends InstanceKey {
  workerName: string;
  contentId: string;
  spaceKey: string | null;
  macroLocalId: string;
  bundleHash: string;
  latestVersion: number;
  status: InstanceStatus;
  scanStatus: string | null;
  missingPasses: number;
  forkedFromInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  deletedAt: string | null;
}

/** Fields supplied when first registering (or idempotently re-registering) an instance. */
export interface NewInstance extends InstanceKey {
  workerName: string;
  contentId: string;
  spaceKey?: string | null;
  macroLocalId: string;
  bundleHash: string;
  status?: InstanceStatus; // defaults to 'staging'
  forkedFromInstanceId?: string | null;
}

export interface InstanceStore {
  /** Idempotent register: insert, or update the mutable fields if (clientKey,cloudId,instanceId) exists.
   *  Never creates a duplicate. Returns the resulting row. */
  upsert(input: NewInstance): Promise<MiniSiteInstanceRow>;

  /** Tenant-scoped read — requires the full composite key, so it cannot return another tenant's row. */
  get(key: InstanceKey): Promise<MiniSiteInstanceRow | null>;

  setStatus(key: InstanceKey, status: InstanceStatus): Promise<void>;

  /** Promote a freshly-provisioned bundle to live (sets bundleHash + latestVersion + status='active'). */
  setLiveBundle(key: InstanceKey, bundleHash: string, version: number): Promise<void>;

  /** Idempotent delete (no-op if absent) — orphan reconciliation calls this blindly. */
  delete(key: InstanceKey): Promise<void>;

  touchLastSeen(key: InstanceKey, atIso: string): Promise<void>;
}
