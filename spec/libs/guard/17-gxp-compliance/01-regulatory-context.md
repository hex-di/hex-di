# 17 - GxP Compliance: Regulatory Context

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-01                              |
| Revision         | 1.5                                      |
| Effective Date   | 2026-02-20                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.5 (2026-02-20): Updated test count from 713/21 → 1294/29 DoD items (CCR-GUARD-045) |
|                  | 1.4 (2026-02-13): Added predicateRuleMapping enforcement (REQ-GUARD-067), EU GMP Annex 11 Sections 5/6/8/15 explicit coverage (REQ-GUARD-070, REQ-GUARD-071) |
|                  | 1.3 (2026-02-13): Added SubjectProvider DI-level immutability (§59a), TLS 1.2+ floor for open systems (§59) |
|                  | 1.2 (2026-02-13): Added SubjectProvider integrity verification (§59a) |
|                  | 1.1 (2026-02-13): Added consumer authentication responsibilities (21 CFR 11.300) |
|                  | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [17 - GxP Compliance Guide (Index)](../17-gxp-compliance.md) | Next: [Audit Trail Contract](./02-audit-trail-contract.md)_

---

## 59. Regulatory Context

### Applicable Regulations

| Regulation                              | Scope                                            | Key Requirements for Guard                                                                             |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **FDA 21 CFR Part 11**                  | Electronic records and signatures                | Audit trail (11.10(e)), access control (11.10(d)), electronic signatures (11.50-11.300)                |
| **EU GMP Annex 11**                     | Computerized systems in GMP                      | Audit trail (Section 9), access control (Section 12), data integrity (Section 7)                       |
| **GAMP 5**                              | Risk-based approach to validation                | Category 5 (custom software) testing requirements                                                      |
| **ALCOA+**                              | Data integrity framework                         | Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available |
| **ICH Q9**                              | Quality risk management                          | Risk-based approach, FMEA methodology (section 68), risk communication                                 |
| **PIC/S PI 011-3**                      | Good practices for data management and integrity | Data integrity, audit trail access (§9.4), administrative monitoring (§9.5), risk-based review (§9.8)  |
| **WHO TRS 996 Annex 5**                 | Validation of computerized systems               | Validation plan traceability (section 67), bi-directional requirement mapping                          |
| **MHRA Data Integrity Guidance (2018)** | Data integrity and data governance               | Integration with site data integrity policy (section 60), data governance framework                    |

### Guard's Regulatory Scope

`@hex-di/guard` is an **authorization library**, not an authentication or data management system. Its regulatory footprint is:

- **In scope:** Access control decisions, audit trail of authorization evaluations, evaluation trace records, subject provenance
- **Out of scope:** Authentication (login, sessions, MFA), data storage encryption, database access controls, network security, user provisioning

The guard library produces structured records. **The consumer's `AuditTrailPort` implementation is responsible for durability, immutability, and archival.** This document specifies the contract that compliant `AuditTrailPort` adapters must fulfill.

### Consumer Authentication Responsibilities (21 CFR 11.300)

`@hex-di/guard` is an **authorization** library. It receives authenticated subject identity via `SubjectProviderPort` but does **not** perform authentication itself. The consuming application's authentication subsystem is a critical dependency for GxP compliance.

