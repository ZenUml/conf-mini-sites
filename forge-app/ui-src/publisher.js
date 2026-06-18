// Publisher modal controller — the "Bold Editorial" design wired to real data.
// Flow: picker → selected → progress (real invoke('publish')) → preview (real mini-site iframe via getServeUrl).
// Opening an already-published instance jumps straight to preview. Reuses the design's manifest/checklist/
// progress/toast visual language; the data is real (selected files, real validation result, real serve URL).
import { invoke, view, router } from '@forge/bridge';

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

/* ---------- helpers (ported from the design) ---------- */
const GLYPH = {
  html: { c: '#0C66E4', t: '<>' }, htm: { c: '#0C66E4', t: '<>' },
  js: { c: '#B07B00', t: 'JS' }, mjs: { c: '#B07B00', t: 'JS' },
  css: { c: '#7F56D9', t: '{}' }, svg: { c: '#216E4E', t: '▱' },
  json: { c: '#44546F', t: '{·}' }, png: { c: '#216E4E', t: '▦' }, jpg: { c: '#216E4E', t: '▦' },
  jpeg: { c: '#216E4E', t: '▦' }, gif: { c: '#216E4E', t: '▦' }, webp: { c: '#216E4E', t: '▦' },
  ico: { c: '#216E4E', t: '▦' }, woff2: { c: '#44546F', t: 'Aa' }, woff: { c: '#44546F', t: 'Aa' },
  _: { c: '#44546F', t: '•' },
};
const glyphFor = (p) => GLYPH[(p.split('.').pop() || '').toLowerCase()] || GLYPH._;
function splitPath(p) {
  const i = p.lastIndexOf('/');
  if (i === -1) { const d = p.lastIndexOf('.'); return d > 0 ? { head: p.slice(0, d), tail: p.slice(d) } : { head: p, tail: '' }; }
  const file = p.slice(i + 1), d = file.lastIndexOf('.');
  return d > 0 ? { head: p.slice(0, i + 1 + d), tail: file.slice(d) } : { head: p, tail: '' };
}
function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}
const pendingDot = () => '<svg class="spin" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#626F86" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>';
const greenCheck = () => '<span class="pop inline-grid place-items-center w-4 h-4 rounded-full bg-ok-base"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg></span>';
const NARR_SPIN = '<svg class="spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0C66E4" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>';
const NARR_DONE = '<span class="pop inline-grid place-items-center w-3.5 h-3.5 rounded-full bg-ok-base"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17l9-10"/></svg></span>';

function chunkedBase64(bytes) {
  let bin = ''; const C = 0x8000;
  for (let i = 0; i < bytes.length; i += C) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + C));
  return btoa(bin);
}
function relPath(file) {
  const p = file.webkitRelativePath || file.name; const s = p.indexOf('/');
  return s >= 0 ? p.slice(s + 1) : p;
}

/* ---------- state ---------- */
let FILES = []; // [{file, path, size}]
let lastUrl = '', lastRef = '', lastPageUrl = '';

/* ---------- state switching ---------- */
function show(stateUploading) {
  $('switcher').dataset.on = stateUploading ? '1' : '2';
  $('tab-1').setAttribute('aria-selected', String(stateUploading));
  $('tab-2').setAttribute('aria-selected', String(!stateUploading));
  $('tab-1').classList.toggle('text-ink-800', stateUploading); $('tab-1').classList.toggle('text-ink-500', !stateUploading);
  $('tab-2').classList.toggle('text-ink-800', !stateUploading); $('tab-2').classList.toggle('text-ink-500', stateUploading);
  $('state-uploading').hidden = !stateUploading;
  $('state-preview').hidden = stateUploading;
}
function showUploadSub(which) { // 'picker' | 'selected' | 'progress'
  $('picker').hidden = which !== 'picker';
  $('selected').hidden = which !== 'selected';
  $('progress').hidden = which !== 'progress';
}

/* ---------- toast + copy ---------- */
let toastTimer = null;
function toast(msg) {
  $('toast-msg').textContent = msg;
  $('toast').style.opacity = '1'; $('toast').style.transform = 'translate(-50%,0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').style.opacity = '0'; $('toast').style.transform = 'translate(-50%,8px)'; }, 1800);
}
function wireCopy(btnId, labelId, getText, toastMsg) {
  const btn = $(btnId), lbl = $(labelId), orig = lbl.textContent;
  btn.addEventListener('click', () => {
    const text = getText();
    const w = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject();
    const flip = () => { lbl.textContent = 'Copied'; btn.classList.add('text-ok-deep'); toast(toastMsg); setTimeout(() => { lbl.textContent = orig; btn.classList.remove('text-ok-deep'); }, 1500); };
    w.then(flip).catch(flip);
  });
}

