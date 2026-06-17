// Demo mini-site behaviour — makes the dashboard interactive (clicking a quarter swaps the data + animates
// the bars/KPIs). Pure vanilla JS, no dependencies, so it runs as-is inside the sandboxed per-instance Worker.
(function () {
  'use strict';

  // Per-quarter data: KPI values (+delta vs prior) and 8 weekly request counts (millions).
  var DATA = {
    Q1: { sites: '1,284', served: '4.1M', latency: '38ms', uptime: '99.95%',
          d: { sites: '+6%', served: '+11%', latency: '-3ms', uptime: '+0.02%' },
          weeks: [2.8, 3.1, 3.0, 3.4, 3.6, 3.5, 3.9, 4.1] },
    Q2: { sites: '1,503', served: '5.0M', latency: '36ms', uptime: '99.96%',
          d: { sites: '+17%', served: '+22%', latency: '-2ms', uptime: '+0.01%' },
          weeks: [4.0, 4.2, 4.1, 4.5, 4.7, 4.6, 4.9, 5.0] },
    Q3: { sites: '1,847', served: '6.3M', latency: '33ms', uptime: '99.98%',
          d: { sites: '+23%', served: '+26%', latency: '-3ms', uptime: '+0.02%' },
          weeks: [5.1, 5.4, 5.2, 5.7, 6.0, 5.9, 6.2, 6.3] },
    Q4: { sites: '2,210', served: '7.8M', latency: '31ms', uptime: '99.98%',
          d: { sites: '+20%', served: '+24%', latency: '-2ms', uptime: '0.00%' },
          weeks: [6.4, 6.7, 6.6, 7.0, 7.3, 7.2, 7.6, 7.8] }
  };
  var WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

  var barsEl = document.querySelector('[data-bars]');
  var max = 8; // chart ceiling (millions) so bar heights are comparable across quarters

  function setText(sel, val) { var el = document.querySelector(sel); if (el) el.textContent = val; }

  function render(q) {
    var d = DATA[q];
    if (!d) return;

    setText('[data-kpi="sites"]', d.sites);
    setText('[data-kpi="served"]', d.served);
    setText('[data-kpi="latency"]', d.latency);
    setText('[data-kpi="uptime"]', d.uptime);

    ['sites', 'served', 'latency', 'uptime'].forEach(function (k) {
      var el = document.querySelector('[data-delta="' + k + '"]');
      if (!el) return;
      el.textContent = (d.d[k].indexOf('-') === 0 || k === 'latency' ? '▼ ' : '▲ ') + d.d[k] + ' vs prior';
      // latency going down is good; flag genuinely-down metrics red otherwise
      el.classList.toggle('is-down', d.d[k].indexOf('-') === 0 && k !== 'latency');
    });

    barsEl.innerHTML = '';
    d.weeks.forEach(function (v, i) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      var cap = document.createElement('span'); cap.className = 'bar__cap'; cap.textContent = v.toFixed(1);
      var fill = document.createElement('div'); fill.className = 'bar__fill';
      var x = document.createElement('span'); x.className = 'bar__x'; x.textContent = WEEK_LABELS[i];
      bar.appendChild(cap); bar.appendChild(fill); bar.appendChild(x);
      barsEl.appendChild(bar);
      // animate height in on next frame
      requestAnimationFrame(function () { fill.style.height = Math.round((v / max) * 100) + '%'; });
    });
  }

  document.querySelectorAll('.q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.q').forEach(function (b) { b.classList.remove('is-active'); b.removeAttribute('aria-selected'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-selected', 'true');
      render(btn.getAttribute('data-q'));
    });
  });

  render('Q3'); // default
})();
