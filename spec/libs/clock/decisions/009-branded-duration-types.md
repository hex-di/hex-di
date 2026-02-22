# ADR-CK-009: Branded Duration Types

## Status

Accepted

## Context

ADR-CK-004 introduced branded timestamp types (`MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`) to prevent cross-domain timestamp misuse at compile time. However, arithmetic on branded timestamps produces plain `number` (CLK-BRD-004). This means duration values lose their domain origin:

```typescript
const elapsed = clock.monotonicNow() - clock.monotonicNow(); // number
const wallElapsed = clock.wallClockNow() - clock.wallClockNow(); // number

// Both are 'number' — can be accidentally swapped
recordDuration(wallElapsed); // Bug: wall-clock duration passed where monotonic expected
```

Monotonic durations and wall-clock durations have different semantics:
- Monotonic durations are immune to NTP jumps and represent true elapsed time.
- Wall-clock durations are affected by clock adjustments and can go negative.

The question was whether to: (a) accept `number` for durations and rely on documentation, (b) introduce branded duration types with the same zero-cost pattern as timestamps, or (c) introduce a `Duration` class with runtime methods.

## Decision

Introduce `MonotonicDuration` and `WallClockDuration` as branded `number` types with the same phantom-brand pattern as timestamps. Provide `elapsed(clock, since)` as the primary factory and `asMonotonicDuration`/`asWallClockDuration` as branding utilities.

No `HighResDuration` type is defined. High-resolution timestamps have the same epoch basis as wall-clock timestamps — their durations are semantically wall-clock durations.

## Rationale

### Why branded types, not a Duration class?

A `Duration` class (similar to `java.time.Duration`) would provide a richer API (`.toSeconds()`, `.plus()`, `.isNegative()`) but introduces runtime allocation overhead. Clock durations are computed in hot paths (tracing spans, request timing, cache TTL checks). A branded `number` has zero overhead — it IS a number. The type system does the work at compile time; the runtime pays nothing.

This is consistent with ADR-CK-004's decision for timestamps and aligns with the library's zero-cost-when-unused principle.

### Why `elapsed(clock, since)` instead of `clock.elapsed(since)`?

Adding `elapsed()` as a method on `ClockPort` would change the port interface, requiring all adapters to implement it. Since `elapsed` is a trivial computation (`monotonicNow() - since`), it belongs as a standalone function that composes over the port — not as a port method. This keeps `ClockPort` at exactly 3 methods (ADR-CK-002).

### Why no `HighResDuration`?

High-resolution timestamps (`HighResTimestamp`) share the epoch basis of wall-clock timestamps (they are `performance.timeOrigin + performance.now()`). The difference between two high-res timestamps is a wall-clock duration. Introducing a third duration type would add API surface without preventing a new class of bugs.

## Consequences

- **Positive:** Duration values now carry domain safety. Passing a `MonotonicDuration` where `WallClockDuration` is expected is a compile-time error.
- **Positive:** Zero runtime cost. Branded durations are plain numbers.
- **Positive:** `elapsed(clock, since)` provides a clean, discoverable API for the most common duration computation.
- **Negative:** `monotonicNow() - monotonicNow()` still produces `number`. Consumers must use `elapsed()` or `asMonotonicDuration()` to get branded durations. This is an opt-in pattern, not enforced.
- **Negative:** Two additional branded types and five additional exports in the API surface.
