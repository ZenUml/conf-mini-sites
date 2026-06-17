// Mini-site demo logic. Fetches data/metrics.json over a RELATIVE path — this is the real test: when served by
// the dispatch Worker the request resolves under the grant <base> (/v/<id>/g/<grant>/data/metrics.json) and the
// sandbox CSP (connect-src 'self') must allow it. Falls back to embedded data so the page still renders if
// opened standalone (file://), with the source noted.
const CATS = ['core', 'api', 'docs', 'infra', 'misc'];
const QLABEL = { q3: 'Q3', q2: 'Q2', all: 'all time' };
const FALLBACK = {
  q3: { vals: [38, 52, 27, 44, 19], shipped: 128, ontrack: 94 },
  q2: { vals: [29, 41, 33, 22, 14], shipped: 96, ontrack: 88 },
  all: { vals: [44, 49, 36, 47, 31], shipped: 412, ontrack: 91 },
};

let data = FALLBACK;
let live = false;

async function load() {
  try {
    const res = await fetch('data/metrics.json', { cache: 'no-store' });
    if (res.ok) { data = await res.json(); live = true; }
  } catch { /* keep fallback */ }
  document.getElementById('updated').textContent = live ? 'updated just now' : 'sample data';
  render('q3');
}

function render(q) {
  const d = data[q] || FALLBACK[q];
  const max = Math.max(...d.vals);
  const peak = d.vals.indexOf(max);

  const chart = document.getElementById('chart');
  chart.innerHTML = '';
  d.vals.forEach((v, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'bar-wrap' + (i === peak ? ' peak' : '');
    const val = document.createElement('div');
    val.className = 'bar-val'; val.textContent = String(v);
    const bar = document.createElement('div');
    bar.className = 'bar' + (i === peak ? ' peak' : '');
    bar.style.height = Math.round((v / max) * 100) + '%';
    wrap.append(val, bar);
    chart.append(wrap);
  });
  chart.setAttribute('aria-label', `Items by category for ${QLABEL[q]}: ` + CATS.map((c, i) => `${c} ${d.vals[i]}`).join(', '));

  document.getElementById('labels').innerHTML = CATS.map((c) => `<span>${c}</span>`).join('');
  document.getElementById('m-shipped').textContent = d.shipped;
  document.getElementById('m-ontrack').firstChild.textContent = d.ontrack;
}

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    render(chip.dataset.q);
  });
});

load();
