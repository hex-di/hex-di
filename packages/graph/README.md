# @hex-di/graph

The compile-time validation layer of HexDI. Provides a type-safe dependency graph builder that catches missing dependencies, circular references, lifetime violations, and duplicate registrations at compile time — surfacing errors as TypeScript type errors in your IDE before any code runs.

## Installation

```bash
npm install @hex-di/graph @hex-di/core
# or
pnpm add @hex-di/graph @hex-di/core
```

`@hex-di/core` is a required dependency (installed automatically) that provides port and adapter factories.

## Requirements

- **TypeScript 5.0+** — required for the `const` type parameter modifier used to preserve tuple types in `requires` arrays
- **Node.js 18.0+** — minimum supported runtime

## Quick Start

```typescript
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

// 1. Define port types (service interfaces)
interface Logger {
  log(msg: string): void;
}

interface Database {
  query(sql: string): Promise<unknown[]>;
}

// 2. Create port tokens
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// 3. Create adapters (factory + dependency declarations)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(msg),
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: ({ Logger }) => ({
    query: async sql => {
      Logger.log(`Running: ${sql}`);
      return [];
    },
  }),
});

// 4. Build the dependency graph
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build(); // compile error if any dependency is missing

// 5. Pass graph to @hex-di/runtime to create a container
```

## How It Works

### Ports and Adapters

A **port** is a typed token representing a service contract. A **adapter** binds an implementation factory to that contract and declares what other ports it needs.

```typescript
import { port, createAdapter } from "@hex-di/core";

// Port: a typed token
const CachePort = port<Cache>()({ name: "Cache" });

// Adapter: declares what it provides, what it needs, and how to build it
const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort], // typed dependencies
  lifetime: "singleton", // 'singleton' | 'scoped' | 'transient'
  factory: ({ Config }) => ({
    // receives resolved dependencies
    get: key => store.get(key),
    set: (key, val) => store.set(key, val),
  }),
  finalizer: cache => cache.close(), // optional cleanup
});
```

Async factories are also supported. When a factory is async the adapter is automatically treated as a singleton (async initialization runs once at container startup):

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort],
  factory: async ({ Config }) => {
    const conn = await connect(Config.get("DB_URL"));
    return { query: async sql => conn.query(sql) };
  },
  finalizer: async db => db.disconnect(),
});
```

### GraphBuilder

`GraphBuilder` is an immutable fluent builder. Each method call returns a **new** builder instance; the original is unchanged.

```typescript
const base = GraphBuilder.create().provide(LoggerAdapter);

// Branch safely — base is unchanged
const withDb = base.provide(DatabaseAdapter);
const withCache = base.provide(CacheAdapter);
```

The builder tracks state at the type level using phantom type parameters:

- `TProvides` — union of all ports with registered adapters
- `TRequires` — union of all ports that adapters need (narrows as deps are satisfied)

### Compile-Time Validation

`.build()` enforces that `TRequires` is fully satisfied by `TProvides`. Unmet requirements become a TypeScript error:

```typescript
// Missing DatabaseAdapter — compile error
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger and Database
  .provide(LoggerAdapter)
  .build();
// Error: "ERROR[HEX008]: Missing adapters for Database. Call .provide() first."
```

Adding the missing adapter resolves the error:

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build(); // ok
```

Validation runs a three-stage pipeline per `.provide()` call:

1. **Duplicate detection** — same port registered twice
2. **Cycle detection** — type-level DFS up to 50 levels deep (configurable)
3. **Captive dependency detection** — longer-lived service depending on shorter-lived

All three checks report actionable error messages directly in your IDE.

### Lifetime Scopes

| Lifetime      | Instance created              | Use for                                |
| ------------- | ----------------------------- | -------------------------------------- |
| `'singleton'` | Once per container            | Shared resources, connection pools     |
| `'scoped'`    | Once per scope (e.g. request) | Request state, transactions            |
| `'transient'` | Every resolution              | Stateless handlers, isolated instances |

Lifetime rules: a singleton cannot depend on a scoped or transient service (captive dependency). Scoped can depend on scoped or singleton. Transient can depend on anything.

## API Reference

### `GraphBuilder.create()`

Creates an empty builder.

```typescript
const builder = GraphBuilder.create(); // GraphBuilder<never, never>
```

### `GraphBuilder.withMaxDepth<N>()`

Creates a factory for builders with a custom compile-time cycle detection depth (default: 50):

```typescript
const builder = GraphBuilder.withMaxDepth<100>().create();
```

### `GraphBuilder.withExtendedDepth()`

Downgrades depth-limit exceeded from a compile error to a warning, while runtime validation still detects cycles:

```typescript
const builder = GraphBuilder.withExtendedDepth().create();
```

### `GraphBuilder.forParent(parentGraph)`

Creates a builder scoped to a child graph. Use when you need child-container adapters that can depend on ports the parent provides, without those ports being present in the child graph itself:

```typescript
const childGraph = GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter).buildFragment();
```

### `.provide(adapter)`

Registers an adapter. Returns a new builder on success or a template literal error type on a validation failure (duplicate, cycle, or captive dependency):

