<!-- Document Control
| Property         | Value                                                                                       |
|------------------|---------------------------------------------------------------------------------------------|
| Document ID      | GUARD-17-00                                                                                 |
| Revision         | 1.1                                                                                         |
| Effective Date   | 2026-02-21                                                                                  |
| Author           | HexDI Engineering                                                                           |
| Reviewer         | GxP Compliance Review                                                                       |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager                                          |
| Classification   | GxP Compliance Sub-Specification Index                                                      |
| DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)                                                      |
| Change History   | 1.1 (2026-02-21): §71→§87, §72→§88, §73→§89 (IQ/OQ/PQ Protocols) — resolve section collisions with 04-policy-types §71, 06-subject §72, 11-react-integration §73 (CCR-GUARD-045) |
|                  | 1.0 (2026-02-20): Initial controlled release — sub-directory index and Quick Reference Card |
-->

# @hex-di/guard — GxP Compliance Sub-Specification Index

This directory contains the 13 detailed GxP compliance chapters for `@hex-di/guard`. It is navigable from two parent entry points:

- **[../17-gxp-compliance.md](../17-gxp-compliance.md)** — numbered chapter 17 (minimum viable compliance path, normative language, section-level table of contents)
- **[../compliance/gxp.md](../compliance/gxp.md)** — governance index (cross-cutting framework references, GAMP 5 classification, ALCOA+ mapping summary, sub-document registry)

Non-GxP environments can skip this directory entirely.

---

## Sub-Document Version Control

Documents in this directory do **not** carry independent version numbers. The suite-level revision declared in [../README.md](../README.md) is the authoritative version identifier for all compliance sub-documents.

GxP organizations MUST use the suite-level revision (e.g., `2.0`) — not individual file Git SHAs — in validation documentation, audit trail references, and regulatory submission packages. The signed Git tag (e.g., `guard/v0.2.5`) that covers the suite-level revision is the approval artifact for all sub-documents simultaneously.

When referencing a specific sub-document in a deviation report or change control record, cite it as: `GUARD-17-NN Rev <suite-revision> (guard/v<tag>)`.

---

## Cross-Cutting GxP Framework

These sub-documents apply the shared regulatory methodology maintained in [`spec/cross-cutting/gxp/`](../../../cross-cutting/gxp/). Per-package content (failure modes, ALCOA+ feature mappings, test protocol details) is documented here; generic methodology is not duplicated.

