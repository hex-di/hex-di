# 6.7 Recovery Procedures — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§6.6 Audit Trail Integration](./06-audit-trail-integration.md) | **Next:** [§6.8 Requirements Traceability Matrix](./08-requirements-traceability-matrix.md)

## Recovery Procedures for `@hex-di/clock` Failure Modes

This section defines the required recovery procedures for each failure mode in `@hex-di/clock`. GxP deployments MUST include these procedures in their computerized system validation plan and standard operating procedures (SOPs).

**Regulatory basis:** 21 CFR 11.10(e) requires procedures for generating accurate and complete copies of records for FDA inspection. EU GMP Annex 11 Section 16 requires that business continuity arrangements be documented for the availability of computerized systems supporting critical processes. GAMP 5 Appendix M4 requires documented procedures for handling system failures and recovery.

### FM-1: ClockStartupError (Startup Self-Test Failure)

**Trigger:** `createSystemClock()` returns `err(ClockStartupError)` during adapter construction.

| Check                                | Root Cause                                                                                                                                   | Impact                                                   | Recovery Procedure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ST-1: Negative monotonic             | Broken `performance.now()` implementation                                                                                                    | No adapter created; application cannot start             | 1. Verify platform runtime version is on the supported platform matrix (section 4.2). 2. Restart the runtime process. 3. If persists, escalate to infrastructure team to investigate `performance` API integrity. 4. Switch to a supported platform if unresolvable.                                                                                                                                                                                                                                                                  |
| ST-2: Implausible wall-clock         | System clock unset or severely misconfigured (before 2020-01-01)                                                                             | No adapter created; application cannot start             | 1. Verify system clock is set correctly: `date` (Linux/macOS). 2. Verify NTP daemon is running and synchronized: `chronyc tracking` or `ntpq -p`. 3. If NTP is unreachable, manually set the system clock and restart. 4. Document the root cause and corrective action in the deviation log.                                                                                                                                                                                                                                         |
| ST-3: Monotonic regression           | `performance.now()` returned a lower value on a subsequent call                                                                              | No adapter created; application cannot start             | 1. This indicates a platform-level defect. Restart the process. 2. If persists, collect platform diagnostics (OS version, runtime version, hardware info). 3. File a bug against the runtime (Node.js, Deno, Bun). 4. Switch to an alternate supported runtime or hardware.                                                                                                                                                                                                                                                           |
| ST-4: Platform API not frozen (GxP)  | `Date` or `performance` objects not frozen at application entry point                                                                        | No adapter created; application cannot start in GxP mode | 1. Add `Object.freeze(Date)` and `Object.freeze(performance)` to the application entry point BEFORE any `@hex-di/clock` import. 2. Verify the entry point freeze runs before any other module initialization. 3. Re-deploy and re-run IQ-13 to confirm.                                                                                                                                                                                                                                                                               |
| ST-5: High-res/wall-clock divergence | `highResNow()` and `wallClockNow()` diverge by more than 1000ms, indicating `performance.timeOrigin` was captured before NTP synchronization | No adapter created; application cannot start             | 1. Verify NTP daemon is running and synchronized: `chronyc tracking` or `ntpq -p`. 2. Verify system startup sequencing: NTP synchronization MUST complete before application process launch (e.g., systemd dependency ordering via `After=time-sync.target`). 3. If NTP was not synchronized at process start, restart the application after NTP achieves initial sync. 4. Verify DQ-2 (NTP synchronization before application start) is correctly configured. 5. Document the root cause and corrective action in the deviation log. |

REQUIREMENT: All ST-\* failures MUST be logged to the system error log (stderr or equivalent) with the full `ClockStartupError` object, including the `check` identifier, `observedValue`, and `message` fields.

REQUIREMENT: GxP deployments MUST have a documented SOP for each ST-\* failure mode. The SOP MUST include the investigation steps, escalation path, and approval required before restarting the application.

### FM-2: SequenceOverflowError (Sequence Exhaustion)

**Trigger:** `SequenceGeneratorPort.next()` returns `err(SequenceOverflowError)` when counter reaches `Number.MAX_SAFE_INTEGER`.

**Impact:** No further sequence numbers can be generated. Audit trail events produced after overflow have no sequence-based ordering. ALCOA+ Complete is at risk.

**Practical likelihood:** Unreachable under normal operation (~285,000 years at 1 million calls/second). If observed, it indicates either a runaway loop producing unbounded `next()` calls or an extremely long-running process without restart.

**Recovery procedure:**

1. **Immediate:** Use `TemporalContextFactory.createOverflowContext()` to record the overflow event with a degraded temporal context (sentinel sequence number `-1`, last valid sequence number, and timestamps). See "Emergency Overflow Context" in section 6.6.
2. **Halt audit operations:** Transition the application to a fail-safe state. Do NOT continue producing unsequenced audit events — this would create unorderable records violating ALCOA+ Complete.
3. **Log the event:** Record the overflow in the audit trail with the `OverflowTemporalContext`, the operation that triggered the overflow, the user identity, and the process instance ID.
4. **Restart the application:** A new `SystemSequenceGenerator` created after restart begins at `1` with a new `processInstanceId`, providing a fresh sequence space. The composite key `(processInstanceId, sequenceNumber)` maintains global uniqueness across process lifetimes.
5. **Root cause analysis:** Investigate why the sequence was exhausted. Check for runaway loops, unbounded event generation, or missing process restart policies. Document findings in the deviation log.
6. **Preventive action:** Implement the capacity monitoring pattern described in section 3.1 ("Monitoring guidance") to detect approaching overflow before it occurs.

