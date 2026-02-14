# HexDI Clock Specification

**Package:** `@hex-di/clock`
**Version:** 0.1.0
**Status:** Approved
**Created:** 2026-02-12
**Last Updated:** 2026-02-13

---

## Document Control

| Field               | Value                                   |
| ------------------- | --------------------------------------- |
| **Document Number** | SPEC-CLK-001                            |
| **Revision**        | 1.6                                     |
| **Classification**  | GxP-Applicable Software Specification   |
| **GAMP 5 Category** | Category 5 (Custom Software)            |
| **Author**          | HexDI Engineering                       |
| **Reviewer**        | QA / Regulatory Affairs                 |
| **Approver**        | Quality Assurance Lead                  |
| **Effective Date**  | 2026-02-13                              |
| **Review Period**   | Annual or upon re-qualification trigger |

### Revision History

| Rev | Date       | Author            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Approved By |
| --- | ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 0.1 | 2026-02-12 | HexDI Engineering | Initial draft                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | --          |
| 0.2 | 2026-02-13 | HexDI Engineering | GxP compliance sections, IQ/OQ/PQ protocols, ALCOA+ mapping                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | --          |
| 1.0 | 2026-02-13 | HexDI Engineering | Formal approval: added document control, RTM, supplier assessment, glossary, FMEA, electronic signature binding, personnel qualification, serialization requirements                                                                                                                                                                                                                                                                                                                                                                                                                                                  | QA Lead     |
| 1.1 | 2026-02-13 | HexDI Engineering | GxP gap remediation: added ST-5 startup consistency check (FM-9 RPN 90→36), added 21 CFR 11.100/11.300 cross-references, added data archival and backup requirements (ALCOA+ Enduring), added IQ-19, updated RTM and FMEA                                                                                                                                                                                                                                                                                                                                                                                             | QA Lead     |
| 1.2 | 2026-02-13 | HexDI Engineering | GxP compliance review remediation: added `validateSignableTemporalContext()` utility (21 CFR 11.50 runtime enforcement), compound failure analysis in FMEA (ICH Q9 interaction assessment), `HardwareClockAdapter` interface for air-gapped environments, emergency change control procedure, updated RTM, DoD, and API reference                                                                                                                                                                                                                                                                                     | QA Lead     |
| 1.3 | 2026-02-13 | HexDI Engineering | GxP audit-readiness remediation: added Not Applicable clause register (11.10(f)(g)(i)(j), 11.200, 11.300(e)) with justification, RTM completeness validation meta-requirements, personnel re-training frequency schedule, quality management representative in supplier assessment, CAPA closeout criteria for emergency change control, formal specification approval record with independent QA review                                                                                                                                                                                                              | QA Lead     |
| 1.4 | 2026-02-13 | HexDI Engineering | Documentation quality remediation: hierarchical section numbering (chapter.section scheme replacing flat numbering with 12a/13a suffixes), GxP Quick Reference Card for auditor navigation, formal approval record converted to signable template with explicit fields for named individuals                                                                                                                                                                                                                                                                                                                          | QA Lead     |
| 1.5 | 2026-02-13 | HexDI Engineering | GxP gap closure (5 items): (1) schema migration strategy with `deserializeTemporalContext()` / `deserializeOverflowTemporalContext()` / `deserializeClockDiagnostics()` utilities; (2) `requiredGuardVersion` field with `getClockGxPMetadata()` and ST-6 guard co-deployment warning; (3) unconditional clock source change auditing via `ClockSourceChangedSinkPort` (container-independent); (4) DQ-5 pre-deployment approval record verification with `APPROVAL_RECORD.json` schema; (5) self-contained FM-3–FM-6 recovery procedure summaries. Updated RTM, DoD (DoD 8b, IQ-20, IQ-21, DQ-5), and API reference. | QA Lead     |
| 1.6 | 2026-02-13 | HexDI Engineering | Final GxP gap closure (2 items): (1) self-contained per-record cryptographic integrity via `computeTemporalContextDigest()` / `computeOverflowTemporalContextDigest()` / `verifyTemporalContextDigest()` (SHA-256, 21 CFR 11.10(c), ALCOA+ Original) — eliminates dependency on `@hex-di/guard` for individual record tamper detection; (2) upgraded `validateSignableTemporalContext()` from SHOULD to MUST for GxP pre-persistence (21 CFR 11.50 enforcement). Updated RTM, DoD (DoD 8c, IQ-22), API reference, Quick Reference Card.                                                                               | QA Lead     |

### Formal Specification Approval Record

This specification has been independently reviewed and approved by the following signatories. Each signatory confirms that the specification sections within their review scope are complete, accurate, and suitable for guiding GxP-compliant implementation.

