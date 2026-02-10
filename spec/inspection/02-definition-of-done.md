# 02 - Definition of Done

_Previous: [01 - Library Inspector Protocol](./01-library-inspector-protocol.md)_

---

This document defines all tests required for the Library Inspector Protocol across `@hex-di/core`, `@hex-di/runtime`, `@hex-di/flow`, and `@hex-di/logger` to be considered complete. Each section maps to spec section(s) and specifies required unit tests, type-level tests, integration tests, and mutation testing guidance.

## Test File Convention

| Test Category             | File Pattern  | Location                              |
| ------------------------- | ------------- | ------------------------------------- |
| Core type tests           | `*.test-d.ts` | `packages/core/tests/`                |
| Runtime unit tests        | `*.test.ts`   | `packages/runtime/tests/`             |
| Runtime integration tests | `*.test.ts`   | `packages/runtime/tests/integration/` |
| Flow bridge unit tests    | `*.test.ts`   | `libs/flow/core/tests/integration/`   |
| Flow bridge type tests    | `*.test-d.ts` | `libs/flow/core/tests/integration/`   |
| Logger bridge unit tests  | `*.test.ts`   | `packages/logger/tests/`              |
| Logger bridge type tests  | `*.test-d.ts` | `packages/logger/tests/`              |
| Cross-library integration | `*.test.ts`   | `packages/runtime/tests/integration/` |

---

## DoD 1: LibraryInspector Protocol Types (Spec Section 1)

### Type-Level Tests -- `packages/core/tests/library-inspector.test-d.ts`

| #   | Test                                                                                               | Type |
| --- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | `LibraryInspector` accepts object with `name: string` and `getSnapshot(): Record<string, unknown>` | type |
| 2   | `LibraryInspector` rejects object missing `name` property                                          | type |
| 3   | `LibraryInspector` rejects object missing `getSnapshot` method                                     | type |
| 4   | `LibraryInspector` accepts object with optional `subscribe` method                                 | type |
| 5   | `LibraryInspector` accepts object with optional `dispose` method                                   | type |
| 6   | `LibraryInspector` rejects `subscribe` that returns non-function                                   | type |
| 7   | `LibraryEvent` requires `source: string`                                                           | type |
| 8   | `LibraryEvent` requires `type: string`                                                             | type |
| 9   | `LibraryEvent` requires `payload: Readonly<Record<string, unknown>>`                               | type |
| 10  | `LibraryEvent` requires `timestamp: number`                                                        | type |
| 11  | `LibraryEvent` rejects object missing any of the four required fields                              | type |
| 12  | `LibraryEventListener` is `(event: LibraryEvent) => void`                                          | type |
| 13  | `UnifiedSnapshot` has `timestamp: number`                                                          | type |
| 14  | `UnifiedSnapshot` has `container: ContainerSnapshot`                                               | type |
| 15  | `UnifiedSnapshot` has `libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>`     | type |
| 16  | `UnifiedSnapshot` has `registeredLibraries: readonly string[]`                                     | type |

### Mutation Testing

**Target: >95% mutation score.** Type guard (`isLibraryInspector`) property checks and protocol shape validation are the only runtime code in core. Mutations to guard conditions (e.g., removing `typeof value.name === "string"` check) must be caught.

---

## DoD 2: Extended InspectorEvent & InspectorAPI (Spec Sections 2-3)

### Type-Level Tests -- `packages/core/tests/library-inspector.test-d.ts` (continued)

