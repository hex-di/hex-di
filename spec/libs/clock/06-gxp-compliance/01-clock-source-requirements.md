# 6.1 Clock Source Requirements — GxP Compliance

> **Part of:** [GxP Compliance (§6)](./README.md) | **Previous:** [§5 Testing Support](../05-testing-support.md) | **Next:** [§6.2 Qualification Protocols](./02-qualification-protocols.md)

## Clock Source Requirements

This section defines the GxP regulatory requirements that `@hex-di/clock` addresses and the boundaries of its responsibility.

### In-Scope (Provided by `@hex-di/clock`)

| Control                             | Description                                                                          | Regulation                           |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| Injectable clock source             | All timing via `ClockPort`, enabling NTP-validated adapter injection                 | EU GMP Annex 11 section 9            |
| Monotonic ordering                  | `monotonicNow()` immune to NTP jumps                                                 | ALCOA+ Contemporaneous               |
| Sequence-based ordering             | `SequenceGeneratorPort` for total ordering independent of clock precision            | ALCOA+ Contemporaneous               |
| Structurally irresettable sequences | Production `SequenceGeneratorPort` has no `reset()` method; compile-time enforcement | 21 CFR 11.10(d), ALCOA+ Complete     |
| Clock source attestation            | `ClockDiagnosticsPort` exposes adapter identity and platform source at runtime       | 21 CFR 11.10(e), ALCOA+ Attributable |
| Immutable adapters                  | All adapter objects frozen with `Object.freeze()`                                    | ALCOA+ Original                      |
| Error immutability                  | `SequenceOverflowError` frozen at construction                                       | 21 CFR 11.10(e)                      |
| Deterministic testing               | `VirtualClockAdapter` for IQ/OQ validation                                           | GAMP 5 Category 5                    |
| Platform transparency               | `getPerformance()` detection with no fallback masking                                | 21 CFR 11.10(c)                      |

### GAMP 5 Risk Classification

The following risk classification applies to `@hex-di/clock` functions under GAMP 5 Category 5 (custom software). Different risk levels warrant different validation intensities in IQ/OQ/PQ plans.

| Function                                | Impact     | Likelihood     | Overall Risk | Rationale                                                                                                                                                                                                                                                                                                                           | Validation Intensity                                                            |
| --------------------------------------- | ---------- | -------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `wallClockNow()`                        | **High**   | **Medium**     | **High**     | Feeds audit trail timestamps. Inaccuracy directly impacts ALCOA+ Contemporaneous. A wrong wall-clock value corrupts the "when" of every electronic record. Likelihood is medium because inaccuracy requires NTP misconfiguration or system clock manipulation.                                                                      | Full IQ/OQ/PQ. NTP validation mandatory in GxP mode.                            |
| `highResNow()`                          | **High**   | **Medium**     | **High**     | Feeds tracing spans used as regulatory evidence. Precision inaccuracy impacts ALCOA+ Accurate. The `performance.timeOrigin` drift risk (section 2.4) amplifies concern. Likelihood is medium because drift requires NTP to synchronize after process start.                                                                         | Full IQ/OQ/PQ. NTP pre-sync required before process start.                      |
| `monotonicNow()`                        | **Medium** | **Low**        | **Medium**   | Used for duration measurement. Incorrect duration does not directly corrupt regulatory records but may affect derived calculations (e.g., rate limits, timeout decisions). Likelihood is low because `performance.now()` monotonicity is guaranteed by the platform.                                                                | IQ/OQ. Platform `performance.now()` monotonicity validated at startup.          |
| `SequenceGeneratorPort.next()`          | **High**   | **Negligible** | **Medium**   | Feeds audit trail ordering. Corruption (duplicate numbers, gaps, or resets) directly impacts ALCOA+ Complete. Structural irresettability is the primary mitigation. Likelihood is negligible because the simple increment logic has no external dependencies, and overflow requires ~285,000 years at sustained maximum throughput. | Full IQ/OQ/PQ. Compile-time structural verification + runtime uniqueness tests. |
| `SequenceGeneratorPort.current()`       | **Low**    | **Negligible** | **Low**      | Read-only observation of last sequence number. Cannot corrupt ordering. Incorrect value would cause confusion but no data integrity violation.                                                                                                                                                                                      | IQ only.                                                                        |
| `ClockDiagnosticsPort.getDiagnostics()` | **Medium** | **Low**        | **Medium**   | Provides clock source attestation for audit trail provenance. Incorrect diagnostics could mislead auditors about clock source trustworthiness but does not affect the actual timestamps. Likelihood is low because diagnostics are derived from the same platform detection used for adapter construction.                          | IQ/OQ. Verified against actual platform detection results.                      |

