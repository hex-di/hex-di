# 01 - Overview & Philosophy

## 1. Overview

HexDI Flow is a DI-native state machine and statechart library for managing complex application state transitions. It brings the statechart formalism (Harel, 1987) into the hex-di ecosystem, treating every side effect as a **port invocation** resolved through the dependency injection container.

- State machines are defined as immutable, branded configuration objects with full type inference
- Side effects are pure data descriptors (Effect.invoke, Effect.spawn, Effect.delay) executed by a pluggable EffectExecutor
- Activities are long-running processes with typed input/output, cancellation via AbortSignal, and typed event emission
- Every port invocation in the machine is swappable, testable, and traceable through the HexDI container
- Machine state feeds into the HexDI nervous system (introspection, MCP, A2A)

### 1.1 What is a Statechart?

Statecharts (David Harel, 1987) extend finite state machines with hierarchical states, parallel regions, history, and guarded transitions. They are the formal foundation behind SCXML, UML state diagrams, and libraries like XState.

```
+-----------------------------------------------------------------------+
|                         Order Flow Machine                             |
|                                                                        |
|  +----------+    SUBMIT     +-----------+   PAYMENT_OK   +---------+  |
|  |          |-------------->|           |--------------->|         |  |
|  |   idle   |               | validating|                | paying  |  |
|  |          |<--CANCEL------| (compound)|<--RETRY--------|         |  |
|  +----------+               |           |                +---------+  |
|       ^                     |  +------+ |   PAYMENT_ERR      |        |
|       |                     |  |check | |        |           v        |
|       |                     |  |stock | |   +---------+  +--------+  |
|       |                     |  +------+ |   |  error  |  |shipping|  |
|       |                     +-----------+   +---------+  +--------+  |
|       |                                                      |        |
|       +--------------------DELIVERED-------------------------+        |
+-----------------------------------------------------------------------+
```

HexDI Flow represents each state transition's side effects as port invocations. When "paying" enters, it does not call a payment API directly -- it invokes `PaymentPort.charge(...)`. The container resolves which adapter handles that call. In tests, a mock adapter. In production, a Stripe adapter. The machine definition never changes.

### 1.2 Goals

1. **Port-centric effects** -- Every side effect is a port invocation. This brings testability (swap adapters), explicit dependencies (injected via container), and type safety through the machine
2. **Compile-time validated machines** -- State names, event names, transition targets, guard predicates, and action signatures are all validated at compile time via TypeScript's type system
3. **Effects as data** -- Effects are immutable descriptors (`{ _tag: "Invoke", port, method, args }`), not executed inline. The interpreter is pure; the executor is pluggable
4. **Hierarchical and parallel states** -- Support compound states, parallel regions, and history pseudo-states following statechart semantics
5. **Activity system** -- Long-running processes with port-resolved dependencies, typed event emission, cancellation, cleanup, and timeout support
6. **Framework-agnostic core** -- `@hex-di/flow` has no React or framework dependency. `@hex-di/flow-react` provides hooks
7. **Self-aware machines** -- Machine state (transitions, activities, effects) feeds into the HexDI container's self-knowledge system for introspection, MCP, and A2A diagnostics
8. **Builder DSL** -- Ergonomic machine definition via a builder pattern that infers types progressively, reducing verbosity compared to raw configuration objects

### 1.3 Non-Goals

1. **Not a workflow server** -- HexDI Flow runs in-process. It does not require external infrastructure, databases, or workflow engines. For distributed orchestration, use the Saga package
2. **Not BPMN** -- No BPMN XML, swim lanes, or process modeling standards. HexDI Flow is a TypeScript-first statechart library
3. **Not a message queue** -- Use dedicated infrastructure (RabbitMQ, Kafka) for message routing. HexDI Flow manages local state transitions
4. **Not event sourcing** -- Machines can be serialized/restored, but HexDI Flow does not implement event stores or projections
5. **Not XState** -- While inspired by XState's statechart model, HexDI Flow is designed around dependency injection and port-based effects, not actor-based messaging. It is not a drop-in replacement