| #   | Test                                                                                                | Type |
| --- | --------------------------------------------------------------------------------------------------- | ---- |
| 17  | `InspectorEvent` discriminates on `type: "library"` to narrow `event` field to `LibraryEvent`       | type |
| 18  | `InspectorEvent` discriminates on `type: "library-registered"` to narrow `name` field to `string`   | type |
| 19  | `InspectorEvent` discriminates on `type: "library-unregistered"` to narrow `name` field to `string` | type |
| 20  | Exhaustive switch on `InspectorEvent.type` covers all variants including new library variants       | type |
| 21  | `InspectorAPI.registerLibrary` accepts `LibraryInspector` and returns `() => void`                  | type |
| 22  | `InspectorAPI.getLibraryInspectors` returns `ReadonlyMap<string, LibraryInspector>`                 | type |
| 23  | `InspectorAPI.getLibraryInspector` accepts `string` and returns `LibraryInspector \| undefined`     | type |
| 24  | `InspectorAPI.getUnifiedSnapshot` returns `UnifiedSnapshot`                                         | type |

### Mutation Testing

**Target: >95% mutation score.** These are type-only additions -- the mutation target is the type guard and any runtime narrowing code that depends on the new event variants.

---

## DoD 3: isLibraryInspector Type Guard (Spec Section 1)

### Unit Tests -- `packages/runtime/tests/library-inspector-guard.test.ts`

| #   | Test                                                                            | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | Returns `true` for object with `name: string` and `getSnapshot: function`       | unit |
| 2   | Returns `true` for object with `name`, `getSnapshot`, and `subscribe: function` | unit |
| 3   | Returns `true` for object with `name`, `getSnapshot`, and `dispose: function`   | unit |
| 4   | Returns `true` for object with all four members                                 | unit |
| 5   | Returns `false` for `null`                                                      | unit |
| 6   | Returns `false` for `undefined`                                                 | unit |
| 7   | Returns `false` for primitive values (string, number, boolean)                  | unit |
| 8   | Returns `false` for object missing `name`                                       | unit |
| 9   | Returns `false` for object with empty string `name`                             | unit |
| 10  | Returns `false` for object missing `getSnapshot`                                | unit |
| 11  | Returns `false` for object with `getSnapshot` that is not a function            | unit |
| 12  | Returns `false` for object with `subscribe` that is not a function              | unit |
| 13  | Returns `false` for object with `dispose` that is not a function                | unit |
| 14  | Returns `false` for object with `name` that is not a string                     | unit |

### Mutation Testing

**Target: >95% mutation score.** Every property check in the type guard is a potential mutation target. Removing or inverting any `typeof` check must be caught. The empty-string check on `name` is a critical edge case.

---

## DoD 4: Library Registry (Spec Section 4)

### Unit Tests -- `packages/runtime/tests/library-registry.test.ts`

