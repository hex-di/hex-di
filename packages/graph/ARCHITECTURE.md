# @hex-di/graph Architecture

This document explains the architectural decisions and patterns used in the `@hex-di/graph` package.

## Hexagonal Architecture Position

`@hex-di/graph` sits in the **Graph Layer** of the HexDI ecosystem, between the foundational Ports layer and the Runtime layer. Dependencies flow strictly inward.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HexDI Ecosystem                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               PRESENTATION LAYER (Outermost)                 │    │
│  │   @hex-di/react      React hooks & context providers         │    │
│  │   @hex-di/hono       Hono framework integration              │    │
│  │   @hex-di/devtools   Browser DevTools extension              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    RUNTIME LAYER                             │    │
│  │   @hex-di/runtime    Container, resolution, lifecycle        │    │
│  │   @hex-di/testing    Test utilities, mock helpers            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 GRAPH LAYER (This Package)                   │    │◄── YOU ARE HERE
│  │   @hex-di/graph      Compile-time validation, graph builder  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  PORTS LAYER (Innermost)                     │    │
│  │   @hex-di/ports      Port tokens, zero runtime dependencies  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer            | Package               | Responsibility                                                                    |
| ---------------- | --------------------- | --------------------------------------------------------------------------------- |
| **Ports**        | `@hex-di/ports`       | Port tokens, `createPort()`, type inference utilities. Zero dependencies.         |
| **Graph**        | `@hex-di/graph`       | Compile-time validation, `GraphBuilder`, `Adapter` type, cycle/captive detection. |
| **Runtime**      | `@hex-di/runtime`     | Container implementation, service resolution, lifetime management.                |
| **Presentation** | `@hex-di/react`, etc. | Framework-specific integrations (hooks, providers).                               |

### Dependency Rules

1. **This package depends on `@hex-di/ports`**
   - **Type-level**: Most imports use `import type` for Port types and inference utilities
   - **Runtime**: The `defineService()` and `defineAsyncService()` convenience functions import `createPort` at runtime (see `src/adapter/service.ts`)
2. **No runtime imports from outer layers** - no `@hex-di/runtime`, no `@hex-di/react`
3. **Framework-agnostic** - no React, Hono, or other framework dependencies

#### Runtime Dependency on @hex-di/ports

The `defineService()` family of functions provides a convenience API that creates both a port and adapter in a single call. This requires a runtime import of `createPort` from `@hex-di/ports`:

```typescript
// src/adapter/service.ts
import { createPort, type Port } from "@hex-di/ports";

// createPort is called at runtime when defineService is invoked
export function defineService<TName extends string, TService>(name: TName, config: {...}) {
  const port = createPort<TName, TService>(name);  // Runtime call
  const adapter = createAdapter({ provides: port, ... });
  return [port, adapter] as const;
}
```

**Why this is acceptable:**

- `@hex-di/ports` is a zero-dependency package designed to be lightweight
- The runtime import is isolated to convenience functions, not core graph validation
- Users who don't use `defineService` only incur type-level dependencies
- The dependency is explicit in `package.json` and tree-shakeable

### Why Inspection Lives in Graph Layer (Not Runtime)

The `inspectGraph()` function and related inspection utilities are deliberately placed in the Graph layer rather than Runtime:

1. **Build-time tooling** - Inspection enables IDE plugins, static analysis tools, and build-time graph visualization without requiring a running container.

2. **Zero runtime overhead** - Graph inspection examines adapter metadata only; no services are instantiated during inspection. This makes it safe to call in performance-sensitive contexts.

3. **Framework-agnostic** - Inspection works without container instantiation, meaning it can be used in CLI tools, build scripts, and documentation generators that don't need the full runtime.

4. **Separation of concerns** - The Runtime layer focuses on service lifecycle (resolution, caching, disposal). The Graph layer focuses on structure (dependencies, validation, visualization). Inspection is purely structural analysis.

5. **Testing utilities** - Test frameworks can inspect graphs to verify structure without creating containers, enabling faster unit tests for graph configuration.

---

## Overview

`@hex-di/graph` provides compile-time validation for dependency injection graphs using advanced TypeScript type-level programming. All validations happen at compile time with **zero runtime overhead**.

## Core Patterns

### Type-State Pattern

The `GraphBuilder` class implements the **Type-State Pattern** - where an object's type changes with each method call:

