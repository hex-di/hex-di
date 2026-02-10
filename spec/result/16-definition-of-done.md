# 16 - Definition of Done

_Previous: [15 - Appendices](./15-appendices.md)_

---

This document defines all tests required for `@hex-di/result` and `@hex-di/result-testing` to be considered complete. Each section maps to a spec section and specifies required unit tests, type-level tests, integration tests, and mutation testing guidance.

## Test File Convention

| Test Category         | File Pattern         | Location                             |
| --------------------- | -------------------- | ------------------------------------ |
| Unit tests            | `*.test.ts`          | `packages/result/tests/`             |
| Type-level tests      | `*.test-d.ts`        | `packages/result/tests/`             |
| Integration tests     | `*.test.ts`          | `packages/result/tests/integration/` |
| Property-based tests  | `*.property.test.ts` | `packages/result/tests/`             |
| Testing package tests | `*.test.ts`          | `packages/result-testing/tests/`     |

---

## DoD 1: Core Types (Spec Sections 5-8)

### Unit Tests — `core-types.test.ts`

| #   | Test                                                       | Type |
| --- | ---------------------------------------------------------- | ---- |
| 1   | Ok variant has `_tag: "Ok"`                                | unit |
| 2   | Err variant has `_tag: "Err"`                              | unit |
| 3   | Ok variant holds the value in `.value`                     | unit |
| 4   | Err variant holds the error in `.error`                    | unit |
| 5   | Ok and Err are structurally distinct (discriminated union) | unit |
| 6   | Result is a union of Ok and Err                            | unit |
| 7   | ResultAsync wraps `Promise<Result<T, E>>`                  | unit |
| 8   | ResultAsync implements PromiseLike (is awaitable)          | unit |
| 9   | `await resultAsync` produces `Result<T, E>`                | unit |
| 10  | ResultAsync never rejects (always resolves to Result)      | unit |

### Type-Level Tests — `core-types.test-d.ts`

| #   | Test                                                                                                              | Type |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `Ok<number, never>` is assignable to `Result<number, string>`                                                     | type |
| 2   | `Err<never, string>` is assignable to `Result<number, string>`                                                    | type |
| 3   | `InferOk<Result<number, string>>` resolves to `number`                                                            | type |
| 4   | `InferErr<Result<number, string>>` resolves to `string`                                                           | type |
| 5   | `InferAsyncOk<ResultAsync<number, string>>` resolves to `number`                                                  | type |
| 6   | `InferAsyncErr<ResultAsync<number, string>>` resolves to `string`                                                 | type |
| 7   | `IsResult<Result<number, string>>` resolves to `true`                                                             | type |
| 8   | `IsResult<string>` resolves to `false`                                                                            | type |
| 9   | `IsResultAsync<ResultAsync<number, string>>` resolves to `true`                                                   | type |
| 10  | `FlattenResult<Result<Result<number, string>, boolean>>` resolves to `Result<number, string \| boolean>`          | type |
| 11  | `InferOkTuple<[Result<number, string>, Result<boolean, Error>]>` resolves to `[number, boolean]`                  | type |
| 12  | `InferErrUnion<[Result<number, string>, Result<boolean, Error>]>` resolves to `string \| Error`                   | type |
| 13  | `InferOkRecord<{ a: Result<number, string>; b: Result<boolean, Error> }>` resolves to `{ a: number; b: boolean }` | type |
| 14  | Ok phantom type `E = never` does not widen when assigned to `Result<T, SomeError>`                                | type |
| 15  | Err phantom type `T = never` does not widen when assigned to `Result<SomeValue, E>`                               | type |

### Mutation Testing

**Target: >95% mutation score.** The core type constructors and discriminant values are critical -- any mutation to `_tag`, `.value`, or `.error` must be caught by tests.

---

## DoD 2: Constructors (Spec Sections 9-14)

### Unit Tests — `constructors.test.ts`

