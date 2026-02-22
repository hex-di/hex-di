#!/usr/bin/env bash
# verify-traceability.sh — Traceability consistency validator for @hex-di/http-client-react
# Usage: ./verify-traceability.sh [--strict]
#   --strict  Fail (instead of skip) when the implementation package does not exist yet.
set -euo pipefail

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/../../../.." && pwd)"

TRACEABILITY="$SPEC_DIR/traceability.md"
INVARIANTS="$SPEC_DIR/invariants.md"
DECISIONS_DIR="$SPEC_DIR/decisions"
PKG_DIR="$REPO_ROOT/libs/http-client/react"
TESTS_DIR="$PKG_DIR/tests"

PASS=0
FAIL=0
SKIP=0

result() {
  local status="$1" detail="$2"
  printf "| %-2s. %-42s | %-6s | %s |\n" "$CHECK_NUM" "$CHECK_NAME" "$status" "$detail"
  case "$status" in
    PASS) PASS=$((PASS + 1)) ;;
    FAIL) FAIL=$((FAIL + 1)) ;;
    SKIP) SKIP=$((SKIP + 1)) ;;
  esac
}

echo ""
echo "| Check | Status | Detail |"
echo "|-------|--------|--------|"

# ---------------------------------------------------------------------------
# Check 1: Spec file existence
# ---------------------------------------------------------------------------
CHECK_NUM=1
CHECK_NAME="Spec file existence"

spec_files=(
  "$SPEC_DIR/01-overview.md"
  "$SPEC_DIR/02-provider.md"
  "$SPEC_DIR/03-hooks.md"
  "$SPEC_DIR/04-testing.md"
  "$SPEC_DIR/05-definition-of-done.md"
  "$SPEC_DIR/invariants.md"
  "$SPEC_DIR/traceability.md"
  "$SPEC_DIR/risk-assessment.md"
  "$SPEC_DIR/glossary.md"
  "$SPEC_DIR/overview.md"
  "$SPEC_DIR/roadmap.md"
  "$SPEC_DIR/decisions/001-context-over-props.md"
  "$SPEC_DIR/decisions/002-result-typed-state.md"
  "$SPEC_DIR/decisions/003-no-global-fetch.md"
  "$SPEC_DIR/process/definitions-of-done.md"
  "$SPEC_DIR/process/test-strategy.md"
  "$SPEC_DIR/process/requirement-id-scheme.md"
  "$SPEC_DIR/process/change-control.md"
)

missing_specs=()
for f in "${spec_files[@]}"; do
  [[ -f "$f" ]] || missing_specs+=("$(basename "$f")")
done

