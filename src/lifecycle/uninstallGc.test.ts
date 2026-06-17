import { describe, it, expect } from 'vitest';
import { InMemoryProvisionedInstanceStore } from '../db/InMemoryProvisionedInstanceStore';
import { runUninstallSweep, RETENTION_MS } from './uninstallGc';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-17T00:00:00.000Z');
const isoAgo = (days: number): string => new Date(NOW - days * DAY).toISOString();
const ALL = '2999-01-01T00:00:00.000Z'; // a cutoff that matches every tombstone

describe('runUninstallSweep', () => {
  it('deletes an instance uninstalled longer than the retention window', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('iaaa', 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', isoAgo(31));

    const deletedWorkers: string[] = [];
    const res = await runUninstallSweep({ store, deleteWorker: async (n) => { deletedWorkers.push(n); }, nowMs: NOW });

    expect(res.deleted).toEqual(['iaaa']);
    expect(res.failed).toEqual([]);
    expect(deletedWorkers).toEqual(['ms-iaaa']); // worker name is ms-<instanceId>
    expect(await store.listDeletable(ALL, 100)).toEqual([]); // row removed
  });

  it('retains an instance still within the retention window', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('ibbb', 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', isoAgo(29));

    const res = await runUninstallSweep({ store, deleteWorker: async () => { throw new Error('must not delete'); }, nowMs: NOW });
    expect(res.deleted).toEqual([]);
    expect(res.failed).toEqual([]);
  });

  it('never deletes an instance reactivated (tombstone cleared) after uninstall — reinstall safety', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('iccc', 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', isoAgo(40));
    await store.recordActive('iccc', 'cloud-1'); // reinstall + re-view clears the tombstone

    const res = await runUninstallSweep({ store, deleteWorker: async () => { throw new Error('must not delete'); }, nowMs: NOW });
    expect(res).toEqual({ deleted: [], failed: [] });
  });

  it('enforces the blast-radius cap and defers the rest to the next pass', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    for (const id of ['i1', 'i2', 'i3']) await store.recordActive(id, 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', isoAgo(35));

    const res = await runUninstallSweep({ store, deleteWorker: async () => {}, nowMs: NOW, maxDeletes: 2 });
    expect(res.deleted.length).toBe(2);
    expect((await store.listDeletable(ALL, 100)).length).toBe(1); // one remains for the next pass
  });

  it('leaves the row (for retry) when the Worker delete fails, and still deletes the others', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('iok', 'cloud-1');
    await store.recordActive('ibad', 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', isoAgo(31));

    const res = await runUninstallSweep({
      store,
      deleteWorker: async (name) => { if (name === 'ms-ibad') throw new Error('cf 500'); },
      nowMs: NOW,
    });

    expect(res.deleted).toEqual(['iok']);
    expect(res.failed).toEqual(['ibad']);
    expect((await store.listDeletable(ALL, 100)).map((r) => r.instanceId)).toEqual(['ibad']); // kept for retry
  });

  it('RETENTION_MS is 30 days', () => {
    expect(RETENTION_MS).toBe(30 * DAY);
  });
});
