# 02 - Clock Port

## 2.1 ClockPort Interface

```typescript
interface ClockPort {
  readonly monotonicNow: () => MonotonicTimestamp;
  readonly wallClockNow: () => WallClockTimestamp;
  readonly highResNow: () => HighResTimestamp;
}
```

All three functions are synchronous, pure (no side effects beyond reading time), and return branded timestamp types in milliseconds (see §2.5 for branded type definitions). The branded types are subtypes of `number`, so existing `number`-accepting code continues to work.

The port is defined as a plain interface with readonly function properties (not methods) to enable destructuring and partial application without `this`-binding issues:

```typescript
const { monotonicNow } = container.resolve(ClockPort);
const start = monotonicNow();
// ... work ...
const duration = monotonicNow() - start;
```

### Port Definition

`ClockPort` MUST be defined as a directed port using `@hex-di/core`'s `createPort`:

```typescript
const ClockPort = createPort<ClockPort>("ClockPort");
```

This enables registration in the HexDI container graph and inspection via the standard introspection infrastructure.

## 2.2 Monotonic Time

### `monotonicNow(): MonotonicTimestamp`

Returns a monotonically increasing value in milliseconds, relative to an arbitrary epoch (typically process start). Immune to system clock adjustments (NTP jumps, daylight saving, manual changes).

**Semantic contract:**

- For any two calls `a = monotonicNow()` and `b = monotonicNow()` where `a` is called before `b`: `b >= a` MUST hold.
- The return value MUST NOT decrease, even if the system wall clock is adjusted.
- The return value has no defined relationship to calendar time. It MUST NOT be used for cross-process timestamp correlation.
- The return value MAY have sub-millisecond fractional precision (e.g., `1234.567`), depending on the platform.

**Use cases:**

- Duration measurement (HTTP request latency, resolution timing)
- Event ordering within a single process
- Timeout detection
- Hash chain timestamp fields in audit trails (paired with `wallClockNow()` for absolute time)

**Platform mapping:**

| Platform                           | Source                                                  |
| ---------------------------------- | ------------------------------------------------------- |
| Node.js 16+                        | `performance.now()`                                     |
| Browsers                           | `performance.now()` (may be coarsened, see section 4.4) |
| Deno                               | `performance.now()`                                     |
| Edge runtimes (Cloudflare Workers, Vercel Edge) | `performance.now()` (coarsened to 1ms)      |
| React Native (via HostClockBridge)              | Bridge-provided monotonic source             |
| WASM / Embedded (via HostClockBridge)           | Bridge-provided monotonic source             |
| Fallback                                        | `Date.now()` (monotonicity NOT guaranteed)   |

REQUIREMENT (CLK-MON-001): When the platform provides `performance.now()`, the `SystemClockAdapter` MUST use it. The `Date.now()` fallback MUST only be used when `performance` is unavailable on `globalThis`.

REQUIREMENT (CLK-MON-002): When the `Date.now()` fallback is active, `monotonicNow()` MUST still enforce monotonicity by clamping: if `Date.now()` returns a value less than the previous return, the previous value MUST be returned instead.

## 2.3 Wall-Clock Time

### `wallClockNow(): WallClockTimestamp`

Returns the current time as milliseconds since the Unix epoch (January 1, 1970 00:00:00 UTC). Equivalent to `Date.now()`.

**Semantic contract:**

- The return value represents absolute calendar time.
- The return value MAY decrease if the system clock is adjusted (NTP correction, manual change).
- The return value has millisecond precision (integer).
- The return value is suitable for cross-process timestamp correlation.

**Use cases:**

- ISO 8601 timestamps in audit entries (`new Date(wallClockNow()).toISOString()`)
- Cache expiration (TTL computation)
- Cross-process event correlation
- Log timestamps for human consumption

**Platform mapping:**

| Platform      | Source       |
| ------------- | ------------ |
| All platforms | `Date.now()` |

### Leap Second Behavior

Leap second handling is delegated entirely to the platform's NTP daemon and OS kernel. `@hex-di/clock` does not detect, compensate for, or report leap seconds.

- `wallClockNow()` reflects the OS-reported UTC value. During a leap second event, the returned value depends on the OS behavior (NTP leap smear or step adjustment).
- `monotonicNow()` is unaffected by leap seconds because it uses `performance.now()`, which is based on a steady clock independent of wall-clock adjustments.
- `highResNow()` is unaffected after process initialization because it is computed from a fixed origin (`performance.timeOrigin`) plus a monotonic base (`performance.now()`).

REQUIREMENT (CLK-WCK-001): `@hex-di/clock` MUST NOT attempt to detect or compensate for leap seconds. The platform's NTP configuration is the authoritative source for UTC correctness, including leap second handling.

**GxP deployment note (ICH Q7 section 6.5):** Organizations deploying in GxP environments MUST include leap second behavior in their platform IQ/OQ qualification plan. The qualification MUST verify that the deployment platform's NTP daemon uses leap smearing (gradual adjustment) rather than step adjustment, as a step adjustment could cause `wallClockNow()` to repeat or skip a second. This is a platform qualification concern, not a `@hex-di/clock` concern, but MUST be documented in the computerized system validation plan.

**GxP deployment checklist item:** Before production deployment, the infrastructure team MUST confirm and document that the NTP daemon is configured with leap smearing enabled (e.g., `leapsmearinterval` in chrony, or Google Public NTP which smears by default). The checklist entry MUST include: NTP daemon name and version, leap smearing configuration parameter and value, and the date of verification.

