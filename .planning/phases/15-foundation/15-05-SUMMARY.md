---
phase: 15-foundation
plan: 05
subsystem: runtime
tags: [types, exports, internal-api]

# Dependency graph
requires:
  - phase: 15-01
    provides: Split types.ts into types/ subdirectory
provides:
  - CaptiveDependencyErrorLegacy removed from public exports
  - Verification of explicit return types on internal functions
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Internal types marked with @internal JSDoc"
    - "Test helper types for testing internal type structures"

key-files:
  created: []
  modified:
    - packages/runtime/src/index.ts
    - packages/runtime/src/captive-dependency.ts
    - packages/runtime/tests/captive-dependency.test-d.ts

key-decisions:
  - "CaptiveDependencyErrorLegacy kept internally for ValidateCaptiveDependency but not exported"
  - "Test file uses helper shape type instead of importing internal type"

patterns-established:
  - "Internal types marked @internal in JSDoc, removed from exports"

# Metrics
duration: 4min
completed: 2026-02-03
---

# Phase 15 Plan 05: Legacy Export Removal Summary

**CaptiveDependencyErrorLegacy removed from public API, internal functions verified to have explicit return types**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-03T21:19:22Z
- **Completed:** 2026-02-03T21:23:25Z
- **Tasks:** 3 (1 code change, 2 verification-only)
- **Files modified:** 3

## Accomplishments

- Removed `CaptiveDependencyErrorLegacy` from `@hex-di/runtime` public exports
- Marked internal type with `@internal` JSDoc documentation
- Updated test file to use helper shape type instead of importing legacy type
- Verified all internal functions already have explicit return types

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove legacy type exports from public API** - `500b61e` (chore)
2. **Task 2: Verify explicit return types in factory.ts/wrappers.ts** - No code changes needed (verification only)
3. **Task 3: Verify explicit return types in hooks.ts/impl files** - No code changes needed (verification only)

## Files Created/Modified

- `packages/runtime/src/index.ts` - Removed CaptiveDependencyErrorLegacy export
- `packages/runtime/src/captive-dependency.ts` - Marked type as @internal, removed export keyword
- `packages/runtime/tests/captive-dependency.test-d.ts` - Updated to use helper type instead of importing legacy

## Decisions Made

- Kept CaptiveDependencyErrorLegacy type in captive-dependency.ts (still used by ValidateCaptiveDependency) but marked as @internal
- Test file creates local `CaptiveDependencyErrorShape` helper type to test error type structure without importing internal type

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing codebase issues (not introduced by this plan):**

- Type errors in factory.ts and wrappers.ts related to `addHook`/`removeHook` implementations
- These are separate from the legacy export removal work and should be addressed in a dedicated plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Public API cleaned up with legacy types removed
- Internal functions documentation verified
- Pre-existing type issues noted for future plans

---

_Phase: 15-foundation_
_Completed: 2026-02-03_
