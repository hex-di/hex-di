# FMEA Risk Analysis

## Purpose

This Failure Mode and Effects Analysis (FMEA) quantifies the risk associated with each `@hex-di/clock` failure mode using Risk Priority Numbers (RPNs). The FMEA satisfies GAMP 5 Appendix M4 requirements for documented risk assessment and supports ICH Q9 quality risk management principles.

REQUIREMENT: GxP organizations MUST include this FMEA in their computerized system validation plan. The FMEA MUST be reviewed and updated whenever failure modes, detection mechanisms, or mitigations change.

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
| 4-5   | Moderate     | Detected by periodic runtime monitoring (guard heartbeat).            |
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
| FM-3  | NTP desynchronization                | NTP server unreachable or drift exceeds threshold                                          | Wall-clock timestamps inaccurate; ALCOA+ Contemporaneous violated                         | 7   | 3   | 4   | **84** | Guard periodic drift monitoring (see guard spec)                                                                                                                       | Low-Moderate  |
| FM-4  | Platform API tampering               | Malicious or accidental `Date.now` or `performance.now` reassignment                       | All subsequent timestamps untrustworthy                                                   | 9   | 2   | 2   | **36** | Captured API references at construction; `Object.freeze()` on platform objects in GxP mode; ST-4 verification                                                          | Low           |
| FM-5  | Adapter integrity violation          | Unexpected adapter replacement without audit event                                         | Clock source provenance lost; ALCOA+ Attributable violated                                | 7   | 2   | 4   | **56** | Guard periodic adapter integrity check (see guard spec); `ClockSourceChangedEvent` for authorized changes; container access control                                    | Low           |
| FM-6  | Process crash and restart            | Application crash, OOM, hardware failure                                                   | Sequence numbers restart from 1; potential ordering confusion without `processInstanceId` | 5   | 5   | 3   | **75** | `processInstanceId` composite key ensures global uniqueness; guard startup logging (see guard spec)                                                                    | Low-Moderate  |
| FM-7  | Precision fabrication                | Code modification that synthesizes sub-ms values from ms-resolution source                 | False precision in audit records; ALCOA+ Accurate violated                                | 8   | 2   | 3   | **48** | Spec prohibition (MUST NOT fabricate precision); code review; IQ/OQ precision verification (OQ-4)                                                                      | Low           |
| FM-8  | Capture ordering violation           | `create()` calling clock functions before `seq.next()`                                     | Inconsistent happens-before relationship in temporal context                              | 6   | 2   | 3   | **36** | Spec requirement for seq-first ordering; DoD 8: #7-#8 tests verify ordering via recording mock                                                                         | Low           |
| FM-9  | `performance.timeOrigin` drift       | NTP step correction after process start shifts `timeOrigin + now` relative to `Date.now()` | `highResNow()` and `wallClockNow()` diverge; cross-function inconsistency                 | 6   | 3   | 2   | **36** | ST-5 startup consistency check (returns `err(ClockStartupError)` when divergence > 1000ms); guard periodic consistency check; NTP pre-sync before process start (DQ-2) | Low           |

---

## Compound Failure Analysis (ICH Q9 Interaction Assessment)

ICH Q9 recommends considering failure mode interactions, particularly for interrelated system components. The following compound scenarios assess the combined effect of simultaneous or cascading failures where the compound outcome is more severe than either failure alone.

### Compound Scoring Methodology

Compound RPNs are calculated as follows:

- **Severity (S):** The maximum severity of the constituent failure modes, plus 1 if the compound effect creates a qualitatively worse outcome than either failure alone (capped at 10).
- **Occurrence (O):** The product of individual occurrence probabilities, expressed on the 1-10 scale. For two independent failure modes with O scores of `a` and `b`, the compound O is `max(1, ceil((a × b) / 10))`.
- **Detection (D):** The maximum (worst) detection score of the constituents, as the compound scenario is at least as hard to detect as its hardest-to-detect component.

