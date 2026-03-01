#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Cloudflare Pages — One-time project setup
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

DOMAIN="hexdi.dev"

declare -A SITES=(
  [core]="hexdi-dev"
  [result]="result-hexdi-dev"
  [flow]="flow-hexdi-dev"
  [guard]="guard-hexdi-dev"
  [saga]="saga-hexdi-dev"
  [query]="query-hexdi-dev"
  [store]="store-hexdi-dev"
  [logger]="logger-hexdi-dev"
  [tracing]="tracing-hexdi-dev"
  [clock]="clock-hexdi-dev"
  [crypto]="crypto-hexdi-dev"
  [http-client]="http-client-hexdi-dev"
)

declare -A DOMAINS=(
  [core]="hexdi.dev"
  [result]="result.hexdi.dev"
  [flow]="flow.hexdi.dev"
  [guard]="guard.hexdi.dev"
  [saga]="saga.hexdi.dev"
  [query]="query.hexdi.dev"
  [store]="store.hexdi.dev"
  [logger]="logger.hexdi.dev"
  [tracing]="tracing.hexdi.dev"
  [clock]="clock.hexdi.dev"
  [crypto]="crypto.hexdi.dev"
  [http-client]="http-client.hexdi.dev"
)

echo "=== Cloudflare Pages Setup for ${DOMAIN} ==="
echo ""

for site_id in "${!SITES[@]}"; do
  project="${SITES[$site_id]}"
  custom_domain="${DOMAINS[$site_id]}"

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
echo "  1. Ensure ${DOMAIN} is added to your Cloudflare account"
echo "  2. Verify DNS records are configured:"
echo "     - hexdi.dev → CNAME hexdi-dev.pages.dev"
echo "     - *.hexdi.dev → individual CNAMEs or use Cloudflare DNS proxy"
echo "  3. Add GitHub secrets:"
echo "     - CLOUDFLARE_ACCOUNT_ID"
echo "     - CLOUDFLARE_API_TOKEN"
echo "  4. Push to main to trigger the deploy workflow"