/* ---------- picker ---------- */
function onFilesPicked(fileList) {
  const arr = [...fileList].filter((f) => f.size >= 0);
  FILES = arr.map((f) => ({ file: f, path: relPath(f), size: f.size }));
  const err = $('picker-error');
  if (FILES.length < 2) { err.hidden = false; err.textContent = 'Pick a folder with at least two files (index.html + assets).'; return; }
  if (!FILES.some((f) => f.path === 'index.html')) { err.hidden = false; err.textContent = 'No index.html at the folder root — that file is the entry point.'; return; }
  err.hidden = true;
  $('sel-count').textContent = String(FILES.length);
  $('sel-size').textContent = fmtSize(FILES.reduce((n, f) => n + f.size, 0));
  showUploadSub('selected');
}

/* ---------- manifest + checklist ---------- */
function buildManifest() {
  const m = $('manifest'); m.innerHTML = '';
  $('up-total').textContent = String(FILES.length);
  FILES.forEach((f, idx) => {
    const g = glyphFor(f.path), sp = splitPath(f.path);
    const li = document.createElement('li');
    li.className = 'settle flex items-center gap-3 px-3.5 py-2.5';
    li.style.animationDelay = (reduce ? 0 : idx * 45) + 'ms';
    li.innerHTML =
      '<span data-glyph class="shrink-0 grid place-items-center w-6 h-6 rounded-md font-mono text-[10px] font-semibold"></span>' +
      '<span class="path-mid font-mono text-mono text-ink-800 flex-1 min-w-0"><span class="p-head">' + sp.head + '</span><span class="p-tail">' + sp.tail + '</span></span>' +
      '<span class="shrink-0 font-mono text-micro text-ink-600 num-tab">' + fmtSize(f.size) + '</span>' +
      '<span class="status shrink-0 w-4 h-4 grid place-items-center">' + pendingDot() + '</span>';
    m.appendChild(li);
    // Set the glyph chip colour via CSSOM (Forge Custom UI CSP blocks PARSED inline style attributes; CSSOM is allowed).
    const gEl = li.querySelector('[data-glyph]');
    gEl.textContent = g.t; gEl.style.background = g.c + '1A'; gEl.style.color = g.c;
  });
  $('up-count').textContent = '0';
}
const CHECKS = [
  { id: 'root', label: 'index.html found at root', note: 'entry point detected' },
  { id: 'rel', label: 'All paths relative · no absolute URLs', note: 'references resolved' },
  { id: 'caps', label: 'Within size & file-count limits', note: '' },
  { id: 'secret', label: 'Scanning for leaked secrets', note: 'AWS, GCP, tokens, keys', shield: true },
];
function checkRowHTML(c, doneVal) {
  const done = doneVal === 'ok', stop = doneVal === 'stop';
  const lead = c.shield
    ? '<span class="status inline-grid place-items-center w-5 h-5 rounded-full ' + (done ? 'bg-ok-base' : stop ? 'bg-stop-base' : 'bg-surf-sunk') + '">' +
      (done ? '<svg class="pop" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
        : stop ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
        : '<svg class="spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#44546F" stroke-width="2.2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5"/></svg>') +
      '</span>'
    : '<span class="status inline-grid place-items-center w-5 h-5">' + (done ? greenCheck() : stop ? '<span class="inline-grid place-items-center w-4 h-4 rounded-full bg-stop-base"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>' : pendingDot()) + '</span>';
  const right = stop ? '<span class="shrink-0 text-micro font-semibold text-stop-deep">Stopped</span>'
    : done ? '<span class="shrink-0 text-micro font-semibold text-ok-deep">' + (c.shield ? 'No secrets' : 'Passed') + '</span>'
    : (c.shield ? '<span class="shrink-0 text-micro font-medium text-ink-500">in progress</span>' : '');
  return lead +
    '<span class="flex-1 min-w-0"><span class="block ' + (c.shield ? 'text-body font-semibold text-ink-800' : 'text-body font-medium ' + (done ? 'text-ink-800' : 'text-ink-600')) + ' leading-tight">' + c.label + '</span>' +
    '<span class="block text-meta text-ink-600 leading-tight mt-0.5 font-mono num-tab">' + c.note + '</span></span>' + right;
}
function buildChecklist() {
  CHECKS[2].note = FILES.length + ' files · ' + fmtSize(FILES.reduce((n, f) => n + f.size, 0));
  const cl = $('checklist'); cl.innerHTML = '';
  CHECKS.forEach((c) => {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-3 px-3.5 py-2.5' + (c.shield ? ' bg-brand-tintBg/40 border-l-2 border-brand-blue/60' : '');
    li.dataset.id = c.id; li.innerHTML = checkRowHTML(c, 'pending');
    cl.appendChild(li);
  });
}
function setCheck(id, val) {
  const li = $('checklist').querySelector('[data-id="' + id + '"]'); const c = CHECKS.find((x) => x.id === id);
  if (li && c) { li.innerHTML = checkRowHTML(c, val); if (val === 'stop') { li.classList.remove('bg-brand-tintBg/40', 'border-brand-blue/60'); li.classList.add('bg-stop-soft', 'border-l-2', 'border-stop-base'); } }
}

