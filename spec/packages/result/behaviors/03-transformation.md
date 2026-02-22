# 03 — Transformation

Methods that transform the contained value or error without extracting it from the `Result` wrapper.

## BEH-03-001: map(f)

Applies `f` to the `Ok` value. Has no effect on `Err`.

```ts
// On Ok<T, E>:
map<U>(f: (value: T) => U): Ok<U, E>

// On Err<T, E>:
map<U>(f: (value: T) => U): Err<U, E>
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `ok(f(value))` |
| Err     | Returns `self` (unchanged) |

**Functor law**: `map` preserves identity and composition.

## BEH-03-002: mapErr(f)

Applies `f` to the `Err` error. Has no effect on `Ok`.

```ts
// On Ok<T, E>:
mapErr<F>(f: (error: E) => F): Ok<T, F>

// On Err<T, E>:
mapErr<F>(f: (error: E) => F): Err<T, F>
```

| Variant | Behavior              |
| ------- | --------------------- |
| Ok      | Returns `self` (unchanged) |
| Err     | Returns `err(f(error))` |

## BEH-03-003: mapBoth(onOk, onErr)

Applies the appropriate function based on the variant. Transforms both branches in a single call.

```ts
// On Ok<T, E>:
mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Ok<U, F>

// On Err<T, E>:
mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Err<U, F>
```

| Variant | Behavior              |
| ------- | --------------------- |
| Ok      | Returns `ok(onOk(value))` |
| Err     | Returns `err(onErr(error))` |

## BEH-03-004: flatten()

Unwraps a nested `Result<Result<U, E2>, E>` into `Result<U, E | E2>`.

```ts
// On Ok<Result<U, E2>, E>:
flatten<U, E2>(this: Ok<Result<U, E2>, E>): Result<U, E | E2>

// On Err<Result<U, E2>, E>:
flatten<U, E2>(this: Err<Result<U, E2>, E>): Err<U, E>
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `this.value` (the inner `Result`) |
| Err     | Returns `self` (unchanged) |

**Note**: Uses TypeScript's `this` parameter for type narrowing. Only callable when the `Ok` value is itself a `Result`.

## BEH-03-005: flip()

Swaps the `Ok` and `Err` variants.

```ts
// On Ok<T, E>:
flip(): Err<E, T>

// On Err<T, E>:
flip(): Ok<E, T>
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `err(value)` |
| Err     | Returns `ok(error)` |

## BEH-03-006: andThen(f)

Monadic bind. Applies `f` to the `Ok` value. `f` returns a new `Result`, which is returned directly (no double-wrapping).

```ts
// On Ok<T, E>:
andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>

// On Err<T, E>:
andThen<U, F>(f: (value: T) => Result<U, F>): Err<U, E>
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `f(value)` |
| Err     | Returns `self` (unchanged) |

**Error type accumulation**: The return type is `Result<U, E | F>`, accumulating both the original error type and the new error type from `f`.

## BEH-03-007: orElse(f)

Recovery operation. Applies `f` to the `Err` error. `f` returns a new `Result`, enabling error recovery.

```ts
// On Ok<T, E>:
orElse<U, F>(f: (error: E) => Result<U, F>): Ok<T, E>

// On Err<T, E>:
orElse<U, F>(f: (error: E) => Result<U, F>): Result<T | U, F>
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `self` (unchanged) |
| Err     | Returns `f(error)` |

## BEH-03-008: andTee(f)

Side effect on `Ok`. Calls `f` with the value but returns the original `Result` unchanged. Exceptions thrown by `f` are caught and suppressed.

```ts
// On Ok<T, E>:
andTee(f: (value: T) => void): Ok<T, E>