## 2.4 High-Resolution Time

### `highResNow(): HighResTimestamp`

Returns the current time as milliseconds since the Unix epoch with sub-millisecond precision. Combines `performance.timeOrigin` with `performance.now()` to provide both absolute positioning and high resolution.

**Semantic contract:**

- The return value represents absolute calendar time with sub-millisecond fractional precision (e.g., `1707753600123.456`).
- The return value MUST NOT decrease under normal NTP-synchronized operation. In rare edge cases, it MAY decrease if the OS applies a clock step-adjustment during process initialization, because the fixed `performance.timeOrigin` captured at process start becomes inaccurate. For strict ordering, use `monotonicNow()` or `SequenceGeneratorPort`.
- The return value SHOULD have microsecond-level precision when the platform supports it.

**Use cases:**

- Tracing span start/end timestamps (OpenTelemetry-compatible)
- High-precision audit timestamps for GxP environments
- Performance profiling

**Platform mapping:**

| Platform                                        | Source                                       | Precision                      |
| ----------------------------------------------- | -------------------------------------------- | ------------------------------ |
| Node.js 16+                                     | `performance.timeOrigin + performance.now()` | Microsecond                    |
| Browsers (cross-origin-isolated)                | `performance.timeOrigin + performance.now()` | Microsecond                    |
| Browsers (non-isolated)                         | `performance.timeOrigin + performance.now()` | 5-100 microseconds (coarsened) |
| Edge runtimes (Cloudflare Workers, Vercel Edge) | `Date.now()` (timeOrigin unavailable)        | Millisecond                    |
| React Native (via HostClockBridge)              | Bridge-provided high-res source              | Bridge-dependent               |
| WASM / Embedded (via HostClockBridge)           | Bridge-provided high-res source              | Bridge-dependent               |
| Fallback                                        | `Date.now()`                                 | Millisecond                    |

REQUIREMENT (CLK-HRS-001): When `performance.timeOrigin` is not available, `highResNow()` MUST fall back to `Date.now()`. It MUST NOT throw.

### Known Limitations

**`performance.timeOrigin` drift risk (ALCOA+ Accurate):** `highResNow()` computes absolute time as `performance.timeOrigin + performance.now()`. The `performance.timeOrigin` value is captured once by the platform at process startup. If the system clock was incorrect at startup (e.g., NTP had not yet synchronized), all `highResNow()` values for the lifetime of the process will be offset by the initial clock error, even after NTP corrects the system clock.

This is a **platform-level limitation**, not a defect in `@hex-di/clock`. Mitigation is provided at two levels:

**Level 1 — `@hex-di/clock` startup self-test (ST-5):** `createSystemClock()` checks `Math.abs(highResNow() - wallClockNow()) < 1000ms` at construction time. If the divergence exceeds 1 second, `createSystemClock()` returns `err(ClockStartupError)` with check `'ST-5'`, preventing the adapter from being used with a grossly inaccurate `timeOrigin`. This catches the most common cause — NTP not yet synchronized at process start — at the earliest possible point.

**Level 2 — Ecosystem periodic monitoring:** The ecosystem's GxP monitoring infrastructure (any HexDI library that implements periodic drift detection between `wallClockNow()` and `highResNow()`) provides finer-grained ongoing validation beyond the one-time startup check.

**Operational requirement:** GxP deployments MUST ensure NTP synchronization completes before application startup to minimize the `timeOrigin` offset. This aligns with the GAMP 5 risk classification (section 6.1) which mandates NTP pre-sync before process start for `highResNow()` accuracy.

REQUIREMENT (CLK-HRS-002) [OPERATIONAL]: GxP organizations MUST document their process startup sequencing to ensure NTP synchronization precedes application initialization. This is an operational concern outside the scope of `@hex-di/clock` but critical for ALCOA+ Accurate compliance.

**`highResNow()` is not strictly monotonic:** Although `highResNow()` is computed from a monotonic base (`performance.now()`), the fixed origin means the absolute value reflects the clock state at process start. In rare edge cases (e.g., OS clock step-adjustment during process init), the returned value could appear non-monotonic relative to wall-clock expectations. For strict ordering, use `monotonicNow()` or `SequenceGeneratorPort`.

### Relationship Between the Three Functions

```
                    Absolute    Monotonic    Sub-ms Precision
monotonicNow()         No          Yes          Platform-dependent
wallClockNow()         Yes         No           No (integer ms)
highResNow()           Yes         Mostly*      Yes

* highResNow() is computed from a monotonic base (performance.now()) plus
  a fixed origin (performance.timeOrigin), so it is effectively monotonic
  unless the origin itself was computed from an adjusted clock.
```

Consumers MUST choose the function that matches their semantic need. When in doubt:

- **Measuring duration?** Use `monotonicNow()`.
- **Logging a timestamp for humans?** Use `wallClockNow()`.
- **Recording a span for tracing?** Use `highResNow()`.

### Why Not `process.hrtime.bigint()`?

Node.js provides `process.hrtime.bigint()` which returns nanosecond-precision monotonic time as a `BigInt`. `@hex-di/clock` deliberately uses `performance.now()` (returning `number`) instead. The rationale:

