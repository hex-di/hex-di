# 17 - GxP Compliance: Audit Trail Review

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-05                              |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Data Retention](./04-data-retention.md) | Next: [Administrative Controls](./06-administrative-controls.md)_

---

## 64. Audit Trail Review Interface

### 21 CFR 11.10(e) Requirement

> _"Use of secure, computer-generated, time-stamped audit trails to independently record the date and time of operator entries and actions that create, modify, or delete electronic records. Record changes shall not obscure previously recorded information. Such audit trail documentation shall be retained for a period at least as long as that required for the subject electronic records and shall be available for agency review and copying."_

### Guard's Contribution

Guard provides the **data** for audit trail review. The **interface** for review is the consumer's responsibility, but guard exposes the data through multiple channels:

#### 1. GuardInspector Snapshot (Real-Time)

```typescript
const snapshot = inspector.getSnapshot();
// snapshot.recentDecisions: last N evaluations (ring buffer)
// snapshot.permissionStats: aggregated counts
// snapshot.activePolicies: current policy configuration
```

#### 2. MCP Resources (Remote Access)

```
hexdi://guard/snapshot  -> Full guard inspection snapshot
hexdi://guard/audit    -> Recent audit trail entries
hexdi://guard/decisions -> Recent authorization decisions
hexdi://guard/stats    -> Permission statistics
hexdi://guard/policies -> Active policy configuration
```

#### 3. A2A Skills (AI-Assisted Review)

```
guard.audit-review -> "Show me all denied access attempts in the last hour"
                   -> "Which subjects have been denied access to UserRepository?"
                   -> "Review the audit trail for compliance"
```

```
REQUIREMENT: In GxP environments (gxp: true), access to audit trail data through MCP
             resources (hexdi://guard/audit, hexdi://guard/decisions, hexdi://guard/stats)
             and A2A skills (guard.audit-review) MUST be recorded in a meta-audit log.
             Each access constitutes an audit trail review event that MUST capture:
             (1) accessor identity (MCP client ID or A2A agent ID),
             (2) timestamp of access (ISO 8601 UTC),
             (3) resource or skill accessed,
             (4) query parameters or filters applied,
             (5) result summary (entry count returned).
             This meta-audit log is subject to the same retention and access control
             requirements as the primary audit trail.
             See 12-inspection.md sections 48c and 48d for implementation details.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, PIC/S PI 011-3 §9.4.
```

```
REQUIREMENT: MCP resource access and A2A skill access to guard audit trail data MUST
             be subject to the same access lifecycle controls as the backing store:
             (1) periodic access reviews (at least annually),
             (2) prompt revocation on role change or departure,
             (3) documented grants and revocations recorded in the meta-audit log.
             Access grants MUST specify the scope of permitted resources (e.g.,
             hexdi://guard/audit read-only vs. hexdi://guard/policies read-write).
             Revocations MUST take effect within 24 hours of the triggering event.
             Reference: EU GMP Annex 11 §12.4.
```

```
REQUIREMENT: Organizations MUST maintain a documented procedure for providing audit
             trail data to regulatory inspectors on demand, including:
             (1) Designation of a trained person responsible for audit trail access
                 during inspections
             (2) Ability to export audit trail data in CSV and JSON formats within
                 4 business hours of a regulatory request
             (3) Ability to demonstrate hash chain verification (verifyAuditChain())
                 in the inspector's presence using the standalone verification tool
             (4) Documentation of the export and verification process for the inspector
             Reference: 21 CFR 11.10(e), PIC/S PI 011-3 Section 9.4.
```

```
RECOMMENDED: Organizations SHOULD support time-limited, read-only digital access
             for regulatory inspectors as a complement to the manual export
             procedure above:

             1. Inspector credentials: A dedicated MCP client credential set SHOULD
                be provisioned for regulatory inspectors, granting read-only access
                to the audit trail query interface (section 28) and the hash chain
                verification tool (verifyAuditChain()).
             2. Access logging: All inspector access MUST be recorded in the
                meta-audit log (section 72), including: inspector identity, access
                timestamps, queries executed, and data volumes retrieved.
             3. Credential revocation: Inspector credentials MUST be revoked within
                24 hours of the conclusion of the inspection. Credential lifetime
                MUST NOT exceed the documented inspection period plus a 24-hour
                grace period.
             4. Remote inspections: For remote regulatory inspections, the MCP
                endpoint SHOULD be accessible via encrypted transport (mutual TLS).
                The same access logging and credential lifecycle controls apply.
             5. OQ coverage: The digital inspector access flow SHOULD be tested
                during OQ, including: credential provisioning, query execution,
                chain verification, and credential revocation.

             This digital access capability complements (but does not replace) the
             4-business-hour manual export procedure defined above. It supports the
             trend toward remote and hybrid inspections adopted by FDA, EMA, and
             PIC/S member authorities.
             Reference: 21 CFR 11.10(e), PIC/S PI 011-3 §9.4, FDA Remote
             Interactive Evaluations guidance.
```

