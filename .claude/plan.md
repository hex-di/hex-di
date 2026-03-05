# CI/CD for Cloudflare Pages — Implementation Plan

## Overview

Replace GitHub Pages deployment with Cloudflare Pages for 12 sites (1 core + 11 libraries). Use Wrangler CLI for project setup and GitHub Actions for automated deploy with change detection.

## Files to Create/Modify

### 1. `scripts/setup-cloudflare.sh` (NEW)

One-time setup script that:

- Creates 12 Cloudflare Pages projects via `wrangler pages project create`
- Configures custom domains for each:
  - `hexdi-dev` → `hexdi.dev`
  - `result-hexdi-dev` → `result.hexdi.dev`
  - `flow-hexdi-dev` → `flow.hexdi.dev`
  - (etc. for all 11 libraries)
- Requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` env vars
- Idempotent (safe to re-run)

### 2. `.github/workflows/deploy-websites.yml` (NEW)

Main deployment workflow:

- **Trigger**: push to `main` on paths `websites/**`, `docs/**`, `presentations/**`; plus `workflow_dispatch`
- **Change detection job**: Uses `git diff` to determine which sites changed
  - `websites/theme/**` changes → rebuild ALL sites
  - `docs/**` changes → rebuild `core` only
  - `presentations/**` changes → rebuild `core` only
  - `websites/<name>/**` changes → rebuild only that site
  - `workflow_dispatch` → rebuild all
- **Build job**: Matrix over changed sites only
  - Install deps once, build specific site with `pnpm --filter @hex-di/website-<id> build`
  - For core: run presentations build first
  - Upload `build/` as artifact
- **Deploy job**: Matrix over changed sites
  - Download artifact
  - Deploy via `npx wrangler pages deploy build/ --project-name=<project>`
- **Secrets needed**: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

### 3. `scripts/build-presentations.mjs` (MODIFY)

Update paths from `website/` → `websites/core/`:

- `website/presentations.json` → `websites/core/presentations.json`
- `website/static/presentations` → `websites/core/static/presentations`
- Base URL from `/hex-di/presentations/<id>/` → `/presentations/<id>/`

### 4. `.github/workflows/deploy-docs.yml` (DELETE)

Remove the old GitHub Pages workflow — replaced by `deploy-websites.yml`.

## DNS Setup (Manual — Cloudflare Dashboard)

After running the setup script:

1. Add `hexdi.dev` domain to Cloudflare (if not already)
2. Create DNS records:
   - `hexdi.dev` → CNAME to `hexdi-dev.pages.dev`
   - `*.hexdi.dev` → CNAME to catch-all (or individual CNAMEs per subdomain)
3. Each CF Pages project's custom domain gets auto-verified via Cloudflare DNS

## Project Name Convention

| Site        | CF Project Name         | Custom Domain           |
| ----------- | ----------------------- | ----------------------- |
| core        | `hexdi-dev`             | `hexdi.dev`             |
| result      | `result-hexdi-dev`      | `result.hexdi.dev`      |
| flow        | `flow-hexdi-dev`        | `flow.hexdi.dev`        |
| guard       | `guard-hexdi-dev`       | `guard.hexdi.dev`       |
| saga        | `saga-hexdi-dev`        | `saga.hexdi.dev`        |
| query       | `query-hexdi-dev`       | `query.hexdi.dev`       |
| store       | `store-hexdi-dev`       | `store.hexdi.dev`       |
| logger      | `logger-hexdi-dev`      | `logger.hexdi.dev`      |
| tracing     | `tracing-hexdi-dev`     | `tracing.hexdi.dev`     |
| clock       | `clock-hexdi-dev`       | `clock.hexdi.dev`       |
| crypto      | `crypto-hexdi-dev`      | `crypto.hexdi.dev`      |
| http-client | `http-client-hexdi-dev` | `http-client.hexdi.dev` |
