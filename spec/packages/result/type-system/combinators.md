# Type System — Combinators

Type-level utilities used by the combinator functions (`all`, `allSettled`, `any`, `collect`).

## InferOkTuple\<T\>

```ts
type InferOkTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]
> = {
  [K in keyof T]: InferOk<T[K]>;
};
```

Maps a tuple of `Result`/`ResultAsync` types to a tuple of their `Ok` types. Preserves tuple structure (position, length).

**Used by**: `all`, `allSettled`

**Behavior**:
- `InferOkTuple<[Result<number, string>, Result<boolean, Error>]>` → `[number, boolean]`
- `InferOkTuple<[ResultAsync<string, never>]>` → `[string]`

## InferErrUnion\<T\>

```ts
type InferErrUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]
> = InferErr<T[number]>;
```

Extracts the union of all `Err` types from a tuple of `Result`/`ResultAsync`. Uses `T[number]` to index into the tuple, producing a union of all element types, then `InferErr` extracts the error type.

**Used by**: `all`, `allSettled`

**Behavior**:
- `InferErrUnion<[Result<number, string>, Result<boolean, Error>]>` → `string | Error`
- `InferErrUnion<[Result<number, never>]>` → `never`

**Note for `allSettled`**: The return type uses `InferErrUnion<R>[]` (array of the union), since multiple errors may be collected.

## InferOkRecord\<T\>

```ts
type InferOkRecord<
  T extends Record<string, Result<unknown, unknown> | ResultAsync<unknown, unknown>>
> = {
  [K in keyof T]: InferOk<T[K]>;
};
```

Maps a record of `Result`/`ResultAsync` types to a record of their `Ok` types. Preserves keys.

**Used by**: `collect`

**Behavior**:
- `InferOkRecord<{ name: Result<string, Error>; age: Result<number, Error> }>` → `{ name: string; age: number }`

**Note**: The `collect` function uses `{ [K in keyof R]: InferOk<R[K]> }` inline rather than `InferOkRecord<R>` directly, but the type structure is equivalent.

## InferOkUnion\<T\>

```ts
type InferOkUnion<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]
> = InferOk<T[number]>;
```

Extracts the union of all `Ok` types from a tuple. Uses `T[number]` to produce the union of all element types, then `InferOk` extracts the success type.

**Used by**: `any` (since any one `Ok` value could be the result)

**Behavior**:
- `InferOkUnion<[Result<number, string>, Result<boolean, Error>]>` → `number | boolean`

## InferErrTuple\<T\>

```ts
type InferErrTuple<
  T extends readonly (Result<unknown, unknown> | ResultAsync<unknown, unknown>)[]
> = {
  [K in keyof T]: InferErr<T[K]>;
};
```

Maps a tuple of `Result`/`ResultAsync` types to a tuple of their `Err` types. Preserves tuple structure (position, length).

**Used by**: `any` (all errors are collected positionally when all results fail)

**Behavior**:
- `InferErrTuple<[Result<number, string>, Result<boolean, Error>]>` → `[string, Error]`

## Summary Table

| Type Utility      | Shape     | Used By       | Purpose                            |
| ----------------- | --------- | ------------- | ---------------------------------- |
| `InferOkTuple`    | Tuple     | `all`, `allSettled`, `zipOrAccumulate` | Map results to Ok tuple |
| `InferErrUnion`   | Union     | `all`, `allSettled`, `zipOrAccumulate` | Collect all error types |
| `InferOkRecord`   | Record    | `collect`     | Map record results to Ok record    |
| `InferOkUnion`    | Union     | `any`, `race` | Any Ok type could win              |
| `InferErrTuple`   | Tuple     | `any`         | Positional error collection        |
| `NonEmptyArray`   | Tuple     | `zipOrAccumulate` | Guarantee non-empty error array |

**Note**: `NonEmptyArray<T>` is defined in [type-system/utility.md](utility.md#nonemptyarrayt). It is `[T, ...T[]]` — a tuple guaranteeing at least one element. Used by `zipOrAccumulate` to ensure the error array is non-empty at the type level.

### New Combinator Type Signatures

#### partition

```ts
function partition<T, E>(results: readonly Result<T, E>[]): [T[], E[]]
```

Returns plain arrays, not a `Result`. No special type utilities needed.

#### forEach

```ts
function forEach<T, U, E>(
  items: readonly T[],
  f: (item: T, index: number) => Result<U, E>
): Result<U[], E>
```

Uses standard array type mapping.

#### zipOrAccumulate

```ts
function zipOrAccumulate<R extends readonly Result<unknown, unknown>[]>(
  ...results: R
): Result<InferOkTuple<R>, NonEmptyArray<InferErrUnion<R>>>
```

Uses `InferOkTuple` for the success type and `NonEmptyArray<InferErrUnion<R>>` for the error type.
