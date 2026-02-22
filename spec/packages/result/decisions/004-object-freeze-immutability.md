# ADR-004: Object.freeze() Immutability

## Status

Accepted

## Context

`Result` values should be immutable to prevent accidental or malicious mutation. Options:

1. **Convention** — Document that `Result` should not be mutated. No enforcement.
2. **Readonly types only** — Use `readonly` modifiers at the type level. TypeScript enforces at compile time but not at runtime.
3. **Object.freeze()** — Freeze every `Result` instance at creation. Runtime enforcement regardless of TypeScript.
4. **Proxy-based** — Use `Proxy` to intercept mutations. Maximum enforcement but significant performance cost.

## Decision

Every `Result` instance is `Object.freeze()`d at the end of `ok()` and `err()`. The interfaces already mark `_tag`, `value`, `error`, and `[RESULT_BRAND]` as `readonly`.

```ts
export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = { /* ... */ };
  Object.freeze(self);
  return self;
}
```

The `createError()` function also freezes its output for consistency.

## Consequences

**Positive**:
- Runtime immutability guarantee — mutations throw in strict mode, silently fail in sloppy mode
- Combined with `readonly` interface properties, immutability is enforced at both type and runtime levels
- Supports GxP data integrity requirements (values cannot be tampered with after creation)
- Simple implementation — one `Object.freeze()` call per factory

**Negative**:
- `Object.freeze()` is shallow — if `value` or `error` is itself a mutable object, its contents can still be mutated. The library freezes the `Result` shell, not the contained data.
- Minor performance cost per creation (benchmarks show negligible impact for typical usage)
- Methods cannot be monkey-patched or augmented after creation (this is intentional)
