# 16 - Definition of Done

_Previous: [15 - Appendices](./15-appendices.md)_

---

This document defines all tests required for `@hex-di/flow`, `@hex-di/flow-react`, and `@hex-di/flow-testing` to be considered complete. Each section maps to spec section(s) and specifies required unit tests, type-level tests, integration tests, and mutation testing guidance.

## Test File Convention

| Test Category         | File Pattern  | Location                            |
| --------------------- | ------------- | ----------------------------------- |
| Unit tests            | `*.test.ts`   | `libs/flow/core/tests/`             |
| Type-level tests      | `*.test-d.ts` | `libs/flow/core/tests/`             |
| Integration tests     | `*.test.ts`   | `libs/flow/core/tests/integration/` |
| Activity tests        | `*.test.ts`   | `libs/flow/core/tests/activities/`  |
| Activity type tests   | `*.test-d.ts` | `libs/flow/core/tests/activities/`  |
| React hook tests      | `*.test.tsx`  | `libs/flow/react/tests/`            |
| Testing package tests | `*.test.ts`   | `libs/flow/testing/tests/`          |
| E2E / example tests   | `*.test.ts`   | `libs/flow/core/tests/examples/`    |

---

## DoD 1: Core Concepts (Spec Section 02)

### Unit Tests -- `core-types.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 1   | Machine has a `MachineBrandSymbol` property for nominal typing      | unit |
| 2   | Machine is deeply frozen after creation (`Object.isFrozen`)         | unit |
| 3   | Machine `id` matches the config id                                  | unit |
| 4   | Machine `initial` matches the first state key (or explicit initial) | unit |
| 5   | Machine `states` record contains all declared state names           | unit |
| 6   | Machine `context` holds the initial context value                   | unit |
| 7   | StateNode has `entry`, `exit`, and `on` properties                  | unit |
| 8   | Event factory creates a frozen event with `type` property           | unit |
| 9   | Event with payload includes `payload` field                         | unit |
| 10  | Event without payload has no `payload` field                        | unit |
| 11  | Event has `EventBrandSymbol` for nominal typing                     | unit |
| 12  | State factory creates a frozen state with `name` property           | unit |
| 13  | State has `StateBrandSymbol` for nominal typing                     | unit |
| 14  | Snapshot contains `state`, `context`, and `activities`              | unit |
| 15  | Snapshot is frozen (`Object.isFrozen`)                              | unit |
| 16  | Guard function receives context and event, returns boolean          | unit |
| 17  | Action function receives context and event, returns new context     | unit |
| 18  | Transition with guard evaluates guard predicate                     | unit |

### Type-Level Tests -- `core-types.test-d.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `Machine<'idle' \| 'active', 'GO', { count: number }>` preserves literal state names | type |
| 2   | State name union is inferred from `states` record keys                               | type |
| 3   | Event name union is inferred from all `on` record keys across states                 | type |
| 4   | Context type is inferred from the `context` property value                           | type |
| 5   | `InferMachineStateNames<M>` extracts state name union                                | type |
| 6   | `InferMachineEventNames<M>` extracts event name union                                | type |
| 7   | `InferMachineContextType<M>` extracts context type                                   | type |
| 8   | Two machines with identical structure but different brands are type-incompatible     | type |
| 9   | `Event<'SUBMIT', { formId: string }>` includes typed payload                         | type |
| 10  | `Event<'RESET'>` has no payload property in type                                     | type |

### Mutation Testing

**Target: >95% mutation score.** Core branded types and their symbol-based discriminants are the foundation of the entire system. Any mutation to brand symbols, freeze calls, or property assignments must be caught.

---

## DoD 2: Machine Definition (Spec Section 03)

### Unit Tests -- `machine-definition.test.ts`

| #   | Test                                                                          | Type |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1   | `defineMachine` creates a valid Machine from config                           | unit |
| 2   | `defineMachine` infers initial state from first key when `initial` is omitted | unit |
| 3   | `defineMachine` uses explicit `initial` when provided                         | unit |
| 4   | String shorthand transitions are normalized to full `TransitionConfig`        | unit |
| 5   | `type: 'final'` states are recognized as terminal                             | unit |
| 6   | `defineMachine` normalizes full `TransitionConfig` objects correctly          | unit |
| 7   | `defineMachine` produces deeply frozen Machine objects                        | unit |
| 8   | Attempted mutation of frozen machine throws in strict mode                    | unit |
| 9   | Machine `id` is immutable after creation                                      | unit |
| 10  | Transition with guard, actions, and effects is preserved in machine           | unit |
| 11  | Multiple transitions for same event (guarded array) are preserved             | unit |
| 12  | Empty `on: {}` defines a final state in `defineMachine`                       | unit |
| 13  | `MachineConfig` accepts `undefined` as context                                | unit |
| 14  | Machine composition via `Effect.spawn` references child machine               | unit |

### Type-Level Tests -- `machine-definition.test-d.ts`

| #   | Test                                                               | Type |
| --- | ------------------------------------------------------------------ | ---- |
| 1   | `defineMachine` infers state names as literal union                | type |
| 2   | `defineMachine` infers event names from all `on` keys              | type |
| 3   | `defineMachine` infers context type from `context` value           | type |
| 4   | Invalid transition target produces compile error                   | type |
| 5   | `const` modifier preserves literal types (not widened to `string`) | type |
| 6   | Guard function type-checks context and event parameters            | type |
| 7   | Action function must return correct context type                   | type |
| 8   | String shorthand is assignable to `TransitionInput` union          | type |
| 9   | `MachineConfig` validates `initial` against state name union       | type |
| 10  | `EffectAny` accepts all effect tag discriminants                   | type |

### Mutation Testing

**Target: >95% mutation score.** Machine factory normalization logic (string shorthand expansion, initial state inference, deep freezing) must be fully exercised. Mutations to normalization branches would produce machines with incorrect internal structure.

---

## DoD 3: States & Guards (Spec Section 04)

### Unit Tests -- `states-guards.test.ts`

