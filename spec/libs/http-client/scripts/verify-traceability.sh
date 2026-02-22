#!/usr/bin/env bash
# verify-traceability.sh — Traceability matrix validator for @hex-di/http-client
#
# Usage:
#   ./scripts/verify-traceability.sh           # Run all checks (SKIP code-side if package absent)
#   ./scripts/verify-traceability.sh --strict  # FAILs instead of SKIPs when package absent
#
# Exit code: 0 if all checks pass/skip, 1 if any check fails.

set -euo pipefail

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/../../.." && pwd)"

# Spec-side paths
TRACEABILITY="$SPEC_DIR/traceability.md"
INVARIANTS="$SPEC_DIR/invariants.md"
DECISIONS_DIR="$SPEC_DIR/decisions"

# Code-side paths (may not exist yet — spec-first development)
PKG_DIR="$REPO_ROOT/libs/http-client/core"
TESTS_DIR="$PKG_DIR/tests"

# Test files specified in the spec but not yet implemented.
# Check 4 reports these as PENDING (skip) rather than FAIL.
# Remove entries here when the corresponding test file is created.
PENDING_TESTS=(
  "tests/unit/interceptor-chain.test.ts"
  "tests/unit/circuit-breaker.test.ts"
  "tests/unit/rate-limiter.test.ts"
  "tests/unit/cache.test.ts"
)

# ─────────────────────────────────────────────────────────────────────────────
# Output table state
# ─────────────────────────────────────────────────────────────────────────────

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

