---
title: Type-Level Programming Patterns
description: Deep dive into HexDI's compile-time validation using advanced TypeScript patterns
sidebar_position: 1
---

# Type-Level Programming Patterns in HexDI

HexDI achieves compile-time dependency validation through advanced TypeScript type-level programming. This guide explains the patterns used, helping you understand the internals and apply these techniques in your own code.

## Prerequisites

This guide assumes familiarity with:

- TypeScript generics and type parameters
- Conditional types (`T extends U ? X : Y`)
- Mapped types and utility types (`Exclude`, `Extract`)
- The `never` type and union types

## Pattern 1: Union Subtraction for Dependency Tracking

**What it does:** Tracks which dependencies are still needed as adapters are added.

**Why HexDI uses it:** To detect missing dependencies at compile time.

### How it works

TypeScript's `Exclude<T, U>` removes members of T that exist in U:

```typescript
type UnsatisfiedDependencies<TProvides, TRequires> = Exclude<TRequires, TProvides>;

// Example:
type Provided = LoggerPort | DatabasePort;
type Required = LoggerPort | DatabasePort | CachePort;
type Missing = Exclude<Required, Provided>;
// Result: CachePort
```

As each adapter is added, `TProvides` grows. On `.build()`, we check if `TRequires ⊆ TProvides`:

```typescript
type IsSatisfied<TProvides, TRequires> = [Exclude<TRequires, TProvides>] extends [never]
  ? true
  : false;
```

### Try it yourself

```typescript
// Experiment in TypeScript playground:
type A = "Logger" | "Database";
type B = "Logger" | "Database" | "Cache";
type Missing = Exclude<B, A>; // Hover to see: "Cache"
```

**Where to find it:** `packages/graph/src/validation/logic.ts`

---

## Pattern 2: Distributive Conditional Types

**What it does:** Enables "for each" iteration over union type members.

**Why HexDI uses it:** To check each dependency port for cycles or captive issues.

### How it works

When a conditional type has a naked type parameter, it distributes over unions:

```typescript
type ToArray<T> = T extends unknown ? T[] : never;

type Result = ToArray<"A" | "B">;
// Distributes to: ("A" extends unknown ? "A"[] : never) | ("B" extends unknown ? "B"[] : never)
// Result: "A"[] | "B"[]
```

HexDI uses this for DFS traversal:

```typescript
type IsReachable<TMap, TFrom, TTarget> = TFrom extends string // Distributes over each port in TFrom
  ? TFrom extends TTarget
    ? true // Found it!
    : IsReachable<TMap, GetDeps<TMap, TFrom>, TTarget>
  : false;

// When TFrom = "A" | "B", this evaluates BOTH branches
// Result is true if ANY path reaches the target
```

### Try it yourself

```typescript
// Distribution in action:
type Check<T> = T extends "A" ? "matched" : "no";
type R1 = Check<"A" | "B">; // "matched" | "no"
type R2 = Check<"C">; // "no"
```

**Where to find it:** `packages/graph/src/validation/cycle-detection.ts`

---

## Pattern 3: The `[T] extends [never]` Idiom

**What it does:** Correctly checks if a type is exactly `never`.

**Why HexDI uses it:** To detect empty unions (e.g., "no missing dependencies").

### How it works

The naive approach fails:

```typescript
// WRONG: Always returns never due to distribution
type Bad<T> = T extends never ? "empty" : "not empty";
type R1 = Bad<never>; // never (not "empty"!)
```

Wrapping in a tuple prevents distribution:

```typescript
// CORRECT: Compares the whole type structurally
type Good<T> = [T] extends [never] ? "empty" : "not empty";
type R2 = Good<never>; // "empty"
type R3 = Good<"A" | "B">; // "not empty"
```

### Why this happens

`never` is the "bottom type" - it's assignable to everything, but nothing is assignable to it. When you write `T extends never`, TypeScript distributes over T, but since nothing can extend `never`, you get `never` back.

The tuple wrapper `[T]` makes it a structural comparison: does the tuple `[never]` extend the tuple `[never]`? Yes!