/* ---------- progress animation (real publish in flight) ---------- */
let rampTimer = null;
function setPct(p) {
  p = Math.round(p);
  $('pct-num').textContent = p; $('bar-fill').style.width = p + '%'; $('bar-root').setAttribute('aria-valuenow', String(p));
  let n = FILES.length, uploaded = Math.min(n, Math.floor((p / 100) * n));
  const st = $('manifest').querySelectorAll('.status'); let count = 0;
  st.forEach((s, i) => { if (i < uploaded) { if (!s.dataset.up) { s.dataset.up = '1'; s.innerHTML = greenCheck(); } count++; } });
  $('up-count').textContent = String(count);
}
function startRamp() {
  let p = 4; setPct(p); $('narr-spin').innerHTML = NARR_SPIN;
  const NARR = [[0, 'Uploading files…'], [55, 'Validating bundle structure…'], [80, 'Scanning for secrets…']];
  rampTimer = setInterval(() => {
    if (p >= 92) return; // hold at 92 until the real response lands
    p += p < 50 ? 2.2 : 1.1;
    setPct(Math.min(92, p));
    let msg = NARR[0][1]; for (const [at, t] of NARR) if (p >= at) msg = t;
    $('narrator').textContent = msg;
  }, reduce ? 1 : 90);
}
function stopRamp() { if (rampTimer) { clearInterval(rampTimer); rampTimer = null; } }

