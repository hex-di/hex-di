# ADR-GD-040: Minimum cryptographic key sizes for SignatureService

> **Status:** Accepted
> **ADR Number:** 040 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Keys below industry standards (RSA below 2048 bits, ECDSA below P-256, HMAC below 256 bits) are computationally vulnerable to attack. A signature produced with an undersized key could be challenged by regulators as cryptographically inadequate, invalidating the compliance evidence.

## Decision

`SignatureService` adapter construction rejects keys below minimum sizes defined by NIST SP 800-131A: RSA 2048-bit minimum, ECDSA P-256 minimum, HMAC 256-bit minimum. Rejection happens at adapter construction, not at signing time.

```ts
// Rejected at construction — not at signing time
createHsmSignatureService({
  algorithm: "RSA-SHA256",
  privateKey: rsaKey1024, // Err: key size 1024 is below minimum 2048 bits
});
```

## Consequences

**Positive**:
- Prevents cryptographically inadequate signatures
- Early rejection at construction catches misconfiguration immediately
- Regulatory defensibility with NIST SP 800-131A alignment

**Negative**:
- Existing adapters with undersized keys must be upgraded
- NIST minimum key sizes may increase over time (requiring library updates)

**Trade-off accepted**: Security and regulatory defensibility require rejecting inadequate key sizes; the migration cost for existing adapters is acceptable compared to the risk of invalid compliance evidence.
