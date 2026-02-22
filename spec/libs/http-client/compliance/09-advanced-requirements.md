# GxP Compliance — @hex-di/http-client: Advanced Requirements (§108–§118)

> Part of the `@hex-di/http-client` GxP compliance sub-document suite.
> [Governance index](./gxp.md) | [Sub-document index](./README.md)

---

## Compliance Audit v5 Findings


---

This document addresses eleven minor findings identified during the v5.0 GxP regulatory compliance audit of the HTTP client specification (sections 1-107). All findings were rated Minor — no Critical or Major gaps were identified. These remediations complete the compliance posture for FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ data integrity requirements.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Audit Findings Index

| Finding ID | Regulation           | Section | Summary                                       |
| ---------- | -------------------- | ------- | --------------------------------------------- |
| F-GAMP-01  | GAMP 5               | §108    | No explicit GAMP 5 category statement         |
| F-CFR-02   | 21 CFR 11.10(i)      | §109    | No training requirements section              |
| F-AX11-01  | EU GMP Annex 11 §3.4 | §110    | No IAM integration guidance                   |
| F-AX11-02  | EU GMP Annex 11 §6   | §111    | No semantic validation distinction            |
| F-SEC-01   | 21 CFR 11.30         | §112    | Incomplete CORS specification                 |
| F-SEC-02   | General practice     | §113    | No client-side rate limiting for GxP          |
| F-CFR-01   | 21 CFR 11.50         | §114    | No prescribed e-signature capture UI workflow |
| F-ERR-01   | EU GMP Annex 11 §13  | §115    | No catastrophic failure recovery guidance     |
| F-CC-01    | EU GMP Annex 11 §10  | §116    | No formal spec change control process         |
| F-CC-02    | GAMP 5               | §117    | SemVer not linked to revalidation             |
| F-INT-01   | GAMP 5               | §118    | Port dependencies not version-locked          |

---

## 108. Software Classification (GAMP 5)

_Remediates: F-GAMP-01 — No explicit GAMP 5 category statement_

### Classification

The `@hex-di/http-client` library is classified as **GAMP 5 Category 5 (Custom Applications)** software when deployed in GxP environments.

| GAMP 5 Attribute        | Value                         | Justification                                                                                                                                                                                                                                                                                |
| ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**            | 5 — Custom Applications       | The library provides configurable combinators that organizations compose into custom GxP HTTP client pipelines. The `createGxPHttpClient` factory (§103) and per-endpoint `HttpOperationPolicy` definitions (§94) constitute custom configuration that directly affects GxP data processing. |
| **Risk Classification** | High                          | HTTP operations create, modify, and transmit GxP-regulated electronic records (batch records, laboratory data, clinical trial submissions). Failure modes include data integrity violations, audit trail gaps, and unauthorized access (see FMEA §98).                                       |
| **V-Model Phase**       | Design through PQ             | IQ/OQ/PQ qualification framework (§99) maps to the GAMP 5 V-model: user requirements (§00) → functional specification → design specification → code → unit testing → integration testing → OQ → PQ. Traceability from URS to test execution is documented in §100 (Regulatory Traceability Matrix). |
| **Testing Approach**    | Risk-based with full coverage | 780 specified tests (272 core + 40 transport adapters + 450 GxP + 18 chaos/load/soak; see §103 summary and §16) cover all failure modes identified in FMEA (§98). FMEA-to-OQ traceability ensures every mitigation has corresponding test coverage.                                                                  |

### Category 5 Implications

```
REQUIREMENT: When deploying @hex-di/http-client in GxP environments, organizations
             MUST classify the library as GAMP 5 Category 5 software in their
             Computerized System Inventory. The classification MUST be documented
             in the Validation Plan (§83a) section 2 (System Description) and
             referenced in the risk assessment (FMEA §98).
             Reference: GAMP 5 Appendix M4, ICH Q9.
```

```
REQUIREMENT: Category 5 classification REQUIRES that the full IQ/OQ/PQ qualification
             framework (§99) be executed before GxP deployment. Abbreviated testing
             approaches permitted for GAMP 5 Category 3 (non-configurable) or
             Category 4 (configured) software MUST NOT be applied to this library.
             Reference: GAMP 5 Appendix D.4, D.8.
```

### Supply Chain Classification

| Component                     | GAMP Category | Rationale                            |
| ----------------------------- | ------------- | ------------------------------------ |
| `@hex-di/http-client` core    | Category 5    | Custom combinator composition        |
| `@hex-di/http-client-node`    | Category 4    | Configured transport adapter          |
| `@hex-di/http-client-bun`     | Category 4    | Configured transport adapter          |
| `@hex-di/http-client-testing` | Category 3    | Non-configurable test infrastructure |
| Platform `fetch` API          | Category 1    | Operating system infrastructure      |
| Node.js `node:http`           | Category 1    | Operating system infrastructure      |

### 108a. Third-Party Transport Adapter Supplier Assessment

Per EU GMP Annex 11 §3 (Suppliers and Service Providers), organizations deploying third-party HTTP transport libraries as the underlying engine for `@hex-di/http-client` transport adapters MUST perform a proportionate supplier assessment. The assessment depth is driven by the GAMP category of the transport adapter package (Category 4 — configured product) and the GAMP category of the underlying third-party library.

#### Applicable Third-Party Libraries

| Transport Adapter Package | Third-Party Library | Library GAMP Category | License | Assessment Depth |
| ------------------------- | ------------------- | --------------------- | ------- | ---------------- |
| `@hex-di/http-client-fetch` | Platform `fetch` API | Category 1 (infrastructure) | Platform-native | Minimal — version record only |
| `@hex-di/http-client-axios` | `axios` | Category 3 (non-configured COTS) | MIT | Standard — supplier questionnaire |
| `@hex-di/http-client-got` | `got` | Category 3 (non-configured COTS) | MIT | Standard — supplier questionnaire |
| `@hex-di/http-client-ky` | `ky` | Category 3 (non-configured COTS) | MIT | Standard — supplier questionnaire |
| `@hex-di/http-client-ofetch` | `ofetch` | Category 3 (non-configured COTS) | MIT | Standard — supplier questionnaire |
| `@hex-di/http-client-node` | Node.js `node:http` | Category 1 (infrastructure) | Platform-native | Minimal — version record only |
| `@hex-di/http-client-undici` | `undici` | Category 3 (non-configured COTS) | MIT | Standard — supplier questionnaire |
| `@hex-di/http-client-bun` | Bun `fetch` | Category 1 (infrastructure) | Platform-native | Minimal — version record only |

#### Supplier Assessment Checklist

For Category 3 (COTS) transport libraries, the supplier assessment MUST evaluate the following criteria. This checklist is derived from GAMP 5 Appendix O3 (Supplier Assessment) and EU GMP Annex 11 §3.

| # | Assessment Criterion | Evidence Required | Accept/Reject Criteria |
| - | -------------------- | ----------------- | ---------------------- |
| SA-01 | **Release maturity** | npm download statistics, GitHub stars, release history | Library MUST have ≥ 1 year of public releases and ≥ 100,000 weekly npm downloads per EU GMP Annex 11 §3.2 |
| SA-02 | **Maintenance activity** | GitHub commit history, issue response time | Library MUST have commits within the last 6 months; median issue response time SHOULD be < 14 days per EU GMP Annex 11 §3.3 |
| SA-03 | **Security vulnerability history** | npm audit, GitHub Security Advisories, Snyk/Sonatype reports | No unpatched Critical CVEs; High CVEs MUST be patched within 30 days of disclosure |
| SA-04 | **Test coverage** | CI/CD badges, test suite presence, coverage reports | Library MUST have automated test suite; coverage SHOULD be ≥ 80% |
| SA-05 | **License compatibility** | SPDX license identifier, license file | License MUST be OSI-approved and compatible with organizational IP policies |
| SA-06 | **Dependency chain depth** | `npm ls --all` output, dependency graph | Direct dependencies SHOULD be < 20; total transitive dependency tree SHOULD be < 100 |
| SA-07 | **TypeScript support** | Type definition availability (`@types/*` or bundled) | Library MUST have TypeScript type definitions (bundled or DefinitelyTyped) |
| SA-08 | **TLS delegation** | Library documentation, source code review of TLS handling | Library MUST delegate TLS to the platform runtime (Node.js `tls` module, browser TLS stack); library MUST NOT implement custom TLS |
| SA-09 | **Change management process** | CHANGELOG, release notes, migration guides, breaking change documentation | Library MUST have a documented release process with changelogs; breaking changes MUST be documented before release; migration guides SHOULD be provided for major versions per EU GMP Annex 11 §3.3 |
| SA-10 | **Community governance** | GOVERNANCE.md, SECURITY.md, code of conduct, security disclosure policy | Library MUST have a published security disclosure/vulnerability reporting policy (SECURITY.md or equivalent); RECOMMENDED: multiple maintainers to reduce bus-factor risk per EU GMP Annex 11 §3.4 |

