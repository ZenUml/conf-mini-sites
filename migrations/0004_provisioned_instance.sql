-- ProvisionedInstance: the Forge CONTROL Worker's record of every per-instance Worker it provisioned, so a
-- scheduled sweep can DELETE a site's mini-site bundles a fixed retention window AFTER the app is uninstalled
-- (the Marketplace listing's "stores End-User Data after uninstall" = 30 days, not indefinitely).
--
-- This is SEPARATE from MiniSiteInstance (0001, the Connect-era instance↔content↔tenant binding). The Forge
-- control path only ever knows the opaque instanceId and its site cloudId — it never sees clientKey/contentId/
-- macroLocalId — so it keeps this minimal table rather than carrying MiniSiteInstance's NOT NULL content columns.
--
-- Lifecycle:
--   recordActive (POST /publish, /serve-url) — the site is live → insert, or CLEAR any prior uninstall tombstone
--       (a publish/re-view proves the app is installed and in use → reinstall-safe).
--   markUninstalledByCloudId (Forge preUninstall → POST /uninstall) — stamp uninstalledAt for every still-active
--       row of the site, only where it is NULL so a repeated trigger never resets the deletion clock.
--   scheduled() sweep — delete ms-<instanceId> + the row once uninstalledAt <= now - RETENTION (30 days).
CREATE TABLE IF NOT EXISTS ProvisionedInstance (
  instanceId    TEXT PRIMARY KEY,                          -- macro instance id; the Worker is ms-<instanceId>
  cloudId       TEXT NOT NULL,                             -- Confluence site; uninstall tombstones by this
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now')),
  uninstalledAt TEXT                                       -- ISO-8601 (UTC) set on preUninstall; NULL while live
);
CREATE INDEX IF NOT EXISTS idx_provisioned_cloud       ON ProvisionedInstance(cloudId);
CREATE INDEX IF NOT EXISTS idx_provisioned_uninstalled ON ProvisionedInstance(uninstalledAt);
