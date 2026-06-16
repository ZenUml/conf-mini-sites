// Bundle validation — step 3 (multi-file + root index.html + relative-only paths) and step 4 (size/count
// caps) of the shared upload pipeline. See DESIGN.md §3.3 (steps 3-4) and §5.3 (I6/I7 posture this feeds).
// A bundle that fails here NEVER reaches status=live (§3.3: "fails any step → never reaches live").
//
// This module is PURE: a single async fn that takes the raw files + caps and returns a typed result. It reads
// no clock and no ambient state — the only async work is crypto.subtle.digest for the content hash. The
// ValidatedBundle it produces is the shape the HostingProvider seam persists/serves verbatim (§6.1): the
// provider NEVER re-validates, so every invariant below must hold by the time we return { ok: true }.
import type { ValidatedBundle, BundleFile } from '../hosting/HostingProvider';

/** Raw input: a relative-looking path + its bytes. contentType is DERIVED here, not trusted from the client
 *  (server-authoritative MIME, §3.3 step 4) — so it is intentionally absent from the input shape. */
export interface RawBundleFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** Server-authoritative caps (§3.3 step 4). Defaults mirror CloudflareWfPProvider.capabilities so the pipeline
 *  rejects what the substrate could never host. maxTotalBytes defaults to maxFiles-independent per-bundle cap. */
export interface ValidateBundleOptions {
  readonly maxFiles?: number;
  readonly maxFileBytes?: number;
  readonly maxTotalBytes?: number;
}

export const DEFAULT_MAX_FILES = 2000;
export const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MiB — matches CloudflareWfPProvider.capabilities
export const DEFAULT_MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MiB per bundle (decompressed-total / zip-bomb guard)

/** Typed rejection union — codes mirror BACKEND_DESIGN.md §error-table (the publish sync 4xx codes). The HTTP
 *  status is carried so the publish route maps each to the spec'd code without a second switch. */
export type BundleErrorCode =
  | 'BUNDLE_NOT_MULTIFILE'
  | 'MISSING_INDEX_HTML'
  | 'ABSOLUTE_PATH_REJECTED'
  | 'PATH_TRAVERSAL_REJECTED'
  | 'TOO_MANY_FILES'
  | 'BUNDLE_TOO_LARGE';

export interface BundleError {
  readonly code: BundleErrorCode;
  readonly status: number; // HTTP status the publish route returns (BACKEND_DESIGN error table)
  readonly message: string;
  readonly path?: string; // the offending path, when the rule is per-file
}

export type ValidateBundleResult =
  | { readonly ok: true; readonly bundle: ValidatedBundle }
  | { readonly ok: false; readonly error: BundleError };

const ENTRYPOINT = 'index.html';

// Content-type by extension (server-authoritative, §3.3 step 4). A small, explicit allow-style map; anything
// unknown falls back to application/octet-stream so we never echo a client-supplied MIME.
const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8',
  wasm: 'application/wasm',
  xml: 'application/xml; charset=utf-8',
};

function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf('.');
  if (dot < 0 || dot === path.length - 1) return 'application/octet-stream';
  const ext = path.slice(dot + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

const fail = (code: BundleErrorCode, status: number, message: string, path?: string): ValidateBundleResult => ({
  ok: false,
  error: path === undefined ? { code, status, message } : { code, status, message, path },
});

/**
 * Path rule (§3.3 step 3, same shape as forge-upload-attachment.ts's ATTACHMENT_NAME_RE generalized to a
 * manifest): every path must be RELATIVE.
 *   - no http(s):// or other scheme, and no protocol-relative `//host`  → ABSOLUTE_PATH_REJECTED
 *   - no leading `/`                                                    → ABSOLUTE_PATH_REJECTED
 *   - no `..` path segment anywhere                                     → PATH_TRAVERSAL_REJECTED
 * Returns null when the path is clean. Absolute is checked before traversal so a `//evil/..` reports the
 * scheme/authority problem first.
 */
function classifyPath(path: string): BundleError | null {
  // scheme (http://, https://, file://, etc.) or protocol-relative authority.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('//')) {
    return { code: 'ABSOLUTE_PATH_REJECTED', status: 422, message: 'path must be relative, not an absolute URL', path };
  }
  if (path.startsWith('/')) {
    return { code: 'ABSOLUTE_PATH_REJECTED', status: 422, message: 'path must be relative, not server-absolute', path };
  }
  // A `..` as a whole segment in a /-separated path (leading, embedded, or trailing).
  const segments = path.split('/');
  if (segments.some((s) => s === '..')) {
    return { code: 'PATH_TRAVERSAL_REJECTED', status: 422, message: 'path must not traverse with ".."', path };
  }
  return null;
}

