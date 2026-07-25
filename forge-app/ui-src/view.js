// Inline macro launcher — compact. Shows a live preview if published, else an "Add mini-site" CTA. Both open
// the full Publisher in a Forge fullscreen modal; on modal close we re-check state so the inline view updates.
import { invoke, Modal } from '@forge/bridge';

const $ = (id) => document.getElementById(id);

// Fire-and-forget: never await/block the render on analytics (mirrors conf-app's trackAnalyticsEvent,
// which likewise doesn't await from its call sites). The resolver's trackEvent forwards to Mixpanel —
// see forge-app/src/analytics.js + src/analytics/miniSiteEvents.ts for the full catalog/privacy rules.
function track(name, properties) {
  invoke('trackEvent', { name, properties }).catch(() => {});
}

async function refresh() {
  $('loading').hidden = false; $('empty').hidden = true; $('published').hidden = true;
  const res = await invoke('getServeUrl').catch(() => null);
  $('loading').hidden = true;
  const hasPublishedSite = !!(res && res.ok && res.url);
  // mini_site_macro_viewed — one per macro render (this refresh() runs on initial mount and again after
  // the Publisher modal closes), the closest analog of conf-app's macro_viewed.
  track(
    'mini_site_macro_viewed',
    hasPublishedSite ? { has_published_site: true, license_active: !!res.licenseActive } : { has_published_site: false },
  );
  if (hasPublishedSite) {
    $('v-frame').src = res.url;
    $('v-ref').textContent = 'mini-site:' + (res.instanceId || '');
    $('published').hidden = false;
  } else {
    $('empty').hidden = false;
  }
}

function openPublisher() {
  const dbg = $('dbg');
  if (dbg) dbg.textContent = 'opening Publisher…';
  try {
    const modal = new Modal({ resource: 'publisher', size: 'max', onClose: () => refresh() });
    Promise.resolve(modal.open()).then(
      () => { if (dbg) dbg.textContent = ''; },
      (e) => { if (dbg) dbg.textContent = 'open() rejected: ' + ((e && e.message) || e); },
    );
  } catch (e) {
    if (dbg) dbg.textContent = 'Modal error: ' + ((e && e.message) || e);
  }
}

$('btn-add').addEventListener('click', openPublisher);
$('btn-edit').addEventListener('click', openPublisher);

refresh();
