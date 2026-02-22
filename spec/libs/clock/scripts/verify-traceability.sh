#!/usr/bin/env bash
# verify-traceability.sh — Automated traceability verification for @hex-di/clock
#
# Validates internal consistency of the traceability matrix (traceability.md)
# and verifies that referenced files/directories exist.
#
# Checks:
#   1. Spec file existence       (Capability-Level table → spec files)
#   2. Invariant completeness    (invariants.md ↔ Invariant Traceability table)
#   3. ADR completeness          (decisions/*.md ↔ ADR Traceability table)
#   4. Test file existence       (Test File Map → tests/)
#   5. CLK-* forward traceability (every CLK-* domain → at least one test file)
#   6. No orphaned test files    (tests/*.test.ts all referenced in matrix)
#
# Usage:
#   bash spec/libs/clock/scripts/verify-traceability.sh [--strict]
#
# Without --strict, checks that depend on libs/clock/ (which may
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
INVARIANTS="$SPEC_DIR/invariants.md"
DECISIONS_DIR="$SPEC_DIR/decisions"
PKG_DIR="$REPO_ROOT/libs/clock/core"
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
    echo "| $1 | **FAIL** | $2 (--strict: SKIP->FAIL) |"
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
echo " @hex-di/clock"
echo "========================================"
echo ""
echo "Traceability: $TRACEABILITY"
echo "Invariants:   $INVARIANTS"
echo "Decisions:    $DECISIONS_DIR"
echo "Package:      $PKG_DIR"
echo "Strict:       $STRICT"
echo ""

if [[ ! -f "$TRACEABILITY" ]]; then
  echo "ERROR: Traceability file not found: $TRACEABILITY"
  exit 1
fi

echo "| Check | Status | Detail |"
echo "|-------|--------|--------|"

# -- Check 1: Spec file existence --
# Parse Capability-Level Traceability table, extract spec file references,
# verify each exists under spec/libs/clock/.

SPEC_REFS=$(table_rows "Capability-Level Traceability" \
  | sed -n 's/.*](\([^)]*\)).*/\1/p' \
  | sort -u || true)

MISSING="" TOTAL=0 FOUND=0
if [[ -n "$SPEC_REFS" ]]; then
  while IFS= read -r ref; do
    TOTAL=$((TOTAL + 1))
    TARGET="$SPEC_DIR/$ref"
    # Handle both file and directory references
    if [[ -f "$TARGET" ]] || [[ -d "$TARGET" ]]; then
      FOUND=$((FOUND + 1))
    else
      MISSING="$MISSING $ref"
    fi
  done <<< "$SPEC_REFS"
fi

if [[ "$TOTAL" -eq 0 ]]; then
  pass "1. Spec file existence" "No spec files referenced in matrix"
elif [[ -z "$MISSING" ]]; then
  pass "1. Spec file existence" "$FOUND/$TOTAL spec files found"
else
  MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
  fail "1. Spec file existence" "$MISSING_COUNT/$TOTAL missing:$MISSING"
fi

# -- Check 2: Invariant completeness --
# List all INV-CK-N headings from invariants.md and verify each
# appears in the Invariant Traceability table.

if [[ -f "$INVARIANTS" ]]; then
  INV_DEFINED=$(grep -oE 'INV-CK-[0-9]+' "$INVARIANTS" | sort -u || true)
  INV_TRACED=$(table_rows "Invariant Traceability" \
    | grep -oE 'INV-CK-[0-9]+' | sort -u || true)

  MISSING="" TOTAL=0 MATCHED=0
  if [[ -n "$INV_DEFINED" ]]; then
    while IFS= read -r inv; do
      TOTAL=$((TOTAL + 1))
      if echo "$INV_TRACED" | grep -qFx "$inv"; then
        MATCHED=$((MATCHED + 1))
      else
        MISSING="$MISSING $inv"
      fi
    done <<< "$INV_DEFINED"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "2. Invariant completeness" "No invariants defined"
  elif [[ -z "$MISSING" ]]; then
    pass "2. Invariant completeness" "$MATCHED/$TOTAL invariants traced"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "2. Invariant completeness" "$MISSING_COUNT/$TOTAL not in traceability table:$MISSING"
  fi
else
  fail "2. Invariant completeness" "invariants.md not found"
fi

# -- Check 3: ADR completeness --
# List all ADR-CK-NNN files in decisions/ and verify each appears
# in the ADR Traceability table.