```
REQUIREMENT: In GxP environments (gxp: true), the consuming application's
             authentication subsystem — whether implemented directly or
             delegated to an external Identity Provider (IdP) — MUST comply
             with the following 21 CFR Part 11 Subpart C controls:

             (a) **21 CFR 11.300(a) — Unique identification codes:**
                 Each person who uses electronic signatures MUST be assigned
                 a unique combination of identification code and password, or
                 equivalent biometric-based identification. The SubjectProviderPort
                 adapter MUST map IdP-issued identifiers to stable, globally unique
                 subjectId values per §22 (06-subject.md).

             (b) **21 CFR 11.300(b) — Code uniqueness and periodic revision:**
                 Identification codes MUST NOT be reused. Passwords MUST be
                 periodically revised (maximum 90-day rotation for GxP-critical
                 accounts is RECOMMENDED). The IdP MUST enforce password history
                 (minimum 12 previous passwords) to prevent reuse.

             (c) **21 CFR 11.300(c) — Loss management procedures:**
                 The authentication system MUST implement procedures for
                 electronically deauthorizing lost, stolen, or compromised tokens,
                 passwords, or identification codes. Deauthorization MUST be
                 reflected in the SubjectProviderPort within the scope refresh
                 interval (maxScopeLifetimeMs).

             (d) **21 CFR 11.300(d) — Safeguards against unauthorized use:**
                 The authentication system MUST implement:
                 (1) Password complexity rules (minimum length, character class
                     requirements).
                 (2) Account lockout after consecutive failed attempts (maximum
                     5 consecutive failures before lockout is RECOMMENDED).
                 (3) Device checks or multi-factor authentication for remote
                     access or elevated-privilege operations.
                 (4) Session timeout and re-authentication for idle sessions.

             (e) **EU GMP Annex 11 §12 — Security:**
                 Physical and/or logical controls MUST restrict access to
                 authorized personnel. The IdP MUST support role-based access
                 provisioning that aligns with the guard's role hierarchy
                 (03-role-types.md).

             These controls are CONSUMER RESPONSIBILITIES — the guard library
             cannot enforce them because authentication is outside its scope.
             However, the guard library's GxP compliance posture depends on
             these controls being in place. The checkGxPReadiness() diagnostic
             (07-guard-adapter.md) provides a documentary reminder but cannot
             programmatically verify IdP configuration.

             Reference: 21 CFR 11.300(a)-(d), EU GMP Annex 11 §12,
             PIC/S PI 011-3 §9.3.
```

```
REQUIREMENT: The OQ validation plan (section 67b, OQ-22) MUST include
             verification that the consuming application's IdP satisfies the
             authentication controls listed above. This verification MAY be
             performed via documentation review and IdP configuration audit
             rather than programmatic testing, since IdP configuration is
             outside the guard library's control. Evidence of IdP compliance
             MUST be included in the OQ report.
             Reference: 21 CFR 11.300, EU GMP Annex 11 §12.
```

### 59a. SubjectProvider Integrity Verification

The guard library's ALCOA+ "Attributable" principle depends entirely on the integrity of the `AuthSubject` provided by the `SubjectProviderPort` adapter. If the SubjectProvider returns incorrect or stale subject data, all downstream audit entries will be mis-attributed.

```
REQUIREMENT: When gxp is true, the SubjectProviderPort adapter implementation
             MUST provide verifiable subject integrity. Specifically:
             (a) Token validation: When the SubjectProvider receives identity
                 claims from an external IdP (JWT, SAML assertion, OIDC
                 token), the adapter MUST validate the token's cryptographic
                 signature before extracting subject fields. Unsigned or
                 invalid tokens MUST be rejected with a SubjectProviderError.
             (b) Claim freshness: The adapter MUST verify that the identity
                 token has not expired (exp claim for JWT, NotOnOrAfter for
                 SAML). Expired tokens MUST be rejected. The maximum
                 acceptable clock skew for token expiration checks MUST be
                 documented in the validation plan (default: 30 seconds).
             (c) Audience verification: The adapter MUST verify that the
                 token is intended for this application (aud claim for JWT,
                 Audience restriction for SAML). Tokens intended for a
                 different audience MUST be rejected.
             (d) Issuer verification: The adapter MUST verify that the token
                 was issued by a trusted IdP (iss claim for JWT, Issuer for
                 SAML). Tokens from untrusted issuers MUST be rejected.
             (e) Field mapping validation: The mapping from IdP claims to
                 AuthSubject fields (subjectId, authenticationMethod,
                 authenticatedAt) MUST be documented and verified during OQ.
                 Missing required claims MUST cause subject resolution to
                 fail with a diagnostic error, not produce an AuthSubject
                 with empty fields.
             Reference: 21 CFR 11.10(d), 21 CFR 11.300(a),
             ALCOA+ Attributable.

RECOMMENDED: In non-GxP environments, SubjectProvider adapters SHOULD
             implement the same token validation practices. Organizations
             that skip token validation SHOULD document this in their risk
             assessment with justification.
```

