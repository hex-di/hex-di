# @hex-di/runtime

Runtime container layer for [HexDI](https://github.com/hex-di/hex-di). Consumes validated dependency graphs produced by `@hex-di/graph` and turns them into immutable, type-safe containers that resolve and lifetime-manage services.

## Overview

`@hex-di/runtime` sits at the execution boundary of the HexDI stack:

```
@hex-di/core   – ports, adapters, service interfaces
@hex-di/graph  – dependency graph builder & validation
@hex-di/runtime – container factory, resolution, scopes   ← this package
```

It provides:

- **Immutable containers** – frozen objects created from a validated graph
- **Lifetime management** – singleton, scoped, and transient instance caching
- **Scope hierarchy** – per-request or per-operation isolation on top of a root container
- **Child containers** – inherit or override parent registrations, with sync, async, and lazy loading variants
- **Result-based APIs** – `tryResolve` / `tryResolveAsync` / `tryDispose` return `Result`/`ResultAsync` rather than throwing
- **Resolution hooks** – `beforeResolve` / `afterResolve` callbacks for observability and tracing
- **Container inspection** – runtime snapshots of adapters, singletons, and scope trees

## Installation

```bash
pnpm add @hex-di/runtime @hex-di/core @hex-di/graph
```

**Peer dependencies**: Node.js >= 18, TypeScript >= 5.0 (optional but recommended)

## Quick Start

```typescript
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Define ports (interfaces)
interface Logger {
  log(message: string): void;
}
interface Database {
  query(sql: string): Promise<unknown[]>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// 2. Define adapters (implementations)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: msg => console.log(msg) }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: deps => ({
    query: async sql => {
      deps.Logger.log(`Query: ${sql}`);
      return [];
    },
  }),
});

// 3. Build the graph
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

// 4. Create a container
const container = createContainer({ graph, name: "App" });

// 5. Resolve services – fully type-safe
const logger = container.resolve(LoggerPort); // Logger
const db = container.resolve(DatabasePort); // Database

logger.log("ready");
const rows = await db.query("SELECT 1");

// 6. Dispose when done (runs finalizers in LIFO order)
await container.dispose();
```

## Core Concepts

### Container Phases

Containers start in an `"uninitialized"` phase. If the graph contains adapters with **async factories**, call `initialize()` before resolving them synchronously:

```typescript
// Async adapter (no explicit lifetime → async)
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  factory: async () => {
    const conn = await openConnection();
    return { query: conn.query.bind(conn) };
  },
});

const container = createContainer({ graph, name: "App" });

// Option A – initialize first, then resolve synchronously
const initialized = await container.initialize();
const db = initialized.resolve(DatabasePort);

// Option B – always use resolveAsync (works regardless of phase)
const db = await container.resolveAsync(DatabasePort);
```

`tryInitialize()` returns a `ResultAsync` instead of throwing.

### Scopes

Scopes provide per-operation lifetime isolation. Services registered with `lifetime: "scoped"` are created fresh per scope and disposed when the scope is disposed.

```typescript
const RequestContextPort = port<RequestContext>()({ name: "RequestContext" });

const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ requestId: crypto.randomUUID() }),
});

// Handle a request
const scope = container.createScope("request-123");
const ctx = scope.resolve(RequestContextPort); // fresh instance per scope
// singleton services resolve to the same instance as the parent container
const logger = scope.resolve(LoggerPort);

await scope.dispose(); // ctx is finalized; singletons are untouched
```

Scopes can be nested:

```typescript
const childScope = scope.createScope("nested");
```

### Child Containers

Child containers add or override adapters on top of a parent container. They are always in the `"initialized"` phase.

```typescript
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
});

const childGraph = GraphBuilder.create().provide(MockLoggerAdapter).build();
const child = container.createChild(childGraph, { name: "Test" });

const mockLogger = child.resolve(LoggerPort); // uses MockLoggerAdapter
const db = child.resolve(DatabasePort); // delegates to parent
```

#### Async and lazy child containers

```typescript
// Async – graph loaded via dynamic import before use
const pluginContainer = await container.createChildAsync(
  () => import("./plugin-graph").then(m => m.pluginGraph),
  { name: "Plugin" }
);

// Lazy – graph not loaded until first resolve()
const lazyPlugin = container.createLazyChild(
  () => import("./plugin-graph").then(m => m.pluginGraph),
  { name: "LazyPlugin" }
);
console.log(lazyPlugin.isLoaded); // false
const svc = await lazyPlugin.resolve(PluginPort); // triggers load
console.log(lazyPlugin.isLoaded); // true
```

### Inheritance Modes

When creating a child container, control how each inherited port behaves:

```typescript
const child = container.createChild(childGraph, {
  name: "Child",
  inheritanceModes: {
    Logger: "shared", // share parent's singleton instance (default)
    Cache: "isolated", // create a new instance via the same factory
    Config: "forked", // shallow-clone the parent's instance (requires clonable: true)
  },
});
```

### Override Builder

Use `container.override()` for fluent, type-checked adapter replacement (useful in tests):

```typescript
const MockLogger = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
});

const testContainer = container.override(MockLogger).build(); // returns a child container with the override applied
```

The type system rejects overrides for ports not in the graph or adapters with unsatisfied dependencies.

### Resolution Hooks

Hooks are called synchronously on every resolution, enabling tracing and observability:

```typescript
const container = createContainer({
  graph,
  name: "App",
  hooks: {
    beforeResolve: ctx => {
      console.log(`Resolving ${ctx.portName} (depth ${ctx.depth})`);
      if (ctx.isCacheHit) console.log("  cache hit");
    },
    afterResolve: ctx => {
      console.log(`Resolved ${ctx.portName} in ${ctx.duration}ms`);
    },
  },
});
```

Hooks can also be added and removed after container creation:

```typescript
const handler = ctx => tracer.record(ctx);
container.addHook("afterResolve", handler);
// later…
container.removeHook("afterResolve", handler);
```

## Result-Based APIs

All throwing methods have non-throwing counterparts that return `Result` / `ResultAsync` from `@hex-di/result`:

```typescript
// Sync resolution
const result = container.tryResolve(LoggerPort);
if (result.isOk()) {
  result.value.log("hello");
} else {
  console.error(result.error.code); // ContainerError
}

// Async resolution
const asyncResult = await container.tryResolveAsync(DatabasePort);

// Disposal
const disposeResult = await container.tryDispose();
if (disposeResult.isErr()) {
  for (const cause of disposeResult.error.causes) {
    console.error(cause);
  }
}
```

### `resolveResult` and `recordResult`

Helpers for integrating `@hex-di/result` adapters with containers:

```typescript
import { resolveResult, recordResult } from "@hex-di/runtime";

// Resolve a port and return a Result<T, ResolutionError>
const result = resolveResult(() => container.resolve(SomePort));

// Record a Result outcome to an inspector for tracking statistics
const tryResult = container.tryResolve(SomePort);
recordResult(container.inspector, "SomePort", tryResult);
```

## Container Inspection

The `inspect()` function returns a frozen snapshot of container state:

```typescript
import { inspect } from "@hex-di/runtime";

const snapshot = inspect(container);
console.log(snapshot.kind); // "root" | "child" | "lazy" | "scope"
console.log(snapshot.singletons); // cached singleton entries
console.log(snapshot.containerName); // human-readable container name
console.log(snapshot.isDisposed); // whether the container has been disposed
```

The `container.inspector` property provides a richer event-based API used by devtools integrations.

## Error Reference

All errors extend `ContainerError` and carry a stable `code` string for programmatic handling.

| Error class                        | `code`                 | `isProgrammingError` | When thrown                                       |
| ---------------------------------- | ---------------------- | -------------------- | ------------------------------------------------- |
| `CircularDependencyError`          | `CIRCULAR_DEPENDENCY`  | `true`               | Cycle detected in dependency graph                |
| `FactoryError`                     | `FACTORY_FAILED`       | `false`              | Sync factory threw during resolution              |
| `AsyncFactoryError`                | `ASYNC_FACTORY_FAILED` | `false`              | Async factory rejected                            |
| `AsyncInitializationRequiredError` | `ASYNC_INIT_REQUIRED`  | `true`               | Sync resolve of async port before `initialize()`  |
| `ScopeRequiredError`               | `SCOPE_REQUIRED`       | `true`               | Scoped port resolved from root container          |
| `DisposedScopeError`               | `DISPOSED_SCOPE`       | `true`               | Resolution from a disposed scope/container        |
| `NonClonableForkedError`           | `NON_CLONABLE_FORKED`  | `true`               | `forked` inheritance mode on non-clonable adapter |
| `DisposalError`                    | `DISPOSAL_FAILED`      | `false`              | One or more finalizers threw during disposal      |

```typescript
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
} from "@hex-di/runtime";

try {
  container.resolve(SomePort);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error("Cycle:", error.dependencyChain.join(" -> "));
  } else if (error instanceof FactoryError) {
    console.error("Factory failed for:", error.portName, error.cause);
  } else if (error instanceof ContainerError) {
    console.error(error.code, error.isProgrammingError);
  }
}
```

## Type Utilities

```typescript
import type {
  InferContainerProvides, // extract the Port union a container provides
  InferScopeProvides, // same, for a Scope
  IsResolvable, // boolean type: can Port P be resolved from Container C?
  ServiceFromContainer, // extract the service type for a given port
} from "@hex-di/runtime";
```

## Context Variables

For propagating ambient context (e.g. request IDs, tenant IDs) through the resolution graph:

```typescript
import {
  createContextVariableKey,
  getContextVariable,
  setContextVariable,
  getContextVariableOrDefault,
} from "@hex-di/runtime";

const RequestIdKey = createContextVariableKey<string>("requestId");

setContextVariable(ctx, RequestIdKey, "req-abc-123");
const requestId = getContextVariable(ctx, RequestIdKey); // string
```

## Captive Dependency Prevention

The type system enforces that adapters never depend on shorter-lived services. This is checked at the `@hex-di/graph` layer, with the relevant types re-exported here for completeness:

```typescript
import type { IsCaptiveDependency, ValidateCaptiveDependency } from "@hex-di/runtime";
```

Lifetime levels: `singleton` (longest) > `scoped` / `request` > `transient` (shortest). A singleton may not depend on a scoped or transient service.

## Package Exports

| Export path                | Description                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@hex-di/runtime`          | Public API – use this in application code                                                                |
| `@hex-di/runtime/internal` | Implementation classes for sibling packages (`@hex-di/react`, etc.) – **do not use in application code** |

## Related Packages

| Package          | Role                                                 |
| ---------------- | ---------------------------------------------------- |
| `@hex-di/core`   | Port and adapter definitions                         |
| `@hex-di/graph`  | Dependency graph builder and validation              |
| `@hex-di/result` | `Result` / `ResultAsync` type used by `try*` methods |

## License

MIT