### 1.4 When to Use HexDI Flow

| Use Flow                                              | Don't Use Flow                           |
| ----------------------------------------------------- | ---------------------------------------- |
| Complex UI state with multiple transitions and guards | Simple boolean flags or enum states      |
| State that triggers port-invoked side effects         | Pure UI state with no side effects       |
| Long-running activities (polling, WebSocket, timers)  | One-shot async operations with try/catch |
| States with enter/exit lifecycle effects              | Static configuration values              |
| Multi-step wizards or form flows                      | Single-page forms with local validation  |
| State that other parts of the system need to observe  | Private component-internal state         |
| Hierarchical or parallel state requirements           | Flat state that never nests              |

### 1.5 Key Insight

Unlike XState (which bundles its own actor system and effect execution), HexDI Flow separates the **statechart** (pure transition logic) from the **effect execution** (DI-resolved port invocations). This means:

- The interpreter is a pure function: `transition(state, context, event, machine) => TransitionResult`
- Effects are data descriptors collected during transition, executed afterwards by a pluggable EffectExecutor
- The EffectExecutor resolves ports from the container, calls methods on resolved services, spawns activities, and routes events
- In tests, you can inspect effects without executing them, or use a mock executor
- The machine definition is an immutable, frozen, branded TypeScript object -- no classes, no hidden state

```
XState approach:
  Machine definition  -->  Actor system  -->  Internal effect execution
  (effects embedded in machine, coupled to runtime, hard to swap)

HexDI Flow approach:
  Machine definition  -->  Pure interpreter  -->  Effect descriptors  -->  DI executor
  (effects are data, interpreter is pure, executor resolves ports from container)
```

### 1.6 Architecture Comparison: XState vs HexDI Flow

```
+-------------------------------+    +-------------------------------+
|          XState               |    |        HexDI Flow             |
+-------------------------------+    +-------------------------------+
|                               |    |                               |
|  createMachine({              |    |  createMachine({              |
|    states: {                  |    |    states: {                  |
|      loading: {               |    |      loading: {               |
|        invoke: {              |    |        entry: [               |
|          src: fetchData, <-+  |    |          Effect.invoke(   <-+ |
|          onDone: 'success' |  |    |            ApiPort,       | |
|        }                   |  |    |            'fetch',       | |
|      }                     |  |    |            [id]           | |
|    }                       |  |    |          )                | |
|  })                        |  |    |        ]                  | |
|                            |  |    |      }                    | |
|  Raw function reference ---+  |    |    }                      | |
|  Tightly coupled to impl     |    |  })                       | |
|  Must mock at function level  |    |                           | |
|                               |    |  Port token reference ----+ |
+-------------------------------+    |  Resolved via DI container  |
                                     |  Swap adapter for testing   |
                                     +-------------------------------+
```

### 1.7 Scope of Version 0.1.0

The initial release includes the full feature set of the current implementation plus the following additions:

**Ships in 0.1.0:**

- Flat state machines with branded types (State, Event, Machine)
- Effect system: Invoke, Spawn, Stop, Emit, Delay, Parallel, Sequence, None
- Activity system: activityPort, activity factory, defineEvents, cleanup, timeouts
- Pure interpreter: `transition()` function
- Machine runner: createMachineRunner with send/sendAndExecute/subscribe
- DI integration: createFlowPort, createFlowAdapter, DIEffectExecutor
- React hooks: useMachine, useSelector, useSend
- Testing utilities: testActivity, createTestEventSink, createTestSignal, createTestDeps
- Tracing: FlowCollector, FlowMemoryCollector, createTracingRunner
- Builder DSL: `setup().context<T>().states({...}).on({...}).build()` pattern
- First-class typed guards: defineGuard with named, composable predicates
- First-class typed actions: defineAction with named, composable context transformers
- Machine serialization: `serialize(snapshot)` / `restore(machine, data)` for persistence