| Factor               | `performance.now()` (number)                                                            | `process.hrtime.bigint()` (BigInt)                                                   |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Cross-platform**   | Available in Node.js, browsers, Deno, Bun, Workers                                      | Node.js only                                                                         |
| **Interoperability** | `number` works with all arithmetic operators, `Math.*`, JSON                            | `BigInt` cannot mix with `number` without explicit conversion; not JSON-serializable |
| **Precision needed** | Microsecond (sufficient for audit timestamps, tracing spans)                            | Nanosecond (exceeds any GxP or tracing requirement)                                  |
| **Overhead**         | Minimal (native `number`)                                                               | Higher (BigInt allocation per call; no JIT optimization for BigInt arithmetic in V8) |
| **Ecosystem**        | OpenTelemetry, W3C Performance Timeline, browser DevTools all use `number` milliseconds | No ecosystem standard uses BigInt timestamps                                         |

**Precision argument:** The finest GxP audit timestamp requirement is sub-millisecond (21 CFR Part 211 laboratory data). `performance.now()` on Node.js 18+ provides microsecond precision — three orders of magnitude finer than required. Nanosecond precision from `process.hrtime.bigint()` provides no regulatory or practical benefit.

**Portability argument:** `@hex-di/clock` targets all JavaScript runtimes (Node.js, browsers, Deno, Bun). Using `process.hrtime.bigint()` would require a runtime-specific code path and a separate fallback for non-Node environments, adding complexity without benefit.

REQUIREMENT (CLK-HRS-003): `@hex-di/clock` MUST NOT use `process.hrtime.bigint()` or any `BigInt`-returning timing API. All timing values MUST be `number` (IEEE 754 double-precision float) for cross-platform compatibility and ecosystem interoperability.

## 2.5 Branded Timestamp Types

All three `ClockPort` methods return `number`. While this is convenient for arithmetic, it permits accidental misuse: a monotonic timestamp can be passed where a wall-clock timestamp is expected, and the type system cannot catch the error. Branded timestamp types close this gap with zero runtime cost.

### Phantom Brand Declarations

```typescript
declare const MonotonicBrand: unique symbol;
declare const WallClockBrand: unique symbol;
declare const HighResBrand: unique symbol;

type MonotonicTimestamp = number & { readonly [MonotonicBrand]: true };
type WallClockTimestamp = number & { readonly [WallClockBrand]: true };
type HighResTimestamp = number & { readonly [HighResBrand]: true };
```

**Key properties:**

- **Zero runtime cost:** The brand exists only at the type level. At runtime, `MonotonicTimestamp` is a plain `number` — there is no wrapper object, no prototype chain modification, no allocation overhead.
- **Arithmetic produces `number`:** `monotonicNow() - monotonicNow()` yields `number`, not `MonotonicTimestamp`. This is correct: a duration is not a timestamp.
- **Cross-domain assignment blocked:** Assigning a `MonotonicTimestamp` to a `WallClockTimestamp` variable is a compile-time error. This prevents the most common misuse — passing a relative monotonic value where an absolute wall-clock value is expected.
- **Covariant widening to `number`:** A `MonotonicTimestamp` IS-A `number` (structural subtyping). Any function accepting `number` also accepts `MonotonicTimestamp`. This ensures branded types do not break existing `number`-accepting APIs.

### Branded ClockPort Interface

```typescript
interface ClockPort {
  readonly monotonicNow: () => MonotonicTimestamp;
  readonly wallClockNow: () => WallClockTimestamp;
  readonly highResNow: () => HighResTimestamp;
}
```

This is a **breaking change** from revision 2.1 where all three methods returned `number`. Consumer code that explicitly annotates the return type as `number` will continue to work (covariant widening), but code that passes a `wallClockNow()` result to a parameter typed as `MonotonicTimestamp` will now correctly fail at compile time.

### Branding Utility Functions

```typescript
function asMonotonic(ms: number): MonotonicTimestamp;
function asWallClock(ms: number): WallClockTimestamp;
function asHighRes(ms: number): HighResTimestamp;
```

These functions are **identity at runtime** — they return their argument unchanged. At the type level, they narrow `number` to the branded type. They exist to support:

1. **Adapter implementations:** `SystemClockAdapter` and `VirtualClockAdapter` use these to brand raw platform values.
2. **Deserialization:** When reconstructing timestamps from JSON (`number` values), the branding function re-establishes the type constraint.
3. **Test fixtures:** Test code that constructs timestamps from literal values.

**When to use branding utilities:**

```typescript
// USE: converting legacy number timestamps during migration or deserialization
const archived: number = JSON.parse(record).wallClockTimestamp;
const branded: WallClockTimestamp = asWallClock(archived);

// USE: constructing test fixtures with literal values
const testTimestamp: MonotonicTimestamp = asMonotonic(1000);

// USE: inside adapter implementations that read from platform APIs
const mono: MonotonicTimestamp = asMonotonic(performance.now());
```

**When NOT to use branding utilities:**

```typescript
// DO NOT USE: values already returned from ClockPort methods are already branded
const clock: ClockPort = /* ... */;
const mono = clock.monotonicNow(); // Already MonotonicTimestamp — no branding needed
const wall = clock.wallClockNow(); // Already WallClockTimestamp

// DO NOT USE: values from TemporalContext fields are already branded
const ctx: TemporalContext = factory.create().value;
const seq = ctx.sequenceNumber; // Already number
const wall = ctx.wallClockTimestamp; // Already WallClockTimestamp
```