REQUIREMENT (CLK-GXP-001): GxP organizations MUST include this risk classification in their computerized system validation plan. The validation plan MUST allocate testing effort proportional to the risk level of each function.

### Out-of-Scope (Delegated to Ecosystem GxP Monitoring Infrastructure)

| Control                        | Description                                       | Where Addressed                                  |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| NTP synchronization validation | Verifying clock is NTP-synced                     | Ecosystem monitoring adapter specification       |
| Clock resolution verification  | Asserting minimum resolution for audit timestamps | Ecosystem monitoring adapter specification       |
| Clock drift detection          | Detecting and alerting on excessive clock drift   | Ecosystem monitoring adapter specification       |
| Cryptographic timestamps       | SHA-256 signed timestamps for audit trails        | Ecosystem monitoring adapter specification       |
| Fail-fast for GxP mode         | Blocking startup when clock requirements unmet    | Ecosystem monitoring adapter specification       |

### Responsibility Boundary

`@hex-di/clock` provides the **mechanism** (injectable clock and sequence ports). The ecosystem's GxP monitoring infrastructure provides the **policy** (which clock sources are acceptable, what resolution is required, when to fail). This separation follows the hexagonal architecture principle: the port defines the contract, the adapter provides the implementation, and the monitoring layer validates the implementation meets regulatory requirements.

### NTP Synchronization Boundary

Wall-clock timestamps in GxP audit trails must reflect actual calendar time to satisfy the ALCOA+ Contemporaneous principle. `Date.now()` and `performance.timeOrigin` depend on the system clock, which must be NTP-synchronized.

`@hex-di/clock` does NOT verify NTP synchronization. It provides the injectable port that enables an NTP-aware adapter to be used:

```
+-----------------+     +-------------------+     +------------------+
| Consumer code   |---->| ClockPort (port)  |<----| NtpClockAdapter  |
| (HTTP client,   |     | (interface only)  |     | (adapter)        |
| tracing, etc.)  |     +-------------------+     +------------------+
+-----------------+            ^                          |
                               |                          v
                        +-------------------+     +------------------+
                        | SystemClockAdapter|     | NTP Server       |
                        | (default, no NTP) |     | (external)       |
                        +-------------------+     +------------------+
```

In non-GxP deployments, `SystemClockAdapter` is used (no NTP verification).
In GxP deployments, the ecosystem monitoring adapter replaces it with an NTP-aware adapter.

The NTP adapter interface contract, third-party adapter compatibility requirements, and the NTP drift monitoring interface are defined in the ecosystem monitoring adapter's specification.

REQUIREMENT (CLK-GXP-002): `@hex-di/clock` MUST NOT import or reference any ecosystem monitoring library. The dependency is unidirectional: monitoring libraries depend on clock, never the reverse.

### Clock Source Provenance

`ClockPort` intentionally returns raw `number` values with no embedded metadata about which adapter produced them. Source identification is available through the standard HexDI container graph inspection infrastructure: consumers can query which adapter is registered for `ClockPort` at any time.

When ecosystem GxP monitoring infrastructure is deployed, runtime drift diagnostics are available through the monitoring adapter's health check API.

**Design rationale:** Keeping `ClockPort` minimal (three functions returning numbers) ensures maximum composability and zero overhead. Adding provenance metadata to every call would violate the single-responsibility principle and introduce allocation costs on a hot path.

### ClockDiagnosticsPort