| #   | Test                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `registerLibrary` stores inspector and returns unsubscribe function                                           | unit |
| 2   | `registerLibrary` throws `TypeError` for `null`                                                               | unit |
| 3   | `registerLibrary` throws `TypeError` for object missing `name`                                                | unit |
| 4   | `registerLibrary` throws `TypeError` for object missing `getSnapshot`                                         | unit |
| 5   | `registerLibrary` throws `TypeError` for object with non-function `subscribe`                                 | unit |
| 6   | `registerLibrary` replaces existing inspector with same name (last-write-wins)                                | unit |
| 7   | `registerLibrary` calls `dispose()` on the replaced inspector                                                 | unit |
| 8   | `registerLibrary` unsubscribes from the replaced inspector's events                                           | unit |
| 9   | `registerLibrary` tolerates replaced inspector's `dispose()` throwing                                         | unit |
| 10  | Unsubscribe function removes inspector from registry                                                          | unit |
| 11  | Unsubscribe function calls `inspector.dispose()` if present                                                   | unit |
| 12  | Unsubscribe function is idempotent (safe to call twice)                                                       | unit |
| 13  | `getLibraryInspectors` returns frozen map of all registered inspectors                                        | unit |
| 14  | `getLibraryInspectors` returns new map instance each call (not internal reference)                            | unit |
| 15  | `getLibraryInspector` returns specific inspector by name                                                      | unit |
| 16  | `getLibraryInspector` returns `undefined` for unknown name                                                    | unit |
| 17  | Event forwarding: library `subscribe` events wrapped as `{ type: "library", event }` to container subscribers | unit |
| 18  | Event forwarding: `{ type: "library-registered", name }` emitted on registration                              | unit |
| 19  | Event forwarding: `{ type: "library-unregistered", name }` emitted on unregistration                          | unit |
| 20  | Event forwarding: `"library-registered"` emitted after inspector is stored (queryable immediately)            | unit |
| 21  | Event forwarding: `"library-unregistered"` emitted after inspector is removed                                 | unit |
| 22  | Inspector without `subscribe` method: no event forwarding attempted                                           | unit |
| 23  | Inspector without `dispose` method: no dispose attempted on unregister                                        | unit |
| 24  | `getLibrarySnapshots` aggregates all inspector snapshots                                                      | unit |
| 25  | `getLibrarySnapshots` returns empty object when no inspectors registered                                      | unit |
| 26  | `getLibrarySnapshots` catches failed snapshot and replaces with `{ error: "snapshot-failed" }`                | unit |
| 27  | `getLibrarySnapshots` returns frozen result                                                                   | unit |
| 28  | `getLibrarySnapshots` succeeds even when one inspector throws                                                 | unit |
| 29  | Registry `dispose` unsubscribes all event listeners                                                           | unit |
| 30  | Registry `dispose` calls `dispose()` on all inspectors                                                        | unit |
| 31  | Registry `dispose` tolerates individual `dispose()` throwing                                                  | unit |
| 32  | Registry `dispose` tolerates individual unsubscribe throwing                                                  | unit |
| 33  | Registry `dispose` clears all internal maps                                                                   | unit |

### Mutation Testing

**Target: >95% mutation score.** Registration/unregistration lifecycle, event forwarding wrappers (`{ type: "library", event }` construction), TypeError validation gates, and disposal fault tolerance are all critical. Mutations to map operations (set/delete/clear), event type strings, or try-catch removal must be caught.

---

## DoD 5: Unified Snapshot (Spec Section 4)

### Unit Tests -- `packages/runtime/tests/unified-snapshot.test.ts`

| #   | Test                                                                                                       | Type |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `getUnifiedSnapshot` returns object with `timestamp`, `container`, `libraries`, `registeredLibraries`      | unit |
| 2   | `getUnifiedSnapshot` with no inspectors: `libraries` is empty object, `registeredLibraries` is empty array | unit |
| 3   | `getUnifiedSnapshot` with inspectors: `libraries` contains each library's snapshot                         | unit |
| 4   | `getUnifiedSnapshot` includes correct `container` snapshot from `getSnapshot()`                            | unit |
| 5   | `getUnifiedSnapshot` `registeredLibraries` sorted alphabetically                                           | unit |
| 6   | `getUnifiedSnapshot` `registeredLibraries` sorted: `["agent", "flow", "logger", "store"]`                  | unit |
| 7   | `getUnifiedSnapshot` returns frozen object (`Object.isFrozen`)                                             | unit |
| 8   | `getUnifiedSnapshot` `libraries` is frozen                                                                 | unit |
| 9   | `getUnifiedSnapshot` `registeredLibraries` is frozen                                                       | unit |
| 10  | `getUnifiedSnapshot` tolerates individual library snapshot failure                                         | unit |
| 11  | `getUnifiedSnapshot` failed library snapshot replaced with `{ error: "snapshot-failed" }`                  | unit |
| 12  | `getUnifiedSnapshot` `timestamp` is a valid `Date.now()` value                                             | unit |

### Mutation Testing

**Target: >95% mutation score.** Alphabetical sorting, freeze calls, error replacement on snapshot failure, and timestamp assignment are all critical invariants. Mutations to `sort()`, `Object.freeze()`, or try-catch blocks must be caught.

---

## DoD 6: Auto-Discovery Hook (Spec Section 5)

