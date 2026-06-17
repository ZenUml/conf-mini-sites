// Central config for the e2e suite. Non-secret defaults target the deployed DEV stack on lite-dev; secrets +
// the Atlassian login come from env (see tests/e2e/README.md). Getters throw only when a spec actually needs
// that credential, so API-only runs don't require the login creds and vice-versa.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} — see tests/e2e/README.md (source conf-app/.env.forge.local + conf-app/tests/e2e-tests/.env, and export CONTROL_SHARED_SECRET).`);
  return v;
}

export const E2E = {
  // Confluence target
  site: process.env.E2E_SITE || 'lite-dev.atlassian.net',
  spaceKey: process.env.E2E_SPACE_KEY || 'SD',
  spaceId: process.env.E2E_SPACE_ID || '196754',
  cloudId: process.env.E2E_CLOUD_ID || 'bc8bb5b3-09d2-4932-b68c-9b56fab8e34a',
  // Forge app identity (manifest app id + dev environment)
  appId: process.env.E2E_FORGE_APP_ID || '2efdb7d9-ee5a-4294-b56a-b514e36e1a98',
  envId: process.env.E2E_FORGE_ENV_ID || 'f69f8404-376e-4a05-9d34-c8d53785db66',
  macroKey: 'mini-site',
  // Cloudflare Workers (dev)
  controlUrl: (process.env.CONTROL_URL || 'https://conf-mini-sites-remote-dev.zenuml.workers.dev').replace(/\/+$/, ''),
  dispatchUrl: (process.env.DISPATCH_URL || 'https://conf-mini-sites-dispatch-dev.zenuml.workers.dev').replace(/\/+$/, ''),

  baseUrl(): string { return `https://${this.site}`; },

  // Secrets / credentials (lazy)
  get controlSecret(): string { return req('CONTROL_SHARED_SECRET'); },
  get forgeEmail(): string { return req('FORGE_EMAIL'); },
  get forgeApiToken(): string { return req('FORGE_API_TOKEN'); },
  get loginUser(): string { return req('ZENUML_STAGE_USERNAME'); },
  get loginPass(): string { return req('ZENUML_STAGE_PASSWORD'); },
  get otpSecret(): string { return req('ATLASSIAN_OTP'); },
};

export const AUTH_STATE = 'tests/e2e/.auth/state.json';
