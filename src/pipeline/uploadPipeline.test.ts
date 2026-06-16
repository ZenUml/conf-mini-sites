// Tests for the publish orchestrator (DESIGN §3.3): validate → secret-scan → stage → enqueue → 202 {jobId}.
import { describe, it, expect } from 'vitest';
import { publish } from './uploadPipeline';
import type { PublishContext, PublishDeps } from './uploadPipeline';
import type { RawBundleFile } from './bundleValidation';
import { InMemoryInstanceStore } from '../db/InMemoryInstanceStore';
import { InMemoryProvisioningJobStore } from '../provision/ProvisioningJob';

const te = new TextEncoder();
const f = (path: string, body: string): RawBundleFile => ({ path, bytes: te.encode(body) });
const goodFiles = (): RawBundleFile[] => [f('index.html', '<!doctype html><h1>hi</h1>'), f('app.js', 'console.log(1)')];

const ctx = (over: Partial<PublishContext> = {}): PublishContext => ({
  clientKey: 'ck-1', cloudId: 'cloud-1', instanceId: 'inst-1', contentId: 'page-1',
  macroLocalId: 'm1', idempotencyKey: 'idem-1', ...over,
});

function makeDeps(): PublishDeps {
  let n = 0;
  return { instanceStore: new InMemoryInstanceStore(), jobStore: new InMemoryProvisioningJobStore(), genJobId: () => `job-${++n}` };
}

describe('uploadPipeline.publish', () => {
  it('valid bundle → 202 {jobId}; instance staged (un-servable), job queued', async () => {
    const deps = makeDeps();
    const res = await publish(goodFiles(), ctx(), deps);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.jobId).toBe('job-1');
    expect(res.statusUrl).toBe('/api/jobs/job-1');
    expect((await deps.instanceStore.get({ clientKey: 'ck-1', cloudId: 'cloud-1', instanceId: 'inst-1' }))?.status).toBe('staging');
    expect((await deps.jobStore.get('job-1'))?.state).toBe('queued');
  });

  it('single-file upload → BUNDLE_NOT_MULTIFILE, nothing staged or enqueued', async () => {
    const deps = makeDeps();
    const res = await publish([f('index.html', '<h1>x</h1>')], ctx(), deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('BUNDLE_NOT_MULTIFILE');
    expect(await deps.jobStore.get('job-1')).toBeNull();
  });

  it('secret in the bundle → SECRET_DETECTED, hard fail before staging/enqueue', async () => {
    const deps = makeDeps();
    const files = [f('index.html', '<h1>x</h1>'), f('app.js', 'const k = "AKIAIOSFODNN7EXAMPLE";')];
    const res = await publish(files, ctx(), deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('SECRET_DETECTED');
    expect(await deps.jobStore.get('job-1')).toBeNull();
  });

  it('idempotent: same Idempotency-Key + same bundle → same jobId', async () => {
    const deps = makeDeps();
    const a = await publish(goodFiles(), ctx(), deps);
    const b = await publish(goodFiles(), ctx(), deps);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.jobId).toBe(a.jobId); // resumes the same job, no duplicate
  });

  it('same Idempotency-Key + DIFFERENT bundle → IDEMPOTENCY_CONFLICT (409)', async () => {
    const deps = makeDeps();
    await publish(goodFiles(), ctx(), deps);
    const res = await publish([f('index.html', '<h1>changed</h1>'), f('app.js', 'console.log(2)')], ctx(), deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(res.status).toBe(409);
  });
});
