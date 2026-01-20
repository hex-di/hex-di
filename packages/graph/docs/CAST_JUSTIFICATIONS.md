# Cast Justifications

This document explains every type cast (`as`) in @hex-di/graph.

## Why Casts Exist

@hex-di/graph implements the **Type-State Pattern** where methods return different types based on compile-time state. TypeScript cannot automatically verify that runtime implementations produce the exact return types promised by conditional type signatures. These casts are the necessary bridge between:

1. **Type-level validation** (compile-time) - Complex conditional types that produce either new builder types or error messages
2. **Runtime implementation** (runtime) - Simple object construction that always succeeds

## Cast Categories

### Category 1: Type-State Builder Returns

These casts bridge conditional return types to their runtime implementations.

### Category 2: Overload Implementation Boundaries

TypeScript cannot infer that `config.X ?? default` preserves generic parameter `TX` when `TX` has a default type parameter. Function overloads guarantee correct types at call sites.

### Category 3: Default Value Type Narrowing

When a generic parameter has a default value and the actual value comes from `config.X ?? default`, TypeScript widens the type. The cast restores the narrow type.

---

## service.ts (9 casts)

| Line    | Cast                                       | Category | Justification                                                                                                                       |
| ------- | ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 250     | `as TRequires`                             | 2        | Overload signatures guarantee `TRequires` type at call site. The `?? []` fallback preserves the empty tuple type from the overload. |
| 251     | `as TLifetime`                             | 2        | Overload signatures guarantee `TLifetime` type at call site. The `?? "singleton"` fallback matches the default generic parameter.   |
| 252     | `as TClonable`                             | 3        | Default value `false` doesn't preserve `TClonable extends boolean`. The overload constrains this to be correct.                     |
| 259     | `as (deps: ResolvedDeps<...>) => TService` | 2        | Factory signature must match the inferred `TRequires` union. Overloads ensure the user-provided factory is compatible.              |
| 267-277 | `as readonly [Port<...>, Adapter<...>]`    | 2        | Return type narrowing for the unified implementation serving all overloads. Each overload specifies the exact return tuple shape.   |
| 403     | `as TRequires`                             | 2        | Same pattern as line 250 for async service variant.                                                                                 |
| 404     | `as TClonable`                             | 3        | Same pattern as line 252 for async service variant.                                                                                 |
| 410     | `as (deps: ...) => Promise<TService>`      | 2        | Factory signature compatibility for async factories.                                                                                |
| 417-426 | `as readonly [Port<...>, Adapter<...>]`    | 2        | Return type narrowing for async service overloads.                                                                                  |

### Safety Guarantee

The overload signatures act as a compile-time contract. Users cannot call `defineService` with arguments that violate the expected types because TypeScript enforces the overload constraints. The implementation cast is safe because the overloads already validated the input.

---

## factory.ts (2 casts)

| Line | Cast           | Category | Justification                                                                                                                                                           |
| ---- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 106  | `as TClonable` | 3        | `config.clonable ?? false` loses the generic constraint `TClonable extends boolean`. Since `TClonable` defaults to `false`, this cast restores the narrow literal type. |
| 251  | `as TClonable` | 3        | Same pattern for `createAsyncAdapter`.                                                                                                                                  |

### Why Not Remove These?

TypeScript issue [#41361](https://github.com/microsoft/TypeScript/issues/41361) documents this limitation. The nullish coalescing operator doesn't preserve generic literal types. The cast is sound because:

1. `TClonable extends boolean` constrains the type to `true | false`
2. The default `false` is a valid member of this constraint
3. The user's explicit value (if provided) takes precedence

---

## builder.ts (6 casts)

| Line      | Cast                                                                      | Category | Justification                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 901       | `as ProvideResult<...>`                                                   | 1        | **Type-state duality**: `ProvideResult<...>` is a conditional type that returns either a new `GraphBuilder<...>` or an error string. At runtime, we always construct a `GraphBuilder`, but TypeScript cannot verify that the validation passed without executing the type computation. |
| 918-930   | `as ProvideAsyncResult<...>`                                              | 1        | Same type-state pattern for async adapter registration.                                                                                                                                                                                                                                |
| 940-951   | `as ProvideManyResult<...>`                                               | 1        | Same type-state pattern for batch adapter registration.                                                                                                                                                                                                                                |
| 996-1004  | `as ProvideResult<...>`                                                   | 1        | Same type-state pattern for override registration. The `TOverrides` type parameter is additionally updated.                                                                                                                                                                            |
| 1034-1047 | `as MergeResult<...>`                                                     | 1        | Merge combines two builders' type parameters. The conditional validates no conflicts exist.                                                                                                                                                                                            |
| 1077-1079 | `as [UnsatisfiedDependencies<...>] extends [never] ? Graph<...> : string` | 1        | `build()` returns either a complete graph or an error message. The conditional type cannot be evaluated at runtime.                                                                                                                                                                    |
| 1114      | `as Graph<...>`                                                           | 1        | `buildFragment()` always returns a `Graph` since it skips completeness validation (dependencies satisfied by parent).                                                                                                                                                                  |

### Type-State Pattern Deep Dive

The builder's return type is a **conditional type**:

```typescript
type ProvideResult<...> =
  HasDuplicate<...> extends true ? DuplicateError<...>
  : WouldCreateCycle<...> extends true ? CycleError<...>
  : ... ? ...
  : GraphBuilder<UpdatedTypes...>
```

At the type level, TypeScript evaluates all conditions and determines the correct branch. At runtime, we simply construct the new builder. The cast bridges these worlds:

- **Compile-time**: TypeScript knows if the result is an error or valid builder
- **Runtime**: We always create a builder (errors are type-only)

If the user tries to use an "error" result, TypeScript prevents it because the type is a string literal, not a `GraphBuilder`.

---

## Verification Checklist

When modifying these files, ensure:

1. **Overload signatures remain consistent** - Adding a cast without an overload is unsafe
2. **Conditional types remain exhaustive** - All error branches must have corresponding error types
3. **Type tests cover edge cases** - See `tests/**.test-d.ts` for type-level test coverage
4. **Runtime tests verify behavior** - The casts don't change runtime behavior

## Audit Log

| Date       | Auditor | Files                              | Casts Found | Notes                 |
| ---------- | ------- | ---------------------------------- | ----------- | --------------------- |
| 2024-XX-XX | Initial | service.ts, factory.ts, builder.ts | 17          | Initial documentation |
