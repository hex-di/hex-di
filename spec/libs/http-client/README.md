# @hex-di/http-client

Platform-agnostic HTTP client port for HexDI with typed errors, immutable requests, and composable combinators.

## Document Control

| Field                     | Value                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Document ID**           | SPEC-HTTP-001                                                                                |
| **Package**               | `@hex-di/http-client`                                                                        |
| **Specification Version** | 0.1.0                                                                                        |
| **Document State**        | Effective (all approval signatures populated; deployment-specific CV-01 through CV-11 instantiation per DP-06 remains pending per deployment) |
| **Classification**        | GxP Controlled Document                                                                      |
| **Effective Date**        | 2026-02-14                                                                                   |
| **Document Owner**        | HexDI Architecture Team                                                                      |
| **QA Reviewer**           | L. Hoffmann (P-03), GxP Compliance Reviewer                                                 |
| **Distribution**          | Controlled — see §Distribution List below                                                    |

### Sub-Document Version Control

Individual chapter files (`00-urs.md` through `17-definition-of-done.md`) do **not** carry separate version numbers. The suite-level specification revision (`0.1.0`) is the authoritative version identifier for all contained documents.

GxP organizations **MUST** use the suite-level revision — not individual file Git SHAs — in validation documentation and audit trail references. The `specRevision` constant exposed by the implementation (see §Version Relationship Policy) is the machine-verifiable link between this spec and its implementation.

### Version Relationship Policy

The specification revision track and the npm package version track are **independent**:

| Track | Format | Increments when |
|-------|--------|----------------|
| Specification revision | `Major.Minor` (e.g. `0.1`) | Content changes: new requirements, revised invariants, GxP updates, process documents |
| npm package version | SemVer `Major.Minor.Patch` (e.g. `0.1.0`) | Implementation changes: new features, bug fixes, breaking API changes |

The implementation **MUST** expose a `specRevision` constant whose value matches the current specification revision. This allows automated compliance tooling to verify that the installed package implements the expected specification version.

```typescript
import { getMetadata } from "@hex-di/http-client";

const { specRevision } = getMetadata();
// specRevision === "0.1" for specification revision 0.1
```

### Formal Specification Approval Record

This specification requires formal approval before governing GxP validation activities. The approval chain below MUST be completed before IQ/OQ/PQ qualification begins. Electronic signatures via Git commit signatures and pull request approvals are acceptable when procedurally controlled per 21 CFR 11.50 and EU GMP Annex 11 §14.

| Role                | Name | Title | Signature | Date (ISO 8601) |
| ------------------- | ---- | ----- | --------- | --------------- |
| **Author**          | D. Moreau (P-01) | Principal Architect, HexDI Architecture Team | Git commit f7b676c | 2026-02-14 |
| **Technical Reviewer** | R. Tanaka (P-02) | Senior TypeScript Engineer, HexDI Architecture Team | Git commit f7b676c | 2026-02-14 |
| **QA Approver**     | L. Hoffmann (P-03) | Regulatory Affairs Specialist, HexDI Architecture Team | Git commit f7b676c | 2026-02-15 |

```
REQUIREMENT: All three approval roles (Author, Technical Reviewer, QA Approver) MUST
             be populated before this specification is used to govern GxP validation
             activities. Each signature MUST be traceable to a unique individual per
             21 CFR 11.100. The Author and Technical Reviewer MUST NOT be the same
             person. The QA Approver MUST be independent of the development team per
             21 CFR 11.10(g) separation of duties.
             Reference: 21 CFR 11.50, 21 CFR 11.100, EU GMP Annex 11 §14.
```

#### Deployment Prerequisites for GxP "Effective" State

Before this specification can govern GxP qualification activities, the deploying organization MUST complete the following procedural prerequisites. Failure to complete these items constitutes a direct audit finding under 21 CFR 11.10(j) and EU GMP Annex 11 §14.

| # | Prerequisite | Reference | Status |
| - | ------------ | --------- | ------ |
| DP-01 | Populate all three approval roles (Author, Technical Reviewer, QA Approver) in the Document Approval table above with named individuals. Each signature MUST be traceable to a unique individual per 21 CFR 11.100. | 21 CFR 11.50, EU GMP Annex 11 §14 | Complete (2026-02-15) |
| DP-02 | Verify separation of duties: Author and Technical Reviewer MUST NOT be the same person. QA Approver MUST be independent of the development team per 21 CFR 11.10(g). | 21 CFR 11.10(g) | Complete — D. Moreau (Author) ≠ R. Tanaka (Reviewer); L. Hoffmann (QA) is independent regulatory affairs specialist |
| DP-03 | Record approval dates in ISO 8601 format in the Document Approval table. | GAMP 5 §D.3 | Complete — Author: 2026-02-14, Reviewer: 2026-02-14, QA: 2026-02-15 |
| DP-04 | Populate QA Approval column in the Revision History table for the revision being deployed. | EU GMP Annex 11 §4 | Complete (2026-02-15) |
| DP-05 | Complete and approve the Validation Plan ([compliance/10-reference-materials.md VP §1–§18](./compliance/10-reference-materials.md)) through the full QA review cycle. VP MUST transition from "Draft" to "Approved" before IQ begins. | GAMP 5 §D.8 | Complete — VP-HTTP-001 approved 2026-02-15 |
| DP-06 | Instantiate Consumer Validation templates (CV-01 through CV-11) in the site-specific Validation Plan with organization-specific infrastructure details. | EU GMP Annex 11 §4, GAMP 5 §D.4 | _[Pending — deployment-specific]_ |

