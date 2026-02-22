# GxP Compliance — @hex-di/http-client: Audit Schema & Cross-Chain Integrity

> Part of the `@hex-di/http-client` GxP compliance sub-document suite.
> [Governance index](./gxp.md) | [Sub-document index](./README.md)

---

## 82. Cross-Chain Integrity Verification

When both the HTTP client's built-in FNV-1a chain and an `HttpAuditTrailPort` adapter providing SHA-256 chains are active, two independent hash chains exist for HTTP operations. This section specifies how to verify consistency between them.

### CrossChainVerificationResult

```typescript
interface CrossChainVerificationResult {
  /** Unique identifier for this verification evaluation. */
  readonly evaluationId: string;

  /** Whether the SHA-256 audit trail chain (via HttpAuditTrailPort) is intact. */
  readonly auditTrailChainIntact: boolean;

  /** Whether the HTTP client's built-in FNV-1a chain is intact. */
  readonly httpChainIntact: boolean;

  /**
   * Whether timestamps are consistent between chains.
   * Checks that entries with the same requestId have matching
   * monotonic timestamps (within a tolerance of 1ms).
   */
  readonly timestampConsistent: boolean;

  /**
   * Whether correlation IDs (requestId, scopeId) match between chains.
   * Every entry in the HTTP chain with a corresponding authorization audit entry
   * must have matching requestId and scopeId values.
   */
  readonly correlationValid: boolean;

  /** ISO 8601 UTC timestamp of the verification. */
  readonly verifiedAt: string;

  /** Number of entries compared. */
  readonly entriesCompared: number;

  /** Discrepancies found (empty when all checks pass). */
  readonly discrepancies: ReadonlyArray<{
    readonly requestId: string;
    readonly field: string;
    readonly httpValue: string;
    readonly auditTrailValue: string;
  }>;
}
```

```
REQUIREMENT: When `gxp: true` is set and both the HTTP client's FNV-1a chain and an
             HttpAuditTrailPort adapter (SHA-256 chain) are active, cross-chain consistency
             checks using CrossChainVerificationResult MUST be performed at least once
             per container lifecycle (e.g., during graceful shutdown) and on-demand
             when audit integrity concerns arise. When both chains are active, the
             runtime MUST execute cross-chain verification during graceful shutdown
             and MUST expose a `verifyCrossChain()` method on the HttpClientInspector
             for on-demand verification. Discrepancies between the two chains MUST
             produce a CRITICAL alert and MUST be recorded as an
             HttpClientConfigurationAuditEntry with configurationKey
             "CROSS_CHAIN_INTEGRITY_VIOLATION".
             Reference: EU GMP Annex 11 §7 (data integrity), ALCOA+ Consistent,
             21 CFR 11.10(e).
```

```
REQUIREMENT: Organizations MUST additionally schedule periodic cross-chain
             verification at a configurable interval (REQUIRED: hourly for
             active scopes) to detect integrity divergence earlier than graceful
             shutdown. Automated cross-chain verification results MUST be
             included in periodic review documentation (§83b).
             Reference: EU GMP Annex 11 §7, ALCOA+ Consistent.
```

### Verification Logic

Cross-chain verification proceeds as follows:

1. Call `verifyHistoryChain()` on the HTTP client history to verify the FNV-1a chain.
2. Call `verifyAuditChain()` on the `HttpAuditTrailPort` to verify the SHA-256 chain.
3. For each `requestId` present in both chains, compare monotonic timestamps and correlation fields.
4. Report discrepancies with the specific field and values that differ.

```typescript
// Example: periodic cross-chain verification
const httpHistory = inspector.getHistory();
const auditTrailEntries = auditTrail.getEntries();

const result: CrossChainVerificationResult = {
  evaluationId: generateEvaluationId(),
  httpChainIntact: verifyHistoryChain(httpHistory),
  auditTrailChainIntact: auditTrail.verifyChain(),
  timestampConsistent: verifyTimestampConsistency(httpHistory, auditTrailEntries),
  correlationValid: verifyCorrelation(httpHistory, auditTrailEntries),
  verifiedAt: new Date().toISOString(),
  entriesCompared: httpHistory.length,
  discrepancies: findDiscrepancies(httpHistory, auditTrailEntries),
};

if (!result.httpChainIntact || !result.auditTrailChainIntact) {
  logger.error("Audit chain integrity violation detected", { evaluationId: result.evaluationId });
}
```

---

## 83. Audit Entry Schema Versioning Strategy

