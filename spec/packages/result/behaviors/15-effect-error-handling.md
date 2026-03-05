# 15 — Effect-Based Error Handling

Selective error recovery via `_tag` discriminant matching. Enables per-tag error elimination with type-safe narrowing. See [ADR-014](../decisions/014-catch-tag-effect-elimination.md) and [RES-01](../../../research/RES-01-type-and-effect-systems.md).

## BEH-15-001: catchTag(tag, handler)

Handle a single error variant by its `_tag` discriminant. On match, invokes the handler and removes the tag from the error union via `Exclude`. On non-match (or non-tagged error), passes through unchanged.

```ts
// Ok<T, E> — always passes through, narrows phantom E
catchTag<Tag extends string, T2>(
  tag: Tag,
  handler: (error: Extract<E, { _tag: Tag }>) => Result<T2, never>
): Ok<T, Exclude<E, { _tag: Tag }>>;

// Err<T, E> — checks _tag match
catchTag<Tag extends string, T2>(
  tag: Tag,
  handler: (error: Extract<E, { _tag: Tag }>) => Result<T2, never>
): Result<T | T2, Exclude<E, { _tag: Tag }>>;

// ResultAsync<T, E> — async variant
catchTag<Tag extends string, T2>(
  tag: Tag,
  handler: (error: Extract<E, { _tag: Tag }>) => Result<T2, never> | ResultAsync<T2, never>
): ResultAsync<T | T2, Exclude<E, { _tag: Tag }>>;
```

**Exported from**: `core/types.ts` (interfaces), `core/result.ts` (ok/err implementations), `async/result-async.ts` (async implementation)

**Algorithm**:

1. If `Ok`: return `self` (phantom `E` narrowed by the type system)
2. If `Err`: check `error !== null && typeof error === "object" && "_tag" in error && error._tag === tag`
   - Match: return `handler(error)`
   - No match: return `self`

**Behavior Table**:

| Variant              | `_tag` matches      | Result                         |
| -------------------- | ------------------- | ------------------------------ |
| `Ok(v)`              | N/A                 | `Ok(v)` with narrowed `E`      |
| `Err({ _tag: "A" })` | Yes (`tag === "A"`) | `handler(error)`               |
| `Err({ _tag: "B" })` | No (`tag === "A"`)  | `Err({ _tag: "B" })` unchanged |
| `Err("string")`      | No (not tagged)     | `Err("string")` unchanged      |

**Example**:

```ts
import { ok, err, createError } from "@hex-di/result";

const NotFound = createError("NotFound");
const Timeout = createError("Timeout");

type AppError = ReturnType<typeof NotFound> | ReturnType<typeof Timeout>;

declare function fetchUser(id: string): Result<User, AppError>;

const result = fetchUser("123").catchTag("NotFound", () => ok(defaultUser));
// Type: Result<User, Exclude<AppError, { _tag: "NotFound" }>>
// Which is: Result<User, { _tag: "Timeout"; ... }>
```

**Design notes**:

