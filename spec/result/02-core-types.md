# 02 - Core Types

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

---

## 5. Result Discriminated Union

`Result<T, E>` is the core type. It is a discriminated union on `_tag` -- TypeScript narrows `value` and `error` fields when checking `_tag` or calling `isOk()` / `isErr()`.

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

Both `Ok` and `Err` carry the full `Result<T, E>` type parameters to support method chaining where the return type must preserve the "other side" of the union. `Ok<T, E>` holds a phantom `E` (never used at runtime), and `Err<T, E>` holds a phantom `T`.

### Why discriminated union, not class hierarchy

1. **No casting required** -- TypeScript narrows `Result<T, E>` to `Ok<T, E>` or `Err<T, E>` via `_tag` check, without `instanceof` or `as`
2. **Serialization** -- discriminated unions serialize to JSON naturally via `toJSON()`
3. **Structural typing** -- any object with `{ _tag: "Ok", value: T }` is assignable to `Ok<T, E>`
4. **Type-level programming** -- conditional types can distribute over the union without special handling
5. **Alignment with HexDI patterns** -- `AsyncDerivedSnapshot` in `@hex-di/store` uses the same discriminated union pattern

### The Result interface

Both variants share a common interface for method chaining:

```typescript
interface ResultMethods<T, E> {
  // Type guards
  readonly _tag: "Ok" | "Err";
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<T, E>;

  // Transformations
  map<U>(f: (value: T) => U): Result<U, E>;
  mapErr<F>(f: (error: E) => F): Result<T, F>;
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Result<U, F>;

  // Chaining
  andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;
  orElse<U, F>(f: (error: E) => Result<U, F>): Result<T | U, F>;

  // Side effects
  andTee(f: (value: T) => void): Result<T, E>;
  orTee(f: (error: E) => void): Result<T, E>;
  andThrough<F>(f: (value: T) => Result<unknown, F>): Result<T, E | F>;
  inspect(f: (value: T) => void): Result<T, E>;
  inspectErr(f: (error: E) => void): Result<T, E>;

  // Extraction
  match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A | B;
  unwrapOr<U>(defaultValue: U): T | U;
  unwrapOrElse<U>(f: (error: E) => U): T | U;
  expect(message: string): T;
  expectErr(message: string): E;

  // Conversion
  toNullable(): T | null;
  toUndefined(): T | undefined;
  intoTuple(): [null, T] | [E, null];
  merge(): T | E;
  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E>;
  flip(): Result<E, T>;

  // Async bridges
  toAsync(): ResultAsync<T, E>;
  asyncMap<U>(f: (value: T) => Promise<U>): ResultAsync<U, E>;
  asyncAndThen<U, F>(f: (value: T) => ResultAsync<U, F>): ResultAsync<U, E | F>;

  // Serialization
  toJSON(): { _tag: "Ok"; value: T } | { _tag: "Err"; error: E };
}
```

## 6. Ok and Err Variants

### Ok

`Ok<T, E>` represents a successful outcome. The `value` property holds the success value. The phantom `E` parameter exists only for type compatibility when methods return `Result<U, E>`.

```typescript
interface Ok<T, E> extends ResultMethods<T, E> {
  readonly _tag: "Ok";
  readonly value: T;

  // Type guard narrows to Ok
  isOk(): true;
  isErr(): false;
}
```

**Behavior of Ok methods:**

| Method               | Behavior                                                                             |
| -------------------- | ------------------------------------------------------------------------------------ |
| `map(f)`             | Applies `f` to `value`, returns `Ok(f(value))`                                       |
| `mapErr(f)`          | No-op, returns `this` (no error to map)                                              |
| `andThen(f)`         | Applies `f` to `value`, returns the Result from `f`                                  |
| `orElse(f)`          | No-op, returns `this` (no error to recover from)                                     |
| `andTee(f)`          | Calls `f(value)`, returns `this`                                                     |
| `orTee(f)`           | No-op, returns `this`                                                                |
| `andThrough(f)`      | Calls `f(value)`. If `f` returns `Err`, returns that `Err`. Otherwise returns `this` |
| `unwrapOr(default)`  | Returns `value` (ignores default)                                                    |
| `match(onOk, onErr)` | Returns `onOk(value)`                                                                |
| `toNullable()`       | Returns `value`                                                                      |
| `intoTuple()`        | Returns `[null, value]`                                                              |
| `expect(msg)`        | Returns `value`                                                                      |
| `expectErr(msg)`     | Throws `Error(msg)`                                                                  |

### Err

`Err<T, E>` represents a failure outcome. The `error` property holds the error value. The phantom `T` parameter exists only for type compatibility when methods return `Result<T, F>`.

```typescript
interface Err<T, E> extends ResultMethods<T, E> {
  readonly _tag: "Err";
  readonly error: E;

  // Type guard narrows to Err
  isOk(): false;
  isErr(): true;
}
```

**Behavior of Err methods:**

| Method               | Behavior                                            |
| -------------------- | --------------------------------------------------- |
| `map(f)`             | No-op, returns `this` (no value to map)             |
| `mapErr(f)`          | Applies `f` to `error`, returns `Err(f(error))`     |
| `andThen(f)`         | No-op, returns `this` (no value to chain)           |
| `orElse(f)`          | Applies `f` to `error`, returns the Result from `f` |
| `andTee(f)`          | No-op, returns `this`                               |
| `orTee(f)`           | Calls `f(error)`, returns `this`                    |
| `andThrough(f)`      | No-op, returns `this`                               |
| `unwrapOr(default)`  | Returns `default` (ignores error)                   |
| `match(onOk, onErr)` | Returns `onErr(error)`                              |
| `toNullable()`       | Returns `null`                                      |
| `intoTuple()`        | Returns `[error, null]`                             |
| `expect(msg)`        | Throws `Error(msg)`                                 |
| `expectErr(msg)`     | Returns `error`                                     |

