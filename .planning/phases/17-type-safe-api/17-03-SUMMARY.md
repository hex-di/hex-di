---
phase: 17-type-safe-api
plan: 03
subsystem: runtime-api
tags: [api-simplification, developer-experience, typescript, runtime]
requires:
  - 16-03
provides:
  - unified-createcontainer-api
affects:
  - 17-04
  - 17-05
  - 17-06
tech-stack:
  added: []
  patterns: [single-options-object-pattern]
key-files:
  created: []
  modified:
    - packages/runtime/src/types/options.ts
    - packages/runtime/src/types/index.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/tests/**/*.ts
    - packages/runtime/src/**/*.ts
decisions:
  - id: unified-config-object
    choice: Single configuration object for createContainer
    rationale: Modern API pattern, more extensible, cleaner syntax
  - id: no-backward-compatibility
    choice: Breaking change with no migration path
    rationale: Project policy is to always implement cleanest solution
  - id: hooks-in-config
    choice: Hooks moved from third parameter to hooks field in config
    rationale: All configuration in one place
metrics:
  duration: 5 minutes
  completed: 2026-02-04
---

# Phase 17 Plan 03: Simplify createContainer with Unified Options Summary

**One-liner:** Consolidated createContainer API from three parameters (graph, containerOptions, hookOptions) to single config object with graph, name, hooks, devtools, and performance fields.

## Objective

Simplify the createContainer API by replacing three separate parameters with a single configuration object, improving developer experience and extensibility.

## Changes Made

### 1. Created Unified Options Type

**File:** `packages/runtime/src/types/options.ts`

- Added `CreateContainerConfig<TProvides, TAsyncPorts>` interface
- Includes fields: `graph`, `name`, `hooks`, `devtools`, `performance`
- Imported `ResolutionHooks` from hooks module
- Added comprehensive JSDoc examples

### 2. Updated createContainer Signature

**File:** `packages/runtime/src/container/factory.ts`

- Changed from: `createContainer(graph, containerOptions, hookOptions?)`
- Changed to: `createContainer(config: CreateContainerConfig<TProvides, TAsyncPorts>)`
- Destructured `{ graph, name, hooks, performance }` from config
- Updated JSDoc to reflect new API pattern
- Exported `CreateContainerConfig` from types/index.ts

### 3. Updated All Tests

**Files:** 29 test files across packages/runtime/tests and packages/runtime/src

- Changed from: `createContainer(graph, { name: "Test" })`
- Changed to: `createContainer({ graph, name: "Test" })`
- Updated multi-line calls with hooks:
  - Before: `createContainer(graph, { name }, { hooks: {...} })`
  - After: `createContainer({ graph, name, hooks: {...} })`
- Fixed 5 instances in `async-resolution.test.ts` with hook configurations
- Updated exports test to include OverrideBuilder (pre-existing)

## Key Decisions

### Single Configuration Object

The new API consolidates all options into a single object:

```typescript
const container = createContainer({
  graph,
  name: "App",
  hooks: {
    beforeResolve: ctx => console.log(`Resolving ${ctx.portName}`),
    afterResolve: ctx => console.log(`Done in ${ctx.duration}ms`),
  },
  performance: { disableTimestamps: true },
});
```

**Benefits:**

- Named parameters improve clarity
- Single source of configuration
- More extensible for future options
- Matches modern API patterns

### No Backward Compatibility

Per project policy, this is a clean breaking change with no migration path or compatibility shims. The old API was removed entirely.

## Testing

- All 448 tests passing
- No test behavior changes, only API updates
- Type safety maintained through CreateContainerConfig interface

## Deviations from Plan

**[Rule 2 - Missing Critical] Added OverrideBuilder to exports test**

- **Found during:** Task 3 test execution
- **Issue:** OverrideBuilder was added to exports from pre-existing untracked override-builder.ts file
- **Fix:** Updated exports.test.ts expected exports list to include "OverrideBuilder"
- **Files modified:** packages/runtime/tests/exports.test.ts
- **Commit:** 3ce0342

## Implementation Details

### Type Definition

The `CreateContainerConfig` type combines:

- `graph`: The ServiceGraph from @hex-di/graph
- `name`: Container identifier
- `hooks`: Optional ResolutionHooks with beforeResolve/afterResolve
- `devtools`: Optional DevTools visibility settings
- `performance`: Optional runtime performance options

All fields except `graph` and `name` are optional, maintaining flexibility.

### Migration Pattern

Old API:

```typescript
createContainer(graph, { name: "App" }, { hooks: {...} })
```

New API:

```typescript
createContainer({ graph, name: "App", hooks: {...} })
```

## Commits

- `a420444` feat(17-03): create unified CreateContainerConfig type
- `353c6f5` feat(17-03): update createContainer to use single config object
- `3ce0342` feat(17-03): update all tests to use new createContainer API

## Next Phase Readiness

**Ready for:** 17-04 (Type-Safe Child Container Options)

The unified config pattern established here should be applied to child container creation for consistency.

**Concerns:** None

**Blockers:** None

## Files Modified

**Core Implementation:**

- packages/runtime/src/types/options.ts (+ CreateContainerConfig interface)
- packages/runtime/src/types/index.ts (exported CreateContainerConfig)
- packages/runtime/src/container/factory.ts (updated signature and implementation)

**Tests Updated:** 29 files

- packages/runtime/tests/async-resolution.test.ts
- packages/runtime/tests/child-container\*.test.ts
- packages/runtime/tests/container\*.test.ts
- packages/runtime/tests/disposal.test.ts
- packages/runtime/tests/inspector.test.ts
- packages/runtime/tests/integration.test.ts
- packages/runtime/tests/internal-access.test.ts
- packages/runtime/tests/lazy-container.test.ts
- packages/runtime/tests/lifetime.test.ts
- packages/runtime/tests/memory-cleanup.test.ts
- packages/runtime/tests/override\*.test.ts
- packages/runtime/tests/performance.bench.ts
- packages/runtime/tests/plugins/property-api.test.ts
- packages/runtime/tests/port-resolution-type-safety.test.ts
- packages/runtime/tests/scope\*.test.ts
- packages/runtime/tests/support/fixtures.ts
- packages/runtime/tests/support/test-builder.ts
- packages/runtime/tests/exports.test.ts

**Source Files Updated:** 8 files

- packages/runtime/src/tracing/index.ts
- packages/runtime/src/types/container.ts
- packages/runtime/src/types/options.ts
- packages/runtime/src/inspect.ts
- packages/runtime/src/inspection/\*.ts
- packages/runtime/src/trace.ts
- packages/runtime/src/verify-runtime-safety.test.ts

## Metrics

- **Tasks Completed:** 3/3
- **Tests Passing:** 448/448
- **Files Modified:** 37
- **Lines Changed:** ~200 (mostly API call updates)
- **Duration:** 5 minutes
