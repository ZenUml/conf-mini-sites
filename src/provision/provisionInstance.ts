// runProvision — the body of the §3.4 ProvisionInstance async job (one durable run). Steps: upload the user
// Worker → smoke-verify it's reachable via dispatch → ATOMIC flip the instance to 'active'. The instance stays
// 'staging'/un-servable until the flip; any failure leaves it un-servable and the job 'failed' (I10 — no
// half-state serves). Per-step retries/backoff + durability are the Cloudflare Workflows runtime's job; this
// is the deterministic, fail-closed step body, unit-testable with fakes.
import type { ProvisioningJobStore } from './ProvisioningJob';
import type { InstanceStore, InstanceKey } from '../db/InstanceStore';
import type { HostingProvider, InstanceHandle, ValidatedBundle, ServeAuthContext } from '../hosting/HostingProvider';

export interface ProvisionDeps {
  readonly jobStore: ProvisioningJobStore;
  readonly instanceStore: InstanceStore;
  readonly provider: HostingProvider;
  readonly now: () => number;
}

export async function runProvision(
  jobId: string,
  key: InstanceKey,
  bundle: ValidatedBundle,
  version: number,
  deps: ProvisionDeps,
): Promise<'active' | 'failed'> {
  const handle: InstanceHandle = { id: key.instanceId, providerRef: `ms-${key.instanceId}` };
  try {
    // upload_script (+ assets): create/replace the user Worker via the provider/WfP.
    await deps.jobStore.setState(jobId, 'provisioning', 'upload_script');
    await deps.provider.createInstance(handle, bundle);

    // smoke_verify: the entrypoint must be reachable via dispatch before we flip it live.
    await deps.jobStore.setState(jobId, 'provisioning', 'smoke_verify');
    const probe = await deps.provider.serve(handle, bundle.entrypoint, smokeAuth(key, deps.now()));
    if (probe.status !== 200) throw new Error(`smoke_verify failed: status ${probe.status}`);

    // flip_active: the ATOMIC flip — the instance becomes servable ONLY here (I10).
    await deps.jobStore.setState(jobId, 'provisioning', 'flip_active');
    await deps.instanceStore.setLiveBundle(key, bundle.contentHash, version);
    await deps.jobStore.setState(jobId, 'active', 'flip_active');
    return 'active';
  } catch (err) {
    // Fail-closed: instance stays 'staging' (un-servable), job 'failed', error recorded (no servable bytes).
    await deps.jobStore.setState(jobId, 'failed', null, err instanceof Error ? err.message : String(err));
    return 'failed';
  }
}

/** The smoke check is an internal, already-authorized provisioning step — not a viewer request. */
function smokeAuth(key: InstanceKey, nowMs: number): ServeAuthContext {
  return { cloudId: key.cloudId, contentId: 'provision-smoke', accountId: 'provisioner', grantedAt: nowMs };
}
