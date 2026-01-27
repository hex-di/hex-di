# builder-types: Type-Level State Machine

This directory contains the **type-level implementation** of GraphBuilder's compile-time
validation system. The types here form a state machine that runs entirely at compile time,
catching errors before any code executes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TYPE-LEVEL STATE MACHINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TInternals>   │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│   │  TProvides  │    │  TRequires  │    │ TAsyncPorts │    │ TOverrides │  │
│   │  (union)    │    │  (union)    │    │  (union)    │    │  (union)   │  │
│   │  grows →    │    │  grows →    │    │  grows →    │    │  grows →   │  │
│   └─────────────┘    └─────────────┘    └─────────────┘    └────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        TInternals (grouped)                         │  │
│   │  ┌───────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│   │  │DepGraph   │  │LifetimeMap  │  │ParentProvides│  │  MaxDepth   │ │  │
│   │  │{A: ["B"]} │  │{A: 1, B: 2} │  │  unknown     │  │    30       │ │  │
│   │  └───────────┘  └─────────────┘  └──────────────┘  └─────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Organization

| File                      | Purpose                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `empty-state.ts`          | Initial state types (`EmptyDependencyGraph`, `EmptyLifetimeMap`)                 |
| `internals.ts`            | Grouped internal parameters (`BuilderInternals`, extractors)                     |
| `provide-types.ts`        | Barrel export for provide validation types                                       |
| `provide-sync-result.ts`  | Sync validation: `ProvideResult`, `CheckDuplicate`, `CheckCycle`, `CheckCaptive` |
| `provide-multi-error.ts`  | Multi-error: `CollectAdapterErrors`, `ProvideResultAllErrors`                    |
| `provide-async-result.ts` | Async validation: `ProvideAsyncResult` pipeline                                  |
| `provide-many-result.ts`  | Batch validation: `ProvideManyResult`                                            |
| `merge-types.ts`          | Validation for `merge()`, `mergeWith()`                                          |
| `override-types.ts`       | Validation for `override()`                                                      |
| `inspection-types.ts`     | IDE tooltip helpers (`PrettyBuilder`, `SimplifiedView`, `Debug*` variants)       |
| `debug-types.ts`          | Debug helpers for validation tracing                                             |
| `index.ts`                | Public re-exports                                                                |

## State Transitions

### provide() Pipeline

When `.provide(adapter)` is called, the type system executes this pipeline:

```
Input: GraphBuilder<TProvides, TRequires, ..., TInternals> + Adapter

    ┌──────────────────────────────────────────────────────────────┐
    │ Step 1: DUPLICATE CHECK                                      │
    │ HasOverlap<AdapterProvides, TProvides> extends true?         │
    │   → YES: Return DuplicateErrorMessage<PortName>              │
    │   → NO:  Continue to Step 2                                  │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────┐
    │ Step 2: CYCLE CHECK                                          │
    │ WouldCreateCycle<DepGraph, Provides, Requires> extends true? │
    │   → YES: Return CircularErrorMessage<CyclePath>              │
    │   → NO:  Continue to Step 3                                  │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────┐
    │ Step 3: CAPTIVE CHECK                                        │
    │ FindAnyCaptiveDependency<LifetimeMap, Level, Requires>       │
    │   → Found: Return CaptiveErrorMessage<Dependency>            │
    │   → None:  Continue to SUCCESS                               │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────────┐
    │ SUCCESS: Return new GraphBuilder with:                       │
    │   TProvides' = TProvides | AdapterProvides                   │
    │   TRequires' = TRequires | AdapterRequires                   │
    │   DepGraph'  = AddEdge<DepGraph, Provides, Requires>         │
    │   LifetimeMap' = AddLifetime<LifetimeMap, Provides, Level>   │
    └──────────────────────────────────────────────────────────────┘
```

### Error Aggregation (provide vs provideFast)

- **`provideFast()`**: Short-circuits on first error (faster compilation)
- **`provide()`**: Collects ALL errors using `CollectAdapterErrors`

```typescript
// ProvideResultAllErrors collects errors into a tuple, then formats:
type Errors = [DuplicateError, CycleError, CaptiveError]; // or [never, never, never]
type Filtered = FilterNever<Errors>; // Remove successful checks
type Result = Filtered extends [] ? SuccessType : MultiErrorMessage<Filtered>; // "Multiple errors: 1. ... 2. ..."
```

