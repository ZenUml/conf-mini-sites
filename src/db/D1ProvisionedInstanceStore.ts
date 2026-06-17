// D1-backed ProvisionedInstanceStore (real SQL; migrations/0004_provisioned_instance.sql). Satisfies the same
// contract as InMemoryProvisionedInstanceStore — verified under Miniflare in integration, not in unit tests here.
import type { ProvisionedInstanceStore, ProvisionedInstanceRow } from './ProvisionedInstanceStore';

export class D1ProvisionedInstanceStore implements ProvisionedInstanceStore {
  constructor(private readonly db: D1Database) {}

  async recordActive(instanceId: string, cloudId: string): Promise<void> {
    // Insert, or on re-publish/re-view clear the tombstone (uninstalledAt = NULL) so a reinstalled+active site
    // is never collected. Last write wins on cloudId (an instance id is stable per macro; cloudId won't move).
    await this.db
      .prepare(
        `INSERT INTO ProvisionedInstance (instanceId, cloudId, uninstalledAt)
         VALUES (?1, ?2, NULL)
         ON CONFLICT(instanceId) DO UPDATE SET
           cloudId       = excluded.cloudId,
           updatedAt     = datetime('now'),
           uninstalledAt = NULL`,
      )
      .bind(instanceId, cloudId)
      .run();
  }

  async markUninstalledByCloudId(cloudId: string, atIso: string): Promise<number> {
    // Only stamp rows that are still active (uninstalledAt IS NULL) — a duplicate preUninstall must not reset
    // the deletion clock. Reinstall clears the tombstone via recordActive, so a later uninstall stamps afresh.
    const res = await this.db
      .prepare(
        `UPDATE ProvisionedInstance SET uninstalledAt = ?2, updatedAt = datetime('now')
         WHERE cloudId = ?1 AND uninstalledAt IS NULL`,
      )
      .bind(cloudId, atIso)
      .run();
    return res.meta?.changes ?? 0;
  }

  async listDeletable(cutoffIso: string, limit: number): Promise<ProvisionedInstanceRow[]> {
    const res = await this.db
      .prepare(
        `SELECT * FROM ProvisionedInstance
         WHERE uninstalledAt IS NOT NULL AND uninstalledAt <= ?1
         ORDER BY uninstalledAt ASC
         LIMIT ?2`,
      )
      .bind(cutoffIso, limit)
      .all<ProvisionedInstanceRow>();
    return res.results ?? [];
  }

  async delete(instanceId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM ProvisionedInstance WHERE instanceId = ?1`).bind(instanceId).run(); // idempotent
  }
}
