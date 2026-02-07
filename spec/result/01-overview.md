# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/result` brings Rust-inspired error handling to the HexDI ecosystem. Every operation that can fail returns a typed `Result<T, E>` instead of throwing. Errors are values -- they can be mapped, chained, combined, inspected, and exhaustively handled at compile time.

There is no `try/catch`. There is no `throw`. There is no `null` meaning "something went wrong." Errors flow through the same channels as success values:

```typescript
import { ok, err, Result } from "@hex-di/result";

function divide(a: number, b: number): Result<number, DivisionByZeroError> {
  return b === 0 ? err({ _tag: "DivisionByZero", dividend: a }) : ok(a / b);
}

const result = divide(10, 0);
result.map(n => n * 2); // no-op: still Err
result.mapErr(e => e.dividend); // Err(10)
result.unwrapOr(0); // 0
```

### What this package provides

- **Result discriminated union** (`Ok<T>` | `Err<E>`) with a `_tag` discriminant for TypeScript narrowing
- **Method-chaining API** on both `Ok` and `Err` for transformations, chaining, and extraction
- **ResultAsync** wrapper for async operations with full method chaining (no more `await` at every step)
- **Generator-based early return** (`safeTry`) emulating Rust's `?` operator via `yield*`
- **Combinators** for parallel operations: `Result.all`, `Result.allSettled`, `Result.any`, `Result.collect`
- **Smart constructors** for interop: `fromThrowable`, `fromPromise`, `fromNullable`, `fromPredicate`, `tryCatch`
- **Error type accumulation** through `andThen` chains -- error unions grow automatically
- **Side-effect methods** for railway-oriented programming: `andTee`, `orTee`, `andThrough`
- **HexDI integration** for container resolution errors, tracing spans, and inspector reporting
- **Test utilities** in `@hex-di/result-testing` for assertion helpers and mock error factories

### What this package does NOT provide

