# @hex-di/stream -- Agent-OS Specification

## Goal

`@hex-di/stream` is a general-purpose reactive streams library for hex-di that provides typed stream primitives, composable operators, hot/cold semantics, backpressure management, and first-class dependency injection integration -- making asynchronous data flow observable, testable, and architecturally decoupled through the port/adapter pattern.

---

## User Stories

1. **As a TypeScript developer**, I want to define `StreamPort<T, E>` tokens so that stream producers are resolved from the DI container with full type safety, and I can swap implementations by changing adapters.

2. **As a backend developer**, I want to subscribe to streams using both push-based observers and pull-based `AsyncIterable` so that I can choose the consumption model that fits my use case.

3. **As a library author**, I want to compose stream operators (map, filter, switchMap, etc.) using a `.pipe()` chain so that stream processing pipelines are declarative and type-safe.

4. **As a systems engineer**, I want configurable backpressure with buffer overflow strategies (drop-oldest, drop-newest, error, latest) so that slow consumers do not cause unbounded memory growth or crash the application.

5. **As a platform developer**, I want to observe DI port resolution changes over time via `observePort(container, port)` so that I can react when singletons are replaced, scopes change, or adapters are re-registered.

6. **As a test engineer**, I want `TestStream` and `TestSubscriber` utilities with custom vitest matchers (`toEmit`, `toComplete`, `toTerminate`) so that I can write deterministic stream tests without real timers.

7. **As a React developer**, I want `useStream()` and `useStreamValue()` hooks that auto-subscribe on mount and unsubscribe on unmount so that I can bind streams to component state without manual lifecycle management.

8. **As a DevOps engineer**, I want stream lifecycle events (creation, subscription, completion, error, disposal) to appear in the hex-di inspector so that I can monitor stream health and debug leaks.

---

## Requirements

### Stream Core (`stream/`)

- **`Stream<T, E>` interface.** The fundamental reactive primitive. `T` is the value type; `E` is the recoverable error type (defaults to `never`). Provides `subscribe(observer)` returning `Subscription`, `pipe(...operators)` returning a new `Stream`, `toAsyncIterable()` returning `AsyncIterable<Result<T, E>>`, and `[Symbol.asyncIterator]()` for direct `for await...of` consumption. Streams are lazy by default (cold): each subscription triggers a new execution of the producer function.

- **`StreamObserver<T, E>` interface.** Push-based consumption contract with four channels: `next(value: T)` for data, `error(error: E)` for recoverable errors (delivered as values on the stream, allowing the stream to continue), `terminate(error: unknown)` for catastrophic failures (ends the stream), and `complete()` for successful terminal signal. After `terminate` or `complete`, no further calls are made.

- **`StreamSink<T, E>` interface.** Producer-side API provided to stream factory functions. Same four methods as `StreamObserver` plus a readonly `signal: AbortSignal` that is aborted when all subscribers unsubscribe or the stream is explicitly disposed. The sink enforces "after-terminal silence": calls after `terminate`/`complete` are no-ops.

- **`Subscription` interface.** Returned by `subscribe()`. Has `unsubscribe(): void` and `readonly closed: boolean`. Calling `unsubscribe()` removes the subscriber and, for cold streams, aborts the producer's `AbortSignal` if no other subscribers remain.

- **`createStream<T, E>(producer)` factory.** Creates a cold `Stream<T, E>` from a producer function `(sink: StreamSink<T, E>) => void | (() => void)`. The optional return value is a teardown function called when the last subscriber unsubscribes. The producer receives the `StreamSink` and pushes values into it. Each `subscribe()` call invokes the producer anew.

- **`fromAsyncIterable<T>(iterable)` factory.** Converts an `AsyncIterable<T>` into a cold `Stream<T, never>`. Each subscription iterates the iterable independently. Respects `AbortSignal` cancellation via the sink.

- **`fromPromise<T>(promise)` factory.** Converts a `Promise<T>` into a cold `Stream<T, never>` that emits one value and completes (or terminates on rejection).

- **`fromEvent<T>(target, eventName)` factory.** Creates a hot `Stream<T, never>` from a DOM-like event target (`addEventListener`/`removeEventListener` protocol). The stream never completes on its own; disposal removes the listener.

