# P-1 recording-site proposal — Owner decision required

Prepared: 2026-08-04

Decision scope: tenant name and space topology only

Execution status: **blocked — no Atlassian site, app installation, space, page, account, or permission change is authorized by this document**

## Recommendation

Use one clean Confluence Cloud tenant in the Owner-specified `minisites-prod` organization:

- Preferred site URL: **`work-artifacts-demo.atlassian.net`**.
- Site display name: **Work Artifacts Demo**.
- Fallback URL order if the preferred name is unavailable at the time of an Owner-authorized availability check:
  1. `team-artifacts-demo.atlassian.net`
  2. `interactive-work-demo.atlassian.net`
- App environment: **production** Mini Sites only. Do not install development or staging variants.

The preferred name is neutral and readable on camera. It names the type of work being demonstrated without exposing `lite-dev`, an environment label, an internal project, a personal identity, or the Mini Sites product name. Availability has not been checked because registration/login and cloud changes are outside the current authorization.

## Recommended space topology

Use one dedicated space per stocked episode. This costs a little more setup than one shared space, but it satisfies the recording rule that the visible page tree contains only the current episode’s material and reduces reliance on post-capture masking.

| Space key | Space name | Initial page tree | Recording purpose |
|---|---|---|---|
| `PRODUCT` | Product Decisions | `Feature Prioritisation` | W0-1 folder workflow with `promo/site/` |
| `QUALITY` | Quality Reports | `Release QA Report` | W0-2 accepted offline Allure fixture |
| `WEB` | Web Content Options | `Choose an HTML Path` → `Snippet`, `Hosted URL`, `Single File`, `Folder` | W0-5 four-way chooser; every child is episode-specific |

Structure rules:

- Do not create an `OPS`, scratch, internal-test, or fixture-management space on the recording tenant.
- Keep fixture source and production notes in Git, not in the visible Confluence page tree.
- Use human-facing page names only; do not put W0 IDs, environment names, ticket IDs, or customer names on screen.
- Create only the pages required by an Owner-approved canonical script. Unused draft pages should not exist on the site.
- Before each take, verify that the current space sidebar contains only the episode pages above and that global recent/history surfaces do not reveal unrelated content.

## Site and data boundary

- No anonymous/public access. Initial access should be limited to the Owner-designated recording operator(s) and the production app.
- No real customer artifacts, employee workspaces, support cases, emails, or credentials.
- Use only checked-in, secret-scanned fixtures approved for publication.
- Mask the account trigger, avatar, space sidebar, and other-vendor badges with selectors probed from the live recording site as required by `docs/video/safety.md`.
- Do not show a live signed serve URL. If a URL is needed as evidence, use an expired grant or an approved mask.
- A separate viewer account or guest for a permissions demonstration is not part of this proposal. Adding one requires its own Owner decision.

## Provisioning sequence after separate execution authorization

This is a review checklist, not an authorization to execute:

1. Owner confirms the preferred/fallback tenant name and per-episode-space topology.
2. Owner separately authorizes an operator to check tenant availability and create the selected site under `minisites-prod`.
3. Owner separately authorizes installation of the production Mini Sites app.
4. The operator creates only the approved spaces/pages and records the exact site/app versions.
5. The video producer runs a privacy-selector probe and a disposable dry run; no public capture is approved yet.
6. mini-sites-dev confirms the installed production behavior needed by the episode, including T01 status for any one-file claim.
7. The episode proceeds through script gate ①, Picture Lock gate ②, and upload gate ③ independently.

## Alternative considered

One shared space named `Work Artifacts` with three episode roots would reduce setup. It is not recommended because unrelated episode names would appear in the page tree during capture, making privacy depend more heavily on masking and increasing reset mistakes between takes.

## Owner decision requested

Approve one of these design choices only:

1. **Recommended:** `work-artifacts-demo.atlassian.net` (fallbacks in the listed order), with separate `PRODUCT`, `QUALITY`, and `WEB` spaces.
2. **Lower-setup alternative:** the same tenant naming order, with one shared `WORK` space and one root per episode.
3. Request a different neutral tenant name or topology.

Approval of this proposal does **not** authorize site creation, login, app installation, permission changes, or any other cloud action.
