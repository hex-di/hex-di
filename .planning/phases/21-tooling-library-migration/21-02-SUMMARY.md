---
phase: 21-tooling-library-migration
plan: 02
subsystem: infra
tags: [monorepo, eslint, vitest, tsconfig, package-metadata, migration]

# Dependency graph
requires:
  - phase: 21-01
    provides: Physical package moves (tooling/*, libs/flow/*)
  - phase: 20
    provides: Integration migrations to integrations/
provides:
  - Root eslint ignores for tooling/** and libs/**
  - Updated README package table with all 10 packages
  - Correct package.json metadata for all moved packages
  - Fixed tsconfig.build.json extends paths for libs/flow/* packages
  - Updated STRUCTURE.md with current monorepo layout
affects: [22-documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "libs/ packages at depth 3 need ../../../ in both tsconfig.json AND tsconfig.build.json"

key-files:
  created: []
  modified:
    - eslint.config.js
    - README.md
    - tooling/testing/package.json
    - tooling/visualization/package.json
    - tooling/graph-viz/package.json
    - libs/flow/core/package.json
    - libs/flow/react/package.json
    - libs/flow/core/tsconfig.build.json
    - libs/flow/react/tsconfig.build.json
    - .planning/codebase/STRUCTURE.md

key-decisions:
  - "Pre-existing lint errors in packages/graph are not migration-related, left as-is"
  - "Planning files (.planning/) retain old path references as historical documentation"

patterns-established:
  - "All tsconfig.build.json extends paths must match tsconfig.json extends depth"

# Metrics
duration: 5min
completed: 2026-02-06
---

# Phase 21 Plan 02: Configuration Updates and Pipeline Verification Summary

**Root eslint/vitest configs updated for tooling/** and libs/**, all 5 moved package.json metadata corrected, tsconfig.build.json extends paths fixed, full pipeline passing with 1816 tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-06T08:44:04Z
- **Completed:** 2026-02-06T08:48:49Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added tooling/** and libs/** to root eslint.config.js ignores so packages use their own lint configs
- Updated README.md package table from 6 to 10 entries with correct paths for all moved packages
- Fixed repository.directory and homepage in all 5 moved package.json files
- Fixed tsconfig.build.json extends paths for libs/flow/core and libs/flow/react (missed in plan 01)
- Updated STRUCTURE.md directory layout and section headers to reflect new monorepo organization
- Verified full pipeline: build, typecheck, 1816 tests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Update root configs and package metadata** - `c2e2b60` (feat)
2. **Task 2: Full pipeline verification and stale reference check** - `0c84d36` (fix)

## Files Created/Modified

- `eslint.config.js` - Added tooling/** and libs/** to ignores array
- `README.md` - Updated package table with all 10 packages and correct paths
- `tooling/testing/package.json` - repository.directory and homepage updated
- `tooling/visualization/package.json` - repository.directory and homepage updated
- `tooling/graph-viz/package.json` - repository.directory and homepage updated
- `libs/flow/core/package.json` - repository.directory and homepage updated
- `libs/flow/react/package.json` - repository.directory and homepage updated
- `libs/flow/core/tsconfig.build.json` - Fixed extends path from ../../ to ../../../
- `libs/flow/react/tsconfig.build.json` - Fixed extends path from ../../ to ../../../
- `.planning/codebase/STRUCTURE.md` - Updated directory layout and section headers

## Decisions Made

- Pre-existing lint errors in packages/graph (11 errors, 12 warnings) are not caused by migration and left as-is for separate cleanup
- Planning files (.planning/) retain old path references as historical documentation -- not treated as stale references
- vitest.config.ts was already updated in plan 01 (confirmed by inspection), so no changes needed there

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed tsconfig.build.json extends paths for libs/flow/* packages**
- **Found during:** Task 2 (build verification)
- **Issue:** tsconfig.build.json in libs/flow/core and libs/flow/react extended ../../tsconfig.json (2 levels up, resolving to nonexistent libs/tsconfig.json). The regular tsconfig.json was correctly fixed in plan 01 but tsconfig.build.json was missed.
- **Fix:** Changed extends to ../../../tsconfig.json (3 levels up to root)
- **Files modified:** libs/flow/core/tsconfig.build.json, libs/flow/react/tsconfig.build.json
- **Verification:** pnpm build completes successfully for all packages
- **Committed in:** 0c84d36

**2. [Rule 2 - Missing Critical] Updated STRUCTURE.md with current monorepo layout**
- **Found during:** Task 2 (stale reference search)
- **Issue:** .planning/codebase/STRUCTURE.md had outdated directory layout and all section headers still referenced old paths (packages/flow, packages/testing, etc.)
- **Fix:** Updated directory tree and all section headers to reflect new structure (tooling/*, libs/flow/*, integrations/*)
- **Files modified:** .planning/codebase/STRUCTURE.md
- **Verification:** Section headers match actual filesystem paths
- **Committed in:** 0c84d36

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for correct operation. tsconfig.build.json fix was essential for build to pass. STRUCTURE.md update prevents future confusion.

## Issues Encountered

- Pre-existing lint errors in packages/graph (11 errors, 12 warnings) cause `pnpm lint` to fail. These are not migration-related -- they exist on main branch before any phase 21 changes. Not blocking for migration completion.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 21 (Tooling & Library Migration) is fully complete
- All 5 packages successfully relocated with working build pipeline
- Ready for Phase 22 (Documentation) or any remaining v6.0 work
- Pre-existing lint errors in packages/graph should be addressed in a separate cleanup

## Self-Check: PASSED

---
*Phase: 21-tooling-library-migration*
*Completed: 2026-02-06*
