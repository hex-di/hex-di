# 20 - HTTP Transport Validation

_Previous: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md) | Next: [21 - GxP Compliance Extensions](./21-gxp-compliance-extensions.md)_

---

This document provides the validation framework for HTTP transport security controls defined in sections 84-97. It includes Failure Mode and Effects Analysis (FMEA), Installation/Operational/Performance Qualification (IQ/OQ/PQ), regulatory traceability, compliance verification, Definition of Done for new DoD items (20-22), and combinator composition guidance.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 98. HTTP Transport FMEA

| Field                   | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| **Document**            | HTTP Transport FMEA                                            |
| **Specification**       | SPEC-HTTP-001 v0.1.0                                           |
| **Initial Review Date** | 2026-02-15                                                     |
| **Last Review Date**    | 2026-02-15                                                     |
| **Reviewed By**         | L. Hoffmann (P-03), QA Reviewer; D. Moreau (P-01), System Owner |
| **Next Review Due**     | 2027-02-15 (annual per EU GMP Annex 11 §11, or upon triggering event per §83b) |
| **Placeholder Tracking**| All FMEA header fields populated during initial review (2026-02-15). Verified before IQ-to-OQ progression per §99 and the Validation Plan (§25 VP Section 6). |

This section defines the FMEA for failure modes specific to HTTP transport security controls.

### Scoring Methodology

Uses the following scoring methodology per ICH Q9 (Quality Risk Management) and GAMP 5 Appendix O2:

| Factor                | Scale | Description                                                                                        |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| **Severity (S)**      | 1-5   | 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Critical (patient safety / data integrity) |
| **Likelihood (L)**    | 1-5   | 1 = Remote, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Frequent                                   |
| **Detectability (D)** | 1-5   | 1 = Immediate/automatic, 2 = Easy, 3 = Moderate, 4 = Difficult, 5 = Undetectable                   |

**Risk Priority Number (RPN)** = S x L x D. Maximum = 125.

```
REQUIREMENT: All failure modes with RPN >= 15 MUST have mitigations that bring
             the residual RPN to <= 10. Failure modes with Critical severity
             (S=5) MUST additionally demonstrate that no single control failure
             can restore the pre-mitigation RPN.
```

### Failure Mode Table

| ID       | Component                     | Failure Mode                                                                                           | S   | L   | D   | RPN | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Residual S | Residual L | Residual D | Mitigated RPN |
| -------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ | --- | --- | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ---------- | ------------- |
| FM-HT-01 | HTTPS Enforcement             | GxP data sent over plain HTTP (no TLS)                                                                 | 5   | 2   | 1   | 10  | `requireHttps()` rejects non-HTTPS URLs before request reaches transport adapter (§85); URL scheme check is first operation in combinator                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 5          | 1          | 1          | 5             |
| FM-HT-02 | TLS Version                   | Connection negotiated at TLS 1.0/1.1 (deprecated, known vulnerabilities)                               | 5   | 2   | 2   | 20  | `requireHttps({ minTlsVersion })` validates negotiated TLS version from transport adapter metadata (§85); transport adapter rejects weak TLS                                                                                                                                                                                                                                                                                                                                                                                                                                                | 5          | 1          | 1          | 5             |
| FM-HT-03 | Certificate Validation        | Server certificate not validated — MITM attack possible                                                | 5   | 2   | 2   | 20  | `CertificateValidationPolicy.verifyCertificateChain: true` (§85); transport adapter performs certificate chain verification; certificate errors produce `HttpRequestError`                                                                                                                                                                                                                                                                                                                                                                                                                 | 5          | 1          | 1          | 5             |
| FM-HT-04 | Payload Integrity             | Request body tampered in transit — GxP data corrupted                                                  | 5   | 1   | 3   | 15  | `withPayloadIntegrity()` computes SHA-256 digest of request body (§86); digest header enables server-side verification; audit entry records digest for post-hoc verification                                                                                                                                                                                                                                                                                                                                                                                                              | 5          | 1          | 1          | 5             |
| FM-HT-05 | Payload Integrity             | Response body tampered in transit — corrupted data accepted as valid                                   | 5   | 1   | 2   | 10  | `withPayloadIntegrity({ verifyResponses: true })` verifies response digest (§86); mismatch produces `HttpResponseError` and blocks data acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                        | 5          | 1          | 1          | 5             |
| FM-HT-06 | Credential Protection         | Authentication credentials logged in error messages or audit trail                                     | 5   | 3   | 2   | 30  | `withCredentialProtection()` redacts credential-bearing headers and query params (§87); error sanitization removes credentials before caller sees them; redaction applied to audit entries                                                                                                                                                                                                                                                                                                                                                                                                | 5          | 1          | 1          | 5             |
| FM-HT-07 | Configuration Change          | HTTP client configuration changed without audit trail — no traceability                                | 4   | 2   | 3   | 24  | `HttpClientConfigurationAuditEntry` records all changes (§88); immutable client configuration prevents runtime mutation; new client instance required for changes                                                                                                                                                                                                                                                                                                                                                                                                                         | 4          | 1          | 1          | 4             |
| FM-HT-08 | Schema Validation             | Malformed payload sent to GxP API — data integrity violation                                           | 5   | 2   | 1   | 10  | `withPayloadValidation({ requestValidationMode: "reject" })` blocks invalid payloads (§89); JSON Schema validation catches structural errors before transmission                                                                                                                                                                                                                                                                                                                                                                                                                          | 5          | 1          | 1          | 5             |
| FM-HT-09 | Token Lifecycle               | Expired authentication token used for GxP operation                                                    | 4   | 3   | 1   | 12  | `withTokenLifecycle()` tracks token age and rejects expired tokens (§90); proactive refresh prevents expiration; circuit-breaker stops all requests on persistent refresh failure                                                                                                                                                                                                                                                                                                                                                                                                         | 4          | 1          | 1          | 4             |
| FM-HT-10 | Audit Bridge                  | HTTP operation executed without audit entry                                                            | 5   | 2   | 1   | 10  | `withHttpAuditBridge()` records entry for every operation (§97); `failOnAuditError: true` blocks response on audit write failure; completeness monitoring via HttpAuditTrailPort (§91)                                                                                                                                                                                                                                                                                                                                                                                                      | 5          | 1          | 1          | 5             |
| FM-HT-11 | User Attribution              | HTTP operation not attributable to a subject                                                           | 5   | 2   | 1   | 10  | `withSubjectAttribution()` resolves subject before each request (§93); rejects requests when subject cannot be resolved; evaluationId correlates to authorization decision                                                                                                                                                                                                                                                                                                                                                                                                                        | 5          | 1          | 1          | 5             |
| FM-HT-12 | Cross-Correlation             | Authorization decision and HTTP operation cannot be correlated — audit trail gap                       | 4   | 2   | 2   | 16  | `evaluationId` shared between authorization audit entry and `HttpOperationAuditEntry` (§97); bidirectional query patterns documented; stale authorization detection via `maxDecisionAge`                                                                                                                                                                                                                                                                                                                                                                                                         | 4          | 1          | 1          | 4             |
| FM-HT-13 | Clock Synchronization         | Shared ClockSource failure causes inconsistent timestamps across HTTP audit entries                    | 4   | 2   | 2   | 16  | Same `HttpClockSourcePort` (§96) instance shared across HTTP audit bridge; NTP monitoring REQUIRED when gxp: true; clock drift health check covers all HTTP timestamps                                                                                                                                                                                                                                                                                    | 4          | 1          | 2          | 8             |
| FM-HT-14 | Electronic Signature          | GxP record created/modified via HTTP without electronic signature — no intent verification             | 5   | 2   | 2   | 20  | `withElectronicSignature()` combinator (§93a) requires signature capture for state-changing operations; signature binding cryptographically links signature to request content; `captureSignature` callback delegates to `HttpSignatureServicePort` (§93a)                                                                                                                                                                                                                                                                                                                                     | 5          | 1          | 1          | 5             |
| FM-HT-15 | Electronic Signature          | Signer identity mismatch — signature applied by different user than authenticated subject              | 5   | 1   | 1   | 5   | `withElectronicSignature()` verifies signerId matches subjectId from `withSubjectAttribution()` (§93); mismatch produces `HttpRequestError` code `"SIGNER_MISMATCH"`                                                                                                                                                                                                                                                                                                                                                                                                                      | 5          | 1          | 1          | 5             |
| FM-HT-16 | Authentication Strength       | Single-factor authentication used for GxP operation requiring two-factor                               | 5   | 2   | 1   | 10  | `withAuthenticationPolicy()` enforces `minimumStrength` per `GxPAuthenticationPolicy` (§90); default `minimumStrength` in GxP mode is `"multi-factor"`; insufficient auth produces `"AUTH_STRENGTH_INSUFFICIENT"` rejection                                                                                                                                                                                                                                                                                                                                                               | 5          | 1          | 1          | 5             |
| FM-HT-17 | Separation of Duties          | Same subject performs conflicting roles on same GxP operation (e.g., data entry + approval)            | 5   | 2   | 2   | 20  | `HttpOperationPolicy.conflictingRoles` (§94) defines mutually exclusive role pairs; `withHttpGuard()` enforces separation before request execution; violation produces `"SEPARATION_OF_DUTIES_VIOLATION"` denial with audit entry                                                                                                                                                                                                                                                                                                                                                         | 5          | 1          | 1          | 5             |
| FM-HT-18 | Certificate Pinning           | CA compromise allows MITM with valid but unauthorized certificate                                      | 5   | 1   | 3   | 15  | `certificatePins` in `HttpTransportSecurityPolicy` (§85) validates SPKI digest against pinned certificates; pin failure produces `"CERTIFICATE_PIN_FAILED"` rejection; at least two pins (active + backup) recommended                                                                                                                                                                                                                                                                                                                                                                    | 5          | 1          | 1          | 5             |
| FM-HT-19 | Audit Persistence             | Audit entry accepted but not durably persisted — data loss on crash                                    | 5   | 2   | 3   | 30  | `HttpAuditTrailPort.confirm()` (§91) tracks durable persistence acknowledgment; `unconfirmedEntries()` enables health monitoring; entries unconfirmed > 30s trigger WARNING, > 5min trigger CRITICAL; WAL crash recovery via HttpWalStorePort (§91) provides backup                                                                                                                                                                                                                                                                                                                               | 5          | 1          | 1          | 5             |
| FM-HT-20 | Reason for Change             | GxP record modification via HTTP without documented reason — 21 CFR 11.10(e) violation                 | 4   | 3   | 2   | 24  | `HttpOperationAuditEntry.reason` field (§92) captures reason for change; `rejectOnMissingReason: true` (default in GxP mode) blocks state-changing operations without reason with `"MISSING_REASON_FOR_CHANGE"` error; rejection recorded in audit trail; override to `false` requires documented risk acceptance in Validation Plan (§83a) and produces WARNING + `HttpClientConfigurationAuditEntry` at construction time                                                                                                                                                               | 4          | 1          | 1          | 4             |
| FM-HT-21 | Operational Error             | GxP combinators applied in wrong order — security bypass                                               | 5   | 2   | 2   | 20  | Combinator ordering guidance (§103) with REQUIREMENT; factory function pattern recommended; ordering validated during OQ                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 5          | 1          | 1          | 5             |
| FM-HT-22 | Operational Error             | Required combinator omitted from pipeline — audit gap                                                  | 5   | 2   | 3   | 30  | GxP Combinator Validation Protocol (§81b): `createGxPHttpClient` factory reads `getCombinatorChain()` and throws `"MISSING_REQUIRED_GXP_COMBINATOR"` ConfigurationError for each missing REQUIRED combinator; inspector emits WARNING as defense-in-depth when factory not used; combinator composition documented in Validation Plan (§83a)                                                                                                                                                                                                                                              | 5          | 1          | 1          | 5             |
| FM-HT-23 | Operational Error             | GxP mode enabled without required port adapters — false compliance assurance                           | 4   | 2   | 3   | 24  | Cross-chain verification (§82) detects missing port adapters; Validation Plan (§83a) requires port adapter configuration documentation; periodic review (§83b) checks configuration drift                                                                                                                                                                                                                                                                                                                                                                                                            | 4          | 1          | 2          | 8             |
| FM-HT-24 | Audit Retention               | Audit entries deleted before regulatory retention period expires — data loss                           | 5   | 2   | 3   | 30  | `HttpAuditRetentionPolicy` enforces minimum 5-year retention (§104); entries are immutable during retention period; capacity monitoring at 70/85/95% thresholds triggers proactive archival                                                                                                                                                                                                                                                                                                                                                                                               | 5          | 1          | 1          | 5             |
| FM-HT-25 | Audit Archival                | Archived audit data not self-contained — cannot verify integrity without runtime system                | 5   | 2   | 3   | 30  | `HttpAuditArchiveManifest` includes hash chain metadata, entry count, SHA-256 checksum (§104); archive verification checks checksum, hash chain continuity, and entry count                                                                                                                                                                                                                                                                                                                                                                                                               | 5          | 1          | 1          | 5             |
| FM-HT-26 | Audit Query                   | Regulatory inspector cannot access HTTP audit data within required timeframe                           | 5   | 2   | 2   | 20  | `QueryableHttpAuditTrailPort` provides query, retrieval, and export (§105); 4-hour SLA for inspector access; transparent query across active and archived data                                                                                                                                                                                                                                                                                                                                                                                                                            | 5          | 1          | 1          | 5             |
| FM-HT-27 | Audit Query                   | Audit trail read operations not themselves audited — no traceability of who accessed audit data        | 4   | 3   | 3   | 36  | Meta-audit logging for all read operations on `QueryableHttpAuditTrailPort` (§105); each access records accessor identity, query parameters, result count, timestamp                                                                                                                                                                                                                                                                                                                                                                                                                      | 4          | 1          | 1          | 4             |
| FM-HT-28 | Certificate Revocation        | Revoked certificate accepted for GxP data transmission — compromised connection                        | 5   | 2   | 2   | 20  | `CertificateRevocationPolicy` with method priority (OCSP stapling > OCSP > CRL) (§106); revoked certificates ALWAYS rejected regardless of failureMode; revocation results recorded in audit entries                                                                                                                                                                                                                                                                                                                                                                                      | 5          | 1          | 1          | 5             |
| FM-HT-29 | Certificate Revocation        | OCSP/CRL infrastructure unavailable — revocation check cannot complete                                 | 4   | 3   | 2   | 24  | `failureMode: "hard-fail"` rejects connection when revocation check fails (§106); `failureMode: "soft-fail"` allows with WARNING and audit marker; cached OCSP/CRL responses provide grace period                                                                                                                                                                                                                                                                                                                                                                                         | 4          | 1          | 1          | 4             |
| FM-HT-30 | Signature Verification        | Previously captured electronic signature cannot be verified — compliance gap                           | 5   | 2   | 2   | 20  | `HttpSignatureVerificationPort` with three-property verification (§107): binding integrity, signer status, temporal validity; verification results recorded in audit trail                                                                                                                                                                                                                                                                                                                                                                                                                | 5          | 1          | 1          | 5             |
| FM-HT-31 | Signature Verification        | Signer identity revoked after signature capture — signed record validity in question                   | 5   | 2   | 3   | 30  | `checkSignerStatus()` detects revoked/suspended signers (§107); revoked signer failures recorded as critical security events; periodic re-verification recommended                                                                                                                                                                                                                                                                                                                                                                                                                        | 5          | 1          | 1          | 5             |
| FM-HT-32 | Signature Verification        | Timing side-channel attack leaks signature binding value                                               | 5   | 1   | 4   | 20  | `constantTimeComparison: true` default in `HttpSignatureVerificationConfig` (§107); timing-safe comparison prevents information leakage during binding verification                                                                                                                                                                                                                                                                                                                                                                                                                       | 5          | 1          | 1          | 5             |
| FM-HT-33 | Audit Backup/Restore          | Audit trail backup corrupted or incomplete — data loss on restore                                      | 5   | 2   | 2   | 20  | Backup integrity verification via HttpAuditArchiveManifest (§104a); mandatory checksum, hash chain, and entry count verification on restore; partial restores prohibited; restore operations recorded in independent audit chain                                                                                                                                                                                                                                                                                                                                                          | 5          | 1          | 1          | 5             |
| FM-HT-34 | Audit Migration               | Hash chain broken during cross-system migration — loss of audit continuity                             | 5   | 2   | 2   | 20  | Migration procedure (§104b) requires export via QueryableHttpAuditTrailPort, hash chain verification in target system, manifest comparison, and migration audit entries in both source and target; migration halts on verification failure                                                                                                                                                                                                                                                                                                                                                | 5          | 1          | 1          | 5             |
| FM-HT-35 | Adapter Switchover            | Transport adapter change breaks hash chain continuity                                                   | 4   | 2   | 2   | 16  | Adapter switchover requirements (§80a) mandate shared HttpAuditTrailPort instance; concurrent adapters require coordinated sequencing; switchover recorded as HttpClientConfigurationAuditEntry                                                                                                                                                                                                                                                                                                                                                                                           | 4          | 1          | 1          | 4             |
| FM-HT-36 | Privilege Escalation          | Subject gains elevated permissions mid-session without re-authentication                               | 5   | 2   | 3   | 30  | PrivilegeEscalationPolicy (§90) with periodic role re-check; "block-and-reauth" action for GxP; privilege changes recorded as AuthenticationFailureAuditEntry                                                                                                                                                                                                                                                                                                                                                                                                                             | 5          | 1          | 1          | 5             |
| FM-HT-37 | Incident Response             | HTTP transport security incident not classified or responded to within SLA                             | 4   | 2   | 3   | 24  | Incident Classification Framework (§83c) defines 16 incident types with severity levels and response SLAs; Critical incidents require 1-hour response; automated detection RECOMMENDED                                                                                                                                                                                                                                                                                                                                                                                                    | 4          | 1          | 1          | 4             |
| FM-HT-38 | Configuration Rollback        | Failed configuration change cannot be reverted — GxP operations disrupted                              | 4   | 2   | 3   | 24  | Rollback procedures (§88) mandate new client from previous config, rollback audit entry with "ROLLBACK" key, health check verification, and in-flight request draining; configuration history retains last 3 known-good configs                                                                                                                                                                                                                                                                                                                                                           | 4          | 1          | 1          | 4             |
| FM-HT-39 | CORS Misconfiguration         | Browser-based GxP app accepts cross-origin requests from unauthorized origins — data leakage           | 5   | 2   | 2   | 20  | `withCorsHardening()` (§112) validates server CORS responses against `CorsPolicy` with exact-match origins; wildcard origins rejected when credentials included; CORS-blocked operations recorded in audit trail                                                                                                                                                                                                                                                                                                                                                                          | 5          | 1          | 1          | 5             |
| FM-HT-40 | Catastrophic Failure          | All GxP subsystems fail simultaneously (audit backend + WAL + crypto + clock) — data integrity unknown | 5   | 1   | 3   | 15  | Catastrophic failure recovery runbook (§115) defines recovery procedures for 6 failure scenarios (CF-01 through CF-06); all GxP operations blocked during failure; recovery produces audit entries documenting outage and recovery; annual rehearsal REQUIRED                                                                                                                                                                                                                                                                                                                                                   | 5          | 1          | 1          | 5             |
| FM-HT-41 | Port Adapter Incompatibility  | Required GxP port adapter missing or incompatible — GxP features malfunction silently                  | 5   | 2   | 3   | 30  | Port adapter dependency inventory (§118) documents required port interfaces; construction-time validation verifies adapter presence; IQ procedure verifies interface compatibility via type-level tests                                                                                                                                                                                                                                                                                                                                                                                               | 5          | 1          | 1          | 5             |
| FM-HT-42 | Biometric Authentication      | Biometric provider reports false positive confidence score — unauthorized subject authenticates        | 5   | 1   | 3   | 15  | Two-component requirement (§90): biometric MUST be paired with non-biometric identification component (e.g., identification code, password, PIN) per 21 CFR 11.200(a)(1)(ii); even if biometric falsely matches, the companion component independently authenticates the subject; periodic re-verification (§107) detects anomalous biometric patterns; `BiometricAuthenticationMetadata.confidenceScore` recorded in audit entries for post-hoc review; RECOMMENDED minimum confidence thresholds (0.95 fingerprint/iris, 0.90 facial, 0.85 behavioral) provide additional defense layer | 5          | 1          | 1          | 5             |
| FM-HT-43 | Encryption Key Lifecycle      | Encryption key rotation fails or decommissioned key still referenced — audit data inaccessible or unrecoverable | 5   | 2   | 3   | 30  | Key rotation via HttpAuditEncryptionPort (§104c) re-wraps active DEKs under new KEK version; decommissioning blocked when data still references key version; key ceremony procedures require Change Request (§116) and multi-custodian authorization; KMS access policies enforce role-based key management; all key lifecycle events produce audit entries | 5          | 1          | 1          | 5             |

