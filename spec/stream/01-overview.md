# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/stream` extends HexDI with general-purpose reactive streams that respect hexagonal architecture. Every stream source is a real `DirectedPort`, every stream implementation is a real `Adapter`, and Container is the single runtime managing resolution, scoping, and disposal.

There is no global stream factory. There is no untyped event emitter. There is no subscription management in components. Streams are resolved from Container like any other service:

```typescript
const producer = container.resolve(PriceTickerPort);
const stream = producer();

stream.subscribe({
  next: price => console.log("Price:", price),
  error: err => console.warn("Recoverable:", err),
  complete: () => console.log("Done"),
  terminate: err => console.error("Fatal:", err),
});
```

### What this package provides

- **Stream primitives** (`Stream<T, E>`, `StreamObserver`, `StreamSink`, `Subscription`) with dual-channel errors
- **Stream ports** (`createStreamPort`, `createSubjectPort`, `createOperatorPort`) that return `DirectedPort<StreamProducer<T, E>, TName, "inbound">`
- **Stream adapters** (`createStreamAdapter`, `createSubjectAdapter`, `createOperatorAdapter`) that return `Adapter<TProvides, TRequires, TLifetime, "sync">`
- **Subject types** (`Subject`, `BehaviorSubject`, `ReplaySubject`) for hot multicast streams
- **20 built-in operators** (map, filter, switchMap, debounce, merge, combineLatest, share, retry, etc.) composing via plain-function protocol
- **Hybrid backpressure** with configurable buffer overflow strategies and AsyncIterable natural backpressure
- **Container observation** (`observePort`, `observeContainer`) for reactive DI integration
- **Stream introspection** (`StreamInspectorPort`, `StreamRegistryPort`) for runtime visibility
- **React hooks** (`useStream`, `useStreamValue`, `useSubject`) in `@hex-di/stream-react`
- **Test utilities** (`TestStream`, `TestSubscriber`, `TestScheduler`, stream assertions) in `@hex-di/stream-testing`

### What this package does NOT provide

- No WebSocket/SSE transport (protocol-specific adapters belong in separate packages)
- No persistence or event sourcing (streams are in-memory reactive primitives)
- No cross-process streams (distributed messaging belongs in a broker package)
- No full RxJS compatibility (intentionally minimal -- 20 operators, not 100+)
- No signal/effect reactivity (`@hex-di/store` handles fine-grained state management)
- No framework middleware (Express/Hono/Koa stream handling belongs in framework packages)

### 0.1.0 Scope

- `createStream`, `of`, `fromIterable`, `fromAsyncIterable`, `fromPromise`, `fromResultAsync`, `fromEvent`, `interval`, `timer`, `EMPTY`, `NEVER` -- stream creation factories
- `Subject`, `BehaviorSubject`, `ReplaySubject` -- hot multicast primitives
- 20 built-in operators with full type inference through `.pipe()` overloads
- Hybrid backpressure with 4 overflow strategies
- `createStreamPort` / `createSubjectPort` / `createOperatorPort` -- DI integration
- `createStreamAdapter` / `createSubjectAdapter` / `createOperatorAdapter` -- adapter factories
- `observePort` / `observeContainer` -- container observation streams
- `StreamInspectorPort` / `StreamRegistryPort` -- introspection
- React hooks (`useStream`, `useStreamValue`, `useSubject`, `StreamProvider`)
- Testing utilities (mock adapters, test scheduler, stream assertions)

## 2. Philosophy

### Streams are services

In HexDI, services are provided through ports and implemented by adapters. A reactive event source is no different. A price ticker is a service that produces values over time. The port defines the contract (data type, error type). The adapter provides the implementation (WebSocket connection, polling API, simulated data for tests).

### Ports are stream identifiers

Traditional reactive libraries create streams ad-hoc in components or services. Stream identifiers are implicit in closures and variable references -- no compile-time validation that a stream's producer is available.

In HexDI Stream, the **port IS the identifier**. `PriceTickerPort` is a unique, type-safe token. It participates in the dependency graph. If no adapter provides it, `GraphBuilder` reports a compile-time error.

```typescript
// Traditional: ad-hoc, no DI, no graph validation
const prices$ = new Subject<number>();

// HexDI: port-based, fully typed, graph-validated
const PriceTickerPort = createStreamPort<number>()({ name: "PriceTicker" });
```

### Adapters replace inline producers

Traditional reactive libraries embed stream creation logic wherever it's consumed:

```typescript
// Component knows WebSocket URLs, reconnection logic, message parsing
const ws = new WebSocket("wss://api.example.com/prices");
const prices$ = new Observable(subscriber => {
  ws.onmessage = e => subscriber.next(JSON.parse(e.data));
});
```

