# 08 - Backpressure

## 47. Hybrid Backpressure Model

`@hex-di/stream` uses a hybrid backpressure model that adapts to the consumption pattern:

- **Push-based subscribers** (`subscribe()`) use a configurable buffer with overflow strategies
- **Pull-based consumers** (`AsyncIterable`) apply natural backpressure: the producer pauses until the consumer is ready

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Stream<T, E>                                     │
│                                                                           │
│  ┌──────────┐                                                            │
│  │ Producer  │──next()──┬──────────────────────────────────────────┐     │
│  │ (Sink)    │          │                                          │     │
│  └──────────┘          ▼                                          ▼     │
│                  ┌─────────────────┐                    ┌─────────────┐ │
│                  │ Push Path       │                    │ Pull Path   │ │
│                  │                 │                    │             │ │
│                  │ ┌─────────────┐ │                    │ Promise     │ │
│                  │ │ Buffer      │ │                    │ handshake   │ │
│                  │ │ (ring)      │ │                    │             │ │
│                  │ │ capacity: N │ │                    │ Producer    │ │
│                  │ │ overflow:   │ │                    │ awaits      │ │
│                  │ │ strategy    │ │                    │ consumer    │ │
│                  │ └─────────────┘ │                    │ next()      │ │
│                  │       │         │                    │ call        │ │
│                  │       ▼         │                    │             │ │
│                  │ observer.next() │                    │ yield       │ │
│                  │                 │                    │ Result<T,E> │ │
│                  └─────────────────┘                    └─────────────┘ │
│                                                                           │
│                  Subscribers                         for await...of       │
└──────────────────────────────────────────────────────────────────────────┘
```

## 48. BufferConfig & OverflowStrategy

### BufferOverflowStrategy

```typescript
type BufferOverflowStrategy =
  | "drop-oldest" // Ring buffer: evict oldest when full (default)
  | "drop-newest" // Discard incoming value when full
  | "error" // Terminate stream with BufferOverflowError when full
  | "unbounded"; // No limit -- use with caution
```

### BufferConfig

```typescript
interface BufferConfig {
  /** Maximum number of values the buffer can hold. Default: 256. */
  readonly capacity: number;

  /** Strategy when buffer is full. Default: "drop-oldest". */
  readonly strategy: BufferOverflowStrategy;
}
```

### Buffer Scope and Activation

- **Per-stream buffer:** Each stream has its own buffer between the producer and all push-based subscribers. There is no shared global buffer.
- **Always active for push-path:** The ring buffer is allocated at subscription time for every push-based subscriber. There is no "activation threshold" -- the buffer exists from the first subscriber.
- **`share()` / `shareReplay()` independence:** When a stream is multicasted via `share()` or `shareReplay()`, the internal Subject has its own buffer independent of the source stream's buffer. The source buffer sits between the producer and the Subject; the Subject's buffer sits between the Subject and its subscribers.
- **AsyncIterable path has no buffer:** Pull-based consumption via `AsyncIterable` uses a promise handshake (see §50). No ring buffer is allocated -- the producer pauses until the consumer is ready.

### onOverflow Callback

An optional callback can be provided to observe buffer overflow events without changing the core drop behavior:

```typescript
interface BufferConfig {
  /** Maximum number of values the buffer can hold. Default: 256. */
  readonly capacity: number;

  /** Strategy when buffer is full. Default: "drop-oldest". */
  readonly strategy: BufferOverflowStrategy;

  /**
   * Called on every drop for `drop-oldest` and `drop-newest` strategies.
   * Enables logging/metrics without changing core behavior.
   * Not called for `error` (stream terminates) or `unbounded` (no drops).
   */
  readonly onOverflow?: (dropped: T, strategy: BufferOverflowStrategy) => void;
}
```

The `onOverflow` callback fires synchronously on the producer's call stack. It must not throw -- thrown exceptions are caught and forwarded to the stream's **diagnostic handler** (the optional `onDiagnostic` callback in `StreamConfig`). If no diagnostic handler is configured, the exception is reported via `console.error` in development and silently swallowed in production. The stream is never disrupted. Typical uses include incrementing a metrics counter or logging a warning.

> **GxP Warning:** `drop-oldest` and `drop-newest` strategies discard data without mandatory audit recording. For regulated data streams, use the `"error"` strategy, or ensure `onOverflow` is provided and connected to an audit system. Omitting `onOverflow` with a drop strategy means data loss is undetectable.

### Default Buffer

When no explicit buffer config is provided:

| Property   | Default         | Rationale                                                             |
| ---------- | --------------- | --------------------------------------------------------------------- |
| `capacity` | `256`           | Large enough for typical UI event rates, small enough to bound memory |
| `strategy` | `"drop-oldest"` | Preserves latest data; safe default for most use cases                |

### Strategy Behavior

#### drop-oldest

Ring buffer semantics. When the buffer is full and a new value arrives, the oldest value is evicted:

```
Buffer [1, 2, 3] capacity=3
  next(4) → [2, 3, 4]  // 1 evicted
  next(5) → [3, 4, 5]  // 2 evicted
