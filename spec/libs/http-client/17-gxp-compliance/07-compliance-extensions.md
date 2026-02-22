# 21 - GxP Compliance Extensions

_Previous: [20 - HTTP Transport Validation](./20-http-transport-validation.md) | Next: [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md)_

---

This document addresses four high-priority GxP compliance gaps identified during regulatory review of the HTTP client specification (sections 84-103). It extends the audit trail, certificate validation, and electronic signature subsystems with retention/archival strategy, queryable audit access, certificate revocation checking, and signature verification protocols.

These sections build upon the HTTP audit bridge (sections 91-97), transport security (sections 84-90), and electronic signature bridge (section 93a).

### Subsystem Overview: Compliance Extensions (§104-§107)

```
┌──────────────────────────────────────────────────────────────────┐
│                  Compliance Extensions Subsystem                  │
│                                                                   │
│  §104 Retention & Archival                                       │
│    ├── HttpAuditRetentionPolicy ──── 5yr FDA / 10yr EU GMP       │
│    ├── HttpAuditArchivalPort ──────── cold storage lifecycle      │
│    ├── HttpAuditArchiveManifest ───── SHA-256 integrity           │
│    ├── §104a Backup & Restore ─────── verified restore, WAL      │
│    ├── §104b Cross-System Migration ── import/export with chain  │
│    └── §104c Data-at-Rest Encryption ─ AES-256-GCM, envelope    │
│                                                                   │
│  §105 Query & Retrieval                                          │
│    ├── QueryableHttpAuditTrailPort ── query, export, count       │
│    ├── HttpAuditQueryFilter ────────── 12 AND-composable fields  │
│    └── Meta-audit logging ──────────── access auditing           │
│                                                                   │
│  §106 Certificate Revocation                                     │
│    ├── OCSP stapling → OCSP → CRL ── priority fallback chain    │
│    ├── Hard-fail / soft-fail modes                               │
│    └── CertificateRevocationResult ── per-connection audit       │
│                                                                   │
│  §107 Signature Verification                                     │
│    ├── 3-property verification ────── binding, signer, temporal  │
│    ├── HttpSignatureVerificationPort                              │
│    └── Periodic re-verification                                  │
│                                                                   │
│  Regulatory: 21 CFR 211.180, 11.10(b)(c), 11.70, Annex 11 §7-§17│
└──────────────────────────────────────────────────────────────────┘
```

This subsystem provides the long-term compliance infrastructure. While the transport security (§18a/§18b/§18c, covering §84-§90) and audit bridge (§19, covering §91-§97) subsystems handle runtime operations, this subsystem ensures audit data remains retrievable, verifiable, and legally defensible for the full regulatory retention period.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./17-gxp-compliance.md#normative-language).

---

## 104. Audit Trail Retention and Archival Strategy

### Regulatory Drivers

| Regulation                 | Requirement                                                                              | HTTP Audit Relevance                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **21 CFR 11.10(c)**        | Protection of records to enable accurate and ready retrieval throughout retention period | HTTP audit entries MUST be retrievable for the full regulatory retention period  |
| **21 CFR 11.10(e)**        | Use of secure, computer-generated, time-stamped audit trails                             | Audit trails MUST be retained with their integrity metadata (hash chains) intact |
| **EU GMP Annex 11 §7**     | Data storage — regular backups, data availability, accessibility, readability            | Archived audit data MUST remain queryable and self-contained                     |
| **EU GMP Annex 11 §17**    | Archiving — ability to retrieve data throughout retention period                         | Archive format MUST support retrieval without original runtime system            |
| **MHRA DI Guidance §6.20** | Retention of complete data (including audit trails) for the required period              | Retention policy MUST cover the full scope of HTTP operation audit entries       |

### Retention Policy

```typescript
/**
 * Defines how long HTTP audit entries are retained before archival or deletion.
 * Scoped by URL pattern and HTTP method to support different retention
 * requirements for different GxP API integrations.
 *
 * Aligns with the HTTP client's own HttpAuditRetentionPolicy pattern (§104).
 *
 * Reference: 21 CFR 211.180 (records retention), EU GMP Annex 11 §7 (data storage),
 *            EU GMP Annex 11 §17 (archiving), ALCOA+ Enduring.
 */
interface HttpAuditRetentionPolicy {
  readonly _tag: "HttpAuditRetentionPolicy";
  /** URL pattern this retention policy applies to (glob syntax). */
  readonly urlPattern: string;
  /** HTTP methods this policy applies to. Empty array = all methods. */
  readonly methods: ReadonlyArray<string>;
  /** Retention period for active (hot) storage. */
  readonly retentionPeriod: HttpRetentionPeriod;
  /** Archival policy — defines when and how entries move to cold storage. */
  readonly archivalPolicy: HttpArchivalPolicy;
  /** Human-readable description of why this retention period was chosen. */
  readonly justification: string;
}

/**
 * Retention duration with regulatory justification.
 */
interface HttpRetentionPeriod {
  readonly _tag: "HttpRetentionPeriod";
  /** Number of years to retain audit entries in active storage. */
  readonly years: number;
  /** Regulatory reference justifying this retention period. */
  readonly regulatoryReference: string;
  /** Specific jurisdictional requirements (e.g., "FDA: 5 years", "EU: 10 years") */
  readonly jurisdictionalRequirements?: Readonly<Record<string, string>>;
}

/**
 * Controls how audit entries transition from active to archival storage.
 */
interface HttpArchivalPolicy {
  readonly _tag: "HttpArchivalPolicy";
  /** Number of days after creation before entries are eligible for archival. */
  readonly coldStorageAfterDays: number;
  /** Archive format. JSON preserves structure; CSV enables spreadsheet analysis. */
  readonly format: "json" | "csv";
  /** Whether the archive must remain queryable (vs. opaque blob storage). */
  readonly queryable: boolean;
  /** Whether to compress archived data. */
  readonly compress: boolean;
  /** Compression algorithm when compress is true. */
  readonly compressionAlgorithm: "gzip" | "zstd";
}
```

### Archive Manifest

```typescript
/**
 * Manifest accompanying each archive bundle.
 * Enables integrity verification of archived audit data without
 * reading every entry in the archive.
 *
 * Reference: EU GMP Annex 11 §17 (archiving), ALCOA+ Enduring, Consistent.
 */
interface HttpAuditArchiveManifest {
  readonly _tag: "HttpAuditArchiveManifest";
  /** Total number of audit entries in this archive. */
  readonly entryCount: number;
  /** Integrity hash of the first entry in the archive. */
  readonly firstEntryHash: string;
  /** Integrity hash of the last entry in the archive. */
  readonly lastEntryHash: string;
  /** SHA-256 checksum of the entire archive file. */
  readonly archiveChecksum: string;
  /** Hash algorithm used for archiveChecksum. */
  readonly checksumAlgorithm: "sha256";
  /** Scope IDs covered by this archive. */
  readonly scopeIds: ReadonlyArray<string>;
  /** Schema version of the audit entries in this archive. */
  readonly schemaVersion: string;
  /** ISO 8601 UTC timestamp of the earliest entry in the archive. */
  readonly earliestTimestamp: string;
  /** ISO 8601 UTC timestamp of the latest entry in the archive. */
  readonly latestTimestamp: string;
  /** ISO 8601 UTC timestamp when this archive was created. */
  readonly archivedAt: string;
}
```

### Archival Service Port

