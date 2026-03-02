---
sidebar_position: 1
title: The Result Type
---

# The Result Type

The `Result<T, E>` type is the foundation of error handling in `@hex-di/result`. It represents an operation that can either succeed with a value of type `T` or fail with an error of type `E`.

## Core Structure

### `Result<T, E>`

A discriminated union of `Ok<T, E> | Err<T, E>`:

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

Both variants share a rich API of methods for transforming, combining, and extracting values.

### `Ok<T, E>` Variant

The success variant represents a successful operation.

**Properties:**

- `_tag: "Ok"` — Discriminator for pattern matching
- `value: T` — The success value

```typescript
const success: Ok<number, never> = {
  _tag: "Ok",
  value: 42,
};
```

### `Err<T, E>` Variant

The failure variant represents a failed operation.

**Properties:**

- `_tag: "Err"` — Discriminator for pattern matching
- `error: E` — The error value

```typescript
const failure: Err<never, string> = {
  _tag: "Err",
  error: "operation failed",
};
```

## Factory Functions

### `ok(value)`

Creates a success result.

```typescript
function ok<T>(value: T): Ok<T, never>;
```

The `ok` factory produces `Ok<T, never>` — the `E` phantom parameter widens to match any `E` in context.

```typescript
import { ok } from "@hex-di/result";

const result = ok(42);
result.isOk(); // true
result.value; // 42
```

### `err(error)`

Creates a failure result.

```typescript
function err<E>(error: E): Err<never, E>;
```

```typescript
import { err } from "@hex-di/result";

const result = err("not found");
result.isErr(); // true
result.error; // 'not found'
```

## Type Guards

### `isResult(value)`

Runtime type guard for synchronous results.

```typescript
import { isResult } from "@hex-di/result";

if (isResult(maybeResult)) {
  // maybeResult is Result<unknown, unknown>
  if (maybeResult.isOk()) {
    console.log(maybeResult.value);
  }
}
```

### `isResultAsync(value)`

Runtime type guard for `ResultAsync`.

```typescript
import { isResultAsync } from "@hex-di/result";

if (isResultAsync(maybeResult)) {
  // maybeResult is ResultAsync<unknown, unknown>
  const result = await maybeResult;
  console.log(result);
}
```

## Result Methods

Both `Ok` and `Err` implement the same method set — the behavior differs by variant.

### Type Guards

| Method                | Description                        |
| --------------------- | ---------------------------------- |
| `isOk()`              | `true` if Ok                       |
| `isErr()`             | `true` if Err                      |
| `isOkAnd(predicate)`  | `true` if Ok and predicate passes  |
| `isErrAnd(predicate)` | `true` if Err and predicate passes |

```typescript
const result = ok(5);
result.isOk(); // true
result.isOkAnd(n => n > 0); // true
result.isErr(); // false
```

### Transformations

| Method                 | Ok behavior                    | Err behavior         |
| ---------------------- | ------------------------------ | -------------------- |
| `map(f)`               | Applies `f` to value           | Returns self         |
| `mapErr(f)`            | Returns self                   | Applies `f` to error |
| `mapBoth(onOk, onErr)` | Applies `onOk`                 | Applies `onErr`      |
| `flatten()`            | Unwraps `Ok<Result<U, E2>, E>` | Returns self         |
| `flip()`               | Returns `Err(value)`           | Returns `Ok(error)`  |

```typescript
const result = ok(5)
  .map(n => n * 2) // Ok(10)
  .mapErr(e => `Error: ${e}`) // Ok(10) - no-op on Ok
  .mapBoth(
    n => n.toString(), // Applied: "10"
    e => e.toUpperCase() // Not applied
  ); // Ok("10")
```

### Chaining

