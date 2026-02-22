# 17 - GxP Compliance: Data Retention

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-04                              |
| Revision         | 1.3                                      |
| Effective Date   | 2026-02-15                               |
| Status           | Effective                                |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
| Change History   | 1.3 (2026-02-15): Strengthened retention period table heading from "Recommended" to "Required Minimum" per GxP compliance review finding (21 CFR 11.10(c) normative language clarity) (CCR-GUARD-015) |
|                  | 1.2 (2026-02-14): Elevated operational data migration verification from RECOMMENDED to REQUIREMENT when gxp: true, added 6-step migration procedure with dry-run requirement (CCR-GUARD-007) |
|                  | 1.1 (2026-02-14): Elevated quarterly backup verification from RECOMMENDED to REQUIREMENT (CCR-GUARD-006) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

> For the generic data retention framework, see [../../../cross-cutting/gxp/09-data-retention.md](../../../cross-cutting/gxp/09-data-retention.md). This section covers guard-specific data retention requirements.

_Previous: [Clock Synchronization](./03-clock-synchronization.md) | Next: [Audit Trail Review](./05-audit-trail-review.md)_

---

## 63. Data Retention Requirements

### Required Minimum Retention Periods

| Record Type           | Required Minimum Retention Period | Regulatory Basis                                                                                                                                                  |
| --------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allow decisions       | 1 year                        | Operational audit -- demonstrates authorized access patterns                                                                                                      |
| Deny decisions        | 3 years                       | Security audit -- tracks unauthorized access attempts and potential intrusions                                                                                    |
| Electronic signatures | Lifetime of the signed record | 21 CFR Part 11 sections 11.10(e) and 11.50 -- signatures are part of the audit record (11.10(e) retention) and must remain bound to their records (11.50 binding) |
| Integrity hash chains | Lifetime of the audit trail   | Breaking the chain invalidates subsequent verification                                                                                                            |
| Policy snapshots      | 5 years                       | Change control -- demonstrates what policies were active at any point in time                                                                                     |

> **Note:** Organizations MAY simplify retention by applying the longest applicable period (e.g., 5 years for all record types). This eliminates per-verdict retention logic in the adapter and reduces the risk of premature deletion.

```
RECOMMENDED: In the absence of a jurisdiction-specific requirement, organizations
             SHOULD configure a minimum retention period of 25 years for GxP audit
             trail data in pharmaceutical manufacturing contexts. This covers the
             longest typical product lifecycle (e.g., biologics with 5-year shelf life
             plus 20 years post-market surveillance). For clinical trial data,
             retention periods are defined by ICH E6(R2) and the applicable clinical
             trial regulation. Organizations SHOULD document their chosen retention
             period with regulatory justification in their validation plan (§67).
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c).
```

```
REQUIREMENT: The minimum retention periods in the table above are mandatory for GxP
             environments. The AuditTrail adapter MUST NOT delete, purge, or make
             records unavailable before the applicable minimum retention period expires.
             For jurisdictions with longer requirements (see table below), the
             jurisdiction-specific minimum takes precedence.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17.
```

### Consumer Responsibilities

The `AuditTrailPort` adapter is responsible for implementing retention. The guard library produces records but does not manage their lifecycle.

```
REQUIREMENT: The audit trail adapter MUST NOT delete records before the minimum
             retention period expires. Archival to cold storage is acceptable
             provided records remain queryable within the retention period.
```

Implementation guidance:

- **SQL databases:** Use partition-based archival (e.g., monthly partitions). Restrict `DROP PARTITION` to authorized administrators with audit logging.
- **Cloud storage:** Use lifecycle policies (S3 Glacier, Azure Cool Storage) for records past the active query window.
- **Compliance archival:** Export audit entries to a compliance system (e.g., AWS CloudTrail, Splunk) in addition to the primary store.

### Jurisdiction-Specific Retention Periods

The required minimums above are general guidance. Specific regulatory frameworks impose their own retention requirements:

| Jurisdiction         | Regulation                | Minimum Retention                                                              | Notes                                                      |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **FDA (US)**         | 21 CFR Part 11            | Duration of the electronic record's required retention                         | No fixed period; tied to the underlying record's retention |
| **EU GMP Annex 11**  | EU GMP Annex 11 Section 9 | 1 year after batch expiry or 5 years after batch release (whichever is longer) | Applies to manufacturing; other GxP contexts may vary      |
| **EU GMP Chapter 4** | EU GMP Chapter 4.10       | 5 years after batch certification                                              | Batch documentation including audit trails                 |
| **ICH Q7**           | ICH Q7 Section 6.6        | At least 1 year past batch expiry date                                         | API manufacturing                                          |
| **SOX (US)**         | Sarbanes-Oxley Act        | 7 years                                                                        | Financial controls audit trails                            |
| **Japan MHLW**       | Japanese GMP Ordinance    | 5 years after manufacture or 3 years after expiry (whichever is longer)        | Pharmaceutical manufacturing                               |
| **China NMPA**       | China GMP (2010 Revision) | Until 1 year after drug expiry date                                            | Pharmaceutical manufacturing                               |

```
REQUIREMENT: Organizations MUST consult their site compliance team to determine the
             applicable retention period for their specific product, market, and
             regulatory context. The retention period MUST be documented in the site's
             data retention policy and referenced in the validation plan (section 67).
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17, ALCOA+ Enduring.

REQUIREMENT: Organizations MUST establish a mapping between guarded port names and
             the electronic record types they protect. For example:
             UserRepoPort → patient records → 15-year retention;
             BatchReleasePort → batch records → 5 years after batch certification.
             This mapping MUST be documented in the validation plan (section 67)
             and enforced by the AuditTrailPort adapter's retention logic to ensure
             audit entries are retained for at least as long as the records they
             govern.
```

```
RECOMMENDED: Organizations SHOULD document the port-to-record-type mapping in a
             structured table format. The following template can be adapted to the
             organization's specific guarded ports and regulatory context:
```

| Guarded Port Name  | Electronic Record Type  | Predicate Rule                                               | Minimum Retention Period              | Rationale                                        |
| ------------------ | ----------------------- | ------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------ |
| `UserRepoPort`     | Patient records         | `allOf(hasRole("clinician"), hasPermission("patient:read"))` | 15 years                              | ICH E6(R2) §8.1; national health records law     |
| `BatchReleasePort` | Batch release records   | `allOf(hasRole("qa"), hasSignature("approved"))`             | 5 years after batch certification     | EU GMP Annex 11 §17; 21 CFR 211.180(a)           |
| `AdverseEventPort` | Adverse event reports   | `hasPermission("safety:report")`                             | 10 years after product withdrawal     | 21 CFR 314.80(b); EU pharmacovigilance directive |
| `LabResultPort`    | Laboratory test results | `allOf(hasRole("lab_analyst"), hasSignature("reviewed"))`    | Duration of clinical trial + 25 years | ICH E6(R2) §8.1                                  |

> **Note:** The table above is an illustrative example only. Organizations MUST consult their site compliance team to determine the actual port names, record types, predicate rules, and retention periods applicable to their deployment.

### Retention Monitoring

Retention periods span years to decades (5-25+ years), and organizations need proactive visibility into approaching expiry to avoid accidental data deletion or non-compliant archival gaps. The `createRetentionMonitor()` utility provides a library-level interface for retention compliance monitoring. The actual retention enforcement (archival, deletion, migration) remains a consumer-side responsibility — the library provides the query and monitoring interface only.

```typescript
interface RetentionPolicy {
  readonly _tag: "RetentionPolicy";
  /** Port name this retention policy applies to. */
  readonly portName: string;
  /** Human-readable record type (e.g., "Batch release records"). */
  readonly recordType: string;
  /** Minimum retention period. */
  readonly retentionPeriod: RetentionPeriod;
}

interface RetentionPeriod {
  readonly _tag: "RetentionPeriod";
  /** Number of years for the retention period. */
  readonly years: number;
  /** Regulatory reference (e.g., "21 CFR 211.180(a)"). */
  readonly regulatoryReference: string;
}

interface RetentionExpiryQuery {
  readonly _tag: "RetentionExpiryQuery";
  /** Number of days before expiry to flag as approaching. Default: 365. */
  readonly warningThresholdDays: number;
  /** Specific port names to query. Omit for all policies. */
  readonly portNames?: ReadonlyArray<string>;
}

interface RetentionExpiryResult {
  readonly _tag: "RetentionExpiryResult";
  /** Port name. */
  readonly portName: string;
  /** Earliest audit entry timestamp for this port. */
  readonly earliestEntryTimestamp: string;
  /** Retention expiry date (ISO 8601). */
  readonly expiresAt: string;
  /** Days remaining until expiry. */
  readonly daysRemaining: number;
  /** Whether the entry is within the warning threshold. */
  readonly approachingExpiry: boolean;
}

interface RetentionComplianceResult {
  readonly _tag: "RetentionComplianceResult";
  /** Overall compliance status. */
  readonly compliant: boolean;
  /** Per-policy results. */
  readonly policies: ReadonlyArray<{
    readonly portName: string;
    readonly retentionPeriod: RetentionPeriod;
    readonly currentRetentionDays: number;
    readonly compliant: boolean;
    readonly issue: string | undefined;
  }>;
}
```

