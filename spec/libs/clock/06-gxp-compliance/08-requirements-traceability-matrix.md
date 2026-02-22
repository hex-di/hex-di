# 6.8 Requirements Traceability Matrix — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.7 Recovery Procedures](./07-recovery-procedures.md) | **Next:** [§6.9 Supplier Assessment](./09-supplier-assessment.md)

> For the generic RTM template and methodology, see [../../cross-cutting/gxp/07-traceability-matrix-template.md](../../cross-cutting/gxp/07-traceability-matrix-template.md). This section contains clock-specific requirement traceability entries.

## Purpose

This Requirements Traceability Matrix (RTM) maps each cited regulatory requirement to the specification section(s) that address it, the implementation artifact(s) that realize it, and the validation test case(s) that verify it. The RTM satisfies EU GMP Annex 11 Section 4 (validation documentation) and GAMP 5 Appendix M4 (traceability).

REQUIREMENT: GxP organizations MUST maintain this RTM as part of their computerized system validation plan. The RTM MUST be updated whenever specification sections, implementation artifacts, or test cases are added, modified, or removed.

### Operational Requirement Classification

Requirements tagged with **[OPERATIONAL]** are procedural or organizational in nature — they require GxP organizations to implement procedures, document processes, or perform manual actions that cannot be verified by the library's automated test suite. These requirements are essential for GxP compliance but their verification relies on deployment-context checks (DQ steps), code review attestations, or consumer validation plan evidence rather than automated library tests.

**Impact on test coverage metrics:** [OPERATIONAL] requirements MUST be excluded from automated test coverage percentage calculations. When reporting requirement coverage, organizations SHOULD report two metrics separately: (a) automated-testable requirement coverage (excluding [OPERATIONAL] requirements) and (b) [OPERATIONAL] requirement verification status (documented in the CSVP with evidence type per requirement).

**Current count:** 22 requirements are tagged [OPERATIONAL] out of 322 total requirements (CLK-HRS-002, CLK-MPC-001, CLK-MPC-005, CLK-MPC-006, CLK-SYS-002, CLK-SYS-003, CLK-SYS-013, CLK-SYS-019, CLK-HB-008, CLK-HB-009, CLK-GXP-008, CLK-GXP-009, CLK-GXP-010, CLK-GXP-011, CLK-GXP-012, CLK-DTS-001, CLK-DTS-002, CLK-DTS-003, CLK-DTS-004, CLK-DTS-005, CLK-SUP-001, CLK-SUP-002).

### Operational Requirement Verification Utilities

While [OPERATIONAL] requirements cannot be verified by the library's automated test suite (they depend on deployment context), `@hex-di/clock` provides runtime verification utilities that consumers can invoke during their deployment qualification (DQ) or as part of periodic operational checks.

```typescript
// Consumer-invocable runtime verification utilities for [OPERATIONAL] requirements
// These are RECOMMENDED helpers, not mandatory APIs — consumers MAY implement equivalent checks.

interface OperationalCheckResult {
  readonly requirementId: string;
  readonly passed: boolean;
  readonly message: string;
  readonly evidence: string;
}
```

**Verification matrix for [OPERATIONAL] requirements:**

| Requirement ID | Automated Check Available | Verification Method | DQ Step |
|---|---|---|---|
| CLK-SYS-002 | Yes — `Object.isFrozen(Date) && Object.isFrozen(performance)` | Runtime check at application entry point; ST-4 in GxP mode | DQ-3 |
| CLK-SYS-003 | Yes — `Object.isFrozen(require('@hex-di/clock'))` or equivalent | Runtime check after import | DQ-4 |
| CLK-SYS-013 | Yes — verified by ST-4 at adapter construction (GxP mode enables the check) | Adapter construction with `{ gxp: true }` | OQ-6 |
| CLK-HB-008 | Yes — `Object.isFrozen(bridge)` before passing to factory | Runtime check before `createHostBridgeClock()` | DoD 26: #15 |
| CLK-HB-009 | Partial — check for bridge module in `node_modules` | File system check at deployment time | Consumer IQ extension |
| CLK-HRS-002 | No — requires NTP sync verification external to the library | `chronyc tracking` or `ntpq -p` output parsed for offset < threshold | DQ-2 |
| CLK-MPC-001 | No — requires process-unique identifier chosen by consumer | Consumer code review attestation | PQ-3 |
| CLK-MPC-005 | No — requires audit trail reconstruction procedure documented | CSVP document review | PQ (consumer validation plan) |
| CLK-MPC-006 | No — requires CSVP documentation | CSVP document review | PQ (consumer validation plan) |
| CLK-SYS-019 | No — requires hardware clock calibration program | Calibration records review | DQ (procedural) |
| CLK-GXP-008 | No — requires compensating controls documented in CSVP | CSVP review + compensating control test evidence | Consumer validation plan |

REQUIREMENT (CLK-OPS-001): GxP organizations MUST include all 11 [OPERATIONAL] requirements in their deployment qualification checklist. For each [OPERATIONAL] requirement, the organization MUST document: the verification method used, the verification date, the evidence collected, and the verifier identity. Requirements with automated checks available (CLK-SYS-002, CLK-SYS-003, CLK-SYS-013, CLK-HB-008) SHOULD be verified using the automated checks as primary evidence, supplemented by procedural review.

REQUIREMENT (CLK-OPS-002): The [OPERATIONAL] requirement verification status MUST be included in the `APPROVAL_RECORD.json` (or an accompanying `OPERATIONAL_VERIFICATION_RECORD.json`) and retained as part of the qualification evidence package.

---

## FDA 21 CFR Part 11 — Applicable Clauses

| Regulatory Clause | Requirement Summary                                                                                                                           | Spec Section(s)                                                                                                                                                                                      | Implementation Artifact(s)                                                                                                                                                                       | Validation Test(s)                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 11.10(a)          | Validation of systems to ensure accuracy, reliability, consistent intended performance, and the ability to discern invalid or altered records | ./02-qualification-protocols.md (IQ/OQ/PQ/DQ), ./11-fmea-risk-analysis.md, 09-definition-of-done.md                                                                                                      | IQ protocol (30 steps), OQ protocol (8 steps), PQ protocol (5 steps), DQ checklist (5 steps), FMEA risk analysis, mutation testing (>95% kill rate)                                              | All DoD items collectively; IQ-1 through IQ-30; OQ-1 through OQ-8; PQ-1 through PQ-5                    |
| 11.10(b)          | Ability to generate accurate and complete copies of records                                                                                   | ./06-audit-trail-integration.md (Serialization, Schema Migration Strategy)                                                                                                                             | `TemporalContext`, `OverflowTemporalContext`, JSON serialization schema, `deserializeTemporalContext()`, `deserializeOverflowTemporalContext()`, `deserializeClockDiagnostics()`                 | DoD 8: #1-#22; DoD 8b: #1-#19                                                                           |
| 11.10(c)          | Protection of records to enable accurate and ready retrieval                                                                                  | ./06-audit-trail-integration.md (Tamper-evidence, Self-Contained Record Integrity), 04-platform-adapters.md (Platform API Capture)                                                                     | `Object.freeze()` on all adapters, captured API references, platform API freeze, `computeTemporalContextDigest()` SHA-256 per-record integrity, `verifyTemporalContextDigest()` tamper detection | IQ-4, IQ-5, IQ-11, IQ-13, IQ-22; DoD 7: #1-#4, #18-#19; DoD 8c: #1-#21                                  |
| 11.10(d)          | Limiting system access to authorized individuals                                                                                              | 03-sequence-generator.md (Structural irresettability)                                                                                                                                                | Production `SequenceGeneratorPort` lacks `reset()` at the type level                                                                                                                             | IQ-6; DoD 2: #11-#15; DoD 7: #12                                                                        |
| 11.10(e)          | Audit trails for record creation, modification, deletion                                                                                      | ./06-audit-trail-integration.md (TemporalContext, create returning Result, createOverflowContext), 07-integration.md (ClockSourceChangedSink, unconditional event emission), ./07-recovery-procedures.md | `TemporalContextFactory.create()` (returns `Result`), `createOverflowContext()`, `ClockSourceChangedEvent`, `ClockSourceChangedSinkPort` (unconditional, container-independent)                  | DoD 8: #1-#20; DoD 7: #15-#17; DoD 12: #6-#8; DoD 13: #1-#9; IQ-17, IQ-18                               |
| 11.10(h)          | Device checks to determine validity of data input/output                                                                                      | 04-platform-adapters.md (Startup Self-Test ST-1 through ST-5)                                                                                                                                        | `createSystemClock()` startup self-test, `ClockStartupError`. ST-5 detects `performance.timeOrigin` drift (FM-9).                                                                                | DoD 3: #11-#23; IQ-14, IQ-15, IQ-16, IQ-19                                                              |
| 11.10(k)(2)       | Revision and change control procedures                                                                                                        | ./03-verification-and-change-control.md (Standard and Emergency Change Control)                                                                                                                        | Version pinning, QA approval workflow, re-qualification triggers, emergency change procedure with expedited approval and retrospective qualification                                             | DQ-1 through DQ-5; Emergency: expedited IQ + abbreviated OQ, retrospective full IQ/OQ/PQ within 30 days |
| 11.50             | Electronic signature requirements                                                                                                             | ./05-alcoa-mapping.md (Attribution Context, Electronic Signature Binding, Signature Validation Utility), ./06-audit-trail-integration.md (Signature Binding)                                             | `SignableTemporalContext` extension interface, `validateSignableTemporalContext()` runtime enforcement, `SignatureValidationError`                                                               | DoD 8a: #1-#16; Consumer responsibility for identity management                                         |
| 11.70             | Signatures linked to respective electronic records to prevent excision, copying, or transfer                                                  | ./05-alcoa-mapping.md (Electronic Signature Binding, Signature Validation Utility)                                                                                                                     | `SignableTemporalContext` binds signature to `TemporalContext` at creation time (CLK-SIG-003); `validateSignableTemporalContext()` enforces binding round-trip integrity (CLK-SIG-017)           | DoD 8a: #7-#10 (signature binding); DoD 8a: #11-#14 (validation utility)                                |
| 11.100            | General requirements for electronic signatures (uniqueness, non-reuse, identity verification, FDA certification)                              | ./05-alcoa-mapping.md (Electronic Signature General Requirements Cross-Reference)                                                                                                                      | Consumer identity management system; `signerId` registry                                                                                                                                         | Consumer responsibility; organizational SOP                                                             |
| 11.300            | Controls for identification codes and passwords (uniqueness, periodic revision, loss management, transaction safeguards)                      | ./05-alcoa-mapping.md (Electronic Signature General Requirements Cross-Reference)                                                                                                                      | Consumer credential management system; session management                                                                                                                                        | Consumer responsibility; organizational SOP                                                             |

## EU GMP Annex 11

| Regulatory Clause | Requirement Summary                    | Spec Section(s)                                                                                       | Implementation Artifact(s)                                                                                            | Validation Test(s)                                         |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Section 3         | Personnel qualification                | ./10-personnel-and-access-control.md                                                                    | Role definitions, training requirements                                                                               | Organizational procedure (not automated)                   |
| Section 4         | Validation documentation               | ./08-requirements-traceability-matrix.md (this document), ./02-qualification-protocols.md (Validation Plan Guidance, CLK-QUA-016), 09-definition-of-done.md | RTM, DoD items, test organization, CLK-QUA-016 (CSVP minimum content areas) | All DoD items collectively; CLK-QUA-016: organizational procedure |
| Section 5         | Supplier assessment                    | ./09-supplier-assessment.md (incl. Supplier Quality Agreement Prerequisite)                             | Supplier quality documentation, bilateral SQA requirement                                                             | Organizational procedure (not automated)                   |
| Section 7         | Data transfer integrity                | ./06-audit-trail-integration.md (Timestamp Format)                                                      | ISO 8601 UTC externalization, `toISOString()`                                                                         | DoD 7: #11                                                 |
| Section 9         | Data storage security                  | ./01-clock-source-requirements.md (Injectable clock source), 07-integration.md (Container Registration) | `ClockPort` injection enabling NTP-validated adapter, `SystemClockAdapter` + `SystemSequenceGeneratorAdapter` DI registration | DoD 1: #1-#7; DoD 12: #1-#10; IQ-1, IQ-2                   |
| Section 10        | Change control                         | ./03-verification-and-change-control.md (Standard and Emergency Change Control)                         | Version pinning, re-qualification triggers, emergency change procedure with 30-day retrospective qualification window | DQ-1 through DQ-5; Emergency procedure                     |
| Section 11        | Periodic evaluation                    | ./01-clock-source-requirements.md (Periodic Evaluation Fallback, CLK-GXP-006, CLK-GXP-007), ./03-verification-and-change-control.md (Periodic Adapter Integrity) | CLK-GXP-006 (verify periodic evaluation mechanism exists), CLK-GXP-007 (minimum viable periodic evaluation via `ClockDiagnosticsPort`), ecosystem monitoring adapter's periodic integrity check | CLK-GXP-006: organizational procedure (CSVP verification); CLK-GXP-007: consumer implementation test; ecosystem monitoring adapter validation (cross-ref) |
| Section 12.1      | Physical and logical access controls   | ./10-personnel-and-access-control.md                                                                    | Container graph access control, operational access requirements                                                       | Organizational procedure + IQ-13                           |
| Section 12.4      | Printout of electronically stored data | ./06-audit-trail-integration.md (Serialization)                                                         | ISO 8601 format, JSON serialization schema for printed reports                                                        | DoD 7: #11                                                 |
| Section 13        | Incident management                    | ./07-recovery-procedures.md (FM-1–FM-12), 06/quick-reference.md (Incident Escalation Path), ./03-verification-and-change-control.md (Emergency Change Control, CAPA) | FM-1 through FM-12 recovery procedures with root cause investigation, L1–L4 escalation path with response timeframes, CAPA process (CLK-CHG-014 through CLK-CHG-022) | Organizational procedure (SOPs); FM-1/FM-2 tested in DoD 3, DoD 7 |
| Section 16        | Business continuity                    | ./07-recovery-procedures.md (FM-1–FM-12)                                                                | FM-1 through FM-12 recovery procedures with actionable steps, SOPs                                                    | Organizational procedure; FM-1/FM-2 tested in DoD 3, DoD 7 |

## GAMP 5

| Reference           | Requirement Summary                    | Spec Section(s)                                                                          | Implementation Artifact(s)                                                                     | Validation Test(s)                                         |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Category 5          | Custom software classification         | ./01-clock-source-requirements.md (Risk Classification)                                    | All `@hex-di/clock` source code                                                                | All DoD items                                              |
| Risk Classification | Impact/likelihood/risk per function    | ./01-clock-source-requirements.md (GAMP 5 Risk Classification table)                       | Risk-proportional validation intensity                                                         | IQ/OQ/PQ protocols                                         |
| Appendix M4         | Documented failure/recovery procedures | ./07-recovery-procedures.md (FM-1–FM-12), ./11-fmea-risk-analysis.md | FM-1 through FM-12 procedures (FM-1/FM-2 full; FM-3–FM-6 with immediate operator action steps + ecosystem monitoring adapter cross-ref; FM-7–FM-12 full), FMEA table with RPN action threshold | DoD 3: #11-#23 (startup errors); DoD 7: #15-#17 (overflow) |

## ALCOA+ Principles

| Principle       | Spec Section(s)                                                                                   | Implementation Artifact(s)                                                                                               | Validation Test(s)                                                  |
| --------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Attributable    | ./05-alcoa-mapping.md (Attribution Context), ./01-clock-source-requirements.md (ClockDiagnosticsPort) | `ClockDiagnosticsPort`, `TemporalContext` + consumer attribution                                                         | DoD 6: #1-#12; DoD 8: #3-#6                                         |
| Legible         | ./05-alcoa-mapping.md                                                                               | Standard `number` values in milliseconds                                                                                 | DoD 7: #11 (ISO 8601 conversion)                                    |
| Contemporaneous | ./05-alcoa-mapping.md, 03-sequence-generator.md                                                     | `monotonicNow()` captures at call time; `SequenceGeneratorPort` for ordering                                             | DoD 7: #5-#8; OQ-1 through OQ-4                                     |
| Original        | ./05-alcoa-mapping.md, ./06-audit-trail-integration.md (Self-Contained Record Integrity)              | `Object.freeze()` on all adapters and return values, `computeTemporalContextDigest()` SHA-256 per-record tamper-evidence | IQ-4, IQ-5, IQ-9, IQ-10, IQ-12, IQ-22; DoD 7: #1-#4; DoD 8c: #1-#21 |
| Accurate        | ./05-alcoa-mapping.md, ./04-resolution-and-precision.md                                               | No precision fabrication; best available platform API                                                                    | DoD 3: #5, #7, #8; OQ-2, OQ-4                                       |
| Complete        | ./05-alcoa-mapping.md, 03-sequence-generator.md (Overflow)                                          | Gapless sequences, overflow detection, structural irresettability                                                        | DoD 2: #7-#11; DoD 7: #15-#17; DoD 8: #14-#22                       |
| Consistent      | ./05-alcoa-mapping.md                                                                               | Single `ClockPort` interface across all packages                                                                         | DoD 1: #1-#7                                                        |
| Enduring        | ./05-alcoa-mapping.md, ./06-audit-trail-integration.md (Serialization, Schema Migration Strategy)     | Primitive number values, JSON serialization schema, versioned deserialization utilities                                  | DoD 7: #11; DoD 8b: #1-#19                                          |
| Available       | ./05-alcoa-mapping.md                                                                               | `ClockPort` always available once registered; no external dependencies                                                   | DoD 1: #3-#4                                                        |

