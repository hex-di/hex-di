# @hex-di/graph

The compile-time validation layer of HexDI providing dependency graph construction with type-safe adapter registration and actionable error messages.

## Installation

```bash
npm install @hex-di/graph @hex-di/ports
# or
pnpm add @hex-di/graph @hex-di/ports
# or
yarn add @hex-di/graph @hex-di/ports
```

> **Note:** `@hex-di/ports` is a peer dependency and must be installed alongside `@hex-di/graph`.

## Requirements

- **TypeScript 5.0+** - Required for the `const` type parameter modifier that preserves tuple types in `requires` arrays
- **Node.js 18.0+** - Minimum supported runtime version

## Quick Start

### Using `defineService` (Recommended)

The `defineService` helper combines port and adapter creation in one step with sensible defaults:

```typescript
import { defineService, GraphBuilder } from "@hex-di/graph";

// Define service interfaces
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// Define services - port and adapter in one step
const [LoggerPort, LoggerAdapter] = defineService<"Logger", Logger>("Logger", {
  // defaults: requires=[], lifetime="singleton"
  factory: () => ({
    log: msg => console.log(msg),
  }),
});

const [DatabasePort, DatabaseAdapter] = defineService<"Database", Database>("Database", {
  requires: [LoggerPort],
  factory: ({ Logger }) => {
    Logger.log("Initializing database...");
    return {
      query: async sql => {
        /* ... */
      },
    };
  },
});

const [UserServicePort, UserServiceAdapter] = defineService<"UserService", UserService>(
  "UserService",
  {
    requires: [LoggerPort, DatabasePort],
    lifetime: "scoped",
    factory: ({ Logger, Database }) => ({
      getUser: async id => {
        Logger.log(`Fetching user ${id}`);
        const result = await Database.query(`SELECT * FROM users WHERE id = '${id}'`);
        return result as { id: string; name: string };
      },
    }),
  }
);

// Build the dependency graph
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// graph is ready for use with @hex-di/runtime
```

### Using `createPort` and `createAdapter` (Explicit)

For more control, use the lower-level APIs separately:

```typescript
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";

// Create port tokens
const LoggerPort = createPort<"Logger", Logger>("Logger");

// Create adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: msg => console.log(msg),
  }),
});
```

## Core Concepts

### Adapters

An adapter is a typed declaration that connects a service implementation to a port. It captures:

1. **Provides** - Which port this adapter satisfies
2. **Requires** - Which ports this adapter depends on
3. **Lifetime** - How long service instances should live
4. **Factory** - A function that creates the service instance

```typescript
const MyAdapter = createAdapter({
  provides: MyPort, // Single port this adapter implements
  requires: [DepA, DepB], // Array of port dependencies
  lifetime: "singleton", // 'singleton' | 'scoped' | 'transient'
  factory: deps => {
    // Receives typed dependencies object
    return new MyServiceImpl(deps.DepA, deps.DepB);
  },
});
```

### GraphBuilder

The `GraphBuilder` is an immutable builder that accumulates adapters and tracks dependencies at the type level:

```typescript
const builder1 = GraphBuilder.create(); // GraphBuilder<never, never>
const builder2 = builder1.provide(LoggerAdapter); // GraphBuilder<LoggerPort, never>
const builder3 = builder2.provide(UserServiceAdapter); // GraphBuilder<LoggerPort | UserServicePort, LoggerPort | DatabasePort>
```

Each `.provide()` call returns a **new** builder instance. The original is unchanged.

### Lifetime Scopes

| Lifetime      | Description                            | Use Case                             |
| ------------- | -------------------------------------- | ------------------------------------ |
| `'singleton'` | One instance for entire application    | Shared resources, connection pools   |
| `'scoped'`    | One instance per scope (e.g., request) | Request-specific state, transactions |
| `'transient'` | New instance every resolution          | Stateful services, isolation needed  |

### Compile-Time Validation

The graph validates dependencies at compile time. When you call `.build()`, TypeScript checks that all required ports are provided:

```typescript
// This compiles - all dependencies satisfied
const valid = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter) // requires Logger - satisfied
  .build();

// This produces a compile error - Database is missing
const invalid = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger AND Database
  .provide(LoggerAdapter) // provides Logger, but Database missing
  .build();
// Error: Type 'MissingDependencyError<typeof DatabasePort>' is not assignable...
// __message: "Missing dependencies: Database"
```

## Compile-Time Error Examples

### Missing Dependencies

When required dependencies are not provided, you get a clear error message:

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  // ...
});

const graph = GraphBuilder.create().provide(UserServiceAdapter).build(); // Error!
```

**Error message in IDE:**

```
Type 'MissingDependencyError<...>' is not assignable to type 'Graph<...>'
  __message: "Missing dependencies: Logger" | "Missing dependencies: Database"
```

**Fix:** Add the missing adapters:

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build(); // OK!
```

### Duplicate Providers

When the same port is provided twice, you get an error:

```typescript
const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  // ...
});

const FileLoggerAdapter = createAdapter({
  provides: LoggerPort, // Same port!
  // ...
});

const graph = GraphBuilder.create()
  .provide(ConsoleLoggerAdapter)
  .provide(FileLoggerAdapter) // Error!
  .build();
```

**Error message in IDE:**

```
Type 'DuplicateProviderError<...>' is not assignable...
  __message: "Duplicate provider for: Logger"
```

## API Reference

### `defineService(name, config)` (Recommended)

Creates a port and adapter in a single step with sensible defaults.

#### Parameters

| Parameter | Type     | Description                       |
| --------- | -------- | --------------------------------- |
| `name`    | `string` | Unique name for the port          |
| `config`  | `object` | Service configuration (see below) |

#### Config Properties

| Property    | Type                 | Default       | Description                             |
| ----------- | -------------------- | ------------- | --------------------------------------- |
| `requires`  | `readonly Port[]`    | `[]`          | Array of port dependencies              |
| `lifetime`  | `Lifetime`           | `"singleton"` | Service lifetime scope                  |
| `factory`   | `(deps) => T`        | (required)    | Factory function                        |
| `finalizer` | `(instance) => void` | (optional)    | Cleanup function called during disposal |

#### Returns

`readonly [Port<T, TName>, Adapter<...>]` - A frozen tuple of port and adapter.

#### Examples

```typescript
// Minimal - no deps, singleton (default)
const [LoggerPort, LoggerAdapter] = defineService<"Logger", Logger>("Logger", {
  factory: () => new ConsoleLogger(),
});

// With dependencies
const [UserServicePort, UserServiceAdapter] = defineService<"UserService", UserService>(
  "UserService",
  {
    requires: [LoggerPort, DatabasePort],
    lifetime: "scoped",
    factory: ({ Logger, Database }) => new UserServiceImpl(Logger, Database),
  }
);

// With finalizer
const [DbPort, DbAdapter] = defineService<"Database", Database>("Database", {
  factory: () => new DatabaseConnection(),
  finalizer: db => db.close(),
});
```

### `defineAsyncService(name, config)`

Creates a port and async adapter in a single step. Async services are always singletons.

> **Why are async services singleton-only?**
>
> Async services typically involve expensive initialization (database connections, file loading, external API authentication). Running async initialization per-request would be inefficient and could exhaust resources. The `initialize()` method in `@hex-di/runtime` runs all async adapters at container startup in priority order, which relies on singleton semantics.
>
> For per-request async operations, use a singleton service that exposes async methods rather than an async factory.

#### Parameters

| Parameter | Type     | Description                       |
| --------- | -------- | --------------------------------- |
| `name`    | `string` | Unique name for the port          |
| `config`  | `object` | Service configuration (see below) |

#### Config Properties

| Property       | Type                   | Default  | Description                   |
| -------------- | ---------------------- | -------- | ----------------------------- |
| `requires`     | `readonly Port[]`      | `[]`     | Array of port dependencies    |
| `factory`      | `(deps) => Promise<T>` | required | Async factory function        |
| `initPriority` | `number`               | `100`    | Initialization order (0-1000) |
| `finalizer`    | `(instance) => void`   | optional | Cleanup function              |

#### Returns