| #   | Test                                                                      | Type |
| --- | ------------------------------------------------------------------------- | ---- |
| 1   | `ok(42)` creates Ok with value 42                                         | unit |
| 2   | `err("fail")` creates Err with error "fail"                               | unit |
| 3   | `ok(42)` has `_tag: "Ok"`                                                 | unit |
| 4   | `err("fail")` has `_tag: "Err"`                                           | unit |
| 5   | `fromThrowable(fn, mapErr)` returns Ok when fn succeeds                   | unit |
| 6   | `fromThrowable(fn, mapErr)` returns Err when fn throws                    | unit |
| 7   | `fromThrowable(fn, mapErr)` passes thrown value to mapErr                 | unit |
| 8   | `fromThrowable` overload wraps function: returns `(...args) => Result`    | unit |
| 9   | Wrapped function (fromThrowable) returns Ok on success                    | unit |
| 10  | Wrapped function (fromThrowable) returns Err on throw                     | unit |
| 11  | `fromPromise(resolved, mapErr)` returns Ok ResultAsync                    | unit |
| 12  | `fromPromise(rejected, mapErr)` returns Err ResultAsync                   | unit |
| 13  | `fromPromise` passes rejection reason to mapErr                           | unit |
| 14  | `fromSafePromise(promise)` returns Ok ResultAsync                         | unit |
| 15  | `fromAsyncThrowable(fn, mapErr)` wraps async fn into safe async fn        | unit |
| 16  | `fromNullable(value, onNull)` returns Ok for non-null value               | unit |
| 17  | `fromNullable(null, onNull)` returns Err with onNull() result             | unit |
| 18  | `fromNullable(undefined, onNull)` returns Err with onNull() result        | unit |
| 19  | `fromPredicate(value, pred, onFalse)` returns Ok when pred is true        | unit |
| 20  | `fromPredicate(value, pred, onFalse)` returns Err when pred is false      | unit |
| 21  | `fromPredicate` with type guard narrows the Ok type                       | unit |
| 22  | `tryCatch(fn, mapErr)` returns Ok when fn succeeds (executes immediately) | unit |
| 23  | `tryCatch(fn, mapErr)` returns Err when fn throws                         | unit |

### Type-Level Tests — `constructors.test-d.ts`

| #   | Test                                                                 | Type |
| --- | -------------------------------------------------------------------- | ---- |
| 1   | `ok(42)` infers as `Ok<number, never>`                               | type |
| 2   | `err("fail")` infers as `Err<never, string>`                         | type |
| 3   | `fromThrowable` return type matches `Result<T, E>`                   | type |
| 4   | `fromThrowable` function-wrapping overload infers argument types     | type |
| 5   | `fromPromise` return type is `ResultAsync<T, E>`                     | type |
| 6   | `fromSafePromise` return type is `ResultAsync<T, never>`             | type |
| 7   | `fromNullable` strips null/undefined from Ok type                    | type |
| 8   | `fromPredicate` with type guard narrows Ok type to `U extends T`     | type |
| 9   | `tryCatch` infers `Result<T, E>` from fn and mapErr                  | type |
| 10  | `fromAsyncThrowable` return type is `(...args) => ResultAsync<T, E>` | type |

### Mutation Testing

**Target: >95% mutation score.** Constructor boundary logic (null checks, try/catch wrapping, predicate evaluation) must detect mutations to conditional branches and error mapping.

---

## DoD 3: Type Guards & Narrowing (Spec Sections 15-17)

### Unit Tests — `type-guards.test.ts`

| #   | Test                                                         | Type |
| --- | ------------------------------------------------------------ | ---- |
| 1   | `ok(1).isOk()` returns true                                  | unit |
| 2   | `ok(1).isErr()` returns false                                | unit |
| 3   | `err("x").isOk()` returns false                              | unit |
| 4   | `err("x").isErr()` returns true                              | unit |
| 5   | `isOk()` narrows type to Ok in conditional                   | unit |
| 6   | `isErr()` narrows type to Err in conditional                 | unit |
| 7   | `ok(5).isOkAnd(v => v > 3)` returns true                     | unit |
| 8   | `ok(1).isOkAnd(v => v > 3)` returns false                    | unit |
| 9   | `err("x").isOkAnd(v => v > 3)` returns false                 | unit |
| 10  | `err("x").isErrAnd(e => e === "x")` returns true             | unit |
| 11  | `ok(1).isErrAnd(e => e === "x")` returns false               | unit |
| 12  | `Result.isResult(ok(1))` returns true                        | unit |
| 13  | `Result.isResult(err("x"))` returns true                     | unit |
| 14  | `Result.isResult("not a result")` returns false              | unit |
| 15  | `Result.isResult(null)` returns false                        | unit |
| 16  | `Result.isResult(undefined)` returns false                   | unit |
| 17  | Narrowing with `_tag` discriminant works in switch statement | unit |
| 18  | Array `.filter(r => r.isOk())` produces only Ok values       | unit |

### Type-Level Tests — `type-guards.test-d.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | After `isOk()` guard, value is accessible without error         | type |
| 2   | After `isErr()` guard, error is accessible without error        | type |
| 3   | `isResult` is a type guard: `value is Result<unknown, unknown>` | type |
| 4   | After `_tag === "Ok"` check, type is narrowed to Ok variant     | type |
| 5   | After `_tag === "Err"` check, type is narrowed to Err variant   | type |

### Mutation Testing

**Target: >90% mutation score.** Guard return values (true/false) and narrowing conditions are critical.

---

## DoD 4: Transformations (Spec Sections 18-22)

