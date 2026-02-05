# Runtime Design Decisions

This document explains key design decisions in `@hex-di/runtime` and the rationale behind them.

## Decision 1: Why Branded Types Instead of Classes

### The Decision

Container and Scope types use branded types (nominal typing via unique symbols) rather than ES6 classes.

```typescript
// What we do:
const ContainerBrand: unique symbol = Symbol("hex-di.Container");

type Container<TProvides, TExtends, TAsyncPorts, TPhase> = {
  readonly [ContainerBrand]: { TProvides; TExtends; TAsyncPorts; TPhase };
  resolve<P>(port: P): Service<P>;
  // ...
};

// What we DON'T do:
class Container<TProvides, TExtends, TAsyncPorts, TPhase> {
  resolve<P>(port: P): Service<P> {
    /* ... */
  }
}
```

### Alternatives Considered

| Approach          | Pros                             | Cons                                  |
| ----------------- | -------------------------------- | ------------------------------------- |
| **ES6 Classes**   | Familiar OOP pattern, instanceof | Runtime overhead, complex inheritance |
| **Interfaces**    | Type-level only, zero overhead   | Structural typing (unsafe)            |
| **Branded Types** | Nominal typing, zero overhead    | Less familiar pattern                 |

### Why Branded Types?

**1. Zero Runtime Overhead**

Branded types are completely erased at compile time:

```typescript
// TypeScript (compiled):
const container: Container<...> = createContainer(graph);

// JavaScript (emitted):
const container = createContainer(graph);
// No class, no prototype, no brand symbol at runtime
```

ES6 classes add:

- Constructor function overhead
- Prototype chain lookups
- Inheritance complexity
- Memory for method references

**2. Nominal Typing Without Classes**

TypeScript uses structural typing by default, meaning any object with the right shape can be assigned:

```typescript
// With interfaces (structural):
interface Container {
  resolve(port: Port): unknown;
}

// Problem: Any object with resolve() is compatible
const fake = { resolve: () => null };
const container: Container = fake; // Compiles! Bad!
```

Branded types provide nominal typing:

```typescript
// With brands (nominal):
type Container = {
  [ContainerBrand]: unknown;
  resolve(port: Port): unknown;
};

const fake = { resolve: () => null };
const container: Container = fake; // ERROR: Missing brand
```

**3. Compile-Time Phase Tracking**

Type parameters carry state information that affects available operations:

```typescript
type Container<TProvides, TExtends, TAsyncPorts, TPhase> = ...;

// Phase determines what resolve() accepts
resolve<P>(port: P): TPhase extends 'initialized'
  ? Service<P>
  : P extends TAsyncPorts ? never : Service<P>
```

This would be extremely difficult with classes:

- Can't change method signatures based on instance state
- Would need separate classes for each phase
- Type information lost across boundaries

**4. Simpler Testing**

Branded types allow easy test doubles:

```typescript
// Create mock container for testing
const mockContainer = {
  [ContainerBrand]: undefined as never,
  resolve: vi.fn(),
  // ...
} as Container<...>;
```

With classes, you'd need:

- Subclassing or complex mocking
- Mocking prototype methods
- Dealing with private fields

### Trade-offs Accepted

**Less familiar pattern**: Developers coming from OOP backgrounds may find branded types unusual. We address this with:

- Clear documentation
- Examples in JSDoc
- Type aliases for common patterns

**No instanceof**: Can't use `container instanceof Container`. Instead:

- Use type guards: `isContainer(value)`
- Check for brand symbol (rarely needed)

**IDE experience**: Some IDEs show `{ [Symbol]: ..., resolve: ... }` instead of `Container`. Modern IDEs (VS Code, WebStorm) handle this well with hover tooltips.

### Comparison with Other DI Frameworks

| Framework       | Approach      | Runtime Overhead | Nominal Typing |
| --------------- | ------------- | ---------------- | -------------- |
| **InversifyJS** | Classes       | High             | Yes            |
| **TSyringe**    | Classes       | Medium           | Yes            |
| **@hex-di**     | Branded Types | Zero             | Yes            |
| **Awilix**      | Plain objects | Low              | No             |

### References

