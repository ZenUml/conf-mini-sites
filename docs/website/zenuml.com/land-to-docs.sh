#!/usr/bin/env bash
# Land Mini Sites SEO pages on ZenUml/docs (requires write access).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
WORKDIR="${TMPDIR:-/tmp}/zenuml-docs-land-$$"
git clone --depth 1 git@github.com:ZenUml/docs.git "$WORKDIR"
# fallback https
if [[ ! -d "$WORKDIR/.git" ]]; then
  git clone --depth 1 https://github.com/ZenUml/docs.git "$WORKDIR"
fi
cd "$WORKDIR"
BRANCH="cursor/mini-sites-seo-pages-2d64"
git checkout -b "$BRANCH"
cp "$ROOT"/src/pages/*.md src/pages/
mkdir -p static/img/mini-sites
cp -a "$ROOT"/static/img/mini-sites/. static/img/mini-sites/
cp "$ROOT"/docs/products/mini-sites-for-confluence.md docs/products/
git add src/pages static/img/mini-sites docs/products/mini-sites-for-confluence.md
git commit -m "content: Mini Sites SEO pillars with Confluence screenshots and GIF"
git push -u origin "$BRANCH"
gh pr create --repo ZenUml/docs --base main --head "$BRANCH" \
  --title "Mini Sites SEO content pillars (screenshots + GIF)" \
  --body "$(cat <<'BODY'
## Summary
Ships research-backed SEO pages for Mini Sites for Confluence onto zenuml.com.

### New pages
- `/embed-allure-report-in-confluence/`
- `/confluence-cloud-html-macro/`
- `/mini-sites-security-and-limits/`
- `/publish-chatgpt-html-to-confluence/`
- `/fix-broken-html-embed-in-confluence/`
- `/embed-plotly-in-confluence/`

### Updated
- `/mini-sites/`, `/embed-html-in-confluence/`, `/best-html-macro-alternative-for-confluence/`
- `/docs/products/mini-sites-for-confluence/`

### Media
Confluence-in-context stills + `publish-to-live.gif` under `/img/mini-sites/`.
YouTube demo retained (`vQfuQDDDXs8`).

Source package: `ZenUml/conf-mini-sites` → `docs/website/zenuml.com/`
BODY
)"
echo "Open the PR, merge to main, wait for docs deploy → https://zenuml.com/mini-sites/"