### Integration Tests -- `packages/runtime/tests/integration/library-auto-discovery.test.ts`

| #   | Test                                                                                                   | Type        |
| --- | ------------------------------------------------------------------------------------------------------ | ----------- |
| 1   | Port with `category: "library-inspector"` resolving a valid `LibraryInspector` is auto-registered      | integration |
| 2   | Port with `category: "library-inspector"` resolving a non-`LibraryInspector` value is silently ignored | integration |
| 3   | Port without `category: "library-inspector"` metadata is not auto-registered                           | integration |
| 4   | Port with `category: "library-inspector"` and `undefined` metadata is not auto-registered              | integration |
| 5   | Auto-registered inspector appears in `getLibraryInspectors()` immediately after resolution             | integration |
| 6   | Auto-registered inspector's events appear in container event stream via `subscribe`                    | integration |
| 7   | Auto-registered inspector's snapshot appears in `getUnifiedSnapshot().libraries`                       | integration |
| 8   | Multiple auto-registered inspectors from different ports all appear                                    | integration |
| 9   | Auto-discovery hook is O(1): metadata lookup via WeakMap, type guard is property checks                | integration |

### Mutation Testing

**Target: >90% mutation score.** The auto-discovery hook involves integration between port metadata lookup and type guard checking. The `category === "library-inspector"` string comparison and conditional `isLibraryInspector` gate are the primary mutation targets.

---

## DoD 7: Container Lifecycle Integration (Spec Section 5)

### Integration Tests -- `packages/runtime/tests/integration/library-lifecycle.test.ts`

| #   | Test                                                                                   | Type        |
| --- | -------------------------------------------------------------------------------------- | ----------- |
| 1   | Library inspectors survive container initialization phase                              | integration |
| 2   | Library inspectors registered before initialization are available after init completes | integration |
| 3   | Library inspectors are disposed when container is disposed                             | integration |
| 4   | Container disposal calls `dispose()` on all registered library inspectors              | integration |
| 5   | Container disposal unsubscribes all library event listeners                            | integration |
| 6   | Library inspectors in child containers are independent from parent                     | integration |
| 7   | Parent container disposal does not dispose child container's library inspectors        | integration |
| 8   | Scope creation does not affect library inspector registration                          | integration |
| 9   | Scope disposal does not affect library inspector registration                          | integration |
| 10  | Container disposal tolerates library inspector `dispose()` throwing                    | integration |

### Mutation Testing

**Target: >85% mutation score.** Container lifecycle integration tests cover coordination paths. The disposal sequencing (library registry disposed during container teardown) and scope isolation guarantees are the key targets. Lower target reflects integration complexity.

---

## DoD 8: Performance (Spec Section 10)

### Performance Tests -- `packages/runtime/tests/library-registry-perf.test.ts`

| #   | Test                                                                                       | Type |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 1   | Zero overhead: `getSnapshot()` performance unchanged when no library inspectors registered | perf |
| 2   | `registerLibrary` completes in < 1ms                                                       | perf |
| 3   | `getUnifiedSnapshot` with 5 library inspectors completes in < 5ms                          | perf |
| 4   | Auto-discovery hook adds < 0.1ms per port resolution                                       | perf |
| 5   | `getLibraryInspectors` returns frozen map in < 0.5ms with 10 inspectors                    | perf |

### Mutation Testing

Performance tests are not mutation-tested.

---

## DoD 9: Flow Library Bridge (Spec Section 6)

### Unit Tests -- `libs/flow/core/tests/integration/library-inspector-bridge.test.ts`

