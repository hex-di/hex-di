# 05 - Testing Support

## 5.1 VirtualClockAdapter

A test-only `ClockPort` adapter with fully controllable time for deterministic testing.

### Factory

```typescript
function createVirtualClock(options?: VirtualClockOptions): VirtualClockAdapter;

interface VirtualClockOptions {
  readonly initialMonotonic?: number; // Default: 0
  readonly initialWallClock?: number; // Default: 1707753600000 (2024-02-12T12:00:00Z)
  readonly initialHighRes?: number; // Default: same as initialWallClock
}
```

### Interface

```typescript
interface VirtualClockAdapter extends ClockPort {
  readonly advance: (ms: number) => Result<void, ClockRangeError>;
  readonly set: (values: Partial<VirtualClockValues>) => void;
  readonly jumpWallClock: (ms: number) => void;
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

**`VirtualClockAdapter` MUST NOT be used in IQ, OQ, or PQ qualification tests.** Qualification tests validate the production system's behavior on the actual deployment platform. Using virtual adapters defeats the purpose of qualification by substituting synthetic timing for real platform timing.

REQUIREMENT: IQ/OQ/PQ test suites MUST use the production `createSystemClock()` and `createSystemSequenceGenerator()` factories. They MUST NOT use `createVirtualClock()`, `createVirtualSequenceGenerator()`, or any imports from `@hex-di/clock/testing`.

**Anti-patterns that invalidate qualification results:**

| Anti-Pattern                | Qualification Impact            | Explanation                                                                                           |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `initialWallClock: 0`       | Masks ST-2 startup check        | ST-2 verifies wall-clock is after 2020; a zero epoch passes no real validation                        |
| Negative `initialMonotonic` | Masks ST-1 startup check        | ST-1 verifies monotonic non-negativity; a negative value would pass in virtual but fail in production |
| `jumpWallClock()`           | Invalidates OQ accuracy tests   | OQ-2 measures wall-clock accuracy against `Date.now()`; synthetic jumps bypass real NTP behavior      |
| `advance()`                 | Invalidates PQ throughput tests | PQ-1 measures sustained throughput on real hardware; synthetic advancement measures nothing           |

REQUIREMENT: Qualification test files (`gxp-iq-clock.test.ts`, `gxp-oq-clock.test.ts`, `gxp-pq-clock.test.ts`) MUST import from `@hex-di/clock`, NOT from `@hex-di/clock/testing`. A test file that imports from `@hex-di/clock/testing` MUST NOT be counted as a qualification test.

REQUIREMENT: GxP organizations MUST include this constraint in their computerized system validation plan, documenting that qualification tests use production adapters exclusively.

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
