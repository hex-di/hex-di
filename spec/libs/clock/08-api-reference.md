# 08 - API Reference

## 8.0 API Tiers — Progressive Disclosure

`@hex-di/clock` exports 80+ symbols. To reduce cognitive load for new consumers, all exports are classified into three progressive tiers. Consumers start with Tier 1 and adopt higher tiers only when their use case requires it.

### Tier 1 — Essential (Most Consumers)

The minimum surface for injectable time and deterministic testing. Covers 90% of use cases.

| Export | Category | Purpose |
|--------|----------|---------|
| `ClockPort` | Port | Injectable clock (3 time functions) |
| `SequenceGeneratorPort` | Port | Monotonic event ordering |
| `MonotonicTimestamp` | Type | Branded type for duration measurement |
| `WallClockTimestamp` | Type | Branded type for calendar timestamps |
| `HighResTimestamp` | Type | Branded type for tracing spans |
| `MonotonicDuration` | Type | Branded type for monotonic elapsed time |
| `elapsed` | Utility | Branded duration since a monotonic start |
| `createSystemClock` | Factory | Create default platform clock |
| `createSystemSequenceGenerator` | Factory | Create default sequence generator |
| `SystemClockAdapter` | Adapter | Pre-wired DI adapter for system clock |
| `SystemSequenceGeneratorAdapter` | Adapter | Pre-wired DI adapter for sequence generator |
| `SequenceOverflowError` | Error | Sequence counter exhaustion |
| `ClockStartupError` | Error | Platform API startup failure |
| `createVirtualClock` | Testing | Deterministic clock for tests |
| `createVirtualSequenceGenerator` | Testing | Controllable sequence for tests |

**Entry points:** `@hex-di/clock` (production, includes adapter constants), `@hex-di/clock/testing` (test factories).

### Tier 2 — Extended (Timer, Cache, Platform Consumers)

Adds timer scheduling, cached clock, and platform-specific adapters.

| Export | Category | Purpose |
|--------|----------|---------|
| `TimerSchedulerPort` | Port | Injectable setTimeout/setInterval/sleep |
| `TimerHandle` | Type | Opaque timer cancellation handle |
| `CachedClockPort` | Port | High-throughput cached time reads |
| `CachedClockLifecycle` | Interface | Start/stop background cache updater |
| `CachedClockAdapter` | Interface | Combined cached clock port + lifecycle |
| `createSystemTimerScheduler` | Factory | Platform timer scheduler |
| `createCachedClock` | Factory | Cached clock with configurable interval |
| `SystemTimerSchedulerAdapter` | Adapter | Pre-wired DI adapter for system timer scheduler |
| `SystemCachedClockAdapter` | Adapter | Pre-wired DI adapter for cached clock |
| `createEdgeRuntimeClock` | Factory | V8 isolate edge runtime clock |
| `createHostBridgeClock` | Factory | React Native / WASM clock |
| `EdgeRuntimeClockAdapter` | Adapter | Pre-wired DI adapter for edge runtime clock |
| `createSystemClockAdapter` | Factory | Creates DI adapter for system clock with options |
| `createEdgeRuntimeClockAdapter` | Factory | Creates DI adapter for edge runtime clock with options |
| `createHostBridgeClockAdapter` | Factory | Creates DI adapter wrapping a host-provided clock bridge |
| `HostClockBridge` | Interface | Host timing function contract |
| `EdgeRuntimeClockOptions` | Config | Edge clock options |
| `HostBridgeClockOptions` | Config | Host bridge options |
| `SystemClockOptions` | Config | System clock options |
| `CachedClockOptions` | Config | Cached clock options |
| `ClockRangeError` | Error | Virtual clock negative advance |
| `delay` | Combinator | Promise-based delay via scheduler |
| `timeout` | Combinator | Race promise against timer |
| `measure` | Combinator | Measure async function duration |
| `retry` | Combinator | Retry with backoff via scheduler |
| `RetryOptions` | Config | Retry combinator configuration |
| `createClockContext` | Utility | AsyncLocalStorage clock propagation |
| `ClockContext` | Interface | Request-scoped clock + sequence |
| `createVirtualTimerScheduler` | Testing | Deterministic timer scheduler |
| `createVirtualCachedClock` | Testing | Deterministic cached clock |

### Tier 3 — GxP & Advanced (Regulated Environments)

Audit trail timestamps, electronic signatures, record integrity, deserialization, diagnostics, and compliance utilities. Required only for GxP-regulated deployments (21 CFR Part 11, EU GMP Annex 11).