| #   | Test                                                                                                   | Type |
| --- | ------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `createFlowLibraryInspector` returns object satisfying `isLibraryInspector` type guard                 | unit |
| 2   | Bridge `name` is `"flow"`                                                                              | unit |
| 3   | Bridge `getSnapshot` returns frozen object                                                             | unit |
| 4   | Bridge `getSnapshot` includes `machineCount` field                                                     | unit |
| 5   | Bridge `getSnapshot` includes `machines` array with per-machine info                                   | unit |
| 6   | Bridge `getSnapshot` machine entries include `portName`, `instanceId`, `machineId`, `state`, `scopeId` | unit |
| 7   | Bridge `getSnapshot` includes `healthEvents` from `FlowInspector`                                      | unit |
| 8   | Bridge `getSnapshot` includes `effectStatistics` from `FlowInspector`                                  | unit |
| 9   | Bridge `getSnapshot` `machines` array is frozen                                                        | unit |
| 10  | Bridge `getSnapshot` each machine entry is frozen                                                      | unit |
| 11  | Bridge `subscribe` forwards registry events as `LibraryEvent`                                          | unit |
| 12  | Bridge `subscribe` events have `source: "flow"`                                                        | unit |
| 13  | Bridge `subscribe` events have correct `type` from registry event                                      | unit |
| 14  | Bridge `subscribe` events have frozen `payload`                                                        | unit |
| 15  | Bridge `subscribe` events have `timestamp` as `number`                                                 | unit |
| 16  | Bridge `subscribe` returns unsubscribe function                                                        | unit |
| 17  | Bridge `dispose` calls `flowInspector.dispose()`                                                       | unit |

### Type-Level Tests -- `libs/flow/core/tests/integration/library-inspector-bridge.test-d.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `createFlowLibraryInspector` return type satisfies `LibraryInspector`      | type |
| 2   | `FlowLibraryInspectorPort` extends `Port<LibraryInspector>`                | type |
| 3   | `FlowLibraryInspectorPort` has `category: "library-inspector"` in metadata | type |

### Integration Tests -- `libs/flow/core/tests/integration/library-inspector-bridge.test.ts` (continued)

| #   | Test                                                                                                      | Type        |
| --- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 18  | Flow library inspector auto-discovered when `FlowLibraryInspectorAdapter` is in graph                     | integration |
| 19  | `container.inspector.getLibraryInspector("flow")` returns the flow bridge                                 | integration |
| 20  | `container.inspector.getUnifiedSnapshot().libraries.flow` contains machine data                           | integration |
| 21  | Flow registry events appear as `{ type: "library", event: { source: "flow" } }` in container event stream | integration |

### Mutation Testing

**Target: >90% mutation score.** The bridge wraps existing Flow inspector APIs into the `LibraryInspector` protocol. Snapshot field mapping (machineCount, machines array construction, healthEvents, effectStatistics), event wrapping (source assignment, payload freeze, timestamp), and dispose delegation are the key targets.

---

## DoD 10: Logger Library Bridge (Spec Section 6)

### Unit Tests -- `packages/logger/tests/library-inspector-bridge.test.ts`

| #   | Test                                                                                     | Type |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| 1   | `createLoggerLibraryInspector` returns object satisfying `isLibraryInspector` type guard | unit |
| 2   | Bridge `name` is `"logger"`                                                              | unit |
| 3   | Bridge `getSnapshot` returns frozen `LoggingSnapshot`                                    | unit |
| 4   | Bridge `getSnapshot` includes `totalEntries` field                                       | unit |
| 5   | Bridge `getSnapshot` includes `entriesByLevel` record                                    | unit |
| 6   | Bridge `getSnapshot` includes `errorRate` field                                          | unit |
| 7   | Bridge `getSnapshot` includes `handlers` field (count, types)                            | unit |
| 8   | Bridge `getSnapshot` includes `samplingActive` boolean                                   | unit |
| 9   | Bridge `getSnapshot` includes `redactionActive` boolean                                  | unit |
| 10  | Bridge `getSnapshot` includes `contextDepth` field                                       | unit |
| 11  | Bridge `subscribe` forwards logger inspector events as `LibraryEvent`                    | unit |
| 12  | Bridge `subscribe` events have `source: "logger"`                                        | unit |
| 13  | Bridge `subscribe` events have correct `type` from logger event                          | unit |
| 14  | Bridge `subscribe` events have frozen `payload`                                          | unit |
| 15  | Bridge `subscribe` events have `timestamp` as `number`                                   | unit |
| 16  | Bridge `subscribe` returns unsubscribe function                                          | unit |
| 17  | Bridge `subscribe` forwards `"entry-logged"` event                                       | unit |
| 18  | Bridge `subscribe` forwards `"error-rate-threshold"` event                               | unit |
| 19  | Bridge `subscribe` forwards `"handler-error"` event                                      | unit |
| 20  | Bridge `subscribe` forwards `"sampling-dropped"` event                                   | unit |
| 21  | Bridge `subscribe` forwards `"redaction-applied"` event                                  | unit |

