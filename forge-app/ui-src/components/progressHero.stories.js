import { progressHero } from './progressHero.js';

export default { title: 'Upload/ProgressHero' };

export const Start = { render: () => progressHero({ pct: 0, narrator: 'Uploading files…' }) };
export const Mid = { render: () => progressHero({ pct: 33, narrator: 'Validating bundle structure…' }) };
export const Done = { name: 'Done', render: () => progressHero({ pct: 100, narrator: 'Published · ready to preview', done: true }) };