```typescript
const builder2 = builder1.provide(LoggerAdapter);
```

### `.provideMany(adapters)`

Registers multiple adapters in one call:

```typescript
const graph = GraphBuilder.create()
  .provideMany([LoggerAdapter, DatabaseAdapter, UserServiceAdapter])
  .build();
```

### `.override(adapter)`

Marks an adapter as replacing a parent container's adapter. Used in child graphs:

```typescript
const childGraph = GraphBuilder.forParent(parentGraph)
  .override(MockDatabaseAdapter) // replaces parent's Database
  .buildFragment();
```

Override validation (confirming the port exists in the parent and the types are compatible) happens at compile time when using `forParent()`.

### `.merge(otherBuilder)`

Merges two builders into a single builder. Produces a compile error on lifetime inconsistency or duplicate ports:

```typescript
const merged = builderA.merge(builderB);
```

### `.build()`

Validates that all required ports are satisfied and returns a frozen `Graph`. Produces a compile-time error if any dependency is missing:

```typescript
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build(); // Graph<typeof LoggerPort | typeof DatabasePort>
```

### `.buildFragment()`

Like `.build()` but skips the "all deps satisfied" check. Use for child graphs whose unresolved dependencies are provided by the parent container:

```typescript
// ConfigAdapter requires LoggerPort which will come from the parent
const childGraph = GraphBuilder.create().provide(ConfigAdapter).buildFragment(); // no error about missing Logger
```

### `.tryBuild()`

Same compile-time guard as `.build()` but returns a `Result<Graph, GraphBuildError>` instead of throwing at runtime:

```typescript
const result = builder.tryBuild();
if (result.isOk()) {
  const graph = result.value;
}
```

### `.tryBuildFragment()`

Same as `.buildFragment()` but returns a `Result`:

```typescript
const result = builder.tryBuildFragment();
```

### `.inspect(options?)`

Returns a runtime snapshot of the current graph state. Useful for debugging and CI validation:

```typescript
const info = builder.inspect();

console.log(info.summary);
// "Graph(3 adapters, 0 unsatisfied): Logger, Database, UserService"

console.log(info.adapterCount); // 3
console.log(info.provides); // ["Logger (singleton)", "Database (singleton)", ...]
console.log(info.unsatisfiedRequirements); // []
console.log(info.isComplete); // true
console.log(info.maxChainDepth); // 1
console.log(info.dependencyMap); // { Logger: [], Database: ["Logger"], ... }
console.log(info.orphanPorts); // ports provided but required by nobody
console.log(info.depthWarning); // string if depth limit approached, undefined otherwise

for (const s of info.suggestions) {
  console.log(`[${s.type}] ${s.message}`);
  // missing_adapter | depth_warning | orphan_port | disposal_warning
}
```

Pass `{ summary: true }` for a lightweight seven-field summary:

```typescript
const summary = builder.inspect({ summary: true });
console.log(summary.adapterCount, summary.isValid);
```

### `.validate()`

Runs all validations and returns a structured result object without building the graph:

```typescript
const result = builder.validate();
if (!result.valid) {
  for (const err of result.errors) {
    console.error(err.message);
  }
}
```

## Advanced Import Paths

The package exposes three entry points:

| Import path                | Stability | Contents                                                                                     |
| -------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| `@hex-di/graph`            | Stable    | `GraphBuilder`, `Graph`, inference types, error types                                        |
| `@hex-di/graph/advanced`   | Stable    | Everything above + inspection utilities, traversal, error parsing, structured logging, audit |
| `@hex-di/graph/inspection` | Stable    | Runtime inspection utilities only (no compile-time types)                                    |
| `@hex-di/graph/internal`   | Unstable  | Internal types — do not depend on these                                                      |

## Lazy Ports (Breaking Cycles)

When two services genuinely need to reference each other, use `lazyPort` from `@hex-di/core` to break the cycle at the type level:

```typescript
import { port, createAdapter, lazyPort } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";

const UserServicePort = port<UserService>()({ name: "UserService" });
const NotificationPort = port<NotificationService>()({ name: "Notification" });

// UserService depends on Notification normally
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [NotificationPort],
  lifetime: "singleton",
  factory: ({ Notification }) => ({
    notifyUser: id => Notification.send(id, "Hello"),
  }),
});

// Notification depends on UserService lazily to break the cycle
const NotificationAdapter = createAdapter({
  provides: NotificationPort,
  requires: [lazyPort(UserServicePort)], // injected as a thunk
  lifetime: "singleton",
  factory: ({ LazyUserService }) => ({
    send: (id, msg) => {
      const userService = LazyUserService(); // resolve on first use
      console.log(`Notifying ${userService.getName(id)}: ${msg}`);
    },
  }),
});

const graph = GraphBuilder.create()
  .provide(UserServiceAdapter)
  .provide(NotificationAdapter)
  .build(); // no cycle error
```

Key points:

- `lazyPort(SomePort)` produces a dependency named `LazyPortName` (prefixed with `Lazy`)
- The factory receives a thunk `() => T` instead of `T` directly
- Only register the original adapters — lazy adapters are generated automatically
- Call the thunk at usage time, not during factory execution

