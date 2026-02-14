# 07 - Operators

## 37. Operator Protocol

An operator is a function that transforms one stream into another:

```typescript
type Operator<TIn, EIn, TOut, EOut> = (source: Stream<TIn, EIn>) => Stream<TOut, EOut>;
```

Operators compose via `stream.pipe(op1, op2, op3)` which is equivalent to `op3(op2(op1(stream)))`. The `pipe` method supports up to 9 operators with full type inference through overloads.

### Protocol Rules

1. An operator MUST return a new `Stream` instance (never mutate the source)
2. An operator MUST propagate `complete()` and `terminate()` from source to output unless the operator's semantics explicitly suppress them (e.g., `retry`)
3. An operator SHOULD unsubscribe from the source when the output is unsubscribed
4. An operator SHOULD propagate the source's `AbortSignal` semantics
5. Recoverable errors (`E`) pass through unchanged unless the operator explicitly transforms them (e.g., `catchError`)

### Custom Operator

Any function matching the `Operator` type is valid -- no base class or registration required:

```typescript
function multiplyBy<E>(factor: number): Operator<number, E, number, E> {
  return source =>
    createStream<number, E>(sink => {
      const sub = source.subscribe({
        next: v => sink.next(v * factor),
        error: e => sink.error(e),
        complete: () => sink.complete(),
        terminate: e => sink.terminate(e),
      });
      return () => sub.unsubscribe();
    });
}

const doubled = numbers.pipe(multiplyBy(2));
```

## 38. defineOperator

Optional helper that provides better error messages for operator authors. Not required -- it simply validates the function signature at the type level:

```typescript
function defineOperator<TIn, EIn, TOut, EOut>(
  name: string,
  impl: (source: Stream<TIn, EIn>) => Stream<TOut, EOut>
): Operator<TIn, EIn, TOut, EOut>;
```

```typescript
const myOp = defineOperator("multiplyBy2", source => source.pipe(map(x => x * 2)));
```

The `name` parameter is used in error messages and tracing spans. It has no runtime effect on the operator's behavior.

## 39. Transform Operators

### map

Transforms each emitted value. Recoverable errors pass through unchanged.

```typescript
function map<TIn, TOut, E>(project: (value: TIn, index: number) => TOut): Operator<TIn, E, TOut, E>;
```

```typescript
const doubled = numbers.pipe(map(x => x * 2));
const names = users.pipe(map(u => u.name));
```

### scan

Applies an accumulator function and emits each intermediate result. Similar to `Array.prototype.reduce` but emits every step.

```typescript
function scan<TIn, TAcc, E>(
  accumulator: (acc: TAcc, value: TIn, index: number) => TAcc,
  seed: TAcc
): Operator<TIn, E, TAcc, E>;
```

```typescript
const runningTotal = numbers.pipe(scan((acc, n) => acc + n, 0));
// Input:  1, 2, 3, 4
// Output: 1, 3, 6, 10
```

## 40. Filter Operators

### filter

Emits only values passing the predicate. Supports type guard narrowing.

```typescript
function filter<T, E>(predicate: (value: T, index: number) => boolean): Operator<T, E, T, E>;

// Type guard overload
function filter<T, S extends T, E>(
  predicate: (value: T, index: number) => value is S
): Operator<T, E, S, E>;
```

```typescript
const positives = numbers.pipe(filter(x => x > 0));

// Type narrowing with type guard
type AdminUser = User & { role: "admin" };
const admins = users.pipe(filter((u): u is AdminUser => u.role === "admin"));
// admins is Stream<AdminUser, E>
```

### take

Emits the first `count` values then completes. Unsubscribes from source after completing.

```typescript
function take<T, E>(count: number): Operator<T, E, T, E>;
```

```typescript
const firstFive = stream.pipe(take(5));
```

### skip

Ignores the first `count` values, then passes all subsequent values through.

```typescript
function skip<T, E>(count: number): Operator<T, E, T, E>;
```

```typescript
const afterFirst = stream.pipe(skip(1));
```

### distinctUntilChanged

Suppresses consecutive duplicate values. Uses `Object.is` by default; accepts a custom comparator.

```typescript
function distinctUntilChanged<T, E>(
  comparator?: (prev: T, curr: T) => boolean
): Operator<T, E, T, E>;
```

