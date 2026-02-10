# 4. Core Concepts

This section defines the fundamental building blocks of HexDI Flow. Every concept is a typed, immutable data structure. The runtime (runner) interprets these structures -- the concepts themselves carry no behavior.

---

## 4.1 Machine

The **Machine** is the top-level definition of a state machine. It is a frozen, branded data structure that describes all possible states, events, context shape, and transitions. A Machine is purely declarative -- it does not execute anything on its own.

```typescript
type Machine<TStateNames extends string, TEventNames extends string, TContext> = {
  readonly [MachineBrandSymbol]: [TStateNames, TEventNames, TContext];
  readonly id: string;
  readonly initial: TStateNames;
  readonly states: { readonly [S in TStateNames]: StateNode<TStateNames, TEventNames, TContext> };
  readonly context: TContext;
};
```

Key properties:

- **`id`** -- A unique string identifier used for tracing, DevTools, and child machine disambiguation.
- **`initial`** -- Must be one of the keys in `states`. Compile-time enforced.
- **`states`** -- A complete record mapping every state name to its `StateNode` configuration.
- **`context`** -- The initial value for the machine's extended state data.

The brand symbol (`MachineBrandSymbol`) enables nominal typing: two machines with identical structure but different generic parameters are type-incompatible.

A Machine is created via `defineMachine()` and is deeply frozen at runtime.

---

## 4.2 State

A **State** (also called a state node) is a discrete mode of the machine. At any point in time the machine is in exactly one state. Each state declares:

- **Entry effects** -- Effect descriptors executed when the machine enters this state.
- **Exit effects** -- Effect descriptors executed when the machine leaves this state.
- **Transitions** -- A mapping from event names to `TransitionConfig` objects that define how the machine responds to events while in this state.

```typescript
interface StateNode<TAllStates extends string, TAllEventNames extends string, TContext> {
  readonly entry?: readonly EffectAny[];
  readonly exit?: readonly EffectAny[];
  readonly on: {
    readonly [K in TAllEventNames]?: TransitionConfigOrArray<TAllStates, K, TContext>;
  };
}
```

A state with an empty `on: {}` record is a **final state** -- the machine will not transition away from it unless explicitly extended.

States can optionally declare a `type: 'final'` property to make finality semantically explicit in the improved API.

---

## 4.3 Event

An **Event** is a typed signal sent to the machine to trigger transitions. Events are discriminated unions keyed by a `type` string property, optionally carrying a typed payload.

```typescript
type Event<TName extends string, TPayload = void> = {
  readonly [EventBrandSymbol]: [TName, TPayload];
  readonly type: TName;
} & (TPayload extends void ? {} : { readonly payload: TPayload });
```

Examples:

```typescript
// Event without payload
type ResetEvent = Event<"RESET">;
// Runtime shape: { type: 'RESET' }

// Event with payload
type SubmitEvent = Event<"SUBMIT", { formId: string; data: Record<string, string> }>;
// Runtime shape: { type: 'SUBMIT', payload: { formId: '...', data: {...} } }
```

Events are created via the `event()` curried factory function, which returns a frozen, branded value. The `EventBrandSymbol` prevents structural confusion between events that happen to share the same shape.

Within a machine definition, event names appear as keys in the `on` record of each state. The machine's full event name union is inferred automatically from all `on` keys across all states.

---

## 4.4 Context

**Context** is the extended state data that persists across transitions. It represents the mutable aspect of machine state -- information that cannot be expressed by the finite set of state names alone (counters, loaded data, error messages, etc.).

```typescript
const machine = defineMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0, lastAction: '' },
  states: { ... },
});
// Inferred context type: { count: number; lastAction: string }
```

Key rules:

- Context is typed via generics and inferred from the `context` property of the machine config.
- Context is immutable at the type level via `DeepReadonly<TContext>` when exposed through snapshots.
- Context is updated exclusively through **actions** on transitions. Actions receive the current context and triggering event, and return a new context value.
- Context must never be mutated directly -- always produce a new object.

---

## 4.5 Transition

A **Transition** is a declarative rule: "While in state X, when event Y occurs (and if guard Z passes), move to state W and execute these actions/effects."

```typescript
interface TransitionConfig<
  TAllStates extends string,
  TTarget extends TAllStates,
  TEvent extends EventAny,
  TContext,
> {
  readonly target: TTarget;
  readonly guard?: (context: TContext, event: TEvent) => boolean;
  readonly actions?: readonly ((context: TContext, event: TEvent) => TContext)[];
  readonly effects?: readonly EffectAny[];
}
```

Transitions are pure data. They do not execute side effects themselves. The interpreter evaluates transitions in definition order:

1. Look up the current state's `on[event.type]`.
2. Normalize to an array (single config or array of guarded configs).
3. Evaluate guards in order. Take the first transition whose guard returns `true` (or has no guard).
4. Apply actions sequentially, threading context through each one.
5. Collect effects: exit(current state) -> transition effects -> entry(target state).
6. Return the new state, new context, and collected effects to the runner.

A transition can target the same state it originates from (self-transition). Exit and entry effects still fire on self-transitions.

Multiple transitions for the same event are expressed as an array, enabling guarded branching:

```typescript
on: {
  RETRY: [
    { target: 'loading', guard: (ctx) => ctx.retryCount < 3 },
    { target: 'failed' },  // fallback when guard fails
  ],
}
```

