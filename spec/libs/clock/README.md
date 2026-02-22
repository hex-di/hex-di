# HexDI Clock Specification

**Package:** `@hex-di/clock`
**Version:** 0.1.0
**Status:** Approved
**Created:** 2026-02-12
**Last Updated:** 2026-02-19

---

## Document Control

| Field               | Value                                   |
| ------------------- | --------------------------------------- |
| **Document Number** | SPEC-CLK-001                            |
| **Revision**        | 2.9                                     |
| **Classification**  | GxP-Applicable Software Specification   |
| **GAMP 5 Category** | Category 5 (Custom Software)            |
| **Author**          | HexDI Engineering                       |
| **Reviewer**        | QA / Regulatory Affairs                 |
| **Approver**        | Quality Assurance Lead                  |
| **Effective Date**  | 2026-02-19                              |
| **Review Period**   | Annual or upon re-qualification trigger |

### Sub-Document Version Control

Individual specification files within this document set (01-overview.md through 09-definition-of-done.md and the compliance/ subdirectory) are version-controlled as part of the specification suite under this README's Document Control header. Individual sub-documents do not carry separate version numbers; their revision history is tracked through the suite-level revision history below and the Git commit history. The specification revision in the Document Control table above applies to the entire document set. When referencing a specific sub-document's version for audit purposes, cite the specification suite revision (e.g., "SPEC-CLK-001 Rev 2.9, §6.11 fmea-risk-analysis.md").

