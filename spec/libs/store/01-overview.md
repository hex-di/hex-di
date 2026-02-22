# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/store` extends HexDI with reactive state management that respects hexagonal architecture. Every state container is a real `DirectedPort`, every state implementation is a real `Adapter`, and Container is the single runtime managing resolution, scoping, and disposal.

There is no separate Store instance. There is no global middleware system. There is no string-based dispatch. State is resolved from Container like any other service:

```typescript
const counter = container.resolve(CounterPort);
counter.state; // DeepReadonly<{ count: number }>
counter.actions.increment(); // Type-safe, bound action
```

### What this package provides

- **State ports** (`createStatePort`, `createAtomPort`, `createDerivedPort`) that return `DirectedPort<TService, TName, "outbound">`
- **State adapters** (`createStateAdapter`, `createAtomAdapter`, `createDerivedAdapter`) that return `Adapter<TProvides, TRequires, TLifetime, ...>`
- **Signal-based reactivity** with glitch-free batching, diamond dependency solving, and fine-grained subscriptions
- **Effect-as-port pattern** for cross-cutting concerns (logging, persistence, analytics) via `createEffectAdapter` — branded DI-managed adapters
- **Store introspection** (`StoreInspectorPort` via explicit `createStoreInspectorAdapter()`) for runtime visibility into state, action history, subscriber graphs, and effect status
- **React hooks** (`useStateValue`, `useActions`, `useAtom`, `useDerived`, `useAsyncDerived`, `useAsyncDerivedSuspense`) in `@hex-di/store-react`
- **Test utilities** (mock adapters, state assertions, scope-isolated test helpers) in `@hex-di/store-testing`

### What this package does NOT provide

- No separate Store runtime or factory (`createStore`)
- No global middleware pipeline
- No thunks or action creators with side effects
- No string-based dispatch (`store.dispatch(port, "actionName")`)
- No custom StatePort or SelectorPort types that bypass core Port

### 0.1.0 Scope

- `createStatePort` / `createStateAdapter` -- object state with typed actions
- `createAtomPort` / `createAtomAdapter` -- simple reactive values
- `createDerivedPort` / `createDerivedAdapter` -- synchronous computed state
- `createAsyncDerivedPort` / `createAsyncDerivedAdapter` -- async computed state
- Effect-as-port pattern -- cross-cutting concerns as DI adapters
- Signal-based reactivity engine with batching and diamond solving
- Container lifecycle integration (mount, scoping, disposal)
- React hooks (`useStateValue`, `useActions`, `useAtom`, `useDerived`, `useAsyncDerived`, `useAsyncDerivedSuspense`)
- Testing utilities (mock adapters, state assertions, action recorder)
- Typed effect errors via `Result<T, E>` (`EffectFailedError`, `AsyncDerivedSelectError`, `HydrationError`)
- Bidirectional derived state (`createLinkedDerivedPort`)
- Store introspection (`StoreInspectorPort`)
- Optimistic updates, undo/redo, multi-tenant, hydration patterns

> **State machines:** For state machine functionality, see [`@hex-di/flow`](../../libs/flow/core) which provides branded types, pure transitions, activities, guards, and effect composition with full HexDI integration.

## 2. Philosophy

### State is a service

In HexDI, services are provided through ports and implemented by adapters. State is no different. A counter's state is a service that provides a reactive value and bound actions. The port declares the type contract (state shape, action signatures). The adapter provides the full implementation (initial state, reducer functions, lifetime, effects, DI wiring).

### Ports are types, adapters are implementations

In the HexDI ecosystem, ports are purely phantom-typed tokens — they carry type information but no runtime behavior. `@hex-di/flow`'s `createFlowPort` only wraps `port<FlowService>()({ name })` — the machine definition lives in the adapter config. `@hex-di/store` follows the same pattern: `createStatePort` declares what service type is provided (the state shape and action signatures as phantom types), and `createStateAdapter` provides the implementation (initial state, reducer functions, lifetime, effects).

This means reducers live in the adapter, not the port. The port says "this port provides a `StateService<CounterState, CounterActions>`" — the adapter says "here is the initial state, here are the reducer functions, here is the lifetime." What you swap in tests is the entire adapter: different initial state, no effects, mock dependencies. The port contract remains stable.

### Container is the runtime

HexDI's Container already manages instance creation, scoping, disposal, and dependency resolution. Adding a separate Store runtime creates two independent systems that must be synchronized. Instead, state adapters participate in Container's existing lifecycle:

- `lifetime: "singleton"` -- one state instance per root container
- `lifetime: "scoped"` -- one state instance per scope (forms, tenants, sessions)
- Container disposal cleans up subscriptions
- Container scoping creates isolated state trees

### Effects replace middleware

Global middleware has three problems in a DI system:

1. Middleware cannot declare dependencies -- it floats outside the graph
2. Middleware ordering is fragile and implicit
3. Middleware cannot be scoped per container

