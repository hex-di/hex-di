# 23 - GxP Quick Reference

_Previous: [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md)_

---

This document provides a consolidated cross-reference mapping each regulatory clause to the specific spec sections, combinators, types, and test references that satisfy it. It is intended to reduce audit preparation time by providing a single lookup point for regulatory inspectors and QA reviewers.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in guard spec section 59.

---

## FDA 21 CFR Part 11

### Subpart B — Electronic Records

| Clause       | Requirement                             | Spec Sections                                                                                                   | Combinators / Types                                                                                        | Test References                                            |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **11.10(a)** | System validation                       | §83a (Validation Plan), §99 (IQ/OQ/PQ), §108 (GAMP 5 Category 5)                                                | `createGxPHttpClient` factory (§103)                                                                       | IQ-HT-01 through IQ-HT-04, all OQ checks                   |
| **11.10(b)** | Accurate and complete copies            | §105 (`QueryableHttpAuditTrailPort.export()`), §104 (archive manifest)                                          | `HttpAuditExportResult`, `HttpAuditArchiveManifest`                                                        | OQ-HT-50+ (export completeness)                            |
| **11.10(c)** | Protection of records                   | §85 (`requireHttps()`), §86 (`withPayloadIntegrity()`), §104 (retention), §104a (backup)                        | `CertificateValidationPolicy`, `PayloadIntegrityConfig`                                                    | OQ-HT-01 (HTTPS enforcement), OQ-HT-05 (payload integrity) |
| **11.10(d)** | Access limitation                       | §94 (`withHttpGuard()`), §93 (`withSubjectAttribution()`), §90 (`withAuthenticationPolicy()`)                   | `HttpOperationPolicy`, `HttpOperationGatePort`                                                             | OQ-HT-30+ (RBAC), OQ-HT-25+ (subject attribution)          |
| **11.10(e)** | Audit trails                            | §91 (`HttpAuditTrailPort`), §92 (`HttpOperationAuditEntry`), §97 (`withHttpAuditBridge()`), §55a (FNV-1a chain) | `withHttpAuditBridge()`, `rejectOnMissingReason`, `failOnAuditError`                                       | OQ-HT-12 (audit completeness), OQ-HT-15 (hash chain)       |
| **11.10(f)** | Operational system checks (sequencing)  | §103 (combinator pipeline ordering), §81b (GxP combinator validation protocol), §97 (`rejectOnMissingReason`)   | `createGxPHttpClient` factory enforces combinator ordering; `rejectOnMissingReason` enforces preconditions | OQ-HT-70+ (reason enforcement), pipeline ordering tests    |
| **11.10(g)** | Authority checks / separation of duties | §94 (`conflictingRoles` on `HttpOperationPolicy`)                                                               | `withHttpGuard()`                                                                                          | OQ-HT-35 (separation of duties)                            |
| **11.10(h)** | Input checks                            | §89 (`withPayloadValidation()`), §111 (3-layer validation boundary)                                             | `PayloadValidationConfig`                                                                                  | OQ-HT-20 (payload validation)                              |
| **11.10(i)** | Training                                | §109 (5 roles, competency criteria, training records)                                                           | — (organizational control)                                                                                 | Training matrix review in periodic review                  |
| **11.10(j)** | Documentation controls                  | §116 (Change Request process), README document control                                                          | — (organizational control)                                                                                 | CR log review in periodic review                           |
| **11.10(k)** | Revision and change control             | §116 (CR process), §117 (SemVer-to-revalidation), README revision history                                       | — (organizational control)                                                                                 | Version verification in IQ                                 |

### Subpart B — Open Systems

| Clause    | Requirement               | Spec Sections                                                                       | Combinators / Types                                      | Test References                                           |
| --------- | ------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| **11.30** | Controls for open systems | §85 (`requireHttps()`), §106 (certificate revocation), §112 (`withCorsHardening()`) | `TlsConfig`, `CertificateRevocationPolicy`, `CorsPolicy` | OQ-HT-01 (HTTPS), OQ-HT-60+ (revocation), OQ-HT-64 (CORS) |

