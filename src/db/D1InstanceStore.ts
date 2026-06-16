// D1-backed InstanceStore (real SQL; migrations/0001_mini_site_instance.sql). Satisfies the same contract as
// InMemoryInstanceStore — verified under Miniflare in the integration step (Stage 2 wiring), not in unit tests
// here. Every statement binds the FULL composite key (clientKey, cloudId, instanceId) → INV-GW-06.
import type { InstanceStore, InstanceKey, NewInstance, MiniSiteInstanceRow, InstanceStatus } from './InstanceStore';

export class D1InstanceStore implements InstanceStore {
  constructor(private readonly db: D1Database) {}

  async upsert(input: NewInstance): Promise<MiniSiteInstanceRow> {
    const row = await this.db
      .prepare(
        `INSERT INTO MiniSiteInstance
           (clientKey, cloudId, instanceId, workerName, contentId, spaceKey, macroLocalId,
            bundleHash, status, forkedFromInstanceId)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(clientKey, cloudId, instanceId) DO UPDATE SET
           workerName = excluded.workerName,
           contentId  = excluded.contentId,
           spaceKey   = excluded.spaceKey,
           bundleHash = excluded.bundleHash,
           updatedAt  = datetime('now')
         RETURNING *`,
      )
      .bind(
        input.clientKey, input.cloudId, input.instanceId, input.workerName, input.contentId,
        input.spaceKey ?? null, input.macroLocalId, input.bundleHash, input.status ?? 'staging',
        input.forkedFromInstanceId ?? null,
      )
      .first<MiniSiteInstanceRow>();
    if (!row) throw new Error('upsert: no row returned'); // RETURNING guarantees a row on success
    return row;
  }

  async get(key: InstanceKey): Promise<MiniSiteInstanceRow | null> {
    return this.db
      .prepare(`SELECT * FROM MiniSiteInstance WHERE clientKey = ?1 AND cloudId = ?2 AND instanceId = ?3`)
      .bind(key.clientKey, key.cloudId, key.instanceId)
      .first<MiniSiteInstanceRow>();
  }

  async setStatus(key: InstanceKey, status: InstanceStatus): Promise<void> {
    await this.db
      .prepare(
        `UPDATE MiniSiteInstance SET status = ?4, updatedAt = datetime('now')
         WHERE clientKey = ?1 AND cloudId = ?2 AND instanceId = ?3`,
      )
      .bind(key.clientKey, key.cloudId, key.instanceId, status)
      .run();
  }

  async setLiveBundle(key: InstanceKey, bundleHash: string, version: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE MiniSiteInstance
           SET bundleHash = ?4, latestVersion = ?5, status = 'active', updatedAt = datetime('now')
         WHERE clientKey = ?1 AND cloudId = ?2 AND instanceId = ?3`,
      )
      .bind(key.clientKey, key.cloudId, key.instanceId, bundleHash, version)
      .run();
  }

  async delete(key: InstanceKey): Promise<void> {
    await this.db
      .prepare(`DELETE FROM MiniSiteInstance WHERE clientKey = ?1 AND cloudId = ?2 AND instanceId = ?3`)
      .bind(key.clientKey, key.cloudId, key.instanceId)
      .run(); // idempotent: deleting 0 rows is fine
  }

  async touchLastSeen(key: InstanceKey, atIso: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE MiniSiteInstance SET lastSeenAt = ?4
         WHERE clientKey = ?1 AND cloudId = ?2 AND instanceId = ?3`,
      )
      .bind(key.clientKey, key.cloudId, key.instanceId, atIso)
      .run();
  }
}
