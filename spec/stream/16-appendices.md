# 16 - Appendices

## Appendix A: Comparison with Reactive Libraries

### Feature Matrix

| Feature                           | HexDI Stream                         | RxJS v7                        | Most.js v2          | xstream             |
| --------------------------------- | ------------------------------------ | ------------------------------ | ------------------- | ------------------- |
| **Stream Identifier**             | Port (typed object)                  | Ad-hoc Observable              | Ad-hoc Stream       | Ad-hoc Stream       |
| **Producer**                      | Adapter (DI-resolved)                | Inline subscriber              | Inline source       | Inline producer     |
| **Dependency Injection**          | Native (ports/adapters)              | None                           | None                | None                |
| **Compile-Time Graph Validation** | Yes (GraphBuilder)                   | No                             | No                  | No                  |
| **Dual Error Channel**            | Recoverable `E` + terminal `unknown` | Single `error()` kills stream  | Single `error()`    | Single `error()`    |
| **Result Integration**            | `AsyncIterable<Result<T, E>>`        | No                             | No                  | No                  |
| **Type-Safe Operators**           | Full `.pipe()` inference             | Full `.pipe()` inference       | Limited             | Limited             |
| **Backpressure**                  | Hybrid (buffer + AsyncIterable)      | None (unbounded)               | Natural (scheduler) | None                |
| **Buffer Overflow Strategy**      | 4 strategies (configurable)          | Manual (`bufferCount`)         | Scheduler-based     | None                |
| **Cold by Default**               | Yes                                  | Yes                            | Yes                 | No (hot by default) |
| **Subject Types**                 | Basic, Behavior, Replay              | Basic, Behavior, Replay, Async | No subjects         | No subjects         |
| **Operator Count**                | 20 (extensible)                      | 100+ (extensible)              | ~30 (extensible)    | ~25 (extensible)    |
| **Operator Protocol**             | Plain function                       | MonoTypeOperatorFunction       | Combinator function | Plain function      |
| **Container Observation**         | `observePort`, `observeContainer`    | N/A                            | N/A                 | N/A                 |
| **Introspection**                 | `StreamInspectorPort`                | No                             | No                  | No                  |
| **Tracing**                       | `@hex-di/tracing` spans              | No                             | No                  | No                  |
| **MCP/AI Integration**            | Native (VISION.md Phase 3)           | No                             | No                  | No                  |
| **Scheduler Abstraction**         | Yes (testable time)                  | Yes (TestScheduler)            | Yes (built-in)      | No                  |
| **AsyncIterable Support**         | Native (`toAsyncIterable()`)         | `firstValueFrom` only          | No                  | No                  |
| **Framework Agnostic**            | Yes (React hooks separate)           | Yes                            | Yes                 | No (Cycle.js)       |
| **Bundle Size**                   | TBD                                  | ~42KB gzipped                  | ~5KB gzipped        | ~5KB gzipped        |
| **Type-Level Tests**              | Yes (`*.test-d.ts`)                  | No                             | No                  | No                  |

### Key Differentiators

**vs RxJS:**

- Streams are DI-resolved via ports -- not created ad-hoc in components
- Dual error channel: recoverable errors don't kill the stream
- Hybrid backpressure with configurable overflow strategies
- 20 focused operators instead of 100+ (the operator protocol is identical, so custom operators compose naturally)
- Container observation provides a reactive view of the DI graph
- Introspection API for runtime monitoring and AI consumption

**vs Most.js:**

- DI integration via ports/adapters
- Subject types for hot multicast patterns
- Configurable buffer-based backpressure (Most relies on scheduler-based scheduling)
- Typed recoverable errors alongside terminal errors
- React hooks for framework integration

**vs xstream:**

- Cold by default (safer -- no leaked subscriptions)
- DI integration and graph validation
- Full TypeScript inference through `.pipe()` overloads
- Backpressure support
- Framework-agnostic (xstream is tightly coupled to Cycle.js)

## Appendix B: Glossary

