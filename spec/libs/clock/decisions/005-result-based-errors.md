# ADR-CK-005: Result-Based Error Handling

## Status

Accepted

## Context

Several `@hex-di/clock` operations can fail:

- `createSystemClock()`: platform timing APIs may be broken or implausible (startup self-test failure).
- `SequenceGeneratorPort.next()`: counter may reach `Number.MAX_SAFE_INTEGER` (overflow).
- `VirtualClockAdapter.advance()`: negative advance values are invalid.
- Various deserialization and validation functions: input may be malformed.

The standard JavaScript approach is to throw exceptions. However, thrown exceptions are invisible at the type level — callers have no compile-time indication that a function can fail, and forgetting a `try/catch` results in unhandled exceptions propagating to the event loop.

## Decision

All fallible operations return `Result<T, E>` from `@hex-di/result` instead of throwing exceptions.

```typescript
// Factory that can fail at startup
function createSystemClock(options?: SystemClockOptions):
  Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>

// Sequence operation that can overflow
interface SequenceGeneratorPort {
  readonly next: () => Result<number, SequenceOverflowError>;
}

// Virtual clock control that rejects invalid input
interface VirtualClockAdapter {
  readonly advance: (ms: number) => Result<void, ClockRangeError>;
}
```

Consumers must handle the `err()` case explicitly — the `Result` type provides `map`, `andThen`, `match`, and other combinators for ergonomic error handling.

## Consequences

**Positive**:
- Error paths are visible at the type level. A caller can see that `next()` returns `Result<number, SequenceOverflowError>` and must handle overflow.
- No `try/catch` in consumer code — error handling uses `Result` combinators.
- Error types are frozen objects with structured metadata (e.g., `SequenceOverflowError.lastValue`), not thrown `Error` instances with stack traces.
- Consistent error handling across the entire `@hex-di/clock` API surface.
- Aligns with the HexDI ecosystem's `@hex-di/result` library.

**Negative**:
- Developers unfamiliar with `Result` types face a learning curve.
- Combinators like `map` and `andThen` are less familiar than `try/catch` to many JavaScript developers.
- Stack traces are not automatically captured (since errors are not thrown).

**Trade-off accepted**: The `@hex-di/result` library is a first-class HexDI dependency. All ecosystem packages use `Result` for error handling. The learning curve is a one-time cost, and the compile-time error visibility prevents silent error swallowing in production.
