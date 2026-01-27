# Type-Level Validation Architecture

This document explains the type-level programming patterns used in @hex-di/graph for compile-time dependency graph validation.

## Type Parameter Naming Convention

Understanding the naming convention makes the codebase navigable:

| Pattern   | Meaning                            | Example                                 |
| --------- | ---------------------------------- | --------------------------------------- |
| `T*Union` | Union type (distributive behavior) | `TRequiresUnion = PortA \| PortB`       |
| `T*Map`   | Record/object type                 | `TDepGraphMap = { A: B \| C }`          |
| `T*Tuple` | Ordered tuple type                 | `TAdaptersTuple = [Adapter1, Adapter2]` |
| `T*Name`  | String literal type                | `TPortName = "Logger"`                  |
| `T*Level` | Numeric literal type               | `TLifetimeLevel = 1 \| 2 \| 3`          |

## Validation Pipeline Architecture

Each `.provide()` call triggers a validation pipeline at the type level:

```
Adapter Input
     │
     ▼
┌─────────────────┐
│ Duplicate Check │ ──▶ Error if port already provided
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  Cycle Check    │ ──▶ Error if would create cycle
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Captive Check   │ ──▶ Error if lifetime violation
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│ Compute New     │
│ Builder State   │
└────────┬────────┘
         │
         ▼
   New GraphBuilder<UpdatedInternals>
```

Each check is a conditional type that either passes through or produces an error message type.

## Phantom Type Pattern

The GraphBuilder uses phantom types to track graph state without runtime overhead:

```typescript
class GraphBuilder<TInternals extends BuilderInternals> {
  // TInternals is never instantiated at runtime
  // It only exists to carry type information

  // Phantom type accessors for IDE inspection
  declare readonly $provides: GetProvides<TInternals>;
  declare readonly $requires: GetRequires<TInternals>;
}
```

### BuilderInternals Structure

```typescript
type BuilderInternals = {
  depGraph: Record<string, unknown>; // Port dependencies
  lifetimeMap: Record<string, Lifetime>; // Port lifetimes
  provides: Port<unknown, string>; // Union of provided ports
  requires: Port<unknown, string>; // Union of required ports
  asyncPorts: Port<unknown, string>; // Union of async ports
  maxDepth: number; // Depth limit for cycle detection
};
```

## Core Type Utilities

### `[T] extends [never]` Pattern

The standard way to check if a type is `never`:

```typescript
// WRONG: T extends never doesn't work as expected
type Bad<T> = T extends never ? true : false;
type Test1 = Bad<never>; // never (not true!)

// CORRECT: Wrap in tuple to prevent distribution
type Good<T> = [T] extends [never] ? true : false;
type Test2 = Good<never>; // true
```

Used throughout the codebase for checking empty unions.

### Exclude/Extract Pattern

```typescript
// Remove satisfied dependencies
type UnsatisfiedDependencies<TProvides, TRequires> = Exclude<TRequires, TProvides>;

// Find duplicate ports
type OverlappingPorts<A, B> = Extract<A, B>;
```

### Distributive Conditional Types

When `T` is a union, `T extends U ? X : Y` distributes over each union member:

```typescript
type ExtractPortNames<T> = T extends Port<unknown, infer Name> ? Name : never;
// If T = PortA | PortB, this becomes:
// (PortA extends Port ? "A" : never) | (PortB extends Port ? "B" : never)
// = "A" | "B"
```

## Depth-Limited Recursion

To prevent TypeScript from hitting instantiation limits, recursive types use depth tracking:

```typescript
type Depth = number;
type DefaultMaxDepth = 50;

type IncrementDepth<D extends Depth> =
  D extends 0 ? 1 :
  D extends 1 ? 2 :
  // ... up to max
  D extends 50 ? "exceeded" : never;

type IsReachable<
  TFrom extends string,
  TTo extends string,
  TGraph,
  D extends Depth = DefaultMaxDepth
> =
  IncrementDepth<D> extends "exceeded"
    ? false  // Bail out to prevent infinite recursion
    : // ... actual reachability check
```

## Error Message Types

Template literal types create readable compile-time error messages:

```typescript
type DuplicateErrorMessage<DuplicatePort> =
  `ERROR[HEX001]: Duplicate adapter for '${InferPortName<DuplicatePort>}'...`;
```

When this type appears in an error, the IDE shows the interpolated string:

```
Type 'string' is not assignable to type
  'ERROR[HEX001]: Duplicate adapter for 'Logger'...'
```

## Debugging Type-Level Code

### Using DebugProvideValidation

```typescript
import type { DebugProvideValidation } from "@hex-di/graph/internal";

// Wrap a provide operation to see intermediate results
type Debug = DebugProvideValidation<typeof builder, typeof adapter>;
// Hover over Debug to see:
// {
//   cycleCheck: boolean;
//   captiveCheck: Port | never;
//   duplicateCheck: Port | never;
//   wouldCreateCycle: boolean;
//   // ...
// }
```

### Type Extraction Helpers

```typescript
// See what ports are provided
type Provided = (typeof builder)["$provides"];

// See what's still required
type Required = (typeof builder)["$requires"];

// See the dependency graph
type DepGraph = (typeof builder)["$depGraph"];
```

### Common Type Error Patterns

| Error Pattern                                                 | Likely Cause                                  |
| ------------------------------------------------------------- | --------------------------------------------- |
| `Type 'string' is not assignable to type 'GraphBuilder<...>'` | Validation failed, check error message string |
| `Type '{ ... }' is not assignable to type 'never'`            | Type constraint impossible to satisfy         |
| `Type instantiation is excessively deep`                      | Recursive type hit depth limit                |
| `Type produces a tuple type that is too large`                | Too many adapters in single operation         |

## Key Files Reference

| Purpose                 | File                                          |
| ----------------------- | --------------------------------------------- |
| Base type utilities     | `types/type-utilities.ts`                     |
| Dependency satisfaction | `validation/types/dependency-satisfaction.ts` |
| Cycle detection         | `validation/types/cycle/detection.ts`         |
| Captive detection       | `validation/types/captive/detection.ts`       |
| Error messages          | `validation/types/error-messages.ts`          |
| Builder state           | `builder/types/internals.ts`                  |
| Provide result          | `builder/types/provide-sync-result.ts`        |
| Debug utilities         | `builder/types/debug-types.ts`                |

## Performance Considerations

### Type Instantiation Budget

TypeScript has limits on type instantiation depth (~50) and breadth. The codebase manages this by:

1. **Depth tracking**: Explicit `Depth` parameter that bails out when exceeded
2. **Early termination**: Return early on first error found
3. **Lazy evaluation**: Use conditional types to defer computation

### Avoiding Exponential Blowup

```typescript
// BAD: Creates 2^N types for N union members
type Bad<T> = T extends unknown ? SomeComputation<T> | OtherComputation<T> : never;

// GOOD: Process one at a time
type Good<T, Acc = never> = [T] extends [never]
  ? Acc
  : Good<Exclude<T, First<T>>, Acc | SomeComputation<First<T>>>;
```

## Testing Type-Level Code

Type tests use `vitest`'s `expectTypeOf`:

```typescript
import { expectTypeOf } from "vitest";

// Assert exact type equality
expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>();

// Assert type compatibility
expectTypeOf<ActualType>().toMatchTypeOf<ExpectedType>();

// Assert type is never (empty union)
expectTypeOf<ActualType>().toBeNever();

// Assert type is string (for error messages)
expectTypeOf(result).toBeString();
```
