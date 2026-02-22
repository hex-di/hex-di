---
title: "@hex-di/graph"
description: API reference for @hex-di/graph providing Adapters, GraphBuilder, and compile-time dependency validation.
sidebar_position: 2
sidebar_label: "@hex-di/graph"
---

# @hex-di/graph API Reference

The compile-time validation layer of HexDI. Provides Adapter type, createAdapter function, and GraphBuilder with type-level dependency tracking.

## Installation

```bash
pnpm add @hex-di/graph
```

## Overview

`@hex-di/graph` provides:
- `Adapter<TProvides, TRequires, TLifetime>` - Branded adapter type
- `createAdapter()` - Factory to create adapters
- `GraphBuilder` - Immutable builder for dependency graphs
- Type utilities for validation and extraction
- Error types for compile-time messages

## Types

### Lifetime

Lifetime scope for an adapter's service instance.

```typescript
type Lifetime = 'singleton' | 'scoped' | 'transient';
```

| Value | Description |
|-------|-------------|
| `'singleton'` | One instance for entire application |
| `'scoped'` | One instance per scope |
| `'transient'` | New instance every resolution |

### `Adapter<TProvides, TRequires, TLifetime>`

A branded adapter type that captures the complete contract for a service implementation.

```typescript
type Adapter<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
  TLifetime extends Lifetime
> = {
  readonly provides: TProvides;
  readonly requires: TRequires extends never
    ? readonly []
    : readonly Port<unknown, string>[];
  readonly lifetime: TLifetime;
  readonly factory: (deps: ResolvedDeps<TRequires>) => InferService<TProvides>;
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};
```

**Type Parameters:**
- `TProvides` - The Port this adapter provides
- `TRequires` - Union of Ports required, or `never`
- `TLifetime` - The lifetime literal type

### `ResolvedDeps<TRequires>`

Maps a union of Port types to a dependencies object type.

```typescript
type ResolvedDeps<TRequires extends Port<unknown, string> | never> =
  [TRequires] extends [never]
    ? Record<string, unknown>
    : { [P in TRequires as InferPortName<P>]: InferService<P> };
```

**Example:**

```typescript
type Deps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
// { Logger: Logger; Database: Database }
```

### `Graph<TProvides, TAsyncPorts, TOverrides>`

The validated dependency graph returned by `GraphBuilder.build()`.

```typescript
interface Graph<out TProvides = never, out TAsyncPorts = never, out TOverrides = never> {
  readonly adapters: readonly Adapter<...>[];
  readonly overridePortNames: ReadonlySet<string>;
  readonly __provides: TProvides;
  readonly __asyncPorts: TAsyncPorts;
  readonly __overrides: TOverrides;
}
```

## Functions

### createAdapter

Creates a typed adapter with dependency metadata.

```typescript
function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime
>(config: {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime>
```

**Configuration:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provides` | `Port` | Yes | The port this adapter implements |
| `requires` | `Port[]` | Yes | Dependencies (use `[]` for none) |
| `lifetime` | `Lifetime` | Yes | Instance lifecycle |
| `factory` | `Function` | Yes | Creates the service instance |
| `finalizer` | `Function` | No | Cleanup on disposal |

**Example:**

```typescript
// No dependencies
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(msg)
  })
});

// With dependencies
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: (deps) => ({
    // deps: { Logger: Logger; Database: Database }
    getUser: async (id) => {
      deps.Logger.log(`Fetching ${id}`);
      return deps.Database.query('...');
    }
  })
});

// With finalizer
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: 'singleton',
  factory: () => new DatabasePool(),
  finalizer: async (pool) => {
    await pool.close();
  }
});
```

## Classes

### `GraphBuilder<TProvides, TRequires>`

An immutable builder for constructing dependency graphs with compile-time validation.

```typescript
class GraphBuilder<TProvides = never, TRequires = never, ...> {
  readonly adapters: readonly Adapter<...>[];

  static create(): GraphBuilder<never, never>;

  provide<A extends Adapter<...>>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, A>;

  merge<OtherProvides, OtherRequires>(
    builder: GraphBuilder<OtherProvides, OtherRequires>
  ): GraphBuilder<TProvides | OtherProvides, TRequires | OtherRequires>;

  // Returns Graph directly — compile error if deps unsatisfied
  build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Graph<TProvides>
    : `ERROR[HEX008]: Missing adapters for ${string}. Call .provide() first.`;