| Cross-Cutting Document | Methodology Applied in This Directory |
|---|---|
| [01 — Regulatory Framework](../../../cross-cutting/gxp/01-regulatory-framework.md) | 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9 applicability scope — see [01-regulatory-context.md §59](./01-regulatory-context.md) |
| [02 — GAMP 5 Classification](../../../cross-cutting/gxp/02-gamp5-classification.md) | Category 5 (Custom Software) classification criteria and combined specification justification — see [../compliance/gxp.md §GAMP 5](../compliance/gxp.md) |
| [03 — ALCOA+ Mapping](../../../cross-cutting/gxp/03-alcoa-mapping.md) | Generic ALCOA+ principle definitions; guard-specific feature-to-principle mapping — see [01-regulatory-context.md §60](./01-regulatory-context.md) |
| [04 — Personnel Qualification](../../../cross-cutting/gxp/04-personnel-qualification.md) | Role qualification requirements; guard-specific roles (guard operators, administrators, QA reviewers) — see [06-administrative-controls.md §64c](./06-administrative-controls.md) |
| [05 — FMEA Methodology](../../../cross-cutting/gxp/05-fmea-methodology.md) | S×O×D RPN scoring scale (max 1000) and risk level thresholds — see [10-risk-assessment.md §68](./10-risk-assessment.md) and [../risk-assessment.md](../risk-assessment.md) |
| [06 — Validation Protocol Template](../../../cross-cutting/gxp/06-validation-protocol-template.md) | IQ/OQ/PQ/DQ protocol structure and acceptance criteria format — see [09-validation-plan.md §67](./09-validation-plan.md) and [13-test-protocols.md §87–89](./13-test-protocols.md) |
| [07 — Traceability Matrix Template](../../../cross-cutting/gxp/07-traceability-matrix-template.md) | RTM structure and bidirectional coverage requirements — see [11-traceability-matrix.md §69](./11-traceability-matrix.md) and [../traceability.md](../traceability.md) |
| [08 — Change Control](../../../cross-cutting/gxp/08-change-control.md) | Change classification and approval workflow; guard-specific change categories and CCR-GUARD numbering — see [06-administrative-controls.md §64a](./06-administrative-controls.md) |
| [09 — Data Retention](../../../cross-cutting/gxp/09-data-retention.md) | Retention period guidance; guard-specific record types (AuditEntry, GxPAuditEntry, ElectronicSignature) and predicate rule alignment — see [04-data-retention.md §63](./04-data-retention.md) |
| [10 — Supplier Assessment](../../../cross-cutting/gxp/10-supplier-assessment.md) | Supplier assessment criteria; open-source library qualification rationale (ADR-GD-034) — see [06-administrative-controls.md §64d](./06-administrative-controls.md) |
| [11 — Decommissioning](../../../cross-cutting/gxp/11-decommissioning.md) | Decommissioning procedure structure; guard-specific audit trail archival and cryptographic key retirement — see [12-decommissioning.md §70](./12-decommissioning.md) |
| [12 — Compliance Checklist Template](../../../cross-cutting/gxp/12-compliance-checklist-template.md) | Checklist structure and pass/fail criteria format — see [08-compliance-verification.md §66](./08-compliance-verification.md) |
| [13 — Glossary](../../../cross-cutting/gxp/13-glossary.md) | Shared regulatory terminology; guard-specific terms (GuardPort, AuditTrailPort, GxPAuditEntry, WAL, hasSignature) — see [../glossary.md](../glossary.md) |

---

## Sub-Document Index

| Ch | File | Sections | Primary Regulatory Basis | Risk Level |
|----|------|----------|--------------------------|------------|
| 01 | [01-regulatory-context.md](./01-regulatory-context.md) | §59 Regulatory Context, §59a SubjectProvider Integrity, §60 ALCOA+ Mapping | 21 CFR Part 11, EU GMP Annex 11, ALCOA+, PIC/S PI 011-3 | High |
| 02 | [02-audit-trail-contract.md](./02-audit-trail-contract.md) | §61 AuditTrailPort Implementation Contract (append-only, WAL, hash chain, completeness) | 21 CFR 11.10(c)(e), EU GMP Annex 11 §9 | High |
| 03 | [03-clock-synchronization.md](./03-clock-synchronization.md) | §62 Clock Synchronization Requirements (NTP, drift tolerance, injectable ClockSource) | 21 CFR 11.10(e), ALCOA+ Contemporaneous | Medium |
| 04 | [04-data-retention.md](./04-data-retention.md) | §63 Retention Requirements, §63a Capacity Planning, §63b Privacy, §63c Archival Strategy | 21 CFR 11.10(c), EU GMP Annex 11 §17, predicate rules | Medium |
| 05 | [05-audit-trail-review.md](./05-audit-trail-review.md) | §64 Review Interface, §64e Export Formats (JSON, CSV, PDF manifest) | 21 CFR 11.10(e), PIC/S PI 011-3 §9.4, ALCOA+ Available | Medium |
| 06 | [06-administrative-controls.md](./06-administrative-controls.md) | §64a Change Control, §64b Activity Monitoring, §64c Training, §64d Supplier Qualification, §64f Regulatory Monitoring, §64f-1 Security Assessment, §64g Administrative Authority | 21 CFR 11.10(d)(j)(k), EU GMP Annex 11 §10–12, GAMP 5 | High |
| 07 | [07-electronic-signatures.md](./07-electronic-signatures.md) | §65 Electronic Signatures (hasSignature policy, SignatureServicePort, counter-signing, re-auth, HSM requirements) | 21 CFR 11.50–11.300, EU GMP Annex 11 §14 | High |
| 08 | [08-compliance-verification.md](./08-compliance-verification.md) | §66 Compliance Verification Checklist (checkGxPReadiness, checkPreDeploymentCompliance, 15-item readiness matrix) | 21 CFR 11.10(a), GAMP 5 Category 5, EU GMP Annex 11 §11 | High |
| 09 | [09-validation-plan.md](./09-validation-plan.md) | §67 Validation Plan — IQ (12 tests), OQ (52 tests), PQ (10 tests, 4-hour soak) | GAMP 5 §D, 21 CFR 11.10(a), WHO TRS 996 Annex 5 | High |
| 10 | [10-risk-assessment.md](./10-risk-assessment.md) | §68 FMEA — guard-specific failure modes (FM-N), RPN scoring, mitigations (complements [../risk-assessment.md](../risk-assessment.md)) | ICH Q9, GAMP 5 §3 | High |
| 11 | [11-traceability-matrix.md](./11-traceability-matrix.md) | §69 Regulatory RTM — 76 rows across 7 regulatory frameworks (complements [../traceability.md](../traceability.md)) | GAMP 5 §D.4, WHO TRS 996 Annex 5, EU GMP Annex 11 §4 | High |
| 12 | [12-decommissioning.md](./12-decommissioning.md) | §70 System Decommissioning (audit trail archival, cryptographic key retirement, validation evidence retention) | EU GMP Annex 11 §17, GAMP 5, 21 CFR 11.10(c) | Medium |
| 13 | [13-test-protocols.md](./13-test-protocols.md) | §87 IQ Protocols, §88 OQ Protocols, §89 PQ Protocols (executable qualification test scripts) | GAMP 5 §D, 21 CFR 11.10(a), EU GMP Annex 11 §11 | High |