### Subpart C — Electronic Signatures

| Clause     | Requirement                    | Spec Sections                                                                                       | Combinators / Types                                          | Test References                                             |
| ---------- | ------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| **11.50**  | Signature manifestations       | §93a (`withElectronicSignature()`), §93b (`HttpSignatureDisplayFormat`), §114 (signing ceremony UI) | `HttpElectronicSignature`, `HttpSignatureDisplayFormat`      | E-sig display tests, signing ceremony tests                 |
| **11.70**  | Signature/record linking       | §93a (`signatureBinding` SHA-256 computation)                                                       | `withElectronicSignature()`                                  | OQ-HT-40 (signature binding)                                |
| **11.100** | General signature requirements | §93a (signer verification), §107 (`HttpSignatureVerificationPort`), §114 (re-authentication)        | `ElectronicSignatureConfig`, `HttpSignatureVerificationPort` | OQ-HT-42 (signer match), OQ-HT-44 (2FA)                     |
| **11.200** | Signature components           | §93a (`twoFactorVerified`), §90 (`BiometricAuthenticationMetadata`)                                 | `ElectronicSignatureConfig.requireTwoFactor`                 | OQ-HT-44 (two-factor verification)                          |
| **11.300** | Controls for IDs/passwords     | §87 (`withCredentialProtection()`), §90 (`withTokenLifecycle()`), §95 (`withAuthFailureAudit()`)    | `CredentialRedactionPolicy`, `TokenLifecyclePolicy`          | OQ-HT-07 (credential redaction), OQ-HT-10 (token lifecycle) |

---

## EU GMP Annex 11

