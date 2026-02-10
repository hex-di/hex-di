# 15 - Appendices

_Previous: [14 - API Reference](./14-api-reference.md)_

---

## Appendix A: Comparison with Other Libraries

### Feature Matrix

| Feature                           | HexDI Flow                           | XState v5                 | Robot        | Effect-TS      |
| --------------------------------- | ------------------------------------ | ------------------------- | ------------ | -------------- |
| **State Machines**                | Yes                                  | Yes                       | Yes          | No (fibers)    |
| **Dependency Injection**          | Native (ports/adapters)              | None                      | None         | Layer/Service  |
| **Compile-Time Graph Validation** | Yes (GraphBuilder)                   | No                        | No           | Yes (Layer)    |
| **Hierarchical States**           | Yes                                  | Yes                       | No           | N/A            |
| **Parallel States**               | Yes                                  | Yes                       | No           | Fiber fork     |
| **History States**                | Yes                                  | Yes                       | No           | N/A            |
| **Actor Model**                   | Yes                                  | Yes                       | No           | Fiber model    |
| **Activities (Long-Running)**     | Yes (ActivityPort)                   | invoke (promise/callback) | No           | Fiber          |
| **Typed Events**                  | Yes (branded events)                 | Yes (typegen)             | Partial      | Yes            |
| **Effects as Data**               | Yes (Effect descriptors)             | Yes (actions/actors)      | No           | Yes            |
| **Visualization**                 | Statechart export                    | Stately.ai                | No           | No             |
| **React Integration**             | useMachine, useSelector, useSend     | useMachine, useSelector   | useMachine   | N/A            |
| **Testing Utilities**             | testActivity, testMachine, testDeps  | createActor, inspect      | No           | TestLayer      |
| **Tracing**                       | @hex-di/tracing spans, FlowCollector | inspect() API             | No           | Fiber tracing  |
| **Serialization**                 | Yes (snapshots)                      | Yes (persist)             | No           | N/A            |
| **Bundle Size**                   | TBD                                  | ~13KB gzipped             | ~1KB gzipped | ~30KB+ gzipped |

### Key Differentiators

**vs XState v5:**

- Effects resolve services through DI ports, not inline callbacks -- adapters can be swapped for testing without mocking
- Activity system uses ActivityPort with typed input/output and dependency injection, not raw promise/callback invocations
- Compile-time graph validation via GraphBuilder ensures all ports have registered adapters before the container starts
- Machine snapshots integrate with the HexDI inspector system and tracing pipeline
- No external code generation step (XState typegen) -- types flow naturally through branded generics

**vs Robot:**

- Supports hierarchical, parallel, and history states -- Robot is limited to flat state machines
- Full effect system with DI-resolved side effects -- Robot has no side effect model
- Activity system for long-running processes with lifecycle management
- Comprehensive testing utilities (testActivity, createTestEventSink, createTestDeps)
- Significantly richer type safety through branded types and compile-time validation

**vs Effect-TS:**

- Purpose-built for state machines with first-class statechart semantics (states, transitions, guards, entry/exit effects)
- Effect-TS provides composable effects and fibers, but does not model finite state machines -- developers must hand-roll state machine patterns from primitives
- ActivityPort extends Port, reusing all existing HexDI infrastructure for dependency resolution, scoping, and lifecycle
- Lighter conceptual overhead for teams already familiar with statechart notation
- HexDI Flow's FlowCollector provides state-machine-specific tracing (transition history, state duration, effect execution) vs general fiber tracing

---

## Appendix B: Glossary