#### 4. AuditTrail Query Interface

The `AuditTrail` interface defines `record()` only. For review, the consumer should extend the adapter with query capabilities. The authoritative `QueryableAuditTrail` definition is in 07-guard-adapter.md (section 28). The interface below is a simplified illustration for GxP compliance review context — production implementations MUST follow 07-guard-adapter.md which uses `Result` return types for proper error handling:

```typescript
interface QueryableAuditTrail extends AuditTrail {
  /** Query entries by predicate. */
  query(filter: AuditQueryFilter): ReadonlyArray<AuditEntry>;
  /** Count entries matching a filter. */
  count(filter: AuditQueryFilter): number;
  /** Export entries for regulatory review. */
  export(filter: AuditQueryFilter, format: "json" | "csv"): string;
}

interface AuditQueryFilter {
  readonly subjectId?: string;
  readonly portName?: string;
  readonly decision?: "allow" | "deny";
  readonly from?: string; // ISO 8601
  readonly to?: string; // ISO 8601
  // RECOMMENDED extensions for compliance review workflows:
  readonly sequenceNumberFrom?: number;
  readonly sequenceNumberTo?: number;
  readonly scopeId?: string;
}
```

> **Note:** The `sequenceNumberFrom`, `sequenceNumberTo`, and `scopeId` fields are RECOMMENDED extensions for compliance review workflows. They enable reviewers to query audit entries by sequence range within a specific scope, which is particularly useful for investigating chain breaks and verifying hash chain integrity over specific ranges.

This is a recommended extension, not a required interface in the guard spec. The `@hex-di/guard-testing` package provides `MemoryAuditTrail` which implements query capabilities for testing.

```
RECOMMENDED: AuditTrail query operations SHOULD complete within the following
             latency targets:

             (a) Queries returning up to 10,000 entries: 5 seconds or less.
             (b) Monitoring: Organizations SHOULD instrument audit trail query
                 latency and alert when the p95 latency exceeds twice the target
                 (10 seconds).
             (c) Indexing: The backing store SHOULD maintain indexes on the
                 fields listed in section 63a (Index Recommendations) to support
                 efficient query patterns: (scopeId, sequenceNumber),
                 (subjectId, timestamp), (portName, decision, timestamp), and
                 (evaluationId).
             (d) Pagination: For result sets exceeding 10,000 entries,
                 cursor-based pagination SHOULD be used rather than offset-based
                 pagination to maintain consistent performance as the data set
                 grows.

             Reference: ALCOA+ Available principle.
```

```
REQUIREMENT: Audit trail exports for regulatory review MUST be self-contained. Each
             export MUST include all fields necessary to independently verify the hash
             chain: integrityHash, previousHash, hash algorithm identifier, and chain
             epoch metadata. When electronic signatures are present, the export MUST
             include signature public key material (for asymmetric algorithms) or key
             identifiers (for HMAC). The export format MUST be human-readable (CSV or
             JSON) per 21 CFR 11.10(e). Exports MUST NOT require access to the original
             application infrastructure for verification.

REQUIREMENT: The minimum field set for a self-contained audit trail export MUST include
             all 10 required AuditEntry fields (evaluationId, timestamp, subjectId,
             authenticationMethod, policy, decision, portName, scopeId, reason, durationMs)
             plus, when present: traceDigest, integrityHash, previousHash, hashAlgorithm,
             sequenceNumber, policySnapshot, and the complete signature sub-fields
             (signerId, signedAt, meaning, value, algorithm, signerName, reauthenticated).
             Omitting any populated field from the export renders the export incomplete
             for independent verification. Reference: 21 CFR 11.10(e), ALCOA+ Complete.

REQUIREMENT: Audit trail exports MUST include a manifest containing: (1) total entry
             count, (2) the integrityHash of the first and last entries, (3) the
             scopeId(s) included, (4) a SHA-256 checksum computed over the entire
             export file, and (5) the export timestamp. Recipients of an export MUST
             verify the manifest checksum and run verifyAuditChain() on the received
             data before using the export as compliance evidence.
             Reference: 21 CFR 11.10(b).
```

