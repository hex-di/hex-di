# GxP Compliance — @hex-di/clock

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-GXP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- compliance/gxp.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- compliance/gxp.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- compliance/gxp.md` |
| Status | Effective |

---

## Cross-Cutting GxP Framework

This document applies the shared GxP methodology maintained in [`spec/cross-cutting/gxp/`](../../../cross-cutting/gxp/README.md). Package-specific content below (FMEA failure modes, ALCOA+ feature mappings, test protocol details) is authored here; generic methodology and templates are defined in the cross-cutting framework and referenced rather than duplicated.

| Cross-Cutting Document | Methodology Applied in This Document |
|---|---|
| [01 — Regulatory Framework](../../../cross-cutting/gxp/01-regulatory-framework.md) | 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9 regulatory scope — see [§Applicable Regulatory Framework](#applicable-regulatory-framework) |
| [02 — GAMP 5 Classification](../../../cross-cutting/gxp/02-gamp5-classification.md) | Category 5 classification criteria and combined specification justification — see [§GAMP 5 Software Classification](#gamp-5-software-classification) |
| [03 — ALCOA+ Mapping](../../../cross-cutting/gxp/03-alcoa-mapping.md) | Generic ALCOA+ principle definitions; `@hex-di/clock`-specific feature mapping — see [§ALCOA+ Principle Mapping](#alcoa-principle-mapping) |
| [04 — Personnel Qualification](../../../cross-cutting/gxp/04-personnel-qualification.md) | Role qualification requirements; clock-specific roles in [§6.10](../06-gxp-compliance/10-personnel-and-access-control.md) |
| [05 — FMEA Methodology](../../../cross-cutting/gxp/05-fmea-methodology.md) | RPN scoring scale (Severity × Occurrence × Detection) and risk level thresholds — see [§FMEA Summary](#fmea-summary) |
| [06 — Validation Protocol Template](../../../cross-cutting/gxp/06-validation-protocol-template.md) | IQ/OQ/PQ/DQ protocol structure; clock-specific steps in [§6.2](../06-gxp-compliance/02-qualification-protocols.md) — see [§Qualification Protocol Coverage](#qualification-protocol-coverage) |
| [07 — Traceability Matrix Template](../../../cross-cutting/gxp/07-traceability-matrix-template.md) | RTM structure; clock-specific RTM in [§6.8](../06-gxp-compliance/08-requirements-traceability-matrix.md) — see [§Traceability](#traceability) |
| [08 — Change Control](../../../cross-cutting/gxp/08-change-control.md) | Change classification and approval workflow; clock-specific procedure in [§6.3](../06-gxp-compliance/03-verification-and-change-control.md) |
| [09 — Data Retention](../../../cross-cutting/gxp/09-data-retention.md) | Retention period guidance; clock delegates retention enforcement to consuming applications (CLK-DTS-001) |
| [10 — Supplier Assessment](../../../cross-cutting/gxp/10-supplier-assessment.md) | Supplier assessment criteria; clock-specific assessment in [§6.9](../06-gxp-compliance/09-supplier-assessment.md) |

---

## GAMP 5 Software Classification

`@hex-di/clock` is classified as **GAMP 5 Category 5 — Custom Software**.

| Classification Criterion | Assessment |
|--------------------------|------------|
| Software type | Custom-developed TypeScript library |
| Configurable vs custom | Custom — no vendor configuration layer |
| GxP criticality | High — provides timestamps used in electronic records and audit trails |
| Scope of validation | Full V-model: URS, FS, DS, IQ, OQ, PQ |
| Combined specification approach | Justified per GAMP 5 Appendix D scalability principle (see [README.md §Combined Specification Approach](../README.md)) |

The library provides foundational timing infrastructure for GxP-applicable computerized systems. Its outputs — `TemporalContext` records containing `monotonicTimestamp`, `wallClockTimestamp`, and `sequenceNumber` — are used as timestamps in electronic records subject to 21 CFR Part 11 and EU GMP Annex 11.

---

## Applicable Regulatory Framework

| Regulation | Scope |
|------------|-------|
| **21 CFR Part 11** | Electronic records and electronic signatures in FDA-regulated systems |
| **EU GMP Annex 11** | Computerised systems in GMP environments |
| **GAMP 5** | Good Automated Manufacturing Practice guidance for validation |
| **ICH Q9** | Quality risk management — FMEA methodology |
| **ALCOA+** | Data integrity principles (Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available) |

Key regulatory clauses addressed:

- 21 CFR 11.10(a) — Validation of systems to ensure accuracy and reliability
- 21 CFR 11.10(c) — Protection of records to enable accurate and ready retrieval
- 21 CFR 11.10(d) — Limiting system access to authorized individuals
- 21 CFR 11.10(e) — Use of secure, computer-generated, time-stamped audit trails
- 21 CFR 11.10(h) — Device checks to ensure input source validity
- 21 CFR 11.50 — Signed electronic records must contain date/time of signature
- EU GMP Annex 11, Section 7.1 — Data should be recorded at the time of the activity
- EU GMP Annex 11, Section 11 — Audit trails

---

## ALCOA+ Principle Mapping

| Principle | Library Feature | Requirement IDs |
|-----------|----------------|----------------|
| **Attributable** | `TemporalContext` records contain `sequenceNumber` and timestamps linking each record to a specific time instant | CLK-AUD-001–003 |
| **Legible** | `TemporalContext` serializes to JSON with ISO 8601 timestamps; `ClockDiagnostics` provides human-readable capability descriptions | CLK-AUD-004 |
| **Contemporaneous** | `CachedClockPort` is structurally incompatible with `ClockPort` (INV-CK-9), preventing stale cached timestamps from being used in audit records | CLK-CAC-001 |
| **Original** | `TemporalContext` is frozen at creation (INV-CK-8); SHA-256 per-record integrity digest (INV-CK-14); adapter return values frozen (INV-CK-2) | CLK-AUD-005–010 |
| **Accurate** | Startup self-test ST-1–ST-5 validates platform timing APIs before any timestamp is served (INV-CK-6); NTP synchronization requirements for wall-clock accuracy | CLK-SYS-009–011 |
| **Complete** | Clock source change events unconditional (INV-CK-12); `OverflowTemporalContext` preserves audit record at sequence overflow | CLK-INT-007–011 |
| **Consistent** | Capture ordering guaranteed: `seq.next()` → `monotonicNow()` → `wallClockNow()` (INV-CK-13) | CLK-ORD-001 |
| **Enduring** | `validateRetentionMetadata()` and `RetentionPolicyPort` enable retention policy enforcement; data retention delegation to consuming applications | CLK-DTS-001 |
| **Available** | `deserializeTemporalContext()`, `deserializeOverflowTemporalContext()`, `deserializeClockDiagnostics()` support record retrieval from storage | CLK-AUD-011–013 |

Full ALCOA+ requirements with implementation specifics: [§6.5 ALCOA+ Mapping](../06-gxp-compliance/05-alcoa-mapping.md).

---

## 21 CFR Part 11 Compliance Summary

| Clause | Requirement | Implementation |
|--------|-------------|---------------|
| 11.10(a) | System validation | IQ/OQ/PQ qualification protocols — [§6.2](../06-gxp-compliance/02-qualification-protocols.md) |
| 11.10(c) | Record protection | `Object.freeze()` on all records (INV-CK-2, INV-CK-8); SHA-256 integrity digests (INV-CK-14) |
| 11.10(d) | Access limitation | Structural irresettability of production `SequenceGeneratorPort` (INV-CK-4); `VirtualSequenceGenerator` in test-only subpath |
| 11.10(e) | Audit trail | `TemporalContext` factory with sequence + monotonic + wall-clock; clock source change events (INV-CK-12) |
| 11.10(h) | Device checks | Startup self-test ST-1–ST-5 (INV-CK-6) |
| 11.50 | Signature binding | `validateSignableTemporalContext()` enforces pre-signature temporal consistency; [§6.5](../06-gxp-compliance/05-alcoa-mapping.md) |
| 11.100/11.300 | Electronic signature identity | Consumer responsibility — [§6.10](../06-gxp-compliance/10-personnel-and-access-control.md) |

---

## GxP Compliance Sub-Documents

The detailed GxP compliance content is organized into 12 sub-documents under `06-gxp-compliance/`:

| Sub-Document | Content | Primary Regulatory Basis |
|---|---|---|
| [§6.1 Clock Source Requirements](../06-gxp-compliance/01-clock-source-requirements.md) | NTP synchronization requirements, periodic evaluation, compensating controls for FM-3–FM-6 | EU GMP Annex 11 §11, CLK-GXP-001–008 |
| [§6.2 Qualification Protocols](../06-gxp-compliance/02-qualification-protocols.md) | IQ (25 tests), OQ (8 tests), PQ (5 tests), DQ checklist, CSVP content requirements | 21 CFR 11.10(a), GAMP 5 V-model |
| [§6.3 Verification and Change Control](../06-gxp-compliance/03-verification-and-change-control.md) | Normal and emergency change control, rollback procedure, PQ window extension | 21 CFR 820.70(i) |
| [§6.4 Resolution and Precision](../06-gxp-compliance/04-resolution-and-precision.md) | Platform clock resolution requirements, degraded-precision handling | EU GMP Annex 11 §4 |
| [§6.5 ALCOA+ Mapping](../06-gxp-compliance/05-alcoa-mapping.md) | Complete ALCOA+ principle implementation mapping with requirement IDs | ICH Q9, ALCOA+ |
| [§6.6 Audit Trail Integration](../06-gxp-compliance/06-audit-trail-integration.md) | `TemporalContext` schema, capture ordering, record integrity, electronic signature binding | 21 CFR 11.10(e), 11.50 |
| [§6.7 Recovery Procedures](../06-gxp-compliance/07-recovery-procedures.md) | FM-1/FM-2 recovery; FM-3–FM-6 compensating controls and detection guidance (CLK-GXP-008) | ICH Q9 FMEA |
| [§6.8 Requirements Traceability Matrix](../06-gxp-compliance/08-requirements-traceability-matrix.md) | Complete CLK-* requirement → test case mapping, RTM.json companion file | EU GMP Annex 11 §4, 21 CFR 11.10(a) |
| [§6.9 Supplier Assessment](../06-gxp-compliance/09-supplier-assessment.md) | Internal `@hex-di` package assessment, SQA prerequisites, named representative process | GAMP 5 §5 |
| [§6.10 Personnel and Access Control](../06-gxp-compliance/10-personnel-and-access-control.md) | Role definitions (QA Manager added), qualification requirements, training frequency | 21 CFR 11.10(d), 11.100 |
| [§6.11 FMEA Risk Analysis](../06-gxp-compliance/11-fmea-risk-analysis.md) | 15 failure modes (FM-1–FM-15), RPN scoring (all ≤ 84), compound failure analysis | ICH Q9 |
| [§6.12 Glossary](../06-gxp-compliance/12-glossary.md) | 46 regulatory and technical terms with definitions | — |

**Auditor navigation:** Start with the [GxP Quick Reference Card](../06-gxp-compliance/README.md#quick-reference) for a V-model navigation guide and compliance checklist.

---

## FMEA Summary

Full FMEA with scoring criteria, compound failure analysis, and residual risk acceptance: [§6.11 FMEA Risk Analysis](../06-gxp-compliance/11-fmea-risk-analysis.md).

| Risk Level | Count | Highest RPN | Status |
|------------|-------|-------------|--------|
| High (RPN ≥ 100) | 0 | — | All mitigated |
| Conditionally acceptable (61–99) | 2 | FM-3: 84, FM-6: 75 | Documented risk acceptance required |
| Acceptable (≤ 60) | 13 | — | Routine monitoring |

No unacceptable risk levels exist. FM-3 and FM-6 require documented QA risk acceptance before GxP deployment (as specified in [§6.11](../06-gxp-compliance/11-fmea-risk-analysis.md)).

---

## Qualification Protocol Coverage

| Protocol | Tests | Reference |
|----------|-------|-----------|
| DQ — Design Qualification | DQ-1–DQ-5 (incl. `APPROVAL_RECORD.json` verification) | [README.md §DQ-5](../README.md#pre-deployment-approval-verification-dq-5) |
| IQ — Installation Qualification | IQ-1–IQ-25 | [§6.2](../06-gxp-compliance/02-qualification-protocols.md) |
| OQ — Operational Qualification | OQ-1–OQ-8 | [§6.2](../06-gxp-compliance/02-qualification-protocols.md) |
| PQ — Performance Qualification | PQ-1–PQ-5 | [§6.2](../06-gxp-compliance/02-qualification-protocols.md) |

---

## Traceability

Forward traceability from all 322 CLK-* requirements to test cases: [§6.8 Requirements Traceability Matrix](../06-gxp-compliance/08-requirements-traceability-matrix.md).

Per-invariant traceability (INV-CK-1–INV-CK-14) to FMEA failure modes and test files: [traceability.md §Invariant Traceability](../traceability.md#invariant-traceability).
