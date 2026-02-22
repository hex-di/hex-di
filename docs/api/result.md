---
title: "@hex-di/result"
description: API reference for @hex-di/result — Rust-style Result<T,E> type with combinators, async support, and Option type.
sidebar_position: 3
sidebar_label: "@hex-di/result"
---

# @hex-di/result API Reference

Rust-style `Result<T, E>` type for TypeScript. Errors as values — no throws, no surprises.

## Installation

```bash
pnpm add @hex-di/result
```

## Overview

`@hex-di/result` provides:
- `ok` / `err` — Factories for success and failure values
- `Result<T, E>` — Discriminated union type (`Ok<T, E> | Err<T, E>`)
- `ResultAsync<T, E>` — Async result wrapper
- Type guards: `isResult`, `isResultAsync`, `isOption`
- Constructors: `fromThrowable`, `fromNullable`, `fromPredicate`, `tryCatch`, `fromPromise`
- Combinators: `all`, `allSettled`, `any`, `collect`, `partition`, `forEach`, `zipOrAccumulate`
- Option type: `Option<T>` (`Some<T> | None`), `fromOptionJSON`
- Do notation: `bind`, `let_`
- Error patterns: `createError`, `createErrorGroup`, `assertNever`
- Generator-based flow: `safeTry`

## Quick Start

```typescript
import { ok, err, type Result } from '@hex-di/result';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err('division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}

// Method chaining
const doubled = divide(10, 2)
  .map(n => n * 2)
  .unwrapOr(0);  // 10
```

## Core Types

### `Result<T, E>`

A discriminated union of `Ok<T, E> | Err<T, E>`.

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>;
```

Both variants share a rich API of methods for transforming, combining, and extracting values.

### `Ok<T, E>`

The success variant. `ok(value)` produces `Ok<T, never>` — the `E` phantom parameter widens to match any `E` in context.

**Properties:**
- `_tag: "Ok"`
- `value: T`

### `Err<T, E>`

The failure variant. `err(error)` produces `Err<never, E>`.

**Properties:**
- `_tag: "Err"`
- `error: E`

## Factories

### `ok(value)`

Creates a success result.

```typescript
function ok<T>(value: T): Ok<T, never>
```

```typescript
const result = ok(42);
result.isOk();     // true
result.value;      // 42
```

### `err(error)`

Creates a failure result.

```typescript
function err<E>(error: E): Err<never, E>
```

```typescript
const result = err('not found');
result.isErr();    // true
result.error;      // 'not found'
```

### `isResult(value)`

Runtime type guard for synchronous results.

```typescript
import { isResult } from '@hex-di/result';

if (isResult(maybeResult)) {
  // maybeResult is Result<unknown, unknown>
}
```

### `isResultAsync(value)`

Runtime type guard for `ResultAsync`.

```typescript
import { isResultAsync } from '@hex-di/result';

