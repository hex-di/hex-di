# Recovery Procedures

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
**Detection and recovery:** Owned by `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### FM-4: Platform API Tampering

**Trigger:** `Date`, `Date.now`, `performance`, or `performance.now` modified after application startup.
**Impact:** All clock readings may be compromised. ALCOA+ Original and Accurate are at risk. ST-4 startup check and `Object.freeze()` are the primary prevention.
**Detection and recovery:** Owned by `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### FM-5: Adapter Integrity Violation

**Trigger:** Registered `ClockPort` adapter no longer satisfies behavioral contracts (non-monotonic values, unfrozen adapter object).
**Impact:** Clock readings may be unreliable. Duration calculations and event ordering may be affected.
**Detection and recovery:** Owned by `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### FM-6: Process Crash and Restart

**Trigger:** Application process terminates unexpectedly and is restarted.
**Impact:** `SequenceGeneratorPort` counter resets to 1. The `processInstanceId` composite key maintains global uniqueness across process lifetimes.
**Detection and recovery:** Owned by `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### Recovery Procedure Summary Matrix

| Failure Mode                      | Severity  | Detection                      | Owner           | Summary                               |
| --------------------------------- | --------- | ------------------------------ | --------------- | ------------------------------------- |
| FM-1: ClockStartupError           | Critical  | Immediate (startup)            | `@hex-di/clock` | Full procedure above                  |
| FM-2: SequenceOverflowError       | Critical  | Immediate (runtime)            | `@hex-di/clock` | Full procedure above                  |
| FM-3: NTP Desynchronization       | High      | Periodic (guard)               | `@hex-di/guard` | Summary above; detailed in guard spec |
| FM-4: Platform API Tampering      | Very High | Prevented (freeze) or periodic | `@hex-di/guard` | Summary above; detailed in guard spec |
| FM-5: Adapter Integrity Violation | High      | Periodic (guard)               | `@hex-di/guard` | Summary above; detailed in guard spec |
| FM-6: Process Crash/Restart       | Moderate  | Immediate (startup)            | `@hex-di/guard` | Summary above; detailed in guard spec |

REQUIREMENT: GxP organizations MUST include FM-1 through FM-6 recovery procedures in their standard operating procedures. FM-1 and FM-2 procedures are defined above; FM-3 through FM-6 procedures are defined in the guard specification. Each SOP MUST identify the responsible role (operator, infrastructure team, QA), the escalation path, and the documentation requirements.