### Unit Tests — `transformations.test.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `ok(2).map(x => x * 3)` returns Ok(6)                                 | unit |
| 2   | `err("x").map(x => x * 3)` returns Err("x") unchanged                 | unit |
| 3   | `ok(2).mapErr(e => e.toUpperCase())` returns Ok(2) unchanged          | unit |
| 4   | `err("fail").mapErr(e => e.toUpperCase())` returns Err("FAIL")        | unit |
| 5   | `ok(2).mapBoth(v => v * 2, e => e)` returns Ok(4)                     | unit |
| 6   | `err("x").mapBoth(v => v * 2, e => e.toUpperCase())` returns Err("X") | unit |
| 7   | `ok(ok(42)).flatten()` returns Ok(42)                                 | unit |
| 8   | `ok(err("inner")).flatten()` returns Err("inner")                     | unit |
| 9   | `err("outer").flatten()` returns Err("outer")                         | unit |
| 10  | `ok(42).flip()` returns Err(42)                                       | unit |
| 11  | `err("x").flip()` returns Ok("x")                                     | unit |
| 12  | `map` does not call the function on Err                               | unit |
| 13  | `mapErr` does not call the function on Ok                             | unit |

### Type-Level Tests — `transformations.test-d.ts`

| #   | Test                                                          | Type |
| --- | ------------------------------------------------------------- | ---- |
| 1   | `ok(1).map(v => String(v))` infers as `Result<string, never>` | type |
| 2   | `err("x").mapErr(e => 42)` infers as `Result<never, number>`  | type |
| 3   | `ok(ok(42)).flatten()` infers as `Result<number, never>`      | type |
| 4   | `ok(42).flip()` infers as `Result<never, number>`             | type |
| 5   | `err("x").flip()` infers as `Result<string, never>`           | type |
| 6   | `mapBoth` infers correct transformed types for both branches  | type |

### Mutation Testing

**Target: >95% mutation score.** Transformation functions must be called with correct arguments and short-circuit behavior must be verified.

---

## DoD 5: Chaining (Spec Sections 23-28)

### Unit Tests — `chaining.test.ts`

| #   | Test                                                                            | Type |
| --- | ------------------------------------------------------------------------------- | ---- |
| 1   | `ok(2).andThen(v => ok(v * 3))` returns Ok(6)                                   | unit |
| 2   | `ok(2).andThen(v => err("fail"))` returns Err("fail")                           | unit |
| 3   | `err("x").andThen(v => ok(v * 3))` returns Err("x")                             | unit |
| 4   | `err("x").orElse(e => ok(99))` returns Ok(99)                                   | unit |
| 5   | `err("x").orElse(e => err("new"))` returns Err("new")                           | unit |
| 6   | `ok(1).orElse(e => ok(99))` returns Ok(1)                                       | unit |
| 7   | `ok(2).andTee(v => {})` returns Ok(2)                                           | unit |
| 8   | `ok(2).andTee(v => { throw new Error("boom") })` returns Ok(2) (swallows error) | unit |
| 9   | `err("x").andTee(v => {})` returns Err("x")                                     | unit |
| 10  | `andTee` calls the function with the Ok value                                   | unit |
| 11  | `err("x").orTee(e => {})` returns Err("x")                                      | unit |
| 12  | `orTee` calls the function with the Err value                                   | unit |
| 13  | `ok(1).orTee(e => {})` returns Ok(1)                                            | unit |
| 14  | `ok(2).andThrough(v => ok("ignored"))` returns Ok(2) (original value)           | unit |
| 15  | `ok(2).andThrough(v => err("fail"))` returns Err("fail") (propagates)           | unit |
| 16  | `err("x").andThrough(v => ok("ignored"))` returns Err("x")                      | unit |
| 17  | `inspect` calls function on Ok, returns same Result                             | unit |
| 18  | `inspect` does not call function on Err                                         | unit |
| 19  | `inspectErr` calls function on Err, returns same Result                         | unit |
| 20  | `inspectErr` does not call function on Ok                                       | unit |
| 21  | Chaining `andThen` accumulates error types via union                            | unit |
| 22  | Three-step `andThen` chain short-circuits on first Err                          | unit |

### Type-Level Tests — `chaining.test-d.ts`

| #   | Test                                                                                                          | Type |
| --- | ------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `ok(1).andThen(v => ok("str"))` infers `Result<string, never>`                                                | type |
| 2   | `andThen` accumulates: `Result<T, A>` → `andThen(f: T => Result<U, B>)` → `Result<U, A \| B>`                 | type |
| 3   | Three `andThen` calls accumulate three error types in union                                                   | type |
| 4   | `orElse` replaces error type: `Result<T, A>` → `orElse(f: A => Result<T, B>)` → `Result<T, B>`                | type |
| 5   | `andThrough` adds error type: `Result<T, A>` → `andThrough(f: T => Result<unknown, B>)` → `Result<T, A \| B>` | type |
| 6   | `andTee` does not change error type                                                                           | type |
| 7   | `orTee` does not change value type                                                                            | type |

