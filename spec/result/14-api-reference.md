# 14 - API Reference

_Previous: [13 - Testing](./13-testing.md)_

---

## 61. Constructors

| Function             | Signature                                                                                                     | Description                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `ok`                 | `<T>(value: T) => Ok<T, never>`                                                                               | Create an Ok variant                         |
| `err`                | `<E>(error: E) => Err<never, E>`                                                                              | Create an Err variant                        |
| `fromThrowable`      | `<T, E>(fn: () => T, mapErr: (e: unknown) => E) => Result<T, E>`                                              | Execute function, catch throws               |
| `fromThrowable`      | `<A[], T, E>(fn: (...args: A) => T, mapErr: (e: unknown) => E) => (...args: A) => Result<T, E>`               | Wrap function into safe function             |
| `fromPromise`        | `<T, E>(promise: Promise<T>, mapErr: (e: unknown) => E) => ResultAsync<T, E>`                                 | Wrap promise, catch rejections               |
| `fromSafePromise`    | `<T>(promise: Promise<T>) => ResultAsync<T, never>`                                                           | Wrap non-rejecting promise                   |
| `fromAsyncThrowable` | `<A[], T, E>(fn: (...args: A) => Promise<T>, mapErr: (e: unknown) => E) => (...args: A) => ResultAsync<T, E>` | Wrap async function into safe async function |
| `fromNullable`       | `<T, E>(value: T \| null \| undefined, onNullable: () => E) => Result<T, E>`                                  | Null/undefined → Err, otherwise Ok           |
| `fromPredicate`      | `<T, E>(value: T, pred: (v: T) => boolean, onFalse: (v: T) => E) => Result<T, E>`                             | Predicate → Ok/Err                           |
| `fromPredicate`      | `<T, U extends T, E>(value: T, pred: (v: T) => v is U, onFalse: (v: T) => E) => Result<U, E>`                 | Type guard predicate with narrowing          |
| `tryCatch`           | `<T, E>(fn: () => T, mapErr: (e: unknown) => E) => Result<T, E>`                                              | Execute function immediately, catch throws   |

## 62. Instance Methods

### Type Guards

| Method           | On Ok         | On Err        | Return Type            |
| ---------------- | ------------- | ------------- | ---------------------- |
| `isOk()`         | `true`        | `false`       | `boolean` (type guard) |
| `isErr()`        | `false`       | `true`        | `boolean` (type guard) |
| `isOkAnd(pred)`  | `pred(value)` | `false`       | `boolean`              |
| `isErrAnd(pred)` | `false`       | `pred(error)` | `boolean`              |

### Transformations

| Method    | Signature                                                       | On Ok                  | On Err              |
| --------- | --------------------------------------------------------------- | ---------------------- | ------------------- |
| `map`     | `<U>(f: (v: T) => U) => Result<U, E>`                           | `Ok(f(value))`         | `this`              |
| `mapErr`  | `<F>(f: (e: E) => F) => Result<T, F>`                           | `this`                 | `Err(f(error))`     |
| `mapBoth` | `<U, F>(onOk: (v: T) => U, onErr: (e: E) => F) => Result<U, F>` | `Ok(onOk(value))`      | `Err(onErr(error))` |
| `flatten` | `() => Result<U, E>` (when `T = Result<U, E>`)                  | `value` (inner Result) | `this`              |
| `flip`    | `() => Result<E, T>`                                            | `Err(value)`           | `Ok(error)`         |

### Chaining

| Method    | Signature                                                | On Ok      | On Err     |
| --------- | -------------------------------------------------------- | ---------- | ---------- |
| `andThen` | `<U, F>(f: (v: T) => Result<U, F>) => Result<U, E \| F>` | `f(value)` | `this`     |
| `orElse`  | `<U, F>(f: (e: E) => Result<U, F>) => Result<T \| U, F>` | `this`     | `f(error)` |

### Side Effects

| Method       | Signature                                                   | On Ok                                         | On Err                         |
| ------------ | ----------------------------------------------------------- | --------------------------------------------- | ------------------------------ |
| `andTee`     | `(f: (v: T) => void) => Result<T, E>`                       | Call `f(value)`, return `this`                | `this`                         |
| `orTee`      | `(f: (e: E) => void) => Result<T, E>`                       | `this`                                        | Call `f(error)`, return `this` |
| `andThrough` | `<F>(f: (v: T) => Result<unknown, F>) => Result<T, E \| F>` | If `f(value)` is Ok: `this`. If Err: that Err | `this`                         |
| `inspect`    | `(f: (v: T) => void) => Result<T, E>`                       | Call `f(value)`, return `this`                | `this`                         |
| `inspectErr` | `(f: (e: E) => void) => Result<T, E>`                       | `this`                                        | Call `f(error)`, return `this` |

### Extraction

