# 00 - User Requirements Specification (URS)

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-00-URS                             |
> | Revision         | 2.0                                      |
> | Effective Date   | 2026-02-20                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
> | Classification   | GxP User Requirements Specification      |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 2.0 (2026-02-20): Fixed 4 broken cross-references in §1 relationship table and _Next navigation link (CCR-GUARD-044); withdrew URS-GUARD-008 superseded by URS-GUARD-019, absorbed REQ-GUARD-016/-017 and IQ verification into URS-GUARD-019, updated §7 risk counts to 20 active requirements (CCR-GUARD-045); added §4.2 URS-to-FMEA cross-reference table, converted §8 from aspirational REQUIREMENT to formal Approval Record with four signatory roles (CCR-GUARD-046); added glossary entries for AuditEntry/ClockSource/PolicyEvaluationError/ReauthenticationToken, added acceptance criteria links in URS-GUARD-002/-004/-016, removed gxp:true implementation flag from §4 acceptance criteria per URS/FS separation (CCR-GUARD-047) |
> |                  | 1.5 (2026-02-15): Updated URS-GUARD-009 OQ range to OQ-52, added REQ-GUARD-083/084/085 cross-references for adverse condition test cases (CCR-GUARD-016) |
> |                  | 1.4 (2026-02-15): Updated Approved By to dual approver (Regulatory Affairs Lead, Quality Assurance Manager) for consistency with GxP compliance sub-specifications (CCR-GUARD-014) |
> |                  | 1.3 (2026-02-14): Added retroactive extraction rationale per GxP compliance review observation 4 (CCR-GUARD-012) |
> |                  | 1.2 (2026-02-14): Added GAMP 5 Category 5 classification statement (§2a) (CCR-GUARD-011) |
> |                  | 1.1 (2026-02-14): Added Regulatory Inspector user group to §3 (GxP compliance review finding 2), added multi-persona diversity RECOMMENDED to PQ-4 NFR-PERF-004 |
> |                  | 1.0 (2026-02-14): Initial standalone URS extracted from 01-overview.md and 11-traceability-matrix.md per GxP compliance finding (GAMP 5 §D.4 standalone URS requirement) |

---

## 1. Purpose and Scope

This document is the standalone User Requirements Specification (URS) for `@hex-di/guard`, the authorization library in the HexDI ecosystem. It defines what the system must do from the user's perspective, independent of how the system achieves those requirements (Functional Specification) or how it is implemented (Design Specification).

`@hex-di/guard` provides compile-time-safe, policy-driven authorization for TypeScript applications. It integrates with the HexDI dependency injection graph to enforce access control at port resolution time, record immutable audit trails, and support electronic signatures for GxP-regulated environments.

This URS applies to all GxP-regulated deployments of `@hex-di/guard`. Non-regulated deployments may use this document as guidance but are not required to comply with its REQUIREMENT blocks.

### Scope Boundaries

| In Scope | Out of Scope |
|----------|-------------|
| Permission-based access control enforcement | Identity provider (IdP) implementation |
| Policy evaluation (synchronous and asynchronous) | User authentication mechanisms |
| Audit trail recording and integrity verification | Audit trail backing store implementation |
| Electronic signature capture and validation | HSM/key management hardware |
| Administrative controls and change management | Site-specific organizational procedures |
| Validation procedures (IQ/OQ/PQ) | Site-level Validation Master Plan |
| React integration for UI authorization gates | Application-specific UI components |

### Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| [01 - Overview & Philosophy](./01-overview.md) | Functional Specification (FS) — defines how requirements are met |
| [17 - GxP Compliance Guide](./compliance/gxp.md) | Design Specification (DS) — defines GxP implementation details |
| [16 - Definition of Done](./process/definitions-of-done.md) | Verification Specification — defines test acceptance criteria |
| [11 - Traceability Matrix](./17-gxp-compliance/11-traceability-matrix.md) | Regulatory traceability — maps URS to FS to regulatory requirements |
| [09 - Validation Plan](./17-gxp-compliance/09-validation-plan.md) | Validation protocol — defines IQ/OQ/PQ test procedures |
| [13 - Test Protocols](./17-gxp-compliance/13-test-protocols.md) | Formal test protocols — step-by-step IQ/OQ/PQ execution procedures |

