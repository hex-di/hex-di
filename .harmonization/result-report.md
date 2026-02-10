# @hex-di/result Harmonization Report

**Reviewer:** result-specialist
**Date:** 2026-02-07
**Spec Version:** 0.1.0 (Draft)
**Source Code:** `packages/result/src/` (existing implementation)

---

## 1. Executive Summary

`@hex-di/result` is the foundational error-handling type for the entire HexDI ecosystem. All four downstream libraries (Store, Query, Saga, Flow) depend on it for typed error channels. The spec is comprehensive (16 chapters, ~243 tests planned) and the existing implementation already covers core types, constructors, combinators, generators, and error patterns. The spec and implementation are broadly well-aligned with HexDI conventions, but this review identifies several inconsistencies, gaps, and integration concerns that need resolution before the ecosystem can ship coherently.

---

## 2. Consistent Patterns (Strengths)

### 2.1 `_tag` Discriminant Convention

The Result spec consistently uses `_tag: "Ok" | "Err"` as the discriminant field. This aligns with:

- `@hex-di/store`'s `AsyncDerivedSnapshot` (discriminated on `status`)
- `@hex-di/flow`'s effect descriptors (discriminated on `_tag`)
- `@hex-di/saga`'s `SagaError` types (discriminated on `_tag`)
- The broader fp-ts/Effect ecosystem convention

The implementation in `packages/result/src/core/types.ts` and `packages/result/src/core/result.ts` faithfully implements this.

### 2.2 Structural Typing (No instanceof)

Result uses plain objects with closures rather than class hierarchies. The `isResult` guard in `packages/result/src/core/guards.ts` uses structural checking (`"_tag" in value`), not `instanceof`. This is consistent with HexDI's philosophy of interface-based contracts.

### 2.3 Zero Runtime Dependencies

The spec mandates and the implementation delivers zero runtime dependencies. The HexDI integration module (`integration/`) is optional and only loaded when explicitly imported. This keeps the core lightweight.

### 2.4 Method Chaining API

The method-chaining API (`result.map(f).andThen(g).match(...)`) is consistent across all ecosystem specs:

- Query uses `result.match()` after `queryClient.fetch()`
- Saga uses `result.match()`, `result.isOk()`, `result.isErr()` after saga execution
- Flow uses `Result` and `ResultAsync` from effect execution

### 2.5 Error Type Accumulation

The `andThen` chain producing `Result<U, E | F>` (error union growth) is the primary composition mechanism. This pattern is used consistently in:

- Query's `QueryResolutionError | TError` union
- Saga's accumulated step error types: `SagaError<E1 | E2 | E3>`
- Flow's `EffectExecutionError | TransitionError` unions

### 2.6 No `any`, No Type Casting

The spec mandates and the implementation adheres to zero `any` and zero `as` casts in source code. The implementation in `packages/result/src/` uses `unknown` with structural checks throughout. This is verified in the Definition of Done (spec 16) with grep-based verification commands.

### 2.7 Tagged Error Factory (`createError`)

The `createError("NotFound")` factory pattern in `packages/result/src/errors/create-error.ts` uses `Object.freeze` and returns `Readonly<{ _tag: Tag } & Fields>`. This provides immutable error values consistent with the spec's "errors are immutable values" philosophy.

---

## 3. Inconsistencies Identified

### 3.1 Core Error Model Mismatch: Class Hierarchy vs. Tagged Unions

**Severity: HIGH**

The existing `@hex-di/core` package uses a **class-based error hierarchy** (`ContainerError extends Error` with subclasses like `CircularDependencyError`, `FactoryError`, etc.) using `code` strings (`"CIRCULAR_DEPENDENCY"`, `"FACTORY_FAILED"`) and `instanceof` checks.

The Result spec defines a `ResolutionError` as a **tagged union** with `_tag` discriminants (`"MissingAdapter"`, `"CircularDependency"`, `"LifetimeMismatch"`, `"FactoryError"`, `"DisposedContainer"`).

These two error systems are incompatible:

- Core uses `code: "CIRCULAR_DEPENDENCY"` / `instanceof CircularDependencyError`
- Result spec uses `_tag: "CircularDependency"` / structural narrowing

The `resolveResult` integration function (spec 12, section 53) must translate between these two systems. The spec shows `tryCatch(() => container.resolve(port), thrown => toResolutionError(thrown))` but does not specify `toResolutionError`. This needs a definitive mapping.

**Recommendation:**