### Mutation Testing

**Target: >95% mutation score.** Short-circuit behavior, error swallowing in `andTee`, and error propagation in `andThrough` are critical distinctions.

---

## DoD 6: Extraction (Spec Sections 29-34)

### Unit Tests — `extraction.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `ok(42).match(v => v + 1, e => 0)` returns 43                               | unit |
| 2   | `err("x").match(v => v + 1, e => 0)` returns 0                              | unit |
| 3   | `ok(42).unwrapOr(0)` returns 42                                             | unit |
| 4   | `err("x").unwrapOr(0)` returns 0                                            | unit |
| 5   | `ok(42).unwrapOrElse(e => 0)` returns 42                                    | unit |
| 6   | `err("x").unwrapOrElse(e => e.length)` returns 1                            | unit |
| 7   | `ok(42).toNullable()` returns 42                                            | unit |
| 8   | `err("x").toNullable()` returns null                                        | unit |
| 9   | `ok(42).toUndefined()` returns 42                                           | unit |
| 10  | `err("x").toUndefined()` returns undefined                                  | unit |
| 11  | `ok(42).intoTuple()` returns `[null, 42]`                                   | unit |
| 12  | `err("x").intoTuple()` returns `["x", null]`                                | unit |
| 13  | `ok(42).merge()` returns 42                                                 | unit |
| 14  | `err("x").merge()` returns "x"                                              | unit |
| 15  | `ok(42).expect("should not throw")` returns 42                              | unit |
| 16  | `err("x").expect("oops")` throws Error with message "oops"                  | unit |
| 17  | `err("x").expectErr("should not throw")` returns "x"                        | unit |
| 18  | `ok(42).expectErr("oops")` throws Error with message "oops"                 | unit |
| 19  | `ok(42).toAsync()` returns ResultAsync that resolves to Ok(42)              | unit |
| 20  | `err("x").toAsync()` returns ResultAsync that resolves to Err("x")          | unit |
| 21  | `ok(42).asyncMap(async v => v * 2)` returns ResultAsync resolving to Ok(84) | unit |
| 22  | `ok(42).asyncAndThen(v => ResultAsync.ok(v * 2))` returns ResultAsync       | unit |
| 23  | `ok(42).toJSON()` returns `{ _tag: "Ok", value: 42 }`                       | unit |
| 24  | `err("x").toJSON()` returns `{ _tag: "Err", error: "x" }`                   | unit |

### Type-Level Tests — `extraction.test-d.ts`

| #   | Test                                                      | Type |
| --- | --------------------------------------------------------- | ---- |
| 1   | `match` return type is union of both handler return types | type |
| 2   | `unwrapOr` return type is `T \| U`                        | type |
| 3   | `toNullable` return type is `T \| null`                   | type |
| 4   | `toUndefined` return type is `T \| undefined`             | type |
| 5   | `intoTuple` return type is `[null, T] \| [E, null]`       | type |
| 6   | `merge` return type is `T \| E`                           | type |
| 7   | `toAsync` return type is `ResultAsync<T, E>`              | type |
| 8   | `asyncMap` return type is `ResultAsync<U, E>`             | type |
| 9   | `toJSON` return type matches discriminated union shape    | type |

### Mutation Testing

**Target: >95% mutation score.** Extraction methods are consumer-facing API surface -- every return value and exception throw must be verified.

---

## DoD 7: Combining (Spec Sections 35-39)

### Unit Tests — `combining.test.ts`

| #   | Test                                                                        | Type |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | `Result.all(ok(1), ok(2), ok(3))` returns Ok([1, 2, 3])                     | unit |
| 2   | `Result.all(ok(1), err("a"), ok(3))` returns Err("a") (first error)         | unit |
| 3   | `Result.all(ok(1), err("a"), err("b"))` returns Err("a") (short-circuits)   | unit |
| 4   | `Result.all()` with empty args returns Ok([])                               | unit |
| 5   | `Result.allSettled(ok(1), ok(2))` returns Ok([1, 2])                        | unit |
| 6   | `Result.allSettled(ok(1), err("a"), err("b"))` returns Err(["a", "b"])      | unit |
| 7   | `Result.allSettled(ok(1), err("a"), ok(3))` returns Err(["a"])              | unit |
| 8   | `Result.any(ok(1), err("a"))` returns Ok(1) (first success)                 | unit |
| 9   | `Result.any(err("a"), ok(2))` returns Ok(2)                                 | unit |
| 10  | `Result.any(err("a"), err("b"))` returns Err(["a", "b"])                    | unit |
| 11  | `Result.collect({ a: ok(1), b: ok("str") })` returns Ok({ a: 1, b: "str" }) | unit |
| 12  | `Result.collect({ a: ok(1), b: err("x") })` returns Err("x")                | unit |
| 13  | `Result.all` preserves tuple types (not widened to array)                   | unit |
| 14  | `Result.all` with array input (non-tuple) works correctly                   | unit |

