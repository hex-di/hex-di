# Type System — Utility

General-purpose type utilities used across the library.

## NonEmptyArray\<T\>

```ts
type NonEmptyArray<T> = [T, ...T[]];
```

A tuple type that guarantees at least one element. The first element is always present (`T`), followed by zero or more additional elements (`...T[]`).

**Used by**: `zipOrAccumulate` — ensures the error array is non-empty when at least one `Err` is present.

**Behavior**:
- `NonEmptyArray<string>` accepts `["a"]`, `["a", "b"]`, `["a", "b", "c"]`
- `NonEmptyArray<string>` rejects `[]` at the type level
- `const arr: NonEmptyArray<number> = [1, 2, 3]` — valid
- `const arr: NonEmptyArray<number> = []` — type error

**Accessing the first element**:
```ts
function head<T>(arr: NonEmptyArray<T>): T {
  return arr[0]; // TypeScript knows arr[0] is T, not T | undefined
}
```

## ResultJSON\<T, E\>

```ts
type ResultJSON<T, E> = { _tag: "Ok"; value: T } | { _tag: "Err"; error: E };
```

The plain JSON representation of a `Result<T, E>`, as produced by `toJSON()` and consumed by `fromJSON()`.

**Used by**: `toJSON()` return type, `fromJSON()` parameter type.

**Behavior**:
- `ResultJSON<number, string>` → `{ _tag: "Ok"; value: number } | { _tag: "Err"; error: string }`

**Note**: This is a type alias for documentation clarity. The `toJSON()` and `fromJSON()` signatures may inline the union directly rather than referencing this alias.

## DoContext\<Bindings\>

```ts
type DoContext<Bindings extends Record<string, unknown>> = Result<Bindings, never>;
```

Type alias representing the context accumulator in Do notation. Each `bind`/`let_` call extends `Bindings` with a new key.

**Used by**: Do notation (`Result.Do`, `bind`, `let_`). See [12-do-notation.md](../behaviors/12-do-notation.md).

**Behavior**:
```ts
// Start: DoContext<{}>
Result.Do

// After bind("user", ...):
// DoContext<{ user: User }>

// After bind("email", ...):
// DoContext<{ user: User; email: Email }>

// After let_("greeting", ...):
// DoContext<{ user: User; email: Email; greeting: string }>
```

The error type in the actual chain is the union of all `bind` error types (not `never`). `DoContext` represents only the success-path type accumulation.