| Export | Category | Purpose |
|--------|----------|---------|
| `ClockDiagnosticsPort` | Port | Clock source attestation |
| `ClockSourceChangedSinkPort` | Port | Adapter swap audit events |
| `RetentionPolicyPort` | Port | Retention policy registration |
| `ClockDiagnostics` | Interface | Frozen diagnostics snapshot |
| `ClockCapabilities` | Interface | Platform capability introspection |
| `TemporalContext` | Interface | Audit timestamp triple |
| `TemporalContextFactory` | Interface | Audit timestamp factory |
| `OverflowTemporalContext` | Interface | Degraded audit context |
| `SignableTemporalContext` | Interface | Electronic signature binding |
| `ClockSourceChangedEvent` | Interface | Adapter swap event |
| `ClockSourceChangedSink` | Interface | Adapter swap event receiver |
| `HardwareClockAdapter` | Interface | GPS/PTP/RTC/atomic clock |
| `HardwareClockAdapterOptions` | Config | Hardware clock options |
| `HardwareClockStatus` | Interface | Hardware lock/accuracy status |
| `ClockGxPMetadata` | Interface | Version identification |
| `TemporalContextDigest` | Interface | Per-record SHA-256 digest |
| `RetentionMetadata` | Interface | Retention policy metadata |
| `PeriodicEvaluationConfig` | Config | Periodic clock evaluation |
| `createTemporalContextFactory` | Factory | Audit timestamp factory |
| `createClockSourceBridge` | Factory | ISO 8601 bridge |
| `getClockGxPMetadata` | Factory | GxP deployment metadata |
| `isOverflowTemporalContext` | Guard | Discriminate overflow contexts |
| `validateSignableTemporalContext` | Validation | 21 CFR 11.50 signature check |
| `validateRetentionMetadata` | Validation | Retention policy check |
| `calculateRetentionExpiryDate` | Utility | Retention expiry calculation |
| `computeTemporalContextDigest` | Integrity | SHA-256 record digest |
| `computeOverflowTemporalContextDigest` | Integrity | Overflow record digest |
| `verifyTemporalContextDigest` | Integrity | Constant-time digest verify |
| `deserializeTemporalContext` | Deserialization | Archived record reconstitution |
| `deserializeOverflowTemporalContext` | Deserialization | Archived overflow reconstitution |
| `deserializeClockDiagnostics` | Deserialization | Archived diagnostics |
| `createProcessInstanceId` | Utility | Multi-process disambiguation |
| `setupPeriodicClockEvaluation` | Utility | EU GMP Annex 11 evaluation |
| `asMonotonic` / `asWallClock` / `asHighRes` | Branding | Zero-cost timestamp branding |
| `asMonotonicValidated` / `asWallClockValidated` / `asHighResValidated` | Branding | Validated timestamp branding |
| `SignatureValidationError` | Error | Invalid signature |
| `DeserializationError` | Error | Schema version mismatch |
| `BrandingValidationError` | Error | Implausible timestamp value |
| `RetentionValidationError` | Error | Invalid retention policy |

### Tier Boundary Rules

1. **Tier 1 has zero Tier 2/3 dependencies.** A consumer importing only Tier 1 exports never encounters Tier 2/3 types in signatures, return types, or error types.
2. **Tier 2 may reference Tier 1 types** (e.g., `CachedClockPort` returns `MonotonicTimestamp`), but never Tier 3 types.
3. **Tier 3 may reference any tier.** GxP utilities compose over the full API surface.
4. **Testing factories mirror their tier.** `createVirtualClock` is Tier 1 testing; `createVirtualTimerScheduler` is Tier 2 testing. Tier 3 has no dedicated testing factories — GxP testing uses Tier 1/2 virtual adapters with Tier 3 utilities.

---

## 8.1 Complete API

### Ports

| Export                       | Type                           | Description                                                                           |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `ClockPort`                  | `Port<ClockPort>`              | Directed port for clock operations                                                    |
| `SequenceGeneratorPort`      | `Port<SequenceGeneratorPort>`  | Directed port for sequence generation                                                 |
| `ClockDiagnosticsPort`       | `Port<ClockDiagnosticsPort>`   | Directed port for clock source attestation and runtime diagnostics                    |
| `ClockSourceChangedSinkPort` | `Port<ClockSourceChangedSink>` | Directed port for receiving clock source change audit events (unconditional emission) |
| `TimerSchedulerPort`         | `Port<TimerSchedulerPort>`     | Directed port for timer scheduling (setTimeout, setInterval, sleep)                  |
| `RetentionPolicyPort`        | `Port<RetentionPolicyPort>`    | Directed port for retention policy registration (advisory, GxP enforcement mechanism) |

### Interfaces

