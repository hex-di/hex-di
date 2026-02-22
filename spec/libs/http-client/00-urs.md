# 00 - User Requirements Specification (URS)

_Next: [01 - Overview & Philosophy](./01-overview.md)_

---

This document provides the User Requirements Specification (URS) for `@hex-di/http-client`. Per GAMP 5 Appendix D.4, the URS is written from the user's perspective in business language and maps each user need to the corresponding Functional Specification (FS), Design Specification (DS), and test references.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). In GxP-specific sections, these keywords additionally carry pharmaceutical alignment as defined by 21 CFR Part 11 and EU GMP Annex 11.

## Document Control

| Field                     | Value                                                   |
| ------------------------- | ------------------------------------------------------- |
| **Document ID**           | URS-HTTP-001                                            |
| **Related Specification** | SPEC-HTTP-001 v0.1.0                                   |
| **GAMP 5 Category**       | 5 -- Custom Applications (§108)                         |
| **Status**                | Approved (architectural)                                |
| **Classification**        | GxP Controlled Document                                 |
| **Effective Date**        | 2026-02-14                                              |
| **Document Owner**        | HexDI Architecture Team                                 |
| **QA Reviewer**           | L. Hoffmann (P-03), Regulatory Affairs Specialist       |
| **Next Review Date**      | 2027-02-14 (annual review per EU GMP Annex 11 §11)      |

---

## User Groups

This section defines the user roles that interact with the HTTP client in GxP environments. Each role has distinct access levels and responsibilities. Detailed training requirements, competency criteria, and assessment procedures for each role are specified in §109 ([22 - GxP Compliance Audit v5.0](./compliance/gxp.md)).

| Role | GxP Access Level | Primary Responsibilities | Spec Reference |
| ---- | ---------------- | ------------------------ | -------------- |
| **Developer** | Configuration, Integration | Implements and integrates HTTP client adapters with GxP combinators; authors transport adapter code; writes unit and integration tests | §109 Role 1, §39-§44f |
| **QA Validator** | Qualification, Audit Review | Executes IQ/OQ/PQ qualification protocols; reviews audit trail entries; approves validation documentation; performs periodic reviews | §109 Role 2, §99, §83b |
| **System Administrator** | Deployment, Operations | Deploys HTTP client in production GxP environments; configures TLS, audit sinks, retention policies; manages certificate rotation and backup/restore | §109 Role 3, §85, §104 |
| **Compliance Officer** | Audit, Policy | Reviews regulatory compliance posture; approves risk acceptances; evaluates incident reports; signs off on validation reports | §109 Role 4, §83a, §83c |
| **Auditor** | Read-only Inspection | Queries audit trails via `QueryableHttpAuditTrailPort`; verifies hash chain integrity; reviews traceability matrix; inspects electronic signatures | §109 Role 5, §105, §100 |

```
REQUIREMENT: Personnel in each role MUST complete the corresponding training
             program (§109) and pass the competency assessment before accessing
             GxP HTTP operations. Training completion MUST be documented in the
             organization's training records and verified during periodic review
             (§83b). Untrained personnel MUST NOT be granted access to GxP HTTP
             client configurations or audit trail data.
             Reference: 21 CFR 11.10(i), EU GMP Annex 11 §2.
```

### Segregation of Duties

Per 21 CFR 11.10(g) and EU GMP Annex 11 §12, the following role combinations are prohibited:

- **Developer** and **QA Validator** for the same system under validation
- **System Administrator** and **Auditor** for the same deployment
- Data entry and data approval roles within the same HTTP operation (enforced by `conflictingRoles` in §94)
- **Compliance Officer** and **Developer** for the same implementation (independence requirement)

Organizations MAY define additional prohibited role combinations via the `conflictingRoles` mechanism on `HttpOperationPolicy` (§94) based on their specific separation of duties requirements.

---

## Priority Scale Definition

Per GAMP 5 Appendix D.4, each user requirement is assigned a Priority level that governs implementation ordering, specification depth, and validation intensity. Priority is informed by Risk Level (ICH Q9) but is not identical to it: Priority also considers operational dependencies and regulatory sequencing constraints.