**Assessor override:** When the compound interaction creates severity amplification or detection challenges not captured by the formula (e.g., simultaneous compromise of multiple independent detection mechanisms), the assessor MAY increase S or D by up to +2 beyond the formula result. Each override MUST be justified in the compound effect description. Overrides applied: CFM-1 S (formula 8, assessed 9 — both time references simultaneously untrustworthy escalates from "accuracy compromised" to "integrity lost"); CFM-2 D (formula 4, assessed 5 — both adapter and API checks pass individually, defeating layered detection); CFM-4 D (formula 4, assessed 6 — narrow crash-during-overflow timing window makes the data loss detectable only by manual gap analysis).

### Compound FMEA Table

| ID    | Compound Scenario                        | Constituent FMs | Compound Effect                                                                                                                                                                                                                                                                                                                                                                                                                                 | S   | O   | D   | RPN    | Compound Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Residual Risk |
| ----- | ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CFM-1 | NTP desync + timeOrigin drift            | FM-3 + FM-9     | Both the absolute time reference (`wallClockNow()`) and the high-resolution time reference (`highResNow()`) become unreliable simultaneously. No timestamp function produces a trustworthy value. Cross-function consistency checks fail silently if both drift in the same direction. Audit trail timestamps are entirely untrustworthy.                                                                                                       | 9   | 1   | 4   | **36** | ST-5 catches initial timeOrigin drift at startup. Guard's periodic NTP drift check detects wallClock drift. **Compound-specific:** guard SHOULD cross-validate `wallClockNow()` against `highResNow()` periodically; divergence between the two that was not present at startup indicates a compound scenario. DQ-2 (NTP pre-sync) prevents the most common trigger.                                                                                                                                                | Low           |
| CFM-2 | API tampering + adapter replacement      | FM-4 + FM-5     | An attacker replaces both the platform APIs and the adapter registration, creating a consistent but falsified clock source. Standard integrity checks (adapter name verification, platform API freeze) each pass individually because both have been compromised in concert.                                                                                                                                                                    | 10  | 1   | 5   | **50** | SEC-1 (captured API references) prevents post-construction API tampering. ST-4 (GxP mode) prevents unfrozen API objects. Container graph access control prevents unauthorized adapter registration. **Compound-specific:** guard SHOULD compare adapter-reported diagnostics against an independently obtained time source (e.g., NTP server direct query) at startup. The combination of SEC-1 + ST-4 + container access control makes simultaneous compromise of all three defenses extremely unlikely.           | Low           |
| CFM-3 | Process restart + NTP unavailable        | FM-6 + FM-3     | Process restarts into an environment where NTP is unreachable. Sequence numbers reset to 1 (expected), but wall-clock timestamps may be stale or drifted from the pre-restart state. Without NTP correction, `wallClockNow()` may return values offset from true UTC by the duration of the NTP outage. The composite key `(processInstanceId, sequenceNumber)` ensures ordering, but absolute timestamps in the new process are untrustworthy. | 7   | 2   | 4   | **56** | `processInstanceId` composite key provides ordering across restarts. Guard's NTP connectivity check at startup detects NTP unavailability. DQ-2 (NTP pre-sync) gates application startup on NTP availability. **Compound-specific:** guard SHOULD refuse to start in GxP mode if NTP is unreachable at startup (fail-fast), preventing the application from generating untrustworthy timestamps during NTP outage. FM-1b (ST-2) catches grossly wrong system clocks but not minor NTP drift.                        | Low-Moderate  |
| CFM-4 | Sequence overflow + process restart race | FM-2 + FM-6     | The sequence generator overflows (returns `err(SequenceOverflowError)`) and the process crashes during overflow recovery handling before the emergency `OverflowTemporalContext` can be persisted. The overflow event itself is lost from the audit trail, creating a gap in the audit record.                                                                                                                                                  | 9   | 1   | 6   | **54** | `createOverflowContext()` provides emergency context. **Compound-specific:** consumers SHOULD persist the `OverflowTemporalContext` as the first action in the overflow error handler, before any other processing, to minimize the window where a crash could prevent persistence. Guard SHOULD monitor sequence counter proximity to `MAX_SAFE_INTEGER` and emit early warnings at configurable thresholds (default: 90% of capacity), giving operators time to plan a controlled restart before overflow occurs. | Low           |

