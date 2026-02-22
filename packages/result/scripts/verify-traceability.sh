#!/usr/bin/env bash
# verify-traceability.sh — Automated traceability verification for @hex-di/result
#
# Checks forward and backward traceability between specification IDs
# (BEH-XX-NNN, INV-N, ATR-N, DRR-N) and test/verification files.
# Exits with code 1 if any target is not met.
#
# Targets:
#   - 100% forward traceability  (every spec ID appears in at least one test file)
#   - 100% backward traceability (every test ID appears in a spec file)
#   - 0 orphaned requirements    (spec IDs with no test reference)
#   - 0 orphaned tests           (test IDs not present in any spec file)
#   - 100% ATR-N coverage        (every audit trail requirement has a verification mechanism)
#   - 100% DRR-N coverage        (every data retention requirement has a verification mechanism)

set -euo pipefail

# Resolve paths relative to the repository root (two levels up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"

SPEC_DIR="$REPO_ROOT/spec/result"
BEHAVIORS_DIR="$SPEC_DIR/behaviors"
INVARIANTS_FILE="$SPEC_DIR/invariants.md"

SRC_DIR="$PACKAGE_ROOT/src"
TESTS_DIR="$PACKAGE_ROOT/tests"
FEATURES_DIR="$PACKAGE_ROOT/features"
BENCH_DIR="$PACKAGE_ROOT/bench"

# --- Helpers ---

extract_beh_ids_from_specs() {
  # Extract BEH-XX-NNN from behavior spec files
  if [ -d "$BEHAVIORS_DIR" ]; then
    { grep -rhoE 'BEH-[0-9]{2}-[0-9]{3}' "$BEHAVIORS_DIR" 2>/dev/null || true; } | sort -u
  fi
}

extract_beh_ids_from_tests() {
  # Extract BEH-XX-NNN from test files
  local ids=""
  for dir in "$SRC_DIR" "$TESTS_DIR" "$FEATURES_DIR" "$BENCH_DIR"; do
    if [ -d "$dir" ]; then
      local found
      found=$(grep -rhoE 'BEH-[0-9]{2}-[0-9]{3}' "$dir" 2>/dev/null || true)
      if [ -n "$found" ]; then
        ids="$ids"$'\n'"$found"
      fi
    fi
  done
  echo "$ids" | { grep -v '^$' || true; } | sort -u
}

extract_inv_ids_from_specs() {
  # Extract INV-N (INV-1 through INV-99) from invariants.md
  if [ -f "$INVARIANTS_FILE" ]; then
    { grep -hoE 'INV-[0-9]+' "$INVARIANTS_FILE" 2>/dev/null || true; } | sort -u -t'-' -k2 -n
  fi
}

extract_inv_ids_from_tests() {
  # Extract INV-N from test files
  local ids=""
  for dir in "$SRC_DIR" "$TESTS_DIR" "$FEATURES_DIR" "$BENCH_DIR"; do
    if [ -d "$dir" ]; then
      local found
      found=$(grep -rhoE 'INV-[0-9]+' "$dir" 2>/dev/null || true)
      if [ -n "$found" ]; then
        ids="$ids"$'\n'"$found"
      fi
    fi
  done
  echo "$ids" | { grep -v '^$' || true; } | sort -u -t'-' -k2 -n
}

# --- Main ---

echo "========================================"
echo " Traceability Verification Report"
echo " @hex-di/result"
echo "========================================"
echo ""
echo "Spec dir:     $SPEC_DIR"
echo "Behaviors:    $BEHAVIORS_DIR"
echo "Invariants:   $INVARIANTS_FILE"
echo "Source dir:   $SRC_DIR"
echo "Tests dir:    $TESTS_DIR"
echo "Features dir: $FEATURES_DIR"
echo "Bench dir:    $BENCH_DIR"
echo ""

FAILURES=0

# --- BEH-XX-NNN Traceability ---

SPEC_BEH_IDS=$(extract_beh_ids_from_specs)
TEST_BEH_IDS=$(extract_beh_ids_from_tests)

SPEC_BEH_COUNT=0
TEST_BEH_COUNT=0
if [ -n "$SPEC_BEH_IDS" ]; then
  SPEC_BEH_COUNT=$(echo "$SPEC_BEH_IDS" | wc -l | tr -d ' ')
fi
if [ -n "$TEST_BEH_IDS" ]; then
  TEST_BEH_COUNT=$(echo "$TEST_BEH_IDS" | wc -l | tr -d ' ')
fi

echo "## BEH-XX-NNN Traceability"
echo ""
echo "Spec IDs found:  $SPEC_BEH_COUNT"
echo "Test IDs found:  $TEST_BEH_COUNT"
echo ""