| Priority | Definition | Implication |
| -------- | ---------- | ----------- |
| **Critical** | Foundational requirement without which the system cannot operate in a GxP-compliant state. Failure to implement blocks all downstream requirements. | MUST be implemented and validated first. Full IQ/OQ/PQ coverage. No risk acceptance permitted. |
| **High** | Essential requirement that addresses a significant GxP control or operational need. May be Medium-risk but enables or supports Critical requirements. | MUST be implemented before PQ. Full OQ coverage. Risk acceptance requires QA + Management approval. |
| **Medium** | Supporting requirement that strengthens compliance posture or operational capability. Absence does not create a direct regulatory violation if compensating controls exist. | SHOULD be implemented. Targeted OQ coverage. Risk acceptance requires QA approval with documented compensating controls. |

### Priority-to-Risk Mapping Rationale

Priority and Risk Level are correlated but intentionally distinct:

- **High Risk always implies Critical or High Priority** -- requirements with direct patient safety, critical data integrity, or regulatory compliance impact are never deprioritized.
- **Medium Risk may have High Priority** when the requirement is an operational prerequisite for Critical or High-risk requirements. For example:
  - **URS-HTTP-008** (Platform Independence, Medium Risk, High Priority): Transport adapter abstraction is a prerequisite for deploying the HTTP client at all. Without it, no other GxP requirement can be exercised.
  - **URS-HTTP-010** (Change Traceability, Medium Risk, High Priority): Reason-for-change enforcement is required by EU GMP Annex 11 §9/§10 and underpins the audit trail integrity required by URS-HTTP-002 (Critical).

| URS ID | Risk Level | Priority | Rationale for Priority (if different from Risk) |
| ------ | ---------- | -------- | ------------------------------------------------ |
| URS-HTTP-001 | High | Critical | Foundational transport security |
| URS-HTTP-002 | High | Critical | Foundational audit trail |
| URS-HTTP-003 | High | Critical | Required for all audit entries |
| URS-HTTP-004 | High | Critical | Required for all GxP operations |
| URS-HTTP-005 | High | Critical | Required for data integrity assurance |
| URS-HTTP-006 | High | High | Conditional on e-sig use cases |
| URS-HTTP-007 | High | High | Depends on URS-HTTP-002 |
| URS-HTTP-008 | Medium | High | Operational prerequisite: enables deployment of all other requirements |
| URS-HTTP-009 | High | High | Credential protection is security-critical |
| URS-HTTP-010 | Medium | High | Operational prerequisite: underpins URS-HTTP-002 audit completeness per EU GMP Annex 11 §9 |
| URS-HTTP-011 | High | High | Depends on URS-HTTP-002 and URS-HTTP-007 |
| URS-HTTP-012 | High | Critical | Foundational validation lifecycle |
| URS-HTTP-013 | High | High | Depends on URS-HTTP-002 and URS-HTTP-007; extends retention with lifecycle management |
| URS-HTTP-014 | Medium | High | Operational prerequisite: enables all personnel-dependent GxP controls per 21 CFR 11.10(i) |

---

## URS-HTTP-001: Secure HTTP Communication

**Priority:** Critical | **Risk Level:** High

The system MUST provide secure HTTP communication capabilities for transmitting GxP-regulated electronic records between client applications and server endpoints.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Applications need to send and receive data over HTTP/HTTPS to GxP endpoints (batch records, laboratory data, clinical trial submissions) |
| **Acceptance** | All HTTP traffic to GxP endpoints uses TLS 1.2+ with certificate validation |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §85 (HTTPS Enforcement) | §85 (TlsConfig, CertificateValidationPolicy) | OQ-HT-01 through OQ-HT-04 |
| §106 (Certificate Revocation) | §106 (CertificateRevocationPolicy) | OQ-HT-31, OQ-HT-32 |

---

## URS-HTTP-002: Audit Trail for HTTP Operations

