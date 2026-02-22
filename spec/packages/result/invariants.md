# Invariants

Runtime guarantees and contracts enforced by the `@hex-di/result` implementation.

## INV-1: Frozen Result Instances

All `Result` instances created by `ok()` and `err()` are `Object.freeze()`d immediately after construction. No property can be added, removed, or modified after creation.

**Source**: `core/result.ts` — `Object.freeze(self)` in both `ok()` and `err()`.

**Implication**: Consumers can rely on referential integrity. A `Result` passed to a function cannot be mutated by that function.

## INV-2: Internal Promise Never Rejects

The `ResultAsync<T, E>` internal `#promise` field always resolves to a `Result<T, E>` — it never rejects. Rejection is caught by `fromPromise()` and converted to `Err`.

**Source**: `async/result-async.ts` — private constructor accepts `Promise<Result<T, E>>`; all static constructors ensure the promise resolves.

**Implication**: Awaiting a `ResultAsync` always produces a `Result`. No `.catch()` is needed.

## INV-3: Brand Symbol Prevents Forgery

Only objects created by `ok()` or `err()` carry the `RESULT_BRAND` symbol property. The `isResult()` guard checks for this symbol with `RESULT_BRAND in value`. Structurally similar objects that happen to share `{ _tag, value/error }` shape do **not** pass the guard.

**Source**: `core/brand.ts` — `Symbol("Result")` is a unique symbol. `core/result.ts` — brand is set on both `Ok` and `Err`. `core/guards.ts` — `isResult()` checks `RESULT_BRAND in value`.

**Implication**: Library code can trust `isResult()` for runtime validation without false positives.

## INV-4: Err Generator Throws on Continuation

The `Err` variant's `[Symbol.iterator]()` is a generator that yields `self` and then throws `"unreachable: generator continued after yield in Err"`. The `safeTry` runner calls `gen.return()` to prevent reaching the throw, but any consumer that continues iterating after the yield hits a hard stop.

**Source**: `core/result.ts` — `*[Symbol.iterator]() { yield self; throw new Error("unreachable: ..."); }` in `err()`.

**Implication**: Misuse of the generator protocol (continuing past the early-return yield) is caught immediately with a descriptive error.

## INV-5: Error Suppression in Tee Operations

`andTee(f)` and `orTee(f)` catch and suppress all exceptions thrown by `f`. The original `Result` is returned unchanged regardless of whether `f` succeeds or throws. This applies to both sync (`Ok`/`Err` methods) and async (`ResultAsync` methods).

**Source**: `core/result.ts` — `try { f(value); } catch { }` in `ok().andTee()`. `async/result-async.ts` — `try { await resolveValue(f(...)); } catch { }` in `ResultAsync.andTee()` / `orTee()`.

**Implication**: Tee operations are safe for logging and side effects that must not disrupt the pipeline.

## INV-6: Phantom Types Enable Free Composition

`ok(value)` returns `Ok<T, never>` and `err(error)` returns `Err<never, E>`. Since `never` is assignable to any type in TypeScript, these can be freely combined without explicit type annotations:

```ts
const result: Result<number, string> = condition ? ok(42) : err("fail");
// ok(42): Ok<number, never>  — never extends string ✓
// err("fail"): Err<never, string> — never extends number ✓
```

**Source**: `core/result.ts` — `ok<T>(value: T): Ok<T, never>` and `err<E>(error: E): Err<never, E>`.

**Implication**: No type casting or explicit annotations needed when composing `Ok` and `Err` values into a `Result` union.

## INV-7: createError Output Is Frozen

Error objects produced by `createError(tag)(fields)` are `Object.freeze()`d.

**Source**: `errors/create-error.ts` — `Object.freeze({ _tag: tag, ...fields })`.

**Implication**: Tagged error values are immutable, consistent with the overall immutability guarantee.

## INV-8: Lazy ResultAsync Registration

The sync module (`core/result.ts`) holds a lazy reference to `ResultAsync` via `_setResultAsyncImpl()`. This function is called by the async module (`async/result-async.ts`) at module load time. The `toAsync()`, `asyncMap()`, and `asyncAndThen()` methods on sync `Result` instances throw if `ResultAsync` has not been registered.

