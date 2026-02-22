# 17 - GxP Compliance: Audit Trail Contract

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-02                              |
| Revision         | 1.1                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.1 (2026-02-13): Added production chain re-verification schedule (§61.4c), circuit breaker pattern (§61.9), error log retention (§61.10) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Regulatory Context](./01-regulatory-context.md) | Next: [Clock Synchronization](./03-clock-synchronization.md)_

---

## 61. AuditTrailPort Implementation Contract

### Behavioral Requirements for GxP-Compliant Adapters

An `AuditTrail` adapter used in a GxP-regulated environment MUST satisfy these behavioral invariants.

> **GxPAuditEntry:** GxP-compliant adapters MUST use the `GxPAuditEntry` type variant (defined in `07-guard-adapter.md` section 25) which makes the optional `AuditEntry` fields (`integrityHash`, `previousHash`, `hashAlgorithm`, `sequenceNumber`, `traceDigest`, `policySnapshot`, `signature`) non-optional. This ensures that GxP audit entries always carry integrity verification data and eliminates the possibility of accidentally persisting entries without hash chain participation.

```
REQUIREMENT: All GxP audit entry types — GxPAuditEntry (section 25 in
             07-guard-adapter.md), GxPHttpOperationAuditEntry (http-client spec
             §92 in 19-http-audit-bridge.md), and GxPAuthenticationFailureAuditEntry
             (http-client spec §92 in 19-http-audit-bridge.md) — MUST include a
             schemaVersion field. The schemaVersion MUST be included in the hash
             chain computation (section 61.4). Cross-system verification (e.g.,
             audit trail export/import between environments) MUST reject entries
             with unknown schemaVersion values — unknown versions indicate a
             schema mismatch that could produce incorrect hash chain verification.
             Reference: 21 CFR 11.10(c) (protection of records),
             ALCOA+ Consistent principle.
```

> **Cross-reference (M-2):** Scope disposal chain verification is specified in 07-guard-adapter.md section 25, "Chain Verification at Scope Disposal". When `gxp: true`, verifyAuditChain() MUST be invoked at disposal for scopes with at least one entry.

```
RECOMMENDED: Audit field values SHOULD respect the following maximum lengths to
             ensure consistent storage and hash computation across implementations:

             | Field            | Max Length | Notes                              |
             |------------------|------------|------------------------------------|
             | evaluationId     | 36         | UUID v4 format                     |
             | timestamp        | 30         | ISO 8601 with microseconds         |
             | subjectId        | 256        | Identity provider subject claim    |
             | authenticationMethod | 64     | e.g., "bearer", "api-key"          |
             | policy           | 1024       | Serialized policy label            |
             | decision         | 5          | "allow" or "deny"                  |
             | portName         | 128        | Adapter port identifier            |
             | scopeId          | 36         | UUID v4 format                     |
             | reason           | 2048       | Denial reason string               |
             | durationMs       | 15         | Numeric string representation      |
             | schemaVersion    | 5          | Numeric string representation      |
             | sequenceNumber   | 15         | Numeric string representation      |
             | traceDigest      | 64         | SHA-256 hex digest                 |
             | policySnapshot   | 64         | Content hash (SHA-256 hex or Git SHA) |
             | dataClassification | 64       | Optional risk-based classification label |

             If truncation is necessary, it MUST be applied before hash
             computation so that the stored value and hashed value are identical.
             A WARNING-level log MUST be emitted when any field is truncated,
             including the field name, original length, and truncated length.
```

```
REQUIREMENT: When gxp is true, the AuditTrail adapter MUST handle field values
             exceeding the maximum lengths defined in the table above using one
             of the following configurable strategies (default: reject):

             (a) Reject: Return Err(AuditTrailWriteError) with category
                 "field_truncation_rejected". The error MUST include the field
                 name, the maximum length, and the actual length. This is the
                 default because truncated fields produce a different hash input
                 than the original value, creating a discrepancy between the
                 application's view and the audit record's view.

             (b) Accept with metadata: Truncate the field to the maximum length,
                 include a "truncatedFields" metadata array in the AuditEntry
                 listing each truncated field (name, originalLength,
                 truncatedLength), and emit a WARNING-level log. The truncation
                 MUST be applied before hash computation so that the stored value
                 and hashed value are identical.

             The strategy MUST be configurable per-adapter via a
             fieldTruncationStrategy option ("reject" | "truncate"). The chosen
             strategy MUST be documented in the validation plan (section 67).
             Reference: 21 CFR 11.10(c) (accurate records),
             ALCOA+ Accurate principle.
```

```
RECOMMENDED: Audit entries SHOULD carry an optional `dataClassification` field
             (max 64 characters) to tag entries with organization-specific risk
             classification labels (e.g., "gxp-critical", "operational",
             "diagnostic"). This classification enables risk-based review frequency
             assignment per section 64: entries classified as "gxp-critical" may
             warrant daily review, while "diagnostic" entries may follow a monthly
             or quarterly review cadence.

             The `dataClassification` field does NOT participate in hash chain
             computation. It is metadata for review workflow categorization, not
             integrity data. Implementations MAY add, modify, or backfill
             `dataClassification` values on existing entries without breaking the
             hash chain. The field is optional for all environments (GxP and
             non-GxP alike).
             Reference: PIC/S PI 011-3 §9.8 (risk-based audit trail review),
             MHRA Data Integrity Guidance (2018).

REQUIREMENT: When gxp is true and the dataClassification field is added or modified
             on an existing audit entry (post-hoc backfill), a meta-audit record
             MUST be written to the MetaAuditTrailPort. The meta-audit record MUST
             use the _tag "DataClassificationChange" and MUST include: (1) the
             evaluationId of the modified entry, (2) the previous dataClassification
             value (or empty string if previously unset), (3) the new
             dataClassification value, (4) the identity of the person or process that
             made the change, (5) the timestamp of the change, and (6) the reason for
             the reclassification. This meta-audit record ensures that changes to
             review workflow categorization are traceable even though
             dataClassification is excluded from hash chain computation.
             Reference: PIC/S PI 011-3 §6.5 (auditability of optional controls),
             ALCOA+ Attributable.

RECOMMENDED: In non-GxP environments, organizations SHOULD follow the same
             meta-audit pattern for dataClassification changes as described in the
             REQUIREMENT above.
```

```typescript
interface DataClassificationChangeEntry {
  readonly _tag: "DataClassificationChange";
  /** evaluationId of the audit entry whose classification was changed. */
  readonly evaluationId: string;
  /** Previous dataClassification value ("" if previously unset). */
  readonly previousClassification: string;
  /** New dataClassification value. */
  readonly newClassification: string;
  /** Identity of the person or automated process that made the change. */
  readonly changedBy: string;
  /** ISO 8601 UTC timestamp of the classification change. */
  readonly changedAt: string;
  /** Reason for the reclassification. */
  readonly reason: string;
}
```

#### 1. Append-Only Semantics

```
REQUIREMENT: Once record() returns Ok, the entry MUST be permanently stored.
             The adapter MUST NOT provide update or delete operations on audit entries.
             The backing store MUST enforce append-only constraints at the schema level.
```

Implementation guidance:

- **SQL databases:** Use `INSERT`-only permissions on the audit table. Revoke `UPDATE` and `DELETE` from the application database role. Consider database-level triggers that prevent modifications.
- **Event stores:** Use append-only event streams (e.g., EventStoreDB, Kafka with log compaction disabled).
- **File systems:** Use append-only files with OS-level write protection. Consider WORM (Write Once Read Many) storage.

```
REQUIREMENT: GxP audit trail adapters MUST periodically verify that the append-only
             constraint is enforced at the storage level. At minimum, the OQ test suite
             (section 67b) MUST include test cases that attempt UPDATE and DELETE operations
             on persisted audit entries and confirm they are rejected by the storage layer.
             Reference: 21 CFR 11.10(e), ALCOA+ Original principle.
```

#### 2. Atomic Write Guarantee

```
REQUIREMENT: AuditTrail.record() MUST be atomic. Either the complete entry is persisted
             or nothing is persisted. Partial writes MUST NOT occur.
```

Implementation guidance:

- Use database transactions for SQL-backed adapters.
- Use fsync/flush for file-backed adapters.
- If the authorization decision and audit write must be in the same transaction, wrap both in the consumer's unit of work. The guard library itself does not manage transactions -- it calls `record()` after the decision is made.

#### 3. Completeness

```
REQUIREMENT: Every guard() evaluation (both allow and deny) MUST produce an audit entry.
             The adapter MUST NOT filter, sample, or drop entries.
```

The guard wrapper calls `AuditTrail.record()` for every evaluation. When `failOnAuditError` is `true` (the default), a failed `record()` call causes the guard to throw `AuditTrailWriteError` (ACL008), blocking the resolution entirely. This is the safe default for GxP-regulated environments per 21 CFR 11.10(e): every authorization decision MUST have a corresponding audit record, so a missing record is a compliance violation that must halt processing.