## ICH / 21 CFR 211

| Regulatory Clause | Requirement Summary                        | Spec Section(s)                                                                                                                  | Implementation Artifact(s)                                                                                                         | Validation Test(s)                                                                         |
| ----------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 21 CFR 211.68     | Routine calibration of automatic equipment | ./01-clock-source-requirements.md (Calibration and Verification), 04-platform-adapters.md (HardwareClockAdapter HC-1 through HC-7) | Ecosystem periodic NTP drift check, platform NTP daemon; `HardwareClockAdapter` interface for air-gapped calibrated hardware sources | DQ-1, DQ-2 (infrastructure); Ecosystem monitoring adapter validation; Consumer IQ extension for HC contracts |
| 21 CFR 211.180    | Record retention                           | ./05-alcoa-mapping.md (Enduring)                                                                                                   | Consumer retention policy; primitive serializable values                                                                           | Organizational procedure                                                                   |
| ICH Q7 6.5        | Calibration of instruments                 | ./01-clock-source-requirements.md (Calibration)                                                                                    | NTP synchronization, ecosystem drift monitoring                                                                                        | DQ-1, DQ-2                                                                                 |

---

## Formal Requirement ID Mapping

This section maps each formal CLK-prefixed requirement identifier (assigned in revision 1.8) to the spec section containing the requirement, the applicable regulatory clause(s), and the validation test case(s) that verify it. This mapping closes the backward traceability gap between formally identified requirements and the RTM.

