# Verification and Change Control

### Periodic Adapter Integrity Verification (EU GMP Annex 11, Section 11)

Annex 11, Section 11 requires periodic evaluation of computerized systems to confirm they remain in a validated state. `@hex-di/clock` provides one-time diagnostics via `ClockDiagnosticsPort.getDiagnostics()` at construction time. Periodic runtime verification of adapter integrity (adapter name consistency, freeze status, monotonicity heartbeat) is the responsibility of `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

Without `@hex-di/guard`, no periodic integrity checks are performed. GxP deployments MUST deploy `@hex-di/guard` to satisfy Annex 11, Section 11 periodic evaluation requirements.

### Change Control Requirements (21 CFR 11.10(k)(2), EU GMP Annex 11 Section 10)

21 CFR 11.10(k)(2) requires adequate controls over systems documentation, including revision and change control procedures. EU GMP Annex 11, Section 10 requires that changes to computerized systems be made in a controlled manner. The following change control requirements apply to `@hex-di/clock` in GxP deployments.

REQUIREMENT: GxP deployments MUST use exact version pinning for `@hex-di/clock` in their package manager lockfile. Semver ranges (`^`, `~`, `>=`) MUST NOT be used. The exact validated version MUST be recorded in the computerized system validation plan.

REQUIREMENT: Version upgrades of `@hex-di/clock` MUST require documented QA approval before deployment. The approval record MUST include: the current validated version, the target version, the changelog review outcome, and the approver's signature.

REQUIREMENT: After any `@hex-di/clock` version upgrade, the full IQ/OQ/PQ protocol MUST be re-executed on all deployment targets. Partial re-qualification is NOT acceptable — the entire validation suite MUST pass before the upgraded version enters GxP production use.

REQUIREMENT: GxP organizations MUST maintain configuration management documentation that records the validated version of `@hex-di/clock`, the deployment targets where it is validated, and the date of last qualification for each target.

**Re-qualification triggers:** The following changes MUST trigger full IQ/OQ/PQ re-execution:

- `@hex-di/clock` version upgrade (including patch versions)
- Platform upgrade (Node.js runtime version, OS version)
- Hardware change on deployment target (CPU, memory configuration)
- NTP configuration change (server addresses, drift thresholds, leap smear settings)
- Container graph changes affecting `ClockPort`, `SequenceGeneratorPort`, or `ClockDiagnosticsPort` registrations
- `@hex-di/guard` version upgrade (when deployed alongside `@hex-di/clock`)

**Rationale:** Even patch-level version changes may alter timing behavior (e.g., a fix to the clamped fallback changes monotonic precision characteristics). Full re-qualification ensures that no behavioral regression is introduced silently. The cost of re-qualification is justified by the high impact rating of `wallClockNow()` and `highResNow()` in the GAMP 5 risk classification.

### Emergency Change Control Procedure (21 CFR 11.10(k)(2), EU GMP Annex 11 Section 10)

The standard change control process above requires full IQ/OQ/PQ re-qualification before any version change enters GxP production. While this is appropriate for planned changes, it does not account for critical production incidents requiring urgent clock library updates (e.g., a security vulnerability in the timing API, a data integrity defect producing incorrect timestamps, or a platform-level CVE affecting `performance.now()`).

Without an emergency change procedure, organizations would be forced to choose between operational safety (applying the critical patch immediately) and regulatory compliance (completing full re-qualification first). This procedure provides a controlled expedited path that maintains regulatory defensibility.

#### Emergency Change Criteria

A change qualifies for the emergency procedure when **all** of the following conditions are met:

1. **Severity:** The issue poses an immediate risk to one or more of:
   - Patient safety (e.g., corrupted dosing timestamps in batch records)
   - Data integrity (e.g., a defect producing duplicate sequence numbers or falsified timestamps)
   - System security (e.g., CVE with CVSS score >= 7.0 affecting clock infrastructure)
2. **Urgency:** The risk cannot be acceptably mitigated by operational workarounds (e.g., manual timestamp recording, process suspension) for the duration of standard change control.
3. **Scope:** The change is limited to `@hex-di/clock` and/or its direct dependencies (`@hex-di/guard` clock components). Changes affecting multiple unrelated packages do not qualify for this expedited procedure.

REQUIREMENT: The determination that a change qualifies as an emergency MUST be documented with a written justification addressing all three criteria above, signed by the QA Manager (or designee with documented delegation authority).

#### Expedited Approval Authority

| Standard Change                          | Emergency Change                                           |
| ---------------------------------------- | ---------------------------------------------------------- |
| QA Lead approval + full review committee | QA Manager single-signature approval                       |
| Full changelog review                    | Targeted review of the specific fix and its impact surface |
| No time constraint                       | Decision within 4 hours of emergency declaration           |

REQUIREMENT: Emergency change approval MUST be granted by the QA Manager or a pre-designated QA delegate. The delegation MUST be documented in advance (not at the time of the emergency) and the delegate MUST have equivalent qualification to the QA Manager for clock infrastructure assessment.

REQUIREMENT: The emergency approval record MUST include:

1. Emergency justification (referencing the three criteria above)
2. Current validated version and target version
3. Description of the specific defect or vulnerability being addressed
4. Assessment of the change's impact on timing behavior (does it affect monotonicity, precision, sequence generation, or startup self-test behavior?)
5. Approver signature and timestamp
6. Risk acceptance statement (see below)

#### Temporary Risk Acceptance

When an emergency change is deployed before full re-qualification, the organization accepts a temporary residual risk: the new version has not been validated to the same standard as the previous version. This risk MUST be documented and time-bounded.

REQUIREMENT: The emergency approval record MUST include a risk acceptance statement documenting:

1. The specific validation gaps (e.g., "OQ and PQ protocols not yet executed on production hardware")
2. The interim mitigations in place (e.g., "increased guard monitoring frequency from 60s to 10s", "manual audit trail review every 4 hours")
3. The maximum acceptable duration of temporary risk acceptance (see Retrospective Qualification below)
4. The fallback plan if the emergency change introduces a regression (version rollback procedure per standard change control)

#### Expedited Qualification

Emergency changes MUST complete a minimum expedited qualification before deployment:

| Protocol      | Standard Change | Emergency Change                                                                                                                          |
| ------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| IQ (22 steps) | Full            | Full (all 22 steps)                                                                                                                       |
| OQ (5 steps)  | Full            | IQ + abbreviated OQ: OQ-1 (monotonicity, 10,000 calls instead of 1,000,000) and OQ-3 (sequence uniqueness, 1,000 calls instead of 10,000) |
| PQ (4 steps)  | Full            | Deferred to retrospective qualification                                                                                                   |

REQUIREMENT: Emergency changes MUST pass the full IQ protocol and the abbreviated OQ protocol before production deployment. PQ is deferred but MUST be completed within the retrospective qualification window.

#### Retrospective Full Qualification Window

REQUIREMENT: Full IQ/OQ/PQ re-qualification MUST be completed within **30 calendar days** of emergency deployment. If retrospective qualification is not completed within 30 days, the organization MUST either:

1. Revert to the last fully qualified version, or
2. Extend the temporary risk acceptance with a new risk assessment and QA Manager approval (maximum one 30-day extension; a second extension requires escalation to the Quality Director or equivalent)

REQUIREMENT: The retrospective qualification MUST use the standard (non-abbreviated) IQ/OQ/PQ protocols. Abbreviated OQ results from the emergency deployment MAY be referenced as supporting evidence but do not replace the full protocol execution.

#### Post-Emergency Review

REQUIREMENT: Within **14 calendar days** of emergency deployment, the organization MUST conduct a post-emergency review addressing:

1. **Root cause analysis:** What caused the defect or vulnerability? Could it have been detected earlier?
2. **Detection gap assessment:** Why was the issue not caught by existing IQ/OQ/PQ protocols, FMEA analysis, or guard monitoring? Does the FMEA need updating?
3. **Process improvement:** What changes to development, testing, or deployment processes would prevent recurrence?
4. **Emergency procedure assessment:** Was the emergency change procedure itself adequate? Are improvements needed?
5. **Deviation documentation:** The emergency change MUST be documented as a quality deviation per the organization's deviation management SOP, with corrective and preventive actions (CAPA) assigned and tracked to closure.

REQUIREMENT: The post-emergency review record MUST be retained as part of the computerized system validation plan and made available for regulatory inspection.

#### CAPA Closeout Criteria (21 CFR 211.192, ICH Q10)

Corrective and Preventive Actions (CAPAs) assigned during the post-emergency review MUST be tracked to closure using objective, verifiable criteria. A CAPA that remains open indefinitely represents an uncontrolled quality risk. The following closeout criteria define the minimum evidence required before a CAPA may be closed.

REQUIREMENT: Each CAPA assigned during the post-emergency review MUST satisfy **all** of the following closeout criteria before it may be marked as closed:

| Criterion                       | Evidence Required                                                                                                                                                                                                                                                                                                                                                                                                      | Verified By              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Root cause addressed**        | The corrective action directly addresses the root cause identified in the post-emergency review. Documentation MUST demonstrate a causal link between the root cause and the corrective action, not merely a temporal correlation.                                                                                                                                                                                     | QA Reviewer              |
| **Implementation verified**     | The corrective action has been implemented in the codebase, infrastructure, or organizational procedure. For code changes: the relevant commit SHA, the affected files, and the test results MUST be documented. For procedural changes: the updated SOP version and effective date MUST be documented.                                                                                                                | CAPA Owner + QA Reviewer |
| **Effectiveness confirmed**     | Evidence demonstrates that the corrective action prevents recurrence of the original failure mode. Acceptable evidence includes: (a) updated test cases that would have detected the original defect, with passing results; (b) updated FMEA with revised RPN reflecting the new mitigation; (c) a monitoring period (minimum 30 days) with no recurrence of the failure mode.                                         | QA Reviewer              |
| **Preventive action validated** | If a preventive action was assigned (addressing systemic process gaps beyond the immediate incident), it has been implemented and validated. For process changes: evidence that the updated process was followed for at least one subsequent change cycle. For detection improvements: evidence that the new detection mechanism is operational (e.g., new test case added to CI, new guard monitoring check enabled). | QA Reviewer              |
| **Regression testing passed**   | The full IQ/OQ/PQ protocol passes on all deployment targets after the corrective action is applied. This may be satisfied by the retrospective full qualification (see Retrospective Full Qualification Window above) if the corrective action was part of the emergency change.                                                                                                                                       | GxP Validation Engineer  |
| **Documentation complete**      | The CAPA record includes: CAPA ID, description, assigned owner, assigned date, root cause reference, corrective action description, preventive action description (if applicable), implementation evidence, effectiveness evidence, closeout date, and closeout approver signature.                                                                                                                                    | QA Reviewer              |

REQUIREMENT: CAPA closeout MUST be approved by the QA Reviewer role (see 06/personnel-and-access-control.md). The CAPA owner CANNOT self-approve closeout — independent review is required to prevent bias in effectiveness assessment.

REQUIREMENT: CAPAs MUST be closed within **90 calendar days** of assignment. If a CAPA cannot be closed within 90 days, the CAPA owner MUST provide a written justification to the QA Manager, including: the reason for delay, a revised target closeout date, and interim mitigations in place to control the residual risk. The QA Manager MUST approve the extension in writing. A maximum of one 90-day extension is permitted; CAPAs exceeding 180 days MUST be escalated to the Quality Director or equivalent for disposition.

REQUIREMENT: Closed CAPA records MUST be retained as part of the computerized system validation plan for the same duration as the audit trail records they relate to (see 06/alcoa-mapping.md, Data Archival and Backup Requirements) and made available for regulatory inspection.

REQUIREMENT: The FMEA risk analysis (06/fmea-risk-analysis.md) MUST be reviewed and updated as part of CAPA closeout whenever the corrective or preventive action changes a failure mode's severity, occurrence, or detection score. The updated FMEA MUST be approved by the QA Reviewer before the CAPA is marked as closed.
