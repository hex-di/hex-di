# ADR-GD-023: SignatureServicePort is optional (unlike mandatory AuditTrailPort)

> **Status:** Accepted
> **ADR Number:** 023 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Electronic signatures are only required for workflows that include `hasSignature` policies, which are specific to 21 CFR Part 11 environments. Requiring all applications to configure a `SignatureServicePort` would force non-GxP users to implement a signature adapter they will never use.

## Decision

`SignatureServicePort` is optional in `createGuardGraph()`. When absent, `NoopSignatureService` is used automatically. `NoopSignatureService` returns `Err` for all signature operations. GxP mode (`gxp: true`) rejects `NoopSignatureService` at construction time.

```ts
// Non-GxP: no signature service needed
createGuardGraph({ auditTrailAdapter });

// GxP with hasSignature policies: real service required
createGuardGraph({
  auditTrailAdapter: gxpAuditTrail,
  signatureService: realHsmSignatureService,
  gxp: true,
});
```

## Consequences

**Positive**:
- Non-GxP applications have zero configuration burden
- GxP applications explicitly configure a real service
- Clear signal when misconfigured (Err from Noop operations)

**Negative**:
- `NoopSignatureService` returns `Err` silently in non-GxP environments — developers must check for this if they use `hasSignature` policies without GxP mode

**Trade-off accepted**: Optional configuration for an optional feature is the correct default; GxP mode enforcement prevents accidental Noop usage in regulated environments.