```typescript
/**
 * Port for managing audit trail archival lifecycle.
 *
 * This port formalizes the archival service contract that was previously
 * described only at the data model level (HttpArchivalPolicy, HttpAuditArchiveManifest).
 * It provides the programmatic interface for moving entries from active (hot)
 * storage to archival (cold) storage, restoring archived data, verifying
 * archive integrity, and managing the post-retention purge lifecycle.
 *
 * Outbound port. Singleton lifetime — one instance per application.
 *
 * Reference: EU GMP Annex 11 §7 (data storage), §17 (archiving),
 *            21 CFR 11.10(c) (protection of records), ALCOA+ Enduring.
 */
interface HttpAuditArchivalPort {
  readonly _tag: "HttpAuditArchivalPort";

  /**
   * Archive audit entries matching the given criteria.
   *
   * Moves entries from active storage to archival storage according to the
   * applicable HttpAuditRetentionPolicy. The archive operation:
   * 1. Selects entries eligible for archival (older than coldStorageAfterDays)
   * 2. Creates a self-contained archive bundle with HttpAuditArchiveManifest
   * 3. Verifies the archive bundle integrity (hash chain, checksum)
   * 4. Removes archived entries from active storage only after verification
   * 5. Records the archival operation as an HttpClientConfigurationAuditEntry
   *
   * The operation is atomic: either all selected entries are archived or
   * none are. Partial archival MUST NOT occur.
   */
  readonly archive: (
    filter: HttpAuditArchivalFilter
  ) => ResultAsync<HttpAuditArchiveResult, HttpAuditArchivalError>;

  /**
   * Restore archived audit entries back to active storage.
   *
   * Used for regulatory inspection access, incident investigation, or
   * migration scenarios. The restore operation:
   * 1. Verifies the archive bundle integrity (checksum, hash chain)
   * 2. Restores entries to active storage preserving all fields including
   *    hash chain metadata
   * 3. Reconciles with any entries already in active storage (deduplication)
   * 4. Records the restore operation in the independent restore-audit chain
   *
   * Restore is all-or-nothing: either the full archive is restored or
   * the operation fails without modifying active storage.
   */
  readonly restore: (
    archiveId: string
  ) => ResultAsync<HttpAuditRestoreResult, HttpAuditArchivalError>;

  /**
   * Verify the integrity of an archived audit bundle without restoring it.
   *
   * Performs three-level verification:
   * 1. Archive checksum verification (SHA-256 of the archive file)
   * 2. Hash chain verification (firstEntryHash to lastEntryHash continuity)
   * 3. Entry count verification (manifest entryCount matches actual count)
   *
   * Used for periodic archive health checks and pre-restore validation.
   */
  readonly verify: (
    archiveId: string
  ) => ResultAsync<HttpAuditArchiveVerificationResult, HttpAuditArchivalError>;

  /**
   * List all available archives with their manifests.
   *
   * Returns archives ordered by archivedAt descending (most recent first).
   * Supports filtering by time range and scope ID.
   */
  readonly listArchives: (
    filter?: HttpArchiveListFilter
  ) => ResultAsync<
    ReadonlyArray<HttpAuditArchiveManifest & { readonly archiveId: string }>,
    HttpAuditArchivalError
  >;

  /**
   * Purge an archived audit bundle after the retention period has expired.
   *
   * This is a destructive operation that permanently deletes archived data.
   * The purge operation:
   * 1. Verifies the retention period has expired for ALL entries in the archive
   * 2. Requires QA approval evidence (approverSubjectId and approvalReference)
   * 3. Verifies that at least one additional backup copy exists
   * 4. Records the purge operation as an HttpClientConfigurationAuditEntry
   *    including: archive ID, entry count purged, retention policy reference,
   *    approver identity, and approval reference
   * 5. Permanently deletes the archive bundle
   *
   * Purge MUST NOT proceed if any entry's retention period has not expired.
   */
  readonly purge: (
    archiveId: string,
    approval: HttpAuditPurgeApproval
  ) => ResultAsync<HttpAuditPurgeResult, HttpAuditArchivalError>;
}

interface HttpAuditArchivalFilter {
  readonly _tag: "HttpAuditArchivalFilter";
  /** Only archive entries older than this date (ISO 8601 UTC). */
  readonly olderThan: string;
  /** Optional scope ID filter. When omitted, archives entries from all scopes. */
  readonly scopeId?: string;
  /** The retention policy governing these entries. */
  readonly retentionPolicy: HttpAuditRetentionPolicy;
}

interface HttpAuditArchiveResult {
  readonly _tag: "HttpAuditArchiveResult";
  /** Unique identifier for this archive bundle. */
  readonly archiveId: string;
  /** The manifest for the created archive. */
  readonly manifest: HttpAuditArchiveManifest;
  /** Number of entries moved from active to archival storage. */
  readonly entriesArchived: number;
  /** ISO 8601 UTC timestamp of archive completion. */
  readonly archivedAt: string;
}

interface HttpAuditRestoreResult {
  readonly _tag: "HttpAuditRestoreResult";
  /** The archive ID that was restored. */
  readonly archiveId: string;
  /** Number of entries restored to active storage. */
  readonly entriesRestored: number;
  /** Number of entries deduplicated (already present in active storage). */
  readonly entriesDeduplicated: number;
  /** ISO 8601 UTC timestamp of restore completion. */
  readonly restoredAt: string;
}

interface HttpAuditArchiveVerificationResult {
  readonly _tag: "HttpAuditArchiveVerificationResult";
  /** The archive ID that was verified. */
  readonly archiveId: string;
  /** Whether the archive checksum matches the file content. */
  readonly checksumValid: boolean;
  /** Whether the hash chain from firstEntryHash to lastEntryHash is unbroken. */
  readonly hashChainIntact: boolean;
  /** Whether the manifest entryCount matches the actual entry count. */
  readonly entryCountValid: boolean;
  /** Overall verification: true only when all three checks pass. */
  readonly verified: boolean;
  /** ISO 8601 UTC timestamp of verification. */
  readonly verifiedAt: string;
}

interface HttpArchiveListFilter {
  readonly _tag: "HttpArchiveListFilter";
  /** Only return archives created after this date (ISO 8601 UTC). */
  readonly archivedAfter?: string;
  /** Only return archives created before this date (ISO 8601 UTC). */
  readonly archivedBefore?: string;
  /** Filter by scope ID. */
  readonly scopeId?: string;
}

interface HttpAuditPurgeApproval {
  readonly _tag: "HttpAuditPurgeApproval";
  /** Subject ID of the QA approver authorizing the purge. */
  readonly approverSubjectId: string;
  /** Reference to the approval document (e.g., CAPA number, CR number). */
  readonly approvalReference: string;
  /** ISO 8601 UTC timestamp of the approval. */
  readonly approvedAt: string;
  /** Justification for the purge. */
  readonly justification: string;
}

interface HttpAuditPurgeResult {
  readonly _tag: "HttpAuditPurgeResult";
  /** The archive ID that was purged. */
  readonly archiveId: string;
  /** Number of entries permanently deleted. */
  readonly entriesPurged: number;
  /** ISO 8601 UTC timestamp of purge completion. */
  readonly purgedAt: string;
}

interface HttpAuditArchivalError {
  readonly _tag: "HttpAuditArchivalError";
  readonly code:
    | "ARCHIVE_FAILED"
    | "RESTORE_FAILED"
    | "VERIFICATION_FAILED"
    | "ARCHIVE_NOT_FOUND"
    | "RETENTION_NOT_EXPIRED"
    | "PURGE_DENIED"
    | "BACKUP_COPY_REQUIRED"
    | "INTEGRITY_VIOLATION";
  readonly message: string;
  /** The archive ID involved, if applicable. */
  readonly archiveId?: string;
}
```

```
REQUIREMENT: When gxp is true, an HttpAuditArchivalPort adapter MUST be registered
             in the DI container. The createGxPHttpClient factory (§103) MUST verify
             at construction time that an HttpAuditArchivalPort adapter is available.
             If HttpAuditArchivalPort is not registered, the factory MUST throw a
             ConfigurationError with error code "GXP_ARCHIVAL_PORT_MISSING" and the
             message: "GxP mode requires an HttpAuditArchivalPort for audit trail
             archival lifecycle management. Register an archival adapter that implements
             archive(), restore(), verify(), and purge() operations."
             Reference: EU GMP Annex 11 §7, §17, 21 CFR 11.10(c).
```

```
REQUIREMENT: The archive() operation MUST be atomic. Either all entries matching the
             filter are archived and removed from active storage, or none are. The
             implementation MUST verify the archive bundle integrity (hash chain,
             checksum, entry count) before removing entries from active storage. If
             verification fails, the archive operation MUST roll back and return
             Err(HttpAuditArchivalError) with code "INTEGRITY_VIOLATION".
             Reference: ALCOA+ Enduring, 21 CFR 11.10(c).
```

```
REQUIREMENT: The purge() operation MUST verify three preconditions before proceeding:
             (1) the retention period has expired for ALL entries in the archive
             (if any entry's retention period has not expired, return Err with code
             "RETENTION_NOT_EXPIRED"), (2) QA approval evidence is provided via
             HttpAuditPurgeApproval (missing or invalid approval returns Err with
             code "PURGE_DENIED"), and (3) at least one additional backup copy of
             the archive exists (if no backup copy can be confirmed, return Err
             with code "BACKUP_COPY_REQUIRED"). The purge MUST be recorded as an
             HttpClientConfigurationAuditEntry (§88) with configurationKey
             "AUDIT_ARCHIVE_PURGED" before the data is deleted.
             Reference: 21 CFR 211.180 (retention period), EU GMP Annex 11 §17.
```

```
REQUIREMENT: Organizations MUST schedule automated archive verification on a
             monthly basis using HttpAuditArchivalPort.verify(). Verification
             failures MUST trigger an operational alert and be classified as
             an incident per §83c at the appropriate severity level. Archive
             verification results MUST be retained as evidence of ongoing data
             integrity and included in periodic review documentation (§83b).
             Reference: EU GMP Annex 11 §7, §17, ALCOA+ Enduring.
```

### Requirements

```
REQUIREMENT: HTTP audit entries MUST be retained for a minimum of 5 years from
             the date of creation unless an HttpAuditRetentionPolicy specifies
             a longer period. The 5-year default aligns with the minimum retention
             period for pharmaceutical manufacturing records under 21 CFR 211.180.
             Entries MUST NOT be deleted or modified during the retention period.
             Organizations operating under EU GMP MUST use 10-year retention
             for batch-related records (EU GMP Annex 11 §17). See the Retention
             Period Decision Table below for jurisdiction-based guidance.
             Reference: 21 CFR 211.180, EU GMP Annex 11 §17.
```

### Retention Period Decision Table

Organizations MUST select their retention period based on the applicable regulatory jurisdictions. When multiple jurisdictions apply, the longest retention period MUST be used.

| Jurisdiction | Record Type | Minimum Retention | Regulation | Notes |
|-------------|-------------|-------------------|------------|-------|
| **FDA (US)** | Manufacturing batch records | 5 years | 21 CFR 211.180 | 1 year past expiry or 3 years after distribution, whichever is longer |
| **FDA (US)** | Clinical trial records | 5 years | 21 CFR 312.62 | 2 years after drug approval or investigation termination |
| **FDA (US)** | Laboratory records | 5 years | 21 CFR 211.194 | Same as manufacturing batch records |
| **EU GMP** | Batch-related records | 10 years | EU GMP Annex 11 §17, Ch. 4.26 | 1 year past batch expiry or 5 years after batch release, whichever is longer |
| **EU GMP** | Non-batch records | 5 years | EU GMP Ch. 4.26 | Administrative and supporting quality records |
| **Japan (PMDA)** | Manufacturing records | 5 years | JP Pharmaceutical Affairs Law | After marketing authorization expiry |
| **Multi-jurisdiction** | Any GxP record | **10 years** | — | When serving both FDA and EU markets, use the longest applicable period |

```
REQUIREMENT: When an organization operates under multiple regulatory jurisdictions,
             the HttpAuditRetentionPolicy.retentionPeriod.years MUST be set to the
             longest applicable retention period from the jurisdictions served. The
             retentionPeriod.regulatoryReference MUST cite all applicable regulations.
             Organizations MUST document their retention period selection rationale
             in the Validation Plan (§83a, VP Section 12).
             Reference: 21 CFR 211.180, EU GMP Annex 11 §17.
```

```
REQUIREMENT: Archived audit data MUST be self-contained. Each archive bundle MUST
             include: (1) all audit entries for the archive scope and time range,
             (2) the hash chain integrity metadata (integrityHash, previousHash,
             hashAlgorithm for every entry), (3) an HttpAuditArchiveManifest, and
             (4) the schema version identifier for the entry format. An archive
             MUST be verifiable without access to the original runtime system or
             active audit trail.
             Reference: EU GMP Annex 11 §7, 21 CFR 11.10(c).
```

