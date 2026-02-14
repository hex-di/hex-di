# 14 - Advanced Patterns

## 74. Dependent Streams

Streams can depend on other streams through operator composition and DI:

### Operator-Based Composition

```typescript
// Price stream depends on exchange rate stream
const PriceInUsdPort = createStreamPort<number>()({ name: "PriceInUsd" });

const PriceInUsdAdapter = createStreamAdapter({
  provides: PriceInUsdPort,
  requires: [PriceTickerPort, ExchangeRatePort],
  factory:
    ({ priceTicker, exchangeRate }) =>
    () => {
      const prices = priceTicker();
      const rates = exchangeRate();

      return combineLatest(prices, rates).pipe(map(([price, rate]) => price.value * rate));
    },
});
```

### Sequential Dependencies

```typescript
// Stream that depends on a resolved config value, not another stream
const ConfiguredStreamPort = createStreamPort<Data>()({
  name: "ConfiguredStream",
});

const ConfiguredStreamAdapter = createStreamAdapter({
  provides: ConfiguredStreamPort,
  requires: [ConfigPort, WebSocketClientPort],
  factory:
    ({ config, wsClient }) =>
    () =>
      createStream<Data>(sink => {
        const conn = wsClient.connect(config.wsUrl);
        conn.onMessage(msg => sink.next(JSON.parse(msg)));
        return () => conn.close();
      }),
});
```

### Dynamic Stream Switching

Use `switchMap` to switch between streams based on runtime conditions:

```typescript
// Switch price feed based on selected exchange
const selectedExchange = createBehaviorSubject<string>("binance");

const prices = selectedExchange.asStream().pipe(
  switchMap(exchange => {
    const producer = container.resolve(pricePortForExchange(exchange));
    return producer();
  })
);
```

## 75. Scheduler Abstraction

The `Scheduler` interface abstracts over timing for testability:

```typescript
interface Scheduler {
  /**
   * Schedule a callback to run after delayMs milliseconds.
   * Returns a Disposable to cancel the scheduled callback.
   */
  schedule(callback: () => void, delayMs: number): Disposable;

  /** Current time in milliseconds. */
  now(): number;
}

interface Disposable {
  dispose(): void;
}
```

### Default Scheduler

Uses `setTimeout` and `Date.now()`:

```typescript
const defaultScheduler: Scheduler = {
  schedule: (callback, delayMs) => {
    const id = setTimeout(callback, delayMs);
    return { dispose: () => clearTimeout(id) };
  },
  now: () => Date.now(),
};
```

### Test Scheduler

Virtual time implementation for deterministic testing (see §71).

### Scheduler Injection

Time-dependent operators accept an optional scheduler parameter:

```typescript
// Production: uses real timers
const debounced = stream.pipe(debounce(300));

// Test: uses virtual time
const scheduler = new TestScheduler();
const debounced = stream.pipe(debounce(300, scheduler));
scheduler.advanceBy(300);
```

Container-wide scheduler can be configured via `StreamProvider`:

```typescript
<StreamProvider config={{ scheduler: testScheduler }}>
  <App />
</StreamProvider>
```

## 76. Error Recovery Patterns

### Retry with Exponential Backoff

```typescript
const resilient = apiStream.pipe(
  retry({
    count: 5,
    delay: attempt => Math.min(1000 * 2 ** attempt, 30_000),
  })
);
```

### Fallback Stream

```typescript
const withFallback = primaryStream.pipe(
  catchError(err => {
    console.warn("Primary failed, switching to fallback:", err);
    return fallbackStream;
  })
);
```

### Circuit Breaker Pattern

```typescript
function circuitBreaker<T, E>(maxFailures: number, resetTimeMs: number): Operator<T, E, T, E> {
  return source =>
    createStream<T, E>(sink => {
      let failures = 0;
      let circuitOpen = false;

      const sub = source.subscribe({
        next: value => {
          failures = 0;
          circuitOpen = false;
          sink.next(value);
        },
        error: err => {
          failures++;
          if (failures >= maxFailures) {
            circuitOpen = true;
            sink.terminate(new Error(`Circuit breaker open after ${maxFailures} failures`));
          } else {
            sink.error(err);
          }
        },
        complete: () => sink.complete(),
        terminate: err => sink.terminate(err),
      });

      return () => sub.unsubscribe();
    });
}

const protected$ = priceStream.pipe(circuitBreaker(5, 30_000));
```

