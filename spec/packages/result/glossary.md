# Glossary

Terminology used throughout the `@hex-di/result` specification.

## Result

A value of type `Result<T, E>` that is either `Ok<T, E>` (success carrying a value of type `T`) or `Err<T, E>` (failure carrying an error of type `E`). Modeled as a discriminated union with `_tag: "Ok" | "Err"`.

## Ok

The success variant of `Result`. Contains a `value: T` property and a `_tag: "Ok"` discriminant. Created by the `ok(value)` factory function.

## Err

The failure variant of `Result`. Contains an `error: E` property and a `_tag: "Err"` discriminant. Created by the `err(error)` factory function.

## Brand

A unique `Symbol("Result")` property (`RESULT_BRAND`) attached to every `Result` instance. Used by `isResult()` to distinguish genuine `Result` values from structurally similar objects. See [ADR-002](decisions/002-brand-symbol-validation.md).

## Phantom Type

A type parameter that exists only at the type level and has no runtime representation. In this library, `ok(value)` produces `Ok<T, never>` where `E = never` is a phantom — there is no `error` property on an `Ok`. Similarly, `err(error)` produces `Err<never, E>` where `T = never` is a phantom. See [ADR-003](decisions/003-phantom-type-parameters.md).

## Discriminated Union

A TypeScript union type where each member has a literal property (the discriminant) that TypeScript uses for narrowing. `Result<T, E> = Ok<T, E> | Err<T, E>` uses `_tag: "Ok" | "Err"` as the discriminant.

## Short-Circuit

Stopping iteration through a collection of `Result` values at the first `Err` encountered, rather than processing all elements. Used by `all()` and `collect()`.

## Error Accumulation

Collecting all errors from a collection of `Result` values instead of stopping at the first. Used by `allSettled()` (collects all `Err` values), `any()` (collects errors only when all results are `Err`), and `zipOrAccumulate()` (collects into `NonEmptyArray<E>`).

## Functor

A type that supports a `map` operation: applying a function to the contained value without changing the container structure. `Result` is a functor via `map(f)` (applies `f` to the `Ok` value) and `mapErr(f)` (applies `f` to the `Err` value).

## Monad

A type that supports a `flatMap`/`andThen` operation: applying a function that itself returns a wrapped value, then flattening the result to avoid double-wrapping. `Result` is a monad via `andThen(f)` where `f: (value: T) => Result<U, F>`.

## Combinator

A function that combines multiple `Result` values into a single `Result` or splits them into categorized arrays. The library provides seven combinators: `all`, `allSettled`, `any`, `collect`, `partition`, `forEach`, and `zipOrAccumulate`. See [05-composition.md](behaviors/05-composition.md).

## Type Guard

A function whose return type is a type predicate (`value is SomeType`), causing TypeScript to narrow the type of the argument in the truthy branch. Examples: `isResult()`, `isOk()`, `isErr()`.

## Type Narrowing

The TypeScript compiler's ability to refine a type within a conditional branch based on a type guard or discriminant check. After `if (result.isOk())`, TypeScript knows `result` is `Ok<T, E>`.

## Exhaustiveness Check

A compile-time guarantee that all variants of a discriminated union have been handled. The `assertNever(value)` function accepts `never`, so if any variant is unhandled, TypeScript reports a type error at the call site.

## ResultAsync

A class that wraps `Promise<Result<T, E>>` and provides chainable async operations that mirror the sync `Result` API. Implements `PromiseLike<Result<T, E>>` so it can be awaited directly.

## Early Return

Exiting a computation before it completes, returning a `Result` (typically an `Err`) immediately. Achieved in this library via `safeTry()` and the `yield*` generator protocol.

## Option

`Option<T> = Some<T> | None`, a discriminated union modeling value presence or absence. Analogous to Rust's `Option<T>` or Haskell's `Maybe a`. See [09-option.md](behaviors/09-option.md) and [ADR-009](decisions/009-option-type.md).

## OptionJSON