| #   | Test                                                                    | Type |
| --- | ----------------------------------------------------------------------- | ---- |
| 1   | State with `type: 'atomic'` is the default when type is omitted         | unit |
| 2   | State with `type: 'final'` has no outgoing transitions                  | unit |
| 3   | Self-transition fires exit and entry effects                            | unit |
| 4   | Internal transition (`internal: true`) does not fire exit/entry effects | unit |
| 5   | Guard returning `true` allows transition                                | unit |
| 6   | Guard returning `false` blocks transition                               | unit |
| 7   | Multiple guarded transitions: first passing guard wins                  | unit |
| 8   | Transition without guard is always taken (fallback)                     | unit |
| 9   | Named guard via `guard(name, predicate)` is evaluable                   | unit |
| 10  | `and(g1, g2)` returns `true` only when both guards pass                 | unit |
| 11  | `or(g1, g2)` returns `true` when either guard passes                    | unit |
| 12  | `not(g)` inverts the guard result                                       | unit |
| 13  | Composed guards: `and(not(g1), or(g2, g3))` evaluates correctly         | unit |
| 14  | Eventless (`always`) transitions fire immediately after entry           | unit |
| 15  | Delayed (`after`) transitions create a delay effect                     | unit |
| 16  | Actions execute in array order, threading context                       | unit |
| 17  | Effect ordering: exit -> transition -> entry                            | unit |

### Type-Level Tests -- `states-guards.test-d.ts`

| #   | Test                                                                                                  | Type |
| --- | ----------------------------------------------------------------------------------------------------- | ---- |
| 1   | `StateNode` type discriminator accepts `'atomic' \| 'compound' \| 'parallel' \| 'final' \| 'history'` | type |
| 2   | `Guard<TContext, TEvent>` accepts `(context, event) => boolean`                                       | type |
| 3   | `and`, `or`, `not` return `Guard` type                                                                | type |
| 4   | `TransitionConfig` with `internal: true` is assignable                                                | type |
| 5   | `'final'` state with `on` record produces compile error                                               | type |

### Mutation Testing

**Target: >95% mutation score.** Guard evaluation order and composition logic are subtle -- mutating `&&` to `||` in `and()` or reversing evaluation order must be caught. Effect ordering (exit -> transition -> entry) is a critical invariant.

---

## DoD 4: Effect System (Spec Section 05)

### Unit Tests -- `effects.test.ts`

| #   | Test                                                                                                                  | Type |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `Effect.invoke(port, method, args)` creates an `InvokeEffect` with `_tag: 'Invoke'`                                   | unit |
| 2   | `Effect.spawn(port, input)` creates a `SpawnEffect` with `_tag: 'Spawn'`                                              | unit |
| 3   | `Effect.stop(activityId)` creates a `StopEffect` with `_tag: 'Stop'`                                                  | unit |
| 4   | `Effect.emit(event)` creates an `EmitEffect` with `_tag: 'Emit'`                                                      | unit |
| 5   | `Effect.delay(ms, event)` creates a `DelayEffect` with `_tag: 'Delay'`                                                | unit |
| 6   | `Effect.parallel(effects)` creates a `ParallelEffect` with `_tag: 'Parallel'`                                         | unit |
| 7   | `Effect.sequence(effects)` creates a `SequenceEffect` with `_tag: 'Sequence'`                                         | unit |
| 8   | `Effect.none()` creates a `NoneEffect` with `_tag: 'None'`                                                            | unit |
| 9   | `Effect.choose(branches)` creates a `ChooseEffect` with `_tag: 'Choose'`                                              | unit |
| 10  | `Effect.log(message)` creates a `LogEffect` with `_tag: 'Log'`                                                        | unit |
| 11  | All effect constructors return frozen objects                                                                         | unit |
| 12  | `InvokeEffect` carries port, method, and args                                                                         | unit |
| 13  | `SpawnEffect` carries port and input                                                                                  | unit |
| 14  | `DelayEffect` carries ms and event payload                                                                            | unit |
| 15  | `ChooseEffect` evaluates guard branches in order                                                                      | unit |
| 16  | `LogEffect` accepts string or function message                                                                        | unit |
| 17  | `EffectExecutionError` variants: InvokeError, SpawnError, StopError, ResolutionError, SequenceAborted, ParallelErrors | unit |
| 18  | `TransitionError` variants: GuardThrew, ActionThrew, Disposed, QueueOverflow                                          | unit |
| 19  | `FlowAdapterError` variants: MetadataInvalid, DuplicateActivityPort, ActivityNotFrozen                                | unit |
| 20  | Effect execution order: exit effects, transition effects, entry effects                                               | unit |
| 21  | Effect cancellation: pending effects cleared on state exit                                                            | unit |

### Type-Level Tests -- `effects.test-d.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 1   | `Effect.invoke` type-checks method name against port's service interface | type |
| 2   | `Effect.invoke` type-checks args against method's parameter types        | type |
| 3   | `Effect.spawn` type-checks input against `ActivityInput<TPort>`          | type |
| 4   | `EffectAny` is a discriminated union of all effect types                 | type |
| 5   | `InvokeEffect` carries phantom `__resultType` for downstream inference   | type |
| 6   | `EffectExecutionError` is narrowable via `_tag` discriminant             | type |
| 7   | `TransitionError` is narrowable via `_tag` discriminant                  | type |
| 8   | `FlowAdapterError` is narrowable via `_tag` discriminant                 | type |
| 9   | `Effect.choose` branch guard type matches `(context, event) => boolean`  | type |
| 10  | `Effect.log` message function receives `(context, event)`                | type |

### Mutation Testing

**Target: >95% mutation score.** Effect constructor correctness (correct `_tag` assignment, correct property mapping) is critical. Mutations swapping `_tag` values between effect types must be caught. Error type discriminant values must be verified exhaustively.

---

## DoD 5: Activities (Spec Section 06)

### Unit Tests -- `activities/`