**Deferred to 0.2.0:**

- Hierarchical (compound) states
- Parallel state regions
- History pseudo-states (shallow and deep)
- Visual statechart export (SCXML/JSON format)
- Supervision/error recovery strategies for child actors

---

## 2. Philosophy

> "Machines are graphs of port-resolved side effects."

### 2.1 Core Principles

**Principle 1: Effects are Port Invocations**

Every side effect in a state machine is expressed as a port invocation. Not a raw function call, not an inline async operation -- a typed reference to a port method. The container resolves which concrete service handles the call.

```typescript
// Effect is a data descriptor referencing a port method
const fetchEffect = Effect.invoke(UserApiPort, "getUser", [userId]);
// { _tag: "Invoke", port: UserApiPort, method: "getUser", args: [userId] }

// The executor resolves the port and calls the method:
//   const service = scope.resolve(UserApiPort);
//   await service.getUser(userId);
```

This means:

- In production, `UserApiPort` resolves to `HttpUserApiAdapter` -- real HTTP calls
- In tests, `UserApiPort` resolves to `MockUserApiAdapter` -- instant, deterministic
- The machine definition is identical in both cases

**Principle 2: Compile-Time Validated Dependency Graphs**

The type system validates the complete dependency graph at compile time:

- Transition targets must be valid state names
- Effect.invoke methods must exist on the port's service interface
- Effect.invoke arguments must match the method's parameter types
- Guard predicates must accept the machine's context and event types
- Actions must return the machine's context type
- Activity requires must be a subset of the FlowAdapter's requires

If the machine compiles, the dependency graph is sound.

**Principle 3: Pure Transitions, Effectful Actions**

The interpreter is a pure function. Given a state, context, event, and machine definition, it returns a `TransitionResult` containing the new state, new context, and a list of effect descriptors. Thrown guard or action exceptions are captured as `Err(TransitionError)` rather than propagated. No side effects occur during transition computation.

```
transition(currentState, currentContext, event, machine)
  = { newState, newContext, effects[], transitioned }
```

The separation enables:

- Testing transitions without executing effects
- Inspecting effect lists before execution
- Replaying transitions deterministically
- Custom effect execution strategies (batch, prioritize, throttle)

**Principle 4: Framework-Agnostic Core with Integration Packages**

The core package (`@hex-di/flow`) contains the machine definition, effect system, activity system, interpreter, and runner. It has no React, Angular, Vue, or Node.js dependency.

Framework integration is provided by separate packages:

- `@hex-di/flow-react` -- React hooks (useMachine, useSelector, useSend)
- Future: `@hex-di/flow-solid`, `@hex-di/flow-vue`, etc.

### 2.2 Architecture Overview

