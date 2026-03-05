#!/usr/bin/env bash
#
# verify-traceability.sh
#
# Automated traceability verification for the SpecForge specification.
# Adapted for BEH-SF-NNN / INV-SF-N / ADR-NNN / FM-SF-NNN ID schemes.
#
# Usage: ./spec/specforge/scripts/verify-traceability.sh
#
# Exit code: 0 if all checks pass, 1 if any check fails.

set -euo pipefail

SPEC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo "=== SpecForge Traceability Verification ==="
echo "Spec directory: $SPEC_DIR"
echo ""

# ---------------------------------------------------------------------------
# Check 1: Spec file existence — all files in overview.md Document Map exist
# ---------------------------------------------------------------------------
echo "--- Check 1: Spec File Existence ---"
# Extract relative paths from markdown links in overview.md
grep -oE '\]\(\./[^)]+\)' "$SPEC_DIR/overview.md" | \
  sed 's/^](.\///' | sed 's/)$//' | \
  sort -u | while read -r relpath; do
    filepath="$SPEC_DIR/$relpath"
    if [ ! -f "$filepath" ]; then
      echo "  MISSING: $relpath (referenced in overview.md)"
      ERRORS=$((ERRORS + 1))
    fi
  done
echo "  Done."
echo ""

# ---------------------------------------------------------------------------
# Check 2: Invariant completeness — every INV-SF-N in invariants/*.md appears
#           in traceability/
# ---------------------------------------------------------------------------
echo "--- Check 2: Invariant Completeness ---"
inv_ids=$(grep -rohE 'INV-SF-[0-9]+' "$SPEC_DIR"/invariants/INV-SF-*.md | sort -u)
for inv in $inv_ids; do
  if ! grep -rq "$inv" "$SPEC_DIR/traceability/"; then
    echo "  MISSING: $inv not found in traceability/"
    ERRORS=$((ERRORS + 1))
  fi
done
echo "  Done. ($(echo "$inv_ids" | wc -w | tr -d ' ') invariants checked)"
echo ""

# ---------------------------------------------------------------------------
# Check 3: ADR completeness — every decisions/ADR-*.md is referenced in
#           traceability/
# ---------------------------------------------------------------------------
echo "--- Check 3: ADR Completeness ---"
adr_count=0
for adr_file in "$SPEC_DIR"/decisions/ADR-*.md; do
  basename=$(basename "$adr_file")
  if ! grep -rq "$basename" "$SPEC_DIR/traceability/"; then
    echo "  MISSING: decisions/$basename not referenced in traceability/"
    ERRORS=$((ERRORS + 1))
  fi
  adr_count=$((adr_count + 1))
done
echo "  Done. ($adr_count ADRs checked)"
echo ""

# ---------------------------------------------------------------------------
# Check 4: BEH-SF ID uniqueness — no duplicate IDs across behavior files
#           Only match definition headers (## BEH-SF-NNN:) to avoid counting
#           cross-references as duplicates.
# ---------------------------------------------------------------------------
echo "--- Check 4: BEH-SF ID Uniqueness ---"
duplicates=$(grep -ohE '^## BEH-SF-[0-9]{3}:' "$SPEC_DIR"/behaviors/BEH-SF-*.md | \
  grep -oE 'BEH-SF-[0-9]{3}' | sort | uniq -d)
if [ -n "$duplicates" ]; then
  echo "  DUPLICATE IDs found:"
  echo "$duplicates" | while read -r dup; do
    echo "    $dup in: $(grep -l "^## $dup:" "$SPEC_DIR"/behaviors/*.md | xargs -I{} basename {})"
  done
  ERRORS=$((ERRORS + 1))
else
  beh_count=$(grep -ohE '^## BEH-SF-[0-9]{3}:' "$SPEC_DIR"/behaviors/BEH-SF-*.md | \
    grep -oE 'BEH-SF-[0-9]{3}' | sort -u | wc -l | tr -d ' ')
  echo "  Done. ($beh_count unique BEH-SF IDs, no duplicates)"
fi
echo ""

# ---------------------------------------------------------------------------
# Check 5: Test file existence — SKIPPED (no implementation yet)
# ---------------------------------------------------------------------------
echo "--- Check 5: Test File Existence --- SKIPPED (no implementation yet)"
echo ""

# ---------------------------------------------------------------------------
# Check 6: Orphaned test files — SKIPPED (no implementation yet)
# ---------------------------------------------------------------------------
echo "--- Check 6: Orphaned Test Files --- SKIPPED (no implementation yet)"
echo ""

# ---------------------------------------------------------------------------
# Check 7: Frontmatter Presence — every .md file (except index.md,
#           visual/, references/) starts with ---
# ---------------------------------------------------------------------------
echo "--- Check 7: Frontmatter Presence ---"
fm_missing=0
fm_checked=0
while IFS= read -r mdfile; do
  fm_checked=$((fm_checked + 1))
  first_line=$(head -1 "$mdfile")
  if [ "$first_line" != "---" ]; then
    echo "  MISSING frontmatter: ${mdfile#$SPEC_DIR/}"
    fm_missing=$((fm_missing + 1))
  fi
done < <(find "$SPEC_DIR" -name '*.md' \
  -not -name 'index.md' \
  -not -path '*/visual/*' \
  -not -path '*/references/*' \
  -not -path '*/scripts/*')
if [ "$fm_missing" -gt 0 ]; then
  ERRORS=$((ERRORS + fm_missing))
fi
echo "  Done. ($fm_checked files checked, $fm_missing missing)"
echo ""

# ---------------------------------------------------------------------------
# Check 8: Required 'kind' field — every file with frontmatter has a kind
# ---------------------------------------------------------------------------
echo "--- Check 8: Required 'kind' Field ---"
kind_missing=0
kind_checked=0
while IFS= read -r mdfile; do
  first_line=$(head -1 "$mdfile")
  if [ "$first_line" = "---" ]; then
    kind_checked=$((kind_checked + 1))
    # Extract frontmatter (between first --- and second ---)
    kind_val=$(sed -n '2,/^---$/p' "$mdfile" | grep -E '^kind:' | head -1)
    if [ -z "$kind_val" ]; then
      echo "  MISSING kind: ${mdfile#$SPEC_DIR/}"
      kind_missing=$((kind_missing + 1))
    fi
  fi
done < <(find "$SPEC_DIR" -name '*.md' \
  -not -name 'index.md' \
  -not -path '*/visual/*' \
  -not -path '*/references/*' \
  -not -path '*/scripts/*')
if [ "$kind_missing" -gt 0 ]; then
  ERRORS=$((ERRORS + kind_missing))
fi
echo "  Done. ($kind_checked files checked, $kind_missing missing 'kind')"
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "=== Summary ==="
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS error(s) found."
  exit 1
else
  echo "PASSED: All checks passed."
  exit 0
fi
