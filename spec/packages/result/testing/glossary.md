---
document_id: SPEC-RT-003
title: "Glossary"
version: "1.1.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Supporting Document
parent_spec: "spec/result/glossary.md"
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
    changes: "GxP remediation: added compensating controls (Finding 1), added GxP regulatory terms (Compensating Control, GAMP 5 Category, ICH Q9, Residual Risk, Segregation of Duties), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# Glossary

Terminology used throughout the `@hex-di/result-testing` specification. For terms related to the core library, see the [`@hex-di/result` glossary](../glossary.md).

## Assertion Helper

A function (`expectOk`, `expectErr`, `expectSome`, `expectNone`, and their async counterparts) that asserts a `Result` or `Option` is a specific variant and returns the contained value with a narrowed type. Assertion helpers throw on the wrong variant, failing the test. They are standalone functions, not Vitest matchers.

## Custom Matcher

A Vitest matcher registered via `expect.extend()`. Custom matchers in this package (`toBeOk`, `toBeErr`, `toBeSome`, `toBeNone`, etc.) extend Vitest's `expect()` chain with `Result`-aware assertions. Matchers support `.not` negation and produce structured error messages.

## setupResultMatchers

The registration function that must be called once to enable all custom matchers. Typically called in a Vitest setup file (`vitest.setup.ts`). Idempotent — safe to call multiple times.

## Matcher Context

The `this` value inside a Vitest custom matcher function. Provides utilities like `this.equals(a, b)` for deep equality comparison, `this.isNot` for detecting `.not` negation, and `this.utils` for message formatting.

## Deep Equality

Structural comparison of two values, as performed by Vitest's built-in `this.equals()`. Supports circular references, `Date`, `RegExp`, `Map`, `Set`, and custom equality testers. All matchers in this package use Vitest's deep equality rather than custom comparison logic. See [ADR T003](decisions/T003-deep-equality-strategy.md).

## Strict Equality

Reference identity comparison via `===`, as used by `Result.contains()` and `Result.containsErr()`. The `toContainOk` and `toContainErr` matchers delegate to these methods, providing strict equality semantics.

## Type Narrowing (in testing)

The compile-time effect of assertion helpers. After `const value = expectOk(result)`, TypeScript narrows the type of `value` to `T` (eliminating `E`). This enables direct use of the extracted value without additional type guards in subsequent test assertions.

## Module Augmentation

TypeScript's `declare module "vitest"` mechanism used to extend Vitest's `Assertion<T>` and `AsymmetricMatchersContaining` interfaces with the custom matcher signatures. This provides autocomplete and type checking for matchers in test files.

## Test Fixture

A pre-configured factory object returned by `createResultFixture()` or `createOptionFixture()`. Provides shorthand methods (`ok()`, `err()`, `some()`, `none()`) for creating test data with sensible defaults, reducing boilerplate in test suites.

## Deferred ResultAsync

A `ResultAsync` whose resolution is externally controlled, created by `mockResultAsync()`. The caller receives `resolve` and `reject` handles to complete the `ResultAsync` at a chosen time. Useful for testing code that depends on async Result timing.

## GxP Test Utility

A verification function (`expectFrozen`, `expectResultBrand`, `expectOptionBrand`, `expectImmutableResult`, `expectNeverRejects`) designed specifically for GxP compliance tests. These utilities assert properties required by `@hex-di/result`'s invariants: immutability, brand integrity, and promise safety.

## Tag-Based Discrimination

The approach of using the `_tag` discriminant field (`"Ok"`, `"Err"`, `"Some"`, `"None"`) to identify variants, rather than structural matching or method existence checks. All matchers in this package use tag-based discrimination. See [ADR T002](decisions/T002-tag-based-discrimination.md).

## Negation (`.not`)

Vitest's built-in matcher negation. `expect(x).not.toBeOk()` asserts that `x` is **not** `Ok`. Every custom matcher in this package provides a distinct error message for the negated case.

## Asymmetric Matcher

A Vitest matcher used in `expect.objectContaining()`, `expect.arrayContaining()`, or as an argument to `toEqual()`. The `AsymmetricMatchersContaining` augmentation enables usage like `expect.toBeOk(42)` inside asymmetric matching contexts.

## Compensating Control

An alternative measure put in place when a primary control cannot be fully implemented. In this specification, compensating controls are automated CI checks (coverage gates, type-level tests, traceability verification) that provide independent verification to offset the single-contributor segregation of duties constraint. See each document's `compensating_controls` frontmatter field.

## GAMP 5 Category

A software classification from the ISPE GAMP 5 Guide (Good Automated Manufacturing Practice, 2nd Edition) that determines the validation burden. Categories range from 1 (infrastructure software, lowest burden) through 5 (custom applications, highest burden). This package is classified as Category 5 (custom application) per the `gamp_category` frontmatter field, requiring full lifecycle specification and testing.

## ICH Q9

The International Council for Harmonisation guideline on Quality Risk Management. ICH Q9 provides a systematic framework for risk assessment, risk control, and risk review. In this specification, ICH Q9 principles guide the risk classification of behavior groups (High/Medium/Low) in the [Risk Assessment](overview.md#risk-assessment) section and justify the residual risk acceptance for the single-contributor segregation of duties constraint.

## Residual Risk

The risk remaining after compensating controls have been applied. Residual risks are documented in the [Residual Risk Summary](overview.md#residual-risk-summary) table (RR-T1 through RR-T3) with their ALCOA+ impact, compensating controls, and review cadence. Per ICH Q9, residual risk must be explicitly accepted and periodically reviewed.

## Segregation of Duties

The principle that no single individual should control all aspects of a critical process (authoring, reviewing, approving). In regulated environments, segregation prevents errors and fraud by requiring independent verification. This specification documents a single-contributor exception with compensating controls in each document's `segregation_of_duties_note` frontmatter field.
