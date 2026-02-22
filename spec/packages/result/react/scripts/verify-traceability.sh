#!/usr/bin/env bash
# verify-traceability.sh — Automated traceability verification for result-react
#
# Validates internal consistency of the traceability matrix (traceability.md)
# and verifies that referenced files/directories exist.
#
# Checks:
#   1. Test file existence        (Invariant Traceability table → tests/)
#   2. Behavior spec completeness (behaviors/*.md ↔ Capability-Level table)
#   3. @traces annotation forward (every BEH-RXX-NNN → at least one test)
#   4. @traces annotation backward (every @traces → valid ID)
#   5. No orphaned test files     (tests/*.test.ts all referenced in matrix)
#
# Usage:
#   bash spec/packages/result/react/scripts/verify-traceability.sh [--strict]
#
# Without --strict, checks that depend on packages/result-react/ (which may
# not exist yet in spec-first development) report SKIP instead of FAIL.
# With --strict, SKIPs become FAILs — use this as a release gate.

set -euo pipefail

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

# --- Resolve paths ---

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/../../../.." && pwd)"

TRACEABILITY="$SPEC_DIR/traceability.md"
BEHAVIORS_DIR="$SPEC_DIR/behaviors"
PKG_DIR="$REPO_ROOT/packages/result-react"
TESTS_DIR="$PKG_DIR/tests"

# --- Counters ---

PASSES=0
SKIPS=0
FAILURES=0

# --- Helpers ---

pass() {
  echo "| $1 | PASS | $2 |"
  PASSES=$((PASSES + 1))
}

fail() {
  echo "| $1 | **FAIL** | $2 |"
  FAILURES=$((FAILURES + 1))
}

skip() {
  if [[ "$STRICT" == true ]]; then
    echo "| $1 | **FAIL** | $2 (--strict: SKIP→FAIL) |"
    FAILURES=$((FAILURES + 1))
  else
    echo "| $1 | SKIP | $2 |"
    SKIPS=$((SKIPS + 1))
  fi
}

