import { primaryButton, secondaryButton } from './button.js';

export default { title: 'Atoms/Button' };

export const Primary = { render: () => primaryButton({ label: 'Validate & publish', icon: 'arrow' }) };
export const PrimaryFull = { name: 'Primary (full width)', render: () => `<div style="width:420px">${primaryButton({ label: 'Done', icon: 'check', full: true })}</div>` };
export const PrimaryAdd = { name: 'Primary (add)', render: () => primaryButton({ label: 'Add mini-site', icon: 'plus' }) };
export const Secondary = { render: () => secondaryButton({ label: 'Open fullscreen' }) };