`readonly [Port<T, TName>, Adapter<..., "singleton", "async">]` - A frozen tuple.

#### Example

```typescript
const [ConfigPort, ConfigAdapter] = defineAsyncService<"Config", Config>("Config", {
  factory: async () => await loadConfigFromFile(),
  initPriority: 10, // Initialize early
});

const [DatabasePort, DatabaseAdapter] = defineAsyncService<"Database", Database>("Database", {
  requires: [ConfigPort],
  factory: async ({ Config }) => await connectToDb(Config.dbUrl),
});
```

### `createAdapter(config)`

Creates a typed adapter with dependency metadata.

#### Config Properties

| Property   | Type              | Description                                                   |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `provides` | `Port<T, string>` | The port this adapter implements                              |
| `requires` | `readonly Port[]` | Array of port dependencies (empty array for none)             |
| `lifetime` | `Lifetime`        | Service lifetime: `'singleton'`, `'scoped'`, or `'transient'` |
| `factory`  | `(deps) => T`     | Factory function receiving resolved dependencies              |

#### Returns

`Adapter<TProvides, TRequires, TLifetime>` - A frozen adapter object.

#### Example

```typescript
import { createAdapter } from "@hex-di/graph";

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: deps => {
    const ttl = deps.Config.get("cache.ttl");
    return new RedisCache({ ttl });
  },
});
```

#### Adapter Clonability (`clonable`)

The `clonable` flag controls whether an adapter's instances can be used with forked inheritance mode in child containers.

| Property   | Type      | Default | Description                                    |
| ---------- | --------- | ------- | ---------------------------------------------- |
| `clonable` | `boolean` | `false` | Whether instances can be safely shallow-cloned |

When `clonable: true`, the adapter's instances can be used with forked inheritance mode, which creates a shallow clone for child containers. When `false` (default), forked mode will fail at compile time.

**Mark as clonable only for services that:**

- Have no resource handles (sockets, file handles, connections)
- Have no external references that would become shared
- Are value-like objects where shallow cloning produces valid instances

```typescript
// Value object - safe to clone
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  clonable: true, // Safe: pure data, no handles
  factory: () => ({
    get: key => process.env[key],
  }),
});

// Resource holder - NOT safe to clone
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  clonable: false, // Unsafe: holds connection pool
  factory: deps => {
    const pool = createPool(deps.Config.get("DB_URL"));
    return { query: sql => pool.query(sql) };
  },
});
```

**Type Inference:**

```typescript
import { InferClonable, IsClonableAdapter } from "@hex-di/graph";

type IsClonable = InferClonable<typeof ConfigAdapter>; // true
type Check = IsClonableAdapter<typeof DatabaseAdapter>; // false
```

### `GraphBuilder.create()`

Creates a new empty GraphBuilder.

#### Returns

`GraphBuilder<never, never>` - An empty, frozen builder.

### `GraphBuilder.provide(adapter)`

Registers an adapter with the graph, returning a new builder.

#### Parameters

| Parameter | Type      | Description             |
| --------- | --------- | ----------------------- |
| `adapter` | `Adapter` | The adapter to register |

#### Returns

- On success: `GraphBuilder<TProvides | AdapterProvides, TRequires | AdapterRequires>`
- On duplicate: `DuplicateProviderError<DuplicatePort>`

### `GraphBuilder.provideMany(adapters)`

Registers multiple adapters at once, returning a new builder. This is a convenience method for batch registration.

#### Parameters

| Parameter  | Type        | Description                   |
| ---------- | ----------- | ----------------------------- |
| `adapters` | `Adapter[]` | Array of adapters to register |

#### Returns

- On success: `GraphBuilder<TProvides | AllAdapterProvides, TRequires | AllAdapterRequires>`
- On duplicate: `DuplicateProviderError<DuplicatePort>`

#### Example

```typescript
// Instead of chaining multiple .provide() calls:
const graph = GraphBuilder.create()
  .provideMany([LoggerAdapter, DatabaseAdapter, UserServiceAdapter])
  .build();

// Equivalent to:
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();
```

### `GraphBuilder.override(adapter)`

