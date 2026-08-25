(function () {
  const CSV_PAGES = {
    '01_evidence_log.md': '01_evidence_log.csv',
    '03_seo_content_map.md': '03_seo_content_map.csv',
    '04_design_partner_candidates.md': '04_design_partner_candidates.csv',
  };

  let activeFile = '';

  function currentFile() {
    return location.hash.replace(/^#\/?/, '').split('?')[0];
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let i = 0;
    let inQuotes = false;

    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTable(container, rows, src) {
    if (!rows.length) {
      container.innerHTML = '<p>No rows.</p>';
      return;
    }
    const headers = rows[0];
    const data = rows.slice(1);

    container.innerHTML =
      '<div class="csv-toolbar">' +
      '<input type="search" class="csv-search" placeholder="Filter rows…" aria-label="Filter rows" />' +
      '<span class="csv-meta">' + data.length + ' rows · ' + headers.length + ' columns</span>' +
      '<a class="csv-dl" href="' + esc(src) + '" download>Download CSV</a>' +
      '</div>' +
      '<div class="csv-scroll"><table class="csv-table">' +
      '<thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' +
      data
        .map(
          (r) =>
            '<tr>' +
            headers
              .map((_, ci) => '<td title="' + esc(r[ci] || '') + '">' + esc(r[ci] || '') + '</td>')
              .join('') +
            '</tr>'
        )
        .join('') +
      '</tbody></table></div>';

    const input = container.querySelector('.csv-search');
    const trs = Array.from(container.querySelectorAll('tbody tr'));
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      trs.forEach((tr) => {
        const hit = !q || tr.textContent.toLowerCase().includes(q);
        tr.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      container.querySelector('.csv-meta').textContent =
        shown + ' / ' + data.length + ' rows · ' + headers.length + ' columns';
    });
  }

  async function mount(container, src) {
    if (container.dataset.loaded === src || container.dataset.loading === src) return;
    container.dataset.loading = src;
    container.innerHTML = '<p class="csv-loading">Loading ' + esc(src) + '…</p>';
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (container.dataset.loading !== src) return;
      renderTable(container, parseCsv(await res.text()), src);
      container.dataset.loaded = src;
      delete container.dataset.loading;
    } catch (err) {
      if (container.dataset.loading !== src) return;
      container.innerHTML =
        '<p class="csv-error">Failed to load <code>' + esc(src) + '</code>: ' + esc(err.message) + '</p>';
      delete container.dataset.loading;
    }
  }

  function injectCsvTable() {
    const file = currentFile();
    const src = CSV_PAGES[file];

    if (file !== activeFile) {
      document.querySelectorAll('.csv-mount').forEach((el) => el.remove());
      activeFile = file;
    }

    if (!src) return;

    const section = document.querySelector('.markdown-section');
    if (!section) return;

    let container = section.querySelector('.csv-mount');
    if (!container) {
      container = document.createElement('div');
      container.className = 'csv-mount';
      section.appendChild(container);
    }
    mount(container, src);
  }

  function scheduleInject() {
    injectCsvTable();
    requestAnimationFrame(injectCsvTable);
    setTimeout(injectCsvTable, 50);
    setTimeout(injectCsvTable, 250);
  }

  function csvPlugin(hook) {
    hook.ready(scheduleInject);
    hook.doneEach(scheduleInject);
  }

  window.addEventListener('hashchange', scheduleInject);

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat(csvPlugin);
})();