### Provide Types Decomposition

The provide validation types are split into focused modules:

```
provide-types.ts (barrel)
├── provide-sync-result.ts   # Core validation pipeline
│   ├── ProvideResultSuccess
│   ├── CheckDuplicate      # Step 1: O(1)
│   ├── CheckCycleDependency # Step 2: O(depth)
│   ├── CheckCaptiveDependency # Step 3: O(requires)
│   ├── ProvideResult       # Orchestrator
│   └── ProvideUncheckedResult
│
├── provide-multi-error.ts   # All-errors mode
│   ├── CollectAdapterErrors
│   └── ProvideResultAllErrors
│
├── provide-async-result.ts  # Async adapters
│   └── ProvideAsyncResult
│
└── provide-many-result.ts   # Batch operations
    └── ProvideManyResult
```

## Key Type Patterns

### 1. Conditional Type Chains

Validation uses nested conditionals for ordered checks:

```typescript
type ProvideResult<...> =
  HasOverlap<...> extends true
    ? DuplicateError
    : WouldCreateCycle<...> extends true
      ? CycleError
      : FindCaptive<...> extends never
        ? Success
        : CaptiveError;
```

### 2. Template Literal Error Messages

Errors are template literal strings for clear IDE display:

```typescript
type DuplicateErrorMessage<TPort> =
  `ERROR: Duplicate adapter for '${TPort}'. Fix: Remove one .provide() call...`;
```

### 3. Type-Level Data Structures

**Dependency Graph** (adjacency list as mapped type):

```typescript
type DepGraph = {
  Logger: never; // No dependencies
  Database: "Logger"; // Depends on Logger
  UserService: "Logger" | "Database"; // Depends on both
};
```

**Lifetime Map** (port → lifetime level):

```typescript
type LifetimeMap = {
  Logger: 1; // Singleton
  Database: 2; // Scoped
  UserService: 3; // Transient
};
```

### 4. Union Accumulation

Type parameters grow via union:

```typescript
// Start: never
// After provide(A): never | A = A
// After provide(B): A | B
// After provide(C): A | B | C
```

### 5. Grouped Internals

Internal parameters are grouped to reduce tooltip noise:

```typescript
// Instead of 8 type parameters:
GraphBuilder<TProvides, TRequires, TAsync, TDepGraph, TLifetimeMap, TOverrides, TParent, TMaxDepth>;

// We use 5:
GraphBuilder<TProvides, TRequires, TAsync, TOverrides, TInternals>;
// where TInternals = BuilderInternals<TDepGraph, TLifetimeMap, TParent, TMaxDepth>
```

## Cycle Detection Algorithm

The type-level cycle detection uses DFS with depth limiting:

```typescript
type IsReachable<Graph, From, To, Depth> = Depth extends 0
  ? false // Depth limit reached
  : From extends To
    ? true // Found!
    : Graph[From] extends never
      ? false // No edges
      : IsReachable<Graph, Graph[From], To, Decrement<Depth>>; // Recurse

type WouldCreateCycle<Graph, NewFrom, NewTo> = IsReachable<Graph, NewTo, NewFrom, MaxDepth>; // Check reverse path
```

## Adding New Validations

To add a new validation check:

1. Create the check type in `validation/`:

   ```typescript
   export type CheckNewRule<...> = /* true if violation, false otherwise */;
   export type NewRuleError<...> = `ERROR: New rule violated...`;
   ```

2. Add to the pipeline in `provide-types.ts`:

   ```typescript
   type ProvideResult<...> =
     HasOverlap<...> extends true ? DuplicateError :
     WouldCreateCycle<...> extends true ? CycleError :
     CheckNewRule<...> extends true ? NewRuleError :  // NEW
     FindCaptive<...> extends never ? Success : CaptiveError;
   ```

3. For multi-error support, add to `CollectAdapterErrors`:
   ```typescript
   type CollectAdapterErrors<...> = [
     DuplicateCheck,
     CycleCheck,
     NewRuleCheck,  // NEW
     CaptiveCheck,
   ];
   ```

## Performance Considerations

Type-level computation has limits:

- **Depth limit**: DFS is limited to `MaxDepth` (default 30, max 100)
- **Union size**: Very large unions slow down type checking
- **Recursion**: Deep conditionals can hit TypeScript's recursion limit

Use `GraphBuilder.withMaxDepth<N>()` for deep graphs, or split into subgraphs.