REQUIREMENT: GxP deployments MUST implement automated capacity monitoring that alerts when `seq.current()` exceeds a configurable threshold (recommended: `Number.MAX_SAFE_INTEGER * 0.9`). This provides advance warning before overflow occurs.

### FM-3: NTP Desynchronization

**Trigger:** Wall-clock drift exceeds configured NTP threshold.
**Impact:** Wall-clock timestamps may not reflect actual calendar time. ALCOA+ Contemporaneous and Accurate are at risk. Monotonic timestamps and sequence numbers are NOT affected.
**Detection and recovery:** Owned by the ecosystem's GxP monitoring infrastructure. The monitoring adapter's specification MUST document NTP drift detection thresholds, degraded/fail-fast mode transitions, and resynchronization verification.

**Immediate operator actions (summary):**

1. Check NTP daemon status: `chronyc tracking` or `ntpq -p`.
2. If NTP server unreachable, escalate to infrastructure team for network/NTP restoration.
3. If drift exceeds threshold, the monitoring adapter transitions to degraded or fail-fast mode (per its NTP startup mode configuration).
4. Quarantine audit records generated during the desynchronization window for manual review. Records with monotonic timestamps and sequence numbers remain internally ordered; only wall-clock accuracy is affected.
5. After NTP resynchronization, verify drift is within acceptable threshold before resuming normal operation.
6. Document the incident, affected time window, and corrective action in the deviation log.

### FM-4: Platform API Tampering

**Trigger:** `Date`, `Date.now`, `performance`, or `performance.now` modified after application startup.
**Impact:** All clock readings may be compromised. ALCOA+ Original and Accurate are at risk. ST-4 startup check and `Object.freeze()` are the primary prevention.
**Detection and recovery:** Owned by the ecosystem's GxP monitoring infrastructure. The monitoring adapter's specification MUST document post-construction API modification detection, integrity check intervals, and tamper response escalation.

**Immediate operator actions (summary):**

1. The monitoring adapter's periodic integrity check detects post-construction API modification.
2. On detection, halt audit operations immediately — all timestamps from the tampered source are untrustworthy.
3. Investigate root cause: determine whether the modification was accidental (third-party library polyfilling `Date.now`) or malicious.
4. Restart the application process with `Object.freeze(Date)` and `Object.freeze(performance)` at the entry point (DQ-3).
5. Re-execute IQ-11 (anti-tampering verification) and IQ-13 (platform API freeze) after remediation.
6. If malicious tampering is suspected, follow the organization's security incident response SOP.
7. Document the incident, root cause, and corrective action in the deviation log.

### FM-5: Adapter Integrity Violation

**Trigger:** Registered `ClockPort` adapter no longer satisfies behavioral contracts (non-monotonic values, unfrozen adapter object).
**Impact:** Clock readings may be unreliable. Duration calculations and event ordering may be affected.
**Detection and recovery:** Owned by the ecosystem's GxP monitoring infrastructure. The monitoring adapter's specification MUST document adapter behavioral contract verification, heartbeat monitoring, and fail-safe transitions.

**Immediate operator actions (summary):**

1. The monitoring adapter's periodic heartbeat detects adapter behavioral violations (name mismatch, unfrozen adapter, non-monotonic values).
2. On detection, the monitoring adapter transitions to fail-safe mode per its configured escalation policy.
3. Investigate whether the adapter was replaced via unauthorized container graph mutation or whether the adapter itself became corrupted.
4. Review `ClockSourceChangedEvent` audit log to verify all adapter changes were authorized.
5. Restart the application to reinitialize the adapter from the validated factory.
6. Re-execute IQ-4 (factory immutability) and IQ-14 (startup self-test) after remediation.
7. Document the incident, root cause, and corrective action in the deviation log.

### FM-6: Process Crash and Restart

**Trigger:** Application process terminates unexpectedly and is restarted.
**Impact:** `SequenceGeneratorPort` counter resets to 1. The `processInstanceId` composite key maintains global uniqueness across process lifetimes.
**Detection and recovery:** Owned by the ecosystem's GxP monitoring infrastructure. The monitoring adapter's specification MUST document process restart detection, `processInstanceId` generation tracking, and pre-crash audit trail verification.

**Immediate operator actions (summary):**

1. A new `processInstanceId` is generated on restart, disambiguating the new sequence space.
2. The monitoring adapter logs the process restart event with the new `processInstanceId` and wall-clock timestamp.
3. Verify that the pre-crash audit trail is intact (no data loss in the persistence layer).
4. If the crash occurred during an in-flight audit write, verify the last persisted record's integrity using `verifyTemporalContextDigest()`.
5. Investigate crash root cause (OOM, unhandled exception, hardware failure).
6. Document the incident, data integrity assessment, and corrective action in the deviation log.

