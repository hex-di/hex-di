# 24 - Regulatory Traceability Matrix

_Previous: [23 - GxP Quick Reference](./23-gxp-quick-reference.md) | Next: [25 - Validation Plan](./25-validation-plan.md)_

---

This document is the standalone regulatory traceability matrix for auditor access. It is an exact copy of §100 from [20 - HTTP Transport Validation](./20-http-transport-validation.md) extracted for independent version control and easier auditor navigation.

> **Authoritative source:** This file is the authoritative copy. Section 100 in file 20 cross-references this document.

## 100. Regulatory Traceability Matrix

This section maps all 62 GxP findings from the HTTP client compliance reviews (findings #1-#52 from initial reviews, findings #53-#57 from GxP Compliance Hardening v6.0, finding #58 from Audit Trail Data Integrity review v7.0, and findings #59-#62 from Numerical Harmonization and Gap Closure review v8.0) to regulations, spec sections, DoD items, and test references.

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

### IQ Gating Procedure for Traceability Matrix Header Fields

Before Operational Qualification (OQ) begins, the Installation Qualification (IQ) team MUST complete the following checklist to populate the traceability matrix header fields. Incomplete fields MUST block IQ-to-OQ progression per EU GMP Annex 11 §4.3.

**IQ-TM-01: Traceability Matrix Review Checklist**

| Step | Action | Evidence | Completed |
| ---- | ------ | -------- | --------- |
| 1 | Verify the designated QA representative is identified in the Validation Plan (§83a, Section 4) and has completed role-specific training per §109 | Validation Plan §4, Training Record per 21 CFR 11.10(i) | [ ] |
| 2 | QA representative reviews all 62 findings in the traceability matrix for completeness: each finding has Regulation, Spec Section(s), DoD Item(s), and Test Reference populated | Signed review record | [ ] |
| 3 | QA representative populates the **Last Reviewed** field with the current date in ISO 8601 format (YYYY-MM-DD) | Traceability matrix header | [ ] |
| 4 | QA representative populates the **Reviewer** field with their full name and role (e.g., "Jane Smith, Senior QA Specialist") | Traceability matrix header | [ ] |
| 5 | Verify that no finding has "N/A" in both DoD Item(s) and Test Reference simultaneously (documentation-only findings must have at least "Documentation fix" in Test Reference) | Traceability matrix inspection | [ ] |
| 6 | QA representative signs IQ-TM-01 checklist with date | Signed checklist | [ ] |

```
REQUIREMENT: IQ-TM-01 MUST be executed and all steps marked complete before OQ
             test execution begins. The signed checklist MUST be retained as part
             of the IQ documentation package. If any step cannot be completed,
             the IQ team MUST document the deviation and obtain QA approval per
             the Deviation Handling process in the Validation Plan (§83a, Section 9)
             before proceeding.
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
| 25  | No separation of duties enforcement                | 21 CFR 11.10(g), EU GMP Annex 11 §12 | §94 (HttpOperationPolicy.conflictingRoles)              | DoD 22      | OQ-HT-19, E2E-022, HAB-056 through HAB-060                     |
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
| 53  | Reason-for-change enforcement was WARNING-only, not blocking | 21 CFR 11.10(e), EU GMP Annex 11 §9            | §92, §97 (`rejectOnMissingReason`)           | DoD 27      | OQ-HT-70, OQ-HT-71, OQ-HT-72, OQ-HT-73, E2E-021, RFR-001 through RFR-006             |
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

### URS Forward Traceability

Per GAMP 5 Appendix D.4, each User Requirement (URS-HTTP-001 through URS-HTTP-014, defined in [00 - URS](./00-urs.md)) MUST trace forward to findings in this traceability matrix, FMEA failure modes (§98), and test evidence.

| URS ID | URS Title | Traced Findings | FMEA References | ALCOA+ Principles | Primary Regulation |
| ------ | --------- | --------------- | --------------- | ----------------- | ------------------ |
| URS-HTTP-001 | Secure HTTP Communication | #5, #10, #11, #26, #31, #48 | FM-HT-01 through FM-HT-03, FM-HT-18, FM-HT-28, FM-HT-29 | Enduring, Accurate | 21 CFR 11.30, EU GMP Annex 11 §12 |
| URS-HTTP-002 | Audit Trail for HTTP Operations | #1, #3, #19, #23, #27 | FM-HT-10, FM-HT-19, FM-HT-20 | Complete, Consistent, Enduring | 21 CFR 11.10(e), EU GMP Annex 11 §9 |
| URS-HTTP-003 | User Attribution | #2, #20 | FM-HT-11, FM-HT-12 | Attributable | 21 CFR 11.10(d), ALCOA+ |
| URS-HTTP-004 | Access Control for HTTP Operations | #7, #9, #13, #15, #25, #54 | FM-HT-16, FM-HT-17, FM-HT-36 | Attributable | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 |
| URS-HTTP-005 | Data Integrity Verification | #4, #6, #16, #40, #41 | FM-HT-04, FM-HT-05, FM-HT-08 | Accurate, Original | 21 CFR 11.10(c), 11.10(h) |
| URS-HTTP-006 | Electronic Signatures | #21, #32, #36, #56 | FM-HT-14, FM-HT-15, FM-HT-30, FM-HT-31, FM-HT-32 | Attributable, Legible | 21 CFR 11.50, 11.70, 11.100, 11.200 |
| URS-HTTP-007 | Audit Trail Retention and Access | #29, #30, #33, #34, #55 | FM-HT-24, FM-HT-25, FM-HT-26, FM-HT-27, FM-HT-33, FM-HT-34 | Enduring, Available | 21 CFR 11.10(b), EU GMP Annex 11 §7, §17 |
| URS-HTTP-008 | Platform Independence | #35, #42 | FM-HT-35 | Consistent | GAMP 5, ALCOA+ Consistent |
| URS-HTTP-009 | Credential Protection | #12, #17, #14, #24, #38 | FM-HT-06, FM-HT-09, FM-HT-36, FM-HT-42 | Accurate | 21 CFR 11.300, OWASP |
| URS-HTTP-010 | Change Traceability | #8, #19, #23, #44, #53 | FM-HT-07, FM-HT-20, FM-HT-38 | Complete, Contemporaneous | 21 CFR 11.10(e), EU GMP Annex 11 §9, §10 |
| URS-HTTP-011 | Failure Recovery | #46, #49 | FM-HT-37, FM-HT-39, FM-HT-40, FM-HT-41 | Complete, Enduring | EU GMP Annex 11 §13, §16, 21 CFR 11.10(c) |
| URS-HTTP-012 | Validated Deployment | #22, #28, #45, #51, #57 | All FM-HT entries | All | GAMP 5, 21 CFR 11.10(a), EU GMP Annex 11 §4 |
| URS-HTTP-013 | Data Retention Lifecycle | #29, #33, #34, #55, #61 | FM-HT-23 through FM-HT-26, FM-HT-43 | Enduring, Available, Complete | 21 CFR 211.180, EU GMP Annex 11 §7, §17 |
| URS-HTTP-014 | Personnel Training | #22, #28, #45 | All FM-HT entries (cross-cutting personnel control) | Attributable, Complete | 21 CFR 11.10(i), EU GMP Annex 11 §2 |

```
REQUIREMENT: Every URS requirement (URS-HTTP-001 through URS-HTTP-014) MUST trace
             forward to at least one finding in this traceability matrix and at least
             one FMEA failure mode (§98). Untraced URS requirements indicate a
             specification gap that MUST be remediated before IQ execution.
             Reference: GAMP 5 Appendix D.4, ICH Q9.
```

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
             harmonization and gap closure review v8.0) MUST have verification evidence (test
             references and DoD items) before @hex-di/http-client transport
             controls are deployed in a GxP environment. Any finding missing
             verification evidence MUST block deployment until evidence is
             provided or a documented deviation is approved by QA.
             Reference: WHO TRS 996 Annex 5, WHO TRS 1033 Annex 4, GAMP 5.
```

---

_Previous: [23 - GxP Quick Reference](./23-gxp-quick-reference.md) | Next: [25 - Validation Plan](./25-validation-plan.md)_