if [[ ${#missing_specs[@]} -eq 0 ]]; then
  result PASS "${#spec_files[@]}/${#spec_files[@]} spec files found"
else
  result FAIL "Missing: ${missing_specs[*]}"
fi

# ---------------------------------------------------------------------------
# Check 2: Invariant completeness — every INV-HCR-N in invariants.md appears
#          in the Invariant Traceability table of traceability.md
# ---------------------------------------------------------------------------
CHECK_NUM=2
CHECK_NAME="Invariant completeness"

inv_ids=()
while IFS= read -r line; do
  inv_ids+=("$line")
done < <(grep -oE 'INV-HCR-[0-9]+' "$INVARIANTS" | sort -u)

missing_inv=()
for inv in "${inv_ids[@]}"; do
  grep -q "$inv" "$TRACEABILITY" || missing_inv+=("$inv")
done

if [[ ${#missing_inv[@]} -eq 0 ]]; then
  result PASS "${#inv_ids[@]}/${#inv_ids[@]} invariants traced"
else
  result FAIL "Not in traceability: ${missing_inv[*]}"
fi

# ---------------------------------------------------------------------------
# Check 3: ADR completeness — every decisions/NNN-*.md file has an entry in
#          the ADR Traceability table of traceability.md
# ---------------------------------------------------------------------------
CHECK_NUM=3
CHECK_NAME="ADR completeness"

adr_files=("$DECISIONS_DIR"/[0-9][0-9][0-9]-*.md)
missing_adrs=()

if [[ ! -d "$DECISIONS_DIR" ]]; then
  result SKIP "decisions/ directory not found"
else
  for adr in "${adr_files[@]}"; do
    [[ -f "$adr" ]] || continue
    adr_id="ADR-HCR-$(basename "$adr" | sed 's/^\([0-9][0-9][0-9]\)-.*/\1/')"
    grep -q "$adr_id" "$TRACEABILITY" || missing_adrs+=("$adr_id")
  done

  total_adrs=$(ls "$DECISIONS_DIR"/[0-9][0-9][0-9]-*.md 2>/dev/null | wc -l | tr -d ' ')

  if [[ ${#missing_adrs[@]} -eq 0 ]]; then
    result PASS "${total_adrs}/${total_adrs} ADRs traced"
  else
    result FAIL "Not in traceability: ${missing_adrs[*]}"
  fi
fi

# ---------------------------------------------------------------------------
# Checks 4-6 require the implementation package to exist
# ---------------------------------------------------------------------------
if [[ ! -d "$TESTS_DIR" ]]; then
  if [[ "$STRICT" == "true" ]]; then
    CHECK_NUM=4; CHECK_NAME="Test file existence"; result FAIL "tests/ not found (strict mode)"
    CHECK_NUM=5; CHECK_NAME="Forward traceability (@traces)"; result FAIL "tests/ not found (strict mode)"
    CHECK_NUM=6; CHECK_NAME="No orphaned test files"; result FAIL "tests/ not found (strict mode)"
  else
    CHECK_NUM=4; CHECK_NAME="Test file existence"; result SKIP "libs/http-client/react/tests/ not found yet"
    CHECK_NUM=5; CHECK_NAME="Forward traceability (@traces)"; result SKIP "libs/http-client/react/tests/ not found yet"
    CHECK_NUM=6; CHECK_NAME="No orphaned test files"; result SKIP "libs/http-client/react/tests/ not found yet"
  fi
else
  # -------------------------------------------------------------------------
  # Check 4: Test file existence — every test file in the Test File Map exists
  # -------------------------------------------------------------------------
  CHECK_NUM=4
  CHECK_NAME="Test file existence"

  # Extract test file paths from the Test File Map section of traceability.md
  map_files=()
  while IFS= read -r line; do
    map_files+=("$line")
  done < <(
    awk '/^## Test File Map/,/^---/' "$TRACEABILITY" \
      | grep '^|' \
      | grep -v '^| *---' \
      | sed '1d' \
      | sed -n 's/^| *`\([^`]*\)`.*/\1/p'
  )

  missing_tests=()
  for tf in "${map_files[@]}"; do
    [[ -z "$tf" ]] && continue
    [[ -f "$PKG_DIR/$tf" ]] || missing_tests+=("$tf")
  done

  if [[ ${#missing_tests[@]} -eq 0 ]]; then
    result PASS "${#map_files[@]}/${#map_files[@]} test files found"
  else
    result FAIL "Missing: ${missing_tests[*]}"
  fi

  # -------------------------------------------------------------------------
  # Check 5: Forward traceability — chapters with requirements have test coverage
  # -------------------------------------------------------------------------
  CHECK_NUM=5
  CHECK_NAME="Forward traceability (chapters)"

  chapters=("02-provider" "03-hooks" "04-testing")
  uncovered=()

  for ch in "${chapters[@]}"; do
    # Look for any test file that mentions the chapter in a @traces annotation
    if ! grep -rq "@traces.*$ch\|$ch.*@traces" "$TESTS_DIR" 2>/dev/null; then
      # Fallback: check if a test file exists that matches the chapter pattern
      case "$ch" in
        "02-provider") [[ -f "$TESTS_DIR/unit/provider.test.tsx" ]] || uncovered+=("$ch") ;;
        "03-hooks")    [[ -f "$TESTS_DIR/unit/use-http-request.test.ts" ]] || uncovered+=("$ch") ;;
        "04-testing")  [[ -f "$TESTS_DIR/unit/testing-utils.test.ts" ]] || uncovered+=("$ch") ;;
      esac
    fi
  done

  if [[ ${#uncovered[@]} -eq 0 ]]; then
    result PASS "All ${#chapters[@]} chapters have test file coverage"
  else
    result FAIL "No test file found for: ${uncovered[*]}"
  fi

  # -------------------------------------------------------------------------
  # Check 6: No orphaned test files — every *.test.ts / *.test.tsx in tests/
  #          appears in the traceability matrix
  # -------------------------------------------------------------------------
  CHECK_NUM=6
  CHECK_NAME="No orphaned test files"

  orphans=()
  while IFS= read -r tf; do
    rel="${tf#"$PKG_DIR/"}"
    grep -q "$rel" "$TRACEABILITY" || orphans+=("$rel")
  done < <(find "$TESTS_DIR" \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.test-d.ts" \) 2>/dev/null)

  if [[ ${#orphans[@]} -eq 0 ]]; then
    result PASS "No orphaned test files"
  else
    result FAIL "Not in traceability: ${orphans[*]}"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "Results: PASS=$PASS  FAIL=$FAIL  SKIP=$SKIP"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "FAILED — $FAIL check(s) require attention."
  exit 1
else
  echo "OK — all checks passed or skipped."
  exit 0
fi
