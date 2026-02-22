# ADR-001: Closures Over Classes

## Status

Accepted

## Context

`Ok` and `Err` need to be runtime objects with methods (`map`, `andThen`, `match`, etc.). The two standard approaches in TypeScript are:

1. **Class instances** — `class OkImpl<T, E> implements Ok<T, E> { ... }` with `this`-based methods
2. **Plain objects with closures** — Object literals where methods close over the constructor arguments

Classes provide familiar structure and `instanceof` checks. Plain objects avoid `this` binding issues, prototype chain complexity, and bundle overhead from class transpilation.

## Decision

`Ok` and `Err` are implemented as plain frozen objects returned by `ok()` and `err()` factory functions. All methods are closures that capture the `value` or `error` argument directly — they do not reference `this` (except where TypeScript requires it for `this`-parameter typing in `flatten`).

```ts
export function ok<T>(value: T): Ok<T, never> {
  const self: Ok<T, never> = {
    _tag: "Ok",
    value,
    [RESULT_BRAND]: true,
    map(f) { return ok(f(value)); },
    // ... all methods close over `value`
  };
  Object.freeze(self);
  return self;
}
```

## Consequences

**Positive**:
- No `this` binding issues — methods can be destructured or passed as callbacks without `.bind()`
- No prototype chain — `Object.getPrototypeOf(ok(1)) === Object.prototype`
- `instanceof` is not available, which avoids cross-realm/cross-bundle identity problems
- `Object.freeze()` is straightforward on plain objects
- Tree-shaking friendly — no class declaration overhead

**Negative**:
- Each `Result` instance has its own copy of every method (not shared via prototype)
- Slightly higher memory per instance compared to class-based prototype sharing
- `instanceof` checks are not possible — must use `isResult()` brand check instead

**Trade-off accepted**: The memory cost is acceptable for a value type that is typically short-lived and created frequently. The ergonomic and safety benefits outweigh the per-instance overhead.