1. Define the `toResolutionError` function explicitly in the spec, mapping each `ContainerError` subclass to a `ResolutionError` variant
2. Consider adding a `_tag` field to `ContainerError` subclasses in `@hex-di/core` for forward compatibility (non-breaking: adding a field)
3. The `ResolutionError._tag` values should mirror `ContainerError.code` naming: align `"MissingAdapter"` with the fact that core currently has no explicit "missing adapter" error class -- resolution of an unregistered port may produce a different error path

### 3.2 `ResolutionError` Variants Don't Fully Map to Core Errors

**Severity: MEDIUM**

The Result spec defines 5 `ResolutionError` variants:

- `MissingAdapter` -- no corresponding core error class exists (core returns `undefined` or throws generically)
- `CircularDependency` -- maps to `CircularDependencyError`
- `LifetimeMismatch` -- no corresponding core error class (this is the `ScopeRequiredError` or captive dependency check)
- `FactoryError` -- maps to `FactoryError` / `AsyncFactoryError`
- `DisposedContainer` -- maps to `DisposedScopeError`

Missing from `ResolutionError`:

- `AsyncInitializationRequired` -- maps to `AsyncInitializationRequiredError` in core
- `NonClonableForked` -- maps to `NonClonableForkedError` in core
- `ScopeRequired` -- currently mapped to `LifetimeMismatch` which is imprecise

**Recommendation:** Expand `ResolutionError` to cover all 6 `ContainerError` subclasses, or explicitly document which core errors map to which `ResolutionError` variants.

### 3.3 Export Name: `ResultAsyncImpl` Leaks Implementation Detail

**Severity: MEDIUM**

The public API in `packages/result/src/index.ts` exports `ResultAsyncImpl` (the class). The spec calls the type `ResultAsync` (the interface). The `Impl` suffix is an implementation detail that should not appear in the public API surface.

Looking at the current exports:

```typescript
export { ResultAsyncImpl } from "./async/result-async.js";
```

Consumers need the class for static methods (`ResultAsync.fromPromise`, `ResultAsync.ok`, etc.) but the export name `ResultAsyncImpl` doesn't match the spec's `ResultAsync` naming.

**Recommendation:** Re-export as `ResultAsync`:

```typescript
export { ResultAsyncImpl as ResultAsync } from "./async/result-async.js";
```

Or create a namespace object that wraps the static methods.

### 3.4 `Result.all` / `Result.collect` Not Available as Static Methods

**Severity: MEDIUM**

The spec describes combinators as `Result.all(...)`, `Result.allSettled(...)`, `Result.any(...)`, `Result.collect(...)` (static methods on a `Result` namespace). But `Result` is a type alias (`type Result<T, E> = Ok<T, E> | Err<T, E>`) and cannot have static methods.

The implementation exports them as standalone functions: `all(...)`, `allSettled(...)`, etc. This is fine functionally, but doesn't match the spec's `Result.all(...)` syntax.

Similarly, `Result.isResult` is exported as standalone `isResult`.

**Recommendation:** Either:

1. Update the spec to use standalone function syntax (matching implementation)
2. Create a `Result` namespace object that bundles the static methods:
   ```typescript
   export const Result = { all, allSettled, any, collect, isResult };
   ```
   This gives users `Result.all(...)` syntax alongside the `Result<T, E>` type.

### 3.5 `inspect` vs `andTee` Semantic Overlap

**Severity: LOW**

The spec defines both:

- `inspect(f)` / `inspectErr(f)` -- side effects, returns `this`
- `andTee(f)` / `orTee(f)` -- side effects, returns `this`, swallows errors

The difference: `andTee` catches thrown errors from `f`, `inspect` does not.

The implementation confirms this: `andTee` wraps in try/catch, `inspect` calls `f(value)` directly.

However, the spec (section 25) says `andTee` swallows errors, while section 5 says `map` must be pure and `inspect` is for side effects. This creates confusion: when should a user pick `inspect` vs `andTee`?

**Recommendation:** Clarify in the spec that `inspect` is the Rust-style inspect (no error handling), while `andTee` is the railway-oriented tee (with error swallowing). Consider documenting when to prefer each.

---

## 4. Cross-Library Integration Analysis

### 4.1 Store Integration

**Dependency:** `@hex-di/store` lists `@hex-di/result` as a dependency.

**Usage points:**

- `AsyncDerivedService` returns `ResultAsync` from async computations
- `AsyncDerivedSnapshot` is a discriminated union on `status` (not `_tag`) -- this is an inconsistency with Result's `_tag` convention
- Store testing package depends on `@hex-di/result-testing`