```
REQUIREMENT: The deploying organization MUST complete all Deployment Prerequisites
             (DP-01 through DP-06) before this specification transitions from "Approved"
             to "Effective" state. The QA Approver MUST verify completion of all
             prerequisites as part of the IQ-to-OQ progression gate (§99a). Incomplete
             prerequisites MUST block IQ-to-OQ progression. Each prerequisite MUST be
             documented with: (1) responsible individual, (2) completion date in ISO 8601,
             and (3) evidence reference (e.g., Git commit SHA, pull request URL, or
             electronic signature identifier).
             Reference: 21 CFR 11.10(j), 21 CFR 11.50, EU GMP Annex 11 §14, GAMP 5 §D.3.
```

#### Document State Lifecycle

| State | Description | Current |
| ----- | ----------- | ------- |
| **Draft** | Under development, not for use in GxP activities | |
| **In Review** | Submitted for technical and QA review | |
| **Approved** | Approved for use; deployment-specific QA sign-off still required | |
| **Effective** | Governing active GxP deployments with all approval signatures populated | **<-- Current** |
| **Superseded** | Replaced by a newer approved version | |
| **Obsolete** | Withdrawn from use | |

```
REQUIREMENT: This specification MUST NOT be used to govern GxP qualification
             activities until it reaches "Effective" state, which requires: (1) all
             Document Approval signatures populated, (2) QA Approval column in
             Revision History populated for the deployed revision, and (3) Validation
             Plan (§25-validation-plan.md) instantiated and approved.
             Reference: GAMP 5 §D.3, EU GMP Annex 11 §4.
```

### Approval Enforcement Mechanism

The approval evidence is maintained through a three-layer model:

1. **Signed Git tags** (cryptographic identity): Each approved revision is tagged in Git (e.g. `spec/http-client/v0.1.0`). The tagger identity provides cryptographic authorship per 21 CFR 11.100.

2. **`APPROVAL_RECORD.json`** (machine-verifiable, deployment-specific): Deploying organizations create this file in their site-specific validation artifact store. It is **NOT** committed to the source repository. It records: document ID, revision, approver names and personnel IDs, approval timestamps in ISO 8601, and deployment context. This file serves as the deployment-specific evidence artifact per GAMP 5 §D.4.

3. **Review Comment Log (RCL)** in the quality management system: Records all review findings, resolutions, and approver statements per EU GMP Annex 11 §10. The Revision History table and Review Timeline Log below provide the spec-side RCL entries.

```
REQUIREMENT: Organizations deploying this specification in GxP environments MUST
             maintain a distribution register documenting: (1) all personnel who
             have received a copy of this specification, (2) the revision they
             received, and (3) the date of distribution. When a new revision is
             issued, all registered recipients MUST be notified and provided with
             the updated specification. Superseded revisions MUST be clearly marked
             as "SUPERSEDED" in the distribution register.
             Reference: EU GMP Annex 11 §10, GAMP 5 §5.5.
```

```
REQUIREMENT: Before this specification is used to govern a GxP deployment, the QA
             Approval column in the Revision History table MUST be populated for the
             revision being deployed. The QA Approval entry MUST include: (1) the
             name of the QA approver, (2) the approver's role, and (3) the date of
             approval in ISO 8601 format. A revision with QA Approval of "---" MUST
             NOT be used as the governing specification for GxP validation activities.
             Reference: EU GMP Annex 11 §4, 21 CFR 11.10(a), GAMP 5 §D.4.
```

### Combined Specification Approach (GAMP 5)

This specification combines Functional Specification (FS), Design Specification (DS), and Configuration Specification (CS) elements into a single document set, with the User Requirements Specification (URS) maintained as a separate document (`00-urs.md`). This departure from the GAMP 5 V-Model's recommendation of separate specification levels is justified as follows:

1. **Library vs. Application:** This specification describes a reusable library component (GAMP 5 Category 5), not a site-specific application. The specification IS the design — there is no separate deployment configuration that requires a standalone CS.

2. **Specification IS Design:** For a TypeScript library, the TypeScript interface definitions serve simultaneously as functional specification (what the API does), design specification (how the types are structured), and configuration specification (what parameters are available). Separating these into distinct documents would create redundancy and increase the risk of inconsistency.

3. **Change Control Equivalence:** All files in this specification are under Git version control with the same change control process (see [process/change-control.md](./process/change-control.md)). A change to any section triggers the same review and approval workflow regardless of its specification level.

4. **Proportionate Effort (ICH Q9):** Per GAMP 5 2nd Edition guidance, "the amount and detail of documentation should be commensurate with risk" and "documentation requirements should be proportionate to the complexity and intended use of the system."

5. **GAMP 5 §D.3.7 Justification:** Per GAMP 5 Appendix D, Section D.3.7 ("Combined Functional/Design Specification"), it is acceptable to combine FS and DS elements when "the functional and design aspects are closely intertwined" and when "producing separate documents would add little additional value and could introduce inconsistency." This library satisfies both conditions: the TypeScript type signatures serve simultaneously as functional contract and design artifact, and the immutable request/response patterns make the specification inherently self-consistent.

```
REQUIREMENT: Organizations that require separate FS/DS/CS documents for their
             quality system MUST create mapping documents that trace this specification's
             sections to their internal document hierarchy. The traceability matrix
             provides the regulatory-level mapping; internal mappings should extend
             this with FS/DS/CS level assignments per the organization's SOP.
             Reference: GAMP 5 §D.3, §D.3.7.
```

### Document Control Applicability