#### Port Tests -- `activities/port.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `createActivityPort<TInput, TOutput>()('Name')` creates a frozen port token | unit |
| 2   | Port carries phantom types `__activityInput` and `__activityOutput`         | unit |
| 3   | Port `__portName` matches the provided name                                 | unit |

#### Event Tests -- `activities/events.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 4   | `defineEvents` creates a frozen map of `EventFactory` objects            | unit |
| 5   | Each factory is callable and returns a frozen event with `type` property | unit |
| 6   | Event with payload includes payload fields                               | unit |
| 7   | Event without payload has empty payload                                  | unit |
| 8   | `TypedEventSink` supports `sink.emit(factory(...))` pattern              | unit |
| 9   | `TypedEventSink` supports `sink.emit('TYPE', payload)` pattern           | unit |

#### Factory Tests -- `activities/factory.test.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 10  | `activity(port, config)` creates a frozen `ConfiguredActivity`                   | unit |
| 11  | `ConfiguredActivity` carries port, requires, emits, execute, and cleanup         | unit |
| 12  | `execute(input, context)` receives `ActivityContext` with deps, sink, and signal | unit |
| 13  | `cleanup(reason, context)` receives only `{ deps }`                              | unit |

#### Manager Tests -- `activities/manager.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 14  | Activity lifecycle: pending -> running -> completed                      | unit |
| 15  | Activity lifecycle: pending -> running -> failed                         | unit |
| 16  | Activity lifecycle: pending -> running -> cancelled                      | unit |
| 17  | `ActivityManager.spawn` creates an `AbortController` and passes signal   | unit |
| 18  | `ActivityManager.stop(id)` aborts the controller signal                  | unit |
| 19  | Cleanup is called exactly once per activity (guarded by `cleanupCalled`) | unit |
| 20  | `CleanupReason` is one of: completed, cancelled, timeout, error          | unit |
| 21  | Timeout hierarchy: SpawnOptions > ActivityConfig > ActivityManagerConfig | unit |
| 22  | Timeout triggers `controller.abort()` with `CleanupReason = 'timeout'`   | unit |
| 23  | `dispose()` aborts all running activities and awaits cleanup             | unit |
| 24  | `dispose()` returns `ResultAsync<void, DisposeError>`                    | unit |
| 25  | Stopping an already-completed activity is a no-op                        | unit |
| 26  | Activity returning `Err(error)` sets status to `'failed'`                | unit |
| 27  | Activity returning `Ok(value)` makes value available on done event       | unit |
| 28  | Cleanup returning `Err(CleanupError)` is recorded as health event        | unit |

#### Testing Utility Tests -- `activities/testing/activity-test-utils.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 29  | `testActivity` returns result, events, status, cleanupCalled, cleanupReason | unit |
| 30  | `createTestEventSink` captures emitted events in `events` array             | unit |

### Type-Level Tests -- `activities/`

#### Port Type Tests -- `activities/port.test-d.ts`

| #   | Test                                                                 | Type |
| --- | -------------------------------------------------------------------- | ---- |
| 1   | `ActivityInput<P>` extracts input type from `ActivityPort`           | type |
| 2   | `ActivityOutput<P>` extracts output type from `ActivityPort`         | type |
| 3   | `ActivityPort` extends `Port` (compatible with container resolution) | type |

#### Factory Type Tests -- `activities/factory.test-d.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 4   | `ResolvedActivityDeps` maps port tuple to name-keyed deps object    | type |
| 5   | `ActivityContext` bundles deps, sink, and signal with correct types | type |
| 6   | `const` modifier on `TRequires` preserves tuple type                | type |
| 7   | `ConfiguredActivityAny` is a universal constraint type              | type |

#### Event Type Tests -- `activities/events.test-d.ts`

| #   | Test                                                           | Type |
| --- | -------------------------------------------------------------- | ---- |
| 8   | `EventTypes<T>` extracts union of event type strings           | type |
| 9   | `PayloadOf<T, K>` extracts payload for a specific event type   | type |
| 10  | `EventOf<T>` creates full discriminated union of event objects | type |

### Mutation Testing

**Target: >95% mutation score.** Activity lifecycle state machine (pending -> running -> completed/failed/cancelled) must be verified exhaustively. The exactly-once cleanup guarantee and timeout hierarchy are critical invariants where mutations to boolean guards or priority order must be caught.

---

## DoD 6: Ports & Adapters (Spec Section 07)

### Unit Tests -- `integration/adapter.test.ts`

| #   | Test                                                                                                     | Type |
| --- | -------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `createFlowPort` creates a port compatible with container resolution                                     | unit |
| 2   | `FlowService.snapshot()` returns current MachineSnapshot                                                 | unit |
| 3   | `FlowService.state()` returns current state name                                                         | unit |
| 4   | `FlowService.context()` returns current context value                                                    | unit |
| 5   | `FlowService.send(event)` returns `Result<effects[], TransitionError>`                                   | unit |
| 6   | `FlowService.sendAndExecute(event)` returns `ResultAsync<void, TransitionError \| EffectExecutionError>` | unit |
| 7   | `FlowService.subscribe(callback)` notifies on transitions                                                | unit |
| 8   | `FlowService.dispose()` returns `ResultAsync<void, DisposeError>`                                        | unit |
| 9   | `FlowService.isDisposed` returns `true` after disposal                                                   | unit |
| 10  | `send()` after disposal returns `Err({ _tag: 'Disposed' })`                                              | unit |
| 11  | `createFlowAdapter` returns `Result<FlowAdapter, FlowAdapterError>`                                      | unit |
| 12  | `createFlowAdapter` validates duplicate activity port names                                              | unit |
| 13  | `createFlowAdapter` validates frozen activities                                                          | unit |
| 14  | `createFlowAdapter` computes and attaches `FlowAdapterMetadata`                                          | unit |
| 15  | `computeFlowMetadata` validates machine has states                                                       | unit |
| 16  | `computeFlowMetadata` validates initial state exists                                                     | unit |
| 17  | `computeFlowMetadata` validates machine id is non-empty                                                  | unit |
| 18  | `computeFlowMetadata` extracts stateNames, eventNames, finalStates                                       | unit |
| 19  | `computeFlowMetadata` builds transitionsPerState summary                                                 | unit |
| 20  | `computeFlowMetadata` extracts activityPortNames                                                         | unit |
| 21  | `DIEffectExecutor` handles all effect tags correctly                                                     | unit |
| 22  | `DIEffectExecutor` resolves ports via `resolveResult` (not thrown exceptions)                            | unit |
| 23  | `DIEffectExecutor` routes `EmitEffect` through `FlowEventBus`                                            | unit |
| 24  | `DIEffectExecutor` creates child spans when `tracingHook` is provided                                    | unit |
| 25  | `FlowEventBus` decouples executor and runner                                                             | unit |
| 26  | Adapter factory registers FlowService in scope's FlowRegistry                                            | unit |
| 27  | Adapter finalizer unregisters and disposes on scope disposal                                             | unit |
| 28  | Default lifetime is `'scoped'`                                                                           | unit |
| 29  | Activity dependency validation: missing required port returns runtime error                              | unit |
| 30  | `isFlowMetadata` type guard narrows generic metadata to `FlowAdapterMetadata`                            | unit |
| 31  | Zero `as` casts in DI bridge code (verified via grep)                                                    | unit |
| 32  | `callMethod` utility performs runtime `typeof` check                                                     | unit |