- **`of<T>(...values)` factory.** Creates a cold stream that synchronously emits each value and completes.

- **`empty()` factory.** Creates a stream that immediately completes with no values.

- **`never()` factory.** Creates a stream that never emits and never completes (useful for testing timeouts).

- **`throwError<E>(error)` factory.** Creates a stream that immediately terminates with the given error.

- **Dual-channel error model.** Recoverable errors flow through `observer.error(e)` as typed `E` values -- the stream remains active and may emit further values. Terminal errors flow through `observer.terminate(err)` and end the stream permanently. When consumed as `AsyncIterable`, recoverable errors appear as `Err<T, E>` Result items; terminal errors cause the iterator to throw.

### Subjects (`subject/`)

- **`Subject<T, E>` -- basic multicast.** A hot stream that is also a `StreamSink`. Calling `subject.next(value)` pushes to all current subscribers. Calling `subject.complete()` or `subject.terminate(err)` ends all subscriptions. Late subscribers receive only future values. Provides both the `Stream<T, E>` interface for consumers and the `StreamSink<T, E>` interface for producers.

- **`BehaviorSubject<T, E>` -- current value multicast.** Like `Subject` but requires an initial value at construction. New subscribers immediately receive the current value synchronously before any future values. Exposes `readonly value: T` for synchronous current-value access.

- **`ReplaySubject<T, E>` -- buffered multicast.** Like `Subject` but buffers the last `N` values (configurable `bufferSize`, default 1). New subscribers receive the buffered values synchronously before any future values. Buffer uses a ring buffer internally for O(1) push/evict.

- **`createSubject<T, E>()`**, **`createBehaviorSubject<T, E>(initialValue)`**, **`createReplaySubject<T, E>(bufferSize)`** factory functions. All return frozen, immutable subject instances.

### Operators (`operators/`)

- **Operator protocol.** An operator is a function `(source: Stream<TIn, EIn>) => Stream<TOut, EOut>`. Operators compose via `stream.pipe(op1, op2, op3)` which is equivalent to `op3(op2(op1(stream)))`. The `pipe` method supports up to 9 operators with full type inference through overloads (matching the curried generics pattern used throughout hex-di).

- **Built-in operators (20 total).** Transformation: `map`, `scan`. Filtering: `filter`, `take`, `skip`, `distinctUntilChanged`. Flattening: `switchMap`. Timing: `debounce`, `throttle`. Combination: `merge`, `concat`, `combineLatest`. Error handling: `catchError`, `retry`. Multicasting: `share`, `shareReplay`. Side effects: `tap`, `finalize`. Buffering: `buffer`. Each operator is a standalone function exported from `operators/index.ts`.

- **`map<TIn, TOut>(project: (value: TIn) => TOut)`.** Transforms each emitted value. Recoverable errors pass through unchanged.

- **`filter<T>(predicate: (value: T) => boolean)`.** Emits only values passing the predicate. Supports type guard narrowing: `filter((x): x is Foo => ...)` narrows the stream type.

- **`take<T>(count: number)`.** Emits the first `count` values then completes. Unsubscribes from source after completing.

- **`skip<T>(count: number)`.** Ignores the first `count` values, then passes all subsequent values through.

- **`scan<T, A>(accumulator: (acc: A, value: T) => A, seed: A)`.** Applies an accumulator function and emits each intermediate result. Similar to `Array.prototype.reduce` but emits every step.

- **`switchMap<TIn, TOut, EOut>(project: (value: TIn) => Stream<TOut, EOut>)`.** For each source value, subscribes to the projected inner stream, unsubscribing from the previous inner stream. Only the latest inner stream's values are forwarded.

- **`distinctUntilChanged<T>(comparator?)`.** Suppresses consecutive duplicate values. Uses `Object.is` by default; accepts a custom `(prev: T, curr: T) => boolean` comparator.

- **`debounce<T>(durationMs: number)`.** Emits a value only after `durationMs` of silence from the source. Uses the configurable scheduler for testability.

- **`throttle<T>(durationMs: number)`.** Emits the first value, then ignores further values for `durationMs`. Uses the configurable scheduler.

