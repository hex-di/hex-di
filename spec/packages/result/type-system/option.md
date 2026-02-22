# Type System — Option

Type-level utilities for extracting type information from `Option`.

## InferSome\<O\>

```ts
type InferSome<O> = O extends Option<infer T> ? T : never;
```

Extracts the contained type `T` from an `Option<T>`. Returns `never` if `O` is not an `Option`.

**Behavior**:
- `InferSome<Option<number>>` → `number`
- `InferSome<Some<string>>` → `string`
- `InferSome<None>` → `never`
- `InferSome<string>` → `never`

## IsOption\<T\>

```ts
type IsOption<T> = T extends Option<unknown> ? true : false;
```

Type-level boolean check. Returns `true` if `T` extends `Option<unknown>`, `false` otherwise.

**Behavior**:
- `IsOption<Option<number>>` → `true`
- `IsOption<Some<string>>` → `true`
- `IsOption<None>` → `true`
- `IsOption<string>` → `false`
- `IsOption<Result<number, string>>` → `false`

## FlattenOption\<O\>

```ts
type FlattenOption<O> =
  O extends Option<Option<infer T>>
    ? Option<T>
    : O;
```

Unwraps one level of `Option` nesting at the type level. If `O` is `Option<Option<T>>`, produces `Option<T>`. If `O` is not a nested `Option`, returns `O` unchanged.

**Behavior**:
- `FlattenOption<Option<Option<number>>>` → `Option<number>`
- `FlattenOption<Option<number>>` → `Option<number>` (unchanged)
- `FlattenOption<Some<Some<string>>>` → `Option<string>`

**Note**: Only unwraps one level. Does not recursively flatten. Mirrors `FlattenResult<R>` from [inference.md](inference.md#flattenresultr).

## OptionJSON\<T\>

```ts
type OptionJSON<T> =
  | { _tag: "Some"; _schemaVersion: 1; value: T }
  | { _tag: "None"; _schemaVersion: 1 };
```

The serialized form of `Option<T>`, produced by `toJSON()` and consumed by `fromOptionJSON()`. Mirrors `ResultJSON<T, E>` for the Result type.

**Behavior**:
- `OptionJSON<number>` → `{ _tag: "Some"; _schemaVersion: 1; value: number } | { _tag: "None"; _schemaVersion: 1 }`
- `OptionJSON<string>` → `{ _tag: "Some"; _schemaVersion: 1; value: string } | { _tag: "None"; _schemaVersion: 1 }`

**Note**: `fromOptionJSON()` accepts a wider input type (with optional `_schemaVersion`) for backward compatibility. `OptionJSON<T>` represents the canonical output format of `toJSON()`.