### Type-Level Tests -- `integration/adapter.test-d.ts`

| #   | Test                                                                            | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | `FlowPort` is a `Port<FlowService<...>, TName>`                                 | type |
| 2   | `InferFlowServiceState` extracts state type from FlowService                    | type |
| 3   | `InferFlowServiceEvent` extracts event type from FlowService                    | type |
| 4   | `InferFlowServiceContext` extracts context type from FlowService                | type |
| 5   | `ValidateActivityRequirements` produces error for missing port                  | type |
| 6   | `AssertUniqueActivityPorts` produces error for duplicate port names             | type |
| 7   | `ValidateActivities` composes both checks                                       | type |
| 8   | `ScopeResolver.resolve` return type is inferred from port via `InferService<P>` | type |

### Mutation Testing

**Target: >90% mutation score.** The DI integration boundary involves multiple coordination points (port resolution, activity deps, event routing, metadata computation). Lower target than pure-logic modules reflects the integration complexity, but metadata validation branches and error type construction must still be well-covered.

---

## DoD 7: Runner & Interpreter (Spec Section 08)

### Unit Tests -- `runner.test.ts`

| #   | Test                                                                             | Type |
| --- | -------------------------------------------------------------------------------- | ---- |
| 1   | `transition()` returns `transitioned: true` on valid event                       | unit |
| 2   | `transition()` returns `transitioned: false` on unrecognized event               | unit |
| 3   | `transition()` returns `transitioned: false` when all guards fail                | unit |
| 4   | `transition()` evaluates guards in definition order (first passing wins)         | unit |
| 5   | `transition()` applies actions sequentially, threading context                   | unit |
| 6   | `transition()` collects effects: exit -> transition -> entry                     | unit |
| 7   | `transition()` handles self-transition (exit + entry effects fire)               | unit |
| 8   | `transition()` is a pure function (no side effects)                              | unit |
| 9   | `createMachineRunner` initializes with `machine.initial` and `machine.context`   | unit |
| 10  | `runner.send(event)` returns `Ok(effects)` on valid transition                   | unit |
| 11  | `runner.send(event)` returns `Ok([])` when no transition matches                 | unit |
| 12  | `runner.send(event)` returns `Err({ _tag: 'Disposed' })` after disposal          | unit |
| 13  | `runner.send(event)` returns `Err({ _tag: 'GuardThrew' })` on guard exception    | unit |
| 14  | `runner.send(event)` returns `Err({ _tag: 'ActionThrew' })` on action exception  | unit |
| 15  | `runner.send(event)` returns `Err({ _tag: 'QueueOverflow' })` on queue exceed    | unit |
| 16  | `runner.sendAndExecute(event)` returns `ResultAsync` and executes effects        | unit |
| 17  | `runner.sendAndExecute(event)` short-circuits on effect execution error          | unit |
| 18  | `runner.subscribe(callback)` notifies after each successful transition           | unit |
| 19  | `runner.subscribe(callback)` returns unsubscribe function                        | unit |
| 20  | Subscriber list is copied before notification (safe unsubscribe during callback) | unit |
| 21  | `runner.snapshot()` returns a frozen snapshot                                    | unit |
| 22  | `runner.dispose()` marks runner as disposed                                      | unit |
| 23  | `runner.dispose()` delegates to `ActivityManager.dispose()`                      | unit |
| 24  | `runner.dispose()` is safe to call multiple times                                | unit |
| 25  | Event queue: re-entrant send enqueues event (not processed immediately)          | unit |
| 26  | Event queue: queued events are drained after current transition                  | unit |
| 27  | Event queue: bounded by `maxQueueSize`                                           | unit |
| 28  | Event queue: `pendingEvents` exposed in snapshot                                 | unit |
| 29  | `PendingEvent` records source: `'emit'`, `'delay'`, or `'external'`              | unit |
| 30  | Microstep: exit effects fire before transition effects                           | unit |
| 31  | Microstep: transition effects fire before entry effects                          | unit |
| 32  | Runner history buffers: disabled by default (zero overhead)                      | unit |
| 33  | Runner history buffers: records transitions when enabled                         | unit |
| 34  | Runner history buffers: records effect executions when enabled                   | unit |
| 35  | Runner history buffers: circular eviction when full                              | unit |

### Type-Level Tests -- `runner.test-d.ts`

