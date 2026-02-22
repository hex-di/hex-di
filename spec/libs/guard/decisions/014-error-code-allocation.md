# ADR-GD-014: Error codes follow ACL001-ACL030 allocation

> **Status:** Accepted
> **ADR Number:** 014 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Error handling requires programmatic discrimination between error types. String-based error type checking (matching on `error.message`) is fragile — messages change over time. The design question: how to provide stable, unique error identifiers that consumers can rely on across versions?

## Decision

Every guard error has a unique code in the `ACL001`–`ACL030` allocation. ACL001–ACL019 cover core guard errors; ACL020–ACL025 cover GxP-specific errors; ACL026–ACL030 cover async evaluation and ReBAC errors.

```ts
// Programmatic error discrimination by stable code
if (error.code === "ACL001") {
  // AccessDeniedError — policy evaluation returned Deny
} else if (error.code === "ACL013") {
  // ScopeExpiredError — maxScopeLifetimeMs exceeded
}
```

## Consequences

**Positive**:
- Stable programmatic error discrimination across library versions
- Documentation cross-referencing by code
- Consistent with hex-di error code convention

**Negative**:
- Code allocation requires coordination to avoid collisions with other hex-di packages
- The allocation range must be documented and maintained

**Trade-off accepted**: The coordination overhead is acceptable for stable, unique error identifiers that enable reliable error handling without string matching.
