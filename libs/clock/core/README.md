# @hex-di/clock

Injectable clock, sequence generation, and timer abstractions for HexDI. Unifies fragmented timing implementations across the ecosystem into a single injectable port with platform-specific adapters and deterministic virtual adapters for testing.

## Features

- **ClockPort** -- monotonic, wall-clock, and high-resolution time via a single port
- **Branded timestamps** -- `MonotonicTimestamp`, `WallClockTimestamp`, `HighResTimestamp` with zero-runtime-cost phantom brands
- **Sequence generator** -- monotonic ordering guarantees with overflow detection
- **Timer scheduler** -- injectable `setTimeout`/`setInterval`/`sleep` abstraction
- **Cached clock** -- coarsened time for high-throughput hot paths
- **Platform coverage** -- Node.js, browsers, Cloudflare Workers, Vercel Edge, React Native, WASM
- **Virtual adapters** -- deterministic time control for testing (`@hex-di/clock/testing`)
- **Async combinators** -- `delay()`, `timeout()`, `measure()`, `retry()` built on ClockPort

## Installation

```bash
pnpm add @hex-di/clock
```

Peer dependencies: `@hex-di/core`, `@hex-di/result`

## Quick Start

### With DI Container

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { ClockPort, SystemClockAdapter } from "@hex-di/clock";

const graph = GraphBuilder.create().add(SystemClockAdapter).build();

const container = createContainer({ graph, name: "App" });
const clock = container.resolve(ClockPort);

const mono = clock.monotonicNow(); // MonotonicTimestamp
const wall = clock.wallClockNow(); // WallClockTimestamp
const hires = clock.highResNow(); // HighResTimestamp
```

### Standalone

```typescript
import { createSystemClock } from "@hex-di/clock";

const clock = createSystemClock();

const now = clock.wallClockNow();
console.log("Wall clock:", now);
```

## Clock Port

`ClockPort` is the primary port providing three time functions:

| Method           | Return Type          | Description                                                              |
| ---------------- | -------------------- | ------------------------------------------------------------------------ |
| `monotonicNow()` | `MonotonicTimestamp` | Monotonic time (never goes backward), suitable for measuring durations   |
| `wallClockNow()` | `WallClockTimestamp` | Wall-clock time (Unix epoch milliseconds), subject to NTP adjustments    |
| `highResNow()`   | `HighResTimestamp`   | High-resolution time (sub-millisecond precision via `performance.now()`) |

```typescript
import { ClockPort } from "@hex-di/clock";
import type { ClockService } from "@hex-di/clock";
```

## Branded Timestamps

All timestamp types are phantom-branded `number` values. Cross-domain assignment is blocked at compile time with zero runtime cost.

```typescript
import {
  asMonotonic,
  asWallClock,
  asHighRes,
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  elapsed,
  durationGt,
  durationLt,
  durationBetween,
} from "@hex-di/clock";
import type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  MonotonicDuration,
  WallClockDuration,
} from "@hex-di/clock";

// Identity branding (trusted values)
const mono = asMonotonic(performance.now());

// Validated branding (returns Result)
const result = asWallClockValidated(Date.now());

// Duration computation
const start = clock.monotonicNow();
// ... work ...
const end = clock.monotonicNow();
const duration = elapsed(start, end); // MonotonicDuration

durationGt(duration, asMonotonicDuration(100)); // true if > 100ms
```

## Sequence Generator

`SequenceGeneratorPort` produces strictly monotonic sequence numbers. There is no `reset()` method by design -- sequences are structurally irresettable.

```typescript
import { SequenceGeneratorPort, SystemSequenceGeneratorAdapter } from "@hex-di/clock";

const graph = GraphBuilder.create().add(SystemSequenceGeneratorAdapter).build();

const container = createContainer({ graph, name: "App" });
const seq = container.resolve(SequenceGeneratorPort);

const a = seq.next(); // 1
const b = seq.next(); // 2
// a < b is guaranteed
```

## Timer Scheduler

`TimerSchedulerPort` provides injectable `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, and `sleep`.

```typescript
import { TimerSchedulerPort, SystemTimerSchedulerAdapter } from "@hex-di/clock";

const timer = container.resolve(TimerSchedulerPort);

const handle = timer.setTimeout(() => console.log("fired"), 1000);
timer.clearTimeout(handle);

await timer.sleep(500); // Promise-based delay
```

## Cached Clock

`CachedClockPort` provides coarsened time for high-throughput scenarios where calling `performance.now()` on every operation is too expensive. It uses `recent*` method names to structurally differentiate from `ClockPort`.

```typescript
import { CachedClockPort, SystemCachedClockAdapter } from "@hex-di/clock";

const cached = container.resolve(CachedClockPort);

const mono = cached.recentMonotonicNow();
const wall = cached.recentWallClockNow();
```

## Clock Diagnostics

