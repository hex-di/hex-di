# ADR-010: Unsafe Extraction Subpath

## Status

Accepted

## Context

`unwrap()` and `unwrapErr()` are throwing extractors — they return the contained value or throw an error. In Rust, these methods are used sparingly and are well-understood to be unsafe. In TypeScript, developers often reach for `unwrap()` reflexively, defeating the purpose of `Result`.

Current state:
- `expect(msg)` / `expectErr(msg)` exist on `Result` instances and throw `new Error(message)`
- `unwrap()` / `unwrapErr()` do not exist (intentionally omitted to discourage unsafe extraction)

Problems:
1. Developers coming from Rust expect `unwrap()` to exist
2. When `expect()` throws, the thrown `Error` has no structured context about which variant was encountered or what value/error was contained
3. There is no way to statically prevent unsafe extraction in production code (e.g., via linting)

## Decision

### Gate unsafe extractors behind a subpath

`unwrap()` and `unwrapErr()` are available only via `@hex-di/result/unsafe`:

```ts
import { unwrap, unwrapErr } from "@hex-di/result/unsafe";

const value = unwrap(ok(42));     // 42
const error = unwrapErr(err("x")); // "x"
```

They are **not** available from the main `@hex-di/result` entry point. This makes unsafe extraction an explicit opt-in.

### Structured UnwrapError

Both `unwrap()` / `unwrapErr()` and `expect()` / `expectErr()` throw `UnwrapError` instead of plain `Error`:

```ts
class UnwrapError extends Error {
  readonly context: {
    readonly _tag: "Ok" | "Err";
    readonly value: unknown;
  };
}
```

The `context` property contains:
- `_tag` — which variant was encountered (the unexpected one)
- `value` — the contained value or error that was inside the Result

This enables structured error handling in catch blocks:

```ts
try {
  unwrap(err("not found"));
} catch (e) {
  if (e instanceof UnwrapError) {
    console.log(e.context._tag);   // "Err"
    console.log(e.context.value);  // "not found"
  }
}
```

### Update to expect() / expectErr()

The existing `expect(msg)` and `expectErr(msg)` methods on `Result` instances are updated to throw `UnwrapError` instead of `new Error(msg)`. The `message` property of `UnwrapError` is set to the provided `msg` string, and the `context` is populated as above.

## Consequences

**Positive**:
- Unsafe extraction is explicit — `import ... from "@hex-di/result/unsafe"` is visible in code review
- ESLint can ban the `@hex-di/result/unsafe` import path to prevent unsafe extraction in production
- `UnwrapError.context` provides structured debugging information
- Rust developers find the familiar `unwrap()` API
- Raises Dev Ergonomics from 8→10

**Negative**:
- `unwrap()` is a standalone function, not a method — slight inconsistency with the instance method API
- Updating `expect()` to throw `UnwrapError` is a minor breaking change for consumers catching `Error` specifically

**New invariant**: [INV-12](../invariants.md#inv-12-unwraperror-contains-context) — `UnwrapError` includes `_tag` and contained value/error in `.context`.
