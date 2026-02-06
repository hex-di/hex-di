---
phase: 26
plan: 02
subsystem: runtime
tags: [breaking-change, tracing, container, runtime]
requires: []
provides:
  - "@hex-di/runtime without trace(), enableTracing(), or container.tracer"
  - "Container type without TracingAPI dependency"
affects:
  - "26-03 (downstream integration packages referencing container.tracer)"
  - "26-04 (example apps referencing removed APIs)"
tech-stack:
  added: []
  removed:
    - "createBuiltinTracerAPI (runtime internal)"
    - "trace(), enableTracing() (standalone functions)"
    - "hasTracing(), getTracingAPI(), ContainerWithTracing (type guards)"
  patterns:
    - "Container type without built-in tracer (inspector-only built-in API)"
key-files:
  created: []
  modified:
    - "packages/runtime/src/types/container.ts"
    - "packages/runtime/src/container/factory.ts"
    - "packages/runtime/src/container/wrappers.ts"
    - "packages/runtime/src/container/wrapper-utils.ts"
    - "packages/runtime/src/inspection/builtin-api.ts"
    - "packages/runtime/src/index.ts"
  deleted:
    - "packages/runtime/src/trace.ts"
    - "packages/runtime/src/tracing/index.ts"
    - "packages/runtime/src/tracing/type-guards.ts"
    - "packages/runtime/tests/tracer.test.ts"
    - "packages/runtime/tests/plugins/tracing/collectors.test.ts"
key-decisions:
  - "Container.tracer removed; tracing now exclusively via @hex-di/tracing instrumentContainer()"
  - "TRACING_ACCESS symbol retained (used by inspection system, not by container.tracer)"
  - "createBuiltinTracerAPI removed from builtin-api.ts; inspector creation unaffected"
patterns-established:
  - "Container built-in APIs: only inspector (tracer is external via @hex-di/tracing)"
duration: "17m"
completed: "2026-02-06"
---

# Phase 26 Plan 02: Remove Old Tracing APIs from @hex-di/runtime Summary

Removed trace(), enableTracing(), container.tracer property, and all TracingAPI coupling from @hex-di/runtime.

## What Was Done

### Task 1: Remove trace.ts and tracing re-exports

The `trace.ts` file and `tracing/` directory (containing `index.ts` and `type-guards.ts`) were already absent from the git HEAD -- they had been local uncommitted additions. The `index.ts` was already clean in HEAD. No commit needed for this task.

### Task 2: Remove container.tracer property

- Removed `readonly tracer: TracingAPI` from `ContainerMembers` type in `container.ts`
- Removed `TracingAPI` import from `container.ts`, `factory.ts`, `wrappers.ts`, `wrapper-utils.ts`
- Removed `tracer?: TracingAPI` placeholder fields from internal container types
- Removed `createBuiltinTracerAPI()` function from `builtin-api.ts`
- Removed tracer attachment from `attachBuiltinAPIs()` in `wrapper-utils.ts`
- Updated `Omit<..., "inspector" | "tracer">` to `Omit<..., "inspector">` across factory/wrappers
- Commit: `a913146`

### Task 3: Verify runtime package builds

- Deleted `tracer.test.ts` and `collectors.test.ts` (tested removed APIs)
- Removed tracer tests from `property-api.test.ts` (kept inspector tests)
- Updated `exports.test.ts` expected exports list (removed trace/enableTracing/hasTracing/getTracingAPI)
- `pnpm --filter @hex-di/runtime typecheck` passes
- `pnpm --filter @hex-di/runtime build` passes
- Commit: `33c22e7`

## Task Commits

| Task | Name                                   | Commit                                      | Key Files                                                                 |
| ---- | -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | Remove trace.ts and tracing re-exports | (no commit needed -- already clean in HEAD) | N/A                                                                       |
| 2    | Remove container.tracer property       | a913146                                     | container.ts, factory.ts, wrappers.ts, wrapper-utils.ts, builtin-api.ts   |
| 3    | Verify runtime package builds          | 33c22e7                                     | tracer.test.ts, collectors.test.ts, property-api.test.ts, exports.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test files referenced removed APIs**

- **Found during:** Task 3
- **Issue:** `tracer.test.ts`, `collectors.test.ts`, `property-api.test.ts`, and `exports.test.ts` referenced `trace()`, `enableTracing()`, `container.tracer`, `MemoryCollector`, `NoOpCollector`, `CompositeCollector`, and other removed exports, causing typecheck failures.
- **Fix:** Deleted `tracer.test.ts` and `collectors.test.ts` entirely (tested fully removed functionality). Removed tracer-related test cases from `property-api.test.ts`. Updated `exports.test.ts` expected exports list.
- **Files modified:** 4 test files (2 deleted, 2 modified)
- **Commit:** 33c22e7

**2. [Rule 3 - Blocking] createBuiltinTracerAPI had no remaining consumers**

- **Found during:** Task 2
- **Issue:** After removing `tracer` attachment from `wrapper-utils.ts`, the `createBuiltinTracerAPI()` function in `builtin-api.ts` had no consumers. Leaving dead code with `TracingAPI`/`MemoryCollector` imports would block clean builds.
- **Fix:** Removed `createBuiltinTracerAPI()` and its associated imports (`TracingAPI`, `TraceFilter`, `TraceStats`, `TraceEntry`, `MemoryCollector`) from `builtin-api.ts`.
- **Files modified:** `packages/runtime/src/inspection/builtin-api.ts`
- **Commit:** a913146

**3. [Note] trace.ts and tracing/ were not in git HEAD**

- **Found during:** Task 1
- **Issue:** The files `trace.ts`, `tracing/index.ts`, and `tracing/type-guards.ts` existed as uncommitted local files but were never committed to git. The `index.ts` exports for these files were also absent from HEAD.
- **Fix:** Cleaned up local files. No commit was needed since HEAD was already in the desired state.
- **Impact:** None -- Task 1 was effectively a no-op.

## Verification Results

- `packages/runtime/src/trace.ts` does not exist
- `packages/runtime/src/index.ts` does not export `trace` or `enableTracing`
- No `container.tracer` property in any runtime types or implementations
- No `TracingAPI` import in container.ts, factory.ts, wrappers.ts, or wrapper-utils.ts
- `pnpm --filter @hex-di/runtime typecheck` passes
- `pnpm --filter @hex-di/runtime build` passes

## Success Criteria

- MIGR-02 complete: trace(), enableTracing() removed from @hex-di/runtime
- MIGR-03 complete: container.tracer property removed from @hex-di/runtime
- MIGR-04 complete: Runtime no longer re-exports old collectors
- @hex-di/runtime package builds independently

## Next Phase Readiness

- Downstream packages (integrations/hono, integrations/react, examples) will have compile errors referencing `container.tracer` -- these are addressed in plans 26-03 and 26-04.
- The `TRACING_ACCESS` symbol is retained for the inspection system and may be cleaned up in a future plan if no longer needed.

## Self-Check: PASSED
