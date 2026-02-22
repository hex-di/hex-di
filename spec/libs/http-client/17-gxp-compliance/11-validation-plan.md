# 25 - Validation Plan

_Previous: [24 - Regulatory Traceability Matrix](./24-traceability-matrix.md) | Next: N/A_

---

## Document Control

| Field                     | Value                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Document ID**           | VP-HTTP-001                                                                  |
| **Parent Specification**  | SPEC-HTTP-001 v0.1.0                                                         |
| **Package**               | `@hex-di/http-client`                                                        |
| **Validation Plan Version** | 0.1.0                                                                      |
| **Document State**        | Approved — approved for use in IQ/OQ/PQ qualification activities             |
| **Classification**        | GxP Controlled Document                                                      |
| **Effective Date**        | 2026-02-15                                                                   |
| **Document Owner**        | D. Moreau (P-01), HexDI Architecture Team (see README Personnel Registry)    |
| **QA Reviewer**           | L. Hoffmann (P-03), Regulatory Affairs Specialist                            |
| **Training Records**      | Training completion records maintained per §109 role matrix; verified during IQ per 21 CFR 11.10(i) |
| **Next Review Date**      | 2027-02-15 (12 months from Effective Date per EU GMP Annex 11 §11)           |

### Document Approval

| Role                | Name | Title | Signature | Date (ISO 8601) |
| ------------------- | ---- | ----- | --------- | --------------- |
| **Author**          | D. Moreau (P-01) | Principal Architect, HexDI Architecture Team | Git commit f7b676c | 2026-02-14 |
| **Technical Reviewer** | R. Tanaka (P-02) | Senior TypeScript Engineer, HexDI Architecture Team | Git commit f7b676c | 2026-02-15 |
| **QA Approver**     | L. Hoffmann (P-03) | Regulatory Affairs Specialist (independent of development team per 21 CFR 11.10(g)) | Git commit f7b676c | 2026-02-15 |

### Approval Workflow Exemplar

The following is a **worked example** of a completed Document Approval block for reference. The Document Approval table above contains the actual approval record for this VP instance. Organizations creating derivative VP instances for their own deployments MUST populate their Document Approval table with their own named individuals and actual signatures before IQ execution.

| Role                | Name | Title | Signature | Date (ISO 8601) |
| ------------------- | ---- | ----- | --------- | --------------- |
| **Author**          | J. Smith | Senior Validation Engineer | _[wet ink / e-sig]_ | 2026-03-15 |
| **Technical Reviewer** | A. Chen | Principal Software Architect | _[wet ink / e-sig]_ | 2026-03-18 |
| **QA Approver**     | M. Patel | QA Director (independent of development team) | _[wet ink / e-sig]_ | 2026-03-20 |

> **Note:** The QA Approver MUST be independent of the development team per 21 CFR 11.10(g). The Document State transitions from "Draft" to "Approved" only after all three signatures are captured. The Effective Date is set to the QA Approver's signature date. Electronic signatures, if used, MUST comply with 21 CFR 11.50 (printed name, date/time, meaning) and the organization's electronic signature SOP.

### Approval Workflow

This Validation Plan MUST complete the following review cycle before any qualification protocol execution (IQ/OQ/PQ) begins. GAMP 5 §D.8 requires an approved Validation Plan before IQ execution.

| Step | Action | Responsible | Status |
| ---- | ------ | ----------- | ------ |
| 1 | Draft VP with deployment-specific configuration (Sections 7, 12, 13, 14, 15) | Validator / Developer | Complete (2026-02-14) |
| 2 | Technical review of VP content against SPEC-HTTP-001 | R. Tanaka (P-02) | Complete (2026-02-15) |
| 3 | QA review and approval of VP | L. Hoffmann (P-03) | Complete (2026-02-15) |
| 4 | Update Document State from "Draft" to "Approved" | D. Moreau (P-01) | Complete (2026-02-15) |
| 5 | Set Effective Date to QA approval date (ISO 8601) | D. Moreau (P-01) | Complete — Effective Date set to 2026-02-15 |
| 6 | Verify VP version matches SPEC-HTTP-001 version it validates | R. Tanaka (P-02) | Complete — VP 0.1.0 matches SPEC-HTTP-001 v0.1.0 |

```
REQUIREMENT: This Validation Plan MUST NOT be used to govern IQ/OQ/PQ qualification
             activities while in "Draft" state. All three approval signatures (Author,
             Technical Reviewer, QA Approver) in the Document Approval table above MUST
             be populated with named individuals before IQ begins. The QA Approver MUST
             be independent of the development team per 21 CFR 11.10(g) separation of
             duties. The Validation Plan version (currently 0.1.0) MUST match the parent
             specification version (SPEC-HTTP-001) it validates. Any version mismatch
             MUST be resolved before approval.
             Reference: GAMP 5 §D.8, EU GMP Annex 11 §4, 21 CFR 11.10(j).
```

### Revision History

