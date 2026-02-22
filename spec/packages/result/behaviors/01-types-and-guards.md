# 01 — Types and Guards

Core type definitions, brand symbol, and type guard functions.

## BEH-01-001: RESULT_BRAND

```ts
const RESULT_BRAND: unique symbol = Symbol("Result");
```

A unique symbol attached to every `Result` instance. Its presence is the sole criterion for `isResult()`. Because it is a unique symbol, no external code can forge it.

**Exported from**: `core/brand.ts`

## BEH-01-002: RESULT_ASYNC_BRAND

```ts
const RESULT_ASYNC_BRAND: unique symbol = Symbol("ResultAsync");
```

A unique symbol attached to every `ResultAsync` instance. Its presence is the sole criterion for `isResultAsync()`. Provides consistent brand-based checking across both sync and async Result types.

**Exported from**: `core/brand.ts`

See [ADR-008](../decisions/008-result-async-brand.md) and [INV-9](../invariants.md#inv-9-resultasync-brand-identity).

## BEH-01-003: OPTION_BRAND

```ts
const OPTION_BRAND: unique symbol = Symbol("Option");
```

A unique symbol attached to every `Option` instance. Its presence is the sole criterion for `isOption()`.

**Exported from**: `option/brand.ts`

See [09-option.md](09-option.md) and [ADR-009](../decisions/009-option-type.md).

## BEH-01-004: Ok\<T, E\>

The success variant of `Result`. Interface definition:

```ts
interface Ok<T, E> {
  readonly _tag: "Ok";
  readonly value: T;
  readonly [RESULT_BRAND]: true;

  // Type guards
  isOk(): this is Ok<T, E>;        // always returns true
  isErr(): this is Err<T, E>;      // always returns false
  isOkAnd(predicate: (value: T) => boolean): boolean;
  isErrAnd(predicate: (error: E) => boolean): boolean;  // always returns false

  // Transformations
  map<U>(f: (value: T) => U): Ok<U, E>;
  mapErr<F>(f: (error: E) => F): Ok<T, F>;
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Ok<U, F>;
  flatten<U, E2>(this: Ok<Result<U, E2>, E>): Result<U, E | E2>;
  flip(): Err<E, T>;

  // Chaining
  andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;
  orElse<U, F>(f: (error: E) => Result<U, F>): Ok<T, E>;
  andTee(f: (value: T) => void): Ok<T, E>;
  orTee(f: (error: E) => void): Ok<T, E>;
  andThrough<F>(f: (value: T) => Result<unknown, F>): Result<T, E | F>;
  inspect(f: (value: T) => void): Ok<T, E>;
  inspectErr(f: (error: E) => void): Ok<T, E>;

  // Extraction
  match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A;
  unwrapOr<U>(defaultValue: U): T;
  unwrapOrElse<U>(f: (error: E) => U): T;
  expect(message: string): T;
  expectErr(message: string): never;

  // Logical combinators
  and<U, F>(other: Result<U, F>): Result<U, E | F>;
  or<U, F>(other: Result<U, F>): Ok<T, E>;

  // Equality checks
  contains(value: T): boolean;
  containsErr(error: E): boolean;  // always returns false

  // Conversion
  toNullable(): T;
  toUndefined(): T;
  intoTuple(): [null, T];
  merge(): T;
  toOption(): Some<T>;
  toOptionErr(): None;

  // Result<Option<T>, E> bridge
  transpose<U>(this: Ok<Option<U>, E>): Option<Result<U, E>>;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Serialization
  toJSON(): { _tag: "Ok"; _schemaVersion: 1; value: T };

  // Generator protocol
  [Symbol.iterator](): Generator<never, T, unknown>;
}
```

**Phantom type parameter**: `E` has no runtime representation on `Ok`. The `ok()` factory produces `Ok<T, never>`, where `never` extends any `E`.

**Generator protocol**: The iterator returns `value` immediately (`done: true` on first `next()`). It never yields.

## BEH-01-005: Err\<T, E\>

The failure variant of `Result`. Interface definition:

```ts
interface Err<T, E> {
  readonly _tag: "Err";
  readonly error: E;
  readonly [RESULT_BRAND]: true;

  // Type guards
  isOk(): this is Ok<T, E>;        // always returns false
  isErr(): this is Err<T, E>;      // always returns true
  isOkAnd(predicate: (value: T) => boolean): boolean;  // always returns false
  isErrAnd(predicate: (error: E) => boolean): boolean;

  // Transformations
  map<U>(f: (value: T) => U): Err<U, E>;
  mapErr<F>(f: (error: E) => F): Err<T, F>;
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Err<U, F>;
  flatten<U, E2>(this: Err<Result<U, E2>, E>): Err<U, E>;
  flip(): Ok<E, T>;

  // Chaining
  andThen<U, F>(f: (value: T) => Result<U, F>): Err<U, E>;
  orElse<U, F>(f: (error: E) => Result<U, F>): Result<T | U, F>;
  andTee(f: (value: T) => void): Err<T, E>;
  orTee(f: (error: E) => void): Err<T, E>;
  andThrough<F>(f: (value: T) => Result<unknown, F>): Err<T, E>;
  inspect(f: (value: T) => void): Err<T, E>;
  inspectErr(f: (error: E) => void): Err<T, E>;

  // Extraction
  match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): B;
  unwrapOr<U>(defaultValue: U): U;
  unwrapOrElse<U>(f: (error: E) => U): U;
  expect(message: string): never;
  expectErr(message: string): E;

  // Logical combinators
  and<U, F>(other: Result<U, F>): Err<U, E>;
  or<U, F>(other: Result<U, F>): Result<T | U, F>;

  // Equality checks
  contains(value: T): boolean;    // always returns false
  containsErr(error: E): boolean;

  // Conversion
  toNullable(): null;
  toUndefined(): undefined;
  intoTuple(): [E, null];
  merge(): E;
  toOption(): None;
  toOptionErr(): Some<E>;

  // Result<Option<T>, E> bridge
  transpose(): Err<never, E>;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Serialization
  toJSON(): { _tag: "Err"; _schemaVersion: 1; error: E };

  // Generator protocol
  [Symbol.iterator](): Generator<Err<never, E>, never, unknown>;
}
```

**Phantom type parameter**: `T` has no runtime representation on `Err`. The `err()` factory produces `Err<never, E>`, where `never` extends any `T`.

**Generator protocol**: The iterator yields `self` (the `Err` instance) and then throws `"unreachable: generator continued after yield in Err"` if iteration continues past the yield.

## BEH-01-006: Result\<T, E\>

```ts
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

Discriminated union. TypeScript narrows to the correct variant after checking `_tag`, `isOk()`, or `isErr()`.

## BEH-01-007: ok(value)

```ts
function ok<T>(value: T): Ok<T, never>
```

Creates a frozen `Ok` instance with the given value. The `E` parameter defaults to `never`.

**Behavior**:
1. Constructs a plain object implementing the `Ok<T, never>` interface
2. All methods are closures capturing `value`
3. Stamps the object with `[RESULT_BRAND]: true`
4. Calls `Object.freeze()` before returning

## BEH-01-008: err(error)

```ts
function err<E>(error: E): Err<never, E>
```

Creates a frozen `Err` instance with the given error. The `T` parameter defaults to `never`.

**Behavior**:
1. Constructs a plain object implementing the `Err<never, E>` interface
2. All methods are closures capturing `error`
3. Stamps the object with `[RESULT_BRAND]: true`
4. Calls `Object.freeze()` before returning

## BEH-01-009: isResult(value)

```ts
function isResult(value: unknown): value is Result<unknown, unknown>
```

Standalone type guard using brand-based checking.

**Algorithm**:
1. If `value` is `null`, `undefined`, or not an `object` → return `false`
2. If `RESULT_BRAND in value` → return `true`
3. Otherwise → return `false`

**Note**: This is strictly stronger than structural checking. An object with `{ _tag: "Ok", value: 42 }` but without the brand symbol will return `false`.

## BEH-01-010: isResultAsync(value)

```ts
function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown>
```

Standalone type guard using brand-based checking.

**Algorithm**:
1. If `value` is `null`, `undefined`, or not an `object` → return `false`
2. If `RESULT_ASYNC_BRAND in value` → return `true`
3. Otherwise → return `false`

**Note**: Updated from structural checking to brand-based checking for consistency with `isResult()`. See [ADR-008](../decisions/008-result-async-brand.md) and [INV-9](../invariants.md#inv-9-resultasync-brand-identity).

## BEH-01-011: Instance Type Guards

### isOk() / isErr()

```ts
// On Ok<T, E>:
isOk(): this is Ok<T, E>    // returns true
isErr(): this is Err<T, E>  // returns false

// On Err<T, E>:
isOk(): this is Ok<T, E>    // returns false
isErr(): this is Err<T, E>  // returns true
```

Type predicates that narrow the `Result` to its specific variant.

### isOkAnd(predicate) / isErrAnd(predicate)

```ts
// On Ok<T, E>:
isOkAnd(predicate: (value: T) => boolean): boolean   // returns predicate(value)
isErrAnd(predicate: (error: E) => boolean): boolean   // returns false

// On Err<T, E>:
isOkAnd(predicate: (value: T) => boolean): boolean    // returns false
isErrAnd(predicate: (error: E) => boolean): boolean   // returns predicate(error)
```

Conditional type guards. `isOkAnd` returns `true` only if the result is `Ok` **and** the predicate returns `true` for the value. `isErrAnd` is the mirror for the `Err` variant.
