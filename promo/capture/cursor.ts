// Synthetic cursor. Playwright's recorded video contains NO mouse pointer — the real pointer is an OS
// artifact the compositor never draws into the screencast. Every "the cursor moves to X and clicks"
// shot in the promo script is therefore impossible unless we draw one ourselves.
//
// Design notes that matter for the footage:
//  - The cursor lives ONLY in the top frame, drawn above everything (max z-index, pointer-events:none).
//    We never inject it into the Forge/dispatch iframes, because Playwright's `boundingBox()` already
//    reports coordinates relative to the MAIN frame even for elements nested inside cross-origin
//    iframes — so one top-frame cursor can point at anything on screen.
//  - Motion is eased (easeInOutCubic) and slow enough to read at 30fps. The director's note "no fast
//    flicks, no circling" is enforced here, not left to the caller.
//  - A click is a two-stage tell: a ~260ms dwell (nothing moves — this is what makes a click feel
//    deliberate on film) then a ripple that expands and fades over 400ms.
//
// The script is a STRING, not a function, and that is load-bearing. Handing Playwright a TypeScript
// arrow function means shipping whatever the transpiler emitted: tsx/esbuild rewrites named functions
// through a `__name()` helper that exists in Node and not in the page, so the injected script died with
// "__name is not defined", `window.__promoCursor` was never defined, and every glide silently
// no-opped — the capture still "succeeded", it just had no cursor in it. A string cannot be rewritten.
import type { Page } from '@playwright/test';

export const CURSOR_INIT = `
(() => {
  if (window.__promoCursor) return;

  var easeInOutCubic = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  var state = { x: -100, y: -100 };
  var root = null;
  var arrow = null;

  function build() {
    if (root || !document.body) return;
    root = document.createElement('div');
    root.setAttribute('data-promo-cursor', '');
    root.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    arrow = document.createElement('div');
    arrow.style.cssText =
      'position:absolute;left:0;top:0;width:24px;height:24px;transform:translate(-100px,-100px);' +
      'will-change:transform;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));';
    arrow.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M5 2 L5 18.5 L9.2 14.6 L11.9 20.8 L14.8 19.5 L12.1 13.4 L17.8 13.1 Z" ' +
      'fill="#ffffff" stroke="#1a1a1a" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    root.appendChild(arrow);
    document.documentElement.appendChild(root);
    apply();
  }

  function apply() {
    if (arrow) arrow.style.transform = 'translate(' + state.x + 'px, ' + state.y + 'px)';
  }

  window.__promoCursor = {
    place: function (x, y) {
      build();
      state.x = x; state.y = y;
      apply();
    },
    moveTo: function (x, y, duration) {
      build();
      var sx = state.x, sy = state.y, dx = x - sx, dy = y - sy;
      if (duration <= 0 || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
        state.x = x; state.y = y; apply();
        return Promise.resolve();
      }
      return new Promise(function (resolve) {
        var t0 = performance.now();
        var step = function (now) {
          var p = Math.min(1, (now - t0) / duration);
          var e = easeInOutCubic(p);
          state.x = sx + dx * e; state.y = sy + dy * e;
          apply();
          if (p < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    ripple: function () {
      build();
      if (!root) return Promise.resolve();
      var r = document.createElement('div');
      r.style.cssText =
        'position:absolute;left:' + state.x + 'px;top:' + state.y + 'px;width:14px;height:14px;margin:-7px 0 0 -7px;' +
        'border-radius:50%;border:2px solid rgba(76,29,149,.85);background:rgba(124,58,237,.22);' +
        'transform:scale(.35);opacity:1;transition:transform .4s cubic-bezier(.2,.7,.3,1),opacity .4s linear;';
      root.appendChild(r);
      requestAnimationFrame(function () {
        r.style.transform = 'scale(2.6)';
        r.style.opacity = '0';
      });
      return new Promise(function (resolve) {
        setTimeout(function () { r.remove(); resolve(); }, 420);
      });
    },
    hide: function () { if (arrow) arrow.style.opacity = '0'; },
    show: function () { if (arrow) arrow.style.opacity = '1'; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
`;

/** Throws if the injected script never took — the failure mode that produced a cursor-less capture. */
export async function assertCursorInstalled(page: Page): Promise<void> {
  const ok = await page.evaluate(`typeof window.__promoCursor === 'object'`);
  if (!ok) throw new Error('synthetic cursor is not installed on this page — captures would have no pointer');
}

/** Move the drawn cursor AND the real Playwright mouse together, so hover states fire under the arrow. */
export async function cursorTo(page: Page, x: number, y: number, duration = 620): Promise<void> {
  await page.evaluate(`window.__promoCursor.moveTo(${x}, ${y}, ${duration})`);
  await page.mouse.move(x, y);
}

/** Dwell then ripple. The dwell is the director's 0.2–0.4s pre-click pause — do not shorten it. */
export async function cursorClickFeedback(page: Page, dwellMs = 260): Promise<void> {
  await page.waitForTimeout(dwellMs);
  await page.evaluate(`window.__promoCursor.ripple()`);
}

export async function cursorPlace(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(`window.__promoCursor.place(${x}, ${y})`);
  await page.mouse.move(x, y);
}