| Revision | Date       | Author | Reviewer | Description                          | QA Approval |
| -------- | ---------- | ------ | -------- | ------------------------------------ | ----------- |
| 0.1.0    | 2026-02-14 | D. Moreau | L. Hoffmann | Initial validation plan from §83a template; aligned with SPEC-HTTP-001 v0.1.0 including query performance SLAs (§105), URS index (§00), Document Approval section, standalone VP instantiation, §80b Consumer Validation Responsibilities, §108a Supplier Assessment | — |
| 0.1.1    | 2026-02-14 | D. Moreau | R. Tanaka | Iteration 3 GxP review: expanded OQ count to 106 (83 functional + 5 adversarial + 18 chaos/load/soak) per §99b-clt; added PQ-HT-14 through PQ-HT-19 for §105 query SLAs; added PQ-BP-05 multi-endpoint workflow scenario; updated qualification protocol counts in VP Section 6; added cross-references to FMEA-to-OQ mapping and Deferred Field Inventory in VP Sections 8 and 15; expanded References table with chaos/load/soak, query SLA, and DoD references | — |
| 0.1.2    | 2026-02-14 | L. Hoffmann | D. Moreau | Iteration 5 audit trail and data integrity review: expanded OQ count to 116 (93 functional + 5 adversarial + 18 chaos/load/soak) per OQ-HT-84 through OQ-HT-93; expanded IQ count to 7 (added IQ-HT-06 encryption port, IQ-HT-07 NTP connectivity); updated traceability matrix version to 7.0 with 58 findings; added IQ-IAM-01 through IQ-IAM-06 to Deferred Field Inventory; added NTP server infrastructure to Deferred Field Inventory | — |
| 0.1.3    | 2026-02-14 | R. Tanaka | L. Hoffmann | Iteration 6 configuration, change control, and operational review: expanded OQ count to 119 (96 functional + 5 adversarial + 18 chaos/load/soak) per OQ-HT-94 through OQ-HT-96 (encryption key lifecycle); expanded PQ count to 21 benchmarks (added PQ-HT-20/21 for meta-audit concurrency and chain verification performance); enhanced CV-05 NTP evidence (redundancy, failover, stratum) and CV-06 KMS evidence (HA, decommissioning, DR); enhanced CV-03 with hash chain verification test and CV-10 with decommissioning SOP; updated FMEA references to 43 failure modes (FM-HT-43 encryption key lifecycle) | — |
| 0.1.4    | 2026-02-14 | D. Moreau | R. Tanaka | Iteration 7 numerical harmonization and gap closure review: corrected grand total test count from 778 to 780 (E2E-021 and E2E-022 added in iteration 4 were not reflected in totals); corrected PQ business process scenario count from 4 to 5; corrected PQ benchmark count from 19 to 21 in VP References; updated traceability matrix from v7.0 to v8.0 with 62 findings (added #59-#62 for configuration drift detection, CAPA procedures, archive media degradation risk, and numerical consistency); added §83b Configuration Drift Detection procedure with quarterly CS parameter comparison requirement; added §83d CAPA Procedures for Recurring Deviations per ICH Q10 §3.2; added §104d Archive Media Integrity Risk Assessment for 5+ year retention per EU GMP Annex 11 §7/§17 | — |
| 0.1.5    | 2026-02-15 | D. Moreau | L. Hoffmann | GxP compliance review remediation (iterations 10-12): added PQ-BP-06 Disaster Recovery RTO Verification scenario with REQUIREMENT block per EU GMP Annex 11 §16 and 21 CFR 11.10(c); updated PQ business process scenario count from 5 to 6 across VP Sections 2, 6, References, and evidence template; added quantitative acceptance thresholds table for CV-01 through CV-11 with 16 measurable pass/fail criteria per GAMP 5 §D.8; added minimum evidence artifacts by test category table per GAMP 5 §D.8; split certificate revocation requirement level by endpoint category (REQUIRED hard-fail for Category 1, RECOMMENDED for Category 2/3) per 21 CFR 11.30; added URS-HTTP-013 (Data Retention Lifecycle) to §00 URS with traceability to §24 forward traceability table; added RTO/RPO table for CF-01 through CF-06 with zero-RPO guarantees per EU GMP Annex 11 §16; added clock correction behavior section in §19 per ALCOA+ Contemporaneous; added competency re-assessment schedule per 21 CFR 11.10(i); elevated biometric confidence thresholds from RECOMMENDED to REQUIRED per 21 CFR 11.200(a)(1)(ii); elevated adapter switchover validation, archive verification, signature re-verification, and cross-chain verification from RECOMMENDED to REQUIRED; added SHA-256 runtime unavailability blocking requirement per 21 CFR 11.10(c); added Review Timeline Log for same-day revision evidence per EU GMP Annex 11 §10; elevated MCP meta-audit logging to MUST for production GxP per 21 CFR 11.10(e); elevated scope lifecycle audit from SHOULD to MUST in GxP mode per ALCOA+ Complete; reclassified withAuthFailureAudit from RECOMMENDED to CONDITIONAL per 21 CFR 11.300; added proactive archive media refresh schedule (3-year cycle) per EU GMP Annex 11 §7; added continuous drift detection for Category 1 endpoints per EU GMP Annex 11 §11; added maximum 14-month interval for catastrophic failure rehearsals per EU GMP Annex 11 §16 | L. Hoffmann (P-03), QA Reviewer, 2026-02-15 |

---

## VP Section 1: Purpose and Scope

This Validation Plan defines the strategy, scope, and acceptance criteria for qualifying `@hex-di/http-client` GxP transport controls in regulated environments. It instantiates the Validation Plan outline defined in SPEC-HTTP-001 §83a.

| Field | Value |
|-------|-------|
| **System Name** | `@hex-di/http-client` GxP Transport Controls |
| **Library Version** | `@hex-di/http-client` 0.1.0 |
| **Ecosystem Adapter Versions** | _[List all port adapter provider libraries and versions, e.g., "@hex-di/guard 0.1.0", "@hex-di/clock 0.1.0"]_ |
| **Applicable Regulations** | FDA 21 CFR Part 11, EU GMP Annex 11, ICH Q9, GAMP 5, MHRA Data Integrity Guidance, WHO TRS 1033 Annex 4, PIC/S PI 041 |
| **GxP Endpoint Inventory** | _[To be completed per deployment: list all endpoints carrying GxP data with their Category (1/2/3) per §84]_ |
| **GAMP 5 Classification** | Category 5 — Custom Applications (per §108) |

### Scope Boundaries

- **In scope:** All GxP transport security combinators (§84-§90d), audit bridge (§91-§97), transport validation (§98-§103), compliance extensions (§104-§107), audit remediations (§108-§118)
- **Out of scope:** Core HTTP client functionality (§1-§78) when used in non-GxP mode, transport adapter platform-specific behavior, application-layer business logic validation, IAM identity provider implementation

---

## VP Section 2: Validation Strategy

| Field | Value |
|-------|-------|
| **Risk Methodology** | ICH Q9 with FMEA scoring per §98 |
| **Qualification Approach** | IQ/OQ/PQ per §99 |
| **Test Coverage Target** | Minimum: 90% requirement coverage; Target: 100% |
| **Mutation Testing Target** | Per §16: ≥85% unit, ≥90% combinator, ≥85% integration, ≥88% aggregate |

### Validation Approach

1. **Risk-Based Testing:** Test intensity is proportional to the risk classification (ICH Q9). Critical risk items (FMEA RPN > initial threshold) receive full OQ coverage. Low-risk items receive sampling-based coverage with documented justification.

2. **Automated Qualification:** IQ/OQ/PQ test execution leverages the automated test suite (780 specified tests across unit, type-level, integration, E2E, and chaos/load/soak categories) with CI/CD integration. The OQ includes 96 functional checks, 5 adversarial checks, and 18 chaos/load/soak checks. The PQ includes 21 performance benchmarks and 6 pharmaceutical business process scenarios (PQ-BP-01 through PQ-BP-06). Manual verification is reserved for deployment-specific configuration checks.

3. **Regression Strategy:** Any code change triggers the full automated test suite. Changes to REQUIRED combinators trigger additional manual review of affected FMEA entries.

---

## VP Section 3: System Description

`@hex-di/http-client` provides a hexagonal-architecture HTTP client for TypeScript applications. GxP transport controls are implemented as composable combinators that wrap `HttpClient` instances with regulatory-compliant security, audit, and access control enforcement.

**Architecture layers:**

1. **Transport Adapters** (§39-§44): Platform-specific HTTP implementations (Fetch, Axios, Got, Node, etc.)
2. **Core Client** (§25-§38): Immutable request/response objects, error types, client port
3. **Security Combinators** (§84-§90d): HTTPS enforcement, payload integrity, credential protection, session management
4. **Audit Bridge** (§91-§97): Audit trail recording, user attribution, RBAC, clock synchronization
5. **GxP Factory** (§103): Port-based GxP combinator composition factory

See SPEC-HTTP-001 §01 for the full architecture diagram and §04 for the dependency graph.

---

## VP Section 4: Roles and Responsibilities

| Role | Assigned To | Responsibilities |
|------|-------------|-----------------|
| **System Owner** | D. Moreau (P-01), Principal Architect | Overall accountability for validation; approves deviations and risk acceptances |
| **QA Reviewer** | L. Hoffmann (P-03), Regulatory Affairs Specialist | Reviews and approves validation documentation; witnesses critical tests |
| **Developer** | R. Tanaka (P-02), Senior TypeScript Engineer | Implements and unit-tests GxP HTTP client adapters; resolves OQ failures |
| **Validator** | L. Hoffmann (P-03), Regulatory Affairs Specialist | Executes IQ/OQ/PQ; maintains FMEA and traceability; documents deviations |
| **System Administrator** | _[To be assigned per deployment — deployment-specific infrastructure role]_ | Deploys infrastructure; configures audit trail storage; manages certificates |

> **Separation of Duties Note:** For this library specification phase, the Validator and QA Reviewer roles are assigned to the same individual (L. Hoffmann, P-03). This is acceptable because the library author's automated test suite (780 specified tests) is the primary evidence, and the Validator role for a library specification involves executing automated test suites rather than independent manual verification. However, for deployment-specific VP instantiation (DP-06), the Validator and QA Reviewer SHOULD be different individuals per EU GMP Annex 11 §12 separation of duties best practice. Organizations MUST document a justification if the same individual serves both roles in a deployment-specific VP, including compensating controls such as independent witness requirements for critical-risk OQ and PQ tests.

### Shared Responsibilities (Library vs. Consumer)

Per §80 (ALCOA+ Mapping), responsibilities are divided between the library and the consuming organization:

| Responsibility | Library Provides | Consumer Must Implement | Reference |
|---------------|-----------------|------------------------|-----------|
| Audit trail recording | `HttpAuditTrailPort` interface, WAL, hash chains | Persistent audit storage backend | 21 CFR 11.10(e), §91 |
| User attribution | `withSubjectAttribution()` combinator | `HttpSubjectProviderPort` adapter | 21 CFR 11.10(d), §93 |
| Access control | `withHttpGuard()` combinator, RBAC types | `HttpAuthorizationPort` adapter, policy definitions, role assignments | 21 CFR 11.10(d)(g), §94 |
| Clock synchronization | `HttpClockSourcePort` interface, drift detection | NTP configuration, clock monitoring | ALCOA+ Contemporaneous, §96 |
| Certificate management | Pin validation, revocation checking | Certificate procurement, rotation | 21 CFR 11.30, §85, §106 |
| Electronic signatures | `withElectronicSignature()` combinator | `HttpSignatureServicePort` adapter | 21 CFR 11.50-11.200, §93a |

---

## VP Section 5: Risk Assessment

| Field | Value |
|-------|-------|
| **FMEA Reference** | §98 (43 failure modes: FM-HT-01 through FM-HT-43) |
| **Highest RPN Before Mitigation** | 36 (FM-HT-27: unaudited audit access; S=4, L=3, D=3) |
| **Highest RPN After Mitigation** | ≤ 8 (all mitigated per §98) |
| **Endpoint Risk Classification** | _[Table mapping each endpoint to Category 1/2/3 per §84]_ |

### Risk Acceptance Criteria

| RPN Range | Action Required |
|-----------|----------------|
| 1-4 | Acceptable. Document in FMEA. |
| 5-8 | Acceptable with monitoring. Document mitigation. |
| 9-16 | Requires additional mitigation or risk acceptance with QA approval. |
| >16 | Not acceptable. Mitigation required before deployment. |

---

## VP Section 6: Qualification Protocol

| Phase | Acceptance Criteria | Reference | Test Count |
|-------|-------------------|-----------|------------|
| **IQ** | All components installed, versions verified, port adapter compatibility confirmed, traceability matrix header fields populated, encryption port accessible, NTP connectivity verified | §99 IQ-HT-01 through IQ-HT-07 | 7 checks |
| **OQ** | All OQ checks pass, adversarial checks pass, chaos/load/soak checks pass, all REQUIRED combinators verified | §99 OQ-HT-01 through OQ-HT-96, OQ-HT-ADV-01 through OQ-HT-ADV-05, OQ-HT-CF-01 through OQ-HT-SK-03 | 119 checks (96 functional + 5 adversarial + 18 chaos/load/soak) |
| **PQ** | Performance benchmarks met under production-like load, end-to-end GxP workflows verified, all §105 query SLAs met | §99 PQ-HT-01 through PQ-HT-21, PQ-BP-01 through PQ-BP-06 | 21 performance checks + 6 business process scenarios |

### IQ-to-OQ Progression Gate

OQ MUST NOT begin until:
1. All IQ checks pass
2. Traceability matrix header fields (§24/§100) are populated (IQ-TM-01)
3. QA Approval column in SPEC-HTTP-001 Revision History is populated for the deployed revision
4. This Validation Plan is approved by QA

### OQ-to-PQ Progression Gate

PQ MUST NOT begin until:
1. All OQ checks pass
2. Any OQ deviations are resolved or risk-accepted with QA approval
3. OQ summary report is reviewed by QA

---

## VP Section 7: Test Environment Specification

| Component | Configuration |
|-----------|--------------|
| **Runtime Environment** | Node.js >= 20.x LTS or Bun >= 1.x; Vitest >= 2.x test runner; TypeScript >= 5.x compiler |
| **Network Isolation** | Localhost-only test HTTP servers (127.0.0.1); no outbound network access during unit/OQ tests; Docker network isolation for integration/PQ tests; production GxP endpoints MUST NOT be reachable from the test environment |
| **Test Certificate Authority** | Self-signed CA generated per test run with SPKI pinning for TLS verification tests; CA certificate and private key stored in test fixtures directory (`tests/fixtures/certs/`); certificates use RSA-2048 with SHA-256 signature |
| **Clock Source** | Deterministic mock `ClockSource` with configurable wall-clock and monotonic time for unit/OQ timestamp tests; system NTP-synchronized clock for integration/PQ tests with drift verification |
| **Audit Sink** | In-memory `HttpAuditTrailPort` implementation for unit/OQ tests with hash chain verification; SQLite-backed persistent storage for PQ tests with defined 30-day test retention |
| **Test Subject Identities** | 5 test user accounts with defined roles: `test-admin` (System Administrator), `test-operator` (Developer), `test-reviewer` (QA Reviewer), `test-auditor` (Auditor), `test-readonly` (read-only); used for attribution and RBAC testing per §94 |
| **Transport Adapters Under Test** | Primary: `FetchHttpClientAdapter` (Node.js native fetch); Secondary: `AxiosHttpClientAdapter`; both MUST pass full OQ suite; additional adapters qualified per deployment needs |

### Test Data Management

- Test data MUST be isolated from production GxP data
- Test audit trail entries MUST be distinguishable from production entries (e.g., via a test scope identifier)
- Test data retention: minimum 1 year after qualification completion
- Test data MUST be available for regulatory inspection

---

## VP Section 8: Traceability Matrix

The regulatory traceability matrix is maintained in §24 (24-traceability-matrix.md) with 62 findings across 8 compliance review cycles (v1.0 through v8.0). Each finding traces forward to OQ checks (OQ-HT-01 through OQ-HT-96), adversarial checks (OQ-HT-ADV-01 through OQ-HT-ADV-05), and chaos/load/soak checks (OQ-HT-CF-01 through OQ-HT-SK-03) as applicable. The FMEA-to-OQ cross-reference table in §98 provides the authoritative mitigation-to-test mapping.

### Traceability Verification (IQ-TM-01)

Before OQ begins, the following 6-step IQ checklist from §24 MUST be executed:

1. Verify all finding IDs are unique and sequential
2. Verify each finding references a valid regulation clause
3. Verify each finding references a valid specification section
4. Verify each finding has a non-empty DoD reference
5. Verify each finding has a non-empty test reference
6. Populate the Last Reviewed date and Reviewer identity in the matrix header

---

## VP Section 9: Deviation Handling

| Deviation Type | Escalation Path | Approval Authority | Max Resolution Time |
|---------------|----------------|-------------------|--------------------|
| **IQ failure** | Investigate root cause → fix → re-execute IQ check | Technical Lead | 5 business days |
| **OQ check failure** | Investigate → assess risk → fix or document risk acceptance | QA Reviewer | 10 business days |
| **PQ threshold failure** | Escalate to System Owner → assess business impact | QA + System Owner | 15 business days |
| **Risk acceptance** | Document justification → identify compensating controls | QA + Management | Before PQ completion |

### Deviation Documentation

Each deviation MUST be documented with:
1. Deviation ID (DEV-HTTP-NNN)
2. Discovery date and discoverer
3. Affected qualification phase (IQ/OQ/PQ)
4. Affected specification section and requirement
5. Root cause analysis
6. Corrective action or risk acceptance justification
7. Impact assessment on other qualification activities
8. Resolution date and resolver
9. QA approval of resolution

---

## VP Section 10: Validation Report

The Validation Report MUST be produced upon completion of all qualification phases and MUST include:

1. **Executive Summary:** Overall compliance assessment (Compliant / Partially Compliant / Non-Compliant)
2. **IQ Results:** Pass/fail for each IQ check with evidence references
3. **OQ Results:** Pass/fail for each OQ check with evidence references
4. **PQ Results:** Performance benchmarks vs. acceptance criteria
5. **Deviation Summary:** List of all deviations, resolutions, and risk acceptances
6. **Open Items:** Any remaining items with risk assessment and remediation plan
7. **Test Coverage Metrics:** Requirement coverage %, mutation testing scores
8. **FMEA Currency:** Confirmation that FMEA is up-to-date with all mitigations verified
9. **Recommendation:** Release for GxP use / Remediation required / Not approved

---

## VP Section 11: Periodic Review Schedule

| Field | Value |
|-------|-------|
| **Review Frequency** | Annual (minimum per §83b) |
| **First Review Due** | 2027-02-15 (12 months from Effective Date, aligned with Document Control Next Review Date) |
| **Review Owner** | L. Hoffmann (P-03), Regulatory Affairs Specialist (QA Reviewer per VP Section 4) |
| **Review Scope** | Per §83b: configuration drift, IQ re-execution, OQ sampling, audit chain integrity, change history, incident review, dependency updates, FMEA currency |

### Revalidation Triggers (per §83b)

Revalidation is required when any of the following occur:

1. Major or minor version upgrade of `@hex-di/http-client`
2. Regulatory requirement changes affecting HTTP transport
3. Security incidents involving GxP HTTP operations
4. Infrastructure changes (new transport adapter, TLS stack upgrade, OS upgrade)
5. FMEA changes (new failure modes identified, RPN recalculation)
6. Periodic review findings requiring remediation

### SemVer-to-Revalidation Mapping (per §117)

| Version Change | Revalidation Scope |
|---------------|-------------------|
| Patch (0.1.x → 0.1.y) | Targeted OQ: re-execute affected OQ checks |
| Minor (0.x.0 → 0.y.0) | Full OQ + targeted PQ |
| Major (x.0.0 → y.0.0) | Full IQ/OQ/PQ |

---

## VP Section 12: GxP Configuration Profile

_[Map each item below to the organization's deployment configuration. Document which RECOMMENDED items are adopted and which are omitted with justification.]_

| Configuration Item | Spec Reference | Requirement Level | Deployment Setting | Justification |
|-------------------|---------------|-------------------|-------------------|---------------|
| `requireHttps()` | §85 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withPayloadIntegrity()` | §86 | REQUIRED (Cat 1), RECOMMENDED (Cat 2/3) | _[enabled/disabled]_ | _[justification]_ |
| `withCredentialProtection()` | §87 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withPayloadValidation()` | §89 | RECOMMENDED | _[enabled/disabled]_ | _[justification]_ |
| `withTokenLifecycle()` | §90 | RECOMMENDED | _[enabled/disabled]_ | _[justification]_ |
| `withAuthenticationPolicy()` | §90 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withSsrfProtection()` | §90a | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withHstsEnforcement()` | §90c | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withCsrfProtection()` | §90d | CONDITIONAL (browser) | _[enabled/disabled]_ | _[justification]_ |
| `withHttpAuditBridge()` | §97 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withSubjectAttribution()` | §93 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| `withHttpGuard()` | §94 | REQUIRED | _[enabled/disabled]_ | _[justification if disabled]_ |
| Certificate revocation (Category 1) | §106 | REQUIRED (hard-fail) | _[mode: hard-fail]_ | _[REQUIRED for Category 1 per 21 CFR 11.30]_ |
| Certificate revocation (Category 2/3) | §106 | RECOMMENDED | _[mode]_ | _[justification if omitted, with documented risk acceptance per ICH Q9]_ |

---

## VP Section 13: IAM Integration

| Field | Value |
|-------|-------|
| **IAM System** | _[e.g., Azure AD, Okta, Auth0, custom]_ |
| **SubjectProviderPort Implementation** | _[How subject identity is resolved from IAM tokens]_ |
| **Role Mapping** | _[How IAM roles map to HttpOperationPolicy definitions]_ |
| **Token Refresh Mechanism** | _[OAuth2/OIDC token endpoint, refresh flow]_ |
| **Deprovisioning Procedure** | _[Effect on active HTTP client sessions when a user is deprovisioned]_ |
| **DPIA Status** | _[REQUIRED for EU deployments per §110; completed/pending/not applicable]_ |

### VP Section 13 IQ Verification Checklist

The following IQ check items MUST be completed for the 6 deployment-specific IAM fields above before OQ begins. These items are verified as part of IQ-HT-05 (Deferred Field Inventory) per §99a.

| IQ Item | Verification | Evidence Required | Acceptance Criteria |
|---------|-------------|-------------------|-------------------|
| IQ-IAM-01 | IAM System field populated | Named IAM provider with version | Provider name, version, and deployment endpoint documented; connectivity test passes |
| IQ-IAM-02 | SubjectProviderPort Implementation documented | Adapter code reference or configuration | Subject resolution from IAM token demonstrated with test user; subjectId correctly populated in HttpOperationAuditEntry |
| IQ-IAM-03 | Role Mapping documented | Role mapping table or configuration | Each IAM role maps to at least one HttpOperationPolicy; no unmapped GxP roles; mapping verified with test subjects |
| IQ-IAM-04 | Token Refresh Mechanism documented | OAuth2/OIDC flow documentation | Token refresh tested end-to-end; refreshed token accepted by withTokenLifecycle(); refresh failure circuit-breaker verified |
| IQ-IAM-05 | Deprovisioning Procedure documented | SOP reference or automation evidence | Deprovisioned test user's active sessions terminated; subsequent HTTP operations rejected with "SUBJECT_RESOLUTION_FAILED" |
| IQ-IAM-06 | DPIA Status documented | DPIA document reference (EU) or N/A justification | For EU deployments: DPIA completed per GDPR Article 35 and §110; for non-EU: formal N/A justification documented |

```
REQUIREMENT: All 6 IQ-IAM verification items (IQ-IAM-01 through IQ-IAM-06) MUST be
             completed and documented before OQ begins. Incomplete IAM verification
             items MUST block IQ-to-OQ progression. Each item MUST include the
             evidence specified in the Evidence Required column and meet the
             Acceptance Criteria. The completed checklist MUST be retained as part
             of the IQ documentation package.
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §3.4, GAMP 5 §D.8.
```

---

## VP Section 14: Data Sovereignty

### Regulatory Framework

Data sovereignty requirements for GxP audit data are driven by the following regulations:

| Regulation | Requirement | Relevance |
|-----------|-------------|-----------|
| **GDPR Articles 44-49** | Restrictions on transfer of personal data to third countries; adequate safeguards required | Audit entries containing subject identifiers (subjectId, signerId) constitute personal data; cross-border transfers require legal basis |
| **GDPR Article 35** | Data Protection Impact Assessment for high-risk processing | GxP audit trail processing involving systematic monitoring and large-scale data collection requires DPIA (see §110) |
| **EU GMP Annex 11 §7** | Data stored at third-party locations requires contractual arrangements ensuring data availability, accessibility, and readability | Cloud-hosted audit trail storage requires Service Level Agreements covering data residency |
| **21 CFR 211.180** | Records required to be maintained or available at the establishment | FDA-regulated audit data MUST be retrievable from the establishment's geographic jurisdiction |
| **China PIPL Articles 38-43** | Cross-border personal information transfer restrictions | If GxP operations involve Chinese subjects, audit data transfers require security assessment or standard contractual clauses |
| **Brazil LGPD Articles 33-36** | International transfer of personal data requirements | If GxP operations involve Brazilian subjects, audit data transfers require adequate protection verification |

### Data Residency Matrix

| Storage Type | Geographic Location | Data Transfer Mechanism | Legal Basis |
|-------------|-------------------|----------------------|-------------|
| **Active Audit Trail** | _[e.g., EU-West-1]_ | _[N/A or approved transfer mechanism]_ | _[GDPR Art. 46/49 — specify: adequacy decision, SCCs, BCRs, or derogation]_ |
| **Archival Storage** | _[e.g., EU-West-1]_ | _[N/A or approved transfer mechanism]_ | _[GDPR Art. 46/49 — specify: adequacy decision, SCCs, BCRs, or derogation]_ |
| **Backup Storage** | _[e.g., EU-Central-1]_ | _[N/A or approved transfer mechanism]_ | _[GDPR Art. 46/49 — specify: adequacy decision, SCCs, BCRs, or derogation]_ |

```
REQUIREMENT: Organizations deploying @hex-di/http-client in jurisdictions with data
             localization requirements (EU/EEA under GDPR, China under PIPL, Brazil
             under LGPD, or other applicable laws) MUST document the legal basis for
             any cross-border transfer of audit trail data in the Data Residency
             Matrix above. The legal basis MUST be specific (e.g., "EU Standard
             Contractual Clauses per GDPR Article 46(2)(c)" rather than generic
             "GDPR Art. 46"). For EU deployments, a DPIA per GDPR Article 35 and
             §110 is REQUIRED. Organizations MUST verify that the chosen audit trail
             storage provider's data residency guarantees are contractually binding
             and auditable.
             Reference: GDPR Articles 44-49, EU GMP Annex 11 §7, 21 CFR 211.180.
```

---

## VP Section 15: Consumer-Deferred Control Risk Acceptance Templates

Per §80b, the following 11 controls are deferred to the deploying organization. Each control MUST be documented using the template below before GxP deployment. Controls that are not applicable MUST still be documented with justification. All 11 controls (CV-01 through CV-11) are verified during IQ via IQ-HT-05 (Deferred Field Inventory check in §99a). The Deferred Field Inventory in §99a includes VP Section 12-14 deployment-specific fields that correspond to these consumer controls.

### Template Structure

For each deferred control, complete the following:

| Field | Description |
|-------|-------------|
| **Control ID** | CV-XX identifier |
| **Control Name** | Deferred control name |
| **Implementation Approach** | How the organization implements this control |
| **Responsible Party** | Name, title, and organizational unit |
| **Evidence of Implementation** | Artifacts demonstrating implementation (e.g., configuration screenshots, test results, SOPs) |
| **Residual Risk Assessment** | Risk remaining after implementation (Low/Medium/High with justification) |
| **Compensating Controls** | Additional controls if the primary implementation is partial |
| **QA Approval** | Signature, date |

### Minimum Evidence Acceptance Criteria

Each consumer-deferred control MUST provide evidence meeting the minimum acceptance criteria below. Evidence that does not meet these criteria MUST be rejected by the QA Approver and remediated before IQ-to-OQ progression.

| Control ID | Minimum Evidence Requirements |
|------------|-------------------------------|
| **CV-01** (TLS Implementation) | (1) TLS configuration dump showing TLS 1.2+ enforced, (2) cipher suite test results (e.g., `nmap --script ssl-enum-ciphers` or equivalent), (3) certificate chain verification log from a test connection to each GxP endpoint |
| **CV-02** (DNS Resolution Security) | (1) DNS resolver configuration documentation, (2) DNSSEC validation test output OR DoH/DoT configuration evidence, (3) static host entry file for Category 1 endpoints (if applicable) |
| **CV-03** (Audit Trail Storage) | (1) Storage backend deployment verification (database version, replication status), (2) ACID guarantee evidence (transaction isolation level), (3) write durability test (insert + immediate power-cycle simulation or equivalent), (4) retention policy configuration, (5) hash chain verification test (insert 100+ entries → verifyAuditChain() returns intact) |
| **CV-04** (Identity Provider) | (1) IAM system connectivity test log, (2) identity resolution verification (test user → subject ID mapping), (3) SoD conflict test (attempt conflicting role assignment → rejected), (4) deprovisioning test (revoke user → active sessions terminated) |
| **CV-05** (Clock Source) | (1) NTP server configuration including server addresses and stratum level (stratum ≤ 3 REQUIRED), (2) drift measurement results showing ≤ 1 second over 24-hour test period, (3) NTP monitoring alert configuration with thresholds (WARNING at 500ms, CRITICAL at 1000ms), (4) NTP infrastructure redundancy documentation (minimum 2 independent NTP sources), (5) NTP failover test results demonstrating automatic switchover to secondary NTP source |
| **CV-06** (Key Management) | (1) KMS/HSM deployment verification including high-availability configuration, (2) encryption/decryption round-trip test, (3) key rotation test (rotate → verify old data still decryptable via re-wrapped DEKs), (4) key ceremony procedure documentation per NIST SP 800-57, (5) key decommissioning test (decommission unused key version → verify still-referenced key versions are protected from decommissioning), (6) KMS failover/disaster recovery test results demonstrating key availability during infrastructure failure |
| **CV-07** (Certificate Revocation) | (1) OCSP responder accessibility test, (2) CRL distribution point accessibility test, (3) revoked certificate detection test (use known-revoked cert → rejected), (4) failure mode documentation (hard-fail vs. soft-fail) |
| **CV-08** (Backup and Restore) | (1) Backup schedule configuration, (2) backup execution log (minimum 3 successful cycles), (3) verified restore test (restore from backup → data integrity verified via hash chain), (4) retention coverage documentation showing backups span regulatory retention period |
| **CV-09** (Network Infrastructure) | (1) Network topology diagram, (2) firewall rule audit showing GxP traffic isolation, (3) load balancer health check configuration, (4) connectivity verification to all GxP endpoints |
| **CV-10** (Operational Procedures) | (1) SOP document list with revision dates, (2) tabletop exercise results for at least 2 incident scenarios from §83c, (3) periodic review schedule documentation, (4) change control approval workflow evidence, (5) decommissioning SOP covering data migration, audit trail preservation, and regulatory notification requirements (see §115.7) |
| **CV-11** (DNS Security Risk Acceptance) | (1) DNSSEC validation evidence OR formal ICH Q9 risk acceptance document, (2) compensating control evidence (certificate pinning test results for Category 1 endpoints), (3) DNS resolution audit logging configuration (if available) |

### Quantitative Acceptance Thresholds

The following quantitative thresholds MUST be met by consumer-deferred controls. These thresholds supplement the minimum evidence requirements above and provide objective pass/fail criteria.

| Control | Metric | Minimum Threshold | Measurement Method |
|---------|--------|-------------------|-------------------|
| **CV-01** | TLS protocol version | ≥ TLS 1.2 (TLS 1.3 RECOMMENDED) | `openssl s_client` or equivalent |
| **CV-01** | Cipher strength | ≥ 128-bit symmetric (≥ 256-bit RECOMMENDED for Category 1) | `nmap --script ssl-enum-ciphers` |
| **CV-01** | Certificate key length | ≥ 2048-bit RSA or ≥ 256-bit ECDSA | Certificate inspection |
| **CV-03** | Hash chain verification | 100% of entries pass `verifyAuditChain()` | Insert 100+ test entries → verify |
| **CV-03** | Write durability | 0 entries lost after simulated failure | Power-cycle simulation or equivalent |
| **CV-05** | NTP drift | ≤ 1 second over 24-hour period | Continuous monitoring |
| **CV-05** | NTP stratum | ≤ 3 | NTP server configuration |
| **CV-05** | NTP failover time | ≤ 30 seconds to secondary source | Failover test |
| **CV-06** | Key rotation round-trip | Old data decryptable with re-wrapped DEKs | Rotation + decryption test |
| **CV-06** | KMS failover RTO | ≤ 5 minutes | Failover test |
| **CV-07** | Revoked cert detection | 100% of known-revoked certs rejected | Test with 3+ revoked certs |
| **CV-08** | Backup restore RTO | ≤ 4 hours | Timed restore test |
| **CV-08** | Backup restore integrity | 100% hash chain intact post-restore | `verifyAuditChain()` on restored data |
| **CV-09** | GxP endpoint connectivity | 100% reachable from deployment environment | Connectivity test to all endpoints |

```
REQUIREMENT: Each consumer-deferred control MUST meet all applicable quantitative
             thresholds in the table above. Evidence MUST include the measured value
             alongside the threshold for each metric. Controls that fail to meet a
             threshold MUST NOT be accepted — the deploying organization MUST either
             remediate to achieve the threshold or document a formal risk acceptance
             per ICH Q9 with QA approval identifying compensating controls.
             Reference: GAMP 5 §D.8, EU GMP Annex 11 §4, 21 CFR 11.10(a).
```

### CV-01: TLS Implementation

| Field | Value |
|-------|-------|
| **Control ID** | CV-01 |
| **Control Name** | TLS Implementation |
| **Regulatory Driver** | 21 CFR 11.30, EU GMP Annex 11 §12 |
| **Library Provides** | `requireHttps()` combinator enforces URL scheme and reports negotiated TLS version |
| **Consumer Must Provide** | Platform TLS stack (OpenSSL, BoringSSL, etc.) providing actual TLS handshake, cipher negotiation, and certificate chain verification |
| **Implementation Approach** | _[Document TLS stack, minimum version (TLS 1.2+), cipher suites, certificate chain]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[TLS configuration dump, cipher suite test results, certificate chain verification]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-02: DNS Resolution Security

| Field | Value |
|-------|-------|
| **Control ID** | CV-02 |
| **Control Name** | DNS Resolution Security |
| **Regulatory Driver** | 21 CFR 11.30, NIST SP 800-81-2 |
| **Library Provides** | Mitigation guidance in §84; `withSsrfProtection()` blocks private IPs post-resolution |
| **Consumer Must Provide** | DNSSEC validation, DNS-over-HTTPS/TLS, or static host resolution for critical GxP endpoints |
| **Implementation Approach** | _[Document DNS resolver, DNSSEC status, DoH/DoT configuration]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[DNS resolver configuration, DNSSEC validation test results]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-03: Audit Trail Persistent Storage

| Field | Value |
|-------|-------|
| **Control ID** | CV-03 |
| **Control Name** | Audit Trail Persistent Storage |
| **Regulatory Driver** | 21 CFR 11.10(e), ALCOA+ Enduring |
| **Library Provides** | `HttpAuditSink` interface; `HttpAuditTrailPort` contract; retry queue for transient failures |
| **Consumer Must Provide** | Durable storage backend (database, append-only log) implementing `HttpAuditSink` with ACID properties |
| **Implementation Approach** | _[Document storage backend, ACID guarantees, replication, retention configuration]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[Storage deployment verification, write durability test results, retention policy]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-04: Identity Provider Integration

| Field | Value |
|-------|-------|
| **Control ID** | CV-04 |
| **Control Name** | Identity Provider Integration |
| **Regulatory Driver** | 21 CFR 11.10(d), ALCOA+ Attributable |
| **Library Provides** | `HttpSubjectProviderPort` contract; `withSubjectAttribution()` combinator |
| **Consumer Must Provide** | IAM system (LDAP, OIDC, SAML) providing authenticated user identity per scope |
| **Implementation Approach** | _[Document IAM system, authentication flow, token validation, session management]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[IAM connectivity test, identity resolution verification, SoD test results]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-05: Clock Source

| Field | Value |
|-------|-------|
| **Control ID** | CV-05 |
| **Control Name** | Clock Source |
| **Regulatory Driver** | ALCOA+ Contemporaneous, EU GMP Annex 11 §9 |
| **Library Provides** | `HttpClockSourcePort` contract; 1-second drift threshold; UTC-Z mandate |
| **Consumer Must Provide** | NTP-synchronized system clock or dedicated time server for the runtime environment; minimum 2 independent NTP sources (stratum ≤ 3); automated drift monitoring with alerting |
| **Implementation Approach** | _[Document NTP server addresses, stratum levels, synchronization frequency, monitoring thresholds, failover configuration, and redundancy strategy]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[NTP configuration, drift measurement results over 24-hour period, NTP failover test results, monitoring alert configuration with WARNING/CRITICAL thresholds]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-06: Key Management

| Field | Value |
|-------|-------|
| **Control ID** | CV-06 |
| **Control Name** | Key Management |
| **Regulatory Driver** | 21 CFR 11.30, EU GMP Annex 11 §12 |
| **Library Provides** | `HttpAuditEncryptionPort` contract; key ceremony procedures in §104c |
| **Consumer Must Provide** | KMS or HSM providing encryption keys for audit data-at-rest encryption; high-availability KMS deployment; documented key ceremony procedures per NIST SP 800-57; key decommissioning procedures |
| **Implementation Approach** | _[Document KMS/HSM provider, key hierarchy (KEK/DEK), rotation schedule (≤ 365 days), ceremony procedures, decommissioning workflow, disaster recovery plan]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[KMS deployment verification with HA configuration, encryption/decryption round-trip test, key rotation test with DEK re-wrap verification, key decommissioning test, KMS failover/DR test results]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable — document if encryption is not required with regulatory justification]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-07: Certificate Revocation Infrastructure

| Field | Value |
|-------|-------|
| **Control ID** | CV-07 |
| **Control Name** | Certificate Revocation Infrastructure |
| **Regulatory Driver** | 21 CFR 11.30, NIST SP 800-52r2 |
| **Library Provides** | `CertificateRevocationPolicy` contract; OCSP/CRL method priority |
| **Consumer Must Provide** | Network access to OCSP responders and/or CRL distribution points |
| **Implementation Approach** | _[Document OCSP/CRL endpoints, failure mode (hard-fail/soft-fail), caching]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[OCSP/CRL endpoint accessibility, revoked certificate detection test]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable — document justification if revocation checking is disabled]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-08: Backup and Restore Infrastructure