| #   | Test                                                                                                         | Type |
| --- | ------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `transition()` return type is `TransitionResult<TState, TContext>`                                           | type |
| 2   | `MachineRunner.send()` return type is `Result<readonly EffectAny[], TransitionError>`                        | type |
| 3   | `MachineRunner.sendAndExecute()` return type is `ResultAsync<void, TransitionError \| EffectExecutionError>` | type |
| 4   | `MachineRunner.dispose()` return type is `ResultAsync<void, DisposeError>`                                   | type |
| 5   | `MachineSnapshot` has typed `state`, `context`, `activities`, and `pendingEvents`                            | type |
| 6   | `EffectExecutor.execute()` returns `ResultAsync<void, EffectExecutionError>`                                 | type |

### Mutation Testing

**Target: >95% mutation score.** The interpreter is the core computation engine. Guard evaluation order, action threading, effect collection order (exit -> transition -> entry), and event queue semantics are all critical invariants. Mutations to loop direction, short-circuit logic, or queue bounds must be caught.

---

## DoD 8: Advanced States -- Phase A (Spec Section 09)

### Unit Tests -- `advanced-states.test.ts`

| #   | Test                                                                           | Type |
| --- | ------------------------------------------------------------------------------ | ---- |
| 1   | Compound state with `type: 'compound'` and nested `states`                     | unit |
| 2   | Entering a compound state automatically enters `initial` child                 | unit |
| 3   | Exiting a compound state exits the active child first (bottom-up)              | unit |
| 4   | Child state transitions target siblings within compound                        | unit |
| 5   | `onDone` transition fires when a child reaches `final` state                   | unit |
| 6   | Event bubbling: unhandled event propagates from child to parent                | unit |
| 7   | Event bubbling: first matching handler at deepest level wins                   | unit |
| 8   | Event bubbling stops at root if no match found                                 | unit |
| 9   | `#id` state reference targets state outside compound                           | unit |
| 10  | Relative target resolves within same compound state                            | unit |
| 11  | `snapshot.stateValue` returns nested object for compound states                | unit |
| 12  | `snapshot.matches('active.loading')` checks dot-path                           | unit |
| 13  | `snapshot.matches('active')` returns true when in any child of active          | unit |
| 14  | `snapshot.can(event)` includes events handled by parent compound               | unit |
| 15  | Exit/entry effect ordering for sibling transition (child-only)                 | unit |
| 16  | Exit/entry effect ordering for breaking out of compound (bottom-up exit)       | unit |
| 17  | Exit/entry effect ordering for entering compound from outside (top-down entry) | unit |
| 18  | Self-transition on compound resets to initial child                            | unit |
| 19  | Active state path computation for nested compounds                             | unit |
| 20  | StateValue computation from active state path                                  | unit |

### Type-Level Tests -- `advanced-states.test-d.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | Child targets must be siblings within the same compound         | type |
| 2   | Parent-level `on` targets must be siblings of compound          | type |
| 3   | `#id` references must resolve to existing states                | type |
| 4   | `'final'` states cannot have outgoing transitions               | type |
| 5   | `InferMachineState` produces union of all reachable state paths | type |
| 6   | `matches()` parameter constrained to valid dot-paths            | type |
| 7   | `stateValue` return type matches nested object structure        | type |

### Mutation Testing

**Target: >90% mutation score.** Compound state interpreter logic involves tree traversal (active state path, event bubbling, exit/entry ordering). Target is slightly lower than flat interpreter due to increased combinatorial complexity, but the algorithms must correctly handle depth ordering (bottom-up vs top-down) and bubbling direction.

---

## DoD 9: React Integration (Spec Section 10)

### Unit Tests -- `hooks.test.tsx`

| #   | Test                                                                   | Type |
| --- | ---------------------------------------------------------------------- | ---- |
| 1   | `useMachine` returns state, context, send, and activities              | unit |
| 2   | `useMachine` re-renders on state change                                | unit |
| 3   | `useMachine` uses `useSyncExternalStore` for concurrent mode safety    | unit |
| 4   | `useSelector` returns derived state with referential equality          | unit |
| 5   | `useSelector` only re-renders when selected value changes              | unit |
| 6   | `useSelector` accepts custom equality function                         | unit |
| 7   | `useSend` returns stable callback reference                            | unit |
| 8   | `useSend` does not re-render on transitions                            | unit |
| 9   | `useFlow` returns snapshot, send, matches, can, status                 | unit |
| 10  | `useFlow.matches('active')` checks state                               | unit |
| 11  | `useFlow.can(event)` checks valid transitions                          | unit |
| 12  | `useFlow.status` is `'active'`, `'done'`, or `'error'`                 | unit |
| 13  | `useMachineSelector` accepts full snapshot in selector                 | unit |
| 14  | `useFlowEvent` fires callback only for matching event type             | unit |
| 15  | `useFlowEvent` does not cause re-renders                               | unit |
| 16  | `useActivity` returns status and events for named activity             | unit |
| 17  | `FlowProvider` disposes runner on unmount                              | unit |
| 18  | `FlowProvider` supports Suspense for async initialization              | unit |
| 19  | Scoped flows: nested `ScopeProvider` creates isolated machine instance | unit |

### Type-Level Tests -- `hooks.test-d.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | `useMachine` return type has typed `state` and `context`        | type |
| 2   | `useSend` return type accepts machine's event union             | type |
| 3   | `useSelector` selector receives typed `MachineSnapshot`         | type |
| 4   | `useFlow` return type has typed `matches`, `can`, `status`      | type |
| 5   | `useActivity` return type has typed `ActivityStatus`            | type |
| 6   | `FlowProvider` props are typed with optional port and collector | type |

### Mutation Testing

**Target: >85% mutation score.** React hook tests involve framework integration with `useSyncExternalStore` and rendering lifecycle. Lower target reflects the difficulty of catching mutations in render-optimization logic (shallow equality, ref caching), but core functionality (subscription, state derivation, disposal) must be verified.

---

## DoD 10: Testing Utilities (Spec Section 11)

### Unit Tests -- `libs/flow/testing/tests/`

#### testMachine -- `test-machine.test.ts`