| Section  | Requirement                     | Spec Sections                                                                                                                                                    | Combinators / Types                                                                        | Test References                                                             |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **§1**   | Risk management                 | §98 (FMEA, 42 failure modes, ICH Q9), §83c (incident classification)                                                                                             | — (risk framework)                                                                         | FMEA review in periodic review                                              |
| **§2**   | Training                        | §109 (5 roles, competency assessment)                                                                                                                            | — (organizational control)                                                                 | Training matrix review                                                      |
| **§3**   | Suppliers and service providers | §108 (supply chain classification table), §118 (guard interface dependency inventory, 9 interfaces version-locked)                                               | — (organizational/supplier control)                                                        | Supplier assessment in periodic review                                      |
| **§3.4** | Access controls                 | §94 (`withHttpGuard()`), §110 (IAM integration boundary)                                                                                                         | `HttpOperationPolicy`, `IamIntegrationSurface`                                             | OQ-HT-30+ (RBAC)                                                            |
| **§4**   | Validation                      | §83a (Validation Plan), §99 (IQ/OQ/PQ), §108 (GAMP 5)                                                                                                            | — (process control)                                                                        | Full IQ/OQ/PQ suite                                                         |
| **§5**   | Data (electronic exchange)      | §86 (`withPayloadIntegrity()`), §89 (`withPayloadValidation()`), §82 (cross-chain verification)                                                                  | `PayloadIntegrityConfig`, `PayloadValidationConfig`, `CrossChainVerificationResult`        | OQ-HT-05 (payload integrity), OQ-HT-20 (validation), OQ-HT-67 (cross-chain) |
| **§6**   | Accuracy checks                 | §89 (`withPayloadValidation()`), §111 (3-layer validation)                                                                                                       | `PayloadValidationConfig`                                                                  | OQ-HT-20 (structural validation)                                            |
| **§7**   | Data storage and integrity      | §104 (retention/archival), §104a (backup), `HttpAuditArchivalPort`                                                                                               | `HttpAuditRetentionPolicy`, `HttpAuditArchivalPort`                                        | OQ-HT-50+ (retention), archive verification                                 |
| **§8**   | Printouts                       | §105 (`QueryableHttpAuditTrailPort.export()`), §93b (`HttpSignatureDisplayFormat`)                                                                               | `HttpAuditExportResult` (JSON/CSV export for printed copies), `HttpSignatureDisplayFormat` | Export completeness tests                                                   |
| **§9**   | Audit trails                    | §91-§92 (audit bridge), §105 (`QueryableHttpAuditTrailPort`)                                                                                                     | `HttpOperationAuditEntry`, `HttpAuditQueryFilter`                                          | OQ-HT-12 (completeness), OQ-HT-15 (hash chain)                              |
| **§10**  | Change management               | §88 (config change audit), §116 (spec CR process), §117 (SemVer mapping)                                                                                         | `HttpClientConfigurationAuditEntry`                                                        | Config change audit tests                                                   |
| **§11**  | Periodic review                 | §83b (review schedule, scope, triggers)                                                                                                                          | — (process control)                                                                        | Periodic review evidence                                                    |
| **§12**  | Security                        | §85 (HTTPS), §87 (credential protection), §94 (RBAC), §106 (cert revocation)                                                                                     | `requireHttps()`, `withCredentialProtection()`, `withHttpGuard()`                          | OQ-HT-01, OQ-HT-07, OQ-HT-30+, OQ-HT-60+                                    |
| **§13**  | Incident management             | §83c (incident classification, 16 types, 4 severity levels), §115 (catastrophic recovery)                                                                        | — (process control)                                                                        | CF-01 through CF-05 recovery tests                                          |
| **§14**  | Electronic signatures           | §93a-§93b (e-sig bridge), §107 (verification), §114 (ceremony)                                                                                                   | `withElectronicSignature()`, `HttpSignatureVerificationPort`                               | E-sig tests                                                                 |
| **§15**  | Batch release                   | _Not applicable_ — batch release is a business process concern outside the HTTP client transport layer. Organizations MUST address §15 at the application level. | —                                                                                          | —                                                                           |
| **§16**  | Business continuity             | §115 (catastrophic failure recovery), §104a (backup/restore)                                                                                                     | — (process/operational control)                                                            | CF-01 through CF-05, backup/restore tests                                   |
| **§17**  | Archiving                       | §104 (retention/archival), §104b (cross-system migration), `HttpAuditArchivalPort`                                                                               | `HttpAuditArchivalPort`, `HttpAuditArchiveManifest`                                        | Archive integrity verification tests                                        |

---

## ALCOA+ Data Integrity Principles

| Principle           | Implementation                                                                                                                                                      | Spec Sections                        | Key Types/Combinators                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| **Attributable**    | `withSubjectAttribution()` resolves authenticated subject for every operation; `evaluationId` cross-correlation links to guard decisions                            | §93, §97                             | `GxPActiveRequest.subjectId`, `HttpGuardCorrelation`    |
| **Legible**         | JSON-serializable audit entries; `HttpSignatureDisplayFormat` for signature rendering; structured error messages                                                    | §92, §93b                            | `HttpOperationAuditEntry`, `HttpSignatureDisplayFormat` |
| **Contemporaneous** | Monotonic timing via `monotonicNow()` (NTP-immune); wall-clock timestamps via `ClockSource`; clock drift detection (1s GxP threshold)                               | §96, §55a                            | `ClockSource.now()`, `performance.now()`                |
| **Original**        | `Object.freeze()` on all error objects; `readonly` fields on all audit entries; 3-step populate-freeze-return error construction                                    | §23, §92                             | Immutable `HttpHistoryEntry`, frozen error objects      |
| **Accurate**        | SHA-256 payload integrity digests; monotonic duration measurement; hash chain integrity verification                                                                | §86, §82, §55a                       | `withPayloadIntegrity()`, `verifyHistoryChain()`        |
| **Complete**        | `failOnAuditError: true` blocks operations without audit records; `rejectOnMissingReason: true` blocks state changes without justification; hash chain detects gaps | §91, §92, §97                        | `failOnAuditError`, `rejectOnMissingReason`             |
| **Consistent**      | Dual hash chain (FNV-1a + SHA-256) with cross-chain verification; monotonic `sequenceNumber`; schema versioning with migration rules                                | §82, §83                             | `CrossChainVerificationResult`, `VersionedAuditEntry`   |
| **Enduring**        | 5-year minimum retention; self-contained archives with SHA-256 checksums; WAL crash recovery; `HttpAuditArchivalPort` for lifecycle management                      | §104, §104a, `HttpAuditArchivalPort` | `HttpAuditRetentionPolicy`, `HttpAuditArchivalPort`     |
| **Available**       | `QueryableHttpAuditTrailPort` with 12 filter fields; 4-hour inspector access SLA; transparent active/archive querying; MCP resource exposure                        | §105, §57                            | `QueryableHttpAuditTrailPort`, `HttpAuditQueryFilter`   |