| Field | Value |
|-------|-------|
| **Control ID** | CV-08 |
| **Control Name** | Backup and Restore Infrastructure |
| **Regulatory Driver** | EU GMP Annex 11 §7, 21 CFR 11.10(c) |
| **Library Provides** | `HttpAuditArchivalPort` contract; 3-generation GFS backup specification in §104a |
| **Consumer Must Provide** | Backup storage, scheduling, monitoring, and verified restore procedures |
| **Implementation Approach** | _[Document backup strategy, schedule, storage, monitoring, restore procedures]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[Backup infrastructure verification, verified restore test results, retention coverage]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-09: Network Infrastructure

| Field | Value |
|-------|-------|
| **Control ID** | CV-09 |
| **Control Name** | Network Infrastructure |
| **Regulatory Driver** | EU GMP Annex 11 §12, 21 CFR 11.30 |
| **Library Provides** | Transport adapter abstraction; timeout and retry combinators |
| **Consumer Must Provide** | Firewall rules, load balancer configuration, network segmentation for GxP traffic |
| **Implementation Approach** | _[Document network topology, segmentation, firewall rules, load balancing]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[Network topology diagram, firewall rule audit, connectivity verification]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-10: Operational Procedures

| Field | Value |
|-------|-------|
| **Control ID** | CV-10 |
| **Control Name** | Operational Procedures |
| **Regulatory Driver** | EU GMP Annex 11 §10, §13, GAMP 5 |
| **Library Provides** | Incident classification framework (§83c); periodic review triggers (§83b); change control process (§116) |
| **Consumer Must Provide** | SOPs for incident response, periodic review execution, change control approvals, and deviation handling |
| **Implementation Approach** | _[Document SOP inventory, review cycle, training procedures]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[SOP document list, tabletop exercise results, SOP adherence audit]_ |
| **Residual Risk** | _[Low/Medium/High — justification]_ |
| **Compensating Controls** | _[If applicable]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

