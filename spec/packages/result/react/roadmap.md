# Roadmap

Planned future additions to the `@hex-di/result-react` specification. Each item describes scope and rationale. Items marked "Specified" are documented but not yet implemented. Items marked "Delivered" are both specified and implemented.

## GxP Compliance

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/compliance/gxp.md](compliance/gxp.md)

## Risk Assessment

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/risk-assessment.md](risk-assessment.md)

## Traceability Matrix

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/traceability.md](traceability.md)

## Test Strategy

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/process/test-strategy.md](process/test-strategy.md)

## Definitions of Done

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/process/definitions-of-done.md](process/definitions-of-done.md)

## Change Control

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/process/change-control.md](process/change-control.md)

## Document Control Policy

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/process/document-control-policy.md](process/document-control-policy.md)

## Requirement ID Scheme

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/process/requirement-id-scheme.md](process/requirement-id-scheme.md)

## Competitor Comparisons

**Status**: Specified.

**Deliverable**: [spec/packages/result/react/comparisons/competitors.md](comparisons/competitors.md)

## Package Implementation

**Scope**: Implement the `@hex-di/result-react` package based on the 7 behavior specifications, 12 invariants, and 8 ADRs.

**Covers**:

- `Match` component with exhaustive render props
- `useResultAsync`, `useResultAction`, `useResultSuspense`, `createResultResource` hooks
- `useResult`, `useOptimisticResult`, `useSafeTry`, `useResultTransition` composition hooks
- `fromAction` utility
- TanStack Query and SWR adapters (`toQueryFn`, `toSwrFetcher`, etc.)
- Testing utilities (`setupResultReactMatchers`, `renderWithResult`, etc.)
- Server utilities (`matchResult`, `resultAction`, etc.)

**Rationale**: The specification suite is complete. Implementation follows the behavior specs with test-driven development per [definitions-of-done.md](process/definitions-of-done.md).

**Deliverable**: `@hex-di/result-react` package — implementation tracked in GitHub issues and PRs per [change-control.md](process/change-control.md)

## Independent Risk Assessment Review

**Status**: Specified (v1.0 release blocker).

**Scope**: An independent QA reviewer (no authorship of assessed invariants) reviews all 12 invariant risk classifications in [risk-assessment.md](risk-assessment.md).

**Deliverable**: Completed Assessment Provenance sign-off in the risk assessment document, merged via PR before the v1.0 release tag.

**Rationale**: ICH Q9 requires that risk assessments are proportionate and unbiased. An independent review mitigates assessor familiarity bias.

## Training Self-Assessment

**Status**: Specified (v1.0 release blocker).

**Scope**: Library maintainers complete a self-assessment against the training guidance in [compliance/gxp.md](compliance/gxp.md) to verify that the GxP training templates are executable and that the questions accurately reflect the React bindings' behavior.

**Deliverable**: Self-assessment outcome recorded in the change control review history.

**Rationale**: The training templates are consumer-facing. If the questions are ambiguous or answers are incorrect, GxP consumers will discover this during their own training programs.

## Documentation Site

**Scope**: Integration of `@hex-di/result-react` into the core library's documentation site.

**Covers**:

- Hook usage guides with interactive examples
- Component API reference
- Adapter setup guides (TanStack Query, SWR)
- Testing utility guides
- Server utility guides (RSC, Server Actions)
- Migration guide from manual Result handling to hooks

**Rationale**: Documentation quality is a major adoption driver. React-specific guides help consumers adopt Result-based patterns in their UI layer.

**Deliverable**: Documentation site section (framework shared with core — likely Docusaurus or Astro Starlight)
