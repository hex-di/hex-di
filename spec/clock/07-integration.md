# 07 - Integration

## 7.1 Container Registration

### Default Registration

`@hex-di/clock` provides a convenience function for registering the default system adapters:

```typescript
function provideSystemClock<G extends GraphLike>(
  graph: G
): G & Provides<ClockPort> & Provides<SequenceGeneratorPort> & Provides<ClockDiagnosticsPort>;
```

Usage:

```typescript
import { createGraph } from "@hex-di/graph";
import { provideSystemClock } from "@hex-di/clock";

const graph = provideSystemClock(
  createGraph()
  // ... other providers
);
```

This registers:

- `ClockPort` -> `createSystemClock()` unwrapped from `Result` (singleton)
- `SequenceGeneratorPort` -> `createSystemSequenceGenerator()` (singleton)
- `ClockDiagnosticsPort` -> diagnostics from `createSystemClock()` (singleton)

Since `createSystemClock()` returns `Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>`, `provideSystemClock()` MUST unwrap the result during graph construction. If `createSystemClock()` returns `err(ClockStartupError)`, the error propagates through the container's resolution mechanism — consumers receive a resolution failure rather than a partially-valid adapter.

The `ClockDiagnosticsPort` registration enables audit trail provenance: any consumer can query which clock adapter is active and which platform APIs it uses.

**`TemporalContextFactory` usage:** `createTemporalContextFactory(clock, seq)` is a utility function (not a port) that composes `ClockPort` and `SequenceGeneratorPort` into a convenient factory. Consumers obtain it by calling the utility directly after resolving the two ports.

### Manual Registration

For fine-grained control, consumers can register adapters individually:

```typescript
import {
  ClockPort,
  SequenceGeneratorPort,
  createSystemClock,
  createSystemSequenceGenerator,
} from "@hex-di/clock";

// createSystemClock() returns Result -- unwrap in the factory
const graph = createGraph()
  .provide(ClockPort, () => {
    const result = createSystemClock();
    if (result.isErr()) {
      /* propagate startup failure */
    }
    return result.value;
  })
  .provide(SequenceGeneratorPort, () => createSystemSequenceGenerator());
```

### Guard Override

When `@hex-di/guard` is active, it replaces `SystemClockAdapter` with an NTP-validated adapter via standard DI registration. All consumers of `ClockPort` then receive NTP-validated time transparently. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md` for the guard's NTP adapter behavior and configuration.

### Clock Source Change Audit (GxP: 21 CFR 11.10(e))

REQUIREMENT: When a `ClockPort` adapter registration is overridden (e.g., guard replacing `SystemClockAdapter` with `NtpClockAdapter`), a `ClockSourceChangedEvent` MUST be emitted. This event MUST include:

1. The previous adapter name (from `ClockDiagnosticsPort.getDiagnostics().adapterName`).
2. The new adapter name.
3. The wall-clock timestamp of the change (from the outgoing adapter's `wallClockNow()`).
4. The reason for the change (e.g., `'guard-ntp-override'`, `'manual-registration'`).

This event MUST be captured in the application audit trail. Clock source changes affect the trustworthiness of all subsequent timestamps, making them metadata-level changes to electronic records under 21 CFR 11.10(e).

#### Unconditional Event Emission via `ClockSourceChangedSink`

To ensure clock source change auditing is unconditional and independent of container lifecycle infrastructure, `@hex-di/clock` provides a `ClockSourceChangedSink` port and a `ClockSourceChangedEvent` structure:

```typescript
interface ClockSourceChangedSink {
  readonly onClockSourceChanged: (event: ClockSourceChangedEvent) => void;
}

const ClockSourceChangedSinkPort = createPort<ClockSourceChangedSink>("ClockSourceChangedSinkPort");
```

```typescript
interface ClockSourceChangedEvent {
  readonly _tag: "ClockSourceChanged";
  readonly previousAdapter: string;
  readonly newAdapter: string;
  readonly timestamp: string; // ISO 8601 UTC from outgoing adapter
  readonly reason: string;
}
```

#### Trigger Mechanism

`provideSystemClock()` is a one-time graph construction call. It performs initial registration — not ongoing monitoring. Clock source change events are emitted by the entity that performs the override, not by `provideSystemClock()`.

**Registration phase (`provideSystemClock()`):**

1. `provideSystemClock()` MUST accept an optional `ClockSourceChangedSink` parameter.
2. When provided, `provideSystemClock()` MUST register the sink as `ClockSourceChangedSinkPort` in the graph, making it available for resolution by any entity that later overrides `ClockPort`.
3. `provideSystemClock()` MUST NOT emit a `ClockSourceChangedEvent` on initial registration — there is no previous adapter to report.

**Override phase (guard or consumer):**

4. Any entity that overrides the `ClockPort` registration (e.g., guard replacing `SystemClockAdapter` with `NtpClockAdapter`) MUST resolve `ClockSourceChangedSinkPort` from the container before performing the override.
5. The overriding entity MUST resolve `ClockDiagnosticsPort` from the container to obtain the outgoing adapter's `adapterName` and `wallClockNow()` for the event.
6. The overriding entity MUST construct a frozen `ClockSourceChangedEvent` and invoke the sink's `onClockSourceChanged()` synchronously, before registering the new adapter. This ensures the event is emitted before any consumer can obtain the new adapter.
7. After emitting the event, the overriding entity registers the new `ClockPort` (and updated `ClockDiagnosticsPort`) in the graph.

**Example — guard override sequence:**

```typescript
// 1. Resolve outgoing adapter diagnostics
const outgoing = container.resolve(ClockDiagnosticsPort);
const outgoingClock = container.resolve(ClockPort);

