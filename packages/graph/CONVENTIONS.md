# Conventions

This document consolidates all naming conventions, coding patterns, and style decisions used throughout the `@hex-di/graph` package. Following these conventions ensures consistency and aids both human and AI comprehension.

## Symbol Naming

### Type-Level Symbols (Phantom Brands)

**Pattern**: `__camelCase` (double underscore prefix)

```typescript
declare const __adapterBrand: unique symbol;
declare const __graphBuilderBrand: unique symbol;
declare const __lazyPortBrand: unique symbol;
```

**Purpose**: These symbols exist **only at the type level**. The `declare const` ensures TypeScript treats them as unique symbol types without generating any JavaScript code.

**When to use**: For nominal/branded typing where you need to distinguish structurally identical types.

### Runtime Symbols

**Pattern**: `SCREAMING_SNAKE_CASE`

```typescript
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");
const GRAPH_BRAND = Symbol("Graph");
```

**Purpose**: These symbols are **actual runtime values** used for `instanceof`-like checks via property existence.

**When to use**: For runtime type discrimination when `instanceof` isn't reliable (e.g., across module boundaries).

### Summary Table

| Convention        | Example               | Exists At       | Purpose         |
| ----------------- | --------------------- | --------------- | --------------- |
| `__camelCase`     | `__adapterBrand`      | Type level only | Nominal typing  |
| `SCREAMING_SNAKE` | `GRAPH_BUILDER_BRAND` | Runtime         | Instance checks |

### Branded Type Properties

Properties within branded types follow a consistent convention:

**`__` prefix: Internal brand markers**

These properties exist solely to make types nominally unique. They are never accessed at runtime.

```typescript
// Brand markers - make types distinguishable
type EmptyDependencyGraph = { readonly __emptyDepGraph?: never };
type ValidProvideResult<T> = T & { readonly __valid?: never };
type DepthExceededError<...> = ... & { readonly __depthExceededBrand?: never };
type ForwardReferenceMarker<T> = { readonly __forwardRefBrand?: never; ... };
```

**Non-prefixed: User-accessible data properties**

These properties carry meaningful information that users or downstream types may access.

```typescript
// Data properties - carry useful information
type ForwardReferenceMarker<T> = {
  readonly __forwardRefBrand?: never; // Brand (internal)
  readonly portName: T; // Data (user-accessible)
};

type DepthExceededError<TPath, TLastPort> = {
  readonly __depthExceededBrand?: never; // Brand (internal)
  readonly path: TPath; // Data (user-accessible)
  readonly lastPort: TLastPort; // Data (user-accessible)
};
```

**Summary Table**

| Pattern            | Example              | Purpose               |
| ------------------ | -------------------- | --------------------- |
| `__fooBar?: never` | `__emptyDepGraph`    | Internal brand marker |
| `camelCase: T`     | `portName`, `reason` | User-accessible data  |

**Why This Matters**

1. **Filtering**: Code can filter brand properties with `Exclude<keyof T, \`\_\_${string}\`>`
2. **Clarity**: Users see meaningful properties, not internal plumbing
3. **Type Safety**: Brand properties use `never` and are optional, preventing accidental access

---

## Type Parameter Naming

### User-Facing Parameters

These appear in IDE tooltips and should be immediately understandable:

| Parameter     | Meaning                    | Example Values               |
| ------------- | -------------------------- | ---------------------------- |
| `TProvides`   | Ports provided by adapters | `LoggerPort \| DatabasePort` |
| `TRequires`   | Ports required by adapters | `ConfigPort`                 |
| `TAsyncPorts` | Ports with async factories | `DatabasePort`               |
| `TOverrides`  | Ports marked as overrides  | `LoggerPort`                 |
| `TLifetime`   | Lifetime scope             | `"singleton" \| "scoped"`    |

### Internal Parameters

These are implementation details that users can ignore:

| Parameter        | Meaning                     | Why "Internal"                       |
| ---------------- | --------------------------- | ------------------------------------ |
| `TInternalState` | Grouped phantom parameters  | Contains depGraph, lifetimeMap, etc. |
| `TDepGraph`      | Type-level dependency map   | Validation implementation detail     |
| `TLifetimeMap`   | Type-level lifetime map     | Validation implementation detail     |
| `TMaxDepth`      | Cycle detection depth limit | Configuration detail                 |

### Inference Parameters

Used in conditional types to capture intermediate results:

