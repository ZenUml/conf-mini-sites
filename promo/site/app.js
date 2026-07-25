// Feature Prioritisation — New Onboarding Experience
// Vanilla JS, no build step. Deterministic: no Math.random(), no Date-based rendering.
//
// Data comes from assets/features.json (relative fetch). FEATURES_FALLBACK below is a literal copy —
// keep the two in sync — used only if the fetch fails, so the page never renders empty.

(() => {
  'use strict';

  const FEATURES_FALLBACK = {
    features: [
      {
        id: 'a',
        letter: 'A',
        name: 'Guided setup checklist',
        votes: 4,
        impact: 3,
        effort: 2,
        problem:
          'New users land in an empty workspace with no signal of what to do first, so many never finish setup and churn before day three.',
        solution:
          "A persistent checklist of the four or five setup steps that matter — connect data, invite a teammate, configure a project — that tracks completion and stays visible until it's done.",
        impactStatement: 'Higher first-session activation, and fewer support tickets asking what to do next.',
      },
      {
        id: 'b',
        letter: 'B',
        name: 'Interactive product tour',
        votes: 6,
        impact: 5,
        effort: 4,
        problem:
          "Static screenshots and docs don't match the product a new user is actually looking at, so the first impression depends on reading before doing.",
        solution:
          'A short, skippable walkthrough driven by the real interface, surfacing the three things a new user needs on their very first visit.',
        impactStatement: 'Faster time-to-first-value, and fewer "how do I…" questions in week one.',
      },
      {
        id: 'c',
        letter: 'C',
        name: 'Personalised sample data',
        votes: 2,
        impact: 4,
        effort: 5,
        problem:
          "A blank workspace makes every feature feel abstract — users can't tell if the product fits their case until they've done the setup work themselves.",
        solution: 'Pre-load the workspace with realistic content scoped to the signup answers, ready to explore or replace.',
        impactStatement:
          "Users see the product's value before investing their own data, which should lift trial-to-paid conversion.",
      },
    ],
  };

  const CHART_ORDER = ['a', 'b', 'c']; // the results chart is a stable reference frame; it never reorders
  const MIN_BAR_PCT = 8; // smallest feature still gets a visible sliver of bar

  const state = {
    features: null, // { [id]: featureRecord } — votes mutate in place
    order: [], // current card DOM order (array of ids)
    sortMode: 'default', // 'default' | 'impact' | 'effort'
    openFeatureId: null,
  };

  const els = {};
  const cardEls = {}; // id -> card <article> element (persistent across reorders)
  const barFillEls = {}; // id -> chart bar fill element
  const barValueEls = {}; // id -> chart value label element
  const voteCountEls = {}; // id -> vote count span

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);

  function computeOrder(features, mode) {
    const ids = Object.keys(features);
    if (mode === 'impact') {
      return ids.slice().sort((x, y) => features[y].impact - features[x].impact || x.localeCompare(y));
    }
    if (mode === 'effort') {
      return ids.slice().sort((x, y) => features[x].effort - features[y].effort || x.localeCompare(y));
    }
    // default: current standing, most-voted first
    return ids.slice().sort((x, y) => features[y].votes - features[x].votes || x.localeCompare(y));
  }

  function meterSegmentsHtml(value) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="meter__seg${i <= value ? ' is-filled' : ''}"></span>`;
    }
    return html;
  }

  const cardInnerHtml = (f) => `
    <button type="button" class="card__open-target" data-open-target
      aria-label="View details for Option ${f.letter} — ${escapeHtml(f.name)}"></button>
    <div class="card__row">
      <span class="badge">${f.letter}</span>
      <h3 class="card__title">${escapeHtml(f.name)}</h3>
      <div class="card__votes">
        <span class="card__vote-count tnum" data-vote-count aria-live="polite">${f.votes}</span>
        <span class="card__vote-unit">votes</span>
      </div>
    </div>
    <div class="meters">
      <div class="meter meter--impact">
        <span class="meter__label">Impact</span>
        <span class="meter__track" role="img" aria-label="Impact ${f.impact} of 5">${meterSegmentsHtml(f.impact)}</span>
      </div>
      <div class="meter meter--effort">
        <span class="meter__label">Effort</span>
        <span class="meter__track" role="img" aria-label="Effort ${f.effort} of 5">${meterSegmentsHtml(f.effort)}</span>
      </div>
    </div>
    <div class="card__footer">
      <button type="button" class="btn btn--vote" data-vote-btn aria-label="Vote for Option ${f.letter}">Vote</button>
    </div>
  `;

  function buildCards() {
    state.order.forEach((id) => {
      const f = state.features[id];
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.featureId = id;
      card.innerHTML = cardInnerHtml(f);
      cardEls[id] = card;
      voteCountEls[id] = card.querySelector('[data-vote-count]');
      els.cardList.appendChild(card);
    });
  }

  // FLIP reorder: measure current (First) positions, re-append in new order (Last), then invert +
  // play so the cards visibly animate to their new spot instead of jumping.
  function reorderWithFlip(newOrder) {
    const first = {};
    newOrder.forEach((id) => {
      first[id] = cardEls[id].getBoundingClientRect().top;
    });

    newOrder.forEach((id) => els.cardList.appendChild(cardEls[id]));

    newOrder.forEach((id) => {
      const el = cardEls[id];
      const last = el.getBoundingClientRect().top;
      const delta = first[id] - last;
      if (!delta) {
        el.style.transform = '';
        return;
      }
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect(); // force reflow so the jump above commits before we clear it
      el.style.transition = '';
      requestAnimationFrame(() => {
        el.style.transform = '';
      });
    });
  }

  function setSortMode(mode) {
    state.sortMode = mode;
    els.segmentBtns.forEach((btn) => {
      const active = btn.dataset.sort === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    const newOrder = computeOrder(state.features, mode);
    state.order = newOrder;
    reorderWithFlip(newOrder);
  }

  function chartPct(f) {
    const maxVotes = Math.max(...Object.values(state.features).map((x) => x.votes));
    if (maxVotes <= 0) return MIN_BAR_PCT;
    return Math.max(MIN_BAR_PCT, Math.round((f.votes / maxVotes) * 100));
  }

  function buildChart() {
    CHART_ORDER.forEach((id) => {
      const f = state.features[id];
      const col = document.createElement('div');
      col.className = 'chart__col';
      col.dataset.barFeature = id;
      col.innerHTML = `
        <span class="chart__value tnum" data-bar-value>${f.votes}</span>
        <div class="chart__track"><div class="chart__bar" data-bar-fill style="height:${chartPct(f)}%"></div></div>
        <span class="chart__axis">${f.letter}</span>
      `;
      barFillEls[id] = col.querySelector('[data-bar-fill]');
      barValueEls[id] = col.querySelector('[data-bar-value]');
      els.chart.appendChild(col);
    });
  }

  function updateChart() {
    CHART_ORDER.forEach((id) => {
      const f = state.features[id];
      barFillEls[id].style.height = `${chartPct(f)}%`;
      barValueEls[id].textContent = String(f.votes);
    });
  }

  function handleVote(id) {
    const f = state.features[id];
    f.votes += 1;
    voteCountEls[id].textContent = String(f.votes);
    voteCountEls[id].classList.remove('is-flash');
    void voteCountEls[id].offsetWidth; // restart the one-shot flash animation
    voteCountEls[id].classList.add('is-flash');

    updateChart();

    const newOrder = computeOrder(state.features, state.sortMode);
    if (newOrder.join(',') !== state.order.join(',')) {
      state.order = newOrder;
      reorderWithFlip(newOrder);
    }
  }

  const detailSectionsHtml = (f) => `
    <div class="detail-panel__section"><dt>Problem</dt><dd>${escapeHtml(f.problem)}</dd></div>
    <div class="detail-panel__section"><dt>Solution</dt><dd>${escapeHtml(f.solution)}</dd></div>
    <div class="detail-panel__section"><dt>Expected Impact</dt><dd>${escapeHtml(f.impactStatement)}</dd></div>
  `;

  function openDetail(id) {
    const f = state.features[id];
    state.openFeatureId = id;
    els.detailBadge.textContent = f.letter;
    els.detailTitle.textContent = f.name;
    els.detailSections.innerHTML = detailSectionsHtml(f);
    els.detailPanel.classList.add('is-open');
    els.detailPanel.setAttribute('aria-hidden', 'false');
    els.detailClose.focus();
  }

  function closeDetail() {
    els.detailPanel.classList.remove('is-open');
    els.detailPanel.setAttribute('aria-hidden', 'true');
    const id = state.openFeatureId;
    state.openFeatureId = null;
    const target = id && cardEls[id] && cardEls[id].querySelector('[data-open-target]');
    if (target) target.focus();
  }

  function wireEvents() {
    els.segmented.addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented__btn');
      if (btn) setSortMode(btn.dataset.sort);
    });

    els.cardList.addEventListener('click', (e) => {
      const voteBtn = e.target.closest('[data-vote-btn]');
      if (voteBtn) {
        handleVote(voteBtn.closest('.card').dataset.featureId);
        return;
      }
      const openBtn = e.target.closest('[data-open-target]');
      if (openBtn) openDetail(openBtn.closest('.card').dataset.featureId);
    });

    els.detailClose.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.openFeatureId) closeDetail();
    });
  }

  function cacheEls() {
    els.cardList = document.getElementById('card-list');
    els.chart = document.getElementById('chart');
    els.segmented = document.getElementById('segmented');
    els.segmentBtns = Array.from(els.segmented.querySelectorAll('.segmented__btn'));
    els.detailPanel = document.getElementById('detail-panel');
    els.detailClose = document.getElementById('detail-close');
    els.detailBadge = document.getElementById('detail-badge');
    els.detailTitle = document.getElementById('detail-title');
    els.detailSections = document.getElementById('detail-sections');
  }

  const isValidFeaturesShape = (data) =>
    Boolean(data) &&
    Array.isArray(data.features) &&
    data.features.length === 3 &&
    data.features.every((f) => f && typeof f.id === 'string' && typeof f.votes === 'number');

  function loadFeatures() {
    return fetch('assets/features.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then((data) => (isValidFeaturesShape(data) ? data : FEATURES_FALLBACK))
      .catch(() => FEATURES_FALLBACK);
  }

  function init() {
    cacheEls();
    loadFeatures().then((data) => {
      state.features = {};
      data.features.forEach((f) => {
        state.features[f.id] = { ...f };
      });
      state.order = computeOrder(state.features, 'default');
      buildCards();
      buildChart();
      wireEvents();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
