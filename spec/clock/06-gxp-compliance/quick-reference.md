# GxP Quick Reference Card

**Document:** SPEC-CLK-001 | **Revision:** 1.6 | **GAMP 5 Category:** 5 (Custom Software)

---

## What Is `@hex-di/clock`?

A clock and sequence generation library for the HexDI dependency injection ecosystem. It provides injectable ports (`ClockPort`, `SequenceGeneratorPort`) with platform-specific adapters, enabling deterministic testing and GxP-compliant timestamp/sequence management.

**Scope boundary:** The library provides temporal infrastructure only. It does NOT implement authentication, authorization, workflow enforcement, or electronic signature execution. These are consumer application responsibilities (see Not Applicable clause register in § 6.8).

---

## Regulatory Coverage at a Glance

| Regulation              | Key Clauses Addressed                          | Primary Spec Section               |
| ----------------------- | ---------------------------------------------- | ---------------------------------- |
| **FDA 21 CFR Part 11**  | 11.10(a)(b)(c)(d)(e)(h)(k)(2), 11.50           | § 6.1, § 6.5, § 6.6, § 6.8         |
| **EU GMP Annex 11**     | Sections 3, 4, 5, 7, 9, 10, 11, 12.1, 12.4, 16 | § 6.1, § 6.3, § 6.8, § 6.9, § 6.10 |
| **GAMP 5**              | Category 5 classification, Appendix M4         | § 6.1, § 6.7, § 6.11               |
| **ALCOA+**              | All 9 principles mapped                        | § 6.5                              |
| **ICH Q7 / 21 CFR 211** | 211.68 (calibration), 211.180 (retention)      | § 6.1, § 6.5                       |

---

## Auditor Navigation Guide

### "Show me your validation approach"

- **Qualification protocols (IQ/OQ/PQ/DQ):** [§ 6.2 — qualification-protocols.md](./qualification-protocols.md)
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
- **Supplier assessment:** [§ 6.9 — supplier-assessment.md](./supplier-assessment.md)

### "Show me your failure handling"

- **Recovery procedures (FM-1 through FM-6):** [§ 6.7 — recovery-procedures.md](./recovery-procedures.md)
- **FMEA with Risk Priority Numbers:** [§ 6.11 — fmea-risk-analysis.md](./fmea-risk-analysis.md)
- **Overflow detection and degraded mode:** [§ 6.6 — audit-trail-integration.md](./audit-trail-integration.md), Emergency Overflow Context section

### "Show me your personnel and access controls"

- **Role definitions, training, re-training:** [§ 6.10 — personnel-and-access-control.md](./personnel-and-access-control.md)
- **Operational access control:** [§ 6.10 — personnel-and-access-control.md](./personnel-and-access-control.md), Operational Access Control section
- **Formal approval record:** [README.md](../README.md), Formal Specification Approval Record section

### "What's out of scope?"

- **Not Applicable clauses (11.10(f)(g)(i)(j)(k)(1), 11.200, 11.300(e)):** [§ 6.8 — requirements-traceability-matrix.md](./requirements-traceability-matrix.md), Not Applicable Clauses section

---

## Key Design Decisions for GxP

| Decision                                                          | Rationale                                                                                | Spec Reference |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------- |
| `Object.freeze()` on all adapters and return values               | Tamper-evidence for ALCOA+ Original                                                      | § 4.1, § 6.5   |
| Structural irresettability (no `reset()` on production sequences) | 21 CFR 11.10(d) access control at the type level                                         | § 3.1          |
| Captured platform API references at construction                  | Anti-tampering: protects against post-construction `Date.now` replacement                | § 4.1          |
| Startup self-test (ST-1 through ST-5)                             | 21 CFR 11.10(h) device checks                                                            | § 4.1          |
| Per-record SHA-256 digest (`computeTemporalContextDigest`)        | Self-contained cryptographic tamper-evidence at the record level, independent of guard   | § 6.6          |
| `TemporalContext` as utility, not port                            | Prevents DI-layer interception of audit data                                             | § 6.6          |
| Monotonic + wall-clock + high-res as separate methods             | Each serves a distinct GxP purpose (ordering, audit timestamps, performance measurement) | § 2.1–2.4      |

---

## Qualification Quick Checklist

| Protocol              | Steps              | Duration                       | When to Execute                                      |
| --------------------- | ------------------ | ------------------------------ | ---------------------------------------------------- |
| **IQ** (Installation) | IQ-1 through IQ-20 | Automated, minutes             | Every deployment, every version upgrade              |
| **OQ** (Operational)  | OQ-1 through OQ-5  | Automated, minutes             | Every deployment, every version or platform upgrade  |
| **PQ** (Performance)  | PQ-1 through PQ-4  | Sustained run, ~1 hour default | Deployment qualification only (not CI/CD)            |
| **DQ** (Deployment)   | DQ-1 through DQ-5  | Manual + automated (DQ-5)      | Each deployment target, after infrastructure changes |

---

## Document Map

| Chapter | File                                                    | Sections | Topic                                                    |
| ------- | ------------------------------------------------------- | -------- | -------------------------------------------------------- |
| 01      | [01-overview.md](../01-overview.md)                     | 1.1–1.3  | Overview, design principles, package structure           |
| 02      | [02-clock-port.md](../02-clock-port.md)                 | 2.1–2.4  | ClockPort interface and time semantics                   |
| 03      | [03-sequence-generator.md](../03-sequence-generator.md) | 3.1–3.3  | SequenceGeneratorPort, ordering, scoping                 |
| 04      | [04-platform-adapters.md](../04-platform-adapters.md)   | 4.1–4.5  | SystemClockAdapter, platform detection, hardware adapter |
| 05      | [05-testing-support.md](../05-testing-support.md)       | 5.1–5.3  | Virtual adapters, deterministic testing                  |
| 06      | [06-gxp-compliance/](./README.md)                       | 6.1–6.12 | GxP compliance (this directory)                          |
| 07      | [07-integration.md](../07-integration.md)               | 7.1–7.3  | Container registration, migration, guard integration     |
| 08      | [08-api-reference.md](../08-api-reference.md)           | 8.1      | Complete API surface                                     |
| 09      | [09-definition-of-done.md](../09-definition-of-done.md) | 9.1–9.2  | Test organization, DoD items                             |
