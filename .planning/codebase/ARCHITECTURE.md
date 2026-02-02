# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Layered Hexagonal Architecture (Ports & Adapters) with Type-Level Validation

**Key Characteristics:**

- **Three-Layer System**: Core (types/tokens) → Graph (compile-time validation) → Runtime (containers/resolution)
- **Zero Dependencies**: Core package has no external dependencies; layers build upward
- **Type-State Machine**: Compile-time validation using phantom types to track dependency graph state
- **Effect-Oriented**: Immutable builder pattern with zero mutations, inspired by Effect-TS
- **Scoped Lifetime Management**: Three lifetime modes (singleton, scoped, transient) with captive dependency prevention
- **First-Class React Integration**: React-specific packages without global state, SSR-compatible

## Layers

**Core Layer (`@hex-di/core`):**

- Purpose: Foundation building blocks - zero-dependency, pure types and runtime tokens
- Location: `packages/core/src/`
- Contains:
  - `ports/` - Port token factory and types
  - `adapters/` - Adapter types, factories, inference utilities, lazy port support
  - `errors/` - Error codes, classes, parsing utilities
  - `inspection/` - Types for container and graph inspection
  - `collectors/` - Trace collector types and implementations
  - `span/` - Resolution span metrics and builders
  - `utils/` - Type utilities and correlation IDs
- Depends on: Nothing
- Used by: All other packages

**Graph Layer (`@hex-di/graph`):**

- Purpose: Compile-time dependency validation using type-state machine pattern
- Location: `packages/graph/src/`
- Contains:
  - `builder/` - GraphBuilder with provide/merge/override/build methods
  - `graph/` - Graph data structure and types
  - `validation/` - Cycle detection (DFS), captive dependency validation, depth checking
  - `symbols/` - Brand symbols for nominal typing
  - `types/` - Type-level inference for graph structure
- Depends on: @hex-di/core
- Used by: Runtime, Testing, Integrations

**Runtime Layer (`@hex-di/runtime`):**

- Purpose: Container creation and immutable service resolution with lifetime management
- Location: `packages/runtime/src/`
- Contains:
  - `container/` - Container implementations (root, child, lazy) and factory
  - `resolution/` - Resolution engine (sync/async), hooks system
  - `scope/` - Scope management, lifecycle events, disposal
  - `tracing/` - Trace collection during resolution
  - `inspection/` - Container state inspection and inspector API
  - `types/` - Container types, branded types, type guards
  - `captive-dependency.ts` - Runtime captive dependency validation
- Depends on: @hex-di/core, @hex-di/graph
- Used by: React, Flow, Testing, Examples

**Integration Layers:**

- `@hex-di/react` - React hooks, providers (HexDiContainerProvider, HexDiAutoScopeProvider), typed factory pattern
- `@hex-di/flow` - State machine runtime with state/event branding, effect system, activity management
- `@hex-di/flow-react` - React components and hooks for flow state machines
- `@hex-di/hono` - Hono middleware for automatic scope management per request
- `@hex-di/testing` - Mock adapters, test utilities, graph assertions, Vitest integration
- `@hex-di/visualization` - Graph visualization (Mermaid, Dot) and graph-viz React component
- `@hex-di/graph-viz` - Generic React graph renderer with zoom/pan/dagre layout

## Data Flow

**Graph Construction Flow:**

1. Define Ports: Create typed tokens via `createPort<'Name', ServiceType>('Name')`
2. Create Adapters: Use `createAdapter({ provides, requires, lifetime, factory })`
3. Build Graph: Chain adapters via `GraphBuilder.create().provide(adapter1).provide(adapter2).build()`
4. Type Validation: TypeScript validates at each `.provide()` call:
   - Type inference tracks all provided ports (TProvides)
   - Type inference tracks all required ports (TRequires)
   - Cycle detection validates acyclic graph
   - Captive dependency validation ensures lifetime hierarchy
   - Missing dependencies produce compile errors

**Container Resolution Flow:**

1. Graph Created: Validated Graph becomes immutable input to container
2. Container Created: `createContainer(graph)` - immutable container with singleton services initialized
3. Service Resolution:
   - `container.resolve(Port)` - resolve singleton or transient from root
   - `scope = container.createScope()` - create scope for scoped services
   - `scope.resolve(Port)` - resolve within scope (cached per scope)
   - `await scope.dispose()` - cleanup finalizers
4. Async Support:
   - `await container.init()` - initialize async factories
   - `createAsyncContainer(graph)` - container with async initialization

**Tracing Flow:**