### Risk Summary

| Risk Level | RPN Range | Count (Pre-Mitigation)                                                                                                                                                                                                                                                  | Count (Post-Mitigation) |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **High**   | >= 20     | 27 (FM-HT-02, FM-HT-03, FM-HT-06, FM-HT-07, FM-HT-14, FM-HT-17, FM-HT-19, FM-HT-20, FM-HT-21, FM-HT-22, FM-HT-23, FM-HT-24, FM-HT-25, FM-HT-26, FM-HT-27, FM-HT-28, FM-HT-29, FM-HT-30, FM-HT-31, FM-HT-32, FM-HT-33, FM-HT-34, FM-HT-36, FM-HT-37, FM-HT-38, FM-HT-41, FM-HT-43) | 0                       |
| **Medium** | 10-19     | 15 (FM-HT-01, FM-HT-04, FM-HT-05, FM-HT-08, FM-HT-09, FM-HT-10, FM-HT-11, FM-HT-12, FM-HT-13, FM-HT-16, FM-HT-18, FM-HT-35, FM-HT-39, FM-HT-40, FM-HT-42)                                                                                                               | 0                       |
| **Low**    | < 10      | 1 (FM-HT-15)                                                                                                                                                                                                                                                            | 43                      |

All 43 failure modes have been mitigated to RPN <= 8. The failure modes with pre-mitigation RPN >= 20 have all been reduced to residual RPN <= 8. FM-HT-27 (unaudited audit access) at the highest pre-mitigation RPN of 36 has been reduced to RPN 4 through meta-audit logging. FM-HT-19, FM-HT-22, FM-HT-24, FM-HT-25, FM-HT-31, FM-HT-36, FM-HT-41, and FM-HT-43 (tied at pre-mitigation RPN 30) have been reduced to RPN 5 each through their respective mitigation controls. FM-HT-40 (catastrophic failure) and FM-HT-42 (biometric false positive) at pre-mitigation RPN 15 have been reduced to RPN 5 through recovery procedures and the two-component identification requirement, respectively.

### FMEA-to-OQ Verification Cross-Reference

Per ICH Q9 Section 4, each FMEA mitigation MUST trace to at least one OQ test that verifies the mitigation is effective. This table provides the required cross-reference.

| FM-HT ID | Component | OQ Verification Tests | Chaos/E2E Coverage |
| -------- | --------- | --------------------- | ------------------ |
| FM-HT-01 | HTTPS Enforcement | OQ-HT-01, OQ-HT-02 | E2E-008 |
| FM-HT-02 | TLS Version | OQ-HT-03 | E2E-008 |
| FM-HT-03 | Certificate Validation | OQ-HT-04 | E2E-010 |
| FM-HT-04 | Payload Integrity (request) | OQ-HT-05 | E2E-008 |
| FM-HT-05 | Payload Integrity (response) | OQ-HT-06 | E2E-008 |
| FM-HT-06 | Credential Protection | OQ-HT-07, OQ-HT-08, OQ-HT-62, OQ-HT-86 | E2E-008 |
| FM-HT-07 | Configuration Change | OQ-HT-42 | E2E-021 |
| FM-HT-08 | Schema Validation | OQ-HT-09, OQ-HT-43, OQ-HT-44, OQ-HT-45 | E2E-016 |
| FM-HT-09 | Token Lifecycle | OQ-HT-10, OQ-HT-11, OQ-HT-84, OQ-HT-85 | E2E-012 |
| FM-HT-10 | Audit Bridge | OQ-HT-12 | CF-001, CF-002 |
| FM-HT-11 | User Attribution | OQ-HT-12 | CF-007 |
| FM-HT-12 | Cross-Correlation | OQ-HT-66, OQ-HT-67 | E2E-009 |
| FM-HT-13 | Clock Synchronization | OQ-HT-56 | CF-004, CF-005 |
| FM-HT-14 | Electronic Signature | OQ-HT-13, OQ-HT-14, OQ-HT-15 | E2E-014 |
| FM-HT-15 | Signer Identity Mismatch | OQ-HT-14 | E2E-014 |
| FM-HT-16 | Authentication Strength | OQ-HT-16, OQ-HT-17, OQ-HT-18 | E2E-022 |
| FM-HT-17 | Separation of Duties | OQ-HT-19 | E2E-022 |
| FM-HT-18 | Certificate Pinning | OQ-HT-20, OQ-HT-65 | E2E-010 |
| FM-HT-19 | Audit Persistence | OQ-HT-21, OQ-HT-54, OQ-HT-55, OQ-HT-91, OQ-HT-92 | E2E-011, CF-001, CF-002 |
| FM-HT-20 | Reason for Change | OQ-HT-22, OQ-HT-23, OQ-HT-70, OQ-HT-71, OQ-HT-72, OQ-HT-73 | E2E-021 |
| FM-HT-21 | Combinator Ordering | OQ-HT-79 | E2E-006 |
| FM-HT-22 | Missing Combinator | OQ-HT-57, OQ-HT-58, OQ-HT-59, OQ-HT-74, OQ-HT-76 | E2E-006 |
| FM-HT-23 | Missing Port Adapters | OQ-HT-63, OQ-HT-68 | -- |
| FM-HT-24 | Audit Retention | OQ-HT-24, OQ-HT-25 | SK-002 |
| FM-HT-25 | Audit Archival | OQ-HT-26, OQ-HT-27, OQ-HT-77, OQ-HT-81 | -- |
| FM-HT-26 | Audit Query Access | OQ-HT-28, OQ-HT-29, OQ-HT-30 | LT-002 |
| FM-HT-27 | Audit Query Traceability | OQ-HT-30, OQ-HT-93 | -- |
| FM-HT-28 | Certificate Revocation (revoked) | OQ-HT-32, OQ-HT-87, OQ-HT-88, OQ-HT-89, OQ-HT-90 | -- |
| FM-HT-29 | Certificate Revocation (infra down) | OQ-HT-31, OQ-HT-87, OQ-HT-88 | CF-008 |
| FM-HT-30 | Signature Verification | OQ-HT-33 | -- |
| FM-HT-31 | Revoked Signer | OQ-HT-34 | -- |
| FM-HT-32 | Timing Side-Channel | OQ-HT-33 | -- |
| FM-HT-33 | Backup Corruption | OQ-HT-35, OQ-HT-36 | -- |
| FM-HT-34 | Migration Chain Break | OQ-HT-37 | -- |
| FM-HT-35 | Adapter Switchover | OQ-HT-38 | -- |
| FM-HT-36 | Privilege Escalation | OQ-HT-39, OQ-HT-40 | -- |
| FM-HT-37 | Incident Response | OQ-HT-48 | CF-001 through CF-010 |
| FM-HT-38 | Configuration Rollback | OQ-HT-42 | E2E-021 |
| FM-HT-39 | CORS Misconfiguration | OQ-HT-64 | -- |
| FM-HT-40 | Catastrophic Failure | OQ-HT-54 | CF-010 |
| FM-HT-41 | Port Adapter Incompatibility | OQ-HT-68 | -- |
| FM-HT-42 | Biometric False Positive | OQ-HT-41, OQ-HT-69 | -- |
| FM-HT-43 | Encryption Key Lifecycle | OQ-HT-94, OQ-HT-95, OQ-HT-96 | CF-006 |

> **Single-Control-Failure Analysis (S=5):** All failure modes with Critical severity (S=5) employ multiple independent mitigations. For example: FM-HT-14 (missing e-signature) is mitigated by three controls (combinator enforcement, signature binding verification, `HttpSignatureServicePort` (§93a) delegation); FM-HT-19 (audit persistence gap) is mitigated by three controls (confirm() acknowledgment, unconfirmedEntries() monitoring, WAL crash recovery); FM-HT-22 (missing combinator) is mitigated by three controls (construction-time validation, Validation Plan documentation, periodic review); FM-HT-33 (backup corruption) is mitigated by three controls (manifest checksum verification, hash chain verification, entry count verification on restore); FM-HT-36 (privilege escalation) is mitigated by three controls (periodic role re-check, block-and-reauth action, privilege change audit recording); FM-HT-42 (biometric false positive) is mitigated by three controls (two-component identification requirement per 21 CFR 11.200, confidence score recording in audit entries, periodic re-verification of biometric patterns).

```
REQUIREMENT: Each mitigation listed in the FMEA table MUST have at least one
             corresponding test case in the OQ checklist (section 99) that verifies
             the mitigation is effective.
             Reference: ICH Q9 Section 4 (Risk Control).
```

```
REQUIREMENT: The HTTP transport FMEA MUST be reviewed during each periodic review cycle.
             Updates that affect shared port adapters (e.g., HttpClockSourcePort,
             HttpAuditTrailPort) MUST be reflected in the FMEA.
             Reference: ICH Q9 Section 5 (Risk Review).
```

> **FMEA Cross-References:** The following HTTP transport failure modes depend on shared port adapter mitigations:
>
> - FM-HT-01 (HTTPS enforcement — GxP data sent over plain HTTP) and FM-HT-02 (TLS version — deprecated TLS negotiated) depend on audit trail integrity controls — the HttpAuditTrailPort (§91) ensures that transport-level enforcement decisions are recorded for post-hoc review.
> - FM-HT-06 (credential protection — credentials logged in errors or audit trail) depends on audit entry completeness — the `failOnAuditError: true` control and completeness monitoring detect missing HTTP context fields.
> - FM-HT-13 (clock synchronization — shared ClockSource failure causes inconsistent timestamps) depends on clock synchronization — the NTP monitoring requirement (REQUIRED when gxp: true) via HttpClockSourcePort (§96) covers all co-located HTTP gateway components.
>
> Organizations SHOULD review all port adapter configurations during periodic review to ensure that changes to shared controls are reflected in risk assessments. Reference: ICH Q9.

---

## 99. HTTP Transport IQ/OQ/PQ

This section defines the validation plan with HTTP transport-specific qualification checks.

### 99a. Installation Qualification (IQ)

| #        | Check                                          | Method                                                                                  | Pass Criteria                                                                                             |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| IQ-HT-01 | `@hex-di/http-client` package installed        | `npm ls @hex-di/http-client`                                                            | Package present at expected version                                                                       |
| IQ-HT-02 | TLS support available in runtime               | Node.js TLS module check                                                                | `tls.DEFAULT_MIN_VERSION` is `"TLSv1.2"` or higher                                                        |
| IQ-HT-03 | Crypto module available for digest computation | `crypto.createHash("sha256")`                                                           | Hash function returns valid output                                                                        |
| IQ-HT-04 | Traceability matrix header fields populated    | Verify §100 traceability matrix `Last Reviewed` date and `Reviewer` identity are filled | Both fields present; date in ISO 8601 format; reviewer name and role match Validation Plan §83a section 4 |
| IQ-HT-05 | All deferred specification fields populated    | Verify all fields marked "_To be completed_" in the specification have been populated   | All fields in the deferred field inventory (below) are populated with valid values; no placeholder text remains |
| IQ-HT-06 | Audit encryption port accessible (GxP only)    | Call `HttpAuditEncryptionPort.verifyKeyAccess()` for active key version; perform round-trip encrypt/decrypt with test data | `verifyKeyAccess()` returns true; round-trip produces identical plaintext; KMS provider responds within 5 seconds |
| IQ-HT-07 | NTP server connectivity verified (GxP only)    | Query configured NTP servers; verify ClockSource health check passes                     | Primary and fallback NTP servers reachable; measured drift < 1 second; NTP stratum level documented |

#### Deferred Field Inventory

The following specification fields contain placeholder values that MUST be populated during IQ before OQ begins. IQ-HT-05 verifies completion of this inventory.

| File | Field | Placeholder Value | Required Format |
| ---- | ----- | ----------------- | --------------- |
| §98 (FMEA header) | Initial Review Date | _To be completed during IQ_ | ISO 8601 date (YYYY-MM-DD) |
| §98 (FMEA header) | Last Review Date | _To be completed during periodic review_ | ISO 8601 date (YYYY-MM-DD) |
| §98 (FMEA header) | Reviewed By | _To be completed — QA Lead + System Owner signatures required_ | Name and role per Validation Plan §83a section 4 |
| §98 (FMEA header) | Next Review Due | _To be completed — annual or upon triggering event (§83b)_ | ISO 8601 date (YYYY-MM-DD) |
| §100/§24 (Traceability Matrix header) | Last Reviewed | _MUST be completed during IQ (§99a) before OQ begins_ | ISO 8601 date (YYYY-MM-DD) |
| §100/§24 (Traceability Matrix header) | Reviewer | _MUST be completed during IQ (§99a) before OQ begins_ | Name and role per Validation Plan §83a section 4 |
| README (Revision History) | QA Approval | — (dash placeholder) | Approver name, role, and ISO 8601 date per QA Deployment Gate |
| §25 VP (Document Approval) | Author, Technical Reviewer, QA Approver | _[Name]_, _[Title]_, _[Signature]_ | Name, title, and signature per Validation Plan approval workflow |
| §25 VP Section 4 (Roles) | System Owner, QA Reviewer, Developer, Validator, Sys Admin | _[Name, title]_ | Named individuals per deployment |
| §25 VP Section 7 (Test Env) | Network Isolation, Test CA, Clock Source, Audit Sink, Test Subjects, Adapters | _[To be completed per deployment]_ | Deployment-specific configuration |
| §25 VP Section 11 (Review) | First Review Due, Review Owner | _[Date]_, _[Name, title]_ | ISO 8601 date, named individual |
| §25 VP Section 12 (Config) | Deployment Settings for all 13 configuration items | _[enabled/disabled]_ | Per-item deployment decision with justification |
| §25 VP Section 13 (IAM) | IAM System, SubjectProviderPort, Role Mapping, Token Refresh, Deprovisioning, DPIA | _[To be completed per deployment]_ | Deployment-specific IAM configuration |
| §96 (Clock Sync) | NTP server infrastructure | _[To be completed per deployment]_ | Primary NTP hostname, fallback NTP hostname, stratum level, polling interval |
| §25 VP Section 13 (IAM) IQ-IAM-01 | IAM System name, version, OIDC endpoint, certification | _[To be completed per deployment]_ | Named IAM system with verification evidence |
| §25 VP Section 13 (IAM) IQ-IAM-02 | SubjectProviderPort adapter mapping | _[To be completed per deployment]_ | Adapter class name with IdP attribute mapping |
| §25 VP Section 13 (IAM) IQ-IAM-03 | Role mapping from IdP to HttpOperationPolicy roles | _[To be completed per deployment]_ | Role-to-role mapping table |
| §25 VP Section 13 (IAM) IQ-IAM-04 | Token refresh configuration | _[To be completed per deployment]_ | Refresh endpoint, grant type, token lifetime |
| §25 VP Section 13 (IAM) IQ-IAM-05 | Deprovisioning SLA | _[To be completed per deployment]_ | Maximum propagation delay in minutes |
| §25 VP Section 13 (IAM) IQ-IAM-06 | DPIA status (EU deployments) | _[To be completed per deployment]_ | DPIA reference number or N/A for non-EU |
| §25 VP Section 14 (Data Sovereignty) | Storage locations, transfer mechanisms, legal basis | _[To be completed per deployment]_ | Per-jurisdiction configuration |

```
REQUIREMENT: IQ-HT-05 MUST verify that every field listed in the Deferred Field
             Inventory above has been populated with a valid value before IQ-to-OQ
             progression is permitted. Any remaining placeholder text ("To be
             completed", "MUST be completed", or "---" in QA Approval) MUST block
             progression. This check ensures that all regulatory evidence fields
             are populated at a known point in time by qualified personnel.
             Reference: EU GMP Annex 11 §4.3, GAMP 5 §D.8.
```

### 99b. Operational Qualification (OQ)

