# Glossary

Domain terminology used throughout the `@hex-di/clock` specification. For regulatory and GxP-specific terms (ALCOA+, GAMP 5, FMEA, IQ/OQ/PQ, etc.), see [06-gxp-compliance/README.md](06-gxp-compliance/README.md).

## Adapter

A concrete implementation of a port interface. For example, `SystemClockAdapter` implements `ClockPort` using platform timing APIs. Multiple adapters may exist for the same port: `SystemClockAdapter` for production, `VirtualClockAdapter` for testing, `EdgeRuntimeClockAdapter` for Workers/Vercel Edge, `HostClockBridge` for React Native/WASM.

See [04-platform-adapters.md](04-platform-adapters.md), [ADR-CK-001](decisions/001-port-first-architecture.md).

## Auto-Advance

A `VirtualClockAdapter` feature where each time read (`monotonicNow()`, `wallClockNow()`, `highResNow()`) automatically advances the internal clock state by a configurable number of milliseconds. Returns the value *before* advancement. Controlled by `setAutoAdvance()` / `getAutoAdvance()`.

See [05-testing-support.md §5.1](05-testing-support.md).

## BlockUntil

A synchronization primitive on `VirtualTimerScheduler` that returns a promise resolving when the pending timer count reaches a specified threshold. Uses real (platform) time for its timeout to prevent deadlocks.

See [05-testing-support.md](05-testing-support.md).

## Branded Timestamp

A TypeScript pattern where `number` is intersected with a unique symbol brand (e.g., `number & { readonly [MonotonicBrand]: true }`) to create a nominally distinct type at compile time with zero runtime cost. `MonotonicTimestamp`, `WallClockTimestamp`, and `HighResTimestamp` are branded timestamps that prevent cross-domain misuse.

