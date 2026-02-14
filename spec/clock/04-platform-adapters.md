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

REQUIREMENT: The `SystemClockAdapter` MUST capture references to `performance.now`, `performance.timeOrigin`, and `Date.now` at adapter construction time (not at call time). These captured references MUST be stored in the closure and used for all subsequent calls. This prevents post-construction tampering of the global `performance` and `Date` objects from affecting the adapter.

Specifically:

1. `Date.now` MUST be captured as `const capturedDateNow = Date.now` at the top of `createSystemClock()`. All call sites (`wallClockNow`, `highResNow` fallback, clamped fallback) MUST use the captured reference.
2. `performance.now` and `performance.timeOrigin` are already captured through the `getPerformance()` call at construction time (via the `perf` closure variable). This pattern MUST be maintained.
3. The `createClampedFallback()` function MUST accept the captured `Date.now` reference as a parameter rather than accessing `Date.now` from the global scope.

**GxP rationale (21 CFR 11.10(c), ALCOA+ Accurate):** An attacker with access to the JavaScript runtime could replace `globalThis.Date.now` or `globalThis.performance` with a malicious implementation that returns manipulated timestamps. By capturing references at construction time, the adapter is immune to runtime-level tampering after initialization. This does not protect against tampering before adapter construction; for pre-construction protection, GxP deployments MUST freeze `Date` and `performance` objects at the application entry point (see requirements below).

REQUIREMENT: In GxP deployments, consumers MUST freeze `Date` and `performance` objects at the application entry point before any `@hex-di/clock` adapter is constructed. This prevents pre-construction tampering of the platform APIs that the adapter captures:

```typescript
// Application entry point -- before any @hex-di/clock import
Object.freeze(Date);
Object.freeze(performance);
```

REQUIREMENT: In GxP deployments, consumers MUST also freeze the module exports of `@hex-di/clock` after initial import to prevent factory function replacement:

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

REQUIREMENT: `createClampedFallback` MUST accept the captured `Date.now` reference as a parameter. It MUST NOT access `Date.now` from the global scope directly. This ensures the clamped fallback benefits from the same anti-tampering protection as the rest of the adapter (see Platform API Capture section).

This ensures monotonicity even when `Date.now()` jumps backward due to NTP correction.

**Thread safety:** The clamped fallback is safe within a single JavaScript execution context because the event loop guarantees that the closure body executes atomically (no interleaving within a synchronous function call). This guarantee does NOT extend to Worker Threads: the closure's mutable `lastValue` state is not shared via `SharedArrayBuffer` and each `SystemClockAdapter` instance gets its own independent fallback closure. If multiple workers need monotonic time, each worker MUST create its own `SystemClockAdapter` instance.

REQUIREMENT: The clamped fallback MUST NOT use shared mutable state (e.g., `SharedArrayBuffer` or module-level variables). All mutable state MUST be scoped to the closure created by `createClampedFallback()`.

REQUIREMENT: The clamped fallback MUST be used only when `performance` is not available on `globalThis`. The adapter MUST NOT use `Date.now()` for `monotonicNow()` when `performance.now()` is available.

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

REQUIREMENT: The returned object MUST be frozen with `Object.freeze()`.

REQUIREMENT: `SystemSequenceGenerator` MUST NOT expose a `reset()` method. The production sequence generator is structurally irresettable. Only `VirtualSequenceGenerator` (in `@hex-di/clock/testing`) provides `reset()` capability. See section 3.1 for the full GxP rationale (21 CFR 11.10(d), ALCOA+ Complete).

### Startup Self-Test (21 CFR 11.10(h))

21 CFR 11.10(h) requires "device checks to determine, as appropriate, the validity of the source of data input or operational instruction." For `@hex-di/clock`, the "devices" are the platform timing APIs (`performance.now()`, `Date.now()`). A startup self-test validates that these APIs return plausible values before the adapter is used for audit-relevant operations.

REQUIREMENT: `createSystemClock()` MUST perform a startup self-test at construction time. The self-test MUST verify the following conditions and return `err(ClockStartupError)` if any fail:

