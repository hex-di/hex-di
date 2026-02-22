# 07 - Integration

## 7.1 Container Registration

### Default Registration

`@hex-di/clock` provides pre-wired adapter constants for registering the default system adapters:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  ClockPort,
  SequenceGeneratorPort,
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
} from "@hex-di/clock";

const graph = GraphBuilder.create()
  .provide(SystemClockAdapter)
  .provide(SystemSequenceGeneratorAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
const clock = container.resolve(ClockPort);
```

This registers:

- `ClockPort` → `SystemClockAdapter` (singleton)
- `SequenceGeneratorPort` → `SystemSequenceGeneratorAdapter` (singleton)

For GxP deployments requiring `ClockDiagnosticsPort`, add `SystemClockDiagnosticsAdapter` (Tier 3).

Since `createSystemClock()` returns `Result<ClockPort & ClockDiagnosticsPort, ClockStartupError>`, `SystemClockAdapter`'s factory MUST unwrap the result during container resolution. If `createSystemClock()` returns `err(ClockStartupError)`, the error propagates through the container's resolution mechanism — consumers receive a resolution failure rather than a partially-valid adapter.

For GxP mode, use `createSystemClockAdapter({ gxp: true })` to enable ST-4 platform API freeze verification. Use `SystemClockDiagnosticsAdapter` to register `ClockDiagnosticsPort` for audit trail provenance.

**`TemporalContextFactory` usage:** `createTemporalContextFactory(clock, seq)` is a utility function (not a port) that composes `ClockPort` and `SequenceGeneratorPort` into a convenient factory. Consumers obtain it by calling the utility directly after resolving the two ports.

### Manual Registration

For fine-grained control, consumers can register adapters individually. This is equivalent to what `SystemClockAdapter` does internally:

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

### Ecosystem Adapter Override

When a GxP monitoring adapter is active, it replaces `SystemClockAdapter` with an NTP-validated adapter via standard DI registration. All consumers of `ClockPort` then receive NTP-validated time transparently. Any HexDI ecosystem library that provides NTP-validated clock adapters can perform this override using the protocol described below.

### Clock Source Change Audit (GxP: 21 CFR 11.10(e))

REQUIREMENT (CLK-INT-001): When a `ClockPort` adapter registration is overridden (e.g., an ecosystem monitoring adapter replacing `SystemClockAdapter` with `NtpClockAdapter`), a `ClockSourceChangedEvent` MUST be emitted. This event MUST include:

1. The previous adapter name (from `ClockDiagnosticsPort.getDiagnostics().adapterName`).
2. The new adapter name.
3. The wall-clock timestamp of the change (from the outgoing adapter's `wallClockNow()`).
4. The reason for the change (e.g., `'ntp-adapter-override'`, `'manual-registration'`).

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

`SystemClockAdapter` + `GraphBuilder` is a one-time graph construction call. It performs initial registration — not ongoing monitoring. Clock source change events are emitted by the entity that performs the override, not by the initial registration.

**Registration phase (`GraphBuilder` + `SystemClockAdapter`):**

1. Initial registration via `GraphBuilder.create().provide(SystemClockAdapter)` MUST NOT emit a `ClockSourceChangedEvent` — there is no previous adapter to report.
2. A `ClockSourceChangedSink` can be provided separately as an adapter in the graph, making it available for resolution by any entity that later overrides `ClockPort`.
3. The `ClockSourceChangedSink` registration is independent of `SystemClockAdapter` — it can be provided before or after `SystemClockAdapter` in the graph builder chain.

**Override phase (ecosystem adapter or consumer):**

4. Any entity that overrides the `ClockPort` registration (e.g., ecosystem monitoring adapter replacing `SystemClockAdapter` with `NtpClockAdapter`) MUST resolve `ClockSourceChangedSinkPort` from the container before performing the override.
5. The overriding entity MUST resolve `ClockDiagnosticsPort` from the container to obtain the outgoing adapter's `adapterName` and `wallClockNow()` for the event.
6. The overriding entity MUST construct a frozen `ClockSourceChangedEvent` and invoke the sink's `onClockSourceChanged()` synchronously, before registering the new adapter. This ensures the event is emitted before any consumer can obtain the new adapter.
7. After emitting the event, the overriding entity registers the new `ClockPort` (and updated `ClockDiagnosticsPort`) in the graph.

**Example — ecosystem adapter override sequence:**

```typescript
// 1. Resolve outgoing adapter diagnostics
const outgoing = container.resolve(ClockDiagnosticsPort);
const outgoingClock = container.resolve(ClockPort);

// 2. Resolve the sink (registered via GraphBuilder + SystemClockAdapter or a separate sink adapter)
const sink = container.resolve(ClockSourceChangedSinkPort);

// 3. Emit the change event before overriding
sink.onClockSourceChanged(
  Object.freeze({
    _tag: "ClockSourceChanged",
    previousAdapter: outgoing.getDiagnostics().adapterName,
    newAdapter: "NtpClockAdapter",
    timestamp: new Date(outgoingClock.wallClockNow()).toISOString(),
    reason: "ntp-adapter-override",
  })
);

// 4. Override the registration
graph.provide(ClockPort, () => ntpClockAdapter);
graph.provide(ClockDiagnosticsPort, () => ntpClockAdapter);
```

REQUIREMENT (CLK-INT-002): GxP deployments using an ecosystem monitoring adapter MUST ensure the adapter resolves `ClockSourceChangedSinkPort` and emits the event before overriding `ClockPort`. The adapter's specification MUST document its sink invocation requirements.

REQUIREMENT (CLK-INT-003): When `createSystemClockAdapter({ gxp: true })` is used but no `ClockSourceChangedSink` is registered in the container, the adapter MUST log a warning to stderr: `"[CLOCK] WARNING: GxP mode active but no ClockSourceChangedSink registered. Clock source changes will not be audited."` This ensures the absence of audit event routing is visible in logs. The warning is emitted once at resolution time, not on every call.

**Behavioral contract:**

1. The sink's `onClockSourceChanged` is called synchronously by the overriding entity, before the new adapter is registered in the graph.
2. The `ClockSourceChangedEvent` object MUST be frozen before being passed to the sink.
3. The sink MUST NOT throw. If the sink's implementation encounters an error, it MUST handle it internally (e.g., log to stderr) without disrupting the adapter override.
4. Multiple sinks are NOT supported — the port accepts a single sink. Consumers needing fan-out MUST implement a multiplexing sink.
5. If `ClockSourceChangedSinkPort` is not registered in the container when an override occurs, the overriding entity MUST log the event to stderr as a fallback. The override MUST NOT be blocked by the absence of a sink.

This design makes event emission the explicit responsibility of the overriding entity. The clock library defines the port, the event structure, and the behavioral contract; the overriding party implements the emission protocol. This eliminates hidden coupling between the initial registration and future graph mutations.

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

## 7.3 Ecosystem Monitoring Integration

HexDI ecosystem libraries that provide GxP monitoring depend on `@hex-di/clock` (unidirectional — clock never imports monitoring libraries). When a GxP monitoring adapter is active, it:

1. Replaces `SystemClockAdapter` with an NTP-validated adapter via standard DI registration.
2. Registers a `ClockSourceChangedSink` to audit the adapter swap.
3. Performs startup validation (NTP sync, resolution, consistency checks).
4. Runs periodic integrity checks on the adapter.
5. Bridges `ClockPort.wallClockNow()` to the monitoring library's `ClockSource` interface (ISO 8601 UTC).

REQUIREMENT (CLK-INT-004): Ecosystem libraries that integrate with `@hex-di/clock` for GxP monitoring MUST document their NTP startup modes, adapter behavioral contracts, audit bridge configuration, and periodic integrity verification protocol in their own specification.

## 7.4 Timer Scheduler Registration

### Adapter Constant

`SystemTimerSchedulerAdapter` — provides `TimerSchedulerPort`, requires nothing, singleton lifetime.

Registers `TimerSchedulerPort` → `createSystemTimerScheduler()` as a singleton.

Usage:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemTimerSchedulerAdapter,
} from "@hex-di/clock";

const graph = GraphBuilder.create()
  .provide(SystemClockAdapter)
  .provide(SystemSequenceGeneratorAdapter)
  .provide(SystemTimerSchedulerAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
```

REQUIREMENT (CLK-INT-005): `SystemTimerSchedulerAdapter` MUST be exported from the `@hex-di/clock` main entry point.

### Testing Override

In test graphs, replace the system timer scheduler with a virtual one linked to the virtual clock:

```typescript
import { createVirtualClock, createVirtualTimerScheduler } from "@hex-di/clock/testing";

const clock = createVirtualClock();
const scheduler = createVirtualTimerScheduler(clock);

const graph = createGraph()
  .provide(ClockPort, () => clock)
  .provide(TimerSchedulerPort, () => scheduler);
```

## 7.5 Cached Clock Registration

### Adapter Constant

`SystemCachedClockAdapter` — provides `CachedClockPort`, requires `[ClockPort]`, singleton lifetime.
Resolves `ClockPort` from the container and wraps it with a background cache updater.

Registers `CachedClockPort` → `createCachedClock({ source: resolved ClockPort })` as a singleton.

Usage:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemCachedClockAdapter,
} from "@hex-di/clock";

