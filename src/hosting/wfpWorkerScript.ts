// Generates the source of a per-instance user Worker (DESIGN §1.1): a single self-contained ES module that
// embeds a validated bundle's files (base64) and serves them by relative path. This is what
// CloudflareWfpClient.uploadWorker PUTs into the dispatch namespace — one Worker per macro instance.
//
// Why embed-and-serve rather than Workers Static Assets: a single-module upload is provisionable in ONE WfP
// REST call (no multi-step asset-upload session), which is what the runtime publish path needs. Bundle bytes
// count toward the Worker script-size limit, so this path is for small/typical mini-sites; large bundles use
// the R2 substrate via the HostingProvider seam (DESIGN §6.1). The served Worker matches InMemoryWfpClient's
// behaviour exactly (path → bytes + content-type, `/` → entrypoint, 404 otherwise) so the provider contract
// holds identically under the fake and live.

import type { ValidatedBundle } from './HostingProvider';

/** Base64-encode bytes without Buffer (works in Workers + Node). Chunked to avoid arg-count limits on btoa. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const norm = (p: string): string => p.replace(/^\/+/, '');

/** Build the ES-module source for the per-instance Worker that serves `bundle` by relative path. */
export function buildInstanceWorkerSource(bundle: ValidatedBundle): string {
  const files: Record<string, { ct: string; b64: string }> = {};
  for (const f of bundle.files) {
    files[norm(f.path)] = { ct: f.contentType, b64: bytesToBase64(f.bytes) };
  }
  const entrypoint = norm(bundle.entrypoint) || 'index.html';

  // JSON.stringify is safe to inline into a JS module: it escapes </script and control chars adequately for a
  // module body (this is not HTML context). The runtime decodes base64 per request via atob.
  return `// Auto-generated per-instance mini-site Worker. Do not edit.
const FILES = ${JSON.stringify(files)};
const ENTRY = ${JSON.stringify(entrypoint)};
function bytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export default {
  fetch(request) {
    const url = new URL(request.url);
    let p = decodeURIComponent(url.pathname).replace(/^\\/+/, '');
    if (p === '') p = ENTRY;
    const f = FILES[p];
    if (!f) return new Response('not found', { status: 404 });
    return new Response(bytes(f.b64), {
      status: 200,
      headers: { 'content-type': f.ct, 'x-content-type-options': 'nosniff' },
    });
  },
};
`;
}
