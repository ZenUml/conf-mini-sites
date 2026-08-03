/** Relative-path chart helper (loaded via <script src="widgets/chart.js">). */
window.StaticQaChart = {
  render(el, suites) {
    const max = Math.max(1, ...suites.map((s) => s.passed + s.failed + s.broken));
    el.innerHTML = "";
    suites.forEach((s) => {
      const total = s.passed + s.failed + s.broken;
      const col = document.createElement("div");
      col.className = "bar-col";
      const stack = document.createElement("div");
      stack.className = "bar-stack";
      stack.style.height = Math.round((total / max) * 100) + "%";
      ["passed", "failed", "broken"].forEach((k) => {
        if (!s[k]) return;
        const seg = document.createElement("div");
        seg.className = "seg " + k;
        seg.style.flex = String(s[k]);
        seg.title = `${s.name}: ${k} ${s[k]}`;
        stack.appendChild(seg);
      });
      const name = document.createElement("div");
      name.className = "bar-name";
      name.textContent = s.name;
      col.append(stack, name);
      el.appendChild(col);
    });
    el.setAttribute(
      "aria-label",
      "Suite results: " + suites.map((s) => `${s.name} ${s.passed}p/${s.failed}f/${s.broken}b`).join(", ")
    );
  },
};