### FM-7: Precision Fabrication

**Trigger:** Code modification that synthesizes sub-millisecond values from a millisecond-resolution source (e.g., appending random fractional digits to `Date.now()` output).

**Impact:** Audit records contain false precision. ALCOA+ Accurate is violated — timestamps appear more precise than the underlying source supports.

**Detection:** IQ/OQ precision verification (OQ-4) detects fabricated precision by comparing reported resolution against actual platform capabilities. Code review gates catch fabrication patterns before deployment.

**Recovery procedure:**

1. **Identify the fabrication point:** Review the adapter implementation for any arithmetic that adds fractional digits not present in the platform API output.
2. **Remove the fabrication:** The adapter MUST return the platform API value without precision enhancement.
3. **Assess affected records:** If fabricated-precision records were persisted, annotate them in the audit trail with a data integrity note indicating the precision is unreliable. The integer-millisecond portion remains accurate.
4. **Re-execute OQ-4:** Confirm the corrected adapter reports honest precision.
5. **Document:** Record the incident, root cause, affected records, and corrective action in the deviation log.

### FM-8: Capture Ordering Violation

**Trigger:** `TemporalContextFactory.create()` implementation calls clock functions before `seq.next()`, violating the happens-before ordering contract.

**Impact:** The sequence number in a `TemporalContext` may not reflect the correct ordering relative to the timestamps captured in the same context. ALCOA+ Consistent is at risk.

**Detection:** DoD 8: #7–#8 tests verify ordering via recording mock. Code review verifies `seq.next()` is called before any clock function in `create()`.

**Recovery procedure:**

1. **Fix the ordering:** Ensure `create()` calls `seq.next()` first, then captures timestamps.
2. **Assess affected records:** Records produced with incorrect ordering have valid timestamps and valid sequence numbers individually, but the happens-before relationship between them may be inconsistent. Flag affected records for manual review.
3. **Re-execute DoD 8 tests:** Confirm ordering is correct.
4. **Document:** Record the incident and corrective action in the deviation log.

### FM-9: `performance.timeOrigin` Drift

**Trigger:** NTP step correction after process start shifts `performance.timeOrigin + performance.now()` relative to `Date.now()`, causing `highResNow()` and `wallClockNow()` to diverge.

**Impact:** Cross-function timestamp inconsistency. Records using `highResNow()` for precision and `wallClockNow()` for absolute time may show contradictory values.

**Detection:** ST-5 startup consistency check catches initial divergence >1000ms. Ecosystem periodic consistency monitoring detects post-startup drift.

**Recovery procedure:**

1. **Verify NTP pre-synchronization:** Confirm DQ-2 is correctly configured — NTP MUST complete initial synchronization before the application process starts.
2. **If divergence detected at startup (ST-5):** The application does not start. Wait for NTP synchronization to complete, then restart.
3. **If divergence detected post-startup:** Quarantine audit records generated after the detected divergence point. Monotonic timestamps and sequence numbers remain trustworthy for ordering; wall-clock and high-res timestamps should be cross-validated.
4. **Restart the application** after confirming NTP is synchronized to reset `performance.timeOrigin`.
5. **Document:** Record the incident, the affected time window, and corrective action in the deviation log.

### FM-10: Cached Clock Used for Audit Timestamps

**Trigger:** Developer passes `CachedClockPort` where `ClockPort` is expected (e.g., to `createTemporalContextFactory()`).

**Impact:** Audit trail timestamps are stale by up to `updateIntervalMs`. ALCOA+ Contemporaneous is violated.

**Detection:** Compile-time. `CachedClockPort` is structurally incompatible with `ClockPort` (different method names: `recentMonotonicNow` vs. `monotonicNow`). TypeScript prevents substitution.

**Recovery procedure:**

1. **This failure mode cannot reach production** if TypeScript compilation is enforced. The compiler rejects the type mismatch.
2. **If bypassed (e.g., via `any` cast or JavaScript usage):** Identify all audit records produced with cached timestamps. Annotate them with a data integrity note indicating timestamps may be stale by up to the configured `updateIntervalMs`.
3. **Fix the code:** Replace `CachedClockPort` with `ClockPort` at the call site.
4. **Enforce compilation:** Ensure CI/CD pipelines run TypeScript type checking (`pnpm typecheck`) before deployment.
5. **Document:** Record the incident and corrective action in the deviation log.

**Runtime defense-in-depth (RECOMMENDED):** As an additional safeguard for GxP deployments, consumers MAY add a runtime diagnostic assertion that verifies the adapter name reported by `ClockDiagnosticsPort.getDiagnostics().adapterName` does not indicate a cached adapter (e.g., does not contain `'Cached'`). This provides a runtime detection layer in case the compile-time type safety is somehow bypassed.

### FM-11: Timer Callback Ordering Violation in Virtual Scheduler

**Trigger:** Implementation bug in `VirtualTimerScheduler` fires virtual timers out of chronological order.

**Impact:** Test assertions pass with wrong ordering. Production behavior (which uses real timers) differs from test expectations, potentially masking timing bugs in the system under test.

