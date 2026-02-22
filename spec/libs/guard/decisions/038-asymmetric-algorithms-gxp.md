# ADR-GD-038: Asymmetric algorithms required for GxP compliance evidence signatures

> **Status:** Accepted
> **ADR Number:** 038 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

HMAC-SHA256 provides message authentication but not non-repudiation — both the signer and the verifier hold the same key, so either party could have produced the signature. For regulatory compliance evidence (batch release records, regulatory submissions), non-repudiation is essential: only the signer should be able to produce the signature.

## Decision

RSA-SHA256 (2048-bit minimum) or ECDSA P-256 is REQUIRED for GxP compliance evidence signatures. HMAC-SHA256 remains permitted for development, testing, and non-regulatory operational signatures. Aligns with NIST SP 800-131A.

```ts
// GxP compliance evidence: asymmetric required
const gxpSignatureService = createSignatureService({
  algorithm: "RSA-SHA256",     // or "ECDSA-P256"
  privateKey: hsmPrivateKey,   // HSM-backed per ADR-GD-043
});

// Non-compliance-critical: HMAC acceptable
const devSignatureService = createSignatureService({
  algorithm: "HMAC-SHA256",
  secret: devSecret,
});
```

## Consequences

**Positive**:
- Non-repudiation for regulatory submissions
- NIST SP 800-131A alignment
- HMAC still available for non-compliance-critical use cases

**Negative**:
- Asymmetric algorithm infrastructure is more complex (key pairs, PKI, key management)
- HSM requirement (see [ADR-GD-043](./043-hsm-required-gxp-key-storage.md)) adds infrastructure cost

**Trade-off accepted**: Non-repudiation is a hard requirement for compliance evidence; the asymmetric infrastructure is a necessary consequence of the regulatory requirement.