| Requirement ID | Requirement Summary | Spec Section | Regulatory Clause(s) | Validation Test(s) |
| --- | --- | --- | --- | --- |
| CLK-MON-001 | SystemClockAdapter MUST use `performance.now()` when available; `Date.now()` fallback only when `performance` is unavailable | 02-clock-port.md §2.2 | 21 CFR 11.10(h), ALCOA+ Contemporaneous | DoD 3: #1-#5; IQ-7 |
| CLK-MON-002 | `Date.now()` fallback MUST enforce monotonicity by clamping to previous value | 02-clock-port.md §2.2 | 21 CFR 11.10(h), ALCOA+ Contemporaneous | DoD 3: #6-#10; OQ-1 |
| CLK-WCK-001 | MUST NOT attempt to detect or compensate for leap seconds | 02-clock-port.md §2.3 | ICH Q7 6.5 | DQ-1 (NTP leap smear verification) |
| CLK-HRS-001 | `highResNow()` MUST fall back to `Date.now()` when `performance.timeOrigin` unavailable; MUST NOT throw | 02-clock-port.md §2.4 | 21 CFR 11.10(h), ALCOA+ Accurate | DoD 3: #7-#8; IQ-8 |
| CLK-HRS-002 | [OPERATIONAL] GxP organizations MUST document process startup sequencing for NTP pre-sync | 02-clock-port.md §2.4 | ALCOA+ Accurate, EU Annex 11 Section 9 | DQ-2 (operational procedure) |
| CLK-HRS-003 | MUST NOT use `process.hrtime.bigint()` or BigInt-returning timing APIs | 02-clock-port.md §2.4 | ALCOA+ Consistent (cross-platform) | DoD 1: #1-#7 (port interface) |
| CLK-SEQ-001 | `next()` MUST be thread-safe within a single JavaScript execution context; no duplicate sequence numbers under microtask interleaving | 03-sequence-generator.md §3.1 | ALCOA+ Complete, 21 CFR 11.10(e) | DoD 2: #1-#6; OQ-3 |
| CLK-SEQ-002 | `SequenceOverflowError` MUST be constructed via factory function and frozen | 03-sequence-generator.md §3.1 | ALCOA+ Original (immutability) | DoD 2: #7; IQ-10 |
| CLK-SEQ-003 | After overflow, generator MUST remain in overflow state permanently; all subsequent `next()` calls MUST return same error | 03-sequence-generator.md §3.1 | ALCOA+ Complete, 21 CFR 11.10(e) | DoD 2: #8-#10; OQ-7 |
| CLK-SEQ-004 | `current()` MUST return `MAX_SAFE_INTEGER` after overflow | 03-sequence-generator.md §3.1 | ALCOA+ Complete | DoD 2: #10 |
| CLK-SEQ-005 | `SequenceOverflowError` MUST include `lastValue` set to `MAX_SAFE_INTEGER` | 03-sequence-generator.md §3.1 | 21 CFR 11.10(e) (audit trail) | DoD 2: #9; IQ-17 |
| CLK-SEQ-006 | GxP consumers MUST configure capacity monitoring thresholds commensurate with deployment criticality | 03-sequence-generator.md §3.1 | 21 CFR 11.10(e), GAMP 5 Category 5 | Consumer CSVP documentation |
| CLK-ORD-001 | `sequenceNumber` MUST be the authoritative ordering mechanism when both sequence and monotonic timestamp are captured | 03-sequence-generator.md §3.2 | ALCOA+ Contemporaneous, 21 CFR 11.10(e) | DoD 7: #5-#8; DoD 8: #7-#8 |
| CLK-MPC-001 | [OPERATIONAL] Horizontally scaled GxP consumers MUST include a process-unique identifier alongside `TemporalContext` | 03-sequence-generator.md §3.3 | ALCOA+ Attributable | Consumer responsibility; PQ-3 (uniqueness) |
| CLK-MPC-002 | Process-unique identifier MUST be captured once at process startup and reused for entire lifetime | 03-sequence-generator.md §3.3 | ALCOA+ Attributable, ALCOA+ Consistent | Consumer responsibility |
| CLK-MPC-003 | MUST use composite key `(processInstanceId, sequenceNumber)` for globally unique event ordering across process lifetimes | 03-sequence-generator.md §3.3 | ALCOA+ Complete, 21 CFR 11.10(e) | Consumer responsibility; PQ-3 |
| CLK-MPC-004 | Process restart events SHOULD be logged in audit trail with new process instance identifier | 03-sequence-generator.md §3.3 | ALCOA+ Complete, 21 CFR 11.10(e) | Consumer responsibility |
| CLK-MPC-005 | [OPERATIONAL] GxP organizations MUST implement and validate audit trail reconstruction procedure | 03-sequence-generator.md §3.3 | ALCOA+ Complete, EU Annex 11 Section 4 | PQ (consumer validation plan) |
| CLK-MPC-006 | [OPERATIONAL] Reconstruction procedure MUST be documented in computerized system validation plan and tested during PQ | 03-sequence-generator.md §3.3 | EU Annex 11 Section 4, GAMP 5 Appendix M4 | PQ (consumer validation plan) |
| CLK-MPC-007 | `createProcessInstanceId()` MUST be exported from main entry point as a first-class utility | 03-sequence-generator.md §3.3 | ALCOA+ Attributable | DoD: process instance tests |
| CLK-MPC-008 | `createProcessInstanceId()` MUST return frozen string; `"unknown"` hostname on non-Node platforms; fallback when `crypto.randomUUID()` unavailable | 03-sequence-generator.md §3.3 | ALCOA+ Attributable, ALCOA+ Complete | DoD: process instance tests |
| CLK-MPC-009 | Returned identifier format MUST be `{hostname}-{startupTimestamp}-{uuid}` as a stable contract | 03-sequence-generator.md §3.3 | ALCOA+ Attributable | DoD: process instance tests |
| CLK-SYS-001 | Platform API references MUST be captured at construction time and stored as closed-over constants | 04-platform-adapters.md §4.1 | 21 CFR 11.10(c), ALCOA+ Original | DoD 3: #1-#5; IQ-4 |
| CLK-SYS-002 | [OPERATIONAL] GxP deployments MUST freeze `Date` and `performance` at application entry point | 04-platform-adapters.md §4.1 | 21 CFR 11.10(c), ALCOA+ Original | IQ-13 (procedural); DoD 7: #18-#19 |
| CLK-SYS-003 | [OPERATIONAL] GxP deployments MUST freeze `@hex-di/clock` module exports at application entry point | 04-platform-adapters.md §4.1 | 21 CFR 11.10(c), ALCOA+ Original | IQ-13 (procedural) |
| CLK-SYS-004 | `createClampedFallback` MUST accept captured `Date.now` reference as parameter | 04-platform-adapters.md §4.1 | 21 CFR 11.10(c) | DoD 3: #6-#10 |
| CLK-SYS-005 | Clamped fallback MUST NOT share mutable state across adapter instances | 04-platform-adapters.md §4.1 | ALCOA+ Original | DoD 3: #6-#10 |
| CLK-SYS-006 | Clamped fallback MUST only be used when `performance` is genuinely unavailable | 04-platform-adapters.md §4.1 | 21 CFR 11.10(h), ALCOA+ Accurate | DoD 3: #1-#5; IQ-7 |
| CLK-SYS-007 | Returned adapter object MUST be frozen with `Object.freeze()` | 04-platform-adapters.md §4.1 | 21 CFR 11.10(c), ALCOA+ Original | IQ-4, IQ-5; DoD 7: #1-#4 |
| CLK-SYS-008 | `SystemSequenceGenerator` MUST NOT have `reset()` method | 04-platform-adapters.md §4.1 | 21 CFR 11.10(d), ALCOA+ Complete | IQ-6; DoD 2: #11-#15 |
| CLK-SYS-009 | `createSystemClock()` MUST perform startup self-test (ST-1 through ST-5) | 04-platform-adapters.md §4.2 | 21 CFR 11.10(h) | DoD 3: #11-#23; IQ-14, IQ-15, IQ-16, IQ-19 |
| CLK-SYS-010 | `ClockStartupError` MUST be frozen at construction | 04-platform-adapters.md §4.2 | 21 CFR 11.10(e), ALCOA+ Original | DoD 3: #19-#23; IQ-16 |
| CLK-SYS-011 | Self-test MUST be synchronous (no async, no I/O) | 04-platform-adapters.md §4.2 | 21 CFR 11.10(h) | DoD 3: #11-#23 |
| CLK-SYS-012 | `createClockStartupError` factory function MUST be exported | 04-platform-adapters.md §4.2 | GAMP 5 Category 5 | DoD 3: #29-#32 |
| CLK-SYS-013 | [OPERATIONAL] GxP consumers MUST pass `{ gxp: true }` to `createSystemClock()` | 04-platform-adapters.md §4.2 | 21 CFR 11.10(h), EU Annex 11 Section 9 | OQ-6; DoD 3: #24-#28 |
| CLK-SYS-014 | Detection MUST NOT use try/catch for control flow | 04-platform-adapters.md §4.1 | ALCOA+ Accurate | DoD 3: #1-#5 |
| CLK-SYS-015 | Detection MUST run once at construction time, not per call | 04-platform-adapters.md §4.1 | ALCOA+ Consistent | DoD 3: #1-#5 |
| CLK-SYS-016 | GxP organizations MUST select suitable platform for deployment | 04-platform-adapters.md §4.1 | EU Annex 11 Section 9 | DQ-1, DQ-2 (procedural) |
| CLK-SYS-017 | GxP organizations SHOULD implement periodic performance degradation checks | 04-platform-adapters.md §4.2 | EU Annex 11 Section 11, GAMP 5 | DoD 24 (capabilities) |
| CLK-SYS-018 | Concrete HardwareClockAdapter implementations MUST satisfy HC-1 through HC-7 | 04-platform-adapters.md §4.3 | 21 CFR 211.68, ICH Q7 6.5 | Consumer IQ extension |
| CLK-SYS-019 | [OPERATIONAL] GxP organizations MUST include hardware clock in calibration procedures | 04-platform-adapters.md §4.3 | 21 CFR 211.68 | DQ (procedural) |
| CLK-SYS-020 | Package MUST NOT circumvent browser timer coarsening | 04-platform-adapters.md §4.1 | ALCOA+ Accurate | DoD 3: #1-#5 |
| CLK-SYS-021 | All ecosystem packages SHOULD record sequence number alongside wall-clock timestamps | 04-platform-adapters.md §4.1 | ALCOA+ Complete, 21 CFR 11.10(e) | Consumer responsibility |
| CLK-SYS-022 | Adapter overhead MUST be < 100ns per call | 04-platform-adapters.md §4.1 | ALCOA+ Contemporaneous | PQ-1 |
| CLK-SYS-023 | PQ-1 MUST verify overhead budgets on deployment target hardware | 04-platform-adapters.md §4.1 | GAMP 5 Category 5 | PQ-1 |
| CLK-SYS-024 | `HardwareClockAdapter` types MUST be exported from package | 04-platform-adapters.md §4.3 | GAMP 5 Category 5 | DoD 16 |
| CLK-GXP-001 | GxP organizations MUST include GAMP 5 risk classification in computerized system validation plan | ./01-clock-source-requirements.md §6.1 | GAMP 5 Category 5 | Organizational procedure |
| CLK-GXP-002 | `@hex-di/clock` MUST NOT import or reference any ecosystem monitoring library | ./01-clock-source-requirements.md §6.1 | GAMP 5 (architecture) | DoD 1: #1-#7 |
| CLK-GXP-003 | `createSystemClock()` MUST return `ClockDiagnosticsPort`-compatible diagnostics | ./01-clock-source-requirements.md §6.1 | 21 CFR 11.10(e), ALCOA+ Attributable | DoD 6: #1-#12; IQ-1, IQ-2 |
| CLK-GXP-004 | Replacement adapters MUST register their own `ClockDiagnosticsPort` implementation | ./01-clock-source-requirements.md §6.1 | 21 CFR 11.10(e), ALCOA+ Attributable | DoD 12: #6-#8 |
| CLK-GXP-005 | GxP organizations MUST document NTP configuration in validation plan | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 9, ICH Q7 6.5 | DQ-1, DQ-2 (procedural) |
| CLK-GXP-006 | GxP organizations MUST verify periodic clock evaluation mechanism exists before claiming Annex 11 Section 11 compliance | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 11 | Organizational procedure (CSVP verification) |
| CLK-GXP-007 | When no ecosystem monitoring adapter is deployed, consumers MUST implement minimum viable periodic evaluation via ClockDiagnosticsPort | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 11 | Consumer implementation test |
| CLK-GXP-008 | [OPERATIONAL] When ecosystem monitoring adapter is not co-deployed, consuming application MUST implement compensating controls for FM-3 through FM-6 detection, documented in CSVP with QA risk acceptance | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 11, 21 CFR 11.10(h) | Consumer validation plan (procedural) |
| CLK-GXP-003a | `ClockDiagnostics.cryptoFipsMode` MUST detect FIPS mode via `crypto.getFips()` on Node.js; `undefined` on other platforms | ./01-clock-source-requirements.md §6.1 | FIPS 140-2/140-3, 21 CFR 11.10(c) | DoD 6: diagnostics tests |
| CLK-GXP-007a | `setupPeriodicClockEvaluation()` MUST be exported from main entry point | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 11 | DoD: periodic evaluation tests |
| CLK-GXP-007b | Minimum recommended `intervalMs` for GxP deployments is 60,000ms (60 seconds) | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 11 | Consumer documentation |
| CLK-GXP-007c | Each periodic evaluation cycle MUST log its result with `TemporalContext` timestamp | ./01-clock-source-requirements.md §6.1 | EU Annex 11 Section 11, ALCOA+ Contemporaneous | Consumer implementation |
| CLK-GXP-009 | [OPERATIONAL] NTP configuration MUST be documented as part of Deployment Qualification (DQ) evidence, including daemon type/version, server addresses, drift thresholds, and leap second handling | compliance/gxp.md §6.1 | EU Annex 11 Section 9, 21 CFR 11.10(e) | DQ evidence (procedural) |
| CLK-GXP-010 | [OPERATIONAL] When continuous monitoring is deployed, monitoring adapter MUST emit structured log events with TemporalContext, check type, and result for each check execution | compliance/gxp.md §6.1 | EU Annex 11 Section 11, ALCOA+ Contemporaneous | Consumer implementation (procedural) |
| CLK-GXP-011 | [OPERATIONAL] Monitoring configuration (check intervals, alert thresholds, alert channels) MUST be documented in CSVP and treated as re-qualification trigger when modified | compliance/gxp.md §6.1 | EU Annex 11 Section 11, GAMP 5 | CSVP documentation (procedural) |
| CLK-GXP-012 | [OPERATIONAL] GxP organizations MUST review security control matrix as part of initial deployment qualification and document supplementary controls in CSVP | compliance/gxp.md §6.1 | EU Annex 11 Section 4, 21 CFR 11.10(c) | CSVP documentation (procedural) |
| CLK-QUA-001 | IQ protocol MUST be executed on each deployment target | ./02-qualification-protocols.md §6.2 | 21 CFR 11.10(a), GAMP 5 Category 5 | IQ-1 through IQ-30 |
| CLK-QUA-002 | IQ automated test suite MUST be organized as single Vitest suite | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | IQ-1 through IQ-30 |
| CLK-QUA-003 | IQ-13 MUST produce evidence artifact for QA review | ./02-qualification-protocols.md §6.2 | 21 CFR 11.10(c), EU Annex 11 Section 12.1 | IQ-13 |
| CLK-QUA-004 | OQ protocol MUST be executed after IQ passes | ./02-qualification-protocols.md §6.2 | 21 CFR 11.10(a), GAMP 5 Category 5 | OQ-1 through OQ-8 |
| CLK-QUA-005 | OQ automated test suite MUST be organized as single Vitest suite | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | OQ-1 through OQ-8 |
| CLK-QUA-006 | PQ protocol MUST be executed on production-representative hardware | ./02-qualification-protocols.md §6.2 | 21 CFR 11.10(a), GAMP 5 Category 5 | PQ-1 through PQ-5 |
| CLK-QUA-007 | PQ MUST NOT run in CI/CD pipeline | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | Procedural |
| CLK-QUA-008 | PQ thresholds MUST be configurable per deployment target | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | PQ-1 through PQ-5 |
| CLK-QUA-009 | PQ parameters MUST be documented in deployment qualification record | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 4 | DQ (procedural) |
| CLK-QUA-010 | PQ MUST execute on deployment target hardware, not CI | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | PQ-1 through PQ-5 |
| CLK-QUA-011 | Staging environment MUST produce qualification evidence | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 4 | DQ (procedural) |
| CLK-QUA-012 | PQ test suite MUST be organized as single Vitest suite | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | PQ-1 through PQ-5 |
| CLK-QUA-013 | DQ checklist MUST be executed for each deployment | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 10 | DQ-1 through DQ-5 |
| CLK-QUA-014 | CI/CD pipeline MUST run IQ and OQ on every commit | ./02-qualification-protocols.md §6.2 | GAMP 5 Category 5 | CI/CD automated |
| CLK-QUA-015 | Each DQ step execution MUST produce defined evidence artifacts and be retained in the validation plan | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 4, GAMP 5 | DQ-1 through DQ-5 |
| CLK-QUA-016 | GxP organizations MUST create and maintain a CSVP addressing 12 minimum content areas | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 4 | Organizational procedure (CSVP creation and maintenance) |
| CLK-QUA-017 | PQ environment variables MUST be validated at PQ test suite startup; invalid values MUST abort the suite without falling back to defaults | ./02-qualification-protocols.md §6.2 | 21 CFR 11.10(h), GAMP 5 Category 5 | DoD PQ suite startup validation |
| CLK-QUA-018 | GxP deployment approval MUST require documented evidence that FM-3, FM-4, FM-5, and FM-6 are addressed by validated ecosystem monitoring adapter or validated CLK-GXP-008 compensating controls | ./02-qualification-protocols.md §6.2 | EU Annex 11 Section 11, 21 CFR 11.10(h), GAMP 5 Category 5 | Organizational procedure (deployment approval record) |
| CLK-AUD-001 | `TemporalContext` returned by factory MUST be frozen | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 8: #1-#6; IQ-9 |
| CLK-AUD-002 | `OverflowTemporalContext` returned by `createOverflowContext()` MUST be frozen | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 8: #14-#22; IQ-12 |
| CLK-AUD-003 | Per-record SHA-256 digest MUST be persisted alongside `TemporalContext` | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c) | DoD 8c: #1-#21; IQ-22 |
| CLK-AUD-004 | `computeTemporalContextDigest()` MUST use deterministic JSON serialization | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 8c: #1-#10 |
| CLK-AUD-005 | `verifyTemporalContextDigest()` MUST use constant-time comparison | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c) | DoD 8c: #17 |
| CLK-AUD-006 | Capture ordering: `next()` → `monotonicNow()` → `wallClockNow()` | ./06-audit-trail-integration.md §6.6 | ALCOA+ Contemporaneous | DoD 8: #7-#8 |
| CLK-AUD-007 | Factory MUST propagate `SequenceOverflowError` as `err()` Result | ./06-audit-trail-integration.md §6.6 | ALCOA+ Complete, 21 CFR 11.10(e) | DoD 7: #15-#17; OQ-7 |
| CLK-AUD-008 | `createOverflowContext()` MUST be called when overflow detected | ./06-audit-trail-integration.md §6.6 | ALCOA+ Complete | DoD 8: #14-#22 |
| CLK-AUD-009 | Overflow context MUST preserve monotonic and wall-clock timestamps | ./06-audit-trail-integration.md §6.6 | ALCOA+ Complete | DoD 8: #14-#22 |
| CLK-AUD-010 | Sequence number is authoritative ordering mechanism | ./06-audit-trail-integration.md §6.6 | ALCOA+ Contemporaneous, 21 CFR 11.10(e) | DoD 7: #5-#8 |
| CLK-AUD-011 | Monotonic timestamp used only as tiebreaker | ./06-audit-trail-integration.md §6.6 | ALCOA+ Contemporaneous | DoD 7: #5-#8 |
| CLK-AUD-012 | Wall-clock used only for human display and regulatory reporting | ./06-audit-trail-integration.md §6.6 | ALCOA+ Legible | DoD 7: #11 |
| CLK-AUD-013 | Ecosystem monitoring infrastructure provides NTP validation | ./06-audit-trail-integration.md §6.6 | EU Annex 11 Section 9 | Cross-ref (ecosystem) |
| CLK-AUD-014 | External timestamps MUST use ISO 8601 UTC format | ./06-audit-trail-integration.md §6.6 | EU Annex 11 Section 7, ALCOA+ Legible | DoD 7: #11 |
| CLK-AUD-015 | Schema version field MUST be included in serialized `TemporalContext` | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring | DoD 8b: #1-#5 |
| CLK-AUD-016 | Deserialization utilities MUST validate schema version | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring, 21 CFR 11.10(b) | DoD 8b: #6-#12; IQ-20 |
| CLK-AUD-017 | `deserializeTemporalContext()` MUST be exported | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(b) | DoD 8b: #1-#12 |
| CLK-AUD-018 | `deserializeOverflowTemporalContext()` MUST be exported | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(b) | DoD 8b: #13-#16 |
| CLK-AUD-019 | `deserializeClockDiagnostics()` MUST be exported | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(b) | DoD 8b: #17-#19 |
| CLK-AUD-020 | Deserialization MUST return `Result` type | ./06-audit-trail-integration.md §6.6 | ALCOA+ Accurate | DoD 8b: #1-#19 |
| CLK-AUD-021 | Unknown schema versions MUST return `err()` | ./06-audit-trail-integration.md §6.6 | ALCOA+ Accurate | DoD 8b: #6-#12 |
| CLK-AUD-022 | Printed reports MUST include ISO 8601 UTC timestamps | ./06-audit-trail-integration.md §6.6 | EU Annex 11 Section 12.4 | DoD 7: #11 |
| CLK-AUD-023 | Data retention MUST use primitive serializable values | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring, 21 CFR 211.180 | DoD 7: #11; DoD 8b |
| CLK-AUD-024 | `computeOverflowTemporalContextDigest()` MUST be exported | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c) | DoD 8c: #18-#21 |
| CLK-AUD-025 | Digest functions MUST accept only frozen objects | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 8c: #1-#21 |
| CLK-AUD-026 | Schema migration strategy MUST support forward-compatible evolution | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring | DoD 8b: #1-#19 |
| CLK-AUD-027 | New schema fields MUST use additive-only changes | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring | DoD 8b: #1-#19 |
| CLK-AUD-028 | Removing or renaming fields MUST require new schema version | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring | DoD 8b: #1-#19 |
| CLK-AUD-029 | `RetentionMetadata`, `RetentionValidationError`, `validateRetentionMetadata()`, `calculateRetentionExpiryDate()` MUST be exported from main entry point | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180, EU Annex 11 Section 17 | DoD: retention utility tests |
| CLK-AUD-030 | GxP consumers SHOULD compose `RetentionMetadata` with `TemporalContext` when persisting | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180 | Consumer responsibility |
| CLK-AUD-031 | GxP consumers SHOULD call `validateRetentionMetadata()` before persisting | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180 | Consumer responsibility |
| CLK-AUD-031a | `RetentionPolicyPort` MUST be exported from main entry point as a port definition | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180, EU Annex 11 Section 17 | DoD: retention policy port tests |
| CLK-AUD-031b | GxP consumers MUST register `RetentionPolicyPort`; `createSystemClockAdapter({ gxp: true })` SHOULD warn if not registered | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180, EU Annex 11 Section 17 | DoD: GxP mode startup tests |
| CLK-AUD-031c | `RetentionPolicyPort` is advisory; absence does NOT block `TemporalContextFactory.create()` | ./06-audit-trail-integration.md §6.6 | 21 CFR 211.180 | DoD: retention policy port tests |
| CLK-AUD-032 | GxP organizations MUST define audit trail review procedures in SOPs | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(e), EU Annex 11 Section 9 | Organizational procedure |
| CLK-AUD-033 | GxP organizations MUST designate qualified personnel for audit trail reviews | ./06-audit-trail-integration.md §6.6 | 21 CFR 11.10(e), EU Annex 11 Section 9 | Organizational procedure |
| CLK-AUD-034 | Data migration MUST follow documented migration plan with pre/post validation | ./06-audit-trail-integration.md §6.6 | ALCOA+ Enduring, 21 CFR 11.10(b) | Organizational procedure |
| CLK-AUD-035 | Data migrations MUST be approved through change control process | ./06-audit-trail-integration.md §6.6 | EU Annex 11 Section 10 | Organizational procedure |
| CLK-AUD-036 | GxP consumers MUST implement periodic audit verifying persisted `TemporalContext` records have `RetentionMetadata` attached | ./08-requirements-traceability-matrix.md §Consumer Diagnostic Integration | ALCOA+ Enduring, 21 CFR 211.180, EU Annex 11 Section 17 | Consumer OQ protocol |
| CLK-CHG-001 | `@hex-di/clock` version MUST be pinned with exact version in lockfile | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2), EU Annex 11 Section 10 | DQ-1 |
| CLK-CHG-002 | Version upgrades MUST require documented QA approval (including current/target version, changelog review, approver signature) | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | DQ (procedural) |
| CLK-CHG-003 | Full IQ/OQ/PQ MUST be re-executed after any version upgrade; re-qualification triggers enumerated | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(a), EU Annex 11 Section 10 | IQ/OQ/PQ re-execution |
| CLK-CHG-004 | Configuration management MUST record validated version, deployment targets, and last qualification date | ./03-verification-and-change-control.md §6.3 | EU Annex 11 Section 10 | DQ (procedural) |
| CLK-CHG-005 | Emergency change determination MUST be documented with written justification | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-006 | Emergency approval MUST be granted by QA Manager or pre-designated delegate | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-007 | Emergency approval record MUST include justification, versions, defect description, impact assessment, signature | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-008 | Emergency risk acceptance statement MUST document validation gaps, interim mitigations, maximum duration, fallback plan | ./03-verification-and-change-control.md §6.3 | ICH Q9, GAMP 5 | Procedural |
| CLK-CHG-009 | Emergency changes MUST pass full IQ + abbreviated OQ before production deployment | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(a) | Expedited IQ + abbreviated OQ |
| CLK-CHG-010 | Retrospective full IQ/OQ/PQ MUST be completed within 30 calendar days of emergency deployment | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(a), GAMP 5 | IQ/OQ/PQ re-execution |
| CLK-CHG-011 | Retrospective qualification MUST use standard (non-abbreviated) IQ/OQ/PQ protocols | ./03-verification-and-change-control.md §6.3 | GAMP 5 Category 5 | IQ/OQ/PQ |
| CLK-CHG-012 | Rollback verification MUST include full IQ, abbreviated OQ, QA approval, data assessment, post-rollback monitoring | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2), 21 CFR 11.10(a) | IQ/OQ/PQ re-execution |
| CLK-CHG-013 | Rollback verification evidence MUST be retained as part of emergency change record | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(e) | Procedural |
| CLK-CHG-014 | Post-emergency review MUST be completed within 14 calendar days | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2), EU Annex 11 Section 10 | Procedural |
| CLK-CHG-015 | Post-emergency review record MUST be retained | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-016 | CAPA closeout criteria MUST ALL be satisfied before closure | ./03-verification-and-change-control.md §6.3 | ICH Q10, 21 CFR 211.192 | Procedural |
| CLK-CHG-017 | CAPA owner CANNOT self-approve closeout; independent QA Reviewer required | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-018 | CAPAs MUST be closed within 90 calendar days; extensions require QA Manager approval | ./03-verification-and-change-control.md §6.3 | EU Annex 11 Section 10 | Procedural |
| CLK-CHG-019 | Closed CAPA records MUST be retained for audit trail retention duration | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(e), ALCOA+ Enduring | Procedural |
| CLK-CHG-020 | FMEA risk analysis MUST be reviewed and updated as part of CAPA closeout | ./03-verification-and-change-control.md §6.3 | ICH Q9, GAMP 5 | Procedural |
| CLK-CHG-021 | CAPA record template MAY be adapted but MUST retain all mandatory fields | ./03-verification-and-change-control.md §6.3 | 21 CFR 11.10(k)(2) | Procedural |
| CLK-CHG-022 | Each CAPA record MUST be stored under configuration control with full change history | ./03-verification-and-change-control.md §6.3 | EU Annex 11 Section 10 | Procedural |
| CLK-INT-001 | `ClockSourceChangedEvent` MUST be emitted when `ClockPort` adapter is overridden | 07-integration.md §7.1 | 21 CFR 11.10(e) | DoD 13: #1-#9 |
| CLK-INT-002 | Ecosystem adapters MUST resolve `ClockSourceChangedSinkPort` and emit event before override | 07-integration.md §7.1 | 21 CFR 11.10(e) | DoD 13: #1-#9 |
| CLK-INT-003 | `createSystemClockAdapter({ gxp: true })` without sink MUST log warning to stderr | 07-integration.md §7.1 | 21 CFR 11.10(e) | DoD 12: #6-#8 |
| CLK-INT-004 | Ecosystem libraries integrating with clock MUST document their protocols | 07-integration.md §7.3 | GAMP 5 Category 5, EU Annex 11 Section 5 | Cross-ref (ecosystem) |
| CLK-PAC-001 | GxP organizations MUST define and document clock-related personnel roles | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-002 | All personnel MUST receive documented training before GxP activities | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3, 21 CFR 11.10(i) | Procedural |
| CLK-PAC-003 | GxP organizations MUST define and enforce re-training schedule | ./10-personnel-and-access-control.md §6.10 | 21 CFR 211.25, EU Annex 11 Section 3 | Procedural |
| CLK-PAC-004 | Re-training MUST be documented with date, topic, trainer, trainee, outcome, next due date | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-005 | Training expiration tracking MUST prevent expired personnel from GxP activities | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-006 | Re-training records MUST be retained for validation plan duration | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3, 21 CFR 211.180 | Procedural |
| CLK-PAC-007 | Each training session MUST conclude with competency assessment | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-008 | Minimum competency criteria MUST be defined per role | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-009 | Competency assessment records MUST document assessor, criteria, outcome | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-010 | Competency assessments MUST be performed by qualified person (no self-assessment) | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3 | Procedural |
| CLK-PAC-011 | Modification of clock port registrations MUST be restricted to authorized code paths | ./10-personnel-and-access-control.md §6.10 | 21 CFR 11.10(d), EU Annex 11 Section 12.1 | IQ-13; DoD 12 |
| CLK-PAC-012 | NTP configuration modification MUST follow change control procedures | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 10, 21 CFR 11.10(k)(2) | DQ (procedural) |
| CLK-PAC-013 | Platform API freeze calls MUST be reviewed in deployment qualification | ./10-personnel-and-access-control.md §6.10 | 21 CFR 11.10(c) | IQ-13; DQ |
| CLK-PAC-014 | Version upgrades MUST require documented QA approval before deployment | ./10-personnel-and-access-control.md §6.10 | 21 CFR 11.10(k)(2) | DQ (procedural) |
| CLK-PAC-015 | Version rollback MUST revert to validated version and re-execute IQ/OQ/PQ | ./10-personnel-and-access-control.md §6.10 | 21 CFR 11.10(a), 21 CFR 11.10(k)(2) | IQ/OQ/PQ re-execution |
| CLK-PAC-016 | Audit trail records from failed upgrade period MUST NOT be deleted | ./10-personnel-and-access-control.md §6.10 | 21 CFR 11.10(e), ALCOA+ Complete | Procedural |
| CLK-PAC-017 | QA Manager role MUST be defined with responsibilities (emergency change authorization, CAPA extension approval, L4 escalation authority) and required qualifications | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3, 21 CFR 11.10(k)(2) | Procedural |
| CLK-SIG-001 | Temporal consistency checks MUST be implemented with 24-hour retrospective threshold and 5-minute future threshold; thresholds MUST NOT be configurable at library level | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50, ALCOA+ Contemporaneous | DoD 8a: #11-#14 |
| CLK-SIG-002 | Attribution context MUST include signer identity when electronic signatures are used | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50, ALCOA+ Attributable | DoD 8a: #1-#6 |
| CLK-SIG-003 | Signature MUST be bound to `TemporalContext` at creation time | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50, 21 CFR 11.70 | DoD 8a: #7-#10 |
| CLK-SIG-004 | `SignableTemporalContext` extension interface MUST be exported | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50 | DoD 8a: #15-#16 |
| CLK-SIG-005 | Consumer identity management MUST enforce uniqueness controls | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.100 | Consumer responsibility |
| CLK-SIG-006 | `signerId` registry MUST prevent duplicate signer identifiers | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.100 | Consumer responsibility |
| CLK-SIG-007 | `validateSignableTemporalContext()` MUST be exported as runtime enforcement utility | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50 | DoD 8a: #11-#14 |
| CLK-SIG-008 | `SignatureValidationError` MUST be frozen at construction | ./05-alcoa-mapping.md §6.5 | ALCOA+ Original | DoD 8a: #11-#14 |
| CLK-SIG-009 | `validateSignableTemporalContext()` MUST be called before persisting signed records | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50 | DoD 8a: #11-#14 |
| CLK-SIG-010 | Persistence layer MUST reject `SignableTemporalContext` that fails validation | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.50, ALCOA+ Accurate | Consumer responsibility |
| CLK-SIG-011 | Multi-timezone display MUST NOT alter stored UTC values | ./05-alcoa-mapping.md §6.5 | ALCOA+ Original, EU Annex 11 Section 9 | DoD 7: #11 |
| CLK-SIG-012 | Data archival MUST preserve all temporal context fields | ./05-alcoa-mapping.md §6.5 | ALCOA+ Enduring, 21 CFR 211.180 | Organizational procedure |
| CLK-SIG-013 | Archived records MUST remain readable throughout retention period | ./05-alcoa-mapping.md §6.5 | ALCOA+ Enduring, ALCOA+ Available | Organizational procedure |
| CLK-SIG-014 | Record immutability MUST be enforced for persisted `TemporalContext` | ./05-alcoa-mapping.md §6.5 | ALCOA+ Original, 21 CFR 11.10(c) | Consumer responsibility |
| CLK-SIG-015 | Migration between schema versions MUST preserve temporal integrity | ./05-alcoa-mapping.md §6.5 | ALCOA+ Enduring, ALCOA+ Accurate | DoD 8b: #1-#19 |
| CLK-SIG-016 | When multiple regulatory retention periods apply, the longest MUST govern; rationale MUST be documented | ./05-alcoa-mapping.md §6.5 | 21 CFR 211.180, 21 CFR Part 820, ALCOA+ Enduring | Procedural |
| CLK-SIG-017 | `validateSignableTemporalContext()` MUST be called before persistence AND after deserialization to verify signature binding round-trip | ./05-alcoa-mapping.md §6.5 | 21 CFR 11.70, ALCOA+ Original | Consumer responsibility |
| CLK-SIG-018 | Multi-timezone GxP deployments SHOULD populate `SignableTemporalContext.localTimezoneOffsetMinutes` with UTC offset of the site where the event occurred | ./05-alcoa-mapping.md §6.5 | ALCOA+ Legible, EU Annex 11 Section 7 | Consumer responsibility |
| CLK-PAC-018 | GxP organizations MUST enforce segregation of duties: QA Reviewer MUST NOT be the change author; GxP Validation Engineer SHOULD NOT be the code implementer | ./10-personnel-and-access-control.md §6.10 | EU Annex 11 Section 3, 21 CFR 11.10(j) | Procedural |
| CLK-BRD-001 | Branding utility functions (`asMonotonic`, `asWallClock`, `asHighRes`) MUST be identity at runtime | 02-clock-port.md §2.5 | ALCOA+ Accurate (no value distortion) | DoD 17: #1-#7 |
| CLK-BRD-002 | `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp` MUST be exported as type aliases | 02-clock-port.md §2.5 | GAMP 5 Category 5 | DoD 17: #8-#10 |
| CLK-BRD-003 | `asMonotonic`, `asWallClock`, `asHighRes` MUST be exported as value-level functions | 02-clock-port.md §2.5 | GAMP 5 Category 5 | DoD 17: #8-#10 |
| CLK-BRD-004 | Arithmetic on branded timestamps MUST produce `number`, not a branded type | 02-clock-port.md §2.5 | ALCOA+ Accurate | DoD 17: #11-#14 |
| CLK-BRD-005 | Cross-domain branded type assignment MUST be a compile-time error | 02-clock-port.md §2.5 | ALCOA+ Accurate (type safety) | DoD 17: #15-#20 |
| CLK-BRD-006 | Branded timestamp to `number` assignment MUST compile successfully (covariant widening) | 02-clock-port.md §2.5 | ALCOA+ Consistent | DoD 17: #21-#23 |
| CLK-BRD-007 | `asMonotonicValidated`, `asWallClockValidated`, `asHighResValidated` MUST be exported from main entry point | 02-clock-port.md §2.5 | ALCOA+ Accurate | DoD: validated branding tests |
| CLK-BRD-008 | Validated branding utilities MUST return `Result<BrandedType, BrandingValidationError>`, never throw | 02-clock-port.md §2.5 | ALCOA+ Accurate, 21 CFR 11.10(h) | DoD: validated branding tests |
| CLK-BRD-009 | Validated branding utilities are for development/testing/deserialization; production hot paths SHOULD use zero-cost identity functions | 02-clock-port.md §2.5 | ALCOA+ Accurate | Documentation |
| CLK-TMR-001 | `TimerHandle` MUST be frozen with `_tag: "TimerHandle"` and numeric `id` | 02-clock-port.md §2.6 | ALCOA+ Original (immutability) | DoD 18: #1-#2 |
| CLK-TMR-002 | `setTimeout` MUST NOT throw for valid inputs; MUST throw `TypeError` for invalid inputs | 02-clock-port.md §2.6 | 21 CFR 11.10(h) | DoD 18: #3-#4; DoD 19: #1-#3 |
| CLK-TMR-003 | `setInterval` MUST throw `TypeError` for zero, negative, NaN, or Infinity `ms` | 02-clock-port.md §2.6 | 21 CFR 11.10(h) | DoD 18: #5; DoD 19: #4-#5 |
| CLK-TMR-004 | `clearTimeout` and `clearInterval` MUST be idempotent | 02-clock-port.md §2.6 | ALCOA+ Consistent | DoD 18: #6; DoD 19: #6 |
| CLK-TMR-005 | `sleep` MUST use the port's own `setTimeout`, not platform `setTimeout` | 02-clock-port.md §2.6 | ALCOA+ Contemporaneous | DoD 18: #7; DoD 19: #7-#8 |
| CLK-TMR-006 | `TimerSchedulerPort` MUST be exported from main entry point | 02-clock-port.md §2.6 | GAMP 5 Category 5 | DoD 18: #1 |
| CLK-TMR-007 | `createSystemTimerScheduler()` MUST capture platform timer APIs at construction time | 04-platform-adapters.md §4.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 18: #1-#7 |
| CLK-TMR-008 | Returned `TimerSchedulerPort` object MUST be frozen | 04-platform-adapters.md §4.6 | 21 CFR 11.10(c), ALCOA+ Original | DoD 18: #1 |
| CLK-TMR-009 | Each `TimerHandle` MUST be frozen at creation | 04-platform-adapters.md §4.6 | ALCOA+ Original | DoD 18: #2 |
| CLK-TMR-010 | `createSystemTimerScheduler` MUST be exported from main entry point | 04-platform-adapters.md §4.6 | GAMP 5 Category 5 | DoD 18: #1 |
| CLK-TMR-011 | Virtual clock advance MUST fire pending timers in chronological order (FIFO for ties) | 05-testing-support.md §5.4 | ALCOA+ Contemporaneous | DoD 20: #1-#8 |
| CLK-TMR-012 | `setInterval` MUST fire for each interval within advanced range | 05-testing-support.md §5.4 | ALCOA+ Complete | DoD 20: #9-#16 |
| CLK-ADV-001 | `setAutoAdvance` MUST throw `TypeError` for negative, NaN, or Infinity | 05-testing-support.md §5.1 | 21 CFR 11.10(h) | DoD 4: #ext1-#ext3 |
| CLK-ADV-002 | `setAutoAdvance(0)` MUST disable auto-advance | 05-testing-support.md §5.1 | ALCOA+ Consistent | DoD 4: #ext4-#ext5 |
| CLK-ADV-003 | `getAutoAdvance()` MUST return most recently set value | 05-testing-support.md §5.1 | ALCOA+ Accurate | DoD 4: #ext6 |
| CLK-ADV-004 | Auto-advance MUST produce same results as manual `advance()` | 05-testing-support.md §5.1 | ALCOA+ Consistent | DoD 4: #ext7-#ext9 |
| CLK-ADV-005 | Auto-advance construction option MUST be validated at construction time | 05-testing-support.md §5.1 | 21 CFR 11.10(h) | DoD 4: #ext10-#ext11 |
| CLK-WSY-001 | `blockUntil` MUST resolve immediately if condition already met | 05-testing-support.md §5.4 | ALCOA+ Contemporaneous | DoD 20: #ext1-#ext2 |
| CLK-WSY-002 | `blockUntil` MUST reject with `ClockTimeoutError` on timeout | 05-testing-support.md §5.4 | 21 CFR 11.10(h) | DoD 20: #ext3-#ext5 |
| CLK-WSY-003 | `blockUntil` MUST NOT advance virtual time | 05-testing-support.md §5.4 | ALCOA+ Accurate | DoD 20: #ext6-#ext7 |
| CLK-WSY-004 | `ClockTimeoutError` MUST be exported from `@hex-di/clock/testing` | 05-testing-support.md §5.4 | GAMP 5 Category 5 | DoD 20: #ext8-#ext9 |
| CLK-CAC-001 | `CachedClockPort` MUST NOT be structurally assignable to `ClockPort` | 02-clock-port.md §2.7 | ALCOA+ Contemporaneous (audit safety) | DoD 23: #1-#3 |
| CLK-CAC-002 | `CachedClockPort` MUST NOT include `highResNow()` or `recentHighResNow()` | 02-clock-port.md §2.7 | ALCOA+ Accurate | DoD 23: #4 |
| CLK-CAC-003 | `CachedClockPort`, `CachedClockLifecycle`, `CachedClockAdapter` MUST be exported | 02-clock-port.md §2.7 | GAMP 5 Category 5 | DoD 21: #1 |
| CLK-CAC-004 | `recentMonotonicNow()` and `recentWallClockNow()` MUST return branded types | 02-clock-port.md §2.7 | ALCOA+ Accurate | DoD 21: #2; DoD 23: #5 |
| CLK-CAC-005 | Cached clock MUST NOT be used for audit trail timestamps | 02-clock-port.md §2.7 | ALCOA+ Contemporaneous, 21 CFR 11.10(e) | FM-10 (FMEA); DoD 23: #1-#3 |
| CLK-CAC-006 | `createCachedClock` MUST accept `ClockPort` as source, not `CachedClockPort` | 04-platform-adapters.md §4.7 | ALCOA+ Accurate | DoD 21: #3 |
| CLK-CAC-007 | `updateIntervalMs` MUST default to 1; invalid values MUST throw `TypeError` | 04-platform-adapters.md §4.7 | 21 CFR 11.10(h) | DoD 21: #4-#5 |
| CLK-CAC-008 | Cached clock MUST perform one synchronous source read at construction time | 04-platform-adapters.md §4.7 | ALCOA+ Available | DoD 22: #1-#3 |
| CLK-CAC-009 | `CachedClockAdapter` MUST be frozen | 04-platform-adapters.md §4.7 | ALCOA+ Original | DoD 22: #4 |
| CLK-CAC-010 | `createCachedClock` MUST be exported from main entry point | 04-platform-adapters.md §4.7 | GAMP 5 Category 5 | DoD 21: #1 |
| CLK-INT-005 | `SystemTimerSchedulerAdapter` MUST be exported from main entry point | 07-integration.md §7.4 | GAMP 5 Category 5 | DoD 18: #1 |
| CLK-INT-006 | `SystemCachedClockAdapter` MUST be exported from main entry point | 07-integration.md §7.5 | GAMP 5 Category 5 | DoD 21: #1 |
| CLK-INT-007 | `SystemCachedClockAdapter` factory MUST call `start()` on created adapter | 07-integration.md §7.5 | ALCOA+ Available | DoD 22: #5-#7 |
| CLK-INT-008 | `EdgeRuntimeClockAdapter` MUST be exported from main entry point | 07-integration.md §7.6 | GAMP 5 Category 5 | DoD 25: #1 |
| CLK-INT-009 | `EdgeRuntimeClockAdapter` MUST propagate `ClockStartupError` if factory returns `err()` | 07-integration.md §7.6 | 21 CFR 11.10(h) | DoD 25: #2-#3 |
| CLK-INT-010 | `createHostBridgeClockAdapter` MUST be exported from main entry point | 07-integration.md §7.7 | GAMP 5 Category 5 | DoD 26: #1 |
| CLK-INT-011 | `createHostBridgeClockAdapter` MUST propagate `ClockStartupError` if factory returns `err()` | 07-integration.md §7.7 | 21 CFR 11.10(h) | DoD 26: #2-#3 |
| CLK-CAP-001 | `getCapabilities()` MUST return a frozen `ClockCapabilities` object | 02-clock-port.md §2.8 | ALCOA+ Original (immutability) | DoD 24: #1-#3; IQ-28 |
| CLK-CAP-002 | `getCapabilities()` MUST be computed once at construction and cached | 02-clock-port.md §2.8 | ALCOA+ Consistent | DoD 24: #4 |
| CLK-CAP-003 | `hasMonotonicTime` MUST be `true` when adapter uses `performance.now()` | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #5-#6 |
| CLK-CAP-004 | `hasHighResOrigin` MUST be `true` when adapter uses `performance.timeOrigin + performance.now()` | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #7-#8 |
| CLK-CAP-005 | `crossOriginIsolated` MUST be set to `globalThis.crossOriginIsolated` on browser platforms | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #9-#10 |
| CLK-CAP-006 | `estimatedResolutionMs` MUST account for platform and cross-origin isolation status | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #11-#12 |
| CLK-CAP-007 | `highResDegraded` MUST be `true` when `highResNow()` falls back to `Date.now()` | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #13; IQ-29 |
| CLK-CAP-008 | `monotonicDegraded` MUST be `true` when `monotonicNow()` uses clamped fallback | 02-clock-port.md §2.8 | ALCOA+ Accurate | DoD 24: #14 |
| CLK-CAP-009 | `ClockCapabilities` MUST be exported as a type from main entry point | 02-clock-port.md §2.8 | GAMP 5 Category 5 | IQ-25 |
| CLK-CAP-010 | `SystemClockAdapter` MUST detect `globalThis.crossOriginIsolated` at construction using `typeof` checks | 02-clock-port.md §2.8 | 21 CFR 11.10(h), ALCOA+ Accurate | DoD 24: #15-#17 |
| CLK-CAP-011 | Capability degradation on adapter swap MUST be logged as critical event via `ClockSourceChangedSink` | 02-clock-port.md §2.8 | 21 CFR 11.10(e), ALCOA+ Attributable | DoD 12: clock source change tests |
| CLK-EDGE-001 | `createEdgeRuntimeClock` MUST be exported from main entry point | 04-platform-adapters.md §4.8 | GAMP 5 Category 5 | DoD 25: #1 |
| CLK-EDGE-002 | `EdgeRuntimeClockAdapter` MUST capture platform API references at construction time | 04-platform-adapters.md §4.8 | 21 CFR 11.10(c), ALCOA+ Original | DoD 25: #4-#5 |
| CLK-EDGE-003 | `EdgeRuntimeClockAdapter` MUST skip ST-5 during startup self-test | 04-platform-adapters.md §4.8 | 21 CFR 11.10(h) | DoD 25: #6-#7 |
| CLK-EDGE-004 | `ClockDiagnostics.adapterName` MUST be `'EdgeRuntimeClockAdapter'` | 04-platform-adapters.md §4.8 | ALCOA+ Attributable | DoD 25: #8 |
| CLK-EDGE-005 | `ClockDiagnostics.highResSource` MUST be `'Date.now'` | 04-platform-adapters.md §4.8 | ALCOA+ Accurate | DoD 25: #9 |
| CLK-EDGE-006 | `ClockCapabilities.highResDegraded` MUST be `true` | 04-platform-adapters.md §4.8 | ALCOA+ Accurate | DoD 25: #10; IQ-29 |
| CLK-EDGE-007 | `ClockCapabilities.platform` MUST be `'edge-worker'` | 04-platform-adapters.md §4.8 | ALCOA+ Attributable | DoD 25: #11 |
| CLK-EDGE-008 | Returned adapter object MUST be frozen | 04-platform-adapters.md §4.8 | 21 CFR 11.10(c), ALCOA+ Original | DoD 25: #12 |
| CLK-EDGE-009 | `EdgeRuntimeClockOptions` MUST be exported as a type from main entry point | 04-platform-adapters.md §4.8 | GAMP 5 Category 5 | DoD 25: #13 |
| CLK-HB-001 | `HostClockBridge`, `HostBridgeClockOptions` MUST be exported from main entry point | 04-platform-adapters.md §4.9 | GAMP 5 Category 5 | DoD 26: #1; IQ-26 |
| CLK-HB-002 | `createHostBridgeClock` MUST be exported from main entry point | 04-platform-adapters.md §4.9 | GAMP 5 Category 5 | DoD 26: #2 |
| CLK-HB-003 | `createHostBridgeClock` MUST validate bridge function types at construction | 04-platform-adapters.md §4.9 | 21 CFR 11.10(h) | DoD 26: #4-#6 |
| CLK-HB-004 | When `bridge.highResNowMs` is `undefined`, `highResNow()` MUST fall back to `wallClockNowMs()` | 04-platform-adapters.md §4.9 | ALCOA+ Accurate | DoD 26: #7-#8 |
| CLK-HB-005 | `ClockDiagnostics.monotonicSource` MUST be `'host-bridge'` | 04-platform-adapters.md §4.9 | ALCOA+ Attributable | DoD 26: #9 |
| CLK-HB-006 | `ClockDiagnostics.highResSource` MUST be `'host-bridge'` or `'host-bridge-wallclock'` | 04-platform-adapters.md §4.9 | ALCOA+ Attributable | DoD 26: #10-#11 |
| CLK-HB-007 | ST-4 in GxP mode MUST check `Object.isFrozen(bridge)` instead of platform APIs | 04-platform-adapters.md §4.9 | 21 CFR 11.10(h), ALCOA+ Original | DoD 26: #12-#14 |
| CLK-HB-008 | [OPERATIONAL] GxP consumers MUST freeze bridge object before passing to factory | 04-platform-adapters.md §4.9 | 21 CFR 11.10(c), ALCOA+ Original | DoD 26: #15 |
| CLK-HB-009 | [OPERATIONAL] GxP organizations MUST include native bridge module in validation plan | 04-platform-adapters.md §4.9 | GAMP 5 Category 5, EU Annex 11 Section 4 | Consumer IQ extension |
| CLK-RES-001 | `@hex-di/clock` MUST NOT fabricate precision; adapter MUST return platform-native resolution values without interpolation | ./04-resolution-and-precision.md §6.4 | ALCOA+ Accurate, 21 CFR 11.10(h) | OQ-4; DoD 3: #1-#5; FM-7 (FMEA) |
| CLK-REC-001 | Incidents involving clock or sequence generator MUST be classified by severity level (L1–L4) | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 16, GAMP 5 | Procedural (incident management SOP) |
| CLK-REC-002 | Compound incidents (multiple simultaneous failure modes) MUST be classified at the highest individual severity | ./07-recovery-procedures.md §6.7 | ICH Q9, EU Annex 11 Section 16 | Procedural (incident management SOP) |
| CLK-REC-003 | Recovery verification tests (RV-1 through RV-7) MUST be executed after any incident that affects clock or sequence state | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 16, GAMP 5 | PQ-5; DoD 12: #1-#7 |
| CLK-REC-004 | Recovery verification tests MUST be re-executed when adapter implementation, platform runtime, or infrastructure changes | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 10, GAMP 5 | PQ re-execution trigger matrix |
| CLK-REC-005 | GxP organizations SHOULD execute disaster recovery scenarios (DR-1 through DR-4) annually | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 16 | Procedural (annual DR exercise) |
| CLK-REC-006 | GxP organizations SHOULD adapt the incident escalation path with organization-specific contacts | ./07-recovery-procedures.md §6.7 | EU Annex 11 Section 16 | Procedural (incident management SOP) |
| CLK-RTM-001 | RTM MUST be audited for completeness against cited regulatory standards on release, regulatory update, inspection finding, or annual review | ./08-requirements-traceability-matrix.md §RTM Completeness | EU Annex 11 Section 4, GAMP 5 Appendix M4 | Procedural (RTM audit cycle) |
| CLK-RTM-002 | RTM completeness audit MUST verify forward traceability, backward traceability, Not Applicable completeness, test coverage, and artifact existence | ./08-requirements-traceability-matrix.md §RTM Completeness | EU Annex 11 Section 4, GAMP 5 Appendix M4 | Procedural (RTM audit checklist) |
| CLK-RTM-003 | RTM completeness audit MUST be performed by independent reviewer (not the RTM author) | ./08-requirements-traceability-matrix.md §RTM Completeness | EU Annex 11 Section 4, 21 CFR 11.10(k)(2) | Procedural (independent review evidence) |
| CLK-RTM-004 | RTM completeness audit records MUST be retained and available for regulatory inspection | ./08-requirements-traceability-matrix.md §RTM Completeness | EU Annex 11 Section 4, 21 CFR 11.10(k)(2) | Procedural (audit record retention) |
| CLK-RTM-005 | CI pipeline MUST include automated consistency check between RTM.json and markdown RTM | ./08-requirements-traceability-matrix.md §Machine-Readable RTM Export | EU Annex 11 Section 4, GAMP 5 | CI/CD pipeline test |
| CLK-FMEA-001 | FMEA MUST be reviewed on a periodic schedule (annually) covering all failure modes, scoring criteria, and risk acceptance records | ./11-fmea-risk-analysis.md §Periodic FMEA Review | ICH Q9, GAMP 5 Appendix M4 | Procedural (annual FMEA review record) |
| CLK-FMEA-002 | Each periodic FMEA review MUST be documented with review date, reviewer identity, scope, outcome, and next scheduled review date | ./11-fmea-risk-analysis.md §Periodic FMEA Review | ICH Q9, GAMP 5 Appendix M4 | Procedural (FMEA review record) |
| CLK-OPS-001 | GxP organizations MUST include all [OPERATIONAL] requirements in their deployment qualification checklist with verification method, date, evidence, and verifier identity | ./08-requirements-traceability-matrix.md §Operational Requirement Classification | EU Annex 11 Section 4, GAMP 5 | DQ checklist (procedural) |
| CLK-OPS-002 | GxP organizations MUST report automated-testable and [OPERATIONAL] requirement coverage as separate metrics | ./08-requirements-traceability-matrix.md §Operational Requirement Classification | GAMP 5, EU Annex 11 Section 4 | CSVP documentation (procedural) |
| CLK-QUA-019 | GxP organizations MUST maintain a procedural test execution log for [OPERATIONAL] requirement verification | ./02-qualification-protocols.md §Procedural Test Execution Tracking | EU Annex 11 Section 4, GAMP 5 | PQ report (procedural) |
| CLK-PAC-019 | Organizations MUST adapt training module outlines and retain finalized materials under configuration control with 30-day update window | ./10-personnel-and-access-control.md §Training Materials | EU Annex 11 Section 3, 21 CFR 11.10(i) | Procedural (training material version control) |
| CLK-ASY-001 | `delay` MUST delegate to `scheduler.sleep(ms)`, not raw `setTimeout` or any platform timer API directly | 02-clock-port.md §2.9 | GAMP 5 Category 5 | DoD 27: #1-#2 |
| CLK-ASY-002 | `delay` MUST reject with `TypeError` for negative, `NaN`, or `Infinity` values of `ms` | 02-clock-port.md §2.9 | 21 CFR 11.10(h) | DoD 27: #3-#5 |
| CLK-ASY-003 | `timeout` MUST clean up the timer handle when `promise` settles before the timeout; no dangling timers | 02-clock-port.md §2.9 | ALCOA+ Complete | DoD 27: #9 |
| CLK-ASY-004 | `timeout` MUST reject with `ClockTimeoutError` (not generic `Error`) with `timeoutMs` property when timer fires first | 02-clock-port.md §2.9 | 21 CFR 11.10(h), ALCOA+ Accurate | DoD 27: #7-#8 |
| CLK-ASY-005 | `timeout` MUST use `scheduler.setTimeout()` for the timer, not raw `setTimeout` | 02-clock-port.md §2.9 | GAMP 5 Category 5 | DoD 27: #10 |
| CLK-ASY-006 | `measure` MUST use `clock.monotonicNow()` not `wallClockNow()` to avoid NTP jump artifacts | 02-clock-port.md §2.9 | ALCOA+ Accurate | DoD 27: #14 |
| CLK-ASY-007 | `measure` MUST NOT catch exceptions from `fn`; exception propagates to caller | 02-clock-port.md §2.9 | 21 CFR 11.10(h) | DoD 27: #15-#16 |
| CLK-ASY-008 | `retry` MUST use `scheduler.sleep()` between attempts, not raw `setTimeout` | 02-clock-port.md §2.9 | GAMP 5 Category 5 | DoD 27: #19 |
| CLK-ASY-009 | `retry` MUST cap computed delay at `maxDelayMs`; delay for attempt n = `min(delayMs * backoffMultiplier^n, maxDelayMs)` | 02-clock-port.md §2.9 | GAMP 5 Category 5 | DoD 27: #20-#21 |
| CLK-ASY-010 | `retry` MUST propagate the error from the final attempt unmodified (same reference) | 02-clock-port.md §2.9 | ALCOA+ Original | DoD 27: #22-#23 |
| CLK-DUR-001 | `elapsed` MUST return a non-negative `MonotonicDuration`; 0 when clock equals `since` | 02-clock-port.md §2.10 | ALCOA+ Accurate | DoD 28: #5-#6, #8 |
| CLK-DUR-002 | `elapsed` MUST use `clock.monotonicNow()` internally, not `wallClockNow()` | 02-clock-port.md §2.10 | ALCOA+ Accurate | DoD 28: #7 |
| CLK-DUR-003 | `asMonotonicDuration` and `asWallClockDuration` MUST be identity functions at runtime | 02-clock-port.md §2.10 | GAMP 5 Category 5 | DoD 28: #1-#4 |
| CLK-DUR-004 | `MonotonicDuration`, `WallClockDuration`, `asMonotonicDuration`, `asWallClockDuration`, `elapsed` MUST be exported from main entry point | 02-clock-port.md §2.10 | GAMP 5 Category 5 | DoD 28: type tests |
| CLK-DUR-005 | Arithmetic on branded durations MUST produce `number`, consistent with CLK-BRD-004 | 02-clock-port.md §2.10 | GAMP 5 Category 5 | DoD 28: #20 (type) |
| CLK-DUR-006 | Duration comparison functions MUST use strict numeric comparison; `durationGt(a, b)` returns `a > b` | 02-clock-port.md §2.10 | ALCOA+ Accurate | DoD 28: #9-#11 |
| CLK-DUR-007 | `durationBetween(value, min, max)` MUST return `value >= min && value <= max` (inclusive bounds) | 02-clock-port.md §2.10 | ALCOA+ Accurate | DoD 28: #12-#15 |
| CLK-TMP-001 | `toTemporalInstant` MUST accept `WallClockTimestamp` or `HighResTimestamp` but MUST NOT accept `MonotonicTimestamp` (type-level) | 02-clock-port.md §2.11 | GAMP 5 Category 5 | DoD 29: #10-#12 (type) |
| CLK-TMP-002 | `toTemporalInstant` MUST convert epoch ms to nanoseconds via `BigInt(ms) * 1_000_000n` and construct `Temporal.Instant` | 02-clock-port.md §2.11 | ALCOA+ Accurate | DoD 29: #2 |
| CLK-TMP-003 | `fromTemporalInstant` MUST extract epoch ms via `Number(instant.epochMilliseconds)` and brand as `WallClockTimestamp` | 02-clock-port.md §2.11 | ALCOA+ Accurate | DoD 29: #3 |
| CLK-TMP-004 | `toTemporalInstant` and `fromTemporalInstant` MUST throw `TypeError` at call time if `Temporal` global is unavailable | 02-clock-port.md §2.11 | 21 CFR 11.10(h) | DoD 29: #5-#7 |
| CLK-TMP-005 | `toTemporalInstant` and `fromTemporalInstant` MUST be exported from main entry point | 02-clock-port.md §2.11 | GAMP 5 Category 5 | DoD 29: type tests |
| CLK-TMP-006 | `Temporal` global MUST NOT be imported at module evaluation time; detection MUST be lazy (at call time) | 02-clock-port.md §2.11 | GAMP 5 Category 5 | DoD 29: #9 |
| CLK-PERF-001 | Benchmark suite MUST run on every PR targeting `main` with results stored as CI artifacts | 04-platform-adapters.md §4.10 | GAMP 5 Appendix M4 | DoD 30: #11 |
| CLK-PERF-002 | PR MUST fail CI if any core benchmark drops below floor ops/sec threshold | 04-platform-adapters.md §4.10 | GAMP 5 Appendix M4 | DoD 30: #12 |
| CLK-PERF-003 | PR MUST produce CI warning (not failure) if comparative benchmark exceeds max overhead ratio | 04-platform-adapters.md §4.10 | GAMP 5 Appendix M4 | DoD 30: #12 |
| CLK-PERF-004 | Benchmark reference platform is Node.js LTS on x86_64 Linux (CI runner); other platforms informational | 04-platform-adapters.md §4.10 | GAMP 5 Category 5 | DoD 30: #13 |
| CLK-PERF-005 | Benchmark results MUST be stored in `reports/benchmark/results.json` with historical tracking | 04-platform-adapters.md §4.10 | GAMP 5 Appendix M4 | DoD 30: #14 |
| CLK-TST-001 | `assertMonotonic` MUST throw on non-strictly-increasing sequences; equal values are a failure | 05-testing-support.md §5.6 | GAMP 5 Category 5 | DoD 31: #1-#3 |
| CLK-TST-002 | `assertMonotonic` MUST accept empty and single-element arrays without throwing | 05-testing-support.md §5.6 | GAMP 5 Category 5 | DoD 31: #4-#5 |
| CLK-TST-003 | `assertTimeBetween` MUST use inclusive bounds; `actual === min` and `actual === max` pass | 05-testing-support.md §5.6 | GAMP 5 Category 5 | DoD 31: #8-#10 |
| CLK-TST-004 | `assertWallClockPlausible` MUST reject timestamps before 2020-01-01 (1577836800000ms) | 05-testing-support.md §5.6 | ALCOA+ Accurate | DoD 31: #15-#17 |
| CLK-TST-005 | `assertWallClockPlausible` MUST reject timestamps more than 86400000ms (1 day) after current wall-clock time | 05-testing-support.md §5.6 | ALCOA+ Accurate | DoD 31: #16 |
| CLK-TST-006 | `assertSequenceOrdered` MUST detect both duplicates (gap = 0) and gaps (gap > 1) | 05-testing-support.md §5.6 | ALCOA+ Complete | DoD 31: #18-#20 |
| CLK-TST-007 | All assertion helpers MUST be exported from `@hex-di/clock/testing` | 05-testing-support.md §5.6 | GAMP 5 Category 5 | DoD 31: type tests |
| CLK-ALS-001 | `createClockContext` MUST create a new `AsyncLocalStorage<ClockContext>` instance per invocation | 07-integration.md §7.8 | GAMP 5 Category 5 | DoD 32: #1, #6 |
| CLK-ALS-002 | `createClockContext` MUST be exported from `@hex-di/clock` main entry point | 07-integration.md §7.8 | GAMP 5 Category 5 | DoD 32: type tests |
| CLK-ALS-003 | `createClockContext` MUST NOT import `node:async_hooks` at module evaluation time; import MUST be lazy | 07-integration.md §7.8 | GAMP 5 Category 5 | DoD 32: #9 |
| CLK-ALS-004 | On platforms without `AsyncLocalStorage`, `createClockContext` MUST throw descriptive `TypeError` | 07-integration.md §7.8 | 21 CFR 11.10(h) | DoD 32: #10 |
| CLK-ALS-005 | `ClockContext` MUST be frozen when stored; `run()` MUST call `Object.freeze()` before `AsyncLocalStorage.run()` | 07-integration.md §7.8 | ALCOA+ Original (immutability) | DoD 32: #7-#8 |
| CLK-DTS-001 | [OPERATIONAL] All systems exchanging TemporalContext-stamped data MUST synchronize to the same NTP server pool (or stratum-1-connected pool with documented inter-pool agreement) | compliance/gxp.md §DTS | EU Annex 11 Section 9, ALCOA+ Consistent | Deployment procedure (procedural) |
| CLK-DTS-002 | [OPERATIONAL] Maximum acceptable inter-system wall-clock drift for GxP distributed deployments MUST be documented in CSVP with use-case-specific thresholds | compliance/gxp.md §DTS | EU Annex 11 Section 9, ALCOA+ Consistent | CSVP documentation (procedural) |
| CLK-DTS-003 | [OPERATIONAL] GxP organizations MUST implement inter-system NTP drift monitoring with L2 incident escalation when drift exceeds documented threshold | compliance/gxp.md §DTS | EU Annex 11 Section 11, ALCOA+ Consistent | Monitoring procedure (procedural) |
| CLK-DTS-004 | [OPERATIONAL] Cross-system audit trail reconstruction MUST group by system identifier, use sequenceNumber within-system, and wallClockTimestamp across systems with documented drift confidence | compliance/gxp.md §DTS | ALCOA+ Consistent, EU Annex 11 Section 9 | Consumer implementation (procedural) |
| CLK-DTS-005 | [OPERATIONAL] Multi-timezone distributed deployments MUST use UTC for all TemporalContext.wallClockTimestamp values with local timezone captured separately per CLK-SIG-012 | compliance/gxp.md §DTS | ALCOA+ Consistent | Deployment procedure (procedural) |
| CLK-SUP-001 | [OPERATIONAL] GxP organizations MUST use the SQA template (or equivalent addressing all mandatory sections) when establishing Supplier Quality Agreement for @hex-di/clock | compliance/gxp.md §Supplier | EU Annex 11 Section 3, GAMP 5 | SQA document (procedural) |
| CLK-SUP-002 | [OPERATIONAL] Executed SQA MUST be retained for deployment duration plus data retention period and available for regulatory inspection within 24 hours | compliance/gxp.md §Supplier | EU Annex 11 Section 3, 21 CFR 11.10(e) | Document retention (procedural) |