**Detection:** DoD 20 tests verify ordering with multiple concurrent timers at same and different scheduled times. CLK-TMR-011 requires chronological FIFO ordering.

**Recovery procedure:**

1. **Fix the virtual scheduler:** Ensure timers fire in chronological order (FIFO for ties at the same scheduled time).
2. **Assess test validity:** Re-run all tests that use `VirtualTimerScheduler` to determine if any tests were passing incorrectly due to the ordering bug.
3. **Re-execute DoD 20:** Confirm ordering is correct.
4. **Document:** Record the bug, affected tests, and corrective action in the deviation log.

### FM-12: Auto-Advance Interference with Explicit Advance

**Trigger:** Developer enables `autoAdvance` on `VirtualClockAdapter` and also calls `advance()` manually, causing unexpected double time progression.

**Impact:** Time advances more than expected in tests. Timers fire at unexpected points. Test assertions become fragile or produce false positives.

**Detection:** Test review during IQ/OQ execution. `getAutoAdvance()` allows runtime inspection of current setting.

**Recovery procedure:**

1. **Choose one approach:** Tests SHOULD use either `autoAdvance` or explicit `advance()`, not both simultaneously.
2. **Inspect current state:** Use `getAutoAdvance()` to verify the setting before manual `advance()` calls.
3. **Fix affected tests:** Refactor tests to use a consistent time advancement strategy.
4. **Document:** If the interference caused incorrect test results that were used as IQ/OQ/PQ evidence, document the affected test runs and re-execute them.

### Recovery Procedure Summary Matrix

| Failure Mode                              | Severity  | Detection                      | Owner                | Summary                                            |
| ----------------------------------------- | --------- | ------------------------------ | -------------------- | -------------------------------------------------- |
| FM-1: ClockStartupError                   | Critical  | Immediate (startup)            | `@hex-di/clock`      | Full procedure above                               |
| FM-2: SequenceOverflowError               | Critical  | Immediate (runtime)            | `@hex-di/clock`      | Full procedure above                               |
| FM-3: NTP Desynchronization               | High      | Periodic (monitoring)          | Ecosystem monitoring | Summary above; detailed in monitoring adapter spec |
| FM-4: Platform API Tampering              | Very High | Prevented (freeze) or periodic | Ecosystem monitoring | Summary above; detailed in monitoring adapter spec |
| FM-5: Adapter Integrity Violation         | High      | Periodic (monitoring)          | Ecosystem monitoring | Summary above; detailed in monitoring adapter spec |
| FM-6: Process Crash/Restart               | Moderate  | Immediate (startup)            | Ecosystem monitoring | Summary above; detailed in monitoring adapter spec |
| FM-7: Precision Fabrication               | High      | IQ/OQ (OQ-4) + code review    | `@hex-di/clock`      | Full procedure above                               |
| FM-8: Capture Ordering Violation          | Moderate  | DoD tests + code review        | `@hex-di/clock`      | Full procedure above                               |
| FM-9: `performance.timeOrigin` Drift      | High      | Immediate (startup, ST-5)      | `@hex-di/clock`      | Full procedure above                               |
| FM-10: Cached Clock for Audit Timestamps  | Very High | Compile-time (type system)     | `@hex-di/clock`      | Full procedure above                               |
| FM-11: Timer Callback Ordering Violation  | Moderate  | DoD tests (DoD 20)             | `@hex-di/clock`      | Full procedure above                               |
| FM-12: Auto-Advance Interference          | Low       | Test review                    | `@hex-di/clock`      | Full procedure above                               |

### Compensating Controls Without Ecosystem Monitoring (CLK-GXP-008)

REQUIREMENT (CLK-GXP-008): When the ecosystem GxP monitoring adapter is not co-deployed with `@hex-di/clock`, the consuming application MUST implement compensating controls for FM-3 through FM-6 detection, documented in their computerized system validation plan with risk acceptance approved by the QA Reviewer. The compensating controls MUST, at a minimum:

1. **For FM-3 (NTP Desynchronization):** Implement periodic wall-clock drift detection using the `ClockDiagnosticsPort`-based fallback defined in CLK-GXP-007 (§ 6.1). The drift detection interval MUST NOT exceed 60 seconds (per the detection latency table below). If drift exceeds the organization's defined threshold, the application MUST transition to degraded mode (log warnings, flag affected records) or fail-fast mode (halt audit operations), as defined in the organization's SOP.

2. **For FM-4 (Platform API Tampering):** Implement periodic verification that `Object.isFrozen(Date) === true` and `Object.isFrozen(performance) === true` at the configured integrity check interval (RECOMMENDED: ≤ 30 seconds). If either check fails, halt audit operations immediately and alert the Infrastructure Operator.

3. **For FM-5 (Adapter Integrity Violation):** Implement periodic invocation of `ClockDiagnosticsPort.getDiagnostics()` to verify that `adapterName`, `monotonicSource`, and `highResSource` remain consistent with the baseline captured during IQ execution. The check interval MUST NOT exceed 60 seconds. Any deviation MUST trigger an alert and fail-safe transition.

