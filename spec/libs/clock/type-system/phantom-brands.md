# Type System — Phantom Branded Types

The `@hex-di/clock` type system encodes temporal semantics at compile time using phantom-branded `number` types. All five branded types share the same structural pattern: a `number` intersected with a unique-symbol property that exists only at the type level. The runtime value is always a plain `number`; the brand is erased by TypeScript before JavaScript is emitted.

## The Phantom Brand Pattern

```typescript
declare const MonotonicBrand:  unique symbol;
declare const WallClockBrand:  unique symbol;
declare const HighResBrand:    unique symbol;
declare const MonotonicDurationBrand: unique symbol;
declare const WallClockDurationBrand: unique symbol;

type MonotonicTimestamp     = number & { readonly [MonotonicBrand]:          true };
type WallClockTimestamp     = number & { readonly [WallClockBrand]:          true };
type HighResTimestamp       = number & { readonly [HighResBrand]:            true };
type MonotonicDuration      = number & { readonly [MonotonicDurationBrand]:  true };
type WallClockDuration      = number & { readonly [WallClockDurationBrand]:  true };
```

The `unique symbol` modifier generates an opaque, unforgeable symbol type — no two `unique symbol` declarations are ever assignable to each other, even across files. The intersection `number & { readonly [Brand]: true }` narrows `number` to a subtype that carries the brand without adding any runtime member. See [ADR-CK-004](../decisions/004-branded-timestamps.md) for why wrapper objects were rejected, and [ADR-CK-009](../decisions/009-branded-duration-types.md) for why duration types were added after timestamps.

## Timestamp Types

The three timestamp types map one-to-one to `ClockPort` methods:

| Type | Method | Semantic origin | Monotonic | Absolute |
|---|---|---|---|---|
| `MonotonicTimestamp` | `monotonicNow()` | `performance.now()` — relative to process start | Yes | No |
| `WallClockTimestamp` | `wallClockNow()` | `Date.now()` — milliseconds since Unix epoch | No | Yes |
| `HighResTimestamp` | `highResNow()` | `performance.timeOrigin + performance.now()` | Mostly\* | Yes |

