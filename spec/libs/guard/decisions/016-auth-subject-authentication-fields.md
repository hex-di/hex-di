# ADR-GD-016: AuthSubject requires authenticationMethod and authenticatedAt fields

> **Status:** Accepted
> **ADR Number:** 016 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Audit entries must attribute authorization decisions to specific identities and their authentication methods. Without authentication provenance, it is impossible to determine how a subject was authenticated at the time of an authorization decision — a critical gap for GxP compliance and security investigations.

## Decision

`AuthSubject` has required fields `authenticationMethod: string` (how authentication occurred: "oauth2", "api-key", "saml", etc.) and `authenticatedAt: string` (ISO 8601 timestamp of authentication).

```ts
interface AuthSubject {
  id: string;
  authenticationMethod: string; // "oauth2" | "api-key" | "saml" | ...
  authenticatedAt: string;       // ISO 8601: "2024-01-15T10:30:00.000Z"
  roles: Role[];
  attributes: Record<string, unknown>;
}
```

## Consequences

**Positive**:
- Every authorization decision is attributable to a specific authentication event
- Supports GxP subject staleness checks (`authenticatedAt` + window)
- Complete audit records per ALCOA+ Attributable principle

**Negative**:
- Subjects from existing systems must be adapted to include these fields
- Some authentication systems may not provide an `authenticatedAt` timestamp natively

**Trade-off accepted**: The compliance requirement for authentication provenance justifies the required fields; adapter code to populate them is a one-time cost.