---

## Quick Reference Card

Use this table to locate the guard sub-document that addresses a specific regulatory article, ALCOA+ principle, or audit topic. Regulatory article numbers reference the most specific applicable clause.

### By Regulatory Article

| Regulatory Article | Topic | Chapter | Section |
|---|---|---|---|
| 21 CFR 11.10(a) | System validation | 09 | §67 |
| 21 CFR 11.10(a) | Compliance verification checklist | 08 | §66 |
| 21 CFR 11.10(c) | Record protection and integrity | 02 | §61 |
| 21 CFR 11.10(c) | Data retention | 04 | §63 |
| 21 CFR 11.10(d) | Access controls (SubjectProvider integrity) | 01 | §59a |
| 21 CFR 11.10(d) | Administrative authority checks | 06 | §64g |
| 21 CFR 11.10(e) | Audit trail | 02 | §61 |
| 21 CFR 11.10(e) | Audit trail review interface | 05 | §64 |
| 21 CFR 11.10(e) | Clock / timestamp integrity | 03 | §62 |
| 21 CFR 11.10(j) | System classification (closed / open) | 01 | §59 |
| 21 CFR 11.10(k) | Audit trail of operational activity | 06 | §64b |
| 21 CFR 11.30 | Open system controls (TLS, origin signatures) | 01 | §59 |
| 21 CFR 11.50–11.100 | Electronic signature content and linking | 07 | §65 |
| 21 CFR 11.200 | Electronic signature components (two distinct IDs or biometric) | 07 | §65 |
| 21 CFR 11.300 | Consumer authentication responsibilities | 01 | §59 |
| EU GMP Annex 11 §5 | Input validation (policy schema, attribute types) | 01 | §59 |
| EU GMP Annex 11 §6 | Accuracy checks (attribute freshness) | 01 | §59 |
| EU GMP Annex 11 §8 | Printout capability | 01 | §59 |
| EU GMP Annex 11 §9 | Audit trail (server-side records) | 02 | §61 |
| EU GMP Annex 11 §10 | Change and configuration management | 06 | §64a |
| EU GMP Annex 11 §11 | Periodic evaluation | 06 | §64f |
| EU GMP Annex 11 §12 | Security (physical/logical access) | 01 | §59 |
| EU GMP Annex 11 §14 | Electronic signatures | 07 | §65 |
| EU GMP Annex 11 §15 | Batch release authorization pattern | 01 | §59 |
| EU GMP Annex 11 §17 | Archival and decommissioning | 12 | §70 |
| ICH Q9 | FMEA risk assessment methodology | 10 | §68 |
| PIC/S PI 011-3 §9.3 | Data lifecycle management | 01 | §59–60 |
| PIC/S PI 011-3 §9.4 | Audit trail access | 05 | §64 |
| PIC/S PI 011-3 §9.5 | Administrative monitoring | 06 | §64b |
| PIC/S PI 011-3 §9.8 | Risk-based review | 06 | §64f |
| WHO TRS 996 Annex 5 | Validation plan traceability | 09 | §67 |
| MHRA DI 2018 | Data governance framework | 01 | §60 |

