# Core Patterns in @hex-di/graph

This document catalogs the recurring design patterns used throughout the @hex-di/graph package. Reference this document when implementing new features or reviewing code.

---

## 1. Immutable Factory Functions

**When to use**: Creating objects that should be immutable and frozen.

**Pattern**: Use static factory methods instead of constructors. Return `Object.freeze()` instances.

### Code Example (from `src/builder/builder.ts:300-307`)

```typescript
/**
 * Creates a new empty GraphBuilder.
 *
 * @pure Returns new GraphBuilder instance; no side effects.
 */
static create(): GraphBuilder<never, never, never, never, DefaultInternals> {
  return new GraphBuilder([], new Set());
}
```

### Key Points

- Private constructor enforces factory method pattern
- Factory methods are marked `@pure` to indicate no side effects
- All returned instances are frozen (`Object.freeze()`)
- Each method returns a _new_ instance (immutability)

### Files Using This Pattern

- `src/builder/builder.ts` - `GraphBuilder.create()`, `withMaxDepth()`
- `src/adapter/factory.ts` - `createAdapter()`, `createAsyncAdapter()`

---

## 2. Overload Strategies for Type-Safe Defaults

**When to use**: When a function has optional parameters where the default value's _type_ matters (e.g., literal `false` vs widened `boolean`).

**Pattern**: Use multiple overload signatures to preserve literal types for different call patterns.

### Code Example (from `src/adapter/factory.ts:167-270`)

```typescript
/**
 * ## Overload Strategy for `clonable` Type Preservation
 *
 * Three overloads preserve literal types for the `clonable` property:
 *
 * | Call Pattern                    | Matched Overload | Result Type      |
 * |---------------------------------|------------------|------------------|
 * | `{ clonable: undefined }` or omitted | Overload 1   | `clonable: false` |
 * | `{ clonable: true }` or `false`      | Overload 2   | literal preserved |
 * | `{ clonable: someVar }` (dynamic)    | Overload 3   | `clonable: boolean` |
 */

// Overload 1: When clonable is NOT provided
export function createAdapter<...>(
  config: Omit<AdapterConfig<...>, "clonable"> & { clonable?: undefined }
): Adapter<..., False, ...>;

// Overload 2: When clonable IS provided with a literal
export function createAdapter<..., const TClonable extends boolean>(
  config: AdapterConfig<...> & { clonable: TClonable }
): Adapter<..., TClonable, ...>;

// Overload 3: Fallback for dynamic boolean values
export function createAdapter<...>(
  config: Omit<AdapterConfig<...>, "clonable"> & { clonable?: boolean | undefined }
): Adapter<..., boolean, ...>;
```

### Key Points

- TypeScript resolves overloads top-to-bottom until one matches
- First overload catches `undefined`/omitted → returns literal `false`
- Second overload catches explicit literals → preserves exact type
- Third overload is fallback for dynamic values → returns widened `boolean`

### Files Using This Pattern

- `src/adapter/factory.ts` - `createAdapter()`, `createAsyncAdapter()`

---

## 3. Literal Constant Helper

**When to use**: When you need literal-typed values without `as const` at every usage site.

**Pattern**: Use an identity function with `const` type parameter to preserve literal types.

### Code Example (from `src/adapter/constants.ts:22-35`)

```typescript
/**
 * Helper function that returns a value with its literal type preserved.
 * TypeScript infers the const type parameter from the argument.
 */
function literal<const T>(value: T): T {
  return value;
}

// Usage:
export const SYNC = literal("sync"); // type: "sync" (not string)
export const SINGLETON = literal("singleton"); // type: "singleton"
export const FALSE = literal(false); // type: false (not boolean)
```

### Key Points

- The `const` modifier on `T` prevents type widening
- Avoids repetitive `as const` casts throughout codebase
- Creates centralized, reusable literal constants
- Type aliases can be derived: `type Sync = typeof SYNC`

### Files Using This Pattern

- `src/adapter/constants.ts` - All literal constants

---

## 4. Phantom Type State Machine

**When to use**: When you need to track state changes at compile time without runtime overhead.