REQUIREMENT: GxP organizations MUST use the suite-level specification revision (not individual file Git commit SHAs) as the authoritative version reference in validation documentation, change control records, and audit trail references.

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
| 1.5 | 2026-02-13 | HexDI Engineering | GxP gap closure (5 items): (1) schema migration strategy with `deserializeTemporalContext()` / `deserializeOverflowTemporalContext()` / `deserializeClockDiagnostics()` utilities; (2) `requiredMonitoringVersion` field with `getClockGxPMetadata()` and ST-6 monitoring co-deployment warning; (3) unconditional clock source change auditing via `ClockSourceChangedSinkPort` (container-independent); (4) DQ-5 pre-deployment approval record verification with `APPROVAL_RECORD.json` schema; (5) self-contained FM-3–FM-6 recovery procedure summaries. Updated RTM, DoD (DoD 8b, IQ-20, IQ-21, DQ-5), and API reference. | QA Lead     |
| 1.6 | 2026-02-13 | HexDI Engineering | Final GxP gap closure (2 items): (1) self-contained per-record cryptographic integrity via `computeTemporalContextDigest()` / `computeOverflowTemporalContextDigest()` / `verifyTemporalContextDigest()` (SHA-256, 21 CFR 11.10(c), ALCOA+ Original) — eliminates dependency on external libraries for individual record tamper detection; (2) upgraded `validateSignableTemporalContext()` from SHOULD to MUST for GxP pre-persistence (21 CFR 11.50 enforcement). Updated RTM, DoD (DoD 8c, IQ-22), API reference, Quick Reference Card.                                                                               | QA Lead     |
| 1.7 | 2026-02-14 | HexDI Engineering | GxP specification review remediation (10 items): (1) finalized DoD test counts from estimates to exact enumeration; (2) added self-contained FM-3–FM-6 immediate operator action summaries with formal ecosystem monitoring cross-references; (3) added PQ parameter workload justification requirement; (4) this revision timeline documentation; (5) added RPN action threshold to FMEA methodology; (6) added `requiredMonitoringVersion` to `ClockGxPMetadata` API surface and ST-6 monitoring co-deployment warning; (7) added minimum platform version requirements to compatibility matrix; (8) added `createProcessInstanceId()` recommended pattern for multi-process deployments; (9) added non-binding retention period guidance note to ALCOA+ Enduring; (10) updated overall test count. | QA Lead     |
| 1.8 | 2026-02-14 | HexDI Engineering | GxP compliance review remediation (8 items): (M-1) added Combined Specification Approach section with GAMP 5/ICH Q9 risk-based justification for combined URS/FS/DS format, content-level specification markers, and extraction guidance for organizations requiring separate documents; (M-2) added Data Retention Responsibility Statement to `audit-trail-integration.md` with explicit delegation to consuming applications, retention period reference table by record type (21 CFR 211.180, 21 CFR 820.180, ICH E6(R2)), and three binding requirements; (M-3) added Approval Enforcement Mechanism section to README documenting the layered approval evidence model (signed Git tags, `APPROVAL_RECORD.json`, Review Comment Log); (m-1) assigned formal CLK-prefixed requirement IDs to all 16 inline REQUIREMENT statements in sections 02-03 (CLK-MON-001/002, CLK-WCK-001, CLK-HRS-001/002/003, CLK-SEQ-001–005, CLK-ORD-001, CLK-MPC-001–006); (m-2) added 3 negative OQ test cases (OQ-6: GxP mode rejection with unfrozen APIs, OQ-7: SequenceOverflowError propagation under concurrent load, OQ-8: startup self-test failure with implausible wall-clock); (m-3) added Ecosystem Monitoring Cross-Reference Table for FM-3–FM-6 in `recovery-procedures.md` with monitoring adapter capabilities and FMEA RPN scores; (m-4) added Supplier Assessment Scope section to `supplier-assessment.md` clarifying internal `@hex-di` packages (not external suppliers, validated as integrated system) vs external platform APIs (assessed per compatibility matrix); (m-5) added Rollback Verification Procedure to `verification-and-change-control.md` with 5-step rollback process including full IQ, abbreviated OQ, QA approval, emergency period data assessment, and post-rollback monitoring. | QA Lead     |
| 1.9 | 2026-02-14 | HexDI Engineering | GxP specification review remediation (8 findings): (F-1, Major) added `specRevision: string` to `ClockGxPMetadata` interface, API reference, and DoD 15 tests — closes IQ-21/API traceability gap; (F-2) rewrote OQ-8 test mechanism to describe platform API mocking instead of VirtualClockAdapter injection, added clarification note distinguishing platform mocking from virtual adapter use; (F-3) updated DQ-5 `APPROVAL_RECORD.json` example `specRevision` to `"1.9"` matching current revision; (F-4) added sink-throw resilience test to DoD 13 verifying that a throwing `onClockSourceChanged` sink does not disrupt the adapter override (21 CFR 11.10(e) behavioral contract #3); (F-5) clarified `createProcessInstanceId()` status as a consumer-side recommended pattern, not a library export, in §3.3; (F-6) added Consumer Diagnostic Integration Guidance to RTM noting procedural verification gaps and recommended consumer-facing runtime assertions; (F-7) added CFM-6 compound failure scenario (FM-4 API tampering + FM-3 NTP desync) to FMEA compound analysis; (F-8) OQ-8 mocking mechanism note addressed by F-2. Updated RTM revision history, DoD test counts, Quick Reference Card revision. | QA Lead     |
| 2.0 | 2026-02-14 | HexDI Engineering | Ecosystem generalization and GxP observation remediation (8 items): (1) removed all `@hex-di/guard`-specific references throughout the specification — replaced with generic "ecosystem GxP monitoring infrastructure/adapter" language enabling any HexDI ecosystem library to fulfill the monitoring role; (2) renamed `requiredGuardVersion` API field to `requiredMonitoringVersion` across all spec sections, API reference, DoD, and qualification protocols; (3) formalized `highResNow()` monotonicity contract with RFC 2119 language (Finding 1); (4) updated digest verification guidance to persist full `TemporalContextDigest` including `canonicalInput` (Finding 2); (5) formalized ST-6 advisory-only justification with graph construction ordering rationale (Finding 3); (6) added Specification Level Classification to RTM mapping spec chapters to GAMP 5 V-model levels (Observation 4); (7) added Formal Requirement ID planned expansion tracking for sections 04–07 with CLK-SIG-001 (Observation 5); (8) added CI/CD Pipeline Integration Guidance with PQ re-execution trigger matrix (Observation 6); (9) added Mutation Testing Tooling and CI Enforcement section to DoD with Stryker configuration requirements (Observation 7); (10) formalized `validateSignableTemporalContext()` temporal consistency checks with RFC 2119 mandatory thresholds (Observation 8). Updated RTM revision history. | QA Lead     |
| 2.1 | 2026-02-14 | HexDI Engineering | GxP compliance review gap closure (8 items): (1) corrected CLK-AUD-006 capture ordering in RTM from incorrect `monotonicNow() → wallClockNow() → next()` to correct `next() → monotonicNow() → wallClockNow()` matching spec text and DoD 8 tests; (2) added DS-level Mermaid data flow diagrams to 01-overview.md §1.3 (platform API → adapter → ClockPort → consumer, TemporalContextFactory composition with capture ordering, clock source override sequence with audit event); (3) expanded glossary from 29 to 46 terms — added 17 missing technical terms (SHA-256, TemporalContext, Result type, ISO 8601, mutation testing, platform API capture, startup self-test, constant-time comparison, etc.) and regulatory terms (CAPA, RTM, GxP, RFC 2119, data retention period, electronic signature binding, validation plan); (4) added PQ-4 sampling interval parameter `PQ_SAMPLE_INTERVAL_MS` (default 10000ms) to qualification protocols; (5) added PQ-5 disaster recovery scenario (adapter state recovery after simulated process crash); (6) added Version Relationship Policy to README documenting independent specification revision and package version tracks with traceability via `getClockGxPMetadata()`; (7) updated test count from 279 to 280 (PQ-5 addition); (8) renumbered 01-overview.md §1.3 Package Structure to §1.4, added §1.3 Data Flow Diagrams. Updated RTM revision history, quick reference card, document map. | QA Lead     |
| 2.2 | 2026-02-14 | HexDI Engineering | Competitive gap closure — 5 features closing all gaps identified in competitive analysis against Java Clock, .NET TimeProvider, NodaTime, Rust quanta, Go clockwork, and fake-timers: (1) **Branded timestamp types** (§2.5) — `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp` phantom branded types with zero runtime cost; `asMonotonic()`, `asWallClock()`, `asHighRes()` branding utilities; CLK-BRD-001–006; (2) **Timer/Sleep abstraction** (§2.6, §4.6, §5.4) — `TimerSchedulerPort` with `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `sleep`; `SystemTimerScheduler` with anti-tampering capture; `VirtualTimerScheduler` linked to VirtualClockAdapter; CLK-TMR-001–012; (3) **Auto-advance on read** (§5.1 ext) — `autoAdvance` option and `setAutoAdvance()`/`getAutoAdvance()` on VirtualClockAdapter; CLK-ADV-001–005; (4) **Waiter synchronization** (§5.4 ext) — `blockUntil()` on VirtualTimerScheduler; `ClockTimeoutError`; CLK-WSY-001–004; (5) **Cached/coarsened time** (§2.7, §4.7, §5.5) — `CachedClockPort` (structurally NOT extending ClockPort), `CachedClockLifecycle`, `CachedClockAdapter`; system and virtual factories; CLK-CAC-001–010. Cross-cutting: `provideTimerScheduler()`, `provideCachedClock()` graph helpers (CLK-INT-005–007); FM-10/FM-11/FM-12 in FMEA; IQ-23/IQ-24/IQ-25 in qualification protocols; 10 new glossary terms; 37 new formal requirement IDs (145→182); 7 new DoD groups (17–23); 98 new tests (280→378); 7 new test files (33→40). RTM revision 2.0. | QA Lead     |
| 2.3 | 2026-02-14 | HexDI Engineering | Universal platform coverage — 5 enhancements achieving 10/10 platform coverage across all JavaScript runtimes: (1) **ClockCapabilities introspection** (§2.8) — `ClockCapabilities` interface on `ClockDiagnosticsPort.getCapabilities()` reporting `hasMonotonicTime`, `hasHighResOrigin`, `crossOriginIsolated`, `estimatedResolutionMs`, `platform`, `highResDegraded`, `monotonicDegraded`; CLK-CAP-001–010; (2) **EdgeRuntimeClockAdapter** (§4.8) — dedicated adapter for V8 isolate edge runtimes (Cloudflare Workers, Vercel Edge) with explicit `highResNow()` degradation to `Date.now()`, ST-5 skip, and degraded GxP suitability; CLK-EDGE-001–009; (3) **HostClockBridge** (§4.9) — lightweight interface for injecting host-provided timing functions from React Native (via native bridge), WASM, and embedded environments; `createHostBridgeClock()` factory; behavioral contracts HB-1–HB-6; CLK-HB-001–009; (4) **Browser crossOriginIsolated detection** — `SystemClockAdapter` detects `globalThis.crossOriginIsolated` at construction; browsers upgraded from "Conditionally Suitable" to "Suitable" with precision reported via `ClockCapabilities`; (5) **provideEdgeRuntimeClock()` and `provideHostBridgeClock()` graph helpers** (§7.6, §7.7); CLK-INT-008–011. Cross-cutting: revised platform compatibility matrix (React Native: Not Suitable → Suitable, Workers: Not Suitable → Suitable (degraded), browsers: Conditionally Suitable → Suitable); 3 new DoD groups (24–26); 79 new tests (378→457); 6 new test files (40→46); 2 new adapter source files; 29 new formal requirement IDs (182→211). | QA Lead     |
| 2.4 | 2026-02-14 | HexDI Engineering | GxP compliance review remediation (4 findings): (F-1, Moderate) added Periodic Evaluation Fallback section to `clock-source-requirements.md` with CLK-GXP-006 (GxP organizations MUST verify periodic clock evaluation mechanism before claiming Annex 11 Section 11 compliance) and CLK-GXP-007 (minimum viable periodic evaluation using built-in `ClockDiagnosticsPort` when no ecosystem monitoring adapter is deployed); (F-2, Minor) added Supplier Quality Agreement Prerequisite section to `supplier-assessment.md` with 3 binding requirements mandating bilateral SQA before GxP production deployment, defining 6 minimum SQA content areas, and prohibiting GxP-validated classification without executed SQA; (F-3, Minor) added Validation Plan Guidance section to `qualification-protocols.md` with CLK-QUA-016 requiring consuming organizations to maintain a CSVP addressing 12 content areas (system description, GAMP 5 risk classification, supplier assessment, qualification scope, PQ acceptance criteria, personnel qualification, NTP configuration, periodic evaluation mechanism, change control, data retention, incident management, approval record); (F-4, Informational) added explicit GAMP 5 scalability principle reference ("the level of V-model documentation should be scaled to the complexity and novelty of the system") to Combined Specification Approach justification. Updated RTM revision history, quick reference card revision. | QA Lead     |
| 2.5 | 2026-02-14 | HexDI Engineering | GxP compliance review remediation (5 findings): (F-1, Major) added CLK-GXP-008 compensating control requirement to `recovery-procedures.md` — when ecosystem monitoring adapter is not co-deployed, consuming application MUST implement compensating controls for FM-3 through FM-6 detection, maintaining FMEA Detection scores; cross-referenced from `clock-source-requirements.md` and `fmea-risk-analysis.md`; added to RTM with EU Annex 11 Section 11 and 21 CFR 11.10(h) mapping; (F-2, Minor) added V-Model Navigation Guide table to `quick-reference.md` mapping spec sections to GAMP 5 V-model specification levels (URS/FS/DS) for auditor navigation; (F-3, Minor) added PQ window extension contingency to CLK-CHG-010 in `verification-and-change-control.md` — organizations MUST document extension request with reason, revised date, interim mitigations, and QA Manager approval before 30-day window expires; (F-4, Minor) added NTP pre-sync timeout guidance to DQ-2 in `qualification-protocols.md` — organizations SHOULD define 30–60 second maximum NTP wait time with documented fallback procedure; (F-5, Minor) tagged 11 procedural/operational requirements with [OPERATIONAL] prefix across §2, §3, §4 (CLK-HRS-002, CLK-MPC-001/005/006, CLK-SYS-002/003/013/019, CLK-HB-008/009, CLK-GXP-008) and added Operational Requirement Classification section to RTM with guidance on excluding [OPERATIONAL] requirements from automated test coverage calculations. Updated RTM, FMEA, quick reference card, requirement count (214→218). | QA Lead     |
| 2.6 | 2026-02-15 | HexDI Engineering | GxP compliance review remediation (8 items): (F-1, Minor) added QA Manager role to personnel-and-access-control.md Role Definitions table with responsibilities (emergency change authorization, CAPA extension, L4 escalation) and required qualifications; (F-2, Minor) elevated detection time requirements for FM-3–FM-6 from RECOMMENDED to MUST in recovery-procedures.md, requiring documented risk assessment for any deviation; (F-3, Minor) added 3-Way Compound Failure Mode Exclusion Justification to FMEA with statistical independence analysis, diminishing returns argument, detection redundancy assessment, and ICH Q9 proportionality reference; (O-1) added emergency change process flow diagram (Mermaid) to verification-and-change-control.md; (O-2) added PQ environment variable validation requirement (CLK-QUA-017) to qualification-protocols.md specifying parsing rules, range validation, and abort-on-invalid behavior; (O-3) added Sub-Document Version Control section to README.md establishing suite-level revision as authoritative version reference; (O-4) added Reference Compensating Control Implementation Guidance to recovery-procedures.md with pseudocode pattern for CLK-GXP-008 and OQ validation requirement. Updated requirement count (218→230). | QA Lead |
| 2.7 | 2026-02-15 | HexDI Engineering | GxP compliance review finding remediation (5 minor findings, 4 observations): (1) added Named Representative Verification Process to supplier-assessment.md with 3 access channels (issue tracker, security contact, SQA registry) and confidential quality representative registry requirement; (2) clarified FM-3–FM-6 recovery procedure self-containment for CLK-GXP-008 compensating-control deployments in recovery-procedures.md; (3) added APPROVAL_RECORD.json formal JSON Schema file delivery requirement to DQ-5 section; (4) added RCL Storage and Retrieval section to RTM with 3 access channels and no-redaction requirement; (5) strengthened RTM.json companion file from MAY to SHOULD; (6) added 3 missing glossary terms (FIPS, HMAC, timing side-channel); (7) added JSON Schema `$id` namespace identifier clarification to audit-trail-integration.md; (8) added QA Manager experience threshold organizational adjustment flexibility. Updated RTM revision 2.7. | QA Lead |
| 2.8 | 2026-02-19 | HexDI Engineering | API alignment with HexDI adapter constant convention: replaced all `provide*` graph-mutation helper functions (`provideSystemClock`, `provideTimerScheduler`, `provideCachedClock`, `provideEdgeRuntimeClock`, `provideHostBridgeClock`) with named adapter constants and factory functions matching the established HexDI pattern used in `@hex-di/logger` and `@hex-di/tracing`. New API: `SystemClockAdapter`, `SystemSequenceGeneratorAdapter`, `SystemTimerSchedulerAdapter`, `SystemCachedClockAdapter`, `EdgeRuntimeClockAdapter`, `SystemClockDiagnosticsAdapter` (exported constants); `createSystemClockAdapter(options?)`, `createEdgeRuntimeClockAdapter(options?)`, `createHostBridgeClockAdapter(bridge, options)` (factory functions for configured cases). Updated: 01-overview.md (Quick Start section, Progressive API Tiers table), 07-integration.md (§7.1, §7.4–7.7 registration patterns), 08-api-reference.md (Adapter Constants section added, Factory Functions table revised, Tier 1/2 tables), overview.md (Graph Registration Functions → Adapter Constants + Adapter Factory Functions), 09-definition-of-done.md (DoD 12, 18, 25, 26, 33), decisions/008-progressive-api-disclosure.md (Tier 1 description), 06-gxp-compliance/requirements-traceability-matrix.md (CLK-INT-003–011). No behavioral changes; registration pattern only. | -- |
| 2.9 | 2026-02-19 | HexDI Engineering | Added `type-system/` directory (2 documents) formalising the HexDI compile-time safety philosophy: `phantom-brands.md` documents all five phantom-branded numeric types (`MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`, `MonotonicDuration`, `WallClockDuration`), the `unique symbol` intersection pattern, compile-time cross-domain assignment blocking, covariant widening, arithmetic widening, zero-cost identity branding utilities, validated Result-returning branding utilities, the `elapsed()` / duration-comparison API, and the full cascading-API table; `structural-safety.md` documents structural irresettability (`SequenceGeneratorPort` without `reset()`), structural incompatibility (`CachedClockPort` using `recent*` method names), port intersection types (`ClockPort & ClockDiagnosticsPort`), and opaque discriminated `TimerHandle`. Updated: `overview.md` (2 rows added to Specification & Process Files table), `traceability.md` (capabilities 16–17 added to Capability-Level table), `README.md` Table of Contents (Type System section). | -- |

### Revision Review Process

Each revision in the history above underwent independent review by the QA Lead (or designee) before approval. The review process for each revision consisted of: (1) the specification author submitting the revision with a detailed change description; (2) the QA Lead reviewing the changes against the applicable regulatory requirements cited in the change description; (3) the QA Lead confirming that the RTM, FMEA, and DoD were updated consistently with the specification changes; (4) the QA Lead granting written approval. The review comment log for each revision cycle is maintained as `RCL-CLK-001-R{version}` and is available for regulatory inspection as part of the validation evidence package. Organizations adopting this specification for GxP use SHOULD request the review comment logs alongside the specification document.

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

#### Approval Enforcement Mechanism (21 CFR 11.10(j))

The approval record above is a **template** within a version-controlled markdown specification. The actual approval evidence is established through a layered mechanism:

1. **Signed Git tags:** Each approved revision is marked with a signed Git tag (GPG or SSH signature) by the approving authority. The signed tag binds the specification content (via its commit SHA) to a cryptographic identity, providing non-repudiation of the approval act. Consumers can verify the tag signature against the project's published signing keys.

2. **Completed `APPROVAL_RECORD.json`:** Each GxP deployment maintains a companion `APPROVAL_RECORD.json` file (see DQ-5 below) containing the completed approval record in structured, machine-verifiable form. This file is a deployment-specific artifact — not committed to the library's source repository — and is validated by the DQ-5 deployment qualification step.

3. **Review Comment Log (RCL):** The Review Comment Log for each revision cycle (`RCL-CLK-001-R{version}`) is maintained in the organization's quality management system and provides the detailed evidence trail of the review process, including comments raised, resolutions, and re-review confirmations.

Together, these three artifacts establish that the specification was formally approved before use: the signed Git tag provides cryptographic proof of approval, the `APPROVAL_RECORD.json` provides structured signatory evidence for automated verification, and the RCL provides the detailed review process trail for auditor inspection. No single artifact is sufficient in isolation — the three layers provide defense-in-depth for approval integrity.

REQUIREMENT: GxP organizations MUST retain all three approval evidence artifacts (signed Git tag verification output, completed `APPROVAL_RECORD.json`, and Review Comment Log) as part of their computerized system validation package. The absence of any artifact constitutes an approval evidence gap that MUST be resolved before GxP deployment.

#### Review Comment Log (RCL) Template

Each RCL document (`RCL-CLK-001-R{version}`) MUST follow the structure below. Organizations MAY extend this template with additional fields but MUST NOT remove any mandatory fields.

```json
{
  "schemaVersion": 1,
  "rclIdentifier": "RCL-CLK-001-R2.9",
  "specDocument": "SPEC-CLK-001",
  "specRevision": "2.9",
  "reviewCycle": {
    "submittedDate": "2026-02-14",
    "submittedBy": "HexDI Engineering",
    "reviewCompletedDate": "2026-02-14",
    "reviewedBy": "QA Lead"
  },
  "comments": [
    {
      "commentId": "RCL-2.6-001",
      "section": "06/clock-source-requirements.md §6.1",
      "severity": "Minor",
      "raisedBy": "QA Lead",
      "raisedDate": "2026-02-14",
      "description": "Description of the review comment or finding",
      "resolution": "Description of how the comment was resolved",
      "resolvedBy": "HexDI Engineering",
      "resolvedDate": "2026-02-14",
      "verifiedBy": "QA Lead",
      "verifiedDate": "2026-02-14",
      "status": "Closed"
    }
  ],
  "summary": {
    "totalComments": 1,
    "critical": 0,
    "major": 0,
    "minor": 1,
    "observations": 0,
    "allResolved": true
  },
  "reviewOutcome": "Approved"
}
```

REQUIREMENT: Each RCL entry MUST include: a unique comment identifier, the affected specification section, the severity classification (Critical/Major/Minor/Observation), the identity of the person who raised the comment, the resolution description, independent verification that the resolution is adequate, and the final status (Open/Closed). The RCL MUST NOT be marked as "Approved" while any Critical or Major comments remain in Open status.

REQUIREMENT: RCL documents MUST be retained for the same duration as the specification itself. Organizations MUST make RCL documents available for regulatory inspection within 24 hours of request.

### Pre-Deployment Approval Verification (DQ-5)

To prevent GxP deployment of the library against an unsigned specification, the Deployment Qualification checklist includes a machine-verifiable approval record check.

REQUIREMENT: GxP deployments MUST maintain a companion file `spec/clock/APPROVAL_RECORD.json` containing the completed approval record in structured form:

```json
{
  "schemaVersion": 1,
  "specDocument": "SPEC-CLK-001",
  "specRevision": "2.9",
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
  "reviewCommentLogReference": "RCL-CLK-001-R2.9",
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

REQUIREMENT (CLK-DQ-001): A formal JSON Schema file for `APPROVAL_RECORD.json` validation MUST be provided as `spec/clock/schemas/approval-record.schema.json` during the implementation phase. This schema MUST validate all DQ-5 acceptance criteria (structure, required fields, date format, minimum approval count) to enable automated DQ-5 verification without manual inspection. The schema file MUST be validated against the JSON Schema 2020-12 meta-schema (`https://json-schema.org/draft/2020-12/schema`) and MUST include test fixtures demonstrating validation of both a valid `APPROVAL_RECORD.json` and at least 3 invalid examples (missing required fields, insufficient approvals, future dates). GxP deployments MUST NOT proceed with DQ-5 until the schema file is present and validated. Until the schema file is delivered, organizations MUST validate `APPROVAL_RECORD.json` manually or with custom scripts per the DQ-5 criteria above and document the manual validation procedure in their CSVP. **Implementation tracking:** The schema file delivery is tracked as a v0.1.0 implementation prerequisite in the Definition of Done (§9). The interim manual validation procedure is fully equivalent to automated schema validation for compliance purposes — it validates the same acceptance criteria, only the execution method differs.

### Combined Specification Approach (GAMP 5 Risk-Based Justification)

This document is a **combined User Requirements Specification (URS), Functional Specification (FS), and Design Specification (DS)**. This combined approach is justified per the GAMP 5 scalability principle (Appendix D, "the level of V-model documentation should be scaled to the complexity and novelty of the system"), GAMP 5 risk-based principles, and ICH Q9 for the following reasons:

1. **Focused scope:** `@hex-di/clock` is a narrowly scoped timing infrastructure library with a small API surface (3 clock functions, 1 sequence generator, 1 diagnostics port). The total public API consists of fewer than 20 exported symbols. The scope does not warrant three separate specification documents that would largely repeat context and cross-reference each other.

2. **Proportionate effort (ICH Q9):** Per ICH Q9 risk-based principles, the level of documentation effort should be proportionate to the risk and complexity of the system. As a timing library (not a complete application), `@hex-di/clock` is a foundational component whose risk profile is well-characterized by the FMEA analysis (section 6.11). Three separate documents would increase review burden without improving risk control.

3. **Traceability is maintained:** The Requirements Traceability Matrix (section 6.8) provides complete forward and backward traceability from requirements to test cases, regardless of whether the requirements are stated in a combined or separated document structure. All inline requirements are traceable to specific test cases in the Definition of Done (section 9).

4. **Independent review is preserved:** The Formal Specification Approval Record (above) defines four independent signatory roles with distinct review scopes. The Independent QA Reviewer reviews GxP compliance content (which spans FS/DS concerns), while the Technical Reviewer reviews API design and platform mapping (which spans URS/FS concerns). Independent review of each specification level occurs through scoped signatory review, not through document separation.

**Content-level markers:** Within each chapter, content is organized from abstract to concrete: interface definitions (URS-level), behavioral contracts (FS-level), and implementation strategies (DS-level). Readers may identify the specification level of any section by its content nature:

| Content Type | Specification Level | Example |
|---|---|---|
| Port interface definitions, semantic contracts | URS | `ClockPort` interface, `monotonicNow()` contract |
| Behavioral requirements (REQUIREMENT: statements), error handling, ordering guarantees | FS | Monotonicity clamping, overflow behavior, capture ordering |
| Platform mapping tables, factory implementation strategies, closure-based capture | DS | Platform detection table, `performance.now()` selection, `Object.freeze()` patterns |

REQUIREMENT: GxP organizations that require physically separated URS/FS/DS documents for their quality system MAY extract the content from this combined specification into separate documents, provided traceability is maintained. The combined format is the authoritative source; any extracted documents MUST be verified against this specification for completeness.

### Version Relationship Policy

The specification revision (currently **2.9**) and the npm package version (currently **0.1.0**) follow independent versioning tracks:

| Versioning Dimension | Format | Incremented When | Example |
|---|---|---|---|
| **Specification revision** | Major.Minor (e.g., 2.0) | Specification content changes (requirements, protocols, FMEA, RTM) | 1.9 → 2.0 |
| **Package version** | SemVer (e.g., 0.1.0) | Implementation code changes (source, tests, configuration) | 0.1.0 → 0.2.0 |

**Rationale:** The specification may undergo multiple revisions during the pre-release phase (package version 0.x.y) as GxP compliance gaps are identified and remediated through review cycles. Conversely, implementation bug fixes may increment the package version without requiring a specification revision. Decoupled versioning avoids artificial version inflation in either track.

**Traceability:** The `getClockGxPMetadata()` function returns both `clockVersion` (package version) and `specRevision` (specification revision), enabling auditors to verify that a specific deployment was built against a specific specification revision. The `APPROVAL_RECORD.json` records the `specRevision` that was formally approved.

REQUIREMENT: When the specification revision changes, the `specRevision` constant in the implementation MUST be updated to match. IQ-21 verifies this correspondence at installation time.

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
| Ecosystem GxP monitoring | Requires NTP-synchronized clock source            | NTP-validated adapter via `ClockPort` |

## Table of Contents

### [01 - Overview](./01-overview.md)

1.1 [Overview](./01-overview.md#11-overview)
1.2 [Design Principles](./01-overview.md#12-design-principles)
1.3 [Data Flow Diagrams](./01-overview.md#13-data-flow-diagrams) (platform API flow, TemporalContextFactory composition, clock source override)
1.4 [Package Structure](./01-overview.md#14-package-structure)

### [02 - Clock Port](./02-clock-port.md)

2.1 [ClockPort Interface](./02-clock-port.md#21-clockport-interface)
2.2 [Monotonic Time](./02-clock-port.md#22-monotonic-time)
2.3 [Wall-Clock Time](./02-clock-port.md#23-wall-clock-time)
2.4 [High-Resolution Time](./02-clock-port.md#24-high-resolution-time)
2.5 [Branded Timestamp Types](./02-clock-port.md#25-branded-timestamp-types)
2.6 [Timer/Scheduler Port](./02-clock-port.md#26-timerscheduler-port)
2.7 [Cached Clock Port](./02-clock-port.md#27-cached-clock-port)
2.8 [Clock Capabilities](./02-clock-port.md#28-clock-capabilities)
2.9 [Async Combinators](./02-clock-port.md#29-async-combinators)
2.10 [Duration Types](./02-clock-port.md#210-duration-types)
2.11 [Temporal API Interop](./02-clock-port.md#211-temporal-api-interop)

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
4.6 [SystemTimerScheduler](./04-platform-adapters.md#46-systemtimerscheduler)
4.7 [SystemCachedClock](./04-platform-adapters.md#47-systemcachedclock)
4.8 [EdgeRuntimeClockAdapter](./04-platform-adapters.md#48-edgeruntimeclockadapter)
4.9 [HostClockBridge](./04-platform-adapters.md#49-hostclockbridge-react-native-wasm-embedded)
4.10 [Benchmark Specification](./04-platform-adapters.md#410-benchmark-specification)

### [05 - Testing Support](./05-testing-support.md)

5.1 [VirtualClockAdapter](./05-testing-support.md#51-virtualclockadapter) (incl. auto-advance)
5.2 [VirtualSequenceGenerator](./05-testing-support.md#52-virtualsequencegenerator)
5.3 [Deterministic Testing Patterns](./05-testing-support.md#53-deterministic-testing-patterns)
5.4 [VirtualTimerScheduler](./05-testing-support.md#54-virtualtimerscheduler) (incl. blockUntil)
5.5 [VirtualCachedClock](./05-testing-support.md#55-virtualcachedclock)
5.6 [Testing Assertion Helpers](./05-testing-support.md#56-testing-assertion-helpers)
5.7 [Testing Recipes](./05-testing-support.md#57-testing-recipes)

### [06 - GxP Compliance](./06-gxp-compliance/README.md)

- **[GxP Quick Reference Card](./06-gxp-compliance/README.md#quick-reference)** — Auditor navigation guide

  6.1 [Clock Source Requirements](./06-gxp-compliance/01-clock-source-requirements.md) (includes NTP boundary)
  6.2 [Qualification Protocols](./06-gxp-compliance/02-qualification-protocols.md)
  6.3 [Verification and Change Control](./06-gxp-compliance/03-verification-and-change-control.md)
  6.4 [Resolution and Precision](./06-gxp-compliance/04-resolution-and-precision.md)
  6.5 [ALCOA+ Mapping](./06-gxp-compliance/05-alcoa-mapping.md)
  6.6 [Audit Trail Integration](./06-gxp-compliance/06-audit-trail-integration.md)
  6.7 [Recovery Procedures](./06-gxp-compliance/07-recovery-procedures.md) (FM-1, FM-2; FM-3–FM-6 in ecosystem monitoring spec)
  6.8 [Requirements Traceability Matrix](./06-gxp-compliance/08-requirements-traceability-matrix.md)
  6.9 [Supplier Assessment](./06-gxp-compliance/09-supplier-assessment.md)
  6.10 [Personnel Qualification and Access Control](./06-gxp-compliance/10-personnel-and-access-control.md)
  6.11 [FMEA Risk Analysis](./06-gxp-compliance/11-fmea-risk-analysis.md)
  6.12 [Glossary](./06-gxp-compliance/12-glossary.md)

### [07 - Integration](./07-integration.md)

7.1 [Container Registration](./07-integration.md#71-container-registration)
7.2 [Migration Guide](./07-integration.md#72-migration-guide)
7.3 [Ecosystem Monitoring Integration](./07-integration.md#73-ecosystem-monitoring-integration)
7.4 [Timer Scheduler Registration](./07-integration.md#74-timer-scheduler-registration)
7.5 [Cached Clock Registration](./07-integration.md#75-cached-clock-registration)
7.6 [Edge Runtime Clock Registration](./07-integration.md#76-edge-runtime-clock-registration)
7.7 [Host Bridge Clock Registration](./07-integration.md#77-host-bridge-clock-registration)
7.8 [AsyncLocalStorage Clock Context](./07-integration.md#78-asynclocalstorage-clock-context)

### [08 - API Reference](./08-api-reference.md)

8.1 [Complete API](./08-api-reference.md#81-complete-api)

### [09 - Definition of Done](./09-definition-of-done.md)

9.1 [Test Organization](./09-definition-of-done.md#91-test-organization)
9.2 [DoD Items](./09-definition-of-done.md#92-dod-items)

### [Type System](./type-system/)

- [Phantom Brands](./type-system/phantom-brands.md) — All five branded types (`MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`, `MonotonicDuration`, `WallClockDuration`); the `unique symbol` intersection pattern; compile-time properties; branding utilities
- [Structural Safety](./type-system/structural-safety.md) — Structural irresettability (`SequenceGeneratorPort`), structural incompatibility (`CachedClockPort`), port intersection types (`ClockPort & ClockDiagnosticsPort`), opaque `TimerHandle`

---

## Release Scope

**v0.1.0** ships all sections (1.1–9.2).