if (isResultAsync(maybeResult)) {
  // maybeResult is ResultAsync<unknown, unknown>
}
```

## Result Methods

Both `Ok` and `Err` implement the same method set — the behavior differs by variant.

### Type Guards

| Method | Description |
|--------|-------------|
| `isOk()` | `true` if Ok |
| `isErr()` | `true` if Err |
| `isOkAnd(predicate)` | `true` if Ok and predicate passes |
| `isErrAnd(predicate)` | `true` if Err and predicate passes |

### Transformations

| Method | Ok behavior | Err behavior |
|--------|-------------|--------------|
| `map(f)` | Applies `f` to value | Returns self |
| `mapErr(f)` | Returns self | Applies `f` to error |
| `mapBoth(onOk, onErr)` | Applies `onOk` | Applies `onErr` |
| `flatten()` | Unwraps `Ok<Result<U, E2>, E>` | Returns self |
| `flip()` | Returns `Err(value)` | Returns `Ok(error)` |

### Chaining

| Method | Ok behavior | Err behavior |
|--------|-------------|--------------|
| `andThen(f)` | Calls `f(value)` | Returns self |
| `orElse(f)` | Returns self | Calls `f(error)` |
| `andTee(f)` | Calls `f(value)` (side-effect), returns self | Returns self |
| `orTee(f)` | Returns self | Calls `f(error)` (side-effect), returns self |
| `andThrough(f)` | Calls `f(value)`, propagates Err if it fails | Returns self |
| `inspect(f)` | Calls `f(value)`, returns self | Returns self |
| `inspectErr(f)` | Returns self | Calls `f(error)`, returns self |

### Logical Combinators

| Method | Ok behavior | Err behavior |
|--------|-------------|--------------|
| `and(other)` | Returns `other` | Returns self |
| `or(other)` | Returns self | Returns `other` |

### Extraction

| Method | Description |
|--------|-------------|
| `match(onOk, onErr)` | Pattern match — returns `onOk(value)` or `onErr(error)` |
| `unwrapOr(default)` | Returns value or default |
| `unwrapOrElse(f)` | Returns value or `f(error)` |
| `mapOr(default, f)` | Returns `f(value)` or default |
| `mapOrElse(defaultF, f)` | Returns `f(value)` or `defaultF(error)` |
| `contains(value)` | `true` if Ok and value matches |
| `containsErr(error)` | `true` if Err and error matches |
| `expect(message)` | Returns value or throws with message |
| `expectErr(message)` | Returns error or throws with message |

### Conversion

| Method | Ok | Err |
|--------|-----|------|
| `toNullable()` | `value` | `null` |
| `toUndefined()` | `value` | `undefined` |
| `intoTuple()` | `[null, value]` | `[error, null]` |
| `merge()` | `value` | `error` |
| `toOption()` | `Some(value)` | `None` |
| `toOptionErr()` | `None` | `Some(error)` |
| `toJSON()` | `{ _tag: "Ok", _schemaVersion: 1, value }` | `{ _tag: "Err", _schemaVersion: 1, error }` |

### Async Bridges

| Method | Description |
|--------|-------------|
| `toAsync()` | Wraps in `ResultAsync` |
| `asyncMap(f)` | Maps with an async function |
| `asyncAndThen(f)` | Chains with a function returning `ResultAsync` |

### Generator Protocol

`Result` implements `[Symbol.iterator]`, enabling use inside `safeTry`:

```typescript
const result = safeTry(function* () {
  const a = yield* ok(10);   // 10
  const b = yield* err('!'); // short-circuits here
  return ok(a + b);
});
// result = err('!')
```

## Constructors

### `fromThrowable(fn, mapError?)`

Wraps a function that may throw.

```typescript
function fromThrowable<T, E>(
  fn: () => T,
  mapError?: (e: unknown) => E
): Result<T, E>
```

```typescript
const result = fromThrowable(() => JSON.parse(input));
// Ok<unknown, unknown> or Err<never, unknown>

const typed = fromThrowable(
  () => JSON.parse(input) as Config,
  e => new ParseError(String(e))
);
```

### `tryCatch(fn, mapError?)`

Alias for `fromThrowable` — wraps synchronous throwable code.

### `fromNullable(value, error)`

Converts `T | null | undefined` to `Result<T, E>`.

```typescript
function fromNullable<T, E>(value: T | null | undefined, error: E): Result<T, E>
```

```typescript
const result = fromNullable(user, 'user not found');
// Ok(user) or err('user not found')
```

### `fromPredicate(value, predicate, onFail)`

Creates `Ok` if predicate passes.

```typescript
function fromPredicate<T, E>(
  value: T,
  predicate: (v: T) => boolean,
  onFail: (v: T) => E
): Result<T, E>
```

```typescript
const result = fromPredicate(age, n => n >= 18, n => `too young: ${n}`);
```

### `fromPromise(promise, mapError?)`

Converts a `Promise<T>` that may reject.

```typescript
function fromPromise<T, E>(
  promise: Promise<T>,
  mapError?: (e: unknown) => E
): ResultAsync<T, E>
```

```typescript
const result = fromPromise(fetch('/api/users'), e => new NetworkError(e));
```

### `fromSafePromise(promise)`

Converts a `Promise<T>` that never rejects.

```typescript
const result = fromSafePromise(Promise.resolve(42));
// ResultAsync<number, never>
```

### `fromAsyncThrowable(fn, mapError?)`

Wraps an async function that may throw.

```typescript
const safeDbQuery = fromAsyncThrowable(
  async (id: string) => db.find(id),
  e => new DatabaseError(e)
);