```
REQUIREMENT: When gxp is true, the SubjectProviderPort adapter MUST be
             registered during application bootstrap (graph construction time)
             and MUST NOT be replaceable at runtime after the first guard
             evaluation has been performed. Specifically:
             (a) Adapter immutability: Once the guard graph has been built and
                 the first evaluate() call has been served, the SubjectProviderPort
                 binding MUST be frozen. Any attempt to swap, override, or
                 re-register the SubjectProviderPort adapter after this point
                 MUST be rejected with an error (code: PROVIDER_LOCKED).
             (b) Bootstrap-only registration: The SubjectProviderPort adapter
                 MUST be provided via the graph builder (provideAdapter) or
                 equivalent composition mechanism. Late-binding or dynamic
                 resolution of the SubjectProviderPort from untrusted input
                 (e.g., request headers, query parameters, user-supplied
                 configuration) is PROHIBITED.
             (c) Scope isolation: In child scopes, the SubjectProviderPort
                 MUST be inherited from the parent scope unless the child scope
                 is constructed with an explicit adapter override at scope
                 creation time. Runtime replacement within an existing scope
                 is PROHIBITED.
             (d) Diagnostic: checkGxPReadiness() MUST verify that the
                 SubjectProviderPort is registered and locked. A missing or
                 unlocked SubjectProviderPort MUST cause checkGxPReadiness()
                 to report FAIL with diagnostic code
                 "guard.subject-provider-not-locked".
             These constraints prevent DI-level spoofing attacks where a
             malicious actor replaces the SubjectProviderPort adapter at
             runtime to impersonate arbitrary subjects and bypass all
             authorization controls.
             Reference: 21 CFR 11.10(d), 21 CFR 11.10(g), ALCOA+ Attributable.
```

### System Validation (21 CFR 11.10(a))

21 CFR 11.10(a) requires "validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records." The guard library satisfies this through:

- **Validation plan (IQ/OQ/PQ):** Section 67 defines programmatic qualification runners covering installation, operational, and performance qualification.
- **Risk assessment (FMEA):** Section 68 applies ICH Q9 Failure Mode and Effects Analysis to all guard components, with all failure modes mitigated to RPN < 10.
- **Test evidence:** The Definition of Done (section 16) specifies 1294 tests across 29 DoD items, including type-level tests, unit tests, integration tests, and conformance suite tests.
- **Tamper detection:** Hash chain integrity (section 61.4) and electronic signatures (section 65) provide the ability to discern invalid or altered records.

```
RECOMMENDED: Organizations SHOULD reference the guard library's validation artifacts
             (IQ/OQ/PQ reports from section 67, FMEA from section 68, and test execution
             evidence) in their site validation master plan as supporting evidence for
             21 CFR 11.10(a) compliance. The guard library's built-in `checkGxPReadiness()`
             diagnostic (07-guard-adapter.md) SHOULD be included in the OQ test suite.
```

```
RECOMMENDED: When gxp is true on the guard graph, the guard adapter SHOULD emit a
             one-time WARNING-level diagnostic with code "guard.gxp-readiness-unchecked"
             on the first guard evaluation if checkGxPReadiness() has not been called
             prior to that evaluation. This diagnostic alerts operators that the guard
             is operating in GxP mode without pre-deployment readiness verification.
             The diagnostic MUST NOT block the evaluation — it is advisory only.
             The diagnostic MUST be emitted at most once per guard graph instance
             (not once per evaluation or per scope). After checkGxPReadiness() is
             called (regardless of the result), the diagnostic MUST NOT be emitted.
             This provides a safety net for deployments that accidentally skip the
             readiness check without introducing a hard dependency on calling
             checkGxPReadiness() before first use.
             Reference: 21 CFR 11.10(a), GAMP 5 (operational readiness).
```

### System Classification (21 CFR 11.10(j) / 11.30)

21 CFR Part 11 distinguishes between two system classifications that determine the applicable control set:

| Classification    | Definition (per 21 CFR 11.3)                                                                                                                                             | Guard Deployment Example                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Closed system** | An environment in which system access is controlled by persons who are responsible for the content of electronic records that are on the system (21 CFR 11.3(b)(4)).     | Guard deployed behind a corporate firewall or VPN where the organization controls all network endpoints and the audit trail backing store resides on-premise or within a single-tenant cloud VPC.                                                            |
| **Open system**   | An environment in which system access is not controlled by persons who are responsible for the content of electronic records that are on the system (21 CFR 11.3(b)(9)). | Guard audit data traverses a public network (e.g., audit entries sent to a cloud-hosted compliance service over the internet), electronic signatures cross organizational boundaries, or MCP/A2A audit data access channels are exposed beyond the site LAN. |

