# 03 - Constructors

_Previous: [02 - Core Types](./02-core-types.md)_

---

## 9. ok / err

The fundamental constructors. Every Result starts here.

```typescript
function ok<T>(value: T): Ok<T, never>;
function err<E>(error: E): Err<never, E>;
```

`ok` creates an `Ok` variant with a success value. The error type starts as `never` -- it grows through `andThen` chains as error-producing operations are composed.

`err` creates an `Err` variant with an error value. The success type starts as `never` -- it widens through `orElse` chains as recovery operations are composed.

### Usage

```typescript
import { ok, err } from "@hex-di/result";

const success = ok(42); // Ok<number, never>
const failure = err("oops"); // Err<never, string>

// In a function:
function parseInt(s: string): Result<number, ParseError> {
  const n = Number(s);
  return Number.isNaN(n) ? err({ _tag: "ParseError", input: s }) : ok(n);
}
```

### Why `never` as the phantom type

Using `never` as the default phantom type is intentional:

- `Ok<number, never>` is assignable to `Result<number, E>` for any `E` -- an infallible success fits anywhere
- `Err<never, string>` is assignable to `Result<T, string>` for any `T` -- an error with no value fits anywhere
- Error types accumulate through `andThen`: `Result<A, never> | Result<B, E1>` collapses to `Result<A | B, E1>`

This is the same pattern as Rust where `Ok(42)` has type `Result<i32, !>` (the never type).

## 10. fromThrowable

Wraps a function that might throw into a function that returns a Result. This is the primary bridge from exception-based code.

```typescript
function fromThrowable<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>;

// Overload: wraps the function itself (returns a new function)
function fromThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => T,
  mapErr: (error: unknown) => E
): (...args: A) => Result<T, E>;
```

### Usage

```typescript
import { fromThrowable } from "@hex-di/result";

// Wrap a single call
const result = fromThrowable(
  () => JSON.parse(rawInput),
  e => ({ _tag: "ParseError" as const, cause: e })
);
// Type: Result<unknown, { _tag: "ParseError"; cause: unknown }>

// Wrap the function itself (reusable)
const safeJsonParse = fromThrowable(
  (input: string) => JSON.parse(input),
  e => ({ _tag: "ParseError" as const, cause: e })
);
// Type: (input: string) => Result<unknown, { _tag: "ParseError"; cause: unknown }>

const parsed = safeJsonParse('{"name": "Alice"}'); // Result<unknown, ParseError>
```

### Why `mapErr` is required

The thrown value in JavaScript is `unknown` -- it could be an Error, a string, a number, or anything. Requiring the caller to transform it into a typed error ensures every Result has meaningful error types.

```typescript
// BAD: This would produce Result<T, unknown> -- defeats the purpose
fromThrowable(() => JSON.parse(raw)); // Compile error: mapErr is required

// GOOD: Typed error
fromThrowable(
  () => JSON.parse(raw),
  cause => ({ _tag: "JsonParseError" as const, cause })
);
```

### Rejection of Promise-returning functions

If `fn` returns a Promise, the type signature rejects it at compile time. A Promise result would create `Result<Promise<T>, E>` which is never useful. Use `fromPromise` instead.

```typescript
// Type error: fn returns Promise, use fromPromise instead
fromThrowable(
  () => fetch("/api"),
  e => ({ _tag: "FetchError" as const })
);
```

## 11. fromPromise / fromSafePromise

Wraps a Promise into a ResultAsync. `fromPromise` handles rejection by mapping the error. `fromSafePromise` is for promises known to never reject.

```typescript
function fromPromise<T, E>(promise: Promise<T>, mapErr: (error: unknown) => E): ResultAsync<T, E>;

function fromSafePromise<T>(promise: Promise<T>): ResultAsync<T, never>;
```

### fromPromise

For promises that might reject:

```typescript
import { fromPromise } from "@hex-di/result";

const users = fromPromise(
  fetch("/api/users").then(r => r.json()),
  cause => ({ _tag: "FetchError" as const, cause })
);
// Type: ResultAsync<unknown, { _tag: "FetchError"; cause: unknown }>

// Awaitable:
const result = await users;
// Type: Result<unknown, { _tag: "FetchError"; cause: unknown }>
```

### fromSafePromise

For promises known to never reject (e.g., `Promise.resolve`, internal computations):