// On Err<T, E>:
andTee(f: (value: T) => void): Err<T, E>
```

| Variant | Behavior                                        |
| ------- | ----------------------------------------------- |
| Ok      | Calls `f(value)` inside try/catch; returns `self` |
| Err     | Returns `self` (f is not called)                |

**Error swallowing**: See [INV-5](../invariants.md#inv-5-error-suppression-in-tee-operations) and [ADR-006](../decisions/006-error-swallowing-in-tee.md).

## BEH-03-009: orTee(f)

Side effect on `Err`. Calls `f` with the error but returns the original `Result` unchanged. Exceptions thrown by `f` are caught and suppressed.

```ts
// On Ok<T, E>:
orTee(f: (error: E) => void): Ok<T, E>

// On Err<T, E>:
orTee(f: (error: E) => void): Err<T, E>
```

| Variant | Behavior                                         |
| ------- | ------------------------------------------------ |
| Ok      | Returns `self` (f is not called)                 |
| Err     | Calls `f(error)` inside try/catch; returns `self` |

**Error swallowing**: See [INV-5](../invariants.md#inv-5-error-suppression-in-tee-operations) and [ADR-006](../decisions/006-error-swallowing-in-tee.md).

## BEH-03-010: andThrough(f)

Side effect with error propagation. Calls `f` with the value. If `f` returns an `Err`, that error propagates. If `f` returns `Ok`, the original `Result` is returned (the `Ok` value from `f` is discarded).

```ts
// On Ok<T, E>:
andThrough<F>(f: (value: T) => Result<unknown, F>): Result<T, E | F>

// On Err<T, E>:
andThrough<F>(f: (value: T) => Result<unknown, F>): Err<T, E>
```

| Variant | Behavior                                                        |
| ------- | --------------------------------------------------------------- |
| Ok      | Calls `f(value)`: if Err, returns `err(f_result.error)`; if Ok, returns `self` |
| Err     | Returns `self` (f is not called)                                |

**Difference from andTee**: `andThrough` propagates errors from `f`, while `andTee` suppresses them. Use `andThrough` for validation side effects where failure should abort the pipeline.

## BEH-03-011: inspect(f)

Observation without transformation. Calls `f` with the `Ok` value for side effects. Returns `self` unchanged. Does **not** catch exceptions from `f`.

```ts
// On Ok<T, E>:
inspect(f: (value: T) => void): Ok<T, E>

// On Err<T, E>:
inspect(f: (value: T) => void): Err<T, E>
```

| Variant | Behavior                     |
| ------- | ---------------------------- |
| Ok      | Calls `f(value)`; returns `self` |
| Err     | Returns `self` (f is not called) |

**Difference from andTee**: `inspect` does not catch exceptions. If `f` throws, the exception propagates.

## BEH-03-012: inspectErr(f)

Observation without transformation. Calls `f` with the `Err` error for side effects. Returns `self` unchanged. Does **not** catch exceptions from `f`.

```ts
// On Ok<T, E>:
inspectErr(f: (error: E) => void): Ok<T, E>

// On Err<T, E>:
inspectErr(f: (error: E) => void): Err<T, E>
```

| Variant | Behavior                      |
| ------- | ----------------------------- |
| Ok      | Returns `self` (f is not called) |
| Err     | Calls `f(error)`; returns `self` |

## BEH-03-013: and(other)

Returns `other` if the result is `Ok`, otherwise returns `self` (the `Err`). Rust: `Result::and`.

```ts
// On Ok<T, E>:
and<U, F>(other: Result<U, F>): Result<U, E | F>

// On Err<T, E>:
and<U, F>(other: Result<U, F>): Err<U, E>
```

| Variant | Behavior              |
| ------- | --------------------- |
| Ok      | Returns `other`       |
| Err     | Returns `self` (other is ignored) |

**Difference from andThen**: `and` does not compute `other` from `value` — it is a pre-computed alternative.

## BEH-03-014: or(other)

Returns `self` if `Ok`, otherwise returns `other`. Rust: `Result::or`.

```ts
// On Ok<T, E>:
or<U, F>(other: Result<U, F>): Ok<T, E>

