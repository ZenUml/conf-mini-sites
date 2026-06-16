// R2BundleObjectStore — the LIVE BundleObjectStore: a Cloudflare R2Bucket binding behind R2HostingProvider.
// R2 is the deployable substrate (Workers for Platforms is NOT entitled on the account); the bundle bytes
// are served back through the single gateway Worker, so the gateway stays the sole entry point and the
// server-side behavior is byte-equivalent to the WfP path (DESIGN §6.1 substrate swap).
//
// No unit test here — exercising R2 needs Miniflare. It just must typecheck against R2Bucket; the
// HostingProvider contract is carried at Stage 1 by R2HostingProvider + InMemoryBundleObjectStore.

import type { BundleObjectStore } from './BundleObjectStore';

export class R2BundleObjectStore implements BundleObjectStore {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.bucket.put(key, bytes, { httpMetadata: { contentType } });
  }

  async get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    const bytes = new Uint8Array(await obj.arrayBuffer());
    const contentType = obj.httpMetadata?.contentType ?? 'application/octet-stream';
    return { bytes, contentType };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key); // idempotent: R2 delete of an absent key succeeds
  }

  async deletePrefix(prefix: string): Promise<void> {
    // R2 lists ≤1000 keys per page; page through `truncated`/`cursor` so prefixes larger than one page
    // are fully cleared. Each page's keys are deleted in one batch call.
    let cursor: string | undefined;
    do {
      const listed = await this.bucket.list({ prefix, cursor });
      const keys = listed.objects.map((o) => o.key);
      if (keys.length > 0) await this.bucket.delete(keys);
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }
}
