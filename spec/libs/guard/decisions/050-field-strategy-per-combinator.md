# ADR-GD-050: Field strategy is opt-in per combinator, not global

> **Status:** Accepted
> **ADR Number:** 050 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Field-level access control (see [ADR-GD-031](./031-field-level-access-control.md)) requires merging `visibleFields` from multiple policies. A global field strategy would force all combinators in a policy tree to use the same behavior (intersection or union), preventing fine-grained control in complex policy trees.

## Decision

`fieldStrategy` is an optional property on combinator policies (`allOf`, `anyOf`). Default is "intersection" for `allOf` and "first-allowing" for `anyOf`. The strategy is stored on the policy data structure (not passed at evaluation time) for serializability.

```ts
// Outer allOf uses default intersection
const policy: AllOfPolicy = {
  kind: "allOf",
  policies: [
    // Inner anyOf uses union to collect fields from any matching role
    {
      kind: "anyOf",
      fieldStrategy: "union",
      policies: [editorFieldPolicy, reviewerFieldPolicy],
    },
    baseReadPolicy,
  ],
};
```

## Consequences

**Positive**:
- Fine-grained field control per combinator
- Serializable and inspectable (stored on policy data)
- Default values omitted during serialization to minimize payload size

**Negative**:
- Different combinators can have different field strategies, increasing mental model complexity
- "union" semantics on `anyOf` require full evaluation (see [ADR-GD-051](./051-anyof-union-full-evaluation.md))

**Trade-off accepted**: Per-combinator control is essential for real-world field masking scenarios involving mixed role-based and attribute-based policies; the complexity is inherent in the problem.
