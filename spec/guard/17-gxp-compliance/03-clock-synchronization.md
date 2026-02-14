# 17 - GxP Compliance: Clock Synchronization

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-03                              |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Audit Trail Contract](./02-audit-trail-contract.md) | Next: [Data Retention](./04-data-retention.md)_

---

## 62. Clock Synchronization Requirements

> **Authoritative ownership:**
>
> - **`@hex-di/clock` spec:** Clock port interfaces, platform adapters, startup self-tests (ST-1 through ST-5), sequence generator, per-record cryptographic integrity, clock-internal failure modes (FM-1, FM-2).
> - **This section:** All guard-clock integration -- NTP adapter, NTP startup modes, periodic integrity checks, ClockSource bridge, guard-detected failure modes (FM-3 through FM-6).
>
> Clock spec references:
>
> - Platform adapter startup self-tests: `spec/clock/04-platform-adapters.md`
> - Sequence generator ordering: `spec/clock/03-sequence-generator.md`
> - Leap second behavior: `spec/clock/02-clock-port.md`
> - Clock source change auditing: `spec/clock/07-integration.md`

### `@hex-di/clock` GxP Compliance Status

`@hex-di/clock` is **fully GxP compliant** as a clock infrastructure library. It provides:

- Injectable clock ports (`ClockPort`, `SequenceGeneratorPort`, `ClockDiagnosticsPort`) enabling adapter substitution for NTP-validated time sources
- Startup self-tests (ST-1 through ST-5) per 21 CFR 11.10(h) validating platform timer integrity at construction time
- Structurally irresettable sequence generation per 21 CFR 11.10(d) and ALCOA+ Complete
- Per-record SHA-256 cryptographic integrity (`computeTemporalContextDigest()`) per 21 CFR 11.10(c) and ALCOA+ Original
- Frozen (immutable) adapters and return values per ALCOA+ Original
- Complete IQ/OQ/PQ qualification protocols, FMEA risk analysis, and requirements traceability matrix
- Full ALCOA+ principle mapping with attribution context and electronic signature binding

`@hex-di/clock` provides the **mechanism**. `@hex-di/guard` provides the **policy** (which clock sources are acceptable, what resolution is required, when to fail). GxP deployments MUST deploy both packages together.

### ClockSource Bridge

The guard library uses an injectable `ClockSource` interface that bridges over `ClockPort.wallClockNow()` from `@hex-di/clock`:

```typescript
interface ClockSource {
  now(): string; // Returns ISO 8601 UTC timestamp
}
```

`ClockSource.now()` is a thin ISO 8601 formatting bridge over `ClockPort.wallClockNow()`. The `createClockSourceBridge()` function adapts `ClockPort` to `ClockSource` by converting the epoch-millisecond return value to an ISO 8601 UTC string via `new Date(clock.wallClockNow()).toISOString()`.

Clock infrastructure references:

- Platform adapter startup self-tests (ST-1 through ST-5): `spec/clock/04-platform-adapters.md`
- NTP startup modes (`fail-fast`, `degraded`, `offline`) and NTP adapter behavior: this section (see "NTP Adapter Interface Contract" below)

**Production:** Use `SystemClock` (the default) which calls `new Date().toISOString()`. Ensure the host system runs NTP (chrony, ntpd, or cloud-provider time sync). When `@hex-di/clock` is integrated, `createGuardGraph()` creates the `ClockSource` bridge internally from the injected `ClockPort`.

**Testing:** Inject a fixed or controllable clock for deterministic timestamps:

```typescript
const testClock: ClockSource = {
  now: () => "2024-01-15T10:30:00.000Z",
};

const guardGraph = createGuardGraph({
  subjectAdapter: createSubjectAdapter(() => testSubject),
  auditTrailAdapter: memoryAuditTrail,
  clock: testClock,
});
```

### Why ISO 8601 UTC

All timestamps in the guard system use ISO 8601 format in UTC:

- **Unambiguous:** No timezone confusion between distributed systems
- **Sortable:** Lexicographic string sorting produces chronological order
- **JSON-native:** Serializes directly without conversion
- **Human-readable:** `"2024-01-15T10:30:00.000Z"` is immediately understandable

### Timestamp Fields

