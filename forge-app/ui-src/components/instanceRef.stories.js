import { instanceRef, permissionLine } from './instanceRef.js';

export default { title: 'Preview/InstanceRef' };

export const Default = { render: () => `<div style="width:420px">${instanceRef({ ref: 'mini-site:rel-dashboard-7f3a' })}</div>` };
export const PermissionLine = { name: 'Permission line', render: () => `<div style="width:420px">${permissionLine()}</div>` };