To satisfy 21 CFR 11.10(e) audit trail provenance requirements without polluting the hot-path `ClockPort` interface, `@hex-di/clock` provides a separate `ClockDiagnosticsPort` for clock source attestation and runtime diagnostics.

```typescript
interface ClockDiagnostics {
  readonly adapterName: string;
  readonly monotonicSource: "performance.now" | "Date.now-clamped" | "host-bridge";
  readonly highResSource: "performance.timeOrigin+now" | "Date.now" | "host-bridge" | "host-bridge-wallclock";
  readonly platformResolutionMs: number | undefined;
  readonly cryptoFipsMode: boolean | undefined;
}

interface ClockDiagnosticsPort {
  readonly getDiagnostics: () => ClockDiagnostics;
  readonly getCapabilities: () => ClockCapabilities;
}
```

> **Note:** `ClockCapabilities` is defined in section 2.8 of `02-clock-port.md`. The `getCapabilities()` method provides fine-grained platform capability introspection (monotonic availability, high-res precision, cross-origin isolation, timer API support).

```typescript
const ClockDiagnosticsPort = createPort<ClockDiagnosticsPort>("ClockDiagnosticsPort");
```

**Semantic contract:**

- `adapterName` MUST be a human-readable identifier for the active clock adapter (e.g., `'SystemClockAdapter'`, `'NtpClockAdapter'`, `'VirtualClockAdapter'`).
- `monotonicSource` MUST indicate which platform API backs `monotonicNow()`.
- `highResSource` MUST indicate which platform API backs `highResNow()`.
- `platformResolutionMs` MUST report the observed minimum non-zero delta from a startup sample, or MUST be `undefined` if the platform does not support resolution measurement.
- `cryptoFipsMode` MUST report whether the platform's cryptographic module is operating in FIPS mode. On Node.js, this is detected via `crypto.getFips()` (returns `1` if FIPS mode is enabled, `0` otherwise). On platforms where FIPS mode detection is not available, the value MUST be `undefined`. This enables GxP organizations to verify at runtime that their deployment environment's cryptographic operations (used by `computeTemporalContextDigest()`) are FIPS-compliant, addressing FIPS 140-2/140-3 verification requirements without requiring manual infrastructure inspection.
- The returned `ClockDiagnostics` object MUST be frozen with `Object.freeze()`.

**GxP rationale (21 CFR 11.10(e), ALCOA+ Attributable):** Auditors reviewing timestamped records need to determine the trustworthiness of the clock source. `ClockDiagnosticsPort` provides this attestation at any point during application lifetime without requiring access to the DI container's internal graph. Consumers (including ecosystem monitoring adapters when deployed) can query diagnostics at startup.

REQUIREMENT (CLK-GXP-003): `createSystemClock()` MUST also return a `ClockDiagnosticsPort`-compatible diagnostics function. `SystemClockAdapter` MUST register `ClockPort` and `SystemClockDiagnosticsAdapter` MUST register `ClockDiagnosticsPort`.

REQUIREMENT (CLK-GXP-003a): `ClockDiagnostics.cryptoFipsMode` MUST be populated at adapter construction time. On Node.js, the implementation MUST use `crypto.getFips()` to detect FIPS mode (`1` → `true`, `0` → `false`). On platforms where `crypto.getFips` is not a function (browsers, Deno, edge runtimes), the value MUST be `undefined`. On platforms where FIPS compliance is algorithm-specific rather than mode-based (e.g., browser SubtleCrypto with FIPS-compliant algorithms but no explicit FIPS mode toggle), `cryptoFipsMode` MUST be `undefined` and organizations MUST document their platform's cryptographic compliance posture separately in their CSVP. GxP organizations with FIPS requirements MUST verify that `cryptoFipsMode === true` at startup and document the verification in their CSVP.

REQUIREMENT (CLK-GXP-004): When any adapter replaces `SystemClockAdapter`, the new adapter MUST also register its own `ClockDiagnosticsPort` implementation reporting its adapter name and platform source information.

### Calibration and Verification

21 CFR 211.68 requires routine calibration of automatic equipment used in production. For `@hex-di/clock`, calibration applies at two levels:

1. **Platform timer calibration** is an OS-level operational concern. The system clock is calibrated via NTP daemon synchronization. `@hex-di/clock` does not perform calibration itself — it reads whatever the OS provides.
2. **Application-level calibration verification** is provided by periodic drift checking against an NTP reference. In HexDI, this is the responsibility of the ecosystem's GxP monitoring infrastructure.

`@hex-di/clock` satisfies 21 CFR 211.68 by providing an injectable, verifiable, and testable clock abstraction. The injectability enables ecosystem monitoring adapters to wrap and monitor the clock; the testability enables IQ/OQ validation with `VirtualClockAdapter`.

REQUIREMENT (CLK-GXP-005): GxP organizations MUST document their NTP configuration (server addresses, sync interval, drift thresholds) in their computerized system validation plan. This documentation is outside the scope of `@hex-di/clock` but is necessary for regulatory compliance.

### Periodic Evaluation Fallback (EU GMP Annex 11, Section 11)

EU GMP Annex 11, Section 11 requires periodic evaluation of computerized systems to confirm that they remain in a validated state. For `@hex-di/clock`, periodic evaluation of clock accuracy and drift is the primary responsibility of the ecosystem's GxP monitoring adapter (see § 7.3). However, GxP organizations MUST NOT rely on the ecosystem monitoring adapter's existence without verification.

REQUIREMENT (CLK-GXP-006): GxP organizations MUST verify, as part of their computerized system validation plan, that a periodic clock evaluation mechanism is deployed and operational before claiming EU GMP Annex 11 Section 11 compliance for the clock subsystem. The verification MUST confirm:

1. A periodic evaluation mechanism is deployed (either an ecosystem monitoring adapter or a consumer-implemented equivalent).
2. The mechanism performs clock drift detection at a defined interval (RECOMMENDED: no less frequently than every 5 minutes).
3. The mechanism generates alerts when drift exceeds the organization's defined threshold.
4. The mechanism's operational status is itself monitored (i.e., failure of the monitoring system is detected).

REQUIREMENT (CLK-GXP-007): When no ecosystem GxP monitoring adapter is deployed, `@hex-di/clock` consumers MUST implement a minimum viable periodic evaluation using the built-in `ClockDiagnosticsPort` infrastructure. The minimum viable implementation MUST:

1. Periodically invoke `ClockDiagnosticsPort.getDiagnostics()` and `ClockDiagnosticsPort.getCapabilities()` to verify that the clock adapter identity and platform capabilities remain consistent with the validated baseline captured during IQ execution.
2. Periodically compare `ClockPort.wallClockNow()` against an independent time reference (e.g., an HTTP-based time API, a database server timestamp, or a secondary NTP query) to detect gross drift.
3. Log each periodic check result with a `TemporalContext` timestamp for audit trail purposes.
4. Alert the Infrastructure Operator (per § 6.10 role definitions) when any check fails.

The periodic check interval, drift threshold, and alerting mechanism are deployment-specific parameters that MUST be documented in the organization's computerized system validation plan. The checks described above do not replace a full ecosystem monitoring adapter — they provide a minimum safety net for Annex 11 Section 11 compliance when the full monitoring infrastructure is not yet deployed.

#### Periodic Evaluation Scheduling Utility

To reduce the implementation burden on consumers implementing CLK-GXP-007, `@hex-di/clock` exports a utility function that sets up periodic clock evaluation using the built-in `ClockDiagnosticsPort` and `TimerSchedulerPort`:

```typescript
interface PeriodicEvaluationConfig {
  readonly intervalMs: number;
  readonly baselineDiagnostics: ClockDiagnostics;
  readonly baselineCapabilities: ClockCapabilities;
  readonly onDriftDetected: (observed: number, wallClock: WallClockTimestamp) => void;
  readonly onBaselineMismatch: (field: string, expected: unknown, actual: unknown) => void;
  readonly driftReferenceProvider?: () => Promise<number>; // Returns epoch ms from external time source
  readonly driftThresholdMs?: number; // Default: 1000ms
}

function setupPeriodicClockEvaluation(
  clock: ClockPort,
  diagnostics: ClockDiagnosticsPort,
  timer: TimerSchedulerPort,
  config: PeriodicEvaluationConfig
): { readonly stop: () => void };
```

