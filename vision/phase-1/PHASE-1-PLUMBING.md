# Phase 1: PLUMBING — Container Wires Services

## Status: 100% Complete

## Vision Statement

_"Container wires services. Useful but opaque."_ — the plumbing that makes everything else possible.

Phase 1 is the foundation. Before the nervous system can be connected, the body must exist. Before the application can be self-aware, it must be wired. Phase 1 delivers a fully functional dependency injection container that wires services together — nothing more, nothing less.

This phase establishes the core mechanics: ports define contracts, adapters provide implementations, lifetimes control caching, and the resolution engine wires everything together. It's the invisible infrastructure that makes dependency injection work, but it doesn't yet expose its inner workings to the outside world.

---

## What This Phase Delivers

Phase 1 delivers a **complete, production-ready DI container** with:

- **Type-safe port definitions** with branded types and metadata
- **Adapter registration** with factory functions and class constructors
- **Three lifetime models** (singleton, scoped, transient) with proper caching
- **Recursive dependency resolution** with transitive dependency handling
- **Circular dependency detection** with clear error messages
- **Scope management** with parent-child relationships and LIFO disposal
- **Comprehensive error handling** with actionable error messages

This is the "body" before the nervous system is connected. The container works perfectly, but it's opaque — you can't inspect its internal state, query its dependency graph, or observe its resolution behavior. That comes in Phase 2.

**Context within the broader vision:**

```
  Phase 1: PLUMBING (this phase)
  ──────────────────────────────
  ✅ Ports define contracts
  ✅ Adapters provide implementations
  ✅ Container resolves dependencies
  ✅ Scopes manage lifetimes
  ✅ Errors are caught and reported

  ⚠️  No introspection (can't inspect graph)
  ⚠️  No tracing (can't see resolution history)
  ⚠️  No state inspection (can't query what's instantiated)

  Phase 2: AWARENESS (next phase)
  ───────────────────────────────
  Container knows its topology (graph inspection)
  Container knows its state (runtime snapshots)
  Container knows its history (tracing)
```

---

## Implementation Details

### 1. Port Definition System

Ports are the foundation of HexDI's type-safe dependency injection. A port represents a contract — a service interface that can be implemented by adapters.

#### Core API: `createPort()`

The `createPort()` function creates typed port tokens with optional metadata:

```typescript
import { createPort } from "@hex-di/core";

// Basic port (service type inferred as unknown)
const LoggerPort = createPort({ name: "Logger" });
// Type: DirectedPort<unknown, 'Logger', 'outbound'>

// Typed port with service interface
interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>({ name: "Logger" });
// Type: DirectedPort<Logger, 'Logger', 'outbound'>

// Port with metadata
const LoggerPort = createPort<"Logger", Logger>({
  name: "Logger",
  direction: "outbound",
  description: "Application logging service",
  category: "infrastructure",
  tags: ["logging", "core"],
});
```

#### Branded Types for Type Safety

Ports use TypeScript's branded types to ensure nominal typing:

```typescript
// Port type definition (simplified)
type Port<T, TName extends string> = {
  readonly [__brand]: [T, TName];
  readonly __portName: TName;
};

// Two ports with the same service type are incompatible
const ConsoleLoggerPort = createPort({ name: "ConsoleLogger" });
const FileLoggerPort = createPort({ name: "FileLogger" });

// Type error: ports are not assignable
// const logger: typeof ConsoleLoggerPort = FileLoggerPort; // ❌
```

This ensures that even if two ports have structurally identical service types, they remain type-incompatible unless they're the exact same port instance.

#### Port Direction (Hexagonal Architecture)

Ports can be marked as `inbound` (driving adapters) or `outbound` (driven adapters):

```typescript
// Inbound port: use case interface (driving adapter)
const UserServicePort = createPort<"UserService", UserService>({
  name: "UserService",
  direction: "inbound", // Application's primary API
  description: "User management use cases",
  category: "domain",
});

// Outbound port: infrastructure interface (driven adapter)
const UserRepositoryPort = createPort<"UserRepository", UserRepository>({
  name: "UserRepository",
  direction: "outbound", // Default, can be omitted
  description: "User persistence operations",
  category: "infrastructure",
});
```

Direction defaults to `'outbound'` since most ports represent infrastructure dependencies.

#### Runtime Metadata Storage

Metadata is stored using a Symbol key for zero-overhead access:

