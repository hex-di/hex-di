# Definitions of Done

Per-feature acceptance criteria that must be satisfied before a feature is considered complete.

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Behavior spec file exists in `spec/result/behaviors/` covering all public API for the feature
- [ ] All new types are documented in `spec/result/type-system/`
- [ ] New glossary terms are added to `spec/result/glossary.md`
- [ ] If an architectural decision was made, an ADR exists in `spec/result/decisions/`
- [ ] If a new runtime guarantee is introduced, an invariant is added to `spec/result/invariants.md`
- [ ] `spec/result/overview.md` is updated: API tables, source file map, dependency graph
- [ ] Cross-reference links between specs are valid
- [ ] If a roadmap item is delivered, its status in `spec/result/roadmap.md` is updated to "Specified" or "Delivered" with a link to the deliverable

### 2. Unit Tests (Vitest)

- [ ] Runtime tests exist in `*.test.ts` covering every public function and method
- [ ] Both Ok and Err variants are tested for every Result method
- [ ] Edge cases are tested: empty string, 0, null, undefined, NaN, nested Results
- [ ] Error paths are tested: invalid inputs, thrown exceptions
- [ ] Line coverage > 95% for new code
- [ ] Branch coverage > 90% for new code
- [ ] Function coverage = 100% for new code

### 3. Type Tests (Vitest typecheck)

- [ ] Type tests exist in `*.test-d.ts` for every public type signature
- [ ] Inference is verified: `expectTypeOf(fn(args)).toEqualTypeOf<Expected>()`
- [ ] Narrowing is verified: after `isOk()`, `value` is accessible
- [ ] Negative cases use `// @ts-expect-error` to confirm invalid usage fails
- [ ] Tests pass against the full TypeScript version matrix (5.0 through latest)

### 4. GxP Integrity Tests

- [ ] If the feature involves immutability (new factories), the applicable freeze test is updated: `gxp/freeze.test.ts` (Result), `gxp/error-freeze.test.ts` (error factories), `gxp/option-freeze.test.ts` (Option)
- [ ] If the feature involves brand validation (new types), the applicable tamper test is updated: `gxp/tamper-evidence.test.ts` (Result), `gxp/async-tamper.test.ts` (ResultAsync), `gxp/option-tamper.test.ts` (Option)
- [ ] If the feature involves error suppression or side-effect safety, `gxp/error-suppression.test.ts` is updated
- [ ] If the feature involves async behavior, `gxp/promise-safety.test.ts` is updated
- [ ] If the feature involves generator-based control flow, `gxp/generator-safety.test.ts` is updated
- [ ] If the feature involves standalone function parity, `gxp/delegation.test.ts` is updated
- [ ] All GxP-relevant invariants have dedicated integrity tests

### 5. Mutation Tests (Stryker)

