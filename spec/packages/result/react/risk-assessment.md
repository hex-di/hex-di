# Risk Assessment

Failure Mode and Effects Analysis (FMEA) for `@hex-di/result-react`, following ICH Q9 risk management principles.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-REACT-RSK-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- risk-assessment.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- risk-assessment.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- risk-assessment.md` |
| Status | Effective |

## System Context

`@hex-di/result-react` is a **React UI bindings** package — providing hooks, components, and adapters for `@hex-di/result`. It runs at **render-time** (browser/server) and has:

- **No external I/O**: The package performs no network requests, no file access, no database queries. All async behavior is delegated to consumer-provided functions.
- **No patient data contact**: The package renders consumer-provided `Result<T, E>` values — it does not inspect, transform, or persist the contained data.
- **No configuration**: Behavior is fixed by source code (GAMP 5 Category 3). No runtime configuration can alter safety-critical behavior.
- **Deterministic behavior**: All components and hooks produce identical output for identical input (referentially transparent, modulo React lifecycle scheduling).

### GAMP 5 Classification

| Usage | Category | Rationale |
|-------|----------|-----------|
| Consumed as-is from npm | **Category 3** (non-configured COTS) | No configuration; behavior fixed by source code |
| Used as dependency in a validated system | **Category 3** within parent system | Document version, verify behavior in system context |
| Forked or modified | **Category 5** (custom application) | Full lifecycle validation required |

### Risk Level Determination

| Factor | Assessment | Rationale |
|--------|------------|-----------|
| Patient safety impact | **None** | UI rendering library — no direct clinical decision support |
| Data integrity impact | **Medium** | Generation guard (INV-R3) and error-as-value (INV-R4) directly affect whether correct data is displayed |
| Process criticality | **Low** | Aids UI development but is not a manufacturing or clinical process control |
| Regulatory visibility | **Low** | Not directly inspected; may be part of a validated UI application |

**Overall system risk: LOW with targeted High-risk controls** — The system is low-criticality (UI rendering library, no direct patient impact), but INV-R3 (generation guard) and INV-R4 (no exception promotion) are classified as **High** risk due to their data integrity implications. These two invariants receive enhanced testing (all 4 test levels + dedicated GxP integrity tests). The remaining 10 invariants are Medium or Low risk.

Per ICH Q9, a low-risk system with targeted high-risk invariants requires proportionate validation: comprehensive testing of high-risk invariants, standard testing of medium-risk invariants, and basic verification of low-risk invariants.

## Risk Assessment Methodology

Because `@hex-di/result-react` is a deterministic UI bindings package with no external I/O, no randomness, and no configuration, **probability of occurrence** is not a meaningful variable — failures are either present in the code (detected by tests) or not. The assessment uses a two-factor model (Severity x Detectability) consistent with the core library's approach in SPEC-GXP-001.

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Severity** | Impact on data integrity and patient safety if the invariant is violated | Critical / Major / Minor |
| **Detectability** | Likelihood that a violation would be caught by the test suite before release | High / Medium / Low (lower detectability = harder to catch = higher risk) |

### Risk Level Determination Matrix

| Severity | Detectability | ICH Q9 Risk Level |
|----------|--------------|-------------------|
| Critical (data integrity / patient safety) | Any | **High** |
| Major (operational reliability) | Medium or Low | **High** |
| Major (operational reliability) | High | **Medium** |
| Minor (developer experience) | Any | **Low** |

## Per-Invariant FMEA

| Invariant | Description | Severity | Detectability | Risk | Failure Mode | Mitigation | Test Coverage |
|-----------|-------------|----------|--------------|------|-------------|------------|---------------|
| INV-R1 | Stable Action References | Minor | High | **Low** | Action callbacks change identity across renders, causing spurious re-renders and effect re-executions | `useMemo`/`useCallback` with stable deps; referential equality assertions in unit tests | `use-result.test.ts` |
| INV-R2 | Abort on Cleanup | Major | High | **Medium** | In-flight operations not cancelled on unmount or deps change, causing phantom state updates on unmounted components | `useEffect` cleanup with `AbortController.abort()`; unmount lifecycle tests | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts`, `async-flow.test.tsx`, `safe-try-flow.test.tsx` |
| INV-R3 | Generation Guard | Critical | High | **High** | Stale async response overwrites newer data — displayed value does not match most recent request. **GxP impact**: incorrect data informing regulated decisions | Generation counter with `useRef`; adversarial timing tests in `gxp/stale-data-prevention.test.tsx` | `use-result-async.test.ts`, `use-result-action.test.ts`, `use-safe-try.test.ts`, `async-flow.test.tsx`, `safe-try-flow.test.tsx`, `gxp/stale-data-prevention.test.tsx` |
| INV-R4 | No Exception Promotion | Critical | High | **High** | Errors thrown as exceptions instead of flowing as `Err` values, causing error type loss via React error boundaries. **GxP impact**: silent error suppression per 21 CFR 11.10(e) | Architecture-level constraint (ADR-R001); absence-of-throw verification in `gxp/error-as-value.test.tsx` | `gxp/error-as-value.test.tsx`, all component/hook tests |
| INV-R5 | Match & Server Utility Exhaustiveness | Major | High | **Medium** | Missing `ok` or `err` handler compiles without error, enabling silent omission of error states in Match component, `matchResult`, `matchResultAsync`, or `matchOption` | Required props/fields in TypeScript interfaces; type-level exhaustiveness tests | `match.test-d.tsx`, `server.test-d.ts`, `match-result.test.ts`, `match-result-async.test.ts`, `match-option.test.ts` |
| INV-R6 | Suspense Contract | Major | High | **Medium** | `useResultSuspense` or `createResultResource.read()` throws Error instead of Promise for pending state, triggering error UI instead of loading UI | Promise throw pattern; Suspense integration tests | `use-result-suspense.test.tsx`, `create-result-resource.test.tsx`, `resource-suspense.test.tsx` |
| INV-R7 | Strict Mode Compatibility | Minor | High | **Low** | Double-mount in dev mode produces duplicate state updates or memory leaks | Generation + abort patterns handle double-mount; StrictMode test wrapper | `use-result-async.test.ts` |
| INV-R8 | Retry Abort Propagation | Major | High | **Medium** | Abort signal does not cancel pending retries, causing orphaned `fn()` calls after unmount | `signal.aborted` check before each retry; timer clearing on abort; retry cancellation tests | `use-result-async.test.ts`, `retry-flow.test.tsx` |
| INV-R9 | Resource Cache Isolation | Major | High | **Medium** | `invalidate()` on one resource affects another resource's cache | Closure-scoped cache per `createResultResource` call; cross-resource assertion tests | `create-result-resource.test.tsx`, `resource-suspense.test.tsx` |
| INV-R10 | Server Utility Purity | Minor | High | **Low** | `/server` exports import React runtime, causing RSC bundler errors | No `react` imports except type-level JSX; import resolution tests in non-React environment | `match-result.test.ts`, `result-action.test.ts`, `server-client-boundary.test.ts` |
| INV-R11 | React Version Fail-Fast | Minor | High | **Low** | React 19-only hooks silently degrade on React 18 instead of throwing at import time | Module-scope version check; React 18 import-time error tests | `use-optimistic-result.test.ts`, `use-result-transition.test.ts`, `react19-hooks.test.tsx` |
| INV-R12 | Match Branch State Independence | Major | High | **Medium** | When Result variant flips (Ok → Err or vice versa), component state from the previous branch leaks into the new branch — form inputs, refs, and effects persist across branches. **GxP impact**: stale data from ok branch visible alongside error state | Distinct `key` props on each branch fragment; branch state isolation tests | `match.test.tsx`, `async-flow.test.tsx` |