**Important:** By default, these utilities provide NO runtime validation — they trust the caller to provide a semantically correct value. Calling `asMonotonic(Date.now())` compiles and runs, but produces a `MonotonicTimestamp` that actually contains a wall-clock value. The type system cannot catch semantic misuse of branding utilities. GxP consumers SHOULD only use branding utilities at system boundaries (deserialization, migration, adapter construction) where the value's semantic origin is documented.

### Validated Branding Utilities (Development/Testing Aid)

For development and testing environments where catching misbranded timestamps early is valuable, `@hex-di/clock` provides validated variants that perform plausibility checks:

```typescript
interface BrandingValidationError {
  readonly _tag: "BrandingValidationError";
  readonly expectedDomain: "monotonic" | "wallClock" | "highRes";
  readonly value: number;
  readonly message: string;
}

function asMonotonicValidated(ms: number): Result<MonotonicTimestamp, BrandingValidationError>;
function asWallClockValidated(ms: number): Result<WallClockTimestamp, BrandingValidationError>;
function asHighResValidated(ms: number): Result<HighResTimestamp, BrandingValidationError>;
```

**Validation rules:**

- `asMonotonicValidated(ms)`: Verifies `ms >= 0` and `ms < 1e12` (monotonic values are relative to process start — a value exceeding ~31 years is implausible). Returns `err(BrandingValidationError)` if the check fails.
- `asWallClockValidated(ms)`: Verifies `ms >= 946684800000` (2000-01-01T00:00:00Z — no wall-clock timestamp should predate Y2K) and `ms <= Date.now() + 86400000` (no more than 1 day in the future). Returns `err(BrandingValidationError)` if the check fails.
- `asHighResValidated(ms)`: Applies the same checks as `asWallClockValidated` (high-res timestamps are absolute epoch-based with sub-ms precision).

REQUIREMENT (CLK-BRD-007): `asMonotonicValidated`, `asWallClockValidated`, and `asHighResValidated` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-BRD-008): The validated branding utilities MUST return `Result<BrandedType, BrandingValidationError>`, never throw. The `BrandingValidationError` object MUST be frozen with `Object.freeze()`.

REQUIREMENT (CLK-BRD-009): The validated branding utilities are intended for development, testing, and deserialization at system boundaries. Production hot paths SHOULD use the zero-cost identity branding functions (`asMonotonic`, `asWallClock`, `asHighRes`) for performance.

REQUIREMENT (CLK-BRD-001): `asMonotonic`, `asWallClock`, and `asHighRes` MUST be identity functions at runtime — they MUST return their argument without modification (no cloning, no wrapping, no validation).

REQUIREMENT (CLK-BRD-002): `MonotonicTimestamp`, `WallClockTimestamp`, and `HighResTimestamp` MUST be exported as type aliases from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-BRD-003): `asMonotonic`, `asWallClock`, and `asHighRes` MUST be exported as value-level functions from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-BRD-004): Arithmetic on branded timestamps (addition, subtraction, multiplication, division) MUST produce `number`, not a branded type. TypeScript's built-in numeric operator resolution handles this automatically — no special implementation is required.

REQUIREMENT (CLK-BRD-005): Assigning a `MonotonicTimestamp` to a variable of type `WallClockTimestamp` (or any other cross-domain assignment) MUST be a compile-time error. This is enforced by the `unique symbol` brand declarations.

REQUIREMENT (CLK-BRD-006): Assigning a branded timestamp to a variable of type `number` MUST compile successfully. Branded types are subtypes of `number` (covariant widening).

### Cascading Impact

The branded types cascade through all interfaces and factories that consume or produce `ClockPort` values:

- `SystemClockAdapter` (§4.1): Factory returns `ClockPort` with branded return types.
- `VirtualClockAdapter` (§5.1): `advance()` and `set()` operate on internal `number` state but external reads return branded types. The `getMonotonicTime()`, `getWallClockTime()`, `getHighResTime()` accessor methods return branded types.
- `TemporalContext` (§7): `monotonicTimestamp` field becomes `MonotonicTimestamp`, `wallClockTimestamp` becomes `WallClockTimestamp`.
- `ClockDiagnosticsPort` (§4.3): Diagnostic timing values remain `number` (they are metadata about precision, not timestamps).

## 2.6 Timer/Scheduler Port

`ClockPort` abstracts *reading* time. However, many use cases also require *scheduling* future work — `setTimeout`, `setInterval`, and `sleep`. When these are called directly on platform globals, they cannot be controlled through DI, making time-dependent code untestable.

`TimerSchedulerPort` is a **separate port** (not part of `ClockPort`) following the Single Responsibility Principle: `ClockPort` reads time; `TimerSchedulerPort` schedules work.

### TimerHandle

```typescript
interface TimerHandle {
  readonly _tag: "TimerHandle";
  readonly id: number;
}
```

`TimerHandle` is an opaque handle returned by `setTimeout` and `setInterval`. The `_tag` discriminant prevents accidental confusion with raw `number` timer IDs. The `id` field is exposed for diagnostics only — consumers SHOULD NOT pass it to platform `clearTimeout`/`clearInterval`.

REQUIREMENT (CLK-TMR-001): `TimerHandle` MUST be a frozen object with `_tag: "TimerHandle"` and a numeric `id` field.

### TimerSchedulerPort Interface