**Priority:** Critical | **Risk Level:** High

The system MUST maintain a complete, tamper-evident audit trail of all HTTP operations involving GxP data, recording who performed each operation, when, and what was transmitted.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Regulatory inspectors and QA reviewers need a verifiable record of every HTTP operation that creates, modifies, or transmits GxP electronic records |
| **Acceptance** | Every GxP HTTP operation produces an immutable audit entry with user identity, timestamp, request/response details, and cryptographic integrity hash |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §91 (HttpAuditTrailPort) | §91 (append-only, WAL, SHA-256 chain) | OQ-HT-12, OQ-HT-15 |
| §92 (HttpOperationAuditEntry) | §92 (22+ fields, field size limits) | HAB-001 through HAB-010 |
| §97 (withHttpAuditBridge) | §97 (cross-correlation, failOnAuditError) | DoD 21 |

---

## URS-HTTP-003: User Attribution

**Priority:** Critical | **Risk Level:** High

The system MUST identify the authenticated user responsible for every GxP HTTP operation, ensuring attributability per ALCOA+ principles.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Every GxP data transaction must be traceable to an identified, authenticated individual |
| **Acceptance** | Every audit entry includes the subject identity resolved from the organization's IAM system |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §93 (withSubjectAttribution) | §93 (SubjectProviderPort, GxPActiveRequest) | HAB-011 through HAB-018 |
| §110 (IAM Integration) | §110 (IamIntegrationSurface) | DoD 22 |

---

## URS-HTTP-004: Access Control for HTTP Operations

**Priority:** Critical | **Risk Level:** High

The system MUST enforce role-based access control on HTTP operations, preventing unauthorized users from performing GxP data transactions and enforcing separation of duties.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Only authorized personnel with appropriate roles may execute specific GxP HTTP operations (e.g., batch release, data approval) |
| **Acceptance** | Unauthorized requests are denied with an audit entry; conflicting roles are detected; default-deny posture enforced |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §94 (withHttpGuard, HttpOperationPolicy) | §94 (default-deny, conflictingRoles) | HAB-023 through HAB-033 |
| §95 (withAuthFailureAudit) | §95 (AuthenticationFailureAuditEntry) | HAB-034 through HAB-040 |

---

## URS-HTTP-005: Data Integrity Verification

**Priority:** Critical | **Risk Level:** High

The system MUST verify the integrity of data transmitted over HTTP, detecting any corruption or tampering in transit.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | GxP data (batch records, laboratory results, clinical submissions) must arrive at the destination exactly as sent, with cryptographic proof |
| **Acceptance** | Cryptographic integrity digests computed on request payloads and verified on response payloads; mismatches produce errors and audit entries |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §86 (withPayloadIntegrity) | §86 (PayloadIntegrityConfig, SHA-256) | OQ-HT-05, OQ-HT-06 |
| §89 (withPayloadValidation) | §89 (PayloadValidationConfig) | OQ-HT-09, OQ-HT-20 |

---

## URS-HTTP-006: Electronic Signatures for HTTP Operations

**Priority:** High | **Risk Level:** High

The system MUST support electronic signatures for state-changing HTTP operations that require regulatory sign-off, with signature manifestation, binding, and verification per 21 CFR Part 11.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Certain GxP operations (batch release, data approval, record amendments) require an electronic signature capturing signer identity, meaning, date/time |
| **Acceptance** | Signing ceremony returns `HttpElectronicSignature` with valid `signatureBinding` (SHA-256 hash of request content), `twoFactorVerified: true` when `requireTwoFactor` is enabled, and a corresponding `HttpOperationAuditEntry` recorded in the audit trail; signer identity matches the authenticated subject (`signerId === subjectId`); signature display renders printed name, date/time (ISO 8601 UTC), and meaning per 21 CFR 11.50 via `HttpSignatureDisplayFormat` |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §93a (withElectronicSignature) | §93a (HttpElectronicSignature, signatureBinding) | OQ-HT-13 through OQ-HT-15 |
| §93b (Display Format) | §93b (HttpSignatureDisplayFormat) | DoD 23 |
| §107 (Verification Protocol) | §107 (HttpSignatureVerificationPort) | OQ-HT-33, OQ-HT-34 |
| §114 (Signing Ceremony UI) | §114 (workflow, re-authentication) | DoD 26 |