---

## 4.6 Effect

An **Effect** is a descriptor (pure data) representing a side effect to be performed. Effects are NOT executed during transition computation -- they are collected and returned to the runner, which delegates them to an `EffectExecutor`.

All effects are discriminated by a `_tag` property:

| Effect Tag | Purpose                                     |
| ---------- | ------------------------------------------- |
| `Invoke`   | Call a method on a DI port-resolved service |
| `Spawn`    | Start a long-running activity               |
| `Stop`     | Cancel a running activity via AbortSignal   |
| `Emit`     | Send an event back to the machine           |
| `Delay`    | Wait for a duration                         |
| `Parallel` | Execute multiple effects concurrently       |
| `Sequence` | Execute multiple effects in order           |
| `None`     | No-op (for conditional branches)            |

Effects are created via the `Effect` namespace:

```typescript
Effect.invoke(UserServicePort, "getUser", ["user-123"]);
Effect.spawn("polling", { interval: 5000 });
Effect.delay(1000);
Effect.sequence([Effect.invoke(LoggerPort, "log", ["Starting"]), Effect.delay(500)] as const);
```

The `InvokeEffect` is the primary DI integration point: it references a port token and method name, enabling the executor to resolve the service from the container scope and call the method with type-checked arguments.

Effects are frozen and immutable. They can be inspected, logged, serialized, and tested without executing any side effects.

---

## 4.7 Guard

A **Guard** is a pure predicate function that determines whether a transition should be taken. Guards receive the current context and the triggering event, and must return a boolean synchronously.

```typescript
type Guard<TContext, TEvent> = (context: TContext, event: TEvent) => boolean;
```

Rules:

- Guards must be synchronous. No async guards.
- Guards must be side-effect-free. They should only read context and event data.
- Guards must be deterministic -- same inputs, same output.
- When multiple transitions exist for the same event, guards are evaluated in definition order. The first passing guard wins.
- A transition without a guard is always taken (equivalent to `() => true`).

```typescript
on: {
  SUBMIT: [
    { target: 'processing', guard: (ctx) => ctx.items.length > 0 },
    { target: 'error', guard: (ctx) => ctx.items.length === 0 },
  ],
}
```

---

## 4.8 Action

An **Action** is a pure function executed during a transition to transform the context. Actions receive the current context and the triggering event, and return a new context value.

```typescript
type Action<TContext, TEvent> = (context: TContext, event: TEvent) => TContext;
```

Rules:

- Actions must be pure -- no side effects. Side effects belong in Effects.
- Actions must return a new context object (not mutate the existing one).
- Multiple actions on a transition are executed in array order, each receiving the output of the previous action.
- Actions run synchronously during the transition computation, before any effects are executed.

```typescript
on: {
  ADD_ITEM: {
    target: 'active',
    actions: [
      (ctx, evt) => ({ ...ctx, items: [...ctx.items, evt.payload.item] }),
      (ctx) => ({ ...ctx, total: ctx.items.reduce((sum, i) => sum + i.price, 0) }),
    ],
  },
}
```

---

## 4.9 Snapshot

A **Snapshot** is an immutable view of the machine's current state at a point in time. It captures everything needed to render or inspect the machine externally.

```typescript
interface MachineSnapshot<TState extends string, TContext> {
  readonly state: TState;
  readonly context: TContext;
  readonly activities: readonly ActivityInstance[];
}
```

Key properties:

- **`state`** -- The current state name.
- **`context`** -- The current context value (frozen).
- **`activities`** -- All tracked activity instances (running, completed, failed, cancelled).

Snapshots are produced by `runner.snapshot()` and delivered to subscribers via `runner.subscribe()`. Each transition produces a new snapshot. Snapshots are designed for use with React's `useSyncExternalStore` pattern.

The runner also exposes a `status` concept (to be added in the improved API) tracking: `active` (machine is running), `done` (in a final state), or `error` (unrecoverable error occurred).

---

## Concept Relationship Diagram

```
                        +-------------------+
                        |      Machine      |
                        |  id, initial,     |
                        |  context, states  |
                        +--------+----------+
                                 |
                                 | contains 1..N
                                 v
                        +-------------------+
                        |    State (Node)   |
                        |  entry?, exit?,   |
                        |  on: transitions  |
                        +--------+----------+
                                 |
                                 | defines 0..N per event
                                 v
                        +-------------------+
                        |    Transition     |
                        |  target, guard?,  |
                        |  actions?,        |
                        |  effects?         |
                        +--------+----------+
                          /      |       \
                         /       |        \
                        v        v         v
                  +--------+ +--------+ +---------+
                  | Guard  | | Action | | Effect  |
                  | (pred) | | (ctx   | | (side   |
                  |        | |  xform)| |  effect |
                  +--------+ +--------+ |  desc.) |
                                        +---------+
                                             |
                                    resolved via DI
                                             |
                                             v
                                      +-----------+
                                      |  Port /   |
                                      |  Service  |
                                      +-----------+

  Events -----> Machine.send(event) -----> Interpreter
                                              |
                                              v
                                       TransitionResult
                                       { newState, newContext, effects[] }
                                       (thrown guard/action exceptions surface as Err(TransitionError) via send())
                                              |
                                              v
                                     Runner executes effects
                                              |
                                              v
                                        Snapshot emitted
                                        to subscribers
```