/* ---------- publish ---------- */
async function readAll() {
  const out = [];
  for (const f of FILES) { const buf = new Uint8Array(await f.file.arrayBuffer()); out.push({ path: f.path, b64: chunkedBase64(buf) }); }
  return out;
}
async function doPublish() {
  showUploadSub('progress');
  buildManifest(); buildChecklist();
  $('bar-root').classList.remove('bar-done'); $('bar-fill').classList.remove('bg-stop-base'); $('bar-fill').classList.add('bg-brand-blue');
  $('secret-notice').hidden = true; $('handoff').hidden = true;
  startRamp();
  let res;
  try {
    const files = await readAll();
    res = await invoke('publish', { files });
  } catch (e) {
    res = { ok: false, code: 'NETWORK', message: String((e && e.message) || e) };
  }
  stopRamp();
  if (res && res.ok) return onPublishOk();
  onPublishFail(res || {});
}
function onPublishOk() {
  setPct(100);
  ['root', 'rel', 'caps', 'secret'].forEach((id) => setCheck(id, 'ok'));
  $('bar-root').classList.add('bar-done');
  $('narr-spin').innerHTML = NARR_DONE; $('narrator').textContent = 'Published · ready to preview';
  $('up-state').textContent = 'uploaded';
  $('manifest').querySelectorAll('.status').forEach((s) => { if (!s.dataset.up) { s.dataset.up = '1'; s.innerHTML = greenCheck(); } });
  $('up-count').textContent = String(FILES.length);
  $('handoff').hidden = false;
}
function onPublishFail(res) {
  const code = res.code || 'ERROR';
  let msg = res.message || 'Publish failed.';
  $('bar-root').classList.add('bar-done'); // kill shimmer/stripe
  $('bar-fill').classList.remove('bg-brand-blue'); $('bar-fill').classList.add('bg-stop-base');
  $('narr-spin').innerHTML = '<span class="inline-grid place-items-center w-3.5 h-3.5 rounded-full bg-stop-base"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>';
  $('up-state').textContent = 'received · not published';
  $('manifest').querySelectorAll('.status').forEach((s) => { if (!s.dataset.up) { s.dataset.up = 'halt'; s.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#8993A4" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"/></svg>'; } });
  // map the failing code to the right checklist row
  if (code === 'SECRET_DETECTED') { setCheck('root', 'ok'); setCheck('rel', 'ok'); setCheck('caps', 'ok'); setCheck('secret', 'stop'); $('narrator').textContent = 'Stopped — secret detected'; }
  else if (code === 'BUNDLE_NO_INDEX' || code === 'BUNDLE_NOT_MULTIFILE') { setCheck('root', 'stop'); $('narrator').textContent = 'Stopped — bundle structure'; }
  else if (/SIZE|COUNT|LIMIT|TOO_/i.test(code)) { setCheck('root', 'ok'); setCheck('rel', 'ok'); setCheck('caps', 'stop'); $('narrator').textContent = 'Stopped — size/limits'; }
  // EAG-92 — the license gate fires BEFORE validation, so no checklist row is "stopped"; show an upgrade prompt.
  else if (code === 'LICENSE_INACTIVE') {
    $('narrator').textContent = 'Stopped — subscription inactive';
    msg = 'Your Mini Site for Confluence subscription is inactive or has expired. Renew it from the Atlassian Marketplace to publish new mini-sites — mini-sites you already published keep rendering.';
  }
  else { $('narrator').textContent = 'Stopped — ' + code; }
  $('secret-msg').textContent = msg;
  $('secret-notice').hidden = false;
  $('secret-notice').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
}

/* ---------- preview ---------- */
async function loadPreview() {
  const res = await invoke('getServeUrl').catch(() => null);
  if (!res || !res.ok || !res.url) return false;
  lastUrl = res.url; lastRef = 'mini-site:' + (res.instanceId || '');
  $('preview-frame').src = lastUrl;
  $('chrome-url').textContent = lastRef + ' · live preview';
  $('instance-ref').textContent = lastRef;
  $('chip-files').textContent = FILES.length ? FILES.length + ' files' : 'multi-file';
  $('chip-size').textContent = FILES.length ? fmtSize(FILES.reduce((n, f) => n + f.size, 0)) : 'bundle';
  $('tab-2').disabled = false; $('switch-hint').textContent = 'Live on this page';
  return true;
}
function goPreview() { show(false); if (!reduce) { const pane = $('preview-pane'); pane.classList.remove('reveal-pane', 'glow-once'); void pane.offsetWidth; pane.classList.add('reveal-pane', 'glow-once'); $('chrome-bar').classList.add('do-sweep'); } }

/* ---------- wiring ---------- */
$('file-input').addEventListener('change', (e) => onFilesPicked(e.target.files));
$('btn-clear').addEventListener('click', () => { FILES = []; $('file-input').value = ''; showUploadSub('picker'); });
$('btn-publish').addEventListener('click', doPublish);
$('go-preview').addEventListener('click', async () => { await loadPreview(); goPreview(); });
$('btn-secret-retry').addEventListener('click', () => { FILES = []; $('file-input').value = ''; showUploadSub('picker'); });
$('btn-replace').addEventListener('click', () => { FILES = []; $('file-input').value = ''; show(true); showUploadSub('picker'); });
$('btn-reload').addEventListener('click', () => { if (lastUrl) $('preview-frame').src = lastUrl + (lastUrl.indexOf('?') < 0 ? '?' : '&') + 'r=' + (reduce ? 1 : 2); });
$('btn-done').addEventListener('click', () => view.close({ published: !!lastUrl }));
$('btn-close').addEventListener('click', () => view.close({ published: !!lastUrl }));
$('btn-fullscreen').addEventListener('click', () => { if (lastUrl) (router.open ? router.open(lastUrl) : window.open(lastUrl, '_blank')); });
$('tab-1').addEventListener('click', () => show(true));
$('tab-2').addEventListener('click', () => { if (!$('tab-2').disabled) show(false); });
wireCopy('btn-copy-ref', 'copy-ref-label', () => lastRef, 'Instance reference copied');
wireCopy('btn-copy-link', 'copy-link-label', () => lastPageUrl || lastUrl, 'Share link copied');

/* ---------- boot ---------- */
(async function boot() {
  try { const ctx = await view.getContext(); lastPageUrl = (ctx && ctx.extension && ctx.extension.content && ctx.extension.content.url) || ''; } catch {}
  const published = await loadPreview();
  if (published) { show(false); showUploadSub('picker'); }
  else { show(true); showUploadSub('picker'); }
})();