```typescript
interface TimerSchedulerPort {
  readonly setTimeout: (callback: () => void, ms: number) => TimerHandle;
  readonly setInterval: (callback: () => void, ms: number) => TimerHandle;
  readonly clearTimeout: (handle: TimerHandle) => void;
  readonly clearInterval: (handle: TimerHandle) => void;
  readonly sleep: (ms: number) => Promise<void>;
}
```

### Port Definition

```typescript
const TimerSchedulerPort = createPort<TimerSchedulerPort>("TimerSchedulerPort");
```

### `setTimeout(callback, ms): TimerHandle`

Schedules `callback` to execute once after `ms` milliseconds. Returns a `TimerHandle` for cancellation.

**Semantic contract:**

- `ms` MUST be a non-negative finite number. If `ms` is `0`, the callback fires on the next scheduler tick (platform-defined for system, immediate for virtual).
- The callback MUST NOT be called synchronously within `setTimeout` itself.
- The returned handle is valid until the callback fires or `clearTimeout` is called.

REQUIREMENT (CLK-TMR-002): `setTimeout` MUST NOT throw for valid inputs. Invalid inputs (negative `ms`, non-function callback) MUST throw `TypeError`.

### `setInterval(callback, ms): TimerHandle`

Schedules `callback` to execute repeatedly every `ms` milliseconds. Returns a `TimerHandle` for cancellation.

**Semantic contract:**

- `ms` MUST be a positive finite number. `ms === 0` MUST throw `TypeError` (zero-interval repeats would create infinite loops in virtual schedulers).
- The callback MUST NOT be called synchronously within `setInterval` itself.
- Intervals continue until `clearInterval` is called.

REQUIREMENT (CLK-TMR-003): `setInterval` MUST throw `TypeError` when `ms` is `0`, negative, `NaN`, or `Infinity`.

### `clearTimeout(handle): void` / `clearInterval(handle): void`

Cancels a pending timer or interval. If the handle has already fired or been cancelled, the call is a no-op (idempotent).

REQUIREMENT (CLK-TMR-004): `clearTimeout` and `clearInterval` MUST be idempotent. Calling either with an already-fired or already-cancelled handle MUST NOT throw.

### `sleep(ms): Promise<void>`

Returns a promise that resolves after `ms` milliseconds. Convenience wrapper over `setTimeout`.

**Semantic contract:**

- Equivalent to `new Promise(resolve => this.setTimeout(resolve, ms))`.
- `sleep(0)` resolves on the next scheduler tick.
- The returned promise MUST NOT reject under normal conditions.

REQUIREMENT (CLK-TMR-005): `sleep` MUST be implemented in terms of the port's own `setTimeout`, not the platform `setTimeout`. This ensures virtual sleep is controllable via virtual time advancement.

REQUIREMENT (CLK-TMR-006): `TimerSchedulerPort` MUST be exported from the `@hex-di/clock` main entry point. `TimerHandle` MUST be exported as a type.

## 2.7 Cached Clock Port

In ultra-high-throughput code paths (event logging, metrics collection, rate limiting), even `performance.now()` can become a measurable bottleneck when called millions of times per second. A cached clock trades freshness for throughput by periodically snapshotting the source clock and returning the cached value on subsequent reads.

### Design Decision: Separate Type, Not an Extension

`CachedClockPort` is deliberately **NOT** an extension of `ClockPort`. If it extended `ClockPort`, a `CachedClockAdapter` could be silently passed where a `ClockPort` is expected — for example, as the clock source for `TemporalContext` creation. This would produce audit trail timestamps with stale values, violating ALCOA+ Contemporaneous.

By using a structurally distinct interface, the type system prevents accidental substitution:

```typescript
// This MUST be a compile-time error:
const temporalFactory = createTemporalContextFactory(cachedClock); // Error: CachedClockPort is not ClockPort
```

### CachedClockPort Interface

```typescript
interface CachedClockPort {
  readonly recentMonotonicNow: () => MonotonicTimestamp;
  readonly recentWallClockNow: () => WallClockTimestamp;
}
```

The method names (`recentMonotonicNow`, `recentWallClockNow`) intentionally differ from `ClockPort` methods (`monotonicNow`, `wallClockNow`) to prevent structural typing from making `CachedClockPort` accidentally assignable to `ClockPort`. The `recent` prefix signals to consumers that the value may be stale.

`highResNow()` is deliberately excluded — the entire point of high-resolution time is precision, which caching negates.

### CachedClockLifecycle Interface

```typescript
interface CachedClockLifecycle {
  readonly start: () => void;
  readonly stop: () => void;
  readonly isRunning: () => boolean;
}
```

Lifecycle management is separated into its own interface to allow consumers that only need to read cached values to depend on `CachedClockPort` alone, without visibility into lifecycle operations.

### CachedClockAdapter Type

```typescript
type CachedClockAdapter = CachedClockPort & CachedClockLifecycle;
```

The full adapter combines both interfaces. Factories return `CachedClockAdapter`; consumers depend on `CachedClockPort`.

REQUIREMENT (CLK-CAC-001): `CachedClockPort` MUST NOT extend, implement, or be structurally assignable to `ClockPort`. The method names MUST differ from `ClockPort` method names to prevent structural compatibility.

REQUIREMENT (CLK-CAC-002): `CachedClockPort` MUST NOT include a `highResNow()` or `recentHighResNow()` method. High-resolution time is incompatible with caching.

