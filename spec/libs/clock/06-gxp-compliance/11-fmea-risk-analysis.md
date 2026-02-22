# 6.11 FMEA Risk Analysis — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.10 Personnel and Access Control](./10-personnel-and-access-control.md) | **Next:** [§6.12 Glossary](./12-glossary.md)

> For the generic FMEA methodology (severity/occurrence/detection scales, RPN calculation), see [../../cross-cutting/gxp/05-fmea-methodology.md](../../cross-cutting/gxp/05-fmea-methodology.md). This section contains clock-specific failure modes and RPN assessments.

This Failure Mode and Effects Analysis (FMEA) quantifies the risk associated with each `@hex-di/clock` failure mode using Risk Priority Numbers (RPNs). The FMEA satisfies GAMP 5 Appendix M4 requirements for documented risk assessment and supports ICH Q9 quality risk management principles.

REQUIREMENT: GxP organizations MUST include this FMEA in their computerized system validation plan. The FMEA MUST be reviewed and updated whenever failure modes, detection mechanisms, or mitigations change.

### RPN Action Threshold

This FMEA uses an RPN action threshold of **100**. Failure modes with an RPN at or above 100 require mandatory corrective action before GxP deployment approval. Failure modes with RPNs in the 61-99 range require documented risk acceptance by the QA Reviewer. Failure modes with RPNs below 61 are considered managed risks and require monitoring but no mandatory corrective action. These thresholds are consistent with GAMP 5 Appendix M4 risk-based approach and ICH Q9 quality risk management principles. Organizations MAY adopt lower action thresholds based on their risk appetite.

### Residual Risk Acceptance Criteria

After applying all mitigations, each failure mode's residual RPN MUST fall within the following acceptance bands:

| Residual RPN Range | Classification | Required Action |
| --- | --- | --- |
| 1–60 | Acceptable | Routine monitoring; no additional corrective action required |
| 61–99 | Conditionally acceptable | Documented risk acceptance by QA Reviewer required (see Risk Acceptance Record below) |
| 100+ | Unacceptable | Mandatory corrective action before GxP deployment; MUST NOT proceed with residual RPN ≥ 100 |

REQUIREMENT: All failure modes in this FMEA MUST have a residual RPN below 100 after mitigation. As of this revision, all 12 individual failure modes and 6 compound failure modes satisfy this criterion (maximum residual RPN: 84, FM-3). The QA Reviewer MUST confirm residual risk acceptability as part of the Risk Acceptance Record below.

---

## Scoring Criteria

### Severity (S) -- Impact on Data Integrity and Patient Safety

| Score | Level      | Description                                                                                                             |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1     | Negligible | No impact on data integrity or regulatory compliance.                                                                   |
| 2-3   | Low        | Minor inconvenience; no data integrity violation. Informational diagnostic only.                                        |
| 4-5   | Moderate   | Potential for incorrect derived calculations (e.g., durations, timeouts). No direct audit trail corruption.             |
| 6-7   | High       | Audit trail ordering or accuracy compromised. ALCOA+ principle violated. Regulatory finding likely.                     |
| 8-9   | Very High  | Complete loss of audit trail integrity. Electronic records untrustworthy. Critical regulatory violation.                |
| 10    | Critical   | Patient safety impact through corrupted batch records, incorrect dosing timestamps, or undetectable data falsification. |

### Occurrence (O) -- Likelihood of the Failure Mode

| Score | Level                | Description                                                                |
| ----- | -------------------- | -------------------------------------------------------------------------- |
| 1     | Virtually impossible | Requires physical impossibility or >100,000 years of continuous operation. |
| 2     | Remote               | Requires extraordinary conditions (e.g., hardware defect, runtime bug).    |
| 3     | Very Low             | Requires unusual but possible conditions (e.g., misconfigured NTP).        |
| 4-5   | Low                  | Can occur with incorrect deployment configuration.                         |
| 6-7   | Moderate             | Can occur under normal operational stress (e.g., high concurrency).        |
| 8-9   | High                 | Expected to occur without preventive measures.                             |
| 10    | Very High            | Occurs every time without mitigation.                                      |

### Detection (D) -- Ability to Detect Before Impact

