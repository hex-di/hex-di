# @hex-di/graph Design Document

> **Compile-Time Dependency Graph Validation for TypeScript**

This document explains the architecture, patterns, and design decisions in the `@hex-di/graph` package. It serves as a guide for contributors and AI agents working with the codebase.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Type-State Pattern](#type-state-pattern)
3. [Validation Pipeline](#validation-pipeline)
4. [Type-Level Data Structures](#type-level-data-structures)
5. [Module Architecture](#module-architecture)
6. [Advanced TypeScript Patterns](#advanced-typescript-patterns)
7. [Key Design Decisions](#key-design-decisions)
8. [Error Handling Strategy](#error-handling-strategy)

---

## Executive Summary

The `@hex-di/graph` package implements **compile-time dependency graph validation** using TypeScript's type system. It catches common DI mistakes before runtime:

| Validation             | What It Catches                    | When            |
| ---------------------- | ---------------------------------- | --------------- |
| Duplicate Detection    | Same port provided twice           | At `.provide()` |
| Circular Dependencies  | A → B → C → A cycles               | At `.provide()` |
| Captive Dependencies   | Singleton depending on Scoped      | At `.provide()` |
| Missing Dependencies   | Required ports not provided        | At `.build()`   |
| Lifetime Inconsistency | Same port with different lifetimes | At `.merge()`   |

**Key Insight**: All validation happens at the type level with **zero runtime cost**. The actual runtime is just array manipulation.

---

## Type-State Pattern

The core of GraphBuilder is a **Type-State Machine** - a pattern where an object's type changes with each method call, encoding state in phantom type parameters.

### Visual Overview

```
GraphBuilder<never, never>              ← Empty: provides nothing, requires nothing
       │
       │ .provide(LoggerAdapter)
       ▼
GraphBuilder<LoggerPort, never>         ← Provides Logger, no unsatisfied deps
       │
       │ .provide(UserServiceAdapter)   ← UserService requires Logger + Database
       ▼
GraphBuilder<LoggerPort | UserPort,     ← Provides Logger and User
             DatabasePort>              ← Still requires Database
       │
       │ .provide(DatabaseAdapter)
       ▼
GraphBuilder<LoggerPort | UserPort |    ← All ports provided
             DatabasePort, never>       ← No unsatisfied deps (never)
       │
       │ .build()
       ▼
Graph<LoggerPort | UserPort |           ← Immutable, validated graph
      DatabasePort>
```

### Phantom Type Parameters

The `GraphBuilder` class has 8 type parameters that exist **only at compile time**:

```typescript
class GraphBuilder<
  TProvides,      // Union of provided ports (LoggerPort | DatabasePort)
  TRequires,      // Union of required ports (what's still needed)
  TAsyncPorts,    // Union of ports with async factories
  TDepGraph,      // Type-level adjacency map for cycle detection
  TLifetimeMap,   // Type-level port→lifetime map for captive detection
  TOverrides,     // Union of ports marked as overrides
  TParentProvides,// Ports from parent graph (for forParent validation)
  TMaxDepth,      // Maximum cycle detection depth (default: 30)
>
```

**Runtime vs Compile-Time**:

```typescript
// Type-level state (rich, complex):
GraphBuilder<
  LoggerPort | DatabasePort,           // TProvides
  CachePort,                           // TRequires
  never,                               // TAsyncPorts
  { Logger: never, Database: "Logger" }, // TDepGraph
  { Logger: 1, Database: 2 },          // TLifetimeMap
  never,                               // TOverrides
  unknown,                             // TParentProvides
  30                                   // TMaxDepth
>

// Runtime state (simple):
{ adapters: [LoggerAdapter, DatabaseAdapter], overridePortNames: Set() }
```

### Simplifying IDE Tooltips

The 8 type parameters can overwhelm IDE tooltips. Several utilities help:

**1. Phantom Property Shortcuts**:

```typescript
const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);

// Access simplified type info:
type Provided = typeof builder.$provides; // LoggerPort | UserServicePort
type Missing = typeof builder.$unsatisfied; // DatabasePort
```

**2. PrettyBuilder Type**:

```typescript
import { PrettyBuilder } from "@hex-di/graph";

type View = PrettyBuilder<typeof builder>;
// {
//   provides: LoggerPort | UserServicePort;
//   unsatisfied: DatabasePort;
//   asyncPorts: never;
//   overrides: never;
// }
```

**3. SimplifiedBuilder for Annotations**:

```typescript
import { SimplifiedBuilder } from "@hex-di/graph";

// Use for function parameters or variable annotations:
function processBuilder<T extends SimplifiedBuilder>(builder: T): void {
  const graph = builder.build();
  // ...
}
```

**4. BuilderInternals Grouping**:

The internal parameters are logically grouped in `BuilderInternals`:

```typescript
interface BuilderInternals<TDepGraph, TLifetimeMap, TParentProvides, TMaxDepth> {
  depGraph: TDepGraph; // Cycle detection data
  lifetimeMap: TLifetimeMap; // Captive detection data
  parentProvides: TParentProvides; // Parent validation
  maxDepth: TMaxDepth; // Recursion limit
}
```

This grouping provides extraction utilities (`GetDepGraph`, `GetLifetimeMap`) and update utilities (`WithDepGraph`, `WithLifetimeMap`) for advanced type-level programming.

### Immutability

Each `.provide()` call returns a **new** `GraphBuilder` instance:

```typescript
provide<A extends AdapterAny>(adapter: A): ProvideResult<...> {
  // Creates NEW instance with updated type parameters
  return new GraphBuilder([...this.adapters, adapter], this.overridePortNames);
}
```

This enables "branching" - creating specialized graphs from a common base without mutation.

---

## Validation Pipeline

When `.provide(adapter)` is called, validations run in this order:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        .provide(adapter)                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DUPLICATE DETECTION                                              │
│    HasOverlap<NewPort, ExistingPorts> → DuplicateErrorMessage      │
│    Complexity: O(1) - simple Extract<> check                        │
└─────────────────────────────────────────────────────────────────────┘
                                 │ pass
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. CIRCULAR DEPENDENCY DETECTION                                    │
│    WouldCreateCycle<DepGraph, Provides, Requires>                  │
│    → CircularErrorMessage with cycle path                          │
│    Complexity: O(depth) - type-level DFS                           │
└─────────────────────────────────────────────────────────────────────┘
                                 │ pass
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. CAPTIVE DEPENDENCY DETECTION                                     │
│    FindAnyCaptiveDependency<LifetimeMap, Level, Requires>          │
│    → CaptiveErrorMessage                                            │
│    Complexity: O(requires) - pattern matching per requirement       │
└─────────────────────────────────────────────────────────────────────┘
                                 │ pass
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. SUCCESS                                                          │
│    Return new GraphBuilder<UpdatedTypes...>                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Error vs Short-Circuit

The package offers two modes:

| Method          | Behavior                   | Use Case             |
| --------------- | -------------------------- | -------------------- |
| `provide()`     | Reports ALL errors at once | Default, better DX   |
| `provideFast()` | Stops at first error       | Faster type checking |

```typescript
// Multi-error output:
"Multiple validation errors:
  1. ERROR: Duplicate adapter for 'Logger'...
  2. ERROR: Circular dependency: A -> B -> A..."
```

---

## Type-Level Data Structures

### Dependency Graph (TDepGraph)

A mapped type representing the adjacency list:

```typescript
// Structure: { [PortName]: RequiredPortNames }
type ExampleDepGraph = {
  Logger: never; // Logger has no dependencies
  Database: "Logger"; // Database depends on Logger
  UserService: "Logger" | "Database"; // UserService depends on both
};

// Adding an edge:
type AddEdge<TMap, TProvides, TRequires> = TMap & {
  [K in TProvides]: TRequires;
};
```

### Lifetime Map (TLifetimeMap)

A mapped type for lifetime levels:

```typescript
// Structure: { [PortName]: 1 | 2 | 3 }
// Where: 1=Singleton (longest), 2=Scoped, 3=Transient (shortest)
type ExampleLifetimeMap = {
  Logger: 1; // Singleton
  Database: 2; // Scoped
  Cache: 3; // Transient
};
```

### Visited Set (Union Type)

For DFS traversal, the visited set is a union that grows:

```typescript
// Start: never (empty set)
// After visiting "A": "A"
// After visiting "A" and "B": "A" | "B"

// Membership check uses extends:
type IsVisited = "A" extends "A" | "B" ? true : false; // true
```

### Depth Counter (Tuple Length)

TypeScript can't do arithmetic, so we use tuple length (Peano-style):

```typescript
type Depth = readonly unknown[];

type D0 = []; // length = 0
type D1 = [...D0, unknown]; // length = 1
type D2 = [...D1, unknown]; // length = 2

type DepthExceeded<D extends Depth, Max extends number> = D["length"] extends Max ? true : false;
```

---

## Module Architecture

```
src/
├── adapter/                    # Adapter type definitions and factories
│   ├── types.ts               # Adapter, AdapterAny, Lifetime types
│   ├── factory.ts             # createAdapter() function
│   ├── inference.ts           # Type inference utilities
│   ├── lazy.ts                # Lazy port support
│   └── index.ts               # Public exports
│
├── common/                     # Shared utility types
│   └── index.ts               # IsNever, Prettify, InferenceError
│
├── builder-types/              # Type-level validation (decomposed)
│   ├── provide-types.ts       # ProvideResult, validation chain
│   ├── merge-types.ts         # MergeResult
│   ├── override-types.ts      # OverrideResult
│   ├── inspection-types.ts    # PrettyBuilder, SimplifiedView
│   ├── empty-state.ts         # Initial empty state types
│   └── index.ts               # Re-exports
│
├── graph/                      # GraphBuilder and Graph types
│   ├── builder.ts             # Main GraphBuilder class
│   ├── builder-inspection.ts  # inspect(), toDotGraph(), toMermaidGraph()
│   ├── types.ts               # Graph type definition
│   ├── inference.ts           # Graph type inference
│   └── index.ts               # Public exports
│
├── validation/                 # Pure validation algorithms
│   ├── cycle-detection.ts     # Type-level DFS for cycles
│   ├── captive-dependency.ts  # Lifetime hierarchy checks
│   ├── errors.ts              # Error types and messages
│   ├── logic.ts               # UnsatisfiedDependencies, HasOverlap
│   ├── batch-duplicates.ts    # Intra-batch duplicate detection
│   ├── lazy-transforms.ts     # Lazy port transformations
│   └── index.ts               # Public exports
│
├── guards.ts                   # Runtime type guards
├── index.ts                    # Main public API
├── internal.ts                 # Advanced types for library authors
└── convenience.ts              # Simplified API
```

### Module Dependency Flow

```
                    ┌─────────────┐
                    │ @hex-di/ports│  (External: Port type definition)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐       ┌──────────┐      ┌────────────┐
   │ common/ │       │ adapter/ │      │ validation/│
   └────┬────┘       └────┬─────┘      └─────┬──────┘
        │                 │                  │
        └────────────┬────┴──────────────────┘
                     │
                     ▼
               ┌──────────┐
               │  graph/  │
               └────┬─────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌───────────┐
   │ index.ts│ │internal │ │convenience│
   └─────────┘ └─────────┘ └───────────┘
```

---

## Advanced TypeScript Patterns

### 1. Distributive Conditional Types

Used to iterate over unions:

```typescript
// When TFrom is "A" | "B", this distributes:
type Check<TFrom> = TFrom extends string ? DoSomething<TFrom> : never;

// Becomes:
// Check<"A"> | Check<"B">
```

### 2. Type-Level DFS (Cycle Detection)

```typescript
type IsReachable<TMap, TFrom, TTarget, TVisited, TDepth, TMaxDepth> =
  // 1. Check depth limit
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? false
    : // 2. Handle empty case
      IsNever<TFrom> extends true
      ? false
      : // 3. Distribute over union members
        TFrom extends string
        ? // 3a. Skip if visited
          TFrom extends TVisited
          ? false
          : // 3b. Found target
            TFrom extends TTarget
            ? true
            : // 3c. Recurse through dependencies
              IsReachable<
                TMap,
                GetDeps<TMap, TFrom>,
                TTarget,
                TVisited | TFrom,
                Inc<TDepth>,
                TMaxDepth
              >
        : false;
```

### 3. Variance-Based Universal Constraints (AdapterAny)

Instead of using `any`, we use variance rules:

```typescript
interface AdapterAny {
  readonly factory: (...args: never[]) => unknown;
  //                       ↑ contravariant    ↑ covariant
}

// Why this works:
// - `never[]` is the bottom type for arrays (any tuple satisfies it)
// - `unknown` is the top type (any return type satisfies it)
// - Result: ANY function signature matches AdapterAny.factory
```

### 4. Template Literal Error Messages

Errors appear directly in IDE tooltips:

```typescript
type DuplicateErrorMessage<Port> = `ERROR: Duplicate adapter for '${InferPortName<Port>}'.`;

// IDE shows: "ERROR: Duplicate adapter for 'Logger'."
// Instead of: "Type X is not assignable to type { __errorBrand: ... }"
```

### 5. Phantom Type Properties

Properties that exist only at the type level:

```typescript
class GraphBuilder<TProvides> {
  // `declare` means no runtime footprint
  declare readonly __provides: TProvides;

  // Actual runtime storage is minimal
  readonly adapters: readonly AdapterAny[];
}
```

---

## Key Design Decisions

### 1. Forward Reference Support

Adapters can be registered in any order:

```typescript
// Both orderings work:
GraphBuilder.create()
  .provide(UserService) // Requires Logger (not yet provided)
  .provide(Logger) // Satisfies requirement
  .build(); // Validates completeness
```

**How**: Requirements are tracked in `TRequires` and validated at `.build()`, not `.provide()`.

### 2. MaxDepth Configuration

Cycle detection depth is configurable (default: 30):

```typescript
GraphBuilder.withMaxDepth<50>().create();
```

**Why 30**: Provides 2x safety margin against TypeScript's ~50-100 recursion limit while covering virtually all real-world graphs.

### 3. Multi-Error Reporting by Default

`provide()` reports all errors at once:

```typescript
// Shows all issues, not just the first
type Errors = CollectAdapterErrors<...>;
// ["Duplicate 'Logger'", "Circular: A -> B -> A"]
```

**Why**: Better developer experience - see everything wrong at once instead of fix-and-retry cycles.

### 4. Immutable Everything

- `GraphBuilder` is frozen after construction
- Each method returns a new instance
- `adapters` array is frozen with `Object.freeze()`

**Why**: Thread-safe, predictable, enables branching.

### 5. No `any`, No Type Casts

The entire codebase avoids `any` and type assertions. The only exception is a single `@ts-expect-error` in `@hex-di/ports` for phantom type creation (unavoidable for branded types).

**Why**: Maintains full type safety and catches real bugs.

---

## Error Handling Strategy

### Compile-Time Errors

Template literal strings that appear in IDE tooltips:

```typescript
type Error = "ERROR: Circular dependency: A -> B -> A. Fix: Break cycle...";
```

### Runtime Inspection

The `inspect()` method provides debugging information:

```typescript
const info = builder.inspect();
// {
//   adapterCount: 5,
//   provides: ["Logger", "Database", "UserService"],
//   unsatisfiedRequirements: ["Cache"],
//   maxChainDepth: 12,
//   suggestions: [{ type: "missing_adapter", portName: "Cache", ... }],
//   orphanPorts: [],
//   typeComplexityScore: 45,
//   performanceRecommendation: "safe"
// }
```

### Structured Error Codes

For programmatic error handling:

```typescript
import { parseGraphError, GraphErrorCode } from "@hex-di/graph";

const parsed = parseGraphError(errorMessage);
if (parsed?.code === GraphErrorCode.CIRCULAR_DEPENDENCY) {
  highlightCycle(parsed.details.cyclePath);
}
```

---

## Quick Reference

### Creating a Graph

```typescript
import { GraphBuilder, createAdapter, createPort } from "@hex-di/graph";

const LoggerPort = createPort<Logger>("Logger");
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => new ConsoleLogger(),
});

const graph = GraphBuilder.create().provide(LoggerAdapter).build();
```

### Type-Level Debugging

```typescript
// Access phantom properties for debugging
type Provided = typeof builder.$provides;
type Missing = typeof builder.$unsatisfied;

// Or use the pretty view
type View = (typeof builder)[typeof __prettyViewSymbol];
```

### Visualization

```typescript
const dot = builder.inspect().toDotGraph();
const mermaid = builder.inspect().toMermaidGraph();
```

---

## Further Reading

- `src/validation/cycle-detection.ts` - Detailed DFS algorithm documentation
- `src/validation/captive-dependency.ts` - Lifetime hierarchy explanation
- `src/graph/builder.ts` - Type-state pattern implementation
- `src/validation/errors.ts` - Error message design philosophy