REQUIREMENT (CLK-CAC-003): `CachedClockPort`, `CachedClockLifecycle`, and `CachedClockAdapter` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-CAC-004): `recentMonotonicNow()` and `recentWallClockNow()` MUST return branded timestamp types (`MonotonicTimestamp` and `WallClockTimestamp` respectively), matching the branding used by `ClockPort`.

### GxP Restriction

REQUIREMENT (CLK-CAC-005): Cached clock values MUST NOT be used for audit trail timestamps (e.g., `TemporalContext.wallClockTimestamp`). This restriction is documented in FMEA FM-10 and enforced by the structural separation between `CachedClockPort` and `ClockPort`.

## 2.8 Clock Capabilities

Adapters run on platforms with varying timing API support. Rather than a binary "suitable / not suitable" classification, `ClockCapabilities` provides fine-grained introspection so consumers can query exactly what their platform provides and branch accordingly.

### ClockCapabilities Interface

```typescript
interface ClockCapabilities {
  /** Whether the platform provides performance.now() for monotonic time */
  readonly hasMonotonicTime: boolean;
  /** Whether the platform provides performance.timeOrigin for high-resolution absolute time */
  readonly hasHighResOrigin: boolean;
  /** Whether the browser context is cross-origin-isolated (full precision). undefined on non-browser platforms. */
  readonly crossOriginIsolated: boolean | undefined;
  /** Observed or known timer resolution in milliseconds (e.g., 0.005 for 5μs, 1.0 for 1ms coarsened) */
  readonly estimatedResolutionMs: number;
  /** Detected platform identifier */
  readonly platform: "node" | "deno" | "bun" | "browser" | "edge-worker" | "react-native" | "wasm" | "unknown";
  /** Whether high-resolution time is degraded (falls back to Date.now()) */
  readonly highResDegraded: boolean;
  /** Whether monotonic time is degraded (uses Date.now() clamped fallback instead of performance.now()) */
  readonly monotonicDegraded: boolean;
}
```

### Exposure via ClockDiagnosticsPort

`ClockCapabilities` is accessed through an additional method on `ClockDiagnosticsPort`:

```typescript
interface ClockDiagnosticsPort {
  readonly getDiagnostics: () => ClockDiagnostics;
  readonly getCapabilities: () => ClockCapabilities;
}
```

REQUIREMENT (CLK-CAP-001): `getCapabilities()` MUST return a frozen `ClockCapabilities` object.

REQUIREMENT (CLK-CAP-002): `getCapabilities()` MUST be computed once at adapter construction time and cached. It MUST NOT perform runtime detection on every call.

REQUIREMENT (CLK-CAP-003): `hasMonotonicTime` MUST be `true` when the adapter uses `performance.now()` for `monotonicNow()` and `false` when it uses the `Date.now()` clamped fallback.

REQUIREMENT (CLK-CAP-004): `hasHighResOrigin` MUST be `true` when the adapter uses `performance.timeOrigin + performance.now()` for `highResNow()` and `false` when it falls back to `Date.now()`.

REQUIREMENT (CLK-CAP-005): `crossOriginIsolated` MUST be set to `globalThis.crossOriginIsolated` on browser platforms where the property exists, and `undefined` on non-browser platforms.

REQUIREMENT (CLK-CAP-006): `estimatedResolutionMs` MUST reflect the expected timer resolution for the detected platform. For browsers, this MUST account for `crossOriginIsolated` status (e.g., `0.005` for isolated, `1.0` for non-isolated Firefox). For platforms with unknown resolution, the value MUST be `1.0` (conservative millisecond assumption).

REQUIREMENT (CLK-CAP-007): `highResDegraded` MUST be `true` when `highResNow()` falls back to `Date.now()` (no sub-millisecond precision available).

REQUIREMENT (CLK-CAP-008): `monotonicDegraded` MUST be `true` when `monotonicNow()` uses the `Date.now()` clamped fallback instead of `performance.now()`.

REQUIREMENT (CLK-CAP-009): `ClockCapabilities` MUST be exported as a type from the `@hex-di/clock` main entry point.

### Browser crossOriginIsolated Detection

The `SystemClockAdapter` MUST detect `crossOriginIsolated` at construction time to report accurate precision capabilities:

```typescript
const isCrossOriginIsolated =
  typeof globalThis.crossOriginIsolated === "boolean"
    ? globalThis.crossOriginIsolated
    : undefined;
```

- If `crossOriginIsolated === true`: full precision available, report `estimatedResolutionMs` based on browser (e.g., `0.005` for Chrome/Safari, `0.02` for Firefox).
- If `crossOriginIsolated === false`: coarsened precision, report `estimatedResolutionMs` based on browser coarsening policy (e.g., `0.1` for Safari, `1.0` for Firefox).
- If `undefined`: non-browser platform, use platform-specific defaults (e.g., `0.001` for Node.js).

This detection eliminates the "Conditionally Suitable" GxP classification for browsers — the adapter reports its actual precision, and GxP qualification (OQ-4) validates the observed precision against requirements.

REQUIREMENT (CLK-CAP-010): The `SystemClockAdapter` MUST detect `globalThis.crossOriginIsolated` at construction time using `typeof` checks (not `try/catch`). The detected value MUST be stored in the closure and used for `ClockCapabilities.crossOriginIsolated` and `estimatedResolutionMs` computation.