| Interface                     | Methods                                                                                                                                                              | Description                                                                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClockPort`                   | `monotonicNow()`, `wallClockNow()`, `highResNow()`                                                                                                                   | Injectable clock abstraction                                                                                                                                                                                                                                               |
| `SequenceGeneratorPort`       | `next()` → `Result<number, SequenceOverflowError>`, `current()`                                                                                                      | Monotonic integer sequence generator (no `reset()` -- structurally irresettable in production)                                                                                                                                                                             |
| `ClockDiagnosticsPort`        | `getDiagnostics()`, `getCapabilities()`                                                                                                                              | Clock source attestation for audit trail provenance, platform capabilities introspection                                                                                                                                                                                   |
| `ClockCapabilities`           | `hasMonotonicTime`, `hasHighResOrigin`, `crossOriginIsolated`, `estimatedResolutionMs`, `platform`, `highResDegraded`, `monotonicDegraded`                           | Frozen platform capabilities snapshot. Reports actual timing API availability for consumer branching and GxP qualification.                                                                                                                                                |
| `ClockDiagnostics`            | `adapterName`, `monotonicSource`, `highResSource`, `platformResolutionMs`, `cryptoFipsMode`                                                                          | Frozen diagnostics snapshot with FIPS mode detection                                                                                                                                                                                                                       |
| `RetentionPolicyPort`         | `getRetentionPeriodDays(recordType)`, `isRetentionConfigured()`, `getSupportedRecordTypes()`                                                                         | Consumer-implemented port for retention policy registration. Advisory mechanism for GxP mode startup verification (CLK-AUD-031a/b/c).                                                                                                                                      |
| `TemporalContext`             | `sequenceNumber`, `monotonicTimestamp`, `wallClockTimestamp`                                                                                                         | Frozen standardized audit timestamp triple                                                                                                                                                                                                                                 |
| `TemporalContextFactory`      | `create()` → `Result<TemporalContext, SequenceOverflowError>`, `createOverflowContext()`                                                                             | Utility (not a port) for creating `TemporalContext` instances from `ClockPort` + `SequenceGeneratorPort`. `create()` returns `Result` for explicit overflow handling. `createOverflowContext()` produces an `OverflowTemporalContext` for the overflow event audit record. |
| `OverflowTemporalContext`     | `sequenceNumber` (-1 sentinel), `lastValidSequenceNumber`, `monotonicTimestamp`, `wallClockTimestamp`, `_tag`                                                        | Frozen degraded temporal context for recording the sequence overflow event itself. Discriminated by `_tag: 'OverflowTemporalContext'`.                                                                                                                                     |
| `SignableTemporalContext`     | extends `TemporalContext` + optional `signature` (`signerName`, `signerId`, `signedAt`, `meaning`, `method`)                                                         | Extension interface for electronic signature binding per 21 CFR 11.50. Consumer-populated; signature object frozen when present.                                                                                                                                           |
| `ClockSourceChangedEvent`     | `_tag`, `previousAdapter`, `newAdapter`, `timestamp`, `reason`                                                                                                       | Frozen audit event emitted when clock adapter registration changes                                                                                                                                                                                                         |
| `ClockSourceChangedSink`      | `onClockSourceChanged(event: ClockSourceChangedEvent)`                                                                                                               | Sink interface for receiving clock source change events; invoked directly by adapter registration, independent of container lifecycle                                                                                                                                      |
| `SignatureValidationError`    | `_tag: 'SignatureValidationError'`, `field: string`, `message: string`                                                                                               | Frozen error returned when `validateSignableTemporalContext()` detects an incomplete or invalid electronic signature per 21 CFR 11.50                                                                                                                                      |
| `HardwareClockAdapter`        | extends `ClockPort` + `ClockDiagnosticsPort` + `getHardwareStatus()`                                                                                                 | Interface for air-gapped GxP environments using GPS, PTP, RTC, or atomic clock sources (HC-1 through HC-7 behavioral contracts)                                                                                                                                            |
| `HardwareClockAdapterOptions` | `adapterName: string`, `gxp?: boolean`                                                                                                                               | Options for hardware clock adapter factories                                                                                                                                                                                                                               |
| `HardwareClockStatus`         | `locked: boolean`, `estimatedAccuracyMs: number \| undefined`, `sourceType: 'gps' \| 'ptp' \| 'rtc' \| 'atomic' \| 'custom'`, `lastSyncCheckAt: number \| undefined` | Frozen hardware clock source status snapshot                                                                                                                                                                                                                               |
| `HostClockBridge`             | `monotonicNowMs()`, `wallClockNowMs()`, optional `highResNowMs()`                                                                                                    | Lightweight interface for injecting host-provided timing functions (React Native, WASM, embedded). All methods synchronous.                                                                                                                                                |
| `TemporalContextDigest`       | `_tag: 'TemporalContextDigest'`, `algorithm: 'SHA-256'`, `digest: string` (hex), `canonicalInput: string`                                                            | Frozen per-record cryptographic digest for tamper detection (21 CFR 11.10(c))                                                                                                                                                                                              |
| `ClockGxPMetadata`            | `clockVersion: string`, `specRevision: string`, `requiredMonitoringVersion: string \| undefined`                                                                          | Frozen GxP deployment metadata. `clockVersion` identifies the clock library version; `specRevision` identifies the specification revision the implementation conforms to; `requiredMonitoringVersion` (when defined) specifies the minimum the ecosystem's GxP monitoring adapter version required for full GxP compliance (ST-6 co-deployment check). |
| `VirtualClockAdapter`         | extends `ClockPort` + `advance()` → `Result<void, ClockRangeError>`, `set()`, `jumpWallClock()`                                                                      | Test clock with manual time control                                                                                                                                                                                                                                        |
| `VirtualSequenceGenerator`    | extends `SequenceGeneratorPort` + `setCounter()`, `reset()`                                                                                                          | Test sequence with manual counter control (only test type has `reset()`)                                                                                                                                                                                                   |
| `TimerSchedulerPort`          | `setTimeout()`, `setInterval()`, `clearTimeout()`, `clearInterval()`, `sleep()`                                                                                      | Injectable timer scheduling abstraction (separate from ClockPort per SRP)                                                                                                                                                                                                  |
| `TimerHandle`                 | `_tag: 'TimerHandle'`, `id: number`                                                                                                                                  | Frozen opaque handle for timer cancellation                                                                                                                                                                                                                                |
| `CachedClockPort`             | `recentMonotonicNow()`, `recentWallClockNow()`                                                                                                                       | Structurally separate cached clock (NOT extending ClockPort). Returns branded types. Method names differ to prevent structural assignability.                                                                                                                               |
| `CachedClockLifecycle`        | `start()`, `stop()`, `isRunning()`                                                                                                                                   | Lifecycle management for cached clock background updater                                                                                                                                                                                                                   |
| `CachedClockAdapter`          | `CachedClockPort & CachedClockLifecycle`                                                                                                                             | Full adapter type combining read and lifecycle interfaces                                                                                                                                                                                                                  |
| `VirtualTimerScheduler`       | extends `TimerSchedulerPort` + `pendingCount()`, `advanceTime()`, `runAll()`, `runNext()`, `blockUntil()`                                                            | Test timer scheduler linked to VirtualClockAdapter. Fires timers deterministically on time advance.                                                                                                                                                                        |
| `BlockUntilOptions`           | `timeoutMs?: number` (default: 5000)                                                                                                                                 | Options for `blockUntil()` waiter synchronization                                                                                                                                                                                                                          |
| `ClockTimeoutError`           | `_tag: 'ClockTimeoutError'`, `expected: number`, `actual: number`, `timeoutMs: number`, `message: string`                                                            | Error when `blockUntil()` times out waiting for pending timer count                                                                                                                                                                                                        |
| `RetentionMetadata`           | `retentionPeriodDays: number`, `retentionBasis: string`, `retentionStartDate: string`, `retentionExpiryDate: string`, `recordType: string`                           | Frozen utility type for composing retention policy metadata with audit trail records (CLK-AUD-029). Consumer-populated.                                                                                                                                                    |

### Adapter Constants

| Export | Type | Description | Entry Point |
| ------ | ---- | ----------- | ----------- |
| `SystemClockAdapter` | `Adapter<ClockPort>` | Pre-wired singleton adapter for system clock (calls `createSystemClock()` internally, throws on startup failure) | `@hex-di/clock` |
| `SystemSequenceGeneratorAdapter` | `Adapter<SequenceGeneratorPort>` | Pre-wired singleton adapter for sequence generator | `@hex-di/clock` |
| `SystemTimerSchedulerAdapter` | `Adapter<TimerSchedulerPort>` | Pre-wired singleton adapter for system timer scheduler | `@hex-di/clock` |
| `SystemCachedClockAdapter` | `Adapter<CachedClockPort>` | Pre-wired singleton adapter for cached clock (requires ClockPort, auto-starts on resolution) | `@hex-di/clock` |
| `EdgeRuntimeClockAdapter` | `Adapter<ClockPort>` | Pre-wired singleton adapter for edge runtime (V8 isolate) clock | `@hex-di/clock` |
| `SystemClockDiagnosticsAdapter` | `Adapter<ClockDiagnosticsPort>` | Pre-wired singleton adapter for clock diagnostics (requires ClockPort; expects SystemClockAdapter to provide a ClockPort & ClockDiagnosticsPort instance) | `@hex-di/clock` |

### Factory Functions

| Function                          | Signature                                                                                                  | Returns                                                                                                                                                                                        | Entry Point             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `createSystemClock`               | `(options?: SystemClockOptions) => Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>`            | `ok()` with frozen `ClockPort` using platform APIs with diagnostics, or `err(ClockStartupError)` on startup self-test failure. Pass `{ gxp: true }` for ST-4 platform API freeze verification. | `@hex-di/clock`         |
| `createSystemSequenceGenerator`   | `() => SequenceGeneratorPort`                                                                              | Frozen `SequenceGeneratorPort` with integer counter (no `reset()`)                                                                                                                             | `@hex-di/clock`         |
| `createVirtualClock`              | `(options?: VirtualClockOptions) => VirtualClockAdapter`                                                   | Controllable test clock                                                                                                                                                                        | `@hex-di/clock/testing` |
| `createVirtualSequenceGenerator`  | `(options?: VirtualSequenceOptions) => VirtualSequenceGenerator`                                           | Controllable test sequence (has `reset()`)                                                                                                                                                     | `@hex-di/clock/testing` |
| `createSystemClockAdapter`        | `(options?: SystemClockOptions) => Adapter<ClockPort>`                                                     | Creates a DI adapter for system clock with options (e.g., `{ gxp: true }`)                                                                                                                    | `@hex-di/clock`         |
| `createEdgeRuntimeClockAdapter`   | `(options?: EdgeRuntimeClockOptions) => Adapter<ClockPort>`                                                | Creates a DI adapter for edge runtime clock with options                                                                                                                                       | `@hex-di/clock`         |
| `createHostBridgeClockAdapter`    | `(bridge: HostClockBridge, options: HostBridgeClockOptions) => Adapter<ClockPort>`                         | Creates a DI adapter wrapping a host-provided clock bridge                                                                                                                                     | `@hex-di/clock`         |
| `createTemporalContextFactory`    | `(clock: ClockPort, seq: SequenceGeneratorPort) => TemporalContextFactory`                                 | Frozen factory for standardized audit timestamps                                                                                                                                               | `@hex-di/clock`         |
| `createClockSourceBridge`         | `(clock: ClockPort) => ClockSource`                                                                        | Frozen `ClockSource` adapter bridging `wallClockNow()` to ISO 8601                                                                                                                             | `@hex-di/clock`         |
| `getClockGxPMetadata`             | `() => ClockGxPMetadata`                                                                                   | Frozen metadata with `clockVersion`, `specRevision`, and optional `requiredMonitoringVersion` for GxP deployment identification. `specRevision` identifies the specification revision the implementation conforms to. When `requiredMonitoringVersion` is defined, GxP deployments SHOULD verify the deployed the ecosystem's GxP monitoring adapter version matches (ST-6 co-deployment warning). | `@hex-di/clock`         |
| `isOverflowTemporalContext`       | `(ctx: TemporalContext \| OverflowTemporalContext) => ctx is OverflowTemporalContext`                      | Type guard discriminating overflow contexts from normal contexts                                                                                                                               | `@hex-di/clock`         |
| `validateSignableTemporalContext` | `(ctx: SignableTemporalContext) => Result<SignableTemporalContext, SignatureValidationError>`              | Validates 21 CFR 11.50 signature completeness. Returns `Ok` for unsigned or valid signed contexts; returns `Err` for incomplete/invalid signature fields.                                      | `@hex-di/clock`         |
| `createSystemTimerScheduler`      | `() => TimerSchedulerPort`                                                                                 | Frozen `TimerSchedulerPort` using captured platform timer APIs (anti-tampering)                                                                                                                | `@hex-di/clock`         |
| `createCachedClock`               | `(options: CachedClockOptions) => CachedClockAdapter`                                                      | Frozen `CachedClockAdapter` with background interval updater                                                                                                                                   | `@hex-di/clock`         |
| `asMonotonic`                     | `(ms: number) => MonotonicTimestamp`                                                                       | Identity function at runtime; brands `number` as `MonotonicTimestamp` at type level                                                                                                            | `@hex-di/clock`         |
| `asWallClock`                     | `(ms: number) => WallClockTimestamp`                                                                       | Identity function at runtime; brands `number` as `WallClockTimestamp` at type level                                                                                                            | `@hex-di/clock`         |
| `asHighRes`                       | `(ms: number) => HighResTimestamp`                                                                         | Identity function at runtime; brands `number` as `HighResTimestamp` at type level                                                                                                              | `@hex-di/clock`         |
| `asMonotonicValidated`            | `(ms: number) => Result<MonotonicTimestamp, BrandingValidationError>`                                      | Validated branding with plausibility checks (ms >= 0, ms < 1e12). For deserialization/testing.                                                                                                 | `@hex-di/clock`         |
| `asWallClockValidated`            | `(ms: number) => Result<WallClockTimestamp, BrandingValidationError>`                                      | Validated branding with plausibility checks (>= Y2K epoch, <= now + 1 day). For deserialization/testing.                                                                                       | `@hex-di/clock`         |
| `asHighResValidated`              | `(ms: number) => Result<HighResTimestamp, BrandingValidationError>`                                        | Validated branding with plausibility checks (same as wallClock). For deserialization/testing.                                                                                                   | `@hex-di/clock`         |
| `createProcessInstanceId`         | `() => string`                                                                                             | Creates a process instance identifier (`{hostname}-{timestamp}-{uuid}`) for multi-process audit trail disambiguation (CLK-MPC-007/008/009)                                                    | `@hex-di/clock`         |
| `setupPeriodicClockEvaluation`    | `(clock, diagnostics, timer, config) => { readonly stop: () => void }`                                     | Sets up periodic clock evaluation using `ClockDiagnosticsPort` for EU GMP Annex 11 Section 11 compliance (CLK-GXP-007a/b/c)                                                                   | `@hex-di/clock`         |
| `createEdgeRuntimeClock`          | `(options?: EdgeRuntimeClockOptions) => Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>`       | Frozen adapter for V8 isolate edge runtimes (Workers, Vercel Edge). highResNow() degrades to Date.now().                                                                                      | `@hex-di/clock`         |
| `createHostBridgeClock`           | `(bridge: HostClockBridge, options: HostBridgeClockOptions) => Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>` | Frozen adapter wrapping host-provided timing functions (React Native, WASM, embedded).                                                                                    | `@hex-di/clock`         |
| `createVirtualTimerScheduler`     | `(clock: VirtualClockAdapter) => VirtualTimerScheduler`                                                    | Test timer scheduler linked to virtual clock                                                                                                                                                   | `@hex-di/clock/testing` |
| `createVirtualCachedClock`        | `(clock: VirtualClockAdapter) => CachedClockAdapter`                                                       | Test cached clock that reads from virtual clock directly (no background updater)                                                                                                               | `@hex-di/clock/testing` |
| `validateRetentionMetadata`       | `(metadata: RetentionMetadata) => Result<RetentionMetadata, RetentionValidationError>`                     | Validates retention policy field completeness and structural correctness (CLK-AUD-029)                                                                                                         | `@hex-di/clock`         |
| `calculateRetentionExpiryDate`    | `(startDate: string, retentionPeriodDays: number) => string`                                               | Computes ISO 8601 UTC retention expiry date from start date and period                                                                                                                         | `@hex-di/clock`         |

### Async Combinators

| Function | Signature | Returns | Entry Point |
|----------|-----------|---------|-------------|
| `delay` | `(scheduler: TimerSchedulerPort, ms: number) => Promise<void>` | Promise resolving after `ms` ms via scheduler | `@hex-di/clock` |
| `timeout` | `<T>(scheduler: TimerSchedulerPort, promise: Promise<T>, ms: number) => Promise<T>` | Settled promise or `ClockTimeoutError` rejection | `@hex-di/clock` |
| `measure` | `<T>(clock: ClockPort, fn: () => T \| Promise<T>) => Promise<{ result: T; durationMs: number }>` | Result and monotonic duration | `@hex-di/clock` |
| `retry` | `<T>(scheduler: TimerSchedulerPort, fn: () => Promise<T>, options: RetryOptions) => Promise<T>` | First success or last error | `@hex-di/clock` |

### AsyncLocalStorage Utilities

| Function | Signature | Returns | Entry Point |
|----------|-----------|---------|-------------|
| `createClockContext` | `() => { storage, run, get }` | Typed `AsyncLocalStorage<ClockContext>` wrapper | `@hex-di/clock` |

### Record Integrity Functions

| Function                               | Signature                                                                                     | Returns                                                                               | Entry Point     |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------- |
| `computeTemporalContextDigest`         | `(ctx: TemporalContext) => TemporalContextDigest`                                             | Frozen SHA-256 digest of canonical JSON serialization for per-record tamper detection | `@hex-di/clock` |
| `computeOverflowTemporalContextDigest` | `(ctx: OverflowTemporalContext) => TemporalContextDigest`                                     | Frozen SHA-256 digest for overflow context records                                    | `@hex-di/clock` |
| `verifyTemporalContextDigest`          | `(ctx: TemporalContext \| OverflowTemporalContext, digest: TemporalContextDigest) => boolean` | Constant-time digest verification; returns `true` if record is intact                 | `@hex-di/clock` |

### Deserialization Functions

| Function                             | Signature                                                                 | Returns                                                                                                                  | Entry Point     |
| ------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `deserializeTemporalContext`         | `(raw: unknown) => Result<TemporalContext, DeserializationError>`         | Validated frozen `TemporalContext` from archived JSON, or `DeserializationError` for invalid/unsupported schema versions | `@hex-di/clock` |
| `deserializeOverflowTemporalContext` | `(raw: unknown) => Result<OverflowTemporalContext, DeserializationError>` | Validated frozen `OverflowTemporalContext` from archived JSON                                                            | `@hex-di/clock` |
| `deserializeClockDiagnostics`        | `(raw: unknown) => Result<ClockDiagnostics, DeserializationError>`        | Validated frozen `ClockDiagnostics` from archived JSON                                                                   | `@hex-di/clock` |

### Error Types

| Type                       | `_tag`                       | Fields                                                                                                                                                 | Description                                                                                                                                                                                                                |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SequenceOverflowError`    | `'SequenceOverflowError'`    | `lastValue: number`, `message: string`                                                                                                                 | Returned in `err()` when sequence counter reaches `MAX_SAFE_INTEGER`                                                                                                                                                       |
| `ClockStartupError`        | `'ClockStartupError'`        | `check: 'ST-1' \| 'ST-2' \| 'ST-3' \| 'ST-4' \| 'ST-5'`, `message: string`, `observedValue: number`                                                    | Returned in `err()` when platform API startup self-test fails (21 CFR 11.10(h)). ST-4 is GxP-mode only (platform API freeze check). ST-5 detects `performance.timeOrigin` drift (highResNow/wallClockNow divergence > 1s). |
| `ClockRangeError`          | `'ClockRangeError'`          | `parameter: string`, `value: number`, `message: string`                                                                                                | Returned in `err()` when `advance()` receives a negative millisecond value                                                                                                                                                 |
| `SignatureValidationError` | `'SignatureValidationError'` | `field: string`, `message: string`                                                                                                                     | Returned by `validateSignableTemporalContext()` when a signature field is missing, empty, or structurally invalid per 21 CFR 11.50                                                                                         |
| `DeserializationError`     | `'DeserializationError'`     | `schemaType: string`, `expectedVersions: ReadonlyArray<number>`, `actualVersion: number \| undefined`, `field: string \| undefined`, `message: string` | Returned by deserialization utilities when archived records have unsupported schema versions or invalid structure                                                                                                          |
| `ClockTimeoutError`        | `'ClockTimeoutError'`        | `expected: number`, `actual: number`, `timeoutMs: number`, `message: string`                                                                           | Returned when `blockUntil()` times out waiting for the expected pending timer count. Exported from `@hex-di/clock/testing`.                                                                                               |
| `RetentionValidationError` | `'RetentionValidationError'` | `field: string`, `message: string`                                                                                                                     | Returned by `validateRetentionMetadata()` when retention policy fields are invalid or incomplete. Exported from `@hex-di/clock`.                                                                                          |
| `BrandingValidationError`  | `'BrandingValidationError'`  | `expectedDomain: 'monotonic' \| 'wallClock' \| 'highRes'`, `value: number`, `message: string`                                                          | Returned by validated branding utilities (`asMonotonicValidated`, etc.) when value fails plausibility check. Exported from `@hex-di/clock`.                                                                               |

