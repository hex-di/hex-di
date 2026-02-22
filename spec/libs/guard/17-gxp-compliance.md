# 17 - GxP Compliance Guide

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-17                                 |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-13                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
> | Classification   | GxP Compliance Guide                     |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

_Previous: [16 - Definition of Done](./16-definition-of-done.md)_

---

This document specifies how `@hex-di/guard` supports GxP-regulated environments. It covers FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ALCOA+ data integrity principles, ICH Q9, PIC/S PI 011-3, WHO TRS 996 Annex 5, and MHRA Data Integrity Guidance (2018). Non-regulated environments can skip this document entirely.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

| Keyword                             | Meaning                                                                                                          | Pharmaceutical Alignment                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **MUST** / **REQUIRED** / **SHALL** | Absolute requirement. Non-compliance is a regulatory finding.                                                    | Equivalent to "critical" controls in GAMP 5 Appendix D4 and PIC/S PI 011-3 §6.3          |
| **MUST NOT** / **SHALL NOT**        | Absolute prohibition.                                                                                            | Same severity as MUST — violation constitutes non-conformance                            |
| **SHOULD** / **RECOMMENDED**        | Valid reasons may exist to deviate, but the full implications must be understood and documented before doing so. | Equivalent to "major" controls; deviation requires documented risk assessment per ICH Q9 |
| **MAY** / **OPTIONAL**              | Truly optional. Implementation is at the organization's discretion.                                              | Equivalent to "informational" guidance; no regulatory expectation                        |

> **Applicability:** REQUIREMENT and RECOMMENDED blocks throughout this document use the above terms with their RFC 2119 meanings. Where a `REQUIREMENT` block specifies a MUST, non-compliance in a GxP deployment is a deviation that must be documented per the site's quality management system. Where a `RECOMMENDED` block specifies a SHOULD, organizations may choose an alternative approach provided the rationale is documented in the validation plan (section 67).

> **Note on MAY/OPTIONAL:** If an OPTIONAL control described in this document is implemented, its implementation becomes auditable under PIC/S PI 011-3 Section 6.5. The "optional" classification applies only to the _decision_ to implement, not to the quality of implementation. Once implemented, the control must meet the same quality and documentation standards as any other system feature.

---

## GxP Quick Start: Minimum Viable Compliance Path

For organizations deploying `@hex-di/guard` in a GxP-regulated environment for the first time, the following five steps represent the minimum viable compliance path. Complete these steps in order before first GxP deployment.

**Step 1 — Classify your system (§59)**

Determine whether your deployment is a "closed" or "open" system per 21 CFR 11.3. If audit data traverses a public network, electronic signatures cross organizational boundaries, or MCP/A2A endpoints are exposed beyond the site LAN, classify as "open." Document the classification and rationale.

**Step 2 — Configure the guard graph for GxP**

```typescript
createGuardGraph({
  gxp: true,
  auditTrailAdapter: yourDurableAdapter, // NOT NoopAuditTrail
  walStore: yourWalStore, // WAL mandatory when gxp:true
  failOnAuditError: true, // default; explicit for clarity
  maxScopeLifetimeMs: 3_600_000, // required when gxp:true
  signatureAdapter: yourHsmAdapter, // if using electronic signatures
  clockSource: ntpSynchronizedClock, // NTP-synchronized
});
```

**Step 3 — Run pre-deployment diagnostics**

```typescript
const readiness = checkGxPReadiness(guardGraph);
// Verify all 15 items pass (no FAIL results)

const pdc = checkPreDeploymentCompliance(config);
// Verify all 8 artifact references are satisfied
```

**Step 4 — Execute IQ/OQ/PQ qualification**

```typescript
const iq = await runIQ(guardGraph); // IQ-1 through IQ-12
const oq = await runOQ(guardGraph); // OQ-1 through OQ-52
const pq = await runPQ(guardGraph); // PQ-1 through PQ-10 (4-hour soak)
```

Retain all qualification reports as validation evidence.

**Step 5 — Establish operational procedures**

- [ ] Assign administrative roles and configure `AdminGuardConfig` (§64g)
- [ ] Document training records for guard operators (§64c)
- [ ] Schedule annual periodic review and penetration testing (§64, §64f-1)
- [ ] Configure completeness monitoring and health checks (§61, §07)
- [ ] Map predicate rules to guard ports and retention periods (§59, §63)

> **After deployment:** Maintain the system per sections 64 (periodic review), 64a (change control), and 64f (regulatory monitoring). Use the deviation report template (Appendix K) for any compliance deviations.

---

## Table of Contents

### [Regulatory Context](./17-gxp-compliance/01-regulatory-context.md)

