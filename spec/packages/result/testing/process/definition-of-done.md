---
document_id: SPEC-RT-PROC-001
title: "Definition of Done"
version: "1.4.0"
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
  - version: "1.4.0"
    date: 2026-02-16T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "Cross-document coverage audit: updated Release Checklist CI job list to include all 7 CI gates (coverage, mutation, traceability were missing), updated Annual Review residual risk range from RR-T3 to RR-T4"
  - version: "1.3.0"
    date: 2026-02-15T14:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added recovery procedure verification to Annual Review Checklist per Finding 1 (EU Annex 11 §16)"
  - version: "1.2.0"
    date: 2026-02-15T11:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP spec review remediation: added Annual GxP Periodic Review section with review checklist per EU Annex 11 §11 (Finding 4)"
  - version: "1.1.0"
    date: 2026-02-15T09:00:00Z
    author: Mohammad AL Mechkor
    changes: "GxP remediation: added compensating controls (Finding 1), added GxP verification steps to Feature and Release checklists, version bump"
  - version: "1.0.0"
    date: 2026-02-15T08:00:00Z
    author: Mohammad AL Mechkor
    changes: "Initial approved version"
---

# Definition of Done

Per-feature acceptance criteria for the `@hex-di/result-testing` package. This is a lighter checklist than `@hex-di/result`'s DoD, reflecting the nature of a testing utility library.

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Behavior spec file exists in `spec/packages/result/testing/behaviors/` covering all public API for the feature
- [ ] All behavior IDs follow the `BEH-TXX-NNN` convention
- [ ] New glossary terms are added to `spec/packages/result/testing/glossary.md`
- [ ] If an architectural decision was made, an ADR exists in `spec/packages/result/testing/decisions/`
- [ ] If a new runtime guarantee is introduced, an invariant is added to `spec/packages/result/testing/invariants.md`
- [ ] `spec/packages/result/testing/overview.md` is updated: API tables, source file map

### 2. Unit Tests (Vitest)

- [ ] Runtime tests exist in `*.test.ts` covering every public function
- [ ] Tests cover both positive and negative cases for each matcher and assertion helper
- [ ] `.not` negation is tested for every custom matcher
- [ ] Error message content is verified in test assertions
- [ ] Edge cases are tested: `undefined` values, `null` values, empty objects, nested structures
- [ ] Line coverage > 95% for new code
- [ ] Branch coverage > 90% for new code

### 3. Type Tests (Vitest typecheck)

- [ ] Type tests exist in `*.test-d.ts` for every public function signature
- [ ] Type narrowing is verified: after `expectOk(result)`, the return type is `T`
- [ ] Vitest module augmentation is verified: matchers are autocompleted and type-checked
- [ ] Negative cases use `// @ts-expect-error` to confirm invalid usage fails

### 4. Cucumber Acceptance Tests

- [ ] Feature file exists in `features/` corresponding to the behavior spec (e.g., `features/matchers.feature` for BEH-T01, `features/gxp-utilities.feature` for BEH-T04)
- [ ] Scenarios cover the primary success path (happy path)
- [ ] Scenarios cover error/failure paths
- [ ] Scenarios cover edge cases listed in the behavior spec
- [ ] Scenarios are tagged with `@BEH-TXX-NNN` referencing the requirement ID they cover
- [ ] Step definitions are implemented in `features/steps/`
- [ ] All scenarios pass

### 5. Documentation

- [ ] JSDoc comments on every public export
- [ ] `@example` tag with runnable code snippet in JSDoc
- [ ] `@since` tag with the version that introduced the API
- [ ] `@see` tag linking to the relevant spec file

### 6. API Surface

- [ ] No unintended new exports (check against `spec/packages/result/testing/overview.md` API tables)
- [ ] Subpath exports in `package.json` are updated if new subpaths are added
- [ ] Only `@hex-di/result` public API is used (no internal imports) — per [TINV-5](../invariants.md#tinv-5-public-api-only)

### 7. Build

- [ ] `tsc -p tsconfig.build.json` succeeds with no errors
- [ ] `pnpm audit` reports no critical/high vulnerabilities

### 8. GxP Compliance

- [ ] If adding or modifying BEH-T04 (GxP Test Utilities — High risk), verify that assertions are tested against both genuine and forged inputs
- [ ] Risk Assessment in `spec/packages/result/testing/overview.md` reviewed: new behaviors assigned a risk level, residual risk table updated if new High-risk behavior added
- [ ] Traceability matrix in `spec/packages/result/testing/traceability.md` updated: forward traceability (Section 8) maps new behaviors to test files and test case names
- [ ] Backward traceability confirmed: new behaviors mapped to parent invariants or API surface in Sections 1–6
- [ ] No orphaned behaviors (every BEH-T ID has at least one test case in forward traceability)
- [ ] No orphaned tests (every test case references a BEH-T ID)

### 9. Changeset

- [ ] Changeset file created via `pnpm changeset`
- [ ] Semantic version impact is correct (feat -> minor, fix -> patch, breaking -> major)
- [ ] Changeset description is clear and end-user-oriented

## Bug Fix Definition of Done

A bug fix is **done** when:

- [ ] Root cause is identified and documented in the commit message
- [ ] Regression test is added that fails without the fix and passes with it
- [ ] Existing tests still pass (no regressions)
- [ ] Spec is updated if the bug reveals an underspecified behavior
- [ ] Changeset is created (patch version)

## Release Checklist

Before merging a "Version Packages" PR:

- [ ] All CI jobs pass (unit, type, Cucumber, coverage, mutation, build, traceability)
- [ ] Changelog is accurate and complete
- [ ] No `TBD` entries in spec files referenced by the release
- [ ] `spec/packages/result/testing/overview.md` reflects the released API surface
- [ ] Peer dependency on `@hex-di/result` is compatible with the latest release
- [ ] Peer dependency on `vitest` version range is correct
- [ ] All spec files have consistent `version` in frontmatter matching the release
- [ ] Revision history entries added for all modified spec files
- [ ] Forward traceability coverage in `traceability.md` Section 8 is 100%
- [ ] No open Critical or Major GxP findings

## Annual GxP Periodic Review

Per EU Annex 11 §11, the specification suite and testing library are reviewed annually to confirm they remain in a valid state. The review is triggered by the anniversary of the last `last_reviewed` date across spec frontmatter, or earlier if a major parent library release occurs.

### Review Checklist

- [ ] **Residual risks reviewed** — RR-T1 through RR-T4 (in `overview.md`) assessed; compensating controls still effective and operational
- [ ] **Parent invariant coverage current** — `traceability.md` Section 7 checked against the latest `@hex-di/result` invariants; no new GxP-relevant invariants added without corresponding test utilities
- [ ] **Compensating controls verified** — CI coverage gates, type-level tests, traceability verification script, and PR merge requirements confirmed active in CI configuration
- [ ] **Peer dependency compatibility** — `@hex-di/result` and `vitest` peer dependency ranges reviewed against latest releases
- [ ] **No open Critical or Major findings** — Any outstanding GxP findings from previous reviews resolved or accepted with documented rationale
- [ ] **Spec frontmatter updated** — `last_reviewed` date updated in all spec file frontmatter
- [ ] **Recovery procedure tested** — Verified that the specification repository can be cloned from remote and all specification versions are accessible via `git log` and `git show`
- [ ] **Review recorded** — Review date, reviewer name, and outcome recorded in the revision history of `overview.md`