- **`merge<T, E>(...sources: Stream<T, E>[])`.** Merges multiple streams into one, forwarding values from all sources concurrently. Completes only when all sources complete.

- **`concat<T, E>(...sources: Stream<T, E>[])`.** Subscribes to each source sequentially. Subscribes to the next source only after the previous one completes.

- **`combineLatest<Streams>(...sources)`.** Emits a tuple of the latest value from each source whenever any source emits. Does not emit until every source has emitted at least once. Full tuple type inference via mapped types.

- **`catchError<T, E, F>(handler: (error: E) => Stream<T, F>)`.** Intercepts recoverable errors on the `error` channel and replaces them with emissions from the handler stream. Terminal errors are not caught by this operator.

- **`retry<T, E>(config: { count: number; delay?: number })`.** On terminal error, re-subscribes to the source up to `count` times with optional delay between attempts.

- **`share<T, E>()`.** Converts a cold stream to hot by multicasting via an internal `Subject`. The source is subscribed when the first subscriber arrives and unsubscribed when the last subscriber leaves (refcounted).

- **`shareReplay<T, E>(bufferSize: number)`.** Like `share` but uses an internal `ReplaySubject` so late subscribers receive buffered values.

- **`tap<T>(observer: Partial<StreamObserver<T, never>>)`.** Performs side effects for each emission without altering the stream. Useful for logging/debugging.

- **`finalize<T, E>(callback: () => void)`.** Calls the callback when the stream completes, terminates, or all subscribers unsubscribe. Guaranteed to run exactly once.

- **`buffer<T>(notifier: Stream<unknown, unknown>)`.** Collects source values into an array, emitting the array each time the notifier stream emits.

- **Custom operator protocol.** Any function matching `(source: Stream<TIn, EIn>) => Stream<TOut, EOut>` is a valid operator. No base class or registration required. Document the protocol so third-party packages can create operators that compose naturally with `.pipe()`.

### Backpressure (`stream/` -- part of core)

- **Hybrid backpressure model.** Push-based subscribers (`subscribe()`) use a configurable buffer. Pull-based consumers (`AsyncIterable`) apply natural backpressure: the producer awaits consumer readiness before emitting the next value.

- **Buffer configuration.** `createStream` and subject factories accept an optional `buffer` config: `{ capacity: number; strategy: BufferOverflowStrategy }`. `BufferOverflowStrategy` is a discriminated union: `"drop-oldest"` (ring buffer, default), `"drop-newest"` (discard incoming when full), `"error"` (terminate stream when full), `"unbounded"` (no limit -- use with caution).

- **Default buffer.** Capacity 256, strategy `"drop-oldest"`. These defaults apply when no explicit buffer config is provided.

- **AsyncIterable backpressure.** When a stream is consumed as `AsyncIterable`, the producer pauses after each value until the consumer calls `next()` on the iterator. Implemented via an internal `Promise`-based handshake between the sink and the iterator.

### Ports (`ports/`)

- **`StreamPort<T, E, TName>` branded port type.** Extends `DirectedPort<StreamProducer<T, E>, TName, "inbound">` with phantom properties `__streamData: T` and `__streamError: E`. Uses `STREAM_PORT_SYMBOL = Symbol.for("@hex-di/stream/StreamPort")` for cross-module brand identity. Port instances are frozen and immutable.

- **`createStreamPort<T, E>()({ name })` curried factory.** First call specifies explicit type parameters `T` (data) and `E` (error, defaults to `never`). Second call receives the config object with `name` (inferred as literal type), optional `description`, `category`, `tags`. Returns a frozen `StreamPort<T, E, TName>`.

- **`SubjectPort<T, E, TName>` branded port type.** Extends `DirectedPort<Subject<T, E>, TName, "inbound">` with phantom properties `__subjectData: T` and `__subjectError: E`. Uses `SUBJECT_PORT_SYMBOL = Symbol.for("@hex-di/stream/SubjectPort")`. Resolves to the `Subject` itself (not a producer function), so consumers can both subscribe and push.

- **`createSubjectPort<T, E>()({ name })` curried factory.** Same curried pattern. Returns a frozen `SubjectPort<T, E, TName>`.