| #        | Check                                                                         | Method                                                                                                                                   | Pass Criteria                                                                                                                           |
| -------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-HT-01 | `requireHttps()` rejects HTTP URLs                                            | Unit test: `http://` URL → `Err`                                                                                                         | `HttpRequestError` with code `"HTTPS_REQUIRED"`                                                                                         |
| OQ-HT-02 | `requireHttps()` allows HTTPS URLs                                            | Unit test: `https://` URL → request proceeds                                                                                             | Transport adapter `execute` called exactly once with the original HTTPS URL; no `HttpRequestError` produced; response returned to caller |
| OQ-HT-03 | TLS version enforcement                                                       | Unit test: simulated TLS 1.1 response → rejection                                                                                        | `HttpRequestError` when TLS < `minTlsVersion`                                                                                           |
| OQ-HT-04 | Certificate chain validation                                                  | Unit test: invalid cert → rejection; expired cert; self-signed cert; hostname mismatch cert                                              | `HttpRequestError` with code `"CERTIFICATE_VALIDATION_FAILED"` for all invalid certificate types (expired, self-signed, hostname mismatch, incomplete chain); error includes diagnostic detail identifying the specific validation failure |
| OQ-HT-05 | `withPayloadIntegrity()` computes request digest                              | Unit test: POST with body → digest header present; GET with empty body → no digest header                                                | `Content-Digest` header matches computed SHA-256; empty body produces no `Content-Digest` header; pre-existing `Content-Digest` header is overwritten (not duplicated) |
| OQ-HT-06 | `withPayloadIntegrity()` verifies response digest                             | Unit test: tampered response → rejection                                                                                                 | `HttpResponseError` with code `"PAYLOAD_INTEGRITY_FAILED"`                                                                              |
| OQ-HT-07 | `withCredentialProtection()` redacts headers in errors                        | Unit test: 401 error → check error message; verify all credential-bearing headers (`Authorization`, `Cookie`, `Proxy-Authorization`) redacted | No credential values in error message; all configured credential headers redacted to `[REDACTED]`; non-credential headers preserved intact in error message |
| OQ-HT-08 | `withCredentialProtection()` redacts query params                             | Unit test: URL with `?token=secret` → audit entry; URL with multiple credential params; URL with non-credential params                   | Audit entry URL contains `?token=[REDACTED]`; all configured credential query params redacted; non-credential query params preserved intact; URL path and host unchanged |
| OQ-HT-09 | `withPayloadValidation()` rejects invalid request body                        | Unit test: invalid JSON vs schema → rejection                                                                                            | `HttpRequestError` with code `"PAYLOAD_VALIDATION_FAILED"`                                                                              |
| OQ-HT-10 | `withTokenLifecycle()` rejects expired tokens                                 | Unit test: token age > maxAge → rejection                                                                                                | `HttpRequestError` with code `"TOKEN_EXPIRED"`                                                                                          |
| OQ-HT-11 | `withTokenLifecycle()` circuit-breaker opens after failures                   | Unit test: consecutive refresh failures → circuit open                                                                                   | `HttpRequestError` with code `"TOKEN_LIFECYCLE_CIRCUIT_OPEN"`                                                                           |
| OQ-HT-12 | `withHttpAuditBridge()` records entry for every operation                     | Integration test: N requests → audit entry count; verify entry count == N; inject audit write failure → verify operation blocked          | Entry count equals request count exactly (N entries for N requests); each entry has unique `requestId`; when `failOnAuditError: true` and audit write fails, operation returns `Err` and no HTTP request is sent |
| OQ-HT-13 | `withElectronicSignature()` captures signature for state-changing operations  | Unit test: POST to signable URL → signature captured; GET to same URL → no signature required                                            | `HttpElectronicSignature` bound to audit entry with valid `signatureBinding`; GET requests bypass signature capture; signature capture failure produces `ElectronicSignatureError` and blocks the request |
| OQ-HT-14 | `withElectronicSignature()` rejects signer mismatch                           | Unit test: signerId ≠ subjectId → rejection                                                                                              | `HttpRequestError` with code `"SIGNER_MISMATCH"`                                                                                        |
| OQ-HT-15 | `withElectronicSignature()` enforces two-factor when required                 | Unit test: single-factor signature with `requireTwoFactor: true` → rejection                                                             | `HttpRequestError` with code `"TWO_FACTOR_REQUIRED"`                                                                                    |
| OQ-HT-16 | `withAuthenticationPolicy()` rejects insufficient auth strength               | Unit test: single-factor auth with `minimumStrength: "multi-factor"` → rejection                                                         | `HttpRequestError` with code `"AUTH_STRENGTH_INSUFFICIENT"`                                                                             |
| OQ-HT-17 | `withAuthenticationPolicy()` enforces session timeout                         | Unit test: session age > maxSessionAge → rejection                                                                                       | `HttpRequestError` with code `"SESSION_EXPIRED"`                                                                                        |
| OQ-HT-18 | `withAuthenticationPolicy()` enforces inactivity timeout                      | Unit test: inactivity > inactivityTimeout → rejection                                                                                    | `HttpRequestError` with code `"INACTIVITY_TIMEOUT"`                                                                                     |
| OQ-HT-19 | `withHttpGuard()` enforces separation of duties                               | Unit test: subject holds both conflicting roles → denial                                                                                 | `HttpRequestError` with code `"SEPARATION_OF_DUTIES_VIOLATION"`                                                                         |
| OQ-HT-20 | Certificate pin verification                                                  | Unit test: SPKI digest mismatch → rejection                                                                                              | `HttpRequestError` with code `"CERTIFICATE_PIN_FAILED"`                                                                                 |
| OQ-HT-21 | `HttpAuditTrailPort.confirm()` tracks persistence                             | Unit test: record then confirm → entry removed from unconfirmed; confirm unknown sequence; double-confirm                                | `unconfirmedEntries()` returns empty after confirm; confirm with unknown sequence returns `Err` code `"SEQUENCE_NOT_FOUND"`; double-confirm returns `Err` code `"ALREADY_CONFIRMED"` without data corruption |
| OQ-HT-22 | `reason` field included in audit entries for state-changing operations        | Unit test: POST with reason → audit entry has reason; POST with empty string reason → treated as missing                                 | `HttpOperationAuditEntry.reason` populated and included in hash chain input; empty string `""` and whitespace-only reason treated as absent (triggers `rejectOnMissingReason` enforcement); hash chain verification detects if reason was retroactively removed |
| OQ-HT-23 | GxP mode warns on missing reason for state-changing operations                | Unit test: POST without reason in GxP mode → WARNING logged                                                                              | WARNING produced, request still proceeds                                                                                                |
| OQ-HT-24 | `HttpAuditRetentionPolicy` enforces minimum retention period                  | Unit test: attempt deletion within retention period → rejected                                                                           | Deletion blocked; entry retained                                                                                                        |
| OQ-HT-25 | Archive manifest integrity verification                                       | Unit test: tampered archive → verification fails                                                                                         | Archive checksum mismatch detected, partial data rejected                                                                               |
| OQ-HT-26 | Archive hash chain continuity                                                 | Unit test: archive with broken hash chain → verification fails; archive with valid chain → verification passes                           | `firstEntryHash`/`lastEntryHash` chain validation detects gap; gap detection reports the specific position where continuity breaks; valid archive chain passes verification without false positives |
| OQ-HT-27 | Capacity monitoring threshold events                                          | Unit test: simulate 60%, 70%, 85%, 95% capacity → verify correct events; verify no events below threshold                                | INFO at 70%, WARNING at 85%, CRITICAL at 95%; NO event produced at 60% (below first threshold); each threshold fires exactly once per crossing (no duplicate events on repeated checks at same level) |
| OQ-HT-28 | `QueryableHttpAuditTrailPort.query()` with AND-composed filters               | Integration test: insert entries matching various filter combinations → query with multi-field filter                                     | Only entries matching ALL filter fields returned; entries matching some but not all filters excluded; empty filter returns all entries; zero-result query returns empty array (not error) |
| OQ-HT-29 | `QueryableHttpAuditTrailPort.export()` produces complete archive              | Integration test: export with filter → manifest with checksum; export with zero-match filter                                             | All matching entries exported; manifest checksum verifiable; export with zero matches produces empty archive with valid manifest (entryCount: 0); interrupted export produces no partial output |
| OQ-HT-30 | Meta-audit logging for audit trail read operations                            | Unit test: query audit trail → meta-audit event recorded; query with zero results → meta-audit still recorded                            | Accessor identity, filter, result count, timestamp logged; meta-audit recorded even when query returns zero results; missing accessor identity blocks query with `Err` (no anonymous audit access) |
| OQ-HT-31 | `CertificateRevocationPolicy` hard-fail rejects on check failure              | Unit test: revocation check fails with hard-fail → connection rejected                                                                   | `HttpRequestError` with code `"REVOCATION_CHECK_FAILED"`                                                                                |
| OQ-HT-32 | Revoked certificate always rejected                                           | Unit test: certificate status "revoked" → connection rejected                                                                            | `HttpRequestError` with code `"CERTIFICATE_REVOKED"` regardless of failureMode                                                          |
| OQ-HT-33 | `HttpSignatureVerificationPort.verify()` three-property check                 | Unit test: valid signature → all three properties true                                                                                   | `bindingIntact`, `signerActive`, `temporallyValid` all true; `verified: true`                                                           |
| OQ-HT-34 | Revoked signer fails verification                                             | Unit test: signature from revoked signer → `signerActive: false`                                                                         | `verified: false`; critical security event in audit trail                                                                               |
| OQ-HT-35 | Backup integrity verification on restore                                      | Unit test: restore from backup with tampered checksum → reject                                                                           | Restore halted; CRITICAL alert produced; no partial data accepted                                                                       |
| OQ-HT-36 | Backup hash chain continuity on restore                                       | Unit test: restore from backup with broken hash chain → reject                                                                           | Restore halted; chain verification failure reported                                                                                     |
| OQ-HT-37 | Migration hash chain preservation                                             | Integration test: export → import to new system → verify chain; import with tampered manifest → rejection                                | Target system hash chain matches source; manifest comparison passes; tampered manifest halts migration with `HttpAuditMigrationError`; partial import prohibited (all-or-nothing) |
| OQ-HT-38 | Adapter switchover audit entry                                                | Unit test: switch adapter → HttpClientConfigurationAuditEntry produced                                                                   | Entry records `previousAdapterId`, `newAdapterId`, and switchover `sequenceNumber`; all three fields are non-empty; entry is included in the hash chain |
| OQ-HT-39 | Privilege escalation detection (block-and-reauth)                             | Unit test: subject role change mid-session with "block-and-reauth" → request blocked                                                     | `AuthenticationFailureAuditEntry` with `failureType: "privilege_change_detected"`                                                       |
| OQ-HT-40 | Privilege escalation detection (audit-only)                                   | Unit test: subject role change mid-session with "audit-only" → request allowed; audit write failure during audit-only → request blocked  | Audit entry records privilege change; request proceeds normally; when audit write fails with `failOnAuditError: true`, request is blocked even in audit-only mode (failOnAuditError takes precedence) |
| OQ-HT-41 | Biometric authentication metadata in audit entry                              | Unit test: biometric auth → HttpOperationAuditEntry includes BiometricAuthenticationMetadata; verify no raw data                          | `biometricType`, `confidenceScore`, `companionComponent` present and non-empty; raw biometric data (fingerprint template, iris scan, facial embedding) MUST NOT appear in audit entry; entry containing `rawBiometricData` field fails validation |
| OQ-HT-42 | Configuration rollback audit entry                                            | Unit test: rollback configuration → HttpClientConfigurationAuditEntry with "ROLLBACK" key                                                | Entry references failed `changeId` (non-empty); rollback `reason` field is non-empty and describes the failure; entry is included in the hash chain |
| OQ-HT-43 | XML payload validation with XSD                                               | Unit test: invalid XML payload against XSD → rejection                                                                                   | `HttpRequestError` with code `"PAYLOAD_VALIDATION_FAILED"` and XML-specific diagnostic                                                  |
| OQ-HT-44 | XML DTD disabled (XXE prevention)                                             | Unit test: XML with DTD declaration and `allowDtd: false` → rejected                                                                     | XML rejected before parsing DTD entities                                                                                                |
| OQ-HT-45 | Multipart validation with strict parts                                        | Unit test: multipart payload with unexpected part and `strictParts: true` → rejection                                                    | `HttpRequestError` with code `"PAYLOAD_VALIDATION_FAILED"` listing unexpected part name                                                 |
| OQ-HT-46 | mTLS requirement for Category 1 endpoints                                     | Unit test: Category 1 endpoint without client certificate → rejection                                                                    | `HttpRequestError` with code `"CLIENT_CERTIFICATE_REJECTED"`                                                                            |
| OQ-HT-47 | E-signature display format (block layout)                                     | Unit test: render HttpElectronicSignature in "block" layout; render with missing mandatory field                                         | All 5 mandatory fields present; binding truncated (not displayed in full) with expand option; missing mandatory field produces `SignatureDisplayError`; full binding value only shown after explicit expand action |
| OQ-HT-48 | Incident classification audit entry                                           | Unit test: Critical incident → HttpClientConfigurationAuditEntry with "INCIDENT" key                                                     | Entry recorded before containment; incident type and severity in reason field                                                           |
| OQ-HT-49 | HTTP/2 server push audit recording                                            | Integration test: server push response with audit bridge active → entry produced; push with audit failure → push rejected                | Pushed response has `HttpHistoryEntry` and `HttpOperationAuditEntry`; when `failOnAuditError: true` and audit write fails, pushed response is discarded (not delivered to caller) |
| OQ-HT-50 | HTTP/2 credential protection on decompressed headers                          | Unit test: HPACK-compressed credential header → redacted in error; verify redaction applies after decompression                           | Credential value not present in error message after HPACK decompression; redaction applied to the decompressed value (not the compressed bytes); non-credential headers preserved after decompression |
| OQ-HT-51 | Forward schema migration (v1 → v2)                                            | Unit test: v1 audit entry deserialized by v2 consumer → new fields default correctly; v1 entry with corrupted field → migration error    | New v2 fields receive documented default values; existing v1 fields preserved intact; field type mismatch (e.g., string where number expected) produces migration error rather than silent coercion |
| OQ-HT-52 | Backward schema compatibility (v2 → v1)                                       | Unit test: v2 audit entry processed by v1 consumer → unknown fields ignored                                                              | v1 consumer processes entry without error; unknown v2 fields silently discarded (no schema validation error for extra fields); all v1-known fields retain correct values from the v2 entry |
| OQ-HT-53 | Unknown schema version rejection                                              | Unit test: audit entry with unrecognized schema version → error returned                                                                 | `HttpRequestError` with code `"UNKNOWN_SCHEMA_VERSION"`; entry not silently misinterpreted                                              |
| OQ-HT-54 | WAL recovery after crash between record and flush                             | Integration test: simulate crash between WAL record and audit flush → recovery; simulate corrupted WAL → recovery failure                | Orphaned intents recovered on restart; zero audit entry loss; hash chain continuity preserved; corrupted WAL produces `WalRecoveryError` with diagnostic detail; partial recovery prohibited (all-or-nothing) |
| OQ-HT-55 | WAL scope prefix distinguishes HTTP entries                                   | Unit test: WAL recovery with mixed HTTP and other entries → correct partitioning                                                         | `"http:"` prefix correctly identifies HTTP audit entries; other entries unaffected by HTTP recovery; entries without `"http:"` prefix are not processed by HTTP recovery (no cross-contamination) |
| OQ-HT-56 | Clock drift threshold enforcement in GxP mode                                 | Unit test: clock drift > 1 second with `gxp: true` → operations paused                                                                   | `HttpRequestError` with code `"CLOCK_DRIFT_EXCEEDED"`; operations resume after drift resolves below threshold                           |
| OQ-HT-57 | SHA-256 mandate when `gxp: true` (no HttpAuditTrailPort)                      | Unit test: `gxp: true` without `HttpAuditTrailPort` registered → `ConfigurationError`                                                    | Error code `"GXP_AUDIT_INSUFFICIENT"`; message references SHA-256 requirement and 21 CFR Part 11                                        |
| OQ-HT-58 | Missing `requireHttps` combinator in GxP pipeline                             | Unit test: `createGxPHttpClient` without `requireHttps()` → `ConfigurationError`                                                         | Error code `"MISSING_REQUIRED_GXP_COMBINATOR"`; message identifies `requireHttps` and 21 CFR 11.30                                      |
| OQ-HT-59 | Missing `withCredentialProtection` combinator in GxP pipeline                 | Unit test: `createGxPHttpClient` without `withCredentialProtection()` → `ConfigurationError`                                             | Error code `"MISSING_REQUIRED_GXP_COMBINATOR"`; message identifies `withCredentialProtection` and 21 CFR 11.300                         |
| OQ-HT-60 | GxP mode rejects `mode: "off"` with error code                                | Unit test: `gxp: true` with `mode: "off"` → `ConfigurationError`                                                                         | Error code `"GXP_AUDIT_DISABLED"`; message instructs setting mode to `"full"` or `"lightweight"`                                        |
| OQ-HT-61 | Audit sink mode conflict error code                                           | Unit test: `mode: "off"` with `auditSink` provided → `ConfigurationError`                                                                | Error code `"AUDIT_SINK_MODE_CONFLICT"`; message identifies the conflict between mode and auditSink                                     |
| OQ-HT-62 | Body credential redaction enforced with 8 defaults in GxP                     | Unit test: `gxp: true` without explicit `bodyCredentialPatterns` → 8 defaults auto-applied                                               | Body containing `$.password`, `$.access_token`, etc. has values redacted in audit entries and error messages                            |
| OQ-HT-63 | WAL presence validated at construction in GxP                                 | Unit test: `gxp: true` without `WalStore` configured → `ConfigurationError`                                                              | Error message references WAL requirement; non-GxP mode without WAL succeeds                                                             |
| OQ-HT-64 | CORS hardening validated for browser-based GxP deployments                    | Integration test: browser context with GxP endpoints → CORS origin allowlist uses exact matching; blocked operations produce audit entry; wildcard origin test | CORS-blocked operation produces `HttpOperationAuditEntry` with `errorCode: "CORS_BLOCKED"`; wildcard origins (`*`) rejected for GxP endpoints with `ConfigurationError`; allowed origins pass without audit error entry |
| OQ-HT-65 | Certificate pinning REQUIRED for Category 1 endpoints                         | Unit test: `createGxPHttpClient` with Category 1 endpoint and empty `certificatePins` → `ConfigurationError`                             | Error code `"CERTIFICATE_PIN_REQUIRED_CAT1"`; message references Category 1 classification and RFC 7469                                 |
| OQ-HT-66 | `logicalOperationId` populated for retried operations in GxP mode             | Unit test: retried request in GxP mode → all retry audit entries share `logicalOperationId`                                              | All retry `HttpOperationAuditEntry` records share same `logicalOperationId` with distinct `requestId` values; no duplicate `requestId` across retries; missing `logicalOperationId` on any retry entry fails validation |
| OQ-HT-67 | Cross-chain verification executes during graceful shutdown in GxP mode        | Integration test: `gxp: true` with both FNV-1a and SHA-256 chains → graceful shutdown triggers cross-chain verification                  | `CrossChainVerificationResult` produced; discrepancies produce CRITICAL alert with detailed discrepancy report; successful verification also recorded in audit trail; verification failure does NOT prevent shutdown (advisory only) |
| OQ-HT-68 | Port adapter presence validated at construction in GxP mode                   | Unit test: `gxp: true` without required port adapters → `ConfigurationError`                                                             | Error code `"GXP_PORT_ADAPTER_MISSING"`; message identifies missing port adapter                                                      |
| OQ-HT-69 | Biometric false positive below confidence threshold recorded                  | Unit test: biometric auth with confidence 0.80 (below 0.95 threshold) → `AuthenticationFailureAuditEntry`                                | Audit entry with `failureType: "biometric_verification_failed"`; confidence score recorded                                              |
| OQ-HT-70 | `rejectOnMissingReason: true` blocks state-changing operations without reason | Unit test: POST without reason in GxP mode with `rejectOnMissingReason: true` → rejection                                                | `HttpRequestError` with code `"MISSING_REASON_FOR_CHANGE"`; rejection recorded in audit trail with outcome `"denied"`                   |
| OQ-HT-71 | `rejectOnMissingReason: true` allows read operations without reason           | Unit test: GET without reason in GxP mode with `rejectOnMissingReason: true` → request proceeds                                          | GET/HEAD/OPTIONS not affected by reason enforcement                                                                                     |
| OQ-HT-72 | `rejectOnMissingReason: false` override logs WARNING in GxP mode              | Unit test: POST without reason with `rejectOnMissingReason: false` and `gxp: true` → WARNING + proceed                                   | WARNING logged; request proceeds; `HttpClientConfigurationAuditEntry` records the override at construction time                         |
| OQ-HT-73 | `rejectOnMissingReason` defaults to `true` in GxP mode                        | Unit test: `gxp: true` without explicit `rejectOnMissingReason` → defaults to `true`                                                     | POST without reason rejected with `"MISSING_REASON_FOR_CHANGE"`                                                                         |
| OQ-HT-74 | Missing `withHttpGuard` combinator in GxP pipeline                            | Unit test: `createGxPHttpClient` without `withHttpGuard()` → `ConfigurationError`                                                        | Error code `"MISSING_REQUIRED_GXP_COMBINATOR"`; message identifies `withHttpGuard` and 21 CFR 11.10(d)                                  |
| OQ-HT-75 | `withHttpGuard()` default-deny in GxP mode                                    | Unit test: request to URL with no matching policy in GxP mode → denied                                                                   | `HttpRequestError` with code `"NO_MATCHING_POLICY"`; denial recorded in audit trail                                                     |
| OQ-HT-76 | `HttpAuditArchivalPort` construction-time validation                          | Unit test: `gxp: true` without `HttpAuditArchivalPort` registered → `ConfigurationError`                                                 | Error code `"GXP_ARCHIVAL_PORT_MISSING"`; message references archival lifecycle requirement                                             |
| OQ-HT-77 | `HttpAuditArchivalPort.archive()` atomic operation                            | Integration test: archive entries → verify manifest → confirm removed from active; inject archive write failure → verify rollback         | All archived entries removed from active; manifest checksum valid; hash chain intact; archive failure rolls back completely (entries remain in active storage); partial archive prohibited; manifest creation failure blocks entry removal from active |
| OQ-HT-78 | `HttpAuditArchivalPort.purge()` precondition enforcement                      | Unit test: purge with unexpired retention → rejection                                                                                    | `HttpAuditArchivalError` with code `"RETENTION_NOT_EXPIRED"`; no data deleted                                                           |
| OQ-HT-79 | `HttpAuditArchivalPort.purge()` requires QA approval                          | Unit test: purge without approval → rejection                                                                                            | `HttpAuditArchivalError` with code `"PURGE_DENIED"`                                                                                     |
| OQ-HT-80 | `HttpAuditArchivalPort.purge()` requires backup copy                          | Unit test: purge without backup verification → rejection                                                                                 | `HttpAuditArchivalError` with code `"BACKUP_COPY_REQUIRED"`                                                                             |
| OQ-HT-81 | `HttpAuditArchivalPort.verify()` three-level check                            | Unit test: verify archive with tampered checksum → verification fails; verify archive with valid checksum but broken chain → partial failure | `checksumValid: false`; `verified: false`; archive data not returned; valid checksum with broken chain reports `checksumValid: true`, `chainIntact: false`, `verified: false`; all three checks independent (one failure does not skip remaining checks) |
| OQ-HT-82 | E-sig capture timeout with `SignatureServicePort` unavailable                 | Unit test: `captureSignature` callback exceeds `signatureCaptureTimeout` → rejection                                                     | `ElectronicSignatureError` with code `"SIGNATURE_TIMEOUT"`; timeout recorded in audit trail                                             |
| OQ-HT-83 | E-sig capture timeout default in GxP mode                                     | Unit test: `gxp: true` without explicit `signatureCaptureTimeout` → defaults to 120000ms                                                 | Timeout triggers at 120s; no indefinite hang                                                                                            |
| OQ-HT-84 | `TokenRevocationPolicy` active revocation check via RFC 7662                  | Unit test: token introspection returns `active: false` → request rejected; introspection endpoint unreachable with `failOpen: false` → request rejected | `HttpRequestError` with code `"TOKEN_REVOKED"` for inactive token; `HttpRequestError` with code `"TOKEN_INTROSPECTION_FAILED"` when endpoint unreachable and `failOpen: false`; revocation check result recorded in audit entry |
| OQ-HT-85 | `TokenRevocationPolicy` cache behavior                                         | Unit test: introspection result cached → second request within `cacheTtlSeconds` skips introspection call; cache expired → introspection called again | Cached `active: true` result reused within TTL; expired cache triggers fresh introspection; cached `active: false` always triggers rejection without re-introspection |
| OQ-HT-86 | `redactCookieNames` granular cookie redaction                                 | Unit test: request with `Cookie: sessionId=abc; preference=dark` and `redactCookieNames: ["sessionId"]` → audit entry has `sessionId=[REDACTED]; preference=dark` | Named cookies redacted; non-named cookies preserved; empty `redactCookieNames` with `cookie` in `redactHeaders` → entire cookie header redacted |
| OQ-HT-87 | `CertificateRevocationPolicy.ocspStapleVerificationTimeout` enforcement       | Unit test: stapled OCSP response verification exceeds `ocspStapleVerificationTimeout` → treated as method failure; next method tried | Timeout at configured value (default 2000ms); OCSP stapling method marked as failed; fallback to next method in `methods` array |
| OQ-HT-88 | `CertificateRevocationPolicy.requireOcspStapling` enforcement                 | Unit test: server without stapled OCSP response and `requireOcspStapling: true` → treated as revocation check failure (subject to `failureMode`) | With `hard-fail`: `HttpRequestError` with code `"REVOCATION_CHECK_FAILED"` including "OCSP stapling required but not provided"; with `soft-fail`: WARNING logged, connection allowed with audit marker |
| OQ-HT-89 | `CertificateRevocationPolicy.crlDistributionPointOverrides` usage             | Unit test: certificate with embedded CDP URLs and non-empty `crlDistributionPointOverrides` → override URLs used instead of embedded CDPs | CRL fetched from override URL; embedded CDP URLs ignored; override URL failure falls through to next method in `methods` array |
| OQ-HT-90 | `CertificateRevocationPolicy.crossReferenceCT` integration                    | Unit test: revoked certificate still present in CT logs with `crossReferenceCT: true` → WARNING logged with CT/revocation discrepancy | WARNING includes certificate serial, CT log reference, and revocation status; discrepancy recorded in `HttpOperationAuditEntry` |
| OQ-HT-91 | Audit trail append-only enforcement (no update/delete)                         | Adversarial test: attempt to call any mutation method (update, delete, overwrite) on recorded audit entries → all mutations rejected | No method exists to modify or delete recorded entries; adapter implementations MUST NOT expose update/delete operations; hash chain verification detects any external tampering with stored entries |
| OQ-HT-92 | WAL scope prefix REQUIRED in GxP mode                                         | Unit test: `gxp: true` with WAL entries → all HTTP audit WAL entries use `"http:"` scope prefix; entries without prefix rejected by HTTP recovery | HTTP WAL entries use `"http:"` prefix; non-prefixed entries ignored by HTTP WAL recovery; authorization WAL entries unaffected |
| OQ-HT-93 | Meta-audit entry type validation                                              | Unit test: query audit trail → meta-audit entry contains `accessorId`, `queryFilter`, `resultCount`, `timestamp`, `operationType` | All five fields present and non-empty; `operationType` is one of `"query"`, `"getByRequestId"`, `"getByEvaluationId"`, `"count"`, `"export"`; meta-audit entry participates in independent hash chain |
| OQ-HT-94 | Encryption key rotation produces audit entry and re-wraps active DEKs          | Integration test: trigger scheduled key rotation via HttpAuditEncryptionPort → verify new KEK version active and existing DEKs re-wrapped | HttpClientConfigurationAuditEntry with configurationKey `"ENCRYPTION_KEY_ROTATED"` produced; new KEK version recorded; previously encrypted data still decryptable via re-wrapped DEKs; key material MUST NOT appear in audit entry; rotation completes within configured timeout |
| OQ-HT-95 | Encryption key decommissioning blocked when referenced data exists             | Unit test: attempt to decommission key version still referenced by active or archived audit data → rejection | Decommissioning rejected with `"KEY_STILL_REFERENCED"` error; no key material deleted; decommissioning succeeds only when all data encrypted with that key version has been deleted or migrated |
| OQ-HT-96 | Encryption key decommissioning produces audit entry when permitted             | Unit test: decommission key version with no remaining references → audit entry produced | HttpClientConfigurationAuditEntry with configurationKey `"ENCRYPTION_KEY_DECOMMISSIONED"` produced; key version identifier recorded; decommissioning is irreversible (re-activation MUST NOT be permitted) |