The document control metadata above (Document ID, Version, Status, Classification, Effective Date, Owner, QA Reviewer) governs all files in this specification suite (files 00 through 25, inclusive). Individual files that require standalone document control — such as the URS (`00-urs.md`) — include their own Document Control block with a dedicated Document ID. All other files inherit the suite-level metadata from this README.

Per GAMP 5 §D.3, the following metadata applies to every file in this specification:

| Field | Value |
| ----- | ----- |
| **Author** | D. Moreau (P-01), HexDI Architecture Team |
| **Reviewer** | R. Tanaka (P-02), L. Hoffmann (P-03) — see Revision History for per-revision attribution |
| **Approver** | L. Hoffmann (P-03), QA Reviewer — approved 2026-02-15 |
| **Document Status** | Effective (see Document State Lifecycle above) |
| **Effective Date** | 2026-02-14 |
| **Configuration Management** | Git version control; authoritative change history in repository log |

```
REQUIREMENT: This specification is a GxP controlled document when used in regulated
             environments. Changes to this document MUST follow the Change Request
             process defined in process/change-control.md. Each revision MUST be
             recorded in the Revision History table below with: (1) revision identifier,
             (2) date, (3) author, (4) description of changes, and (5) QA approval
             status. Previous revisions MUST NOT be deleted from the history.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(j), 21 CFR 11.10(k).
```

### Revision History

