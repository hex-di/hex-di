---
document_id: SPEC-RT-002
title: "Invariants"
version: "1.1.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Design Specification
parent_spec: "spec/result/invariants.md"
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

# Invariants

Runtime guarantees and contracts enforced by the `@hex-di/result-testing` implementation.

## TINV-1: Tag-Based Discrimination

All matchers and assertion helpers use the `_tag` discriminant field (`"Ok"`, `"Err"`, `"Some"`, `"None"`) to determine the variant. No matcher performs structural matching (e.g., checking for the presence of a `value` or `error` property).

**Source**: `matchers.ts` — every matcher checks `received._tag`. `assertion-helpers.ts` — every assertion checks `._tag`.

**Implication**: Matchers behave consistently with `@hex-di/result`'s discriminated union design. Objects that structurally resemble a `Result` but have an incorrect or missing `_tag` will fail all matchers.

See [ADR T002](decisions/T002-tag-based-discrimination.md).

## TINV-2: Error Messages Include Actual Value

When an assertion helper (`expectOk`, `expectErr`, `expectSome`, `expectNone`) fails, the error message includes a serialized representation of the actual contained value or error. This enables fast debugging without requiring the developer to add manual logging.

**Source**: `assertion-helpers.ts` — error messages include `JSON.stringify(result.error)`, `JSON.stringify(result.value)`, `JSON.stringify(option.value)` as appropriate, with `String()` fallback for non-serializable values.

**Implication**: Test failure output is self-describing. Developers can diagnose the mismatch from the error message alone.

## TINV-3: Idempotent Setup

`setupResultMatchers()` can be called multiple times without adverse effects. Each call overwrites the matchers with the same implementation. No state accumulates across calls.

**Source**: `matchers.ts` — `setupResultMatchers()` calls `expect.extend(...)` with a static object. `expect.extend` replaces existing matchers of the same name.

**Implication**: Safe to call in both a global setup file and in individual test files. No "double registration" errors or behavioral changes.

## TINV-4: Vitest Built-in Equality

All deep equality comparisons in matchers use Vitest's built-in `this.equals()` utility from the matcher context, not a custom JSON-based comparison. This ensures consistency with Vitest's own `toEqual` semantics, including support for:

- Circular references
- `undefined` vs missing properties
- `Date`, `RegExp`, `Map`, `Set`, and other built-in types
- Custom equality testers registered via `expect.addEqualityTesters()`

**Source**: `matchers.ts` — matchers access `this.equals(a, b)` inside the matcher function body.

**Implication**: The `toBeOk(expected)` matcher produces the same equality result as `expect(value).toEqual(expected)`. No surprising differences between matcher deep equality and Vitest's native deep equality.

See [ADR T003](decisions/T003-deep-equality-strategy.md).

## TINV-5: Public API Only

The `@hex-di/result-testing` package depends only on the public API of `@hex-di/result`. It does not import from internal modules, private symbols, or undocumented paths.

**Source**: All imports from `@hex-di/result` use the package entry point (`@hex-di/result`) or documented subpath exports (`@hex-di/result/option`, etc.).

**Implication**: The testing package is resilient to internal refactoring of `@hex-di/result`. A change to internal module structure does not break the testing package, as long as the public API is preserved. The testing package serves as a consumer-perspective validation of the public API surface.