**Gap:** The Store spec uses `status` as its discriminant field (values: `"idle"`, `"loading"`, `"success"`, `"error"`) while Result uses `_tag` (`"Ok"`, `"Err"`). When an async derived value produces a `ResultAsync`, the error flows into `AsyncDerivedSnapshot.error`. The spec should document how `ResultAsync<TData, E>` maps to `AsyncDerivedSnapshot<TData, E>`:

- `Ok(data)` -> `{ status: "success", data }`
- `Err(error)` -> `{ status: "error", error }`

**Recommendation:** Add a section to the Result integration spec (12) or Store spec describing the `ResultAsync -> AsyncDerivedSnapshot` mapping protocol.

### 4.2 Query Integration

**Dependency:** `@hex-di/query` uses `ResultAsync<TData, TError>` as the core return type for all adapters.

**Usage points:**

- All `QueryAdapter` factory functions return `ResultAsync<TData, TError>`
- All `MutationAdapter` factory functions return `ResultAsync<TData, TError>`
- `QueryClient.fetch()` returns `ResultAsync<TData, TError | QueryResolutionError>`
- `CacheEntry` stores `result: Result<TData, TError>`
- Query testing uses `@hex-di/result-testing` matchers

**This is the deepest integration.** Query is essentially built on top of Result.

**Gap:** The Query spec defines `QueryResolutionError` separately from Result's `ResolutionError`. These should share a common base or the Query spec should compose `ResolutionError` into `QueryResolutionError` explicitly.

**Recommendation:** `QueryResolutionError` should be defined as:

```typescript
type QueryResolutionError = ResolutionError | QuerySpecificError;
```

where `ResolutionError` is imported from `@hex-di/result/integration`.

### 4.3 Saga Integration

**Dependency:** Saga uses `Result` as the return type for saga execution.

**Usage points:**

- Saga execution returns `Result<SagaSuccess<TOutput>, SagaError<TAccumulatedErrors>>`
- Steps use `Result` for step outcomes
- Error type accumulation through step chains mirrors `andThen` accumulation
- `result.match()` is the primary consumption pattern

**Gap:** The Saga spec wraps its result in `SagaSuccess<TOutput>` (with `executionId` and `output`) because "Result has no metadata slot." This is a valid observation -- Result's `Ok<T>` only carries `value: T`. If multiple ecosystem libraries need metadata alongside success values, this pattern will repeat.

**Recommendation:** This is acceptable as-is. The pattern of wrapping domain-specific success types is standard. No change needed to Result.

### 4.4 Flow Integration

**Dependency:** Flow uses `Result` and `ResultAsync` extensively for effect execution.

**Usage points:**

- `runner.send()` returns `Result<effects, TransitionError>`
- `runner.sendAndExecute()` returns `ResultAsync<void, EffectExecutionError>`
- `Effect.parallel` uses `ResultAsync.all` / `ResultAsync.allSettled`
- `Effect.sequence` uses `ResultAsync.andThen` chains
- `EffectExecutor.execute()` returns `ResultAsync<void, EffectExecutionError>`
- `resolveResult(scope, port)` from Result integration is used in effect execution
- All Flow error types use `_tag` discriminants following Result spec section 49

**Gap:** Flow's `EffectExecutor` accepts custom executors typed as `Map<string, (effect: EffectAny) => ResultAsync<void, EffectExecutionError>>`. This requires `ResultAsync` to be a concrete type that can be constructed. Currently, `ResultAsyncImpl` is a class, so `ResultAsyncImpl.fromPromise(...)` works. But the public type is the `ResultAsync` interface. Users implementing custom executors need access to constructors.

**Recommendation:** Ensure that `ResultAsync` (the re-exported class/namespace) provides all static constructors (`ok`, `err`, `fromPromise`, `fromSafePromise`, `fromThrowable`) in the public API. The current `ResultAsyncImpl` export handles this, but the naming issue (3.3 above) should be resolved first.

---

## 5. Implementation vs. Spec Gap Analysis

### 5.1 Implemented (Complete)