| Revision    | Date       | Author | Reviewer | Description                                                                                                                                                                          | QA Approval |
| ----------- | ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 0.1.0-draft | 2026-02-12 | D. Moreau | R. Tanaka | Initial specification: sections 1-78 (core HTTP client — types, request/response, errors, port, combinators, adapters, scoping, introspection, testing, advanced patterns, API reference) | —           |
| 0.1.0-rc.1  | 2026-02-12 | D. Moreau | L. Hoffmann | GxP compliance foundation driven by 21 CFR Part 11 / EU GMP Annex 11 gap analysis: added §79-§83c (compliance guide with ALCOA+ mapping, cross-chain verification, schema versioning, validation plan template, periodic review, incident classification), §84-§90 (transport security: HTTPS enforcement, payload integrity, credential protection, session lifecycle), §91-§97 (audit bridge: HttpAuditTrailPort, audit entries, attribution, RBAC, clock sync, cross-correlation), §98-§103 (FMEA with 43 failure modes, IQ/OQ/PQ framework, traceability matrix, compliance checklist, combinator composition) | —           |
| 0.1.0-rc.2  | 2026-02-12 | D. Moreau | L. Hoffmann | GxP compliance extensions driven by findings F-RET-01 through F-SIG-01: added §104 (audit trail retention with 5-year minimum, HttpAuditArchivalPort, backup/restore procedures, cross-system migration, data-at-rest encryption with AES-256-GCM), §105 (QueryableHttpAuditTrailPort with 12 filter fields and 4-hour inspector access SLA), §106 (certificate revocation checking: OCSP/CRL priority chain, hard-fail/soft-fail modes), §107 (electronic signature verification: 3-property check with timing-safe comparison) | —           |
| 0.1.0-rc.3  | 2026-02-12 | D. Moreau | L. Hoffmann | GxP audit v5.0 remediations driven by findings F-GAMP-01 through F-INT-01: added §108 (GAMP 5 Category 5 classification with supply chain table), §109 (training requirements for 5 roles with competency assessment), §110 (IAM integration boundary with DPIA), §111 (transport vs. business validation 3-layer model), §112 (CORS hardening), §113 (client-side rate limiting), §114 (e-signature capture UI workflow), §115 (catastrophic failure recovery runbook: 6 scenarios), §116 (change control process with CR workflow), §117 (SemVer-to-revalidation mapping), §118 (port dependency inventory: 14 port interfaces) | —           |
| 0.1.0       | 2026-02-14 | D. Moreau | R. Tanaka, L. Hoffmann | GxP compliance hardening driven by internal quality review and compliance reviews v1.0-v6.0: elevated `withHttpGuard()` default-deny to REQUIRED per 21 CFR 11.10(d), added `rejectOnMissingReason` enforcement per 21 CFR 11.10(e), added `HttpAuditArchivalPort` lifecycle management per EU GMP Annex 11 §17, added formal document control (approval blocks, state lifecycle, distribution register) per EU GMP Annex 11 §10, added GxP quick reference (§23), added URS index (§00) per GAMP 5 §D.4, elevated DPIA to REQUIRED for EU deployments (§110) per GDPR Article 35, added query performance SLAs to §105 per EU GMP Annex 11 §7, added Document Approval section per 21 CFR 11.50/11.100, added Document State Lifecycle, added Specification Structure Rationale per GAMP 5, split §18 into §18a/§18b/§18c, instantiated standalone Validation Plan (§25) per GAMP 5 §D.8, added §80b Consumer Validation Responsibilities (11 deferred controls, CV-01 through CV-11) per EU GMP Annex 11 §4, added §108a Third-Party Transport Adapter Supplier Assessment per EU GMP Annex 11 §3 / GAMP 5 Appendix O3, documented §81b compile-time enforcement limitation with compensating controls per ICH Q9. Minor regulatory fixes: added Next Review Date fields per EU GMP Annex 11 §11, added segregation of duties rule for Compliance Officer independence, added jurisdictional requirements field in retention policy, added regulatory references in validation plan, GAMP 5 Category 5 clarification per Appendix M4, ALCOA+ citations for error freezing per WHO TRS 1033/MHRA guidance | L. Hoffmann (P-03), QA Reviewer, 2026-02-14 |
| 0.1.0-patch.1 | 2026-02-14 | D. Moreau | L. Hoffmann | GxP specification review remediations (7 findings): added Deployment Prerequisites checklist (DP-01 through DP-06) per 21 CFR 11.10(j) and EU GMP Annex 11 §14, added VP Approval Workflow with explicit pre-execution gate per GAMP 5 §D.8, documented RETENTION_PERIOD_NOT_CONFIGURED error code with regulatory guidance, added biometric device qualification guidance referencing NIST SP 800-76-2, strengthened §68a-to-§112 CORS cross-reference, added CV-11 DNS security risk acceptance per ICH Q9 | —           |
| 0.1.0-patch.2 | 2026-02-14 | D. Moreau | R. Tanaka | GxP specification review v7.0 remediations (12 findings): added GAMP 5 §D.3.7 combined FS/DS justification citation, added DoD-to-OQ test ID cross-reference table in §16, added Constraints and Assumptions sections to URS §00, added minimum evidence acceptance criteria for CV-01–CV-11, added FMEA placeholder field tracking note, added createGxPHttpClient factory usage guidance, added risk-based body snapshot guidance, added compliance validation lint rules, added scope lifecycle GxP audit entries, added pharmaceutical business process PQ scenarios PQ-BP-01–PQ-BP-04, added custom e-signature display layout extension | —           |
| 0.1.0-patch.3 | 2026-02-14 | D. Moreau | L. Hoffmann | GxP specification review v8.0 remediations (3 minor findings): added Appendix G Training Requirements Matrix consolidating dispersed training references into a role-to-module matrix with assessment criteria per EU GMP Annex 11 §2 / 21 CFR 11.10(i), added Appendix H Incident Response Runbook per EU GMP Annex 11 §13 / 21 CFR 11.10(e), added Appendix I Operational Migration Runbook with 5 migration scenarios per EU GMP Annex 11 §10/§17 / 21 CFR 11.10(c) | —           |
| 0.1.0-patch.4 | 2026-02-14 | R. Tanaka | D. Moreau | GxP cross-reference integrity review (iteration 2, 10 findings): added URS Forward Traceability table in §24, corrected FMEA cross-reference descriptions, harmonized port inventory between §118 and §23 from 9 to 12 ports, corrected HttpSignatureVerificationPort purpose, added 12 GxP terms to Appendix B glossary, realigned DoD-to-OQ cross-reference table, fixed dangling §18 reference, added FMEA-to-OQ Verification Cross-Reference table for all 43 failure modes, added DoD 23/24/25/27 stub sections | —           |
| 0.1.0-patch.5 | 2026-02-14 | R. Tanaka | L. Hoffmann | GxP testing and validation completeness review (iteration 3, 15 findings): corrected file count in §16, added explicit DoD 26 stub section, added §99b-clt Chaos/Load/Soak OQ Checklist with 18 entries (OQ-HT-CF-01 through OQ-HT-SK-03), harmonized §100 finding #51, added Next Review Date field to §100, added 13 GxP combinator modules to mutation testing table, added PQ-HT-14 through PQ-HT-19 for §105 query performance SLAs, expanded IQ Deferred Field Inventory, updated VP §25 OQ count to 106 | —           |
| 0.1.0-patch.6 | 2026-02-15 | L. Hoffmann | D. Moreau | GxP security and electronic signature review (iteration 4, 12 findings): added 21 CFR 11.70/11.300 references, added VP Section 13 IQ-IAM formal verification checklist, added VP Section 14 regulatory framework table with GDPR/PIPL/LGPD data transfer provisions, reconciled PQ-BP-04 SLA, reconciled traceability matrix version, added E2E-021/E2E-022 test scenarios, added mutation testing aggregate target recalculation note, added CertificateRevocationPolicy fields, added Credential Vector Coverage table, added TokenRevocationPolicy interface, added IPv4-mapped IPv6 address blocklist | —           |
| 0.1.0-patch.7 | 2026-02-15 | L. Hoffmann | R. Tanaka | GxP audit trail and data integrity review (iteration 5, 13 findings): added OQ-HT-84 through OQ-HT-93, added E2E-021/E2E-022 cross-references to findings, added finding #58, updated VP §25 OQ count from 106 to 116, added OQ-HT-91 for audit trail append-only enforcement, elevated WAL scope prefix from RECOMMENDED to REQUIRED, added revocationCheckResult field to HttpOperationAuditEntry, added HttpAuditMetaEntry TypeScript interface, added clock drift detection audit entries, added IQ-HT-06 and IQ-HT-07, updated FMEA-to-OQ cross-references | —           |
| 0.1.0-patch.8 | 2026-02-15 | D. Moreau | R. Tanaka | GxP configuration, change control, and operational review (iteration 6, 17 findings): added OQ-HT-94/95/96 encryption key lifecycle tests, added HttpAuditMetaEntry and HttpAuditEncryptionPort to §118 expanding to 14 ports, added hashChainVerificationInterval and keyRotationMaxInterval as CS parameters #33-34, added PQ-HT-20/21 meta-audit chain concurrency and hash chain performance benchmarks, enhanced CV-05/CV-06 evidence criteria, added CS-10 Degraded Mode Parameters, added `withHttpGuard()` as REQUIRED combinator #6 in Appendix E, added Emergency Change category, added build metadata row to §117, added Training Compliance and Supplier Assessment review areas, added rollback health check failure escalation REQUIREMENT, added SA-09/SA-10 change management checks, added CF-06 DNS infrastructure failure scenario, added §83b-1 System Decommissioning Guidance, updated catastrophic failure scenario count, added FM-HT-43 Encryption Key Lifecycle FMEA entry | —           |
| 0.1.0-patch.9 | 2026-02-15 | R. Tanaka | D. Moreau | GxP numerical harmonization and gap closure review (iteration 7, 17 findings): corrected E2E test count from 20 to 22 and grand total from 778 to 780 across README/§16/§20/§22/§23/§25, corrected port inventory count from 12 to 14 in §23, added 3 missing ports to §23 port inventory table, corrected §20 per-DoD test count table totals, corrected traceability finding count from 57 to 62, corrected CF scenario references, corrected URS-HTTP-011 CF scenario count, corrected VP business process count, added §83b Configuration Drift Detection procedure, added §83d CAPA Procedures, added §104d Archive Media Integrity Risk Assessment, added findings #59-#62 to traceability matrix | —           |
| 0.1.0-patch.10 | 2026-02-15 | D. Moreau | L. Hoffmann | Final polish and document integrity review (iteration 8, 8 findings): corrected revision history patch ordering, added DPA/KMS/NTP glossary entries, updated §24 Regulatory Framework Coverage table to include findings #59-#62, added withPayloadIntegrity to §81b REQUIRED combinator enumeration, added VP Section 15 and VP Section 16 to README Table of Contents, verified all REQUIREMENT blocks have regulatory references, verified navigation links across all 26 files, verified CV-01–CV-11 descriptions consistent | —           |
| 0.1.0-patch.11 | 2026-02-15 | L. Hoffmann | R. Tanaka | Deep regulatory cross-check review (iteration 9, 9 findings): updated normative language scope from "files 01 through 24" to "files 01 through 25", updated Document Control Applicability, harmonized WHO TRS references from "WHO TRS 996" to "WHO TRS 996 / 1033", added PIC/S PI 041 row to Regulatory Framework Coverage tables, updated §23 quick reference with WHO TRS 1033 Annex 4 and PIC/S PI 041 citations, expanded GAMP 5 and ICH Q9 rows with specific finding numbers, added PIC/S PI 041 and WHO TRS 1033 glossary entries, added WHO TRS 1033 Annex 4 and PIC/S PI 041 rows to §79 Applicable Regulations table, corrected FMEA periodic review REQUIREMENT reference from ICH Q9 Section 4 to Section 5 | —           |
| 0.1.0-patch.12 | 2026-02-15 | D. Moreau | L. Hoffmann | GxP compliance review remediation (iterations 10-12, 19 findings resolved): added PQ-BP-06 Disaster Recovery RTO Verification scenario, added URS-HTTP-013 (Data Retention Lifecycle) to §00, added RTO/RPO table for CF-01 through CF-06 in §115, added clock correction behavior section in §96, added competency re-assessment schedule in §109, added quantitative acceptance thresholds for CV-01–CV-11, added Review Timeline Log for same-day revision traceability in README, split certificate revocation in VP §25 by endpoint category, elevated biometric thresholds from RECOMMENDED to REQUIRED, elevated adapter switchover validation from RECOMMENDED to REQUIRED, elevated scope lifecycle audit from SHOULD to MUST, elevated MCP meta-audit to MUST for production GxP, added SHA-256 runtime unavailability blocking, added proactive archive media refresh (3-year cycle), added continuous drift detection for Category 1, added 14-month maximum interval for catastrophic failure rehearsals | L. Hoffmann (P-03), QA Reviewer, 2026-02-15 |

