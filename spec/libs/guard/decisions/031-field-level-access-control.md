# ADR-GD-031: Field-level access control via optional `fields` property on `HasPermissionPolicy` and `HasAttributePolicy`

> **Status:** Accepted
> **ADR Number:** 031 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

GxP field masking requires hiding specific data fields (SSN, PHI) from users who have read access to a record but should not see specific sensitive fields. Policy-level field control avoids requiring separate masking logic in every downstream adapter or UI component.

## Decision

Optional `fields: string[]` property on `HasPermissionPolicy` and `HasAttributePolicy`. The evaluator propagates `visibleFields` through `allOf` (intersection — all must allow a field for it to be visible) and `anyOf` (first-allowing child). `FieldMaskContextPort` delivers the mask to downstream adapters.

```ts
// Policy-level field masking
const policy: HasPermissionPolicy = {
  kind: "hasPermission",
  permission: Permissions.patient.read,
  fields: ["name", "dateOfBirth", "diagnosis"], // SSN excluded
};
// undefined fields = all fields visible (backward compatible)
```

## Consequences

**Positive**:
- Declarative field masking at the policy level
- Backward compatible (`undefined` = all fields visible)
- GxP data minimization principle (principle of least privilege at field level)

**Negative**:
- Field-level control adds complexity to the evaluator
- `visibleFields` propagation rules (intersection vs union) require documentation and understanding

**Trade-off accepted**: Declarative field masking in policies is cleaner than ad-hoc masking in application code; the propagation complexity is inherent in the problem and is documented precisely.
