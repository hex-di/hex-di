# ADR-GD-010: Permission set precomputation (eager)

> **Status:** Accepted
> **ADR Number:** 010 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Role hierarchies can be deeply nested. Checking `hasPermission("admin:delete")` might require traversing 5 levels of role inheritance on every check. Two strategies: (1) lazy traversal on every check, or (2) eager precomputation of the full transitive permission set at subject creation.

## Decision

When a subject is created, `flattenPermissions()` resolves the full transitive permission set once. Subsequent checks use `O(1)` `Set.has()` lookups.

```ts
// At subject creation — pay the traversal cost once
const subject = createSubject({ id: "user-123", roles: [teamLeadRole], attributes: {} });
// Internally: full DAG traversal, result cached as Set<string>

// At every subsequent check — O(1) lookup
const hasPermission = subject._permissionSet.has("document:read");
```

## Consequences

**Positive**:
- O(1) permission lookups regardless of role hierarchy depth
- No repeated DAG traversal
- Predictable, bounded performance

**Negative**:
- Subject creation cost increases with the transitive permission set size
- Large role hierarchies have higher startup cost

**Trade-off accepted**: Subject creation happens once per scope; the O(1) lookup benefit at every authorization check far outweighs the one-time creation cost.