The requirements throughout this document primarily address **closed system** controls per 21 CFR 11.10. Open system deployments must satisfy all closed-system controls **plus** the additional controls specified in 21 CFR 11.30.

```
REQUIREMENT: When classified as an open system under 21 CFR 11.30, implementations
             MUST encrypt audit data in transit using TLS 1.2 or higher. Digital
             signatures MUST be applied to audit entry batches for origin
             authentication, ensuring that audit data received by remote systems can
             be verified as originating from the legitimate guard deployment. These
             controls are in addition to the closed-system controls defined throughout
             this document. Reference: 21 CFR 11.30(a), (b).
```

```
REQUIREMENT: For open system deployments, the minimum transport encryption
             version MUST be TLS 1.2. This floor applies to ALL data channels
             that carry guard-related data, including:
             (a) Audit trail data transmitted to remote backing stores.
             (b) Electronic signature payloads exchanged with remote
                 SignatureService adapters or HSMs.
             (c) MCP resource channels and A2A skill endpoints that expose
                 guard inspection or audit data (section 12-inspection.md).
             (d) SubjectProviderPort communication with external IdPs when
                 the IdP is reached over a public or untrusted network.
             TLS 1.0 and TLS 1.1 MUST NOT be accepted on any of these channels.
             Cipher suites MUST exclude known-weak algorithms (RC4, DES, 3DES,
             export-grade ciphers, NULL ciphers). Certificate validation MUST
             be enabled (no trust-all-certificates configurations in production).
             Reference: 21 CFR 11.30(a), NIST SP 800-52 Rev. 2.

RECOMMENDED: TLS 1.3 SHOULD be used in preference to TLS 1.2 where both
             endpoints support it. TLS 1.3 eliminates legacy cipher suites
             and reduces handshake latency. Organizations SHOULD document their
             TLS version policy and review it annually against NIST SP 800-52
             and applicable regulatory guidance.
```

```
REQUIREMENT: Organizations MUST classify their guard deployment as "closed" or "open"
             per the following decision tree before initial GxP deployment:
             1. Does audit trail data traverse a public or untrusted network? → Open
             2. Do electronic signatures cross organizational boundaries? → Open
             3. Are MCP/A2A audit data access channels exposed beyond the site LAN? → Open
             4. If none of the above → Closed
             The classification decision MUST be documented in the validation plan
             (section 67) with the rationale for the determination. The classification
             MUST be reviewed annually or when network architecture changes. A change
             from closed to open MUST trigger re-assessment of controls per the change
             control process (section 64a).
             Reference: 21 CFR 11.10(j), 21 CFR 11.30.
```

### EU GMP Annex 11 Explicit Coverage

The following subsections address EU GMP Annex 11 sections that are within the guard library's scope but were previously covered only indirectly through ALCOA+ mapping (section 60). Each section below provides explicit requirements or guidance.

#### Annex 11 Section 5 — Data (Input Validation)

Annex 11 Section 5 requires that "computerised systems exchanging data electronically with other systems should include appropriate built-in checks for the correct and secure entry and processing of data, in order to minimise the risks."

```
REQUIREMENT: When gxp is true, the guard adapter MUST validate policy input
             schemas before evaluation. Specifically:
             (a) Resource attribute types referenced by hasAttribute policies
                 MUST be checked against the declared attribute schema at
                 graph construction time. A policy referencing an attribute
                 name not present in the schema MUST produce a
                 ConfigurationError at build time.
             (b) Matcher operand types MUST be compatible with the attribute
                 type — for example, an `inArray` matcher on a boolean
                 attribute MUST be rejected at build time.
             (c) Subject attribute values provided at evaluation time MUST
                 conform to the declared types. Type mismatches MUST produce
                 a PolicyEvaluationError (not a silent coercion or fallback).
             This ensures that data entering the authorization decision
             pipeline is validated before processing, minimising the risk of
             incorrect access decisions due to malformed input.
             Reference: EU GMP Annex 11 Section 5, 21 CFR 11.10(h).
             REQ-GUARD-070.
```

#### Annex 11 Section 6 — Accuracy Checks