4. **For FM-6 (Process Crash/Restart):** Implement process-level restart detection (e.g., via process supervisor, `processInstanceId` comparison) and log the restart event with the new `processInstanceId` and wall-clock timestamp. The application MUST verify pre-crash audit trail integrity upon restart using `verifyTemporalContextDigest()` on the last persisted record.

**Regulatory basis:** EU GMP Annex 11 Section 11 (periodic evaluation), 21 CFR 11.10(h) (device checks). Without these compensating controls, the Detection (D) scores for FM-3 through FM-6 in the FMEA degrade significantly (FM-3 D increases from 4 to 8-9, pushing RPN from 84 to 168-189, above the RPN 100 action threshold), creating an unacceptable residual risk per the FMEA methodology.

**Relationship to CLK-GXP-006/007:** CLK-GXP-006 and CLK-GXP-007 (§ 6.1) define the minimum viable periodic evaluation fallback using `ClockDiagnosticsPort`. CLK-GXP-008 extends that fallback with FM-specific compensating controls that maintain the FMEA Detection scores at their assessed levels even when the full ecosystem monitoring adapter is absent. Organizations satisfying CLK-GXP-008 MUST also satisfy CLK-GXP-006 and CLK-GXP-007.

#### Reference Compensating Control Implementation Guidance

To reduce implementation variation across consumer deployments, the following pseudocode illustrates a minimal compensating control implementation satisfying CLK-GXP-008. This is non-normative guidance — organizations MUST adapt it to their specific architecture and validate it in their OQ protocol.

```typescript
// Reference pattern: CLK-GXP-008 compensating control loop
// This is pseudocode for guidance only — not a library export.

function startCompensatingControls(
  clock: ClockPort,
  diagnostics: ClockDiagnosticsPort,
  baseline: { adapterName: string; monotonicSource: string; highResSource: string },
  config: { driftCheckIntervalMs: number; integrityCheckIntervalMs: number; driftThresholdMs: number }
): void {
  // FM-3: Periodic NTP drift detection
  setInterval(() => {
    const wallClock = clock.wallClockNow();
    const externalRef = getExternalTimeReference(); // HTTP time API, DB timestamp, etc.
    const drift = Math.abs(wallClock - externalRef);
    if (drift > config.driftThresholdMs) {
      logCriticalEvent('FM-3: NTP drift exceeded threshold', { drift, threshold: config.driftThresholdMs });
      // Transition to degraded or fail-fast mode per organizational SOP
    }
  }, config.driftCheckIntervalMs);

  // FM-4 + FM-5: Periodic platform API and adapter integrity check
  setInterval(() => {
    // FM-4: Verify platform API freeze (GxP mode)
    if (!Object.isFrozen(Date) || !Object.isFrozen(performance)) {
      logCriticalEvent('FM-4: Platform API not frozen — possible tampering');
      // Halt audit operations immediately
    }
    // FM-5: Verify adapter identity consistency
    const current = diagnostics.getDiagnostics();
    if (current.adapterName !== baseline.adapterName ||
        current.monotonicSource !== baseline.monotonicSource ||
        current.highResSource !== baseline.highResSource) {
      logCriticalEvent('FM-5: Adapter integrity violation', { baseline, current });
      // Trigger alert and fail-safe transition
    }
  }, config.integrityCheckIntervalMs);

  // FM-6: Process restart detection is handled by process supervisor (systemd, pm2, etc.)
  // On startup: compare current processInstanceId against last persisted processInstanceId
  // If different: log restart event, verify last record integrity via verifyTemporalContextDigest()
}
```

**Validation requirement:** Organizations implementing compensating controls based on this reference pattern MUST include the compensating control implementation in their OQ scope and verify that: (a) drift detection fires within the configured interval, (b) platform freeze violations are detected and halt audit operations, (c) adapter identity changes are detected and trigger alerts, and (d) process restart detection occurs within 10 seconds.

### Ecosystem Monitoring Cross-Reference (FM-3 through FM-6)

FM-3 through FM-6 recovery procedures are owned by the ecosystem's GxP monitoring infrastructure. The immediate operator action summaries above are **self-contained for organizations deploying CLK-GXP-008 compensating controls** — they provide all information necessary for initial incident response, investigation, and recovery when the ecosystem monitoring adapter is not co-deployed. Organizations using CLK-GXP-008 compensating controls (see section above) do not require the monitoring adapter specification to execute FM-3 through FM-6 recovery procedures; the compensating controls and the immediate operator action summaries together constitute a complete recovery path.

For organizations that co-deploy the ecosystem GxP monitoring adapter, the monitoring adapter's specification provides **enhanced** (not replacement) recovery procedures — including detailed escalation paths, monitoring configuration parameters, threshold adjustments, and post-incident verification checklists — that complement and extend the summaries above.

### Required Monitoring Adapter Capabilities (FM-3 through FM-6)

Any HexDI ecosystem library that provides GxP monitoring for clock infrastructure MUST document the following capabilities in its specification:

| Failure Mode | Clock Spec Section | Required Monitoring Capability | FMEA RPN |
|---|---|---|---|
| FM-3: NTP Desynchronization | Above (this document) | NTP drift thresholds, degraded/fail-fast mode transitions, resynchronization verification | 84 |
| FM-4: Platform API Tampering | Above (this document) | Post-construction API modification detection, integrity check intervals, tamper response escalation | 36 |
| FM-5: Adapter Integrity Violation | Above (this document) | Adapter behavioral contract verification, heartbeat monitoring, fail-safe transitions | 56 |
| FM-6: Process Crash/Restart | Above (this document) | Process restart detection, `processInstanceId` tracking, pre-crash audit trail verification | 75 |

REQUIREMENT: Auditors reviewing the `@hex-di/clock` specification for FMEA completeness MUST also review the ecosystem monitoring adapter's specification for FM-3 through FM-6 coverage. The clock spec immediate operator action summaries are not a substitute for the full monitoring adapter recovery procedures. A complete FMEA audit requires coverage of both specifications.

#### Detection Time Requirements (FM-3 through FM-6)

REQUIREMENT: GxP organizations MUST configure their ecosystem monitoring adapter's check interval so that FM-3 through FM-6 failure modes are detected within the time required to meet the L1 incident response timeframe defined in the quick reference card (15-minute initial response). As a guideline:

| Failure Mode | Maximum Detection Latency | Rationale |
| --- | --- | --- |
| FM-3: NTP Desynchronization | ≤ 60 seconds | NTP drift is time-dependent; shorter detection intervals reduce the window of potentially inaccurate wall-clock timestamps |
| FM-4: Platform API Tampering | ≤ 30 seconds | Tampering may be deliberate; rapid detection minimizes the number of audit records generated with compromised API references |
| FM-5: Adapter Integrity Violation | ≤ 60 seconds | Adapter behavioral contract violations may produce subtly incorrect timestamps; timely detection limits exposure |
| FM-6: Process Crash/Restart | ≤ 10 seconds (process restart detection) | Process restart detection should be near-immediate via process supervisor; the `processInstanceId` change signals the event |

GxP deployments MUST configure detection intervals that do not exceed the maximum detection latencies listed above, unless a documented risk assessment approved by the QA Manager justifies longer intervals with compensating controls. Organizations MUST document their chosen detection intervals and justify them against their incident response SOP timeframes.

#### Recovery Time Objectives (RTO)

REQUIREMENT: GxP organizations MUST define and document recovery time objectives for each failure mode class. The following RTOs are the recommended maximum acceptable timeframes:

| Phase | Maximum Duration | Applies To |
| --- | --- | --- |
| Detection | Per detection latency table above | FM-3 through FM-6 (ecosystem monitoring) |
| Initial response | ≤ 15 minutes from detection | All failure modes (aligns with L1 incident response in quick-reference.md) |
| Recovery action initiation | ≤ 30 minutes from detection | FM-1, FM-2, FM-7 through FM-12 (clock-spec-owned) |
| Full recovery | ≤ 2 hours from detection | All failure modes |
| Controlled shutdown (if recovery fails) | ≤ 30 minutes from recovery action initiation | All failure modes |

If full recovery cannot be achieved within the defined RTO, the system MUST be placed in a controlled shutdown state and the failure MUST be escalated to L3 (QA Reviewer) per the quick-reference escalation path. Controlled shutdown means: (a) no new GxP-critical records are generated, (b) existing records are preserved, and (c) the shutdown event is logged in the deviation log.

REQUIREMENT: GxP organizations MUST include FM-1 through FM-12 recovery procedures in their standard operating procedures. FM-1, FM-2, and FM-7 through FM-12 procedures are defined above; FM-3 through FM-6 procedures are defined in the ecosystem monitoring adapter's specification. Each SOP MUST identify the responsible role (operator, infrastructure team, QA), the escalation path, and the documentation requirements.

### Incident Classification Matrix

Incidents related to `@hex-di/clock` are classified into four severity levels (L1–L4), corresponding to the escalation path defined in the Quick Reference Card (§ 6.12). The following matrix defines the criteria for each level and maps failure modes to their default classification.

| Level | Severity | Classification Criteria | Default Failure Modes | Response Timeframe | Escalation Trigger |
|---|---|---|---|---|---|
| **L1** | Low | Operational anomaly detected; no confirmed impact on data integrity or validated state. Information-only alerts. | FM-12 (auto-advance interference), non-monotonic wall-clock detection (CLK-AUD-013) | 15 minutes initial assessment | Cannot resolve within 30 minutes |
| **L2** | Moderate | Potential impact on validated state or audit trail accuracy. Requires investigation and possible deviation log entry. | FM-6 (process crash/restart), FM-8 (capture ordering violation), FM-11 (timer ordering violation), FM-9 (timeOrigin drift, post-startup) | 1 hour from escalation | Validated state confirmed compromised |
| **L3** | High | Confirmed impact on data integrity, validated state compromised, or emergency change required. Requires QA involvement. | FM-3 (NTP desynchronization), FM-4 (platform API tampering), FM-5 (adapter integrity violation), FM-7 (precision fabrication) | 2 hours from escalation | QA Manager authorization required |
| **L4** | Critical | Immediate risk to patient safety, confirmed data integrity breach, or system-wide failure requiring QA Manager authorization. | FM-1 (startup failure in production), FM-2 (sequence overflow in production), FM-10 (cached clock for audit — if bypassed compile-time safety) | 4 hours from escalation | Exceeds L3 authority |