### CV-11: DNS Security Risk Acceptance

| Field | Value |
|-------|-------|
| **Control ID** | CV-11 |
| **Control Name** | DNS Security Risk Acceptance |
| **Regulatory Driver** | 21 CFR 11.30 (open system controls), NIST SP 800-81-2, ICH Q9 |
| **Library Provides** | DNS security mitigation guidance in §84; `withSsrfProtection()` combinator blocks post-resolution private IPs |
| **Consumer Must Provide** | DNS resolution security controls (DNSSEC validation, DNS-over-HTTPS/DoT) OR formal risk acceptance per ICH Q9 with compensating controls documented |
| **Implementation Approach** | _[Document DNS resolver, DNSSEC status, DoH/DoT configuration. If DNSSEC is not available, document risk acceptance with compensating controls: certificate pinning (§85) as defense-in-depth, static host resolution for critical endpoints, DNS resolution audit logging]_ |
| **Responsible Party** | _[Name, title]_ |
| **Evidence** | _[DNS resolver configuration, DNSSEC validation test results, or ICH Q9 risk acceptance document with compensating control evidence (e.g., certificate pinning verification, static host entries)]_ |
| **Residual Risk** | _[Low/Medium/High — justification. Note: when certificate pinning is configured for all GxP endpoints, residual DNS risk is typically Low because DNS hijacking cannot bypass certificate pin validation]_ |
| **Compensating Controls** | _[Certificate pinning (§85) as primary compensating control; static host resolution for Category 1 endpoints; DNS resolution logging at infrastructure level]_ |
| **QA Approval** | _[Signature]_ | _[Date]_ |

