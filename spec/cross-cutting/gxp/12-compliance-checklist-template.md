# 12 - Compliance Checklist Template

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-12 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/12-compliance-checklist-template.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

This section provides a pre-deployment compliance verification checklist template for GxP organizations deploying `@hex-di` packages. The checklist ensures all compliance prerequisites are satisfied before the system is declared GxP-validated.

Per-package compliance documents may add package-specific checklist items.

---

## Pre-Deployment Compliance Verification Checklist

### System Classification

- [ ] System classified as "open" or "closed" per 21 CFR 11.3 with documented rationale
- [ ] Classification reviewed and approved by QA Reviewer
- [ ] Classification documented in the computerized system validation plan (CSVP)

### Supplier Assessment

- [ ] Supplier assessment completed for each `@hex-di` package deployed
- [ ] Quality Management Representative identity verified (see [10-supplier-assessment.md](./10-supplier-assessment.md))
- [ ] Supplier Quality Agreement (SQA) executed with the HexDI project or internal self-support arrangement documented
- [ ] SQA retained in CSVP and available for regulatory inspection

### Personnel Qualification

- [ ] All personnel roles defined and documented (see [04-personnel-qualification.md](./04-personnel-qualification.md))
- [ ] All personnel have current, non-expired training for their assigned roles
- [ ] Competency assessments completed and documented for all role-specific activities
- [ ] Segregation of duties documented and enforced
- [ ] Re-training schedule established and tracking mechanism in place
- [ ] Training records available for regulatory inspection

### Version Management

- [ ] Exact version pins in `package.json` (no caret/tilde ranges)
- [ ] Lock file committed to version control
- [ ] Package integrity verified (checksums match published integrity)
- [ ] Version documented in Configuration Specification

### Validation Protocols

- [ ] DQ (Deployment Qualification) completed — all infrastructure prerequisites verified
- [ ] IQ (Installation Qualification) completed — all steps pass
- [ ] OQ (Operational Qualification) completed — all steps pass
- [ ] PQ (Performance Qualification) completed — all steps pass on production hardware
- [ ] All qualification execution records documented with executor identity, date, and evidence
- [ ] Qualification records reviewed and approved by QA Reviewer

### Risk Assessment

- [ ] FMEA completed for all GxP-critical failure modes (see [05-fmea-methodology.md](./05-fmea-methodology.md))
- [ ] All failure modes with RPN > 200 have documented mitigations reducing RPN to <= 200
- [ ] All failure modes with Severity >= 8 have explicit QA Manager risk acceptance
- [ ] Residual risk summary documented and approved

### Traceability

- [ ] Requirements Traceability Matrix (RTM) completed (see [07-traceability-matrix-template.md](./07-traceability-matrix-template.md))
- [ ] Forward traceability verified: every requirement has spec, implementation, and test evidence
- [ ] Backward traceability verified: no orphaned specs or tests
- [ ] Not Applicable clauses have documented justifications

### Change Control

- [ ] Change control procedure documented (see [08-change-control.md](./08-change-control.md))
- [ ] Version upgrade approval workflow established
- [ ] Emergency change control procedure established with QA Manager authorization chain
- [ ] Re-qualification trigger list documented and communicated to all stakeholders

### Data Retention

- [ ] Data archival policy documented (see [09-data-retention.md](./09-data-retention.md))
- [ ] Retention periods defined for all record types
- [ ] Backup strategy documented and tested
- [ ] Periodic readability verification schedule established
- [ ] Data privacy/retention interaction documented (if PII present in records)

### Audit Trail

- [ ] Audit trail mechanism deployed and verified (package-specific)
- [ ] Audit entry schema version documented
- [ ] Audit trail capacity planning completed
- [ ] Storage utilization monitoring configured

### Operational Readiness

- [ ] Operational procedures documented (monitoring, alerting, incident response)
- [ ] Periodic review schedule established (annual minimum)
- [ ] CAPA process documented and communicated
- [ ] Decommissioning procedure documented (see [11-decommissioning.md](./11-decommissioning.md))

---

## Checklist Execution

```
REQUIREMENT: The compliance checklist MUST be executed before the system is declared
             GxP-validated. Each item MUST be marked as:
             - Pass: Requirement satisfied with evidence reference
             - Fail: Requirement not satisfied — deployment MUST NOT proceed
             - N/A: Not applicable with documented justification

             The completed checklist MUST be signed by the QA Reviewer and retained
             as part of the validation evidence package.
```

### Checklist Record

| Field | Value |
|-------|-------|
| Package(s) assessed | _List of @hex-di packages_ |
| Deployment environment | _Description of target environment_ |
| Checklist executor | _Name and role_ |
| Execution date | _YYYY-MM-DD_ |
| QA Reviewer | _Name_ |
| Approval date | _YYYY-MM-DD_ |
| Overall result | _Pass / Fail_ |
| Deviations | _List of any failed items with deviation references_ |
