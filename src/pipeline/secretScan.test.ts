// Tests for the secret-leak scanner (DESIGN §5.4 / I7). The fixture table is mandated by I7:
// AWS/Google/JWT/PEM/`password=` MUST be detected; UUID / hex-color / base64-image MUST NOT flag.
// secretScan is a single pure function, so a plain *.test.ts (no contract.ts) per the house style.
import { describe, it, expect } from 'vitest';
import { scanForSecrets } from './secretScan';

const enc = new TextEncoder();

/** Build a one-file scan input from a text body. */
function fileOf(path: string, body: string): { path: string; bytes: Uint8Array } {
  return { path, bytes: enc.encode(body) };
}

/** True if any hit on the given file has the given kind. */
function hasKind(hits: { file: string; line: number; kind: string }[], file: string, kind: string): boolean {
  return hits.some((h) => h.file === file && h.kind === kind);
}

describe('scanForSecrets — I7 true positives', () => {
  it('detects an AWS access key id (AKIA...)', () => {
    const { hits } = scanForSecrets([fileOf('config.js', 'const id = "AKIAIOSFODNN7EXAMPLE";')]);
    expect(hasKind(hits, 'config.js', 'aws-access-key-id')).toBe(true);
  });

  it('detects a Google API key (AIza...)', () => {
    // Real Google API keys are AIza + 35 url-safe chars (39 total).
    const { hits } = scanForSecrets([fileOf('app.js', 'const k = "AIzaSyB1234567890abcdefghijklmnopqrstuv";')]);
    expect(hasKind(hits, 'app.js', 'google-api-key')).toBe(true);
  });

  it('detects a JWT (eyJ...eyJ...)', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const { hits } = scanForSecrets([fileOf('token.txt', `authToken=${jwt}`)]);
    expect(hasKind(hits, 'token.txt', 'jwt')).toBe(true);
  });

  it('detects a PEM private key header', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
    const { hits } = scanForSecrets([fileOf('key.pem', pem)]);
    expect(hasKind(hits, 'key.pem', 'pem-private-key')).toBe(true);
  });

  it('detects a generic assignment (password = "long-value")', () => {
    const { hits } = scanForSecrets([fileOf('settings.py', 'password = "hunter2-super-secret-value-9381"')]);
    expect(hasKind(hits, 'settings.py', 'generic-assignment')).toBe(true);
  });

  it('detects api_key / secret / token assignments too', () => {
    const body = [
      'api_key = "abcdefghijklmnopqrstuvwxyz0123456789"',
      'const secret = "a-very-long-secret-string-value-here-9999"',
      'TOKEN: "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789"',
    ].join('\n');
    const { hits } = scanForSecrets([fileOf('env.js', body)]);
    expect(hasKind(hits, 'env.js', 'generic-assignment')).toBe(true);
  });

  it('reports a 1-based line number for the hit', () => {
    const body = 'line one\nline two\nconst id = "AKIAIOSFODNN7EXAMPLE";';
    const { hits } = scanForSecrets([fileOf('a.js', body)]);
    const hit = hits.find((h) => h.kind === 'aws-access-key-id');
    expect(hit?.line).toBe(3);
  });

  it('attributes hits to the correct file across a multi-file bundle', () => {
    const { hits } = scanForSecrets([
      fileOf('clean.js', 'export const x = 1;'),
      fileOf('leak.js', 'const id = "AKIAIOSFODNN7EXAMPLE";'),
    ]);
    expect(hits.every((h) => h.file === 'leak.js')).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('scanForSecrets — I7 false-positive guards (allow-list)', () => {
  it('does NOT flag a UUID', () => {
    const { hits } = scanForSecrets([fileOf('a.js', 'const id = "550e8400-e29b-41d4-a716-446655440000";')]);
    expect(hits).toEqual([]);
  });

  it('does NOT flag a hex color', () => {
    const { hits } = scanForSecrets([fileOf('style.css', '.box { color: #1a2b3c; background: #ffffff; }')]);
    expect(hits).toEqual([]);
  });

  it('does NOT flag a data:image base64 string', () => {
    const dataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const { hits } = scanForSecrets([fileOf('img.html', `<img src="${dataUri}">`)]);
    expect(hits).toEqual([]);
  });

  it('does NOT flag a short value assignment', () => {
    const { hits } = scanForSecrets([fileOf('cfg.js', 'password = "short"')]);
    expect(hits).toEqual([]);
  });
});

describe('scanForSecrets — file handling', () => {
  it('skips non-text-like (binary) files', () => {
    // A PNG magic-byte prefix followed by an AKIA token: must NOT be scanned as text.
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);
    const akia = enc.encode('AKIAIOSFODNN7EXAMPLE');
    const merged = new Uint8Array(bytes.length + akia.length);
    merged.set(bytes, 0);
    merged.set(akia, bytes.length);
    const { hits } = scanForSecrets([{ path: 'logo.png', bytes: merged }]);
    expect(hits).toEqual([]);
  });

  it('returns no hits for an empty input', () => {
    expect(scanForSecrets([])).toEqual({ hits: [] });
  });
});
