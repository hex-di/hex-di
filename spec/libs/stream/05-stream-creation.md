# 05 - Stream Creation

## 23. createStream

The primary factory for creating cold streams from a producer function.

### Signature

```typescript
function createStream<T, E = never>(
  producer: (sink: StreamSink<T, E>) => void | (() => void),
  config?: StreamConfig<T, E>
): Stream<T, E>;
```

The producer function receives a `StreamSink` and pushes values into it. The optional return value is a teardown function called when the last subscriber unsubscribes. Each `subscribe()` call invokes the producer anew.

### StreamConfig

```typescript
interface StreamConfig<T, E = never> {
  /** Buffer configuration for push-based subscribers. Default: capacity 256, drop-oldest. */
  readonly buffer?: BufferConfig;

  /** Scheduler for time-dependent operations. Default: real timers. */
  readonly scheduler?: Scheduler;
}
```

### Examples

```typescript
// Simple synchronous stream
const numbers = createStream<number>(sink => {
  sink.next(1);
  sink.next(2);
  sink.next(3);
  sink.complete();
});

// Async stream with teardown
const ticks = createStream<number>(sink => {
  let count = 0;
  const id = setInterval(() => sink.next(count++), 1000);
  return () => clearInterval(id); // Teardown
});

// Stream with AbortSignal awareness
const fetcher = createStream<Response>(sink => {
  fetch("/api/data", { signal: sink.signal })
    .then(res => {
      sink.next(res);
      sink.complete();
    })
    .catch(err => {
      if (!sink.signal.aborted) {
        sink.terminate(err);
      }
    });
});

// Stream with recoverable errors
const validated = createStream<User, ValidationError>(sink => {
  fetchUsers().then(users => {
    for (const user of users) {
      const result = validateUser(user);
      if (result.isOk()) {
        sink.next(result.value);
      } else {
        sink.error(result.error); // Recoverable -- stream continues
      }
    }
    sink.complete();
  });
});

// Stream with custom buffer config
const highFreq = createStream<SensorReading>(
  sink => {
    sensor.onReading(reading => sink.next(reading));
    return () => sensor.disconnect();
  },
  { buffer: { capacity: 1024, strategy: "drop-oldest" } }
);
```

## 24. of

Creates a cold stream that synchronously emits each value and completes.

### Signature

```typescript
function of<T>(...values: readonly T[]): Stream<T, never>;
```

### Example

```typescript
const stream = of(1, 2, 3);
// Subscribing emits: 1, 2, 3, complete
```

## 25. fromIterable

Creates a cold stream from a synchronous iterable.

### Signature

```typescript
function fromIterable<T>(iterable: Iterable<T>): Stream<T, never>;
```

### Example

```typescript
const stream = fromIterable([1, 2, 3]);
const stream2 = fromIterable(new Set(["a", "b", "c"]));

function* fib() {
  let a = 0,
    b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}
const fibs = fromIterable(fib()).pipe(take(10));
```

## 26. fromAsyncIterable

Creates a cold stream from an `AsyncIterable<T>`. Each subscription iterates the iterable independently.

### Signature

```typescript
function fromAsyncIterable<T>(iterable: AsyncIterable<T>): Stream<T, never>;
```

### Example

```typescript
async function* fetchPages(url: string) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    if (!res.ok) break;
    yield await res.json();
    page++;
  }
}

const pages = fromAsyncIterable(fetchPages("/api/users"));
```

## 27. fromPromise

Converts a `Promise<T>` into a cold stream that emits one value and completes (or terminates on rejection).

### Signature

```typescript
function fromPromise<T>(promise: Promise<T>): Stream<T, never>;
```

### Example

```typescript
const user = fromPromise(fetchUser("123"));
// Emits the resolved value then completes, or terminates on rejection
```

## 28. fromResultAsync

Converts a `ResultAsync<T, E>` into a cold stream that emits one value on `Ok` or one recoverable error on `Err`, then completes.

### Signature

```typescript
function fromResultAsync<T, E>(resultAsync: ResultAsync<T, E>): Stream<T, E>;
```

### Example

```typescript
const result = ResultAsync.fromPromise(
  fetch("/api/users").then(r => r.json()),
  err => new NetworkError(err)
);

const stream = fromResultAsync(result);
// On Ok: emits value, completes
// On Err: emits recoverable error, completes
```

## 29. fromEvent

Creates a hot stream from a DOM-like event target. The stream never completes on its own; disposal removes the listener.

### Signature

```typescript
interface EventTargetLike {
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}

function fromEvent<T>(target: EventTargetLike, eventName: string): Stream<T, never>;
```

### Example

```typescript
// DOM events
const clicks = fromEvent<MouseEvent>(document, "click");
const keydowns = fromEvent<KeyboardEvent>(window, "keydown");

// Custom event target
const messages = fromEvent<MessageEvent>(webSocket, "message");
```

## 30. interval / timer

### interval

Creates a cold stream that emits sequential integers at a fixed interval.

```typescript
function interval(periodMs: number, scheduler?: Scheduler): Stream<number, never>;
```

```typescript
const ticks = interval(1000); // Emits 0, 1, 2, 3... every second
```

### timer

Creates a cold stream that emits `0` after a delay, then optionally continues at an interval.

```typescript
function timer(delayMs: number, periodMs?: number, scheduler?: Scheduler): Stream<number, never>;
```

```typescript
const delayed = timer(5000); // Emits 0 after 5 seconds, then completes
const periodic = timer(1000, 2000); // Emits 0 after 1s, then 1, 2, 3... every 2s
```

Both `interval` and `timer` accept an optional `Scheduler` for testability. When no scheduler is provided, they use `setTimeout`/`setInterval`.

## 31. EMPTY / NEVER

### EMPTY

A stream that immediately completes with no values.

```typescript
const EMPTY: Stream<never, never>;
```

```typescript
const empty = EMPTY;
empty.subscribe({
  complete: () => console.log("Done"), // Called immediately
});
```

### NEVER

A stream that never emits and never completes. Useful for testing timeouts and as a placeholder.

```typescript
const NEVER: Stream<never, never>;
```

```typescript
const never = NEVER;
never.subscribe({
  next: () => {}, // Never called
  complete: () => {}, // Never called
});
```

### throwError

Creates a stream that immediately terminates with the given error.

```typescript
function throwError(error: unknown): Stream<never, never>;
```

```typescript
const failed = throwError(new Error("boom"));
failed.subscribe({
  terminate: err => console.error(err), // Called with Error("boom")
});
```

---

_Previous: [04 - Stream Adapters](./04-stream-adapters.md)_

_Next: [06 - Subjects](./06-subjects.md)_