When `failOnAuditError` is explicitly set to `false` (opt-in for non-regulated environments), a failed `record()` call logs a warning but does NOT block the authorization decision. This weaker guarantee is acceptable only when audit completeness is not a regulatory requirement.

```
REQUIREMENT: GxP environments MUST implement completeness monitoring by comparing the
             count of container resolutions for guarded ports (measurable via DI container
             instrumentation or application-level metrics) against the count of audit
             entries for those ports. A discrepancy indicates a completeness violation —
             an evaluation occurred without a corresponding audit entry. This monitoring
             MUST run as part of the periodic review (section 64) and any discrepancy
             MUST be investigated as a compliance incident.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete principle.
```

> **Note:** The completeness comparison should account for in-flight evaluations. Comparisons SHOULD be performed against settled time windows where no evaluations are in progress, or SHOULD apply a tolerance equal to the maximum expected evaluation duration multiplied by the peak concurrent evaluation count.

```
RECOMMENDED: The @hex-di/guard package SHOULD provide a createCompletenessMonitor()
             utility that automates the resolution-vs-audit-entry comparison described
             in the REQUIREMENT above. The utility SHOULD:

             1. Maintain per-port counters for container resolutions and audit entries.
             2. Expose a queryCompleteness(portName) method returning:
                { resolutions: number; auditEntries: number; discrepancy: number }
             3. Integrate with createGuardHealthCheck() so that health checks include
                a completeness check for each monitored port.
             4. Accept a tolerance option (default: 0) to account for in-flight
                evaluations per the note above.
             5. Emit a WARNING-level log when a discrepancy exceeding the tolerance
                is detected.

             Reference: 21 CFR 11.10(e), ALCOA+ Complete principle.
```

```
REQUIREMENT: When gxp is true, the guard deployment MUST include a completeness
             monitoring mechanism equivalent to createCompletenessMonitor(). The
             mechanism MUST:

             1. Maintain per-port counters for container resolutions and audit entries.
             2. Expose a queryCompleteness(portName) method returning:
                { resolutions: number; auditEntries: number; discrepancy: number }
             3. Integrate with createGuardHealthCheck() so that health checks include
                a completeness check for each monitored port.
             4. Trigger the incident classification matrix (section 68) at the MAJOR
                severity level when a discrepancy exceeding the configured tolerance
                is detected.

             The existing RECOMMENDED block above applies to non-GxP environments.
             In GxP environments, completeness monitoring is mandatory because 21 CFR
             11.10(e) requires that audit trails "independently record" all actions —
             a silent gap between evaluations and audit entries would violate this.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete principle, GAMP 5 Category 5.
```

```
REQUIREMENT: When completeness monitoring detects a discrepancy exceeding the
             configured tolerance, the following escalation procedure MUST be
             followed:

             1. Automated alert: Within 1 minute of detection, an automated alert
                MUST be sent to the operations team with: port name, resolution
                count, audit entry count, and discrepancy magnitude.
             2. Routing: The alert MUST be routed to both the operations team and
                the QA/compliance team simultaneously.
             3. Acknowledgement SLA: The operations team MUST acknowledge the
                alert within 1 hour.
             4. Investigation SLA: A root cause investigation MUST be initiated
                within 4 hours of detection.
             5. Incident report: An initial incident report MUST be filed within
                24 hours per the site's deviation/CAPA process.
             6. Reconciliation: Any unexplained discrepancy (where root cause
                analysis cannot account for the gap between resolutions and audit
                entries) MUST be documented as a data integrity deviation and
                MUST trigger manual reconciliation of the affected port's audit
                trail for the discrepancy time window.

             These timelines align with the chain break response SLAs (section 61.4)
             and the incident classification matrix (section 68).
             Reference: 21 CFR 11.10(e), ALCOA+ Complete principle,
             EU GMP Annex 11 §13.
```

> **Synchronous Contract Note:** `AuditTrail.record()` returns `Result<void, AuditTrailWriteError>`, not `Promise<Result<...>>`. This is by design — the guard wrapper is synchronous (see `07-guard-adapter.md` section 25, "Synchronous by Design"). For network-backed audit adapters (e.g., writing to a remote database or event stream), the RECOMMENDED pattern is: (1) write synchronously to an in-memory buffer, (2) flush the buffer asynchronously to the backing store on a background interval or when a size threshold is reached, and (3) signal backpressure by returning `Err(AuditTrailWriteError)` from `record()` if the buffer is full. This ensures the guard evaluation path remains synchronous while allowing durable persistence to proceed asynchronously. See section 61 ("RECOMMENDED: Crash Recovery Patterns") for handling crashes between buffer write and flush.

#### 3a. Durability Semantics

When `AuditTrail.record()` returns `Ok`, the meaning of "persisted" depends on the adapter's **durability tier**. Two tiers are defined:

| Tier            | Meaning of `Ok`                                                                                                                                          | WAL Requirement                                                                 | Typical Implementations                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Durable Ok**  | The entry has been synchronously committed to durable storage (e.g., database transaction committed, fsync completed). The entry survives process crash. | WAL is optional (already durable).                                              | SQL databases with synchronous commit, file-backed stores with fsync.     |
| **Buffered Ok** | The entry has been accepted into an in-memory buffer. Durability depends on a subsequent asynchronous flush to backing storage.                          | WAL is REQUIRED when `gxp: true` (see "Crash Recovery: Write-Ahead Log" below). | Network-backed adapters, remote event streams, cloud-hosted audit stores. |

```
REQUIREMENT: The @hex-di/guard-testing package MUST ship a
             createBufferedAuditTrailExample() reference adapter that demonstrates the
             buffer → WAL → flush pattern for network-backed audit trail
             implementations. This reference adapter is a documentation and learning
             aid — not a production adapter. It MUST demonstrate: (1) synchronous
             record() accepting entries into an in-memory buffer, (2) WAL intent
             writing before buffer acceptance, (3) asynchronous flush to a backing
             store stub, (4) WAL completion marking after successful flush, and
             (5) backpressure signaling via Err when the buffer is full. The
             reference adapter MUST pass the conformance suite with
             durabilityTier: "buffered". Organizations implementing custom buffered
             adapters MUST use the reference adapter as the baseline pattern and
             MUST pass the same conformance suite.
             Reference: GAMP 5 (reference implementation for configurable systems).
```

```
REQUIREMENT: @hex-di/guard-testing MUST ship a createDurableAuditTrailExample()
             reference adapter that demonstrates the synchronous write-through
             pattern for durable audit trail implementations. This reference adapter
             is a documentation and learning aid — not a production adapter. It MUST
             use better-sqlite3 (dev dependency) to demonstrate: (1) synchronous
             record() with fsync-backed writes, (2) hash chain computation before
             write (integrityHash computed from the 14-field canonical payload
             including previousHash), (3) Err return with category
             "storage_unavailable" on I/O failure, (4) no intermediate buffer —
             Ok means the entry is durably persisted, and (5) conformance suite
             passage with durabilityTier: "durable". The reference adapter MUST
             include the ADR #47 field set distinction: the hash chain uses 14
             fields (including previousHash), while the signature canonical payload
             uses 13 fields (excluding previousHash). Organizations implementing
             custom durable adapters MUST use the reference adapter as the baseline
             pattern and MUST pass the same conformance suite.
             Reference: GAMP 5 (reference implementation for configurable systems),
             ADR #47 (signature/hash chain field set difference).
```

```
RECOMMENDED: AuditTrailPort adapter errors SHOULD differentiate between two
             backpressure categories to enable graduated incident response:
             (a) buffer_full — A transient condition specific to Buffered Ok
                 adapters. Indicates the in-memory buffer has reached capacity
                 and cannot accept new entries until the flush cycle completes.
                 Consumer response: retry after a short delay or trigger an
                 emergency flush. This is NOT a data loss event if WAL is active.
             (b) storage_unavailable — A durable storage failure affecting both
                 Buffered Ok (flush target unreachable) and Durable Ok (write
                 target unreachable) adapters. Indicates the backing store is
                 unavailable, full, or has rejected the write. Consumer response:
                 escalate to operations; if failOnAuditError is true, the guard
                 evaluation MUST fail closed (deny the operation).
             Both categories SHOULD be expressed via the AuditTrailWriteError's
             existing category discriminant field. Monitoring systems SHOULD
             alert differently for transient buffer_full (warning) versus
             persistent storage_unavailable (critical).
```

