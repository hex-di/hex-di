# 08 - Runner & Interpreter

---

## 10. Runner & Interpreter

### 10.1 Architecture

The runner system uses a **two-layer design** that separates pure state computation from side effect execution:

```
                     +-----------------------+
                     |    MachineRunner      |
                     |  (orchestration layer)|
                     +----------+------------+
                                |
            send(event)         |         sendAndExecute(event)
         (pure, sync)          |         (impure, async)
                |               |               |
                v               |               v
   +------------------------+  |  +------------------------+
   |    Pure Interpreter     |  |  |    Effect Executor     |
   |  transition(state,     |  |  |  execute(effect)       |
   |    context, event,     |  |  |                        |
   |    machine)            |  |  |  Resolves ports via DI |
   +----------+-------------+  |  +----------+-------------+
              |                 |             |
              v                 |             v
   +------------------------+  |  +------------------------+
   |   TransitionResult     |  |  |    Side Effects        |
   |  - newState            |  |  |  - Port invocations    |
   |  - newContext          |  |  |  - Activity spawn/stop |
   |  - effects[]           |  |  |  - Event emissions     |
   |  - transitioned        |  |  |  - Delays              |
   +------------------------+  |  +------------------------+
                                |
                     +----------+------------+
                     |   Subscriptions       |
                     |  notify(snapshot)     |
                     +-----------------------+
```

- The **pure interpreter** computes transitions without side effects -- it evaluates guards, selects the matching transition, applies actions to derive new context, and collects effects in order
- The **effect executor** takes the effect descriptors produced by the interpreter and performs the actual side effects (port resolution, activity management, delays, event emission)
- The **runner** orchestrates both layers, manages subscriptions, tracks disposal state, and provides the public API

### 10.2 Pure Interpreter

The `transition` function is the core pure computation of the state machine:

```typescript
function transition<TState extends string, TContext>(
  currentState: TState,
  currentContext: TContext,
  event: { readonly type: string },
  machine: MachineAny
): TransitionResult<TState, TContext>;

interface TransitionResult<TState extends string, TContext> {
  readonly newState: TState | undefined;
  readonly newContext: TContext | undefined;
  readonly effects: readonly EffectAny[];
  readonly transitioned: boolean;
}
```

Interpreter algorithm:

```
  receive event
       |
       v
  +------------------+
  | Look up current  |
  | state node from  |
  | machine.states   |
  +--------+---------+
           |
           v
  +------------------+
  | Find transitions |  event.type --> stateNode.on[event.type]
  | for event type   |
  +--------+---------+
           |
      found?
      /    \
    NO      YES
    |        |
    v        v
  return   +------------------+
  {        | Normalize to     |
  trans-   | array of         |
  itioned  | TransitionConfig |
  false    +--------+---------+
  }                 |
                    v
           +------------------+
           | Evaluate guards  |  in definition order
           | find first match |  (no guard = always match)
           +--------+---------+
                    |
               found?
               /    \
             NO      YES
             |        |
             v        v
           return   +------------------+
           {        | Apply actions    |  thread context through
           trans-   | in array order   |  action1 -> action2 -> ...
           itioned  +--------+---------+
           false               |
           }                   v
                    +------------------+
                    | Collect effects  |
                    | 1. exit effects  |  currentState.exit
                    | 2. transition fx |  transition.effects
                    | 3. entry effects |  targetState.entry
                    +--------+---------+
                             |
                             v
                    return {
                      newState: targetState,
                      newContext: result,
                      effects: [...],
                      transitioned: true
                    }
```

- Pure function with zero side effects -- safe to call in tests without mocking
- Guards are synchronous predicates evaluated in definition order; the first to return `true` wins
- Actions are pure context transformers `(context, event) => newContext`, applied sequentially
- Effects are collected as data descriptors, not executed
- When no valid transition exists (no matching event key, or all guards fail), returns `transitioned: false` with `undefined` for newState and newContext

### 10.3 MachineRunner

The runner provides the public API for interacting with a running state machine:

```typescript
interface MachineRunner<TState, TEvent, TContext> {
  snapshot(): MachineSnapshot<TState, TContext>;
  state(): TState;
  context(): TContext;
  send(event: TEvent): Result<readonly EffectAny[], TransitionError>;
  sendAndExecute(event: TEvent): ResultAsync<void, TransitionError | EffectExecutionError>;
  subscribe(callback: (snapshot: MachineSnapshot<TState, TContext>) => void): () => void;
  getActivityStatus(id: string): ActivityStatus | undefined;
  dispose(): ResultAsync<void, DisposeError>;
  readonly isDisposed: boolean;
}
```