- [TypeScript Nominal Typing](https://kubyshkin.name/posts/phantom-types-typescript/)
- [Brand type implementation](../src/types/brands.ts)
- [Container type definition](../src/types/container.ts)

---

## Decision 2: Phase-Dependent Resolution

### The Decision

Container types track initialization state in their type parameters, preventing synchronous resolution of async services before initialization.

```typescript
type Container<TProvides, TExtends, TAsyncPorts, TPhase> = ...;
//                                            ^^^^^^ 'uninitialized' | 'initialized'

// Before initAsync() - phase is 'uninitialized'
const logger = container.resolve(LoggerPort);    // OK - sync factory
const db = container.resolve(DatabasePort);      // ERROR - async factory

// After initAsync() - phase is 'initialized'
await container.initAsync();
const db = container.resolve(DatabasePort);      // OK - instance cached
```

### Alternatives Considered

| Approach                  | Pros                  | Cons                                 |
| ------------------------- | --------------------- | ------------------------------------ |
| **Runtime checks**        | Simple implementation | Runtime errors, slower               |
| **Separate methods**      | Clear intent          | API duplication                      |
| **Phase-dependent types** | Compile-time safety   | Type complexity                      |
| **No distinction**        | Simplest API          | Unsafe - allows uninitialized access |

### Why Phase-Dependent Resolution?

**1. Prevents Common Async Errors**

Without phase tracking, this code compiles but fails at runtime:

```typescript
// Compiles, but FAILS at runtime if db not initialized
const db = container.resolve(DatabasePort);
db.query("SELECT ..."); // throws: database not initialized!
```

With phase tracking, this is a **compile-time error**:

```typescript
const db = container.resolve(DatabasePort);
//         ^ ERROR: Cannot resolve async port before initialization
```

**2. Zero Runtime Overhead for Validation**

The check happens entirely at compile time:

```typescript
resolve<P extends Port>(port: P):
  TPhase extends 'initialized'
    ? Service<P>        // All ports allowed
    : P extends TAsyncPorts
      ? never          // Error: async port in uninitialized phase
      : Service<P>     // Non-async ports allowed
```

No runtime `if (phase === 'uninitialized')` checks needed.

**3. Clear Error Messages**

TypeScript provides helpful diagnostics:

```
Error: Type 'never' is not assignable to type 'Database'

Reason: Cannot resolve async port 'Database' from uninitialized container.
Call 'await container.initAsync()' first.
```

**4. Guides Correct Usage**

The type system guides developers to the correct pattern:

```typescript
// 1. Create container
const container = createContainer({ graph, name: "App" });

// 2. Initialize async services
await container.initAsync();

// 3. Now can resolve everything
const service = container.resolve(MyServicePort);
```

### How It Works

**Type-State Pattern**

The container type changes after initialization:

```typescript
// Before:
Container<TProvides, never, TAsyncPorts, "uninitialized">;

// After initAsync():
Container<TProvides, never, TAsyncPorts, "initialized">;
```

**initAsync() Signature**

```typescript
initAsync(): Promise<Container<TProvides, TExtends, TAsyncPorts, 'initialized'>>;
//                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                            Returns NEW type with phase = 'initialized'
```

**Actual Implementation**

The implementation doesn't track phase at runtime:

```typescript
class BaseContainerImpl {
  async initAsync(): Promise<this> {
    // Execute all async factories
    // Return same instance - type changes, not runtime
    return this;
  }
}
```

This is safe because:

- Async factories populate the cache during `initAsync()`
- After initialization, instances are available synchronously
- Type system prevents premature access

### Trade-offs Accepted

**Type Complexity**

Container types have 4 type parameters:

```typescript
Container<TProvides, TExtends, TAsyncPorts, TPhase>;
```

This can be intimidating, but:

- Type inference handles most cases
- Developers rarely write these types explicitly
- Benefits (safety) outweigh costs (complexity)

**Cannot Mix Phases**

You can't store uninitialized and initialized containers in the same variable:

```typescript
let container: Container<...> = createContainer(graph);
container = await container.initAsync(); // Type changes!
```

Solution: Use `const` and reassign:

```typescript
const uninit = createContainer(graph);
const container = await uninit.initAsync();
```

### Comparison with Other DI Frameworks

| Framework       | Async Handling            | Safety              |
| --------------- | ------------------------- | ------------------- |
| **InversifyJS** | No async support          | N/A                 |
| **TSyringe**    | Separate `resolveAsync()` | Runtime errors      |
| **NestJS**      | `onModuleInit` lifecycle  | Runtime checks      |
| **@hex-di**     | Phase-dependent types     | Compile-time safety |

### References

- [Container phase type](../src/types/options.ts)
- [Phase-dependent resolution type](../src/types/container.ts)
- [initAsync implementation](../src/container/base-impl.ts)

---

## Decision 3: Hook Execution Order (FIFO/LIFO)

### The Decision

Resolution hooks use different execution orders:

- `beforeResolve`: **FIFO** (first registered, first called)
- `afterResolve`: **LIFO** (last registered, first called)

```typescript
container.addHook({ beforeResolve: hook1 }); // Called 1st
container.addHook({ beforeResolve: hook2 }); // Called 2nd
container.addHook({ beforeResolve: hook3 }); // Called 3rd

container.addHook({ afterResolve: hook1 }); // Called 3rd
container.addHook({ afterResolve: hook2 }); // Called 2nd
container.addHook({ afterResolve: hook3 }); // Called 1st
```

### Alternatives Considered

| Approach           | Pros               | Cons                        |
| ------------------ | ------------------ | --------------------------- |
| **Both FIFO**      | Consistent, simple | Breaks middleware pattern   |
| **Both LIFO**      | Consistent         | Counterintuitive for before |
| **FIFO/LIFO**      | Matches middleware | Asymmetric                  |
| **Priority-based** | Explicit control   | Complex API                 |

### Why FIFO/LIFO?

**1. Matches Middleware Pattern**

This is the standard pattern in web frameworks:

```typescript
// Express middleware (FIFO setup, LIFO cleanup)
app.use((req, res, next) => {
  console.log("1: before");
  next();
  console.log("1: after");
});

app.use((req, res, next) => {
  console.log("2: before");
  next();
  console.log("2: after");
});

// Output:
// 1: before
// 2: before
// 2: after   ← LIFO
// 1: after   ← LIFO
```

**2. Natural Wrapping Behavior**

Later hooks "wrap" earlier hooks:

```typescript
// Tracing hook (added first)
addHook({
  afterResolve: ctx => {
    tracer.record(ctx.portName, ctx.duration);
  },
});

// Logging hook (added second, wraps tracing)
addHook({
  afterResolve: ctx => {
    console.log(`Resolved ${ctx.portName} in ${ctx.duration}ms`);
  },
});

// Execution order:
// 1. Resolution happens
// 2. Logging hook runs (sees total time including tracing)
// 3. Tracing hook runs (records data)
```

**3. Intuitive for Setup/Teardown**

beforeResolve is "setup" (prepare context) → FIFO makes sense
afterResolve is "teardown" (cleanup) → LIFO matches disposal order

**4. Consistent with Scope Disposal**

Scopes dispose resources in LIFO order (reverse creation). Hook execution matches this:

```typescript
// Create scope, add hooks
const scope = container.createScope();
scope.addHook({ afterResolve: cleanup1 });
scope.addHook({ afterResolve: cleanup2 });

// Later, dispose
scope.dispose(); // Runs cleanup2, then cleanup1 (LIFO)
```

### How It Works

**HooksRunner Implementation**

```typescript
class HooksRunner {
  private beforeHooks: BeforeHook[] = []; // Array = FIFO
  private afterHooks: AfterHook[] = []; // Array, iterated reverse = LIFO

  runBefore(ctx: ResolutionHookContext) {
    // FIFO: iterate forward
    for (const hook of this.beforeHooks) {
      hook(ctx);
    }
  }

  runAfter(ctx: ResolutionResultContext) {
    // LIFO: iterate backward
    for (let i = this.afterHooks.length - 1; i >= 0; i--) {
      this.afterHooks[i](ctx);
    }
  }
}
```

### Real-World Example

**DevTools + Tracing Integration**

```typescript
// Tracing (low-level, should run last in afterResolve)
enableTracing(container); // Adds afterResolve hook

// DevTools (high-level, should see traced results)
devtools.attach(container); // Adds afterResolve hook

// Resolution:
container.resolve(UserServicePort);

// Hook execution order:
// beforeResolve: tracing, then devtools (FIFO)
// afterResolve: devtools, then tracing (LIFO)
```

This ensures DevTools sees the complete picture including tracing data.

### Trade-offs Accepted

**Asymmetry**

The FIFO/LIFO split is less obvious than "always FIFO" or "always LIFO". We address this with:

- Clear documentation
- JSDoc on hook types
- Examples in tests

**Mid-Resolution Modifications**

If a hook adds/removes hooks during resolution, effects are immediate:

```typescript
addHook({
  beforeResolve: ctx => {
    // This hook will affect CURRENT resolution
    addHook({ beforeResolve: newHook });
  },
});
```

This is intentional (allows dynamic instrumentation) but can be surprising.

### Comparison with Other DI Frameworks

| Framework       | Hook Order | Rationale                      |
| --------------- | ---------- | ------------------------------ |
| **NestJS**      | FIFO       | Interceptors = middleware      |
| **InversifyJS** | FIFO       | Middleware pattern             |
| **@hex-di**     | FIFO/LIFO  | Matches setup/teardown pattern |

### References

- [Hook types definition](../src/resolution/hooks.ts)
- [HooksRunner implementation](../src/resolution/hooks-runner.ts)
- [Hook execution tests](../tests/hooks-execution-order.test.ts)

---

## Decision 4: Override Builder Pattern

### The Decision

Overrides use a fluent builder API with step-by-step validation:

```typescript
const testContainer = container
  .override(UserServicePort)
  .withAdapter(mockUserServiceAdapter)
  .build();
```

### Alternatives Considered

| Approach                 | Pros                  | Cons                          |
| ------------------------ | --------------------- | ----------------------------- |
| **Configuration object** | Single call, simple   | No incremental validation     |
| **Fluent builder**       | Type-safe, composable | More verbose                  |
| **Function overloads**   | Flexible              | Complex types, hard to extend |
| **String-based keys**    | Concise               | No type safety                |

### Why Fluent Builder?

**1. Step-by-Step Type Validation**

Each step validates before proceeding:

```typescript
container
  .override(UnknownPort)      // ERROR: Port not in graph
  .withAdapter(...)
  .build();

container
  .override(UserServicePort)
  .withAdapter(adapterWithMissingDeps) // ERROR: Dependencies not satisfied
  .build();
```

With a configuration object, errors only appear at the end:

```typescript
createOverride({
  port: UnknownPort, // Error not caught until...
  adapter: mockAdapter,
}); // ...this line
```

**2. Clear Intent**

The builder makes the operation explicit:

```typescript
// Clear: Creating override container with specific adapter
container.override(port).withAdapter(adapter).build();

// Less clear: What's being configured?
createOverride({ port, adapter });
```

**3. Extensible**

Can add more steps without breaking existing code:

```typescript
// v5.0: Basic override
container.override(port).withAdapter(adapter).build();

// v6.0: Could add more configuration
container
  .override(port)
  .withAdapter(adapter)
  .withMode("isolated") // New in v6.0
  .build();
```

**4. Immutability**

Each step returns a new builder:

```typescript
const builder1 = container.override(port);
const builder2 = builder1.withAdapter(adapter1);
const builder3 = builder1.withAdapter(adapter2); // Different from builder2

// Can create multiple overrides from same base
const test1 = builder2.build();
const test2 = builder3.build();
```

### How It Works

**Type-State Builder**

The builder type changes at each step:

```typescript
type OverrideBuilder<TState> =
  TState extends "selecting_port"
    ? { withAdapter: (...) => OverrideBuilder<"has_adapter"> }
    : TState extends "has_adapter"
      ? { build: () => Container }
      : never;
```

**Two-Phase Validation**

1. **Port existence** (at `.override()` call):

```typescript
override<P extends TProvides>(port: P) {
  if (!this.graph.provides(port)) {
    throw new PortNotInGraphError(port);
  }
  return new OverrideBuilder(this, port);
}
```

2. **Dependency satisfaction** (at `.withAdapter()` call):

```typescript
withAdapter(adapter: Adapter) {
  const missing = validateDependencies(adapter, parentGraph);
  if (missing.length > 0) {
    throw new MissingDependenciesError(missing);
  }
  return new OverrideBuilderWithAdapter(this.parent, this.port, adapter);
}
```

**Graph Composition**

Override creates a new graph fragment:

```typescript
build(): Container {
  const overrideGraph = GraphBuilder
    .forParent(this.parentGraph)
    .provide(this.adapter)
    .build();

  return createChildContainer(this.parent, overrideGraph, {
    name: `override:${this.port.__portName}`
  });
}
```

### Real-World Example

**Testing with Mocks**

```typescript
// Production container
const container = createContainer({ graph: productionGraph, name: "App" });

// Test: Override with mock
const testContainer = container
  .override(UserServicePort)
  .withAdapter(mockUserServiceAdapter)
  .build();

// Test: Multiple overrides
const integrationTestContainer = container
  .override(UserServicePort)
  .withAdapter(mockUserServiceAdapter)
  .override(DatabasePort)
  .withAdapter(inMemoryDatabaseAdapter)
  .build();
```

### Trade-offs Accepted

**More Verbose**

The builder is more verbose than a single function call:

```typescript
// Builder (verbose):
container.override(port).withAdapter(adapter).build();

// Function (concise):
override(container, port, adapter);
```

We accept this because:

- Type safety is worth the verbosity
- IDEs autocomplete the methods
- Clear step-by-step flow

**Implementation Complexity**

The builder requires:

- Multiple intermediate types
- Type-state transitions
- Validation at each step

We accept this because:

- Complexity is internal (users see simple API)
- Benefits (safety, clarity) outweigh costs

### Comparison with Other DI Frameworks

| Framework       | Override API           | Type Safety           |
| --------------- | ---------------------- | --------------------- |
| **TSyringe**    | `container.register()` | Weak                  |
| **InversifyJS** | `container.rebind()`   | Weak                  |
| **Awilix**      | `container.register()` | None                  |
| **@hex-di**     | Fluent builder         | Strong (compile-time) |

### References

- [OverrideBuilder implementation](../src/container/override-builder.ts)
- [Override types](../src/types/override-types.ts)
- [Override builder tests](../../testing/tests/override-builder.test.ts)

---

## Decision 5: No External Dependencies

### The Decision

`@hex-di/runtime` has zero external runtime dependencies. All utilities (like Levenshtein distance for suggestions) are hand-rolled.

```typescript
// What we do:
export function levenshteinDistance(a: string, b: string): number {
  // ~30 lines of implementation
}

// What we DON'T do:
import levenshtein from "fastest-levenshtein";
```

### Alternatives Considered

| Approach                   | Pros                       | Cons                           |
| -------------------------- | -------------------------- | ------------------------------ |
| **Zero dependencies**      | Small bundle, full control | Implement algorithms ourselves |
| **Selective dependencies** | Use best libraries         | Bundle size grows              |
| **Full lodash/ramda**      | Rich utility library       | Large bundle, unused functions |

### Why No External Dependencies?

**1. Bundle Size**

Every dependency adds to user bundles:

```
fastest-levenshtein: 2.4KB minified
+ dependencies: 0KB
= 2.4KB total

vs.

hand-rolled: 0.5KB minified
+ dependencies: 0KB
= 0.5KB total
```

For simple algorithms, the overhead isn't worth it.

**2. Zero Supply Chain Risk**

No dependencies means:

- No npm packages to audit
- No transitive dependencies
- No risk of supply chain attacks (leftpad, event-stream)
- No dependency updates to track

**3. Full Control**

We can:

- Optimize for our specific use case
- Change implementation without version bumps
- Fix bugs immediately
- Customize behavior

**4. TypeScript Native**

Hand-rolled utilities:

- Use TypeScript features (generics, strict types)
- Don't need `@types/*` packages
- Integrate seamlessly with our types

### When This Applies

**Hand-roll for:**

- Simple algorithms (<50 lines)
- String utilities (Levenshtein, case conversion)
- Array utilities (unique, groupBy)
- Object utilities (pick, omit)

**Use libraries for:**

- Complex algorithms (graph traversal - but we have @hex-di/graph for this)
- Performance-critical code (if hand-rolled is too slow)
- Spec implementations (crypto, encodings)

### Examples in Codebase

**Levenshtein Distance** (`util/string-similarity.ts`):

```typescript
export function levenshteinDistance(a: string, b: string): number {
  // 30 lines of standard dynamic programming implementation
  // Used for "did you mean?" suggestions
}
```

Why not `fastest-levenshtein`?

- Only used in error paths (not performance critical)
- Standard algorithm, easy to implement
- No edge cases or special requirements

**MemoMap** (`util/memo-map.ts`):

```typescript
export class MemoMap<K, V> {
  private map = new Map<K, MemoEntry<V>>();
  // Implementation for caching with timestamps
}
```

Why not use a cache library?

- Needs specific behavior (timestamps, optional)
- Simple implementation (<100 lines)
- No need for LRU, TTL, or other cache features

### When We DO Use Dependencies

**Development dependencies** (testing, building):

- `vitest` - Testing framework
- `typescript` - Type checking
- `prettier` - Code formatting
- `eslint` - Linting

These don't affect user bundles.

**Peer dependencies** (user provides):

- `@hex-di/core` - Port types
- `@hex-di/graph` - Graph validation

Users already have these.

### Trade-offs Accepted

**Maintenance Burden**

We maintain utilities ourselves:

- Need to test edge cases
- Need to fix bugs
- Need to document behavior

We accept this because:

- Utilities are small and stable
- Benefits (bundle size, control) outweigh costs
- Our utilities are simpler than general-purpose libraries

**Not Industry Standard**

Some developers prefer using established libraries:

- "Don't reinvent the wheel"
- "Use battle-tested code"

We accept this because:

- Simple algorithms have no hidden complexity
- We have comprehensive tests
- Bundle size matters for library consumers

### Comparison with Other DI Frameworks

| Framework       | Runtime Deps | Bundle Size | Notes                        |
| --------------- | ------------ | ----------- | ---------------------------- |
| **InversifyJS** | 1            | ~30KB       | reflect-metadata             |
| **TSyringe**    | 2            | ~25KB       | tsyringe + reflect-metadata  |
| **Awilix**      | 0            | ~15KB       | Zero dependencies            |
| **@hex-di**     | 2            | ~20KB       | @hex-di/core + @hex-di/graph |

Note: @hex-di/core and @hex-di/graph are peer dependencies (part of the HexDI ecosystem, not external).

### References

- [String similarity implementation](../src/util/string-similarity.ts)
- [MemoMap implementation](../src/util/memo-map.ts)
- [Package dependencies](../../package.json)

---

## Decision 6: Disposal Order (LIFO)

### The Decision

Disposable resources are disposed in **LIFO** (Last-In-First-Out) order - reverse of creation order.

```typescript
// Creation order:
const db = scope.resolve(DatabasePort); // 1st
const repo = scope.resolve(RepositoryPort); // 2nd (depends on db)
const service = scope.resolve(ServicePort); // 3rd (depends on repo)

// Disposal order (LIFO):
scope.dispose();
// 1. Dispose ServicePort
// 2. Dispose RepositoryPort
// 3. Dispose DatabasePort
```

### Alternatives Considered

| Approach                  | Pros                  | Cons                              |
| ------------------------- | --------------------- | --------------------------------- |
| **FIFO (creation order)** | Simpler to understand | Breaks dependent resources        |
| **LIFO (reverse order)**  | Safe for dependencies | Slightly counterintuitive         |
| **Dependency-based**      | Optimal               | Complex, requires graph traversal |
| **No guarantees**         | Simple implementation | Unsafe - can cause errors         |

### Why LIFO?

**1. Dependencies Must Outlive Dependents**

Consider a database connection and repository:

```typescript
class PostgresDatabase {
  async [Symbol.asyncDispose]() {
    await this.connection.close(); // Close connection
  }
}

class UserRepository {
  constructor(private db: Database) {}

  async [Symbol.asyncDispose]() {
    await this.db.query("DELETE FROM temp_users"); // Uses db!
  }
}
```

If we dispose in FIFO order:

1. Dispose Database (closes connection)
2. Dispose UserRepository (tries to use closed connection) ❌ ERROR

With LIFO order:

1. Dispose UserRepository (uses open connection) ✅
2. Dispose Database (closes connection) ✅

**2. Matches Stack Semantics**

Resources form a stack:

```
┌─────────────┐  ← ServicePort (depends on ↓)
├─────────────┤
│ RepositoryPort│ ← (depends on ↓)
├─────────────┤
│ DatabasePort │  ← (no dependencies)
└─────────────┘

Disposal: Pop from top (LIFO)
```

This is the same pattern as function call stacks, scope chains, and cleanup in most languages.

**3. Consistent with Hook Execution**

`afterResolve` hooks use LIFO order for cleanup. Disposal follows the same pattern:

- First resolved = last disposed
- Last resolved = first disposed

**4. Standard Pattern in Other Systems**

LIFO disposal is used in:

- C++ destructors (reverse construction order)
- Rust Drop trait (reverse creation order)
- Go defer statements (LIFO)
- Python context managers (reverse `__enter__` order)

### How It Works

**Tracking Resolution Order**

```typescript
class ScopeImpl {
  private resolved: Array<{ port: Port, instance: unknown }> = [];

  resolve(port: Port): unknown {
    const instance = /* ... resolve ... */;
    this.resolved.push({ port, instance });
    return instance;
  }
}
```

**Disposal Process**

```typescript
async dispose(): Promise<void> {
  // Iterate backward (LIFO)
  for (let i = this.resolved.length - 1; i >= 0; i--) {
    const entry = this.resolved[i];

    if (Symbol.asyncDispose in entry.instance) {
      await entry.instance[Symbol.asyncDispose]();
    } else if (Symbol.dispose in entry.instance) {
      entry.instance[Symbol.dispose]();
    }
  }

  this.resolved = []; // Clear
}
```

**Error Aggregation**

If multiple disposals fail, all errors are collected:

```typescript
const errors: Error[] = [];

for (const entry of this.resolved.reverse()) {
  try {
    await dispose(entry);
  } catch (err) {
    errors.push(err);
  }
}

if (errors.length > 0) {
  throw new AggregateDisposalError(errors);
}
```

### Real-World Example

**HTTP Request Scope**

```typescript
// Request handler
async function handleRequest(req: Request) {
  const scope = container.createScope();

  try {
    // Resolve services in order:
    const db = scope.resolve(DatabasePort); // 1. Connect to DB
    const tx = scope.resolve(TransactionPort); // 2. Begin transaction
    const service = scope.resolve(ServicePort); // 3. Create service

    // Handle request
    return await service.handle(req);
  } finally {
    // Dispose in reverse order (LIFO):
    await scope.dispose();
    // 3. Dispose service (cleanup temp data)
    // 2. Dispose transaction (commit/rollback)
    // 1. Dispose database (close connection)
  }
}
```

This ensures:

- Transaction commits/rolls back before connection closes
- Service cleanup happens before transaction finishes
- No "connection already closed" errors

### Trade-offs Accepted

**Not Optimal for All Cases**

LIFO assumes dependencies form a stack. In rare cases with complex graphs, optimal disposal order would require topological sort.

Example where LIFO isn't optimal:

```
A depends on B
A depends on C
B depends on D
C depends on D

Creation order: D, B, C, A
LIFO order: A, C, B, D
Optimal order: A, B, C, D (or A, C, B, D)
```

We accept this because:

- Stack assumption is true 99% of the time
- Optimal sort requires graph traversal (slower)
- LIFO is simple and predictable

**Disposal Can Be Slow**

If many resources need disposal, LIFO iteration can take time:

```typescript
// 1000 resources to dispose
await scope.dispose(); // Iterates 1000 times
```

We accept this because:

- Disposal is typically infrequent
- Correctness (safe disposal) trumps performance
- Can optimize if profiling shows issues

### Comparison with Other DI Frameworks

| Framework       | Disposal Order | Async Support |
| --------------- | -------------- | ------------- |
| **InversifyJS** | No disposal    | N/A           |
| **TSyringe**    | No disposal    | N/A           |
| **NestJS**      | LIFO           | Yes           |
| **@hex-di**     | LIFO           | Yes           |

### References

- [Scope disposal implementation](../src/scope/impl.ts)
- [Disposal order tests](../tests/scope-disposal.test.ts)
- [Disposal protocol documentation](../src/types/scope.ts)

---

## Summary

These design decisions prioritize:

1. **Type safety**: Compile-time validation wherever possible
2. **Zero overhead**: No runtime cost for type-level features
3. **Clarity**: Explicit, predictable behavior
4. **Standards**: Follow established patterns (LIFO disposal, middleware order)
5. **Simplicity**: Hand-roll simple utilities, avoid dependencies

Trade-offs are documented and intentional. Each decision optimizes for the library's core value: catching errors at compile time with zero runtime overhead.
