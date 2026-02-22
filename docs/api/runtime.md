---
title: "@hex-di/runtime"
description: API reference for @hex-di/runtime providing Containers, Scopes, error classes, and type-safe service resolution.
sidebar_position: 3
sidebar_label: "@hex-di/runtime"
---

# @hex-di/runtime API Reference

The runtime layer of HexDI that creates containers from validated graphs and provides type-safe service resolution with lifetime management.

## Installation

```bash
pnpm add @hex-di/runtime
```

## Overview

`@hex-di/runtime` provides:
- `createContainer()` - Factory for creating root containers
- `Container`, `Scope`, `LazyContainer` types
- Error classes for runtime failures
- Type utilities for container introspection
- Inspector API for DevTools

## Functions

### createContainer

Creates an immutable root container from a validated graph.

```typescript
function createContainer<TProvides extends Port<unknown, string>>(
  config: CreateContainerConfig<TProvides>
): Container<TProvides, never, InferGraphAsyncPorts<TGraph>, 'uninitialized'>
```

**Config:**
- `graph` (required) - A validated Graph from `GraphBuilder.build()`
- `name` (required) - Container identifier used in errors, DevTools, and tracing
- `hooks` (optional) - Resolution lifecycle hooks installed at creation time
- `devtools` (optional) - DevTools visibility and display options
- `performance` (optional) - Performance tuning options
- `safety` (optional) - Protective limits and error reporting options

**Returns:**
- A root container in the `'uninitialized'` phase

**Example:**

```typescript
import { createContainer } from '@hex-di/runtime';

const container = createContainer({ graph, name: "App" });

// Async ports require initialization before sync resolve
await container.initialize();

const logger = container.resolve(LoggerPort);
```

### CreateContainerConfig

```typescript
interface CreateContainerConfig<TProvides> {
  graph: Graph<TProvides>;
  name: string;
  hooks?: ResolutionHooks;
  devtools?: ContainerDevToolsOptions;
  performance?: RuntimePerformanceOptions;
  safety?: RuntimeSafetyOptions;
}

interface ContainerDevToolsOptions {
  discoverable?: boolean; // default: true
  label?: string;         // display label (default: name)
}

interface RuntimePerformanceOptions {
  disableTimestamps?: boolean;       // default: false
  disableTracingWarnings?: boolean;  // default: false
}

interface RuntimeSafetyOptions {
  maxScopeDepth?: number;    // default: 64
  finalizerTimeoutMs?: number; // default: 30_000
  onLifecycleError?: (error: unknown, event: string) => void;
  onFinalizerTimeout?: (portName: string, timeoutMs: number) => void;
}
```

**Example with hooks:**

```typescript
const container = createContainer({
  graph,
  name: "ProductionApp",
  hooks: {
    beforeResolve: (ctx) => {
      console.log(`Resolving ${ctx.portName} (depth: ${ctx.depth})`);
    },
    afterResolve: (ctx) => {
      if (ctx.error === null) {
        metrics.histogram('resolution.duration', ctx.duration);
      }
    },
  },
  performance: {
    disableTimestamps: process.env.NODE_ENV === "production",
  },
  safety: {
    maxScopeDepth: 128,
    finalizerTimeoutMs: 10_000,
  },
});
```

## Types

### `Container<TProvides, TExtends?, TAsyncPorts?, TPhase?>`

Root or child container for type-safe service resolution.

```typescript
type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = 'uninitialized',
>
```

- **`TProvides`** — ports the container resolves (from the graph)
- **`TExtends`** — ports added by a child graph (`never` for root containers)
- **`TAsyncPorts`** — ports with async factories; require `initialize()` before sync resolve
- **`TPhase`** — `'uninitialized'` until `initialize()` is called; `'initialized'` after

#### Resolution methods

```typescript
// Sync resolve (phase-dependent: before initialize(), async ports excluded)
container.resolve(LoggerPort);      // Logger

// Async resolve (always available, regardless of phase)
await container.resolveAsync(DatabasePort);  // Database

// Result-returning variants (no throw)
const r  = container.tryResolve(LoggerPort);       // Result<Logger, ContainerError>
const ra = await container.tryResolveAsync(DatabasePort); // ResultAsync<Database, ContainerError>
```