| Term                       | Definition                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **AsyncIterable**          | Pull-based consumption protocol. `for await...of` iterates values one at a time with natural backpressure.       |
| **Backpressure**           | Mechanism to handle fast producers and slow consumers. Push path uses buffering; pull path uses async iteration. |
| **BehaviorSubject**        | Hot subject with current-value semantics. New subscribers receive the latest value immediately.                  |
| **Buffer**                 | Internal queue between producer and push-based subscribers. Configurable capacity and overflow strategy.         |
| **BufferOverflowStrategy** | How to handle a full buffer: `"drop-oldest"`, `"drop-newest"`, `"error"`, or `"unbounded"`.                      |
| **Cold Stream**            | A stream where each subscription triggers a new producer execution. Subscribers get independent value sequences. |
| **Complete**               | Successful terminal signal. After `complete()`, the stream produces no more values.                              |
| **Container**              | HexDI runtime managing instance creation, scoping, disposal, and dependency resolution.                          |
| **ContainerEvent**         | Discriminated union of container lifecycle events observable via `observeContainer`.                             |
| **DirectedPort**           | A port with a direction (`"inbound"` or `"outbound"`). Stream ports are always `"inbound"`.                      |
| **Disposable**             | Object with a `dispose()` method for cleanup. Used by the scheduler.                                             |
| **Dual Error Model**       | Two error channels: typed recoverable `E` (stream continues) and untyped terminal `unknown` (stream ends).       |
| **Hot Stream**             | A stream that shares a single producer across all subscribers. Late subscribers miss past values.                |
| **Operator**               | A function `(source: Stream<A, B>) => Stream<C, D>` that transforms a stream.                                    |
| **OperatorPort**           | DI port that resolves to an operator. Enables swappable processing pipelines.                                    |
| **Pipe**                   | Method on `Stream` for composing operators: `stream.pipe(op1, op2, op3)`.                                        |
| **Port**                   | HexDI contract declaring what a service provides. Stream ports declare stream contracts.                         |
| **Producer**               | Function passed to `createStream` that pushes values via a `StreamSink`.                                         |
| **Recoverable Error**      | Typed business error on the `error` channel. The stream remains active after emitting.                           |
| **ReplaySubject**          | Hot subject that buffers the last N values and replays them to late subscribers.                                 |
| **Result**                 | Discriminated union `Ok<T, E> \| Err<T, E>` from `@hex-di/result`.                                               |
| **Scheduler**              | Abstraction over timing (`setTimeout`). Enables deterministic testing with virtual time.                         |
| **Scope**                  | A child container with isolated or overridden service instances.                                                 |
| **Stream**                 | The fundamental reactive primitive: lazy, composable, cancellable sequence of values.                            |
| **StreamInspector**        | Read-only query API for stream state at runtime.                                                                 |
| **StreamObserver**         | Push-based consumer with `next`, `error`, `complete`, `terminate` methods.                                       |
| **StreamPort**             | DI port that resolves to a `StreamProducer<T, E>`.                                                               |
| **StreamProducer**         | `() => Stream<T, E>` -- a thunk that creates a stream on each call (cold semantics).                             |
| **StreamRegistry**         | Event-driven registry tracking live stream instances.                                                            |
| **StreamSink**             | Producer-side API with `next`, `error`, `complete`, `terminate`, and `signal: AbortSignal`.                      |
| **Subject**                | Hot stream that is also a `StreamSink`. Both consumers and producers use the same instance.                      |
| **SubjectPort**            | DI port that resolves to the `Subject` itself (not a producer thunk).                                            |
| **Subscription**           | Handle returned by `subscribe()`. Has `unsubscribe()` and `closed`.                                              |
| **Terminal Error**         | Untyped (`unknown`) catastrophic failure that ends the stream via `terminate()`.                                 |
| **Terminate**              | Terminal signal for catastrophic failure. After `terminate()`, the stream is permanently ended.                  |
| **TestScheduler**          | Virtual time scheduler for deterministic testing of time-dependent operators.                                    |
| **TestSubscriber**         | Helper that records all emissions from a stream for assertion in tests.                                          |

## Appendix C: Design Decisions

### C1. Why dual error channels?

**Decision:** Streams have typed recoverable errors (`E`) and untyped terminal errors (`unknown`).

**Rationale:**

- RxJS's single `error()` kills the stream. This forces developers to use `catchError` for every recoverable situation, leading to complex error-handling chains.
- In real applications, many errors are expected and recoverable: rate limits, validation failures, partial data errors. These should not terminate the stream.
- The dual model aligns with HexDI's `Result<T, E>` pattern: `Ok` maps to `next`, `Err` maps to `error`, and infrastructure failures map to `terminate`.
- When consumed as `AsyncIterable`, recoverable errors become `Err` Results (data), and terminal errors become thrown exceptions (standard async iterator contract).

**Trade-off:** More complex observer interface (4 methods vs 3). Developers must understand the distinction between recoverable and terminal errors.

### C2. Why cold by default?

**Decision:** Streams created via `createStream` are cold. Hot streams require explicit creation via subjects or `share()`.

**Rationale:**

- Cold streams are safer: no shared state, no race conditions, no leaked subscriptions
- Each subscriber gets an independent execution -- predictable and testable
- Hot streams are always deliberate architectural choices (event buses, shared connections)
- This matches RxJS's convention and most reactive library defaults

**Trade-off:** Developers must explicitly opt into hot streams. For shared resources (WebSocket connections), a `share()` or subject is required.

### C3. Why StreamProducer is a thunk?

**Decision:** `StreamProducer<T, E> = () => Stream<T, E>` -- a thunk, not a stream directly.

**Rationale:**

- A thunk preserves cold semantics: each call creates a fresh stream
- The DI container resolves the producer once (singleton/scoped), but each invocation creates a new stream instance
- For hot streams, the adapter closes over a shared subject and returns the same stream instance
- Without the thunk, singleton lifetime would share a single cold stream across all consumers, breaking the cold contract

