---
document_id: SPEC-RT-ADR-T002
title: "ADR-T002: Tag-Based Discrimination"
version: "1.1.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Architecture Decision Record
parent_spec: "spec/packages/result/testing/overview.md"
approval_history:
  - role: Author
    name: hex-di
    date: 2026-02-15
  - role: Technical Reviewer
    name: hex-di
    date: 2026-02-15
  - role: QA Reviewer
    name: hex-di
    date: 2026-02-15
compensating_controls:
  - "CI pipeline enforces >95% line coverage and >90% branch coverage gates"
  - "Type-level tests (vitest typecheck) verify all public API contracts"
  - "Traceability verification script blocks PRs with orphaned specs or tests"
  - "All changes require PR merge to main with passing CI"
segregation_of_duties_note: >
  Single-contributor project. Author, Technical Reviewer, and QA Reviewer
  roles are held by the same individual. Compensating controls above
  provide automated independent verification. This constraint is accepted
  per ICH Q9 risk-based approach for a GAMP 5 testing utility library.
revision_history:
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls and segregation of duties documentation (Finding 1), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# ADR-T002: Tag-Based Discrimination

## Status

Accepted

## Context

Custom matchers need to determine whether a received value is `Ok`, `Err`, `Some`, or `None`. Two approaches are possible:

1. **Method-based** — Call `result.isOk()` / `result.isErr()` to determine the variant
2. **Tag-based** — Read the `_tag` discriminant field directly (`result._tag === "Ok"`)

Method-based checking is more abstract and decoupled from the internal structure. Tag-based checking is more direct and does not invoke any code on the received value.

## Decision

All matchers and assertion helpers use `_tag` field checking, not `isOk()` / `isErr()` / `isSome()` / `isNone()` method calls.

```ts
// In a matcher:
if (received._tag === "Ok") { ... }

// Not:
if (received.isOk()) { ... }
```

## Consequences

**Positive**:
- No method invocation on the received value — safer when the received value might be a mock, proxy, or malformed object
- Consistent with TypeScript's discriminated union narrowing pattern — `_tag` is the canonical discriminant per the `@hex-di/result` spec
- A matcher that checks `_tag` will correctly identify the variant even if methods are overridden or missing on a test double
- Slightly faster — property read vs. function call (negligible in tests, but conceptually simpler)
- The `_tag` field is a frozen, enumerable property defined in the public interface — it is part of the stable API surface

**Negative**:
- Tightly coupled to the `_tag` field name — if `@hex-di/result` ever renames the discriminant (extremely unlikely per [ADR-001](../../decisions/001-closures-over-classes.md)), all matchers would need updating
- Does not exercise the `isOk()`/`isErr()` code paths — those methods are tested separately in `@hex-di/result`'s own test suite

**Trade-off accepted**: The `_tag` discriminant is a fundamental part of the `Result` and `Option` contracts, documented in the spec and unlikely to change. Direct field access is more predictable in a testing context where the received value may not be a perfectly-formed instance.