## Risk Summary

| Risk Level | Count | Invariants | Testing Requirement |
|------------|-------|------------|---------------------|
| High | 2 | INV-R3, INV-R4 | All 4 test levels + dedicated GxP integrity tests |
| Medium | 6 | INV-R2, INV-R5, INV-R6, INV-R8, INV-R9, INV-R12 | Unit + Type + Integration |
| Low | 4 | INV-R1, INV-R7, INV-R10, INV-R11 | Standard unit test coverage sufficient |

## Residual Risk Summary

| ID | Risk Description | ALCOA+ Impact | Compensating Controls | Documented In | Review Cadence |
|----|-----------------|---------------|----------------------|---------------|----------------|
| RR-R1 | **React state shallow reference**: React `useState` stores values by reference — the Result shell is frozen (INV-1 via core) but nested values are mutable | Original | Same deep freeze wrapper pattern as core RR-1; values should be deep-frozen before wrapping with `ok()`/`err()` | [gxp.md § ALCOA+ Gap](compliance/gxp.md#alcoa-gap-react-state-shallow-reference) | Annual GxP review |
| RR-R2 | **Adapter envelope loss**: `toQueryFn`, `toSwrFetcher`, etc. break the Result envelope — adapter cache contains unwrapped values, not branded Results | Complete, Enduring | DRR-R3 requires capturing Results via `inspect()`/`inspectErr()` before adapter transformation | [gxp.md § DRR-R3](compliance/gxp.md#data-retention-requirements) | Annual GxP review |
| RR-R3 | **Client-only audit gap**: Hook results are only available on the client. If the client crashes before audit logging completes, the audit entry is lost | Contemporaneous, Complete | ATR-R2 requires server-side audit logging for server actions; for client-only hooks, consumers should implement optimistic audit writes with retry | [gxp.md § ATR-R2](compliance/gxp.md#normative-requirements) | Annual GxP review |
| RR-R4 | **Suspense timing window**: Between `useResultSuspense` throwing the pending promise and the resolved Result being rendered, there is a timing window where data exists but has not been audit-logged | Contemporaneous | Consumers should log in `useEffect` after Result is received; timing gap is sub-millisecond in practice | [invariants.md § INV-R6](invariants.md#inv-r6-suspense-contract) | Annual GxP review |
| RR-R5 | **Sole-maintainer bus factor**: GxP incident response targets depend on maintainer availability | Available | Shared mitigation with core: escalation procedure, consumer fork contingency, public source code under MIT license. The independent reviewer (once appointed) serves as secondary contact. If the primary maintainer is unavailable for > 10 business days, the consuming organization should activate their fork contingency plan. | [gxp.md § GxP Incident Reporting](compliance/gxp.md#gxp-incident-reporting) | Annual GxP review |
| RR-R6 | **Concurrent Mode audit timing**: React Concurrent Mode can interrupt and replay renders. `useEffect`-based audit logs (ATR-R1) may not fire for interrupted renders | Contemporaneous, Complete | Only committed renders trigger `useEffect` — interrupted renders produce no visible UI. For critical paths, `useLayoutEffect` ensures synchronous audit writes. Strict Mode double-fires are idempotent if audit store deduplicates by generation counter. | [gxp.md § ATR-R1](compliance/gxp.md#normative-requirements) | Annual GxP review |

**Maintenance**: This table is updated whenever a new residual risk is identified or an existing risk is resolved. Resolved risks are not removed — they are marked with a "Resolved" status and the resolution date.

## Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor role | Library maintainer with GxP domain knowledge |
| Independent reviewer role | Independent QA reviewer with no authorship of the assessed invariants |
| Last independent review date | Pending — required before v1.0 release |
| Initial assessment date | Part of specification v1.0.0 |
| Review cadence | Re-assessed annually as part of the GxP compliance review cycle, and upon introduction of any new invariant |
| Methodology reference | Adapted from ICH Q9 Section 5 (Risk Assessment) using a simplified Severity x Detectability model, consistent with SPEC-GXP-001 |

## Review Schedule

This FMEA must be re-evaluated under the following circumstances:

1. **New invariant addition** — When a new invariant (INV-R12+) is added, assess its severity, detectability, and risk level. Update the FMEA table and risk summary.
2. **Major version release** — Review all invariant risk classifications before each major version release. Verify that mitigations remain effective and that no new high-risk failure modes have been introduced.
3. **React major version change** — When React releases a new major version, review INV-R2 (abort-on-cleanup), INV-R6 (Suspense contract), INV-R7 (Strict Mode), and INV-R11 (version fail-fast) specifically, as React internal behavior changes may affect hook lifecycle guarantees.
4. **Core library major version change** — When `@hex-di/result` releases a major version, review all invariants that depend on core behavior (INV-R4 error-as-value, INV-R5 Match exhaustiveness).
5. **Post-incident** — If a defect is reported in production use (stale data displayed, exception thrown from hook, phantom state update), add a new residual risk entry or update the affected invariant's risk classification.
6. **Annually** — As part of the periodic review defined in [change-control.md](process/change-control.md#periodic-review), re-evaluate the FMEA to confirm risk levels remain accurate and mitigations are still in place. The annual review must be completed within **Q1 of each calendar year** (by March 31). The **project maintainer** (or a designated reviewer if the maintainer is unavailable) is responsible for initiating the review by opening a PR that updates this document. If no changes are needed, the review PR should update the Re-Evaluation Log below to record that the review was performed and no changes were required.

### Re-Evaluation Log

Record each FMEA re-evaluation here. Each entry corresponds to a Git PR that reviewed this document.

| Date | Trigger | Reviewer | PR | Changes Made |
|------|---------|----------|-----|-------------|
| 2026-02-15 | Initial assessment | Mohammad AL Mechkor | — (initial creation) | Initial FMEA creation — 11 invariants assessed. 2 High-risk (INV-R3, INV-R4), 5 Medium-risk, 4 Low-risk. 6 residual risks documented with compensating controls. |
| 2026-02-16 | Coverage review | Mohammad AL Mechkor | — (coverage review) | INV-R12 (Match Branch State Independence) added — Medium risk. INV-R3 expanded to include useSafeTry. INV-R5 expanded to include server utility exhaustiveness. INV-R6 expanded to include createResultResource.read(). Totals: 12 invariants — 2 High, 6 Medium, 4 Low. |
| _YYYY-MM-DD_ | _Trigger from list above_ | _Name_ | _#NNN_ | _Summary or "No changes required"_ |

### Re-Evaluation Process

1. Review each invariant entry: verify severity and detectability scores are still accurate
2. Update risk levels for any entries with changed scores
3. Verify mitigations are still implemented and effective (cross-reference with test coverage reports)
4. Add new entries for any newly identified failure modes or invariants
5. Update the Risk Summary table if risk level distributions change
6. Review all residual risks (RR-R1 through RR-R6): verify compensating controls are still adequate
7. Record the re-evaluation in the Git history via a PR (serves as the review record)