> **Design rationale — testing-only export scope:** `ClockTimeoutError` is exported exclusively from `@hex-di/clock/testing` because the `blockUntil()` API that produces it is itself a testing-only utility (see §5 Testing Support). Production clock adapters never surface this error type. Consumer test suites that import `@hex-di/clock/testing` receive `ClockTimeoutError` automatically; production code that imports only `@hex-di/clock` does not.

### Error Code Registry

The following central registry documents all error codes, their triggering conditions, severity classifications, and recommended recovery actions. Cross-referenced from recovery procedures (§ 6.7), FMEA (§ 6.11), and qualification protocols (§ 6.2).

| Code | Error Type | Trigger Condition | Severity | GxP Impact | Recovery Action |
|---|---|---|---|---|---|
| **ST-1** | `ClockStartupError` | `monotonicNow()` returns a negative value at startup | Critical | Adapter cannot provide monotonic time; no temporal context production possible | Investigate platform `performance.now()` availability. Restart process. If persistent, check for `performance` API polyfill interference (DQ-3). |
| **ST-2** | `ClockStartupError` | `wallClockNow()` returns a value before 2020-01-01 epoch (1577836800000ms) | Critical | Wall-clock timestamps would be implausible; audit trail records would have invalid dates | Verify system clock is set correctly (`date` command). Verify NTP synchronization (DQ-2). Restart process after clock correction. |
| **ST-3** | `ClockStartupError` | Two consecutive `monotonicNow()` calls return regressing values (second < first) | Critical | Monotonic guarantee violated at the platform level; sequence ordering unreliable | Investigate platform monotonic clock regression (hardware issue, VM migration). Restart process. If persistent, escalate to L4. |
| **ST-4** | `ClockStartupError` | GxP mode enabled (`{ gxp: true }`) and `Object.isFrozen(Date)` or `Object.isFrozen(performance)` returns `false` | Major | Platform APIs can be tampered with at runtime, compromising anti-tampering controls | Add `Object.freeze(Date)` and `Object.freeze(performance)` to application entry point before `createSystemClock()` call (DQ-3). |
| **ST-5** | `ClockStartupError` | `highResNow()` and `wallClockNow()` diverge by more than 1000ms at startup | Major | `performance.timeOrigin` drift detected; high-resolution timestamps unreliable | Verify NTP synchronization. Check for `performance.timeOrigin` anomalies. Restart process. If persistent, file platform bug report. |
| **SEQ-OVF** | `SequenceOverflowError` | Sequence counter reaches `Number.MAX_SAFE_INTEGER` (2^53 - 1) | Critical | No further audit trail entries can be created with valid sequence numbers | Restart process to create new generator (starts from 1). Use `createOverflowContext()` to record the overflow event itself. Investigate capacity planning (§ 3.1). |
| **CLK-RANGE** | `ClockRangeError` | `VirtualClockAdapter.advance()` called with negative milliseconds | Low | Testing only (VirtualClockAdapter is test infrastructure) | Pass a non-negative value to `advance()`. Use `jumpWallClock()` for backward wall-clock simulation. |
| **SIG-VAL** | `SignatureValidationError` | `validateSignableTemporalContext()` detects incomplete or invalid electronic signature fields | Major | Invalid electronic signature per 21 CFR 11.50; record cannot be accepted as signed | Ensure all 5 signature fields (`signerName`, `signerId`, `signedAt`, `meaning`, `method`) are populated with valid values before calling `validateSignableTemporalContext()`. |
| **DESER** | `DeserializationError` | `deserializeTemporalContext()` (or overflow/diagnostics variants) receives archived JSON with unsupported schema version or invalid structure | Major | Archived records cannot be reconstituted; potential data availability issue (ALCOA+ Available) | Verify the archived record's `schemaVersion` is in the `expectedVersions` list. If the version is genuinely unsupported, a schema migration utility may be needed. |
| **CLK-TIMEOUT** | `ClockTimeoutError` | `blockUntil()` times out waiting for expected pending timer count | Low | Testing only (VirtualTimerScheduler is test infrastructure) | Increase `timeoutMs` option or investigate why the expected timers are not being registered. |
| **RET-VAL** | `RetentionValidationError` | `validateRetentionMetadata()` detects invalid retention policy fields | Major | Retention policy may be incorrectly configured, risking premature record deletion | Verify all `RetentionMetadata` fields: `retentionPeriodDays` (positive integer), dates (valid ISO 8601), `retentionBasis` and `recordType` (non-empty strings). |
| **BRD-VAL** | `BrandingValidationError` | Validated branding utility (`asMonotonicValidated`, etc.) detects implausible value | Low | Misbranded timestamp could corrupt audit trail semantic integrity | Verify the value's semantic origin. Use zero-cost identity functions for production hot paths. |