const graph = GraphBuilder.create()
  .provide(SystemClockAdapter)
  .provide(SystemSequenceGeneratorAdapter)
  .provide(SystemCachedClockAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
```

REQUIREMENT (CLK-INT-006): `SystemCachedClockAdapter` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-INT-007): `SystemCachedClockAdapter` factory MUST call `start()` on the created `CachedClockAdapter` after registration. Consumers receiving `CachedClockPort` from the container MUST receive a started adapter.

## 7.6 Edge Runtime Clock Registration

### Adapter Constant

`EdgeRuntimeClockAdapter` — provides `ClockPort`, requires nothing, singleton lifetime.
For custom options, use `createEdgeRuntimeClockAdapter(options?)`.

Registers `ClockPort` → `createEdgeRuntimeClock()` unwrapped from `Result`. As a singleton.

Usage:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  EdgeRuntimeClockAdapter,
  SystemSequenceGeneratorAdapter,
} from "@hex-di/clock";

const graph = GraphBuilder.create()
  .provide(EdgeRuntimeClockAdapter)
  .provide(SystemSequenceGeneratorAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
```

REQUIREMENT (CLK-INT-008): `EdgeRuntimeClockAdapter` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-INT-009): `EdgeRuntimeClockAdapter` MUST propagate `ClockStartupError` if `createEdgeRuntimeClock()` returns `err()`. For custom options (e.g., `{ gxp: true }`), use `createEdgeRuntimeClockAdapter(options)` instead.

