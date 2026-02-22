# ADR-GD-004: Deny-overrides conflict resolution

> **Status:** Accepted
> **ADR Number:** 004 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

When multiple policies apply to the same operation, they may conflict. Three conflict resolution strategies exist: permit-overrides (any Allow wins), deny-overrides (any Deny wins), and first-applicable. The design question: which default maximizes security while remaining predictable?

## Decision

Deny-overrides is the default. If any applicable policy denies, the final decision is `Deny`. Matches AWS IAM and XACML semantics.

```ts
// allOf: all must allow — a single Deny → final Deny
const policy: AllOfPolicy = {
  kind: "allOf",
  policies: [
    { kind: "hasPermission", permission: Permissions.document.read },
    { kind: "hasRole", role: "active-user" },
  ],
};
```

## Consequences

**Positive**:
- Most secure default (fail-closed)
- Matches industry standards (AWS IAM, XACML, OPA)
- Deny origin is traceable in the evaluation trace

**Negative**:
- Harder to grant exceptions — a single `Deny` blocks access even when many policies allow
- Policy authors must structure exception grants carefully

**Trade-off accepted**: Security-first is the correct default; policy authors who need exception grants can structure them explicitly using `anyOf`.