`ClockDiagnosticsPort` exposes platform capabilities and GxP suitability information.

```typescript
import { ClockDiagnosticsPort, SystemClockDiagnosticsAdapter } from "@hex-di/clock";

const diag = container.resolve(ClockDiagnosticsPort);
const caps = diag.getCapabilities();
// {
//   hasMonotonicTime: true,
//   hasHighResOrigin: true,
//   estimatedResolutionMs: 0.005,
//   platform: "node",
//   ...
// }
```

## Platform Adapters

| Adapter                          | Platform                        | Notes                                                    |
| -------------------------------- | ------------------------------- | -------------------------------------------------------- |
| `SystemClockAdapter`             | Node.js, browsers               | Primary adapter; uses `performance.now()` + `Date.now()` |
| `SystemSequenceGeneratorAdapter` | All                             | Monotonic counter-based                                  |
| `SystemTimerSchedulerAdapter`    | Node.js, browsers               | Wraps native `setTimeout`/`setInterval`                  |
| `SystemCachedClockAdapter`       | All                             | Coarsened clock with configurable refresh                |
| `SystemClockDiagnosticsAdapter`  | All                             | Platform capability detection                            |
| `EdgeRuntimeClockAdapter`        | Cloudflare Workers, Vercel Edge | Degraded `highResNow()` falls back to `Date.now()`       |

For React Native and WASM environments, use `createHostBridgeClockAdapter()` with a `HostClockBridge` providing host-injected timing functions.

### Factory Functions

For adapters that need configuration:

```typescript
import {
  createSystemClockAdapter,
  createEdgeRuntimeClockAdapter,
  createHostBridgeClockAdapter,
  createSystemCachedClockAdapter,
} from "@hex-di/clock";

// Configured system clock
const adapter = createSystemClockAdapter({
  /* options */
});

// Edge runtime
const edgeAdapter = createEdgeRuntimeClockAdapter({
  /* options */
});

// React Native / WASM via host bridge
const bridgeAdapter = createHostBridgeClockAdapter(bridge, {
  /* options */
});
```

## Testing

The `@hex-di/clock/testing` subpath export provides virtual adapters and assertion helpers for deterministic time control in tests.

```typescript
import {
  createVirtualClock,
  VirtualClockAdapter,
  createVirtualSequenceGenerator,
  VirtualSequenceGeneratorAdapter,
  createVirtualTimerScheduler,
  createVirtualCachedClock,
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "@hex-di/clock/testing";
```

### VirtualClock

```typescript
const clock = createVirtualClock({ startTime: 1000 });

clock.monotonicNow(); // 1000
clock.advance(500);
clock.monotonicNow(); // 1500

// Auto-advance mode
clock.setAutoAdvance(10); // advance 10ms on each read
clock.monotonicNow(); // 1510
clock.monotonicNow(); // 1520
```

### VirtualTimerScheduler

```typescript
const timer = createVirtualTimerScheduler(clock);

let fired = false;
timer.setTimeout(() => {
  fired = true;
}, 1000);

clock.advance(999);
// fired === false

clock.advance(1);
// fired === true

// blockUntil for async coordination
await timer.blockUntil(() => someCondition, { timeout: 5000 });
```

### Assertion Helpers

```typescript
assertMonotonic([t1, t2, t3]); // throws if not strictly increasing
assertTimeBetween(timestamp, lower, upper);
assertWallClockPlausible(wallClock);
assertSequenceOrdered([s1, s2, s3]);
```

## Async Combinators

Utility functions built on `ClockPort` for common async patterns:

```typescript
import { delay, timeout, measure, retry } from "@hex-di/clock";

// Delay using the injected clock
await delay(clock, timer, 1000);

// Timeout a promise
const result = await timeout(clock, timer, fetchData(), 5000);

// Measure execution time
const { result, duration } = await measure(clock, async () => doWork());

// Retry with backoff
const value = await retry(clock, timer, () => unstableCall(), {
  maxAttempts: 3,
  baseDelay: 100,
});
```

## API Reference

### Ports

| Export                       | Kind | Description                               |
| ---------------------------- | ---- | ----------------------------------------- |
| `ClockPort`                  | port | Monotonic, wall-clock, and high-res time  |
| `SequenceGeneratorPort`      | port | Monotonic sequence numbers                |
| `TimerSchedulerPort`         | port | setTimeout/setInterval/sleep abstraction  |
| `CachedClockPort`            | port | Coarsened time for hot paths              |
| `ClockDiagnosticsPort`       | port | Platform capabilities and GxP suitability |
| `ClockSourceChangedSinkPort` | port | Clock source change event sink            |
| `RetentionPolicyPort`        | port | Data retention policy                     |

### Branded Types

