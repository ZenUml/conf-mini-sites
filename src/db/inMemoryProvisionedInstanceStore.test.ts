import { describe, it, expect } from 'vitest';
import { InMemoryProvisionedInstanceStore } from './InMemoryProvisionedInstanceStore';

const ALL = '2999-01-01T00:00:00.000Z'; // cutoff matching every tombstone

describe('InMemoryProvisionedInstanceStore', () => {
  it('recordActive inserts a live row (no tombstone)', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('i1', 'cloud-1');
    expect(await store.listDeletable(ALL, 100)).toEqual([]); // nothing tombstoned → nothing deletable
  });

  it('markUninstalledByCloudId stamps only the matching site, only NULL rows, and returns the count', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('i1', 'cloud-1');
    await store.recordActive('i2', 'cloud-1');
    await store.recordActive('i3', 'cloud-2');

    expect(await store.markUninstalledByCloudId('cloud-1', '2026-06-17T00:00:00.000Z')).toBe(2);
    // a repeat must not re-stamp (clock not reset) and returns 0
    expect(await store.markUninstalledByCloudId('cloud-1', '2026-07-01T00:00:00.000Z')).toBe(0);

    const due = await store.listDeletable(ALL, 100);
    expect(due.map((r) => r.instanceId).sort()).toEqual(['i1', 'i2']); // cloud-2 untouched
    expect(due.every((r) => r.uninstalledAt === '2026-06-17T00:00:00.000Z')).toBe(true); // original timestamp kept
  });

  it('recordActive clears an existing tombstone (reinstall safety)', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('i1', 'cloud-1');
    await store.markUninstalledByCloudId('cloud-1', '2026-06-17T00:00:00.000Z');
    await store.recordActive('i1', 'cloud-1');
    expect(await store.listDeletable(ALL, 100)).toEqual([]);
  });

  it('listDeletable filters by cutoff, returns oldest tombstone first, and caps at the limit', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('iold', 'c-old');
    await store.recordActive('imid', 'c-mid');
    await store.recordActive('inew', 'c-new');
    await store.markUninstalledByCloudId('c-old', '2026-01-01T00:00:00.000Z');
    await store.markUninstalledByCloudId('c-mid', '2026-03-01T00:00:00.000Z');
    await store.markUninstalledByCloudId('c-new', '2026-06-01T00:00:00.000Z');

    // cutoff excludes c-new; oldest first
    expect((await store.listDeletable('2026-05-01T00:00:00.000Z', 100)).map((r) => r.instanceId)).toEqual(['iold', 'imid']);
    // cap to 2
    expect((await store.listDeletable(ALL, 2)).map((r) => r.instanceId)).toEqual(['iold', 'imid']);
  });

  it('delete is idempotent', async () => {
    const store = new InMemoryProvisionedInstanceStore();
    await store.recordActive('i1', 'c');
    await store.delete('i1');
    await store.delete('i1'); // no throw on a second delete
    expect(await store.listDeletable(ALL, 100)).toEqual([]);
  });
});