| Feature                                                  | Spec Section | Source File                      | Status   |
| -------------------------------------------------------- | ------------ | -------------------------------- | -------- |
| `ok()` / `err()`                                         | 9            | `core/result.ts`                 | Complete |
| `Ok` / `Err` types                                       | 5-6          | `core/types.ts`                  | Complete |
| `ResultAsync` class                                      | 7, 40        | `async/result-async.ts`          | Complete |
| `isResult` guard                                         | 16           | `core/guards.ts`                 | Complete |
| `fromThrowable`                                          | 10           | `constructors/from-throwable.ts` | Complete |
| `fromNullable`                                           | 12           | `constructors/from-nullable.ts`  | Complete |
| `fromPredicate`                                          | 13           | `constructors/from-predicate.ts` | Complete |
| `tryCatch`                                               | 14           | `constructors/try-catch.ts`      | Complete |
| `fromPromise` / `fromSafePromise` / `fromAsyncThrowable` | 11           | `constructors/from-promise.ts`   | Complete |
| `all` combinator                                         | 35           | `combinators/all.ts`             | Complete |
| `allSettled` combinator                                  | 36           | `combinators/all-settled.ts`     | Complete |
| `any` combinator                                         | 37           | `combinators/any.ts`             | Complete |
| `collect` combinator                                     | 38           | `combinators/collect.ts`         | Complete |
| `safeTry` (sync + async)                                 | 45-46        | `generators/safe-try.ts`         | Complete |
| `createError` factory                                    | 50           | `errors/create-error.ts`         | Complete |
| `assertNever`                                            | 51           | `errors/assert-never.ts`         | Complete |
| Type utilities                                           | 8            | `type-utils.ts`                  | Complete |
| All instance methods on Ok/Err                           | 5-6          | `core/result.ts`                 | Complete |
| All ResultAsync methods                                  | 40-44        | `async/result-async.ts`          | Complete |
| Generator protocol (Symbol.iterator)                     | 47           | `core/result.ts`                 | Complete |
| JSON serialization (toJSON)                              | 62           | `core/result.ts`                 | Complete |

### 5.2 Not Yet Implemented

| Feature                                                                                                         | Spec Section | Status                                           |
| --------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `isResultAsync` guard                                                                                           | 16           | Missing                                          |
| HexDI integration (`resolveResult`)                                                                             | 53           | Missing (spec-only)                              |
| Tracing integration (`recordResult`)                                                                            | 54           | Missing (spec-only)                              |
| Inspector integration                                                                                           | 55           | Missing (spec-only)                              |
| Adapter error boundaries                                                                                        | 56           | Missing (spec-only)                              |
| `@hex-di/result-testing` package                                                                                | 57-60        | Missing entirely                                 |
| ResultAsync combinators (`ResultAsync.all`, `ResultAsync.allSettled`, `ResultAsync.any`, `ResultAsync.collect`) | 44           | Not found as static methods on `ResultAsyncImpl` |

### 5.3 Test Coverage

Tests exist for all implemented features:

- `core-types.test.ts` + `core-types.test-d.ts`
- `constructors.test.ts` + `constructors.test-d.ts`
- `type-guards.test.ts` + `type-guards.test-d.ts`
- `transformations.test.ts` + `transformations.test-d.ts`
- `chaining.test.ts` + `chaining.test-d.ts`
- `extraction.test.ts` + `extraction.test-d.ts`
- `combining.test.ts` + `combining.test-d.ts`
- `result-async.test.ts` + `result-async.test-d.ts`
- `generators.test.ts` + `generators.test-d.ts`
- `error-patterns.test.ts` + `error-patterns.test-d.ts`
- `serialization.test.ts`

Missing test files (per DoD):

- `integration/hexdi-integration.test.ts`
- `integration/hexdi-integration.test-d.ts`
- Property-based tests (`*.property.test.ts`)
- `@hex-di/result-testing` package tests

---

## 6. Type Safety Analysis

### 6.1 Phantom Type Parameters

The implementation correctly uses `never` as phantom types:

- `ok(42)` returns `Ok<number, never>` -- the `E` is `never`, making it assignable to any `Result<number, E>`
- `err("bad")` returns `Err<never, string>` -- the `T` is `never`

This is verified in the type-level tests.

### 6.2 Ok/Err Type Narrowing on Methods

The type definitions in `core/types.ts` provide precise return types for each variant:

- `Ok.map<U>(f)` returns `Ok<U, E>` (not `Result<U, E>`)
- `Err.map<U>(f)` returns `Err<U, E>` (not `Result<U, E>`)
- `Ok.match<A, B>(...)` returns `A` (not `A | B`)
- `Err.match<A, B>(...)` returns `B` (not `A | B`)

This provides maximum type precision. When the variant is known at the call site, types are narrowed.

### 6.3 `flatten` Signature

The `Ok.flatten` has signature:

```typescript
flatten<U, E2>(this: Ok<Result<U, E2>, E>): Result<U, E | E2>;
```

The `this` parameter correctly constrains the method to only be callable when the value type is itself a `Result`. This is elegant type-level programming.

### 6.4 Type Utility Coverage

All expected utilities are implemented:

- `InferOk`, `InferErr`, `InferAsyncOk`, `InferAsyncErr`
- `IsResult`, `IsResultAsync`
- `FlattenResult`
- `InferOkTuple`, `InferErrUnion`, `InferOkRecord`, `InferOkUnion`, `InferErrTuple`

The utilities handle both `Result` and `ResultAsync` in their conditions (e.g., `InferOk` checks both), enabling mixed sync/async combinator usage.

---

## 7. Concrete Recommendations

### Priority 1 (Must Fix Before Ecosystem Release)

1. **Rename `ResultAsyncImpl` export to `ResultAsync`** in `packages/result/src/index.ts`. All downstream specs reference `ResultAsync` (not `ResultAsyncImpl`). This is a public API name that affects every consumer.

2. **Add `ResultAsync` static combinators** (`all`, `allSettled`, `any`, `collect`). Flow spec explicitly uses `ResultAsync.all` and `ResultAsync.allSettled`. Query spec uses `ResultAsync.fromPromise`. These must exist as static methods on the exported `ResultAsync` class.

3. **Add `isResultAsync` guard function** (spec section 16). Missing from implementation.

4. **Resolve the `Result.all` namespace question.** Either create a `Result` namespace object bundling static methods, or update all ecosystem specs to use standalone `all(...)` imports. Consistency matters more than the specific choice.

5. **Define `toResolutionError` mapping** in the HexDI integration section. The mapping from `ContainerError` subclasses to `ResolutionError` variants must be explicit and complete.

### Priority 2 (Should Fix)

6. **Expand `ResolutionError`** to cover all 6 `ContainerError` subclasses (add `AsyncInitializationRequired`, `NonClonableForked`, rename `LifetimeMismatch` to `ScopeRequired` or add both).

7. **Create `@hex-di/result-testing` package** as specified. Store-testing and Query-testing depend on it.

8. **Document the `ResultAsync -> AsyncDerivedSnapshot` mapping protocol** for Store integration. This is a cross-cutting concern that both specs reference but neither fully specifies.

9. **Align `QueryResolutionError` with `ResolutionError`** from Result integration. Query should compose, not duplicate.

### Priority 3 (Nice to Have)

10. **Add property-based tests** for functor/monad laws as specified in DoD 12.

11. **Add `inspect` vs `andTee` usage guidance** to the spec. The semantic distinction (error swallowing vs. error propagation) is important but could be clearer.

12. **Consider adding a `_tag` field to `ContainerError`** subclasses for forward compatibility. This would make the `toResolutionError` mapping simpler and enable structural pattern matching on core errors alongside Result errors.

---

## 8. Cross-Library Dependency Summary

```
@hex-di/result (zero deps)
    |
    +-- @hex-di/store (depends on result)
    |       +-- @hex-di/store-react
    |       +-- @hex-di/store-testing (depends on result-testing)
    |
    +-- @hex-di/query (depends on result)
    |       +-- @hex-di/query-react
    |       +-- @hex-di/query-testing (depends on result-testing)
    |
    +-- @hex-di/saga (depends on result)
    |       +-- @hex-di/saga-react
    |       +-- @hex-di/saga-testing
    |
    +-- @hex-di/flow (depends on result)
            +-- @hex-di/flow-react
            +-- @hex-di/flow-testing

@hex-di/result-testing (depends on result, peer: vitest)
    |
    +-- used by: store-testing, query-testing
```

Result is the **single most critical package** in the ecosystem. Any breaking change to Result affects all four downstream libraries.

---

## 9. Conclusion

The `@hex-di/result` spec is thorough, well-designed, and forms a solid foundation for the HexDI ecosystem. The existing implementation covers the core API surface faithfully. The main risks are:

1. **Naming/export inconsistencies** (`ResultAsyncImpl`, standalone vs. namespace combinators) that will create confusion across ecosystem specs
2. **Missing `ResolutionError` mapping** that blocks the HexDI integration story
3. **Missing `@hex-di/result-testing`** that blocks downstream testing packages
4. **Missing `ResultAsync` static combinators** that Flow and Query depend on

Addressing Priority 1 items ensures all ecosystem libraries can develop against a stable, consistent Result API.