```
REQUIREMENT: Archive integrity MUST be verifiable. The HttpAuditArchiveManifest
             MUST include the firstEntryHash and lastEntryHash from the hash chain.
             The archiveChecksum MUST be a SHA-256 digest of the complete archive
             file. On archive read, the implementation MUST verify: (1) the
             archiveChecksum matches the file content, (2) the hash chain from
             firstEntryHash to lastEntryHash is unbroken, and (3) the entryCount
             matches the actual number of entries. Any verification failure MUST
             produce an error and MUST NOT return partial or unverified data.
             Reference: 21 CFR 11.10(c), ALCOA+ Enduring.
```

```
REQUIREMENT: Audit trail storage capacity MUST be monitored. The implementation
             MUST emit health events at the following thresholds:
             - 70% capacity: INFO level event with projected days until full
             - 85% capacity: WARNING level event with urgent archival recommendation
             - 95% capacity: CRITICAL level event requiring immediate action
             Capacity monitoring MUST account for both active and unconfirmed
             entries (see HttpAuditTrailPort.unconfirmedEntries, section 91).
             Reference: EU GMP Annex 11 §7, 21 CFR 11.10(c).
```

```
RECOMMENDED: HttpAuditRetentionPolicy periods SHOULD be aligned with the
             retention policies configured for corresponding authorization
             evaluation entries. When an authorization decision
             authorizes an HTTP operation, the retention period for both the
             authorization AuditEntry and the HttpOperationAuditEntry SHOULD be
             identical, ensuring cross-correlation queries (section 97) remain
             valid for the entire retention period.
```

```
REQUIREMENT: Audit trail storage locations MUST comply with applicable regional
             data sovereignty regulations. Organizations MUST document the
             geographic location(s) of active audit trail storage, archival
             storage, and backup storage in the Validation Plan (§83a). When
             GxP data is subject to EU data protection regulations, audit trail
             storage (including backups and archives) MUST reside within the
             European Economic Area (EEA) unless an approved data transfer
             mechanism is in place. When GxP data is subject to other regional
             regulations (e.g., China PIPL, Brazil LGPD), the same principle
             applies to the relevant jurisdiction. Cross-border audit trail
             migration (§104b) MUST verify data sovereignty compliance in the
             target system before migration proceeds.
             Reference: EU GMP Annex 11 §7, MHRA DI Guidance §6.20.
```

---

## 104a. Audit Trail Backup and Restore Procedures

### Regulatory Drivers

| Regulation             | Requirement                                            | Backup/Restore Relevance                                                      |
| ---------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **EU GMP Annex 11 §7** | Data storage — regular backups of all relevant data    | HTTP audit trail data MUST be included in backup procedures                   |
| **21 CFR 11.10(c)**    | Protection of records to enable accurate retrieval     | Backup procedures MUST preserve hash chain integrity for accurate restoration |
| **ALCOA+ Enduring**    | Records available throughout required retention period | Backup strategy MUST ensure no audit data loss during infrastructure failures |

### Backup Requirements

```
REQUIREMENT: GxP deployments MUST implement a documented backup strategy for HTTP
             audit trail data that covers: (1) the active audit entries in hot storage,
             (2) the hash chain metadata (integrityHash, previousHash, hashAlgorithm,
             sequenceNumber for every entry), (3) unconfirmed entries tracked by
             HttpAuditTrailPort.unconfirmedEntries() (§91), and (4) the WAL state
             when WAL crash recovery via HttpWalStorePort (§91) is in use. Backups MUST be
             performed at least daily for GxP environments.
             Reference: EU GMP Annex 11 §7, 21 CFR 11.10(c).
```

```
REQUIREMENT: Backup integrity MUST be verifiable. Each backup MUST include an
             HttpAuditArchiveManifest (§104) computed at backup time. On restore,
             the implementation MUST verify: (1) the archiveChecksum matches the
             backup content, (2) the hash chain from firstEntryHash to lastEntryHash
             is unbroken, (3) the entryCount matches the actual number of entries,
             and (4) sequenceNumber continuity is preserved. Any verification
             failure during restore MUST halt the restore operation and produce a
             CRITICAL alert. Partial restores MUST NOT be permitted — either the
             full backup is restored or the operation fails.
             Reference: 21 CFR 11.10(c), ALCOA+ Enduring.
```

### Restore Procedures

```
REQUIREMENT: The restore procedure MUST preserve hash chain integrity. When
             restoring from backup, the implementation MUST:
             (1) Verify the backup integrity (archiveChecksum, hash chain, entry count)
             (2) Compare the backup's lastEntryHash against the current active trail's
                 genesis entry to detect overlap or gaps
             (3) Reconcile any entries that exist in both the backup and the active
                 trail (deduplicate by sequenceNumber)
             (4) Record a ConfigurationAuditEntry (§88) documenting the restore
                 operation, including: restore timestamp, backup identifier, entry
                 count restored, reason for restore, and the identity of the
                 operator who initiated the restore
             (5) Re-verify the hash chain after restoration completes
             Reference: EU GMP Annex 11 §7, ALCOA+ Consistent.
```

```
REQUIREMENT: Restore operations MUST be auditable. Each restore MUST produce
             an HttpClientConfigurationAuditEntry (§88) in a separate
             "restore-audit" chain that is independent of the restored data.
             This prevents circular dependency where the restore audit entry
             would need to be part of the chain being restored. The restore
             audit chain MUST be backed up independently.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

```
RECOMMENDED: Organizations SHOULD implement automated backup verification that
             runs after each backup completes. The verification SHOULD restore the
             backup to a staging environment and run hash chain verification
             (verifyAuditChain) against the restored data. Failed backup
             verifications SHOULD trigger an operational alert and be documented
             as part of the periodic review (§83b).
```

```
RECOMMENDED: Organizations SHOULD maintain at least three backup generations
             (grandfather-father-son rotation) and store backups in geographically
             separate locations. Backup retention SHOULD match or exceed the
             HttpAuditRetentionPolicy (§104) retention period.
```

---

## 104b. Audit Trail Cross-System Migration

### Regulatory Drivers

| Regulation              | Requirement                                                      | Migration Relevance                                                   |
| ----------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| **EU GMP Annex 11 §17** | Archiving — ability to retrieve data throughout retention period | Migration MUST NOT compromise retrievability of historical audit data |
| **EU GMP Annex 11 §10** | Change management                                                | System migrations MUST be controlled, documented, and validated       |
| **ALCOA+ Consistent**   | Cross-referenced data consistent throughout                      | Hash chain continuity MUST be maintained across system boundaries     |

### Migration Scope

Audit trail migration covers scenarios where HTTP audit data must move between storage systems while preserving regulatory compliance:

| Scenario                        | Example                                                | Risk                                                            |
| ------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| **Database migration**          | PostgreSQL → Oracle, or version upgrade                | Hash chain integrity, character encoding, timestamp precision   |
| **Storage tier migration**      | On-premise → cloud, or cloud provider change           | Data sovereignty, encryption at rest, access control continuity |
| **Schema migration**            | VersionedAuditEntry schema upgrade (§83)               | Field mapping, default value population, backward compatibility |
| **Transport adapter switchover** | Fetch adapter → Undici adapter within same audit trail | See §80a for in-flight request handling                         |

### Migration Requirements

```
REQUIREMENT: Audit trail migrations MUST preserve hash chain integrity. The
             migration procedure MUST:
             (1) Export the source audit trail using QueryableHttpAuditTrailPort.export()
                 (§105) with an HttpAuditArchiveManifest
             (2) Import entries into the target system preserving all fields including
                 integrityHash, previousHash, hashAlgorithm, and sequenceNumber
             (3) Verify the hash chain in the target system using verifyAuditChain()
             (4) Verify the target system's HttpAuditArchiveManifest matches the
                 source manifest (entryCount, firstEntryHash, lastEntryHash)
             (5) Record the migration as an HttpClientConfigurationAuditEntry (§88)
                 in both the source and target systems
             Any hash chain verification failure MUST halt the migration and
             preserve the source system in its original state.
             Reference: EU GMP Annex 11 §17, ALCOA+ Consistent, Enduring.
```

```
REQUIREMENT: Migrated audit data MUST remain queryable through the same
             QueryableHttpAuditTrailPort interface (§105) after migration.
             Cross-correlation queries via evaluationId (§97) MUST continue
             to function across migrated data. If the authorization audit trail is
             migrated to a different system than the HTTP audit trail, the
             evaluationId correlation key MUST be preserved in both systems.
             Reference: 21 CFR 11.10(b), EU GMP Annex 11 §17.
```

```
REQUIREMENT: Schema migrations (VersionedAuditEntry version changes per §83)
             MUST follow the migration rules defined in §83: (1) new fields are
             optional with defaults, (2) existing fields are never removed,
             (3) unknown versions are rejected. The migration procedure MUST
             record the source schemaVersion and target schemaVersion in the
             migration audit entry. Entries MUST NOT be modified during
             migration beyond adding new optional fields with default values.
             Reference: EU GMP Annex 11 §7, ALCOA+ Original.
```

```
RECOMMENDED: Organizations SHOULD perform a trial migration in a staging
             environment before executing production migrations. The trial
             SHOULD include: (1) full data export and import, (2) hash chain
             verification, (3) cross-correlation query testing, (4) performance
             benchmarking of QueryableHttpAuditTrailPort operations on migrated
             data, and (5) archive integrity verification. Trial migration
             results SHOULD be documented as part of the change control record.
```

```
RECOMMENDED: Organizations SHOULD maintain read-only access to the source
             audit system for a minimum of 90 days after migration to enable
             rollback if post-migration issues are discovered. The source
             system MUST NOT be decommissioned until the target system has
             passed a full periodic review cycle (§83b).
```

---

## 104c. Audit Data-at-Rest Encryption

### Regulatory Drivers

| Regulation                 | Requirement                                                        | Encryption Relevance                                                       |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **21 CFR 11.10(c)**        | Protection of records to enable accurate and ready retrieval       | Encrypted audit data MUST remain decryptable for the full retention period |
| **21 CFR 11.30**           | Controls for open systems — encryption of records                  | Audit records stored in open systems MUST be encrypted at rest             |
| **EU GMP Annex 11 §7**     | Data storage — appropriate controls to prevent unauthorized access | Encryption prevents unauthorized access to stored audit data               |
| **EU GMP Annex 11 §12**    | Security — physical and logical controls                           | Encryption is a logical control protecting data confidentiality            |
| **MHRA DI Guidance §6.20** | Data should be protected by physical and logical means             | At-rest encryption is a logical protection measure                         |

### Encryption Policy

```typescript
/**
 * Defines the encryption requirements for audit data at rest.
 * Applies to both active (hot) storage and archived (cold) storage.
 *
 * This policy governs encryption of HttpOperationAuditEntry and
 * AuthenticationFailureAuditEntry records persisted via
 * HttpAuditTrailPort (§91) and HttpAuditArchivalPort (§104).
 */
