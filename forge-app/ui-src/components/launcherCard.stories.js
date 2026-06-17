import { launcherEmpty, launcherPublished } from './launcherCard.js';

export default { title: 'Launcher/LauncherCard' };

export const Empty = { render: () => launcherEmpty() };

// In the app the preview slot is an iframe (h-[360px] bg-white) rendering the bundle; Storybook has no real
// bundle, so the slot is filled with a faithful stand-in at the same height to show the chrome over content.
export const Published = {
  render: () =>
    launcherPublished({
      ref: 'mini-site:rel-dashboard-7f3a',
      bodyHTML:
        '<div class="h-[360px] bg-white grid place-items-center text-meta text-ink-500">Live preview</div>',
    }),
};
