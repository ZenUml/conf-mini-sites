// Contract every InstanceStore implementation must satisfy. The in-memory store runs it now; the D1 store
// runs the same contract under Miniflare in the next step. The cross-tenant cases pin INV-GW-06 at the
// store layer (DESIGN §2.5 / §5.2 I8).
import { describe, it, expect } from 'vitest';
import type { InstanceStore, NewInstance } from './InstanceStore';

const base: NewInstance = {
  clientKey: 'ck-A', cloudId: 'cloud-A', instanceId: 'inst-1',
  workerName: 'ms-inst-1', contentId: 'page-1', macroLocalId: 'local-1', bundleHash: 'h0',
};

export function runInstanceStoreContract(label: string, make: () => InstanceStore): void {
  describe(`InstanceStore contract — ${label}`, () => {
    it('upserts then reads back by the full composite key', async () => {
      const s = make();
      await s.upsert(base);
      const row = await s.get({ clientKey: 'ck-A', cloudId: 'cloud-A', instanceId: 'inst-1' });
      expect(row?.workerName).toBe('ms-inst-1');
      expect(row?.status).toBe('staging');
    });

    it('TENANT ISOLATION (INV-GW-06): same instanceId under a different cloudId/clientKey is not found', async () => {
      const s = make();
      await s.upsert(base);
      expect(await s.get({ clientKey: 'ck-A', cloudId: 'cloud-B', instanceId: 'inst-1' })).toBeNull();
      expect(await s.get({ clientKey: 'ck-B', cloudId: 'cloud-A', instanceId: 'inst-1' })).toBeNull();
    });

    it('upsert is idempotent — second call updates in place, never duplicates', async () => {
      const s = make();
      const first = await s.upsert(base);
      const second = await s.upsert({ ...base, bundleHash: 'h1' });
      expect(second.createdAt).toBe(first.createdAt); // same row
      expect(second.bundleHash).toBe('h1');           // mutable field updated
    });

    it('setLiveBundle promotes to active with the new hash + version', async () => {
      const s = make();
      await s.upsert(base);
      await s.setLiveBundle(base, 'h2', 3);
      const row = await s.get(base);
      expect(row?.status).toBe('active');
      expect(row?.bundleHash).toBe('h2');
      expect(row?.latestVersion).toBe(3);
    });

    it('delete is idempotent and removes the row', async () => {
      const s = make();
      await s.upsert(base);
      await s.delete(base);
      await s.delete(base); // must not throw
      expect(await s.get(base)).toBeNull();
    });

    it('touchLastSeen records the view timestamp', async () => {
      const s = make();
      await s.upsert(base);
      await s.touchLastSeen(base, '2026-06-16T00:00:00.000Z');
      expect((await s.get(base))?.lastSeenAt).toBe('2026-06-16T00:00:00.000Z');
    });
  });
}
