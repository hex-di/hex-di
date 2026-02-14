# GxP Compliance Analysis Report: @hex-di/result

**Package:** `@hex-di/result` (v0.1.0) + `@hex-di/result-testing` (v0.1.0)
**Date:** 2026-02-10
**Analyst:** Automated GxP Compliance Review
**Overall Score:** 9.0 / 10.0

---

## 1. Executive Summary

`@hex-di/result` is a Rust-style `Result<T, E>` type for TypeScript that models success and failure as values rather than exceptions. It is the highest-scoring package in the HexDi monorepo for GxP compliance, achieving **9.0 / 10.0**.

**Key strengths:**

- Immutable, frozen error objects via `createError()` + `Object.freeze()` ensure data integrity once created
- Discriminated unions with `_tag: "Ok" | "Err"` provide compile-time exhaustiveness guarantees
- `assertNever()` enforces exhaustive error handling at both compile time and runtime
- `andThen` chains accumulate error types as `Result<U, E | F>`, preventing silent error omission
- `toJSON()` serialization on every Result enables structured audit logging
- `ResultAsync` maintains the invariant that its internal promise NEVER rejects
- Zero type casts (`as`) across the entire source codebase (1,286 lines of production code)
- 2,637 lines of tests across 22 test files, including 10 type-level test files (`.test-d.ts`)
- Mutation testing configured via Stryker with a 70% break threshold
- Dedicated testing companion package (`@hex-di/result-testing`) with custom Vitest matchers

**Risk areas:**

- No runtime immutability on Ok/Err objects themselves (only `createError()` output is frozen)
- No built-in logging/tracing hooks within Result chains (must use `inspect`/`inspectErr` manually)
- `andTee`/`orTee` silently swallow exceptions from side-effect callbacks

---

## 2. Package Overview

### 2.1 Architecture

The package follows a modular, functional architecture with zero class inheritance for the core `Result` type:

| Module                   | Files | Lines | Purpose                                                                     |
| ------------------------ | ----- | ----- | --------------------------------------------------------------------------- |
| `core/types.ts`          | 1     | 146   | Discriminated union type definitions (`Ok<T,E>`, `Err<T,E>`, `Result<T,E>`) |
| `core/result.ts`         | 1     | 298   | `ok()` and `err()` factory functions (plain objects with closures)          |
| `core/guards.ts`         | 1     | 37    | Standalone type guards `isResult()`, `isResultAsync()`                      |
| `async/result-async.ts`  | 1     | 334   | `ResultAsync<T,E>` class wrapping `Promise<Result<T,E>>`                    |
| `constructors/`          | 5     | 117   | `fromThrowable`, `fromNullable`, `fromPredicate`, `tryCatch`, `fromPromise` |
| `combinators/`           | 4     | 104   | `all`, `allSettled`, `any`, `collect`                                       |
| `generators/safe-try.ts` | 1     | 89    | Generator-based `safeTry` (Rust `?` operator emulation)                     |
| `errors/`                | 2     | 29    | `createError()` factory, `assertNever()` exhaustiveness check               |
| `type-utils.ts`          | 1     | 56    | Utility types (`InferOk`, `InferErr`, `FlattenResult`, etc.)                |
| `index.ts`               | 1     | 75    | Public API barrel exports                                                   |

**Total production code:** 1,286 lines across 18 source files.

### 2.2 Design Principles

- **Errors as values**: No thrown exceptions in normal control flow
- **Structural typing**: `Ok`/`Err` are interfaces, not classes -- implemented as plain objects with method closures
- **Phantom type parameters**: `ok(42)` returns `Ok<number, never>`, where `never` is assignable to any error type
- **No type casts**: The codebase contains zero uses of `as` type assertions in production code
- **Lazy circular-dependency resolution**: `ResultAsync` registration uses a setter pattern (`_setResultAsyncImpl`) to avoid module-load-time circular imports

### 2.3 Companion Package: @hex-di/result-testing

`@hex-di/result-testing` provides testing utilities:

- `expectOk(result)` -- asserts Ok and returns typed value
- `expectErr(result)` -- asserts Err and returns typed error
- `expectOkAsync(resultAsync)` -- async variant
- `expectErrAsync(resultAsync)` -- async variant
- `setupResultMatchers()` -- registers custom Vitest matchers (`toBeOk()`, `toBeErr()`)
- Full module augmentation for Vitest's `Assertion<T>` interface

---

## 3. GxP Compliance Matrix