interface HttpAuditEncryptionPolicy {
  readonly _tag: "HttpAuditEncryptionPolicy";
  /**
   * Encryption algorithm for audit data at rest.
   * AES-256-GCM is the default and REQUIRED minimum for GxP.
   * GCM mode provides both confidentiality and authenticity
   * (authenticated encryption), eliminating the need for a
   * separate HMAC.
   *
   * **GxP restriction:** "aes-256-cbc" is PROHIBITED when gxp is true.
   * CBC mode lacks authenticated encryption and MUST NOT be used for
   * GxP audit data. It is included only for non-GxP development and
   * testing environments. The createHttpAuditTrailAdapter factory
   * throws ConfigurationError if "aes-256-cbc" is selected in GxP mode.
   */
  readonly algorithm: "aes-256-gcm" | "aes-256-cbc" | "chacha20-poly1305";
  /**
   * Key management strategy.
   * - "envelope": Data encrypted with a Data Encryption Key (DEK),
   *   DEK encrypted with a Key Encryption Key (KEK) from the KMS.
   *   REQUIRED for production GxP deployments.
   * - "direct": Data encrypted directly with a key from the KMS.
   *   Permitted only for development and testing.
   */
  readonly keyManagement: "envelope" | "direct";
  /**
   * Maximum number of days before key rotation is required.
   * Default: 90 days. Maximum: 365 days for GxP deployments.
   */
  readonly keyRotationDays: number;
  /** Whether to encrypt WAL entries (in addition to backing store). */
  readonly encryptWal: boolean;
  /** Whether to encrypt archived audit data. */
  readonly encryptArchives: boolean;
  /**
   * KMS provider identifier for key lifecycle management.
   * Examples: "aws-kms", "azure-keyvault", "gcp-kms", "hashicorp-vault", "local-keystore".
   * The "local-keystore" provider is permitted only for development and testing.
   */
  readonly kmsProvider: string;
}
```

### Encryption Port

```typescript
/**
 * Port for encrypting and decrypting audit data at rest.
 *
 * Outbound port. Singleton lifetime — one instance per application.
 * Implementations delegate to the organization's KMS infrastructure.
 */
interface HttpAuditEncryptionPort {
  readonly _tag: "HttpAuditEncryptionPort";
  /**
   * Encrypt audit entry data before persistence.
   * Returns the encrypted payload with metadata for decryption.
   */
  readonly encrypt: (
    plaintext: Uint8Array,
    context: EncryptionContext
  ) => ResultAsync<EncryptedAuditData, AuditEncryptionError>;
  /**
   * Decrypt previously encrypted audit entry data.
   * Requires the same key version that was used for encryption.
   */
  readonly decrypt: (
    encrypted: EncryptedAuditData,
    context: EncryptionContext
  ) => ResultAsync<Uint8Array, AuditEncryptionError>;
  /**
   * Rotate the active encryption key.
   * Existing data remains encrypted with the previous key version.
   * New data is encrypted with the rotated key.
   */
  readonly rotateKey: () => ResultAsync<KeyRotationResult, AuditEncryptionError>;
  /**
   * Verify that the encryption key for a given version is accessible.
   * Used during IQ verification and periodic health checks.
   */
  readonly verifyKeyAccess: (keyVersion: string) => ResultAsync<boolean, AuditEncryptionError>;
}

/**
 * Contextual metadata passed to encrypt/decrypt operations.
 * Used by KMS implementations for access control and audit logging.
 */
interface EncryptionContext {
  readonly _tag: "EncryptionContext";
  /** Type of data being encrypted. */
  readonly dataType: "audit-entry" | "wal-entry" | "archive";
  /** Scope identifier for access control decisions. */
  readonly scopeId: string;
  /** Retention policy associated with this data. */
  readonly retentionYears: number;
}

/**
 * Result of encrypting audit data.
 */
interface EncryptedAuditData {
  readonly _tag: "EncryptedAuditData";
  /** The encrypted ciphertext. */
  readonly ciphertext: Uint8Array;
  /** Initialization vector / nonce used for encryption. */
  readonly iv: Uint8Array;
  /** Authentication tag (for GCM/Poly1305 modes). */
  readonly authTag: Uint8Array;
  /** Key version identifier for decryption key lookup. */
  readonly keyVersion: string;
  /** Algorithm used (mirrors policy for self-describing records). */
  readonly algorithm: string;
}

/**
 * Result of a key rotation operation.
 */
interface KeyRotationResult {
  readonly _tag: "KeyRotationResult";
  /** The new key version identifier. */
  readonly newKeyVersion: string;
  /** The previous key version (still needed for existing data). */
  readonly previousKeyVersion: string;
  /** ISO 8601 UTC timestamp of rotation. */
  readonly rotatedAt: string;
}

/**
 * Error from encryption/decryption operations.
 */
interface AuditEncryptionError {
  readonly _tag: "AuditEncryptionError";
  readonly code:
    | "ENCRYPTION_FAILED"
    | "DECRYPTION_FAILED"
    | "KEY_NOT_FOUND"
    | "KEY_ROTATION_FAILED"
    | "KMS_UNAVAILABLE"
    | "INVALID_CIPHERTEXT"
    | "AUTH_TAG_MISMATCH";
  readonly message: string;
  /** The key version involved, if applicable. */
  readonly keyVersion?: string;
}
```

### Requirements

```
REQUIREMENT: When gxp is true, audit data at rest MUST be encrypted using AES-256
             or stronger authenticated encryption (AES-256-GCM, ChaCha20-Poly1305).
             The HttpAuditEncryptionPolicy.algorithm MUST be set to "aes-256-gcm"
             (default) or "chacha20-poly1305". AES-256-CBC without authenticated
             encryption MUST NOT be used in GxP mode. The createHttpAuditTrailAdapter
             factory MUST throw a ConfigurationError with message "GxP mode requires
             authenticated encryption (AES-256-GCM or ChaCha20-Poly1305). AES-256-CBC
             is not permitted." if algorithm is "aes-256-cbc" and gxp is true.
             Reference: 21 CFR 11.30, NIST SP 800-38D, EU GMP Annex 11 §7.
```

```
REQUIREMENT: Production GxP deployments MUST use envelope encryption
             (keyManagement: "envelope"). In envelope encryption, each audit entry
             (or batch of entries) is encrypted with a unique Data Encryption Key
             (DEK), and the DEK is encrypted with a Key Encryption Key (KEK) managed
             by the KMS. This limits the blast radius of a single key compromise
             to one DEK's worth of data. The createHttpAuditTrailAdapter factory
             MUST throw a ConfigurationError with message "GxP mode requires envelope
             encryption. Direct key management is not permitted for production
             deployments." if keyManagement is "direct" and gxp is true.
             Reference: NIST SP 800-57, 21 CFR 11.30.
```

```
REQUIREMENT: Encryption keys MUST be rotated at intervals not exceeding
             HttpAuditEncryptionPolicy.keyRotationDays (default: 90 days, maximum:
             365 days). Key rotation MUST be non-disruptive: existing data remains
             encrypted with the previous key version; only new data uses the rotated
             key. All previous key versions MUST remain accessible for the full
             retention period of data encrypted with those versions. Key rotation
             events MUST produce an HttpClientConfigurationAuditEntry (§88) with
             configurationKey "ENCRYPTION_KEY_ROTATED" and the old and new key
             version identifiers.
             Reference: NIST SP 800-57, EU GMP Annex 11 §7.
```

```
REQUIREMENT: The createHttpAuditTrailAdapter factory MUST validate that the
             HttpAuditEncryptionPort is registered and accessible when gxp is true.
             If the encryption port is not registered, the factory MUST throw a
             ConfigurationError with code "GXP_ENCRYPTION_PORT_MISSING" and message
             "GxP mode requires an HttpAuditEncryptionPort for audit data-at-rest
             encryption." The validation MUST also verify key access by calling
             verifyKeyAccess() for the current active key version.
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
REQUIREMENT: Archive manifests (HttpAuditArchiveManifest from §104) MUST store
             encryption metadata in plaintext alongside the encrypted archive data.
             The manifest MUST include: (1) the keyVersion used to encrypt the
             archive, (2) the algorithm, and (3) the KMS provider identifier. This
             enables archive retrieval without runtime access to the encryption
             policy configuration. The manifest itself MUST NOT contain key material.
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c).
```

```
RECOMMENDED: Organizations SHOULD include encryption health checks in the IQ
             verification (§99): (1) verify that the active encryption key is
             accessible, (2) perform a round-trip encrypt/decrypt cycle with test
             data, (3) verify that all key versions referenced by active audit
             data are accessible, and (4) verify that key rotation can be triggered
             without data loss. These checks SHOULD be automated and executed
             during periodic reviews (§83b).
```

### Key Ceremony Procedures

```
RECOMMENDED: Production GxP deployments SHOULD follow formal key ceremony
             procedures for audit encryption key lifecycle events (initial
             generation, rotation, recovery, decommissioning):

             1. **Key generation authorization**: Initial key generation and
                scheduled rotations MUST be performed only by personnel with
                the "encryption-admin" role (or equivalent organizational role).
                The authorization MUST be documented in the Change Request system
                (§116) before the ceremony begins.

             2. **Split knowledge / multi-custodian**: For production Key
                Encryption Keys (KEKs), organizations SHOULD implement split
                knowledge — the KEK SHOULD be generated such that no single
                individual has access to the complete key material. For KMS-
                managed keys (AWS KMS, Azure Key Vault, GCP KMS, HashiCorp
                Vault), the KMS access policy SHOULD require multi-party
                approval for key management operations.

             3. **Key generation audit**: Every key generation event MUST
                produce an HttpClientConfigurationAuditEntry (§88) with
                configurationKey "ENCRYPTION_KEY_GENERATED", including:
                the new key version identifier, the algorithm, the KMS
                provider, the identity of the authorized personnel, and
                the Change Request reference. The key material itself MUST
                NOT appear in the audit entry.

             4. **Key escrow / recovery**: Organizations MUST document a key
                recovery procedure in the Validation Plan (§83a) that enables
                decryption of audit data if the primary KMS becomes permanently
                unavailable. Recovery procedures SHOULD be tested annually
                during the periodic review (§83b). Acceptable recovery
                approaches include: KMS cross-region replication, offline
                key backup in HSM-protected storage, or m-of-n key splitting
                with custodians.

             5. **Key decommissioning**: When a key version is no longer
                referenced by any active or archived audit data (i.e., all
                data encrypted with that key version has exceeded its
                retention period and been deleted), the key version SHOULD
                be decommissioned. Decommissioning MUST produce an
                HttpClientConfigurationAuditEntry with configurationKey
                "ENCRYPTION_KEY_DECOMMISSIONED".

             Reference: NIST SP 800-57 Part 2 (key management for
             organizational use), 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