Where `DisposeError` is defined as:

```typescript
type DisposeError = {
  readonly _tag: "ActivityCleanupFailed";
  readonly failures: readonly { activityId: string; cause: unknown }[];
};
```

Cross-reference: `Result<T, E>` and `ResultAsync<T, E>` from spec/result §2 and §40. `TransitionError` and `EffectExecutionError` from spec 05.

- **`send(event)`** -- performs a pure transition via the interpreter, updates internal state and context, notifies subscribers, and returns `Ok(effects)` with the effect descriptors without executing them. Returns `Err({ _tag: 'Disposed' })` if disposed (explicit, not silent). Returns `Err({ _tag: 'QueueOverflow', ... })` instead of throwing `FlowError` when the event queue exceeds `maxQueueSize`. Returns `Err({ _tag: 'GuardThrew', ... })` or `Err({ _tag: 'ActionThrew', ... })` instead of propagating thrown exceptions from guards or actions. Returns `Ok([])` when no valid transition exists.
- **`sendAndExecute(event)`** -- delegates to `send()`, then executes each returned effect sequentially via the executor. Returns `ResultAsync<void, TransitionError | EffectExecutionError>` where the error union accumulates through the `andThen` chain (spec/result §23).
- **`subscribe(callback)`** -- registers a listener notified after each successful transition with a new snapshot; returns an unsubscribe function; callbacks are invoked synchronously and only on transitions (not for the initial state)
- **`snapshot()`** -- creates an immutable (`Object.freeze`) snapshot of current state, context, and activities
- **`dispose()`** -- marks runner as disposed, delegates to `ActivityManager.dispose()` to stop all running activities; returns `ResultAsync<void, DisposeError>`. Safe to call multiple times (subsequent calls return `Ok(undefined)`). If any activity cleanup fails, returns `Err({ _tag: 'ActivityCleanupFailed', failures })` with the list of failing activities.

### 10.4 MachineSnapshot

The snapshot is an immutable view of the machine at a point in time:

```typescript
interface MachineSnapshot<TState extends string, TContext> {
  readonly state: TState;
  readonly context: TContext;
  readonly activities: readonly ActivityInstance[];
  readonly pendingEvents: readonly PendingEvent[];
}

interface PendingEvent {
  readonly type: string;
  readonly payload?: unknown;
  readonly source: "emit" | "delay" | "external";
  readonly enqueuedAt: number;
}
```

- Created via `Object.freeze` on each `snapshot()` call
- Contains current state name, context value, all tracked activity instances, and all pending events in the queue
- `pendingEvents` exposes the internal event queue contents for introspection -- this fulfills the VISION's requirement that Flow knows "event queue contents"
- Each `PendingEvent` records the event type, optional payload, the source that enqueued it (`'emit'` for EmitEffect, `'delay'` for DelayEffect timers, `'external'` for events queued via `send()` during a transition), and the timestamp when it was enqueued
- `pendingEvents` is empty (`[]`) when the machine is idle (no transition in progress and no delayed events pending)
- Each transition produces a new snapshot; snapshots are never mutated
- Suitable for use with React's `useSyncExternalStore` via the subscribe/snapshot pattern

### 10.5 EffectExecutor

The executor interface bridges effect descriptors to actual side effects:

```typescript
interface EffectExecutor {
  execute(effect: EffectAny): ResultAsync<void, EffectExecutionError>;
}
```

The **basic executor** (`createBasicExecutor`) handles only structural and timing effects:

```
  effect._tag
       |
       +---> "Delay"     -->  setTimeout(ms)
       +---> "None"      -->  no-op
       +---> "Parallel"  -->  Promise.all(effects.map(execute))
       +---> "Sequence"  -->  for-of await execute(effect)
       +---> "Invoke"    -->  no-op (requires DI executor)
       +---> "Spawn"     -->  no-op (requires DI executor)
       +---> "Stop"      -->  no-op (requires DI executor)
       +---> "Emit"      -->  no-op (requires DI executor)
```

The **DI executor** (in the integration module) handles all effect types:

- `Invoke` -- resolves the port from the container, calls the specified method with arguments
- `Spawn` -- creates an `AbortController`, spawns the activity via `ActivityManager`, wires up the event sink
- `Stop` -- triggers the `AbortSignal` for the specified activity
- `Emit` -- routes the event back to the runner via `send()` or `sendAndExecute()`
- Delegates `Delay`, `None`, `Parallel`, `Sequence` to the basic executor

### 10.6 Event Queue

Events are processed **synchronously and sequentially**. The runner maintains an internal event queue to handle events that arrive during a transition (re-entrant sends):

```
  runner.send(EVENT_A)    --> transition starts, state updated
    ├── subscriber callback calls send(EVENT_B)
    │   └── EVENT_B is enqueued (not processed immediately)
    ├── subscriber notifications complete
    └── EVENT_B is dequeued and processed
```

- `send()` is synchronous -- it calls the pure interpreter and updates state immediately
- `sendAndExecute()` is async -- it calls `send()` synchronously, then awaits effect execution
- When `send()` is called during an active transition (re-entrant), the event is enqueued in a FIFO queue rather than processed immediately. The queue is drained after the current transition completes.
- Effects emitting events back to the runner (via `Emit` effect) enqueue events with source `'emit'`; `DelayEffect` timers enqueue with source `'delay'`; re-entrant `send()` calls enqueue with source `'external'`
- The internal queue is exposed via `MachineSnapshot.pendingEvents` for introspection. This fulfills the VISION's requirement that Flow knows "event queue contents" at all times
- The queue is bounded by a configurable `maxQueueSize` (default: 1000) to prevent unbounded growth from runaway emit chains. Exceeding the limit causes `send()` to return `Err({ _tag: 'QueueOverflow', queueSize, maxQueueSize })`
- When the machine is idle (no transition in progress), `send()` processes the event immediately without queuing

### 10.7 Microstep Semantics

A single transition follows a strict three-phase ordering for effects:

```
  Current State: A          Target State: B
       |                         |
       v                         v
  +---------+             +---------+
  | State A |             | State B |
  | exit:   |             | entry:  |
  | [e1,e2] |             | [e4,e5] |
  +---------+             +---------+
       |                       ^
       |    Transition A->B    |
       |    effects: [e3]      |
       |                       |
       v                       |
  Effect execution order:
  1. e1  (exit A)
  2. e2  (exit A)
  3. e3  (transition effect)
  4. e4  (entry B)
  5. e5  (entry B)
```

- **Phase 1: Exit** -- all exit effects from the source state, in array order
- **Phase 2: Transition** -- all effects declared on the transition config, in array order
- **Phase 3: Entry** -- all entry effects of the target state, in array order
- Context actions are applied **before** effect collection (actions update context; effects are pure data)
- Self-transitions (target === current state) still execute exit then entry effects

### 10.8 Error Handling (Result-Based)

```
  sendAndExecute(event)
       |
       v
  send(event) --> Result<effects[], TransitionError>
       |
       +---> Err(TransitionError)  --> return Err immediately
       |                                state is NOT updated
       |
       +---> Ok(effects[])
       |       |
       |       v
       |     execute effects sequentially via ResultAsync.andThen chain
       |       |
       |       +---> effect 1: Ok(void)
       |       +---> effect 2: Err(EffectExecutionError)
       |       |         |
       |       |         v
       |       |     ResultAsync chain short-circuits
       |       |     Remaining effects (3, 4, ...) are NOT executed
       |       |     Return Err(EffectExecutionError)
       |       |
       |       v
       |     State has already been updated by send() before effects run
       |     (transition is committed even if effect execution fails)
       |
       v
  Caller receives ResultAsync<void, TransitionError | EffectExecutionError>
  Pattern-match via result.match() or switch(result.error._tag)
```

- **Interpreter errors** -- if a guard or action function throws, `send()` catches it and returns `Err({ _tag: 'GuardThrew', ... })` or `Err({ _tag: 'ActionThrew', ... })`; state is NOT updated. The caller pattern-matches via `result.match()` or `switch(result.error._tag)`.
- **Effect execution errors** -- `sendAndExecute()` returns `ResultAsync<void, TransitionError | EffectExecutionError>`. The error union accumulates through the `andThen` chain (spec/result §23). State transition is already committed (state/context updated by `send()` before effects run).
- **Disposed runner** -- `send()` returns `Err({ _tag: 'Disposed' })` — explicit, not silent.
- **Queue overflow** -- `send()` returns `Err({ _tag: 'QueueOverflow', queueSize, maxQueueSize })` instead of throwing a `FlowError`.
- **Activity errors** -- unchanged — communicated via EventSink with typed error payloads (spec 05 "Typed Error Event Payloads").