record() {
  local check="$1" status="$2" detail="$3"
  RESULTS+=("| $check | $status | $detail |")
  case "$status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    SKIP) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Helper: extract markdown table rows from a named ## section in traceability.md
# ─────────────────────────────────────────────────────────────────────────────

table_rows() {
  local heading="$1"
  awk -v h="$heading" '
    $0 ~ ("^## " h) { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$TRACEABILITY" \
    | grep '^|' \
    | grep -v '^| *---' \
    | sed '1d'
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 1: Spec file existence
# Every spec file linked in the Capability-Level table must exist on disk.
# ─────────────────────────────────────────────────────────────────────────────

check_spec_files() {
  local missing=0 found=0
  while IFS= read -r row; do
    # Extract file name from column 3 (Spec File — backtick-wrapped)
    local file
    file=$(echo "$row" | awk -F'|' '{print $4}' | sed "s/\`//g" | tr -d ' ')
    [[ -z "$file" ]] && continue
    local path="$SPEC_DIR/$file"
    if [[ -f "$path" ]]; then
      found=$((found + 1))
    else
      echo "  MISSING: $file"
      missing=$((missing + 1))
    fi
  done < <(table_rows "Capability-Level Traceability")

  if ((missing == 0)); then
    record "1. Spec file existence" "PASS" "$found/$((found + missing)) spec files found"
  else
    record "1. Spec file existence" "FAIL" "$missing missing files (see output above)"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 2: Invariant completeness
# Every INV-HC-N in invariants.md must have an entry in the Invariant
# Traceability table.
# ─────────────────────────────────────────────────────────────────────────────

check_invariant_completeness() {
  local total=0 missing=0

  # Extract all INV-HC-N IDs defined in invariants.md
  local -a defined_invs
  while IFS= read -r line; do
    defined_invs+=("$line")
  done < <(grep -oE 'INV-HC-[0-9]+' "$INVARIANTS" | sort -u)

  # Extract all INV-HC-N IDs referenced in the Invariant Traceability table
  local traced_invs
  traced_invs=$(table_rows "Invariant Traceability" | grep -oE 'INV-HC-[0-9]+' | sort -u)

  for inv in "${defined_invs[@]}"; do
    total=$((total + 1))
    if ! echo "$traced_invs" | grep -qF "$inv"; then
      echo "  NOT TRACED: $inv"
      missing=$((missing + 1))
    fi
  done

  if ((missing == 0)); then
    record "2. Invariant completeness" "PASS" "$total/$total invariants traced"
  else
    record "2. Invariant completeness" "FAIL" "$missing/$total invariants missing from traceability"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 3: ADR completeness
# Every decisions/NNN-*.md file must have an entry in the ADR Traceability table.
# ─────────────────────────────────────────────────────────────────────────────

check_adr_completeness() {
  if [[ ! -d "$DECISIONS_DIR" ]]; then
    record "3. ADR completeness" "PASS" "No decisions/ directory"
    return
  fi

  local total=0 missing=0

  # Extract ADR-HC-NNN IDs from file names
  local -a adr_ids
  while IFS= read -r f; do
    local basename
    basename=$(basename "$f" .md)
    local num
    num=$(echo "$basename" | grep -oE '^[0-9]+')
    [[ -n "$num" ]] && adr_ids+=("ADR-HC-$num") && total=$((total + 1))
  done < <(find "$DECISIONS_DIR" -name "*.md" | sort)

  # Extract ADR IDs referenced in the ADR Traceability table
  local traced_adrs
  traced_adrs=$(table_rows "ADR Traceability" | grep -oE 'ADR-HC-[0-9]+' | sort -u)

  for adr in "${adr_ids[@]}"; do
    if ! echo "$traced_adrs" | grep -qF "$adr"; then
      echo "  NOT TRACED: $adr"
      missing=$((missing + 1))
    fi
  done

  if ((missing == 0)); then
    record "3. ADR completeness" "PASS" "$total/$total ADRs traced"
  else
    record "3. ADR completeness" "FAIL" "$missing/$total ADRs missing from traceability"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 4: Test file existence
# Every test file in the Test File Map must exist under libs/http-client/core/tests/.
# (Code-side check — skips if package not yet implemented.)
# ─────────────────────────────────────────────────────────────────────────────

check_test_file_existence() {
  if [[ ! -d "$TESTS_DIR" ]]; then
    if $STRICT; then
      record "4. Test file existence" "FAIL" "tests/ dir not found at $TESTS_DIR (--strict mode)"
    else
      record "4. Test file existence" "SKIP" "Package not yet implemented at $PKG_DIR"
    fi
    return
  fi

  local missing=0 found=0 pending=0

  while IFS= read -r row; do
    local file
    file=$(echo "$row" | awk -F'|' '{print $2}' | sed 's/`//g' | tr -d ' ')
    [[ -z "$file" ]] && continue

    # Skip known-pending files (specified but not yet implemented)
    local is_pending=false
    for pt in "${PENDING_TESTS[@]}"; do
      [[ "$file" == "$pt" ]] && is_pending=true && break
    done

    if $is_pending; then
      pending=$((pending + 1))
    elif [[ -f "$TESTS_DIR/${file#tests/}" ]]; then
      found=$((found + 1))
    else
      echo "  MISSING TEST: $file"
      missing=$((missing + 1))
    fi
  done < <(table_rows "Test File Map")

  if ((missing == 0)); then
    local detail="$found/$((found + missing)) test files found"
    ((pending > 0)) && detail="$detail, $pending pending (spec-first)"
    record "4. Test file existence" "PASS" "$detail"
  else
    record "4. Test file existence" "FAIL" "$missing test files missing"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 5: Forward traceability — chapter-level coverage
# Every numbered chapter (02- through 13-) must have at least one test file in
# the Test File Map.
# (Code-side check — skips if package not yet implemented.)
# ─────────────────────────────────────────────────────────────────────────────

check_forward_traceability() {
  if [[ ! -d "$TESTS_DIR" ]]; then
    if $STRICT; then
      record "5. Forward traceability" "FAIL" "Package not yet implemented (--strict mode)"
    else
      record "5. Forward traceability" "SKIP" "Package not yet implemented"
    fi
    return
  fi

  local missing=0 total=0

  # Every requirement-bearing chapter must appear in the Test File Map.
  # Intentionally excluded chapters:
  #   01: URS-level overview chapter (mission, scope, design philosophy, glossary
  #       links) — no testable functional requirements. Tests for §25-§26 (the port
  #       definition introduced in §01's summary) are traced to 06-http-client-port.md.
  #   14: API reference (§70–§78) — a derived summary of §02–§13 consolidated for
  #       reader convenience. No new requirements originate here; tests are already
  #       traced to the originating chapters.
  #   15: Appendices — contains only [OPERATIONAL]-tagged requirements (deployment
  #       procedures, supplier assessment, personnel qualification). No automated
  #       test coverage applies to operational requirements.
  #   17: Definition of Done chapter — enumerates test IDs and acceptance criteria
  #       but introduces no new functional requirements. The DoD verifies the spec;
  #       it is not itself a source of testable requirements.
  for chapter in 02 03 04 05 06 07 08 09 10 11 12 13 16; do
    total=$((total + 1))
    local chapter_file
    chapter_file=$(find "$SPEC_DIR" -maxdepth 1 -name "${chapter}-*.md" 2>/dev/null | head -1)
    [[ -z "$chapter_file" ]] && continue
    local chapter_name
    chapter_name=$(basename "$chapter_file")

    # Check if the chapter is referenced in the Test File Map
    if ! table_rows "Test File Map" | grep -qF "$chapter_name"; then
      echo "  NO TESTS FOR: $chapter_name"
      missing=$((missing + 1))
    fi
  done

  if ((missing == 0)); then
    record "5. Forward traceability" "PASS" "$total/$total chapters have test coverage"
  else
    record "5. Forward traceability" "FAIL" "$missing chapters lack test coverage"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check 6: No orphaned test files
# Every *.test.ts and *.test-d.ts under tests/ must appear in the Test File Map.
# (Code-side check — skips if package not yet implemented.)
# ─────────────────────────────────────────────────────────────────────────────

check_no_orphaned_tests() {
  if [[ ! -d "$TESTS_DIR" ]]; then
    if $STRICT; then
      record "6. No orphaned test files" "FAIL" "Package not yet implemented (--strict mode)"
    else
      record "6. No orphaned test files" "SKIP" "Package not yet implemented"
    fi
    return
  fi

  local orphaned=0 total=0

  while IFS= read -r test_file; do
    total=$((total + 1))
    local rel_path
    rel_path="tests/${test_file#$TESTS_DIR/}"
    if ! table_rows "Test File Map" | grep -qF "$rel_path"; then
      echo "  ORPHANED: $rel_path"
      orphaned=$((orphaned + 1))
    fi
  done < <(find "$TESTS_DIR" \( -name "*.test.ts" -o -name "*.test-d.ts" \) | sort)

  if ((orphaned == 0)); then
    record "6. No orphaned test files" "PASS" "$total test files all traced"
  else
    record "6. No orphaned test files" "FAIL" "$orphaned orphaned test files (not in traceability)"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Run all checks
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "Verifying traceability for @hex-di/http-client..."
echo ""

check_spec_files
check_invariant_completeness
check_adr_completeness
check_test_file_existence
check_forward_traceability
check_no_orphaned_tests

# ─────────────────────────────────────────────────────────────────────────────
# Print results table
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "| Check | Status | Detail |"
echo "|-------|--------|--------|"
for row in "${RESULTS[@]}"; do
  echo "$row"
done
echo ""
echo "Summary: ${PASS_COUNT} PASS, ${FAIL_COUNT} FAIL, ${SKIP_COUNT} SKIP"
echo ""

if ((FAIL_COUNT > 0)); then
  echo "❌ Traceability verification FAILED"
  exit 1
else
  echo "✅ Traceability verification PASSED"
  exit 0
fi
