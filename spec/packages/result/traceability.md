# Traceability Matrix

Forward and backward traceability from requirements to source modules, test files, and invariants.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CORE-TRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- traceability.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- traceability.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- traceability.md` |
| Status | Effective |

> This document factors out the traceability matrix content from [compliance/gxp.md](compliance/gxp.md#requirement-traceability-matrix) into a standalone document for structural parity with the `result-react` specification suite. The canonical requirement identification convention, traceability tables, and coverage targets are maintained here. The inline content in `compliance/gxp.md` remains with callout links to this document.

## Traceability Overview

```
Behavior Spec (FS)  →  Source Module  →  Test File (Verification)
       ↑                    ↑                      ↑
   Invariant  ←──── Risk Assessment (INV-N) ────→  Test Coverage Target
       ↑                                           ↑
    ADR  ──────────────────────────────────────→ Affected Specs
```

## Requirement Identification Convention

Every testable requirement in the behavior specifications uses a formal identifier to enable granular traceability from individual requirements to individual test cases. See [requirement-id-scheme.md](process/requirement-id-scheme.md) for the full identifier format specification.

### ID Scheme

```
BEH-XX-NNN
```

| Component | Meaning | Example |
|-----------|---------|---------|
| `BEH` | Behavior specification requirement (prefix) | — |
| `XX` | Two-digit behavior spec number (01–14) | `03` = transformation |
| `NNN` | Sequential requirement number within that spec, starting at 001 | `007` = seventh requirement |

Example: `BEH-03-007` is the 7th testable requirement in `behaviors/03-transformation.md`.

Audit trail requirements use the `ATR-N` scheme (see [gxp.md Normative Requirements](compliance/gxp.md#normative-requirements)). Data retention requirements use the `DRR-N` scheme (see [gxp.md Data Retention Guidance](compliance/gxp.md#data-retention-guidance)).

## Capability-Level Traceability

| # | Capability | Behavior Spec | Source Module(s) | Risk Level | Subpath |
|---|-----------|--------------|-----------------|------------|---------|
| 1 | Types and Guards | [BEH-01](behaviors/01-types-and-guards.md) | `core/result.ts`, `core/brand.ts`, `core/guards.ts` | INV-1 **High**, INV-3 **High** | `@hex-di/result` |
| 2 | Creation | [BEH-02](behaviors/02-creation.md) | `core/result.ts` | INV-1 **High** | `@hex-di/result` |
| 3 | Transformation | [BEH-03](behaviors/03-transformation.md) | `core/result.ts`, `async/result-async.ts` | INV-5 **High** | `@hex-di/result` |
| 4 | Extraction | [BEH-04](behaviors/04-extraction.md) | `core/result.ts` | INV-1 **High** | `@hex-di/result` |
| 5 | Composition | [BEH-05](behaviors/05-composition.md) | `core/result.ts`, `async/result-async.ts` | INV-1 **High** | `@hex-di/result` |
| 6 | Async | [BEH-06](behaviors/06-async.md) | `async/result-async.ts` | INV-2 Medium, INV-9 Medium | `@hex-di/result` |
| 7 | Generators | [BEH-07](behaviors/07-generators.md) | `generators/safe-try.ts` | INV-4 Medium | `@hex-di/result` |
| 8 | Error Patterns | [BEH-08](behaviors/08-error-patterns.md) | `errors/create-error.ts` | INV-7 **High** | `@hex-di/result` |
| 9 | Option | [BEH-09](behaviors/09-option.md) | `option/option.ts`, `option/guards.ts` | INV-10 **High**, INV-11 **High** | `@hex-di/result` |
| 10 | Standalone Functions | [BEH-10](behaviors/10-standalone-functions.md) | `fn/*.ts` | INV-14 Medium | `@hex-di/result/fn` |
| 11 | Unsafe | [BEH-11](behaviors/11-unsafe.md) | `unsafe/unwrap.ts`, `unsafe/unwrap-error.ts` | INV-12 Medium | `@hex-di/result/unsafe` |
| 12 | Do Notation | [BEH-12](behaviors/12-do-notation.md) | `do/do.ts` | — | `@hex-di/result` |
| 13 | Interop | [BEH-13](behaviors/13-interop.md) | `interop/from-json.ts`, `interop/to-schema.ts` | — | `@hex-di/result` |
| 14 | Benchmarks | [BEH-14](behaviors/14-benchmarks.md) | `bench/*.bench.ts` | — | N/A (test-only) |

## Requirement-Level Traceability

### Behavior Spec → Requirement ID Ranges

| Behavior Spec | File | ID Range | Count | Domain |
|---------------|------|----------|:-----:|--------|
| 01 — Types and Guards | `behaviors/01-types-and-guards.md` | BEH-01-001 – BEH-01-011 | 11 | Core type definitions, brand symbols, type guards |
| 02 — Creation | `behaviors/02-creation.md` | BEH-02-001 – BEH-02-007 | 7 | Factory functions (`ok`, `err`, `fromThrowable`, etc.) |
| 03 — Transformation | `behaviors/03-transformation.md` | BEH-03-001 – BEH-03-021 | 21 | `map`, `mapErr`, `mapBoth`, `flatten`, `flip` |
| 04 — Extraction | `behaviors/04-extraction.md` | BEH-04-001 – BEH-04-011 | 11 | `match`, `unwrapOr`, `toNullable`, `toJSON`, etc. |
| 05 — Composition | `behaviors/05-composition.md` | BEH-05-001 – BEH-05-008 | 8 | `all`, `allSettled`, `any`, `collect`, `partition`, etc. |
| 06 — Async | `behaviors/06-async.md` | BEH-06-001 – BEH-06-011 | 11 | `ResultAsync` class and async operations |
| 07 — Generators | `behaviors/07-generators.md` | BEH-07-001 – BEH-07-005 | 5 | `safeTry` generator-based early return |
| 08 — Error Patterns | `behaviors/08-error-patterns.md` | BEH-08-001 – BEH-08-004 | 4 | `createError`, `createErrorGroup`, `assertNever` |
| 09 — Option | `behaviors/09-option.md` | BEH-09-001 – BEH-09-010 | 10 | `Option<T>`, `some`, `none`, `isOption`, `toJSON`, `fromOptionJSON` |
| 10 — Standalone Functions | `behaviors/10-standalone-functions.md` | BEH-10-001 – BEH-10-004 | 4 | Curried pipe-style functions in `fn/*` |
| 11 — Unsafe | `behaviors/11-unsafe.md` | BEH-11-001 – BEH-11-005 | 5 | `unwrap`, `unwrapErr`, `UnwrapError` |
| 12 — Do Notation | `behaviors/12-do-notation.md` | BEH-12-001 – BEH-12-008 | 8 | `Do`, `bind`, `let_` |
| 13 — Interop | `behaviors/13-interop.md` | BEH-13-001 – BEH-13-006 | 6 | `fromJSON`, `toSchema`, Standard Schema, Option serialization interop |
| 14 — Benchmarks | `behaviors/14-benchmarks.md` | BEH-14-001 – BEH-14-008 | 8 | Performance targets and thresholds |

**Total**: 119 testable requirements across 14 behavior specifications.

### Additional Requirement Types

| Prefix | ID Range | Count | Domain |
|--------|----------|:-----:|--------|
| ATR | ATR-1 – ATR-3 | 3 | Audit trail requirements |
| DRR | DRR-1 – DRR-5 | 5 | Data retention requirements |
| RR | RR-1 – RR-7 | 7 | Residual risks |

## Invariant Traceability

| Invariant | Description | ICH Q9 Risk | Unit Tests | Type Tests | Mutation Tests | Cucumber Scenarios | GxP Integrity Tests |
|-----------|-------------|:-----------:|:----------:|:----------:|:--------------:|:------------------:|:-------------------:|
| INV-1 | Frozen Result Instances | **High** | `core/result.test.ts` | N/A | Stryker | `immutability.feature` | `gxp/freeze.test.ts` |
| INV-2 | Internal Promise Never Rejects | **Medium** | `async/result-async.test.ts` | N/A | Stryker | `async-safety.feature` | `gxp/promise-safety.test.ts` |
| INV-3 | Brand Symbol Prevents Forgery | **High** | `core/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/tamper-evidence.test.ts` |
| INV-4 | Err Generator Throws on Continuation | **Medium** | `generators/safe-try.test.ts` | N/A | Stryker | `generators.feature` | `gxp/generator-safety.test.ts` |
| INV-5 | Error Suppression in Tee | **High** | `core/result.test.ts` | N/A | Stryker | `side-effects.feature` | `gxp/error-suppression.test.ts` |
| INV-6 | Phantom Types Enable Free Composition | **Low** | N/A | `types.test-d.ts` | N/A | N/A | N/A |
| INV-7 | createError Output Is Frozen | **High** | `errors/create-error.test.ts` | N/A | Stryker | `error-patterns.feature` | `gxp/error-freeze.test.ts` |
| INV-8 | Lazy ResultAsync Registration | **Low** | `async/result-async.test.ts` | N/A | Stryker | N/A | N/A |
| INV-9 | ResultAsync Brand Identity | **Medium** | `core/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/async-tamper.test.ts` |
| INV-10 | Frozen Option Instances | **High** | `option/option.test.ts` | N/A | Stryker | `option.feature` | `gxp/option-freeze.test.ts` |
| INV-11 | Option Brand Prevents Forgery | **High** | `option/guards.test.ts` | `guards.test-d.ts` | Stryker | `brand-validation.feature` | `gxp/option-tamper.test.ts` |
| INV-12 | UnwrapError Contains Context | **Medium** | `unsafe/unwrap.test.ts` | `unwrap.test-d.ts` | Stryker | `unsafe.feature` | N/A |
| INV-13 | Subpath Blocking | **Low** | `exports.test.ts` | N/A | N/A | `subpath-exports.feature` | N/A |
| INV-14 | Standalone Functions Delegate | **Medium** | `fn/*.test.ts` | `fn/*.test-d.ts` | Stryker | `standalone-functions.feature` | `gxp/delegation.test.ts` |

## ADR Traceability

### Forward Traceability: ADR → Invariants → Behaviors

| ADR | Invariants Affected | Behavior Specs Affected |
|-----|--------------------|-----------------------|
| ADR-001 (Closures) | INV-1, INV-14 | 01, 03, 04, 10 |
| ADR-002 (Brand) | INV-3 | 01 |
| ADR-003 (Phantom) | INV-6 | 01 |
| ADR-004 (Freeze) | INV-1, INV-7, INV-10 | 01, 08, 09 |
| ADR-005 (Lazy Async) | INV-8 | 06 |
| ADR-006 (Tee Swallowing) | INV-5 | 03, 06 |
| ADR-007 (Dual API) | INV-14 | 10 |
| ADR-008 (Async Brand) | INV-9 | 01, 06 |
| ADR-009 (Option) | INV-10, INV-11 | 09 |
| ADR-010 (Unsafe) | INV-12 | 04, 11 |
| ADR-011 (Subpath) | INV-13 | All (export structure) |
| ADR-012 (Do Notation) | None (syntactic sugar over existing `andThen`; no new runtime guarantee introduced) | 12 |
| ADR-013 (Performance) | None (optimization strategy; no new runtime guarantee introduced) | 14 |

## Test File Map

### Backward Traceability: Test File → Spec

| Test File Pattern | Spec Coverage | Test Level |
|-------------------|---------------|------------|
| `*.test.ts` | Runtime behavior | Unit (Vitest) |
| `*.test-d.ts` | Type inference | Type (Vitest typecheck) |
| `*.feature` | Acceptance criteria | BDD (Cucumber) |
| `gxp/*.test.ts` | Invariant integrity | GxP Integrity |
| `bench/*.bench.ts` | Performance targets | Performance (Vitest bench) |
| Stryker | Code coverage gaps | Mutation |

### Source Module → Test File Mapping

| Source Module | Unit Test | Type Test | GxP Test | Feature File |
|--------------|-----------|-----------|----------|--------------|
| `core/result.ts` | `core/result.test.ts` | `types.test-d.ts` | `gxp/freeze.test.ts`, `gxp/error-suppression.test.ts` | `immutability.feature`, `side-effects.feature` |
| `core/brand.ts` | `core/guards.test.ts` | `guards.test-d.ts` | `gxp/tamper-evidence.test.ts` | `brand-validation.feature` |
| `core/guards.ts` | `core/guards.test.ts` | `guards.test-d.ts` | `gxp/tamper-evidence.test.ts` | `brand-validation.feature` |
| `async/result-async.ts` | `async/result-async.test.ts` | N/A | `gxp/promise-safety.test.ts`, `gxp/async-tamper.test.ts` | `async-safety.feature` |
| `generators/safe-try.ts` | `generators/safe-try.test.ts` | N/A | `gxp/generator-safety.test.ts` | `generators.feature` |
| `errors/create-error.ts` | `errors/create-error.test.ts` | N/A | `gxp/error-freeze.test.ts` | `error-patterns.feature` |
| `option/option.ts` | `option/option.test.ts` | N/A | `gxp/option-freeze.test.ts` | `option.feature` |
| `option/guards.ts` | `option/guards.test.ts` | `guards.test-d.ts` | `gxp/option-tamper.test.ts` | `brand-validation.feature` |
| `fn/*.ts` | `fn/*.test.ts` | `fn/*.test-d.ts` | `gxp/delegation.test.ts` | `standalone-functions.feature` |
| `unsafe/unwrap.ts` | `unsafe/unwrap.test.ts` | `unwrap.test-d.ts` | N/A | `unsafe.feature` |
| `do/do.ts` | `do/do.test.ts` | `do/do.test-d.ts` | N/A | `do-notation.feature` |
| `interop/from-json.ts` | `interop/from-json.test.ts` | N/A | N/A | `interop.feature` |

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|------------------|
| Requirement-level forward traceability | 100% of BEH-XX-NNN IDs have at least one test | GAMP 5 S.D.4 |
| Requirement-level backward traceability | 100% of test cases trace to a BEH-XX-NNN or INV-N ID | GAMP 5 S.D.4 |
| Invariant forward traceability | 100% of invariants have tests | GAMP 5 |
| Unit test line coverage | > 95% | FDA Software Validation |
| Mutation score | > 90% break threshold | GAMP 5 (risk-proportionate) |
| Cucumber scenario coverage | 100% of behavior specs have scenarios | BDD acceptance |
| GxP integrity test coverage | 100% of INV-1, 3, 5, 7, 9, 10, 11 | Data integrity focus |
| Orphaned requirements | 0 BEH-XX-NNN IDs without tests | GAMP 5 |
| Orphaned tests | 0 tests without a BEH-XX-NNN or INV-N reference | GAMP 5 |

### ATR-N / DRR-N Traceability Verification

| Requirement | Verification Mechanism | Traceability Script Check |
|-------------|----------------------|--------------------------|
| ATR-1 | CI job 9 (grep-based blocking check) | Script confirms `ATR-1` is referenced in CI workflow and in `gxp/error-suppression.test.ts` |
| ATR-2 | PR review checklist + `gxp/error-suppression.test.ts` | Script confirms `ATR-2` is referenced in test files |
| ATR-3 | PR review checklist | Script confirms `ATR-3` is referenced in compliance document with verification guidance |
| DRR-1 | Consumer-side (storage procedure) | Script confirms `DRR-1` is referenced in compliance document with verification guidance |
| DRR-2 | `from-json-compat.test.ts` regression test (CI job 3) | Script confirms `DRR-2` is referenced in test files |
| DRR-3 | Consumer-side (serialization boundary) | Script confirms `DRR-3` is referenced in compliance document with verification guidance |
| DRR-4 | `from-json-compat.test.ts` (Option fixtures) + native `option/option.test.ts` | Script confirms `DRR-4` is referenced in test files and compliance document |
| DRR-5 | Consumer-side (periodic readability verification) | Script confirms `DRR-5` is referenced in compliance document with verification guidance |

**Automated measurement**: The targets above are verified automatically by [`scripts/verify-traceability.sh`](scripts/verify-traceability.sh), which runs as CI job 8 (see [ci-maintenance.md](process/ci-maintenance.md#8-traceability-verification)). The script parses BEH-XX-NNN, INV-N, ATR-N, and DRR-N IDs from spec and test files, computes forward/backward traceability percentages, and exits with code 1 if any target is not met.

**Static traceability report**: A human-auditable traceability report is generated at each tagged release and committed to the repository as `docs/traceability-report-vX.Y.Z.md`. See [ci-maintenance.md Release Traceability Artifact](process/ci-maintenance.md#release-traceability-artifact) for details.

## Specification Hierarchy Mapping

| GAMP 5 V-Model Level | Abbreviation | Library Document(s) | Content |
|----------------------|:------------:|----------------------|---------|
| User Requirements Specification | URS | [overview.md](overview.md) | Library purpose, design philosophy, target consumers, high-level feature list |
| Functional Specification | FS | [behaviors/01–14](behaviors/) | 14 behavior specifications defining all public API contracts (119 testable requirements) |
| Design Specification | DS | [decisions/001–013](decisions/), [invariants.md](invariants.md) | 13 Architecture Decision Records documenting design rationale; 14 runtime invariants |
| Configuration Specification | CS | N/A (Category 3 — no configuration) | The library has no configurable parameters |
