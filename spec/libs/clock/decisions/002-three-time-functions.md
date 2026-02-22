# ADR-CK-002: Three Time Functions

## Status

Accepted

## Context

Different parts of the HexDI ecosystem need different kinds of time:

- **Duration measurement** (HTTP request latency, resolution timing): needs monotonic time immune to NTP jumps.
- **Calendar timestamps** (audit trails, cross-process correlation): needs wall-clock time referenced to epoch.
- **Tracing spans** (high-precision profiling): needs sub-millisecond epoch-referenced time.

A single `now()` function cannot serve all three use cases without requiring consumers to know what kind of time they're getting. Some frameworks (like Rust's `std::time`) separate `Instant` (monotonic) from `SystemTime` (wall-clock). Others (like Go's `time.Now()`) return a single type that embeds both.

The question was whether `ClockPort` should have one `now()` function, two (monotonic + wall-clock), or three.

## Decision

`ClockPort` provides exactly three functions:

| Function | Returns | Use Case | NTP-Immune |
|----------|---------|----------|------------|
| `monotonicNow()` | `MonotonicTimestamp` (relative ms) | Duration measurement, ordering within a process | Yes |
| `wallClockNow()` | `WallClockTimestamp` (epoch ms) | Calendar timestamps, cross-process correlation | No |
| `highResNow()` | `HighResTimestamp` (epoch ms, sub-ms) | Tracing spans, high-precision audit timestamps | No |

Each returns a branded timestamp type to prevent cross-domain confusion at compile time. See [ADR-CK-004](004-branded-timestamps.md).

## Consequences

**Positive**:
- Consumers explicitly choose the time function matching their semantic need — no ambiguity.
- Branded return types prevent passing monotonic time where wall-clock is expected.
- The three-function model maps cleanly to platform APIs (`performance.now()`, `Date.now()`, `performance.timeOrigin + performance.now()`).
- Each function's NTP sensitivity is documented in the type name.

**Negative**:
- Three functions is more API surface than a single `now()`.
- Consumers must learn which function to use — though the names and types guide the choice.
- `highResNow()` depends on `performance.timeOrigin`, which is unavailable on some platforms. Fallback to `wallClockNow()` precision is needed.

**Trade-off accepted**: The API surface increase is proportional to the semantic distinctions. A single `now()` would hide the monotonic/wall-clock/high-res distinction, forcing consumers to make assumptions. Explicit naming eliminates that ambiguity.