- Handler must return `Result<T2, never>` (infallible). This ensures the handled tag does not re-enter the error union.
- Non-tagged errors (e.g., `string`, `number`) silently pass through — `catchTag` only matches objects with a `_tag` property.
- Cross-ref: [INV-15](../invariants.md#inv-15-catchtag-output-preserves-immutability), [INV-16](../invariants.md#inv-16-catchtag-requires-tag-discriminant).

## BEH-15-002: catchTags(handlers)

Handle multiple error variants in a single call via a handler map. Each key is a `_tag` value, each value is a handler function. All matched tags are removed from the error union.

```ts
// Ok<T, E> — always passes through
catchTags<
  Handlers extends Partial<{
    [K in Extract<E, { _tag: string }>["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<unknown, never>
  }>
>(handlers: Handlers): Ok<T, Exclude<E, { _tag: keyof Handlers & string }>>;

// Err<T, E> — checks _tag against handler map
catchTags<
  Handlers extends Partial<{
    [K in Extract<E, { _tag: string }>["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<unknown, never>
  }>
>(handlers: Handlers): Result<
  T | { [K in keyof Handlers]: Handlers[K] extends ((e: never) => Result<infer U, never>) ? U : never }[keyof Handlers],
  Exclude<E, { _tag: keyof Handlers & string }>
>;

// ResultAsync<T, E> — async variant with async handler support
catchTags<
  Handlers extends Partial<{
    [K in Extract<E, { _tag: string }>["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<unknown, never> | ResultAsync<unknown, never>
  }>
>(handlers: Handlers): ResultAsync<
  T | { [K in keyof Handlers]: Handlers[K] extends ((e: never) => Result<infer U, never> | ResultAsync<infer U, never>) ? U : never }[keyof Handlers],
  Exclude<E, { _tag: keyof Handlers & string }>
>;
```

**Exported from**: Same as BEH-15-001.

**Algorithm**:

1. If `Ok`: return `self`
2. If `Err`: check `"_tag" in error && typeof error._tag === "string" && error._tag in handlers`
   - Match: invoke `handlers[error._tag](error)`
   - No match: return `self`

**Example**:

```ts
const result = fetchUser("123").catchTags({
  NotFound: () => ok(defaultUser),
  Timeout: () => ok(cachedUser),
});
// Type: Result<User, never>  — all error tags handled, E is never
```

**Design notes**:

- When all tags in `E` are handled, `E` narrows to `never` — the result is infallible.
- Partial handlers are allowed — unhandled tags remain in `E`.

## BEH-15-003: andThenWith(onOk, onErr)

Combined bind and error recovery in a single operation. `onOk` handles the success path (like `andThen`), `onErr` handles the error path (like `orElse`). The original `E` is fully consumed — the new error type comes from `onOk`'s and `onErr`'s return types.

```ts
// Ok<T, E> — delegates to onOk only
andThenWith<U, F, G>(
  onOk: (value: T) => Result<U, F>,
  onErr: (error: E) => Result<U, G>
): Result<U, F>;

// Err<T, E> — delegates to onErr only
andThenWith<U, F, G>(
  onOk: (value: T) => Result<U, F>,
  onErr: (error: E) => Result<U, G>
): Result<U, G>;

// ResultAsync<T, E> — async variant
andThenWith<U, F, G>(
  onOk: (value: T) => Result<U, F> | ResultAsync<U, F>,
  onErr: (error: E) => Result<U, G> | ResultAsync<U, G>
): ResultAsync<U, F | G>;
```

**Exported from**: Same as BEH-15-001.

**Algorithm**:

1. If `Ok`: return `onOk(value)`
2. If `Err`: return `onErr(error)`

**Behavior Table**:

| Variant  | Handler called | Return type    |
| -------- | -------------- | -------------- |
| `Ok(v)`  | `onOk(v)`      | `Result<U, F>` |
| `Err(e)` | `onErr(e)`     | `Result<U, G>` |

**Example**:

```ts
const result = fetchUser("123").andThenWith(
  user => validateUser(user), // Ok path: validate
  error => ok(recoverFromError(error)) // Err path: recover
);
// Type: Result<ValidUser, ValidationError>
```

**Design notes**:

- Unlike `match`, the handlers return `Result` (not a plain value), enabling further chaining.
- Unlike `orElse`, `onErr` fully replaces the error type — useful when the handler itself can fail with a different error.
- `onOk` is equivalent to `andThen` and `onErr` is equivalent to `orElse`, but combined in a single method call.

## BEH-15-004: Standalone Functions

Curried, data-last standalone versions of all three methods for pipe-style composition. Follow the pattern from [BEH-10-001](10-standalone-functions.md).

```
src/fn/
  catch-tag.ts       # catchTag(tag, handler)
  catch-tags.ts      # catchTags(handlers)
  and-then-with.ts   # andThenWith(onOk, onErr)
```

Each function delegates to the corresponding `Result` instance method per [INV-14](../invariants.md#inv-14-standalone-functions-delegate).

**Import paths**:

```ts
// Barrel import
import { catchTag, catchTags, andThenWith } from "@hex-di/result/fn";

// Individual imports
import { catchTag } from "@hex-di/result/fn/catch-tag";
```

**Example**:

```ts
import { pipe, catchTag, andThenWith } from "@hex-di/result/fn";

const result = pipe(
  fetchUser("123"),
  catchTag("NotFound", () => ok(defaultUser)),
  catchTag("Timeout", () => ok(cachedUser))
);
```

## BEH-15-005: ResultAsync Equivalents

All three methods are available on `ResultAsync<T, E>` with async handler support. Handlers may return `Result<T2, never>` or `ResultAsync<T2, never>`.

**Algorithm**: Wraps `this.#promise.then(...)`, calling the sync `catchTag`/`catchTags`/`andThenWith` on the inner `Result`. If the handler returns a `ResultAsync`, it is awaited.

**Example**:

```ts
const result = ResultAsync.fromPromise(fetch("/api/user"), mapFetchError)
  .catchTag("NotFound", () => ok(defaultUser))
  .catchTags({
    Timeout: () => ResultAsync.ok(cachedUser),
    RateLimit: () => ok(throttledUser),
  });
```