**Trade-off:** Extra function call indirection. Consumers call `producer()` instead of using the resolved value directly.

### C4. Why only 20 operators?

**Decision:** Ship 20 built-in operators covering ~90% of use cases. The open protocol enables unlimited extensions.

**Rationale:**

- RxJS's 100+ operators create decision paralysis and large bundles
- 20 operators cover the core categories: transform, filter, flatten, time, combine, error, multicast, utility
- The operator protocol (`(Stream<A, B>) => Stream<C, D>`) is so simple that custom operators are trivial to write
- Third-party operators compose identically to built-in ones -- no "blessed" set

**Trade-off:** Missing some niche operators (`mergeMap`, `exhaustMap`, `withLatestFrom`, `zip`, etc.). These can be added incrementally or implemented as third-party packages.

### C5. Why OperatorPort?

**Decision:** Operators can be resolved from the DI container via `OperatorPort`.

**Rationale:**

- Processing pipelines become swappable without changing consumer code
- A "data enrichment" operator can have different implementations for dev/prod/test
- Operators can depend on other services (e.g., an enrichment operator depends on a metadata service)
- Unique to this library -- RxJS/Most/xstream have no equivalent

**Trade-off:** Additional abstraction for simple use cases. Most operators should remain stateless inline functions. OperatorPort is for operators that need DI dependencies or environment-specific behavior.

### C6. Why hybrid backpressure?

**Decision:** Push subscribers use configurable buffers; pull consumers use natural async iteration backpressure.

**Rationale:**

- Push-based subscribers need protection from fast producers. Without a buffer, a fast producer would overwhelm slow observers.
- Pull-based consumption (`AsyncIterable`) has natural backpressure by design -- the producer waits for the consumer.
- The configurable overflow strategy (`drop-oldest`, `drop-newest`, `error`, `unbounded`) gives developers explicit control over the tradeoff between data freshness and data completeness.
- RxJS has no built-in backpressure. Most.js uses scheduler-based backpressure. HexDI Stream's approach is more explicit and configurable.

**Trade-off:** Buffer configuration adds complexity. The defaults (capacity 256, drop-oldest) are designed to be safe for most use cases.

### C7. Why container observation?

**Decision:** `observePort` and `observeContainer` expose the DI lifecycle as streams.

**Rationale:**

- Container events (adapter registration, scope creation, port resolution) are naturally modeled as event streams
- `observePort` with BehaviorSubject semantics prevents "flash of empty state" -- subscribers always receive the current value
- Enables reactive architectures where components respond to DI changes (config hot-reload, feature flags, service replacement)
- No other DI library provides this capability

**Trade-off:** Adds coupling between the stream library and the container's lifecycle events. The container must emit events that the stream library can observe.

### C8. Why frozen subject instances?

**Decision:** All subjects are `Object.freeze()`d after creation.

**Rationale:**

- Follows HexDI's immutability-first pattern
- Prevents accidental property mutation on the subject object
- Internal state (subscriber set, buffer, closed flag) is in closures, not on the frozen object
- Methods (`next`, `subscribe`, etc.) work via bound closures over the mutable internal state

**Trade-off:** Cannot add properties to a subject after creation. This is intentional -- subjects are complete at construction time.

### C9. Why separate @hex-di/stream-react?

**Decision:** React hooks live in `@hex-di/stream-react`, not in the core package.

**Rationale:**

- Follows the existing pattern (`@hex-di/react` is separate from `@hex-di/core`)
- Keeps the core library framework-agnostic
- React-specific tree-shaking is isolated
- Enables future framework integrations (Vue, Svelte, Solid) as separate packages

**Trade-off:** Extra package dependency for React users. Offset by cleaner separation of concerns.

### C10. Why `"inbound"` direction?

**Decision:** Stream ports use `"inbound"` direction. Store ports use `"outbound"`.

**Rationale:**

In hexagonal architecture, "inbound" means data flows from infrastructure toward the domain (driven adapters push data in). Stream producers and query fetchers are driven adapters -- they receive external data and deliver it to domain consumers. Store ports are "outbound" because the domain drives state changes outward.

The direction reflects **who initiates the data flow**, not where the data ends up:

| Library          | Direction    | Initiator                       |
| ---------------- | ------------ | ------------------------------- |
| `@hex-di/stream` | `"inbound"`  | Infrastructure pushes data in   |
| `@hex-di/query`  | `"inbound"`  | Infrastructure fetches data in  |
| `@hex-di/store`  | `"outbound"` | Domain drives state changes out |

**Trade-off:** Two different directions across libraries may confuse newcomers. The distinction is architecturally correct and consistent: query + stream = inbound (infrastructure -> domain), store = outbound (domain -> infrastructure).

---

_Previous: [15 - API Reference](./15-api-reference.md)_

_Next: [17 - Definition of Done](./17-definition-of-done.md)_
