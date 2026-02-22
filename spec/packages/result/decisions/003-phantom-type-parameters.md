# ADR-003: Phantom Type Parameters

## Status

Accepted

## Context

`Result<T, E> = Ok<T, E> | Err<T, E>` requires both type parameters on both variants. However:
- An `Ok` has no `error` property — `E` has no runtime representation
- An `Err` has no `value` property — `T` has no runtime representation

When creating concrete values, the "absent" type parameter must be something. The options:

1. **`unknown`** — `ok<T>(value: T): Ok<T, unknown>`. Requires explicit annotation to compose: `const r: Result<number, string> = ok(42)` works but `ok(42)` alone is `Ok<number, unknown>`.
2. **`never`** — `ok<T>(value: T): Ok<T, never>`. Since `never` extends every type, `Ok<number, never>` is assignable to `Ok<number, string>`, `Ok<number, Error>`, etc.

## Decision

`ok()` returns `Ok<T, never>` and `err()` returns `Err<never, E>`. The absent parameter defaults to `never`.

```ts
function ok<T>(value: T): Ok<T, never>
function err<E>(error: E): Err<never, E>
```

## Consequences

**Positive**:
- Free composition without annotations:
  ```ts
  const result: Result<number, string> = condition ? ok(42) : err("fail");
  // Ok<number, never> and Err<never, string> both assignable to Result<number, string>
  ```
- `andThen` chains accumulate error types naturally: `Result<U, E | F>` because `never | F = F`
- No need for explicit type parameters on `ok()` or `err()` calls

**Negative**:
- The `E` on `Ok` and `T` on `Err` are phantom types — they exist only in the type system. This can be confusing for developers unfamiliar with the pattern.
- TypeScript's `never` can cause unintuitive behavior in some generic contexts (e.g., conditional types that distribute over `never`). The library's type utilities account for this.