  // Returns Result<Graph, GraphBuildError> — compile error if deps unsatisfied
  tryBuild(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Result<Graph<TProvides>, GraphBuildError>
    : `ERROR[HEX008]: Missing adapters for ${string}. Call .provide() first.`;
}
```

#### GraphBuilder.create()

Creates a new empty GraphBuilder.

```typescript
const builder = GraphBuilder.create();
// GraphBuilder<never, never>
```

#### builder.provide(adapter)

Registers an adapter, returning a NEW builder with updated types.

```typescript
const builder1 = GraphBuilder.create();
const builder2 = builder1.provide(LoggerAdapter);
const builder3 = builder2.provide(UserServiceAdapter);

// Each builder is immutable
builder1.adapters.length; // 0
builder2.adapters.length; // 1
builder3.adapters.length; // 2
```

**Return Type:**
- Success: `GraphBuilder` with accumulated types
- Duplicate: `"ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call."`

#### builder.build()

Validates and builds the dependency graph. Returns `Graph<TProvides>` when all dependencies are satisfied. When dependencies are missing, the return type becomes a template literal error string — this makes passing the result to `createContainer` a compile error.

```typescript
// Complete graph - build() returns Graph<...>
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

const container = createContainer({ graph, name: "App" }); // OK

// Incomplete graph - build() return type is an error string
const bad = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger
  .build();
// Type: "ERROR[HEX008]: Missing adapters for Logger. Call .provide() first."
// Passing this to createContainer is a compile error
```

#### builder.tryBuild()

Like `build()` but returns `Result<Graph<TProvides>, GraphBuildError>` for explicit error handling. Useful when runtime errors (e.g. circular dependencies exceeding type-level detection depth) need to be caught as values.

```typescript
import { createContainer } from "@hex-di/runtime";

const result = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .tryBuild();

if (result.isErr()) {
  console.error("Graph build failed:", result.error.message);
  process.exit(1);
}

const container = createContainer({ graph: result.value, name: "App" });
```

**When to use `tryBuild()` vs `build()`:**
- Use `build()` for straightforward cases — the type system catches missing deps at compile time
- Use `tryBuild()` when you want explicit runtime error handling as a `Result` value

## Type Utilities

### `InferAdapterProvides<A>`

Extracts the provided port from an Adapter type.

```typescript
type Provides = InferAdapterProvides<typeof UserServiceAdapter>;
// typeof UserServicePort
```

### `InferAdapterRequires<A>`

Extracts the required ports union from an Adapter type.

```typescript
type Requires = InferAdapterRequires<typeof UserServiceAdapter>;
// typeof LoggerPort | typeof DatabasePort
```

### `InferAdapterLifetime<A>`

Extracts the lifetime from an Adapter type.

```typescript
type Life = InferAdapterLifetime<typeof LoggerAdapter>;
// 'singleton'
```

### `InferGraphProvides<G>`

Extracts the provided ports union from a GraphBuilder type.

```typescript
type Provides = InferGraphProvides<typeof builder>;
// typeof LoggerPort | typeof UserServicePort
```

### `InferGraphRequires<G>`

Extracts the required ports union from a GraphBuilder type.

```typescript
type Requires = InferGraphRequires<typeof builder>;
// typeof LoggerPort | typeof DatabasePort
```

## Validation Types

### `UnsatisfiedDependencies<TProvides, TRequires>`

Computes missing dependencies.

```typescript
type Missing = UnsatisfiedDependencies<
  typeof LoggerPort,
  typeof LoggerPort | typeof DatabasePort
>;
// typeof DatabasePort
```

### `IsSatisfied<TProvides, TRequires>`

Boolean predicate for dependency satisfaction.

```typescript
type Complete = IsSatisfied<
  typeof LoggerPort | typeof DatabasePort,
  typeof LoggerPort
>;
// true
```

### `ValidGraph<TProvides, TRequires>`

Conditional type for validation result.

```typescript
type Result = ValidGraph<TProvides, TRequires>;
// { __valid: true; provides: TProvides } or
// { __valid: false; __missing: ... }
```

## Compile-Time Error Messages

HexDI uses **template literal return types** to surface errors directly in your IDE. When a method call is invalid, its return type becomes an error string — making the call site a compile error wherever the result is used.

### Missing Dependencies

When `build()` or `tryBuild()` is called with unsatisfied dependencies:

```
"ERROR[HEX008]: Missing adapters for Logger | Database. Call .provide() first."
```

### Duplicate Provider

When `.provide()` is called with a port that's already provided:

```
"ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call, or use .override() for child graphs."
```

### Circular Dependency

When a cycle is detected at the type level:

```
"ERROR[HEX002]: Circular dependency: UserService -> Database -> Cache -> UserService. Fix: Use lazyPort(Database) in UserServiceAdapter, ..."
```

### Captive Dependency

When a longer-lived service depends on a shorter-lived one:

```
"ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: Change 'UserCache' to Scoped/Transient, or change 'RequestContext' to Singleton."
```

## Re-exports

`@hex-di/graph` re-exports from `@hex-di/core`:
- `Port`
- `DirectedPort`
- `InferService`
- `InferPortName`

## Usage Example

```typescript
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { port } from '@hex-di/core';

// Define interfaces
interface Logger {
  log(msg: string): void;
}

interface UserService {
  getUser(id: string): Promise<User>;
}

// Create ports
const LoggerPort = port<Logger>()({ name: 'Logger' });
const UserServicePort = port<UserService>()({ name: 'UserService' });

// Create adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: 'scoped',
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Fetching ${id}`);
      return { id, name: 'User' };
    }
  })
});

// Build graph (compile-time validated)
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
```
