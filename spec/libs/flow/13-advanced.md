# Specification: Flow Advanced Patterns

## Goal

Define advanced composition, coordination, and integration patterns for HexDI Flow machines, including actor-style parent/child spawning, retry/backoff strategies, integration with sibling libraries (store, query, saga), machine state persistence, and performance optimization.

## User Stories

- As a developer, I want to compose complex workflows from smaller machines (parent spawning children, saga orchestration) so that I can model multi-step business processes with clear state boundaries
- As a developer, I want built-in retry and backoff patterns so that I can handle transient failures without manually reimplementing exponential backoff in every machine

## Specific Requirements

**Actor Model Pattern: Parent-Child Machine Spawning via Activities**

- Child machines are modeled as configured activities using the existing `activity()` and `Effect.spawn()` APIs -- no new effect types required
- Define a `createMachineActivity(machinePort, config)` helper that wraps a child machine definition in a `ConfiguredActivity`, where the activity's `run` function creates a `MachineRunner`, processes input events, and emits output events to the parent via the activity's `EventSink`
- The child machine runs inside the ActivityManager using the same scope resolver, so it has access to the same DI ports as the parent
- When the child machine reaches a final state, the activity completes and the parent receives a `done.invoke.{activityPortName}` event automatically
- If the child machine's activity runner returns `Err(EffectExecutionError)`, the activity is marked as failed and the parent receives an `error.invoke.{activityPortName}` event with the error payload (discriminated by `_tag`)
- Parent-to-child communication uses the activity's input; child-to-parent communication uses the activity's `EventSink`
- Child machines are stopped automatically when the parent transitions out of the state that spawned them (same lifecycle as activities via `AbortSignal`)

**State Machine Composition via Invoke**

- Support `invoke` configuration on state nodes that starts a child machine as a service for the duration of that state
- The invoke config takes: `src` (a machine definition or FlowPort), `input` (function mapping parent context to child input), `onDone` (target state), `onError` (target state)
- When the parent enters a state with `invoke`, the child machine is created and started; when the child reaches a final state, the parent transitions via `onDone`
- Only one invoked machine per state node; multiple invocations require parallel states
- Invoked machines share the parent's scope for DI resolution but maintain independent context

**Event-Driven Architecture: External Event Stream Subscription via Activities**

- External event subscriptions are modeled as configured activities using the existing `activity()` and `Effect.spawn()` APIs
- Define a `createSubscriptionActivity(port, eventType)` helper that wraps an external event source subscription in a `ConfiguredActivity`, where the activity's `run` function resolves the port, calls its `subscribe` method, and routes emitted events to the machine via the activity's `EventSink`
- The subscription activity is automatically cleaned up when the machine exits the subscribing state (via `AbortSignal` cancellation)
- Type safety: the event type parameter must match one of the machine's declared event types

**Retry Patterns with Exponential Backoff**

- Provide a `retryConfig` helper that generates the states and transitions for a retry pattern: `{ maxRetries, initialDelay, maxDelay, backoffMultiplier }`
- The helper produces a `waiting` state with a delay effect and a guard `canRetry` that checks retry count against `maxRetries`
- Context is automatically extended with `retryCount: number` and `retryDelay: number` fields
- The helper returns a partial machine config (states + guards) that can be spread into a `defineMachine` call
- Alternatively, this can be a higher-order machine pattern (a function that wraps an existing machine with retry behavior)

**Saga Integration via @hex-di/saga**

> **Full integration guide:** See [Integration: Flow + Saga](../../cross-cutting/integration/flow-saga.md) for complete patterns and wiring examples.

