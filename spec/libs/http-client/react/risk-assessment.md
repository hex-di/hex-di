# @hex-di/http-client-react — Risk Assessment (FMEA)

Failure Mode and Effects Analysis for `@hex-di/http-client-react` invariants. Each invariant is analyzed using the Severity × Occurrence × Detection (S × O × D) methodology per ICH Q9 risk-proportionate assessment.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-RSK-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/risk-assessment.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## System Context

| Field | Value |
|-------|-------|
| System | `@hex-di/http-client-react` v0.1.0 |
| GAMP 5 Classification | Category 5 — Custom Software (React integration layer) |
| Assessment Scope | 5 runtime invariants (INV-HCR-1 through INV-HCR-5) |
| Parent Package Assessment | Core HTTP client failure modes are documented in [`../risk-assessment.md`](../risk-assessment.md). This document covers only React-layer invariants. |

---

## Risk Assessment Methodology

Applies the same scoring scale and thresholds as the parent package. See [`../risk-assessment.md §Risk Assessment Methodology`](../risk-assessment.md#risk-assessment-methodology) and [`spec/cross-cutting/gxp/05-fmea-methodology.md`](../../../cross-cutting/gxp/05-fmea-methodology.md) for the authoritative methodology reference.

### Scoring Scale

| Score | Severity (S) | Occurrence (O) | Detection (D) |
|-------|-------------|----------------|---------------|
| 1 | No impact | Remote (< 1 in 10,000) | Certain detection |
| 3 | Minor impact | Unlikely (1 in 1,000) | High probability |
| 5 | Moderate impact | Occasional (1 in 100) | Moderate probability |
| 7 | Significant impact | Likely (1 in 10) | Low probability |
| 10 | Critical impact / data integrity | Frequent | No detection mechanism |

**RPN = S × O × D**

### Risk Level Determination

| RPN Range | Risk Level | Required Action |
|-----------|-----------|----------------|
| 1–24 | Negligible | Compile-time enforcement only |
| 25–60 | Low | Unit test required; prose justification for Low classification |
| 61–99 | Medium | Unit test + type test required |
| 100–124 | High | Unit + type + dedicated GxP/integrity test + mutation test |
| 125+ | Critical | Mandatory corrective action before deployment |

---

## Per-Invariant FMEA

| FM-ID | Invariant | Description | S | O | D | RPN | Risk Level | Primary Failure Mode | Mitigation |
|-------|-----------|-------------|---|---|---|-----|-----------|---------------------|------------|
| FM-HCR-1 | INV-HCR-1 | Client reference not passed through | 5 | 2 | 3 | 30 | Low | Provider wraps or clones `props.client`; `useHttpClient()` returns a different reference; combinators applied before provider are not visible to descendants | Direct assignment of `props.client` to context; referential equality asserted in tests 3 and 14 |
| FM-HCR-2 | INV-HCR-2 | Hook throws on network error | 8 | 3 | 3 | 72 | **Medium** | `useHttpRequest` or `useHttpMutation` throws instead of setting `state.error`; component crashes without Error Boundary | `try/catch` wrapping of all `HttpClient` calls; `Err` results placed in state; tests 21, 40; see [INV-HC-7](../invariants.md#inv-hc-7-never-throw-contract) in parent |
| FM-HCR-3 | INV-HCR-3 | Outer provider client used in inner scope | 6 | 2 | 3 | 36 | Low | Inner `HttpClientProvider` does not shadow outer; scoped clients (e.g., authenticated) are ignored; requests use wrong client | Standard React Context nearest-provider resolution; integration test 12 verifies nested scoping |
| FM-HCR-4 | INV-HCR-4 | In-flight request not aborted on unmount | 7 | 4 | 4 | 112 | **High** | Async state update applied after unmount; React "Can't perform state update on unmounted component" warning; potential memory leak; stale response applied to wrong component | `AbortController` aborted in `useEffect` cleanup; mounted-flag guard on state update; tests 24, 25, 43 |
| FM-HCR-5 | INV-HCR-5 | Unstable context value triggers excess re-renders | 3 | 4 | 5 | 60 | Low | New context value object created on every provider re-render even when `client` prop is unchanged; all consumer components re-render unnecessarily | `useMemo` on `props.client` in provider; test 7 verifies stability with stable prop |

---

## Risk Summary

| Risk Level | Count | Invariants | Test Requirements |
|------------|-------|-----------|------------------|
| **High** | 1 | INV-HCR-4 | Unit + integration + mutation test (≥ 95%) |
| **Medium** | 1 | INV-HCR-2 | Unit test + type test |
| **Low** | 3 | INV-HCR-1, INV-HCR-3, INV-HCR-5 | Unit test (with prose justification) |
| **Negligible** | 0 | — | — |
| **Total** | 5 | | |

---

## Low-Risk Justifications

### FM-HCR-1 / INV-HCR-1: Client Reference Not Passed Through (Low — RPN 30)

**Justification**: The failure mode (provider wrapping the client) requires an explicit code error in the provider implementation. The React Context API makes direct value assignment the natural and simplest implementation. The occurrence is `O=2` (rare — requires deliberate or accidental wrapping). Detection is `O=3` (integration tests comparing `useHttpClient()` with `props.client` by reference would immediately expose this). The severity `S=5` reflects that wrong client usage would cause functional failures visible in development.

### FM-HCR-3 / INV-HCR-3: Outer Provider Client in Inner Scope (Low — RPN 36)

**Justification**: React Context nearest-ancestor resolution is a platform guarantee — React itself ensures the innermost `Provider` wins. This invariant is enforced by the React runtime, not by custom code in this package. The only way to violate it would be to bypass React's context system entirely. Occurrence is `O=2` (would require fundamentally incorrect context usage). Integration test 12 provides explicit regression coverage.

### FM-HCR-5 / INV-HCR-5: Unstable Context Value (Low — RPN 60)

**Justification**: The failure mode is a performance issue (excess re-renders), not a correctness issue. Components still receive the correct `HttpClient`. Severity `S=3` reflects minor UX degradation with no data integrity impact. Detection is `D=5` (re-render storms require profiling to detect — not immediately visible). Mitigation via `useMemo` is a standard React pattern and is explicitly tested (test 7). The low RPN (60) is at the upper boundary of Low; `useMemo` implementation and explicit test coverage are the accepted compensating controls.

---

## Risk Acceptance Criteria

| Risk Level | Acceptance Condition |
|------------|---------------------|
| **High** | Requires unit + integration tests + mutation score ≥ 95% on the relevant state-transition paths |
| **Medium** | Requires unit tests + type tests covering the failure mode |
| **Low** | Requires unit tests covering the failure mode; prose justification provided above |
| **Negligible** | No automated test required |

---

## Residual Risk Summary

| ID | Description | Compensating Controls | Review Cadence |
|----|-------------|----------------------|----------------|
| RR-HCR-1 | React 18 concurrent mode may fire effects multiple times; abort logic must be idempotent | `AbortController.abort()` is idempotent; Strict Mode double-invoke tested | React major version upgrades |
| RR-HCR-2 | `AbortController` signal passed via `HttpRequest.withSignal` — if adapter does not respect the signal, abort has no effect | Adapter contract requires signal propagation; documented in `03-hooks.md §18.4` | Per transport adapter release |

---

## Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor | Specification Author |
| Independence | Technical Reviewer reviewed FMEA scoring |
| Methodology | ICH Q9 — FMEA, RPN = S × O × D (1-10 scale) |
| Methodology Reference | [spec/cross-cutting/gxp/05-fmea-methodology.md](../../../cross-cutting/gxp/05-fmea-methodology.md) |
| Date | 2026-02-20 |

---

## Review Schedule

This FMEA is reviewed when:
- A new invariant is added to `invariants.md`
- An existing invariant is modified or withdrawn
- A React major version upgrade changes hook execution semantics
- One year has elapsed since the last review
