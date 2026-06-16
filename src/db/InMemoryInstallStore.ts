// In-memory InstallStore for tests + local upper-layer dev. Mirrors the D1 table semantics exactly: a row is
// keyed by the composite (clientKey, key); secret selection requires BOTH parts and returns active rows only.
// The store treats sharedSecretEnc as an opaque blob — it never inspects or transforms it (INV-GW-10).
import type { InstallStore, NewInstall, InstallRow, SecretRecord } from './ClientInstallation';

const keyOf = (clientKey: string, key: string): string => `${clientKey} ${key}`;

export class InMemoryInstallStore implements InstallStore {
  private rows = new Map<string, InstallRow>();
  private seq = 0;
  // injectable clock so tests are deterministic (no Date.now in business logic)
  constructor(private now: () => string = () => new Date(0).toISOString()) {}

  async upsert(input: NewInstall): Promise<InstallRow> {
    const k = keyOf(input.clientKey, input.key);
    const existing = this.rows.get(k);
    const ts = this.now();
    const row: InstallRow = {
      id: existing?.id ?? ++this.seq,
      clientKey: input.clientKey,
      key: input.key,
      cloudId: input.cloudId,
      baseUrl: input.baseUrl,
      sharedSecretEnc: input.sharedSecretEnc, // stored verbatim
      sharedSecretKeyId: input.sharedSecretKeyId,
      status: 'active', // reinstall re-activates a previously uninstalled row
      installedAt: existing?.installedAt ?? ts,
      updatedAt: ts,
      uninstalledAt: null,
    };
    this.rows.set(k, row);
    return row;
  }

  async getSecretRecord(clientKey: string, key: string): Promise<SecretRecord | null> {
    const row = this.rows.get(keyOf(clientKey, key));
    if (!row || row.status !== 'active') return null; // active rows only — uninstalled/unknown both → null
    return {
      sharedSecretEnc: row.sharedSecretEnc,
      sharedSecretKeyId: row.sharedSecretKeyId,
      cloudId: row.cloudId,
      baseUrl: row.baseUrl,
    };
  }

  async markUninstalled(clientKey: string): Promise<void> {
    const ts = this.now();
    for (const row of this.rows.values()) {
      if (row.clientKey === clientKey && row.status !== 'uninstalled') {
        row.status = 'uninstalled';
        row.uninstalledAt = ts;
        row.updatedAt = ts;
      }
    }
  }

  async getByClientKey(clientKey: string): Promise<InstallRow[]> {
    return [...this.rows.values()].filter((r) => r.clientKey === clientKey);
  }
}
