# 05 - FMEA Methodology

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-05 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/05-fmea-methodology.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

Failure Mode and Effects Analysis (FMEA) is a systematic method for identifying potential failure modes, evaluating their effects, and prioritizing them for mitigation. This section defines the FMEA methodology used across all `@hex-di` packages, aligned with ICH Q9 (Quality Risk Management) and GAMP 5.

Per-package compliance documents provide package-specific failure modes and RPN scores. This cross-cutting document provides the shared scoring scales and methodology.

---

## FMEA Scoring Scales

### Severity Scale (S)

| Score | Level | Definition | ALCOA+ Impact |
|-------|-------|-----------|---------------|
| 10 | Catastrophic | Complete loss of data integrity or patient safety impact. Records are irrecoverably corrupted, falsified, or lost. | Violates multiple ALCOA+ principles simultaneously |
| 8-9 | Critical | Significant data integrity compromise. Records are incorrect but potentially recoverable. Regulatory finding likely. | Violates Accurate, Original, or Complete |
| 6-7 | Major | Functional degradation affecting reliability but not directly compromising data integrity. Compensating controls may partially mitigate. | May affect Consistent or Available |
| 4-5 | Moderate | Operational inconvenience. Workaround available. No direct regulatory impact. | Minor impact on Legible or Available |
| 2-3 | Minor | Cosmetic or diagnostic quality issue. No regulatory or operational impact. | No ALCOA+ impact |
| 1 | Negligible | No observable effect. | None |

### Occurrence Scale (O)

| Score | Level | Definition | Frequency |
|-------|-------|-----------|-----------|
| 10 | Almost certain | Failure occurs in nearly every deployment or operation cycle | > 1 in 10 |
| 8-9 | High | Failure occurs frequently under normal operating conditions | 1 in 100 |
| 6-7 | Moderate | Failure occurs occasionally; not predictable but not rare | 1 in 1,000 |
| 4-5 | Low | Failure occurs infrequently; requires specific triggering conditions | 1 in 10,000 |
| 2-3 | Very low | Failure is rare; only under exceptional circumstances | 1 in 100,000 |
| 1 | Extremely unlikely | Failure has never been observed and is theoretically implausible | < 1 in 1,000,000 |

### Detection Scale (D)

| Score | Level | Definition | Detection Mechanism |
|-------|-------|-----------|---------------------|
| 10 | Undetectable | No mechanism exists to detect the failure before it impacts data | No automated checks |
| 8-9 | Very low detection | Failure may be detected by manual audit review but not by automated systems | Manual audit review only |
| 6-7 | Low detection | Failure detected by periodic monitoring but not in real-time | Periodic log review, scheduled checks |
| 4-5 | Moderate detection | Failure detected by automated monitoring with some delay | Runtime health checks, periodic diagnostics |
| 2-3 | High detection | Failure detected immediately by automated checks at system boundary | Startup self-tests, CI pipeline gates |
| 1 | Certain detection | Failure is prevented at compile time or detected by type system | TypeScript type errors, linter rules |

---

## Risk Priority Number (RPN)

```
RPN = Severity (S) x Occurrence (O) x Detection (D)
```

| RPN Range | Risk Level | Action Required |
|-----------|-----------|-----------------|
| **201-1000** | **High** | Mitigation required before release. MUST implement additional controls, modify design, or add detection mechanisms to reduce RPN below 200. |
| **101-200** | **Medium** | Mitigation recommended. SHOULD implement additional controls. Document risk acceptance if no mitigation is implemented. |
| **1-100** | **Low** | Acceptable risk. Standard testing and monitoring sufficient. Document the assessment. |

```
REQUIREMENT: All failure modes with RPN > 200 MUST have documented mitigation actions
             that reduce the post-mitigation RPN to 200 or below. The mitigation MUST
             be verified by test evidence (IQ/OQ/PQ protocol steps).

REQUIREMENT: All failure modes with Severity >= 8 MUST be documented in the risk
             assessment regardless of RPN, even if Occurrence and Detection scores
             result in a low RPN. High-severity failure modes require explicit risk
             acceptance by the QA Manager.
```

---

## FMEA Table Template

Per-package compliance documents provide specific FMEA tables using this format:

| ID | Failure Mode | Effect | S | O | D | RPN | Mitigation | Post-Mitigation RPN | Verification |
|----|-------------|--------|---|---|---|-----|------------|---------------------|--------------|
| FM-1 | _Description_ | _Impact on system and data_ | _1-10_ | _1-10_ | _1-10_ | _S×O×D_ | _Controls implemented_ | _Revised RPN_ | _IQ/OQ/PQ step_ |

---

## Simplified Risk Assessment (for Deterministic Libraries)

For deterministic, stateless libraries with no external I/O (e.g., `@hex-di/result`), a full FMEA is disproportionate. These libraries have no stochastic failure modes, no environmental variability, and no I/O-dependent behavior.

A simplified Severity × Detectability model retains the two factors meaningful for code-level defects:

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Severity** | Impact on data integrity and patient safety if the invariant is violated | Critical / Major / Minor |
| **Detectability** | Likelihood that a violation would be caught by the test suite before release | High / Medium / Low |

### Risk Level Determination (Simplified)

| Severity | Detectability | Risk Level |
|----------|--------------|-----------|
| Critical (data integrity / patient safety) | Any | **High** |
| Major (operational reliability) | Medium or Low | **High** |
| Major (operational reliability) | High | **Medium** |
| Minor (developer experience) | Any | **Low** |

This approach is consistent with ICH Q9's principle that "the level of effort, formality, and documentation of the quality risk management process should be commensurate with the level of risk" (ICH Q9 §2).

---

## STRIDE Threat Model (for Security-Sensitive Libraries)

Libraries with access control, authentication, or authorization features (e.g., `@hex-di/guard`) SHOULD supplement FMEA with STRIDE threat modeling:

| Threat | Description | Mitigation Approach |
|--------|-----------|---------------------|
| **S**poofing | Attacker assumes another identity | Authentication verification, signature validation |
| **T**ampering | Unauthorized modification of data | Immutability (Object.freeze), hash chain integrity |
| **R**epudiation | Denial of having performed an action | Audit trail with hash chain, electronic signatures |
| **I**nformation Disclosure | Unauthorized access to data | Access controls, encryption, credential protection |
| **D**enial of Service | Making system unavailable | Rate limiting, resource bounds, timeout controls |
| **E**levation of Privilege | Gaining unauthorized access levels | RBAC enforcement, scope isolation, authority checks |

Per-package compliance documents provide package-specific STRIDE analysis where applicable.

---

## Risk Acceptance Criteria

```
REQUIREMENT: Residual risk is accepted when ALL of the following criteria are met for
             the applicable risk level:
```

| Risk Level | Acceptance Criteria |
|-----------|---------------------|
| **High** | All test levels pass (unit, type, mutation, integration, GxP-specific). Zero surviving mutants in critical code paths. Dedicated GxP tests pass. |
| **Medium** | At least core test levels pass (unit, type, mutation, integration). Mutation score >= 90% for the affected module. |
| **Low** | Standard unit test coverage sufficient. No formal mutation score target required. |

```
REQUIREMENT: If any Critical or Major finding remains open, a formal risk acceptance
             decision MUST be documented by QA management with justification per ICH Q9
             Section 6 (Risk Control), including identification of compensating controls
             and a timeline for closure.
```