| Term                   | Definition                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Activity**           | A long-running process spawned by a machine. Activities have typed input/output, receive an AbortSignal for cancellation, and can emit events back to the machine via an EventSink.                                            |
| **Actor**              | A self-contained entity with its own state, behavior, and communication channel. In HexDI Flow, machines and spawned activities both function as actors.                                                                       |
| **Action**             | A pure function `(context, event) => context` executed during a transition to transform the machine's context. Actions run synchronously and must produce a new context object.                                                |
| **Assign**             | A context update expressed through an action. The term is used informally to describe context-transforming actions on transitions.                                                                                             |
| **Compound State**     | A state that contains child states (hierarchical nesting). The parent state delegates to an active child state. Also called a hierarchical state.                                                                              |
| **ConfiguredActivity** | The result of calling `activity(port, config)`. Bundles a port, dependencies, events, and run function into a single registrable unit.                                                                                         |
| **Context**            | The extended state data that persists across transitions. Represents information that cannot be expressed by finite state names alone (counters, loaded data, error messages). Immutable at the type level via `DeepReadonly`. |
| **Effect**             | A pure data descriptor representing a side effect to be performed. Effects are collected during transition computation and executed by the runner's EffectExecutor afterward.                                                  |
| **Effect Descriptor**  | The concrete data structure for an effect, discriminated by a `_tag` property (`Invoke`, `Spawn`, `Stop`, `Emit`, `Delay`, `Parallel`, `Sequence`, `None`).                                                                    |
| **Effect Executor**    | The runtime component responsible for interpreting effect descriptors and performing actual side effects (resolving ports, calling methods, spawning activities).                                                              |
| **Event**              | A typed, branded signal sent to the machine to trigger transitions. Events are discriminated unions keyed by a `type` string property and optionally carry a typed payload.                                                    |
| **Event Sink**         | An interface provided to activities for emitting events back to the owning machine. Typed via `TypedEventSink` when events are defined with `defineEvents`.                                                                    |
| **Final State**        | A state with no outgoing transitions (`on: {}`). When a machine enters a final state, its status becomes `done`.                                                                                                               |
| **Flow Adapter**       | Binds a machine definition, its required dependencies, and its activities to a FlowPort. Created with `createFlowAdapter` and registered in the HexDI dependency graph.                                                        |
| **Flow Collector**     | An observer interface that records transition events for tracing, debugging, and DevTools integration. `NoOpFlowCollector` provides zero-overhead when disabled.                                                               |
| **Flow Port**          | A port created with `createFlowPort` that exposes a `FlowService`. Resolved from the container like any other port.                                                                                                            |
| **Flow Service**       | The runtime service resolved from a FlowPort. Wraps a MachineRunner and provides `snapshot`, `send`, and `subscribe` to consumers.                                                                                             |
| **Guard**              | A pure predicate function `(context, event) => boolean` that determines whether a transition should be taken. Guards are synchronous and side-effect-free.                                                                     |
| **History State**      | A pseudo-state that remembers which child state was last active within a compound state. `shallow` remembers only the immediate child; `deep` remembers the entire nested state path.                                          |
| **Interpreter**        | The pure `transition()` function that computes the next state, context, and effects from a machine, snapshot, and event. Contains no side effects.                                                                             |
| **Invoke**             | An effect that calls a method on a DI port-resolved service. The primary integration point between the state machine and the HexDI container.                                                                                  |
| **Machine**            | A frozen, branded data structure describing all possible states, events, context shape, and transitions. Purely declarative -- carries no behavior.                                                                            |
| **Machine Runner**     | The runtime engine that manages a machine's lifecycle: maintains the current snapshot, processes events through the interpreter, executes effects, and notifies subscribers.                                                   |
| **Parallel State**     | A compound state where all child regions are active simultaneously. Each region transitions independently.                                                                                                                     |
| **Snapshot**           | An immutable view of the machine's current state, context, and activities at a point in time. Produced after every transition and delivered to subscribers.                                                                    |
| **Spawn**              | An effect that starts a long-running activity. The spawned activity runs concurrently with the machine and can emit events back.                                                                                               |
| **State**              | A discrete, named mode of the machine. At any point in time the machine is in exactly one state (or one state per parallel region).                                                                                            |
| **State Value**        | The current state name as a string literal type. For hierarchical machines, this may be a compound value representing the full nested path.                                                                                    |
| **Transition**         | A declarative rule: "while in state X, when event Y occurs (and if guard Z passes), move to state W and execute these actions/effects."                                                                                        |
| **Transition Result**  | The output of the pure interpreter: new state, new context, collected effects, and a `transitioned` boolean. Thrown guard or action exceptions during `send()` are converted to `Err(TransitionError)` rather than propagated. |