if [[ -d "$DECISIONS_DIR" ]]; then
  ADR_FILES=$(ls "$DECISIONS_DIR" 2>/dev/null \
    | grep -E '^[0-9]{3}-.*\.md$' \
    | sort || true)

  ADR_TRACED=$(table_rows "ADR Traceability" \
    | grep -oE 'ADR-CK-[0-9]+' | sort -u || true)

  MISSING="" TOTAL=0 MATCHED=0
  if [[ -n "$ADR_FILES" ]]; then
    while IFS= read -r af; do
      TOTAL=$((TOTAL + 1))
      NUM=$(echo "$af" | grep -oE '^[0-9]+')
      ADR_ID="ADR-CK-$NUM"
      if echo "$ADR_TRACED" | grep -qFx "$ADR_ID"; then
        MATCHED=$((MATCHED + 1))
      else
        MISSING="$MISSING $ADR_ID"
      fi
    done <<< "$ADR_FILES"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "3. ADR completeness" "No ADR files found"
  elif [[ -z "$MISSING" ]]; then
    pass "3. ADR completeness" "$MATCHED/$TOTAL ADRs traced"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "3. ADR completeness" "$MISSING_COUNT/$TOTAL not in traceability table:$MISSING"
  fi
else
  fail "3. ADR completeness" "decisions/ directory not found"
fi

# -- Check 4: Test file existence --
# Parse Test File Map, extract test file patterns, verify each
# exists under libs/clock/core/tests/.

if [[ -d "$TESTS_DIR" ]]; then
  TEST_PATTERNS=$(table_rows "Test File Map" \
    | grep -oE '`[^`]+\.test[^`]*`' | tr -d '`' \
    | sort -u || true)

  MISSING="" TOTAL=0 FOUND=0
  if [[ -n "$TEST_PATTERNS" ]]; then
    while IFS= read -r f; do
      TOTAL=$((TOTAL + 1))
      # Handle patterns with " / " separator (e.g., "foo.test.ts / .test-d.ts")
      # Check just the primary filename
      PRIMARY=$(echo "$f" | sed 's/ \/.*//')
      MATCH=$(find "$TESTS_DIR" -name "$PRIMARY" -print -quit 2>/dev/null || true)
      if [[ -n "$MATCH" ]]; then
        FOUND=$((FOUND + 1))
      else
        MISSING="$MISSING $PRIMARY"
      fi
    done <<< "$TEST_PATTERNS"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "4. Test file existence" "No test files referenced in matrix"
  elif [[ -z "$MISSING" ]]; then
    pass "4. Test file existence" "$FOUND/$TOTAL test files found"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "4. Test file existence" "$MISSING_COUNT/$TOTAL missing:$MISSING"
  fi
else
  skip "4. Test file existence" "libs/clock/core/tests/ not found"
fi

# -- Check 5: CLK-* forward traceability --
# Verify that every CLK-* domain listed in Requirement-Level Traceability
# maps to at least one test file via the Test File Map.
# (Full requirement-level traceability is in the GxP RTM; this checks domain coverage.)

if [[ -d "$PKG_DIR" ]]; then
  # Collect CLK-* domain prefixes from Requirement-Level Traceability
  CLK_DOMAINS=$(table_rows "Requirement-Level Traceability" \
    | grep -oE 'CLK-[A-Z]+' | sort -u || true)

  # Collect all @traces CLK-* references from test files
  CLK_TRACED=$(grep -roh '@traces CLK-[A-Z_-]*[0-9]*' "$TESTS_DIR" 2>/dev/null \
    | awk '{print $2}' | grep -oE 'CLK-[A-Z]+' \
    | sort -u || true)

  MISSING="" TOTAL=0 TRACED=0
  if [[ -n "$CLK_DOMAINS" ]]; then
    while IFS= read -r domain; do
      TOTAL=$((TOTAL + 1))
      if echo "$CLK_TRACED" | grep -qFx "$domain"; then
        TRACED=$((TRACED + 1))
      else
        MISSING="$MISSING $domain"
      fi
    done <<< "$CLK_DOMAINS"
  fi

  if [[ "$TOTAL" -eq 0 ]]; then
    pass "5. CLK-* forward traceability" "No CLK-* domains in matrix"
  elif [[ -z "$MISSING" ]]; then
    pass "5. CLK-* forward traceability" "$TRACED/$TOTAL CLK-* domains traced"
  else
    MISSING_COUNT=$(echo "$MISSING" | wc -w | tr -d ' ')
    fail "5. CLK-* forward traceability" "$MISSING_COUNT/$TOTAL CLK-* domains without @traces:$MISSING"
  fi
else
  skip "5. CLK-* forward traceability" "libs/clock/core/ not found"
fi

# -- Check 6: No orphaned test files --
# If libs/clock/core/tests/ exists, list all *.test.ts and *.test-d.ts
# files and verify each filename appears somewhere in the traceability matrix.

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
    pass "6. No orphaned test files" "No test files found"
  elif [[ -z "$ORPHANED" ]]; then
    pass "6. No orphaned test files" "$TRACED/$TOTAL test files traced"
  else
    ORPHANED_COUNT=$(echo "$ORPHANED" | wc -w | tr -d ' ')
    fail "6. No orphaned test files" "$ORPHANED_COUNT orphaned:$ORPHANED"
  fi
else
  skip "6. No orphaned test files" "libs/clock/core/tests/ not found"
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
    echo "All checks passed ($SKIPS skipped -- package not yet created)."
  else
    echo "All checks passed."
  fi
  exit 0
fi
