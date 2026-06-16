import { FakeHostingProvider } from './FakeHostingProvider';
import { runHostingProviderContract } from './providerContract';

// The fake must satisfy the full HostingProvider contract. CloudflareWfPProvider runs the same contract
// against a Miniflare/integration harness in Stage 2.
runHostingProviderContract('FakeHostingProvider', () => new FakeHostingProvider());