### 99b-clt. Chaos, Load, and Soak OQ Checklist

The following chaos, load, and soak tests are REQUIRED as part of OQ to verify system resilience and performance under adverse conditions. These tests cross-reference the FMEA-to-OQ table and the chaos/load/soak test definitions in §16.

| #           | Check                                                                                                 | Method                                                                | Pass Criteria                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OQ-HT-CF-01 | Audit backend intermittent failure: WAL absorbs 50% write failures                                    | Chaos test (CF-001): 100 operations with 50% audit backend failure   | Zero audit data loss; WAL entries recovered; hash chain intact post-recovery                          |
| OQ-HT-CF-02 | Audit backend total failure: operations blocked then recover                                          | Chaos test (CF-002): all writes fail → backend recovers → WAL drains | Operations blocked when failOnAuditError: true; WAL drains completely after backend recovery           |
| OQ-HT-CF-03 | Network partition: TCP drop mid-response with audit recording                                         | Chaos test (CF-003): TCP drop → timeout → audit entry                | Timeout fires; audit entry records the failure; no orphan connections                                  |
| OQ-HT-CF-04 | Clock jump forward: monotonic timing unaffected                                                       | Chaos test (CF-004): wall-clock jump +60s                            | durationMs computed from monotonic clock; no false drift detection                                     |
| OQ-HT-CF-05 | Clock jump backward: drift detection triggers GxP mode pause                                          | Chaos test (CF-005): wall-clock rewind                               | Operations paused with CLOCK_DRIFT_EXCEEDED; resume after drift resolves                               |
| OQ-HT-CF-06 | KMS unavailable: audit writes blocked until recovery                                                  | Chaos test (CF-006): encryption port fails                           | New audit writes blocked; writes resume after KMS recovery; no plaintext audit data persisted          |
| OQ-HT-CF-07 | Subject provider intermittent: attribution maintained through retries                                 | Chaos test (CF-007): 30% resolution failures                         | Retried operations succeed with correct attribution; no operations proceed without subject identity    |
| OQ-HT-CF-08 | Certificate revocation check timeout: hard-fail/soft-fail behavior                                    | Chaos test (CF-008): OCSP responder slow/unreachable                 | Hard-fail blocks connection; soft-fail allows with WARNING and audit marker                             |
| OQ-HT-CF-09 | Concurrent scope disposal: no audit entries lost                                                      | Chaos test (CF-009): 10 scopes disposing simultaneously              | All chains valid; zero entries lost; no deadlocks                                                      |
| OQ-HT-CF-10 | Memory pressure: emergency ceiling forced eviction                                                    | Chaos test (CF-010): buffer at emergency ceiling                     | Forced eviction emits sink-write-lost event; system does not crash; remaining entries intact            |
| OQ-HT-LT-01 | Throughput baseline: p99 latency under load                                                           | Load test (LT-001): 1000 req/s for 60s (mock adapter)               | p99 latency < 50ms                                                                                    |
| OQ-HT-LT-02 | Audit recording under load: zero entries dropped                                                      | Load test (LT-002): 500 req/s with GxP audit for 120s               | Zero audit entries dropped; all entries confirmed; hash chain intact                                   |
| OQ-HT-LT-03 | Hash chain integrity under high volume                                                                | Load test (LT-003): 10,000 entries → verifyHistoryChain()           | Chain verification returns true; no integrity failures                                                 |
| OQ-HT-LT-04 | Concurrent scopes: clean lifecycle under load                                                         | Load test (LT-004): 50 scopes, 100 req/scope                        | All scopes clean up; zero resource leaks                                                               |
| OQ-HT-LT-05 | Retry storm: limiter prevents exponential growth                                                      | Load test (LT-005): 100 concurrent failing requests                  | Retry limiter caps retry count; system stabilizes; no resource exhaustion                               |
| OQ-HT-SK-01 | Memory stability: no leaks over sustained operation                                                   | Soak test (SK-001): 10 req/s for 1 hour                             | RSS growth < 10MB over test duration                                                                   |
| OQ-HT-SK-02 | Audit trail rotation: archival triggered under sustained writes                                       | Soak test (SK-002): sustained writes for 1 hour                     | Archival triggered; hot storage bounded; retention policy enforced                                      |
| OQ-HT-SK-03 | Connection pool stability: no leaks over sustained operation                                          | Soak test (SK-003): 50 req/s for 1 hour                             | Connection pool size stable; no connection leaks; no file descriptor exhaustion                         |

```
REQUIREMENT: Chaos, load, and soak OQ checks (OQ-HT-CF-01 through OQ-HT-CF-10,
             OQ-HT-LT-01 through OQ-HT-LT-05, OQ-HT-SK-01 through OQ-HT-SK-03)
             MUST be executed as part of the OQ run. These tests verify FMEA
             mitigation effectiveness under adverse conditions (ICH Q9 Section 4)
             and demonstrate sustained performance (EU GMP Annex 11 §16). Load
             and soak tests MAY be deferred to PQ with documented QA justification
             if the test environment cannot sustain the required duration.
             Reference: ICH Q9 Section 4, EU GMP Annex 11 §13, §16.
```

### 99b-ext. Adversarial OQ Test Cases

The following adversarial test cases MUST be included in the OQ to verify defense against intentional manipulation:

| #            | Check                                       | Method                                                                                             | Pass Criteria                                                                                                                                                  |
| ------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-HT-ADV-01 | URL manipulation: `http://` in path segment | Unit test: `https://api.example.com/redirect?to=http://evil.com` → guard blocks redirect           | `requireHttps()` rejects redirect target                                                                                                                       |
| OQ-HT-ADV-02 | Header injection: newline in header value   | Unit test: header value containing `\r\n` → rejected                                               | Transport adapter or combinator rejects malformed header                                                                                                        |
| OQ-HT-ADV-03 | Unicode confusable hostname                 | Unit test: `https://аpi.example.com` (Cyrillic "а") vs `https://api.example.com`                   | Certificate validation detects hostname mismatch                                                                                                               |
| OQ-HT-ADV-04 | Oversized request body                      | Unit test: request body > configured limit → rejected before transmission                          | `withPayloadValidation()` or transport adapter rejects                                                                                                          |
| OQ-HT-ADV-05 | Response splitting detection                | Unit test: response with both `Content-Length` and `Transfer-Encoding: chunked` headers → rejected | Combinator or transport adapter rejects response with inconsistent `Content-Length` and `Transfer-Encoding` headers; `HttpResponseError` with diagnostic detail |

### 99c. Performance Qualification (PQ)

| #        | Check                                                   | Method                                                               | Pass Criteria                                                     |
| -------- | ------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| PQ-HT-01 | Payload integrity overhead                              | Benchmark: 1,000 requests with digest computation                    | < 5ms added latency per request (p99)                             |
| PQ-HT-02 | Audit bridge throughput                                 | Benchmark: sustained HTTP operations                                 | >= 50 audit entries/sec without backpressure                      |
| PQ-HT-03 | Credential redaction consistency                        | 10,000 error messages with varying credential patterns               | 100% redaction rate (zero credential leaks)                       |
| PQ-HT-04 | Concurrent connection stress                            | 100 concurrent HTTP operations with audit recording                  | Zero audit entries lost, no deadlocks, all hash chains valid      |
| PQ-HT-05 | Audit backend unavailability                            | HTTP operations while audit backend is down (failOnAuditError: true) | All operations return Err; no data sent without audit             |
| PQ-HT-06 | Token refresh under load                                | 50 concurrent requests during token expiration window                | All requests either use refreshed token or reject cleanly         |
| PQ-HT-07 | Electronic signature capture latency                    | 100 signature captures under normal load                             | < 100ms added latency per signature capture (p99)                 |
| PQ-HT-08 | Audit confirmation latency                              | 1,000 entries recorded then confirmed                                | All entries confirmed within 30s; zero unconfirmed after flush    |
| PQ-HT-09 | Separation of duties evaluation overhead                | 500 requests with conflicting role checks                            | < 2ms added latency per policy evaluation (p99)                   |
| PQ-HT-10 | Archive creation and verification throughput            | 10,000 entries archived → manifest created → verified                | Archive creation < 5s; verification < 2s; zero integrity failures |
| PQ-HT-11 | Audit query performance across active and archived data | Query spanning 30 days (15 active + 15 archived)                     | < 500ms for queries returning <= 1000 entries                     |
| PQ-HT-12 | Certificate revocation check latency                    | 500 HTTPS connections with OCSP stapling enabled                     | < 10ms added latency per connection (p99); zero false rejections  |
| PQ-HT-13 | Signature verification throughput                       | 100 batch verifications (10 signatures each)                         | < 50ms per signature verification (p99); zero false failures      |
| PQ-HT-14 | Audit query SLA: `query()` at 100K entries              | Benchmark: populate 100K entries → query() with multi-field filter   | < 5 seconds per §105 SLA; concurrent load of 10 simultaneous queries |
| PQ-HT-15 | Audit query SLA: `getByRequestId()` at 100K entries     | Benchmark: populate 100K entries → getByRequestId() indexed lookup   | < 500ms per §105 SLA; regardless of dataset size                     |
| PQ-HT-16 | Audit query SLA: `getByEvaluationId()` at 100K entries  | Benchmark: populate 100K entries → getByEvaluationId() lookup        | < 2 seconds per §105 SLA; indexed lookup                             |
| PQ-HT-17 | Audit query SLA: `count()` at 100K entries              | Benchmark: populate 100K entries → count() with filter               | < 3 seconds per §105 SLA                                             |
| PQ-HT-18 | Audit query SLA: `export()` at 10K and 100K entries     | Benchmark: export with 10K entries → export with 100K entries        | < 60s for 10K entries; < 300s for 100K entries per §105 SLA          |
| PQ-HT-19 | Archive-spanning query SLA                              | Benchmark: query spanning active + archived data (30 days)           | < 30 seconds for result sets <= 10K entries per §105 SLA             |
| PQ-HT-20 | Meta-audit chain performance under concurrent load       | Benchmark: 50 concurrent audit trail queries → meta-audit entries recorded for each | All 50 queries produce meta-audit entries; meta-audit chain intact (no gaps in sequenceNumber); < 10ms meta-audit overhead per query (p99); zero meta-audit entries lost under concurrent load |
| PQ-HT-21 | Hash chain periodic verification performance             | Benchmark: verifyAuditChain() on 100K entries                        | Verification completes within 60 seconds; memory usage < 100MB; verification result accurate (detects injected single-entry tamper) |

```
REQUIREMENT: The HTTP transport OQ checks (OQ-HT-01 through OQ-HT-96, OQ-HT-ADV-01
             through OQ-HT-ADV-05, and OQ-HT-CF-01 through OQ-HT-SK-03) MUST be
             executed as part of the standard OQ run. The validation
             programmatic runner MUST include these checks when the HTTP
             client integration is installed. Results MUST appear in the OQ report.
             Reference: GAMP 5 Category 5 testing requirements.
```

```
REQUIREMENT: IQ/OQ/PQ checks for HTTP transport MUST be automated and executable
             as part of the CI/CD pipeline. Manual-only qualification checks are
             not acceptable for GxP environments. The validation
             programmatic runner MUST support headless execution of all IQ/OQ/PQ
             checks with machine-readable output (JSON report format).
             Reference: GAMP 5, EU GMP Annex 11 §4.
```

```
RECOMMENDED: Organizations SHOULD implement supply chain integrity verification
             for the @hex-di/http-client package and its port adapter implementations. This includes:
             (1) npm provenance verification (--provenance flag on publish),
             (2) Software Bill of Materials (SBOM) generation in CycloneDX or
             SPDX format, and (3) lock file integrity verification (pnpm-lock.yaml
             hash check) during IQ. Critical and high severity security patches
             in transitive dependencies SHOULD trigger re-qualification.
             Reference: NIST SP 800-218 (SSDF), Executive Order 14028.
```

### PQ Threshold Remediation

When PQ checks fail to meet the specified thresholds, the following remediation procedures apply:

| PQ Check                      | Failure Threshold            | Remediation                                                                                                                             |
| ----------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PQ-HT-01 (latency)            | p99 > 5ms                    | Profile digest computation; consider streaming hash for large bodies; document accepted latency if architecture constrains optimization |
| PQ-HT-02 (throughput)         | < 50 entries/sec             | Review audit backend write performance; consider batching; increase connection pool size                                                |
| PQ-HT-03 (redaction)          | < 100%                       | Treat as Critical finding; halt deployment; review all redaction patterns for gaps                                                      |
| PQ-HT-04 (concurrency)        | Any entry loss               | Treat as Critical; review audit write serialization; verify WAL recovery                                                                |
| PQ-HT-05 (backend down)       | Any data sent                | Treat as Critical; verify failOnAuditError wiring; review error propagation path                                                        |
| PQ-HT-06 (token refresh)      | Unhandled errors             | Review token refresh concurrency; verify circuit-breaker triggers correctly                                                             |
| PQ-HT-07 (e-sig latency)      | p99 > 100ms                  | Profile captureSignature callback; review HttpSignatureServicePort (§93a) performance; consider caching recent signatures                    |
| PQ-HT-08 (confirm latency)    | Any unconfirmed > 30s        | Review audit backend flush frequency; increase batch size; verify network connectivity to backing store                                 |
| PQ-HT-09 (SoD overhead)       | p99 > 2ms                    | Optimize role lookup; cache subject role sets; review conflictingRoles cardinality                                                      |
| PQ-HT-10 (archive throughput) | Creation > 5s or verify > 2s | Profile hash chain computation; consider parallel checksum; review archive batch size                                                   |
| PQ-HT-11 (query latency)      | > 500ms for <= 1000 entries  | Index audit entries by timestamp and scopeId; optimize archive deserialization; consider query result caching                           |
| PQ-HT-12 (revocation latency) | p99 > 10ms                   | Increase OCSP cache TTL; verify OCSP stapling enabled on servers; pre-warm CRL cache                                                    |
| PQ-HT-13 (sig verification)   | p99 > 50ms                   | Profile binding computation; cache signer status results; optimize SHA-256 comparison                                                   |
| PQ-HT-14 (query SLA)          | > 5s for 100K entries        | Add database indexes on filter fields; optimize query planner; consider query result pagination                                          |
| PQ-HT-15 (getByRequestId SLA) | > 500ms                      | Verify requestId is indexed; consider caching recent lookups; profile database round-trip                                                |
| PQ-HT-16 (getByEvalId SLA)    | > 2s for 100K entries        | Add index on evaluationId; optimize join strategy; consider materialized view                                                            |
| PQ-HT-17 (count SLA)          | > 3s for 100K entries        | Use count estimate for large datasets; add covering indexes; consider approximate count                                                  |
| PQ-HT-18 (export SLA)         | > 60s for 10K / > 300s for 100K | Stream export to avoid memory pressure; optimize serialization; increase I/O parallelism                                            |
| PQ-HT-19 (archive-span SLA)   | > 30s for 10K entries        | Optimize archive index; consider pre-computed archive summaries; review archive deserialization                                           |
| PQ-HT-20 (meta-audit concurrency) | Any meta-audit entry loss or > 10ms overhead | Review meta-audit write serialization; verify independent chain lock granularity; consider batch meta-audit writes; profile chain append under contention |
| PQ-HT-21 (chain verification perf) | > 60s for 100K entries    | Implement streaming verification (constant memory); consider parallelized batch verification; optimize SHA-256 computation pipeline         |

```
REQUIREMENT: PQ failures with severity "Critical" (redaction gaps, audit entry loss,
             data sent without audit) MUST block deployment to GxP environments until
             remediated. The remediation MUST be documented, reviewed, and the PQ
             re-executed to verify the fix. Non-critical PQ failures MAY proceed
             with documented risk acceptance approved by QA.
             Reference: ICH Q9 Section 4 (Risk Control).
```

---

## 100. Regulatory Traceability Matrix

> **Standalone copy available:** For auditor access and independent version control, this traceability matrix is also available as a standalone document at [24 - Traceability Matrix](./24-traceability-matrix.md). That file is the authoritative copy.

This section maps GxP findings from the HTTP client compliance reviews to regulations, spec sections, DoD items, and test references. The authoritative and complete traceability matrix (62 findings, v8.0) is maintained in [24 - Regulatory Traceability Matrix](./24-traceability-matrix.md). This section contains the §100 cross-reference and REQUIREMENT block.

> **Traceability Matrix Version:** 8.0 | **Last Reviewed:** 2026-02-15 | **Reviewer:** L. Hoffmann (P-03), Regulatory Affairs Specialist, QA Reviewer as identified in VP-HTTP-001 Section 4 | **Next Review Date:** 2027-02-15 (12 months per EU GMP Annex 11 §11)

```
REQUIREMENT: The traceability matrix header fields (Last Reviewed date and Reviewer
             identity) MUST be populated during Installation Qualification (IQ) before
             Operational Qualification (OQ) begins. Incomplete header fields MUST block
             IQ-to-OQ progression. The Last Reviewed date MUST use ISO 8601 format
             (YYYY-MM-DD). The Reviewer MUST be the designated QA representative
             identified in the Validation Plan (§83a, section 4) and MUST include both
             name and role. These fields provide regulatory traceability evidence that
             the matrix was reviewed by a qualified individual at a known point in time.
             Reference: EU GMP Annex 11 §4.3, GAMP 5 §D.8.
```

### Critical Findings

