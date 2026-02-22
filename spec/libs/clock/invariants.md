# Invariants

Runtime guarantees enforced by the `@hex-di/clock` implementation. Each invariant is a property that holds for every instance at all times after construction. Invariants use the `INV-CK-N` identifier scheme (see [process/requirement-id-scheme.md](process/requirement-id-scheme.md)).

## INV-CK-1: Monotonic Time Never Decreases

For any two calls `a = monotonicNow()` and `b = monotonicNow()` where `a` is called before `b`, `b >= a` holds unconditionally. When `performance.now()` is available, this is guaranteed by the platform. When only `Date.now()` is available, the clamped fallback enforces monotonicity by returning the previous value when `Date.now()` regresses.

**Source**: `src/adapters/system-clock.ts` — `createClampedFallback()` closure; platform `performance.now()` guarantee.

**Implication**: Consumers can subtract two monotonic timestamps to compute a non-negative duration without defensive checks. Duration-based decisions (timeouts, rate limiters, span measurements) are never corrupted by NTP step corrections.

**Related**: [CLK-MON-001, CLK-MON-002](02-clock-port.md), [ADR-CK-002](decisions/002-three-time-functions.md), FM-1c in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-2: All Adapter Return Values Are Frozen

Every object returned by an adapter factory function (`createSystemClock`, `createSystemSequenceGenerator`, `createSystemTimerScheduler`, `createCachedClock`, `createEdgeRuntimeClock`, `createHostBridgeClock`) is sealed with `Object.freeze()` before being returned. This includes the adapter object itself, all error objects, `TimerHandle` instances, `TemporalContext` records, and `ClockDiagnostics` snapshots.

**Source**: `src/adapters/system-clock.ts`, `src/adapters/system-timer.ts`, `src/adapters/cached-clock.ts`, `src/adapters/edge-runtime-clock.ts`, `src/adapters/host-bridge-clock.ts` — final `Object.freeze()` call in each factory.

**Implication**: Consumers can trust that adapter objects and their return values have not been mutated after construction. No defensive copying is required. Supports ALCOA+ Original principle.