```
REQUIREMENT: Organizations deploying @hex-di/http-client in GxP environments MUST
             complete a supplier assessment for each Category 3 third-party transport
             library used in the deployment. The assessment MUST evaluate criteria
             SA-01 through SA-10 and document the results in a Supplier Assessment
             Record. The record MUST be approved by QA before the transport adapter
             is included in the Validation Plan (§83a). Supplier assessments MUST
             be refreshed: (1) when the library major version changes, (2) when a
             Critical or High CVE is disclosed, (3) during periodic review (§83b),
             or (4) when the library maintenance status changes materially (e.g.,
             project archived, maintainer change).
             Reference: EU GMP Annex 11 §3, GAMP 5 Appendix O3.
```

```
REQUIREMENT: For Category 1 (infrastructure) libraries (platform fetch, node:http,
             Bun fetch), supplier assessment is limited to recording the platform
             runtime version in the IQ checklist (§99a). The platform vendor
             (Node.js Foundation, Oven/Bun, browser vendor) is treated as an
             infrastructure supplier and does not require a formal Supplier
             Assessment Record. The platform version MUST be locked in the
             deployment configuration and changes MUST trigger IQ re-execution.
             Reference: GAMP 5 Appendix M4.
```

```
RECOMMENDED: Organizations SHOULD integrate automated supplier monitoring into
             their CI/CD pipeline using tools such as npm audit, Snyk, Socket, or
             Dependabot. Automated alerts for new CVEs in transport library
             dependencies SHOULD trigger the incident classification process
             (§83c) at the appropriate severity level. Organizations SHOULD
             maintain a Software Bill of Materials (SBOM) in SPDX or CycloneDX
             format for the deployed HTTP client stack.
```

---

## 109. GxP Training Requirements

_Remediates: F-CFR-02 — No training requirements section_

### Regulatory Drivers

| Regulation             | Requirement                                                                                                                                                                          | Training Relevance                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **21 CFR 11.10(i)**    | Determination that persons who develop, maintain, or use electronic record/electronic signature systems have the education, training, and experience to perform their assigned tasks | Developers and operators of GxP HTTP clients MUST be trained |
| **EU GMP Annex 11 §2** | Training — Personnel involved with computerized systems should have appropriate training for their role                                                                              | Role-specific training MUST be documented                    |
| **GAMP 5 §5.3**        | Training — Personnel competence and training records                                                                                                                                 | Training records MUST be maintained as controlled documents  |

### Training Roles

| Role                     | Responsibilities                                                                              | Minimum Training                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Developer**            | Implements and maintains GxP HTTP client adapters, combinators, and factory functions         | GxP software development practices; GAMP 5 Category 5 testing; 21 CFR Part 11 awareness; ALCOA+ data integrity; combinator ordering requirements (§103) |
| **Validator**            | Executes IQ/OQ/PQ (§99); maintains FMEA (§98); reviews traceability matrix (§100)             | GxP validation methodology; GAMP 5 V-model; risk-based testing; IQ/OQ/PQ execution; FMEA analysis                                                       |
| **System Administrator** | Deploys and configures GxP HTTP clients; manages audit trail storage; performs backup/restore | Audit trail management (§104); backup/restore procedures (§104a); migration procedures (§104b); incident classification (§83c); certificate management  |
| **Quality Assurance**    | Reviews validation documentation; approves change requests; conducts periodic reviews (§83b)  | 21 CFR Part 11; EU GMP Annex 11; ALCOA+ principles; periodic review procedures; deviation/CAPA management                                               |
| **End User**             | Interacts with applications that use GxP HTTP clients for regulated operations                | Electronic signature procedures (§93a); reason for change requirements (§92); understanding of audit trail completeness                                 |

### Training Requirements

```
REQUIREMENT: Organizations deploying @hex-di/http-client in GxP environments MUST
             maintain documented training records for all personnel in the roles
             defined above. Training MUST be completed and documented before the
             individual performs their assigned tasks. Training records MUST include:
             (1) trainee name and role, (2) training topic and materials,
             (3) training date, (4) trainer/assessor identity, and (5) competency
             assessment outcome (pass/fail).
             Reference: 21 CFR 11.10(i), EU GMP Annex 11 §2.
```

```
REQUIREMENT: Training MUST be refreshed when: (1) major version upgrades of the
             library are deployed, (2) the FMEA (§98) is updated with new failure
             modes, (3) regulatory guidance changes affect HTTP transport controls,
             (4) periodic review (§83b) identifies training gaps, or (5) a personnel
             role change occurs. Refresher training MUST be documented with the same
             records as initial training.
             Reference: EU GMP Annex 11 §2, GAMP 5 §5.3.
```

```
RECOMMENDED: Organizations SHOULD maintain a training matrix mapping each role to
             required training modules. The training matrix SHOULD be reviewed
             during periodic reviews (§83b) and updated when new spec sections or
             FMEA failure modes are added.
```

### Competency Assessment Criteria

Competency assessments referenced in the training record structure above MUST use the following minimum criteria per role:

| Role                     | Competency Assessment                                                                                                                                                                                                                                         | Passing Criteria                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Developer**            | Practical exercise: compose a correct GxP combinator pipeline (§103) from requirements; identify and fix an intentionally misordered pipeline                                                                                                                 | All REQUIRED combinators present in correct layer order; misordering identified and corrected                                                                                                                        |
| **Validator**            | Practical exercise: given a new failure mode, create an FMEA entry (§98) with RPN scoring and map it to OQ test cases (§99)                                                                                                                                   | FMEA entry has valid S/L/D scores; at least one OQ test case covers the mitigation; traceability matrix entry (§100) is complete                                                                                     |
| **System Administrator** | Practical exercise: (1) execute a backup/restore cycle (§104a) on a test environment and verify hash chain integrity; (2) classify 3 given HTTP transport security events by severity level (§83c) and identify the required response SLA and escalation path | Backup produces valid HttpAuditArchiveManifest; restore passes all 5 verification checks; restore audit entry recorded in independent chain; all 3 incident classifications correct with matching SLA and escalation |
| **Quality Assurance**    | Written assessment: identify regulatory references for 5 given GxP controls; classify a spec change as major/minor/patch per §117                                                                                                                             | All 5 regulatory references correct; SemVer classification and revalidation scope match §117 mapping                                                                                                                 |
| **End User**             | Supervised exercise: (1) complete a signing ceremony (§114) for a test operation; (2) provide a reason for change (§92); (3) execute an audit trail query (§105) to retrieve the record just signed and verify its contents; (4) export a filtered audit trail segment and verify the manifest checksum | Signing ceremony completed with re-authentication; reason for change is specific and meaningful (not blank or generic); audit query returns the correct record with matching signature; exported archive manifest checksum matches file content |

```
REQUIREMENT: Competency assessments MUST use the minimum criteria defined above
             or organization-specific criteria that are at least as rigorous.
             Organizations MAY add additional assessment methods (written exams,
             supervised observation periods, peer review) beyond the minimums.
             Assessment criteria MUST be documented in the training matrix and
             approved by QA.
             Reference: 21 CFR 11.10(i), EU GMP Annex 11 §2.
```

