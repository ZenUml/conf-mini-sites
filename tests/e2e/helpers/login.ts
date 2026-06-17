// Atlassian login (username → password → TOTP) for the e2e UI project. Used by the auth setup project to mint a
// reusable storageState. NOTE: fresh login can hit reCAPTCHA in a brand-new context; the saved storageState is
// what keeps UI specs fast/stable (re-run the setup project to refresh it when cookies expire).
import type { Page } from '@playwright/test';
import { E2E } from './env';
import { generateOtp } from './otp';

export async function atlassianLogin(page: Page): Promise<void> {
  // Land on a wiki URL → redirect (async) to id.atlassian.com login. WAIT for the username field to appear —
  // an immediate count() check fires mid-redirect before the form renders and would wrongly skip login.
  await page.goto(`${E2E.baseUrl()}/wiki`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForSelector('input[name=username]', { timeout: 25000 });
  } catch {
    return; // no login form within 25s ⇒ already authenticated
  }

  await page.fill('input[name=username]', E2E.loginUser);
  await page.click('#login-submit');

  await page.waitForSelector('input[name=password]', { timeout: 30000 });
  await page.fill('input[name=password]', E2E.loginPass);
  await page.click('#login-submit');

  // MFA (TOTP) — codes rotate every 30s, so retry across windows.
  await page.waitForSelector('#two-step-verification-otp-code-input', { timeout: 30000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.fill('#two-step-verification-otp-code-input', generateOtp());
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForTimeout(5000);
    if (!(await page.locator('#two-step-verification-otp-code-input').count())) break;
    await page.waitForTimeout(15000);
  }
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});

  // Land back on the tenant so the tenant.session.token cookie is set + captured by storageState (otherwise a
  // fresh context redirects to the login wall). Verify we're actually authed — fail loudly if reCAPTCHA blocked.
  await page.goto(`${E2E.baseUrl()}/wiki`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  if (await page.locator('input[name=username], input[name=password]').count()) {
    throw new Error('Atlassian login did not complete — still at the login wall (reCAPTCHA may have blocked the headless login). Refresh tests/e2e/.auth/state.json from a real browser session.');
  }
}
