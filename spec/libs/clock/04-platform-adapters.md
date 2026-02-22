# 04 - Platform Adapters

## 4.1 SystemClockAdapter

The default `ClockPort` adapter using platform-native timing APIs.

### Factory

```typescript
interface SystemClockOptions {
  /** Enable GxP mode: enforces platform API freeze verification (ST-4) at startup */
  readonly gxp?: boolean;
}

function createSystemClock(
  options?: SystemClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>;
```

Returns `ok()` with a frozen object implementing both `ClockPort` (timing functions) and `ClockDiagnosticsPort` (source attestation), using the best available platform APIs. Returns `err(ClockStartupError)` if any startup self-test check fails.

When `options.gxp` is `true`, the startup self-test includes ST-4 (platform API freeze verification), which returns `err(ClockStartupError)` if `Date` or `performance` objects are not frozen. This provides runtime enforcement of the anti-tampering requirement from section 4.1, catching misconfigured GxP deployments at the earliest possible point.

### Implementation Strategy

```typescript
// Pseudocode -- actual implementation follows this logic

function createSystemClock(
  options?: SystemClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError> {
  // SEC-1: Capture platform API references at construction time.
  // Storing these references in the closure prevents post-construction
  // tampering of globalThis.performance or globalThis.Date from
  // affecting the adapter's behavior.
  const perf = getPerformance();
  const capturedDateNow = Date.now;

  const monotonicSource = perf ? "performance.now" : "Date.now-clamped";
  const highResSource = perf?.timeOrigin !== undefined ? "performance.timeOrigin+now" : "Date.now";

  const monotonicNow: () => number = perf
    ? () => perf.now()
    : createClampedFallback(capturedDateNow);

  const wallClockNow: () => number = () => capturedDateNow();

  const highResNow: () => number =
    perf?.timeOrigin !== undefined ? () => perf.timeOrigin + perf.now() : () => capturedDateNow();

  const getDiagnostics = () =>
    Object.freeze({
      adapterName: "SystemClockAdapter",
      monotonicSource,
      highResSource,
      platformResolutionMs: undefined, // Measured at startup if resolution sampling is enabled
    });

  // ... startup self-test (returns err() on failure, see below) ...

  return ok(Object.freeze({ monotonicNow, wallClockNow, highResNow, getDiagnostics }));
}
```

### Platform API Capture (GxP Security)

REQUIREMENT (CLK-SYS-001): The `SystemClockAdapter` MUST capture references to `performance.now`, `performance.timeOrigin`, and `Date.now` at adapter construction time (not at call time). These captured references MUST be stored in the closure and used for all subsequent calls. This prevents post-construction tampering of the global `performance` and `Date` objects from affecting the adapter.

Specifically:

1. `Date.now` MUST be captured as `const capturedDateNow = Date.now` at the top of `createSystemClock()`. All call sites (`wallClockNow`, `highResNow` fallback, clamped fallback) MUST use the captured reference.
2. `performance.now` and `performance.timeOrigin` are already captured through the `getPerformance()` call at construction time (via the `perf` closure variable). This pattern MUST be maintained.
3. The `createClampedFallback()` function MUST accept the captured `Date.now` reference as a parameter rather than accessing `Date.now` from the global scope.

**GxP rationale (21 CFR 11.10(c), ALCOA+ Accurate):** An attacker with access to the JavaScript runtime could replace `globalThis.Date.now` or `globalThis.performance` with a malicious implementation that returns manipulated timestamps. By capturing references at construction time, the adapter is immune to runtime-level tampering after initialization. This does not protect against tampering before adapter construction; for pre-construction protection, GxP deployments MUST freeze `Date` and `performance` objects at the application entry point (see requirements below).

REQUIREMENT (CLK-SYS-002) [OPERATIONAL]: In GxP deployments, consumers MUST freeze `Date` and `performance` objects at the application entry point before any `@hex-di/clock` adapter is constructed. This prevents pre-construction tampering of the platform APIs that the adapter captures:

```typescript
// Application entry point -- before any @hex-di/clock import
Object.freeze(Date);
Object.freeze(performance);
```

REQUIREMENT (CLK-SYS-003) [OPERATIONAL]: In GxP deployments, consumers MUST also freeze the module exports of `@hex-di/clock` after initial import to prevent factory function replacement:

```typescript
import * as clock from "@hex-di/clock";
Object.freeze(clock);
```

**Non-GxP deployments:** These freezing steps are RECOMMENDED but not required. They provide defense-in-depth without functional impact.

### Clamped Fallback

When `performance.now()` is unavailable, `monotonicNow()` uses `Date.now()` with a clamping guard:

```typescript
function createClampedFallback(capturedDateNow: () => number): () => number {
  let lastValue = 0;
  return () => {
    const now = capturedDateNow();
    if (now > lastValue) {
      lastValue = now;
    }
    return lastValue;
  };
}
```

REQUIREMENT (CLK-SYS-004): `createClampedFallback` MUST accept the captured `Date.now` reference as a parameter. It MUST NOT access `Date.now` from the global scope directly. This ensures the clamped fallback benefits from the same anti-tampering protection as the rest of the adapter (see Platform API Capture section).

This ensures monotonicity even when `Date.now()` jumps backward due to NTP correction.

**Thread safety:** The clamped fallback is safe within a single JavaScript execution context because the event loop guarantees that the closure body executes atomically (no interleaving within a synchronous function call). This guarantee does NOT extend to Worker Threads: the closure's mutable `lastValue` state is not shared via `SharedArrayBuffer` and each `SystemClockAdapter` instance gets its own independent fallback closure. If multiple workers need monotonic time, each worker MUST create its own `SystemClockAdapter` instance.

REQUIREMENT (CLK-SYS-005): The clamped fallback MUST NOT use shared mutable state (e.g., `SharedArrayBuffer` or module-level variables). All mutable state MUST be scoped to the closure created by `createClampedFallback()`.

REQUIREMENT (CLK-SYS-006): The clamped fallback MUST be used only when `performance` is not available on `globalThis`. The adapter MUST NOT use `Date.now()` for `monotonicNow()` when `performance.now()` is available.

### SystemSequenceGenerator

```typescript
function createSystemSequenceGenerator(): SequenceGeneratorPort;
```

Returns a `SequenceGeneratorPort` backed by a simple integer counter.

```typescript
function createSystemSequenceGenerator(): SequenceGeneratorPort {
  let counter = 0;

  return Object.freeze({
    next: () => {
      if (counter >= Number.MAX_SAFE_INTEGER) {
        return err(createSequenceOverflowError(counter));
      }
      return ok(++counter);
    },
    current: () => counter,
  });
}
```

REQUIREMENT (CLK-SYS-007): The returned object MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-SYS-008): `SystemSequenceGenerator` MUST NOT expose a `reset()` method. The production sequence generator is structurally irresettable. Only `VirtualSequenceGenerator` (in `@hex-di/clock/testing`) provides `reset()` capability. See section 3.1 for the full GxP rationale (21 CFR 11.10(d), ALCOA+ Complete).

### Startup Self-Test (21 CFR 11.10(h))

21 CFR 11.10(h) requires "device checks to determine, as appropriate, the validity of the source of data input or operational instruction." For `@hex-di/clock`, the "devices" are the platform timing APIs (`performance.now()`, `Date.now()`). A startup self-test validates that these APIs return plausible values before the adapter is used for audit-relevant operations.