```typescript
// Runtime symbol for metadata
export const METADATA_KEY = Symbol.for("@hex-di/core/PortMetadata");

// Port runtime structure
interface DirectedPortRuntime<TName extends string> {
  readonly __portName: TName;
  readonly [DIRECTION_BRAND]: PortDirection;
  readonly [METADATA_KEY]: PortMetadata;
}
```

Metadata includes:

- `description`: Human-readable description
- `category`: Categorical grouping (e.g., 'persistence', 'messaging', 'domain')
- `tags`: Searchable tags for filtering and discovery

#### Conceptual Usage Example

```typescript
// Define ports (contracts)
const LoggerPort = createPort<"Logger", Logger>({
  name: "Logger",
  description: "Application logging",
  category: "infrastructure",
});

const DatabasePort = createPort<"Database", Database>({
  name: "Database",
  description: "Database connection",
  category: "persistence",
});

const UserServicePort = createPort<"UserService", UserService>({
  name: "UserService",
  description: "User management",
  category: "domain",
  direction: "inbound",
});

// Ports are now ready to be used in adapters
```

**Key Files:**

- `packages/core/src/ports/factory.ts` — `createPort()` implementation
- `packages/core/src/ports/types.ts` — Port type definitions and utilities
- `packages/core/src/ports/directed.ts` — Direction branding and metadata

---

### 2. Adapter Definition System

Adapters connect ports to implementations. An adapter declares what port it provides, what ports it requires, and how to create the service instance.

#### Core API: `createAdapter()`

The `createAdapter()` function accepts either a factory function or a class constructor:

```typescript
import { createAdapter } from "@hex-di/core";

// Factory-based adapter
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => new ConsoleLogger(),
});

// Factory with dependencies
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  factory: deps => {
    return new UserServiceImpl(deps.Database, deps.Logger);
  },
});

// Class-based adapter (constructor injection)
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  class: UserServiceImpl, // Constructor receives deps in requires order
});
```

#### Adapter Structure

An adapter contains:

- **`provides`**: The port this adapter implements
- **`requires`**: Array of ports this adapter depends on (defaults to `[]`)
- **`lifetime`**: Caching strategy (defaults to `'singleton'`)
- **`factory`**: Function that creates the instance (or `class` for constructor injection)
- **`finalizer`**: Optional cleanup function called during disposal
- **`factoryKind`**: `'sync'` or `'async'` (detected automatically)
- **`clonable`**: Whether the service can be shallow-cloned (defaults to `false`)

#### Validation

The adapter system performs comprehensive validation:

**Duplicate requires check:**

```typescript
// ❌ Error: Duplicate port in requires
createAdapter({
  provides: ServicePort,
  requires: [LoggerPort, LoggerPort], // ERROR[HEX017]
  factory: () => new Service(),
});
```

**Self-dependency check:**

```typescript
// ❌ Error: Adapter cannot require its own port
createAdapter({
  provides: ServicePort,
  requires: [ServicePort], // ERROR[HEX006]
  factory: () => new Service(),
});
```

**Port structure validation:**

```typescript
// ❌ Error: provides must be a Port object
createAdapter({
  provides: "NotAPort", // ERROR[HEX011]
  factory: () => new Service(),
});
```

**Lifetime validation:**

```typescript
// ❌ Error: Invalid lifetime
createAdapter({
  provides: ServicePort,
  lifetime: "invalid", // ERROR[HEX015]
  factory: () => new Service(),
});
```

#### Conceptual Usage Example

```typescript
// Define adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => new ConsoleLogger(),
  lifetime: "singleton",
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  factory: () => new PostgresDatabase(connectionString),
  lifetime: "singleton",
  finalizer: async db => await db.close(),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  factory: deps => {
    return new UserServiceImpl(deps.Database, deps.Logger);
  },
  lifetime: "scoped",
});

// Adapters are now ready to be registered in a graph
```

**Key Files:**

- `packages/core/src/adapters/unified.ts` — `createAdapter()` implementation with validation

---

### 3. Lifetime Semantics

Lifetimes control how service instances are cached and shared. HexDI supports three lifetime models: singleton, scoped, and transient.

#### Lifetime Types

| Lifetime    | Caching Strategy           | MemoMap Used      | Use Case                               |
| ----------- | -------------------------- | ----------------- | -------------------------------------- |
| `singleton` | One instance per container | `singletonMemo`   | Shared services (config, logger)       |
| `scoped`    | One instance per scope     | `scopedMemo`      | Request-scoped services (user context) |
| `transient` | New instance every time    | `null` (no cache) | Stateless services or factories        |