| #   | Test                                                       | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | `testMachine(machine)` creates a runner with mock executor | unit |
| 2   | `snapshot()` returns current state synchronously           | unit |
| 3   | `send(event)` delegates to `sendAndExecute`                | unit |
| 4   | `waitForState(name)` resolves when machine enters state    | unit |
| 5   | `waitForState(name, timeout)` rejects on timeout           | unit |
| 6   | `waitForEvent(type)` resolves with event payload           | unit |
| 7   | `cleanup()` disposes the runner                            | unit |
| 8   | Context override via options                               | unit |

#### testGuard -- `test-guard.test.ts`

| #   | Test                                                     | Type |
| --- | -------------------------------------------------------- | ---- |
| 9   | `testGuard(guardFn, { context, event })` returns boolean | unit |
| 10  | Guard receives correct context and event                 | unit |

#### testTransition -- `test-transition.test.ts`

| #   | Test                                                                               | Type |
| --- | ---------------------------------------------------------------------------------- | ---- |
| 11  | `testTransition(machine, state, event)` returns `Ok` with target, effects, context | unit |
| 12  | Returns `Err(GuardThrew)` on guard exception                                       | unit |
| 13  | Returns `Err(ActionThrew)` on action exception                                     | unit |
| 14  | Returns `Ok` with `transitioned: false` when no match                              | unit |

#### testEffect -- `test-effect.test.ts`

| #   | Test                                                                 | Type |
| --- | -------------------------------------------------------------------- | ---- |
| 15  | `testEffect(InvokeEffect, { mocks })` resolves port and calls method | unit |
| 16  | `testEffect(DelayEffect)` resolves immediately (no real delay)       | unit |
| 17  | `testEffect(SpawnEffect, { mocks })` creates activity via harness    | unit |
| 18  | `testEffect(EmitEffect)` returns emitted event in `Ok`               | unit |
| 19  | `testEffect(ParallelEffect)` recursively executes children           | unit |
| 20  | `testEffect(SequenceEffect)` short-circuits on first `Err`           | unit |

#### testFlowInContainer -- `test-flow-in-container.test.ts`

| #   | Test                                                 | Type |
| --- | ---------------------------------------------------- | ---- |
| 21  | Creates real container with FlowAdapter registered   | unit |
| 22  | Resolves FlowService from container scope            | unit |
| 23  | Mock adapters are registered for required ports      | unit |
| 24  | `dispose()` tears down container and scoped services | unit |

#### Snapshot -- `snapshot.test.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 25  | `serializeSnapshot` produces deterministic JSON-safe object           | unit |
| 26  | Non-deterministic fields (IDs, timestamps) replaced with placeholders | unit |
| 27  | `snapshotMachine(machine, events)` returns array of snapshots         | unit |

#### Virtual Clock -- `virtual-clock.test.ts`

| #   | Test                                             | Type |
| --- | ------------------------------------------------ | ---- |
| 28  | `createVirtualClock().advance(ms)` advances time | unit |
| 29  | `install()` replaces timer functions             | unit |
| 30  | `uninstall()` restores original timers           | unit |

### Mutation Testing

**Target: >90% mutation score.** Testing utilities are the foundation for all other tests. They must be reliable. The `testTransition` wrapper around the pure interpreter and `testEffect` mock resolution logic are particularly important to verify.

---

## DoD 11: Introspection & DevTools (Spec Section 12)

### Unit Tests -- `inspection/`

#### FlowRegistry -- `inspection/registry.test.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | `createFlowRegistry()` creates empty registry               | unit |
| 2   | `register(entry)` adds entry to registry                    | unit |
| 3   | `unregister(portName, instanceId)` removes entry            | unit |
| 4   | `getAllMachines(portName)` returns all entries for port     | unit |
| 5   | `getMachine(portName, instanceId)` returns specific entry   | unit |
| 6   | `getAllPortNames()` returns registered port names           | unit |
| 7   | `getTotalMachineCount()` returns count across all ports     | unit |
| 8   | `getMachinesByState(stateName)` filters by current state    | unit |
| 9   | Registry emits `'machine-registered'` event on register     | unit |
| 10  | Registry emits `'machine-unregistered'` event on unregister | unit |
| 11  | Registry has `scoped` lifetime (per-scope instance)         | unit |

#### FlowInspector -- `inspection/inspector.test.ts`

| #   | Test                                                                | Type |
| --- | ------------------------------------------------------------------- | ---- |
| 12  | `getMachineState` returns MachineStateSnapshot                      | unit |
| 13  | `getValidTransitions` returns valid event types from current state  | unit |
| 14  | `getRunningActivities` returns activity instances                   | unit |
| 15  | `getEventHistory` returns chronological event log                   | unit |
| 16  | `getEventHistory` supports limit and time-range filtering           | unit |
| 17  | `getStateHistory` returns ordered state path                        | unit |
| 18  | `getEffectHistory` returns effect execution records                 | unit |
| 19  | `getAllMachinesSnapshot` aggregates all machines                    | unit |
| 20  | `getMachinesByState` returns full snapshots                         | unit |
| 21  | `getHealthEvents` returns health event buffer                       | unit |
| 22  | `getEffectResultStatistics` tracks per-port ok/err rates            | unit |
| 23  | `getHighErrorRatePorts` filters by threshold                        | unit |
| 24  | History buffers use circular buffer (FIFO eviction, O(1) insertion) | unit |
| 25  | Cross-scope aggregation caching with configurable TTL               | unit |
| 26  | Cache invalidation on registry events                               | unit |

#### Tracing Hook -- `tracing/tracing-hook.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 27  | `createFlowTracingHook` creates spans for transitions                    | unit |
| 28  | Transition span name: `flow:${machineId}/${from}->${to}`                 | unit |
| 29  | Transition span attributes include machine_id, states, event_type        | unit |
| 30  | Effect child spans for Invoke: `flow:effect:invoke:${port}.${method}`    | unit |
| 31  | Effect child spans for Spawn: `flow:effect:spawn:${activityPort}`        | unit |
| 32  | Uses shared `pushSpan`/`popSpan` span stack for parent-child correlation | unit |
| 33  | `onTransitionEnd` records Result status via `recordResult`               | unit |
| 34  | `onEffectEnd` records Result status via `recordResult`                   | unit |
| 35  | Filter option excludes machines by machineId                             | unit |
| 36  | `traceEffects: false` disables effect child spans                        | unit |
| 37  | Zero-overhead when tracingHook is undefined                              | unit |

