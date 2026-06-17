import { bundleChips } from './bundleChips.js';

export default { title: 'Preview/BundleChips' };

export const Default = { render: () => bundleChips({ files: 5, size: '412 KB' }) };