## 7.7 Host Bridge Clock Registration

### Adapter Factory Function

`createHostBridgeClockAdapter(bridge: HostClockBridge, options: HostBridgeClockOptions)` — returns an adapter providing `ClockPort`, requires nothing, singleton lifetime.

Registers `ClockPort` → `createHostBridgeClock(bridge, options)` unwrapped from `Result`. As a singleton.

Usage (React Native):

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createHostBridgeClockAdapter,
  SystemSequenceGeneratorAdapter,
} from "@hex-di/clock";
import { NativeModules } from "react-native";

const bridge = Object.freeze({
  monotonicNowMs: () => NativeModules.ClockModule.monotonicNowMs(),
  wallClockNowMs: () => Date.now(),
});

const graph = GraphBuilder.create()
  .provide(createHostBridgeClockAdapter(bridge, {
    adapterName: "ReactNativeBridge",
    platform: "react-native",
  }))
  .provide(SystemSequenceGeneratorAdapter)
  .build();

const container = createContainer({ graph, name: "App" });
```

REQUIREMENT (CLK-INT-010): `createHostBridgeClockAdapter` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-INT-011): `createHostBridgeClockAdapter` MUST propagate `ClockStartupError` if `createHostBridgeClock()` returns `err()`.

## 7.8 AsyncLocalStorage Clock Context

### Problem

In server-side Node.js applications, request-scoped middleware often needs a clock instance that propagates through async call chains without explicit parameter passing. The standard approach is `AsyncLocalStorage` from `node:async_hooks`. `@hex-di/clock` provides an optional utility for clock context propagation via `AsyncLocalStorage`.

### `ClockContext`

```typescript
interface ClockContext {
  readonly clock: ClockPort;
  readonly sequenceGenerator: SequenceGeneratorPort;
}