---

## VP Section 16: Pharmaceutical Business Process PQ Scenarios

PQ testing MUST include scenarios representative of actual GxP business processes to demonstrate that the HTTP client is fit for intended use in regulated operations. The following scenarios provide a baseline; organizations MUST supplement with site-specific workflows.

### PQ-BP-01: Batch Record Transmission

| Field | Value |
|-------|-------|
| **Scenario** | Transmit a completed batch record to the quality management system via HTTP POST |
| **Preconditions** | GxP combinator chain active (HTTPS + audit bridge + subject attribution + RBAC + payload integrity); user authenticated with "batch-operator" role |
| **Steps** | (1) Construct batch record payload (JSON, ~50KB), (2) Apply electronic signature via signing ceremony, (3) Submit via POST to GxP Category 1 endpoint, (4) Verify response contains server-assigned batch ID |
| **Expected Results** | (1) Audit entry records operation with subject identity, timestamp, payload digest, signature binding, (2) FNV-1a and SHA-256 hash chains both intact, (3) Response payload integrity digest verified, (4) Audit entry accessible via `QueryableHttpAuditTrailPort` within 4-hour SLA |
| **Acceptance Criteria** | All expected results verified; no deviations |
| **Regulatory Reference** | 21 CFR 11.10(e), 21 CFR 11.50, ALCOA+ Complete |