#### Initialization (root containers only)

`initialize()` and `tryInitialize()` are **only available on root containers** (`TExtends = never`) that are still in the `'uninitialized'` phase.

```typescript
// Resolves all async adapters; returns an initialized container
const initialized = await container.initialize();
// Now all ports (including async) are resolvable synchronously

// Result-returning variant
const result = await container.tryInitialize();
// ResultAsync<Container<..., 'initialized'>, ContainerError>

container.isInitialized; // boolean
```

#### Scope creation

```typescript
const scope = container.createScope();        // auto-named
const scope = container.createScope("Request-123"); // named
```

#### Child containers

```typescript
// Synchronous child (graph must already be built)
const child = container.createChild(childGraph, { name: "Feature" });

// Asynchronous child (for dynamic import / code-splitting)
const child = await container.createChildAsync(
  () => import('./feature-graph').then(m => m.featureGraph),
  { name: "Feature" }
);

// Lazy child (graph loads on first resolve)
const lazy = container.createLazyChild(
  () => import('./feature-graph').then(m => m.featureGraph),
  { name: "Lazy Feature" }
);
lazy.isLoaded;              // false
const svc = await lazy.resolve(FeaturePort); // loads on first call
lazy.isLoaded;              // true
```

#### Hook management

```typescript
const handler = (ctx: ResolutionHookContext) => console.log(ctx.portName);
container.addHook('beforeResolve', handler);
container.addHook('afterResolve', handler);

// Remove using same function reference
container.removeHook('beforeResolve', handler);
```

#### Runtime overrides

`container.override()` creates a fluent builder that produces a child container with replacement adapters (validated at compile time):

```typescript
const testContainer = container
  .override(MockLoggerAdapter)
  .override(MockDatabaseAdapter)
  .build();

// Compile-time error if port is not in graph
container.override(UnknownAdapter); // ERROR: Port not found
```

#### State properties

```typescript
container.name;        // "App"
container.parentName;  // null for root, parent.name for child
container.kind;        // "root" | "child"
container.isDisposed;  // boolean
container.parent;      // parent container (child containers only)
container.has(LoggerPort); // boolean
```

#### Disposal

```typescript
await container.dispose();  // runs finalizers in LIFO order

// Result-returning variant
const r = await container.tryDispose(); // ResultAsync<void, DisposalError>
```

#### Inspector

```typescript
const snapshot = container.inspector.getSnapshot();
const ports    = container.inspector.listPorts();
const kind     = container.inspector.getContainerKind(); // 'root' | 'child' | 'scope'
```

---

### `Scope<TProvides, TAsyncPorts?, TPhase?>`

Child scope for managing scoped service lifetimes within a container.

```typescript
type Scope<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = 'uninitialized',
>
```

Scopes resolve all ports from the parent container but maintain their own cache for `scoped`-lifetime services.

```typescript
const scope = container.createScope("Request-123");

// Singletons - same instance as container
scope.resolve(LoggerPort) === container.resolve(LoggerPort); // true

// Scoped - unique per scope
const session  = scope.resolve(UserSessionPort);
const session2 = scope.resolve(UserSessionPort); // same instance

// Async resolve (always available)
await scope.resolveAsync(DatabasePort);

// Result-returning variants
scope.tryResolve(LoggerPort);          // Result<Logger, ContainerError>
await scope.tryResolveAsync(DbPort);   // ResultAsync<Db, ContainerError>
```

#### Nested scopes

```typescript
const childScope = scope.createScope();
```

#### Lifecycle

```typescript
// Subscribe to disposal events
const unsubscribe = scope.subscribe((event) => {
  // event: 'disposing' | 'disposed'
});
unsubscribe(); // cleanup

// Synchronous disposal state (for useSyncExternalStore)
scope.getDisposalState(); // 'active' | 'disposing' | 'disposed'

await scope.dispose();
const r = await scope.tryDispose(); // ResultAsync<void, DisposalError>

scope.isDisposed; // boolean
scope.has(LoggerPort); // boolean
```