HexDI Stream separates the contract from the implementation:

```typescript
// Port: declares WHAT stream is needed
const PriceTickerPort = createStreamPort<PriceTick>()({
  name: "PriceTicker",
});

// Adapter: declares HOW to produce it, with DI dependencies
const WsPriceAdapter = createStreamAdapter({
  provides: PriceTickerPort,
  requires: [WebSocketClientPort, AuthPort],
  factory:
    ({ wsClient, auth }) =>
    () =>
      createStream<PriceTick>(sink => {
        const conn = wsClient.connect("wss://api.example.com/prices", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        conn.onMessage(msg => sink.next(JSON.parse(msg)));
        conn.onError(err => sink.terminate(err));
        return () => conn.close();
      }),
});

// Component: declares WHAT it needs, nothing about HOW
const { value } = useStreamValue(PriceTickerPort);
```

Benefits:

1. **Testability** -- swap `WsPriceAdapter` for `MockPriceAdapter` without touching components
2. **Flexibility** -- change WebSocket to SSE by swapping one adapter
3. **DI integration** -- adapters declare dependencies on `WebSocketClientPort`, `AuthPort`, `LoggerPort`
4. **Multi-tenancy** -- different graphs per tenant with different stream sources
5. **Type safety** -- ports enforce data contracts at compile time

### Dual-channel errors are values

Streams have two error channels, aligning with HexDI's `Result<T, E>` pattern:

1. **Recoverable errors** (`E`) -- typed business errors that flow through `observer.error(e)`. The stream remains active and may emit further values. When consumed as `AsyncIterable`, these appear as `Err<T, E>` Result items.

2. **Terminal errors** (`unknown`) -- infrastructure failures that flow through `observer.terminate(err)`. The stream ends permanently. When consumed as `AsyncIterable`, these cause the iterator to throw.

This avoids the RxJS problem where any `error()` kills the observable.

### Operators are plain functions

Any function `(source: Stream<A, B>) => Stream<C, D>` is an operator. No base class. No registration. No framework lock-in. Third-party operators compose identically to built-in ones via `.pipe()`.

## 3. Package Structure