---

## Appendix C: Design Decisions

### C1. Why Effects as Data Descriptors (Not Callbacks)?

Traditional state machine libraries let transitions execute side effects directly via inline callbacks. HexDI Flow represents effects as frozen, immutable data structures (`{ _tag: "Invoke", port, method, args }`). The runner collects these descriptors during transition computation and passes them to an `EffectExecutor` afterward.

Benefits:

- **Testability** -- transitions are pure functions. Assert on the returned effect descriptors without executing anything.
- **Serializability** -- effect descriptors can be logged, persisted, replayed, and transmitted for debugging.
- **Separation of concerns** -- the interpreter knows nothing about DI, HTTP, timers, or activity management. The executor handles all of that.
- **Composability** -- `Parallel` and `Sequence` meta-effects compose other effects declaratively.

Trade-off: slightly more indirection than inline callbacks. For trivial side effects (logging a message), the descriptor pattern requires a round-trip through the executor. This cost is negligible in practice and is offset by the testability gain.

### C2. Why Pure Interpreter + Separate Executor?

The `transition()` function is a pure function: `(machine, snapshot, event) => TransitionResult`. It evaluates guards, applies actions, and collects effects -- but never executes side effects. The `MachineRunner.send()` wraps this in `Result<TransitionResult, TransitionError>`, converting thrown guard/action exceptions to `Err(TransitionError)` discriminated by `_tag` (`'GuardThrew'`, `'ActionThrew'`). The `MachineRunner` takes the `TransitionResult` and delegates effects to an `EffectExecutor`.

This split enables:

- **Unit testing transitions** without any runtime infrastructure. Call `transition()` directly, assert on the result.
- **Swappable executors** -- `createBasicExecutor()` for simple use, `createDIEffectExecutor()` for container integration, custom executors for specialized needs.
- **Deterministic replay** -- re-running a sequence of events through `transition()` always produces the same results, regardless of executor behavior.
- **Tracing** -- the runner intercepts the `TransitionResult` before execution, making it trivial to record transitions without modifying the interpreter.

### C3. Why Port-Based Effects (Not Inline Functions)?

`Effect.invoke(UserServicePort, 'getUser', ['user-123'])` references a port token and method name rather than closing over a function reference. The executor resolves the port from the container scope at execution time.

This ensures:

- **DI integration** -- effects participate in the container's scoping, lifecycle, and dependency resolution. A scoped port resolves to the correct instance for the current scope.
- **Adapter swapping** -- swap the port's adapter (e.g., from `RestUserAdapter` to `MockUserAdapter`) and all invoke effects automatically resolve to the new implementation.
- **Introspection** -- effect descriptors declare which ports they depend on. The dependency graph can be computed statically from machine definitions.
- **Tracing** -- port invocations are traceable boundaries. The tracing system instruments every `Invoke` effect with spans automatically.

### C4. Why ActivityPort Extends Port (Reuse DI Infrastructure)?

`ActivityPort<TInput, TOutput, TName>` extends `Port<Activity<TInput, TOutput>, TName>`. This means activities are resolved from the container exactly like any other service.

Consequences:

- **Scoping** -- an activity scoped to a request container is automatically disposed when the request ends.
- **Dependencies** -- activities declare their own `requires` array. The container resolves these dependencies before the activity runs.
- **Testing** -- `createTestDeps()` provides mock implementations for activity dependencies using the same mock pattern as all other port-based services.
- **Graph validation** -- GraphBuilder verifies that every ActivityPort referenced by a machine has a registered adapter at compile time.
- **No special runtime** -- no separate "activity registry" or "actor system" is needed. The container IS the actor system.