### PQ-BP-02: Laboratory Result Retrieval

| Field | Value |
|-------|-------|
| **Scenario** | Retrieve laboratory analysis results from a LIMS endpoint for review and approval |
| **Preconditions** | GxP combinator chain active; user authenticated with "lab-reviewer" role; LIMS endpoint classified as Category 2 |
| **Steps** | (1) Submit GET request for laboratory results by sample ID, (2) Verify TLS 1.2+ negotiated, (3) Parse response JSON, (4) Submit approval via PUT with reason-for-change |
| **Expected Results** | (1) GET operation audited with read-only classification, (2) PUT operation audited with reason field populated, (3) Credential headers redacted in audit entry, (4) Cross-correlation ID links retrieval and approval operations |
| **Acceptance Criteria** | All expected results verified; reason-for-change present in audit entry |
| **Regulatory Reference** | 21 CFR 11.10(e), EU GMP Annex 11 §9, ALCOA+ Attributable |

### PQ-BP-03: Clinical Trial Data Submission

| Field | Value |
|-------|-------|
| **Scenario** | Submit clinical trial adverse event report to regulatory submission gateway |
| **Preconditions** | GxP combinator chain active with maximum security (HTTPS + payload integrity + SSRF protection + HSTS + credential protection); user with "clinical-data-manager" role; endpoint classified as Category 1 |
| **Steps** | (1) Construct adverse event report payload, (2) Apply electronic signature (two-factor required), (3) Submit via POST, (4) Verify server acknowledgment, (5) Simulate network failure mid-retry → verify WAL preserves audit entry |
| **Expected Results** | (1) Two-factor verification recorded in signature audit entry, (2) Payload integrity digest verified on both request and response, (3) WAL entry created before acknowledgment, (4) After recovery, WAL drains to persistent audit storage, (5) Full audit chain verifiable end-to-end |
| **Acceptance Criteria** | All expected results verified; zero audit data loss during simulated failure |
| **Regulatory Reference** | 21 CFR 11.50, 21 CFR 11.200, EU GMP Annex 11 §16, ALCOA+ Enduring |

### PQ-BP-04: Audit Trail Inspector Access

| Field | Value |
|-------|-------|
| **Scenario** | Regulatory auditor queries HTTP audit trail for a specific time period and user |
| **Preconditions** | `QueryableHttpAuditTrailPort` registered; auditor role granted read-only access; audit data spanning 30 days available; archived data from 60+ days ago available via `HttpAuditArchivalPort` |
| **Steps** | (1) Query by time range (last 7 days) and subject ID, (2) Verify programmatic query returns within §105 SLA (query(): 5s, getByRequestId(): 500ms, getByEvaluationId(): 2s, count(): 3s), (3) Export results as JSON per EU GMP Annex 11 §8, (4) Verify hash chain integrity of returned entries, (5) Verify meta-audit entry records the query itself, (6) Query archived data spanning 60+ days ago and verify transparent retrieval, (7) Verify total end-to-end audit data availability within 4-hour human-access SLA including archived data restore if needed |
| **Expected Results** | (1) Query returns matching entries with all ALCOA+ metadata preserved, (2) Programmatic query response times meet §105 SLAs for active data, (3) Exported JSON conforms to RFC 8259, (4) Hash chain verification returns true, (5) Meta-audit entry records auditor identity, query parameters, and timestamp, (6) Archived data transparently queryable, (7) Total audit data availability (including archive restore) within 4-hour SLA |
| **Acceptance Criteria** | All expected results verified; programmatic query SLAs per §105 met for active data; end-to-end audit data availability (including archived data restore) within 4-hour human-access SLA per §105 REQUIREMENT |
| **Regulatory Reference** | 21 CFR 11.10(b), EU GMP Annex 11 §8, ALCOA+ Available |

> **SLA Clarification:** The "4-hour SLA" in §105 refers to the human-access time for a regulatory inspector to obtain audit data, which includes any required archive restoration, data transfer, and export operations. The seconds-based SLAs in §105 (`query()`: 5s, `getByRequestId()`: 500ms, `getByEvaluationId()`: 2s, `count()`: 3s, `export()`: 60s per 10K entries) are programmatic response time SLAs for the `QueryableHttpAuditTrailPort` API operating on active (hot) storage. Both SLA types apply: programmatic SLAs govern API response times, while the 4-hour SLA governs total inspector access time including archived data.

### PQ-BP-05: Multi-Endpoint GxP Workflow Under Load

| Field | Value |
|-------|-------|
| **Scenario** | Execute a mixed-operation workflow (GET + POST + PUT) across multiple GxP endpoints concurrently, verifying all §105 query SLAs are met under realistic conditions |
| **Preconditions** | GxP combinator chain active; 100K audit entries pre-populated; multiple concurrent users with distinct roles; all transport security combinators active |
| **Steps** | (1) Execute 50 concurrent mixed operations across Category 1 and Category 2 endpoints, (2) Query audit trail using `query()` with multi-field filter over 100K entries, (3) Retrieve specific entry using `getByRequestId()`, (4) Retrieve correlated entries using `getByEvaluationId()`, (5) Execute `count()` with filter, (6) Export 10K entries using `export()` |
| **Expected Results** | (1) All operations complete with correct audit trail entries, (2) `query()` returns within 5s per §105 SLA, (3) `getByRequestId()` returns within 500ms, (4) `getByEvaluationId()` returns within 2s, (5) `count()` returns within 3s, (6) `export()` completes within 60s for 10K entries |
| **Acceptance Criteria** | All §105 query SLAs met; zero audit data loss; all hash chains intact; PQ-HT-14 through PQ-HT-19 acceptance criteria satisfied |
| **Regulatory Reference** | EU GMP Annex 11 §7, 21 CFR 11.10(b), ALCOA+ Available |

### PQ-BP-06: Disaster Recovery RTO Verification

| Field | Value |
|-------|-------|
| **Scenario** | Validate that catastrophic failure recovery procedures (CF-01 through CF-06, §115) meet the Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) defined in §115 |
| **Preconditions** | GxP combinator chain active; 10K audit entries in active storage; WAL containing 50 unconfirmed entries; backup available from CV-08 |
| **Steps** | (1) Simulate CF-01 (audit backend + WAL full): disconnect audit backend, fill WAL to capacity, (2) Start timer, (3) Execute recovery procedure per §115.1, (4) Stop timer when all WAL entries are confirmed and GxP operations resume, (5) Verify zero data loss (RPO = 0), (6) Record recovery time, (7) Simulate CF-04 (clock source failure): inject invalid timestamps, (8) Start timer, (9) Execute recovery procedure per §115.4, (10) Stop timer when clock stabilization is confirmed and GxP operations resume |
| **Expected Results** | (1) CF-01 recovery completes within RTO ≤ 4 hours, (2) Zero audit entries lost during CF-01 (RPO = 0 verified via verifyAuditChain()), (3) CF-04 recovery completes within RTO ≤ 1 hour, (4) All recovery events produce ConfigurationAuditEntry records, (5) Hash chain integrity preserved across both recovery scenarios |
| **Acceptance Criteria** | All tested CF scenarios recover within their defined RTOs (§115 RTO/RPO table); zero data loss confirmed for all scenarios; recovery audit entries present and complete |
| **Regulatory Reference** | EU GMP Annex 11 §16 (business continuity), 21 CFR 11.10(c) (record protection) |

