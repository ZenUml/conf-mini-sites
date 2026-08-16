(function () {
  "use strict";

  var seed = [
    { id: id(), title: "One-click CSV export", impact: 7, effort: 3, votes: 4 },
    { id: id(), title: "Dark mode", impact: 4, effort: 2, votes: 2 },
    { id: id(), title: "Real-time collaboration", impact: 9, effort: 9, votes: 6 },
    { id: id(), title: "Slack notifications", impact: 6, effort: 4, votes: 3 },
    { id: id(), title: "Custom branding", impact: 3, effort: 7, votes: 1 }
  ];

  var state = seed;

  var gridEl = document.getElementById("matrixGrid");
  var rankListEl = document.getElementById("rankList");
  var emptyStateEl = document.getElementById("emptyState");
  var ideaInput = document.getElementById("ideaInput");
  var impactInput = document.getElementById("impactInput");
  var effortInput = document.getElementById("effortInput");
  var impactOut = document.getElementById("impactOut");
  var effortOut = document.getElementById("effortOut");
  var addBtn = document.getElementById("addBtn");

  impactInput.addEventListener("input", function () {
    impactOut.textContent = impactInput.value;
  });
  effortInput.addEventListener("input", function () {
    effortOut.textContent = effortInput.value;
  });

  addBtn.addEventListener("click", addIdea);
  ideaInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addIdea();
  });

  function addIdea() {
    var title = ideaInput.value.trim();
    if (!title) {
      ideaInput.focus();
      return;
    }
    state.push({
      id: id(),
      title: title,
      impact: Number(impactInput.value),
      effort: Number(effortInput.value),
      votes: 0
    });
    ideaInput.value = "";
    render();
  }

  function id() {
    return "f_" + Math.random().toString(36).slice(2, 10);
  }

  function quadrantOf(item) {
    var highImpact = item.impact >= 5.5;
    var lowEffort = item.effort < 5.5;
    if (highImpact && lowEffort) return { name: "Quick win", cls: "quick-win", color: "#1f9d55" };
    if (highImpact && !lowEffort) return { name: "Big bet", cls: "big-bet", color: "#c77b12" };
    if (!highImpact && lowEffort) return { name: "Fill-in", cls: "fill-in", color: "#7a7f8a" };
    return { name: "Reconsider", cls: "reconsider", color: "#d1495b" };
  }

  function score(item) {
    // simple prioritization score: impact per unit effort, votes as a tiebreaker weight
    return item.impact / item.effort;
  }

  function rankedList() {
    return state.slice().sort(function (a, b) {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return score(b) - score(a);
    });
  }

  function render() {
    renderMatrix();
    renderRankList();
  }

  function renderMatrix() {
    gridEl.innerHTML = "";
    state.forEach(function (item) {
      var q = quadrantOf(item);
      var dot = document.createElement("div");
      dot.className = "dot dot--" + q.cls;
      dot.dataset.id = item.id;
      dot.style.background = q.color;
      dot.style.left = (item.effort / 10) * 100 + "%";
      dot.style.top = 100 - (item.impact / 10) * 100 + "%";
      dot.title = item.title + " — Impact " + item.impact + " / Effort " + item.effort;
      dot.textContent = initials(item.title);
      attachDrag(dot, item);
      gridEl.appendChild(dot);
    });
  }

  function initials(title) {
    var words = title.trim().split(/\s+/).slice(0, 2);
    return words.map(function (w) { return w[0] ? w[0].toUpperCase() : ""; }).join("");
  }

  function attachDrag(dot, item) {
    var dragging = false;

    function pointerToScore(clientX, clientY) {
      var rect = gridEl.getBoundingClientRect();
      var x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      var y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      var effort = Math.round((x / rect.width) * 10);
      var impact = Math.round(10 - (y / rect.height) * 10);
      effort = Math.min(Math.max(effort, 1), 10);
      impact = Math.min(Math.max(impact, 1), 10);
      return { impact: impact, effort: effort };
    }

    function onMove(clientX, clientY) {
      var next = pointerToScore(clientX, clientY);
      item.impact = next.impact;
      item.effort = next.effort;
      dot.style.left = (item.effort / 10) * 100 + "%";
      dot.style.top = 100 - (item.impact / 10) * 100 + "%";
      var q = quadrantOf(item);
      dot.style.background = q.color;
      dot.className = "dot dragging dot--" + q.cls;
      dot.title = item.title + " — Impact " + item.impact + " / Effort " + item.effort;
    }

    function start(e) {
      dragging = true;
      dot.classList.add("dragging");
      e.preventDefault();
    }

    function move(e) {
      if (!dragging) return;
      var point = e.touches ? e.touches[0] : e;
      onMove(point.clientX, point.clientY);
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      dot.classList.remove("dragging");
      renderRankList();
    }

    dot.addEventListener("mousedown", start);
    dot.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);

    // Click on matrix background also drops the nearest new position (simple UX affordance)
    dot.addEventListener("dblclick", function () {
      item.votes += 1;
      render();
    });
  }

  function renderRankList() {
    var ranked = rankedList();
    rankListEl.innerHTML = "";
    emptyStateEl.style.display = ranked.length ? "none" : "block";

    ranked.forEach(function (item, index) {
      var q = quadrantOf(item);
      var li = document.createElement("li");
      li.className = "rank-item";

      var rankSpan = document.createElement("span");
      rankSpan.className = "rank-item__rank";
      rankSpan.textContent = "#" + (index + 1);

      var body = document.createElement("div");
      body.className = "rank-item__body";

      var title = document.createElement("div");
      title.className = "rank-item__title";
      title.textContent = item.title;

      var meta = document.createElement("div");
      meta.className = "rank-item__meta";
      meta.innerHTML =
        '<span class="rank-item__quadrant rank-item__quadrant--' + q.cls + '" style="color:' + q.color + '">' + q.name + "</span>" +
        " · Impact " + item.impact + " / Effort " + item.effort;

      body.appendChild(title);
      body.appendChild(meta);

      var voteBtn = document.createElement("button");
      voteBtn.className = "vote-btn";
      voteBtn.setAttribute("aria-label", "Vote for " + item.title);
      voteBtn.innerHTML = '<span>▲ vote</span><span class="vote-btn__count">' + item.votes + "</span>";
      voteBtn.addEventListener("click", function () {
        item.votes += 1;
        render();
      });

      var removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.setAttribute("aria-label", "Remove " + item.title);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", function () {
        state = state.filter(function (s) { return s.id !== item.id; });
        render();
      });

      li.appendChild(rankSpan);
      li.appendChild(body);
      li.appendChild(voteBtn);
      li.appendChild(removeBtn);
      rankListEl.appendChild(li);
    });
  }

  render();
})();
