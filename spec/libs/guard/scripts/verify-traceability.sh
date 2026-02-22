#!/usr/bin/env bash
# verify-traceability.sh — Guard spec traceability verification
#
# Implements the 6 canonical traceability checks from the spec-authoring skill:
#
#   1. Spec file existence    — §2 Capability-Level table paths exist on disk
#   2. Invariant completeness — every INV-GD-NNN in invariants.md has a §4 row
#   3. ADR completeness       — every decisions/NNN-*.md has a §5 ADR row
#   4. Test file existence    — SKIP (spec-first: packages/guard/ not yet implemented)
#   5. Forward traceability   — SKIP (spec-first: packages/guard/ not yet implemented)
#   6. No orphaned test files — SKIP (spec-first: packages/guard/ not yet implemented)
#
# Additional sanity checks (A–D):
#   A. REQ-GUARD ID count ≥ 85
#   B. URS-GUARD ID count ≥ 21
#   C. BEH-GD ID count in behaviors/ ≥ 62
#   D. No broken relative markdown links
#
# Usage:
#   bash spec/libs/guard/scripts/verify-traceability.sh [--strict]
#
#   --strict  Treat SKIP as FAIL (use in CI after implementation lands)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SPEC_DIR/../../.." && pwd)"

STRICT=false
[[ "${1:-}" == "--strict" ]] && STRICT=true

TRACEABILITY="$SPEC_DIR/traceability.md"
INVARIANTS="$SPEC_DIR/invariants.md"
DECISIONS_DIR="$SPEC_DIR/decisions"

TOTAL_FAIL=0

# ─── helpers ────────────────────────────────────────────────────────────────

# Extract data rows (no header, no separator) from a named section of traceability.md.
# Matches by literal string in the ## heading line.
section_rows() {
  local match="$1"
  awk -v m="$match" '
    /^## / { in_s = (index($0, m) > 0); hdr = 0; next }
    !in_s  { next }
    /\| *---/ { next }
    /^\|/  { if (!hdr) { hdr = 1; next } print }
  ' "$TRACEABILITY"
}