### Type-Level Tests -- `packages/logger/tests/library-inspector-bridge.test-d.ts`

| #   | Test                                                                         | Type |
| --- | ---------------------------------------------------------------------------- | ---- |
| 1   | `createLoggerLibraryInspector` return type satisfies `LibraryInspector`      | type |
| 2   | `LoggerLibraryInspectorPort` extends `Port<LibraryInspector>`                | type |
| 3   | `LoggerLibraryInspectorPort` has `category: "library-inspector"` in metadata | type |

### Integration Tests -- `packages/logger/tests/library-inspector-bridge.test.ts` (continued)

| #   | Test                                                                                                 | Type        |
| --- | ---------------------------------------------------------------------------------------------------- | ----------- |
| 22  | Logger library inspector auto-discovered when `LoggerLibraryInspectorAdapter` is in graph            | integration |
| 23  | `container.inspector.getLibraryInspector("logger")` returns the logger bridge                        | integration |
| 24  | `container.inspector.getUnifiedSnapshot().libraries.logger` contains logging state                   | integration |
| 25  | Logger events appear as `{ type: "library", event: { source: "logger" } }` in container event stream | integration |

### Mutation Testing

**Target: >90% mutation score.** The bridge wraps existing Logger inspector APIs into the `LibraryInspector` protocol. Snapshot field passthrough (totalEntries, entriesByLevel, errorRate, handlers, samplingActive, redactionActive, contextDepth), event wrapping (source assignment, payload freeze, timestamp), and event type forwarding are the key targets.

---

## DoD 11: Cross-Cutting (Spec Sections 7-11)

### Integration Tests -- `packages/runtime/tests/integration/unified-inspection.test.ts`

| #   | Test                                                                                                                | Type        |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Full lifecycle: register flow + logger inspectors -> query unified snapshot -> dispose container                    | integration |
| 2   | Multiple libraries: unified snapshot contains both flow and logger sections                                         | integration |
| 3   | Event stream: flow and logger events both appear as `{ type: "library" }` in single subscriber                      | integration |
| 4   | Registration order: libraries registered in any order, `registeredLibraries` always sorted                          | integration |
| 5   | Imperative + auto-discovery: mix of manually registered and auto-discovered inspectors coexist                      | integration |
| 6   | Inspector replacement: registering new flow inspector replaces old one, unified snapshot reflects new data          | integration |
| 7   | Partial failure: one library snapshot fails, others still present in unified snapshot                               | integration |
| 8   | Container disposal: all library inspectors disposed, no events emitted after disposal                               | integration |
| 9   | Exports: `LibraryInspector`, `LibraryEvent`, `LibraryEventListener`, `UnifiedSnapshot` exported from `@hex-di/core` | integration |
| 10  | Exports: `isLibraryInspector` exported from `@hex-di/core`                                                          | integration |
| 11  | No `any` types in new source files                                                                                  | integration |
| 12  | No type casts (`as`) in new source files                                                                            | integration |

### Mutation Testing

