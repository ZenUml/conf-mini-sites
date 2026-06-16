// envelope — app-layer envelope encryption for secrets at rest (INV-GW-10).
//
// D1's default encryption is insufficient: a D1 read, a logged row, or a backup dump must NOT disclose a
// per-tenant `sharedSecret` (BACKEND_DESIGN §schema, DESIGN §2.4). So secrets are wrapped here with
// AES-GCM-256 BEFORE they touch the database, and the ciphertext + key-id are stored
// (`sharedSecretEnc` BLOB + `sharedSecretKeyId`). AES-GCM is authenticated: any tamper to the stored blob
// makes decryption throw rather than return forged plaintext.
//
// Web Crypto only (`crypto.subtle`, `crypto.getRandomValues`) — works in Workers and in the vitest/node env.
// No node:crypto. This is runtime application crypto (not workflow-script code), so a random IV per
// encryption is required and correct: AES-GCM MUST never reuse an (key, iv) pair.
//
// Wire format (stable, versioned): the blob is base64( JSON {
//   v:   1,           // envelope version — bump on format change
//   kid: keyId,       // which K_enc wrapped this (rotation selector; the caller maps kid → keyRaw)
//   iv:  base64(iv),  // random 12-byte AES-GCM nonce
//   ct:  base64(ct),  // AES-GCM ciphertext WITH the appended 16-byte auth tag (Web Crypto convention)
// } ).

/** Current envelope wire-format version. Persisted in every blob; decrypt rejects unknown versions. */
export const ENVELOPE_VERSION = 1 as const;

/** AES-GCM nonce length in bytes — 96 bits is the AES-GCM standard / Web Crypto default. */
const IV_BYTE_LENGTH = 12;

/** Parsed envelope shape (what `JSON.parse` yields before validation). */
interface EnvelopeBlob {
  readonly v: number;
  readonly kid: string;
  readonly iv: string; // base64
  readonly ct: string; // base64
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Envelope-encrypt a secret for storage at rest (INV-GW-10).
 *
 * @param plaintext the secret to wrap (e.g. a per-tenant `sharedSecret`).
 * @param keyRaw    the raw 256-bit (32-byte) AES key bytes (K_enc). Imported as an AES-GCM key.
 * @param keyId     identifies which K_enc this is, recorded as `kid` so a rotated reader can pick the right
 *                  unwrapper. The caller maps `kid` → `keyRaw` on decrypt.
 * @returns a base64-encoded JSON envelope. Two calls on the same plaintext differ (fresh random IV each time),
 *          so the ciphertext is not a stable equality oracle over secrets.
 */
export async function encryptSecret(
  plaintext: string,
  keyRaw: Uint8Array,
  keyId: string,
): Promise<string> {
  const key = await importAesGcmKey(keyRaw, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const ctBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(plaintext),
  );
  const blob: EnvelopeBlob = {
    v: ENVELOPE_VERSION,
    kid: keyId,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ctBuffer)),
  };
  return bytesToBase64(textEncoder.encode(JSON.stringify(blob)));
}

/**
 * Decrypt an envelope produced by {@link encryptSecret}. Fail-closed: a malformed blob, an unknown version,
 * or an AES-GCM authentication failure (the blob was tampered with, or the wrong key was supplied) all THROW.
 * A throw is the only safe outcome — never return forged or partial plaintext (INV-GW-10).
 *
 * @param blob   the base64 envelope string from storage.
 * @param keyRaw the raw 256-bit AES key bytes. The caller selects this from the blob's `kid` (rotation).
 */
export async function decryptSecret(blob: string, keyRaw: Uint8Array): Promise<string> {
  const parsed = parseEnvelope(blob);
  if (parsed.v !== ENVELOPE_VERSION) {
    throw new Error(`envelope: unsupported version ${parsed.v}`);
  }
  const key = await importAesGcmKey(keyRaw, ['decrypt']);
  const iv = base64ToBytes(parsed.iv);
  const ct = base64ToBytes(parsed.ct);
  // crypto.subtle.decrypt throws OperationError on auth-tag mismatch (tamper / wrong key) — let it propagate.
  const plaintextBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return textDecoder.decode(new Uint8Array(plaintextBuffer));
}

// ───────────────────────────── helpers (Web Crypto + base64, no node:*) ─────────────────────────────────

async function importAesGcmKey(
  keyRaw: Uint8Array,
  usages: readonly ('encrypt' | 'decrypt')[],
): Promise<CryptoKey> {
  // Copy into a fresh ArrayBuffer-backed view so the BufferSource type is unambiguous (matches connectJwt).
  return crypto.subtle.importKey('raw', keyRaw.slice(), { name: 'AES-GCM' }, false, [...usages]);
}

function parseEnvelope(blob: string): EnvelopeBlob {
  let json: string;
  try {
    json = textDecoder.decode(base64ToBytes(blob));
  } catch {
    throw new Error('envelope: blob is not valid base64');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('envelope: blob is not valid JSON');
  }
  if (!isEnvelopeBlob(parsed)) {
    throw new Error('envelope: blob is missing required fields');
  }
  return parsed;
}

function isEnvelopeBlob(value: unknown): value is EnvelopeBlob {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.v === 'number' &&
    typeof candidate.kid === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ct === 'string'
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
