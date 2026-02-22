# Definitions of Done

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-REACT-PRC-005 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/definitions-of-done.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/definitions-of-done.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/definitions-of-done.md` |
| Status | Effective |

Per-feature acceptance criteria that must be satisfied before a feature is considered complete.

## Feature Definition of Done

A feature is **done** when all of the following are satisfied:

### 1. Specification

- [ ] Behavior spec file exists in `spec/packages/result/react/behaviors/` covering all public API for the feature
- [ ] All new types are documented in `spec/packages/result/react/type-system/`
- [ ] New glossary terms are added to `spec/packages/result/react/glossary.md`
- [ ] If an architectural decision was made, an ADR exists in `spec/packages/result/react/decisions/`
- [ ] If a new runtime guarantee is introduced, an invariant is added to `spec/packages/result/react/invariants.md`
- [ ] `spec/packages/result/react/overview.md` is updated: API tables, source file map, dependency graph
- [ ] Cross-reference links between specs are valid
- [ ] If a roadmap item is delivered, its status in [roadmap.md](../roadmap.md) is updated to "Specified" or "Delivered" with a link to the deliverable

### 2. Unit Tests (Vitest)

- [ ] Runtime tests exist in `*.test.ts` / `*.test.tsx` covering every public function, hook, and component
- [ ] Hook tests use `renderHook()` from `@testing-library/react`
- [ ] Component tests use `render()` from `@testing-library/react`
- [ ] Both Ok and Err variants are tested for every Result-consuming hook and component
- [ ] Async hook tests run under `React.StrictMode` wrapper to verify INV-R7 compatibility (no double state updates, no stale data from double-mount)
- [ ] Edge cases are tested: pending state, abort, retry, unmount during async
- [ ] Error paths are tested: rejected promises, thrown exceptions in consumer callbacks
- [ ] If the hook requires React 19, import-time fail-fast test exists per INV-R11
- [ ] Line coverage > 95% for new code
- [ ] Branch coverage > 90% for new code
- [ ] Function coverage = 100% for new code

### 3. Type Tests (Vitest typecheck)

- [ ] Type tests exist in `*.test-d.ts` / `*.test-d.tsx` for every public type signature
- [ ] Inference is verified: `expectTypeOf(useResultAsync(...)).toEqualTypeOf<Expected>()`
- [ ] Match component prop inference is verified: both `ok` and `err` render props infer correct types
- [ ] Negative cases use `// @ts-expect-error` to confirm invalid usage fails
- [ ] Tests pass against the supported TypeScript version matrix

### 4. Integration Tests