---

## URS-HTTP-007: Audit Trail Retention and Access

**Priority:** High | **Risk Level:** High

The system MUST retain HTTP audit trail data for the regulatory retention period and provide timely access for regulatory inspectors.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Audit records must be preserved for 5-10 years (per regulatory jurisdiction) and be retrievable for regulatory inspection within 4 hours |
| **Acceptance** | Configurable retention periods; self-contained archives with integrity manifests; queryable audit trail with 12 filter fields; transparent active/archive querying |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §104 (Retention and Archival) | §104 (HttpAuditRetentionPolicy, HttpAuditArchivalPort) | OQ-HT-24 through OQ-HT-27 |
| §105 (Query and Retrieval) | §105 (QueryableHttpAuditTrailPort) | OQ-HT-28 through OQ-HT-30 |
| §104a (Backup/Restore) | §104a (backup procedures, restore verification) | OQ-HT-35, OQ-HT-36 |

---

## URS-HTTP-008: Platform Independence

**Priority:** High | **Risk Level:** Medium

The system MUST support multiple HTTP transport libraries and runtime environments without requiring changes to application code.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Organizations must be able to deploy the HTTP client on different platforms (Node.js, Bun, browsers) and swap transport libraries (Fetch, Axios, Got) without modifying application logic |
| **Acceptance** | Application code depends on HttpClientPort; transport adapters are interchangeable via DI graph configuration |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §26 (HttpClientPort) | §26 (DirectedPort) | PT-001 through PT-005 |
| §39-§44f (Transport Adapters) | §39-§44f (8 adapter implementations) | FA-001 through OF-010 |
| §80a (Adapter Switchover) | §80a (data integrity during switchover) | OQ-HT-38, ASW-001 through ASW-006 |

---

## URS-HTTP-009: Credential Protection

**Priority:** High | **Risk Level:** High

The system MUST protect authentication credentials from exposure in logs, error messages, and audit trail entries.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Authentication tokens, passwords, and API keys must never appear in plaintext in diagnostic output, error messages, or audit entries |
| **Acceptance** | Credential-bearing headers are redacted; error messages are sanitized; audit entries exclude raw credentials |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §87 (withCredentialProtection) | §87 (CredentialRedactionPolicy) | OQ-HT-07, OQ-HT-08, HT-031 through HT-038 |
| §90 (withTokenLifecycle) | §90 (TokenLifecyclePolicy) | OQ-HT-10, OQ-HT-11 |

---

## URS-HTTP-010: Change Traceability

**Priority:** High | **Risk Level:** Medium

The system MUST require a reason for change for all state-changing HTTP operations and maintain configuration change audit trails.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Regulatory requirements mandate that all modifications to GxP records include a documented reason for the change |
| **Acceptance** | State-changing operations (POST/PUT/PATCH/DELETE) blocked without a reason; configuration changes produce audit entries |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §92 (reason field) | §92 (HttpOperationAuditEntry.reason) | OQ-HT-22, OQ-HT-23, HAB-051 through HAB-055 |
| §97 (rejectOnMissingReason) | §97 (blocking enforcement) | OQ-HT-70 through OQ-HT-73 |
| §88 (Configuration Change Control) | §88 (HttpClientConfigurationAuditEntry) | HT-025 through HT-030 |

---

## URS-HTTP-011: Failure Recovery

**Priority:** High | **Risk Level:** High