```
+----------------------------------------------------------------------+
|                        APPLICATION LAYER                              |
|                                                                       |
|  const flow = scope.resolve(OrderFlowPort);                          |
|  await flow.sendAndExecute({ type: 'SUBMIT' });                      |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                       FLOW SERVICE                                    |
|                                                                       |
|  FlowService<TState, TEvent, TContext>                                |
|  - snapshot() / state() / context()                                   |
|  - send(event) -> Result<effects[], TransitionError>  (pure)          |
|  - sendAndExecute(event) -> ResultAsync  (effectful)                  |
|  - subscribe(callback) -> unsubscribe                                 |
|  - dispose() -> ResultAsync<void, DisposeError>                       |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                      MACHINE RUNNER                                   |
|                                                                       |
|  +------------------+  +------------------+  +-------------------+   |
|  |   Interpreter    |  | Effect Executor  |  | Activity Manager  |   |
|  | (pure transition |  | (DI-resolved     |  | (spawn, stop,     |   |
|  |  function)       |  |  port calls)     |  |  track lifecycle) |   |
|  +--------+---------+  +--------+---------+  +---------+---------+   |
|           |                     |                       |             |
+-----------|---------------------|---+-------------------|------------+
            |                     |   |                   |
+-----------v---------------------v---v-------------------v------------+
|                     MACHINE DEFINITION                                |
|                                                                       |
|  createMachine({                                                      |
|    id: 'order',                                                       |
|    initial: 'idle',                                                   |
|    context: { ... },                                                  |
|    states: {                                                          |
|      idle: { on: { SUBMIT: { target: 'validating', ... } } },        |
|      validating: { entry: [Effect.invoke(ValidatorPort, ...)], ... }, |
|      paying: { entry: [Effect.spawn('payment', ...)], ... },          |
|      ...                                                              |
|    }                                                                  |
|  })                                                                   |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                     HEXDI CONTAINER                                   |
|                                                                       |
|  +-------------+     +-------------+     +-------------+              |
|  |    Port     |---->|   Adapter   |---->|   Service   |              |
|  | (ApiPort)   |     | (HttpApi)   |     | (business)  |              |
|  +-------------+     +-------------+     +-------------+              |
|                                                                       |
|  +-------------+     +-------------+     +-------------+              |
|  |    Port     |---->|   Adapter   |---->|   Service   |              |
|  | (LoggerPort)|     | (Console)   |     | (logging)   |              |
|  +-------------+     +-------------+     +-------------+              |
|                                                                       |
+----------------------------------------------------------------------+
```

### 2.3 Data Flow

```
   Event                 Pure                  Effect             DI-Resolved
   Arrives              Transition             Descriptors        Execution
     |                     |                      |                   |
     v                     v                      v                   v
+----------+    +-------------------+    +------------------+    +----------+
| { type:  |--->| transition(       |--->| [                |--->| executor |
|  'FETCH' |    |   state, ctx,     |    |   { _tag:Invoke, |    | .execute |
| }        |    |   event, machine  |    |     port, method,|    |  (effect)|
+----------+    |  )                |    |     args },      |    +-----+----+
                |                   |    |   { _tag:Delay,  |          |
                | => {              |    |     ms: 100 }    |          v
                |   newState,       |    | ]                |    +----------+
                |   newContext,      |    +------------------+    | scope    |
                |   effects,        |                            | .resolve |
                |   transitioned    |                            | (port)   |
                |  }                |                            +----------+
                +-------------------+
```

### 2.4 Benefits

| Benefit        | Description                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| Testability    | Swap adapters to test machine logic without external services. Inspect effects as data.    |
| Type Safety    | Full TypeScript inference: state names, event types, context, guards, actions, effects.    |
| Observability  | Every transition produces traceable events with state, event, effects, and timing.         |
| Composability  | Machines compose with DI graphs via FlowPort/FlowAdapter. Activities declare port deps.    |
| Purity         | The interpreter is a pure function. No hidden mutable state. Effects are data descriptors. |
| Self-Awareness | Machine state visible to introspection, MCP, and AI diagnostic tools.                      |

### 2.5 Before & After

**Before (inline effects -- tightly coupled, hard to test):**

```typescript
async function handleSubmit(formData: FormData) {
  setState("validating");
  try {
    const result = await validateService.validate(formData); // Direct call
    if (result.valid) {
      setState("submitting");
      await apiService.submit(formData); // Direct call - how to mock?
      await analytics.track("submitted"); // Another direct call
      setState("success");
    } else {
      setState("invalid");
    }
  } catch (error) {
    setState("error");
  }
  // Problems: direct service calls, no formal state model, ad-hoc error handling,
  // hard to test transitions independently from effects, no tracing
}
```

**After (HexDI Flow -- port-based effects, pure transitions):**

