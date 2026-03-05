#!/usr/bin/env bash
# verify-roadmap.sh — SpecForge roadmap structural verification
#
# Validates the product-variant roadmap against roadmap-spec-author conventions.
# Implements the 8 canonical checks from the roadmap-spec-author skill template,
# plus 4 SpecForge-specific sanity checks (A–D).
#
# Usage: bash spec/specforge/scripts/verify-roadmap.sh [--strict]
# Exit code: 0 = all pass, 1 = any fail

set -euo pipefail

SPEC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROADMAP="$SPEC_DIR/roadmap.md"
STRICT=0
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RESULTS=()

for arg in "$@"; do
  if [ "$arg" = "--strict" ]; then
    STRICT=1
  fi
done

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  RESULTS+=("| $1 | $2 | PASS | $3 |")
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  RESULTS+=("| $1 | $2 | **FAIL** | $3 |")
}

skip() {
  if [ "$STRICT" -eq 1 ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
    RESULTS+=("| $1 | $2 | **FAIL** | SKIP→FAIL (--strict): $3 |")
  else
    SKIP_COUNT=$((SKIP_COUNT + 1))
    RESULTS+=("| $1 | $2 | SKIP | $3 |")
  fi
}

if [ ! -f "$ROADMAP" ]; then
  echo "Roadmap file not found: $ROADMAP"
  exit 1
fi

# ─── CHECK 1: Status Validity ───
VALID_STATUSES="Planned|Specified|In Progress|Delivered|Deferred|Active"
INVALID_STATUSES=""

# Check **Status:** lines
while IFS= read -r line; do
  status=$(echo "$line" | sed 's/.*\*\*Status:\*\*[[:space:]]*//' | tr -d ' \r')
  if ! echo "$status" | grep -qE "^($VALID_STATUSES)$"; then
    INVALID_STATUSES="$INVALID_STATUSES \"$status\""
  fi
done < <(grep -E '^\*\*Status:\*\*' "$ROADMAP" || true)

# Check status column values in deliverable tables
while IFS= read -r line; do
  # Skip header rows and separator rows
  if echo "$line" | grep -qE '^\|[[:space:]]*#' || echo "$line" | grep -qE '^\|[-: ]+\|'; then
    continue
  fi
  # Extract last column (Status column in deliverable tables)
  last_col=$(echo "$line" | rev | cut -d'|' -f2 | rev | tr -d ' \r')
  if [ -n "$last_col" ] && echo "$last_col" | grep -qE "^(Planned|Specified|In Progress|Delivered|Deferred)$"; then
    continue
  fi
done < <(grep -E '^\| WI-PH-' "$ROADMAP" || true)

if [ -z "$INVALID_STATUSES" ]; then
  STATUS_COUNT=$(grep -cE '^\*\*Status:\*\*' "$ROADMAP" || echo "0")
  TABLE_STATUS_COUNT=$(grep -cE '^\| WI-PH-' "$ROADMAP" || echo "0")
  pass "1" "Status Validity" "$STATUS_COUNT inline + $TABLE_STATUS_COUNT table statuses, all valid"
else
  fail "1" "Status Validity" "Invalid:$INVALID_STATUSES"
fi

# ─── CHECK 2: Behavior ID Ranges ───
# Check that BEH-SF-NNN references resolve to behaviors/ directory
BEH_REFS=()
INVALID_BEHS=""
BEH_DIR="$SPEC_DIR/behaviors"

# Collect all unique BEH-SF prefixes referenced
while IFS= read -r beh; do
  BEH_REFS+=("$beh")
done < <(grep -oE 'BEH-SF-[0-9]+' "$ROADMAP" | sort -u || true)

if [ ${#BEH_REFS[@]} -eq 0 ]; then
  skip "2" "Behavior ID Ranges" "No behavior references found"
elif [ ! -d "$BEH_DIR" ]; then
  fail "2" "Behavior ID Ranges" "behaviors/ directory not found"
else
  # Check that the BEH-SF prefix exists in behavior files
  if grep -rlq "BEH-SF" "$BEH_DIR/" 2>/dev/null; then
    pass "2" "Behavior ID Ranges" "${#BEH_REFS[@]} unique BEH-SF refs, behaviors/ directory exists"
  else
    fail "2" "Behavior ID Ranges" "No BEH-SF definitions found in behaviors/"
  fi
fi

# ─── CHECK 3: No Orphan Containers ───
# Every PH-N must appear in status summary AND dependency graph
CONTAINERS=()
ORPHANS=""

while IFS= read -r heading; do
  ph=$(echo "$heading" | grep -oE 'Phase [0-9]+' | sed 's/Phase /PH-/' || true)
  if [ -n "$ph" ]; then
    CONTAINERS+=("$ph")
  fi
done < <(grep -E '^## Phase [0-9]+' "$ROADMAP" || true)

for container in "${CONTAINERS[@]}"; do
  # Must appear in status summary table AND dependency graph
  phase_num="${container#PH-}"

  # Check status summary (table row with PH-N)
  in_summary=$(grep -c "| $container " "$ROADMAP" 2>/dev/null || echo "0")

  # Check dependency graph (PH-N appears in the tree section)
  in_graph=$(sed -n '/^## Dependency Graph/,/^## /p' "$ROADMAP" | grep -c "$container" 2>/dev/null || echo "0")

  if [ "$in_summary" -eq 0 ] || [ "$in_graph" -eq 0 ]; then
    ORPHANS="$ORPHANS $container"
  fi
done

if [ ${#CONTAINERS[@]} -eq 0 ]; then
  skip "3" "No Orphan Containers" "No containers found"
elif [ -z "$ORPHANS" ]; then
  pass "3" "No Orphan Containers" "${#CONTAINERS[@]} containers, all in summary + graph"
else
  fail "3" "No Orphan Containers" "Orphans:$ORPHANS"
fi

# ─── CHECK 4: Exit Criteria Presence ───
MISSING_EC=""
CURRENT_PHASE=""
HAS_EC=0

while IFS= read -r line; do
  if echo "$line" | grep -qE '^## Phase [0-9]+'; then
    if [ -n "$CURRENT_PHASE" ] && [ "$HAS_EC" -eq 0 ]; then
      MISSING_EC="$MISSING_EC $CURRENT_PHASE"
    fi
    CURRENT_PHASE=$(echo "$line" | grep -oE 'PH-[0-9]+' || echo "$line" | grep -oE 'Phase [0-9]+' | sed 's/Phase /PH-/')
    HAS_EC=0
  fi
  if echo "$line" | grep -qE '### Exit Criteria'; then
    HAS_EC=1
  fi
done < "$ROADMAP"

# Check last phase
if [ -n "$CURRENT_PHASE" ] && [ "$HAS_EC" -eq 0 ]; then
  MISSING_EC="$MISSING_EC $CURRENT_PHASE"
fi

if [ -z "$MISSING_EC" ]; then
  pass "4" "Exit Criteria Presence" "All ${#CONTAINERS[@]} phases have Exit Criteria"
else
  fail "4" "Exit Criteria Presence" "Missing:$MISSING_EC"
fi

# ─── CHECK 5: Dependency Acyclicity ───
# Parse the dependency graph ASCII tree and check for cycles
declare -A DEP_GRAPH
EDGES=()

# Extract the dependency graph section
DEP_SECTION=$(sed -n '/^## Dependency Graph/,/^---$/p' "$ROADMAP" || true)

# Parse tree structure by tracking indentation → parent relationship
INDENT_STACK_NODE=()
INDENT_STACK_LEVEL=()

while IFS= read -r line; do
  node=$(echo "$line" | grep -oE 'PH-[0-9]+' | head -1 || true)
  if [ -z "$node" ]; then
    continue
  fi

  # Calculate indentation level (count leading spaces)
  stripped=$(echo "$line" | sed 's/^[[:space:]]*//')
  indent=$(( ${#line} - ${#stripped} ))

  # Find parent: last node with strictly less indentation
  parent=""
  for ((i=${#INDENT_STACK_NODE[@]}-1; i>=0; i--)); do
    if [ "${INDENT_STACK_LEVEL[$i]}" -lt "$indent" ]; then
      parent="${INDENT_STACK_NODE[$i]}"
      break
    fi
  done

  if [ -n "$parent" ]; then
    EDGES+=("${parent}->${node}")
    if [ -n "${DEP_GRAPH[$parent]+x}" ]; then
      DEP_GRAPH["$parent"]="${DEP_GRAPH[$parent]} $node"
    else
      DEP_GRAPH["$parent"]="$node"
    fi
  fi

  INDENT_STACK_NODE+=("$node")
  INDENT_STACK_LEVEL+=("$indent")

done <<< "$DEP_SECTION"

# Cycle detection via DFS
HAS_CYCLE=0
if [ ${#EDGES[@]} -gt 0 ]; then
  declare -A VISITED
  declare -A IN_STACK

  dfs() {
    local node="$1"
    if [ "${IN_STACK[$node]-0}" = "1" ]; then
      HAS_CYCLE=1
      return
    fi
    if [ "${VISITED[$node]-0}" = "1" ]; then
      return
    fi
    VISITED["$node"]=1
    IN_STACK["$node"]=1
    for neighbor in ${DEP_GRAPH["$node"]-}; do
      dfs "$neighbor"
    done
    IN_STACK["$node"]=0
  }

  for node in "${!DEP_GRAPH[@]}"; do
    dfs "$node"
  done
fi

if [ ${#EDGES[@]} -eq 0 ]; then
  skip "5" "Dependency Acyclicity" "No dependency edges found"
elif [ "$HAS_CYCLE" -eq 0 ]; then
  pass "5" "Dependency Acyclicity" "${#EDGES[@]} edges, no cycles"
else
  fail "5" "Dependency Acyclicity" "Cycle detected in dependency graph"
fi

# ─── CHECK 6: Spec File References ───
# Check that all relative file paths (./architecture/*, ./research/*, ./product/*) exist
MISSING_SPECS=""
SPEC_REFS=()

while IFS= read -r ref; do
  # Extract relative paths like ./architecture/foo.md or ./research/bar.md
  path=$(echo "$ref" | sed 's|^\./||')
  SPEC_REFS+=("$path")
  if [ ! -f "$SPEC_DIR/$path" ]; then
    MISSING_SPECS="$MISSING_SPECS $path"
  fi
done < <(grep -oE '\./[a-zA-Z0-9/_-]+\.md' "$ROADMAP" | sort -u || true)

if [ ${#SPEC_REFS[@]} -eq 0 ]; then
  skip "6" "Spec File References" "No spec file references found"
elif [ -z "$MISSING_SPECS" ]; then
  pass "6" "Spec File References" "${#SPEC_REFS[@]} refs, all exist on disk"
else
  fail "6" "Spec File References" "Missing:$MISSING_SPECS"
fi

# ─── CHECK 7: Product Milestone Alignment ───
# Every PT-N must reference a valid PH-N
PT_ISSUES=""
PT_IDS=()

while IFS= read -r line; do
  pt=$(echo "$line" | grep -oE 'PT-[0-9]+' | head -1 || true)
  if [ -z "$pt" ]; then
    continue
  fi
  PT_IDS+=("$pt")

  # Extract referenced phases from the same line
  refs=$(echo "$line" | grep -oE 'PH-[0-9]+' || true)
  for ref in $refs; do
    phase_num="${ref#PH-}"
    # Check if Phase N heading exists
    if ! grep -qE "^## Phase $phase_num:" "$ROADMAP" 2>/dev/null; then
      PT_ISSUES="$PT_ISSUES $pt→$ref"
    fi
  done
done < <(grep -E 'PT-[0-9]+' "$ROADMAP" || true)

PT_UNIQUE=$(grep -oE 'PT-[0-9]+' "$ROADMAP" | sort -u | wc -l | tr -d ' ')
if [ "$PT_UNIQUE" -eq 0 ]; then
  skip "7" "Product Milestone Alignment" "No product milestones"
elif [ -z "$PT_ISSUES" ]; then
  pass "7" "Product Milestone Alignment" "$PT_UNIQUE unique milestones, all reference valid phases"
else
  fail "7" "Product Milestone Alignment" "Broken:$PT_ISSUES"
fi

# ─── CHECK 8: External Dep Validity ───
# External dependency table rows must have blocking phase references
EXT_ISSUES=""
EXT_COUNT=0

while IFS= read -r line; do
  # Skip header and separator rows
  if echo "$line" | grep -qE '^\|[[:space:]]*Dependency' || echo "$line" | grep -qE '^\|[-: ]+\|'; then
    continue
  fi
  if echo "$line" | grep -qE '^\|.*`@'; then
    EXT_COUNT=$((EXT_COUNT + 1))
    blocking=$(echo "$line" | grep -oE 'PH-[0-9]+' || true)
    if [ -z "$blocking" ]; then
      dep=$(echo "$line" | grep -oE '`@[^`]+`' | head -1)
      EXT_ISSUES="$EXT_ISSUES ${dep:-unknown}(no-blocking-ref)"
    fi
  fi
done < <(sed -n '/^## External Dependencies/,/^---$/p' "$ROADMAP" || true)

if [ "$EXT_COUNT" -eq 0 ]; then
  skip "8" "External Dep Validity" "No external dependencies"
elif [ -z "$EXT_ISSUES" ]; then
  pass "8" "External Dep Validity" "$EXT_COUNT external deps, all have blocking phase refs"
else
  fail "8" "External Dep Validity" "Issues:$EXT_ISSUES"
fi

# ═══════════════════════════════════════════════════════════════════
# SpecForge-Specific Sanity Checks (A–D)
# ═══════════════════════════════════════════════════════════════════

# ─── CHECK A: Phase Count ───
PHASE_COUNT=$(grep -cE '^## Phase [0-9]+:' "$ROADMAP" || echo "0")
EXPECTED_PHASES=15

if [ "$PHASE_COUNT" -eq "$EXPECTED_PHASES" ]; then
  pass "A" "Phase Count" "Exactly $EXPECTED_PHASES phases"
else
  fail "A" "Phase Count" "Expected $EXPECTED_PHASES, found $PHASE_COUNT"
fi

# ─── CHECK B: Behavior Total ───
# Verify the summary metrics claim (272 total) matches actual BEH references
EXPECTED_BEHS=280
MAX_BEH=$(grep -oE 'BEH-SF-[0-9]+' "$ROADMAP" | grep -oE '[0-9]+$' | sort -n | tail -1 || echo "0")
MIN_BEH=$(grep -oE 'BEH-SF-[0-9]+' "$ROADMAP" | grep -oE '[0-9]+$' | sort -n | head -1 || echo "0")
UNIQUE_BEH_COUNT=$(grep -oE 'BEH-SF-[0-9]+' "$ROADMAP" | sort -u | wc -l | tr -d ' ')

# Also check that the summary metrics line claims 272
CLAIMED=$(grep -oE '280 total' "$ROADMAP" || true)

if [ "$MAX_BEH" -eq "$EXPECTED_BEHS" ] && [ "$MIN_BEH" -eq 1 ] && [ -n "$CLAIMED" ]; then
  pass "B" "Behavior Total" "BEH-SF-001–280 ($UNIQUE_BEH_COUNT unique refs), summary claims 280 ✓"
else
  fail "B" "Behavior Total" "Expected 001–280 (280 total); found $MIN_BEH–$MAX_BEH ($UNIQUE_BEH_COUNT unique), claimed: '${CLAIMED:-none}'"
fi

# ─── CHECK C: Product Milestone Count ───
EXPECTED_PTS=6
PT_COUNT=$(grep -oE 'PT-[0-9]+' "$ROADMAP" | sort -u | wc -l | tr -d ' ')

if [ "$PT_COUNT" -eq "$EXPECTED_PTS" ]; then
  pass "C" "Product Milestone Count" "Exactly $EXPECTED_PTS milestones (PT-1–PT-6)"
else
  fail "C" "Product Milestone Count" "Expected $EXPECTED_PTS, found $PT_COUNT"
fi

# ─── CHECK D: WI/EC ID Integrity ───
# WI-PH-N-M and EC-PH-N-M IDs must be sequential per phase and non-duplicate
WI_DUPES=""
EC_DUPES=""
SEQ_ISSUES=""

# Check WI duplicates
WI_DUPES_LIST=$(grep -oE 'WI-PH-[0-9]+-[0-9]+' "$ROADMAP" | sort | uniq -d || true)
if [ -n "$WI_DUPES_LIST" ]; then
  WI_DUPES=$(echo "$WI_DUPES_LIST" | tr '\n' ' ')
fi

# Check EC duplicates
EC_DUPES_LIST=$(grep -oE 'EC-PH-[0-9]+-[0-9]+' "$ROADMAP" | sort | uniq -d || true)
if [ -n "$EC_DUPES_LIST" ]; then
  EC_DUPES=$(echo "$EC_DUPES_LIST" | tr '\n' ' ')
fi

# Check sequential numbering per phase for WI items
for phase_num in $(seq 1 15); do
  WI_NUMS=$(grep -oE "WI-PH-${phase_num}-[0-9]+" "$ROADMAP" | grep -oE '[0-9]+$' | sort -n | tr '\n' ' ')
  if [ -n "$WI_NUMS" ]; then
    EXPECTED_SEQ=""
    MAX_WI=$(echo "$WI_NUMS" | tr ' ' '\n' | grep -v '^$' | tail -1)
    for ((i=1; i<=MAX_WI; i++)); do
      EXPECTED_SEQ="$EXPECTED_SEQ$i "
    done
    if [ "$WI_NUMS" != "$EXPECTED_SEQ" ]; then
      SEQ_ISSUES="$SEQ_ISSUES WI-PH-${phase_num}(gap)"
    fi
  fi
done

TOTAL_WI=$(grep -oE 'WI-PH-[0-9]+-[0-9]+' "$ROADMAP" | sort -u | wc -l | tr -d ' ')
TOTAL_EC=$(grep -oE 'EC-PH-[0-9]+-[0-9]+' "$ROADMAP" | sort -u | wc -l | tr -d ' ')

if [ -z "$WI_DUPES" ] && [ -z "$EC_DUPES" ] && [ -z "$SEQ_ISSUES" ]; then
  pass "D" "WI/EC ID Integrity" "$TOTAL_WI WI + $TOTAL_EC EC IDs, no duplicates, sequential"
else
  DETAIL=""
  [ -n "$WI_DUPES" ] && DETAIL="WI dupes: $WI_DUPES"
  [ -n "$EC_DUPES" ] && DETAIL="$DETAIL EC dupes: $EC_DUPES"
  [ -n "$SEQ_ISSUES" ] && DETAIL="$DETAIL Gaps: $SEQ_ISSUES"
  fail "D" "WI/EC ID Integrity" "$DETAIL"
fi

# ─── OUTPUT ───
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
echo ""
echo "## SpecForge Roadmap Verification"
echo ""
echo "**File:** \`$ROADMAP\`"
echo ""
echo "| # | Check | Status | Detail |"
echo "|---|-------|--------|--------|"
for r in "${RESULTS[@]}"; do
  echo "$r"
done
echo ""
echo "**$PASS_COUNT passed, $FAIL_COUNT failed, $SKIP_COUNT skipped** out of $TOTAL checks."
if [ "$STRICT" -eq 1 ]; then
  echo ""
  echo "_Mode: --strict (SKIP treated as FAIL)_"
fi
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