function createClockContext(): {
  readonly storage: AsyncLocalStorage<ClockContext>;
  readonly run: <T>(ctx: ClockContext, fn: () => T) => T;
  readonly get: () => ClockContext | undefined;
};
```

`createClockContext()` creates an `AsyncLocalStorage<ClockContext>` instance with typed `run` and `get` accessors. This is a thin wrapper — the real value is providing a standardized key for clock propagation across middleware, avoiding each library defining its own.

### Usage — HTTP Middleware

```typescript
import { createClockContext, ClockPort, SequenceGeneratorPort } from "@hex-di/clock";

const clockCtx = createClockContext();

// Middleware (Hono, Express, etc.)
function clockMiddleware(graph: Graph) {
  const clock = graph.resolve(ClockPort);
  const seq = graph.resolve(SequenceGeneratorPort);

  return async (c: Context, next: Next) => {
    await clockCtx.run({ clock, seq }, () => next());
  };
}

// Deep in a handler — no parameter threading needed
function createAuditEntry() {
  const ctx = clockCtx.get();
  if (!ctx) throw new Error("Clock context not available");
  return createTemporalContextFactory(ctx.clock, ctx.sequenceGenerator).create();
}
```

### Usage — Request-Scoped Virtual Clock in Tests

```typescript
import { createClockContext } from "@hex-di/clock";
import { createVirtualClock, createVirtualSequenceGenerator } from "@hex-di/clock/testing";

const clockCtx = createClockContext();

it("audit entry uses request-scoped virtual clock", async () => {
  const clock = createVirtualClock();
  const seq = createVirtualSequenceGenerator();

  await clockCtx.run({ clock, seq }, async () => {
    clock.advance(5000);
    const entry = createAuditEntry();
    expect(entry.isOk()).toBe(true);
    expect(entry.value.monotonicTimestamp).toBe(5000);
  });
});
```

### Requirements

REQUIREMENT (CLK-ALS-001): `createClockContext` MUST create a new `AsyncLocalStorage<ClockContext>` instance per invocation. Multiple independent clock contexts are supported.

REQUIREMENT (CLK-ALS-002): `createClockContext` MUST be exported from the `@hex-di/clock` main entry point.

REQUIREMENT (CLK-ALS-003): `createClockContext` MUST NOT import `node:async_hooks` at module evaluation time. The import MUST be lazy (dynamic `import()` or conditional `require()`) so that browser bundles that do not use this function are not broken by a Node.js-only import.

REQUIREMENT (CLK-ALS-004): On platforms where `AsyncLocalStorage` is unavailable, `createClockContext` MUST throw a descriptive `TypeError` at call time: `"AsyncLocalStorage is not available on this platform. ClockContext requires Node.js >= 16, Deno, or Bun."` It MUST NOT silently degrade to a global variable.

REQUIREMENT (CLK-ALS-005): The `ClockContext` interface MUST be frozen when stored. `run()` MUST call `Object.freeze()` on the context before passing it to `AsyncLocalStorage.run()`.