| Score | Level        | Description                                                           |
| ----- | ------------ | --------------------------------------------------------------------- |
| 1     | Certain      | Compile-time detection. Cannot reach production.                      |
| 2     | Very High    | Detected at startup (fail-fast). Application does not serve requests. |
| 3     | High         | Detected by automated IQ/OQ/PQ tests before deployment.               |
| 4-5   | Moderate     | Detected by periodic runtime monitoring (monitoring adapter heartbeat). |
| 6-7   | Low          | Detected only by manual audit trail review.                           |
| 8-9   | Very Low     | Detected only by external regulatory audit.                           |
| 10    | Undetectable | No detection mechanism exists.                                        |

---

## FMEA Table

| ID    | Failure Mode                         | Cause                                                                                      | Effect                                                                                    | S   | O   | D   | RPN    | Mitigation                                                                                                                                                             | Residual Risk |
| ----- | ------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --- | --- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| FM-1a | ST-1: Negative monotonic time        | Broken `performance.now()` implementation                                                  | Application cannot start; no timestamps generated                                         | 8   | 2   | 2   | **32** | Startup self-test returns `err(ClockStartupError)`; fail-fast prevents operation with broken timer                                                                     | Low           |
| FM-1b | ST-2: Implausible wall-clock         | System clock unset or before 2020                                                          | Application cannot start; no timestamps generated                                         | 8   | 3   | 2   | **48** | Startup self-test returns `err(ClockStartupError)`; NTP synchronization required before app start (DQ-2)                                                               | Low           |
| FM-1c | ST-3: Monotonic regression           | Platform-level defect in `performance.now()`                                               | Application cannot start                                                                  | 8   | 1   | 2   | **16** | Startup self-test detects regression; platform bug filing required                                                                                                     | Negligible    |
| FM-1d | ST-4: Platform APIs not frozen (GxP) | Missing `Object.freeze()` at entry point                                                   | Application cannot start in GxP mode                                                      | 7   | 4   | 2   | **56** | Startup self-test in GxP mode; DQ-3 deployment checklist verification                                                                                                  | Low           |
| FM-2  | Sequence overflow                    | Counter reaches `MAX_SAFE_INTEGER`                                                         | No further sequence numbers; audit ordering lost                                          | 9   | 1   | 4   | **36** | Overflow detection via `err(SequenceOverflowError)` return; `createOverflowContext()` for emergency audit; capacity monitoring recommended                             | Negligible    |
| FM-3  | NTP desynchronization                | NTP server unreachable or drift exceeds threshold                                          | Wall-clock timestamps inaccurate; ALCOA+ Contemporaneous violated                         | 7   | 3   | 4   | **84** | Ecosystem periodic drift monitoring (see monitoring adapter spec); OR `setupPeriodicClockEvaluation()` (CLK-GXP-007a) for deployments using CLK-GXP-008 compensating controls | Low-Moderate  |
| FM-4  | Platform API tampering               | Malicious or accidental `Date.now` or `performance.now` reassignment                       | All subsequent timestamps untrustworthy                                                   | 9   | 2   | 2   | **36** | Captured API references at construction; `Object.freeze()` on platform objects in GxP mode; ST-4 verification                                                          | Low           |
| FM-5  | Adapter integrity violation          | Unexpected adapter replacement without audit event                                         | Clock source provenance lost; ALCOA+ Attributable violated                                | 7   | 2   | 4   | **56** | Ecosystem periodic adapter integrity check (see monitoring adapter spec); `ClockSourceChangedEvent` for authorized changes; container access control                                    | Low           |
| FM-6  | Process crash and restart            | Application crash, OOM, hardware failure                                                   | Sequence numbers restart from 1; potential ordering confusion without `processInstanceId` | 5   | 5   | 3   | **75** | `processInstanceId` composite key ensures global uniqueness; monitoring adapter startup logging (see monitoring adapter spec)                                                                    | Low-Moderate  |
| FM-7  | Precision fabrication                | Code modification that synthesizes sub-ms values from ms-resolution source                 | False precision in audit records; ALCOA+ Accurate violated                                | 8   | 2   | 3   | **48** | Spec prohibition (MUST NOT fabricate precision); code review; IQ/OQ precision verification (OQ-4)                                                                      | Low           |
| FM-8  | Capture ordering violation           | `create()` calling clock functions before `seq.next()`                                     | Inconsistent happens-before relationship in temporal context                              | 6   | 2   | 3   | **36** | Spec requirement for seq-first ordering; DoD 8: #7-#8 tests verify ordering via recording mock                                                                         | Low           |
| FM-9  | `performance.timeOrigin` drift       | NTP step correction after process start shifts `timeOrigin + now` relative to `Date.now()` | `highResNow()` and `wallClockNow()` diverge; cross-function inconsistency                 | 6   | 3   | 2   | **36** | ST-5 startup consistency check (returns `err(ClockStartupError)` when divergence > 1000ms); ecosystem periodic consistency check; NTP pre-sync before process start (DQ-2) | Low           |
| FM-10 | Cached clock used for audit timestamps | Developer passes `CachedClockPort` where `ClockPort` is expected (e.g., to `createTemporalContextFactory`) | Audit trail timestamps are stale by up to `updateIntervalMs`; ALCOA+ Contemporaneous violated | 8   | 2   | 1   | **16** | `CachedClockPort` is structurally incompatible with `ClockPort` (different method names). Compile-time error prevents substitution. Method names (`recentMonotonicNow` vs. `monotonicNow`) make staleness explicit. | Negligible |
| FM-11 | Timer callback ordering violation in virtual scheduler | Implementation bug fires virtual timers out of chronological order | Test assertions pass with wrong ordering; production behavior differs from test expectations | 5   | 2   | 3   | **30** | CLK-TMR-011 requires chronological firing (FIFO for ties). DoD 20 tests verify ordering with multiple concurrent timers at same and different scheduled times. | Low |
| FM-12 | Auto-advance interference with explicit advance | Developer enables `autoAdvance` and also calls `advance()` manually, causing unexpected double time progression | Time advances more than expected; timers fire at unexpected points; test assertions become fragile | 4   | 4   | 3   | **48** | Auto-advance behavior is documented (§5.1): reads advance time, explicit `advance()` also advances time. Tests should use one approach or the other, not both. `getAutoAdvance()` allows runtime inspection of current setting. | Low |