```
RECOMMENDED: Adapter implementers using the "Buffered Ok" durability tier SHOULD
             prominently document the durability semantics in the adapter's JSDoc
             and README. The term "Ok" in "Buffered Ok" may be misinterpreted as
             meaning the entry is safely persisted. Documentation SHOULD clearly
             state that Ok from record() means "accepted into buffer, not yet
             durable" and reference the WAL requirement for crash recovery.

REQUIREMENT: Every AuditTrailPort adapter MUST document its durability tier
             ("Durable Ok" or "Buffered Ok") in the adapter's design specification.
             The durability tier MUST be verified during Operational Qualification (OQ)
             by demonstrating the adapter's behavior after a simulated process crash:
             (a) Durable Ok adapters: entries returned as Ok MUST survive process crash
                 without WAL assistance.
             (b) Buffered Ok adapters: entries accepted into the buffer but not yet
                 flushed MAY be lost on crash; the WAL (when gxp: true) MUST recover
                 these entries on startup.
             The adapter's documented durability tier MUST match its observed behavior
             during OQ testing.
             Reference: 21 CFR 11.10(e), ALCOA+ Original principle, EU GMP Annex 11 §7.

REQUIREMENT: When gxp is true and the adapter's durability tier is "Buffered Ok",
             a WalStore MUST be configured on createGuardGraph(). Failure to provide
             a WalStore with a Buffered Ok adapter in GxP mode MUST produce a
             ConfigurationError at graph construction time.

REQUIREMENT: GxP environments using "Buffered Ok" durability tier adapters
             MUST configure a maximum flush interval not exceeding 5 seconds.
             Implementations MUST monitor actual flush latency and MUST trigger
             operational alerts when the configured threshold is exceeded.
             Flush interval configuration MUST be documented in the validation
             plan (section 67).
             Reference: ALCOA+ Contemporaneous, 21 CFR 11.10(e).
```

#### 3b. Reference Adapter Validation

All three reference adapters (`MemoryAuditTrail`, `BufferedAuditTrailExample`, `DurableAuditTrailExample`) and the production `@hex-di/guard-sqlite` adapter are continuously validated against the behavioral contract.

```
REQUIREMENT: All reference adapters (MemoryAuditTrail, BufferedAuditTrailExample,
             DurableAuditTrailExample) and the production @hex-di/guard-sqlite
             adapter MUST pass the createAuditTrailConformanceSuite() in CI on
             every commit. Conformance suite failures MUST block merge. This
             continuous validation ensures that spec changes do not silently
             break adapter compliance and that the behavioral contract (section 61)
             remains implementable.
             Reference: GAMP 5 Category 5 (continuous validation), 21 CFR 11.10(e).
```

```
RECOMMENDED: Production GxP deployments SHOULD use @hex-di/guard-sqlite or a
             custom AuditTrailPort adapter that has been independently validated
             via the conformance suite and included in Operational Qualification
             (OQ) evidence. The reference adapters (BufferedAuditTrailExample,
             DurableAuditTrailExample) are documentation aids and SHOULD NOT be
             used in production without additional hardening and OQ verification.
```

#### 4. Integrity Verification

For environments requiring tamper detection:

```
REQUIREMENT: The adapter MUST compute and store integrityHash for each entry.
             The hash chain MUST be verifiable from genesis to any point.
```

Hash chain computation:

```typescript
// Field delimiter prevents boundary ambiguity (e.g., subjectId="ab" + policy="cd"
// vs subjectId="abc" + policy="d" would produce the same raw concatenation).
const FIELD_DELIMITER = "|";

// Genesis entry — 14 fields in alphabetical order per REQUIREMENT below.
// Optional fields (traceDigest, policySnapshot) are normalized to empty string for hash stability.
const genesisHash = sha256(
  [
    entry.authenticationMethod,
    entry.decision,
    String(entry.durationMs),
    entry.evaluationId,
    entry.policySnapshot ?? "",
    entry.portName,
    "", // previousHash empty for genesis
    entry.reason,
    String(entry.schemaVersion),
    entry.scopeId,
    String(entry.sequenceNumber ?? 0),
    entry.subjectId,
    entry.timestamp,
    entry.traceDigest ?? "",
  ].join(FIELD_DELIMITER)
);

// Subsequent entries
const entryHash = sha256(
  [
    entry.authenticationMethod,
    entry.decision,
    String(entry.durationMs),
    entry.evaluationId,
    entry.policySnapshot ?? "",
    entry.portName,
    previousHash,
    entry.reason,
    String(entry.schemaVersion),
    entry.scopeId,
    String(entry.sequenceNumber ?? 0),
    entry.subjectId,
    entry.timestamp,
    entry.traceDigest ?? "",
  ].join(FIELD_DELIMITER)
);
```

```
RECOMMENDED: For high-volume GxP environments producing more than 100,000 audit
             entries per scope, organizations SHOULD implement chain partitioning
             to bound verification time and storage overhead:

             1. **Rotation strategy:** Partition chains by calendar day or by entry
                count (recommended threshold: 1,000,000 entries per partition).
                Each partition maintains its own genesis entry and sequential
                numbering.

             2. **Cross-chain linking:** The genesis entry of each new partition
                MUST include a crossChainLink field containing the integrityHash
                of the final entry in the preceding partition. This creates a
                linked list of partitions enabling end-to-end verification across
                partition boundaries.

             3. **Cross-boundary verification:** verifyAuditChain() SHOULD support
                a partitioned mode that verifies each partition independently and
                then validates the crossChainLink references between adjacent
                partitions. This enables parallel verification of large audit
                trails.

             4. **Independence from scope model:** Chain partitioning operates
                independently of the per-scope chain model (section 61.4a).
                Within each scope, entries belong to the active partition at
                their creation time. Partitions may span multiple scopes and
                scopes may span multiple partitions.

             Reference: 21 CFR 11.10(e), ALCOA+ Enduring.
```

#### 4b. PolicyChangeAuditEntry Hash Chain Computation

`PolicyChangeAuditEntry` entries (section 64a-1 in 06-administrative-controls.md) participate in the same per-scope hash chain as regular `AuditEntry` entries. Because `PolicyChangeAuditEntry` has a different field set, the hash computation MUST discriminate on the entry's `_tag` field.

```
REQUIREMENT: The canonical hash input for PolicyChangeAuditEntry MUST use
             alphabetical field ordering with a pipe ("|") delimiter, UTF-8
             encoding, and the following 13-field list (sorted):

             1. actorId
             2. applied               ("true" or "false")
             3. approverId
             4. approvedAt
             5. changeId
             6. changeRequestId
             7. diffReportChecksum     ("" if undefined)
             8. newPolicyHash
             9. portName
             10. previousHash          ("" for genesis entry)
             11. previousPolicyHash
             12. reason
             13. timestamp

             Numeric and boolean fields MUST be converted via String(). Undefined
             optional fields MUST be represented as empty string "". The genesis
             entry (first in a scope) MUST use empty string "" for previousHash.

             Cross-reference: The field list MUST match the PolicyChangeAuditEntry
             and GxPPolicyChangeAuditEntry interfaces defined in §64a-1
             (06-administrative-controls.md), including the diffReportChecksum
             field added in §64a-1.
             Reference: 21 CFR 11.10(c) (accurate records),
             ALCOA+ Accurate principle.
```

Hash computation pseudocode:

```typescript
function computeEntryHash(
  entry: AuditEntry | PolicyChangeAuditEntry,
  previousHash: string
): string {
  const hashFn = getHashFunction(entry.hashAlgorithm ?? "sha256");

  if (entry._tag === "PolicyChangeAuditEntry") {
    return hashFn(
      [
        entry.actorId,
        String(entry.applied),
        entry.approverId,
        entry.approvedAt,
        entry.changeId,
        entry.changeRequestId,
        entry.diffReportChecksum ?? "",
        entry.newPolicyHash,
        entry.portName,
        previousHash,
        entry.previousPolicyHash,
        entry.reason,
        entry.timestamp,
      ].join(FIELD_DELIMITER)
    );
  }

  // Default: AuditEntry — 14-field canonical ordering (section 61.4)
  return hashFn(
    [
      entry.authenticationMethod,
      entry.decision,
      String(entry.durationMs),
      entry.evaluationId,
      entry.policySnapshot ?? "",
      entry.portName,
      previousHash,
      entry.reason,
      String(entry.schemaVersion),
      entry.scopeId,
      String(entry.sequenceNumber ?? 0),
      entry.subjectId,
      entry.timestamp,
      entry.traceDigest ?? "",
    ].join(FIELD_DELIMITER)
  );
}
```

```
REQUIREMENT: verifyAuditChain() MUST handle mixed chains containing both
             AuditEntry and PolicyChangeAuditEntry entries. The verification
             function MUST discriminate on the _tag field to select the
             appropriate field set for hash recomputation. A chain containing
             both entry types is valid provided each entry's integrityHash
             matches the recomputed hash using the entry-type-specific field
             ordering defined in §61.4 (AuditEntry) and §61.4b
             (PolicyChangeAuditEntry).
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, Accurate.
```

#### HMAC-SHA256 Option

For environments requiring authentication of the hash chain (not just integrity detection), HMAC-SHA256 may be used instead of plain SHA-256. HMAC binds the hash to a secret key, so an attacker who modifies entries cannot recompute valid hashes without the key.