### Compound Risk Summary

| RPN Range | Count | Compound Scenarios         |
| --------- | ----- | -------------------------- |
| 1-30      | 0     | --                         |
| 31-60     | 4     | CFM-1, CFM-2, CFM-3, CFM-4 |
| 61-90     | 0     | --                         |
| 91+       | 0     | --                         |

**Highest compound residual risk:** CFM-3 (process restart + NTP unavailable) at RPN 56. This scenario is most concerning for GxP environments because it produces a period of untrustworthy timestamps that may not be detected until the next NTP synchronization. Mitigation relies on the guard's startup NTP connectivity check and DQ-2 infrastructure requirement.

**Key finding:** No compound scenario exceeds RPN 56, which remains within the 31-60 "managed risk" range. This is because the library's layered defenses (startup self-test, captured API references, structural irresettability, guard periodic monitoring) provide orthogonal protection mechanisms that are difficult to compromise simultaneously.

REQUIREMENT: GxP organizations MUST review this compound failure analysis alongside the individual FMEA table when assessing deployment risk. The compound scenarios MUST be included in the computerized system validation plan.

REQUIREMENT: The compound FMEA MUST be re-evaluated whenever individual failure mode scores change, new failure modes are identified, or detection mechanisms are modified.

---

## Risk Summary

| RPN Range | Count | Failure Modes                                           |
| --------- | ----- | ------------------------------------------------------- |
| 1-30      | 1     | FM-1c                                                   |
| 31-60     | 9     | FM-1a, FM-1b, FM-1d, FM-2, FM-4, FM-5, FM-7, FM-8, FM-9 |
| 61-90     | 2     | FM-3, FM-6                                              |
| 91+       | 0     | --                                                      |

**Highest residual risk:** FM-3 (NTP desynchronization) at RPN 84. Mitigation relies on the guard's periodic drift monitoring with configurable thresholds (warning/error/fail-fast escalation). Organizations MUST deploy `@hex-di/guard` with `gxp: true` to ensure continuous NTP validation.

**Second highest residual risk:** FM-6 (process crash and restart) at RPN 75. Mitigation relies on the `(processInstanceId, sequenceNumber)` composite key for global uniqueness across process lifetimes. Organizations MUST ensure process restart events are logged in the audit trail.

**Lowest residual risk:** FM-1c (monotonic regression) at RPN 16. Platform-level monotonicity violations are exceedingly rare and detected immediately at startup.

**FM-9 note:** The addition of ST-5 (high-res/wall-clock consistency check at startup) reduced FM-9's Detection score from 5 (moderate — detected only by guard periodic monitoring) to 2 (very high — detected at startup before any audit-relevant timestamp is generated). This reduced the RPN from 90 to 36, moving FM-9 from the 61-90 range into the 31-60 range. The startup check catches the most common FM-9 trigger (NTP not yet synchronized at process start) at adapter construction time, before any `highResNow()` value is used for audit purposes.

---

## Review and Acceptance

REQUIREMENT: This FMEA MUST be reviewed by the QA Reviewer role (see `06/personnel-and-access-control.md`) and accepted as part of the computerized system validation plan before GxP deployment.

REQUIREMENT: The FMEA MUST be re-evaluated whenever:

- New failure modes are identified (e.g., through incident reports or regulatory findings).
- Detection mechanisms are added or modified.
- Mitigations are added, removed, or changed.
- Platform or infrastructure changes affect occurrence likelihood.