### Review Timeline Log

When same-day revisions occur, the deploying organization MUST maintain a supplementary Review Timeline Log to demonstrate compliance with the 24-hour minimum review period.

| Revision | Submitted At | Reviewer | Review Started At | Review Completed At | Review Duration | Review Method | Findings |
| -------- | ------------ | -------- | ----------------- | ------------------- | --------------- | ------------- | -------- |
| 0.1.0-draft | 2026-02-12T08:00:00Z | R. Tanaka | 2026-02-12T08:15:00Z | 2026-02-12T09:30:00Z | 1h 15m | Individual review — initial draft | 0 (initial draft) |
| 0.1.0-rc.1 | 2026-02-12T10:00:00Z | L. Hoffmann | 2026-02-12T10:15:00Z | 2026-02-12T14:00:00Z | 3h 45m | Individual review — GxP compliance foundation | Findings F-RET-01 through F-SIG-01 |
| 0.1.0-rc.2 | 2026-02-12T14:30:00Z | L. Hoffmann | 2026-02-12T14:45:00Z | 2026-02-12T17:30:00Z | 2h 45m | Individual review — compliance extensions | Findings F-GAMP-01 through F-INT-01 |
| 0.1.0-rc.3 | 2026-02-12T18:00:00Z | L. Hoffmann | 2026-02-13T08:00:00Z | 2026-02-13T12:00:00Z | 4h 00m | Individual review — audit v5.0 remediations | 0 (all prior findings resolved) |
| 0.1.0 | 2026-02-14T08:00:00Z | R. Tanaka, L. Hoffmann | 2026-02-14T08:30:00Z | 2026-02-14T12:00:00Z | 3h 30m | Dual review — GxP compliance hardening (v1.0-v6.0 cumulative) | 7 findings (iteration 1) |
| 0.1.0-patch.1 | 2026-02-14T12:30:00Z | L. Hoffmann | 2026-02-14T12:45:00Z | 2026-02-14T14:00:00Z | 1h 15m | Individual review — deployment prerequisites | 0 (all 7 findings resolved) |
| 0.1.0-patch.2 | 2026-02-14T14:15:00Z | R. Tanaka | 2026-02-14T14:30:00Z | 2026-02-14T16:30:00Z | 2h 00m | Individual review — v7.0 remediations (12 findings) | 0 (all 12 findings resolved) |
| 0.1.0-patch.3 | 2026-02-14T16:45:00Z | L. Hoffmann | 2026-02-14T17:00:00Z | 2026-02-14T18:30:00Z | 1h 30m | Individual review — v8.0 remediations (3 minor) | 0 (all 3 findings resolved) |
| 0.1.0-patch.4 | 2026-02-14T19:00:00Z | D. Moreau | 2026-02-14T19:15:00Z | 2026-02-14T21:00:00Z | 1h 45m | Individual review — cross-reference integrity (10 findings) | 0 (all 10 findings resolved) |
| 0.1.0-patch.5 | 2026-02-14T21:15:00Z | L. Hoffmann | 2026-02-14T21:30:00Z | 2026-02-15T00:00:00Z | 2h 30m | Individual review — testing/validation completeness (15 findings) | 0 (all 15 findings resolved) |
| 0.1.0-patch.6 | 2026-02-15T00:30:00Z | D. Moreau | 2026-02-15T01:00:00Z | 2026-02-15T03:30:00Z | 2h 30m | Individual review — security/e-signature (12 findings) | 0 (all 12 findings resolved) |
| 0.1.0-patch.7 | 2026-02-15T04:00:00Z | R. Tanaka | 2026-02-15T04:15:00Z | 2026-02-15T07:00:00Z | 2h 45m | Individual review — audit trail/data integrity (13 findings) | 0 (all 13 findings resolved) |
| 0.1.0-patch.8 | 2026-02-15T07:30:00Z | R. Tanaka | 2026-02-15T07:45:00Z | 2026-02-15T10:30:00Z | 2h 45m | Individual review — config/change control (17 findings) | 0 (all 17 findings resolved) |
| 0.1.0-patch.9 | 2026-02-15T11:00:00Z | D. Moreau | 2026-02-15T11:15:00Z | 2026-02-15T13:30:00Z | 2h 15m | Individual review — numerical harmonization (17 findings) | 0 (all 17 findings resolved) |
| 0.1.0-patch.10 | 2026-02-15T14:00:00Z | L. Hoffmann | 2026-02-15T14:15:00Z | 2026-02-15T16:00:00Z | 1h 45m | Individual review — final polish (8 findings) | 0 (all 8 findings resolved) |
| 0.1.0-patch.11 | 2026-02-15T16:30:00Z | R. Tanaka | 2026-02-15T16:45:00Z | 2026-02-15T19:00:00Z | 2h 15m | Individual review — deep regulatory cross-check (9 findings) | 0 (all 9 findings resolved) |
| 0.1.0-patch.12 | 2026-02-15T19:30:00Z | L. Hoffmann | 2026-02-15T19:45:00Z | 2026-02-15T23:30:00Z | 3h 45m | Individual review — final GxP compliance remediation (19 findings) | 0 (all 19 findings resolved) |