```
RECOMMENDED: @hex-di/guard-validation SHOULD provide a createRetentionMonitor()
             factory that accepts an array of RetentionPolicy definitions and an
             AuditTrailPort query interface. The monitor SHOULD provide two methods:

             (a) queryApproachingExpiry(query: RetentionExpiryQuery):
                 Result<ReadonlyArray<RetentionExpiryResult>, AuditTrailReadError>
                 — Queries the audit trail for entries whose retention period is
                 within the warning threshold. Returns results sorted by
                 daysRemaining ascending (most urgent first).

             (b) verifyRetentionCompliance():
                 Result<RetentionComplianceResult, AuditTrailReadError>
                 — Verifies that all configured retention policies are satisfiable
                 given the current audit trail data. Checks that the earliest entry
                 per port has not been deleted prematurely and that the backing
                 store's own retention configuration (if queryable) meets or exceeds
                 the policy requirement.

             The retention monitor SHOULD integrate with createGuardHealthCheck()
             (../behaviors/06-guard-adapter.md) to include retention compliance as an optional
             health check dimension. When retention issues are detected, the health
             check result SHOULD include a retentionWarnings array.

             Retention monitoring is a consumer-side responsibility — the library
             provides the interface and query utilities, but the actual archival,
             migration, and deletion procedures depend on the consumer's storage
             infrastructure and regulatory context.

             Reference: EU GMP Annex 11 §17 (archiving), 21 CFR 211.180
             (records retention), ALCOA+ Enduring.
```

### Audit Trail Backup and Disaster Recovery

Per EU GMP Annex 11 Section 7.1, organizations MUST implement backup and disaster recovery procedures for audit trail data:

```
REQUIREMENT: Regular backups of audit trail data MUST be performed at a
             frequency commensurate with the volume of records generated.
             Backup integrity MUST be verified via automated checksum comparison.

REQUIREMENT: Restore procedures MUST be tested periodically (at least annually)
             to confirm that audit trail data can be recovered completely from
             backups. Each annual restore test MUST meet the following minimum scope:
             (a) Restore at least 10% of production data volume (minimum 10,000
                 entries if available, or all entries if fewer than 10,000 exist).
             (b) Restored data MUST span at least 5 distinct scope chains to
                 verify cross-scope restore integrity.
             (c) Restored data MUST include at least one scope containing entries
                 with electronic signatures, to verify signature data survives
                 the backup/restore cycle.
             (d) Run verifyAuditChain() (section 61.4) on all restored scope
                 chains and confirm integrity passes.
             (e) Verify that the restored entry count matches the source entry
                 count for the restored scope chains.
             A full-scale restore (100% of production data) MUST be performed at
             least every 3 years or before any major infrastructure migration
             (e.g., database engine change, cloud provider migration, storage
             tier migration). The full-scale restore follows the same verification
             steps (a)-(e) above applied to the complete data set.
             Reference: EU GMP Annex 11 §7.1, 21 CFR 11.10(c).

REQUIREMENT: Backup media MUST be stored in a physically separate location
             from the primary audit trail storage to protect against
             site-level disasters.

RECOMMENDED: For Critical-severity deployments (as determined by the site's risk
             assessment per ICH Q9), organizations SHOULD maintain a geographically
             separate disaster recovery (DR) site for the audit trail backing store.
             The DR site SHOULD be in a different physical region (e.g., different
             data center, different cloud availability zone or region) from the
             primary site to protect against regional disasters (natural disaster,
             power grid failure, network partitioning). The DR site SHOULD:
             (a) Maintain a replica of the primary audit trail data with an RPO
                 appropriate to the deployment's criticality (recommended: RPO ≤ 1 hour
                 for Critical, ≤ 4 hours for Major).
             (b) Support failover within the RTO specified in the validation plan
                 (section 67).
             (c) Be included in the annual restore test (section 63, backup and DR).
             (d) Be documented in the validation plan with: DR site location,
                 replication mechanism, RPO/RTO targets, and failover procedure.
             Organizations that choose not to implement a geographically separate
             DR site SHOULD document the rationale and residual risk in their
             risk assessment (section 68).
             Reference: EU GMP Annex 11 §7.1, 21 CFR 11.10(c), ALCOA+ Enduring.
```

