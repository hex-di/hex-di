# Specification: Effect System

## Goal

Define the complete effect system for HexDI Flow -- the core differentiator that makes state machine transitions pure and testable by representing all side effects as immutable data descriptors resolved through the DI container at execution time.

## User Stories

- As a developer, I want transitions to return effect descriptors instead of executing side effects so that I can test my state machine logic without mocking services.
- As a developer, I want effects to resolve ports through DI so that my state machine integrates with the same dependency graph as the rest of my application.

## Specific Requirements

**Effect Descriptor Philosophy**

- Effects are frozen, plain objects discriminated by a `_tag` string literal
- The transition function (`interpreter.transition()`) is pure -- it returns a `TransitionResult` containing effects but never executes them
- The runner's `send()` method returns `Result<effects, TransitionError>` without executing; `sendAndExecute()` delegates to the `EffectExecutor` and returns `ResultAsync`
- This separation enables: snapshot testing of transitions, custom execution strategies, effect inspection middleware, and dry-run mode

**Effect.invoke(port, method, args) -- Port Invocation**

- Resolves `port` from the DI scope, calls `service[method](...args)` at execution time
- `InvokeEffect` carries a phantom `__resultType` for downstream type inference without runtime cost
- Success result produces a `done.invoke.<portName>` event routed back to the machine
- Failure produces an `error.invoke.<portName>` event with a typed `EffectExecutionError` payload (see "Typed Error Event Payloads" below)
- The executor must await the method result if it returns a `Promise`
- Method name and args are fully type-checked against the port's service interface at the call site

**Effect.spawn(activityId, input) -- Spawn Long-Running Activity**

- Looks up the `ConfiguredActivity` from the `ActivityRegistry` by port name
- Calls `activityManager.spawn(activity, input, eventSink, deps)` which starts the activity in the background
- The spawned activity receives an `ActivityContext` with resolved deps, a typed `EventSink`, and an `AbortSignal`
- Activities can emit events back to the machine during execution via `sink.emit()`
- Spawn is fire-and-forget from the machine's perspective; the machine continues processing events
- The `MachineSnapshot.activities` array tracks all spawned instances with their status

**Effect.stop(activityId) -- Stop Activity**

- Triggers the `AbortSignal` on the identified activity via `activityManager.stop(id)`
- The activity's cleanup function runs with `reason: 'cancelled'`
- Stopping an already-completed or non-existent activity is a no-op (no error)

**Effect.emit(event) -- Self-Emit Event**

- Routes the event object back into the machine via the `EventSink`
- The event is processed in the next microtick, not synchronously during the current transition
- Useful for effect-driven event chains (e.g., an entry effect emits a follow-up event)

**Effect.delay(ms, event) -- Delayed Event Emission**

- Waits `ms` milliseconds then emits `event` to the machine
- Internally implemented as `setTimeout` + `EventSink.emit`
- Must be cancellable: if the machine exits the state that created the delay before it fires, the timer is cleared
- The current `DelayEffect` only has `milliseconds`; extend it to also carry an `event` payload for the auto-emit pattern
- When no `event` is provided, the delay is a pure wait (existing behavior preserved)

**Effect.choose(branches) -- Conditional Effects (NEW)**

- Evaluates guard predicates and executes the effects of the first matching branch
- Each branch: `{ guard?: (ctx, event) => boolean, effects: EffectAny[] }`
- If no branch matches, no effects are executed (implicit no-op fallback)
- Type: `ChooseEffect` with `_tag: 'Choose'` and `branches: ReadonlyArray<{ guard?: GuardFn, effects: ReadonlyArray<EffectAny> }>`
- The executor evaluates guards using the current context/event and delegates to `execute()` for matched effects

**Effect.log(message) -- Structured Logging (NEW)**

- Emits a structured log entry through the tracing/instrumentation pipeline
- `message` can be a string or `(ctx, event) => string` for dynamic messages
- Integrates with the existing `@hex-di/tracing` span system
- Type: `LogEffect` with `_tag: 'Log'` and `message: string | ((ctx: unknown, event: EventAny) => string)`