REQUIREMENT (CLK-SYS-009): `createSystemClock()` MUST perform a startup self-test at construction time. The self-test MUST verify the following conditions and return `err(ClockStartupError)` if any fail:

| Check                                 | Verification                                                                                                               | Rationale                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ST-1: Monotonic non-negativity        | `monotonicNow()` returns a value `>= 0`                                                                                    | A negative monotonic value indicates a broken `performance.now()` implementation.                                                                                                                                                                                                                                                                                                                |
| ST-2: Wall-clock plausibility         | `wallClockNow()` returns a value greater than `1577836800000` (2020-01-01T00:00:00Z)                                       | A wall-clock value before 2020 indicates the system clock is unset or severely misconfigured. The threshold is deliberately conservative (years in the past) to avoid false positives from minor NTP drift.                                                                                                                                                                                      |
| ST-3: Monotonic non-regression        | Two consecutive `monotonicNow()` calls return values where the second is `>=` the first                                    | A regression in consecutive calls indicates a broken monotonic source.                                                                                                                                                                                                                                                                                                                           |
| ST-4: Platform API freeze (GxP mode)  | `Object.isFrozen(Date)` and `Object.isFrozen(globalThis.performance)` both return `true` (when `performance` is available) | Unfrozen platform APIs can be tampered with after adapter construction, undermining the anti-tampering guarantees. Only enforced in GxP mode.                                                                                                                                                                                                                                                    |
| ST-5: High-res/wall-clock consistency | `Math.abs(highResNow() - wallClockNow())` is less than `1000` (1 second)                                                   | A divergence greater than 1 second between `highResNow()` and `wallClockNow()` indicates that `performance.timeOrigin` was captured before NTP synchronization completed, making all `highResNow()` values offset from true UTC. The 1-second threshold is deliberately conservative to avoid false positives from sub-second NTP slew corrections while catching gross `timeOrigin` inaccuracy. |
| ST-6: Monitoring co-deployment (GxP mode) | `getClockGxPMetadata().requiredMonitoringVersion` is checked against the deployed ecosystem monitoring adapter version (if resolvable) | GxP compliance requires ecosystem monitoring infrastructure for periodic integrity verification (EU GMP Annex 11 §11). ST-6 emits a warning to stderr when `requiredMonitoringVersion` is defined but no monitoring adapter is detected or the detected version is below the required minimum. Version comparison MUST use semantic versioning rules: the detected version MUST be equal to or greater than the required version within the same major version (e.g., if `1.2.0` is required, `1.2.1` and `1.3.0` satisfy, but `2.0.0` does not due to potential breaking changes). ST-6 does NOT return `err()` — it is advisory, not blocking — because the monitoring adapter may be registered later in the graph construction sequence. **Advisory-only justification (EU GMP Annex 11 §10):** The monitoring adapter is a separate library in the HexDI ecosystem with its own registration lifecycle. During graph construction, the clock adapter is typically registered before the monitoring adapter. Blocking at ST-6 would prevent valid graph construction sequences where the monitoring adapter registers after the clock. The advisory warning ensures the gap is visible in stderr logs; the DQ checklist (DQ-4) provides the blocking verification that monitoring infrastructure is deployed before GxP production use. |

```typescript
interface ClockStartupError {
  readonly _tag: "ClockStartupError";
  readonly check: "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5";
  readonly message: string;
  readonly observedValue: number;
}
```

```typescript
function createSystemClock(
  options?: SystemClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError> {
  // ... platform API capture ...

  // Startup self-test (21 CFR 11.10(h))
  const m1 = monotonicNow();
  if (m1 < 0) {
    return err(createClockStartupError("ST-1", m1, "monotonicNow() returned negative value"));
  }

  const wall = wallClockNow();
  if (wall <= 1577836800000) {
    return err(
      createClockStartupError(
        "ST-2",
        wall,
        "wallClockNow() returned implausible epoch value (before 2020-01-01)"
      )
    );
  }

  const m2 = monotonicNow();
  if (m2 < m1) {
    return err(createClockStartupError("ST-3", m2, `monotonicNow() regressed from ${m1} to ${m2}`));
  }

  // ST-4: Platform API freeze verification (GxP mode only)
  if (options?.gxp) {
    if (!Object.isFrozen(Date)) {
      return err(
        createClockStartupError(
          "ST-4",
          0,
          "Date object is not frozen. GxP deployments MUST freeze Date at application entry point."
        )
      );
    }
    if (perf && !Object.isFrozen(globalThis.performance)) {
      return err(
        createClockStartupError(
          "ST-4",
          0,
          "performance object is not frozen. GxP deployments MUST freeze performance at application entry point."
        )
      );
    }
  }

  // ST-5: High-res/wall-clock consistency check (performance.timeOrigin drift detection)
  const stHighRes = highResNow();
  const stWall = wallClockNow();
  const divergence = Math.abs(stHighRes - stWall);
  if (divergence > 1000) {
    return err(
      createClockStartupError(
        "ST-5",
        divergence,
        `highResNow() and wallClockNow() diverge by ${divergence}ms (threshold: 1000ms). This indicates performance.timeOrigin was captured before NTP synchronization completed.`
      )
    );
  }

  // ... return ok(frozen adapter) ...
}
```

REQUIREMENT (CLK-SYS-010): `ClockStartupError` MUST be frozen with `Object.freeze()` at construction, consistent with the project's error immutability pattern.

REQUIREMENT (CLK-SYS-011): The self-test MUST run synchronously during `createSystemClock()` before the adapter object is returned. If any check fails, the factory MUST return `err(ClockStartupError)` and MUST NOT return `ok()` with a partially-valid adapter.

REQUIREMENT (CLK-SYS-012): `createClockStartupError` MUST be exported from the main entry point, enabling consumers to match and handle startup failures explicitly.

**GxP rationale (21 CFR 11.10(h)):** Without this self-test, a system with a broken clock (e.g., embedded device with no RTC battery, container with unset system time) could silently produce invalid audit timestamps for the entire application lifetime. The self-test provides fail-fast behavior at the earliest possible point — adapter construction — before any audit-relevant timestamp is generated. Returning `err()` instead of `ok()` forces the consumer to handle the failure explicitly at the type level. This aligns with the GAMP 5 risk classification where `wallClockNow()` and `highResNow()` are rated High Impact: catching platform API issues at startup prevents high-impact failures during operation.

**Non-GxP deployments:** The self-test runs unconditionally. The checks are sufficiently conservative (non-negative monotonic, wall-clock after 2020) that they should never produce false positives on properly configured systems. If a non-GxP deployment encounters a self-test failure, it indicates a genuine platform issue that would affect any timing-dependent code.

**ST-4 GxP mode note:** ST-4 is the only self-test check that is conditional on `options.gxp`. The rationale is that freezing `Date` and `performance` is a GxP-specific operational requirement that non-GxP deployments may legitimately skip. Making ST-4 unconditional would break non-GxP test environments where platform APIs are routinely mocked via reassignment. When `options.gxp` is `false` or `undefined`, ST-4 is skipped silently.

REQUIREMENT (CLK-SYS-013) [OPERATIONAL]: GxP consumers MUST pass `{ gxp: true }` when constructing the `SystemClockAdapter` via `createSystemClock()`. This ensures ST-4 runs automatically in GxP deployments. Ecosystem libraries that manage graph construction on behalf of consumers (e.g., GxP monitoring adapters) SHOULD pass `{ gxp: true }` automatically.

