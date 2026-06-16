// Contract every InstallStore implementation must satisfy. The in-memory store runs it now; the D1 store runs
// the same contract under Miniflare in the next step. The (clientKey, key) cases pin the 0008 correction at the
// store layer (BACKEND_DESIGN §1.2 / §2.4 step 2): secret selection MUST be composite, never clientKey alone.
import { describe, it, expect } from 'vitest';
import type { InstallStore, NewInstall } from './ClientInstallation';

const liteInstall: NewInstall = {
  clientKey: 'ck-A', key: 'app-lite', cloudId: 'cloud-A',
  baseUrl: 'https://acme.atlassian.net',
  sharedSecretEnc: 'ZW5jLWxpdGU=', sharedSecretKeyId: 'kid-1',
};

// Same clientKey, DIFFERENT variant key → DIFFERENT secret. This is the 0008-correction case.
const fullInstall: NewInstall = {
  clientKey: 'ck-A', key: 'app-full', cloudId: 'cloud-A',
  baseUrl: 'https://acme.atlassian.net',
  sharedSecretEnc: 'ZW5jLWZ1bGw=', sharedSecretKeyId: 'kid-1',
};

export function runInstallStoreContract(label: string, make: () => InstallStore): void {
  describe(`InstallStore contract — ${label}`, () => {
    it('upserts then resolves the secret by the full (clientKey, key) composite', async () => {
      const s = make();
      await s.upsert(liteInstall);
      const rec = await s.getSecretRecord('ck-A', 'app-lite');
      expect(rec).toEqual({
        sharedSecretEnc: 'ZW5jLWxpdGU=',
        sharedSecretKeyId: 'kid-1',
        cloudId: 'cloud-A',
        baseUrl: 'https://acme.atlassian.net',
      });
    });

    it('COMPOSITE KEY (0008): same clientKey, different variant key → DIFFERENT secret; never clientKey alone', async () => {
      const s = make();
      await s.upsert(liteInstall);
      await s.upsert(fullInstall);
      expect((await s.getSecretRecord('ck-A', 'app-lite'))?.sharedSecretEnc).toBe('ZW5jLWxpdGU=');
      expect((await s.getSecretRecord('ck-A', 'app-full'))?.sharedSecretEnc).toBe('ZW5jLWZ1bGw=');
    });

    it('returns null for an unknown (clientKey, key) pair', async () => {
      const s = make();
      await s.upsert(liteInstall);
      expect(await s.getSecretRecord('ck-A', 'app-missing')).toBeNull();
      expect(await s.getSecretRecord('ck-X', 'app-lite')).toBeNull();
    });

    it('stores and returns the encrypted blob VERBATIM — never inspects or transforms it', async () => {
      const s = make();
      const opaque = 'AAAA++//==base64-envelope-with-iv-and-tag==';
      await s.upsert({ ...liteInstall, sharedSecretEnc: opaque, sharedSecretKeyId: 'kid-9' });
      const rec = await s.getSecretRecord('ck-A', 'app-lite');
      expect(rec?.sharedSecretEnc).toBe(opaque);
      expect(rec?.sharedSecretKeyId).toBe('kid-9');
    });

    it('upsert is idempotent — reinstall overwrites the secret in place, never duplicates', async () => {
      const s = make();
      const first = await s.upsert(liteInstall);
      const second = await s.upsert({ ...liteInstall, sharedSecretEnc: 'cm90YXRlZA==', sharedSecretKeyId: 'kid-2' });
      expect(second.id).toBe(first.id);             // same row
      expect(second.installedAt).toBe(first.installedAt);
      expect(second.sharedSecretEnc).toBe('cm90YXRlZA=='); // rotated secret took effect
      expect((await s.getSecretRecord('ck-A', 'app-lite'))?.sharedSecretKeyId).toBe('kid-2');
    });

    it('markUninstalled flips ALL variant rows for the clientKey; secret reads then return null', async () => {
      const s = make();
      await s.upsert(liteInstall);
      await s.upsert(fullInstall);
      await s.markUninstalled('ck-A');
      expect(await s.getSecretRecord('ck-A', 'app-lite')).toBeNull();
      expect(await s.getSecretRecord('ck-A', 'app-full')).toBeNull();
    });

    it('markUninstalled is idempotent and scoped — only the named clientKey is affected', async () => {
      const s = make();
      await s.upsert(liteInstall);
      await s.upsert({ ...liteInstall, clientKey: 'ck-B', key: 'app-lite', sharedSecretEnc: 'b3RoZXI=' });
      await s.markUninstalled('ck-A');
      await s.markUninstalled('ck-A'); // must not throw
      expect(await s.getSecretRecord('ck-A', 'app-lite')).toBeNull();
      expect((await s.getSecretRecord('ck-B', 'app-lite'))?.sharedSecretEnc).toBe('b3RoZXI='); // untouched
    });

    it('reinstall after uninstall re-activates the row and restores secret resolution', async () => {
      const s = make();
      await s.upsert(liteInstall);
      await s.markUninstalled('ck-A');
      expect(await s.getSecretRecord('ck-A', 'app-lite')).toBeNull();
      await s.upsert({ ...liteInstall, sharedSecretEnc: 'cmVpbnN0YWxs' });
      const rec = await s.getSecretRecord('ck-A', 'app-lite');
      expect(rec?.sharedSecretEnc).toBe('cmVpbnN0YWxs');
    });
  });
}