```
REQUIREMENT: The primary audit trail backing store MUST employ data redundancy
             sufficient to survive a single physical storage failure without data
             loss (e.g., RAID, database replication, cloud multi-AZ deployment).
             The redundancy strategy MUST be documented in the adapter design
             specification and verified during IQ. Single-disk, non-replicated
             storage is not acceptable for GxP production environments.
             Reference: EU GMP Annex 11 Section 7.1, 21 CFR 11.10(c).
```

Implementation guidance:

- **Verification:** After each backup, compute SHA-256 over the backup archive and compare against the source. Log the verification result.
- **Restore testing:** Document each restore test with date, scope, result, and operator identity.
- **Retention alignment:** Backup retention periods MUST match or exceed the audit trail retention periods defined in section 63.

```
REQUIREMENT: When gxp is true, all connections between the application layer and
             the audit trail backing store MUST use encrypted transport (TLS 1.2+
             or equivalent) to protect audit data in transit. This applies to both
             inter-system and intra-system connections — including application to
             database within the same network — to protect against network-level
             interception, ARP spoofing, or compromised network infrastructure
             within the deployment zone. The transport encryption configuration
             MUST be documented in the validation plan (section 67) and verified
             during IQ.
             Reference: 21 CFR 11.10(c), MHRA Data Integrity Guidance (2018),
             NIST SP 800-52 Rev. 2.

RECOMMENDED: In non-GxP environments, organizations SHOULD ensure that all
             connections between the application layer and the audit trail backing
             store use encrypted transport (TLS 1.2+ or equivalent) as a
             defense-in-depth control. This is particularly important when the
             audit trail backing store is hosted on a separate server or in a
             cloud-managed database service where the network path traverses
             shared infrastructure.
             Reference: 21 CFR 11.10(c), MHRA Data Integrity Guidance (2018),
             NIST SP 800-52 Rev. 2.
```

```
RECOMMENDED: When restoring audit trail data from backup, the restored chain
             SHOULD begin a new epoch: use the last verified hash from the
             pre-restore chain as the genesis previousHash for the new epoch.
             Document the gap between the last pre-restore entry and the first
             post-restore entry in the incident log, including the restore
             timestamp, operator identity, and reason for restore.
```

```
REQUIREMENT: Before restored audit trail data is returned to production use,
             verifyAuditChain() (section 61.4) MUST pass on the restored data.
             If verification fails, the restored data MUST NOT be used as
             compliance evidence until the chain integrity issue is resolved.
             The restore event — including restore timestamp, operator identity,
             source backup identifier, and chain verification result — MUST be
             logged in the administrative activity log ([section 64](./05-audit-trail-review.md)).
             Reference: 21 CFR 11.10(c) (protection of records),
             EU GMP Annex 11 Section 7.1.
```

```
REQUIREMENT: When gxp is true and audit trail data is migrated between storage
             systems (e.g., database engine migration, cloud provider migration,
             on-premise to cloud, storage tier migration), organizations MUST verify
             data migration integrity by:
             (1) Computing the record count in the source and destination and
                 confirming they match (zero record loss).
             (2) Running verifyAuditChain() on the destination data and confirming
                 all chains pass (hash chain integrity preserved).
             (3) Spot-checking a sample of entries (at least 1% or 100 entries,
                 whichever is greater) for field-level equality between source and
                 destination (data fidelity).
             (4) Verifying that schemaVersion, hashAlgorithm, and signature fields
                 are preserved without transformation (cryptographic fidelity).
             (5) Documenting the migration with: source system, destination system,
                 migration timestamp, operator identity, record counts, chain
                 verification results, spot-check results, and any discrepancies
                 found. The migration document MUST be retained for the full
                 retention period of the migrated data.
             (6) Performing a migration dry-run on a representative data subset
                 before production migration. A failed dry-run MUST block
                 production migration until the failure is resolved and
                 re-verified.
             This verification is in addition to the OQ re-run required by
             section 64a for infrastructure migrations.
             Reference: 21 CFR 11.10(c) (protection of records),
             EU GMP Annex 11 §17 (archiving), ISPE GAMP Records and Data
             Integrity Guide (data lifecycle integrity), ALCOA+ Enduring.

RECOMMENDED: In non-GxP environments, organizations SHOULD verify data migration
             integrity by: (1) computing the record count in the source and
             destination and confirming they match, (2) running verifyAuditChain()
             on the destination data and confirming all chains pass, (3) spot-
             checking a sample of entries for field-level equality between source
             and destination, and (4) documenting the migration with source system,
             destination system, migration timestamp, and chain verification results.
             Reference: ISPE GAMP Records and Data Integrity Guide (data lifecycle
             integrity).
```