```
REQUIREMENT: When HMAC-SHA256 is used for hash chain computation, the HMAC key
             MUST be stored in a Hardware Security Module (HSM) or platform
             keystore (e.g., AWS KMS, Azure Key Vault). The key MUST NOT be
             stored in source code, environment variables, or application
             configuration files.

RECOMMENDED: Key rotation for HMAC keys follows the same rules as signature
             key rotation (section 65c): old keys transition to verify-only
             state, new entries use the new key, and the key ID is recorded
             alongside the hash for verification routing.
```

```
REQUIREMENT: Each audit entry's integrityHash MUST be accompanied by a hash algorithm
             identifier (e.g., "sha256", "hmac-sha256", "sha3-256") via the
             hashAlgorithm field on AuditEntry. In GxP environments, GxPAuditEntry
             makes hashAlgorithm a required field, ensuring every entry is
             self-contained for algorithm-agnostic verification throughout the
             retention period. Reference: 21 CFR 11.10(c).
```

```
RECOMMENDED: Organizations SHOULD maintain a documented list of approved hash algorithms
             aligned with the site's security policy and NIST SP 800-131A (Transitioning
             the Use of Cryptographic Algorithms and Key Lengths). Algorithm deprecation
             (e.g., SHA-1 phase-out) SHOULD be tracked as part of the periodic review
             cycle (section 64) and planned migrations SHOULD follow the Hash Algorithm
             Migration procedure below.
```

##### Hash Algorithm Migration

```
REQUIREMENT: When migrating from one hash algorithm to another (e.g., SHA-256 to
             SHA-3-256, or plain SHA-256 to HMAC-SHA256), the following procedure
             MUST be followed:
             1. Start a new chain epoch with the new algorithm. The last hash of
                the old-algorithm chain becomes the genesis previousHash for the
                new epoch.
             2. Before switching production traffic to the new algorithm, run a
                parallel verification phase: compute hashes using both algorithms
                for a sample of entries and confirm the new-algorithm chain
                validates. Document this parallel phase as part of the change
                control OQ evidence.
             3. Retain the old chain for historical verification. Do not re-hash
                existing entries with the new algorithm.
             4. Record the algorithm identifier alongside each hash via the
                hashAlgorithm field on AuditEntry/GxPAuditEntry. This allows
                the verifier to select the correct algorithm for each entry.
             5. Document the epoch boundary in the change control log (section 64a)
                with: (a) the old algorithm, (b) the new algorithm, (c) the
                sequence number of the last old-algorithm entry, (d) the sequence
                number of the first new-algorithm entry, and (e) the operator
                identity and approval reference.
             Reference: 21 CFR 11.10(c), NIST SP 800-131A.
```

Verification:

```typescript
const FIELD_DELIMITER = "|";

function getHashFunction(algorithm: string): (input: string) => string {
  switch (algorithm) {
    case "sha256":
      return sha256;
    case "hmac-sha256":
      return hmacSha256; // key pre-bound via closure; see HMAC-SHA256 Option above
    case "sha3-256":
      return sha3_256;
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
}

function verifyAuditChain(entries: ReadonlyArray<AuditEntry>): boolean {
  let previousHash = "";
  for (const entry of entries) {
    const hashFn = getHashFunction(entry.hashAlgorithm ?? "sha256");
    const expected = hashFn(
      [
        entry.authenticationMethod,
        entry.decision,
        String(entry.durationMs),
        entry.evaluationId,
        entry.policySnapshot ?? "",
        entry.portName,
        previousHash,
        entry.reason,
        String(entry.schemaVersion),
        entry.scopeId,
        String(entry.sequenceNumber ?? 0),
        entry.subjectId,
        entry.timestamp,
        entry.traceDigest ?? "",
      ].join(FIELD_DELIMITER)
    );
    if (entry.integrityHash !== expected) return false;
    previousHash = entry.integrityHash;
  }
  return true;
}
```

```
REQUIREMENT: The canonical hash input for integrityHash computation MUST use
             alphabetical field ordering with a pipe ("|") delimiter, UTF-8
             encoding, and the following field list (14 fields, sorted):

             1. authenticationMethod
             2. decision
             3. durationMs          (String(value))
             4. evaluationId
             5. policySnapshot      ("" if undefined)
             6. portName
             7. previousHash        ("" for genesis entry)
             8. reason
             9. schemaVersion       (String(value))
             10. scopeId
             11. sequenceNumber     (String(value))
             12. subjectId
             13. timestamp
             14. traceDigest        ("" if undefined)

             Numeric fields MUST be converted via String(). Undefined optional
             fields MUST be represented as empty string "". The genesis entry
             (first in a scope) MUST use empty string "" for previousHash.

             Cross-reference: serializeAuditEntry() in 14-api-reference.md MUST
             implement this canonical ordering.
             Reference: 21 CFR 11.10(c) (accurate records),
             ALCOA+ Accurate principle.
```

> **Implementation note:** The field order in the `verifyAuditChain()` pseudocode above uses the canonical alphabetical ordering defined in the REQUIREMENT below. Implementations MUST follow this exact ordering.

```
RECOMMENDED: When verifying entries that have integrityHash present but hashAlgorithm
             undefined (non-GxP entries), verifyAuditChain() falls back to SHA-256.
             GxP adapters using GxPAuditEntry are not affected because hashAlgorithm
             is required. For mixed-mode chains (GxP and non-GxP entries coexisting),
             implementations SHOULD log a warning when the hashAlgorithm fallback is
             triggered on entries that have integrityHash set, as this may indicate a
             missing field rather than an intentional omission.
```

#### Chain Break Response

When `verifyAuditChain()` detects a hash mismatch (returns `false`), the following response actions are REQUIRED:

```
REQUIREMENT: A chain integrity failure MUST trigger an immediate alert to the
             site's compliance and IT security teams. The alert MUST include
             the index of the first invalid entry, the expected hash, the
             actual hash, and the scope ID of the affected chain.

REQUIREMENT: Upon detection of a chain break, the affected scope's audit
             entries from the first invalid entry onward MUST be quarantined
             for forensic investigation. No entries in the quarantined range
             may be used as compliance evidence until the investigation
             concludes.

REQUIREMENT: A chain integrity failure MUST be documented as a compliance
             incident per the site's deviation/CAPA process. The incident
             report MUST include: (1) timestamp of detection, (2) scope ID,
             (3) index range of affected entries, (4) root cause analysis,
             and (5) corrective actions taken.

REQUIREMENT: Chain break response MUST adhere to the following timing SLAs:
             1. Alert: Within 1 hour of detection, the compliance and IT security
                teams MUST be notified.
             2. Quarantine: Within 4 hours of detection, affected entries MUST be
                quarantined and excluded from compliance evidence.
             3. Incident report: Within 24 hours of detection, an initial incident
                report MUST be filed per the site's deviation/CAPA process.
             These timelines are minimums; sites MAY impose stricter SLAs based on
             their risk assessment. Reference: EU GMP Annex 11 §13, ICH Q9.

REQUIREMENT: The @hex-di/guard library MUST provide a programmatic chain break
             notification hook via the GuardGraphOptions.onChainBreak callback. When
             verifyAuditChain() detects a hash mismatch, it MUST invoke this callback
             synchronously with a ChainBreakEvent containing: (1) scopeId, (2) index of
             the first invalid entry, (3) expected hash, (4) actual hash, (5) detection
             timestamp. Consumers are responsible for routing ChainBreakEvent to their
             alerting infrastructure (email, PagerDuty, SIEM, etc.) to meet the timing
             SLAs above. If onChainBreak is not configured and gxp is true,
             checkGxPReadiness() MUST report a FAIL result with diagnostic code
             "guard.chain-break-hook-missing". This ensures that chain break detection
             is not silently ignored in GxP environments.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §13.
```

```
RECOMMENDED: For highest assurance, organizations SHOULD use HMAC-SHA256 (not plain
             SHA-256) for the hash chain to add key-based authentication. The HMAC
             key SHOULD be stored in an HSM accessible only to the audit trail adapter
             service account. This limits the population of insiders who could
             recompute the chain after modification. For environments requiring full
             non-repudiation on every audit entry (not just signed entries), consider
             applying digital signatures to hash chain checkpoints at configurable
             intervals (e.g., every 1000 entries).
```

#### 4a. Concurrent Write Ordering

```
REQUIREMENT: Adapters MUST assign a monotonically increasing sequenceNumber per scope
             before computing integrityHash. Concurrent writes within a scope MUST be
             serialized so that no two entries share the same sequenceNumber within a scope.
             The sequenceNumber MUST be strictly sequential with no gaps: if the last
             assigned number is N, the next MUST be N+1. A gap in the sequence
             (e.g., 1, 2, 4) indicates a missing audit entry and MUST be treated as
             a completeness violation during chain verification.
             Reference: ALCOA+ Complete, Consistent.

RECOMMENDED: Per-scope chains SHOULD be used. Each scope maintains an independent chain
             with its own genesis entry and sequence counter. The scopeId field identifies
             the chain. This confines ordering guarantees to the scope boundary and avoids
             a global bottleneck.

RECOMMENDED: Single-process deployments SHOULD use a mutex or async queue to serialize
             writes within a scope. Multi-process deployments SHOULD use database-level
             sequences (e.g., PostgreSQL SEQUENCE, auto-increment columns) or optimistic
             locking with retry.
```