## Child Graphs and Overrides

Use child graphs to replace parent adapters for testing or environment-specific behaviour:

```typescript
// Production graph
const productionGraph = GraphBuilder.create()
  .provide(ProductionLoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// Test child graph — replaces Logger, adds nothing else
const testFragment = GraphBuilder.forParent(productionGraph)
  .override(MockLoggerAdapter)
  .buildFragment();

// At runtime:
// const parentContainer = Container.create(productionGraph);
// const testContainer = parentContainer.createChild(testFragment);
```

## Runtime Inspection (Advanced)

Import from `@hex-di/graph/inspection` for runtime analysis utilities:

```typescript
import {
  inspectGraph,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  buildDependencyMap,
  topologicalSort,
  findDependencyPath,
  computeDependencyLayers,
} from "@hex-di/graph/inspection";

// Inspect a built graph or builder
const info = inspectGraph(graph);

// Traverse the dependency map
const depMap = buildDependencyMap(graph.adapters);
const layers = computeDependencyLayers(depMap);
// layers[0] — no dependencies (initialize first / in parallel)
// layers[1] — depend only on layer 0
// ...

// Find the path between two ports
const path = findDependencyPath(depMap, "UserService", "Config");
// ["UserService", "Database", "Config"]

// Detect issues at runtime (for graphs deeper than 50 levels)
const cycle = detectCycleAtRuntime(graph.adapters);
const captive = detectCaptiveAtRuntime(graph.adapters);
```

## Error Parsing (Advanced)

Import from `@hex-di/graph/advanced` to programmatically handle graph error messages:

```typescript
import { isGraphError, parseGraphError, GraphErrorCode } from "@hex-di/graph/advanced";

const message = "ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: ...";

if (isGraphError(message)) {
  const parsed = parseGraphError(message);

  switch (parsed?.code) {
    case GraphErrorCode.CIRCULAR_DEPENDENCY:
      console.log("Cycle path:", parsed.details.cyclePath);
      break;
    case GraphErrorCode.CAPTIVE_DEPENDENCY:
      console.log(
        `${parsed.details.dependentLifetime} '${parsed.details.dependentName}' ` +
          `cannot depend on ${parsed.details.captiveLifetime} '${parsed.details.captiveName}'`
      );
      break;
    case GraphErrorCode.DUPLICATE_ADAPTER:
      console.log("Duplicate port:", parsed.details.portName);
      break;
    case GraphErrorCode.MISSING_DEPENDENCY:
      console.log("Missing ports:", parsed.details.missingPorts);
      break;
  }
}
```

Available error codes: `DUPLICATE_ADAPTER`, `CIRCULAR_DEPENDENCY`, `CAPTIVE_DEPENDENCY`, `REVERSE_CAPTIVE_DEPENDENCY`, `LIFETIME_INCONSISTENCY`, `SELF_DEPENDENCY`, `DEPTH_LIMIT_EXCEEDED`, `MISSING_DEPENDENCY`, `MULTIPLE_ERRORS`.

## Type Utilities

All exported from `@hex-di/graph`:

```typescript
import type {
  Graph,
  InferGraphProvides,
  InferGraphRequires,
  InferGraphAsyncPorts,
  InferGraphOverrides,
} from "@hex-di/graph";
```

Adapter inspection types exported from `@hex-di/core`:

```typescript
import type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
} from "@hex-di/core";
```

Validation and error types exported from `@hex-di/graph/advanced`:

```typescript
import type {
  // Dependency satisfaction
  UnsatisfiedDependencies,

  // Compile-time error types
  MissingDependencyError,
  DuplicateProviderError,
  CircularDependencyError,
  CaptiveDependencyError,

  // Cycle detection
  WouldCreateCycle,
} from "@hex-di/graph/advanced";
```

## Compile-Time Cycle Detection Limit

Type-level cycle detection uses a depth-first search capped at **50 levels** by default. Cycles within this depth are caught as compile errors. Deeper cycles pass type validation but are caught at runtime when the container resolves dependencies.

```typescript
// Raise the limit for legitimately deep graphs
const builder = GraphBuilder.withMaxDepth<100>().create();

// Or treat depth-exceeded as a warning instead of an error
const builder = GraphBuilder.withExtendedDepth().create();

// Check depth at runtime
const info = builder.inspect();
if (info.maxChainDepth > 25) {
  console.warn(
    `Deep graph (${info.maxChainDepth} levels) — compile-time cycle detection may be incomplete`
  );
}
```

Most production dependency graphs are well under 15 levels deep. If you are consistently hitting the limit, consider flattening the dependency hierarchy.

## Relationship to Other HexDI Packages

| Package           | Role                                                        |
| ----------------- | ----------------------------------------------------------- |
| `@hex-di/core`    | Port and adapter factories, shared types (required)         |
| `@hex-di/graph`   | Dependency graph construction and validation (this package) |
| `@hex-di/runtime` | Container implementation that consumes a built `Graph`      |

## License

MIT
