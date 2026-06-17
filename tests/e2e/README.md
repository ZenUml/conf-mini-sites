# Conf Mini-Sites — e2e tests

Playwright e2e for the deployed **dev** stack. Two projects:

- **`api`** — hits the deployed control + dispatch Workers directly (shared-secret auth). No browser, no Atlassian login. Fast, deterministic (modulo the control Worker's `WFP_API_TOKEN` validity for provisioning).
- **`ui`** — drives the Forge **Mini-Site** macro on a real Confluence page (lite-dev). Depends on the `setup` project, which logs in once (TOTP) and saves `tests/e2e/.auth/state.json`.

## Required env

| Var | Used by | Source |
|-----|---------|--------|
| `CONTROL_SHARED_SECRET` | api + ui | the value set as the control/dispatch Worker secret (dev: `/tmp/control-secret.txt`) |
| `FORGE_EMAIL`, `FORGE_API_TOKEN` | confluence REST (page create/delete) | `~/workspaces/zenuml/conf-app/.env.forge.local` |
| `ZENUML_STAGE_USERNAME`, `ZENUML_STAGE_PASSWORD`, `ATLASSIAN_OTP` | `ui` login (setup) | `~/workspaces/zenuml/conf-app/tests/e2e-tests/.env` |

Optional overrides: `E2E_SITE` (default `lite-dev.atlassian.net`), `E2E_SPACE_ID` (`196754`), `E2E_CLOUD_ID`, `E2E_FORGE_ENV_ID`, `CONTROL_URL`, `DISPATCH_URL`.

## Run

```bash
# from conf-app, load the Atlassian creds, then point at this repo:
set -a; source ~/workspaces/zenuml/conf-app/.env.forge.local; source ~/workspaces/zenuml/conf-app/tests/e2e-tests/.env; set +a
export CONTROL_SHARED_SECRET=$(cat /tmp/control-secret.txt)

npx playwright test --project=api          # backend only (no login)
npx playwright test --project=ui           # full Confluence UI flow (logs in first)
npx playwright test                         # everything
npx playwright test --list                  # collection check (no network)
```

Notes:
- Fresh login can hit reCAPTCHA in a cold context; the saved `state.json` avoids it on subsequent runs. Delete it + re-run to refresh.
- `ui` specs create throwaway pages in space `SD` and delete them in teardown.