### Type-Level Tests — `combining.test-d.ts`

| #   | Test                                                                                          | Type |
| --- | --------------------------------------------------------------------------------------------- | ---- |
| 1   | `Result.all(ok(1), ok("str"))` infers `Result<[number, string], never>`                       | type |
| 2   | `Result.all(ok(1), err("a"))` error type is union of all error types                          | type |
| 3   | `Result.allSettled(ok(1), ok("str"))` Ok type is tuple `[number, string]`                     | type |
| 4   | `Result.allSettled` error type is array of error union                                        | type |
| 5   | `Result.any` Ok type is union of all Ok types                                                 | type |
| 6   | `Result.any` error type is array of all error types                                           | type |
| 7   | `Result.collect({ a: ok(1), b: ok("str") })` infers `Result<{ a: number; b: string }, never>` | type |
| 8   | `Result.collect` error type is union of all record entry error types                          | type |

### Mutation Testing

**Target: >95% mutation score.** Short-circuit vs collect-all behavior between `all` and `allSettled` is critical -- mutations to loop control flow must be caught.

---

## DoD 8: ResultAsync (Spec Sections 40-44)

### Unit Tests — `result-async.test.ts`

| #   | Test                                                                           | Type |
| --- | ------------------------------------------------------------------------------ | ---- |
| 1   | `ResultAsync.ok(42)` resolves to Ok(42)                                        | unit |
| 2   | `ResultAsync.err("x")` resolves to Err("x")                                    | unit |
| 3   | `ResultAsync.fromPromise(Promise.resolve(42), mapErr)` resolves to Ok(42)      | unit |
| 4   | `ResultAsync.fromPromise(Promise.reject("x"), mapErr)` resolves to Err(mapped) | unit |
| 5   | `ResultAsync.fromSafePromise(Promise.resolve(42))` resolves to Ok(42)          | unit |
| 6   | ResultAsync never rejects, even when inner promise rejects                     | unit |
| 7   | `resultAsync.map(v => v * 2)` transforms Ok value                              | unit |
| 8   | `resultAsync.map(async v => v * 2)` accepts async transform                    | unit |
| 9   | `resultAsync.mapErr(e => e.toUpperCase())` transforms Err value                | unit |
| 10  | `resultAsync.andThen(v => ok(v + 1))` chains sync Result                       | unit |
| 11  | `resultAsync.andThen(v => ResultAsync.ok(v + 1))` chains async Result          | unit |
| 12  | `resultAsync.orElse(e => ok(99))` recovers from error                          | unit |
| 13  | `resultAsync.andTee(v => {})` calls side effect, returns original              | unit |
| 14  | `resultAsync.andTee(async v => {})` accepts async side effect                  | unit |
| 15  | `resultAsync.orTee(e => {})` calls side effect on Err                          | unit |
| 16  | `resultAsync.andThrough(v => ok("x"))` returns original on Ok                  | unit |
| 17  | `resultAsync.andThrough(v => err("fail"))` propagates Err                      | unit |
| 18  | `resultAsync.match(onOk, onErr)` returns Promise                               | unit |
| 19  | `resultAsync.unwrapOr(0)` returns Promise of value or default                  | unit |
| 20  | `resultAsync.toNullable()` returns Promise of value or null                    | unit |
| 21  | `resultAsync.intoTuple()` returns Promise of tuple                             | unit |
| 22  | `ResultAsync.all(ra1, ra2)` combines async results                             | unit |
| 23  | `ResultAsync.allSettled(ra1, ra2)` collects all errors                         | unit |
| 24  | `ResultAsync.any(ra1, ra2)` returns first success                              | unit |
| 25  | `ResultAsync.collect({ a: ra1, b: ra2 })` combines record                      | unit |
| 26  | `ResultAsync.fromThrowable(asyncFn, mapErr)` wraps async fn                    | unit |
| 27  | Chaining multiple async operations preserves error accumulation                | unit |

### Type-Level Tests — `result-async.test-d.ts`

| #   | Test                                                                          | Type |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1   | `ResultAsync.ok(42)` infers `ResultAsync<number, never>`                      | type |
| 2   | `ResultAsync.err("x")` infers `ResultAsync<never, string>`                    | type |
| 3   | `resultAsync.map(v => "str")` infers `ResultAsync<string, E>`                 | type |
| 4   | `resultAsync.andThen(v => ok(1))` accepts sync Result and returns ResultAsync | type |
| 5   | `resultAsync.andThen(v => ResultAsync.ok(1))` accepts ResultAsync             | type |
| 6   | Async `andThen` accumulates error types                                       | type |
| 7   | `ResultAsync.all(ra1, ra2)` infers tuple type for Ok                          | type |
| 8   | `ResultAsync.collect({...})` infers record type for Ok                        | type |