### Retroactive Extraction Rationale

> **GAMP 5 Compliance Note:** This URS was extracted retrospectively from existing specification documents (01-overview.md and 11-traceability-matrix.md) rather than written prior to the Functional Specification (FS). The standard GAMP 5 V-Model expects the URS to precede the FS in the development lifecycle.
>
> **Rationale:** The `@hex-di/guard` specification was developed iteratively with functional and design specifications co-evolving. User requirements were embedded within the FS and traceability matrix from the outset. A GxP compliance review identified the absence of a standalone URS as a gap per GAMP 5 Appendix D4. This document was created to consolidate those requirements into the expected V-Model format.
>
> **Validation Impact:** The retrospective extraction does NOT introduce new requirements. All URS-GUARD-NNN requirements in this document are traceable to pre-existing specification content in 01-overview.md and compliance/gxp.md. The extraction was verified by confirming bidirectional traceability between this URS and the existing FS (§69h). No requirement was added, removed, or modified during extraction. This approach is consistent with GAMP 5 Section 5.3 (retrospective validation) when applied to documentation structure rather than system functionality. Reference: GAMP 5 (2nd Edition) §D.4, §5.3.

---

## 2. Regulatory Scope

This URS addresses the following regulatory frameworks:

| Standard | Full Title | Applicability to Guard |
|----------|-----------|----------------------|
| **FDA 21 CFR Part 11** | Electronic Records; Electronic Signatures | Audit trail requirements (§11.10(e)), electronic signatures (§11.50-11.300), access control (§11.10(d)) |
| **EU GMP Annex 11** | Computerised Systems | System validation (§4), change control (§10), data storage (§7), audit trail review (§9) |
| **GAMP 5** | Guide for Validation of Automated Systems | Category 5 validation lifecycle, URS/FS/DS structure (Appendix D4), IQ/OQ/PQ protocols |
| **ICH Q9** | Quality Risk Management | FMEA methodology for risk assessment, risk-based testing approach |
| **PIC/S PI 011-3** | Good Practices for Data Management and Integrity | Data integrity controls, ALCOA+ principles enforcement |
| **WHO TRS 996 Annex 5** | Guidance on Good Data and Record Management Practices | Bi-directional traceability, validation evidence requirements |
| **MHRA Data Integrity (2018)** | GxP Data Integrity Guidance and Definitions | Data integrity expectations, electronic record controls |
| **ALCOA+** | Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available | Data integrity principles applied to audit trail and authorization records |

### 2a. GAMP 5 Software Category Classification

```
REQUIREMENT: @hex-di/guard is classified as GAMP 5 Category 5 (Custom Application).

             Rationale: @hex-di/guard is a custom-developed TypeScript library with
             bespoke authorization logic (8-variant discriminated union policy evaluator),
             a custom audit trail integrity mechanism (SHA-256 hash chain with WAL crash
             recovery), and a purpose-built electronic signature integration layer. It is
             NOT a configured commercial off-the-shelf product (Category 4) because:

             (a) The policy evaluation engine is custom-designed with branded nominal
                 types and pure functional evaluation semantics specific to this library.
             (b) The audit trail contract (4-invariant behavioral specification with
                 per-scope hash chains and completeness monitoring) is purpose-built.
             (c) The electronic signature integration (ReauthenticationToken flow, HSM
                 adapter port, epoch-based algorithm migration) is custom-designed.
             (d) No equivalent COTS product provides the combination of hexagonal DI
                 integration, compile-time policy type safety, and GxP audit trail
                 compliance in the TypeScript ecosystem.

             This classification drives the validation approach: full GAMP 5 V-Model
             lifecycle with URS (this document), FS (01-overview.md), DS/CS (embedded in
             GxP compliance sub-specifications), and IQ/OQ/PQ formal test protocols
             (09-validation-plan.md, 13-test-protocols.md).

             Reference: GAMP 5 (2nd Edition) Appendix D4, EU GMP Annex 11 §4.
```