```
REQUIREMENT: GxP audit trail adapter documentation MUST specify the following as part
             of the validation plan (section 67) and verified during PQ:
             (1) Backup frequency and Recovery Point Objective (RPO) — the maximum
                 acceptable data loss window, expressed in time (e.g., "RPO: 1 hour"
                 means at most 1 hour of audit entries may be lost in a disaster).
             (2) Recovery Time Objective (RTO) — the maximum acceptable time to restore
                 audit trail service from backup.
             (3) Backup verification procedure — automated checksum comparison on every
                 backup cycle, with verification failures triggering an operational alert.
             (4) Restore test procedure and frequency — restore tests MUST be performed
                 at least annually and documented with: date, operator identity, scope of
                 restored data, chain verification result, and time to restore.
             (5) Cross-reference to section 70 (System Decommissioning) for data
                 migration procedures during system retirement.
             The RPO and RTO values MUST be proportional to the criticality of the
             guarded operations, as determined by the site's risk assessment.
             Reference: EU GMP Annex 11 §7.1, §7.2, 21 CFR 11.10(c), ALCOA+ Enduring.
```

```
REQUIREMENT: When gxp is true, organizations MUST perform quarterly backup
             verification in addition to the annual full restore test. The
             quarterly verification MUST include:

             (a) Restore a sample of at least 1,000 audit entries (or all
                 entries if fewer than 1,000 exist in the backup).
             (b) Run verifyAuditChain() on all restored scope chains in the
                 sample.
             (c) Verify that the restored entry count matches the source
                 entry count for the sampled scopes.
             (d) Document the verification with: date, operator identity,
                 sample size, chain verification result, and any discrepancies.

             Quarterly verification provides early detection of backup
             degradation (e.g., corrupted media, misconfigured backup jobs)
             between annual full-restore tests. A failed quarterly verification
             MUST be reported as a data integrity incident and escalated per
             the incident classification matrix (section 68).
             Reference: EU GMP Annex 11 §7.1, 21 CFR 11.10(c).
```

### Initial Deployment and Legacy Access Control Migration

```
RECOMMENDED: When deploying @hex-di/guard as a replacement for an existing access
             control system in a GxP environment, organizations SHOULD follow a
             structured migration approach:
             1. Map legacy ACL rules to guard permissions, roles, and policies.
                Document the mapping in a migration specification that identifies
                each legacy rule and its guard equivalent. Highlight any rules that
                cannot be directly translated and document the alternative approach.
             2. Parallel-run validation: run the legacy ACL system and guard
                simultaneously on production traffic (or a representative replay)
                for a defined validation period. Compare decisions from both systems
                for each access request. Log discrepancies with full context
                (subject, resource, legacy decision, guard decision).
             3. Reconciliation report: produce a documented reconciliation report
                listing all discrepancies found during the parallel-run period,
                their root causes, and resolutions. The report SHOULD be reviewed
                and approved by QA before cutover.
             4. Rollback procedure: document a tested rollback procedure that
                restores the legacy ACL system if guard deployment encounters
                critical issues. The rollback procedure SHOULD be verified during
                OQ and SHOULD include steps for preserving any audit trail entries
                generated during the guard deployment.
             5. Post-cutover monitoring: after cutover, maintain an elevated audit
                trail review frequency (recommended: daily for the first 30 days,
                then weekly for 90 days) to detect any authorization behavior
                differences not caught during parallel-run. Return to the standard
                risk-based review frequency (section 64) after the monitoring period
                concludes without incident.
             Reference: GAMP 5 (change control for validated systems), EU GMP
             Annex 11 §10 (change management).
```

---

## 63b. Data Privacy and Audit Trail Retention

### GDPR and Regulatory Retention Conflict

