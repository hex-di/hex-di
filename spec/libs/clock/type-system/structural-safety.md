# Type System — Structural Safety

`@hex-di/clock` uses TypeScript's structural type system to make incorrect usage impossible at compile time. Three patterns work together: **structural irresettability** prevents production sequence generators from being reset, **structural incompatibility** prevents cached clocks from being substituted for live clocks, and **port intersection types** express multi-capability adapters without losing type safety. A fourth pattern, **opaque discriminated handles**, prevents raw timer IDs from being used directly.

These compile-time invariants are stronger than runtime guards (`if (process.env.NODE_ENV !== 'test')`) because they cannot be bypassed by any code path — the TypeScript compiler rejects violations before any JavaScript is generated.

## Structural Irresettability

### The problem

A production sequence generator that can be reset would allow audit trail corruption: resetting the counter reintroduces previously-issued sequence numbers, making events appear to occur in a different order than they actually did. An environment variable check (`if (env.NODE_ENV !== 'test')`) can be bypassed by any code that mutates `process.env`. A thrown exception at runtime is caught and swallowed. Neither defence survives determined or accidental subversion.

### The solution

The `SequenceGeneratorPort` interface does not include a `reset()` method:

```typescript
interface SequenceGeneratorPort {
  readonly next:    () => Result<number, SequenceOverflowError>;
  readonly current: () => number;
}
```

There is no way to call `reset()` on a value typed as `SequenceGeneratorPort` — the method does not exist in the type. The compiler rejects any attempt:

```typescript
declare const seq: SequenceGeneratorPort;
seq.reset(); // Error: Property 'reset' does not exist on type 'SequenceGeneratorPort'
```

This is **structural irresettability** — the reset capability is absent from the production type, not merely guarded.

### Test-only extension

`VirtualSequenceGenerator` extends `SequenceGeneratorPort` by adding `reset()` and `setCounter()`:

```typescript
interface VirtualSequenceGenerator extends SequenceGeneratorPort {
  readonly reset:      () => void;
  readonly setCounter: (value: number) => void;
}
```

This extension lives exclusively in the `@hex-di/clock/testing` subpath. Production code imports from `@hex-di/clock` and receives only `SequenceGeneratorPort`. Test code imports from `@hex-di/clock/testing` and can use the richer `VirtualSequenceGenerator` type. The subpath boundary enforces the separation.

### Assignability relationship

`VirtualSequenceGenerator` is assignable to `SequenceGeneratorPort` (it satisfies all required members). The converse is false — `SequenceGeneratorPort` is not assignable to `VirtualSequenceGenerator` because `reset` and `setCounter` are missing:

```typescript
declare const real:    SequenceGeneratorPort;
declare const virtual: VirtualSequenceGenerator;

// Structural subtyping: test double satisfies production interface
const prodUsage: SequenceGeneratorPort = virtual; // OK

// No inverse: production type lacks testing capabilities
const testUsage: VirtualSequenceGenerator = real; // Error: Property 'reset' is missing
```

See [INV-CK-4](../invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable) and [ADR-CK-006](../decisions/006-structural-irresettability.md).

## Structural Incompatibility

### The problem

`CachedClockPort` provides time values that may be stale by up to the cache interval. If it were structurally compatible with `ClockPort`, a `CachedClockPort` instance could be silently passed to `createTemporalContextFactory(clock, seq)`, producing audit trail timestamps with stale values — a violation of ALCOA+ Contemporaneous (records must reflect the time of the event, not the time of the last cache update).

### The solution

`CachedClockPort` and `ClockPort` use **different method names**:

```typescript
interface ClockPort {
  readonly monotonicNow:      () => MonotonicTimestamp;
  readonly wallClockNow:      () => WallClockTimestamp;
  readonly highResNow:        () => HighResTimestamp;
}

interface CachedClockPort {
  readonly recentMonotonicNow: () => MonotonicTimestamp;
  readonly recentWallClockNow: () => WallClockTimestamp;
  // highResNow deliberately absent — caching negates high-resolution value
}
```

The `recent` prefix is not merely a naming convention — it makes the two interfaces structurally incompatible. Neither is assignable to the other:

```typescript
declare const live:   ClockPort;
declare const cached: CachedClockPort;

const a: CachedClockPort = live;   // Error: 'monotonicNow' missing in CachedClockPort
const b: ClockPort       = cached; // Error: 'monotonicNow' missing in ClockPort
```

Any function that accepts `ClockPort` — including `createTemporalContextFactory` — will reject a `CachedClockPort` argument at compile time:

```typescript
// createTemporalContextFactory signature:
function createTemporalContextFactory(clock: ClockPort, seq: SequenceGeneratorPort): TemporalContextFactory;

// Attempting to pass a cached clock is a compile-time error:
const factory = createTemporalContextFactory(cachedClock, seq);
// Error: Argument of type 'CachedClockPort' is not assignable to parameter of type 'ClockPort'.
//   Property 'monotonicNow' is missing in type 'CachedClockPort' but required in type 'ClockPort'.
```

This is the enforcement mechanism for [INV-CK-9](../invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport). See [ADR-CK-007](../decisions/007-cached-clock-separation.md) for the design rationale.