\* `highResNow()` is computed from a monotonic base plus a fixed origin — see [02-clock-port.md §2.4](../02-clock-port.md#24-high-resolution-time) for the edge case where the origin itself may drift.

## Duration Types

Duration types prevent monotonic and wall-clock elapsed times from being swapped:

| Type | Semantic | Factory |
|---|---|---|
| `MonotonicDuration` | True elapsed time, immune to NTP jumps | `elapsed(clock, since)` or `asMonotonicDuration(ms)` |
| `WallClockDuration` | Elapsed calendar time, can go negative | `asWallClockDuration(ms)` |

`HighResDuration` is deliberately absent. High-res timestamps share the epoch basis of wall-clock timestamps; their differences are wall-clock durations.

## Compile-Time Properties

### Cross-domain assignment is blocked

```typescript
declare const mono:    MonotonicTimestamp;
declare const wall:    WallClockTimestamp;
declare const highRes: HighResTimestamp;
declare const monoDur: MonotonicDuration;
declare const wallDur: WallClockDuration;

// All of the following are compile-time errors:
const a: WallClockTimestamp  = mono;    // Error: MonotonicBrand ≠ WallClockBrand
const b: MonotonicTimestamp  = wall;    // Error: WallClockBrand ≠ MonotonicBrand
const c: HighResTimestamp    = mono;    // Error: MonotonicBrand ≠ HighResBrand
const d: MonotonicDuration   = wallDur; // Error: WallClockDurationBrand ≠ MonotonicDurationBrand
const e: MonotonicDuration   = mono;    // Error: MonotonicBrand ≠ MonotonicDurationBrand
const f: MonotonicTimestamp  = monoDur; // Error: MonotonicDurationBrand ≠ MonotonicBrand
```

This is the enforcement mechanism for [INV-CK-7](../invariants.md#inv-ck-7-branded-timestamps-prevent-cross-domain-misuse).

### Covariant widening to `number` is allowed

All branded types are subtypes of `number`. Any function accepting `number` also accepts any branded type:

```typescript
function logMs(ms: number): void { console.log(ms); }

logMs(mono);    // OK — MonotonicTimestamp IS-A number
logMs(wall);    // OK — WallClockTimestamp IS-A number
logMs(monoDur); // OK — MonotonicDuration IS-A number
```

Existing `number`-accepting code in the codebase requires no changes after adoption of branded types.

### Arithmetic widens to `number`

TypeScript's built-in numeric operator resolution applies: arithmetic on branded types always returns `number`, not the branded type. This is correct — a duration is not a timestamp, and an aggregated sum of durations is not itself a duration in the type-safe sense:

```typescript
const start  = clock.monotonicNow();          // MonotonicTimestamp
const end    = clock.monotonicNow();          // MonotonicTimestamp
const delta  = end - start;                   // number (NOT MonotonicTimestamp)

const dur    = asMonotonicDuration(delta);    // MonotonicDuration (re-branded)

// Preferred: use the elapsed() helper which returns MonotonicDuration directly
const dur2   = elapsed(clock, start);         // MonotonicDuration
```

After arithmetic, consumers must re-brand explicitly using `asMonotonicDuration` or use `elapsed()` to obtain a `MonotonicDuration`. This is intentional — the compiler cannot verify that an arbitrary arithmetic result has the semantics of a specific brand.

### Timestamp and duration brands are disjoint

Even though `MonotonicTimestamp` and `MonotonicDuration` are both `number` subtypes in the monotonic domain, they are not mutually assignable. Their brands are distinct symbols:

```typescript
const ts:  MonotonicTimestamp = clock.monotonicNow();
const dur: MonotonicDuration  = elapsed(clock, ts);

const bad: MonotonicTimestamp = dur; // Error: MonotonicDurationBrand ≠ MonotonicBrand
```

This prevents passing a duration to a function that expects a timestamp (e.g., writing a duration value into a `TemporalContext.monotonicTimestamp` field).

## Branding Utilities

### Zero-cost identity branding

```typescript
function asMonotonic(ms: number): MonotonicTimestamp;
function asWallClock(ms: number): WallClockTimestamp;
function asHighRes(ms: number):   HighResTimestamp;

function asMonotonicDuration(ms: number): MonotonicDuration;
function asWallClockDuration(ms: number): WallClockDuration;
```

All five functions are **identity at runtime** — they return their argument unmodified. No allocation, no type check, no property assignment. The brand exists only in TypeScript's type information.

**Use only at system boundaries:**

```typescript
// Adapter construction — the caller knows the platform API's semantic
const mono: MonotonicTimestamp = asMonotonic(performance.now());

// Deserialization — reconstructing from stored JSON
const archived: WallClockTimestamp = asWallClock(JSON.parse(record).wallClockTimestamp);

// Test fixtures — constructing literal timestamps
const testTs: MonotonicTimestamp = asMonotonic(1000);
```

**Never re-brand values from `ClockPort` methods** — those already carry the correct brand:

```typescript
// Redundant — monotonicNow() already returns MonotonicTimestamp
const ts = asMonotonic(clock.monotonicNow());  // DO NOT
const ts = clock.monotonicNow();               // Correct
```

### Validated branding (Result-returning)

```typescript
function asMonotonicValidated(ms: number): Result<MonotonicTimestamp,    BrandingValidationError>;
function asWallClockValidated(ms: number): Result<WallClockTimestamp,    BrandingValidationError>;
function asHighResValidated(ms: number):   Result<HighResTimestamp,      BrandingValidationError>;
```

These perform plausibility range checks before branding, returning `err(BrandingValidationError)` on implausible values:

| Utility | Validation rule |
|---|---|
| `asMonotonicValidated` | `ms >= 0` and `ms < 1e12` (< 31 years from process start) |
| `asWallClockValidated` | `ms >= 946684800000` (≥ 2000-01-01) and `ms <= Date.now() + 86400000` (≤ 1 day future) |
| `asHighResValidated` | Same rules as `asWallClockValidated` |

The validated utilities return `Result<BrandedType, BrandingValidationError>` — never throw. The `BrandingValidationError` object is frozen:

```typescript
interface BrandingValidationError {
  readonly _tag: "BrandingValidationError";
  readonly expectedDomain: "monotonic" | "wallClock" | "highRes";
  readonly value: number;
  readonly message: string;
}
```

Use validated branding at untrusted deserialization boundaries (external API responses, database reads, log replay). In production hot paths, use the zero-cost identity utilities for performance.

## Duration Utilities

`elapsed(clock, since)` is the primary factory for monotonic durations:

```typescript
function elapsed(clock: ClockPort, since: MonotonicTimestamp): MonotonicDuration;
```

It is equivalent to `asMonotonicDuration(clock.monotonicNow() - since)` but communicates intent more clearly. By accepting `MonotonicTimestamp` for `since`, it enforces at compile time that the caller is measuring from a monotonic baseline:

```typescript
const start = clock.monotonicNow(); // MonotonicTimestamp

// Some work...

const dur: MonotonicDuration = elapsed(clock, start);

// This is a compile-time error — cannot pass wall-clock as monotonic baseline:
const bad = elapsed(clock, clock.wallClockNow()); // Error: WallClockTimestamp ≢ MonotonicTimestamp
```

Comparison utilities:

```typescript
function durationGt(a: MonotonicDuration, b: MonotonicDuration): boolean;
function durationLt(a: MonotonicDuration, b: MonotonicDuration): boolean;
function durationBetween(min: MonotonicDuration, max: MonotonicDuration, value: MonotonicDuration): boolean;
```

These accept only `MonotonicDuration`, rejecting `WallClockDuration` or plain `number` at compile time. See `src/duration.ts`.

## Cascading Through the API

The branded types propagate through all interfaces that consume or produce time values:

| Site | Field / signature | Brand |
|---|---|---|
| `ClockPort.monotonicNow()` | return type | `MonotonicTimestamp` |
| `ClockPort.wallClockNow()` | return type | `WallClockTimestamp` |
| `ClockPort.highResNow()` | return type | `HighResTimestamp` |
| `CachedClockPort.recentMonotonicNow()` | return type | `MonotonicTimestamp` |
| `CachedClockPort.recentWallClockNow()` | return type | `WallClockTimestamp` |
| `TemporalContext.monotonicTimestamp` | field type | `MonotonicTimestamp` |
| `TemporalContext.wallClockTimestamp` | field type | `WallClockTimestamp` |
| `VirtualClockAdapter.getMonotonicTime()` | return type | `MonotonicTimestamp` |
| `VirtualClockAdapter.getWallClockTime()` | return type | `WallClockTimestamp` |
| `VirtualClockAdapter.getHighResTime()` | return type | `HighResTimestamp` |
| `elapsed(clock, since)` | `since` parameter | `MonotonicTimestamp` |
| `elapsed(clock, since)` | return type | `MonotonicDuration` |
| `durationGt(a, b)` | both parameters | `MonotonicDuration` |

`ClockDiagnosticsPort` diagnostic values (`estimatedResolutionMs`, precision metadata) are plain `number` — they describe clock characteristics, not measured time.

## Related Documents

- [ADR-CK-004](../decisions/004-branded-timestamps.md) — Decision: phantom brands over wrapper objects for timestamps
- [ADR-CK-009](../decisions/009-branded-duration-types.md) — Decision: branded duration types; why no `HighResDuration`
- [INV-CK-7](../invariants.md#inv-ck-7-branded-timestamps-prevent-cross-domain-misuse) — Runtime guarantee enforced at compile time
- [02-clock-port.md §2.5](../02-clock-port.md#25-branded-timestamp-types) — Full requirement IDs (CLK-BRD-001–009)
- [02-clock-port.md §2.10](../02-clock-port.md#210-duration-types) — Duration type requirements (CLK-DUR-*)
- [type-system/structural-safety.md](./structural-safety.md) — Structural patterns for port incompatibility and irresettability
