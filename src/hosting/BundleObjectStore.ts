// BundleObjectStore — the ONE cloud surface behind R2HostingProvider (DESIGN §6.1 substrate swap). It is a
// flat key→{bytes,contentType} blob store with prefix-delete: exactly the subset of an object store the
// provider needs to persist and serve a mini-site bundle. R2BundleObjectStore implements it against a real
// Cloudflare R2Bucket; InMemoryBundleObjectStore (below) is a Map-backed fake so R2HostingProvider can run
// the full HostingProvider contract with no cloud account (mirrors the InMemoryWfpClient seam pattern).

export interface BundleObjectStore {
  /** Store bytes at `key`, last-write-wins. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Fetch the object at `key`, or null if absent. */
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** Remove the object at `key`. Idempotent: deleting an absent key succeeds. */
  delete(key: string): Promise<void>;
  /** Remove every object whose key starts with `prefix`. Idempotent. */
  deletePrefix(prefix: string): Promise<void>;
}

/** Map-backed fake for tests. Stores a defensive copy of the bytes so a caller mutating its buffer after
 *  put() cannot retroactively change stored content — same isolation a real object store gives. */
export class InMemoryBundleObjectStore implements BundleObjectStore {
  private objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    this.objects.set(key, { bytes: bytes.slice(), contentType });
  }

  async get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return { bytes: obj.bytes.slice(), contentType: obj.contentType };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key); // idempotent: no-op if absent
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of [...this.objects.keys()]) {
      if (key.startsWith(prefix)) this.objects.delete(key);
    }
  }
}
