/** Storybook (html-vite) for the Conf Mini-Sites "Bold Editorial" design system. Stories live next to the
 *  component render functions in ui-src/components. */
export default {
  stories: ['../ui-src/components/**/*.stories.js'],
  addons: ['@storybook/addon-essentials'],
  framework: { name: '@storybook/html-vite', options: {} },
  core: { disableTelemetry: true },
};