In jurisdictions where the EU General Data Protection Regulation (GDPR) applies alongside GxP requirements, a tension arises between the data subject's right to erasure (GDPR Article 17) and the regulatory obligation to maintain complete, unbroken audit trails. GDPR Article 17(3)(b) explicitly exempts processing that is necessary "for compliance with a legal obligation which requires processing by Union or Member State law" — GxP retention obligations fall under this exemption.

```
REQUIREMENT: Audit trail entries MUST NOT be deleted or redacted in response to a GDPR
             erasure request (Article 17 "right to be forgotten") when the entries are
             subject to GxP retention obligations. The GDPR Article 17(3)(b) "legal
             obligation" exemption applies to audit trail records that must be retained
             for regulatory compliance. Deletion of audit trail entries would violate
             the ALCOA+ "Complete" and "Enduring" principles and break hash chain
             integrity (section 61.4).
             Reference: GDPR Article 17(3)(b), 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

### Pseudonymization of Subject Identifiers

To balance data protection with audit trail integrity, organizations SHOULD use pseudonymized identifiers in audit trail entries.

```
REQUIREMENT: When GDPR applies, AuditEntry.subjectId MUST use a pseudonymized
             identifier rather than a directly identifying value (e.g., name, email,
             or employee number). The pseudonym MUST be deterministic for a given
             subject (the same natural person always maps to the same pseudonym)
             so that audit trail queries by subject remain functional. A
             pseudonymized subjectId satisfies the ALCOA+ "Attributable" principle
             provided the pseudonym-to-identity mapping is maintained for the
             duration of the GxP retention period (section 63).
             Reference: GDPR Article 4(5), ALCOA+ Attributable.

REQUIREMENT: The pseudonym-to-identity mapping MUST be stored separately from the
             audit trail data, with independent access controls. Access to the
             mapping MUST be restricted to authorized personnel (e.g., compliance
             officers, data protection officers) and MUST be logged in the
             meta-audit log (section 64). The mapping store MUST be encrypted
             at rest (see section 64, "Audit Trail Data-at-Rest Encryption").
             Reference: GDPR Article 25(1) (data protection by design),
             EU GMP Annex 11 §12.

REQUIREMENT: After the GxP retention period expires for all audit entries referencing
             a given pseudonym, the pseudonym-to-identity mapping for that subject
             MAY be deleted to satisfy a pending GDPR erasure request. The audit
             trail entries themselves MUST NOT be deleted — they become effectively
             anonymized once the mapping is removed. Deletion of the mapping MUST
             be recorded in the meta-audit log.
             Reference: GDPR Article 17(3)(b), ALCOA+ Enduring.
```

```
RECOMMENDED: The pseudonymization function SHOULD use HMAC-SHA256 keyed
             pseudonymization with the following properties:

             (a) Algorithm: HMAC-SHA256(pseudonymization_key, subject_identifier),
                 truncated to 32 hex characters (128 bits). This produces a
                 deterministic pseudonym that cannot be reversed without the key.
             (b) Key management: The pseudonymization key MUST be distinct from all
                 signing keys (section 65c) and encryption keys (section 64). The
                 key MUST be stored in the organization's key management system
                 (HSM or key vault) with access restricted to the SubjectProvider
                 adapter and authorized compliance personnel.
             (c) Key rotation: When the pseudonymization key is rotated, all
                 existing pseudonym-to-identity mappings MUST be re-computed with
                 the new key and the mapping store updated atomically. The old key
                 MUST be retained until the re-computation is verified.
             (d) Alternative algorithms: Organizations MAY use a random UUID
                 mapping (UUID v4 assigned per subject) instead of HMAC-SHA256.
                 Random mapping avoids the need for a cryptographic key but
                 requires the mapping store to be the sole source of
                 pseudonym-to-identity linkage. The chosen algorithm MUST be
                 documented in the DPIA (RECOMMENDED above).

             Reference: GDPR Article 4(5), NIST SP 800-108 (KDF for HMAC),
             ALCOA+ Attributable.
```

```
RECOMMENDED: Organizations SHOULD document the legal basis for audit trail retention
             (GDPR Article 6(1)(c) — "compliance with a legal obligation") in a Data
             Protection Impact Assessment (DPIA) alongside the validation plan
             (section 67). The DPIA SHOULD address: (a) the categories of personal
             data processed in audit entries, (b) the retention periods and their
             regulatory justification, (c) the pseudonymization strategy, (d) the
             access control model for the pseudonym-to-identity mapping, and (e) the
             procedure for handling erasure requests during the retention period.
             Reference: GDPR Article 35, ICH Q9.