| Method         | Signature                                                 | On Ok                   | On Err                  |
| -------------- | --------------------------------------------------------- | ----------------------- | ----------------------- |
| `match`        | `<A, B>(onOk: (v: T) => A, onErr: (e: E) => B) => A \| B` | `onOk(value)`           | `onErr(error)`          |
| `unwrapOr`     | `<U>(defaultValue: U) => T \| U`                          | `value`                 | `defaultValue`          |
| `unwrapOrElse` | `<U>(f: (e: E) => U) => T \| U`                           | `value`                 | `f(error)`              |
| `expect`       | `(message: string) => T`                                  | `value`                 | Throws `Error(message)` |
| `expectErr`    | `(message: string) => E`                                  | Throws `Error(message)` | `error`                 |

### Conversion

| Method         | Signature                                                          | On Ok                             | On Err                        |
| -------------- | ------------------------------------------------------------------ | --------------------------------- | ----------------------------- |
| `toNullable`   | `() => T \| null`                                                  | `value`                           | `null`                        |
| `toUndefined`  | `() => T \| undefined`                                             | `value`                           | `undefined`                   |
| `intoTuple`    | `() => [null, T] \| [E, null]`                                     | `[null, value]`                   | `[error, null]`               |
| `merge`        | `() => T \| E`                                                     | `value`                           | `error`                       |
| `toAsync`      | `() => ResultAsync<T, E>`                                          | Wraps in resolved ResultAsync     | Wraps in resolved ResultAsync |
| `asyncMap`     | `<U>(f: (v: T) => Promise<U>) => ResultAsync<U, E>`                | `ResultAsync(Ok(await f(value)))` | `ResultAsync(this)`           |
| `asyncAndThen` | `<U, F>(f: (v: T) => ResultAsync<U, F>) => ResultAsync<U, E \| F>` | `f(value)`                        | `ResultAsync(this)`           |
| `toJSON`       | `() => { _tag: "Ok"; value: T } \| { _tag: "Err"; error: E }`      | `{ _tag: "Ok", value }`           | `{ _tag: "Err", error }`      |

## 63. Static Methods

| Method              | Signature                                                      | Description                                 |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `Result.all`        | `<R[]>(...results: R) => Result<Ok[], ErrUnion>`               | Combine Results, short-circuit on first Err |
| `Result.allSettled` | `<R[]>(...results: R) => Result<Ok[], Err[]>`                  | Combine Results, collect all Errors         |
| `Result.any`        | `<R[]>(...results: R) => Result<OkUnion, Err[]>`               | First Ok wins, or all Errors                |
| `Result.collect`    | `<R extends Record>(results: R) => Result<OkRecord, ErrUnion>` | Combine record of Results                   |
| `Result.isResult`   | `(value: unknown) => value is Result`                          | Runtime type guard                          |

## 64. ResultAsync Methods

All instance methods from §62 mirrored with async-aware signatures:

| Method       | Key Difference from Sync                                     |
| ------------ | ------------------------------------------------------------ |
| `map`        | Accepts `(T) => U \| Promise<U>`                             |
| `mapErr`     | Accepts `(E) => F \| Promise<F>`                             |
| `andThen`    | Accepts `(T) => Result<U,F> \| ResultAsync<U,F>`             |
| `orElse`     | Accepts `(E) => Result<U,F> \| ResultAsync<U,F>`             |
| `andTee`     | Accepts `(T) => void \| Promise<void>`                       |
| `orTee`      | Accepts `(E) => void \| Promise<void>`                       |
| `andThrough` | Accepts `(T) => Result<unknown,F> \| ResultAsync<unknown,F>` |
| `match`      | Returns `Promise<A \| B>`                                    |
| `unwrapOr`   | Returns `Promise<T \| U>`                                    |
| `toNullable` | Returns `Promise<T \| null>`                                 |
| `intoTuple`  | Returns `Promise<[null, T] \| [E, null]>`                    |

### Static Methods

| Method                        | Signature                                                             | Description              |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------ |
| `ResultAsync.ok`              | `<T>(value: T) => ResultAsync<T, never>`                              | Create async Ok          |
| `ResultAsync.err`             | `<E>(error: E) => ResultAsync<never, E>`                              | Create async Err         |
| `ResultAsync.fromPromise`     | `<T, E>(promise: Promise<T>, mapErr: ...) => ResultAsync<T, E>`       | Wrap rejectable promise  |
| `ResultAsync.fromSafePromise` | `<T>(promise: Promise<T>) => ResultAsync<T, never>`                   | Wrap safe promise        |
| `ResultAsync.fromThrowable`   | `<A[], T, E>(fn: ..., mapErr: ...) => (...args) => ResultAsync<T, E>` | Wrap async function      |
| `ResultAsync.all`             | `<R[]>(...results: R) => ResultAsync<Ok[], ErrUnion>`                 | Async combine            |
| `ResultAsync.allSettled`      | `<R[]>(...results: R) => ResultAsync<Ok[], Err[]>`                    | Async combine all errors |
| `ResultAsync.any`             | `<R[]>(...results: R) => ResultAsync<OkUnion, Err[]>`                 | First async Ok           |
| `ResultAsync.collect`         | `<R extends Record>(results: R) => ResultAsync<OkRecord, ErrUnion>`   | Async combine record     |