**Related**: [CLK-SYS-007](04-platform-adapters.md), [ADR-CK-001](decisions/001-port-first-architecture.md), [INV-CK-8](#inv-ck-8-temporalcontext-is-frozen-at-creation), FM-4 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-3: Platform API References Captured at Construction

`SystemClockAdapter` captures references to `Date.now`, `performance.now`, and `performance.timeOrigin` in closure scope at adapter construction time. These references are used for all subsequent time reads. Even if an attacker replaces `globalThis.Date.now` or `globalThis.performance.now` after adapter construction, the adapter continues using the originally captured references.

**Source**: `src/adapters/system-clock.ts` — platform API capture in `createSystemClock()` constructor scope.

**Implication**: Post-construction platform API tampering does not affect timestamp integrity. Combined with GxP-mode `Object.freeze()` on platform objects (ST-4), this provides defense-in-depth against timing manipulation.

**Related**: [CLK-SYS-001](04-platform-adapters.md), FM-4 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-4: Production Sequence Generator Is Structurally Irresettable

The production `SequenceGeneratorPort` interface does not include a `reset()` method. This is enforced at the type level — no code can call `reset()` on a production sequence generator regardless of intent. Only `VirtualSequenceGenerator` (in the `@hex-di/clock/testing` entry point) has a `reset()` method.

**Source**: `src/ports/sequence.ts` — `SequenceGeneratorPort` interface definition (no `reset()` method).

**Implication**: Sequence number integrity is guaranteed by the type system. There is no runtime escape hatch that could allow an attacker or a coding error to reset the counter and create duplicate sequence numbers in production. Supports 21 CFR 11.10(d) access control requirements.

**Related**: [CLK-SYS-008](04-platform-adapters.md), [ADR-CK-006](decisions/006-structural-irresettability.md), 21 CFR 11.10(d).

## INV-CK-5: Sequence Overflow Is Permanent

Once a `SequenceGeneratorPort` reaches `Number.MAX_SAFE_INTEGER`, it enters an overflow state permanently. All subsequent calls to `next()` return `err(SequenceOverflowError)`. The generator cannot be recovered from overflow — this is by design, as restarting the counter would create duplicate sequence numbers.

**Source**: `src/adapters/system-clock.ts` — overflow flag in `createSystemSequenceGenerator()`.

**Implication**: After overflow, every call to `next()` produces an identical error result. Consumers can rely on this for deterministic overflow handling. The `createOverflowContext()` emergency mechanism provides a degraded `TemporalContext` with sentinel `sequenceNumber: -1` for the overflow event audit record.

**Related**: [CLK-SEQ-003, CLK-SEQ-004, CLK-SEQ-005](03-sequence-generator.md), FM-2 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-6: Startup Self-Test Fails Fast

`createSystemClock()` performs a synchronous startup self-test (ST-1 through ST-5) before returning the adapter. If any test fails, the factory returns `err(ClockStartupError)` — the adapter is never constructed. No audit-relevant timestamp is generated before the platform is validated.

Self-test checks:
- ST-1: `performance.now()` returns a non-negative value
- ST-2: `Date.now()` returns a plausible value (≥ 2020-01-01)
- ST-3: Two consecutive `performance.now()` calls are non-regressive
- ST-4 (GxP mode): `Date` and `performance` objects are frozen
- ST-5: `highResNow()` and `wallClockNow()` are consistent within 1000ms

**Source**: `src/adapters/system-clock.ts` — startup self-test in `createSystemClock()`.

**Implication**: Applications using `createSystemClock()` are guaranteed that the platform timing APIs are plausible before any timestamp is served. Broken or tampered platforms are detected immediately, before the application serves any requests. Satisfies 21 CFR 11.10(h) device check requirements.

**Related**: [CLK-SYS-009, CLK-SYS-010, CLK-SYS-011](04-platform-adapters.md), FM-1a through FM-1d in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-7: Branded Timestamps Prevent Cross-Domain Misuse

`MonotonicTimestamp`, `WallClockTimestamp`, and `HighResTimestamp` are phantom-branded `number` subtypes. `MonotonicDuration` and `WallClockDuration` use the same phantom-branded pattern for elapsed time values. All branded types are assignment-compatible with `number` (covariant widening) but not with each other. A function accepting `MonotonicTimestamp` rejects `WallClockTimestamp` at compile time; a function accepting `MonotonicDuration` rejects `WallClockDuration` at compile time.

**Source**: `src/ports/clock.ts` — branded type definitions using unique symbols (timestamps and durations).

**Implication**: Cross-domain timestamp and duration confusion (passing wall-clock time where monotonic time is expected, or mixing duration types) is caught at compile time with zero runtime cost. The branding is erased at runtime — branded timestamps and durations are plain numbers in JavaScript.

**Related**: [02-clock-port.md §2.5](02-clock-port.md), [ADR-CK-004](decisions/004-branded-timestamps.md).

## INV-CK-8: TemporalContext Is Frozen at Creation

Every `TemporalContext` and `OverflowTemporalContext` produced by `TemporalContextFactory` is frozen with `Object.freeze()` immediately after field assignment. The frozen record contains `sequenceNumber`, `monotonicTimestamp`, and `wallClockTimestamp` (plus `lastValidSequenceNumber` and `_tag` for overflow contexts).

**Source**: `src/temporal-context.ts` — `Object.freeze()` in `create()` and `createOverflowContext()`.

**Implication**: Audit trail records are immutable from the moment of creation. No code path — including the consumer — can modify a `TemporalContext` after it is produced. Supports ALCOA+ Original principle and 21 CFR 11.10(c) record protection.

**Related**: [CLK-AUD-001](06-gxp-compliance/06-audit-trail-integration.md), [INV-CK-2](#inv-ck-2-all-adapter-return-values-are-frozen).

## INV-CK-9: CachedClockPort Is Structurally Incompatible with ClockPort

`CachedClockPort` uses different method names (`recentMonotonicNow`, `recentWallClockNow`) than `ClockPort` (`monotonicNow`, `wallClockNow`). This prevents structural assignability — a `CachedClockPort` cannot be passed where a `ClockPort` is expected. This is a compile-time safeguard against accidentally using stale cached timestamps for audit trail records.

**Source**: `src/ports/cached-clock.ts` — interface definition with distinct method names.

**Implication**: Developers cannot accidentally substitute a `CachedClockPort` for a `ClockPort` in `createTemporalContextFactory()` or any other audit-critical consumer. The compiler rejects the substitution. Supports ALCOA+ Contemporaneous principle.

**Related**: [02-clock-port.md §2.8](02-clock-port.md), [ADR-CK-007](decisions/007-cached-clock-separation.md), FM-10 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-10: Timer Handles Are Frozen Opaque Objects

`TimerHandle` objects returned by `TimerSchedulerPort.setTimeout()` and `setInterval()` are frozen plain objects with `{ _tag: "TimerHandle", id: number }`. The `id` is an internal implementation detail — consumers use the handle object directly with `clearTimeout()` / `clearInterval()`.

**Source**: `src/adapters/system-timer.ts` — `Object.freeze()` on `TimerHandle` construction.

**Implication**: Timer handles cannot be forged or mutated. The opaque handle pattern prevents consumers from extracting platform timer IDs and bypassing the abstraction.

**Related**: [02-clock-port.md §2.7](02-clock-port.md), FM-13 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-11: Error Objects Are Frozen at Construction

All error types (`ClockStartupError`, `SequenceOverflowError`, `SignatureValidationError`, `DeserializationError`, `BrandingValidationError`, `ClockRangeError`, `ClockTimeoutError`, `RetentionValidationError`) are frozen with `Object.freeze()` at construction time. Error factory functions produce the frozen object directly.

**Source**: `src/adapters/system-clock.ts`, `src/ports/sequence.ts`, `src/signature-validation.ts`, `src/deserialization.ts`, `src/branded.ts`, `src/testing/virtual-clock.ts`, `src/testing/virtual-timer.ts`.

**Implication**: Error objects passed through `err()` Result channels cannot be mutated by consumer code. Error metadata (e.g., `SequenceOverflowError.lastValue`) is trustworthy for audit logging. Supports ALCOA+ Original principle.

**Related**: [CLK-SYS-010, CLK-SEQ-002](04-platform-adapters.md), FM-14 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-12: Clock Source Change Events Are Unconditional

When a clock adapter registration changes in the DI container, a `ClockSourceChangedEvent` is emitted to `ClockSourceChangedSinkPort` unconditionally. The event emission does not depend on container lifecycle state or consumer registration order. If no `ClockSourceChangedSinkPort` is registered, a warning is logged to stderr.

**Source**: `src/events/clock-source-changed.ts` — event emission in container override handler.

**Implication**: Every clock source substitution produces an auditable record, even in scenarios where the sink was not yet registered at the time of the change. Supports 21 CFR 11.10(e) audit trail requirements and ALCOA+ Complete principle.

**Related**: [CLK-INT-007 through CLK-INT-011](07-integration.md), FM-5 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-13: TemporalContext Capture Ordering

`TemporalContextFactory.create()` always captures fields in this order: (1) `seq.next()`, (2) `clock.monotonicNow()`, (3) `clock.wallClockNow()`. The sequence number is captured first because it is the authoritative ordering mechanism. If the sequence number indicates overflow, the remaining fields are not captured.

**Source**: `src/temporal-context.ts` — field capture order in `create()`.

**Implication**: Consumers can rely on the happens-before relationship: if `ctx.sequenceNumber < other.sequenceNumber`, then `ctx` was captured before `other`, regardless of timestamp values. This is critical when two events share the same monotonic timestamp due to platform-coarsened resolution.

**Related**: [CLK-ORD-001](03-sequence-generator.md), FM-8 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).

## INV-CK-14: Record Integrity Digests Use Constant-Time Comparison

`verifyTemporalContextDigest()` compares the computed and provided digests using a constant-time algorithm. The comparison takes equal time regardless of whether the digests match, preventing timing side-channel attacks that could leak information about which bytes of a digest are correct.

**Source**: `src/record-integrity.ts` — constant-time comparison in `verifyTemporalContextDigest()`.

**Implication**: Attackers who can observe verification timing cannot progressively discover valid digest values. Supports 21 CFR 11.10(c) record protection.

**Related**: [CLK-AUD domain, 21 CFR 11.10(c)](06-gxp-compliance/06-audit-trail-integration.md), FM-15 in [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md).
