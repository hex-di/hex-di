# 09 — Option

The `Option<T>` type models value presence or absence. See [ADR-009](../decisions/009-option-type.md).

## BEH-09-001: OPTION_BRAND

```ts
const OPTION_BRAND: unique symbol = Symbol("Option");
```

A unique symbol attached to every `Option` instance. Its presence is the sole criterion for `isOption()`. Because it is a unique symbol, no external code can forge it.

**Exported from**: `option/brand.ts`

## BEH-09-002: Some\<T\>

The presence variant of `Option`. Interface definition:

```ts
interface Some<T> {
  readonly _tag: "Some";
  readonly value: T;
  readonly [OPTION_BRAND]: true;

  // Type guards
  isSome(): this is Some<T>;              // always returns true
  isNone(): this is None;                 // always returns false
  isSomeAnd(predicate: (value: T) => boolean): boolean;

  // Transformations
  map<U>(f: (value: T) => U): Some<U>;
  filter(predicate: (value: T) => boolean): Option<T>;
  flatten<U>(this: Some<Option<U>>): Option<U>;
  zip<U>(other: Option<U>): Option<[T, U]>;
  zipWith<U, R>(other: Option<U>, f: (a: T, b: U) => R): Option<R>;

  // Chaining
  andThen<U>(f: (value: T) => Option<U>): Option<U>;
  orElse(f: () => Option<T>): Some<T>;

  // Extraction
  match<A, B>(onSome: (value: T) => A, onNone: () => B): A;
  unwrapOr<U>(defaultValue: U): T;
  expect(message: string): T;

  // Conversion
  toResult<E>(onNone: () => E): Ok<T, E>;
  toNullable(): T;
  toUndefined(): T;

  // Serialization
  toJSON(): { _tag: "Some"; _schemaVersion: 1; value: T };

  // Bridge
  transpose<U, E>(this: Some<Result<U, E>>): Result<Some<U>, E>;
}
```

### Type guard behavior

| Method | On Some | On None |
|--------|---------|---------|
| `isSome()` | `true` | `false` |
| `isNone()` | `false` | `true` |
| `isSomeAnd(pred)` | `pred(value)` | `false` |

### Transformation behavior

| Method | On Some | On None |
|--------|---------|---------|
| `map(f)` | `some(f(value))` | `none()` |
| `filter(pred)` | `pred(value) ? self : none()` | `none()` |
| `flatten()` | `value` (the inner Option) | `none()` |
| `zip(other)` | `other.isSome() ? some([value, other.value]) : none()` | `none()` |
| `zipWith(other, f)` | `other.isSome() ? some(f(value, other.value)) : none()` | `none()` |

### Chaining behavior

| Method | On Some | On None |
|--------|---------|---------|
| `andThen(f)` | `f(value)` | `none()` |
| `orElse(f)` | `self` | `f()` |

### Extraction behavior

| Method | On Some | On None |
|--------|---------|---------|
| `match(onSome, onNone)` | `onSome(value)` | `onNone()` |
| `unwrapOr(default)` | `value` | `default` |
| `expect(msg)` | `value` | throws `UnwrapError` |
| `toJSON()` | `{ _tag: "Some", _schemaVersion: 1, value }` | `{ _tag: "None", _schemaVersion: 1 }` |

### Conversion behavior

| Method | On Some | On None |
|--------|---------|---------|
| `toResult(onNone)` | `ok(value)` | `err(onNone())` |
| `toNullable()` | `value` | `null` |
| `toUndefined()` | `value` | `undefined` |

### Bridge: transpose()

Converts `Option<Result<T, E>>` to `Result<Option<T>, E>`:

| Input | Output |
|-------|--------|
| `Some(Ok(value))` | `Ok(Some(value))` |
| `Some(Err(error))` | `Err(error)` |
| `None` | `Ok(None)` |