- **`OperatorPort<TIn, EIn, TOut, EOut, TName>` branded port type.** Extends `DirectedPort<Operator<TIn, EIn, TOut, EOut>, TName, "inbound">`. Uses `OPERATOR_PORT_SYMBOL = Symbol.for("@hex-di/stream/OperatorPort")`. Enables stream operators to be resolved from DI, making processing pipelines swappable.

- **`createOperatorPort<TIn, EIn, TOut, EOut>()({ name })` curried factory.** Same curried pattern. Returns a frozen `OperatorPort`.

- **Type guards.** `isStreamPort(value)`, `isSubjectPort(value)`, `isOperatorPort(value)` -- runtime type guards checking the respective brand symbols.

- **Type inference utilities.** `InferStreamData<P>`, `InferStreamError<P>`, `InferStreamName<P>` conditional types extracting phantom type parameters from port types.

- **`StreamProducer<T, E>` type.** The service type resolved by `StreamPort`. Defined as `() => Stream<T, E>` -- a thunk that creates a new stream on each call (cold semantics). For hot streams, the adapter returns the same shared stream instance.

### Adapters (`adapters/`)

- **`createStreamAdapter<TProvides, TRequires>(config)` factory.** Config includes `provides: StreamPort<T, E, TName>`, optional `requires: readonly Port[]`, `lifetime: Lifetime` (default `"scoped"`), and `factory: (deps) => StreamProducer<T, E>`. Two overloads: no-deps (omit `requires`) and with-deps. Bridges to `@hex-di/core`'s `createAdapter` internally. Returns `Result<Adapter, StreamAdapterError>` (frozen).

- **`createSubjectAdapter<TProvides, TRequires>(config)` factory.** Same pattern but `provides: SubjectPort<T, E, TName>` and `factory: (deps) => Subject<T, E>`. Default lifetime `"singleton"` (subjects are typically shared).

- **`createOperatorAdapter<TProvides, TRequires>(config)` factory.** Same pattern but `provides: OperatorPort<TIn, EIn, TOut, EOut, TName>` and `factory: (deps) => Operator<TIn, EIn, TOut, EOut>`.

- **Lifetime semantics.** `"scoped"` = new stream producer per scope (each component/request gets its own stream). `"singleton"` = shared stream producer (hot streams, subjects). `"transient"` = new producer on every resolve.

### Container Observation (`observation/`)

- **`observePort<P>(container, port)` function.** Returns a `Stream<InferService<P>, never>` that emits the resolved service instance whenever the container's binding for that port changes. Emits the current value immediately on subscription (BehaviorSubject semantics). Completes when the container/scope is disposed. Works by hooking into the container's resolution lifecycle and adapter replacement events.

- **`observeContainer(container)` function.** Returns a `Stream<ContainerEvent, never>` that emits all container lifecycle events: `"adapter-registered"`, `"adapter-replaced"`, `"scope-created"`, `"scope-disposed"`, `"port-resolved"`. Each event carries metadata (port name, scope ID, timestamp). Hot stream, shared across subscribers.

- **`ContainerEvent` discriminated union.** On `type` field: `AdapterRegistered`, `AdapterReplaced`, `ScopeCreated`, `ScopeDisposed`, `PortResolved`. Each variant has relevant metadata fields.

### Integration (`integration/`)

- **DI ports.** `StreamInspectorPort: Port<StreamInspector, "StreamInspector">`, `StreamRegistryPort: Port<StreamRegistry, "StreamRegistry">`, `StreamLibraryInspectorPort` (via `createLibraryInspectorPort`). Follow the exact same pattern as `FlowInspectorPort`, `FlowRegistryPort`, `FlowLibraryInspectorPort`.

- **`StreamRegistry` interface.** Tracks live stream instances. `register(entry)`, `unregister(portName, instanceId)`, `getAllStreams()`, `getStream(portName, instanceId)`, `subscribe(listener)`, `dispose()`. `StreamRegistryEntry` includes `portName`, `instanceId`, `kind` (`"cold" | "hot" | "subject"`), `subscriberCount: () => number`, `isCompleted: () => boolean`, `createdAt: number`, `scopeId?: string`.

