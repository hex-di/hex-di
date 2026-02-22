# 02 - Core Concepts

## 5. Stream&lt;T, E&gt;

The fundamental reactive primitive. `T` is the value type; `E` is the recoverable error type (defaults to `never`). A stream represents a lazy, potentially asynchronous sequence of values.

```typescript
interface Stream<T, E = never> {
  /** Subscribe to this stream with an observer. Returns a Subscription handle. */
  subscribe(observer: Partial<StreamObserver<T, E>>): Subscription;

  /** Compose operators via pipe. Up to 9 overloads for type inference. */
  pipe(): Stream<T, E>;
  pipe<A, EA>(op1: Operator<T, E, A, EA>): Stream<A, EA>;
  pipe<A, EA, B, EB>(op1: Operator<T, E, A, EA>, op2: Operator<A, EA, B, EB>): Stream<B, EB>;
  pipe<A, EA, B, EB, C, EC>(
    op1: Operator<T, E, A, EA>,
    op2: Operator<A, EA, B, EB>,
    op3: Operator<B, EB, C, EC>
  ): Stream<C, EC>;
  // ... up to 9 operators

  /** Convert to AsyncIterable that yields Result<T, E> items. */
  toAsyncIterable(): AsyncIterable<Result<T, E>>;

  /** Support for-await-of consumption. Yields Result<T, E> items. */
  [Symbol.asyncIterator](): AsyncIterator<Result<T, E>>;
}
```

Streams are **lazy by default** (cold): each `subscribe()` call triggers a new execution of the producer function. Hot streams are created explicitly via subjects or the `share()`/`shareReplay()` operators.

### Key Properties

- **Immutable** -- stream instances are frozen after creation
- **Composable** -- `.pipe()` returns a new stream; the original is unchanged
- **Cancellable** -- unsubscribing aborts the producer via `AbortSignal`
- **Dual consumption** -- push via `subscribe()`, pull via `AsyncIterable`

## 6. StreamObserver&lt;T, E&gt;

Push-based consumption contract with four channels:

```typescript
interface StreamObserver<T, E = never> {
  /**
   * Receives the next value from the stream.
   * Called zero or more times before complete() or terminate().
   */
  next(value: T): void;

  /**
   * Receives a recoverable error.
   * The stream remains active and may emit further values.
   * These are typed business errors -- part of the stream's contract.
   */
  error(error: E): void;

  /**
   * Successful terminal signal.
   * After complete(), no further next/error/complete/terminate calls are made.
   */
  complete(): void;

  /**
   * Catastrophic terminal signal.
   * After terminate(), no further calls are made.
   * Terminal errors are infrastructure failures -- untyped (unknown).
   */
  terminate(error: unknown): void;
}
```

All four methods are optional when passed to `subscribe()` -- the caller provides a `Partial<StreamObserver<T, E>>`. Unhandled `terminate` errors are reported to the console in development builds.

### Observer Guarantees

1. After `complete()` or `terminate()`, no further method calls are made
2. `next()` and `error()` may interleave in any order before a terminal signal
3. At most one terminal signal (`complete` or `terminate`) is delivered per subscription
4. Method calls are serialized -- no concurrent invocations of observer methods

## 7. StreamSink&lt;T, E&gt;

Producer-side API provided to stream factory functions. Same four emission methods as `StreamObserver` plus a cancellation signal:

```typescript
interface StreamSink<T, E = never> {
  /** Push a value to all subscribers. */
  next(value: T): void;

  /** Push a recoverable error to all subscribers. */
  error(error: E): void;

  /** Signal successful completion to all subscribers. */
  complete(): void;

  /** Signal catastrophic failure to all subscribers. */
  terminate(error: unknown): void;

  /**
   * Aborted when all subscribers unsubscribe or the stream is explicitly disposed.
   * Producers should check this signal to stop work when no one is listening.
   */
  readonly signal: AbortSignal;
}
```

The sink enforces **after-terminal silence**: calls to `next`, `error`, `complete`, or `terminate` after a terminal signal has already been sent are no-ops. This prevents producer bugs from corrupting subscriber state.

## 8. Subscription

Returned by `subscribe()`. Represents a single subscriber's connection to a stream:

```typescript
interface Subscription {
  /** Remove this subscriber. For cold streams, may abort the producer. */
  unsubscribe(): void;

  /** True after unsubscribe() has been called or a terminal signal was received. */
  readonly closed: boolean;
}
```

For cold streams, calling `unsubscribe()` when no other subscribers remain aborts the producer's `AbortSignal`. For hot streams (subjects), `unsubscribe()` simply removes the subscriber from the subscriber set.

`unsubscribe()` is idempotent -- calling it multiple times is a no-op.

## 9. Dual Error Model

Streams have two error channels, matching HexDI's `Result<T, E>` semantics:

```
┌──────────────────────────────────────────────────────────────────┐
│                         Stream<T, E>                              │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │ Data Channel: next(value: T)                           │       │
│  │ Emits zero or more values over time                    │       │
│  └───────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │ Recoverable Error Channel: error(error: E)             │       │
│  │ Typed business errors -- stream continues              │       │
│  │ Example: validation failure, rate limit, partial error │       │
│  └───────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐       │
│  │ Terminal Channel: complete() or terminate(error)       │       │
│  │ complete() = successful end                            │       │
│  │ terminate(unknown) = catastrophic failure, stream ends │       │
│  └───────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### AsyncIterable Mapping

When consumed as `AsyncIterable`, the channels map as follows:

| Stream Channel   | AsyncIterable Behavior               |
| ---------------- | ------------------------------------ |
| `next(value)`    | Yields `Ok(value)` as `Result<T, E>` |
| `error(err)`     | Yields `Err(err)` as `Result<T, E>`  |
| `complete()`     | Iterator returns `{ done: true }`    |
| `terminate(err)` | Iterator throws `err`                |

```typescript
const stream = createStream<number, ValidationError>(sink => {
  sink.next(1);
  sink.error({ _tag: "ValidationError", field: "age" });
  sink.next(2);
  sink.complete();
});

for await (const result of stream) {
  result.match(
    value => console.log("Value:", value),
    err => console.warn("Recoverable:", err._tag)
  );
}
// Output:
// Value: 1
// Recoverable: ValidationError
// Value: 2
```

## 10. Cold vs Hot Semantics

### Cold Streams

Cold streams execute the producer function anew for each subscriber. Each subscriber gets an independent sequence of values:

```typescript
const cold = createStream<number>(sink => {
  sink.next(Math.random());
  sink.complete();
});

cold.subscribe({ next: v => console.log("A:", v) }); // A: 0.123
cold.subscribe({ next: v => console.log("B:", v) }); // B: 0.789 (different value)
```

Cold streams are the default. They are safe (no leaked subscriptions, predictable execution) and appropriate for on-demand data sources.

### Hot Streams

Hot streams share a single producer across all subscribers. Late subscribers miss values emitted before they subscribed:

```typescript
const subject = createSubject<number>();

subject.next(1); // No subscribers -- lost
subject.subscribe({ next: v => console.log("A:", v) });
subject.next(2); // A: 2
subject.subscribe({ next: v => console.log("B:", v) });
subject.next(3); // A: 3, B: 3
```

Hot streams are created explicitly via:

1. **Subjects** -- `createSubject()`, `createBehaviorSubject()`, `createReplaySubject()`
2. **Multicasting operators** -- `share()`, `shareReplay()`

### Decision Table

| Use Case                    | Cold or Hot | Mechanism              |
| --------------------------- | ----------- | ---------------------- |
| HTTP request per subscriber | Cold        | `createStream`         |
| WebSocket shared connection | Hot         | `createSubjectAdapter` |
| Event bus                   | Hot         | `Subject`              |
| User input events           | Hot         | `fromEvent`            |
| Timer per subscriber        | Cold        | `interval`             |
| Shared timer                | Hot         | `interval` + `share()` |
| Current value (latest)      | Hot         | `BehaviorSubject`      |
| Replay last N values        | Hot         | `ReplaySubject`        |

## 11. Operator Concept

An operator is a pure function that transforms one stream into another:

```typescript
type Operator<TIn, EIn, TOut, EOut> = (source: Stream<TIn, EIn>) => Stream<TOut, EOut>;
```

Operators compose via `.pipe()`:

```typescript
const result = source.pipe(
  filter(x => x > 0),
  map(x => x * 2),
  take(10)
);
// Equivalent to: take(10)(map(x => x * 2)(filter(x => x > 0)(source)))
```

### Operator Design Principles

1. **Plain functions** -- no base class, no registration, no decorator
2. **Type-safe composition** -- `.pipe()` overloads infer intermediate types through the chain
3. **Lazy** -- operators return a new stream definition; no work happens until `subscribe()`
4. **Stateless factories** -- each call to `map(fn)` returns a new operator instance; no shared state between uses
5. **Extensible** -- any function matching the `Operator` signature is a valid operator, enabling third-party extensions

### Custom Operator Example

```typescript
function doubleEvens<E>(): Operator<number, E, number, E> {
  return source =>
    createStream<number, E>(sink => {
      const sub = source.subscribe({
        next: value => sink.next(value % 2 === 0 ? value * 2 : value),
        error: err => sink.error(err),
        complete: () => sink.complete(),
        terminate: err => sink.terminate(err),
      });
      return () => sub.unsubscribe();
    });
}

const result = numbers.pipe(doubleEvens());
```

---

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

_Next: [03 - Stream Ports](./03-stream-ports.md)_