Effect ports solve all three. An `ActionLoggerPort` is a regular `Port<ActionEffect>` with an adapter that declares `requires: [LoggerPort]`. It participates in the dependency graph, gets scoped with Container, and is testable through adapter swapping.

## 3. Package Structure

```
libs/store/
  core/                    # @hex-di/store
    src/
      ports/
        state-port.ts        # createStatePort
        atom-port.ts         # createAtomPort
        derived-port.ts      # createDerivedPort
        index.ts
      adapters/
        state-adapter.ts     # createStateAdapter
        atom-adapter.ts      # createAtomAdapter
        derived-adapter.ts   # createDerivedAdapter
        effect-adapter.ts    # createEffectAdapter
        index.ts
      reactivity/
        signal.ts            # Signal primitives
        computed.ts          # Derived signal computation
        batch.ts             # Glitch-free batching
        graph.ts             # Diamond dependency solver
        index.ts
      inspection/
        store-inspector.ts   # StoreInspectorAPI, StoreInspectorPort
        snapshot.ts          # StoreSnapshot, PortSnapshot
        history.ts           # ActionHistoryEntry, ActionHistoryFilter
        graph.ts             # SubscriberGraph, SubscriberNode, SubscriberEdge
        events.ts            # StoreInspectorEvent
        index.ts
      types/
        state-service.ts     # StateService, AtomService, DerivedService
        actions.ts           # ActionMap, BoundActions, ActionReducer
        deep-readonly.ts     # DeepReadonly utility type
        index.ts
      index.ts               # Public API

  react/                   # @hex-di/store-react
    src/
      hooks/
        use-state-value.ts           # useStateValue hook
        use-actions.ts               # useActions hook
        use-atom.ts                  # useAtom hook
        use-derived.ts               # useDerived hook
        use-async-derived.ts         # useAsyncDerived hook
        use-async-derived-suspense.ts # useAsyncDerivedSuspense hook
        index.ts
      index.ts

  testing/                 # @hex-di/store-testing
    src/
      test-container.ts      # createStateTestContainer
      assertions.ts          # expectState, expectAtom
      recorder.ts            # createActionRecorder
      waiters.ts             # waitForState
      index.ts
```

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  useStateValue  useActions  useAtom  useDerived          │
│  useAsyncDerived  useAsyncDerivedSuspense                │
├─────────────────────────────────────────────────────────┤
│                @hex-di/store-react                        │
│           (hooks resolve ports from Container)           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Container (single runtime)           │   │
│  │                                                   │   │
│  │  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │   │
│  │  │ StatePort │  │ AtomPort │  │ DerivedPort   │  │   │
│  │  │ (counter) │  │ (theme)  │  │ (cartTotal)   │  │   │
│  │  └─────┬─────┘  └────┬─────┘  └──────┬───────┘  │   │
│  │        │              │               │           │   │
│  │  ┌─────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐  │   │
│  │  │  State    │  │  Atom    │  │  Derived     │  │   │
│  │  │  Adapter  │  │  Adapter │  │  Adapter     │  │   │
│  │  └───────────┘  └──────────┘  └──────────────┘  │   │
│  │                                                   │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │         Effect Ports (DI-managed)          │  │   │
│  │  │  ActionLoggerPort  StatePersisterPort      │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                   │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │         StoreInspector (introspection)     │  │   │
│  │  │  Snapshots  ActionHistory  SubscriberGraph │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                   │   │
│  │         Reactivity Engine (signals + graph)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│                    @hex-di/store                          │
├─────────────────────────────────────────────────────────┤
│        @hex-di/core + @hex-di/runtime + @hex-di/result   │
│   Port<T, TName>  Adapter<...>  Container  Result<T, E>  │
└─────────────────────────────────────────────────────────┘
```

### Package Dependencies

| Package                 | Dependencies                              | Peer Dependencies      |
| ----------------------- | ----------------------------------------- | ---------------------- |
| `@hex-di/store`         | `@hex-di/core`, `@hex-di/result`          | `alien-signals >= 1.0` |
| `@hex-di/store-react`   | `@hex-di/store`                           | `react >= 18`          |
| `@hex-di/store-testing` | `@hex-di/store`, `@hex-di/result-testing` | `vitest >= 3.0`        |

### Port/Adapter Alignment

Every store type extends core HexDI types:

| Store Concept              | Extends                                                      | Resolution                              |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `createStatePort(...)`     | `DirectedPort<StateService<T, A>, TName, "outbound">`        | `container.resolve(StatePort)`          |
| `createAtomPort(...)`      | `DirectedPort<AtomService<T>, TName, "outbound">`            | `container.resolve(AtomPort)`           |
| `createDerivedPort(...)`   | `DirectedPort<DerivedService<T>, TName, "outbound">`         | `container.resolve(DerivedPort)`        |
| `createStateAdapter(...)`  | `Adapter<TProvides, TRequires, TLifetime, "sync">`           | Registered via `GraphBuilder.provide()` |
| `createEffectAdapter(...)` | `Adapter<TProvides, TRequires, TLifetime, "sync">` (branded) | Standard DI adapters with effect brand  |

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