**Pattern**: Use type parameters that exist only at the type level (`declare` properties) to encode object state.

### Code Example (from `src/builder/builder.ts:174-242`)

```typescript
/**
 * GraphBuilder implements the **Type-State Pattern** - a technique where an object's
 * type changes with each method call, encoding the object's state in its type.
 *
 * ## Phantom Type Parameters
 *
 * The type parameters below exist only at the type level (compile time).
 * They have no runtime representation.
 */
export class GraphBuilder<
  TProvides = never, // Union of provided ports
  TRequires = never, // Union of required ports
  out TAsyncPorts = never, // Union of async ports
  out TOverrides = never, // Union of override ports
  TInternalState extends AnyBuilderInternals = DefaultInternals, // Dep graph, lifetime map
> {
  // Brand property for nominal typing (never instantiated at runtime)
  declare private readonly [__graphBuilderBrand]: [
    TProvides,
    TRequires,
    TAsyncPorts,
    TOverrides,
    TInternalState,
  ];

  // Phantom properties for type-level access
  declare readonly __provides: TProvides;
  declare readonly __depGraph: GetDepGraph<TInternalState>;
  declare readonly __lifetimeMap: GetLifetimeMap<TInternalState>;
}
```

### Key Points

- `declare` properties exist only in the type system, no runtime footprint
- Each method returns a _new type_ with updated phantom parameters
- Enables compile-time validation (cycles, captive deps) without runtime checks
- `out` variance modifier allows covariant type relationships

### Files Using This Pattern

- `src/builder/builder.ts` - `GraphBuilder` class
- `src/graph/types/graph-types.ts` - `Graph` type
- `src/builder/types/internals.ts` - `BuilderInternals`

---

## 5. Error Formatting with Structured Codes (ERROR[HEXxxx])

**When to use**: For user-facing error messages that need to be identifiable and parseable.

**Pattern**: Use template literal types with structured error codes.

### Code Example (from `src/validation/types/error-messages.ts:172-197`)

```typescript
/**
 * "ERROR[HEX001]: Duplicate adapter for 'Logger'. Fix: Remove one .provide() call..."
 */
export type DuplicateAdapterError<DuplicatePort> =
  `ERROR[HEX001]: Duplicate adapter for '${InferPortName<DuplicatePort> & string}'. Fix: Remove one .provide() call, or use .override() for child graphs.`;

/**
 * "ERROR[HEX002]: Circular dependency: UserService -> Database -> Cache -> UserService. Fix: ..."
 */
export type CircularDependencyErrorMessage<CyclePath extends string> =
  `ERROR[HEX002]: Circular dependency: ${CyclePath}. Fix: ${FormatLazySuggestionMessage<CyclePath>}`;

/**
 * "ERROR[HEX003]: Captive dependency: Singleton 'UserCache' cannot depend on Scoped 'RequestContext'. Fix: ..."
 */
export type CaptiveErrorMessage<
  TDependentName,
  TDependentLifetime,
  TCaptivePortName,
  TCaptiveLifetime,
> =
  `ERROR[HEX003]: Captive dependency: ${TDependentLifetime} '${TDependentName}' cannot depend on ${TCaptiveLifetime} '${TCaptivePortName}'. Fix: ...`;
```

### Key Points

- Error codes follow format `ERROR[HEXxxx]` for parseability
- Each error includes a "Fix:" suggestion
- Template literals interpolate type-level values
- Errors are parseable at runtime (see `src/validation/error-parsing.ts`)

| Code   | Error Type                 |
| ------ | -------------------------- |
| HEX001 | Duplicate adapter          |
| HEX002 | Circular dependency        |
| HEX003 | Captive dependency         |
| HEX004 | Reverse captive dependency |
| HEX005 | Lifetime inconsistency     |
| HEX008 | Missing adapters           |

### Files Using This Pattern

- `src/validation/types/error-messages.ts` - All error message types
- `src/validation/error-parsing.ts` - Runtime error parsing
- `src/graph/inspection/error-formatting.ts` - Runtime error formatting

---

## 6. Type-Level Validation Algorithms

**When to use**: When validation must happen at compile time, not runtime.