#### Health Events -- `inspection/health-events.test.ts`

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 38  | `'flow-error'` emitted when machine enters error final state | unit |
| 39  | `'flow-degraded'` emitted on repeated effect failures        | unit |
| 40  | `'flow-recovered'` emitted when machine exits error state    | unit |

### Mutation Testing

**Target: >85% mutation score.** Introspection involves diagnostic/observability code that is less critical than core state machine logic. However, the circular buffer implementation, health event emission thresholds, and tracing span naming must be verified. The lower target reflects that some diagnostic output formatting variations are acceptable.

---

## DoD 12: Advanced Patterns (Spec Section 13)

### Unit Tests -- `advanced-patterns.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `createMachineActivity` wraps child machine in a `ConfiguredActivity`       | unit |
| 2   | Child machine activity completes when child reaches final state             | unit |
| 3   | Child machine activity emits events to parent via EventSink                 | unit |
| 4   | Child machine is stopped on parent state exit (via AbortSignal)             | unit |
| 5   | `createSubscriptionActivity` wraps external event source                    | unit |
| 6   | Subscription activity routes events to machine                              | unit |
| 7   | Subscription activity respects AbortSignal cancellation                     | unit |
| 8   | `retryConfig` generates states and transitions for retry pattern            | unit |
| 9   | Retry guard `canRetry` checks retryCount against maxRetries                 | unit |
| 10  | Exponential backoff computes correct delay                                  | unit |
| 11  | `waitForAll(childIds)` guard returns true when all completed                | unit |
| 12  | `waitForAny(childIds)` guard returns true when any completed                | unit |
| 13  | `serializeMachineState` returns `Ok(SerializedMachineState)`                | unit |
| 14  | `serializeMachineState` returns `Err(NonSerializableContext)` for functions | unit |
| 15  | `serializeMachineState` returns `Err(CircularReference)` for cycles         | unit |
| 16  | `restoreMachineState` returns `Ok(MachineRunner)` for valid snapshot        | unit |
| 17  | `restoreMachineState` returns `Err(InvalidState)` for unknown state         | unit |
| 18  | `restoreMachineState` returns `Err(MachineIdMismatch)` for wrong machine    | unit |
| 19  | Restored machine skips entry effects (resumes as-is)                        | unit |
| 20  | `sendBatch(events)` processes multiple events in one pass                   | unit |
| 21  | `sendBatch` notifies subscribers only once at the end                       | unit |
| 22  | `sendBatch` short-circuits on first `Err(TransitionError)`                  | unit |

### Type-Level Tests -- `advanced-patterns.test-d.ts`

| #   | Test                                                                                 | Type |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1   | `serializeMachineState` returns `Result<SerializedMachineState, SerializationError>` | type |
| 2   | `restoreMachineState` returns `Result<MachineRunner<M>, RestoreError>`               | type |
| 3   | `sendBatch` returns `Result<readonly TransitionResult[], TransitionError>`           | type |
| 4   | `SerializationError` narrowable via `_tag`                                           | type |

### Mutation Testing

**Target: >85% mutation score.** Advanced patterns involve composition helpers and serialization logic. The serialization validation (circular references, non-serializable values) and batch processing short-circuit semantics are the most critical test targets. Actor model and subscription patterns are composed from existing primitives and benefit from lower-level testing.

---

## DoD 13: Cross-Cutting (Spec Sections 01, 14, 15)

### E2E / Integration Tests -- `e2e.test.ts`, `integration.test.ts`

| #   | Test                                                                            | Type        |
| --- | ------------------------------------------------------------------------------- | ----------- |
| 1   | Full machine lifecycle: create -> send events -> reach final state              | e2e         |
| 2   | Machine with activities: spawn activity, receive events, complete               | e2e         |
| 3   | Machine with DI integration: FlowAdapter -> container resolution -> effects     | integration |
| 4   | Machine with tracing: transitions produce FlowCollector entries                 | integration |
| 5   | Machine with error recovery: guard throws -> `Err(TransitionError)` -> continue | integration |
| 6   | Machine with multiple guarded transitions: correct path taken                   | integration |
| 7   | Machine disposal: cleanup all activities, unsubscribe all listeners             | integration |
| 8   | Multi-scope: each scope gets independent machine instance                       | integration |
| 9   | FlowService -> FlowRegistry -> FlowInspector: full query pipeline               | integration |
| 10  | Snapshot testing: `snapshotMachine` produces deterministic output               | integration |
| 11  | Activity API showcase: typed events, deps, cleanup, timeout                     | e2e         |
| 12  | Effect execution chain: invoke -> spawn -> emit -> delay                        | e2e         |
| 13  | React hooks with real FlowService (integration with @hex-di/react)              | integration |
| 14  | Metadata enrichment: FlowAdapterMetadata on graph inspection                    | integration |
| 15  | Result integration: all error types are discriminated and matchable             | integration |

### Mutation Testing

**Target: >80% mutation score.** E2E and integration tests cover the full system but are inherently less fine-grained than unit tests. The lower target reflects that integration-level mutations (e.g., swapping an internal coordination call) may not always be observable through the public API. Focus mutation testing on the boundaries between subsystems (runner ↔ executor, adapter ↔ registry).

---

## Test Count Summary

