# 05 — Composition

Functions that combine multiple `Result` values into a single `Result`.

## BEH-05-001: all(...results)

Combines a tuple of `Result` values. If all are `Ok`, returns `Ok` with a tuple of all values. Short-circuits on the first `Err`.

```ts
function all<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| All `Ok` | `Ok` with a tuple of all values, preserving order |
| Any `Err` | First `Err` encountered (remaining results are not inspected) |

**Type-level behavior**:
- `InferOkTuple<R>` maps each `Result` in the tuple to its `Ok` type, producing a tuple type
- `InferErrUnion<R>` produces the union of all `Err` types from the tuple

**Example**:
```ts
all(ok(1), ok("hello"), ok(true))
// → Ok<[number, string, boolean], never>

all(ok(1), err("fail"), ok(true))
// → Err<[number, string, boolean], string>  (short-circuits at second element)
```

## BEH-05-002: allSettled(...results)

Combines a tuple of `Result` values. If all are `Ok`, returns `Ok` with a tuple of all values. If any are `Err`, collects **all** errors (no short-circuit).

```ts
function allSettled<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, InferErrUnion<R>[]>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| All `Ok` | `Ok` with a tuple of all values |
| Any `Err` | `Err` with an **array** of all error values (not just the first) |

**Key difference from `all`**: `allSettled` iterates through every result regardless of errors. The error type is an **array** (`InferErrUnion<R>[]`) because multiple errors may be collected.

**Example**:
```ts
allSettled(ok(1), err("a"), err("b"))
// → Err<never, ["a", "b"]>  (both errors collected)
```

## BEH-05-003: any(...results)

Returns the first `Ok` value found. If all are `Err`, returns `Err` with all errors.

```ts
function any<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkUnion<R>, InferErrTuple<R>>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| Any `Ok` | First `Ok` encountered (remaining results are not inspected) |
| All `Err` | `Err` with a tuple of all error values |

**Type-level behavior**:
- `InferOkUnion<R>` produces the **union** of all `Ok` types (since any one could be the winner)
- `InferErrTuple<R>` maps each `Result` to its `Err` type, producing a **tuple** (all errors are collected positionally)

**Example**:
```ts
any(err("a"), ok(42), err("b"))
// → Ok<number, [string, never, string]>  (short-circuits at second element)

any(err("a"), err("b"))
// → Err<never, [string, string]>
```

## BEH-05-004: collect(record)

Combines a record of `Result` values into a `Result` of a record. Short-circuits on the first `Err`.

```ts
function collect<R extends Record<string, Result<unknown, unknown>>>(
  results: R
): Result<{ [K in keyof R]: InferOk<R[K]> }, InferErr<R[keyof R]>>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| All values `Ok` | `Ok` with a record mapping each key to its unwrapped value |
| Any value `Err` | First `Err` encountered |

**Iteration order**: Uses `Object.keys()`, so iteration follows standard JavaScript property ordering.

**Example**:
```ts
collect({ name: ok("Alice"), age: ok(30) })
// → Ok<{ name: string; age: number }, never>

collect({ name: ok("Alice"), age: err("invalid") })
// → Err<{ name: string; age: number }, string>
```

## BEH-05-005: partition(results)

Splits an array of `Result` values into separate Ok and Err arrays. Processes every element (no short-circuit).

```ts
function partition<T, E>(
  results: readonly Result<T, E>[]
): [T[], E[]]
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| Mixed Ok/Err | `[okValues[], errValues[]]` — both arrays preserve order |
| All Ok | `[allValues[], []]` |
| All Err | `[[], allErrors[]]` |

**Example**:
```ts
partition([ok(1), err("a"), ok(2), err("b")])
// → [[1, 2], ["a", "b"]]
```

**Key difference from `all`/`allSettled`**: `partition` does not return a `Result` — it returns a plain tuple of two arrays. Use it when you need to process both successes and failures independently.

## BEH-05-006: forEach(items, f)

Maps items through a `Result`-returning function, short-circuiting on the first `Err`.

```ts
function forEach<T, U, E>(
  items: readonly T[],
  f: (item: T, index: number) => Result<U, E>
): Result<U[], E>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| All `f` calls return Ok | `Ok` with array of all mapped values |
| Any `f` call returns Err | First `Err` encountered (remaining items are not processed) |

**Example**:
```ts
forEach([1, 2, 3], n => n > 0 ? ok(n * 2) : err("negative"))
// → Ok<[2, 4, 6]>

forEach([1, -1, 3], n => n > 0 ? ok(n * 2) : err("negative"))
// → Err<"negative">  (short-circuits at index 1)
```

**Difference from `all(...items.map(f))`**: `forEach` short-circuits during iteration, avoiding the cost of mapping all items before checking results.

## BEH-05-007: zipOrAccumulate(...results)

Combines a tuple of `Result` values. If all are `Ok`, returns `Ok` with a tuple of all values. If any are `Err`, collects **all** errors into a `NonEmptyArray`.

```ts
function zipOrAccumulate<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, NonEmptyArray<InferErrUnion<R>>>
```

**Behavior**:

| Input | Output |
| ----- | ------ |
| All `Ok` | `Ok` with a tuple of all values |
| Any `Err` | `Err` with a `NonEmptyArray` of all error values |

**Type-level guarantee**: The error type is `NonEmptyArray<InferErrUnion<R>>` (alias for `[E, ...E[]]`), which guarantees at least one error is present. This is stronger than `allSettled` which returns `InferErrUnion<R>[]` (potentially empty array type).

**Example**:
```ts
zipOrAccumulate(ok(1), err("a"), err("b"))
// → Err<NonEmptyArray<string>>  →  Err<["a", "b"]>

zipOrAccumulate(ok(1), ok("hello"), ok(true))
// → Ok<[number, string, boolean]>
```

**Difference from `allSettled`**: `zipOrAccumulate` returns `NonEmptyArray<E>` instead of `E[]`, providing a compile-time guarantee that the error array is non-empty. Named after Kotlin Arrow's `zipOrAccumulate`.

See [type-system/utility.md](../type-system/utility.md#nonemptyarrayt) for the `NonEmptyArray` type definition.

## BEH-05-008: Static Combinators on ResultAsync

`ResultAsync` exposes all combinators as static methods:

```ts
ResultAsync.all = all;
ResultAsync.allSettled = allSettled;
ResultAsync.any = any;
ResultAsync.collect = collect;
ResultAsync.partition = partition;
ResultAsync.forEach = forEach;
ResultAsync.zipOrAccumulate = zipOrAccumulate;
```

These are the **same** functions — they accept sync `Result` values. For async pipelines, chain with `andThen` or use `toAsync()` to lift sync results first.

### ResultAsync.race(...results)

```ts
static race<R extends readonly ResultAsync<unknown, unknown>[]>(
  ...results: R
): ResultAsync<InferOkUnion<R>, InferErrUnion<R>>
```

Returns the first `ResultAsync` to resolve (whether `Ok` or `Err`). Analogous to `Promise.race()` but returns a `ResultAsync`.

**Behavior**: Resolves with the first result to settle, regardless of variant. Unlike `any()`, which returns the first `Ok`, `race()` returns whichever settles first.

**Example**:
```ts
ResultAsync.race(
  fetchFromPrimary(),    // ResultAsync<Data, Error>
  fetchFromFallback()    // ResultAsync<Data, Error>
)
// → whichever resolves first
```