**ST-5 note:** ST-5 runs unconditionally (not GxP-mode-only). A divergence greater than 1 second between `highResNow()` and `wallClockNow()` indicates a genuine platform clock issue (`performance.timeOrigin` captured before NTP synchronization) that affects any code depending on `highResNow()` accuracy, not just GxP deployments. The 1-second threshold is deliberately conservative: sub-second NTP slew corrections are normal and do not trigger ST-5; only gross `timeOrigin` inaccuracy (typically caused by NTP not yet having synchronized at process start) is caught. This check directly mitigates FM-9 (`performance.timeOrigin` drift) in the FMEA risk analysis, reducing its residual risk from Moderate to Low by providing automated startup detection rather than relying solely on operational procedures (DQ-2).

**Self-test scope limitations:** The startup self-test catches gross platform API failures (negative monotonic values, severely misconfigured system clock, broken monotonicity) and GxP configuration issues (unfrozen platform APIs) via `err()` returns, but does NOT detect the following conditions, which are delegated to the ecosystem's GxP monitoring infrastructure:

- **NTP desynchronization** — The self-test does not verify NTP sync status. The wall-clock may be inaccurate by seconds or minutes and still pass ST-2 (which only checks for pre-2020 values). NTP validation is delegated to the ecosystem's monitoring adapter.
- **Monotonic drift** — The self-test verifies non-regression across two consecutive calls but does not detect gradual monotonic drift over time. Long-term drift monitoring is delegated to the ecosystem's monitoring adapter.
- **Resolution degradation** — The self-test does not measure timer resolution. A platform that coarsens `performance.now()` to 100ms would still pass all self-test checks. Resolution verification is delegated to the ecosystem's monitoring adapter.
- **Post-startup leap second events** — The self-test runs once at construction time. Leap second insertions that occur after startup may cause wall-clock anomalies that the self-test cannot detect. Leap second handling depends on NTP daemon configuration (DQ-1 in the Deployment Qualification Checklist, section 6.2).

GxP deployments MUST NOT rely on the startup self-test as the sole validation mechanism. The self-test is a first line of defense; the ecosystem's GxP monitoring infrastructure provides comprehensive ongoing validation.

## 4.2 Platform Detection

### `getPerformance()` Utility

```typescript
function getPerformance(): PerformanceLike | undefined;
```

Safely accesses the `performance` global from `globalThis` with type narrowing.

```typescript
interface PerformanceLike {
  readonly now: () => number;
  readonly timeOrigin?: number;
}
```

**Detection rules:**

1. Check `typeof globalThis.performance !== 'undefined'`.
2. Verify `typeof globalThis.performance.now === 'function'`.
3. If both hold, return the `performance` object cast to `PerformanceLike`.
4. Otherwise, return `undefined`.

REQUIREMENT (CLK-SYS-014): The detection MUST NOT use `try/catch` for control flow. It MUST use `typeof` checks only.

REQUIREMENT (CLK-SYS-015): The detection MUST run once at adapter construction time, not on every `monotonicNow()` call. The result MUST be captured in a closure.

### Platform Compatibility Matrix

**Minimum platform version requirements for GxP deployments:** GxP deployments MUST use Node.js 18 LTS or later. Earlier Node.js versions (14, 16) are end-of-life and no longer receive security patches, making them unsuitable for GxP environments where 21 CFR 11.10(c) requires controls to ensure the integrity of electronic records. For browser deployments, GxP organizations MUST use versions released within the vendor's active support window. Specific minimum versions: Chrome 100+, Firefox 100+, Safari 15+. For Deno and Bun, GxP organizations MUST use the latest stable release at the time of qualification and document the exact version in the computerized system validation plan.

| Platform                          | `performance.now()`       | `performance.timeOrigin` | `Date.now()` | GxP Suitability                             |
| --------------------------------- | ------------------------- | ------------------------ | ------------ | ------------------------------------------- |
| Node.js 18+ LTS                   | Available                 | Available                | Available    | **Suitable** (minimum for GxP)              |
| Node.js 16                        | Available                 | Available                | Available    | **Not Suitable** (EOL, no security patches) |
| Node.js 14                        | Available                 | Available                | Available    | **Not Suitable** (EOL)                      |
| Chrome 100+                       | Available                 | Available                | Available    | **Suitable** (1)                            |
| Firefox 100+                      | Available (may coarsen)   | Available                | Available    | **Suitable** (1)                            |
| Safari 15+                        | Available                 | Available                | Available    | **Suitable** (1)                            |
| Deno 1.0+                         | Available                 | Available                | Available    | **Suitable**                                |
| Bun 1.0+                          | Available                 | Available                | Available    | **Suitable** (pending LTS)                  |
| Cloudflare Workers                | Available (1ms coarsened) | Not available            | Available    | **Suitable (degraded)** (2)                 |
| Vercel Edge Runtime               | Available (1ms coarsened) | Not available            | Available    | **Suitable (degraded)** (2)                 |
| AWS Lambda                        | Available                 | Available                | Available    | **Suitable**                                |
| React Native (via HostClockBridge)| Bridge-provided           | Bridge-provided          | Available    | **Suitable** (3)                            |
| Fastly Compute / WASM             | Host-dependent            | Host-dependent           | Available    | **Suitable (degraded)** (4)                 |
| Air-gapped (GPS/PTP/RTC)          | Available (via host)      | N/A (hardware source)    | Available    | **Suitable** (5)                            |

**GxP suitability notes:**

1. **Suitable (Browsers):** The `SystemClockAdapter` detects `globalThis.crossOriginIsolated` at construction time and reports the actual precision available via `ClockCapabilities.estimatedResolutionMs`. Cross-origin-isolated contexts (`crossOriginIsolated === true`) receive full precision; non-isolated contexts receive coarsened precision (platform-dependent). GxP organizations MUST verify via the OQ protocol (OQ-4) that the observed precision meets their requirements. The `ClockCapabilities.crossOriginIsolated` field documents the deployment context automatically.

2. **Suitable (degraded) (Edge Runtimes):** `performance.timeOrigin` is unavailable on V8 isolate runtimes (Cloudflare Workers, Vercel Edge Runtime). The `EdgeRuntimeClockAdapter` (section 4.8) provides a dedicated adapter where `highResNow()` falls back to `Date.now()` (millisecond precision only). `monotonicNow()` uses `performance.now()` (available but coarsened to 1ms). `ClockCapabilities.highResDegraded` reports `true`. GxP use cases requiring sub-millisecond audit timestamps MUST use a non-edge platform; if millisecond precision is acceptable, a documented risk assessment per EU GMP Annex 11, Section 4 is required.

3. **Suitable (React Native via HostClockBridge):** React Native's Hermes engine lacks `performance.now()` and `performance.timeOrigin`, but the native side provides high-resolution monotonic time (`std::chrono::steady_clock` on C++, `SystemClock.elapsedRealtimeNanos()` on Android, `mach_absolute_time()` on iOS). The `HostClockBridge` interface (section 4.9) enables a thin native module to inject these timing functions into `@hex-di/clock`. GxP suitability depends on the quality of the native bridge implementation — the bridge module MUST be included in the computerized system validation plan.

4. **Suitable (degraded) (WASM / Embedded):** WASM runtimes (Fastly Compute, standalone WASM) and embedded environments use the `HostClockBridge` interface (section 4.9) to inject host-provided timing functions. Capability depends on what the host provides. `ClockCapabilities` reports the actual availability. GxP organizations MUST validate the host-provided timing source accuracy as part of platform qualification.

