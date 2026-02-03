# @hex-di/graph Architecture

This document explains the internal architecture of the `@hex-di/graph` package, which provides compile-time dependency validation for HexDI.

## Overview

The graph package is responsible for:

1. Defining adapter types and factories
2. Building dependency graphs with the fluent `GraphBuilder` API
3. **Compile-time validation** of duplicates, circular dependencies, and captive dependencies

All validation happens at the type level - there is zero runtime cost for these checks.

## Module Structure

```
packages/graph/src/
├── adapter/
│   ├── factory.ts          # createAdapter (unified API)
│   ├── inference.ts        # InferAdapterProvides, InferAdapterRequires
│   └── types.ts            # Adapter, Lifetime, FactoryKind
│
├── graph/
│   ├── builder.ts          # GraphBuilder class with ProvideResult
│   ├── inference.ts        # InferGraphProvides, InferGraphAsyncPorts
│   └── types.ts            # Graph type definition
│
├── validation/
│   ├── cycle-detection.ts  # IsReachable, WouldCreateCycle (DFS)
│   ├── captive-dependency.ts # LifetimeLevel, IsCaptiveDependency
│   ├── logic.ts            # UnsatisfiedDependencies, HasOverlap
│   └── errors.ts           # Template literal error types
│
└── index.ts                # Public API exports
```

## Type-Level Validation System

### The GraphBuilder Type-State Machine

GraphBuilder uses **phantom type parameters** to track state at compile time:

```typescript
class GraphBuilder<
  TProvides,       // Union of provided ports: LoggerPort | DatabasePort
  TRequires,       // Union of required ports: CachePort
  TAsyncPorts,     // Union of async ports: never
  TDepGraph,       // Edge map: { Logger: never, Database: "Logger" }
  TLifetimeMap     // Lifetime map: { Logger: 1, Database: 2 }
>
```

Each `.provide()` call returns a NEW GraphBuilder with updated type parameters:

```
GraphBuilder.create()
  │
  │  Type: GraphBuilder<never, never, never, {}, {}>
  ▼
.provide(LoggerAdapter)
  │
  │  Type: GraphBuilder<LoggerPort, never, never, { Logger: never }, { Logger: 1 }>
  ▼
.provide(DatabaseAdapter)
  │
  │  Type: GraphBuilder<LoggerPort|DatabasePort, LoggerPort, never,
  │                      { Logger: never, Database: "Logger" },
  │                      { Logger: 1, Database: 2 }>
  ▼
.build()
  │
  │  Check: Is TRequires ⊆ TProvides?
  │  LoggerPort ⊆ LoggerPort|DatabasePort ✓
  ▼
  Graph<LoggerPort|DatabasePort, never>
```

### Dependency Map (TDepGraph)

The dependency map is a mapped type representing the graph's adjacency list:

```typescript
type TDepGraph = {
  Logger: never; // Logger has no dependencies
  Database: "Logger"; // Database depends on Logger
  UserService: "Logger" | "Database"; // UserService depends on both
};
```

**Key operations:**

- `AddEdge<TMap, "Port", "Deps">` - Adds a new edge
- `GetDirectDeps<TMap, "Port">` - Gets immediate dependencies
- `IsReachable<TMap, "From", "To">` - DFS traversal (see below)

### Lifetime Map (TLifetimeMap)

The lifetime map tracks each port's lifetime as a numeric level:

```typescript
type TLifetimeMap = {
  Logger: 1; // Singleton (longest-lived)
  Database: 2; // Scoped
  Request: 3; // Transient (shortest-lived)
};
```

**Hierarchy:** Lower number = longer lifetime.

| Lifetime  | Level | Can depend on     |
| --------- | ----- | ----------------- |
| Singleton | 1     | Singleton only    |
| Scoped    | 2     | Singleton, Scoped |
| Transient | 3     | All lifetimes     |

## Validation Algorithms

### 1. Duplicate Provider Detection

**Check:** Does the new port already exist in `TProvides`?

```typescript
type HasOverlap<A, B> = [Extract<A, B>] extends [never] ? false : true;

// Usage in ProvideResult:
HasOverlap<InferAdapterProvides<A>, TProvides> extends true
  ? DuplicateErrorMessage<...>
  : /* continue */
```

**Complexity:** O(1) type-level - just an `Extract` operation.

### 2. Circular Dependency Detection

**Check:** Is the new port reachable from its own requirements?

```
Adding C with requires=[A]
Existing graph: A → B → C

Question: Can we reach C starting from A?
          A → B → C  ✓ CYCLE DETECTED!
```

**Algorithm:** Type-Level Depth-First Search

```
IsReachable<TMap, TFrom, TTarget, TVisited, TDepth>
  │
  ├─ DepthExceeded? → false (bail out)
  │
  ├─ TFrom is never? → false (no nodes)
  │
  └─ For each port in TFrom (distributive):
       │
       ├─ Already visited? → skip
       │
       ├─ Equals TTarget? → true (FOUND!)
       │
       └─ Recurse with dependencies
          TVisited = TVisited | TFrom
          TDepth = [...TDepth, unknown]
```

**Key techniques:**