### Mutation Testing

**Target: >90% mutation score.** The never-rejects invariant and sync/async bridge behavior are critical.

---

## DoD 9: Generator-Based Early Return (Spec Sections 45-48)

### Unit Tests — `generators.test.ts`

| #   | Test                                                            | Type |
| --- | --------------------------------------------------------------- | ---- |
| 1   | `safeTry` sync: all Ok yields produce final Ok                  | unit |
| 2   | `safeTry` sync: first Err yield short-circuits                  | unit |
| 3   | `safeTry` sync: intermediate Ok values are extracted by yield\* | unit |
| 4   | `safeTry` sync: error type is union of all yielded Err types    | unit |
| 5   | `safeTry` async: all Ok yields produce final Ok                 | unit |
| 6   | `safeTry` async: first Err yield short-circuits                 | unit |
| 7   | `safeTry` async: can yield\* both Result and ResultAsync        | unit |
| 8   | `safeTry` async: returns ResultAsync                            | unit |
| 9   | Ok `[Symbol.iterator]` yields the Ok value                      | unit |
| 10  | Err `[Symbol.iterator]` yields early return with Err            | unit |
| 11  | Generator cleanup runs on early return                          | unit |
| 12  | Nested safeTry calls compose correctly                          | unit |

### Type-Level Tests — `generators.test-d.ts`

| #   | Test                                                 | Type |
| --- | ---------------------------------------------------- | ---- |
| 1   | `safeTry` sync return type is `Result<T, E>`         | type |
| 2   | `safeTry` async return type is `ResultAsync<T, E>`   | type |
| 3   | `yield*` on `Ok<number, never>` produces `number`    | type |
| 4   | Error types from multiple yields accumulate in union | type |

### Mutation Testing

**Target: >90% mutation score.** Short-circuit behavior on Err yield is the core invariant.

---

## DoD 10: Error Patterns (Spec Sections 49-52)

### Unit Tests — `error-patterns.test.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | Tagged error with `_tag` discriminant is created correctly                 | unit |
| 2   | `createError("NotFound")` returns factory producing `{ _tag: "NotFound" }` | unit |
| 3   | `createError("NotFound")` factory accepts and merges additional fields     | unit |
| 4   | `assertNever` throws on non-exhaustive match                               | unit |
| 5   | Switch on `error._tag` handles all variants exhaustively                   | unit |
| 6   | Error with `cause` chain preserves inner error reference                   | unit |
| 7   | `mapErr` transforms error from infrastructure to domain type               | unit |
| 8   | Error types compose via `andThen` union accumulation                       | unit |

### Type-Level Tests — `error-patterns.test-d.ts`

| #   | Test                                                                       | Type |
| --- | -------------------------------------------------------------------------- | ---- |
| 1   | `createError("NotFound")` return type has `{ readonly _tag: "NotFound" }`  | type |
| 2   | Factory with fields infers intersection of `_tag` and field types          | type |
| 3   | `assertNever` parameter type is `never` (enforces exhaustive checks)       | type |
| 4   | Error type union narrows correctly in switch on `_tag`                     | type |
| 5   | Error hierarchy (infra → domain → app) type compositions resolve correctly | type |

### Mutation Testing

**Target: >90% mutation score.** Error factory `_tag` assignment and exhaustive check enforcement are critical.

---

## DoD 11: HexDI Integration (Spec Sections 53-56)

### Integration Tests — `integration/hexdi-integration.test.ts`

| #   | Test                                                                               | Type        |
| --- | ---------------------------------------------------------------------------------- | ----------- |
| 1   | `resolveResult(container, port)` returns Ok for registered port                    | integration |
| 2   | `resolveResult(container, port)` returns Err(MissingAdapter) for unregistered port | integration |
| 3   | `resolveResult` Err has correct `_tag` discriminant                                | integration |
| 4   | `resolveResult` composes with `safeTry` for multi-resolution                       | integration |
| 5   | `recordResult(span, ok(42))` sets span status to "ok"                              | integration |
| 6   | `recordResult(span, err(e))` sets span status to "error" and records error tag     | integration |
| 7   | `recordResult` returns the result unchanged (pass-through)                         | integration |
| 8   | Inspector `getResultStatistics` tracks Ok/Err counts                               | integration |
| 9   | Inspector `getHighErrorRatePorts` filters by threshold                             | integration |
| 10  | Result events (result:ok, result:err) are emitted to inspector                     | integration |

### Type-Level Tests — `integration/hexdi-integration.test-d.ts`

