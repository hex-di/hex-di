# ADR-014: catchTag / catchTags / andThenWith — Effect Elimination

## Status

Accepted

## Context

`@hex-di/result` tracks errors in the type system via the `E` parameter of `Result<T, E>`. Operations like `andThen` accumulate errors (`E | F`), but no operation removes specific errors from the union. This creates an asymmetry:

- **Error introduction**: `andThen<U, F>(f) → Result<U, E | F>` — adds `F` to the error set
- **Error handling**: `orElse<U, F>(f) → Result<T | U, F>` — replaces the entire error set

The gap: there is no way to handle _one_ error tag while preserving the rest. Consumers must handle all errors uniformly via `orElse`, or use manual `_tag` checks with `match`/`if` statements that don't narrow the `E` type.

This is the "effect elimination" problem from type-and-effect systems (see [RES-01](../../../research/RES-01-type-and-effect-systems.md)). In that framework:

- `E` is the effect row
- `never` is the empty effect (pure)
- `|` is effect composition
- Missing: effect elimination (handling one effect at a time)

### Approaches considered

1. **Do nothing** — Consumers use `match` or manual `_tag` checks. Type narrowing is manual and error-prone.
2. **Add `catchTag` only** — Single-tag elimination. Simple but requires chaining for multiple tags.
3. **Add `catchTag` + `catchTags` + `andThenWith`** — Complete effect elimination toolkit. `catchTag` for single tags, `catchTags` for batch handling, `andThenWith` for combined bind + recovery.
4. **Full algebraic effect system** — Overkill for a Result library. Better served by libraries like Effect.

## Decision

Add three new methods to `Ok`, `Err`, and `ResultAsync` interfaces:

### `catchTag(tag, handler)`

Handles a single error variant by `_tag` discriminant. Uses `Extract<E, { _tag: Tag }>` to type the handler parameter and `Exclude<E, { _tag: Tag }>` to narrow the remaining error type.

```ts
// On Err — checks _tag match at runtime
catchTag<Tag extends string, T2>(
  tag: Tag,
  handler: (error: Extract<E, { _tag: Tag }>) => Result<T2, never>
): Result<T | T2, Exclude<E, { _tag: Tag }>>;
```

Key design choices:

- **Handler returns `Result<T2, never>`** (infallible). This guarantees the handled tag cannot re-enter the error union.
- **Non-tagged errors pass through** — if `error` has no `_tag` property, `catchTag` is a no-op.
- **Runtime check**: `"_tag" in error && error._tag === tag` — no casts, uses TypeScript's `in` narrowing.

### `catchTags(handlers)`

Handles multiple error variants via a handler map. Each key is a `_tag` value, each value is a handler.

```ts
catchTags<Handlers extends Partial<{
  [K in Extract<E, { _tag: string }>["_tag"]]: (error: Extract<E, { _tag: K }>) => Result<unknown, never>
}>>(handlers: Handlers): Result<T | ..., Exclude<E, { _tag: keyof Handlers & string }>>;
```

Key design choices:

- **Partial handlers** — not all tags need to be handled. Unhandled tags remain in `E`.
- **Exhaustive handling** — when all tags are handled, `E → never`. This is verified at the type level.
- **Single dispatch** — at most one handler is invoked per call (the one matching `error._tag`).

### `andThenWith(onOk, onErr)`

Combined `andThen` + `orElse` that fully consumes the original `E`:

```ts
andThenWith<U, F, G>(
  onOk: (value: T) => Result<U, F>,
  onErr: (error: E) => Result<U, G>
): Result<U, F | G>;
```

This is useful when you want to both transform the success value and recover from errors in a single step.

## Consequences

**Positive**:

- Per-tag error elimination with full type narrowing
- Exhaustive error handling: chain `catchTag` calls until `E → never`
- `catchTags` handles multiple tags in one call for conciseness
- `andThenWith` provides combined bind + recovery for complex pipelines
- Consistent with the algebraic effect handler model
- Standalone functions enable pipe-style composition

**Negative**:

- Three new methods increase the API surface
- `catchTags` type signature is complex (mapped type with Partial + Extract + Exclude)
- Handler infallibility (`Result<T2, never>`) may surprise users expecting `Result<T2, E2>`
- Non-tagged errors silently pass through `catchTag`/`catchTags`

**Trade-off accepted**: The API surface increase is justified by the significant improvement in error handling ergonomics. The complex type signatures are hidden behind simple runtime behavior. Handler infallibility is a deliberate constraint that simplifies the type system and prevents tag re-entry.
