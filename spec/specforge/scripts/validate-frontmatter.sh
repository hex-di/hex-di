#!/usr/bin/env bash
#
# validate-frontmatter.sh
#
# Deep validation of YAML frontmatter across all SpecForge spec files.
# Checks: presence, required fields, known kind values, no duplicate IDs.
#
# Usage: ./spec/specforge/scripts/validate-frontmatter.sh
#
# Exit code: 0 if all checks pass, 1 if any check fails.

set -euo pipefail

SPEC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

KNOWN_KINDS="behavior invariant decision feature traceability risk-assessment roadmap types type-system architecture research plugin process product compliance overview glossary reference"

echo "=== SpecForge Frontmatter Validation ==="
echo "Spec directory: $SPEC_DIR"
echo ""

# Collect all target .md files into a temp file
FILELIST=$(mktemp)
ID_SEEN=$(mktemp)
trap 'rm -f "$FILELIST" "$ID_SEEN"' EXIT
find "$SPEC_DIR" -name '*.md' \
  -not -name 'index.md' \
  -not -path '*/visual/*' \
  -not -path '*/references/*' \
  -not -path '*/scripts/*' \
  | sort > "$FILELIST"

TOTAL=$(wc -l < "$FILELIST" | tr -d ' ')

# Helper: extract a frontmatter field value from a file
get_fm_field() {
  local file="$1" field="$2"
  sed -n '2,/^---$/p' "$file" | grep -E "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" || true
}

# ---------------------------------------------------------------------------
# Check 1: Frontmatter Presence — first line is ---
# ---------------------------------------------------------------------------
echo "--- Check 1: Frontmatter Presence ---"
c1_fail=0
while IFS= read -r f; do
  first_line=$(head -1 "$f")
  if [ "$first_line" != "---" ]; then
    echo "  MISSING: ${f#$SPEC_DIR/}"
    c1_fail=$((c1_fail + 1))
  fi
done < "$FILELIST"
ERRORS=$((ERRORS + c1_fail))
echo "  Done. ($TOTAL files, $c1_fail missing frontmatter)"
echo ""

# ---------------------------------------------------------------------------
# Check 2: Required 'kind' field with known value
# ---------------------------------------------------------------------------
echo "--- Check 2: 'kind' field with known value ---"
c2_fail=0
while IFS= read -r f; do
  first_line=$(head -1 "$f")
  [ "$first_line" != "---" ] && continue
  kind_val=$(get_fm_field "$f" "kind")
  if [ -z "$kind_val" ]; then
    echo "  MISSING kind: ${f#$SPEC_DIR/}"
    c2_fail=$((c2_fail + 1))
    continue
  fi
  found=0
  for k in $KNOWN_KINDS; do
    if [ "$k" = "$kind_val" ]; then
      found=1
      break
    fi
  done
  if [ "$found" -eq 0 ]; then
    echo "  UNKNOWN kind '$kind_val': ${f#$SPEC_DIR/}"
    c2_fail=$((c2_fail + 1))
  fi
done < "$FILELIST"
ERRORS=$((ERRORS + c2_fail))
echo "  Done. ($c2_fail failures)"
echo ""

# ---------------------------------------------------------------------------
# Check 3: Required 'id' field (except overview and glossary)
# ---------------------------------------------------------------------------
echo "--- Check 3: 'id' field presence ---"
c3_fail=0
while IFS= read -r f; do
  first_line=$(head -1 "$f")
  [ "$first_line" != "---" ] && continue
  kind_val=$(get_fm_field "$f" "kind")
  # overview and glossary don't require 'id'
  [ "$kind_val" = "overview" ] || [ "$kind_val" = "glossary" ] && continue
  id_val=$(get_fm_field "$f" "id")
  if [ -z "$id_val" ]; then
    echo "  MISSING id: ${f#$SPEC_DIR/}"
    c3_fail=$((c3_fail + 1))
  fi
done < "$FILELIST"
ERRORS=$((ERRORS + c3_fail))
echo "  Done. ($c3_fail missing)"
echo ""

# ---------------------------------------------------------------------------
# Check 4: Required 'status' field
# ---------------------------------------------------------------------------
echo "--- Check 4: 'status' field presence ---"
c4_fail=0
while IFS= read -r f; do
  first_line=$(head -1 "$f")
  [ "$first_line" != "---" ] && continue
  status_val=$(get_fm_field "$f" "status")
  if [ -z "$status_val" ]; then
    echo "  MISSING status: ${f#$SPEC_DIR/}"
    c4_fail=$((c4_fail + 1))
  fi
done < "$FILELIST"
ERRORS=$((ERRORS + c4_fail))
echo "  Done. ($c4_fail missing)"
echo ""

# ---------------------------------------------------------------------------
# Check 5: No duplicate IDs across all files
# ---------------------------------------------------------------------------
echo "--- Check 5: No duplicate IDs ---"
c5_fail=0
unique_count=0
while IFS= read -r f; do
  first_line=$(head -1 "$f")
  [ "$first_line" != "---" ] && continue
  id_val=$(get_fm_field "$f" "id")
  [ -z "$id_val" ] && continue
  if grep -qF "|${id_val}|" "$ID_SEEN" 2>/dev/null; then
    prev=$(grep -F "|${id_val}|" "$ID_SEEN" | head -1 | cut -d'|' -f3)
    echo "  DUPLICATE '$id_val': ${f#$SPEC_DIR/} (first seen in $prev)"
    c5_fail=$((c5_fail + 1))
  else
    echo "|${id_val}|${f#$SPEC_DIR/}" >> "$ID_SEEN"
    unique_count=$((unique_count + 1))
  fi
done < "$FILELIST"
ERRORS=$((ERRORS + c5_fail))
echo "  Done. ($unique_count unique IDs, $c5_fail duplicates)"
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "=== Summary ==="
echo "Total files scanned: $TOTAL"
echo ""
echo "| # | Check | Result |"
echo "|---|-------|--------|"
echo "| 1 | Frontmatter Presence | $( [ "$c1_fail" -eq 0 ] && echo 'PASS' || echo "FAIL ($c1_fail)") |"
echo "| 2 | Known 'kind' Value   | $( [ "$c2_fail" -eq 0 ] && echo 'PASS' || echo "FAIL ($c2_fail)") |"
echo "| 3 | 'id' Field Present   | $( [ "$c3_fail" -eq 0 ] && echo 'PASS' || echo "FAIL ($c3_fail)") |"
echo "| 4 | 'status' Field       | $( [ "$c4_fail" -eq 0 ] && echo 'PASS' || echo "FAIL ($c4_fail)") |"
echo "| 5 | No Duplicate IDs     | $( [ "$c5_fail" -eq 0 ] && echo 'PASS' || echo "FAIL ($c5_fail)") |"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS total error(s)."
  exit 1
else
  echo "PASSED: All checks passed."
  exit 0
fi