---

## Compound Failure Analysis (ICH Q9 Interaction Assessment)

ICH Q9 recommends considering failure mode interactions, particularly for interrelated system components. The following compound scenarios assess the combined effect of simultaneous or cascading failures where the compound outcome is more severe than either failure alone.

### Compound Scoring Methodology

Compound RPNs are calculated as follows:

- **Severity (S):** The maximum severity of the constituent failure modes, plus 1 if the compound effect creates a qualitatively worse outcome than either failure alone (capped at 10).
- **Occurrence (O):** The product of individual occurrence probabilities, expressed on the 1-10 scale. For two independent failure modes with O scores of `a` and `b`, the compound O is `max(1, ceil((a × b) / 10))`.
- **Detection (D):** The maximum (worst) detection score of the constituents, as the compound scenario is at least as hard to detect as its hardest-to-detect component.

**Assessor override:** When the compound interaction creates severity amplification or detection challenges not captured by the formula (e.g., simultaneous compromise of multiple independent detection mechanisms), the assessor MAY increase S or D by up to +2 beyond the formula result. Each override MUST be justified in the compound effect description. Overrides applied: CFM-1 S (formula 8, assessed 9 — both time references simultaneously untrustworthy escalates from "accuracy compromised" to "integrity lost"); CFM-2 D (formula 4, assessed 5 — both adapter and API checks pass individually, defeating layered detection); CFM-4 D (formula 4, assessed 6 — narrow crash-during-overflow timing window makes the data loss detectable only by manual gap analysis); CFM-5 S (formula 9, assessed 10 — overflow context is the last-resort safety net for audit continuity, and simultaneous loss of wall-clock accuracy in that safety net escalates from "ordering lost" to "both ordering and accuracy lost").

### Compound FMEA Table