### Competency Re-Assessment Schedule

Competency is not a one-time demonstration. Personnel MUST undergo periodic re-assessment to ensure continued qualification as systems, regulations, and procedures evolve.

| Role Risk Level | Re-Assessment Frequency | Trigger Events (immediate re-assessment) |
|----------------|------------------------|------------------------------------------|
| **High** (Developer, System Administrator) | Every 12 months, maximum interval 14 months | Major version upgrade (§117), security incident involving role's scope (§83c), CAPA finding implicating role competency (§83d) |
| **Medium** (Validator, Quality Assurance) | Every 18 months, maximum interval 20 months | Regulatory framework change affecting qualification protocols, FMEA revision with new failure modes (§98), periodic review finding (§83b) |
| **Low** (End User) | Every 24 months, maximum interval 26 months | UI workflow change affecting signing ceremony (§114), new audit trail query capabilities (§105), role scope expansion |

```
REQUIREMENT: Organizations MUST implement a competency re-assessment schedule based
             on role risk level as defined in the table above. Re-assessment MUST use
             the same competency assessment criteria (or updated criteria if procedures
             have changed) as the initial assessment. Failed re-assessments MUST result
             in immediate access suspension until remedial training is completed and
             the assessment is passed. Re-assessment completion MUST be documented in
             the organization's training records with: (1) date of re-assessment,
             (2) assessor name, (3) pass/fail result, (4) next re-assessment due date.
             Trigger events listed in the table MUST initiate an immediate
             re-assessment regardless of the scheduled date.
             Reference: 21 CFR 11.10(i), EU GMP Annex 11 §2, GAMP 5 §D.2.
```

---

## 110. IAM Integration Guidance

_Remediates: F-AX11-01 — No IAM integration guidance_

### Regulatory Drivers

| Regulation               | Requirement                                                    | IAM Relevance                                                                          |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **EU GMP Annex 11 §3.4** | System access controls to prevent unauthorized changes to data | IAM systems manage the user lifecycle that determines HTTP operation authorization     |
| **21 CFR 11.10(d)**      | Limiting system access to authorized individuals               | User provisioning/deprovisioning directly controls who can execute GxP HTTP operations |
| **21 CFR 11.300**        | Controls for identification codes/passwords                    | IAM provides the identity infrastructure that HTTP authentication mechanisms depend on |

### Boundary Definition

The `@hex-di/http-client` library enforces access control decisions at the HTTP operation level. It does **not** manage the underlying user identity lifecycle. The following table clarifies the boundary between the library's RBAC enforcement and the organization's IAM controls:

| Concern                                   | Owner                      | Integration Point                                                                                        |
| ----------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **User provisioning** (account creation)  | Organization IAM           | IAM provisions identities consumed by `SubjectProviderPort` (§93)                                        |
| **User deprovisioning** (account removal) | Organization IAM           | IAM revokes identities; `checkSignerStatus()` (§107) detects revoked signers                             |
| **Role assignment**                       | Organization IAM           | IAM assigns roles evaluated by `HttpOperationPolicy.policy` (§94)                                        |
| **Role revocation**                       | Organization IAM           | IAM revokes roles; `PrivilegeEscalationPolicy` (§90) detects mid-session changes                         |
| **Access reviews**                        | Organization IAM + QA      | Periodic access reviews verify `HttpOperationPolicy` definitions match current role assignments          |
| **Authentication**                        | Organization IAM + Library | IAM authenticates users; `withAuthenticationPolicy()` (§90) enforces minimum strength                    |
| **Authorization**                         | Library                    | `withHttpGuard()` (§94) evaluates policies; `withSubjectAttribution()` (§93) resolves subject            |
| **Separation of duties**                  | Library + Organization     | Library enforces `conflictingRoles` (§94); organization defines which roles conflict                     |
| **Electronic signatures**                 | Library + Organization     | Library captures via `withElectronicSignature()` (§93a); organization manages signer credentials via IAM |
| **Session management**                    | Organization IAM + Library | IAM issues sessions/tokens; `withTokenLifecycle()` (§90) enforces expiration and refresh                 |

### IAM Integration Port

```typescript
/**
 * Informational type documenting the IAM integration surface.
 * The library does not provide an IAM port — organizations
 * implement SubjectProviderPort (§93) to bridge their IAM system.
 *
 * This type serves as documentation of the expected IAM capabilities
 * that the library's GxP features depend on.
 */
interface IamIntegrationSurface {
  /**
   * SubjectProviderPort (§93) — MUST resolve the authenticated subject
   * identity from the organization's IAM system. The IAM integration
   * MUST provide: subjectId, roles, authenticationMethod, authenticatedAt.
   */
  readonly subjectResolution: "SubjectProviderPort (§93)";

  /**
   * HttpSignatureServicePort (§93a) — MUST delegate to the organization's
   * IAM system for signer identity verification and credential management.
   */
  readonly signatureService: "HttpSignatureServicePort (§93a)";

  /**
   * Token refresh callback — MUST integrate with the organization's IAM
   * token endpoint for OAuth2/OIDC token refresh flows.
   */
  readonly tokenRefresh: "TokenLifecyclePolicy.onRefresh (§90)";

  /**
   * Role re-check callback — MUST query the organization's IAM system
   * for current role assignments during privilege escalation detection.
   */
  readonly roleRecheck: "PrivilegeEscalationPolicy.onRoleRecheck (§90)";
}
```

### Requirements

```
REQUIREMENT: The Validation Plan (§83a) MUST include a section documenting the
             organization's IAM integration with @hex-di/http-client. This section
             MUST identify: (1) the IAM system used (e.g., Azure AD, Okta, custom),
             (2) how SubjectProviderPort resolves subject identity from the IAM system,
             (3) how roles are mapped from IAM to HttpOperationPolicy definitions,
             (4) the token refresh mechanism, and (5) the user deprovisioning
             procedure and its effect on active HTTP client sessions.
             Reference: EU GMP Annex 11 §3.4, 21 CFR 11.10(d).
```

```
REQUIREMENT: Organizations MUST implement a user deprovisioning procedure that
             ensures deprovisioned users cannot execute GxP HTTP operations. At
             minimum, deprovisioning MUST: (1) revoke the user's authentication
             tokens (causing withTokenLifecycle to reject), (2) update the user's
             status in the IAM system so SubjectProviderPort returns an error or
             inactive subject, and (3) if electronic signatures were used, update
             the signer status so checkSignerStatus() (§107) returns "revoked".
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
REQUIREMENT: Organizations MUST conduct access reviews at least annually that
             compare IAM role assignments against HttpOperationPolicy definitions
             (§94) to detect drift. Access review findings MUST be documented as
             part of the periodic review (§83b) and any discrepancies resolved
             through the change control process (§116). Quarterly access reviews
             are RECOMMENDED for environments with frequent personnel changes.
             Reference: EU GMP Annex 11 §12, 21 CFR 11.10(d).
```

### Data Privacy Considerations

HTTP audit entries (§92) contain personal identifiers including `subjectId`, signer roles, authentication methods, and timestamps that are retained for the full regulatory retention period (5-10 years per §104). In jurisdictions where data privacy regulations apply alongside GxP requirements (notably the EU, where GDPR Article 35 applies concurrently with EU GMP Annex 11), organizations face a dual compliance obligation: ALCOA+ requires completeness and attribution of audit records while data privacy principles require data minimization.

```
REQUIREMENT: Organizations deploying @hex-di/http-client in jurisdictions with
             data privacy regulations (e.g., GDPR, CCPA, LGPD) MUST include
             HTTP audit trail data in their Data Privacy Impact Assessment (DPIA).
             The DPIA MUST address: (1) the personal data categories captured in
             HttpOperationAuditEntry fields (subjectId, signer identity, authentication
             method, IP addresses if captured by transport adapters), (2) the retention
             periods defined in HttpAuditRetentionPolicy (§104) and their regulatory
             justification, (3) access controls on audit data (QueryableHttpAuditTrailPort
             access restrictions per §105), (4) data subject rights applicability
             (noting that GxP audit trail integrity requirements under 21 CFR 11.10(e)
             and EU GMP Annex 11 §9 typically override erasure requests per GDPR
             Article 17(3)(b) — obligations under Union law), and (5) cross-border
             transfer implications if audit data is archived to storage in a different
             jurisdiction.
             Reference: GDPR Article 35 (DPIA), GDPR Article 17(3)(b) (erasure
             exemption for legal obligations), EU GMP Annex 11 §12.
```

