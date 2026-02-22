# 07 - Traceability Matrix Template

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-07 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/07-traceability-matrix-template.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

A Requirements Traceability Matrix (RTM) maps each regulatory requirement to the specification section(s) that address it, implementation artifacts that realize it, and validation tests that verify it. This section defines the RTM framework used across all `@hex-di` packages.

Per-package compliance documents provide package-specific RTM entries. This cross-cutting document provides the shared structure and completeness requirements.

---

## RTM Structure

### Forward Traceability (Requirement → Evidence)

Forward traceability demonstrates that every requirement has been addressed in the specification, implemented in code, and verified by tests.

| Regulatory Clause | Requirement | Spec Section | Implementation Artifact | Test Case(s) | Status |
|-------------------|------------|-------------|------------------------|---------------|--------|
| _e.g., 21 CFR 11.10(e)_ | _Audit trail requirement_ | _Section reference_ | _Source file(s)_ | _Test file(s) and IQ/OQ/PQ step(s)_ | _Implemented / Planned / N/A_ |

### Backward Traceability (Evidence → Requirement)

Backward traceability demonstrates that every specification section, implementation artifact, and test case traces back to a regulatory requirement. This detects orphaned specifications or tests that serve no regulatory purpose.

| Spec Section | Implementation Artifact | Test Case(s) | Regulatory Clause(s) |
|-------------|------------------------|---------------|---------------------|
| _Section reference_ | _Source file(s)_ | _Test file(s)_ | _Regulatory basis for this spec section_ |

---

## Regulatory Clause Coverage

The following regulatory clauses MUST be addressed (either as "Implemented", "Consumer Responsibility", or "Not Applicable with justification") in each per-package RTM:

### 21 CFR Part 11

| Clause | Topic | Typical Library Relevance |
|--------|-------|--------------------------|
| 11.10(a) | Validation | Formal specifications + invariants |
| 11.10(b) | Accurate copies | Serialization round-trip |
| 11.10(c) | Record retention | Data retention guidance |
| 11.10(d) | System access | Access control mechanisms |
| 11.10(e) | Audit trails | Error traceability, audit logging |
| 11.10(f) | Operational checks | Type-safe validation, exhaustiveness |
| 11.10(g) | Authority checks | Authorization enforcement |
| 11.10(h) | Device checks | Platform API validation, self-tests |
| 11.10(i) | Training | Training guidance |
| 11.10(j) | Accountability | Document control |
| 11.10(k) | Open system controls | Encryption, digital signatures |

### EU GMP Annex 11

| Section | Topic | Typical Library Relevance |
|---------|-------|--------------------------|
| 1 | Risk Management | ADRs, FMEA |
| 2 | Personnel | Training requirements |
| 3 | Suppliers | Supplier assessment |
| 4 | Validation | Formal specifications |
| 5-7 | Data | Data integrity controls |
| 9 | Audit Trails | Audit trail mechanisms |
| 10 | Change Management | Change control procedures |
| 11 | Periodic Review | Continuous verification |
| 12 | Security | Access controls |
| 13 | Incident Management | Error handling patterns |
| 17 | Archiving | Data retention, decommissioning |

---

## Not Applicable Clause Register

```
REQUIREMENT: For each regulatory clause classified as "Not Applicable", the RTM MUST
             include a documented justification explaining why the clause does not apply
             to the specific library. Generic dismissals (e.g., "N/A") are not acceptable
             — the justification MUST reference the library's scope and architecture.
```

### N/A Justification Template

| Regulatory Clause | Topic | N/A Justification |
|-------------------|-------|-------------------|
| _e.g., 21 CFR 11.50_ | _Signature manifestation_ | _The library provides data integrity primitives, not identity management. Electronic signatures are outside library scope._ |

---

## RTM Completeness Validation

```
REQUIREMENT: The RTM MUST be validated for completeness as part of each specification
             release. Completeness validation MUST confirm:

             (a) Every regulatory clause in the tables above has an entry (Implemented,
                 Consumer Responsibility, or N/A with justification).
             (b) Every "Implemented" entry has at least one spec section reference,
                 one implementation artifact, and one test case.
             (c) No orphaned spec sections exist (every section traces to a requirement).
             (d) No orphaned test cases exist (every test traces to a requirement).

RECOMMENDED: RTM completeness validation SHOULD be automated as part of the CI
             pipeline where feasible (e.g., a script that parses the RTM markdown
             and verifies all cells are populated).
```

---

## RTM Versioning

```
REQUIREMENT: The RTM MUST include a version identifier and a change history. The RTM
             version MUST be updated whenever entries are added, modified, or removed.
             The change history MUST document the reason for each change and the
             specification revision that triggered it.
```
