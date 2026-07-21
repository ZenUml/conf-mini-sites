import { chromium } from '@playwright/test';
import { CURSOR_INIT } from '../capture/cursor';

async function main() {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 800, height: 600 } });
  await c.addInitScript(CURSOR_INIT);
  const p = await c.newPage();
  const errs: string[] = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await p.goto('data:text/html,<body style="background:%23eee"><h1>hi</h1></body>');
  console.log('__promoCursor typeof:', await p.evaluate(() => typeof (window as any).__promoCursor));
  console.log('cursor node present:', await p.evaluate(() => !!document.querySelector('[data-promo-cursor]')));
  const t0 = Date.now();
  const r = await p.evaluate(() => (window as any).__promoCursor?.moveTo(400, 300, 600) ?? 'NO-API');
  console.log('moveTo returned:', r, 'elapsed ms:', Date.now() - t0);
  console.log('errors:', errs);
  await b.close();
}
main();
