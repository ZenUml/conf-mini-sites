import { R2HostingProvider } from './R2HostingProvider';
import { InMemoryBundleObjectStore } from './BundleObjectStore';
import { runHostingProviderContract } from './providerContract';

// R2HostingProvider must satisfy the full HostingProvider contract behind the BundleObjectStore seam. Running
// it against InMemoryBundleObjectStore proves the provider's logic (key scheme, clear-then-write idempotency,
// prefix isolation, 404s) with no cloud. The same contract runs against the live R2BundleObjectStore under a
// Miniflare/integration harness (DESIGN §6.1 substrate swap).
runHostingProviderContract(
  'R2HostingProvider + InMemoryBundleObjectStore',
  () => new R2HostingProvider(new InMemoryBundleObjectStore()),
);