### Error Factory Functions

| Function                         | Signature                                                                                                                                                                | Returns             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `createSequenceOverflowError`    | `(lastValue: number) => SequenceOverflowError`                                                                                                                           | Frozen error object |
| `createClockStartupError`        | `(check: 'ST-1' \| 'ST-2' \| 'ST-3' \| 'ST-4' \| 'ST-5', observedValue: number, message: string) => ClockStartupError`                                                   | Frozen error object |
| `createClockRangeError`          | `(parameter: string, value: number, message: string) => ClockRangeError`                                                                                                 | Frozen error object |
| `createSignatureValidationError` | `(field: string, message: string) => SignatureValidationError`                                                                                                           | Frozen error object |
| `createDeserializationError`     | `(schemaType: string, expectedVersions: ReadonlyArray<number>, actualVersion: number \| undefined, field: string \| undefined, message: string) => DeserializationError` | Frozen error object |
| `createClockTimeoutError`        | `(expected: number, actual: number, timeoutMs: number) => ClockTimeoutError`                                                                                             | Frozen error object (exported from `@hex-di/clock/testing`) |
| `createBrandingValidationError`  | `(expectedDomain: 'monotonic' \| 'wallClock' \| 'highRes', value: number, message: string) => BrandingValidationError`                                                   | Frozen error object |