---

### 10.9 Runner Creation

The `createMachineRunner` factory wires together the interpreter, executor, activity manager, and optional tracing collector:

```typescript
interface MachineRunnerOptions {
  readonly executor: EffectExecutor;
  readonly activityManager: ActivityManager;
  readonly collector?: { collect(event: unknown): void };
}
// Note: @hex-di/result is a peer/workspace dependency of @hex-di/flow

function createMachineRunner<TStateNames, TEventNames, TContext>(
  machine: Machine<TStateNames, TEventNames, TContext>,
  options: MachineRunnerOptions
): MachineRunner<TStateNames, { readonly type: TEventNames }, TContext>;
```

- The runner initializes with `machine.initial` as the current state and `machine.context` as the current context
- The optional `collector` records transition events (machine ID, previous state, event, next state, effects, timestamp) for DevTools integration
- Subscriptions use a `Set` internally for efficient add/remove/iteration; unsubscribing during a callback is safe because the subscriber list is copied before notification

### 10.10 Runner History Buffers

Runner-level diagnostic history captures transition and effect execution records directly within the `MachineRunner`, independent of the `FlowMemoryCollector` (spec 12) which serves the `FlowInspector`. These buffers are opt-in and incur zero overhead when disabled.

**RunnerHistoryConfig:**

```typescript
interface RunnerHistoryConfig {
  readonly transitionHistorySize?: number; // default: 500
  readonly effectExecutionHistorySize?: number; // default: 1,000
  readonly enableHistory?: boolean; // default: false (zero overhead when off)
}
```

- Add `history?: RunnerHistoryConfig` to the existing `MachineRunnerOptions` interface (alongside `executor`, `activityManager`, `collector`)
- When `enableHistory` is `false` (the default), no buffers are allocated and no recording occurs -- zero memory and CPU overhead
- When `enableHistory` is `true`, both circular buffers are pre-allocated at their configured sizes

**Transition History Buffer** -- circular buffer of `TransitionHistoryEntry`:

```typescript
interface TransitionHistoryEntry {
  readonly fromState: string;
  readonly toState: string;
  readonly eventType: string;
  readonly timestamp: number;
  readonly effectCount: number;
}
```

- Written after each successful `send()` call that produces `transitioned: true`
- Uses the same circular buffer data structure as `MemoryTracer` (pre-allocated array, head/tail/size pointers, FIFO eviction)
- Default capacity: 500 entries

**Effect Execution History Buffer** -- circular buffer of `EffectExecutionEntry`:

```typescript
interface EffectExecutionEntry {
  readonly effectTag: string;
  readonly portName?: string;
  readonly method?: string;
  readonly timestamp: number;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: EffectExecutionError;
}
```

- Written after each effect execution in `sendAndExecute()`, recording the outcome of every individual effect
- The `error` field carries the full tagged `EffectExecutionError` object (instead of a plain string message), enabling structured queries on error type via `_tag` discrimination
- For `Invoke` effects, `portName` and `method` are populated; for other effect types, these fields are `undefined`
- Default capacity: 1,000 entries

**Memory budget:** At default sizes, each runner with history enabled allocates approximately ~160KB (500 transition entries × ~80 bytes + 1,000 effect entries × ~120 bytes).

**Access API** (optional methods on `MachineRunner`, only present when `enableHistory` is `true`):

- `getTransitionHistory(): readonly TransitionHistoryEntry[]` -- returns the buffer contents in chronological order (oldest first)
- `getEffectExecutionHistory(): readonly EffectExecutionEntry[]` -- returns the buffer contents in chronological order (oldest first)

**Relationship to FlowInspector (spec 12):** These runner-level buffers are per-runner diagnostics useful for debugging individual machine instances. The `FlowMemoryCollector` and `FlowInspector` operate at a higher level, aggregating events across all machines in a scope for cross-machine queries and DevTools integration. The two systems are complementary and do not share storage.
