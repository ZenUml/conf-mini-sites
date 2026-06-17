import { manifestRow } from './manifestRow.js';

// Wrap in a <ul> at a realistic panel width so the .path-mid middle-ellipsis behaves like the design.
const frame = (row) => `<ul style="width:420px;list-style:none;margin:0;padding:0">${row}</ul>`;

export default { title: 'Upload/ManifestRow' };

export const Pending = { render: () => frame(manifestRow({ path: 'app.js', size: '38.1 KB', kind: 'js', status: 'pending' })) };
export const Uploaded = { render: () => frame(manifestRow({ path: 'index.html', size: '6.4 KB', kind: 'html', status: 'uploaded' })) };
export const Halted = { render: () => frame(manifestRow({ path: 'assets/chart.svg', size: '21.9 KB', kind: 'svg', status: 'halted' })) };
