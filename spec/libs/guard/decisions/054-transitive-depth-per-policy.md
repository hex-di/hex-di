# ADR-GD-054: Transitive depth is bounded per-policy (not global)

> **Status:** Accepted
> **ADR Number:** 054 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Relationship graphs in systems like Google Groups or GitHub organizations can be deeply nested. Unbounded traversal of `hasRelationship` could follow chains of 50+ hops, causing runaway execution. A global depth limit would be too coarse — some policies legitimately need 3 hops while others need only 1.

## Decision

Each `hasRelationship` policy specifies its own `depth` parameter (default 1). The `RelationshipResolver` implementation enforces the depth. Per-policy depth is stored on the policy data structure for serializability.

```ts
// Different depth requirements for different policies
const directMemberPolicy: HasRelationshipPolicy = {
  kind: "hasRelationship",
  relation: "member",
  depth: 1, // only direct membership (default)
};
const transitiveMemberPolicy: HasRelationshipPolicy = {
  kind: "hasRelationship",
  relation: "member",
  depth: 3, // follow up to 3 hops for nested groups
};
```

## Consequences

**Positive**:
- No runaway traversal
- Per-policy depth control is more expressive than a global limit
- Depth is serializable and visible in evaluation traces

**Negative**:
- Multiple `hasRelationship` policies in a tree each manage their own depth budget
- Resolver implementations must accept and respect the depth parameter

**Trade-off accepted**: Per-policy depth provides the right level of control with no additional complexity beyond what is inherent in the problem of depth-bounded graph traversal.