- **Distributive conditionals** for iteration: `TFrom extends string ? ... : ...`
- **Tuple length** for depth tracking: `TDepth["length"] extends MaxDepth`
- **Union types** as visited set: `TFrom extends TVisited`

**Depth Limit:** 30 levels (TypeScript allows ~50-100 recursion levels)

### 3. Captive Dependency Detection

**Check:** Does any dependency have a shorter lifetime than the dependent?

```
Singleton A depends on Scoped B
Level 1     depends on Level 2
1 < 2 → A would "capture" B → ERROR
```

**Algorithm:**

```typescript
type IsCaptiveDependency<DependentLevel, DependencyLevel> = IsGreaterThan<
  DependencyLevel,
  DependentLevel
>;

// IsGreaterThan uses pattern matching (no arithmetic in TS type system):
type IsGreaterThan<A, B> = A extends 1
  ? false // 1 is never greater
  : A extends 2
    ? B extends 1
      ? true
      : false // 2 > 1
    : A extends 3
      ? B extends 1 | 2
        ? true
        : false // 3 > 1, 2
      : false;
```

## Error Type System

### Template Literal Error Messages

Instead of complex branded types, we use template literal strings:

```typescript
type CircularErrorMessage<Path extends string> = `ERROR: Circular dependency: ${Path}`;

// Result: "ERROR: Circular dependency: UserService -> Database -> Cache -> UserService"
```

**Benefits:**

- Appear directly in IDE tooltips
- Immediately readable without expanding types
- Include relevant context (port names, cycle paths)

### Error Flow in ProvideResult

```
┌─────────────────────────────────────────┐
│ ProvideResult<..., Adapter>             │
├─────────────────────────────────────────┤
│                                         │
│ if (HasOverlap<new, existing>)          │
│   return "ERROR: Duplicate adapter..."  │
│                                         │
│ if (WouldCreateCycle<graph, p, r>)      │
│   return "ERROR: Circular dependency.." │
│                                         │
│ if (FindAnyCaptiveDependency<...>)      │
│   return "ERROR: Captive dependency..." │
│                                         │
│ return GraphBuilder<updated types>      │
│                                         │
└─────────────────────────────────────────┘
```

## GraphBuilder State Machine

Visual representation of type evolution:

```
                    GraphBuilder<never, never, ...>
                              │
                              │ .provide(LoggerAdapter)
                              ▼
           ┌──────────────────────────────────────┐
           │ TProvides: LoggerPort                 │
           │ TRequires: never                      │
           │ TDepGraph: { Logger: never }          │
           │ TLifetimeMap: { Logger: 1 }           │
           └──────────────────────────────────────┘
                              │
                              │ .provide(DatabaseAdapter)
                              │   requires: [LoggerPort]
                              ▼
           ┌──────────────────────────────────────┐
           │ TProvides: LoggerPort | DatabasePort  │
           │ TRequires: LoggerPort                 │
           │ TDepGraph: { Logger: never,           │
           │              Database: "Logger" }     │
           │ TLifetimeMap: { Logger: 1,            │
           │                 Database: 2 }         │
           └──────────────────────────────────────┘
                              │
                              │ .build()
                              │   Check: TRequires ⊆ TProvides?
                              │   LoggerPort ⊆ (LoggerPort | DatabasePort) ✓
                              ▼
                    Graph<LoggerPort | DatabasePort, never>
```

## Extension Points

### Adding New Validations

To add a new compile-time validation:

1. Create a new type in `validation/`:

   ```typescript
   export type MyValidation<...> = /* validation logic */;
   export type MyErrorMessage<...> = `ERROR: ...`;
   ```

2. Add to `ProvideResult` conditional chain in `builder.ts`:

   ```typescript
   : MyValidation<...> extends true
     ? MyErrorMessage<...>
     : /* next check or success */
   ```

3. Add exports to `validation/index.ts`

### Adding New Adapter Properties

To track additional adapter properties at the type level:

1. Add to `Adapter` type in `adapter/types.ts`
2. Create extraction type in `adapter/inference.ts`
3. Add phantom type parameter to `GraphBuilder`
4. Update `ProvideResult` to accumulate the new property

## Performance Considerations

### Type-Level Complexity

- **Duplicate check:** O(1) - simple `Extract` operation
- **Cycle detection:** O(V + E) per adapter, where V = ports, E = edges
- **Captive detection:** O(R) per adapter, where R = number of requirements

### Depth Limits

TypeScript's type system has recursion limits (~50-100 levels). We use:

- **MaxDepth = 30** for DFS traversal (conservative limit)
- **Tuple length counting** to track depth: `[...D, unknown]`

If depth is exceeded, we return `false` (assume no cycle) and let runtime catch it.

### Compilation Speed

For very large graphs (100+ adapters), type checking may slow down. Mitigations:

- Use `provideMany()` for batch additions (fewer intermediate types)
- Split graphs into smaller modules
- Consider runtime-only validation for development builds

## References

- [Type-Level Programming Guide](../../docs/advanced/type-level-programming.md) - User-facing pattern explanations
- [Effect-TS Layer System](https://effect.website/docs/requirements-management/layers) - Inspiration for union subtraction pattern
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