| Field                          | Location          | Source                | Purpose                                         |
| ------------------------------ | ----------------- | --------------------- | ----------------------------------------------- |
| `Decision.evaluatedAt`         | Policy evaluator  | Guard clock source    | When the authorization decision was made        |
| `AuditEntry.timestamp`         | Guard wrapper     | Guard clock source    | When the audit entry was recorded               |
| `AuthSubject.authenticatedAt`  | Subject adapter   | Authentication system | When the subject authenticated                  |
| `ElectronicSignature.signedAt` | Signature capture | Signing system        | When the signature was applied                  |
| `GuardDecisionEntry.timestamp` | GuardInspector    | Guard clock source    | When the decision was recorded in the inspector |

All five timestamp fields use the same format (ISO 8601 UTC) for consistency.

```
RECOMMENDED: The guard wrapper SHOULD validate that AuthSubject.authenticatedAt conforms
             to ISO 8601 UTC format with the "Z" designator before proceeding with
             evaluation. If the format is invalid (e.g., missing "Z", local timezone
             offset, unparseable string), the guard SHOULD log a warning including the
             malformed value and the subjectId, but SHOULD NOT block the evaluation.
             This soft validation prevents format drift from subject adapters without
             creating a denial-of-service risk from overly strict parsing.
             Reference: ALCOA+ Contemporaneous principle, 06-subject.md.
```

```
RECOMMENDED: All imported timestamps (e.g., from legacy systems or external IdPs)
             SHOULD be normalized to UTC with "Z" designator before persistence in
             audit entries. If the original value used a timezone offset, the original
             string SHOULD be preserved in a supplementary metadata field for
             traceability. This ensures consistent timestamp comparison and sorting
             across all audit entries regardless of their source system.
```

### Timing Strategy: Dual-Clock Architecture

The guard system uses two distinct timing mechanisms for different purposes. This is a deliberate design — mixing them would produce incorrect results.

| Property          | `ClockSource.now()`                                                     | `performance.now()`                                    |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| **Type**          | Absolute wall-clock time                                                | Relative monotonic counter                             |
| **Source**        | `ClockPort.wallClockNow()` via bridge (NTP-synchronized in production)  | Browser/Node.js high-resolution timer                  |
| **Format**        | ISO 8601 UTC string (e.g., `"2024-01-15T10:30:00.000Z"`)                | Floating-point milliseconds (e.g., `0.15`)             |
| **Purpose**       | Audit-grade timestamps (`evaluatedAt`, `AuditEntry.timestamp`)          | Performance measurement (`EvaluationTrace.durationMs`) |
| **Injectable**    | Yes, via `createGuardGraph({ clock })`                                  | No — always uses the platform's monotonic clock        |
| **GxP relevance** | NTP synchronization required (see NTP Adapter Interface Contract below) | Not audit-relevant; informational only                 |

**Why not use one clock for both?**

- `performance.now()` has no absolute reference — it cannot produce ISO 8601 timestamps for audit records.
- `Date.now()` is subject to NTP adjustments and clock skew — using it for duration measurement could produce negative durations if the system clock is adjusted mid-evaluation.

**Authoritative locations:**

- `ClockSource` interface: `07-guard-adapter.md` section 25 (Clock Source)
- `EvaluationTrace.durationMs` JSDoc: `05-policy-evaluator.md` section 20
- NTP synchronization requirements: this section (see "NTP Adapter Interface Contract")

### Leap Second Handling

Leap second handling is defined authoritatively in `spec/clock/02-clock-port.md` section 6 ("Leap Second Behavior"). Since `sequenceNumber` (not timestamp) is the authoritative ordering mechanism, leap seconds do not affect chain integrity or entry ordering. Guard implementations inherit leap second behavior from the underlying `ClockPort` platform adapter.

```
RECOMMENDED: When using temporal authorization patterns (04-policy-types.md,
             "Temporal Authorization Pattern"), the ClockSource used to derive
             subject attributes (e.g., currentHour, sessionAgeMs) SHOULD be the
             same NTP-synchronized ClockSource configured in createGuardGraph().
             This ensures temporal policy decisions use audit-grade timestamps
             consistent with the AuditEntry.timestamp field. Injecting clock-derived
             attributes via SubjectProvider at scope creation time (ADR #9) bounds
             temporal attribute freshness to the scope lifetime, which can be
             further controlled via maxScopeLifetimeMs (07-guard-adapter.md).
             Reference: ALCOA+ Contemporaneous, 21 CFR 11.10(e).
```

