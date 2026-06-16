// Tests for the app-layer envelope (INV-GW-10). Assertions are on round-trip BEHAVIOR, never exact
// ciphertext — the IV is random per call, so the only stable contract is "decrypt undoes encrypt" and
// "tamper / wrong key / bad format throws". Web Crypto only; runs in the vitest/node env unchanged.
import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, ENVELOPE_VERSION } from './envelope';

// A fixed 256-bit key — deterministic test input, not a real secret.
const KEY: Uint8Array = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 0xff);
const KEY_ID = 'k-2026-06';

/** Decode a base64 envelope back into its parsed JSON shape (test-side inspection only). */
function decodeBlob(blob: string): { v: number; kid: string; iv: string; ct: string } {
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(blob), (c) => c.charCodeAt(0))));
}

describe('envelope (INV-GW-10)', () => {
  it('round-trips: decrypt(encrypt(x)) === x', async () => {
    const plaintext = 'super-secret-shared-secret-从前有座山';
    const blob = await encryptSecret(plaintext, KEY, KEY_ID);
    expect(await decryptSecret(blob, KEY)).toBe(plaintext);
  });

  it('round-trips an empty string', async () => {
    const blob = await encryptSecret('', KEY, KEY_ID);
    expect(await decryptSecret(blob, KEY)).toBe('');
  });

  it('records the version and key-id in the blob', async () => {
    const blob = await encryptSecret('s', KEY, KEY_ID);
    const decoded = decodeBlob(blob);
    expect(decoded.v).toBe(ENVELOPE_VERSION);
    expect(decoded.kid).toBe(KEY_ID);
  });

  it('two encryptions of the same plaintext differ (random IV)', async () => {
    const plaintext = 'identical-input';
    const a = await encryptSecret(plaintext, KEY, KEY_ID);
    const b = await encryptSecret(plaintext, KEY, KEY_ID);
    expect(a).not.toBe(b);

    // The difference is the IV (and therefore the ciphertext) — both still decrypt to the same plaintext.
    expect(decodeBlob(a).iv).not.toBe(decodeBlob(b).iv);
    expect(await decryptSecret(a, KEY)).toBe(plaintext);
    expect(await decryptSecret(b, KEY)).toBe(plaintext);
  });

  it('throws on a tampered ciphertext (AES-GCM auth failure)', async () => {
    const blob = await encryptSecret('do-not-forge-me', KEY, KEY_ID);
    const decoded = decodeBlob(blob);

    // Flip one byte of the ciphertext, re-encode the envelope — the auth tag no longer matches.
    const ctBytes = Uint8Array.from(atob(decoded.ct), (c) => c.charCodeAt(0));
    ctBytes[0] ^= 0xff;
    let tamperedCt = '';
    for (const byte of ctBytes) tamperedCt += String.fromCharCode(byte);
    const tamperedBlob = reencode({ ...decoded, ct: btoa(tamperedCt) });

    await expect(decryptSecret(tamperedBlob, KEY)).rejects.toThrow();
  });

  it('throws when decrypted with the wrong key', async () => {
    const blob = await encryptSecret('tenant-secret', KEY, KEY_ID);
    const wrongKey = new Uint8Array(32).fill(0xab);
    await expect(decryptSecret(blob, wrongKey)).rejects.toThrow();
  });

  it('throws on an unknown envelope version', async () => {
    const blob = await encryptSecret('s', KEY, KEY_ID);
    const bumped = reencode({ ...decodeBlob(blob), v: 99 });
    await expect(decryptSecret(bumped, KEY)).rejects.toThrow(/version/);
  });

  it('throws on a structurally malformed blob', async () => {
    const notBase64Json = btoa('this is not json');
    await expect(decryptSecret(notBase64Json, KEY)).rejects.toThrow();
  });
});

/** Re-encode a (possibly mutated) envelope object back into the base64-of-JSON wire form. */
function reencode(obj: { v: number; kid: string; iv: string; ct: string }): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
