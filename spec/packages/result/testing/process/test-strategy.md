---
document_id: SPEC-RT-PROC-002
title: "Test Strategy"
version: "1.3.0"
status: Approved
author: Mohammad AL Mechkor
created: 2026-02-15
last_reviewed: 2026-02-15
gamp_category: 5
classification: Process Document
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
    date: 2026-02-16T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "Cross-document coverage audit: added Level 5 Cucumber Acceptance Tests section, added Acceptance level to test pyramid, added BEH-T05 type-only note to Level 1 structure table, added Mutation Testing and Cucumber rows to CI Gates table"
  - version: "1.2.0"
    date: 2026-02-15T17:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Level 4 Mutation Testing section with Stryker CI gate for src/gxp.ts per Finding 2 (GAMP 5 risk-proportionate testing)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Backup and Recovery Verification section per Finding 6 (EU Annex 11 §16)"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version — created to address GxP spec review Finding 1 (missing test strategy document)"
---

# Test Strategy

Testing approach and policy for the `@hex-di/result-testing` package. This is a lighter strategy than the parent library's [test strategy](../../process/test-strategy.md), proportionate to the package's nature as a testing utility library.

## Test Pyramid

```
                ╱╲
               ╱  ╲
              ╱Mutn╲         Stryker mutation testing (src/gxp.ts)
             ╱──────╲
            ╱ Accept  ╲       Cucumber acceptance tests (features/)
           ╱────────────╲
          ╱  GxP Self-Test╲    GxP utility self-tests (gxp.test.ts)
         ╱────────────────╲
        ╱  Type             ╲   Vitest typecheck (.test-d.ts)
       ╱────────────────────╲
      ╱  Unit                 ╲  Vitest runtime (.test.ts)
     ╱──────────────────────────╲
```

| Level | Tool | File Pattern | Runs On | Purpose |
|-------|------|-------------|---------|---------|
| Unit | Vitest | `tests/*.test.ts` | Full Node + OS matrix | Runtime behavior correctness |
| Type | Vitest typecheck | `tests/*.test-d.ts` | Full TS version matrix | Type inference and narrowing |
| GxP Self-Test | Vitest | `tests/gxp.test.ts` | ubuntu-latest, Node 22 | GxP utility correctness (High-risk group) |
| Acceptance | @cucumber/cucumber | `features/*.feature` | ubuntu-latest, Node 22 | End-to-end behavior spec validation |
| Mutation | Stryker | `src/gxp.ts` | ubuntu-latest, Node 22 | Verify test suite detects injected defects in High-risk GxP utilities |

## Level 1: Unit Tests

### Tooling

- **Runner**: Vitest
- **File pattern**: `tests/*.test.ts`
- **Coverage**: `vitest run --coverage` with `v8` provider

### Structure

Tests mirror the behavior spec files:

| Behavior Spec | Test File |
|---------------|-----------|
| `01-assertion-helpers.md` | `tests/assertion-helpers.test.ts` |
| `02-vitest-matchers.md` | `tests/matchers.test.ts` |
| `03-test-factories.md` | `tests/factories.test.ts` |
| `04-gxp-test-utilities.md` | `tests/gxp.test.ts` |

> **Note:** BEH-T05 (Type Augmentation) has no runtime test file and is omitted from this table. It is tested exclusively at Level 2 (Type Tests) via `tests/matchers.test-d.ts` and `tests/assertion-helpers.test-d.ts`, because its behaviors are compile-time-only (Vitest module augmentation and type narrowing contracts).

### Coverage Targets

| Metric | Target |
|--------|--------|
| Line coverage | > 95% |
| Branch coverage | > 90% |
| Function coverage | 100% |

### Naming Convention

```typescript
describe("expectOk(result)", () => {
  it("returns value for Ok", () => { ... });
  it("throws for Err with descriptive message", () => { ... });
});

describe("toBeOk()", () => {
  it("passes for Ok", () => { ... });
  it("fails for Err", () => { ... });
  it("not.toBeOk() passes for Err", () => { ... });
});
```

Convention:
- `describe` blocks name the function/matcher under test
- `it` blocks describe the expected behavior as a sentence
- Both positive and negative cases are tested for every matcher and assertion helper
- `.not` negation is tested for every custom matcher
- Error message content is verified in test assertions

## Level 2: Type Tests

### Tooling

- **Runner**: Vitest typecheck (`vitest typecheck`)
- **File pattern**: `tests/*.test-d.ts`
- **Assertions**: `expectTypeOf` from Vitest

### What Type Tests Cover

