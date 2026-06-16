// HostingProvider — the seam between the app (macro, upload pipeline, auth gateway, lifecycle) and the
// substrate that actually stores + serves a mini-site bundle. See DESIGN.md §6.1.
//
// Decision (CONTEXT.md, 2026-06-16): we ship on Cloudflare WfP and target the residency-agnostic segment.
// The Forge pivot is shelved, so this seam is kept THIN — for testability (a fake) and a clean boundary —
// not as a dual-substrate abstraction. CloudflareWfPProvider is the only real implementation.

/** One file of a validated multi-file bundle (relative path + bytes). */
export interface BundleFile {
  readonly path: string; // relative, e.g. "index.html", "assets/app.js"
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

/** A parsed, validated multi-file bundle. Produced ABOVE the seam by the upload pipeline
 *  (validation, secret-scan, CSP posture). The provider only persists/serves it — never re-validates. */
export interface ValidatedBundle {
  readonly files: ReadonlyArray<BundleFile>;
  readonly entrypoint: string; // usually "index.html"
  readonly contentHash: string;
  readonly totalBytes: number;
}

/** Opaque handle for one macro instance's host. `id` = instanceId; `providerRef` is provider-internal
 *  (a WfP script name) and is never inspected by callers above the seam. */
export interface InstanceHandle {
  readonly id: string;
  readonly providerRef: string;
}

/** The viewer-authorization decision, made ABOVE the seam by the auth gateway (JWT verify + Confluence
 *  permission/check). The provider trusts it and only enforces that no path reaches serve() without it. */
export interface ServeAuthContext {
  readonly cloudId: string;
  readonly contentId: string;
  readonly accountId: string;
  readonly grantedAt: number; // epoch ms — for cache-staleness reasoning above the seam
}

/** Provider capability envelope — upper layers gate UX on this, never on a hardcoded provider name. */
export interface HostingCapabilities {
  readonly maxFileBytes: number;
  readonly maxFiles: number;
  readonly supportsServerSideServe: boolean; // WfP: true. (Forge would be false — reassembly.)
}

export interface HostingProvider {
  /** Create the per-instance host. Idempotent on handle.id. */
  createInstance(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void>;

  /** Replace the bundle for an existing instance. Atomic from a viewer's POV. */
  updateBundle(handle: InstanceHandle, bundle: ValidatedBundle): Promise<void>;

  /** Tear down the per-instance host. Idempotent: deleting an already-gone instance MUST succeed
   *  (orphan reconciliation calls this blindly). */
  deleteInstance(handle: InstanceHandle): Promise<void>;

  /** Serve a single file of an instance to an ALREADY-AUTHORIZED viewer. The provider MUST refuse if auth
   *  is absent; it MUST NOT make its own permission decision — that lives above the seam (DESIGN §2). */
  serve(handle: InstanceHandle, filePath: string, auth: ServeAuthContext): Promise<Response>;

  /** 'app-enforced' (Cloudflare): the gateway calls Confluence permission/check on every request. */
  readonly permissionModel: 'app-enforced' | 'inherited';

  readonly capabilities: HostingCapabilities;
}
