---
sidebar_position: 1
title: API Reference
---

# API Reference

Complete reference of all exports from `@hex-di/result`, organized by category.

## Factories

Functions for creating Result and Option values.

| Function     | Description                                   |
| ------------ | --------------------------------------------- |
| `ok(value)`  | Creates a success Result with the given value |
| `err(error)` | Creates a failure Result with the given error |

## Type Guards

Runtime type checking functions.

| Function               | Description                             |
| ---------------------- | --------------------------------------- |
| `isResult(value)`      | Checks if a value is a Result type      |
| `isResultAsync(value)` | Checks if a value is a ResultAsync type |
| `isOption(value)`      | Checks if a value is an Option type     |

## Constructors

Functions for creating Results from various sources.

| Function                                  | Description                                          |
| ----------------------------------------- | ---------------------------------------------------- |
| `fromThrowable(fn, mapError?)`            | Wraps a function that may throw into a Result        |
| `tryCatch(fn, mapError?)`                 | Alias for fromThrowable                              |
| `fromNullable(value, error)`              | Converts nullable value to Result                    |
| `fromPredicate(value, predicate, onFail)` | Creates Ok if predicate passes, Err otherwise        |
| `fromPromise(promise, mapError?)`         | Converts a Promise that may reject to ResultAsync    |
| `fromSafePromise(promise)`                | Converts a Promise that never rejects to ResultAsync |
| `fromAsyncThrowable(fn, mapError?)`       | Wraps an async function that may throw               |

## Combinators

Functions for working with multiple Results.

| Function                   | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `all(results)`             | All Ok → Ok of all values; Any Err → first Err     |
| `allSettled(results)`      | Always Ok with array of all Results                |
| `any(results)`             | First Ok wins; All Err → Err of all errors         |
| `collect(results)`         | Like all but for an array of Results               |
| `partition(results)`       | Separates Ok values and Err errors into two arrays |
| `zipOrAccumulate(results)` | Accumulates all errors instead of short-circuiting |
| `forEach(results, fn)`     | Iterates over Ok values, stops on first Err        |

## Generators

Generator-based control flow.

| Function             | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `safeTry(generator)` | Enables generator-based sequential Result operations |

## Do Notation

Functions for building context step-by-step.

| Function        | Description                                 |
| --------------- | ------------------------------------------- |
| `bind(name, f)` | Adds a named Result value to context        |
| `let_(name, f)` | Adds a non-Result computed value to context |

## Option

Functions for working with Option types.

| Function               | Description                          |
| ---------------------- | ------------------------------------ |
| `some(value)`          | Creates an Option containing a value |
| `none()`               | Creates an empty Option              |
| `fromOptionJSON(json)` | Deserializes JSON to Option          |

## Error Patterns

Utilities for creating and handling errors.

| Function                            | Description                                                               |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `createError(tag, message?, data?)` | Creates a discriminated error type                                        |
| `createErrorGroup(namespace)`       | Creates error families with `_namespace` + `_tag` two-level discriminants |
| `assertNever(value)`                | Ensures exhaustive handling at compile time                               |

## Tagged Error Handling

Methods for handling specific tagged errors and narrowing the error union.

| Method / Function                   | Description                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `.catchTag(tag, handler)`           | Handle a single tagged error, removes it from error union |
| `.catchTags({ tag: handler, ... })` | Handle multiple tagged errors at once                     |
| `.andThenWith(onOk, onErr)`         | Chain with both success and error recovery handlers       |
| `.orDie()`                          | Extract value or throw error — use at program boundaries  |

## Serialization

Functions for serialization and deserialization.

| Function           | Description                                     |
| ------------------ | ----------------------------------------------- |
| `fromJSON(json)`   | Deserializes a ResultJSON back to Result        |
| `toSchema(result)` | Converts to Standard Schema v1 compatible value |

## Core Types

The fundamental types provided by the library.