### Formal Requirement ID Coverage Summary

| ID Prefix | Count | Spec Section | Scope |
| --- | --- | --- | --- |
| CLK-MON | 2 | 02-clock-port.md §2.2 | Monotonic time platform selection and fallback |
| CLK-WCK | 1 | 02-clock-port.md §2.3 | Wall-clock leap second boundary |
| CLK-HRS | 3 | 02-clock-port.md §2.4 | High-resolution time fallback and constraints |
| CLK-BRD | 9 | 02-clock-port.md §2.5 | Branded timestamp types, branding utilities, validated branding |
| CLK-SEQ | 6 | 03-sequence-generator.md §3.1 | Sequence generator safety, overflow, capacity monitoring |
| CLK-ORD | 1 | 03-sequence-generator.md §3.2 | Ordering authority |
| CLK-MPC | 9 | 03-sequence-generator.md §3.3 | Multi-process deployment, process instance identifier |
| CLK-SYS | 24 | 04-platform-adapters.md §4.1–4.3 | System clock adapter, platform detection, self-test, hardware clock |
| CLK-TMR | 12 | 02-clock-port.md §2.6, 04-platform-adapters.md §4.6, 05-testing-support.md §5.4 | Timer/scheduler port, system adapter, virtual adapter |
| CLK-ADV | 5 | 05-testing-support.md §5.1 | Auto-advance on read |
| CLK-WSY | 4 | 05-testing-support.md §5.4 | Waiter synchronization (blockUntil) |
| CLK-CAC | 10 | 02-clock-port.md §2.7, 04-platform-adapters.md §4.7 | Cached clock port, system adapter, lifecycle |
| CLK-GXP | 16 | ./01-clock-source-requirements.md §6.1, ./07-recovery-procedures.md §6.7, compliance/gxp.md §6.1 | Risk classification, NTP boundary, diagnostics, FIPS detection, periodic evaluation fallback and scheduling utility, compensating controls, continuous monitoring, NTP documentation, security control matrix |
| CLK-QUA | 19 | ./02-qualification-protocols.md §6.2 | IQ/OQ/PQ execution, CI/CD integration, DQ checklist, validation plan guidance, PQ env var validation, deployment approval prerequisite, procedural test tracking |
| CLK-AUD | 39 | ./06-audit-trail-integration.md §6.6, ./08-requirements-traceability-matrix.md §Consumer Diagnostic | TemporalContext, serialization, digest, schema migration, retention utilities, retention policy port, audit review, data migration, retention metadata completeness |
| CLK-CHG | 22 | ./03-verification-and-change-control.md §6.3 | Version pinning, re-qualification, emergency change, CAPA |
| CLK-INT | 11 | 07-integration.md §7.1–7.7 | Container registration, adapter override auditing, timer/cached/edge/host-bridge registration |
| CLK-PAC | 19 | ./10-personnel-and-access-control.md §6.10 | Personnel qualification, training, operational access, QA Manager role, segregation of duties, training material configuration control |
| CLK-SIG | 18 | ./05-alcoa-mapping.md §6.5 | Signature binding, attribution, data archival, retention, validation, multi-timezone |
| CLK-CAP | 11 | 02-clock-port.md §2.8 | ClockCapabilities introspection, degradation detection, degradation audit |
| CLK-EDGE | 9 | 04-platform-adapters.md §4.8 | EdgeRuntimeClockAdapter for V8 isolate edge runtimes |
| CLK-HB | 9 | 04-platform-adapters.md §4.9 | HostClockBridge for React Native, WASM, embedded |
| CLK-REC | 6 | ./07-recovery-procedures.md §6.7 | Incident classification, compound incident severity, recovery verification execution, recovery re-execution on change, disaster recovery scenarios, incident response adaptation |
| CLK-RTM | 5 | ./08-requirements-traceability-matrix.md §RTM Completeness | RTM completeness audit triggers, audit verification scope, independent review principle, audit record retention, RTM.json consistency verification |
| CLK-FMEA | 2 | ./11-fmea-risk-analysis.md §Periodic FMEA Review | Annual periodic FMEA review obligation, periodic review documentation |
| CLK-RES | 1 | ./04-resolution-and-precision.md §6.4 | Precision integrity, no fabrication |
| CLK-OPS | 2 | ./08-requirements-traceability-matrix.md §Operational Requirement Classification | Operational requirement verification tracking |
| CLK-ASY | 10 | 02-clock-port.md §2.9 | Async combinators (timeout, deadline, race, retry, periodic, debounce, throttle) |
| CLK-DUR | 7 | 02-clock-port.md §2.10 | Branded duration types (MonotonicDuration, WallClockDuration, elapsed, arithmetic) |
| CLK-TMP | 6 | 02-clock-port.md §2.11 | Temporal API interop (toTemporalInstant, fromTemporalInstant, clock adapter) |
| CLK-PERF | 5 | 04-platform-adapters.md §4.10 | Benchmark specification (monotonic overhead, wall-clock overhead, sequence throughput) |
| CLK-TST | 7 | 05-testing-support.md §5.6 | Testing assertion helpers (assertElapsed, assertMonotonic, assertSequenceOrder) |
| CLK-ALS | 5 | 07-integration.md §7.8 | AsyncLocalStorage clock context (provide, resolve, middleware, isolation) |
| CLK-DTS | 5 | compliance/gxp.md §DTS | Distributed time synchronization (NTP pool, drift thresholds, monitoring, reconstruction, UTC) |
| CLK-SUP | 2 | compliance/gxp.md §Supplier | Supplier Quality Agreement (SQA template, retention) |
| **Total** | **322** | | |

