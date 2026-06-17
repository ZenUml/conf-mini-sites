// Inline macro launcher — compact. Shows a live preview if published, else an "Add mini-site" CTA. Both open
// the full Publisher in a Forge fullscreen modal; on modal close we re-check state so the inline view updates.
import { invoke, Modal } from '@forge/bridge';

const $ = (id) => document.getElementById(id);

async function refresh() {
  $('loading').hidden = false; $('empty').hidden = true; $('published').hidden = true;
  const res = await invoke('getServeUrl').catch(() => null);
  $('loading').hidden = true;
  if (res && res.ok && res.url) {
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