| Export               | Kind | Description                  |
| -------------------- | ---- | ---------------------------- |
| `MonotonicTimestamp` | type | Branded monotonic time       |
| `WallClockTimestamp` | type | Branded wall-clock time      |
| `HighResTimestamp`   | type | Branded high-resolution time |
| `MonotonicDuration`  | type | Branded monotonic duration   |
| `WallClockDuration`  | type | Branded wall-clock duration  |

### Branding Utilities

| Export                       | Kind     | Description                          |
| ---------------------------- | -------- | ------------------------------------ |
| `asMonotonic(n)`             | function | Brand a number as MonotonicTimestamp |
| `asWallClock(n)`             | function | Brand a number as WallClockTimestamp |
| `asHighRes(n)`               | function | Brand a number as HighResTimestamp   |
| `asMonotonicValidated(n)`    | function | Validated branding (returns Result)  |
| `asWallClockValidated(n)`    | function | Validated branding (returns Result)  |
| `asHighResValidated(n)`      | function | Validated branding (returns Result)  |
| `elapsed(start, end)`        | function | Compute duration between timestamps  |
| `durationGt(a, b)`           | function | Duration comparison                  |
| `durationLt(a, b)`           | function | Duration comparison                  |
| `durationBetween(d, lo, hi)` | function | Duration range check                 |

### Adapter Constants

| Export                           | Kind    | Description                          |
| -------------------------------- | ------- | ------------------------------------ |
| `SystemClockAdapter`             | adapter | System clock for Node.js/browsers    |
| `SystemSequenceGeneratorAdapter` | adapter | Counter-based sequence generator     |
| `SystemTimerSchedulerAdapter`    | adapter | Native timer wrapper                 |
| `SystemCachedClockAdapter`       | adapter | Coarsened system clock               |
| `SystemClockDiagnosticsAdapter`  | adapter | Platform capability detection        |
| `EdgeRuntimeClockAdapter`        | adapter | Edge runtime clock (Workers, Vercel) |

### Adapter Factories

| Export                                       | Kind     | Description                     |
| -------------------------------------------- | -------- | ------------------------------- |
| `createSystemClock()`                        | function | Standalone system clock         |
| `createSystemSequenceGenerator()`            | function | Standalone sequence generator   |
| `createSystemClockAdapter(opts?)`            | function | Configured system clock adapter |
| `createSystemTimerScheduler()`               | function | Standalone timer scheduler      |
| `createCachedClock(clock, opts)`             | function | Standalone cached clock         |
| `createSystemCachedClockAdapter(opts?)`      | function | Configured cached clock adapter |
| `createEdgeRuntimeClock(opts?)`              | function | Standalone edge runtime clock   |
| `createEdgeRuntimeClockAdapter(opts?)`       | function | Configured edge adapter         |
| `createHostBridgeClock(bridge, opts)`        | function | Standalone host bridge clock    |
| `createHostBridgeClockAdapter(bridge, opts)` | function | Configured host bridge adapter  |

### Async Combinators

| Export                               | Kind     | Description            |
| ------------------------------------ | -------- | ---------------------- |
| `delay(clock, timer, ms)`            | function | Promise-based delay    |
| `timeout(clock, timer, promise, ms)` | function | Timeout a promise      |
| `measure(clock, fn)`                 | function | Measure execution time |
| `retry(clock, timer, fn, opts)`      | function | Retry with backoff     |

### Testing (`@hex-di/clock/testing`)

| Export                                  | Kind     | Description                           |
| --------------------------------------- | -------- | ------------------------------------- |
| `createVirtualClock(opts?)`             | function | Deterministic virtual clock           |
| `VirtualClockAdapter`                   | adapter  | DI adapter for virtual clock          |
| `createVirtualSequenceGenerator(opts?)` | function | Virtual sequence generator            |
| `VirtualSequenceGeneratorAdapter`       | adapter  | DI adapter for virtual sequence       |
| `createVirtualTimerScheduler(clock)`    | function | Virtual timer linked to virtual clock |
| `createVirtualCachedClock(clock)`       | function | Virtual cached clock                  |
| `assertMonotonic(timestamps)`           | function | Assert strictly increasing            |
| `assertTimeBetween(t, lo, hi)`          | function | Assert within range                   |
| `assertWallClockPlausible(t)`           | function | Assert plausible wall-clock value     |
| `assertSequenceOrdered(seqs)`           | function | Assert sequence ordering              |

### GxP Utilities

| Export                                     | Kind     | Description                       |
| ------------------------------------------ | -------- | --------------------------------- |
| `getClockGxPMetadata()`                    | function | Package version and spec revision |
| `createTemporalContextFactory()`           | function | Temporal context creation         |
| `validateSignableTemporalContext(ctx)`     | function | Pre-persistence validation        |
| `computeTemporalContextDigest(ctx)`        | function | SHA-256 record integrity          |
| `verifyTemporalContextDigest(ctx, digest)` | function | Verify record integrity           |
| `setupPeriodicClockEvaluation(config)`     | function | Periodic clock health checks      |

## License

MIT