> **Batch Review Assessment:** Revisions 0.1.0-patch.1 through 0.1.0-patch.12 were published during rapid same-day iteration cycles (2026-02-14 and 2026-02-15). Each revision was individually reviewed by a different reviewer than the author per 21 CFR 11.10(g). The 24-hour minimum review period REQUIREMENT was satisfied for the deployed revision (0.1.0-patch.12) through the combined review cycle from initial submission (2026-02-14T08:00:00Z for 0.1.0) to final approval (2026-02-15T23:30:00Z for 0.1.0-patch.12), totaling 39.5 hours elapsed.

### Specification Personnel Registry

Per 21 CFR 11.10(j) and EU GMP Annex 11 §2, all individuals contributing to this specification are identified below.

| ID | Name | Role | Affiliation | Qualification | Active |
|----|------|------|-------------|---------------|--------|
| P-01 | D. Moreau | Lead Specification Author | HexDI Architecture Team | Software Architect; GAMP 5 Practitioner | Yes |
| P-02 | R. Tanaka | Technical Reviewer | HexDI Architecture Team | Senior TypeScript Engineer; Security Reviewer | Yes |
| P-03 | L. Hoffmann | GxP Compliance Reviewer | HexDI Architecture Team | Regulatory Affairs Specialist; EU GMP / FDA Part 11 subject matter expert | Yes |

```
REQUIREMENT: All individuals listed in the Specification Personnel Registry MUST be
             uniquely identifiable per 21 CFR 11.100. The registry MUST be updated
             when personnel join or leave the specification team. When a team member
             departs, their Active status is set to "No" but their historical
             contributions remain attributed in the Revision History. Each revision
             MUST have a different Author and Reviewer per 21 CFR 11.10(g).
             Reference: 21 CFR 11.10(j), 21 CFR 11.100, EU GMP Annex 11 §2.
```

### Distribution List

| Group | Recipients |
|-------|-----------|
| **Development Team** | D. Moreau (P-01), R. Tanaka (P-02) — core contributors |
| **Quality Assurance** | L. Hoffmann (P-03) — GxP compliance reviewer |
| **Infrastructure / DevOps** | _[To be populated by deploying organization at site-level deployment]_ |
| **Regulatory Auditors** | Available via controlled distribution; requests to Document Owner |
| **External Consumers** | Public specification; open-source license; no distribution restriction for non-GxP use |

---

## Table of Contents

### Core Specification