/** SHA-256 over the concatenated file bytes, in input order. Content-addressed bundleHash (§3.3 step 7). Uses
 *  the Web Crypto global `crypto.subtle` (present in Workers and the vitest/node env) — never node:crypto. */
async function contentHashOf(files: ReadonlyArray<RawBundleFile>): Promise<string> {
  const total = files.reduce((n, f) => n + f.bytes.byteLength, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const f of files) {
    buf.set(f.bytes, off);
    off += f.bytes.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256-${hex}`;
}

/**
 * Validate a candidate bundle. Pure + deterministic (no clock). Rule order is load-bearing so the surfaced
 * code is stable (§3.3 ordering): structural (multi-file → root index.html) → per-path (absolute/traversal) →
 * caps (count → per-file → total). The first failing rule wins.
 */
export async function validateBundle(
  files: ReadonlyArray<RawBundleFile>,
  opts: ValidateBundleOptions = {},
): Promise<ValidateBundleResult> {
  const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = opts.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxTotalBytes = opts.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;

  // 1. Structural: must be multi-file (>1). A single .html is out of scope ("use the existing HTML macro").
  if (files.length <= 1) {
    return fail('BUNDLE_NOT_MULTIFILE', 422, 'a mini-site bundle must contain more than one file');
  }

  // 2. Structural: a ROOT index.html entrypoint must exist (page/index.html does not count).
  if (!files.some((f) => f.path === ENTRYPOINT)) {
    return fail('MISSING_INDEX_HTML', 422, `bundle must contain a root "${ENTRYPOINT}" entrypoint`);
  }

  // 3. Per-path: relative-only (no absolute URL/leading slash, no ".." traversal).
  for (const f of files) {
    const bad = classifyPath(f.path);
    if (bad) return { ok: false, error: bad };
  }

  // 4. Caps (server-authoritative). Count first, then per-file, then total.
  if (files.length > maxFiles) {
    return fail('TOO_MANY_FILES', 422, `bundle has ${files.length} files; max is ${maxFiles}`);
  }
  let totalBytes = 0;
  for (const f of files) {
    if (f.bytes.byteLength > maxFileBytes) {
      return fail('BUNDLE_TOO_LARGE', 413, `file exceeds the per-file cap of ${maxFileBytes} bytes`, f.path);
    }
    totalBytes += f.bytes.byteLength;
  }
  if (totalBytes > maxTotalBytes) {
    return fail('BUNDLE_TOO_LARGE', 413, `bundle total ${totalBytes} bytes exceeds the cap of ${maxTotalBytes} bytes`);
  }

  // Valid: derive server-authoritative content types + content-addressed hash, produce the ValidatedBundle.
  const bundleFiles: BundleFile[] = files.map((f) => ({
    path: f.path,
    bytes: f.bytes,
    contentType: contentTypeFor(f.path),
  }));
  const contentHash = await contentHashOf(files);

  return {
    ok: true,
    bundle: { files: bundleFiles, entrypoint: ENTRYPOINT, contentHash, totalBytes },
  };
}
