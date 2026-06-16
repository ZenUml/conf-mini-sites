// ClientInstallation store — the persistence boundary for the per-install record holding the ENCRYPTED Connect
// sharedSecret (migrations/0003_client_installation.sql; BACKEND_DESIGN §1.2, INV-GW-04/10). The install
// lifecycle handler (Stage 5) and the auth gateway depend on this interface, not on D1 directly.
//
// Secret selection keys on the COMPOSITE (clientKey, key) — NEVER clientKey alone: one clientKey carries Lite +
// Full variant rows with DIFFERENT secrets (the 0008 correction). The store stores/returns the encrypted blob
// VERBATIM — encryption/decryption is the lifecycle handler's job, not the store's (INV-GW-10).

export type InstallStatus = 'active' | 'uninstalled';

export interface InstallRow {
  id: number;
  clientKey: string;
  key: string;
  cloudId: string;
  baseUrl: string;
  sharedSecretEnc: string; // base64 of the AES-GCM envelope; opaque to the store
  sharedSecretKeyId: string;
  status: InstallStatus;
  installedAt: string;
  updatedAt: string;
  uninstalledAt: string | null;
}

/** Fields supplied by the install lifecycle handler when registering (or reinstalling) a tenant variant. */
export interface NewInstall {
  clientKey: string;
  key: string;
  cloudId: string;
  baseUrl: string;
  sharedSecretEnc: string; // already-encrypted; the store never inspects or transforms it
  sharedSecretKeyId: string;
}

/** Narrow projection the gateway needs to verify + decrypt — only the active row is returned. */
export interface SecretRecord {
  sharedSecretEnc: string;
  sharedSecretKeyId: string;
  cloudId: string;
  baseUrl: string;
}

export interface InstallStore {
  /** Idempotent install/reinstall: insert, or atomically overwrite the secret + baseUrl/cloudId of the existing
   *  (clientKey, key) row. Reinstall re-activates a previously uninstalled row. Returns the resulting row. */
  upsert(input: NewInstall): Promise<InstallRow>;

  /** Secret selection — keyed on the FULL (clientKey, key) composite, ACTIVE rows only. Returns null if there is
   *  no active row for that pair (uninstalled / unknown both read as null). NEVER selects by clientKey alone. */
  getSecretRecord(clientKey: string, key: string): Promise<SecretRecord | null>;

  /** Tenant teardown: flip every row for this clientKey to status='uninstalled' (all variants). Idempotent. */
  markUninstalled(clientKey: string): Promise<void>;

  /** Optional diagnostic read: all rows for a clientKey (every variant, any status). */
  getByClientKey?(clientKey: string): Promise<InstallRow[]>;
}