| #   | Finding                                         | Regulation                           | Spec Section(s)                                          | DoD Item(s) | Test Reference                            |
| --- | ----------------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ----------- | ----------------------------------------- |
| 1   | No mandatory audit trail for HTTP operations    | 21 CFR 11.10(e), ALCOA+ Complete     | §92 (HttpOperationAuditEntry), §97 (withHttpAuditBridge) | DoD 21      | OQ-HT-12, HAB-001 through HAB-010         |
| 2   | No user attribution for HTTP operations         | 21 CFR 11.10(d), ALCOA+ Attributable | §93 (withSubjectAttribution), §97 (cross-correlation)    | DoD 22      | HAB-011 through HAB-018                   |
| 3   | No NTP time synchronization for HTTP timestamps | ALCOA+ Contemporaneous               | §96 (HttpClockSourcePort)  | DoD 21      | HAB-019 through HAB-022                   |
| 4   | No payload integrity verification               | 21 CFR 11.10(c), ALCOA+ Accurate     | §86 (withPayloadIntegrity)                               | DoD 20      | OQ-HT-05, OQ-HT-06, HT-010 through HT-015 |
| 5   | No HTTPS enforcement                            | 21 CFR 11.30, EU GMP Annex 11 §12    | §85 (requireHttps)                                       | DoD 20      | OQ-HT-01, OQ-HT-02, HT-001 through HT-005 |
| 6   | No response integrity verification              | EU GMP Annex 11 §7                   | §86 (withPayloadIntegrity, verifyResponses)              | DoD 20      | OQ-HT-06, HT-016 through HT-018           |
| 7   | No RBAC for HTTP endpoint access                | 21 CFR 11.10(d), 11.10(g)            | §94 (withHttpGuard, HttpOperationPolicy)                 | DoD 22      | HAB-023 through HAB-030                   |
| 8   | No change control for HTTP configuration        | EU GMP Annex 11 §10                  | §88 (HttpClientConfigurationAuditEntry)                  | DoD 20      | OQ-HT-42, E2E-021, HT-025 through HT-030  |

### Major Findings

| #   | Finding                                           | Regulation                           | Spec Section(s)                         | DoD Item(s) | Test Reference                            |
| --- | ------------------------------------------------- | ------------------------------------ | --------------------------------------- | ----------- | ----------------------------------------- |
| 9   | No default-deny posture for HTTP operations       | 21 CFR 11.10(d)                      | §94 (default-deny RECOMMENDED)          | DoD 22      | HAB-031 through HAB-033                   |
| 10  | No TLS version requirement                        | RFC 8996, NIST SP 800-52             | §85 (minTlsVersion)                     | DoD 20      | OQ-HT-03, HT-006 through HT-009           |
| 11  | No certificate validation                         | 21 CFR 11.10(d), EU GMP Annex 11 §12 | §85 (CertificateValidationPolicy)       | DoD 20      | OQ-HT-04, HT-019 through HT-022           |
| 12  | Credentials may be logged in errors               | 21 CFR 11.300                        | §87 (withCredentialProtection)          | DoD 20      | OQ-HT-07, OQ-HT-08, HT-031 through HT-038 |
| 13  | No RBAC for HTTP operations                       | 21 CFR 11.10(d)                      | §94 (HttpOperationGatePort)             | DoD 22      | HAB-023 through HAB-030                   |
| 14  | No session timeout or token expiration            | 21 CFR 11.300, EU GMP Annex 11 §12   | §90 (withTokenLifecycle)                | DoD 20      | OQ-HT-10, OQ-HT-11, HT-039 through HT-045 |
| 15  | No authentication failure audit                   | 21 CFR 11.10(e), 11.300              | §95 (withAuthFailureAudit)              | DoD 21      | HAB-034 through HAB-040                   |
| 16  | No schema validation for payloads                 | 21 CFR 11.10(h)                      | §89 (withPayloadValidation)             | DoD 20      | OQ-HT-09, HT-046 through HT-050           |
| 17  | No error message sanitization                     | OWASP, 21 CFR 11.300                 | §87 (sanitizeErrors)                    | DoD 20      | HT-051 through HT-055                     |
| 18  | No stale authorization detection                  | 21 CFR 11.10(d)                      | §97 (maxDecisionAge)                    | DoD 21      | HAB-041 through HAB-045                   |
| 19  | No configuration change audit                     | 21 CFR 11.10(e), EU GMP Annex 11 §10 | §88 (HttpClientConfigurationAuditEntry) | DoD 20      | OQ-HT-42, E2E-021, HT-025 through HT-030  |
| 20  | No cross-correlation between authorization and HTTP audit | ALCOA+ Attributable, Consistent      | §97 (HttpAuthorizationCorrelation)              | DoD 21      | HAB-046 through HAB-050                   |

### Findings from GxP Compliance Review (v2.0)

| #   | Finding                                            | Regulation                           | Spec Section(s)                                         | DoD Item(s) | Test Reference                                        |
| --- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- | ----------- | ----------------------------------------------------- |
| 21  | No electronic signature bridge for HTTP operations | 21 CFR 11.50, 11.70, 11.100, 11.200  | §93a (withElectronicSignature)                          | DoD 23      | OQ-HT-13, OQ-HT-14, OQ-HT-15, ESB-001 through ESB-015 |
| 22  | No Validation Plan reference                       | GAMP 5 §D.4, EU GMP Annex 11 §4      | §83a (Validation Plan Reference)                        | DoD 23      | VP-001 through VP-005                                 |
| 23  | No "reason for change" field in audit entries      | 21 CFR 11.10(e), EU GMP Annex 11 §9  | §92 (HttpOperationAuditEntry.reason)                    | DoD 21      | OQ-HT-22, OQ-HT-23, HAB-051 through HAB-055           |
| 24  | No two-factor authentication enforcement           | 21 CFR 11.200, 11.300                | §90 (GxPAuthenticationPolicy, withAuthenticationPolicy) | DoD 20      | OQ-HT-16, OQ-HT-17, OQ-HT-18, E2E-022, HT-056 through HT-065   |
| 25  | No separation of duties enforcement                | 21 CFR 11.10(g), EU GMP Annex 11 §12 | §94 (HttpOperationPolicy.conflictingRoles)              | DoD 22      | OQ-HT-19, E2E-022, HAB-056 through HAB-060            |
| 26  | No certificate pinning with SPKI digests           | RFC 7469, NIST SP 800-52r2           | §85 (certificatePins, CertificatePin)                   | DoD 20      | OQ-HT-20, HT-066 through HT-070                       |
| 27  | No audit entry durable persistence acknowledgment  | ALCOA+ Enduring, 21 CFR 11.10(e)     | §91 (HttpAuditTrailPort.confirm, unconfirmedEntries)    | DoD 21      | OQ-HT-21, OQ-HT-54, OQ-HT-55, HAB-061 through HAB-068 |
| 28  | No periodic review / revalidation requirements     | EU GMP Annex 11 §11                  | §83b (Periodic Review and Revalidation)                 | DoD 23      | PR-001 through PR-008                                 |

### Findings from GxP Compliance Gap Analysis (v3.0)

| #   | Finding                                                   | Regulation                                               | Spec Section(s)                                                               | DoD Item(s) | Test Reference                                                  |
| --- | --------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| 29  | No audit trail retention or archival strategy             | 21 CFR 211.180, EU GMP Annex 11 §7, §17, ALCOA+ Enduring | §104 (HttpAuditRetentionPolicy, HttpArchivalPolicy, HttpAuditArchiveManifest) | DoD 24      | OQ-HT-24, OQ-HT-25, OQ-HT-26, OQ-HT-27, RET-001 through RET-010 |
| 30  | No queryable audit trail access for regulatory inspectors | 21 CFR 11.10(b), EU GMP Annex 11 §9, §17, MHRA DI §6.14  | §105 (QueryableHttpAuditTrailPort, HttpAuditQueryFilter)                      | DoD 24      | OQ-HT-28, OQ-HT-29, OQ-HT-30, QRY-001 through QRY-012           |
| 31  | No certificate revocation checking protocol               | 21 CFR 11.30, EU GMP Annex 11 §12, NIST SP 800-52r2      | §106 (CertificateRevocationPolicy, CertificateRevocationResult)               | DoD 24      | OQ-HT-31, OQ-HT-32, REV-001 through REV-010                     |
| 32  | No electronic signature verification protocol             | 21 CFR 11.70, 11.100, 11.200, EU GMP Annex 11 §14        | §107 (HttpSignatureVerificationPort, HttpSignatureVerificationResult)         | DoD 24      | OQ-HT-33, OQ-HT-34, SIG-001 through SIG-014                     |

### Findings from GxP Compliance Audit v4.0

| #   | Finding                                                               | Regulation                                           | Spec Section(s)                                         | DoD Item(s) | Test Reference                              |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ----------- | ------------------------------------------- |
| 33  | No audit trail backup/restore procedures                              | EU GMP Annex 11 §7, 21 CFR 11.10(c), ALCOA+ Enduring | §104a (Backup and Restore Procedures)                   | DoD 25      | OQ-HT-35, OQ-HT-36, BKP-001 through BKP-008 |
| 34  | No audit trail cross-system migration specification                   | EU GMP Annex 11 §17, ALCOA+ Consistent               | §104b (Cross-System Migration)                          | DoD 25      | OQ-HT-37, MIG-001 through MIG-008           |
| 35  | No transport adapter switchover data integrity specification           | ALCOA+ Consistent, 21 CFR 11.10(e)                   | §80a (Transport Adapter Switchover Data Integrity)       | DoD 25      | OQ-HT-38, ASW-001 through ASW-006           |
| 36  | No electronic signature rendering/display format specification        | 21 CFR 11.50(a)                                      | §93b (Electronic Signature Display Format)              | DoD 25      | OQ-HT-47, SDF-001 through SDF-006           |
| 37  | No biometric identification component support                         | 21 CFR 11.200(a)(1)(ii)                              | §90 (BiometricAuthenticationMetadata)                   | DoD 25      | OQ-HT-41, BIO-001 through BIO-006           |
| 38  | No privilege escalation detection                                     | 21 CFR 11.10(d), EU GMP Annex 11 §12                 | §90 (PrivilegeEscalationPolicy)                         | DoD 25      | OQ-HT-39, OQ-HT-40, PED-001 through PED-008 |
| 39  | mTLS specified as RECOMMENDED, not REQUIRED for Category 1 endpoints  | 21 CFR 11.30                                         | §85 (mTLS REQUIREMENT for Category 1)                   | DoD 25      | OQ-HT-46, MTLS-001 through MTLS-004         |
| 40  | No XML payload validation                                             | 21 CFR 11.10(h)                                      | §89 (XmlPayloadValidationConfig)                        | DoD 25      | OQ-HT-43, OQ-HT-44, XPV-001 through XPV-006 |
| 41  | No multipart/form-data validation specification                       | 21 CFR 11.10(h)                                      | §89 (MultipartValidationConfig)                         | DoD 25      | OQ-HT-45, MPV-001 through MPV-006           |
| 42  | No HTTP/2 or HTTP/3 security considerations                           | General practice, NIST SP 800-52r2                   | §68b (HTTP/2 and HTTP/3 Security)                       | DoD 25      | OQ-HT-49, OQ-HT-50, H2S-001 through H2S-008 |
| 43  | DNSSEC out-of-scope with no mitigation guidance                       | 21 CFR 11.30, NIST SP 800-81-2                       | §84 (DNS Security Mitigation Guidance)                  | DoD 25      | DNS-001 through DNS-004                     |
| 44  | No configuration change rollback procedures                           | EU GMP Annex 11 §10, 21 CFR 11.10(c)                 | §88 (Configuration Change Rollback Procedures)          | DoD 25      | OQ-HT-42, E2E-021, RBK-001 through RBK-006  |
| 45  | Traceability matrix placeholder reviewer/date fields                  | EU GMP Annex 11 §4.3                                 | §100 (Traceability Matrix header)                       | N/A         | Documentation fix — no test required        |
| 46  | No HTTP-specific incident classification framework                    | EU GMP Annex 11 §13, ICH Q9 §4                       | §83c (HTTP Transport Incident Classification Framework) | DoD 25      | OQ-HT-48, ICF-001 through ICF-010           |
| 47  | Biometric false positive not addressed in FMEA                        | 21 CFR 11.200(a)(1)(ii), ICH Q9 §4                   | §98 (FM-HT-42), §90 (BiometricAuthenticationMetadata)   | DoD 25      | OQ-HT-69, BIO-001 through BIO-006           |
| 48  | Certificate pinning RECOMMENDED, not REQUIRED for Category 1          | RFC 7469, NIST SP 800-52r2, 21 CFR 11.30             | §85 (certificatePins REQUIREMENT for Category 1)        | DoD 25      | OQ-HT-65, HT-066 through HT-070             |
| 49  | Cross-chain verification RECOMMENDED, not REQUIRED in GxP mode        | EU GMP Annex 11 §7, ALCOA+ Consistent                | §82 (cross-chain verification REQUIREMENT)              | DoD 25      | OQ-HT-67, XCV-001 through XCV-004           |
| 50  | `logicalOperationId` RECOMMENDED, not REQUIRED for retried operations | 21 CFR 11.10(e), ALCOA+ Complete, Consistent         | §97 (logicalOperationId REQUIREMENT in GxP mode)        | DoD 25      | OQ-HT-66, RID-001 through RID-004           |
| 51  | No explicit port adapter dependency declaration for GxP mode          | GAMP 5, 21 CFR 11.10(a), EU GMP Annex 11 §4          | §79 (Port-Based Requirements)                      | DoD 25      | OQ-HT-68, GDR-001 through GDR-004           |
| 52  | CORS hardening RECOMMENDED, not REQUIRED for browser-based GxP        | 21 CFR 11.30, ALCOA+ Complete                        | §68a (CORS REQUIREMENT for browser-based GxP)           | DoD 25      | OQ-HT-64, COR-001 through COR-004           |

### Findings from GxP Compliance Hardening (v6.0)

| #   | Finding                                                      | Regulation                                     | Spec Section(s)                              | DoD Item(s) | Test Reference                                                                      |
| --- | ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| 53  | Reason-for-change enforcement was WARNING-only, not blocking | 21 CFR 11.10(e), EU GMP Annex 11 §9            | §92, §97 (`rejectOnMissingReason`)           | DoD 27      | OQ-HT-70, OQ-HT-71, OQ-HT-72, OQ-HT-73, E2E-021, RFR-001 through RFR-006            |
| 54  | `withHttpGuard()` CONDITIONAL, not REQUIRED in GxP mode      | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 | §81a, §81b, §94 (`withHttpGuard()` REQUIRED) | DoD 27      | OQ-HT-74, OQ-HT-75, DDG-001 through DDG-004                                         |
| 55  | No archival service port — archival lifecycle unformalized   | EU GMP Annex 11 §7, §17, 21 CFR 11.10(c)       | §104 (`HttpAuditArchivalPort`)               | DoD 27      | OQ-HT-76, OQ-HT-77, OQ-HT-78, OQ-HT-79, OQ-HT-80, OQ-HT-81, ARC-001 through ARC-010 |
| 56  | No electronic signature capture timeout semantics            | 21 CFR 11.100(a), EU GMP Annex 11 §14          | §93a (`signatureCaptureTimeout`)             | DoD 27      | OQ-HT-82, OQ-HT-83, SCT-001 through SCT-004                                         |
| 57  | No formal document control on specification                  | EU GMP Annex 11 §10, 21 CFR 11.10(j), 11.10(k) | README (Document Control section)            | N/A         | Documentation fix — verified during IQ                                              |
| 58  | 21 CFR 11.300(a)-(e) open system controls not explicitly traced | 21 CFR 11.300                                    | §93a (REQUIREMENT for 11.300(a)-(e) controls), §87, §90 | DoD 27      | OQ-HT-84, OQ-HT-85, OQ-HT-86, OQ-HT-59, OSC-001 through OSC-005                   |

### Findings from Numerical Harmonization and Gap Closure (v8.0)

| #   | Finding                                                                | Regulation                                            | Spec Section(s)                                         | DoD Item(s) | Test Reference                                                                      |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| 59  | No configuration drift detection between documented CS parameters and runtime values | EU GMP Annex 11 §11, GAMP 5 §D.6                     | §83b (Periodic Review — Configuration Drift Detection)  | DoD 25      | OQ-HT-42, CDT-001 through CDT-004                                                   |
| 60  | No formal CAPA procedures for recurring deviations                     | ICH Q10 §3.2, EU GMP Annex 11 §10, 21 CFR 11.10(j)   | §83d (CAPA Procedures for Recurring Deviations)         | N/A         | Documentation fix — process control reviewed during periodic review                  |
| 61  | Archive storage media degradation risk not assessed for 5+ year retention | EU GMP Annex 11 §7, §17, 21 CFR 211.180, ALCOA+ Enduring | §104d (Archive Media Integrity Risk Assessment)     | DoD 25      | OQ-HT-35, OQ-HT-36, AMI-001 through AMI-004                                         |
| 62  | Numerical inconsistencies across controlled documents (test counts, port counts, finding counts) | EU GMP Annex 11 §10, 21 CFR 11.10(j), GAMP 5 §D.8    | README, §16, §17, §20, §22, §23, §25                   | N/A         | Documentation fix — verified by cross-document consistency check during IQ            |

### Regulatory Framework Coverage

| Regulatory Framework    | Findings Addressed                                                                                                                                                                | Spec Sections                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **FDA 21 CFR Part 11**  | #1, #2, #4, #5, #7, #8, #12, #13, #14, #15, #17, #18, #19, #21, #23, #24, #25, #30, #31, #32, #33, #35, #36, #37, #38, #39, #40, #41, #44, #47, #48, #50, #51, #52, #53, #54, #56, #58, #60, #62 | §85-§97, §104a, §105, §106, §107, §80a, §83c, §83d, §88, §89, §90, §93a, §93b, §68a, §79, §81a, §81b, §82                      |
| **FDA 21 CFR Part 211** | #29, #33, #61                                                                                                                                                                     | §104, §104a, §104d                                                                                                       |
| **EU GMP Annex 11**     | #5, #6, #8, #10, #11, #14, #19, #22, #25, #28, #29, #30, #31, #32, #33, #34, #35, #38, #44, #45, #46, #49, #51, #53, #54, #55, #56, #57, #59, #60, #61, #62                        | §83a, §83b, §83c, §83d, §85, §86, §88, §89, §90, §93a, §94, §104, §104a, §104b, §104d, §105, §106, §107, §79, §81a, §81b, §82, README |
| **ALCOA+**              | #1, #2, #3, #4, #6, #20, #23, #27, #29, #30, #33, #34, #35, #49, #50, #52, #53, #61                                                                                               | §80a, §86, §91, §92, §93, §96, §97, §104, §104a, §104b, §104d, §105, §82, §68a                                           |
| **GAMP 5**              | All (validation framework); specifically #22, #51, #59, #62                                                                                                                       | §83a, §83b (periodic review, drift detection), §83d (CAPA), §99 (IQ/OQ/PQ), §108 (classification), §116 (change control), §117 (SemVer mapping) |
| **ICH Q9**              | All (risk framework); specifically #46, #47, #60                                                                                                                                  | §83c (incident classification), §83d (CAPA), §98 (FMEA, 43 failure modes), §104d (archive media risk)                    |
| **NIST/RFC**            | #10, #26, #31, #42, #43, #48                                                                                                                                                      | §68b, §84, §85, §106                                                                                                     |
| **MHRA DI Guidance**    | #29, #30                                                                                                                                                                          | §104, §105                                                                                                               |
| **WHO TRS 996 / 1033**  | All (validation framework, data integrity)                                                                                                                                        | §99 (IQ/OQ/PQ), §100 (traceability), §104 (retention)                                                                    |
| **PIC/S PI 041**        | All (data integrity management, ALCOA+ alignment)                                                                                                                                 | §80 (ALCOA+ mapping), §91-§97 (audit trail), §104 (retention), §105 (query/retrieval)                                    |
| **OWASP**               | #17, #40                                                                                                                                                                          | §87, §89                                                                                                                 |

> **Note:** OQ-HT-51 through OQ-HT-53 (schema versioning tests) cross-reference §83 (Audit Entry Schema Versioning Strategy) and verify that the versioning guarantees specified there hold under forward migration, backward compatibility, and unknown version scenarios. OQ-HT-56 (clock drift enforcement) cross-references §96 (HttpClockSourcePort). OQ-HT-64 through OQ-HT-69 address findings #47-#52 from the GxP compliance review (cross-chain verification, certificate pinning, logicalOperationId, port adapter dependency, CORS hardening, biometric false positive). OQ-HT-70 through OQ-HT-83 address findings #53-#57 from GxP Compliance Hardening v6.0 (rejectOnMissingReason enforcement, withHttpGuard REQUIRED + default-deny, HttpAuditArchivalPort lifecycle, signatureCaptureTimeout, document control). OQ-HT-84 through OQ-HT-93 address finding #58 and audit trail data integrity hardening from v7.0 (TokenRevocationPolicy active checks, redactCookieNames granular redaction, CertificateRevocationPolicy field verification, append-only enforcement, WAL scope prefix, meta-audit entry type validation). OQ-HT-94 through OQ-HT-96 address encryption key lifecycle validation from v8.0 (key rotation audit, decommissioning block when referenced, decommissioning audit when permitted).