```typescript
const unique = stream.pipe(distinctUntilChanged());
// Input:  1, 1, 2, 2, 3, 1, 1
// Output: 1,    2,    3, 1

// Custom comparator
const uniqueById = users.pipe(distinctUntilChanged((a, b) => a.id === b.id));
```

## 41. Flattening Operators

### switchMap

For each source value, subscribes to the projected inner stream, unsubscribing from the previous inner stream. Only the latest inner stream's values are forwarded.

```typescript
function switchMap<TIn, TOut, EIn, EOut>(
  project: (value: TIn, index: number) => Stream<TOut, EOut>
): Operator<TIn, EIn, TOut, EIn | EOut>;
```

```typescript
// Search: cancel previous request when new input arrives
const results = searchInput.pipe(
  debounce(300),
  switchMap(query => fromPromise(search(query)))
);

// Route changes: subscribe to new page data, cancel old
const pageData = route.pipe(switchMap(route => fromPromise(fetchPage(route))));
```

## 42. Timing Operators

### debounce

Emits a value only after `durationMs` of silence from the source. Uses the configurable scheduler for testability.

```typescript
function debounce<T, E>(durationMs: number, scheduler?: Scheduler): Operator<T, E, T, E>;
```

```typescript
const debouncedInput = input.pipe(debounce(300));
// Waits 300ms after last emission before forwarding
```

### throttle

Emits the first value, then ignores further values for `durationMs`. Uses the configurable scheduler.

```typescript
function throttle<T, E>(durationMs: number, scheduler?: Scheduler): Operator<T, E, T, E>;
```

```typescript
const throttled = mouseMoves.pipe(throttle(16)); // ~60fps cap
```

## 43. Combination Operators

### merge

Merges multiple streams into one, forwarding values from all sources concurrently. Completes only when all sources complete.

```typescript
function merge<T, E>(...sources: ReadonlyArray<Stream<T, E>>): Stream<T, E>;
```

```typescript
const allEvents = merge(clicks, keydowns, touches);
```

### concat

Subscribes to each source sequentially. Subscribes to the next source only after the previous one completes.

```typescript
function concat<T, E>(...sources: ReadonlyArray<Stream<T, E>>): Stream<T, E>;
```

```typescript
const sequential = concat(header, body, footer);
// Emits all header values, then body values, then footer values
```

### combineLatest

Emits a tuple of the latest value from each source whenever any source emits. Does not emit until every source has emitted at least once. Full tuple type inference via mapped types.

```typescript
function combineLatest<Streams extends ReadonlyArray<Stream<unknown, unknown>>>(
  ...sources: Streams
): Stream<CombineLatestResult<Streams>, CombineLatestError<Streams>>;

// Type-level tuple mapping
type CombineLatestResult<T extends ReadonlyArray<Stream<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Stream<infer V, unknown> ? V : never;
};

type CombineLatestError<T extends ReadonlyArray<Stream<unknown, unknown>>> = {
  [K in keyof T]: T[K] extends Stream<unknown, infer E> ? E : never;
}[number];
```

```typescript
const combined = combineLatest(temperature, humidity, pressure);
// Type: Stream<[number, number, number], TemperatureError | HumidityError | PressureError>

combined.subscribe({
  next: ([temp, hum, pres]) => {
    console.log(`${temp}°C, ${hum}%, ${pres}hPa`);
  },
});
```

## 44. Error Operators

### catchError

Intercepts recoverable errors on the `error` channel and replaces them with emissions from the handler stream. Terminal errors are NOT caught by this operator.

```typescript
function catchError<T, E, F>(handler: (error: E) => Stream<T, F>): Operator<T, E, T, F>;
```

```typescript
const resilient = priceStream.pipe(
  catchError(err => {
    console.warn("Price error:", err);
    return of(lastKnownPrice); // Emit fallback value
  })
);
```

### retry

On terminal error, re-subscribes to the source up to `count` times with optional delay between attempts.

```typescript
interface RetryConfig {
  readonly count: number;
  readonly delay?: number | ((attempt: number) => number);
  readonly scheduler?: Scheduler;
}

function retry<T, E>(config: RetryConfig): Operator<T, E, T, E>;
```

```typescript
const resilient = apiStream.pipe(
  retry({ count: 3, delay: attempt => Math.min(1000 * 2 ** attempt, 30000) })
);
```

## 45. Multicast Operators

### share

Converts a cold stream to hot by multicasting via an internal `Subject`. The source is subscribed when the first subscriber arrives and unsubscribed when the last subscriber leaves (refcounted).

