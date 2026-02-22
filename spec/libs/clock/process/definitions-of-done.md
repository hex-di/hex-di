# Definitions of Done

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-003 |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- process/definitions-of-done.md` |
| Author | Derived from Git -- `git log --format="%an" -1 -- process/definitions-of-done.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record -- see Git merge commit |
| Change History | `git log --oneline --follow -- process/definitions-of-done.md` |
| Status | Effective |

Per-feature acceptance criteria for `@hex-di/clock`. The detailed test enumeration (692 tests across 68 files) is maintained in [09-definition-of-done.md](../09-definition-of-done.md).

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Relevant spec section (01-09) is updated with new requirements using `CLK-{DOMAIN}-{NNN}` identifiers
- [ ] If a new invariant is introduced, it is added to [invariants.md](../invariants.md) with `INV-CK-N` identifier
- [ ] If an architectural decision was made, an ADR exists in [decisions/](../decisions/)
- [ ] New glossary terms are added to [glossary.md](../glossary.md)
- [ ] [overview.md](../overview.md) API tables and source file map are updated
- [ ] Cross-reference links between specs are valid
- [ ] If a roadmap item is delivered, its status in [roadmap.md](../roadmap.md) is updated

### 2. Unit Tests (Vitest)

- [ ] Runtime tests exist in the appropriate `*.test.ts` file matching the DoD group
- [ ] Both success and error paths tested for all `Result`-returning operations
- [ ] Edge cases tested: negative values, zero, `MAX_SAFE_INTEGER`, `NaN`, platform unavailability
- [ ] All adapter return values verified frozen (`Object.isFrozen()`)
- [ ] Line coverage > 95% for new code
- [ ] Branch coverage > 90% for new code

### 3. Type Tests (Vitest typecheck)

- [ ] Type tests exist in the appropriate `*.test-d.ts` file
- [ ] Branded timestamp type safety verified: cross-domain assignment rejected
- [ ] Port interface structural compatibility verified
- [ ] `Result` return types verified for all fallible operations
- [ ] Tests pass against the full TypeScript version matrix (5.0 through latest)

### 4. GxP Tests

- [ ] If the feature affects an invariant with FMEA entry, the corresponding GxP test is updated
- [ ] If the feature introduces a new IQ/OQ/PQ test, it is enumerated in [09-definition-of-done.md](../09-definition-of-done.md)
- [ ] If the feature affects freeze behavior, IQ tests verify immutability
- [ ] If the feature affects `TemporalContext`, DoD 8 tests are updated

### 5. Mutation Tests (Stryker)

- [ ] Mutation score > 95% for new code
- [ ] Surviving mutants reviewed and justified
- [ ] No surviving mutants in security-critical code (brand checks, freeze calls, self-test logic)

### 6. Traceability

- [ ] Every new `CLK-{DOMAIN}-{NNN}` requirement maps to at least one test
- [ ] [traceability.md](../traceability.md) requirement counts are updated
- [ ] If a new invariant is added, it appears in the invariant traceability table
- [ ] If a new `[OPERATIONAL]` requirement is added, it is documented in the RTM operational verification matrix

### 7. GxP Compliance

- [ ] If a new invariant is introduced, it is assessed in [risk-assessment.md](../risk-assessment.md) (severity, detection, RPN)
- [ ] If a new failure mode is identified, it is added to the [FMEA](../06-gxp-compliance/11-fmea-risk-analysis.md)
- [ ] If the feature affects ALCOA+ properties, the [ALCOA+ mapping](../06-gxp-compliance/05-alcoa-mapping.md) is reviewed

### 8. Build

- [ ] `tsc -p tsconfig.build.json` succeeds with no errors
- [ ] No unintended new exports (check against [overview.md](../overview.md) API tables)
- [ ] Subpath exports in `package.json` updated if new subpaths are added

### 9. Changeset

- [ ] Changeset file created via `pnpm changeset`
- [ ] Semantic version impact is correct (feat → minor, fix → patch, breaking → major)
- [ ] Changeset description is clear and end-user-oriented

## Bug Fix Definition of Done

A bug fix is **done** when:

- [ ] Root cause is identified and documented in the commit message
- [ ] Regression test is added that fails without the fix and passes with it
- [ ] Existing tests still pass (no regressions)
- [ ] Spec is updated if the bug reveals an underspecified behavior
- [ ] If the fix affects a GxP-relevant invariant, the change follows the **Critical** category in [03-verification-and-change-control.md](../06-gxp-compliance/03-verification-and-change-control.md)
- [ ] Changeset is created (patch version)

## Refactoring Definition of Done

A refactoring is **done** when:

- [ ] All existing tests pass without modification (behavior preserved)
- [ ] Mutation score is equal to or higher than before
- [ ] No public API changes (unless explicitly intended and spec'd)
- [ ] Performance benchmarks show no regression > 20%
- [ ] Changeset is created (no version bump for pure refactor)
