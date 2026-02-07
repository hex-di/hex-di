# Specification: Flow Activities

## Goal

Provide a type-safe, DI-integrated activity system for long-running, cancellable operations spawned by state machines, with typed events, cleanup guarantees, and configurable timeouts.

## User Stories

- As a developer, I want to define activities with typed input/output and DI-resolved dependencies so that long-running side effects are decoupled from the machine and testable in isolation.
- As a developer, I want activities to emit typed events back to the machine so that I can drive state transitions from background work without breaking type safety.

## Specific Requirements

**Activity Port Definition**

- `activityPort<TInput, TOutput>()('Name')` creates an immutable, frozen port token using curried partial type inference (explicit I/O types, inferred name literal)
- The port carries phantom types `__activityInput` and `__activityOutput` for compile-time extraction with zero runtime cost
- `ActivityInput<P>` and `ActivityOutput<P>` utility types extract I/O types from any `ActivityPort` via conditional type inference
- The underlying port is a branded `Port<Activity<TInput, TOutput>, TName>` from `@hex-di/core`, making it compatible with the container's resolution system
- Port objects are created via `Object.freeze({ __portName: name })` with a single `@ts-expect-error` for the phantom type gap

**Typed Event Definitions**

- `defineEvents({ EVENT_NAME: (args) => payload })` creates a frozen map of `EventFactory` objects, each callable and carrying a `.type` property
- Each factory returns a frozen `EventDefinition<TType, TPayload>` object of shape `{ type: 'EVENT_NAME', ...payload }`
- `EventTypes<T>` extracts the union of all event type strings; `PayloadOf<T, K>` extracts the payload for a specific event type; `EventOf<T>` creates the full discriminated union of all event objects
- Empty payloads are normalized to `Record<string, never>` via `NormalizePayload`

**TypedEventSink**

- `TypedEventSink<TEvents>` supports two emission patterns: `sink.emit(factory(...))` with an event object, and `sink.emit('TYPE', payload)` with type string plus payload
- For events with empty payloads, the payload argument is optional in the string-based pattern
- The `TypedEmit` type uses `EmitArgs` to build a union of all valid argument combinations per event type

**Activity Configuration via `activity()` Factory**

- `activity(port, config)` accepts an `ActivityConfig` with `requires` (port tuple), `emits` (event definitions), optional `timeout`, `execute`, and optional `cleanup`
- The `const` modifier on `TRequires` preserves the tuple type for proper `ResolvedActivityDeps` inference, mapping port names to service types
- `execute(input, context)` receives `ActivityContext<TRequires, TEvents>` containing `deps`, `sink`, and `signal`
- `cleanup(reason, context)` receives only `{ deps }` since the signal and sink are no longer valid after execution ends
- Returns a frozen `ConfiguredActivity` object; `ConfiguredActivityAny` provides a universal constraint type using variance rules (`never` in contravariant, `unknown` in covariant positions)

**Activity Lifecycle**

- Status progresses through: `pending` -> `running` -> `completed` | `failed` | `cancelled`
- `ActivityInstance` tracks `id`, `status`, `startTime`, and optional `endTime`
- The `ActivityManager` creates an `AbortController` per spawned activity and passes `controller.signal` to execute
- On abort, the manager distinguishes between `cancelled` (explicit stop) and `timeout` (timer-triggered abort) via a `timeoutTriggered` flag

**Result-Typed Activity Output**

- Activity `execute()` may return `Result<TOutput, TError>` or `ResultAsync<TOutput, TError>` in addition to `void`/`Promise<void>` (backward compatible — `void` is effectively `Result<void, never>`)
- When `execute()` returns `Err(error)`, the `ActivityManager` sets status to `'failed'` and routes the **typed** error via `error.activity.<id>` event. The parent machine can discriminate the error via `error._tag`.
- When `execute()` returns `Ok(value)`, the value is available on the `done.activity.<id>` event payload
- Plain `void` returns and `Promise<void>` returns remain supported for backward compatibility — they are treated as implicit `Ok(undefined)`

**Cleanup Guarantees**

- Cleanup is called exactly once per activity, enforced by a `cleanupCalled` boolean guard in `MutableActivityState`
- The `CleanupReason` discriminant is one of: `completed`, `cancelled`, `timeout`, `error`
- Cleanup may return `Result<void, CleanupError>` where `CleanupError = { readonly _tag: 'CleanupFailed'; readonly activityId: string; readonly reason: CleanupReason; readonly cause: unknown }`
- On `Err`, the error is recorded in the FlowInspector's health events as a `'flow-degraded'` event (no longer silently swallowed)
- On `Ok` (or `void` return for backward compatibility), cleanup is considered successful
- Cleanup receives `deps` but not `sink` or `signal`, since the activity has already terminated