### Configuration Types

| Type                     | Fields                                                                              | Description                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `SystemClockOptions`     | `gxp?: boolean`                                                                     | Options for `createSystemClock`. When `gxp: true`, enables ST-4 platform API freeze verification. |
| `VirtualClockOptions`    | `initialMonotonic?: number`, `initialWallClock?: number`, `initialHighRes?: number`, `autoAdvance?: number` | Options for `createVirtualClock`. `autoAdvance` sets ms per read (0 = disabled).                  |
| `VirtualSequenceOptions` | `startAt?: number`                                                                  | Options for `createVirtualSequenceGenerator`                                                      |
| `CachedClockOptions`     | `source: ClockPort`, `updateIntervalMs?: number`                                    | Options for `createCachedClock`. `updateIntervalMs` defaults to 1.                                |
| `EdgeRuntimeClockOptions`| `gxp?: boolean`                                                                     | Options for `createEdgeRuntimeClock`.                                                              |
| `HostBridgeClockOptions` | `adapterName: string`, `platform: 'react-native' \| 'wasm' \| 'unknown'`, `gxp?: boolean` | Options for `createHostBridgeClock`.                                                         |
| `BlockUntilOptions`      | `timeoutMs?: number`                                                                | Options for `blockUntil()`. Defaults to 5000ms.                                                   |
| `PeriodicEvaluationConfig` | `intervalMs: number`, `baselineDiagnostics: ClockDiagnostics`, `baselineCapabilities: ClockCapabilities`, `onDriftDetected`, `onBaselineMismatch`, `driftReferenceProvider?`, `driftThresholdMs?` | Configuration for `setupPeriodicClockEvaluation()` utility (CLK-GXP-007a). |

