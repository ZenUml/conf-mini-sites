(function () {
  "use strict";

  var CRITERIA = [
    { key: "cost", label: "Cost" },
    { key: "impact", label: "Impact" },
    { key: "risk", label: "Risk" },
    { key: "effort", label: "Effort" },
  ];

  // Illustrative preset options — swap for your own vendors/architectures/choices.
  // Scores are 1 (worst) to 10 (best) for every criterion, including Risk and Effort,
  // so "higher is always better" holds across the whole table.
  var OPTIONS = [
    {
      id: "a",
      name: "Option A — Vendor A",
      scores: { cost: 7, impact: 6, risk: 8, effort: 7 },
    },
    {
      id: "b",
      name: "Option B — Vendor B",
      scores: { cost: 4, impact: 9, risk: 5, effort: 4 },
    },
    {
      id: "c",
      name: "Option C — Vendor C",
      scores: { cost: 9, impact: 5, risk: 6, effort: 8 },
    },
  ];

  var weightEls = {
    cost: document.getElementById("weightCost"),
    impact: document.getElementById("weightImpact"),
    risk: document.getElementById("weightRisk"),
    effort: document.getElementById("weightEffort"),
  };
  var weightValEls = {
    cost: document.getElementById("weightCostVal"),
    impact: document.getElementById("weightImpactVal"),
    risk: document.getElementById("weightRiskVal"),
    effort: document.getElementById("weightEffortVal"),
  };

  var scoreTableEl = document.getElementById("scoreTable");
  var rankingEl = document.getElementById("ranking");
  var footnoteEl = document.getElementById("footnote");

  function buildScoreTable() {
    var header = document.createElement("div");
    header.className = "score-row";
    header.setAttribute("role", "row");
    var headerLabel = document.createElement("div");
    headerLabel.textContent = "Option";
    header.appendChild(headerLabel);
    CRITERIA.forEach(function (c) {
      var cell = document.createElement("div");
      cell.textContent = c.label;
      header.appendChild(cell);
    });
    scoreTableEl.appendChild(header);

    OPTIONS.forEach(function (opt) {
      var row = document.createElement("div");
      row.className = "score-row";
      row.setAttribute("role", "row");

      var nameCell = document.createElement("div");
      nameCell.className = "option-name";
      nameCell.textContent = opt.name;
      row.appendChild(nameCell);

      CRITERIA.forEach(function (c) {
        var cell = document.createElement("div");
        var input = document.createElement("input");
        input.type = "number";
        input.min = "1";
        input.max = "10";
        input.step = "1";
        input.value = String(opt.scores[c.key]);
        input.setAttribute("aria-label", opt.name + " " + c.label + " score");
        input.addEventListener("input", function () {
          var v = parseInt(input.value, 10);
          if (isNaN(v)) v = 1;
          v = Math.max(1, Math.min(10, v));
          opt.scores[c.key] = v;
          recalculate();
        });
        cell.appendChild(input);
        row.appendChild(cell);
      });

      scoreTableEl.appendChild(row);
    });
  }

  function currentWeights() {
    var w = {};
    CRITERIA.forEach(function (c) {
      w[c.key] = parseInt(weightEls[c.key].value, 10);
    });
    return w;
  }

  function weightedScore(opt, weights) {
    var weightSum = 0;
    var scoreSum = 0;
    CRITERIA.forEach(function (c) {
      weightSum += weights[c.key];
      scoreSum += weights[c.key] * opt.scores[c.key];
    });
    if (weightSum === 0) return 0;
    return scoreSum / weightSum;
  }

  function recalculate() {
    var weights = currentWeights();
    CRITERIA.forEach(function (c) {
      weightValEls[c.key].textContent = String(weights[c.key]);
    });

    var allZero = CRITERIA.every(function (c) {
      return weights[c.key] === 0;
    });

    var ranked = OPTIONS.map(function (opt) {
      return { opt: opt, score: weightedScore(opt, weights) };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    var maxScore = ranked.length ? ranked[0].score : 0;

    rankingEl.innerHTML = "";
    ranked.forEach(function (entry, index) {
      var card = document.createElement("div");
      card.className = "rank-card" + (index === 0 && !allZero ? " rank-1" : "");

      var position = document.createElement("div");
      position.className = "rank-position";
      position.textContent = "#" + (index + 1);
      card.appendChild(position);

      var body = document.createElement("div");
      body.className = "rank-body";

      var name = document.createElement("p");
      name.className = "rank-name";
      name.textContent = entry.opt.name;
      body.appendChild(name);

      var track = document.createElement("div");
      track.className = "rank-bar-track";
      var fill = document.createElement("div");
      fill.className = "rank-bar-fill";
      var pct = maxScore > 0 ? (entry.score / maxScore) * 100 : 0;
      fill.style.width = pct + "%";
      track.appendChild(fill);
      body.appendChild(track);

      card.appendChild(body);

      var scoreEl = document.createElement("div");
      scoreEl.className = "rank-score";
      scoreEl.textContent = entry.score.toFixed(1);
      card.appendChild(scoreEl);

      rankingEl.appendChild(card);
    });

    if (allZero) {
      footnoteEl.textContent =
        "All weights are 0 — set at least one criterion's weight above 0 to produce a ranking.";
    } else {
      var winner = ranked[0].opt.name;
      footnoteEl.textContent =
        winner +
        " leads with the weights set above. Drag any slider to see how the ranking shifts as priorities change.";
    }
  }

  CRITERIA.forEach(function (c) {
    weightEls[c.key].addEventListener("input", recalculate);
  });

  buildScoreTable();
  recalculate();
})();
