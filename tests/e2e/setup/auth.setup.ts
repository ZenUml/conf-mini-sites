// Auth setup project — logs into Atlassian once (TOTP) and saves storageState the `ui` project reuses.
import { test as setup } from '@playwright/test';
import { atlassianLogin } from '../helpers/login';
import { AUTH_STATE } from '../helpers/env';

setup('authenticate', async ({ page }) => {
  await atlassianLogin(page);
  await page.context().storageState({ path: AUTH_STATE });
});