const result = await safeDbQuery('123');
```

## ResultAsync

`ResultAsync<T, E>` wraps a `Promise<Result<T, E>>` with the same method API.

```typescript
import { ResultAsync } from '@hex-di/result';

// Create from a promise
const result = ResultAsync.fromPromise(fetch('/api'), e => new Error(String(e)));

// Chain async operations
const user = await ResultAsync.fromPromise(fetchUser(id), toNetworkError)
  .andThen(user => ResultAsync.fromPromise(fetchProfile(user.id), toNetworkError))
  .map(profile => ({ ...profile, enriched: true }))
  .unwrapOr(null);
```

**Static methods:**
- `ResultAsync.fromPromise(promise, mapError?)` — From a rejectable promise
- `ResultAsync.fromSafePromise(promise)` — From a never-rejecting promise
- `ResultAsync.ok(value)` — Resolved Ok
- `ResultAsync.err(error)` — Resolved Err

**Instance methods:** Same API as `Result` (all async, return `ResultAsync` or `Promise`).

## Combinators

### `all(results)`

All Ok → Ok of all values. Any Err → first Err.

```typescript
import { all } from '@hex-di/result';

const result = all([ok(1), ok(2), ok(3)]);
// Ok([1, 2, 3])

const failed = all([ok(1), err('oops'), ok(3)]);
// err('oops')
```

### `allSettled(results)`

Always Ok with an array of all outcomes.

```typescript
import { allSettled } from '@hex-di/result';

const results = allSettled([ok(1), err('fail'), ok(3)]);
// Ok([Ok(1), err('fail'), Ok(3)])
```

### `any(results)`

First Ok wins. All Err → Err of all errors.

```typescript
import { any } from '@hex-di/result';

const result = any([err('a'), ok(2), err('c')]);
// ok(2)
```

### `collect(results)`

Like `all` but for an array of Results.

### `partition(results)`

Separates Ok values and Err values.

```typescript
import { partition } from '@hex-di/result';

const [values, errors] = partition([ok(1), err('a'), ok(3), err('b')]);
// values = [1, 3], errors = ['a', 'b']
```

### `zipOrAccumulate(results)`

Accumulates all errors instead of short-circuiting.

```typescript
import { zipOrAccumulate } from '@hex-di/result';

const result = zipOrAccumulate([err('e1'), ok(2), err('e3')]);
// err(['e1', 'e3'])
```

### `forEach(results, fn)`

Iterates over Ok values, stopping on first Err.

## Generators

### `safeTry(generator)`

Enables generator-based sequential Result operations:

```typescript
import { safeTry, ok, err, fromNullable } from '@hex-di/result';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseUser(raw: unknown): Result<User, string> {
  return safeTry(function* () {
    if (!isRecord(raw)) return err('invalid input');
    const id = yield* fromNullable(
      typeof raw['id'] === 'string' ? raw['id'] : undefined,
      'missing id',
    );
    const name = yield* fromNullable(
      typeof raw['name'] === 'string' ? raw['name'] : undefined,
      'missing name',
    );
    return ok({ id, name });
  });
}
```

Each `yield*` short-circuits the generator on `Err`.

## Do Notation

### `bind(name, f)`

Adds a named `Result` value to the Do context. Short-circuits on `Err`. Returns a callback compatible with `.andThen()`.

```typescript
function bind<N extends string, Ctx extends Record<string, unknown>, T, E>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => Result<T, E>,
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, E>
```

```typescript
import { ok, bind } from '@hex-di/result';

const result = ok({} as Record<string, never>)
  .andThen(bind('a', () => ok(1)))
  .andThen(bind('b', ({ a }) => ok(a + 1)))
  .map(({ a, b }) => a + b);
// ok(3)
```

The `name` must not already exist in the context — enforced at the type level.

### `let_(name, f)`

Adds a non-`Result` computed value to the Do context. Never short-circuits. The trailing underscore avoids collision with the `let` keyword.

```typescript
function let_<N extends string, Ctx extends Record<string, unknown>, T>(
  name: Exclude<N, keyof Ctx>,
  f: (ctx: Ctx) => T,
): (ctx: Ctx) => Result<Ctx & { readonly [K in N]: T }, never>
```

```typescript
import { ok, bind, let_ } from '@hex-di/result';

