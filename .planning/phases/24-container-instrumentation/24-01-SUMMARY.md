---
phase: 24-container-instrumentation
plan: 01
subsystem: tracing
tags: [instrumentation, hooks, span-stack, distributed-tracing, container]

# Dependency graph
requires:
  - phase: 23-08
    provides: "Complete @hex-di/tracing public API (ports, types, adapters, context, utils)"
provides:
  - "Module-level span stack for context propagation"
  - "Container instrumentation with instrumentContainer function"
  - "AutoInstrumentOptions for filtering and configuration"
  - "Parent-child span relationships via stack"
  - "Double-instrumentation handling via WeakMap"
affects: [24-02, 24-03, 25-otel-bridge, 26-integration]

# Tech tracking
tech-stack:
  added:
    - "@hex-di/runtime peer dependency (for hook types)"
  patterns:
    - "Module-level span stack (simple array, no AsyncLocalStorage)"
    - "WeakMap for tracking installed cleanups per container"
    - "HookableContainer interface for type-safe container abstraction"
    - "Resolution key generation for span-context mapping"

key-files:
  created:
    - "packages/tracing/src/instrumentation/span-stack.ts"
    - "packages/tracing/src/instrumentation/types.ts"
    - "packages/tracing/src/instrumentation/container.ts"
  modified:
    - "packages/tracing/package.json"

key-decisions:
  - "Use HookableContainer interface instead of InspectorAPI (addHook/removeHook on Container, not inspector)"
  - "Resolution key combines containerId, portName, depth, and timestamp for unique identification"
  - "Duration filtering at span-end (afterResolve) not span-start (beforeResolve)"
  - "Stack trace capture via new Error().stack when includeStackTrace option enabled"
  - "SpanStatus is string union ('ok' | 'error' | 'unset'), not object"

patterns-established:
  - "Instrumentation module structure: span-stack.ts, types.ts, container.ts"
  - "Double-instrumentation: auto-cleanup old hooks before installing new ones"
  - "Idempotent cleanup function: tracks cleanupCalled flag to prevent multiple calls"
  - "Span map uses unique resolution key instead of relying on stack LIFO for async safety"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 24 Plan 01: Container Instrumentation Core Summary

**Implement core container instrumentation with span stack management for distributed tracing**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T14:40:50Z
- **Completed:** 2026-02-06T14:44:41Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 1

## Accomplishments

- Module-level span stack with push/pop/getActiveSpan for context propagation across container boundaries
- AutoInstrumentOptions interface with all fields from INST-08 (filtering, attributes, duration thresholds)
- instrumentContainer function that installs beforeResolve/afterResolve hooks for automatic span creation
- Parent-child span relationships established via span stack (getActiveSpan provides parent for new spans)
- Double-instrumentation handling via WeakMap tracking (auto-cleanup old hooks before installing new ones)
- Idempotent cleanup function for hook removal
- All requirements INST-01, INST-03, INST-04, INST-05, INST-06 satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Create span stack management module** - `03fc973` (feat)
2. **Task 2: Create instrumentation types** - `a802be6` (feat)
3. **Task 3: Implement container instrumentation** - `c207a70` (feat)

## Files Created/Modified

**Created:**

- `packages/tracing/src/instrumentation/span-stack.ts` - Module-level LIFO stack for tracking active spans (133 lines)
- `packages/tracing/src/instrumentation/types.ts` - AutoInstrumentOptions, PortFilter types, type guards (323 lines)
- `packages/tracing/src/instrumentation/container.ts` - instrumentContainer function with hook installation (282 lines)

**Modified:**

- `packages/tracing/package.json` - Added @hex-di/runtime peer dependency

## Decisions Made

**1. Use HookableContainer interface instead of InspectorAPI**

- **Context:** Initially planned to use InspectorAPI for hook installation, but InspectorAPI doesn't have addHook/removeHook methods - those are on the Container type
- **Decision:** Created minimal HookableContainer interface with addHook/removeHook methods, allowing instrumentContainer to work with any container type (root, child, scope) without requiring generic type parameters
- **Rationale:** Avoids complex generics, works with all container types, type-safe abstraction
- **Impact:** instrumentContainer signature changed from `(inspector: InspectorAPI, ...)` to `(container: HookableContainer, ...)`

**2. Resolution key combines containerId, portName, depth, and timestamp**

- **Context:** Need to map spans to resolutions for retrieval in afterResolve hook
- **Decision:** Generate unique key as `${containerId}:${portName}:${depth}:${Date.now()}` and store in context as `__tracingKey`
- **Rationale:** Handles nested async resolutions that might complete out of order, ensures uniqueness even for concurrent resolutions of same port
- **Impact:** Span map uses resolution key instead of relying on stack LIFO order

**3. Duration filtering at span-end (afterResolve) not span-start**

- **Context:** minDurationMs option should filter out fast resolutions
- **Decision:** Check duration in afterResolve after span ends, not in beforeResolve
- **Rationale:** Can't know duration until resolution completes; ensures slow resolutions are always captured even if most are fast
- **Impact:** Spans below threshold are created, ended, but not recorded (implementation detail for tracer adapters)

**4. Stack trace capture via new Error().stack**

- **Context:** includeStackTrace option should add stack trace to spans
- **Decision:** Use `new Error().stack` in beforeResolve hook when option enabled
- **Rationale:** Cross-platform, works in all JavaScript environments, standard approach
- **Impact:** Performance overhead when enabled (as documented), use only for debugging

**5. SpanStatus is string union, not object**

- **Context:** Initial implementation used `span.setStatus({ code: 'ok' })`
- **Decision:** Fixed to use string directly: `span.setStatus('ok')`
- **Rationale:** SpanStatus type defined as `'unset' | 'ok' | 'error'` string union in types/status.ts
- **Impact:** Corrected API usage to match existing tracing package interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @hex-di/runtime peer dependency**

- **Found during:** Task 3 (Container instrumentation)
- **Issue:** TypeScript couldn't resolve `@hex-di/runtime` import for ResolutionHookContext and ResolutionResultContext types
- **Fix:** Added `"@hex-di/runtime": "workspace:*"` to peerDependencies in package.json
- **Files modified:** packages/tracing/package.json
- **Verification:** `pnpm install && pnpm --filter @hex-di/tracing typecheck` passes
- **Committed in:** c207a70 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Necessary dependency for compilation. No scope creep.

## Issues Encountered

None - all planned work executed successfully. The dependency addition was a straightforward fix that unblocked compilation.

## User Setup Required

None - no external service configuration required. All functionality is self-contained.

## Next Phase Readiness

- Core instrumentation is complete and ready for testing in Plan 24-02
- instrumentContainer function available for container hook installation
- Span stack provides context propagation for nested resolutions
- All INST-01, INST-03, INST-04, INST-05, INST-06 requirements satisfied
- Plan 24-02 can write integration tests for instrumentation
- Plan 24-03 can implement multi-container context propagation
- Phase 25 can integrate OTel bridge with instrumentation
- No blockers for next phase

## Self-Check: PASSED

All files created as specified:

- `packages/tracing/src/instrumentation/span-stack.ts` - EXISTS
- `packages/tracing/src/instrumentation/types.ts` - EXISTS
- `packages/tracing/src/instrumentation/container.ts` - EXISTS

All commits exist:

- 03fc973 - feat(24-01): create span stack management module
- a802be6 - feat(24-01): create instrumentation types
- c207a70 - feat(24-01): implement container instrumentation

---

_Phase: 24-container-instrumentation_
_Completed: 2026-02-06_