- **`StreamInspector` interface.** Read-only query API. `getSnapshot(): StreamSnapshot`, `getStreamState(portName): StreamPortSnapshot | undefined`, `listStreams(): readonly StreamInfo[]`, `getSubscriberGraph(): StreamSubscriberGraph`, `subscribe(listener): Unsubscribe`. `StreamSnapshot` includes timestamp, list of port snapshots, total subscribers, total active streams.

- **Library inspector bridge.** Adapter that implements the `LibraryInspector` protocol from `@hex-di/core`, exposing stream state through the unified container inspection system.

- **Tracing bridge.** Optional integration with `@hex-di/tracing`. Stream creation, subscription, emission, error, and disposal events produce tracing spans. `StreamTracingHook` interface with `onStreamCreated`, `onSubscription`, `onEmission`, `onError`, `onCompleted`, `onDisposed` hooks.

### Introspection (`introspection/`)

- **`StreamInspector` implementation.** `createStreamInspectorImpl(config?)` factory matching `createStoreInspectorImpl` pattern. Maintains internal state of registered stream ports, subscriber counts, and event history. Provides both the public read-only `StreamInspector` API and an internal `StreamInspectorInternal` with mutation methods for adapters.

- **`StreamRegistry` implementation.** `createStreamRegistryImpl()` factory. Event-based registry with `StreamRegistryEvent` discriminated union: `"stream-registered"`, `"stream-unregistered"`, `"scoped-stream-registered"`, `"scope-unregistered"`.

### Errors (`errors/`)

- **Error code range: `STRM0xx`.** `STRM001` (buffer overflow), `STRM002` (stream already completed), `STRM003` (stream terminated), `STRM004` (subscription after disposal), `STRM005` (adapter factory failed), `STRM006` (operator type mismatch), `STRM007` (backpressure timeout), `STRM008` (circular stream dependency).

- **Error types.** Discriminated union on `_tag` field: `BufferOverflowError`, `StreamCompletedError`, `StreamTerminatedError`, `StreamDisposedError`, `StreamAdapterError`, `OperatorError`, `BackpressureTimeoutError`, `CircularStreamError`. Constructor functions (not classes): `BufferOverflow(details)`, `StreamCompleted(portName)`, etc.

- **`StreamAdapterError` union.** Specific adapter creation errors following `FlowAdapterError` pattern.

### Types (`types/`)

- **`BufferOverflowStrategy` type.** `"drop-oldest" | "drop-newest" | "error" | "unbounded"`.

- **`BufferConfig` interface.** `{ readonly capacity: number; readonly strategy: BufferOverflowStrategy }`.

- **`StreamConfig<T, E>` interface.** Optional configuration for stream creation: `buffer?: BufferConfig`, `scheduler?: Scheduler`.

- **`Scheduler` interface.** Abstraction over timing for testability: `schedule(callback: () => void, delayMs: number): Disposable`. Default implementation uses `setTimeout`. Test implementation uses manual time advancement.

- **`Operator<TIn, EIn, TOut, EOut>` type alias.** `(source: Stream<TIn, EIn>) => Stream<TOut, EOut>`.

- **`Disposable` interface.** `{ dispose(): void }`. Used for scheduled timer cleanup.

---

## Key Design Decisions