Annex 11 Section 6 requires "built-in checks for the correct and secure entry and processing of data" including accuracy checks on critical data entered manually.

```
REQUIREMENT: When gxp is true, the guard adapter MUST support resource
             attribute accuracy checks. Specifically:
             (a) Resource attributes used in hasAttribute policies MAY carry
                 an optional freshness threshold (maxAgeMs). When a freshness
                 threshold is configured, the guard adapter MUST compare the
                 attribute's provenance timestamp against the current clock
                 time. If the attribute is older than the threshold, the
                 evaluation MUST return deny with reason
                 "attribute_stale: <attributeName>".
             (b) When gxp is true and a resource attribute does not carry a
                 provenance timestamp, the guard adapter MUST log a WARNING
                 with diagnostic code "guard.attribute-freshness-unknown"
                 on the first evaluation referencing that attribute (at most
                 once per attribute name per guard graph instance).
             (c) The freshness check is advisory for non-GxP environments
                 (RECOMMENDED) and mandatory for GxP environments when
                 configured.
             These checks ensure that authorization decisions are based on
             accurate, current data rather than stale cached values.
             Reference: EU GMP Annex 11 Section 6, ALCOA+ Accurate.
             REQ-GUARD-071.
```

#### Annex 11 Section 8 — Printouts

Annex 11 Section 8 requires that "it should be possible to obtain clear printed copies of electronically stored data."

```
RECOMMENDED: Organizations operating in GxP environments SHOULD ensure that
             audit trail review interfaces and export mechanisms can produce
             hardcopy (printed) reports of audit trail data. Printed reports
             SHOULD include:
             (a) Report header: system name, version, report generation
                 timestamp, date range covered, generating user identity.
             (b) Entry detail: all AuditEntry fields in human-readable format,
                 including signature details where applicable.
             (c) Chain integrity status: a summary of verifyAuditChain()
                 results for the reported entries.
             (d) Page numbering: "Page X of Y" to detect missing pages.
             (e) Report footer: checksum or digital signature for report
                 integrity verification.
             Reference: EU GMP Annex 11 Section 8.
```

> **Note:** Print formatting and rendering is a consumer responsibility. The guard library provides structured data (`AuditEntry`, `GxPAuditEntry`, export manifests per §64) suitable for formatting into printed reports. The library does not include print layout or PDF generation capabilities.

#### Annex 11 Section 15 — Batch Release

Annex 11 Section 15 states that computerised systems used for batch release must ensure "only Authorised Persons can certify the release of the batches."

> **Note:** Batch release is an industry-specific process (pharmaceutical manufacturing, medical device production) that is **out of scope** for an authorization library. However, the guard library integrates with batch release workflows as follows:
>
> - **Authorization gate:** `guard()` with `hasSignature("approved")` and `minSigners >= 2` (§65d-1) can enforce that only Authorised Persons (as defined in EU Directive 2001/83/EC Article 48) approve batch release operations.
> - **Audit evidence:** The guard audit trail provides the electronic record of who authorized the batch release, when, and with what meaning — satisfying the traceability requirements of Annex 11 Section 15.
> - **Electronic signatures:** The `hasSignature` policy variant with counter-signing (§65d) provides the maker-checker pattern required for batch release approvals.
>
> The consuming application's batch release module is responsible for the domain-specific release logic. The guard library provides the authorization and audit infrastructure that the batch release module relies on.

### Electronic Record Classification

The following artifacts produced or managed by the guard system constitute **electronic records** under 21 CFR 11.3(b)(6) ("any combination of text, graphics, data, audio, pictorial, or other information representation in digital form that is created, modified, maintained, archived, retrieved, or distributed by a computer system"):

| Artifact                                                  | Part 11 Classification                           | Applicable Controls                                                                           |
| --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `AuditEntry` (including `GxPAuditEntry`)                  | Electronic record — primary compliance evidence  | Audit trail (11.10(e)), integrity (11.10(c)), retention (11.10(c)), access control (11.10(d)) |
| `Decision` (evaluation result)                            | Electronic record — operational record           | Integrity (11.10(c)), contemporaneous recording (ALCOA+)                                      |
| `EvaluationTrace`                                         | Electronic record — diagnostic/provenance record | Integrity (11.10(c)), legibility (ALCOA+)                                                     |
| `ElectronicSignature`                                     | Electronic signature bound to electronic record  | Signature manifestation (11.50), linking (11.70), controls (11.100, 11.200, 11.300)           |
| Serialized policy configuration (via `serializePolicy()`) | Electronic record — system configuration         | Change control (11.10(k)), version control (section 64a)                                      |

