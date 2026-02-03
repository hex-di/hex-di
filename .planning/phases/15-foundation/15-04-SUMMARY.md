---
phase: 15-foundation
plan: 04
subsystem: runtime-api
tags: [inspection, tracing, standalone-functions, api-ergonomics]

dependency-graph:
  requires: ["15-03"]
  provides: ["standalone-inspection-api", "standalone-tracing-api"]
  affects: []

tech-stack:
  added: []
  patterns: ["standalone-function-api"]

key-files:
  created:
    - packages/runtime/src/inspect.ts
    - packages/runtime/src/trace.ts
  modified:
    - packages/runtime/src/index.ts
    - packages/runtime/tests/exports.test.ts

decisions:
  - key: "standalone-over-factory"
    choice: "Standalone functions instead of createInspector/createTracer factories"
    rationale: "Simpler API - import inspect/trace directly rather than creating instances"

metrics:
  duration: "3 min"
  completed: "2026-02-03"
---

# Phase 15 Plan 04: Standalone Inspection and Tracing Functions Summary

Standalone inspect() and trace() functions as primary API for container inspection and tracing.

## What Changed

### New Files Created

**packages/runtime/src/inspect.ts** (71 lines)

- Standalone `inspect(container)` function
- Returns frozen `ContainerSnapshot` with full state
- Uses INTERNAL_ACCESS symbol for state access
- Leverages existing internal-helpers for snapshot building

**packages/runtime/src/trace.ts** (205 lines)

- Standalone `trace(container, fn)` for scoped tracing
- Returns `TraceResult<R>` with result and traces array
- `enableTracing(container, callback?)` for global tracing
- Uses container.addHook/removeHook from plan 15-03
- Creates proper `TraceEntry` objects matching @hex-di/core type

### Modified Files

**packages/runtime/src/index.ts**

- Added export section for standalone functions
- Exports: `inspect`, `trace`, `enableTracing`, `TraceResult`, `TraceCallback`

**packages/runtime/tests/exports.test.ts**

- Updated expected exports list to include new functions

## API Surface

```typescript
// Standalone inspection
import { inspect } from "@hex-di/runtime";

const snapshot = inspect(container);
// Returns: ContainerSnapshot with kind, phase, singletons, scopes

// Scoped tracing
import { trace } from "@hex-di/runtime";

const { result, traces } = trace(container, () => {
  return container.resolve(MyPort);
});
// traces: TraceEntry[] with portName, duration, cacheHit, etc.

// Global tracing
import { enableTracing } from "@hex-di/runtime";

const disable = enableTracing(container, entry => {
  console.log(`Resolved ${entry.portName} in ${entry.duration}ms`);
});

// Later...
disable();
```

## Dependencies

- **Uses 15-03**: container.addHook/removeHook for trace hook installation
- **Uses internal-helpers**: detectContainerKindFromInternal, buildTypedSnapshotFromInternal
- **Uses @hex-di/core**: TraceEntry type definition

## Decisions Made

1. **Timing with Date.now()**: Cross-platform compatible, matching existing codebase patterns
2. **TraceEntry compliance**: Full compliance with @hex-di/core TraceEntry interface
3. **Callback optional**: enableTracing works with or without callback

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `pnpm --filter @hex-di/runtime typecheck` - passed
- `pnpm --filter @hex-di/runtime build` - passed
- `pnpm --filter @hex-di/runtime test` - 448 tests passed

## Commits

| Hash    | Message                                                       |
| ------- | ------------------------------------------------------------- |
| 9330830 | feat(15-04): add standalone inspect function                  |
| cec9ddd | feat(15-04): add standalone trace and enableTracing functions |
| d911ea5 | feat(15-04): export standalone functions from index.ts        |

## Next Phase Readiness

- Standalone APIs ready for use
- Existing container.inspector and container.tracer still work (alternative path)
- All tests pass in @hex-di/runtime
