import { previewChrome } from './previewChrome.js';

export default { title: 'Preview/PreviewChrome' };

// Placeholder body — the real body is a cross-origin iframe; here a gradient div stands in for the rendered mini-site.
const placeholderBody =
  '<div style="height:240px;display:grid;place-items:center;background:linear-gradient(135deg,#E9F2FE 0%,#DCFFF1 100%)">' +
  '<span class="font-mono text-micro text-ink-600">rendered mini-site</span>' +
  '</div>';

export const Default = {
  render: () => previewChrome({ url: 'mini-site:rel-dashboard-7f3a · live preview', bodyHTML: placeholderBody }),
};