| #   | Criterion                       | Score | Status | Key Evidence                                                            |
| --- | ------------------------------- | ----- | ------ | ----------------------------------------------------------------------- |
| 1   | Data Integrity (ALCOA+)         | 9.5   | PASS   | Frozen error objects, `_tag` discriminant, `toJSON()` serialization     |
| 2   | Traceability & Audit Trail      | 8.5   | PASS   | `toJSON()` on all Results, `inspect`/`inspectErr` for chain observation |
| 3   | Determinism & Reproducibility   | 9.5   | PASS   | Pure functional transformations, no shared mutable state                |
| 4   | Error Handling & Recovery       | 9.5   | PASS   | `assertNever()`, union accumulation, exhaustive `match`                 |
| 5   | Validation & Input Verification | 9.5   | PASS   | Compile-time type enforcement, type-level tests, zero casts             |
| 6   | Change Control & Versioning     | 8.5   | PASS   | Well-defined public API via barrel exports, semver                      |
| 7   | Testing & Verification          | 9.5   | PASS   | 2,637 test lines, 22 files, type-level tests, Stryker mutation testing  |
| 8   | Security                        | 8.5   | PASS   | No `eval`, no dynamic imports, `Object.freeze` on errors                |
| 9   | Documentation                   | 8.5   | PASS   | JSDoc on all public APIs, `@packageDocumentation` tags                  |
| 10  | Compliance-Specific Patterns    | 9.0   | PASS   | Prevents unhandled errors by design, enforces explicit handling         |

**Weighted Average: 9.0 / 10.0**

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- 9.5/10

**Attributable:** Every `Result` carries an unambiguous `_tag: "Ok" | "Err"` discriminant that identifies its variant. The tag is a readonly property on the interface:

```typescript
// From: packages/result/src/core/types.ts (lines 44-46)
export interface Ok<T, E> {
  readonly _tag: "Ok";
  readonly value: T;
  // ...
}

export interface Err<T, E> {
  readonly _tag: "Err";
  readonly error: E;
  // ...
}
```

**Legible:** `toJSON()` produces a structured, machine-readable representation with the `_tag` discriminant preserved:

```typescript
// From: packages/result/src/core/result.ts (lines 165-167)
// Inside ok() factory:
toJSON() {
  return { _tag: "Ok", value };
},

// From: packages/result/src/core/result.ts (lines 286-288)
// Inside err() factory:
toJSON() {
  return { _tag: "Err", error };
},
```

**Complete & Contemporaneous:** Error objects created via `createError()` are frozen at creation time, preventing post-hoc mutation:

```typescript
// From: packages/result/src/errors/create-error.ts (lines 9-17)
export function createError<Tag extends string>(
  tag: Tag
): <Fields extends Record<string, unknown>>(fields: Fields) => Readonly<{ _tag: Tag } & Fields> {
  return <Fields extends Record<string, unknown>>(
    fields: Fields
  ): Readonly<{ _tag: Tag } & Fields> => {
    return Object.freeze({ _tag: tag, ...fields });
  };
}
```

**Test verification:**

```typescript
// From: packages/result/tests/error-patterns.test.ts (lines 33-37)
it("createError factory produces frozen (immutable) objects", () => {
  const NotFound = createError("NotFound");
  const error = NotFound({ id: "123" });
  expect(Object.isFrozen(error)).toBe(true);
});
```

**Gap:** The `ok()` and `err()` factory functions do not `Object.freeze()` the returned Result objects themselves. While the `readonly` modifier provides compile-time protection, runtime mutation of a Result's `value` or `error` field is technically possible through non-TypeScript access paths. This is a minor gap because the `readonly` interface constraint blocks all standard TypeScript usage.

### 4.2 Traceability & Audit Trail -- 8.5/10

Every Result supports serialization for audit logging via `toJSON()`, which works on both sync and async variants:

```typescript
// From: packages/result/src/async/result-async.ts (lines 323-326)
async toJSON(): Promise<{ _tag: "Ok"; value: T } | { _tag: "Err"; error: E }> {
  const result = await this.#promise;
  return result.toJSON();
}
```

The `inspect()` and `inspectErr()` methods allow observation of values flowing through a chain without modifying them:

```typescript
// From: packages/result/src/core/result.ts (lines 114-119)
// Inside ok() factory:
inspect(f) {
  f(value);
  return self;
},
inspectErr() {
  return self;
},
```

**JSON.stringify integration is tested:**

```typescript
// From: packages/result/tests/serialization.test.ts (lines 16-22)
it("JSON.stringify integration with Ok", () => {
  const result = ok({ name: "Alice", age: 30 });
  const json = JSON.stringify(result);
  const parsed = JSON.parse(json);
  expect(parsed._tag).toBe("Ok");
  expect(parsed.value).toEqual({ name: "Alice", age: 30 });
});
```

**Gap:** There is no built-in correlation ID or timestamp mechanism on Result chains. Applications must add their own trace context using `inspect()` or by wrapping error types with trace metadata.

### 4.3 Determinism & Reproducibility -- 9.5/10

All `Result` operations are pure functional transformations with no shared mutable state:

- `map`, `mapErr`, `mapBoth` -- pure value transformations
- `andThen`, `orElse` -- monadic chaining without side effects
- `flatten`, `flip` -- structural transformations
- Combinators (`all`, `allSettled`, `any`, `collect`) -- deterministic iteration over inputs

The `ok()` and `err()` factories create fresh plain objects on each invocation, with method closures capturing the value/error. No global state is read or modified during Result operations.

```typescript
// From: packages/result/src/core/result.ts (lines 53-55)
export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = {
    _tag: "Ok",
    value,
    // ... all methods are closures over `value` and `self`
```