5. **Suitable (Air-gapped with Hardware Clock):** Air-gapped deployments using the `HardwareClockAdapter` interface (section 4.3) with a GPS-disciplined, PTP-synchronized, or calibrated RTC clock source are GxP-suitable. The hardware clock provides the authoritative wall-clock time source, while `performance.now()` provides monotonic time from the host platform. Requires a native module for hardware clock access. GxP organizations MUST include the hardware clock source in their calibration program per ICH Q7 section 6.5.

### Performance Degradation Detection

The `ClockCapabilities` interface provides runtime reporting of platform timing API degradation. The following mechanisms enable consumers to detect and respond to performance degradation at construction time and during operation.

**Construction-time detection (via ClockCapabilities):**

| Capability Field | Degraded Condition | Detection Method |
|---|---|---|
| `monotonicDegraded` | `true` when `performance.now()` is unavailable and clamped `Date.now()` fallback is active | Consumer checks `getCapabilities().monotonicDegraded` after adapter construction |
| `highResDegraded` | `true` when `performance.timeOrigin` is unavailable and `highResNow()` falls back to `Date.now()` | Consumer checks `getCapabilities().highResDegraded` after adapter construction |
| `estimatedResolutionMs` | Value > 1.0 indicates coarsened timing (e.g., Spectre mitigations in browsers) | Consumer checks `getCapabilities().estimatedResolutionMs` against their precision requirements |
| `crossOriginIsolated` | `false` or `undefined` in browsers indicates reduced precision from Spectre mitigations | Consumer checks for cross-origin isolation state |

**Runtime degradation detection (consumer responsibility):**

For ongoing performance monitoring during operation, GxP consumers SHOULD implement a periodic degradation check:

```typescript
// Example: periodic performance degradation detection (consumer-implemented)
function checkClockHealth(
  clock: ClockPort,
  diagnostics: ClockDiagnosticsPort,
  sampleSize: number = 100
): { meanDeltaMs: number; zeroDeltaRatio: number } {
  const deltas: number[] = [];
  for (let i = 0; i < sampleSize; i++) {
    const a = clock.monotonicNow();
    const b = clock.monotonicNow();
    deltas.push(b - a);
  }
  const meanDelta = deltas.reduce((s, d) => s + d, 0) / sampleSize;
  const zeroDeltaRatio = deltas.filter(d => d === 0).length / sampleSize;
  return { meanDeltaMs: meanDelta, zeroDeltaRatio };
}
```

A `zeroDeltaRatio` above 0.5 indicates that the monotonic source is consistently returning identical values across consecutive calls, suggesting resolution degradation. A `meanDeltaMs` above 1.0 suggests millisecond-level coarsening.

REQUIREMENT (CLK-SYS-017): GxP organizations SHOULD implement periodic performance degradation checks (RECOMMENDED: hourly or at the start of each batch) and alert when `zeroDeltaRatio` exceeds a configurable threshold (RECOMMENDED: 0.9 for browsers, 0.5 for Node.js/Deno/Bun). Degradation alerts SHOULD be classified as L2 incidents per the incident classification matrix (§ 6.7).

REQUIREMENT (CLK-SYS-016): GxP organizations MUST select a platform classified as **Suitable** or **Suitable (degraded)** in the matrix above. Platforms classified as **Suitable (degraded)** require a documented risk assessment confirming that the degraded capabilities (reported via `ClockCapabilities`) meet the specific GxP use case requirements. Platforms classified as **Not Suitable** MUST NOT be used for GxP audit-critical operations without a risk assessment approved by the Quality Assurance unit.

## 4.3 HardwareClockAdapter Interface (Air-Gapped GxP Environments)

Pharmaceutical manufacturing cleanrooms, critical infrastructure facilities, and other air-gapped GxP environments frequently operate without network access and cannot rely on NTP for time synchronization. These deployments use hardware clock sources — GPS-disciplined clocks, PTP (IEEE 1588 Precision Time Protocol) grandmasters, or dedicated RTC (Real-Time Clock) modules with calibrated oscillators — to maintain time accuracy.

`@hex-di/clock` defines a `HardwareClockAdapter` interface that provides a standardized contract for hardware clock source adapters. The interface ensures that custom hardware clock adapters satisfy the same behavioral guarantees as the `SystemClockAdapter` while enabling air-gapped deployments to use authoritative hardware time sources.

### Interface Definition

```typescript
interface HardwareClockAdapterOptions {
  /** Human-readable name for this adapter, used in diagnostics and audit trail (e.g., 'GPS-PPS', 'PTP-GM', 'RTC-OCXO') */
  readonly adapterName: string;
  /** Enable GxP mode: enforces hardware source validation at startup */
  readonly gxp?: boolean;
}

interface HardwareClockAdapter extends ClockPort, ClockDiagnosticsPort {
  /** Returns the hardware clock source status for diagnostic and audit purposes */
  readonly getHardwareStatus: () => HardwareClockStatus;
}

interface HardwareClockStatus {
  /** Whether the hardware clock source is currently locked/synchronized */
  readonly locked: boolean;
  /** Estimated accuracy of the hardware source in milliseconds (e.g., 0.001 for microsecond GPS-PPS) */
  readonly estimatedAccuracyMs: number | undefined;
  /** Hardware source type identifier */
  readonly sourceType: "gps" | "ptp" | "rtc" | "atomic" | "custom";
  /** Last successful synchronization check timestamp (wallClock epoch ms), or undefined if never checked */
  readonly lastSyncCheckAt: number | undefined;
}
```

### Behavioral Contract Requirements

Hardware clock adapters MUST satisfy the following behavioral contracts, analogous to the NC-1 through NC-7 contracts defined for NTP adapters in the ecosystem monitoring adapter specification:

| ID   | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                    | Rationale                                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HC-1 | `monotonicNow()` MUST return non-decreasing values. Hardware clock adapters MUST use the platform's `performance.now()` for monotonic time (not the hardware clock), because hardware clocks provide absolute time but not guaranteed monotonicity across read operations.                                                                                                                                                                     | ALCOA+ Contemporaneous: monotonic ordering must be reliable regardless of hardware clock behavior.                                                                      |
| HC-2 | `wallClockNow()` MUST return values derived from the hardware clock source, not from `Date.now()`. The hardware clock source is the authoritative time reference in air-gapped environments.                                                                                                                                                                                                                                                   | ALCOA+ Accurate: the hardware clock is the calibrated time source; using `Date.now()` would bypass the calibrated source.                                               |
| HC-3 | `highResNow()` MUST combine the hardware clock's absolute time reference with `performance.now()` for sub-millisecond resolution, using the same `origin + monotonic` pattern as the `SystemClockAdapter`.                                                                                                                                                                                                                                     | Consistency with `SystemClockAdapter` behavior; enables the same drift detection (ST-5) at startup.                                                                     |
| HC-4 | `getDiagnostics()` MUST report the `adapterName` from `HardwareClockAdapterOptions` and a `monotonicSource` of `'performance.now'`. The `highResSource` MUST identify the hardware source (e.g., `'gps-pps+performance.now'`).                                                                                                                                                                                                                 | ALCOA+ Attributable: audit trail must identify the clock source unambiguously.                                                                                          |
| HC-5 | The adapter MUST perform a startup self-test equivalent to ST-1 through ST-3 and ST-5 from the `SystemClockAdapter`. ST-4 (platform API freeze) MUST be enforced when `gxp: true`. Additionally, the adapter MUST verify that the hardware clock source is locked/synchronized at startup. If the hardware source is not locked, the adapter MUST return `err(ClockStartupError)` with check `'ST-HW'` and the estimated time since last lock. | 21 CFR 11.10(h): hardware clock device check. Air-gapped clocks that have lost synchronization (e.g., GPS antenna disconnected) must not silently provide drifted time. |
| HC-6 | `getHardwareStatus()` MUST return a frozen `HardwareClockStatus` object reflecting the current hardware clock state. The `locked` field MUST reflect whether the hardware source is currently providing a reliable time reference.                                                                                                                                                                                                             | EU GMP Annex 11 Section 11: periodic evaluation of computerized system validity.                                                                                        |
| HC-7 | The adapter object returned by the factory MUST be frozen with `Object.freeze()`, consistent with all other `@hex-di/clock` adapters.                                                                                                                                                                                                                                                                                                          | ALCOA+ Original: adapter immutability prevents post-construction modification.                                                                                          |

