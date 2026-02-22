# Appendix K: Deviation Report Template

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-K                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix J: Audit Entry Schema Versioning Policy](./audit-schema-versioning.md) | Next: [Appendix P: Predicate Rules Mapping Template](./predicate-rules-mapping.md)_

---

This template provides a standardized structure for documenting deviations identified during GxP operation of `@hex-di/guard`. It aligns with ICH Q9 risk management principles and EU GMP Annex 11 §13 incident management requirements.

### Deviation Report Fields

| Field                           | Format                   | Description                                                                                        |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Deviation ID**                | `DEV-GUARD-YYYY-NNN`     | Unique identifier. YYYY = year, NNN = sequential number within year.                               |
| **Date Identified**             | ISO 8601 UTC             | When the deviation was first identified.                                                           |
| **Identified By**               | Name + Role              | Person who identified the deviation.                                                               |
| **Classification**              | Critical / Major / Minor | Aligned to FMEA severity scoring (section 68): Critical = S>=4, Major = S=3, Minor = S<=2.           |
| **Description**                 | Free text                | Detailed description of the deviation including what was expected vs. what occurred.               |
| **Affected Component**          | Guard component name     | E.g., "Audit Trail", "Policy Evaluator", "Electronic Signatures", "Hash Chain".                    |
| **Related FMEA ID**             | FM-XX                    | Cross-reference to the FMEA failure mode table (section 68) if applicable.                         |
| **Root Cause Analysis**         | Structured               | Use 5-Why analysis or Ishikawa (fishbone) diagram per ICH Q9. Document each analysis step.         |
| **Impact Assessment**           | Structured               | Describe the impact on data integrity, patient safety, product quality, and regulatory compliance. |
| **Immediate Corrective Action** | Action + Owner + Date    | Actions taken immediately to contain the deviation.                                                |

### CAPA Actions Table

| #   | Action | Type                    | Owner | Target Date | Completion Date | Verification Method |
| --- | ------ | ----------------------- | ----- | ----------- | --------------- | ------------------- |
| 1   |        | Corrective / Preventive |       |             |                 |                     |
| 2   |        | Corrective / Preventive |       |             |                 |                     |
| 3   |        | Corrective / Preventive |       |             |                 |                     |

### RPN Scoring (Pre- and Post-CAPA)

| Metric            | Pre-CAPA  | Post-CAPA |
| ----------------- | --------- | --------- |
| Severity (S)      | 1-5       | 1-5       |
| Likelihood (L)    | 1-5       | 1-5       |
| Detectability (D) | 1-5       | 1-5       |
| **RPN**           | S x L x D | S x L x D |

> RPN scoring aligns with the FMEA methodology in section 68. Post-CAPA RPN SHOULD be <= 10.

### Approval Workflow

| Step                      | Role            | Name | Signature | Date |
| ------------------------- | --------------- | ---- | --------- | ---- |
| 1. Investigation Complete | QA Specialist   |      |           |      |
| 2. CAPA Approved          | Quality Manager |      |           |      |
| 3. CAPA Implemented       | System Owner    |      |           |      |
| 4. CAPA Verified          | QA Specialist   |      |           |      |

### Effectiveness Check Schedule

| Check  | Timeline          | Method                                                              | Owner           | Status |
| ------ | ----------------- | ------------------------------------------------------------------- | --------------- | ------ |
| 30-day | 30 days post-CAPA | Review audit trail for recurrence; verify OQ regression test passes | QA              |        |
| 60-day | 60 days post-CAPA | Review operational metrics; confirm no related deviations           | QA              |        |
| 90-day | 90 days post-CAPA | Final effectiveness assessment; close deviation or escalate         | Quality Manager |        |

> **Reference:** ICH Q9 (quality risk management), EU GMP Annex 11 §13 (incident management), GAMP 5 (corrective and preventive action).

---

_Previous: [Appendix J: Audit Entry Schema Versioning Policy](./audit-schema-versioning.md) | Next: [Appendix P: Predicate Rules Mapping Template](./predicate-rules-mapping.md)_
