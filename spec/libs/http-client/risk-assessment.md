# @hex-di/http-client — Risk Assessment (FMEA)

Failure Mode and Effects Analysis for `@hex-di/http-client` invariants. Each invariant is analyzed using the Severity × Occurrence × Detection (S × O × D) methodology per ICH Q9 risk-proportionate assessment.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-RSK-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/risk-assessment.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## System Context

| Field | Value |
|-------|-------|
| System | `@hex-di/http-client` v0.1.0 |
| GAMP 5 Classification | Category 5 — Custom Software (configurable transport behavior) |
| Applicable Regulations | 21 CFR Part 11 (audit trail), EU GMP Annex 11, ALCOA+ (WHO TRS 1033), ICH Q9 |
| GxP Relevance | High — used in laboratory systems for audit trail transmission and data exchange |
| Assessment Scope | 10 runtime invariants (INV-HC-1 through INV-HC-10) |

---

## Risk Assessment Methodology

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
| 1–24 | Negligible | Compile-time enforcement only (no automated test required) |
| 25–60 | Low | Unit test required; prose justification for Low classification |
| 61–99 | Medium | Unit test + type test required |
| 100–124 | High | Unit + type + GxP integrity test + mutation test |
| 125+ | Critical | Mandatory corrective action before deployment |

---

## Per-Invariant FMEA

| FM-ID | Invariant | Description | S | O | D | RPN | Risk Level | Primary Failure Mode | Mitigation |
|-------|-----------|-------------|---|---|---|-----|-----------|---------------------|------------|
| FM-1 | INV-HC-1 | Request mutation after construction | 7 | 3 | 3 | 63 | **Medium** | Combinator mutates input request instead of returning new one; shared references observe unexpected state | `Object.freeze()` on construction; combinators create new objects; tests RQ-004, RQ-005 |
| FM-2 | INV-HC-2 | Body re-read data loss | 5 | 3 | 3 | 45 | Low | Same accessor called twice re-reads stream; second call fails or returns stale data | Per-accessor cache slot; tests RS-004 |
| FM-3 | INV-HC-3 | Silent `BodyAlreadyConsumed` | 7 | 5 | 3 | 105 | **High** | Different body accessor called after consumption returns wrong data or silently empty result instead of explicit error | `consumed` flag + explicit `BodyAlreadyConsumed` error; tests RS-005; GxP test: `gxp-body-consumption.test.ts` |
| FM-4 | INV-HC-4 | Error mutation post-construction | 9 | 2 | 2 | 36 | Low | Error `reason`, `message`, or `cause` modified after production; audit trail records tampered error | `Object.freeze()` in error constructors; tests ER-001 through ER-003; `Object.isFrozen` assertion; GxP test `gxp-error-freeze.test.ts` assigned as defense-in-depth (beyond Low-risk minimum) |
| FM-5 | INV-HC-5 | Zero mutation window violation | 9 | 1 | 2 | 18 | Negligible | Intermediate mutable reference escapes between populate and freeze steps; concurrent observer sees partial error | Single-expression populate+freeze pattern enforced by code structure (Negligible classification stands); defense-in-depth unit tests EF-001 – EF-005 in `error-freezing.test.ts` verify correct pattern implementation |
| FM-6 | INV-HC-6 | Unhandled error `_tag` | 5 | 2 | 2 | 20 | Negligible | New error variant added without updating switch exhaustiveness; runtime falls through to wrong branch | Sealed union type + TypeScript exhaustiveness checking; no runtime mechanism needed |
| FM-7 | INV-HC-7 | Unexpected throw | 8 | 3 | 3 | 72 | **Medium** | `HttpClient.execute` or a convenience method throws instead of returning `Err`; callers without `try/catch` observe unhandled rejection | `ResultAsync.fromPromise` wrapping of all transport calls; tests CL-001 through CL-015 |
| FM-8 | INV-HC-8 | Missing request context in errors | 5 | 3 | 5 | 75 | **Medium** | `HttpResponse.request` is `undefined` or stale; error messages lack method/URL context; audit entries incomplete | `request` field set by transport adapter at response construction time; required by interface type; tests RS-011 |
| FM-9 | INV-HC-9 | Undefined combinator order | 6 | 3 | 3 | 54 | Low | Combinator execution order differs from composition order; `bearerAuth` applied after `filterStatusOk` produces unexpected behavior | Fixed composition via `pipe()`; unit tests for each combinator; integration tests for common chains |
| FM-10 | INV-HC-10 | Header case collision | 4 | 4 | 4 | 64 | **Medium** | `"Content-Type"` and `"content-type"` stored as separate entries; incorrect headers sent to server | `createHeaders` lowercases all keys; `getHeader` lowercases lookup key; tests CT-001, CT-004, CT-006 |

