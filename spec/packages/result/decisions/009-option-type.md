# ADR-009: Option Type

## Status

Accepted

## Context

`Result<T, E>` models operations that can fail with a typed error. However, many operations simply model presence or absence of a value — there is no meaningful error. Common patterns:

```ts
// Without Option: awkward error types
const found: Result<User, null> = findUser(id);

// Without Option: nullable return defeats the purpose of Result
const name: string | null = user.middleName;
```

Rust, Haskell, Scala, Kotlin Arrow, and `fp-ts` all provide `Option<T>` (or `Maybe<T>`) alongside `Result`/`Either`. The absence of `Option` in `@hex-di/result` forces consumers to use `Result<T, null>` or nullable types, both of which are suboptimal.

The `Option` type also enables `transpose()` — converting between `Option<Result<T,E>>` and `Result<Option<T>,E>` — which is a common pattern in Rust.

## Decision

Add `Option<T> = Some<T> | None` as a discriminated union with:

1. **`OPTION_BRAND`** unique symbol for brand-based `isOption()` checking
2. **Frozen instances** — `some()` and `none()` return `Object.freeze()`d instances
3. **Full method API** mirroring the `Result` pattern (map, andThen, match, etc.)
4. **Bridge methods** for Result↔Option conversion:
   - `toResult(onNone)` on Option: converts `Some<T>` → `Ok<T, E>`, `None` → `Err<E>`
   - `toOption()` on Result: converts `Ok<T, E>` → `Some<T>`, `Err<T, E>` → `None`
   - `transpose()` for `Option<Result<T,E>> → Result<Option<T>, E>`

### Type definitions

```ts
type Option<T> = Some<T> | None;

interface Some<T> {
  readonly _tag: "Some";
  readonly value: T;
  readonly [OPTION_BRAND]: true;
  // ... methods
}

interface None {
  readonly _tag: "None";
  readonly [OPTION_BRAND]: true;
  // ... methods
}
```

### Import path

```ts
import { some, none, isOption, Option } from "@hex-di/result/option";
```

## Consequences

**Positive**:
- Completes the algebraic data type story (Result for errors, Option for presence)
- Enables `transpose()` which is essential for working with `Option<Result>` and `Result<Option>` combinations
- `fromNullable()` now has a natural Option-based counterpart: `Option.fromNullable()`
- Consistent brand validation and immutability with `Result`
- Raises API Completeness from 9→10

**Negative**:
- Increases API surface area and documentation burden
- Consumers who only need `Result` pay no cost (separate subpath export)
- Must maintain consistency between `Option` and `Result` method sets

**New invariants**:
- [INV-10](../invariants.md#inv-10-frozen-option-instances) — `some()` and `none()` return frozen instances
- [INV-11](../invariants.md#inv-11-option-brand-prevents-forgery) — Only `some()`/`none()` carry `OPTION_BRAND`