**Sub-identifier convention:** Some requirement prefixes use sub-identifiers (e.g., CLK-AUD-031a/b/c, CLK-GXP-003a, CLK-GXP-007a/b/c) for requirements that refine or extend a parent requirement without disrupting the sequential numbering scheme. The total count of 322 includes all sub-identifiers as distinct, individually traceable requirements. Each sub-identifier has its own row in the Formal Requirement ID Mapping table above with independent regulatory clause and validation test cross-references.

### Formal Requirement ID — Coverage Completion Record

All planned formal CLK-prefixed requirement IDs have been assigned through specification revision 2.8 (RTM revision 2.8). The original 8 spec sections plus 9 feature sections now have full coverage (322 total IDs: 223 established through RTM revision 2.5, plus 7 additional IDs in RTM revision 2.6, plus 22 additional IDs in RTM revision 2.7 covering retention utilities, retention policy port, FIPS detection, periodic evaluation scheduling, process instance identifier, validated branding, and capability degradation audit, plus 16 additional IDs in RTM revision 2.7.1 covering recovery procedures (CLK-REC-001 through CLK-REC-006), RTM completeness meta-requirements (CLK-RTM-001 through CLK-RTM-005), periodic FMEA review (CLK-FMEA-001 through CLK-FMEA-002), retention metadata completeness check (CLK-AUD-036), procedural test tracking (CLK-QUA-019), and personnel training material configuration control (CLK-PAC-019), plus 2 operational requirement verification IDs (CLK-OPS-001 through CLK-OPS-002), plus 41 additional IDs in RTM revision 2.8 covering async combinators (CLK-ASY-001 through CLK-ASY-010), branded duration types (CLK-DUR-001 through CLK-DUR-007), Temporal API interop (CLK-TMP-001 through CLK-TMP-006), benchmark specification (CLK-PERF-001 through CLK-PERF-005), testing assertion helpers (CLK-TST-001 through CLK-TST-007), AsyncLocalStorage clock context (CLK-ALS-001 through CLK-ALS-005), and HardwareClockAdapter exports renumbering (CLK-SYS-024), plus 11 additional IDs in RTM revision 2.9 covering GxP monitoring and security (CLK-GXP-009 through CLK-GXP-012), distributed time synchronization (CLK-DTS-001 through CLK-DTS-005), and supplier quality agreement (CLK-SUP-001 through CLK-SUP-002)):