##### Deployment Model Table

| Deployment            | Serialization Strategy                             | Sequence Source              | Notes                                                                  |
| --------------------- | -------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| **Single-process**    | In-memory mutex or async queue per scope           | In-memory counter            | Simplest; no external dependencies                                     |
| **Concurrent scopes** | Independent chain per `scopeId`                    | Per-scope counter            | Scopes are isolated; no cross-scope ordering needed                    |
| **Multi-process**     | Database-level sequence or advisory lock           | DB sequence / auto-increment | Guarantees monotonicity across processes                               |
| **Distributed**       | Centralized sequence service or Lamport timestamps | External service             | Highest complexity; consider whether global ordering is truly required |

##### Per-Scope Chain Architecture

Each scope maintains its own hash chain independently:

```
Scope A:  genesis(A) -> entry(A,1) -> entry(A,2) -> entry(A,3)
Scope B:  genesis(B) -> entry(B,1) -> entry(B,2)
Scope C:  genesis(C) -> entry(C,1) -> entry(C,2) -> entry(C,3) -> entry(C,4)
```

Verification is per-scope: `verifyAuditChain(entries.filter(e => e.scopeId === targetScope))`.

> **See also:** ADR #30 (15-appendices.md) for the rationale behind per-scope chains with monotonic sequence numbers.

#### Cross-Scope Timeline Reconstruction

Per-scope chains provide strong ordering guarantees within each scope but do not define a global ordering across scopes. For regulatory review scenarios that require a unified timeline (e.g., "show all guard evaluations across all scopes between 09:00 and 10:00 UTC"), a reconstruction utility merges per-scope chains into a global timeline:

```typescript
/**
 * Merges per-scope audit chains into a single chronologically ordered
 * timeline using timestamp-based interleaving.
 *
 * Entries with identical timestamps are ordered by scopeId (lexicographic)
 * then sequenceNumber to ensure deterministic output.
 *
 * This utility does NOT create a new hash chain — the global timeline is
 * a read-only view for review purposes. Per-scope chain integrity is
 * verified independently via verifyAuditChain().
 */
function reconstructGlobalTimeline(entries: ReadonlyArray<AuditEntry>): ReadonlyArray<AuditEntry>;
```

```
RECOMMENDED: Organizations SHOULD use reconstructGlobalTimeline() when
             producing audit trail exports for regulatory review that span
             multiple scopes. The export manifest (§64e) SHOULD indicate
             that the timeline is a reconstructed cross-scope view, not a
             single hash chain. Per-scope chain integrity SHOULD be verified
             before reconstruction to ensure only verified entries appear in
             the global timeline.
```

#### 5. No Silent Defaults

```
REQUIREMENT: createGuardGraph() requires an explicit auditTrailAdapter argument.
             There is no default audit trail adapter.
             createNoopAuditTrailAdapter() exists for non-regulated environments
             as an explicit opt-in to discarding records.
```

The `NoopAuditTrail` adapter carries JSDoc warnings:

```typescript
/**
 * @warning **GxP Warning:** This adapter discards ALL audit records silently.
 * Do NOT use in GxP-regulated environments where 21 CFR Part 11 or
 * EU GMP Annex 11 audit trail requirements apply.
 */
```

#### 6. Non-Obscurement

```
REQUIREMENT: Record changes SHALL NOT obscure previously recorded information.
             This invariant is satisfied by the combination of the append-only
             invariant (#1) and hash chain integrity (#4) working together:
             - Append-only storage (section 61.1) prevents in-place modification
               or deletion of existing entries.
             - Hash chain integrity (section 61.4) makes any modification to any
               entry detectable — altering a single field in any entry breaks the
               chain from that point forward.
             Together, these controls ensure that the original data in every audit
             entry is preserved and that any attempt to modify recorded information
             is immediately detectable during chain verification.
             This invariant is named explicitly to provide a direct audit reference
             to 21 CFR 11.10(e) ("record changes shall not obscure previously
             recorded information") and EU GMP Annex 11 Section 9 (audit trail
             data integrity).
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, ALCOA+ Original.
```

### Reference Implementation: MemoryAuditTrail

The `@hex-di/guard-testing` package provides a `MemoryAuditTrail` adapter for testing. It satisfies the append-only contract in memory:

```typescript
interface MemoryAuditTrail extends AuditTrail {
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
  getEntries(): ReadonlyArray<AuditEntry>;
  getEntriesBySubject(subjectId: string): ReadonlyArray<AuditEntry>;
  getEntriesByKind(kind: "allow" | "deny"): ReadonlyArray<AuditEntry>;
  getEntriesByPort(portName: string): ReadonlyArray<AuditEntry>;
  findEntry(predicate: (e: AuditEntry) => boolean): AuditEntry | undefined;
  clear(): void;
  /** Validates that every entry has all required fields populated (non-empty strings, valid timestamps). */
  validateAuditEntry(entry: AuditEntry): ReadonlyArray<string>;
  /** Validates a single entry's integrity hash against its predecessor. */
  validateEntry(index: number): boolean;
  /** Validates the entire hash chain from genesis. */
  validateChain(): boolean;
  /** Asserts all entries are valid (throws on first invalid). */
  assertAllEntriesValid(): void;
  /** Returns entries filtered by predicate. */
  query(predicate: (entry: AuditEntry) => boolean): ReadonlyArray<AuditEntry>;
}
```

### Crash Recovery: Write-Ahead Log

A process crash between `evaluate()` (step 4) and a successful `record()` (step 5) creates a window where a decision was made but no audit record exists. The guard library's `failOnAuditError: true` default mitigates the inverse (audit write fails → resolution fails), but cannot prevent a hard process crash mid-execution.

When `gxp: true` is set on `createGuardGraph()`, the following are **REQUIREMENTS** enforced by the library via `createWalAuditTrail()`. For non-GxP usage, they remain RECOMMENDED patterns that consumers may implement at the application level.

```
REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
  Before calling evaluate(), log an intent record to the WAL with:
             (1) evaluationId (pre-generated UUID v4),
             (2) portName,
             (3) subjectId,
             (4) timestamp,
             (5) status: "pending".

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
  After successful evaluate() + record(), update the WAL entry status
             to "completed".

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
  On application startup, scan the WAL for entries with status "pending".
             For each pending entry:
             (1) Check the AuditTrail for an entry with the same evaluationId.
             (2) If found: mark WAL entry as "completed" (the record was persisted
                 before the crash).
             (3) If not found: flag the entry for remediation (the decision may have
                 been enforced without an audit record).

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
  Remediation for orphaned pending entries SHOULD include:
             (1) Logging a compliance incident for the missing audit record,
             (2) Re-evaluating the policy (if the decision was "allow" and the
                 resource was accessed, the access may need retroactive audit),
             (3) Recording a compensating audit entry with a note indicating
                 it was recovered from the WAL.

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
  Use evaluationId as the idempotency/deduplication key for replay.
             If a recovered WAL entry triggers a new record() call, the adapter
             SHOULD detect the duplicate evaluationId and skip the write (or
             treat it as a no-op) rather than creating a duplicate audit entry.

REQUIREMENT (when gxp: true):
  When WAL recovery detects orphaned pending entries, the event MUST be reported
             to the site QA/compliance team as a potential data integrity incident within
             the critical incident timeline defined in the incident classification matrix
             (section 68). Each recovered entry MUST be documented with: evaluationId,
             recovery timestamp, compensating audit entry reference, and root cause
             assessment. Reference: 21 CFR 11.10(e), EU GMP Annex 11 §13.
```

### WAL Behavioral Contract

When `gxp: true` is set on `createGuardGraph()`, the library ships `createWalAuditTrail()` (see 07-guard-adapter.md) which wraps the user's `AuditTrail` adapter with WAL crash recovery:

```
REQUIREMENT: WalStore.writeIntent() MUST be called before evaluate() begins.
             The intent record serves as the pre-evaluation checkpoint.

REQUIREMENT: WalStore.markCompleted() MUST be called after a successful
             AuditTrail.record(). This confirms the audit record is persisted.

REQUIREMENT: The WalStore MUST be backed by durable storage (file system with
             fsync, database with transactional guarantees). An in-memory WAL
             cannot survive the process crash it is designed to mitigate.

REQUIREMENT: On application startup, getPendingIntents() MUST be scanned for
             orphaned entries. Each orphaned entry indicates a possible gap in
             the audit trail and MUST be flagged for remediation or reconciled
             with the AuditTrail.
```