```typescript
function share<T, E>(): Operator<T, E, T, E>;
```

```typescript
const shared = expensiveComputation.pipe(share());

// Both subscribers share the same underlying computation
shared.subscribe({ next: v => console.log("A:", v) });
shared.subscribe({ next: v => console.log("B:", v) });
```

### shareReplay

Like `share` but uses an internal `ReplaySubject` so late subscribers receive buffered values.

```typescript
function shareReplay<T, E>(bufferSize: number): Operator<T, E, T, E>;
```

```typescript
const cached = config.pipe(shareReplay(1));

// First subscriber triggers the fetch
cached.subscribe({ next: v => console.log("A:", v) });

// Late subscriber receives the last emitted value immediately
setTimeout(() => {
  cached.subscribe({ next: v => console.log("B:", v) }); // B gets cached value
}, 5000);
```

## 46. Utility Operators

### tap

Performs side effects for each emission without altering the stream. Useful for logging/debugging.

```typescript
function tap<T, E>(observer: Partial<StreamObserver<T, E>>): Operator<T, E, T, E>;
```

```typescript
const logged = stream.pipe(
  tap({
    next: v => console.log("Value:", v),
    error: e => console.warn("Error:", e),
    complete: () => console.log("Done"),
  })
);
```

### finalize

Calls the callback when the stream completes, terminates, or all subscribers unsubscribe. Guaranteed to run exactly once.

```typescript
function finalize<T, E>(callback: () => void): Operator<T, E, T, E>;
```

```typescript
const tracked = connection.pipe(
  finalize(() => {
    metrics.recordDisconnect();
    cleanup();
  })
);
```

### buffer

Collects source values into an array, emitting the array each time the notifier stream emits.

```typescript
function buffer<T, E>(notifier: Stream<unknown, unknown>): Operator<T, E, readonly T[], E>;
```

```typescript
const batched = events.pipe(buffer(interval(1000)));
// Emits an array of accumulated events every second
```

### Operator Summary Table

| Category    | Operator               | Input → Output                              | Description                      |
| ----------- | ---------------------- | ------------------------------------------- | -------------------------------- |
| Transform   | `map`                  | `Stream<A, E> → Stream<B, E>`               | Transform each value             |
| Transform   | `scan`                 | `Stream<A, E> → Stream<B, E>`               | Running accumulator              |
| Filter      | `filter`               | `Stream<A, E> → Stream<A, E>` (or narrowed) | Keep values matching predicate   |
| Filter      | `take`                 | `Stream<A, E> → Stream<A, E>`               | First N values                   |
| Filter      | `skip`                 | `Stream<A, E> → Stream<A, E>`               | Skip first N values              |
| Filter      | `distinctUntilChanged` | `Stream<A, E> → Stream<A, E>`               | Suppress consecutive duplicates  |
| Flatten     | `switchMap`            | `Stream<A, E> → Stream<B, E\|F>`            | Latest inner stream only         |
| Timing      | `debounce`             | `Stream<A, E> → Stream<A, E>`               | Wait for silence                 |
| Timing      | `throttle`             | `Stream<A, E> → Stream<A, E>`               | Rate limit                       |
| Combination | `merge`                | `Stream<A, E>[] → Stream<A, E>`             | Concurrent merge                 |
| Combination | `concat`               | `Stream<A, E>[] → Stream<A, E>`             | Sequential concat                |
| Combination | `combineLatest`        | `Stream<A, E>[] → Stream<[...], E>`         | Latest from each                 |
| Error       | `catchError`           | `Stream<A, E> → Stream<A, F>`               | Handle recoverable errors        |
| Error       | `retry`                | `Stream<A, E> → Stream<A, E>`               | Re-subscribe on terminal error   |
| Multicast   | `share`                | `Stream<A, E> → Stream<A, E>`               | Refcounted multicast             |
| Multicast   | `shareReplay`          | `Stream<A, E> → Stream<A, E>`               | Refcounted multicast with replay |
| Utility     | `tap`                  | `Stream<A, E> → Stream<A, E>`               | Side effects                     |
| Utility     | `finalize`             | `Stream<A, E> → Stream<A, E>`               | Cleanup callback                 |
| Utility     | `buffer`               | `Stream<A, E> → Stream<A[], E>`             | Batch by notifier                |

---

_Previous: [06 - Subjects](./06-subjects.md)_

_Next: [08 - Backpressure](./08-backpressure.md)_