| Spec Section | IDs Assigned | ID Prefix | Status |
| --- | --- | --- | --- |
| 02-clock-port.md (§2.2 Monotonic Time) | 2 | CLK-MON-001 – CLK-MON-002 | Complete |
| 02-clock-port.md (§2.3 Wall-Clock Time) | 1 | CLK-WCK-001 | Complete |
| 02-clock-port.md (§2.4 High-Resolution Time) | 3 | CLK-HRS-001 – CLK-HRS-003 | Complete |
| 03-sequence-generator.md (§3.1 Sequence Safety) | 6 | CLK-SEQ-001 – CLK-SEQ-006 | Complete |
| 03-sequence-generator.md (§3.2 Ordering Authority) | 1 | CLK-ORD-001 | Complete |
| 03-sequence-generator.md (§3.3 Multi-Process) | 9 | CLK-MPC-001 – CLK-MPC-009 | Complete |
| 02-clock-port.md (§2.5 Branded Types) | 9 | CLK-BRD-001 – CLK-BRD-009 | Complete |
| 02-clock-port.md (§2.6 Timer/Scheduler) | 6 | CLK-TMR-001 – CLK-TMR-006 | Complete |
| 02-clock-port.md (§2.7 Cached Clock) | 5 | CLK-CAC-001 – CLK-CAC-005 | Complete |
| 04-platform-adapters.md (§4.1–4.3) | 24 | CLK-SYS-001 – CLK-SYS-024 | Complete |
| 04-platform-adapters.md (§4.6 System Timer) | 4 | CLK-TMR-007 – CLK-TMR-010 | Complete |
| 04-platform-adapters.md (§4.7 Cached Clock) | 5 | CLK-CAC-006 – CLK-CAC-010 | Complete |
| 05-testing-support.md (§5.1 Auto-Advance) | 5 | CLK-ADV-001 – CLK-ADV-005 | Complete |
| 05-testing-support.md (§5.4 Virtual Timer) | 2 | CLK-TMR-011 – CLK-TMR-012 | Complete |
| 05-testing-support.md (§5.4 blockUntil) | 4 | CLK-WSY-001 – CLK-WSY-004 | Complete |
| ./01-clock-source-requirements.md (§6.1), ./07-recovery-procedures.md (§6.7), compliance/gxp.md §6.1 | 16 | CLK-GXP-001 – CLK-GXP-012, CLK-GXP-003a, CLK-GXP-007a/b/c | Complete |
| ./06-audit-trail-integration.md (§6.6), ./08-requirements-traceability-matrix.md (§Consumer Diagnostic) | 39 | CLK-AUD-001 – CLK-AUD-036, CLK-AUD-031a/b/c | Complete |
| ./05-alcoa-mapping.md (§6.5) | 18 | CLK-SIG-001 – CLK-SIG-018 | Complete |
| ./03-verification-and-change-control.md (§6.3) | 22 | CLK-CHG-001 – CLK-CHG-022 | Complete |
| ./02-qualification-protocols.md (§6.2) | 19 | CLK-QUA-001 – CLK-QUA-019 | Complete |
| 07-integration.md (§7.1–7.7) | 11 | CLK-INT-001 – CLK-INT-011 | Complete |
| ./10-personnel-and-access-control.md (§6.10) | 19 | CLK-PAC-001 – CLK-PAC-019 | Complete |
| 02-clock-port.md (§2.8 ClockCapabilities) | 11 | CLK-CAP-001 – CLK-CAP-011 | Complete |
| 04-platform-adapters.md (§4.8 EdgeRuntime) | 9 | CLK-EDGE-001 – CLK-EDGE-009 | Complete |
| 04-platform-adapters.md (§4.9 HostBridge) | 9 | CLK-HB-001 – CLK-HB-009 | Complete |
| ./07-recovery-procedures.md (§6.7) | 6 | CLK-REC-001 – CLK-REC-006 | Complete |
| ./08-requirements-traceability-matrix.md (§RTM Completeness) | 5 | CLK-RTM-001 – CLK-RTM-005 | Complete |
| ./11-fmea-risk-analysis.md (§Periodic FMEA Review) | 2 | CLK-FMEA-001 – CLK-FMEA-002 | Complete |
| ./04-resolution-and-precision.md (§6.4) | 1 | CLK-RES-001 | Complete |
| ./08-requirements-traceability-matrix.md (§Operational Requirement Classification) | 2 | CLK-OPS-001 – CLK-OPS-002 | Complete |
| 02-clock-port.md (§2.9 Async Combinators) | 10 | CLK-ASY-001 – CLK-ASY-010 | Complete |
| 02-clock-port.md (§2.10 Duration Types) | 7 | CLK-DUR-001 – CLK-DUR-007 | Complete |
| 02-clock-port.md (§2.11 Temporal API Interop) | 6 | CLK-TMP-001 – CLK-TMP-006 | Complete |
| 04-platform-adapters.md (§4.10 Benchmarks) | 5 | CLK-PERF-001 – CLK-PERF-005 | Complete |
| 05-testing-support.md (§5.6 Assertion Helpers) | 7 | CLK-TST-001 – CLK-TST-007 | Complete |
| 07-integration.md (§7.8 AsyncLocalStorage) | 5 | CLK-ALS-001 – CLK-ALS-005 | Complete |
| compliance/gxp.md (§DTS Distributed Time Sync) | 5 | CLK-DTS-001 – CLK-DTS-005 | Complete |
| compliance/gxp.md (§Supplier Quality Agreement) | 2 | CLK-SUP-001 – CLK-SUP-002 | Complete |
| **Total IDs** | **322** | | |

REQUIREMENT: When new formal requirement IDs are assigned in the specification, corresponding entries MUST be added to this mapping table. The mapping MUST be reviewed for completeness during each RTM audit cycle.

---

## FDA 21 CFR Part 11 — Not Applicable Clauses (Regulatory Gap Register)

The following 21 CFR Part 11 clauses have been evaluated and determined to be not applicable to `@hex-di/clock` within its defined scope. Each clause is documented with a justification for exclusion. GxP organizations MUST review these exclusions as part of their computerized system validation plan and confirm applicability within their specific deployment context.

