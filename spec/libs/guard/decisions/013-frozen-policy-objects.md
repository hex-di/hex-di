# ADR-GD-013: All policy objects are frozen (Object.freeze)

> **Status:** Accepted
> **ADR Number:** 013 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Policy objects are defined once and used many times throughout the application lifecycle. If a policy could be mutated after construction, a single accidental mutation could corrupt authorization logic globally — affecting all subsequent evaluations that use that policy.

## Decision

All policy objects are frozen via `Object.freeze()` at construction time in the factory functions (`allOf()`, `anyOf()`, `hasPermission()`, etc.).

```ts
const policy = hasPermission(Permissions.document.read);
// Object.freeze applied at construction time
policy.kind = "hasRole"; // TypeError in strict mode — cannot mutate
```

## Consequences

**Positive**:
- Referential stability for React memoization (frozen objects satisfy `===` equality across renders)
- No accidental mutations after construction
- Policies can be safely shared across components and closures

**Negative**:
- Frozen objects cannot be modified
- Any change requires creating new policy objects rather than mutating existing ones

**Trade-off accepted**: The safety guarantees of immutability are essential for a security-critical system; the React memoization benefit is a bonus.
