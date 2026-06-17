// Tiny interactive behaviour so a spot-check can confirm the bundle's JS actually runs inside the served iframe
// (not just that the HTML/CSS rendered). The counter increments on click — a clear pass/fail visual signal.
let n = 0;
const el = document.getElementById("n");
document.getElementById("inc").onclick = () => (el.textContent = ++n);
document.getElementById("dec").onclick = () => (el.textContent = --n);