```
REQUIREMENT: In addition to startup scans, the WAL MUST be scanned periodically
             for orphaned pending intents during normal operation. The default
             scan interval MUST be 15 minutes. The interval MUST be configurable
             via WalStore options and MUST be documented in the validation plan
             (section 67). When gxp is true, the scan interval MUST NOT exceed
             5 minutes. This ceiling ensures that orphaned pending intents
             (FM-15) are detected promptly in GxP environments where audit
             completeness is compliance-critical. The 5-minute maximum aligns
             with the ReauthenticationToken ceiling (section 65b) to provide
             a consistent GxP timing guarantee. Non-GxP environments MAY use
             longer scan intervals per the configurable default. Periodic scans
             detect intents orphaned by partial failures that do not result in
             a full process restart.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete principle.
```

```
REQUIREMENT: An operational alert MUST be triggered for orphaned WAL intents
             that remain in "pending" status longer than a configurable threshold
             (default: 1 hour). The alert MUST include the evaluationId, the
             intent creation timestamp, and the elapsed time since creation. This
             is distinct from the 24-hour compliance alert defined below — the
             1-hour operational alert provides early warning to operations teams
             before the compliance threshold is reached.
             Reference: GAMP 5 Appendix M3 (incident management).
```

```
REQUIREMENT: When gxp is true, WalStore implementations MUST enforce a maximum size
             limit on pending intents of 10,000 entries. When the pending intent count
             reaches this limit, WalStore.writeIntent() MUST return Err with a
             "wal_capacity_exceeded" category, which causes the guard evaluation to
             fail-closed (deny the operation). This limit prevents unbounded WAL growth
             from consuming all available storage during sustained flush failures. The
             configured limit MUST be documented in the validation plan (section 67)
             with justification based on the deployment's operational profile and
             expected peak evaluation throughput.
             Reference: 21 CFR 11.10(a) (system validation), EU GMP Annex 11 §7,
             capacity planning guidance in section 63a.

RECOMMENDED: In non-GxP environments, WalStore implementations SHOULD enforce a
             maximum size limit on pending intents (RECOMMENDED: 10,000 pending
             entries). Completed intents SHOULD be purged within 24 hours. WAL growth
             monitoring SHOULD be included in operational monitoring dashboards.
             Reference: capacity planning guidance in section 63a.
```

```
REQUIREMENT: When gxp is true, orphaned pending WAL intents (status: "pending")
             that are older than 24 hours MUST trigger a compliance alert. WAL
             recovery procedures (section 61) MUST be initiated within 48 hours
             of the original intent timestamp. Pending intents older than 7 days
             without resolution MUST be escalated to QA per the incident
             classification matrix (section 68).
```

```
REQUIREMENT: When gxp is true, WAL entries MUST include a CRC-32 or SHA-256
             checksum to detect partial writes caused by process interruption
             during WAL entry persistence. The recovery scan MUST verify entry
             integrity before processing. Corrupted WAL entries MUST be logged
             as data integrity incidents and reported to QA/compliance per the
             incident classification matrix (section 68). A corrupted WAL entry
             that fails integrity verification MUST NOT be used to reconcile
             audit trail gaps — it MUST be flagged for manual investigation.
             Reference: ALCOA+ Accurate principle, EU GMP Annex 11 §7,
             21 CFR 11.10(c).

RECOMMENDED: In non-GxP environments, WAL entries SHOULD include a CRC-32 or
             SHA-256 checksum to detect partial writes caused by process
             interruption during WAL entry persistence. The recovery scan SHOULD
             verify entry integrity before processing. Corrupted WAL entries
             SHOULD be logged as data integrity incidents.
             Reference: ALCOA+ Accurate principle, EU GMP Annex 11 §7.
```

> **Scope clarification:** When `gxp: true`, the guard library ships the WAL via `createWalAuditTrail()`. Consumers provide the `WalStore` adapter (durable storage implementation). When `gxp` is false or omitted, WAL remains a RECOMMENDED consumer-level pattern. The `evaluationId` (UUID v4) serves as the correlation and deduplication key in both modes.

### Business Continuity Planning

Since `failOnAuditError: true` blocks all guarded resolutions when the `AuditTrail` adapter is unavailable, organizations must plan for adapter unavailability scenarios:

```
REQUIREMENT: Organizations MUST develop a business continuity plan for AuditTrail
             adapter unavailability. The plan MUST address:
             (a) Whether a temporary fallback to a secondary AuditTrail adapter is
                 acceptable under the site's quality management system, and under what
                 conditions (e.g., only for non-GxP-critical ports).
             (b) The maximum tolerable downtime for guarded operations before
                 business-critical processes are impacted.
             (c) Procedures for resuming normal operations after adapter recovery,
                 including reconciliation of any audit data written to secondary
                 adapters or buffered during the outage.
             (d) Communication and escalation procedures for notifying QA, compliance,
                 and operations teams of adapter unavailability.
             (e) Periodic testing of the business continuity plan (recommended:
                 annually) with documented results.
             Reference: EU GMP Annex 11 Section 16 (business continuity).
```

```
REQUIREMENT: When gxp is true, organizations MUST define Recovery Time Objective (RTO)
             and Recovery Point Objective (RPO) for the guard system as part of their
             business continuity plan.
             (a) RPO MUST be zero for audit trail data. Zero RPO is achievable via
                 synchronous replication of the backing store or via WAL
                 (`createWalAuditTrail()`) which records intents before evaluation.
             (b) RTO MUST align with operational process requirements — e.g., if
                 batch manufacturing cannot proceed without guard authorization, the
                 guard RTO MUST be less than or equal to the batch process RTO.
             (c) Both RTO and RPO values MUST be documented in the validation plan
                 (section 67) with justification based on the deployment's operational
                 profile and risk assessment.
             (d) RTO/RPO targets MUST be tested during PQ (section 67c) by
                 simulating adapter failure and measuring recovery time and data loss.
             Reference: EU GMP Annex 11 §16 (business continuity).

RECOMMENDED: When gxp is false, organizations SHOULD still define RTO and RPO for
             the guard system following the same guidelines above. This is best
             practice even for non-regulated deployments.
```

### Workflow Sequencing Guidance (21 CFR 11.10(f))

21 CFR 11.10(f) requires "use of operational system checks to enforce permitted sequencing of steps and events, as appropriate." While guard enforces evaluation sequencing within a single authorization decision (evaluate → audit → resolve), multi-step regulated workflows may require sequencing across multiple guard evaluations.

```
RECOMMENDED: For multi-step regulated workflows (e.g., create → review → approve → release),
             organizations SHOULD implement workflow sequencing by composing guard evaluations
             with application-level state checks. The RECOMMENDED pattern is:

             1. Define each workflow step as a guarded port with a step-specific policy.
             2. Include a `hasAttribute` condition on the resource that checks the current
                workflow state (e.g., `hasAttribute("status", eq("reviewed"))` for the
                approval step).
             3. Use the audit trail to verify that prerequisite steps have completed:
                query for prior audit entries with the expected evaluationId, decision,
                and signature meaning before permitting the next step.
             4. Document the expected workflow sequence in the validation plan (section 67),
                including the policies for each step and the state transitions between steps.

             This approach leverages guard's existing policy composition and audit trail
             capabilities without requiring a separate workflow engine. For complex workflows
             with branching, parallel paths, or timeout constraints, a dedicated workflow
             orchestrator is RECOMMENDED with guard providing the authorization gate at each
             step. Reference: 21 CFR 11.10(f).
```

```
REQUIREMENT: When gxp is true and the application implements multi-step regulated
             workflows (e.g., create → review → approve → release), organizations
             MUST enforce workflow step sequencing using one of the following:
             (a) Compose guard policies with hasAttribute conditions that check
                 workflow state, as described in the RECOMMENDED pattern above, OR
             (b) Integrate a dedicated workflow orchestrator with guard providing
                 the authorization gate at each step.
             The chosen approach MUST be documented in the validation plan
             (section 67) with: (1) the complete workflow step sequence,
             (2) the guard policy for each step, (3) the state transitions
             between steps, and (4) OQ test cases demonstrating that out-of-order
             step execution is rejected.
             Reference: 21 CFR 11.10(f), EU GMP Annex 11 §4.7.
```

```
RECOMMENDED: AuditTrail.record() SHOULD enforce a 30-second timeout for durable
             writes. If the backing store does not acknowledge the write within
             30 seconds, record() SHOULD return Err(AuditTrailWriteError) with a
             timeout indicator. This prevents indefinite blocking of the guard
             evaluation path when the audit backend is degraded but not fully
             unavailable. The timeout value SHOULD be configurable per deployment.
             Reference: EU GMP Annex 11 §16 (business continuity).
```

### Multi-Region Deployment Guidance

