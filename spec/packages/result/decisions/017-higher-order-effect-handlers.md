# ADR-017: Higher-Order Effect Handlers

## Status

Proposed (Tier 3 — Long-term)

## Context

`@hex-di/result` provides first-order effect elimination via `catchTag` and `catchTags` ([ADR-014](014-catch-tag-effect-elimination.md)). Each handler eliminates one or more error tags from the error union. However, there is no mechanism to **compose** handlers or build reusable handler pipelines.

In algebraic effect systems (see [RES-01](../../../research/RES-01-type-and-effect-systems.md)), effect handlers are first-class values that can be composed, stored, and passed as arguments. The composition of handlers forms a monoid (see [RES-07](../../../research/RES-07-category-theory-composition.md)): associative with an identity element.

### Current limitation

```typescript
// Each catchTag call is inline — cannot be extracted, composed, or reused
const result = fetchUser("123")
  .catchTag("NotFound", handleNotFound)
  .catchTag("Timeout", handleTimeout)
  .catchTag("Forbidden", handleForbidden);

// Cannot do:
const errorPolicy = compose(handleNotFound, handleTimeout, handleForbidden);
const result = fetchUser("123").applyHandler(errorPolicy);
```

### Desired capability

```typescript
// Define reusable handler pipelines
const resilientFetch = composeHandlers(
  { _tag: "NotFoundHandler", handle: () => ok(defaultUser) },
  { _tag: "TimeoutHandler", handle: () => ok(cachedUser) }
);

// Apply composed handler in one call
const result = fetchUser("123").applyHandler(resilientFetch);
// Type: Result<User, Exclude<AppError, { _tag: "NotFound" | "Timeout" }>>
```

## Decision

**Introduce `composeHandlers()` and `applyHandler()` for first-class effect handler composition.**

### EffectHandler interface

```typescript
interface EffectHandler<TIn, TOut> {
  readonly _tag: string;
  readonly handle: (error: TIn) => Result<TOut, never>;
}
```

### composeHandlers()

```typescript
function composeHandlers<H1, H2>(h1: H1, h2: H2): ComposedHandler<H1, H2>;
```

Composes two handlers left-to-right. The resulting handler processes errors matching either handler's input type.

### applyHandler()

```typescript
// Method on Result<T, E>
applyHandler<H extends EffectHandler<unknown, unknown>>(
  handler: H
): Result<T | OutputOf<H>, Exclude<E, InputOf<H>>>;
```

Applies a (possibly composed) handler to a Result, eliminating all matched error tags.

### Algebraic laws

The handler algebra satisfies:

1. **Associativity**: `compose(compose(a, b), c) ≡ compose(a, compose(b, c))`
2. **Identity**: `compose(h, identity) ≡ h ≡ compose(identity, h)`
3. **Left bias**: When both handlers match the same tag, the leftmost handler takes precedence

## Consequences

### Positive

1. **Reusable error policies**: Teams define standard error handling pipelines that are applied consistently
2. **Composable**: Handlers can be built incrementally from smaller pieces
3. **Algebraically sound**: Monoid structure ensures predictable composition behavior

### Negative

1. **API surface**: Adds `composeHandlers`, `applyHandler`, `EffectHandler` to the public API
2. **Type complexity**: Composed handler types can become deeply nested
3. **Learning curve**: Handler algebra is an advanced concept

### Neutral

1. **Backward compatible**: `catchTag`/`catchTags` remain the primary API. `applyHandler` is additive.
2. **Tree-shakeable**: Composed handler utilities are separate exports

## References

- [BEH-17](../behaviors/17-higher-order-effects.md): Higher-Order Effects behavior
- [RES-01](../../../research/RES-01-type-and-effect-systems.md): Type & Effect Systems
- [RES-07](../../../research/RES-07-category-theory-composition.md): Category Theory & Composition
