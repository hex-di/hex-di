# 13 - Testing

## 69. Test Utilities

The primary testing strategy is **adapter swapping** -- replace production stream adapters with mock adapters in the graph.

### createStreamTestContainer

```typescript
function createStreamTestContainer(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: {
    scheduler?: Scheduler;
    buffer?: BufferConfig;
  }
): {
  container: Container;
  scheduler: TestScheduler;
  dispose: () => void;
};
```

### Usage

```typescript
const { container, scheduler, dispose } = createStreamTestContainer([
  MockPriceAdapter,
  MockEventBusAdapter,
]);

try {
  const producer = container.resolve(PriceTickerPort);
  const stream = producer();

  const subscriber = new TestSubscriber<PriceTick>();
  stream.subscribe(subscriber);

  scheduler.advanceBy(1000); // Advance virtual time

  expect(subscriber.values).toHaveLength(1);
  expect(subscriber.values[0].price).toBe(100);
} finally {
  dispose();
}
```

### useStreamTestContainer (Vitest Hook)

```typescript
function useStreamTestContainer(
  adapters: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >,
  options?: { scheduler?: Scheduler }
): {
  readonly container: Container;
  readonly scheduler: TestScheduler;
};
```

```typescript
describe("PriceTicker", () => {
  const { container, scheduler } = useStreamTestContainer([MockPriceAdapter]);

  it("emits prices", () => {
    const producer = container.resolve(PriceTickerPort);
    const stream = producer();
    const sub = new TestSubscriber<PriceTick>();
    stream.subscribe(sub);

    scheduler.advanceBy(3000);

    expect(sub.values).toHaveLength(3);
  });
});
```

## 70. Mock Stream & Subject Adapters

### createMockStreamAdapter

Creates a mock stream adapter with controlled emissions:

```typescript
function createMockStreamAdapter<T, E, TName extends string>(
  port: StreamPort<T, E, TName>,
  options: MockStreamOptions<T, E>
): Adapter<StreamPort<T, E, TName>, [], "singleton", "sync">;

interface MockStreamOptions<T, E> {
  /** Static values to emit (then complete). */
  readonly values?: readonly T[];

  /** Dynamic value generator. */
  readonly generator?: (sink: StreamSink<T, E>) => void | (() => void);

  /** Emit these values at the given interval (ms). Requires TestScheduler. */
  readonly interval?: {
    readonly values: readonly T[];
    readonly periodMs: number;
  };

  /** Recoverable errors to emit. */
  readonly errors?: readonly E[];

  /** Terminal error (stream terminates immediately after values/errors). */
  readonly terminateWith?: unknown;

  /** Whether to complete after emitting all values. Default: true. */
  readonly autoComplete?: boolean;
}
```

### Examples

```typescript
// Static values
const MockPriceAdapter = createMockStreamAdapter(PriceTickerPort, {
  values: [
    { symbol: "BTC", price: 50000, timestamp: Date.now() },
    { symbol: "BTC", price: 50100, timestamp: Date.now() + 1000 },
  ],
});

// Interval-based emissions
const IntervalPriceAdapter = createMockStreamAdapter(PriceTickerPort, {
  interval: {
    values: [
      { symbol: "BTC", price: 50000, timestamp: 0 },
      { symbol: "BTC", price: 50100, timestamp: 1000 },
      { symbol: "BTC", price: 50200, timestamp: 2000 },
    ],
    periodMs: 1000,
  },
});

// Error scenario
const ErrorPriceAdapter = createMockStreamAdapter(PriceTickerPort, {
  values: [{ symbol: "BTC", price: 50000, timestamp: 0 }],
  terminateWith: new Error("WebSocket disconnected"),
});

// Generator for full control
const CustomPriceAdapter = createMockStreamAdapter(PriceTickerPort, {
  generator: sink => {
    sink.next({ symbol: "BTC", price: 50000, timestamp: Date.now() });
    sink.error({ _tag: "RateLimit", retryAfter: 60 });
    sink.next({ symbol: "BTC", price: 50100, timestamp: Date.now() + 1000 });
    sink.complete();
  },
});
```

### createMockSubjectAdapter

Creates a mock subject adapter with controlled initial state:

```typescript
function createMockSubjectAdapter<T, E, TName extends string>(
  port: SubjectPort<T, E, TName>,
  options?: MockSubjectOptions<T>
): Adapter<SubjectPort<T, E, TName>, [], "singleton", "sync">;

interface MockSubjectOptions<T> {
  /** Subject type to create. Default: "basic". */
  readonly type?: "basic" | "behavior" | "replay";

  /** Initial value (required for "behavior" type). */
  readonly initialValue?: T;

  /** Buffer size (for "replay" type). Default: 1. */
  readonly bufferSize?: number;
}
```

```typescript
const MockThemeAdapter = createMockSubjectAdapter(ThemePort, {
  type: "behavior",
  initialValue: "light",
});
```

## 71. TestScheduler

Virtual time scheduler for deterministic testing of time-dependent operators (`debounce`, `throttle`, `interval`, `timer`, `retry` with delay).

### Class

```typescript
class TestScheduler implements Scheduler {
  /** Advance virtual time by the given number of milliseconds. */
  advanceBy(ms: number): void;

  /** Advance virtual time to the given absolute timestamp. */
  advanceTo(ms: number): void;

  /** Execute all pending scheduled tasks. */
  flush(): void;

  /** Current virtual time in milliseconds. */
  readonly now: number;

  /** Number of pending scheduled tasks. */
  readonly pendingCount: number;

  /** Reset the scheduler to time 0 with no pending tasks. */
  reset(): void;
}

/** Factory function for creating a TestScheduler instance. */
function createTestScheduler(): TestScheduler;
```

### Usage

```typescript
import { createTestScheduler } from "@hex-di/stream-testing";

const scheduler = createTestScheduler();

const stream = interval(1000, scheduler).pipe(
  take(3),
  map(i => i * 10)
);

const sub = new TestSubscriber<number>();
stream.subscribe(sub);

expect(sub.values).toEqual([]); // No time has passed

scheduler.advanceBy(1000);
expect(sub.values).toEqual([0]);

scheduler.advanceBy(2000);
expect(sub.values).toEqual([0, 10, 20]);
expect(sub.isCompleted).toBe(true);
```

### Debounce Testing

```typescript
const scheduler = new TestScheduler();
const subject = createSubject<string>();

const debounced = subject.asStream().pipe(debounce(300, scheduler));
const sub = new TestSubscriber<string>();
debounced.subscribe(sub);

subject.next("a");
scheduler.advanceBy(100);
subject.next("ab");
scheduler.advanceBy(100);
subject.next("abc");
scheduler.advanceBy(300);

expect(sub.values).toEqual(["abc"]); // Only final value after 300ms silence
```

### TestSubscriber

Helper class that records all emissions from a stream:

```typescript
class TestSubscriber<T, E = never> implements StreamObserver<T, E> {
  readonly values: T[] = [];
  readonly errors: E[] = [];
  readonly events: Array<
    | { type: "next"; value: T }
    | { type: "error"; error: E }
    | { type: "complete" }
    | { type: "terminate"; error: unknown }
  > = [];

  isCompleted = false;
  isTerminated = false;
  terminateError: unknown = undefined;

  next(value: T): void;
  error(error: E): void;
  complete(): void;
  terminate(error: unknown): void;
}
```

```typescript
const sub = new TestSubscriber<number>();
stream.subscribe(sub);

// After emissions:
expect(sub.values).toEqual([1, 2, 3]);
expect(sub.isCompleted).toBe(true);
expect(sub.errors).toHaveLength(0);
```

## 72. Stream Assertions

Custom vitest matchers for stream testing. Registered via `setupStreamMatchers()`.

### Setup

```typescript
// vitest.setup.ts
import { setupStreamMatchers } from "@hex-di/stream-testing";

setupStreamMatchers();
```

### Matchers