Registers an adapter as an override for a parent container's adapter. Use this when building child graphs that need to replace a parent's adapter (e.g., test mocks, environment-specific implementations).

#### Parameters

| Parameter | Type      | Description                        |
| --------- | --------- | ---------------------------------- |
| `adapter` | `Adapter` | The adapter to mark as an override |

#### Returns

- On success: `GraphBuilder<TProvides | AdapterProvides, TRequires | AdapterRequires>` with override tracking
- On duplicate: `DuplicateProviderError<DuplicatePort>`

#### Important Limitation

Override validation is performed at **runtime**, not compile time. The type system does not verify that the overridden port exists in the parent container.

#### Example

```typescript
// Parent provides production Logger
const parentGraph = GraphBuilder.create()
  .provide(ProductionLoggerAdapter)
  .provide(DatabaseAdapter)
  .build();

// Child overrides Logger with mock for testing
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: vi.fn(),
  }),
});

const childFragment = GraphBuilder.create()
  .override(MockLoggerAdapter) // Replaces parent's Logger
  .provide(CacheAdapter) // Adds new Cache port
  .buildFragment();

// Create child container with overrides
const childContainer = parentContainer.createChild(childFragment);
```

### `GraphBuilder.build()`

Validates and builds the dependency graph.

#### Returns

- On success: `Graph<TProvides>` - The validated graph
- On missing deps: `MissingDependencyError<MissingPorts>` - Error type

### `GraphBuilder.buildFragment()`

Builds a graph fragment for child containers **without** validating that all dependencies are satisfied internally.

#### Returns

`Graph<TProvides, TAsyncPorts, TOverrides>` - Always returns a Graph (no error type)

#### When to Use

| Method            | Use When                        | Validates Dependencies |
| ----------------- | ------------------------------- | ---------------------- |
| `build()`         | Creating root container graphs  | Yes                    |
| `buildFragment()` | Creating child container graphs | No                     |

#### Example

```typescript
// ConfigAdapter requires LoggerPort which parent provides
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [LoggerPort], // Will come from parent
  lifetime: "scoped",
  factory: deps => ({
    getValue: key => {
      deps.Logger.log(`Getting config: ${key}`);
      return process.env[key];
    },
  }),
});

// Use buildFragment() when dependencies come from parent
const childGraph = GraphBuilder.create().provide(ConfigAdapter).buildFragment(); // No error about missing Logger

// build() would produce error:
// "ERROR: Missing adapters for Logger. Call .provide() first."
```

#### Root vs Child Graph Pattern

```typescript
// Root graph - all dependencies must be satisfied
const rootGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build(); // Validates completeness

// Child graph - can depend on parent's adapters
const childGraph = GraphBuilder.create()
  .override(MockDatabaseAdapter) // Override parent's Database
  .provide(CacheAdapter) // Add new service
  .buildFragment(); // Skip validation

const rootContainer = Container.create(rootGraph);
const childContainer = rootContainer.createChild(childGraph);
```

### Type Utilities

#### `Adapter<TProvides, TRequires, TLifetime>`

The branded adapter type capturing the full contract.

```typescript
type MyAdapter = Adapter<typeof LoggerPort, never, "singleton">;
```

#### `Graph<TProvides>`

The validated graph returned by `.build()`.

```typescript
type MyGraph = Graph<typeof LoggerPort | typeof DatabasePort>;
```

#### `Lifetime`

Union type of lifetime options.

```typescript
type Lifetime = "singleton" | "scoped" | "transient";
```

#### `ResolvedDeps<TRequires>`

Maps a port union to a typed dependencies object.

```typescript
type Deps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
// { Logger: Logger; Database: Database }
```

#### `InferAdapterProvides<A>`

Extracts the provided port from an adapter.

```typescript
type Provided = InferAdapterProvides<typeof LoggerAdapter>;
// typeof LoggerPort
```

#### `InferAdapterRequires<A>`

Extracts the required ports union from an adapter.

```typescript
type Required = InferAdapterRequires<typeof UserServiceAdapter>;
// typeof LoggerPort | typeof DatabasePort
```

#### `InferAdapterLifetime<A>`

Extracts the lifetime literal from an adapter.