1. Resolution Hooks: Hooks system intercepts resolution start/success/error
2. Trace Collection: Optional TraceCollector records ResolutionSpan for each resolution
3. Inspector API: `container.inspector` provides container state snapshots and event listeners
4. DevTools Integration: TraceCollector subscriptions feed data to devtools

## Key Abstractions

**Port System:**

- Purpose: Typed runtime token combining service interface + unique identifier
- Examples: `packages/core/src/ports/`
- Pattern: Brand symbol + factory for structural typing with nominal identity
- Usage: `const LoggerPort = createPort<'Logger', Logger>('Logger')`

**Adapter:**

- Purpose: Implementation wrapper declaring provides, requires, lifetime, factory
- Examples: `packages/core/src/adapters/`
- Pattern: Object literal with type inference from factory parameter
- Types: Sync factories (`() => Service`), async factories (`() => Promise<Service>`)

**Graph:**

- Purpose: Immutable set of adapters with compile-time validation metadata
- Examples: `packages/graph/src/graph/`
- Pattern: Internal runtime array + phantom type parameters for validation
- Built by: GraphBuilder.build() after all validations pass

**Container:**

- Purpose: Immutable service resolver with lifetime management
- Examples: `packages/runtime/src/container/`
- Types: Root (all services), Child (inherits parent singletons), Lazy (deferred graph loading)
- Pattern: Factory functions create specialized implementations based on graph type

**Scope:**

- Purpose: Isolated cache for scoped services within a container
- Examples: `packages/runtime/src/scope/`
- Lifecycle: Created from container, tracks disposed state, emits lifecycle events
- Pattern: Memoization map with finalizer callbacks

**Resolution Hooks:**

- Purpose: Intercept and extend resolution process
- Examples: `packages/runtime/src/resolution/hooks.ts`
- Pattern: Immutable configuration with hook functions for beforeResolve/afterResolve/onError

## Entry Points

**Core (`@hex-di/core`):**

- Location: `packages/core/src/index.ts`
- Triggers: Imported by applications needing ports, adapters, or errors
- Responsibilities: Export port/adapter factories, error types, inspection types

**Graph (`@hex-di/graph`):**

- Location: `packages/graph/src/index.ts` (primary) and `packages/graph/src/advanced.ts`
- Triggers: Imported when building dependency graphs
- Responsibilities: GraphBuilder factory, type inference, validation utilities

**Runtime (`@hex-di/runtime`):**

- Location: `packages/runtime/src/index.ts`
- Triggers: Imported to create and resolve from containers
- Responsibilities: Container factory, error classes, inspection API, tracing API

**React (`@hex-di/react`):**

- Location: `packages/react/src/index.ts`
- Triggers: Used in React applications
- Responsibilities: `createTypedHooks`, Provider components, typed hooks (usePort, useContainer, useScope)

**Flow (`@hex-di/flow`):**

- Location: `packages/flow/src/index.ts`
- Triggers: Used for state machine-driven UIs
- Responsibilities: Machine factory, Effect system, Activity management, Runner factory

## Error Handling

**Strategy:** Layered error hierarchy with specific error classes for different concerns

**Patterns:**

- `ContainerError` base class in `@hex-di/core` (types only)
- `CircularDependencyError` - graph validation failure (compile-time or runtime detection)
- `CaptiveDependencyError` - lifetime hierarchy violation
- `FactoryError` - factory function threw exception
- `AsyncFactoryError` - async factory failed
- `DisposedScopeError` - resolution attempted on disposed scope
- `ScopeRequiredError` - scoped service resolution without scope
- `FlowError` - state machine errors (InvalidStateError, InvalidTransitionError, etc.)
- Parse utilities in `packages/core/src/errors/parsing.ts` extract details from errors

## Cross-Cutting Concerns

**Logging:**

- No built-in logging framework
- Applications use standard `console.*` or bring Logger as port/adapter
- Tracing system records detailed resolution events via TraceCollector

**Validation:**

- Graph Layer: Type-level validation in `packages/graph/src/validation/` (cycles, captive deps, depth)
- Runtime: Captive dependency validation in `packages/runtime/src/captive-dependency.ts`
- Factory: createAdapter validates provides/requires/lifetime types

**Authentication:**

- No built-in auth
- Implement as scoped adapter storing auth context
- React integration: Inject via usePort in authenticated component tree

**Tracing:**

- ResolutionSpan objects record timing/hierarchy via `packages/core/src/span/`
- MemoryCollector stores spans in-memory (packages/core/src/collectors/memory.ts)
- Inspector API provides real-time container state snapshots
- Flow package has separate FlowCollector for state machine tracing

---

_Architecture analysis: 2026-02-01_
