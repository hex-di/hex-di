---
phase: 30-dynamic-child-instrumentation
plan: 01
status: complete
started: 2026-02-07
completed: 2026-02-07
key-files:
  created:
    - packages/runtime/tests/inspection/child-created-events.test.ts
    - packages/runtime/tests/inspection/inspector-emit.test.ts
  modified:
    - packages/core/src/inspection/inspector-types.ts
    - packages/runtime/src/inspection/builtin-api.ts
    - packages/runtime/src/container/internal/lifecycle-manager.ts
    - packages/runtime/src/container/base-impl.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/src/container/lazy-impl.ts
    - packages/runtime/src/internal.ts
    - packages/runtime/package.json
---

## What was built

Runtime event emission for child-created events. When a child container is dynamically created via `createChild`, `createChildAsync`, or `createLazyChild`, the parent container's inspector now emits a `child-created` event with `childId` and `childKind` fields.

## Key decisions

- **Root factories call `setWrapper()`**: The root container factory functions were not calling `impl.setWrapper(container)`, leaving `this.wrapper` as `null` in the base impl. Added `setWrapper` calls after `attachBuiltinAPIs` and before `Object.freeze` in both uninitalized and initialized root container factories.
- **Module-level lazy flag instead of WeakSet**: The original plan used a `WeakSet<Container>` to track lazy-created containers, but the `add()` happened after `createChild` returned — too late since the event was already emitted during creation. Replaced with a `markNextChildAsLazy()`/`consumeLazyFlag()` mechanism that sets a module-level flag before calling `createChild`.
- **Type guard `hasInspector()`**: Used a structural type guard with `in` operator checks to narrow the inspector type from `unknown` wrapper objects, avoiding type casts per project rules.
- **`childInspectorMap` as `Map<number, InspectorAPI>`**: Stores child inspector references keyed by numeric child ID for cross-package access from @hex-di/tracing.

## Commits

- `4623023` feat(30-01): add getContainer and emit methods to InspectorAPI
- `1d53242` feat(30-01): implement getContainer and emit on InspectorAPI
- `c2e3d77` feat(30-01): emit child-created events from container creation
- `e50a6b1` feat(30-01): export childInspectorMap from internal module
- `e5b0e03` test(30-01): add comprehensive child-created event tests

## Test results

- 536 runtime tests pass (526 existing + 10 new child-created-events)
- Covers sync, async, lazy creation paths
- Covers nested children, multiple subscribers, unsubscribe

## Deviations

- Root factories needed `setWrapper()` call (not anticipated in plan)
- Lazy detection mechanism changed from WeakSet to flag pattern (plan assumed WeakSet)
- No changes to `packages/runtime/src/inspection/types.ts` (it re-exports from core, no changes needed)
