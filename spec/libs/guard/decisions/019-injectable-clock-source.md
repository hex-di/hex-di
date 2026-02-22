# ADR-GD-019: Clock source is injectable for testability and audit-grade timestamp control

> **Status:** Accepted
> **ADR Number:** 019 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Time-dependent behavior (timestamp generation, scope lifetime checks, `maxScopeLifetimeMs` evaluation) is hard to test with real wall clock time. Tests need deterministic, controllable timestamps to avoid flakiness and to test edge cases like scope expiry.

## Decision

The clock is passed as an option to `createGuardGraph()`. Production uses `SystemClock` (wrapping `new Date().toISOString()`). Tests inject a `FixedClock` or `ManualClock` for deterministic timestamps.

```ts
// Production
createGuardGraph({ auditTrailAdapter, clock: new SystemClock() });

// Tests — fully deterministic
const fixedClock = new FixedClock("2024-01-15T10:30:00.000Z");
createGuardGraph({ auditTrailAdapter, clock: fixedClock });
```

## Consequences

**Positive**:
- Deterministic test timestamps
- No time-based test flakiness
- Production clock is explicit and auditable
- Supports GxP clock qualification requirements

**Negative**:
- Every guard graph construction must pass a clock (or rely on the `SystemClock` default)

**Trade-off accepted**: The testing benefits of injectable clocks far outweigh the minor configuration overhead; explicit clock configuration is also beneficial for GxP clock source qualification.