### Diagnostics Types

| Type               | Fields                                                                                                                                                                                      | Description                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `ClockDiagnostics`  | `adapterName: string`, `monotonicSource: 'performance.now' \| 'Date.now-clamped' \| 'host-bridge'`, `highResSource: 'performance.timeOrigin+now' \| 'Date.now' \| 'host-bridge' \| 'host-bridge-wallclock'`, `platformResolutionMs: number \| undefined`, `cryptoFipsMode: boolean \| undefined` | Frozen clock source attestation snapshot with FIPS mode detection |
| `ClockCapabilities` | `hasMonotonicTime: boolean`, `hasHighResOrigin: boolean`, `crossOriginIsolated: boolean \| undefined`, `estimatedResolutionMs: number`, `platform: 'node' \| 'deno' \| 'bun' \| 'browser' \| 'edge-worker' \| 'react-native' \| 'wasm' \| 'unknown'`, `highResDegraded: boolean`, `monotonicDegraded: boolean` | Frozen platform capabilities snapshot |

### Branded Timestamp Types

| Type                   | Base Type | Brand Symbol      | Description                                                  |
| ---------------------- | --------- | ----------------- | ------------------------------------------------------------ |
| `MonotonicTimestamp`   | `number`  | `MonotonicBrand`  | Phantom branded type for monotonic time values               |
| `WallClockTimestamp`   | `number`  | `WallClockBrand`  | Phantom branded type for wall-clock epoch values             |
| `HighResTimestamp`     | `number`  | `HighResBrand`    | Phantom branded type for high-resolution epoch values        |

All three are subtypes of `number` (covariant widening). Cross-domain assignment is a compile-time error. Arithmetic produces `number`.

### Branded Duration Types

| Type                   | Base Type | Brand Symbol              | Description                                           |
| ---------------------- | --------- | ------------------------- | ----------------------------------------------------- |
| `MonotonicDuration`    | `number`  | `MonotonicDurationBrand`  | Phantom branded type for monotonic elapsed time       |
| `WallClockDuration`    | `number`  | `WallClockDurationBrand`  | Phantom branded type for wall-clock elapsed time      |