### Try it yourself

```typescript
type IsNever<T> = [T] extends [never] ? true : false;

type T1 = IsNever<never>; // true
type T2 = IsNever<string>; // false
type T3 = IsNever<"A" | "B">; // false
```

**Where to find it:** Used throughout validation modules

---

## Pattern 4: Depth-Limited Recursion

**What it does:** Prevents TypeScript's "Type instantiation is excessively deep" error.

**Why HexDI uses it:** DFS traversal could theoretically recurse indefinitely.

### How it works

TypeScript limits recursion to ~50-100 levels. We track depth using tuple length:

```typescript
type Depth = readonly unknown[]; // Tuple as counter

type IncrementDepth<D extends Depth> = [...D, unknown];
// [] → [unknown] → [unknown, unknown] → ...

type DepthExceeded<D extends Depth> = D["length"] extends 30 ? true : false;
```

In the algorithm:

```typescript
type IsReachable<TMap, TFrom, TTarget, TVisited, TDepth extends Depth = []> =
  DepthExceeded<TDepth> extends true
    ? false  // Bail out, assume no cycle (runtime catches it)
    : /* ... recursive call with IncrementDepth<TDepth> */;
```

### Why 30?

- TypeScript's limit varies by type complexity (~50-100)
- 30 leaves headroom for complex types
- Most real graphs are <15 levels deep
- If exceeded, runtime validation catches any issues

### Try it yourself

```typescript
type Counter<N extends unknown[] = []> = N["length"] extends 5
  ? N["length"]
  : Counter<[...N, unknown]>;

type Five = Counter; // 5
```

**Where to find it:** `packages/graph/src/validation/cycle-detection.ts`

---

## Pattern 5: Phantom Types for State Tracking

**What it does:** Tracks compile-time state without runtime cost.

**Why HexDI uses it:** GraphBuilder's type changes with each `.provide()` call.

### How it works

Phantom types are type parameters that don't appear in the runtime value:

```typescript
class GraphBuilder<
  TProvides = never,       // Exists only at type level
  TRequires = never,       // No runtime representation
  TDepGraph = {},          // Zero memory cost
> {
  // 'declare' means type-only property (no runtime code)
  declare readonly __provides: TProvides;

  // Actual runtime data is minimal
  readonly adapters: Adapter[];

  provide<A>(adapter: A): GraphBuilder<
    TProvides | InferProvides<A>,  // Type grows
    TRequires | InferRequires<A>,  // Type grows
    AddEdge<TDepGraph, ...>        // Type grows
  > {
    // Runtime: just add to array
    return new GraphBuilder([...this.adapters, adapter]);
  }
}
```

### The magic

When you hover over a GraphBuilder in your IDE, you see the full type-level state:

```typescript
const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

// Hover shows:
// GraphBuilder<
//   LoggerPort | DatabasePort,
//   LoggerPort,
//   { Logger: never, Database: "Logger" },
//   { Logger: 1, Database: 2 }
// >
```

**Where to find it:** `packages/graph/src/graph/builder.ts`

---

## Pattern 6: Template Literal Error Messages

**What it does:** Produces human-readable error messages at compile time.

**Why HexDI uses it:** Makes errors immediately understandable in IDE tooltips.

### How it works

Template literal types allow string concatenation at the type level:

```typescript
type CircularErrorMessage<Path extends string> = `ERROR: Circular dependency: ${Path}`;

type E1 = CircularErrorMessage<"A -> B -> A">;
// "ERROR: Circular dependency: A -> B -> A"
```

When a method returns an error type, the IDE shows:

```
Type 'GraphBuilder<...>' is not assignable to type
'ERROR: Circular dependency: UserService -> Database -> Cache -> UserService'
```

### Building paths

HexDI builds cycle paths by recursively concatenating:

```typescript
type BuildPath<Current, Accumulated extends string = ""> = Accumulated extends ""
  ? Current
  : `${Accumulated} -> ${Current}`;

type P1 = BuildPath<"A", "">; // "A"
type P2 = BuildPath<"B", "A">; // "A -> B"
type P3 = BuildPath<"A", "A -> B">; // "A -> B -> A"
```