| Pattern      | Example           | Purpose                         |
| ------------ | ----------------- | ------------------------------- |
| `infer TFoo` | `infer TProvides` | Extract type from pattern       |
| `_TUnused`   | `_TLifetimeMap`   | Unused but required for pattern |

---

## Type Naming Conventions

### Error Types

**Pattern**: `FooErrorMessage<TParams>`

```typescript
type DuplicateErrorMessage<TPort> = `ERROR: Duplicate adapter for '${...}'...`;
type CircularErrorMessage<TPath> = `ERROR: Circular dependency: ${TPath}...`;
type CaptiveErrorMessage<...> = `ERROR: Captive dependency...`;
```

**Why**: Template literal types produce human-readable strings in IDE tooltips.

### Validation Types

**Pattern**: `CheckFoo<TParams>` or `WouldFoo<TParams>`

```typescript
type CheckDuplicate<...> = ...;      // Validation step in pipeline
type CheckCycleDependency<...> = ...; // Validation step
type WouldCreateCycle<...> = ...;     // Boolean predicate
type WouldAnyBeCaptive<...> = ...;    // Boolean predicate
```

### Result Types

**Pattern**: `FooResult<TParams>` or `FooResultSuccess<TParams>`

```typescript
type ProvideResult<...> = ...;           // May be error or success
type ProvideResultSuccess<...> = ...;    // Always success
type ProvideResultAllErrors<...> = ...;  // Multi-error variant
```

### Inference Utilities

**Pattern**: `InferFoo<T>` or `GetFoo<T>`

```typescript
type InferAdapterProvides<A> = ...;   // Extract from Adapter
type InferPortName<P> = ...;          // Extract from Port
type GetDepGraph<T> = ...;            // Extract from BuilderInternals
type GetLifetimeMap<T> = ...;         // Extract from BuilderInternals
```

### Transformation Utilities

**Pattern**: `WithFoo<T, TNew>` or `FooToBar<T>`

```typescript
type WithDepGraph<T, TNewDepGraph> = ...;     // Update one field
type WithMaxDepth<T, TNewMaxDepth> = ...;     // Update one field
type TupleToUnion<T> = ...;                   // Convert tuple to union
type TransformLazyToOriginal<T> = ...;        // Map lazy ports back
```

---

## File Organization

### Source Structure

```
src/
├── adapter/           # Adapter types and factories
│   ├── types.ts       # Core Adapter type definition
│   ├── factory.ts     # createAdapter, createAsyncAdapter
│   ├── service.ts     # defineService, defineAsyncService
│   ├── inference.ts   # InferAdapter* utilities
│   ├── lazy.ts        # LazyPort support
│   └── index.ts       # Public exports
│
├── builder-types/     # Type-level validation (GraphBuilder internals)
│   ├── internals.ts   # BuilderInternals grouping
│   ├── provide-types.ts    # provide() validation
│   ├── merge-types.ts      # merge() validation
│   ├── override-types.ts   # override() validation
│   ├── inspection-types.ts # IDE tooltip helpers
│   ├── empty-state.ts      # Initial state types
│   └── index.ts            # Internal exports
│
├── validation/        # Pure validation algorithms
│   ├── logic.ts       # Core port arithmetic
│   ├── errors.ts      # Error message types
│   ├── captive-dependency.ts  # Lifetime hierarchy checks
│   ├── cycle-detection/       # DFS algorithm (decomposed)
│   │   ├── depth-utils.ts     # Peano arithmetic for depth
│   │   ├── dependency-map.ts  # Type-level adjacency map
│   │   ├── reachability.ts    # IsReachable DFS
│   │   ├── cycle-path.ts      # Path reconstruction
│   │   ├── batch-utils.ts     # Batch cycle detection
│   │   ├── adapter-names.ts   # Name extraction
│   │   └── index.ts           # Module exports
│   └── index.ts       # Validation exports
│
├── graph/             # GraphBuilder and Graph
│   ├── builder.ts     # GraphBuilder class
│   ├── builder-inspection.ts  # inspect() implementation
│   ├── graph-visualization.ts # DOT/Mermaid export
│   ├── types.ts       # Graph type definition
│   └── index.ts       # Public exports
│
├── common/            # Shared utilities
│   └── index.ts       # IsNever, Prettify, etc.
│
├── index.ts           # Main public API
├── internal.ts        # Advanced types for library authors
├── convenience.ts     # defineService (crosses boundaries)
└── guards.ts          # Runtime type guards
```

### Test Structure

