import { it } from 'vitest';
import assert from 'node:assert/strict';
import { renderPublishWarning } from './publishWarning.js';
it('publish warning stays nonblocking and never renders matched values', () => {
  const notice = { hidden: true, textContent: '' };
  const status = { textContent: 'Scan passed' };
  renderPublishWarning([{ kind: 'high-entropy', value: '<script>sensitive</script>' }], notice, { querySelectorAll: () => [status] });
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /^Published with a warning:/);
  assert.equal(notice.textContent.includes('sensitive'), false);
  assert.equal(status.textContent, 'Review warning');
  renderPublishWarning([], notice, null);
  assert.equal(notice.hidden, true);
  assert.equal(notice.textContent, '');
});