- [ ] Integration tests exist in `*.test.tsx` covering cross-hook and cross-component interactions
- [ ] Async flow tests verify abort-on-cleanup (INV-R2) and generation guard (INV-R3) under realistic component trees
- [ ] Suspense integration tests verify `useResultSuspense` with `<Suspense>` boundaries (INV-R6)
- [ ] Resource tests verify cache isolation (INV-R9) across multiple `createResultResource` instances
- [ ] Server boundary tests verify `/server` exports work in RSC contexts (INV-R10)
- [ ] If the feature involves server action utilities, serialization boundary tests verify non-serializable fields are dropped correctly ([DRR-R2](../compliance/gxp.md#data-retention-requirements))
- [ ] Retry flow tests verify abort propagation during retries (INV-R8)
- [ ] `useSafeTry` composition tests verify sequential `yield*` operations with early `Err` short-circuit and abort-on-cleanup under realistic component trees (BEH-R03-003)
- [ ] If the feature involves React 19-only hooks (`useOptimisticResult`, `useResultTransition`), integration tests verify optimistic state revert on transition completion and concurrent update cancellation
- [ ] If the feature involves adapter functions (`toQueryFn`, `toQueryOptions`, `toSwrFetcher`, `toMutationFn`, `toMutationOptions`), unit tests are sufficient — adapter integration tests with third-party libraries (TanStack Query, SWR) are not required because adapters are thin wrappers with no internal state. The adapter test files (`tests/adapters/tanstack-query.test.ts`, `tests/adapters/swr.test.ts`) verify the Ok-unwrap and Err-throw contract without importing the third-party library.

### 5. GxP Integrity Tests

- [ ] If the feature involves generation guard logic (stale data prevention), `gxp/stale-data-prevention.test.tsx` is updated
- [ ] If the feature involves error-as-value enforcement (no exception promotion), `gxp/error-as-value.test.tsx` is updated
- [ ] If the feature involves abort behavior or async state management, relevant GxP tests verify no phantom state updates
- [ ] If the feature involves adapter functions (`toQueryFn`, `toSwrFetcher`, etc.), `gxp/adapter-envelope.test.ts` verifies the Result envelope is correctly unwrapped (Ok value returned, Err value thrown) and that JSDoc on each adapter references [DRR-R3](../compliance/gxp.md#data-retention-requirements) pre-logging guidance
- [ ] All GxP-relevant invariants (INV-R3, INV-R4) have dedicated integrity tests

### 6. Cucumber Acceptance Tests

- [ ] Feature file exists in `features/` corresponding to the behavior spec (e.g., `features/match.feature` for BEH-R01, `features/use-result-async.feature` for BEH-R02-001)
- [ ] Scenarios cover the primary success path (happy path)
- [ ] Scenarios cover error/failure paths
- [ ] Scenarios cover edge cases listed in the behavior spec
- [ ] Scenarios are tagged with `@BEH-RXX-NNN` referencing the requirement ID they cover
- [ ] Step definitions are implemented in `features/steps/`
- [ ] All scenarios pass

**Exemptions**: The following behavior specs are exempt from Cucumber acceptance tests because they define infrastructure or non-interactive guidance rather than user-facing behavior:

- **BEH-R06 (Testing Utilities)**: Test infrastructure (`setupResultReactMatchers`, `createResultFixture`, `mockResultAsync`, `renderWithResult`, `ResultDecorator`) is verified by its own unit tests. Cucumber scenarios would test test helpers with test helpers — the value is negligible.
- **BEH-R07-005 ("use client" Boundary Guidance)**: This is a documentation/guidance section, not a function. It is verified by the build check in section 11 ("No `"use client"` directive in `/server` subpath exports") and the server boundary integration tests (INV-R10).

### 7. Documentation

- [ ] JSDoc comments on every public export (hook, component, adapter, utility)
- [ ] `@example` tag with runnable code snippet in JSDoc
- [ ] `@since` tag with the version that introduced the API
- [ ] `@see` tag linking to the relevant spec file
- [ ] No `@todo` or `TODO` comments in committed code

### 8. API Surface

- [ ] No unintended new exports (check against `spec/packages/result/react/overview.md` API tables)
- [ ] Subpath exports in `package.json` are updated if new subpaths are added
- [ ] Internal modules remain blocked via `"./internal/*": null`
- [ ] React 19-only APIs are gated with version fail-fast (INV-R11)

### 9. Traceability

- [ ] Every testable requirement in the behavior spec has a `BEH-RXX-NNN` ID as a Markdown heading (following the [Requirement Identification Scheme](requirement-id-scheme.md))
- [ ] The BEH-RXX-NNN ID range for the behavior spec is added or updated in the [traceability matrix](../traceability.md)
- [ ] Unit tests reference the `BEH-RXX-NNN` ID in their `describe` or `it` block name
- [ ] Type tests reference the `BEH-RXX-NNN` ID where applicable
- [ ] `scripts/verify-traceability.sh` passes with 0 orphaned requirements and 0 orphaned tests

### 10. GxP Compliance

- [ ] If a new invariant is introduced, it is assessed in the [Per-Invariant FMEA](../risk-assessment.md#per-invariant-fmea) table (severity, detectability, risk level, failure mode, mitigation)
- [ ] If a new invariant is introduced, it is added to the [Invariant Traceability](../traceability.md#invariant-traceability) table with the applicable test levels
- [ ] If a new invariant is introduced, the [Risk Summary](../risk-assessment.md#risk-summary) counts are updated
- [ ] If the feature introduces a new ATR-RN or DRR-RN requirement, it is added to the compliance traceability in [gxp.md](../compliance/gxp.md)
- [ ] If the feature affects ALCOA+ properties, the ALCOA+ compliance mapping in [gxp.md](../compliance/gxp.md) is reviewed and updated if needed

### 11. Build

- [ ] `tsc -p tsconfig.build.json` succeeds with no errors
- [ ] `pnpm audit` reports no critical/high vulnerabilities
- [ ] Bundle size delta is documented (if significant)
- [ ] No `"use client"` directive in `/server` subpath exports

### 12. Changeset

- [ ] Changeset file created via `pnpm changeset`
- [ ] Semantic version impact is correct (feat -> minor, fix -> patch, breaking -> major)
- [ ] Changeset description is clear and end-user-oriented

### 13. Performance

- [ ] If the feature adds or modifies a hook, referential stability of returned callbacks and values is verified across re-renders (INV-R1 pattern — no spurious re-renders)
- [ ] If the feature adds or modifies a component, rendering does not trigger unnecessary unmount/remount cycles
- [ ] No performance regression > 20% on existing render benchmarks (if benchmarks exist)

### 14. Process

- [ ] Change classified per [change-control.md](change-control.md) categories (Critical/Major/Minor/Editorial) and corresponding regression scope applied
- [ ] If a new CI job is required, [test-strategy.md](test-strategy.md) is updated with the job definition
- [ ] If the change touches a GxP escalation trigger (generation guard, abort behavior, `Match` exhaustiveness, adapter transformations, server utilities, invariants), the change category is escalated per [change-control.md § Change Classification](change-control.md#2-change-classification)

## Bug Fix Definition of Done

A bug fix is **done** when:

- [ ] Root cause is identified and documented in the commit message
- [ ] Regression test is added that fails without the fix and passes with it
- [ ] Existing tests still pass (no regressions)
- [ ] Spec is updated if the bug reveals an underspecified behavior
- [ ] Changeset is created (patch version)

## Refactoring Definition of Done

A refactoring is **done** when:

- [ ] All existing tests pass without modification (behavior preserved)
- [ ] No public API changes (unless explicitly intended and spec'd)
- [ ] Performance benchmarks show no regression > 20%
- [ ] Changeset is created (no version bump for pure refactor)

## Release Checklist

Before merging a "Version Packages" PR:

- [ ] All CI jobs pass (unit, type, integration, GxP integrity, Cucumber, build, exports, traceability verification)
- [ ] Changelog is accurate and complete
- [ ] No `TBD` entries in spec files referenced by the release
- [ ] GxP traceability matrix in `traceability.md` is updated for new invariants
- [ ] Risk assessment in `risk-assessment.md` is updated for new invariants
- [ ] `scripts/verify-traceability.sh --strict` passes with 0 orphaned requirements and 0 orphaned tests (lenient mode is not acceptable for releases)
- [ ] All referenced implementation artifacts exist and are operational: GxP test files, Cucumber feature files, traceability verification script
- [ ] [roadmap.md](../roadmap.md) status reflects delivered items
- [ ] README is updated if public API surface changed

## Annual GxP Periodic Review

Per [change-control.md § Periodic Review](change-control.md#periodic-review), annually within Q1 (by March 31):

- [ ] All 12 invariants (INV-R1 through INV-R12): risk classifications in [risk-assessment.md](../risk-assessment.md) remain accurate
- [ ] ALCOA+ compliance mapping in [gxp.md](../compliance/gxp.md): feature-to-principle mappings are current
- [ ] Residual risks (RR-R1 through RR-R6): compensating controls in [risk-assessment.md](../risk-assessment.md) are still adequate
- [ ] Audit trail requirements (ATR-R1 through ATR-R3): guidance reflects current React patterns
- [ ] Data retention requirements (DRR-R1 through DRR-R3): serialization guidance is current
- [ ] Training guidance: competency assessment questions reflect current API surface
- [ ] Re-Evaluation Log in [risk-assessment.md](../risk-assessment.md#re-evaluation-log) updated with review outcome
- [ ] Review PR merged or "no changes required" recorded

### Additional v1.0 Release Blockers

The following items are required specifically for the v1.0 GA release:

- [ ] **Independent risk assessment review**: [Sign-off block](../risk-assessment.md#assessment-provenance) completed by an independent QA reviewer with no authorship of assessed invariants
- [ ] **Core library v1.0 released**: `@hex-di/result` v1.0 must be released before `@hex-di/result-react` v1.0 (core types are a peer dependency)
- [ ] **React 18 + 19 compatibility verified**: Full test suite passes against both React 18 and React 19, with INV-R11 fail-fast confirmed for React 18 on React 19-only hooks