See [02-clock-port.md §2.5](02-clock-port.md), [ADR-CK-004](decisions/004-branded-timestamps.md), [INV-CK-7](invariants.md#inv-ck-7-branded-timestamps-prevent-cross-domain-misuse).

## CachedClockPort

A structurally separate port (not extending `ClockPort`) that provides periodically-refreshed time values for ultra-high-throughput scenarios. Method names differ from `ClockPort` (`recentMonotonicNow` vs. `monotonicNow`) to prevent accidental substitution. MUST NOT be used for audit trail timestamps.

See [02-clock-port.md §2.8](02-clock-port.md), [ADR-CK-007](decisions/007-cached-clock-separation.md), [INV-CK-9](invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport).

## Clamped Fallback

A timing mechanism that wraps `Date.now()` to prevent backward time jumps. When `Date.now()` returns a value less than the previous call (due to NTP correction), the clamped fallback returns the previous value instead. Provides monotonicity without `performance.now()`.

See [02-clock-port.md §2.2](02-clock-port.md), [INV-CK-1](invariants.md#inv-ck-1-monotonic-time-never-decreases).

## ClockPort

The primary injectable interface with three time functions: `monotonicNow()`, `wallClockNow()`, `highResNow()`. Defined as a plain interface with readonly function properties (not methods) to enable destructuring without `this`-binding issues.

See [02-clock-port.md §2.1](02-clock-port.md), [ADR-CK-001](decisions/001-port-first-architecture.md).

## Composite Key

The unique identifier `(processInstanceId, sequenceNumber)` that uniquely identifies an event across all process lifetimes and restarts. Required for multi-process GxP deployments.

See [03-sequence-generator.md §3.3](03-sequence-generator.md).

## High-Resolution Time

Time measurement with sub-millisecond precision, typically using `performance.timeOrigin + performance.now()`. Provides epoch-referenced timestamps with microsecond or better precision on supported platforms.

See [02-clock-port.md §2.4](02-clock-port.md).

## Monotonic Time

A time source that only moves forward and is never adjusted backward. `performance.now()` provides monotonic time immune to NTP corrections. Monotonic time is relative (elapsed time since an arbitrary origin), not absolute (calendar time).

See [02-clock-port.md §2.2](02-clock-port.md), [INV-CK-1](invariants.md#inv-ck-1-monotonic-time-never-decreases).

## Platform API Capture

The technique of storing references to `Date.now`, `performance.now()`, and `performance.timeOrigin` in closure scope at adapter construction time. Prevents post-construction tampering.

See [04-platform-adapters.md §4.1](04-platform-adapters.md), [INV-CK-3](invariants.md#inv-ck-3-platform-api-references-captured-at-construction).

## Port

An interface defining a contract for a capability without specifying implementation. In hexagonal architecture, ports are the boundary between application core logic and external dependencies. `ClockPort` is a port; `SystemClockAdapter` is an adapter.

See [ADR-CK-001](decisions/001-port-first-architecture.md).

## Process Instance Identifier

A unique identifier for multi-process deployments (e.g., horizontally scaled Node.js workers). Format: `{hostname}-{startupTimestamp}-{uuid}`. Combined with sequence numbers as the composite key for globally unique event ordering.

See [03-sequence-generator.md §3.3](03-sequence-generator.md).

## SequenceGeneratorPort

An injectable monotonically-increasing counter for event ordering, deliberately separated from `ClockPort`. Provides `next()` returning `Result<number, SequenceOverflowError>` and `current()`. The production interface has no `reset()` method (structural irresettability).

See [03-sequence-generator.md](03-sequence-generator.md), [ADR-CK-003](decisions/003-separate-sequence-generator.md), [INV-CK-4](invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable).

## Startup Self-Test

A series of validation checks (ST-1 through ST-5) performed synchronously during `createSystemClock()` construction. Verifies platform timing API plausibility before any timestamp is served.

See [04-platform-adapters.md §4.2](04-platform-adapters.md), [INV-CK-6](invariants.md#inv-ck-6-startup-self-test-fails-fast).

## Structural Irresettability

A design pattern where the inability to perform an operation (e.g., resetting a sequence counter) is enforced at the type level, not just at runtime. The production `SequenceGeneratorPort` lacks `reset()` entirely.

See [03-sequence-generator.md](03-sequence-generator.md), [ADR-CK-006](decisions/006-structural-irresettability.md), [INV-CK-4](invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable).

## TemporalContext

A frozen data structure containing `sequenceNumber`, `monotonicTimestamp`, and `wallClockTimestamp`. Produced by `TemporalContextFactory.create()`. Serves as the standardized audit timestamp type for all HexDI ecosystem packages.

See [06-gxp-compliance/06-audit-trail-integration.md](06-gxp-compliance/06-audit-trail-integration.md), [INV-CK-8](invariants.md#inv-ck-8-temporalcontext-is-frozen-at-creation).

## TimerHandle

An opaque, frozen object returned by `TimerSchedulerPort.setTimeout()` and `setInterval()`. Contains `_tag: "TimerHandle"` and `id`. Used with `clearTimeout()` / `clearInterval()` for cancellation.

See [02-clock-port.md §2.7](02-clock-port.md), [INV-CK-10](invariants.md#inv-ck-10-timer-handles-are-frozen-opaque-objects).

## TimerSchedulerPort

An injectable port for scheduling future work (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `sleep`). Separate from `ClockPort` per Single Responsibility Principle.

See [02-clock-port.md §2.7](02-clock-port.md).

## VirtualClockAdapter

A test-only `ClockPort` adapter with manual time control. Provides `advance()`, `set()`, `jumpWallClock()`, and auto-advance for deterministic testing without platform timer dependencies.

See [05-testing-support.md](05-testing-support.md).

## VirtualTimerScheduler

A test-only `TimerSchedulerPort` adapter linked to a `VirtualClockAdapter`. When virtual time advances, pending timers fire synchronously in chronological order (FIFO for ties). Provides `pendingCount()`, `advanceTime()`, `runAll()`, `runNext()`, and `blockUntil()`.

See [05-testing-support.md](05-testing-support.md).

## Wall-Clock Time

Calendar time as displayed on a wall clock. Obtained from `Date.now()` in JavaScript. Subject to NTP corrections and manual adjustments, unlike monotonic time. Measured as milliseconds since the Unix epoch (January 1, 1970, 00:00:00 UTC).

See [02-clock-port.md §2.3](02-clock-port.md).