const result = ok({} as Record<string, never>)
  .andThen(bind('user', () => ok({ name: 'Alice' })))
  .andThen(let_('greeting', ({ user }) => `Hello, ${user.name}`))
  .map(({ greeting }) => greeting);
// ok('Hello, Alice')
```

## Option Type

### `Option<T>`

`Some<T> | None` for nullable values without `null`.

```typescript
import { some, none, type Option } from '@hex-di/result';

const found: Option<User> = some(user);
const missing: Option<User> = none();

if (found.isSome()) {
  console.log(found.value);
}
```

### `some(value)` / `none()`

```typescript
function some<T>(value: T): Some<T>
function none(): None
```

### `isOption(value)`

Runtime type guard for `Option`.

```typescript
import { isOption } from '@hex-di/result';

if (isOption(maybeOption)) {
  // maybeOption is Option<unknown>
}
```

### `fromOptionJSON(json)`

Deserializes an `OptionJSON` back to `Option<T>`.

```typescript
import { fromOptionJSON } from '@hex-di/result';

const json = { _tag: 'Some', value: 42 };
const option = fromOptionJSON(json); // some(42)

const none = fromOptionJSON({ _tag: 'None' }); // none()
```

### Option methods

| Method | Some | None |
|--------|------|------|
| `isSome()` | `true` | `false` |
| `isNone()` | `false` | `true` |
| `map(f)` | `some(f(value))` | `none()` |
| `andThen(f)` | `f(value)` | `none()` |
| `unwrapOr(default)` | `value` | `default` |
| `match(onSome, onNone)` | `onSome(value)` | `onNone()` |

## Error Patterns

### `createError(tag, message?, data?)`

Creates a discriminated error type.

```typescript
import { createError } from '@hex-di/result';

const NotFoundError = createError('NotFound');
const ValidationError = createError('Validation');

type AppError = typeof NotFoundError | typeof ValidationError;

function findUser(id: string): Result<User, AppError> {
  const user = db.get(id);
  if (!user) return err(NotFoundError('user not found'));
  return ok(user);
}

// Discriminate
const result = findUser('1');
if (result.isErr()) {
  switch (result.error._tag) {
    case 'NotFound': ...
    case 'Validation': ...
  }
}
```

### `createErrorGroup(errors)`

Groups related errors under a shared parent.

### `assertNever(value)`

Ensures exhaustive handling at compile time.

```typescript
import { assertNever } from '@hex-di/result';

function handle(error: AppError): never {
  switch (error._tag) {
    case 'NotFound': ...
    case 'Validation': ...
    default: return assertNever(error); // TypeScript error if not exhaustive
  }
}
```

## Serialization / Interop

### `fromJSON(json)`

Deserializes a `ResultJSON` back to `Result`.

```typescript
import { fromJSON } from '@hex-di/result';

const json = { _tag: 'Ok', _schemaVersion: 1, value: 42 };
const result = fromJSON(json); // Ok(42)
```

### `toSchema(result)`

Converts to a Standard Schema v1 compatible value.

## Type Utilities

| Utility | Description |
|---------|-------------|
| `InferOk<R>` | Extract `T` from `Result<T, E>` |
| `InferErr<R>` | Extract `E` from `Result<T, E>` |
| `InferAsyncOk<R>` | Extract `T` from `ResultAsync<T, E>` |
| `InferAsyncErr<R>` | Extract `E` from `ResultAsync<T, E>` |
| `IsResult<R>` | Boolean — is `R` a Result? |
| `FlattenResult<R>` | Flatten `Result<Result<T, E1>, E2>` |
| `InferOkTuple<Results>` | Extract Ok types from tuple |
| `InferErrUnion<Results>` | Union of Err types from tuple |

## Integration with GraphBuilder

`@hex-di/graph`'s `tryBuild()` returns `Result<Graph<TProvides>, GraphBuildError>`:

```typescript
import { GraphBuilder } from '@hex-di/graph';

const result = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .tryBuild();

if (result.isErr()) {
  console.error('Graph build failed:', result.error.message);
  process.exit(1);
}

const container = createContainer({ graph: result.value, name: "App" });
```