### By Audit Topic

| Audit Topic | Chapter | Section |
|---|---|---|
| Audit trail append-only guarantee | 02 | §61 |
| Audit trail capacity planning | 04 | §63a |
| Audit trail completeness monitoring | 02 | §61 |
| Audit trail export (JSON / CSV / PDF manifest) | 05 | §64e |
| Audit trail hash chain verification | 02 | §61 |
| Audit trail privacy (GDPR / CCPA pseudonymization) | 04 | §63b |
| Audit trail retention periods | 04 | §63 |
| Audit trail review interface | 05 | §64 |
| Audit trail WAL (write-ahead log) crash recovery | 02 | §61 |
| Change control for policy updates | 06 | §64a |
| Clock source NTP synchronization | 03 | §62 |
| Compliance verification checklist (`checkGxPReadiness`) | 08 | §66 |
| Cryptographic key sizes (minimum requirements) | 07 | §65 |
| Electronic signature re-authentication | 07 | §65 |
| Electronic signature counter-signing (maker/checker) | 07 | §65 |
| HSM key storage requirements | 07 | §65 |
| IQ/OQ/PQ qualification protocols | 13 | §87–89 |
| GAMP 5 Category 5 justification | 09 (intro), 11 | §67, §69 |
| Minimum viable compliance path (five-step) | (see [../17-gxp-compliance.md](../17-gxp-compliance.md)) | Quick Start |
| Periodic review schedule | 06 | §64f |
| Predicate rule mapping | 01 | §59 |
| Pre-deployment compliance check (`checkPreDeploymentCompliance`) | 08 | §66 |
| Risk assessment (FMEA, FM-N failure modes, RPN) | 10 | §68 |
| Regulatory RTM (76 rows) | 11 | §69 |
| Signature algorithm minimum requirements | 07 | §65 |
| SubjectProvider integrity verification | 01 | §59a |
| Supplier qualification (`@hex-di/guard` open-source) | 06 | §64d |
| System classification (closed vs open) | 01 | §59 |
| System decommissioning | 12 | §70 |
| Training and competency records | 06 | §64c |
| Validation plan (IQ/OQ/PQ) | 09 | §67 |

### By ALCOA+ Principle

| ALCOA+ Principle | Guard Feature | Chapter | Section |
|---|---|---|---|
| **Attributable** | `AuditEntry.subjectId`, `authenticationMethod` | 01 | §60 |
| **Attributable** | SubjectProvider token validation | 01 | §59a |
| **Legible** | `serializePolicy()`, `explainPolicy()` | 01 | §60 |
| **Contemporaneous** | `Decision.evaluatedAt`, `AuditEntry.timestamp` (NTP) | 03 | §62 |
| **Original** | `Object.freeze()` on all audit entries | 02 | §61 |
| **Accurate** | `EvaluationTrace`, deterministic evaluation | 01 | §60 |
| **Accurate** | Attribute freshness checks (EU GMP Annex 11 §6) | 01 | §59 |
| **Complete** | Every `guard()` call records to `AuditTrailPort` | 02 | §61 |
| **Consistent** | `evaluationId` UUID correlation, ISO 8601 timestamps | 01 | §60 |
| **Enduring** | Retention requirements (per predicate rule) | 04 | §63 |
| **Enduring** | Archival strategy | 04 | §63c |
| **Available** | `GuardInspector`, MCP resources, export manifests | 05 | §64–64e |

---

_Parent chapter: [17-gxp-compliance.md](../17-gxp-compliance.md) · Governance index: [compliance/gxp.md](../compliance/gxp.md) · Full spec index: [README.md](../README.md)_