// 2. Resolve the sink (registered by provideSystemClock)
const sink = container.resolve(ClockSourceChangedSinkPort);

// 3. Emit the change event before overriding
sink.onClockSourceChanged(
  Object.freeze({
    _tag: "ClockSourceChanged",
    previousAdapter: outgoing.getDiagnostics().adapterName,
    newAdapter: "NtpClockAdapter",
    timestamp: new Date(outgoingClock.wallClockNow()).toISOString(),
    reason: "guard-ntp-override",
  })
);

// 4. Override the registration
graph.provide(ClockPort, () => ntpClockAdapter);
graph.provide(ClockDiagnosticsPort, () => ntpClockAdapter);
```

REQUIREMENT: GxP deployments using `@hex-di/guard` MUST ensure the guard resolves `ClockSourceChangedSinkPort` and emits the event before overriding `ClockPort`. See `spec/guard/17-gxp-compliance/03-clock-synchronization.md` for the guard's sink invocation requirements.

REQUIREMENT: When `provideSystemClock()` is called with `gxp: true` but no `ClockSourceChangedSink` parameter, it MUST log a warning to stderr: `"[CLOCK] WARNING: GxP mode active but no ClockSourceChangedSink registered. Clock source changes will not be audited."` This ensures the absence of audit event routing is visible in logs. The warning is emitted once at registration time, not on every resolution.

**Behavioral contract:**

1. The sink's `onClockSourceChanged` is called synchronously by the overriding entity, before the new adapter is registered in the graph.
2. The `ClockSourceChangedEvent` object MUST be frozen before being passed to the sink.
3. The sink MUST NOT throw. If the sink's implementation encounters an error, it MUST handle it internally (e.g., log to stderr) without disrupting the adapter override.
4. Multiple sinks are NOT supported — the port accepts a single sink. Consumers needing fan-out MUST implement a multiplexing sink.
5. If `ClockSourceChangedSinkPort` is not registered in the container when an override occurs, the overriding entity MUST log the event to stderr as a fallback. The override MUST NOT be blocked by the absence of a sink.

This design makes event emission the explicit responsibility of the overriding entity. The clock library defines the port, the event structure, and the behavioral contract; the overriding party implements the emission protocol. This eliminates hidden coupling between `provideSystemClock()` and future graph mutations.

## 7.2 Migration Guide

### `@hex-di/runtime` -- `monotonicNow()`

**Before:**

```typescript
// packages/runtime/src/util/monotonic-time.ts
import { monotonicNow } from "../util/monotonic-time";

const start = monotonicNow();
// ... resolve ...
context.duration = monotonicNow() - start;
```

**After:**

```typescript
// ClockPort injected via container
const start = clock.monotonicNow();
// ... resolve ...
context.duration = clock.monotonicNow() - start;
```

**Migration steps:**

1. Add `@hex-di/clock` as a dependency of `@hex-di/runtime`.
2. Add `ClockPort` as a required port in the runtime's graph.
3. Replace all `monotonicNow()` calls with `clock.monotonicNow()`.
4. Delete `packages/runtime/src/util/monotonic-time.ts`.

### `@hex-di/tracing` -- `getHighResTimestamp()`

**Before:**

```typescript
// packages/tracing/src/utils/timing.ts
import { getHighResTimestamp } from "../utils/timing";

this._startTime = startTime ?? getHighResTimestamp();
```

**After:**

```typescript
this._startTime = startTime ?? clock.highResNow();
```

**Migration steps:**

1. Add `@hex-di/clock` as a dependency of `@hex-di/tracing`.
2. Inject `ClockPort` into tracer adapters via constructor or factory.
3. Replace all `getHighResTimestamp()` calls with `clock.highResNow()`.
4. Delete `packages/tracing/src/utils/timing.ts` and `packages/tracing/src/utils/globals.ts`.

### `@hex-di/query` -- Local `Clock` Interface

**Before:**

```typescript
// libs/query/core/src/cache/query-cache.ts
interface Clock {
  readonly now: () => number;
}
const systemClock: Clock = { now: () => Date.now() };
```

**After:**

```typescript
// ClockPort.wallClockNow replaces Clock.now
const startTime = clock.wallClockNow();
```

**Migration steps:**

1. Add `@hex-di/clock` as a dependency of `@hex-di/query`.
2. Replace the local `Clock` interface with `ClockPort`.
3. Replace `clock.now()` with `clock.wallClockNow()`.
4. Delete the local `Clock` interface and `systemClock` constant.

### `@hex-di/logger`, `@hex-di/saga`, `@hex-di/store` -- Raw `Date.now()`

**Before:**

```typescript
timestamp: Date.now();
```

**After:**

```typescript
timestamp: clock.wallClockNow();
```

**Migration steps:**

1. Add `@hex-di/clock` as a dependency.
2. Accept `ClockPort` in factory functions or constructors.
3. Replace `Date.now()` with `clock.wallClockNow()`.

## 7.3 Guard Integration

`@hex-di/guard` depends on `@hex-di/clock` (unidirectional -- clock never imports guard). When the guard is active with `gxp: true`, it:

1. Replaces `SystemClockAdapter` with an NTP-validated adapter via standard DI registration.
2. Registers a `ClockSourceChangedSink` to audit the adapter swap.
3. Performs startup validation (NTP sync, resolution, consistency checks).
4. Runs periodic integrity checks on the adapter.
5. Bridges `ClockPort.wallClockNow()` to the guard's `ClockSource` interface (ISO 8601 UTC).

All guard-clock integration behavior -- NTP startup modes (`fail-fast`, `degraded`, `offline`), the NTP adapter, the audit bridge, the ClockSource bridge, and periodic integrity verification -- is specified in `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.