> **Note:** The library does not implement data privacy controls — these are organizational responsibilities. However, the specification documents the personal data surface to enable organizations to perform their DPIA accurately. The `withCredentialProtection()` combinator (§87) redacts authentication credentials from audit entries, which serves both security and data minimization purposes. The DPIA requirement above is REQUIRED (not RECOMMENDED) because HTTP audit trail entries containing personal identifiers retained for 5-10 years constitute systematic processing of personal data on a large scale, meeting the GDPR Article 35(3) threshold for mandatory DPIA.

---

## 111. Transport vs. Business Validation Boundary

_Remediates: F-AX11-02 — No semantic validation distinction_

### Regulatory Drivers

| Regulation             | Requirement                                                       | Validation Boundary Relevance                                                       |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **EU GMP Annex 11 §6** | Accuracy checks — data should be checked on input for correctness | Both structural and semantic validation are required; their responsibilities differ |
| **21 CFR 11.10(h)**    | Checks for input data integrity                                   | Input validation MUST cover both structural format and business rule compliance     |

### Validation Layers

The `withPayloadValidation()` combinator (§89) performs **structural validation** at the HTTP transport layer. This is one layer of a multi-layer validation strategy required for GxP data integrity:

| Layer                                 | Scope                                                                              | Owner                                  | Example                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| **Structural validation** (transport) | JSON Schema / XSD conformance, field types, required fields, value formats         | `withPayloadValidation()` (§89)        | "batchId must be a string matching pattern `^BR-\\d{8}$`" |
| **Semantic validation** (application) | Business rules, cross-field consistency, domain constraints, referential integrity | Application domain services            | "batchId must reference an existing batch in OPEN status" |
| **Contextual validation** (workflow)  | Workflow state prerequisites, authorization context, temporal constraints          | Authorization policies (§94) + domain services | "batch step can only be signed after review is complete"  |

### Clarification

```
REQUIREMENT: Organizations MUST NOT rely solely on withPayloadValidation() (§89)
             to satisfy EU GMP Annex 11 §6 accuracy check requirements. Structural
             validation at the HTTP transport layer verifies that payloads conform
             to their declared schema (correct types, required fields present,
             format constraints met). Semantic validation (business rule checks,
             cross-field consistency, referential integrity) MUST be implemented
             at the application domain layer. The Validation Plan (§83a) MUST
             document both validation layers and their respective responsibilities.
             Reference: EU GMP Annex 11 §6, 21 CFR 11.10(h).
```

```
RECOMMENDED: Organizations SHOULD document their validation strategy as a layered
             matrix in the Validation Plan (§83a), mapping each GxP data field to:
             (1) the structural validation rule enforced by withPayloadValidation(),
             (2) the semantic validation rule enforced by the application layer, and
             (3) the contextual validation rule enforced by authorization policies. This
             matrix enables auditors to verify complete input validation coverage
             per EU GMP Annex 11 §6.
```

---

## 112. CORS Policy Types and Combinator

_Remediates: F-SEC-01 — Incomplete CORS specification_

### Regulatory Drivers

| Regulation              | Requirement                              | CORS Relevance                                                                      |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **21 CFR 11.30**        | Controls for open systems                | Browser-based GxP applications are open systems; CORS is a critical access boundary |
| **EU GMP Annex 11 §12** | Security — physical and logical controls | CORS misconfiguration is a logical control failure                                  |

### CORS Policy Type

```typescript
/**
 * CORS hardening policy for browser-based GxP deployments.
 * Enforces strict origin validation and prevents credential leakage
 * through misconfigured cross-origin access.
 *
 * Used by withCorsHardening() to validate server CORS responses
 * and block operations when CORS policy violations are detected.
 */
interface CorsPolicy {
  readonly _tag: "CorsPolicy";
  /**
   * Exact origin strings permitted for cross-origin access.
   * Wildcards and regex patterns are NOT permitted in GxP mode.
   * Each entry MUST be a fully-qualified origin (scheme + host + port).
   * Example: ["https://app.pharma.example.com", "https://admin.pharma.example.com"]
   */
  readonly allowedOrigins: ReadonlyArray<string>;
  /**
   * Explicitly enumerated HTTP methods permitted for cross-origin requests.
   * Wildcard (*) MUST NOT be used in GxP mode.
   */
  readonly allowedMethods: ReadonlyArray<string>;
  /**
   * Explicitly enumerated headers permitted in cross-origin requests.
   * Credential-bearing headers (Authorization, Cookie) require
   * Access-Control-Allow-Credentials: true on the server.
   */
  readonly allowedHeaders: ReadonlyArray<string>;
  /**
   * Whether credentials (cookies, authorization headers) are included
   * in cross-origin requests. When true, wildcard origins are rejected.
   */
  readonly includeCredentials: boolean;
  /**
   * Maximum preflight cache duration in seconds.
   * Limits how long browsers cache CORS preflight responses.
   * Default: 3600 (1 hour).
   */
  readonly maxAge: number;
}
```

### CORS Hardening Combinator

```typescript
/**
 * Validates server CORS responses against the defined CorsPolicy.
 * Operates at the client level by inspecting response headers
 * after the browser's CORS enforcement.
 *
 * In browser environments, the browser enforces CORS natively.
 * This combinator provides defense-in-depth by:
 * 1. Validating that the server's CORS response headers match the expected policy
 * 2. Recording CORS-blocked operations in the audit trail
 * 3. Detecting CORS policy drift (server changed CORS config without client update)
 *
 * In non-browser environments (Node.js, Deno, Bun), this combinator
 * validates the expected CORS headers are present on responses but
 * does not enforce cross-origin restrictions (there are none server-side).
 */
function withCorsHardening(policy: CorsPolicy): (client: HttpClient) => HttpClient;
```

### Error Types

```typescript
/**
 * Error produced when CORS policy validation fails.
 */
interface CorsViolationError {
  readonly _tag: "CorsViolationError";
  readonly code:
    | "CORS_BLOCKED"
    | "CORS_ORIGIN_MISMATCH"
    | "CORS_METHOD_NOT_ALLOWED"
    | "CORS_CREDENTIALS_WILDCARD";
  readonly message: string;
  /** The origin that was rejected or mismatched. */
  readonly origin: string;
  /** The URL of the request that triggered the CORS violation. */
  readonly requestUrl: string;
}
```

### Requirements

```
REQUIREMENT: When gxp: true and the transport adapter operates in a browser context,
             withCorsHardening() MUST be included in the combinator pipeline. The
             CorsPolicy MUST use exact-match origins (no wildcards, no regex).
             CORS-blocked operations MUST produce an HttpOperationAuditEntry (§92)
             with outcome "transport_error" and errorCode "CORS_BLOCKED".
             This requirement extends §68a with concrete types and a combinator.
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
REQUIREMENT: When CorsPolicy.includeCredentials is true, allowedOrigins MUST NOT
             contain the wildcard value "*". The withCorsHardening() combinator
             MUST reject CorsPolicy configurations that combine includeCredentials:
             true with a wildcard origin at construction time, producing a
             ConfigurationError with code "CORS_CREDENTIALS_WILDCARD".
             Reference: 21 CFR 11.30.
```

---

## 113. Client-Side Rate Limiting for GxP

_Remediates: F-SEC-02 — No client-side rate limiting for GxP_

### Regulatory Context

While rate limiting is primarily a server-side concern, client-side rate limiting provides an additional layer of protection for GxP systems:

| Risk                                       | Impact                                                        | Client-Side Mitigation                                |
| ------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------- |
| Accidental request flood from retry storms | GxP API denial-of-service, data processing backlog            | Rate limiter prevents more than N requests per window |
| Batch job misconfiguration                 | Overwhelming GxP endpoints during data migration              | Rate limiter caps outgoing request rate               |
| Circuit breaker half-open probe storms     | Multiple clients simultaneously probing a recovering endpoint | Rate limiter smooths probe rate                       |

### GxP Rate Limiting Guidance

```
REQUIREMENT: GxP deployments communicating with Category 1 GxP endpoints (patient
             safety, batch release, critical quality — as defined in §85) MUST
             include the rateLimit() combinator (§66) in their combinator pipeline.
             The rate limit MUST be configured to match the GxP API's documented
             throughput capacity. The rateLimit() combinator MUST be placed after
             the standard HTTP combinators (Layer 4 in §103) to prevent rate-limited
             requests from consuming audit, signature, or authorization resources.
             For non-Category-1 GxP endpoints, rateLimit() is RECOMMENDED.
             Reference: EU GMP Annex 11 §16, 21 CFR 11.10(a).
```

```
REQUIREMENT: When rateLimit() is active in GxP mode, rate-limited operations
             (queued or rejected) MUST be recorded in the audit trail. When
             strategy is "reject", the rejection MUST produce an
             HttpOperationAuditEntry with outcome "failure" and a diagnostic
             indicating rate limit exhaustion. When strategy is "queue", the
             queueing delay MUST be included in the audit entry's durationMs.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: Organizations MUST document their rate limit configuration in the
             Validation Plan (§83a) with justification for the chosen limits.
             Rate limit thresholds SHOULD be validated during PQ (§99) to confirm
             they do not impede normal GxP operations while providing protection
             against accidental overload.
```

---

## 114. Electronic Signature Capture UI Workflow Guidance

_Remediates: F-CFR-01 — No prescribed e-signature capture UI workflow_

### Regulatory Drivers

| Regulation              | Requirement                                                         | UI Workflow Relevance                                                      |
| ----------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **21 CFR 11.50**        | Signature manifestations                                            | The UI must display signer identity, date/time, and meaning before capture |
| **21 CFR 11.100(a)**    | Each electronic signature shall be unique to one individual         | The UI must verify the signer's identity before accepting a signature      |
| **21 CFR 11.200(a)(1)** | Non-biometric e-sig requires two distinct identification components | The UI must collect both components (e.g., user ID + password)             |

### Signature Capture Workflow

The `captureSignature` callback in `ElectronicSignatureConfig` (§93a) delegates signature capture to the `HttpSignatureServicePort` (§93a). The following reference workflow describes the recommended UI interaction pattern for the signing ceremony:

```
┌─────────────────────────────────────────────┐
│  1. User initiates state-changing operation  │
│     (POST/PUT/PATCH/DELETE to GxP endpoint)  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. withElectronicSignature() intercepts     │
│     and invokes captureSignature callback    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. Signing Ceremony Dialog                  │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │  Operation Summary                   │     │
│  │  ─────────────────────               │     │
│  │  Method:  PUT                        │     │
│  │  URL:     /api/batches/BR-00001234   │     │
│  │  Payload: Batch step #3 completion   │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │  Signature Meaning  [▼ dropdown]     │     │
│  │  ○ AUTHORED — I created this record  │     │
│  │  ● REVIEWED — I reviewed this record │     │
│  │  ○ APPROVED — I approve this record  │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │  Identity Verification               │     │
│  │  ─────────────────────               │     │
│  │  User ID:  [jsmith@pharma.com    ]   │     │
│  │  Password: [••••••••••           ]   │     │
│  │                                      │     │
│  │  □ I confirm this is my signature    │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  [Cancel]                       [Sign]       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. Verification                             │
│     - Verify User ID matches subjectId       │
│     - Verify password via IAM                │
│     - If requireTwoFactor: verify 2FA code   │
│     - Compute signatureBinding (SHA-256)     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. Return HttpElectronicSignature to        │
│     withElectronicSignature() combinator     │
│     — request proceeds with signature        │
└─────────────────────────────────────────────┘
```

### Signature Manifestation Display Requirements (21 CFR 11.50)

Per 21 CFR 11.50(a), signed electronic records shall contain information associated with the signing that clearly indicates the printed name of the signer, the date and time when the signature was executed, and the meaning associated with the signature. The following requirements are **normative** for all signing ceremony implementations in GxP deployments.

```
REQUIREMENT: The signing ceremony dialog MUST display the following signature
             manifestation elements before the signer confirms their signature:
             (1) The printed name (or unique identifier) of the signer,
                 matching the subjectId from withSubjectAttribution() (§93)
             (2) The current date and time in ISO 8601 UTC format, with the
                 signer's local timezone visible for human readability
             (3) The meaning of the signature (AUTHORED, REVIEWED, APPROVED,
                 VERIFIED, WITNESSED, or organization-defined meanings)
             These three elements MUST be visible simultaneously on the signing
             ceremony screen at the moment the signer confirms their signature.
             Implementations MUST NOT allow signature confirmation if any of the
             three manifestation elements are not displayed.
             Reference: 21 CFR 11.50(a), 21 CFR 11.50(b).
```

### Reference Implementation Requirements

```
REQUIREMENT: The captureSignature callback implementation MUST present the user
             with: (1) a summary of the operation being signed (HTTP method, URL,
             and human-readable description), (2) a selection of applicable
             signature meanings (AUTHORED, REVIEWED, APPROVED, or custom meanings
             defined by the organization), (3) identity verification fields
             requiring re-authentication (per 21 CFR 11.200(a)(1), two distinct
             identification components for non-biometric signatures), and
             (4) an explicit confirmation that the user intends to apply their
             electronic signature.
             Reference: 21 CFR 11.50, 21 CFR 11.100, 21 CFR 11.200.
```

```
REQUIREMENT: The signing ceremony MUST NOT auto-populate the identity verification
             fields from the current session. The signer MUST re-enter their
             credentials as part of the signing act. This ensures that each
             signature is a deliberate, conscious act per 21 CFR 11.100(a).
             Exception: biometric authentication where the biometric capture
             itself constitutes deliberate action (out of scope per §93a
             biometric scope exclusion — requires separate specification).
             Reference: 21 CFR 11.100(a), 21 CFR 11.200(a)(1).
```

```
REQUIREMENT: If the user cancels the signing ceremony, the captureSignature
             callback MUST return an Err with code "SIGNATURE_CANCELLED". The
             withElectronicSignature() combinator MUST then block the HTTP
             operation — unsigned state-changing operations MUST NOT proceed
             for signable endpoints. The cancellation MUST be recorded in
             the audit trail.
             Reference: 21 CFR 11.10(e).
```

```
RECOMMENDED: Framework-specific reference implementations of the signing ceremony
             SHOULD be provided in the following packages:
             - @hex-di/http-client-react: useSigningCeremony() hook with
               accessible modal dialog
             - @hex-di/http-client-angular: SigningCeremonyComponent with
               template-driven form
             - Web Components: <hex-signing-ceremony> custom element for
               framework-agnostic usage
             Each implementation SHOULD follow WCAG 2.1 AA accessibility
             guidelines for the dialog interaction.
```

---

## 115. Catastrophic Failure Recovery Runbook

_Remediates: F-ERR-01 — No catastrophic failure recovery guidance_

### Regulatory Drivers

| Regulation              | Requirement           | Recovery Relevance                                                 |
| ----------------------- | --------------------- | ------------------------------------------------------------------ |
| **EU GMP Annex 11 §13** | Incident management   | Catastrophic failures MUST have documented recovery procedures     |
| **EU GMP Annex 11 §16** | Business continuity   | Recovery procedures ensure GxP operations can resume after failure |
| **21 CFR 11.10(c)**     | Protection of records | Recovery MUST not result in audit trail data loss                  |

### Failure Scenarios

