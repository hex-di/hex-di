#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Cloudflare Pages — One-time project setup
#
# Discovers sites from websites/*/deploy.json files.
#
# Prerequisites:
#   export CLOUDFLARE_ACCOUNT_ID="your-account-id"
#   export CLOUDFLARE_API_TOKEN="your-api-token"
#   npm install -g wrangler   (or npx wrangler)
#
# Usage:
#   bash scripts/setup-cloudflare.sh
# ============================================================

: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Cloudflare Pages Setup ==="
echo ""

for config in "$REPO_ROOT"/websites/*/deploy.json; do
  dir=$(dirname "$config")
  site_id=$(basename "$dir")
  project=$(jq -r '.project' "$config")
  custom_domain=$(jq -r '.domain' "$config")

  echo "--- ${site_id} → ${project} (${custom_domain}) ---"

  # Create project (idempotent — wrangler prints error if exists, that's fine)
  if npx wrangler pages project create "$project" \
    --production-branch main 2>/dev/null; then
    echo "  Created project: ${project}"
  else
    echo "  Project already exists: ${project}"
  fi

  # Add custom domain
  if npx wrangler pages project add-domain "$project" "$custom_domain" 2>/dev/null; then
    echo "  Added domain: ${custom_domain}"
  else
    echo "  Domain already configured: ${custom_domain}"
  fi

  echo ""
done

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Ensure your domain is added to your Cloudflare account"
echo "  2. Verify DNS records are configured (CNAMEs to *.pages.dev)"
echo "  3. Add GitHub secrets:"
echo "     - CLOUDFLARE_ACCOUNT_ID"
echo "     - CLOUDFLARE_API_TOKEN"
echo "  4. Push to main to trigger the deploy workflow"