### Audit Trail Access Control

Per EU GMP Annex 11 Section 12.1, the audit trail store itself requires access control to prevent unauthorized viewing, modification, or deletion:

```
REQUIREMENT: The audit trail backing store MUST restrict write access to
             the application's service account only. Human users MUST NOT
             have direct write access to audit trail tables/streams.

REQUIREMENT: Reviewers (QA, compliance officers) MUST have read-only
             access to audit trail data. All users, including administrators,
             MUST NOT have delete access to audit trail records.

REQUIREMENT: Access to audit trail data MUST itself be logged, creating
             an access audit trail (meta-audit).
```

Implementation guidance:

- **SQL databases:** Create a dedicated read-only database role for reviewers. Revoke `INSERT`, `UPDATE`, and `DELETE` from this role.
- **Cloud services:** Use IAM policies to restrict audit trail bucket/table access. Enable access logging (e.g., S3 access logs, CloudTrail data events).

```
RECOMMENDED: Access to audit trail data SHOULD follow the principle of least privilege.
             Consider scope-filtered access where reviewers see only entries matching
             their organizational scope (filtered by scopeId, portName, or department).
             Full unfiltered access to audit trail data SHOULD be reserved for QA and
             compliance officers. Reference: PIC/S PI 011-3 Section 9.4.
```

### Audit Trail Display Security

Audit trail review interfaces (web dashboards, compliance reporting tools, admin panels) render AuditEntry fields that may contain user-controlled content. Without proper output encoding, these fields are vectors for stored cross-site scripting (XSS) attacks that could compromise reviewer sessions or falsify displayed audit data.

Fields at elevated risk:

- **`reason`** — free-text field provided by the signing user at capture time
- **`traceDigest`** — contains policy labels that may originate from user-configurable policy names or attribute values
- **`subjectId`** — sourced from an external Identity Provider, which may include special characters

```
REQUIREMENT: Audit trail review interfaces MUST apply context-appropriate output
             encoding when rendering AuditEntry fields:
             - HTML contexts: HTML entity encoding (e.g., `<` → `&lt;`, `"` → `&quot;`)
             - JSON API responses: JSON escaping per RFC 8259
             - CSV/Excel exports: field quoting and formula injection prevention
               (prefix fields starting with `=`, `+`, `-`, `@` with a single quote)
             This requirement applies to all AuditEntry fields, not only the elevated-risk
             fields listed above, because any field may contain unexpected characters due
             to data corruption, encoding errors, or injection attempts.
             Reference: OWASP XSS Prevention Cheat Sheet, 21 CFR 11.10(a).

RECOMMENDED: Audit trail review interfaces SHOULD use a template engine or UI
             framework with auto-escaping enabled by default (e.g., React JSX, Angular
             templates, Go html/template). Manual encoding SHOULD be avoided where
             auto-escaping is available. If `dangerouslySetInnerHTML` or equivalent
             raw-HTML rendering is used for any audit field, it MUST be accompanied by
             a documented justification and a sanitization step using a trusted library
             (e.g., DOMPurify).
```

### Audit Trail Readability for Non-Technical Reviewers

```
RECOMMENDED: Organizations SHOULD provide an audit trail review interface that renders
             entries in a format intelligible to non-technical QA reviewers and regulatory
             inspectors. The review interface SHOULD:
             (a) Display policy outcomes in plain language using the output of
                 `explainPolicy()` rather than raw policy JSON.
             (b) Resolve `subjectId` values to human-readable names (while respecting
                 pseudonymization requirements — see section 63b).
             (c) Highlight deny decisions and anomalies (e.g., unusual access patterns,
                 repeated denials) with visual indicators.
             (d) Provide contextual tooltips or a glossary for technical fields such as
                 `evaluationId`, `previousHash`, and `sequenceNumber`.
             (e) Support filtering by date range, subject, port, and decision outcome
                 to facilitate targeted regulatory review.
             These measures support the ALCOA+ Legible principle and EU GMP Annex 11 §9
             (audit trail review capability). See also PIC/S PI 011-3 §9.8 guidance on
             audit trail readability during inspection.
             Reference: EU GMP Annex 11 §9, PIC/S PI 011-3 §9.8, ALCOA+ Legible.
