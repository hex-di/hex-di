# 15 - API Reference

Consolidated type signatures for the entire `@hex-di/stream` surface area.

## 79. Stream Factories

```typescript
/** Create a cold stream from a producer function. */
function createStream<T, E = never>(
  producer: (sink: StreamSink<T, E>) => void | (() => void),
  config?: StreamConfig<T, E>
): Stream<T, E>;

/** Create a cold stream that synchronously emits values and completes. */
function of<T>(...values: readonly T[]): Stream<T, never>;

/** Create a cold stream from a synchronous iterable. */
function fromIterable<T>(iterable: Iterable<T>): Stream<T, never>;

/** Create a cold stream from an async iterable. */
function fromAsyncIterable<T>(iterable: AsyncIterable<T>): Stream<T, never>;

/** Create a cold stream from a promise. */
function fromPromise<T>(promise: Promise<T>): Stream<T, never>;

/** Create a cold stream from a ResultAsync. */
function fromResultAsync<T, E>(resultAsync: ResultAsync<T, E>): Stream<T, E>;

/** Create a hot stream from a DOM-like event target. */
function fromEvent<T>(target: EventTargetLike, eventName: string): Stream<T, never>;

/** Create a cold stream emitting sequential integers at an interval. */
function interval(periodMs: number, scheduler?: Scheduler): Stream<number, never>;

/** Create a cold stream emitting after a delay, optionally repeating. */
function timer(delayMs: number, periodMs?: number, scheduler?: Scheduler): Stream<number, never>;

/** Create a stream that immediately terminates with an error. */
function throwError(error: unknown): Stream<never, never>;

/** Stream that immediately completes with no values. */
const EMPTY: Stream<never, never>;

/** Stream that never emits and never completes. */
const NEVER: Stream<never, never>;
```

## 80. Subject Factories

```typescript
/** Create a basic multicast subject. */
function createSubject<T, E = never>(): Subject<T, E>;

/** Create a multicast subject with current-value semantics. */
function createBehaviorSubject<T, E = never>(initialValue: T): BehaviorSubject<T, E>;

/** Create a multicast subject that replays the last N values. */
function createReplaySubject<T, E = never>(bufferSize?: number): ReplaySubject<T, E>;
```

## 81. Port Factories

```typescript
/** Create a stream port (curried: explicit types, then config). */
function createStreamPort<T, E = never>(): <const TName extends string>(
  config: StreamPortConfig<T, E, TName>
) => StreamPort<T, E, TName>;

/** Create a subject port (curried: explicit types, then config). */
function createSubjectPort<T, E = never>(): <const TName extends string>(
  config: SubjectPortConfig<T, E, TName>
) => SubjectPort<T, E, TName>;

/** Create an operator port (curried: explicit types, then config). */
function createOperatorPort<TIn, EIn = never, TOut = TIn, EOut = EIn>(): <
  const TName extends string,
>(
  config: OperatorPortConfig<TIn, EIn, TOut, EOut, TName>
) => OperatorPort<TIn, EIn, TOut, EOut, TName>;
```

## 82. Adapter Factories

```typescript
/** Create an adapter that provides a StreamProducer. */
function createStreamAdapter<T, E, TName extends string, TRequires, TLifetime>(
  config: StreamAdapterConfig<T, E, TName, TRequires, TLifetime>
): Result<Adapter<StreamPort<T, E, TName>, TRequires, TLifetime, "sync">, StreamAdapterError>;

/** Create an adapter that provides a Subject. */
function createSubjectAdapter<T, E, TName extends string, TRequires, TLifetime>(
  config: SubjectAdapterConfig<T, E, TName, TRequires, TLifetime>
): Result<Adapter<SubjectPort<T, E, TName>, TRequires, TLifetime, "sync">, StreamAdapterError>;

/** Create an adapter that provides an Operator. */
function createOperatorAdapter<TIn, EIn, TOut, EOut, TName extends string, TRequires, TLifetime>(
  config: OperatorAdapterConfig<TIn, EIn, TOut, EOut, TName, TRequires, TLifetime>
): Result<
  Adapter<OperatorPort<TIn, EIn, TOut, EOut, TName>, TRequires, TLifetime, "sync">,
  StreamAdapterError
>;
```

## 83. Operators

