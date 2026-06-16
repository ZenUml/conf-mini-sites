import { InMemoryInstanceStore } from './InMemoryInstanceStore';
import { runInstanceStoreContract } from './instanceStore.contract';

runInstanceStoreContract('InMemoryInstanceStore', () => new InMemoryInstanceStore());