REQUIREMENT (CLK-CAP-011): `ClockCapabilities` is computed once at adapter construction time (CLK-CAP-002) and does not change during the adapter's lifetime. Since adapters are immutable (`Object.freeze()`), capability degradation can only occur when the adapter is replaced (which triggers a `ClockSourceChangedEvent` per § 7.1). GxP consumers MUST treat any `ClockSourceChangedEvent` where the new adapter's `ClockCapabilities.highResDegraded` or `monotonicDegraded` is `true` (and the previous adapter's was `false`) as a critical operational event. The `ClockSourceChangedSink` handler MUST log this degradation with a `TemporalContext` timestamp and alert the Infrastructure Operator per the incident classification matrix (§ 6.7).

## 2.9 Async Combinators

`TimerSchedulerPort` (§2.6) provides low-level `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, and `sleep`. This section specifies higher-level async combinators that compose `TimerSchedulerPort` with `ClockPort` for common async patterns.

These combinators are standalone functions (not port methods) exported from `@hex-di/clock`. They accept `TimerSchedulerPort` and optionally `ClockPort` as parameters, keeping the ports minimal and the combinators testable.

### `delay`

```typescript
function delay(
  scheduler: TimerSchedulerPort,
  ms: number
): Promise<void>;
```

Returns a promise that resolves after `ms` milliseconds. Equivalent to `scheduler.sleep(ms)` but named for readability in pipeline-style code.

REQUIREMENT (CLK-ASY-001): `delay` MUST delegate to `scheduler.sleep(ms)`. It MUST NOT use raw `setTimeout` or any platform timer API directly.

REQUIREMENT (CLK-ASY-002): `delay` MUST reject with `TypeError` for negative, `NaN`, or `Infinity` values of `ms`.

### `timeout`

```typescript
function timeout<T>(
  scheduler: TimerSchedulerPort,
  promise: Promise<T>,
  ms: number
): Promise<T>;
```

Races `promise` against a timer. If `promise` resolves or rejects before `ms` milliseconds, returns its result. If the timer fires first, rejects with `ClockTimeoutError`.

```typescript
import { timeout } from "@hex-di/clock";

const result = await timeout(scheduler, fetchData(), 5000);
// Either fetchData() resolved, or ClockTimeoutError after 5s
```

REQUIREMENT (CLK-ASY-003): `timeout` MUST clean up the timer handle when `promise` settles before the timeout. No dangling timers.

REQUIREMENT (CLK-ASY-004): `timeout` MUST reject with `ClockTimeoutError` (not a generic `Error`) when the timer fires before `promise` settles. The error MUST include `timeoutMs: ms`.

REQUIREMENT (CLK-ASY-005): `timeout` MUST use `scheduler.setTimeout()` for the timer, not raw `setTimeout`. This ensures the timeout is deterministic in tests with `VirtualTimerScheduler`.

### `measure`

```typescript
function measure<T>(
  clock: ClockPort,
  fn: () => T | Promise<T>
): Promise<{ readonly result: T; readonly durationMs: number }>;
```

Executes `fn`, measures its wall-clock duration using `clock.monotonicNow()`, and returns both the result and the elapsed time.

```typescript
import { measure } from "@hex-di/clock";

const { result, durationMs } = await measure(clock, () => fetchData());
console.log(`Fetched in ${durationMs}ms`);
```

REQUIREMENT (CLK-ASY-006): `measure` MUST use `clock.monotonicNow()` (not `wallClockNow()`) for duration measurement to avoid NTP jump artifacts.

REQUIREMENT (CLK-ASY-007): `measure` MUST NOT catch exceptions from `fn`. If `fn` throws or rejects, the exception propagates to the caller.

### `retry`

```typescript
interface RetryOptions {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier?: number; // default: 1 (constant delay)
  readonly maxDelayMs?: number;        // default: Infinity
}

function retry<T>(
  scheduler: TimerSchedulerPort,
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>;
```

Retries `fn` up to `maxAttempts` times with configurable delay and exponential backoff. Returns the first successful result or throws the last error.

REQUIREMENT (CLK-ASY-008): `retry` MUST use `scheduler.sleep()` between attempts, not raw `setTimeout`. This ensures retries are deterministic in tests.

REQUIREMENT (CLK-ASY-009): `retry` MUST cap the computed delay at `maxDelayMs` when `backoffMultiplier > 1`. The delay for attempt `n` (0-indexed) is `min(delayMs * backoffMultiplier^n, maxDelayMs)`.

REQUIREMENT (CLK-ASY-010): `retry` MUST propagate the error from the final attempt unmodified. It MUST NOT wrap it in a retry-specific error type.

## 2.10 Duration Types

Arithmetic on branded timestamps produces `number` (§2.5, CLK-BRD-004). This means durations lose their domain origin: `monotonicNow() - monotonicNow()` and `wallClockNow() - wallClockNow()` both yield `number`, even though they have different semantics (monotonic durations are immune to clock adjustments; wall-clock durations are not).

Branded duration types restore domain safety for duration values with the same zero-cost pattern as timestamps.

### Phantom Brand Declarations

```typescript
declare const MonotonicDurationBrand: unique symbol;
declare const WallClockDurationBrand: unique symbol;

type MonotonicDuration = number & { readonly [MonotonicDurationBrand]: true };
type WallClockDuration = number & { readonly [WallClockDurationBrand]: true };
```

**Key properties:**

- **Zero runtime cost:** Like timestamp brands, duration brands exist only at the type level.
- **Cross-domain blocked:** Assigning a `MonotonicDuration` to a `WallClockDuration` variable is a compile-time error.
- **Covariant to `number`:** A `MonotonicDuration` IS-A `number`. Any function accepting `number` also accepts duration types.
- **Not produced by raw arithmetic:** `monotonicNow() - monotonicNow()` still yields `number`. Consumers use `elapsed()` (below) or `asMonotonicDuration()` to obtain branded durations.

### Duration Factory Functions

```typescript
function elapsed(
  clock: ClockPort,
  since: MonotonicTimestamp
): MonotonicDuration;
```

Reads `clock.monotonicNow()` and returns the difference as a branded `MonotonicDuration`. This is the primary way to obtain durations:

```typescript
const start = clock.monotonicNow();
await doWork();
const duration: MonotonicDuration = elapsed(clock, start); // branded
```

REQUIREMENT (CLK-DUR-001): `elapsed` MUST return a non-negative `MonotonicDuration`. If the clock's current value equals `since`, the result is `0`.

REQUIREMENT (CLK-DUR-002): `elapsed` MUST use `clock.monotonicNow()` internally, not `wallClockNow()`.

### Duration Branding Utilities

```typescript
function asMonotonicDuration(ms: number): MonotonicDuration;
function asWallClockDuration(ms: number): WallClockDuration;
```

Identity functions at runtime. Brand `number` as a duration type. Same usage patterns as timestamp branding utilities (§2.5).

REQUIREMENT (CLK-DUR-003): `asMonotonicDuration` and `asWallClockDuration` MUST be identity functions at runtime.

REQUIREMENT (CLK-DUR-004): `MonotonicDuration`, `WallClockDuration`, `asMonotonicDuration`, `asWallClockDuration`, and `elapsed` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-DUR-005): Arithmetic on branded durations (addition, subtraction, multiplication, division) MUST produce `number`, consistent with CLK-BRD-004.

### Duration Comparison Utilities

```typescript
function durationGt(a: MonotonicDuration, b: MonotonicDuration): boolean;
function durationLt(a: MonotonicDuration, b: MonotonicDuration): boolean;
function durationBetween(
  value: MonotonicDuration,
  min: MonotonicDuration,
  max: MonotonicDuration
): boolean;
```

Type-safe comparison functions that enforce same-domain comparison. Comparing a `MonotonicDuration` against a `WallClockDuration` is a compile-time error.

REQUIREMENT (CLK-DUR-006): Duration comparison functions MUST use strict numeric comparison. `durationGt(a, b)` returns `a > b`.

REQUIREMENT (CLK-DUR-007): `durationBetween(value, min, max)` MUST return `value >= min && value <= max` (inclusive bounds).

## 2.11 Temporal API Interop

The TC39 [Temporal proposal](https://tc39.es/proposal-temporal/) introduces `Temporal.Instant` as the standard representation for absolute time in JavaScript. `@hex-di/clock` provides optional conversion functions for environments where `Temporal` is available.

### Conversion Functions

```typescript
function toTemporalInstant(
  timestamp: WallClockTimestamp | HighResTimestamp
): Temporal.Instant;

function fromTemporalInstant(
  instant: Temporal.Instant
): WallClockTimestamp;
```

`toTemporalInstant` converts an absolute timestamp (wall-clock or high-res) to a `Temporal.Instant`. Monotonic timestamps are excluded because they have no absolute epoch — conversion would be semantically incorrect.

`fromTemporalInstant` converts a `Temporal.Instant` back to a `WallClockTimestamp` (epoch milliseconds, branded).

### Usage

```typescript
import { toTemporalInstant, fromTemporalInstant } from "@hex-di/clock";

const wall = clock.wallClockNow();
const instant = toTemporalInstant(wall);
// instant.toString() => "2024-02-12T12:00:00.000Z"

const roundTripped = fromTemporalInstant(instant);
// roundTripped === wall (same epoch ms, re-branded)
```

### Requirements

REQUIREMENT (CLK-TMP-001): `toTemporalInstant` MUST accept `WallClockTimestamp` or `HighResTimestamp` but MUST NOT accept `MonotonicTimestamp`. This is enforced at the type level.

REQUIREMENT (CLK-TMP-002): `toTemporalInstant` MUST convert epoch milliseconds to nanoseconds (`BigInt(ms) * 1_000_000n`) and construct a `Temporal.Instant` via `Temporal.Instant.fromEpochNanoseconds()`.

REQUIREMENT (CLK-TMP-003): `fromTemporalInstant` MUST extract epoch milliseconds from `Temporal.Instant` via `Number(instant.epochMilliseconds)` and brand the result as `WallClockTimestamp`.

REQUIREMENT (CLK-TMP-004): `toTemporalInstant` and `fromTemporalInstant` MUST throw `TypeError` at call time if the `Temporal` global is not available: `"Temporal API is not available. Install a polyfill or use a runtime with native Temporal support."` They MUST NOT silently degrade.

REQUIREMENT (CLK-TMP-005): `toTemporalInstant` and `fromTemporalInstant` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-TMP-006): The `Temporal` global MUST NOT be imported at module evaluation time. Detection MUST be lazy (checked at call time) so that environments without `Temporal` can still import `@hex-di/clock` without errors.