---

### `LazyContainer<TProvides, TExtends?, TAsyncPorts?>`

A lazy-loading child container wrapper. The graph is not loaded until the first `resolve()` or `load()` call.

```typescript
const lazy = container.createLazyChild(
  () => import('./feature-graph').then(m => m.featureGraph),
  { name: "Feature" }
);

// All resolution methods are async (graph may not be loaded yet)
const svc = await lazy.resolve(FeaturePort);
const r   = await lazy.tryResolve(FeaturePort); // ResultAsync

// Pre-load graph explicitly
const child = await lazy.load();
// Now use child as a normal Container

lazy.isLoaded;    // boolean
lazy.isDisposed;  // boolean
lazy.has(port);   // boolean (delegates to parent before load)

await lazy.dispose();
await lazy.tryDispose(); // ResultAsync<void, DisposalError>
```

---

### `ContainerPhase`

```typescript
type ContainerPhase = 'uninitialized' | 'initialized';
```

Tracks async initialization state. Before `initialize()`, async ports cannot be resolved synchronously.

---

### `OverrideBuilder`

Returned by `container.override()`. Provides a fluent API for creating child containers with replacement adapters.

```typescript
interface OverrideBuilder<TProvides, TOverrides?, TAsyncPorts?, TPhase?> {
  override(adapter: AdapterConstraint): OverrideBuilder<...>;
  build(): Container<TProvides, never, TAsyncPorts, 'initialized'>;
}
```

```typescript
const testContainer = container
  .override(MockLoggerAdapter)
  .override(MockDatabaseAdapter)
  .build();
```

---

### `ResolutionHookContext`

Passed to `beforeResolve` and `afterResolve` hook handlers.

```typescript
interface ResolutionHookContext {
  readonly port: Port<unknown, string>;
  readonly portName: string;
  readonly lifetime: Lifetime;          // 'singleton' | 'scoped' | 'transient'
  readonly scopeId: string | null;
  readonly scopeName: string | undefined;
  readonly parentPort: Port<unknown, string> | null;
  readonly isCacheHit: boolean;
  readonly depth: number;               // 0 = top-level resolution
  readonly containerId: string;
  readonly containerKind: 'root' | 'child' | 'lazy' | 'scope';
  readonly inheritanceMode: 'shared' | 'forked' | 'isolated' | null;
  readonly parentContainerId: string | null;
  readonly duration: number;            // 0 before resolution completes
  readonly error: Error | null;         // null before resolution completes
}
```

---

## Type Utilities

### `InferContainerProvides<C>`

Extracts the `TProvides` type parameter from a Container (base provides only, not extensions).

```typescript
type Provides = InferContainerProvides<typeof container>;
// typeof LoggerPort | typeof UserServicePort | ...
```

### `InferContainerEffectiveProvides<C>`

Extracts the full effective provides (`TProvides | TExtends`) from a Container. Use this for child containers.

```typescript
type AllPorts = InferContainerEffectiveProvides<typeof child>;
// TProvides | TExtends
```

### `InferScopeProvides<S>`

Extracts the `TProvides` type from a Scope.

```typescript
type Provides = InferScopeProvides<typeof scope>;
```

### `IsResolvable<C, P>`

`true` if port `P` is resolvable from container or scope `C`.

```typescript
type CanResolve = IsResolvable<typeof container, typeof LoggerPort>;
// true or false
```

### `ServiceFromContainer<C, P>`

Gets the service type for a port from a container or scope. Returns `never` if the port is not resolvable.

```typescript
type LoggerType = ServiceFromContainer<typeof container, typeof LoggerPort>;
// Logger
```

### `IsRootContainer<C>`

`true` if `C` is a root container (`TExtends = never`).

```typescript
type IsRoot = IsRootContainer<typeof container>; // true
```

### `IsChildContainer<C>`

`true` if `C` is a child container (`TExtends` is not `never`).