```

#### drop-newest

When the buffer is full, incoming values are silently discarded:

```
Buffer [1, 2, 3] capacity=3
  next(4) → [1, 2, 3]  // 4 discarded
  next(5) → [1, 2, 3]  // 5 discarded
```

#### error

When the buffer is full, the stream terminates with a `BufferOverflowError`:

```
Buffer [1, 2, 3] capacity=3
  next(4) → terminate(BufferOverflowError)
```

#### unbounded

No capacity limit. Values accumulate without bound. Use only when the producer rate is guaranteed to be bounded:

```
Buffer [1, 2, 3, ..., N] no limit
  next(N+1) → [1, 2, 3, ..., N, N+1]
```

### StreamConfig

```typescript
interface StreamConfig<T, E> {
  readonly buffer?: BufferConfig;
  /** Called when internal diagnostic events occur (e.g., onOverflow callback failure). */
  readonly onDiagnostic?: (info: StreamDiagnosticInfo) => void;
}
```

`StreamDiagnosticInfo` is documented in §89.

### Configuring Buffer

```typescript
// Per-stream configuration
const highFreq = createStream<SensorReading>(
  sink => {
    /* ... */
  },
  { buffer: { capacity: 1024, strategy: "drop-oldest" } }
);

// Per-subject configuration
const busySubject = createSubject<Event>({
  buffer: { capacity: 512, strategy: "drop-newest" },
});

// Strict mode -- error on overflow
const critical = createStream<AuditEvent>(
  sink => {
    /* ... */
  },
  { buffer: { capacity: 10000, strategy: "error" } }
);
```

## 49. buffer() Operator

The `buffer()` operator (§46) is distinct from the backpressure buffer. The operator collects values into arrays batched by a notifier stream. The backpressure buffer is an internal mechanism that sits between the producer and push-based subscribers.

| Concept             | Purpose                                     | Configuration            |
| ------------------- | ------------------------------------------- | ------------------------ |
| Backpressure buffer | Protect slow subscribers from fast producer | `BufferConfig` on stream |
| `buffer()` operator | Batch values by time/signal                 | Notifier stream argument |

## 50. AsyncIterable Natural Backpressure

When a stream is consumed as `AsyncIterable`, the producer pauses after each value until the consumer calls `next()` on the iterator. This is implemented via an internal `Promise`-based handshake:

```typescript
// Pull-based consumption -- natural backpressure
for await (const result of stream) {
  // Producer is paused until this iteration completes
  result.match(
    value => processValue(value), // May be slow
    error => handleError(error)
  );
  // After processing, producer resumes and sends next value
}
```

### Internal Mechanism

```
Producer                              AsyncIterator
  │                                       │
  ├── next(value) ─── enqueue ──────────► │
  │   (producer waits)                    │
  │                                       ├── yield Result<T, E>
  │                                       │   (consumer processes)
  │◄────────────── resolve ───────────────┤
  │   (producer resumes)                  │
  │                                       │
  ├── next(value2) ── enqueue ──────────► │
  ...                                     ...
```

The handshake ensures:

1. **No buffer overflow** -- the producer never gets ahead of the consumer
2. **No data loss** -- every value is consumed exactly once
3. **Cancellation** -- if the consumer breaks out of the loop, the producer's `AbortSignal` is triggered

### AsyncIterable Error Mapping

| Stream Event     | AsyncIterable Behavior               |
| ---------------- | ------------------------------------ |
| `next(value)`    | Yields `Ok(value)` as `Result<T, E>` |
| `error(err)`     | Yields `Err(err)` as `Result<T, E>`  |
| `complete()`     | Returns `{ done: true }`             |
| `terminate(err)` | Throws `err` from `next()` call      |

## 51. Producer-Side AbortSignal

Every `StreamSink` exposes a `signal: AbortSignal` that producers should respect:

```typescript
const stream = createStream<Data>(sink => {
  const controller = new AbortController();

  // Link sink's signal to abort controller
  sink.signal.addEventListener("abort", () => controller.abort());

  fetch("/api/stream", { signal: controller.signal })
    .then(async response => {
      const reader = response.body!.getReader();
      try {
        while (!sink.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          sink.next(parseChunk(value));
        }
        if (!sink.signal.aborted) sink.complete();
      } finally {
        reader.releaseLock();
      }
    })
    .catch(err => {
      if (!sink.signal.aborted) sink.terminate(err);
    });
});
```

The signal is aborted when:

1. **Cold stream:** All subscribers have unsubscribed
2. **Explicit disposal:** The stream is disposed programmatically
3. **Scope disposal:** The container scope owning the stream is disposed
4. **Terminal signal:** After `complete()` or `terminate()`, the signal is aborted to clean up resources

---

_Previous: [07 - Operators](./07-operators.md)_

_Next: [09 - Container Observation](./09-container-observation.md)_