| #   | Test                                                        | Type |
| --- | ----------------------------------------------------------- | ---- |
| 1   | `resolveResult` return type is `Result<T, ResolutionError>` | type |
| 2   | `ResolutionError` is a discriminated union with 5 variants  | type |
| 3   | Each `ResolutionError` variant narrows correctly in switch  | type |

### Mutation Testing

**Target: >85% mutation score.** Integration boundary — error mapping from container exceptions to ResolutionError must be complete.

---

## DoD 12: Testing Utilities (Spec Sections 57-60)

These tests verify the `@hex-di/result-testing` package itself.

### Unit Tests — `result-testing/tests/assertions.test.ts`

| #   | Test                                                                 | Type |
| --- | -------------------------------------------------------------------- | ---- |
| 1   | `expectOk(ok(42))` returns 42                                        | unit |
| 2   | `expectOk(err("x"))` throws with descriptive message                 | unit |
| 3   | `expectErr(err("x"))` returns "x"                                    | unit |
| 4   | `expectErr(ok(42))` throws with descriptive message                  | unit |
| 5   | `expectOkEqual(ok(42), 42)` passes                                   | unit |
| 6   | `expectOkEqual(ok(42), 43)` fails with diff message                  | unit |
| 7   | `expectErrEqual(err({_tag: "NotFound"}), {_tag: "NotFound"})` passes | unit |
| 8   | `expectOkAsync(ResultAsync.ok(42))` resolves to 42                   | unit |
| 9   | `expectErrAsync(ResultAsync.err("x"))` resolves to "x"               | unit |

### Unit Tests — `result-testing/tests/matchers.test.ts`

| #   | Test                                                                     | Type |
| --- | ------------------------------------------------------------------------ | ---- |
| 1   | `expect(ok(1)).toBeOk()` passes                                          | unit |
| 2   | `expect(err("x")).toBeOk()` fails with message                           | unit |
| 3   | `expect(err("x")).toBeErr()` passes                                      | unit |
| 4   | `expect(ok(1)).toBeErr()` fails with message                             | unit |
| 5   | `expect(ok(42)).toBeOkWith(42)` passes (deep equal)                      | unit |
| 6   | `expect(ok(42)).toBeOkWith(43)` fails with diff                          | unit |
| 7   | `expect(err({_tag: "NotFound"})).toBeErrWith({_tag: "NotFound"})` passes | unit |
| 8   | `expect(ok(5)).toBeOkSatisfying(v => v > 3)` passes                      | unit |
| 9   | `expect(ok(1)).toBeOkSatisfying(v => v > 3)` fails                       | unit |
| 10  | `expect(err("x")).toBeErrSatisfying(e => e === "x")` passes              | unit |
| 11  | Error messages include actual Result contents for debugging              | unit |

### Unit Tests — `result-testing/tests/mocks.test.ts`

| #   | Test                                                                  | Type |
| --- | --------------------------------------------------------------------- | ---- |
| 1   | `mockError("NotFound")` creates `{ _tag: "NotFound" }`                | unit |
| 2   | `mockError("NotFound", { id: "123" })` merges fields                  | unit |
| 3   | `mockResultSequence(err(e1), err(e2), ok(v))` returns values in order | unit |
| 4   | `mockResultSequence` throws when exhausted                            | unit |

### Property-Based Tests — `result-testing/tests/laws.property.test.ts`

| #   | Test                                                                                              | Type     |
| --- | ------------------------------------------------------------------------------------------------- | -------- |
| 1   | Functor identity: `result.map(x => x)` equals `result`                                            | property |
| 2   | Functor composition: `result.map(f).map(g)` equals `result.map(x => g(f(x)))`                     | property |
| 3   | Monad left identity: `ok(a).andThen(f)` equals `f(a)`                                             | property |
| 4   | Monad right identity: `result.andThen(ok)` equals `result`                                        | property |
| 5   | Monad associativity: `result.andThen(f).andThen(g)` equals `result.andThen(x => f(x).andThen(g))` | property |
| 6   | `okArb` always produces Ok                                                                        | property |
| 7   | `errArb` always produces Err                                                                      | property |
| 8   | `resultArb` produces both Ok and Err                                                              | property |

### Mutation Testing

**Target: >90% mutation score.** Testing utilities are the foundation for all other tests -- they must be reliable.

---

## DoD 13: JSON Serialization

### Unit Tests — `serialization.test.ts`

| #   | Test                                                                          | Type |
| --- | ----------------------------------------------------------------------------- | ---- |
| 1   | `ok(42).toJSON()` round-trips through `JSON.stringify/parse`                  | unit |
| 2   | `err({_tag: "NotFound"}).toJSON()` round-trips through `JSON.stringify/parse` | unit |
| 3   | Nested Result in Ok value serializes correctly                                | unit |
| 4   | `JSON.stringify(ok(42))` uses `toJSON()` automatically                        | unit |
| 5   | Serialized Ok has `_tag: "Ok"` and `value` field                              | unit |
| 6   | Serialized Err has `_tag: "Err"` and `error` field                            | unit |

