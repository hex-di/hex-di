# Task Breakdown: Library Inspector Protocol

## Overview

**Total Tasks:** 8 task groups, 74 sub-tasks
**Packages affected:** `@hex-di/core`, `@hex-di/runtime`, `@hex-di/flow`, `@hex-di/logger`
**DoD total tests:** ~159 across 11 DoD sections

## Task List

### Core Types (`@hex-di/core`)

#### Task Group 1: LibraryInspector Protocol Types

**Dependencies:** None
**Estimated tests:** 16 type-level tests (DoD 1)

This group establishes the foundational types that every other task group depends on. Nothing can be implemented without these interfaces existing first.

- [ ] 1.0 Complete LibraryInspector protocol types in `@hex-di/core`
  - [ ] 1.1 Create `packages/core/src/inspection/library-inspector-types.ts`
    - Define `LibraryEvent` interface with `source: string`, `type: string`, `payload: Readonly<Record<string, unknown>>`, `timestamp: number` (all `readonly`)
    - Define `LibraryEventListener` type as `(event: LibraryEvent) => void`
    - Define `LibraryInspector` interface with `readonly name: string`, `getSnapshot(): Readonly<Record<string, unknown>>`, optional `subscribe?(listener: LibraryEventListener): () => void`, optional `dispose?(): void`
    - Define `UnifiedSnapshot` interface with `timestamp: number`, `container: ContainerSnapshot`, `libraries: Readonly<Record<string, Readonly<Record<string, unknown>>>>`, `registeredLibraries: readonly string[]` (all `readonly`)
    - Implement `isLibraryInspector(value: unknown): value is LibraryInspector` type guard with all five checks from spec section 1
    - No `any` types, no type casts, no `eslint-disable`
    - **Satisfies:** Spec sections 1, 3 (UnifiedSnapshot type)
  - [ ] 1.2 Write type-level tests in `packages/core/tests/library-inspector.test-d.ts`
    - 16 type-level tests covering DoD 1 items #1-#16
    - Tests for `LibraryInspector` structural shape: accepts valid objects, rejects missing `name`, rejects missing `getSnapshot`, accepts optional `subscribe`, accepts optional `dispose`, rejects non-function `subscribe`
    - Tests for `LibraryEvent` required fields: `source`, `type`, `payload`, `timestamp`, rejection of missing fields
    - Tests for `LibraryEventListener` signature
    - Tests for `UnifiedSnapshot` fields: `timestamp`, `container`, `libraries`, `registeredLibraries`
    - **Satisfies:** DoD 1 (#1-#16)
  - [ ] 1.3 Verify type-level tests pass
    - Run `pnpm --filter @hex-di/core test:types`
    - Verify all 16 type-level tests pass

**Acceptance Criteria:**

- All 16 type-level tests from DoD 1 pass
- `isLibraryInspector` type guard exported and functional
- `LibraryInspector`, `LibraryEvent`, `LibraryEventListener`, `UnifiedSnapshot` types defined
- No `any` types or type casts in new file

---

#### Task Group 2: Extended InspectorEvent and InspectorAPI Types

**Dependencies:** Task Group 1 (needs `LibraryEvent`, `LibraryInspector`, `UnifiedSnapshot`)
**Estimated tests:** 8 type-level tests (DoD 2)

Extends the existing types in `inspector-types.ts` with the new library-related variants and methods. This must be done before the runtime implementation can add the new methods.

- [ ] 2.0 Complete extended InspectorEvent and InspectorAPI in `@hex-di/core`
  - [ ] 2.1 Modify `packages/core/src/inspection/inspector-types.ts`
    - Import `LibraryEvent`, `LibraryInspector`, `UnifiedSnapshot` from `./library-inspector-types.js`
    - Add three new variants to `InspectorEvent` union:
      - `{ readonly type: "library"; readonly event: LibraryEvent }`
      - `{ readonly type: "library-registered"; readonly name: string }`
      - `{ readonly type: "library-unregistered"; readonly name: string }`
    - Add four new methods to `InspectorAPI` interface:
      - `registerLibrary(inspector: LibraryInspector): () => void`
      - `getLibraryInspectors(): ReadonlyMap<string, LibraryInspector>`
      - `getLibraryInspector(name: string): LibraryInspector | undefined`
      - `getUnifiedSnapshot(): UnifiedSnapshot`
    - **Satisfies:** Spec sections 2, 3
  - [ ] 2.2 Update `packages/core/src/index.ts` exports
    - Add exports for `LibraryInspector`, `LibraryEvent`, `LibraryEventListener`, `UnifiedSnapshot` types
    - Add export for `isLibraryInspector` runtime function
    - **Satisfies:** Spec section 7
  - [ ] 2.3 Write type-level tests in `packages/core/tests/library-inspector.test-d.ts` (continued)
    - 8 type-level tests covering DoD 2 items #17-#24
    - Tests for `InspectorEvent` discrimination on `"library"`, `"library-registered"`, `"library-unregistered"`
    - Test for exhaustive switch on `InspectorEvent.type`
    - Tests for new `InspectorAPI` method signatures: `registerLibrary`, `getLibraryInspectors`, `getLibraryInspector`, `getUnifiedSnapshot`
    - **Satisfies:** DoD 2 (#17-#24)
  - [ ] 2.4 Verify type-level tests pass
    - Run `pnpm --filter @hex-di/core test:types`
    - Verify all 24 type-level tests (DoD 1 + DoD 2) pass
  - [ ] 2.5 Verify typecheck passes
    - Run `pnpm --filter @hex-di/core typecheck`
    - Ensure no type errors from the new variants/methods

**Acceptance Criteria:**

- All 24 type-level tests from DoD 1 + DoD 2 pass
- `InspectorEvent` has 3 new variants
- `InspectorAPI` has 4 new methods
- Exports added to `@hex-di/core` index
- `pnpm --filter @hex-di/core typecheck` passes clean

---

### Runtime Implementation (`@hex-di/runtime`)

#### Task Group 3: Library Registry and isLibraryInspector Guard

**Dependencies:** Task Group 2 (needs extended `InspectorAPI`, `InspectorEvent`, `LibraryInspector`)
**Estimated tests:** 14 unit tests (DoD 3), 33 unit tests (DoD 4) = 47 unit tests

This is the core runtime implementation. The library registry is an internal module used by `createBuiltinInspectorAPI`. The type guard unit tests are placed here because they test runtime behavior.

- [ ] 3.0 Complete library registry and type guard implementation
  - [ ] 3.1 Write type guard unit tests in `packages/runtime/tests/library-inspector-guard.test.ts`
    - 14 unit tests covering DoD 3 items #1-#14
    - Tests: valid minimal inspector, with `subscribe`, with `dispose`, with all four members
    - Tests: `null`, `undefined`, primitives (string, number, boolean)
    - Tests: missing `name`, empty string `name`, missing `getSnapshot`, non-function `getSnapshot`, non-function `subscribe`, non-function `dispose`, non-string `name`
    - **Satisfies:** DoD 3 (#1-#14)
  - [ ] 3.2 Implement `packages/runtime/src/inspection/library-registry.ts`
    - `createLibraryRegistry()` factory function
    - Internal state: `inspectors: Map<string, LibraryInspector>`, `subscriptions: Map<string, () => void>`
    - `registerLibrary(inspector, emitContainerEvent)`:
      - Validate with `isLibraryInspector`, throw `TypeError` if invalid
      - Last-write-wins: if name exists, unsubscribe old, call old `dispose?.()`, remove from maps
      - Store inspector, subscribe to events if `subscribe` exists, emit `"library-registered"`
      - Return unregister function
    - `unregisterLibrary(name, emitContainerEvent)`: unsubscribe, dispose, remove, emit `"library-unregistered"`
    - `getLibraryInspectors()`: return new `ReadonlyMap` (not internal reference)
    - `getLibraryInspector(name)`: return `inspectors.get(name)`
    - `getLibrarySnapshots()`: aggregate all snapshots, catch failures with `{ error: "snapshot-failed" }`, return frozen
    - `dispose()`: unsubscribe all, dispose all (both fault-tolerant), clear maps
    - **Satisfies:** Spec section 4
  - [ ] 3.3 Write library registry unit tests in `packages/runtime/tests/library-registry.test.ts`
    - 33 unit tests covering DoD 4 items #1-#33
    - Registration: stores inspector, returns unsubscribe, throws TypeError for invalid inputs (#1-#5)
    - Replacement: last-write-wins, disposes old, unsubscribes old, tolerates old dispose throwing (#6-#9)
    - Unsubscribe: removes inspector, calls dispose, idempotent (#10-#12)
    - Querying: frozen map, new instance each call, by-name lookup, undefined for unknown (#13-#16)
    - Event forwarding: library events wrapped, registered/unregistered emitted, ordering guarantees (#17-#21)
    - Optional members: no subscribe = no forwarding, no dispose = no dispose call (#22-#23)
    - Snapshots: aggregation, empty when none, failure replacement, frozen, partial failure tolerance (#24-#28)
    - Disposal: unsubscribes all, disposes all, tolerates individual throwing, clears maps (#29-#33)
    - **Satisfies:** DoD 4 (#1-#33)
  - [ ] 3.4 Verify type guard and registry tests pass
    - Run `pnpm --filter @hex-di/runtime test -- library-inspector-guard`
    - Run `pnpm --filter @hex-di/runtime test -- library-registry`
    - Verify all 47 unit tests pass

**Acceptance Criteria:**

- All 14 type guard tests (DoD 3) pass
- All 33 registry tests (DoD 4) pass
- `isLibraryInspector` validates all five checks plus empty-string edge case
- Registry supports registration, replacement, event forwarding, disposal, fault tolerance
- No `any` types, no type casts, no `eslint-disable` in new files

---

#### Task Group 4: Unified Snapshot and InspectorAPI Integration

**Dependencies:** Task Group 3 (needs `createLibraryRegistry`)
**Estimated tests:** 12 unit tests (DoD 5)

Wires the library registry into `createBuiltinInspectorAPI` and implements `getUnifiedSnapshot`.

- [ ] 4.0 Complete unified snapshot and InspectorAPI integration
  - [ ] 4.1 Write unified snapshot unit tests in `packages/runtime/tests/unified-snapshot.test.ts`
    - 12 unit tests covering DoD 5 items #1-#12
    - Structure: has all four fields, empty when no inspectors, populated when inspectors present
    - Container snapshot from `getSnapshot()`, alphabetically sorted `registeredLibraries`
    - Freeze checks: `Object.isFrozen` on top-level, `libraries`, `registeredLibraries`
    - Fault tolerance: individual library failure, replaced with `{ error: "snapshot-failed" }`
    - Timestamp is valid `Date.now()` value
    - **Satisfies:** DoD 5 (#1-#12)
  - [ ] 4.2 Modify `packages/runtime/src/inspection/builtin-api.ts`
    - Import `createLibraryRegistry` from `./library-registry.js`
    - Import `isLibraryInspector` from `@hex-di/core`
    - Create registry instance in `createBuiltinInspectorAPI` alongside existing `emitter` and `resultTracker`
    - Wire `registerLibrary`: validate with `isLibraryInspector`, delegate to registry with `emitter.emit` callback
    - Wire `getLibraryInspectors`: delegate to registry
    - Wire `getLibraryInspector`: delegate to registry
    - Implement `getUnifiedSnapshot`:
      1. `containerSnapshot = getSnapshot()`
      2. `librarySnapshots = registry.getLibrarySnapshots()`
      3. `registeredLibraries = Array.from(registry inspectors keys).sort()`
      4. Return `Object.freeze({ timestamp: Date.now(), container, libraries, registeredLibraries: Object.freeze(registeredLibraries) })`
    - Add registry disposal to container disposal path (if existing teardown hook exists, integrate there)
    - **Satisfies:** Spec section 4 (integration with builtin-api)
  - [ ] 4.3 Update `packages/runtime/src/inspection/types.ts` if needed
    - Re-export any new types from `@hex-di/core` that runtime consumers need
    - Add `LibraryInspector`, `LibraryEvent`, `LibraryEventListener`, `UnifiedSnapshot` re-exports
  - [ ] 4.4 Verify unified snapshot tests pass
    - Run `pnpm --filter @hex-di/runtime test -- unified-snapshot`
    - Verify all 12 unit tests pass
  - [ ] 4.5 Verify typecheck passes
    - Run `pnpm --filter @hex-di/runtime typecheck`

**Acceptance Criteria:**

- All 12 unified snapshot tests (DoD 5) pass
- `getUnifiedSnapshot()` returns frozen object with correct structure
- Library registry integrated into `createBuiltinInspectorAPI`
- Alphabetical sorting and freeze enforcement verified
- Fault tolerance for individual library snapshot failures

---

#### Task Group 5: Auto-Discovery Hook and Container Lifecycle

**Dependencies:** Task Group 4 (needs wired `registerLibrary` on InspectorAPI)
**Estimated tests:** 9 integration tests (DoD 6) + 10 integration tests (DoD 7) + 5 perf tests (DoD 8) = 24 tests

Installs the `afterResolve` hook that auto-discovers library inspectors via port metadata. Also covers container lifecycle integration and performance verification.

- [ ] 5.0 Complete auto-discovery hook and lifecycle integration
  - [ ] 5.1 Modify `packages/runtime/src/container/factory.ts`
    - In `createUninitializedContainerWrapper` (and/or `createInitializedContainerWrapper` or shared utility), install an `afterResolve` hook:
      ```
      container.addHook("afterResolve", (ctx) => {
        const portMeta = getPortMetadata(ctx.port);
        if (portMeta?.category === "library-inspector") {
          if (isLibraryInspector(ctx.result)) {
            container.inspector.registerLibrary(ctx.result);
          }
        }
      });
      ```
    - The hook must be installed after `attachBuiltinAPIs(container)` but before `Object.freeze(container)`
    - Import `getPortMetadata` from `@hex-di/core` (already imported) and `isLibraryInspector` from `@hex-di/core`
    - Also install in child container creation path (`createChildContainerWrapper` in `wrappers.ts` or equivalent)
    - Ensure container disposal path calls `registry.dispose()` to clean up all library inspectors
    - **Satisfies:** Spec section 5
  - [ ] 5.2 Write auto-discovery integration tests in `packages/runtime/tests/integration/library-auto-discovery.test.ts`
    - Create directory `packages/runtime/tests/integration/` if it does not exist (it currently has `inspection/` subdirectory)
    - 9 integration tests covering DoD 6 items #1-#9
    - Test port with `category: "library-inspector"` and valid `LibraryInspector` is auto-registered
    - Test port with `category: "library-inspector"` but non-inspector value is silently ignored
    - Test port without `category: "library-inspector"` is not registered
    - Test port with undefined metadata is not registered
    - Test auto-registered inspector immediately queryable, events flow to container stream, appears in unified snapshot
    - Test multiple auto-registered inspectors all appear
    - Test O(1) hook overhead (metadata lookup + type guard = constant time)
    - **Satisfies:** DoD 6 (#1-#9)
  - [ ] 5.3 Write container lifecycle integration tests in `packages/runtime/tests/integration/library-lifecycle.test.ts`
    - 10 integration tests covering DoD 7 items #1-#10
    - Test inspectors survive initialization, available after init, disposed on container disposal
    - Test container disposal calls `dispose()` on all, unsubscribes all listeners
    - Test child container independence from parent
    - Test parent disposal does not affect child library inspectors
    - Test scope create/dispose does not affect library inspector registration
    - Test container disposal tolerates inspector `dispose()` throwing
    - **Satisfies:** DoD 7 (#1-#10)
  - [ ] 5.4 Write performance tests in `packages/runtime/tests/library-registry-perf.test.ts`
    - 5 performance tests covering DoD 8 items #1-#5
    - Zero overhead: `getSnapshot()` timing unchanged with no library inspectors
    - `registerLibrary` completes in < 1ms
    - `getUnifiedSnapshot` with 5 inspectors completes in < 5ms
    - Auto-discovery hook adds < 0.1ms per resolution
    - `getLibraryInspectors` returns frozen map in < 0.5ms with 10 inspectors
    - **Satisfies:** DoD 8 (#1-#5)
  - [ ] 5.5 Verify all runtime tests pass
    - Run `pnpm --filter @hex-di/runtime test`
    - Verify all new tests pass (47 unit + 12 unified + 9 auto-discovery + 10 lifecycle + 5 perf = 83 tests)
    - Verify existing tests are not broken
  - [ ] 5.6 Verify runtime typecheck and lint
    - Run `pnpm --filter @hex-di/runtime typecheck`
    - Run `pnpm --filter @hex-di/runtime lint`

**Acceptance Criteria:**

- All 9 auto-discovery tests (DoD 6) pass
- All 10 lifecycle tests (DoD 7) pass
- All 5 performance tests (DoD 8) pass
- Auto-discovery hook installed in `createContainer` and child container creation
- Container disposal cleans up library inspectors
- No regressions in existing runtime tests

---

### Bridge Implementations

#### Task Group 6: Flow Library Bridge (`@hex-di/flow`)

**Dependencies:** Task Group 2 (needs `LibraryInspector`, `LibraryEvent` types from `@hex-di/core`)
**Estimated tests:** 17 unit + 3 type-level + 4 integration = 24 tests (DoD 9)

Creates the bridge adapter that wraps `FlowInspector` + `FlowRegistry` into a `LibraryInspector`. Includes the `FlowLibraryInspectorPort` with `category: "library-inspector"` metadata.

- [ ] 6.0 Complete Flow library inspector bridge
  - [ ] 6.1 Create `libs/flow/core/src/integration/library-inspector-bridge.ts`
    - Import `LibraryInspector`, `LibraryEventListener` from `@hex-di/core`
    - Import `FlowInspector`, `FlowRegistry` from `../introspection/types.js`
    - Implement `createFlowLibraryInspector(flowInspector: FlowInspector, registry: FlowRegistry): LibraryInspector`
      - `name: "flow"`
      - `getSnapshot()`: returns `Object.freeze()` with `machineCount`, `machines` array (each entry frozen with `portName`, `instanceId`, `machineId`, `state`, `scopeId`), `healthEvents`, `effectStatistics`
      - `subscribe(listener)`: forwards `RegistryEvent` as `LibraryEvent` with `source: "flow"`, `type: event.type`, `payload: Object.freeze({ ...event })`, `timestamp: Date.now()`; returns unsubscribe
      - `dispose()`: calls `flowInspector.dispose()`
    - **Satisfies:** Spec section 6 (Flow bridge)
  - [ ] 6.2 Create `FlowLibraryInspectorPort` in `libs/flow/core/src/integration/types.ts`
    - Define port with `name: "FlowLibraryInspector"`, `category: "library-inspector"`, `tags: ["flow", "inspector"]`
    - Port type: `Port<LibraryInspector, "FlowLibraryInspector">`
    - **Satisfies:** Spec section 5 (port metadata convention)
  - [ ] 6.3 Create adapter factory (optional, if pattern matches existing `createFlowInspectorAdapter`)
    - An adapter that `provides: FlowLibraryInspectorPort`, `requires: [FlowInspectorPort, FlowRegistryPort]`, `lifetime: "singleton"`
    - Factory calls `createFlowLibraryInspector(deps.FlowInspector, deps.FlowRegistry)`
  - [ ] 6.4 Update `libs/flow/core/src/integration/index.ts` exports
    - Export `createFlowLibraryInspector` function
    - Export `FlowLibraryInspectorPort` from types
  - [ ] 6.5 Write unit tests in `libs/flow/core/tests/integration/library-inspector-bridge.test.ts`
    - 17 unit tests covering DoD 9 unit items #1-#17
    - Tests: passes `isLibraryInspector`, name is `"flow"`, snapshot frozen, has `machineCount`, `machines` array, per-machine fields, `healthEvents`, `effectStatistics`, `machines` frozen, each entry frozen
    - Tests: subscribe forwards events, `source: "flow"`, correct type, frozen payload, timestamp is number, returns unsubscribe
    - Test: dispose calls `flowInspector.dispose()`
    - **Satisfies:** DoD 9 unit (#1-#17)
  - [ ] 6.6 Write type-level tests in `libs/flow/core/tests/integration/library-inspector-bridge.test-d.ts`
    - 3 type-level tests covering DoD 9 type items #1-#3
    - `createFlowLibraryInspector` return type satisfies `LibraryInspector`
    - `FlowLibraryInspectorPort` extends `Port<LibraryInspector>`
    - `FlowLibraryInspectorPort` has `category: "library-inspector"` in metadata
    - **Satisfies:** DoD 9 type (#1-#3)
  - [ ] 6.7 Write integration tests in `libs/flow/core/tests/integration/library-inspector-bridge.test.ts` (continued)
    - 4 integration tests covering DoD 9 integration items #18-#21
    - Test: auto-discovered when adapter is in graph
    - Test: `container.inspector.getLibraryInspector("flow")` returns the bridge
    - Test: `getUnifiedSnapshot().libraries.flow` contains machine data
    - Test: flow registry events appear as `{ type: "library", event: { source: "flow" } }` in container stream
    - **Satisfies:** DoD 9 integration (#18-#21)
  - [ ] 6.8 Verify flow bridge tests pass
    - Run `pnpm --filter @hex-di/flow test -- library-inspector-bridge`
    - Run `pnpm --filter @hex-di/flow test:types`
    - Verify all 24 tests pass
  - [ ] 6.9 Verify flow typecheck and lint
    - Run `pnpm --filter @hex-di/flow typecheck`
    - Run `pnpm --filter @hex-di/flow lint`

**Acceptance Criteria:**

- All 17 unit tests (DoD 9 #1-#17) pass
- All 3 type-level tests (DoD 9 type #1-#3) pass
- All 4 integration tests (DoD 9 #18-#21) pass
- `createFlowLibraryInspector` correctly wraps `FlowInspector` + `FlowRegistry`
- `FlowLibraryInspectorPort` has `category: "library-inspector"` metadata
- All snapshot data frozen at every level

---

#### Task Group 7: Logger Library Bridge (`@hex-di/logger`)

**Dependencies:** Task Group 2 (needs `LibraryInspector`, `LibraryEvent` types from `@hex-di/core`)
**Estimated tests:** 21 unit + 3 type-level + 4 integration = 28 tests (DoD 10)

Creates the bridge adapter that wraps `LoggerInspector` into a `LibraryInspector`. The logger already has a full inspector implementation (`createLoggerInspectorAdapter` in `packages/logger/src/inspection/inspector.ts`) and a port (`LoggerInspectorPort`).

- [ ] 7.0 Complete Logger library inspector bridge
  - [ ] 7.1 Create `packages/logger/src/inspection/library-inspector-bridge.ts`
    - Import `LibraryInspector`, `LibraryEventListener` from `@hex-di/core`
    - Import `LoggerInspector` from `./inspector.js`
    - Implement `createLoggerLibraryInspector(loggerInspector: LoggerInspector): LibraryInspector`
      - `name: "logger"`
      - `getSnapshot()`: delegates to `loggerInspector.getSnapshot()` (already returns `LoggingSnapshot` which has `timestamp`, `totalEntries`, `entriesByLevel`, `errorRate`, `handlers`, `samplingActive`, `redactionActive`, `contextDepth`)
      - `subscribe(listener)`: forwards `LoggerInspectorEvent` as `LibraryEvent` with `source: "logger"`, `type: event.type`, `payload: Object.freeze({ ...event })`, `timestamp: Date.now()`; returns unsubscribe
      - No `dispose` method (logger inspector has no dispose)
    - **Satisfies:** Spec section 6 (Logger bridge)
  - [ ] 7.2 Create `LoggerLibraryInspectorPort`
    - Define in `packages/logger/src/inspection/inspector-port.ts` (alongside existing `LoggerInspectorPort`) or in a new file
    - Port: `name: "LoggerLibraryInspector"`, `category: "library-inspector"`, `tags: ["logging", "inspector"]`
    - Port type: `Port<LibraryInspector, "LoggerLibraryInspector">`
    - **Satisfies:** Spec section 5 (port metadata convention)
  - [ ] 7.3 Create adapter factory
    - Adapter that `provides: LoggerLibraryInspectorPort`, `requires: [LoggerInspectorPort]`, `lifetime: "singleton"`
    - Factory calls `createLoggerLibraryInspector(deps.LoggerInspector)`
  - [ ] 7.4 Update `packages/logger/src/inspection/index.ts` exports
    - Export `createLoggerLibraryInspector` function
    - Export `LoggerLibraryInspectorPort`
  - [ ] 7.5 Write unit tests in `packages/logger/tests/library-inspector-bridge.test.ts`
    - 21 unit tests covering DoD 10 unit items #1-#21
    - Tests: passes `isLibraryInspector`, name is `"logger"`, snapshot frozen, has `totalEntries`, `entriesByLevel`, `errorRate`, `handlers`, `samplingActive`, `redactionActive`, `contextDepth`
    - Tests: subscribe forwards events, `source: "logger"`, correct type, frozen payload, timestamp, returns unsubscribe
    - Tests: specific event forwarding for `"entry-logged"`, `"error-rate-threshold"`, `"handler-error"`, `"sampling-dropped"`, `"redaction-applied"`
    - **Satisfies:** DoD 10 unit (#1-#21)
  - [ ] 7.6 Write type-level tests in `packages/logger/tests/library-inspector-bridge.test-d.ts`
    - 3 type-level tests covering DoD 10 type items #1-#3
    - `createLoggerLibraryInspector` return type satisfies `LibraryInspector`
    - `LoggerLibraryInspectorPort` extends `Port<LibraryInspector>`
    - `LoggerLibraryInspectorPort` has `category: "library-inspector"` in metadata
    - **Satisfies:** DoD 10 type (#1-#3)
  - [ ] 7.7 Write integration tests in `packages/logger/tests/library-inspector-bridge.test.ts` (continued)
    - 4 integration tests covering DoD 10 integration items #22-#25
    - Test: auto-discovered when adapter is in graph
    - Test: `container.inspector.getLibraryInspector("logger")` returns the bridge
    - Test: `getUnifiedSnapshot().libraries.logger` contains logging state
    - Test: logger events appear as `{ type: "library", event: { source: "logger" } }` in container stream
    - **Satisfies:** DoD 10 integration (#22-#25)
  - [ ] 7.8 Verify logger bridge tests pass
    - Run `pnpm --filter @hex-di/logger test -- library-inspector-bridge`
    - Run `pnpm --filter @hex-di/logger test:types`
    - Verify all 28 tests pass
  - [ ] 7.9 Verify logger typecheck and lint
    - Run `pnpm --filter @hex-di/logger typecheck`
    - Run `pnpm --filter @hex-di/logger lint`

**Acceptance Criteria:**

- All 21 unit tests (DoD 10 #1-#21) pass
- All 3 type-level tests (DoD 10 type #1-#3) pass
- All 4 integration tests (DoD 10 #22-#25) pass
- `createLoggerLibraryInspector` correctly wraps `LoggerInspector`
- `LoggerLibraryInspectorPort` has `category: "library-inspector"` metadata
- All 8 logger event types forwarded correctly

---

### Cross-Cutting Verification

#### Task Group 8: Cross-Library Integration and Final Verification

**Dependencies:** Task Groups 1-7 (all must be complete)
**Estimated tests:** 12 integration tests (DoD 11)

End-to-end integration tests that verify the full system works across library boundaries. Also verifies exports, code quality constraints, and mutation testing targets.

- [ ] 8.0 Complete cross-cutting integration and verification
  - [ ] 8.1 Write cross-library integration tests in `packages/runtime/tests/integration/unified-inspection.test.ts`
    - 12 integration tests covering DoD 11 items #1-#12
    - Full lifecycle: register flow + logger -> unified snapshot -> dispose container
    - Multiple libraries: unified snapshot contains both flow and logger sections
    - Event stream: flow and logger events both appear as `{ type: "library" }` in single subscriber
    - Registration order: `registeredLibraries` always sorted regardless of insertion order
    - Imperative + auto-discovery coexistence
    - Inspector replacement: new flow inspector replaces old, snapshot reflects new data
    - Partial failure: one library snapshot fails, others still present
    - Container disposal: all disposed, no events after disposal
    - Exports: verify `LibraryInspector`, `LibraryEvent`, `LibraryEventListener`, `UnifiedSnapshot` exported from `@hex-di/core`
    - Exports: verify `isLibraryInspector` exported from `@hex-di/core`
    - No `any` types in new source files
    - No type casts in new source files
    - **Satisfies:** DoD 11 (#1-#12)
  - [ ] 8.2 Verify all cross-library integration tests pass
    - Run `pnpm --filter @hex-di/runtime test -- unified-inspection`
    - Verify all 12 integration tests pass
  - [ ] 8.3 Run full verification checklist
    - `pnpm --filter @hex-di/core test:types` -- 0 failures
    - `pnpm --filter @hex-di/runtime test` -- 0 failures
    - `pnpm --filter @hex-di/flow test` -- 0 failures
    - `pnpm --filter @hex-di/flow test:types` -- 0 failures
    - `pnpm --filter @hex-di/logger test` -- 0 failures
    - `pnpm --filter @hex-di/logger test:types` -- 0 failures
    - `pnpm --filter @hex-di/core typecheck` -- 0 errors
    - `pnpm --filter @hex-di/runtime typecheck` -- 0 errors
    - `pnpm --filter @hex-di/flow typecheck` -- 0 errors
    - `pnpm --filter @hex-di/logger typecheck` -- 0 errors
    - `pnpm --filter @hex-di/core lint` -- 0 errors
    - `pnpm --filter @hex-di/runtime lint` -- 0 errors
    - `pnpm --filter @hex-di/flow lint` -- 0 errors
    - `pnpm --filter @hex-di/logger lint` -- 0 errors
  - [ ] 8.4 Verify no prohibited patterns in new source files
    - No `any` types in: `packages/core/src/inspection/library-inspector-types.ts`, `packages/runtime/src/inspection/library-registry.ts`, `libs/flow/core/src/integration/library-inspector-bridge.ts`, `packages/logger/src/inspection/library-inspector-bridge.ts`
    - No type casts (`as`) in the same files
    - No `eslint-disable` comments in the same files
  - [ ] 8.5 Run mutation testing (if Stryker is configured)
    - Type guard: target >95% -- `pnpm --filter @hex-di/core stryker -- --mutate src/inspection/library-*`
    - Library registry: target >95% -- `pnpm --filter @hex-di/runtime stryker -- --mutate src/inspection/library-*`
    - Unified snapshot: target >90% -- `pnpm --filter @hex-di/runtime stryker -- --mutate src/inspection/builtin-api.*`
    - Flow bridge: target >90% -- `pnpm --filter @hex-di/flow stryker -- --mutate src/integration/library-*`
    - Logger bridge: target >90% -- `pnpm --filter @hex-di/logger stryker -- --mutate src/inspection/library-*`

**Acceptance Criteria:**

- All 12 cross-library integration tests (DoD 11) pass
- Full verification checklist passes (typecheck, lint, tests across all 4 packages)
- No `any` types, no type casts, no `eslint-disable` in new source files
- Mutation testing targets met (when Stryker is configured)
- Total test count: ~159 tests across all packages

---

## Execution Order

The recommended implementation sequence accounts for type dependencies flowing from core to runtime to bridges:

```
Task Group 1: Core Protocol Types
    |
    v
Task Group 2: Extended InspectorEvent & InspectorAPI Types
    |
    +------------------+------------------+
    |                  |                  |
    v                  v                  v
Task Group 3:    Task Group 6:    Task Group 7:
Library Registry  Flow Bridge      Logger Bridge
(runtime)        (@hex-di/flow)   (@hex-di/logger)
    |
    v
Task Group 4: Unified Snapshot + InspectorAPI Integration
    |
    v
Task Group 5: Auto-Discovery Hook + Container Lifecycle
    |
    +------ waits for 6, 7 ------+
    |                             |
    v                             v
Task Group 8: Cross-Cutting Integration & Verification
```

**Key parallelization opportunities:**

- Task Groups 6 (Flow bridge) and 7 (Logger bridge) can be developed in parallel with each other, and in parallel with Task Groups 3-5, since they only depend on the core types from Task Group 2.
- Task Group 8 must wait for all other groups to complete.
- Task Groups 3 -> 4 -> 5 are strictly sequential within the runtime package.

## File Summary

### New Files

| File                                                                  | Package           | Task Group |
| --------------------------------------------------------------------- | ----------------- | ---------- |
| `packages/core/src/inspection/library-inspector-types.ts`             | `@hex-di/core`    | 1          |
| `packages/core/tests/library-inspector.test-d.ts`                     | `@hex-di/core`    | 1, 2       |
| `packages/runtime/src/inspection/library-registry.ts`                 | `@hex-di/runtime` | 3          |
| `packages/runtime/tests/library-inspector-guard.test.ts`              | `@hex-di/runtime` | 3          |
| `packages/runtime/tests/library-registry.test.ts`                     | `@hex-di/runtime` | 3          |
| `packages/runtime/tests/unified-snapshot.test.ts`                     | `@hex-di/runtime` | 4          |
| `packages/runtime/tests/integration/library-auto-discovery.test.ts`   | `@hex-di/runtime` | 5          |
| `packages/runtime/tests/integration/library-lifecycle.test.ts`        | `@hex-di/runtime` | 5          |
| `packages/runtime/tests/library-registry-perf.test.ts`                | `@hex-di/runtime` | 5          |
| `libs/flow/core/src/integration/library-inspector-bridge.ts`          | `@hex-di/flow`    | 6          |
| `libs/flow/core/tests/integration/library-inspector-bridge.test.ts`   | `@hex-di/flow`    | 6          |
| `libs/flow/core/tests/integration/library-inspector-bridge.test-d.ts` | `@hex-di/flow`    | 6          |
| `packages/logger/src/inspection/library-inspector-bridge.ts`          | `@hex-di/logger`  | 7          |
| `packages/logger/tests/library-inspector-bridge.test.ts`              | `@hex-di/logger`  | 7          |
| `packages/logger/tests/library-inspector-bridge.test-d.ts`            | `@hex-di/logger`  | 7          |
| `packages/runtime/tests/integration/unified-inspection.test.ts`       | `@hex-di/runtime` | 8          |

### Modified Files

| File                                               | Package           | Task Group |
| -------------------------------------------------- | ----------------- | ---------- |
| `packages/core/src/inspection/inspector-types.ts`  | `@hex-di/core`    | 2          |
| `packages/core/src/index.ts`                       | `@hex-di/core`    | 2          |
| `packages/runtime/src/inspection/builtin-api.ts`   | `@hex-di/runtime` | 4          |
| `packages/runtime/src/inspection/types.ts`         | `@hex-di/runtime` | 4          |
| `packages/runtime/src/container/factory.ts`        | `@hex-di/runtime` | 5          |
| `libs/flow/core/src/integration/types.ts`          | `@hex-di/flow`    | 6          |
| `libs/flow/core/src/integration/index.ts`          | `@hex-di/flow`    | 6          |
| `packages/logger/src/inspection/inspector-port.ts` | `@hex-di/logger`  | 7          |
| `packages/logger/src/inspection/index.ts`          | `@hex-di/logger`  | 7          |

## DoD Coverage Matrix

| DoD Section | Description                            | Task Group | Test Count                       |
| ----------- | -------------------------------------- | ---------- | -------------------------------- |
| DoD 1       | LibraryInspector Protocol Types        | 1          | 16 type                          |
| DoD 2       | Extended InspectorEvent & InspectorAPI | 2          | 8 type                           |
| DoD 3       | isLibraryInspector Type Guard          | 3          | 14 unit                          |
| DoD 4       | Library Registry                       | 3          | 33 unit                          |
| DoD 5       | Unified Snapshot                       | 4          | 12 unit                          |
| DoD 6       | Auto-Discovery Hook                    | 5          | 9 integration                    |
| DoD 7       | Container Lifecycle Integration        | 5          | 10 integration                   |
| DoD 8       | Performance                            | 5          | 5 perf                           |
| DoD 9       | Flow Library Bridge                    | 6          | 17 unit + 3 type + 4 integration |
| DoD 10      | Logger Library Bridge                  | 7          | 21 unit + 3 type + 4 integration |
| DoD 11      | Cross-Cutting                          | 8          | 12 integration                   |
| **Total**   |                                        |            | **~159**                         |
