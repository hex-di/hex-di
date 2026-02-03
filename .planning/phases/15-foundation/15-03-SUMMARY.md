---
phase: 15-foundation
plan: 03
subsystem: runtime
tags: [hooks, container-api, resolution-hooks, di-container]

# Dependency graph
requires:
  - phase: 15-01
    provides: Split Container type into types/container.ts
  - phase: 15-02
    provides: Container wrapper utilities in wrapper-utils.ts
provides:
  - Public addHook/removeHook methods on Container type
  - HookType and HookHandler type exports
  - HOOKS_ACCESS removed from public API
affects: [Phase 17 (type-safe API), testing package, visualization package]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - WeakMap for handler-to-uninstall mapping (memory-safe cleanup)
    - AnyHookHandler union type for hook handler storage

key-files:
  created: []
  modified:
    - packages/runtime/src/types/container.ts
    - packages/runtime/src/resolution/hooks.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/src/container/wrappers.ts
    - packages/runtime/src/inspection/symbols.ts
    - packages/runtime/src/index.ts
    - packages/runtime/tests/exports.test.ts

key-decisions:
  - "Use WeakMap for handler storage to prevent memory leaks"
  - "Keep HOOKS_ACCESS internally for backward compatibility during transition"
  - "Export HookType and HookHandler as new public types"

patterns-established:
  - "Public hook API: container.addHook(type, handler) / container.removeHook(type, handler)"
  - "AnyHookHandler union type for WeakMap keys"

# Metrics
duration: 7min
completed: 2026-02-03
---

# Phase 15 Plan 03: Public Hook API Summary

**Public addHook/removeHook methods on Container with HOOKS_ACCESS removed from public exports**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-03T21:19:12Z
- **Completed:** 2026-02-03T21:25:58Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added HookType and HookHandler types to resolution hooks module
- Added addHook/removeHook methods to Container type with comprehensive JSDoc
- Implemented hook management in both root and child container wrappers
- Removed HOOKS_ACCESS from public API (marked as @internal/@deprecated)
- Replaced HooksInstaller with HookType/HookHandler in public exports

## Task Commits

Each task was committed atomically:

1. **Tasks 1-2: Add hook type definitions and implement addHook/removeHook** - `b841955` (feat)
2. **Task 3: Remove HOOKS_ACCESS from public exports** - `e114cc6` (feat)

## Files Created/Modified

- `packages/runtime/src/resolution/hooks.ts` - Added HookType and HookHandler type definitions
- `packages/runtime/src/types/container.ts` - Added addHook/removeHook methods to ContainerMembers
- `packages/runtime/src/container/factory.ts` - Implemented addHook/removeHook for root containers
- `packages/runtime/src/container/wrappers.ts` - Implemented addHook/removeHook for child containers
- `packages/runtime/src/inspection/symbols.ts` - Marked HOOKS_ACCESS as @internal/@deprecated
- `packages/runtime/src/index.ts` - Removed HOOKS_ACCESS, added HookType/HookHandler exports
- `packages/runtime/tests/exports.test.ts` - Updated expected exports list

## Decisions Made

- **WeakMap for handler storage:** Used WeakMap<AnyHookHandler, () => void> to map handlers to their uninstall functions, preventing memory leaks if handlers are garbage collected
- **AnyHookHandler union type:** Created union of HookHandler<"beforeResolve"> | HookHandler<"afterResolve"> for type-safe WeakMap keys
- **Keep HOOKS_ACCESS internally:** Symbol retained for internal backward compatibility but marked @internal and @deprecated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hook API is now first-class on Container (addHook/removeHook methods)
- HOOKS_ACCESS symbol-based API deprecated but still available internally
- Ready for Phase 15-04 (Inspector/Tracer standalone functions) or parallel work

---

_Phase: 15-foundation_
_Completed: 2026-02-03_