#### Implementation: `getMemoForLifetime()`

The resolution engine uses `getMemoForLifetime()` to select the appropriate cache:

```typescript
// From packages/runtime/src/resolution/core.ts
export function getMemoForLifetime(
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap
): MemoMap | null {
  switch (lifetime) {
    case "singleton":
      return singletonMemo; // Container-wide cache
    case "scoped":
      return scopedMemo; // Scope-specific cache
    case "transient":
      return null; // No caching
    default:
      throw new Error(`Unknown lifetime: ${lifetime}`);
  }
}
```

#### MemoMap Implementation

`MemoMap` provides lazy instantiation with `getOrElseMemoize()`:

```typescript
// Simplified MemoMap interface
class MemoMap {
  getOrElseMemoize<P extends Port<unknown, string>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: (instance: InferService<P>) => void | Promise<void>
  ): InferService<P> {
    // Check cache first
    const cached = this.cache.get(port);
    if (cached !== undefined) {
      return cached.instance;
    }

    // Create new instance
    const instance = factory();

    // Cache it
    const entry = {
      port,
      instance,
      finalizer,
      resolvedAt: Date.now(),
      resolutionOrder: this.resolutionCounter++,
    };
    this.cache.set(port, entry);
    this.creationOrder.push(entry);

    return instance;
  }
}
```

#### Singleton Inheritance in Scopes

Scoped memo maps inherit singleton instances via parent chain:

```typescript
// Scoped memo is created via fork()
const scopedMemo = singletonMemo.fork();

// When resolving a singleton from a scope:
// 1. Check scopedMemo cache → not found
// 2. Check parent (singletonMemo) cache → found!
// 3. Return singleton instance (shared across all scopes)
```

This ensures singletons are truly container-wide while scoped services are isolated per scope.

#### Lifetime Behavior Table

| Scenario                       | Singleton                    | Scoped                       | Transient  |
| ------------------------------ | ---------------------------- | ---------------------------- | ---------- |
| First resolve from container   | Create & cache               | N/A (requires scope)         | Create new |
| Second resolve from container  | Return cached                | N/A                          | Create new |
| First resolve from scope       | Return singleton (inherited) | Create & cache in scope      | Create new |
| Second resolve from same scope | Return singleton (inherited) | Return cached                | Create new |
| Resolve from different scope   | Return singleton (inherited) | Create & cache in new scope  | Create new |
| After scope disposal           | Still cached                 | Disposed (finalizers called) | N/A        |

**Key Files:**

- `packages/runtime/src/resolution/core.ts` — `getMemoForLifetime()` and `resolveWithMemo()`
- `packages/runtime/src/util/memo-map.ts` — `MemoMap` implementation with `fork()` and disposal

---

### 4. Container Resolution Engine

The resolution engine is the heart of the container. It recursively resolves dependencies, handles caching, and creates service instances.

#### Resolution Flow

```
resolve(port, adapter, scopedMemo, scopeId)
  │
  ├─> [Hooks] beforeResolve hook (if enabled)
  │
  ├─> resolveCore(port, adapter, scopedMemo, scopeId)
  │     │
  │     ├─> resolveWithMemo(port, lifetime, singletonMemo, scopedMemo, factory)
  │     │     │
  │     │     ├─> getMemoForLifetime(lifetime) → MemoMap | null
  │     │     │
  │     │     ├─> If memo exists:
  │     │     │     memo.getOrElseMemoize(port, factory, finalizer)
  │     │     │       ├─> Check cache → return if found
  │     │     │       └─> Call factory() → cache → return
  │     │     │
  │     │     └─> If memo is null (transient):
  │     │           factory() → return (no caching)
  │     │
  │     └─> createInstance(port, adapter, scopedMemo, scopeId)
  │           │
  │           ├─> resolutionContext.enter(portName)  // Track for cycle detection
  │           │
  │           ├─> buildDependencies(adapter.requires, resolve)
  │           │     │
  │           │     └─> For each requiredPort:
  │           │           resolve(requiredPort, ...)  // Recursive!
  │           │
  │           ├─> adapter.factory(deps)  // Create instance
  │           │
  │           └─> resolutionContext.exit(portName)  // Remove from tracking
  │
  └─> [Hooks] afterResolve hook (if enabled)
```

#### ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Resolution Request                        │
│  container.resolve(UserServicePort)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Check Cache (MemoMap)  │
         │  Based on lifetime:     │
         │  - singleton → singletonMemo│
         │  - scoped → scopedMemo  │
         │  - transient → null     │
         └───────────┬─────────────┘
                     │
         ┌───────────▼───────────┐
         │  Cache Hit?            │
         └───┬───────────────┬───┘
             │               │
         YES │               │ NO
             │               │
             ▼               ▼
    ┌──────────────┐  ┌──────────────────────┐
    │ Return       │  │  Create Instance      │
    │ Cached       │  │                       │
    │ Instance     │  │  1. Enter context    │
    └──────────────┘  │     (cycle detection) │
                     │                       │
                     │  2. Resolve deps:     │
                     │     ┌──────────────┐  │
                     │     │ For each req │  │
                     │     │   port:      │  │
                     │     │   ┌────────┐ │  │
                     │     │   │RECURSE │ │  │
                     │     │   │resolve │ │  │
                     │     │   └────────┘ │  │
                     │     └──────────────┘  │
                     │                       │
                     │  3. Call factory     │
                     │     with deps        │
                     │                       │
                     │  4. Exit context     │
                     │                       │
                     │  5. Cache result     │
                     │     (if applicable)   │
                     └───────────┬───────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Return Instance │
                        └────────────────┘
```

#### Transitive Dependency Handling

The engine handles transitive dependencies automatically:

```typescript
// UserService depends on Database
// Database depends on Logger
// Resolution chain:
// UserService → Database → Logger

// When resolving UserService:
// 1. Enter UserService context
// 2. Resolve Database (required dependency)
//    a. Enter Database context
//    b. Resolve Logger (required dependency)
//       i. Enter Logger context
//       ii. Logger has no dependencies → create instance
//       iii. Exit Logger context
//    c. Create Database with Logger
//    d. Exit Database context
// 3. Create UserService with Database
// 4. Exit UserService context
```

#### Resolution Engine Implementation

```typescript
// Simplified ResolutionEngine.resolve()
resolve<P extends Port<unknown, string>>(
  port: P,
  adapter: RuntimeAdapterFor<P>,
  scopedMemo: MemoMap,
  scopeId: string | null
): InferService<P> {
  // Check cache based on lifetime
  return resolveWithMemo(
    port,
    adapter.lifetime,
    this.singletonMemo,
    scopedMemo,
    () => this.createInstance(port, adapter, scopedMemo, scopeId),
    adapter.finalizer
  );
}

private createInstance<P extends Port<unknown, string>>(
  port: P,
  adapter: RuntimeAdapterFor<P>,
  scopedMemo: MemoMap,
  scopeId: string | null
): InferService<P> {
  // Track for cycle detection
  this.resolutionContext.enter(port.__portName);

  try {
    // Resolve all dependencies recursively
    const deps = buildDependencies(adapter.requires, requiredPort =>
      this.resolveDependency(requiredPort, scopedMemo, scopeId)
    );

    // Create instance
    return adapter.factory(deps);
  } finally {
    // Always exit context, even if factory throws
    this.resolutionContext.exit(port.__portName);
  }
}
```

**Key Files:**

- `packages/runtime/src/resolution/engine.ts` — `ResolutionEngine` class
- `packages/runtime/src/resolution/core.ts` — `buildDependencies()` and `resolveWithMemo()`

---

### 5. Circular Dependency Detection

Circular dependencies create infinite resolution loops. HexDI detects them using a resolution context that tracks the current resolution path.

#### ResolutionContext Implementation

```typescript
export class ResolutionContext {
  // Set for O(1) cycle detection lookup
  private readonly path: Set<string> = new Set();

  // Array for maintaining order (for error messages)
  private readonly pathArray: string[] = [];

  enter(portName: string): void {
    if (this.path.has(portName)) {
      // Cycle detected! Build full chain for error
      const chain = [...this.pathArray, portName];
      throw new CircularDependencyError(chain);
    }

    this.path.add(portName);
    this.pathArray.push(portName);
  }

  exit(portName: string): void {
    this.path.delete(portName);
    this.pathArray.pop();
  }
}
```

#### Detection Algorithm

The algorithm uses a Set for O(1) lookup and an Array for ordered error messages:

```
Resolution Path Tracking:
─────────────────────────