```
tests/
├── *.test.ts          # Runtime behavior tests
├── *.test-d.ts        # Type-level tests (expectTypeOf)
├── fixtures.ts        # Shared ports, adapters, services
├── test-builder.ts    # TestGraphBuilder utility
└── test-doubles.ts    # Mock factories
```

---

## Documentation Patterns

### Module Headers

Every source file starts with a JSDoc module comment:

```typescript
/**
 * Brief description of the module's purpose.
 *
 * ## Design Pattern: [Name]
 *
 * Explanation of the pattern used...
 *
 * ## Key Types
 *
 * - `TypeA` - Brief description
 * - `TypeB` - Brief description
 *
 * @see ./related-file.ts - Description
 * @packageDocumentation
 */
```

### Section Headers

Major code sections use ASCII art separators:

```typescript
// =============================================================================
// Section Name
// =============================================================================
```

For subsections within a section:

```typescript
// -----------------------------------------------------------------------------
// Subsection Name
// -----------------------------------------------------------------------------
```

### Type Documentation

Complex types include:

1. **Brief description**: What the type represents
2. **Design rationale**: Why this approach was chosen
3. **Example usage**: Code snippet showing typical use
4. **Related types**: `@see` references

````typescript
/**
 * Brief description of what this type does.
 *
 * ## Why This Design
 *
 * Explanation of the design decision...
 *
 * @example
 * ```typescript
 * type Result = MyType<SomeInput>;
 * // Result = ExpectedOutput
 * ```
 *
 * @typeParam T - Description of type parameter
 * @see RelatedType - How it relates
 */
type MyType<T> = ...;
````

---

## Variance Conventions

> **Complete Reference**: See the detailed "`never` vs `unknown`: A Complete Reference"
> section in `src/adapter/types.ts` for comprehensive documentation with examples.

When creating universal constraint types (like `AdapterAny`), use variance rules:

| Position           | Variance      | Use       | Rationale                           |
| ------------------ | ------------- | --------- | ----------------------------------- |
| Return type        | Covariant     | `unknown` | Any return is assignable to unknown |
| Parameter          | Contravariant | `never`   | Never accepts any argument          |
| Read-only property | Covariant     | `unknown` | Any value can be read as unknown    |
| Method parameter   | Contravariant | `never`   | Any method accepts never args       |

Example from `AdapterAny`:

```typescript
interface AdapterAny {
  readonly provides: Port<unknown, string>; // Covariant
  readonly factory: (...args: never[]) => unknown; // Contra + Co
  finalizer?(instance: never): void; // Contravariant
}
```

---

## Error Message Conventions

### Format

All compile-time errors follow this pattern:

```
ERROR: [Category]: [Specific problem]. Fix: [Actionable solution].
```

### Examples

```typescript
// Duplicate
`ERROR: Duplicate adapter for '${PortName}'. Fix: Remove one .provide() call, or use .override() for child graphs.`
// Circular
`ERROR: Circular dependency: ${CyclePath}. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.`
// Captive
`ERROR: Captive dependency: ${Lifetime} '${Name}' cannot depend on ${CaptiveLifetime} '${CaptiveName}'. Fix: Change lifetimes.`
// Missing
`ERROR: Missing adapters for ${PortNames}. Call .provide() first.`;
```

### Multi-Error Format

```
Multiple validation errors:
  1. ERROR: ...
  2. ERROR: ...
```

---

## Idempotency and Determinism Contracts

This section documents the idempotency and determinism guarantees for key operations.

### Terminology

| Term                  | Definition                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| **Pure**              | Same inputs always produce the same outputs; no side effects                   |
| **Idempotent**        | Applying the operation multiple times has the same effect as once              |
| **Deterministic**     | Given the same inputs, always produces the same output (may have side effects) |
| **Order-Independent** | Result doesn't depend on the order of inputs (set semantics)                   |

### GraphBuilder Operations

| Operation                     | Pure | Idempotent | Notes                                                  |
| ----------------------------- | ---- | ---------- | ------------------------------------------------------ |
| `GraphBuilder.create()`       | ✓    | ✓          | Returns equivalent empty builder each time             |
| `.provide(adapter)`           | ✓    | ✗          | Adding same adapter twice causes duplicate error       |
| `.provideFirstError(adapter)` | ✓    | ✗          | Same as provide()                                      |
| `.provideUnchecked(adapter)`  | ✓    | ✗          | Same as provide()                                      |
| `.merge(other)`               | ✓    | ✗          | Merging same graph twice causes duplicate errors       |
| `.override(adapter)`          | ✓    | ✓          | Multiple overrides of same port allowed                |
| `.build()`                    | ✓    | ✓          | Building same builder always produces equivalent graph |