| ID    | Compound Scenario                        | Constituent FMs | Compound Effect                                                                                                                                                                                                                                                                                                                                                                                                                                 | S   | O   | D   | RPN    | Compound Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Residual Risk |
| ----- | ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CFM-1 | NTP desync + timeOrigin drift            | FM-3 + FM-9     | Both the absolute time reference (`wallClockNow()`) and the high-resolution time reference (`highResNow()`) become unreliable simultaneously. No timestamp function produces a trustworthy value. Cross-function consistency checks fail silently if both drift in the same direction. Audit trail timestamps are entirely untrustworthy.                                                                                                       | 9   | 1   | 4   | **36** | ST-5 catches initial timeOrigin drift at startup. The ecosystem's periodic NTP drift check detects wallClock drift. **Compound-specific:** the monitoring adapter SHOULD cross-validate `wallClockNow()` against `highResNow()` periodically; divergence between the two that was not present at startup indicates a compound scenario. DQ-2 (NTP pre-sync) prevents the most common trigger.                                                                                                                                                | Low           |
| CFM-2 | API tampering + adapter replacement      | FM-4 + FM-5     | An attacker replaces both the platform APIs and the adapter registration, creating a consistent but falsified clock source. Standard integrity checks (adapter name verification, platform API freeze) each pass individually because both have been compromised in concert.                                                                                                                                                                    | 10  | 1   | 5   | **50** | SEC-1 (captured API references) prevents post-construction API tampering. ST-4 (GxP mode) prevents unfrozen API objects. Container graph access control prevents unauthorized adapter registration. **Compound-specific:** the monitoring adapter SHOULD compare adapter-reported diagnostics against an independently obtained time source (e.g., NTP server direct query) at startup. The combination of SEC-1 + ST-4 + container access control makes simultaneous compromise of all three defenses extremely unlikely.           | Low           |
| CFM-3 | Process restart + NTP unavailable        | FM-6 + FM-3     | Process restarts into an environment where NTP is unreachable. Sequence numbers reset to 1 (expected), but wall-clock timestamps may be stale or drifted from the pre-restart state. Without NTP correction, `wallClockNow()` may return values offset from true UTC by the duration of the NTP outage. The composite key `(processInstanceId, sequenceNumber)` ensures ordering, but absolute timestamps in the new process are untrustworthy. | 7   | 2   | 4   | **56** | `processInstanceId` composite key provides ordering across restarts. The ecosystem's NTP connectivity check at startup detects NTP unavailability. DQ-2 (NTP pre-sync) gates application startup on NTP availability. **Compound-specific:** the monitoring adapter SHOULD refuse to start in GxP mode if NTP is unreachable at startup (fail-fast), preventing the application from generating untrustworthy timestamps during NTP outage. FM-1b (ST-2) catches grossly wrong system clocks but not minor NTP drift.                        | Low-Moderate  |
| CFM-4 | Sequence overflow + process restart race | FM-2 + FM-6     | The sequence generator overflows (returns `err(SequenceOverflowError)`) and the process crashes during overflow recovery handling before the emergency `OverflowTemporalContext` can be persisted. The overflow event itself is lost from the audit trail, creating a gap in the audit record.                                                                                                                                                  | 9   | 1   | 6   | **54** | `createOverflowContext()` provides emergency context. **Compound-specific:** consumers SHOULD persist the `OverflowTemporalContext` as the first action in the overflow error handler, before any other processing, to minimize the window where a crash could prevent persistence. The monitoring adapter SHOULD monitor sequence counter proximity to `MAX_SAFE_INTEGER` and emit early warnings at configurable thresholds (default: 90% of capacity), giving operators time to plan a controlled restart before overflow occurs. | Low           |
| CFM-5 | NTP desync + sequence overflow           | FM-3 + FM-2     | NTP desynchronization occurs during a period when the sequence generator has overflowed. The application falls back to `createOverflowContext()` (which produces `OverflowTemporalContext` with `sequenceNumber: -1`), but the wall-clock timestamps embedded in the overflow context are also inaccurate due to NTP drift. The emergency audit records — which are the last line of defense for audit continuity — have no trustworthy timestamp, losing both ordering and accuracy simultaneously. | 10  | 1   | 4   | **40** | FM-2 mitigations (overflow detection, `createOverflowContext()`) preserve audit continuity. FM-3 mitigations (ecosystem NTP drift monitoring) detect wall-clock drift. **Compound-specific:** the monitoring adapter SHOULD emit a critical alert when both overflow mode is active and NTP drift exceeds the warning threshold simultaneously, enabling immediate operator intervention. Consumers SHOULD include `ClockDiagnosticsPort.getDiagnostics()` output alongside `OverflowTemporalContext` records to preserve maximum provenance information even when timestamps are unreliable. Monotonic timestamps remain trustworthy (unaffected by NTP) and provide relative ordering within the overflow period. | Low           |
| CFM-6 | API tampering + NTP desync               | FM-4 + FM-3     | An attacker replaces platform APIs (`Date.now`, `performance.now`) while NTP is simultaneously desynchronized. The captured platform API references (SEC-1) protect against post-construction `Date.now` replacement, but if the tampering occurs before adapter construction AND NTP is unavailable for cross-validation, the adapter may be constructed with falsified timing functions and no external reference to detect the discrepancy. The startup self-test (ST-1 through ST-3) validates plausibility but cannot distinguish a carefully crafted falsified time source from a real one if both `Date.now` and `performance` are compromised consistently. | 10  | 1   | 5   | **50** | SEC-1 (captured API references at construction) prevents post-construction tampering. ST-4 (GxP mode) prevents unfrozen platform API objects. ST-5 cross-validates `highResNow()` and `wallClockNow()` consistency. The ecosystem's NTP startup check detects gross time discrepancies against external reference. **Compound-specific:** the combination of pre-construction API tampering + NTP unavailability requires an attacker to compromise the host OS time subsystem AND prevent network connectivity simultaneously — this is a privileged-access attack scenario. Mitigation: DQ-2 (NTP pre-sync) gates application startup on NTP availability, narrowing the window to host-level OS compromise only. GxP deployments SHOULD implement host integrity monitoring (e.g., TPM-based boot attestation, file integrity monitoring on system binaries) to detect pre-construction tampering. The per-record SHA-256 digest provides after-the-fact tamper evidence if records are later compared against an independent time source. | Low           |