1. Resolve UserService
   path: Set{UserService}
   pathArray: [UserService]

2. UserService requires Database
   path: Set{UserService, Database}
   pathArray: [UserService, Database]

3. Database requires Logger
   path: Set{UserService, Database, Logger}
   pathArray: [UserService, Database, Logger]

4. Logger has no dependencies → create → exit Logger
   path: Set{UserService, Database}
   pathArray: [UserService, Database]

5. Database created → exit Database
   path: Set{UserService}
   pathArray: [UserService]

6. UserService created → exit UserService
   path: Set{}
   pathArray: []


Circular Dependency Detection:
───────────────────────────────

1. Resolve ServiceA
   path: Set{ServiceA}
   pathArray: [ServiceA]

2. ServiceA requires ServiceB
   path: Set{ServiceA, ServiceB}
   pathArray: [ServiceA, ServiceB]

3. ServiceB requires ServiceA  ← CYCLE DETECTED!
   path.has(ServiceA) → true
   chain = [ServiceA, ServiceB, ServiceA]
   throw CircularDependencyError(chain)
```

#### Error Message

When a cycle is detected, `CircularDependencyError` provides a clear chain:

```typescript
// Error message format:
"Circular dependency detected: ServiceA -> ServiceB -> ServiceC -> ServiceA";

// Error includes:
// - code: "CIRCULAR_DEPENDENCY"
// - isProgrammingError: true
// - dependencyChain: ["ServiceA", "ServiceB", "ServiceC", "ServiceA"]
// - suggestion: Actionable refactoring advice
```

#### ASCII Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Circular Dependency Detection               │
└─────────────────────────────────────────────────────────┘

Normal Resolution (No Cycle):
─────────────────────────────
  UserService
    │
    ├─> Database
    │     │
    │     └─> Logger ✓ (no deps)
    │
    └─> ✓ Complete

Resolution Context:
  [UserService, Database, Logger] → [UserService, Database] → [UserService] → []


Circular Resolution (Cycle Detected):
─────────────────────────────────────
  ServiceA
    │
    ├─> ServiceB
    │     │
    │     └─> ServiceA ⚠️  (already in path!)
    │
    └─> ❌ CircularDependencyError

Resolution Context:
  [ServiceA, ServiceB] → ServiceA detected in Set → ERROR!

Error Chain:
  ["ServiceA", "ServiceB", "ServiceA"]
```

**Key Files:**

- `packages/runtime/src/resolution/context.ts` — `ResolutionContext` class
- `packages/runtime/src/errors/index.ts` — `CircularDependencyError` class

---

### 6. Scope Management

Scopes provide isolation boundaries for scoped lifetime services. Each scope has its own cache (`scopedMemo`) while inheriting singleton instances from the container.

#### Scope Creation

```typescript
// Create a scope from the container
const scope = container.createScope();

// Create a child scope
const childScope = scope.createScope();

// Scopes form a tree hierarchy
// Container (root)
//   └─> Scope A
//         ├─> Scope A-1
//         └─> Scope A-2
//   └─> Scope B
```

#### Scope Implementation

```typescript
export class ScopeImpl {
  private readonly scopedMemo: MemoMap;
  private readonly parentScope: ScopeImpl | null;
  private readonly childScopes: Set<ScopeImpl> = new Set();
  private disposed: boolean = false;

  constructor(
    container: ScopeContainerAccess,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl | null = null
  ) {
    // Fork singleton memo to inherit singletons
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
  }

  resolve<P extends Port>(port: P): InferService<P> {
    if (this.disposed) {
      throw new DisposedScopeError(port.__portName);
    }
    return this.container.resolveInternal(port, this.scopedMemo, this.id);
  }

  createScope(name?: string): Scope {
    const child = new ScopeImpl(
      this.container,
      this.container.getSingletonMemo(), // Always fork from root singletonMemo
      this // Set this scope as parent
    );
    this.childScopes.add(child);
    return createScopeWrapper(child);
  }
}
```

#### Scoped Memo Inheritance

Scoped memo maps inherit singleton instances via `fork()`:

```typescript
// MemoMap.fork() creates a child with parent reference
fork(): MemoMap {
  return new MemoMap(this, this.config);  // this becomes parent
}

// When resolving from scoped memo:
getOrElseMemoize(port, factory, finalizer) {
  // Check parent cache first (for singleton inheritance)
  if (this.parent !== undefined && this.parent.has(port)) {
    return this.parent.getOrElseMemoize(port, factory, finalizer);
  }

  // Then check own cache
  // ... (rest of implementation)
}
```

