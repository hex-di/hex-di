# ADR-GD-039: Maximum ReauthenticationToken lifetime for GxP environments

> **Status:** Accepted
> **ADR Number:** 039 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

`ReauthenticationToken` is issued when a signer re-authenticates before capturing an electronic signature. Without a maximum lifetime, a signer could re-authenticate once and then use the token to apply signatures hours or days later — violating the "continuous session" intent of 21 CFR 11.200(a)(1).

## Decision

Maximum `ReauthenticationToken` lifetime is 15 minutes for GxP environments. The recommended default is 5 minutes. The maximum is enforced at token validation time — tokens older than 15 minutes are rejected with `SignatureError`.

```ts
// Token lifetime configuration
createGuardGraph({
  signatureService: hsmSignatureService,
  gxp: true,
  maxReauthTokenLifetimeMs: 5 * 60 * 1000, // 5 min recommended default
  // Hard ceiling: 15 minutes — tokens older than this are always rejected
});
```

## Consequences

**Positive**:
- Limits signature reuse window
- Aligns with the "continuous session" intent of 21 CFR 11.200(a)(1)
- Configurable for complex multi-step signing workflows within the 15-minute ceiling

**Negative**:
- Short token lifetime may interrupt complex signing workflows that require multiple steps
- Users must re-authenticate more frequently in high-activity periods

**Trade-off accepted**: Compliance with the continuous session intent outweighs usability inconvenience; 15 minutes is a reasonable ceiling that accommodates realistic multi-step workflows.