### Compound Risk Summary

| RPN Range | Count | Compound Scenarios                          |
| --------- | ----- | ------------------------------------------- |
| 1-30      | 0     | --                                          |
| 31-60     | 6     | CFM-1, CFM-2, CFM-3, CFM-4, CFM-5, CFM-6   |
| 61-90     | 0     | --                                          |
| 91+       | 0     | --                                          |

**Highest compound residual risk:** CFM-3 (process restart + NTP unavailable) at RPN 56. This scenario is most concerning for GxP environments because it produces a period of untrustworthy timestamps that may not be detected until the next NTP synchronization. Mitigation relies on the ecosystem's startup NTP connectivity check and DQ-2 infrastructure requirement.

**Second highest compound residual risk:** CFM-4 (sequence overflow + process restart race) at RPN 54. The narrow timing window and virtual impossibility of reaching `MAX_SAFE_INTEGER` make this scenario negligible in practice.

**API tampering + NTP desync (CFM-6):** RPN 50. This privileged-access attack scenario requires simultaneous compromise of the host OS time subsystem and NTP connectivity. The combination of SEC-1 (captured API references), ST-4 (platform freeze check), DQ-2 (NTP pre-sync), and host integrity monitoring provides layered defense. The per-record SHA-256 digest enables after-the-fact tamper evidence.

**NTP + overflow interaction (CFM-5):** RPN 40. Although the compound severity is maximal (10 — both ordering and accuracy lost), the occurrence of simultaneous NTP desynchronization and sequence overflow is astronomically unlikely (O=1). Monotonic timestamps remain unaffected by NTP drift and provide relative ordering even when wall-clock accuracy is compromised.

**Key finding:** No compound scenario exceeds RPN 56, which remains within the 31-60 "managed risk" range. This is because the library's layered defenses (startup self-test, captured API references, structural irresettability, ecosystem periodic monitoring) provide orthogonal protection mechanisms that are difficult to compromise simultaneously.

REQUIREMENT: GxP organizations MUST review this compound failure analysis alongside the individual FMEA table when assessing deployment risk. The compound scenarios MUST be included in the computerized system validation plan.

REQUIREMENT: The compound FMEA MUST be re-evaluated whenever individual failure mode scores change, new failure modes are identified, or detection mechanisms are modified.

### 3-Way Compound Failure Mode Exclusion Justification (ICH Q9 Proportionality)

This FMEA limits compound analysis to 2-way failure mode combinations. 3-way (and higher-order) compound scenarios were considered and excluded based on the following analysis:

1. **Statistical independence:** The 12 individual failure modes arise from independent root causes (platform defects, NTP infrastructure, process crashes, developer errors, attacker actions). No systemic condition simultaneously triggers three or more failure modes. The probability of three independent failure modes occurring simultaneously is the product of their individual occurrence probabilities — for three modes at O=3 (the most common occurrence score), the compound occurrence is `ceil((3 × 3 × 3) / 100) = 1`, i.e., virtually impossible.