```
REQUIREMENT: PQ-BP-06 MUST validate RTO achievability for at least CF-01 (audit
             backend failure — highest data volume risk) and CF-04 (clock source
             failure — strictest RTO at 1 hour). Organizations MUST document the
             measured recovery time for each tested scenario alongside the defined
             RTO from §115. If measured recovery time exceeds the defined RTO,
             the deviation MUST be documented and remediated via the CAPA process
             (§83d) before PQ sign-off. Organizations MAY test additional CF
             scenarios (CF-02, CF-03, CF-05, CF-06) based on their site-specific
             risk assessment per ICH Q9.
             Reference: EU GMP Annex 11 §16, 21 CFR 11.10(c), §115 RTO/RPO table.
```

---

## VP Section 17: Deployment Readiness Placeholder Inventory

This section provides a machine-parseable inventory of every deployment-specific placeholder field across the entire specification suite (files 00-25). Each placeholder MUST be populated by the deploying organization before IQ-to-OQ progression. The IQ-HT-05 Deferred Field Inventory check in §99a verifies completion of this inventory.

### Inventory Format

| # | Document | Section | Placeholder Text | Required Content | Regulatory Driver | IQ Check |
|---|----------|---------|-----------------|-----------------|-------------------|----------|
| PH-01 | README | Document Approval | _[Name]_, _[Title]_, _[Signature]_, _[YYYY-MM-DD]_ (Author) | Named individual, title, Git commit SHA or e-sig, ISO 8601 date | 21 CFR 11.50, 11.100 | IQ-HT-05 / DP-01 |
| PH-02 | README | Document Approval | _[Name]_, _[Title]_, _[Signature]_, _[YYYY-MM-DD]_ (Technical Reviewer) | Named individual (different from Author), title, signature, date | 21 CFR 11.50, 11.100 | IQ-HT-05 / DP-02 |
| PH-03 | README | Document Approval | _[Name]_, _[Title]_, _[Signature]_, _[YYYY-MM-DD]_ (QA Approver) | Named individual (independent of dev team), title, signature, date | 21 CFR 11.10(g), 11.50 | IQ-HT-05 / DP-02 |
| PH-04 | README | QA Reviewer | — (to be assigned per deployment) | Named QA reviewer with title | EU GMP Annex 11 §4 | IQ-HT-05 / DP-01 |
| PH-05 | README | Revision History | — (QA Approval column, all rows) | QA approver name, role, ISO 8601 date per deployed revision | EU GMP Annex 11 §4, 21 CFR 11.10(a) | IQ-HT-05 / DP-04 |
| PH-06 | §25 VP | Document Approval | _[Name]_, _[Title]_, _[Signature]_, _[YYYY-MM-DD]_ (all 3 rows) | Named individuals with signatures per VP Approval Workflow Exemplar | GAMP 5 §D.8 | IQ-HT-05 / DP-05 |
| PH-07 | §25 VP | Document Control | _[To be set upon QA approval]_ (Effective Date) | ISO 8601 date of QA approval | GAMP 5 §D.8 | IQ-HT-05 / DP-05 |
| PH-08 | §25 VP | Document Control | _[To be assigned per deployment]_ (QA Reviewer) | Named QA reviewer | EU GMP Annex 11 §4 | IQ-HT-05 / DP-05 |
| PH-09 | §25 VP | Document Control | _[Reference to training completion records...]_ (Training Records) | Document management system reference | 21 CFR 11.10(i) | IQ-HT-05 |
| PH-10 | §25 VP | Approval Workflow | _[Pending]_ (Steps 1-6) | Completed/Date per step | GAMP 5 §D.8 | IQ-HT-05 / DP-05 |
| PH-11 | §25 VP | VP Section 1 | _[List all port adapter provider libraries...]_ (Ecosystem Adapter Versions) | Deployed adapter library names and versions | EU GMP Annex 11 §4 | IQ-HT-01 |
| PH-12 | §25 VP | VP Section 1 | _[To be completed per deployment...]_ (GxP Endpoint Inventory) | All GxP endpoints with Category 1/2/3 classification | 21 CFR 11.10(a) | IQ-HT-02 |
| PH-13 | §25 VP | VP Section 7 | _[CI/CD pipeline...]_, _[Test user accounts...]_, _[Transport adapters...]_ | Test environment configuration details | GAMP 5 §D.8 | IQ-HT-03 |
| PH-14 | §25 VP | VP Section 11 | _[Date: 12 months after initial validation]_, _[Name, title]_ | First review date, review owner | EU GMP Annex 11 §11 | IQ-HT-05 |
| PH-15 | §25 VP | VP Section 12 | _[enabled/disabled]_, _[justification]_ (all 12 config items) | Deployment setting + justification for each combinator | 21 CFR 11.10(d) | IQ-HT-04 |
| PH-16 | §25 VP | VP Section 13 | _[e.g., Azure AD, Okta...]_ (all 6 IAM fields) | IAM system details per IQ-IAM-01 through IQ-IAM-06 | 21 CFR 11.10(d) | IQ-IAM-01 to IQ-IAM-06 |
| PH-17 | §25 VP | VP Section 14 | _[e.g., EU-West-1]_, _[N/A or approved transfer mechanism]_, _[GDPR Art. 46/49...]_ | Data residency locations, transfer mechanisms, legal bases | GDPR Articles 44-49, EU GMP Annex 11 §7 | IQ-HT-05 |
| PH-18 | §25 VP | VP Section 15 | CV-01 through CV-11 template fields (Implementation Approach, Responsible Party, Evidence, etc.) | Completed consumer validation templates with evidence | EU GMP Annex 11 §4, GAMP 5 §D.4 | IQ-HT-05 / DP-06 |
| PH-19 | §25 VP | References | _[List deployed adapter libraries]_, _[versions per deployment]_ | Deployed ecosystem adapter identifiers and versions | GAMP 5 §D.3 | IQ-HT-01 |

### Placeholder Completion Metrics

| Metric | Target | Calculation |
|--------|--------|-------------|
| **Placeholder Completion Rate** | 100% before IQ-to-OQ progression | (Populated placeholders / Total placeholders) x 100 |
| **Regulatory-Critical Placeholders** | PH-01 through PH-06, PH-18 | These 7 items are IQ-blocking; incomplete = IQ failure |
| **Total Placeholder Fields** | 19 items (PH-01 through PH-19) | Each item may contain multiple sub-fields |

```
REQUIREMENT: The deploying organization MUST populate ALL 19 placeholder items
             (PH-01 through PH-19) before IQ-to-OQ progression. The IQ-HT-05
             Deferred Field Inventory check in §99a MUST verify that no placeholder
             text (patterns: "_[...]_", "---", "_[Pending]_") remains in the deployed
             specification documents. Automated grep/search for placeholder patterns
             is RECOMMENDED as part of IQ-HT-05 execution. Any remaining placeholder
             text constitutes an IQ failure that MUST be resolved before OQ begins.
             Reference: GAMP 5 §D.8, EU GMP Annex 11 §4, 21 CFR 11.10(j).
```

---

## VP Section 18: Test Execution Evidence Template

This section defines the structure, format, and content requirements for the IQ/OQ/PQ execution evidence package. The evidence package is produced during qualification execution and forms the primary audit artifact for regulatory inspection.

### Evidence Package Structure

```
evidence/
  ├── IQ/
  │   ├── IQ-HT-01_environment_verification.md
  │   ├── IQ-HT-02_endpoint_inventory.md
  │   ├── IQ-HT-03_test_environment.md
  │   ├── IQ-HT-04_configuration_profile.md
  │   ├── IQ-HT-05_deferred_field_inventory.md
  │   ├── IQ-HT-06_encryption_port.md
  │   ├── IQ-HT-07_ntp_connectivity.md
  │   ├── IQ-IAM-01_through_06.md
  │   └── attachments/
  │       ├── tls_config_dump.txt
  │       ├── ntp_drift_measurement.csv
  │       └── iam_connectivity_log.txt
  ├── OQ/
  │   ├── OQ-HT-01_through_96_functional.md
  │   ├── OQ-HT-ADV-01_through_05_adversarial.md
  │   ├── OQ-HT-CF-01_through_SK-03_chaos_load_soak.md
  │   ├── ci_pipeline_run.json
  │   └── attachments/
  │       ├── test_run_output.log
  │       ├── mutation_testing_report.html
  │       └── coverage_report.html
  ├── PQ/
  │   ├── PQ-HT-01_through_21_benchmarks.md
  │   ├── PQ-BP-01_through_06_business_processes.md
  │   └── attachments/
  │       ├── performance_results.csv
  │       ├── audit_trail_query_timings.csv
  │       └── hash_chain_verification.log
  └── summary/
      ├── validation_report.md
      ├── deviation_log.md
      └── sign_off.md
```

### Per-Test Evidence Record Format