**Target: >85% mutation score.** Cross-cutting tests cover the full system but are inherently less fine-grained than unit tests. The lower target reflects that integration-level mutations may not always be observable through the public API. Focus mutation testing on registration-to-snapshot data flow and event forwarding boundaries.

---

## Test Count Summary

| Category          | @hex-di/core | @hex-di/runtime | @hex-di/flow | @hex-di/logger | Total    |
| ----------------- | ------------ | --------------- | ------------ | -------------- | -------- |
| Unit tests        | --           | ~47             | ~17          | ~21            | ~85      |
| Type-level tests  | ~24          | --              | ~3           | ~3             | ~30      |
| Integration tests | --           | ~31             | ~4           | ~4             | ~39      |
| Performance tests | --           | ~5              | --           | --             | ~5       |
| **Total**         | **~24**      | **~83**         | **~20**      | **~24**        | **~159** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                              | Command                                                                          | Expected   |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| All core type tests pass           | `pnpm --filter @hex-di/core test:types`                                          | 0 failures |
| All runtime tests pass             | `pnpm --filter @hex-di/runtime test`                                             | 0 failures |
| All runtime integration tests pass | `pnpm --filter @hex-di/runtime test -- --dir integration`                        | 0 failures |
| All flow bridge tests pass         | `pnpm --filter @hex-di/flow test`                                                | 0 failures |
| All flow bridge type tests pass    | `pnpm --filter @hex-di/flow test:types`                                          | 0 failures |
| All logger bridge tests pass       | `pnpm --filter @hex-di/logger test`                                              | 0 failures |
| All logger bridge type tests pass  | `pnpm --filter @hex-di/logger test:types`                                        | 0 failures |
| Typecheck passes (core)            | `pnpm --filter @hex-di/core typecheck`                                           | 0 errors   |
| Typecheck passes (runtime)         | `pnpm --filter @hex-di/runtime typecheck`                                        | 0 errors   |
| Typecheck passes (flow)            | `pnpm --filter @hex-di/flow typecheck`                                           | 0 errors   |
| Typecheck passes (logger)          | `pnpm --filter @hex-di/logger typecheck`                                         | 0 errors   |
| Lint passes (core)                 | `pnpm --filter @hex-di/core lint`                                                | 0 errors   |
| Lint passes (runtime)              | `pnpm --filter @hex-di/runtime lint`                                             | 0 errors   |
| Lint passes (flow)                 | `pnpm --filter @hex-di/flow lint`                                                | 0 errors   |
| Lint passes (logger)               | `pnpm --filter @hex-di/logger lint`                                              | 0 errors   |
| No `any` types in new source       | `grep -r "any" packages/core/src/inspection/library-inspector-types.ts`          | 0 matches  |
| No type casts in new source        | `grep -r " as " packages/runtime/src/inspection/library-registry.ts`             | 0 matches  |
| No eslint-disable in new source    | `grep -r "eslint-disable" packages/runtime/src/inspection/library-registry.ts`   | 0 matches  |
| Mutation score (type guard)        | `pnpm --filter @hex-di/core stryker -- --mutate src/inspection/library-*`        | >95%       |
| Mutation score (library registry)  | `pnpm --filter @hex-di/runtime stryker -- --mutate src/inspection/library-*`     | >95%       |
| Mutation score (unified snapshot)  | `pnpm --filter @hex-di/runtime stryker -- --mutate src/inspection/builtin-api.*` | >90%       |
| Mutation score (flow bridge)       | `pnpm --filter @hex-di/flow stryker -- --mutate src/integration/library-*`       | >90%       |
| Mutation score (logger bridge)     | `pnpm --filter @hex-di/logger stryker -- --mutate src/inspection/library-*`      | >90%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for the Library Inspector Protocol

The Library Inspector Protocol is an integration boundary that coordinates between the container and ecosystem libraries. Standard code coverage cannot verify subtle behavioral mutations:

