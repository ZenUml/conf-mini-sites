import { CloudflareWfPProvider } from './CloudflareWfPProvider';
import { InMemoryWfpClient } from './InMemoryWfpClient';
import { runHostingProviderContract } from './providerContract';

// CloudflareWfPProvider must satisfy the full HostingProvider contract behind the WfpClient seam. Running it
// against InMemoryWfpClient proves the provider's logic (worker naming, idempotency, dispatch) with no cloud.
// The same contract runs against the live CloudflareWfpClient under a Miniflare/integration harness in Stage 2.
runHostingProviderContract(
  'CloudflareWfPProvider + InMemoryWfpClient',
  () => new CloudflareWfPProvider(new InMemoryWfpClient()),
);
