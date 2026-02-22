# ADR-GD-036: `createAuditTrailConformanceSuite` as a reusable adapter validation harness

> **Status:** Accepted
> **ADR Number:** 036 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Every GxP-compliant audit trail adapter must satisfy a set of behavioral invariants (append-only semantics, atomic writes, hash chain integrity, etc.). Without a standard test harness, each adapter author must re-implement the same conformance tests from scratch, leading to inconsistent and incomplete OQ evidence.

## Decision

`createAuditTrailConformanceSuite({ factory })` in `@hex-di/guard-testing` provides a parameterized, standardized test harness with 17 conformance tests. Adapter authors call the factory to get standardized OQ evidence automatically.

```ts
// Adapter authors get 17 conformance tests by calling this factory
import { createAuditTrailConformanceSuite } from "@hex-di/guard-testing";

describe("PostgresAuditTrail conformance", () => {
  createAuditTrailConformanceSuite({
    factory: () => new PostgresAuditTrail({ connectionString }),
  });
  // 17 standardized tests run automatically
});
```

## Consequences

**Positive**:
- Consistent conformance testing across all adapter implementations
- Reduced burden on adapter authors
- Standardized OQ evidence acceptable for regulatory submissions

**Negative**:
- Conformance suite must stay synchronized with the `AuditTrailPort` contract as it evolves
- Additional maintenance in `@hex-di/guard-testing`

**Trade-off accepted**: Consistent, standardized OQ evidence is worth the synchronization maintenance overhead; inconsistent conformance testing across adapters would undermine GxP reliability.