**Effect Execution Order**

- On a state transition, effects are collected and executed in this order: (1) exit effects of current state, (2) transition effects, (3) entry effects of target state
- Within each group, effects execute in array order (left to right)
- `Effect.parallel([...])` executes its children concurrently via `ResultAsync.all`; returns `Err(ParallelErrors)` on failure (see "Effect Error Handling" below)
- `Effect.sequence([...])` executes its children one-by-one via `ResultAsync.andThen` chain; returns `Err(SequenceAborted)` on first failure

**Effect Cancellation**

- When the machine exits a state, all pending effects created by that state's entry effects must be cancelled
- `DelayEffect` timers are cleared via `clearTimeout`
- `SpawnEffect` activities are stopped via `AbortSignal`
- `InvokeEffect` results arriving after the state has exited are discarded (stale result guard)
- The runner maintains a `pendingEffects` set keyed by state name; on exit, all pending entries for that state are cancelled

**Flow Error Types (Result Integration)**

All error types across the Flow system use tagged unions with a `_tag` discriminant, following the Result spec §49 convention. These types replace thrown exceptions and `unknown` error payloads throughout the Flow system.

```typescript
type EffectExecutionError =
  | {
      readonly _tag: "InvokeError";
      readonly portName: string;
      readonly method: string;
      readonly cause: unknown;
    }
  | { readonly _tag: "SpawnError"; readonly activityPortName: string; readonly cause: unknown }
  | { readonly _tag: "StopError"; readonly activityId: string; readonly cause: unknown }
  | {
      readonly _tag: "ResolutionError";
      readonly portName: string;
      readonly resolution: ResolutionError;
    }
  | {
      readonly _tag: "SequenceAborted";
      readonly failedIndex: number;
      readonly cause: EffectExecutionError;
    }
  | { readonly _tag: "ParallelErrors"; readonly errors: readonly EffectExecutionError[] };

type TransitionError =
  | {
      readonly _tag: "GuardThrew";
      readonly guardName?: string;
      readonly state: string;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "ActionThrew";
      readonly actionIndex: number;
      readonly state: string;
      readonly cause: unknown;
    }
  | { readonly _tag: "Disposed" }
  | { readonly _tag: "QueueOverflow"; readonly queueSize: number; readonly maxQueueSize: number };

type FlowAdapterError =
  | {
      readonly _tag: "MetadataInvalid";
      readonly reason: "NoStates" | "InvalidInitialState" | "EmptyMachineId";
      readonly detail: string;
    }
  | { readonly _tag: "DuplicateActivityPort"; readonly portName: string }
  | { readonly _tag: "ActivityNotFrozen"; readonly portName: string };
```

- `EffectExecutionError` is used by `EffectExecutor.execute()` and `sendAndExecute()` (spec 08)
- `TransitionError` is used by `send()` and the interpreter (spec 08)
- `FlowAdapterError` is used by `createFlowAdapter()` and `computeFlowMetadata()` (spec 07)
- Cross-reference: `ResolutionError` type from `@hex-di/result` (spec/result/12-hexdi-integration.md §53)
- All error types are exported from `@hex-di/flow`

**Effect Error Handling (Result Integration)**

Effect execution returns `Result` and `ResultAsync` types instead of throwing exceptions or rejecting promises:

- `EffectExecutor.execute()` returns `ResultAsync<void, EffectExecutionError>` instead of `Promise<void>`
- `InvokeEffect` failures: the executor uses `resolveResult(scope, port)` (spec/result §53) then `fromThrowable` for the method call, producing `Result<unknown, EffectExecutionError>`. On `Err`, an `error.invoke.<portName>` event is sent to the machine with the **typed** error as payload
- `SpawnEffect` failures: activity execution errors produce `Err({ _tag: 'SpawnError', ... })`, which routes an `error.activity.<id>` event with the typed error
- `Effect.sequence`: returns `Err({ _tag: 'SequenceAborted', failedIndex, cause })` on first failure
- `Effect.parallel`: in fail-fast mode returns first `Err`; in collect-all mode returns `Err({ _tag: 'ParallelErrors', errors })` using `ResultAsync.allSettled()` from spec/result §36
- The `EffectExecutor.onError` hook receives `EffectExecutionError` (typed) instead of `unknown`
- If no machine transition handles an error event, the error is still logged via tracing and the machine stays in its current state (existing behavior preserved)

