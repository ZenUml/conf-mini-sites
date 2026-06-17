/** Global preview config — loads the compiled design CSS (Tailwind + self-hosted fonts + the design's custom
 *  keyframes/helpers), so stories render in the real "Bold Editorial" language. Rebuild it with `pnpm build:ui`
 *  whenever components change (Tailwind purges to the classes it scans under ui-src). */
import '../static/publisher/assets/app.css';

export default {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#E9EBEE' },
        { name: 'card', value: '#FFFFFF' },
        { name: 'page', value: '#F7F8F9' },
      ],
    },
    options: {
      storySort: { order: ['Foundations', 'Atoms', 'Panel', 'Upload', 'Preview', 'Launcher'] },
    },
  },
};
