# 11 — Unsafe Extraction

Throwing extractors gated behind `@hex-di/result/unsafe`. See [ADR-010](../decisions/010-unsafe-subpath.md).

## BEH-11-001: UnwrapError

```ts
class UnwrapError extends Error {
  readonly context: {
    readonly _tag: "Ok" | "Err";
    readonly value: unknown;
  };

  constructor(message: string, context: { _tag: "Ok" | "Err"; value: unknown });
}
```

A specialized `Error` subclass thrown by all unsafe extraction operations.

**Properties**:
- `message` — Human-readable error description
- `context._tag` — The variant that was encountered (the unexpected one)
- `context.value` — The contained value or error inside the Result

**Source**: `unsafe/unwrap-error.ts`

See [INV-12](../invariants.md#inv-12-unwraperror-contains-context).

## BEH-11-002: unwrap(result)

```ts
function unwrap<T, E>(result: Result<T, E>): T
```

Extracts the `Ok` value. Throws `UnwrapError` if the result is `Err`.

| Variant | Behavior |
|---------|----------|
| Ok | Returns `value` |
| Err | Throws `new UnwrapError("Called unwrap on Err", { _tag: "Err", value: error })` |

**Import path**: `@hex-di/result/unsafe` only. Not available from the main entry point.

**Example**:
```ts
import { unwrap } from "@hex-di/result/unsafe";

unwrap(ok(42));       // 42
unwrap(err("fail"));  // throws UnwrapError
```

## BEH-11-003: unwrapErr(result)

```ts
function unwrapErr<T, E>(result: Result<T, E>): E
```

Extracts the `Err` error. Throws `UnwrapError` if the result is `Ok`.

| Variant | Behavior |
|---------|----------|
| Ok | Throws `new UnwrapError("Called unwrapErr on Ok", { _tag: "Ok", value: value })` |
| Err | Returns `error` |

**Import path**: `@hex-di/result/unsafe` only. Not available from the main entry point.

**Example**:
```ts
import { unwrapErr } from "@hex-di/result/unsafe";

unwrapErr(err("fail")); // "fail"
unwrapErr(ok(42));       // throws UnwrapError
```

## BEH-11-004: Update to expect() / expectErr()

The existing `expect(msg)` and `expectErr(msg)` instance methods (defined in [04-extraction.md](04-extraction.md)) are updated to throw `UnwrapError` instead of `new Error(msg)`:

### expect(message) — updated behavior

```ts
// On Ok<T, E>:
expect(message: string): T            // returns value

// On Err<T, E>:
expect(message: string): never        // throws UnwrapError(message, { _tag: "Err", value: error })
```

### expectErr(message) — updated behavior

```ts
// On Ok<T, E>:
expectErr(message: string): never     // throws UnwrapError(message, { _tag: "Ok", value: value })

// On Err<T, E>:
expectErr(message: string): E         // returns error
```

**Note**: The change from `new Error(message)` to `new UnwrapError(message, context)` is backward-compatible for `catch (e) { if (e instanceof Error) }` blocks because `UnwrapError extends Error`. Code that checks `e.constructor === Error` specifically will need updating.

## BEH-11-005: ESLint Integration

The `@hex-di/result/unsafe` subpath is designed to be detectable by ESLint:

```js
// eslint rule: no-restricted-imports
{
  "rules": {
    "no-restricted-imports": ["error", {
      "paths": [{
        "name": "@hex-di/result/unsafe",
        "message": "Unsafe extraction is not allowed in production code. Use match() or unwrapOr() instead."
      }]
    }]
  }
}
```

A dedicated ESLint plugin (`eslint-plugin-hex-result`) with a `no-unsafe-import` rule is planned. See [roadmap.md](../roadmap.md).