```
REQUIREMENT: All 62 findings in the traceability matrix (findings #1-#52 from
             the initial GxP compliance reviews, findings #53-#57 from GxP
             Compliance Hardening v6.0, finding #58 from audit trail and data
             integrity review v7.0, and findings #59-#62 from numerical
             harmonization and gap closure review v8.0) MUST have verification
             evidence (test references and DoD items) before HTTP transport
             controls are deployed in a GxP environment. Any finding missing
             verification evidence MUST block deployment to a GxP environment
             until evidence is provided or a documented deviation is approved by QA.
             Reference: WHO TRS 996 Annex 5, WHO TRS 1033 Annex 4, GAMP 5.
```

---

## 101. Compliance Verification Checklist

This section provides the compliance verification checklist for HTTP transport-specific checks.

### HTTP Transport Security (§85-§86)

- [ ] `requireHttps()` combinator rejects all non-HTTPS URLs
- [ ] `requireHttps()` produces `HttpRequestError` with code `"HTTPS_REQUIRED"` for `http://` URLs
- [ ] TLS version enforcement rejects connections below `minTlsVersion`
- [ ] Certificate chain validation produces `HttpRequestError` on validation failure
- [ ] `withPayloadIntegrity()` computes digest for all request bodies (POST, PUT, PATCH)
- [ ] `withPayloadIntegrity()` skips digest for bodyless methods (GET, HEAD, OPTIONS)
- [ ] Response digest verification produces `HttpResponseError` on mismatch
- [ ] Digest header follows RFC 9530 format (`Content-Digest: sha-256=:base64hash:`)

### Credential Protection (§87)

- [ ] `withCredentialProtection()` redacts `authorization` header values in errors
- [ ] `withCredentialProtection()` redacts `cookie` and `set-cookie` header values
- [ ] `withCredentialProtection()` redacts custom credential headers from `redactHeaders`
- [ ] Query parameter values from `redactQueryParams` are replaced with `[REDACTED]`
- [ ] Error messages do not contain credential values after sanitization
- [ ] Audit entries do not contain credential values
- [ ] Actual outgoing requests still carry original credentials

### Configuration Change Control (§88)

- [ ] `HttpClientConfigurationAuditEntry` recorded for base URL changes
- [ ] `HttpClientConfigurationAuditEntry` recorded for TLS setting changes
- [ ] `HttpClientConfigurationAuditEntry` recorded for combinator composition changes
- [ ] Configuration is immutable after construction in GxP mode
- [ ] Previous value in audit entry is redacted when credential-bearing

### Payload Schema Validation (§89)

- [ ] `withPayloadValidation()` rejects invalid request bodies in `"reject"` mode
- [ ] `withPayloadValidation()` logs warning for invalid bodies in `"warn"` mode
- [ ] `PayloadSchema` definitions are JSON-serializable (no functions or RegExp)
- [ ] Validation errors include path, message, and keyword for each failure
- [ ] Schema validation results recorded in audit entries

### Token Lifecycle (§90)

- [ ] `withTokenLifecycle()` rejects requests with expired tokens when `rejectOnExpired: true`
- [ ] Proactive refresh triggers when token age approaches `maxAge - refreshBefore`
- [ ] Circuit-breaker opens after `maxRefreshFailures` consecutive failures
- [ ] Circuit-breaker recovers after cooldown period
- [ ] Token refresh events (success/failure) recorded in audit trail
- [ ] Token lifecycle does not interfere with electronic signature lifecycle (HttpSignatureServicePort, §93a)

### HTTP Audit Bridge (§92, §97)

- [ ] `HttpOperationAuditEntry` produced for every HTTP operation on GxP data
- [ ] Entry includes `evaluationId` matching authorization audit entry
- [ ] Entry includes `subjectId` matching authorization audit entry
- [ ] Entry includes `requestDigest` when `withPayloadIntegrity()` is active
- [ ] URL field is redacted per `CredentialRedactionPolicy`
- [ ] `failOnAuditError: true` blocks response on audit write failure
- [ ] HTTP audit hash chain is independent of authorization decision hash chain
- [ ] `maxDecisionAge` rejects stale authorizations

### User Attribution (§93)

- [ ] `withSubjectAttribution()` resolves subject from `HttpSubjectProviderPort` (§93)
- [ ] Subject resolution failure produces `HttpRequestError` code `"SUBJECT_RESOLUTION_FAILED"`
- [ ] System-initiated operations use documented system identity (not empty subjectId)
- [ ] Attribution consistency verifiable via evaluationId correlation

### RBAC (§94)

- [ ] `withHttpGuard()` evaluates policy before HTTP request
- [ ] Policy matching is deterministic (same input → same policy selected)
- [ ] Most specific policy wins (exact method over wildcard)
- [ ] Denied operations produce audit entry recording the denial
- [ ] `HttpOperationPolicy` is JSON-serializable

### Authentication Failure Audit (§95)

- [ ] `AuthenticationFailureAuditEntry` produced for all auth failure types
- [ ] Failure entries are sanitized per `CredentialRedactionPolicy`
- [ ] Failure entries include hash chain fields (integrityHash, previousHash)

### Electronic Signature Bridge (§93a)

- [ ] `withElectronicSignature()` captures signature for state-changing operations (POST, PUT, PATCH, DELETE)
- [ ] `withElectronicSignature()` skips signature for read operations (GET, HEAD, OPTIONS)
- [ ] Signer ID verified against authenticated subject ID — mismatch produces `"SIGNER_MISMATCH"`
- [ ] Two-factor requirement enforced when `requireTwoFactor: true` — violation produces `"TWO_FACTOR_REQUIRED"`
- [ ] Signature binding computed as SHA-256(signerId + "|" + signedAt + "|" + meaning + "|" + requestDigest)
- [ ] Signature events recorded in audit trail via `HttpAuditTrailPort`
- [ ] `SignedHttpOperationAuditEntry` includes full `HttpElectronicSignature`
- [ ] Combinator placed after `withSubjectAttribution()` and `withPayloadIntegrity()` but before `withHttpAuditBridge()`

### Authentication Strength Policy (§90)

- [ ] `withAuthenticationPolicy()` enforces `minimumStrength` — single-factor rejected when multi-factor required
- [ ] Session age check rejects operations when `authenticatedAt` + `maxSessionAge` exceeded
- [ ] Inactivity timeout rejects operations when no activity within `inactivityTimeout`
- [ ] Authentication method filtering rejects methods not in `acceptedMethods`
- [ ] Policy violations recorded as `AuthenticationFailureAuditEntry`
- [ ] Session timing uses same `HttpClockSourcePort` (§96) as other HTTP GxP components

### Separation of Duties (§94)

- [ ] `conflictingRoles` on `HttpOperationPolicy` defines mutually exclusive role pairs
- [ ] `withHttpGuard()` denies operations when subject holds both roles in a conflicting pair
- [ ] Denial produces `HttpRequestError` code `"SEPARATION_OF_DUTIES_VIOLATION"` with role details
- [ ] Separation of duties violations produce audit entries

### Certificate Pinning (§85)

- [ ] `certificatePins` validates SPKI digests against server certificate chain
- [ ] Pin failure produces `HttpRequestError` code `"CERTIFICATE_PIN_FAILED"` with hostname and expected labels
- [ ] Pin failures recorded as critical `HttpClientConfigurationAuditEntry`
- [ ] `cipherSuitePolicy: "gxp-restricted"` limits cipher suites to NIST SP 800-52r2 recommendations

### Audit Persistence Acknowledgment (§91)

- [ ] `HttpAuditTrailPort.confirm()` accepts sequence number for durable persistence acknowledgment
- [ ] `unconfirmedEntries()` returns entries recorded but not yet confirmed
- [ ] Entries unconfirmed > 30s trigger WARNING
- [ ] Entries unconfirmed > 5min trigger CRITICAL alert
- [ ] `confirm()` is idempotent — double-confirm returns `"ALREADY_CONFIRMED"` error

### Reason for Change (§92)

- [ ] `HttpOperationAuditEntry.reason` field populated for state-changing operations
- [ ] `reason` included in hash chain computation when non-empty
- [ ] GxP mode produces WARNING when reason is empty for POST/PUT/PATCH/DELETE
- [ ] `reasonProvider` callback in `withHttpAuditBridge()` options invoked for state-changing operations

### Validation Plan and Periodic Review (§83a, §83b)

- [ ] Validation Plan outline covers all 11 required sections
- [ ] Test Environment Specification documents network isolation, test CA, clock source, audit sink, test subjects
- [ ] Periodic review schedule defined (at minimum annual)
- [ ] Revalidation triggers documented for major/minor upgrades, regulatory changes, security incidents, infrastructure changes
- [ ] Periodic review scope includes configuration drift, IQ re-execution, OQ sampling, audit chain integrity, change history, incident review, dependency updates, FMEA currency

### Audit Trail Retention and Archival (§104)

- [ ] `HttpAuditRetentionPolicy` enforces minimum 5-year retention period
- [ ] Entries are immutable during retention period — deletion blocked
- [ ] URL pattern and method scoping applies correct retention per API endpoint
- [ ] `HttpArchivalPolicy` transitions entries to cold storage after configured days
- [ ] Archive bundles are self-contained with all hash chain metadata
- [ ] `HttpAuditArchiveManifest` includes entryCount, firstEntryHash, lastEntryHash, archiveChecksum
- [ ] Archive integrity verification checks checksum, hash chain continuity, and entry count
- [ ] Capacity monitoring emits INFO at 70%, WARNING at 85%, CRITICAL at 95%

### Audit Trail Query and Retrieval (§105)

- [ ] `QueryableHttpAuditTrailPort` provides `query()`, `getByRequestId()`, `getByEvaluationId()`, `count()`, `export()`
- [ ] All 12 `HttpAuditQueryFilter` fields are AND-composable
- [ ] `getByEvaluationId()` returns all HTTP entries for a given authorization evaluation
- [ ] `export()` produces self-contained archive with `HttpAuditArchiveManifest`
- [ ] Query spans active and archived data transparently
- [ ] Meta-audit logging records all read operations with accessor identity, filter, result count
- [ ] Export data includes hash chain integrity metadata for every entry

### Certificate Revocation Checking (§106)

- [ ] `CertificateRevocationPolicy` configures method priority, failureMode, caching, timeout
- [ ] Method priority: OCSP stapling tried first, then OCSP, then CRL
- [ ] Hard-fail mode rejects connection when all methods fail — code `"REVOCATION_CHECK_FAILED"`
- [ ] Soft-fail mode allows connection with WARNING and audit marker
- [ ] Revoked certificates ALWAYS rejected regardless of failureMode — code `"CERTIFICATE_REVOKED"`
- [ ] `CertificateRevocationResult` recorded in `HttpOperationAuditEntry` for every HTTPS connection
- [ ] OCSP cache respects `ocspCacheMaxAge`; CRL cache respects `crlCacheMaxAge`

### Electronic Signature Verification (§107)

- [ ] `HttpSignatureVerificationPort` provides `verify()`, `verifyBatch()`, `checkSignerStatus()`
- [ ] Three-property verification: `bindingIntact`, `signerActive`, `temporallyValid`
- [ ] `verified` is true only when all three properties are true
- [ ] Binding integrity recomputes SHA-256(signerId + "|" + signedAt + "|" + meaning + "|" + requestDigest)
- [ ] Revoked/suspended signer fails `signerActive` check — recorded as critical security event
- [ ] Constant-time comparison used for binding verification by default
- [ ] All verification operations recorded in audit trail with accessor identity

### Audit Trail Backup and Restore (§104a)

- [ ] Backups include active entries, hash chain metadata, unconfirmed entries, and WAL state
- [ ] Backup integrity verified via HttpAuditArchiveManifest (checksum, hash chain, entry count)
- [ ] Restore verifies backup integrity before proceeding — partial restores prohibited
- [ ] Restore reconciles overlapping entries (deduplicate by sequenceNumber)
- [ ] Restore operation recorded as HttpClientConfigurationAuditEntry in independent restore-audit chain
- [ ] Hash chain re-verified after restoration completes

### Audit Trail Cross-System Migration (§104b)

- [ ] Migration exports via QueryableHttpAuditTrailPort.export() with HttpAuditArchiveManifest
- [ ] Import preserves all fields including integrityHash, previousHash, hashAlgorithm, sequenceNumber
- [ ] Hash chain verified in target system after import
- [ ] Target manifest matches source manifest (entryCount, firstEntryHash, lastEntryHash)
- [ ] Migration recorded as HttpClientConfigurationAuditEntry in both source and target
- [ ] Migrated data queryable via same QueryableHttpAuditTrailPort interface
- [ ] Schema migrations follow VersionedAuditEntry rules (§83): new fields optional, existing fields never removed

### Transport Adapter Switchover (§80a)

- [ ] Adapter switchover does not break hash chain continuity
- [ ] Concurrent adapters share HttpAuditTrailPort or use coordinated sequencing
- [ ] Switchover recorded as HttpClientConfigurationAuditEntry with adapter identifiers and boundary sequenceNumber
- [ ] Hash chain verification spans entries from both old and new adapters

### Biometric Authentication (§90)

- [ ] BiometricAuthenticationMetadata validated (biometricType, verificationLocation, confidenceScore, companionComponent)
- [ ] Biometric requires pairing with non-biometric identification component (two-component requirement)
- [ ] BiometricAuthenticationMetadata included in audit entries — raw biometric data excluded
- [ ] Failed biometric verifications recorded as AuthenticationFailureAuditEntry

### Privilege Escalation Detection (§90)

- [ ] PrivilegeEscalationPolicy configured for GxP mode with periodic role re-check
- [ ] "block-and-reauth" action blocks requests and requires re-authentication on role change
- [ ] Privilege changes recorded as AuthenticationFailureAuditEntry with failureType "privilege_change_detected"
- [ ] Both privilege escalation and reduction detected when configured

### mTLS for Category 1 Endpoints (§85)

- [ ] mTLS REQUIRED for Category 1 GxP endpoints (patient safety, batch release, critical quality)
- [ ] Client certificate rejection produces HttpRequestError code "CLIENT_CERTIFICATE_REJECTED"
- [ ] Private key material never logged or included in audit entries

### XML and Multipart Payload Validation (§89)

- [ ] XmlPayloadValidationConfig validates against XSD schema
- [ ] DTD processing disabled (allowDtd: false) to prevent XXE attacks
- [ ] XML validation results recorded in PayloadValidationResult in audit entries
- [ ] MultipartValidationConfig checks required parts, content types, and size limits
- [ ] strictParts: true rejects unexpected form fields

### Electronic Signature Display Format (§93b)

- [ ] HttpSignatureDisplayFormat renders all 5 mandatory fields (signerId, signerRole, signedAt, signatureMeaning, signatureBinding)
- [ ] Three layout modes supported: inline, block, badge
- [ ] signatureBinding truncated to 16 chars with expand option in compact layouts
- [ ] Verification status displayed alongside signature when available

### Configuration Change Rollback (§88)

- [ ] Rollback creates new client from previous configuration
- [ ] Rollback produces HttpClientConfigurationAuditEntry with configurationKey "ROLLBACK"
- [ ] Rollback entry references failed changeId in reason field
- [ ] Health check executed before routing GxP traffic to restored client
- [ ] In-flight requests drain before failed client decommissioned

### HTTP/2 and HTTP/3 Security (§68b)

- [ ] Credential protection operates on decompressed headers (after HPACK/QPACK)
- [ ] HTTP/2 server push responses subject to same audit recording as client-initiated responses
- [ ] Server push disabled (SETTINGS_ENABLE_PUSH=0) if push cannot be audited
- [ ] HTTP/3 QUIC connections satisfy same TLS, cert, revocation requirements as TCP-based TLS
- [ ] HTTP/2 connection coalescing performs per-origin certificate validation
- [ ] Protocol version included in HttpOperationAuditEntry metadata

### HTTP Transport Incident Classification (§83c)

- [ ] 16 incident types classified by severity (S1-S4)
- [ ] Critical (S1) incidents produce HttpClientConfigurationAuditEntry with "INCIDENT" key before containment
- [ ] Critical incidents require 1-hour response SLA and trigger revalidation
- [ ] Incident resolution includes root cause analysis, containment, corrective action, verification, and revalidation assessment

### DNS Security Mitigation (§84)

- [ ] DNSSEC, DoH/DoT, and certificate pinning documented as compensating controls
- [ ] Certificate pinning (§85) identified as primary compensating control when DNSSEC unavailable

---

## 102. Definition of Done: HTTP Transport Guards

### DoD 20: Transport Security

**Spec Sections:** 84-90 | **Roadmap Item:** Cross-cutting (GxP HTTP Transport)

#### Requirements

- `requireHttps()` combinator with URL scheme check, TLS version enforcement, certificate validation policy, certificate pinning with SPKI digests, and cipher suite restriction
- `withPayloadIntegrity()` combinator with SHA-256/384/512 digest computation and RFC 9530 header format
- `withCredentialProtection()` combinator with header/query param redaction and error sanitization
- `HttpClientConfigurationAuditEntry` type and configuration change recording
- `withPayloadValidation()` combinator with JSON Schema validation and reject/warn modes
- `withTokenLifecycle()` combinator with expiration tracking, proactive refresh, and circuit-breaker
- `GxPAuthenticationPolicy` type and `withAuthenticationPolicy()` combinator with minimum strength enforcement, session age, and inactivity timeout
- `CertificatePin` type for SPKI-based certificate pinning (RFC 7469)
- All types are frozen, `readonly`, and JSON-serializable where required

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 60    | requireHttps URL rejection, HTTPS allowance, TLS version check, certificate validation, certificate pin SPKI verification, pin failure rejection, cipher suite restriction, withPayloadIntegrity digest computation, digest header format, bodyless method skip, response verification, withCredentialProtection header redaction (5 default headers), query param redaction, error sanitization, body redaction, audit entry redaction, withPayloadValidation request rejection, request warning, response rejection, schema serialization check, withTokenLifecycle expiration rejection, proactive refresh trigger, circuit-breaker open, circuit-breaker recovery, token refresh audit, configuration audit entry creation, immutable config enforcement, withAuthenticationPolicy strength enforcement (3 levels), session age check, inactivity timeout check, auth method filtering, auth policy violation audit, SSRF private IP blocking, SSRF metadata endpoint blocking, SSRF DNS rebinding prevention, CT SCT verification, CT enforcement modes, HSTS max-age enforcement, HSTS preload cache, CSRF synchronizer token validation, CSRF double-submit cookie, CSRF custom header, certificate pinning Category 1 enforcement, payload integrity Category 1 enforcement, subject attribution construction-time validation |
| Type tests        | 7     | HttpTransportSecurityPolicy structure, PayloadIntegrityConfig discriminant, CredentialRedactionPolicy fields, PayloadSchema JSON-serializable, TokenLifecyclePolicy discriminant, GxPAuthenticationPolicy structure, CertificatePin discriminant                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Integration tests | 15    | Full combinator pipeline (all combinators composed), requireHttps + baseUrl interaction, credential protection + error propagation, payload integrity + audit bridge digest flow, token lifecycle + auth failure audit, configuration change + audit bridge recording, schema validation + audit entry inclusion, combinator ordering enforcement (requireHttps first), GxP mode enforcement (gxp: true requires requireHttps), transport adapter TLS metadata flow, certificate pinning + TLS handshake, auth policy + subject attribution, session timeout + token lifecycle interaction, SSRF + audit bridge combined, CSRF + CORS + audit bridge combined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**Total: 82 tests** (60 unit + 7 type + 15 integration; matches DoD 20-27 summary table)

#### Verification

