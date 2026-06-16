-- ProvisioningJob: the §3.4 async provisioning job (BACKEND_DESIGN canonical schema). One row per provision
-- run; the instance stays 'staging'/un-servable until the job flips it 'active' (I10). The D1-backed store
-- (D1ProvisioningJobStore) implements the same interface as InMemoryProvisioningJobStore — added when the
-- cloud account exists; the in-memory store carries the contract until then.
CREATE TABLE IF NOT EXISTS ProvisioningJob (
  jobId          TEXT NOT NULL PRIMARY KEY,        -- standalone ulid/uuid
  instanceId     TEXT NOT NULL,
  clientKey      TEXT NOT NULL,                    -- carried so the sub-resource grant can re-check permission
  cloudId        TEXT NOT NULL,                    -- tenant isolation (I8)
  version        INTEGER NOT NULL,
  bundleHash     TEXT NOT NULL,
  idempotencyKey TEXT NOT NULL,
  state          TEXT NOT NULL                     -- queued -> provisioning -> active | failed
                   CHECK (state IN ('queued','provisioning','active','failed')),
  step           TEXT                              -- upload_script | upload_assets | smoke_verify | flip_active
                   CHECK (step IS NULL OR step IN ('upload_script','upload_assets','smoke_verify','flip_active')),
  attempts       INTEGER NOT NULL DEFAULT 0,
  lastError      TEXT,
  createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt      TEXT NOT NULL DEFAULT (datetime('now')),
  -- I10 / §3.4: a retried publish with the same key + bundle resumes the SAME job; same key + different
  -- bundle is an IDEMPOTENCY_CONFLICT. DB-level guard, not an app-layer check.
  UNIQUE (cloudId, idempotencyKey, bundleHash)
);
CREATE INDEX IF NOT EXISTS idx_job_stuck   ON ProvisioningJob(state, updatedAt); -- orphan reaper input (I1↔I10)
CREATE INDEX IF NOT EXISTS idx_job_instance ON ProvisioningJob(cloudId, instanceId);
