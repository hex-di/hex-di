# 02 - Clock Port

## 2.1 ClockPort Interface

```typescript
interface ClockPort {
  readonly monotonicNow: () => number;
  readonly wallClockNow: () => number;
  readonly highResNow: () => number;
}
```

All three functions are synchronous, pure (no side effects beyond reading time), and return `number` in milliseconds.

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

### `monotonicNow(): number`

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
| Edge runtimes (Cloudflare Workers) | `performance.now()` (coarsened to 1ms)                  |
| Fallback                           | `Date.now()` (monotonicity NOT guaranteed)              |

REQUIREMENT: When the platform provides `performance.now()`, the `SystemClockAdapter` MUST use it. The `Date.now()` fallback MUST only be used when `performance` is unavailable on `globalThis`.

REQUIREMENT: When the `Date.now()` fallback is active, `monotonicNow()` MUST still enforce monotonicity by clamping: if `Date.now()` returns a value less than the previous return, the previous value MUST be returned instead.

## 2.3 Wall-Clock Time

### `wallClockNow(): number`

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

REQUIREMENT: `@hex-di/clock` MUST NOT attempt to detect or compensate for leap seconds. The platform's NTP configuration is the authoritative source for UTC correctness, including leap second handling.

**GxP deployment note (ICH Q7 section 6.5):** Organizations deploying in GxP environments MUST include leap second behavior in their platform IQ/OQ qualification plan. The qualification MUST verify that the deployment platform's NTP daemon uses leap smearing (gradual adjustment) rather than step adjustment, as a step adjustment could cause `wallClockNow()` to repeat or skip a second. This is a platform qualification concern, not a `@hex-di/clock` concern, but MUST be documented in the computerized system validation plan.

**GxP deployment checklist item:** Before production deployment, the infrastructure team MUST confirm and document that the NTP daemon is configured with leap smearing enabled (e.g., `leapsmearinterval` in chrony, or Google Public NTP which smears by default). The checklist entry MUST include: NTP daemon name and version, leap smearing configuration parameter and value, and the date of verification.

## 2.4 High-Resolution Time

### `highResNow(): number`

Returns the current time as milliseconds since the Unix epoch with sub-millisecond precision. Combines `performance.timeOrigin` with `performance.now()` to provide both absolute positioning and high resolution.

**Semantic contract:**

- The return value represents absolute calendar time with sub-millisecond fractional precision (e.g., `1707753600123.456`).
- The return value MAY decrease if the system clock is adjusted, though this is unlikely during normal operation because the value is computed from `performance.timeOrigin + performance.now()` where `performance.now()` is monotonic.
- The return value SHOULD have microsecond-level precision when the platform supports it.

**Use cases:**

- Tracing span start/end timestamps (OpenTelemetry-compatible)
- High-precision audit timestamps for GxP environments
- Performance profiling

**Platform mapping:**

| Platform                | Source                                       | Precision                      |
| ----------------------- | -------------------------------------------- | ------------------------------ |
| Node.js 16+             | `performance.timeOrigin + performance.now()` | Microsecond                    |
| Browsers (same-origin)  | `performance.timeOrigin + performance.now()` | Microsecond                    |
| Browsers (cross-origin) | `performance.timeOrigin + performance.now()` | 5-100 microseconds (coarsened) |
| Fallback                | `Date.now()`                                 | Millisecond                    |

REQUIREMENT: When `performance.timeOrigin` is not available, `highResNow()` MUST fall back to `Date.now()`. It MUST NOT throw.

### Known Limitations

**`performance.timeOrigin` drift risk (ALCOA+ Accurate):** `highResNow()` computes absolute time as `performance.timeOrigin + performance.now()`. The `performance.timeOrigin` value is captured once by the platform at process startup. If the system clock was incorrect at startup (e.g., NTP had not yet synchronized), all `highResNow()` values for the lifetime of the process will be offset by the initial clock error, even after NTP corrects the system clock.

This is a **platform-level limitation**, not a defect in `@hex-di/clock`. Mitigation is provided at two levels:

**Level 1 — `@hex-di/clock` startup self-test (ST-5):** `createSystemClock()` checks `Math.abs(highResNow() - wallClockNow()) < 1000ms` at construction time. If the divergence exceeds 1 second, `createSystemClock()` returns `err(ClockStartupError)` with check `'ST-5'`, preventing the adapter from being used with a grossly inaccurate `timeOrigin`. This catches the most common cause — NTP not yet synchronized at process start — at the earliest possible point.

**Level 2 — `@hex-di/guard` periodic monitoring:** The guard provides finer-grained drift detection between `wallClockNow()` and `highResNow()`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.

**Operational requirement:** GxP deployments MUST ensure NTP synchronization completes before application startup to minimize the `timeOrigin` offset. This aligns with the GAMP 5 risk classification (section 6.1) which mandates NTP pre-sync before process start for `highResNow()` accuracy.

REQUIREMENT: GxP organizations MUST document their process startup sequencing to ensure NTP synchronization precedes application initialization. This is an operational concern outside the scope of `@hex-di/clock` but critical for ALCOA+ Accurate compliance.

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

REQUIREMENT: `@hex-di/clock` MUST NOT use `process.hrtime.bigint()` or any `BigInt`-returning timing API. All timing values MUST be `number` (IEEE 754 double-precision float) for cross-platform compatibility and ecosystem interoperability.
