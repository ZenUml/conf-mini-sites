// ProvisionedInstanceStore — the Forge CONTROL Worker's persistence boundary for uninstall-driven GC
// (migrations/0004_provisioned_instance.sql). The control path only ever holds an opaque instanceId and its
// site cloudId, so this store is deliberately minimal — it is NOT the tenant-scoped MiniSiteInstance store
// (that carries Connect content columns the Forge path never sees).
//
// Retention model ("delete 30 days after uninstall"):
//   recordActive             — /publish + /serve-url: the site is live → insert or clear any uninstall tombstone.
//   markUninstalledByCloudId — Forge preUninstall: stamp uninstalledAt for the site (only where NULL).
//   listDeletable            — scheduled sweep: rows tombstoned at/before a cutoff, oldest first, capped.
//   delete                   — after the per-instance Worker is torn down (idempotent).

export interface ProvisionedInstanceRow {
  instanceId: string;
  cloudId: string;
  createdAt: string;
  updatedAt: string;
  /** ISO-8601 UTC instant the owning site was uninstalled; NULL while the app is installed/active. */
  uninstalledAt: string | null;
}

export interface ProvisionedInstanceStore {
  /** Record (or re-activate) a provisioned instance. Clears any prior uninstall tombstone — a publish/serve is
   *  proof the site is installed and in use (reinstall-safe). Idempotent on instanceId. */
  recordActive(instanceId: string, cloudId: string): Promise<void>;

  /** Tombstone every still-active instance of a site (Forge preUninstall). Sets uninstalledAt only where it is
   *  NULL, so a repeated trigger never pushes the deletion clock forward. Returns the number of rows stamped. */
  markUninstalledByCloudId(cloudId: string, atIso: string): Promise<number>;

  /** Instances tombstoned at or before `cutoffIso` (uninstalledAt <= cutoff), oldest tombstone first, at most
   *  `limit` rows (blast-radius cap). */
  listDeletable(cutoffIso: string, limit: number): Promise<ProvisionedInstanceRow[]>;

  /** Idempotent delete by instanceId — called after the ms-<instanceId> Worker is removed. */
  delete(instanceId: string): Promise<void>;
}
