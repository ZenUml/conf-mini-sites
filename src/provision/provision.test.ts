// Tests for the §3.4 async provisioning: the ProvisioningJob store (idempotency, state) and the runProvision
// job body (success flips the instance active; any failure leaves it staging + job failed — I10).
import { describe, it, expect } from 'vitest';
import { InMemoryProvisioningJobStore } from './ProvisioningJob';
import type { NewJob } from './ProvisioningJob';
import { runProvision } from './provisionInstance';
import { InMemoryInstanceStore } from '../db/InMemoryInstanceStore';
import { CloudflareWfPProvider } from '../hosting/CloudflareWfPProvider';
import { InMemoryWfpClient } from '../hosting/InMemoryWfpClient';
import { bundleOf } from '../hosting/providerContract';
import type { HostingProvider, HostingCapabilities } from '../hosting/HostingProvider';
import type { InstanceKey } from '../db/InstanceStore';

const now = (): number => 1_700_000_000_000;
const newJob = (over: Partial<NewJob> = {}): NewJob => ({
  jobId: 'job-1', instanceId: 'inst-1', clientKey: 'ck-1', cloudId: 'cloud-1',
  version: 1, bundleHash: 'h1', idempotencyKey: 'idem-1', ...over,
});

describe('ProvisioningJob store', () => {
  it('create is idempotent on (cloudId, idempotencyKey, bundleHash) — same key+hash returns the same job', async () => {
    const s = new InMemoryProvisioningJobStore();
    const a = await s.create(newJob());
    const b = await s.create(newJob({ jobId: 'job-2' })); // same dedup key + hash, different proposed id
    expect(a.conflict).toBe(false);
    expect(b.conflict).toBe(false);
    expect(b.row.jobId).toBe('job-1'); // existing job, not the new id
  });

  it('same key + DIFFERENT bundleHash → conflict (caller maps to 409)', async () => {
    const s = new InMemoryProvisioningJobStore();
    await s.create(newJob());
    const c = await s.create(newJob({ jobId: 'job-2', bundleHash: 'h2' }));
    expect(c.conflict).toBe(true);
  });

  it('setState advances state/step and findStuck surfaces stale provisioning jobs', async () => {
    const s = new InMemoryProvisioningJobStore(() => '2026-06-16T00:00:00.000Z');
    await s.create(newJob());
    await s.setState('job-1', 'provisioning', 'upload_script');
    expect((await s.get('job-1'))?.state).toBe('provisioning');
    expect((await s.get('job-1'))?.attempts).toBe(1);
    expect(await s.findStuck('2026-06-16T00:01:00.000Z')).toHaveLength(1);
    expect(await s.findStuck('2026-06-15T00:00:00.000Z')).toHaveLength(0);
  });
});

describe('runProvision', () => {
  const key: InstanceKey = { clientKey: 'ck-1', cloudId: 'cloud-1', instanceId: 'inst-1' };
  const bundle = bundleOf('index.html', { 'index.html': '<h1>hi</h1>', 'app.js': 'console.log(1)' });

  async function seed() {
    const jobStore = new InMemoryProvisioningJobStore();
    await jobStore.create(newJob());
    const instanceStore = new InMemoryInstanceStore();
    await instanceStore.upsert({
      clientKey: 'ck-1', cloudId: 'cloud-1', instanceId: 'inst-1', workerName: 'ms-inst-1',
      contentId: 'page-1', macroLocalId: 'm1', bundleHash: 'h1', status: 'staging',
    });
    return { jobStore, instanceStore };
  }

  const caps: HostingCapabilities = { maxFileBytes: 1, maxFiles: 1, supportsServerSideServe: true };

  it('success: uploads, smoke-verifies, flips the instance active', async () => {
    const { jobStore, instanceStore } = await seed();
    const provider = new CloudflareWfPProvider(new InMemoryWfpClient());
    const result = await runProvision('job-1', key, bundle, 1, { jobStore, instanceStore, provider, now });
    expect(result).toBe('active');
    expect((await instanceStore.get(key))?.status).toBe('active');
    expect((await instanceStore.get(key))?.latestVersion).toBe(1);
    expect((await jobStore.get('job-1'))?.state).toBe('active');
  });

  it('smoke_verify failure leaves the instance staging and the job failed (no servable bytes)', async () => {
    const { jobStore, instanceStore } = await seed();
    const provider: HostingProvider = {
      permissionModel: 'app-enforced', capabilities: caps,
      createInstance: async () => {}, updateBundle: async () => {}, deleteInstance: async () => {},
      serve: async () => new Response('boom', { status: 500 }),
    };
    const result = await runProvision('job-1', key, bundle, 1, { jobStore, instanceStore, provider, now });
    expect(result).toBe('failed');
    expect((await instanceStore.get(key))?.status).toBe('staging');
    const job = await jobStore.get('job-1');
    expect(job?.state).toBe('failed');
    expect(job?.lastError).toContain('smoke_verify');
  });

  it('upload failure leaves the instance staging and the job failed', async () => {
    const { jobStore, instanceStore } = await seed();
    const provider: HostingProvider = {
      permissionModel: 'app-enforced', capabilities: caps,
      createInstance: async () => { throw new Error('upload boom'); },
      updateBundle: async () => {}, deleteInstance: async () => {},
      serve: async () => new Response(null, { status: 200 }),
    };
    const result = await runProvision('job-1', key, bundle, 1, { jobStore, instanceStore, provider, now });
    expect(result).toBe('failed');
    expect((await instanceStore.get(key))?.status).toBe('staging');
    expect((await jobStore.get('job-1'))?.lastError).toContain('upload boom');
  });
});
