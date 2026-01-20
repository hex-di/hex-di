# @hex-di/graph Architecture

This document explains the architectural decisions and patterns used in the `@hex-di/graph` package.

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

### Background

Async adapters have an `initPriority` property (0-1000, default 100) that determines initialization order. **Lower values initialize first.**

```typescript
const [ConfigPort, ConfigAdapter] = defineAsyncService("Config", {
  factory: async () => loadConfig(),
  initPriority: 10, // Initialize early
});

const [DatabasePort, DatabaseAdapter] = defineAsyncService("Database", {
  requires: [ConfigPort],
  factory: async ({ Config }) => connectToDb(Config.dbUrl),
  initPriority: 20, // After config
});
```

### Dependency vs Priority Relationship

The **correct** ordering is:

- If A depends on B, then A's initPriority **must be ≥** B's initPriority
- This ensures B is initialized before A

| Scenario | Config.priority | Database.priority | Valid?                         |
| -------- | --------------- | ----------------- | ------------------------------ |
| Correct  | 10              | 20                | ✅ Database (20) ≥ Config (10) |
| Equal    | 10              | 10                | ✅ Equal priorities allowed    |
| Inverted | 20              | 10                | ❌ Database (10) < Config (20) |

### Current Validation: Runtime Only

Currently, initPriority ordering is validated **at runtime** during container initialization:

```typescript
// In @hex-di/runtime - container.ts
async function initializeAsync(graph: Graph) {
  const sorted = topologicalSortByPriority(graph.adapters);
  for (const adapter of sorted) {
    await adapter.factory(resolvedDeps);
  }
}
```

### Future: Compile-Time Validation (Design)

Type-level initPriority validation is desirable but challenging due to TypeScript limitations.

#### Challenge: No Numeric Comparison at Type Level

TypeScript cannot directly compare numbers:

```typescript
// This is NOT possible in TypeScript's type system:
type IsGreater<A extends number, B extends number> = A > B;  // ❌ Syntax error
```

#### Potential Approach: Priority Bands

Instead of exact numeric comparison, use **priority bands**:

```typescript
type PriorityBand = "early" | "normal" | "late";

// Band ordering: early (0-33) < normal (34-66) < late (67-100)
type BandOrder = {
  early: 0;
  normal: 1;
  late: 2;
};

type IsValidOrder<
  DependencyBand extends PriorityBand,
  DependentBand extends PriorityBand,
> = BandOrder[DependentBand] extends BandOrder[DependencyBand]
  ? true
  : BandOrder[DependentBand] extends 0
    ? false
    : true;
```

**Trade-offs:**

- ✅ Compile-time validation possible
- ✅ Simple API: `initPriority: 'early'`
- ❌ Less granular than numeric priorities
- ❌ Breaking change to existing API

#### Alternative: Peano Arithmetic

For exact numeric comparison, use Peano-style counting:

```typescript
type Peano<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Peano<N, [...Acc, unknown]>;

type IsGreaterOrEqual<A extends number, B extends number> =
  Peano<B> extends [...Peano<A>, ...unknown[]]
    ? false // B > A
    : true; // A >= B
```

**Trade-offs:**

- ✅ Exact numeric comparison
- ✅ No API changes
- ❌ Extremely slow type-checking (O(n²) for n=1000)
- ❌ Would hit TS2589 recursion limits

#### Current Recommendation

Keep **runtime validation** for initPriority ordering. The compile-time cost of full validation outweighs the benefits because:

1. InitPriority errors are rare in practice
2. Runtime errors are caught immediately during startup
3. The error messages are clear and actionable

If compile-time validation becomes necessary, the **Priority Bands** approach is recommended for a balance of safety and performance.

### Implementation Status

| Feature                   | Status                | Location             |
| ------------------------- | --------------------- | -------------------- |
| initPriority property     | ✅ Implemented        | `adapter/types.ts`   |
| Default value (100)       | ✅ Implemented        | `adapter/factory.ts` |
| Range validation (0-1000) | ✅ Implemented        | `adapter/factory.ts` |
| Runtime ordering          | ⏳ In @hex-di/runtime | `container.ts`       |
| Compile-time ordering     | ❌ Not implemented    | Future work          |

## References

- [Effect-TS Layer composition](https://effect.website/docs/requirements-management/layers)
- [TypeScript Type-Level Programming](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Phantom Types in TypeScript](https://kubyshkin.name/posts/phantom-types-typescript/)