| ID    | Scenario                                                               | Severity    | Detection                                                                | Recovery Path |
| ----- | ---------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ | ------------- |
| CF-01 | Complete audit backend failure + WAL full                              | S1 Critical | `unconfirmedEntries()` count exceeds WAL capacity; CRITICAL health event | §115.1        |
| CF-02 | Cryptographic subsystem failure (SHA-256 unavailable)                  | S1 Critical | `withPayloadIntegrity()` or hash chain computation returns error         | §115.2        |
| CF-03 | SubjectProviderPort permanently unavailable                            | S2 Major    | All `withSubjectAttribution()` calls fail                                | §115.3        |
| CF-04 | Clock source failure (both wall-clock and monotonic)                   | S1 Critical | Timestamps are 0 or NaN; clock drift exceeds threshold                   | §115.4        |
| CF-05 | Certificate infrastructure total failure (CA + OCSP + CRL unreachable) | S2 Major    | All revocation checks fail; hard-fail blocks all HTTPS                   | §115.5        |
| CF-06 | DNS infrastructure failure (all resolvers unreachable for GxP endpoints) | S1 Critical | All HTTP requests fail with DNS resolution error; no GxP endpoints reachable | §115.6a       |

### Recovery Time and Point Objectives

```
REQUIREMENT: All catastrophic failure recovery procedures (CF-01 through CF-06)
             MUST meet the following Recovery Time Objectives (RTO) and Recovery
             Point Objectives (RPO):

             | Scenario | RTO (Maximum) | RPO (Maximum Data Loss) | Rationale |
             |----------|---------------|------------------------|-----------|
             | CF-01 Audit backend + WAL full | 4 hours | 0 (zero data loss via WAL) | WAL preserves all entries; RTO per §105 inspector SLA |
             | CF-02 Crypto subsystem failure | 2 hours | 0 (operations blocked) | No operations proceed; no data generated during outage |
             | CF-03 Subject provider unavailable | 4 hours | 0 (operations blocked) | No operations proceed; IAM restoration required |
             | CF-04 Clock source failure | 1 hour | 0 (operations blocked) | Temporal integrity critical; rapid NTP restoration required |
             | CF-05 Certificate infrastructure | 4 hours | 0 (operations blocked in hard-fail) | Degraded mode with soft-fail per §106 provides continuity |
             | CF-06 DNS infrastructure | 2 hours | 0 (operations blocked) | Static host fallback (§115.6a) provides partial continuity |

             Organizations MUST document their site-specific RTO/RPO in the
             Validation Plan (§83a) and verify achievability during PQ disaster
             recovery testing. If site-specific constraints require longer RTOs,
             the deviation MUST be documented with a risk acceptance per ICH Q9.
             Reference: EU GMP Annex 11 §16, 21 CFR 11.10(c).
```

### 115.1 Audit Backend Failure + WAL Full

```
REQUIREMENT: When the audit trail backend is unreachable AND the WAL has reached
             capacity, the HTTP client MUST:
             (1) Immediately block all new GxP HTTP operations (failOnAuditError: true
                 prevents any operation without audit recording)
             (2) Emit a CRITICAL health event with diagnostic detail
             (3) Classify as S1 incident per §83c
             (4) Retain all unconfirmed entries in the WAL — MUST NOT discard
             When the audit backend recovers:
             (5) Flush all WAL entries to the backend in sequence order
             (6) Verify hash chain continuity after flush
             (7) Resume GxP operations only after all WAL entries are confirmed
             (8) Record a recovery ConfigurationAuditEntry documenting the
                 outage duration, entries queued, and recovery timestamp
             Reference: EU GMP Annex 11 §13, 21 CFR 11.10(c).
```

### 115.2 Cryptographic Subsystem Failure

```
REQUIREMENT: When the cryptographic subsystem (Web Crypto API or Node.js crypto)
             is unavailable or returns errors, the HTTP client MUST:
             (1) Block all GxP HTTP operations — payload integrity and hash chain
                 computation cannot proceed without cryptography
             (2) Emit a CRITICAL health event identifying the failed crypto operation
             (3) NOT fall back to non-cryptographic alternatives (FNV-1a alone is
                 insufficient for GxP per §79)
             (4) Classify as S1 incident per §83c
             Recovery requires restoring the cryptographic subsystem (platform
             update, configuration fix, or hardware replacement for HSM scenarios).
             Reference: 21 CFR 11.10(c), 21 CFR 11.30.
```

### 115.3 Subject Provider Unavailable

```
REQUIREMENT: When SubjectProviderPort is permanently unavailable (not transient),
             the HTTP client MUST:
             (1) Block all GxP HTTP operations — ALCOA+ Attributable requires
                 subject attribution for every operation
             (2) Emit a CRITICAL health event after N consecutive failures
                 (configurable, default: 10)
             (3) NOT proceed with anonymous or system-identity fallback for
                 user-initiated operations
             (4) Record the failure pattern in the audit trail (if audit is
                 still operational) for post-incident review
             Recovery requires restoring the IAM/identity provider that
             SubjectProviderPort delegates to (see §110 IAM integration).
             Reference: ALCOA+ Attributable, EU GMP Annex 11 §12.
```

### 115.4 Clock Source Failure

```
REQUIREMENT: When both wall-clock (Date.now()) and monotonic clock
             (performance.now()) return invalid values (0, NaN, negative),
             the HTTP client MUST:
             (1) Block all GxP HTTP operations — ALCOA+ Contemporaneous requires
                 valid timestamps on all audit entries
             (2) Emit a CRITICAL health event
             (3) NOT use cached or estimated timestamps as substitutes
             Recovery requires restoring the system clock (NTP resynchronization,
             OS time service restart, or platform restart).
             Reference: ALCOA+ Contemporaneous, EU GMP Annex 11 §9.
```

### 115.5 Certificate Infrastructure Total Failure

```
REQUIREMENT: When all certificate revocation checking methods fail AND
             CertificateRevocationPolicy.failureMode is "hard-fail", the HTTP
             client MUST:
             (1) Block all HTTPS connections (consistent with hard-fail policy §106)
             (2) Emit a CRITICAL health event with the specific methods attempted
                 and their failure reasons
             (3) Classify as S2 incident per §83c (not S1 because existing
                 authenticated sessions may continue briefly via cached OCSP/CRL)
             (4) Check cached OCSP/CRL responses — if valid caches exist within
                 their TTL, use them while alerting operations staff
             (5) When infrastructure recovers, verify certificate chain validity
                 for all active connections before resuming operations
             Organizations SHOULD have a documented exception procedure for
             temporarily switching to soft-fail mode during infrastructure
             outages, subject to QA approval and incident documentation.
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

### 115.6a DNS Infrastructure Failure

```
REQUIREMENT: When DNS resolution fails for all configured GxP endpoints and no
             fallback resolution method is available (static host entries, local
             DNS cache), the HTTP client MUST:
             (1) Block all new GxP HTTP operations — endpoint resolution is a
                 prerequisite for any HTTP communication
             (2) Emit a CRITICAL health event identifying the failing DNS resolvers
                 and affected endpoints
             (3) Classify as S1 incident per §83c
             (4) NOT attempt alternative DNS resolvers not pre-approved in the
                 deployment configuration (prevents DNS hijacking via fallback)
             (5) Check static host entries (if configured via CV-02) as a fallback
                 for Category 1 endpoints only
             Recovery requires restoring DNS infrastructure (resolver restart,
             network connectivity restoration, or promotion of secondary DNS).
             Organizations SHOULD configure static host entries for Category 1
             endpoints as a compensating control per CV-02 and CV-11.
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12, NIST SP 800-81-2.
```

### 115.6 Degraded Mode Operation Guidance

GxP systems may encounter scenarios where full compliance posture cannot be maintained but business-critical operations must continue. This section defines the conditions, constraints, and documentation requirements for degraded mode operation.

```
REQUIREMENT: When one or more GxP subsystems are impaired but not fully failed
             (e.g., audit trail backend slow but responsive, clock drift detected
             but below catastrophic threshold, certificate revocation checks
             intermittently failing), the HTTP client MUST operate in a formally
             defined degraded mode rather than alternating between full operation
             and full block. Degraded mode MUST:
             (1) Be explicitly entered via a health status transition from "healthy"
                 to "degraded" (see §HL-002, HL-005, HL-006 health abstraction)
             (2) Record an HttpClientConfigurationAuditEntry (§88) with
                 configurationKey "DEGRADED_MODE_ENTERED" documenting the trigger
                 condition, affected subsystem, and timestamp
             (3) Continue processing GxP HTTP operations with enhanced monitoring:
                 all operations during degraded mode MUST include a
                 "degradedMode: true" flag in their HttpOperationAuditEntry
             (4) Automatically exit degraded mode when the triggering condition
                 is resolved, recording "DEGRADED_MODE_EXITED" audit entry
             Reference: EU GMP Annex 11 §13, EU GMP Annex 11 §16.