## 7. ResultAsync

`ResultAsync<T, E>` wraps a `Promise<Result<T, E>>` and provides method chaining without requiring `await` at every step. It implements `PromiseLike<Result<T, E>>` so it can be `await`-ed directly.

```typescript
class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
  private readonly _promise: Promise<Result<T, E>>;

  constructor(promise: Promise<Result<T, E>>);

  // PromiseLike implementation (makes it thenable/awaitable)
  then<A, B>(
    onfulfilled?: (value: Result<T, E>) => A | PromiseLike<A>,
    onrejected?: (reason: unknown) => B | PromiseLike<B>
  ): PromiseLike<A | B>;

  // All Result methods mirrored for async context
  map<U>(f: (value: T) => U | Promise<U>): ResultAsync<U, E>;
  mapErr<F>(f: (error: E) => F | Promise<F>): ResultAsync<T, F>;
  mapBoth<U, F>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => F | Promise<F>
  ): ResultAsync<U, F>;

  andThen<U, F>(f: (value: T) => Result<U, F> | ResultAsync<U, F>): ResultAsync<U, E | F>;
  orElse<U, F>(f: (error: E) => Result<U, F> | ResultAsync<U, F>): ResultAsync<T | U, F>;

  andTee(f: (value: T) => void | Promise<void>): ResultAsync<T, E>;
  orTee(f: (error: E) => void | Promise<void>): ResultAsync<T, E>;
  andThrough<F>(
    f: (value: T) => Result<unknown, F> | ResultAsync<unknown, F>
  ): ResultAsync<T, E | F>;

  inspect(f: (value: T) => void): ResultAsync<T, E>;
  inspectErr(f: (error: E) => void): ResultAsync<T, E>;

  match<A, B>(
    onOk: (value: T) => A | Promise<A>,
    onErr: (error: E) => B | Promise<B>
  ): Promise<A | B>;

  unwrapOr<U>(defaultValue: U): Promise<T | U>;
  unwrapOrElse<U>(f: (error: E) => U): Promise<T | U>;

  toNullable(): Promise<T | null>;
  toUndefined(): Promise<T | undefined>;
  intoTuple(): Promise<[null, T] | [E, null]>;
  merge(): Promise<T | E>;

  flatten<U>(this: ResultAsync<Result<U, E>, E>): ResultAsync<U, E>;
  flip(): ResultAsync<E, T>;

  toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }>;
}
```

### Why a separate class

Async operations cannot be expressed as a discriminated union because the Ok/Err status is unknown until the promise resolves. A `ResultAsync` wraps the promise and defers the Ok/Err branching. This means:

1. **Chaining without await:** `fetchUser(id).andThen(fetchProfile).map(toDTO)` -- all async, zero `await` keywords
2. **Seamless sync/async mixing:** `andThen(f)` accepts functions returning `Result<U, F>` OR `ResultAsync<U, F>`
3. **Map accepts promises:** `map(f)` accepts `(T) => U | Promise<U>` so sync and async transforms compose naturally
4. **Awaitable:** Because `ResultAsync` implements `PromiseLike`, you can `const result = await someResultAsync` to get a `Result<T, E>`

### ResultAsync never rejects

The internal promise always resolves to a `Result<T, E>`. It never rejects. This is enforced by the constructors:

```typescript
// fromPromise catches rejections and wraps them as Err
const result = ResultAsync.fromPromise(fetch("/api/users"), error => ({
  _tag: "NetworkError" as const,
  cause: error,
}));
// Type: ResultAsync<Response, { _tag: "NetworkError"; cause: unknown }>
```

If the mapper function passed to `map` or `andThen` throws synchronously, the thrown value is caught and wrapped as a rejected promise -- but this is a bug in the user's code, not expected behavior. Result chains should not throw.

## 8. Type Utilities

Utility types for extracting the Ok and Err types from a Result:

```typescript
/** Extract the success type from a Result */
type InferOk<R> = R extends Result<infer T, unknown> ? T : never;

/** Extract the error type from a Result */
type InferErr<R> = R extends Result<unknown, infer E> ? E : never;

/** Extract the success type from a ResultAsync */
type InferAsyncOk<R> = R extends ResultAsync<infer T, unknown> ? T : never;

/** Extract the error type from a ResultAsync */
type InferAsyncErr<R> = R extends ResultAsync<unknown, infer E> ? E : never;

/** Check if a type is a Result */
type IsResult<T> = T extends Result<unknown, unknown> ? true : false;

/** Check if a type is a ResultAsync */
type IsResultAsync<T> = T extends ResultAsync<unknown, unknown> ? true : false;

/** Unwrap nested Result types */
type FlattenResult<R> =
  R extends Result<Result<infer T, infer E1>, infer E2> ? Result<T, E1 | E2> : R;
```

### Combining type utilities

These types power the combinator functions:

```typescript
/** Extract Ok types from a tuple of Results */
type InferOkTuple<T extends readonly Result<unknown, unknown>[]> = {
  [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never;
};

/** Extract the union of all Err types from a tuple of Results */
type InferErrUnion<T extends readonly Result<unknown, unknown>[]> =
  T[number] extends Result<unknown, infer E> ? E : never;

/** Extract Ok types from a record of Results */
type InferOkRecord<T extends Record<string, Result<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never;
};
```

---

_Previous: [01 - Overview & Philosophy](./01-overview.md) | Next: [03 - Constructors](./03-constructors.md)_
