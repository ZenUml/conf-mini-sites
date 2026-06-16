// D1-backed InstallStore (real SQL; migrations/0003_client_installation.sql). Satisfies the same contract as
// InMemoryInstallStore — verified under Miniflare in the integration step, not in unit tests here. Secret
// selection binds the FULL composite (clientKey, key) and filters status='active' (BACKEND_DESIGN §2.4 step 2,
// the 0008 correction) — NEVER clientKey alone. sharedSecretEnc is read/written verbatim (INV-GW-10).
import type { InstallStore, NewInstall, InstallRow, SecretRecord } from './ClientInstallation';

export class D1InstallStore implements InstallStore {
  constructor(private readonly db: D1Database) {}

  async upsert(input: NewInstall): Promise<InstallRow> {
    const row = await this.db
      .prepare(
        `INSERT INTO ClientInstallation
           (clientKey, key, cloudId, baseUrl, sharedSecretEnc, sharedSecretKeyId, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active')
         ON CONFLICT(clientKey, key) DO UPDATE SET
           cloudId           = excluded.cloudId,
           baseUrl           = excluded.baseUrl,
           sharedSecretEnc   = excluded.sharedSecretEnc,
           sharedSecretKeyId = excluded.sharedSecretKeyId,
           status            = 'active',
           updatedAt         = datetime('now'),
           uninstalledAt     = NULL
         RETURNING *`,
      )
      .bind(
        input.clientKey, input.key, input.cloudId, input.baseUrl,
        input.sharedSecretEnc, input.sharedSecretKeyId,
      )
      .first<InstallRow>();
    if (!row) throw new Error('upsert: no row returned'); // RETURNING guarantees a row on success
    return row;
  }

  async getSecretRecord(clientKey: string, key: string): Promise<SecretRecord | null> {
    return this.db
      .prepare(
        `SELECT sharedSecretEnc, sharedSecretKeyId, cloudId, baseUrl
         FROM ClientInstallation
         WHERE clientKey = ?1 AND key = ?2 AND status = 'active'`,
      )
      .bind(clientKey, key)
      .first<SecretRecord>();
  }

  async markUninstalled(clientKey: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE ClientInstallation
           SET status = 'uninstalled', uninstalledAt = datetime('now'), updatedAt = datetime('now')
         WHERE clientKey = ?1 AND status != 'uninstalled'`,
      )
      .bind(clientKey)
      .run(); // idempotent: 0 rows matched is fine
  }

  async getByClientKey(clientKey: string): Promise<InstallRow[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM ClientInstallation WHERE clientKey = ?1`)
      .bind(clientKey)
      .all<InstallRow>();
    return results ?? [];
  }
}