| Check                                 | Verification                                                                                                               | Rationale                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ST-1: Monotonic non-negativity        | `monotonicNow()` returns a value `>= 0`                                                                                    | A negative monotonic value indicates a broken `performance.now()` implementation.                                                                                                                                                                                                                                                                                                                |
| ST-2: Wall-clock plausibility         | `wallClockNow()` returns a value greater than `1577836800000` (2020-01-01T00:00:00Z)                                       | A wall-clock value before 2020 indicates the system clock is unset or severely misconfigured. The threshold is deliberately conservative (years in the past) to avoid false positives from minor NTP drift.                                                                                                                                                                                      |
| ST-3: Monotonic non-regression        | Two consecutive `monotonicNow()` calls return values where the second is `>=` the first                                    | A regression in consecutive calls indicates a broken monotonic source.                                                                                                                                                                                                                                                                                                                           |
| ST-4: Platform API freeze (GxP mode)  | `Object.isFrozen(Date)` and `Object.isFrozen(globalThis.performance)` both return `true` (when `performance` is available) | Unfrozen platform APIs can be tampered with after adapter construction, undermining the anti-tampering guarantees. Only enforced in GxP mode.                                                                                                                                                                                                                                                    |
| ST-5: High-res/wall-clock consistency | `Math.abs(highResNow() - wallClockNow())` is less than `1000` (1 second)                                                   | A divergence greater than 1 second between `highResNow()` and `wallClockNow()` indicates that `performance.timeOrigin` was captured before NTP synchronization completed, making all `highResNow()` values offset from true UTC. The 1-second threshold is deliberately conservative to avoid false positives from sub-second NTP slew corrections while catching gross `timeOrigin` inaccuracy. |

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

REQUIREMENT: `ClockStartupError` MUST be frozen with `Object.freeze()` at construction, consistent with the project's error immutability pattern.

REQUIREMENT: The self-test MUST run synchronously during `createSystemClock()` before the adapter object is returned. If any check fails, the factory MUST return `err(ClockStartupError)` and MUST NOT return `ok()` with a partially-valid adapter.

REQUIREMENT: `createClockStartupError` MUST be exported from the main entry point, enabling consumers to match and handle startup failures explicitly.

**GxP rationale (21 CFR 11.10(h)):** Without this self-test, a system with a broken clock (e.g., embedded device with no RTC battery, container with unset system time) could silently produce invalid audit timestamps for the entire application lifetime. The self-test provides fail-fast behavior at the earliest possible point — adapter construction — before any audit-relevant timestamp is generated. Returning `err()` instead of `ok()` forces the consumer to handle the failure explicitly at the type level. This aligns with the GAMP 5 risk classification where `wallClockNow()` and `highResNow()` are rated High Impact: catching platform API issues at startup prevents high-impact failures during operation.

**Non-GxP deployments:** The self-test runs unconditionally. The checks are sufficiently conservative (non-negative monotonic, wall-clock after 2020) that they should never produce false positives on properly configured systems. If a non-GxP deployment encounters a self-test failure, it indicates a genuine platform issue that would affect any timing-dependent code.

**ST-4 GxP mode note:** ST-4 is the only self-test check that is conditional on `options.gxp`. The rationale is that freezing `Date` and `performance` is a GxP-specific operational requirement that non-GxP deployments may legitimately skip. Making ST-4 unconditional would break non-GxP test environments where platform APIs are routinely mocked via reassignment. When `options.gxp` is `false` or `undefined`, ST-4 is skipped silently.

REQUIREMENT: GxP consumers MUST pass `{ gxp: true }` when constructing the `SystemClockAdapter` via `createSystemClock()`. This ensures ST-4 runs automatically in GxP deployments. When using `@hex-di/guard`, the guard's `createGuardGraph()` handles this automatically.

**ST-5 note:** ST-5 runs unconditionally (not GxP-mode-only). A divergence greater than 1 second between `highResNow()` and `wallClockNow()` indicates a genuine platform clock issue (`performance.timeOrigin` captured before NTP synchronization) that affects any code depending on `highResNow()` accuracy, not just GxP deployments. The 1-second threshold is deliberately conservative: sub-second NTP slew corrections are normal and do not trigger ST-5; only gross `timeOrigin` inaccuracy (typically caused by NTP not yet having synchronized at process start) is caught. This check directly mitigates FM-9 (`performance.timeOrigin` drift) in the FMEA risk analysis, reducing its residual risk from Moderate to Low by providing automated startup detection rather than relying solely on operational procedures (DQ-2).