```

### Internationalization of Audit Trail Content

```
REQUIREMENT: When gxp is true, audit trail content MUST support internationalization
             to ensure legibility across regulatory jurisdictions:

             1. UTF-8 encoding: All free-text audit trail fields (reason strings,
                policy labels, sign-off text) MUST be stored as UTF-8 encoded
                strings. Adapters MUST NOT silently downgrade to ASCII or Latin-1
                encoding. The encoding MUST be verified during OQ testing (section
                67b) by persisting and retrieving audit entries containing
                representative non-ASCII content.
             2. Non-ASCII character preservation: The audit trail pipeline MUST
                preserve non-ASCII characters in subject identifiers, attribute
                values, and reason strings without normalization or transliteration.
                This is essential for deployments serving PMDA (Japan), NMPA (China),
                or other regulatory authorities where localized sign-off text is
                required.
             3. Subject identifier preservation: subjectId and signerId values
                containing non-ASCII characters MUST be preserved as-is in audit
                entries and exports. No normalization (NFC/NFD) or transliteration
                to ASCII equivalents is permitted.
             4. CSV export BOM: When exporting audit trail data in CSV format and the
                export contains non-ASCII content, the export MUST include a UTF-8
                BOM (byte order mark, U+FEFF) at the beginning of the file to ensure
                correct rendering in spreadsheet applications.
             5. Validation plan documentation: When the deployment serves users in
                multiple language locales, the validation plan MUST document the
                expected languages and character sets, and PQ testing MUST include
                at least one end-to-end audit trail cycle with non-ASCII content.

             These measures satisfy the ALCOA+ Legible principle across jurisdictions
             and ensure audit trail content remains readable during inspections
             conducted by non-English-speaking regulatory authorities.
             Reference: EU GMP Annex 11 §9, PIC/S PI 011-3 §9.8, ALCOA+ Legible.

RECOMMENDED: In non-GxP environments, organizations operating in multi-language
             contexts SHOULD follow the same internationalization measures described
             in the REQUIREMENT above. UTF-8 encoding and non-ASCII character
             preservation are best practices for any deployment handling
             internationalized data.
             Reference: EU GMP Annex 11 §9, PIC/S PI 011-3 §9.8, ALCOA+ Legible.
```

### Multi-Tenant Audit Trail Isolation

```
REQUIREMENT: In multi-tenant deployments, each tenant's audit trail data MUST be
             logically or physically isolated. Cross-tenant access to audit trail
             data MUST be prevented by the backing store's access control mechanism.
             The scopeId used for audit entries MUST include a tenant identifier
             (e.g., as a prefix or composite key component) to enable per-tenant
             chain verification and data partitioning.
             Reference: EU GMP Annex 11 §12.1, PIC/S PI 011-3 §9.4.

RECOMMENDED: Scope-based partitioning (section 63) SHOULD align with tenant
             boundaries so that each tenant's audit chain is independently
             verifiable via verifyAuditChain(). Reviewers SHOULD be scoped to
             their tenant's data — a reviewer in Tenant A SHOULD NOT have access
             to Tenant B's audit trail entries unless explicitly authorized for
             cross-tenant review. Full cross-tenant access to audit trail data
             SHOULD be reserved for platform QA and compliance officers responsible
             for multi-tenant governance.
             Reference: EU GMP Annex 11 §12.1, PIC/S PI 011-3 §9.4.
```

### Audit Trail Data-at-Rest Encryption

```
REQUIREMENT: In GxP environments, the audit trail backing store MUST be encrypted at
             rest using AES-256 or an equivalent NIST-approved algorithm. Encryption
             at rest protects audit trail data against unauthorized access to physical
             media, storage snapshots, and backup archives. The encryption mechanism
             MUST be documented in the validation plan (section 67) and verified
             during IQ (section 67a).
             Reference: MHRA Data Integrity Guidance (2018), EU GMP Annex 11 §7,
             GDPR Article 32(1)(a).