Both are subtypes of `number`. Cross-domain assignment is a compile-time error. See §2.10 for semantics.

### Duration & Temporal Interop Functions

| Function | Signature | Returns | Entry Point |
|----------|-----------|---------|-------------|
| `elapsed` | `(clock: ClockPort, since: MonotonicTimestamp) => MonotonicDuration` | Branded monotonic duration since `since` | `@hex-di/clock` |
| `asMonotonicDuration` | `(ms: number) => MonotonicDuration` | Identity branding for monotonic durations | `@hex-di/clock` |
| `asWallClockDuration` | `(ms: number) => WallClockDuration` | Identity branding for wall-clock durations | `@hex-di/clock` |
| `durationGt` | `(a: MonotonicDuration, b: MonotonicDuration) => boolean` | Type-safe `a > b` | `@hex-di/clock` |
| `durationLt` | `(a: MonotonicDuration, b: MonotonicDuration) => boolean` | Type-safe `a < b` | `@hex-di/clock` |
| `durationBetween` | `(value: MonotonicDuration, min: MonotonicDuration, max: MonotonicDuration) => boolean` | Inclusive range check | `@hex-di/clock` |
| `toTemporalInstant` | `(timestamp: WallClockTimestamp \| HighResTimestamp) => Temporal.Instant` | TC39 Temporal conversion (throws if unavailable) | `@hex-di/clock` |
| `fromTemporalInstant` | `(instant: Temporal.Instant) => WallClockTimestamp` | Epoch ms from Temporal.Instant | `@hex-di/clock` |

### Internal Utilities (Not Exported)

| Function                | Signature                                         | Description                                                                                                                             |
| ----------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `getPerformance`        | `() => PerformanceLike \| undefined`              | Platform detection for `performance` global                                                                                             |
| `createClampedFallback` | `(capturedDateNow: () => number) => () => number` | Monotonic `Date.now()` wrapper with backward-jump clamping. Accepts captured `Date.now` reference for anti-tampering (see section 4.1). |

### Export Map

```json
{
  ".": {
    "types": "./src/index.ts",
    "import": "./src/index.ts"
  },
  "./testing": {
    "types": "./src/testing/index.ts",
    "import": "./src/testing/index.ts"
  }
}
```

### Main Entry Point (`@hex-di/clock`)

Exports: `ClockPort`, `SequenceGeneratorPort`, `ClockDiagnosticsPort`, `ClockSourceChangedSinkPort`, `TimerSchedulerPort`, `RetentionPolicyPort`, `ClockDiagnostics`, `ClockCapabilities`, `TemporalContext`, `TemporalContextFactory`, `OverflowTemporalContext`, `TemporalContextDigest`, `SignableTemporalContext`, `ClockSourceChangedEvent`, `ClockSourceChangedSink`, `ClockGxPMetadata`, `HardwareClockAdapter`, `HardwareClockAdapterOptions`, `HardwareClockStatus`, `HostClockBridge`, `HostBridgeClockOptions`, `EdgeRuntimeClockOptions`, `SystemClockOptions`, `TimerHandle`, `CachedClockPort`, `CachedClockLifecycle`, `CachedClockAdapter`, `CachedClockOptions`, `RetentionMetadata`, `PeriodicEvaluationConfig`, `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp`, `MonotonicDuration`, `WallClockDuration`, `ClockContext`, `RetryOptions`, `SystemClockAdapter`, `SystemSequenceGeneratorAdapter`, `SystemTimerSchedulerAdapter`, `SystemCachedClockAdapter`, `EdgeRuntimeClockAdapter`, `SystemClockDiagnosticsAdapter`, `createSystemClock`, `createSystemSequenceGenerator`, `createSystemTimerScheduler`, `createCachedClock`, `createEdgeRuntimeClock`, `createHostBridgeClock`, `createSystemClockAdapter`, `createEdgeRuntimeClockAdapter`, `createHostBridgeClockAdapter`, `createTemporalContextFactory`, `createClockSourceBridge`, `createClockContext`, `isOverflowTemporalContext`, `validateSignableTemporalContext`, `validateRetentionMetadata`, `calculateRetentionExpiryDate`, `computeTemporalContextDigest`, `computeOverflowTemporalContextDigest`, `verifyTemporalContextDigest`, `getClockGxPMetadata`, `deserializeTemporalContext`, `deserializeOverflowTemporalContext`, `deserializeClockDiagnostics`, `delay`, `timeout`, `measure`, `retry`, `elapsed`, `asMonotonic`, `asWallClock`, `asHighRes`, `asMonotonicDuration`, `asWallClockDuration`, `durationGt`, `durationLt`, `durationBetween`, `toTemporalInstant`, `fromTemporalInstant`, `asMonotonicValidated`, `asWallClockValidated`, `asHighResValidated`, `createProcessInstanceId`, `setupPeriodicClockEvaluation`, `SequenceOverflowError`, `createSequenceOverflowError`, `ClockStartupError`, `createClockStartupError`, `ClockRangeError`, `createClockRangeError`, `SignatureValidationError`, `createSignatureValidationError`, `RetentionValidationError`, `createRetentionValidationError`, `BrandingValidationError`, `createBrandingValidationError`, `DeserializationError`, `createDeserializationError`

### Testing Entry Point (`@hex-di/clock/testing`)

Exports: `VirtualClockAdapter`, `VirtualSequenceGenerator`, `VirtualTimerScheduler`, `BlockUntilOptions`, `ClockTimeoutError`, `createClockTimeoutError`, `createVirtualClock`, `createVirtualSequenceGenerator`, `createVirtualTimerScheduler`, `createVirtualCachedClock`, `VirtualClockOptions`, `VirtualSequenceOptions`, `VirtualClockValues`, `assertMonotonic`, `assertTimeBetween`, `assertWallClockPlausible`, `assertSequenceOrdered`