| Category                | Count    |
| ----------------------- | -------- |
| Unit tests              | ~313     |
| Type-level tests        | ~76      |
| Integration / E2E tests | ~15      |
| **Total**               | **~404** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                          | Command                                                               | Expected                                                                |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| All core tests pass            | `pnpm --filter @hex-di/flow test`                                     | 0 failures                                                              |
| All core type tests pass       | `pnpm --filter @hex-di/flow test:types`                               | 0 failures                                                              |
| All react tests pass           | `pnpm --filter @hex-di/flow-react test`                               | 0 failures                                                              |
| All testing package tests pass | `pnpm --filter @hex-di/flow-testing test`                             | 0 failures                                                              |
| Typecheck passes (core)        | `pnpm --filter @hex-di/flow typecheck`                                | 0 errors                                                                |
| Typecheck passes (react)       | `pnpm --filter @hex-di/flow-react typecheck`                          | 0 errors                                                                |
| Typecheck passes (testing)     | `pnpm --filter @hex-di/flow-testing typecheck`                        | 0 errors                                                                |
| Lint passes (core)             | `pnpm --filter @hex-di/flow lint`                                     | 0 errors                                                                |
| Lint passes (react)            | `pnpm --filter @hex-di/flow-react lint`                               | 0 errors                                                                |
| No `any` types in source       | `grep -r "any" libs/flow/core/src/`                                   | 0 matches (excluding comments and `EffectAny`/`MachineAny` brand types) |
| No type casts in source        | `grep -r " as " libs/flow/core/src/`                                  | 0 matches                                                               |
| No eslint-disable in source    | `grep -r "eslint-disable" libs/flow/core/src/`                        | 0 matches                                                               |
| Mutation score (core types)    | `pnpm --filter @hex-di/flow stryker -- --mutate src/machine/**`       | >95%                                                                    |
| Mutation score (effects)       | `pnpm --filter @hex-di/flow stryker -- --mutate src/effects/**`       | >95%                                                                    |
| Mutation score (activities)    | `pnpm --filter @hex-di/flow stryker -- --mutate src/activities/**`    | >95%                                                                    |
| Mutation score (runner)        | `pnpm --filter @hex-di/flow stryker -- --mutate src/runner/**`        | >95%                                                                    |
| Mutation score (integration)   | `pnpm --filter @hex-di/flow stryker -- --mutate src/integration/**`   | >90%                                                                    |
| Mutation score (inspection)    | `pnpm --filter @hex-di/flow stryker -- --mutate src/inspection/**`    | >85%                                                                    |
| Mutation score (tracing)       | `pnpm --filter @hex-di/flow stryker -- --mutate src/tracing/**`       | >85%                                                                    |
| Mutation score (serialization) | `pnpm --filter @hex-di/flow stryker -- --mutate src/serialization/**` | >85%                                                                    |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/flow

State machines have critical invariants that standard code coverage cannot verify:

- **Guard evaluation order** -- mutating the loop direction (first-to-last vs last-to-first) would silently change which transition is taken when multiple guards match
- **Effect collection order** -- mutating exit/transition/entry ordering would cause effects to fire in the wrong sequence, breaking state machine semantics
- **Event queue semantics** -- mutating FIFO to LIFO would change event processing order, potentially causing infinite loops or missed events
- **Short-circuit behavior** -- removing `return` after a matching guard would cause multiple transitions to fire, breaking determinism
- **Activity lifecycle** -- mutating the `cleanupCalled` guard would cause double cleanup, the timeout priority would change failure modes, and status transitions could be skipped
- **Error type discrimination** -- swapping `_tag` values between error variants would cause incorrect pattern matching in consumer code

Mutation testing catches these subtle behavioral inversions that line/branch coverage cannot.

### Mutation Targets by Priority

| Priority | Module                                              | Target Score | Rationale                                                                                    |
| -------- | --------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| Critical | Machine types & factories (`machine/`)              | >95%         | Foundation of everything. Wrong brand, freeze, or normalization = corrupted machine.         |
| Critical | Effect constructors (`effects/`)                    | >95%         | Effect `_tag` discrimination is the runtime dispatch mechanism. Wrong tag = wrong execution. |
| Critical | Activity system (`activities/`)                     | >95%         | Lifecycle state machine, cleanup guarantees, timeout hierarchy are safety-critical.          |
| Critical | Runner & interpreter (`runner/`)                    | >95%         | Pure transition logic, event queue, effect ordering. Core correctness invariants.            |
| High     | DI integration (`integration/`)                     | >90%         | Port resolution, adapter validation, metadata computation. Integration boundary.             |
| High     | Testing utilities (`flow-testing/`)                 | >90%         | Foundation for all other tests. Unreliable test utils = unreliable test suite.               |
| Medium   | Introspection & tracing (`inspection/`, `tracing/`) | >85%         | Diagnostic code. Lower criticality but circular buffers and health thresholds must work.     |
| Medium   | React hooks (`flow-react/`)                         | >85%         | Framework integration. Render optimization mutations are harder to catch.                    |
| Medium   | Advanced patterns (`serialization/`)                | >85%         | Serialization validation and batch processing. Composed from lower-level primitives.         |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` -> `!==`, `>` -> `>=` (catches guard logic, timeout comparisons, queue bounds)
- **Return value mutations**: `return Ok(x)` -> `return Err(x)` (catches Result variant confusion across the entire system)
- **Block removal**: Removing `if (this.isErr()) return this` (catches short-circuit removal in interpreter and executor)
- **Method call mutations**: `exit.effects` -> `entry.effects` (catches effect ordering inversion)
- **String literal mutations**: `'Invoke'` -> `'Spawn'` in `_tag` (catches effect type confusion)
- **Array order mutations**: Reversing iteration direction (catches guard evaluation order, effect collection order)
- **Boolean mutations**: `true` -> `false` for `cleanupCalled`, `isDisposed`, `transitioned` flags

### Stryker Configuration

```json
{
  "mutate": ["libs/flow/core/src/**/*.ts", "!libs/flow/core/src/**/*.test.ts"],
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

Thresholds are set higher than the graph package's `(80/70/70)` because state machine correctness is more critical -- an incorrect transition or effect ordering can cause cascading application failures that are difficult to diagnose.

---

_Previous: [15 - Appendices](./15-appendices.md)_

_End of Definition of Done_