```typescript
import { fromSafePromise } from "@hex-di/result";

const config = fromSafePromise(loadConfig());
// Type: ResultAsync<Config, never>
```

### fromAsyncThrowable

Wraps an async function that might throw into a function that returns ResultAsync:

```typescript
function fromAsyncThrowable<A extends readonly unknown[], T, E>(
  fn: (...args: A) => Promise<T>,
  mapErr: (error: unknown) => E
): (...args: A) => ResultAsync<T, E>;
```

```typescript
const safeFetchUser = fromAsyncThrowable(
  async (id: string) => {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  cause => ({ _tag: "FetchError" as const, cause })
);

const result = await safeFetchUser("123");
// Type: Result<unknown, { _tag: "FetchError"; cause: unknown }>
```

## 12. fromNullable

Creates a Result from a nullable value. `null` and `undefined` become `Err`, everything else becomes `Ok`.

```typescript
function fromNullable<T, E>(value: T | null | undefined, onNullable: () => E): Result<T, E>;
```

### Usage

```typescript
import { fromNullable } from "@hex-di/result";

const users = new Map<string, User>();

const result = fromNullable(users.get("alice"), () => ({ _tag: "NotFound" as const, id: "alice" }));
// Type: Result<User, { _tag: "NotFound"; id: string }>

// In a chain:
function findUser(id: string): Result<User, NotFoundError> {
  return fromNullable(users.get(id), () => ({ _tag: "NotFound" as const, id }));
}
```

### Why a factory function for the error

`onNullable` is a function (not a value) for two reasons:

1. **Lazy evaluation** -- the error object is only created when the value is actually null
2. **Context** -- the factory can capture the context of what was null (ID, key, field name)

## 13. fromPredicate

Creates a Result based on a predicate. If the predicate returns `true`, the value becomes `Ok`. Otherwise, it becomes `Err`.

```typescript
function fromPredicate<T, E>(
  value: T,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E
): Result<T, E>;

// Overload with type guard predicate for narrowing:
function fromPredicate<T, U extends T, E>(
  value: T,
  predicate: (value: T) => value is U,
  onFalse: (value: T) => E
): Result<U, E>;
```

### Usage

```typescript
import { fromPredicate } from "@hex-di/result";

// Basic predicate
const result = fromPredicate(
  age,
  a => a >= 18,
  a => ({ _tag: "Underage" as const, age: a })
);
// Type: Result<number, { _tag: "Underage"; age: number }>

// Type guard predicate narrows the success type
interface Admin {
  role: "admin";
  permissions: string[];
}
interface User {
  role: string;
}

const adminResult = fromPredicate(
  user,
  (u): u is Admin => u.role === "admin",
  u => ({ _tag: "NotAdmin" as const, role: u.role })
);
// Type: Result<Admin, { _tag: "NotAdmin"; role: string }>
```

## 14. tryCatch

Executes a function and catches any thrown value, wrapping the outcome as a Result. Unlike `fromThrowable`, this executes the function immediately (not wrapping it).

```typescript
function tryCatch<T, E>(fn: () => T, mapErr: (error: unknown) => E): Result<T, E>;
```

### Usage

```typescript
import { tryCatch } from "@hex-di/result";

const config = tryCatch(
  () => JSON.parse(rawConfig),
  cause => ({ _tag: "ConfigParseError" as const, cause })
);
// Type: Result<unknown, { _tag: "ConfigParseError"; cause: unknown }>
```

### Difference from fromThrowable

|                            | `tryCatch`                    | `fromThrowable`                                       |
| -------------------------- | ----------------------------- | ----------------------------------------------------- |
| Executes `fn`              | Immediately                   | Depends on overload                                   |
| Single-call overload       | `tryCatch(fn, mapErr)`        | `fromThrowable(fn, mapErr)`                           |
| Function-wrapping overload | N/A                           | `fromThrowable(fn, mapErr)` returns reusable function |
| Use case                   | One-off try/catch replacement | Creating reusable safe wrappers                       |

```typescript
// tryCatch: execute now
const result = tryCatch(() => JSON.parse(raw), mapErr);

// fromThrowable: create a reusable safe function
const safeJsonParse = fromThrowable(JSON.parse, mapErr);
const result1 = safeJsonParse(raw1);
const result2 = safeJsonParse(raw2);
```

---

_Previous: [02 - Core Types](./02-core-types.md) | Next: [04 - Type Guards & Narrowing](./04-type-guards.md)_