RECOMMENDED: In non-GxP environments, the audit trail backing store SHOULD be
             encrypted at rest using AES-256 or an equivalent NIST-approved algorithm
             as a defense-in-depth control.

REQUIREMENT: The pseudonym-to-identity mapping store (section 63b) MUST be encrypted
             at rest. Because the mapping links pseudonymized audit entries to
             real identities, its compromise would negate the privacy benefits of
             pseudonymization. Encryption of the mapping store is a mandatory
             control when GDPR applies. Reference: GDPR Article 32(1)(a),
             section 63b.

RECOMMENDED: Key management for audit trail encryption SHOULD follow the guidance
             in section 65c (Key Management Behavioral Contracts). Encryption keys
             SHOULD be rotated at least annually. Key access SHOULD be limited to
             designated infrastructure administrators, and key access events SHOULD
             be logged in the meta-audit log.
```

Implementation guidance:

- **SQL databases:** Use Transparent Data Encryption (TDE) provided by the database engine (e.g., PostgreSQL `pgcrypto` + TDE, SQL Server TDE, Oracle TDE). TDE encrypts at the storage level without application changes.
- **Cloud services:** Enable server-side encryption (SSE) on the storage service (e.g., AWS S3 SSE-KMS, Azure Storage Service Encryption, GCP Cloud KMS). Use customer-managed keys (CMK) for key rotation control.
- **File systems:** Use full-disk encryption (FDE) on volumes hosting audit trail files (e.g., LUKS on Linux, BitLocker on Windows, FileVault on macOS).
- **Pseudonym mapping store:** Apply application-level encryption (ALE) in addition to storage-level encryption for the pseudonym-to-identity mapping, providing an independent encryption layer with separately managed keys.

```
REQUIREMENT: In GxP environments (gxp: true), audit trail review MUST be risk-based per
             PIC/S PI 011-3 §9.8. High-risk port accesses (e.g., batch release, patient
             data modifications) MUST be reviewed daily. Deny events MUST be reviewed
             within 24 hours to detect unauthorized access attempts. Routine allow events
             for low-risk ports MUST be reviewed monthly or quarterly based on a documented
             risk assessment. The review frequency for each port category MUST be documented
             in the validation plan (section 67). Organizations MAY use the optional
             `dataClassification` field on AuditEntry (section 61) to categorize entries
             by risk level (e.g., "gxp-critical", "operational", "diagnostic"), enabling
             automated filtering of entries into the appropriate review cadence.
             Reference: EU GMP Annex 11 §9, PIC/S PI 011-3 §9.8.
```

```
REQUIREMENT: In GxP environments, access rights to guard configuration and audit trail
             data MUST follow a defined lifecycle: periodic access reviews (at least
             annually), prompt revocation upon role change or departure, and documented
             access grants and revocations. The access lifecycle MUST be integrated with
             the site's identity management procedures.
             Reference: EU GMP Annex 11 §12.4, PIC/S PI 011-3 §9.4.
```

### Periodic Review and System Suitability

Per GAMP 5 periodic review guidance, organizations operating `@hex-di/guard` in GxP environments MUST conduct periodic reviews to confirm ongoing system suitability:

```
REQUIREMENT: In GxP environments, organizations MUST perform operational qualification
             (OQ) re-verification at least annually or after significant changes to the
             guard configuration (new policies, role hierarchy changes, signature service
             migration). The annual OQ re-verification date and scope MUST be documented
             in the periodic review report.
             Reference: GAMP 5 periodic review guidance, EU GMP Annex 11 §11.

RECOMMENDED: Re-validation triggers include: framework version upgrades,
             changes to the AuditTrail adapter implementation, changes to
             the SignatureService adapter, and infrastructure migrations.

RECOMMENDED: Ongoing verification should include: hash chain integrity
             checks on a sample of recent audit entries, signature
             validation spot-checks, and clock synchronization monitoring.