```typescript
type Life = InferAdapterLifetime<typeof LoggerAdapter>;
// 'singleton'
```

#### `InferGraphProvides<G>`

Extracts provided ports from a GraphBuilder.

```typescript
type Provided = InferGraphProvides<typeof builder>;
// typeof LoggerPort | typeof DatabasePort
```

#### `InferGraphRequires<G>`

Extracts required ports from a GraphBuilder.

```typescript
type Required = InferGraphRequires<typeof builder>;
// typeof ConfigPort
```

#### `UnsatisfiedDependencies<TProvides, TRequires>`

Computes missing dependencies via union subtraction.

```typescript
type Missing = UnsatisfiedDependencies<typeof LoggerPort, typeof LoggerPort | typeof DatabasePort>;
// typeof DatabasePort
```

#### `IsSatisfied<TProvides, TRequires>`

Boolean type predicate for dependency satisfaction.

```typescript
type Satisfied = IsSatisfied<typeof LoggerPort | typeof DatabasePort, typeof LoggerPort>;
// true
```

#### `MissingDependencyError<MissingPorts>`

Error type with readable message for missing dependencies.

```typescript
type Error = MissingDependencyError<typeof LoggerPort>;
// { __message: "Missing dependencies: Logger"; ... }
```

#### `DuplicateProviderError<DuplicatePort>`

Error type with readable message for duplicate providers.

```typescript
type Error = DuplicateProviderError<typeof LoggerPort>;
// { __message: "Duplicate provider for: Logger"; ... }
```

### Advanced Type Utilities

These utilities are for debugging and advanced use cases.

#### `InspectValidation<B>`

Extracts detailed validation state from a GraphBuilder for debugging. Useful for understanding which validations pass vs fail before calling `build()`.

```typescript
const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter); // Requires Database, Logger

type State = InspectValidation<typeof builder>;
// {
//   provides: typeof LoggerPort | typeof UserServicePort,
//   requires: typeof LoggerPort | typeof DatabasePort,
//   unsatisfiedDeps: typeof DatabasePort,  // Missing!
//   depGraph: { Logger: never, UserService: "Logger" | "Database" },
//   lifetimeMap: { Logger: 1, UserService: 2 }
// }
```

#### `InferGraphAsyncPorts<G>`

Extracts the async ports from a Graph or GraphBuilder.

```typescript
type AsyncPorts = InferGraphAsyncPorts<typeof graph>;
// typeof ConfigPort | typeof DatabasePort (if both are async)
```

#### `InferGraphOverrides<G>`

Extracts the override ports from a Graph or GraphBuilder. Override ports are those added via `override()` method in child graphs.

```typescript
type Overrides = InferGraphOverrides<typeof childGraph>;
// typeof LoggerPort (if Logger was overridden)
```

#### `InferClonable<A>`

Extracts the clonable flag from an adapter.

```typescript
type IsClonable = InferClonable<typeof ConfigAdapter>;
// true | false
```

#### `IsClonableAdapter<A>`

Type predicate for checking if an adapter is clonable.

```typescript
type CanClone = IsClonableAdapter<typeof ConfigAdapter>;
// true
```

#### Cycle Detection Types

##### `WouldCreateCycle<DepGraph, Provides, Requires>`

Type-level predicate that checks if adding an adapter would create a circular dependency.

```typescript
type WouldCycle = WouldCreateCycle<ExistingGraph, "UserService", "Logger" | "Database">;
// true | false
```

##### `CircularDependencyError<Path>`

Error type returned when a cycle is detected during `provide()`.

```typescript
// When detected:
type Error = CircularDependencyError<"A -> B -> C -> A">;
// { __errorBrand: "CircularDependencyError", __cyclePath: "A -> B -> C -> A" }
```

#### Captive Dependency Types

##### `CaptiveDependencyError<Dependent, DepLifetime, Captive, CaptiveLifetime>`

Error type returned when a longer-lived service tries to depend on a shorter-lived one.

```typescript
type Error = CaptiveDependencyError<"UserCache", "Singleton", "RequestContext", "Scoped">;
// Error message: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'
```

## Type-Level Patterns