| Signatory Role                  | Review Scope                                                                                                                              | Approval Statement                                                                                                                                                                                                                                             | Printed Name / Title       | Signature                  | Date                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- | ---------------------- |
| **Specification Author**        | All sections (01–09)                                                                                                                      | I confirm that this specification accurately represents the intended design and behavior of `@hex-di/clock` v0.1.0.                                                                                                                                            | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |
| **Independent QA Reviewer**     | GxP compliance sections (06/\*), RTM, FMEA, IQ/OQ/PQ protocols, DoD                                                                       | I confirm that the GxP compliance sections adequately address 21 CFR Part 11, EU GMP Annex 11, GAMP 5, and ALCOA+ requirements within the defined scope. I have verified the RTM completeness, the FMEA risk scoring, and the qualification protocol coverage. | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |
| **Technical Reviewer**          | Clock port (02), sequence generator (03), platform adapters (04), testing (05), API reference (08)                                        | I confirm that the technical design is implementable, the API surface is consistent with HexDI conventions, and the platform compatibility matrix is accurate.                                                                                                 | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |
| **Regulatory Affairs Reviewer** | ALCOA+ mapping (§ 6.5), electronic signature binding (§ 6.5, 21 CFR 11.50), personnel qualification (§ 6.10), supplier assessment (§ 6.9) | I confirm that the regulatory cross-references are accurate, the ALCOA+ mapping is complete, and the personnel/supplier requirements are consistent with current regulatory expectations.                                                                      | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |

REQUIREMENT: This approval record is a **template**. GxP deployments MUST complete all blank fields before the specification is considered formally approved. Each signatory MUST provide: their full legal name, their organizational title, a handwritten or electronic signature (per 21 CFR 11.50 if electronic), and the date of signature. Generic role titles alone are NOT acceptable as signatures for GxP use.

REQUIREMENT: Each signatory MUST have documented qualification for their review scope (see § 6.10 for role qualifications). The qualification evidence MUST be available for regulatory inspection alongside this approval record.

REQUIREMENT: If any signatory identifies a material concern during review, the concern MUST be documented in a review comment log, resolved by the specification author, and re-reviewed by the raising signatory before approval is granted. The review comment log MUST be retained as part of the validation evidence package.

REQUIREMENT: This approval record MUST be re-executed (all signatories must re-review and re-approve) whenever the specification undergoes a major revision (integer revision number change, e.g., 1.x → 2.0). Minor revisions (e.g., 1.2 → 1.3) require re-approval only by the signatories whose review scope is affected by the change.

### Pre-Deployment Approval Verification (DQ-5)

To prevent GxP deployment of the library against an unsigned specification, the Deployment Qualification checklist includes a machine-verifiable approval record check.

REQUIREMENT: GxP deployments MUST maintain a companion file `spec/clock/APPROVAL_RECORD.json` containing the completed approval record in structured form:

```json
{
  "schemaVersion": 1,
  "specDocument": "SPEC-CLK-001",
  "specRevision": "1.6",
  "approvals": [
    {
      "role": "Specification Author",
      "printedName": "Jane Smith",
      "title": "Senior Software Engineer",
      "date": "2026-02-13",
      "signatureMethod": "electronic",
      "signatureReference": "SIG-2026-0213-001"
    }
  ],
  "reviewCommentLogReference": "RCL-CLK-001-R1.6",
  "approvalComplete": true
}
```

REQUIREMENT: DQ-5 MUST verify that:

1. `APPROVAL_RECORD.json` exists and is valid JSON.
2. `specRevision` matches the current specification revision in `README.md`.
3. `approvalComplete` is `true`.
4. At least 4 approvals are present (one per signatory role).
5. Each approval has non-empty `printedName`, `title`, `date`, and `signatureReference` fields.
6. All `date` fields are not in the future.

REQUIREMENT: DQ-5 failure MUST block GxP deployment. The DQ checklist MUST NOT be signed as complete if any DQ step fails.

REQUIREMENT: `APPROVAL_RECORD.json` MUST NOT be committed to the library's source repository. It is a deployment-specific artifact maintained by each GxP organization as part of their computerized system validation package. The JSON schema above is provided as a template; organizations MAY extend it with additional fields.

### Distribution List

| Role                    | Responsibility                           |
| ----------------------- | ---------------------------------------- |
| Development Team        | Implementation per specification         |
| QA / Regulatory Affairs | Validation plan alignment, audit support |
| Infrastructure / DevOps | Deployment qualification (DQ checklist)  |
| GxP Auditors            | Regulatory inspection reference          |

---

## Summary

`@hex-di/clock` provides a foundational, GxP-compliant clock and sequence generation abstraction for the HexDI ecosystem. It unifies the fragmented timing implementations currently spread across `@hex-di/runtime`, `@hex-di/tracing`, and `@hex-di/query` into a single injectable port with platform-specific adapters.

The package addresses GxP compliance finding m-01 (monotonic clock resolution not specified) by defining explicit resolution requirements and making the clock source injectable for both production NTP-validated deployments and deterministic testing.

## Packages

| Package         | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `@hex-di/clock` | Clock port, sequence generator port, and platform adapters |

## Dependencies

| Dependency       | Relationship                               |
| ---------------- | ------------------------------------------ |
| `@hex-di/result` | Return types for fallible clock operations |
| `@hex-di/core`   | Port definition patterns (directed ports)  |

## Consumers (Migration Targets)

