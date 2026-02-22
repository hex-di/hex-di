# 06 — Async

The `ResultAsync<T, E>` class wraps `Promise<Result<T, E>>` and provides method chaining for asynchronous operations.

## BEH-06-001: Class Definition

```ts
class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
  readonly [RESULT_ASYNC_BRAND] = true;
  readonly #promise: Promise<Result<T, E>>;
  private constructor(promise: Promise<Result<T, E>>);
}
```

- **Brand symbol**: Every instance carries `RESULT_ASYNC_BRAND` for brand-based `isResultAsync()` checking. See [ADR-008](../decisions/008-result-async-brand.md) and [INV-9](../invariants.md#inv-9-resultasync-brand-identity).

- **Private constructor**: `ResultAsync` can only be created via static factory methods.
- **Private `#promise`**: The internal promise is inaccessible from outside the class.
- **Invariant**: The internal promise **never rejects**. See [INV-2](../invariants.md#inv-2-internal-promise-never-rejects).

## BEH-06-002: PromiseLike Implementation

```ts
then<A = Result<T, E>, B = never>(
  onfulfilled?: ((value: Result<T, E>) => A | PromiseLike<A>) | null | undefined,
  onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null | undefined
): PromiseLike<A | B>
```

Delegates to the internal `#promise.then(...)`. This makes `ResultAsync` awaitable:

```ts
const result: Result<number, string> = await someResultAsync;
```

## BEH-06-003: Static Constructors

### ResultAsync.ok(value)

```ts
static ok<T>(value: T): ResultAsync<T, never>
```

Creates a `ResultAsync` wrapping `Promise.resolve(ok(value))`.

### ResultAsync.err(error)

```ts
static err<E>(error: E): ResultAsync<never, E>
```

Creates a `ResultAsync` wrapping `Promise.resolve(err(error))`.

### ResultAsync.fromPromise(promise, mapErr)

```ts
static fromPromise<T, E>(
  promise: Promise<T>,
  mapErr: (error: unknown) => E
): ResultAsync<T, E>
```

Wraps a `Promise<T>` that might reject. Resolution → `ok(value)`. Rejection → `err(mapErr(reason))`.

### ResultAsync.fromSafePromise(promise)

```ts
static fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never>
```

Wraps a `Promise<T>` that is guaranteed to never reject. Resolution → `ok(value)`.

### ResultAsync.fromResult(promise)

```ts
static fromResult<T, E>(promise: Promise<Result<T, E>>): ResultAsync<T, E>
```

Wraps a `Promise<Result<T, E>>` directly. Useful when an async function already returns `Result` values (e.g., sequential loops that check `_tag` and return early). The promise must never reject.

### ResultAsync.fromThrowable(fn, mapErr)

```ts
static fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E>
```

Wraps an async function. Returns a new function with the same parameter types that returns `ResultAsync` instead of `Promise`.

### ResultAsync.fromCallback(fn)

```ts
static fromCallback<T, E>(
  fn: (callback: (error: E | null, value?: T) => void) => void
): ResultAsync<T, E>
```

Wraps a Node-style callback function into a `ResultAsync`. The callback convention is `(error, value)` where a non-null first argument indicates failure.

**Behavior**:
- If `callback(null, value)` is called → resolves to `Ok(value)`
- If `callback(error)` is called → resolves to `Err(error)`

**Example**:
```ts
const result = ResultAsync.fromCallback<Buffer, NodeJS.ErrnoException>((cb) => {
  fs.readFile("config.json", cb);
});
```

### ResultAsync.race(...results)

```ts
static race<R extends readonly ResultAsync<unknown, unknown>[]>(
  ...results: R
): ResultAsync<InferOkUnion<R>, InferErrUnion<R>>
```

Returns the first `ResultAsync` to resolve (whether `Ok` or `Err`). Analogous to `Promise.race()` but returns a `ResultAsync`.

See [05-composition.md](05-composition.md#resultasyncraceresults) for full specification.

## BEH-06-004: Static Combinators

```ts
static all = all;
static allSettled = allSettled;
static any = any;
static collect = collect;
static partition = partition;
static forEach = forEach;
static zipOrAccumulate = zipOrAccumulate;
```

These are the same sync combinator functions re-exported as static methods. See [05-composition.md](05-composition.md).

## BEH-06-005: Do Notation

`ResultAsync.Do` starts an async Do notation chain. See [12-do-notation.md](12-do-notation.md#beh-12-007-resultasyncdo) for full specification.

## BEH-06-006: Instance Methods — Transformations

All transformation methods return a new `ResultAsync` (they do not mutate).

### map(f)

```ts
map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E>
```

If `Ok`, applies `f` (which may return a value or a `Promise`) and wraps the result in `Ok`. If `Err`, passes through unchanged.

### mapErr(f)

```ts
mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsync<T, F>
```

If `Err`, applies `f` (which may return a value or a `Promise`) and wraps the result in `Err`. If `Ok`, passes through unchanged.

### mapBoth(onOk, onErr)

```ts
mapBoth<U, F>(
  onOk: (value: T) => U | Promise<U>,
  onErr: (error: E) => F | Promise<F>
): ResultAsync<U, F>
```

Applies the appropriate function based on the variant. Both callbacks may return promises.

## BEH-06-007: Instance Methods — Chaining

### andThen(f)

```ts
andThen<U, F>(f: (value: T) => Result<U, F>): ResultAsync<U, E | F>;
andThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;
andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F>;
```

Monadic bind. If `Ok`, calls `f(value)` which may return `Result` or `ResultAsync`. The returned value is flattened into the chain. If `Err`, passes through unchanged.

### orElse(f)

```ts
orElse<U, F>(f: (error: E) => Result<U, F>): ResultAsync<T | U, F>;
orElse<U, F>(f: (error: E) => ResultAsync<U, F>): ResultAsync<T | U, F>;
orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F>;
```

Recovery. If `Err`, calls `f(error)` which may return `Result` or `ResultAsync`. If `Ok`, passes through unchanged.

### andTee(f)

```ts
andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E>
```

Side effect on `Ok`. Calls `f(value)`, awaits it if it returns a promise, catches and suppresses any exception. Returns the original result unchanged.

### orTee(f)

```ts
orTee(f: (error: E) => void | Promise<void>): ResultAsync<T, E>
```

Side effect on `Err`. Calls `f(error)`, awaits it if it returns a promise, catches and suppresses any exception. Returns the original result unchanged.

### andThrough(f)

```ts
andThrough<F>(
  f: (value: T) => Result<unknown, F> | ResultAsync<unknown, F>
): ResultAsync<T, E | F>
```

Side effect with error propagation. If `Ok`, calls `f(value)`. If `f` returns `Err`, that error propagates. If `f` returns `Ok`, the original value is preserved.

### inspect(f)

```ts
inspect(f: (value: T) => void): ResultAsync<T, E>
```

Observation. If `Ok`, calls `f(value)` synchronously. Does not catch exceptions.

### inspectErr(f)

```ts
inspectErr(f: (error: E) => void): ResultAsync<T, E>
```

Observation. If `Err`, calls `f(error)` synchronously. Does not catch exceptions.

## BEH-06-008: Instance Methods — Extraction

All extraction methods return `Promise` (since the underlying value is async).

### match(onOk, onErr)

```ts
async match<A, B>(
  onOk: (value: T) => A | Promise<A>,
  onErr: (error: E) => B | Promise<B>
): Promise<A | B>
```

### unwrapOr(defaultValue)

```ts
async unwrapOr<U>(defaultValue: U): Promise<T | U>
```

### unwrapOrElse(f)

```ts
async unwrapOrElse<U>(f: (error: E) => U): Promise<T | U>
```

### toNullable()

```ts
async toNullable(): Promise<T | null>
```

### toUndefined()

```ts
async toUndefined(): Promise<T | undefined>
```

### intoTuple()

```ts
async intoTuple(): Promise<[null, T] | [E, null]>
```

### merge()

```ts
async merge(): Promise<T | E>
```

## BEH-06-009: Instance Methods — Conversion

### flatten()

```ts
flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E>
```

Unwraps a nested `ResultAsync<Result<U, E>, E>` into `ResultAsync<U, E>`.

### flip()

```ts
flip(): ResultAsync<E, T>
```

Swaps `Ok` and `Err` variants.

### toJSON()

```ts
async toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }>
```

Serializes the resolved result to a JSON-compatible object.

## BEH-06-010: Async Bridges on Sync Result

The sync `Ok` and `Err` interfaces provide three methods that bridge to `ResultAsync`:

### toAsync()

```ts
// On Ok<T, E>:
toAsync(): ResultAsync<T, E>    // delegates to ResultAsync.ok(value)

// On Err<T, E>:
toAsync(): ResultAsync<T, E>    // delegates to ResultAsync.err(error)
```

Lifts a sync `Result` into a `ResultAsync`.

### asyncMap(f)

```ts
// On Ok<T, E>:
asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>
// delegates to ResultAsync.fromSafePromise(f(value))

// On Err<T, E>:
asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>
// delegates to ResultAsync.err(error)
```

Maps with an async function, lifting into `ResultAsync`.

### asyncAndThen(f)

```ts
// On Ok<T, E>:
asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>
// returns f(value)

// On Err<T, E>:
asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>
// delegates to ResultAsync.err(error)
```

Monadic bind with an async function, returning `ResultAsync`.

## BEH-06-011: Lazy Registration

The sync module (`core/result.ts`) cannot import `ResultAsync` at module load time without creating a circular dependency. Instead:

1. `core/result.ts` declares a nullable `_ResultAsyncImpl` variable and exports `_setResultAsyncImpl()`
2. `async/result-async.ts` calls `_setResultAsyncImpl({ ok, err, fromSafePromise })` at module scope
3. The `toAsync()`, `asyncMap()`, and `asyncAndThen()` methods use a `getResultAsync()` helper that throws if the impl hasn't been registered

See [ADR-005](../decisions/005-lazy-async-registration.md) and [INV-8](../invariants.md#inv-8-lazy-resultasync-registration).
