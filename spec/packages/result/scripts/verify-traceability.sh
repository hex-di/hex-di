#!/usr/bin/env bash
# verify-traceability.sh — Automated traceability verification for result (core)
#
# Validates internal consistency of the traceability matrix (traceability.md)
# and verifies that referenced files/directories exist.
#
# Checks:
#   1. Test file existence        (Invariant Traceability table → tests/)
#   2. Behavior spec completeness (behaviors/*.md ↔ Capability-Level table)
#   3. @traces annotation forward (every BEH-XX-NNN → at least one test)
#   4. @traces annotation backward (every @traces → valid ID)
#   5. No orphaned test files     (tests/*.test.ts all referenced in matrix)
#   6. Cucumber feature files     (features/*.feature ↔ traceability)
#
# Usage:
#   bash spec/packages/result/scripts/verify-traceability.sh [--strict]
#
# Without --strict, checks that depend on packages/result/ (which may
# not exist yet in spec-first development) report SKIP instead of FAIL.
# With --strict, SKIPs become FAILs — use this as a release gate.

set -euo pipefail

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

# --- Resolve paths ---

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/../../.." && pwd)"

TRACEABILITY="$SPEC_DIR/traceability.md"
BEHAVIORS_DIR="$SPEC_DIR/behaviors"
PKG_DIR="$REPO_ROOT/packages/result"
TESTS_DIR="$PKG_DIR/tests"
FEATURES_DIR="$PKG_DIR/features"

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
echo " result (core)"
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
# verify each exists under packages/result/src/.

