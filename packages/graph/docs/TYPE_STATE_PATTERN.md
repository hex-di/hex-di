# Type-State Builder Pattern

This document explains the type-state pattern used in `@hex-di/graph` and why certain implementation techniques are necessary for type safety.

## Overview

`GraphBuilder` implements the **Type-State Pattern** - a technique where an object's type changes with each method call, encoding the object's state in its type. This enables compile-time validation of dependency graphs while keeping the runtime implementation trivial.

## Phantom Type Parameters

GraphBuilder tracks five type parameters that exist only at the type level:

```typescript
class GraphBuilder<
  TProvides,      // Union of ports with adapters
  TRequires,      // Union of ports required by adapters
  TAsyncPorts,    // Union of async ports
  TOverrides,     // Union of override ports
  TInternalState  // Dependency graph + lifetime map + parent info
>
```

These parameters have no runtime representation. At runtime, GraphBuilder is just a wrapper around a readonly array of adapters.

## How Type-State Works

Each `.provide()` call returns a **new type** of GraphBuilder:

```typescript
// Initial: GraphBuilder<never, never, never, never, ...>
const b1 = GraphBuilder.create();

// After providing Logger: GraphBuilder<LoggerPort, never, never, never, ...>
const b2 = b1.provide(LoggerAdapter);

// After providing Database: GraphBuilder<LoggerPort | DatabasePort, LoggerPort, never, never, ...>
const b3 = b2.provide(DatabaseAdapter); // Database requires Logger
```

The return type of `provide()` is computed by complex conditional types in `ProvideResult<...>` that:

1. Check for duplicate adapters
2. Check for circular dependencies
3. Check for captive dependencies
4. Update the provides/requires unions
5. Update the dependency graph and lifetime map

## Implementation Techniques

### Method Signatures with Union Returns

Methods use overload signatures where the return type is either a `GraphBuilder` or an error string:

```typescript
provide<A extends AdapterAny>(
  adapter: A
): ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>;
provide<A extends AdapterAny>(
  adapter: A
): GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals> | string {
  const state = addAdapter(this, adapter);
  return GraphBuilder.fromState(state);
}
```

The implementation signature returns the union type because:

1. **TypeScript requires compatible overloads**: The implementation must return something assignable to all overload return types
2. **Runtime always returns GraphBuilder**: The actual returned value is always a GraphBuilder instance
3. **Type-level validation happens in ProvideResult**: The specific overload signature computes the exact return type

### Why This Is Sound

This pattern is safe because:

1. **Type-level validation is exhaustive**: `ProvideResult` computes the exact return type based on all builder state
2. **Error types are string literals**: When validation fails, the return type becomes a descriptive error string
3. **Assignment to error strings fails**: You cannot call `.provide()` on a string, so chaining stops at errors
4. **Tests verify soundness**: Type-level tests (`*.test-d.ts`) verify all validation paths

### Runtime vs Type Safety

| Concern             | Handled By                              |
| ------------------- | --------------------------------------- |
| Duplicate detection | Type-level in `ProvideResult`           |
| Cycle detection     | Type-level in `WouldCreateCycle`        |
| Captive dependency  | Type-level in `IsCaptiveDependency`     |
| Missing dependency  | Type-level in `UnsatisfiedDependencies` |
| Runtime validation  | `build()` throws for deep cycles        |

## Comparison to Effect-TS

This pattern follows the same approach as Effect-TS's `Layer` type, which uses similar phantom type parameters for compile-time dependency tracking. From Effect's source:

```typescript
// Effect-TS Layer uses the same type-state pattern
export interface Layer<out ROut, out E = never, out RIn = never> {
  // ...methods that return new Layer types
}
```

## Alternative Approaches

### Why Not Brand Types?

Branded types can enforce nominal typing but cannot track evolving state:

```typescript
// Brands are static - they can't change based on method calls
type GraphBuilder<T> = { readonly __brand: T };
```

### Why Not Builder Interfaces?

Interface-based builders lose type information across method calls:

```typescript
// Generic interfaces don't preserve exact types through chaining
interface Builder<T> {
  add(item: Item): Builder<T | Item>; // Loses specificity
}
```

### Why Not Assertion Functions?

Assertion functions work at runtime, not compile-time:

```typescript
// This validates at runtime, not compile time
function assertComplete(builder: GraphBuilder): asserts builder is CompleteGraph {
  if (!builder.isComplete()) throw new Error();
}
```

## Cast Locations

The following locations use implementation signatures that return union types:

### `src/graph/builder.ts`

All builder methods use this pattern:

- `provide()` - Line 380-388
- `provideFirstError()` - Line 395-403
- `provideUnchecked()` - Line 410-418
- `provideAsync()` - Line 425-433
- `provideMany()` - Line 440-446
- `override()` - Line 453-461
- `merge()` - Line 472-503
- `mergeWith()` - Line 510-545
- `build()` - Line 618-623

### `src/adapter/factory.ts`

This file avoids casts entirely by using:

1. **Literal helper function**: `literal<const T>(value: T): T` preserves literal types
2. **Frozen objects**: TypeScript infers literal types for readonly properties
3. **Overload signatures**: Separate signatures for `clonable?: undefined` vs `clonable: TClonable`

## Soundness Testing

Type-level soundness is verified by tests in:

| Test File                             | Validates              |
| ------------------------------------- | ---------------------- |
| `tests/soundness.test-d.ts`           | Core type soundness    |
| `tests/cast-soundness.test-d.ts`      | Cast safety            |
| `tests/circular-dependency.test-d.ts` | Cycle detection        |
| `tests/captive-dependency.test-d.ts`  | Lifetime validation    |
| `tests/duplicate-detection.test-d.ts` | Duplicate detection    |
| `tests/error-messages.test-d.ts`      | Error message accuracy |

These tests use `expectTypeOf` to verify that:

1. Valid graphs produce the expected `GraphBuilder` types
2. Invalid graphs produce the expected error string types
3. Error strings contain accurate information

## Further Reading

- [Type-State Pattern (Wikipedia)](https://en.wikipedia.org/wiki/Typestate_analysis)
- [Effect-TS Layer documentation](https://effect.website/docs/guides/configuration)
- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Phantom Types in TypeScript](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