- [§59 Regulatory Context](./17-gxp-compliance/01-regulatory-context.md#59-regulatory-context)
- [§60 ALCOA+ Compliance Mapping](./17-gxp-compliance/01-regulatory-context.md#60-alcoa-compliance-mapping)

### [Audit Trail Contract](./17-gxp-compliance/02-audit-trail-contract.md)

- [§61 AuditTrailPort Implementation Contract](./17-gxp-compliance/02-audit-trail-contract.md#61-audittrailport-implementation-contract)

### [Clock Synchronization](./17-gxp-compliance/03-clock-synchronization.md)

- [§62 Clock Synchronization Requirements](./17-gxp-compliance/03-clock-synchronization.md#62-clock-synchronization-requirements)

### [Data Retention](./17-gxp-compliance/04-data-retention.md)

- [§63 Data Retention Requirements](./17-gxp-compliance/04-data-retention.md#63-data-retention-requirements)
- [§63a Audit Trail Capacity Planning](./17-gxp-compliance/04-data-retention.md#63a-audit-trail-capacity-planning)
- [§63b Data Privacy and Audit Trail Retention](./17-gxp-compliance/04-data-retention.md#63b-data-privacy-and-audit-trail-retention)
- [§63c Audit Trail Archival Strategy](./17-gxp-compliance/04-data-retention.md#63c-audit-trail-archival-strategy)

### [Audit Trail Review](./17-gxp-compliance/05-audit-trail-review.md)

- [§64 Audit Trail Review Interface](./17-gxp-compliance/05-audit-trail-review.md#64-audit-trail-review-interface)
- [§64e Audit Trail Export Formats](./17-gxp-compliance/05-audit-trail-review.md#64e-audit-trail-export-formats)

### [Administrative Controls](./17-gxp-compliance/06-administrative-controls.md)

- [§64a Policy Change Control](./17-gxp-compliance/06-administrative-controls.md#64a-policy-change-control)
- [§64b Administrative Activity Monitoring](./17-gxp-compliance/06-administrative-controls.md#64b-administrative-activity-monitoring)
- [§64c Training and Competency Requirements](./17-gxp-compliance/06-administrative-controls.md#64c-training-and-competency-requirements)
- [§64d Supplier Qualification](./17-gxp-compliance/06-administrative-controls.md#64d-supplier-qualification)
- [§64f Regulatory Update Monitoring](./17-gxp-compliance/06-administrative-controls.md#64f-regulatory-update-monitoring)
- [§64f-1 Periodic Security Assessment](./17-gxp-compliance/06-administrative-controls.md#64f-1-periodic-security-assessment)
- [§64g Administrative Authority Checks](./17-gxp-compliance/06-administrative-controls.md#64g-administrative-authority-checks)

### [Electronic Signatures](./17-gxp-compliance/07-electronic-signatures.md)

- [§65 Electronic Signatures](./17-gxp-compliance/07-electronic-signatures.md#65-electronic-signatures)

### [Compliance Verification](./17-gxp-compliance/08-compliance-verification.md)

- [§66 Compliance Verification Checklist](./17-gxp-compliance/08-compliance-verification.md#66-compliance-verification-checklist)

### [Validation Plan](./17-gxp-compliance/09-validation-plan.md)

- [§67 Validation Plan (IQ/OQ/PQ)](./17-gxp-compliance/09-validation-plan.md#67-validation-plan-iqoqpq)

### [Risk Assessment](./17-gxp-compliance/10-risk-assessment.md)

- [§68 Risk Assessment (FMEA)](./17-gxp-compliance/10-risk-assessment.md#68-risk-assessment-fmea)

### [Traceability Matrix](./17-gxp-compliance/11-traceability-matrix.md)

- [§69 Regulatory Traceability Matrix](./17-gxp-compliance/11-traceability-matrix.md#69-regulatory-traceability-matrix)

### [Decommissioning](./17-gxp-compliance/12-decommissioning.md)

- [§70 System Decommissioning](./17-gxp-compliance/12-decommissioning.md#70-system-decommissioning)

### [Test Protocols](./17-gxp-compliance/13-test-protocols.md)

- [§71 Installation Qualification Protocols](./17-gxp-compliance/13-test-protocols.md#71-iq-protocols)
- [§72 Operational Qualification Protocols](./17-gxp-compliance/13-test-protocols.md#72-oq-protocols)
- [§73 Performance Qualification Protocols](./17-gxp-compliance/13-test-protocols.md#73-pq-protocols)

### [Operational Log Schema](./15-appendices.md#appendix-r-operational-log-event-schema)

- [Appendix R: Operational Log Event Schema](./15-appendices.md#appendix-r-operational-log-event-schema)

### [Error Recovery Runbook](./15-appendices.md#appendix-s-consolidated-error-recovery-runbook)

- [Appendix S: Consolidated Error Recovery Runbook](./15-appendices.md#appendix-s-consolidated-error-recovery-runbook)

### [Implementation Verification](./15-appendices.md#appendix-t-implementation-verification-requirements)

- [Appendix T: Implementation Verification Requirements](./15-appendices.md#appendix-t-implementation-verification-requirements)

---

_Previous: [16 - Definition of Done](./16-definition-of-done.md)_
