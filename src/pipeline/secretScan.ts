// Secret-leak scanner — DESIGN §5.4 step 5 / I7.
//
// Invariant (I7): every upload is scanned before it is servable; a confirmed hit ⇒ hard fail.
// This module is the *detector* only — it returns the hits; the pipeline (caller) decides go/no-go.
//
// RESIDUAL (I7, stated to customers as best-effort, NOT a guarantee): detection is heuristic.
// Novel / obfuscated / encrypted / split secrets evade it, and the entropy fallback can produce
// false positives. We err toward high-signal patterns plus an allow-list guard so that the common
// benign-but-noisy shapes (UUID, hex color, base64 image data-URI) do not flag. We do NOT rotate or
// revoke a leaked secret here — that is out of scope (see I7 residual).
//
// Pure function: no I/O, no clock, no env. Deterministic for a given input.

export interface ScanFile {
  path: string;
  bytes: Uint8Array;
}

export interface SecretHit {
  file: string;
  line: number; // 1-based
  kind: string;
}

export interface ScanResult {
  hits: SecretHit[];
}

const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false });

// --- Text-likeness gate -------------------------------------------------------------------------
// Only scan files that decode as plausible UTF-8 text. Binary assets (images, fonts, wasm) are
// skipped: scanning their bytes as text produces garbage and false positives, and a real secret
// baked into a binary is out of this scanner's high-signal scope (I7 residual). Heuristic: a NUL
// byte, or a high proportion of non-printable control bytes, marks the file as binary.
function isTextLike(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return true;
  // Cap the sample so a huge file does not dominate CPU (I7 is a [COST] item).
  const sample = bytes.length > 8192 ? bytes.subarray(0, 8192) : bytes;
  let suspicious = 0;
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 0x00) return false; // NUL ⇒ binary
    // Allow tab (9), LF (10), CR (13); flag other C0 control bytes.
    if (b < 0x09 || (b > 0x0d && b < 0x20)) suspicious++;
  }
  return suspicious / sample.length < 0.1;
}

// --- High-signal patterns -----------------------------------------------------------------------
// Each pattern is scanned per line so we can report a precise 1-based line number.

// AWS access key id: AKIA / ASIA / AGPA / AIDA etc. + 16 uppercase-alnum. Use the canonical AKIA prefix
// plus the broader AWS id-prefix family.
const AWS_ACCESS_KEY_ID = /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16}\b/;

// Google API key: literal "AIza" + 35 url-safe chars (39 total). Distinct from the AWS family.
const GOOGLE_API_KEY = /\bAIza[0-9A-Za-z_-]{35}\b/;

// JWT: three base64url segments; header and payload both decode to a '{' object. We match the
// header.payload shape (both starting eyJ — base64url of `{"`) followed by a signature segment.
const JWT = /\beyJ[0-9A-Za-z_-]{8,}\.eyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\b/;

// PEM private key header — RSA/EC/DSA/OPENSSH/PKCS8 ("BEGIN ... PRIVATE KEY").
const PEM_PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/;

// Generic assignment: (api_key|apikey|secret|password|passwd|token|access_token) <= / : / => "long".
// The key is matched case-insensitively with optional separators; the value must be a quoted string
// of >= 16 chars. Short values ("short") and unquoted flags are ignored.
const GENERIC_ASSIGNMENT =
  /(?:api[_-]?key|secret|password|passwd|access[_-]?token|token)["']?\s*[:=]>?\s*["']([^"']{16,})["']/i;

// --- Entropy fallback ---------------------------------------------------------------------------
// Long, high-entropy base64-ish runs that no named pattern caught. Guarded by an allow-list so the
// common benign shapes do not flag.
const BASE64ISH_RUN = /[A-Za-z0-9+/_-]{40,}={0,2}/g;
const UUID = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;
const HEX_COLOR = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

/** Shannon entropy (bits/char) of a string — used to separate random secrets from structured text. */
function shannonEntropy(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** True when a candidate base64-ish run is a known-benign shape and must NOT be flagged (allow-list). */
function isAllowListed(run: string, line: string): boolean {
  if (UUID.test(run)) return true;
  // A base64 image data-URI: the whole line carries `data:image/...;base64,`. The payload is benign.
  if (/data:image\/[a-z0-9.+-]+;base64,/i.test(line)) return true;
  // Pure-hex runs (e.g. a long hash / hex color body) are structured, not secret-shaped.
  if (/^[0-9a-fA-F]+$/.test(run)) return true;
  return false;
}

const NAMED_PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: 'aws-access-key-id', re: AWS_ACCESS_KEY_ID },
  { kind: 'google-api-key', re: GOOGLE_API_KEY },
  { kind: 'jwt', re: JWT },
  { kind: 'pem-private-key', re: PEM_PRIVATE_KEY },
  { kind: 'generic-assignment', re: GENERIC_ASSIGNMENT },
];

function scanLine(line: string, file: string, lineNo: number, out: SecretHit[]): void {
  let matchedNamed = false;
  for (const { kind, re } of NAMED_PATTERNS) {
    if (re.test(line)) {
      out.push({ file, line: lineNo, kind });
      matchedNamed = true;
    }
  }
  // Entropy fallback only when no named pattern already fired on this line (avoid double-reporting,
  // and a named hit is already the stronger signal).
  if (matchedNamed) return;

  // A hex color on the line should never trip the entropy fallback.
  if (HEX_COLOR.test(line) && line.replace(HEX_COLOR, '').trim().length === 0) return;

  const runs = line.match(BASE64ISH_RUN);
  if (!runs) return;
  for (const run of runs) {
    if (isAllowListed(run, line)) continue;
    // High-entropy + long ⇒ likely a random secret. The 4.0 bits/char threshold separates random
    // tokens from structured identifiers (UUIDs are ~3.7, words are lower) while keeping CPU low.
    if (run.length >= 40 && shannonEntropy(run) >= 4.0) {
      out.push({ file, line: lineNo, kind: 'high-entropy' });
      break; // one entropy hit per line is enough
    }
  }
}

/**
 * Scan a set of (already-validated) bundle files for high-signal secret patterns.
 * Pure and deterministic. Best-effort per I7 — see the module-level residual note.
 */
export function scanForSecrets(files: ScanFile[]): ScanResult {
  const hits: SecretHit[] = [];
  for (const f of files) {
    if (!isTextLike(f.bytes)) continue; // skip binary assets
    const text = decoder.decode(f.bytes);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      scanLine(lines[i], f.path, i + 1, hits);
    }
  }
  return { hits };
}
