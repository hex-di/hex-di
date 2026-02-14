# Clock Source Requirements

## 6.1 Clock Source Requirements

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

REQUIREMENT: GxP organizations MUST include this risk classification in their computerized system validation plan. The validation plan MUST allocate testing effort proportional to the risk level of each function.

### Out-of-Scope (Delegated to `@hex-di/guard`)

| Control                        | Description                                       | Where Addressed       |
| ------------------------------ | ------------------------------------------------- | --------------------- |
| NTP synchronization validation | Verifying clock is NTP-synced                     | Guard spec section 62 |
| Clock resolution verification  | Asserting minimum resolution for audit timestamps | Guard spec section 62 |
| Clock drift detection          | Detecting and alerting on excessive clock drift   | Guard spec section 62 |
| Cryptographic timestamps       | SHA-256 signed timestamps for audit trails        | Guard spec section 61 |
| Fail-fast for GxP mode         | Blocking startup when clock requirements unmet    | Guard spec section 62 |

### Responsibility Boundary

`@hex-di/clock` provides the **mechanism** (injectable clock and sequence ports). `@hex-di/guard` provides the **policy** (which clock sources are acceptable, what resolution is required, when to fail). This separation follows the hexagonal architecture principle: the port defines the contract, the adapter provides the implementation, and the guard validates the implementation meets regulatory requirements.

### NTP Synchronization Boundary

Wall-clock timestamps in GxP audit trails must reflect actual calendar time to satisfy the ALCOA+ Contemporaneous principle. `Date.now()` and `performance.timeOrigin` depend on the system clock, which must be NTP-synchronized.

`@hex-di/clock` does NOT verify NTP synchronization. It provides the injectable port that enables an NTP-aware adapter to be used:

```
+-----------------+     +-------------------+     +------------------+
| Consumer code   |---->| ClockPort (port)  |<----| NtpClockAdapter  |
| (HTTP client,   |     | (interface only)  |     | (guard-provided) |
| tracing, etc.)  |     +-------------------+     +------------------+
+-----------------+            ^                          |
                               |                          v
                        +-------------------+     +------------------+
                        | SystemClockAdapter|     | NTP Server       |
                        | (default, no NTP) |     | (external)       |
                        +-------------------+     +------------------+
```

In non-GxP deployments, `SystemClockAdapter` is used (no NTP verification).
In GxP deployments, the guard replaces it with an NTP-aware adapter.

The NTP adapter interface contract (NC-1 through NC-7), third-party adapter compatibility requirements, and the NTP drift monitoring interface are defined in the guard specification: `spec/guard/17-gxp-compliance/03-clock-synchronization.md` (section "NTP Adapter Interface Contract").

REQUIREMENT: `@hex-di/clock` MUST NOT import or reference `@hex-di/guard`. The dependency is unidirectional: guard depends on clock, never the reverse.

### Clock Source Provenance

`ClockPort` intentionally returns raw `number` values with no embedded metadata about which adapter produced them. Source identification is available through the standard HexDI container graph inspection infrastructure: consumers can query which adapter is registered for `ClockPort` at any time.

When `@hex-di/guard` is deployed, runtime drift diagnostics are available through the guard's health check API. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

**Design rationale:** Keeping `ClockPort` minimal (three functions returning numbers) ensures maximum composability and zero overhead. Adding provenance metadata to every call would violate the single-responsibility principle and introduce allocation costs on a hot path.

### ClockDiagnosticsPort

To satisfy 21 CFR 11.10(e) audit trail provenance requirements without polluting the hot-path `ClockPort` interface, `@hex-di/clock` provides a separate `ClockDiagnosticsPort` for clock source attestation and runtime diagnostics.

```typescript
interface ClockDiagnostics {
  readonly adapterName: string;
  readonly monotonicSource: "performance.now" | "Date.now-clamped";
  readonly highResSource: "performance.timeOrigin+now" | "Date.now";
  readonly platformResolutionMs: number | undefined;
}

interface ClockDiagnosticsPort {
  readonly getDiagnostics: () => ClockDiagnostics;
}
```

```typescript
const ClockDiagnosticsPort = createPort<ClockDiagnosticsPort>("ClockDiagnosticsPort");
```

**Semantic contract:**

- `adapterName` MUST be a human-readable identifier for the active clock adapter (e.g., `'SystemClockAdapter'`, `'NtpClockAdapter'`, `'VirtualClockAdapter'`).
- `monotonicSource` MUST indicate which platform API backs `monotonicNow()`.
- `highResSource` MUST indicate which platform API backs `highResNow()`.
- `platformResolutionMs` SHOULD report the observed minimum non-zero delta from a startup sample, or `undefined` if not measured.
- The returned `ClockDiagnostics` object MUST be frozen with `Object.freeze()`.

**GxP rationale (21 CFR 11.10(e), ALCOA+ Attributable):** Auditors reviewing timestamped records need to determine the trustworthiness of the clock source. `ClockDiagnosticsPort` provides this attestation at any point during application lifetime without requiring access to the DI container's internal graph. Consumers (including `@hex-di/guard` when deployed) can query diagnostics at startup.

REQUIREMENT: `createSystemClock()` MUST also return a `ClockDiagnosticsPort`-compatible diagnostics function. The `provideSystemClock()` helper MUST register both `ClockPort` and `ClockDiagnosticsPort` in the container graph.

REQUIREMENT: When any adapter replaces `SystemClockAdapter`, the new adapter MUST also register its own `ClockDiagnosticsPort` implementation reporting its adapter name and platform source information.

### Calibration and Verification

21 CFR 211.68 requires routine calibration of automatic equipment used in production. For `@hex-di/clock`, calibration applies at two levels:

1. **Platform timer calibration** is an OS-level operational concern. The system clock is calibrated via NTP daemon synchronization. `@hex-di/clock` does not perform calibration itself — it reads whatever the OS provides.
2. **Application-level calibration verification** is provided by periodic drift checking against an NTP reference. In HexDI, this is `@hex-di/guard`'s responsibility. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

`@hex-di/clock` satisfies 21 CFR 211.68 by providing an injectable, verifiable, and testable clock abstraction. The injectability enables the guard to wrap and monitor the clock; the testability enables IQ/OQ validation with `VirtualClockAdapter`.

REQUIREMENT: GxP organizations MUST document their NTP configuration (server addresses, sync interval, drift thresholds) in their computerized system validation plan. This documentation is outside the scope of `@hex-di/clock` but is necessary for regulatory compliance.