| Regulatory Clause | Requirement Summary                                                                                                                                                                                                                   | Applicability Determination        | Justification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.10(f)          | Use of operational system checks to enforce permitted sequencing of steps and events                                                                                                                                                  | **Not Applicable**                 | `@hex-di/clock` is a clock and sequence generation library, not a workflow system. It does not define or enforce operational step sequences. Workflow sequencing enforcement is a consumer application responsibility. The clock library provides temporal ordering primitives (`SequenceGeneratorPort`) that consumers MAY use as building blocks for workflow sequencing, but does not itself enforce any business process sequence.                                                                                                                                                                                          |
| 11.10(g)          | Use of authority checks to ensure that only authorized individuals can use the system, electronically sign a record, access the operation or computer system input or output device, alter a record, or perform the operation at hand | **Not Applicable**                 | `@hex-di/clock` does not implement authentication, authorization, or user identity management. Authority checks are a consumer application and infrastructure responsibility. The clock library provides the `SignableTemporalContext` interface for electronic signature binding but does not verify signer identity or authorization — this is explicitly delegated to the consumer's identity management system (see ./05-alcoa-mapping.md, §11.100/11.300 cross-reference). Container graph access control for clock adapter registration is documented in ./10-personnel-and-access-control.md as an organizational procedure. |
| 11.10(i)          | Determination that persons who develop, maintain, or use electronic record/electronic signature systems have the education, training, and experience to perform their assigned tasks                                                  | **Not Applicable (library scope)** | Personnel qualification is an organizational responsibility, not a library responsibility. `@hex-di/clock` documents the required roles and training topics (see ./10-personnel-and-access-control.md) but does not implement personnel management systems. GxP organizations MUST implement their own training record management and competency verification processes.                                                                                                                                                                                                                                                          |
| 11.10(j)          | Establishment of, and adherence to, written policies that hold individuals accountable and responsible for actions initiated under their electronic signatures                                                                        | **Not Applicable**                 | Accountability policies are organizational governance documents, not software artifacts. `@hex-di/clock` provides the temporal infrastructure for electronic signature binding (`SignableTemporalContext`) but does not define or enforce accountability policies. GxP organizations MUST establish written policies per their quality management system.                                                                                                                                                                                                                                                                       |
| 11.200            | Electronic signatures not based upon biometrics shall employ at least two distinct identification components (e.g., identification code and password)                                                                                 | **Not Applicable**                 | `@hex-di/clock` does not implement electronic signature execution or authentication. The `SignableTemporalContext.signature.method` field records which authentication method was used (e.g., `'password'`, `'biometric'`, `'token'`, `'certificate'`) but does not enforce multi-factor authentication. Multi-factor enforcement is a consumer authentication system responsibility. The clock library provides the temporal binding point; the consumer provides the authentication mechanism.                                                                                                                                |
| 11.300(e)         | Initial and periodic testing of devices, such as tokens or cards, that bear or generate identification code or password information to ensure that they function properly and have not been altered in an unauthorized manner         | **Not Applicable**                 | `@hex-di/clock` does not interact with authentication tokens, smart cards, or biometric devices. Device testing for authentication hardware is entirely outside the scope of a clock library. GxP organizations MUST address this requirement in their authentication infrastructure validation plan.                                                                                                                                                                                                                                                                                                                           |
| 11.10(k)(1)       | Adequate controls over the distribution of, access to, and use of documentation for system operation and maintenance                                                                                                                  | **Not Applicable (library scope)** | Documentation access control is an organizational responsibility outside the scope of a software library. `@hex-di/clock` publishes its specification and API documentation as open-source artifacts; controlling who may access, modify, or distribute these documents within a GxP organization is a deployment-level concern. Personnel qualification requirements for documentation access are addressed in ./10-personnel-and-access-control.md as organizational procedures. GxP organizations MUST implement documentation access controls per their quality management system.                                            |

REQUIREMENT: GxP organizations MUST review the "Not Applicable" determinations above during their computerized system validation planning. If the organization's deployment context brings any of these clauses into scope (e.g., if the clock library is extended with authentication features), the determination MUST be revised and the RTM updated accordingly.

REQUIREMENT: Any change to the applicability determination of a "Not Applicable" clause MUST be documented with: the previous determination, the new determination, the rationale for the change, and the approver's signature.

---

## Test Automation Coverage Summary

This section classifies each validation test reference in the RTM by its automation status, giving auditors immediate visibility into the proportion of verifications that are automated (executed by IQ/OQ/PQ test suites or CI/CD) vs. procedural (requiring manual execution, code review, or organizational SOP).

### Automation Classification