**Key Insight**: GraphBuilder is immutable - all methods return NEW instances. This makes each operation effectively pure (no mutation of original).

### Adapter Creation

| Operation                    | Pure | Notes                                          |
| ---------------------------- | ---- | ---------------------------------------------- |
| `createAdapter(config)`      | ✓    | Same config produces equivalent frozen adapter |
| `createAsyncAdapter(config)` | ✓    | Same config produces equivalent frozen adapter |
| `lazyPort(port)`             | ✓    | Same port produces equivalent lazy token       |

### Inspection Functions

| Function                        | Pure | Deterministic | Notes                                   |
| ------------------------------- | ---- | ------------- | --------------------------------------- |
| `inspectGraph(graph)`           | ✗    | ✗             | Correlation ID uses Date.now() + random |
| `inspectGraph(graph, { seed })` | ✓    | ✓             | Same graph + seed = identical result    |
| `toDotGraph(inspection)`        | ✓    | ✓             | Same inspection = same DOT string       |
| `toMermaidGraph(inspection)`    | ✓    | ✓             | Same inspection = same Mermaid string   |

**Testing Tip**: Always use a seed when testing inspection:

```typescript
const info = inspectGraph(graph, { seed: "test" });
expect(info.correlationId).toBe("insp_1234567890_a1b2"); // Deterministic!
```

### Type-Level Operations

All type-level operations are **pure by definition** - types have no runtime side effects.

| Type                            | Order-Independent | Notes                                                   |
| ------------------------------- | ----------------- | ------------------------------------------------------- |
| `ProvideResult<...>`            | ✓                 | Validation result depends only on structural properties |
| `WouldCreateCycle<...>`         | ✓                 | DFS result depends only on graph structure              |
| `FindAnyCaptiveDependency<...>` | ✓                 | Depends only on lifetime relationships                  |
| `UnsatisfiedDependencies<P, R>` | ✓                 | Set subtraction: R - P                                  |

### Iteration Order Independence

Some operations return arrays where the **contents** are deterministic but **order** may vary:

```typescript
// These produce the same SET of values, but array order may differ
const info1 = inspectGraph(graphA);
const info2 = inspectGraph(graphB); // Same adapters, different registration order

// Compare as sets for equality:
const set1 = new Set(info1.unsatisfiedRequirements);
const set2 = new Set(info2.unsatisfiedRequirements);
expect([...set1]).toEqual(expect.arrayContaining([...set2]));
```

---

## Test Naming Conventions

### Runtime Tests (\*.test.ts)

```typescript
describe("feature: [category]", () => {
  it("[action] [expected outcome]", () => {
    // ...
  });
});
```

Examples:

- `"feature: provide()"` → `"adds adapter to graph"`
- `"feature: cycle detection"` → `"detects direct A -> A cycle"`
- `"edge cases"` → `"handles empty requires array"`

### Type Tests (\*.test-d.ts)

```typescript
describe("[TypeName] type utility", () => {
  it("[extracts|validates|transforms] [what] [condition]", () => {
    expectTypeOf<Result>().toEqualTypeOf<Expected>();
  });
});
```

Examples:

- `"InferAdapterProvides type utility"` → `"extracts provides from adapter"`
- `"CheckCycleDependency"` → `"returns error for direct cycle"`

---

## Anti-Patterns (What NOT to Do)

This section documents common mistakes and incorrect patterns to help both developers and AI assistants avoid problematic code.

### Adapter Creation

```typescript
// ❌ DON'T: Create adapters without using createAdapter()
const badAdapter = {
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
};
// Problem: Not frozen, missing clonable/factoryKind, no type inference

// ✅ DO: Use createAdapter() which freezes and adds required properties
const goodAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});
```

### Validation Bypass

```typescript
// ❌ DON'T: Use provideUnchecked() in production code
const builder = GraphBuilder.create()
  .provideUnchecked(AdapterA) // Skips compile-time validation!
  .provideUnchecked(AdapterB);
// Problem: Cycles and captive dependencies won't be caught until runtime

// ✅ DO: Use provide() for compile-time safety
const builder = GraphBuilder.create()
  .provide(AdapterA) // Full validation
  .provide(AdapterB);

// ✅ OK: Use provideUnchecked() only for VERY large graphs where type-checking is slow
// and you've verified the graph separately
const hugeBuilder = GraphBuilder.create()
  .provideUnchecked(Adapter1)
  // ... 100+ adapters ...
  .provideUnchecked(Adapter100);
```