`ResultAsync` wraps a `Promise<Result<T, E>>` with a private `#promise` field and constructs all derived `ResultAsync` instances via `new ResultAsync(promise.then(...))`, ensuring the never-reject invariant is maintained through all transformations:

```typescript
// From: packages/result/src/async/result-async.ts (lines 30-37)
/**
 * Invariant: the internal promise NEVER rejects.
 */
export class ResultAsync<T, E> implements ResultAsyncType<T, E> {
  readonly #promise: Promise<Result<T, E>>;

  private constructor(promise: Promise<Result<T, E>>) {
    this.#promise = promise;
  }
```

### 4.4 Error Handling & Recovery -- 9.5/10

This is the package's strongest compliance area. Multiple reinforcing mechanisms prevent unhandled errors:

**Exhaustive handling with `assertNever()`:**

```typescript
// From: packages/result/src/errors/assert-never.ts (lines 10-12)
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
```

**Union accumulation through `andThen` chains** -- error types accumulate as `E | F`, making it impossible to silently drop error variants:

```typescript
// From: packages/result/src/core/types.ts (lines 62, 16)
// Ok interface:
andThen<U, F>(f: (value: T) => Result<U, F>): Result<U, E | F>;

// ResultAsync interface:
andThen<U, F>(f: (value: T) => Result<U, F>): ResultAsync<U, E | F>;
```

**Tested with multi-step chains:**

```typescript
// From: packages/result/tests/error-patterns.test.ts (lines 127-148)
it("Error types compose via andThen union accumulation", () => {
  type E1 = { _tag: "E1" };
  type E2 = { _tag: "E2" };
  type E3 = { _tag: "E3" };

  function step1(): Result<number, E1> {
    return ok(1);
  }
  function step2(n: number): Result<string, E2> {
    return ok(String(n));
  }
  function step3(_s: string): Result<boolean, E3> {
    return err({ _tag: "E3" });
  }

  const result = step1().andThen(step2).andThen(step3);
  expect(result._tag).toBe("Err");
  if (result.isErr()) {
    expect(result.error._tag).toBe("E3");
  }
});
```

**Type-level verification that error types accumulate:**

```typescript
// From: packages/result/tests/chaining.test-d.ts (lines 22-31)
it("Three andThen calls accumulate three error types in union", () => {
  type E1 = { _tag: "E1" };
  type E2 = { _tag: "E2" };
  type E3 = { _tag: "E3" };
  const r: Result<number, E1> = ok(1);
  const result = r
    .andThen((): Result<string, E2> => ok("x"))
    .andThen((): Result<boolean, E3> => ok(true));
  expectTypeOf(result).toMatchTypeOf<Result<boolean, E1 | E2 | E3>>();
});
```

**Switch-based exhaustive handling with runtime enforcement:**

```typescript
// From: packages/result/tests/error-patterns.test.ts (lines 75-95)
it("Switch on error._tag handles all variants exhaustively", () => {
  type AppError =
    | { _tag: "NotFound"; id: string }
    | { _tag: "Validation"; field: string }
    | { _tag: "Database"; cause: string };

  function toStatus(error: AppError): number {
    switch (error._tag) {
      case "NotFound":
        return 404;
      case "Validation":
        return 422;
      case "Database":
        return 500;
    }
  }

  expect(toStatus({ _tag: "NotFound", id: "1" })).toBe(404);
  expect(toStatus({ _tag: "Validation", field: "email" })).toBe(422);
  expect(toStatus({ _tag: "Database", cause: "timeout" })).toBe(500);
});
```

**`match()` forces explicit handling of both variants:**

```typescript
// From: packages/result/src/core/types.ts (lines 71-72)
// Ok interface:
match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A;

// From: packages/result/src/core/types.ts (lines 122)
// Err interface:
match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): B;
```

### 4.5 Validation & Input Verification -- 9.5/10

Type safety is enforced entirely at compile time with zero runtime overhead for type checking:

**Constructors validate inputs via type system:**

```typescript
// From: packages/result/src/constructors/from-predicate.ts (lines 8-12)
export function fromPredicate<T, U extends T, E>(
  value: T,
  predicate: (value: T) => value is U,
  onFalse: (value: T) => E
): Result<U, E>;
```

**Structural type guards for runtime checking (no `instanceof`):**

```typescript
// From: packages/result/src/core/guards.ts (lines 7-19)
export function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if ("_tag" in value && "value" in value && value._tag === "Ok") {
    return true;
  }
  if ("_tag" in value && "error" in value && value._tag === "Err") {
    return true;
  }
  return false;
}
```

**10 type-level test files** verify compile-time type behavior:

```typescript
// From: packages/result/tests/error-patterns.test-d.ts (lines 9-14)
it("createError('NotFound') return type has { readonly _tag: 'NotFound' }", () => {
  const NotFound = createError("NotFound");
  const error = NotFound({ resource: "User" });
  expectTypeOf(error).toHaveProperty("_tag");
  expectTypeOf(error._tag).toEqualTypeOf<"NotFound">();
});
```