### Implementation Scope

The `HardwareClockAdapter` interface and `HardwareClockStatus` type are defined in `@hex-di/clock` v0.1.0. Concrete adapter implementations (GPS-PPS, PTP, RTC) are **out of scope** for v0.1.0 — they require platform-specific native module integration that varies by deployment environment. The interface definition enables GxP organizations in air-gapped environments to develop custom adapters against a standardized contract with known behavioral requirements.

REQUIREMENT (CLK-SYS-024): `HardwareClockAdapter`, `HardwareClockAdapterOptions`, and `HardwareClockStatus` MUST be exported from the main entry point (`@hex-di/clock`).

REQUIREMENT (CLK-SYS-018): Concrete `HardwareClockAdapter` implementations developed by consumers MUST satisfy all HC-1 through HC-7 behavioral contracts. The IQ protocol MUST be extended to verify these contracts when a hardware adapter is deployed.

REQUIREMENT (CLK-SYS-019) [OPERATIONAL]: GxP organizations deploying hardware clock adapters MUST include the hardware clock source in their calibration and verification program per ICH Q7 section 6.5. The calibration records MUST document the hardware source type, calibration date, measured accuracy, and next calibration due date.

### Platform Integration Guidance

| Hardware Source       | Integration Approach                                                      | Typical Accuracy                                   |
| --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| GPS-PPS (1PPS signal) | Native module reading PPS GPIO interrupt timestamp                        | < 1 microsecond                                    |
| PTP (IEEE 1588)       | Native module reading `CLOCK_REALTIME` from PTP-synchronized kernel clock | < 1 microsecond                                    |
| RTC with OCXO         | Native module reading I2C/SPI RTC register                                | 1-100 milliseconds (depends on oscillator quality) |
| Atomic clock (Rb/Cs)  | Native module reading serial/Ethernet time output                         | < 0.1 microseconds                                 |

**Native module requirement:** All hardware clock integrations require a native Node.js addon (N-API) or equivalent platform-specific module to access hardware timing interfaces. JavaScript alone cannot access GPIO pins, PTP kernel clocks, or I2C/SPI buses. The native module MUST expose a synchronous `readHardwareTime(): number` function returning epoch milliseconds with the best available precision from the hardware source.

## 4.4 Resolution Constraints

### Spectre Mitigation Coarsening

Modern browsers may coarsen `performance.now()` to mitigate Spectre-class timing side-channel attacks:

| Browser | Default Resolution | With `Cross-Origin-Opener-Policy` |
| ------- | ------------------ | --------------------------------- |
| Chrome  | 5 microseconds     | 5 microseconds                    |
| Firefox | 1 millisecond      | 20 microseconds                   |
| Safari  | 100 microseconds   | 100 microseconds                  |

REQUIREMENT (CLK-SYS-020): The `@hex-di/clock` package MUST NOT attempt to circumvent or detect timer coarsening. The coarsened resolution is a platform security decision and MUST be respected.

### Minimum Resolution Guarantee

The `SystemClockAdapter` does NOT guarantee a specific resolution. The resolution depends entirely on the platform.

For GxP environments where a specific resolution is required (e.g., microsecond precision for audit timestamps), resolution verification is performed by the ecosystem's GxP monitoring adapter at startup. The clock package provides the timing; the monitoring adapter validates that the timing meets GxP requirements.

### Sequence Number as Resolution Backstop

When clock resolution is coarsened, multiple events may share the same timestamp. The `SequenceGeneratorPort` provides a resolution backstop: events with identical timestamps can be ordered by their sequence numbers.

REQUIREMENT (CLK-SYS-021): All HexDI packages that record timestamped events SHOULD also record a sequence number from a `SequenceGeneratorPort`. The combination of `(timestamp, sequenceNumber)` provides unambiguous ordering regardless of clock resolution.

## 4.5 Performance Budget

`@hex-di/clock` functions are designed for hot-path usage (audit entry creation, tracing span start/end, HTTP request timing). The overhead introduced by the clock abstraction over raw platform API calls MUST be minimal.

| Function                                  | Raw Platform API                             | Overhead Budget                       | Rationale                                           |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `monotonicNow()`                          | `performance.now()`                          | < 100ns                               | Single closure variable dereference + function call |
| `wallClockNow()`                          | `Date.now()`                                 | < 100ns                               | Single closure variable dereference + function call |
| `highResNow()`                            | `performance.timeOrigin + performance.now()` | < 100ns                               | Two closure dereferences + addition                 |
| `next()`                                  | N/A (no platform equivalent)                 | < 50ns                                | Integer increment + comparison                      |
| `current()`                               | N/A                                          | < 20ns                                | Single variable read                                |
| `getDiagnostics()`                        | N/A                                          | < 500ns                               | Returns pre-constructed frozen object               |
| `createTemporalContextFactory().create()` | N/A                                          | < 300ns above sum of individual calls | `Object.freeze()` + three function calls            |

REQUIREMENT (CLK-SYS-022): The overhead of each `@hex-di/clock` function above the raw platform API call MUST be less than 100 nanoseconds on the reference platform (Node.js 18+ LTS on x86_64). This budget excludes the platform API cost itself — only the abstraction overhead (closure dereference, frozen object construction) is counted.

REQUIREMENT (CLK-SYS-023): PQ-1 (throughput sustainability) MUST verify that these overhead budgets hold under sustained load. If any function exceeds its budget on a specific deployment platform, the deviation MUST be documented with root cause analysis.

**Measurement note:** Nanosecond-level overhead is not directly measurable with `performance.now()` (which has microsecond resolution at best). Overhead budgets are verified indirectly via PQ-1 throughput testing: if `monotonicNow()` sustains > 10 million ops/sec, the per-call overhead is < 100ns. The PQ protocol (section 6.2) defines the throughput thresholds.

## 4.6 SystemTimerScheduler

The default `TimerSchedulerPort` adapter using platform-native timer APIs.

### Factory

```typescript
function createSystemTimerScheduler(): TimerSchedulerPort;
```

Returns a frozen object implementing `TimerSchedulerPort` using platform `setTimeout`, `setInterval`, `clearTimeout`, and `clearInterval`.

### Implementation Strategy