# Forward traceability: spec IDs that appear in tests
FORWARD_COVERED=0
ORPHANED_REQS=""
if [ -n "$SPEC_BEH_IDS" ]; then
  while IFS= read -r spec_id; do
    if [ -n "$TEST_BEH_IDS" ] && echo "$TEST_BEH_IDS" | grep -qF "$spec_id"; then
      FORWARD_COVERED=$((FORWARD_COVERED + 1))
    else
      ORPHANED_REQS="$ORPHANED_REQS $spec_id"
    fi
  done <<< "$SPEC_BEH_IDS"
fi

if [ "$SPEC_BEH_COUNT" -gt 0 ]; then
  FORWARD_PCT=$((FORWARD_COVERED * 100 / SPEC_BEH_COUNT))
else
  FORWARD_PCT=100
fi

# Backward traceability: test IDs that appear in specs
BACKWARD_COVERED=0
ORPHANED_TESTS=""
if [ -n "$TEST_BEH_IDS" ]; then
  while IFS= read -r test_id; do
    if [ -n "$SPEC_BEH_IDS" ] && echo "$SPEC_BEH_IDS" | grep -qF "$test_id"; then
      BACKWARD_COVERED=$((BACKWARD_COVERED + 1))
    else
      ORPHANED_TESTS="$ORPHANED_TESTS $test_id"
    fi
  done <<< "$TEST_BEH_IDS"
fi

if [ "$TEST_BEH_COUNT" -gt 0 ]; then
  BACKWARD_PCT=$((BACKWARD_COVERED * 100 / TEST_BEH_COUNT))
else
  BACKWARD_PCT=100
fi

echo "| Metric | Value | Target | Status |"
echo "|--------|-------|--------|--------|"

if [ "$FORWARD_PCT" -eq 100 ]; then
  echo "| Forward traceability | ${FORWARD_PCT}% (${FORWARD_COVERED}/${SPEC_BEH_COUNT}) | 100% | PASS |"
else
  echo "| Forward traceability | ${FORWARD_PCT}% (${FORWARD_COVERED}/${SPEC_BEH_COUNT}) | 100% | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

if [ "$BACKWARD_PCT" -eq 100 ]; then
  echo "| Backward traceability | ${BACKWARD_PCT}% (${BACKWARD_COVERED}/${TEST_BEH_COUNT}) | 100% | PASS |"
else
  echo "| Backward traceability | ${BACKWARD_PCT}% (${BACKWARD_COVERED}/${TEST_BEH_COUNT}) | 100% | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

ORPHANED_REQ_COUNT=0
if [ -n "$ORPHANED_REQS" ]; then
  ORPHANED_REQ_COUNT=$(echo "$ORPHANED_REQS" | wc -w | tr -d ' ')
fi

ORPHANED_TEST_COUNT=0
if [ -n "$ORPHANED_TESTS" ]; then
  ORPHANED_TEST_COUNT=$(echo "$ORPHANED_TESTS" | wc -w | tr -d ' ')
fi

if [ "$ORPHANED_REQ_COUNT" -eq 0 ]; then
  echo "| Orphaned requirements | 0 | 0 | PASS |"
else
  echo "| Orphaned requirements | ${ORPHANED_REQ_COUNT} | 0 | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

if [ "$ORPHANED_TEST_COUNT" -eq 0 ]; then
  echo "| Orphaned tests | 0 | 0 | PASS |"
else
  echo "| Orphaned tests | ${ORPHANED_TEST_COUNT} | 0 | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

echo ""

if [ "$ORPHANED_REQ_COUNT" -gt 0 ]; then
  echo "### Orphaned Requirements (spec IDs with no test)"
  echo ""
  for id in $ORPHANED_REQS; do
    echo "- $id"
  done
  echo ""
fi

if [ "$ORPHANED_TEST_COUNT" -gt 0 ]; then
  echo "### Orphaned Tests (test IDs not in any spec)"
  echo ""
  for id in $ORPHANED_TESTS; do
    echo "- $id"
  done
  echo ""
fi

# --- INV-N Traceability ---

SPEC_INV_IDS=$(extract_inv_ids_from_specs)
TEST_INV_IDS=$(extract_inv_ids_from_tests)

SPEC_INV_COUNT=0
TEST_INV_COUNT=0
if [ -n "$SPEC_INV_IDS" ]; then
  SPEC_INV_COUNT=$(echo "$SPEC_INV_IDS" | wc -l | tr -d ' ')
fi
if [ -n "$TEST_INV_IDS" ]; then
  TEST_INV_COUNT=$(echo "$TEST_INV_IDS" | wc -l | tr -d ' ')
fi

echo "## INV-N Traceability"
echo ""
echo "Spec IDs found:  $SPEC_INV_COUNT"
echo "Test IDs found:  $TEST_INV_COUNT"
echo ""