- Define a pattern where a flow machine orchestrates a saga by invoking a `SagaPort<TName, TInput, TOutput, TError>` as an activity
- The saga runs as an `Effect.invoke(SagaPort, 'execute', input)` where the `SagaPort` token resolves to a `SagaExecutor` that runs the configured saga definition
- On saga success, the machine receives a `done.invoke.{portName}` event carrying `SagaSuccess<TOutput>` (with `output` and `executionId` fields)
- On saga failure, the machine receives an `error.invoke.{portName}` event carrying `EffectExecutionError { _tag: "InvokeError", cause: SagaError<TError> }`. The `cause` field is the full `SagaError` with its `_tag` discriminant (`"StepFailed"`, `"CompensationFailed"`, `"Timeout"`, etc.) for structured error handling in the machine's error transition
- The saga's `SagaProgressEvent` and `SagaCompensationEvent` (imported from `@hex-di/saga`) are routed back to the machine via the activity `EventSink` for UI feedback (e.g., "rolling back step 3 of 5")
- The shared integration contract types (`SagaProgressEvent`, `SagaCompensationEvent`) are defined in the saga spec (see [Saga Integration §15.0](../saga/10-integration.md#150-shared-integration-contract-types)) and exported from `@hex-di/saga`

**Store Integration: Bidirectional Context Sync**

> **Full integration guide:** See [Integration: Store + Flow](../../cross-cutting/integration/store-flow.md) for complete patterns and wiring examples.

- Define a `syncWithStore(storePort, selector, eventType)` helper that creates an activity subscription to a `@hex-di/store` instance
- Store state changes matching the selector emit events to the machine, allowing the machine to react to external state
- Machine context changes can be pushed back to the store via `Effect.invoke(StorePort, 'dispatch', [action])`
- The sync is unidirectional by default (store -> machine); bidirectional sync requires explicit dispatch effects in machine transitions

**Query Integration: Triggering Queries from States**

> **Full integration guide:** See [Integration: Query + Flow](../../cross-cutting/integration/query-flow.md) for complete patterns and wiring examples.

- Define a pattern for invoking `@hex-di/query` operations from machine states using `Effect.invoke(QueryPort, 'fetch', [queryKey])`
- Query results arrive as `done.invoke.{queryId}` events with the data payload
- Query errors arrive as `error.invoke.{queryId}` events carrying an `EffectExecutionError` payload (typically `{ _tag: 'InvokeError', portName, method, cause }`)
- Stale/cached query data can be accessed synchronously from context if the query port provides a `getCache` method

**Multi-Machine Coordination Patterns**

- Document the mediator pattern: a coordinator machine that spawns and orchestrates multiple child machine activities via `Effect.spawn()`
- The coordinator receives child completion events via the activity `EventSink` and maintains a registry of active children in its context
- Provide a `waitForAll(childIds)` guard helper that returns true only when all specified child activities have completed
- Provide a `waitForAny(childIds)` guard helper that returns true when any specified child activity has completed

**Persistence & Recovery: Machine State Serialization**

Serialization and restoration return `Result` types instead of throwing exceptions:

```typescript
serializeMachineState(runner): Result<SerializedMachineState, SerializationError>
restoreMachineState(machine, snapshot): Result<MachineRunner, RestoreError>

type SerializationError =
  | { readonly _tag: 'NonSerializableContext'; readonly path: string; readonly valueType: string }
  | { readonly _tag: 'CircularReference'; readonly path: string };

type RestoreError =
  | { readonly _tag: 'InvalidState'; readonly state: string; readonly validStates: readonly string[] }
  | { readonly _tag: 'MachineIdMismatch'; readonly expected: string; readonly received: string }
  | { readonly _tag: 'SnapshotCorrupted'; readonly detail: string };
```

- `serializeMachineState(runner)` produces a `Result<SerializedMachineState, SerializationError>` containing the JSON-serializable snapshot `{ machineId, state, context, timestamp }` on `Ok`, or a typed error on `Err`
- Returns `Err({ _tag: 'NonSerializableContext', path, valueType })` when context contains functions, symbols, or other non-serializable values (with the JSON path to the offending value)
- Returns `Err({ _tag: 'CircularReference', path })` when context contains circular references
- `restoreMachineState(machine, snapshot)` produces a `Result<MachineRunner, RestoreError>` with the restored runner on `Ok`
- Returns `Err({ _tag: 'InvalidState', state, validStates })` when the snapshot's state does not exist in the machine definition
- Returns `Err({ _tag: 'MachineIdMismatch', expected, received })` when the snapshot's machineId doesn't match the machine definition
- Returns `Err({ _tag: 'SnapshotCorrupted', detail })` for other deserialization failures
- State restoration skips entry effects for the restored state (the machine resumes as-is, not re-enters)
- All error types use `_tag` discriminant per Result spec §49 convention

**Performance Optimization: Batched Events and Lazy Context**

- Implement `runner.sendBatch(events)` that processes multiple events in a single synchronous pass, emitting only one subscriber notification at the end
- Batched transitions still produce individual FlowCollector entries for debugging but consolidate subscription callbacks
- `sendBatch` returns `Result<readonly TransitionResult[], TransitionError>` — on the first `Err(TransitionError)`, the batch short-circuits: events already processed remain applied, remaining events are discarded, and the error is returned. This matches `Effect.sequence` semantics (fail-fast).
- An empty batch is a no-op: returns `Ok([])` without notifying subscribers
- Add a `lazyContext` option to machine config that defers context cloning until the context is actually read, reducing overhead for transitions that only change state

## Existing Code to Leverage

**Effect Constructors (`libs/flow/core/src/effects/constructors.ts`)**

- The `Effect` namespace provides `invoke`, `spawn`, `stop`, `emit`, `delay`, `parallel`, `sequence`, `none`, `choose`, and `log` constructors
- Advanced patterns (child machines, subscriptions) are built on top of the existing `Effect.spawn()` constructor via helper functions that produce `ConfiguredActivity` instances, requiring no new effect types

**ActivityManager and Activity System (`libs/flow/core/src/activities/`)**

- Child machines and subscriptions are modeled as activities with the existing `ActivityManager` lifecycle (spawn, track, cancel via AbortSignal, cleanup)
- The `ConfiguredActivity` pattern with `port`, `requires`, `emits`, `execute`, `cleanup` maps directly to child machine lifecycle
- `createMachineActivity` and `createSubscriptionActivity` helpers produce standard `ConfiguredActivity` instances

**DIEffectExecutor (`libs/flow/core/src/integration/di-executor.ts`)**

- The executor handles `Invoke`, `Spawn`, `Stop`, `Emit`, `Delay`, `Choose`, `Log`, `Parallel`, `Sequence`, and `None` effect types with port resolution from the scope
- No new effect types are needed for advanced patterns; child machines and subscriptions are standard `Spawn` effects resolved through existing activity infrastructure

**FlowAdapter and FlowService (`libs/flow/core/src/integration/adapter.ts`)**

- The adapter already manages machine lifecycle (creation in factory, disposal in finalizer) and wires the DIEffectExecutor
- Persistence/recovery should integrate at the adapter level: accept an optional initial snapshot in the config to restore state on creation

**MachineRunner (`libs/flow/core/src/runner/`)**

- `createMachineRunner` creates runners with executor and activityManager; `sendBatch` should be added to the MachineRunner interface
- The interpreter (`libs/flow/core/src/runner/interpreter.ts`) processes events and produces effects; batch support requires accumulating effects across multiple events before notifying subscribers

## Out of Scope

- Distributed machine coordination across network boundaries or microservices
- BPMN or workflow engine compatibility layers
- Visual workflow editor or drag-and-drop machine builder
- Automatic saga compensation generation from machine definitions
- Database-backed persistence adapters (this spec covers serialization format only)
- Real-time collaborative machine editing
- Machine versioning or migration between machine definition versions
- Rate limiting or throttling of machine events
- Machine-level access control or authorization
- Integration with external workflow engines (Temporal, Step Functions)
