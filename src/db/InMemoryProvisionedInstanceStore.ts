// In-memory ProvisionedInstanceStore — the unit-test double for the uninstall-GC logic. Mirrors the D1 store's
// semantics (recordActive clears the tombstone; markUninstalled stamps only NULL rows; listDeletable filters by
// cutoff, oldest first, capped). No SQL, no Miniflare.
import type { ProvisionedInstanceStore, ProvisionedInstanceRow } from './ProvisionedInstanceStore';

export class InMemoryProvisionedInstanceStore implements ProvisionedInstanceStore {
  private readonly rows = new Map<string, ProvisionedInstanceRow>();

  async recordActive(instanceId: string, cloudId: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.rows.get(instanceId);
    if (existing) {
      existing.cloudId = cloudId;
      existing.updatedAt = now;
      existing.uninstalledAt = null; // re-activate: clear any tombstone
    } else {
      this.rows.set(instanceId, { instanceId, cloudId, createdAt: now, updatedAt: now, uninstalledAt: null });
    }
  }

  async markUninstalledByCloudId(cloudId: string, atIso: string): Promise<number> {
    let changed = 0;
    for (const row of this.rows.values()) {
      if (row.cloudId === cloudId && row.uninstalledAt == null) {
        row.uninstalledAt = atIso;
        row.updatedAt = atIso;
        changed++;
      }
    }
    return changed;
  }

  async listDeletable(cutoffIso: string, limit: number): Promise<ProvisionedInstanceRow[]> {
    return [...this.rows.values()]
      .filter((r) => r.uninstalledAt != null && r.uninstalledAt <= cutoffIso)
      .sort((a, b) => (a.uninstalledAt! < b.uninstalledAt! ? -1 : a.uninstalledAt! > b.uninstalledAt! ? 1 : 0))
      .slice(0, limit)
      .map((r) => ({ ...r })); // defensive copy so callers can't mutate the store
  }

  async delete(instanceId: string): Promise<void> {
    this.rows.delete(instanceId); // idempotent
  }
}
