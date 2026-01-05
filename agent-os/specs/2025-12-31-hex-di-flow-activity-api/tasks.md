# Task Breakdown: HexDI Flow Activity API Redesign

## Overview

This task breakdown covers the complete redesign of the Activity API in `@hex-di/flow` to eliminate the service locator anti-pattern by using explicit dependency declarations via ports.

**Total Tasks:** 9 Task Groups, ~45 Sub-tasks

**Primary Files:**

- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/` (new and modified files)
- `/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/adapter.ts` (modified)

---

## Task List

### Foundation Layer

#### Task Group 1: Core Types and ActivityPort Factory

**Dependencies:** None
**Estimated Complexity:** Medium

- [x] 1.0 Complete ActivityPort foundation
  - [x] 1.1 Write 4-6 type-level tests for ActivityPort in `activities/port.test-d.ts`
    - Test `activityPort<Input, Output>()('Name')` creates correct branded type
    - Test `ActivityInput<P>` extracts input type from ActivityPort
    - Test `ActivityOutput<P>` extracts output type from ActivityPort
    - Test ActivityPort is assignable to Port type
    - Test different ActivityPorts with same I/O but different names are incompatible
    - Test `__activityInput` and `__activityOutput` phantom properties exist at type level
  - [x] 1.2 Create `activities/port.ts` with ActivityPort type definition
    - Define `ActivityPort<TInput, TOutput, TName>` extending `Port`
    - Add `__activityInput: TInput` phantom property for input type storage
    - Add `__activityOutput: TOutput` phantom property for output type storage
    - Use unique symbol brand pattern from `@hex-di/ports`
  - [x] 1.3 Implement `activityPort<I, O>()('Name')` curried factory function
    - Follow `port<T>()('Name')` pattern from `@hex-di/ports`
    - Use `const` type parameter modifier for literal type inference
    - Return frozen ActivityPort object with `__portName` property
    - Internal: use `unsafeCreateActivityPort` helper (document safety rationale)
  - [x] 1.4 Create type utilities `ActivityInput<P>` and `ActivityOutput<P>`
    - Extract input/output types from ActivityPort via conditional type inference
    - Return `never` for non-ActivityPort inputs (with descriptive error type if possible)
    - Handle both ActivityPort and Activity types for `ActivityInput`/`ActivityOutput`
  - [x] 1.5 Export all types and factory from `activities/index.ts`
  - [x] 1.6 Verify type-level tests pass with `pnpm test:types`

**Acceptance Criteria:**

- `activityPort<{ id: string }, User>()('FetchUser')` creates typed ActivityPort
- `ActivityInput<typeof port>` correctly extracts `{ id: string }`
- `ActivityOutput<typeof port>` correctly extracts `User`
- Port is frozen and immutable
- Type-level tests pass

---

### Event System

#### Task Group 2: defineEvents and TypedEventSink

**Dependencies:** None (can run parallel to Task Group 1)
**Estimated Complexity:** High (complex type inference)

- [x] 2.0 Complete Event System
  - [x] 2.1 Write 6-8 type-level tests for events in `activities/events.test-d.ts`
    - Test `defineEvents` infers event types from factory return types
    - Test `EventFactory` has `.type` property matching event name
    - Test `EventFactory` call produces `{ type: 'NAME', ...payload }`
    - Test `TypedEventSink.emit(factory(...))` accepts factory result
    - Test `TypedEventSink.emit('TYPE', payload)` accepts type + payload
    - Test `TypedEventSink.emit('DONE')` works for zero-payload events
    - Test `EventTypes<TEvents>` extracts union of event type strings
    - Test `PayloadOf<TEvents, TType>` extracts payload for given type
  - [x] 2.2 Create `activities/events.ts` with event type definitions
    - Define `EventDefinition<TType, TPayload>` as `{ type: TType } & TPayload`
    - Define `EventFactory<TType, TArgs, TPayload>` with callable signature and `.type` property
    - Define `EventTypes<TEvents>` utility to extract type string union
    - Define `PayloadOf<TEvents, TType>` utility to extract payload type
    - Define `EventOf<TEvents>` utility to get full event union
  - [x] 2.3 Implement `defineEvents()` factory function
    - Accept `Record<string, (...args) => Record<string, unknown>>` definition
    - Transform each entry into EventFactory with `.type` property
    - Factory functions called at emit time (not definition time)
    - Return frozen object with type-safe event creators
    - Use `const` type parameter for literal type preservation
  - [x] 2.4 Create `TypedEventSink<TEvents>` interface
    - Overload 1: `emit<E extends EventOf<TEvents>>(event: E): void`
    - Overload 2: `emit<T extends EventTypes<TEvents>>(type: T, ...payload): void`
    - Second argument optional when `PayloadOf<TEvents, T>` is empty object
    - Use rest parameter with conditional tuple for optional payload
  - [x] 2.5 Write 3-4 runtime tests for defineEvents behavior in `activities/events.test.ts`
    - Test factory creates events with correct `type` property
    - Test factory functions receive arguments correctly
    - Test zero-argument factories work
    - Test returned object is frozen
  - [x] 2.6 Verify both type-level and runtime tests pass

**Acceptance Criteria:**

- `defineEvents({ PROGRESS: (n: number) => ({ percent: n }) })` works
- `events.PROGRESS.type === 'PROGRESS'` at runtime
- `events.PROGRESS(50)` returns `{ type: 'PROGRESS', percent: 50 }`
- TypedEventSink accepts both emit patterns with type safety
- All tests pass

---

### Activity Implementation

#### Task Group 3: Activity Factory and Types

**Dependencies:** Task Groups 1, 2
**Estimated Complexity:** High

- [x] 3.0 Complete Activity Factory
  - [x] 3.1 Write 6-8 type-level tests for activity in `activities/factory.test-d.ts`
    - Test `activity(port, config)` returns correctly typed Activity
    - Test `requires` tuple types are preserved via `const` modifier
    - Test `deps` object type matches `ResolvedActivityDeps<TRequires>`
    - Test `sink` type matches `TypedEventSink<TEvents>`
    - Test `execute` input type matches `ActivityInput<TPort>`
    - Test `execute` return type matches `ActivityOutput<TPort>`
    - Test `cleanup` receives `CleanupReason` and deps-only context
    - Test Activity is assignable to `ActivityAny`
  - [x] 3.2 Create `activities/types.ts` with core activity types
    - Define `CleanupReason = 'completed' | 'cancelled' | 'timeout' | 'error'`
    - Define `ResolvedActivityDeps<TRequires>` mapping ports to name-keyed object
    - Define `ActivityContext<TRequires, TEvents>` with deps, sink, signal
    - Define `ActivityConfig<TPort, TRequires, TEvents>` interface
    - Define `Activity<TPort, TRequires, TEvents>` interface
    - Update `ActivityAny` interface with new structure (port, requires, emits, timeout)
  - [x] 3.3 Implement `activity()` factory function in `activities/factory.ts`
    - Signature: `activity<TPort, const TRequires, TEvents>(port, config)`
    - Validate port is ActivityPort at runtime
    - Attach port, requires, emits, timeout to returned object
    - Bind execute and cleanup functions
    - Return frozen Activity object
  - [x] 3.4 Write 4-6 runtime tests for activity factory in `activities/factory.test.ts`
    - Test activity creation with all config options
    - Test activity creation with minimal config (no cleanup, no timeout)
    - Test returned activity object is frozen
    - Test activity has correct port reference
    - Test execute function is callable
    - Test cleanup function is optional
  - [x] 3.5 Verify all activity tests pass

**Acceptance Criteria:**

- `activity(port, { requires, emits, execute })` creates typed Activity
- `deps.PortName` provides correct service type in execute
- `sink.emit(events.TYPE(...))` is type-safe
- Cleanup callback optional with reason parameter
- Activity object frozen and immutable
- All tests pass

---

### ActivityManager Updates

#### Task Group 4: Enhanced ActivityManager with Cleanup and Timeout

**Dependencies:** Task Groups 1, 2, 3
**Estimated Complexity:** High

- [x] 4.0 Complete ActivityManager updates
  - [x] 4.1 Write 6-8 tests for updated ActivityManager in `activities/manager.test.ts`
    - Test spawn with new Activity type and deps resolution
    - Test cleanup called on successful completion with 'completed' reason
    - Test cleanup called on abort with 'cancelled' reason
    - Test timeout triggers signal abort and cleanup with 'timeout' reason
    - Test cleanup called on error with 'error' reason
    - Test layered timeout precedence (spawn > activity > manager default)
    - Test getResult returns activity output after completion
    - Test dispose calls cleanup for all running activities
  - [x] 4.2 Update `ActivityManagerConfig` interface
    - Add `defaultTimeout?: number` property
    - Document timeout is in milliseconds
  - [x] 4.3 Update `SpawnOptions` interface
    - Add `timeout?: number` override property
  - [x] 4.4 Update `ActivityManager.spawn()` signature
    - Accept new `Activity<TPort, TRequires, TEvents>` type
    - Accept `deps: ResolvedActivityDeps<TRequires>` parameter
    - Accept `eventSink: TypedEventSink<TEvents>` parameter
    - Accept optional `SpawnOptions` parameter
    - Return `string` (activity instance ID)
  - [x] 4.5 Implement timeout handling in spawn
    - Calculate effective timeout (spawn > activity > manager default)
    - Set up `setTimeout` to abort controller on timeout
    - Clear timeout on completion/cancellation
    - Track timeout reason for cleanup callback
  - [x] 4.6 Implement cleanup orchestration
    - Call cleanup after execute completes (success or failure)
    - Pass appropriate CleanupReason based on outcome
    - Ensure cleanup called exactly once
    - Handle cleanup errors (log but don't propagate)
    - Cleanup receives deps-only context (no sink or signal)
  - [x] 4.7 Add result capture and getResult method
    - Store activity output on successful completion
    - `getResult<TOutput>(id): TOutput | undefined`
    - Return undefined for failed/cancelled/running activities
  - [x] 4.8 Update MutableActivityState to track additional data
    - Add `result?: unknown` for output capture
    - Add `cleanupCalled: boolean` to ensure single cleanup
    - Add `timeoutId?: ReturnType<typeof setTimeout>` for cleanup
    - Add `cleanupReason?: CleanupReason` for tracking
  - [x] 4.9 Verify all ActivityManager tests pass

**Acceptance Criteria:**

- Spawn accepts new Activity type with deps and eventSink
- Cleanup guaranteed to be called exactly once with correct reason
- Timeout works with three-layer fallback chain
- Activity results captured and accessible
- All tests pass

---

### FlowAdapter Integration

#### Task Group 5: FlowAdapter Activities Integration

**Dependencies:** Task Groups 3, 4
**Estimated Complexity:** Medium-High

- [x] 5.0 Complete FlowAdapter integration
  - [x] 5.1 Write 4-6 type-level tests for FlowAdapter activities in `integration/adapter.test-d.ts`
    - Test `activities` property accepts array of Activity types
    - Test type error when activity requires port not in FlowAdapter's requires
    - Test type error for duplicate activity ports
    - Test activity requirements must be subset of available ports
    - Test `ValidateActivityRequirements` produces error type for missing ports
    - Test FlowAdapter without activities property still works
  - [x] 5.2 Create type-level validation utilities in `integration/activity-validation.ts`
    - `ValidateActivityRequirements<TActivity, TAvailablePorts>` type
    - `AssertActivityRequirements<TActivity, TAvailable>` assertion type
    - `AssertUniqueActivityPorts<TActivities>` uniqueness check
    - Error types with descriptive messages for violations
  - [x] 5.3 Update `FlowAdapterConfig` interface
    - Add `activities?: TActivities[]` property
    - Add type-level validation mapping over activities array
    - Add `defaultActivityTimeout?: number` property
  - [x] 5.4 Update `createFlowAdapter()` implementation
    - Extract activities from config
    - Validate activities at runtime (no duplicates, all frozen)
    - Create ActivityManager with defaultActivityTimeout
    - Build port-to-service mapping for activity deps resolution
  - [x] 5.5 Implement activity spawning integration
    - Create internal function to resolve activity deps from FlowAdapter's deps
    - Wire TypedEventSink to route events to machine runner
    - Update DIEffectExecutor to use new activity spawn signature
  - [x] 5.6 Write 3-4 runtime tests for FlowAdapter activities in `integration/adapter.test.ts`
    - Test FlowAdapter creation with activities array
    - Test activity spawning receives correct deps
    - Test activity events route to machine
    - Test activity cleanup called on FlowAdapter dispose
  - [x] 5.7 Verify all integration tests pass

**Acceptance Criteria:**

- FlowAdapter accepts `activities: [Activity1, Activity2]`
- Type error if activity requires unavailable port
- Activities receive pre-resolved deps matching their requires
- Activity events flow to state machine
- All tests pass

---

### Testing Utilities

#### Task Group 6: Activity Testing Utilities

**Dependencies:** Task Groups 2, 3
**Estimated Complexity:** Medium

- [x] 6.0 Complete testing utilities
  - [x] 6.1 Write 4-6 tests for testing utilities in `testing/activity-test-utils.test.ts`
    - Test `createTestEventSink` captures emitted events
    - Test `createTestEventSink.clear()` resets events array
    - Test `createTestSignal.abort()` triggers abort
    - Test `createTestSignal.timeout(ms)` aborts after delay
    - Test `createTestDeps` creates mock deps object from ports
    - Test `testActivity` returns complete result object
  - [x] 6.2 Implement `createTestEventSink<TEvents>()` in `testing/event-sink.ts`
    - Return `TypedEventSink<TEvents>` with captured events
    - `events: readonly EventOf<TEvents>[]` property
    - `clear(): void` method to reset captured events
    - Support both emit patterns (factory result and type+payload)
  - [x] 6.3 Implement `createTestSignal()` in `testing/signal.ts`
    - Return extended AbortSignal with test controls
    - `abort(reason?: string): void` to trigger immediate abort
    - `timeout(ms: number): void` to abort after delay
    - Clean up timeout on abort
  - [x] 6.4 Implement `createTestDeps<TRequires>()` in `testing/deps.ts`
    - Accept requires tuple and partial mocks
    - Return fully-typed `ResolvedActivityDeps<TRequires>`
    - Throw helpful error for missing required mocks
  - [x] 6.5 Implement `testActivity<A>()` harness in `testing/harness.ts`
    - Accept activity and options (input, deps, timeout, abortAfter)
    - Execute activity with test utilities
    - Return `TestActivityResult<TOutput, TEvents>` object
    - Track: result, error, events, status, cleanupCalled, cleanupReason
  - [x] 6.6 Export all utilities from `testing/index.ts`
  - [x] 6.7 Verify all testing utility tests pass

**Acceptance Criteria:**

- `createTestEventSink()` captures and exposes events
- `createTestSignal()` allows controlled abort/timeout
- `createTestDeps()` creates typed mock deps
- `testActivity()` provides complete test result
- All utilities fully typed
- All tests pass

---

### DevTools Integration

#### Task Group 7: Activity Metadata for DevTools

**Dependencies:** Task Group 3
**Estimated Complexity:** Low

- [x] 7.0 Complete DevTools integration
  - [x] 7.1 Write 2-3 tests for activity metadata in `devtools/activity-metadata.test.ts`
    - Test `getActivityMetadata` extracts correct port name
    - Test metadata includes requires port names
    - Test metadata includes emits event types
    - Test metadata includes hasCleanup and defaultTimeout
  - [x] 7.2 Define `ActivityMetadata` interface in `devtools/types.ts`
    - `portName: string`
    - `requires: readonly string[]`
    - `emits: readonly string[]`
    - `hasCleanup: boolean`
    - `defaultTimeout: number | undefined`
  - [x] 7.3 Implement `getActivityMetadata(activity: ActivityAny)` function
    - Extract port name from activity.port.\_\_portName
    - Map requires array to port names
    - Extract event type keys from emits object
    - Check cleanup existence
    - Return frozen metadata object
  - [x] 7.4 Export metadata utilities from devtools module
  - [x] 7.5 Verify DevTools tests pass

**Acceptance Criteria:**

- Activity metadata extractable for DevTools visualization
- Metadata includes all relevant activity information
- All tests pass

---

### Documentation

#### Task Group 8: API Documentation and Migration Guide

**Dependencies:** Task Groups 1-6 complete
**Estimated Complexity:** Medium

- [x] 8.0 Complete documentation
  - [x] 8.1 Add JSDoc comments to all public APIs
    - `activityPort()` - usage examples, type parameters
    - `defineEvents()` - pattern explanation, examples
    - `activity()` - complete config documentation
    - `TypedEventSink` - both emit patterns documented
    - All testing utilities documented
  - [x] 8.2 Create migration guide section in spec
    - Before/After code comparison
    - Step-by-step migration instructions
    - Common pitfalls and solutions
    - Backward compatibility notes
  - [x] 8.3 Add inline code examples to type definitions
    - Example in each major type's JSDoc
    - Runnable examples where possible
  - [x] 8.4 Verify documentation renders correctly in IDE tooltips

**Acceptance Criteria:**

- All public APIs have JSDoc with examples
- Migration path clear from old to new API
- IDE shows helpful tooltips for all types

---

### Examples and Integration

#### Task Group 9: Update Examples and Final Integration

**Dependencies:** Task Groups 1-7 complete
**Estimated Complexity:** Medium

- [x] 9.0 Complete examples and final integration
  - [x] 9.1 Create complete example activity in examples directory
    - Full TaskActivity with ports, events, execute, cleanup
    - Integration with FlowAdapter
    - Test coverage demonstrating all features
  - [x] 9.2 Update any existing flow examples to use new API
    - Identify existing activity usage in examples
    - Migrate to new `activity()` pattern
    - Verify examples still work
  - [x] 9.3 Write integration test covering full flow
    - FlowAdapter with multiple activities
    - Activities with shared dependencies
    - Event emission to state machine
    - Cleanup on dispose
  - [x] 9.4 Run full test suite
    - `pnpm test` in packages/flow
    - `pnpm test:types` for type-level tests
    - `pnpm lint` for code quality
    - `pnpm typecheck` for type checking
  - [x] 9.5 Verify backward compatibility
    - Old `Activity<I, O>` interface still usable
    - Existing tests pass without modification
    - Gradual migration supported

**Acceptance Criteria:**

- Complete working example demonstrating all features
- All existing tests pass (backward compatible)
- Full test suite passes
- Lint and typecheck pass

---

## Execution Order

### Phase 1: Foundation (Parallel)

1. **Task Group 1**: ActivityPort Factory (Foundation)
2. **Task Group 2**: defineEvents and TypedEventSink (Events)

### Phase 2: Core Implementation

3. **Task Group 3**: Activity Factory (depends on Groups 1, 2)

### Phase 3: Runtime Integration (Parallel)

4. **Task Group 4**: ActivityManager Updates (depends on Group 3)
5. **Task Group 6**: Testing Utilities (depends on Groups 2, 3)
6. **Task Group 7**: DevTools Metadata (depends on Group 3)

### Phase 4: Integration

7. **Task Group 5**: FlowAdapter Integration (depends on Groups 3, 4)

### Phase 5: Polish

8. **Task Group 8**: Documentation (depends on Groups 1-6)
9. **Task Group 9**: Examples and Final Integration (depends on Groups 1-7)

---

## File Structure

New and modified files:

```
packages/flow/src/
  activities/
    port.ts                    # NEW: ActivityPort type and factory
    port.test-d.ts             # NEW: Type-level tests for port
    events.ts                  # NEW: defineEvents and TypedEventSink
    events.test.ts             # NEW: Runtime tests for events
    events.test-d.ts           # NEW: Type-level tests for events
    types.ts                   # MODIFIED: Activity types (CleanupReason, etc.)
    factory.ts                 # NEW: activity() factory function
    factory.test.ts            # NEW: Runtime tests for factory
    factory.test-d.ts          # NEW: Type-level tests for factory
    manager.ts                 # MODIFIED: Cleanup, timeout, result capture
    manager.test.ts            # MODIFIED: Updated manager tests
    index.ts                   # MODIFIED: Export new APIs
  integration/
    activity-validation.ts     # NEW: Type-level validation utilities
    adapter.ts                 # MODIFIED: Activities integration
    adapter.test.ts            # MODIFIED: Adapter integration tests
    adapter.test-d.ts          # NEW: Type-level tests for adapter
  testing/
    event-sink.ts              # NEW: createTestEventSink
    signal.ts                  # NEW: createTestSignal
    deps.ts                    # NEW: createTestDeps
    harness.ts                 # NEW: testActivity harness
    index.ts                   # NEW: Export testing utilities
  devtools/
    types.ts                   # NEW: Add ActivityMetadata
    activity-metadata.ts       # NEW: getActivityMetadata
    index.ts                   # NEW: Export devtools utilities
tests/
  devtools/
    activity-metadata.test.ts  # NEW: Metadata tests
  examples/
    activity-api-showcase.test.ts # NEW: Comprehensive example and integration test
```

---

## Risk Mitigation

1. **Type Complexity**: Event system has complex inference. Start with simple cases, add edge cases iteratively.

2. **Backward Compatibility**: Keep old `Activity<I, O>` interface. ActivityManager should accept both old and new formats.

3. **Testing Isolation**: Each task group has isolated tests. Run group tests before integration.

4. **Performance**: TypedEventSink emit should have minimal overhead. Benchmark if needed.

---

## Success Metrics

- Zero `any` types in implementation (per project rules)
- All type-level tests pass (`pnpm test:types`)
- All runtime tests pass (`pnpm test`)
- Lint passes (`pnpm lint`)
- Typecheck passes (`pnpm typecheck`)
- IDE provides accurate autocomplete for all APIs
- Migration from old API documented and straightforward