REQUIREMENT (CLK-REC-001): GxP organizations MUST customize this incident classification matrix with organization-specific criteria and integrate it into their incident management SOP. The default failure mode assignments above are recommendations; organizations MAY reclassify based on their risk assessment, provided the reclassification is documented with rationale.

REQUIREMENT (CLK-REC-002): When an incident involves multiple concurrent failure modes (compound failure), the incident MUST be classified at the highest severity level of any contributing failure mode.

### Incident Response Procedures by Level

**L1 (Low) — Operational anomaly, no confirmed impact:**

1. Infrastructure Operator receives alert or detects anomaly.
2. Operator assesses whether the anomaly affects data integrity (check: are `TemporalContext` records being produced normally? Is sequence monotonicity maintained?).
3. If no data integrity impact confirmed: log the anomaly in the deviation log with timestamp, description, and assessment outcome. No escalation required.
4. If assessment cannot confirm "no impact" within 30 minutes: escalate to L2.
5. Resolution: document root cause (if identified), close deviation log entry.

**L2 (Moderate) — Potential validated state impact:**

1. Infrastructure Operator notifies GxP Validation Engineer within 15 minutes of L2 classification.
2. GxP Validation Engineer investigates: review recent `TemporalContext` records, verify sequence continuity, check `verifyTemporalContextDigest()` on recent records.
3. If validated state is NOT compromised: document investigation findings, downgrade to L1, close.
4. If validated state IS compromised: escalate to L3.
5. If investigation cannot determine validated state status within 1 hour: escalate to L3 as a precaution.
6. Deviation log entry MUST include: investigation timeline, records reviewed, integrity check results, escalation decision rationale.

**L3 (High) — Confirmed validated state compromise or emergency change required:**

1. GxP Validation Engineer notifies QA Reviewer within 30 minutes of L3 classification.
2. QA Reviewer assesses scope: which records are potentially affected? What is the blast radius (single process, single deployment target, all targets)?
3. QA Reviewer determines response path:
   - **Immediate mitigation available** (e.g., NTP resynchronization for FM-3, process restart for FM-6): execute mitigation, document, and schedule re-qualification.
   - **Emergency change required** (e.g., library version upgrade for a data integrity defect): initiate emergency change control (§ 6.3, CLK-CHG-005).
   - **No immediate mitigation** (e.g., platform API corruption detected by FM-4): isolate affected system, switch to manual timestamp recording if operationally feasible, escalate to L4 if QA Reviewer cannot authorize the required action.
4. All affected records MUST be annotated in the audit trail per CLK-CHG-012 step 4.
5. Post-resolution: initiate CAPA per CLK-CHG-014 within 14 days.

**L4 (Critical) — Immediate risk to patient safety or system-wide failure:**

1. GxP Validation Engineer or QA Reviewer notifies QA Manager immediately (within 15 minutes of L4 classification).
2. QA Manager authorizes emergency response actions:
   - **System halt**: if continued operation poses patient safety risk, QA Manager MAY authorize halting the affected production system until the clock infrastructure is restored.
   - **Emergency change deployment**: per CLK-CHG-005/006 (QA Manager single-signature approval within 4 hours).
   - **Temporary manual operations**: authorize manual timestamp recording with paper-based backup until automated clock infrastructure is restored.
3. QA Manager designates an incident commander responsible for coordinating the response across Infrastructure Operators, GxP Validation Engineers, and Application Developers.
4. Communication: QA Manager notifies relevant stakeholders (production management, regulatory affairs) within 4 hours of L4 declaration.
5. Resolution timeline: L4 incidents MUST have an active mitigation in place within 4 hours. Full resolution (system restored to validated state) MUST be achieved within 24 hours or a documented justification for extended resolution MUST be filed.
6. Post-resolution: mandatory post-incident review within 14 days (CLK-CHG-014), CAPA required, and FMEA review required (CLK-CHG-020).

REQUIREMENT (CLK-REC-006): GxP organizations MUST adapt these incident response procedures to their organizational structure and integrate them into their incident management SOP. At minimum, the adapted procedures MUST define: the notification mechanism for each escalation level, the contact information for each role, the on-call rotation (if applicable), and the documentation requirements for each level.

### Recovery Verification Test Specifications

To validate that recovery procedures are effective, GxP organizations MUST include recovery verification tests in their OQ or PQ protocol. The following test specifications simulate each failure mode and verify the corresponding recovery procedure.