This is the inverse of `Result.transpose()`. See [03-transformation.md](03-transformation.md#beh-03-021-transpose).

## BEH-09-003: None

The absence variant of `Option`. Interface definition:

```ts
interface None {
  readonly _tag: "None";
  readonly [OPTION_BRAND]: true;

  // Type guards
  isSome(): this is Some<never>;           // always returns false
  isNone(): this is None;                  // always returns true
  isSomeAnd(predicate: (value: never) => boolean): boolean;  // always returns false

  // Transformations
  map<U>(f: (value: never) => U): None;
  filter(predicate: (value: never) => boolean): None;
  flatten(): None;
  zip<U>(other: Option<U>): None;
  zipWith<U, R>(other: Option<U>, f: (a: never, b: U) => R): None;

  // Chaining
  andThen<U>(f: (value: never) => Option<U>): None;
  orElse<T>(f: () => Option<T>): Option<T>;

  // Extraction
  match<A, B>(onSome: (value: never) => A, onNone: () => B): B;
  unwrapOr<U>(defaultValue: U): U;
  expect(message: string): never;  // throws UnwrapError

  // Conversion
  toResult<E>(onNone: () => E): Err<never, E>;
  toNullable(): null;
  toUndefined(): undefined;

  // Serialization
  toJSON(): { _tag: "None"; _schemaVersion: 1 };

  // Bridge
  transpose(): Ok<None, never>;
}
```

`None` methods follow the same contracts as `Some` but with "absent" behavior — transformations return `None`, chaining returns `None`, and extraction returns defaults or throws.

## BEH-09-004: Option\<T\>

```ts
type Option<T> = Some<T> | None;
```

Discriminated union. TypeScript narrows to the correct variant after checking `_tag`, `isSome()`, or `isNone()`.

## BEH-09-005: some(value)

```ts
function some<T>(value: T): Some<T>
```

Creates a frozen `Some` instance with the given value.

**Behavior**:
1. Constructs a plain object implementing the `Some<T>` interface
2. All methods are closures capturing `value`
3. Stamps the object with `[OPTION_BRAND]: true`
4. Calls `Object.freeze()` before returning

See [INV-10](../invariants.md#inv-10-frozen-option-instances).

## BEH-09-006: none()

```ts
function none(): None
```

Returns a frozen `None` singleton instance.

**Behavior**:
1. Returns a pre-constructed, frozen plain object implementing the `None` interface
2. The singleton is stamped with `[OPTION_BRAND]: true`
3. `Object.freeze()` is called once at module initialization

See [INV-10](../invariants.md#inv-10-frozen-option-instances).

## BEH-09-007: isOption(value)

```ts
function isOption(value: unknown): value is Option<unknown>
```

Standalone type guard using brand-based checking.

**Algorithm**:
1. If `value` is `null`, `undefined`, or not an `object` → return `false`
2. If `OPTION_BRAND in value` → return `true`
3. Otherwise → return `false`

See [INV-11](../invariants.md#inv-11-option-brand-prevents-forgery).

## BEH-09-008: Option.fromNullable(value)

```ts
function fromNullable<T>(value: T | null | undefined): Option<T>
```

Converts a nullable value to an `Option`.

| Input | Output |
|-------|--------|
| `value === null` | `none()` |
| `value === undefined` | `none()` |
| Any other value | `some(value)` |

**Import path**: `@hex-di/result/option`

## BEH-09-009: Option.toJSON()

Serializes an `Option` to a plain JSON-compatible object with schema versioning.

```ts
// On Some<T>:
toJSON(): { _tag: "Some"; _schemaVersion: 1; value: T }

// On None:
toJSON(): { _tag: "None"; _schemaVersion: 1 }
```

| Variant | Behavior |
|---------|----------|
| Some | Returns `{ _tag: "Some", _schemaVersion: 1, value }` |
| None | Returns `{ _tag: "None", _schemaVersion: 1 }` |

**Note**: The output is a plain object (not frozen, not branded). It is suitable for `JSON.stringify()` but is not itself an `Option`. The `_schemaVersion` field enables long-term archive compatibility per [DRR-4](../compliance/gxp.md#option-serialization-for-data-retention).

## BEH-09-010: fromOptionJSON(json)

Deserializes a plain JSON object back into a branded, frozen `Option`. The inverse of `toJSON()`.

```ts
function fromOptionJSON<T>(
  json: { _tag: "Some"; _schemaVersion?: number; value: T } | { _tag: "None"; _schemaVersion?: number }
): Option<T>
```

| Input._tag | Output |
|------------|--------|
| `"Some"` | `some(json.value)` — branded, frozen |
| `"None"` | `none()` — branded, frozen |
| Other | Throws `TypeError` |

**Backward compatibility**: `fromOptionJSON()` accepts both the versioned format (with `_schemaVersion`) and the legacy format (without `_schemaVersion`). The `_schemaVersion` field is optional on input.

**Round-trip guarantee**: `fromOptionJSON(option.toJSON())` produces a genuine `Option` that passes `isOption()`.

**Import path**: `@hex-di/result/option`
