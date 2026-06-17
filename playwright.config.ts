import { defineConfig, devices } from '@playwright/test';
import { AUTH_STATE } from './tests/e2e/helpers/env';

// Two flavours of e2e:
//  • `api`  — hits the deployed control + dispatch Workers (shared-secret auth); no browser, no Atlassian login.
//  • `ui`   — drives the Forge macro on a real Confluence page; depends on the `setup` project for auth state.
// Run all: `npx playwright test`. API only: `npx playwright test --project=api`. See tests/e2e/README.md for env.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts$/ },
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts$/ },
    {
      name: 'ui',
      testMatch: /ui\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE },
    },
  ],
});
