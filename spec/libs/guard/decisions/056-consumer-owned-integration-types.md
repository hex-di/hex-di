# ADR-GD-056: Consumer libraries own integration-specific types and convenience wrappers

> **Status:** Accepted
> **ADR Number:** 056 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Types like `SagaAuditSummary`, `GuardContext`, and functions like `createGuardedStateAdapter()` were defined in guard's spec but semantically belong to `@hex-di/saga` and `@hex-di/flow`. If guard defines these, it must have knowledge of saga compensation semantics, flow transition shapes, and store action structures — creating reverse dependencies.

## Decision

Guard defines only the contract (sink ports and the evaluation API). Consuming libraries (`@hex-di/saga`, `@hex-di/flow`, `@hex-di/store`) own integration-specific types and convenience wrappers. The Consumer Responsibility Matrix in `10-cross-library.md` documents the distribution.

```ts
// In @hex-di/saga (NOT in @hex-di/guard)
export interface SagaAuditSummary {
  compensationGuardedBy: Policy;
  auditEntries: AuditEntry[];
}

// In @hex-di/flow (NOT in @hex-di/guard)
export function createGuardedStateAdapter(
  stateAdapter: StateAdapter,
  guardGraph: GuardGraph,
): GuardedStateAdapter { ... }
```

## Consequences

**Positive**:
- Guard's surface area is reduced to its core concern (authorization evaluation)
- Each library is independently evolvable without affecting guard
- Dependency inversion principle is correctly applied

**Negative**:
- Integration knowledge is distributed across multiple libraries
- Developers implementing cross-library features must read multiple specs to understand the full picture

**Trade-off accepted**: Dependency inversion and independent evolvability are more important than co-location; the Consumer Responsibility Matrix in `10-cross-library.md` provides a single reference for the distribution.