The serialized form of `Option<T>`, produced by `toJSON()` and consumed by `fromOptionJSON()`. A discriminated union of `{ _tag: "Some", _schemaVersion: 1, value: T }` and `{ _tag: "None", _schemaVersion: 1 }`. Mirrors `ResultJSON<T, E>` for the Result type. See [type-system/option.md](type-system/option.md#optionjsont).

## Some

The presence variant of `Option`. Contains a `value: T` property and a `_tag: "Some"` discriminant. Created by the `some(value)` factory function.

## None

The absence variant of `Option`. Contains no value and has a `_tag: "None"` discriminant. Created by the `none()` factory function. A singleton frozen instance.

## Standalone Function

A curried, data-last function from `@hex-di/result/fn/*` that delegates to the corresponding `Result` instance method. Enables pipe-style composition. See [10-standalone-functions.md](behaviors/10-standalone-functions.md) and [ADR-007](decisions/007-dual-api-surface.md).

## Pipe

Left-to-right function composition: `pipe(value, f, g)` is equivalent to `g(f(value))`. Provided by `@hex-di/result/fn` for composing standalone functions.

## Error Group

A family of related discriminated error types created by `createErrorGroup(namespace)`. Each error in the group shares a `_namespace` field and has a unique `_tag` field. See [08-error-patterns.md](behaviors/08-error-patterns.md).

## NonEmptyArray

A tuple type `[T, ...T[]]` that guarantees at least one element at the type level. Used by `zipOrAccumulate()` to ensure the error array is never empty. See [type-system/utility.md](type-system/utility.md).

## Do Notation

Effect-style monadic comprehension using `Do`/`bind`/`let_` to build up a typed context object through sequential `Result` operations. Complements `safeTry` generators. See [12-do-notation.md](behaviors/12-do-notation.md) and [ADR-012](decisions/012-do-notation.md).

## Unsafe Extraction

Throwing extractors (`unwrap()`, `unwrapErr()`) gated behind `@hex-di/result/unsafe`. Throws `UnwrapError` on the wrong variant. See [11-unsafe.md](behaviors/11-unsafe.md) and [ADR-010](decisions/010-unsafe-subpath.md).

## UnwrapError

A specialized `Error` subclass thrown by `unwrap()`, `unwrapErr()`, `expect()`, and `expectErr()`. Contains a `.context` property with `{ _tag, value }` for structured error handling. See [11-unsafe.md](behaviors/11-unsafe.md).

## Standard Schema

The `StandardSchemaV1` interface from `@standard-schema/spec` for schema library interoperability. `toSchema(validate)` wraps a Result-returning validator as a Standard Schema. See [13-interop.md](behaviors/13-interop.md).

## Subpath Export

A `package.json` `"exports"` entry that maps import paths like `@hex-di/result/fn` to specific dist files. Enables granular imports and bundle optimization. See [ADR-011](decisions/011-subpath-exports.md).

## RESULT_ASYNC_BRAND

A unique `Symbol("ResultAsync")` attached to every `ResultAsync` instance, used by `isResultAsync()` for brand-based identity checking. See [ADR-008](decisions/008-result-async-brand.md).

## Transpose

Converting between `Option<Result<T, E>>` and `Result<Option<T>, E>`. Available as a method on both `Option` and `Result`. See [09-option.md](behaviors/09-option.md).

## Partition

Splitting a collection of `Result` values into separate Ok and Err arrays: `partition(results)` returns `[T[], E[]]`. Unlike `all()`, processes every element without short-circuiting. See [05-composition.md](behaviors/05-composition.md).

## Selective Prototype

An optimization strategy that places frequently-chained methods on a shared prototype (reducing per-instance memory) while keeping commonly-destructured methods as closures (preserving `this`-free ergonomics). See [ADR-013](decisions/013-performance-strategy.md).

## Cucumber

A Behavior-Driven Development (BDD) testing framework that executes plain-language Gherkin feature files as automated acceptance tests. Used as Level 5 of the test pyramid. See [process/test-strategy.md](process/test-strategy.md).

## BDD (Behavior-Driven Development)

A software development methodology where acceptance criteria are written in structured natural language (Given/When/Then) before implementation. Tests serve as living documentation. See [process/test-strategy.md](process/test-strategy.md).

## Gherkin

A structured natural language syntax using `Given`/`When`/`Then` keywords to describe software behavior in `.feature` files. Executed by Cucumber. See [process/test-strategy.md](process/test-strategy.md).

## Installation Qualification (IQ)

A documented verification that a system is installed correctly according to its design specification. In the context of `@hex-di/result`, verifies correct package installation, TypeScript compilation, and subpath export resolution. See [compliance/gxp.md](compliance/gxp.md).

## Operational Qualification (OQ)

A documented verification that a system operates correctly within specified parameters. In the context of `@hex-di/result`, covers the full test pyramid execution (unit, type, GxP integrity, mutation, Cucumber, performance). See [compliance/gxp.md](compliance/gxp.md).

## Performance Qualification (PQ)

A documented verification that a system performs as intended in its real-world operating environment. In the context of `@hex-di/result`, covers integration testing in consumer applications under production-like conditions. See [compliance/gxp.md](compliance/gxp.md).

## Requirement Traceability Matrix (RTM)

A document that maps each requirement (invariant, behavior spec) to its corresponding test cases across all test levels, ensuring complete forward and backward traceability. See [compliance/gxp.md](compliance/gxp.md).

## GxP Integrity Test

A specialized test that verifies library properties relevant to GxP regulatory compliance: immutability (`Object.freeze()`), brand integrity (`RESULT_BRAND` symbol), and error flow guarantees (no silent suppression). Level 3 of the test pyramid. See [process/test-strategy.md](process/test-strategy.md).

## Deep Freeze

Recursive `Object.freeze()` applied to both the `Result` wrapper and its contained value/error, ensuring the entire object graph is immutable. Used for GxP-critical data where nested mutation must be prevented. See [compliance/gxp.md](compliance/gxp.md).
