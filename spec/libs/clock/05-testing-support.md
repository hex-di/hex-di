# 05 - Testing Support

## 5.1 VirtualClockAdapter

A test-only `ClockPort` adapter with fully controllable time for deterministic testing.

**Freeze status:** The `VirtualClockAdapter` object returned by `createVirtualClock()` is intentionally **NOT** frozen with `Object.freeze()`. Unlike production adapters (`SystemClockAdapter`, `EdgeRuntimeClockAdapter`, `HostBridgeClock`), which are frozen to enforce immutability per 21 CFR 11.10(c), the `VirtualClockAdapter` requires mutable internal state accessible through its control methods (`advance()`, `set()`, `jumpWallClock()`, `setAutoAdvance()`). This exception to the adapter freezing pattern is limited to test-only adapters exported from `@hex-di/clock/testing` and does not affect the GxP compliance posture of production deployments, because `VirtualClockAdapter` is NOT exported from the main entry point (`@hex-di/clock`) and MUST NOT be used in GxP production environments (see IQ/OQ/PQ Validation Constraints below).

### Factory

```typescript
function createVirtualClock(options?: VirtualClockOptions): VirtualClockAdapter;

interface VirtualClockOptions {
  readonly initialMonotonic?: number; // Default: 0
  readonly initialWallClock?: number; // Default: 1707753600000 (2024-02-12T12:00:00Z)
  readonly initialHighRes?: number; // Default: same as initialWallClock
  readonly autoAdvance?: number; // ms per read, Default: 0 (disabled)
}
```

### Interface

```typescript
interface VirtualClockAdapter extends ClockPort {
  readonly advance: (ms: number) => Result<void, ClockRangeError>;
  readonly set: (values: Partial<VirtualClockValues>) => void;
  readonly jumpWallClock: (ms: number) => void;
  readonly setAutoAdvance: (ms: number) => void;
  readonly getAutoAdvance: () => number;
}

interface VirtualClockValues {
  readonly monotonic: number;
  readonly wallClock: number;
  readonly highRes: number;
}
```

### `advance(ms: number): Result<void, ClockRangeError>`

Advances all three time functions by the given number of milliseconds simultaneously. Returns `ok(undefined)` on success, or `err(ClockRangeError)` if the value is negative.

```typescript
const clock = createVirtualClock();
clock.monotonicNow(); // 0
clock.wallClockNow(); // 1707753600000
clock.advance(100); // ok(undefined)
clock.monotonicNow(); // 100
clock.wallClockNow(); // 1707753600100
clock.highResNow(); // 1707753600100
```

REQUIREMENT: `advance()` MUST reject negative values by returning `err(createClockRangeError('ms', ms, 'advance() requires a non-negative value'))`.

### `set(values: Partial<VirtualClockValues>): void`

Sets specific time values independently. Useful for testing edge cases (e.g., wall clock going backward while monotonic advances).

```typescript
const clock = createVirtualClock();
clock.set({ wallClock: 0 }); // Set wall clock to epoch
clock.wallClockNow(); // 0
clock.monotonicNow(); // Still 0 (unchanged)
```