| Classification | Definition |
| --- | --- |
| **Automated** | Verification is fully executed by an automated test suite (IQ, OQ, PQ, or DoD unit/integration tests). No manual intervention required. |
| **Mixed** | Verification includes both automated test cases and procedural steps. The automated portion runs in a test suite; the procedural portion requires manual execution or review. |
| **Procedural** | Verification is entirely manual: code review, organizational SOP execution, infrastructure inspection, or deployment checklist. |
| **Cross-ref** | Verification is delegated to another specification (e.g., the ecosystem's GxP monitoring adapter). Automation status depends on the referenced specification's test suite. |

### Coverage by Regulatory Section

| Regulatory Source | Clause | Validation Test(s) | Automation Status |
| --- | --- | --- | --- |
| **FDA 21 CFR Part 11** | 11.10(a) | All DoD items; IQ-1–IQ-30; OQ-1–OQ-8; PQ-1–PQ-5 | Automated |
| | 11.10(b) | DoD 8: #1-#22; DoD 8b: #1-#19 | Automated |
| | 11.10(c) | IQ-4, IQ-5, IQ-11, IQ-13, IQ-22; DoD 7: #1-#4, #18-#19; DoD 8c: #1-#21 | Mixed (IQ-13 procedural, remainder automated) |
| | 11.10(d) | IQ-6; DoD 2: #11-#15; DoD 7: #12 | Automated |
| | 11.10(e) | DoD 8: #1-#20; DoD 7: #15-#17; DoD 12: #6-#8; DoD 13: #1-#9; IQ-17, IQ-18 | Automated |
| | 11.10(h) | DoD 3: #11-#23; IQ-14, IQ-15, IQ-16, IQ-19 | Automated |
| | 11.10(k)(2) | DQ-1–DQ-5; Emergency procedure | Mixed (DQ-5 automated, DQ-1–DQ-4 procedural, emergency procedure procedural) |
| | 11.50 | DoD 8a: #1-#16 | Automated |
| | 11.70 | DoD 8a: #7-#10 (binding); DoD 8a: #11-#14 (validation) | Automated |
| | 11.100 | Consumer responsibility; organizational SOP | Procedural |
| | 11.300 | Consumer responsibility; organizational SOP | Procedural |
| **EU GMP Annex 11** | Section 3 | Organizational procedure | Procedural |
| | Section 4 | All DoD items collectively | Automated |
| | Section 5 | Organizational procedure | Procedural |
| | Section 7 | DoD 7: #11 | Automated |
| | Section 9 | DoD 1: #1-#7; DoD 12: #1-#10; IQ-1, IQ-2 | Automated |
| | Section 10 | DQ-1–DQ-5; Emergency procedure | Mixed |
| | Section 11 | CLK-GXP-006/007 periodic evaluation verification; CLK-GXP-008 compensating controls for FM-3–FM-6; ecosystem monitoring adapter validation | Mixed |
| | Section 12.1 | Organizational procedure + IQ-13 | Mixed |
| | Section 12.4 | DoD 7: #11 | Automated |
| | Section 13 | Organizational procedure (SOPs); DoD 3, DoD 7 | Mixed |
| | Section 16 | Organizational procedure; DoD 3, DoD 7 | Mixed |
| **GAMP 5** | Category 5 | All DoD items | Automated |
| | Risk Classification | IQ/OQ/PQ protocols | Automated |
| | Appendix M4 | DoD 3: #11-#23; DoD 7: #15-#17 | Automated |
| **ALCOA+** | Attributable | DoD 6: #1-#12; DoD 8: #3-#6 | Automated |
| | Legible | DoD 7: #11 | Automated |
| | Contemporaneous | DoD 7: #5-#8; OQ-1–OQ-4 | Automated |
| | Original | IQ-4, IQ-5, IQ-9, IQ-10, IQ-12, IQ-22; DoD 7: #1-#4; DoD 8c: #1-#21 | Automated |
| | Accurate | DoD 3: #5, #7, #8; OQ-2, OQ-4 | Automated |
| | Complete | DoD 2: #7-#11; DoD 7: #15-#17; DoD 8: #14-#22 | Automated |
| | Consistent | DoD 1: #1-#7 | Automated |
| | Enduring | DoD 7: #11; DoD 8b: #1-#19 | Automated |
| | Available | DoD 1: #3-#4 | Automated |
| **ICH / 21 CFR 211** | 21 CFR 211.68 | DQ-1, DQ-2; Ecosystem monitoring adapter validation | Cross-ref (DQ infrastructure procedural, ecosystem monitoring validation) |
| | 21 CFR 211.180 | Organizational procedure | Procedural |
| | ICH Q7 6.5 | DQ-1, DQ-2 | Procedural |

### Automation Coverage Metrics

| Classification | Count | Percentage |
| --- | --- | --- |
| Automated | 23 | 62% |
| Mixed | 7 | 19% |
| Procedural | 6 | 16% |
| Cross-ref | 1 | 3% |
| **Total** | **37** | **100%** |

REQUIREMENT: The automation coverage metrics MUST be updated whenever validation tests are added, removed, or reclassified. The target automation coverage is ≥65% (automated + the automated portion of mixed verifications). Current effective automated coverage: 62% fully automated + 19% mixed (partially automated) = 81% of regulatory clause verifications include an automated component, exceeding the ≥65% target.

### Machine-Readable RTM Export

REQUIREMENT: GxP organizations using automated requirements management tools (e.g., Polarion, DOORS, Jama Connect) MUST export this RTM into a machine-readable format as part of their computerized system validation plan. To facilitate this, the specification suite MUST include a companion file `spec/clock/compliance/RTM.json` containing the Formal Requirement ID Mapping table in structured JSON format. The `RTM.json` file MUST be generated during the implementation phase and delivered alongside the first stable release of `@hex-di/clock`:

```json
{
  "schemaVersion": 1,
  "specDocument": "SPEC-CLK-001",
  "specRevision": "2.7",
  "rtmRevision": "2.7",
  "requirements": [
    {
      "id": "CLK-MON-001",
      "summary": "SystemClockAdapter MUST use performance.now() when available; Date.now() fallback only when performance is unavailable",
      "specSection": "02-clock-port.md §2.2",
      "regulatoryClauses": ["21 CFR 11.10(h)", "ALCOA+ Contemporaneous"],
      "validationTests": ["DoD 3: #1-#5", "IQ-7"],
      "operational": false
    }
  ]
}
```

When provided, `RTM.json` MUST be regenerated from the authoritative markdown RTM whenever the RTM is updated. The markdown RTM remains the authoritative source; `RTM.json` is a derived convenience artifact.

REQUIREMENT (CLK-RTM-005): The CI pipeline MUST include an automated consistency check that verifies `RTM.json` (when present) matches the authoritative markdown RTM. The check MUST validate: (a) every formal requirement ID in the markdown RTM is present in `RTM.json`, (b) every entry in `RTM.json` has a corresponding row in the markdown RTM, (c) the `specRevision` and `rtmRevision` fields in `RTM.json` match the current specification revision, and (d) the JSON structure validates against the schema example defined above. The CI check MUST fail the build if any inconsistency is detected, preventing drift between the markdown source and the JSON export.

### Consumer Diagnostic Integration Guidance

The procedural verifications listed above (11.100, 11.300, 21 CFR 211.180) are entirely consumer-dependent because they require organizational infrastructure (identity management, credential policies, retention enforcement) outside the scope of a clock library. GxP consumers MUST implement compensating diagnostic controls to provide automated early warning when organizational controls are not functioning as expected:

REQUIREMENT: GxP deployments consuming `@hex-di/clock` MUST implement the following consumer-side diagnostic checks. These checks do not replace the procedural SOPs required by the regulations, but they provide automated detection of common procedural gaps.

1. **11.100/11.300 (Electronic signatures, credentials):** Consumer applications MUST validate at startup that the identity management system is reachable and configured, and that session timeout policies are active. Failure to reach the identity system MUST be logged as a critical diagnostic event and SHOULD prevent the application from processing GxP transactions until the identity system is confirmed operational.
2. **21 CFR 211.180 (Record retention):** Consumer applications MUST implement a periodic retention audit check (RECOMMENDED: daily) that verifies the oldest audit trail records are within the configured retention window and that the archival system is operational. Retention policy violations MUST be logged as critical diagnostic events and escalated to the QA Reviewer within 24 hours.
3. **Retention metadata completeness (ALCOA+ Enduring) (CLK-AUD-036):** Consumer applications persisting `TemporalContext` records in GxP mode MUST implement a periodic audit (RECOMMENDED: daily) that samples recently persisted audit trail records and verifies each record has `RetentionMetadata` attached. Records missing retention metadata MUST be logged as a warning-level diagnostic event. The `RetentionPolicyPort` advisory port (CLK-AUD-031a/b/c) emits a stderr warning when not registered in GxP mode, but this warning occurs only at startup — the periodic record-level check provides ongoing detection of records persisted without retention metadata, covering cases where the port is registered but the consumer neglects to call `createRetentionMetadata()` for individual records.

REQUIREMENT: The consumer diagnostic integration checks above MUST be documented in the consuming application's computerized system validation plan and verified during the consuming application's OQ protocol.

---

## Specification Level Classification

This section maps each spec section to its primary GAMP 5 V-model specification level. `@hex-di/clock` uses a combined specification approach (see README.md, "Combined Specification Approach") where URS, FS, and DS content coexists in each chapter. The `specLevel` column below indicates the *primary* specification level of each section's content. Content-level specification markers (`[URS]`, `[FS]`, `[DS]`) within each chapter provide finer-grained classification.

| Spec Section | Primary Level | Content Description |
| --- | --- | --- |
| 01-overview.md §1.1–1.2 | URS | System purpose, design principles |
| 01-overview.md §1.3 | DS | Data flow diagrams (platform API flow, TemporalContextFactory composition, clock source override) |
| 01-overview.md §1.4 | DS | Package structure and export map |
| 02-clock-port.md §2.1 | URS/FS | ClockPort interface requirements and functional semantics |
| 02-clock-port.md §2.2–2.4 | DS | Platform detection, fallback strategy, monotonicity contract |
| 03-sequence-generator.md §3.1 | FS/DS | SequenceGeneratorPort functional behavior and overflow handling |
| 03-sequence-generator.md §3.2–3.3 | DS | Ordering authority, multi-process deployment patterns |
| 04-platform-adapters.md §4.1–4.2 | DS | SystemClockAdapter implementation, platform detection, self-test |
| 04-platform-adapters.md §4.3 | FS | HardwareClockAdapter interface contract |
| 05-testing-support.md | DS | VirtualClockAdapter, VirtualSequenceGenerator implementation |
| compliance/ | URS/FS | Regulatory requirements, qualification protocols, risk analysis |
| 07-integration.md | DS | Container registration, adapter override sequencing |
| 08-api-reference.md | FS | Complete API surface documentation |
| 09-definition-of-done.md | — (Test Spec) | IQ/OQ/PQ test cases mapped to spec sections |

REQUIREMENT: When organizations require separate URS, FS, and DS documents (per their quality management system), they MUST extract the content-level markers from each chapter into the appropriate specification document. The extraction procedure is documented in README.md ("Combined Specification Approach").

---

## RTM Completeness Validation

### Purpose

This section defines the meta-requirements for ensuring the RTM itself remains complete, accurate, and current. An incomplete or outdated RTM creates a regulatory gap that may not be detected until a regulatory inspection.

### Completeness Audit Requirements

REQUIREMENT (CLK-RTM-001): The RTM MUST be audited for completeness against the full text of each cited regulatory standard whenever:

1. A new version of `@hex-di/clock` is released (including patch versions).
2. A new regulatory standard or guidance document is published that affects computerized system validation (e.g., revised FDA guidance on data integrity, updated EU GMP Annex 11).
3. A regulatory inspection finding identifies a traceability gap.
4. The annual specification review cycle occurs (per document control review period).

REQUIREMENT (CLK-RTM-002): The RTM completeness audit MUST verify:

1. **Forward traceability**: Every regulatory clause cited in the specification has a corresponding RTM entry with spec section, implementation artifact, and validation test references.
2. **Backward traceability**: Every spec section containing a REQUIREMENT statement is referenced by at least one RTM entry.
3. **Not Applicable completeness**: Every sub-clause of 21 CFR Part 11 (11.10(a) through 11.10(k), 11.50, 11.100, 11.200, 11.300) is either mapped in the "Applicable Clauses" table or documented in the "Not Applicable Clauses" table with justification.
4. **Test coverage**: Every RTM entry referencing a validation test cites a test that exists in the Definition of Done (09-definition-of-done.md) or a qualification protocol (./02-qualification-protocols.md).
5. **Artifact existence**: Every RTM entry referencing an implementation artifact cites a file that exists in the package structure (01-overview.md, section 1.3).

REQUIREMENT (CLK-RTM-003): The RTM completeness audit MUST be performed by a person who did not author the RTM (independent review principle). The auditor MUST document:

1. The date of the audit.
2. The version of each regulatory standard audited against.
3. Any gaps identified, with severity classification (Critical: missing applicable clause; Major: missing test reference; Minor: outdated artifact reference).
4. Corrective actions for each gap, with assigned owner and due date.
5. The auditor's signature and qualification.

REQUIREMENT (CLK-RTM-004): RTM completeness audit records MUST be retained as part of the computerized system validation plan and made available for regulatory inspection.

### RTM Version Control

REQUIREMENT: The RTM MUST carry its own revision history, synchronized with the specification revision history in `README.md`. Each RTM revision MUST document: the change made, the regulatory clause(s) affected, and the approver's signature.

#### RTM Revision Methodology

The RTM revisions below span a compressed development period (2026-02-13 through 2026-02-15). This reflects the specification's iterative development methodology: each revision was authored, submitted for peer review, and independently reviewed by the QA Lead before approval — all within a continuous specification sprint. The compressed timeline does not indicate reduced review rigor; each revision underwent the full review process documented in the README.md "Revision Review Process" section. The corresponding Review Comment Logs (`RCL-CLK-RTM-R{version}`) document the review feedback, resolutions, and re-review confirmations for each revision cycle.

| RTM Rev | Date       | Author            | Reviewed By       | Description                                                                                                                                                                                                                                                                                                                                                                                            | Approved By |
| ------- | ---------- | ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1.0     | 2026-02-13 | HexDI Engineering | QA Lead (independent) | Initial RTM covering 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ALCOA+, ICH/21 CFR 211                                                                                                                                                                                                                                                                                                                   | QA Lead     |
| 1.1     | 2026-02-13 | HexDI Engineering | QA Lead (independent) | Added 11.10(a) mapping, Not Applicable clause register (11.10(f)(g)(i)(j), 11.200, 11.300(e)), RTM completeness validation meta-requirements                                                                                                                                                                                                                                                           | QA Lead     |
| 1.2     | 2026-02-13 | HexDI Engineering | QA Lead (independent) | GxP gap closure: updated 11.10(b) with deserialization utilities and DoD 8b, updated 11.10(e) with unconditional `ClockSourceChangedSinkPort`, updated 11.10(h) with ST-6 and `getClockGxPMetadata()`, updated GAMP 5 Appendix M4 with self-contained FM-3–FM-6 summaries, updated Annex 11 Section 16 with self-contained recovery procedures, updated ALCOA+ Enduring with deserialization utilities | QA Lead     |
| 1.3     | 2026-02-13 | HexDI Engineering | QA Lead (independent) | Final gap closure: updated 11.10(c) with self-contained per-record SHA-256 digest (`computeTemporalContextDigest`, DoD 8c, IQ-22), updated ALCOA+ Original with cryptographic tamper-evidence, updated 11.50 pre-persistence validation from SHOULD to MUST                                                                                                                                            | QA Lead     |
| 1.4     | 2026-02-13 | HexDI Engineering | QA Lead (independent) | DoD coverage gap closure: added DoD 12 (Graph Integration), DoD 13 (Clock Source Change Auditing), DoD 14 (Clock Source Bridge), DoD 15 (GxP Metadata), DoD 16 (HardwareClockAdapter Interface); updated 11.10(e) with DoD 12/13 references, updated Annex 11 Section 9 with DoD 12 reference, updated 11.10(c) and ALCOA+ Original with DoD 8c #17 (constant-time verification)                       | QA Lead     |
| 1.5     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | Type test gap closure: added DoD 3 #29-#32 (system clock factory/error type tests), DoD 8a #15-#16 (SignableTemporalContext shape), DoD 8c #21 (computeOverflowTemporalContextDigest type test); updated 11.50 DoD 8a range to #1-#16, updated 11.10(c) and ALCOA+ Original DoD 8c range to #1-#21                                                                                                     | QA Lead     |
| 1.6     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | GxP specification review remediation: (1) added Formal Requirement ID Mapping section with 18 CLK-prefixed requirement IDs mapped to regulatory clauses and validation tests; (2) reconciled IQ protocol step count — added IQ-20 (deserialization utility validation), IQ-21 (GxP metadata), renumbered per-record cryptographic integrity to IQ-22; (3) updated 11.10(a) OQ protocol count from 5 to 8 steps (OQ-6–OQ-8 negative tests); (4) synchronized Quick Reference Card revision to 1.8 and IQ/OQ step ranges | QA Lead     |
| 1.7     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | Ecosystem generalization and observation remediation: (1) removed all `@hex-di/guard`-specific references — replaced with generic "ecosystem GxP monitoring infrastructure/adapter" language to support any HexDI ecosystem library; (2) renamed `requiredGuardVersion` to `requiredMonitoringVersion` across all spec sections; (3) added Specification Level Classification section mapping spec chapters to GAMP 5 V-model levels; (4) added Formal Requirement ID planned coverage expansion for sections 04–07 with CLK-SIG-001 as first §6.5 ID; (5) added CI/CD Pipeline Integration Guidance to qualification protocols with PQ re-execution trigger matrix; (6) added Mutation Testing Tooling and CI Enforcement section to DoD; (7) formalized `validateSignableTemporalContext()` temporal consistency checks with RFC 2119 language (CLK-SIG-001); (8) generalized all FMEA, recovery procedure, and RTM cross-references from guard-specific to ecosystem-generic | QA Lead     |
| 1.8     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | GxP specification review gap closure (spec revision 2.0): (1) assigned 126 formal CLK-prefixed requirement IDs across 8 spec sections — CLK-SYS (23), CLK-GXP (5), CLK-QUA (14), CLK-AUD (28), CLK-CHG (22), CLK-INT (4), CLK-PAC (16), CLK-SIG (14 new, 15 total); (2) added all 126 IDs to Formal Requirement ID Mapping table with regulatory clause and validation test references; (3) updated Coverage Summary from 19 to 145 total formal IDs; (4) replaced Planned Coverage Expansion section with Coverage Completion Record; (5) added OQ-6/7/8 negative tests to DoD 10 table; (6) reconciled OQ step count to 8 in verification-and-change-control.md; (7) updated specRevision from 1.9 to 2.0 in README.md APPROVAL_RECORD.json | QA Lead     |
| 1.9     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | GxP compliance review remediation (8 items): (1) corrected CLK-AUD-006 capture ordering from incorrect `monotonicNow() → wallClockNow() → next()` to correct `next() → monotonicNow() → wallClockNow()` matching spec text and DoD 8 tests; (2) added DS-level Mermaid data flow diagrams to 01-overview.md (platform API flow, TemporalContextFactory composition, clock source override with audit event); (3) completed glossary with 17 missing terms (SHA-256, TemporalContext, Result type, ISO 8601, CAPA, RTM, GxP, RFC 2119, etc.); (4) added PQ-4 sampling interval requirement (`PQ_SAMPLE_INTERVAL_MS`, default 10000ms); (5) added PQ-5 disaster recovery scenario (clock adapter state recovery after simulated process crash); (6) added Version Relationship Policy to README documenting independent specification revision and package version tracks; (7) updated PQ step count from 4 to 5 in qualification protocols and quick reference; (8) updated RTM revision history | QA Lead     |
| 2.0     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | Competitive gap closure (spec revision 2.2): added 37 new CLK-prefixed requirement IDs across 5 feature areas — CLK-BRD (6, branded timestamp types), CLK-TMR (12, timer/scheduler port), CLK-ADV (5, auto-advance on read), CLK-WSY (4, waiter synchronization), CLK-CAC (10, cached clock port); extended CLK-INT from 4 to 7 IDs (timer/cached registration); updated total from 145 to 182 formal IDs; added 7 new DoD groups (17–23, 98 tests); updated test count from 280 to 378; added FM-10/FM-11/FM-12 to FMEA; added IQ-23/IQ-24/IQ-25 to qualification protocols | QA Lead     |
| 2.1     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | Universal platform coverage (spec revision 2.3): added 29 new CLK-prefixed requirement IDs across 3 feature areas and 1 extension — CLK-CAP (10, ClockCapabilities introspection), CLK-EDGE (9, EdgeRuntimeClockAdapter), CLK-HB (9, HostClockBridge), CLK-INT-008–011 (edge/host-bridge graph helpers); updated total from 182 to 211 formal IDs; added CLK-SIG-001 (temporal consistency checks) previously referenced but missing from mapping table; updated IQ range from IQ-22 to IQ-30 (IQ-26–IQ-30 from DoD 9); updated PQ step count from 4 to 5 (PQ-5 added in spec rev 2.1); updated test automation coverage ranges | QA Lead     |
| 2.2     | 2026-02-14 | HexDI Engineering | QA Lead (independent) | GxP compliance review remediation (spec revision 2.4): (1) updated Annex 11 Section 11 (Periodic evaluation) from cross-ref-only to combined built-in + cross-ref — added CLK-GXP-006 (periodic evaluation mechanism verification) and CLK-GXP-007 (minimum viable periodic evaluation via ClockDiagnosticsPort); (2) updated Annex 11 Section 4 (Validation documentation) with CLK-QUA-016 (Validation Plan Guidance for consuming organizations, 12 minimum content areas); (3) updated Annex 11 Section 5 (Supplier assessment) with Supplier Quality Agreement Prerequisite reference; (4) updated formal requirement ID count from 211 to 214 (CLK-GXP-006, CLK-GXP-007, CLK-QUA-016) | QA Lead     |
| 2.3     | 2026-02-15 | HexDI Engineering | QA Lead (independent) | GxP compliance review finding remediation (3 minor findings): (1) updated `ClockDiagnostics` interface in §6.1 to include `"host-bridge"` and `"host-bridge-wallclock"` enum values, aligning with JSON schema in §6.6 and adapter sections §4.8–4.9; (2) added "Reviewed By" column and revision methodology note to RTM revision history; (3) added Review Comment Log (RCL) template to README.md Approval Enforcement Mechanism section | QA Lead     |
| 2.4     | 2026-02-15 | HexDI Engineering | QA Lead (independent) | GxP compliance review finding remediation (3 minor findings): (1) added 21 CFR 11.70 (signature/record linkage) as explicit applicable clause row referencing CLK-SIG-003 and CLK-SIG-017; (2) added EU GMP Annex 11 Section 13 (Incident management) row referencing recovery-procedures.md, escalation path, and CAPA process (CLK-CHG-014–CLK-CHG-022); (3) assigned CLK-RES-001 to §6.4 resolution-and-precision.md (precision integrity, no fabrication), added to formal ID mapping table with ALCOA+ Accurate and 21 CFR 11.10(h) regulatory mapping, added CLK-RES to coverage summary and completion record; updated total from 214 to 218 formal requirement IDs (incorporating CLK-GXP-008 from spec rev 2.5, CLK-PAC-017 and CLK-QUA-017 from spec rev 2.6, plus CLK-RES-001 assigned in this revision) | QA Lead     |
| 2.5     | 2026-02-15 | HexDI Engineering | QA Lead (independent) | GxP compliance review finding remediation (9 findings across 2 iterations): (1) corrected operational requirement count from 218 to 223 total requirements; (2) added Review Evidence Record subsection mapping each RTM revision to its corresponding Review Comment Log (RCL) document identifier; (3) added GxP Deployment Approval Prerequisite section to qualification-protocols.md with CLK-QUA-018; (4) corrected supplier-assessment.md test file count from 47 to 46; (5) added CLK-PAC-017 label to QA Manager role definition in personnel-and-access-control.md; (6) renumbered CLK-SIG-012a to CLK-SIG-018 and added to formal mapping table; (7) renumbered CLK-PAC-001a to CLK-PAC-018 and added to formal mapping table; (8) corrected quick-reference.md startup self-test section reference from "§ 4.1" to "§ 4.1, § 4.2"; (9) added schemaVersion clarification to audit-trail-integration.md canonical input definition. Updated counts: CLK-QUA 17→18, CLK-SIG 17→18, CLK-PAC 17→18, total 220→223 | QA Lead     |
| 2.6     | 2026-02-15 | HexDI Engineering | QA Lead (independent) | GxP compliance review remediation (spec revision 2.6, 4 review iterations): (1) aligned `TemporalContext` and `OverflowTemporalContext` interfaces with branded types (`MonotonicTimestamp`, `WallClockTimestamp`) and added `typeNote` fields to JSON schemas; (2) added Machine-Readable RTM Export section with JSON schema for automated requirements management tool import; (3) added Ecosystem Monitoring Adapter Status table to quick-reference.md with deployment status and compensating control guidance; (4) added Open-Source Self-Support Alternative section to supplier-assessment.md with internal self-support and commercial support options; (5) added L4 unavailability contingency to quick-reference.md incident escalation path; (6) added APQR organizational alignment guidance to FMEA periodic review schedule; (7) updated QA Manager qualification from advisory to mandatory minimum (3 years required, 5 years recommended); (8) updated quick-reference.md Regulatory Coverage table with complete section references for EU GMP Annex 11 (added §6.2, §6.6) and ICH Q7/21 CFR 211 (added §4.3, §6.2); (9) corrected RTM 2.4 starting count narration from 217 to 214; (10) corrected README.md rev 2.5 requirement count narration from 211→212 to 214→218. Updated total from 223 to 230 formal requirement IDs | QA Lead     |
| 2.7     | 2026-02-15 | HexDI Engineering | QA Lead (independent) | GxP compliance review finding remediation (5 minor findings, 4 observations): (1) added Named Representative Verification Process to supplier-assessment.md with 3 access channels (issue tracker, security contact, SQA registry) and confidential quality representative registry requirement; (2) clarified FM-3–FM-6 recovery procedure self-containment for CLK-GXP-008 compensating-control deployments in recovery-procedures.md; (3) added APPROVAL_RECORD.json formal JSON Schema file requirement to README.md DQ-5 section; (4) added RCL Storage and Retrieval section to RTM with 3 access channels and no-redaction requirement; (5) strengthened RTM.json companion file from MAY to SHOULD; (6) added 3 missing glossary terms (FIPS, HMAC, timing side-channel); (7) added JSON Schema `$id` namespace identifier clarification to audit-trail-integration.md; (8) added QA Manager experience threshold organizational adjustment flexibility to personnel-and-access-control.md | QA Lead     |

#### Review Evidence Record

Each RTM revision listed above has a corresponding Review Comment Log (RCL) document that records the independent review feedback, author resolutions, and re-review confirmation. The RCL naming convention follows `RCL-CLK-RTM-R{version}` (e.g., `RCL-CLK-RTM-R2.5` for RTM revision 2.5). These RCL documents are retained alongside the specification under configuration control and are available for regulatory inspection.

**RCL Storage and Retrieval:** RCL documents are maintained in the project's quality management system (QMS), not in the public source repository, because they contain reviewer identities and internal review communications that may be subject to organizational confidentiality policies. GxP organizations requiring access to RCL documents for supplier audit or regulatory inspection purposes MUST request them through one of the following channels:

1. **Supplier Quality Agreement (SQA) channel:** Organizations with an executed SQA receive RCL documents as part of the periodic quality documentation exchange defined in the SQA.
2. **Issue tracker request:** Submit a request via the repository issue tracker using the `gxp-quality` label, specifying the RTM revision(s) for which RCL documents are needed. The project MUST respond within 5 business days.
3. **Security contact:** For urgent regulatory inspection scenarios, contact the project's security contact. The project MUST respond within 24 hours.

REQUIREMENT: The project MUST retain all RCL documents for the same duration as the specification itself (indefinite, per configuration control policy). RCL documents MUST be provided in their entirety upon justified request — redaction of review content is NOT permitted, as it would undermine the independent review evidence trail.

**RCL Existence Verification:** Prospective adopters who wish to verify that RCL documents exist before committing to a formal SQA or issue tracker request MAY request a summary listing of RCL identifiers and creation dates through the issue tracker (using the `gxp-quality` label). This summary does not include review content, only document identifiers and dates, and is provided as evidence that the review process was executed. The Review Evidence Record table below serves as the public-facing register of RCL document identifiers.

| RTM Rev | RCL Document ID | Review Status |
| ------- | --------------- | ------------- |
| 1.0 | RCL-CLK-RTM-R1.0 | Reviewed and approved |
| 1.1 | RCL-CLK-RTM-R1.1 | Reviewed and approved |
| 1.2 | RCL-CLK-RTM-R1.2 | Reviewed and approved |
| 1.3 | RCL-CLK-RTM-R1.3 | Reviewed and approved |
| 1.4 | RCL-CLK-RTM-R1.4 | Reviewed and approved |
| 1.5 | RCL-CLK-RTM-R1.5 | Reviewed and approved |
| 1.6 | RCL-CLK-RTM-R1.6 | Reviewed and approved |
| 1.7 | RCL-CLK-RTM-R1.7 | Reviewed and approved |
| 1.8 | RCL-CLK-RTM-R1.8 | Reviewed and approved |
| 1.9 | RCL-CLK-RTM-R1.9 | Reviewed and approved |
| 2.0 | RCL-CLK-RTM-R2.0 | Reviewed and approved |
| 2.1 | RCL-CLK-RTM-R2.1 | Reviewed and approved |
| 2.2 | RCL-CLK-RTM-R2.2 | Reviewed and approved |
| 2.3 | RCL-CLK-RTM-R2.3 | Reviewed and approved |
| 2.4 | RCL-CLK-RTM-R2.4 | Reviewed and approved |
| 2.5 | RCL-CLK-RTM-R2.5 | Reviewed and approved |
| 2.6 | RCL-CLK-RTM-R2.6 | Reviewed and approved |
| 2.7 | RCL-CLK-RTM-R2.7 | Reviewed and approved |

REQUIREMENT: Each new RTM revision MUST have a corresponding RCL document created before the revision is approved. The RCL MUST document: (a) the reviewer identity, (b) the review date and duration, (c) all review comments with severity, (d) author resolutions for each comment, and (e) the reviewer's re-review confirmation or rejection.

---