---

## 104d. Archive Media Integrity Risk Assessment

### Regulatory Drivers

| Regulation | Requirement | Archive Media Relevance |
|-----------|-------------|------------------------|
| **EU GMP Annex 11 §7** | Data stored at external locations must be protected and retrievable | Archive storage media MUST remain readable throughout the retention period (5-30 years per §104) |
| **EU GMP Annex 11 §17** | Data should be secured by both physical and electronic means against damage | Archive media degradation MUST be assessed and mitigated for long-term retention |
| **21 CFR 211.180** | Records must be retained for specified periods | Archived audit data MUST survive media degradation throughout the regulatory retention period |
| **ALCOA+ Enduring** | Data must be preserved for the required retention period | Audit trail data integrity MUST be maintained despite storage media aging |

### Media Degradation Risk Assessment

Storage media used for GxP audit trail archives is subject to degradation over the 5-30 year retention periods required by §104. The following risk assessment identifies failure modes and mitigations for long-term archive integrity.

| Risk Factor | Description | Likelihood (5yr) | Likelihood (10yr) | Likelihood (30yr) | Mitigation |
|------------|-------------|-------------------|--------------------|--------------------|-----------|
| **Bit rot / silent data corruption** | Individual bits flip due to cosmic rays, magnetic decay, or NAND cell leakage | Low | Medium | High | Hash chain verification (§91 `verifyAuditChain()`) detects corruption; scheduled integrity checks per §83b Configuration Drift Detection |
| **Media obsolescence** | Storage format becomes unreadable (e.g., tape format discontinued, cloud provider sunset) | Very Low | Low | Medium | Migration procedure (§104b) enables proactive migration to current media; media format review during annual periodic review (§83b) |
| **Encryption key loss** | KEK or DEK becomes inaccessible due to KMS migration or key ceremony personnel changes | Low | Medium | Medium | Key rotation (§104c) with envelope encryption; key escrow procedures; KMS disaster recovery (CV-06) |
| **Storage provider failure** | Cloud provider outage, data center decommissioning, or bankruptcy | Very Low | Low | Medium | 3-generation backup (§104a); geographically distributed backups; contractual data portability clauses (VP §14) |
| **Index corruption** | Archive index becomes inconsistent with archive data, preventing retrieval | Low | Low | Medium | Archive manifest checksum verification (§104b); backup index separately from data |

```
REQUIREMENT: Organizations retaining GxP audit trail archives for 5 or more years
             MUST implement an Archive Media Integrity Program that includes:
             (1) Scheduled integrity verification: run verifyAuditChain() on archived
                 data at least annually during periodic review (§83b),
             (2) Media health monitoring: monitor storage media health metrics (e.g.,
                 S.M.A.R.T. for disk, error rates for tape, provider health for cloud)
                 and flag degradation warnings,
             (3) Proactive migration: migrate archive data to current media formats
                 before the existing format reaches end-of-support, using the migration
                 procedure in §104b,
             (4) Backup verification: restore and verify at least one archive segment
                 annually per the backup verification schedule in §104a
                 (backupVerificationSchedule, Appendix F parameter #18),
             (5) Encryption key continuity: verify that all KEK and DEK versions
                 referenced by archived data remain accessible via
                 HttpAuditEncryptionPort.verifyKeyAccess() (§104c),
             (6) Document the Archive Media Integrity Program as part of the Validation
                 Plan (§83a) and review annually during periodic review (§83b).
             Reference: EU GMP Annex 11 §7, §17, 21 CFR 211.180, ALCOA+ Enduring.
```

### Jurisdiction-Specific Maximum Retention Periods and Media Integrity Test Intervals

The §104 Retention Period Decision Table specifies minimum retention periods. For archive media integrity planning, organizations MUST also consider the maximum retention period implied by their regulatory obligations. The following table provides jurisdiction-specific guidance for upper-bound retention planning and corresponding media integrity test intervals that increase in frequency as media ages.

| Jurisdiction | Record Type | Minimum Retention | Maximum Practical Retention | Regulation | Media Integrity Test Interval |
|-------------|-------------|-------------------|-----------------------------|------------|-------------------------------|
| **FDA (US)** | Manufacturing batch records | 5 years | 1 year past product expiry (may exceed 10 years for long-shelf-life products) | 21 CFR 211.180(a) | Annual for years 1-5; semi-annual for years 6-10; quarterly beyond 10 years |
| **FDA (US)** | Clinical trial records | 5 years | 15 years (2 years after drug approval, which may be 10+ years after study start) | 21 CFR 312.62, ICH E6(R2) §8 | Annual for years 1-5; semi-annual for years 6-10; quarterly for years 11-15 |
| **EU GMP** | Batch-related records | 10 years | 15 years (1 year past batch expiry for biological products with 5-year shelf life manufactured 10 years ago) | EU GMP Annex 11 §17, Ch. 4.26 | Annual for years 1-5; semi-annual for years 6-10; quarterly for years 11-15 |
| **EU GMP** | Non-batch records | 5 years | 10 years (per organizational policy for quality system records) | EU GMP Ch. 4.26 | Annual for years 1-5; semi-annual for years 6-10 |
| **Japan (PMDA)** | Manufacturing records | 5 years | 30 years (biological products and records related to regenerative medicine per JP PMD Act Article 14-4-2; 15 years typical for small-molecule pharmaceuticals after marketing authorization expiry) | JP Pharmaceutical Affairs Law, JP PMD Act | Annual for years 1-5; semi-annual for years 6-15; quarterly for years 16-30 |
| **Brazil (ANVISA)** | Manufacturing records | 5 years | 10 years (per RDC 17/2010 for quality records) | RDC 17/2010 | Annual for years 1-5; semi-annual for years 6-10 |
| **China (NMPA)** | Manufacturing records | 5 years | Product lifecycle + 5 years (can exceed 15 years for long-lifecycle biologics) | Drug Administration Law Art. 36, GMP Annex | Annual for years 1-5; semi-annual for years 6-10; quarterly beyond 10 years |
| **Multi-jurisdiction** | Any GxP record | 10 years | **30 years** (when serving global markets including Japan PMDA) | All applicable | Per longest applicable jurisdiction's interval schedule |

```
REQUIREMENT: When configuring HttpAuditRetentionPolicy.retentionPeriod, organizations
             MUST consider the maximum practical retention period for their regulatory
             jurisdictions, not only the minimum. The retentionPeriod.years value MUST
             be set to accommodate the longest-lived record type in the deployment.
             The Archive Media Integrity Program (§104d REQUIREMENT above) MUST use
             the media integrity test intervals from this table, increasing test
             frequency as archive age grows. Organizations serving Japan (PMDA) with
             biological or regenerative medicine products MUST plan for up to 30-year
             retention and MUST budget for at least 2 proactive media migrations
             during the archive lifecycle (e.g., at years 10 and 20).
             Reference: 21 CFR 211.180, EU GMP Annex 11 §17, JP PMD Act,
             ALCOA+ Enduring.
```

### Archive Integrity Monitoring Schedule