**Comprehensive type utility library** for type-level programming:

```typescript
// From: packages/result/src/type-utils.ts (lines 4-9)
/** Extract the success type from a Result */
export type InferOk<R> =
  R extends Result<infer T, unknown> ? T : R extends ResultAsync<infer T, unknown> ? T : never;

/** Extract the error type from a Result */
export type InferErr<R> =
  R extends Result<unknown, infer E> ? E : R extends ResultAsync<unknown, infer E> ? E : never;
```

### 4.6 Change Control & Versioning -- 8.5/10

The package has a well-defined public API surface controlled through barrel exports:

```typescript
// From: packages/result/src/index.ts (lines 11-75)
// Core Types
export type { Result, Ok, Err } from "./core/types.js";

// Factories
export { ok, err } from "./core/result.js";
export { isResult, isResultAsync } from "./core/guards.js";

// Constructors
export { fromThrowable } from "./constructors/from-throwable.js";
export { fromNullable } from "./constructors/from-nullable.js";
export { fromPredicate } from "./constructors/from-predicate.js";
export { tryCatch } from "./constructors/try-catch.js";
export { fromPromise, fromSafePromise, fromAsyncThrowable } from "./constructors/from-promise.js";

// ResultAsync
export { ResultAsync } from "./async/result-async.js";

// Combinators
export { all } from "./combinators/all.js";
export { allSettled } from "./combinators/all-settled.js";
export { any } from "./combinators/any.js";
export { collect } from "./combinators/collect.js";

// Generators
export { safeTry } from "./generators/safe-try.js";

// Error Patterns
export { createError } from "./errors/create-error.js";
export { assertNever } from "./errors/assert-never.js";

// Type Utilities (type-only exports)
export type { InferOk, InferErr, InferAsyncOk, InferAsyncErr /* ... */ } from "./type-utils.js";
```

Internal functions like `_setResultAsyncImpl` and `_ResultAsyncImpl` are prefixed with underscore and not exported from the barrel, maintaining a clean public API boundary.

The package uses `package.json` `exports` field for dual ESM/CJS support:

```json
"exports": {
  ".": {
    "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
  }
}
```

### 4.7 Testing & Verification -- 9.5/10

This is one of the most thoroughly tested packages in the monorepo.

**Test coverage summary:**

| Test Category   | Files  | Lines     | Description                                                                                                   |
| --------------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------- |
| Core types      | 2      | 170       | Ok/Err construction, `_tag` discriminant, structural distinctness                                             |
| Type guards     | 2      | 264       | `isOk`, `isErr`, `isOkAnd`, `isErrAnd`, `isResult`, `isResultAsync`                                           |
| Transformations | 2      | 170       | `map`, `mapErr`, `mapBoth`, `flatten`, `flip`                                                                 |
| Chaining        | 2      | 294       | `andThen`, `orElse`, `andTee`, `orTee`, `andThrough`, `inspect`, `inspectErr`                                 |
| Extraction      | 2      | 193       | `match`, `unwrapOr`, `unwrapOrElse`, `toNullable`, `toUndefined`, `intoTuple`, `merge`, `expect`, `expectErr` |
| Constructors    | 2      | 235       | `fromThrowable`, `fromNullable`, `fromPredicate`, `tryCatch`                                                  |
| Combining       | 2      | 197       | `all`, `allSettled`, `any`, `collect`                                                                         |
| ResultAsync     | 2      | 499       | All async variants of transformations, chaining, extraction                                                   |
| Generators      | 2      | 273       | `safeTry` sync/async, `Symbol.iterator` protocol, cleanup                                                     |
| Error patterns  | 2      | 219       | `createError`, `assertNever`, exhaustive matching, union accumulation                                         |
| Serialization   | 1      | 48        | `toJSON`, `JSON.stringify` integration                                                                        |
| result-testing  | 1      | 75        | Custom matchers: `toBeOk`, `toBeErr`, `expectOk`, `expectErr`                                                 |
| **Total**       | **22** | **2,637** |                                                                                                               |

**Type-level tests** (10 `.test-d.ts` files) verify compile-time behavior using `expectTypeOf`:

```typescript
// From: packages/result/tests/chaining.test-d.ts (lines 13-19)
it("andThen accumulates error types", () => {
  type A = { _tag: "A" };
  type B = { _tag: "B" };
  const r: Result<number, A> = ok(1);
  const result = r.andThen((): Result<string, B> => ok("x"));
  expectTypeOf(result).toMatchTypeOf<Result<string, A | B>>();
});
```

**Mutation testing** is configured via Stryker with the Vitest runner:

```json
// From: packages/result/stryker.config.json
{
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.test-d.ts",
    "!src/**/index.ts",
    "!src/types/**"
  ],
  "thresholds": {
    "high": 80,
    "low": 70,
    "break": 70
  }
}
```

**Mutation gap tests** are explicitly labeled in test files (e.g., `// --- Mutation gap: ...`), indicating that specific tests were added to kill surviving mutants. Examples include:

- Boundary tests for `isResult` with malformed objects
- `andTee`/`orTee` error swallowing verification
- Iterator protocol edge cases (Ok `return()`, `throw()`, Err second `next()`)
- `inspect`/`inspectErr` return value identity on both variants

### 4.8 Security -- 8.5/10

**No dynamic code execution:** The package contains no `eval()`, `Function()`, or dynamic `import()` calls.

**Frozen error objects:** `createError()` uses `Object.freeze()` to prevent tampering with error metadata after creation.

**Private state in ResultAsync:** The internal promise is stored in a private field using ES2022 `#promise` syntax, inaccessible from outside the class:

```typescript
// From: packages/result/src/async/result-async.ts (lines 33-37)
export class ResultAsync<T, E> implements ResultAsyncType<T, E> {
  readonly #promise: Promise<Result<T, E>>;

  private constructor(promise: Promise<Result<T, E>>) {
    this.#promise = promise;
  }
```

**Promise rejection safety:** `fromPromise` maps rejected promises to `Err` values, preventing unhandled rejections:

```typescript
// From: packages/result/src/async/result-async.ts (lines 49-56)
static fromPromise<T, E>(promise: Promise<T>, mapErr: (error: unknown) => E): ResultAsync<T, E> {
  return new ResultAsync(
    promise.then(
      (value): Result<T, E> => ok(value),
      (error: unknown): Result<T, E> => err(mapErr(error))
    )
  );
}
```

**No dependencies:** The `@hex-di/result` package has zero runtime dependencies. The only devDependencies are `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`.

### 4.9 Documentation -- 8.5/10

All public APIs have JSDoc comments with `@param`, `@returns`, and usage examples:

```typescript
// From: packages/result/src/errors/create-error.ts (lines 1-8)
/**
 * Type-safe factory for creating tagged error constructors.
 *
 * Usage:
 *   const NotFound = createError("NotFound");
 *   const error = NotFound({ resource: "User", id: "123" });
 *   // Type: { readonly _tag: "NotFound"; readonly resource: string; readonly id: string }
 */
```

```typescript
// From: packages/result/src/errors/assert-never.ts (lines 1-9)
/**
 * Exhaustiveness check helper.
 * Call in the default branch of a switch statement to ensure all
 * variants of a discriminated union are handled.
 *
 * If a new variant is added to the union and not handled, TypeScript
 * reports: "Argument of type 'NewVariant' is not assignable to parameter
 * of type 'never'."
 */
```

```typescript
// From: packages/result/src/async/result-async.ts (lines 25-31)
/**
 * ResultAsync<T, E> wraps a Promise<Result<T, E>> and provides
 * method chaining for async operations. Implements PromiseLike
 * so it can be awaited directly.
 *
 * Invariant: the internal promise NEVER rejects.
 */
```

The `result-testing` package includes usage examples in its matcher documentation:

````typescript
// From: packages/result-testing/src/matchers.ts (lines 73-86)
/**
 * Usage:
 * ```typescript
 * import { setupResultMatchers } from "@hex-di/result-testing";
 *
 * setupResultMatchers();
 *
 * expect(ok(42)).toBeOk();
 * expect(ok(42)).toBeOk(42);
 * expect(err("fail")).toBeErr();
 * expect(err("fail")).toBeErr("fail");
 * ```
 */
````

**Gap:** No standalone API reference documentation or migration guide exists outside of JSDoc. A dedicated docs site or markdown API reference would improve discoverability.

### 4.10 Compliance-Specific Patterns -- 9.0/10

**Prevents unhandled errors by design:**

The Result type makes error handling explicit at every step. Unlike exceptions that silently propagate up the call stack, a `Result<T, E>` forces the caller to acknowledge the error type `E` at compile time. There is no `unwrap()` method that could panic -- only safe extraction methods like `match()`, `unwrapOr()`, and `unwrapOrElse()`.

**Enforces explicit error handling:**

The `expect()` and `expectErr()` methods require an explicit error message, making panics deliberate:

```typescript
// From: packages/result/src/core/types.ts (lines 74-75)
expect(message: string): T;
expectErr(message: string): never;
```

**Generator protocol enables Railway-Oriented Programming:**

`safeTry` provides a clean imperative syntax for sequential Result operations with automatic early return on error, analogous to Rust's `?` operator:

```typescript
// From: packages/result/tests/generators.test.ts (lines 9-17)
it("safeTry sync: all Ok yields produce final Ok", () => {
  const result = safeTry(function* () {
    const a = yield* ok(1);
    const b = yield* ok(2);
    const c = yield* ok(3);
    return ok(a + b + c);
  });
  expect(result._tag).toBe("Ok");
  if (result.isOk()) expect(result.value).toBe(6);
});
```

Generator cleanup is verified to run `finally` blocks on early return:

```typescript
// From: packages/result/tests/generators.test.ts (lines 183-198)
it("Generator cleanup runs on early return", () => {
  const cleanup = vi.fn();
  const result = safeTry(function* () {
    try {
      const _a = yield* ok(1);
      const _b = yield* err("stop");
      return ok(999);
    } finally {
      cleanup();
    }
  });
  expect(result._tag).toBe("Err");
  expect(cleanup).toHaveBeenCalledOnce();
});
```