**Behavioral contract:**

1. `setupPeriodicClockEvaluation()` starts a `setInterval` via `TimerSchedulerPort` at the configured `intervalMs`.
2. Each evaluation cycle: (a) calls `getDiagnostics()` and compares `adapterName` and `monotonicSource` against the baseline — if changed, invokes `onBaselineMismatch`; (b) calls `getCapabilities()` and compares `hasMonotonicTime`, `hasHighResOrigin`, and `monotonicDegraded` against the baseline — if changed, invokes `onBaselineMismatch`; (c) if `driftReferenceProvider` is configured, calls it and compares the result against `wallClockNow()` — if the absolute difference exceeds `driftThresholdMs`, invokes `onDriftDetected`.
3. The returned `stop()` function cancels the periodic evaluation interval.
4. The function MUST NOT throw if `driftReferenceProvider` is not configured — drift detection is simply skipped.

REQUIREMENT (CLK-GXP-007a): `setupPeriodicClockEvaluation()` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-GXP-007b): The minimum recommended `intervalMs` for GxP deployments is 60,000ms (60 seconds). Consumers MAY use shorter intervals for higher-criticality deployments. The chosen interval MUST be documented in the CSVP.

REQUIREMENT (CLK-GXP-007c): Each periodic evaluation cycle MUST log its result (pass or fail) with a `TemporalContext` timestamp for audit trail purposes, per CLK-GXP-007 item 3. The logging mechanism is a consumer responsibility — the utility invokes the configured callbacks; the consumer logs the events.

**FM-specific compensating controls:** CLK-GXP-006 and CLK-GXP-007 define the general periodic evaluation mechanism. For FM-specific compensating controls that maintain the FMEA Detection scores for FM-3 through FM-6 when the ecosystem monitoring adapter is not co-deployed, see CLK-GXP-008 in § 6.7 (recovery-procedures.md).

### NTP Configuration Examples (Informative)

The following NTP daemon configuration examples are provided for reference. GxP organizations MUST adapt these to their specific infrastructure, server addresses, and drift thresholds.

#### chrony Configuration (Recommended for Linux)

```ini
# /etc/chrony/chrony.conf — GxP deployment reference configuration
# Adapt server addresses to your organization's NTP infrastructure.

# Primary NTP servers (use at least 3 for redundancy and consensus detection)
server ntp1.example.com iburst prefer
server ntp2.example.com iburst
server ntp3.example.com iburst

# Leap second handling — smear over 24 hours (prevents 1-second jumps in Date.now())
leapsecmode slew
maxslewrate 1000

# Maximum drift threshold — alert if clock drifts beyond 100ms from NTP reference
# Organizations MUST set this to their acceptable drift threshold (CLK-GXP-005)
maxdistance 0.1

# Drift file — chrony stores frequency adjustments here for faster re-sync after reboot
driftfile /var/lib/chrony/drift

# Logging — retain synchronization logs for audit trail (DQ-2 artifact)
log tracking measurements statistics
logdir /var/log/chrony

# Step threshold — allow NTP step corrections only at startup, slew thereafter
# This prevents mid-operation wall-clock jumps
makestep 1.0 3
```

**Verification command (DQ-2):**
```bash
# Verify NTP synchronization before starting the application
chronyc tracking | grep -E "Leap status|System time|RMS offset"
# Expected: "Leap status: Normal", System time offset < 100ms
```

#### ntpd Configuration (Alternative for Systems Without chrony)

```ini
# /etc/ntp.conf — GxP deployment reference configuration

server ntp1.example.com iburst prefer
server ntp2.example.com iburst
server ntp3.example.com iburst

# Leap second smearing
leapsmearinterval 86400

# Drift file
driftfile /var/lib/ntp/drift

# Logging
statsdir /var/log/ntpstats/
statistics loopstats peerstats clockstats
filegen loopstats file loopstats type day enable
```

**Verification command (DQ-2):**
```bash
# Verify NTP synchronization
ntpq -p
# All servers should show reach=377 (8 successful polls) and offset < 100ms
```