**Self-test scope limitations:** The startup self-test catches gross platform API failures (negative monotonic values, severely misconfigured system clock, broken monotonicity) and GxP configuration issues (unfrozen platform APIs) via `err()` returns, but does NOT detect the following conditions, which are delegated to `@hex-di/guard`'s periodic checks:

- **NTP desynchronization** — The self-test does not verify NTP sync status. The wall-clock may be inaccurate by seconds or minutes and still pass ST-2 (which only checks for pre-2020 values). NTP validation is delegated to `@hex-di/guard`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.
- **Monotonic drift** — The self-test verifies non-regression across two consecutive calls but does not detect gradual monotonic drift over time. Long-term drift monitoring is delegated to `@hex-di/guard`.
- **Resolution degradation** — The self-test does not measure timer resolution. A platform that coarsens `performance.now()` to 100ms would still pass all self-test checks. Resolution verification is delegated to `@hex-di/guard`.
- **Post-startup leap second events** — The self-test runs once at construction time. Leap second insertions that occur after startup may cause wall-clock anomalies that the self-test cannot detect. Leap second handling depends on NTP daemon configuration (DQ-1 in the Deployment Qualification Checklist, section 6.2).

GxP deployments MUST NOT rely on the startup self-test as the sole validation mechanism. The self-test is a first line of defense; `@hex-di/guard` provides comprehensive ongoing validation. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

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

REQUIREMENT: The detection MUST NOT use `try/catch` for control flow. It MUST use `typeof` checks only.

REQUIREMENT: The detection MUST run once at adapter construction time, not on every `monotonicNow()` call. The result MUST be captured in a closure.

### Platform Compatibility Matrix

| Platform                 | `performance.now()`       | `performance.timeOrigin` | `Date.now()` | GxP Suitability                          |
| ------------------------ | ------------------------- | ------------------------ | ------------ | ---------------------------------------- |
| Node.js 18+ LTS          | Available                 | Available                | Available    | **Suitable**                             |
| Node.js 16               | Available                 | Available                | Available    | **Suitable** (EOL — upgrade recommended) |
| Node.js 14               | Available                 | Available                | Available    | **Not Recommended** (EOL)                |
| Chrome 100+              | Available                 | Available                | Available    | **Conditionally Suitable** (1)           |
| Firefox 100+             | Available (may coarsen)   | Available                | Available    | **Conditionally Suitable** (1)           |
| Safari 15+               | Available                 | Available                | Available    | **Conditionally Suitable** (1)           |
| Deno 1.0+                | Available                 | Available                | Available    | **Suitable**                             |
| Bun 1.0+                 | Available                 | Available                | Available    | **Suitable** (pending LTS)               |
| Cloudflare Workers       | Available (1ms coarsened) | Not available            | Available    | **Not Suitable** (2)                     |
| AWS Lambda               | Available                 | Available                | Available    | **Suitable**                             |
| React Native (Hermes)    | Not available             | Not available            | Available    | **Not Suitable** (3)                     |
| Air-gapped (GPS/PTP/RTC) | Available (via host)      | N/A (hardware source)    | Available    | **Suitable** (4)                         |

**GxP suitability notes:**

1. **Conditionally Suitable (Browsers):** Browser deployments are GxP-suitable only when served from same-origin contexts where Spectre coarsening is minimized. Cross-origin contexts may coarsen `performance.now()` to 1ms, reducing `highResNow()` precision below GxP requirements for sub-millisecond audit timestamps. GxP organizations MUST document the browser deployment context and verify the observed precision meets their requirements via the OQ protocol (OQ-4).

2. **Not Suitable (Cloudflare Workers):** `performance.now()` is coarsened to 1ms and `performance.timeOrigin` is unavailable. `highResNow()` falls back to `Date.now()`, losing all sub-millisecond precision. GxP use cases requiring microsecond audit timestamps (21 CFR Part 211 laboratory data acquisition, OpenTelemetry tracing) cannot be satisfied on this platform.

3. **Not Suitable (React Native / Hermes):** `performance.now()` and `performance.timeOrigin` are both unavailable.