**Error type hierarchies support domain modeling:**

```typescript
// From: packages/result/tests/error-patterns.test-d.ts (lines 49-68)
it("Error hierarchy type compositions resolve correctly", () => {
  type InfraError = { _tag: "Timeout"; ms: number } | { _tag: "ConnectionFailed"; host: string };
  type DomainError =
    | { _tag: "NotFound"; entity: string }
    | { _tag: "InfraFailure"; cause: InfraError };

  function infraStep(): Result<number, InfraError> {
    return ok(1);
  }
  function domainStep(n: number): Result<string, DomainError> {
    return ok(String(n));
  }

  const result = infraStep()
    .mapErr((e): DomainError => ({ _tag: "InfraFailure", cause: e }))
    .andThen(domainStep);

  expectTypeOf(result).toMatchTypeOf<Result<string, DomainError>>();
});
```

---

## 5. Code Examples (From Actual Source)

### 5.1 Creating and Matching Results

```typescript
// From: packages/result/src/core/result.ts
// ok() factory -- creates a plain object with closures
export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = {
    _tag: "Ok",
    value,
    isOk(): this is Ok<T, never> {
      return true;
    },
    isErr(): this is Err<T, never> {
      return false;
    },
    map(f) {
      return ok(f(value));
    },
    mapErr() {
      return self;
    },
    andThen(f) {
      return f(value);
    },
    orElse() {
      return self;
    },
    match(onOk) {
      return onOk(value);
    },
    unwrapOr() {
      return value;
    },
    toJSON() {
      return { _tag: "Ok", value };
    },
    // ... (remaining methods)
  };
  return self;
}
```

### 5.2 Error Pattern with createError + assertNever

```typescript
// From: packages/result/src/errors/create-error.ts
export function createError<Tag extends string>(
  tag: Tag
): <Fields extends Record<string, unknown>>(fields: Fields) => Readonly<{ _tag: Tag } & Fields> {
  return <Fields extends Record<string, unknown>>(
    fields: Fields
  ): Readonly<{ _tag: Tag } & Fields> => {
    return Object.freeze({ _tag: tag, ...fields });
  };
}

// From: packages/result/src/errors/assert-never.ts
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
```

### 5.3 ResultAsync Never-Reject Invariant

```typescript
// From: packages/result/src/async/result-async.ts
static fromPromise<T, E>(promise: Promise<T>, mapErr: (error: unknown) => E): ResultAsync<T, E> {
  return new ResultAsync(
    promise.then(
      (value): Result<T, E> => ok(value),
      (error: unknown): Result<T, E> => err(mapErr(error))
    )
  );
}
```

### 5.4 Generator-Based safeTry (Rust ? Operator)

```typescript
// From: packages/result/src/generators/safe-try.ts
function runSync(
  gen: Generator<Err<never, unknown>, Result<unknown, unknown>, unknown>
): Result<unknown, unknown> {
  for (;;) {
    const next = gen.next();
    if (next.done) {
      return next.value;
    }
    // The yielded value is an Err -- early return
    const yieldedErr = next.value;
    gen.return(err(yieldedErr.error));
    return err(yieldedErr.error);
  }
}
```

### 5.5 Combinators with Type-Level Tuple Preservation

```typescript
// From: packages/result/src/combinators/all.ts
export function all<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>>;
export function all(...results: readonly Result<unknown, unknown>[]): Result<unknown[], unknown> {
  const values: unknown[] = [];
  for (const result of results) {
    if (result._tag === "Err") {
      return err(result.error);
    }
    values.push(result.value);
  }
  return ok(values);
}
```

### 5.6 Testing Utilities (result-testing)

```typescript
// From: packages/result-testing/src/matchers.ts
export function expectOk<T, E>(result: Result<T, E>): T {
  expect(result._tag).toBe("Ok");
  if (result._tag !== "Ok") {
    throw new Error(`Expected Ok but got Err: ${JSON.stringify((result as Err<T, E>).error)}`);
  }
  return result.value;
}

export function setupResultMatchers(): void {
  expect.extend({
    toBeOk(received: Result<unknown, unknown>, expected?: unknown) {
      const pass =
        received._tag === "Ok" && (expected === undefined || isDeepEqual(received.value, expected));
      // ... (matcher implementation)
    },
    toBeErr(received: Result<unknown, unknown>, expected?: unknown) {
      // ... (matcher implementation)
    },
  });
}
```

---

## 6. Edge Cases & Known Limitations

### 6.1 Silent Side-Effect Swallowing

`andTee` and `orTee` silently catch and discard exceptions thrown by their callback functions:

```typescript
// From: packages/result/src/core/result.ts (lines 96-103)
andTee(f) {
  try {
    f(value);
  } catch {
    // andTee swallows errors from f
  }
  return self;
},
```

