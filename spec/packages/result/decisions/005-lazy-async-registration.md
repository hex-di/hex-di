# ADR-005: Lazy Async Registration

## Status

Accepted

## Context

The sync `Result` type (`Ok`/`Err`) needs methods that return `ResultAsync` (e.g., `toAsync()`, `asyncMap()`, `asyncAndThen()`). However, `ResultAsync` is defined in `async/result-async.ts`, which imports `ok` and `err` from `core/result.ts`.

This creates a circular dependency:
- `core/result.ts` → needs `ResultAsync` for async bridge methods
- `async/result-async.ts` → needs `ok`, `err` from `core/result.ts`

Approaches considered:

1. **Merge into one file** — Eliminates the cycle but creates a monolithic file and prevents tree-shaking async code away
2. **Intermediate interface** — Define a `ResultAsyncFactory` interface in a third file, inject at runtime
3. **Lazy registration** — The sync module holds a nullable slot; the async module fills it at import time

## Decision

Lazy registration pattern:

1. `core/result.ts` declares `_ResultAsyncImpl` as `null` and exports `_setResultAsyncImpl()`
2. `async/result-async.ts` calls `_setResultAsyncImpl({ ok, err, fromSafePromise })` at module scope
3. `getResultAsync()` in `core/result.ts` throws if the impl is `null`

```ts
// core/result.ts
let _ResultAsyncImpl: { ok, err, fromSafePromise } | null = null;

export function _setResultAsyncImpl(impl): void {
  _ResultAsyncImpl = impl;
}

function getResultAsync() {
  if (_ResultAsyncImpl === null) {
    throw new Error("ResultAsync not initialized. Import '@hex-di/result' instead of importing from core directly.");
  }
  return _ResultAsyncImpl;
}
```

```ts
// async/result-async.ts (at module scope, after class definition)
_setResultAsyncImpl({ ok: ResultAsync.ok, err: ResultAsync.err, fromSafePromise: ResultAsync.fromSafePromise });
```

## Consequences

**Positive**:
- No circular dependency at module load time — the `core` module doesn't import from `async`
- Tree-shakeable — if async code is never imported, the registration never runs and async code is eliminated
- Clear error message when the registration hasn't happened (direct core import without async)
- The `_setResultAsyncImpl` function is prefixed with `_` to signal it is internal and not part of the public API

**Negative**:
- Runtime coupling — if someone imports from `core/result.ts` directly without importing the async module, the async bridge methods throw at runtime instead of failing at compile time
- One-time setup cost at module initialization
- The `_setResultAsyncImpl` export is visible (though underscore-prefixed) — consumers might accidentally call it