```

```
REQUIREMENT: Degraded mode MUST NOT weaken GxP controls. Specifically:
             (1) Audit trail recording MUST continue — degraded mode MUST NOT
                 disable audit recording even if the backend is slow
             (2) Hash chain integrity MUST be maintained — no entries may be
                 skipped or recorded without integrity hashes
             (3) Subject attribution MUST continue — anonymous operations are
                 not permitted even in degraded mode
             (4) Electronic signature requirements MUST NOT be bypassed
             The only acceptable degradation is increased latency (e.g., waiting
             for slow audit backend) or reduced verification depth (e.g.,
             soft-fail for certificate revocation instead of hard-fail, with
             documented risk acceptance).
             Reference: 21 CFR 11.10(c), 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: Organizations MUST document their degraded mode operating procedures
             in the Validation Plan (§83a), including: (1) criteria for entering
             degraded mode (which health check thresholds trigger it), (2) maximum
             duration of degraded mode operation before escalation to S1 incident,
             (3) which operations are permitted during degraded mode, (4) enhanced
             monitoring requirements during degraded mode, and (5) criteria for
             exiting degraded mode. Degraded mode events MUST be reviewed during
             periodic reviews (§83b) to identify recurring issues.
             Reference: EU GMP Annex 11 §13, §16, ICH Q9.
```

```
RECOMMENDED: Organizations SHOULD define maximum degraded mode durations per
             subsystem. RECOMMENDED maximum durations:
             - Audit backend slow: 30 minutes before escalation
             - Certificate revocation soft-fail: 60 minutes before escalation
             - Clock drift detected: 15 minutes before escalation
             - Subject provider intermittent: 10 minutes before escalation
             Operations that exceed the maximum degraded mode duration SHOULD
             transition to the corresponding catastrophic failure procedure
             (§115.1-§115.5).
```

### General Recovery Principles

```
REQUIREMENT: All catastrophic failure recovery procedures MUST:
             (1) Produce audit trail entries documenting the failure,
                 recovery actions taken, and recovery verification results
             (2) Trigger revalidation assessment per §83b when the failure
                 affected GxP data integrity or audit trail completeness
             (3) Be included in the incident report per §83c with root cause
                 analysis and corrective/preventive actions (CAPA)
             (4) Be rehearsed at least annually as part of business continuity
                 testing, with a maximum interval of 14 months between consecutive
                 rehearsals — rehearsal results documented in the periodic review.
                 A minimum planning lead time of 4 weeks MUST be allocated before
                 each rehearsal to ensure adequate preparation, participant
                 availability, and environment readiness.
             Reference: EU GMP Annex 11 §13, §16.
```

---

## 116. Specification Change Control Process

_Remediates: F-CC-01 — No formal spec change control process_

### Regulatory Drivers

| Regulation              | Requirement              | Spec Change Control Relevance                                           |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| **EU GMP Annex 11 §10** | Change management        | Changes to controlled documents MUST follow a documented change process |
| **GAMP 5 §5.5**         | Configuration management | Specifications are controlled documents subject to change management    |

### Change Request Process

Changes to this specification MUST follow the process below:

```
┌─────────────────────────────────────────┐
│  1. Change Request (CR) Submission       │
│     - CR number (sequential)             │
│     - Requester identity                 │
│     - Affected spec sections             │
│     - Rationale for change               │
│     - Regulatory impact assessment       │
│     - Risk assessment (FMEA impact)      │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  2. Impact Assessment                    │
│     - Identify affected FMEA entries     │
│     - Identify affected OQ/PQ checks     │
│     - Identify affected DoD items        │
│     - Assess revalidation scope (§117)   │
│     - Update traceability matrix (§100)  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  3. Review and Approval                  │
│     - Technical review (development)     │
│     - QA review (regulatory impact)      │
│     - QA approval REQUIRED for changes   │
│       affecting GxP controls             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  4. Implementation                       │
│     - Update spec sections               │
│     - Update FMEA if failure modes       │
│       are added/modified                 │
│     - Update traceability matrix         │
│     - Update affected DoD items          │
│     - Update test counts if applicable   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  5. Verification                         │
│     - Verify spec internal consistency   │
│     - Execute affected OQ/PQ checks      │
│     - Update periodic review log (§83b)  │
│     - Close CR with resolution summary   │
└─────────────────────────────────────────┘
```

### Change Request Template

| Field                  | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **CR Number**          | Sequential identifier (e.g., CR-HTTP-042)                                                     |
| **Date**               | Submission date (ISO 8601)                                                                    |
| **Requester**          | Name and role of the person requesting the change                                             |
| **Category**           | New requirement / Requirement modification / Requirement removal / Clarification / Correction / Emergency change |
| **Affected Sections**  | List of spec section numbers affected                                                         |
| **Description**        | Detailed description of the proposed change                                                   |
| **Rationale**          | Business or regulatory justification                                                          |
| **Regulatory Impact**  | Which regulations are affected (21 CFR Part 11, EU GMP Annex 11, GAMP 5, ALCOA+)              |
| **FMEA Impact**        | New failure modes, modified mitigations, or RPN changes                                       |
| **Revalidation Scope** | Full / Partial / None — per §117 mapping                                                      |
| **QA Approval**        | QA reviewer name, date, and approval/rejection                                                |
| **Resolution**         | Approved / Approved with modifications / Rejected — with summary                              |

### Requirements

```
REQUIREMENT: All changes to this specification MUST be submitted through a formal
             Change Request (CR) using the template defined above. Changes MUST
             NOT be applied without QA approval when the change affects GxP
             controls (any section referenced in the FMEA §98 or traceability
             matrix §100). The CR log MUST be maintained as a controlled document
             and reviewed during periodic reviews (§83b).
             Reference: EU GMP Annex 11 §10, GAMP 5 §5.5.
```

```
REQUIREMENT: Each CR MUST include a regulatory impact assessment identifying
             which regulatory requirements (21 CFR Part 11, EU GMP Annex 11,
             GAMP 5, ALCOA+) are affected by the proposed change. Changes that
             reduce the stringency of a GxP control MUST include a risk
             acceptance justification approved by QA.
             Reference: EU GMP Annex 11 §10, ICH Q9.
```

```
REQUIREMENT: Emergency changes (category "Emergency change") MUST follow an
             expedited approval process when a Critical (S1) or Major (S2)
             security incident (§83c) or regulatory finding requires immediate
             remediation. The emergency change process MUST:
             (1) Require verbal approval from QA (or designated delegate) before
                 implementation, followed by written approval within 5 business days
             (2) Include the same CR fields as standard changes (regulatory impact,
                 FMEA impact, revalidation scope)
             (3) Record the emergency nature and verbal approval reference in the
                 CR reason field
             (4) Trigger retrospective full review within 10 business days,
                 including revalidation scope assessment per §117
             (5) Be limited to the minimum change necessary to address the
                 immediate risk — scope expansion MUST use the standard CR process
             Emergency changes that are not followed up with retrospective review
             within 10 business days MUST be escalated to the QA Director.
             Reference: EU GMP Annex 11 §10, ICH Q9 §4.