- [ ] Mutation score > 90% break threshold for new code
- [ ] Surviving mutants are reviewed, justified, and recorded in `docs/mutant-adjudication.md` per [test-strategy.md](test-strategy.md#mutant-adjudication-record)
- [ ] No surviving mutants in security-critical code (brand checks, freeze calls)

### 6. Cucumber Acceptance Tests

- [ ] Feature file exists in `features/` corresponding to the behavior spec
- [ ] Scenarios cover the primary success path (happy path)
- [ ] Scenarios cover error/failure paths
- [ ] Scenarios cover edge cases listed in the behavior spec
- [ ] Scenarios are tagged with `@BEH-XX-NNN` referencing the requirement ID they cover
- [ ] Step definitions are implemented in `features/steps/`
- [ ] All scenarios pass

### 7. Documentation

- [ ] JSDoc comments on every public export (function, type, constant)
- [ ] `@example` tag with runnable code snippet in JSDoc
- [ ] `@since` tag with the version that introduced the API
- [ ] `@see` tag linking to the relevant spec file
- [ ] No `@todo` or `TODO` comments in committed code

### 8. API Surface

- [ ] No unintended new exports (check against `spec/result/overview.md` API tables)
- [ ] Subpath exports in `package.json` are updated if new subpaths are added
- [ ] Internal modules remain blocked via `"./internal/*": null`
- [ ] `@hex-di/result/unsafe` gating is preserved (no unsafe re-exports from main entry)

### 9. Traceability

- [ ] Every testable requirement in the behavior spec has a `BEH-XX-NNN` ID as a Markdown heading (following the [Requirement Identification Convention](../compliance/gxp.md#requirement-identification-convention))
- [ ] The BEH-XX-NNN ID range for the behavior spec is added or updated in the [Behavior Spec → Requirement ID Ranges](../compliance/gxp.md#behavior-spec--requirement-id-ranges) table in `compliance/gxp.md`
- [ ] Unit tests reference the `BEH-XX-NNN` ID in their `describe` or `it` block name
- [ ] Type tests reference the `BEH-XX-NNN` ID where applicable
- [ ] `scripts/verify-traceability.sh` passes with 0 orphaned requirements and 0 orphaned tests

### 10. GxP Compliance

- [ ] If a new invariant is introduced, it is assessed in the [Per-Invariant Assessment](../compliance/gxp.md#per-invariant-assessment) table (severity, detectability, risk level, rationale)
- [ ] If a new invariant is introduced, it is added to the [Invariants → Test Coverage](../compliance/gxp.md#invariants--test-coverage) table with the applicable test levels
- [ ] If a new invariant is introduced, the [Risk Summary](../compliance/gxp.md#risk-summary) counts are updated
- [ ] If the feature introduces a new ATR-N or DRR-N requirement, it is added to the ATR-N / DRR-N traceability verification table in [Coverage Targets](../compliance/gxp.md#coverage-targets) with its verification mechanism
- [ ] If the feature affects ALCOA+ properties, the [ALCOA+ Compliance Mapping](../compliance/gxp.md#alcoa-compliance-mapping) is reviewed and updated if needed

### 11. Performance

- [ ] If the feature adds or modifies a hot-path operation (factory, combinator, chaining method), a benchmark exists in `bench/*.bench.ts`
- [ ] If a performance target is specified in the behavior spec (e.g., `BEH-14-*`), the benchmark verifies the target
- [ ] No performance regression > 20% on existing benchmarks (same threshold as [Refactoring DoD](#refactoring-definition-of-done))

### 12. Process

- [ ] If a new CI job is required, `spec/result/process/ci-maintenance.md` is updated with the job definition, matrix entry, and failure response
- [ ] If a new tool is added to the development workflow, the [Toolchain Qualification](ci-maintenance.md#toolchain-qualification) table in `ci-maintenance.md` is updated
- [ ] If `spec/result/process/test-strategy.md` coverage categories change (new test level, new GxP test file), the test strategy document is updated

### 13. Build

- [ ] `tsc -p tsconfig.build.json` succeeds with no errors
- [ ] `pnpm audit` reports no critical/high vulnerabilities
- [ ] Bundle size delta is documented (if significant)

### 14. Changeset

- [ ] Changeset file created via `pnpm changeset`
- [ ] Semantic version impact is correct (feat → minor, fix → patch, breaking → major)
- [ ] Changeset description is clear and end-user-oriented

## Bug Fix Definition of Done

A bug fix is **done** when:

- [ ] Root cause is identified and documented in the commit message
- [ ] Regression test is added that fails without the fix and passes with it
- [ ] Mutation test covers the fix (no surviving mutant on the changed line)
- [ ] Existing tests still pass (no regressions)
- [ ] Spec is updated if the bug reveals an underspecified behavior
- [ ] Changeset is created (patch version)

## Refactoring Definition of Done

A refactoring is **done** when:

- [ ] All existing tests pass without modification (behavior preserved)
- [ ] Mutation score is equal to or higher than before
- [ ] No public API changes (unless explicitly intended and spec'd)
- [ ] Performance benchmarks show no regression > 20%
- [ ] Changeset is created (no version bump for pure refactor)

## Release Checklist

Before merging a "Version Packages" PR:

- [ ] All CI jobs pass (unit, type, GxP, mutation, Cucumber, build, exports, traceability verification, ATR-1 check)
- [ ] Changelog is accurate and complete
- [ ] No `TBD` entries in spec files referenced by the release
- [ ] GxP traceability matrix in `compliance/gxp.md` is updated for new invariants (risk assessment, test coverage table, risk summary, ADR traceability)
- [ ] Static traceability report generated and committed (`docs/traceability-report-vX.Y.Z.md`) per [ci-maintenance.md Release Traceability Artifact](ci-maintenance.md#release-traceability-artifact)
- [ ] All referenced implementation artifacts exist and are operational: `scripts/verify-traceability.sh`, GxP test files, Cucumber feature files, fixture files
- [ ] `spec/result/roadmap.md` status reflects delivered items
- [ ] README is updated if public API surface changed

### Additional v1.0 Release Blockers

The following items are required specifically for the v1.0 GA release:

- [ ] **Independent risk assessment review**: [Sign-off block](../compliance/gxp.md#independent-review-sign-off) completed by an independent QA reviewer with no authorship of assessed invariants
- [ ] **Training self-assessment**: Maintainers have completed the [Sample Assessment Questionnaire](../compliance/gxp.md#sample-assessment-questionnaire) and recorded the outcome in the [Review History](ci-maintenance.md#review-history)
- [ ] **DRR-2 schema fixture**: `src/core/__fixtures__/schema-versions.json` contains v1.0.0 format entries (with `_schemaVersion: 1` for Ok, Err, Some, None), legacy format entries (without `_schemaVersion`), and Option serialization entries (Some/None). The `from-json-compat.test.ts` regression test passes for all fixture entries
- [ ] **Option serialization**: `toJSON()` on `Some`/`None` and `fromOptionJSON()` are implemented with round-trip tests in `option/option.test.ts`. OQ-018 (Option serialization round-trip) passes. DRR-4 in `compliance/gxp.md` is updated to reflect native support
