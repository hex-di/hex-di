# ADR-GD-024: Re-authentication is a method on SignatureService (not a separate port)

> **Status:** Accepted
> **ADR Number:** 024 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

21 CFR 11.200(a)(1) requires two-component identification for electronic signatures. Re-authentication could be a separate port (e.g., `ReauthenticationPort`) or a method on the existing `SignatureServicePort`. Splitting into two ports would scatter a single cohesive workflow across two interfaces.

## Decision

`SignatureServicePort` includes a `reauthenticate()` method alongside `capture()` and `validate()`. The complete signature workflow (capture, validate, reauthenticate) is one cohesive port contract.

```ts
interface SignatureServicePort {
  capture(payload: SignaturePayload, context: SignatureContext): Promise<Result<CapturedSignature, SignatureError>>;
  validate(signature: CapturedSignature): Promise<Result<ValidatedSignature, SignatureError>>;
  reauthenticate(token: ReauthenticationToken): Promise<Result<void, SignatureError>>;
}
```

## Consequences

**Positive**:
- Cohesive signature contract — one port to implement
- Two-component identification (11.100) is documented on `reauthenticate()`
- No port fragmentation

**Negative**:
- The signature port has a broader scope than pure signing
- Implementations must provide `reauthenticate()` even if they don't need it

**Trade-off accepted**: A single cohesive port for the signature workflow is simpler than splitting across multiple ports with no architectural benefit from the split.