RECOMMENDED: The SubjectProviderPort adapter SHOULD perform pseudonymization at the
             point of subject creation (i.e., before the subject enters the guard
             evaluation pipeline). This ensures that no downstream component —
             including AuditTrail adapters, logger integrations, and tracing bridges
             — receives directly identifying information. The pseudonymization
             function SHOULD be injected via the adapter's dependencies to allow
             testing with non-pseudonymized fixtures (see ../behaviors/06-guard-adapter.md
             section 25 for subjectId constraints, ../behaviors/12-testing.md section 51
             for createTestSubject).
```

```
RECOMMENDED: Organizations subject to GDPR SHOULD define a Data Subject Access Request
             (DSAR) procedure for guard audit trail data. The procedure SHOULD:
             (a) Use `QueryableAuditTrail.queryBySubjectId()` to extract all audit
                 entries associated with the requesting data subject.
             (b) Redact other subjects' data from the extracted entries before
                 providing the response (e.g., entries where the requesting subject
                 appears alongside other subjects in counter-signing workflows).
             (c) Include the audit export manifest (entry count, date range, hash
                 chain verification result) as a completeness attestation.
             (d) Document the DSAR response in the meta-audit log (section 63) as a
                 record of the access request fulfillment.
             Note: GDPR Article 17 (right to erasure) is addressed via pseudonymization
             (section 63b above), consistent with the regulatory exception in Article
             17(3)(b) for records required for compliance with a legal obligation or for
             the establishment, exercise, or defense of legal claims.
             Reference: GDPR Articles 15, 17(3)(b).
```

---

## 63c. Audit Trail Archival Strategy

```
REQUIREMENT: Organizations MUST implement a documented archival strategy for audit
             trail data that transitions from active storage to long-term archival.
             The archival strategy MUST include:

             (a) Export format: Archived audit trail data MUST be exported in JSON
                 Lines format (one JSON object per line) accompanied by an
                 AuditExportManifest (section 36 in ../behaviors/08-serialization.md). Each
                 archive package MUST be self-contained: it includes the audit
                 entries, the manifest, and sufficient metadata to verify chain
                 integrity without access to the active system.

             (b) Pre-archival chain verification: verifyAuditChain() (section 61.4)
                 MUST pass on the data being archived BEFORE the archival transfer
                 begins. Archival of data with a broken chain is prohibited — the
                 chain break MUST be resolved first per the chain break response
                 procedure (section 61.4).

             (c) Post-transfer integrity verification: After the archive has been
                 written to the archival medium, the archived data MUST be read back
                 and verified: (1) entry count matches the source, (2)
                 verifyAuditChain() passes on the archived copy, (3) a sample of
                 entries (minimum 1% or 100 entries, whichever is greater) are
                 compared field-by-field between source and archive.

             (d) Queryability: Archived data MUST remain queryable for the full
                 retention period (section 63). "Queryable" means that individual
                 entries can be retrieved by evaluationId, subjectId, portName,
                 and time range within the retention period. The query latency
                 for archived data MAY be higher than for active data but MUST
                 be documented in the validation plan.

             (e) Restoration procedure: A documented procedure MUST exist for
                 restoring archived data to active storage when needed for
                 regulatory inspection, incident investigation, or legal hold.
                 The restoration procedure MUST include chain verification
                 after restoration.

             (f) Archival event logging: Each archival operation MUST be logged
                 in the administrative event log ([section 64](./05-audit-trail-review.md)) with: archive
                 timestamp, operator identity, scope(s) archived, entry count,
                 chain verification result, and archival medium identifier.

             (g) Decommissioning archive schema: For long-term archives that
                 may outlive the active system, organizations SHOULD adopt the
                 self-describing JSON Schema 2020-12 archive format defined in
                 section 70a (System Decommissioning, GUARD-17-12). The
                 decommissioning archive schema includes embedded metadata
                 (archiveVersion, hashAlgorithms, keyMaterial) that enables
                 future systems to interpret the data without the original
                 application code. Using this format for active-to-archival
                 transitions reduces the risk of format incompatibility when
                 the system is eventually decommissioned.

             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c),
             ALCOA+ Enduring, Available.