---

## GAMP 5 Compliance

| GAMP 5 Area                  | Spec Coverage                                                               | Spec Sections |
| ---------------------------- | --------------------------------------------------------------------------- | ------------- |
| **Category Classification**  | Category 5 (Custom Applications) with supply chain classification table     | §108          |
| **V-Model Lifecycle**        | User requirements through PQ; IQ/OQ/PQ framework                            | §99, §108     |
| **Risk Assessment**          | 42-entry FMEA with S/L/D scoring; all mitigated to RPN <= 8                 | §98           |
| **Configuration Management** | SemVer-to-revalidation mapping; spec change control process                 | §116, §117    |
| **Training**                 | 5 roles with competency assessment criteria and refresh triggers            | §109          |
| **Supplier Assessment**      | Guard spec interface dependency inventory with 9 interfaces; version-locked | §118          |
| **Periodic Review**          | Annual review schedule; 6 revalidation triggers; 8-area review scope        | §83b          |

---

## WHO TRS 996 / MHRA DI Guidance

| Requirement Area            | Spec Coverage                                                              | Spec Sections                |
| --------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| **Data Integrity (ALCOA+)** | All 9 ALCOA+ principles addressed with specific implementations            | §91-§97, §104, §86, §93, §96 |
| **Validation Framework**    | IQ/OQ/PQ qualification with 735 specified tests                            | §99                          |
| **Traceability**            | 57-finding regulatory traceability matrix                                  | §100                         |
| **Audit Trail Retention**   | 5-year minimum retention; self-contained archives with integrity manifests | §104                         |
| **Audit Trail Access**      | `QueryableHttpAuditTrailPort` with 4-hour inspector access SLA             | §105                         |
| **Risk Management**         | 42-entry FMEA with ICH Q9 methodology                                      | §98                          |

---

## Combinator-to-Regulation Quick Lookup

| Combinator                   | Requirement Level                                      | Regulatory Drivers                             | Spec Section |
| ---------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ------------ |
| `requireHttps()`             | **REQUIRED**                                           | 21 CFR 11.30, EU GMP Annex 11 §12              | §85          |
| `withHttpAuditBridge()`      | **REQUIRED**                                           | 21 CFR 11.10(e), ALCOA+ Complete               | §97          |
| `withCredentialProtection()` | **REQUIRED**                                           | 21 CFR 11.300, OWASP                           | §87          |
| `withHttpGuard()`            | **REQUIRED**                                           | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 | §94          |
| `withPayloadIntegrity()`     | **REQUIRED** (Category 1) / RECOMMENDED (Category 2-3) | 21 CFR 11.10(c), ALCOA+ Accurate               | §86          |
| `withSubjectAttribution()`   | **REQUIRED**                                           | 21 CFR 11.10(d), ALCOA+ Attributable           | §93          |
| `withPayloadValidation()`    | RECOMMENDED                                            | 21 CFR 11.10(h)                                | §89          |
| `withTokenLifecycle()`       | RECOMMENDED                                            | 21 CFR 11.300, EU GMP Annex 11 §12             | §90          |
| `withAuthFailureAudit()`     | RECOMMENDED                                            | 21 CFR 11.10(e), 11.300                        | §95          |
| `withAuthenticationPolicy()` | CONDITIONAL                                            | 21 CFR 11.200, 11.300                          | §90          |
| `withElectronicSignature()`  | CONDITIONAL                                            | 21 CFR 11.50, 11.70, 11.100                    | §93a         |
| `withCorsHardening()`        | CONDITIONAL                                            | 21 CFR 11.30, EU GMP Annex 11 §12              | §112         |
| `rateLimit()`                | CONDITIONAL                                            | EU GMP Annex 11 §16                            | §113         |

