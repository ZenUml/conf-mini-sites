// CloudflareWfpClient — the LIVE, control-plane WfpClient (DESIGN §1.1). It manages a per-instance user Worker
// in the dispatch namespace via the Workers-for-Platforms REST API: upload (PUT) and delete (DELETE). This is
// the half CloudflareWfPProvider uses on the CONTROL Worker (provisioning from the publish flow).
//
// Serving is the OTHER half: the dispatch Worker reaches a per-instance Worker through the dispatch-namespace
// BINDING (env.MINISITES.get(name).fetch()), modelled by DispatchBindingWfpClient — not by a REST call. So
// dispatchFetch here throws: routing a viewer request through the REST control plane would be wrong (no
// binding, no isolation). Each Worker instantiates the provider with the half it needs.
//
// API shape (Cloudflare WfP):
//   PUT    /accounts/{acct}/workers/dispatch/namespaces/{ns}/scripts/{name}   multipart: metadata + module
//   DELETE /accounts/{acct}/workers/dispatch/namespaces/{ns}/scripts/{name}?force=true
// Auth: Bearer token with Workers Scripts:Edit. The per-instance Worker is a single ES module (buildInstance-
// WorkerSource) embedding the bundle — one upload call, no multi-step Static-Assets session.

import type { WfpClient } from './WfpClient';
import type { ValidatedBundle } from './HostingProvider';
import { buildInstanceWorkerSource } from './wfpWorkerScript';

/** Credentials + target for the WfP REST API. */
export interface CloudflareWfpEnv {
  /** Cloudflare account id that owns the dispatch namespace. */
  readonly accountId: string;
  /** Dispatch namespace name, e.g. "mini-sites-dev". */
  readonly namespace: string;
  /** Bearer token with Workers Scripts:Edit on the account. Never logged. */
  readonly apiToken: string;
  /** Worker compatibility date for the uploaded per-instance Worker. */
  readonly compatibilityDate?: string;
  /** Override the API base (tests). Defaults to the public Cloudflare API. */
  readonly apiBase?: string;
  /** Injected fetch (tests). Defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
}

const DEFAULT_API_BASE = 'https://api.cloudflare.com/client/v4';
const MODULE_NAME = 'worker.js';

export class CloudflareWfpClient implements WfpClient {
  private readonly base: string;
  private readonly doFetch: typeof fetch;

  constructor(private readonly env: CloudflareWfpEnv) {
    this.base = (env.apiBase ?? DEFAULT_API_BASE).replace(/\/+$/, '');
    this.doFetch = env.fetchImpl ?? fetch;
  }

  private scriptUrl(workerName: string): string {
    const { accountId, namespace } = this.env;
    return `${this.base}/accounts/${accountId}/workers/dispatch/namespaces/${namespace}/scripts/${encodeURIComponent(workerName)}`;
  }

  private authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${this.env.apiToken}` };
  }

  /** Upload (create or replace) the per-instance Worker `workerName` serving `bundle`. Last write wins. */
  async uploadWorker(workerName: string, bundle: ValidatedBundle): Promise<void> {
    const source = buildInstanceWorkerSource(bundle);
    const metadata = {
      main_module: MODULE_NAME,
      compatibility_date: this.env.compatibilityDate ?? '2026-06-16',
    };
    const form = new FormData();
    form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.set(
      MODULE_NAME,
      new Blob([source], { type: 'application/javascript+module' }),
      MODULE_NAME,
    );

    const res = await this.doFetch(this.scriptUrl(workerName), {
      method: 'PUT',
      headers: this.authHeaders(), // do NOT set content-type — fetch sets the multipart boundary
      body: form,
    });
    if (!res.ok) {
      throw new Error(`WfP uploadWorker(${workerName}) failed: ${res.status} ${await safeText(res)}`);
    }
  }

  /** Delete the per-instance Worker. Idempotent: a 404 (already gone) is success — orphan reconciliation
   *  calls this blindly (DESIGN §6.1 deleteInstance). */
  async deleteWorker(workerName: string): Promise<void> {
    const res = await this.doFetch(`${this.scriptUrl(workerName)}?force=true`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (res.ok || res.status === 404) return;
    throw new Error(`WfP deleteWorker(${workerName}) failed: ${res.status} ${await safeText(res)}`);
  }

  /** Not part of the control-plane role — viewer requests route through the dispatch-namespace binding
   *  (DispatchBindingWfpClient), never the REST API. */
  async dispatchFetch(_workerName: string, _filePath: string): Promise<Response> {
    throw new Error(
      'CloudflareWfpClient.dispatchFetch: serving routes through the dispatch namespace binding ' +
        '(DispatchBindingWfpClient), not the REST control client',
    );
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '<no body>';
  }
}
