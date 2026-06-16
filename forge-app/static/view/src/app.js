// Conf Mini-Sites — Custom UI (CONTEXT.md 2026-06-17). Runs in the Forge macro iframe. Two states:
//   • published   → ask the resolver for a grant-signed serve URL and embed the mini-site in a nested iframe
//                    (the bytes come from the dispatch Worker; this UI never reassembles the bundle).
//   • not published → show an upload panel (pick a folder of files → base64 → resolver `publish`).
// Upload is shown to editors; after publish it re-fetches the serve URL and renders the preview.
import { invoke } from '@forge/bridge';

const root = document.getElementById('root');

function chunkedBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

// Strip the top-level folder a directory-picker prepends so paths are bundle-root-relative (index.html at root).
function relPath(file) {
  const p = file.webkitRelativePath || file.name;
  const slash = p.indexOf('/');
  return slash >= 0 ? p.slice(slash + 1) : p;
}

async function readFiles(fileList) {
  const out = [];
  for (const file of fileList) {
    const buf = new Uint8Array(await file.arrayBuffer());
    out.push({ path: relPath(file), b64: chunkedBase64(buf) });
  }
  return out;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

function renderPreview(url) {
  // Forge auto-resizes the macro iframe to the Custom UI content height. Give the document a determinate height
  // (set on html/body/#root) so the macro reserves the full preview, not the ~150px initial-state height.
  const H = 600;
  document.documentElement.style.height = `${H + 8}px`;
  document.body.style.height = `${H + 8}px`;
  root.style.height = `${H}px`;
  root.replaceChildren(
    el('iframe', {
      src: url,
      style: `width:100%;height:${H}px;border:0;border-radius:6px;display:block;`,
      sandbox: 'allow-scripts allow-forms allow-popups allow-same-origin',
      title: 'Mini-Site',
    }),
  );
}

function renderUpload(message) {
  // Compact, content-sized height for the upload state (reset any preview height).
  document.documentElement.style.height = 'auto';
  document.body.style.height = 'auto';
  root.style.height = 'auto';
  const status = el('p', { style: 'color:#6B778C;font:13px system-ui;margin:8px 0;' }, message || '');
  const input = el('input', { type: 'file', multiple: 'true', webkitdirectory: 'true' });
  const publishBtn = el(
    'button',
    {
      style: 'background:#0052CC;color:#fff;border:0;border-radius:4px;padding:8px 16px;font:14px system-ui;cursor:pointer;',
      onclick: async () => {
        if (!input.files || input.files.length === 0) { status.textContent = 'Pick a folder containing index.html first.'; return; }
        publishBtn.disabled = true;
        status.textContent = 'Reading files…';
        try {
          const files = await readFiles(input.files);
          status.textContent = `Publishing ${files.length} files…`;
          const res = await invoke('publish', { files });
          if (res && res.ok) { status.textContent = 'Published. Loading preview…'; await load(); }
          else { status.textContent = `Publish failed: ${res?.code || res?.message || 'unknown error'}`; publishBtn.disabled = false; }
        } catch (e) {
          status.textContent = `Error: ${e && e.message ? e.message : e}`;
          publishBtn.disabled = false;
        }
      },
    },
    'Publish mini-site',
  );

  root.replaceChildren(
    el('div', { style: 'font:14px system-ui;padding:16px;max-width:560px;' },
      el('h3', { style: 'margin:0 0 4px;' }, 'Upload a mini-site'),
      el('p', { style: 'color:#6B778C;font:13px system-ui;margin:0 0 12px;' },
        'Pick a folder with index.html and its relative assets (JS/CSS/images).'),
      el('div', { style: 'margin:12px 0;' }, input),
      publishBtn,
      status,
    ),
  );
}

async function load() {
  try {
    const res = await invoke('getServeUrl');
    if (res && res.ok && res.url) renderPreview(res.url);
    else renderUpload(res && res.code ? `No mini-site yet (${res.code}). Upload one below.` : 'No mini-site yet. Upload one below.');
  } catch (e) {
    renderUpload(`Could not load: ${e && e.message ? e.message : e}`);
  }
}

load();
