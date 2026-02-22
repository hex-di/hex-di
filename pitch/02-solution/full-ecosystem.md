# The Full HexDI Ecosystem

> Not just a DI container. A complete application platform where every layer speaks the same language.

---

## The Problem With "Library Soup"

A modern TypeScript project typically assembles:
- A DI container (InversifyJS, TSyringe, or manual factories)
- A state management library (Redux, Zustand, Jotai, MobX)
- A data fetching library (React Query, SWR, Axios)
- A logging library (Pino, Winston, Bunyan)
- A tracing library (OpenTelemetry)
- A state machine library (XState, Robot)
- A workflow library (Temporal, custom)
- A testing utilities set (test utilities for each of the above, separately)

Each library has its own mental model, its own patterns, its own testing approach. The team must learn all of them, maintain integration code between them, and rebuild the same patterns (error handling, lifecycle management, observability) for each one.

This is **library soup** — technically functional, architecturally chaotic.

---

## The HexDI Approach: One Model, Every Layer

HexDI is built around a single principle: **every capability is a port, every implementation is an adapter**. This principle scales from dependency injection to state management to workflow orchestration.

Your team learns this model once. It applies everywhere.

---

## The Platform: 30+ Packages, One Mental Model

### Core: The Foundation

| Package | What It Does |
|---|---|
| `@hex-di/core` | Defines typed port tokens — the service contracts |
| `@hex-di/graph` | GraphBuilder — compile-time validated dependency composition |
| `@hex-di/runtime` | Container creation, service resolution, scope management |
| `@hex-di/result` | Rust-style `Result<T, E>` — errors as typed values, not thrown exceptions |

Everything else builds on this foundation. Learn the foundation; the rest follows naturally.

### Observability: Logging and Tracing

| Package | What It Does |
|---|---|
| `@hex-di/logger` | Structured, context-aware logging through the port/adapter pattern |
| `@hex-di/logger-pino` | Pino backend adapter — swap in without changing any logger call site |
| `@hex-di/logger-winston` | Winston backend adapter |
| `@hex-di/logger-bunyan` | Bunyan backend adapter |
| `@hex-di/logger-react` | React hooks for accessing the logger in components |
| `@hex-di/tracing` | Distributed tracing with OpenTelemetry-compatible architecture |
| `@hex-di/tracing-otel` | OpenTelemetry OTLP exporter — connects to any OTEL-compatible backend |
| `@hex-di/tracing-datadog` | Datadog tracing bridge |
| `@hex-di/tracing-jaeger` | Jaeger exporter |
| `@hex-di/tracing-zipkin` | Zipkin exporter |

The key point: **you swap logging or tracing backends by changing one line in the GraphBuilder**. No call site changes. No search-and-replace. The compiler confirms the swap is complete.

### State and Data: The Application Layer

| Package | What It Does |
|---|---|
| `@hex-di/store` | Reactive state management — state as a first-class DI port |
| `@hex-di/store-react` | React hooks: `useStateValue`, `useActions`, `useSelector` |
| `@hex-di/store-testing` | Mock adapters and state assertion utilities |
| `@hex-di/query` | Data fetching and caching — the port *is* the query key (no string keys) |
| `@hex-di/query-react` | React hooks: `useQuery`, `useMutation`, `useInfiniteQuery` |
| `@hex-di/query-testing` | Mock query adapters and assertion utilities |

Traditional data fetching uses string keys (`queryKey: ['users', userId]`). HexDI uses typed port tokens. The compiler validates that the query exists, the parameters match, and the return type is correct — before you run the app.

### Workflow: Flow, Saga

| Package | What It Does |
|---|---|
| `@hex-di/flow` | Typed state machine runtime — effects as port invocations |
| `@hex-di/flow-react` | React hooks for state machines |
| `@hex-di/flow-testing` | Testing utilities for state machine transitions |
| `@hex-di/saga` | Long-running workflow orchestration with automatic rollback compensation |
| `@hex-di/saga-react` | React hooks for saga execution and state |
| `@hex-di/saga-testing` | Mock step adapters and saga assertion utilities |

With `@hex-di/flow`, every side effect in a state machine (calling an API, writing to a database, sending a notification) is a port invocation. In tests, you swap the real adapters for mocks — using exactly the same mechanism you use for unit tests anywhere in HexDI.

With `@hex-di/saga`, multi-step workflows (reserve stock → charge payment → send confirmation) run with automatic rollback: if step 3 fails, steps 2 and 1 are compensated automatically.

### Integration: Framework Connectors

| Package | What It Does |
|---|---|
| `@hex-di/react` | Typed React hooks, ContainerProvider, AutoScopeProvider |
| `@hex-di/hono` | Hono middleware, request-scoped container integration |

### Tooling: Developer Experience

| Package | What It Does |
|---|---|
| `@hex-di/testing` | Override adapters for testing without touching production code |
| `@hex-di/visualization` | DOT and Mermaid export of the dependency graph |
| `@hex-di/graph-viz` | Interactive browser-based graph visualization with zoom/pan |
| `@hex-di/devtools-ui` | DevTools panel for runtime inspection |
| `@hex-di/playground` | Interactive browser sandbox for experimenting |
| `@hex-di/result-testing` | Vitest matchers for `Result<T, E>` assertions |
| `@hex-di/result-react` | React bindings for Result-returning operations |

---

## The Compounding Benefit

When every library follows the same port/adapter pattern:

1. **Testing is uniform** — mock any dependency with the same `TestGraphBuilder.override()` API, regardless of whether it is a logger, a state machine, a query, or a custom service

2. **Observability is uniform** — tracing, logging, and monitoring work the same way across every library. A request that spans a Hono handler, a Flow state machine, a Saga orchestration, and a Query fetch produces a unified trace

3. **Migration is uniform** — swapping any backend (logging, tracing, database) follows the same one-adapter-change pattern

4. **AI generation is uniform** — AI tools that understand the port/adapter pattern can generate correct code for any library in the ecosystem

5. **Onboarding is uniform** — a developer who understands how `@hex-di/core` works understands how every other package works. Learning one thing compounds into understanding everything

---

## The Alternative: The True Cost of Library Soup

A team using one library per concern (InversifyJS + Redux + React Query + Pino + XState + Temporal) is paying:

- **Integration cost**: custom glue code between each pair of libraries
- **Testing cost**: different mock patterns for each library
- **Cognitive cost**: different mental models for each library
- **Maintenance cost**: keeping integrations working as each library releases new major versions
- **Inconsistency cost**: different error handling, different lifecycle, different observability for each library

HexDI replaces this with one platform, one model, one way to test, one way to observe, one way to swap.
