---
title: Core Concepts
description: Understand the fundamental concepts of HexDI — ports as contracts, adapters as explicit dependency declarations, graphs as structural constraints.
sidebar_position: 2
---

# Core Concepts

HexDI is built around a single insight: if your dependency graph is a first-class TypeScript object, the compiler can validate it. Architecture becomes a constraint, not a convention.

The core model:

```
Port → Adapter → Graph → Container
```

---

## Ports

A **Port** is a contract. It defines what a service *is*, not how it works. It's also a typed token — a unique runtime identifier that carries the service's interface type at the type level.

```typescript
import { port } from '@hex-di/core';

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// The port is the contract.
// The name is inferred as a literal type — "Logger" — enabling structural validation.
const LoggerPort = port<Logger>()({ name: 'Logger' });
```

Ports are **nominal**. Two ports with the same interface are still distinct:

```typescript
interface Logger {
  log(message: string): void;
}

const ConsoleLoggerPort = port<Logger>()({ name: 'ConsoleLogger' });
const FileLoggerPort    = port<Logger>()({ name: 'FileLogger' });

// These are type-incompatible even though Logger interface is identical.
// The compiler distinguishes them by name, not structure.
```

Ports belong to your domain — they describe what your application needs, without specifying which technology provides it.

---

## Adapters

An **Adapter** is an implementation of a port. Crucially, it also declares what it depends on — making the entire dependency graph explicit and machine-readable.

```typescript
import { createAdapter } from '@hex-di/core';

const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,       // Which contract this implements
  requires: [],               // Declared dependencies (none here)
  lifetime: 'singleton',      // Instance lifecycle
  factory: () => ({           // How to create the service
    log:   (msg) => console.log(`[INFO] ${msg}`),
    warn:  (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
  })
});
```

When an adapter has dependencies, they are declared explicitly in `requires`. TypeScript infers the `deps` type automatically — no manual annotations needed:

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],  // Declare what you need
  lifetime: 'scoped',
  factory: (deps) => {
    // deps is automatically typed as:
    // { Logger: Logger; Database: Database }
    return {
      getUser: async (id) => {
        deps.Logger.log(`Fetching user ${id}`);
        return deps.Database.query('SELECT * FROM users WHERE id = ?', [id]);
      }
    };
  }
});
```

**This declaration is not documentation — it's the graph.** Every `requires` entry becomes an edge in the dependency graph that the compiler validates.

### Adapter configuration

| Property    | Required | Description |
|-------------|----------|-------------|
| `provides`  | Yes      | The port this adapter implements |
| `requires`  | Yes      | Declared dependency ports (use `[]` for none) |
| `lifetime`  | Yes      | `'singleton'`, `'scoped'`, or `'transient'` |
| `factory`   | Yes      | Factory function; receives resolved dependencies |
| `finalizer` | No       | Cleanup function called on container/scope disposal |

---

## Graphs

A **Graph** is a structurally validated collection of adapters. It is not built at runtime from a config file — it is constructed at compile time via a type-checked builder.

```typescript
import { GraphBuilder } from '@hex-di/graph';

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();
```

### Structural validation

The graph enforces two invariants at compile time:

**Every declared dependency must be provided:**

```typescript
// This compiles — all dependencies are provided
const validGraph = GraphBuilder.create()
  .provide(LoggerAdapter)       // provides Logger
  .provide(DatabaseAdapter)     // provides Database
  .provide(UserServiceAdapter)  // requires Logger, Database ✓
  .build();

// This fails to compile — UserServiceAdapter requires Logger and Database
const invalidGraph = GraphBuilder.create()
  .provide(UserServiceAdapter)  // requires Logger, Database
  .build(); // Error: "ERROR[HEX008]: Missing adapters for Logger | Database. Call .provide() first."
```

**Each port can only be provided once:**

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(AnotherLoggerAdapter) // Same port!
  .build();
// Error: "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call."
```

### Immutable builder

Each `provide()` returns a new builder. The original is unchanged. This enables safe branching:

```typescript
const base = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);

// Different implementations for different environments
const devGraph  = base.provide(InMemoryDatabaseAdapter).build();
const prodGraph = base.provide(PostgresDatabaseAdapter).build();
// base is unchanged by either branch
```

The graph is **the architecture as a live, queryable object** — not a diagram that drifts away from the code.

---

## Containers

A **Container** is the runtime resolver that creates service instances from a validated graph.

```typescript
import { createContainer } from '@hex-di/runtime';

const container = createContainer({ graph, name: "App" });
```

Resolving a service returns a fully-typed instance:

```typescript
const logger = container.resolve(LoggerPort);
// type: Logger — TypeScript knows this is valid

logger.log('Hello!');

// Resolving a port not in the graph is a compile error:
container.resolve(UnknownPort); // TypeScript Error
```

Containers are disposed when the application shuts down. Finalizers run in reverse dependency order:

```typescript
await container.tryDispose();
```

---

## Scopes

A **Scope** is a child container for managing the lifecycle of scoped services. Scoped services are created once per scope and disposed when the scope is disposed.

```typescript
const container = createContainer({ graph, name: "App" });

// Per-request scope
const scope = container.createScope();

const session = scope.resolve(UserSessionPort); // one instance for this scope
// ... handle request ...
await scope.tryDispose(); // session is disposed, finalizers run
```

### Lifetime behavior

| Lifetime      | Root Container          | Scope                        |
|---------------|-------------------------|------------------------------|
| `singleton`   | Created once, cached    | Same instance from container |
| `scoped`      | Error (requires scope)  | Created once per scope       |
| `transient`   | Fresh each resolution   | Fresh each resolution        |

```typescript
// Singletons are shared across all scopes
const logger1 = container.resolve(LoggerPort);
const scope   = container.createScope();
const logger2 = scope.resolve(LoggerPort);
logger1 === logger2; // true

// Scoped instances are isolated per scope
const scope1   = container.createScope();
const scope2   = container.createScope();
const session1 = scope1.resolve(UserSessionPort);
const session2 = scope2.resolve(UserSessionPort);
session1 === session2; // false
```

---

## Putting It Together

```typescript
import { port, createAdapter } from '@hex-di/core';
import { GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';
import { fromPromise } from '@hex-di/result';

// Contracts
interface Logger     { log(msg: string): void; }
interface UserService { getUser(id: string): Promise<{ id: string; name: string }>; }

const LoggerPort      = port<Logger>()({ name: 'Logger' });
const UserServicePort = port<UserService>()({ name: 'UserService' });

// Implementations with explicit dependency declarations
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: (msg) => console.log(`[App] ${msg}`) })
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],       // explicit declaration — this edge is in the graph
  lifetime: 'scoped',
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: 'Alice' };
    }
  })
});

// Structurally validated graph — fails to compile if any dependency is missing
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

// Runtime resolution
const container = createContainer({ graph, name: "App" });

async function handleRequest() {
  const scope = container.createScope();
  const result = await scope.tryResolve(UserServicePort)
    .asyncAndThen((userService) => fromPromise(userService.getUser('user-1'), (e) => e));
  await scope.tryDispose();
  result.match(
    (user) => console.log('User:', user),
    (error) => console.error('Failed:', error),
  );
}

handleRequest();
```

---

## Summary

| Concept   | What it is                               | Created with                              |
|-----------|------------------------------------------|-------------------------------------------|
| Port      | A contract — what a service does         | `port<T>()({ name })`                    |
| Adapter   | An implementation with declared deps     | `createAdapter({ provides, requires, … })` |
| Graph     | A compile-time-validated wiring          | `GraphBuilder.create().provide(…).build()` |
| Container | A runtime resolver                       | `createContainer({ graph, name })`        |
| Scope     | A lifetime boundary for scoped services  | `container.createScope()`                 |

---

- Next: [First Application](./first-application.md)
- Or dive into: [Lifetimes](./lifetimes.md) · [TypeScript Integration](./typescript-integration.md)
