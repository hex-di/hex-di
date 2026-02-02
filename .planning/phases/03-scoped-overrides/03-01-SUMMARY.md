---
phase: 03-scoped-overrides
plan: 01
subsystem: core
tags: [typescript, lifetime, dependency-injection, type-system]

# Dependency graph
requires: []
provides:
  - "Lifetime type with 'request' option"
  - "REQUEST constant for literal typing"
  - "isLifetime guard accepting 'request' value"
affects: [03-02, 03-03, request-scoped-services]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lifetime as discriminated union type"
    - "Literal constants for type-safe lifetime values"

key-files:
  created: []
  modified:
    - "packages/core/src/adapters/types.ts"
    - "packages/core/src/adapters/constants.ts"
    - "packages/core/src/adapters/guards.ts"
    - "packages/core/src/index.ts"

key-decisions:
  - "Added 'request' as fourth lifetime option rather than modifying 'scoped'"
  - "Request lifetime semantics: per-request isolation with auto-disposal"

patterns-established:
  - "Lifetime type union extended to support request-scoped services"
  - "REQUEST constant follows same pattern as SINGLETON/SCOPED/TRANSIENT"

# Metrics
duration: 3min
completed: 2026-02-01
---

# Phase 03 Plan 01: Add Request Lifetime Summary

**Extended Lifetime type union with 'request' option for request-scoped service isolation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-01T15:41:08Z
- **Completed:** 2026-02-01T15:44:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added 'request' as fourth option in Lifetime type union
- Updated JSDoc with comprehensive documentation table for all lifetime options
- Added REQUEST constant and Request type alias for literal typing
- Updated isLifetime type guard to accept 'request' value
- Exported REQUEST constant from @hex-di/core package

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 'request' to Lifetime type union** - `9646a66` (feat)
2. **Task 2-3: Verify exports + Add REQUEST constant + Update guard** - `0485d4f` (feat)

## Files Created/Modified

- `packages/core/src/adapters/types.ts` - Lifetime type with 'request' option and JSDoc table
- `packages/core/src/adapters/constants.ts` - REQUEST constant and Request type alias
- `packages/core/src/adapters/guards.ts` - isLifetime guard updated for 'request'
- `packages/core/src/index.ts` - REQUEST constant exported

## Decisions Made

- Added 'request' as a separate lifetime option rather than overloading 'scoped' semantics
- Documented request lifetime with clear semantics: per-request isolation, auto-disposal when request ends

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated isLifetime type guard**

- **Found during:** Task 2 (Verify type exports)
- **Issue:** isLifetime guard only accepted 'singleton', 'scoped', 'transient' - would reject valid 'request' lifetime
- **Fix:** Added `|| value === "request"` to guard condition
- **Files modified:** packages/core/src/adapters/guards.ts
- **Verification:** Type checking passes
- **Committed in:** 0485d4f

**2. [Rule 2 - Missing Critical] Added REQUEST constant**

- **Found during:** Task 2 (Verify type exports)
- **Issue:** Constants file had SINGLETON, SCOPED, TRANSIENT but missing REQUEST for consistency
- **Fix:** Added REQUEST constant and Request type alias
- **Files modified:** packages/core/src/adapters/constants.ts, packages/core/src/index.ts
- **Verification:** Constant exported and usable
- **Committed in:** 0485d4f

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for complete and consistent implementation. No scope creep.

## Issues Encountered

None - plan executed smoothly with expected deviations for complete implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Lifetime type foundation complete for request-scoped services
- Ready for Plan 02: Container withOverrides implementation
- No blockers identified

---

_Phase: 03-scoped-overrides_
_Completed: 2026-02-01_