This ensures:

- **Singletons are shared** across all scopes (via parent chain)
- **Scoped services are isolated** per scope (cached in `scopedMemo`)

#### LIFO Disposal Order

Scopes dispose in Last-In-First-Out (LIFO) order:

```typescript
async dispose(): Promise<void> {
  if (this.disposed) {
    return;  // Idempotent
  }

  this.disposed = true;

  // 1. Dispose all child scopes first (deepest first)
  for (const child of this.childScopes) {
    await child.dispose();
  }
  this.childScopes.clear();

  // 2. Dispose scoped services in reverse creation order
  await this.scopedMemo.dispose();

  // 3. Remove from parent's child set
  if (this.parentScope !== null) {
    this.parentScope.childScopes.delete(this);
  }

  // 4. Emit lifecycle events
  this.lifecycleEmitter.emit('disposed');
}
```

#### ASCII Scope Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Scope Hierarchy                            │
└─────────────────────────────────────────────────────────────┘

Container (Root)
  singletonMemo: { Logger, Database, Config }
  │
  ├─> Scope A (id: "scope-0")
  │     scopedMemo: { UserContext, RequestHandler }
  │     │
  │     ├─> Scope A-1 (id: "scope-1")
  │     │     scopedMemo: { Transaction }
  │     │
  │     └─> Scope A-2 (id: "scope-2")
  │           scopedMemo: { QueryContext }
  │
  └─> Scope B (id: "scope-3")
        scopedMemo: { UserContext, RequestHandler }


Resolution Behavior:
────────────────────

Resolve LoggerPort from Scope A-1:
  1. Check scopedMemo (Scope A-1) → not found
  2. Check parent (singletonMemo) → found! ✓
     Return singleton instance

Resolve UserContextPort from Scope A-1:
  1. Check scopedMemo (Scope A-1) → not found
  2. Check parent (singletonMemo) → not found
  3. Check parent's parent (Scope A) → found! ✓
     Return Scope A's instance

Resolve TransactionPort from Scope A-1:
  1. Check scopedMemo (Scope A-1) → found! ✓
     Return Scope A-1's instance


Disposal Order (LIFO):
──────────────────────

Dispose Container:
  1. Dispose Scope A
     a. Dispose Scope A-1 (dispose Transaction)
     b. Dispose Scope A-2 (dispose QueryContext)
     c. Dispose Scope A (dispose UserContext, RequestHandler)
  2. Dispose Scope B (dispose UserContext, RequestHandler)
  3. Dispose Container (dispose Logger, Database, Config)
```

**Key Files:**

- `packages/runtime/src/scope/impl.ts` — `ScopeImpl` class with disposal logic
- `packages/runtime/src/util/memo-map.ts` — `fork()` and disposal implementation

---

### 7. Error Handling System

HexDI provides a comprehensive error hierarchy with actionable error messages and programmatic error codes.

#### Error Base Class

All container errors extend `ContainerError`:

```typescript
export abstract class ContainerError extends Error {
  abstract readonly code: string;
  abstract readonly isProgrammingError: boolean;
  suggestion?: string; // Optional actionable advice

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8-specific)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}
```

#### Error Types Table

| Error Type                         | Code                   | isProgrammingError | When Thrown                                      |
| ---------------------------------- | ---------------------- | ------------------ | ------------------------------------------------ |
| `CircularDependencyError`          | `CIRCULAR_DEPENDENCY`  | `true`             | Cycle detected during resolution                 |
| `FactoryError`                     | `FACTORY_FAILED`       | `false`            | Factory function throws during creation          |
| `AsyncFactoryError`                | `ASYNC_FACTORY_FAILED` | `false`            | Async factory throws during creation             |
| `DisposedScopeError`               | `DISPOSED_SCOPE`       | `true`             | Resolving from disposed scope                    |
| `ScopeRequiredError`               | `SCOPE_REQUIRED`       | `true`             | Resolving scoped port from root container        |
| `AsyncInitializationRequiredError` | `ASYNC_INIT_REQUIRED`  | `true`             | Sync-resolving async port without init           |
| `NonClonableForkedError`           | `NON_CLONABLE_FORKED`  | `true`             | Using forked inheritance on non-clonable adapter |
| `MissingAdapterError`              | `MISSING_ADAPTER`      | `true`             | No adapter registered for port                   |

#### Error Codes

Error codes enable programmatic error handling:

```typescript
// From packages/core/src/errors/codes.ts
export const ErrorCode = {
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  FACTORY_FAILED: "FACTORY_FAILED",
  DISPOSED_SCOPE: "DISPOSED_SCOPE",
  SCOPE_REQUIRED: "SCOPE_REQUIRED",
  // ... (see codes.ts for full list)
} as const;
```

#### Error Examples

**CircularDependencyError:**

```typescript
try {
  container.resolve(ServiceAPort);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log(error.code); // "CIRCULAR_DEPENDENCY"
    console.log(error.dependencyChain);
    // ["ServiceA", "ServiceB", "ServiceA"]
    console.log(error.suggestion); // Refactoring advice
  }
}
```

**FactoryError:**

```typescript
try {
  container.resolve(DatabasePort);
} catch (error) {
  if (error instanceof FactoryError) {
    console.log(error.code); // "FACTORY_FAILED"
    console.log(error.portName); // "Database"
    console.log(error.cause); // Original exception
    // isProgrammingError: false (runtime condition)
  }
}
```

**DisposedScopeError:**

```typescript
const scope = container.createScope();
await scope.dispose();