| Type                | Description                                      |
| ------------------- | ------------------------------------------------ |
| `Result<T, E>`      | Discriminated union of Ok\<T, E\> \| Err\<T, E\> |
| `Ok<T, E>`          | Success variant with value: T                    |
| `Err<T, E>`         | Failure variant with error: E                    |
| `ResultAsync<T, E>` | Wrapper for Promise\<Result\<T, E\>\>            |
| `Option<T>`         | Discriminated union of Some\<T\> \| None         |
| `Some<T>`           | Option variant containing a value                |
| `None`              | Empty Option variant                             |

## Effect Types

Pure type-level utilities for working with effects (error types). Zero runtime cost.

| Type                       | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `PureResult<T>`            | `Result<T, never>` — guaranteed success, no effects          |
| `EffectfulResult<T, E>`    | Result with effects; returns `never` when E is `never`       |
| `EffectOf<T>`              | Extracts the error type from a Result or ResultAsync         |
| `IsEffectFree<R>`          | Boolean type — `true` if the Result has no effects           |
| `MaskEffects<R, Mask>`     | Removes specific error types from a Result (type-level only) |
| `LiftEffect<R, NewEffect>` | Adds an error type to a Result's error union                 |
| `EffectUnion<Rs>`          | Union of all error types from a tuple of Results             |

## Effect Contracts

Type-level function contracts declaring input, output, and effects. Zero runtime cost.

| Type                                  | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `EffectContract<In, Out, Effects>`    | Declares a function's input, success output, and error types          |
| `TaggedError<Tag, Fields>`            | Tagged error base type with `_tag` discriminant                       |
| `SatisfiesContract<Fn, Contract>`     | Verifies a function satisfies a contract; returns `true` or violation |
| `ComposeContracts<C1, C2>`            | Sequential composition — merges inputs/outputs/effects                |
| `EffectViolation<Actual, Expected>`   | Error: function produces undeclared effects                           |
| `OutputViolation<Actual, Expected>`   | Error: function output type mismatch                                  |
| `InputViolation<Actual, Expected>`    | Error: function input type mismatch                                   |
| `ContractCompositionError<Out1, In2>` | Error: contracts cannot compose (output/input mismatch)               |

## Effect Handlers

Composable runtime handlers for processing tagged errors.

| Export                                  | Description                                                       |
| --------------------------------------- | ----------------------------------------------------------------- |
| `EffectHandler<TIn, TOut>`              | Handler interface: processes `TIn` errors, produces `TOut` values |
| `composeHandlers(h1, h2)`               | Combines two handlers; left-biased on overlapping tags            |
| `identityHandler`                       | No-op handler — identity element for composition                  |
| `transformEffects(result, ...handlers)` | Applies handler chain to a Result                                 |
| `NarrowedError<E, Tags>`                | Removes error types whose `_tag` is in `Tags`                     |
| `InputOf<H>`                            | Extracts the input (error) type of a handler                      |
| `OutputOf<H>`                           | Extracts the output (recovery value) type of a handler            |
| `ComposeHandlers<H1, H2>`               | Type-level composed handler type                                  |

## Type Utilities

TypeScript utility types for working with Results.

| Utility                  | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `InferOk<R>`             | Extract T from Result\<T, E\>                                  |
| `InferErr<R>`            | Extract E from Result\<T, E\>                                  |
| `InferAsyncOk<R>`        | Extract T from ResultAsync\<T, E\>                             |
| `InferAsyncErr<R>`       | Extract E from ResultAsync\<T, E\>                             |
| `IsResult<R>`            | Boolean type — is R a Result?                                  |
| `FlattenResult<R>`       | Flatten Result\<Result\<T, E1\>, E2\> to Result\<T, E1 \| E2\> |
| `InferOkTuple<Results>`  | Extract tuple of Ok types from tuple of Results                |
| `InferErrUnion<Results>` | Union of all Err types from tuple of Results                   |

## Result Methods

Methods available on both Ok and Err variants. See [The Result Type](../concepts/result-type) for detailed method documentation.

### Instance Methods

All Result instances have these methods:

**Type Guards**