**Typed Error Event Payloads**

Error events emitted by the effect executor carry typed payloads narrowable via `_tag`:

- `error.invoke.<portName>` events carry `EffectExecutionError` as payload (narrowable via `_tag`)
- `error.activity.<activityId>` events carry `EffectExecutionError` as payload (specifically `SpawnError` variant)
- Machine guards can discriminate error types:
  ```typescript
  on: {
    'error.invoke.PaymentPort': [
      { guard: (ctx, e) => e.payload._tag === 'ResolutionError', target: 'misconfig' },
      { guard: (ctx, e) => e.payload._tag === 'InvokeError', target: 'retryPayment' },
      { target: 'failed' }
    ]
  }
  ```
- This replaces the previous untyped `unknown` payloads on error events

**Custom Effect Types via Ports**

- Developers can define new `_tag` values and register custom executors
- The `EffectExecutor` accepts a `customExecutors: Map<string, (effect: EffectAny) => ResultAsync<void, EffectExecutionError>>` option
- Custom effects must extend `BaseEffect<TTag>` and register their `_tag` in the `EffectAny` union
- This enables domain-specific effects (e.g., `Effect.toast(message)`, `Effect.navigate(route)`) without modifying core

## Visual Design

No visual mockups provided.

## Existing Code to Leverage

**`libs/flow/core/src/effects/types.ts` -- Effect type definitions**

- Defines `BaseEffect<TKind>`, `InvokeEffect`, `SpawnEffect`, `StopEffect`, `EmitEffect`, `DelayEffect`, `ParallelEffect`, `SequenceEffect`, `NoneEffect`
- `EffectAny` discriminated union on `_tag` must be extended with new tags: `'Choose'`, `'Log'`
- `MethodNames`, `MethodParams`, `MethodReturn` utility types already handle port service type extraction

**`libs/flow/core/src/effects/constructors.ts` -- Effect namespace**

- The `Effect` const object exports all constructor functions (`invoke`, `spawn`, `stop`, `emit`, `delay`, `parallel`, `sequence`, `none`)
- Add `choose` and `log` constructors following the same frozen-object pattern
- All constructors return `Object.freeze(...)` for runtime immutability

**`libs/flow/core/src/integration/di-executor.ts` -- DIEffectExecutor**

- Handles all current effect types via a `switch` on `effect._tag`
- `executeInvoke` resolves the port from `ScopeResolver`, calls the method, and awaits promises
- Add cases for `'Choose'` and `'Log'` in the switch

**`libs/flow/core/src/runner/interpreter.ts` -- collectEffects()**

- Collects effects in exit -> transition -> entry order
- This function is the authoritative source for effect ordering; no changes needed to the ordering logic itself
- The interpreter never executes effects, only collects them as data

**`libs/flow/core/src/activities/manager.ts` -- ActivityManager**

- Manages spawning, stopping, and tracking activities with `AbortController` per instance
- The `spawn` method creates an `ActivityInstance` and starts execution; integrate with new `Effect.spawn` semantics
- `dispose()` stops all running activities -- already used by the runner's `dispose()` method

## Out of Scope

- Effect persistence / replay (event sourcing of effects)
- Effect batching optimizations (grouping multiple invoke calls into a single network request)
- Effect middleware / interceptor pipeline (beyond the custom executor extension point)
- Effect visualization in a UI debugger (belongs in a DevTools spec)
- Automatic retry logic for failed effects (users should model retries as state transitions)
- Effect timeouts at the individual effect level (activity timeouts exist; invoke timeouts do not)
- Transaction semantics across multiple effects (no rollback/compensation)
- Effect deduplication (same invoke called twice runs twice)
- Server-side rendering considerations for effects
- Effect priority scheduling (effects run in collection order, period)
