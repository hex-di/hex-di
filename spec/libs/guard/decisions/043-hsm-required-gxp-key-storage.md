# ADR-GD-043: HSM/keystore/secrets manager REQUIRED (not RECOMMENDED) for GxP key storage

> **Status:** Accepted
> **ADR Number:** 043 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Signing key exposure (FM-07 in the FMEA) was the highest post-mitigation risk when HSM was only RECOMMENDED. A stolen signing key enables an attacker to forge electronic signatures retroactively, undermining the entire compliance evidence chain. Elevating to REQUIRED eliminates the last Medium-risk failure mode.

## Decision

HSM (Hardware Security Module), enterprise keystore, or cloud secrets manager is REQUIRED when `gxp: true`. Non-GxP environments retain RECOMMENDED status. The library rejects software-only key storage configurations in GxP mode.

```ts
// GxP mode: HSM/keystore required
createGuardGraph({
  gxp: true,
  signatureService: createSignatureService({
    keyStorage: new HsmKeyStorage({ hsmClient }), // required
    // new SoftwareKeyStorage() → ConfigurationError in gxp mode
  }),
});
```

## Consequences

**Positive**:
- FM-07 mitigated RPN reduced from 10 to 5 (last Medium-risk failure mode eliminated)
- HSM provides automatic tamper detection
- Improved overall risk profile

**Negative**:
- HSM/keystore infrastructure adds cost and complexity to GxP deployments
- May require procurement for new adopters

**Trade-off accepted**: Eliminating the last Medium-risk failure mode in the FMEA justifies the infrastructure requirement; the cost is a necessary consequence of GxP compliance for signing keys.