| Activity | Frequency | Evidence | Escalation |
|---------|-----------|----------|------------|
| `verifyAuditChain()` on active data | Per `hashChainVerificationInterval` (Appendix F #33, default daily) | Chain verification report | CAPA (§83d) if chain broken |
| `verifyAuditChain()` on archived data | Annual (during periodic review per §83b) | Archive integrity report | Restore from backup; initiate CAPA |
| Storage media health check | Quarterly | Media health report | Proactive migration if degradation detected |
| **Proactive media refresh** | **Every 3 years** (maximum interval 38 months) | Media refresh execution report with pre/post integrity verification | Ensures archive media remains readable before age-related degradation; refresh cycle MUST include: (1) integrity verification of source media, (2) copy to new media, (3) integrity verification of target media, (4) audit trail entry documenting the refresh |
| Encryption key accessibility check | Annual (during periodic review per §83b) | Key accessibility report | KMS DR procedure per CV-06 |
| Archive format currency review | Annual (during periodic review per §83b) | Format currency assessment | Schedule migration per §104b if format approaching EOL |

```
REQUIREMENT: Organizations MUST implement a proactive archive media refresh program
             with a maximum interval of 3 years (38 months) between consecutive
             refresh cycles. Each refresh cycle MUST: (1) verify integrity of the
             source archive media via verifyAuditChain() and SHA-256 manifest
             verification, (2) copy all archive data to new media, (3) verify
             integrity of the target media post-copy, (4) record an audit trail
             entry documenting the refresh with source media identifier, target
             media identifier, verification results, and executor identity,
             (5) retain the source media for at least 90 days after successful
             target verification before decommissioning. Organizations serving
             Japan (PMDA) with 30-year retention requirements MUST budget for at
             least 9 proactive media refresh cycles during the archive lifecycle.
             Reference: EU GMP Annex 11 §7, §17, 21 CFR 211.180, ALCOA+ Enduring.
```

---

## 105. HTTP Audit Trail Query and Retrieval Port

### Regulatory Drivers

| Regulation                 | Requirement                                                 | HTTP Audit Query Relevance                                                     |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **21 CFR 11.10(b)**        | Ability to generate accurate and complete copies of records | Auditors MUST be able to query and export HTTP audit entries on demand         |
| **21 CFR 11.10(e)**        | Audit trail available for FDA review                        | Regulatory inspectors MUST have timely access to HTTP operation audit data     |
| **EU GMP Annex 11 §9**     | Audit trail review capability                               | Systems MUST support structured queries against audit trail data               |
| **EU GMP Annex 11 §17**    | Archiving — retrievability                                  | Archived and active audit entries MUST be queryable through the same interface |
| **MHRA DI Guidance §6.14** | Audit trail review as part of routine data review           | Query port enables programmatic audit trail review workflows                   |

### Queryable Audit Port

```typescript
/**
 * Extended audit trail port that adds query, retrieval, and export capabilities.
 * This port enables regulatory inspectors and automated compliance workflows
 * to search, filter, and export HTTP operation audit entries.
 *
 * Extends HttpAuditTrailPort (section 91) with read operations.
 *
 * Reference: 21 CFR 11.10(b) (accurate and complete copies),
 *            EU GMP Annex 11 §9 (audit trails), §17 (archiving),
 *            ALCOA+ Available.
 */
interface QueryableHttpAuditTrailPort extends HttpAuditTrailPort {
  /**
   * Query audit entries matching the specified filter criteria.
   * All filter fields are AND-composed: entries must match ALL specified criteria.
   * Returns entries ordered by sequenceNumber ascending.
   */
  readonly query: (
    filter: HttpAuditQueryFilter
  ) => ResultAsync<ReadonlyArray<HttpOperationAuditEntry>, HttpAuditTrailReadError>;

  /**
   * Retrieve a single audit entry by its unique requestId.
   * Returns Err if the entry does not exist.
   */
  readonly getByRequestId: (
    requestId: string
  ) => ResultAsync<HttpOperationAuditEntry, HttpAuditTrailReadError>;

  /**
   * Retrieve all HTTP audit entries correlated to an authorization evaluationId.
   * Enables forward tracing from authorization decision to HTTP operations.
   */
  readonly getByEvaluationId: (
    evaluationId: string
  ) => ResultAsync<ReadonlyArray<HttpOperationAuditEntry>, HttpAuditTrailReadError>;

  /**
   * Count entries matching the filter without returning full entry data.
   * Useful for pagination and capacity reporting.
   */
  readonly count: (filter: HttpAuditQueryFilter) => ResultAsync<number, HttpAuditTrailReadError>;

  /**
   * Export audit entries matching the filter as a self-contained archive.
   * The export includes an HttpAuditArchiveManifest (section 104) for
   * integrity verification.
   */
  readonly export: (
    filter: HttpAuditQueryFilter,
    format: "json" | "csv"
  ) => ResultAsync<HttpAuditExportResult, HttpAuditTrailReadError>;
}
```

### Query Filter

```typescript
/**
 * Filter criteria for HTTP audit trail queries.
 * All fields are optional. When multiple fields are specified, they are
 * AND-composed: an entry must match ALL specified criteria to be returned.
 */
interface HttpAuditQueryFilter {
  readonly _tag: "HttpAuditQueryFilter";
  /** Filter by subject identity. */
  readonly subjectId?: string;
  /** Filter by authorization evaluation ID (cross-correlation). */
  readonly evaluationId?: string;
  /** Filter by HTTP method. */
  readonly httpMethod?: string;
  /** Filter by URL pattern (glob syntax). */
  readonly urlPattern?: string;
  /** Filter by operation outcome. */
  readonly outcome?: "success" | "failure" | "denied";
  /** Filter by minimum HTTP status code (inclusive). */
  readonly statusCodeMin?: number;
  /** Filter by maximum HTTP status code (inclusive). */
  readonly statusCodeMax?: number;
  /** Filter by entries created at or after this timestamp (ISO 8601 UTC). */
  readonly timestampFrom?: string;
  /** Filter by entries created at or before this timestamp (ISO 8601 UTC). */
  readonly timestampTo?: string;
  /** Filter by scope ID. */
  readonly scopeId?: string;
  /** Filter by minimum sequence number (inclusive). */
  readonly sequenceNumberFrom?: number;
  /** Filter by maximum sequence number (inclusive). */
  readonly sequenceNumberTo?: number;
  /** Maximum number of entries to return. Default: 100. Max: 10000. */
  readonly limit?: number;
  /** Number of entries to skip (for pagination). Default: 0. */
  readonly offset?: number;
}
```

### Error Types

```typescript
interface HttpAuditTrailReadError {
  readonly _tag: "HttpAuditTrailReadError";
  readonly code: "QUERY_FAILED" | "ENTRY_NOT_FOUND" | "EXPORT_FAILED" | "ACCESS_DENIED";
  readonly message: string;
}

/**
 * Result of an audit trail export operation.
 * Includes the exported data and an integrity manifest.
 */
interface HttpAuditExportResult {
  readonly _tag: "HttpAuditExportResult";
  /** The exported data as a string (JSON array or CSV). */
  readonly data: string;
  /** Integrity manifest for the exported data. */
  readonly manifest: HttpAuditArchiveManifest;
}
```

### Requirements

```
REQUIREMENT: When gxp is true on the HTTP client configuration, implementations MUST provide
             a QueryableHttpAuditTrailPort that extends HttpAuditTrailPort with
             query, retrieval, and export capabilities. The base HttpAuditTrailPort
             (section 91) remains sufficient for non-GxP environments. GxP
             environments MUST support all 12 filter fields in HttpAuditQueryFilter.
             Reference: 21 CFR 11.10(b), EU GMP Annex 11 §9.
```

```
REQUIREMENT: Regulatory inspector access to HTTP audit data MUST be available
             within 4 hours of request during business hours. This SLA covers
             the end-to-end process: from inspector request receipt through
             access provisioning, system login, and initial data availability.
             Once access is granted, individual programmatic queries via
             QueryableHttpAuditTrailPort MUST return within the seconds-based
             SLAs defined in this section (§105) regardless of data volume.
             The 4-hour SLA and seconds-based SLAs are complementary:
             - 4-hour SLA: human-process metric (access provisioning)
             - Seconds-based SLAs: system-performance metric (query response)
             Both SLAs apply to active (hot) and archived (cold) entries.
             The QueryableHttpAuditTrailPort MUST transparently query across
             both active and archived data when timestampFrom/timestampTo spans
             the archival boundary. Inspectors MUST NOT need to know whether
             entries are in active or archived storage.
             Reference: 21 CFR 11.10(b), EU GMP Annex 11 §17.
```

```
REQUIREMENT: Cross-correlation queries MUST be supported. Given an evaluationId
             from an authorization AuditEntry, getByEvaluationId() MUST return all
             HttpOperationAuditEntry records that reference that evaluation.
             Given a requestId from an HttpOperationAuditEntry, the authorization audit
             trail MUST be queryable to find the corresponding AuditEntry.
             This bidirectional traceability enables complete audit trails
             spanning both authorization decisions and HTTP operations.
             Reference: ALCOA+ Attributable, ALCOA+ Consistent.
```

```
REQUIREMENT: Exported audit data MUST be complete. The export() method MUST
             include: (1) all entries matching the filter, (2) hash chain
             integrity metadata for every entry, and (3) an HttpAuditArchiveManifest
             with a SHA-256 checksum of the exported data. Partial exports
             (where some matching entries are omitted) MUST NOT be returned
             without an explicit error.
             Reference: 21 CFR 11.10(b), ALCOA+ Complete.
```

### Meta-Audit Entry Type

```typescript
/**
 * Entry recorded in the meta-audit chain when the HTTP audit trail is accessed.
 * Each read operation on QueryableHttpAuditTrailPort produces exactly one
 * HttpAuditMetaEntry in the independent meta-audit hash chain.
 *
 * Reference: 21 CFR 11.10(e), EU GMP Annex 11 §12.
 */
interface HttpAuditMetaEntry {
  readonly _tag: "HttpAuditMetaEntry";
  /** Schema version for forward compatibility. */
  readonly schemaVersion: number;
  /** Unique identifier for this meta-audit event. */
  readonly metaEntryId: string;
  /** Identity of the user or system that accessed the audit trail. */
  readonly accessorId: string;
  /** Type of read operation performed. */
  readonly operationType: "query" | "getByRequestId" | "getByEvaluationId" | "count" | "export";
  /**
   * The query filter or parameters used for the read operation.
   * For getByRequestId: the requestId. For getByEvaluationId: the evaluationId.
   * For query/count/export: the serialized HttpAuditQueryFilter.
   */
  readonly queryParameters: string;
  /** Number of audit entries returned or exported by the operation. */
  readonly resultCount: number;
  /** ISO 8601 UTC timestamp when the read operation was performed. */
  readonly timestamp: string;
  /**
   * Consistency point (snapshot timestamp or sequence number) at which
   * the query was evaluated. Enables reproducibility of query results.
   */
  readonly consistencyPoint: string;
  /** Scope identifier for the meta-audit chain. */
  readonly scopeId: string;
  /** Per-scope sequence number in the meta-audit chain. */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash (SHA-256). */
  readonly integrityHash: string;
  /** Previous meta-audit entry's integrity hash (empty for genesis). */
  readonly previousHash: string;
  /** Hash algorithm identifier. */
  readonly hashAlgorithm: string;
}
```

```
REQUIREMENT: All read operations on the HTTP audit trail (query, getByRequestId,
             getByEvaluationId, count, export) MUST themselves be audit-logged
             as meta-audit events. Each meta-audit event MUST produce an
             HttpAuditMetaEntry with all fields populated. The accessorId MUST
             be the authenticated identity of the user or system performing the
             read. Anonymous access (empty accessorId) MUST be rejected with
             HttpAuditTrailReadError code "ACCESS_DENIED". The operationType,
             queryParameters, resultCount, and timestamp fields are REQUIRED.
             The consistencyPoint field MUST record the snapshot at which the
             query was evaluated to enable audit reproducibility.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §12.
```

```
REQUIREMENT: Meta-audit entries MUST participate in their own independent hash
             chain with the same integrity guarantees as the primary HTTP audit
             chain (§91): append-only semantics, monotonically increasing
             sequenceNumber, SHA-256 integrityHash, previousHash linking, and
             WAL crash recovery when gxp is true. The meta-audit chain MUST be
             independent from the primary HTTP audit chain to prevent circular
             dependency (a meta-audit entry for a query operation MUST NOT be
             inserted into the chain being queried). The meta-audit chain MUST
             be verifiable via the same verifyAuditChain() mechanism used for
             the primary chain. Meta-audit chain integrity MUST be included in
             periodic review (§83b) and backup procedures (§104a).
             Reference: 21 CFR 11.10(e), ALCOA+ Enduring, Consistent.
```

```
REQUIREMENT: All read operations on the QueryableHttpAuditTrailPort (query,
             getByRequestId, getByEvaluationId, count, export) MUST provide
             snapshot isolation or equivalent read consistency guarantees. The
             result set returned by a query MUST be consistent as of a single
             point in time — concurrent writes that occur during query execution
             MUST NOT produce partial, duplicated, or torn results. Specifically:
             (1) A query MUST NOT return an entry that was partially written
                 (all fields or no fields).
             (2) A query MUST NOT return different results if executed twice
                 with the same filter against the same underlying data (when no
                 writes occur between executions).
             (3) Concurrent export operations MUST produce independent archives
                 with consistent, non-overlapping data. Each export's
                 HttpAuditArchiveManifest MUST accurately reflect the entries
                 contained in that specific export.
             (4) The consistency point (snapshot timestamp or sequence number)
                 MUST be recorded in the query's meta-audit event (§105
                 meta-audit requirement) to enable reproducibility.
             Implementations backed by relational databases SHOULD use
             SERIALIZABLE or SNAPSHOT transaction isolation. Implementations
             backed by append-only logs inherit natural read consistency from
             the log's sequential nature.
             Reference: ALCOA+ Available, ALCOA+ Consistent, 21 CFR 11.10(b).
```

### Query Performance SLAs

Performance targets for QueryableHttpAuditTrailPort operations ensure that audit trail access meets regulatory timeliness requirements and provides objective acceptance criteria for Performance Qualification (§99).

```
REQUIREMENT: QueryableHttpAuditTrailPort implementations MUST meet the following
             query performance SLAs when operating against the active (hot) audit
             data store:
             (1) query() — MUST return results within 5 seconds for datasets up to
                 100,000 entries with any combination of filter fields
             (2) getByRequestId() — MUST return within 500 milliseconds regardless
                 of dataset size (indexed lookup)
             (3) getByEvaluationId() — MUST return within 2 seconds for datasets
                 up to 100,000 entries (indexed lookup)
             (4) count() — MUST return within 3 seconds for datasets up to
                 100,000 entries
             (5) export() — MUST complete within 60 seconds for result sets up to
                 10,000 entries; MUST complete within 300 seconds for result sets
                 up to 100,000 entries
             These SLAs apply under normal operating conditions (system not in
             degraded mode per §115.6) with concurrent read load of up to 10
             simultaneous queries. Organizations MAY define stricter SLAs based
             on their operational requirements.
             Reference: EU GMP Annex 11 §7, ALCOA+ Available, 21 CFR 11.10(b).
```

```
REQUIREMENT: When queries span the archival boundary (timestampFrom/timestampTo
             covering both active and archived data), the combined query MUST
             complete within 30 seconds for result sets up to 10,000 entries.
             Organizations MUST document any performance degradation for archive-
             spanning queries in the Validation Plan (§83a) and validate the
             acceptable response times during Performance Qualification (§99).
             Reference: EU GMP Annex 11 §17, ALCOA+ Available.
```

```
REQUIREMENT: Performance Qualification (§99) MUST include benchmark tests that
             verify the query performance SLAs defined above. PQ benchmarks MUST:
             (1) populate the audit store with at least 100,000 representative
                 entries before measuring query performance
             (2) measure each operation (query, getByRequestId, getByEvaluationId,
                 count, export) under the specified dataset size
             (3) execute benchmarks with 10 concurrent queries to verify SLA
                 compliance under concurrent load
             (4) record actual response times as PQ evidence
             (5) fail PQ if any operation exceeds its SLA threshold
             PQ benchmark results MUST be reviewed during periodic reviews (§83b)
             to detect performance degradation trends.
             Reference: EU GMP Annex 11 §7, GAMP 5 Appendix D.4.
```

---

## 106. Certificate Revocation Checking Protocol

### Regulatory Drivers

| Regulation                | Requirement                                      | Certificate Revocation Relevance                                                                |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **21 CFR 11.30**          | Controls for open systems including encryption   | Revoked certificates MUST NOT be used for GxP data transmission                                 |
| **21 CFR 11.10(d)**       | Limiting system access to authorized individuals | Certificate revocation ensures that compromised identities cannot establish trusted connections |
| **EU GMP Annex 11 §12**   | Security — physical and logical controls         | Certificate revocation is a logical control preventing use of compromised credentials           |
| **NIST SP 800-52 Rev. 2** | TLS implementation guidance                      | OCSP and CRL checking are recommended for production TLS deployments                            |

### Revocation Policy

```typescript
/**
 * Configures how certificate revocation status is checked during TLS handshake.
 * Replaces the simple boolean checkRevocation on CertificateValidationPolicy (section 85)
 * with a comprehensive revocation checking strategy.
 *
 * The methods array defines priority order: the implementation tries each method
 * in sequence until one returns a definitive result (good or revoked).
 */
interface CertificateRevocationPolicy {
  readonly _tag: "CertificateRevocationPolicy";
  /** Whether revocation checking is enabled. */
  readonly enabled: boolean;
  /**
   * Ordered list of revocation checking methods.
   * The implementation tries each method in sequence.
   * - "ocsp-stapling": OCSP response stapled to TLS handshake (fastest, no extra network call)
   * - "ocsp": Online Certificate Status Protocol (real-time check against CA's OCSP responder)
   * - "crl": Certificate Revocation List (periodic download of revocation list from CA)
   */
  readonly methods: ReadonlyArray<"ocsp-stapling" | "ocsp" | "crl">;
  /**
   * Behavior when all revocation checking methods fail (network error, timeout, etc.).
   * - "hard-fail": Reject the connection. Safe default for GxP environments.
   * - "soft-fail": Allow the connection with a WARNING log. Appropriate for
   *   environments where OCSP/CRL infrastructure may be intermittently unavailable.
   */
  readonly failureMode: "hard-fail" | "soft-fail";
  /** Maximum age of cached OCSP responses in seconds. Default: 3600 (1 hour). */
  readonly ocspCacheMaxAge: number;
  /** Maximum age of cached CRL data in seconds. Default: 86400 (24 hours). */
  readonly crlCacheMaxAge: number;
  /** Timeout for OCSP/CRL network requests in milliseconds. Default: 5000 (5 seconds). */
  readonly timeout: number;
  /** Whether to prefer OCSP stapling when available. Default: true. */
  readonly preferOcspStapling: boolean;
  /**
   * Whether to accept OCSP "tryLater" responses as non-failure.
   * When true, "tryLater" is treated as "unknown" (subject to failureMode).
   * When false, "tryLater" is treated as a method failure and the next method is tried.
   * Default: false.
   */
  readonly acceptTryLater: boolean;
  /**
   * OCSP stapling verification timeout in milliseconds.
   * When the server provides a stapled OCSP response during the TLS handshake,
   * this timeout governs how long the client waits to verify the stapled response
   * signature. Separate from the `timeout` field which governs network requests.
   * Default: 2000 (2 seconds).
   * Reference: RFC 6066 §8, RFC 6960.
   */
  readonly ocspStapleVerificationTimeout: number;
  /**
   * Whether to require OCSP stapling from the server (OCSP Must-Staple).
   * When true, servers that do not provide a stapled OCSP response during
   * TLS handshake are treated as a revocation check failure (subject to
   * failureMode). Corresponds to the TLS Certificate Status Request
   * extension (RFC 6066 §8) and the OCSP Must-Staple certificate extension
   * (RFC 7633). Default: false.
   * RECOMMENDED for Category 1 GxP endpoints.
   * Reference: RFC 7633, NIST SP 800-52 Rev. 2.
   */
  readonly requireOcspStapling: boolean;
  /**
   * CRL Distribution Point (CDP) override URLs.
   * When non-empty, these URLs are used instead of the CDP URLs embedded in
   * the certificate's CRL Distribution Points extension (RFC 5280 §4.2.1.13).
   * Useful when the organization operates a local CRL mirror for air-gapped
   * or high-availability environments. When empty, CDP URLs from the
   * certificate are used.
   * Reference: RFC 5280 §4.2.1.13.
   */
  readonly crlDistributionPointOverrides: ReadonlyArray<string>;
  /**
   * Certificate Transparency (CT) integration with revocation checking.
   * When true, revocation check results are cross-referenced with CT logs
   * to detect certificates that were revoked but still appear in CT logs
   * (indicating potential misissue). This provides defense-in-depth
   * complementing the CT verification in §90b.
   * Default: false.
   * Reference: RFC 6962, NIST SP 800-52 Rev. 2.
   */
  readonly crossReferenceCT: boolean;
}
```

### Revocation Result

```typescript
/**
 * Result of a certificate revocation check.
 * Recorded in audit entries for traceability.
 */
interface CertificateRevocationResult {
  readonly _tag: "CertificateRevocationResult";
  /** Which method produced this result. */
  readonly method: "ocsp-stapling" | "ocsp" | "crl" | "none";
  /** Revocation status. */
  readonly status: "good" | "revoked" | "unknown" | "error";
  /** ISO 8601 UTC timestamp when the check was performed. */
  readonly checkedAt: string;
  /** ISO 8601 UTC timestamp when the revocation data was produced by the CA. */
  readonly producedAt: string;
  /** Whether this result came from a local cache. */
  readonly cached: boolean;
  /** Serial number of the certificate that was checked. */
  readonly certificateSerial: string;
  /** Common Name of the certificate issuer. */
  readonly issuerCN: string;
}
```

### Requirements

```
REQUIREMENT: When CertificateRevocationPolicy.enabled is true, the implementation
             MUST check certificate revocation status using the configured methods
             in priority order. The default method priority MUST be: (1) ocsp-stapling,
             (2) ocsp, (3) crl. The implementation MUST try each method in sequence
             until a definitive result (status "good" or "revoked") is obtained.
             If all methods return "unknown" or "error", the failureMode policy applies.
             Reference: NIST SP 800-52 Rev. 2, 21 CFR 11.30.
```

```
REQUIREMENT: When failureMode is "hard-fail" and all revocation checking methods
             fail to produce a definitive result, the connection MUST be rejected.
             The rejection MUST produce an HttpRequestError with code
             "REVOCATION_CHECK_FAILED" containing: (1) the hostname, (2) the
             certificate serial number, (3) which methods were attempted, and
             (4) the failure reason for each method.
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: When failureMode is "soft-fail" and all revocation checking methods
             fail, the connection MUST be allowed but a WARNING MUST be logged
             for every such connection. The WARNING MUST include: (1) the hostname,
             (2) the certificate serial number, (3) which methods were attempted,
             and (4) the failure reason for each method. Soft-fail connections
             MUST be flagged in the HttpOperationAuditEntry (section 92) with a
             "revocationCheckFailed" marker for post-hoc review.
             Reference: NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: A certificate with revocation status "revoked" MUST always be
             rejected regardless of failureMode. Revoked certificates MUST
             produce an HttpRequestError with code "CERTIFICATE_REVOKED"
             containing: (1) the hostname, (2) the certificate serial number,
             (3) the issuer CN, and (4) the revocation method that detected it.
             Revoked certificate connections MUST be recorded as critical
             security events in the audit trail.
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
RECOMMENDED: Implementations SHOULD prefer OCSP stapling over direct OCSP queries
             when the server supports it (preferOcspStapling: true). OCSP stapling
             eliminates the privacy concern of querying the CA's OCSP responder
             directly (which reveals which sites the client is connecting to) and
             reduces latency by avoiding an extra network round-trip. When OCSP
             stapling is not available, the implementation SHOULD fall back to
             direct OCSP, then CRL.
```

```
REQUIREMENT: Certificate revocation check results MUST be included in the
             HttpOperationAuditEntry (section 92) when revocation checking is
             enabled. The CertificateRevocationResult MUST be recorded for every
             HTTPS connection, including: method used, status, timestamps, cached
             flag, certificate serial, and issuer CN. This enables post-hoc
             verification that all connections were properly validated.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
RECOMMENDED: Organizations operating in GxP environments SHOULD use hard-fail
             mode (failureMode: "hard-fail") for all production deployments.
             Soft-fail mode SHOULD be reserved for development, staging, or
             environments where OCSP/CRL infrastructure is documented as
             unreliable with a risk acceptance in the FMEA (section 98).
             The chosen failureMode SHOULD be documented in the Validation
             Plan (section 83a).
```

---

## 107. Electronic Signature Verification Protocol

### Regulatory Drivers

| Regulation              | Requirement                                                        | Signature Verification Relevance                                               |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **21 CFR 11.50**        | Signature manifestations — signed records must display signer info | Verification ensures signature data is intact and displayable                  |
| **21 CFR 11.70**        | Signature/record linking — signatures must be bound to records     | Verification confirms the cryptographic binding between signature and record   |
| **21 CFR 11.100**       | General requirements for electronic signatures                     | Verification ensures each signature is unique to the signer and not reusable   |
| **21 CFR 11.200**       | Electronic signature components and controls                       | Verification confirms the signer's identity and authorization status           |
| **EU GMP Annex 11 §14** | Electronic signatures — equivalent to handwritten                  | Verification protocols ensure electronic signatures maintain legal equivalence |

### Signature Verification Port

```typescript
/**
 * Port for verifying electronic signatures on HTTP operations.
 * Used to verify previously captured signatures (section 93a) and
 * to validate signatures received from external systems.
 *
 * Outbound port. Singleton lifetime.
 */
interface HttpSignatureVerificationPort {
  readonly _tag: "HttpSignatureVerificationPort";

  /**
   * Verify a single electronic signature.
   * Performs three-property verification: binding integrity, signer status,
   * and temporal validity.
   */
  readonly verify: (
    signature: HttpElectronicSignature,
    requestDigest: string
  ) => ResultAsync<HttpSignatureVerificationResult, HttpSignatureVerificationError>;

  /**
   * Verify multiple signatures in a single call.
   * All signatures are verified independently; the batch result
   * contains individual results for each signature.
   */
  readonly verifyBatch: (
    signatures: ReadonlyArray<{
      readonly signature: HttpElectronicSignature;
      readonly requestDigest: string;
    }>
  ) => ResultAsync<ReadonlyArray<HttpSignatureVerificationResult>, HttpSignatureVerificationError>;

  /**
   * Check the current status of a signer's identity.
   * Used for periodic re-verification of previously signed records.
   */
  readonly checkSignerStatus: (
    signerId: string
  ) => ResultAsync<SignerStatusResult, HttpSignatureVerificationError>;
}
```

### Verification Result

```typescript
/**
 * Result of verifying an electronic signature.
 * Uses three-property verification as required by 21 CFR 11.70 and 11.100:
 * 1. bindingIntact — the cryptographic link between signature and record is valid
 * 2. signerActive — the signer's identity is current and not revoked
 * 3. temporallyValid — the signature was created within acceptable time bounds
 */
interface HttpSignatureVerificationResult {
  readonly _tag: "HttpSignatureVerificationResult";
  /** Whether the signature binding matches the record content. */
  readonly bindingIntact: boolean;
  /** Whether the signer's identity is active (not revoked, suspended, or expired). */
  readonly signerActive: boolean;
  /** Whether the signature was created within the acceptable time window. */
  readonly temporallyValid: boolean;
  /** Overall verification outcome: true only when all three properties are true. */
  readonly verified: boolean;
  /** Diagnostic messages for each property that failed verification. */
  readonly diagnostics: ReadonlyArray<string>;
  /** ISO 8601 UTC timestamp when verification was performed. */
  readonly verifiedAt: string;
  /** The signerId from the verified signature. */
  readonly signerId: string;
}

/**
 * Result of checking a signer's current status.
 */
interface SignerStatusResult {
  readonly _tag: "SignerStatusResult";
  /** Current status of the signer identity. */
  readonly status: "active" | "revoked" | "suspended" | "expired" | "unknown";
  /** Reason for the current status (e.g., "Certificate expired 2026-01-15"). */
  readonly reason: string;
  /** ISO 8601 UTC timestamp when the status was checked. */
  readonly checkedAt: string;
  /** The signerId that was checked. */
  readonly signerId: string;
}
```

### Verification Configuration

```typescript
/**
 * Configuration for electronic signature verification.
 */
interface HttpSignatureVerificationConfig {
  readonly _tag: "HttpSignatureVerificationConfig";
  /**
   * Maximum age of a signature in seconds before it is considered temporally invalid.
   * Prevents replay of old signatures. Default: 300 (5 minutes).
   */
  readonly maxSignatureAge: number;
  /**
   * Maximum clock skew tolerance in seconds between the signing system
   * and the verification system. Default: 30 seconds.
   */
  readonly maxClockSkew: number;
  /**
   * Whether to use constant-time comparison for signature binding verification.
   * MUST be true in production to prevent timing side-channel attacks.
   * Default: true.
   */
  readonly constantTimeComparison: boolean;
}
```

### Error Types

```typescript
interface HttpSignatureVerificationError {
  readonly _tag: "HttpSignatureVerificationError";
  readonly code:
    | "VERIFICATION_FAILED"
    | "SIGNER_NOT_FOUND"
    | "BINDING_COMPUTATION_ERROR"
    | "CLOCK_SKEW_EXCEEDED"
    | "VERIFICATION_TIMEOUT";
  readonly message: string;
  /** The signerId associated with the failed verification, if available. */
  readonly signerId?: string;
}
```

### Requirements

```
REQUIREMENT: When electronic signatures are used for HTTP operations (section 93a),
             a HttpSignatureVerificationPort MUST be available for post-hoc
             verification of captured signatures. The verification port MUST be
             resolvable from the DI container when gxp is true and electronic
             signatures are configured.
             Reference: 21 CFR 11.100, EU GMP Annex 11 §14.
```

```
REQUIREMENT: Signature verification MUST perform three-property verification:
             (1) bindingIntact — recompute SHA-256(signerId + "|" + signedAt +
             "|" + meaning + "|" + requestDigest) and compare against the
             signature's signatureBinding field (section 93a);
             (2) signerActive — verify the signer's identity is active via
             checkSignerStatus();
             (3) temporallyValid — verify the signature's signedAt timestamp
             is within maxSignatureAge of the current time, accounting for
             maxClockSkew.
             The overall verified result MUST be true only when all three
             properties are true.
             Reference: 21 CFR 11.70, 21 CFR 11.100.
```

```
REQUIREMENT: When a signer's status is "revoked" or "suspended", all signatures
             from that signer MUST fail the signerActive check. Revoked signer
             verification failures MUST be recorded as critical security events
             in the audit trail via HttpAuditTrailPort (section 91). The audit
             entry MUST include: (1) the signerId, (2) the signer's current
             status, (3) the requestId of the originally signed operation, and
             (4) the verification timestamp.
             Reference: 21 CFR 11.200, 21 CFR 11.300.
```

```
REQUIREMENT: All signature verification operations (verify, verifyBatch,
             checkSignerStatus) MUST be recorded in the audit trail. Each
             verification event MUST include: (1) the signerId, (2) the
             verification result (all three properties), (3) the verifier's
             identity (subjectId of the user or system performing verification),
             and (4) the timestamp. Verification audit entries participate in
             the same hash chain as other HttpOperationAuditEntry records.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: Signature binding verification MUST use constant-time comparison
             (constantTimeComparison: true) to prevent timing side-channel
             attacks that could leak information about the expected binding
             value. Constant-time comparison is the default and MUST NOT be
             disabled in production GxP environments.
             Reference: 21 CFR 11.70, NIST SP 800-131A.
```

```
REQUIREMENT: Organizations MUST implement periodic re-verification of
             previously signed records per the following schedule:
             (1) daily re-verification of signatures from the past 24 hours,
             (2) weekly sampling of older signatures (minimum 1% sample), and
             (3) full re-verification within 24 hours when a signer's status
             changes to "revoked" or "suspended".
             Periodic verification detects retroactive signature invalidation
             due to signer status changes. Re-verification failures MUST be
             classified as incidents per §83c and trigger investigation of
             all records signed by the affected signer. Re-verification results
             MUST be documented and retained as part of periodic review evidence (§83b).
             Reference: 21 CFR 11.70, 21 CFR 11.100, EU GMP Annex 11 §14.
```

---

_Previous: [20 - HTTP Transport Validation](./20-http-transport-validation.md) | Next: [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md)_