---

## 3. User Groups

The following user groups interact with `@hex-di/guard` in a GxP-regulated deployment:

| User Group | Role | Responsibilities | Relevant URS Requirements |
|-----------|------|------------------|--------------------------|
| **System Administrator** | Manages guard configuration, policies, and role hierarchies | Policy deployment, change control, system maintenance, training management | URS-GUARD-010, -012, -015, -021 |
| **Operator** | End user of guard-protected operations | Performs day-to-day operations subject to access control and audit trail recording | URS-GUARD-001, -002, -003, -006 |
| **Auditor / QA Reviewer** | Reviews audit trails, validates compliance, approves changes | Periodic audit trail review, compliance verification, validation report approval | URS-GUARD-002, -005, -008, -011 |
| **Developer** | Implements and maintains guard adapters and integrations | Adapter implementation, test development, IQ/OQ/PQ execution | URS-GUARD-009, -015, -016, -017 |
| **Regulatory Inspector** | External auditor with read-only access during FDA/EMA inspections | Read-only audit trail review, compliance evidence examination, traceability verification | URS-GUARD-002, -005, -008, -011 |

---

## 4. User Requirements

### 4.1 User Requirements Registry

Each requirement uses SHALL language per RFC 2119. Risk classifications follow ICH Q9 methodology:

- **Critical**: Failure directly impacts patient safety or data integrity; regulatory non-compliance
- **Major**: Failure impacts system reliability or audit completeness; potential regulatory finding
- **Minor**: Failure impacts usability or operational efficiency; no direct regulatory impact