Each IQ/OQ/PQ check MUST be documented using the following template:

| Field | Content | ALCOA+ Principle |
|-------|---------|-----------------|
| **Test ID** | IQ-HT-XX / OQ-HT-XX / PQ-HT-XX | Attributable |
| **Test Title** | Descriptive title from §99 | Legible |
| **Executed By** | Full name of tester | Attributable |
| **Execution Date** | ISO 8601 datetime (YYYY-MM-DDTHH:MM:SSZ) | Contemporaneous |
| **Witnessed By** | Full name of witness (REQUIRED for Critical-risk tests, RECOMMENDED for High-risk) | Attributable |
| **Environment** | Test environment identifier from VP Section 7 | Accurate |
| **Preconditions Verified** | Checklist of prerequisites confirmed before execution | Complete |
| **Test Steps Executed** | Step-by-step record of actions taken (numbered, matching §99) | Legible, Complete |
| **Expected Result** | Verbatim from §99 specification | Accurate |
| **Actual Result** | Observed result with supporting evidence references | Original, Accurate |
| **Pass/Fail** | PASS or FAIL (objective determination) | Accurate |
| **Evidence Attachments** | List of attached artifacts (screenshots, logs, exports) with filenames | Enduring, Available |
| **Deviation Reference** | DEV-HTTP-NNN if applicable, or "None" | Complete |
| **Comments** | Additional observations or notes | Complete |

### Minimum Evidence Artifacts by Test Category

Each test category MUST include the minimum evidence artifacts specified below. Evidence packages missing required artifacts for a given category MUST be rejected by the QA Approver and remediated before qualification progression.

| Test Category | Minimum Evidence Artifacts | Format | Rationale |
|---------------|---------------------------|--------|-----------|
| **IQ (Installation)** | (1) Environment configuration dump, (2) version verification screenshot or CLI output, (3) connectivity test log, (4) deferred field inventory completion evidence | Plain text, screenshots (PNG), JSON | Demonstrates correct installation and configuration baseline |
| **OQ — Functional (Automated)** | (1) CI pipeline run metadata (JSON), (2) Vitest JSON reporter output with per-test pass/fail, (3) mutation testing report (HTML/JSON), (4) code coverage report (HTML/JSON), (5) audit trail entries generated during test execution (JSON export) | JSON, HTML | Demonstrates functional correctness with objective, machine-generated evidence |
| **OQ — Functional (Manual)** | (1) Step-by-step execution log with screenshots at each verification point, (2) system output captures (console logs, network traces), (3) configuration state before and after test | Markdown, PNG, plain text | Demonstrates manual verification with visual evidence at each decision point |
| **OQ — Adversarial** | (1) Attack payload logs, (2) system response captures showing rejection, (3) audit trail entries showing detection and recording of adversarial attempts | JSON, plain text | Demonstrates security controls detect and reject adversarial inputs |
| **OQ — Chaos/Load/Soak** | (1) Chaos injection parameters and timeline, (2) system behavior logs during fault injection, (3) recovery verification evidence post-chaos, (4) load test results with percentile latencies (p50/p95/p99), (5) soak test memory/resource utilization graphs | JSON, CSV, PNG (graphs) | Demonstrates resilience under failure conditions and sustained load |
| **PQ — Performance Benchmarks** | (1) Benchmark execution parameters, (2) raw timing data (CSV), (3) statistical summary with mean/median/p95/p99, (4) comparison against §99c thresholds | CSV, JSON, Markdown | Demonstrates performance meets specified thresholds under production-representative conditions |
| **PQ — Business Process Scenarios** | (1) End-to-end workflow execution log, (2) audit trail query results showing complete operation chain, (3) electronic signature verification evidence (if applicable), (4) hash chain integrity verification output | JSON, Markdown, plain text | Demonstrates fitness for intended pharmaceutical use |

```
REQUIREMENT: Evidence packages MUST include all minimum evidence artifacts specified
             in the table above for each applicable test category. Partial evidence
             packages MUST NOT be accepted for qualification sign-off. When a test
             category includes both automated and manual execution, the evidence
             artifacts for both execution modes MUST be present. Screenshots MUST
             be timestamped (embedded EXIF or filename convention YYYY-MM-DDTHH-MM-SS)
             and MUST NOT be cropped in a way that removes relevant system context
             (window title bars, timestamps, status indicators).
             Reference: GAMP 5 §D.8, 21 CFR 11.10(b), EU GMP Annex 11 §4,
             ALCOA+ (Legible, Complete, Original).
```

### Evidence Quality Requirements

```
REQUIREMENT: Test execution evidence MUST satisfy all ALCOA+ principles:
             (1) Attributable: every test record identifies the tester by full name
                 and the witness (when required) by full name,
             (2) Legible: all evidence is in machine-readable format (Markdown, JSON,
                 CSV, or plain text) with no handwritten annotations,
             (3) Contemporaneous: execution timestamps are recorded at the time of
                 test execution (not retrospectively filled),
             (4) Original: raw test output (CI logs, console output) is preserved
                 as primary evidence; summarized results are secondary,
             (5) Accurate: actual results are recorded verbatim from system output,
                 not paraphrased or interpreted,
             (6) Complete: all test steps are documented including failures and
                 deviations; no test records are deleted,
             (7) Consistent: timestamps across IQ/OQ/PQ evidence are monotonically
                 ordered per qualification phase,
             (8) Enduring: evidence package is stored in the organization's validated
                 document management system with retention per §104,
             (9) Available: evidence package is retrievable for regulatory inspection
                 within 4 hours per §105 SLA.
             Reference: 21 CFR 11.10(b), 21 CFR 11.10(e), EU GMP Annex 11 §9,
             ALCOA+ (all 9 principles), MHRA Data Integrity Guidance §6.14.
```

### Automated Test Evidence Integration

For OQ checks executed via automated CI/CD pipeline (as specified in VP Section 2):

| Evidence Source | Format | Retention | Integration |
|----------------|--------|-----------|-------------|
| **CI Pipeline Run** | JSON (pipeline metadata: run ID, trigger, commit SHA, duration) | Per §104 retention policy | Pipeline run ID linked to each OQ-HT-XX record |
| **Test Runner Output** | Vitest JSON reporter output | Per §104 retention policy | Raw test results with pass/fail per test case |
| **Mutation Testing Report** | Stryker HTML/JSON report | Per §104 retention policy | Mutation scores per module vs. §16 targets |
| **Coverage Report** | Istanbul/V8 HTML/JSON report | Per §104 retention policy | Line/branch coverage per module |
| **Audit Trail Entries** | JSON export via `QueryableHttpAuditTrailPort.export()` | Per §104 retention policy | Audit entries generated during OQ execution |
| **Hash Chain Verification** | JSON (`verifyAuditChain()` output) | Per §104 retention policy | Chain integrity verification for all OQ-generated entries |

```
REQUIREMENT: When OQ checks are executed via automated CI/CD pipeline, the pipeline
             run metadata MUST be captured as evidence and linked to each OQ test
             record. The pipeline run MUST include: (1) Git commit SHA of the tested
             code, (2) library version under test, (3) pipeline run identifier,
             (4) execution start and end timestamps in ISO 8601, (5) environment
             identifier matching VP Section 7. Manual OQ checks (if any) MUST use
             the Per-Test Evidence Record Format above. The Validation Report
             (VP Section 10) MUST reference both automated and manual evidence
             packages.
             Reference: GAMP 5 §D.8, 21 CFR 11.10(b), EU GMP Annex 11 §4.
```

### Evidence Retention and Integrity

| Requirement | Value | Reference |
|-------------|-------|-----------|
| **Minimum Retention** | Same as audit trail retention (§104: 5 years minimum, jurisdiction-dependent) | 21 CFR 211.180, EU GMP Annex 11 §17 |
| **Integrity Protection** | Evidence package MUST be hash-protected (SHA-256 manifest of all files) | ALCOA+ Original |
| **Tamper Detection** | Evidence package MUST be stored in a system that detects unauthorized modification | 21 CFR 11.10(e) |
| **Backup** | Evidence package included in organization's backup procedures per CV-08 | EU GMP Annex 11 §7 |

---

## References

| Document | Identifier | Version |
|----------|-----------|---------|
| Parent Specification | SPEC-HTTP-001 | 0.1.0 |
| URS | URS-HTTP (§00) | 0.1.0 |
| FMEA | §98 | Per SPEC-HTTP-001 |
| IQ/OQ/PQ Protocol | §99 (IQ: 7 checks, OQ: 119 checks, PQ: 21 benchmarks + 6 BP scenarios) | Per SPEC-HTTP-001 |
| Regulatory Traceability Matrix | §24/§100 (62 findings) | v8.0 |
| GxP Compliance Guide | §17 | Per SPEC-HTTP-001 |
| Query Performance SLAs | §105 (5 operation SLAs + archive-spanning SLA) | Per SPEC-HTTP-001 |
| Chaos/Load/Soak Tests | §16/§99b-clt (10 chaos + 5 load + 3 soak) | Per SPEC-HTTP-001 |
| Definition of Done | §16 (DoD 20-27, 780 specified tests) | Per SPEC-HTTP-001 |
| Ecosystem Port Adapter Providers | _[List deployed adapter libraries]_ | _[versions per deployment]_ |

---

_Previous: [24 - Regulatory Traceability Matrix](./24-traceability-matrix.md) | Next: N/A_