```typescript
// Transform
function map<TIn, TOut, E>(project: (value: TIn, index: number) => TOut): Operator<TIn, E, TOut, E>;
function scan<TIn, TAcc, E>(
  accumulator: (acc: TAcc, value: TIn, index: number) => TAcc,
  seed: TAcc
): Operator<TIn, E, TAcc, E>;

// Filter
function filter<T, E>(predicate: (value: T, index: number) => boolean): Operator<T, E, T, E>;
function filter<T, S extends T, E>(
  predicate: (value: T, index: number) => value is S
): Operator<T, E, S, E>;
function take<T, E>(count: number): Operator<T, E, T, E>;
function skip<T, E>(count: number): Operator<T, E, T, E>;
function distinctUntilChanged<T, E>(
  comparator?: (prev: T, curr: T) => boolean
): Operator<T, E, T, E>;

// Flatten
function switchMap<TIn, TOut, EIn, EOut>(
  project: (value: TIn, index: number) => Stream<TOut, EOut>
): Operator<TIn, EIn, TOut, EIn | EOut>;

// Timing
function debounce<T, E>(durationMs: number, scheduler?: Scheduler): Operator<T, E, T, E>;
function throttle<T, E>(durationMs: number, scheduler?: Scheduler): Operator<T, E, T, E>;

// Combination
function merge<T, E>(...sources: ReadonlyArray<Stream<T, E>>): Stream<T, E>;
function concat<T, E>(...sources: ReadonlyArray<Stream<T, E>>): Stream<T, E>;
function combineLatest<Streams extends ReadonlyArray<Stream<unknown, unknown>>>(
  ...sources: Streams
): Stream<CombineLatestResult<Streams>, CombineLatestError<Streams>>;

// Error
function catchError<T, E, F>(handler: (error: E) => Stream<T, F>): Operator<T, E, T, F>;
function retry<T, E>(config: RetryConfig): Operator<T, E, T, E>;

// Multicast
function share<T, E>(): Operator<T, E, T, E>;
function shareReplay<T, E>(bufferSize: number): Operator<T, E, T, E>;

// Utility
function tap<T, E>(observer: Partial<StreamObserver<T, E>>): Operator<T, E, T, E>;
function finalize<T, E>(callback: () => void): Operator<T, E, T, E>;
function buffer<T, E>(notifier: Stream<unknown, unknown>): Operator<T, E, readonly T[], E>;
```

## 84. Container Observation

```typescript
/** Observe a port's resolved value over time (BehaviorSubject semantics). */
function observePort<P extends Port<unknown, string>>(
  container: Container,
  port: P
): Stream<InferService<P>, never>;

/** Observe all container lifecycle events. */
function observeContainer(container: Container): Stream<ContainerEvent, never>;
```

## 85. Introspection

```typescript
/** Stream inspector port. */
const StreamInspectorPort: Port<StreamInspector, "StreamInspector">;

/** Stream registry port. */
const StreamRegistryPort: Port<StreamRegistry, "StreamRegistry">;

/** Library inspector bridge port. */
const StreamLibraryInspectorPort: Port<LibraryInspector, "StreamLibraryInspector">;

/** Create stream registry adapter. */
function createStreamRegistryAdapter(): Adapter<typeof StreamRegistryPort, [], "singleton", "sync">;

/** Create stream inspector adapter. */
function createStreamInspectorAdapter(
  config?: StreamInspectorConfig
): Adapter<typeof StreamInspectorPort, [typeof StreamRegistryPort], "singleton", "sync">;

/** Create library inspector bridge adapter. */
function createStreamLibraryInspectorAdapter(): Adapter<
  typeof StreamLibraryInspectorPort,
  [typeof StreamInspectorPort],
  "singleton",
  "sync"
>;
```

## 86. Type Utilities

```typescript
// Stream port inference
type InferStreamData<T> = /* ... */;
type InferStreamError<T> = /* ... */;
type InferStreamName<T> = /* ... */;
type InferStreamTypes<T> = /* ... */;

// Subject port inference
type InferSubjectData<T> = /* ... */;
type InferSubjectError<T> = /* ... */;

// Operator port inference
type InferOperatorInput<T> = /* ... */;
type InferOperatorOutput<T> = /* ... */;
type InferOperatorInputError<T> = /* ... */;
type InferOperatorOutputError<T> = /* ... */;

// Operator types
type Operator<TIn, EIn, TOut, EOut> = (source: Stream<TIn, EIn>) => Stream<TOut, EOut>;

// Combination type helpers
type CombineLatestResult<T extends ReadonlyArray<Stream<unknown, unknown>>> = /* tuple mapping */;
type CombineLatestError<T extends ReadonlyArray<Stream<unknown, unknown>>> = /* union of errors */;

// Type guards
function isStreamPort(value: unknown): value is StreamPort;
function isSubjectPort(value: unknown): value is SubjectPort;
function isOperatorPort(value: unknown): value is OperatorPort;
```

## 87. React Hooks

```typescript
/** Subscribe to a stream port. */
function useStream<T, E>(
  port: StreamPort<T, E, string>,
  options?: UseStreamOptions<T, E>
): StreamState<T, E>;

/** Get the latest value from a stream port. */
function useStreamValue<T, E>(port: StreamPort<T, E, string>): T | undefined;
function useStreamValue<T, E>(port: StreamPort<T, E, string>, defaultValue: T): T;

/** Get a subject handle for both subscribe and push. */
function useSubject<T, E>(port: SubjectPort<T, E, string>): SubjectHandle<T, E>;

/** Create typed stream hooks. */
function createStreamHooks(): { useStream; useStreamValue; useSubject };

/** Stream configuration provider. */
function StreamProvider(props: StreamProviderProps): React.ReactElement;
```