### Recoverable Error to Result

```typescript
// Convert recoverable errors to Result values for explicit handling
function toResult<T, E>(): Operator<T, E, Result<T, E>, never> {
  return source =>
    createStream<Result<T, E>, never>(sink => {
      const sub = source.subscribe({
        next: value => sink.next(Ok(value)),
        error: err => sink.next(Err(err)),
        complete: () => sink.complete(),
        terminate: err => sink.terminate(err),
      });
      return () => sub.unsubscribe();
    });
}

const results = priceStream.pipe(toResult());
// Stream<Result<PriceTick, PriceError>, never>
```

## 77. Memory Management

### Subscription Cleanup

Streams track subscriptions and clean up automatically:

1. **Cold streams**: Producer teardown runs when last subscriber unsubscribes
2. **Hot streams**: Subscriber is removed from set; shared producer continues
3. **Shared streams** (`share()`): Source unsubscribed when refcount reaches 0

### Preventing Leaks

Common patterns for preventing subscription leaks:

```typescript
// React: hooks handle cleanup automatically
const { value } = useStream(PriceTickerPort);

// Imperative: use finalize for cleanup tracking
const sub = stream
  .pipe(finalize(() => metrics.decrement("activeSubscriptions")))
  .subscribe({ next: v => process(v) });

// Scoped: container scope disposal cleans up automatically
const scope = container.createScope();
const producer = scope.resolve(PriceTickerPort);
const stream = producer();
stream.subscribe({ next: v => log(v) });
scope.dispose(); // All subscriptions cleaned up
```

### Backpressure Memory Bounds

Buffer configuration prevents unbounded memory growth:

```typescript
// Bounded: max 256 values buffered
createStream(producer); // Default: 256, drop-oldest

// Strict: fail if consumer can't keep up
createStream(producer, {
  buffer: { capacity: 100, strategy: "error" },
});

// Natural: AsyncIterable has zero buffering
for await (const result of stream) {
  await processSlowly(result);
}
```

### Inspector for Leak Detection

The stream inspector reports subscriber counts for leak detection:

```typescript
const snapshot = inspector.getSnapshot();
for (const port of snapshot.ports) {
  if (port.kind === "hot" && port.subscriberCount > 100) {
    console.warn(`Possible leak: ${port.portName} has ${port.subscriberCount} subscribers`);
  }
}
```

## 78. SSR Considerations

### Server-Side Behavior

On the server, streams have limited applicability:

1. **Cold streams** work normally -- they produce values on demand
2. **Hot streams** and subjects should not be used in SSR (they maintain state across requests)
3. **Time-dependent operators** (`debounce`, `throttle`, `interval`) should be avoided in SSR

### Hydration

Stream state does not need hydration (unlike query cache). Streams are ephemeral -- each client creates fresh subscriptions.

### useStream on Server

When `useStream` is called during SSR:

1. The stream producer is resolved from the server container
2. The hook returns the initial state (`value: undefined`, `isActive: true`)
3. No subscription is created (subscriptions are client-only)
4. On the client, the hook subscribes after hydration

### Scoped Streams for Request Isolation

In SSR, each request should use a scoped container:

```typescript
async function handleRequest(req: Request) {
  const scope = container.createScope();

  try {
    // Scoped stream producers are isolated per request
    const producer = scope.resolve(RequestLogPort);
    const requestLog = producer();
    // Use stream for request-scoped logging
    // ...
  } finally {
    scope.dispose(); // Cleans up all stream subscriptions
  }
}
```

### Streaming SSR

For frameworks that support streaming SSR (React 18+), streams can feed into `renderToPipeableStream`:

```typescript
// Stream values can be piped to SSR stream
const dataStream = producer();
const sub = dataStream.subscribe({
  next: chunk => sseWriter.write(chunk),
  complete: () => sseWriter.close(),
});
```

---

_Previous: [13 - Testing](./13-testing.md)_

_Next: [15 - API Reference](./15-api-reference.md)_