```typescript
// Each .provide() call changes the type parameters
const builder = GraphBuilder.create() // GraphBuilder<never, never, ...>
  .provide(LoggerAdapter) // GraphBuilder<LoggerPort, never, ...>
  .provide(DatabaseAdapter); // GraphBuilder<LoggerPort | DatabasePort, LoggerPort, ...>
```

This is achieved through **7 phantom type parameters**:

| Parameter         | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `TProvides`       | Union of all provided ports                  |
| `TRequires`       | Union of all required ports                  |
| `TAsyncPorts`     | Union of async ports                         |
| `TDepGraph`       | Type-level dependency adjacency map          |
| `TLifetimeMap`    | Type-level port→lifetime map                 |
| `TOverrides`      | Union of override ports                      |
| `TParentProvides` | Parent graph ports (for override validation) |

At runtime, `GraphBuilder` is just `{ adapters: readonly AdapterAny[] }`.

### Validation Pipeline

When `.provide(adapter)` is called, validations run in this order:

```
Input Adapter
     │
     ▼
┌─────────────────────────────────────┐
│ 1. Duplicate Detection (fastest)    │
│    HasOverlap<NewPort, TProvides>   │
└─────────────┬───────────────────────┘
              │ false
              ▼
┌─────────────────────────────────────┐
│ 2. Circular Dependency Detection    │
│    WouldCreateCycle<DepGraph, ...>  │
└─────────────┬───────────────────────┘
              │ false
              ▼
┌─────────────────────────────────────┐
│ 3. Captive Dependency Detection     │
│    FindAnyCaptiveDependency<...>    │
└─────────────┬───────────────────────┘
              │ none found
              ▼
┌─────────────────────────────────────┐
│ 4. Success!                          │
│    GraphBuilder<updated types>       │
└─────────────────────────────────────┘
```

### Template Literal Error Types

Error messages are template literal strings, making them immediately visible in IDE tooltips:

```typescript
// Instead of complex branded types, errors are simple strings:
"ERROR: Circular dependency: A -> B -> C -> A";
"ERROR: Captive dependency: Singleton 'UserService' cannot depend on Scoped 'Database'";
```

## Type-Level Algorithms

### Cycle Detection: Depth-Limited DFS

Circular dependency detection uses a **type-level depth-first search** (DFS) algorithm.

#### How It Works

1. Build a type-level adjacency map: `{ PortName: RequiredPortNames }`
2. For each new adapter, check if its `provides` port is reachable from its `requires` ports
3. If reachable, adding this adapter would create a cycle

#### Depth Limiting (MaxDepth=30)

TypeScript has recursion limits (TS2589: "Type instantiation is excessively deep"). To prevent this, we limit the search depth:

```typescript
type MaxDepth = 30; // Conservative limit
```

**Why 30?**

- Real-world dependency graphs rarely exceed 15 levels deep
- 30 provides a 2x safety margin
- Catches 99%+ of actual cycles in practice

**What happens beyond MaxDepth?**

- The type-level check returns `false` (assumes no cycle)
- This is intentional: better to allow rare deep graphs than block valid code
- Runtime validation can catch edge cases if needed

#### Troubleshooting TS2589

If you encounter "Type instantiation is excessively deep":

1. **Split your graph**: Break into smaller chunks and merge later
2. **Use `buildFragment()`**: For child graphs with parent dependencies
3. **Check for indirect cycles**: Deep cycles may indicate architectural issues

### Captive Dependency Detection: Lifetime Hierarchy

A **captive dependency** occurs when a longer-lived service holds a reference to a shorter-lived service:

```
Singleton A ──depends on──► Scoped B
    │                           │
    │                           └── Should be recreated per scope
    └── Lives forever, holds reference to single B instance

Result: B becomes effectively singleton, stale across scopes!
```

#### Lifetime Levels

We assign numeric levels where **LOWER = LONGER LIVED**:

```
Level 1: Singleton  ───────────────────────────────────► (longest)
Level 2: Scoped     ─────────────►
Level 3: Transient  ───►                                  (shortest)
```

**The Rule:** An adapter's level must be ≥ all its dependencies' levels.

| Adapter Lifetime | Can Depend On                |
| ---------------- | ---------------------------- |
| Singleton (1)    | Singleton only               |
| Scoped (2)       | Singleton, Scoped            |
| Transient (3)    | Singleton, Scoped, Transient |

#### Why Pattern Matching (Not Arithmetic)?

TypeScript cannot perform arithmetic at the type level (`A > B`). We use explicit pattern matching:

```typescript
type IsGreaterThan<A extends number, B extends number> = A extends 1
  ? false // Level 1 (Singleton) is never > anything
  : A extends 2
    ? B extends 1
      ? true
      : false // Level 2 > Level 1 only
    : A extends 3
      ? B extends 1 | 2
        ? true
        : false // Level 3 > Levels 1,2
      : false;
```

This is efficient because there are only 9 possible comparisons (3×3).

#### Forward Reference Captive Validation Gap

**Problem:** Type-level captive detection relies on knowing the lifetime of dependencies at `.provide()` time. When an adapter references a port that hasn't been registered yet (forward reference), the type system cannot detect captive violations.

```typescript
// Forward reference scenario - type system misses the captive dependency
const graph = GraphBuilder.create()
  .provide(SingletonAdapter) // Depends on ScopedPort (not yet registered)
  .provide(ScopedAdapter); // Registers ScopedPort AFTER the singleton

// Type-level check at SingletonAdapter: "ScopedPort not in lifetime map, skip check"
// Result: Captive dependency passes type checking!
```

**Why this exists:** To allow order-independent adapter registration. Users shouldn't need to register dependencies before dependents.

**The Gap:**

1. When `SingletonAdapter` is added, `ScopedPort` isn't in the lifetime map yet
2. Type-level captive check returns `never` (no violation found)
3. When `ScopedAdapter` is added later, we only check ITS dependencies, not what depends on IT
4. The captive dependency goes undetected at compile time

**Defense-in-Depth Fix:** The `build()` and `buildFragment()` functions **always** run runtime captive detection via `detectCaptiveAtRuntime()`, regardless of whether the type-level depth limit was exceeded. This ensures:

- Forward reference captive dependencies are caught at build time
- Type system bypasses (testing utilities, dynamic construction) don't create silent failures
- The error message (HEX003) is identical whether caught at compile time or runtime

**When runtime detection triggers:**

- Forward references in adapter registration order
- Direct `buildGraph()` calls bypassing `GraphBuilder` (e.g., in tests)
- Dynamic adapter construction outside the type system

See `src/builder/builder-build.ts` for the implementation and `tests/forward-ref-validation-gap.test.ts` for test coverage.

## Design Decisions

### Why Nested Conditionals (Not Unions)?

The validation pipeline uses nested conditionals:

```typescript
HasOverlap<...> extends true
  ? DuplicateError
  : WouldCreateCycle<...> extends true
    ? CycleError
    : FindCaptive<...> extends infer CP
      ? ...
```

**Why not union return types?**

- Each check must complete before the next runs
- Union return types would accept EITHER branch
- Nested structure preserves validation order and fail-fast behavior

### Why `defineService` Combines Port and Adapter Creation?

The `defineService` and `defineAsyncService` functions deliberately **cross the port/adapter boundary** by creating both in a single call:

```typescript
// Creates both port AND adapter together
const [LoggerPort, LoggerAdapter] = defineService<"Logger", Logger>("Logger", {
  factory: () => new ConsoleLogger(),
});
```

This violates the strict separation between ports (contracts) and adapters (implementations), but is an **intentional ergonomics trade-off**.

#### The Trade-Off

| Aspect                      | Separate Creation   | Combined `defineService`          |
| --------------------------- | ------------------- | --------------------------------- |
| **Port/Adapter Separation** | ✅ Clean separation | ❌ Coupled                        |
| **Boilerplate**             | ❌ More verbose     | ✅ Reduced                        |
| **Type Safety**             | ✅ Full             | ✅ Full                           |
| **Multiple Adapters**       | ✅ Easy             | ❌ Requires separate `createPort` |
| **Testing**                 | ✅ Easy mock ports  | ⚠️ Port tied to adapter           |

#### When to Use Each Approach

**Use `defineService` when:**

- You have a 1:1 mapping between port and adapter (most common case)
- You want minimal boilerplate for simple services
- You're creating application-specific services (not library code)

```typescript
// Quick and simple - great for most app code
const [UserServicePort, UserServiceAdapter] = defineService<"UserService", UserService>(
  "UserService",
  {
    requires: [DatabasePort, LoggerPort],
    factory: deps => new UserServiceImpl(deps.Database, deps.Logger),
  }
);
```

**Use separate `createPort` + `createAdapter` when:**

- You need multiple adapters for the same port (e.g., production vs test)
- You're writing library code where consumers provide their own adapters
- You want the port to be importable without pulling in implementation details
- You need adapters in different packages from their ports

