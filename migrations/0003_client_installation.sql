-- ClientInstallation: the per-install record holding the ENCRYPTED Connect sharedSecret (BACKEND_DESIGN §1.2,
-- INV-GW-04/10). Secret selection keys on the COMPOSITE (clientKey, key) — never clientKey alone: one clientKey
-- carries Lite + Full variant rows with DIFFERENT secrets, so `WHERE clientKey = ?` is non-deterministic. The
-- 0008 correction in conf-app (dropped UNIQUE(clientKey), added UNIQUE(clientKey,key)) is load-bearing here.
-- sharedSecretEnc holds base64 of the AES-GCM envelope (app-layer encrypted, K_enc-wrapped) — NEVER plaintext;
-- the store reads/writes it verbatim, encryption is the lifecycle handler's job. INV-GW-10: a logged row or raw
-- D1 read discloses nothing usable. cloudId is the authority the verified-token cloudId is cross-checked against
-- (INV-GW-04b — the HMAC proves clientKey only; cloudId is otherwise unauthenticated).
CREATE TABLE IF NOT EXISTS ClientInstallation (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  clientKey           TEXT NOT NULL,                 -- Connect tenant identity (JWT iss)
  key                 TEXT NOT NULL,                 -- app-variant key/descriptor key (Lite/Full); part of secret selection
  cloudId             TEXT NOT NULL,                 -- cross-checked against verified-token cloudId (INV-GW-04b)
  baseUrl             TEXT NOT NULL,                 -- tenant Confluence base URL (qsh baseUrl strip, REST calls)
  sharedSecretEnc     TEXT NOT NULL,                 -- base64 of the AES-GCM envelope (K_enc-wrapped) — NEVER plaintext
  sharedSecretKeyId   TEXT NOT NULL,                 -- which K_enc wrapped it (key rotation; envelope decrypt selector)
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','uninstalled')),
  installedAt         TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt           TEXT NOT NULL DEFAULT (datetime('now')),
  uninstalledAt       TEXT,
  -- same clientKey, multiple variants (Lite/Full) → UNIQUE on the composite, NOT clientKey alone:
  UNIQUE (clientKey, key)
);
CREATE INDEX IF NOT EXISTS idx_install_cloud ON ClientInstallation(cloudId);