### Submodule Imports

```typescript
// ❌ DON'T: Import from internal submodules directly
import type { IsReachable } from "@hex-di/graph/src/validation/cycle-detection/reachability";
// Problem: Internal paths are unstable and may change

// ✅ DO: Import from barrel exports
import type { IsReachable } from "@hex-di/graph/internal";
// Or for most use cases, just use the public API:
import { GraphBuilder, createAdapter } from "@hex-di/graph";
```

### Type Casting

```typescript
// ❌ DON'T: Cast to silence type errors
const result = builder.provide(adapter) as GraphBuilder<...>;
// Problem: Hides real validation errors

// ✅ DO: Fix the underlying issue
// If you get a validation error, the adapter has a real problem:
// - Duplicate port? Remove one or use override()
// - Cycle? Refactor or use lazyPort()
// - Captive dependency? Adjust lifetimes
```

### Direct Mutation

```typescript
// ❌ DON'T: Attempt to mutate frozen objects
const adapter = createAdapter({ ... });
adapter.lifetime = "transient";  // Runtime error: frozen
adapter.requires.push(AnotherPort);  // Runtime error: frozen

// ✅ DO: Create a new adapter with different config
const transientAdapter = createAdapter({
  ...adapterConfig,
  lifetime: "transient",
});
```

### Lazy Port Misuse

```typescript
// ❌ DON'T: Use lazyPort when it's not needed (adds indirection)
const adapter = createAdapter({
  requires: [lazyPort(LoggerPort)] as const,  // Unnecessary!
  factory: ({ LazyLogger }) => {
    const logger = LazyLogger();  // Extra indirection
    return { ... };
  },
});

// ✅ DO: Use lazyPort only to break cycles
const adapter = createAdapter({
  requires: [LoggerPort] as const,  // Direct dependency
  factory: ({ Logger }) => {
    return { ... };
  },
});

// ✅ OK: Use lazyPort for bidirectional dependencies
const notificationAdapter = createAdapter({
  requires: [lazyPort(UserServicePort)] as const,  // Breaks cycle
  factory: ({ LazyUserService }) => ({
    send: async (userId) => {
      const userService = LazyUserService();  // Resolved when needed
      const user = await userService.getUser(userId);
      // ...
    },
  }),
});
```

### Type Parameter Abuse

```typescript
// ❌ DON'T: Use 'any' to silence type errors
function processBuilder(builder: GraphBuilder<any, any, any, any, any>) {
  // Lost all type safety!
}

// ✅ DO: Use proper constraints
function processBuilder<
  B extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
>(builder: B): InferBuilderProvides<B> {
  // Types preserved through inference
}
```

### Ignoring Validation Errors

```typescript
// ❌ DON'T: Ignore the return type of provide()
builder.provide(AdapterA); // Result ignored - could be error string!
builder.provide(AdapterB);

// ✅ DO: Chain calls or check the result
const result = GraphBuilder.create()
  .provide(AdapterA) // Returns new builder or error
  .provide(AdapterB)
  .build();

// For conditional provides, check the type:
const maybeBuilder = GraphBuilder.create().provide(AdapterA);
if (typeof maybeBuilder === "string") {
  console.error("Validation failed:", maybeBuilder);
  return;
}
const builder = maybeBuilder.provide(AdapterB);
```

### Missing `as const` for Requires

```typescript
// ❌ DON'T: Forget 'as const' for requires array
const adapter = createAdapter({
  provides: ServicePort,
  requires: [LoggerPort, DatabasePort], // Widened to Port<...>[]
  factory: deps => {
    // deps type is less precise
  },
});

// ✅ DO: Use 'as const' for tuple inference
const adapter = createAdapter({
  provides: ServicePort,
  requires: [LoggerPort, DatabasePort] as const, // Tuple type preserved
  factory: ({ Logger, Database }) => {
    // Named deps with correct types
    // ...
  },
});
```

---

## See Also

- [GLOSSARY.md](./GLOSSARY.md) - Domain terminology definitions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architectural decisions
- [docs/typescript-patterns.md](./docs/typescript-patterns.md) - Type-level programming guide
- [CONCEPTS.md](./CONCEPTS.md) - Conceptual relationships and decision trees
