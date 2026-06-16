// CloudflareWfpClient — the LIVE WfpClient (Stage 2). The real cloud surface behind CloudflareWfPProvider:
// the WfP script-upload/delete API (manage a user Worker per macro instance) and dispatch-fetch via the
// dispatch namespace binding (env.MINISITES.get(workerName).fetch()). See DESIGN.md §1.1.
//
// Built when the cloud account exists. Until then every method throws so the wiring is unmistakable if it
// is reached in a non-live path; Stage 1 (CloudflareWfPProvider + InMemoryWfpClient) carries the contract.

import type { WfpClient } from './WfpClient';
import type { ValidatedBundle } from './HostingProvider';

/** Cloudflare bindings/credentials the live client needs (filled in Stage 2 with the real wrangler env). */
export interface CloudflareWfpEnv {
  // MINISITES: DispatchNamespace; // dispatch namespace binding (env.MINISITES.get(name).fetch())
  // WFP_API_TOKEN: string;        // Cloudflare WfP script-upload/delete API token
  // WFP_ACCOUNT_ID: string;       // Cloudflare account id for the script-upload/delete API
  [k: string]: unknown;
}

const NOT_YET = (m: string): never => {
  throw new Error(`CloudflareWfpClient.${m}: Stage 2 live wiring`);
};

export class CloudflareWfpClient implements WfpClient {
  // `_env` (dispatch namespace, WfP API token/account) is wired into a stored field in Stage 2.
  constructor(_env: CloudflareWfpEnv) {}

  async uploadWorker(_workerName: string, _bundle: ValidatedBundle): Promise<void> { NOT_YET('uploadWorker'); }
  async deleteWorker(_workerName: string): Promise<void> { NOT_YET('deleteWorker'); }
  async dispatchFetch(_workerName: string, _filePath: string): Promise<Response> { return NOT_YET('dispatchFetch'); }
}