- No thrown exceptions from any public API (except `expect` / `expectErr` which are explicitly escape hatches)
- No Option/Maybe type (use `Result<T, NoneError>` or TypeScript's native `T | undefined`)
- No `any` type in the public API surface -- full type safety throughout
- No type casting internally -- the implementation satisfies TypeScript without `as`
- No global error handling middleware
- No pattern matching engine (use TypeScript's native `switch` on `_tag` discriminants)

### 0.1.0 Scope

- `Result<T, E>` discriminated union with `Ok<T>` and `Err<E>` variants
- Full method-chaining API: `map`, `mapErr`, `mapBoth`, `andThen`, `orElse`, `match`, `unwrapOr`, etc.
- `ResultAsync<T, E>` with async-aware method chaining
- Generator-based early return (`safeTry`) for sync and async
- Combinators: `all`, `allSettled`, `any`, `collect` (tuples, arrays, and records)
- Smart constructors: `fromThrowable`, `fromPromise`, `fromSafePromise`, `fromNullable`, `fromPredicate`, `tryCatch`
- Side-effect methods: `andTee`, `orTee`, `andThrough`, `inspect`, `inspectErr`
- Extraction: `match`, `unwrapOr`, `unwrapOrElse`, `toNullable`, `toUndefined`, `intoTuple`, `merge`
- Error pattern utilities: tagged error factories, exhaustive handling helpers
- HexDI integration: container resolution as Result, tracing span recording, inspector error tracking
- Test utilities: `expectOk`, `expectErr`, `expectResultEqual`, mock error factories

## 2. Philosophy

### Errors are values

In most TypeScript codebases, errors are exceptions -- invisible, untyped, and unpredictable. A function's type signature says it returns `User`, but it might throw `NotFoundError`, `DatabaseError`, `ValidationError`, or `TypeError` from a forgotten null check. The caller has no way to know from the type system alone.

```typescript
// This signature lies. It can throw at least 4 different errors.
function getUser(id: string): User { ... }
```

In the Result paradigm, errors are part of the type signature:

```typescript
// This signature tells the truth.
function getUser(id: string): Result<User, NotFoundError | DatabaseError> { ... }
```

The caller sees exactly what can go wrong and must handle it. TypeScript's type system enforces exhaustive handling -- you cannot forget to handle `DatabaseError` because the compiler won't let you.

### Typed errors enable exhaustive handling

When errors are typed values in a discriminated union, TypeScript's exhaustiveness checking becomes your safety net:

```typescript
type AppError =
  | { readonly _tag: "NotFound"; readonly id: string }
  | { readonly _tag: "Validation"; readonly fields: string[] }
  | { readonly _tag: "Database"; readonly cause: Error };

function handleError(error: AppError): Response {
  switch (error._tag) {
    case "NotFound":
      return Response.json({ error: "Not found" }, { status: 404 });
    case "Validation":
      return Response.json({ errors: error.fields }, { status: 400 });
    case "Database":
      return Response.json({ error: "Internal error" }, { status: 500 });
  }
  // If you add a new error variant and forget to handle it here,
  // TypeScript produces a compile error. Zero runtime surprises.
}
```

### Composition over exception handling

Railway-oriented programming treats a computation as two parallel tracks: the success track and the error track. Each step either continues on the success track or diverts to the error track. Steps on the success track can fail (switching tracks), and steps on the error track can recover (switching back).

```
  ok(input) ──map──> ──andThen──> ──andThen──> ──map──> result
                 │            │            │
                 └──err──>────┴──err──>────┴──err──> error
```

This replaces nested `try/catch` blocks with a flat, composable pipeline:

```typescript
// Before: nested try/catch, untyped errors
try {
  const user = await getUser(id);
  try {
    const profile = await getProfile(user);
    try {
      const saved = await updateProfile(profile, changes);
      return { success: true, data: saved };
    } catch (e) {
      return { success: false, error: "Save failed" };
    }
  } catch (e) {
    return { success: false, error: "Profile not found" };
  }
} catch (e) {
  return { success: false, error: "User not found" };
}

// After: flat pipeline, typed errors
const result = await getUser(id)
  .andThen(getProfile)
  .andThen(profile => updateProfile(profile, changes));

return result.match(
  saved => ({ success: true, data: saved }),
  error => ({ success: false, error }) // error is fully typed
);
```

### No exceptions, no lies

The public API of `@hex-di/result` never throws. Methods like `map`, `andThen`, `unwrapOr` are total functions -- they produce a value for every input. The only exceptions are the explicit escape hatches `expect` and `expectErr`, which are clearly marked as "this will throw if the Result is the wrong variant" and are intended for tests and truly unreachable code paths.

This makes every function that returns `Result<T, E>` honest about its behavior. The type signature IS the documentation. There are no hidden failure modes.

### Self-aware errors

Following HexDI's vision of self-aware applications, `@hex-di/result` integrates with the container's nervous system:

- **Container resolution** can return `Result<T, ResolutionError>` instead of throwing, making DI failures composable
- **Tracing spans** automatically record Result outcomes (Ok/Err) with error details
- **Inspector** can aggregate error statistics across the dependency graph -- which adapters fail most, what error types are most common, where error recovery happens
- **Error metadata** can carry trace IDs, timestamps, and context for diagnostic reporting

The application doesn't just handle errors -- it knows about its own error patterns.

## 3. Package Structure

```
result/
  src/
    types/
      result.ts            # Result<T, E> discriminated union, Ok<T>, Err<E>
      result-async.ts      # ResultAsync<T, E> class
      error.ts             # Tagged error type utilities
      inference.ts         # InferOk<R>, InferErr<R>, InferAsyncOk<R>, InferAsyncErr<R>
      index.ts
    constructors/
      ok-err.ts            # ok(), err() constructor functions
      from-throwable.ts    # fromThrowable() wrapper
      from-promise.ts      # fromPromise(), fromSafePromise()
      from-nullable.ts     # fromNullable()
      from-predicate.ts    # fromPredicate()
      try-catch.ts         # tryCatch() sync wrapper
      index.ts
    methods/
      map.ts               # map, mapErr, mapBoth
      chain.ts             # andThen, orElse
      extract.ts           # unwrapOr, unwrapOrElse, match, expect, expectErr
      side-effects.ts      # andTee, orTee, andThrough, inspect, inspectErr
      convert.ts           # toNullable, toUndefined, intoTuple, merge, flatten, flip
      index.ts
    combinators/
      all.ts               # Result.all (short-circuit on first error)
      all-settled.ts       # Result.allSettled (collect all errors)
      any.ts               # Result.any (first success)
      collect.ts           # Result.collect (records/structs)
      index.ts
    async/
      result-async.ts      # ResultAsync class implementation
      constructors.ts      # fromPromise, fromSafePromise, fromAsyncThrowable
      combinators.ts       # ResultAsync.all, ResultAsync.allSettled, ResultAsync.any
      index.ts
    generators/
      safe-try.ts          # safeTry() for sync generators
      safe-try-async.ts    # safeTry() for async generators
      index.ts
    integration/
      container.ts         # Container resolution as Result
      tracing.ts           # Tracing span Result recording
      inspector.ts         # Inspector error statistics
      index.ts
    index.ts               # Public API

result-testing/
  src/
    assertions.ts          # expectOk, expectErr, expectResultEqual
    matchers.ts            # Vitest custom matchers
    factories.ts           # Mock error factories
    index.ts
```

## 4. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Application Code                           │
│                                                              │
│  const result = getUser(id)                                  │
│    .andThen(validateUser)      // Result<ValidUser, E1|E2>   │
│    .andThen(saveUser)          // Result<SavedUser, E1|E2|E3>│
│    .andTee(logSuccess)         // side effect on Ok          │
│    .mapErr(toAppError);        // normalize errors           │
│                                                              │
│  result.match(                                               │
│    (saved) => respond(200, saved),                           │
│    (error) => respond(error.status, error),                  │
│  );                                                          │
├──────────────────────────────────────────────────────────────┤
│                       @hex-di/result                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Result<T, E>                          │  │
│  │                                                        │  │
│  │  Ok<T>                          Err<E>                 │  │
│  │  ├─ _tag: "Ok"                  ├─ _tag: "Err"         │  │
│  │  ├─ value: T                    ├─ error: E            │  │
│  │  ├─ map, andThen, ...           ├─ map (no-op), ...    │  │
│  │  └─ isOk() → true              └─ isOk() → false      │  │
│  │                                                        │  │
│  │  Constructors: ok, err, fromThrowable, fromNullable,   │  │
│  │                fromPredicate, fromPromise, tryCatch     │  │
│  │                                                        │  │
│  │  Combinators:  all, allSettled, any, collect            │  │
│  │                                                        │  │
│  │  Generators:   safeTry (sync + async)                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              ResultAsync<T, E>                         │  │
│  │                                                        │  │
│  │  Wraps Promise<Result<T, E>> with method chaining      │  │
│  │  Implements PromiseLike<Result<T, E>> (thenable)       │  │
│  │  All Result methods mirrored for async context         │  │
│  │  map(f) accepts (T) => U | Promise<U>                 │  │
│  │  andThen(f) accepts Result<U,F> | ResultAsync<U,F>    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│             HexDI Integration (optional)                     │
│                                                              │
│  Container.resolveResult(port) → Result<T, ResolutionError>  │
│  Tracing: span.recordResult(result)                          │
│  Inspector: error frequency, error type distribution         │
├──────────────────────────────────────────────────────────────┤
│                @hex-di/core + @hex-di/runtime                │
│        Port<T, TName>  Adapter<...>  Container               │
└──────────────────────────────────────────────────────────────┘
```

### Dependency Graph

```
                @hex-di/result  (zero dependencies)
                      │
              ┌───────┼────────────┐
              ▼       ▼            ▼
        (optional)  @hex-di/    @hex-di/
        @hex-di/    result-     core
        tracing     testing
```

`@hex-di/result` has **zero runtime dependencies**. The HexDI integration module is optional -- it imports from `@hex-di/core` and `@hex-di/tracing` only when used. The core Result/ResultAsync types work standalone.

### Package Dependencies

| Package                  | Dependencies     | Peer Dependencies |
| ------------------------ | ---------------- | ----------------- |
| `@hex-di/result`         | none             | -                 |
| `@hex-di/result-testing` | `@hex-di/result` | `vitest >= 3.0`   |

---

_Next: [02 - Core Types](./02-core-types.md)_