---

## GxP Endpoint Data Classification (§84)

| Category       | Risk Level | Description                                                            | Examples                                                          | Mandatory Controls                                                                              |
| -------------- | ---------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Category 1** | Critical   | Patient safety data, batch release decisions, critical quality records | Batch release API, adverse event reporting, critical lab results  | `requireHttps()`, `withPayloadIntegrity()`, mTLS, certificate pinning, `failOnAuditError: true` |
| **Category 2** | High       | Regulatory compliance data, non-patient-safety GxP records             | Training records, equipment calibration, environmental monitoring | `requireHttps()`, certificate pinning RECOMMENDED, `failOnAuditError: true`                     |
| **Category 3** | Moderate   | Operational GxP data, supporting quality records                       | Document management, scheduling, non-critical notifications       | `requireHttps()`, standard audit trail                                                          |

> **Cross-reference:** Full classification scheme with criteria, escalation rules, and endpoint registry guidance in [18 - HTTP Transport Security §84](./18-http-transport-security.md#gxp-endpoint-data-classification).

---

## GxP Configuration Options Quick Lookup

| Option                        | Location                      | Default (GxP)              | Effect When Enabled                                                                        |
| ----------------------------- | ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| `gxp: true`                   | `HttpClientInspectorConfig`   | — (must be set explicitly) | Activates all GxP enforcement: fail-fast validation, SHA-256 mandate, REQUIRED combinators |
| `failOnAuditError: true`      | `withHttpAuditBridge()`       | `true`                     | Blocks operations when audit write fails                                                   |
| `rejectOnMissingReason: true` | `withHttpAuditBridge()`       | `true`                     | Rejects state-changing operations without reason for change                                |
| `maxDecisionAge`              | `withHttpAuditBridge()`       | 5000ms (required)          | Rejects stale authorization decisions                                                      |
| `requireTwoFactor: true`      | `ElectronicSignatureConfig`   | `true`                     | Requires 2FA for electronic signatures                                                     |
| `failureMode: "hard-fail"`    | `CertificateRevocationPolicy` | `"hard-fail"`              | Rejects connections when revocation check fails                                            |
| `checkRevocation: true`       | `CertificateValidationPolicy` | `true`                     | Enables OCSP/CRL certificate revocation checking                                           |
| `minTlsVersion: "1.2"`        | `TlsConfig`                   | `"1.2"`                    | Minimum TLS version for HTTPS connections                                                  |

---

## Port Inventory for GxP Deployments

| Port                            | Lifetime  | Required in GxP               | Spec Section          | Purpose                                |
| ------------------------------- | --------- | ----------------------------- | --------------------- | -------------------------------------- |
| `HttpClientPort`                | Scoped    | Yes                           | §26                   | Core HTTP client                       |
| `HttpAuditTrailPort`            | Singleton | Yes                           | §91                   | Audit entry recording with hash chains |
| `QueryableHttpAuditTrailPort`   | Singleton | Yes                           | §105                  | Audit trail query, retrieval, export   |
| `HttpAuditArchivalPort`         | Singleton | Yes                           | §104                  | Archive lifecycle management           |
| `HttpOperationGatePort`         | Scoped    | Yes                           | §94                   | RBAC policy evaluation                 |
| `HttpSignatureVerificationPort` | Singleton | Conditional (when e-sig used) | §107                  | Signature verification                 |
| `SubjectProviderPort`           | Scoped    | Yes (from guard)              | §93                   | Subject identity resolution            |
| `SignatureServicePort`          | Singleton | Conditional (when e-sig used) | §93a (from guard §65) | Signature capture delegation           |

---

## Incident Classification Quick Lookup

| Severity        | Response SLA                         | HTTP Transport Incident Types                                                                          |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **S1 Critical** | 1 hour response, 4 hour containment  | CREDENTIAL_EXPOSURE, AUDIT_CHAIN_BREAK, AUDIT_ENTRY_LOSS, CERTIFICATE_COMPROMISE                       |
| **S2 Major**    | 4 hour response, 24 hour remediation | TLS_DOWNGRADE, SIGNATURE_VERIFICATION_FAILURE, SIGNER_REVOCATION, SEPARATION_OF_DUTIES_BYPASS          |
| **S3 Moderate** | 24 hour response, 5 day remediation  | REVOCATION_CHECK_DEGRADED, AUDIT_CONFIRMATION_DELAY, TOKEN_LIFECYCLE_CIRCUIT_OPEN, CONFIGURATION_DRIFT |
| **S4 Minor**    | 5 day response                       | PIN_ROTATION_OVERDUE, PAYLOAD_VALIDATION_WARNING, CLOCK_SKEW_WARNING, CORS_BLOCK                       |

---

## Test Count Summary

### By Source (authoritative — matches DoD tables and README)

| Source                     | Unit    | Type-Level | Integration | E2E    | Chaos/Load/Soak | Total   |
| -------------------------- | ------- | ---------- | ----------- | ------ | --------------- | ------- |
| Core spec (§1-78)          | 226     | 12         | 12          | 20     | —               | 270     |
| GxP transport (DoDs 20-27) | 282     | 63         | 102         | —      | —               | 447     |
| Chaos/Load/Soak (§16)      | —       | —          | —           | —      | 18              | 18      |
| **Total**                  | **508** | **75**     | **114**     | **20** | **18**          | **735** |

> **Note:** Core E2E expanded from 5 to 20 for GxP coverage (E2E-001–E2E-020). Chaos/Load/Soak = 10 chaos (CF-001–CF-010) + 5 load (LT-001–LT-005) + 3 soak (SK-001–SK-003) = 18. Grand total: **270 (core) + 447 (GxP) + 18 (chaos/load/soak) = 735 tests**.

### GxP Transport Breakdown (by DoD)

| DoD Item                      | Unit    | Type   | Integration | Total   |
| ----------------------------- | ------- | ------ | ----------- | ------- |
| 20: Transport Security        | 60      | 7      | 15          | 82      |
| 21: Audit Bridge              | 32      | 7      | 13          | 52      |
| 22: Attribution and RBAC      | 20      | 6      | 7           | 33      |
| 23: E-Sig Bridge, VP, PR      | 18      | 5      | 7           | 30      |
| 24: GxP Compliance Extensions | 54      | 16     | 22          | 92      |
| 25: Audit v4.0 Remediations   | 52      | 10     | 18          | 80      |
| 26: Audit v5.0 Remediations   | 28      | 8      | 12          | 48      |
| 27: GxP Compliance Hardening  | 18      | 4      | 8           | 30      |
| **GxP Subtotal**              | **282** | **63** | **102**     | **447** |

> **Cross-reference:** The per-DoD breakdown above matches the authoritative table in [22 - GxP Compliance Audit v5.0 (DoD 20-27 summary)](./22-gxp-compliance-audit-v5.md#updated-test-count-summary-dod-20-27). Adversarial OQ test cases (OQ-HT-ADV-01 through OQ-HT-ADV-05) are counted within DoD 20. OQ checks OQ-HT-01 through OQ-HT-83 are distributed across the DoD items based on their spec section coverage.

---

_Previous: [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md)_
