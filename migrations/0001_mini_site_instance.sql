-- MiniSiteInstance: the instance ↔ content ↔ tenant binding (DESIGN §1.3, BACKEND_DESIGN §1.1).
-- The PK is the composite (clientKey, cloudId, instanceId) so a row is PHYSICALLY unreachable under another
-- tenant's key — the IDOR defense (INV-GW-06) is a constraint, not a WHERE an implementer can forget.
CREATE TABLE IF NOT EXISTS MiniSiteInstance (
  clientKey            TEXT NOT NULL,                 -- Connect tenant identity (JWT iss)
  cloudId              TEXT NOT NULL,                 -- tenant isolation key (verified token, cross-checked to install)
  instanceId           TEXT NOT NULL,                 -- sha256(cloudId:macroLocalId) slug; stable per mini-site
  workerName           TEXT NOT NULL,                 -- ms-<instanceId>; dispatch script name; NEVER client-visible
  contentId            TEXT NOT NULL,                 -- the Confluence content this instance is bound to
  spaceKey             TEXT,
  macroLocalId         TEXT NOT NULL,                 -- Connect per-macro localId; hashed into instanceId
  bundleHash           TEXT NOT NULL,                 -- content hash of the current live bundle
  latestVersion        INTEGER NOT NULL DEFAULT 0,    -- pointer into BundleVersion.version (0 = none live yet)
  status               TEXT NOT NULL                  -- only 'active' is served (DESIGN §3.4)
                         CHECK (status IN ('staging','provisioning','active','orphan_candidate','quarantined','deleted')),
  scanStatus           TEXT,                          -- 'pending'|'clean'|'secret_detected'|'rescan_required' (I7)
  missingPasses        INTEGER NOT NULL DEFAULT 0,    -- reconcile counter (I1)
  forkedFromInstanceId TEXT,                          -- copy-on-access lineage (I2); NULL if original
  createdAt            TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt            TEXT NOT NULL DEFAULT (datetime('now')),
  lastSeenAt           TEXT,                          -- out-of-band on each authenticated view (orphan-GC input)
  deletedAt            TEXT,
  PRIMARY KEY (clientKey, cloudId, instanceId)
);
CREATE INDEX IF NOT EXISTS idx_minisite_cloud   ON MiniSiteInstance(cloudId);
CREATE INDEX IF NOT EXISTS idx_minisite_content ON MiniSiteInstance(cloudId, contentId);
CREATE INDEX IF NOT EXISTS idx_minisite_orphan  ON MiniSiteInstance(status, lastSeenAt);
CREATE INDEX IF NOT EXISTS idx_minisite_fork    ON MiniSiteInstance(forkedFromInstanceId);
