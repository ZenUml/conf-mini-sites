// CloudflareWfPProvider — the real substrate (Stage 2). Implements HostingProvider against Workers for
// Platforms: each macro instance is a user Worker (ms-<instanceId>) in a dispatch namespace, serving its
// bundle via Workers Static Assets; the dispatch Worker (auth gateway, Stage 3) is the only way to reach it.
// See DESIGN.md §1 (hosting) and BACKEND_DESIGN.md (topology + provider wiring).
//
// Stage 1 ships the typed skeleton so upper layers compile against the seam; the WfP API calls land in Stage 2.
import type {
  HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext, HostingCapabilities,
} from './HostingProvider';

/** Bindings the dispatch Worker needs (filled in Stage 2 with the real wrangler env). */
export interface WfPEnv {
  // MINISITES: DispatchNamespace;   // dispatch namespace binding (env.MINISITES.get(name).fetch())
  // DB: D1Database;                 // MiniSiteInstance mapping
  // WFP_API_TOKEN: string;          // Cloudflare WfP script-upload/delete
  [k: string]: unknown;
}

const NOT_YET = (m: string): never => {
  throw new Error(`CloudflareWfPProvider.${m}: not implemented (Stage 2 — WfP script-upload/dispatch)`);
};

export class CloudflareWfPProvider implements HostingProvider {
  readonly permissionModel = 'app-enforced' as const;
  readonly capabilities: HostingCapabilities = { maxFileBytes: 25 * 1024 * 1024, maxFiles: 2000, supportsServerSideServe: true };

  // `_env` (dispatch namespace, D1, WfP API token) is wired into a stored field in Stage 2.
  constructor(_env: WfPEnv) {}

  async createInstance(_handle: InstanceHandle, _bundle: ValidatedBundle): Promise<void> { NOT_YET('createInstance'); }
  async updateBundle(_handle: InstanceHandle, _bundle: ValidatedBundle): Promise<void> { NOT_YET('updateBundle'); }
  async deleteInstance(_handle: InstanceHandle): Promise<void> { NOT_YET('deleteInstance'); }
  async serve(_handle: InstanceHandle, _filePath: string, _auth: ServeAuthContext): Promise<Response> { return NOT_YET('serve'); }
}
