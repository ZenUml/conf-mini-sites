import { segmentedSwitcher } from './switcher.js';

export default { title: 'Atoms/Switcher' };

export const UploadActive = { name: 'Upload active', render: () => `<div style="width:360px">${segmentedSwitcher({ on: 1 })}</div>` };
export const PreviewActive = { name: 'Preview active', render: () => `<div style="width:360px">${segmentedSwitcher({ on: 2 })}</div>` };