The system MUST handle catastrophic failures without losing audit data and MUST provide documented recovery procedures.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | When infrastructure components fail (audit backend, cryptographic subsystem, identity provider, clock), GxP operations must be safely blocked and recovery must preserve audit trail integrity |
| **Acceptance** | GxP operations blocked during failures; WAL preserves unconfirmed entries; recovery procedures produce audit entries; 6 failure scenarios documented (CF-01 through CF-06) |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §115 (Catastrophic Failure Recovery) | §115 (CF-01 through CF-06, degraded mode) | CF-001 through CF-010 (chaos tests) |
| §83c (Incident Classification) | §83c (4 severity levels, 16 incident types) | OQ-HT-48, ICF-001 through ICF-010 |

---

## URS-HTTP-012: Validated Deployment

**Priority:** Critical | **Risk Level:** High

The system MUST be deployable in GxP environments following a formal validation lifecycle (IQ/OQ/PQ) with documented evidence.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Organizations need a validation framework to demonstrate that the HTTP client meets its specifications and is fit for intended use in regulated operations |
| **Acceptance** | IQ/OQ/PQ qualification framework covering all identified failure modes; FMEA with quantitative risk scoring; regulatory traceability matrix linking all requirements to tests; GAMP 5 Category 5 classification documented |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §99 (IQ/OQ/PQ) | §99 (qualification framework) | All IQ/OQ/PQ tests |
| §98 (FMEA) | §98 (43 failure modes, S/L/D scoring) | FMEA review |
| §100/§24 (Traceability Matrix) | §100/§24 (62 findings) | All OQ-HT tests |
| §108 (GAMP 5 Classification) | §108 (Category 5, supply chain) | IQ verification |

---

## URS-HTTP-013: Data Retention Lifecycle

**Priority:** High | **Risk Level:** High

The system MUST support configurable data retention policies for all GxP audit records, ensuring records are preserved for the full regulatory retention period and are retrievable, archivable, and disposable through a controlled lifecycle.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Regulatory frameworks mandate that GxP electronic records are retained for jurisdiction-specific periods (5-30 years). Organizations need configurable retention policies, proactive media integrity monitoring, and controlled disposition procedures to maintain compliance throughout the record lifecycle |
| **Acceptance** | Configurable retention periods per jurisdiction (minimum 5 years); archive media integrity monitoring with proactive refresh every 3 years; controlled record disposition with QA approval and audit trail; records remain readable and retrievable throughout the full retention period |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §104 (HttpAuditRetentionPolicy) | §104 (retention periods, archival) | OQ-HT-24 through OQ-HT-27 |
| §104a (Backup/Restore) | §104a (procedures, verification) | OQ-HT-35, OQ-HT-36 |
| §104b (Cross-System Migration) | §104b (migration procedures) | PQ-BP scenarios |
| §104d (Archive Media Integrity) | §104d (media integrity program) | Periodic review evidence |

---

## URS-HTTP-014: Personnel Training

**Priority:** High | **Risk Level:** Medium

The system MUST ensure that all personnel interacting with the HTTP client in GxP environments are trained in the relevant operational procedures, regulatory requirements, and system capabilities before being granted access to GxP HTTP operations.

| Aspect | Requirement |
| ------ | ----------- |
| **Need** | Regulatory frameworks require that personnel operating computerized systems in GxP environments are appropriately trained and assessed for competency before performing GxP-critical activities |
| **Acceptance** | Training program defines 5 roles with specific competency modules; competency assessments with documented pass/fail; re-assessment schedule based on role risk classification; training records maintained and verified during periodic review |

**Traceability:**

| FS Section | DS Section | Test Reference |
| ---------- | ---------- | -------------- |
| §109 (GxP Training Requirements) | §109 (5 roles, competency assessment) | IQ verification of training records |
| §83b (Periodic Review) | §83b (training compliance review area) | Periodic review evidence |

---

## Preliminary Risk Classification (ICH Q9)

Per ICH Q9 (Quality Risk Management), each user requirement is classified by risk level based on the potential impact on patient safety, data integrity, and regulatory compliance. This preliminary classification drives the depth of specification, testing, and validation required per GAMP 5 risk-based approach.

