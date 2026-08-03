# Landing Mini Sites SEO pages on zenuml.com

**Target repo:** [ZenUml/docs](https://github.com/ZenUml/docs) (Docusaurus → https://zenuml.com)  
**This folder:** publish-ready copies that match live page style under `src/pages/` and `docs/products/`.

> The conf-mini-sites cloud agent **cannot push** to `ZenUml/docs` (403). Land these with a human or a docs-repo agent that has write access.

## Preview (ephemeral)

A Cloudflare quick-tunnel preview was built from this package on **2026-08-03**:

**https://contracts-eyed-hall-merit.trycloudflare.com/**

Example paths:
- `/mini-sites/`
- `/embed-allure-report-in-confluence/`
- `/confluence-cloud-html-macro/`
- `/mini-sites-security-and-limits/`
- `/publish-chatgpt-html-to-confluence/`
- `/fix-broken-html-embed-in-confluence/`
- `/embed-plotly-in-confluence/`

This URL dies when the agent tunnel stops — it is **not** zenuml.com staging. Production still needs a PR to `ZenUml/docs`.

## Already live (updated here — replace in docs)

| Site URL | File |
|---|---|
| `/mini-sites/` | `src/pages/mini-sites.md` |
| `/embed-html-in-confluence/` | `src/pages/embed-html-in-confluence.md` |
| `/best-html-macro-alternative-for-confluence/` | `src/pages/best-html-macro-alternative-for-confluence.md` |
| `/docs/products/mini-sites-for-confluence/` | `docs/products/mini-sites-for-confluence.md` |

## New pages (add to docs `src/pages/`)

| Cluster | Site URL | File |
|---|---|---|
| C04 | `/embed-allure-report-in-confluence/` | `embed-allure-report-in-confluence.md` |
| C03 | `/confluence-cloud-html-macro/` | `confluence-cloud-html-macro.md` |
| C07 | `/mini-sites-security-and-limits/` | `mini-sites-security-and-limits.md` |
| C02 | `/publish-chatgpt-html-to-confluence/` | `publish-chatgpt-html-to-confluence.md` |
| C10 | `/fix-broken-html-embed-in-confluence/` | `fix-broken-html-embed-in-confluence.md` |
| C09 | `/embed-plotly-in-confluence/` | `embed-plotly-in-confluence.md` |

Docusaurus maps `src/pages/foo.md` → `https://zenuml.com/foo/`.

## One-shot land command (on a machine with docs write access)

```bash
git clone git@github.com:ZenUml/docs.git && cd docs
git checkout -b cursor/mini-sites-seo-pages-2d64
SRC=/path/to/conf-mini-sites/docs/website/zenuml.com
cp "$SRC"/src/pages/*.md src/pages/
cp "$SRC"/docs/products/mini-sites-for-confluence.md docs/products/
git add src/pages docs/products/mini-sites-for-confluence.md
git commit -m "content: Mini Sites SEO pillars (Allure, migration, security, AI, path-404)"
git push -u origin HEAD
gh pr create --title "Mini Sites SEO content pillars" --body "Adds research-backed SEO pages for Mini Sites. Source: conf-mini-sites docs/website/zenuml.com."
```

## Media assets

Under `static/img/mini-sites/` (served as `/img/mini-sites/…`):

| File | Shows |
|---|---|
| `live-on-confluence-page.jpg` | Interactive prototype **on a Confluence page** (chrome + PRD) |
| `release-dashboard-on-confluence.jpg` | Multi-file dashboard on Confluence (relative paths) |
| `publish-folder.jpg` / `validated-scanned.jpg` | Publisher modal |
| `publish-to-live.gif` | Folder → publish → live (~6s loop) |
| YouTube `vQfuQDDDXs8` | 35s real capture (also Marketplace hero) |

## Research mapping

See `docs/research/market-opportunity-2026-08/03_seo_content_map.csv`.  
Sample CTA target: `samples/static-qa-report/` in conf-mini-sites.
