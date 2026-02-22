# ADR-008: ResultAsync Brand Symbol

## Status

Accepted

## Context

`isResultAsync()` currently uses structural checking — it verifies the presence of `then` and `match` methods. This is inconsistent with `isResult()`, which uses brand-based checking via `RESULT_BRAND`.

The structural approach was chosen because `ResultAsync` is a class, and `instanceof` checks break across module boundaries (multiple installations, bundler duplicates). However, structural checking has a weakness: any object with `then` and `match` methods passes, creating false positives.

See [ADR-002](002-brand-symbol-validation.md) for the original brand decision on sync `Result`.

## Decision

Add `RESULT_ASYNC_BRAND = Symbol("ResultAsync")` to `core/brand.ts` and stamp every `ResultAsync` instance with it. Update `isResultAsync()` to check for the brand symbol instead of structural method presence.

```ts
// core/brand.ts
export const RESULT_ASYNC_BRAND: unique symbol = Symbol("ResultAsync");
```

```ts
// async/result-async.ts
class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
  readonly [RESULT_ASYNC_BRAND] = true;
  // ...
}
```

```ts
// core/guards.ts
export function isResultAsync(value: unknown): value is ResultAsync<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") return false;
  return RESULT_ASYNC_BRAND in value;
}
```

## Consequences

**Positive**:
- Consistent validation strategy across `Result` and `ResultAsync`
- No false positives from PromiseLike objects that happen to have a `match` method
- Aligns with [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery) philosophy

**Negative**:
- `ResultAsync` instances from different package installations will have different symbols (same trade-off as `RESULT_BRAND` — this is a feature for version mismatch detection)
- Minor breaking change if consumers relied on structural duck-typing of `isResultAsync()`

**New invariant**: [INV-9](../invariants.md#inv-9-resultasync-brand-identity) — Every `ResultAsync` carries `RESULT_ASYNC_BRAND`; `isResultAsync()` checks it.