| #   | Decision                                                                       | Rationale                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Library name: `@hex-di/stream`                                                 | Fits the hex-di short-noun convention (`core`, `graph`, `runtime`, `result`, `query`, `store`, `saga`, `flow`). Generic enough to cover all reactive stream use cases.                                                                                           |
| 2   | `Stream<T, E>` with dual error channels (recoverable `E` + terminal `unknown`) | Aligns with hex-di's `Result<T, E>` pattern. Recoverable errors are typed business errors; terminal errors are infrastructure failures. This avoids the RxJS problem where any error kills the stream.                                                           |
| 3   | Cold by default, hot via subjects and `share()`/`shareReplay()`                | Cold streams are safer (no leaked subscriptions, predictable execution). Hot streams are explicitly opted into via subjects or multicasting operators. Matches standard reactive library conventions.                                                            |
| 4   | `StreamProducer<T, E> = () => Stream<T, E>` as port service type               | A thunk preserves cold semantics: each `resolve()` returns the same producer, but each call to the producer creates a fresh stream. For hot streams, the adapter can close over a shared subject.                                                                |
| 5   | Operator protocol: plain functions, no classes or registration                 | Any `(source: Stream<A, B>) => Stream<C, D>` is an operator. Zero framework lock-in. Third-party operators compose identically to built-in ones.                                                                                                                 |
| 6   | `OperatorPort` for DI-resolved operators                                       | Enables swappable stream processing pipelines. A "data enrichment" operator can be a port with different adapters for dev/prod/test. Unique to this library vs. RxJS.                                                                                            |
| 7   | Hybrid backpressure: buffered push + natural pull                              | Push subscribers need protection from fast producers (buffer). Pull consumers (`AsyncIterable`) get natural backpressure for free. The buffer config with overflow strategies gives developers explicit control.                                                 |
| 8   | Default buffer: capacity 256, `"drop-oldest"`                                  | Large enough for typical UI event rates, small enough to bound memory. Drop-oldest is the safest default (latest data preserved). Applications can override per-stream.                                                                                          |
| 9   | `observePort(container, port)` uses BehaviorSubject semantics                  | Immediate emission of current value prevents "flash of empty state." Subscribers always receive the latest resolved service, then updates.                                                                                                                       |
| 10  | Scheduler abstraction for time-dependent operators                             | `debounce`, `throttle`, `retry` with delay all accept an optional scheduler. Default is real timers; tests inject a virtual scheduler for deterministic testing.                                                                                                 |
| 11  | Subjects are frozen/immutable after creation                                   | Follows the hex-di immutability-first pattern. The subject's methods are bound closures on a frozen object; internal state is encapsulated.                                                                                                                      |
| 12  | `AsyncIterable` yields `Result<T, E>` items                                    | Recoverable errors are data, not exceptions. When iterating with `for await...of`, the consumer receives `Result` objects and can pattern-match on `_tag`. Terminal errors propagate as thrown exceptions, which is the standard `AsyncIterable` error contract. |
| 13  | React hooks in separate `@hex-di/stream-react` package                         | Follows the existing pattern (`@hex-di/react` is separate from `@hex-di/core`). Keeps the core library framework-agnostic. React-specific tree-shaking is isolated.                                                                                              |
| 14  | 20 built-in operators, extensible via protocol                                 | Covers 90%+ of real-world stream processing needs. The open operator protocol means no "blessed" operator set -- community operators are first-class.                                                                                                            |

---

## Existing Code References

The following codebase patterns serve as direct precedents for `@hex-di/stream` implementation.

