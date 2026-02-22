# ADR-GD-052: `hasRelationship` is the 8th policy kind (not a custom evaluator)

> **Status:** Accepted
> **ADR Number:** 052 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Relationship-Based Access Control (ReBAC) enables policies like "user can edit document if user is a member of the document's owner team." This could be implemented as a custom evaluator outside the policy engine, bypassing serialization and trace trees — the same problem that motivated [ADR-GD-025](./025-has-signature-policy-variant.md).

## Decision

`hasRelationship` is added as the 8th variant in the policy discriminated union. Relationship checking is delegated to the `RelationshipResolver` port, keeping the policy data serializable. The `RelationshipResolver` port is optional.

```ts
const policy: HasRelationshipPolicy = {
  kind: "hasRelationship",
  relation: "member",        // "user is member of resource"
  depth: 2,                  // follow at most 2 hops
};
// Evaluated in evaluate() — serializable, traceable, type-safe
// Resolver is injected via createGuardGraph({ relationshipResolver })
```

## Consequences

**Positive**:
- Serializable; visible in trace trees; covered by exhaustive switch
- Consistent evaluation model
- Resolver port is optional (no overhead when unused)

**Negative**:
- Discriminated union grows again (now 8 variants)
- `RelationshipResolver` port adds a new optional dependency
- Absent resolver produces `Err(MissingRelationshipResolver)`

**Trade-off accepted**: Consistency of the evaluation model and serializability are more important than keeping the union small; each variant adds one well-defined case.