- [ ] `requireHttps()` rejects `http://` URLs with code `"HTTPS_REQUIRED"`
- [ ] `requireHttps()` enforces `minTlsVersion` from transport adapter metadata
- [ ] `CertificateValidationPolicy` produces diagnostic error with hostname and failure reason
- [ ] `withPayloadIntegrity()` computes correct SHA-256 digest for request bodies
- [ ] `withPayloadIntegrity()` produces RFC 9530 `Content-Digest` header
- [ ] `withPayloadIntegrity()` skips digest for GET, HEAD, OPTIONS
- [ ] Response integrity mismatch produces `HttpResponseError` code `"PAYLOAD_INTEGRITY_FAILED"`
- [ ] `withCredentialProtection()` redacts all 5 default credential headers
- [ ] `withCredentialProtection()` redacts custom headers from `redactHeaders`
- [ ] Error messages do not contain credential values after sanitization
- [ ] `HttpClientConfigurationAuditEntry` produced for configuration changes
- [ ] HTTP client configuration is immutable after construction in GxP mode
- [ ] `withPayloadValidation()` rejects invalid bodies with schemaId and validation errors
- [ ] `PayloadSchema` definitions are JSON-serializable
- [ ] `withTokenLifecycle()` rejects expired tokens with code `"TOKEN_EXPIRED"`
- [ ] Circuit-breaker opens after `maxRefreshFailures` consecutive failures
- [ ] Circuit-breaker recovers after cooldown period
- [ ] Token refresh events recorded in audit trail
- [ ] Token lifecycle does not affect electronic signatures (HttpSignatureServicePort §93a)
- [ ] `certificatePins` validates SPKI digest against server certificate chain
- [ ] Certificate pin failure produces `HttpRequestError` code `"CERTIFICATE_PIN_FAILED"`
- [ ] `cipherSuitePolicy: "gxp-restricted"` limits cipher suites per NIST SP 800-52r2
- [ ] `withAuthenticationPolicy()` rejects single-factor auth when multi-factor required
- [ ] Session age enforcement rejects operations exceeding `maxSessionAge`
- [ ] Inactivity timeout enforcement rejects operations exceeding `inactivityTimeout`
- [ ] Auth policy violations recorded as `AuthenticationFailureAuditEntry`

---

### DoD 21: Audit Bridge

**Spec Sections:** 91-93, 95-97 | **Roadmap Item:** Cross-cutting (GxP HTTP Audit)

#### Requirements

- `HttpAuditTrailPort` (§91) outbound port with append-only, atomic write contract, plus `confirm()` for durable persistence acknowledgment and `unconfirmedEntries()` for health monitoring
- `HttpOperationAuditEntry` type with all required fields including hash chain and `reason` field
- `withHttpAuditBridge()` combinator producing entries for every HTTP operation, with `reasonProvider` option
- `AuthenticationFailureAuditEntry` type for auth failure recording
- `withAuthFailureAudit()` combinator for authentication failure audit
- Clock synchronization using `HttpClockSourcePort` (§96)
- Stale authorization detection via `maxDecisionAge` (default 5s in GxP mode, max 30s)
- Cross-correlation via `evaluationId` between authorization and HTTP audit entries
- `HttpAuthorizationCorrelation` type for bidirectional traceability
- `AuditConfirmError` type for persistence confirmation failures

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 32    | HttpAuditTrailPort.record success/failure, HttpAuditTrailPort.confirm success/failure/idempotent, unconfirmedEntries tracking, HttpOperationAuditEntry field population (all fields including reason), reason in hash chain computation, GxP WARNING on missing reason, requestId uniqueness, evaluationId correlation, URL redaction in entries, requestDigest/responseDigest population, AuthenticationFailureAuditEntry for each failureType (7 types), error sanitization in failure entries, ClockSource timestamp consistency, dual-timing (wall-clock + monotonic), maxDecisionAge rejection, maxDecisionAge default (5s) in GxP mode, maxDecisionAge max (30s) enforcement, HttpAuthorizationCorrelation field population, reasonProvider callback, rejectOnMissingReason enforcement, unconfirmedEntries threshold WARNING (30s), unconfirmedEntries threshold CRITICAL (5min), confirm idempotent ALREADY_CONFIRMED return |
| Type tests        | 7     | HttpOperationAuditEntry discriminant (including reason field), AuthenticationFailureAuditEntry discriminant, HttpAuditTrailPort interface (including confirm and unconfirmedEntries), AuditConfirmError discriminant, HttpAuthorizationCorrelation structure, GxPActiveRequest type, ReasonProviderError type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Integration tests | 13    | withHttpAuditBridge end-to-end (success request), withHttpAuditBridge end-to-end (failure request), audit entry completeness (entry count = request count), failOnAuditError blocks response on write failure, withAuthFailureAudit captures 401 errors, withAuthFailureAudit captures token expiration, cross-correlation query (evaluationId join), stale authorization rejection, clock source shared between authorization and HTTP audit, hash chain integrity for HTTP audit entries, confirm() lifecycle (record → confirm → unconfirmedEntries empty), reason field end-to-end (POST with reason → audit entry → hash chain verification), unconfirmedEntries persistence-aware eviction integration                                                                                                                                                                                                                         |

**Total: 52 tests (32 unit + 7 type + 13 integration)**

#### Verification

- [ ] `HttpAuditTrailPort.record()` follows append-only, atomic write contract (§91)
- [ ] `HttpAuditTrailPort.confirm()` acknowledges durable persistence of entries
- [ ] `HttpAuditTrailPort.confirm()` is idempotent — double-confirm returns `"ALREADY_CONFIRMED"`
- [ ] `unconfirmedEntries()` tracks entries recorded but not yet confirmed
- [ ] Entries unconfirmed > 30s trigger WARNING; > 5min trigger CRITICAL
- [ ] `HttpOperationAuditEntry` produced for every HTTP operation (success and failure)
- [ ] `HttpOperationAuditEntry.reason` populated for state-changing operations
- [ ] `reason` included in hash chain computation when non-empty
- [ ] GxP mode produces WARNING when reason empty for POST/PUT/PATCH/DELETE
- [ ] `reasonProvider` callback invoked for state-changing operations
- [ ] `evaluationId` in HTTP entry matches authorization `AuditEntry.evaluationId`
- [ ] `subjectId` in HTTP entry matches authorization `AuditEntry.subjectId`
- [ ] URL field is redacted per `CredentialRedactionPolicy`
- [ ] `requestDigest` populated when `withPayloadIntegrity()` is active
- [ ] `failOnAuditError: true` blocks response on audit write failure
- [ ] `AuthenticationFailureAuditEntry` produced for all 7 failure types
- [ ] Auth failure entries sanitized (no credentials in detail field)
- [ ] Timestamps use `HttpClockSourcePort` (§96)
- [ ] `durationMs` uses monotonic clock (`performance.now()`)
- [ ] `maxDecisionAge` defaults to 5000ms in GxP mode; max 30000ms enforced
- [ ] `maxDecisionAge` rejects stale authorizations with code `"STALE_AUTHORIZATION"`
- [ ] Bidirectional correlation verifiable via audit trail queries
- [ ] HTTP audit hash chain is independent of authorization decision chain
- [ ] Hash chain uses same algorithm and delimiter as HttpAuditTrailPort contract (§91)

---

### DoD 22: Attribution and RBAC

**Spec Sections:** 93-94 | **Roadmap Item:** Cross-cutting (GxP HTTP Access Control)

#### Requirements

- `GxPActiveRequest` type with subject identity and evaluationId
- `GxPHttpHistoryEntry` type for operation lifecycle capture
- `withSubjectAttribution()` combinator resolving subject from `SubjectProviderPort`
- `HttpOperationPolicy` type with method, urlPattern, policy, and conflictingRoles fields
- `HttpOperationGatePort` outbound port for HTTP operation policy evaluation
- `withHttpGuard()` combinator for RBAC enforcement before HTTP requests, including separation of duties
- Deterministic policy matching (most specific wins, declaration order for ties)
- JSON-serializable policy definitions
- Separation of duties enforcement via `conflictingRoles` on `HttpOperationPolicy`

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 20    | withSubjectAttribution subject resolution, subject resolution failure, system identity for automated operations, GxPActiveRequest field population, withHttpGuard policy evaluation (allow), withHttpGuard policy evaluation (deny), policy matching: exact method over wildcard, policy matching: longer URL pattern over shorter, policy matching: declaration order for ties, no matching policy with default-deny, no matching policy with default-allow, HttpOperationPolicy JSON serialization, HttpOperationGatePort.evaluate call, denied operation audit entry, deterministic matching verification, conflictingRoles enforcement (subject holds both roles → denial), conflictingRoles with no conflict (subject holds one role → allow), conflictingRoles with multiple pairs, separation of duties violation audit entry, empty conflictingRoles (no enforcement) |
| Type tests        | 6     | GxPActiveRequest discriminant, GxPHttpHistoryEntry discriminant, HttpOperationPolicy structure (including conflictingRoles), HttpOperationGatePort interface, Policy structure definition (§94), conflictingRoles tuple type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Integration tests | 7     | withSubjectAttribution + withHttpGuard combined, RBAC denial blocks HTTP request, RBAC allow permits HTTP request and produces audit entry, subject attribution consistency across authorization and HTTP audit, multiple policies for same endpoint (most specific wins), separation of duties denial blocks HTTP request and produces audit entry, separation of duties + RBAC combined pipeline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**Total: 33 tests (20 unit + 6 type + 7 integration)**

#### Verification

- [ ] `withSubjectAttribution()` resolves subject from scoped `SubjectProviderPort`
- [ ] Subject resolution failure produces `HttpRequestError` code `"SUBJECT_RESOLUTION_FAILED"`
- [ ] System-initiated operations use documented system identity
- [ ] `GxPActiveRequest` carries `subjectId`, `authenticationMethod`, `authenticatedAt`, `evaluationId`
- [ ] `withHttpGuard()` evaluates policy before request reaches transport adapter
- [ ] Denied operations produce `HttpRequestError` with code `"HTTP_OPERATION_DENIED"`
- [ ] Policy matching selects most specific policy (exact method > wildcard)
- [ ] Policy matching uses declaration order for ties
- [ ] Denied operations produce authorization audit entry recording the denial
- [ ] `HttpOperationPolicy` is JSON-serializable
- [ ] RBAC + attribution consistent: same subjectId in authorization entry and HTTP entry
- [ ] `conflictingRoles` enforcement denies operations when subject holds both roles in a pair
- [ ] Separation of duties violation produces `HttpRequestError` code `"SEPARATION_OF_DUTIES_VIOLATION"`
- [ ] Separation of duties violation audit entry includes conflicting role pair and subjectId

---

### DoD 23: Electronic Signature Bridge, Validation Plan, and Periodic Review

**Spec Sections:** 83a, 83b, 93a | **Roadmap Item:** Cross-cutting (GxP Compliance Infrastructure)

#### Requirements

- `HttpElectronicSignature` type with signerId, signerRole, signedAt, signatureMeaning, signatureBinding, evaluationId, twoFactorVerified
- `ElectronicSignatureConfig` type with signableMethods, signableUrlPatterns, requireTwoFactor, captureSignature
- `withElectronicSignature()` combinator that bridges `HttpSignatureServicePort` (§93a) with HTTP operations
- `SignedHttpOperationAuditEntry` extending `HttpOperationAuditEntry` with signature
- `ElectronicSignatureError` type with 5 error codes
- Signer/subject identity verification (signerId must match subjectId)
- Two-factor verification enforcement when `requireTwoFactor: true`
- Signature binding via SHA-256(signerId + "|" + signedAt + "|" + meaning + "|" + requestDigest)
- Validation Plan outline covering 11 required sections (§83a)
- Test Environment Specification (§83a section 7)
- Periodic review schedule and scope (§83b)
- Revalidation trigger definitions (§83b)

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 18    | withElectronicSignature signature capture for POST/PUT/PATCH/DELETE, signature skip for GET/HEAD/OPTIONS, signerId vs subjectId match, signerId mismatch rejection, twoFactorVerified enforcement, twoFactorVerified bypass when requireTwoFactor: false, signatureBinding computation verification, signature event audit recording, captureSignature callback invocation, captureSignature error propagation (5 error codes), signableUrlPatterns glob matching, signableMethods filtering, SignedHttpOperationAuditEntry field population |
| Type tests        | 5     | HttpElectronicSignature discriminant, ElectronicSignatureConfig structure, ElectronicSignatureError codes, SignedHttpOperationAuditEntry extends HttpOperationAuditEntry, captureSignature return type                                                                                                                                                                                                                                                                                                                                       |
| Integration tests | 7     | withElectronicSignature + withSubjectAttribution + withPayloadIntegrity combined, signature binding matches payload integrity digest, signature audit entry in hash chain, combinator ordering enforcement (after attribution, before audit bridge), signature + RBAC combined pipeline, full GxP pipeline with all combinators including e-sig, captureSignature → HttpSignatureServicePort delegation                                                                                                                                    |

**Total: 30 tests (18 unit + 5 type + 7 integration)**

#### Verification

- [ ] `withElectronicSignature()` captures signature for POST, PUT, PATCH, DELETE
- [ ] `withElectronicSignature()` skips signature for GET, HEAD, OPTIONS
- [ ] Signer ID verified against authenticated subject ID — mismatch produces `"SIGNER_MISMATCH"`
- [ ] Two-factor enforcement — `twoFactorVerified: false` with `requireTwoFactor: true` produces `"TWO_FACTOR_REQUIRED"`
- [ ] Signature binding = SHA-256(signerId + "|" + signedAt + "|" + meaning + "|" + requestDigest)
- [ ] Signature events (capture, rejection) recorded in audit trail
- [ ] `SignedHttpOperationAuditEntry` includes full `HttpElectronicSignature`
- [ ] Combinator placed after `withSubjectAttribution()` and before `withHttpAuditBridge()`
- [ ] `captureSignature` callback receives request, subject, and meaning
- [ ] All 5 `ElectronicSignatureError` codes handled correctly
- [ ] Validation Plan outline covers all 11 sections
- [ ] Test Environment Specification documented
- [ ] Periodic review schedule defined (minimum annual)
- [ ] Revalidation triggers cover all 6 trigger categories

---

### DoD 24: GxP Compliance Extensions

**Spec Sections:** 104-107 | **Roadmap Item:** Cross-cutting (GxP Compliance Gaps)

#### Requirements

- `HttpAuditRetentionPolicy` type with URL pattern + method scoping, retention period, archival policy
- `HttpRetentionPeriod` type with years and regulatory reference
- `HttpArchivalPolicy` type with cold storage transition, format, queryability, compression
- `HttpAuditArchiveManifest` type with integrity metadata (entry count, hash chain endpoints, SHA-256 checksum)
- Capacity monitoring at 70/85/95% thresholds
- `QueryableHttpAuditTrailPort` extending `HttpAuditTrailPort` with `query()`, `getByRequestId()`, `getByEvaluationId()`, `count()`, `export()`
- `HttpAuditQueryFilter` type with 12 AND-composable filter fields
- `HttpAuditTrailReadError` type with 4 error codes
- `HttpAuditExportResult` type with data string and manifest
- Meta-audit logging for all read operations
- `CertificateRevocationPolicy` type with method priority, failureMode, OCSP/CRL caching, timeout
- `CertificateRevocationResult` type with method, status, timestamps, cached flag, certificate details
- Hard-fail and soft-fail revocation behavior
- `HttpSignatureVerificationPort` with `verify()`, `verifyBatch()`, `checkSignerStatus()`
- `HttpSignatureVerificationResult` type with three-property verification (bindingIntact, signerActive, temporallyValid)
- `SignerStatusResult` type with status and reason
- `HttpSignatureVerificationConfig` type with maxSignatureAge, maxClockSkew, constantTimeComparison
- `HttpSignatureVerificationError` type with 5 error codes
- All types are frozen, `readonly`, and JSON-serializable where required

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 54    | HttpAuditRetentionPolicy enforcement (minimum 5yr, custom period, URL pattern scoping, method scoping), retention period immutability (delete blocked during retention), HttpArchivalPolicy cold storage transition, archive self-containment (entries + hash chain + manifest), HttpAuditArchiveManifest field population, archive checksum verification (valid, tampered), archive hash chain continuity (valid, broken), archive entry count validation, capacity monitoring (70% INFO, 85% WARNING, 95% CRITICAL — 3 thresholds), QueryableHttpAuditTrailPort.query() with single filter, query() with multiple AND-composed filters, query() with all 12 filter fields, getByRequestId() success/not-found, getByEvaluationId() returns all correlated entries, count() with filter, export() produces complete archive with manifest, export() includes hash chain metadata, meta-audit logging (query, getByRequestId, getByEvaluationId, count, export — 5 operations), meta-audit records accessor identity and filter, CertificateRevocationPolicy method priority (OCSP stapling > OCSP > CRL), hard-fail rejection on check failure, soft-fail allowance with WARNING, revoked certificate always rejected regardless of failureMode, OCSP cache TTL enforcement, CRL cache TTL enforcement, revocation timeout handling, CertificateRevocationResult audit recording, preferOcspStapling behavior, acceptTryLater behavior, HttpSignatureVerificationPort.verify() three-property check (all pass), verify() binding integrity failure, verify() signer status failure (revoked, suspended, expired — 3 statuses), verify() temporal validity failure (expired signature, clock skew), verifyBatch() independent results, checkSignerStatus() for each status (active, revoked, suspended, expired, unknown — 5 statuses), constantTimeComparison enforcement, verification audit logging, HttpSignatureVerificationError for each code (5 codes), data-at-rest encryption key rotation, encryption envelope metadata field population, decryption failure error codes, retention + encryption combined validation, archive compression validation, archive queryability after cold storage transition, meta-audit entry hash chain integrity, revocation result caching cross-request persistence |
| Type tests        | 16    | HttpAuditRetentionPolicy discriminant, HttpRetentionPeriod structure, HttpArchivalPolicy structure, HttpAuditArchiveManifest structure, HttpAuditQueryFilter structure (all 12 optional fields), QueryableHttpAuditTrailPort extends HttpAuditTrailPort, HttpAuditTrailReadError codes, HttpAuditExportResult discriminant, CertificateRevocationPolicy discriminant, CertificateRevocationResult discriminant, HttpSignatureVerificationPort interface, HttpSignatureVerificationResult discriminant, SignerStatusResult structure, HttpSignatureVerificationError codes, HttpAuditEncryptionConfig structure, CertificateRevocationCacheEntry structure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Integration tests | 22    | Retention + archival end-to-end (entries created → aged → archived → verified), archive spanning multiple scopes, retention policy alignment between authorization and HTTP audit, QueryableHttpAuditTrailPort query across active and archived data, cross-correlation query (evaluationId join through QueryableHttpAuditTrailPort), export + re-import integrity cycle, meta-audit end-to-end (query → meta-audit entry → hash chain), CertificateRevocationPolicy with requireHttps() combinator pipeline, OCSP stapling → OCSP → CRL fallback chain, hard-fail + audit recording end-to-end, soft-fail + audit marker end-to-end, revoked certificate + audit critical event, revocation result in HttpOperationAuditEntry, HttpSignatureVerificationPort + withElectronicSignature() combined, three-property verification end-to-end (capture → verify → result), revoked signer detection + critical security event audit, periodic re-verification workflow (daily + weekly sampling), verifyBatch() with mixed results, signature verification + cross-correlation (requestId → signed entry → verification), full GxP pipeline with all §104-107 extensions, encryption + archival combined, snapshot isolation under concurrent queries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

**Total: 92 tests (54 unit + 16 type + 22 integration)**

#### Verification

- [ ] `HttpAuditRetentionPolicy` enforces minimum 5-year default retention
- [ ] Entries are immutable during retention period — deletion returns error
- [ ] URL pattern and method scoping selects correct retention policy per endpoint
- [ ] `HttpArchivalPolicy` transitions entries to cold storage after `coldStorageAfterDays`
- [ ] Archive bundles include all entries, hash chain metadata, and manifest
- [ ] `HttpAuditArchiveManifest` checksum matches archive content (SHA-256)
- [ ] Hash chain from firstEntryHash to lastEntryHash is unbroken in archive
- [ ] Archive entryCount matches actual entry count
- [ ] Capacity monitoring emits INFO at 70%, WARNING at 85%, CRITICAL at 95%
- [ ] `QueryableHttpAuditTrailPort.query()` supports all 12 filter fields with AND composition
- [ ] `getByRequestId()` returns correct entry or `ENTRY_NOT_FOUND` error
- [ ] `getByEvaluationId()` returns all HTTP entries for an authorization evaluation
- [ ] `count()` returns correct count without full entry data
- [ ] `export()` produces complete archive with verifiable manifest
- [ ] Queries span active and archived data transparently
- [ ] Meta-audit logging records all 5 read operation types
- [ ] Meta-audit entries include accessor identity, filter, result count, timestamp
- [ ] `CertificateRevocationPolicy` checks methods in configured priority order
- [ ] Hard-fail rejects connection with code `"REVOCATION_CHECK_FAILED"` including diagnostic detail
- [ ] Soft-fail allows connection with WARNING and audit marker
- [ ] Revoked certificate always rejected with code `"CERTIFICATE_REVOKED"`
- [ ] `CertificateRevocationResult` recorded in `HttpOperationAuditEntry`
- [ ] OCSP cache TTL and CRL cache TTL respected
- [ ] `HttpSignatureVerificationPort.verify()` checks bindingIntact, signerActive, temporallyValid
- [ ] `verified` is true only when all three properties are true
- [ ] Binding recomputation matches SHA-256(signerId + "|" + signedAt + "|" + meaning + "|" + requestDigest)
- [ ] Revoked/suspended signer fails `signerActive` — recorded as critical event
- [ ] `verifyBatch()` produces independent results per signature
- [ ] `checkSignerStatus()` returns correct status for each signer state
- [ ] Constant-time comparison prevents timing side-channel
- [ ] Verification operations recorded in audit trail

