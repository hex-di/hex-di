---
phase: 12-api-cleanup
plan: 01
subsystem: api
tags: [typescript, graphbuilder, deprecation]

# Dependency graph
requires:
  - phase: 11-api-removal
    provides: Unified adapter API via createAdapter()
provides:
  - Removed provideAsync, provideFirstError, provideUnchecked, mergeWith methods
  - Renamed withUnsafeDepthOverride to withExtendedDepth
  - Simplified GraphBuilder API surface with only essential methods
affects: [v4.0-completion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "provide() now always reports all errors (ProvideResultAllErrors)"
    - "merge() uses max(A.maxDepth, B.maxDepth) for symmetric behavior"

key-files:
  created: []
  modified:
    - packages/graph/src/builder/builder.ts
    - packages/graph/src/builder/types/index.ts
    - packages/graph/src/builder/types/state.ts
    - packages/graph/src/builder/types/provide.ts
    - packages/graph/src/builder/types/merge.ts
    - packages/graph/src/builder/types/inspection.ts
    - packages/graph/src/validation/types/error-messages.ts
    - packages/graph/src/advanced.ts

key-decisions:
  - "Removed redundant provide methods - provide() handles all adapter types via type-level Promise detection"
  - "Removed mergeWith() options - merge() uses symmetric max() behavior by default"
  - "Renamed withUnsafeDepthOverride to withExtendedDepth for clearer intent"

patterns-established:
  - "Type parameter TExtendedDepth replaces TUnsafeDepthOverride throughout"
  - "Error messages reference withExtendedDepth() instead of withUnsafeDepthOverride()"

# Metrics
duration: 11min
completed: 2026-02-02
---

# Phase 12 Plan 01: API Cleanup Summary

**Removed 4 redundant GraphBuilder methods and renamed withUnsafeDepthOverride to withExtendedDepth, simplifying the API surface**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-02T20:57:17Z
- **Completed:** 2026-02-02T21:08:31Z
- **Tasks:** 3
- **Files modified:** 90+ (including 83 test files)

## Accomplishments

- Removed provideAsync(), provideFirstError(), provideUnchecked(), and mergeWith() from GraphBuilder
- Renamed withUnsafeDepthOverride to withExtendedDepth throughout the codebase
- Updated all type exports to remove deprecated method types
- Updated 83 test files to use the simplified API
- All tests passing (1819 tests across 145 test files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove deprecated methods from GraphBuilder class** - `c143205` (feat)
   - Removed provideFirstError, provideUnchecked, provideAsync, mergeWith methods
   - Removed $uncheckedUsed phantom property
   - Updated type imports and exports

2. **Task 2: Rename withUnsafeDepthOverride to withExtendedDepth** - `e25e705` (refactor)
   - Renamed static method and factory type
   - Renamed TUnsafeDepthOverride to TExtendedDepth type parameter
   - Updated all documentation and examples

3. **Task 3: Update type exports and clean up unused types** - `cebd842` (refactor)
   - Removed ProvideAsyncResult, ProvideUncheckedResult, MergeWithResult, MergeMaxDepthOption
   - Renamed GetUnsafeDepthOverride to GetExtendedDepth
   - Renamed WithUnsafeDepthOverride to WithExtendedDepth

**Test updates:** `09b31e3`, `e8e2ec3` (test)
**Error message fixes:** `f1d322e` (fix)

## Files Created/Modified

### Core API

- `packages/graph/src/builder/builder.ts` - Removed 4 deprecated methods, renamed withUnsafeDepthOverride
- `packages/graph/src/builder/types/index.ts` - Updated type exports
- `packages/graph/src/advanced.ts` - Updated advanced exports

### Type System

- `packages/graph/src/builder/types/state.ts` - Renamed GetUnsafeDepthOverride/WithUnsafeDepthOverride
- `packages/graph/src/builder/types/provide.ts` - Updated type references
- `packages/graph/src/builder/types/merge.ts` - Updated type references
- `packages/graph/src/builder/types/inspection.ts` - Updated type references
- `packages/graph/src/validation/types/error-messages.ts` - Updated DepthLimitError message

### Tests

- 83 test files updated to use new API (provideAsync → provide, etc.)
- Deleted `tests/unchecked-usage-marker.test-d.ts` (tested removed feature)
- Updated test expectations for multi-error format and symmetric merge behavior

## Decisions Made

**1. Unified provide() behavior**

- Removed provideAsync() - `provide()` already detects async adapters via type-level Promise detection
- Removed provideFirstError() - `provide()` now always uses ProvideResultAllErrors (reports all errors)
- Removed provideUnchecked() - no longer support bypassing compile-time validation
- **Rationale:** Redundant methods added API surface complexity without value

**2. Simplified merge() behavior**

- Removed mergeWith() options - merge() uses `max(A.maxDepth, B.maxDepth)` by default
- **Rationale:** Symmetric behavior is the right default - `A.merge(B)` should equal `B.merge(A)`

**3. Better naming with withExtendedDepth()**

- Renamed from withUnsafeDepthOverride to better communicate intent
- **Rationale:** "Extended" is clearer than "Unsafe" - it's acknowledging incomplete validation, not bypassing safety

## Deviations from Plan

None - plan executed exactly as written. All deprecated methods removed, rename completed throughout codebase.

## Issues Encountered

**Test expectation mismatches** (resolved)

- Self-dependency errors now return multi-error format since provide() reports all errors
- merge() maxDepth expectations needed updating to reflect symmetric max() behavior
- Error message patterns needed to account for withExtendedDepth renaming
- **Resolution:** Updated test helpers and expectations to match new behavior

## Next Phase Readiness

GraphBuilder API surface simplified and ready for v4.0 release. All tests passing with new API.

**Blockers:** None

**Next steps:**

- Phase 12-02: Remove convenience exports (if any remain)
- Complete Phase 12 API cleanup milestone
- Move to Phase 13 Runtime Features

---

_Phase: 12-api-cleanup_
_Completed: 2026-02-02_