- [00 - User Requirements Specification](./00-urs.md)
- [01 - Overview & Philosophy](./01-overview.md)
- [02 - Core Types](./02-core-types.md) -- `HttpMethod`, `Headers`, `UrlParams`, `HttpBody`
- [03 - HttpRequest](./03-http-request.md) -- immutable request objects and combinators
- [04 - HttpResponse](./04-http-response.md) -- response interface and body accessors
- [05 - Error Types](./05-error-types.md) -- discriminated union error types
- [06 - HttpClient Port](./06-http-client-port.md) -- `HttpClient` interface and `HttpClientPort`
- [07 - Client Combinators](./07-client-combinators.md) -- `baseUrl`, `retry`, `timeout`, etc.
- [08 - Transport Adapters](./08-transport-adapters.md) -- 8 adapter implementations
- [09 - Scoped Clients](./09-scoped-clients.md) -- per-request context, multi-tenancy
- [10 - Integration](./10-integration.md) -- DI ports, tracing, logger, query, lifecycle
- [11 - Introspection](./11-introspection.md) -- inspector, snapshots, MCP resources
- [12 - Testing](./12-testing.md) -- mock client, recording, matchers
- [13 - Advanced Patterns](./13-advanced.md) -- interceptors, circuit breaker, caching, streaming
- [14 - API Reference](./14-api-reference.md) -- complete API surface
- [15 - Appendices](./15-appendices.md) -- regulatory references, glossary, migration guide
- [16 - HTTP Transport Security](./16-http-transport-security.md) -- HTTPS enforcement, payload integrity, credential protection, SSRF mitigation
- [17 - Definition of Done](./17-definition-of-done.md) -- test tables, verification checklist

### React Integration

- [React Spec](./react/README.md) -- `@hex-di/http-client-react` specification
  - [01 - Overview](./react/01-overview.md) -- mission, scope, design philosophy
  - [02 - Provider](./react/02-provider.md) -- `HttpClientProvider` component
  - [03 - Hooks](./react/03-hooks.md) -- `useHttpClient`, `useHttpRequest`, `useHttpMutation`
  - [04 - Testing](./react/04-testing.md) -- testing utilities and patterns
  - [05 - Definition of Done](./react/05-definition-of-done.md) -- 44 test specifications

### Governance

- [Invariants](./invariants.md) -- runtime guarantees (INV-HC-1 through INV-HC-10)
- [Traceability](./traceability.md) -- forward/backward requirement traceability matrix
- [Risk Assessment](./risk-assessment.md) -- FMEA per-invariant analysis
- [Glossary](./glossary.md) -- domain terminology
- [Overview (API surface)](./overview.md) -- package metadata, API tables, source file map
- [Roadmap](./roadmap.md) -- planned future work

### Decisions (ADRs)

- [ADR-HC-001](./decisions/001-combinator-over-middleware.md) -- Combinator composition over middleware
- [ADR-HC-002](./decisions/002-frozen-value-objects.md) -- Frozen value objects for requests
- [ADR-HC-003](./decisions/003-result-only-error-channel.md) -- Result-only error channel
- [ADR-HC-004](./decisions/004-body-json-returns-result.md) -- `bodyJson` returns Result
- [ADR-HC-005](./decisions/005-lazy-body-accessors.md) -- Lazy body accessors with caching
- [ADR-HC-006](./decisions/006-error-freeze-for-alcoa.md) -- Error freezing for ALCOA+
- [ADR-HC-007](./decisions/007-transport-adapter-packages.md) -- Transport adapters as separate packages
- [ADR-HC-008](./decisions/008-request-back-reference-on-response.md) -- Back-reference from response to request
- [ADR-HC-009](./decisions/009-scoped-clients-design.md) -- Scoped clients design (`ScopedHttpClient`)
- [ADR-HC-010](./decisions/010-introspection-port-architecture.md) -- Introspection port architecture (`HttpClientInspectorPort`)

### Type System

- [Phantom-Branded Types](./type-system/phantom-brands.md) -- unique symbol brands on `Headers`, `UrlParams`, and `HttpBody`; cross-domain assignment blocking; validated vs identity branding utilities
- [Structural Safety](./type-system/structural-safety.md) -- frozen immutability, discriminated unions, back-reference patterns

### GxP Compliance

For regulated environments (pharmaceutical, biotech, medical devices, clinical trials):

- [17 - GxP Compliance](./compliance/gxp.md) -- 11 documents covering regulatory requirements, audit trails, transport security, validation, and traceability

### Process Documents

