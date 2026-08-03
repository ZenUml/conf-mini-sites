// Static QA report demo — relative fetch of data/*.json + widgets/chart.js.
// Proves the Mini Sites grant <base> + CSP connect-src 'self' path that Allure
// reports need (research JTBD-01 / JTBD-04; evidence E022, E073, E110).

const FALLBACK = {
  title: "checkout-service · offline sample",
  totals: { total: 128, passed: 119, failed: 6, broken: 3 },
  suites: [
    { name: "auth", passed: 22, failed: 0, broken: 0, status: "passed" },
    { name: "cart", passed: 31, failed: 2, broken: 1, status: "failed" },
    { name: "checkout", passed: 28, failed: 3, broken: 1, status: "failed" },
    { name: "payments", passed: 18, failed: 1, broken: 1, status: "failed" },
    { name: "inventory", passed: 20, failed: 0, broken: 0, status: "passed" },
  ],
};

let summary = FALLBACK;
let suites = FALLBACK.suites;
let live = false;
let filter = "all";

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(path + " " + res.status);
  return res.json();
}

async function boot() {
  const badge = document.getElementById("load-state");
  const proof = document.getElementById("path-proof");
  try {
    const [sum, suiteData] = await Promise.all([
      loadJson("data/summary.json"),
      loadJson("data/suites.json"),
    ]);
    summary = sum;
    suites = suiteData.suites;
    live = true;
    badge.textContent = "paths OK";
    badge.classList.remove("offline");
    proof.textContent = "fetch data/ + widgets/ OK";
  } catch (err) {
    badge.textContent = "offline fallback";
    badge.classList.add("offline");
    proof.textContent = "open via http(s), not file://";
    console.warn("relative fetch failed", err);
  }
  render();
}

function render() {
  document.getElementById("title").textContent = summary.title || FALLBACK.title;
  const t = summary.totals || FALLBACK.totals;
  document.getElementById("m-total").textContent = t.total;
  document.getElementById("m-passed").textContent = t.passed;
  document.getElementById("m-failed").textContent = t.failed;
  document.getElementById("m-broken").textContent = t.broken;

  const visible = suites.filter((s) => filter === "all" || s.status === filter);
  window.StaticQaChart.render(document.getElementById("chart"), visible.length ? visible : suites);

  const list = document.getElementById("suites");
  list.innerHTML = "";
  visible.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<div><div class="suite-name">${s.name}</div>` +
      `<div class="suite-meta">${s.passed} passed · ${s.failed} failed · ${s.broken} broken</div></div>` +
      `<span class="status ${s.status}">${s.status}</span>`;
    list.appendChild(li);
  });
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    filter = chip.dataset.filter;
    render();
  });
});

boot();
