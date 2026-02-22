---
document_id: SPEC-RT-ADR-T003
title: "ADR-T003: Deep Equality Strategy"
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

# ADR-T003: Deep Equality Strategy

## Status

Accepted (supersedes v0.1.x behavior)

## Context

The `toBeOk(expected)` and `toBeErr(expected)` matchers need to compare the contained value/error against an expected value. The v0.1.x implementation uses a custom `isDeepEqual` function based on `JSON.stringify`:

```ts
// v0.1.x — custom deep equality
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
```

This approach has significant limitations:
- Fails on circular references (falls back to `false` instead of comparing)
- Treats `undefined` properties as missing (JSON omits `undefined`)
- Cannot compare `Date`, `RegExp`, `Map`, `Set`, or other non-plain objects correctly
- Does not respect custom equality testers registered via `expect.addEqualityTesters()`
- Behavior differs from Vitest's own `toEqual`, creating surprising inconsistencies

Vitest's matcher context provides `this.equals(a, b)` — the same deep equality engine used by `toEqual`, `toContain`, and other built-in matchers.

## Decision

Replace the custom `JSON.stringify`-based deep equality with Vitest's built-in `this.equals()` from the matcher context.

```ts
// v1.0.0 — Vitest built-in equality
toBeOk(received: Result<unknown, unknown>, expected?: unknown) {
  const pass =
    received._tag === "Ok" &&
    (expected === undefined || this.equals(received.value, expected));
  // ...
}
```

## Consequences

**Positive**:
- Consistent with Vitest's native `toEqual` — no behavioral surprises
- Handles circular references, `Date`, `RegExp`, `Map`, `Set`, typed arrays, and other built-in types correctly
- Respects custom equality testers registered via `expect.addEqualityTesters()`
- Simpler implementation — no custom comparison code to maintain or test
- Error messages can leverage Vitest's diff utilities for better output

**Negative**:
- Requires access to `this` inside the matcher function — matchers must be declared as regular functions (not arrow functions) to receive the matcher context
- Slight behavioral change from v0.1.x for edge cases (e.g., objects with `undefined` properties, `Date` instances) — this is considered a bug fix, not a breaking change

**Migration**: The change is backward-compatible for the vast majority of cases. The only values that compare differently are those that `JSON.stringify` handles incorrectly (circular refs, special types). These are bug fixes.