```
REQUIREMENT: When gxp is true AND the deployment spans multiple geographic regions
             subject to different regulatory jurisdictions (e.g., FDA + EU GMP,
             FDA + PMDA, or any combination of two or more jurisdictions), the
             deployment MUST maintain independent per-region hash chains. Each region
             MUST maintain its own scope hierarchy and sequenceNumber counter.
             Cross-region audit trail consolidation (for global reporting) MUST use
             evaluationId as the deduplication key — if the same evaluationId appears
             in multiple regions (e.g., due to replication), the consolidation layer
             MUST retain only the first occurrence. Global ordering across regions
             MUST use timestamps as the secondary sort key (after per-region
             sequenceNumber), accepting that cross-region ordering is approximate
             (bounded by NTP drift).
             For single-jurisdiction deployments, independent per-region chains
             remain RECOMMENDED but not REQUIRED.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §4.8, ALCOA+ Consistent.
```

```
REQUIREMENT: When gxp is true AND the deployment spans multiple geographic regions
             subject to different regulatory jurisdictions, organizations MUST
             implement the following clock synchronization controls:
             (a) Use the same NTP source hierarchy across all regions (e.g., the same
                 stratum-1 pool or organizational NTP infrastructure) to minimize
                 inter-region drift.
             (b) Include a region identifier in audit entry metadata (e.g., as a field
                 in the `context` object) to enable post-hoc analysis of cross-region
                 timestamp variance during regulatory review.
             (c) Verify cross-region clock agreement during PQ (section 67c) by
                 comparing `ClockSource.now()` across all deployment regions
                 simultaneously and documenting the observed variance. The acceptable
                 cross-region variance MUST be defined and justified in the
                 validation plan.
             For single-jurisdiction deployments, these controls remain RECOMMENDED
             but not REQUIRED.
             Reference: ALCOA+ Contemporaneous, ALCOA+ Consistent, 21 CFR 11.10(e).
```

```
REQUIREMENT: When gxp is true AND the deployment spans multiple regions, the
             organization MUST document their cross-region ordering strategy in the
             validation plan (section 67). The documented strategy MUST include:
             (a) Region identifiers used in audit entry metadata.
             (b) NTP source hierarchy and inter-region synchronization approach.
             (c) Accepted cross-region timestamp variance (with justification).
             (d) Consolidation deduplication strategy (e.g., evaluationId-based
                 deduplication as described in the RECOMMENDED block above).
             (e) Ordering guarantees provided for regulatory review (e.g.,
                 per-region strict ordering, cross-region approximate ordering
                 bounded by NTP drift).
             This documentation MUST be reviewed during IQ and referenced in the
             Validation Report (section 67d).
             Reference: 21 CFR 11.10(e), ALCOA+ Contemporaneous, ALCOA+ Consistent.
```

### evaluation_failed WAL State

When the guard evaluation itself throws an error (as opposed to producing a clean Deny decision), the WAL intent transitions to `"evaluation_failed"` rather than remaining perpetually `"pending"`. This state indicates that:

1. The evaluation was attempted but did not produce a Decision
2. No AuditEntry was written (because the evaluation did not complete)
3. The WAL intent serves as the sole record of the attempted evaluation
4. Investigation is required to determine whether the subject gained access despite the evaluation failure

WAL recovery (section 61.5 / 07-guard-adapter.md) MUST handle `evaluation_failed` intents by logging them at WARNING level and including them in the health check report.

```
REQUIREMENT: When the guard evaluation throws an error (rather than producing a
             Decision), the WAL intent MUST transition from "pending" to
             "evaluation_failed" BEFORE the guard wrapper re-throws the error.
             This ensures that the WAL retains a record of the attempted evaluation
             even when no AuditEntry is produced. WAL recovery (section 61.5)
             MUST handle "evaluation_failed" intents by logging them at WARNING
             level and including them in the health check report. The WalIntent
             status type is: "pending" | "completed" | "evaluation_failed".
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

### 61.7. Audit Trail Backing Store Availability

When `failOnAuditError: true` (the GxP default), audit trail backing store unavailability directly blocks all guarded operations. The availability of the backing store is therefore a critical operational dependency that must be formally documented and monitored.

```
REQUIREMENT: When gxp is true, the audit trail backing store MUST meet a documented
             minimum availability target commensurate with the criticality of the
             guarded operations. The availability target MUST be:
             (a) Defined in the validation plan (section 67) with justification based
                 on the deployment's operational profile and risk assessment.
             (b) Expressed as a percentage uptime over a rolling 30-day period (e.g.,
                 99.9% = maximum 43.8 minutes downtime per 30 days).
             (c) Monitored via automated health checks. The health check interval
                 MUST NOT exceed 5 minutes when gxp is true.
             (d) Integrated with createGuardHealthCheck() (section 25) so that
                 backing store unavailability is surfaced in the health check result.
             When the backing store becomes unavailable and failOnAuditError is true,
             all guarded resolutions are blocked. The availability target MUST
             account for this dependency — the backing store availability target
             MUST be at least as high as the operational availability target for
             the guarded ports.
             Reference: ALCOA+ Available, EU GMP Annex 11 §7.1,
             21 CFR 11.10(c).

REQUIREMENT: When gxp is true, organizations MUST define escalation thresholds for
             backing store unavailability:
             (a) WARNING: After 1 minute of continuous unavailability, an automated
                 alert MUST be sent to the operations team.
             (b) CRITICAL: After 5 minutes of continuous unavailability, the incident
                 MUST be escalated to the compliance team and classified per the
                 incident classification matrix (section 68).
             (c) EMERGENCY: After 15 minutes of continuous unavailability (or when
                 cumulative monthly downtime exceeds 50% of the availability budget),
                 the incident MUST be classified as Critical severity per the
                 incident classification matrix, triggering immediate response and
                 24-hour initial report.
             These thresholds are defaults; organizations MAY configure stricter
             values based on their risk assessment, but the WARNING threshold MUST
             NOT exceed 5 minutes, the CRITICAL threshold MUST NOT exceed 15 minutes,
             and the EMERGENCY threshold MUST NOT exceed 30 minutes.
             Reference: ALCOA+ Available, EU GMP Annex 11 §7.1, §16.

RECOMMENDED: In non-GxP environments, organizations SHOULD define and monitor an
             availability target for the audit trail backing store. While the formal
             escalation thresholds above are not required, monitoring backing store
             health and alerting on unavailability is best practice for any deployment
             where audit trail completeness is valued.
```

```
REQUIREMENT: The audit trail backing store availability monitoring MUST produce
             structured health events containing: (1) timestamp (ISO 8601 UTC),
             (2) availabilityStatus ("available" | "degraded" | "unavailable"),
             (3) responseTimeMs (last observed response time), (4) consecutiveFailures
             (count of consecutive health check failures), and (5) uptimePct (rolling
             30-day uptime percentage). These events MUST be surfaced through
             createGuardHealthCheck() and MUST be queryable for periodic review
             reporting (section 64).
             Reference: ALCOA+ Available, EU GMP Annex 11 §7.1.
```

---

### 61.8. Adapter Implementation Security

Consumer-provided adapters (AuditTrailPort, SignatureServicePort, SubjectProviderPort) interact with external systems such as databases, message queues, and identity providers. These adapters are part of the GxP-validated system boundary and MUST be implemented with appropriate security controls to prevent injection attacks that could compromise audit trail integrity.

```
REQUIREMENT: AuditTrailPort adapters backed by SQL databases MUST use parameterized
             queries or prepared statements for all database operations (insert, select,
             update). String concatenation or template literals MUST NOT be used to
             construct SQL statements from AuditEntry field values. This applies to all
             fields including reason (free-text user input), subjectId (from external
             IdP), portName, and traceDigest.
             Reference: OWASP Top 10 A03:2021 (Injection), 21 CFR 11.10(a).

REQUIREMENT: AuditTrailPort adapters backed by NoSQL databases (MongoDB, DynamoDB,
             Cosmos DB, etc.) MUST use the driver's built-in query builder or document
             construction APIs. String interpolation MUST NOT be used to construct query
             filters, update expressions, or document keys from AuditEntry field values.
             Reference: OWASP Top 10 A03:2021 (Injection), 21 CFR 11.10(a).

REQUIREMENT: Audit entry field values MUST NOT be used in dynamic query construction,
             log format strings, or shell command arguments without proper
             parameterization or escaping. Adapters that pass audit data to downstream
             systems (e.g., SIEM, log aggregators) MUST use structured data formats
             (JSON, protobuf) rather than string interpolation.
             Reference: OWASP Top 10 A03:2021 (Injection), 21 CFR 11.10(a).
