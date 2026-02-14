# 01 - Overview

## 1.1 Overview

`@hex-di/clock` is a foundational package providing injectable clock and sequence generation abstractions for the HexDI ecosystem.

### Problem

The HexDI monorepo currently has **three independent timing implementations** and multiple raw `Date.now()` call sites:

| Package           | Function                | Mechanism                                                 |
| ----------------- | ----------------------- | --------------------------------------------------------- |
| `@hex-di/runtime` | `monotonicNow()`        | `performance.now()` with `Date.now()` fallback            |
| `@hex-di/tracing` | `getHighResTimestamp()` | `perf.timeOrigin + perf.now()` with `Date.now()` fallback |
| `@hex-di/query`   | `Clock` interface       | `Date.now()` (injectable)                                 |
| `@hex-di/logger`  | raw `Date.now()`        | not injectable                                            |
| `@hex-di/saga`    | raw `Date.now()`        | not injectable                                            |
| `@hex-di/store`   | raw `Date.now()`        | not injectable                                            |

This fragmentation creates three issues:

1. **GxP non-compliance.** The guard specification (section 62) requires a configurable, NTP-synchronized clock source. With six independent timing call sites, there is no single point of configuration. Deploying an NTP-validated clock requires patching each package individually.

2. **Inconsistent behavior.** Some packages use monotonic time (immune to NTP jumps), others use wall-clock time (subject to clock adjustments). The inconsistency makes cross-package event correlation unreliable.

3. **Untestable timing.** Only `@hex-di/query` has an injectable clock interface. All other packages use hardcoded `performance.now()` or `Date.now()` calls, making deterministic time-dependent testing impossible without Vitest fake timers.

### Solution

A single `@hex-di/clock` package that provides:

- **`ClockPort`** -- an injectable port with three time functions covering all use cases (monotonic, wall-clock, high-resolution).
- **`SequenceGeneratorPort`** -- an injectable monotonically-increasing counter for event ordering, decoupled from time precision.
- **`SystemClockAdapter`** -- a default adapter using platform APIs (`performance.now()`, `Date.now()`) with cross-platform detection.
- **`VirtualClockAdapter`** -- a test adapter with manual time control for deterministic testing.

All HexDI packages migrate to consume `ClockPort` instead of their local implementations.

## 1.2 Design Principles

### Port-First

The clock is defined as a port (interface), not as a concrete implementation. Consumers depend on the port; adapters provide the implementation. This enables:

- Swapping the system clock for a virtual clock in tests.
- Swapping the system clock for an NTP-validated clock in GxP deployments.
- Swapping the system clock for a simulated clock in replay/debugging scenarios.

### Three Time Functions, Three Use Cases

Not all time is the same:

| Function         | Returns                     | Use Case                                        | NTP-Immune |
| ---------------- | --------------------------- | ----------------------------------------------- | ---------- |
| `monotonicNow()` | Relative milliseconds       | Duration measurement, ordering within a process | Yes        |
| `wallClockNow()` | Epoch milliseconds          | Calendar timestamps, cross-process correlation  | No         |
| `highResNow()`   | Epoch milliseconds (sub-ms) | Tracing spans, high-precision audit timestamps  | No         |

Consumers choose the function that matches their semantic need.

### Sequence Numbers Are Not Clocks

The `SequenceGeneratorPort` is deliberately separate from `ClockPort`. Sequence numbers provide **total ordering** within a scope, independent of time precision. Even if two events share the same monotonic timestamp (due to platform-coarsened resolution), their sequence numbers are always distinct.

### Result-Based Error Handling

All fallible operations in `@hex-di/clock` return `Result<T, E>` from `@hex-di/result` instead of throwing exceptions. Factory functions that can fail at startup (`createSystemClock()`), sequence operations that can overflow (`next()`), and control functions that reject invalid input (`advance()` with negative values) all communicate failure through `err()` values. This eliminates try/catch in consumer code and makes error paths explicit at the type level.

### Zero-Cost When Unused

The package has no side effects, no global state, and no initialization cost beyond adapter construction. Packages that import only the port type pay zero runtime cost.

## 1.3 Package Structure

```
packages/clock/
  src/
    ports/
      clock.ts              # ClockPort interface
      sequence.ts           # SequenceGeneratorPort interface (no reset())
      diagnostics.ts        # ClockDiagnosticsPort interface (GxP source attestation)
      index.ts              # Port re-exports
    temporal-context.ts     # TemporalContext, OverflowTemporalContext, TemporalContextFactory (utility, not port)
    signature-validation.ts # validateSignableTemporalContext(), SignatureValidationError (21 CFR 11.50 enforcement)
    deserialization.ts      # deserializeTemporalContext(), deserializeOverflowTemporalContext(), deserializeClockDiagnostics()
    record-integrity.ts     # computeTemporalContextDigest(), verifyTemporalContextDigest() (SHA-256 per-record integrity)
    gxp-metadata.ts         # getClockGxPMetadata(), ClockGxPMetadata (clock version identification)
    adapters/
      system-clock.ts       # SystemClockAdapter (default) + ClockDiagnosticsPort
      index.ts              # Adapter re-exports
    events/
      clock-source-changed.ts  # ClockSourceChangedEvent (adapter swap audit event)
    testing/
      virtual-clock.ts      # VirtualClockAdapter
      virtual-sequence.ts   # VirtualSequenceGenerator (has reset())
      index.ts              # Testing re-exports
    index.ts                # Public API surface
  tests/
    clock-port.test.ts
    clock-port.test-d.ts
    sequence-generator.test.ts
    sequence-generator.test-d.ts
    system-clock.test.ts
    system-clock.test-d.ts
    system-clock-startup.test.ts
    system-clock-fallback.test.ts
    virtual-clock.test.ts
    virtual-sequence.test.ts
    clock-diagnostics.test.ts
    clock-diagnostics.test-d.ts
    temporal-context.test.ts
    temporal-context.test-d.ts
    signature-validation.test.ts
    signature-validation.test-d.ts
    deserialization.test.ts
    deserialization.test-d.ts
    record-integrity.test.ts
    record-integrity.test-d.ts
    graph-integration.test.ts
    graph-integration.test-d.ts
    clock-source-change.test.ts
    clock-source-change.test-d.ts
    clock-source-bridge.test.ts
    clock-source-bridge.test-d.ts
    gxp-metadata.test.ts
    gxp-metadata.test-d.ts
    hardware-clock.test-d.ts
    gxp-clock.test.ts
    gxp-iq-clock.test.ts
    gxp-oq-clock.test.ts
    gxp-pq-clock.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

### Export Map

```json
{
  ".": "./src/index.ts",
  "./testing": "./src/testing/index.ts"
}
```

The `./testing` entry point provides `VirtualClockAdapter` and `VirtualSequenceGenerator` without polluting the main entry point with test utilities.