INV_FORWARD_COVERED=0
INV_ORPHANED=""
if [ -n "$SPEC_INV_IDS" ]; then
  while IFS= read -r spec_id; do
    if [ -n "$TEST_INV_IDS" ] && echo "$TEST_INV_IDS" | grep -qFx "$spec_id"; then
      INV_FORWARD_COVERED=$((INV_FORWARD_COVERED + 1))
    else
      INV_ORPHANED="$INV_ORPHANED $spec_id"
    fi
  done <<< "$SPEC_INV_IDS"
fi

if [ "$SPEC_INV_COUNT" -gt 0 ]; then
  INV_FORWARD_PCT=$((INV_FORWARD_COVERED * 100 / SPEC_INV_COUNT))
else
  INV_FORWARD_PCT=100
fi

echo "| Metric | Value | Target | Status |"
echo "|--------|-------|--------|--------|"

if [ "$INV_FORWARD_PCT" -eq 100 ]; then
  echo "| Forward traceability | ${INV_FORWARD_PCT}% (${INV_FORWARD_COVERED}/${SPEC_INV_COUNT}) | 100% | PASS |"
else
  echo "| Forward traceability | ${INV_FORWARD_PCT}% (${INV_FORWARD_COVERED}/${SPEC_INV_COUNT}) | 100% | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

INV_ORPHANED_COUNT=0
if [ -n "$INV_ORPHANED" ]; then
  INV_ORPHANED_COUNT=$(echo "$INV_ORPHANED" | wc -w | tr -d ' ')
fi

if [ "$INV_ORPHANED_COUNT" -eq 0 ]; then
  echo "| Orphaned invariants | 0 | 0 | PASS |"
else
  echo "| Orphaned invariants | ${INV_ORPHANED_COUNT} | 0 | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

echo ""

if [ "$INV_ORPHANED_COUNT" -gt 0 ]; then
  echo "### Orphaned Invariants (INV-N with no test)"
  echo ""
  for id in $INV_ORPHANED; do
    echo "- $id"
  done
  echo ""
fi

# --- ATR-N Traceability ---

GXP_FILE="$SPEC_DIR/compliance/gxp.md"

echo "## ATR-N Traceability"
echo ""

# ATR-N IDs defined in gxp.md
SPEC_ATR_IDS=""
if [ -f "$GXP_FILE" ]; then
  SPEC_ATR_IDS=$(grep -hoE 'ATR-[0-9]+' "$GXP_FILE" 2>/dev/null | sort -u -t'-' -k2 -n || true)
fi

SPEC_ATR_COUNT=0
if [ -n "$SPEC_ATR_IDS" ]; then
  SPEC_ATR_COUNT=$(echo "$SPEC_ATR_IDS" | wc -l | tr -d ' ')
fi

echo "ATR IDs defined: $SPEC_ATR_COUNT"

# ATR-N verification: each ATR-N must appear in at least one of:
#   - a test file (src/, tests/, features/)
#   - the compliance document itself (with verification guidance)
#   - a CI workflow file (.github/workflows/)
ATR_COVERED=0
ATR_ORPHANED=""
CI_DIR="$REPO_ROOT/.github/workflows"

if [ -n "$SPEC_ATR_IDS" ]; then
  while IFS= read -r atr_id; do
    found=false
    # Check test files
    for dir in "$SRC_DIR" "$TESTS_DIR" "$FEATURES_DIR" "$BENCH_DIR"; do
      if [ -d "$dir" ] && grep -rqF "$atr_id" "$dir" 2>/dev/null; then
        found=true
        break
      fi
    done
    # Check CI workflows
    if [ "$found" = false ] && [ -d "$CI_DIR" ] && grep -rqF "$atr_id" "$CI_DIR" 2>/dev/null; then
      found=true
    fi
    # Check compliance doc itself (for consumer-side requirements with verification guidance)
    if [ "$found" = false ] && grep -cF "$atr_id" "$GXP_FILE" 2>/dev/null | grep -q '^[2-9]\|^[1-9][0-9]'; then
      # Must appear at least twice: once as definition, once as verification reference
      found=true
    fi

    if [ "$found" = true ]; then
      ATR_COVERED=$((ATR_COVERED + 1))
    else
      ATR_ORPHANED="$ATR_ORPHANED $atr_id"
    fi
  done <<< "$SPEC_ATR_IDS"
fi

if [ "$SPEC_ATR_COUNT" -gt 0 ]; then
  ATR_PCT=$((ATR_COVERED * 100 / SPEC_ATR_COUNT))
else
  ATR_PCT=100
fi

echo ""
echo "| Metric | Value | Target | Status |"
echo "|--------|-------|--------|--------|"