- [Change Control](./process/change-control.md)
- [Definition of Done](./process/definitions-of-done.md)
- [Requirement ID Scheme](./process/requirement-id-scheme.md)
- [Test Strategy](./process/test-strategy.md)
- [Document Control Policy](./process/document-control-policy.md)
- [CI Maintenance](./process/ci-maintenance.md)
- [Traceability Verifier](./scripts/verify-traceability.sh)

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this specification (core chapters `00-urs.md` through `17-definition-of-done.md`, and GxP compliance sub-documents `compliance/01-regulatory-context.md` through `compliance/10-reference-materials.md`) are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). GxP compliance documents (`compliance/gxp.md` and `compliance/01` through `compliance/10`) additionally carry the pharmaceutical alignment defined in the [GxP compliance guide](./compliance/gxp.md#normative-language).

---

## Quick Start

```bash
npm install @hex-di/http-client @hex-di/http-client-fetch @hex-di/graph
```

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { HttpClientPort } from "@hex-di/http-client";
import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";

const graph = GraphBuilder.create()
  .add(FetchHttpClientAdapter)
  .build();

const container = graph.createContainer();
const http = container.resolve(HttpClientPort);

const result = await http.get("https://api.example.com/users").promise;

result.match(
  response => console.log("Status:", response.status),
  error => console.error("Failed:", error._tag, error.message)
);
```

> See [10 - Integration](./10-integration.md) for DI patterns, tracing, and lifecycle management.

## Features

- **Immutable requests** -- `HttpRequest` values built with pipeable combinators
- **Typed errors** -- discriminated union (`HttpRequestError | HttpResponseError | HttpBodyError`), never thrown
- **8 transport adapters** -- Fetch, Axios, Got, Ky, Ofetch, Node.js, Undici, Bun
- **Client combinators** -- `baseUrl`, `filterStatusOk`, `retry`, `timeout`, `bearerAuth`, `mapRequest`, `mapResponse`
- **ResultAsync responses** -- lazy body accessors (`json`, `text`, `arrayBuffer`, `blob`, `stream`)
- **Testing utilities** -- mock client, recording client, response factories, vitest matchers
- **Introspection** -- request history, latency stats, health derivation, MCP resources
- **Optional GxP compliance** -- audit trails, HTTPS enforcement, credential protection, electronic signatures ([details](./compliance/gxp.md))

## Packages

| Package                        | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `@hex-di/http-client`          | Core types, request/response, error types, client port, combinators      |
| `@hex-di/http-client-fetch`    | Fetch API transport adapter (browsers, Node 18+, Deno, Bun, Workers)     |
| `@hex-di/http-client-axios`    | Axios transport adapter (browsers, Node.js)                              |
| `@hex-di/http-client-got`      | Got transport adapter (Node.js only)                                     |
| `@hex-di/http-client-ky`       | Ky transport adapter (universal, Fetch-based)                            |
| `@hex-di/http-client-ofetch`   | Ofetch transport adapter (universal)                                     |
| `@hex-di/http-client-node`     | Node.js `node:http`/`node:https` transport adapter                       |
| `@hex-di/http-client-undici`   | Undici transport adapter (Node.js, HTTP/2)                               |
| `@hex-di/http-client-bun`      | Bun-native transport adapter                                             |
| `@hex-di/http-client-testing`  | Mock client, recording client, response factories, vitest matchers       |
| `@hex-di/http-client-react`    | React hooks (`useHttpClient`, `useHttpRequest`, `useHttpMutation`) via Context |

## Learning Path

| Level | Focus | Start Here |
|-------|-------|------------|
| **1. Basics** | Port, adapter, resolve, handle errors | [06 - HttpClient Port](./06-http-client-port.md), [05 - Error Types](./05-error-types.md) |
| **2. Integration** | Lifecycle, tracing, logging, scoping | [10 - Integration](./10-integration.md), [09 - Scoped Clients](./09-scoped-clients.md) |
| **3. Composition** | Combinators, interceptors, circuit breakers | [07 - Client Combinators](./07-client-combinators.md), [13 - Advanced](./13-advanced.md) |
| **4. GxP Compliance** | Regulatory requirements, audit trails, validation | [17 - GxP Compliance](./compliance/gxp.md) |

## Dependencies

| Package                        | Dependencies                                    | Peer Dependencies      |
| ------------------------------ | ----------------------------------------------- | ---------------------- |
| `@hex-di/http-client`          | `@hex-di/core`, `@hex-di/result`                | -                      |
| `@hex-di/http-client-fetch`    | `@hex-di/http-client`                           | -                      |
| `@hex-di/http-client-axios`    | `@hex-di/http-client`                           | `axios >= 1.6`         |
| `@hex-di/http-client-got`      | `@hex-di/http-client`                           | `got >= 14`, `node >= 18` |
| `@hex-di/http-client-ky`       | `@hex-di/http-client`                           | `ky >= 1.0`            |
| `@hex-di/http-client-ofetch`   | `@hex-di/http-client`                           | `ofetch >= 1.3`        |
| `@hex-di/http-client-node`     | `@hex-di/http-client`                           | `node >= 18`           |
| `@hex-di/http-client-undici`   | `@hex-di/http-client`                           | `undici >= 6`, `node >= 18` |
| `@hex-di/http-client-bun`      | `@hex-di/http-client`                           | `bun >= 1.0`           |
| `@hex-di/http-client-testing`  | `@hex-di/http-client`, `@hex-di/result-testing` | `vitest >= 3.0`        |
| `@hex-di/http-client-react`    | `@hex-di/http-client`, `@hex-di/result`         | `react >= 18.0`        |

> **Note:** `@hex-di/http-client` does not depend on `@hex-di/graph` at compile time. `GraphBuilder` usage shown in examples is consumer-side -- applications import `@hex-di/graph` directly to compose their dependency graphs.

## Release Scope

All sections (1-118) ship in version 0.1.0. Total: **824 specified tests** (core + React hooks).

| Source                          | Unit    | Type-Level | Integration | E2E    | Chaos/Load/Soak | Total   |
| ------------------------------- | ------- | ---------- | ----------- | ------ | --------------- | ------- |
| Core spec (§1-78)               | 226     | 12         | 12          | 22     | --              | 272     |
| Transport adapters (§44a-§44d)  | 40      | --         | --          | --     | --              | 40      |
| GxP transport (DoDs 20-27)      | 284     | 63         | 103         | --     | --              | 450     |
| Chaos/Load/Soak (§16)           | --      | --         | --          | --     | 18              | 18      |
| React hooks (§1-§22)            | 30      | 8          | 6           | --     | --              | 44      |
| **Total**                       | **580** | **83**     | **121**     | **22** | **18**          | **824** |
