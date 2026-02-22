# Traceability Matrix

Forward and backward traceability from requirements to source modules, test files, and invariants.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-REACT-TRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- traceability.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- traceability.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- traceability.md` |
| Status | Effective |

## Traceability Overview

```
Behavior Spec (FS)  →  Source Module  →  Test File (Verification)
       ↑                    ↑                      ↑
   Invariant  ←──── Risk Assessment (INV-RN) ────→  Test Coverage Target
       ↑                                           ↑
    ADR  ──────────────────────────────────────→ Affected Specs
```

## Capability-Level Traceability

| # | Capability | Behavior Spec | Source Module(s) | Risk Level | Subpath |
|---|-----------|--------------|-----------------|------------|---------|
| 1 | Components (Match) | [BEH-R01](behaviors/01-components.md) | `components/match.tsx` | INV-R4 **High**, INV-R5 Medium, INV-R12 Medium | `@hex-di/result-react` |
| 2 | Async Hooks | [BEH-R02](behaviors/02-async-hooks.md) | `hooks/use-result-async.ts`, `hooks/use-result-action.ts`, `hooks/use-result-suspense.ts`, `hooks/create-result-resource.ts` | INV-R3 **High**, INV-R2 Medium | `@hex-di/result-react` |
| 3 | Composition Hooks | [BEH-R03](behaviors/03-composition-hooks.md) | `hooks/use-result.ts`, `hooks/use-optimistic-result.ts`, `hooks/use-safe-try.ts`, `hooks/use-result-transition.ts` | INV-R3 **High** (`useSafeTry`), INV-R2 Medium (`useSafeTry`), INV-R1 Low, INV-R11 Low | `@hex-di/result-react` |
| 4 | Utilities | [BEH-R04](behaviors/04-utilities.md) | `utilities/from-action.ts` | INV-R4 **High** | `@hex-di/result-react` |
| 5 | Adapters | [BEH-R05](behaviors/05-adapters.md) | `adapters/tanstack-query.ts`, `adapters/swr.ts` | RR-R2 (residual) | `@hex-di/result-react/adapters` |
| 6 | Testing | [BEH-R06](behaviors/06-testing.md) | `testing/matchers.ts`, `testing/render-helpers.ts`, `testing/fixtures.ts`, `testing/mocks.ts`, `testing/storybook.ts` | Low | `@hex-di/result-react/testing` |
| 7 | Server | [BEH-R07](behaviors/07-server.md) | `server/match-result.ts`, `server/match-result-async.ts`, `server/match-option.ts`, `server/result-action.ts` | INV-R5 Medium, INV-R10 Low | `@hex-di/result-react/server` |

## Requirement-Level Traceability

### Behavior Spec → Requirement ID Ranges

| Behavior Spec | File | ID Range | Count | Domain |
|---------------|------|----------|:-----:|--------|
| 01 — Components | `behaviors/01-components.md` | BEH-R01-001 | 1 | Match component |
| 02 — Async Hooks | `behaviors/02-async-hooks.md` | BEH-R02-001 – BEH-R02-004 | 4 | useResultAsync, useResultAction, useResultSuspense, createResultResource |
| 03 — Composition Hooks | `behaviors/03-composition-hooks.md` | BEH-R03-001 – BEH-R03-004 | 4 | useResult, useOptimisticResult, useSafeTry, useResultTransition |
| 04 — Utilities | `behaviors/04-utilities.md` | BEH-R04-001 | 1 | fromAction |
| 05 — Adapters | `behaviors/05-adapters.md` | BEH-R05-001 – BEH-R05-005 | 5 | toQueryFn, toQueryOptions, toSwrFetcher, toMutationFn, toMutationOptions |
| 06 — Testing | `behaviors/06-testing.md` | BEH-R06-001 – BEH-R06-005 | 5 | setupResultReactMatchers, renderWithResult, createResultFixture, mockResultAsync, ResultDecorator |
| 07 — Server | `behaviors/07-server.md` | BEH-R07-001 – BEH-R07-005 | 5 | matchResult, matchResultAsync, matchOption, resultAction, "use client" boundary |

**Total**: 25 requirements across 7 behavior specifications (24 testable via test files, 1 verified by build checks).

> **Note on BEH-R07-005**: This requirement is a non-functional guidance section ("use client" Boundary Guidance), not a function or component. It is verified by the build check (`tsc -p tsconfig.build.json` + "No `"use client"` directive in `/server` subpath exports" — see [DoD § 11](process/definitions-of-done.md#11-build)) and the server boundary integration tests (INV-R10), not by a dedicated test file. It is exempt from Cucumber acceptance tests per [DoD § 6](process/definitions-of-done.md#6-cucumber-acceptance-tests).

### Requirement → Test File Forward Traceability

Each of the 25 BEH-RXX-NNN requirements mapped to its covering test file(s). This table is the authoritative proof of forward traceability; the automated `@traces` verification script confirms it at CI time.

| Requirement | Function | Unit Test | Type Test | Integration Test | GxP Test |
|-------------|----------|-----------|-----------|-----------------|----------|
| BEH-R01-001 | `Match` | `match.test.tsx` | `match.test-d.tsx` | `async-flow.test.tsx` | N/A |
| BEH-R02-001 | `useResultAsync` | `use-result-async.test.ts` | `hooks.test-d.ts` | `async-flow.test.tsx`, `retry-flow.test.tsx` | `stale-data-prevention.test.tsx` |
| BEH-R02-002 | `useResultAction` | `use-result-action.test.ts` | `hooks.test-d.ts` | N/A | `error-as-value.test.tsx` |
| BEH-R02-003 | `useResultSuspense` | `use-result-suspense.test.tsx` | `hooks.test-d.ts` | `resource-suspense.test.tsx` | `error-as-value.test.tsx` |
| BEH-R02-004 | `createResultResource` | `create-result-resource.test.tsx` | N/A | `resource-suspense.test.tsx` | N/A |
| BEH-R03-001 | `useResult` | `use-result.test.ts` | `hooks.test-d.ts` | N/A | N/A |
| BEH-R03-002 | `useOptimisticResult` | `use-optimistic-result.test.ts` | `hooks.test-d.ts` | `react19-hooks.test.tsx` | N/A |
| BEH-R03-003 | `useSafeTry` | `use-safe-try.test.ts` | `hooks.test-d.ts` | `safe-try-flow.test.tsx` | `error-as-value.test.tsx` |
| BEH-R03-004 | `useResultTransition` | `use-result-transition.test.ts` | `hooks.test-d.ts` | `react19-hooks.test.tsx` | N/A |
| BEH-R04-001 | `fromAction` | `from-action.test.ts` | `utilities.test-d.ts` | N/A | N/A |
| BEH-R05-001 | `toQueryFn` | `tanstack-query.test.ts` | `adapters.test-d.ts` | N/A | `adapter-envelope.test.ts` |
| BEH-R05-002 | `toQueryOptions` | `tanstack-query.test.ts` | `adapters.test-d.ts` | N/A | `adapter-envelope.test.ts` |
| BEH-R05-003 | `toSwrFetcher` | `swr.test.ts` | `adapters.test-d.ts` | N/A | `adapter-envelope.test.ts` |
| BEH-R05-004 | `toMutationFn` | `tanstack-query.test.ts` | `adapters.test-d.ts` | N/A | `adapter-envelope.test.ts` |
| BEH-R05-005 | `toMutationOptions` | `tanstack-query.test.ts` | `adapters.test-d.ts` | N/A | `adapter-envelope.test.ts` |
| BEH-R06-001 | `setupResultReactMatchers` | `matchers.test.ts` | N/A | N/A | N/A |
| BEH-R06-002 | `renderWithResult` | `render-helpers.test.tsx` | N/A | N/A | N/A |
| BEH-R06-003 | `createResultFixture` | `fixtures.test.ts` | N/A | N/A | N/A |
| BEH-R06-004 | `mockResultAsync` | `mocks.test.ts` | N/A | N/A | N/A |
| BEH-R06-005 | `ResultDecorator` | `storybook.test.ts` | N/A | N/A | N/A |
| BEH-R07-001 | `matchResult` | `match-result.test.ts` | `server.test-d.ts` | `server-client-boundary.test.ts` | N/A |
| BEH-R07-002 | `matchResultAsync` | `match-result-async.test.ts` | `server.test-d.ts` | `server-client-boundary.test.ts` | N/A |
| BEH-R07-003 | `matchOption` | `match-option.test.ts` | `server.test-d.ts` | `server-client-boundary.test.ts` | N/A |
| BEH-R07-004 | `resultAction` | `result-action.test.ts` | `server.test-d.ts` | `server-client-boundary.test.ts` | N/A |
| BEH-R07-005 | "use client" boundary | N/A | N/A | `server-client-boundary.test.ts` (INV-R10) | N/A |

> **BEH-R07-005 verification**: Build check (`tsc -p tsconfig.build.json` + no `"use client"` in `/server` exports) — see [DoD § 11](process/definitions-of-done.md#11-build).

### Additional Requirement Types

| Prefix | ID Range | Count | Domain |
|--------|----------|:-----:|--------|
| ATR-R | ATR-R1 – ATR-R3 | 3 | Audit trail requirements |
| DRR-R | DRR-R1 – DRR-R3 | 3 | Data retention requirements |
| RR-R | RR-R1 – RR-R6 | 6 | Residual risks |

### ATR/DRR/RR Requirement Traceability

ATR-R and DRR-R are normative requirements defined in [compliance/gxp.md](compliance/gxp.md). They are consumer-facing guidance rather than testable library functions — the library enables compliance but consumers implement it. RR-R are residual risks with compensating controls documented in [risk-assessment.md](risk-assessment.md).

| ID | Description | Verification Mechanism | Type |
|----|-------------|------------------------|------|
| ATR-R1 | Hook result audit logging via `inspect()`/`inspectErr()` | Consumer-implemented; guidance verified by PR review. OQ protocol includes ATR-R1 compliance scenario. | Consumer guidance |
| ATR-R2 | Server-side audit logging for `resultAction` | Consumer-implemented; guidance verified by PR review. OQ protocol includes ATR-R2 compliance scenario. | Consumer guidance |
| ATR-R3 | Match branch rendering audit logging | Consumer-implemented; guidance verified by PR review. OQ protocol includes ATR-R3 compliance scenario. | Consumer guidance |
| DRR-R1 | Result serialization via core `toJSON()` before storage | Consumer-implemented; delegates to core library SPEC-GXP-001 DRR-1/DRR-2. No library-level test — core library covers serialization. | Consumer guidance (delegated) |
| DRR-R2 | `resultAction` serialization boundary — non-serializable fields stripped | `tests/gxp/` (indirectly via INV-R10 server purity); [OQ-R020](compliance/gxp.md) and [PQ-R010](compliance/gxp.md) in GxP validation protocol | OQ/PQ verified |
| DRR-R3 | Adapter envelope unwrap — Result lost after adapter transformation | `tests/gxp/adapter-envelope.test.ts`; [OQ-R014, OQ-R015](compliance/gxp.md) in GxP validation protocol | GxP test + OQ verified |
| RR-R1 | React state shallow reference (mutable nested values) | Compensating control: deep freeze before `ok()`/`err()`. Inherited from core RR-1. | Compensating control |
| RR-R2 | Adapter envelope loss (cache contains unwrapped values) | Compensating control: DRR-R3 pre-logging guidance. Verified by `gxp/adapter-envelope.test.ts`. | Compensating control |
| RR-R3 | Client-only audit gap (client crash before log write) | Compensating control: ATR-R2 server-side logging for server actions; fire-and-forget for client hooks. | Compensating control |
| RR-R4 | Suspense timing window (data exists but not yet logged) | Compensating control: log in `useEffect` after Result received; sub-millisecond gap in practice. | Compensating control |
| RR-R5 | Sole-maintainer bus factor | Compensating control: escalation procedure, consumer fork contingency, MIT license. | Compensating control |
| RR-R6 | Concurrent Mode audit timing (interrupted renders) | Compensating control: only committed renders trigger `useEffect`; `useLayoutEffect` for critical paths; idempotent audit store. | Compensating control |

## Invariant Traceability

| Invariant | Description | ICH Q9 Risk | Unit Tests | Type Tests | Integration Tests | GxP Integrity Tests |
|-----------|-------------|:-----------:|:----------:|:----------:|:-----------------:|:-------------------:|
| INV-R1 | Stable Action References | **Low** | `use-result.test.ts` | N/A | N/A | N/A |
| INV-R2 | Abort on Cleanup | **Medium** | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts` | N/A | `async-flow.test.tsx`, `safe-try-flow.test.tsx` | N/A |
| INV-R3 | Generation Guard | **High** | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts` | N/A | `async-flow.test.tsx`, `safe-try-flow.test.tsx` | `stale-data-prevention.test.tsx` |
| INV-R4 | No Exception Promotion | **High** | Architecture-level; all component/hook tests | N/A | All integration tests | `error-as-value.test.tsx` |
| INV-R5 | Match & Server Utility Exhaustiveness | **Medium** | `match.test.tsx`, `match-result.test.ts`, `match-result-async.test.ts`, `match-option.test.ts` | `match.test-d.tsx`, `server.test-d.ts` | N/A | N/A |
| INV-R6 | Suspense Contract | **Medium** | `use-result-suspense.test.tsx`, `create-result-resource.test.tsx` | N/A | `resource-suspense.test.tsx` | N/A |
| INV-R7 | Strict Mode Compatibility | **Low** | `use-result-async.test.ts`, `strict-mode.test.tsx` | N/A | N/A | N/A |
| INV-R8 | Retry Abort Propagation | **Medium** | `use-result-async.test.ts` | N/A | `retry-flow.test.tsx` | N/A |
| INV-R9 | Resource Cache Isolation | **Medium** | `create-result-resource.test.tsx` | N/A | `resource-suspense.test.tsx` | N/A |
| INV-R10 | Server Utility Purity | **Low** | `match-result.test.ts`, `result-action.test.ts` | N/A | `server-client-boundary.test.ts` | N/A |
| INV-R11 | React Version Fail-Fast | **Low** | `use-optimistic-result.test.ts`, `use-result-transition.test.ts`, `react19-fail-fast.test.ts` | N/A | `react19-hooks.test.tsx` | N/A |
| INV-R12 | Match Branch State Independence | **Medium** | `match.test.tsx` | N/A | `async-flow.test.tsx` | N/A |

## ADR Traceability

| ADR | Decision | Invariants Affected | Behavior Specs Affected |
|-----|----------|---------------------|------------------------|
| ADR-R001 | No ResultBoundary | INV-R4 | 01 |
| ADR-R002 | Subpath Exports | INV-R10 | All (export structure) |
| ADR-R003 | Naming Conventions | None (naming style) | All |
| ADR-R004 | Adapter Strategy | INV-R9 | 05 |
| ADR-R005 | No Option Hooks | None (scope exclusion) | 01, 03 |
| ADR-R006 | Render Props over Compound | INV-R5 | 01 |
| ADR-R007 | Adapter Naming | None (naming style) | 05 |
| ADR-R008 | No Do-Notation Hook | None (scope exclusion) | 03 |

> **Note**: INV-R11 (React Version Fail-Fast) is not derived from any ADR. It was formalized during the GxP specification review to capture a pre-existing documented behavior (React 18 import-time throw for React 19-only hooks) as a testable invariant.

## Test File Map

### Unit + Type Test Files

| Behavior Spec | Unit Test File(s) | Type Test File(s) |
| ------------- | ----------------- | ----------------- |
| [01-components.md](behaviors/01-components.md) | `tests/unit/components/match.test.tsx` | `tests/types/match.test-d.tsx` |
| [02-async-hooks.md](behaviors/02-async-hooks.md) | `tests/unit/hooks/use-result-async.test.ts`, `tests/unit/hooks/use-result-action.test.ts`, `tests/unit/hooks/use-result-suspense.test.tsx`, `tests/unit/hooks/create-result-resource.test.tsx` | `tests/types/hooks.test-d.ts` |
| [03-composition-hooks.md](behaviors/03-composition-hooks.md) | `tests/unit/hooks/use-result.test.ts`, `tests/unit/hooks/use-optimistic-result.test.ts`, `tests/unit/hooks/use-safe-try.test.ts`, `tests/unit/hooks/use-result-transition.test.ts` | `tests/types/hooks.test-d.ts` |
| [04-utilities.md](behaviors/04-utilities.md) | `tests/unit/utilities/from-action.test.ts` | `tests/types/utilities.test-d.ts` |
| [05-adapters.md](behaviors/05-adapters.md) | `tests/unit/adapters/tanstack-query.test.ts` (BEH-R05-001, -002, -004, -005), `tests/unit/adapters/swr.test.ts` (BEH-R05-003) | `tests/types/adapters.test-d.ts` |
| [06-testing.md](behaviors/06-testing.md) | `tests/unit/testing/matchers.test.ts`, `tests/unit/testing/render-helpers.test.tsx`, `tests/unit/testing/fixtures.test.ts`, `tests/unit/testing/mocks.test.ts`, `tests/unit/testing/storybook.test.ts` | N/A — infrastructure |
| [07-server.md](behaviors/07-server.md) | `tests/unit/server/match-result.test.ts`, `tests/unit/server/match-result-async.test.ts`, `tests/unit/server/match-option.test.ts`, `tests/unit/server/result-action.test.ts` | `tests/types/server.test-d.ts` |

> **Note on BEH-R07-005**: See [Requirement-Level Traceability](#requirement-level-traceability) for verification method.

### Integration Test Files

| Test File | Behavior Specs Covered | Invariants Verified |
| --------- | ---------------------- | ------------------- |
| `tests/integration/async-flow.test.tsx` | BEH-R02-001, BEH-R01-001 | INV-R2, INV-R3 |
| `tests/integration/retry-flow.test.tsx` | BEH-R02-001 | INV-R8 |
| `tests/integration/resource-suspense.test.tsx` | BEH-R02-003, BEH-R02-004 | INV-R6, INV-R9 |
| `tests/integration/safe-try-flow.test.tsx` | BEH-R03-003 | INV-R2 |
| `tests/integration/react19-hooks.test.tsx` | BEH-R03-002, BEH-R03-004 | INV-R11 |
| `tests/integration/server-client-boundary.test.ts` | BEH-R07-001, BEH-R07-002, BEH-R07-003, BEH-R07-004 | INV-R10 |

### GxP Integrity Test Files

| Test File | Requirement/Invariant | Purpose |
| --------- | --------------------- | ------- |
| `tests/gxp/stale-data-prevention.test.tsx` | INV-R3 | Adversarial timing scenarios for generation guard |
| `tests/gxp/error-as-value.test.tsx` | INV-R4 | No exception promotion across all hooks/components |
| `tests/gxp/adapter-envelope.test.ts` | DRR-R3 | Result envelope unwrap contract for all adapters |

## Coverage Metrics

| Metric | Target | Regulatory Basis |
|--------|--------|------------------|
| Forward traceability (BEH → test) | 100% of BEH-RXX-NNN IDs have at least one test (24/25 via test files, 1/25 via build check) | GAMP 5 §D.4 |
| Backward traceability (test → BEH) | 100% of test cases trace to a BEH-RXX-NNN, INV-RN, or DRR-RN ID | GAMP 5 §D.4 |
| Invariant forward traceability | 100% of invariants have tests | GAMP 5 |
| ATR/DRR/RR forward traceability | 100% of ATR-RN, DRR-RN, RR-RN IDs have a documented verification mechanism (test file, OQ/PQ entry, build check, or compensating control) | GAMP 5 §D.4 |
| Unit test line coverage | > 95% | FDA Software Validation |
| GxP integrity test coverage | 100% of INV-R3, INV-R4, DRR-R3 | Data integrity focus |
| Orphaned requirements | 0 BEH-RXX-NNN IDs without tests | GAMP 5 |
| Orphaned tests | 0 tests without a BEH-RXX-NNN, INV-RN, or DRR-RN reference | GAMP 5 |

## Traceability Verification

### Automated Verification

The CI pipeline includes a traceability verification step that runs `grep -r "@traces" tests/` and compares the output against the requirement ID list (BEH-R01-001 through BEH-R07-005, INV-R1 through INV-R12, DRR-R3). This automated check ensures:

1. Every requirement ID has at least one `@traces` annotation (forward traceability)
2. Every `@traces` annotation references a valid requirement ID (backward traceability)
3. No orphaned requirements or orphaned tests exist

**Implementation**: A verification script ([`spec/packages/result/react/scripts/verify-traceability.sh`](scripts/verify-traceability.sh)) runs in the CI pipeline as a pre-release gate. No version may be published to npm until automated traceability verification passes in CI. Pass `--strict` to convert SKIPs (for not-yet-created package artifacts) into FAILs for release gating.

### Manual Verification Checklist

Before each major release, verify:

- [ ] Every test file in the Invariant Traceability table exists and contains at least one test case
- [ ] Every `@traces` annotation references a valid requirement or invariant ID
- [ ] No orphaned test files exist (tests without a corresponding BEH-RXX or INV-RN reference)
- [ ] Coverage targets are met (check CI coverage reports)
- [ ] Automated verification script (`spec/packages/result/react/scripts/verify-traceability.sh --strict`) passes in CI

### Verification Status

| Metric | Status | Notes |
|--------|--------|-------|
| Test file existence | **Pre-release gate** — verify before v1.0.0 publish | Test files listed are target names; automated script must confirm existence before first release |
| BEH-RXX-NNN completeness | Verified at specification time | 25/25 requirements traced (24 to test files, 1 to build check) |
| Invariant completeness | Verified at specification time | 12/12 invariants traced |
| ADR completeness | Verified at specification time | 8/8 ADRs traced |
| ATR-RN completeness | Verified at specification time | 3/3 audit trail requirements traced to verification mechanisms |
| DRR-RN completeness | Verified at specification time | 3/3 data retention requirements traced to verification mechanisms |
| RR-RN completeness | Verified at specification time | 6/6 residual risks traced to compensating controls |
| Automated verification script | Implemented | [`spec/packages/result/react/scripts/verify-traceability.sh`](scripts/verify-traceability.sh) |

## Maintenance

This traceability matrix must be updated when:

1. A new behavior requirement (BEH-RXX-NNN) is added
2. A new invariant (INV-RN) is added
3. A new ADR is created
4. Test files are renamed or reorganized
5. Risk assessment invariant classifications change
6. New audit trail (ATR-RN) or data retention (DRR-RN) requirements are added

The [change-control.md](process/change-control.md) procedure requires traceability matrix updates for all Major and Critical changes.
