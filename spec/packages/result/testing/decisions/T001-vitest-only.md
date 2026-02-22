---
document_id: SPEC-RT-ADR-T001
title: "ADR-T001: Vitest Only"
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

# ADR-T001: Vitest Only

## Status

Accepted

## Context

`@hex-di/result-testing` needs to provide custom matchers for a test framework. The candidates are:

1. **Vitest only** — Provide matchers exclusively for Vitest via `expect.extend()`
2. **Jest + Vitest** — Support both frameworks with a shared core and framework-specific adapters
3. **Framework-agnostic** — Provide assertion helpers only (no custom matchers), usable with any framework
4. **Multi-framework** — Support Vitest, Jest, Mocha/Chai, and others

The `@hex-di/result` monorepo uses Vitest as its sole test runner. The broader ecosystem is converging on Vitest for new TypeScript projects. Jest has a large installed base but a different matcher registration API (`expect.extend` is similar but not identical in type augmentation patterns).

## Decision

Provide custom matchers exclusively for Vitest. The package declares `vitest >= 4.0.0` as a peer dependency.

Framework-agnostic assertion helpers (`expectOk`, `expectErr`, etc.) are provided as standalone functions that use Vitest's `expect()` internally but could work in any environment where `expect().toBe()` is available. However, the custom matchers (`toBeOk`, `toBeErr`, etc.) and the type augmentation (`declare module "vitest"`) are Vitest-specific.

## Consequences

**Positive**:
- Single target framework simplifies implementation, testing, and maintenance
- Vitest's `expect.extend()` API provides `this.equals()` for deep equality, `this.isNot` for negation detection, and `this.utils` for formatting — all used directly
- Type augmentation via `declare module "vitest"` is straightforward and well-supported
- No abstraction layer needed between matcher logic and framework API
- Vitest's `CustomMatcher` interface provides type-safe matcher authoring
- Aligns with the monorepo's existing toolchain

**Negative**:
- Jest users cannot use custom matchers (they can still use assertion helpers)
- Mocha/Chai users are not supported
- If a future `@hex-di/result` consumer uses Jest, they would need a separate `@hex-di/result-testing-jest` package (or submit a PR)

**Trade-off accepted**: The Vitest-only approach avoids the maintenance burden of multi-framework support. The assertion helpers (`expectOk`, etc.) cover the most important use case (type narrowing) and are minimally coupled to Vitest. If Jest support is later needed, it can be added as a separate package without breaking the existing API.