**GxP Impact:** In a regulated environment, a failing audit log write inside `andTee` would be silently ignored. Use `andThrough` instead when the side effect's success matters to the pipeline.

### 6.2 No Runtime Immutability on Result Objects

While `Ok` and `Err` interfaces declare `readonly _tag`, `readonly value`, and `readonly error`, the underlying plain objects are not frozen. Runtime mutation is possible outside of TypeScript type checking:

```javascript
// This would succeed at runtime despite readonly in TS
const result = ok(42);
result.value = 99; // TypeScript error, but JS allows it
```

**GxP Impact:** Low risk in TypeScript-only codebases. Consider `Object.freeze()` on Result objects if operating in mixed TS/JS environments.

### 6.3 Generator Error Path in Err Iterator

The `Err` iterator's generator throws an "unreachable" error if `next()` is called a second time:

```typescript
// From: packages/result/src/core/result.ts (lines 291-294)
*[Symbol.iterator]() {
  yield self;
  throw new Error("unreachable: generator continued after yield in Err");
},
```

This is a defensive measure verified by tests, but could cause confusing stack traces if misused.

### 6.4 fromThrowable Overload Behavior Based on fn.length

The `fromThrowable` function uses `fn.length` to determine whether to execute immediately or return a wrapper:

```typescript
// From: packages/result/src/constructors/from-throwable.ts (lines 19-27)
if (fn.length > 0) {
  return (...args: unknown[]) => {
    try {
      return ok(fn(...args));
    } catch (e: unknown) {
      return err(mapErr(e));
    }
  };
}
// Zero-arg: execute immediately
```

Functions with optional parameters or rest parameters may have `fn.length === 0` despite accepting arguments, leading to immediate execution rather than wrapping.

### 6.5 isResult Structural Check Limitations

`isResult` uses structural checking, which means any object with `{ _tag: "Ok", value: ... }` or `{ _tag: "Err", error: ... }` will pass. This is by design (no `instanceof`) but could produce false positives with unrelated objects that happen to share this shape. Tests verify edge cases:

```typescript
// From: packages/result/tests/type-guards.test.ts (lines 125-127)
it("isResult({ _tag: 'Other', value: 1 }) returns false", () => {
  expect(isResult({ _tag: "Other", value: 1 })).toBe(false);
});
```

---

## 7. Recommendations by Tier

### Tier 1: Critical (Address Before Production)

No critical issues identified. The package is production-ready for GxP environments.

### Tier 2: High Priority (Address in Next Sprint)

| #   | Recommendation                                                                           | Rationale                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | Add `Object.freeze()` to `ok()` and `err()` factory outputs                              | Provides runtime immutability guarantees matching the compile-time `readonly` constraints, completing data integrity for mixed TS/JS environments |
| 2.2 | Add a `tapErr` or logging-aware variant of `andTee` that propagates side-effect failures | Prevents silent loss of audit trail writes in GxP-critical error logging paths                                                                    |
| 2.3 | Run Stryker mutation testing in CI and enforce the 70% break threshold                   | The configuration exists but needs CI integration to prevent regression                                                                           |

### Tier 3: Medium Priority (Next Quarter)

| #   | Recommendation                                                                                | Rationale                                                                             |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 3.1 | Add correlation ID support to error objects (e.g., optional `traceId` field in `createError`) | Improves traceability in distributed systems without requiring manual `inspect` calls |
| 3.2 | Add `fromThrowable` warning/documentation about `fn.length === 0` edge case                   | Prevents subtle bugs with optional-parameter functions                                |
| 3.3 | Consider a `ResultLogger` or `ResultTracer` integration point                                 | Enables automatic audit trail without manual `inspect` wiring                         |
| 3.4 | Generate API reference documentation from JSDoc                                               | Improves discoverability and serves as change control documentation                   |

### Tier 4: Low Priority (Backlog)

| #   | Recommendation                                                            | Rationale                                                         |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 4.1 | Add `Symbol.toStringTag` to Result objects for better debugging output    | Improves developer experience in console/debugger contexts        |
| 4.2 | Consider branded types for Result to reduce false positives in `isResult` | Stronger structural identity without `instanceof`                 |
| 4.3 | Add benchmarks for Result chain performance                               | Validates that the closure-based approach has acceptable overhead |

---

## 8. File Reference Guide

### 8.1 Production Source Files