### Union Subtraction for Dependency Tracking

The graph tracks dependencies using TypeScript's union types and `Exclude`:

```typescript
// Provided ports accumulate via union
type Provided = LoggerPort | DatabasePort;

// Required ports also accumulate via union
type Required = LoggerPort | DatabasePort | ConfigPort;

// Missing = Required - Provided
type Missing = Exclude<Required, Provided>;
// = ConfigPort
```

This pattern, inspired by Effect-TS, enables compile-time dependency verification without runtime checks.

### Template Literal Error Messages

Error types use template literal types to produce readable messages:

```typescript
type MissingDependencyError<P> = {
  __message: `Missing dependencies: ${InferPortName<P>}`;
};

// When P = typeof LoggerPort | typeof DatabasePort
// __message = "Missing dependencies: Logger" | "Missing dependencies: Database"
```

### Immutable Builder Pattern

Following Effect-TS Layer composition, each `.provide()` returns a new builder:

```typescript
const base = GraphBuilder.create().provide(LoggerAdapter);
const withDb = base.provide(DatabaseAdapter);
const withCache = base.provide(CacheAdapter);

// base is unchanged - both withDb and withCache branch from it
```

This enables safe composition patterns without mutation concerns.

### Branded Types for Nominal Typing

Adapters use a branded type pattern for nominal typing:

```typescript
declare const __adapterBrand: unique symbol;

type Adapter<P, R, L> = {
  [__adapterBrand]: [P, R, L]; // Brand carries type params
  // ... other properties
};
```

This ensures two adapters with different type parameters are never compatible, even if structurally similar.

## Limitations

### Compile-Time Cycle Detection Depth Limit

The type-level cycle detection algorithm has a **maximum depth of 30 levels**. This is a conservative limit due to TypeScript's recursion constraints.

**What this means:**

- Cycles at depth 1-30 are detected at compile time with actionable error messages
- Cycles at depth 31+ will **NOT** be detected at compile time (they pass type validation)
- Deep cycles are still caught at runtime when the container attempts resolution

**Why 30?**

| Value       | Pros                                  | Cons                            |
| ----------- | ------------------------------------- | ------------------------------- |
| Lower (20)  | Faster type checking                  | May miss legitimate deep graphs |
| **30**      | Catches most cycles safely (balanced) | Very deep graphs need runtime   |
| Higher (50) | Catches deeper cycles                 | Risks TS2589 errors             |

**If your graph is deeper than 30 levels:**

1. **Architectural Review**: Deep chains often indicate design issues. Consider flattening the hierarchy.

2. **Use `buildFragment()`**: Skip compile-time validation for deep subgraphs, deferring to runtime checks.

3. **Split Graphs**: Build smaller subgraphs independently, then merge at runtime.

4. **Runtime Monitoring**: Use `builder.inspect()` to check `maxChainDepth`:

```typescript
const info = builder.inspect();
if (info.maxChainDepth > 25) {
  console.warn(
    `Deep dependency chain (${info.maxChainDepth}). ` +
      `Cycles beyond depth 30 won't be caught at compile time.`
  );
}
```

> **Note**: Production dependency graphs rarely exceed 15 levels. If you're hitting the 30-level limit, it's worth reconsidering your architecture.

## Integration with HexDI

This package is part of the HexDI ecosystem:

- **@hex-di/ports** - Port token system (peer dependency)
- **@hex-di/graph** - Dependency graph construction (this package)
- **@hex-di/runtime** - Container implementation that consumes graphs
- **@hex-di/react** - React bindings for dependency injection
- **@hex-di/testing** - Testing utilities and mock helpers

## For Maintainers

If you're modifying the type-level validation system, see:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Internal architecture documentation with algorithm explanations
- **[Type-Level Programming Guide](../../docs/advanced/type-level-programming.md)** - Patterns used in the validation system

Key source files:

- `src/validation/cycle-detection.ts` - DFS algorithm for circular dependency detection
- `src/validation/captive-dependency.ts` - Lifetime hierarchy enforcement
- `src/graph/builder.ts` - GraphBuilder with ProvideResult validation chains

## License

MIT