The risk classification below informs the detailed Failure Mode and Effects Analysis (FMEA) in §98 ([20 - HTTP Transport Validation](./compliance/gxp.md)), which assigns Severity, Likelihood, and Detectability scores to 43 failure modes and computes Risk Priority Numbers (RPN). All mitigated RPNs are ≤ 8.

| URS ID | Risk Level | Patient Safety Impact | Data Integrity Impact | Regulatory Impact | Rationale | FMEA Reference |
| ------ | ---------- | --------------------- | --------------------- | ----------------- | --------- | -------------- |
| URS-HTTP-001 | **High** | Indirect — compromised transport could deliver corrupted clinical data | High — unencrypted transmission exposes records to MITM | High — 21 CFR 11.30 violation | TLS enforcement is the foundational control for all GxP HTTP traffic | FM-HT-05 through FM-HT-08 |
| URS-HTTP-002 | **High** | Indirect — missing audit trail prevents investigation of adverse events | Critical — absence of audit records violates ALCOA+ Complete/Enduring | Critical — 21 CFR 11.10(e) violation | Audit trail is the primary evidence for regulatory inspections | FM-HT-01, FM-HT-02 |
| URS-HTTP-003 | **High** | Indirect — unattributed actions cannot be investigated | High — anonymous operations violate ALCOA+ Attributable | High — 21 CFR 11.10(d) violation | Identity must be traceable for every GxP data transaction | FM-HT-03, FM-HT-04 |
| URS-HTTP-004 | **High** | Indirect — unauthorized modifications to batch records could release unsafe product | High — unauthorized access undermines data integrity controls | High — 21 CFR 11.10(d), 11.10(g) violation | Access control prevents unauthorized GxP operations | FM-HT-09 through FM-HT-14 |
| URS-HTTP-005 | **High** | Direct — corrupted clinical data could affect treatment decisions | Critical — undetected corruption violates ALCOA+ Accurate/Original | High — 21 CFR 11.10(c) violation | Payload integrity is the last defense against data corruption in transit | FM-HT-15 through FM-HT-18 |
| URS-HTTP-006 | **High** | Indirect — unsigned batch release lacks accountability | High — unsigned records have no legal standing per 21 CFR Part 11 | Critical — 21 CFR 11.50, 11.70, 11.200 violation | Electronic signatures provide legally binding intent verification | FM-HT-19 through FM-HT-22 |
| URS-HTTP-007 | **High** | Indirect — lost audit data prevents regulatory investigation | Critical — unavailable records violate ALCOA+ Enduring/Available | High — 21 CFR 11.10(b), EU GMP Annex 11 §17 violation | Audit retention is required for the full regulatory retention period | FM-HT-23 through FM-HT-26 |
| URS-HTTP-008 | **Medium** | None — platform choice does not affect patient outcomes | Low — adapter switchover is validated per §80a | Medium — adapter qualification required per GAMP 5 | Transport abstraction enables platform flexibility without re-validation of application code | FM-HT-27, FM-HT-28 |
| URS-HTTP-009 | **High** | Indirect — leaked credentials enable unauthorized access to GxP systems | High — credential exposure enables data integrity breaches | High — 21 CFR 11.300 violation | Credential protection prevents unauthorized access via stolen tokens | FM-HT-29 through FM-HT-32 |
| URS-HTTP-010 | **Medium** | None — change reason does not directly affect patient safety | High — undocumented changes violate ALCOA+ Complete | High — EU GMP Annex 11 §9, §10 violation | Change traceability is fundamental to GxP documentation practices | FM-HT-33 through FM-HT-36 |
| URS-HTTP-011 | **High** | Indirect — lost audit data during failure could hide adverse events | Critical — audit data loss during failure violates ALCOA+ Enduring | High — EU GMP Annex 11 §13, §16 violation | Recovery procedures must preserve audit trail integrity under all failure conditions | FM-HT-37 through FM-HT-40 |
| URS-HTTP-012 | **High** | Indirect — unvalidated system cannot be trusted for GxP decisions | High — unvalidated software undermines confidence in data integrity | Critical — 21 CFR 11.10(a), GAMP 5 Category 5 | Formal validation lifecycle is mandatory for custom GxP software | All FM-HT entries |
| URS-HTTP-013 | **High** | Indirect — lost or unreadable records prevent investigation of patient safety events | Critical — unavailable records after retention period expiry violate ALCOA+ Enduring/Available | High — 21 CFR 211.180, EU GMP Annex 11 §7/§17 violation | Data retention lifecycle management ensures records survive their full regulatory retention period | FM-HT-23 through FM-HT-26, FM-HT-43 |
| URS-HTTP-014 | **Medium** | Indirect — untrained personnel may misconfigure GxP controls affecting patient data | Medium — inadequately trained operators may produce incomplete or inaccurate records | High — 21 CFR 11.10(i), EU GMP Annex 11 §2 violation | Personnel competency is a regulatory prerequisite for all GxP computerized system operations | All FM-HT entries (personnel are a cross-cutting control) |