- **Type guard property checks** -- removing `typeof value.name === "string"` from `isLibraryInspector` would silently accept invalid inspectors, causing runtime crashes when `registerLibrary` stores an object without a usable `name`
- **Event type string construction** -- mutating `"library"` to `"library-registered"` in event forwarding would cause container subscribers to receive registration events instead of library data events
- **Snapshot aggregation fault tolerance** -- removing the try-catch in `getLibrarySnapshots` would cause one failing library to crash the entire unified snapshot
- **Disposal sequencing** -- removing the unsubscribe-before-dispose ordering would leak event listeners during container teardown
- **Alphabetical sort** -- removing `sort()` from `registeredLibraries` would make unified snapshots non-deterministic, breaking snapshot-based testing and MCP resource caching
- **Freeze enforcement** -- removing `Object.freeze()` calls would allow callers to mutate shared snapshot data, causing cross-subscriber interference
- **Bridge source field** -- mutating `source: "flow"` to `source: "logger"` would misattribute events in the unified event stream, confusing DevTools and AI agents

### Mutation Targets by Priority

| Priority | Module                                        | Target Score | Rationale                                                                               |
| -------- | --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Critical | Type guard (`isLibraryInspector`)             | >95%         | Protocol boundary. Wrong acceptance = runtime crashes downstream.                       |
| Critical | Library registry (`library-registry.ts`)      | >95%         | Core state management. Registration, event forwarding, disposal must be exact.          |
| Critical | Unified snapshot (`getUnifiedSnapshot`)       | >90%         | Aggregation logic. Sort, freeze, fault tolerance are critical for determinism.          |
| High     | Flow bridge (`library-inspector-bridge.ts`)   | >90%         | Integration adapter. Snapshot field mapping and event wrapping must preserve semantics. |
| High     | Logger bridge (`library-inspector-bridge.ts`) | >90%         | Integration adapter. Same concerns as flow bridge.                                      |
| Medium   | Auto-discovery hook                           | >85%         | Convention-based. String comparison and conditional gate. Lower complexity.             |
| Medium   | Container lifecycle integration               | >85%         | Coordination paths. Disposal ordering tested through integration tests.                 |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` -> `!==`, `>` -> `>=` (catches type guard checks, empty-string name validation)
- **String literal mutations**: `"library"` -> `"library-registered"` (catches event type confusion in forwarding)
- **Method call mutations**: Removing `Object.freeze()` (catches missing immutability enforcement)
- **Block removal**: Removing `try {} catch {}` (catches fault tolerance removal in snapshot aggregation and disposal)
- **Boolean mutations**: `true` -> `false` in type guard return values
- **Return value mutations**: Removing `return` from unsubscribe function (catches missing cleanup on unregistration)
- **Property access mutations**: `event.type` -> `event.source` (catches event wrapping field confusion in bridges)
- **Array method mutations**: Removing `.sort()` (catches non-deterministic registeredLibraries ordering)

### Stryker Configuration

```json
{
  "mutate": [
    "packages/core/src/inspection/library-inspector-types.ts",
    "packages/runtime/src/inspection/library-registry.ts",
    "packages/runtime/src/inspection/builtin-api.ts",
    "libs/flow/core/src/integration/library-inspector-bridge.ts",
    "packages/logger/src/inspection/library-inspector-bridge.ts"
  ],
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 90,
    "low": 80,
    "break": 80
  },
  "timeoutMS": 60000,
  "timeoutFactor": 2.5,
  "concurrency": 4
}
```

Thresholds are set at `(90/80/80)` -- slightly lower than core state machine code `(90/80/80)` but higher than pure integration packages. The protocol code is a thin coordination layer but correctness at the boundary (type guard, event forwarding, snapshot aggregation) is essential for the entire unified inspection system to function.

---

_Previous: [01 - Library Inspector Protocol](./01-library-inspector-protocol.md)_

_End of Definition of Done_