> **Note:** The `AuditEntry` record is the primary compliance artifact. `Decision` and `EvaluationTrace` are embedded within or correlated to `AuditEntry` via `evaluationId`. See section 63 for retention requirements applicable to each record type.

### Predicate Rules (21 CFR 11.2)

```
RECOMMENDED: Organizations SHOULD identify the predicate rules (underlying FDA
             regulations) that govern the electronic records being accessed through
             guard-protected ports. Part 11 applies when predicate rules require
             the creation, modification, maintenance, archival, retrieval, or
             distribution of records in electronic form. Guard's audit trail
             retention periods (section 63) MUST align with the retention
             requirements of the applicable predicate rules — for example, 21 CFR
             211 (current Good Manufacturing Practice for pharmaceuticals) requires
             retention for 1 year past the expiration date of the batch. The
             port-to-record-type mapping in section 63 SHOULD document which
             predicate rule governs each record type to ensure retention alignment.
             Reference: 21 CFR 11.2, 21 CFR 11.1(b).
```

```
RECOMMENDED: Organizations SHOULD maintain a predicate rule mapping document that
             identifies which paper-based regulatory requirements are fulfilled by
             electronic records in the guard audit trail. The mapping SHOULD:
             (a) Enumerate each applicable predicate rule (e.g., 21 CFR 211 batch
                 records for pharmaceutical manufacturing, 21 CFR 820 device history
                 records for medical devices, EU GMP Annex 15 for qualification and
                 validation records).
             (b) For each predicate rule, identify the specific guard port(s) and
                 policy configuration(s) that enforce the corresponding electronic
                 record controls.
             (c) Document which audit trail entry fields satisfy each predicate rule's
                 record-keeping requirements (e.g., subjectId for attributability,
                 timestamp for contemporaneousness).
             (d) Be included as an appendix to the validation plan (section 67).
             (e) Be reviewed during each periodic review cycle (section 64) to ensure
                 continued alignment as predicate rules or guard configurations change.
             Reference: 21 CFR 11.2.
```

```
REQUIREMENT: In GxP-regulated environments, predicate rule mapping MUST be performed
             prior to system deployment. The mapping MUST:
             (a) Enumerate every applicable predicate rule (21 CFR Part 11 scope
                 determination per 21 CFR 11.1(b)) for the electronic records managed
                 by the system.
             (b) For each predicate rule, map the specific guard port(s), policy
                 configuration(s), and audit trail entry fields that enforce the
                 corresponding electronic record controls.
             (c) Be documented as a controlled document (or appendix to the validation
                 plan per section 67) with version, date, and author.
             (d) Be reviewed and approved by the quality unit before initial deployment.
             (e) Be re-reviewed during each periodic review cycle (section 64) and
                 whenever predicate rules or guard configurations change.
             The mapping document MUST be retained for the same period as the electronic
             records it covers.
             Reference: 21 CFR 11.2, 21 CFR 11.1(b), GAMP 5 Section 4.4.
```

> **Note:** The RECOMMENDED blocks above remain as non-GxP guidance for organizations that voluntarily adopt predicate rule mapping as a best practice. In GxP-regulated environments, the REQUIREMENT block above supersedes the RECOMMENDED blocks, making predicate rule mapping mandatory.

```
REQUIREMENT: When gxp is true, the guard graph configuration MUST include a
             non-empty predicateRuleMapping property that documents the
             applicable predicate rules and their mapping to guard ports and
             policies. Specifically:
             (a) The predicateRuleMapping configuration property MUST be
                 provided at graph construction time. Omitting this property
                 or providing an empty mapping when gxp is true MUST produce
                 a ConfigurationError at build time.
             (b) checkGxPReadiness() item 15 MUST verify that
                 predicateRuleMapping is present and non-empty. A missing or
                 empty predicateRuleMapping MUST cause checkGxPReadiness() to
                 report FAIL with diagnostic code
                 "guard.predicate-rule-mapping-missing".
             (c) Each entry in the mapping MUST reference at least one guard
                 port and one predicate rule identifier.
             This enforces the procedural requirement (above) at the
             programmatic level, ensuring that GxP deployments cannot proceed
             without documenting their predicate rule applicability.
             Reference: 21 CFR 11.2, 21 CFR 11.1(b), GAMP 5 Section 4.4.
             REQ-GUARD-067.
```