4. **Suitable (Air-gapped with Hardware Clock):** Air-gapped deployments using the `HardwareClockAdapter` interface (section 4.3) with a GPS-disciplined, PTP-synchronized, or calibrated RTC clock source are GxP-suitable. The hardware clock provides the authoritative wall-clock time source, while `performance.now()` provides monotonic time from the host platform. Requires a native module for hardware clock access. GxP organizations MUST include the hardware clock source in their calibration program per ICH Q7 section 6.5. `monotonicNow()` falls back to the `Date.now()` clamped fallback, which enforces non-regression but **cannot guarantee true monotonicity** — repeated calls during the same millisecond return the same value, and NTP step adjustments are only clamped (not corrected). `highResNow()` falls back to `Date.now()` with no sub-millisecond precision. These limitations violate the monotonicity and precision requirements for GxP audit trail timestamps.

WARNING: **React Native (Hermes) deployments MUST NOT be used for GxP-regulated environments** without additional platform-level controls that provide monotonic high-resolution timing (e.g., a native module exposing `std::chrono::steady_clock`). The `Date.now()` clamped fallback does not provide sufficient timing guarantees for ALCOA+ Contemporaneous compliance. GxP organizations deploying on React Native MUST perform a documented risk assessment per EU GMP Annex 11, Section 4 and obtain explicit regulatory approval for the reduced timing guarantees.

WARNING: **Cloudflare Workers deployments MUST NOT be used for GxP-regulated environments** that require sub-millisecond audit timestamps. If millisecond precision is acceptable for the specific GxP use case, a documented risk assessment and justification per EU GMP Annex 11, Section 4 is required.

REQUIREMENT: GxP organizations MUST select a platform classified as **Suitable** in the matrix above. Platforms classified as **Conditionally Suitable** require additional documented justification in the computerized system validation plan. Platforms classified as **Not Suitable** MUST NOT be used for GxP audit-critical operations without a risk assessment approved by the Quality Assurance unit.

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

Hardware clock adapters MUST satisfy the following behavioral contracts, analogous to the NC-1 through NC-7 contracts defined for NTP adapters in the guard specification:

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

REQUIREMENT: `HardwareClockAdapter`, `HardwareClockAdapterOptions`, and `HardwareClockStatus` MUST be exported from the main entry point (`@hex-di/clock`).

REQUIREMENT: Concrete `HardwareClockAdapter` implementations developed by consumers MUST satisfy all HC-1 through HC-7 behavioral contracts. The IQ protocol MUST be extended to verify these contracts when a hardware adapter is deployed.

REQUIREMENT: GxP organizations deploying hardware clock adapters MUST include the hardware clock source in their calibration and verification program per ICH Q7 section 6.5. The calibration records MUST document the hardware source type, calibration date, measured accuracy, and next calibration due date.

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

REQUIREMENT: The `@hex-di/clock` package MUST NOT attempt to circumvent or detect timer coarsening. The coarsened resolution is a platform security decision and MUST be respected.

### Minimum Resolution Guarantee

The `SystemClockAdapter` does NOT guarantee a specific resolution. The resolution depends entirely on the platform.

For GxP environments where a specific resolution is required (e.g., microsecond precision for audit timestamps), resolution verification is performed by `@hex-di/guard` at startup. The clock package provides the timing; the guard validates that the timing meets GxP requirements. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

### Sequence Number as Resolution Backstop

When clock resolution is coarsened, multiple events may share the same timestamp. The `SequenceGeneratorPort` provides a resolution backstop: events with identical timestamps can be ordered by their sequence numbers.

REQUIREMENT: All HexDI packages that record timestamped events SHOULD also record a sequence number from a `SequenceGeneratorPort`. The combination of `(timestamp, sequenceNumber)` provides unambiguous ordering regardless of clock resolution.

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

REQUIREMENT: The overhead of each `@hex-di/clock` function above the raw platform API call MUST be less than 100 nanoseconds on the reference platform (Node.js 18+ LTS on x86_64). This budget excludes the platform API cost itself — only the abstraction overhead (closure dereference, frozen object construction) is counted.

REQUIREMENT: PQ-1 (throughput sustainability) MUST verify that these overhead budgets hold under sustained load. If any function exceeds its budget on a specific deployment platform, the deviation MUST be documented with root cause analysis.

**Measurement note:** Nanosecond-level overhead is not directly measurable with `performance.now()` (which has microsecond resolution at best). Overhead budgets are verified indirectly via PQ-1 throughput testing: if `monotonicNow()` sustains > 10 million ops/sec, the per-call overhead is < 100ns. The PQ protocol (section 6.2) defines the throughput thresholds.