REQUIREMENT: When gxp is true, automated background chain verification MUST be
             performed on the following schedule:

             (a) Active chains: verifyAuditChain() MUST run daily for all active
                 scope chains (chains that have received at least one entry in the
                 preceding 24 hours). Coverage MUST be 100% of active chains per
                 verification cycle.
             (b) Archived chains: verifyAuditChain() MUST run weekly for archived
                 scope chains (chains that have not received entries in the preceding
                 7 days but are within the retention period).
             (c) Verification logging: Each verification run MUST produce a
                 structured log entry containing: verification timestamp, scope
                 count verified, entry count verified, pass/fail result per scope,
                 total verification duration, and operator/scheduler identity.
             (d) Failure response: Any chain verification failure MUST trigger the
                 Chain Break Response procedure (section 61.4 in
                 02-audit-trail-contract.md) including immediate alert, quarantine,
                 and incident report per the defined SLAs.

             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9,
             ALCOA+ Accurate principle.

RECOMMENDED: In non-GxP environments, organizations SHOULD implement automated
             background chain verification on at least a weekly schedule for active
             chains. This provides proactive tamper detection without the daily
             overhead required for GxP compliance.

REQUIREMENT: When automated hash chain integrity verification is implemented, failed
             verifications MUST trigger the Chain Break Response procedure (section 61,
             "Chain Break Response").
```

```
RECOMMENDED: Organizations SHOULD use createGuardHealthCheck() (07-guard-adapter.md)
             for daily scheduled health checks. The health check evaluates a canary
             policy, writes a canary audit entry, and verifies hash chain integrity
             over recent entries — providing early detection of silent pipeline
             degradation (policy evaluation errors, audit trail unresponsiveness,
             or chain corruption) before production evaluations are affected.
             Health check results SHOULD be logged and included in the periodic
             review report.
```

```
REQUIREMENT: Each periodic review cycle MUST produce a documented Periodic Review
             Report including: (1) scope of review (date range, scope IDs, entry counts),
             (2) findings (chain integrity results, anomalies, deviations),
             (3) corrective actions (if any), (4) reviewer identity and sign-off,
             and (5) review date. Reference: EU GMP Annex 11 §11. Follow the Validation
             Report template (section 67d) as a model for report structure and sign-off.
```

```
REQUIREMENT: In GxP environments, the annual periodic review MUST include, at minimum:
             (1) FMEA re-assessment — review all failure modes (section 68 and http-client spec §98)
                 for changed risk profiles, new failure modes introduced by configuration
                 changes, and confirm all mitigated RPNs remain <= 10,
             (2) Access control review — verify that all active subjects, roles, and
                 permissions align with current organizational responsibilities; revoke
                 permissions for personnel who have changed roles or departed,
             (3) Audit trail integrity verification — run verifyAuditChain() across all
                 active scope chains and a representative sample of archived chains,
             (4) Policy configuration review — compare active policies against the
                 approved policy configuration in the change control log (section 64a);
                 investigate any discrepancies,
             (5) Clock synchronization verification — confirm NTP drift monitoring is
                 active and drift has remained within the 1-second threshold (section 62),
             (6) Incident review — summarize all compliance incidents (chain breaks,
                 WAL orphans, key compromises) since the last review and confirm
                 corrective actions are closed.
             The periodic review MUST NOT exceed 12 months between cycles. The review
             date and scope MUST be recorded in the Periodic Review Report (this section).
             Reference: EU GMP Annex 11 §11, GAMP 5 periodic review guidance.
```

```
RECOMMENDED: In addition to the periodic review items above, organizations SHOULD
             monitor the following session and scope indicators:

             1. **Scope lifetime exceedances:** Track the count and frequency of
                scopes that reach maxScopeLifetimeMs and trigger ScopeExpiredError
                (ACL013). A high frequency may indicate that maxScopeLifetimeMs is
                configured too aggressively or that long-running operations need
                architectural review.

             2. **Stale authenticatedAt detection:** Monitor for subjects whose
                authenticatedAt timestamp exceeds the configured staleness window
                (default: 24 hours) at the point of guard evaluation. This indicates
                sessions that are not being refreshed and may carry outdated
                permissions.

             3. **Concurrent subjectId usage:** Monitor for the same subjectId
                appearing in multiple active scopes simultaneously. Concurrent
                scope counts exceeding the alerting threshold (default: 2) may
                indicate credential sharing or session hijacking.

             These indicators SHOULD be included in the periodic review report
             and in operational dashboards.
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

---

## 64e. Audit Trail Export Formats

Audit trail data must be exportable in formats suitable for both machine processing and human review. This section specifies the normative export format requirements.