2. **Diminishing returns:** The 6 analyzed 2-way compound scenarios produced a maximum RPN of 56 (CFM-3). All 2-way RPNs fall within the 31-60 "managed risk" range, well below the 100 action threshold. Adding a third simultaneous failure mode would further reduce the compound occurrence score (by multiplying with the third mode's O score and dividing by 10), pushing 3-way RPNs even lower than the 2-way values already well within acceptable ranges.

3. **Detection redundancy:** The library's layered detection mechanisms (compile-time type checks, startup self-test, runtime monitoring, cryptographic digests) operate on orthogonal failure modes. Even in a 2-way compound scenario, at least one detection layer remains effective. A 3-way scenario does not defeat an additional detection layer beyond what the 2-way analysis already captures.

4. **ICH Q9 proportionality:** ICH Q9 Section 1 states that "the level of effort, formality and documentation of the quality risk management process should be commensurate with the level of risk." Given that all 2-way compounds are in the managed risk range and 3-way probabilities are negligible, exhaustive 3-way analysis would not yield actionable findings proportionate to the effort.

REQUIREMENT: If a future FMEA review identifies a systemic condition that could simultaneously trigger three or more failure modes (violating the independence assumption above), 3-way compound analysis MUST be performed for the affected combination.

---

## Risk Summary

| RPN Range | Count | Failure Modes                                                     |
| --------- | ----- | ----------------------------------------------------------------- |
| 1-30      | 3     | FM-1c, FM-10, FM-11                                               |
| 31-60     | 10    | FM-1a, FM-1b, FM-1d, FM-2, FM-4, FM-5, FM-7, FM-8, FM-9, FM-12   |
| 61-90     | 2     | FM-3, FM-6                                                        |
| 91+       | 0     | --                                                                |

**Highest residual risk:** FM-3 (NTP desynchronization) at RPN 84. Mitigation relies on the ecosystem's periodic drift monitoring with configurable thresholds (warning/error/fail-fast escalation). Organizations MUST deploy ecosystem GxP monitoring infrastructure with `gxp: true` to ensure continuous NTP validation. When the ecosystem monitoring adapter is not co-deployed, organizations MUST implement compensating controls per CLK-GXP-008 (§ 6.7, recovery-procedures.md) to maintain the Detection score at D=4; without compensating controls, Detection degrades to D=8-9, pushing FM-3's RPN to 168-189 (above the RPN 100 action threshold).

**Second highest residual risk:** FM-6 (process crash and restart) at RPN 75. Mitigation relies on the `(processInstanceId, sequenceNumber)` composite key for global uniqueness across process lifetimes. Organizations MUST ensure process restart events are logged in the audit trail.

**Lowest residual risk:** FM-1c (monotonic regression) and FM-10 (cached clock misuse) at RPN 16. FM-1c: platform-level monotonicity violations are exceedingly rare and detected immediately at startup. FM-10: compile-time prevention via structural type incompatibility between `CachedClockPort` and `ClockPort`.

**FM-9 note:** The addition of ST-5 (high-res/wall-clock consistency check at startup) reduced FM-9's Detection score from 5 (moderate — detected only by ecosystem periodic monitoring) to 2 (very high — detected at startup before any audit-relevant timestamp is generated). This reduced the RPN from 90 to 36, moving FM-9 from the 61-90 range into the 31-60 range. The startup check catches the most common FM-9 trigger (NTP not yet synchronized at process start) at adapter construction time, before any `highResNow()` value is used for audit purposes.

---

## Review and Acceptance

REQUIREMENT: This FMEA MUST be reviewed by the QA Reviewer role (see `./10-personnel-and-access-control.md`) and accepted as part of the computerized system validation plan before GxP deployment.

REQUIREMENT: The FMEA MUST be re-evaluated whenever:

- New failure modes are identified (e.g., through incident reports or regulatory findings).
- Detection mechanisms are added or modified.
- Mitigations are added, removed, or changed.
- Platform or infrastructure changes affect occurrence likelihood.

### Periodic FMEA Review Schedule

REQUIREMENT (CLK-FMEA-001): In addition to the event-driven re-evaluation triggers above, the FMEA MUST be reviewed on a periodic schedule to ensure it remains current with evolving platform capabilities, regulatory expectations, and organizational risk appetite:

| Review Type | Frequency | Scope | Reviewer |
| --- | --- | --- | --- |
| **Full FMEA review** | Annually (12 months from last review date) | All individual and compound failure modes, scoring criteria, risk acceptance records | QA Reviewer |
| **Compound scenario review** | Annually (as part of full FMEA review) or upon addition of new individual failure modes | All compound failure mode combinations, 3-way exclusion justification validity | QA Reviewer |
| **Risk acceptance record reconfirmation** | Annually | FM-3 (RPN 84) and FM-6 (RPN 75) risk acceptance records, plus any newly entered 61-99 range FMs | QA Manager |

REQUIREMENT (CLK-FMEA-002): Each periodic review MUST be documented with: the review date, the reviewer identity, the review scope (full or targeted), the outcome (no changes / updated scores / new failure modes identified), and the next scheduled review date. The review record MUST be retained as part of the FMEA revision history.

**Organizational alignment guidance:** GxP organizations SHOULD synchronize the annual FMEA review with their Annual Product Quality Review (APQR) per ICH Q10, management review per ISO 13485, or equivalent periodic quality review process. Aligning the FMEA review with the broader quality review ensures that changes in risk appetite, regulatory expectations, and operational experience are considered holistically. When the organization's periodic quality review cycle does not align with the 12-month FMEA review cycle, the organization SHOULD execute the FMEA review at whichever date occurs first (12-month anniversary or periodic quality review).

**Next Review Due:** The next full FMEA review is due no later than 2027-02-15 (12 months from the current FMEA revision date of 2026-02-15), or at the organization's next APQR cycle, whichever occurs first. This date MUST be updated each time the FMEA is reviewed.

REQUIREMENT: GxP organizations MUST register the FMEA review due date in their quality management system calendar or equivalent automated reminder mechanism. The reminder MUST trigger at least **30 calendar days** before the review due date to allow adequate scheduling of reviewer availability and preparation. Organizations using manual tracking (e.g., spreadsheet-based quality calendars) MUST designate a named individual responsible for monitoring the review due date and initiating the review process. The reminder mechanism MUST be documented in the organization's CSVP.

---

## Risk Acceptance Record (RPN 61–99)

Per the RPN action threshold methodology defined above, failure modes with RPNs in the 61–99 range require documented risk acceptance by the QA Reviewer before GxP deployment approval. The following failure modes fall in this range and require formal sign-off.

REQUIREMENT: The QA Reviewer MUST complete the risk acceptance record below before this FMEA is considered approved for GxP deployment. Each entry MUST include: the acceptance justification confirming that existing mitigations reduce residual risk to an acceptable level, the reviewer's printed name and organizational title, signature (per 21 CFR 11.50 if electronic), and date.

| FM ID | RPN | Residual Risk | Acceptance Justification                                                                                                                                                                                                     | Printed Name / Title       | Signature                  | Date                   |
| ----- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- | ---------------------- |
| FM-3  | 84  | Low-Moderate  | NTP desynchronization is mitigated by ecosystem periodic drift monitoring with configurable thresholds (warning/error/fail-fast escalation) and DQ-2 infrastructure requirement. Monotonic timestamps and sequence ordering are unaffected; only wall-clock accuracy is at risk. | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |
| FM-6  | 75  | Low-Moderate  | Process crash/restart is mitigated by the `(processInstanceId, sequenceNumber)` composite key ensuring global uniqueness across process lifetimes. Monitoring adapter startup logging detects restarts. Data integrity of pre-crash records is verifiable via `verifyTemporalContextDigest()`. | **********\_\_\_********** | **********\_\_\_********** | \_**\_/\_\_**/\_\_\_\_ |

REQUIREMENT: This risk acceptance record MUST be re-executed whenever the RPN scores for FM-3 or FM-6 change, or when new failure modes enter the 61–99 RPN range.

REQUIREMENT: GxP organizations MUST retain the completed risk acceptance record as part of the computerized system validation plan and make it available for regulatory inspection.

**Execution timing:** The risk acceptance records above are **templates** within this specification. GxP organizations MUST complete these records (fill in all blank fields with actual signatory information) as part of the DQ-5 pre-deployment approval process (see README.md, "Pre-Deployment Approval Verification"). The completed records MUST be stored alongside the `APPROVAL_RECORD.json` in the organization's computerized system validation package. DQ-5 step 4 (signatory verification) implicitly covers risk acceptance record completion — deployment approval MUST NOT proceed until both the specification approval record and the FMEA risk acceptance records are signed by authorized personnel.

---


