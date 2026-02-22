# 09 - Data Retention

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-09 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/09-data-retention.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

21 CFR 11.10(c) and EU GMP Annex 11, Section 17 require retention of electronic records for defined periods. This section defines the data retention framework applicable to all `@hex-di` packages deployed in GxP environments.

Per-package compliance documents provide package-specific retention requirements (e.g., audit entry formats, serialization schemas). This cross-cutting document provides the shared retention periods, archival strategy, and readability verification requirements.

---

## Retention Periods by Domain

| Domain | Minimum Retention | Regulatory Basis |
|--------|-------------------|------------------|
| Batch manufacturing records | 1 year past product expiry or 5 years (whichever is longer) | 21 CFR 211.180(a) |
| Laboratory records | 1 year past product batch expiry | 21 CFR 211.194 |
| Clinical trial data | 15 years (EU) / 2 years post-approval (FDA) | ICH E6(R2) 4.9.5 |
| QC laboratory test results | Per site retention schedule, typically 5-10 years | EU GMP Chapter 6 |
| Pharmacovigilance records | 10 years post-marketing authorization | EU PV Legislation |
| Medical device records | Lifetime of device + 5 years | 21 CFR 820.180 |
| EU GMP electronic records | 5 years or as defined by national legislation | EU GMP Annex 11 §17 |

```
REQUIREMENT: When a deployment is subject to multiple regulatory frameworks with
             different retention periods, the longest applicable retention period MUST
             govern. Organizations MUST document their retention period selection
             rationale in the computerized system validation plan.
```

---

## Data Archival Requirements

```
REQUIREMENT: GxP organizations MUST define and document a data archival policy for
             records containing data produced by @hex-di libraries. The policy MUST
             address:

             (a) Retention period: Minimum retention of the product lifecycle plus the
                 applicable regulatory retention period.
             (b) Backup frequency: Records MUST be backed up at a frequency commensurate
                 with the acceptable data loss window. For GxP batch records, real-time
                 or near-real-time replication is RECOMMENDED.
             (c) Backup verification: Backup integrity MUST be verified periodically
                 (RECOMMENDED: monthly) by restoring a sample of archived records and
                 confirming they are readable and match the original data.
             (d) Media durability: Archived records MUST be stored on media with a
                 documented lifespan exceeding the retention period. Organizations MUST
                 plan for media migration before end-of-life.
             (e) Format preservation: Archived records MUST include schema version
                 fields. When schema versions evolve, organizations MUST maintain the
                 ability to deserialize records archived under previous schema versions.
             (f) Disaster recovery: At least one backup copy MUST be stored in a
                 geographically separate location.
             (g) Restoration testing: Organizations MUST test the full restoration
                 procedure at least annually.
```

---

## Record Immutability

```
REQUIREMENT: Records MUST NOT be modified after creation. If correction is necessary
             (e.g., annotating a record with investigation findings), the correction
             MUST be appended as a separate linked record preserving the original record
             intact (ALCOA+ Original). The corrective record MUST include its own
             timestamp capturing when the correction was made.
```

---

## Format Versioning for Long-Term Retention

Archived data may need to be deserialized years after storage. To ensure ALCOA+ "Available" and "Enduring" across library major versions:

### Backward Compatibility Commitment

1. Deserialization functions MUST accept all prior schema versions and migrate transparently
2. Schema changes are breaking changes and follow the library's deprecation policy
3. Migration utilities MUST be published to convert archived records to new formats

### Storage Envelope Guidance

Consumers storing records for regulatory retention SHOULD include metadata in the storage record:

```json
{
  "schemaVersion": 1,
  "libraryVersion": "1.2.3",
  "libraryName": "@hex-di/<package>",
  "timestamp": "2026-02-17T12:00:00.000Z",
  "userId": "operator-123",
  "operation": "batch_validation",
  "data": { }
}
```

---

## Periodic Readability Verification

```
REQUIREMENT: GxP consumers MUST perform periodic readability verification of archived
             data when the applicable retention period is 5 years or longer, or when
             the data is classified as High-risk per the consumer's QMS.

             At a minimum:

             (a) Sample selection: Select a representative sample of archived records
                 from each storage cohort (grouped by schema version and archive date).
                 Minimum of 1% of records or 20 records per cohort, whichever is greater.
             (b) Deserialization verification: For each sample record, verify the
                 deserialization function returns without error, data integrity checks
                 pass (brand, immutability), and restored values match originals.
             (c) Cadence: Annually or upon library version upgrade, whichever is more
                 frequent.
             (d) Documentation: Record the verification outcome in the QMS, including:
                 verification date, tester, library version used for deserialization,
                 sample size per cohort, pass/fail count, and any failures with root
                 cause analysis.

             Reference: MHRA GxP Data Integrity Guidance §6.12, PIC/S PI 041 §9.4.
```

---

## Audit Trail Capacity Planning

```
REQUIREMENT: GxP organizations MUST perform capacity planning for audit trail storage
             before initial deployment. The capacity plan MUST estimate:

             (a) Expected audit entry generation rate (entries per hour/day)
             (b) Average entry size (bytes, including all fields and integrity data)
             (c) Required storage capacity for the full retention period
             (d) Storage growth margin (RECOMMENDED: 2x estimated capacity)
             (e) Monitoring thresholds for storage utilization (alert at 70%, critical
                 at 85%)

RECOMMENDED: Organizations SHOULD implement automated storage capacity monitoring
             that alerts operations personnel when utilization exceeds the documented
             thresholds.
```

---

## Data Privacy and Retention Interaction

```
REQUIREMENT: When audit trail records contain personally identifiable information (PII)
             subject to data privacy regulations (GDPR, CCPA, etc.), organizations MUST
             document how data retention requirements interact with data subject rights
             (e.g., right to erasure). The resolution MUST be documented in the CSVP
             and approved by both QA and legal/privacy teams.

RECOMMENDED: Where possible, audit trail records SHOULD use pseudonymized identifiers
             rather than direct PII. The pseudonymization mapping MUST be maintained
             separately under appropriate access controls for the full retention period.
```

---

## Archival Strategy for Decommissioned Systems

When retiring a system, organizations MUST ensure continued access to data for the full retention period. See [11-decommissioning.md](./11-decommissioning.md) for detailed decommissioning procedures including:

- Export format requirements
- Standalone verification tooling
- Archive schema specifications
- Key material disposition
- Periodic archive readability verification