# Print one result row in the canonical markdown table format.
result_row() {
  local check="$1" status="$2" detail="$3"
  printf "| %-38s | %-4s | %s |\n" "$check" "$status" "$detail"
  if [[ "$status" == "FAIL" ]]; then
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  elif [[ "$status" == "SKIP" && "$STRICT" == "true" ]]; then
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

# ─── header ─────────────────────────────────────────────────────────────────

echo ""
echo "# Guard Spec Traceability Verification"
echo ""
echo "Spec dir : $SPEC_DIR"
echo "Repo root: $REPO_ROOT"
[[ "$STRICT" == "true" ]] && echo "Mode     : --strict (SKIP -> FAIL)"
echo ""
echo "| Check                                  | Status | Detail |"
echo "|----------------------------------------|--------|--------|"

# ─── Check 1: Spec file existence ───────────────────────────────────────────
# Every file path linked in the §2 Capability-Level Traceability table must exist on disk.

C1_TOTAL=0
C1_FOUND=0
C1_MISSING=""

while IFS= read -r row; do
  # Extract (path.md) from first markdown link in the row
  path=$(echo "$row" | grep -oE '\([^)]+\.md\)' | head -1 | tr -d '()')
  [[ -z "$path" ]] && continue
  C1_TOTAL=$((C1_TOTAL + 1))
  if [[ -f "$SPEC_DIR/$path" ]]; then
    C1_FOUND=$((C1_FOUND + 1))
  else
    C1_MISSING="$C1_MISSING $path"
  fi
done < <(section_rows "Capability-Level Traceability")

if [[ "$C1_TOTAL" -eq 0 ]]; then
  result_row "1. Spec file existence" "FAIL" "section not found in traceability.md"
elif [[ -n "$C1_MISSING" ]]; then
  result_row "1. Spec file existence" "FAIL" "$C1_FOUND/$C1_TOTAL found; missing:$C1_MISSING"
else
  result_row "1. Spec file existence" "PASS" "$C1_FOUND/$C1_TOTAL spec files found"
fi

# ─── Check 2: Invariant completeness ────────────────────────────────────────
# Every INV-GD-NNN defined in invariants.md must have a row in the §4 table.

if [[ ! -f "$INVARIANTS" ]]; then
  result_row "2. Invariant completeness" "FAIL" "invariants.md not found"
  TOTAL_FAIL=$((TOTAL_FAIL + 1))
else
  C2_TOTAL=0
  C2_FOUND=0
  C2_MISSING=""

  # Collect all INV-GD-NNN IDs that appear in the §4 table
  INV_IN_TABLE=$(section_rows "Invariant Traceability" | grep -oE 'INV-GD-[0-9]+' | sort -u)

  # Walk every unique INV-GD-NNN defined in invariants.md
  while IFS= read -r inv_id; do
    C2_TOTAL=$((C2_TOTAL + 1))
    if echo "$INV_IN_TABLE" | grep -qF "$inv_id"; then
      C2_FOUND=$((C2_FOUND + 1))
    else
      C2_MISSING="$C2_MISSING $inv_id"
    fi
  done < <(grep -oE 'INV-GD-[0-9]+' "$INVARIANTS" | sort -u)

  if [[ "$C2_TOTAL" -eq 0 ]]; then
    result_row "2. Invariant completeness" "FAIL" "no INV-GD IDs found in invariants.md"
  elif [[ -n "$C2_MISSING" ]]; then
    result_row "2. Invariant completeness" "FAIL" "$C2_FOUND/$C2_TOTAL in §4; missing:$C2_MISSING"
  else
    result_row "2. Invariant completeness" "PASS" "$C2_TOTAL/$C2_TOTAL invariants in §4"
  fi
fi

# ─── Check 3: ADR completeness ──────────────────────────────────────────────
# Every decisions/NNN-*.md file on disk must appear in the §5 ADR Traceability table.

C3_TOTAL=0
C3_FOUND=0
C3_MISSING=""

# Collect all ADR-GD-NNN IDs that appear in the §5 table
ADR_IN_TABLE=$(section_rows "ADR Traceability" | grep -oE 'ADR-GD-[0-9]+' | sort -u)

if [[ -d "$DECISIONS_DIR" ]]; then
  while IFS= read -r adr_file; do
    num=$(basename "$adr_file" | grep -oE '^[0-9]+' | head -1)
    [[ -z "$num" ]] && continue
    adr_id="ADR-GD-$(printf '%03d' "$((10#$num))")"
    C3_TOTAL=$((C3_TOTAL + 1))
    if echo "$ADR_IN_TABLE" | grep -qF "$adr_id"; then
      C3_FOUND=$((C3_FOUND + 1))
    else
      C3_MISSING="$C3_MISSING $adr_id"
    fi
  done < <(find "$DECISIONS_DIR" -maxdepth 1 -name "*.md" -type f | sort)
fi

if [[ "$C3_TOTAL" -eq 0 ]]; then
  result_row "3. ADR completeness" "FAIL" "no ADR files found in decisions/"
elif [[ -n "$C3_MISSING" ]]; then
  result_row "3. ADR completeness" "FAIL" "$C3_FOUND/$C3_TOTAL in §5; missing:$C3_MISSING"
else
  result_row "3. ADR completeness" "PASS" "$C3_TOTAL/$C3_TOTAL ADRs in §5"
fi

# ─── Checks 4–6: Code-side (SKIP — spec-first) ──────────────────────────────

SPEC_FIRST="spec-first: packages/guard/ not yet implemented"
result_row "4. Test file existence" "SKIP" "$SPEC_FIRST"
result_row "5. Forward traceability" "SKIP" "$SPEC_FIRST"
result_row "6. No orphaned test files" "SKIP" "$SPEC_FIRST"

# ─── Check A: REQ-GUARD ID count ────────────────────────────────────────────

CA_COUNT=$(grep -roh "REQ-GUARD-[0-9]\+" "$SPEC_DIR" --include="*.md" | sort -u | wc -l | tr -d ' ')
if [[ "$CA_COUNT" -lt 85 ]]; then
  result_row "A. REQ-GUARD count >= 85" "FAIL" "found $CA_COUNT (expected >= 85)"
else
  result_row "A. REQ-GUARD count >= 85" "PASS" "$CA_COUNT unique IDs"
fi

# ─── Check B: URS-GUARD ID count ────────────────────────────────────────────

CB_COUNT=$(grep -roh "URS-GUARD-[0-9]\+" "$SPEC_DIR" --include="*.md" | sort -u | wc -l | tr -d ' ')
if [[ "$CB_COUNT" -lt 21 ]]; then
  result_row "B. URS-GUARD count >= 21" "FAIL" "found $CB_COUNT (expected >= 21)"
else
  result_row "B. URS-GUARD count >= 21" "PASS" "$CB_COUNT unique IDs"
fi

# ─── Check C: BEH-GD ID count ───────────────────────────────────────────────

CC_COUNT=$(grep -roh "BEH-GD-[0-9]\+" "$SPEC_DIR/behaviors" --include="*.md" 2>/dev/null | sort -u | wc -l | tr -d ' ')
if [[ "$CC_COUNT" -lt 62 ]]; then
  result_row "C. BEH-GD count >= 62" "FAIL" "found $CC_COUNT in behaviors/ (expected >= 62)"
else
  result_row "C. BEH-GD count >= 62" "PASS" "$CC_COUNT unique IDs in behaviors/"
fi

# ─── Check D: Broken relative markdown links ────────────────────────────────

CD_BROKEN=0
CD_FIRST=""

while IFS= read -r md_file; do
  file_dir=$(dirname "$md_file")
  while IFS= read -r link_match; do
    # Extract path from [text](path) — strip fragment
    path_part=$(echo "$link_match" | sed 's/.*](\(.*\))/\1/' | sed 's/#.*//')
    [[ -z "$path_part" ]] && continue
    case "$path_part" in
      http*|https*|mailto*) continue ;;
      ../../../*)           continue ;;  # cross-cutting refs outside guard spec
    esac
    resolved=$(cd "$file_dir" && realpath "$path_part" 2>/dev/null || true)
    if [[ -z "$resolved" || ( ! -e "$resolved" && ! -d "$resolved" ) ]]; then
      CD_BROKEN=$((CD_BROKEN + 1))
      [[ -z "$CD_FIRST" ]] && CD_FIRST="$(basename "$md_file"):$path_part"
    fi
  done < <(grep -oE '\[[^]]*\]\([^)]+\)' "$md_file" 2>/dev/null || true)
done < <(find "$SPEC_DIR" -name "*.md" -type f)

if [[ "$CD_BROKEN" -gt 0 ]]; then
  result_row "D. No broken relative links" "FAIL" "$CD_BROKEN broken (first: $CD_FIRST)"
else
  result_row "D. No broken relative links" "PASS" "0 broken links"
fi

# ─── file summary ────────────────────────────────────────────────────────────

echo ""
echo "## File Summary"
echo ""
printf "  %-22s %s\n" "Total .md files:" "$(find "$SPEC_DIR" -name "*.md" -type f | wc -l | tr -d ' ')"
for subdir in behaviors decisions compliance appendices process roadmap comparisons; do
  count=$(find "$SPEC_DIR/$subdir" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  printf "  %-22s %s\n" "$subdir/:" "$count"
done
printf "  %-22s %s\n" "top-level:" "$(find "$SPEC_DIR" -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')"

# ─── exit ────────────────────────────────────────────────────────────────────

echo ""
if [[ "$TOTAL_FAIL" -gt 0 ]]; then
  echo "## Result: FAIL -- $TOTAL_FAIL check(s) failed"
  exit 1
else
  SKIP_NOTE=""
  [[ "$STRICT" == "false" ]] && SKIP_NOTE=" (3 SKIP -- awaiting implementation)"
  echo "## Result: PASS -- all checks passed${SKIP_NOTE}"
  exit 0
fi