REQUIREMENT: `set()` MUST accept any finite number for each field, including negative values. This is deliberate — test utilities must allow pathological state to test how consumers handle edge cases (e.g., `set({ monotonic: -1 })` to verify a consumer's negative-timestamp guard). `set()` MUST NOT validate its input against production constraints.

REQUIREMENT: `set()` MUST reject `NaN`, `Infinity`, and `-Infinity` for any field by throwing a `TypeError`. Non-finite time values would cause downstream arithmetic to produce `NaN`, silently corrupting test assertions.

### `jumpWallClock(ms: number): void`

Moves wall-clock and high-res time without affecting monotonic time. Simulates an NTP clock adjustment.

```typescript
const clock = createVirtualClock();
clock.advance(100);
clock.jumpWallClock(-50); // Simulate backward NTP correction
clock.monotonicNow(); // 100 (unaffected)
clock.wallClockNow(); // 1707753600050 (100 - 50)
```

This is the primary tool for testing monotonic-vs-wall-clock divergence scenarios.

### Input Validation for Factory Options

REQUIREMENT: `createVirtualClock()` MUST reject `NaN`, `Infinity`, or `-Infinity` for any field in `VirtualClockOptions` by throwing a `TypeError`. Non-finite initial values would cause all subsequent time function returns to be `NaN`, silently corrupting test assertions. Finite values — including negative numbers and zero — MUST be accepted, because test scenarios deliberately use pathological initial state (e.g., `initialMonotonic: -1` to test consumer guards, `initialWallClock: 0` to test epoch edge cases).

REQUIREMENT: `createVirtualSequenceGenerator()` MUST reject `NaN`, `Infinity`, `-Infinity`, and non-integer values for `startAt` in `VirtualSequenceOptions` by throwing a `TypeError`. The sequence counter must be an integer — non-integer or non-finite starting values would cause `next()` to produce values that fail `Number.isSafeInteger()`. Negative integers and zero MUST be accepted.

**Design rationale:** Test utilities use `TypeError` exceptions (not `Result`) for invalid factory options because these are programming errors in test setup, not runtime conditions. A test that passes `NaN` as `initialMonotonic` has a bug; the developer needs a stack trace pointing to the faulty test, not an `err()` value to handle.

### Deterministic Behavior

REQUIREMENT: `VirtualClockAdapter` MUST NOT read any system clock. All return values MUST be computed from internal state only.

REQUIREMENT: Two `VirtualClockAdapter` instances constructed with the same `VirtualClockOptions` and subjected to the same sequence of `advance()`, `set()`, and `jumpWallClock()` calls MUST produce identical return values from all three time functions. This guarantees test determinism.

### IQ/OQ/PQ Validation Constraints

**`VirtualClockAdapter` MUST NOT be used in positive IQ, OQ, or PQ qualification tests.** Positive qualification tests validate the production system's behavior on the actual deployment platform. Using virtual adapters in positive tests defeats the purpose of qualification by substituting synthetic timing for real platform timing.

**Scope of this prohibition:** The virtual adapter prohibition applies to **positive qualification tests** that verify production behavior under real conditions (IQ-1 through IQ-30, OQ-1 through OQ-5, PQ-1 through PQ-5, DQ-1 through DQ-5). **Negative qualification tests** (OQ-6 through OQ-8) that deliberately inject failure conditions MAY use virtual or mock adapters when the test objective requires conditions impossible to reproduce on a correctly functioning production system (e.g., advancing a counter to `MAX_SAFE_INTEGER`, forcing a wall-clock value of `0`, or preventing platform API freeze). The distinction is that negative tests verify error path behavior, not production operational behavior — injecting controlled failure conditions is inherent to their purpose.

REQUIREMENT: Positive IQ/OQ/PQ test suites MUST use the production `createSystemClock()` and `createSystemSequenceGenerator()` factories. They MUST NOT use `createVirtualClock()`, `createVirtualSequenceGenerator()`, or any imports from `@hex-di/clock/testing`.

REQUIREMENT: Negative OQ tests (OQ-6 through OQ-8) MAY import from `@hex-di/clock/testing` when the test requires injecting conditions that cannot be reproduced with production adapters on a correctly functioning system. Each negative test MUST document in its test description why virtual adapters are necessary for the test objective.

**Anti-patterns that invalidate positive qualification results:**

| Anti-Pattern                | Qualification Impact            | Explanation                                                                                           |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `initialWallClock: 0`       | Masks ST-2 startup check        | ST-2 verifies wall-clock is after 2020; a zero epoch passes no real validation                        |
| Negative `initialMonotonic` | Masks ST-1 startup check        | ST-1 verifies monotonic non-negativity; a negative value would pass in virtual but fail in production |
| `jumpWallClock()`           | Invalidates OQ accuracy tests   | OQ-2 measures wall-clock accuracy against `Date.now()`; synthetic jumps bypass real NTP behavior      |
| `advance()`                 | Invalidates PQ throughput tests | PQ-1 measures sustained throughput on real hardware; synthetic advancement measures nothing           |

REQUIREMENT: Positive qualification test files (`gxp-iq-clock.test.ts`, `gxp-oq-clock.test.ts`, `gxp-pq-clock.test.ts`) MUST import from `@hex-di/clock`, NOT from `@hex-di/clock/testing`. A test file that imports from `@hex-di/clock/testing` MUST NOT be counted as a positive qualification test. Negative OQ tests that require virtual adapters SHOULD be placed in a separate test file (`gxp-oq-negative-clock.test.ts`) or clearly delimited section to maintain separation from positive qualification tests.

REQUIREMENT: GxP organizations MUST include this constraint in their computerized system validation plan, documenting that positive qualification tests use production adapters exclusively and that negative qualification tests using virtual adapters are justified per test objective.

## 5.2 VirtualSequenceGenerator

A test-only `SequenceGeneratorPort` with inspection and pre-seeding capabilities.

### Factory

```typescript
function createVirtualSequenceGenerator(options?: VirtualSequenceOptions): VirtualSequenceGenerator;

interface VirtualSequenceOptions {
  readonly startAt?: number; // Default: 0 (first next() returns 1)
}
```

### Interface

```typescript
interface VirtualSequenceGenerator extends SequenceGeneratorPort {
  readonly setCounter: (value: number) => void;
  readonly reset: () => void;
}
```

### `reset(): void`

Resets the counter to its initial state. The next `next()` call after `reset()` MUST return `1`.

REQUIREMENT: `reset()` is available ONLY on `VirtualSequenceGenerator`. The production `SequenceGeneratorPort` interface does NOT include `reset()`. This ensures that production sequence generators are structurally irresettable, eliminating audit trail ordering corruption risk at compile time (see section 3.1 for GxP rationale).

### `setCounter(value: number): void`

Sets the internal counter to an arbitrary value. The next `next()` call returns `ok(value + 1)`.

REQUIREMENT: `setCounter()` MUST accept any finite number, including negative values and zero. This is deliberate — test utilities must allow arbitrary state to test edge cases (e.g., `setCounter(-1)` to verify that `next()` returns `ok(0)`, or `setCounter(Number.MAX_SAFE_INTEGER)` to test overflow). `setCounter()` MUST NOT validate its input against production constraints.

REQUIREMENT: `setCounter()` MUST reject `NaN`, `Infinity`, and `-Infinity` by throwing a `TypeError`. These are not valid counter states — they would cause `next()` to produce non-finite sequence numbers that violate the safe integer contract. Unlike `Result`-based error handling for production APIs, test utility programming errors use exceptions because they indicate a bug in the test itself, not a runtime condition to handle.

```typescript
const seq = createVirtualSequenceGenerator();
seq.setCounter(999);
seq.next(); // ok(1000)
seq.current(); // 1000
```

Useful for testing overflow behavior without calling `next()` 2^53 times:

```typescript
const seq = createVirtualSequenceGenerator();
seq.setCounter(Number.MAX_SAFE_INTEGER - 1);
seq.next(); // ok(Number.MAX_SAFE_INTEGER)
seq.next(); // err(SequenceOverflowError)
```

## 5.3 Deterministic Testing Patterns

### Pattern 1: Controlled Duration Measurement

```typescript
it("measures HTTP request duration using monotonic clock", () => {
  const clock = createVirtualClock();
  const client = createHttpClient({ clock });

  // Simulate: request starts, 250ms passes, response arrives
  clock.advance(250);

  // Assert duration was captured as 250ms
});
```

### Pattern 2: NTP Jump Resilience

```typescript
it("monotonic ordering survives NTP backward jump", () => {
  const clock = createVirtualClock();

  clock.advance(100);
  const t1 = clock.monotonicNow(); // 100

  clock.jumpWallClock(-5000); // NTP corrects 5 seconds backward
  clock.advance(50);

  const t2 = clock.monotonicNow(); // 150
  expect(t2).toBeGreaterThan(t1); // Monotonic unaffected

  const wall = clock.wallClockNow();
  // Wall clock went backward, which is expected
});
```

### Pattern 3: Coarsened Resolution Simulation

```typescript
it("sequence numbers order events with identical timestamps", () => {
  const clock = createVirtualClock();
  const seq = createVirtualSequenceGenerator();

  // Don't advance time -- simulate coarsened resolution
  const s1 = seq.next(); // ok(1)
  const s2 = seq.next(); // ok(2)
  const s3 = seq.next(); // ok(3)

  const events = [
    { timestamp: clock.monotonicNow(), seq: s1.value },
    { timestamp: clock.monotonicNow(), seq: s2.value },
    { timestamp: clock.monotonicNow(), seq: s3.value },
  ];

  // All timestamps are identical (0)
  expect(new Set(events.map(e => e.timestamp)).size).toBe(1);

  // But sequence numbers provide total ordering
  expect(events[0].seq).toBeLessThan(events[1].seq);
  expect(events[1].seq).toBeLessThan(events[2].seq);
});
```

### Pattern 4: Overflow Testing

```typescript
it("returns err(SequenceOverflowError) at MAX_SAFE_INTEGER", () => {
  const seq = createVirtualSequenceGenerator();
  seq.setCounter(Number.MAX_SAFE_INTEGER);

  const result = seq.next();
  expect(result.isErr()).toBe(true);
});
```

### Pattern 5: Multi-Worker Timestamp Correlation

In GxP environments with horizontal scaling or worker-based processing, cross-worker timestamp correlation is a validation concern. Each worker has its own `SystemClockAdapter` instance with independent monotonic state. This pattern demonstrates testing cross-worker ordering.

```typescript
it("cross-worker events are ordered by wall-clock + sequence, not monotonic", () => {
  // Simulate two workers with different startup times
  const worker1Clock = createVirtualClock({ initialWallClock: 1707753600000 });
  const worker2Clock = createVirtualClock({ initialWallClock: 1707753600050 }); // started 50ms later

  const worker1Seq = createVirtualSequenceGenerator();
  const worker2Seq = createVirtualSequenceGenerator();

  // Worker 1 processes event first
  worker1Clock.advance(100);
  const seq1 = worker1Seq.next(); // ok(1)
  const event1 = {
    wallClock: worker1Clock.wallClockNow(), // 1707753600100
    monotonic: worker1Clock.monotonicNow(), // 100
    seq: seq1.value, // 1
    workerId: "worker-1",
  };

  // Worker 2 processes event 10ms later in wall-clock time
  worker2Clock.advance(60);
  const seq2 = worker2Seq.next(); // ok(1)
  const event2 = {
    wallClock: worker2Clock.wallClockNow(), // 1707753600110
    monotonic: worker2Clock.monotonicNow(), // 60
    seq: seq2.value, // 1
    workerId: "worker-2",
  };

  // Monotonic times are NOT comparable cross-worker (100 vs 60 is misleading)
  // Wall-clock times ARE comparable (1707753600100 < 1707753600110)
  expect(event1.wallClock).toBeLessThan(event2.wallClock);

  // Sequence numbers are NOT comparable cross-worker (both are 1)
  expect(event1.seq).toBe(event2.seq); // Both 1 -- no cross-worker ordering

  // Cross-worker ordering MUST use wall-clock timestamps
  // Consumer MUST accept reduced precision (NTP-dependent)
});
```

**GxP note:** This pattern validates that test infrastructure correctly models the cross-worker timing constraints documented in section 4.1. In GxP deployments with multiple workers, audit trail entries MUST include a worker identifier alongside the wall-clock timestamp to enable unambiguous cross-worker event reconstruction.

### Integration with Existing VirtualClock

The existing `VirtualClock` in `@hex-di/flow-testing` wraps Vitest fake timers for async/timer control. It serves a different purpose:

|               | `VirtualClockAdapter` (`@hex-di/clock/testing`) | `VirtualClock` (`@hex-di/flow-testing`)  |
| ------------- | ----------------------------------------------- | ---------------------------------------- |
| **Controls**  | `ClockPort` return values                       | Vitest `setTimeout`/`setInterval` timers |
| **Scope**     | Synchronous time queries                        | Asynchronous timer execution             |
| **Mechanism** | Internal counter                                | `vi.useFakeTimers()`                     |
| **Use case**  | Deterministic timestamp testing                 | Deterministic async flow testing         |

These two utilities are complementary, not competing. A test MAY use both simultaneously.

### Auto-Advance on Read

Some test patterns benefit from time auto-ticking on every read, avoiding the need for manual `advance()` calls between every assertion. The `autoAdvance` option and `setAutoAdvance()` / `getAutoAdvance()` methods control this behavior.

**Behavior:** When `autoAdvance` is set to a value greater than `0`, each call to `monotonicNow()`, `wallClockNow()`, or `highResNow()` returns the current value and then advances all three clocks by `autoAdvance` milliseconds. This means the **returned** value reflects the state **before** the auto-advance — the advance happens after the read.

```typescript
const clock = createVirtualClock({ autoAdvance: 10 });
clock.monotonicNow(); // 0 (then auto-advances by 10)
clock.monotonicNow(); // 10 (then auto-advances by 10)
clock.wallClockNow(); // 1707753600020 (then auto-advances by 10)
clock.monotonicNow(); // 30
```

**Linked timer scheduler interaction:** When auto-advance triggers a time advancement, any linked `VirtualTimerScheduler` (see §5.4) fires pending timers whose scheduled time falls within the advanced range, maintaining consistency between clock reads and timer execution.

### `setAutoAdvance(ms: number): void`

Sets the auto-advance increment. A value of `0` disables auto-advance. Overrides the `autoAdvance` option from construction.

REQUIREMENT (CLK-ADV-001): `setAutoAdvance` MUST throw `TypeError` for negative values, `NaN`, or `Infinity`.

REQUIREMENT (CLK-ADV-002): `setAutoAdvance(0)` MUST disable auto-advance. After calling `setAutoAdvance(0)`, time reads MUST NOT modify internal state.

### `getAutoAdvance(): number`

Returns the current auto-advance increment. Returns `0` if auto-advance is disabled.

REQUIREMENT (CLK-ADV-003): `getAutoAdvance()` MUST return the value most recently set by `setAutoAdvance()`, or the `autoAdvance` option from construction if `setAutoAdvance()` has not been called.

### Auto-Advance Determinism

REQUIREMENT (CLK-ADV-004): Auto-advance MUST produce the same results as manual `advance()` calls. Specifically, for `autoAdvance: N`, calling `monotonicNow()` MUST be equivalent to reading the current monotonic value and then calling `advance(N)`.

REQUIREMENT (CLK-ADV-005): The auto-advance increment from `VirtualClockOptions.autoAdvance` MUST be validated at construction time. `NaN`, `Infinity`, `-Infinity`, and negative values MUST throw `TypeError`. `0` is valid (disables auto-advance).

## 5.4 VirtualTimerScheduler

A test-only `TimerSchedulerPort` adapter linked to a `VirtualClockAdapter` for deterministic timer testing. When the virtual clock advances (via `advance()`, `set()`, or auto-advance), pending timers whose scheduled time has been reached fire synchronously in chronological order.

### Factory

```typescript
function createVirtualTimerScheduler(
  clock: VirtualClockAdapter
): VirtualTimerScheduler;
```

### Interface

```typescript
interface VirtualTimerScheduler extends TimerSchedulerPort {
  readonly pendingCount: () => number;
  readonly advanceTime: (ms: number) => void;
  readonly runAll: () => void;
  readonly runNext: () => void;
  readonly blockUntil: (n: number, options?: BlockUntilOptions) => Promise<void>;
}

interface BlockUntilOptions {
  readonly timeoutMs?: number; // Default: 5000
}
```

### Linkage with VirtualClockAdapter

`createVirtualTimerScheduler(clock)` registers an internal `onAdvance` callback with the provided `VirtualClockAdapter`. When the clock's `advance()` method is called (or auto-advance triggers), the callback fires all timers whose scheduled time falls within the advanced range, in chronological order.

REQUIREMENT (CLK-TMR-011): When the virtual clock advances by `N` ms, all pending `setTimeout` callbacks scheduled to fire within the `[currentTime, currentTime + N]` range MUST execute synchronously, in order of their scheduled fire time. Ties (same scheduled time) MUST fire in registration order (FIFO).

REQUIREMENT (CLK-TMR-012): `setInterval` callbacks MUST fire for each interval that falls within the advanced range. For example, a 100ms interval with a 250ms advance fires at 100ms and 200ms.

### `pendingCount(): number`

Returns the number of pending (not yet fired, not cancelled) timers and intervals.

### `advanceTime(ms: number): void`

Advances the linked virtual clock by `ms` milliseconds and fires all timers in the advanced range. Convenience method equivalent to `clock.advance(ms)` but ensures timer firing is explicit in the test.

### `runAll(): void`

Fires all pending timers immediately, regardless of their scheduled time. The linked clock advances to the latest scheduled time. Useful for draining the timer queue in teardown.

### `runNext(): void`

Fires only the next pending timer (the one with the earliest scheduled time). The linked clock advances to that timer's scheduled time. Useful for step-by-step timer debugging.

### `blockUntil(n: number, options?: BlockUntilOptions): Promise<void>`

Returns a promise that resolves when `pendingCount() >= n`. This allows test code to wait for async operations to register their timers before advancing time.

```typescript
const scheduler = createVirtualTimerScheduler(clock);

// Start an async operation that will call scheduler.setTimeout internally
startAsyncOperation(scheduler);

// Wait until the operation has registered its timer
await scheduler.blockUntil(1);

// Now safe to advance time
scheduler.advanceTime(1000);
```

REQUIREMENT (CLK-WSY-001): `blockUntil` MUST resolve immediately if `pendingCount() >= n` at the time of the call.

REQUIREMENT (CLK-WSY-002): `blockUntil` MUST reject with `ClockTimeoutError` if the condition is not met within `options.timeoutMs` (default: 5000ms). The timeout uses real platform time (not virtual time) to prevent deadlocks.

REQUIREMENT (CLK-WSY-003): `blockUntil` MUST NOT advance virtual time. It is a synchronization primitive only.

REQUIREMENT (CLK-WSY-004): `ClockTimeoutError` MUST be exported from `@hex-di/clock/testing`.

### ClockTimeoutError

```typescript
interface ClockTimeoutError {
  readonly _tag: "ClockTimeoutError";
  readonly expected: number;
  readonly actual: number;
  readonly timeoutMs: number;
  readonly message: string;
}
```

`expected` is the `n` value passed to `blockUntil`. `actual` is the `pendingCount()` at the time of timeout. `timeoutMs` is the timeout duration.

REQUIREMENT: `ClockTimeoutError` MUST be frozen at construction, consistent with the project's error immutability pattern.

### Testing Export

REQUIREMENT: `VirtualTimerScheduler`, `createVirtualTimerScheduler`, `BlockUntilOptions`, and `ClockTimeoutError` MUST be exported from `@hex-di/clock/testing`.

## 5.5 VirtualCachedClock

A test-only `CachedClockAdapter` that tracks a `VirtualClockAdapter` source directly, without a background `setInterval` updater. This makes cached clock testing deterministic.

### Factory

```typescript
function createVirtualCachedClock(
  clock: VirtualClockAdapter
): CachedClockAdapter;
```

### Behavior

- `recentMonotonicNow()` returns the source clock's current `monotonicNow()` value.
- `recentWallClockNow()` returns the source clock's current `wallClockNow()` value.
- `start()` and `stop()` are no-ops (no background updater to manage).
- `isRunning()` always returns `true`.

The virtual cached clock is intentionally trivial — it exists so that test code using `CachedClockPort` can be tested with a `VirtualClockAdapter` source without needing real timers.

REQUIREMENT: `createVirtualCachedClock` MUST be exported from `@hex-di/clock/testing`.

REQUIREMENT: The returned `CachedClockAdapter` MUST be frozen with `Object.freeze()`.

REQUIREMENT: `recentMonotonicNow()` and `recentWallClockNow()` MUST return branded timestamp types, consistent with the production `CachedClockAdapter`.

## 5.6 Testing Assertion Helpers

`@hex-di/clock/testing` provides assertion helpers for common timing-related test conditions. These helpers produce clear error messages when assertions fail, reducing debugging time in CI.

### `assertMonotonic`

```typescript
function assertMonotonic(
  values: ReadonlyArray<MonotonicTimestamp>,
  label?: string
): void;
```

Asserts that the array of monotonic timestamps is strictly increasing. Throws `AssertionError` on the first pair where `values[i] >= values[i+1]`, with a message like:

```
Monotonic assertion failed (label): values[2] (100) >= values[3] (100)
```

REQUIREMENT (CLK-TST-001): `assertMonotonic` MUST throw on non-strictly-increasing sequences. Equal values are a failure (not just decreasing).

REQUIREMENT (CLK-TST-002): `assertMonotonic` MUST accept empty and single-element arrays without throwing.

### `assertTimeBetween`

```typescript
function assertTimeBetween(
  actual: MonotonicDuration,
  min: MonotonicDuration,
  max: MonotonicDuration,
  label?: string
): void;
```

Asserts that `actual` falls within `[min, max]` (inclusive). Throws `AssertionError` with:

```
Time assertion failed (label): 250ms not in [100ms, 200ms]
```

REQUIREMENT (CLK-TST-003): `assertTimeBetween` MUST use inclusive bounds. `actual === min` and `actual === max` pass.

### `assertWallClockPlausible`

```typescript
function assertWallClockPlausible(
  timestamp: WallClockTimestamp,
  label?: string
): void;
```

Asserts that the wall-clock timestamp is plausible: after 2020-01-01T00:00:00Z and not more than 1 day in the future. Throws `AssertionError` with:

```
Wall-clock assertion failed (label): 946684800000 is before 2020-01-01
```

REQUIREMENT (CLK-TST-004): `assertWallClockPlausible` MUST reject timestamps before 2020-01-01 (1577836800000ms).

REQUIREMENT (CLK-TST-005): `assertWallClockPlausible` MUST reject timestamps more than 86400000ms (1 day) after the current wall-clock time.

### `assertSequenceOrdered`

```typescript
function assertSequenceOrdered(
  values: ReadonlyArray<number>,
  label?: string
): void;
```

Asserts that the array of sequence numbers is strictly increasing by exactly 1 (consecutive). Throws `AssertionError` on gaps or duplicates:

```
Sequence assertion failed (label): values[2] (3) -> values[3] (5): gap of 2, expected 1
```

REQUIREMENT (CLK-TST-006): `assertSequenceOrdered` MUST detect both duplicates (gap = 0) and gaps (gap > 1).

### Export

REQUIREMENT (CLK-TST-007): All assertion helpers (`assertMonotonic`, `assertTimeBetween`, `assertWallClockPlausible`, `assertSequenceOrdered`) MUST be exported from `@hex-di/clock/testing`.

## 5.7 Testing Recipes

Additional testing patterns beyond the core patterns in §5.3.

### Recipe 1: Deadline-Based Timeout Testing

Test that an operation respects a deadline using virtual time control.

```typescript
it("aborts when deadline is exceeded", async () => {
  const clock = createVirtualClock();
  const scheduler = createVirtualTimerScheduler(clock);

  const operation = timeout(scheduler, longRunningTask(), 5000);

  // Advance past the deadline
  scheduler.advanceTime(6000);

  await expect(operation).rejects.toMatchObject({
    _tag: "ClockTimeoutError",
    timeoutMs: 5000,
  });
});
```

### Recipe 2: Retry with Backoff Verification

Verify that retry delays follow the expected backoff schedule.

```typescript
it("retries with exponential backoff", async () => {
  const clock = createVirtualClock();
  const scheduler = createVirtualTimerScheduler(clock);

  let attempts = 0;
  const failingFn = async () => {
    attempts++;
    throw new Error("fail");
  };

  const retryPromise = retry(scheduler, failingFn, {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2,
  });

  // First attempt fails immediately
  expect(attempts).toBe(1);

  // Advance 100ms for first retry delay
  scheduler.advanceTime(100);
  await Promise.resolve(); // flush microtasks
  expect(attempts).toBe(2);

  // Advance 200ms for second retry delay (100 * 2^1)
  scheduler.advanceTime(200);
  await Promise.resolve();
  expect(attempts).toBe(3);

  await expect(retryPromise).rejects.toThrow("fail");
});
```

### Recipe 3: Duration Measurement with Branded Types

Verify that `elapsed()` and `measure()` produce correctly branded durations.

```typescript
it("elapsed returns branded MonotonicDuration", () => {
  const clock = createVirtualClock();
  const start = clock.monotonicNow();
  clock.advance(500);

  const duration = elapsed(clock, start);
  assertTimeBetween(
    duration,
    asMonotonicDuration(499),
    asMonotonicDuration(501)
  );
});
```

### Recipe 4: AsyncLocalStorage Clock Propagation

Test that clock context propagates through async boundaries.

```typescript
it("clock context propagates through async calls", async () => {
  const clock = createVirtualClock({ initialWallClock: 1700000000000 });
  const seq = createVirtualSequenceGenerator();
  const clockCtx = createClockContext();

  async function innerFn(): Promise<WallClockTimestamp> {
    const ctx = clockCtx.get();
    return ctx!.clock.wallClockNow();
  }

  const result = await clockCtx.run({ clock, seq }, async () => {
    clock.advance(1000);
    return innerFn();
  });

  expect(result).toBe(1700000001000);
});
```

### Recipe 5: Temporal API Roundtrip

Test Temporal interop conversion fidelity.

```typescript
it("roundtrips through Temporal.Instant without precision loss", () => {
  const clock = createVirtualClock({ initialWallClock: 1707753600123 });
  const wall = clock.wallClockNow();

  const instant = toTemporalInstant(wall);
  const roundTripped = fromTemporalInstant(instant);

  expect(roundTripped).toBe(wall);
});
```

### Recipe 6: Cached Clock Staleness Verification

Verify that cached clock values lag behind the source clock.

```typescript
it("cached clock returns stale values between refreshes", () => {
  const clock = createVirtualClock();
  const cached = createVirtualCachedClock(clock);

  const t0 = cached.recentMonotonicNow();
  clock.advance(50);

  // Virtual cached clock tracks immediately (no real timer)
  const t1 = cached.recentMonotonicNow();
  expect(t1).toBe(50); // VirtualCachedClock reads source directly
});
```
