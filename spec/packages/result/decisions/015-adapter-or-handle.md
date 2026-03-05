# ADR-015: adapterOrHandle — Adapter-Level Tag-Based Error Recovery

## Status

Accepted

## Context

[ADR-014](014-catch-tag-effect-elimination.md) adds `catchTag`/`catchTags`/`andThenWith` to `@hex-di/result` for per-tag error elimination. These primitives work at the `Result` level (Tier 1).

In `@hex-di/core`, adapters compose via `createAdapter` and return `Result<T, E>` from their factory functions. When composing adapters, a common pattern emerges: handle specific adapter construction errors at the composition boundary before they propagate to the application layer.

Currently, error handling at the adapter level requires manual `catchTag` chains after adapter instantiation:

```ts
// Verbose: chain catchTag on the factory result manually
const result = createMyAdapter(config)
  .catchTag("ConfigMissing", () => ok(defaultService))
  .catchTag("ConnectionFailed", () => ok(fallbackService));
```

This is ergonomically poor when multiple tags need handling at the adapter composition boundary. `@hex-di/core` already provides `adapterOrDie` (throw on any Err) and `adapterOrElse` (fallback adapter on any Err). A tag-selective recovery utility completes the error-handling trio.

## Decision

Add `adapterOrHandle(adapter, handlers)` to `@hex-di/core` (in `unified.ts`, alongside `adapterOrDie`/`adapterOrElse`).

### Type Signature

```ts
export function adapterOrHandle<
  TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple,
  TError extends { _tag: string },
  Handlers extends Partial<{
    [K in TError["_tag"]]: (
      error: Extract<TError, { _tag: K }>
    ) => FactoryResult<InferService<TProvides>, never>
  }>,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime, TFactoryKind, TClonable, TRequiresTuple, TError>,
  handlers: Handlers,
): Adapter<..., Exclude<TError, { _tag: keyof Handlers & string }>>;
```

### Usage

```ts
type MyErrors =
  | { _tag: "ConfigMissing"; path: string }
  | { _tag: "ConnectionFailed"; reason: string }
  | { _tag: "AuthError"; code: number };

const FallibleAdapter = createAdapter({
  provides: ServicePort,
  factory: (): FactoryResult<Service, MyErrors> => { ... },
});

// Handle some errors, let AuthError propagate
const PartiallyHandled = adapterOrHandle(FallibleAdapter, {
  ConfigMissing: () => ({ _tag: "Ok", value: defaultService }),
  ConnectionFailed: () => ({ _tag: "Ok", value: fallbackService }),
});
// PartiallyHandled has TError = { _tag: "AuthError"; code: number }
```

### Key Design Choices

- **Partial handlers** — unlike exhaustive matching, handlers are optional per-tag. Unhandled tags propagate as `Err`. This matches `catchTags` semantics.
- **TError constraint** — `TError extends { _tag: string }` requires tagged errors. Non-tagged errors should use `adapterOrDie` or `adapterOrElse` instead.
- **Duck-typed handlers** — handler return type uses `FactoryResult<..., never>` (structural match), keeping `@hex-di/core` independent of `@hex-di/result`.
- **cloneAdapterWithFactory** — reuses existing internal helper to preserve metadata, finalizer, and freeze semantics.
- **Lives in unified.ts** — alongside `adapterOrDie`/`adapterOrElse`, reusing all internal helpers (`isResultLike`, `isThenable`, `unwrapIfResult`).

## Consequences

**Positive**:

- Cleaner adapter composition with built-in tag-selective error recovery
- Type-safe error narrowing: `TError` shrinks as handlers are provided
- Consistent pattern alongside `adapterOrDie` (throw) and `adapterOrElse` (fallback)
- No new files — implementation lives in existing `unified.ts`

**Negative**:

- Additional API surface in `@hex-di/core` (one function)
- Requires errors to have `_tag` discriminant (by design — matches the tagged error convention from ADR-014)