```typescript
function createSystemTimerScheduler(): TimerSchedulerPort {
  // SEC-2: Capture platform timer API references at construction time.
  // Same anti-tampering pattern as SystemClockAdapter (SEC-1).
  const capturedSetTimeout = globalThis.setTimeout;
  const capturedSetInterval = globalThis.setInterval;
  const capturedClearTimeout = globalThis.clearTimeout;
  const capturedClearInterval = globalThis.clearInterval;

  let nextId = 1;
  const handleMap = new Map<number, ReturnType<typeof capturedSetTimeout>>();

  const createHandle = (platformId: ReturnType<typeof capturedSetTimeout>): TimerHandle => {
    const id = nextId++;
    handleMap.set(id, platformId);
    return Object.freeze({ _tag: "TimerHandle" as const, id });
  };

  return Object.freeze({
    setTimeout: (callback: () => void, ms: number): TimerHandle => {
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      if (!Number.isFinite(ms) || ms < 0) throw new TypeError("ms must be a non-negative finite number");
      const platformId = capturedSetTimeout(() => {
        handleMap.delete(handle.id);
        callback();
      }, ms);
      const handle = createHandle(platformId);
      return handle;
    },
    setInterval: (callback: () => void, ms: number): TimerHandle => {
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      if (!Number.isFinite(ms) || ms <= 0) throw new TypeError("ms must be a positive finite number");
      const platformId = capturedSetInterval(callback, ms);
      return createHandle(platformId);
    },
    clearTimeout: (handle: TimerHandle): void => {
      const platformId = handleMap.get(handle.id);
      if (platformId !== undefined) {
        capturedClearTimeout(platformId);
        handleMap.delete(handle.id);
      }
    },
    clearInterval: (handle: TimerHandle): void => {
      const platformId = handleMap.get(handle.id);
      if (platformId !== undefined) {
        capturedClearInterval(platformId);
        handleMap.delete(handle.id);
      }
    },
    sleep: (ms: number): Promise<void> => {
      if (!Number.isFinite(ms) || ms < 0) throw new TypeError("ms must be a non-negative finite number");
      return new Promise(resolve => {
        capturedSetTimeout(resolve, ms);
      });
    },
  });
}
```

### Platform API Capture (Anti-Tampering)

REQUIREMENT (CLK-TMR-007): `createSystemTimerScheduler()` MUST capture references to `globalThis.setTimeout`, `globalThis.setInterval`, `globalThis.clearTimeout`, and `globalThis.clearInterval` at construction time. All subsequent calls MUST use the captured references. This follows the same anti-tampering pattern as `SystemClockAdapter` (SEC-1).

REQUIREMENT (CLK-TMR-008): The returned `TimerSchedulerPort` object MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-TMR-009): Each `TimerHandle` MUST be frozen with `Object.freeze()` at creation.

REQUIREMENT (CLK-TMR-010): `createSystemTimerScheduler` MUST be exported from the `@hex-di/clock` main entry point.

## 4.7 SystemCachedClock

The default `CachedClockAdapter` using a background `setInterval` to periodically update cached values from a `ClockPort` source.

### Factory

```typescript
interface CachedClockOptions {
  /** The source clock to cache values from. */
  readonly source: ClockPort;
  /** Update interval in milliseconds. Default: 1. */
  readonly updateIntervalMs?: number;
}

function createCachedClock(options: CachedClockOptions): CachedClockAdapter;
```

REQUIREMENT (CLK-CAC-006): `createCachedClock` MUST accept a `ClockPort` as the `source` parameter. It MUST NOT accept a `CachedClockPort` (no nested caching).

REQUIREMENT (CLK-CAC-007): `updateIntervalMs` MUST default to `1` (millisecond). Values less than or equal to `0`, `NaN`, or `Infinity` MUST throw `TypeError`.

### Lifecycle Behavior

- **`start()`**: Begins the background `setInterval` that reads `source.monotonicNow()` and `source.wallClockNow()` and stores the results. Calling `start()` when already running is a no-op.
- **`stop()`**: Clears the background interval. Calling `stop()` when already stopped is a no-op.
- **`isRunning()`**: Returns `true` if the background updater is active, `false` otherwise.

Before `start()` is called, `recentMonotonicNow()` and `recentWallClockNow()` return the initial values captured at construction time (a single synchronous read of the source clock).

REQUIREMENT (CLK-CAC-008): The cached clock MUST perform one synchronous read of the source at construction time, so that `recentMonotonicNow()` and `recentWallClockNow()` return valid values even before `start()` is called.

REQUIREMENT (CLK-CAC-009): The `CachedClockAdapter` object returned by `createCachedClock` MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-CAC-010): `createCachedClock` MUST be exported from the `@hex-di/clock` main entry point.

## 4.8 EdgeRuntimeClockAdapter

V8 isolate-based edge runtimes (Cloudflare Workers, Vercel Edge Runtime, Deno Deploy) share a common limitation: `performance.timeOrigin` is unavailable while `performance.now()` is available but coarsened (typically to 1ms). The `EdgeRuntimeClockAdapter` provides a dedicated adapter that makes these trade-offs explicit rather than silently falling through the `SystemClockAdapter`'s fallback paths.

### Factory

```typescript
interface EdgeRuntimeClockOptions {
  /** Enable GxP mode: enforces platform API freeze verification (ST-4) at startup */
  readonly gxp?: boolean;
}

function createEdgeRuntimeClock(
  options?: EdgeRuntimeClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>;
```

Returns `ok()` with a frozen object implementing `ClockPort` and `ClockDiagnosticsPort`. Returns `err(ClockStartupError)` if startup self-tests fail.

### Implementation Strategy

```typescript
function createEdgeRuntimeClock(
  options?: EdgeRuntimeClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError> {
  // Capture platform APIs at construction (same anti-tampering as SystemClockAdapter)
  const perf = getPerformance();
  const capturedDateNow = Date.now;

  // Edge runtimes have performance.now() but NOT performance.timeOrigin
  const monotonicNow = perf
    ? () => perf.now()
    : createClampedFallback(capturedDateNow);

  const wallClockNow = () => capturedDateNow();

  // highResNow degrades to Date.now() — no timeOrigin available
  const highResNow = () => capturedDateNow();

  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: perf !== undefined,
    hasHighResOrigin: false,
    crossOriginIsolated: undefined,
    estimatedResolutionMs: 1.0,
    platform: "edge-worker" as const,
    highResDegraded: true,
    monotonicDegraded: perf === undefined,
  });

  const getDiagnostics = () =>
    Object.freeze({
      adapterName: "EdgeRuntimeClockAdapter",
      monotonicSource: perf ? "performance.now" : "Date.now-clamped",
      highResSource: "Date.now",
      platformResolutionMs: 1.0,
    });

  const getCapabilities = () => capabilities;

  // Startup self-tests: ST-1, ST-2, ST-3 (ST-4 if GxP, ST-5 skipped — no timeOrigin)
  // ... same as SystemClockAdapter but ST-5 is skipped because highResNow === wallClockNow ...

  return ok(
    Object.freeze({ monotonicNow, wallClockNow, highResNow, getDiagnostics, getCapabilities })
  );
}
```

### Behavioral Differences from SystemClockAdapter

| Aspect | SystemClockAdapter | EdgeRuntimeClockAdapter |
|---|---|---|
| `monotonicNow()` | `performance.now()` | `performance.now()` (coarsened to 1ms) |
| `wallClockNow()` | `Date.now()` | `Date.now()` |
| `highResNow()` | `performance.timeOrigin + performance.now()` | `Date.now()` (degraded — no sub-ms) |
| ST-5 (highRes/wallClock consistency) | Runs | **Skipped** (highRes === wallClock by design) |
| `ClockCapabilities.highResDegraded` | `false` | `true` |
| `ClockDiagnostics.highResSource` | `'performance.timeOrigin+now'` | `'Date.now'` |