---

## Risk Summary

| Risk Level | Count | Invariants | Test Requirements |
|------------|-------|-----------|------------------|
| **High** | 1 | INV-HC-3 | Unit + Type + GxP integrity test + mutation test |
| **Medium** | 4 | INV-HC-1, INV-HC-7, INV-HC-8, INV-HC-10 | Unit test + type test |
| **Low** | 3 | INV-HC-2, INV-HC-4, INV-HC-9 | Unit test (with prose justification) |
| **Negligible** | 2 | INV-HC-5, INV-HC-6 | Compile-time only (INV-HC-5 additionally has defense-in-depth unit tests EF-001–EF-005) |
| **Total** | 10 | | |

---

## Low-Risk Justifications

### FM-2 / INV-HC-2: Body Re-Read (Low — RPN 45)

**Justification**: Occurrence is `O=3` (unlikely but possible in multi-accessor code paths). Detection is `O=3` (the caching mechanism is deterministic and straightforward to test). The failure mode (same accessor returning cached result) is benign — no data corruption occurs, only potential performance overhead if the caller expects re-parsing. The `BodyAlreadyConsumed` error (INV-HC-3) is the high-risk case and is separately assessed as FM-3.

### FM-4 / INV-HC-4: Error Mutation (Low — RPN 36)

**Justification**: Occurrence is `O=2` (rare — requires a downstream handler to deliberately or accidentally mutate a field). `Object.freeze()` is applied at construction time, so accidental mutation requires a deliberate `Object.defineProperty` bypass or a non-strict environment that silently ignores mutations. Detection is `D=2` — `Object.isFrozen` checks in tests provide high assurance. The severity `S=9` reflects the GxP impact if mutation occurred, but the low occurrence and high detection make the overall RPN acceptable.

**Elevated coverage note**: Although Low risk requires only unit tests, `gxp-error-freeze.test.ts` is assigned as a voluntary GxP-level test. This is defense-in-depth: the high severity score (`S=9`) warrants additional verification even though the RPN falls below the High threshold. The GxP test verifies `Object.isFrozen` assertions against all three error constructor functions and documents the ALCOA+ "Original" principle being enforced.

### FM-9 / INV-HC-9: Combinator Order (Low — RPN 54)

**Justification**: Combinator execution order is determined at composition time by the `pipe()` call — it is not dynamic. A developer who composes combinators in the wrong order will observe incorrect behavior during development/testing, not in production. The fixed `pipe()` semantics and comprehensive unit tests for common chains provide adequate detection.

---

## Risk Acceptance Criteria

| Risk Level | Acceptance Condition |
|------------|---------------------|
| **High** | Requires dedicated GxP integrity test file + mutation score ≥ 80% on the relevant code path |
| **Medium** | Requires unit tests + type tests covering the failure mode; mutation score ≥ 70% |
| **Low** | Requires unit tests covering the failure mode; prose justification provided above |
| **Negligible** | No automated test required; compile-time enforcement confirmed by TypeScript |

---

## Residual Risk Summary

| ID | Description | ALCOA+ Impact | Compensating Controls | Review Cadence |
|----|-------------|--------------|----------------------|----------------|
| RR-1 | `BodyAlreadyConsumed` in deeply nested async pipelines may surface as confusing error | Legible | Explicit `_tag: "HttpResponseError"` and `reason: "BodyAlreadyConsumed"` in error; error code `HTTP013` | Annual |
| RR-2 | Transport adapter freezing bugs (adapter forgets to set `request` on response) | Attributable | Interface type requires `request: HttpRequest`; TypeScript enforces at adapter implementation time | Per adapter release |
| RR-3 | Error `cause` is not frozen (intentional) | Original | `cause` is a platform error (`TypeError`, `DOMException`) whose prototype must remain intact; `reason` and `message` are frozen | Annual |

---

## Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor | Specification Author |
| Independence | Technical Reviewer reviewed FMEA scoring |
| Methodology | ICH Q9 — FMEA, RPN = S × O × D (1-10 scale) |
| Methodology Reference | [spec/cross-cutting/gxp/05-fmea-methodology.md](../../cross-cutting/gxp/05-fmea-methodology.md) |
| Date | 2026-02-20 |

---

## Review Schedule

This FMEA is reviewed when:
- A new invariant is added to `invariants.md`
- An existing invariant is modified or withdrawn
- A GxP test fails and the failure mode was not anticipated in this assessment
- The package is adopted in a new regulatory context (e.g., FDA-regulated clinical system)
- One year has elapsed since the last review

FMEA failure modes link back to invariants in both directions:
- `invariants.md` references `FM-N` for each invariant
- This document references `INV-HC-N` for each failure mode