if [[ -d "$PKG_DIR" ]]; then
  # Extract backtick-wrapped test file names from the Invariant Traceability section
  TEST_FILES=$(table_rows "Invariant Traceability" \
    | grep -oE '`[^`]+\.test[^`]*`' | tr -d '`' \
    | sort -u || true)

  MISSING="" TOTAL=0 FOUND=0
  if [[ -n "$TEST_FILES" ]]; then
    while IFS= read -r f; do
      TOTAL=$((TOTAL + 1))
      # Search recursively; handle both bare filenames and path-style names (e.g., "core/result.test.ts")
      if [[ "$f" == */* ]]; then
        # Path-style: use -path with wildcard prefix
        MATCH=$(find "$PKG_DIR" -path "*/$f" -print -quit 2>/dev/null || true)
      else
        MATCH=$(find "$PKG_DIR" -name "$f" -print -quit 2>/dev/null || true)
      fi
      if [[ -n "$MATCH" ]]; then
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
  skip "1. Test file existence" "packages/result/ not found"
fi

# ── Check 2: Behavior spec completeness ──
# List all NN-*.md files in spec/packages/result/behaviors/, derive BEH-NN from
# the filename prefix, and verify each has a corresponding entry in the
# Capability-Level Traceability table.

BEHAVIOR_FILES=$(ls "$BEHAVIORS_DIR" 2>/dev/null \
  | grep -E '^[0-9]{2}-.*\.md$' \
  | sort || true)

TABLE_BEH=$(table_rows "Capability-Level Traceability" \
  | grep -oE 'BEH-[0-9]+' \
  | sort -u || true)

MISSING="" TOTAL=0 MATCHED=0

if [[ -n "$BEHAVIOR_FILES" ]]; then
  while IFS= read -r bf; do
    TOTAL=$((TOTAL + 1))
    NUM=$(echo "$bf" | grep -oE '^[0-9]+')
    BEH_ID="BEH-$NUM"
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
# Verify that every BEH-XX-NNN and INV-N has at least one @traces annotation.

if [[ -d "$PKG_DIR" ]]; then
  # Collect all @traces IDs from test files and feature files
  TRACED_IDS=""
  if [[ -d "$TESTS_DIR" ]]; then
    TRACED_IDS=$(grep -roh '@traces [A-Z_-]*[0-9]*' "$TESTS_DIR" 2>/dev/null \
      | awk '{print $2}' \
      | sort -u || true)
  fi
  if [[ -d "$FEATURES_DIR" ]]; then
    FEATURE_IDS=$(grep -roh '@BEH-[0-9]\+-[0-9]\+' "$FEATURES_DIR" 2>/dev/null \
      | sed 's/@//' \
      | sort -u || true)
    if [[ -n "$FEATURE_IDS" ]]; then
      TRACED_IDS=$(printf '%s\n%s' "$TRACED_IDS" "$FEATURE_IDS" | sort -u)
    fi
  fi

  # Collect all BEH-XX-NNN IDs from the traceability matrix
  ALL_BEH_IDS=$(table_rows "Requirement-Level Traceability" \
    | grep -oE 'BEH-[0-9]+-[0-9]+' \
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
  skip "3. @traces forward traceability" "packages/result/ not found"
fi

# ── Check 4: @traces backward traceability ──
# Verify that every @traces annotation references a valid BEH-XX-NNN or INV-N.

if [[ -d "$PKG_DIR" ]]; then
  ALL_VALID_IDS=$(cat <(table_rows "Requirement-Level Traceability" \
    | grep -oE 'BEH-[0-9]+-[0-9]+' \
    | sort -u) \
    <(printf '%s\n' INV-{1,2,3,4,5,6,7,8,9,10,11,12,13,14}) \
    | sort -u || true)

  TRACED_IDS_ALL=""
  if [[ -d "$TESTS_DIR" ]]; then
    TRACED_IDS_ALL=$(grep -roh '@traces [A-Z_-]*[0-9]*' "$TESTS_DIR" 2>/dev/null \
      | awk '{print $2}' \
      | sort -u || true)
  fi

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
  skip "4. @traces backward traceability" "packages/result/ not found"
fi

# ── Check 5: No orphaned test files ──
# If packages/result/src/ exists, list all *.test.ts files and
# verify each filename appears somewhere in the traceability matrix.

if [[ -d "$TESTS_DIR" ]]; then
  ACTUAL_TESTS=$(find "$TESTS_DIR" -name '*.test.ts' -o -name '*.test-d.ts' 2>/dev/null \
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
    pass "5. No orphaned test files" "No test files in src/"
  elif [[ -z "$ORPHANED" ]]; then
    pass "5. No orphaned test files" "$TRACED/$TOTAL test files traced"
  else
    ORPHANED_COUNT=$(echo "$ORPHANED" | wc -w | tr -d ' ')
    fail "5. No orphaned test files" "$ORPHANED_COUNT orphaned:$ORPHANED"
  fi
else
  skip "5. No orphaned test files" "packages/result/src/ not found"
fi

# ── Check 6: Cucumber feature file existence ──
# Verify that .feature files referenced in the traceability matrix exist.

if [[ -d "$FEATURES_DIR" ]]; then
  FEATURE_FILES=$(table_rows "Invariant Traceability" \
    | grep -oE '`[^`]+\.feature`' | tr -d '`' \
    | sort -u || true)

  MISSING="" TOTAL=0 FOUND=0
  if [[ -n "$FEATURE_FILES" ]]; then
    while IFS= read -r f; do
      TOTAL=$((TOTAL + 1))
      if find "$FEATURES_DIR" -name "$f" -print -quit 2>/dev/null | grep -q .; then
        FOUND=$((FOUND + 1))
      else
        MISSING="$MISSING $f"
      fi
    done <<< "$FEATURE_FILES"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "6. Cucumber feature files" "No feature files referenced in matrix"
  elif [[ -z "$MISSING" ]]; then
    pass "6. Cucumber feature files" "$FOUND/$TOTAL feature files found"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "6. Cucumber feature files" "$MISSING_COUNT/$TOTAL missing:$MISSING"
  fi
else
  skip "6. Cucumber feature files" "packages/result/features/ not found"
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
