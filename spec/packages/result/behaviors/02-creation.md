# 02 — Creation

Functions that create `Result` or `ResultAsync` values from various input types.

## BEH-02-001: fromThrowable(fn, mapErr)

Wraps a function that might throw into a function that returns `Result`. Has two overloads based on the arity of `fn`.

### Overload 1: Zero-arg (immediate execution)

```ts
function fromThrowable<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>
```

Executes `fn()` immediately. If it returns, wraps the return value in `Ok`. If it throws, catches the error, passes it through `mapErr`, and wraps the result in `Err`.

**Dispatch rule**: Selected when `fn.length === 0`.

### Overload 2: Multi-arg (wrapping)

```ts
function fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => T,
  mapErr: (error: unknown) => E
): (...args: A) => Result<T, E>
```

Returns a new function with the same parameter types as `fn`. When called, the wrapper executes `fn(...args)` inside a try/catch, returning `Ok` on success and `Err(mapErr(thrown))` on failure.

**Dispatch rule**: Selected when `fn.length > 0`.

**Note**: The dispatch is based on `Function.length` (the number of declared formal parameters). A zero-arg function with default parameters or rest parameters may have `length === 0` and trigger immediate execution.

## BEH-02-002: tryCatch(fn, mapErr)

```ts
function tryCatch<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>
```

Always executes `fn()` immediately. If it returns, wraps the value in `Ok`. If it throws, catches the error and returns `Err(mapErr(error))`.

**Difference from fromThrowable**: `tryCatch` always executes immediately and only accepts zero-arg functions. It has no wrapping overload. Use `tryCatch` when you want clear "execute now" semantics; use `fromThrowable` when you may want to wrap a function for repeated use.

## BEH-02-003: fromNullable(value, onNullable)

```ts
function fromNullable<T, E>(
  value: T | null | undefined,
  onNullable: () => E
): Result<T, E>
```

Converts a nullable value to a `Result`.

| Input                      | Output              |
| -------------------------- | ------------------- |
| `value === null`           | `err(onNullable())` |
| `value === undefined`      | `err(onNullable())` |
| Any other value            | `ok(value)`         |

The `onNullable` callback is only invoked when the value is `null` or `undefined`.

## BEH-02-004: fromPredicate(value, predicate, onFalse)

Tests a value against a predicate. If the predicate returns `true`, wraps the value in `Ok`. Otherwise wraps `onFalse(value)` in `Err`.

### Overload 1: Type guard predicate (narrows Ok type)

```ts
function fromPredicate<T, U extends T, E>(
  value: T,
  predicate: (value: T) => value is U,
  onFalse: (value: T) => E
): Result<U, E>
```

When the predicate is a type guard (`value is U`), the `Ok` type is narrowed to `U`.

### Overload 2: Boolean predicate

```ts
function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E>
```

When the predicate is a plain boolean function, the `Ok` type remains `T`.

## BEH-02-005: fromPromise(promise, mapErr)

```ts
function fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E
): ResultAsync<T, E>
```

Wraps a `Promise` that might reject into a `ResultAsync`. If the promise resolves, the `ResultAsync` contains `Ok(value)`. If it rejects, the rejection reason is passed through `mapErr` and the `ResultAsync` contains `Err(mapErr(reason))`.

Delegates to `ResultAsync.fromPromise()`.

## BEH-02-006: fromSafePromise(promise)

```ts
function fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never>
```

Wraps a `Promise` that is known to never reject. The `ResultAsync` will always contain `Ok(value)`. The error type is `never`.

Delegates to `ResultAsync.fromSafePromise()`.

**Warning**: If the promise does reject despite the caller's claim, the rejection will propagate as an unhandled promise rejection. Use `fromPromise` if rejection is possible.

## BEH-02-007: fromAsyncThrowable(fn, mapErr)

```ts
function fromAsyncThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E>
```

Wraps an async function that might throw/reject into one that returns `ResultAsync`. Returns a new function with the same parameter types. When called, it invokes `fn(...args)` and wraps the resulting promise with `fromPromise`.

Delegates to `ResultAsync.fromThrowable()`.
