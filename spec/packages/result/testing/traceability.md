---
document_id: SPEC-RT-TRACE-001
title: "Traceability Matrix"
version: "1.3.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Traceability Matrix
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
  - version: "1.3.0"
    date: 2026-02-15T14:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: replaced out-of-scope justification prose with structured table including parent test file paths for auditor cross-reference (Finding 6)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: formalized INV-9 disposition (Finding 5), clarified mockResultAsync traceability entry (Finding 1), corrected coverage metric counts"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls (Finding 1), Forward Traceability to Test Cases section mapping all 26 BEH-T behaviors to test files (Finding 3), version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# Traceability Matrix

Forward and backward traceability between `@hex-di/result-testing` behaviors and the parent library's invariants, behaviors, and public API surface.

## 1. GxP Test Utilities → Parent Invariants

Direct mapping of GxP test utilities (BEH-T04) to the `@hex-di/result` invariants they verify.

| Test Utility ID | Test Utility | Implementation File | Parent Invariant | Parent Invariant Description |
| --------------- | ------------ | ------------------- | ---------------- | ---------------------------- |
| BEH-T04-001 | `expectFrozen` | `src/gxp.ts` | [INV-1](../invariants.md#inv-1-frozen-result-instances) | Frozen Result instances |
| BEH-T04-001 | `expectFrozen` | `src/gxp.ts` | [INV-7](../invariants.md#inv-7-createerror-output-is-frozen) | createError output is frozen |
| BEH-T04-001 | `expectFrozen` | `src/gxp.ts` | [INV-10](../invariants.md#inv-10-frozen-option-instances) | Frozen Option instances |
| BEH-T04-002 | `expectResultBrand` | `src/gxp.ts` | [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery) | Brand symbol prevents forgery (Result) |
| BEH-T04-003 | `expectOptionBrand` | `src/gxp.ts` | [INV-11](../invariants.md#inv-11-option-brand-prevents-forgery) | Option brand prevents forgery |
| BEH-T04-004 | `expectImmutableResult` | `src/gxp.ts` | [INV-1](../invariants.md#inv-1-frozen-result-instances) | Frozen Result instances |
| BEH-T04-004 | `expectImmutableResult` | `src/gxp.ts` | [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery) | Brand symbol prevents forgery (Result) |
| BEH-T04-005 | `expectNeverRejects` | `src/gxp.ts` | [INV-2](../invariants.md#inv-2-internal-promise-never-rejects) | Internal promise never rejects |

## 2. Testing Invariants → Parent Invariants

Mapping of `@hex-di/result-testing` invariants (TINV) to the parent library concepts they depend on.

| Testing Invariant | Description | Parent Dependency |
| ----------------- | ----------- | ----------------- |
| TINV-1 | Tag-based discrimination | Depends on `@hex-di/result` using `_tag` discriminant (`"Ok"`, `"Err"`, `"Some"`, `"None"`) |
| TINV-2 | Error messages include actual value | Accesses `result.value`, `result.error`, `option.value` from public API |
| TINV-3 | Idempotent setup | No parent dependency (Vitest-only concern) |
| TINV-4 | Vitest built-in equality | No parent dependency (Vitest-only concern) |
| TINV-5 | Public API only | Constrains all imports to `@hex-di/result` public entry points |

## 3. Assertion Helpers → Parent API Surface

Mapping of assertion helpers (BEH-T01) to the `@hex-di/result` public API they exercise.

| Behavior ID | Assertion Helper | Implementation File | Parent Types Used | Parent API Accessed |
| ----------- | ---------------- | ------------------- | ----------------- | ------------------- |
| BEH-T01-001 | `expectOk(result)` | `src/assertion-helpers.ts` | `Result<T, E>` | `result._tag`, `result.value` |
| BEH-T01-002 | `expectErr(result)` | `src/assertion-helpers.ts` | `Result<T, E>` | `result._tag`, `result.error` |
| BEH-T01-003 | `expectOkAsync(resultAsync)` | `src/assertion-helpers.ts` | `ResultAsync<T, E>` | `await resultAsync`, delegates to `expectOk` |
| BEH-T01-004 | `expectErrAsync(resultAsync)` | `src/assertion-helpers.ts` | `ResultAsync<T, E>` | `await resultAsync`, delegates to `expectErr` |
| BEH-T01-005 | `expectSome(option)` | `src/assertion-helpers.ts` | `Option<T>` | `option._tag`, `option.value` |
| BEH-T01-006 | `expectNone(option)` | `src/assertion-helpers.ts` | `Option<T>` | `option._tag` |

## 4. Vitest Matchers → Parent API Surface

Mapping of custom matchers (BEH-T02) to the `@hex-di/result` public API they exercise.

| Behavior ID | Matcher | Implementation File | Parent Types Used | Parent API Accessed |
| ----------- | ------- | ------------------- | ----------------- | ------------------- |
| BEH-T02-001 | `setupResultMatchers()` | `src/matchers.ts` | — | Registration only, no parent API |
| BEH-T02-002 | `toBeOk(expected?)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.value` |
| BEH-T02-003 | `toBeErr(expected?)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.error` |
| BEH-T02-004 | `toBeOkWith(expected)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.value` |
| BEH-T02-005 | `toBeErrWith(expected)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.error` |
| BEH-T02-006 | `toBeSome(expected?)` | `src/matchers.ts` | `Option<T>` | `option._tag`, `option.value` |
| BEH-T02-007 | `toBeNone()` | `src/matchers.ts` | `Option<T>` | `option._tag` |
| BEH-T02-008 | `toContainOk(value)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.contains(value)` |
| BEH-T02-009 | `toContainErr(error)` | `src/matchers.ts` | `Result<T, E>` | `result._tag`, `result.containsErr(error)` |

## 5. Test Factories → Parent API Surface

Mapping of test factories (BEH-T03) to the `@hex-di/result` constructors they wrap.

| Behavior ID | Factory | Implementation File | Parent Constructors Used |
| ----------- | ------- | ------------------- | ------------------------ |
| BEH-T03-001 | `createResultFixture(defaults)` | `src/factories.ts` | `ok()`, `err()`, `ResultAsync.fromSafePromise()`, `ResultAsync.fromPromise()` |
| BEH-T03-002 | `createOptionFixture(defaults)` | `src/factories.ts` | `some()`, `none()` |
| BEH-T03-003 | `mockResultAsync()` | `src/factories.ts` | `ResultAsync.fromResult()`, `ok()`, `err()` |

## 6. Type Augmentation → Parent Types

Mapping of type augmentation (BEH-T05) to the `@hex-di/result` types they reference.

| Behavior ID | Augmentation | Implementation File | Parent Types Referenced |
| ----------- | ------------ | ------------------- | ---------------------- |
| BEH-T05-001 | `Assertion<T>` interface | `src/matchers.ts` | `Result<T, E>`, `Option<T>` |
| BEH-T05-002 | `AsymmetricMatchersContaining` | `src/matchers.ts` | `Result<T, E>`, `Option<T>` |
| BEH-T05-003 | Type narrowing contract | `src/assertion-helpers.ts` | `Ok<T, never>`, `Err<never, E>`, `Some<T>`, `None` |

## 7. Parent Invariant Coverage Summary

Reverse mapping: which parent invariants have corresponding test utilities in `@hex-di/result-testing`.

| Parent Invariant | Description | Covered By | Coverage |
| ---------------- | ----------- | ---------- | -------- |
| INV-1 | Frozen Result instances | BEH-T04-001, BEH-T04-004 | Direct |
| INV-2 | Internal promise never rejects | BEH-T04-005 | Direct |
| INV-3 | Brand symbol prevents forgery (Result) | BEH-T04-002, BEH-T04-004 | Direct |
| INV-4 | Err generator throws on continuation | — | Not in scope (runtime behavior, tested by parent) |
| INV-5 | Error suppression in tee operations | — | Not in scope (runtime behavior, tested by parent) |
| INV-6 | Phantom types enable free composition | BEH-T05-003 | Indirect (type-level) |
| INV-7 | createError output is frozen | BEH-T04-001 | Direct |
| INV-8 | Lazy ResultAsync registration | — | Not in scope (internal wiring, tested by parent) |
| INV-9 | ResultAsync brand identity | — | Out of scope — ResultAsync brand is verified by the parent library's own test suite. Consumer-facing `expectResultAsyncBrand` may be added in a future version if demand arises. |
| INV-10 | Frozen Option instances | BEH-T04-001 | Direct |
| INV-11 | Option brand prevents forgery | BEH-T04-003 | Direct |
| INV-12 | UnwrapError contains context | — | Not in scope (tested by parent's unsafe tests) |
| INV-13 | Subpath blocking | — | Not in scope (package configuration, tested by parent) |
| INV-14 | Standalone functions delegate | — | Not in scope (tested by parent's fn tests) |

### Coverage Metrics

| Metric | Value |
| ------ | ----- |
| Total parent invariants | 14 |
| Directly covered by test utilities | 6 (INV-1, INV-2, INV-3, INV-7, INV-10, INV-11 via BEH-T04) |
| Indirectly covered (type-level) | 1 (INV-6 via BEH-T05-003) |
| Out of scope (tested by parent) | 7 (INV-4, INV-5, INV-8, INV-9, INV-12, INV-13, INV-14) |
| Coverage of GxP-relevant invariants | 100% (all immutability, brand, and promise-safety invariants covered) |

### Out-of-Scope Justification

The 7 uncovered invariants are not in scope for `@hex-di/result-testing` because they concern internal runtime behaviors that are fully covered by the parent library's own test suite. The testing library focuses on invariants that consumers need to verify in their own GxP compliance test suites (immutability, branding, promise safety).

| Parent Invariant | Reason Out of Scope | Parent Test File(s) |
| ---------------- | ------------------- | ------------------- |
| **INV-4** (Err generator throws) | Internal iterator protocol behavior — tested exhaustively in parent's `safeTry` test suite | `packages/result/tests/generators.test.ts`, `packages/result/tests/gxp/generator-safety.test.ts` |
| **INV-5** (Tee error suppression) | Method-level behavior — tested by parent's method-level unit tests for `andTee`/`orTee` | `packages/result/tests/chaining.test.ts`, `packages/result/tests/gxp/error-suppression.test.ts` |
| **INV-8** (Lazy ResultAsync registration) | Internal module wiring — tested by parent's integration tests | `packages/result/tests/result-async.test.ts` |
| **INV-9** (ResultAsync brand identity) | Verified by the parent library's own test suite. Consumer-facing `expectResultAsyncBrand` may be added in a future version if demand arises | `packages/result/tests/gxp/async-tamper.test.ts`, `packages/result/tests/type-guards.test.ts` |
| **INV-12** (UnwrapError context) | Specific to the `@hex-di/result/unsafe` subpath — tested by parent's unsafe module tests | `packages/result/tests/unsafe.test.ts` |
| **INV-13** (Subpath blocking) | Package.json `exports` configuration — tested by parent's subpath resolution and interop tests | `packages/result/tests/interop.test.ts` |
| **INV-14** (Standalone functions delegate) | `@hex-di/result/fn` subpath behavior — tested by parent's fn module tests | `packages/result/tests/standalone-functions.test.ts`, `packages/result/tests/gxp/delegation.test.ts` |

## 8. Forward Traceability to Test Cases

Mapping of each BEH-T behavior to its expected test file and test case names. This section provides forward traceability from specification to implementation verification, following the convention established in [`@hex-di/result` test strategy](../process/test-strategy.md).

### BEH-T01: Assertion Helpers

| Behavior ID | Test File | Test Cases |
| ----------- | --------- | ---------- |
| BEH-T01-001 | `tests/assertion-helpers.test.ts` | `expectOk(result)` > `returns value for Ok`, `throws for Err with descriptive message` |
| BEH-T01-002 | `tests/assertion-helpers.test.ts` | `expectErr(result)` > `returns error for Err`, `throws for Ok with descriptive message` |
| BEH-T01-003 | `tests/assertion-helpers.test.ts` | `expectOkAsync(resultAsync)` > `returns value for Ok ResultAsync`, `throws for Err ResultAsync` |
| BEH-T01-004 | `tests/assertion-helpers.test.ts` | `expectErrAsync(resultAsync)` > `returns error for Err ResultAsync`, `throws for Ok ResultAsync` |
| BEH-T01-005 | `tests/assertion-helpers.test.ts` | `expectSome(option)` > `returns value for Some`, `throws for None` |
| BEH-T01-006 | `tests/assertion-helpers.test.ts` | `expectNone(option)` > `passes for None`, `throws for Some with descriptive message` |

### BEH-T02: Vitest Matchers

| Behavior ID | Test File | Test Cases |
| ----------- | --------- | ---------- |
| BEH-T02-001 | `tests/matchers.test.ts` | `setupResultMatchers()` > `registers all matchers`, `is idempotent` |
| BEH-T02-002 | `tests/matchers.test.ts` | `toBeOk()` > `passes for Ok`, `fails for Err`, `not.toBeOk() passes for Err` |
| BEH-T02-003 | `tests/matchers.test.ts` | `toBeErr()` > `passes for Err`, `fails for Ok`, `not.toBeErr() passes for Ok` |
| BEH-T02-004 | `tests/matchers.test.ts` | `toBeOkWith(expected)` > `passes for Ok with matching value`, `fails for Ok with different value`, `fails for Err` |
| BEH-T02-005 | `tests/matchers.test.ts` | `toBeErrWith(expected)` > `passes for Err with matching error`, `fails for Err with different error`, `fails for Ok` |
| BEH-T02-006 | `tests/matchers.test.ts` | `toBeSome()` > `passes for Some`, `fails for None`, `not.toBeSome() passes for None` |
| BEH-T02-007 | `tests/matchers.test.ts` | `toBeNone()` > `passes for None`, `fails for Some`, `not.toBeNone() passes for Some` |
| BEH-T02-008 | `tests/matchers.test.ts` | `toContainOk(value)` > `passes for Ok containing value`, `fails for Ok not containing value`, `fails for Err` |
| BEH-T02-009 | `tests/matchers.test.ts` | `toContainErr(error)` > `passes for Err containing error`, `fails for Err not containing error`, `fails for Ok` |

### BEH-T03: Test Factories

| Behavior ID | Test File | Test Cases |
| ----------- | --------- | ---------- |
| BEH-T03-001 | `tests/factories.test.ts` | `createResultFixture()` > `ok() creates Ok with default`, `ok(override) creates Ok with override`, `err() creates Err with default`, `asyncOk() creates ResultAsync resolving to Ok`, `asyncErr() creates ResultAsync resolving to Err` |
| BEH-T03-002 | `tests/factories.test.ts` | `createOptionFixture()` > `some() creates Some with default`, `some(override) creates Some with override`, `none() creates None` |
| BEH-T03-003 | `tests/factories.test.ts` | `mockResultAsync()` > `returns deferred ResultAsync with resolve/reject handles`, `resolve produces Ok`, `reject produces Err` |

### BEH-T04: GxP Test Utilities

| Behavior ID | Test File | Test Cases |
| ----------- | --------- | ---------- |
| BEH-T04-001 | `tests/gxp.test.ts` | `expectFrozen()` > `passes for frozen object`, `throws for non-frozen object`, `passes for primitives`, `throws for null/undefined` |
| BEH-T04-002 | `tests/gxp.test.ts` | `expectResultBrand()` > `passes for genuine Result`, `throws for structural fake`, `throws for non-object` |
| BEH-T04-003 | `tests/gxp.test.ts` | `expectOptionBrand()` > `passes for genuine Option`, `throws for structural fake`, `throws for non-object` |
| BEH-T04-004 | `tests/gxp.test.ts` | `expectImmutableResult()` > `passes for frozen branded Ok`, `passes for frozen branded Err`, `throws for unfrozen Result`, `throws for unbranded Result`, `throws for invalid _tag` |
| BEH-T04-005 | `tests/gxp.test.ts` | `expectNeverRejects()` > `passes for ResultAsync resolving to Ok`, `passes for ResultAsync resolving to Err`, `propagates rejection for malformed ResultAsync` |

### BEH-T05: Type Augmentation

| Behavior ID | Test File | Test Cases |
| ----------- | --------- | ---------- |
| BEH-T05-001 | `tests/matchers.test-d.ts` | `Assertion<Result>` > `toBeOk() is available on expect(result)`, `toBeErr() is available on expect(result)`, `toBeSome() is available on expect(option)` |
| BEH-T05-002 | `tests/matchers.test-d.ts` | `AsymmetricMatchersContaining` > `expect.toBeOk() is callable in asymmetric context` |
| BEH-T05-003 | `tests/assertion-helpers.test-d.ts` | `Type narrowing` > `expectOk narrows Result<T,E> to T`, `expectErr narrows Result<T,E> to E`, `expectSome narrows Option<T> to T`|

### Forward Traceability Coverage

| Behavior Group | Total Behaviors | Mapped to Test Cases | Coverage |
| -------------- | --------------- | -------------------- | -------- |
| BEH-T01 | 6 | 6 | 100% |
| BEH-T02 | 9 | 9 | 100% |
| BEH-T03 | 3 | 3 | 100% |
| BEH-T04 | 5 | 5 | 100% |
| BEH-T05 | 3 | 3 | 100% |
| **Total** | **26** | **26** | **100%** |