### Risk Level Definitions (per ICH Q9)

| Level | Definition | Specification Depth | Testing Depth |
| ----- | ---------- | ------------------- | ------------- |
| **High** | Failure could directly or indirectly affect patient safety, cause critical data integrity breach, or result in regulatory non-compliance finding | Full specification with all exception scenarios; comprehensive FMEA analysis; exhaustive testing including negative, boundary, chaos, and load tests | IQ + OQ + PQ with full regression |
| **Medium** | Failure could cause operational disruption or documentation gap but with compensating controls available | Specification of main workflows and key exception scenarios; targeted FMEA analysis | IQ + OQ with targeted regression |
| **Low** | Failure has minimal GxP impact; operational inconvenience only | Key requirements only; risk-based test sampling | IQ + targeted OQ |

---

## Constraints

The following constraints limit the design and deployment of `@hex-di/http-client` in GxP environments:

| ID | Constraint | Rationale | Impact |
| -- | ---------- | --------- | ------ |
| CON-01 | **TypeScript/JavaScript runtime only** | The library is implemented in TypeScript and targets JavaScript runtimes (Node.js, Bun, Deno, browsers). It cannot be deployed in environments that do not support a JavaScript engine. | Organizations using non-JavaScript platforms must implement equivalent controls via their platform's HTTP client libraries. |
| CON-02 | **FNV-1a is non-cryptographic** | The built-in FNV-1a hash chain provides tamper detection but not cryptographic integrity. GxP environments MUST register an `HttpAuditTrailPort` adapter providing SHA-256 chains (§91). | Consumer MUST provide a SHA-256-capable audit trail adapter for regulatory compliance. |
| CON-03 | **No built-in persistent storage** | The library operates in-memory. Audit trail persistence, backup, and archival require consumer-provided storage backends via `HttpAuditSink` and `HttpAuditArchivalPort`. | Consumer MUST implement durable storage per CV-03 and CV-08. |
| CON-04 | **No built-in IAM** | User identity resolution is delegated to the consumer via `HttpSubjectProviderPort`. The library does not authenticate users directly. | Consumer MUST integrate their IAM system per CV-04. |
| CON-05 | **TLS provided by platform** | The library enforces HTTPS URL schemes and reports TLS version, but actual TLS handshake and cipher negotiation are performed by the platform's TLS stack (OpenSSL, BoringSSL, etc.). | Consumer MUST ensure the platform TLS stack is configured and qualified per CV-01. |
| CON-06 | **Single-process scope** | The in-memory retry queue and hash chain operate within a single process. Multi-process or distributed deployments require external coordination (e.g., shared audit storage, distributed WAL). | Consumer MUST architect for cross-process audit consistency in distributed deployments. |

## Assumptions

The following assumptions underpin the URS and must be validated during deployment:

| ID | Assumption | Validation Method | Risk if Invalid |
| -- | ---------- | ----------------- | --------------- |
| ASM-01 | **NTP-synchronized clocks** | The runtime environment provides NTP-synchronized system clocks with drift ≤ 1 second, as required by `HttpClockSourcePort` (§96). | Verify NTP configuration during IQ (IQ-HT-04). | Timestamps in audit trail may be inaccurate, violating ALCOA+ Contemporaneous. |
| ASM-02 | **Trusted runtime environment** | The JavaScript runtime (Node.js, Bun, Deno) is running in a controlled environment where process memory cannot be externally inspected or modified by unauthorized personnel. | Verify host security controls during PQ. | In-memory audit data could be tampered with before persistence, undermining ALCOA+ Original. |
| ASM-03 | **Network availability** | The network infrastructure provides connectivity to GxP endpoints with acceptable latency and availability for operational requirements. | Verify network SLAs during PQ. | HTTP operations may fail due to connectivity issues; the library provides retry and circuit breaker mitigations (§36, §65). |
| ASM-04 | **Consumer implements deferred controls** | The deploying organization implements all 11 consumer-deferred controls (CV-01 through CV-11) per §80b and §25 VP Section 15. | Verify CV completion during IQ-to-OQ gate. | GxP compliance gaps if deferred controls are not addressed. |
| ASM-05 | **Adequate personnel training** | Personnel in all roles (Developer, QA Validator, System Administrator, Compliance Officer, Auditor) complete the training programs defined in §109 before accessing GxP HTTP operations per 21 CFR 11.10(i). | Verify training records during IQ per 21 CFR 11.10(i). | Untrained personnel may misconfigure GxP controls, leading to compliance violations per EU GMP Annex 11 §2. |

---

## URS Coverage Matrix

| URS ID | ALCOA+ Principle(s) | Primary Regulation(s) | FMEA Coverage |
| ------ | -------------------- | --------------------- | ------------- |
| URS-HTTP-001 | Enduring, Accurate | 21 CFR 11.30, EU GMP Annex 11 §12 | FM-HT-05 through FM-HT-08 |
| URS-HTTP-002 | Complete, Consistent, Enduring | 21 CFR 11.10(e), EU GMP Annex 11 §9 | FM-HT-01, FM-HT-02 |
| URS-HTTP-003 | Attributable | 21 CFR 11.10(d), ALCOA+ | FM-HT-03, FM-HT-04 |
| URS-HTTP-004 | Attributable | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 | FM-HT-09 through FM-HT-14 |
| URS-HTTP-005 | Accurate, Original | 21 CFR 11.10(c), 11.10(h) | FM-HT-15 through FM-HT-18 |
| URS-HTTP-006 | Attributable, Legible | 21 CFR 11.50, 11.70, 11.100, 11.200 | FM-HT-19 through FM-HT-22 |
| URS-HTTP-007 | Enduring, Available | 21 CFR 11.10(b), EU GMP Annex 11 §7, §17 | FM-HT-23 through FM-HT-26 |
| URS-HTTP-008 | Consistent | GAMP 5, ALCOA+ Consistent | FM-HT-27, FM-HT-28 |
| URS-HTTP-009 | Accurate | 21 CFR 11.300, OWASP | FM-HT-29 through FM-HT-32 |
| URS-HTTP-010 | Complete, Contemporaneous | 21 CFR 11.10(e), EU GMP Annex 11 §9, §10 | FM-HT-33 through FM-HT-36 |
| URS-HTTP-011 | Complete, Enduring | EU GMP Annex 11 §13, §16, 21 CFR 11.10(c) | FM-HT-37 through FM-HT-40 |
| URS-HTTP-012 | All | GAMP 5, 21 CFR 11.10(a), EU GMP Annex 11 §4 | All FM-HT entries |
| URS-HTTP-013 | Enduring, Available, Complete | 21 CFR 211.180, EU GMP Annex 11 §7, §17, ALCOA+ | FM-HT-23 through FM-HT-26, FM-HT-43 |
| URS-HTTP-014 | Attributable, Complete | 21 CFR 11.10(i), EU GMP Annex 11 §2 | All FM-HT entries (cross-cutting) |

---

_Next: [01 - Overview & Philosophy](./01-overview.md)_