| Pattern                                                                                  | Location                                                                                         | Relevance                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Port branding (`Symbol.for()`, phantom brands, `Object.freeze()`, curried factory)       | `packages/core/src/ports/directed.ts`, `libs/query/core/src/ports/mutation-port.ts`              | `StreamPort`, `SubjectPort`, `OperatorPort` follow the identical branded nominal token pattern with curried `createXxxPort<T, E>()({ name })` factory. |
| Adapter creation (`createAdapter`, `provides`, `requires`, `lifetime`, `factory`)        | `libs/flow/core/src/integration/adapter.ts` (createFlowAdapter)                                  | `createStreamAdapter`, `createSubjectAdapter`, `createOperatorAdapter` follow the same config shape and return `Result<Adapter, Error>`.               |
| Integration ports (`XxxInspectorPort`, `XxxRegistryPort`, `XxxLibraryInspectorPort`)     | `libs/flow/core/src/integration/types.ts`, `libs/store/core/src/types/inspection.ts`             | `StreamInspectorPort`, `StreamRegistryPort`, `StreamLibraryInspectorPort` use `port<T>()({ name })` and `createLibraryInspectorPort()` identically.    |
| Inspector implementation (`createStoreInspectorImpl`, `getSnapshot()`, `subscribe()`)    | `libs/store/core/src/inspection/store-inspector-impl.ts`                                         | `createStreamInspectorImpl` follows the same factory pattern with internal/public split, event emission, and registry auto-discovery.                  |
| Registry pattern (`StoreRegistry`, `register/unregister`, event-based, `dispose()`)      | `libs/store/core/src/types/inspection.ts`, `libs/saga/core/src/introspection/types.ts`           | `StreamRegistry` replicates the same event-driven registry with discriminated union events and `subscribe(listener)`.                                  |
| Error codes (`NumericErrorCode`, `ERROR[HEXxxx]` format, discriminated unions on `_tag`) | `packages/core/src/errors/codes.ts`                                                              | Stream error codes use `STRM0xx` prefix; error types are discriminated unions on `_tag` with constructor functions.                                    |
| Result type (`Result<T, E>`, `Ok`, `Err`, `ResultAsync`)                                 | `packages/result/src/core/types.ts`                                                              | `Stream<T, E>` error semantics align with `Result<T, E>`. `AsyncIterable` yields `Result<T, E>` items. Adapter factories return `Result`.              |
| Tracing bridge (`FlowTracingHook`, `TracerLike`, span creation)                          | `libs/flow/core/src/introspection/types.ts`, `packages/tracing/src/instrumentation/container.ts` | `StreamTracingHook` follows the same hook interface pattern for span creation on stream lifecycle events.                                              |
| React factory pattern (`createTypedHooks`, factory-generated hooks)                      | `integrations/react/`                                                                            | `createStreamHooks()` in `@hex-di/stream-react` follows this pattern for `useStream`, `useStreamValue`.                                                |

---

## Out of Scope

The following are explicitly excluded from `@hex-di/stream`:

- **WebSocket/SSE transport.** The library provides stream primitives; protocol-specific adapters (WebSocket, Server-Sent Events, gRPC streams) belong in separate integration packages.
- **Persistence.** Durable streams, event sourcing, replay from disk. Streams are in-memory reactive primitives.
- **Cross-process streams.** Streams do not span process boundaries. Distributed messaging belongs in a messaging/broker package.
- **Full RxJS compatibility.** The operator set is intentionally minimal (20 operators). No attempt to replicate the full RxJS API surface (~100+ operators).
- **Scheduler implementations beyond default and test.** Custom schedulers (e.g., `requestAnimationFrame`, `requestIdleCallback`, microtask) are user-provided; only `setTimeout`-based and virtual/test schedulers are built in.
- **Signal/effect reactivity.** `@hex-di/store` handles fine-grained state management with signals/atoms/derived state. Streams are for asynchronous event sequences, not synchronous reactive state.
- **Framework middleware.** Express/Hono/Koa middleware for stream-based request handling belongs in framework-specific packages.
- **Backpressure across async boundaries.** Backpressure applies within a single `Stream` pipeline. Cross-stream or cross-service flow control is out of scope.

---

## Packages

| Package        | npm Name                 | Location                     | Description                                                                                                                                                                                                                                                      |
| -------------- | ------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stream         | `@hex-di/stream`         | `libs/stream/core/`          | Core reactive streams library: `Stream<T, E>`, subjects, 20 operators, backpressure, port/adapter factories, container observation, inspector, registry, tracing bridge. Dependencies: `@hex-di/core`, `@hex-di/result`.                                         |
| stream-testing | `@hex-di/stream-testing` | `libs/stream/testing/`       | Test utilities: `TestStream`, `TestSubscriber`, `TestScheduler`, `setupStreamMatchers` (`toEmit`, `toComplete`, `toTerminate`, `toEmitValues`, `toEmitError`), `MemoryStreamInspector`, `createTestStreamAdapter`. Peer deps: `@hex-di/stream`, `vitest >= 3.0`. |
| stream-react   | `@hex-di/stream-react`   | `integrations/stream-react/` | React integration: `useStream()`, `useStreamValue()`, `useSubject()`, `StreamProvider`, `createStreamHooks()`. Peer deps: `@hex-di/stream`, `@hex-di/react`, `react >= 18`.                                                                                      |

---

## Formal Specification Reference

See `spec/stream/README.md` for the full multi-file specification covering type definitions, operator semantics, backpressure protocol, container observation contract, React hook lifecycle, and error catalog.