```
stream/
├── core/                           # @hex-di/stream
│   ├── src/
│   │   ├── stream/
│   │   │   ├── stream.ts           # Stream<T, E> implementation
│   │   │   ├── sink.ts             # StreamSink<T, E> implementation
│   │   │   ├── subscription.ts     # Subscription implementation
│   │   │   └── types.ts            # Core type definitions
│   │   ├── creation/
│   │   │   ├── create-stream.ts    # createStream factory
│   │   │   ├── of.ts               # of, fromIterable
│   │   │   ├── async.ts            # fromAsyncIterable, fromPromise, fromResultAsync
│   │   │   ├── event.ts            # fromEvent
│   │   │   ├── time.ts             # interval, timer
│   │   │   └── constants.ts        # EMPTY, NEVER
│   │   ├── subjects/
│   │   │   ├── subject.ts          # Subject<T, E>
│   │   │   ├── behavior-subject.ts # BehaviorSubject<T, E>
│   │   │   ├── replay-subject.ts   # ReplaySubject<T, E>
│   │   │   └── types.ts            # Subject type definitions
│   │   ├── operators/
│   │   │   ├── transform.ts        # map, scan
│   │   │   ├── filter.ts           # filter, take, skip, distinctUntilChanged
│   │   │   ├── flatten.ts          # switchMap
│   │   │   ├── timing.ts           # debounce, throttle
│   │   │   ├── combination.ts      # merge, concat, combineLatest
│   │   │   ├── error.ts            # catchError, retry
│   │   │   ├── multicast.ts        # share, shareReplay
│   │   │   ├── utility.ts          # tap, finalize, buffer
│   │   │   └── index.ts            # Re-exports all operators
│   │   ├── backpressure/
│   │   │   ├── buffer-config.ts    # BufferConfig, OverflowStrategy
│   │   │   └── async-iterator.ts   # AsyncIterable backpressure adapter
│   │   ├── ports/
│   │   │   ├── stream-port.ts      # createStreamPort factory
│   │   │   ├── subject-port.ts     # createSubjectPort factory
│   │   │   ├── operator-port.ts    # createOperatorPort factory
│   │   │   ├── guards.ts           # Type guards
│   │   │   └── types.ts            # Port type definitions
│   │   ├── adapters/
│   │   │   ├── stream-adapter.ts   # createStreamAdapter factory
│   │   │   ├── subject-adapter.ts  # createSubjectAdapter factory
│   │   │   ├── operator-adapter.ts # createOperatorAdapter factory
│   │   │   └── types.ts            # Adapter type definitions
│   │   ├── observation/
│   │   │   ├── observe-port.ts     # observePort function
│   │   │   ├── observe-container.ts # observeContainer function
│   │   │   └── types.ts            # ContainerEvent types
│   │   ├── integration/
│   │   │   ├── ports.ts            # StreamInspectorPort, StreamRegistryPort
│   │   │   ├── inspector-adapter.ts # createStreamInspectorAdapter
│   │   │   ├── registry-adapter.ts # createStreamRegistryAdapter
│   │   │   └── tracing-bridge.ts   # StreamTracingHook
│   │   ├── introspection/
│   │   │   ├── inspector.ts        # StreamInspector implementation
│   │   │   ├── registry.ts         # StreamRegistry implementation
│   │   │   ├── snapshot.ts         # StreamSnapshot types
│   │   │   └── events.ts           # StreamInspectorEvent types
│   │   ├── errors/
│   │   │   ├── codes.ts            # STRM0xx error codes
│   │   │   └── types.ts            # Error discriminated unions
│   │   ├── types/
│   │   │   ├── buffer.ts           # BufferOverflowStrategy, BufferConfig
│   │   │   ├── scheduler.ts        # Scheduler interface
│   │   │   ├── operator.ts         # Operator type alias
│   │   │   └── disposable.ts       # Disposable interface
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── react/                          # @hex-di/stream-react
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-stream.ts
│   │   │   ├── use-stream-value.ts
│   │   │   ├── use-subject.ts
│   │   │   └── factory.ts          # createStreamHooks
│   │   ├── provider/
│   │   │   └── stream-provider.tsx
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── testing/                        # @hex-di/stream-testing
    ├── src/
    │   ├── test-stream.ts          # TestStream helper
    │   ├── test-subscriber.ts      # TestSubscriber helper
    │   ├── test-scheduler.ts       # TestScheduler (virtual time)
    │   ├── mock-stream-adapter.ts  # createMockStreamAdapter
    │   ├── mock-subject-adapter.ts # createMockSubjectAdapter
    │   ├── stream-assertions.ts    # toEmit, toComplete, toTerminate, etc.
    │   ├── matchers.ts             # setupStreamMatchers for vitest
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

### Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/react
          │              │              │
          └──────────────┼──────────────┘
                         │
                    @hex-di/result
                         │
                         ▼
                  @hex-di/stream
                    │         │
                    │    (optional)
                    │         ▼
                    │   @hex-di/tracing
                    │
              ┌─────┼──────────────┐
              ▼     ▼              ▼
    @hex-di/      @hex-di/       @hex-di/
    stream-react  stream-testing stream-devtools
```

**Optional integration:** When `@hex-di/tracing` is in the graph, stream lifecycle events
automatically produce tracing spans via the resolution hooks system. No explicit
dependency is required -- the integration is hook-based.

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              React Components                               │
│          useStream  useStreamValue  useSubject  StreamProvider              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         @hex-di/stream-react                                │
│           (hooks resolve StreamProducer/Subject from Container)             │
├─────────────────────────────────────────────────────────────────────────────┤
│                       Container (single runtime)                            │
│                                                                             │
│  ┌───────────────────┐  ┌────────────────────────────┐                     │
│  │ StreamInspectorPort│  │ Infrastructure Ports       │                     │
│  │ (singleton)        │  │ WsClient, Auth, Logger    │                     │
│  └───────────────────┘  └────────────────────────────┘                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Stream Resolution                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    Stream Adapters                             │          │
│  │                                                               │          │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │          │
│  │  │ PriceTicker  │  │ EventBus      │  │ TransformOp      │  │          │
│  │  │ Adapter      │  │ Adapter       │  │ Adapter          │  │          │
│  │  │ (WebSocket)  │  │ (Subject)     │  │ (Operator)       │  │          │
│  │  └──────────────┘  └───────────────┘  └──────────────────┘  │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              PORTS (Contracts)                              │
│                                                                             │
│  StreamPort<T, E, Name>      SubjectPort<T, E, Name>                       │
│  Define WHAT stream is needed Define WHAT multicast channel exists          │
│                                                                             │
│  OperatorPort<In, EIn, Out, EOut, Name>                                    │
│  Define WHAT transform to apply (swappable via DI)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                          STREAM PRIMITIVES                                  │
│                                                                             │
│  Stream<T, E>  ──pipe()──> Operators  ──subscribe()──> Observer            │
│  Subject<T, E>  BehaviorSubject<T, E>  ReplaySubject<T, E>                │
│  Backpressure: Buffer(drop-oldest|drop-newest|error|unbounded)             │
│  AsyncIterable: Natural backpressure via promise handshake                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