| URS ID | User Requirement (SHALL Statement) | Risk | Acceptance Criteria | Regulatory Driver | FS Section(s) | REQ-GUARD ID(s) | Verification Evidence |
|--------|-----------------------------------|------|--------------------|--------------------|---------------|-----------------|----------------------|
| URS-GUARD-001 | The system SHALL enforce permission-based access control on protected operations | Critical | Guard adapter denies access when subject lacks required permissions; allows when permissions are present | 21 CFR 11.10(d), Annex 11 §12 | §25-28 (07-guard-adapter.md), §05 (05-policy-evaluator.md) | REQ-GUARD-037, REQ-GUARD-038 | OQ-1, OQ-3 |
| URS-GUARD-002 | The system SHALL record every authorization decision (allow and deny) in an immutable audit trail | Critical | Every evaluate() call produces an [AuditEntry](glossary.md#auditentry) with all 10 required fields; no evaluation bypasses recording | 21 CFR 11.10(e), Annex 11 §9 | §61 (02-audit-trail-contract.md) | REQ-GUARD-005, REQ-GUARD-006 | OQ-6, OQ-7 |
| URS-GUARD-003 | The system SHALL identify the person performing each recorded action (Attributable per ALCOA+) | Critical | Every audit entry contains non-empty subjectId, authenticationMethod; anonymous subjects rejected | ALCOA+ (Attributable), 21 CFR 11.10(e) | §60 (01-regulatory-context.md), §22 (06-subject.md) | REQ-GUARD-004 | OQ-7, OQ-26 |
| URS-GUARD-004 | The system SHALL use synchronized timestamps for all audit entries (Contemporaneous per ALCOA+) | Critical | [ClockSource](glossary.md#clocksource) uses NTP-synchronized time; drift > 1 second triggers health check failure | ALCOA+ (Contemporaneous), 21 CFR 11.10(e) | §62 (03-clock-synchronization.md) | REQ-GUARD-014, REQ-GUARD-015 | OQ-17, PQ-6 |
| URS-GUARD-005 | The system SHALL detect any modification to audit trail records (data integrity) | Critical | SHA-256 hash chain validates for 1000+ entries; tampering detected by verifyAuditChain() | 21 CFR 11.10(e), ALCOA+ (Original) | §61.4 (02-audit-trail-contract.md) | REQ-GUARD-010, REQ-GUARD-013 | OQ-6, OQ-27 |
| URS-GUARD-006 | The system SHALL support electronic signatures with re-authentication for GxP-critical operations | Critical | Signature capture-validate round-trip succeeds; re-authentication token required before signing | 21 CFR 11.50-11.100 | §65 (07-electronic-signatures.md) | REQ-GUARD-028, REQ-GUARD-029 | OQ-8, OQ-10 |
| URS-GUARD-007 | The system SHALL enforce separation of duties for counter-signing workflows | Critical | Both signatures captured independently; approverId differs from actorId | 21 CFR 11.10(g), Annex 11 §12 | §65d (07-electronic-signatures.md), §64a (06-administrative-controls.md) | REQ-GUARD-036, REQ-GUARD-065 | OQ-10, OQ-23 |
| ~~URS-GUARD-008~~ | ~~Withdrawn — Superseded by URS-GUARD-019~~ | — | — | — | — | — | — |
| URS-GUARD-009 | The system SHALL provide formal validation procedures (IQ/OQ/PQ) per GAMP 5 | Major | Programmatic runIQ(), runOQ(), runPQ() runners produce auditable reports; all tests pass | GAMP 5 Category 5 | §67 (09-validation-plan.md) | REQ-GUARD-038, REQ-GUARD-039, REQ-GUARD-042, REQ-GUARD-083, REQ-GUARD-084, REQ-GUARD-085 | IQ-1 through IQ-12, OQ-1 through OQ-52, PQ-1 through PQ-10 |
| URS-GUARD-010 | The system SHALL restrict administrative operations to authorized personnel | Critical | AdminGuardConfig enforces admin role checks; unauthorized admin operations denied with ACL017 | 21 CFR 11.10(d), Annex 11 §12 | §64g (06-administrative-controls.md) | REQ-GUARD-026, REQ-GUARD-027 | OQ-34, OQ-35 |
| URS-GUARD-011 | The system SHALL support risk-based periodic review of authorization decisions | Major | Audit trail review interface supports filtered queries; periodic review schedule configurable | Annex 11 §9, ICH Q9 | §64 (05-audit-trail-review.md) | REQ-GUARD-019 | Annual OQ re-verification |
| URS-GUARD-012 | The system SHALL manage policy changes through a controlled change process | Critical | PolicyChangeAuditEntry recorded before activation; separation of duties enforced; changeRequestId required | 21 CFR 11.10(k), Annex 11 §10 | §64a (06-administrative-controls.md) | REQ-GUARD-020, REQ-GUARD-021 | OQ-23, OQ-31 |
| URS-GUARD-013 | The system SHALL protect signing keys using hardware security or equivalent controls | Critical | HSM or equivalent key storage; no keys in source code; key material never logged or serialized | 21 CFR 11.200, NIST SP 800-131A | §65c (07-electronic-signatures.md) | REQ-GUARD-032, REQ-GUARD-033 | IQ-10, OQ-8 |
| URS-GUARD-014 | The system SHALL support backup, restore, and disaster recovery of audit data | Major | Backup-restore preserves hash chain integrity; DR test procedure passes annually | Annex 11 §7.1, §16 | §63 (04-data-retention.md), §67f (09-validation-plan.md) | REQ-GUARD-018 | OQ-18, OQ-29, DR test procedure |
| URS-GUARD-015 | The system SHALL document applicable predicate rules before GxP deployment | Major | Predicate rule mapping required before GxP deployment; checkGxPReadiness() verifies mapping present | 21 CFR 11.1(b), GAMP 5 | §59 (01-regulatory-context.md) | REQ-GUARD-003, REQ-GUARD-067 | OQ-38 |
| URS-GUARD-016 | The system SHALL validate policy input data types before authorization evaluation | Major | Incompatible matcher operand types rejected at build time; wrong-type attributes produce [PolicyEvaluationError](glossary.md#policyevaluationerror) | Annex 11 §5 (data accuracy) | §59 (01-regulatory-context.md, Annex 11 §5) | REQ-GUARD-070 | OQ-41 |
| URS-GUARD-017 | The system SHALL check resource attribute accuracy and freshness for time-sensitive decisions | Major | Stale attributes (beyond maxAgeMs) cause deny with "attribute_stale" reason; missing provenance triggers warning | Annex 11 §6 (data accuracy) | §59 (01-regulatory-context.md, Annex 11 §6) | REQ-GUARD-071 | OQ-42 |
| URS-GUARD-018 | The system SHALL manage certificate lifecycle and support algorithm migration for long-term signature validity | Major | Certificate expiry threshold events emitted (90/30/7 days); algorithm migration epochs verified across boundary | 21 CFR 11.200, NIST SP 800-131A | §65c-3, §65c-4 (07-electronic-signatures.md) | REQ-GUARD-068, REQ-GUARD-069 | OQ-39, OQ-40 |
| URS-GUARD-019 | The system SHALL retain audit trail data for the minimum regulatory retention period and support archival to long-term storage | Major | Retention policy configurable; records available for minimum regulatory retention period; archival workflow includes pre-archival chain verification, JSON Lines export with manifest, post-transfer integrity verification | 21 CFR 11.10(c), Annex 11 §7 | §63, §63a, §63b, §63c (04-data-retention.md) | REQ-GUARD-016, REQ-GUARD-017, REQ-GUARD-018 | IQ, OQ-18, PQ-8, documented retention policy |
| URS-GUARD-020 | The system SHALL support orderly decommissioning with self-contained archive export, hash chain preservation, and key material disposition | Minor | Decommissioning procedure produces self-contained archive; hash chain verified post-export; key material disposition documented | GAMP 5 (system retirement) | §70, §70a (12-decommissioning.md) | REQ-GUARD-046 | PQ-10, decommissioning dry-run |
| URS-GUARD-021 | The system SHALL enforce administrative authority checks, separation of duties, policy change control, and training requirements for guard system operations | Critical | Admin authority checks enforced; incompatible roles detected; change freeze respected; training records required | 21 CFR 11.10(i), Annex 11 §2 | §64a, §64b, §64c, §64g, §64h, §64i (06-administrative-controls.md) | REQ-GUARD-060, REQ-GUARD-061 | OQ-23, OQ-3, compliance verification checklist |

### 4.2 URS-to-FMEA Cross-Reference

The following table maps each active URS requirement to the failure modes in [risk-assessment.md](./risk-assessment.md) that would result from its violation. This satisfies the URS → FS → FMEA → test traceability chain required by GAMP 5 Appendix D4 and ICH Q9.

| URS ID | Primary Failure Modes | Description |
|--------|----------------------|-------------|
| URS-GUARD-001 | FM-01, FM-02, FM-12 | Incorrect allow; incorrect deny; bypass via direct resolve |
| URS-GUARD-002 | FM-03, FM-13, FM-15, FM-26 | Silent entry drop; NoopAuditTrail in GxP production; crash between eval and audit; completeness discrepancy unescalated |
| URS-GUARD-003 | FM-08, FM-24 | Wrong-scope subject; unsanitized attribute values in audit entries |
| URS-GUARD-004 | FM-09, FM-10 | NTP drift > 1 second; backward clock jump |
| URS-GUARD-005 | FM-04, FM-05, FM-14, FM-16 | Out-of-order writes break hash chain; tampered entry; concurrent async interleave; schema migration breaks chain verification |
| URS-GUARD-006 | FM-06, FM-07 | Expired re-authentication token accepted; signing key exposed |
| URS-GUARD-007 | FM-25 | Unauthorized administrative access (separation of duties violation) |
| ~~URS-GUARD-008~~ | — | Withdrawn — see URS-GUARD-019 |
| URS-GUARD-009 | — | Process requirement; IQ/OQ/PQ runners provide coverage of all FM-01–FM-36 |
| URS-GUARD-010 | FM-25 | Unauthorized administrative access |
| URS-GUARD-011 | FM-26 | Completeness discrepancy unescalated |
| URS-GUARD-012 | FM-23 | Runtime policy change without audit trail record |
| URS-GUARD-013 | FM-07 | Signing key exposed in source code or environment variables |
| URS-GUARD-014 | FM-15, FM-17 | Crash between evaluation and audit write; buffer-flush window loss |
| URS-GUARD-015 | FM-31 | Missing predicate rule mapping in GxP deployment |
| URS-GUARD-016 | FM-27 | Invalid attribute type in policy evaluation |
| URS-GUARD-017 | FM-28 | Stale resource attribute used in authorization decision |
| URS-GUARD-018 | FM-29, FM-30 | Expired signing certificate; signature algorithm transition breaks chain verification |
| URS-GUARD-019 | FM-16, FM-17 | Schema migration breaks chain verification for pre-upgrade entries; buffer-flush window loss |
| URS-GUARD-020 | — | Process requirement; no primary library-level failure mode |
| URS-GUARD-021 | FM-23, FM-25 | Runtime policy change without audit; unauthorized administrative access |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| NFR ID | Requirement | Target | Verification |
|--------|------------|--------|-------------|
| NFR-PERF-001 | Evaluation latency (p50) | < 1ms for 10,000 evaluations | PQ-1 |
| NFR-PERF-002 | Evaluation latency (p99) | < 5ms for 10,000 evaluations | PQ-2 |
| NFR-PERF-003 | Audit write throughput | >= 100 entries/sec (sequential) | PQ-3 |
| NFR-PERF-004 | Concurrent chain integrity | 10 scopes x 100 entries each, all chains valid; scopes SHOULD represent at least 3 distinct user personas | PQ-4 |
| NFR-PERF-005 | Audit write latency (p99) | < 50ms per individual record() call | PQ-10 |

### 5.2 Availability and Reliability

| NFR ID | Requirement | Target | Verification |
|--------|------------|--------|-------------|
| NFR-AVAIL-001 | Memory stability under sustained load | < 10% heap delta after GC over soak duration | PQ-5 |
| NFR-AVAIL-002 | Sustained throughput without degradation | p99 latency does not degrade > 50% from baseline over soak period | PQ-7 |
| NFR-AVAIL-003 | NTP unavailability failover | Fallback to local clock within 1 second with reduced confidence indicator | OQ-21 |
| NFR-AVAIL-004 | WAL crash recovery | Orphaned pending intents detected and flagged for remediation after restart | OQ-19 |

### 5.3 Security

| NFR ID | Requirement | Target | Verification |
|--------|------------|--------|-------------|
| NFR-SEC-001 | No secrets in source code | Zero matches for private key patterns in src/ | IQ-10 |
| NFR-SEC-002 | Audit trail encryption at rest | AES-256 or equivalent NIST-approved algorithm | IQ-11 |
| NFR-SEC-003 | Constant-time signature comparison | crypto.timingSafeEqual() or equivalent for all signature comparisons | OQ-8 (code review) |
| NFR-SEC-004 | No critical dependency vulnerabilities | Zero critical/high severity in production dependencies | IQ-9 |

### 5.4 Maintainability

| NFR ID | Requirement | Target | Verification |
|--------|------------|--------|-------------|
| NFR-MAINT-001 | Zero TypeScript compilation errors | pnpm typecheck passes with zero errors | IQ-5 |
| NFR-MAINT-002 | Zero ESLint violations | pnpm lint passes with zero errors and warnings | IQ-6 |
| NFR-MAINT-003 | No eslint-disable in production source | Zero matches in src/ (excluding test files) | IQ-7 |
| NFR-MAINT-004 | Mutation testing kill rate | 100% for core evaluation and combinator logic | OQ-4, OQ-5 |

---

## 6. Constraints and Assumptions

### 6.1 Constraints

| ID | Constraint | Rationale |
|----|-----------|-----------|
| CON-001 | `@hex-di/guard` is a TypeScript library, not a standalone system | Authorization decisions depend on the host application's dependency injection graph and adapter implementations |
| CON-002 | Zero external runtime dependencies beyond `@hex-di/core` | Minimizes supply chain risk and simplifies SBOM generation for GxP environments |
| CON-003 | Policy evaluation is synchronous by default | Deterministic evaluation order; async evaluation available via evaluateAsync() for AttributeResolver use cases |
| CON-004 | Audit trail backing store is provided by the consumer | Guard defines the AuditTrailPort contract; consumers implement the adapter for their storage technology |
| CON-005 | Electronic signature key management is provided by the consumer | Guard defines the SignatureService contract; consumers implement HSM/key storage integration |

### 6.2 Assumptions

| ID | Assumption | Impact if Invalid |
|----|-----------|-------------------|
| ASM-001 | Consumer provides NTP-synchronized ClockSource | Audit trail timestamps may not satisfy ALCOA+ Contemporaneous requirement |
| ASM-002 | Consumer implements durable AuditTrailPort adapter (not NoopAuditTrail) when gxp:true | Audit trail data loss; regulatory non-compliance; guard blocks this at compile time and runtime |
| ASM-003 | Consumer maintains site-specific organizational procedures (training, change control, periodic review) | Library-level controls are insufficient without organizational procedures |
| ASM-004 | Node.js runtime >= 18.0.0 with crypto module available | Electronic signature functions and hash chain computation may fail |
| ASM-005 | Consumer executes IQ/OQ/PQ validation before GxP production deployment | System not formally qualified; regulatory finding risk |

---

## 7. Risk Classification Summary

Per ICH Q9, user requirements are classified by risk to patient safety, data integrity, and regulatory compliance:

| Risk Level | Count | URS IDs | Mitigation Strategy |
|-----------|-------|---------|-------------------|
| **Critical** | 11 | URS-GUARD-001, -002, -003, -004, -005, -006, -007, -010, -012, -013, -021 | Full specification (FS + DS), comprehensive OQ testing, mutation testing at 100% kill rate, adversarial testing, code review with cryptographic competency |
| **Major** | 8 | URS-GUARD-009, -011, -014, -015, -016, -017, -018, -019 | Specification coverage, OQ testing, programmatic validation runners, periodic review |
| **Minor** | 1 | URS-GUARD-020 | Specification coverage, PQ testing, documented procedure |

**Total:** 20 active user requirements (11 Critical, 8 Major, 1 Minor); 1 withdrawn (URS-GUARD-008, superseded by URS-GUARD-019)

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST
             review this risk classification against their site-specific risk
             assessment per ICH Q9. Site-specific factors (patient population,
             product criticality, regulatory jurisdiction) may elevate Minor
             or Major requirements to a higher classification. Risk
             classification changes MUST be documented in the site validation
             plan.
             Reference: ICH Q9, GAMP 5 Appendix D4.
```

---

## 8. URS Approval

```
REQUIREMENT: This URS MUST be approved by the Quality Assurance Manager before
             Functional Specification (FS) development proceeds. Changes to
             approved URS requirements MUST follow the change control process
             defined in section 64a (06-administrative-controls.md) and MUST
             trigger impact assessment on downstream FS and DS documents.
             Reference: GAMP 5 Appendix D4, EU GMP Annex 11 §4.
```

### Approval Record

| Role | Review Scope | Approver Name | Date |
|------|-------------|---------------|------|
| Specification Author | All sections | ___________________ | ___________ |
| Independent QA Reviewer | GxP/compliance sections (§2–§2a), risk classification (§7), ALCOA+ mapping, URS-to-FMEA cross-reference (§4.2) | ___________________ | ___________ |
| Technical Reviewer | User requirements (§4), NFRs (§5), constraints and assumptions (§6) | ___________________ | ___________ |
| Regulatory Affairs Reviewer | Regulatory scope (§2), electronic signature requirements (URS-GUARD-006, -007, -013, -018), ALCOA+ principles | ___________________ | ___________ |

> **Approval Evidence**: Cryptographic approval evidence is provided by a GPG-signed Git tag referencing this document at revision 1.5. The deployment-specific `APPROVAL_RECORD.json` — identifying each approver by name, date, and signature reference — is maintained outside the source repository per [process/document-control-policy.md](./process/document-control-policy.md) and is NOT committed to source control.

---

_Next: [01 - Overview & Philosophy](./01-overview.md)_
