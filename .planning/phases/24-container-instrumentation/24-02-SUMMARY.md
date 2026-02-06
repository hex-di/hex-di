---
phase: 24-container-instrumentation
plan: 02
subsystem: tracing
tags: [instrumentation, tree-walking, live-subscription, inspector-api, distributed-tracing]

# Dependency graph
requires:
  - phase: 24-01
    provides: "Module-level span stack and instrumentContainer function"
provides:
  - "instrumentContainerTree for tree-wide instrumentation"
  - "Live subscription to child-created events for dynamic hierarchies"
  - "WeakMap-based InspectorAPI->Container reverse lookup"
  - "Pattern matching utilities for declarative port filters"
affects: [24-03, 24-04, 25-otel-bridge, 26-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WeakMap for InspectorAPI->Container reverse lookup"
    - "Recursive tree walking with inspector.getChildContainers()"
    - "Inspector event subscription for live updates"
    - "Wildcard pattern matching (*, prefix*, *suffix) for port filters"

key-files:
  created:
    - "packages/tracing/src/instrumentation/utils.ts"
    - "packages/tracing/src/instrumentation/tree.ts"
  modified: []

key-decisions:
  - "Use WeakMap for InspectorAPI->Container mapping (enables garbage collection)"
  - "Register mappings during walkTree (each instrumented container is mappable)"
  - "Subscribe to 'child-created' events on all inspectors for live updates"
  - "Recursive tree walking instruments existing + future child containers"
  - "Pattern matching supports *, prefix*, and *suffix wildcards"

patterns-established:
  - "Tree instrumentation: single call instruments entire hierarchy + live subscription"
  - "Cleanup tracking: Map<Container, cleanup> for all instrumented containers"
  - "Inspector event handling: listener checks event.type for 'child-created'"
  - "Idempotent cleanup: flag prevents multiple cleanup calls"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 24 Plan 02: Tree Instrumentation Summary

**Implement container tree instrumentation with live subscription for dynamic hierarchies**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T14:54:18Z
- **Completed:** 2026-02-06T14:56:31Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 0

## Accomplishments

- instrumentContainerTree function walks entire container hierarchy with InspectorAPI.getChildContainers()
- Live subscription to 'child-created' events enables auto-instrumentation of dynamically created children
- WeakMap-based InspectorAPI->Container reverse lookup (registerContainerMapping/getContainerFromInspector)
- Recursive tree walking with instrumentOne helper (skips already-instrumented containers)
- Cleanup tracking via Map<Container, cleanup> for all instrumented containers
- Idempotent cleanup function removes all hooks and subscriptions
- Cross-container span relationships work via shared module-level span stack (INST-09 satisfied)
- Pattern matching utilities for declarative filters: matchesPortPattern supports _, prefix_, \*suffix wildcards
- shouldTracePort utility extends evaluatePortFilter with wildcard pattern support

## Task Commits

Each task was committed atomically:

1. **Task 1: Create utility functions for tree walking** - `51b57a4` (feat)
2. **Task 2: Implement container tree instrumentation** - `dfb39f4` (feat)

## Files Created/Modified

**Created:**

- `packages/tracing/src/instrumentation/utils.ts` - Helper utilities for tree walking, pattern matching, InspectorAPI->Container mapping (185 lines)
- `packages/tracing/src/instrumentation/tree.ts` - instrumentContainerTree function with live subscription (232 lines)

**Modified:**

None

## Decisions Made

**1. Use WeakMap for InspectorAPI->Container reverse lookup**

- **Context:** InspectorAPI.getChildContainers() returns child InspectorAPIs, but we need Container instances to call addHook/removeHook
- **Decision:** Maintain a WeakMap<InspectorAPI, Container> populated during tree walking
- **Rationale:** WeakMap enables garbage collection (containers can be GC'd when no longer referenced), no memory leaks
- **Impact:** registerContainerMapping called in walkTree for each instrumented container

**2. Register mappings during tree walking**

- **Context:** Need to track which containers have been registered for reverse lookup
- **Decision:** Call registerContainerMapping in walkTree after instrumenting each container
- **Rationale:** Ensures all instrumented containers are mappable, enables child instrumentation
- **Impact:** Child containers discovered via getChildContainers() can be mapped back to Container instances

**3. Subscribe to 'child-created' events on all inspectors**

- **Context:** Need to auto-instrument child containers created after initial setup
- **Decision:** Subscribe to inspector.subscribe() in walkTree, listen for event.type === 'child-created'
- **Rationale:** Live subscription ensures new children are instrumented immediately
- **Impact:** Array of unsubscribe functions tracked for cleanup

**4. Recursive tree walking instruments existing + future containers**

- **Context:** Container hierarchy may have existing children and new children created later
- **Decision:** Walk existing children via getChildContainers(), subscribe for future children
- **Rationale:** Handles both static and dynamic hierarchies
- **Impact:** walkTree is recursive (calls itself for each child)

**5. Pattern matching supports _, prefix_, and \*suffix wildcards**

- **Context:** Declarative port filters (include/exclude arrays) need flexible matching
- **Decision:** Implement matchesPortPattern with support for _, prefix_, \*suffix patterns
- **Rationale:** Common use cases (trace all services ending in "Service", exclude "Internal\*")
- **Impact:** shouldTracePort utility extends evaluatePortFilter with pattern support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. HookableContainer interface type mismatch**

- **Issue:** Initial utils.ts defined HookableContainer with `<T extends string>`, but tree.ts needed `<T extends HookType>`
- **Resolution:** Updated utils.ts to import HookType and HookHandler from @hex-di/runtime, matching container.ts definition
- **Impact:** Fixed in same commit (51b57a4), no separate deviation commit needed

## User Setup Required

None - all functionality is self-contained.

## Next Phase Readiness

- Tree instrumentation is complete and ready for integration testing in Plan 24-03
- instrumentContainerTree available for application setup
- Live subscription handles dynamic child containers
- All INST-02 and INST-09 requirements satisfied
- Plan 24-03 can test cross-container span relationships
- Plan 24-04 can implement public API exports
- Phase 25 can integrate OTel bridge with tree instrumentation
- No blockers for next phase

## Self-Check: PASSED

All files created as specified:

- `packages/tracing/src/instrumentation/utils.ts` - EXISTS
- `packages/tracing/src/instrumentation/tree.ts` - EXISTS

All commits exist:

- 51b57a4 - feat(24-02): create utility functions for tree walking
- dfb39f4 - feat(24-02): implement container tree instrumentation

---

_Phase: 24-container-instrumentation_
_Completed: 2026-02-06_
