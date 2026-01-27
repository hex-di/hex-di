# Quick Reference Cheat Sheet

> **Copy-paste snippets for common @hex-di/graph tasks**

## Table of Contents

1. [Decision Trees](#decision-trees)
2. [Basic Setup](#basic-setup)
3. [Adapter Configuration](#adapter-configuration)
4. [Circular Dependencies](#circular-dependencies)
5. [Lifetime Configuration](#lifetime-configuration)
6. [Graph Operations](#graph-operations)
7. [Testing Patterns](#testing-patterns)
8. [Visualization](#visualization)
9. [Error Handling](#error-handling)
10. [API Quick Lookup](#api-quick-lookup)
11. [Lifetime Validity Matrix](#lifetime-validity-matrix)

---

## Decision Trees

### Which Build Method?

```
Do you need all dependencies satisfied?
│
├─ YES → Use build()
│        Validates all requirements are met at compile-time
│
└─ NO → Use buildFragment()
        For child containers where parent provides some dependencies
```

### Which Provide Method?

```
Is the adapter async (created with asyncFactory)?
│
├─ YES → Use provideAsync()
│        Required for adapters that return Promises
│
└─ NO → Is compile-time speed critical (50+ adapters)?
        │
        ├─ YES → Use provideFirstError()
        │        Faster type-checking, reports first error only
        │
        └─ NO → Use provide() (DEFAULT)
                Reports ALL validation errors at once
```

### When to Use merge() vs provide()?

```
Are you combining two GraphBuilder instances?
│
├─ YES → Use merge()
│        Combines all adapters from both builders
│
└─ NO → Are you adding a single adapter?
        │
        ├─ YES → Use provide()
        │
        └─ NO → Adding multiple adapters at once?
                │
                └─ YES → Use provideMany([...])
```

### When to Use override()?

```
Are you replacing an adapter from a parent container?
│
├─ YES → Use override()
│        Marks the adapter as a replacement, not addition
│
└─ NO → Use provide()
        Adds a new adapter to the graph
```

### Which Lifetime to Choose?

```
Does the service have expensive setup (DB connection, etc.)?
│
├─ YES → Use "singleton"
│        One instance per container, shared everywhere
│
└─ NO → Is the service stateful per-request/scope?
        │
        ├─ YES → Use "scoped"
        │        One instance per scope (request, transaction)
        │
        └─ NO → Does every consumer need its own instance?
                │
                ├─ YES → Use "transient"
                │        New instance every resolution
                │
                └─ NO → Use "singleton" (default safe choice)
```

### How to Fix Captive Dependency Errors?

```
ERROR: Captive dependency detected
│
├─ Option 1: Change consumer lifetime
│   Make the consuming adapter scoped or transient
│
├─ Option 2: Change dependency lifetime
│   Make the dependency singleton (if appropriate)
│
└─ Option 3: Use lazyPort() (RECOMMENDED)
    Wrap dependency in lazyPort() to defer resolution

    Example:
    requires: [lazyPort(ScopedPort)] as const
    factory: ({ LazyScoped }) => ({
      getScoped: () => LazyScoped()  // Fresh each call
    })
```

---

## Basic Setup

### Create a Port

```typescript
import { createPort } from "@hex-di/ports";

// Define port with service type and name
const LoggerPort = createPort<Logger>("Logger");
const DatabasePort = createPort<Database>("Database");

// Infer types from port
type LoggerService = InferService<typeof LoggerPort>; // Logger
type LoggerName = InferPortName<typeof LoggerPort>; // "Logger"
```

### Create an Adapter

```typescript
import { createAdapter } from "@hex-di/graph";

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const, // No dependencies
  lifetime: "singleton",
  factory: () => new ConsoleLogger(),
});
```

### Build a Graph

```typescript
import { GraphBuilder } from "@hex-di/graph";

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();
```

### Adapter with Dependencies

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort] as const,
  lifetime: "scoped",
  factory: deps => new UserService(deps.Logger, deps.Database),
});
```

---

## Adapter Configuration

### Sync Factory

```typescript
const SyncAdapter = createAdapter({
  provides: SomePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({ value: 42 }),
});
```

### Async Factory

```typescript
const AsyncAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort] as const,
  lifetime: "singleton",
  asyncFactory: async deps => {
    const pool = await connectToDatabase(deps.Config.connectionString);
    return { pool, query: sql => pool.query(sql) };
  },
});

// Use provideAsync for async adapters
const builder = GraphBuilder.create().provideAsync(AsyncAdapter);
```

### Async Initialization Order

```typescript
// Async adapters initialize automatically via topological sort
// Adapters with no async deps initialize first, then their dependents
const ConfigAdapter = createAsyncAdapter({
  provides: ConfigPort,
  requires: [], // No deps - initializes first (level 0)
  factory: async () => loadConfig(),
});

const LoggerAdapter = createAsyncAdapter({
  provides: LoggerPort,
  requires: [ConfigPort], // Depends on Config - level 1
  factory: async deps => new Logger(deps.Config.logLevel),
});

// Independent adapters at same level initialize in parallel
```

---

## Circular Dependencies

### Problem: Direct Cycle

```typescript
// A -> B -> A creates a cycle error!
const A = createAdapter({
  provides: APort,
  requires: [BPort] as const,
  factory: deps => ({ b: deps.B }),
});

const B = createAdapter({
  provides: BPort,
  requires: [APort] as const, // Error: Circular dependency!
  factory: deps => ({ a: deps.A }),
});
```

### Solution: Use lazyPort()

```typescript
import { lazyPort } from "@hex-di/graph";

const A = createAdapter({
  provides: APort,
  requires: [BPort] as const,
  factory: deps => ({ b: deps.B }),
});

const B = createAdapter({
  provides: BPort,
  requires: [lazyPort(APort)] as const, // Lazy!
  factory: deps => ({
    getA: () => deps.LazyA(), // Call thunk when needed
  }),
});
```

### Bidirectional Services Pattern

```typescript
// UserService <-> NotificationService

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [lazyPort(NotificationServicePort)] as const,
  lifetime: "singleton",
  factory: ({ LazyNotificationService }) => ({
    updateUser: (id, data) => {
      // Update user...
      const notifier = LazyNotificationService(); // Deferred
      notifier.send(id, "Profile updated");
    },
  }),
});

const NotificationServiceAdapter = createAdapter({
  provides: NotificationServicePort,
  requires: [UserServicePort] as const, // Direct dependency
  lifetime: "singleton",
  factory: ({ UserService }) => ({
    send: (userId, message) => {
      // Direct access is fine in this direction
      const user = UserService.getUser(userId);
      console.log(`Sending "${message}" to ${user.email}`);
    },
  }),
});
```

---

## Lifetime Configuration

### Lifetime Options

```typescript
// "singleton" - One instance per container (shared)
const SingletonAdapter = createAdapter({
  provides: CachePort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => new InMemoryCache(),
});

// "scoped" - One instance per scope (e.g., per request)
const ScopedAdapter = createAdapter({
  provides: SessionPort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => new Session(),
});

// "transient" - New instance every time
const TransientAdapter = createAdapter({
  provides: RandomIdPort,
  requires: [] as const,
  lifetime: "transient",
  factory: () => ({ id: crypto.randomUUID() }),
});
```

### Avoiding Captive Dependencies

```typescript
// BAD: Singleton captures scoped (captive dependency error!)
const BadAdapter = createAdapter({
  provides: SingletonServicePort,
  requires: [ScopedSessionPort] as const, // Error!
  lifetime: "singleton",
  factory: deps => ({ session: deps.Session }),
});

// GOOD: Use lazy to avoid capture
const GoodAdapter = createAdapter({
  provides: SingletonServicePort,
  requires: [lazyPort(ScopedSessionPort)] as const,
  lifetime: "singleton",
  factory: deps => ({
    getSession: () => deps.LazySession(), // Fresh each call
  }),
});
```

---

## Graph Operations

### Merge Graphs

```typescript
const infraGraph = GraphBuilder.create().provide(LoggerAdapter).provide(ConfigAdapter);

const appGraph = GraphBuilder.create().provide(UserServiceAdapter).provide(OrderServiceAdapter);

const fullGraph = infraGraph.merge(appGraph).build();
```

### Custom Max Depth

```typescript
// For deep dependency chains (default is 30)
const builder = GraphBuilder.withMaxDepth<50>().create();

// Validation
GraphBuilder.withMaxDepth<0>(); // Error: must be >= 1
GraphBuilder.withMaxDepth<150>(); // Error: must be <= 100
```

### Child Graph with Overrides

```typescript
const parentGraph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

// With compile-time override validation
const childBuilder = GraphBuilder.forParent(parentGraph)
  .override(MockLoggerAdapter) // OK: Logger exists in parent
  .provide(CacheAdapter); // New port

const childGraph = childBuilder.buildFragment();
```

### Build Fragment (Incomplete Graph)

```typescript
// For child containers with parent dependencies
const fragment = GraphBuilder.create()
  .provide(OrderServiceAdapter) // Requires UserService from parent
  .buildFragment(); // No error about missing UserService
```

---

## Testing Patterns

### Create Test Doubles

```typescript
const MockLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [] as const,
  lifetime: "singleton",
  factory: () => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
});
```

### Override Production Adapters

```typescript
// Production graph
const prodGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

// Test graph with mocks
const testGraph = GraphBuilder.create()
  .override(MockLoggerAdapter)
  .override(MockDatabaseAdapter)
  .merge(GraphBuilder.create().provide(UserServiceAdapter))
  .build();
```

### Test Fixture Pattern

```typescript
function createTestGraph(
  overrides: {
    logger?: typeof LoggerAdapter;
    database?: typeof DatabaseAdapter;
  } = {}
) {
  return GraphBuilder.create()
    .provide(overrides.logger ?? MockLoggerAdapter)
    .provide(overrides.database ?? MockDatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();
}

// Usage in tests
const graph = createTestGraph({ logger: VerboseLoggerAdapter });
```

---

## Visualization

### DOT Format (Graphviz)

```typescript
const inspection = builder.inspect();
const dot = inspection.toDotGraph();
console.log(dot);
// digraph G {
//   rankdir="LR";
//   node [shape=box];
//   "Logger" [style=filled, fillcolor=lightblue];
//   "Database" -> "Logger";
//   "UserService" -> "Logger";
//   "UserService" -> "Database";
// }
```

### Mermaid Format

```typescript
const mermaid = builder.inspect().toMermaidGraph();
console.log(mermaid);
// graph LR
//   Logger[Logger<br/>singleton]
//   Database[Database<br/>scoped]
//   UserService[UserService<br/>transient]
//   Database --> Logger
//   UserService --> Logger
//   UserService --> Database
```

### Custom DOT Options

```typescript
const dot = inspection.toDotGraph({
  direction: "TB", // Top to bottom
  showLifetimes: true,
  highlightAsync: true,
  clusterByLifetime: false,
});
```

---

## Error Handling

### Validate Before Build

```typescript
const result = builder.validate();

if (result.valid) {
  const graph = builder.build();
} else {
  console.error("Validation failed:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  for (const warning of result.warnings) {
    console.warn(`  - ${warning}`);
  }
}
```

### Runtime Inspection

```typescript
const info = builder.inspect();

console.log({
  adapterCount: info.adapterCount,
  isComplete: info.isComplete,
  maxChainDepth: info.maxChainDepth,
  provides: info.provides,
  unsatisfied: info.unsatisfiedRequirements,
});

// Check suggestions
for (const suggestion of info.suggestions) {
  if (suggestion.type === "missing_adapter") {
    console.log(`Add adapter for: ${suggestion.portName}`);
  }
}
```

### Type-Level Inspection

```typescript
import { InspectValidation, InferBuilderUnsatisfied } from "@hex-di/graph";

type Missing = InferBuilderUnsatisfied<typeof builder>;
// Hover to see: LoggerPort | DatabasePort

type State = InspectValidation<typeof builder>;
// Hover to see full validation state
```

---

## API Quick Lookup

### GraphBuilder Methods

| Method                       | Description                    |
| ---------------------------- | ------------------------------ |
| `create()`                   | Create empty builder           |
| `withMaxDepth<N>()`          | Factory with custom depth      |
| `forParent(graph)`           | Builder with parent validation |
| `provide(adapter)`           | Add adapter (all errors)       |
| `provideFirstError(adapter)` | Add adapter (first error only) |
| `provideAsync(adapter)`      | Add async adapter              |
| `provideMany([...])`         | Add multiple adapters          |
| `override(adapter)`          | Add as override                |
| `merge(builder)`             | Combine builders               |
| `mergeWith(builder, opts)`   | Combine with options           |
| `inspect()`                  | Runtime inspection             |
| `validate()`                 | Validate without building      |
| `build()`                    | Build complete graph           |
| `buildFragment()`            | Build incomplete graph         |

### Type Utilities

| Type                         | Description             |
| ---------------------------- | ----------------------- |
| `InferBuilderProvides<B>`    | Extract provided ports  |
| `InferBuilderUnsatisfied<B>` | Extract missing ports   |
| `InspectValidation<B>`       | Full validation state   |
| `SimplifiedBuilder<T>`       | Simplified builder type |
| `PrettyBuilder<B>`           | Clean tooltip view      |
| `InspectableBuilder<B>`      | Another clean view      |

### Adapter Types

| Type                  | Description                              |
| --------------------- | ---------------------------------------- |
| `Adapter<P, R, L, K>` | Full adapter type                        |
| `AdapterAny`          | Any adapter (for generic code)           |
| `Lifetime`            | `"singleton" \| "scoped" \| "transient"` |
| `FactoryKind`         | `"sync" \| "async"`                      |

---

## Lifetime Validity Matrix

Which lifetimes can depend on which:

| Consumer      | Singleton Dep | Scoped Dep | Transient Dep |
| ------------- | ------------- | ---------- | ------------- |
| **Singleton** | Valid         | Captive!   | Captive!      |
| **Scoped**    | Valid         | Valid      | Captive!      |
| **Transient** | Valid         | Valid      | Valid         |

**Captive = Error** - A longer-lived service would capture a reference to a shorter-lived service, causing stale data.

### Fix Captive Dependencies

1. **Change consumer lifetime** - Make it scoped/transient
2. **Change dependency lifetime** - Make it singleton/scoped
3. **Use lazyPort()** - Defer resolution to avoid capture

```typescript
// Option 3: Lazy dependency
const SingletonService = createAdapter({
  provides: SingletonPort,
  requires: [lazyPort(ScopedPort)] as const,
  lifetime: "singleton",
  factory: ({ LazyScoped }) => ({
    // Get fresh scoped instance each time
    getScoped: () => LazyScoped(),
  }),
});
```

---

## See Also

- [DESIGN.md](./DESIGN.md) - Architecture deep dive
- [DEBUGGING.md](./DEBUGGING.md) - Type-level debugging
- [RUNTIME_INTEGRATION.md](./RUNTIME_INTEGRATION.md) - Container patterns
- [PATTERNS_LARGE_APPS.md](./PATTERNS_LARGE_APPS.md) - Scale patterns