if [ "$ATR_PCT" -eq 100 ]; then
  echo "| ATR-N coverage | ${ATR_PCT}% (${ATR_COVERED}/${SPEC_ATR_COUNT}) | 100% | PASS |"
else
  echo "| ATR-N coverage | ${ATR_PCT}% (${ATR_COVERED}/${SPEC_ATR_COUNT}) | 100% | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

ATR_ORPHANED_COUNT=0
if [ -n "$ATR_ORPHANED" ]; then
  ATR_ORPHANED_COUNT=$(echo "$ATR_ORPHANED" | wc -w | tr -d ' ')
fi

if [ "$ATR_ORPHANED_COUNT" -eq 0 ]; then
  echo "| Orphaned ATR-N | 0 | 0 | PASS |"
else
  echo "| Orphaned ATR-N | ${ATR_ORPHANED_COUNT} | 0 | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

echo ""

if [ "$ATR_ORPHANED_COUNT" -gt 0 ]; then
  echo "### Orphaned ATR-N (defined but no verification mechanism)"
  echo ""
  for id in $ATR_ORPHANED; do
    echo "- $id"
  done
  echo ""
fi

# --- DRR-N Traceability ---

echo "## DRR-N Traceability"
echo ""

SPEC_DRR_IDS=""
if [ -f "$GXP_FILE" ]; then
  SPEC_DRR_IDS=$(grep -hoE 'DRR-[0-9]+' "$GXP_FILE" 2>/dev/null | sort -u -t'-' -k2 -n || true)
fi

SPEC_DRR_COUNT=0
if [ -n "$SPEC_DRR_IDS" ]; then
  SPEC_DRR_COUNT=$(echo "$SPEC_DRR_IDS" | wc -l | tr -d ' ')
fi

echo "DRR IDs defined: $SPEC_DRR_COUNT"

DRR_COVERED=0
DRR_ORPHANED=""

if [ -n "$SPEC_DRR_IDS" ]; then
  while IFS= read -r drr_id; do
    found=false
    # Check test files
    for dir in "$SRC_DIR" "$TESTS_DIR" "$FEATURES_DIR" "$BENCH_DIR"; do
      if [ -d "$dir" ] && grep -rqF "$drr_id" "$dir" 2>/dev/null; then
        found=true
        break
      fi
    done
    # Check CI workflows
    if [ "$found" = false ] && [ -d "$CI_DIR" ] && grep -rqF "$drr_id" "$CI_DIR" 2>/dev/null; then
      found=true
    fi
    # Check compliance doc itself (for consumer-side requirements with verification guidance)
    if [ "$found" = false ] && grep -cF "$drr_id" "$GXP_FILE" 2>/dev/null | grep -q '^[2-9]\|^[1-9][0-9]'; then
      found=true
    fi

    if [ "$found" = true ]; then
      DRR_COVERED=$((DRR_COVERED + 1))
    else
      DRR_ORPHANED="$DRR_ORPHANED $drr_id"
    fi
  done <<< "$SPEC_DRR_IDS"
fi

if [ "$SPEC_DRR_COUNT" -gt 0 ]; then
  DRR_PCT=$((DRR_COVERED * 100 / SPEC_DRR_COUNT))
else
  DRR_PCT=100
fi

echo ""
echo "| Metric | Value | Target | Status |"
echo "|--------|-------|--------|--------|"

if [ "$DRR_PCT" -eq 100 ]; then
  echo "| DRR-N coverage | ${DRR_PCT}% (${DRR_COVERED}/${SPEC_DRR_COUNT}) | 100% | PASS |"
else
  echo "| DRR-N coverage | ${DRR_PCT}% (${DRR_COVERED}/${SPEC_DRR_COUNT}) | 100% | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

DRR_ORPHANED_COUNT=0
if [ -n "$DRR_ORPHANED" ]; then
  DRR_ORPHANED_COUNT=$(echo "$DRR_ORPHANED" | wc -w | tr -d ' ')
fi

if [ "$DRR_ORPHANED_COUNT" -eq 0 ]; then
  echo "| Orphaned DRR-N | 0 | 0 | PASS |"
else
  echo "| Orphaned DRR-N | ${DRR_ORPHANED_COUNT} | 0 | **FAIL** |"
  FAILURES=$((FAILURES + 1))
fi

echo ""

if [ "$DRR_ORPHANED_COUNT" -gt 0 ]; then
  echo "### Orphaned DRR-N (defined but no verification mechanism)"
  echo ""
  for id in $DRR_ORPHANED; do
    echo "- $id"
  done
  echo ""
fi

# --- Summary ---

echo "========================================"
echo " Summary"
echo "========================================"
echo ""

if [ "$FAILURES" -eq 0 ]; then
  echo "All traceability targets met. PASS."
  exit 0
else
  echo "${FAILURES} traceability target(s) not met. FAIL."
  exit 1
fi