## 88. Testing API

```typescript
/** Create test container with stream support. */
function createStreamTestContainer(
  adapters: ReadonlyArray<Adapter>,
  options?: { scheduler?: Scheduler; buffer?: BufferConfig }
): { container: Container; scheduler: TestScheduler; dispose: () => void };

/** Vitest hook for stream test containers. */
function useStreamTestContainer(
  adapters: ReadonlyArray<Adapter>,
  options?: { scheduler?: Scheduler }
): { container: Container; scheduler: TestScheduler };

/** Create mock stream adapter. */
function createMockStreamAdapter<T, E, TName extends string>(
  port: StreamPort<T, E, TName>,
  options: MockStreamOptions<T, E>
): Adapter;

/** Create mock subject adapter. */
function createMockSubjectAdapter<T, E, TName extends string>(
  port: SubjectPort<T, E, TName>,
  options?: MockSubjectOptions<T>
): Adapter;

/** Virtual time scheduler. */
class TestScheduler implements Scheduler {
  advanceBy(ms: number): void;
  advanceTo(ms: number): void;
  flush(): void;
  readonly now: number;
  readonly pendingCount: number;
  reset(): void;
}

/** Factory function for creating a TestScheduler instance. */
function createTestScheduler(): TestScheduler;

/** Test subscriber that records emissions. */
class TestSubscriber<T, E = never> implements StreamObserver<T, E> {
  readonly values: T[];
  readonly errors: E[];
  readonly events: Array<StreamEvent>;
  isCompleted: boolean;
  isTerminated: boolean;
  terminateError: unknown;
}

/** Register vitest stream matchers. */
function setupStreamMatchers(): void;
```

## 89. Error Types

### Error Codes

| Code      | Name                       | Description                                    |
| --------- | -------------------------- | ---------------------------------------------- |
| `STRM001` | `BufferOverflowError`      | Buffer capacity exceeded with "error" strategy |
| `STRM002` | `StreamCompletedError`     | Operation attempted on completed stream        |
| `STRM003` | `StreamTerminatedError`    | Operation attempted on terminated stream       |
| `STRM004` | `StreamDisposedError`      | Subscription after disposal                    |
| `STRM005` | `StreamAdapterError`       | Adapter factory failed                         |
| `STRM006` | `OperatorError`            | Operator type mismatch                         |
| `STRM007` | `BackpressureTimeoutError` | Backpressure handshake timed out               |
| `STRM008` | `CircularStreamError`      | Circular stream dependency detected            |
| `STRM009` | `InspectorLockedError`     | Reconfiguration rejected on locked inspector   |

### Error Type Union

```typescript
type StreamError =
  | {
      readonly _tag: "BufferOverflow";
      readonly capacity: number;
      readonly strategy: BufferOverflowStrategy;
    }
  | { readonly _tag: "StreamCompleted"; readonly portName: string }
  | { readonly _tag: "StreamTerminated"; readonly portName: string; readonly cause: unknown }
  | { readonly _tag: "StreamDisposed"; readonly portName: string; readonly scopeId?: string }
  | { readonly _tag: "StreamAdapterFailed"; readonly portName: string; readonly cause: unknown }
  | { readonly _tag: "OperatorError"; readonly operatorName: string; readonly cause: unknown }
  | { readonly _tag: "BackpressureTimeout"; readonly portName: string; readonly timeoutMs: number }
  | { readonly _tag: "CircularStream"; readonly portNames: readonly string[] }
  | { readonly _tag: "InspectorLocked"; readonly attemptedAction: string };
```

### Constructor Functions

```typescript
function BufferOverflow(details: {
  capacity: number;
  strategy: BufferOverflowStrategy;
}): StreamError;
function StreamCompleted(portName: string): StreamError;
function StreamTerminated(portName: string, cause: unknown): StreamError;
function StreamDisposed(portName: string, scopeId?: string): StreamError;
function StreamAdapterFailed(portName: string, cause: unknown): StreamError;
function OperatorError(operatorName: string, cause: unknown): StreamError;
function BackpressureTimeout(portName: string, timeoutMs: number): StreamError;
function CircularStream(portNames: readonly string[]): StreamError;
function InspectorLocked(attemptedAction: string): StreamError;
```

### StreamDiagnosticInfo

Diagnostic information forwarded when internal callbacks (e.g., `onOverflow`) throw exceptions:

```typescript
interface StreamDiagnosticInfo {
  /** Identifies the diagnostic event kind. */
  readonly kind: "overflow-callback-error";
  /** The exception thrown by the callback. */
  readonly error: unknown;
  /** Timestamp at which the diagnostic was recorded. */
  readonly timestamp: number;
  /** Additional context (e.g., the overflow strategy in effect). */
  readonly context?: Record<string, unknown>;
}
```

---

_Previous: [14 - Advanced Patterns](./14-advanced.md)_

_Next: [16 - Appendices](./16-appendices.md)_