### Startup Self-Test Differences

The `EdgeRuntimeClockAdapter` runs ST-1, ST-2, ST-3, and ST-4 (if GxP mode) but **skips ST-5**. ST-5 compares `highResNow()` against `wallClockNow()` to detect `performance.timeOrigin` drift. Since the edge adapter's `highResNow()` is `Date.now()` by design, the two are always identical — ST-5 would always pass trivially and provides no diagnostic value.

REQUIREMENT (CLK-EDGE-001): `createEdgeRuntimeClock` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-EDGE-002): The `EdgeRuntimeClockAdapter` MUST capture platform API references at construction time (same anti-tampering pattern as `SystemClockAdapter` SEC-1).

REQUIREMENT (CLK-EDGE-003): The `EdgeRuntimeClockAdapter` MUST skip ST-5 during startup self-test. It MUST run ST-1, ST-2, ST-3, and ST-4 (when `gxp: true`).

REQUIREMENT (CLK-EDGE-004): `ClockDiagnostics.adapterName` MUST be `'EdgeRuntimeClockAdapter'`.

REQUIREMENT (CLK-EDGE-005): `ClockDiagnostics.highResSource` MUST be `'Date.now'` (documenting the degradation).

REQUIREMENT (CLK-EDGE-006): `ClockCapabilities.highResDegraded` MUST be `true`.

REQUIREMENT (CLK-EDGE-007): `ClockCapabilities.platform` MUST be `'edge-worker'`.

REQUIREMENT (CLK-EDGE-008): The returned adapter object MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-EDGE-009): `EdgeRuntimeClockOptions` MUST be exported as a type from the `@hex-di/clock` main entry point.

## 4.9 HostClockBridge (React Native, WASM, Embedded)

Platforms where JavaScript timing APIs are unavailable or insufficient — React Native (Hermes), standalone WASM, and embedded environments — can still use `@hex-di/clock` by injecting host-provided timing functions through the `HostClockBridge` interface.

This is a generalization of the `HardwareClockAdapter` pattern (section 4.3): instead of requiring a full hardware clock contract with GxP-specific status reporting, `HostClockBridge` is a lightweight interface for injecting raw time functions from any host environment.

### HostClockBridge Interface

```typescript
interface HostClockBridge {
  /** Returns monotonic time in milliseconds (e.g., from std::chrono::steady_clock, SystemClock.elapsedRealtimeNanos, mach_absolute_time) */
  readonly monotonicNowMs: () => number;
  /** Returns wall-clock epoch time in milliseconds (e.g., from std::chrono::system_clock, System.currentTimeMillis) */
  readonly wallClockNowMs: () => number;
  /** Optional: returns high-resolution epoch time in milliseconds. Falls back to wallClockNowMs if not provided. */
  readonly highResNowMs?: () => number;
}
```

### Factory

```typescript
interface HostBridgeClockOptions {
  /** Human-readable adapter name for diagnostics (e.g., 'ReactNativeBridge', 'WasmHostBridge') */
  readonly adapterName: string;
  /** Platform identifier for ClockCapabilities */
  readonly platform: "react-native" | "wasm" | "unknown";
  /** Enable GxP mode */
  readonly gxp?: boolean;
}

function createHostBridgeClock(
  bridge: HostClockBridge,
  options: HostBridgeClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>;
```

Returns `ok()` with a frozen adapter wrapping the bridge functions. Returns `err(ClockStartupError)` if startup self-tests fail.

### Implementation Strategy

```typescript
function createHostBridgeClock(
  bridge: HostClockBridge,
  options: HostBridgeClockOptions
): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError> {
  // Capture bridge functions at construction time (same anti-tampering rationale as SEC-1)
  const capturedMonotonic = bridge.monotonicNowMs;
  const capturedWallClock = bridge.wallClockNowMs;
  const capturedHighRes = bridge.highResNowMs ?? bridge.wallClockNowMs;

  const monotonicNow = () => capturedMonotonic();
  const wallClockNow = () => capturedWallClock();
  const highResNow = () => capturedHighRes();

  const hasHighRes = bridge.highResNowMs !== undefined;

  const capabilities: ClockCapabilities = Object.freeze({
    hasMonotonicTime: true,
    hasHighResOrigin: hasHighRes,
    crossOriginIsolated: undefined,
    estimatedResolutionMs: hasHighRes ? 0.001 : 1.0,
    platform: options.platform,
    highResDegraded: !hasHighRes,
    monotonicDegraded: false,
  });

  const getDiagnostics = () =>
    Object.freeze({
      adapterName: options.adapterName,
      monotonicSource: "host-bridge",
      highResSource: hasHighRes ? "host-bridge" : "host-bridge-wallclock",
      platformResolutionMs: capabilities.estimatedResolutionMs,
    });

  const getCapabilities = () => capabilities;

  // Startup self-tests: ST-1, ST-2, ST-3 run against bridge functions.
  // ST-4 (platform API freeze) when GxP mode — freezes bridge object instead of Date/performance.
  // ST-5 runs only when highResNowMs is provided (otherwise highRes === wallClock).

  return ok(
    Object.freeze({ monotonicNow, wallClockNow, highResNow, getDiagnostics, getCapabilities })
  );
}
```

### React Native Integration Example

A minimal React Native native module exposing monotonic time:

**Android (Kotlin):**

```kotlin
@ReactMethod(isBlockingSynchronousMethod = true)
fun monotonicNowMs(): Double {
    return SystemClock.elapsedRealtimeNanos().toDouble() / 1_000_000.0
}
```

**iOS (Swift):**

```swift
@objc func monotonicNowMs() -> NSNumber {
    var info = mach_timebase_info_data_t()
    mach_timebase_info(&info)
    let nanos = mach_absolute_time() * UInt64(info.numer) / UInt64(info.denom)
    return NSNumber(value: Double(nanos) / 1_000_000.0)
}
```

**JavaScript bridge setup:**

```typescript
import { NativeModules } from "react-native";
import { createHostBridgeClock } from "@hex-di/clock";

const { ClockModule } = NativeModules;

const bridge: HostClockBridge = {
  monotonicNowMs: () => ClockModule.monotonicNowMs(),
  wallClockNowMs: () => Date.now(),
};

const clockResult = createHostBridgeClock(bridge, {
  adapterName: "ReactNativeBridge",
  platform: "react-native",
});
```

### WASM Integration Example

```typescript
import { createHostBridgeClock } from "@hex-di/clock";

// Host provides timing functions via WASM imports
declare const hostMonotonicMs: () => number;
declare const hostWallClockMs: () => number;

const bridge: HostClockBridge = {
  monotonicNowMs: hostMonotonicMs,
  wallClockNowMs: hostWallClockMs,
};

const clockResult = createHostBridgeClock(bridge, {
  adapterName: "WasmHostBridge",
  platform: "wasm",
});
```

### Behavioral Contract Requirements

| ID | Requirement | Rationale |
|---|---|---|
| HB-1 | `monotonicNowMs` MUST return non-decreasing values. The bridge implementor is responsible for sourcing monotonic time from the host platform. | ALCOA+ Contemporaneous: monotonic ordering must be reliable. |
| HB-2 | `wallClockNowMs` MUST return epoch milliseconds consistent with UTC. | ALCOA+ Accurate: wall-clock time must be traceable to UTC. |
| HB-3 | `highResNowMs` (when provided) MUST return epoch milliseconds with sub-millisecond precision. | Consistency with SystemClockAdapter highResNow() behavior. |
| HB-4 | All bridge functions MUST be synchronous. Asynchronous bridge calls would violate the `ClockPort` synchronous contract. | ClockPort contract: all methods are synchronous. |
| HB-5 | The `createHostBridgeClock` factory MUST capture bridge function references at construction time (stored in closure). | Anti-tampering (SEC-1 pattern). |
| HB-6 | The returned adapter MUST be frozen with `Object.freeze()`. | ALCOA+ Original: adapter immutability. |