## 65. Generator Functions

| Function          | Signature                                                                             | Description                          |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| `safeTry` (sync)  | `<T, E>(gen: () => Generator<Err<never, E>, Result<T, E>>) => Result<T, E>`           | Generator-based early return (sync)  |
| `safeTry` (async) | `<T, E>(gen: () => AsyncGenerator<Err<never, E>, Result<T, E>>) => ResultAsync<T, E>` | Generator-based early return (async) |

## 66. Type Utilities

| Type                 | Signature                                                           | Description            |
| -------------------- | ------------------------------------------------------------------- | ---------------------- |
| `InferOk<R>`         | `R extends Result<infer T, unknown> ? T : never`                    | Extract Ok type        |
| `InferErr<R>`        | `R extends Result<unknown, infer E> ? E : never`                    | Extract Err type       |
| `InferAsyncOk<R>`    | `R extends ResultAsync<infer T, unknown> ? T : never`               | Extract async Ok type  |
| `InferAsyncErr<R>`   | `R extends ResultAsync<unknown, infer E> ? E : never`               | Extract async Err type |
| `IsResult<T>`        | `T extends Result<unknown, unknown> ? true : false`                 | Check if Result        |
| `IsResultAsync<T>`   | `T extends ResultAsync<unknown, unknown> ? true : false`            | Check if ResultAsync   |
| `FlattenResult<R>`   | Unwraps nested `Result<Result<T, E1>, E2>` to `Result<T, E1 \| E2>` | Flatten type           |
| `InferOkTuple<R[]>`  | Maps array of Results to tuple of Ok types                          | Tuple extraction       |
| `InferErrUnion<R[]>` | Union of all Err types from array                                   | Error union extraction |
| `InferOkRecord<R>`   | Maps record of Results to record of Ok types                        | Record extraction      |

## 67. Testing API

### Assertion Functions

| Function         | Signature                                           | Description              |
| ---------------- | --------------------------------------------------- | ------------------------ |
| `expectOk`       | `<T, E>(result: Result<T, E>) => T`                 | Assert Ok, return value  |
| `expectErr`      | `<T, E>(result: Result<T, E>) => E`                 | Assert Err, return error |
| `expectOkEqual`  | `<T, E>(result: Result<T, E>, expected: T) => void` | Assert Ok with value     |
| `expectErrEqual` | `<T, E>(result: Result<T, E>, expected: E) => void` | Assert Err with error    |
| `expectOkAsync`  | `<T, E>(result: ResultAsync<T, E>) => Promise<T>`   | Async assert Ok          |
| `expectErrAsync` | `<T, E>(result: ResultAsync<T, E>) => Promise<E>`   | Async assert Err         |

### Vitest Matchers

| Matcher                   | Description                   |
| ------------------------- | ----------------------------- |
| `toBeOk()`                | Assert Result is Ok           |
| `toBeErr()`               | Assert Result is Err          |
| `toBeOkWith(expected)`    | Assert Ok with deep equal     |
| `toBeErrWith(expected)`   | Assert Err with deep equal    |
| `toBeOkSatisfying(pred)`  | Assert Ok matching predicate  |
| `toBeErrSatisfying(pred)` | Assert Err matching predicate |

### Mock Utilities

| Function             | Signature                                                      | Description         |
| -------------------- | -------------------------------------------------------------- | ------------------- |
| `mockError`          | `<Tag>(tag: Tag, fields?: Record) => { _tag: Tag, ...fields }` | Create tagged error |
| `mockResultSequence` | `<T, E>(...outcomes: Result<T, E>[]) => () => Result<T, E>`    | Sequential mock     |

### Arbitrary Generators (property-based testing)

| Function    | Signature                                                                | Description      |
| ----------- | ------------------------------------------------------------------------ | ---------------- |
| `okArb`     | `<T>(arb: Arbitrary<T>) => Arbitrary<Ok<T, never>>`                      | Ok arbitrary     |
| `errArb`    | `<E>(arb: Arbitrary<E>) => Arbitrary<Err<never, E>>`                     | Err arbitrary    |
| `resultArb` | `<T, E>(ok: Arbitrary<T>, err: Arbitrary<E>) => Arbitrary<Result<T, E>>` | Result arbitrary |

---

_Previous: [13 - Testing](./13-testing.md) | Next: [15 - Appendices](./15-appendices.md)_