### Authoritative Ordering: sequenceNumber

When wall-clock timestamps are identical (e.g., two evaluations within the same millisecond) or when backward clock jumps produce non-monotonic timestamps (see FM-10), `sequenceNumber` serves as the authoritative ordering mechanism.

> **Cross-reference:** Ordering guarantee theory (total ordering, monotonicity, cross-scope behavior) is defined in `spec/clock/03-sequence-generator.md` section 9.

```
REQUIREMENT: When two or more audit entries share the same timestamp value within
             a scope, the entries MUST be ordered by sequenceNumber ascending.
             The sequenceNumber — not the timestamp — is the definitive ordering
             authority for audit entries within a scope.

REQUIREMENT: The canonical sort order for audit entries within a scope is:
             (1) Primary sort: scopeId (groups entries by chain)
             (2) Secondary sort: sequenceNumber ascending (orders entries
             within a chain). Timestamp is informational only and MUST NOT
             be used as the primary ordering key when sequenceNumber is
             available.
```

> **Cross-references:** Per-scope chain architecture and monotonic sequenceNumber assignment are defined in section 61.4a. FM-10 (section 68) documents the backward-clock-jump failure mode that this ordering mitigates.

```
RECOMMENDED: When displaying audit entries to compliance reviewers, the display
             SHOULD sort by sequenceNumber ascending within each scope. Timestamp
             MAY be shown as a supplementary informational field, but the canonical
             order SHOULD be by sequenceNumber. This ensures consistent ordering even
             when backward clock jumps (FM-10) produce non-monotonic timestamps.
```

---

### NTP Adapter Interface Contract (NC-1 through NC-7)

> **Source:** These contracts govern how any NTP-aware adapter -- whether provided by the guard or by a third party -- interacts with the clock port system. This section is the authoritative source for NTP adapter behavior.

The guard's `NtpClockAdapter` MUST satisfy the following interface contract:

```typescript
/**
 * Configuration for NTP-aware clock adapters.
 * Any adapter implementing NtpClockAdapterConfig is compatible with the clock port system.
 */
interface NtpClockAdapterConfig {
  /** NTP server hostname or IP address */
  readonly server: string;
  /** Maximum acceptable drift in milliseconds before warning (default: 50) */
  readonly softDriftThresholdMs?: number;
  /** Maximum acceptable drift in milliseconds before error (default: 500) */
  readonly hardDriftThresholdMs?: number;
  /** Maximum acceptable drift in milliseconds before fail-fast (default: 2000) */
  readonly criticalDriftThresholdMs?: number;
  /** Interval between periodic NTP drift checks in milliseconds (default: 60000) */
  readonly checkIntervalMs?: number;
  /** Behavior when NTP validation fails at startup */
  readonly onFailure: "fail-fast" | "degraded" | "offline";
  /** Required when onFailure is 'offline' and GxP mode is enabled */
  readonly offlineJustification?: string;
  /** Retry interval for 'degraded' mode in milliseconds (default: 30000) */
  readonly retryIntervalMs?: number;
  /** Maximum duration in 'degraded' mode before escalation in milliseconds (default: 300000) */
  readonly maxDegradedDurationMs?: number;
}
```

REQUIREMENT: Any NTP-aware clock adapter registered as `ClockPort` in the container MUST satisfy ALL of the following behavioral contracts:

| Contract                                     | Description                                                                                                                                                                                                                       | Verification    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| NC-1: Implements `ClockPort`                 | The adapter MUST implement `monotonicNow()`, `wallClockNow()`, and `highResNow()` with identical semantic contracts as defined in the clock spec sections 5-7                                                                     | Type-level + IQ |
| NC-2: Implements `ClockDiagnosticsPort`      | The adapter MUST implement `getDiagnostics()` reporting `adapterName: 'NtpClockAdapter'` (or the adapter's actual name)                                                                                                           | IQ              |
| NC-3: Delegates to platform APIs             | The adapter MUST delegate actual time reading to platform APIs (`performance.now()`, `Date.now()`). It MUST NOT modify, correct, or adjust the returned timestamp values. Clock correction is the OS NTP daemon's responsibility. | OQ              |
| NC-4: Reports drift, does not correct        | The adapter's drift measurements are for monitoring and alerting only. The adapter MUST NOT apply clock correction offsets to returned values.                                                                                    | OQ              |
| NC-5: Frozen object                          | The adapter object MUST be frozen with `Object.freeze()`                                                                                                                                                                          | IQ              |
| NC-6: Captures platform APIs at construction | The adapter MUST capture `Date.now` and `performance` references at construction time, consistent with the anti-tampering requirements in clock spec section 11                                                                   | IQ              |
| NC-7: Emits `ClockSourceChanged` event       | When the adapter replaces `SystemClockAdapter` in the container, a `ClockSourceChanged` event MUST be emitted (see clock spec section 22)                                                                                         | IQ              |

**NTP drift monitoring interface:**

```typescript
interface NtpDriftStatus {
  readonly lastCheckTimestamp: number; // wallClockNow() at time of last NTP check
  readonly measuredDriftMs: number; // Signed drift: positive = local ahead, negative = local behind
  readonly driftLevel: "normal" | "warning" | "error" | "critical";
  readonly ntpServer: string;
  readonly checkCount: number; // Total number of checks performed since startup
}
```

REQUIREMENT: NTP-aware adapters SHOULD expose drift status through a `getNtpDriftStatus()` method or through the guard's health check API. This is NOT part of `ClockPort` or `ClockDiagnosticsPort` — it is an adapter-specific extension that the guard exposes through its own API surface.

REQUIREMENT: The `NtpDriftStatus` object MUST be frozen with `Object.freeze()`.

**Guard's NTP Adapter (Reference):**

The guard's reference `NtpClockAdapter` implementation:

1. Verifies NTP synchronization at startup per the `onFailure` mode configuration.
2. Periodically checks NTP drift at `checkIntervalMs` intervals.
3. Emits warnings when drift exceeds `softDriftThresholdMs`.
4. Emits errors when drift exceeds `hardDriftThresholdMs`.
5. Optionally fails-fast when drift exceeds `criticalDriftThresholdMs`.

This adapter implements `ClockPort` and `ClockDiagnosticsPort`, and is registered in the guard graph, overriding the default `SystemClockAdapter` for all consumers. It conforms to all NC-1 through NC-7 contracts defined above.

**Third-Party NTP Adapter Compatibility:**

Organizations MAY provide their own NTP-aware clock adapter (e.g., wrapping a hardware PTP clock or a custom NTP client) as long as it satisfies the NC-1 through NC-7 contracts above. Third-party adapters MUST be validated through the same IQ/OQ/PQ protocols as the guard's reference implementation.

REQUIREMENT: Third-party NTP adapters MUST be registered in the container graph using `ClockPort` and `ClockDiagnosticsPort` ports. They MUST NOT introduce additional ports that bypass the standard clock port system.

REQUIREMENT: GxP organizations using third-party NTP adapters MUST document the adapter's compliance with NC-1 through NC-7 contracts in their computerized system validation plan, including the adapter's name, version, and validation evidence.

### Clock-Related Recovery Procedures (FM-3 through FM-6)

> **Source:** These recovery procedures cover guard-detected failure modes and guard-level recovery actions. FM-1 (ClockStartupError) and FM-2 (SequenceOverflowError) are clock-internal failure modes defined in `spec/clock/06-gxp-compliance/recovery-procedures.md`.

#### FM-3: NTP Desynchronization (Guard-Detected)

**Trigger:** The guard's `NtpClockAdapter` detects that wall-clock drift exceeds the configured threshold.

**Impact:** Wall-clock timestamps (`wallClockNow()`, `highResNow()`) may not reflect actual calendar time. ALCOA+ Contemporaneous and ALCOA+ Accurate are at risk. Monotonic timestamps and sequence numbers are NOT affected.

**Recovery procedure by drift level:**

| Drift Level | Threshold (Default) | Guard Action                             | Required Recovery                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal      | < 50ms              | No action                                | None                                                                                                                                                                                                                                                                                                                  |
| Warning     | 50ms - 500ms        | Emits warning event                      | 1. Investigate NTP daemon health. 2. Verify NTP server reachability. 3. Document in monitoring log.                                                                                                                                                                                                                   |
| Error       | 500ms - 2000ms      | Emits error event                        | 1. All steps from Warning. 2. Verify NTP configuration (server addresses, sync interval). 3. Check for network connectivity issues. 4. Consider manual clock synchronization as temporary measure. 5. Document corrective action.                                                                                     |
| Critical    | > 2000ms            | Emits critical event; optional fail-fast | 1. All steps from Error. 2. If fail-fast is configured, the application stops — restart after NTP is corrected. 3. If not fail-fast, immediately halt audit-producing operations until NTP sync is restored. 4. Open a deviation record. 5. Assess impact on audit entries produced during the desynchronized period. |

REQUIREMENT: When drift exceeds the error threshold, GxP organizations MUST assess whether any audit trail entries produced during the desynchronized period require correction or annotation. The assessment MUST be documented in the deviation record.

REQUIREMENT: Audit trail entries produced during periods of detected NTP desynchronization SHOULD be annotated with a flag indicating reduced clock accuracy. The annotation mechanism is a consumer responsibility.

#### FM-4: Platform API Tampering (Post-Construction)

**Trigger:** After `SystemClockAdapter` construction, `globalThis.Date.now` or `globalThis.performance` is replaced with a different function.

**Impact on `@hex-di/clock`:** None, by design. The adapter captured references to platform APIs at construction time (clock spec section 11, "Platform API Capture"). Post-construction tampering of globals does not affect the adapter.

**Impact on other code:** Code outside `@hex-di/clock` that accesses `Date.now()` or `performance.now()` directly (not through the clock port) will use the tampered values.

**Detection:** The guard's periodic adapter integrity check detects adapter replacement. However, platform API tampering that does not replace the adapter itself is NOT detected by the guard — it is mitigated by the capture-at-construction pattern.

**Recovery procedure:**

1. **Prevention is primary:** GxP deployments MUST freeze `Date` and `performance` at the application entry point (clock spec section 11). With frozen platform APIs, tampering throws a `TypeError` rather than succeeding silently.
2. **If tampering is detected** (e.g., via application-level monitoring that compares `globalThis.Date.now()` against the adapter's `wallClockNow()`): Stop the application. Investigate the tampering vector. Review audit trail entries for integrity. Open a security incident record. Redeploy with frozen platform APIs.
3. **If tampering is NOT detected** but suspected: Compare `wallClockNow()` (captured reference) against `Date.now()` (global). If they diverge significantly, tampering may have occurred.

#### FM-5: Adapter Integrity Violation (Guard-Detected)

**Trigger:** The guard's periodic integrity check detects that the `ClockDiagnosticsPort.getDiagnostics().adapterName` has changed unexpectedly, or that the adapter object is no longer frozen.

**Impact:** The clock source may have been replaced without proper audit trail documentation (missing `ClockSourceChanged` event). All timestamps produced after the unauthorized replacement are of unknown provenance.

**Recovery procedure:**

1. **Immediate:** The guard emits a `clock-integrity-violation` diagnostic event. Depending on configuration, the guard may fail the application.
2. **Investigation:** Determine when the adapter was replaced and by what code path. Review the container graph for unauthorized `ClockPort` overrides.
3. **Impact assessment:** Identify all audit trail entries produced between the last successful integrity check and the violation detection. These entries have uncertain clock source provenance and MUST be flagged for review.
4. **Corrective action:** Fix the code that caused the unauthorized replacement. Re-deploy with the guard's integrity checks enabled. Re-run OQ to confirm adapter integrity under load.
5. **Documentation:** Record the violation, impact assessment, corrective action, and preventive measures in the deviation log.

#### FM-6: Process Crash and Restart

**Trigger:** The application process crashes or is restarted (planned or unplanned).

**Impact:** A new `SystemSequenceGenerator` starts at `1` with a new process instance identifier. Events from the previous process lifetime have a different identifier.

**This is expected behavior, not a failure.** See clock spec section 10, "Process Recovery and Sequence Continuity."

**Recovery procedure:**

1. **Automatic:** The new process generates a new process instance identifier (e.g., via `crypto.randomUUID()`). No manual intervention required.
2. **Audit trail continuity:** The global audit trail uses the composite key `(processInstanceId, sequenceNumber)` for unique event identification. Process restart introduces a new series starting from 1, disambiguated by the new identifier.
3. **Logging:** Process restart events SHOULD be logged with the new process instance identifier and restart timestamp to enable auditors to correlate sequence resets with process lifecycle events.
4. **Gap analysis:** Verify that no events were lost during the restart window by comparing the last `sequenceNumber` from the old process with the expected event count.

#### Recovery Procedure Summary Matrix

| Failure Mode                      | Severity              | Detection                      | Recovery Time    | Automated Recovery            | Manual Steps Required                  |
| --------------------------------- | --------------------- | ------------------------------ | ---------------- | ----------------------------- | -------------------------------------- |
| FM-3: NTP Desynchronization       | High (error/critical) | Periodic (guard)               | Minutes to hours | Partial (drift monitoring)    | Investigate NTP, correct configuration |
| FM-4: Platform API Tampering      | High                  | Prevented (freeze) or periodic | Hours            | No                            | Security investigation, redeploy       |
| FM-5: Adapter Integrity Violation | High                  | Periodic (guard)               | Minutes          | Partial (fail-fast)           | Investigation, corrective action       |
| FM-6: Process Crash/Restart       | Low (expected)        | Immediate (startup)            | Seconds          | Yes (new process instance ID) | Gap analysis only                      |

REQUIREMENT: GxP organizations MUST include FM-3 through FM-6 recovery procedures in their standard operating procedures. Each SOP MUST identify the responsible role (operator, infrastructure team, QA), the escalation path, and the documentation requirements.

### Consolidated CSV Plan Checklist for Clock Infrastructure

> **Source:** These items are collected from the `@hex-di/clock` specification sections that reference "MUST include in CSV plan" or similar GxP documentation requirements. GxP organizations MUST address each item in their computerized system validation (CSV) plan.

1. **GAMP 5 risk classification** — Include the risk classification table from clock spec section 17, allocating testing effort proportional to risk level.
2. **NTP configuration documentation** — Document NTP server addresses, sync intervals, and drift thresholds.
3. **IQ protocol execution** — Execute the clock IQ checklist on each deployment target and retain results as validation evidence.
4. **OQ protocol execution** — Execute the clock OQ protocol on each deployment target after version or platform changes.
5. **PQ protocol execution** — Execute the clock PQ protocol on each deployment target; exclude from CI/CD pipelines.
6. **PQ threshold configuration** — Document configured PQ thresholds (`PQ_DURATION_MS`, `PQ_THROUGHPUT_REQUIREMENT`, `PQ_MEMORY_GROWTH_THRESHOLD`) per deployment target.
7. **Deployment qualification checklist** — Execute one-time infrastructure verifications (NTP leap smearing, NTP sync before app start, platform API freeze, module export freeze) on each deployment target.
8. **Change control procedures** — Document version pinning policy, QA approval workflow, and re-qualification triggers.
9. **Platform suitability justification** — For platforms classified as "Conditionally Suitable," document deployment context and verify observed precision.
10. **Guard deployment requirement** — Document that `@hex-di/guard` is deployed alongside `@hex-di/clock` for GxP environments.
11. **Data retention policy** — Define retention policies for audit trail records containing clock-derived timestamps.
12. **Process instance identifier strategy** — Document which process-unique identifier is used for multi-process audit trail disambiguation.
13. **Attribution context composition** — Document how temporal context is composed with identity and operation context for audit entries.
14. **IQ/OQ/PQ validation constraints** — Document that qualification tests use production adapters only and do NOT use `VirtualClockAdapter` or `@hex-di/clock/testing` imports.
15. **Wall-clock rollback handling** — Document that sequence numbers are the primary ordering mechanism and wall-clock timestamps are supplementary metadata subject to NTP corrections.
16. **Recovery procedures (SOPs)** — Include FM-1 through FM-6 recovery procedures in standard operating procedures, with responsible roles, escalation paths, and documentation requirements.
17. **NTP adapter interface compliance** — If using a third-party NTP adapter, document compliance with NC-1 through NC-7 contracts including adapter name, version, and validation evidence.

---

---

_Previous: [Audit Trail Contract](./02-audit-trail-contract.md) | Next: [Data Retention](./04-data-retention.md)_