**Source**: `core/result.ts` — `_ResultAsyncImpl` starts as `null`; `getResultAsync()` throws if null. `async/result-async.ts` — calls `_setResultAsyncImpl(...)` at module scope.

**Implication**: Consumers must import from `@hex-di/result` (the package entry point) rather than directly from `core/result.ts` to ensure the async module is loaded and registered. Direct core imports without the async module cause runtime errors on async bridge methods.

## INV-9: ResultAsync Brand Identity

Every `ResultAsync` instance carries `RESULT_ASYNC_BRAND = Symbol("ResultAsync")`. The `isResultAsync()` guard checks for this symbol with `RESULT_ASYNC_BRAND in value`, replacing the previous structural check.

**Source**: `core/brand.ts` — defines `RESULT_ASYNC_BRAND`. `async/result-async.ts` — stamps instances. `core/guards.ts` — `isResultAsync()` checks the brand.

**Implication**: `isResultAsync()` no longer produces false positives for arbitrary PromiseLike objects that happen to have a `match` method. Consistent with [INV-3](#inv-3-brand-symbol-prevents-forgery) for sync `Result`.

See [ADR-008](decisions/008-result-async-brand.md).

## INV-10: Frozen Option Instances

All `Option` instances created by `some()` and `none()` are `Object.freeze()`d immediately after construction. No property can be added, removed, or modified after creation.

**Source**: `option/option.ts` — `Object.freeze(self)` in both `some()` and `none()`.

**Implication**: Consistent with [INV-1](#inv-1-frozen-result-instances). Option values are immutable and safe to share across boundaries.

See [ADR-009](decisions/009-option-type.md).

## INV-11: Option Brand Prevents Forgery

Only objects created by `some()` or `none()` carry the `OPTION_BRAND` symbol property. The `isOption()` guard checks for this symbol with `OPTION_BRAND in value`. Structurally similar objects that happen to share `{ _tag: "Some", value }` shape do **not** pass the guard.

**Source**: `option/brand.ts` — `Symbol("Option")` is a unique symbol. `option/option.ts` — brand is set on both `Some` and `None`. `option/guards.ts` — `isOption()` checks `OPTION_BRAND in value`.

**Implication**: Consistent with [INV-3](#inv-3-brand-symbol-prevents-forgery) for `Result`. Library code can trust `isOption()` for runtime validation without false positives.

See [ADR-009](decisions/009-option-type.md).

## INV-12: UnwrapError Contains Context

`UnwrapError` instances include a `.context` property with `{ _tag: "Ok" | "Err", value: unknown }` that identifies which variant was encountered and what value/error was contained. This applies to `unwrap()`, `unwrapErr()`, `expect()`, and `expectErr()`.

**Source**: `unsafe/unwrap-error.ts` — `UnwrapError` class definition. `unsafe/unwrap.ts` — `unwrap()` and `unwrapErr()`. `core/result.ts` — `expect()` and `expectErr()` updated to throw `UnwrapError`.

**Implication**: Catch blocks can inspect `UnwrapError.context` for structured debugging without parsing error messages.

See [ADR-010](decisions/010-unsafe-subpath.md).

## INV-13: Subpath Blocking

The `"./internal/*": null` entry in `package.json` `"exports"` causes any import of `@hex-di/result/internal/...` to fail at module resolution time with a "module not found" error. This prevents consumers from depending on internal implementation details.

**Source**: `package.json` — `"exports"` field.

**Implication**: Internal modules are truly internal. Consumers cannot bypass the public API, even in environments that resolve bare specifiers.

See [ADR-011](decisions/011-subpath-exports.md).

## INV-14: Standalone Functions Delegate

Every standalone function in `@hex-di/result/fn/*` delegates to the corresponding `Result` instance method. No standalone function contains its own transformation logic — it is a thin curried wrapper that calls the method.

**Source**: `fn/*.ts` — each function follows the pattern `(f) => (result) => result.method(f)`.

**Implication**: Behavioral consistency between method chaining and standalone function usage is guaranteed. A bug fix to a `Result` method automatically applies to the standalone function.

See [ADR-007](decisions/007-dual-api-surface.md).