| Method          | Ok behavior                                  | Err behavior                                 |
| --------------- | -------------------------------------------- | -------------------------------------------- |
| `andThen(f)`    | Calls `f(value)`                             | Returns self                                 |
| `orElse(f)`     | Returns self                                 | Calls `f(error)`                             |
| `andTee(f)`     | Calls `f(value)` (side-effect), returns self | Returns self                                 |
| `orTee(f)`      | Returns self                                 | Calls `f(error)` (side-effect), returns self |
| `andThrough(f)` | Calls `f(value)`, propagates Err if it fails | Returns self                                 |
| `inspect(f)`    | Calls `f(value)`, returns self               | Returns self                                 |
| `inspectErr(f)` | Returns self                                 | Calls `f(error)`, returns self               |

```typescript
const result = ok(5)
  .andThen(n => ok(n * 2)) // Ok(10)
  .andTee(n => console.log(`Value: ${n}`)) // Logs: "Value: 10"
  .orElse(e => ok(0)); // Ok(10) - no-op on Ok
```

### Logical Combinators

| Method       | Ok behavior     | Err behavior    |
| ------------ | --------------- | --------------- |
| `and(other)` | Returns `other` | Returns self    |
| `or(other)`  | Returns self    | Returns `other` |

```typescript
ok(5).and(ok(10)); // Ok(10)
ok(5).and(err("fail")); // Err("fail")
err("first").or(ok(10)); // Ok(10)
err("first").or(err("second")); // Err("second")
```

### Extraction

| Method                   | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `match(onOk, onErr)`     | Pattern match — returns `onOk(value)` or `onErr(error)` |
| `unwrapOr(default)`      | Returns value or default                                |
| `unwrapOrElse(f)`        | Returns value or `f(error)`                             |
| `mapOr(default, f)`      | Returns `f(value)` or default                           |
| `mapOrElse(defaultF, f)` | Returns `f(value)` or `defaultF(error)`                 |
| `contains(value)`        | `true` if Ok and value matches                          |
| `containsErr(error)`     | `true` if Err and error matches                         |
| `expect(message)`        | Returns value or throws with message                    |
| `expectErr(message)`     | Returns error or throws with message                    |

```typescript
const result: Result<number, string> = ok(5);

result.match(
  value => `Success: ${value}`,
  error => `Failed: ${error}`
); // "Success: 5"

result.unwrapOr(0); // 5
result.unwrapOrElse(e => -1); // 5
result.contains(5); // true
```

### Conversion

| Method          | Ok                                         | Err                                         |
| --------------- | ------------------------------------------ | ------------------------------------------- |
| `toNullable()`  | `value`                                    | `null`                                      |
| `toUndefined()` | `value`                                    | `undefined`                                 |
| `intoTuple()`   | `[null, value]`                            | `[error, null]`                             |
| `merge()`       | `value`                                    | `error`                                     |
| `toOption()`    | `Some(value)`                              | `None`                                      |
| `toOptionErr()` | `None`                                     | `Some(error)`                               |
| `toJSON()`      | `{ _tag: "Ok", _schemaVersion: 1, value }` | `{ _tag: "Err", _schemaVersion: 1, error }` |

```typescript
ok(5).toNullable(); // 5
err("fail").toNullable(); // null

ok(5).intoTuple(); // [null, 5]
err("fail").intoTuple(); // ["fail", null]

ok(5).toOption(); // Some(5)
err("fail").toOption(); // None
```

### Async Bridges

| Method            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `toAsync()`       | Wraps in `ResultAsync`                         |
| `asyncMap(f)`     | Maps with an async function                    |
| `asyncAndThen(f)` | Chains with a function returning `ResultAsync` |

```typescript
const result = ok(5)
  .asyncMap(async n => n * 2) // ResultAsync<number, never>
  .then(r => console.log(r)); // Ok(10)
```

## Generator Protocol

`Result` implements `[Symbol.iterator]`, enabling use inside `safeTry`:

```typescript
import { safeTry, ok, err } from "@hex-di/result";

const result = safeTry(function* () {
  const a = yield* ok(10); // 10
  const b = yield* err("!"); // short-circuits here
  return ok(a + b); // never reached
});
// result = err('!')
```

Each `yield*` unwraps the Ok value or short-circuits the generator on Err, providing a linear flow for sequential operations that may fail.