```typescript
type IsChild = IsChildContainer<typeof child>; // true
```

---

## Error Classes

All errors extend `ContainerError`:

```typescript
abstract class ContainerError extends Error {
  abstract readonly code: string;
  readonly isProgrammingError: boolean;
}
```

| Class | Code | Description |
|---|---|---|
| `CircularDependencyError` | `CIRCULAR_DEPENDENCY` | Circular dependency detected |
| `FactoryError` | `FACTORY_FAILED` | Sync factory function threw |
| `AsyncFactoryError` | `ASYNC_FACTORY_FAILED` | Async factory function threw |
| `DisposedScopeError` | `DISPOSED_SCOPE` | Resolved from disposed container/scope |
| `ScopeRequiredError` | `SCOPE_REQUIRED` | Scoped service resolved from root container |
| `AsyncInitializationRequiredError` | `ASYNC_INIT_REQUIRED` | Async port resolved before `initialize()` |
| `NonClonableForkedError` | `NON_CLONABLE_FORKED` | Forked adapter is not cloneable |
| `DisposalError` | `DISPOSAL_FAILED` | One or more finalizers threw during disposal |
| `FinalizerTimeoutError` | `FINALIZER_TIMEOUT` | Finalizer exceeded `finalizerTimeoutMs` |
| `ScopeDepthExceededError` | `SCOPE_DEPTH_EXCEEDED` | Scope nesting exceeded `maxScopeDepth` |

**Examples:**

```typescript
// Prefer tryResolve — returns Result<T, ContainerError>, never throws
const circularResult = container.tryResolve(ServiceAPort);
if (circularResult.isErr()) {
  const { error } = circularResult;
  if (error instanceof CircularDependencyError) {
    console.log(error.dependencyChain);
    // ['ServiceA', 'ServiceB', 'ServiceA']
  }
}

const dbResult = container.tryResolve(DatabasePort);
if (dbResult.isErr()) {
  const { error } = dbResult;
  if (error instanceof FactoryError) {
    console.log(error.portName); // 'Database'
    console.log(error.cause);    // Original error
  }
  if (error instanceof AsyncInitializationRequiredError) {
    // Call await container.initialize() before sync resolve
  }
}
```

---

## Captive Dependency Detection

A captive dependency occurs when a longer-lived service holds a reference to a shorter-lived one (e.g. a Singleton depending on a Scoped service). HexDI detects this at compile time via a template literal error type on `.provide()`:

```
"ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'.
Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton."
```

The call to `.provide()` that introduces the captive relationship returns this error string type, making any further use of that builder a compile error.

---

## Re-exports

`@hex-di/runtime` re-exports from sibling packages:
- From `@hex-di/core`: `Port`, `DirectedPort`, `InferService`, `InferPortName`
- From `@hex-di/graph`: `Graph`, `Adapter`, `Lifetime`, etc.

---

## Usage Example

```typescript
import { createContainer, FactoryError, CircularDependencyError } from '@hex-di/runtime';
import { fromPromise } from '@hex-di/result';

// Create root container (starts uninitialized)
const container = createContainer({ graph, name: "App" });

// Initialize async ports (e.g. database connection)
const initialized = await container.initialize();

// Resolve singletons from initialized container
const loggerResult = initialized.tryResolve(LoggerPort);
if (loggerResult.isErr()) {
  await initialized.tryDispose();
  return;
}
const logger = loggerResult.value;

// Use scopes for scoped services
const scope = initialized.createScope("Request-123");

const workResult = await scope.tryResolve(UserSessionPort)
  .andThen(() => scope.tryResolve(UserServicePort))
  .asyncAndThen((userService) => fromPromise(userService.doWork(), (e) => e));

await scope.tryDispose();

if (workResult.isErr()) {
  const { error } = workResult;
  if (error instanceof FactoryError) {
    logger.error(`Factory failed: ${error.portName}`);
  } else if (error instanceof CircularDependencyError) {
    logger.error(`Circular: ${error.dependencyChain.join(' -> ')}`);
  }
}

// Cleanup
await container.tryDispose();
```