```

### 61.9. Consolidated Error Propagation Model

This section defines the unified error classification and propagation behavior for all guard subsystem errors. It consolidates error handling requirements that are referenced across sections 07, 61, and 65 into a single authoritative hierarchy.

#### Error Classification

All guard subsystem errors are classified along two axes:

| Axis           | Values                           | Definition                             |
| -------------- | -------------------------------- | -------------------------------------- |
| Recoverability | Transient / Permanent            | Whether the error may resolve on retry |
| Severity       | Fatal / Degraded / Informational | Impact on the authorization decision   |

#### Error Hierarchy

| Error Type                   | Code   | Recoverability | Severity | GxP Behavior                          | Non-GxP Behavior                         |
| ---------------------------- | ------ | -------------- | -------- | ------------------------------------- | ---------------------------------------- |
| Policy evaluation error      | ACL005 | Permanent      | Fatal    | Fail-closed (deny + audit)            | Fail-closed (deny + audit)               |
| Audit trail write error      | ACL008 | Transient      | Fatal    | Fail-closed (deny, block resolution)  | Log warning, allow resolution            |
| Hash chain computation error | ACL015 | Permanent      | Fatal    | Fail-closed (deny + alert)            | Fail-closed (deny + alert)               |
| Electronic signature error   | ACL009 | Varies         | Fatal    | Fail-closed (deny + audit)            | Fail-closed (deny + audit)               |
| WAL write error              | ACL016 | Transient      | Fatal    | Fail-closed (deny, block resolution)  | Log warning, proceed with buffered write |
| Clock synchronization error  | ACL019 | Transient      | Degraded | Audit with degraded timestamp + alert | Audit with best-effort timestamp         |
| Chain break detection        | ACL018 | Permanent      | Fatal    | Quarantine scope + alert per 61.4 SLA | Log error, continue with broken chain    |

```
REQUIREMENT: When multiple errors occur simultaneously during a single guard
             evaluation, the error with the highest severity MUST take
             precedence. Fatal errors always override Degraded errors, which
             always override Informational errors. Within the same severity
             level, the first error encountered in the evaluation pipeline
             (policy -> audit -> hash -> signature) MUST be the primary error
             reported to the caller. All concurrent errors MUST be captured
             in the AuditEntry's metadata under a "concurrent_errors" key.
             Reference: 21 CFR 11.10(a), EU GMP Annex 11 §14.
```

```
REQUIREMENT: In GxP mode (gxp: true), ALL Fatal-severity errors MUST trigger
             fail-closed behavior regardless of the failOnAuditError setting.
             The failOnAuditError option only governs audit trail write errors
             (ACL008) in non-GxP mode. This means that even if an organization
             has not set gxp: true, hash chain computation errors (ACL015) and
             policy evaluation errors (ACL005) still trigger fail-closed
             behavior. GxP mode elevates audit trail write errors and WAL
             write errors to unconditional fail-closed.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

#### Error Correlation with Incident Classification

```
REQUIREMENT: Each error code in the hierarchy above MUST map to an incident
             classification level in the risk assessment (section 68). The
             mapping is:
             - Fatal + Permanent errors → Severity 5 incidents (immediate
               response required per section 68 SLA)
             - Fatal + Transient errors → Severity 4 incidents (response
               within 1 hour)
             - Degraded errors → Severity 3 incidents (response within 4 hours)
             - Informational errors → Severity 1-2 (logged, reviewed in
               periodic audit trail review per section 64)
             Reference: ICH Q9, EU GMP Annex 11 §14.
```

---

### 61.4c. Production Chain Re-Verification Schedule

Hash chain integrity must be verified proactively in production, not only on scope disposal or on-demand. This section mandates a scheduled verification cadence.

```
REQUIREMENT: When gxp is true, organizations MUST schedule periodic full-chain
             re-verification of all active audit trail scopes. The verification
             cadence MUST be:
             (a) Daily: At least one full `verifyAuditChain()` pass per active
                 scope per 24-hour period. The verification SHOULD be scheduled
                 during low-traffic windows to minimize performance impact.
             (b) On scope disposal: `verifyAuditChain()` is already REQUIRED
                 per §61.4 when gxp is true. This is the authoritative final
                 verification.
             (c) On-demand: After any incident that could affect audit trail
                 integrity (backing store failover, WAL recovery, process
                 crash recovery), an immediate `verifyAuditChain()` MUST be
                 triggered for all scopes that were active during the incident.
             The verification schedule MUST be documented in the validation
             plan (section 67) and verification results MUST be logged with:
             (1) verification timestamp, (2) scope ID, (3) entry count verified,
             (4) result (pass/fail), and (5) duration of verification.
             Reference: 21 CFR 11.10(e), ALCOA+ Accurate.

RECOMMENDED: In non-GxP environments, organizations SHOULD schedule weekly
             chain re-verification as a best practice. Automated scheduling
             via cron, container health checks, or application-level timers
             is RECOMMENDED.

REQUIREMENT: The @hex-di/guard library MUST provide a
             `scheduleChainVerification()` utility that accepts a verification
             interval (minimum: 1 hour, default: 24 hours) and invokes
             `verifyAuditChain()` for all active scopes on the configured
             cadence. The utility MUST:
             (a) Log each verification result via the configured logger.
             (b) Invoke `onChainBreak` if any verification fails.
             (c) Emit a structured health event consumable by
                 `createGuardHealthCheck()`.
             (d) Support cancellation via an `AbortSignal` for graceful
                 shutdown.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

---

### 61.9. Circuit Breaker for Audit Trail Backend

When `failOnAuditError: true` (the GxP default), persistent backing store failures block all guarded operations indefinitely. A circuit breaker pattern provides structured failure handling with automatic recovery detection.

```
REQUIREMENT: When gxp is true, the audit trail adapter MUST implement or be
             wrapped with a circuit breaker that transitions through the
             following states:
             (a) CLOSED (normal operation): All `record()` calls are forwarded
                 to the backing store. Failures are counted.
             (b) OPEN (tripped): After a configurable failure threshold
                 (default: 5 consecutive failures), the circuit breaker
                 transitions to OPEN. In OPEN state:
                 - `record()` calls immediately return
                   `Err(AuditTrailWriteError)` with code ACL008 and a
                   `circuitBreakerOpen: true` metadata flag.
                 - An automated CRITICAL alert MUST be sent to the compliance
                   and operations teams.
                 - A `PolicyChangeAuditEntry`-style event MUST be logged to
                   the administrative event log (§64b) recording the circuit
                   breaker state transition.
             (c) HALF-OPEN (probe): After a configurable reset timeout
                 (default: 30 seconds), the circuit breaker allows a single
                 probe `record()` call:
                 - On success: transition to CLOSED, log recovery event.
                 - On failure: transition back to OPEN, reset the timeout.
             The circuit breaker configuration MUST be documented in the
             validation plan (section 67). The failure threshold MUST NOT
             exceed 10 consecutive failures. The reset timeout MUST NOT
             exceed 5 minutes.
             Reference: EU GMP Annex 11 §16 (business continuity),
             21 CFR 11.10(e).

RECOMMENDED: The circuit breaker SHOULD expose metrics consumable by
             `createGuardHealthCheck()`:
             - `circuitBreakerState`: "closed" | "open" | "half-open"
             - `consecutiveFailures`: number
             - `lastFailureTimestamp`: ISO 8601 UTC
             - `lastSuccessTimestamp`: ISO 8601 UTC
             - `totalTrips`: cumulative count of CLOSED→OPEN transitions

RECOMMENDED: In non-GxP environments, the circuit breaker pattern is
             RECOMMENDED but not required. Organizations that do not implement
             a circuit breaker SHOULD document the expected behavior under
             persistent backing store failure in their operational runbook.
```

---

### 61.10. Error Log Retention

Guard operational error logs (distinct from audit trail entries) serve as secondary compliance evidence and diagnostic artifacts. Their retention must be formally managed.

```
REQUIREMENT: When gxp is true, operational error logs generated by the guard
             system (including ACL error codes, circuit breaker state
             transitions, WAL recovery events, chain verification results,
             and health check events) MUST be retained for a minimum of:
             (a) 1 year for informational/warning-level events.
             (b) 3 years for error/critical-level events.
             (c) Same retention as the associated audit trail scope for
                 events correlated to a specific evaluationId.
             Error log retention periods MUST align with or exceed the audit
             trail retention periods defined in section 63 (04-data-retention.md)
             for the corresponding severity level. Error logs MUST NOT be
             purged before the associated audit trail entries.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.

REQUIREMENT: Error logs MUST include sufficient metadata for post-incident
             correlation:
             (a) Timestamp (ISO 8601 UTC from the guard clock source).
             (b) Error code (ACL-prefixed code).
             (c) Scope ID (when available).
             (d) Evaluation ID (when available).
             (e) Correlation ID (trace/span context when tracing is enabled).
             (f) Severity level (info, warning, error, critical).
             This metadata enables error logs to be cross-referenced with
             audit trail entries and incident reports during investigations.
             Reference: ALCOA+ Attributable, Contemporaneous.

RECOMMENDED: In non-GxP environments, organizations SHOULD retain error logs
             for at least 90 days. Error logs SHOULD be stored in a
             centralized logging system (e.g., SIEM, ELK, CloudWatch) that
             supports structured querying by the metadata fields above.
```

---

---

_Previous: [Regulatory Context](./01-regulatory-context.md) | Next: [Clock Synchronization](./03-clock-synchronization.md)_
