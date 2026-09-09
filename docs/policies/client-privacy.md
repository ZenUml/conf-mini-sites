# Client privacy — no client names in public files

## Policy

The names of specific Confluence client tenants (customer subdomain prefixes, full hostnames matching
`<customer>.atlassian.net`, customer-named page titles, customer-specific `cloudId`s, contact names and
email addresses) **MUST NOT appear in any file checked into this public repo** — code, docs, comments,
JSDoc, help text, fixtures, snapshots, ADRs, research notes, runbook examples, commit messages.

This repo is public; client identities are not.

## Where client-naming artifacts go

The shared private handbook `ZenUml/conf-app-private` is mounted as a git submodule at `private/`
(branch `handbook-ops-console`). It is shared by every Confluence app P&D VISION ships, because the
customers, the vendor account, the support mailbox and the Mixpanel project are shared. Mini Sites
material sits under `private/apps/mini-sites/`.

| Artifact | Public path | Private path |
|---|---|---|
| Per-tenant profile (licence, cloud id, usage, contact, what happened) | — | `private/apps/mini-sites/client-profiles/<site>.md`; a tenant that is also a ZenUML customer has a JSON in `private/client-profiles/data/` with a `miniSites` block instead |
| Customer emails sent | — | `private/apps/mini-sites/operations/outreach-log.md` + `private/apps/mini-sites/support/emails/` |
| Atlassian review / security-questionnaire notes | — | `private/apps/mini-sites/operations/atlassian-review.md` |
| Regression specs for a customer-reported defect | `tests/e2e/**` with a generic comment | link the profile from the comment, as `tests/e2e/ui/large-bundle.spec.ts` does |

## When writing new code or docs

- Use placeholders (`acme.atlassian.net`, `example-tenant`, `tenant-a`) in examples, JSDoc and tests.
  Our own sites (`lite-dev`, `lite-stg`, `minisites-dev`, `minisites-prod`, `async-prd`) are fine to name.
- Customer **content** — uploaded bundles, file names, page bodies — is never committed anywhere, the
  `private/` submodule included. The Workers never store a bundle that failed validation, and we do
  not copy served bundles out of Cloudflare.
- If a public doc needs a worked example with a real tenant, put the example under `private/` and link
  it from the public doc with a one-line summary that names no tenant.

## Pre-commit discovery check

```bash
git grep -nE '[a-z0-9][a-z0-9-]+\.atlassian\.net' -- . ':!private' ':!node_modules' \
  | grep -ivE '(zenuml|whimet|lite-stg|lite-dev|dia-stg|full-stg|minisites-dev|minisites-prod|async-prd|acme|example|tenant|demo|<)'
```

Expected output: empty. Any hit is a real customer hostname — move it under `private/` or replace it
with a placeholder. Also grep for the tenant's bare name and contact email before committing.

## Working with the submodule

```bash
git submodule update --init private          # first checkout
git -C private pull                          # pick up profiles written from another checkout
git -C private add <your paths> && git -C private commit && git -C private push   # stage only your paths
git add private && git commit -m "private: bump handbook pin"                      # then move the pin
```

Other sessions leave uncommitted work in the handbook checkout; never `git add -A` there.
