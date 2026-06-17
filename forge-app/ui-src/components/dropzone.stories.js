import { dropzone } from './dropzone.js';

export default { title: 'Upload/Dropzone' };

export const Default = { render: () => `<div style="width:520px">${dropzone()}</div>` };