**Timeout Hierarchy**

- Three-layer timeout fallback: `SpawnOptions.timeout` (highest) > `ActivityConfig.timeout` (activity-level) > `ActivityManagerConfig.defaultTimeout` (lowest)
- When timeout fires, `timeoutTriggered` is set to `true` and `controller.abort()` is called, resulting in `CleanupReason = 'timeout'`
- The timeout timer is cleared in `callCleanup` to prevent double-abort after normal completion

**ActivityManager API**

- `createActivityManager(config?)` returns an `ActivityManager` with `spawn`, `stop`, `getStatus`, `getResult`, `getAll`, `dispose`
- `spawn` supports two overloads: new API `(activity, input, eventSink, deps, options?)` generating a unique ID, and legacy API `(id, activity, input, eventSink)` with explicit ID
- `stop(id)` aborts only if status is `running`; `getResult<T>(id)` returns the captured result only if status is `completed`
- `dispose()` aborts all running activities, awaits all cleanup completion, and returns `ResultAsync<void, DisposeError>` — collecting any cleanup failures into a single `DisposeError` with a `failures` array

**Testing Utilities**

- `testActivity(activity, options)` is the primary test harness, returning `TestActivityResult` with `result`, `error`, `events`, `status`, `cleanupCalled`, `cleanupReason`
- `createTestEventSink<TEvents>()` captures emitted events into a readable `events` array
- `createTestSignal()` provides an `abort()` and `timeout(ms)` method for simulating cancellation and timeout scenarios
- `createTestDeps(requires, partialMocks)` builds mock deps from a partial map, throwing `MissingMockError` for unregistered ports

## Existing Code to Leverage

**`libs/flow/core/src/activities/port.ts` - Activity Port Factory**

- Defines `ActivityPort<TInput, TOutput, TName>` extending `Port` with phantom types
- Provides `activityPort<TInput, TOutput>()` curried factory and `ActivityInput`/`ActivityOutput` utility types
- Uses `unsafeCreateActivityPort` with a single `@ts-expect-error` for the phantom type gap
- All ports are frozen and immutable at runtime

**`libs/flow/core/src/activities/events.ts` - Typed Event System**

- `defineEvents` creates `DefineEventsResult` mapping keys to `EventFactory` objects
- `TypedEventSink<TEvents>` interface with `TypedEmit` type supporting both emission patterns
- `EventOf`, `EventTypes`, `PayloadOf` type utilities for event type extraction
- All event objects and the result object are frozen via `Object.freeze`

**`libs/flow/core/src/activities/manager.ts` - Activity Manager**

- `createActivityManager` with closure-based `MutableActivityState` tracking
- Implements three-layer timeout, exactly-once cleanup, and result capture
- `spawnConfigured` and `spawnLegacy` internal functions with runtime type detection via `isLegacySpawn` and `isConfiguredActivity` guards
- `dispose()` aborts all running activities then awaits all promises

**`libs/flow/core/src/activities/testing/harness.ts` - Test Harness**

- `testActivity` orchestrates `createTestEventSink`, `createTestSignal`, `createTestDeps`
- Returns `TestActivityResult` with comprehensive tracking of result, error, events, status, and cleanup
- Supports `timeout` and `abortAfter` options for cancellation/timeout simulation

**`libs/flow/core/src/activities/types.ts` - Core Type Definitions**

- `ResolvedActivityDeps` maps a port tuple to a name-keyed deps object using `InferPortName` and `InferService`
- `ActivityContext` bundles `deps`, `sink`, and `signal` for the execute function
- `ConfiguredActivityAny` provides the universal constraint using variance rules for collections and validation

## Out of Scope

- Activity retry or backoff logic (activities fail, the machine decides retry policy)
- Activity-to-activity communication (activities only communicate via the machine's event system)
- Activity priority or scheduling (all activities are started immediately on spawn)
- Persistent activity state across process restarts
- Activity progress tracking beyond event emission (no built-in progress percentage)
- Nested or hierarchical activity spawning (one level of activities per machine)
- Activity result streaming (only final result is captured; intermediate data uses events)
- Dynamic activity registration after adapter creation
- Activity pooling or concurrency limits
- Distributed activity execution across processes or machines