| Package               | Current Implementation                            | Migrates To                       |
| --------------------- | ------------------------------------------------- | --------------------------------- |
| `@hex-di/runtime`     | `monotonicNow()` in `util/monotonic-time.ts`      | `ClockPort.monotonicNow()`        |
| `@hex-di/tracing`     | `getHighResTimestamp()` in `utils/timing.ts`      | `ClockPort.highResNow()`          |
| `@hex-di/query`       | Local `Clock` interface in `cache/query-cache.ts` | `ClockPort.wallClockNow()`        |
| `@hex-di/logger`      | Raw `Date.now()` calls                            | `ClockPort.wallClockNow()`        |
| `@hex-di/saga`        | Raw `Date.now()` calls                            | `ClockPort.wallClockNow()`        |
| `@hex-di/store`       | Raw `Date.now()` calls in inspector               | `ClockPort.wallClockNow()`        |
| `@hex-di/http-client` | Spec references `monotonicNow()`                  | `ClockPort.monotonicNow()`        |
| `@hex-di/guard`       | Requires NTP-synchronized clock source            | `NtpClockAdapter` via `ClockPort` |

## Table of Contents

### [01 - Overview](./01-overview.md)

1.1 [Overview](./01-overview.md#11-overview)
1.2 [Design Principles](./01-overview.md#12-design-principles)
1.3 [Package Structure](./01-overview.md#13-package-structure)

### [02 - Clock Port](./02-clock-port.md)

2.1 [ClockPort Interface](./02-clock-port.md#21-clockport-interface)
2.2 [Monotonic Time](./02-clock-port.md#22-monotonic-time)
2.3 [Wall-Clock Time](./02-clock-port.md#23-wall-clock-time)
2.4 [High-Resolution Time](./02-clock-port.md#24-high-resolution-time)

### [03 - Sequence Generator](./03-sequence-generator.md)

3.1 [SequenceGeneratorPort Interface](./03-sequence-generator.md#31-sequencegeneratorport-interface)
3.2 [Ordering Guarantees](./03-sequence-generator.md#32-ordering-guarantees)
3.3 [Scoped Sequences](./03-sequence-generator.md#33-scoped-sequences)

### [04 - Platform Adapters](./04-platform-adapters.md)

4.1 [SystemClockAdapter](./04-platform-adapters.md#41-systemclockadapter)
4.2 [Platform Detection](./04-platform-adapters.md#42-platform-detection)
4.3 [HardwareClockAdapter Interface](./04-platform-adapters.md#43-hardwareclockadapter-interface)
4.4 [Resolution Constraints](./04-platform-adapters.md#44-resolution-constraints)
4.5 [Performance Budget](./04-platform-adapters.md#45-performance-budget)

### [05 - Testing Support](./05-testing-support.md)

5.1 [VirtualClockAdapter](./05-testing-support.md#51-virtualclockadapter)
5.2 [VirtualSequenceGenerator](./05-testing-support.md#52-virtualsequencegenerator)
5.3 [Deterministic Testing Patterns](./05-testing-support.md#53-deterministic-testing-patterns)

### [06 - GxP Compliance](./06-gxp-compliance/README.md)

- **[GxP Quick Reference Card](./06-gxp-compliance/quick-reference.md)** — Auditor navigation guide

  6.1 [Clock Source Requirements](./06-gxp-compliance/clock-source-requirements.md) (includes NTP boundary)
  6.2 [Qualification Protocols](./06-gxp-compliance/qualification-protocols.md)
  6.3 [Verification and Change Control](./06-gxp-compliance/verification-and-change-control.md)
  6.4 [Resolution and Precision](./06-gxp-compliance/resolution-and-precision.md)
  6.5 [ALCOA+ Mapping](./06-gxp-compliance/alcoa-mapping.md)
  6.6 [Audit Trail Integration](./06-gxp-compliance/audit-trail-integration.md)
  6.7 [Recovery Procedures](./06-gxp-compliance/recovery-procedures.md) (FM-1, FM-2; FM-3–FM-6 in guard spec)
  6.8 [Requirements Traceability Matrix](./06-gxp-compliance/requirements-traceability-matrix.md)
  6.9 [Supplier Assessment](./06-gxp-compliance/supplier-assessment.md)
  6.10 [Personnel Qualification and Access Control](./06-gxp-compliance/personnel-and-access-control.md)
  6.11 [FMEA Risk Analysis](./06-gxp-compliance/fmea-risk-analysis.md)
  6.12 [Glossary](./06-gxp-compliance/glossary.md)

### [07 - Integration](./07-integration.md)

7.1 [Container Registration](./07-integration.md#71-container-registration)
7.2 [Migration Guide](./07-integration.md#72-migration-guide)
7.3 [Guard Integration](./07-integration.md#73-guard-integration)

### [08 - API Reference](./08-api-reference.md)

8.1 [Complete API](./08-api-reference.md#81-complete-api)

### [09 - Definition of Done](./09-definition-of-done.md)

9.1 [Test Organization](./09-definition-of-done.md#91-test-organization)
9.2 [DoD Items](./09-definition-of-done.md#92-dod-items)

---

## Release Scope

**v0.1.0** ships all sections (1.1–9.2).
