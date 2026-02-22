# 04 — Extraction

Methods that extract the contained value or error from the `Result` wrapper.

## BEH-04-001: match(onOk, onErr)

Pattern matching / fold. Applies the appropriate function and returns its result. The `Result` wrapper is removed.

```ts
// On Ok<T, E>:
match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A

// On Err<T, E>:
match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): B
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `onOk(value)` |
| Err     | Returns `onErr(error)` |

**Note**: This is the primary safe extraction method. Both branches must be handled.

## BEH-04-002: unwrapOr(defaultValue)

Extracts the `Ok` value, or returns the default if `Err`.

```ts
// On Ok<T, E>:
unwrapOr<U>(defaultValue: U): T

// On Err<T, E>:
unwrapOr<U>(defaultValue: U): U
```

| Variant | Behavior             |
| ------- | -------------------- |
| Ok      | Returns `value`      |
| Err     | Returns `defaultValue` |

## BEH-04-003: unwrapOrElse(f)

Extracts the `Ok` value, or computes a fallback from the error.

```ts
// On Ok<T, E>:
unwrapOrElse<U>(f: (error: E) => U): T

// On Err<T, E>:
unwrapOrElse<U>(f: (error: E) => U): U
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `value`    |
| Err     | Returns `f(error)` |

## BEH-04-004: expect(message)

Assertive extraction of the `Ok` value. Throws if `Err`.

```ts
// On Ok<T, E>:
expect(message: string): T

// On Err<T, E>:
expect(message: string): never  // throws UnwrapError(message, { _tag: "Err", value: error })
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `value`    |
| Err     | Throws `new UnwrapError(message, { _tag: "Err", value: error })` |

**Use case**: When the programmer knows the result must be `Ok` and wants a descriptive error if that assumption is wrong. Not for general error handling.

**Note**: Throws `UnwrapError` (not plain `Error`) with structured context. See [11-unsafe.md](11-unsafe.md) and [INV-12](../invariants.md#inv-12-unwraperror-contains-context).

## BEH-04-005: expectErr(message)

Assertive extraction of the `Err` error. Throws if `Ok`.

```ts
// On Ok<T, E>:
expectErr(message: string): never  // throws UnwrapError(message, { _tag: "Ok", value: value })

// On Err<T, E>:
expectErr(message: string): E
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Throws `new UnwrapError(message, { _tag: "Ok", value: value })` |
| Err     | Returns `error`    |

**Use case**: Testing assertions where the result is expected to be an error.

**Note**: Throws `UnwrapError` (not plain `Error`) with structured context. See [11-unsafe.md](11-unsafe.md) and [INV-12](../invariants.md#inv-12-unwraperror-contains-context).

## BEH-04-006: toNullable()

Converts to a nullable value. `Ok` returns the value; `Err` returns `null`.

```ts
// On Ok<T, E>:
toNullable(): T

// On Err<T, E>:
toNullable(): null
```

| Variant | Behavior        |
| ------- | --------------- |
| Ok      | Returns `value` |
| Err     | Returns `null`  |

## BEH-04-007: toUndefined()

Converts to an optional value. `Ok` returns the value; `Err` returns `undefined`.

```ts
// On Ok<T, E>:
toUndefined(): T

// On Err<T, E>:
toUndefined(): undefined
```

| Variant | Behavior           |
| ------- | ------------------ |
| Ok      | Returns `value`    |
| Err     | Returns `undefined` |

## BEH-04-008: intoTuple()

Go-style error tuple. Returns `[error, value]` where one position is always `null`.

```ts
// On Ok<T, E>:
intoTuple(): [null, T]

// On Err<T, E>:
intoTuple(): [E, null]
```

| Variant | Behavior                |
| ------- | ----------------------- |
| Ok      | Returns `[null, value]` |
| Err     | Returns `[error, null]` |

**Convention**: Error is the first element, value is the second — matching Go's `err, val` pattern.

## BEH-04-009: merge()

Extracts the contained value regardless of variant. Returns `T | E`.

```ts
// On Ok<T, E>:
merge(): T

// On Err<T, E>:
merge(): E
```

| Variant | Behavior         |
| ------- | ---------------- |
| Ok      | Returns `value`  |
| Err     | Returns `error`  |

**Use case**: When `T` and `E` are the same type (or compatible) and you don't care which variant it is.

## BEH-04-010: toJSON()

Serializes the `Result` to a plain JSON-compatible object.

```ts
// On Ok<T, E>:
toJSON(): { _tag: "Ok"; _schemaVersion: 1; value: T }

// On Err<T, E>:
toJSON(): { _tag: "Err"; _schemaVersion: 1; error: E }
```

| Variant | Behavior                                            |
| ------- | --------------------------------------------------- |
| Ok      | Returns `{ _tag: "Ok", _schemaVersion: 1, value }`  |
| Err     | Returns `{ _tag: "Err", _schemaVersion: 1, error }` |

**Note**: The output is a plain object (not frozen, not branded). It is suitable for `JSON.stringify()` but is not itself a `Result`.

## BEH-04-011: fromJSON(json)

Deserializes a plain JSON object back into a branded, frozen `Result`. The inverse of `toJSON()`.

```ts
function fromJSON<T, E>(
  json: { _tag: "Ok"; _schemaVersion?: number; value: T } | { _tag: "Err"; _schemaVersion?: number; error: E }
): Result<T, E>
```

**Backward compatibility**: `fromJSON()` accepts both the versioned format (with `_schemaVersion`) and the legacy format (without `_schemaVersion`). The `_schemaVersion` field is optional on input.

| Input._tag | Output |
|------------|--------|
| `"Ok"` | `ok(json.value)` — branded, frozen |
| `"Err"` | `err(json.error)` — branded, frozen |
| Other | Throws `TypeError` |

**Round-trip guarantee**: `fromJSON(result.toJSON())` produces a genuine `Result` that passes `isResult()`.

See [13-interop.md](13-interop.md#beh-13-001-fromJSONjson) for full specification.