```

---

## 117. SemVer-to-Revalidation Mapping

_Remediates: F-CC-02 — SemVer not linked to revalidation_

### Regulatory Drivers

| Regulation              | Requirement                                | SemVer Relevance                                            |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| **GAMP 5 §5.5**         | Configuration management — version control | Library versions MUST be traceable to validation state      |
| **EU GMP Annex 11 §10** | Change management                          | Version changes are controlled changes requiring assessment |

### Version Change Classification

| SemVer Change                        | Example       | Revalidation Scope                                             | Rationale                                                                                                                                   |
| ------------------------------------ | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Major** (X.0.0)                    | 1.0.0 → 2.0.0 | **Full revalidation** — complete IQ/OQ/PQ cycle                | Breaking API changes may invalidate existing adapters, combinators, or factory functions. All GxP controls MUST be re-verified.             |
| **Minor** (x.Y.0)                    | 1.2.0 → 1.3.0 | **Partial revalidation** — IQ + affected OQ checks             | New features may introduce new failure modes or modify existing behavior. Existing OQ checks MUST pass; new features require new OQ checks. |
| **Patch** (x.y.Z)                    | 1.2.3 → 1.2.4 | **Regression verification** — IQ + targeted OQ for fixed issue | Bug fixes address specific defects. The fix MUST be verified and existing OQ checks MUST pass to confirm no regression.                     |
| **Pre-release** (-alpha, -beta, -rc) | 1.3.0-rc.1    | **Not permitted for GxP deployment**                           | Pre-release versions MUST NOT be deployed in GxP environments. Only stable releases (no pre-release suffix) are permitted.                  |
| **Build metadata** (+build)          | 1.2.4+20260214 | **No revalidation** — IQ version record update only            | Build metadata has no semantic meaning per SemVer 2.0.0 §10. The IQ version record (§99a) MUST capture the full version string including build metadata for reproducibility. No revalidation is required because identical code is guaranteed.  |

### Requirements

```
REQUIREMENT: Organizations MUST document the installed version of @hex-di/http-client
             in the Validation Plan (§83a) and the IQ verification (§99). Version
             changes MUST be assessed against the SemVer-to-revalidation mapping
             above to determine the required revalidation scope. The revalidation
             scope assessment MUST be documented as a Change Request (§116) before
             the version upgrade is deployed.
             Reference: GAMP 5 §5.5, EU GMP Annex 11 §10.
```

```
REQUIREMENT: Major version upgrades (X.0.0) MUST trigger full revalidation including:
             (1) complete IQ re-execution, (2) all OQ checks (§99), (3) PQ
             benchmarks (§99), (4) FMEA review for new/modified failure modes,
             (5) traceability matrix update (§100), and (6) training refresh
             for affected roles (§109). The upgraded version MUST NOT be deployed
             for GxP operations until full revalidation is complete and approved.
             Reference: GAMP 5 Appendix D.4.
```

```
REQUIREMENT: Minor version upgrades (x.Y.0) MUST trigger partial revalidation
             including: (1) IQ re-execution, (2) OQ checks for modified and new
             features, (3) regression OQ for existing features, and (4) FMEA
             review if new failure modes are introduced. Existing PQ benchmarks
             SHOULD be re-executed if the new features affect performance-critical
             paths (audit recording, payload integrity, credential protection).
             Reference: GAMP 5 Appendix D.4.
```

```
REQUIREMENT: Patch version upgrades (x.y.Z) MUST trigger regression verification
             including: (1) IQ re-execution, (2) targeted OQ for the specific
             issue fixed, and (3) regression OQ for related features. PQ
             re-execution is NOT required for patch versions unless the fix
             addresses a performance regression.
             Reference: GAMP 5 Appendix D.4.
```

```
REQUIREMENT: Pre-release versions (alpha, beta, release candidate) MUST NOT be
             deployed in GxP environments. Only stable releases meeting the
             full SemVer specification (no pre-release or build metadata suffix)
             are permitted for GxP deployment.
             Reference: GAMP 5 §5.5.
```

---

## 118. Port Dependency Inventory

_Remediates: F-INT-01 — Port dependencies not version-locked_

### Dependency Inventory

The `@hex-di/http-client` GxP features depend on the following port interfaces. Each port is defined within this specification and accepts adapter implementations at configuration time. Organizations MAY use `@hex-di/guard` as one possible adapter provider, but this is an informational note, not a normative dependency.

| Port Interface               | Spec Section | Used By (HTTP Spec)              | Purpose                                  |
| ---------------------------- | ------------ | -------------------------------- | ---------------------------------------- |
| `HttpClientPort`             | §26          | §26 (core HTTP client)           | Core HTTP client DI port                 |
| `HttpAuditTrailPort`         | §91          | §97 (withHttpAuditBridge)        | SHA-256 hash chain audit recording       |
| `HttpWalStorePort`           | §91          | §91 (crash recovery)             | Durable audit entry persistence          |
| `HttpClockSourcePort`        | §96          | §96 (clock synchronization)      | Timestamp source for audit entries       |
| `HttpSubjectProviderPort`    | §93          | §93 (withSubjectAttribution)     | Subject identity resolution              |
| `HttpSignatureServicePort`   | §93a         | §93a (withElectronicSignature)   | Electronic signature capture delegation  |
| `HttpAuthorizationPort`      | §94          | §94 (HttpOperationPolicy.policy) | Authorization policy evaluation          |
| `HttpOperationGatePort`      | §94          | §94 (withHttpGuard)              | RBAC policy evaluation                   |
| `HttpAuditRetentionPolicy`   | §104         | §104 (retention/archival)        | Pattern alignment for retention periods  |
| `HttpAuditArchivalPort`      | §104         | §104 (archive lifecycle)         | Archive lifecycle management             |
| `QueryableHttpAuditTrailPort` | §105        | §105 (query and retrieval)       | Audit trail query, retrieval, export     |
| `HttpSignatureVerificationPort` | §107      | §107 (signer verification)       | Electronic signature verification        |
| `HttpAuditMetaEntry`           | §105      | §105 (meta-audit chain)          | Meta-audit trail for audit access events |
| `HttpAuditEncryptionPort`      | §104c     | §104c (data-at-rest encryption)  | Encryption key lifecycle management      |

### Port Adapter Requirements

```
REQUIREMENT: @hex-di/http-client GxP features (sections 84-118) MUST be configured
             with adapter implementations for all REQUIRED ports listed in the port
             inventory above. Port adapters are provided at container configuration
             time and MUST satisfy the interface contracts defined in their respective
             spec sections. The @hex-di/http-client package does not declare a hard
             dependency on any specific adapter package.
             Reference: GAMP 5 §5.5.
```

```
REQUIREMENT: The Validation Plan (§83a) MUST document the specific port adapter
             implementations used alongside @hex-di/http-client, including their
             package names and versions. All adapter package versions MUST be
             recorded in IQ verification (§99). Port contract compatibility MUST
             be verified during IQ by confirming that all port adapters listed in
             the dependency inventory above satisfy their interface contracts.
             Reference: GAMP 5 §5.5, EU GMP Annex 11 §4.
```

### Port Contract Compatibility Verification

```
REQUIREMENT: The IQ procedure (§99) MUST include a port contract compatibility
             check that verifies:
             (1) HttpAuditTrailPort adapter exposes record(), confirm(),
                 unconfirmedEntries(), and verifyAuditChain() methods
             (2) HttpClockSourcePort adapter exposes now() and monotonicNow()
             (3) HttpSubjectProviderPort adapter exposes resolveSubject()
             (4) HttpSignatureServicePort adapter exposes captureSignature()
             (5) HttpAuthorizationPort adapter is compatible with
                 HttpOperationPolicy.policy field
             This verification MUST be automated as a type-level test using
             TypeScript's type system.
             Reference: GAMP 5 Appendix D.4.
```

> **Note:** `@hex-di/guard` is one possible provider of adapter implementations for these ports. Organizations MAY use guard adapters, third-party adapters, or custom implementations. When using `@hex-di/guard` adapters, the guard package version SHOULD be recorded in the Validation Plan and IQ verification alongside other adapter packages.

---