| Test ID | Failure Mode | Test Procedure | Expected Outcome | DoD Reference |
|---|---|---|---|---|
| RV-1 | FM-1: ClockStartupError | Mock platform API to trigger each ST-* check failure (ST-1 through ST-5). Verify `createSystemClock()` returns `err(ClockStartupError)` with correct check identifier. Execute recovery procedure. Verify subsequent `createSystemClock()` succeeds after remediation. | Startup error correctly detected; recovery restores normal operation. | OQ-8 (ST-2), OQ-6 (ST-4) |
| RV-2 | FM-2: SequenceOverflowError | Create `VirtualSequenceGenerator` at `MAX_SAFE_INTEGER - 1`. Call `next()` to reach overflow. Verify `create()` returns `err(SequenceOverflowError)`. Call `createOverflowContext()`. Verify `OverflowTemporalContext` structure. Simulate process restart with new generator. Verify `next()` returns `1`. | Overflow detected, emergency context created, restart recovers fresh sequence space. | OQ-7, DoD 8 |
| RV-3 | FM-7: Precision Fabrication | Create adapter with fabricated sub-millisecond values (mock). Run OQ-4 precision test against fabricated adapter. Verify OQ-4 detects inconsistency between reported and actual precision. | Fabricated precision detected by qualification protocol. | OQ-4 |
| RV-4 | FM-8: Capture Ordering | Create mock clock and sequence generator with recording. Call `create()`. Verify call ordering via mock recording matches `seq.next()` → `clock.monotonicNow()` → `clock.wallClockNow()`. | Ordering contract verified. | DoD 8 #7–#8 |
| RV-5 | FM-9: timeOrigin Drift | Mock `performance.timeOrigin` and `Date.now()` to create >1000ms divergence. Call `createSystemClock()`. Verify ST-5 failure. Execute recovery (NTP sync, restart). Verify subsequent startup succeeds. | Divergence detected at startup; recovery restores consistency. | IQ-19 |
| RV-6 | FM-10: Cached Clock for Audit | Verify compile-time: attempt to pass `CachedClockPort` to `createTemporalContextFactory()`. Verify TypeScript compiler rejects the type mismatch. | Type system prevents cached clock substitution. | DoD 22 |
| RV-7 | FM-6: Process Crash/Restart | Record last `monotonicNow()`, `next()`, and `processInstanceId`. Construct new adapter and generator (simulating restart). Verify new adapter passes startup self-test, new generator starts at 1, new `processInstanceId` differs from pre-crash value. | Process restart recovery preserves data integrity with fresh state. | PQ-5 |

REQUIREMENT (CLK-REC-003): GxP organizations MUST execute recovery verification tests RV-1 through RV-7 as part of their initial deployment qualification. Tests MAY be integrated into the OQ test suite (`gxp-oq-clock.test.ts`) or maintained as a separate recovery verification suite.

REQUIREMENT (CLK-REC-004): Recovery verification tests MUST be re-executed after any change to the recovery procedures documented in this section.

### Disaster Recovery Test Scenarios

PQ-5 defines the basic adapter state recovery test. The following extended disaster recovery scenarios SHOULD be tested annually by GxP organizations to validate end-to-end recovery capability.

| Scenario | Description | Validation Criteria |
|---|---|---|
| **DR-1: Full process crash under load** | While running PQ-1 throughput test, forcefully terminate the process (`kill -9`). Restart. Verify adapter startup, sequence generator reset, and audit trail continuity. | New `processInstanceId` assigned. IQ-14 passes. Pre-crash audit trail intact in persistence layer. Last record verified via `verifyTemporalContextDigest()`. |
| **DR-2: NTP server failure** | Disconnect NTP server during operation (or simulate via firewall rule). Verify compensating controls (CLK-GXP-008) detect drift within detection latency threshold. Restore NTP. Verify wall-clock resynchronization. | Drift detected within 60 seconds. Alert generated. Records generated during NTP outage flagged. Post-recovery wall-clock within 100ms of NTP reference. |
| **DR-3: Storage failure during write** | Simulate storage failure (e.g., disk full, network partition to database) during audit trail persistence. Verify that `TemporalContext` creation succeeds independently of persistence failure. Restore storage. Verify audit trail gap is detectable via sequence number gap analysis. | Clock library continues operating. Persistence failure logged. Sequence number gap detectable after storage recovery. |
| **DR-4: Platform API corruption** | After adapter construction, simulate `Date.now` replacement (bypass freeze for test purposes). Verify CLK-GXP-008 FM-4 compensating control detects the corruption within 30 seconds. Verify adapter continues using captured reference (IQ-11 anti-tampering). | Tampering detected by compensating control. Adapter values remain valid (captured reference). Alert generated. |

**Consumer Responsibility Boundary:** The `@hex-di/clock` library provides recovery verification tests (startup self-tests ST-1 through ST-5, adapter immutability verification, sequence generator reset detection) but does **not** implement platform-level backup, restore, or failover. The consumer's Disaster Recovery Plan MUST cover: (a) container/process restart and orchestration (e.g., Kubernetes pod restart, systemd service restart), (b) persistent state recovery for audit trail records stored by the consumer application, (c) NTP service restoration and verification (DQ-2 prerequisite before application restart), and (d) verification that clock startup self-tests pass after recovery before GxP-regulated operations resume. DR-1 through DR-4 above test the `@hex-di/clock` library's behavior during and after recovery; the consumer's DR plan must encompass the broader infrastructure recovery that makes these library-level tests possible.

REQUIREMENT (CLK-REC-005): GxP organizations SHOULD execute disaster recovery scenarios DR-1 through DR-4 annually and retain the results as part of their ongoing validation evidence. Results MUST be reviewed by the QA Reviewer.

---