```typescript
// Separate creation - better for libraries and multiple implementations
// ports.ts (can be imported without implementation)
export const DatabasePort = createPort<"Database", Database>("Database");

// adapters/postgres.ts
export const PostgresAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: deps => new PostgresDatabase(deps.Logger),
});

// adapters/sqlite.ts (alternative implementation)
export const SqliteAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: deps => new SqliteDatabase(deps.Logger),
});
```

#### Why This Trade-Off Is Acceptable

1. **Type safety is preserved**: The returned tuple is fully typed and frozen
2. **Port is still extractable**: `const [MyPort] = defineService(...)` gives you the port
3. **Common case optimization**: 80%+ of services have exactly one adapter
4. **Opt-in ergonomics**: Users who need separation can use `createPort` + `createAdapter`

#### Relationship to Hexagonal Architecture

In strict Hexagonal Architecture, ports (interfaces) should be defined in the domain layer, while adapters (implementations) belong in the infrastructure layer.

`defineService` is designed for the **application layer**, where:

- The service IS the domain concept (not adapting to external systems)
- There's no need for multiple implementations
- Developer velocity trumps architectural purity

For **infrastructure adapters** (databases, HTTP clients, etc.), prefer separate `createPort` + `createAdapter`.

### Why Direct Imports for Internal Types?

`builder.ts` imports internal types directly from source files:

```typescript
// Direct import (bypasses validation/index.ts)
import type { WouldCreateCycle, ... } from "../validation/cycle-detection";
```

This separates:

- **Public API** (14 types via `validation/index.ts`)
- **Internal implementation** (48+ types imported directly)

Consumers get a clean API; implementation stays flexible.

### Why `as` Casts in Builder Methods? (Architectural Necessity)

Each builder method has a cast:

```typescript
provide<A>(adapter: A): ProvideResult<...> {
  return new GraphBuilder([...this.adapters, adapter]) as ProvideResult<...>;
}
```

#### The Type-State Builder Pattern Duality

This pattern creates a **fundamental duality** between runtime and type-level behavior:

| Aspect         | Runtime                       | Type Level                             |
| -------------- | ----------------------------- | -------------------------------------- |
| **Behavior**   | Always creates `GraphBuilder` | Returns `GraphBuilder` OR error string |
| **Validation** | None (zero overhead)          | Full validation pipeline               |
| **Errors**     | Never occur                   | Produce template literal strings       |

#### Why TypeScript Cannot Infer This

TypeScript's type system cannot prove that:

1. The conditional `ProvideResult<...>` will always resolve to `GraphBuilder` at runtime
2. The error branch is **unreachable at runtime** (it only exists for compile-time checking)

This is a fundamental limitation—TypeScript evaluates conditionals based on type constraints, not runtime flow analysis.

#### Why These Casts Are NOT Escape Hatches

These casts are **architecturally necessary** and differ from problematic casts:

| Escape Hatch (Bad)         | Architectural Cast (This Pattern)    |
| -------------------------- | ------------------------------------ |
| Silences type errors       | Bridges type-level/runtime duality   |
| Hides bugs                 | Enables compile-time-only validation |
| Can cause runtime failures | Runtime is always correct            |
| Should be eliminated       | Cannot be eliminated in TypeScript   |

#### Type-Level Verification

The casts are **verified sound** by type-level assertions in tests:

```typescript
// Verify success branch always produces GraphBuilder
type AssertProvideSuccessIsBuilder =
  Extract<
    ProvideResult<never, never, never, {}, {}, never, never, SomeValidAdapter>,
    GraphBuilder<unknown, unknown, unknown, unknown, unknown, unknown, unknown>
  > extends never
    ? false
    : true;

// This must be true - if it's false, the cast would be unsound
const _: AssertProvideSuccessIsBuilder = true;
```

#### Alternative Approaches (All Rejected)

| Approach                  | Why Rejected                                            |
| ------------------------- | ------------------------------------------------------- |
| **Function overloads**    | Cannot enumerate infinite valid configurations          |
| **Runtime validation**    | Duplicates logic, adds overhead, defeats zero-cost goal |
| **Branded success types** | Still requires cast at boundary                         |
| **Type predicates**       | Cannot narrow return types, only parameters             |
| **Assertion functions**   | Cannot transform return types                           |

#### Conclusion

These casts are the **established TypeScript pattern** for type-state builders with compile-time-only validation. They are:

- ✅ **Safe**: Runtime always produces correct instances
- ✅ **Necessary**: No alternative exists in TypeScript
- ✅ **Documented**: Each has a `// SAFETY:` comment
- ✅ **Verified**: Type-level tests confirm soundness
- ✅ **Zero-cost**: Completely erased at runtime

## DRY Considerations

### Accepted Repetition: Batch Validators

`WouldAnyCreateCycle` and `WouldAnyBeCaptive` share similar loop patterns:

```typescript
type WouldAnyCreateCycle<TMap, TAdapters extends readonly unknown[]> =
  TAdapters extends readonly [infer First, ...infer Rest]
    ? CheckFirst<...> extends Error ? Error : Recurse<UpdateMap, Rest>
    : Success;
```

**Why not abstract?**

- TypeScript has no "higher-order types" (can't pass validation logic as type parameter)
- Abstracting would require 20+ lines of generic infrastructure
- Current duplication is clearer than complex generics

This is a **TypeScript limitation**, not a code smell.

### Consolidated: MergeResult Types

The merge validation pipeline uses chained helper types:

```
MergeResult → MergeCheckDuplicates → MergeCheckCycles → MergeCheckCaptive → MergeSuccess
```

The success type (`MergeSuccess`) is defined once, avoiding repetition.

## Performance Characteristics

| Operation           | Complexity      | Notes                         |
| ------------------- | --------------- | ----------------------------- |
| Duplicate detection | O(1)            | Union intersection check      |
| Cycle detection     | O(depth × deps) | DFS with MaxDepth=30          |
| Captive detection   | O(deps)         | Single pass over requirements |
| Type checking       | Varies          | Complex graphs may slow IDE   |

For extremely large graphs (100+ adapters), consider:

1. Splitting into smaller subgraphs
2. Using `buildFragment()` for composition
3. Verifying cycle detection at runtime if needed

## Async Initialization Order

### Automatic Topological Sort

Async adapter initialization order is automatically determined using topological sort based on the dependency graph. This eliminates the need for manual priority configuration while ensuring correct initialization order.

```typescript
const [ConfigPort, ConfigAdapter] = defineAsyncService("Config", {
  factory: async () => loadConfig(),
  // No dependencies - initializes first
});

const [DatabasePort, DatabaseAdapter] = defineAsyncService("Database", {
  requires: [ConfigPort],
  factory: async ({ Config }) => connectToDb(Config.dbUrl),
  // Depends on Config - initializes after Config
});

const [CachePort, CacheAdapter] = defineAsyncService("Cache", {
  requires: [ConfigPort],
  factory: async ({ Config }) => connectToRedis(Config.redisUrl),
  // Also depends on Config - initializes in parallel with Database
});
```

### How It Works

The runtime uses Kahn's algorithm to compute initialization levels:

1. **Level 0**: Adapters with no async dependencies (e.g., Config)
2. **Level 1**: Adapters whose async dependencies are all at lower levels (e.g., Database, Cache)
3. **Level 2+**: And so on...

Within each level, adapters are initialized **in parallel** using `Promise.all()` for maximum performance.

```typescript
// In @hex-di/runtime - async-initializer.ts
async function executeInitialization(resolveAsync) {
  for (const level of this.initLevels) {
    // All adapters in this level can be initialized in parallel
    const levelPromises = level.map(async adapter => {
      await resolveAsync(adapter.provides);
    });
    await Promise.all(levelPromises);
  }
}
```

### Benefits

| Approach                | Manual Priority | Automatic Topological |
| ----------------------- | --------------- | --------------------- |
| Configuration required  | Yes             | No                    |
| Correct by construction | No              | Yes                   |
| Parallel initialization | Limited         | Optimal               |
| Configuration errors    | Possible        | Impossible            |

### Implementation Status

| Feature                   | Status                | Location                       |
| ------------------------- | --------------------- | ------------------------------ |
| Topological sort          | ✅ Implemented        | `runtime/async-initializer.ts` |
| Parallel initialization   | ✅ Implemented        | `runtime/async-initializer.ts` |
| Dependency-based ordering | ✅ Implemented        | Automatically from `requires`  |
| Runtime ordering          | ⏳ In @hex-di/runtime | `container.ts`                 |
| Compile-time ordering     | ❌ Not implemented    | Future work                    |

## References

- [Effect-TS Layer composition](https://effect.website/docs/requirements-management/layers)
- [TypeScript Type-Level Programming](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Phantom Types in TypeScript](https://kubyshkin.name/posts/phantom-types-typescript/)