### C5. Why Three-Layer Timeout Hierarchy?

Timeouts in HexDI Flow apply at three levels:

1. **Activity-level timeout** -- `SpawnOptions.timeout` limits how long a single activity instance runs before being aborted.
2. **Effect-level timeout** -- `EffectExecutor` configuration can set a timeout for individual invoke effects.
3. **Machine-level timeout** -- an external watchdog (e.g., container scope disposal) limits the machine's total lifetime.

Each level catches a different class of failure:

- Activity timeout catches a single runaway task (e.g., a polling activity that never terminates).
- Effect timeout catches a slow port invocation (e.g., an HTTP call that hangs).
- Machine timeout catches a machine stuck in a non-final state (e.g., waiting for an event that never arrives).

The hierarchy prevents a single slow operation from blocking the entire system, while giving each layer the ability to recover independently (activities can be re-spawned, effects can be retried, machines can be restarted from a persisted snapshot).

### C6. Why Immutable Snapshots?

`MachineSnapshot` is deeply frozen at runtime and typed as `DeepReadonly` at the type level. Every transition produces a new snapshot object rather than mutating the existing one.

Benefits:

- **React compatibility** -- `useSyncExternalStore` requires referential inequality to detect changes. Immutable snapshots make this trivial.
- **Time-travel debugging** -- every snapshot is an independent value. A history of snapshots enables stepping forward and backward through state transitions.
- **Concurrent safety** -- multiple subscribers reading the snapshot concurrently never observe partial updates.
- **Tracing** -- the FlowCollector records snapshots as part of transition events. Immutability guarantees that recorded snapshots cannot be retroactively modified by subsequent transitions.

Trade-off: object allocation on every transition. In practice, machine contexts are small (< 1KB) and transitions are infrequent relative to rendering. The allocation cost is negligible compared to the safety guarantees.

---

## Appendix D: Migration from Current Implementation

The existing `@hex-di/flow` implementation (v0.1.0) already provides the core APIs described in this specification. The following areas may require changes as the specification is finalized:

### Existing APIs (Stable)

- `defineMachine`, `state`, `event` -- machine definition factories
- `Effect` namespace -- all effect constructors (`invoke`, `spawn`, `stop`, `emit`, `delay`, `parallel`, `sequence`, `none`)
- `createActivityPort`, `defineEvents`, `activity` -- activity definition API
- `createMachineRunner`, `transition` -- runner and pure interpreter
- `createFlowPort`, `createFlowAdapter`, `createDIEffectExecutor` -- HexDI integration
- `FlowMemoryCollector`, `NoOpFlowCollector` -- tracing collectors
- Testing utilities (`testActivity`, `createTestEventSink`, `createTestSignal`, `createTestDeps`)

### Planned Additions

- **`setup()` builder** -- higher-level API wrapping `defineMachine` with builder-pattern ergonomics and `const` type parameter inference
- **`Effect.assign`** -- dedicated effect for context updates, replacing inline action functions where appropriate
- **`Effect.send`** -- send events to child or sibling machines in composed machine setups
- **`Effect.choose`** -- conditional effect selection based on guards
- **`Effect.log`** -- structured logging effect
- **Hierarchical, parallel, and history state support** -- currently specified but not yet implemented
- **`testMachine` / `testTransition` test harnesses** -- higher-level testing utilities for full machine testing
- **`useFlow` / `useMachineSelector` / `useFlowEvent` React hooks** -- higher-level React bindings alongside existing `useMachine` / `useSelector` / `useSend`
- **Statechart serialization/export** -- export machine definitions to standard statechart formats for visualization

---

_Previous: [14 - API Reference](./14-api-reference.md)_

_End of Specification_
