# ADR-GD-028: `signerRole` check uses `ValidatedSignature.signerRoles` (the signer's roles at capture time), not `context.subject.roles`

> **Status:** Accepted
> **ADR Number:** 028 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

In counter-signing workflows (e.g., a pharmacist countersigns a batch record prepared by a technician), the signer and the subject are different people. The `hasSignature` policy can require a specific signer role. Should the evaluator check `context.subject.roles` or `ValidatedSignature.signerRoles`?

## Decision

The `hasSignature` evaluator checks `ValidatedSignature.signerRoles` (captured at signature time) instead of `context.subject.roles`. The signer's roles travel with the `ValidatedSignature` object.

```ts
// Counter-signing: signer != subject
// subject = technician, signer = pharmacist
const policy: HasSignaturePolicy = {
  kind: "hasSignature",
  requiredRole: "pharmacist", // checked against signerRoles, not subject.roles
};
// ValidatedSignature.signerRoles = ["pharmacist"] — evaluated correctly
// context.subject.roles = ["technician"] — NOT used for this check
```

## Consequences

**Positive**:
- Counter-signing workflows are evaluated correctly
- Signer roles are captured at the moment of signing and cannot be retroactively changed
- Correct role context for the actual signer

**Negative**:
- `ValidatedSignature` must carry `signerRoles` captured at signature time
- More data stored per signature
- Signature capture must include role snapshot

**Trade-off accepted**: Correct authorization in counter-signing scenarios is a hard requirement; the extra data in `ValidatedSignature` is a justified cost.