- `isOk()`, `isErr()`, `isOkAnd(predicate)`, `isErrAnd(predicate)`

**Transformations**

- `map(f)`, `mapErr(f)`, `mapBoth(onOk, onErr)`, `flatten()`, `flip()`

**Chaining**

- `andThen(f)`, `orElse(f)`, `andTee(f)`, `orTee(f)`, `andThrough(f)`, `inspect(f)`, `inspectErr(f)`
- `catchTag(tag, handler)`, `catchTags(handlers)`, `andThenWith(onOk, onErr)`

**Logical**

- `and(other)`, `or(other)`

**Extraction**

- `match(onOk, onErr)`, `unwrapOr(default)`, `unwrapOrElse(f)`, `mapOr(default, f)`, `mapOrElse(defaultF, f)`, `contains(value)`, `containsErr(error)`, `expect(message)`, `expectErr(message)`, `orDie()`

**Conversion**

- `toNullable()`, `toUndefined()`, `intoTuple()`, `merge()`, `toOption()`, `toOptionErr()`, `toJSON()`

**Async Bridges**

- `toAsync()`, `asyncMap(f)`, `asyncAndThen(f)`

## ResultAsync Methods

`ResultAsync` wraps a `Promise<Result<T, E>>` and provides an async-aware API.

### Static Methods

| Method                                        | Description                              |
| --------------------------------------------- | ---------------------------------------- |
| `ResultAsync.fromPromise(promise, mapError?)` | Create from a Promise that may reject    |
| `ResultAsync.fromSafePromise(promise)`        | Create from a Promise that never rejects |
| `ResultAsync.ok(value)`                       | Create a resolved Ok                     |
| `ResultAsync.err(error)`                      | Create a resolved Err                    |

### Instance Methods

ResultAsync instances have the same methods as Result, but they return `ResultAsync` or `Promise`:

```typescript
const result = await ResultAsync.fromPromise(fetch("/api"))
  .map(response => response.data) // ResultAsync
  .andThen(data => processAsync(data)) // ResultAsync
  .unwrapOr(defaultData); // Promise<T>
```

## Option Methods

Methods available on Some and None variants. See [The Option Type](../concepts/option-type) for detailed documentation.

| Method                  | Some behavior            | None behavior      |
| ----------------------- | ------------------------ | ------------------ |
| `isSome()`              | Returns `true`           | Returns `false`    |
| `isNone()`              | Returns `false`          | Returns `true`     |
| `map(f)`                | Returns `some(f(value))` | Returns `none()`   |
| `andThen(f)`            | Returns `f(value)`       | Returns `none()`   |
| `unwrapOr(default)`     | Returns `value`          | Returns `default`  |
| `match(onSome, onNone)` | Returns `onSome(value)`  | Returns `onNone()` |

## Import Examples

```typescript
// Core factories and types
import { ok, err, type Result } from "@hex-di/result";

// Option types
import { some, none, type Option } from "@hex-di/result";

// Async support
import { ResultAsync, fromPromise, fromAsyncThrowable } from "@hex-di/result";

// Combinators
import { all, any, partition, zipOrAccumulate } from "@hex-di/result";

// Constructors
import { fromNullable, fromPredicate, fromThrowable } from "@hex-di/result";

// Generators and Do notation
import { safeTry, bind, let_ } from "@hex-di/result";

// Error patterns
import { createError, createErrorGroup, assertNever } from "@hex-di/result";

// Type utilities
import type { InferOk, InferErr, IsResult } from "@hex-di/result";

// Effect types
import type {
  PureResult,
  EffectfulResult,
  EffectOf,
  IsEffectFree,
  MaskEffects,
  LiftEffect,
  EffectUnion,
} from "@hex-di/result";

// Effect contracts
import type {
  EffectContract,
  SatisfiesContract,
  ComposeContracts,
  TaggedError,
} from "@hex-di/result";

// Effect handlers
import {
  composeHandlers,
  identityHandler,
  transformEffects,
  type EffectHandler,
  type NarrowedError,
} from "@hex-di/result";
```