---

## 60. ALCOA+ Compliance Mapping

### How Guard Satisfies Each Principle

| Principle           | Requirement                                        | Guard Implementation                                                                                                        | Consumer Responsibility                                          |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Attributable**    | Every record traceable to a person                 | `AuditEntry.subjectId`, `AuditEntry.authenticationMethod`, `Decision.subjectId`                                             | Ensure `subjectId` maps to a verified identity                   |
| **Legible**         | Records must be readable and permanent             | `serializePolicy()` produces deterministic JSON; `explainPolicy()` produces human-readable text                             | Store audit entries in a human-reviewable format                 |
| **Contemporaneous** | Records created at the time of the event           | `Decision.evaluatedAt` and `AuditEntry.timestamp` use the guard clock source (ISO 8601 UTC)                                 | Use NTP-synchronized clock source in production (see section 62) |
| **Original**        | Records are the first capture of data              | All `Decision` and `AuditEntry` objects are frozen (`Object.freeze`); cannot be mutated after creation                      | Implement append-only storage (see section 61)                   |
| **Accurate**        | Records reflect what actually happened             | `evaluate()` is deterministic with respect to policy logic, with full `EvaluationTrace`; no side effects alter the decision | Do not transform or filter audit entries before persistence      |
| **Complete**        | All events are recorded, nothing omitted           | Every `guard()` evaluation (both allow and deny) calls `AuditTrail.record()`                                                | Do not drop or filter audit entries based on verdict             |
| **Consistent**      | Records use consistent formats and identifiers     | `evaluationId` (UUID v4) correlates `Decision` with `AuditEntry`; ISO 8601 timestamps throughout                            | Use the same clock source for all guard-related timestamps       |
| **Enduring**        | Records persist for the required retention period  | Guard produces records; does not manage storage                                                                             | Implement retention policies per section 63                      |
| **Available**       | Records accessible for review throughout retention | `GuardInspector` provides real-time access; MCP resources provide remote access                                             | Implement audit trail review interface per section 64            |

> **REQUIREMENT:** Guard's data integrity controls MUST be incorporated into the site's broader data integrity policy and data governance framework per MHRA Data Integrity Guidance (2018) and WHO Technical Report Series No. 996 Annex 5. This ensures guard audit trail requirements are consistent with the organization's overall approach to electronic record integrity. The data governance framework MUST document how guard audit entries are classified, stored, reviewed, and retained within the site's overall data lifecycle management.

> **RECOMMENDED:** When the `SubjectProviderPort` adapter integrates with an external Identity Provider (IdP) — such as LDAP, SAML, or OIDC — organizations SHOULD verify that `AuthSubject` fields (`subjectId`, `authenticationMethod`, `authenticatedAt`) accurately map to the IdP's assertions or claims. This mapping SHOULD be validated as part of Operational Qualification (OQ) to ensure the "Attributable" ALCOA+ principle is satisfied end-to-end from authentication to audit entry.

> **Clarification — GuardInspector Ring Buffer vs. Audit Trail:** The `GuardInspector` (section 12-inspection.md) maintains an in-memory ring buffer of recent decisions for diagnostic and DevTools purposes. This ring buffer is **not** the audit trail. Data loss from the ring buffer (e.g., due to eviction or process restart) does **not** constitute an ALCOA+ compliance violation because the authoritative audit record is maintained by the `AuditTrailPort` adapter implementation. The ring buffer provides "Available" convenience access for development and debugging; the audit trail provides "Enduring" and "Complete" compliance evidence. When `gxp: true`, `checkGxPReadiness()` warns if `maxRecentDecisions` is below 200 to ensure adequate diagnostic visibility, but this is an operational recommendation, not a data integrity requirement.

---

---

_Previous: [17 - GxP Compliance Guide (Index)](../17-gxp-compliance.md) | Next: [Audit Trail Contract](./02-audit-trail-contract.md)_
