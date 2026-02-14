#!/usr/bin/env bash
set -uo pipefail

# Check for circular dependencies in all library packages using madge.
# Dynamically discovers src/ directories matching workspace patterns.
# Exits non-zero if any cycles are found (except known type-only cycles).

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MADGE="$REPO_ROOT/node_modules/.bin/madge"
EXIT_CODE=0
CHECKED=0
FAILED=0
WARNED=0

# ─────────────────────────────────────────────────────────────────────────────
# Known type-only cycles (import type only, verified manually).
# These are structural: the fluent builder's validation result types ARE
# GraphBuilder<NewParams>, so restructuring would require threading a generic
# through ~2000 lines of validation types.
#
# Format: "fileA -> fileB" (relative to src/, as reported by madge)
# ─────────────────────────────────────────────────────────────────────────────
KNOWN_TYPE_ONLY=(
  "packages/graph:builder/builder.ts -> builder/builder-provide.ts"
  "packages/graph:builder/builder.ts -> builder/builder-merge.ts"
  "packages/graph:builder/builder-provide.ts -> builder/builder.ts"
  "packages/graph:builder/builder-merge.ts -> builder/builder.ts"
)

# Check if ALL cycles in a package's madge output are in the allow-list.
# Returns 0 if all cycles are allowed, 1 otherwise.
all_cycles_allowed() {
  local pkg_name="$1"
  local output="$2"

  # Extract cycle edges from madge output.
  # Madge format: "  fileA > fileB" (2-space indent, " > " separator)
  while IFS= read -r line; do
    # Skip empty lines and header lines
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue

    # Match cycle edge lines: "  fileA > fileB"
    if [[ "$line" =~ ^[[:space:]]+(.*)[[:space:]]'>'[[:space:]]+(.*)[[:space:]]*$ ]]; then
      local from="${BASH_REMATCH[1]}"
      local to="${BASH_REMATCH[2]}"
      # Trim whitespace
      from="${from## }"
      from="${from%% }"
      to="${to## }"
      to="${to%% }"

      local edge="${pkg_name}:${from} -> ${to}"
      local found=false
      for allowed in "${KNOWN_TYPE_ONLY[@]}"; do
        if [[ "$edge" == "$allowed" ]]; then
          found=true
          break
        fi
      done

      if [[ "$found" == "false" ]]; then
        return 1
      fi
    fi
  done <<< "$output"

  return 0
}

# Workspace patterns for library packages (excludes examples/presentations/website)
PATTERNS=(
  "packages/*/src"
  "integrations/*/src"
  "libs/*/*/src"
  "tooling/*/src"
  "testing/*/src"
)

for pattern in "${PATTERNS[@]}"; do
  for src_dir in $REPO_ROOT/$pattern; do
    [ -d "$src_dir" ] || continue

    pkg_dir="$(dirname "$src_dir")"
    pkg_name="${pkg_dir#$REPO_ROOT/}"

    # Find the nearest tsconfig.json
    tsconfig="$pkg_dir/tsconfig.json"
    if [ ! -f "$tsconfig" ]; then
      tsconfig="$REPO_ROOT/tsconfig.json"
    fi

    CHECKED=$((CHECKED + 1))

    output=$("$MADGE" --circular --extensions ts,tsx --ts-config "$tsconfig" "$src_dir" 2>&1)
    madge_exit=$?

    if [ $madge_exit -eq 0 ]; then
      echo "OK:   $pkg_name"
    else
      # Check if all cycles are in the known type-only allow-list
      if all_cycles_allowed "$pkg_name" "$output"; then
        echo "WARN: $pkg_name (type-only cycles, allowed)"
        WARNED=$((WARNED + 1))
      else
        echo "FAIL: $pkg_name"
        echo "$output" | tail -n +2
        echo ""
        FAILED=$((FAILED + 1))
        EXIT_CODE=1
      fi
    fi
  done
done

echo ""
echo "Checked $CHECKED packages, $FAILED with circular dependencies, $WARNED with type-only cycles (allowed)."
exit $EXIT_CODE