---

### DoD 25: GxP Compliance Audit v4.0 Remediations

**Spec Sections:** 80a, 83c, 84, 85, 88, 89, 90, 93b, 104a, 104b, 68b | **Roadmap Item:** Cross-cutting (GxP Compliance Audit Remediations)

#### Requirements

- Transport adapter switchover data integrity (§80a) with hash chain continuity, concurrent adapter coordination, and switchover audit entries
- HTTP transport incident classification framework (§83c) with 16 incident types, 4 severity levels, response SLAs, and escalation procedures
- DNS security mitigation guidance (§84) with DNSSEC, DoH/DoT, and certificate pinning as compensating controls
- mTLS REQUIREMENT for Category 1 GxP endpoints (§85) with client certificate configuration and `"CLIENT_CERTIFICATE_REJECTED"` error code
- Configuration change rollback procedures (§88) with rollback audit entries, health check verification, and in-flight request draining
- XML payload validation via `XmlPayloadValidationConfig` (§89) with XSD-based validation and XXE prevention
- Multipart/form-data validation via `MultipartValidationConfig` (§89) with part constraints and strict mode
- Biometric authentication metadata support (§90) with `BiometricAuthenticationMetadata` and two-component requirement verification
- Privilege escalation detection (§90) with `PrivilegeEscalationPolicy` and periodic role re-check
- Electronic signature display format (§93b) with `HttpSignatureDisplayFormat` and mandatory field rendering
- Audit trail backup and restore procedures (§104a) with backup integrity verification and restore reconciliation
- Audit trail cross-system migration (§104b) with hash chain preservation and schema migration rules
- HTTP/2 and HTTP/3 security considerations (§68b) with server push auditing, header decompression for credential protection, and QUIC TLS requirements

#### Test Counts

| Category          | Count | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests        | 52    | Backup integrity verification (checksum, hash chain, entry count), restore rejection on tampered backup, restore rejection on broken chain, restore audit entry in independent chain, migration export-import-verify cycle, migration halt on verification failure, adapter switchover audit entry, concurrent adapter sequencing, privilege escalation block-and-reauth, privilege escalation warn-and-allow, privilege escalation audit-only, privilege change audit entry (escalation and reduction), biometric metadata validation (4 required fields), biometric two-component requirement, biometric confidence threshold, biometric raw data exclusion from audit, mTLS client certificate rejection, mTLS certificate configuration, rollback audit entry with ROLLBACK key, rollback health check, rollback in-flight drain, XML XSD validation (valid/invalid), XML DTD disabled, XML max document size, multipart strict parts (accept/reject), multipart required parts, multipart content type restriction, multipart max part size, e-signature block layout rendering (5 fields), e-signature inline layout, e-signature badge layout, e-signature binding truncation with expand, incident classification audit entry, incident severity assignment, HTTP/2 decompressed header credential protection, HTTP/2 server push audit entry, HTTP/3 QUIC TLS metadata, HTTP/2 connection coalescing per-origin cert validation, DNS mitigation compensating control documentation |
| Type tests        | 10    | BiometricAuthenticationMetadata discriminant, PrivilegeEscalationPolicy structure, XmlPayloadValidationConfig discriminant, MultipartValidationConfig structure, MultipartPartConstraint fields, HttpSignatureDisplayFormat structure, HttpAuditBackupManifest (extends HttpAuditArchiveManifest), IncidentClassification discriminant, MtlsClientCertificateConfig structure, HttpProtocolSecurityMetadata structure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Integration tests | 18    | Backup → restore → verify chain end-to-end, migration source → target → cross-correlation query, adapter switchover with shared audit trail, concurrent adapter with coordinated sequencing, privilege escalation + RBAC combined pipeline, biometric auth + electronic signature combined, mTLS + certificate pinning combined, rollback + audit bridge end-to-end, XML validation + audit bridge, multipart validation + credential protection, e-signature display + verification status combined, incident classification + periodic review trigger, HTTP/2 server push + audit bridge pipeline, HTTP/2 credential protection + error propagation, HTTP/3 QUIC + certificate revocation, DNS mitigation + certificate pinning compensating control, full GxP pipeline with all v4.0 extensions, configuration rollback during active traffic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Total: 80 tests (52 unit + 10 type + 18 integration)**

#### Verification

- [ ] Backup integrity verification rejects tampered backups (checksum mismatch, chain break, entry count mismatch)
- [ ] Restore produces audit entry in independent restore-audit chain
- [ ] Restore is all-or-nothing — no partial restores permitted
- [ ] Migration preserves hash chain integrity in target system
- [ ] Migration records audit entries in both source and target systems
- [ ] Migrated data queryable through `QueryableHttpAuditTrailPort` with cross-correlation intact
- [ ] Adapter switchover maintains hash chain continuity via shared `HttpAuditTrailPort`
- [ ] Concurrent adapters produce globally monotonic sequenceNumber values
- [ ] Adapter switchover recorded as `HttpClientConfigurationAuditEntry`
- [ ] `PrivilegeEscalationPolicy` "block-and-reauth" blocks requests on role change
- [ ] Privilege changes recorded as `AuthenticationFailureAuditEntry` with `failureType: "privilege_change_detected"`
- [ ] `BiometricAuthenticationMetadata` requires two distinct identification components
- [ ] Raw biometric data excluded from audit entries
- [ ] mTLS REQUIRED for Category 1 endpoints; absence produces `"CLIENT_CERTIFICATE_REJECTED"`
- [ ] Configuration rollback produces `HttpClientConfigurationAuditEntry` with `configurationKey: "ROLLBACK"`
- [ ] Rollback references failed `changeId` in reason field
- [ ] In-flight requests drain before failed client decommissioned
- [ ] `XmlPayloadValidationConfig` validates against XSD; DTD processing disabled
- [ ] `MultipartValidationConfig` rejects unexpected parts when `strictParts: true`
- [ ] `HttpSignatureDisplayFormat` renders all 5 mandatory fields in all 3 layout modes
- [ ] Incident classification produces `HttpClientConfigurationAuditEntry` with `configurationKey: "INCIDENT"`
- [ ] Critical incidents require 1-hour response SLA and trigger revalidation (§83b)
- [ ] HTTP/2 credential protection operates on decompressed (not wire-format) headers
- [ ] HTTP/2 server push responses produce audit entries when audit bridge active
- [ ] HTTP/3 QUIC connections satisfy same TLS/cert/revocation requirements as TCP-based TLS

---

## 103. Appendix: GxP Combinator Composition

### Full Composition Example

The following example demonstrates the complete GxP HTTP client pipeline with all security, audit, and access control combinators:

```typescript
import { pipe } from "@hex-di/core";
import { HttpClient, HttpRequest } from "@hex-di/http-client";
import {
  requireHttps,
  withCredentialProtection,
  withPayloadIntegrity,
  withPayloadValidation,
  withTokenLifecycle,
  withAuthenticationPolicy,
  withSubjectAttribution,
  withElectronicSignature,
  withHttpGuard,
  withAuthFailureAudit,
  withHttpAuditBridge,
} from "@hex-di/http-client";

// Define payload schemas for the GxP API
const batchRecordSchema: PayloadSchema = {
  _tag: "PayloadSchema",
  schemaId: "batch-record-v2",
  version: "2.0.0",
  jsonSchema: {
    type: "object",
    required: ["batchId", "productCode", "steps"],
    properties: {
      batchId: { type: "string", pattern: "^BR-\\d{8}$" },
      productCode: { type: "string" },
      steps: { type: "array", items: { type: "object" } },
    },
  },
};

// Define HTTP operation policies
const batchApiPolicies: ReadonlyArray<HttpOperationPolicy> = [
  {
    _tag: "HttpOperationPolicy",
    method: "GET",
    urlPattern: "/api/batches/*",
    policy: hasPermission(permissions.batch.read),
    conflictingRoles: [], // No separation of duties for read operations
  },
  {
    _tag: "HttpOperationPolicy",
    method: "POST",
    urlPattern: "/api/batches",
    policy: allOf(hasPermission(permissions.batch.create), hasRole(roles.batchOperator)),
    conflictingRoles: [["batch-operator", "batch-reviewer"]], // Creator cannot review
  },
  {
    _tag: "HttpOperationPolicy",
    method: "PUT",
    urlPattern: "/api/batches/*/steps/*",
    policy: allOf(
      hasPermission(permissions.batch.update),
      hasRole(roles.batchOperator),
      hasSignature("REVIEWED")
    ),
    conflictingRoles: [
      ["data-entry", "data-approval"], // Enterer cannot approve
      ["batch-operator", "batch-reviewer"], // Operator cannot review
    ],
  },
];

/**
 * Creates a fully GxP-compliant HTTP client for the batch record API.
 *
 * Combinator order (read top to bottom):
 * 1. HTTPS enforcement — blocks non-TLS requests, certificate pinning
 * 2. Credential protection — redacts secrets in logs/errors
 * 3. Payload integrity — SHA-256 digest on request bodies
 * 4. Payload validation — JSON Schema check before send
 * 5. Token lifecycle — refresh before expiration, circuit-break on failure
 * 6. Authentication policy — enforce multi-factor, session age, inactivity
 * 7. Subject attribution — resolve authenticated user identity
 * 8. Electronic signature — capture signer intent for state-changing operations
 * 9. RBAC gate — evaluate per-endpoint authorization policy with separation of duties
 * 10. Auth failure audit — record authentication failures
 * 11. Audit bridge — record all HTTP operations with reason for change
 * 12. Standard HTTP combinators — base URL, retry, timeout
 */
function createGxPHttpClient(
  baseClient: HttpClient,
  subjectProvider: SubjectProviderPort,
  httpGate: HttpOperationGatePort,
  httpAuditTrail: HttpAuditTrailPort,
  tokenRefresh: () => ResultAsync<string, TokenRefreshError>,
  signatureConfig: ElectronicSignatureConfig
): HttpClient {
  return pipe(
    baseClient,
    // Layer 1: Transport security
    requireHttps({
      minTlsVersion: "1.2",
      certificatePins: [
        {
          _tag: "CertificatePin",
          algorithm: "sha256",
          digest: "abc123...",
          label: "production-ca-2025",
        },
        {
          _tag: "CertificatePin",
          algorithm: "sha256",
          digest: "def456...",
          label: "backup-ca-2025",
        },
      ],
      cipherSuitePolicy: "gxp-restricted",
    }),
    withCredentialProtection({
      redactHeaders: ["authorization", "x-api-key", "x-batch-token"],
    }),
    withPayloadIntegrity({ algorithm: "sha256" }),
    withPayloadValidation({
      _tag: "PayloadSchemaValidationConfig",
      requestSchema: batchRecordSchema,
      responseSchema: undefined,
      requestValidationMode: "reject",
      responseValidationMode: "warn",
    }),
    withTokenLifecycle({
      _tag: "TokenLifecyclePolicy",
      maxAge: 3600,
      refreshBefore: 300,
      maxRefreshFailures: 3,
      rejectOnExpired: true,
      onRefresh: tokenRefresh,
    }),
    withAuthenticationPolicy({
      _tag: "GxPAuthenticationPolicy",
      minimumStrength: "multi-factor",
      maxSessionAge: 28800,
      inactivityTimeout: 1800,
      acceptedMethods: [],
    }),
    // Layer 2: Access control and signature
    withSubjectAttribution(subjectProvider),
    withElectronicSignature(signatureConfig),
    withHttpGuard(httpGate, batchApiPolicies),
    // Layer 3: Audit
    withAuthFailureAudit(httpAuditTrail),
    withHttpAuditBridge(httpAuditTrail, {
      maxDecisionAge: 30_000, // 30 seconds for batch record operations
      includeDigests: true,
      reasonProvider: request => Ok(request.context.get("reason") ?? ""),
    }),
    // Layer 4: Standard HTTP
    HttpClient.baseUrl("https://batch-api.pharma.example.com"),
    HttpClient.retryTransient({ times: 3 }),
    HttpClient.timeout(30_000)
  );
}
```

### GxP Data Flow Diagram

The following diagram shows how GxP-classified data flows through the combinator pipeline, identifying audit entry generation points (A), data transformation points (T), and decision points (D) at each layer.

```
                                          GxP HTTP Client Pipeline
                                          ========================

  Caller (application code)
    │
    │  HttpRequest + reason + subjectId + evaluationId
    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: TRANSPORT SECURITY                                                   │
│                                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────┐           │
│  │ requireHttps()  │──▶│ withSsrfProt()   │──▶│ withCredProt()     │           │
│  │ [D] TLS check   │   │ [D] URL/IP check │   │ [T] Header redact  │           │
│  │ [D] Cert pin    │   │ [D] DNS rebind   │   │ [T] Query redact   │           │
│  │ [D] CT verify   │   │ [A] SSRF denial  │   │                    │           │
│  └─────────────────┘   └──────────────────┘   └────────────────────┘           │
│           │                                              │                      │
│           ▼                                              ▼                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────┐           │
│  │ withHsts()      │──▶│ withPayloadInt() │──▶│ withPayloadVal()   │           │
│  │ [D] HSTS cache  │   │ [T] SHA-256 dgst │   │ [D] Schema check   │           │
│  │ [A] HSTS warn   │   │ [T] Digest hdr   │   │ [A] Validation err │           │
│  └─────────────────┘   └──────────────────┘   └────────────────────┘           │
│           │                                              │                      │
│           ▼                                              ▼                      │
│  ┌─────────────────┐   ┌──────────────────┐                                    │
│  │ withTokenLife()  │──▶│ withAuthPolicy() │                                    │
│  │ [T] Token attach │   │ [D] Session age  │                                    │
│  │ [T] Auto-refresh │   │ [D] Inactivity   │                                    │
│  │ [A] Refresh fail │   │ [D] MFA require  │                                    │
│  └─────────────────┘   └──────────────────┘                                    │
└──────────────────────────────────────────────────┬──────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: ACCESS CONTROL & SIGNATURE                                            │
│                                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────┐           │
│  │ withSubjectAttr()│──▶│ withElecSig()    │──▶│ withHttpGuard()    │           │
│  │ [T] subjectId   │   │ [D] Method match  │   │ [D] Policy eval    │           │
│  │ [T] evalId      │   │ [D] 2FA verify    │   │ [D] Role conflict  │           │
│  │ [A] Subj fail   │   │ [T] Sig binding   │   │ [A] Deny entry     │           │
│  │                 │   │ [A] Sig event     │   │                    │           │
│  └─────────────────┘   └──────────────────┘   └────────────────────┘           │
└──────────────────────────────────────────────────┬──────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: AUDIT                                                                 │
│                                                                                 │
│  ┌─────────────────┐   ┌──────────────────────────────────────────┐             │
│  │ withAuthFail()   │──▶│ withHttpAuditBridge()                   │             │
│  │ [A] Auth fail    │   │ [D] Reason check (reject if missing)    │             │
│  │    entry         │   │ [D] Decision age (reject if stale)      │             │
│  │                 │   │ [A] HttpOperationAuditEntry (ALWAYS)    │             │
│  │                 │   │ [T] Hash chain (seq# + SHA-256)         │             │
│  │                 │   │ [T] WAL write (before request)          │             │
│  │                 │   │ [T] External correlation ID             │             │
│  └─────────────────┘   └──────────────────────────────────────────┘             │
│                                        │                                        │
│                                        │  WAL intent: "pending"                 │
│                                        ▼                                        │
│                              ┌──────────────────┐                               │
│                              │ HttpAuditTrailPort│                               │
│                              │ [T] Encrypt (§104c)                              │
│                              │ [T] Persist to WAL                               │
│                              │ [T] Flush to store                               │
│                              │ [T] confirm()                                    │
│                              └──────────────────┘                               │
└──────────────────────────────────────────────────┬──────────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: STANDARD HTTP                                                         │
│                                                                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────────┐           │
│  │ baseUrl()        │──▶│ retryTransient() │──▶│ timeout()          │           │
│  │ [T] URL prefix   │   │ [T] logicalOpId  │   │ [D] Timeout check  │           │
│  │                 │   │ [A] Retry audit   │   │                    │           │
│  └─────────────────┘   └──────────────────┘   └────────────────────┘           │
└──────────────────────────────────────────────────┬──────────────────────────────┘
                                                   │
                                                   ▼
                                          Transport Adapter
                                          (fetch, undici, etc.)
                                                   │
                                                   ▼
                                          HTTP Response
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │                        │                        │
                          ▼                        ▼                        ▼
                   [T] Digest verify        [A] Audit entry         [T] Body snapshot
                   (Layer 1 return)         finalized (Layer 3)     (if configured)
                                            WAL: "committed"

Legend:
  [D] = Decision point (may reject request)
  [T] = Data transformation (modifies request/response/metadata)
  [A] = Audit entry generation point (writes to audit trail)
```

```
REQUIREMENT: GxP deployments MUST document their specific combinator pipeline
             data flow as part of the Validation Plan (§83a). The data flow
             documentation MUST identify: (1) all decision points and their
             rejection criteria, (2) all data transformation points and what
             is modified, (3) all audit entry generation points and what is
             recorded, (4) the WAL write/commit lifecycle, and (5) the
             encryption boundary for audit data at rest.
             Reference: EU GMP Annex 11 §4.4 (system documentation),
             GAMP 5 Appendix D4 (design specification).
```

### Combinator Ordering Guidance

| Layer                         | Order  | Combinators                                                                                                                                   | Rationale                                                                                                                     |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1. Transport Security         | First  | `requireHttps`, `withCredentialProtection`, `withPayloadIntegrity`, `withPayloadValidation`, `withTokenLifecycle`, `withAuthenticationPolicy` | Security checks MUST happen before requests leave the application boundary                                                    |
| 2. Access Control & Signature | Second | `withSubjectAttribution`, `withElectronicSignature`, `withHttpGuard`                                                                          | Subject resolution, then signature capture (needs subject + digest), then authorization with separation of duties enforcement |
| 3. Audit                      | Third  | `withAuthFailureAudit`, `withHttpAuditBridge`                                                                                                 | Audit recording captures the outcome of security, signature, and access control checks; includes reason for change            |
| 4. Standard HTTP              | Last   | `baseUrl`, `bearerAuth`, `filterStatusOk`, `retryTransient`, `timeout`                                                                        | Functional combinators operate on the authorized, signed, audited request                                                     |

```
REQUIREMENT: The combinator ordering in the table above MUST be followed for GxP
             deployments. Transport security combinators MUST precede access control
             combinators, which MUST precede audit combinators. Standard HTTP
             combinators MUST be applied last. Deviation from this ordering MUST
             be documented with a risk assessment in the FMEA (section 98).
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
RECOMMENDED: Organizations SHOULD create a factory function (like createGxPHttpClient
             above) that encapsulates the correct combinator ordering for each GxP
             API integration. This prevents ad-hoc combinator composition that may
             violate the ordering requirements. The factory function SHOULD be code-
             reviewed and its combinator ordering validated during OQ.
```

### Test Count Summary (DoD 20-27)

| DoD Item                      | Unit    | Type   | Integration | Total   |
| ----------------------------- | ------- | ------ | ----------- | ------- |
| 20: Transport Security        | 60      | 7      | 15          | 82      |
| 21: Audit Bridge              | 32      | 7      | 13          | 52      |
| 22: Attribution and RBAC      | 20      | 6      | 7           | 33      |
| 23: E-Sig Bridge, VP, PR      | 18      | 5      | 7           | 30      |
| 24: GxP Compliance Extensions | 56      | 16     | 23          | 95      |
| 25: Audit v4.0 Remediations   | 52      | 10     | 18          | 80      |
| 26: Audit v5.0 Remediations   | 28      | 8      | 12          | 48      |
| 27: GxP Compliance Hardening  | 18      | 4      | 8           | 30      |
| **Total**                     | **284** | **63** | **103**     | **450** |

> **Note:** DoD 26 details (§108-118) are in [22 - GxP Compliance Audit v5.0 Remediations](./22-gxp-compliance-audit-v5.md). DoD 27 details are also in that document. Grand total across all sources: **272 (core §1-78, including 22 E2E) + 40 (transport adapters §44a-§44d) + 450 (GxP DoDs 20-27) + 18 (chaos/load/soak) = 780 tests**.

---

_Previous: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md) | Next: [21 - GxP Compliance Extensions](./21-gxp-compliance-extensions.md)_
