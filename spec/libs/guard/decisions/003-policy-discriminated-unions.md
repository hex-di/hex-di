# ADR-GD-003: Policies are discriminated union data structures, not callbacks

> **Status:** Accepted
> **ADR Number:** 003 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Authorization policies could be expressed as functions `(context: EvaluationContext) => boolean`. Callback-based policies are flexible but opaque — they cannot be inspected, serialized to JSON, transmitted to DevTools, or stored in databases. They also make exhaustive type-checking impossible. The design question: how to represent policies such that they can be stored, transmitted, and analyzed without executing arbitrary code?

## Decision

Policies are plain data objects with a `kind` discriminant. The 10 policy kinds (`hasPermission`, `hasRole`, `hasAttribute`, `hasResourceAttribute`, `hasSignature`, `hasRelationship`, `allOf`, `anyOf`, `not`, `labeled`) form a discriminated union. All evaluation logic lives in `evaluate()`, not in the policies.

```ts
const policy: Policy = {
  kind: "allOf",
  policies: [
    { kind: "hasPermission", permission: Permissions.document.read },
    { kind: "hasRole", role: "reviewer" },
  ],
};
JSON.stringify(policy); // Serializable — can be stored and transmitted
```

## Consequences

**Positive**:
- Serializable to JSON; inspectable in DevTools; testable without executing arbitrary code
- TypeScript exhaustive switch coverage catches missing cases at compile time
- Policies can be stored in databases and transmitted to DevTools panels

**Negative**:
- Cannot express arbitrary logic — only 10 built-in kinds
- The `labeled` kind partially re-introduces opaqueness for custom logic

**Trade-off accepted**: The 10 built-in kinds cover the vast majority of real-world access control patterns; serializability and inspectability are essential for compliance audit trails.
