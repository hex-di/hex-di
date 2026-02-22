# GxP Compliance -- @hex-di/clock

Mapping of `@hex-di/clock` guarantees to GxP regulatory requirements. This document serves as a compliance reference for organizations using the library in FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ regulated environments.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | GXP-CLK-006-IDX |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- spec/libs/clock/06-gxp-compliance/README.md` |
| Author | Derived from Git -- `git log --format="%an" -1 -- spec/libs/clock/06-gxp-compliance/README.md` |
| Approval Evidence | PR merge to `main` -- `git log --merges --first-parent main -- spec/libs/clock/06-gxp-compliance/README.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- spec/libs/clock/06-gxp-compliance/README.md` |

> **Auditor note**: This document is version-controlled via Git. The fields above provide pointers to the Git-managed metadata rather than duplicating it inline.

> **Cross-cutting GxP framework**: This document contains clock-specific compliance content. For the shared regulatory framework applicable to all `@hex-di` packages, see the [Cross-Cutting GxP Specification](../../cross-cutting/gxp/README.md), which covers:
> - [Regulatory Framework](../../cross-cutting/gxp/01-regulatory-framework.md)
> - [GAMP 5 Classification](../../cross-cutting/gxp/02-gamp5-classification.md)
> - [ALCOA+ Mapping Framework](../../cross-cutting/gxp/03-alcoa-mapping.md)
> - [Personnel Qualification](../../cross-cutting/gxp/04-personnel-qualification.md)
> - [FMEA Methodology](../../cross-cutting/gxp/05-fmea-methodology.md)
> - [Validation Protocol Template](../../cross-cutting/gxp/06-validation-protocol-template.md)
> - [Traceability Matrix Template](../../cross-cutting/gxp/07-traceability-matrix-template.md)
> - [Change Control](../../cross-cutting/gxp/08-change-control.md)
> - [Data Retention](../../cross-cutting/gxp/09-data-retention.md)
> - [Supplier Assessment](../../cross-cutting/gxp/10-supplier-assessment.md)
> - [Decommissioning](../../cross-cutting/gxp/11-decommissioning.md)
> - [Compliance Checklist Template](../../cross-cutting/gxp/12-compliance-checklist-template.md)
> - [Glossary](../../cross-cutting/gxp/13-glossary.md)

---

## Chapter 6: GxP Compliance

This chapter documents the GxP regulatory compliance mapping for `@hex-di/clock`. It covers clock-specific requirements for FDA 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ regulated environments.

**[GxP Quick Reference Card](#quick-reference)** — Auditor navigation guide

| Section | File | Description |
|---------|------|-------------|
| [§6.1 Clock Source Requirements](./01-clock-source-requirements.md) | `01-clock-source-requirements.md` | NTP boundary, in-scope/out-of-scope controls |
| [§6.2 Qualification Protocols](./02-qualification-protocols.md) | `02-qualification-protocols.md` | IQ/OQ/PQ validation protocols |
| [§6.3 Verification and Change Control](./03-verification-and-change-control.md) | `03-verification-and-change-control.md` | Change control process and rollback |
| [§6.4 Resolution and Precision](./04-resolution-and-precision.md) | `04-resolution-and-precision.md` | GxP timing precision requirements |
| [§6.5 ALCOA+ Mapping](./05-alcoa-mapping.md) | `05-alcoa-mapping.md` | ALCOA+ principle mapping |
| [§6.6 Audit Trail Integration](./06-audit-trail-integration.md) | `06-audit-trail-integration.md` | TemporalContext, signature binding, integrity |
| [§6.7 Recovery Procedures](./07-recovery-procedures.md) | `07-recovery-procedures.md` | FM-1–FM-6 recovery steps |
| [§6.8 Requirements Traceability Matrix](./08-requirements-traceability-matrix.md) | `08-requirements-traceability-matrix.md` | CLK-* requirement IDs and regulatory mapping |
| [§6.9 Supplier Assessment](./09-supplier-assessment.md) | `09-supplier-assessment.md` | Supplier information and quality controls |
| [§6.10 Personnel and Access Control](./10-personnel-and-access-control.md) | `10-personnel-and-access-control.md` | Role qualifications and access control |
| [§6.11 FMEA Risk Analysis](./11-fmea-risk-analysis.md) | `11-fmea-risk-analysis.md` | Failure mode analysis and risk scoring |
| [§6.12 Glossary](./12-glossary.md) | `12-glossary.md` | Technical and regulatory terms |

---

## Quick Reference

**Document:** SPEC-CLK-001 | **Revision:** 2.7 | **GAMP 5 Category:** 5 (Custom Software)

---

## What Is `@hex-di/clock`?

A clock and sequence generation library for the HexDI dependency injection ecosystem. It provides injectable ports (`ClockPort`, `SequenceGeneratorPort`, `TimerSchedulerPort`, `CachedClockPort`) with platform-specific adapters, enabling deterministic testing and GxP-compliant timestamp/sequence management. All timestamps use branded types (`MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`) for compile-time domain safety.

**Scope boundary:** The library provides temporal infrastructure only. It does NOT implement authentication, authorization, workflow enforcement, or electronic signature execution. These are consumer application responsibilities (see Not Applicable clause register in § 6.8).

---

## Regulatory Coverage at a Glance

| Regulation              | Key Clauses Addressed                          | Primary Spec Section               |
| ----------------------- | ---------------------------------------------- | ---------------------------------- |
| **FDA 21 CFR Part 11**  | 11.10(a)(b)(c)(d)(e)(h)(k)(2), 11.50, 11.70    | § 6.1, § 6.5, § 6.6, § 6.8         |
| **EU GMP Annex 11**     | Sections 3, 4, 5, 7, 9, 10, 11, 12.1, 12.4, 13, 16 | § 6.1, § 6.2, § 6.3, § 6.6, § 6.7, § 6.8, § 6.9, § 6.10 |
| **GAMP 5**              | Category 5 classification, Appendix M4         | § 6.1, § 6.7, § 6.11               |
| **ALCOA+**              | All 9 principles mapped                        | § 6.5                              |
| **ICH Q7 / 21 CFR 211** | 211.68 (calibration), 211.180 (retention)      | § 4.3, § 6.1, § 6.2, § 6.5        |

---

## Auditor Navigation Guide

### "Show me your validation approach"

- **Qualification protocols (IQ/OQ/PQ/DQ):** [§ 6.2 — qualification-protocols.md](./qualification-protocols.md)
- **Validation plan guidance for consuming organizations:** [§ 6.2 — qualification-protocols.md](./qualification-protocols.md), Validation Plan Guidance section
- **Risk classification:** [§ 6.1 — clock-source-requirements.md](./clock-source-requirements.md), GAMP 5 Risk Classification table
- **FMEA:** [§ 6.11 — fmea-risk-analysis.md](./fmea-risk-analysis.md)
- **Requirements traceability matrix:** [§ 6.8 — requirements-traceability-matrix.md](./requirements-traceability-matrix.md)
- **Definition of done (test criteria):** [§ 9.1–9.2 — 09-definition-of-done.md](../09-definition-of-done.md)

### "Show me your audit trail"

- **TemporalContext and serialization:** [§ 6.6 — audit-trail-integration.md](./audit-trail-integration.md)
- **ALCOA+ mapping with attribution context:** [§ 6.5 — alcoa-mapping.md](./alcoa-mapping.md)
- **Electronic signature binding (21 CFR 11.50):** [§ 6.5 — alcoa-mapping.md](./alcoa-mapping.md), SignableTemporalContext section
- **Sequence generator (ordering guarantees):** [§ 3.1–3.3 — 03-sequence-generator.md](../03-sequence-generator.md)

### "Show me your change control"

- **Version pinning, re-qualification triggers:** [§ 6.3 — verification-and-change-control.md](./verification-and-change-control.md)
- **Emergency change control procedure:** [§ 6.3 — verification-and-change-control.md](./verification-and-change-control.md), Emergency Change Control section
- **Supplier assessment and quality agreement:** [§ 6.9 — supplier-assessment.md](./supplier-assessment.md)
- **Periodic evaluation (Annex 11 §11):** [§ 6.1 — clock-source-requirements.md](./clock-source-requirements.md), Periodic Evaluation Fallback section

### "Show me your failure handling"

- **Recovery procedures (FM-1 through FM-12):** [§ 6.7 — recovery-procedures.md](./recovery-procedures.md)
- **FMEA with Risk Priority Numbers (FM-1 through FM-12):** [§ 6.11 — fmea-risk-analysis.md](./fmea-risk-analysis.md)
- **Overflow detection and degraded mode:** [§ 6.6 — audit-trail-integration.md](./audit-trail-integration.md), Emergency Overflow Context section

### "Show me your personnel and access controls"

- **Role definitions, training, re-training:** [§ 6.10 — personnel-and-access-control.md](./personnel-and-access-control.md)
- **Operational access control:** [§ 6.10 — personnel-and-access-control.md](./personnel-and-access-control.md), Operational Access Control section
- **Formal approval record:** [README.md](../README.md), Formal Specification Approval Record section

### "What's out of scope?"

- **Not Applicable clauses (11.10(f)(g)(i)(j)(k)(1), 11.200, 11.300(e)):** [§ 6.8 — requirements-traceability-matrix.md](./requirements-traceability-matrix.md), Not Applicable Clauses section

### Ecosystem Monitoring Adapter Status

The `@hex-di/clock` specification delegates FM-3 through FM-6 detection, NTP drift monitoring, cross-record chain integrity, and periodic adapter integrity verification to the ecosystem's GxP monitoring infrastructure. As of specification revision 2.7:

| Artifact | Status | Location |
|---|---|---|
| **`@hex-di/clock` specification** | Approved (Rev 2.7) | `spec/clock/` |
| **Ecosystem GxP monitoring adapter specification** | Planned | Not yet published |
| **CLK-GXP-008 compensating controls** | Specified | `spec/clock/compliance/gxp.md` |

**GxP deployment implications:** Until the ecosystem monitoring adapter specification is published and implemented, GxP organizations MUST implement CLK-GXP-008 compensating controls (see § 6.7, recovery-procedures.md) or deploy a third-party GxP monitoring solution that satisfies the Required Monitoring Adapter Capabilities table (§ 6.7). The compensating control path is fully specified and validated within this clock specification; it does not depend on the monitoring adapter.

REQUIREMENT: This status table MUST be updated whenever the ecosystem monitoring adapter specification is published, reaches a new maturity milestone, or changes status.

---

## V-Model Navigation Guide (GAMP 5)

This specification combines URS, FS, and DS levels into a single document set (see README.md, Combined Specification Approach). The following table maps each spec section to its primary GAMP 5 V-model specification level, enabling auditors to locate URS-, FS-, and DS-level content without separate documents.

| Spec Section | Primary V-Model Level | Content Description |
|---|---|---|
| § 1.1–1.2 (Overview, Design Principles) | URS | User-facing goals, design philosophy, scope boundary |
| § 2.1–2.8 (ClockPort, Branded Types, TimerScheduler, CachedClock, Capabilities) | URS / FS | Port interface definitions (URS); behavioral contracts, ordering guarantees, error semantics (FS) |
| § 3.1–3.3 (SequenceGeneratorPort, Ordering, Scoping) | URS / FS | Sequence generator interface (URS); monotonicity, uniqueness, overflow contracts (FS) |
| § 4.1–4.9 (Platform Adapters) | DS | Platform detection, factory implementation, API capture, freeze patterns, adapter construction |
| § 5.1–5.5 (Testing Support) | DS | Virtual adapter implementations, auto-advance, deterministic testing patterns |
| § 6.1–6.12 (GxP Compliance) | FS / DS | Behavioral requirements and regulatory contracts (FS); qualification protocols, FMEA, recovery procedures (DS) |
| § 7.1–7.7 (Integration) | DS | Container registration, migration guide, graph helpers |
| § 8.1 (API Reference) | FS | Complete public API surface with type signatures and behavioral contracts |
| § 9.1–9.2 (Definition of Done) | DS | Test organization, test enumeration, acceptance criteria |

**Reading guide:** Interface definitions and semantic contracts → URS level. Behavioral requirements (`REQUIREMENT:` statements), error handling, ordering guarantees → FS level. Platform mapping tables, factory implementation strategies, closure-based capture patterns → DS level.

---

## Key Design Decisions for GxP

| Decision                                                          | Rationale                                                                                | Spec Reference |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| `Object.freeze()` on all adapters and return values               | Tamper-evidence for ALCOA+ Original                                                      | § 4.1, § 6.5   |
| Structural irresettability (no `reset()` on production sequences) | 21 CFR 11.10(d) access control at the type level                                         | § 3.1          |
| Captured platform API references at construction                  | Anti-tampering: protects against post-construction `Date.now` replacement                | § 4.1          |
| Startup self-test (ST-1 through ST-5 blocking, ST-6 advisory)     | 21 CFR 11.10(h) device checks; ST-6 is advisory-only monitoring co-deployment check (EU GMP Annex 11 §11) | § 4.1, § 4.2   |
| Per-record SHA-256 digest (`computeTemporalContextDigest`)        | Self-contained cryptographic tamper-evidence at the record level, independent of external dependencies | § 6.6          |
| `TemporalContext` as utility, not port                            | Prevents DI-layer interception of audit data                                             | § 6.6          |
| Monotonic + wall-clock + high-res as separate methods             | Each serves a distinct GxP purpose (ordering, audit timestamps, performance measurement) | § 2.1–2.4      |
| Branded timestamp types (`MonotonicTimestamp`, etc.)              | Compile-time prevention of cross-domain timestamp misuse (zero runtime cost)             | § 2.5          |
| `TimerSchedulerPort` separate from `ClockPort`                    | SRP: reading time vs. scheduling work. Enables deterministic timer testing.              | § 2.6          |
| `CachedClockPort` NOT extending `ClockPort`                       | Structural separation prevents cached values in audit trails (ALCOA+ Contemporaneous)    | § 2.7, FM-10   |

---

## Qualification Quick Checklist

| Protocol              | Steps              | Duration                       | When to Execute                                      |
| --------------------- | ------------------ | ------------------------------ | ---------------------------------------------------- |
| **IQ** (Installation) | IQ-1 through IQ-30 | Automated, minutes             | Every deployment, every version upgrade              |
| **OQ** (Operational)  | OQ-1 through OQ-8  | Automated, minutes             | Every deployment, every version or platform upgrade  |
| **PQ** (Performance)  | PQ-1 through PQ-5  | Sustained run, ~1 hour default | Deployment qualification only (not CI/CD)            |
| **DQ** (Deployment)   | DQ-1 through DQ-5  | Manual + automated (DQ-5)      | Each deployment target, after infrastructure changes |

---

## Incident Escalation Path

When a clock-related incident occurs in a GxP deployment (e.g., NTP drift alert, sequence overflow, startup self-test failure, audit trail timestamp anomaly), follow this escalation path. Each level is contacted only if the previous level cannot resolve the incident within the stated timeframe.

| Level | Role | Contact When | Response Timeframe | Action |
| --- | --- | --- | --- | --- |
| **L1** | Infrastructure Operator | Any clock-related alert or anomaly detected | Within 15 minutes of detection | Execute the applicable recovery procedure from [§ 6.7 — recovery-procedures.md](./recovery-procedures.md). Assess whether the issue is contained or escalation is needed. |
| **L2** | GxP Validation Engineer | L1 cannot resolve within 30 minutes, or the issue affects audit trail integrity | Within 1 hour of escalation | Assess impact on validated state. Determine if re-qualification is required. Initiate deviation log entry. |
| **L3** | QA Reviewer | Validated state is compromised, data integrity may be affected, or emergency change is needed | Within 2 hours of escalation | Authorize emergency change procedure if criteria are met (see [§ 6.3 — verification-and-change-control.md](./verification-and-change-control.md)). Initiate risk assessment. |
| **L4** | QA Manager / Quality Director | Emergency change requires QA Manager approval, or incident exceeds L3 authority | Within 4 hours of escalation | Approve or reject emergency change. Authorize temporary risk acceptance if applicable. |

**Critical incident indicators** (escalate immediately to L2, bypassing L1 timeframe):
- Startup self-test failure (`ClockStartupError`) on a production deployment
- Sequence overflow (`SequenceOverflowError`) in production
- Per-record digest verification failure (`verifyTemporalContextDigest()` returns `false`)
- Monitoring adapter reports adapter integrity violation

REQUIREMENT: GxP organizations MUST customize this escalation path with specific contact information (names, roles, phone numbers, on-call rotation) and integrate it into their incident management SOP. The escalation path MUST be reviewed and updated whenever personnel assignments change.

REQUIREMENT: All escalation actions and communications MUST be documented in the incident log with timestamps, creating a contemporaneous record per ALCOA+ principles.

**L4 unavailability contingency:** GxP organizations MUST define a documented contingency for scenarios where the L4 authority (QA Manager / Quality Director) is unavailable within the 4-hour response timeframe. The contingency MUST identify either: (a) a pre-designated alternate L4 authority (deputy QA Manager) with documented emergency delegation authority, who may act as interim L4 for up to 24 hours until the primary L4 authority is reachable; or (b) an escalation to a higher organizational authority (e.g., VP of Quality, Chief Medical Officer for pharmaceutical organizations) with documented emergency decision-making authority. The delegation MUST be documented in advance (not created ad hoc during an incident) and include: the delegate's identity, qualification evidence, the scope of delegated authority, and the maximum delegation duration.

---

## GxP Deployment Compliance Checklist

The following step-by-step checklist provides a sequential walkthrough for GxP organizations deploying `@hex-di/clock` for the first time. Each step references the relevant specification section. Check off each item as completed.

### Phase 1: Pre-Deployment Planning

- [ ] **1.1** Assign personnel to all roles defined in § 6.10 (Clock Library Developer, GxP Validation Engineer, Infrastructure Operator, QA Reviewer, QA Manager, Application Developer)
- [ ] **1.2** Complete initial training for all assigned personnel (§ 6.10, Training Requirements)
- [ ] **1.3** Conduct supplier assessment review (§ 6.9, Supplier Assessment)
- [ ] **1.4** Establish Supplier Quality Agreement using SQA template (§ 6.9, SQA Template)
- [ ] **1.5** Create Computerized System Validation Plan addressing all 12 content areas (§ 6.2, CLK-QUA-016)
- [ ] **1.6** Define data retention policy by record type (§ 6.6, CLK-AUD-026/027)
- [ ] **1.7** Define audit trail review procedures and frequency (§ 6.6, CLK-AUD-032/033)
- [ ] **1.8** Choose FM-3–FM-6 detection mechanism: ecosystem monitoring adapter OR compensating controls (§ 6.7, CLK-GXP-008)
- [ ] **1.9** Complete FMEA review and document any organization-specific risk adjustments (§ 6.11)

### Phase 2: Infrastructure Configuration

- [ ] **2.1** Configure NTP daemon with leap smear (DQ-1)
- [ ] **2.2** Verify NTP synchronization before application start (DQ-2)
- [ ] **2.3** Add `Object.freeze(Date)` and `Object.freeze(performance)` to application entry point (DQ-3)
- [ ] **2.4** Freeze `@hex-di/clock` module exports after import (DQ-4)
- [ ] **2.5** Pin exact `@hex-di/clock` version in lockfile (CLK-CHG-001)
- [ ] **2.6** Implement compensating controls if ecosystem monitoring adapter is not deployed (CLK-GXP-008)

### Phase 3: Qualification Execution

- [ ] **3.1** Complete `APPROVAL_RECORD.json` with all 4 signatory roles (DQ-5)
- [ ] **3.2** Execute full IQ protocol (IQ-1 through IQ-30) on each deployment target (CLK-QUA-001)
- [ ] **3.3** Execute full OQ protocol (OQ-1 through OQ-8) on each deployment target (CLK-QUA-004)
- [ ] **3.4** Execute full PQ protocol (PQ-1 through PQ-5) on each deployment target (CLK-QUA-006)
- [ ] **3.5** Execute recovery verification tests (RV-1 through RV-7) (CLK-REC-003)
- [ ] **3.6** Document all qualification results in the validation evidence package (CLK-QUA-015)

### Phase 4: Deployment Approval

- [ ] **4.1** Verify all IQ/OQ/PQ steps passed with no failures
- [ ] **4.2** Verify FM-3–FM-6 detection mechanism is validated (CLK-QUA-018)
- [ ] **4.3** Obtain QA Reviewer sign-off on qualification results
- [ ] **4.4** Integrate incident escalation path with organization's incident management SOP
- [ ] **4.5** Archive all qualification evidence (approval record, IQ/OQ/PQ results, RCL, SQA)

### Phase 5: Ongoing Compliance

- [ ] **5.1** Execute audit trail reviews per defined frequency (CLK-AUD-032)
- [ ] **5.2** Monitor re-qualification triggers (§ 6.3) and re-execute IQ/OQ/PQ when triggered
- [ ] **5.3** Conduct annual SQA review (§ 6.9)
- [ ] **5.4** Conduct annual personnel re-training (CLK-PAC-003)
- [ ] **5.5** Execute disaster recovery test scenarios annually (CLK-REC-005)
- [ ] **5.6** Review and update FMEA annually or upon incident (CLK-CHG-020)

---

## Audit Preparation Guide

When preparing for a regulatory inspection (FDA, EMA, MHRA, or other competent authority), the following guide ensures all `@hex-di/clock`-related evidence is readily available.

### Evidence Package Contents

| # | Artifact | Location | Preparation Action |
|---|---|---|---|
| 1 | Specification document (SPEC-CLK-001) | `spec/clock/` | Verify revision matches `APPROVAL_RECORD.json` `specRevision` |
| 2 | Completed `APPROVAL_RECORD.json` | Organization's CSVP | Verify `approvalComplete: true`, all 4 signatories present |
| 3 | Signed Git tag verification output | Git repository | Run `git tag -v <tag>` and retain output |
| 4 | Review Comment Log (RCL) | Quality management system | Verify all Critical/Major comments closed |
| 5 | Supplier Quality Agreement | Organization's CSVP | Verify current (reviewed within 12 months) |
| 6 | IQ/OQ/PQ test execution reports | Qualification evidence package | One per deployment target; verify all steps passed |
| 7 | PQ parameter justification | Qualification evidence package | Documented rationale per CLK-QUA-009 |
| 8 | Training records | Quality management system | All personnel with current (non-expired) training |
| 9 | Competency assessment records | Quality management system | Pass status for all assigned personnel |
| 10 | Change control records | Quality management system | All version changes with QA approval |
| 11 | Deviation log entries | Quality management system | All clock-related deviations with CAPA status |
| 12 | NTP configuration evidence | DQ evidence package | DQ-1 and DQ-2 artifacts for each deployment target |
| 13 | Data retention policy | CSVP | Documented per CLK-AUD-027 |
| 14 | Audit trail review records | Quality management system | Signed review records per CLK-AUD-032 |
| 15 | Incident escalation path (customized) | Organization's SOP | Populated with contact information |

### Mock Audit Scenarios

GxP organizations SHOULD conduct annual mock audits covering `@hex-di/clock` infrastructure. The following scenarios test audit readiness:

1. **Scenario A — "Show me your traceability"**: Auditor selects a random requirement ID (e.g., CLK-AUD-004) and asks to see the test that verifies it, the test execution results, and the source code that implements it. Navigate: RTM (§ 6.8) → DoD (§ 9) → test file → CI results.

2. **Scenario B — "Show me a recent change"**: Auditor selects a recent version upgrade. Produce: the change control record, QA approval, IQ/OQ/PQ re-execution results, and the changelog review.

3. **Scenario C — "Show me your failure response"**: Auditor asks about a hypothetical FM-3 (NTP drift) incident. Produce: the incident classification (L3), escalation path, recovery procedure, compensating control configuration, and the DR-2 disaster recovery test results.

4. **Scenario D — "Show me your data integrity"**: Auditor selects a random audit trail record. Produce: the `TemporalContext`, `TemporalContextDigest`, verify integrity with `verifyTemporalContextDigest()`, show the `RetentionMetadata`, and demonstrate the audit trail review record covering that time period.

---

## Document Map

| Chapter | File                                                    | Sections | Topic                                                    |
| ------- | ------------------------------------------------------- | -------- | -------------------------------------------------------- |
| 01      | [01-overview.md](../01-overview.md)                     | 1.1–1.4  | Overview, design principles, data flow diagrams, package structure |
| 02      | [02-clock-port.md](../02-clock-port.md)                 | 2.1–2.8  | ClockPort, branded types, TimerSchedulerPort, CachedClockPort, ClockCapabilities |
| 03      | [03-sequence-generator.md](../03-sequence-generator.md) | 3.1–3.3  | SequenceGeneratorPort, ordering, scoping                 |
| 04      | [04-platform-adapters.md](../04-platform-adapters.md)   | 4.1–4.9  | SystemClockAdapter, platform detection, hardware, timer, cached clock, edge runtime, host bridge adapters |
| 05      | [05-testing-support.md](../05-testing-support.md)       | 5.1–5.5  | Virtual adapters, auto-advance, virtual timer/cached clock |
| 06      | [compliance/](./README.md)                       | 6.1–6.12 | GxP compliance (this directory)                          |
| 07      | [07-integration.md](../07-integration.md)               | 7.1–7.7  | Container registration, migration, timer/cached/edge/host-bridge clock registration |
| 08      | [08-api-reference.md](../08-api-reference.md)           | 8.1      | Complete API surface                                     |
| 09      | [09-definition-of-done.md](../09-definition-of-done.md) | 9.1–9.2  | Test organization, DoD items                             |

---


