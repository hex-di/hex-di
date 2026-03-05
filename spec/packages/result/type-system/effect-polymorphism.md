# Effect Polymorphism — Type-Level Effect Operations

Type-level utilities for working with effects (error types) in `Result<T, E>`. These types enable generic programming over effectful computations without requiring knowledge of specific error variants.

## EffectOf<T>

Extract the effect (error) type from a `Result` or `ResultAsync` type.

```ts
type EffectOf<T> =
  T extends Result<unknown, infer E> ? E : T extends ResultAsync<unknown, infer E> ? E : never;
```

### Examples

```ts
type E1 = EffectOf<Result<User, NotFound | Timeout>>;
// NotFound | Timeout

type E2 = EffectOf<Result<User, never>>;
// never (pure computation)

type E3 = EffectOf<ResultAsync<User, DBError>>;
// DBError
```

### Design notes

- `EffectOf` is analogous to `InferErr<R>` from `type-utils.ts` but works with both sync and async result types.
- Returns `never` for non-Result types, enabling safe use in conditional types.

## PureResult<T>

A `Result` with no effects — guaranteed to be `Ok`.

```ts
type PureResult<T> = Result<T, never>;
```

### Examples

```ts
// A function that never fails
function pure(x: number): PureResult<number> {
  return ok(x * 2);
}

// PureResult is assignable to any Result<T, E>
const result: Result<number, string> = pure(5); // OK — never extends string
```

### Design notes

- `PureResult<T>` is equivalent to `Ok<T, never>` in practice. The alias communicates intent: this computation has no effects.
- A `PureResult` value can always be safely unwrapped — `unwrapOr` is unnecessary because there is no error case.
- Corresponds to the "pure" computation in effect system terminology.

## EffectfulResult<T, E>

A `Result` that may contain effects. The complement of `PureResult`.

```ts
type EffectfulResult<T, E> = [E] extends [never] ? never : Result<T, E>;
```

### Examples

```ts
type R1 = EffectfulResult<User, NotFound>;
// Result<User, NotFound>

type R2 = EffectfulResult<User, never>;
// never — this is pure, not effectful
```

### Design notes

- Uses `[E] extends [never]` (tuple wrapping) to prevent distributive conditional type behavior over union types.

## MaskEffects<R, Mask>

Remove specific effects from a Result's error type without handling them. Used for temporarily hiding effects in generic code.

```ts
type MaskEffects<R extends Result<unknown, unknown>, Mask extends TaggedError<string>> =
  R extends Result<infer T, infer E> ? Result<T, Exclude<E, Mask>> : never;
```

### Examples

```ts
type Original = Result<User, NotFound | Timeout | Forbidden>;

type Masked = MaskEffects<Original, Timeout>;
// Result<User, NotFound | Forbidden>

type FullyMasked = MaskEffects<Original, NotFound | Timeout | Forbidden>;
// Result<User, never> = PureResult<User>
```

### Design notes

- `MaskEffects` is a type-level operation only — it does not handle errors at runtime. It is used in generic code where effects are known to be handled elsewhere.
- Corresponds to "effect masking" in algebraic effect systems (see [RES-01](../../../research/RES-01-type-and-effect-systems.md)).
- Warning: Masking effects without handling them is unsafe. This utility is intended for library authors writing generic effect-polymorphic code, not application developers.

## LiftEffect<R, NewEffect>

Add an effect to a Result's error type. Used when a computation may introduce new failure modes.

```ts
type LiftEffect<R extends Result<unknown, unknown>, NewEffect extends TaggedError<string>> =
  R extends Result<infer T, infer E> ? Result<T, E | NewEffect> : never;
```

### Examples

```ts
type Original = Result<User, NotFound>;

type WithTimeout = LiftEffect<Original, Timeout>;
// Result<User, NotFound | Timeout>
```

### Design notes

- `LiftEffect` is the type-level equivalent of `andThen` introducing new errors via union.
- Effect lifting is the inverse of effect elimination (handling). Together they form the complete effect manipulation vocabulary.

## IsEffectFree<R>

Check whether a Result type has no effects (is pure).

```ts
type IsEffectFree<R extends Result<unknown, unknown>> =
  R extends Result<unknown, infer E> ? ([E] extends [never] ? true : false) : false;
```

### Examples

```ts
type Pure = IsEffectFree<Result<number, never>>;
// true

type Effectful = IsEffectFree<Result<number, Error>>;
// false
```

### Design notes

- Uses `[E] extends [never]` to correctly handle the `never` type without distributive behavior.
- Useful in conditional types for selecting between pure and effectful code paths.

## EffectUnion<Rs>

Compute the union of all effects from a tuple of Result types.

```ts
type EffectUnion<Rs extends ReadonlyArray<Result<unknown, unknown>>> = {
  [I in keyof Rs]: Rs[I] extends Result<unknown, infer E> ? E : never;
}[number];
```

### Examples

```ts
type Combined = EffectUnion<[Result<A, NotFound>, Result<B, Timeout>, Result<C, Forbidden>]>;
// NotFound | Timeout | Forbidden
```

### Design notes

- `EffectUnion` computes the complete effect profile for parallel or sequential composition of multiple Results.
- Used internally by `all()`, `allSettled()`, and other combinators to compute the combined error type.
- Cross-ref: [BEH-GR-10](../../graph/behaviors/10-effect-propagation.md) for graph-level effect propagation using this type.

## Cross-References

- **Behavior**: [BEH-15 — Effect-Based Error Handling](../behaviors/15-effect-error-handling.md) — runtime effect elimination
- **Behavior**: [BEH-17 — Higher-Order Effects](../behaviors/17-higher-order-effects.md) — handler composition
- **Behavior**: [BEH-18 — Effect Contracts](../behaviors/18-effect-contracts.md) — function-level effect declarations
- **Type System**: [type-system/error-row.md](error-row.md) — error row manipulation types
- **Research**: [RES-01](../../../research/RES-01-type-and-effect-systems.md) — Type & Effect Systems
