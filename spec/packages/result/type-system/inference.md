# Type System — Inference

Type-level utilities for extracting type information from `Result` and `ResultAsync`.

## InferOk\<R\>

```ts
type InferOk<R> =
  R extends Result<infer T, unknown> ? T
  : R extends ResultAsync<infer T, unknown> ? T
  : never;
```

Extracts the success type `T` from a `Result<T, E>` or `ResultAsync<T, E>`. Returns `never` if `R` is neither.

**Behavior**:
- `InferOk<Result<number, string>>` → `number`
- `InferOk<ResultAsync<number, string>>` → `number`
- `InferOk<string>` → `never`

## InferErr\<R\>

```ts
type InferErr<R> =
  R extends Result<unknown, infer E> ? E
  : R extends ResultAsync<unknown, infer E> ? E
  : never;
```

Extracts the error type `E` from a `Result<T, E>` or `ResultAsync<T, E>`. Returns `never` if `R` is neither.

**Behavior**:
- `InferErr<Result<number, string>>` → `string`
- `InferErr<ResultAsync<number, string>>` → `string`
- `InferErr<number>` → `never`

## InferAsyncOk\<R\>

```ts
type InferAsyncOk<R> = R extends ResultAsync<infer T, unknown> ? T : never;
```

Extracts the success type `T` from a `ResultAsync<T, E>` only. Does **not** match sync `Result`. Returns `never` if `R` is not a `ResultAsync`.

**Behavior**:
- `InferAsyncOk<ResultAsync<number, string>>` → `number`
- `InferAsyncOk<Result<number, string>>` → `never`

## InferAsyncErr\<R\>

```ts
type InferAsyncErr<R> = R extends ResultAsync<unknown, infer E> ? E : never;
```

Extracts the error type `E` from a `ResultAsync<T, E>` only. Does **not** match sync `Result`. Returns `never` if `R` is not a `ResultAsync`.

**Behavior**:
- `InferAsyncErr<ResultAsync<number, string>>` → `string`
- `InferAsyncErr<Result<number, string>>` → `never`

## IsResult\<T\>

```ts
type IsResult<T> = T extends Result<unknown, unknown> ? true : false;
```

Type-level boolean check. Returns `true` if `T` extends `Result<unknown, unknown>`, `false` otherwise.

**Behavior**:
- `IsResult<Result<number, string>>` → `true`
- `IsResult<Ok<number, never>>` → `true`
- `IsResult<Err<never, string>>` → `true`
- `IsResult<string>` → `false`

## IsResultAsync\<T\>

```ts
type IsResultAsync<T> = T extends ResultAsync<unknown, unknown> ? true : false;
```

Type-level boolean check. Returns `true` if `T` extends `ResultAsync<unknown, unknown>`, `false` otherwise.

**Behavior**:
- `IsResultAsync<ResultAsync<number, string>>` → `true`
- `IsResultAsync<Result<number, string>>` → `false`
- `IsResultAsync<Promise<number>>` → `false`

## FlattenResult\<R\>

```ts
type FlattenResult<R> =
  R extends Result<Result<infer T, infer E1>, infer E2>
    ? Result<T, E1 | E2>
    : R;
```

Unwraps one level of `Result` nesting at the type level. If `R` is `Result<Result<T, E1>, E2>`, produces `Result<T, E1 | E2>`. If `R` is not a nested `Result`, returns `R` unchanged.

**Behavior**:
- `FlattenResult<Result<Result<number, "inner">, "outer">>` → `Result<number, "inner" | "outer">`
- `FlattenResult<Result<number, string>>` → `Result<number, string>` (unchanged)

**Note**: Only unwraps one level. Does not recursively flatten.

## Option Inference Types

See [type-system/option.md](option.md) for Option-specific inference utilities:

- `InferSome<O>` — Extract `T` from `Option<T>`
- `IsOption<T>` — Type-level boolean check for Option
- `FlattenOption<O>` — Unwrap nested `Option<Option<T>>`