try {
  scope.resolve(ServicePort);
} catch (error) {
  if (error instanceof DisposedScopeError) {
    console.log(error.code); // "DISPOSED_SCOPE"
    console.log(error.portName); // "Service"
    // isProgrammingError: true (programming mistake)
  }
}
```

#### Error Code Ranges

Error codes follow a structured numbering system:

| Range      | Category                     | Examples                               |
| ---------- | ---------------------------- | -------------------------------------- |
| HEX001-009 | Graph validation errors      | DUPLICATE_ADAPTER, CIRCULAR_DEPENDENCY |
| HEX010-019 | Adapter configuration errors | MISSING_PROVIDES, INVALID_FACTORY      |
| HEX020-025 | Runtime/container errors     | FACTORY_FAILED, DISPOSED_SCOPE         |

#### Actionable Suggestions

Programming errors include copy-paste-ready suggestions:

```typescript
// CircularDependencyError suggestion:
"To break the circular dependency, refactor your code:
1. Extract shared logic into a third service that both depend on
2. Pass data as parameters instead of injecting the service
3. Use lazy injection if one service only needs the other occasionally

Example - extract shared logic:
// Before: A -> B -> A (circular)
// After:  A -> Shared, B -> Shared (no cycle)
const SharedLogicPort = createPort<SharedLogic>({ name: 'SharedLogic' });
const SharedLogicAdapter = createAdapter({
  provides: SharedLogicPort,
  factory: () => new SharedLogic()
});"
```

**Key Files:**

- `packages/runtime/src/errors/index.ts` — Error class hierarchy
- `packages/core/src/errors/codes.ts` — Error code constants

---

## Verification Checklist

All Phase 1 features are **100% complete** and verified:

### Port System ✅

- [x] `createPort()` creates typed port tokens
- [x] Branded types ensure nominal typing
- [x] Port direction (inbound/outbound) supported
- [x] Metadata (description, category, tags) stored
- [x] Runtime metadata accessible via Symbol key
- [x] Type inference utilities (`InferService`, `InferPortName`)

### Adapter System ✅

- [x] `createAdapter()` accepts factory functions
- [x] `createAdapter()` accepts class constructors
- [x] Requires array validation (duplicates, self-dependency)
- [x] Port structure validation
- [x] Lifetime validation
- [x] Factory/class mutual exclusion validation
- [x] Finalizer support

### Lifetime Semantics ✅

- [x] Singleton lifetime (container-wide cache)
- [x] Scoped lifetime (scope-specific cache)
- [x] Transient lifetime (no caching)
- [x] `getMemoForLifetime()` selects correct cache
- [x] MemoMap with `getOrElseMemoize()` lazy instantiation
- [x] Singleton inheritance in scoped memo via `fork()`
- [x] LIFO disposal order tracking

### Resolution Engine ✅

- [x] Recursive dependency resolution
- [x] Transitive dependency handling
- [x] Lifetime-based caching
- [x] Factory function invocation with deps
- [x] Class constructor injection
- [x] Dependency order preservation

### Circular Dependency Detection ✅

- [x] `ResolutionContext` tracks resolution path
- [x] O(1) cycle detection using Set
- [x] Ordered error chain for debugging
- [x] `CircularDependencyError` with actionable suggestions

### Scope Management ✅

- [x] `createScope()` creates isolated scopes
- [x] Child scope creation
- [x] Scope tree hierarchy
- [x] Scoped memo inherits singletons via `fork()`
- [x] LIFO disposal order (children first, then self)
- [x] Disposal prevents use-after-dispose
- [x] Lifecycle events (disposing, disposed)

### Error Handling ✅

- [x] `ContainerError` base class
- [x] Error code constants
- [x] `isProgrammingError` flag
- [x] Actionable suggestions for programming errors
- [x] All error types implemented:
  - [x] `CircularDependencyError`
  - [x] `FactoryError`
  - [x] `AsyncFactoryError`
  - [x] `DisposedScopeError`
  - [x] `ScopeRequiredError`
  - [x] `AsyncInitializationRequiredError`
  - [x] `NonClonableForkedError`

---

## Relationship to Other Phases

### Phase 1 → Phase 2: AWARENESS

Phase 1 provides the foundation. Phase 2 adds introspection:

- **Phase 1**: Container resolves services (opaque)
- **Phase 2**: Container exposes graph topology, runtime state, and resolution history

**What Phase 2 adds:**

- Graph inspection API (`graph.getTopology()`, `graph.getPorts()`)
- Runtime snapshots (`container.getSnapshot()`)
- Scope tree inspection (`scope.getInternalState()`)
- Tracing spans (`@hex-di/tracing`)

### Phase 1 → Phase 3: REPORTING

Phase 1's resolution engine enables Phase 3's ecosystem reporting:

- **Phase 1**: Container wires services
- **Phase 3**: Libraries report their state through the container

**What Phase 3 adds:**

- Store reports reactive state
- Query reports cache contents
- Saga reports workflow progress
- Agent reports tool capabilities

### Phase 1 → Phase 4: COMMUNICATION

Phase 1's error handling and structure enable Phase 4's protocol exposure:

- **Phase 1**: Errors have codes and structured data
- **Phase 4**: Errors exposed via MCP/A2A with full context

**What Phase 4 adds:**

- MCP server exposing graph/state/traces
- A2A agent card with skills
- OpenTelemetry export

### Phase 1 → Phase 5: AUTONOMY

Phase 1's resolution engine and error handling enable Phase 5's autonomous behavior:

- **Phase 1**: Container resolves with error handling
- **Phase 5**: Container acts on errors (circuit breakers, retries, auto-healing)

**What Phase 5 adds:**

- Auto-healing (saga compensations)
- Auto-optimization (pre-warming)
- Auto-scaling (scope pools)

---

## Key Files Reference

| Feature                       | File Path                                    |
| ----------------------------- | -------------------------------------------- |
| Port creation API             | `packages/core/src/ports/factory.ts`         |
| Port type definitions         | `packages/core/src/ports/types.ts`           |
| Port direction & metadata     | `packages/core/src/ports/directed.ts`        |
| Adapter creation API          | `packages/core/src/adapters/unified.ts`      |
| Lifetime handling             | `packages/runtime/src/resolution/core.ts`    |
| Resolution engine             | `packages/runtime/src/resolution/engine.ts`  |
| Circular dependency detection | `packages/runtime/src/resolution/context.ts` |
| Scope implementation          | `packages/runtime/src/scope/impl.ts`         |
| MemoMap caching               | `packages/runtime/src/util/memo-map.ts`      |
| Error hierarchy               | `packages/runtime/src/errors/index.ts`       |
| Error codes                   | `packages/core/src/errors/codes.ts`          |

---

## Summary

Phase 1 delivers a **complete, production-ready dependency injection container**. It provides:

- ✅ Type-safe port definitions with metadata
- ✅ Flexible adapter registration (factory or class)
- ✅ Three lifetime models with proper caching
- ✅ Recursive dependency resolution
- ✅ Circular dependency detection
- ✅ Scope management with inheritance
- ✅ Comprehensive error handling

This is the foundation. The container works perfectly, but it's opaque — you can't inspect its internal state or observe its behavior. That introspection capability comes in Phase 2, making the container self-aware.

Phase 1 is the "body" before the nervous system is connected. It's the plumbing that makes everything else possible.

---

_"Before the application can know itself, it must first exist. Phase 1 builds the body. Phase 2 connects the nerves."_