```

---

## 63a. Audit Trail Capacity Planning

Capacity planning ensures that the audit trail storage infrastructure can accommodate the expected volume of entries over the retention period without degradation, data loss, or unplanned outages.

### Entry Size Estimation

| Configuration                  | Approximate Entry Size | Notes                                                                                                                        |
| ------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Non-GxP (required fields only) | ~300-500 bytes         | 10 required fields, no hash chain or signatures                                                                              |
| GxP without signatures         | ~500-2000 bytes        | Required fields + integrityHash, previousHash, hashAlgorithm, sequenceNumber, traceDigest, policySnapshot                    |
| GxP with electronic signatures | ~1500-2500 bytes       | All GxP fields + ElectronicSignature sub-fields (signerId, signedAt, meaning, value, algorithm, signerName, reauthenticated) |

```
RECOMMENDED: Organizations SHOULD estimate storage growth using the following formula:

             Daily storage = (evaluations per day) × (average entry size) × (1 + index overhead)

             Where index overhead is typically 0.2-0.5 (20-50% additional storage for
             database indexes). For example: 10,000 evaluations/day × 1.5 KB/entry × 1.3
             index factor = ~19.5 MB/day = ~7.1 GB/year.

             Storage projections SHOULD cover the full retention period (section 63) plus
             a 20% safety margin. Projections SHOULD be reviewed annually as part of the
             periodic review (section 64).
```

### Partitioning Strategies

```
RECOMMENDED: For high-volume deployments (>10,000 evaluations/day), organizations SHOULD
             implement partitioning on the audit trail backing store:

             1. **Time-based partitioning:** Partition by month or quarter. Simplifies
                archival (drop/archive old partitions) and aligns with retention periods.
             2. **Scope-based partitioning:** Partition by scopeId. Confines hash chain
                verification to a single partition and enables scope-level archival.
             3. **Hybrid (time + scope):** Partition by scopeId within time-based
                partitions. Best for multi-tenant or multi-site deployments.

             The chosen strategy SHOULD be documented in the validation plan (section 67).
```

### Index Recommendations

```
RECOMMENDED: Audit trail backing stores SHOULD maintain indexes on the following fields
             for query performance during compliance review:

             1. (scopeId, sequenceNumber) — Primary ordering index for chain verification
             2. (subjectId, timestamp) — Subject-focused audit trail review
             3. (portName, decision, timestamp) — Port-focused security review
             4. (evaluationId) — Unique lookup for WAL reconciliation and deduplication

             Index storage overhead SHOULD be included in capacity projections.
```

### Automated Capacity Monitoring

```
REQUIREMENT: When `gxp: true`, the audit trail backing store MUST implement automated
             capacity monitoring with the following characteristics:
             (a) Check frequency: capacity utilization MUST be assessed at least once per
                 hour. The check interval MUST be configurable but MUST NOT exceed 1 hour.
             (b) Threshold levels:
                 - WARNING at 70% utilization: logged as a structured operational event;
                   no action required but monitoring teams SHOULD be alerted.
                 - CRITICAL at 85% utilization: logged as a structured operational event;
                   capacity expansion or archival MUST be initiated within 24 hours.
                 - EMERGENCY at 95% utilization: logged as a structured operational event;
                   capacity expansion MUST be treated as an urgent operational incident
                   per section 68 (incident classification matrix).
             (c) Each capacity check MUST produce a structured event containing:
                 timestamp (ISO 8601 UTC), storageUtilizationPct (number, 0-100),
                 capacityStatus ("ok" | "warning" | "critical" | "emergency"),
                 totalCapacityBytes (number), usedCapacityBytes (number), and
                 checkIntervalMs (number).
             (d) The capacity status MUST be surfaced through `createGuardHealthCheck()`
                 via the `storageUtilizationPct` and `capacityStatus` fields on
                 `GuardHealthCheckResult` (see ../behaviors/06-guard-adapter.md).
             (e) Threshold values (70%, 85%, 95%) are defaults; they MUST be configurable
                 per deployment but the WARNING threshold MUST NOT exceed 80%, the
                 CRITICAL threshold MUST NOT exceed 90%, and the EMERGENCY threshold
                 MUST NOT exceed 98%.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §7.1, ALCOA+ Enduring.
```

> **Note:** The capacity monitoring REQUIREMENT applies to the backing store adapter, not to `MemoryAuditTrail` (which is intended for testing only). The `createGuardHealthCheck()` function reports the most recent capacity status from the adapter; it does not perform the capacity check itself.

---

_Previous: [Clock Synchronization](./03-clock-synchronization.md) | Next: [Audit Trail Review](./05-audit-trail-review.md)_
