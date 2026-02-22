# ADR-GD-002: Roles form a DAG (not tree) with cycle detection

> **Status:** Accepted
> **ADR Number:** 002 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Role hierarchies in real-world systems are rarely simple trees. A `TeamLead` role may need to inherit from both `Editor` and `Reviewer`. A simple tree structure cannot represent this — multiple inheritance requires a directed acyclic graph (DAG). DAGs allow arbitrary multiple inheritance but introduce the risk of circular references (e.g., `Admin` inherits from `Editor`, which inherits from `Admin`). The design question: how to support expressive multi-inheritance role hierarchies while protecting against infinite traversal from accidental cycles?

## Decision

Role inheritance forms a directed acyclic graph. `flattenPermissions()` traverses the DAG using a visited-set to track already-processed nodes and returns `Err<CircularRoleInheritanceError>` if a cycle is detected at runtime.

```ts
const teamLeadRole = createRole("team-lead", {
  inherits: [editorRole, reviewerRole], // Multiple inheritance — a DAG
  permissions: [Permissions.team.manage],
});
const result = flattenPermissions(teamLeadRole);
// Ok(Set<Permission>) or Err<CircularRoleInheritanceError>
```

## Consequences

**Positive**:
- Expressive role hierarchies with multiple inheritance are supported
- Cycle detection returns `Err` instead of infinite recursion
- Callers handle the error explicitly via the Result type

**Negative**:
- DAG traversal is more complex than tree traversal (requires visited-set)
- Callers must handle `Err<CircularRoleInheritanceError>`

**Trade-off accepted**: Real-world role structures require multiple inheritance; the additional DAG complexity is a necessary and manageable cost.
