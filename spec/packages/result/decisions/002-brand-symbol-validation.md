# ADR-002: Brand Symbol Validation

## Status

Accepted

## Context

`isResult()` needs to determine whether an unknown value is a genuine `Result` created by `ok()` or `err()`. Two approaches are possible:

1. **Structural checking** — Check for `_tag`, `value`/`error`, and method signatures. Any object that matches the shape passes.
2. **Brand checking** — Attach a unique symbol to every `Result` and check for its presence. Only objects stamped by the factory functions pass.

Structural checking is simpler but produces false positives: any object with `{ _tag: "Ok", value: 42 }` would pass, even if it wasn't created by the library.

## Decision

A unique symbol `RESULT_BRAND = Symbol("Result")` is defined in `core/brand.ts` and attached to every `Result` instance. `isResult()` checks `RESULT_BRAND in value`.

```ts
export const RESULT_BRAND: unique symbol = Symbol("Result");

export function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value === null || value === undefined || typeof value !== "object") return false;
  return RESULT_BRAND in value;
}
```

## Consequences

**Positive**:
- No false positives — only objects created by `ok()`/`err()` carry the symbol
- The symbol is `unique symbol` at the type level, so it cannot be accidentally duplicated
- Symbol property keys don't appear in `Object.keys()` or `JSON.stringify()`, avoiding pollution
- Strict validation supports GxP tamper-evidence requirements

**Negative**:
- Structural compatibility is broken — a manually constructed `{ _tag: "Ok", value: 42 }` does not pass `isResult()`
- Cross-package instances from different installations of `@hex-di/result` will have different symbols and won't pass each other's `isResult()` (but this is arguably a feature, not a bug — it catches version mismatches)

**Note**: `isResultAsync()` uses structural checking (not brand) because `ResultAsync` is a class. See the method documentation in [01-types-and-guards.md](../behaviors/01-types-and-guards.md#beh-01-010-isresultasyncvalue).
