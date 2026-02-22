# ADR-CK-010: Zero-Cost Abstraction Patterns

## Status

Accepted

## Context

`@hex-di/clock` introduces an abstraction layer between consumers and platform timing APIs (`performance.now()`, `Date.now()`). Any abstraction has potential runtime cost. In a library designed for hot-path usage (tracing span boundaries, audit entry creation, request timing), even small overhead matters.

Competitors take different approaches:
- **java.time.Clock:** Relies on JVM inlining to eliminate virtual dispatch overhead. The abstraction is zero-cost only after JIT warmup.
- **System.TimeProvider (.NET):** Virtual method dispatch on every call. Benchmarked at ~2-5ns overhead on .NET 8.
- **@js-temporal/polyfill:** Heavy object allocation per `Temporal.Instant` construction. ~100x slower than raw `Date.now()`.
- **@effect/io Clock:** Wrapped in Effect context with fiber scheduling overhead. Not designed for hot-path raw time reads.

The question was which JavaScript patterns to use for minimizing abstraction overhead while maintaining injectability and immutability.

## Decision

Use three complementary zero-cost patterns:

### 1. Closure Capture (Primary)

All adapter factories capture platform API references in closures at construction time. The returned methods are plain function objects that close over the captured references — no prototype chain, no class dispatch, no `this` binding.

```typescript
function createSystemClock(): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError> {
  const perf = performance;            // captured once
  const capturedDateNow = Date.now;    // captured once

  const monotonicNow = () => perf.now();      // closure dereference only
  const wallClockNow = () => capturedDateNow(); // closure dereference only

  return ok(Object.freeze({ monotonicNow, wallClockNow, highResNow, ... }));
}
```

**Why closures, not classes:** V8 optimizes closures aggressively. A closure-based function call is 1-2 machine instructions (load captured variable, call). Class method dispatch requires prototype chain lookup, which V8 can inline but with more deoptimization risk (hidden class transitions, megamorphic call sites).

**Why captured references:** Storing `Date.now` (the function reference, not the result) in the closure at construction time prevents post-construction tampering of `globalThis.Date`. This is both a security pattern (SEC-1 anti-tampering) and a performance pattern (no global lookup per call).

### 2. One-Time Object.freeze (Immutability)

All adapter objects are frozen once at construction. `Object.freeze()` is called exactly once per adapter lifetime — not per method call. Since adapters are singletons in the DI container, the freeze cost is amortized across millions of reads.

**Why freeze, not `readonly`:** TypeScript's `readonly` is compile-time only. `Object.freeze()` provides runtime immutability, which is required for GxP anti-tampering (21 CFR 11.10(c)) and also enables V8 optimizations: V8 can assume frozen objects don't change shape, enabling more aggressive inlining.

### 3. Type Erasure for Branded Types

Branded timestamp types (`MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`) exist purely at the TypeScript type level. At runtime, they are plain `number` values. The branding functions (`asMonotonic`, `asWallClock`, `asHighRes`) are identity functions — they return their argument unchanged.

```typescript
function asMonotonic(ms: number): MonotonicTimestamp {
  return ms as MonotonicTimestamp;
}
```

**Runtime cost:** Zero. The function compiles to `return ms`. V8 inlines this unconditionally.

**Why not `newtype` wrappers:** A newtype pattern (wrapping in `{ value: number }`) would provide true runtime brand checking but introduces allocation per value. In a tracing span that reads monotonic time at start and end, two allocations per span is unacceptable at 100K+ spans/sec.

## Consequences

- **Positive:** Abstraction overhead measured at < 1.5x raw platform API calls (see §4.10 benchmarks). `monotonicNow()` sustains > 10M ops/sec.
- **Positive:** No prototype chain, no `this` binding, no hidden class transitions. Adapters are monomorphic at all call sites.
- **Positive:** Branded types provide compile-time safety with zero runtime cost.
- **Positive:** Anti-tampering (closure capture) and immutability (Object.freeze) are achieved without per-call overhead.
- **Negative:** The closure capture pattern means adapters cannot be extended via inheritance. This is intentional — extension is done via new adapter implementations, not class inheritance.
- **Negative:** `Object.freeze()` prevents adding new properties to adapters after construction. All properties must be known at factory time. This is a feature, not a bug, for immutable adapters.
- **Negative:** Type-only branding means misbranding (calling `asMonotonic(Date.now())`) is not caught at runtime. The validated branding utilities (§2.5) provide opt-in runtime checks for boundary code.