REQUIREMENT (CLK-GXP-009): The NTP configuration used in GxP deployments MUST be documented as part of the Deployment Qualification (DQ) evidence. The documentation MUST include: the NTP daemon type and version, server addresses, drift threshold settings, leap second handling configuration, and the verification command output captured before application startup.

### Continuous Monitoring Specification

Beyond the periodic evaluation requirements defined in CLK-GXP-006 and CLK-GXP-007, GxP organizations deploying `@hex-di/clock` in high-criticality environments (pharmaceutical manufacturing, clinical trial data capture) SHOULD implement continuous monitoring with the following capabilities.

#### Monitoring Adapter Interface Contract

When an ecosystem GxP monitoring adapter is deployed, it MUST implement the following minimum monitoring capabilities:

| Capability | Check Interval | Alert Threshold | Alert Channel |
|---|---|---|---|
| **NTP drift detection** | ≤ 60 seconds | Configurable (default: 100ms offset from NTP reference) | Organization's alerting system (CLK-REC-001, L2+) |
| **Adapter identity consistency** | ≤ 60 seconds | `adapterName` differs from validated baseline | L3 alert |
| **Platform API freeze status** | At startup + ≤ 5 minutes | `Object.isFrozen(Date)` or `Object.isFrozen(performance)` returns `false` | L3 alert |
| **Monotonicity heartbeat** | ≤ 30 seconds | `monotonicNow()` returns non-increasing value across consecutive checks | L4 alert |
| **Monitoring self-health** | ≤ 5 minutes | No monitoring heartbeat received within 2× check interval | L3 alert (external watchdog) |

REQUIREMENT (CLK-GXP-010): When continuous monitoring is deployed, the monitoring adapter MUST emit structured log events for each check execution. Each log event MUST include a `TemporalContext` from the monitored clock, the check type, the result (pass/fail), and — for drift checks — the observed drift magnitude.

REQUIREMENT (CLK-GXP-011): Monitoring configuration (check intervals, alert thresholds, alert channels) MUST be documented in the CSVP and treated as a re-qualification trigger when modified (see § 6.3, re-qualification triggers).

#### Security Control Matrix

The following matrix enumerates the security controls applicable to `@hex-di/clock` and its deployment environment, mapping each control to its implementation layer and regulatory basis.

| Control | Implementation Layer | Mechanism | Regulatory Basis |
|---|---|---|---|
| **Platform API anti-tampering** | `@hex-di/clock` (adapter) | Captured API references at construction (IQ-11); `Object.freeze()` on exports (DQ-3/DQ-4) | 21 CFR 11.10(c), EU GMP Annex 11 Section 7.1 |
| **Immutable return values** | `@hex-di/clock` (adapter) | `Object.freeze()` on all returned objects; primitive number returns | ALCOA+ Original |
| **Per-record tamper evidence** | `@hex-di/clock` (utility) | SHA-256 digest via `computeTemporalContextDigest()`, constant-time verification | 21 CFR 11.10(e), ALCOA+ Accurate |
| **Structural irresettability** | `@hex-di/clock` (type system) | No `reset()` on production `SequenceGeneratorPort`; compile-time enforcement | 21 CFR 11.10(d), ALCOA+ Complete |
| **Access control — container graph** | Consumer/deployment | DI container registration restricted to authorized code paths (CLK-PAC-011) | 21 CFR 11.10(d), EU GMP Annex 11 Section 12.1 |
| **Access control — NTP configuration** | Infrastructure | NTP daemon config restricted to Infrastructure Operators (CLK-PAC-012) | 21 CFR 11.10(d) |
| **Access control — version upgrades** | Process/organizational | QA approval required before version change (CLK-PAC-014) | 21 CFR 11.10(k)(2), EU GMP Annex 11 Section 10 |
| **Electronic signature integrity** | `@hex-di/clock` (utility) | `validateSignableTemporalContext()` runtime validation; `Object.freeze()` on signature objects | 21 CFR 11.50, 11.70, 11.100 |
| **Serialization round-trip integrity** | Consumer + `@hex-di/clock` | Pre-persistence and post-deserialization validation (CLK-SIG-017) | 21 CFR 11.70, ALCOA+ Enduring |
| **NTP synchronization** | Infrastructure | NTP daemon configuration with drift thresholds (CLK-GXP-005/009) | EU GMP Annex 11 Section 9, ALCOA+ Contemporaneous |
| **Cryptographic hash integrity** | `@hex-di/clock` (utility) | Platform-native `crypto.createHash('sha256')`; no JavaScript polyfills (IQ-29/IQ-30) | 21 CFR 11.10(e) |
| **Monitoring system health** | Ecosystem monitoring adapter | Self-health watchdog with external alerting (CLK-GXP-010) | EU GMP Annex 11 Section 11 |

