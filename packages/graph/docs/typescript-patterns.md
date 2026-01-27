# TypeScript Patterns in @hex-di/graph

> **A Reference Guide for Advanced Type-Level Programming Patterns**

This document explains the advanced TypeScript patterns used throughout the `@hex-di/graph` package. Each pattern includes the problem it solves, how it works, and practical examples.

## Table of Contents

1. [Variance-Based Universal Constraints](#1-variance-based-universal-constraints)
2. [Phantom Type Parameters](#2-phantom-type-parameters)
3. [Distributive Conditional Types](#3-distributive-conditional-types)
4. [Type-Level Arithmetic (Peano Numbers)](#4-type-level-arithmetic-peano-numbers)
5. [Type-Level Sets Using Unions](#5-type-level-sets-using-unions)
6. [Template Literal Error Messages](#6-template-literal-error-messages)
7. [Branded Types for Nominal Typing](#7-branded-types-for-nominal-typing)
8. [Conditional Type Chains](#8-conditional-type-chains)
9. [Inference with `infer` Keyword](#9-inference-with-infer-keyword)
10. [Union-to-Tuple Iteration](#10-union-to-tuple-iteration)
11. [Function Overloads for Conditional Return Types](#11-function-overloads-for-conditional-return-types)
12. [Dual Semantics of `never`](#12-dual-semantics-of-never)

---

## 1. Variance-Based Universal Constraints

### The Problem

We need a type that matches ANY adapter, regardless of its specific types. The naive approach would use `any`:

```typescript
// ❌ BAD: Uses `any`, loses type safety
interface AdapterAny {
  factory: (...args: any[]) => any;
}
```

### The Solution

Use TypeScript's variance rules with `never` and `unknown`:

```typescript
// ✅ GOOD: Type-safe universal constraint
interface AdapterAny {
  readonly factory: (...args: never[]) => unknown;
  readonly provides: Port<unknown, string>;
  readonly requires: readonly Port<unknown, string>[];
}
```

### Why This Works

TypeScript has two variance rules for functions:

| Position   | Variance          | Rule                                                       |
| ---------- | ----------------- | ---------------------------------------------------------- |
| Parameters | **Contravariant** | Function accepting `never[]` can accept ANY parameter list |
| Return     | **Covariant**     | Function returning `unknown` matches ANY return type       |

**Visual Explanation**:

```
                    Type Hierarchy
                         ↑
                      unknown     ← Top type (everything is unknown)
                         │
            ┌────────────┼────────────┐
            │            │            │
         string       number       object
            │            │            │
            └────────────┼────────────┘
                         │
                       never      ← Bottom type (nothing is never)
```

For **covariant** positions (return types), subtypes can substitute supertypes:

- `() => string` satisfies `() => unknown` ✓

For **contravariant** positions (parameters), supertypes can substitute subtypes:

- `(x: string) => void` satisfies `(x: never) => void` ✓
- Because `never` extends `string` (never extends everything)

### Practical Example

```typescript
// All these satisfy AdapterAny.factory:

const f1: (...args: never[]) => unknown = () => "hello";
// ✓ () => string satisfies () => unknown

const f2: (...args: never[]) => unknown = (a: number) => ({ value: a });
// ✓ (number) => object satisfies (never) => unknown

const f3: (...args: never[]) => unknown = (a: string, b: boolean) => undefined;
// ✓ (string, boolean) => undefined satisfies (never, never) => unknown
```

### Where It's Used

- `src/adapter/types.ts`: `AdapterAny` interface
- Throughout `GraphBuilder` methods that accept any adapter

---

## 2. Phantom Type Parameters

### The Problem

We want to track compile-time state without any runtime overhead.

### The Solution

Use `declare` to create properties that exist only at the type level:

```typescript
class GraphBuilder<TProvides, TRequires> {
  // These have NO runtime footprint
  declare readonly __provides: TProvides;
  declare readonly __requires: TRequires;

  // This is the only runtime state
  readonly adapters: readonly AdapterAny[];
}
```

### How `declare` Works

The `declare` keyword tells TypeScript:

- "This property exists for type-checking purposes"
- "Don't generate any JavaScript code for it"

```typescript
// TypeScript source:
class Example<T> {
  declare readonly phantom: T;
  readonly real: string = "hello";
}

// Compiled JavaScript (phantom is gone):
class Example {
  constructor() {
    this.real = "hello";
  }
}
```

### Type-State Machine Pattern

Phantom types enable the type-state pattern where types change with each method call:

```typescript
class Builder<TState> {
  declare readonly __state: TState;

  // Each method returns a NEW type
  addItem<T>(item: T): Builder<TState | T> {
    return this as unknown as Builder<TState | T>;
  }
}

const b1 = new Builder<never>(); // Builder<never>
const b2 = b1.addItem("a"); // Builder<"a">
const b3 = b2.addItem(42); // Builder<"a" | 42>
```

### Where It's Used

- `src/graph/builder.ts`: All `__provides`, `__requires`, `__depGraph`, etc.
- `src/adapter/types.ts`: `[__adapterBrand]` property

---

## 3. Distributive Conditional Types

### The Problem

We need to iterate over each member of a union type.

### The Solution

Conditional types automatically distribute over unions when the checked type is a naked type parameter:

```typescript
type Check<T> = T extends string ? `String: ${T}` : "Not string";

// When T is a union, it distributes:
type Result = Check<"a" | "b" | 42>;
// = Check<"a"> | Check<"b"> | Check<42>
// = "String: a" | "String: b" | "Not string"
```

### The Distribution Rule

Distribution happens when:

1. The type being checked is a **naked type parameter** (just `T`, not `[T]` or `T[]`)
2. The conditional uses `extends`

```typescript
// ✓ Distributes (naked T)
type Dist<T> = T extends U ? A : B;

// ✗ Does NOT distribute (T is wrapped)
type NoDist<T> = [T] extends [U] ? A : B;
```

### Practical Example: Checking Each Port

```typescript
// Check if ANY port in the union is reachable
type IsAnyReachable<TFrom, TTarget, TMap> = TFrom extends string // Distributes over TFrom union
  ? IsReachable<TMap, TFrom, TTarget>
  : false;

// Usage:
type Result = IsAnyReachable<"A" | "B" | "C", "Target", DepMap>;
// = IsReachable<DepMap, "A", "Target">
//   | IsReachable<DepMap, "B", "Target">
//   | IsReachable<DepMap, "C", "Target">
```

### Preventing Distribution

Sometimes you want to check the union as a whole:

```typescript
// Wrap in tuple to prevent distribution
type IsNever<T> = [T] extends [never] ? true : false;

// Without wrapping, `never` would distribute to... nothing
type Wrong<T> = T extends never ? true : false;
type Test = Wrong<never>; // never (not true!)

// With wrapping, it works correctly
type Right = IsNever<never>; // true
```

### Where It's Used

- `src/validation/cycle-detection.ts`: `IsReachable` distributes over port unions
- `src/validation/captive-dependency.ts`: `FindAnyCaptiveDependency`
- `src/validation/errors.ts`: `ExtractPortNames`

---

## 4. Type-Level Arithmetic (Peano Numbers)

### The Problem

TypeScript's type system cannot perform arithmetic (`A > B`, `A + 1`). We need to count recursion depth.

### The Solution

Use tuple length as a counter (Peano-style numbers):

```typescript
// A "number" is represented by tuple length
type Zero = []; // length = 0
type One = [unknown]; // length = 1
type Two = [unknown, unknown]; // length = 2

// Increment by spreading and adding an element
type Increment<N extends unknown[]> = [...N, unknown];

type Three = Increment<Two>; // [unknown, unknown, unknown]
type ThreeLength = Three["length"]; // 3 (literal type!)
```

### Why Tuple Length?

TypeScript knows the literal length of tuple types:

```typescript
type T = [string, number, boolean];
type L = T["length"]; // 3 (not just `number`, but literal `3`)
```

### Comparison via Length

```typescript
type DepthExceeded<Current extends unknown[], Max extends number> = Current["length"] extends Max
  ? true
  : false;

// Usage in recursion:
type Recurse<Depth extends unknown[] = []> =
  DepthExceeded<Depth, 30> extends true ? "Too deep!" : Recurse<Increment<Depth>>;
```

### Complete Example: Depth-Limited DFS

```typescript
type Depth = readonly unknown[];

type IncrementDepth<D extends Depth> = [...D, unknown];

type DepthExceeded<D extends Depth, Max extends number> = D["length"] extends Max ? true : false;

type IsReachable<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [], // Start at 0
  TMaxDepth extends number = 30,
> =
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? false // Bail out if too deep
    : TFrom extends TTarget
      ? true
      : IsReachable<
          TMap,
          GetDeps<TMap, TFrom>,
          TTarget,
          TVisited | TFrom,
          IncrementDepth<TDepth>, // Increment for next call
          TMaxDepth
        >;
```

### Where It's Used

- `src/validation/cycle-detection.ts`: `Depth`, `IncrementDepth`, `DepthExceeded`
- `src/validation/errors.ts`: `JoinErrors` (counting error numbers)

---

## 5. Type-Level Sets Using Unions

### The Problem

We need a "visited set" for graph traversal at the type level.

### The Solution

Use union types as sets:

```typescript
// Empty set
type Empty = never;

// Set with elements
type Set1 = "A";
type Set2 = "A" | "B";
type Set3 = "A" | "B" | "C";

// Add element (union)
type Add<TSet, TElement> = TSet | TElement;

// Check membership (extends)
type Contains<TSet, TElement> = TElement extends TSet ? true : false;

// Remove element (Exclude)
type Remove<TSet, TElement> = Exclude<TSet, TElement>;
```

### Operations

| Operation    | Type Expression           | Example                                       |
| ------------ | ------------------------- | --------------------------------------------- |
| Empty set    | `never`                   | `never`                                       |
| Add          | `TSet \| TElement`        | `"A" \| "B"` → `"A" \| "B" \| "C"`            |
| Contains     | `TElement extends TSet`   | `"A" extends "A" \| "B"` → `true`             |
| Remove       | `Exclude<TSet, TElement>` | `Exclude<"A" \| "B", "A">` → `"B"`            |
| Union        | `TSet1 \| TSet2`          | `("A" \| "B") \| ("C")` → `"A" \| "B" \| "C"` |
| Intersection | `Extract<TSet1, TSet2>`   | `Extract<"A" \| "B", "B" \| "C">` → `"B"`     |
| Is Empty     | `[TSet] extends [never]`  | `[never] extends [never]` → `true`            |

### Practical Example: Visited Set in DFS

```typescript
type IsReachable<
  TMap,
  TFrom extends string,
  TTarget extends string,
  TVisited extends string = never, // ← The visited set
> = TFrom extends TVisited
  ? false // Already visited, skip
  : TFrom extends TTarget
    ? true
    : IsReachable<
        TMap,
        GetDeps<TMap, TFrom>,
        TTarget,
        TVisited | TFrom // ← Add current node to visited set
      >;
```

### Where It's Used

- `src/validation/cycle-detection.ts`: `TVisited` parameter
- `src/validation/logic.ts`: `HasOverlap`, `UnsatisfiedDependencies`

---

## 6. Template Literal Error Messages

### The Problem

TypeScript error messages for complex types are unreadable:

```
Type 'GraphBuilder<Port<Logger, "Logger">, never, never, { Logger: never },
{ Logger: 1 }, never, unknown, 30>' is not assignable to type '{ __valid:
false; __errorBrand: "DuplicateProviderError"; __message: "Duplicate provider
for: Logger"; __duplicate: Port<Logger, "Logger">; }'.
```

### The Solution

Return a template literal string type as the error:

```typescript
type DuplicateErrorMessage<Port> = `ERROR: Duplicate adapter for '${InferPortName<Port>}'.`;

// Error becomes:
// Type 'GraphBuilder<...>' is not assignable to type
// '"ERROR: Duplicate adapter for 'Logger'."'
```

### Building Complex Messages

Template literals support interpolation and concatenation:

```typescript
// Simple interpolation
type Greeting<Name extends string> = `Hello, ${Name}!`;
type G = Greeting<"World">; // "Hello, World!"

// Multiple interpolations
type Error<A extends string, B extends string> = `${A} cannot depend on ${B}`;
type E = Error<"Singleton", "Scoped">;
// "Singleton cannot depend on Scoped"

// Conditional messages
type Message<HasError extends boolean> = HasError extends true ? "Validation failed" : "Success";
```

### Joining Multiple Errors

```typescript
type JoinErrors<
  Errors extends readonly string[],
  Acc extends string = "",
  N extends readonly unknown[] = readonly [unknown], // Counter starting at 1
> = Errors extends readonly [infer First extends string, ...infer Rest extends readonly string[]]
  ? JoinErrors<
      Rest,
      Acc extends "" ? `  ${N["length"]}. ${First}` : `${Acc}\n  ${N["length"]}. ${First}`,
      readonly [...N, unknown] // Increment counter
    >
  : Acc;

type Result = JoinErrors<["Error A", "Error B"]>;
// "  1. Error A\n  2. Error B"
```

### Where It's Used

- `src/validation/errors.ts`: All `*ErrorMessage` types
- `src/validation/cycle-detection.ts`: `BuildCyclePath`

---

## 7. Branded Types for Nominal Typing

### The Problem

TypeScript uses structural typing. Two identical structures are the same type:

```typescript
type UserId = string;
type PostId = string;

function getUser(id: UserId) { ... }

const postId: PostId = "post-123";
getUser(postId);  // ✓ Compiles! But it's wrong!
```

### The Solution

Add a unique brand property:

```typescript
declare const __brand: unique symbol;

type UserId = string & { readonly [__brand]: "UserId" };
type PostId = string & { readonly [__brand]: "PostId" };

function getUser(id: UserId) { ... }

const postId = "post-123" as PostId;
getUser(postId);  // ✗ Error! PostId is not UserId
```

### Phantom Brands

Use `declare` for brands with no runtime cost:

```typescript
declare const __adapterBrand: unique symbol;

type Adapter<TProvides, TRequires> = {
  // Phantom brand - no runtime representation
  readonly [__adapterBrand]?: [TProvides, TRequires];

  // Actual runtime properties
  readonly provides: TProvides;
  readonly requires: TRequires;
};
```

### Why `unique symbol`?

Regular symbols can be duplicated:

```typescript
const s1 = Symbol("brand");
const s2 = Symbol("brand");
// s1 !== s2, but their TYPES are both `symbol`

declare const s3: unique symbol;
declare const s4: unique symbol;
// Types of s3 and s4 are DIFFERENT unique symbols
```

### Where It's Used

- `src/adapter/types.ts`: `__adapterBrand`
- `src/graph/builder.ts`: `__graphBuilderBrand`
- `@hex-di/ports`: `__brand` for Port types

---

## 8. Conditional Type Chains

### The Problem

We need to run multiple validations in sequence, stopping at the first error.

### The Solution

Chain conditional types with nested ternaries:

```typescript
type ValidateAdapter<TAdapter> =
  // Check 1: Duplicate
  IsDuplicate<TAdapter> extends true
    ? DuplicateError<TAdapter>
    : // Check 2: Circular
      WouldCreateCycle<TAdapter> extends true
      ? CircularError<TAdapter>
      : // Check 3: Captive
        IsCaptive<TAdapter> extends true
        ? CaptiveError<TAdapter>
        : // All checks passed
          SuccessResult<TAdapter>;
```

### Why Nested (Not Union)?

Unions would allow ANY branch:

```typescript
// ❌ WRONG: Union allows all branches
type Wrong =
  | (IsDuplicate<A> extends true ? Error1 : never)
  | (WouldCreateCycle<A> extends true ? Error2 : never)
  | SuccessResult<A>;
// Result could be Error1 | Error2 | SuccessResult - not useful!

// ✓ CORRECT: Nested ensures sequential checking
type Right =
  IsDuplicate<A> extends true
    ? Error1
    : WouldCreateCycle<A> extends true
      ? Error2
      : SuccessResult<A>;
// Result is exactly ONE of these
```

### Decomposing Complex Chains

For readability, split into helper types:

```typescript
// Instead of one massive chain...
type ProvideResult<...> =
  CheckDuplicate<
    CheckCycle<
      CheckCaptive<
        SuccessResult<...>
      >
    >
  >;

// Where each helper is:
type CheckDuplicate<TNext> =
  HasDuplicate extends true ? DuplicateError : TNext;

type CheckCycle<TNext> =
  HasCycle extends true ? CycleError : TNext;
```

### Where It's Used

- `src/builder-types/provide-types.ts`: `ProvideResult`
- `src/builder-types/merge-types.ts`: `MergeResult`

---

## 9. Inference with `infer` Keyword

### The Problem

We need to extract type information from generic types.

### The Solution

Use `infer` in conditional types to capture parts of a type:

```typescript
// Extract the element type from an array
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

type E1 = ElementOf<string[]>; // string
type E2 = ElementOf<[1, 2, 3]>; // 1 | 2 | 3
type E3 = ElementOf<readonly number[]>; // number
```

### Multiple Inferences

You can infer multiple parts:

```typescript
// Extract both key and value from a record
type KeyValue<T> = T extends Record<infer K, infer V> ? { key: K; value: V } : never;

type KV = KeyValue<{ name: string; age: number }>;
// { key: "name" | "age"; value: string | number }
```

### Extracting from Branded Types

```typescript
type Port<T, TName extends string> = {
  readonly [__brand]: [T, TName];
  readonly __portName: TName;
};

// Extract the service type
type InferService<TPort> = TPort extends Port<infer T, string> ? T : never;

// Extract the port name
type InferPortName<TPort> = TPort extends Port<unknown, infer N> ? N : never;

type P = Port<Logger, "Logger">;
type S = InferService<P>; // Logger
type N = InferPortName<P>; // "Logger"
```

### Constrained Inference

Add constraints to inferred types:

```typescript
// Only infer if it's a string
type StringKeys<T> = T extends Record<infer K extends string, unknown> ? K : never;

type SK = StringKeys<{ a: 1; b: 2 }>; // "a" | "b"
```

### Where It's Used

- `src/adapter/inference.ts`: `InferAdapterProvides`, `InferAdapterRequires`
- `src/validation/cycle-detection.ts`: `AdapterProvidesName`
- `src/validation/errors.ts`: `ExtractPortNames`

---

## 10. Union-to-Tuple Iteration

### The Problem

We need to iterate over a union and process each member one at a time (non-distributively).

### The Solution

Use the "last of union" trick to pick one element at a time:

```typescript
// Convert union to intersection of functions
type UnionToIntersectionFn<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Extract the "last" member of a union
type LastOfUnion<U> =
  UnionToIntersectionFn<U extends unknown ? (x: U) => void : never> extends (x: infer L) => void
    ? L
    : never;

type Last = LastOfUnion<"a" | "b" | "c">; // "c" (or "a" or "b" - implementation dependent)
```

### Iterating with Recursion

```typescript
type JoinPortNames<T, Acc extends string = ""> = [T] extends [never]
  ? Acc // Base case: empty union
  : LastOfUnion<T> extends Port<unknown, infer N extends string>
    ? JoinPortNames<
        Exclude<T, LastOfUnion<T>>, // Remove processed element
        [Acc] extends [""] ? N : `${Acc}, ${N}` // Accumulate
      >
    : Acc;

type Names = JoinPortNames<LoggerPort | DatabasePort>;
// "Logger, Database"
```

### Why Not Just Distribute?

Distribution would give us a union of results:

```typescript
// Distributive - gives union
type Distributed<T> = T extends Port<unknown, infer N> ? N : never;
type D = Distributed<LoggerPort | DatabasePort>;
// "Logger" | "Database" (union, not joined string)

// Non-distributive iteration - gives single string
type Joined = JoinPortNames<LoggerPort | DatabasePort>;
// "Logger, Database" (single string)
```

### Where It's Used

- `src/validation/errors.ts`: `JoinPortNames`, `LastOfUnion`

---

## 11. Function Overloads for Conditional Return Types

### The Problem

TypeScript's conditional types work great for type-level computation, but implementing
functions that return conditional types is challenging:

```typescript
// Type definition: returns success OR error string
type ProvideResult<A> = IsValid<A> extends true ? GraphBuilder<...> : ErrorMessage<A>;

// ❌ Implementation problem: TypeScript can't narrow the return type
provide<A>(adapter: A): ProvideResult<A> {
  if (isValid(adapter)) {
    return new GraphBuilder(...);  // Error: Can't assign to conditional type
  }
  return `Error: ${adapter}`;      // Error: Can't assign to conditional type
}
```

The issue is that TypeScript cannot resolve the conditional type inside the function
body because `A` is still generic.

### The Solution: Function Overloads

Use function overloads to separate the caller-facing signature (conditional type)
from the implementation signature (union type):

```typescript
class GraphBuilder {
  // Overload signature (what callers see): precise conditional return type
  provide<A extends AdapterAny>(adapter: A): ProvideResultAllErrors<A>;

  // Implementation signature (hidden): returns union of all possibilities
  provide<A extends AdapterAny>(adapter: A): GraphBuilder<...> | string {
    if (this.wouldCreateError(adapter)) {
      return this.getErrorMessage(adapter);
    }
    return new GraphBuilder(...);
  }
}
```

### Why This Works

1. **Callers see the overload signature**: The conditional type provides precise
   compile-time feedback:

   ```typescript
   const result = builder.provide(validAdapter);
   // Type: GraphBuilder<...> (the conditional type resolves)

   const error = builder.provide(duplicateAdapter);
   // Type: "ERROR: Duplicate adapter for 'Logger'." (string literal)
   ```

2. **Implementation uses union type**: Inside the method body, TypeScript accepts
   the union `GraphBuilder<...> | string` because any branch matches it.

3. **Runtime behavior is correct**: The implementation validates and returns the
   appropriate type, which matches what the overload signature would compute.

### Pattern Template

```typescript
class Builder<TProvides, TRequires, TState> {
  // === Overload Signatures (public API) ===

  // Signature 1: Returns conditional type based on validation
  methodName<A extends SomeConstraint>(
    param: A
  ): ConditionalResult<TProvides, TRequires, TState, A>;

  // === Implementation Signature (private to callers) ===

  // Returns union of success type and all possible error types
  methodName<A extends SomeConstraint>(
    param: A
  ): SuccessType<...> | string {
    // Validation logic
    if (hasError(param)) {
      return getErrorMessage(param);
    }
    // Success logic
    return new Builder(...);
  }
}
```

### Complete Example from @hex-di/graph

```typescript
// From src/graph/builder.ts

export class GraphBuilder<TProvides, TRequires, TAsyncPorts, TOverrides, TState> {
  // ---------------------------------------------------------------------------
  // Overload: Returns conditional type (what callers see)
  // ---------------------------------------------------------------------------
  /**
   * Adds an adapter to the graph with full validation.
   * Returns a new GraphBuilder on success, or an error message string on failure.
   */
  provide<A extends AdapterAny>(
    adapter: A
  ): ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TState, A>;

  // ---------------------------------------------------------------------------
  // Implementation: Returns union type (hidden from callers)
  // ---------------------------------------------------------------------------
  provide<A extends AdapterAny>(
    adapter: A
  ):
    | GraphBuilder<
        TProvides | InferAdapterProvides<A>,
        TRequires | InferAdapterRequires<A>,
        TAsyncPorts,
        TOverrides,
        UpdatedState<TState, A>
      >
    | string {
    // Runtime validation (mirrors compile-time validation)
    if (this.hasDuplicatePort(adapter)) {
      return `ERROR: Duplicate adapter for '${adapter.provides.__portName}'.`;
    }

    // Success: return new builder
    const nextAdapters = Object.freeze([...this.adapters, adapter]);
    return new GraphBuilder(nextAdapters, this.overridePortNames);
  }
}
```

### Why Not Type Assertions?

You might think to cast the return value:

```typescript
// ❌ BAD: Uses type assertion
provide<A>(adapter: A): ProvideResult<A> {
  return new GraphBuilder(...) as ProvideResult<A>;  // Unsafe cast!
}
```

This is dangerous because:

1. The cast bypasses TypeScript's type checking entirely
2. If `ProvideResult<A>` resolves to an error string, you're lying about the type
3. Callers could get a `GraphBuilder` when they expect a string error

The overload pattern is type-safe because:

1. The implementation must return something that satisfies the union
2. TypeScript verifies both signatures are compatible
3. No `as` casts or `@ts-expect-error` comments needed

### When to Use This Pattern

Use function overloads when:

- A method's return type is a conditional type that depends on generic parameters
- The method has validation logic that can fail with an error type
- You want precise error types at call sites (not just `string | Builder`)

### Related Patterns

- **Conditional Type Chains** (Section 8): The conditional types in the overload signature
- **Template Literal Errors** (Section 6): The error messages returned
- **Phantom Types** (Section 2): State tracked in type parameters

### Where It's Used

- `src/graph/builder.ts`: `provide()`, `provideFast()`, `provideAsync()`, `merge()`, `override()`
- Every method that can return either a success type or an error message

---

## 12. Dual Semantics of `never`

### The Problem

In TypeScript's type system, `never` has two distinct meanings that can be confusing:

1. **Empty Set / Empty Union**: "No values satisfy this type"
2. **Error / Invalid State**: "This type indicates a failure"

Without clear conventions, code reviewers can't tell which meaning is intended.

### The Solution

Use explicit patterns to distinguish between the two meanings:

```typescript
// ✅ GOOD: Use InferenceError for error cases
type ExtractName<T> = T extends { name: infer N }
  ? N
  : InferenceError<"ExtractName", "Input must have a 'name' property", T>;

// ✅ GOOD: Check explicitly for empty set case
type HasDependencies<TDeps> =
  IsNever<TDeps> extends true
    ? false // Empty set = no dependencies
    : true;

// ⚠️ RISKY: Ambiguous - is this an error or empty?
type RequiredPorts<T> = T extends { requires: infer R } ? R : never;
```

### Context Determines Meaning

| Context                            | `never` Meaning                | Example                     |
| ---------------------------------- | ------------------------------ | --------------------------- |
| `TRequires = never`                | Empty set (no dependencies)    | Adapter with `requires: []` |
| `UnsatisfiedDeps = never`          | Success (all deps satisfied)   | Graph ready to build        |
| `{ Logger: never }`                | Empty set (no deps for Logger) | Leaf node in graph          |
| `GetLifetimeLevel<Map, "Unknown">` | Error (port not found)         | Forward reference           |
| `LifetimeName<99>`                 | Error (invalid level)          | Programming error           |
| `AdapterProvidesName<{}>`          | Error (not an adapter)         | Type mismatch               |

### When to Use `InferenceError`

Use `InferenceError` when:

1. `never` would be ambiguous (could mean error or empty)
2. You need to debug inference chains
3. IDE tooltips should show error context

```typescript
import type { InferenceError } from "@hex-di/graph";

type SafeExtract<T> = T extends { value: infer V }
  ? V
  : InferenceError<"SafeExtract", "Type must have 'value' property", T>;

// IDE shows: { __inferenceError: true; __source: "SafeExtract"; __message: "..."; __input: {...} }
// Instead of just: never
```

### Related

- `src/types/type-utilities.ts`: Full documentation of `never` semantics
- `IsNever<T>`: Utility to check for `never` explicitly
- `InferenceError<Source, Message, Input>`: Error type for debugging

---

## Quick Reference Table

| Pattern                   | Problem                          | Solution                           | Example Location     |
| ------------------------- | -------------------------------- | ---------------------------------- | -------------------- |
| Variance Constraints      | Universal type without `any`     | `never[]` params, `unknown` return | `adapter/types.ts`   |
| Phantom Types             | Compile-time state, zero runtime | `declare readonly`                 | `graph/builder.ts`   |
| Distributive Conditionals | Iterate over union               | Naked type parameter + `extends`   | `cycle-detection.ts` |
| Peano Numbers             | Type-level counting              | Tuple length                       | `cycle-detection.ts` |
| Union Sets                | Type-level sets                  | Union + `extends` + `Exclude`      | `cycle-detection.ts` |
| Template Literals         | Readable error messages          | Template literal types             | `errors.ts`          |
| Branded Types             | Nominal typing                   | `unique symbol` brands             | `adapter/types.ts`   |
| Conditional Chains        | Sequential validation            | Nested ternaries                   | `provide-types.ts`   |
| `infer` Keyword           | Extract type parts               | `infer` in conditionals            | `inference.ts`       |
| Union Iteration           | Process union one-by-one         | `LastOfUnion` trick                | `errors.ts`          |
| Function Overloads        | Conditional return types         | Overload + union implementation    | `graph/builder.ts`   |

---

## Further Reading

- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [Effect-TS](https://github.com/Effect-TS/effect) - Inspiration for many patterns
- [ts-toolbelt](https://github.com/millsp/ts-toolbelt) - Type-level utility library
