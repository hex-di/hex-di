---
phase: 16-performance
plan: 02
subsystem: runtime
tags: [performance, memoization, container, options]

# Dependency graph
requires:
  - phase: 15-foundation
    provides: Container creation architecture with wrapper-utils.ts
provides:
  - RuntimePerformanceOptions interface for container configuration
  - Configurable timestamp capture in MemoMap
  - Performance options plumbed through root and child containers
affects: [16-03-performance-benchmarks, production-deployments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Performance configuration at container creation level
    - MemoMapConfig for conditional feature enablement
    - Config propagation through constructor parameters

key-files:
  created: []
  modified:
    - packages/runtime/src/types/options.ts
    - packages/runtime/src/util/memo-map.ts
    - packages/runtime/src/container/internal-types.ts
    - packages/runtime/src/container/base-impl.ts
    - packages/runtime/src/container/root-impl.ts
    - packages/runtime/src/container/child-impl.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/src/container/wrapper-utils.ts

key-decisions:
  - "MemoMapConfig defaults to capturing timestamps (captureTimestamps !== false)"
  - "Performance options propagate from parent to child containers via CreateChildOptions"
  - "MemoMap config passed through BaseContainerImpl constructor parameter"

patterns-established:
  - "Performance options as optional container configuration"
  - "Config propagation through inheritance chain"

# Metrics
duration: 3.9min
completed: 2026-02-03
---

# Phase 16 Plan 02: Configurable Timestamp Capture Summary

**Added performance.disableTimestamps option to container creation, eliminating Date.now() overhead in production builds**

## Performance

- **Duration:** 3.9 min (232 seconds)
- **Started:** 2026-02-03T22:57:12Z
- **Completed:** 2026-02-03T23:01:04Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- RuntimePerformanceOptions interface added to container configuration
- MemoMap conditionally captures timestamps based on configuration
- Performance options flow from CreateContainerOptions through to MemoMap
- Child containers inherit and can override parent performance settings
- Default behavior preserved (timestamps captured unless explicitly disabled)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RuntimePerformanceOptions to container options** - `696f7e7` (feat)
2. **Task 2: Update MemoMap to accept and use timestamp configuration** - `24668bc` (feat)
3. **Task 3: Plumb performance options through container creation** - `3443a51` (feat)

## Files Created/Modified

- `packages/runtime/src/types/options.ts` - Added RuntimePerformanceOptions interface, extended CreateContainerOptions and CreateChildOptions with performance field
- `packages/runtime/src/util/memo-map.ts` - Added MemoMapConfig interface, updated constructor to accept config, conditionally capture timestamps
- `packages/runtime/src/container/internal-types.ts` - Added performance field to RootContainerConfig and ChildContainerConfig
- `packages/runtime/src/container/base-impl.ts` - Updated constructor to accept MemoMapConfig parameter
- `packages/runtime/src/container/root-impl.ts` - Pass captureTimestamps config to MemoMap based on performance.disableTimestamps
- `packages/runtime/src/container/child-impl.ts` - Pass captureTimestamps config to MemoMap based on performance.disableTimestamps
- `packages/runtime/src/container/factory.ts` - Pass performance options from CreateContainerOptions to config, wire through createChildFromGraph
- `packages/runtime/src/container/wrapper-utils.ts` - Updated createChildContainerConfig to accept and propagate performance options

## Decisions Made

**1. Default behavior: Capture timestamps**

- MemoMap checks `captureTimestamps !== false`, defaulting to true
- Ensures backward compatibility - existing code unchanged
- Production builds must explicitly opt-in to disable timestamps

**2. Performance options propagate to child containers**

- CreateChildOptions includes optional performance field
- Child containers inherit parent performance settings if not overridden
- Allows per-child customization when needed

**3. Config passed through base constructor**

- BaseContainerImpl accepts optional MemoMapConfig parameter
- Root and child implementations construct config from performance options
- Converts high-level disableTimestamps to low-level captureTimestamps

**4. resolvedAt: 0 when timestamps disabled**

- Clear indicator that timestamp capture was disabled
- Maintains EntryMetadata structure without adding nullable field
- DevTools can detect and display accordingly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward with clean integration points.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 16-03: Performance Benchmarks**

Container infrastructure now supports performance configuration. Next phase can:

- Create benchmark suite comparing timestamp capture on/off
- Document performance impact with actual measurements
- Establish baseline metrics for resolution, scope, and disposal operations

**Note for production deployments:**

```typescript
const container = createContainer(graph, {
  name: "App",
  performance: {
    disableTimestamps: process.env.NODE_ENV === "production",
  },
});
```

This eliminates Date.now() overhead in three MemoMap methods (getOrElseMemoize, memoizeOwn, getOrElseMemoizeAsync) during production operation.

---

_Phase: 16-performance_
_Completed: 2026-02-03_
