import { checklistRow } from './checklistRow.js';

export default { title: 'Upload/ChecklistRow' };

export const Pending = {
  render: () => checklistRow({ label: 'index.html found at root', note: 'entry point detected', state: 'pending' }),
};

export const Passed = {
  render: () => checklistRow({ label: 'All paths relative · no absolute URLs', note: '5 / 5 references resolved', state: 'passed' }),
};

export const ShieldScanning = {
  name: 'Shield (scanning)',
  render: () => checklistRow({ label: 'Scanning for leaked secrets', note: 'shield · AWS, GCP, tokens, keys', state: 'pending', shield: true }),
};

export const ShieldClean = {
  name: 'Shield (clean)',
  render: () => checklistRow({ label: 'Scanning for leaked secrets', note: 'shield · AWS, GCP, tokens, keys', state: 'passed', shield: true }),
};

export const SecretStop = {
  name: 'Shield (secret stop)',
  render: () => checklistRow({ label: 'Secret detected in source', note: 'config.js:14 · AWS access key', state: 'stop', shield: true }),
};