REQUIREMENT (CLK-GXP-012): GxP organizations MUST review this security control matrix as part of their initial deployment qualification and document any organization-specific supplementary controls in their CSVP.

### Distributed System Time Synchronization Requirements (ALCOA+ Consistent)

When multiple systems or services using `@hex-di/clock` exchange timestamped data (e.g., microservices architecture, distributed manufacturing execution systems, multi-site clinical trial data aggregation), inter-system time consistency is essential for maintaining ALCOA+ Consistent across the distributed deployment.

`@hex-di/clock` provides per-process temporal ordering via `TemporalContext`. Cross-process and cross-system ordering depends on wall-clock timestamp agreement, which in turn depends on NTP synchronization consistency across all participating systems. The following requirements apply to distributed GxP deployments.

REQUIREMENT (CLK-DTS-001): All systems exchanging `TemporalContext`-stamped data MUST synchronize to the same NTP server pool (or a stratum-1-connected pool with documented inter-pool agreement). Using different, uncoordinated NTP server pools introduces inter-system drift that undermines cross-system event ordering.

REQUIREMENT (CLK-DTS-002): The maximum acceptable inter-system wall-clock drift for GxP distributed deployments MUST be documented in the CSVP. The following thresholds are RECOMMENDED based on use case criticality:

| Use Case | Recommended Max Drift | Rationale |
|---|---|---|
| Real-time manufacturing event correlation | ≤ 100ms | Sub-second event ordering required for batch process sequencing |
| Clinical trial multi-site data aggregation | ≤ 500ms | Events are typically minutes or hours apart; sub-second sufficient |
| Audit trail cross-system reconstruction | ≤ 1000ms (1 second) | Cross-system ordering uses wall-clock as best-effort; sequence numbers provide intra-system authority |
| Regulatory submission timestamp alignment | ≤ 100ms | Regulatory agencies may compare timestamps across submitted datasets |

REQUIREMENT (CLK-DTS-003): GxP organizations MUST implement inter-system NTP drift monitoring. At minimum, each system's NTP offset (as reported by `chronyc tracking` or `ntpq -p`) MUST be recorded at application startup (DQ-2) and periodically during operation (RECOMMENDED: every 5 minutes). If any system's NTP offset exceeds the documented maximum acceptable drift (CLK-DTS-002), an L2 incident MUST be raised per the incident classification matrix (§ 6.7).

REQUIREMENT (CLK-DTS-004): When reconstructing a cross-system audit trail, the reconstruction algorithm MUST:

1. Group entries by system identifier (analogous to `processInstanceId` grouping in § 3.3).
2. Within each system, use `sequenceNumber` as the authoritative ordering (per CLK-ORD-001).
3. Across systems, use `wallClockTimestamp` for best-effort interleaving, acknowledging that wall-clock ordering across systems has precision limited by the inter-system NTP drift.
4. Document the inter-system drift at the time of reconstruction as a confidence indicator on the cross-system ordering.

REQUIREMENT (CLK-DTS-005): Multi-timezone distributed deployments MUST use UTC for all `TemporalContext.wallClockTimestamp` values (this is already guaranteed by the library — `Date.now()` returns UTC epoch). Local timezone information MUST be captured separately per CLK-SIG-012 and the `MultiTimezoneAuditEntry` pattern (§ 6.5, alcoa-mapping.md).

---


