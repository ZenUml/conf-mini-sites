import { InMemoryInstallStore } from './InMemoryInstallStore';
import { runInstallStoreContract } from './installStore.contract';

runInstallStoreContract('InMemoryInstallStore', () => new InMemoryInstallStore());