# Extract table data rows from a named ## section of the traceability file.
# Strips the section header, blank lines, the markdown table header row, and
# the separator line (e.g. |---|---|). Returns only pipe-delimited data rows.
table_rows() {
  awk -v h="$1" '
    $0 ~ ("^## " h) { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$TRACEABILITY" \
    | grep '^|' \
    | grep -v '^| *---' \
    | sed '1d'
}

# --- Header ---

echo "========================================"
echo " Traceability Verification Report"
echo " result-react"
echo "========================================"
echo ""
echo "Traceability: $TRACEABILITY"
echo "Behaviors:    $BEHAVIORS_DIR"
echo "Package:      $PKG_DIR"
echo "Strict:       $STRICT"
echo ""

if [[ ! -f "$TRACEABILITY" ]]; then
  echo "ERROR: Traceability file not found: $TRACEABILITY"
  exit 1
fi

echo "| Check | Status | Detail |"
echo "|-------|--------|--------|"

# ── Check 1: Test file existence ──
# Parse Invariant Traceability table, extract test file names from columns,
# verify each exists under packages/result-react/tests/.

if [[ -d "$TESTS_DIR" ]]; then
  # Extract backtick-wrapped test file names from the Invariant Traceability section
  TEST_FILES=$(table_rows "Invariant Traceability" \
    | grep -oE '`[^`]+\.test[^`]*`' | tr -d '`' \
    | sort -u || true)

  MISSING="" TOTAL=0 FOUND=0
  if [[ -n "$TEST_FILES" ]]; then
    while IFS= read -r f; do
      TOTAL=$((TOTAL + 1))
      # Search recursively since test files may be in subdirectories
      if find "$TESTS_DIR" -name "$f" -print -quit 2>/dev/null | grep -q .; then
        FOUND=$((FOUND + 1))
      else
        MISSING="$MISSING $f"
      fi
    done <<< "$TEST_FILES"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "1. Test file existence" "No test files referenced in matrix"
  elif [[ -z "$MISSING" ]]; then
    pass "1. Test file existence" "$FOUND/$TOTAL files found"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "1. Test file existence" "$MISSING_COUNT/$TOTAL missing:$MISSING"
  fi
else
  skip "1. Test file existence" "packages/result-react/tests/ not found"
fi

# ── Check 2: Behavior spec completeness ──
# List all NN-*.md files in spec/packages/result/react/behaviors/, derive BEH-RNN from
# the filename prefix, and verify each has a corresponding entry in the
# Capability-Level Traceability table.

BEHAVIOR_FILES=$(ls "$BEHAVIORS_DIR" 2>/dev/null \
  | grep -E '^[0-9]{2}-.*\.md$' \
  | sort || true)

TABLE_BEH=$(table_rows "Capability-Level Traceability" \
  | grep -oE 'BEH-R[0-9]+' \
  | sort -u || true)

MISSING="" TOTAL=0 MATCHED=0

if [[ -n "$BEHAVIOR_FILES" ]]; then
  while IFS= read -r bf; do
    TOTAL=$((TOTAL + 1))
    NUM=$(echo "$bf" | grep -oE '^[0-9]+')
    BEH_ID="BEH-R$NUM"
    if echo "$TABLE_BEH" | grep -qFx "$BEH_ID"; then
      MATCHED=$((MATCHED + 1))
    else
      MISSING="$MISSING $BEH_ID"
    fi
  done <<< "$BEHAVIOR_FILES"
fi

if [[ "$TOTAL" -eq 0 ]]; then
  fail "2. Behavior spec completeness" "No behavior files found in $BEHAVIORS_DIR"
elif [[ -z "$MISSING" ]]; then
  pass "2. Behavior spec completeness" "$MATCHED/$TOTAL behaviors traced"
else
  fail "2. Behavior spec completeness" "Not in table:$MISSING"
fi

# ── Check 3: @traces forward traceability ──
# Verify that every BEH-RXX-NNN and INV-RN has at least one @traces annotation.

if [[ -d "$TESTS_DIR" ]]; then
  # Collect all @traces IDs from test files (supports multiple IDs per line)
  TRACED_IDS=$(grep -rh '@traces' "$TESTS_DIR" 2>/dev/null \
    | grep -oE '[A-Z][A-Z]+-R[0-9]+-[0-9]+|[A-Z][A-Z]+-R[0-9]+' \
    | sort -u || true)

  # Collect all BEH-RXX-NNN IDs from the traceability matrix
  ALL_BEH_IDS=$(table_rows "Requirement-Level Traceability" \
    | grep -oE 'BEH-R[0-9]+-[0-9]+' \
    | sort -u || true)

  MISSING="" TOTAL=0 TRACED=0
  if [[ -n "$ALL_BEH_IDS" ]]; then
    while IFS= read -r bid; do
      TOTAL=$((TOTAL + 1))
      if echo "$TRACED_IDS" | grep -qFx "$bid"; then
        TRACED=$((TRACED + 1))
      else
        MISSING="$MISSING $bid"
      fi
    done <<< "$ALL_BEH_IDS"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "3. @traces forward traceability" "No BEH IDs in matrix"
  elif [[ -z "$MISSING" ]]; then
    pass "3. @traces forward traceability" "$TRACED/$TOTAL BEH IDs traced"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "3. @traces forward traceability" "$MISSING_COUNT/$TOTAL BEH IDs without @traces:$MISSING"
  fi
else
  skip "3. @traces forward traceability" "packages/result-react/tests/ not found"
fi

# ── Check 4: @traces backward traceability ──
# Verify that every @traces annotation references a valid BEH-RXX-NNN or INV-RN.

if [[ -d "$TESTS_DIR" ]]; then
  ALL_VALID_IDS=$(cat <(table_rows "Requirement-Level Traceability" \
    | grep -oE 'BEH-R[0-9]+-[0-9]+' \
    | sort -u) \
    <(printf '%s\n' INV-R{1,2,3,4,5,6,7,8,9,10,11,12}) \
    | sort -u || true)

  TRACED_IDS_ALL=$(grep -rh '@traces' "$TESTS_DIR" 2>/dev/null \
    | grep -oE '[A-Z][A-Z]+-R[0-9]+-[0-9]+|[A-Z][A-Z]+-R[0-9]+' \
    | sort -u || true)

  INVALID="" TOTAL=0 VALID=0
  if [[ -n "$TRACED_IDS_ALL" ]]; then
    while IFS= read -r tid; do
      TOTAL=$((TOTAL + 1))
      if echo "$ALL_VALID_IDS" | grep -qFx "$tid"; then
        VALID=$((VALID + 1))
      else
        INVALID="$INVALID $tid"
      fi
    done <<< "$TRACED_IDS_ALL"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "4. @traces backward traceability" "No @traces annotations found"
  elif [[ -z "$INVALID" ]]; then
    pass "4. @traces backward traceability" "$VALID/$TOTAL @traces IDs valid"
  else
    INVALID_COUNT=$(echo "$INVALID" | wc -w | tr -d ' ')
    fail "4. @traces backward traceability" "$INVALID_COUNT invalid @traces IDs:$INVALID"
  fi
else
  skip "4. @traces backward traceability" "packages/result-react/tests/ not found"
fi

# ── Check 5: No orphaned test files ──
# If packages/result-react/tests/ exists, list all *.test.ts(x) files and
# verify each filename appears somewhere in the traceability matrix.

if [[ -d "$TESTS_DIR" ]]; then
  ACTUAL_TESTS=$(find "$TESTS_DIR" -name '*.test.ts' -o -name '*.test.tsx' 2>/dev/null \
    | xargs -I{} basename {} \
    | sort -u || true)

  ORPHANED="" TOTAL=0 TRACED=0

  if [[ -n "$ACTUAL_TESTS" ]]; then
    while IFS= read -r tf; do
      TOTAL=$((TOTAL + 1))
      if grep -qF "$tf" "$TRACEABILITY"; then
        TRACED=$((TRACED + 1))
      else
        ORPHANED="$ORPHANED $tf"
      fi
    done <<< "$ACTUAL_TESTS"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "5. No orphaned test files" "No test files in tests/"
  elif [[ -z "$ORPHANED" ]]; then
    pass "5. No orphaned test files" "$TRACED/$TOTAL test files traced"
  else
    ORPHANED_COUNT=$(echo "$ORPHANED" | wc -w | tr -d ' ')
    fail "5. No orphaned test files" "$ORPHANED_COUNT orphaned:$ORPHANED"
  fi
else
  skip "5. No orphaned test files" "packages/result-react/tests/ not found"
fi

# --- Summary ---

echo ""
echo "========================================"
echo " Summary"
echo "========================================"
echo ""
echo "Passed:  $PASSES"
echo "Skipped: $SKIPS"
echo "Failed:  $FAILURES"
echo ""

if [[ "$FAILURES" -gt 0 ]]; then
  echo "${FAILURES} check(s) FAILED."
  exit 1
else
  if [[ "$SKIPS" -gt 0 ]]; then
    echo "All checks passed ($SKIPS skipped — package not yet created)."
  else
    echo "All checks passed."
  fi
  exit 0
fi
