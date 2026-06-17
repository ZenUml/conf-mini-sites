import { toast } from './toast.js';

export default { title: 'Atoms/Toast' };

export const Default = { render: () => toast({ message: 'Copied' }) };
