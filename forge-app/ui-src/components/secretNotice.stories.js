import { secretNotice } from './secretNotice.js';

export default { title: 'Upload/SecretNotice' };

export const Default = {
  render: () =>
    `<div style="max-width:420px">${secretNotice({
      message: 'config.js:14 · AWS access key (AKIA…7H2Q) found in source. Nothing was published.',
    })}</div>`,
};