// On Err<T, E>:
or<U, F>(other: Result<U, F>): Result<T | U, F>
```

| Variant | Behavior              |
| ------- | --------------------- |
| Ok      | Returns `self`        |
| Err     | Returns `other`       |

**Difference from orElse**: `or` does not compute `other` from `error` — it is a pre-computed fallback.

## BEH-03-015: mapOr(default, f)

Maps the `Ok` value with `f`, or returns `default` if `Err`. Combines `map` + `unwrapOr` in one call.

```ts
// On Ok<T, E>:
mapOr<U>(defaultValue: U, f: (value: T) => U): U

// On Err<T, E>:
mapOr<U>(defaultValue: U, f: (value: T) => U): U
```

| Variant | Behavior                |
| ------- | ----------------------- |
| Ok      | Returns `f(value)`      |
| Err     | Returns `defaultValue`  |

**Note**: The default is eagerly evaluated. Use `mapOrElse` for lazy default computation.

## BEH-03-016: mapOrElse(defaultF, f)

Maps the `Ok` value with `f`, or computes a default from the error with `defaultF`. Combines `map` + `unwrapOrElse` in one call.

```ts
// On Ok<T, E>:
mapOrElse<U>(defaultF: (error: E) => U, f: (value: T) => U): U

// On Err<T, E>:
mapOrElse<U>(defaultF: (error: E) => U, f: (value: T) => U): U
```

| Variant | Behavior                |
| ------- | ----------------------- |
| Ok      | Returns `f(value)`      |
| Err     | Returns `defaultF(error)` |

## BEH-03-017: contains(value)

Returns `true` if the result is `Ok` and the contained value equals `value` (via `===`).

```ts
// On Ok<T, E>:
contains(value: T): boolean    // returns this.value === value

// On Err<T, E>:
contains(value: T): boolean    // returns false
```

| Variant | Behavior                    |
| ------- | --------------------------- |
| Ok      | Returns `this.value === value` |
| Err     | Returns `false`             |

**Note**: Uses strict equality (`===`). For deep equality, use `isOkAnd(v => deepEqual(v, target))`.

## BEH-03-018: containsErr(error)

Returns `true` if the result is `Err` and the contained error equals `error` (via `===`).

```ts
// On Ok<T, E>:
containsErr(error: E): boolean    // returns false

// On Err<T, E>:
containsErr(error: E): boolean    // returns this.error === error
```

| Variant | Behavior                      |
| ------- | ----------------------------- |
| Ok      | Returns `false`               |
| Err     | Returns `this.error === error` |

## BEH-03-019: toOption()

Converts a `Result` to an `Option`, discarding the error.

```ts
// On Ok<T, E>:
toOption(): Some<T>

// On Err<T, E>:
toOption(): None
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `some(value)` |
| Err     | Returns `none()`   |

See [09-option.md](09-option.md) for the full Option specification.

## BEH-03-020: toOptionErr()

Converts a `Result` to an `Option` of the error, discarding the value.

```ts
// On Ok<T, E>:
toOptionErr(): None

// On Err<T, E>:
toOptionErr(): Some<E>
```

| Variant | Behavior            |
| ------- | ------------------- |
| Ok      | Returns `none()`    |
| Err     | Returns `some(error)` |

## BEH-03-021: transpose()

Converts `Result<Option<T>, E>` to `Option<Result<T, E>>`.

```ts
// On Ok<Option<T>, E>:
transpose<U>(this: Ok<Option<U>, E>): Option<Result<U, E>>

// On Err<T, E>:
transpose(): Err<never, E>
```

| Input | Output |
|-------|--------|
| `Ok(Some(value))` | `Some(Ok(value))` |
| `Ok(None)` | `None` |
| `Err(error)` | `Some(Err(error))` |

This is the inverse of `Option.transpose()`. See [09-option.md](09-option.md#bridge-transpose).