### Startup Self-Test Adaptations

| Check | SystemClockAdapter | HostClockBridge Adapter |
|---|---|---|
| ST-1 (monotonic non-negative) | Runs against `performance.now()` | Runs against `bridge.monotonicNowMs()` |
| ST-2 (wall-clock plausibility) | Runs against `Date.now()` | Runs against `bridge.wallClockNowMs()` |
| ST-3 (monotonic non-regression) | Runs against `performance.now()` | Runs against `bridge.monotonicNowMs()` |
| ST-4 (platform API freeze, GxP) | Checks `Object.isFrozen(Date)` and `Object.isFrozen(performance)` | Checks `Object.isFrozen(bridge)` — the bridge object itself MUST be frozen in GxP deployments |
| ST-5 (highRes/wallClock consistency) | Always runs | Runs only when `bridge.highResNowMs` is provided |

REQUIREMENT (CLK-HB-001): `HostClockBridge`, `HostBridgeClockOptions` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-HB-002): `createHostBridgeClock` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-HB-003): `createHostBridgeClock` MUST validate that `bridge.monotonicNowMs` and `bridge.wallClockNowMs` are functions at construction time. If either is not a function, it MUST throw `TypeError`.

REQUIREMENT (CLK-HB-004): When `bridge.highResNowMs` is `undefined`, `highResNow()` MUST fall back to `bridge.wallClockNowMs()`. `ClockCapabilities.highResDegraded` MUST be `true` in this case.

REQUIREMENT (CLK-HB-005): `ClockDiagnostics.monotonicSource` MUST be `'host-bridge'` for all `HostClockBridge`-backed adapters.

REQUIREMENT (CLK-HB-006): `ClockDiagnostics.highResSource` MUST be `'host-bridge'` when `bridge.highResNowMs` is provided, and `'host-bridge-wallclock'` when it falls back to `bridge.wallClockNowMs`.

REQUIREMENT (CLK-HB-007): ST-4 in GxP mode MUST check `Object.isFrozen(bridge)` instead of `Object.isFrozen(Date)` and `Object.isFrozen(performance)`. The bridge object is the trust boundary for host-provided adapters.

REQUIREMENT (CLK-HB-008) [OPERATIONAL]: Consumers building `HostClockBridge` implementations for GxP environments MUST freeze the bridge object before passing it to `createHostBridgeClock`:

```typescript
const bridge = Object.freeze({
  monotonicNowMs: () => ClockModule.monotonicNowMs(),
  wallClockNowMs: () => Date.now(),
});
```

REQUIREMENT (CLK-HB-009) [OPERATIONAL]: GxP organizations using `HostClockBridge` MUST include the native bridge module in their computerized system validation plan. The bridge module MUST be qualified independently (IQ/OQ) for timing accuracy and monotonicity on the target platform.

## 4.10 Benchmark Specification

Section 4.5 defines overhead budgets in nanoseconds. This section specifies the benchmark suite that validates those budgets and tracks performance across releases.

### Benchmark Suite

All benchmarks use Vitest bench mode (`vitest bench`) with the following configuration:

```typescript
// vitest.bench.config.ts
export default defineConfig({
  test: {
    benchmark: {
      include: ["tests/benchmarks/**/*.bench.ts"],
      outputFile: "reports/benchmark/results.json",
    },
  },
});
```

### Core Benchmarks

| Benchmark | Target | Floor (ops/sec) | What It Validates |
|-----------|--------|-----------------|-------------------|
| `monotonicNow` | `clock.monotonicNow()` | 10,000,000 | CLK-SYS-022: < 100ns overhead |
| `wallClockNow` | `clock.wallClockNow()` | 10,000,000 | CLK-SYS-022: < 100ns overhead |
| `highResNow` | `clock.highResNow()` | 10,000,000 | CLK-SYS-022: < 100ns overhead |
| `sequenceNext` | `seq.next()` | 20,000,000 | < 50ns overhead |
| `sequenceCurrent` | `seq.current()` | 50,000,000 | < 20ns overhead |
| `temporalContextCreate` | `factory.create()` | 3,000,000 | < 300ns above component calls |
| `getDiagnostics` | `diagnostics.getDiagnostics()` | 2,000,000 | < 500ns (frozen object return) |

**Floor derivation:** If per-call overhead is < N ns, then ops/sec > 1e9/N. For 100ns: > 10M ops/sec. The floor is set at the theoretical minimum to fail the benchmark when overhead exceeds the budget.

### Comparative Benchmarks (Abstraction Overhead)

These benchmarks measure the abstraction overhead by comparing `@hex-di/clock` calls against raw platform API calls:

| Benchmark | Clock Call | Raw Baseline | Max Overhead Ratio |
|-----------|-----------|--------------|-------------------|
| `monotonicNow vs performance.now` | `clock.monotonicNow()` | `performance.now()` | 1.5x |
| `wallClockNow vs Date.now` | `clock.wallClockNow()` | `Date.now()` | 1.5x |
| `highResNow vs timeOrigin+now` | `clock.highResNow()` | `performance.timeOrigin + performance.now()` | 1.5x |

A ratio above 1.5x indicates the abstraction overhead is significant enough to warrant investigation.

### Memory Benchmarks

| Benchmark | Operation | Max Allocation |
|-----------|-----------|----------------|
| `systemClock creation` | `createSystemClock()` | < 2 KB |
| `sequenceGenerator creation` | `createSystemSequenceGenerator()` | < 512 bytes |
| `temporalContext creation` | `factory.create()` | < 256 bytes per context |
| `virtualClock creation` | `createVirtualClock()` | < 2 KB |

### Benchmark File Map

```
tests/benchmarks/
  clock-reads.bench.ts           # monotonicNow, wallClockNow, highResNow
  sequence-generator.bench.ts    # next, current
  temporal-context.bench.ts      # factory.create
  abstraction-overhead.bench.ts  # clock vs raw platform API
  memory-overhead.bench.ts       # allocation measurement
  cached-clock.bench.ts          # recentMonotonicNow vs monotonicNow throughput
```

### CI Integration

REQUIREMENT (CLK-PERF-001): The benchmark suite MUST run on every PR targeting `main` with results stored as CI artifacts. Benchmark results MUST be compared against the previous `main` baseline.

REQUIREMENT (CLK-PERF-002): A PR MUST fail CI if any core benchmark drops below its floor ops/sec threshold. This prevents performance regressions from being merged.

REQUIREMENT (CLK-PERF-003): A PR MUST produce a CI warning (not failure) if any comparative benchmark exceeds its max overhead ratio threshold. Ratio violations require manual review but are not blocking.

REQUIREMENT (CLK-PERF-004): The benchmark reference platform is Node.js LTS (latest) on x86_64 Linux (CI runner). Results on other platforms are informational.

REQUIREMENT (CLK-PERF-005): Benchmark results MUST be stored in `reports/benchmark/results.json` in the benchmark output format supported by Vitest. Historical results MUST be tracked in CI for trend analysis.