**Where to find it:** `packages/graph/src/validation/errors.ts`

---

## Pattern 7: Branded/Nominal Types

**What it does:** Creates distinct types even for structurally identical values.

**Why HexDI uses it:** Ports with the same interface must be distinguishable.

### How it works

TypeScript uses structural typing, so these are equivalent:

```typescript
interface Logger {
  log(msg: string): void;
}
interface Auditor {
  log(msg: string): void;
}
// Logger and Auditor are interchangeable!
```

We add a "brand" using a unique symbol:

```typescript
declare const __brand: unique symbol;

type Port<T, TName extends string> = {
  readonly [__brand]: [T, TName]; // Exists only at type level
  readonly __portName: TName; // Exists at runtime
};

const LoggerPort = createPort<"Logger", Logger>("Logger");
const AuditorPort = createPort<"Auditor", Logger>("Auditor");
// Now LoggerPort and AuditorPort are incompatible types!
```

### `unique symbol`

The `unique symbol` type guarantees this symbol cannot be recreated elsewhere. Each declaration creates a truly unique type.

**Where to find it:** `packages/ports/src/index.ts`

---

## Pattern 8: Type-Level Graph Traversal

**What it does:** Implements DFS (Depth-First Search) entirely at the type level.

**Why HexDI uses it:** Detects circular dependencies at compile time.

### The algorithm

```
IsReachable<Graph, From, Target>

1. If depth exceeded → false (bail out)
2. If From is never → false (no nodes to check)
3. For each port in From (via distribution):
   a. If already visited → skip
   b. If equals Target → true (FOUND!)
   c. Recurse with dependencies of this port
4. Result: true if ANY path reaches Target
```

### Implementation

```typescript
type IsReachable<
  TMap, // The graph
  TFrom extends string, // Current node(s)
  TTarget extends string, // Looking for
  TVisited extends string = never, // Visited set (union type)
  TDepth extends Depth = [], // Recursion counter
> =
  DepthExceeded<TDepth> extends true
    ? false
    : [TFrom] extends [never]
      ? false
      : TFrom extends string // Distribute over each port
        ? TFrom extends TVisited
          ? false // Skip visited
          : TFrom extends TTarget
            ? true // Found it!
            : IsReachable<
                TMap,
                GetDeps<TMap, TFrom>, // Get dependencies
                TTarget,
                TVisited | TFrom, // Add to visited (union grows)
                [...TDepth, unknown] // Increment depth
              >
        : false;
```

### Key insights

- **Visited set as union:** `TVisited | TFrom` adds the current node
- **Union for branching:** Distribution evaluates all paths
- **Result is `true | false`:** Simplifies to `true` if any path succeeds

**Where to find it:** `packages/graph/src/validation/cycle-detection.ts`

---

## Putting It Together: How `provide()` Works

When you call `.provide(adapter)`, this happens at the type level:

```
1. DUPLICATE CHECK
   HasOverlap<NewPort, ExistingPorts>
   └→ If true: return "ERROR: Duplicate adapter..."

2. CYCLE CHECK
   WouldCreateCycle<DepGraph, Provides, Requires>
   └→ If true: return "ERROR: Circular dependency: A -> B -> A"

3. CAPTIVE CHECK
   FindAnyCaptiveDependency<LifetimeMap, Level, Requires>
   └→ If found: return "ERROR: Captive dependency..."

4. SUCCESS
   Return GraphBuilder<
     TProvides | NewPort,
     TRequires | NewRequires,
     AddEdge<TDepGraph, ...>,
     AddLifetime<TLifetimeMap, ...>
   >
```

The nested conditional ensures:

- Checks run in order (cheapest first)
- Only one path is taken
- Error message is specific to the first failure

---

## References and Further Reading

- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Effect-TS Layer System](https://effect.website/docs/requirements-management/layers) - Inspiration for union subtraction
- [@hex-di/graph ARCHITECTURE.md](../../packages/graph/ARCHITECTURE.md) - Internal implementation details
