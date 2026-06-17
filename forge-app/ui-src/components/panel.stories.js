import { panel } from './panel.js';

export default { title: 'Panel/Panel' };

export const Default = {
  render: () =>
    panel({
      title: 'Add mini-site',
      subtitle: 'Upload a multi-file bundle',
      bodyHTML: '<div class="px-5 sm:px-7 py-10 text-meta text-ink-500">Panel body slot</div>',
    }),
};
