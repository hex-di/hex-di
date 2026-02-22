# ADR-CK-007: Cached Clock Structural Separation

## Status

Accepted

## Context

High-throughput scenarios (e.g., logging millions of events per second) may find per-call `performance.now()` overhead unacceptable. A cached clock that refreshes periodically (e.g., every 10ms) can reduce overhead by amortizing the platform API call across many reads.

However, a cached clock returns *stale* timestamps — up to `updateIntervalMs` behind the current time. If a cached clock extended `ClockPort`, it could be accidentally passed to `createTemporalContextFactory()`, producing audit trail records with stale timestamps that violate ALCOA+ Contemporaneous.

The question was whether to: (a) make `CachedClockPort` extend `ClockPort` with a staleness warning in documentation, (b) make `CachedClockPort` a structurally distinct type that cannot be substituted for `ClockPort`, or (c) add a runtime guard to `createTemporalContextFactory()` that rejects cached clocks.

## Decision

`CachedClockPort` is structurally incompatible with `ClockPort`. The method names are deliberately different:

```typescript
// ClockPort
interface ClockPort {
  readonly monotonicNow: () => MonotonicTimestamp;
  readonly wallClockNow: () => WallClockTimestamp;
  readonly highResNow: () => HighResTimestamp;
}

// CachedClockPort — different method names
interface CachedClockPort {
  readonly recentMonotonicNow: () => MonotonicTimestamp;
  readonly recentWallClockNow: () => WallClockTimestamp;
}
```

The `recent` prefix makes staleness explicit in the method name. TypeScript's structural typing ensures that `CachedClockPort` cannot be assigned to a `ClockPort` parameter — the compiler rejects the substitution because the method names don't match.

## Consequences

**Positive**:
- Compile-time prevention of cached clock misuse in audit-critical contexts.
- The method names (`recentMonotonicNow` vs. `monotonicNow`) self-document the staleness.
- No runtime guards needed — the type system is the enforcement mechanism.
- No `highResNow()` on cached clocks, reducing API surface to only the cached-appropriate functions.

**Negative**:
- Two clock interfaces to understand instead of one.
- Code that works with both `ClockPort` and `CachedClockPort` must handle them separately (no polymorphism).
- The naming convention (`recent*`) is a design choice that could be debated.

**Trade-off accepted**: The FM-10 failure mode (cached clock used for audit timestamps) has a severity of 8 and would violate ALCOA+ Contemporaneous. Compile-time prevention with zero runtime cost is the strongest possible mitigation. The dual-interface cost is proportional to the safety benefit.

See [INV-CK-9](../invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport), FM-10 in [FMEA](../06-gxp-compliance/11-fmea-risk-analysis.md).
