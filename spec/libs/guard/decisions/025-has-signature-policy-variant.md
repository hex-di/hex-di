# ADR-GD-025: `hasSignature` is the 7th policy variant (not a custom evaluator)

> **Status:** Accepted
> **ADR Number:** 025 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Electronic signature requirements could be checked outside the policy engine (in a pre-check before `evaluate()` runs). This would bypass the trace tree, serialization, and exhaustive switch coverage. The design question: should signature policies integrate into the existing policy engine or live outside it?

## Decision

`hasSignature` is added as the 7th variant in the policy discriminated union. It is evaluated within the same `evaluate()` function as all other policy kinds. This preserves all properties of the policy engine.

```ts
// hasSignature integrates into the discriminated union
const policy: Policy = {
  kind: "hasSignature",
  requiredRole: "pharmacist",        // signer must have this role
  algorithm: "RSA-SHA256",
};
// Evaluated in the same evaluate() function — serializable, traceable
```

## Consequences

**Positive**:
- Serializable; visible in evaluation trace trees
- Covered by exhaustive switch in type checks
- Consistent evaluation model for all authorization concerns

**Negative**:
- The discriminated union grows with each new policy kind
- More cases to handle in `evaluate()`

**Trade-off accepted**: Consistency of the evaluation model and serializability are more important than keeping the union small; each new variant adds one case to the evaluator.