**Pattern**: Use recursive conditional types with base case tables to implement graph algorithms.

### Code Example (from `src/validation/types/cycle/detection.ts:228-253`)

```typescript
/**
 * Checks if a target port is reachable from a source port.
 *
 * ## Recursion Pattern: Distributive DFS with Visited Set
 *
 * ### Base Cases
 * | Condition | Result | Reason |
 * |-----------|--------|--------|
 * | Depth exceeded | `DepthExceededResult` | Prevents TS2589 |
 * | `TFrom` is `never` | `false` | No more nodes to check |
 * | `TFrom` in `TVisited` | `false` | Already visited |
 * | `TFrom` === `TTarget` | `true` | Found the target! |
 *
 * ### Recursive Case
 * Delegates to IsReachableCheckDeps to explore dependencies.
 */
export type IsReachable<TDepGraph, TFrom extends string, TTarget extends string, ...> =
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? DepthExceededResult
    : IsNever<TFrom> extends true
      ? false
      : TFrom extends TVisited
        ? false
        : TFrom extends TTarget
          ? true
          : IsReachableCheckDeps<...>;
```

### Key Points

- Document base cases in a table format
- Use depth limiting to prevent TypeScript recursion errors (TS2589)
- Distributive conditional types enable "for-each" iteration over unions
- Separate helper types (like `IsReachableCheckDeps`) improve readability

### Common Recursion Patterns

| Pattern                  | Use Case                                    |
| ------------------------ | ------------------------------------------- |
| Tail-Recursive Fold      | Processing tuple elements sequentially      |
| Distributive Conditional | Iterating over union types                  |
| Infer-and-Branch         | Extracting and branching on inferred types  |
| Template Literal Parsing | Parsing string types character by character |

### Files Using This Pattern

- `src/validation/types/cycle/detection.ts` - `IsReachable`, `WouldCreateCycle`
- `src/validation/types/cycle/errors.ts` - `FindCyclePath`, `CollectSuggestions`
- `src/validation/types/captive/detection.ts` - `FindAnyCaptiveDependency`

---

## 7. Prettify Helper

**When to use**: When intersection types make IDE tooltips unreadable.

**Pattern**: Use a mapped type with `& {}` to force TypeScript to evaluate intersections.

### Code Example (from `src/types/type-utilities.ts:52-103`)

```typescript
/**
 * Flattens intersection types into a single object type for better readability.
 *
 * ## Why This Matters
 *
 * 1. **IDE Readability**: Tooltips show actual properties instead of opaque
 *    intersections. Compare:
 *    - Without: `{ a: 1 } & { b: 2 } & { c: 3 }`
 *    - With: `{ a: 1; b: 2; c: 3 }`
 *
 * 2. **Indexing Behavior**: Some type operations require fully evaluated
 *    object types.
 *
 * 3. **Error Messages**: Compile errors become clearer when types are
 *    flattened rather than shown as chains of intersections.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
```

### Key Points

- The mapped type `{ [K in keyof T]: T[K] }` iterates over all keys
- The trailing `& {}` forces eager evaluation
- Use at "export boundaries" where types will appear in IDE tooltips
- No runtime cost - purely a type-level transformation

### Files Using This Pattern

- `src/types/type-utilities.ts` - `Prettify` definition
- `src/validation/types/cycle/detection.ts` - `AddEdge` uses `Prettify`
- `src/builder/types/*.ts` - Various result types

---

## Summary

| Pattern                     | Primary Purpose             | Runtime Cost      |
| --------------------------- | --------------------------- | ----------------- |
| Immutable Factory Functions | Create frozen instances     | Minimal (freeze)  |
| Overload Strategies         | Preserve literal types      | None              |
| Literal Constant Helper     | Avoid `as const` casts      | None              |
| Phantom Type State Machine  | Compile-time state tracking | None              |
| Structured Error Codes      | Parseable error messages    | None (types only) |
| Type-Level Algorithms       | Compile-time validation     | None              |
| Prettify Helper             | Readable IDE tooltips       | None              |

These patterns work together to provide compile-time safety with minimal runtime overhead. When adding new features, consider which patterns apply and maintain consistency with existing implementations.