```typescript
const formMachine = createMachine({
  id: "form",
  initial: "idle",
  context: { data: null, error: null },
  states: {
    idle: {
      on: { SUBMIT: { target: "validating" } },
    },
    validating: {
      entry: [Effect.invoke(ValidatorPort, "validate", [formData])],
      on: {
        VALID: { target: "submitting" },
        INVALID: { target: "invalid" },
      },
    },
    submitting: {
      entry: [
        Effect.invoke(ApiPort, "submit", [formData]),
        Effect.invoke(AnalyticsPort, "track", ["submitted"]),
      ],
      on: {
        SUCCESS: { target: "success" },
        FAILURE: { target: "error", actions: [(ctx, e) => ({ ...ctx, error: e.payload })] },
      },
    },
    invalid: { on: { SUBMIT: { target: "validating" } } },
    success: { on: {} },
    error: { on: { RETRY: { target: "submitting" } } },
  },
});

// Every port is swappable. Pure transitions are testable without effects.
// Effects are inspectable data. Tracing is automatic.
```

---

## 3. Package Structure

```
flow/
+-- core/                          # @hex-di/flow
|   +-- src/
|   |   +-- machine/
|   |   |   +-- types.ts          # State, Event, Machine branded types
|   |   |   +-- brands.ts         # Brand symbols for nominal typing
|   |   |   +-- config.ts         # MachineConfig type
|   |   |   +-- state-node.ts     # StateNode with entry/exit/on
|   |   |   +-- transition.ts     # TransitionConfig with target/guard/actions/effects
|   |   |   +-- create-machine.ts # createMachine factory
|   |   |   +-- factories.ts      # state() and event() curried factories
|   |   |   +-- builder.ts        # NEW: setup() builder DSL
|   |   |   +-- guards.ts         # NEW: defineGuard factory
|   |   |   +-- actions.ts        # NEW: defineAction factory
|   |   |   +-- index.ts
|   |   +-- effects/
|   |   |   +-- types.ts          # Effect descriptor interfaces
|   |   |   +-- constructors.ts   # Effect namespace with factory functions
|   |   |   +-- index.ts
|   |   +-- activities/
|   |   |   +-- port.ts           # activityPort() curried factory
|   |   |   +-- factory.ts        # activity() factory
|   |   |   +-- events.ts         # defineEvents() typed event system
|   |   |   +-- manager.ts        # ActivityManager lifecycle tracking
|   |   |   +-- types.ts          # Activity, ActivityContext, ConfiguredActivity
|   |   |   +-- testing/          # testActivity, test utilities
|   |   |   +-- index.ts
|   |   +-- runner/
|   |   |   +-- interpreter.ts    # Pure transition() function
|   |   |   +-- create-runner.ts  # createMachineRunner factory
|   |   |   +-- executor.ts       # Basic EffectExecutor
|   |   |   +-- types.ts          # MachineSnapshot, MachineRunner, EffectExecutor
|   |   |   +-- index.ts
|   |   +-- integration/
|   |   |   +-- port.ts           # createFlowPort factory
|   |   |   +-- adapter.ts        # createFlowAdapter factory
|   |   |   +-- di-executor.ts    # DIEffectExecutor with port resolution
|   |   |   +-- types.ts          # FlowService interface
|   |   |   +-- index.ts
|   |   +-- serialization/        # NEW
|   |   |   +-- serialize.ts      # serialize(snapshot) -> JSON
|   |   |   +-- restore.ts        # restore(machine, json) -> runner
|   |   |   +-- types.ts          # SerializedSnapshot type
|   |   |   +-- index.ts
|   |   +-- tracing/
|   |   |   +-- types.ts          # FlowTransitionEvent, FlowCollector
|   |   |   +-- noop-collector.ts # Zero-overhead no-op collector
|   |   |   +-- memory-collector.ts # In-memory tracing with filtering
|   |   |   +-- tracing-runner.ts # createTracingRunner wrapper
|   |   |   +-- index.ts
|   |   +-- devtools/
|   |   |   +-- activity-metadata.ts # getActivityMetadata extraction
|   |   |   +-- index.ts
|   |   +-- errors/
|   |   |   +-- index.ts          # FlowError hierarchy
|   |   +-- index.ts              # Public API barrel export
|   +-- tests/
|   +-- package.json
+-- react/                         # @hex-di/flow-react
|   +-- src/
|   |   +-- hooks/
|   |   |   +-- use-machine.ts    # Full machine state + send
|   |   |   +-- use-selector.ts   # Derived state with memoization
|   |   |   +-- use-send.ts       # Stable send reference
|   |   |   +-- shallow-equal.ts  # Equality utility
|   |   |   +-- index.ts
|   |   +-- context/
|   |   |   +-- flow-context.ts   # React context for FlowService
|   |   |   +-- index.ts
|   |   +-- index.ts
|   +-- tests/
|   +-- package.json
+-- testing/                       # @hex-di/flow-testing (NEW)
    +-- src/
    |   +-- harness.ts            # createMachineTestHarness
    |   +-- mock-executor.ts      # MockEffectExecutor (records effects)
    |   +-- assertions.ts         # assertState, assertContext, assertEffect
    |   +-- index.ts
    +-- package.json
```

