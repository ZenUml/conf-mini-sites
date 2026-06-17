// Auth setup project — logs into Atlassian once (TOTP) and saves storageState the `ui` project reuses.
import { test as setup } from '@playwright/test';
import type { Browser } from '@playwright/test';
import fs from 'node:fs';
import { atlassianLogin } from '../helpers/login';
import { AUTH_STATE, E2E } from '../helpers/env';

// Is the saved storageState still a live session? CI restores AUTH_STATE from a daily cache so it can be a day
// old; the Atlassian session lasts ~30 days (almost always valid), but a revoked/expired one must self-heal into
// a fresh login instead of failing every UI spec. Open the cached state in a throwaway context and confirm we're
// not bounced to id.atlassian.com / a /login path.
async function isCachedSessionLive(browser: Browser): Promise<boolean> {
  const ctx = await browser.newContext({ storageState: AUTH_STATE });
  try {
    const page = await ctx.newPage();
    await page.goto(`${E2E.baseUrl()}/wiki`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return !/id\.atlassian\.com|\/login/.test(page.url());
  } catch {
    return false; // any nav/timeout error ⇒ treat as stale
  } finally {
    await ctx.close();
  }
}

setup('authenticate', async ({ page, browser }) => {
  // Reuse an existing/cached auth state — but only if its session is still live.
  if (fs.existsSync(AUTH_STATE)) {
    if (await isCachedSessionLive(browser)) {
      console.log('✅ Cached session is live — skipping login');
      return;
    }
    console.log('⚠️ Cached session is stale — deleting and re-authenticating');
    fs.rmSync(AUTH_STATE, { force: true });
  }
  await atlassianLogin(page);
  await page.context().storageState({ path: AUTH_STATE });
});