```typescript
interface StreamMatchers<T, E> {
  /** Assert that the subscriber received specific values. */
  toEmit(expected: readonly T[]): void;

  /** Assert that the subscriber received exactly these values in order. */
  toEmitValues(...values: readonly T[]): void;

  /** Assert that the stream completed. */
  toComplete(): void;

  /** Assert that the stream terminated with an error. */
  toTerminate(expectedError?: unknown): void;

  /** Assert that the subscriber received a recoverable error. */
  toEmitError(expected?: E): void;

  /** Assert the total number of emissions. */
  toEmitCount(count: number): void;

  /** Assert that the subscriber received no values. */
  toBeEmpty(): void;
}
```

### Usage

```typescript
import { TestSubscriber } from "@hex-di/stream-testing";

test("price ticker emits values", () => {
  const sub = new TestSubscriber<PriceTick>();
  priceStream.subscribe(sub);

  scheduler.advanceBy(3000);

  expect(sub).toEmitCount(3);
  expect(sub).toComplete();
});

test("handles recoverable errors", () => {
  const sub = new TestSubscriber<number, ValidationError>();
  stream.subscribe(sub);

  expect(sub).toEmit([1, 2, 3]);
  expect(sub).toEmitError({ _tag: "ValidationError", field: "age" });
  expect(sub).toComplete();
});

test("terminates on fatal error", () => {
  const sub = new TestSubscriber<number>();
  brokenStream.subscribe(sub);

  expect(sub).toTerminate(expect.objectContaining({ message: "Connection lost" }));
});
```

## 73. Type-Level Tests

Type-level tests verify that stream type utilities, port inference, and operator type composition produce correct types.

### File Naming

```
libs/stream/core/tests/
  stream-port.test.ts        # Runtime tests
  stream-port.test-d.ts      # Type-level tests
```

### Port Type Inference

```typescript
import { expectTypeOf, it } from "vitest";

const TickerPort = createStreamPort<PriceTick, PriceError>()({
  name: "PriceTicker",
});

it("infers data type", () => {
  expectTypeOf<InferStreamData<typeof TickerPort>>().toEqualTypeOf<PriceTick>();
});

it("infers error type", () => {
  expectTypeOf<InferStreamError<typeof TickerPort>>().toEqualTypeOf<PriceError>();
});

it("infers name literal", () => {
  expectTypeOf<InferStreamName<typeof TickerPort>>().toEqualTypeOf<"PriceTicker">();
});

it("produces InferenceError for non-port input", () => {
  type Result = InferStreamData<string>;
  expectTypeOf<Result>().toMatchTypeOf<{
    readonly __inferenceError: true;
    readonly __source: "InferStreamData";
  }>();
});
```

### StreamPort extends DirectedPort

```typescript
it("StreamPort is assignable to DirectedPort", () => {
  expectTypeOf<typeof TickerPort>().toMatchTypeOf<
    DirectedPort<StreamProducer<PriceTick, PriceError>, "PriceTicker", "inbound">
  >();
});
```

### Operator Type Composition

```typescript
it("pipe infers intermediate types", () => {
  const stream = of(1, 2, 3);
  const result = stream.pipe(
    filter(x => x > 0),
    map(x => String(x)),
    take(2)
  );
  expectTypeOf(result).toEqualTypeOf<Stream<string, never>>();
});

it("filter with type guard narrows stream type", () => {
  type Admin = User & { role: "admin" };
  const admins = users.pipe(filter((u): u is Admin => u.role === "admin"));
  expectTypeOf(admins).toEqualTypeOf<Stream<Admin, never>>();
});

it("combineLatest produces tuple type", () => {
  const combined = combineLatest(of(1), of("hello"), of(true));
  expectTypeOf(combined).toEqualTypeOf<Stream<[number, string, boolean], never>>();
});
```

### Subject Type Safety

```typescript
it("BehaviorSubject has value property", () => {
  const subject = createBehaviorSubject<number>(0);
  expectTypeOf(subject.value).toEqualTypeOf<number>();
});

it("Subject extends Stream", () => {
  const subject = createSubject<number>();
  expectTypeOf(subject).toMatchTypeOf<Stream<number, never>>();
});

it("Subject extends StreamSink", () => {
  const subject = createSubject<number>();
  expectTypeOf(subject).toMatchTypeOf<StreamSink<number, never>>();
});
```

---

_Previous: [12 - React Integration](./12-react-integration.md)_

_Next: [14 - Advanced Patterns](./14-advanced.md)_