---

## Test Count Summary

| Category             | Count    |
| -------------------- | -------- |
| Unit tests           | ~160     |
| Type-level tests     | ~65      |
| Integration tests    | ~10      |
| Property-based tests | ~8       |
| **Total**            | **~243** |

## Verification Checklist

Before marking the spec as "implemented," the following must all pass:

| Check                         | Command                                                                | Expected   |
| ----------------------------- | ---------------------------------------------------------------------- | ---------- |
| All unit tests pass           | `pnpm --filter @hex-di/result test`                                    | 0 failures |
| All type tests pass           | `pnpm --filter @hex-di/result test:types`                              | 0 failures |
| All integration tests pass    | `pnpm --filter @hex-di/result test -- --dir integration`               | 0 failures |
| All property tests pass       | `pnpm --filter @hex-di/result test -- --grep property`                 | 0 failures |
| Testing package tests pass    | `pnpm --filter @hex-di/result-testing test`                            | 0 failures |
| Typecheck passes              | `pnpm --filter @hex-di/result typecheck`                               | 0 errors   |
| Lint passes                   | `pnpm --filter @hex-di/result lint`                                    | 0 errors   |
| No `any` types in source      | `grep -r "any" packages/result/src/`                                   | 0 matches  |
| No type casts in source       | `grep -r " as " packages/result/src/`                                  | 0 matches  |
| No eslint-disable in source   | `grep -r "eslint-disable" packages/result/src/`                        | 0 matches  |
| No `Impl` in public API       | `grep -r "ResultAsyncImpl" packages/result/dist/`                      | 0 matches  |
| Mutation score (core types)   | `pnpm --filter @hex-di/result stryker -- --mutate src/core/**`         | >95%       |
| Mutation score (constructors) | `pnpm --filter @hex-di/result stryker -- --mutate src/constructors/**` | >95%       |
| Mutation score (methods)      | `pnpm --filter @hex-di/result stryker -- --mutate src/methods/**`      | >95%       |
| Mutation score (combining)    | `pnpm --filter @hex-di/result stryker -- --mutate src/combining/**`    | >95%       |
| Mutation score (generators)   | `pnpm --filter @hex-di/result stryker -- --mutate src/generators/**`   | >90%       |
| Mutation score (integration)  | `pnpm --filter @hex-di/result stryker -- --mutate src/integration/**`  | >85%       |

## Mutation Testing Strategy

### Why Mutation Testing Matters for @hex-di/result

Result types have a critical invariant: Ok and Err must behave differently for every method. A test suite that merely checks "method exists" or "does not throw" would miss mutations like:

- `map` calling the function on Err (should skip)
- `andThen` not short-circuiting on Err
- `andTee` propagating errors instead of swallowing them
- `all` continuing after first Err instead of short-circuiting
- `allSettled` short-circuiting instead of collecting all errors

Mutation testing catches these subtle behavioral inversions.

### Mutation Targets by Priority

| Priority | Module                                                  | Target Score | Rationale                                                                  |
| -------- | ------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| Critical | Core types (`Ok`, `Err`, `_tag`)                        | >95%         | Foundation of everything. Wrong discriminant = total failure.              |
| Critical | Constructors (`fromThrowable`, `fromPromise`, etc.)     | >95%         | Boundary between throwing and Result world. Must catch everything.         |
| Critical | Transformations + Chaining (`map`, `andThen`, `orElse`) | >95%         | Business logic chains depend on correct short-circuit behavior.            |
| Critical | Combining (`all`, `allSettled`, `any`, `collect`)       | >95%         | Short-circuit vs collect-all is the key distinction.                       |
| High     | Extraction (`match`, `unwrapOr`, `expect`)              | >95%         | Consumer-facing. Wrong extraction = wrong application behavior.            |
| High     | Generators (`safeTry`, yield protocol)                  | >90%         | Complex control flow. Short-circuit via yield is subtle.                   |
| Medium   | HexDI Integration                                       | >85%         | Integration boundary. Lower score acceptable due to external dependencies. |
| Medium   | Testing utilities                                       | >90%         | Must be reliable, but less business-critical than core.                    |

### Mutation Operators to Prioritize

- **Conditional boundary mutations**: `===` → `!==`, `>` → `>=` (catches guard logic)
- **Return value mutations**: `return Ok(x)` → `return Err(x)` (catches variant confusion)
- **Block removal**: Removing `if (this.isErr()) return this` (catches short-circuit removal)
- **Method call mutations**: `f(value)` → `f(error)` (catches wrong argument)

---

_Previous: [15 - Appendices](./15-appendices.md)_

_End of Definition of Done_