| File                                                 | Lines | GxP Role                                                               |
| ---------------------------------------------------- | ----- | ---------------------------------------------------------------------- |
| `packages/result/src/core/types.ts`                  | 146   | Type definitions -- discriminated union with `_tag`, method signatures |
| `packages/result/src/core/result.ts`                 | 298   | `ok()` / `err()` factories -- core immutable value construction        |
| `packages/result/src/core/guards.ts`                 | 37    | `isResult()` / `isResultAsync()` -- structural type guards             |
| `packages/result/src/async/result-async.ts`          | 334   | `ResultAsync` -- never-reject promise wrapper                          |
| `packages/result/src/constructors/from-throwable.ts` | 35    | Exception boundary -- converts thrown errors to `Err`                  |
| `packages/result/src/constructors/from-nullable.ts`  | 13    | Null safety -- converts nullable to `Result`                           |
| `packages/result/src/constructors/from-predicate.ts` | 27    | Validation -- converts predicate check to `Result`                     |
| `packages/result/src/constructors/try-catch.ts`      | 14    | Exception boundary -- immediate execution variant                      |
| `packages/result/src/constructors/from-promise.ts`   | 28    | Async boundary -- converts `Promise` to `ResultAsync`                  |
| `packages/result/src/combinators/all.ts`             | 21    | Parallel validation -- short-circuits on first error                   |
| `packages/result/src/combinators/all-settled.ts`     | 30    | Parallel validation -- collects all errors                             |
| `packages/result/src/combinators/any.ts`             | 23    | Parallel validation -- first success wins                              |
| `packages/result/src/combinators/collect.ts`         | 30    | Record validation -- named field results                               |
| `packages/result/src/generators/safe-try.ts`         | 89    | Railway pattern -- `?` operator emulation via generators               |
| `packages/result/src/errors/create-error.ts`         | 17    | Error factory -- frozen tagged error construction                      |
| `packages/result/src/errors/assert-never.ts`         | 12    | Exhaustiveness -- compile-time + runtime completeness check            |
| `packages/result/src/type-utils.ts`                  | 56    | Type utilities -- `InferOk`, `InferErr`, `FlattenResult`, etc.         |
| `packages/result/src/index.ts`                       | 75    | Barrel exports -- public API surface definition                        |

### 8.2 Testing Companion Package

| File                                      | Lines | Purpose                                      |
| ----------------------------------------- | ----- | -------------------------------------------- |
| `packages/result-testing/src/matchers.ts` | 191   | Custom Vitest matchers and assertion helpers |
| `packages/result-testing/src/index.ts`    | 16    | Barrel exports                               |

### 8.3 Test Files

| File                                              | Lines | Coverage Area                                                   |
| ------------------------------------------------- | ----- | --------------------------------------------------------------- |
| `packages/result/tests/core-types.test.ts`        | 69    | Ok/Err construction, discriminated union                        |
| `packages/result/tests/core-types.test-d.ts`      | 101   | Type-level core type verification                               |
| `packages/result/tests/type-guards.test.ts`       | 216   | `isOk`, `isErr`, `isResult`, `isResultAsync`                    |
| `packages/result/tests/type-guards.test-d.ts`     | 48    | Type-level guard narrowing verification                         |
| `packages/result/tests/transformations.test.ts`   | 125   | `map`, `mapErr`, `mapBoth`, `flatten`, `flip`                   |
| `packages/result/tests/transformations.test-d.ts` | 45    | Type-level transformation verification                          |
| `packages/result/tests/chaining.test.ts`          | 228   | `andThen`, `orElse`, `andTee`, `orTee`, `andThrough`, `inspect` |
| `packages/result/tests/chaining.test-d.ts`        | 66    | Type-level chaining and union accumulation                      |
| `packages/result/tests/extraction.test.ts`        | 119   | `match`, `unwrapOr`, `toNullable`, `intoTuple`, `expect`        |
| `packages/result/tests/extraction.test-d.ts`      | 74    | Type-level extraction verification                              |
| `packages/result/tests/constructors.test.ts`      | 164   | `fromThrowable`, `fromNullable`, `fromPredicate`, `tryCatch`    |
| `packages/result/tests/constructors.test-d.ts`    | 71    | Type-level constructor verification                             |
| `packages/result/tests/combining.test.ts`         | 111   | `all`, `allSettled`, `any`, `collect`                           |
| `packages/result/tests/combining.test-d.ts`       | 86    | Type-level combinator verification                              |
| `packages/result/tests/result-async.test.ts`      | 449   | All ResultAsync operations                                      |
| `packages/result/tests/result-async.test-d.ts`    | 50    | Type-level async verification                                   |
| `packages/result/tests/generators.test.ts`        | 218   | `safeTry` sync/async, iterator protocol                         |
| `packages/result/tests/generators.test-d.ts`      | 55    | Type-level generator verification                               |
| `packages/result/tests/error-patterns.test.ts`    | 149   | `createError`, `assertNever`, exhaustive matching               |
| `packages/result/tests/error-patterns.test-d.ts`  | 70    | Type-level error pattern verification                           |
| `packages/result/tests/serialization.test.ts`     | 48    | `toJSON`, `JSON.stringify` integration                          |
| `packages/result-testing/tests/matchers.test.ts`  | 75    | Custom matcher and assertion helper verification                |

### 8.4 Configuration

| File                                   | Purpose                                               |
| -------------------------------------- | ----------------------------------------------------- |
| `packages/result/package.json`         | Package metadata, scripts, dependencies               |
| `packages/result/stryker.config.json`  | Mutation testing configuration (70% break threshold)  |
| `packages/result-testing/package.json` | Testing companion metadata, peer dependency on vitest |

---

_Report generated from source code analysis of @hex-di/result v0.1.0 and @hex-di/result-testing v0.1.0._