| Category | Example |
|----------|---------|
| Narrowing | After `expectOk(result)`, return type is `T` not `T \| E` |
| Augmentation | `expect(result).toBeOk()` type-checks after `setupResultMatchers()` |
| Asymmetric | `expect.toBeOk(42)` is callable in `expect.objectContaining()` context |
| Negative cases | `// @ts-expect-error` for invalid matcher usage |

### Test Files

| Type Spec | Test File |
|-----------|-----------|
| BEH-T05-001 (Assertion augmentation) | `tests/matchers.test-d.ts` |
| BEH-T05-002 (Asymmetric augmentation) | `tests/matchers.test-d.ts` |
| BEH-T05-003 (Type narrowing contract) | `tests/assertion-helpers.test-d.ts` |

## Level 3: GxP Utility Self-Tests

### Purpose

The GxP test utilities (BEH-T04) are classified as **High risk** in the [Risk Assessment](../overview.md#risk-assessment). A false positive in these utilities would declare a non-compliant value as compliant, directly undermining GxP assurance. This level provides enhanced testing rigor for these utilities.

### Test File

`tests/gxp.test.ts`

### Required Test Coverage

Each GxP utility must be tested against:

| Input Category | Description | Purpose |
|----------------|-------------|---------|
| Genuine values | `ok()`, `err()`, `some()`, `none()` from `@hex-di/result` | Verify the utility passes for compliant values |
| Structural fakes | Objects with correct `_tag` but no brand symbol | Verify the utility rejects non-genuine values (no false positive) |
| Invalid types | `null`, `undefined`, numbers, strings, functions | Verify graceful rejection of non-object inputs |
| Edge cases | Empty objects, objects with extra properties | Verify robustness |

### Self-Test Validation

The GxP utilities test their own assertion logic by verifying that:
1. `expectFrozen` passes for `Object.freeze({})` and fails for `{}`
2. `expectResultBrand` passes for `ok(1)` and fails for `{ _tag: "Ok", value: 1 }`
3. `expectOptionBrand` passes for `some(1)` and fails for `{ _tag: "Some", value: 1 }`
4. `expectImmutableResult` compounds frozen + branded + tag checks
5. `expectNeverRejects` passes for `ResultAsync` that resolves (both Ok and Err)

## Level 4: Mutation Testing

### Purpose

Mutation testing verifies that the test suite for GxP utilities (BEH-T04, **High risk**) is sufficiently sensitive to detect injected defects. A high mutation score confirms that tests would catch real-world defects in assertion logic, reducing the risk of false positives (RR-T1).

### Tooling

- **Runner**: Stryker Mutator (`@stryker-mutator/core`)
- **Target**: `src/gxp.ts` only (scoped to High-risk GxP utilities)
- **Test runner**: Vitest (via `@stryker-mutator/vitest-runner`)

### CI Gate

| Metric | Target |
|--------|--------|
| Mutation score | > 80% |

### Scope Rationale

Mutation testing is scoped to `src/gxp.ts` (BEH-T04) because:

1. GxP utilities are the **highest risk** behavior group — a false positive directly undermines compliance assurance
2. The file is small and focused, making mutation testing fast and deterministic
3. Lower-risk behavior groups (BEH-T01 through BEH-T03) are adequately covered by standard unit test coverage gates (>95% line, >90% branch)

Expanding mutation testing to other source files may be considered during annual GxP review if the risk profile changes.

## Level 5: Cucumber Acceptance Tests

### Purpose

Cucumber acceptance tests validate that the testing library's public API satisfies the behavior specifications end-to-end, expressed in Gherkin scenarios that map directly to the `BEH-TXX-NNN` requirement IDs. This level bridges the gap between unit-level correctness (Levels 1–4) and the behavior specifications, providing human-readable acceptance criteria that serve as living documentation.

### Tooling

- **Runner**: `@cucumber/cucumber` with Vitest step runner
- **Feature files**: `features/*.feature`
- **Step definitions**: `features/steps/*.ts`

### Feature File Mapping

| Behavior Spec | Feature File | Tag Prefix |
|---------------|-------------|------------|
| `01-assertion-helpers.md` | `features/assertion-helpers.feature` | `@BEH-T01` |
| `02-vitest-matchers.md` | `features/matchers.feature` | `@BEH-T02` |
| `03-test-factories.md` | `features/factories.feature` | `@BEH-T03` |
| `04-gxp-test-utilities.md` | `features/gxp-utilities.feature` | `@BEH-T04` |
| `05-type-augmentation.md` | `features/type-augmentation.feature` | `@BEH-T05` |

### Tagging Convention

Each scenario is tagged with the `@BEH-TXX-NNN` requirement ID it covers. Multiple tags may be applied to a single scenario if it exercises multiple requirements.

### Gherkin Example

```gherkin
@BEH-T01-001
Scenario: expectOk returns the contained value for Ok
  Given a Result created with ok(42)
  When I call expectOk on the Result
  Then it returns 42

@BEH-T01-001
Scenario: expectOk throws for Err
  Given a Result created with err("fail")
  When I call expectOk on the Result
  Then it throws with a descriptive error message
```

### CI Gate

| Metric | Target |
|--------|--------|
| Cucumber scenarios | All pass |

## Test Environment

### Required Versions

| Dependency | Version | Source |
|------------|---------|--------|
| Node.js | `>= 18.0.0` | `package.json` `engines` |
| Vitest | `>= 4.0.0` | `package.json` `peerDependencies` |
| `@hex-di/result` | workspace dependency | `package.json` `peerDependencies` |
| TypeScript | `>= 5.0.0` | `tsconfig.json` |

### Environment Consistency

- All tests run in the same Vitest process with the same Node.js version
- The `@hex-di/result` dependency is resolved from the workspace (same monorepo) — no version mismatch is possible at development time
- CI matrix tests against multiple Node.js versions (18, 20, 22) and multiple TypeScript versions (5.0 through latest) to ensure compatibility
- `vitest.setup.ts` calls `setupResultMatchers()` once, making all custom matchers available to every test file

### Isolation

- Each `it` block creates its own `Result`/`Option`/`ResultAsync` instances — no shared mutable state between test cases
- Vitest runs test files in parallel by default; each file has its own module scope
- `setupResultMatchers()` is idempotent (TINV-3) — safe even if called from both setup file and individual test files

## Test Data Management

### Principles

- Test data is **defined inline** in test files, not in external fixtures
- No shared mutable test state between `it` blocks
- Each test creates its own `Result`/`Option` instances via `@hex-di/result` constructors
- Factory tests use `createResultFixture()` and `createOptionFixture()` — the factories under test serve as their own test data generators

### Standard Test Values

| Type | Ok/Some Values | Err/None Values |
|------|----------------|-----------------|
| Primitive | `42`, `"hello"`, `true`, `0`, `""` | `"error"`, `"fail"`, `0` |
| Object | `{ name: "test" }`, `[1, 2, 3]` | `new Error("msg")`, `{ code: 404 }` |
| Edge cases | `undefined` (as contained value), `null` (as contained value) | — |

### GxP Test Data

GxP utility tests require both genuine and forged values:

| Category | Construction | Purpose |
|----------|-------------|---------|
| Genuine `Result` | `ok(42)`, `err("fail")` | Verify pass case |
| Structural fake | `{ _tag: "Ok", value: 42 }` | Verify brand rejection |
| Genuine `Option` | `some(42)`, `none()` | Verify pass case |
| Structural fake Option | `{ _tag: "Some", value: 42 }` | Verify brand rejection |
| Non-object | `42`, `"string"`, `null`, `undefined` | Verify type guard |

## Regression Testing

### CI Gates

All tests must pass before a PR can be merged to `main`. The following CI jobs block merge:

| CI Job | What It Verifies |
|--------|-----------------|
| Unit Tests | All `*.test.ts` files pass |
| Type Tests | All `*.test-d.ts` files pass |
| Cucumber | All `features/*.feature` scenarios pass |
| Coverage | Line coverage > 95%, branch coverage > 90% |
| Mutation Testing | Mutation score > 80% for `src/gxp.ts` |
| Build | `tsc -p tsconfig.build.json` succeeds |
| Traceability | No orphaned specs or tests |

### Regression Approach

- Every bug fix must include a regression test that fails without the fix and passes with it (per [Definition of Done](definition-of-done.md#bug-fix-definition-of-done))
- CI runs the full test suite on every PR — no selective test execution
- The `@hex-di/result` workspace dependency ensures that parent library changes are immediately reflected in testing package tests

## Backup and Recovery Verification

Per EU Annex 11 §16, business continuity arrangements should be periodically verified. For this
git-based specification repository, backup integrity is implicitly verified by routine development
operations: every `git clone`, `git fetch`, and `git pull` confirms that the complete repository
history (including all specification versions) is intact and retrievable. No additional backup
testing infrastructure is required. Formal recovery verification is included in the
[Annual GxP Periodic Review](../process/definition-of-done.md#annual-gxp-periodic-review) checklist.

## Traceability

Full forward traceability from behaviors to test cases is maintained in [traceability.md Section 8](../traceability.md#8-forward-traceability-to-test-cases). Every BEH-T behavior ID maps to specific test file(s) and test case names. The traceability verification CI job blocks PRs with orphaned behaviors or test cases.