### 3.1 Dependency Graph

```
@hex-di/flow-react ------> @hex-di/flow -------> @hex-di/core
       |                         |                     |
       v                         v                     v
  @hex-di/react             @hex-di/runtime       @hex-di/graph
                            @hex-di/tracing

@hex-di/flow-testing -----> @hex-di/flow
```

### 3.2 Package Roles

| Package                | Role                                                                                              | Framework Dependency |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| `@hex-di/flow`         | Core: machine definition, effects, activities, interpreter, runner, DI integration, serialization | None                 |
| `@hex-di/flow-react`   | React hooks: useMachine, useSelector, useSend                                                     | `react`              |
| `@hex-di/flow-testing` | Test harness: createMachineTestHarness, MockEffectExecutor, assertions                            | None                 |

### 3.3 Peer Dependencies

| Package                | Dependencies                      | Peer Dependencies |
| ---------------------- | --------------------------------- | ----------------- |
| `@hex-di/flow`         | `@hex-di/core`, `@hex-di/runtime` | --                |
| `@hex-di/flow-react`   | `@hex-di/flow`, `@hex-di/react`   | `react`           |
| `@hex-di/flow-testing` | `@hex-di/flow`                    | --                |

### 3.4 What Exists Today vs. What is New

The current implementation (`libs/flow/core` and `libs/flow/react`) already provides:

```
EXISTING (libs/flow/core)           NEW in 0.1.0 spec
+----------------------------------+----------------------------------+
| createMachine factory            | setup() builder DSL              |
| State, Event branded types       | defineGuard named guards         |
| state(), event() factories       | defineAction named actions       |
| Effect.invoke/spawn/stop/emit/   | serialize/restore                |
|   delay/parallel/sequence/none   | @hex-di/flow-testing package     |
| activityPort, activity factory   | createMachineTestHarness         |
| defineEvents typed event system  | MockEffectExecutor               |
| ActivityManager lifecycle        | Assertion helpers                |
| Pure interpreter (transition fn) |                                  |
| createMachineRunner              | DEFERRED to 0.2.0               |
| DIEffectExecutor                 +----------------------------------+
| createFlowPort/createFlowAdapter | Hierarchical states              |
| FlowService interface            | Parallel state regions           |
| React: useMachine, useSelector,  | History pseudo-states            |
|   useSend                        | SCXML/statechart export          |
| Tracing: FlowCollector,          | Supervision strategies           |
|   FlowMemoryCollector,           |                                  |
|   createTracingRunner            |                                  |
| Error hierarchy                  |                                  |
+----------------------------------+----------------------------------+
```

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
