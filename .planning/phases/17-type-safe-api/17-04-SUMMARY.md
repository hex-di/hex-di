---
phase: 17
plan: 04
subsystem: override-api
tags: [override, type-safety, breaking-change, api-cleanup]
graph:
  requires: ["17-01", "17-02", "17-03"]
  provides: ["adapter-only-override-api"]
  affects: ["17-05", "17-06"]
tech-stack:
  removed: ["override-context.ts", "withOverrides", "string-based-overrides"]
key-files:
  deleted:
    - packages/runtime/src/container/override-context.ts
  modified:
    - packages/runtime/src/container/base-impl.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/src/container/wrappers.ts
    - packages/runtime/src/types/container.ts
    - packages/runtime/src/util/memo-map.ts
    - packages/runtime/tests/override.test.ts
decisions:
  - id: "17-04-01"
    title: "Complete removal of string-based API"
    choice: "Delete override-context.ts entirely, remove withOverrides from interface"
    rationale: "Clean break, no backward compatibility per project rules"
  - id: "17-04-02"
    title: "Tests updated to reflect actual behavior"
    choice: "Document that shared inheritance means parent instances are used"
    rationale: "Tests should verify actual behavior, not assumed behavior from old API"
metrics:
  duration: 6m25s
  completed: 2026-02-05
---

# Phase 17 Plan 04: Remove String-Based Override API

Removed string-based withOverrides() method; only adapter-based container.override(adapter).build() remains.

## Summary

This plan completed the migration to type-safe adapter-based overrides by:

1. **Deleted override-context.ts** - Removed the entire file that handled string-based override contexts
2. **Removed withOverrides method** - Removed from Container interface and all implementations
3. **Updated tests** - Rewrote override.test.ts to test adapter-based API

## Tasks Completed

| Task | Description                           | Commit              |
| ---- | ------------------------------------- | ------------------- |
| 1    | Remove string-based override context  | 6d7867a             |
| 2    | Update child container implementation | (no changes needed) |
| 3    | Update override tests                 | c9f36ae             |

## Technical Details

### Files Deleted

- `packages/runtime/src/container/override-context.ts` - String-based override context with OverrideContext class, OverrideFactoryMap type, push/pop/get context functions

### Code Removed

**From Container interface:**

- `withOverrides<TOverrides, R>(overrides, fn): R` method
- `InferServiceByName` utility type
- `ExtractPortNames` import

**From implementations:**

- `withOverrides` method from RootContainerWrapper (uninitialized)
- `withOverrides` method from RootContainerWrapper (initialized)
- `withOverrides` method from ChildContainerWrapper
- Override context checking in `resolve()` and `resolveInternal()`

### API Change

**Before (string-based):**

```typescript
container.withOverrides({ Logger: () => mockLogger }, () => {
  // temporary override scope
  const logger = container.resolve(LoggerPort);
});
```

**After (adapter-based):**

```typescript
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  factory: () => mockLogger,
});

const overrideContainer = container.override(MockLoggerAdapter).build();
const logger = overrideContainer.resolve(LoggerPort);
```

## Behavior Clarification

The adapter-based API creates child containers with overridden adapters. Key behavior documented in tests:

1. **Shared inheritance (default):** Non-overridden singletons from parent use parent's dependencies
2. **Isolation requires explicit override:** To make a service use overridden dependencies, override the service adapter too
3. **Override containers are independent:** Each `.override().build()` creates a separate child container

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Build passes: `pnpm --filter @hex-di/runtime build`
- Type check passes: `pnpm --filter @hex-di/runtime typecheck`
- All 463 tests pass: `pnpm --filter @hex-di/runtime test`
- No string-based override code in source

## Next Phase Readiness

Phase 17 is now 5/6 complete. Plans 17-05 and 17-06 were already completed in a previous session.