When `HttpAuditSink` entries are externalized to persistent storage, the entry schema may evolve across library versions. This section specifies versioning conventions for externalized audit entries.

```
RECOMMENDED: Externalized HttpHistoryEntry records SHOULD include a schemaVersion field
             indicating the version of the entry schema used at creation time. The
             schemaVersion follows the library's semver version (e.g., "0.1.0") and
             enables downstream consumers to apply appropriate deserialization logic.
             Reference: EU GMP Annex 11 §7 (data integrity), ALCOA+ Enduring.
```

### Schema Versioning Interface

```typescript
interface VersionedAuditEntry {
  /** Schema version of this entry (semver, e.g., "0.1.0"). */
  readonly schemaVersion: string;

  /** The audit entry data. */
  readonly entry: HttpHistoryEntry;

  /** ISO 8601 UTC timestamp of externalization. */
  readonly externalizedAt: string;

  /** Source library identifier. */
  readonly source: "http-client";
}
```

### Migration Rules

1. **New fields are optional.** When a new library version adds fields to `HttpHistoryEntry`, the new fields MUST have default values. Consumers MUST treat missing fields as their default values.
2. **Existing fields are not removed.** Fields present in a schema version MUST NOT be removed in subsequent versions. They MAY be deprecated (ignored by consumers) but MUST remain in the serialized form.
3. **Unknown versions are rejected.** When a consumer encounters a `schemaVersion` it does not recognize (i.e., a version newer than the consumer's library), it MUST reject the entry with a clear error rather than silently misinterpreting fields.
4. **Backward compatibility window.** Consumers SHOULD support at least the current major version and one prior major version of the schema.

### Relationship to Ecosystem Audit Schemas

Other HexDi ecosystem libraries may define their own audit entry schemas. When multiple libraries are deployed:

- HTTP client entries use `source: "http-client"` and the HTTP client's `schemaVersion`.
- Other ecosystem libraries use their own `source` identifier and `schemaVersion`.
- Cross-chain verification (§82) operates on entries from both sources and MUST handle schema version differences gracefully.

---

## 83a. Validation Plan Reference

This section defines the Validation Plan outline for HTTP transport controls in GxP environments, as required by GAMP 5 (Category 5 software validation) and EU GMP Annex 11 §4 (Validation).

> **Ecosystem Validation Plan Integration:** When other HexDi ecosystem libraries are deployed alongside `@hex-di/http-client`, the HTTP transport validation activities described here SHOULD be incorporated into the organization's master Validation Plan. This section serves as the standalone Validation Plan outline for HTTP transport controls.

### Validation Plan Outline

The Validation Plan for `@hex-di/http-client` GxP transport controls MUST address the following:

| Section                               | Content                                                                                                                                                                                                                          | Reference            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **1. Purpose and Scope**              | Define the scope of validation: which HTTP endpoints carry GxP data, which combinators are required, which regulatory frameworks apply.                                                                                          | GAMP 5 §D.4          |
| **2. Validation Strategy**            | Specify the approach: risk-based validation per ICH Q9, leveraging FMEA (§98) for risk assessment, IQ/OQ/PQ (§99) for qualification.                                                                                             | GAMP 5 §D.5          |
| **3. System Description**             | Describe the HTTP client architecture: transport adapters, combinator pipeline, audit bridge, integration with authorization via HttpAuthorizationPort. Reference spec sections 01-16 for base HTTP client and sections 84-97 for transport security. | EU GMP Annex 11 §4.2 |
| **4. Roles and Responsibilities**     | Define who performs validation activities: system owner, QA reviewer, IT infrastructure team. Include shared responsibilities between library (this spec) and consumer (ALCOA+ mapping §80).                                     | GAMP 5 §D.6          |
| **5. Risk Assessment**                | Reference the FMEA in §98. Document the risk classification of each HTTP endpoint (critical, major, minor) based on ICH Q9 severity criteria.                                                                                    | ICH Q9 §4            |
| **6. Qualification Protocol**         | Reference IQ/OQ/PQ in §99. Specify acceptance criteria for each qualification phase. Document any deviations from the standard protocol.                                                                                         | GAMP 5 §D.8          |
| **7. Test Environment Specification** | Document the test environment: network isolation requirements, test certificate authority configuration, controlled clock sources (NTP server or mock), known-good TLS endpoints for OQ verification.                            | GAMP 5 §D.9          |
| **8. Traceability Matrix**            | Reference the regulatory traceability matrix in §100. Map each requirement to its test evidence.                                                                                                                                 | EU GMP Annex 11 §4.3 |
| **9. Deviation Handling**             | Define the process for handling deviations: how PQ threshold failures are escalated, who approves risk acceptances, how deviations are documented.                                                                               | GAMP 5 §D.10         |
| **10. Validation Report**             | Define the format and content of the final validation report: summary of IQ/OQ/PQ results, list of deviations and resolutions, overall compliance assessment.                                                                    | EU GMP Annex 11 §4.4 |
| **11. Periodic Review Schedule**      | Reference §83b (Periodic Review and Revalidation). Define the initial periodic review schedule.                                                                                                                                  | EU GMP Annex 11 §11  |

```
REQUIREMENT: GxP deployments of @hex-di/http-client MUST have a documented
             Validation Plan that covers at minimum sections 1-10 of the outline
             above. The Validation Plan MUST be approved by the system owner and
             QA before qualification activities commence. The Plan MUST reference
             the specific version of @hex-di/http-client being validated.
             Reference: GAMP 5 §D.4, EU GMP Annex 11 §4.
```

```
REQUIREMENT: The Validation Plan MUST include a Test Environment Specification
             (section 7) documenting: (a) network isolation controls preventing
             test HTTP traffic from reaching production GxP systems, (b) test
             certificate authority used for TLS verification tests, (c) clock
             source configuration (real NTP or deterministic mock for timestamp
             tests), (d) test audit sink configuration and retention, and
             (e) test subject identities used for attribution and RBAC tests.
             Reference: GAMP 5 §D.9.
```

```
RECOMMENDED: Organizations SHOULD automate IQ/OQ/PQ execution and report
             generation using CI/CD pipelines. The qualification protocol
             produces machine-readable JSON reports suitable for regulatory
             submission and supports headless execution.
```

### Validation Plan Template

The following template provides a fill-in starting point for organizations preparing a Validation Plan. Each section corresponds to the outline above.

---

#### VP Section 1: Purpose and Scope

| Field | Value |
|-------|-------|
| **System Name** | _[Organization's name for the HTTP client deployment, e.g., "LIMS API Gateway"]_ |
| **Library Version** | _[@hex-di/http-client version, e.g., "0.1.0"]_ |
| **Ecosystem Adapter Versions** | _[List all port adapter provider libraries and versions, e.g., "@hex-di/guard 0.1.0", "@hex-di/clock 0.1.0"]_ |
| **Applicable Regulations** | _[Check all that apply: ☐ FDA 21 CFR Part 11, ☐ EU GMP Annex 11, ☐ ICH Q9, ☐ Other: ___]_ |
| **GxP Endpoint Inventory** | _[List all endpoints carrying GxP data with their Category (1/2/3) per §84]_ |
| **GAMP 5 Classification** | Category 5 — Custom Applications (per §108) |

#### VP Section 2: Validation Strategy

| Field | Value |
|-------|-------|
| **Risk Methodology** | ICH Q9 with FMEA scoring per §98 |
| **Qualification Approach** | IQ/OQ/PQ per §99 |
| **Test Coverage Target** | _[Minimum: 90% requirement coverage, recommended: 100%]_ |
| **Mutation Testing Target** | _[Per §16: ≥85% unit, ≥90% combinator, ≥85% integration]_ |

#### VP Section 3: System Description

_[Insert architecture diagram showing: transport adapter selection, combinator pipeline composition, audit bridge integration, port-based authorization flow. Reference spec sections 01-16 for base HTTP client and sections 84-97 for transport security.]_

#### VP Section 4: Roles and Responsibilities

| Role | Assigned To | Responsibilities |
|------|-------------|-----------------|
| **System Owner** | _[Name, title]_ | Overall accountability for validation |
| **QA Reviewer** | _[Name, title]_ | Review and approve validation documentation |
| **Developer** | _[Name, title]_ | Implement and unit-test GxP HTTP client adapters |
| **Validator** | _[Name, title]_ | Execute IQ/OQ/PQ, maintain FMEA and traceability |
| **System Administrator** | _[Name, title]_ | Deploy, configure, manage audit trail storage |

#### VP Section 5: Risk Assessment

| Field | Value |
|-------|-------|
| **FMEA Reference** | §98 (43 failure modes) |
| **Highest RPN Before Mitigation** | _[From FMEA]_ |
| **Highest RPN After Mitigation** | ≤ 8 (all mitigated per §98) |
| **Endpoint Risk Classification** | _[Table mapping each endpoint to Category 1/2/3 per §84]_ |

#### VP Section 6: Qualification Protocol

| Phase | Acceptance Criteria | Reference |
|-------|-------------------|-----------|
| **IQ** | All components installed, versions verified, port adapter compatibility confirmed, deferred fields populated, encryption port accessible, NTP verified | §99 IQ-HT-01 through IQ-HT-07 |
| **OQ** | All OQ checks pass (OQ-HT-01 through OQ-HT-96, OQ-HT-ADV-01 through OQ-HT-ADV-05, OQ-HT-CF-01 through OQ-HT-SK-03), 119 total checks | §99 OQ section |
| **PQ** | Performance benchmarks met (PQ-HT-01 through PQ-HT-21), pharmaceutical business process scenarios verified (PQ-BP-01 through PQ-BP-06) | §99 PQ section |

#### VP Section 7: Test Environment Specification

| Component | Configuration |
|-----------|--------------|
| **Network Isolation** | _[How test HTTP traffic is prevented from reaching production GxP systems]_ |
| **Test Certificate Authority** | _[CA used for TLS verification tests, e.g., self-signed CA with SPKI pinning]_ |
| **Clock Source** | _[Real NTP server address or deterministic mock for timestamp tests]_ |
| **Audit Sink** | _[Test audit trail storage configuration and retention policy]_ |
| **Test Subject Identities** | _[Test user accounts with roles for attribution and RBAC testing]_ |

#### VP Section 8: Traceability Matrix

Reference: §100 (62-finding regulatory traceability matrix). The traceability matrix MUST be reviewed and header fields populated during IQ before OQ begins.

#### VP Section 9: Deviation Handling

| Deviation Type | Escalation Path | Approval Authority |
|---------------|----------------|-------------------|
| **PQ threshold failure** | _[Process for escalating failed PQ benchmarks]_ | _[QA + System Owner]_ |
| **OQ check failure** | _[Process for investigating and resolving OQ failures]_ | _[QA]_ |
| **Risk acceptance** | _[Process for accepting known risks with justification]_ | _[QA + Management]_ |

#### VP Section 10: Validation Report

The Validation Report MUST include: (1) summary of IQ/OQ/PQ results with pass/fail counts, (2) list of deviations and resolutions, (3) overall compliance assessment, (4) list of open items (if any) with risk acceptance, (5) recommendation for release or remediation.

#### VP Section 11: Periodic Review Schedule

| Field | Value |
|-------|-------|
| **Review Frequency** | _[Minimum: annual per §83b]_ |
| **First Review Due** | _[Date, 12 months after initial validation]_ |
| **Review Scope** | Per §83b: configuration drift, IQ re-execution, OQ sampling, audit chain integrity, change history, incident review, dependency updates, FMEA currency |
| **Revalidation Triggers** | Per §83b: major/minor upgrades, regulatory changes, security incidents, infrastructure changes, FMEA changes, periodic review findings |

#### VP Section 12: GxP Configuration Profile

_[Map each item in Appendix E (§15) to the organization's deployment configuration. Document which RECOMMENDED items are adopted and which are omitted with justification.]_

#### VP Section 13: IAM Integration

| Field | Value |
|-------|-------|
| **IAM System** | _[e.g., Azure AD, Okta, custom]_ |
| **SubjectProviderPort Implementation** | _[How subject identity is resolved from IAM]_ |
| **Role Mapping** | _[How IAM roles map to HttpOperationPolicy definitions]_ |
| **Token Refresh Mechanism** | _[OAuth2/OIDC token endpoint, refresh flow]_ |
| **Deprovisioning Procedure** | _[Effect on active HTTP client sessions when a user is deprovisioned]_ |

#### VP Section 14: Data Sovereignty

| Storage Type | Geographic Location | Data Transfer Mechanism |
|-------------|-------------------|----------------------|
| **Active Audit Trail** | _[e.g., EU-West-1]_ | _[N/A or approved transfer mechanism]_ |
| **Archival Storage** | _[e.g., EU-West-1]_ | _[N/A or approved transfer mechanism]_ |
| **Backup Storage** | _[e.g., EU-Central-1]_ | _[N/A or approved transfer mechanism]_ |

---

## 83b. Periodic Review and Revalidation

This section defines the periodic review and revalidation requirements for HTTP transport controls in GxP environments, as required by EU GMP Annex 11 §11 and GAMP 5 operational phase guidance.

### Review Schedule

```
REQUIREMENT: GxP deployments of @hex-di/http-client MUST undergo periodic review
             at least annually to confirm that the system remains in a validated
             state. The review MUST be documented and approved by QA.
             Reference: EU GMP Annex 11 §11.
```

### Periodic Review Scope

Each periodic review MUST include:

| Area                      | Review Activity                                                                                                                                                                      | Evidence Required                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Configuration Drift**   | Compare current HTTP client configuration against the validated baseline. Verify combinator pipeline, TLS settings, RBAC policies, and audit sink configuration.                     | Configuration comparison report  |
| **IQ Re-execution**       | Re-run Installation Qualification checks (IQ-HT-01 through IQ-HT-07 from §99a).                                                                                                      | IQ report with pass/fail results |
| **OQ Sampling**           | Re-run a representative subset of Operational Qualification checks. At minimum: OQ-HT-01 (HTTPS enforcement), OQ-HT-07 (credential redaction), OQ-HT-12 (audit bridge completeness). | OQ report with pass/fail results |
| **Audit Trail Integrity** | Run `verifyAuditChain()` on the HTTP audit trail to confirm hash chain integrity. If cross-chain verification (§82) is configured, run `CrossChainVerificationResult` check.         | Chain verification report        |
| **Change History**        | Review all `HttpClientConfigurationAuditEntry` records since the last review. Verify all changes were authorized and documented.                                                     | Change log review summary        |
| **Incident Review**       | Review any incidents related to HTTP transport security (credential leaks, TLS failures, audit gaps) since the last review.                                                          | Incident resolution evidence     |
| **Dependency Updates**    | Review security advisories for `@hex-di/http-client` and its port adapter providers. Verify that critical/high severity patches have been applied.                                   | Dependency audit report          |
| **FMEA Currency**         | Review the FMEA (§98) for any new failure modes introduced by changes since the last review.                                                                                         | Updated FMEA if changes found    |
| **Training Compliance**   | Verify all personnel assigned to the 6 training roles (§109, Appendix G) have current training records. Confirm annual refresher and assessment completion per TM-01 through TM-12.  | Training compliance report        |
| **Supplier Assessment**   | Review supplier assessment records (§108a) for all Category 3 third-party transport libraries. Verify no Critical/High CVEs unpatched and maintenance activity within 6 months.       | Supplier assessment refresh report |
| **Consumer Validation**   | Verify all 11 consumer validation controls (CV-01 through CV-11, §80b) remain current. Confirm infrastructure changes (NTP, KMS, TLS stack, IAM) have been reflected in CV evidence. | Updated CV evidence package       |

### Revalidation Triggers

Beyond the annual schedule, revalidation MUST be triggered by:

| Trigger                                                                                        | Scope of Revalidation            | Reference                |
| ---------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| **Major version upgrade** of `@hex-di/http-client`                                             | Full IQ/OQ/PQ                    | GAMP 5 operational phase |
| **Minor version upgrade** with GxP-affecting changes                                           | OQ + affected PQ checks          | GAMP 5 operational phase |
| **Regulatory change** affecting 21 CFR Part 11 or EU GMP Annex 11                              | FMEA review + affected OQ checks | EU GMP Annex 11 §11      |
| **Security incident** involving HTTP transport (credential leak, MITM, audit gap)              | Full OQ + root cause analysis    | ICH Q9 §4                |
| **Infrastructure change** (TLS stack upgrade, certificate authority change, NTP server change) | IQ + affected OQ checks          | EU GMP Annex 11 §10      |
| **FMEA revision** introducing new failure modes with RPN >= 15                                 | OQ checks for new mitigations    | ICH Q9 §4                |

```
REQUIREMENT: Revalidation triggered by security incidents MUST include a root
             cause analysis and verification that the incident has been fully
             remediated. The revalidation report MUST reference the incident
             number and resolution evidence. Revalidation MUST be completed
             before the system is returned to GxP production use.
             Reference: EU GMP Annex 11 §11, ICH Q9 §4.
```

```
RECOMMENDED: Organizations SHOULD automate periodic review checks using CI/CD
             pipelines that run IQ and OQ sampling checks on a scheduled basis
             (e.g., monthly). Automated checks SHOULD produce reports that feed
             into the annual periodic review documentation, reducing manual
             review effort while maintaining continuous compliance assurance.
```

### Configuration Drift Detection Procedure

Configuration drift occurs when runtime GxP parameter values diverge from the validated baseline documented in the Validation Plan (§83a, VP Section 12) and Appendix F. Drift MUST be detected proactively rather than discovered reactively during incidents.

```
REQUIREMENT: Organizations MUST implement a configuration drift detection procedure
             that compares runtime GxP parameter values against the validated baseline
             at least quarterly. For Category 1 endpoints (as classified per §81a),
             organizations MUST implement continuous or near-real-time drift detection
             (maximum detection latency: 1 hour) due to the elevated patient safety
             and data integrity risk associated with these endpoints. The procedure MUST:
             (1) Extract current runtime values for all 39 Configuration Specification
                 parameters listed in Appendix F (CS-1 through CS-10),
             (2) Compare each value against the corresponding Validation Plan baseline,
             (3) Flag any deviation as a potential configuration drift event,
             (4) Record each drift event as an HttpClientConfigurationAuditEntry (§88)
                 with configurationKey "CONFIGURATION_DRIFT_DETECTED" and the
                 drifted parameter name, expected value, and actual value,
             (5) Escalate Critical parameter drifts (parameters with Regulatory Minimum
                 in Appendix F) to QA within 24 hours,
             (6) Produce a Configuration Drift Report as evidence for periodic review.
             Parameters where drift is detected MUST be either restored to the validated
             baseline or documented as a controlled change via the Change Request process
             (§116). Unresolved drift MUST block the next periodic review sign-off.
             Reference: EU GMP Annex 11 §11, GAMP 5 §D.6, 21 CFR 11.10(j).
```

| Drift Severity | Criteria | Response |
|---------------|----------|----------|
| **Critical** | Parameter with Regulatory Minimum (Appendix F) deviates from validated value | Immediate investigation; QA notification within 24 hours; system quarantine if data integrity at risk |
| **Major** | Parameter with MUST/REQUIRED validation rule deviates from validated value | Investigation within 5 business days; corrective action required before next periodic review |
| **Minor** | Parameter with RECOMMENDED/SHOULD rule deviates from documented value | Documented in Configuration Drift Report; addressed during next periodic review |

### 83d. CAPA Procedures for Recurring Deviations

When deviations from GxP transport controls recur across multiple periodic review cycles or qualification attempts, a formal Corrective and Preventive Action (CAPA) process MUST be initiated to address the systemic root cause.

```
REQUIREMENT: Organizations MUST implement a CAPA procedure for recurring GxP
             transport deviations. A CAPA MUST be initiated when:
             (1) The same OQ check fails in two or more consecutive qualification
                 cycles (IQ/OQ/PQ or periodic review),
             (2) The same configuration drift event is detected in two or more
                 consecutive drift detection cycles,
             (3) The same incident type (per §83c classification) occurs three or
                 more times within a 12-month period,
             (4) A deviation recurs after a prior corrective action was implemented.
             Each CAPA MUST include: (a) CAPA ID (CAPA-HTTP-NNN), (b) deviation
             history (dates, descriptions, prior corrective actions), (c) root cause
             analysis using 5-Why or Ishikawa methodology, (d) corrective action plan
             with responsible party and target date, (e) preventive action to eliminate
             recurrence, (f) effectiveness verification criteria and verification date,
             (g) QA approval of CAPA closure. Open CAPAs MUST be tracked in the
             periodic review documentation and MUST NOT be closed without effectiveness
             verification evidence.
             Reference: ICH Q10 §3.2 (CAPA System), EU GMP Annex 11 §10, 21 CFR 11.10(j).
```

| CAPA Field | Description |
|-----------|-------------|
| **CAPA ID** | CAPA-HTTP-NNN (sequential within organization) |
| **Deviation History** | Chronological list of all occurrences with dates, affected components, and prior corrective actions |
| **Root Cause Analysis** | 5-Why analysis or Ishikawa diagram identifying systemic cause |
| **Corrective Action** | Immediate remediation to address current deviation |
| **Preventive Action** | Systemic change to prevent recurrence (e.g., automated monitoring, process change, training update) |
| **Effectiveness Verification** | Criteria and timeline for verifying preventive action effectiveness |
| **QA Approval** | QA signature and date confirming CAPA closure |

---

## 83b-1. System Decommissioning Guidance

EU GMP Annex 11 §11 and GAMP 5 operational phase guidance require that system decommissioning be planned and documented. This section defines the decommissioning requirements when `@hex-di/http-client` is retired from a GxP environment.

### Decommissioning Triggers

| Trigger | Description | Reference |
|---------|-------------|-----------|
| System replacement | New HTTP client library or system replaces `@hex-di/http-client` in the GxP environment | EU GMP Annex 11 §11 |
| Regulatory change | Regulatory requirement renders the library unsuitable for continued GxP use | EU GMP Annex 11 §11 |
| End of support | Library is no longer maintained and Critical/High CVEs cannot be patched | GAMP 5 operational phase |
| Business decision | Organizational decision to retire the system | EU GMP Annex 11 §11 |

### Decommissioning Requirements

```
REQUIREMENT: Before decommissioning @hex-di/http-client from a GxP environment,
             organizations MUST complete the following decommissioning procedure:
             (1) **Data migration:** All audit trail data MUST be migrated to the
                 replacement system or archived per §104 retention requirements.
                 Migration MUST use the procedures in Appendix I (Migration Runbook).
                 Hash chain integrity MUST be verified in the target system before
                 source system decommissioning proceeds.
             (2) **Retention verification:** Verify that all audit data subject to
                 regulatory retention periods (§104, CV-03) will remain accessible
                 for the full retention period in the target system or archive.
             (3) **Access continuity:** Ensure QueryableHttpAuditTrailPort query
                 capabilities (§105) remain available for the retained audit data
                 in the target system, including the 4-hour inspector access SLA.
             (4) **Change Request:** Submit a formal CR (§116) documenting the
                 decommissioning rationale, data migration plan, retention coverage,
                 and regulatory notification requirements.
             (5) **Decommissioning audit entry:** Record a final
                 HttpClientConfigurationAuditEntry with configurationKey
                 "SYSTEM_DECOMMISSIONED" in both the source (before shutdown)
                 and target (after migration) systems.
             (6) **Post-decommissioning verification:** After decommissioning,
                 verify the target system or archive passes a periodic review
                 (§83b) within 90 days to confirm continued compliance.
             (7) **Documentation retention:** The Validation Plan, IQ/OQ/PQ reports,
                 FMEA, and all qualification evidence MUST be retained for the
                 full regulatory retention period even after system decommissioning.
             Reference: EU GMP Annex 11 §11, 21 CFR 11.10(c), GAMP 5 operational phase.
```

```
REQUIREMENT: Encryption keys used for audit data-at-rest encryption (§104c) MUST
             NOT be decommissioned until all data encrypted with those keys has been
             either (1) migrated and re-encrypted under the target system's key
             management, or (2) confirmed to have exceeded its retention period and
             been purged per §104 purge requirements. Key decommissioning during
             system decommissioning MUST follow the key ceremony procedures in §104c.
             Reference: NIST SP 800-57, 21 CFR 11.10(d).
```

---

## 83c. HTTP Transport Incident Classification Framework

EU GMP Annex 11 §13 requires that all incidents, not only system failures and data errors, shall be reported and assessed. This section defines an incident classification framework specific to HTTP transport security events, enabling consistent severity assessment, escalation, and response across GxP deployments.

### Incident Severity Levels

| Severity          | Definition                                                                                                  | Response SLA                                                 | Escalation                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Critical (S1)** | Patient safety impact, data integrity breach, or regulatory non-compliance. Requires immediate containment. | Response within 1 hour; containment within 4 hours           | Immediate notification to QA, system owner, and Qualified Person (QP). Regulatory notification if required. |
| **Major (S2)**    | GxP data at risk but no confirmed breach. Security control failure detected. Requires urgent investigation. | Response within 4 hours; remediation within 24 hours         | Notification to QA and system owner within 4 hours.                                                         |
| **Moderate (S3)** | Degraded security posture without confirmed data impact. Compensating controls in effect.                   | Response within 24 hours; remediation within 5 business days | Included in next periodic review (§83b).                                                                    |
| **Minor (S4)**    | Configuration issue or warning condition. No security control failure.                                      | Response within 5 business days                              | Tracked in operational log; reviewed during periodic review.                                                |

### HTTP Transport Incident Types

| Incident Type                      | Description                                                                                                                        | Default Severity | Example                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| **CREDENTIAL_EXPOSURE**            | Authentication credentials detected in logs, errors, audit entries, or external systems despite `withCredentialProtection()` (§87) | Critical (S1)    | Authorization header value appeared in application log file                           |
| **AUDIT_CHAIN_BREAK**              | Hash chain verification failure detected in HTTP audit trail                                                                       | Critical (S1)    | `verifyAuditChain()` reports gap between sequenceNumber 1042 and 1044                 |
| **AUDIT_ENTRY_LOSS**               | HTTP operations executed without corresponding audit entries                                                                       | Critical (S1)    | Request count exceeds audit entry count for a scope                                   |
| **CERTIFICATE_COMPROMISE**         | Server or client certificate private key compromised or revoked unexpectedly                                                       | Critical (S1)    | OCSP check returns "revoked" for a previously valid production certificate            |
| **TLS_DOWNGRADE**                  | Connection negotiated TLS version below configured minimum                                                                         | Major (S2)       | TLS 1.1 connection detected when `minTlsVersion` is "1.2"                             |
| **SIGNATURE_VERIFICATION_FAILURE** | Electronic signature binding verification failed for a GxP record                                                                  | Major (S2)       | `verify()` returns `bindingIntact: false` for a previously captured signature         |
| **SIGNER_REVOCATION**              | Signer identity revoked after signature capture; signed records at risk                                                            | Major (S2)       | `checkSignerStatus()` returns "revoked" for signer with active signed records         |
| **SEPARATION_OF_DUTIES_BYPASS**    | Subject performed conflicting roles despite `conflictingRoles` enforcement                                                         | Major (S2)       | Same subjectId appears as both data-entry and data-approval on same batch record      |
| **REVOCATION_CHECK_DEGRADED**      | All certificate revocation checking methods failing (OCSP/CRL unavailable)                                                         | Moderate (S3)    | Soft-fail mode allowing connections without revocation verification for >1 hour       |
| **AUDIT_CONFIRMATION_DELAY**       | Audit entries unconfirmed beyond WARNING threshold (>30s)                                                                          | Moderate (S3)    | `unconfirmedEntries()` returns entries older than 30 seconds                          |
| **TOKEN_LIFECYCLE_CIRCUIT_OPEN**   | Token refresh circuit-breaker opened; all authenticated requests blocked                                                           | Moderate (S3)    | Token provider returning errors; circuit-breaker tripped after 3 consecutive failures |
| **CONFIGURATION_DRIFT**            | Current HTTP client configuration does not match validated baseline                                                                | Moderate (S3)    | Periodic review detects combinator ordering different from Validation Plan            |
| **PIN_ROTATION_OVERDUE**           | Certificate pin rotation not performed within scheduled window                                                                     | Minor (S4)       | Pin label "production-ca-2024" still active 30 days after scheduled rotation          |
| **PAYLOAD_VALIDATION_WARNING**     | Payload schema validation in "warn" mode detecting invalid payloads                                                                | Minor (S4)       | Response body failing JSON Schema validation but not rejected                         |
| **CLOCK_SKEW_WARNING**             | Clock drift detected between HTTP client and audit trail service                                                                   | Minor (S4)       | Timestamps differ by >500ms between HttpAuditTrailPort entries and HttpHistoryEntries  |
| **CORS_BLOCK**                     | CORS preflight or actual request blocked for GxP data endpoint                                                                     | Minor (S4)       | Browser CORS policy preventing data submission to GxP API                             |

### Incident Response Requirements

```
REQUIREMENT: GxP deployments MUST implement an incident classification and
             response procedure that covers all HTTP transport incident types
             listed above. Each incident MUST be classified by severity using
             the severity levels defined in this section. Classification MUST
             be documented at the time of detection — severity MUST NOT be
             retroactively downgraded without QA approval and documented
             justification.
             Reference: EU GMP Annex 11 §13, ICH Q9 §4.
```

```
REQUIREMENT: Critical (S1) and Major (S2) incidents MUST produce an
             HttpClientConfigurationAuditEntry (§88) with configurationKey
             "INCIDENT" and the incident details in the reason field. The
             entry MUST be recorded before any containment actions are taken,
             ensuring the audit trail captures the pre-containment system state.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §13.
```

```
REQUIREMENT: Each incident MUST have a documented resolution that includes:
             (1) root cause analysis, (2) immediate containment actions taken,
             (3) corrective actions to prevent recurrence, (4) verification
             that corrective actions are effective, and (5) assessment of
             whether revalidation is required per §83b trigger criteria.
             Critical incidents MUST trigger revalidation. Major incidents
             MUST trigger revalidation if root cause analysis reveals a
             control failure.
             Reference: EU GMP Annex 11 §13, ICH Q9 §4.
```

```
RECOMMENDED: Organizations SHOULD implement automated incident detection for
             the following high-value scenarios:
             (1) Audit chain integrity verification on a scheduled basis
                 (RECOMMENDED: hourly for active scopes)
             (2) Unconfirmed entry monitoring with escalating alerts
                 (WARNING at 30s, CRITICAL at 5min per §91)
             (3) Credential pattern scanning in application logs
             (4) Certificate expiration monitoring with 30/7/1-day alerts
             (5) Token lifecycle circuit-breaker state monitoring
             Automated detection SHOULD feed into the organization's incident
             management system (e.g., ServiceNow, Jira Service Management)
             for tracking and SLA enforcement.
```

---


---