### `highResNow` exclusion

`CachedClockPort` excludes `highResNow` entirely. The purpose of high-resolution time is precision; a cached high-res value is an oxymoron. Omitting the method from the interface prevents consumers from even writing code that reads stale high-res time from a cache.

## Port Intersection Types

### Multi-capability adapters

The `SystemClockAdapter` factory returns a value that satisfies both `ClockPort` and `ClockDiagnosticsPort`. TypeScript expresses this using an **intersection type**:

```typescript
function createSystemClock(options?: SystemClockOptions): Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>;
```

The intersection means the returned value satisfies both interfaces simultaneously — all members of `ClockPort` and all members of `ClockDiagnosticsPort` are present on a single object:

```typescript
const result = createSystemClock();
if (result.isOk()) {
  const adapter = result.value;

  // ClockPort members:
  const ts: MonotonicTimestamp = adapter.monotonicNow();

  // ClockDiagnosticsPort members:
  const diag: ClockDiagnostics = adapter.getDiagnostics();
  const caps: ClockCapabilities = adapter.getCapabilities();
}
```

### Narrowing to a single interface

When a consumer only needs `ClockPort`, it narrows the adapter by typing the binding:

```typescript
const result = createSystemClock();
if (result.isOk()) {
  const clock: ClockPort = result.value; // Safe: ClockPort & ClockDiagnosticsPort IS-A ClockPort
}
```

The diagnostics capability is still present at runtime but invisible to code typed as `ClockPort`. This is a deliberate feature — DI containers register the adapter against `ClockPort` for standard consumers and separately against `ClockDiagnosticsPort` for monitoring infrastructure.

### DI registration pattern

```typescript
// Container registration — splitting the intersection into two registrations:
graph
  .provide(ClockPort,            () => adapter) // Standard consumers get ClockPort
  .provide(ClockDiagnosticsPort, () => adapter) // Monitoring gets ClockDiagnosticsPort
```

Both registrations point to the same adapter instance; no duplication of state occurs. The adapter's type satisfies both port types independently.

## Opaque Discriminated Handles

### The problem

`TimerSchedulerPort.setTimeout` returns a handle for later cancellation. On Node.js/browsers, the underlying platform returns an opaque ID (a number or object). If the raw platform type leaked through the abstraction, consumers could bypass `clearTimeout(handle)` by extracting the numeric ID and calling `globalThis.clearTimeout(id)` directly.

### The solution

`TimerHandle` is an opaque type with a `_tag` discriminant:

```typescript
interface TimerHandle {
  readonly _tag: "TimerHandle";
  readonly id:   number;
}
```

The `_tag: "TimerHandle"` literal prevents the handle from being confused with any other `{ id: number }` shape. The `id` field is exposed for diagnostics only — it is explicitly documented as an implementation detail that MUST NOT be passed to platform APIs. The interface is sealed at construction ([INV-CK-10](../invariants.md#inv-ck-10-timer-handles-are-frozen-opaque-objects)):

```typescript
// Object.freeze() is applied at construction — the handle cannot be mutated:
Object.isFrozen(handle); // true
handle.id = 999;         // Silently ignored (strict mode: TypeError)
```

The `_tag` discriminant also enables type-narrowed pattern matching in union scenarios:

```typescript
type TimerEvent =
  | { type: "fired";     handle: TimerHandle }
  | { type: "cancelled"; handle: TimerHandle };

// The discriminant ensures no accidental confusion with platform timer values
```

Consumers pass the `TimerHandle` object directly to `clearTimeout(handle)` or `clearInterval(handle)`. The port implementation resolves the internal ID. No part of the public API requires or accepts a raw numeric timer ID.

## Summary: Compile-Time Invariant Map

| Invariant | TypeScript mechanism | What it prevents |
|---|---|---|
| [INV-CK-4](../invariants.md#inv-ck-4): No production reset | `SequenceGeneratorPort` interface without `reset()` | Counter reset in production code |
| [INV-CK-7](../invariants.md#inv-ck-7): No cross-domain timestamp use | `unique symbol` intersection brands | Passing monotonic where wall-clock expected |
| [INV-CK-9](../invariants.md#inv-ck-9): No cached-clock substitution | Distinct method names (`recent*` vs bare names) | Stale timestamps in audit trail records |
| [INV-CK-10](../invariants.md#inv-ck-10): Opaque timer handles | `_tag: "TimerHandle"` + `Object.freeze()` | Extraction of raw platform timer IDs |

## Related Documents

- [ADR-CK-003](../decisions/003-separate-sequence-generator.md) — Decision: separate port for sequence generation
- [ADR-CK-006](../decisions/006-structural-irresettability.md) — Decision: structural (not runtime) irresettability
- [ADR-CK-007](../decisions/007-cached-clock-separation.md) — Decision: `CachedClockPort` structural incompatibility
- [INV-CK-4](../invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable) — Sequence irresettability invariant
- [INV-CK-9](../invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport) — Cached clock incompatibility invariant
- [INV-CK-10](../invariants.md#inv-ck-10-timer-handles-are-frozen-opaque-objects) — Timer handle invariant
- [type-system/phantom-brands.md](./phantom-brands.md) — Branded timestamp and duration types