```
REQUIREMENT: AuditQueryPort.exportEntries() MUST support two export formats:
             (a) **JSON Lines** (machine-readable): One JSON object per line, each
                 line representing a complete AuditEntry. The JSON Lines format
                 enables streaming processing and is suitable for automated
                 compliance tooling, cross-system import, and programmatic analysis.
             (b) **CSV** (human-readable): RFC 4180-compliant CSV with a header row.
                 The CSV format enables review in spreadsheet applications and is
                 suitable for regulatory inspector review and manual audit.
             Both formats MUST include all AuditEntry fields. Neither format MAY
             omit fields or transform field values from their canonical representation.
             Reference: 21 CFR 11.10(b) (generate accurate and complete copies),
             21 CFR 11.10(c) (protection of records), ALCOA+ Original.

REQUIREMENT: When exporting audit trail data in CSV format, AuditQueryPort.exportEntries()
             MUST sanitize cell values to prevent formula injection (also known as CSV
             injection). Cell values beginning with any of the following characters MUST
             be prefixed with a single quote character ('): equals sign (=), plus sign (+),
             minus sign (-), at sign (@), tab character (U+0009), or carriage return
             (U+000D). This prevents malicious or accidental formula execution when
             compliance reviewers open exports in spreadsheet applications (Microsoft
             Excel, Google Sheets, LibreOffice Calc). The sanitization MUST be applied
             to ALL AuditEntry fields, including but not limited to: reason (free-text
             user input), subjectId (from external IdP), traceDigest (contains policy
             labels), and signerName. The single-quote prefix is chosen because
             spreadsheet applications treat it as a text-indicator prefix that is not
             displayed in the cell value. JSON Lines exports are NOT affected by this
             requirement (JSON escaping per RFC 8259 is sufficient).
             Reference: OWASP CSV Injection Prevention, 21 CFR 11.10(a).
```

```
REQUIREMENT: Export field ordering MUST match the hash chain canonical field order
             (section 61.4) to enable independent hash recomputation from export
             data. The canonical field order is:
             authenticationMethod, decision, durationMs, evaluationId,
             policySnapshot, portName, previousHash, reason, schemaVersion,
             scopeId, sequenceNumber, subjectId, timestamp, traceDigest.
             Additional fields (integrityHash, hashAlgorithm, signature) MUST
             follow the canonical fields in the order listed.
             Reference: 21 CFR 11.10(c), ALCOA+ Consistent.
```

```
REQUIREMENT: Every audit trail export MUST include an AuditExportManifest containing:
             (a) SHA-256 checksum of the complete export file content.
             (b) Total entry count.
             (c) First and last integrityHash values (hash chain boundaries).
             (d) List of scopeId values included in the export.
             (e) Export timestamp (ISO 8601 UTC).
             (f) Export format ("json-lines" or "csv").
             (g) Schema versions present in the exported data.
             Recipients MUST verify the manifest checksum before using export data
             as compliance evidence.
             Reference: 21 CFR 11.10(b), 21 CFR 11.10(c), ALCOA+ Original.
```

```
RECOMMENDED: For audit trail exports exceeding 500MB, organizations SHOULD
             split the export into multiple parts:

             (a) Part boundaries: Each part SHOULD align with scope boundaries
                 (i.e., a scope's entries are not split across parts). If a
                 single scope exceeds 500MB, the part boundary SHOULD align
                 with a natural sequence number boundary (e.g., every 100,000
                 entries).
             (b) Per-part manifest: Each part MUST include its own
                 AuditExportManifest with part-specific entry count, first/last
                 sequence number, and SHA-256 checksum.
             (c) Overall manifest: The complete export MUST include an overall
                 manifest referencing all parts, with total entry count, overall
                 SHA-256 checksum (computed over the ordered concatenation of
                 per-part checksums), and part count.
             (d) Chain continuity: The hash chain MUST remain verifiable across
                 parts. The last entry's integrityHash in part N MUST equal the
                 previousHash of the first entry in part N+1 for entries within
                 the same scope chain.

             Reference: 21 CFR 11.10(b) (accurate and complete copies),
             ALCOA+ Complete principle.
```

---

_Previous: [Data Retention](./04-data-retention.md) | Next: [Administrative Controls](./06-administrative-controls.md)_
